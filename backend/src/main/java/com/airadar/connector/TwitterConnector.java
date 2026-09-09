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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class TwitterConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(TwitterConnector.class);
    private static final String APIFY_BASE = "https://api.apify.com/v2";
    private static final long POLL_MS = 3000L;
    private static final long MAX_WAIT_MS = 180_000L;

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final RadarProperties properties;

    public TwitterConnector(
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
        return SourceType.TWITTER;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("TWITTER", "Twitter / X (Apify)", List.of(
                ConnectorDescriptor.ConfigField.text("users", "Usernames (comma-separated)", true),
                ConnectorDescriptor.ConfigField.text("fetchLimit", "Max tweets", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String token = properties.getTwitter().getApifyToken();
        if (token == null || token.isBlank()) {
            log.warn("Twitter: APIFY_TOKEN not set; skipping source {}", ctx.source().name());
            return List.of();
        }
        List<String> users = ConnectorConfigs.stringList(ctx, "users", List.of()).stream()
                .map(u -> u.replaceFirst("^@", "").trim())
                .filter(u -> !u.isBlank())
                .toList();
        if (users.isEmpty()) {
            log.warn("Twitter source {} missing users", ctx.source().name());
            return List.of();
        }
        int fetchLimit = ConnectorConfigs.integer(ctx, "fetchLimit", 50);
        String actorId = properties.getTwitter().getActorId();
        if (actorId == null || actorId.isBlank()) {
            actorId = "altimis~scweet";
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("source_mode", "profiles");
        payload.put("profile_urls", users);
        payload.put("search_sort", "Latest");
        payload.put("max_items", Math.max(100, fetchLimit));

        RestClient client = restClientBuilder.build();
        String runUrl = APIFY_BASE + "/acts/" + actorId + "/runs?token=" + token;
        String runBody = client.post()
                .uri(runUrl)
                .header("Content-Type", "application/json")
                .body(payload)
                .retrieve()
                .body(String.class);

        try {
            JsonNode run = objectMapper.readTree(runBody).path("data");
            String runId = run.path("id").asText(null);
            String datasetId = run.path("defaultDatasetId").asText(null);
            if (runId == null || datasetId == null) {
                log.warn("Twitter Apify run missing ids: {}", runBody);
                return List.of();
            }
            if (!waitForRun(client, token, runId)) {
                log.warn("Twitter Apify run did not succeed: {}", runId);
                return List.of();
            }
            String datasetUrl = APIFY_BASE + "/datasets/" + datasetId + "/items?token=" + token + "&clean=true";
            String datasetBody = client.get().uri(datasetUrl).retrieve().body(String.class);
            return parseDataset(datasetBody, ctx, fetchLimit);
        } catch (Exception e) {
            throw new IllegalStateException("Twitter Apify fetch failed: " + e.getMessage(), e);
        }
    }

    private boolean waitForRun(RestClient client, String token, String runId) throws InterruptedException {
        long deadline = System.currentTimeMillis() + MAX_WAIT_MS;
        while (System.currentTimeMillis() < deadline) {
            String statusBody = client.get()
                    .uri(APIFY_BASE + "/actor-runs/" + runId + "?token=" + token)
                    .retrieve()
                    .body(String.class);
            try {
                String status = objectMapper.readTree(statusBody).path("data").path("status").asText("");
                if ("SUCCEEDED".equalsIgnoreCase(status)) {
                    return true;
                }
                if ("FAILED".equalsIgnoreCase(status)
                        || "ABORTED".equalsIgnoreCase(status)
                        || "TIMED-OUT".equalsIgnoreCase(status)) {
                    return false;
                }
            } catch (Exception e) {
                log.warn("Twitter Apify status poll failed: {}", e.getMessage());
            }
            Thread.sleep(POLL_MS);
        }
        return false;
    }

    List<RawItem> parseDataset(String body, FetchContext ctx, int fetchLimit) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) {
                return items;
            }
            for (JsonNode raw : root) {
                if (items.size() >= fetchLimit) {
                    break;
                }
                if (raw.path("noResults").asBoolean(false)) {
                    continue;
                }
                RawItem item = parseItem(raw, ctx);
                if (item != null) {
                    items.add(item);
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Twitter dataset parse failed: " + e.getMessage(), e);
        }
        return items;
    }

    private RawItem parseItem(JsonNode raw, FetchContext ctx) {
        String text = firstText(raw, "full_text", "text", "content");
        String url = firstText(raw, "url", "tweet_url", "twitterUrl");
        if (url == null || url.isBlank()) {
            String id = firstText(raw, "id_str", "id", "tweet_id");
            String user = firstText(raw, "username", "screen_name", "user");
            if (id != null && user != null) {
                url = "https://x.com/" + user.replace("@", "") + "/status/" + id;
            }
        }
        if (url == null || url.isBlank() || text == null || text.isBlank()) {
            return null;
        }
        Instant published = parseInstant(firstText(raw, "created_at", "createdAt", "date"));
        if (published == null) {
            published = Instant.now();
        }
        if (published.isBefore(ctx.since())) {
            return null;
        }
        String title = text.length() <= 80 ? text : text.substring(0, 80);
        Map<String, Object> meta = new HashMap<>();
        meta.put("likes", raw.path("favorite_count").asInt(raw.path("likes").asInt(0)));
        meta.put("retweets", raw.path("retweet_count").asInt(raw.path("retweets").asInt(0)));
        meta.put("user", firstText(raw, "username", "screen_name", "user"));
        return new RawItem(
                title,
                url,
                published,
                SourceType.TWITTER,
                String.valueOf(ctx.source().id()),
                text.length() > 2000 ? text.substring(0, 2000) : text,
                meta
        );
    }

    private static String firstText(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode v = node.path(key);
            if (!v.isMissingNode() && !v.isNull()) {
                String text = v.asText("").trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
            JsonNode user = node.path("user");
            if (user.isObject()) {
                JsonNode nested = user.path(key);
                if (!nested.isMissingNode() && !nested.isNull()) {
                    String text = nested.asText("").trim();
                    if (!text.isBlank()) {
                        return text;
                    }
                }
            }
        }
        return null;
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (Exception ignored) {
        }
        try {
            return Instant.from(java.time.format.DateTimeFormatter
                    .ofPattern("EEE MMM dd HH:mm:ss Z yyyy", java.util.Locale.ENGLISH)
                    .parse(value));
        } catch (Exception e) {
            return null;
        }
    }
}
