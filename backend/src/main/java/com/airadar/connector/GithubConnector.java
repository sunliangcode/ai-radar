package com.airadar.connector;

import com.airadar.config.RadarProperties;
import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GithubConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(GithubConnector.class);
    private static final String SEARCH_URL = "https://api.github.com/search/repositories";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final RadarProperties properties;

    public GithubConnector(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            RadarProperties properties
    ) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    public SourceType type() {
        return SourceType.GITHUB;
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String query = stringConfig(ctx, "query", "LLM OR \"large language model\" OR agents in:name,description,topics");
        String sort = stringConfig(ctx, "sort", "updated");
        int perPage = intConfig(ctx, "perPage", 30);

        String uri = UriComponentsBuilder.fromHttpUrl(SEARCH_URL)
                .queryParam("q", query)
                .queryParam("sort", sort)
                .queryParam("order", "desc")
                .queryParam("per_page", perPage)
                .build()
                .toUriString();

        RestClient.RequestHeadersSpec<?> spec = restClientBuilder.build()
                .get()
                .uri(uri)
                .header("User-Agent", "ai-radar/0.1")
                .header("Accept", "application/vnd.github+json");

        String token = properties.getGithub().getToken();
        if (token != null && !token.isBlank()) {
            spec = spec.header("Authorization", "Bearer " + token);
        }

        String body = spec.retrieve().body(String.class);
        return parseSearch(body, ctx);
    }

    List<RawItem> parseSearch(String body, FetchContext ctx) {
        List<RawItem> items = new ArrayList<>();
        try {
            JsonNode itemsNode = objectMapper.readTree(body).path("items");
            if (!itemsNode.isArray()) {
                return items;
            }
            for (JsonNode repo : itemsNode) {
                String htmlUrl = repo.path("html_url").asText(null);
                if (htmlUrl == null || htmlUrl.isBlank()) {
                    continue;
                }
                Instant published = parseInstant(repo.path("pushed_at").asText(null));
                if (published == null) {
                    published = parseInstant(repo.path("updated_at").asText(null));
                }
                if (published == null) {
                    published = Instant.now();
                }
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("fullName", repo.path("full_name").asText());
                meta.put("stars", repo.path("stargazers_count").asInt(0));
                meta.put("language", repo.path("language").asText(null));
                meta.put("forks", repo.path("forks_count").asInt(0));
                String description = repo.path("description").asText("");
                String title = repo.path("full_name").asText(htmlUrl);
                items.add(new RawItem(
                        title,
                        htmlUrl,
                        published,
                        SourceType.GITHUB,
                        String.valueOf(ctx.source().id()),
                        description,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("GitHub parse failed: " + e.getMessage(), e);
        }
        log.debug("GitHub fetched {} repos for source {}", items.size(), ctx.source().name());
        return items;
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private static String stringConfig(FetchContext ctx, String key, String defaultValue) {
        Object v = ctx.source().config().get(key);
        return v == null || v.toString().isBlank() ? defaultValue : v.toString();
    }

    private static int intConfig(FetchContext ctx, String key, int defaultValue) {
        Object v = ctx.source().config().get(key);
        if (v == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
