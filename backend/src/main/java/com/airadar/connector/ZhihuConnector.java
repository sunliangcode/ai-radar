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
        return ConnectorDescriptor.of("ZHIHU", "知乎", List.of(
                ConnectorDescriptor.ConfigField.path("cliPath", "zhihu CLI 路径", false),
                ConnectorDescriptor.ConfigField.text("limit", "每次条数（默认 5）", false),
                ConnectorDescriptor.ConfigField.text("commentLimit", "每条评论数（默认 10）", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String cliPath = resolveCliPath(ctx);
        int limit = Math.max(1, ConnectorConfigs.integer(ctx, "limit", DEFAULT_LIMIT));
        int commentLimit = Math.max(0, ConnectorConfigs.integer(ctx, "commentLimit", DEFAULT_COMMENT_LIMIT));

        String feedsJson;
        try {
            feedsJson = runCli(cliPath, List.of("feeds", "--json", "--limit", String.valueOf(limit)));
        } catch (Exception e) {
            log.warn("Zhihu: feeds failed for source {}: {}", ctx.source().name(), e.getMessage());
            return List.of();
        }

        List<RawItem> items = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(feedsJson);
            if (!root.isArray()) {
                log.warn("Zhihu: unexpected feeds JSON (not array)");
                return List.of();
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
        } catch (Exception e) {
            log.warn("Zhihu: parse feeds failed for source {}: {}", ctx.source().name(), e.getMessage());
            return List.of();
        }

        log.debug("Zhihu fetched {} items for {}", items.size(), ctx.source().name());
        return items;
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
        List<String> command = new ArrayList<>();
        command.add(cliPath);
        command.addAll(args);
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
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
