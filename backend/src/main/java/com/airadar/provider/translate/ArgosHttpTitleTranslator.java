package com.airadar.provider.translate;

import com.airadar.config.RadarProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Calls the local Argos Translate HTTP sidecar ({@code translate-service/}).
 */
@Component
public class ArgosHttpTitleTranslator implements TitleTranslator {

    private static final Logger log = LoggerFactory.getLogger(ArgosHttpTitleTranslator.class);

    private final RadarProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public ArgosHttpTitleTranslator(RadarProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        RadarProperties.Translate cfg = properties.getTranslate();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.max(500, cfg.getConnectTimeoutMs()));
        factory.setReadTimeout(Math.max(1_000, cfg.getReadTimeoutMs()));
        this.restClient = RestClient.builder()
                .baseUrl(trimTrailingSlash(cfg.getBaseUrl()))
                .requestFactory(factory)
                .build();
    }

    @Override
    public String translate(String text, String fromLang, String toLang) {
        if (text == null || text.isBlank()) {
            return null;
        }
        RadarProperties.Translate cfg = properties.getTranslate();
        if (!cfg.isEnabled()) {
            return null;
        }
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("q", text);
            body.put("from", fromLang == null || fromLang.isBlank() ? cfg.getFrom() : fromLang);
            body.put("to", toLang == null || toLang.isBlank() ? cfg.getTo() : toLang);

            String raw = restClient.post()
                    .uri("/translate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString())
                    .retrieve()
                    .body(String.class);

            if (raw == null || raw.isBlank()) {
                return null;
            }
            JsonNode node = objectMapper.readTree(raw);
            String translated = node.path("translatedText").asText("").trim();
            return translated.isBlank() ? null : translated;
        } catch (Exception e) {
            log.warn("argos_translate_failed textLen={} error={}", text.length(), e.getMessage());
            return null;
        }
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://127.0.0.1:8765";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
