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

class TwitterConnectorTest {

    @Test
    void skipsWithoutToken() {
        TwitterConnector connector = new TwitterConnector(RestClient.builder(), new ObjectMapper(), new RadarProperties());
        Source source = new Source(1L, "tw", SourceType.TWITTER, Map.of("users", List.of("karpathy")), true, null);
        assertTrue(connector.fetch(new FetchContext(Instant.EPOCH, 48, source)).isEmpty());
    }

    @Test
    void parsesDataset() {
        String json = """
                [
                  {
                    "full_text": "Shipping a new LLM eval harness today",
                    "url": "https://x.com/karpathy/status/1",
                    "created_at": "2024-01-01T12:00:00Z",
                    "username": "karpathy",
                    "favorite_count": 10,
                    "retweet_count": 2
                  }
                ]
                """;
        TwitterConnector connector = new TwitterConnector(RestClient.builder(), new ObjectMapper(), new RadarProperties());
        Source source = new Source(1L, "tw", SourceType.TWITTER, Map.of(), true, null);
        List<RawItem> items = connector.parseDataset(json, new FetchContext(Instant.EPOCH, 48, source), 20);
        assertEquals(1, items.size());
        assertTrue(items.getFirst().title().contains("LLM"));
    }
}
