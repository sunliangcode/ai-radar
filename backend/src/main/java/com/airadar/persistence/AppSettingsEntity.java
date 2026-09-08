package com.airadar.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_settings")
public class AppSettingsEntity {

    @Id
    private Long id = 1L;

    @Column(name = "interest_profile")
    private String interestProfile;

    @Column(name = "summary_language")
    private String summaryLanguage;

    @Column(name = "score_threshold")
    private Integer scoreThreshold;

    @Column(name = "max_items")
    private Integer maxItems;

    @Column(name = "lookback_hours")
    private Integer lookbackHours;

    @Column(name = "fetch_interval_ms")
    private Long fetchIntervalMs;

    @Column(name = "push_cron")
    private String pushCron;

    private String timezone;

    @Column(name = "ui_base_url")
    private String uiBaseUrl;

    @Column(name = "push_only_when_items")
    private Boolean pushOnlyWhenItems;

    @Column(name = "openai_base_url")
    private String openaiBaseUrl;

    @Column(name = "openai_model")
    private String openaiModel;

    @Column(name = "feishu_webhook_url")
    private String feishuWebhookUrl;

    @Column(name = "webhook_url")
    private String webhookUrl;

    @Column(name = "webhook_headers_json")
    private String webhookHeadersJson;

    @Column(name = "smtp_host")
    private String smtpHost;

    @Column(name = "smtp_port")
    private Integer smtpPort;

    @Column(name = "smtp_username")
    private String smtpUsername;

    @Column(name = "smtp_from")
    private String smtpFrom;

    @Column(name = "smtp_to")
    private String smtpTo;

    @Column(name = "smtp_starttls")
    private Boolean smtpStarttls;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInterestProfile() {
        return interestProfile;
    }

    public void setInterestProfile(String interestProfile) {
        this.interestProfile = interestProfile;
    }

    public String getSummaryLanguage() {
        return summaryLanguage;
    }

    public void setSummaryLanguage(String summaryLanguage) {
        this.summaryLanguage = summaryLanguage;
    }

    public Integer getScoreThreshold() {
        return scoreThreshold;
    }

    public void setScoreThreshold(Integer scoreThreshold) {
        this.scoreThreshold = scoreThreshold;
    }

    public Integer getMaxItems() {
        return maxItems;
    }

    public void setMaxItems(Integer maxItems) {
        this.maxItems = maxItems;
    }

    public Integer getLookbackHours() {
        return lookbackHours;
    }

    public void setLookbackHours(Integer lookbackHours) {
        this.lookbackHours = lookbackHours;
    }

    public Long getFetchIntervalMs() {
        return fetchIntervalMs;
    }

    public void setFetchIntervalMs(Long fetchIntervalMs) {
        this.fetchIntervalMs = fetchIntervalMs;
    }

    public String getPushCron() {
        return pushCron;
    }

    public void setPushCron(String pushCron) {
        this.pushCron = pushCron;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getUiBaseUrl() {
        return uiBaseUrl;
    }

    public void setUiBaseUrl(String uiBaseUrl) {
        this.uiBaseUrl = uiBaseUrl;
    }

    public Boolean getPushOnlyWhenItems() {
        return pushOnlyWhenItems;
    }

    public void setPushOnlyWhenItems(Boolean pushOnlyWhenItems) {
        this.pushOnlyWhenItems = pushOnlyWhenItems;
    }

    public String getOpenaiBaseUrl() {
        return openaiBaseUrl;
    }

    public void setOpenaiBaseUrl(String openaiBaseUrl) {
        this.openaiBaseUrl = openaiBaseUrl;
    }

    public String getOpenaiModel() {
        return openaiModel;
    }

    public void setOpenaiModel(String openaiModel) {
        this.openaiModel = openaiModel;
    }

    public String getFeishuWebhookUrl() {
        return feishuWebhookUrl;
    }

    public void setFeishuWebhookUrl(String feishuWebhookUrl) {
        this.feishuWebhookUrl = feishuWebhookUrl;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public String getWebhookHeadersJson() {
        return webhookHeadersJson;
    }

    public void setWebhookHeadersJson(String webhookHeadersJson) {
        this.webhookHeadersJson = webhookHeadersJson;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public String getSmtpUsername() {
        return smtpUsername;
    }

    public void setSmtpUsername(String smtpUsername) {
        this.smtpUsername = smtpUsername;
    }

    public String getSmtpFrom() {
        return smtpFrom;
    }

    public void setSmtpFrom(String smtpFrom) {
        this.smtpFrom = smtpFrom;
    }

    public String getSmtpTo() {
        return smtpTo;
    }

    public void setSmtpTo(String smtpTo) {
        this.smtpTo = smtpTo;
    }

    public Boolean getSmtpStarttls() {
        return smtpStarttls;
    }

    public void setSmtpStarttls(Boolean smtpStarttls) {
        this.smtpStarttls = smtpStarttls;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
