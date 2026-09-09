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
import static org.junit.jupiter.api.Assertions.assertTrue;

class GithubTrendingConnectorTest {

    @Test
    void parsesTrendingHtml() {
        String html = """
                <html><body>
                <article class="Box-row">
                  <h2><a href="/org/awesome-llm">org / awesome-llm</a></h2>
                  <p>Great LLM toolkit</p>
                  <span itemprop="programmingLanguage">Python</span>
                  <a href="/org/awesome-llm/stargazers">1,234</a>
                  <span>120 stars today</span>
                </article>
                </body></html>
                """;
        GithubTrendingConnector connector = new GithubTrendingConnector(RestClient.builder());
        Source source = new Source(4L, "gt", SourceType.GITHUB_TRENDING, Map.of(), true, null);
        List<RawItem> items = connector.parseHtml(html, new FetchContext(Instant.EPOCH, 48, source), "daily");
        assertEquals(1, items.size());
        assertEquals("https://github.com/org/awesome-llm", items.getFirst().url());
        assertTrue(items.getFirst().title().contains("awesome-llm"));
        assertEquals(120, items.getFirst().rawMeta().get("stars_today"));
    }
}
