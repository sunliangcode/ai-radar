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
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HackerNewsConnectorTest {

    @Test
    void parsesAlgoliaFixture() throws Exception {
        String fixture = """
                {
                  "hits": [
                    {
                      "title": "Show HN: Tiny LLM",
                      "url": "https://example.com/llm?utm_source=hn",
                      "objectID": "1",
                      "created_at_i": 1700000000,
                      "points": 120,
                      "num_comments": 40,
                      "author": "alice",
                      "story_text": ""
                    }
                  ]
                }
                """;
        HackerNewsConnector connector = new HackerNewsConnector(
                RestClient.builder(), new ObjectMapper(), Executors.newSingleThreadExecutor());
        Source source = new Source(1L, "hn", SourceType.HACKER_NEWS, Map.of(), true, null);
        FetchContext ctx = new FetchContext(Instant.EPOCH, 48, source);
        List<RawItem> items = connector.parseHits(fixture, ctx);
        assertEquals(1, items.size());
        assertEquals("Show HN: Tiny LLM", items.getFirst().title());
        assertEquals(120, items.getFirst().rawMeta().get("points"));
        assertTrue(items.getFirst().url().contains("example.com"));
    }
}
