package com.airadar.pipeline;

import com.airadar.domain.NewsItem;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class UrlDedupStage {

    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;

    public UrlDedupStage(NewsItemRepository newsItemRepository, EntityMapper entityMapper) {
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
    }

    public List<NewsItem> dedup(List<NewsItem> incoming, int lookbackDays) {
        Map<String, NewsItem> batch = new LinkedHashMap<>();
        for (NewsItem item : incoming) {
            NewsItem existing = batch.get(item.getCanonicalUrl());
            if (existing == null) {
                batch.put(item.getCanonicalUrl(), item);
            } else {
                merge(existing, item);
            }
        }

        Instant since = Instant.now().minus(lookbackDays, ChronoUnit.DAYS);
        List<String> urls = new ArrayList<>(batch.keySet());
        Map<String, NewsItemEntity> dbByUrl = new HashMap<>();
        if (!urls.isEmpty()) {
            for (NewsItemEntity entity : newsItemRepository.findByCanonicalUrlIn(urls)) {
                if (entity.getCreatedAt() != null && entity.getCreatedAt().isBefore(since)
                        && entity.getUpdatedAt() != null && entity.getUpdatedAt().isBefore(since)) {
                    continue;
                }
                dbByUrl.put(entity.getCanonicalUrl(), entity);
            }
        }

        List<NewsItem> result = new ArrayList<>();
        for (NewsItem item : batch.values()) {
            NewsItemEntity entity = dbByUrl.get(item.getCanonicalUrl());
            if (entity != null) {
                NewsItem existing = entityMapper.toDomain(entity);
                merge(existing, item);
                // Keep prior score/summary if already done; still return for potential re-score of NEW only.
                result.add(existing);
            } else {
                result.add(item);
            }
        }
        return result;
    }

    private static void merge(NewsItem target, NewsItem other) {
        target.getSourceRefs().addAll(other.getSourceRefs());
        if ((target.getContentSnippet() == null || target.getContentSnippet().length() < 40)
                && other.getContentSnippet() != null
                && other.getContentSnippet().length() > target.getContentSnippet().length()) {
            target.setContentSnippet(other.getContentSnippet());
        }
        if (target.getPublishedAt() == null
                || (other.getPublishedAt() != null && other.getPublishedAt().isBefore(target.getPublishedAt()))) {
            target.setPublishedAt(other.getPublishedAt());
        }
        if (target.getTitle() == null || target.getTitle().isBlank()) {
            target.setTitle(other.getTitle());
        }
    }
}
