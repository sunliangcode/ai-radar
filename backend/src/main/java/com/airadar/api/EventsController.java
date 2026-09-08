package com.airadar.api;

import com.airadar.event.EventEntity;
import com.airadar.event.EventItemEntity;
import com.airadar.event.EventItemRepository;
import com.airadar.event.EventRepository;
import com.airadar.event.EventStatus;
import com.airadar.event.IntelligenceHomeService;
import com.airadar.event.TimelineEntryEntity;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class EventsController {

    private final EventRepository eventRepository;
    private final EventItemRepository eventItemRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final IntelligenceHomeService intelligenceHomeService;

    public EventsController(
            EventRepository eventRepository,
            EventItemRepository eventItemRepository,
            TimelineEntryRepository timelineEntryRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            IntelligenceHomeService intelligenceHomeService
    ) {
        this.eventRepository = eventRepository;
        this.eventItemRepository = eventItemRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.intelligenceHomeService = intelligenceHomeService;
    }

    @GetMapping("/events")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minScore,
            @RequestParam(defaultValue = "40") int limit
    ) {
        List<EventEntity> events;
        if (status != null && !status.isBlank()) {
            events = eventRepository.findByStatusOrderByScoreDesc(EventStatus.valueOf(status.toUpperCase()));
        } else {
            events = eventRepository.findTop50ByOrderByScoreDesc();
        }
        return events.stream()
                .filter(e -> minScore == null || (e.getScore() != null && e.getScore() >= minScore))
                .limit(Math.max(1, Math.min(limit, 100)))
                .map(this::summary)
                .toList();
    }

    @GetMapping("/events/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        EventEntity event = eventRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("event not found: " + id));
        Map<String, Object> dto = summary(event);
        dto.put("impact", event.getImpact());
        dto.put("watchNext", event.getWatchNext());
        dto.put("reliability", event.getReliability());

        List<Map<String, Object>> timeline = new ArrayList<>();
        for (TimelineEntryEntity t : timelineEntryRepository.findByEventIdOrderByAtAsc(id)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId());
            row.put("at", ApiTimes.iso(t.getAt()));
            row.put("label", t.getLabel());
            row.put("note", t.getNote());
            row.put("newsItemId", t.getNewsItemId());
            timeline.add(row);
        }
        dto.put("timeline", timeline);

        List<Map<String, Object>> items = new ArrayList<>();
        for (EventItemEntity link : eventItemRepository.findByEventId(id)) {
            newsItemRepository.findById(link.getNewsItemId()).ifPresent(e -> {
                var item = entityMapper.toDomain(e);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", item.getId());
                m.put("title", item.getTitle());
                m.put("score", item.getScore());
                m.put("summary", item.getSummary());
                m.put("canonicalUrl", item.getCanonicalUrl());
                m.put("role", link.getRole());
                m.put("publishedAt", ApiTimes.iso(item.getPublishedAt()));
                items.add(m);
            });
        }
        dto.put("items", items);
        return dto;
    }

    @GetMapping("/intelligence/home")
    public Map<String, Object> intelligenceHome() {
        return intelligenceHomeService.home();
    }

    private Map<String, Object> summary(EventEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("title", e.getTitle());
        m.put("status", e.getStatus());
        m.put("score", e.getScore());
        m.put("summary", e.getSummary());
        m.put("firstSeenAt", ApiTimes.iso(e.getFirstSeenAt()));
        m.put("lastUpdatedAt", ApiTimes.iso(e.getLastUpdatedAt()));
        m.put("itemCount", eventItemRepository.countByEventId(e.getId()));
        return m;
    }
}
