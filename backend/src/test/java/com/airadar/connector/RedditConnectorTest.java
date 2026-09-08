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

class RedditConnectorTest {

    @Test
    void parsesListingFixture() {
        String fixture = """
                {
                  "data": {
                    "children": [
                      {
                        "data": {
                          "title": "New open model release",
                          "url": "https://example.com/model",
                          "permalink": "/r/LocalLLaMA/comments/abc/new/",
                          "created_utc": 1700000000,
                          "score": 88,
                          "num_comments": 12,
                          "selftext": "Details here"
                        }
                      }
                    ]
                  }
                }
                """;
        RedditConnector connector = new RedditConnector(
                RestClient.builder(), new ObjectMapper(), Executors.newSingleThreadExecutor());
        Source source = new Source(3L, "reddit", SourceType.REDDIT, Map.of(), true, null);
        FetchContext ctx = new FetchContext(Instant.EPOCH, 48, source);
        List<RawItem> items = connector.parseListing(fixture, ctx, "LocalLLaMA");
        assertEquals(1, items.size());
        assertEquals("New open model release", items.getFirst().title());
        assertEquals(88, items.getFirst().rawMeta().get("score"));
    }
}
