package com.airadar.settings;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.AppSettingsEntity;
import com.airadar.persistence.AppSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Merges yml/env defaults with the single-row SQLite settings.
 * Secrets (API keys, SMTP password, Feishu app secret) stay server-side and are never echoed.
 * Customer-facing PUT only accepts a small whitelist; ops knobs live in .env / application.yml.
 */
@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);

    /** Fields the product UI may write. Everything else is ignored (ops → env). */
    private static final Set<String> CUSTOMER_PUT_KEYS = Set.of(
            "interestProfile",
            "summaryLanguage",
            "pushCron",
            "timezone",
            "pushOnlyWhenItems",
            "smtpTo"
    );

    private final RadarProperties properties;
    private final AppSettingsRepository repository;
    private final ApplicationEventPublisher events;

    public SettingsService(
            RadarProperties properties,
            AppSettingsRepository repository,
            ApplicationEventPublisher events
    ) {
        this.properties = properties;
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public EffectiveSettings effective() {
        AppSettingsEntity row = repository.findById(1L).orElse(null);
        return merge(row);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> toPublicDto() {
        EffectiveSettings s = effective();
        boolean emailTransportReady = notBlank(s.smtpHost());
        boolean feishuBound = notBlank(s.feishuAppId()) && notBlank(s.feishuOpenId());
        boolean feishuWebhook = notBlank(s.feishuWebhookUrl());

        Map<String, Object> dto = new LinkedHashMap<>();
        // Customer-facing
        dto.put("interestProfile", s.interestProfile());
        dto.put("summaryLanguage", s.summaryLanguage());
        dto.put("pushCron", s.pushCron());
        dto.put("timezone", s.timezone());
        dto.put("pushOnlyWhenItems", s.pushOnlyWhenItems());
        dto.put("smtpTo", s.smtpTo());
        dto.put("emailTransportReady", emailTransportReady);
        dto.put("emailConfigured", emailTransportReady && notBlank(s.smtpTo()));
        dto.put("feishuBound", feishuBound);
        dto.put("feishuBindAvailable", true);
        dto.put("feishuConfigured", feishuBound || feishuWebhook);

        // Read-only status used by hub / health surfaces
        dto.put("openaiConfigured", properties.getOpenai().isLlmReady());
        dto.put("openaiApiKeyConfigured", properties.getOpenai().hasApiKey());
        dto.put("openaiBaseUrl", s.openaiBaseUrl());
        dto.put("openaiModel", s.openaiModel());
        dto.put("localTokenConfigured", notBlank(properties.getLocalToken()));

        // Still useful for schedule display / non-settings callers; not editable in customer UI
        dto.put("uiBaseUrl", s.uiBaseUrl());
        dto.put("fetchIntervalMs", s.fetchIntervalMs());
        dto.put("scoreThreshold", s.scoreThreshold());
        dto.put("maxItems", s.maxItems());
        dto.put("lookbackHours", s.lookbackHours());
        dto.put("fetchTimeoutMs", s.fetchTimeoutMs());
        dto.put("contextWindowTokens", s.contextWindowTokens());
        dto.put("maxCompletionTokens", s.maxCompletionTokens());
        dto.put("aiParallelism", 1);
        dto.put("retentionDays", s.retentionDays() != null ? s.retentionDays() : 0);
        dto.put("sourceWeights", parseWeights(s.sourceWeightsJson()));
        dto.put("webhookConfigured", notBlank(s.webhookUrl()));
        dto.put("smtpPasswordConfigured", notBlank(properties.getDelivery().getSmtp().getPassword()));
        return dto;
    }

    /** Public, mutable map of sourceType -> weight boost. Never null. */
    @Transactional(readOnly = true)
    public Map<String, Integer> effectiveSourceWeights() {
        return parseWeights(effective().sourceWeightsJson());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Integer> parseWeights(String json) {
        Map<String, Integer> out = new LinkedHashMap<>();
        if (json == null || json.isBlank()) {
            return out;
        }
        try {
            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            var fields = node.fields();
            while (fields.hasNext()) {
                var e = fields.next();
                out.put(e.getKey(), e.getValue().asInt(0));
            }
        } catch (Exception ignored) {
            /* malformed JSON -> empty overrides */
        }
        return out;
    }

    @Transactional
    public Map<String, Object> update(Map<String, Object> body) {
        AppSettingsEntity row = repository.findById(1L).orElseGet(() -> {
            AppSettingsEntity e = new AppSettingsEntity();
            e.setId(1L);
            return e;
        });

        for (String key : body.keySet()) {
            if (!CUSTOMER_PUT_KEYS.contains(key)) {
                log.debug("Ignoring non-customer settings key from PUT: {}", key);
            }
        }

        if (body.containsKey("interestProfile")) {
            row.setInterestProfile(asString(body.get("interestProfile")));
        }
        if (body.containsKey("summaryLanguage")) {
            row.setSummaryLanguage(asString(body.get("summaryLanguage")));
        }
        if (body.containsKey("pushCron")) {
            row.setPushCron(asString(body.get("pushCron")));
        }
        if (body.containsKey("timezone")) {
            row.setTimezone(asString(body.get("timezone")));
        }
        if (body.containsKey("pushOnlyWhenItems")) {
            row.setPushOnlyWhenItems(asBool(body.get("pushOnlyWhenItems")));
        }
        if (body.containsKey("smtpTo")) {
            row.setSmtpTo(asString(body.get("smtpTo")));
        }

        repository.save(row);
        applyLiveOverrides(effective());
        events.publishEvent(new SettingsUpdatedEvent(this));
        return toPublicDto();
    }

    @Transactional
    public void saveFeishuBind(String appId, String appSecret, String openId) {
        AppSettingsEntity row = repository.findById(1L).orElseGet(() -> {
            AppSettingsEntity e = new AppSettingsEntity();
            e.setId(1L);
            return e;
        });
        row.setFeishuAppId(appId);
        row.setFeishuAppSecret(appSecret);
        row.setFeishuOpenId(openId);
        repository.save(row);
        events.publishEvent(new SettingsUpdatedEvent(this));
    }

    @Transactional
    public void clearFeishuBind() {
        AppSettingsEntity row = repository.findById(1L).orElse(null);
        if (row == null) {
            return;
        }
        row.setFeishuAppId(null);
        row.setFeishuAppSecret(null);
        row.setFeishuOpenId(null);
        repository.save(row);
        events.publishEvent(new SettingsUpdatedEvent(this));
    }

    /** Apply DB overrides onto RadarProperties for in-process consumers. */
    public void applyLiveOverrides(EffectiveSettings s) {
        if (s.interestProfile() != null) {
            properties.setInterestProfile(s.interestProfile());
        }
        if (s.summaryLanguage() != null) {
            properties.setSummaryLanguage(s.summaryLanguage());
        }
        if (s.scoreThreshold() != null) {
            properties.setScoreThreshold(s.scoreThreshold());
        }
        if (s.maxItems() != null) {
            properties.setMaxItems(s.maxItems());
        }
        if (s.lookbackHours() != null) {
            properties.setLookbackHours(s.lookbackHours());
        }
        if (s.fetchIntervalMs() != null) {
            properties.setFetchIntervalMs(s.fetchIntervalMs());
        }
        if (s.fetchTimeoutMs() != null) {
            properties.setFetchTimeoutMs(s.fetchTimeoutMs());
        }
        if (s.pushCron() != null) {
            properties.setPushCron(s.pushCron());
        }
        if (s.timezone() != null) {
            properties.setTimezone(s.timezone());
        }
        if (s.uiBaseUrl() != null) {
            properties.setUiBaseUrl(s.uiBaseUrl());
        }
        if (s.pushOnlyWhenItems() != null) {
            properties.setPushOnlyWhenItems(s.pushOnlyWhenItems());
        }
        if (s.openaiBaseUrl() != null) {
            properties.getOpenai().setBaseUrl(s.openaiBaseUrl());
        }
        if (s.openaiModel() != null) {
            properties.getOpenai().setModel(s.openaiModel());
        }
        if (s.contextWindowTokens() != null) {
            properties.getOpenai().setContextWindowTokens(s.contextWindowTokens());
        }
        if (s.maxCompletionTokens() != null) {
            properties.getOpenai().setMaxCompletionTokens(s.maxCompletionTokens());
        }
        properties.setAiParallelism(1);
        // Webhook URLs: env-backed effective value
        if (s.feishuWebhookUrl() != null) {
            properties.getDelivery().setFeishuWebhookUrl(s.feishuWebhookUrl());
        }
        if (s.webhookUrl() != null) {
            properties.getDelivery().setWebhookUrl(s.webhookUrl());
        }
        if (s.webhookHeadersJson() != null) {
            properties.getDelivery().setWebhookHeaders(s.webhookHeadersJson());
        }
        // SMTP transport stays env-only; only recipient follows customer settings
        RadarProperties.Smtp smtp = properties.getDelivery().getSmtp();
        if (s.smtpTo() != null) {
            smtp.setTo(s.smtpTo());
        }
    }

    private EffectiveSettings merge(AppSettingsEntity row) {
        RadarProperties.Delivery d = properties.getDelivery();
        RadarProperties.Smtp smtp = d.getSmtp();
        // Transport: always env. Recipient: DB wins so the customer field sticks.
        String smtpTo = firstNonBlank(dbOrEnv(
                row != null ? row.getSmtpTo() : null,
                smtp.getTo()
        ));
        return new EffectiveSettings(
                first(row != null ? row.getInterestProfile() : null, properties.getInterestProfile()),
                first(row != null ? row.getSummaryLanguage() : null, properties.getSummaryLanguage()),
                firstInt(row != null ? row.getScoreThreshold() : null, properties.getScoreThreshold()),
                firstInt(row != null ? row.getMaxItems() : null, properties.getMaxItems()),
                firstInt(row != null ? row.getLookbackHours() : null, properties.getLookbackHours()),
                firstLong(row != null ? row.getFetchIntervalMs() : null, properties.getFetchIntervalMs()),
                firstInt(row != null ? row.getFetchTimeoutMs() : null, properties.getFetchTimeoutMs()),
                first(row != null ? row.getPushCron() : null, properties.getPushCron()),
                first(row != null ? row.getTimezone() : null, properties.getTimezone()),
                first(row != null ? row.getUiBaseUrl() : null, properties.getUiBaseUrl()),
                firstBool(row != null ? row.getPushOnlyWhenItems() : null, properties.isPushOnlyWhenItems()),
                first(row != null ? row.getOpenaiBaseUrl() : null, properties.getOpenai().getBaseUrl()),
                first(row != null ? row.getOpenaiModel() : null, properties.getOpenai().getModel()),
                firstInt(row != null ? row.getContextWindowTokens() : null, properties.getOpenai().getContextWindowTokens()),
                firstInt(row != null ? row.getMaxCompletionTokens() : null, properties.getOpenai().getMaxCompletionTokens()),
                1,
                firstNonBlank(envOrDb(d.getFeishuWebhookUrl(), row != null ? row.getFeishuWebhookUrl() : null)),
                firstNonBlank(envOrDb(d.getWebhookUrl(), row != null ? row.getWebhookUrl() : null)),
                first(row != null ? row.getWebhookHeadersJson() : null, blankToNull(d.getWebhookHeaders())),
                blankToEmpty(smtp.getHost()),
                smtp.getPort(),
                blankToNull(smtp.getUsername()),
                blankToNull(smtp.getFrom()),
                smtpTo,
                smtp.isStarttls(),
                row != null ? blankToNull(row.getFeishuAppId()) : null,
                row != null ? blankToNull(row.getFeishuAppSecret()) : null,
                row != null ? blankToNull(row.getFeishuOpenId()) : null,
                row != null ? row.getSourceWeightsJson() : null,
                row != null ? row.getRetentionDays() : null
        );
    }

    private static String envOrDb(String env, String db) {
        if (notBlank(env)) {
            return env;
        }
        return db;
    }

    /** DB wins (customer smtpTo). */
    private static String dbOrEnv(String db, String env) {
        if (notBlank(db)) {
            return db;
        }
        return env;
    }

    private static String first(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static String firstNonBlank(String a) {
        return notBlank(a) ? a : "";
    }

    private static String blankToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static Integer firstInt(Integer a, int b) {
        return a != null ? a : b;
    }

    private static Long firstLong(Long a, long b) {
        return a != null ? a : b;
    }

    private static Boolean firstBool(Boolean a, boolean b) {
        return a != null ? a : b;
    }

    private static String blankToNull(String s) {
        return notBlank(s) ? s : null;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static Boolean asBool(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(v));
    }

    public record EffectiveSettings(
            String interestProfile,
            String summaryLanguage,
            Integer scoreThreshold,
            Integer maxItems,
            Integer lookbackHours,
            Long fetchIntervalMs,
            Integer fetchTimeoutMs,
            String pushCron,
            String timezone,
            String uiBaseUrl,
            Boolean pushOnlyWhenItems,
            String openaiBaseUrl,
            String openaiModel,
            Integer contextWindowTokens,
            Integer maxCompletionTokens,
            Integer aiParallelism,
            String feishuWebhookUrl,
            String webhookUrl,
            String webhookHeadersJson,
            String smtpHost,
            Integer smtpPort,
            String smtpUsername,
            String smtpFrom,
            String smtpTo,
            Boolean smtpStarttls,
            String feishuAppId,
            String feishuAppSecret,
            String feishuOpenId,
            String sourceWeightsJson,
            Integer retentionDays
    ) {
        public boolean feishuImBound() {
            return notBlank(feishuAppId) && notBlank(feishuAppSecret) && notBlank(feishuOpenId);
        }
    }
}
