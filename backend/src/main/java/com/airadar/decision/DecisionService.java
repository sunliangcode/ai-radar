package com.airadar.decision;

import com.airadar.api.ApiTimes;
import com.airadar.change.EventSourceLookup;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.memory.MemoryService;
import com.airadar.watch.WatchSubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

@Service
public class DecisionService {

    private static final Set<String> KINDS = Set.of("ignore", "investigate", "adopt", "watch");

    private final DecisionRepository decisionRepository;
    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final MemoryService memoryService;
    private final EventSourceLookup eventSourceLookup;
    private final WatchSubscriptionService watchSubscriptionService;

    public DecisionService(
            DecisionRepository decisionRepository,
            EventRepository eventRepository,
            TimelineEntryRepository timelineEntryRepository,
            MemoryService memoryService,
            EventSourceLookup eventSourceLookup,
            WatchSubscriptionService watchSubscriptionService
    ) {
        this.decisionRepository = decisionRepository;
        this.eventRepository = eventRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.memoryService = memoryService;
        this.eventSourceLookup = eventSourceLookup;
        this.watchSubscriptionService = watchSubscriptionService;
    }

    @Transactional
    public Map<String, Object> record(Long changeId, String kind, String reason, String revisitAtIso) {
        if (!eventRepository.existsById(changeId)) {
            throw new NoSuchElementException("change not found: " + changeId);
        }
        String normalized = kind == null ? "" : kind.trim().toLowerCase();
        if (!KINDS.contains(normalized)) {
            throw new IllegalArgumentException("invalid decision kind: " + kind);
        }
        Instant now = Instant.now();
        Instant revisit = parseRevisit(revisitAtIso);

        for (DecisionEntity open : decisionRepository.findByChangeIdOrderByCreatedAtDesc(changeId)) {
            if ("open".equalsIgnoreCase(open.getStatus())) {
                open.setStatus("superseded");
                open.setUpdatedAt(now);
                decisionRepository.save(open);
            }
        }

        DecisionEntity row = new DecisionEntity();
        row.setChangeId(changeId);
        row.setKind(normalized);
        row.setReason(reason);
        row.setRevisitAt(revisit);
        row.setStatus("open");
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        decisionRepository.save(row);

        eventRepository.findById(changeId).ifPresent(e ->
                memoryService.remember("decision", "change", changeId, e.getTitle(),
                        "{\"kind\":\"" + normalized + "\"}"));

        if ("watch".equals(normalized)) {
            // Same product surface as Follow: decision "watch" must appear under Following.
            watchSubscriptionService.upsertForChange(changeId, Map.of());
        } else if ("ignore".equals(normalized)) {
            // Ignore means stop tracking — drop Follow so Following stays truthful.
            watchSubscriptionService.removeIfPresent(changeId);
        }

        return toDto(row, null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return decisionRepository.findByStatusOrderByUpdatedAtDesc("open").stream()
                .map(d -> toDto(d, null))
                .toList();
    }

    /** Change IDs with an open decision — excluded from Today major triage. */
    @Transactional(readOnly = true)
    public Set<Long> openChangeIds() {
        Set<Long> ids = new LinkedHashSet<>();
        for (DecisionEntity d : decisionRepository.findByStatusOrderByUpdatedAtDesc("open")) {
            if (d.getChangeId() != null) {
                ids.add(d.getChangeId());
            }
        }
        return ids;
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> latestOpen(Long changeId) {
        return decisionRepository.findByChangeIdOrderByCreatedAtDesc(changeId).stream()
                .filter(d -> "open".equalsIgnoreCase(d.getStatus()))
                .findFirst()
                .map(d -> toDto(d, null));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDueRevisit() {
        Instant endOfToday = LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return decisionRepository.findByStatusAndRevisitAtLessThanEqualOrderByRevisitAtAsc("open", endOfToday)
                .stream()
                .filter(d -> d.getRevisitAt() != null)
                .map(d -> {
                    long updates = timelineEntryRepository.countByEventIdAndAtAfter(
                            d.getChangeId(),
                            d.getCreatedAt()
                    );
                    return toDto(d, updates);
                })
                .toList();
    }

    /**
     * Push revisit out by {@code days}, or restore an absolute {@code revisitAtIso}
     * (Undo after snooze) without rewriting the decision.
     */
    @Transactional
    public Map<String, Object> snooze(Long decisionId, int days, String revisitAtIso) {
        DecisionEntity row = decisionRepository.findById(decisionId)
                .orElseThrow(() -> new NoSuchElementException("decision not found: " + decisionId));
        if (!"open".equalsIgnoreCase(row.getStatus())) {
            throw new IllegalArgumentException("decision is not open: " + decisionId);
        }
        Instant now = Instant.now();
        Instant next = parseRevisit(revisitAtIso);
        if (next == null) {
            int clamped = Math.max(1, Math.min(days, 90));
            next = LocalDate.now(ZoneOffset.UTC).plusDays(clamped).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        row.setRevisitAt(next);
        row.setUpdatedAt(now);
        decisionRepository.save(row);
        return toDto(row, null);
    }

    @Transactional
    public Map<String, Object> snooze(Long decisionId, int days) {
        return snooze(decisionId, days, null);
    }

    private Map<String, Object> toDto(DecisionEntity d, Long updatesSince) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("changeId", d.getChangeId());
        m.put("kind", d.getKind());
        m.put("reason", d.getReason());
        m.put("revisitAt", ApiTimes.iso(d.getRevisitAt()));
        m.put("status", d.getStatus());
        m.put("createdAt", ApiTimes.iso(d.getCreatedAt()));
        m.put("updatedAt", ApiTimes.iso(d.getUpdatedAt()));
        eventRepository.findById(d.getChangeId()).ifPresent(e -> {
            m.put("changeTitle", e.getTitle());
            m.put("changeSummary", e.getSummary());
        });
        m.put("sourceIds", eventSourceLookup.sourceIdsForEvent(d.getChangeId()));
        if (updatesSince != null) {
            m.put("updatesSinceDecision", updatesSince);
        }
        return m;
    }

    private static Instant parseRevisit(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(iso.trim());
        } catch (DateTimeParseException e) {
            return LocalDate.parse(iso.trim()).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
    }
}
