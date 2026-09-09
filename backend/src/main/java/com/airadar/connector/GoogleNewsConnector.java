package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.rometools.rome.feed.synd.SyndContent;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GoogleNewsConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(GoogleNewsConnector.class);
    private static final String BASE_URL = "https://news.google.com/rss/search";

    private final RestClient.Builder restClientBuilder;

    public GoogleNewsConnector(RestClient.Builder restClientBuilder) {
        this.restClientBuilder = restClientBuilder;
    }

    @Override
    public SourceType type() {
        return SourceType.GOOGLE_NEWS;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("GOOGLE_NEWS", "Google News", List.of(
                ConnectorDescriptor.ConfigField.text("query", "Search query", true),
                ConnectorDescriptor.ConfigField.text("hl", "Language (hl)", false),
                ConnectorDescriptor.ConfigField.text("gl", "Country (gl)", false),
                ConnectorDescriptor.ConfigField.text("maxResults", "Max results", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String query = ConnectorConfigs.string(ctx, "query", "AI OR LLM OR \"machine learning\"");
        String hl = ConnectorConfigs.string(ctx, "hl", "en");
        String gl = ConnectorConfigs.string(ctx, "gl", "US");
        String ceid = ConnectorConfigs.string(ctx, "ceid", gl + ":" + hl);
        int maxResults = ConnectorConfigs.integer(ctx, "maxResults", 40);

        String timedQuery = query + " " + timeOperator(ctx);
        String uri = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("q", timedQuery)
                .queryParam("hl", hl)
                .queryParam("gl", gl)
                .queryParam("ceid", ceid)
                .build()
                .toUriString();

        String body = restClientBuilder.build()
                .get()
                .uri(uri)
                .header("User-Agent", "ai-radar/0.1")
                .retrieve()
                .body(String.class);
        return parseFeed(body, ctx, maxResults);
    }

    List<RawItem> parseFeed(String body, FetchContext ctx, int maxResults) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            SyndFeed feed = new SyndFeedInput().build(
                    new XmlReader(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8))));
            for (SyndEntry entry : feed.getEntries()) {
                if (items.size() >= maxResults) {
                    break;
                }
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
                String snippet = extractSnippet(entry);
                Map<String, Object> meta = new HashMap<>();
                meta.put("publisher", entry.getAuthor());
                meta.put("query", ConnectorConfigs.string(ctx, "query", ""));
                items.add(new RawItem(
                        blankTitle(entry.getTitle(), link),
                        link,
                        published,
                        SourceType.GOOGLE_NEWS,
                        String.valueOf(ctx.source().id()),
                        snippet,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Google News parse failed: " + e.getMessage(), e);
        }
        log.debug("Google News fetched {} items for {}", items.size(), ctx.source().name());
        return items;
    }

    private static String timeOperator(FetchContext ctx) {
        long hours = Math.max(1, ChronoUnit.HOURS.between(ctx.since(), Instant.now()));
        if (hours <= 100) {
            return "when:" + hours + "h";
        }
        return "after:" + ctx.since().toString().substring(0, 10);
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }

    private static String extractSnippet(SyndEntry entry) {
        if (entry.getDescription() != null && entry.getDescription().getValue() != null) {
            return RssConnector.stripHtml(entry.getDescription().getValue());
        }
        List<SyndContent> contents = entry.getContents();
        if (contents != null && !contents.isEmpty() && contents.getFirst().getValue() != null) {
            return RssConnector.stripHtml(contents.getFirst().getValue());
        }
        return "";
    }

    private static String blankTitle(String title, String link) {
        return title == null || title.isBlank() ? link : title.trim();
    }
}
