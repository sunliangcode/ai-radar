package com.airadar.event;

import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.EventAssignResult;
import com.airadar.provider.ai.EventCandidate;
import com.airadar.provider.ai.EventIntelligence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class EventClusterService {

    private static final Logger log = LoggerFactory.getLogger(EventClusterService.class);
    private static final double MIN_ASSIGN_CONFIDENCE = 0.55;

    private final EventRepository eventRepository;
    private final EventItemRepository eventItemRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final EventClusterLogRepository clusterLogRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final AiService aiService;

    public EventClusterService(
            EventRepository eventRepository,
            EventItemRepository eventItemRepository,
            TimelineEntryRepository timelineEntryRepository,
            EventClusterLogRepository clusterLogRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            AiService aiService
    ) {
        this.eventRepository = eventRepository;
        this.eventItemRepository = eventItemRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.clusterLogRepository = clusterLogRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.aiService = aiService;
    }

    /** Link recently persisted DONE items that are not yet attached to an event. */
    @Transactional
    public Map<String, Object> linkUnattachedItems(int lookbackHours) {
        Instant since = Instant.now().minus(Math.max(1, lookbackHours), ChronoUnit.HOURS);
        List<NewsItemEntity> entities = newsItemRepository.findByCreatedAtGreaterThanEqualOrderByScoreDesc(since);
        int linked = 0;
        int created = 0;
        int skipped = 0;
        for (NewsItemEntity entity : entities) {
            if (entity.getStatus() != ItemStatus.DONE) {
                skipped++;
                continue;
            }
            if (eventItemRepository.existsByNewsItemId(entity.getId())) {
                skipped++;
                continue;
            }
            try {
                boolean isNew = linkOne(entityMapper.toDomain(entity));
                if (isNew) {
                    created++;
                } else {
                    linked++;
                }
            } catch (Exception e) {
                log.warn("cluster_item_failed id={} error={}", entity.getId(), e.getMessage());
                skipped++;
            }
        }
        Map<String, Object> metrics = computeMetrics();
        metrics.put("linked", linked);
        metrics.put("created", created);
        metrics.put("skipped", skipped);
        log.info("cluster_done linked={} created={} skipped={} metrics={}", linked, created, skipped, metrics);
        return metrics;
    }

    @Transactional
    public void linkNewItems(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        for (NewsItem item : items) {
            if (item.getId() == null || item.getStatus() != ItemStatus.DONE) {
                continue;
            }
            if (eventItemRepository.existsByNewsItemId(item.getId())) {
                continue;
            }
            try {
                linkOne(item);
            } catch (Exception e) {
                log.warn("cluster_new_item_failed id={} error={}", item.getId(), e.getMessage());
            }
        }
    }

    /**
     * @return true if a new event was created
     */
    boolean linkOne(NewsItem item) {
        Instant windowStart = Instant.now().minus(72, ChronoUnit.HOURS);
        List<EventEntity> recent = eventRepository.findByLastUpdatedAtGreaterThanEqualOrderByScoreDesc(windowStart);
        List<EventCandidate> candidates = prefilter(item, recent);

        EventAssignResult decision = aiService.assignEvent(item, candidates);
        EventEntity event;
        boolean created;
        if (!decision.createNew()
                && decision.eventId() != null
                && decision.confidence() >= MIN_ASSIGN_CONFIDENCE
                && eventRepository.existsById(decision.eventId())) {
            event = eventRepository.findById(decision.eventId()).orElseThrow();
            created = false;
            attach(event, item, EventItemRole.UPDATE, decision);
        } else {
            event = new EventEntity();
            event.setTitle(decision.title() == null || decision.title().isBlank()
                    ? (item.getTitle() == null ? "Untitled" : item.getTitle())
                    : decision.title());
            event.setStatus(EventStatus.EMERGING);
            event.setFirstSeenAt(item.getPublishedAt() != null ? item.getPublishedAt() : Instant.now());
            event = eventRepository.save(event);
            created = true;
            attach(event, item, EventItemRole.SEED, decision);
        }
        refreshEvent(event.getId());
        return created;
    }

    private List<EventCandidate> prefilter(NewsItem item, List<EventEntity> recent) {
        Set<String> itemEntities = EntityLexicon.extract(
                (item.getTitle() == null ? "" : item.getTitle()) + " "
                        + (item.getContentSnippet() == null ? "" : item.getContentSnippet()));
        Set<String> itemTokens = EntityLexicon.tokens(item.getTitle());
        List<ScoredCandidate> scored = new ArrayList<>();
        for (EventEntity e : recent) {
            Set<String> eEntities = EntityLexicon.extract(
                    (e.getTitle() == null ? "" : e.getTitle()) + " " + (e.getSummary() == null ? "" : e.getSummary()));
            Set<String> eTokens = EntityLexicon.tokens(e.getTitle());
            double entity = itemEntities.isEmpty() || eEntities.isEmpty() ? 0 : EntityLexicon.jaccard(itemEntities, eEntities);
            double title = EntityLexicon.jaccard(itemTokens, eTokens);
            double score = entity * 0.7 + title * 0.3;
            if (score >= 0.15 || (!itemEntities.isEmpty() && !eEntities.isEmpty() && entity > 0)) {
                scored.add(new ScoredCandidate(score, e));
            }
        }
        scored.sort(Comparator.comparingDouble(ScoredCandidate::score).reversed());
        return scored.stream()
                .limit(8)
                .map(s -> new EventCandidate(
                        s.event().getId(),
                        s.event().getTitle(),
                        s.event().getSummary(),
                        s.event().getScore() == null ? 0 : s.event().getScore()
                ))
                .toList();
    }

    private void attach(EventEntity event, NewsItem item, EventItemRole role, EventAssignResult decision) {
        EventItemEntity link = new EventItemEntity();
        link.setEventId(event.getId());
        link.setNewsItemId(item.getId());
        link.setRole(role);
        eventItemRepository.save(link);

        TimelineEntryEntity entry = new TimelineEntryEntity();
        entry.setEventId(event.getId());
        entry.setAt(item.getPublishedAt() != null ? item.getPublishedAt() : Instant.now());
        entry.setLabel(item.getTitle() == null ? "Update" : item.getTitle());
        entry.setNewsItemId(item.getId());
        entry.setNote(item.getSummary());
        timelineEntryRepository.save(entry);

        EventClusterLogEntity logEntity = new EventClusterLogEntity();
        logEntity.setNewsItemId(item.getId());
        logEntity.setDecision(decision.createNew() ? "CREATE" : "ASSIGN");
        logEntity.setEventId(event.getId());
        logEntity.setConfidence(decision.confidence());
        logEntity.setReason(decision.reason());
        clusterLogRepository.save(logEntity);
    }

    @Transactional
    public void refreshEvent(Long eventId) {
        EventEntity event = eventRepository.findById(eventId).orElse(null);
        if (event == null) {
            return;
        }
        List<EventItemEntity> links = eventItemRepository.findByEventId(eventId);
        List<NewsItem> members = new ArrayList<>();
        double maxScore = 0;
        for (EventItemEntity link : links) {
            newsItemRepository.findById(link.getNewsItemId()).ifPresent(e -> {
                NewsItem item = entityMapper.toDomain(e);
                members.add(item);
            });
        }
        for (NewsItem m : members) {
            if (m.getScore() != null) {
                maxScore = Math.max(maxScore, m.getScore());
            }
        }
        long hours = ChronoUnit.HOURS.between(event.getFirstSeenAt(), Instant.now());
        double novelty = hours <= 24 ? 1.1 : (hours <= 72 ? 1.0 : 0.9);
        event.setScore(Math.min(100, maxScore * novelty));

        if (links.size() >= 3 && hours <= 96) {
            event.setStatus(EventStatus.ACTIVE);
        } else if (hours > 168) {
            event.setStatus(EventStatus.COOLING);
        } else if (links.size() == 1) {
            event.setStatus(EventStatus.EMERGING);
        } else {
            event.setStatus(EventStatus.ACTIVE);
        }

        try {
            EventIntelligence intel = aiService.refreshEventIntelligence(event.getTitle(), members);
            if (intel.summary() != null && !intel.summary().isBlank()) {
                event.setSummary(intel.summary());
            }
            if (intel.impact() != null && !intel.impact().isBlank()) {
                event.setImpact(intel.impact());
            }
            if (intel.watchNext() != null && !intel.watchNext().isBlank()) {
                event.setWatchNext(intel.watchNext());
            }
        } catch (Exception e) {
            log.warn("event_intel_failed id={} error={}", eventId, e.getMessage());
            if (event.getSummary() == null && !members.isEmpty()) {
                event.setSummary(members.getFirst().getSummary());
            }
        }
        event.setLastUpdatedAt(Instant.now());
        eventRepository.save(event);
    }

    public Map<String, Object> computeMetrics() {
        long events = eventRepository.count();
        long links = eventItemRepository.count();
        double avg = events == 0 ? 0 : (double) links / events;
        long singletons = 0;
        for (EventEntity e : eventRepository.findAll()) {
            if (eventItemRepository.countByEventId(e.getId()) <= 1) {
                singletons++;
            }
        }
        double singletonRatio = events == 0 ? 0 : (double) singletons / events;
        Map<String, Object> m = new HashMap<>();
        m.put("eventCount", events);
        m.put("linkCount", links);
        m.put("avgItemsPerEvent", avg);
        m.put("singletonEventRatio", singletonRatio);
        return m;
    }

    private record ScoredCandidate(double score, EventEntity event) {
    }
}
