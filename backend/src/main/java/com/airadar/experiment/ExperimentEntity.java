package com.airadar.experiment;

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
@Table(name = "experiments")
public class ExperimentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_id", nullable = false)
    private Long actionId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String goal;

    @Column(nullable = false)
    private String status = "running";

    @Column(name = "success_rate")
    private Double successRate;

    @Column(name = "latency_ms")
    private Double latencyMs;

    @Column(name = "token_cost")
    private Double tokenCost;

    @Column(name = "human_intervention")
    private Double humanIntervention;

    @Column(name = "review_time_min")
    private Double reviewTimeMin;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

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
    public Long getActionId() { return actionId; }
    public void setActionId(Long actionId) { this.actionId = actionId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Double getSuccessRate() { return successRate; }
    public void setSuccessRate(Double successRate) { this.successRate = successRate; }
    public Double getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Double latencyMs) { this.latencyMs = latencyMs; }
    public Double getTokenCost() { return tokenCost; }
    public void setTokenCost(Double tokenCost) { this.tokenCost = tokenCost; }
    public Double getHumanIntervention() { return humanIntervention; }
    public void setHumanIntervention(Double humanIntervention) { this.humanIntervention = humanIntervention; }
    public Double getReviewTimeMin() { return reviewTimeMin; }
    public void setReviewTimeMin(Double reviewTimeMin) { this.reviewTimeMin = reviewTimeMin; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
