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
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Component
public class HackerNewsConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(HackerNewsConnector.class);
    private static final String ALGOLIA_BASE = "https://hn.algolia.com/api/v1/search_by_date";
    private static final String FIREBASE_TOP = "https://hacker-news.firebaseio.com/v0/newstories.json";
    private static final String FIREBASE_ITEM = "https://hacker-news.firebaseio.com/v0/item/{id}.json";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final ExecutorService fetchExecutor;

    public HackerNewsConnector(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            ExecutorService fetchExecutor
    ) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.fetchExecutor = fetchExecutor;
    }

    @Override
    public SourceType type() {
        return SourceType.HACKER_NEWS;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("HACKER_NEWS", "Hacker News", List.of(
                ConnectorDescriptor.ConfigField.text("query", "Search query", true),
                ConnectorDescriptor.ConfigField.text("tags", "Algolia tags", false),
                ConnectorDescriptor.ConfigField.text("hitsPerPage", "Hits per page", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        try {
            return fetchAlgolia(ctx);
        } catch (Exception e) {
            log.warn("Algolia HN failed ({}), falling back to Firebase API", e.getMessage());
            return fetchFirebase(ctx);
        }
    }

    private List<RawItem> fetchAlgolia(FetchContext ctx) {
        String query = stringConfig(ctx, "query", "AI OR LLM OR \"machine learning\" OR GPT");
        String tags = stringConfig(ctx, "tags", "story");
        int hitsPerPage = intConfig(ctx, "hitsPerPage", 50);
        long sinceEpoch = ctx.since().getEpochSecond();

        String uri = UriComponentsBuilder.fromUriString(ALGOLIA_BASE)
                .queryParam("query", query)
                .queryParam("tags", tags)
                .queryParam("hitsPerPage", hitsPerPage)
                .queryParam("numericFilters", "created_at_i>" + sinceEpoch)
                .build()
                .toUriString();

        String body = restClientBuilder.build()
                .get()
                .uri(uri)
                .header("User-Agent", "ai-radar/0.1")
                .header("Accept", "application/json")
                .retrieve()
                .body(String.class);

        return parseHits(body, ctx);
    }

    private List<RawItem> fetchFirebase(FetchContext ctx) {
        RestClient client = restClientBuilder.build();
        String idsJson = client.get()
                .uri(FIREBASE_TOP)
                .header("User-Agent", "ai-radar/0.1")
                .retrieve()
                .body(String.class);
        JsonNode ids;
        try {
            ids = objectMapper.readTree(idsJson);
        } catch (Exception e) {
            throw new IllegalStateException("Firebase HN id list parse failed", e);
        }

        String query = stringConfig(ctx, "query", "AI OR LLM OR GPT OR machine learning").toLowerCase(Locale.ROOT);
        String[] keywords = query.replace("\"", " ").split("\\s+or\\s+|\\s+");
        int limit = intConfig(ctx, "hitsPerPage", 50);
        int maxCheck = Math.min(120, ids.size());

        List<Long> idBatch = new ArrayList<>(maxCheck);
        for (int i = 0; i < maxCheck; i++) {
            idBatch.add(ids.get(i).asLong());
        }

        List<CompletableFuture<RawItem>> futures = idBatch.stream()
                .map(id -> CompletableFuture.supplyAsync(() -> fetchFirebaseItem(client, ctx, id, keywords), fetchExecutor))
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();

        List<RawItem> items = new ArrayList<>();
        for (CompletableFuture<RawItem> future : futures) {
            RawItem item = future.join();
            if (item != null) {
                items.add(item);
                if (items.size() >= limit) {
                    break;
                }
            }
        }
        return items;
    }

    private RawItem fetchFirebaseItem(RestClient client, FetchContext ctx, long id, String[] keywords) {
        try {
            String body = client.get()
                    .uri(FIREBASE_ITEM, id)
                    .header("User-Agent", "ai-radar/0.1")
                    .retrieve()
                    .body(String.class);
            JsonNode item = objectMapper.readTree(body);
            if (!"story".equals(item.path("type").asText())) {
                return null;
            }
            long time = item.path("time").asLong(0);
            Instant published = time > 0 ? Instant.ofEpochSecond(time) : Instant.now();
            if (published.isBefore(ctx.since())) {
                return null;
            }
            String title = item.path("title").asText("");
            String lower = title.toLowerCase(Locale.ROOT);
            boolean matched = false;
            for (String kw : keywords) {
                String k = kw.trim();
                if (k.length() >= 2 && lower.contains(k)) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                return null;
            }
            String url = item.path("url").asText(null);
            if (url == null || url.isBlank()) {
                url = "https://news.ycombinator.com/item?id=" + id;
            }
            Map<String, Object> meta = new HashMap<>();
            meta.put("points", item.path("score").asInt(0));
            meta.put("numComments", item.path("descendants").asInt(0));
            meta.put("objectID", String.valueOf(id));
            meta.put("author", item.path("by").asText(null));
            meta.put("via", "firebase");
            return new RawItem(
                    title.isBlank() ? url : title,
                    url,
                    published,
                    SourceType.HACKER_NEWS,
                    String.valueOf(ctx.source().id()),
                    item.path("text").asText(""),
                    meta
            );
        } catch (Exception ex) {
            log.debug("Skip HN item {}: {}", id, ex.getMessage());
            return null;
        }
    }

    List<RawItem> parseHits(String body, FetchContext ctx) {
        List<RawItem> items = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode hits = root.path("hits");
            if (!hits.isArray()) {
                return items;
            }
            for (JsonNode hit : hits) {
                String url = text(hit, "url");
                String objectId = text(hit, "objectID");
                if (url == null || url.isBlank()) {
                    if (objectId != null) {
                        url = "https://news.ycombinator.com/item?id=" + objectId;
                    } else {
                        continue;
                    }
                }
                String title = text(hit, "title");
                long created = hit.path("created_at_i").asLong(0);
                Instant published = created > 0 ? Instant.ofEpochSecond(created) : Instant.now();
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("points", hit.path("points").asInt(0));
                meta.put("numComments", hit.path("num_comments").asInt(0));
                meta.put("objectID", objectId);
                meta.put("author", text(hit, "author"));
                items.add(new RawItem(
                        title != null ? title : url,
                        url,
                        published,
                        SourceType.HACKER_NEWS,
                        String.valueOf(ctx.source().id()),
                        hit.path("story_text").asText(""),
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("HN parse failed: " + e.getMessage(), e);
        }
        log.debug("HN fetched {} items for source {}", items.size(), ctx.source().name());
        return items;
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

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }
}
