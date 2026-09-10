package com.airadar.persistence;

import com.airadar.domain.ItemStatus;
import com.airadar.domain.SourceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "news_items")
public class NewsItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "canonical_url", nullable = false, unique = true)
    private String canonicalUrl;

    @Column(nullable = false)
    private String title;

    @Column(name = "title_display")
    private String titleDisplay;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "content_snippet")
    private String contentSnippet;

    private Double score;

    @Column(name = "score_reason")
    private String scoreReason;

    private String summary;

    private String tags;

    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status = ItemStatus.NEW;

    @Column(name = "source_refs")
    private String sourceRefs;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_source_type")
    private SourceType primarySourceType;

    @Column(name = "primary_source_id")
    private String primarySourceId;

    @Column(name = "raw_meta")
    private String rawMeta;

    @Column(name = "read_flag", nullable = false)
    private boolean readFlag = false;

    @Column(nullable = false)
    private boolean saved = false;

    @Column(nullable = false)
    private boolean dismissed = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

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

    public String getTitleDisplay() {
        return titleDisplay;
    }

    public void setTitleDisplay(String titleDisplay) {
        this.titleDisplay = titleDisplay;
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

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
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

    public String getSourceRefs() {
        return sourceRefs;
    }

    public void setSourceRefs(String sourceRefs) {
        this.sourceRefs = sourceRefs;
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

    public String getRawMeta() {
        return rawMeta;
    }

    public void setRawMeta(String rawMeta) {
        this.rawMeta = rawMeta;
    }

    public boolean isReadFlag() {
        return readFlag;
    }

    public void setReadFlag(boolean readFlag) {
        this.readFlag = readFlag;
    }

    public boolean isSaved() {
        return saved;
    }

    public void setSaved(boolean saved) {
        this.saved = saved;
    }

    public boolean isDismissed() {
        return dismissed;
    }

    public void setDismissed(boolean dismissed) {
        this.dismissed = dismissed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
