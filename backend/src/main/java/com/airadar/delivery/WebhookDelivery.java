package com.airadar.delivery;

import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WebhookDelivery implements DeliveryChannel {

    private static final Logger log = LoggerFactory.getLogger(WebhookDelivery.class);

    private final SettingsService settingsService;
    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    public WebhookDelivery(
            SettingsService settingsService,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper
    ) {
        this.settingsService = settingsService;
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Override
    public String channel() {
        return "webhook";
    }

    @Override
    public boolean isEnabled() {
        String url = settingsService.effective().webhookUrl();
        return url != null && !url.isBlank();
    }

    @Override
    public DeliveryResult deliver(BriefPayload payload) {
        long started = System.currentTimeMillis();
        if (!isEnabled()) {
            return DeliveryResult.skipped(channel(), "not_configured");
        }
        var s = settingsService.effective();
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("date", payload.date().toString());
            body.put("generatedAt", payload.generatedAt().toString());
            body.put("items", payload.items().stream()
                    .map(i -> Map.of(
                            "title", i.title() == null ? "" : i.title(),
                            "score", i.score(),
                            "summary", i.summary() == null ? "" : i.summary(),
                            "url", i.url() == null ? "" : i.url()
                    ))
                    .toList());

            RestClient.RequestBodySpec spec = restClientBuilder.build()
                    .post()
                    .uri(s.webhookUrl())
                    .contentType(MediaType.APPLICATION_JSON);

            Map<String, String> headers = parseHeaders(s.webhookHeadersJson());
            for (Map.Entry<String, String> e : headers.entrySet()) {
                spec = spec.header(e.getKey(), e.getValue());
            }

            spec.body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .toBodilessEntity();

            long ms = System.currentTimeMillis() - started;
            log.info("delivery channel=webhook success=true items={} durationMs={}", payload.items().size(), ms);
            return DeliveryResult.ok(channel(), payload.items().size(), ms);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - started;
            log.error("delivery channel=webhook success=false error={}", e.getMessage());
            return DeliveryResult.fail(channel(), payload.items().size(), ms, e.getMessage());
        }
    }

    Map<String, String> parseHeaders(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            log.warn("webhook_headers_invalid error={}", e.getMessage());
            return Map.of();
        }
    }
}
