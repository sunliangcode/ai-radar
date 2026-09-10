package com.airadar.api;

import com.airadar.domain.NewsItem;
import com.airadar.event.EventItemRepository;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.persistence.RepoStarSnapshotRepository;
import com.airadar.star.StarService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/items")
public class ItemsController {

    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final EventItemRepository eventItemRepository;
    private final InterestSignalsService interestSignals;
    private final StarService starService;
    private final RepoStarSnapshotRepository snapshotRepository;

    public ItemsController(
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            EventItemRepository eventItemRepository,
            InterestSignalsService interestSignals,
            StarService starService,
            RepoStarSnapshotRepository snapshotRepository
    ) {
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.eventItemRepository = eventItemRepository;
        this.interestSignals = interestSignals;
        this.starService = starService;
        this.snapshotRepository = snapshotRepository;
    }

    @GetMapping("/interest-keywords")
    public Map<String, Object> interestKeywords() {
        List<String> keywords = interestSignals.keywordsFromSaved();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("keywords", keywords);
        out.put("effectiveInterestProfile", interestSignals.effectiveInterestProfile());
        return out;
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since,
            @RequestParam(required = false) Double minScore,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) Boolean saved,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) String sourceType,
            @RequestParam(defaultValue = "score") String sort,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "50") int limit
    ) {
        boolean savedOnly = Boolean.TRUE.equals(saved);
        boolean channelFilter = sourceType != null && !sourceType.isBlank();
        Stream<NewsItem> stream;
        if (savedOnly) {
            stream = newsItemRepository.findBySavedTrue().stream().map(entityMapper::toDomain);
        } else {
            Instant from = since != null
                    ? since
                    : LocalDate.now(ZoneOffset.UTC)
                    .minusDays(channelFilter ? 365 : 7)
                    .atStartOfDay()
                    .toInstant(ZoneOffset.UTC);
            String sinceStr = from.toString();
            if (channelFilter) {
                stream = newsItemRepository
                        .findBySourceTypeSinceNative(sourceType.trim().toUpperCase(), sinceStr)
                        .stream().map(entityMapper::toDomain);
                channelFilter = false;
            } else {
                stream = newsItemRepository.findByCreatedSinceNative(sinceStr)
                        .stream().map(entityMapper::toDomain);
            }
        }

        if (minScore != null) {
            stream = stream.filter(i -> i.getScore() != null && i.getScore() >= minScore);
        }
        if (Boolean.TRUE.equals(unread)) {
            stream = stream.filter(i -> !i.isRead());
        }
        if (sourceId != null) {
            String needle = String.valueOf(sourceId);
            stream = stream.filter(i ->
                    (i.getPrimarySourceId() != null && i.getPrimarySourceId().contains(needle))
                            || i.getSourceRefs().stream().anyMatch(r -> r.contains(needle))
            );
        }
        if (channelFilter) {
            String wanted = sourceType.trim();
            stream = stream.filter(i ->
                    i.getPrimarySourceType() != null
                            && wanted.equalsIgnoreCase(i.getPrimarySourceType().name())
            );
        }

        Comparator<NewsItem> secondary;
        if ("publishedAt".equalsIgnoreCase(sort)) {
            secondary = Comparator.comparing(NewsItem::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        } else if ("createdAt".equalsIgnoreCase(sort)) {
            secondary = Comparator.comparing(NewsItem::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        } else {
            secondary = Comparator.comparing(NewsItem::getScore, Comparator.nullsLast(Comparator.reverseOrder()));
        }
        // Unread first, then the requested sort within each group.
        Comparator<NewsItem> comparator = Comparator.comparing(NewsItem::isRead).thenComparing(secondary);

        List<NewsItem> filtered = stream.sorted(comparator).toList();
        int total = filtered.size();
        int off = Math.max(0, offset);
        int lim = Math.max(1, Math.min(limit, 200));
        List<Map<String, Object>> page = filtered.stream()
                .skip(off)
                .limit(lim)
                .map(this::toDto)
                .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", page);
        out.put("total", total);
        out.put("offset", off);
        out.put("limit", lim);
        return out;
    }

    @PatchMapping("/{id}")
    public Map<String, Object> patch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        NewsItemEntity entity = newsItemRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("item not found: " + id));
        if (body.containsKey("read")) {
            entity.setReadFlag(Boolean.parseBoolean(String.valueOf(body.get("read"))));
        }
        if (body.containsKey("saved")) {
            entity.setSaved(Boolean.parseBoolean(String.valueOf(body.get("saved"))));
        }
        return toDto(entityMapper.toDomain(newsItemRepository.save(entity)));
    }

    @PostMapping("/mark-all-read")
    public Map<String, Object> markAllRead() {
        List<NewsItemEntity> unread = newsItemRepository.findByReadFlagFalse();
        for (NewsItemEntity entity : unread) {
            entity.setReadFlag(true);
        }
        newsItemRepository.saveAll(unread);
        return Map.of("updated", unread.size());
    }

    @GetMapping("/unread-counts")
    public Map<String, Object> unreadCounts() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Object[] row : snapshotRepository.unreadCountsBySourceType()) {
            Object type = row[0];
            Object count = row[1];
            if (type != null) {
                out.put(String.valueOf(type), ((Number) count).longValue());
            }
        }
        return out;
    }

    @GetMapping("/search")
    public Map<String, Object> search(
            @RequestParam("q") String q,
            @RequestParam(defaultValue = "50") int limit
    ) {
        String needle = q == null ? "" : q.trim();
        if (needle.isEmpty()) {
            return Map.of("items", List.of(), "total", 0);
        }
        int lim = Math.max(1, Math.min(limit, 200));
        List<Map<String, Object>> results = newsItemRepository
                .findByTitleContainingIgnoreCaseOrContentSnippetContainingIgnoreCase(needle, needle)
                .stream()
                .sorted(Comparator.comparing(NewsItemEntity::getScore,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(lim)
                .map(e -> toDto(entityMapper.toDomain(e)))
                .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", results);
        out.put("total", results.size());
        out.put("query", needle);
        return out;
    }

    @PostMapping("/batch")
    public Map<String, Object> batch(@RequestBody Map<String, Object> body) {
        Object rawIds = body.get("ids");
        if (!(rawIds instanceof List<?> rawList) || rawList.isEmpty()) {
            return Map.of("updated", 0);
        }
        List<Long> ids = rawList.stream()
                .map(ItemsController::asLong)
                .filter(java.util.Objects::nonNull)
                .toList();
        List<NewsItemEntity> entities = newsItemRepository.findAllById(ids);
        boolean setRead = body.containsKey("read");
        boolean readValue = Boolean.parseBoolean(String.valueOf(body.get("read")));
        boolean setSaved = body.containsKey("saved");
        boolean savedValue = Boolean.parseBoolean(String.valueOf(body.get("saved")));
        for (NewsItemEntity entity : entities) {
            if (setRead) entity.setReadFlag(readValue);
            if (setSaved) entity.setSaved(savedValue);
        }
        newsItemRepository.saveAll(entities);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("updated", entities.size());
        return out;
    }

    private static Long asLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> toDto(NewsItem item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.getId());
        dto.put("title", item.getTitle());
        dto.put("canonicalUrl", item.getCanonicalUrl());
        dto.put("score", item.getScore());
        dto.put("scoreReason", item.getScoreReason());
        dto.put("scoreSource", detectScoreSource(item.getScoreReason()));
        dto.put("summary", item.getSummary());
        dto.put("contentSnippet", item.getContentSnippet());
        dto.put("tags", item.getTags());
        dto.put("category", item.getCategory());
        dto.put("status", item.getStatus());
        dto.put("publishedAt", ApiTimes.iso(item.getPublishedAt()));
        dto.put("sourceRefs", item.getSourceRefs());
        dto.put("primarySourceType", item.getPrimarySourceType());
        dto.put("read", item.isRead());
        dto.put("saved", item.isSaved());
        dto.put("createdAt", ApiTimes.iso(item.getCreatedAt()));
        if (item.getRawMeta() != null && item.getRawMeta().get("stars") instanceof Number n) {
            Integer stars = n.intValue();
            dto.put("stars", stars);
            Integer delta = starService.delta7d(item.getCanonicalUrl(), stars);
            if (delta != null) {
                dto.put("starsDelta7d", delta);
            }
        }
        if (item.getId() != null) {
            eventItemRepository.findFirstByNewsItemId(item.getId()).ifPresent(link -> {
                dto.put("eventId", link.getEventId());
            });
        }
        return dto;
    }

    /**
     * Heuristic (rule-based) scores carry Chinese reasons like "兴趣词命中" / "通用启发式评分".
     * Anything else is treated as an LLM-generated analysis, so the UI can label it honestly.
     */
    private static String detectScoreSource(String reason) {
        if (reason == null || reason.isBlank()) return "unknown";
        String r = reason.toLowerCase();
        if (r.contains("启发") || r.contains("兴趣词") || r.contains("通用启发")
                || r.contains("heuristic") || r.contains("keyword") || r.contains("hits")) {
            return "rule";
        }
        return "ai";
    }
}
