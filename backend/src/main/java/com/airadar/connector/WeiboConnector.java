package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 微博热搜 via open-source {@code weibo} CLI
 * (e.g. <a href="https://github.com/jackwener/weibo-cli">jackwener/weibo-cli</a>
 * or <a href="https://github.com/Marvae/weibo-cli">Marvae/weibo-cli</a>).
 * Paste Cookie into source config — no need to edit the CLI project.
 */
@Component
public class WeiboConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(WeiboConnector.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(90);

    public static final String DEFAULT_CLI = "weibo";
    public static final String DEFAULT_SOURCE_NAME = "微博热搜";
    public static final int DEFAULT_LIMIT = 20;
    public static final String OPEN_SOURCE_URL = "https://github.com/jackwener/weibo-cli";

    private final ObjectMapper objectMapper;

    public WeiboConnector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public static String preferredCliPath() {
        return OpenSourceCliRunner.preferredPath("WEIBO_CLI_PATH", DEFAULT_CLI);
    }

    @Override
    public SourceType type() {
        return SourceType.WEIBO;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("WEIBO", "微博（开源 CLI）", List.of(
                ConnectorDescriptor.ConfigField.path("cliPath", "weibo CLI 路径（默认 weibo）", false),
                ConnectorDescriptor.ConfigField.secret(
                        "cookie",
                        "浏览器 Cookie（粘贴即可；也可用 WEIBO_COOKIE 环境变量）",
                        false),
                ConnectorDescriptor.ConfigField.text("limit", "每次条数（默认 20）", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String cliPath = resolveCliPath(ctx);
        int limit = Math.max(1, ConnectorConfigs.integer(ctx, "limit", DEFAULT_LIMIT));
        String cookie = ConnectorConfigs.string(ctx, "cookie", "");
        if (!cookie.isBlank()) {
            // Paste-once UX: write into weibo-cli credential file (no CLI-project setup).
            CliCredentialWriter.writeWeiboCookie(cookie.trim());
        }
        String out;
        try {
            out = OpenSourceCliRunner.run(
                    cliPath,
                    List.of("hot", "--json", "--count", String.valueOf(limit)),
                    Map.of(),
                    TIMEOUT,
                    "Weibo"
            );
        } catch (Exception e) {
            throw new IllegalStateException(formatFetchError(e.getMessage()), e);
        }
        List<RawItem> items = parseHotJson(out, ctx, limit);
        log.debug("Weibo CLI fetched {} items for {}", items.size(), ctx.source().name());
        return items;
    }

    static String formatFetchError(String detail) {
        String d = detail == null ? "" : detail;
        String lower = d.toLowerCase();
        if (lower.contains("not_authenticated")
                || lower.contains("未登录")
                || lower.contains("cookie")
                || lower.contains("auth")) {
            return "Weibo auth failed — paste Cookie in source config or run `weibo login`";
        }
        if (d.isBlank()) {
            return "Weibo CLI failed — install " + OPEN_SOURCE_URL;
        }
        return "Weibo CLI failed: " + d;
    }

    private String resolveCliPath(FetchContext ctx) {
        String fromEnv = System.getenv("WEIBO_CLI_PATH");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return ConnectorConfigs.string(ctx, "cliPath", DEFAULT_CLI);
    }

    List<RawItem> parseHotJson(String body, FetchContext ctx, int limit) {
        List<RawItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode realtime = root.path("realtime");
            if (!realtime.isArray()) {
                realtime = root.path("data").path("realtime");
            }
            if (!realtime.isArray() && root.isArray()) {
                realtime = root;
            }
            if (!realtime.isArray()) {
                throw new IllegalStateException(formatFetchError("unexpected hot JSON"));
            }
            for (JsonNode row : realtime) {
                if (items.size() >= limit) {
                    break;
                }
                String word = firstNonBlank(row, "word", "note", "word_scheme", "title", "name");
                if (word == null) {
                    continue;
                }
                String scheme = firstNonBlank(row, "word_scheme", "word", "title");
                String query = scheme != null ? scheme : word;
                String url = "https://s.weibo.com/weibo?q="
                        + UriUtils.encodeQueryParam(query, StandardCharsets.UTF_8);
                Map<String, Object> meta = new HashMap<>();
                meta.put("hot", row.path("num").asLong(row.path("hot").asLong(0)));
                meta.put("rank", row.path("rank").asInt(items.size()));
                meta.put("label", row.path("label_name").asText(row.path("label").asText("")));
                meta.put("kind", "hot");
                meta.put("openSource", OPEN_SOURCE_URL);
                String label = meta.get("label").toString();
                String lead = label.isBlank() ? "微博热搜" : "微博热搜 · " + label;
                items.add(new RawItem(
                        word.trim(),
                        url,
                        Instant.now(),
                        SourceType.WEIBO,
                        String.valueOf(ctx.source().id()),
                        lead,
                        meta
                ));
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(formatFetchError("parse failed: " + e.getMessage()), e);
        }
        return items;
    }

    private static String firstNonBlank(JsonNode node, String... keys) {
        for (String key : keys) {
            String v = node.path(key).asText(null);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }
}
