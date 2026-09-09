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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GdeltConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(GdeltConnector.class);
    private static final String BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
    private static final DateTimeFormatter SEENDATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    public GdeltConnector(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Override
    public SourceType type() {
        return SourceType.GDELT;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("GDELT", "GDELT News", List.of(
                ConnectorDescriptor.ConfigField.text("query", "Query", true),
                ConnectorDescriptor.ConfigField.text("timespan", "Timespan (e.g. 48h)", false),
                ConnectorDescriptor.ConfigField.text("maxRecords", "Max records", false),
                ConnectorDescriptor.ConfigField.text("language", "Language operator", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String query = ConnectorConfigs.string(ctx, "query", "artificial intelligence OR LLM");
        String language = ConnectorConfigs.string(ctx, "language", "");
        String country = ConnectorConfigs.string(ctx, "country", "");
        String timespan = ConnectorConfigs.string(ctx, "timespan", "");
        int maxRecords = Math.min(250, ConnectorConfigs.integer(ctx, "maxRecords", 50));

        StringBuilder q = new StringBuilder(query);
        if (!language.isBlank()) {
            q.append(" sourcelang:").append(language);
        }
        if (!country.isBlank()) {
            q.append(" sourcecountry:").append(country);
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("query", q.toString())
                .queryParam("mode", ConnectorConfigs.string(ctx, "mode", "ArtList"))
                .queryParam("format", "json")
                .queryParam("maxrecords", maxRecords)
                .queryParam("sort", "datedesc");

        if (!timespan.isBlank()) {
            builder.queryParam("timespan", timespan);
        } else {
            builder.queryParam("startdatetime", DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                    .withZone(ZoneOffset.UTC).format(ctx.since()));
            builder.queryParam("enddatetime", DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                    .withZone(ZoneOffset.UTC).format(Instant.now()));
        }

        String body = restClientBuilder.build()
                .get()
                .uri(builder.build().toUriString())
                .header("User-Agent", "ai-radar/0.1")
                .retrieve()
                .body(String.class);
        return parseArticles(body, ctx);
    }

    List<RawItem> parseArticles(String body, FetchContext ctx) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode articles = objectMapper.readTree(body).path("articles");
            if (!articles.isArray()) {
                return items;
            }
            for (JsonNode article : articles) {
                String url = article.path("url").asText(null);
                String title = article.path("title").asText(null);
                if (url == null || url.isBlank() || title == null || title.isBlank()) {
                    continue;
                }
                Instant published = parseSeenDate(article.path("seendate").asText(null));
                if (published == null) {
                    published = Instant.now();
                }
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("domain", article.path("domain").asText(null));
                meta.put("sourcecountry", article.path("sourcecountry").asText(null));
                meta.put("language", article.path("language").asText(null));
                items.add(new RawItem(
                        title.trim(),
                        url.trim(),
                        published,
                        SourceType.GDELT,
                        String.valueOf(ctx.source().id()),
                        article.path("domain").asText(""),
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("GDELT parse failed: " + e.getMessage(), e);
        }
        log.debug("GDELT fetched {} articles for {}", items.size(), ctx.source().name());
        return items;
    }

    static Instant parseSeenDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value, SEENDATE).toInstant(ZoneOffset.UTC);
        } catch (Exception e) {
            return null;
        }
    }
}
