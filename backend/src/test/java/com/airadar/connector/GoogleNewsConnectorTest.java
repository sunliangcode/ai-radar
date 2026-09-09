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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleNewsConnectorTest {

    @Test
    void parsesAtomLikeFeed() {
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0">
                  <channel>
                    <title>Google News</title>
                    <item>
                      <title>AI model ships - TechDaily</title>
                      <link>https://news.example/ai</link>
                      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
                      <description>New open model released</description>
                    </item>
                  </channel>
                </rss>
                """;
        GoogleNewsConnector connector = new GoogleNewsConnector(RestClient.builder());
        Source source = new Source(1L, "gn", SourceType.GOOGLE_NEWS, Map.of("query", "AI"), true, null);
        List<RawItem> items = connector.parseFeed(xml, new FetchContext(Instant.EPOCH, 48, source), 10);
        assertEquals(1, items.size());
        assertTrue(items.getFirst().title().contains("AI model"));
        assertEquals(SourceType.GOOGLE_NEWS, items.getFirst().sourceType());
    }
}
