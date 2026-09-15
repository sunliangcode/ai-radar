package com.airadar.api;

import com.airadar.config.RadarProperties;
import com.airadar.provider.ai.AiHealthTracker;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final RadarProperties properties;
    private final AiHealthTracker aiHealth;
    private final ObjectMapper objectMapper;

    public HealthController(JdbcTemplate jdbcTemplate, RadarProperties properties, AiHealthTracker aiHealth,
                            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.aiHealth = aiHealth;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        String db = "up";
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception e) {
            body.put("status", "degraded");
            body.put("db", "down");
            body.put("error", e.getMessage());
            body.put("translate", translateStatus());
            body.put("llm", llmStatus());
            return body;
        }
        body.put("status", "ok");
        body.put("db", db);
        body.put("translate", translateStatus());
        body.put("llm", llmStatus());
        return body;
    }

    /**
     * Report whether scoring/summaries are running on the live model or on heuristics, so the UI
     * can explain a silent fallback instead of leaving the user to guess.
     */
    private Map<String, Object> llmStatus() {
        RadarProperties.OpenAi cfg = properties.getOpenai();
        boolean ready = cfg.isLlmReady();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ready", ready);
        out.put("mode", !ready ? "heuristic" : (aiHealth.isHealthy() ? "ai" : "degraded"));
        out.put("model", cfg.getModel());
        out.put("baseUrl", cfg.getBaseUrl());
        out.put("local", cfg.isLocalEndpoint());
        out.put("hasApiKey", cfg.hasApiKey());
        out.putAll(aiHealth.toMap());
        return out;
    }

    /**
     * Live "Test connection" probe for the configured LLM.
     *
     * <p>{@code /api/health} only reports configuration, because polling a model every 30s would be
     * wasteful. This endpoint actually calls {@code GET {baseUrl}/models} on demand, which is what
     * catches the common failures: Ollama not running, a bad port, or the configured model never
     * having been pulled. A failed probe is recorded so the health card stops claiming "live".
     */
    @GetMapping("/health/llm")
    public Map<String, Object> llmProbe() {
        RadarProperties.OpenAi cfg = properties.getOpenai();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("model", cfg.getModel());
        out.put("baseUrl", cfg.getBaseUrl());
        if (!cfg.isLlmReady()) {
            out.put("ok", false);
            out.put("error", "LLM is not configured: set a local base URL or an API key, plus a model.");
            return out;
        }
        long start = System.currentTimeMillis();
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(2000);
            factory.setReadTimeout(4000);
            RestClient client = RestClient.builder()
                    .baseUrl(trimTrailingSlash(cfg.getBaseUrl(), "http://localhost:11434/v1"))
                    .requestFactory(factory)
                    .build();
            var request = client.get().uri("/models");
            if (cfg.hasApiKey()) {
                request = request.header("Authorization", "Bearer " + cfg.getApiKey());
            }
            String body = request.retrieve().body(String.class);
            aiHealth.recordSuccess(); // clears any failure cooldown so AI resumes immediately
            out.put("ok", true);
            out.put("latencyMs", System.currentTimeMillis() - start);
            List<String> models = modelIds(body);
            out.put("models", models);
            out.put("modelPresent", models.isEmpty() || models.contains(cfg.getModel()));
            if (!models.isEmpty() && !models.contains(cfg.getModel())) {
                out.put("hint", "The configured model is not in the endpoint's model list — pull it or pick one that exists.");
            }
            return out;
        } catch (Exception e) {
            String reason = com.airadar.support.Failures.describe(e);
            out.put("ok", false);
            out.put("latencyMs", System.currentTimeMillis() - start);
            out.put("error", reason);
            aiHealth.recordFailure("probe", reason);
            return out;
        }
    }

    /** Best-effort extraction of model ids from an OpenAI-compatible {@code /models} response. */
    private List<String> modelIds(String body) {
        List<String> ids = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return ids;
        }
        try {
            JsonNode data = objectMapper.readTree(body).path("data");
            if (data.isArray()) {
                for (JsonNode node : data) {
                    String id = node.path("id").asText("");
                    if (!id.isBlank()) {
                        ids.add(id);
                    }
                }
            }
        } catch (Exception ignored) {
            // Non-JSON or unexpected shape: connectivity is still proven, which is the main signal.
        }
        return ids;
    }

    /** Lightweight sidecar probe so install/status scripts and UI can explain title fallback. */
    private Map<String, Object> translateStatus() {
        Map<String, Object> out = new LinkedHashMap<>();
        RadarProperties.Translate cfg = properties.getTranslate();
        out.put("enabled", cfg.isEnabled());
        out.put("baseUrl", cfg.getBaseUrl());
        if (!cfg.isEnabled()) {
            out.put("status", "disabled");
            return out;
        }
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(400);
            factory.setReadTimeout(800);
            RestClient client = RestClient.builder()
                    .baseUrl(trimTrailingSlash(cfg.getBaseUrl(), "http://127.0.0.1:8765"))
                    .requestFactory(factory)
                    .build();
            client.get().uri("/health").retrieve().toBodilessEntity();
            out.put("status", "up");
        } catch (Exception e) {
            out.put("status", "down");
            out.put("error", e.getMessage());
        }
        return out;
    }

    private static String trimTrailingSlash(String url, String fallback) {
        if (url == null || url.isBlank()) {
            return fallback;
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
