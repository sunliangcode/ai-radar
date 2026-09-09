package com.airadar.impact;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "impacts")
public class ImpactEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true)
    private Long eventId;

    @Column(nullable = false)
    private String title;

    private double relevance;
    @Column(name = "impact_score")
    private double impactScore;
    private double urgency;
    private double confidence;
    private double effort;
    private double priority;

    @Column(nullable = false)
    private String tier = "IGNORE";

    @Column(name = "why_text", columnDefinition = "TEXT")
    private String whyText;

    @Column(name = "evidence_text", columnDefinition = "TEXT")
    private String evidenceText;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public double getRelevance() { return relevance; }
    public void setRelevance(double relevance) { this.relevance = relevance; }
    public double getImpactScore() { return impactScore; }
    public void setImpactScore(double impactScore) { this.impactScore = impactScore; }
    public double getUrgency() { return urgency; }
    public void setUrgency(double urgency) { this.urgency = urgency; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public double getEffort() { return effort; }
    public void setEffort(double effort) { this.effort = effort; }
    public double getPriority() { return priority; }
    public void setPriority(double priority) { this.priority = priority; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getWhyText() { return whyText; }
    public void setWhyText(String whyText) { this.whyText = whyText; }
    public String getEvidenceText() { return evidenceText; }
    public void setEvidenceText(String evidenceText) { this.evidenceText = evidenceText; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
