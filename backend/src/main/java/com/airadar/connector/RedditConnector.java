package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Component
public class RedditConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(RedditConnector.class);

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final ExecutorService fetchExecutor;

    public RedditConnector(
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
        return SourceType.REDDIT;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("REDDIT", "Reddit", List.of(
                ConnectorDescriptor.ConfigField.text("subreddits", "Subreddits (comma-separated)", true),
                ConnectorDescriptor.ConfigField.text("sort", "Sort (new|hot|…)", false),
                ConnectorDescriptor.ConfigField.text("limit", "Limit per subreddit", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        List<String> subreddits = resolveSubreddits(ctx);
        String sort = stringConfig(ctx, "sort", "new");
        int limit = intConfig(ctx, "limit", 25);
        RestClient client = restClientBuilder.build();

        List<CompletableFuture<List<RawItem>>> futures = subreddits.stream()
                .map(sub -> {
                    String clean = sub.startsWith("r/") ? sub.substring(2) : sub;
                    return CompletableFuture.supplyAsync(() -> {
                        try {
                            return fetchSubreddit(client, ctx, clean, sort, limit);
                        } catch (Exception e) {
                            log.error("Reddit fetch failed for r/{}: {}", clean, e.getMessage());
                            return List.<RawItem>of();
                        }
                    }, fetchExecutor);
                })
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();

        List<RawItem> items = new ArrayList<>();
        for (CompletableFuture<List<RawItem>> future : futures) {
            items.addAll(future.join());
        }
        return items;
    }

    private List<RawItem> fetchSubreddit(
            RestClient client,
            FetchContext ctx,
            String clean,
            String sort,
            int limit
    ) {
        String jsonUri = "https://www.reddit.com/r/" + clean + "/" + sort + ".json?limit=" + limit + "&raw_json=1";
        try {
            String body = client.get()
                    .uri(jsonUri)
                    .header("User-Agent", "Mozilla/5.0 (compatible; ai-radar/0.1; +https://github.com/local/ai-radar)")
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(String.class);
            return parseListing(body, ctx, clean);
        } catch (Exception jsonEx) {
            log.warn("Reddit JSON blocked for r/{} ({}), trying RSS", clean, jsonEx.getMessage());
            String rssUri = "https://www.reddit.com/r/" + clean + "/.rss?limit=" + limit;
            String xml = client.get()
                    .uri(rssUri)
                    .header("User-Agent", "Mozilla/5.0 (compatible; ai-radar/0.1; +https://github.com/local/ai-radar)")
                    .header("Accept", "application/rss+xml, application/atom+xml, application/xml, text/xml")
                    .retrieve()
                    .body(String.class);
            return parseRss(xml, ctx, clean);
        }
    }

    List<RawItem> parseRss(String xml, FetchContext ctx, String subreddit) {
        List<RawItem> items = new ArrayList<>();
        try (XmlReader reader = new XmlReader(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)))) {
            SyndFeed feed = new SyndFeedInput().build(reader);
            for (SyndEntry entry : feed.getEntries()) {
                String link = entry.getLink();
                if (link == null || link.isBlank()) {
                    continue;
                }
                Instant published = toInstant(entry.getPublishedDate());
                if (published == null) {
                    published = toInstant(entry.getUpdatedDate());
                }
                if (published == null) {
                    published = Instant.now();
                }
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                String snippet = "";
                if (entry.getDescription() != null && entry.getDescription().getValue() != null) {
                    snippet = RssConnector.stripHtml(entry.getDescription().getValue());
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("subreddit", subreddit);
                meta.put("via", "rss");
                items.add(new RawItem(
                        entry.getTitle() == null ? link : entry.getTitle(),
                        link,
                        published,
                        SourceType.REDDIT,
                        String.valueOf(ctx.source().id()),
                        snippet,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Reddit RSS parse failed: " + e.getMessage(), e);
        }
        return items;
    }

    List<RawItem> parseListing(String body, FetchContext ctx, String subreddit) {
        List<RawItem> items = new ArrayList<>();
        try {
            JsonNode children = objectMapper.readTree(body).path("data").path("children");
            if (!children.isArray()) {
                return items;
            }
            for (JsonNode child : children) {
                JsonNode data = child.path("data");
                String url = data.path("url_overridden_by_dest").asText(null);
                if (url == null || url.isBlank()) {
                    url = data.path("url").asText(null);
                }
                String permalink = data.path("permalink").asText("");
                if ((url == null || url.isBlank()) && !permalink.isBlank()) {
                    url = "https://www.reddit.com" + permalink;
                }
                if (url == null || url.isBlank()) {
                    continue;
                }
                double createdUtc = data.path("created_utc").asDouble(0);
                Instant published = createdUtc > 0 ? Instant.ofEpochSecond((long) createdUtc) : Instant.now();
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("subreddit", subreddit);
                meta.put("score", data.path("score").asInt(0));
                meta.put("numComments", data.path("num_comments").asInt(0));
                meta.put("permalink", "https://www.reddit.com" + permalink);
                String title = data.path("title").asText(url);
                String selftext = data.path("selftext").asText("");
                items.add(new RawItem(
                        title,
                        url,
                        published,
                        SourceType.REDDIT,
                        String.valueOf(ctx.source().id()),
                        selftext,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Reddit parse failed: " + e.getMessage(), e);
        }
        return items;
    }

    private static List<String> resolveSubreddits(FetchContext ctx) {
        List<String> subreddits = new ArrayList<>();
        Object configured = ctx.source().config().get("subreddits");
        if (configured instanceof List<?> list) {
            for (Object o : list) {
                subreddits.add(o.toString());
            }
        } else if (configured != null && !configured.toString().isBlank()) {
            for (String part : configured.toString().split(",")) {
                if (!part.isBlank()) {
                    subreddits.add(part.trim());
                }
            }
        }
        if (subreddits.isEmpty()) {
            return List.of("MachineLearning", "LocalLLaMA", "artificial");
        }
        return subreddits;
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
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
