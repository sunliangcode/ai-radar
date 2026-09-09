package com.airadar.connector;

import com.airadar.config.RadarProperties;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductHuntConnectorTest {

    @Test
    void skipsWithoutToken() {
        RadarProperties props = new RadarProperties();
        ProductHuntConnector connector = new ProductHuntConnector(RestClient.builder(), new ObjectMapper(), props);
        Source source = new Source(1L, "ph", SourceType.PRODUCT_HUNT, Map.of(), true, null);
        List<RawItem> items = connector.fetch(new FetchContext(Instant.EPOCH, 48, source));
        assertTrue(items.isEmpty());
    }

    @Test
    void parsesPosts() {
        String json = """
                {
                  "data": {
                    "posts": {
                      "nodes": [
                        {
                          "name": "RadarKit",
                          "tagline": "AI news radar",
                          "description": "Collects AI intel",
                          "votesCount": 120,
                          "commentsCount": 10,
                          "url": "https://www.producthunt.com/posts/radarkit",
                          "website": "https://example.com",
                          "featuredAt": "2024-01-01T12:00:00Z"
                        }
                      ]
                    }
                  }
                }
                """;
        ProductHuntConnector connector = new ProductHuntConnector(RestClient.builder(), new ObjectMapper(), new RadarProperties());
        Source source = new Source(1L, "ph", SourceType.PRODUCT_HUNT, Map.of(), true, null);
        List<RawItem> items = connector.parseResponse(json, new FetchContext(Instant.EPOCH, 48, source), 10);
        assertEquals(1, items.size());
        assertEquals("RadarKit", items.getFirst().title());
    }
}
