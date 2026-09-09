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
import static org.junit.jupiter.api.Assertions.assertTrue;

class OssInsightConnectorTest {

    @Test
    void parsesRowsAndFiltersKeywords() {
        String json = """
                {
                  "data": {
                    "rows": [
                      {
                        "repo_id": "1",
                        "repo_name": "org/llm-tool",
                        "stars": "120",
                        "forks": "10",
                        "description": "An LLM agent toolkit",
                        "primary_language": "Python",
                        "collection_names": "AI"
                      },
                      {
                        "repo_id": "2",
                        "repo_name": "org/css-theme",
                        "stars": "50",
                        "description": "Pretty themes",
                        "primary_language": "CSS"
                      }
                    ]
                  }
                }
                """;
        OssInsightConnector connector = new OssInsightConnector(RestClient.builder(), new ObjectMapper());
        Source source = new Source(3L, "oss", SourceType.OSS_INSIGHT, Map.of(), true, null);
        List<RawItem> items = connector.parseRows(
                json,
                new FetchContext(Instant.EPOCH, 48, source),
                "past_24_hours",
                "All",
                List.of("llm", "ai"),
                0
        );
        assertEquals(1, items.size());
        assertTrue(items.getFirst().url().contains("llm-tool"));
    }
}
