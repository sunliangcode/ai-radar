package com.airadar.watch;

import com.airadar.api.ApiTimes;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryEntity;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.memory.MemoryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class WatchSubscriptionService {

    private final WatchSubscriptionRepository repository;
    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final MemoryService memoryService;
    private final ObjectMapper objectMapper;

    public WatchSubscriptionService(
            WatchSubscriptionRepository repository,
            EventRepository eventRepository,
            TimelineEntryRepository timelineEntryRepository,
            MemoryService memoryService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.memoryService = memoryService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> upsertForChange(Long changeId, Map<String, Object> rules) {
        if (!eventRepository.existsById(changeId)) {
            throw new NoSuchElementException("change not found: " + changeId);
        }
        Instant now = Instant.now();
        String rulesJson = toJson(rules);
        WatchSubscriptionEntity row = repository.findFirstByChangeId(changeId).orElseGet(WatchSubscriptionEntity::new);
        row.setChangeId(changeId);
        row.setRulesJson(rulesJson);
        if (row.getCreatedAt() == null) {
            row.setCreatedAt(now);
        }
        row.setUpdatedAt(now);
        repository.save(row);

        eventRepository.findById(changeId).ifPresent(e ->
                memoryService.remember("watch", "change", changeId, e.getTitle(), rulesJson));

        return toDto(row);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return repository.findAllByOrderByUpdatedAtDesc().stream().map(this::toDto).toList();
    }

    /** Timeline entries on watched changes since last alert check (Phase 5 digest). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingAlerts(Instant since) {
        List<Map<String, Object>> alerts = new ArrayList<>();
        for (WatchSubscriptionEntity sub : repository.findAllByOrderByUpdatedAtDesc()) {
            if (sub.getChangeId() == null) {
                continue;
            }
            List<TimelineEntryEntity> entries = timelineEntryRepository.findByEventIdOrderByAtAsc(sub.getChangeId());
            for (TimelineEntryEntity t : entries) {
                if (t.getAt() != null && !t.getAt().isBefore(since) && matchesRules(t, sub.getRulesJson())) {
                    Map<String, Object> alert = new LinkedHashMap<>();
                    alert.put("changeId", sub.getChangeId());
                    alert.put("timelineId", t.getId());
                    alert.put("at", ApiTimes.iso(t.getAt()));
                    alert.put("label", t.getLabel());
                    alert.put("note", t.getNote());
                    eventRepository.findById(sub.getChangeId()).ifPresent(e -> alert.put("title", e.getTitle()));
                    alerts.add(alert);
                }
            }
        }
        return alerts;
    }

    private boolean matchesRules(TimelineEntryEntity entry, String rulesJson) {
        if (rulesJson == null || rulesJson.isBlank() || "{}".equals(rulesJson.trim())) {
            return true;
        }
        try {
            JsonNode rules = objectMapper.readTree(rulesJson);
            if (!rules.isObject() || rules.isEmpty()) {
                return true;
            }
            String hay = ((entry.getLabel() == null ? "" : entry.getLabel()) + " "
                    + (entry.getNote() == null ? "" : entry.getNote())).toLowerCase();
            var fields = rules.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                if (f.getValue().asBoolean(false)) {
                    if (hay.contains(f.getKey().toLowerCase().replace('_', ' '))) {
                        return true;
                    }
                }
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    private String toJson(Map<String, Object> rules) {
        try {
            return objectMapper.writeValueAsString(rules == null ? Map.of() : rules);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Object> toDto(WatchSubscriptionEntity row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", row.getId());
        m.put("changeId", row.getChangeId());
        m.put("topicKey", row.getTopicKey());
        m.put("rulesJson", row.getRulesJson());
        m.put("createdAt", ApiTimes.iso(row.getCreatedAt()));
        m.put("updatedAt", ApiTimes.iso(row.getUpdatedAt()));
        return m;
    }
}
