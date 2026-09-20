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

class DailyHotConnectorTest {

    @Test
    void parsesDataArray() {
        String json = """
                {
                  "code": 200,
                  "data": [
                    {
                      "title": "某热搜话题",
                      "url": "https://example.com/1",
                      "hot": "123万"
                    },
                    {
                      "name": "第二条",
                      "mobileUrl": "https://example.com/2",
                      "hotValue": 99
                    }
                  ]
                }
                """;
        DailyHotConnector connector = new DailyHotConnector(RestClient.builder(), new ObjectMapper(), "http://127.0.0.1:6688");
        Source source = new Source(9L, "百度热搜", SourceType.DAILY_HOT, Map.of("route", "baidu"), true, null);
        List<RawItem> items = connector.parse(json, new FetchContext(Instant.EPOCH, 48, source), "baidu", 30);
        assertEquals(2, items.size());
        assertEquals("某热搜话题", items.getFirst().title());
        assertEquals("https://example.com/1", items.getFirst().url());
        assertEquals("第二条", items.get(1).title());
    }
}
