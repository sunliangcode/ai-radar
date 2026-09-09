package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GdeltConnectorTest {

    @Test
    void parsesArticles() {
        String json = """
                {
                  "articles": [
                    {
                      "url": "https://example.com/ai",
                      "title": "LLM breakthrough",
                      "seendate": "20240101T120000Z",
                      "domain": "example.com",
                      "sourcecountry": "US",
                      "language": "English"
                    }
                  ]
                }
                """;
        GdeltConnector connector = new GdeltConnector(RestClient.builder(), new ObjectMapper());
        Source source = new Source(2L, "gdelt", SourceType.GDELT, Map.of("query", "AI"), true, null);
        List<RawItem> items = connector.parseArticles(json, new FetchContext(Instant.EPOCH, 48, source));
        assertEquals(1, items.size());
        assertEquals("LLM breakthrough", items.getFirst().title());
        assertNotNull(GdeltConnector.parseSeenDate("20240101T120000Z"));
    }
}
