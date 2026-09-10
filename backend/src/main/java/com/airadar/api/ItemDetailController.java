package com.airadar.api;

import com.airadar.connector.ZhihuConnector;
import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lazily fetches full article content on demand. For Zhihu answers it shells out
 * to the local zhihu-cli-go binary (which holds the logged-in cookie) so the UI can
 * expand an answer in place without leaving the page.
 */
@RestController
@RequestMapping("/api/items")
public class ItemDetailController {

    private static final Logger log = LoggerFactory.getLogger(ItemDetailController.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(45);
    private static final Pattern ANSWER_ID = Pattern.compile("/answer/(\\d+)");

    private final NewsItemRepository repository;
    private final EntityMapper mapper;
    private final ObjectMapper objectMapper;

    public ItemDetailController(NewsItemRepository repository, EntityMapper mapper, ObjectMapper objectMapper) {
        this.repository = repository;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{id}/detail")
    public Map<String, Object> detail(@PathVariable Long id) {
        NewsItemEntity entity = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("item not found: " + id));
        NewsItem item = mapper.toDomain(entity);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("url", item.getCanonicalUrl());
        out.put("title", item.getTitle());

        if (item.getPrimarySourceType() == SourceType.ZHIHU) {
            Matcher m = ANSWER_ID.matcher(item.getCanonicalUrl() == null ? "" : item.getCanonicalUrl());
            if (m.find()) {
                try {
                    return buildZhihuDetail(item, Long.parseLong(m.group(1)), out);
                } catch (Exception e) {
                    log.warn("Zhihu detail fetch failed for answer {}: {}", m.group(1), e.getMessage());
                }
            }
        }
        // Fallback: whatever we already stored
        out.put("kind", "plain");
        out.put("text", item.getContentSnippet() != null ? item.getContentSnippet() : item.getSummary());
        return out;
    }

    private Map<String, Object> buildZhihuDetail(NewsItem item, long answerId, Map<String, Object> out) throws Exception {
        String cli = resolveCli();
        String json = runCli(cli, List.of("answer", String.valueOf(answerId), "--json"));
        JsonNode root = objectMapper.readTree(json);

        out.put("kind", "zhihu");
        out.put("html", root.path("content").asText(""));
        out.put("voteup", root.path("voteup_count").asInt(0));
        out.put("commentCount", root.path("comment_count").asInt(0));
        JsonNode author = root.path("author");
        out.put("author", author.path("name").asText(""));
        out.put("authorHeadline", author.path("headline").asText(""));
        JsonNode question = root.path("question");
        out.put("questionTitle", question.path("title").asText(item.getTitle()));
        out.put("questionId", question.path("id").asLong(0));

        // Comments are only emitted in plain-text mode (--json omits them).
        int wantComments = Math.min(30, Math.max(10, root.path("comment_count").asInt(10)));
        try {
            String commentsText = runCli(cli, List.of(
                    "answer", String.valueOf(answerId),
                    "--comments", "--limit", String.valueOf(wantComments)
            ));
            out.put("comments", parseComments(commentsText));
        } catch (Exception e) {
            log.debug("Zhihu comments fetch failed for answer {}: {}", answerId, e.getMessage());
            out.put("comments", List.of());
        }
        return out;
    }

    private static List<Map<String, String>> parseComments(String raw) {
        List<Map<String, String>> comments = new ArrayList<>();
        if (raw == null || raw.isBlank()) return comments;
        String[] lines = raw.split("\\R");
        boolean inComments = false;
        java.util.regex.Pattern linePat = java.util.regex.Pattern.compile("^\\s*(\\d+)\\.\\s+(.+?):\\s+(.*)$");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.contains("评论") && !linePat.matcher(trimmed).matches()) {
                inComments = true;
                continue;
            }
            if (!inComments) continue;
            java.util.regex.Matcher m = linePat.matcher(trimmed);
            if (m.matches()) {
                Map<String, String> c = new LinkedHashMap<>();
                c.put("author", m.group(2).trim());
                c.put("content", m.group(3).trim());
                comments.add(c);
            }
        }
        return comments;
    }

    private static String resolveCli() {
        String env = System.getenv("ZHIHU_CLI_PATH");
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        return ZhihuConnector.DEFAULT_CLI;
    }

    private static String runCli(String cli, List<String> args) throws Exception {
        List<String> command = new ArrayList<>();
        command.add(cli);
        command.addAll(args);
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        StringBuilder stdout = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (stdout.length() > 0) stdout.append('\n');
                stdout.append(line);
            }
        }
        boolean finished = process.waitFor(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("zhihu CLI timed out");
        }
        if (process.exitValue() != 0) {
            throw new IllegalStateException("zhihu CLI exit " + process.exitValue() + ": "
                    + stdout.substring(0, Math.min(300, stdout.length())));
        }
        // Strip ANSI escape sequences (colors) so regex parsing works.
        return stdout.toString().replaceAll("\\u001B\\[[;\\d]*[A-Za-z]", "");
    }
}
