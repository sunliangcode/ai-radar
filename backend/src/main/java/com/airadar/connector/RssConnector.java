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

import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class RssConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(RssConnector.class);

    @Override
    public SourceType type() {
        return SourceType.RSS;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("RSS", "RSS / Atom feed", List.of(
                ConnectorDescriptor.ConfigField.text("feedUrl", "Feed URL", true)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        Object feedUrlObj = ctx.source().config().get("feedUrl");
        if (feedUrlObj == null) {
            feedUrlObj = ctx.source().config().get("url");
        }
        if (feedUrlObj == null || feedUrlObj.toString().isBlank()) {
            log.warn("RSS source {} missing feedUrl", ctx.source().name());
            return List.of();
        }
        String feedUrl = feedUrlObj.toString();
        Instant since = ctx.since();
        List<RawItem> items = new ArrayList<>();
        try {
            URL url = URI.create(feedUrl).toURL();
            try (InputStream in = url.openStream();
                 XmlReader reader = new XmlReader(in)) {
                SyndFeed feed = new SyndFeedInput().build(reader);
                for (SyndEntry entry : feed.getEntries()) {
                    Instant published = toInstant(entry.getPublishedDate());
                    if (published == null) {
                        published = toInstant(entry.getUpdatedDate());
                    }
                    if (published != null && published.isBefore(since)) {
                        continue;
                    }
                    String link = entry.getLink();
                    if (link == null || link.isBlank()) {
                        continue;
                    }
                    String snippet = extractSnippet(entry);
                    Map<String, Object> meta = new HashMap<>();
                    meta.put("feedUrl", feedUrl);
                    meta.put("author", entry.getAuthor());
                    // Hook for full-text fetch when snippet is too short (step 1: leave only).
                    meta.put("needsFullText", snippet == null || snippet.length() < 80);
                    items.add(new RawItem(
                            blankToTitle(entry.getTitle(), link),
                            link,
                            published != null ? published : Instant.now(),
                            SourceType.RSS,
                            String.valueOf(ctx.source().id()),
                            snippet,
                            meta
                    ));
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("RSS fetch failed for " + feedUrl + ": " + e.getMessage(), e);
        }
        return items;
    }

    private static String extractSnippet(SyndEntry entry) {
        if (entry.getDescription() != null && entry.getDescription().getValue() != null) {
            return stripHtml(entry.getDescription().getValue());
        }
        List<SyndContent> contents = entry.getContents();
        if (contents != null && !contents.isEmpty() && contents.getFirst().getValue() != null) {
            return stripHtml(contents.getFirst().getValue());
        }
        return "";
    }

    static String stripHtml(String html) {
        return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }

    private static String blankToTitle(String title, String fallback) {
        return title == null || title.isBlank() ? fallback : title.trim();
    }
}
