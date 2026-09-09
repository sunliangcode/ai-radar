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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class OssInsightConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(OssInsightConnector.class);
    private static final String BASE_URL = "https://api.ossinsight.io/v1/trends/repos";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    public OssInsightConnector(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Override
    public SourceType type() {
        return SourceType.OSS_INSIGHT;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("OSS_INSIGHT", "OSS Insight Trending", List.of(
                ConnectorDescriptor.ConfigField.text("period", "Period (past_24_hours|past_week|past_month)", false),
                ConnectorDescriptor.ConfigField.text("languages", "Languages (comma-separated)", false),
                ConnectorDescriptor.ConfigField.text("keywords", "Keywords filter", false),
                ConnectorDescriptor.ConfigField.text("maxItems", "Max items", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String period = ConnectorConfigs.string(ctx, "period", "past_24_hours");
        List<String> languages = ConnectorConfigs.stringList(ctx, "languages", List.of("All"));
        List<String> keywords = ConnectorConfigs.stringList(ctx, "keywords", List.of("AI", "LLM", "agent", "gpt"));
        int maxItems = ConnectorConfigs.integer(ctx, "maxItems", 30);
        int minStars = ConnectorConfigs.integer(ctx, "minStars", 0);

        Map<String, RawItem> byRepo = new LinkedHashMap<>();
        for (String language : languages) {
            String uri = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .queryParam("period", period)
                    .queryParam("language", language)
                    .build()
                    .toUriString();
            String body = restClientBuilder.build()
                    .get()
                    .uri(uri)
                    .header("User-Agent", "ai-radar/0.1")
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(String.class);
            for (RawItem item : parseRows(body, ctx, period, language, keywords, minStars)) {
                byRepo.putIfAbsent(item.url(), item);
            }
        }

        List<RawItem> items = new ArrayList<>(byRepo.values());
        items.sort((a, b) -> Integer.compare(starsGained(b), starsGained(a)));
        if (items.size() > maxItems) {
            items = new ArrayList<>(items.subList(0, maxItems));
        }
        log.debug("OSS Insight fetched {} repos for {}", items.size(), ctx.source().name());
        return items;
    }

    List<RawItem> parseRows(
            String body,
            FetchContext ctx,
            String period,
            String language,
            List<String> keywords,
            int minStars
    ) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode rows = objectMapper.readTree(body).path("data").path("rows");
            if (!rows.isArray()) {
                return items;
            }
            List<String> keywordsLower = keywords.stream()
                    .map(k -> k.toLowerCase(Locale.ROOT))
                    .filter(k -> !k.isBlank())
                    .toList();
            for (JsonNode row : rows) {
                String repoName = row.path("repo_name").asText(null);
                if (repoName == null || repoName.isBlank()) {
                    continue;
                }
                int stars = asInt(row.path("stars"));
                if (stars < minStars) {
                    continue;
                }
                if (!keywordsLower.isEmpty() && !matchesKeywords(row, keywordsLower)) {
                    continue;
                }
                String url = "https://github.com/" + repoName;
                String description = row.path("description").asText("");
                String title = repoName + " (+" + stars + "⭐ " + period + ")";
                Map<String, Object> meta = new HashMap<>();
                meta.put("repo", repoName);
                meta.put("stars_gained", stars);
                meta.put("forks_gained", asInt(row.path("forks")));
                meta.put("primary_language", row.path("primary_language").asText(language));
                meta.put("period", period);
                items.add(new RawItem(
                        title,
                        url,
                        Instant.now(),
                        SourceType.OSS_INSIGHT,
                        String.valueOf(ctx.source().id()),
                        description,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("OSS Insight parse failed: " + e.getMessage(), e);
        }
        return items;
    }

    private static boolean matchesKeywords(JsonNode row, List<String> keywordsLower) {
        String haystack = String.join(" ",
                row.path("description").asText("").toLowerCase(Locale.ROOT),
                row.path("collection_names").asText("").toLowerCase(Locale.ROOT),
                row.path("repo_name").asText("").toLowerCase(Locale.ROOT)
        );
        for (String kw : keywordsLower) {
            if (haystack.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private static int starsGained(RawItem item) {
        Object v = item.rawMeta() == null ? null : item.rawMeta().get("stars_gained");
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return v == null ? 0 : Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static int asInt(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return 0;
        }
        if (node.isNumber()) {
            return node.asInt();
        }
        try {
            return Integer.parseInt(node.asText("0").trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
