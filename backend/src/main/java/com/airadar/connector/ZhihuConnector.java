package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ZhihuConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(ZhihuConnector.class);

    /** Fixed local binary used by seed ensure and as the default fetch path. */
    public static final String DEFAULT_CLI = "/Users/sunliang/workspace/own/zhihu-cli-go/zhihu";
    public static final String DEFAULT_SOURCE_NAME = "知乎推荐";
    public static final int DEFAULT_LIMIT = 5;
    public static final int DEFAULT_COMMENT_LIMIT = 10;

    /** Env override, else the historical machine-local default. */
    public static String preferredCliPath() {
        String fromEnv = System.getenv("ZHIHU_CLI_PATH");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return DEFAULT_CLI;
    }

    public static boolean isCliExecutable(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        try {
            return Files.isExecutable(Path.of(path.trim()));
        } catch (Exception e) {
            return false;
        }
    }

    private static final Duration TIMEOUT = Duration.ofSeconds(120);
    private static final Pattern ANSI = Pattern.compile("\\u001B\\[[;\\d]*[A-Za-z]");
    private static final Pattern COMMENT_LINE = Pattern.compile("^\\s*(\\d+)\\.\\s+(.+?):\\s+(.*)$");

    private final ObjectMapper objectMapper;

    public ZhihuConnector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public SourceType type() {
        return SourceType.ZHIHU;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("ZHIHU", "知乎（开源 CLI）", List.of(
                ConnectorDescriptor.ConfigField.path("cliPath", "zhihu CLI 路径", false),
                ConnectorDescriptor.ConfigField.secret(
                        "cookie",
                        "浏览器 Cookie（粘贴即可；也可用 ZHIHU_COOKIE / zhihu login）",
                        false),
                ConnectorDescriptor.ConfigField.text("limit", "每次条数（默认 5）", false),
                ConnectorDescriptor.ConfigField.text("commentLimit", "每条评论数（默认 10）", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String cliPath = resolveCliPath(ctx);
        int limit = Math.max(1, ConnectorConfigs.integer(ctx, "limit", DEFAULT_LIMIT));
        int commentLimit = Math.max(0, ConnectorConfigs.integer(ctx, "commentLimit", DEFAULT_COMMENT_LIMIT));
        String cookie = ConnectorConfigs.string(ctx, "cookie", "");

        String feedsJson;
        try {
            Map<String, String> env = new HashMap<>();
            if (!cookie.isBlank()) {
                // zhihu-cli-go reads ZHIHU_COOKIE directly — no need to cd into the CLI repo.
                env.put("ZHIHU_COOKIE", cookie.trim());
            }
            feedsJson = runCli(cliPath, List.of("feeds", "--json", "--limit", String.valueOf(limit)), env);
        } catch (Exception e) {
            throw new IllegalStateException(formatFetchError(e.getMessage()), e);
        }

        List<RawItem> items = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(feedsJson);
            if (!root.isArray()) {
                throw new IllegalStateException(formatFetchError(
                        "unexpected feeds JSON (not array); run `zhihu login` if auth expired"));
            }
            for (JsonNode node : root) {
                RawItem item = parseFeedItem(node, ctx, cliPath, commentLimit);
                if (item != null) {
                    items.add(item);
                }
                if (items.size() >= limit) {
                    break;
                }
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(formatFetchError("parse feeds failed: " + e.getMessage()), e);
        }

        log.debug("Zhihu fetched {} items for {}", items.size(), ctx.source().name());
        return items;
    }

    /** Short, actionable message for FetchProgress (auth failures map to `zhihu login`). */
    static String formatFetchError(String detail) {
        String d = detail == null ? "" : detail;
        String lower = d.toLowerCase();
        if (lower.contains("authentication failed")
                || lower.contains("401")
                || lower.contains("err_ticket")
                || lower.contains("zhihu login")
                || lower.contains("未登录")) {
            return "Zhihu auth failed — paste Cookie in source config or run `zhihu login`";
        }
        if (d.isBlank()) {
            return "Zhihu feeds failed";
        }
        if (d.startsWith("Zhihu ")) {
            return d;
        }
        return "Zhihu feeds failed: " + d;
    }

    private RawItem parseFeedItem(JsonNode node, FetchContext ctx, String cliPath, int commentLimit) {
        String type = text(node, "Type", "type");
        JsonNode answer = node.path("Answer");
        if (answer.isMissingNode() || answer.isNull()) {
            answer = node.path("answer");
        }
        JsonNode article = node.path("Article");
        if (article.isMissingNode() || article.isNull()) {
            article = node.path("article");
        }

        if (answer != null && !answer.isMissingNode() && !answer.isNull() && answer.has("id")) {
            return toAnswerItem(answer, ctx, cliPath, commentLimit);
        }
        if (article != null && !article.isMissingNode() && !article.isNull() && article.has("id")) {
            return toArticleItem(article, ctx);
        }
        if ("answer".equalsIgnoreCase(type) && node.has("target")) {
            return toAnswerItem(node.path("target"), ctx, cliPath, commentLimit);
        }
        if ("article".equalsIgnoreCase(type) && node.has("target")) {
            return toArticleItem(node.path("target"), ctx);
        }
        return null;
    }

    private RawItem toAnswerItem(JsonNode answer, FetchContext ctx, String cliPath, int commentLimit) {
        long answerId = answer.path("id").asLong(0);
        if (answerId <= 0) {
            return null;
        }
        JsonNode question = answer.path("question");
        long questionId = question.path("id").asLong(0);
        String title = text(question, "title");
        if (title == null || title.isBlank()) {
            title = "Zhihu answer " + answerId;
        }
        String url = questionId > 0
                ? "https://www.zhihu.com/question/" + questionId + "/answer/" + answerId
                : "https://www.zhihu.com/answer/" + answerId;

        String body = stripHtml(text(answer, "content"));
        int commentCount = answer.path("comment_count").asInt(0);
        if (commentLimit > 0 && commentCount > 0) {
            String comments = fetchAnswerComments(cliPath, answerId, commentLimit);
            if (comments != null && !comments.isBlank()) {
                body = body + "\n\n── 评论 ──\n" + comments;
            }
        }

        Instant published = epochSeconds(answer.path("created_time").asLong(0));
        Map<String, Object> meta = new HashMap<>();
        meta.put("preserveFullText", true);
        meta.put("answerId", answerId);
        meta.put("questionId", questionId);
        meta.put("voteup", answer.path("voteup_count").asInt(0));
        meta.put("commentCount", commentCount);
        meta.put("author", text(answer.path("author"), "name"));
        meta.put("kind", "answer");

        return new RawItem(
                title.trim(),
                url,
                published,
                SourceType.ZHIHU,
                String.valueOf(ctx.source().id()),
                body,
                meta
        );
    }

    private RawItem toArticleItem(JsonNode article, FetchContext ctx) {
        long articleId = article.path("id").asLong(0);
        if (articleId <= 0) {
            return null;
        }
        String title = text(article, "title");
        if (title == null || title.isBlank()) {
            title = "Zhihu article " + articleId;
        }
        String url = "https://zhuanlan.zhihu.com/p/" + articleId;
        String body = stripHtml(text(article, "content"));
        Instant published = epochSeconds(article.path("created").asLong(0));
        if (published.equals(Instant.EPOCH)) {
            published = epochSeconds(article.path("created_time").asLong(0));
        }

        Map<String, Object> meta = new HashMap<>();
        meta.put("preserveFullText", true);
        meta.put("articleId", articleId);
        meta.put("voteup", article.path("voteup_count").asInt(0));
        meta.put("commentCount", article.path("comment_count").asInt(0));
        meta.put("author", text(article.path("author"), "name"));
        meta.put("kind", "article");

        return new RawItem(
                title.trim(),
                url,
                published,
                SourceType.ZHIHU,
                String.valueOf(ctx.source().id()),
                body,
                meta
        );
    }

    private String fetchAnswerComments(String cliPath, long answerId, int commentLimit) {
        try {
            String out = runCli(cliPath, List.of(
                    "answer", String.valueOf(answerId),
                    "--comments",
                    "--limit", String.valueOf(commentLimit)
            ));
            return parseCommentsText(out);
        } catch (Exception e) {
            log.debug("Zhihu: comments failed for answer {}: {}", answerId, e.getMessage());
            return null;
        }
    }

    static String parseCommentsText(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String plain = ANSI.matcher(raw).replaceAll("");
        String[] lines = plain.split("\\R");
        boolean inComments = false;
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.contains("评论") && !COMMENT_LINE.matcher(trimmed).matches()) {
                inComments = true;
                continue;
            }
            if (!inComments) {
                continue;
            }
            Matcher m = COMMENT_LINE.matcher(trimmed);
            if (m.matches()) {
                if (sb.length() > 0) {
                    sb.append('\n');
                }
                sb.append(m.group(2).trim()).append(": ").append(m.group(3).trim());
            }
        }
        return sb.toString();
    }

    private String resolveCliPath(FetchContext ctx) {
        String fromEnv = System.getenv("ZHIHU_CLI_PATH");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return ConnectorConfigs.string(ctx, "cliPath", DEFAULT_CLI);
    }

    private String runCli(String cliPath, List<String> args) throws Exception {
        return runCli(cliPath, args, Map.of());
    }

    private String runCli(String cliPath, List<String> args, Map<String, String> extraEnv) throws Exception {
        List<String> command = new ArrayList<>();
        command.add(cliPath);
        command.addAll(args);
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        if (extraEnv != null && !extraEnv.isEmpty()) {
            pb.environment().putAll(extraEnv);
        }
        Process process = pb.start();
        StringBuilder stdout = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (stdout.length() > 0) {
                    stdout.append('\n');
                }
                stdout.append(line);
            }
        }
        boolean finished = process.waitFor(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("zhihu CLI timed out: " + String.join(" ", command));
        }
        int code = process.exitValue();
        if (code != 0) {
            String msg = stdout.toString();
            if (msg.length() > 400) {
                msg = msg.substring(0, 400);
            }
            throw new IllegalStateException("zhihu CLI exit " + code + ": " + msg);
        }
        return stdout.toString();
    }

    private static Instant epochSeconds(long seconds) {
        if (seconds <= 0) {
            return Instant.now();
        }
        return Instant.ofEpochSecond(seconds);
    }

    private static String text(JsonNode node, String... keys) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        for (String key : keys) {
            JsonNode v = node.path(key);
            if (!v.isMissingNode() && !v.isNull()) {
                String s = v.asText(null);
                if (s != null && !s.isBlank()) {
                    return s;
                }
            }
        }
        return null;
    }

    static String stripHtml(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String text = html
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</p>", "\n")
                .replaceAll("(?i)</div>", "\n")
                .replaceAll("<[^>]+>", " ");
        text = text.replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
        return text.replaceAll("[ \\t\\x0B\\f]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }
}
