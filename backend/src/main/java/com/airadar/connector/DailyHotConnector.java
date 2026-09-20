package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Hot-list aggregator via self-hosted
 * <a href="https://github.com/imsyy/DailyHotApi">DailyHotApi</a>.
 * Config: {@code route} (e.g. weibo), optional {@code baseUrl}, {@code limit}.
 */
@Component
public class DailyHotConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(DailyHotConnector.class);
    private static final String DEFAULT_BASE = "http://127.0.0.1:6688";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final String defaultBaseUrl;

    public DailyHotConnector(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${radar.daily-hot.base-url:" + DEFAULT_BASE + "}") String defaultBaseUrl
    ) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.defaultBaseUrl = defaultBaseUrl == null || defaultBaseUrl.isBlank() ? DEFAULT_BASE : defaultBaseUrl.trim();
    }

    @Override
    public SourceType type() {
        return SourceType.DAILY_HOT;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("DAILY_HOT", "DailyHot 热榜", List.of(
                ConnectorDescriptor.ConfigField.text("route", "Route (weibo/zhihu/baidu/…)", true),
                ConnectorDescriptor.ConfigField.text("baseUrl", "DailyHot base URL (optional)", false),
                ConnectorDescriptor.ConfigField.text("limit", "Max items", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String route = ConnectorConfigs.string(ctx, "route", "").trim();
        if (route.isBlank()) {
            log.warn("daily_hot_skip reason=missing_route source={}", ctx.source().name());
            return List.of();
        }
        // Allow "weibo" or "/weibo"
        if (route.startsWith("/")) {
            route = route.substring(1);
        }
        String base = ConnectorConfigs.string(ctx, "baseUrl", defaultBaseUrl).trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        int limit = Math.max(1, ConnectorConfigs.integer(ctx, "limit", 30));
        String url = base + "/" + route;
        String body;
        try {
            body = restClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("User-Agent", "ai-radar/0.1")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "DailyHot unreachable at " + url
                            + " — start the sidecar (docker compose daily-hot) or set DAILY_HOT_BASE_URL. "
                            + e.getMessage(),
                    e
            );
        }
        List<RawItem> items = parse(body, ctx, route, limit);
        log.debug("DailyHot fetched {} items route={} for {}", items.size(), route, ctx.source().name());
        return items;
    }

    List<RawItem> parse(String body, FetchContext ctx, String route, int limit) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                data = root.isArray() ? root : null;
            }
            if (data == null || !data.isArray()) {
                return items;
            }
            Instant now = Instant.now();
            for (JsonNode row : data) {
                if (items.size() >= limit) {
                    break;
                }
                String title = firstText(row, "title", "name", "desc");
                String itemUrl = firstText(row, "url", "mobileUrl", "link");
                if (title == null || title.isBlank() || itemUrl == null || itemUrl.isBlank()) {
                    continue;
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("route", route);
                String hot = firstText(row, "hot", "hotValue", "desc");
                if (hot != null) {
                    meta.put("hot", hot);
                }
                items.add(new RawItem(
                        title.trim(),
                        itemUrl.trim(),
                        now,
                        SourceType.DAILY_HOT,
                        String.valueOf(ctx.source().id()),
                        hot,
                        meta
                ));
            }
        } catch (Exception e) {
            throw new IllegalStateException("DailyHot JSON parse failed for route=" + route + ": " + e.getMessage(), e);
        }
        return items;
    }

    private static String firstText(JsonNode row, String... keys) {
        for (String key : keys) {
            JsonNode n = row.path(key);
            if (n.isNumber()) {
                return n.asText();
            }
            String t = n.asText(null);
            if (t != null && !t.isBlank()) {
                return t;
            }
        }
        return null;
    }
}
