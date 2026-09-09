package com.airadar.connector;

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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class V2exConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(V2exConnector.class);
    private static final String API = "https://www.v2ex.com/api/topics/show.json?node_name=";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    public V2exConnector(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Override
    public SourceType type() {
        return SourceType.V2EX;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("V2EX", "V2EX", List.of(
                ConnectorDescriptor.ConfigField.text("nodes", "Nodes (comma-separated)", false),
                ConnectorDescriptor.ConfigField.text("limit", "Max items per node", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        List<String> nodes = ConnectorConfigs.stringList(ctx, "nodes", List.of("create", "share", "programmer"));
        int limit = ConnectorConfigs.integer(ctx, "limit", 20);
        Map<String, RawItem> byUrl = new LinkedHashMap<>();
        for (String node : nodes) {
            String body = restClientBuilder.build()
                    .get()
                    .uri(API + node)
                    .header("User-Agent", "ai-radar/0.1")
                    .retrieve()
                    .body(String.class);
            for (RawItem item : parseTopics(body, ctx, node, limit)) {
                byUrl.putIfAbsent(item.url(), item);
            }
        }
        log.debug("V2EX fetched {} topics for {}", byUrl.size(), ctx.source().name());
        return new ArrayList<>(byUrl.values());
    }

    List<RawItem> parseTopics(String body, FetchContext ctx, String node, int limit) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) {
                return items;
            }
            for (JsonNode topic : root) {
                if (items.size() >= limit) {
                    break;
                }
                String url = topic.path("url").asText(null);
                String title = topic.path("title").asText(null);
                if (url == null || url.isBlank() || title == null || title.isBlank()) {
                    continue;
                }
                Instant published = Instant.ofEpochSecond(topic.path("created").asLong(0));
                if (published.getEpochSecond() == 0) {
                    published = Instant.now();
                }
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("node", node);
                meta.put("replies", topic.path("replies").asInt(0));
                meta.put("id", topic.path("id").asInt(0));
                String content = topic.path("content").asText("");
                if (content.length() > 500) {
                    content = content.substring(0, 500);
                }
                items.add(new RawItem(
                        title.trim(),
                        url.trim(),
                        published,
                        SourceType.V2EX,
                        String.valueOf(ctx.source().id()),
                        content,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("V2EX parse failed: " + e.getMessage(), e);
        }
        return items;
    }
}
