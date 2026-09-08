package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.airadar.domain.UrlNormalizer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class FixtureConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(FixtureConnector.class);

    private final ObjectMapper objectMapper;

    public FixtureConnector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public SourceType type() {
        return SourceType.FIXTURE;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of(
                "FIXTURE",
                "JSON Fixture",
                List.of(ConnectorDescriptor.ConfigField.path("path", "JSON path", true))
        );
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        Object pathObj = ctx.source().config().get("path");
        String path = pathObj == null ? "fixtures/demo-events.json" : pathObj.toString();
        try {
            String json = readJson(path);
            JsonNode root = objectMapper.readTree(json);
            JsonNode arr = root.isArray() ? root : root.path("items");
            List<RawItem> items = new ArrayList<>();
            if (!arr.isArray()) {
                return List.of();
            }
            for (JsonNode node : arr) {
                String title = node.path("title").asText("");
                String url = node.path("url").asText("");
                if (url.isBlank()) {
                    continue;
                }
                Instant published = Instant.now();
                if (node.hasNonNull("publishedAt")) {
                    published = Instant.parse(node.path("publishedAt").asText());
                }
                items.add(new RawItem(
                        title,
                        UrlNormalizer.canonicalize(url),
                        published,
                        SourceType.FIXTURE,
                        ctx.source().id() == null ? "fixture" : String.valueOf(ctx.source().id()),
                        node.path("snippet").asText(""),
                        Map.of("fixture", true)
                ));
            }
            return items;
        } catch (Exception e) {
            throw new IllegalStateException("Fixture fetch failed: " + e.getMessage(), e);
        }
    }

    private String readJson(String path) throws Exception {
        if (path.startsWith("classpath:")) {
            return new ClassPathResource(path.substring("classpath:".length()))
                    .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        }
        if (Files.isRegularFile(Path.of(path))) {
            return Files.readString(Path.of(path));
        }
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            log.warn("fixture_missing path={}", path);
            return "[]";
        }
        return resource.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }
}
