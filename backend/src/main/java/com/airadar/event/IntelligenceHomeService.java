package com.airadar.event;

import com.airadar.action.ActionService;
import com.airadar.api.ApiTimes;
import com.airadar.decision.DecisionService;
import com.airadar.impact.ImpactService;
import com.airadar.memory.MemoryService;
import com.airadar.opportunity.OpportunityService;
import com.airadar.outcome.OutcomeService;
import com.airadar.settings.SettingsService;
import com.airadar.watch.WatchSubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class IntelligenceHomeService {

    private static final int MAJOR_CAP = 5;
    private static final int MINOR_CAP = 8;

    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final EventItemRepository eventItemRepository;
    private final SettingsService settingsService;
    private final ImpactService impactService;
    private final ActionService actionService;
    private final OpportunityService opportunityService;
    private final OutcomeService outcomeService;
    private final MemoryService memoryService;
    private final DecisionService decisionService;
    private final WatchSubscriptionService watchSubscriptionService;

    public IntelligenceHomeService(
            EventRepository eventRepository,
            TimelineEntryRepository timelineEntryRepository,
            EventItemRepository eventItemRepository,
            SettingsService settingsService,
            ImpactService impactService,
            ActionService actionService,
            OpportunityService opportunityService,
            OutcomeService outcomeService,
            MemoryService memoryService,
            DecisionService decisionService,
            WatchSubscriptionService watchSubscriptionService
    ) {
        this.eventRepository = eventRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.eventItemRepository = eventItemRepository;
        this.settingsService = settingsService;
        this.impactService = impactService;
        this.actionService = actionService;
        this.opportunityService = opportunityService;
        this.outcomeService = outcomeService;
        this.memoryService = memoryService;
        this.decisionService = decisionService;
        this.watchSubscriptionService = watchSubscriptionService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> home() {
        var s = settingsService.effective();
        ZoneId zone = ZoneId.of(s.timezone() != null ? s.timezone() : "Asia/Shanghai");
        Instant sinceBrief = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        int threshold = s.scoreThreshold() != null ? s.scoreThreshold() : 60;
        Instant dismissSince = Instant.now().minus(7, ChronoUnit.DAYS);
        Set<Long> dismissed = memoryService.dismissedChangeIdsSince(dismissSince);

        List<Map<String, Object>> whatChanged = timelineEntryRepository
                .findByAtGreaterThanEqualOrderByAtDesc(sinceBrief)
                .stream()
                .limit(12)
                .map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("eventId", t.getEventId());
                    m.put("at", ApiTimes.iso(t.getAt()));
                    m.put("label", t.getLabel());
                    m.put("note", t.getNote());
                    m.put("newsItemId", t.getNewsItemId());
                    eventRepository.findById(t.getEventId()).ifPresent(e -> m.put("eventTitle", e.getTitle()));
                    return m;
                })
                .toList();

        List<Map<String, Object>> whyCare = impactService.whyCare();
        List<Map<String, Object>> impacts = impactService.listByTiers(List.of("HIGH", "MEDIUM"));
        List<Map<String, Object>> actions = actionService.listOpen();
        List<Map<String, Object>> opportunities = opportunityService.listByKind("OPPORTUNITY");
        List<Map<String, Object>> risks = opportunityService.listByKind("RISK");

        List<Map<String, Object>> majorChanges = pickMajor(whyCare, impacts, dismissed);
        Set<Long> majorIds = new LinkedHashSet<>();
        for (Map<String, Object> card : majorChanges) {
            Long id = asLong(card.get("eventId"));
            if (id != null) {
                majorIds.add(id);
            }
        }
        List<Map<String, Object>> minorSignals = pickMinor(whyCare, impacts, dismissed, majorIds);

        List<Map<String, Object>> todayChanges = new ArrayList<>(majorChanges);

        List<Map<String, Object>> whatToWatch = new ArrayList<>();
        whatToWatch.addAll(impactService.listByTiers(List.of("LOW")).stream().limit(8).toList());
        eventRepository.findTop50ByOrderByScoreDesc().stream()
                .filter(e -> e.getWatchNext() != null && !e.getWatchNext().isBlank())
                .limit(10)
                .forEach(e -> {
                    Map<String, Object> m = eventSummary(e);
                    m.put("watchNext", e.getWatchNext());
                    whatToWatch.add(m);
                });

        List<Map<String, Object>> whatMatters = eventRepository
                .findByStatusOrderByScoreDesc(EventStatus.ACTIVE)
                .stream()
                .filter(e -> e.getScore() != null && e.getScore() >= threshold)
                .limit(10)
                .map(this::eventSummary)
                .toList();

        List<Map<String, Object>> whatsEmerging = eventRepository
                .findByStatusOrderByScoreDesc(EventStatus.EMERGING)
                .stream()
                .limit(8)
                .map(this::eventSummary)
                .toList();

        List<Map<String, Object>> decisionsToRevisit = decisionService.listDueRevisit().stream().limit(3).toList();
        Instant alertSince = Instant.now().minus(24, ChronoUnit.HOURS);
        List<Map<String, Object>> proactiveAlerts = watchSubscriptionService.pendingAlerts(alertSince).stream()
                .limit(5)
                .toList();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("majorCount", majorChanges.size());
        stats.put("minorCount", minorSignals.size());
        stats.put("decisionsDue", decisionsToRevisit.size());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("majorChanges", majorChanges);
        out.put("minorSignals", minorSignals);
        out.put("decisionsToRevisit", decisionsToRevisit);
        out.put("proactiveAlerts", proactiveAlerts);
        out.put("stats", stats);
        out.put("todayChanges", todayChanges);
        out.put("whatChanged", whatChanged);
        out.put("whyCare", whyCare);
        out.put("impacts", impacts);
        out.put("actions", actions);
        out.put("opportunities", opportunities);
        out.put("risks", risks);
        out.put("whatToWatch", whatToWatch);
        out.put("outcomeSummary", outcomeService.summary());
        out.put("whatMatters", whatMatters);
        out.put("whatsEmerging", whatsEmerging);
        out.put("generatedAt", ApiTimes.iso(Instant.now()));
        return out;
    }

    private List<Map<String, Object>> pickMajor(
            List<Map<String, Object>> whyCare,
            List<Map<String, Object>> impacts,
            Set<Long> dismissed
    ) {
        List<Map<String, Object>> pool = new ArrayList<>();
        LinkedHashSet<Long> seen = new LinkedHashSet<>();
        for (Map<String, Object> card : whyCare) {
            addIfMajor(pool, seen, card, dismissed);
            if (pool.size() >= MAJOR_CAP) {
                return enrich(pool);
            }
        }
        for (Map<String, Object> card : impacts) {
            addIfMajor(pool, seen, card, dismissed);
            if (pool.size() >= MAJOR_CAP) {
                break;
            }
        }
        return enrich(pool);
    }

    private void addIfMajor(
            List<Map<String, Object>> pool,
            LinkedHashSet<Long> seen,
            Map<String, Object> card,
            Set<Long> dismissed
    ) {
        Long eventId = asLong(card.get("eventId"));
        if (eventId == null || !seen.add(eventId) || dismissed.contains(eventId)) {
            return;
        }
        String tier = card.get("tier") == null ? "" : card.get("tier").toString().toUpperCase();
        if (!"HIGH".equals(tier) && !"MEDIUM".equals(tier) && !"MED".equals(tier)) {
            return;
        }
        pool.add(new LinkedHashMap<>(card));
    }

    private List<Map<String, Object>> pickMinor(
            List<Map<String, Object>> whyCare,
            List<Map<String, Object>> impacts,
            Set<Long> dismissed,
            Set<Long> majorIds
    ) {
        List<Map<String, Object>> pool = new ArrayList<>();
        LinkedHashSet<Long> seen = new LinkedHashSet<>(majorIds);
        Comparator<Map<String, Object>> byPriority = Comparator.comparing(
                (Map<String, Object> m) -> m.get("priority") instanceof Number n ? n.doubleValue() : 0.0
        ).reversed();

        List<Map<String, Object>> candidates = new ArrayList<>();
        candidates.addAll(whyCare);
        candidates.addAll(impacts);
        candidates.sort(byPriority);

        for (Map<String, Object> card : candidates) {
            Long eventId = asLong(card.get("eventId"));
            if (eventId == null || !seen.add(eventId) || dismissed.contains(eventId)) {
                continue;
            }
            String tier = card.get("tier") == null ? "" : card.get("tier").toString().toUpperCase();
            if ("HIGH".equals(tier) || "MEDIUM".equals(tier) || "MED".equals(tier)) {
                continue;
            }
            pool.add(new LinkedHashMap<>(card));
            if (pool.size() >= MINOR_CAP) {
                break;
            }
        }
        return enrich(pool);
    }

    private List<Map<String, Object>> enrich(List<Map<String, Object>> cards) {
        Set<Long> watchedIds = watchedChangeIds();
        for (Map<String, Object> card : cards) {
            Long eventId = asLong(card.get("eventId"));
            if (eventId == null) {
                continue;
            }
            card.put("watched", watchedIds.contains(eventId));
            List<Map<String, Object>> timeline = timelineEntryRepository.findByEventIdOrderByAtAsc(eventId).stream()
                    .sorted(Comparator.comparing(TimelineEntryEntity::getAt).reversed())
                    .limit(3)
                    .map(t -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("at", ApiTimes.iso(t.getAt()));
                        row.put("label", t.getLabel());
                        row.put("note", t.getNote());
                        row.put("newsItemId", t.getNewsItemId());
                        return row;
                    })
                    .toList();
            card.put("recentTimeline", timeline);
            eventRepository.findById(eventId).ifPresent(e -> {
                card.put("changeId", e.getId());
                card.put("firstDetectedAt", ApiTimes.iso(e.getFirstSeenAt()));
                card.put("lastUpdatedAt", ApiTimes.iso(e.getLastUpdatedAt()));
                card.put("changeSummary", e.getSummary());
            });
        }
        return cards;
    }

    private Set<Long> watchedChangeIds() {
        Set<Long> ids = new LinkedHashSet<>();
        for (Map<String, Object> sub : watchSubscriptionService.listAll()) {
            Long changeId = asLong(sub.get("changeId"));
            if (changeId != null) {
                ids.add(changeId);
            }
        }
        return ids;
    }

    private static Long asLong(Object value) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Object> eventSummary(EventEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("title", e.getTitle());
        m.put("status", e.getStatus());
        m.put("score", e.getScore());
        m.put("summary", e.getSummary());
        m.put("impact", e.getImpact());
        m.put("watchNext", e.getWatchNext());
        m.put("firstSeenAt", ApiTimes.iso(e.getFirstSeenAt()));
        m.put("lastUpdatedAt", ApiTimes.iso(e.getLastUpdatedAt()));
        m.put("itemCount", eventItemRepository.countByEventId(e.getId()));
        return m;
    }
}
