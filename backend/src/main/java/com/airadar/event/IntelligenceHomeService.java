package com.airadar.event;

import com.airadar.action.ActionService;
import com.airadar.api.ApiTimes;
import com.airadar.impact.ImpactService;
import com.airadar.opportunity.OpportunityService;
import com.airadar.outcome.OutcomeService;
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
    private final ImpactService impactService;
    private final ActionService actionService;
    private final OpportunityService opportunityService;
    private final OutcomeService outcomeService;

    public IntelligenceHomeService(
            EventRepository eventRepository,
            TimelineEntryRepository timelineEntryRepository,
            EventItemRepository eventItemRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            SettingsService settingsService,
            ImpactService impactService,
            ActionService actionService,
            OpportunityService opportunityService,
            OutcomeService outcomeService
    ) {
        this.eventRepository = eventRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.eventItemRepository = eventItemRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.settingsService = settingsService;
        this.impactService = impactService;
        this.actionService = actionService;
        this.opportunityService = opportunityService;
        this.outcomeService = outcomeService;
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

        List<Map<String, Object>> whyCare = impactService.whyCare();
        List<Map<String, Object>> impacts = impactService.listByTiers(List.of("HIGH", "MEDIUM"));
        List<Map<String, Object>> actions = actionService.listOpen();
        List<Map<String, Object>> opportunities = opportunityService.listByKind("OPPORTUNITY");
        List<Map<String, Object>> risks = opportunityService.listByKind("RISK");

        List<Map<String, Object>> todayChanges = new ArrayList<>();
        java.util.LinkedHashSet<Long> seenEventIds = new java.util.LinkedHashSet<>();
        for (Map<String, Object> card : whyCare) {
            Long eventId = asLong(card.get("eventId"));
            if (eventId != null && seenEventIds.add(eventId)) {
                todayChanges.add(card);
            }
            if (todayChanges.size() >= 5) {
                break;
            }
        }
        if (todayChanges.size() < 5) {
            for (Map<String, Object> card : impacts) {
                Long eventId = asLong(card.get("eventId"));
                if (eventId != null && seenEventIds.add(eventId)) {
                    todayChanges.add(card);
                }
                if (todayChanges.size() >= 5) {
                    break;
                }
            }
        }

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

        // Legacy columns for gradual UI migration
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

        Map<String, Object> out = new LinkedHashMap<>();
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
