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

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ProductHuntConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(ProductHuntConnector.class);
    private static final String GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final RadarProperties properties;

    public ProductHuntConnector(
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
        return SourceType.PRODUCT_HUNT;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("PRODUCT_HUNT", "Product Hunt", List.of(
                ConnectorDescriptor.ConfigField.text("maxItems", "Max items", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String token = properties.getProducthunt().getToken();
        if (token == null || token.isBlank()) {
            log.warn("Product Hunt: PH_TOKEN not set; skipping source {}", ctx.source().name());
            return List.of();
        }
        int maxItems = ConnectorConfigs.integer(ctx, "maxItems", 20);
        String sinceIso = DateTimeFormatter.ISO_INSTANT.format(ctx.since());
        String query = """
                query {
                  posts(postedAfter: "%s", first: %d, order: RANKING) {
                    nodes {
                      name
                      tagline
                      description
                      votesCount
                      commentsCount
                      url
                      website
                      featuredAt
                    }
                  }
                }
                """.formatted(sinceIso, Math.max(maxItems * 2, 10));

        Map<String, Object> body = Map.of("query", query);
        String response = restClientBuilder.build()
                .post()
                .uri(GRAPHQL_URL)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .header("User-Agent", "ai-radar/0.1")
                .body(body)
                .retrieve()
                .body(String.class);
        return parseResponse(response, ctx, maxItems);
    }

    List<RawItem> parseResponse(String body, FetchContext ctx, int maxItems) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            if (root.path("errors").isArray() && !root.path("errors").isEmpty()) {
                log.warn("Product Hunt API errors: {}", root.path("errors"));
                return items;
            }
            JsonNode nodes = root.path("data").path("posts").path("nodes");
            if (!nodes.isArray()) {
                return items;
            }
            for (JsonNode post : nodes) {
                if (items.size() >= maxItems) {
                    break;
                }
                String name = post.path("name").asText("");
                String url = post.path("url").asText("");
                if (name.isBlank() || url.isBlank()) {
                    continue;
                }
                Instant published = parseInstant(post.path("featuredAt").asText(null));
                if (published == null) {
                    published = Instant.now();
                }
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                String tagline = post.path("tagline").asText("");
                String description = post.path("description").asText("");
                String snippet = (tagline + "\n" + description).trim();
                Map<String, Object> meta = new HashMap<>();
                meta.put("votes", post.path("votesCount").asInt(0));
                meta.put("comments", post.path("commentsCount").asInt(0));
                meta.put("website", post.path("website").asText(null));
                items.add(new RawItem(
                        name,
                        url,
                        published,
                        SourceType.PRODUCT_HUNT,
                        String.valueOf(ctx.source().id()),
                        snippet,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Product Hunt parse failed: " + e.getMessage(), e);
        }
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
}
