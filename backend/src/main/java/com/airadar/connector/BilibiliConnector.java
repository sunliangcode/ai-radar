package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * B站热门 via open-source {@code bili} CLI
 * (<a href="https://github.com/public-clis/bilibili-cli">public-clis/bilibili-cli</a>).
 * Paste Cookie into source config when login is required — no edits inside the CLI repo.
 */
@Component
public class BilibiliConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(BilibiliConnector.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(90);

    public static final String DEFAULT_CLI = "bili";
    public static final String DEFAULT_SOURCE_NAME = "B站热门";
    public static final int DEFAULT_LIMIT = 20;
    public static final String OPEN_SOURCE_URL = "https://github.com/public-clis/bilibili-cli";

    private final ObjectMapper objectMapper;

    public BilibiliConnector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public static String preferredCliPath() {
        return OpenSourceCliRunner.preferredPath("BILI_CLI_PATH", DEFAULT_CLI);
    }

    @Override
    public SourceType type() {
        return SourceType.BILIBILI;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("BILIBILI", "哔哩哔哩（开源 CLI）", List.of(
                ConnectorDescriptor.ConfigField.path("cliPath", "bili CLI 路径（默认 bili）", false),
                ConnectorDescriptor.ConfigField.secret(
                        "cookie",
                        "浏览器 Cookie（粘贴即可；热门一般可不填；也可用 bili login）",
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
            // Paste-once UX: write into bilibili-cli credential file (no CLI-project setup).
            CliCredentialWriter.writeBilibiliCookie(cookie.trim());
        }
        String out;
        try {
            out = OpenSourceCliRunner.run(
                    cliPath,
                    List.of("hot", "--max", String.valueOf(limit), "--json"),
                    Map.of(),
                    TIMEOUT,
                    "Bilibili"
            );
        } catch (Exception e) {
            throw new IllegalStateException(formatFetchError(e.getMessage()), e);
        }
        List<RawItem> items = parseHotJson(out, ctx, limit);
        log.debug("Bilibili CLI fetched {} items for {}", items.size(), ctx.source().name());
        return items;
    }

    static String formatFetchError(String detail) {
        String d = detail == null ? "" : detail;
        String lower = d.toLowerCase();
        if (lower.contains("login") || lower.contains("auth") || lower.contains("cookie")) {
            return "Bilibili auth failed — paste Cookie or run `bili login`";
        }
        if (d.isBlank()) {
            return "Bilibili CLI failed — install " + OPEN_SOURCE_URL;
        }
        return "Bilibili CLI failed: " + d;
    }

    private String resolveCliPath(FetchContext ctx) {
        String fromEnv = System.getenv("BILI_CLI_PATH");
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
            JsonNode list = root.path("data").path("items");
            if (!list.isArray()) {
                list = root.path("data").path("list");
            }
            if (!list.isArray()) {
                list = root.path("items");
            }
            if (!list.isArray() && root.isArray()) {
                list = root;
            }
            if (!list.isArray()) {
                throw new IllegalStateException(formatFetchError("unexpected hot JSON"));
            }
            for (JsonNode video : list) {
                if (items.size() >= limit) {
                    break;
                }
                String bvid = firstNonBlank(video, "bvid", "bv_id", "id");
                String title = firstNonBlank(video, "title", "name");
                if (title == null || title.isBlank()) {
                    continue;
                }
                String url = firstNonBlank(video, "url", "link", "short_link_v2");
                if (url == null || url.isBlank()) {
                    if (bvid == null || bvid.isBlank()) {
                        continue;
                    }
                    url = "https://www.bilibili.com/video/" + bvid.trim();
                }
                long pubdate = video.path("pubdate").asLong(video.path("ctime").asLong(0));
                Instant published = pubdate > 0 ? Instant.ofEpochSecond(pubdate) : Instant.now();
                if (published.isBefore(ctx.since())) {
                    continue;
                }
                String desc = firstNonBlank(video, "desc", "description", "intro");
                if (desc == null || "-".equals(desc)) {
                    desc = "";
                }
                JsonNode owner = video.path("owner");
                if (owner.isMissingNode()) {
                    owner = video.path("author");
                }
                JsonNode stat = video.path("stat");
                Map<String, Object> meta = new HashMap<>();
                meta.put("bvid", bvid == null ? "" : bvid);
                meta.put("author", firstNonBlank(owner, "name", "uname", "author") == null
                        ? ""
                        : firstNonBlank(owner, "name", "uname", "author"));
                meta.put("view", stat.path("view").asInt(video.path("view").asInt(0)));
                meta.put("like", stat.path("like").asInt(video.path("like").asInt(0)));
                meta.put("kind", "video");
                meta.put("openSource", OPEN_SOURCE_URL);
                items.add(new RawItem(
                        title.trim(),
                        url.trim(),
                        published,
                        SourceType.BILIBILI,
                        String.valueOf(ctx.source().id()),
                        desc,
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
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        for (String key : keys) {
            String v = node.path(key).asText(null);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }
}
