package com.airadar.change;

import com.airadar.api.ApiTimes;
import com.airadar.event.EventEntity;
import com.airadar.event.EventItemEntity;
import com.airadar.event.EventItemRepository;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryEntity;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.impact.ImpactRepository;
import com.airadar.impact.ImpactService;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class ChangeService {

    private final EventRepository eventRepository;
    private final EventItemRepository eventItemRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final ImpactRepository impactRepository;
    private final ImpactService impactService;

    public ChangeService(
            EventRepository eventRepository,
            EventItemRepository eventItemRepository,
            TimelineEntryRepository timelineEntryRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            ImpactRepository impactRepository,
            ImpactService impactService
    ) {
        this.eventRepository = eventRepository;
        this.eventItemRepository = eventItemRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.impactRepository = impactRepository;
        this.impactService = impactService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRecent(int limit) {
        return eventRepository.findTop50ByOrderByScoreDesc().stream()
                .sorted((a, b) -> b.getLastUpdatedAt().compareTo(a.getLastUpdatedAt()))
                .limit(Math.max(1, Math.min(limit, 100)))
                .map(this::fromEvent)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(Long id) {
        EventEntity event = eventRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("change not found: " + id));
        Map<String, Object> dto = fromEvent(event);

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
        dto.put("watchNext", event.getWatchNext());
        dto.put("eventImpact", event.getImpact());
        return dto;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> fromEvent(EventEntity event) {
        long sources = eventItemRepository.countByEventId(event.getId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", event.getId());
        m.put("eventId", event.getId());
        m.put("title", event.getTitle());
        m.put("summary", event.getSummary());
        m.put("changeType", inferChangeType(event.getTitle(), event.getSummary(), event.getImpact()));
        m.put("confidence", event.getReliability() == null ? 0.5 : event.getReliability());
        m.put("trend", event.getStatus() == null ? "unknown" : event.getStatus().name());
        m.put("status", event.getStatus() == null ? null : event.getStatus().name());
        m.put("firstDetectedAt", ApiTimes.iso(event.getFirstSeenAt()));
        m.put("lastUpdatedAt", ApiTimes.iso(event.getLastUpdatedAt()));
        m.put("sourceCount", sources);
        m.put("itemCount", sources);
        m.put("score", event.getScore());

        impactRepository.findByEventId(event.getId()).ifPresent(impact -> {
            Map<String, Object> impactDto = impactService.toDto(impact);
            m.put("impactAnalysis", impactDto);
            m.put("relevance", impact.getRelevance());
            m.put("impact", impact.getImpactScore());
            m.put("urgency", impact.getUrgency());
            m.put("analysisConfidence", impact.getConfidence());
            m.put("tier", impact.getTier());
            m.put("why", impact.getWhyText());
            m.put("evidence", impact.getEvidenceText());
            m.put("recommendation", impact.getRecommendation());
            m.put("priority", impact.getPriority());
        });
        if (!m.containsKey("evidence")) {
            m.put("evidence", event.getImpact());
        }
        return m;
    }

    static String inferChangeType(String title, String summary, String impact) {
        String text = ((title == null ? "" : title) + " "
                + (summary == null ? "" : summary) + " "
                + (impact == null ? "" : impact)).toLowerCase(Locale.ROOT);

        if (containsAny(text, "price", "pricing", "cost", "免费", "降价", "涨价", "计费", "$/")) {
            return "pricing";
        }
        if (containsAny(text, "replacing", "replacement", "替代", "migrate from", "instead of", "deprecat")) {
            return "substitution";
        }
        if (containsAny(text, "benchmark", "capability", "sota", "gpt-", "claude", "gemini", "model release",
                "模型能力", "参数", "推理")) {
            return "model_capability";
        }
        if (containsAny(text, "launch", "released", "announces", "introducing", "new framework",
                "开源", "发布", "新品", "首次")) {
            return "new_tech";
        }
        if (containsAny(text, "growth", "adoption", "surge", "trending", "stars", "增长", "爆发", "流行")) {
            return "growth";
        }
        if (containsAny(text, "trend", "shift", "paradigm", "move from", "转向", "趋势", "主流")) {
            return "trend_shift";
        }
        return "unknown";
    }

    private static boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}
