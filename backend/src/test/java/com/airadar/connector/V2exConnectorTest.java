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

class V2exConnectorTest {

    @Test
    void parsesTopics() {
        String json = """
                [
                  {
                    "id": 1,
                    "title": "Build an AI side project",
                    "url": "https://www.v2ex.com/t/1",
                    "content": "Looking for feedback",
                    "created": 1700000000,
                    "replies": 3
                  }
                ]
                """;
        V2exConnector connector = new V2exConnector(RestClient.builder(), new ObjectMapper());
        Source source = new Source(5L, "v2ex", SourceType.V2EX, Map.of(), true, null);
        List<RawItem> items = connector.parseTopics(json, new FetchContext(Instant.EPOCH, 48, source), "create", 20);
        assertEquals(1, items.size());
        assertEquals("Build an AI side project", items.getFirst().title());
    }
}
