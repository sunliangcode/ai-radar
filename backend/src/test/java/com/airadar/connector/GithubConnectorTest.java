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

class GithubConnectorTest {

    @Test
    void parsesSearchFixture() {
        String fixture = """
                {
                  "items": [
                    {
                      "full_name": "org/awesome-llm",
                      "html_url": "https://github.com/org/awesome-llm",
                      "description": "An awesome LLM toolkit",
                      "stargazers_count": 999,
                      "language": "Python",
                      "forks_count": 10,
                      "pushed_at": "2024-01-01T00:00:00Z",
                      "updated_at": "2024-01-01T00:00:00Z"
                    }
                  ]
                }
                """;
        GithubConnector connector = new GithubConnector(RestClient.builder(), new ObjectMapper(), new RadarProperties());
        Source source = new Source(2L, "gh", SourceType.GITHUB, Map.of(), true, null);
        FetchContext ctx = new FetchContext(Instant.EPOCH, 48, source);
        List<RawItem> items = connector.parseSearch(fixture, ctx);
        assertEquals(1, items.size());
        assertEquals("org/awesome-llm", items.getFirst().title());
        assertEquals(999, items.getFirst().rawMeta().get("stars"));
    }
}
