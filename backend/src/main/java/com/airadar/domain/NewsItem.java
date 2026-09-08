package com.airadar.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class NewsItem {

    private Long id;
    private String canonicalUrl;
    private String title;
    private Instant publishedAt;
    private String contentSnippet;
    private Double score;
    private String scoreReason;
    private String summary;
    private List<String> tags = new ArrayList<>();
    private String category;
    private ItemStatus status = ItemStatus.NEW;
    private Set<String> sourceRefs = new LinkedHashSet<>();
    private SourceType primarySourceType;
    private String primarySourceId;
    private Map<String, Object> rawMeta;
    private boolean read;
    private boolean saved;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCanonicalUrl() {
        return canonicalUrl;
    }

    public void setCanonicalUrl(String canonicalUrl) {
        this.canonicalUrl = canonicalUrl;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getContentSnippet() {
        return contentSnippet;
    }

    public void setContentSnippet(String contentSnippet) {
        this.contentSnippet = contentSnippet;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public String getScoreReason() {
        return scoreReason;
    }

    public void setScoreReason(String scoreReason) {
        this.scoreReason = scoreReason;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags != null ? tags : new ArrayList<>();
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ItemStatus getStatus() {
        return status;
    }

    public void setStatus(ItemStatus status) {
        this.status = status;
    }

    public Set<String> getSourceRefs() {
        return sourceRefs;
    }

    public void setSourceRefs(Set<String> sourceRefs) {
        this.sourceRefs = sourceRefs != null ? sourceRefs : new LinkedHashSet<>();
    }

    public SourceType getPrimarySourceType() {
        return primarySourceType;
    }

    public void setPrimarySourceType(SourceType primarySourceType) {
        this.primarySourceType = primarySourceType;
    }

    public String getPrimarySourceId() {
        return primarySourceId;
    }

    public void setPrimarySourceId(String primarySourceId) {
        this.primarySourceId = primarySourceId;
    }

    public Map<String, Object> getRawMeta() {
        return rawMeta;
    }

    public void setRawMeta(Map<String, Object> rawMeta) {
        this.rawMeta = rawMeta;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public boolean isSaved() {
        return saved;
    }

    public void setSaved(boolean saved) {
        this.saved = saved;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
