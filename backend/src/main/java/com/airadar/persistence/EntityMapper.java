package com.airadar.persistence;

import com.airadar.domain.NewsItem;
import com.airadar.domain.Source;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Component
public class EntityMapper {

    private final ObjectMapper objectMapper;

    public EntityMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Source toDomain(SourceEntity entity) {
        Map<String, Object> config = readMap(entity.getConfigJson());
        return new Source(
                entity.getId(),
                entity.getName(),
                entity.getType(),
                config,
                entity.isEnabled(),
                entity.getLastFetchedAt()
        );
    }

    public NewsItem toDomain(NewsItemEntity entity) {
        NewsItem item = new NewsItem();
        item.setId(entity.getId());
        item.setCanonicalUrl(entity.getCanonicalUrl());
        item.setTitle(entity.getTitle());
        item.setPublishedAt(entity.getPublishedAt());
        item.setContentSnippet(entity.getContentSnippet());
        item.setScore(entity.getScore());
        item.setScoreReason(entity.getScoreReason());
        item.setSummary(entity.getSummary());
        item.setTags(readList(entity.getTags()));
        item.setCategory(entity.getCategory());
        item.setStatus(entity.getStatus());
        item.setSourceRefs(new LinkedHashSet<>(readList(entity.getSourceRefs())));
        item.setPrimarySourceType(entity.getPrimarySourceType());
        item.setPrimarySourceId(entity.getPrimarySourceId());
        item.setRawMeta(readMap(entity.getRawMeta()));
        item.setRead(entity.isReadFlag());
        item.setSaved(entity.isSaved());
        item.setCreatedAt(entity.getCreatedAt());
        item.setUpdatedAt(entity.getUpdatedAt());
        return item;
    }

    public void applyToEntity(NewsItem item, NewsItemEntity entity) {
        entity.setCanonicalUrl(item.getCanonicalUrl());
        entity.setTitle(item.getTitle());
        entity.setPublishedAt(item.getPublishedAt());
        entity.setContentSnippet(item.getContentSnippet());
        entity.setScore(item.getScore());
        entity.setScoreReason(item.getScoreReason());
        entity.setSummary(item.getSummary());
        entity.setTags(writeJson(item.getTags()));
        entity.setCategory(item.getCategory());
        entity.setStatus(item.getStatus());
        entity.setSourceRefs(writeJson(new ArrayList<>(item.getSourceRefs())));
        entity.setPrimarySourceType(item.getPrimarySourceType());
        entity.setPrimarySourceId(item.getPrimarySourceId());
        entity.setRawMeta(writeJson(item.getRawMeta()));
        entity.setReadFlag(item.isRead());
        entity.setSaved(item.isSaved());
    }

    public String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize JSON", e);
        }
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            return Map.of();
        }
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
