package com.airadar.outcome;

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
@Table(name = "outcomes")
public class OutcomeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "experiment_id")
    private Long experimentId;

    @Column(name = "month_key", nullable = false, unique = true)
    private String monthKey;

    @Column(name = "insights_count", nullable = false)
    private int insightsCount;

    @Column(name = "actions_count", nullable = false)
    private int actionsCount;

    @Column(name = "experiments_count", nullable = false)
    private int experimentsCount;

    @Column(name = "successful_count", nullable = false)
    private int successfulCount;

    @Column(name = "time_saved_hours", nullable = false)
    private double timeSavedHours;

    @Column(name = "ai_cost", nullable = false)
    private double aiCost;

    private Double roi;

    @Column(columnDefinition = "TEXT")
    private String notes;

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
    public Long getExperimentId() { return experimentId; }
    public void setExperimentId(Long experimentId) { this.experimentId = experimentId; }
    public String getMonthKey() { return monthKey; }
    public void setMonthKey(String monthKey) { this.monthKey = monthKey; }
    public int getInsightsCount() { return insightsCount; }
    public void setInsightsCount(int insightsCount) { this.insightsCount = insightsCount; }
    public int getActionsCount() { return actionsCount; }
    public void setActionsCount(int actionsCount) { this.actionsCount = actionsCount; }
    public int getExperimentsCount() { return experimentsCount; }
    public void setExperimentsCount(int experimentsCount) { this.experimentsCount = experimentsCount; }
    public int getSuccessfulCount() { return successfulCount; }
    public void setSuccessfulCount(int successfulCount) { this.successfulCount = successfulCount; }
    public double getTimeSavedHours() { return timeSavedHours; }
    public void setTimeSavedHours(double timeSavedHours) { this.timeSavedHours = timeSavedHours; }
    public double getAiCost() { return aiCost; }
    public void setAiCost(double aiCost) { this.aiCost = aiCost; }
    public Double getRoi() { return roi; }
    public void setRoi(Double roi) { this.roi = roi; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getUpdatedAt() { return updatedAt; }
}
