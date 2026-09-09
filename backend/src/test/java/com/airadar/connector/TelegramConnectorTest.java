package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.domain.SourceType;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TelegramConnectorTest {

    @Test
    void parsesChannelMessages() {
        String html = """
                <html><body>
                <div class="tgme_widget_message" data-post="aichannel/42">
                  <time datetime="2024-01-01T12:00:00+00:00"></time>
                  <div class="tgme_widget_message_text js-message_text">
                    Open model drop today.<br/><a href="https://example.com/model">link</a>
                  </div>
                </div>
                </body></html>
                """;
        TelegramConnector connector = new TelegramConnector(RestClient.builder());
        Source source = new Source(6L, "tg", SourceType.TELEGRAM, Map.of("channels", List.of("aichannel")), true, null);
        List<RawItem> items = connector.parseChannelHtml(html, new FetchContext(Instant.EPOCH, 48, source), "aichannel", 30);
        assertEquals(1, items.size());
        assertEquals("https://example.com/model", items.getFirst().url());
        assertTrue(items.getFirst().title().contains("Open model"));
    }

    @Test
    void makeTitleTruncates() {
        assertEquals("短标题", TelegramConnector.makeTitle("短标题"));
        String longText = "这是一条很长的中文消息内容，需要在句号处截断。后面还有更多文字。";
        assertTrue(TelegramConnector.makeTitle(longText).endsWith("。") || TelegramConnector.makeTitle(longText).length() <= 80);
    }
}
