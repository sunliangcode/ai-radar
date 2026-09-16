package com.airadar.pipeline;

import com.airadar.domain.NewsItem;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class UrlDedupStage {

    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;

    public UrlDedupStage(NewsItemRepository newsItemRepository, EntityMapper entityMapper) {
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
    }

    /**
     * @param lookbackDays retained for call-site compatibility; AI fields are always
     *                     merged from any matching URL so summarize/translate is not repeated.
     */
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

        List<String> urls = new ArrayList<>(batch.keySet());
        Map<String, NewsItemEntity> dbByUrl = new HashMap<>();
        if (!urls.isEmpty()) {
            for (NewsItemEntity entity : newsItemRepository.findByCanonicalUrlIn(urls)) {
                dbByUrl.put(entity.getCanonicalUrl(), entity);
            }
        }

        List<NewsItem> urlDeduped = new ArrayList<>();
        for (NewsItem item : batch.values()) {
            NewsItemEntity entity = dbByUrl.get(item.getCanonicalUrl());
            if (entity != null) {
                NewsItem existing = entityMapper.toDomain(entity);
                merge(existing, item);
                // Keep prior score/summary/titleDisplay; still return for potential re-score of NEW only.
                urlDeduped.add(existing);
            } else {
                urlDeduped.add(item);
            }
        }
        return discardDuplicateTitles(urlDeduped);
    }

    /**
     * Exact-title discard after URL merge. Persisted URL hits (with id) always
     * pass through. New rows with a title already present in-batch or in DB are dropped.
     */
    private List<NewsItem> discardDuplicateTitles(List<NewsItem> items) {
        List<NewsItem> result = new ArrayList<>();
        Set<String> seenTitles = new HashSet<>();
        List<String> candidateTitles = new ArrayList<>();

        for (NewsItem item : items) {
            if (item.getId() != null) {
                result.add(item);
                if (isDedupableTitle(item)) {
                    seenTitles.add(item.getTitle());
                }
            } else if (isDedupableTitle(item)) {
                candidateTitles.add(item.getTitle());
            }
        }

        Set<String> dbTitles = new HashSet<>();
        if (!candidateTitles.isEmpty()) {
            for (NewsItemEntity entity : newsItemRepository.findByTitleIn(candidateTitles)) {
                dbTitles.add(entity.getTitle());
            }
        }

        for (NewsItem item : items) {
            if (item.getId() != null) {
                continue;
            }
            if (!isDedupableTitle(item)) {
                result.add(item);
                continue;
            }
            String title = item.getTitle();
            if (seenTitles.contains(title) || dbTitles.contains(title)) {
                continue;
            }
            seenTitles.add(title);
            result.add(item);
        }
        return result;
    }

    /** Skip blank titles and URL-fallback titles from {@code NormalizeStage.cleanTitle}. */
    static boolean isDedupableTitle(NewsItem item) {
        String title = item.getTitle();
        if (title == null || title.isBlank()) {
            return false;
        }
        String url = item.getCanonicalUrl();
        return url == null || !title.equals(url);
    }

    private static void merge(NewsItem target, NewsItem other) {
        target.getSourceRefs().addAll(other.getSourceRefs());
        String targetSnippet = target.getContentSnippet();
        String otherSnippet = other.getContentSnippet();
        if (otherSnippet != null && !otherSnippet.isBlank()) {
            int targetLen = targetSnippet == null ? 0 : targetSnippet.length();
            if (targetLen < 40 && otherSnippet.length() > targetLen) {
                target.setContentSnippet(otherSnippet);
            }
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
