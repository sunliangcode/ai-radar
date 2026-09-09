package com.airadar.api;

import com.airadar.domain.NewsItem;
import com.airadar.event.EventItemRepository;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
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

    public ItemsController(
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            EventItemRepository eventItemRepository,
            InterestSignalsService interestSignals
    ) {
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.eventItemRepository = eventItemRepository;
        this.interestSignals = interestSignals;
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
            stream = newsItemRepository.findByCreatedAtGreaterThanEqualOrderByScoreDesc(from)
                    .stream()
                    .map(entityMapper::toDomain);
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

    private Map<String, Object> toDto(NewsItem item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.getId());
        dto.put("title", item.getTitle());
        dto.put("canonicalUrl", item.getCanonicalUrl());
        dto.put("score", item.getScore());
        dto.put("scoreReason", item.getScoreReason());
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
        if (item.getId() != null) {
            eventItemRepository.findFirstByNewsItemId(item.getId()).ifPresent(link -> {
                dto.put("eventId", link.getEventId());
            });
        }
        return dto;
    }
}
