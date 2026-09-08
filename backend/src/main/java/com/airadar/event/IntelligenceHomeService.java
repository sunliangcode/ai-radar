package com.airadar.event;

import com.airadar.api.ApiTimes;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.settings.SettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class IntelligenceHomeService {

    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final EventItemRepository eventItemRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final SettingsService settingsService;

    public IntelligenceHomeService(
            EventRepository eventRepository,
            TimelineEntryRepository timelineEntryRepository,
            EventItemRepository eventItemRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            SettingsService settingsService
    ) {
        this.eventRepository = eventRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.eventItemRepository = eventItemRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.settingsService = settingsService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> home() {
        var s = settingsService.effective();
        ZoneId zone = ZoneId.of(s.timezone() != null ? s.timezone() : "Asia/Shanghai");
        Instant sinceBrief = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        int threshold = s.scoreThreshold() != null ? s.scoreThreshold() : 60;

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

        List<Map<String, Object>> whatMatters = eventRepository
                .findByStatusOrderByScoreDesc(EventStatus.ACTIVE)
                .stream()
                .filter(e -> e.getScore() != null && e.getScore() >= threshold)
                .limit(10)
                .map(this::eventSummary)
                .toList();

        List<Map<String, Object>> whatsEmerging = new ArrayList<>();
        whatsEmerging.addAll(eventRepository.findByStatusOrderByScoreDesc(EventStatus.EMERGING).stream()
                .limit(8)
                .map(this::eventSummary)
                .toList());
        if (whatsEmerging.size() < 5) {
            eventRepository.findTop50ByOrderByScoreDesc().stream()
                    .filter(e -> e.getStatus() == EventStatus.EMERGING || e.getStatus() == EventStatus.ACTIVE)
                    .filter(e -> whatsEmerging.stream().noneMatch(m -> e.getId().equals(m.get("id"))))
                    .limit(5 - whatsEmerging.size())
                    .forEach(e -> whatsEmerging.add(eventSummary(e)));
        }

        List<Map<String, Object>> whatToWatch = eventRepository.findTop50ByOrderByScoreDesc().stream()
                .filter(e -> e.getWatchNext() != null && !e.getWatchNext().isBlank())
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = eventSummary(e);
                    m.put("watchNext", e.getWatchNext());
                    return m;
                })
                .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("whatChanged", whatChanged);
        out.put("whatMatters", whatMatters);
        out.put("whatsEmerging", whatsEmerging);
        out.put("whatToWatch", whatToWatch);
        out.put("generatedAt", ApiTimes.iso(Instant.now()));
        return out;
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
