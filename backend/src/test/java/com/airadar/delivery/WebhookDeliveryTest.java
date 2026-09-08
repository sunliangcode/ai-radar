package com.airadar.delivery;

import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebhookDeliveryTest {

    private MockWebServer server;
    private SettingsService settingsService;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
        settingsService = mock(SettingsService.class);
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    @Test
    void deliverPostsJsonPayload() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(200));
        when(settingsService.effective()).thenReturn(new SettingsService.EffectiveSettings(
                "ai", "zh", 60, 30, 48, 7200000L, "0 0 8 * * *", "Asia/Shanghai",
                "http://localhost:8080", true, "https://api.openai.com/v1", "gpt-4o-mini",
                "", server.url("/hook").toString(), "{\"X-Token\":\"abc\"}",
                "", 587, "", "", "", true
        ));

        WebhookDelivery delivery = new WebhookDelivery(settingsService, RestClient.builder(), new ObjectMapper());
        DeliveryResult result = delivery.deliver(new BriefPayload(
                LocalDate.of(2026, 9, 8),
                Instant.parse("2026-09-08T01:00:00Z"),
                List.of(new BriefPayload.BriefItem("Hello", 90, "sum", "https://ex.com")),
                null
        ));

        assertTrue(result.success());
        RecordedRequest req = server.takeRequest(2, TimeUnit.SECONDS);
        assertEquals("POST", req.getMethod());
        assertEquals("abc", req.getHeader("X-Token"));
        String body = req.getBody().readUtf8();
        assertTrue(body.contains("\"date\":\"2026-09-08\""));
        assertTrue(body.contains("Hello"));
    }
}
