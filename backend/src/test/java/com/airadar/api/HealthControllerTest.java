package com.airadar.api;

import com.airadar.config.RadarProperties;
import com.airadar.provider.ai.AiHealthTracker;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthControllerTest {

    private JdbcTemplate jdbc;
    private RadarProperties properties;
    private HealthController controller;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        properties = new RadarProperties();
        properties.getApi().setVersion("0.1.0");
        properties.getTranslate().setEnabled(false);
        controller = new HealthController(jdbc, properties, new AiHealthTracker(), new ObjectMapper());
    }

    @Test
    void healthIncludesVersionWhenDbUp() {
        properties.getOpenai().setModel(""); // not ready → heuristic without network
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        Map<String, Object> body = controller.health();
        assertEquals("0.1.0", body.get("version"));
        assertEquals("ok", body.get("status"));
        assertEquals("up", body.get("db"));
        @SuppressWarnings("unchecked")
        Map<String, Object> translate = (Map<String, Object>) body.get("translate");
        assertEquals("disabled", translate.get("status"));
        assertEquals(Boolean.FALSE, translate.get("enabled"));
        @SuppressWarnings("unchecked")
        Map<String, Object> llm = (Map<String, Object>) body.get("llm");
        assertEquals(Boolean.FALSE, llm.get("ready"));
        assertEquals("heuristic", llm.get("mode"));
    }

    @Test
    void healthIncludesVersionWhenDbDown() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenThrow(new RuntimeException("db gone"));
        Map<String, Object> body = controller.health();
        assertEquals("0.1.0", body.get("version"));
        assertEquals("degraded", body.get("status"));
        assertEquals("down", body.get("db"));
    }

    @Test
    void llmProbeReportsNotConfiguredWithoutNetwork() {
        properties.getOpenai().setModel("");
        Map<String, Object> body = controller.llmProbe();
        assertEquals(Boolean.FALSE, body.get("ok"));
        assertFalse(String.valueOf(body.get("error")).isBlank());
        assertEquals(true, String.valueOf(body.get("error")).toLowerCase().contains("not configured"));
    }

    @Test
    void modelIdsParsesOpenAiCompatiblePayload() {
        List<String> ids = controller.modelIds("{\"data\":[{\"id\":\"qwen\"},{\"id\":\"llama\"},{\"id\":\"\"}]}");
        assertEquals(List.of("qwen", "llama"), ids);
        assertEquals(List.of("mistral"), controller.modelIds("[{\"id\":\"mistral\"}]"));
        assertTrue(controller.modelIds("not-json").isEmpty());
        assertTrue(controller.modelIds(null).isEmpty());
    }

    @Test
    void putModelPresenceSkipsCheckWhenListEmpty() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        HealthController.putModelPresence(out, List.of(), "qwen");
        assertEquals(Boolean.TRUE, out.get("modelPresent"));
        assertFalse(out.containsKey("hint"));
    }

    @Test
    void putModelPresenceHintsWhenConfiguredMissing() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        HealthController.putModelPresence(out, List.of("llama", "mistral"), "qwen");
        assertEquals(Boolean.FALSE, out.get("modelPresent"));
        assertTrue(String.valueOf(out.get("hint")).toLowerCase().contains("not in the endpoint"));
    }

    @Test
    void putModelPresenceOkWhenConfiguredPresent() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        HealthController.putModelPresence(out, List.of("qwen", "llama"), "qwen");
        assertEquals(Boolean.TRUE, out.get("modelPresent"));
        assertFalse(out.containsKey("hint"));
    }

    @Test
    void putModelPresenceTrimsConfiguredModel() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        HealthController.putModelPresence(out, List.of("qwen", "llama"), "  qwen  ");
        assertEquals(Boolean.TRUE, out.get("modelPresent"));
        assertFalse(out.containsKey("hint"));
    }

    @Test
    void putModelPresenceSkipsWhenConfiguredBlank() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        HealthController.putModelPresence(out, List.of("qwen"), "  ");
        assertEquals(Boolean.TRUE, out.get("modelPresent"));
        assertFalse(out.containsKey("hint"));
    }

    @Test
    void trimTrailingSlashUsesFallbackAndStripsSlash() {
        assertEquals("http://x", HealthController.trimTrailingSlash("http://x/", "fb"));
        assertEquals("http://x", HealthController.trimTrailingSlash("http://x", "fb"));
        assertEquals("fb", HealthController.trimTrailingSlash(null, "fb"));
        assertEquals("fb", HealthController.trimTrailingSlash("  ", "fb"));
    }
}
