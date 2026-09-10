package com.airadar.settings;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.AppSettingsEntity;
import com.airadar.persistence.AppSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Merges yml/env defaults with the single-row SQLite settings.
 * Secrets (API keys, SMTP password) stay env-only and are never echoed.
 */
@Service
public class SettingsService {

    private final RadarProperties properties;
    private final AppSettingsRepository repository;

    public SettingsService(RadarProperties properties, AppSettingsRepository repository) {
        this.properties = properties;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public EffectiveSettings effective() {
        AppSettingsEntity row = repository.findById(1L).orElse(null);
        return merge(row);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> toPublicDto() {
        EffectiveSettings s = effective();
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("interestProfile", s.interestProfile());
        dto.put("summaryLanguage", s.summaryLanguage());
        dto.put("scoreThreshold", s.scoreThreshold());
        dto.put("maxItems", s.maxItems());
        dto.put("lookbackHours", s.lookbackHours());
        dto.put("fetchIntervalMs", s.fetchIntervalMs());
        dto.put("pushCron", s.pushCron());
        dto.put("timezone", s.timezone());
        dto.put("uiBaseUrl", s.uiBaseUrl());
        dto.put("pushOnlyWhenItems", s.pushOnlyWhenItems());
        dto.put("openaiBaseUrl", s.openaiBaseUrl());
        dto.put("openaiModel", s.openaiModel());
        dto.put("openaiConfigured", hasApiKey(properties.getOpenai().getApiKey()));
        dto.put("githubTokenConfigured", notBlank(properties.getGithub().getToken()));
        dto.put("feishuWebhookUrl", s.feishuWebhookUrl());
        dto.put("feishuConfigured", notBlank(s.feishuWebhookUrl()));
        dto.put("webhookUrl", s.webhookUrl());
        dto.put("webhookConfigured", notBlank(s.webhookUrl()));
        dto.put("webhookHeaders", s.webhookHeadersJson());
        dto.put("smtpHost", s.smtpHost());
        dto.put("smtpPort", s.smtpPort());
        dto.put("smtpUsername", s.smtpUsername());
        dto.put("smtpFrom", s.smtpFrom());
        dto.put("smtpTo", s.smtpTo());
        dto.put("smtpStarttls", s.smtpStarttls());
        dto.put("smtpPasswordConfigured", notBlank(properties.getDelivery().getSmtp().getPassword()));
        dto.put("emailConfigured", notBlank(s.smtpHost()) && notBlank(s.smtpTo()));
        dto.put("localTokenConfigured", notBlank(properties.getLocalToken()));
        dto.put("sourceWeights", parseWeights(s.sourceWeightsJson()));
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
        if (body.containsKey("interestProfile")) {
            row.setInterestProfile(asString(body.get("interestProfile")));
        }
        if (body.containsKey("summaryLanguage")) {
            row.setSummaryLanguage(asString(body.get("summaryLanguage")));
        }
        if (body.containsKey("scoreThreshold")) {
            row.setScoreThreshold(asInt(body.get("scoreThreshold")));
        }
        if (body.containsKey("maxItems")) {
            row.setMaxItems(asInt(body.get("maxItems")));
        }
        if (body.containsKey("lookbackHours")) {
            row.setLookbackHours(asInt(body.get("lookbackHours")));
        }
        if (body.containsKey("fetchIntervalMs")) {
            row.setFetchIntervalMs(asLong(body.get("fetchIntervalMs")));
        }
        if (body.containsKey("pushCron")) {
            row.setPushCron(asString(body.get("pushCron")));
        }
        if (body.containsKey("timezone")) {
            row.setTimezone(asString(body.get("timezone")));
        }
        if (body.containsKey("uiBaseUrl")) {
            row.setUiBaseUrl(asString(body.get("uiBaseUrl")));
        }
        if (body.containsKey("pushOnlyWhenItems")) {
            row.setPushOnlyWhenItems(asBool(body.get("pushOnlyWhenItems")));
        }
        if (body.containsKey("openaiBaseUrl")) {
            row.setOpenaiBaseUrl(asString(body.get("openaiBaseUrl")));
        }
        if (body.containsKey("openaiModel")) {
            row.setOpenaiModel(asString(body.get("openaiModel")));
        }
        if (body.containsKey("feishuWebhookUrl")) {
            row.setFeishuWebhookUrl(asString(body.get("feishuWebhookUrl")));
        }
        if (body.containsKey("webhookUrl")) {
            row.setWebhookUrl(asString(body.get("webhookUrl")));
        }
        if (body.containsKey("webhookHeaders")) {
            Object h = body.get("webhookHeaders");
            row.setWebhookHeadersJson(h == null ? null : String.valueOf(h));
        }
        if (body.containsKey("smtpHost")) {
            row.setSmtpHost(asString(body.get("smtpHost")));
        }
        if (body.containsKey("smtpPort")) {
            row.setSmtpPort(asInt(body.get("smtpPort")));
        }
        if (body.containsKey("smtpUsername")) {
            row.setSmtpUsername(asString(body.get("smtpUsername")));
        }
        if (body.containsKey("smtpFrom")) {
            row.setSmtpFrom(asString(body.get("smtpFrom")));
        }
        if (body.containsKey("smtpTo")) {
            row.setSmtpTo(asString(body.get("smtpTo")));
        }
        if (body.containsKey("smtpStarttls")) {
            row.setSmtpStarttls(asBool(body.get("smtpStarttls")));
        }
        if (body.containsKey("sourceWeights")) {
            Object w = body.get("sourceWeights");
            if (w instanceof Map<?, ?> map) {
                Map<String, Object> clean = new LinkedHashMap<>();
                for (Map.Entry<?, ?> e : map.entrySet()) {
                    clean.put(String.valueOf(e.getKey()), asInt(e.getValue()));
                }
                try {
                    row.setSourceWeightsJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(clean));
                } catch (Exception ex) {
                    throw new IllegalArgumentException("invalid sourceWeights: " + ex.getMessage());
                }
            } else {
                row.setSourceWeightsJson(null);
            }
        }
        repository.save(row);
        applyLiveOverrides(effective());
        return toPublicDto();
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
        if (s.feishuWebhookUrl() != null) {
            properties.getDelivery().setFeishuWebhookUrl(s.feishuWebhookUrl());
        }
        if (s.webhookUrl() != null) {
            properties.getDelivery().setWebhookUrl(s.webhookUrl());
        }
        if (s.webhookHeadersJson() != null) {
            properties.getDelivery().setWebhookHeaders(s.webhookHeadersJson());
        }
        RadarProperties.Smtp smtp = properties.getDelivery().getSmtp();
        if (s.smtpHost() != null) {
            smtp.setHost(s.smtpHost());
        }
        if (s.smtpPort() != null) {
            smtp.setPort(s.smtpPort());
        }
        if (s.smtpUsername() != null) {
            smtp.setUsername(s.smtpUsername());
        }
        if (s.smtpFrom() != null) {
            smtp.setFrom(s.smtpFrom());
        }
        if (s.smtpTo() != null) {
            smtp.setTo(s.smtpTo());
        }
        if (s.smtpStarttls() != null) {
            smtp.setStarttls(s.smtpStarttls());
        }
    }

    private EffectiveSettings merge(AppSettingsEntity row) {
        RadarProperties.Delivery d = properties.getDelivery();
        RadarProperties.Smtp smtp = d.getSmtp();
        return new EffectiveSettings(
                first(row != null ? row.getInterestProfile() : null, properties.getInterestProfile()),
                first(row != null ? row.getSummaryLanguage() : null, properties.getSummaryLanguage()),
                firstInt(row != null ? row.getScoreThreshold() : null, properties.getScoreThreshold()),
                firstInt(row != null ? row.getMaxItems() : null, properties.getMaxItems()),
                firstInt(row != null ? row.getLookbackHours() : null, properties.getLookbackHours()),
                firstLong(row != null ? row.getFetchIntervalMs() : null, properties.getFetchIntervalMs()),
                first(row != null ? row.getPushCron() : null, properties.getPushCron()),
                first(row != null ? row.getTimezone() : null, properties.getTimezone()),
                first(row != null ? row.getUiBaseUrl() : null, properties.getUiBaseUrl()),
                firstBool(row != null ? row.getPushOnlyWhenItems() : null, properties.isPushOnlyWhenItems()),
                first(row != null ? row.getOpenaiBaseUrl() : null, properties.getOpenai().getBaseUrl()),
                first(row != null ? row.getOpenaiModel() : null, properties.getOpenai().getModel()),
                firstNonBlank(envOrDb(d.getFeishuWebhookUrl(), row != null ? row.getFeishuWebhookUrl() : null)),
                firstNonBlank(envOrDb(d.getWebhookUrl(), row != null ? row.getWebhookUrl() : null)),
                first(row != null ? row.getWebhookHeadersJson() : null, blankToNull(d.getWebhookHeaders())),
                firstNonBlank(envOrDb(smtp.getHost(), row != null ? row.getSmtpHost() : null)),
                firstInt(row != null ? row.getSmtpPort() : null, smtp.getPort()),
                first(row != null ? row.getSmtpUsername() : null, blankToNull(smtp.getUsername())),
                first(row != null ? row.getSmtpFrom() : null, blankToNull(smtp.getFrom())),
                firstNonBlank(envOrDb(smtp.getTo(), row != null ? row.getSmtpTo() : null)),
                firstBool(row != null ? row.getSmtpStarttls() : null, smtp.isStarttls()),
                row != null ? row.getSourceWeightsJson() : null
        );
    }

    private static String envOrDb(String env, String db) {
        if (notBlank(env)) {
            return env;
        }
        return db;
    }

    private static String first(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static String firstNonBlank(String a) {
        return notBlank(a) ? a : "";
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

    private static boolean hasApiKey(String key) {
        return notBlank(key) && !"sk-your-key-here".equals(key);
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static Integer asInt(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        return Integer.parseInt(String.valueOf(v));
    }

    private static Long asLong(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        return Long.parseLong(String.valueOf(v));
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
            String pushCron,
            String timezone,
            String uiBaseUrl,
            Boolean pushOnlyWhenItems,
            String openaiBaseUrl,
            String openaiModel,
            String feishuWebhookUrl,
            String webhookUrl,
            String webhookHeadersJson,
            String smtpHost,
            Integer smtpPort,
            String smtpUsername,
            String smtpFrom,
            String smtpTo,
            Boolean smtpStarttls,
            String sourceWeightsJson
    ) {
    }
}
