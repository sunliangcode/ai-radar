package com.airadar.delivery;

import com.airadar.config.RadarProperties;
import com.airadar.settings.SettingsService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class EmailDeliveryTest {

    @Test
    void buildsHtmlAndPlainWithoutSending() {
        SettingsService settings = mock(SettingsService.class);
        EmailDelivery delivery = new EmailDelivery(settings, new RadarProperties());
        BriefPayload payload = new BriefPayload(
                LocalDate.of(2026, 9, 8),
                Instant.now(),
                List.of(new BriefPayload.BriefItem("模型发布", 91, "要点", "https://example.com")),
                "http://localhost:8080"
        );
        String html = delivery.buildHtml(payload);
        String plain = delivery.buildPlain(payload);
        assertTrue(html.contains("AI Radar"));
        assertTrue(html.contains("模型发布"));
        assertTrue(plain.contains("https://example.com"));
        assertTrue(html.contains("&") || !html.contains("<script>"));
    }
}
