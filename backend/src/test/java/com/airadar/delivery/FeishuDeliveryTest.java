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

class FeishuDeliveryTest {

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
    void deliverPostsInteractiveCardViaWebhook() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"StatusCode\":0}"));
        when(settingsService.effective()).thenReturn(settings(server.url("/hook").toString(), null, null, null));

        FeishuOpenApiClient openApi = new FeishuOpenApiClient(
                RestClient.builder(), new ObjectMapper(), server.url("/").toString().replaceAll("/$", ""));
        FeishuDelivery delivery = new FeishuDelivery(
                settingsService, RestClient.builder(), new ObjectMapper(), openApi);
        BriefPayload payload = new BriefPayload(
                LocalDate.of(2026, 9, 8),
                Instant.parse("2026-09-08T01:00:00Z"),
                List.of(new BriefPayload.BriefItem("Title", 88, "摘要", "https://example.com/a")),
                "http://localhost:8080"
        );

        DeliveryResult result = delivery.deliver(payload);
        assertTrue(result.success());
        RecordedRequest req = server.takeRequest(2, TimeUnit.SECONDS);
        assertEquals("POST", req.getMethod());
        assertTrue(req.getBody().readUtf8().contains("AI Radar"));
    }

    @Test
    void deliverUsesImWhenBound() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(200)
                .setBody("{\"code\":0,\"tenant_access_token\":\"t-test\",\"expire\":7200}"));
        server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"code\":0,\"data\":{}}"));
        when(settingsService.effective()).thenReturn(settings("", "cli_x", "sec_x", "ou_x"));

        String base = server.url("/").toString().replaceAll("/$", "");
        FeishuOpenApiClient openApi = new FeishuOpenApiClient(RestClient.builder(), new ObjectMapper(), base);
        FeishuDelivery delivery = new FeishuDelivery(
                settingsService, RestClient.builder(), new ObjectMapper(), openApi);

        DeliveryResult result = delivery.deliver(new BriefPayload(
                LocalDate.of(2026, 9, 8),
                Instant.parse("2026-09-08T01:00:00Z"),
                List.of(new BriefPayload.BriefItem("Title", 88, "摘要", "https://example.com/a")),
                "http://localhost:8080"
        ));
        assertTrue(result.success());
        RecordedRequest tokenReq = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(tokenReq.getPath().contains("tenant_access_token"));
        RecordedRequest imReq = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(imReq.getPath().contains("/open-apis/im/v1/messages"));
        assertTrue(imReq.getBody().readUtf8().contains("ou_x"));
    }

    @Test
    void buildMarkdownTruncates() {
        when(settingsService.effective()).thenReturn(settings("http://x", null, null, null));
        FeishuOpenApiClient openApi = mock(FeishuOpenApiClient.class);
        FeishuDelivery delivery = new FeishuDelivery(
                settingsService, RestClient.builder(), new ObjectMapper(), openApi);
        List<BriefPayload.BriefItem> items = new java.util.ArrayList<>();
        for (int i = 0; i < 50; i++) {
            items.add(new BriefPayload.BriefItem("T".repeat(40) + i, 70, "S".repeat(80), "https://e.com/" + i));
        }
        String md = delivery.buildMarkdown(new BriefPayload(LocalDate.now(), Instant.now(), items, "http://ui"));
        assertTrue(md.length() <= 4000);
        assertTrue(md.contains("查看更多") || md.contains("打开 AI Radar"));
    }

    private static SettingsService.EffectiveSettings settings(
            String feishuWebhook, String appId, String secret, String openId
    ) {
        return new SettingsService.EffectiveSettings(
                "ai", "zh", 60, 30, 48, 7200000L, 60000, "0 0 8 * * *", "Asia/Shanghai",
                "http://localhost:8080", true,
                "http://localhost:11434/v1", "qwen3.5:2b-mlx", 8192, 1024, 1,
                feishuWebhook, "", null, "", 587, "", "", "", true,
                appId, secret, openId, null, null
        );
    }
}
