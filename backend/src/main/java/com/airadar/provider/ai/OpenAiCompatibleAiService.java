package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import com.airadar.interest.InterestSignalsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@Component
public class OpenAiCompatibleAiService implements AiService {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleAiService.class);
    private static final String SYSTEM_PROMPT = "You are a careful JSON-only assistant.";

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final RadarProperties properties;
    private final InterestSignalsService interestSignals;
    private final AiCallMonitor monitor;
    private final AiCallGate aiCallGate;
    private final String scorePromptTemplate;
    private final String summarizePromptTemplate;
    private final String summarizeBatchPromptTemplate;
    private final String assignEventPromptTemplate;
    private final String eventIntelligencePromptTemplate;
    private final String webExtractPromptTemplate;
    private final String extractContextPromptTemplate;
    private final String analyzeImpactPromptTemplate;
    private final String suggestOpportunityPromptTemplate;
    private final String extractPreferencePromptTemplate;
    private final String suggestItemActionPromptTemplate;

    public OpenAiCompatibleAiService(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            RadarProperties properties,
            InterestSignalsService interestSignals,
            AiCallMonitor monitor,
            AiCallGate aiCallGate
    ) throws IOException {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.interestSignals = interestSignals;
        this.monitor = monitor;
        this.aiCallGate = aiCallGate;
        this.scorePromptTemplate = readPrompt("prompts/score.md");
        this.summarizePromptTemplate = readPrompt("prompts/summarize.md");
        this.summarizeBatchPromptTemplate = readPrompt("prompts/summarize-batch.md");
        this.assignEventPromptTemplate = readPrompt("prompts/assign_event.md");
        this.eventIntelligencePromptTemplate = readPrompt("prompts/event_intelligence.md");
        this.webExtractPromptTemplate = readPrompt("prompts/web-extract.md");
        this.extractContextPromptTemplate = readPrompt("prompts/extract_context.md");
        this.analyzeImpactPromptTemplate = readPrompt("prompts/analyze_impact.md");
        this.suggestOpportunityPromptTemplate = readPrompt("prompts/suggest_opportunity.md");
        this.extractPreferencePromptTemplate = readPrompt("prompts/extract_preference.md");
        this.suggestItemActionPromptTemplate = readPrompt("prompts/suggest_item_action.md");
    }

    private String interestProfile() {
        return truncate(interestSignals.effectiveInterestProfile(), 800);
    }

    private String dislikeProfile() {
        return truncate(interestSignals.effectiveDislikeProfile(), 600);
    }

    private String language() {
        String lang = properties.getSummaryLanguage();
        return lang == null || lang.isBlank() ? "zh" : lang;
    }

    @Override
    public List<ScoreResult> score(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        ensureLlmReady();
        ArrayNode payloadItems = objectMapper.createArrayNode();
        for (int i = 0; i < items.size(); i++) {
            NewsItem item = items.get(i);
            ObjectNode node = objectMapper.createObjectNode();
            node.put("index", i);
            node.put("title", truncate(nullToEmpty(item.getTitle()), 200));
            node.put("url", truncate(nullToEmpty(item.getCanonicalUrl()), 200));
            node.put("snippet", truncate(nullToEmpty(item.getContentSnippet()), 300));
            node.put("sourceType", item.getPrimarySourceType() == null ? "" : item.getPrimarySourceType().name());
            payloadItems.add(node);
        }
        String prompt = scorePromptTemplate
                .replace("{{language}}", language())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{dislikeProfile}}", dislikeProfile().isBlank() ? "(none)" : dislikeProfile())
                .replace("{{itemsJson}}", payloadItems.toPrettyString());

        JsonNode response = chatJson("score", prompt);
        return parseScoreResults(response, items.size());
    }

    @Override
    public String summarize(NewsItem item) {
        return summarizeDetailed(item).summary();
    }

    @Override
    public SummarizeResult summarizeDetailed(NewsItem item) {
        ensureLlmReady();
        String prompt = summarizePromptTemplate
                .replace("{{language}}", language())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", truncate(nullToEmpty(item.getTitle()), 200))
                .replace("{{url}}", truncate(nullToEmpty(item.getCanonicalUrl()), 200))
                .replace("{{snippet}}", truncate(nullToEmpty(item.getContentSnippet()), 600))
                .replace("{{scoreReason}}", truncate(nullToEmpty(item.getScoreReason()), 300));
        JsonNode response = chatJson("summarize", prompt);
        JsonNode summary = response.path("summary");
        if (summary.isMissingNode() || summary.asText().isBlank()) {
            throw new IllegalStateException("Empty summary from model");
        }
        String titleDisplay = response.path("titleDisplay").asText("").trim();
        if (titleDisplay.isBlank()) {
            titleDisplay = null;
        }
        return new SummarizeResult(summary.asText().trim(), titleDisplay);
    }

    @Override
    public List<String> summarizeBatch(List<NewsItem> items) {
        return summarizeDetailedBatch(items).stream().map(SummarizeResult::summary).toList();
    }

    @Override
    public List<SummarizeResult> summarizeDetailedBatch(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        if (items.size() == 1) {
            return List.of(summarizeDetailed(items.getFirst()));
        }
        ensureLlmReady();
        ArrayNode payloadItems = objectMapper.createArrayNode();
        for (int i = 0; i < items.size(); i++) {
            NewsItem item = items.get(i);
            ObjectNode node = objectMapper.createObjectNode();
            node.put("index", i);
            node.put("title", truncate(nullToEmpty(item.getTitle()), 200));
            node.put("url", truncate(nullToEmpty(item.getCanonicalUrl()), 200));
            node.put("snippet", truncate(nullToEmpty(item.getContentSnippet()), 300));
            node.put("scoreReason", truncate(nullToEmpty(item.getScoreReason()), 200));
            payloadItems.add(node);
        }
        String prompt = summarizeBatchPromptTemplate
                .replace("{{language}}", language())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{itemsJson}}", payloadItems.toPrettyString());
        JsonNode response = chatJson("summarizeBatch", prompt);
        List<SummarizeResult> results = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            results.add(SummarizeResult.of(""));
        }
        JsonNode arr = response.path("items");
        if (arr.isArray()) {
            for (JsonNode node : arr) {
                int index = node.path("index").asInt(-1);
                if (index < 0 || index >= items.size()) {
                    continue;
                }
                String summary = node.path("summary").asText("").trim();
                String titleDisplay = node.path("titleDisplay").asText("").trim();
                results.set(index, new SummarizeResult(summary, titleDisplay.isBlank() ? null : titleDisplay));
            }
        } else if (response.has("summary") && items.size() == 1) {
            String titleDisplay = response.path("titleDisplay").asText("").trim();
            results.set(0, new SummarizeResult(
                    response.path("summary").asText("").trim(),
                    titleDisplay.isBlank() ? null : titleDisplay
            ));
        }
        for (int i = 0; i < results.size(); i++) {
            if (results.get(i).summary() == null || results.get(i).summary().isBlank()) {
                results.set(i, summarizeDetailed(items.get(i)));
            }
        }
        return results;
    }

    @Override
    public String extractPreferenceKeyword(String title, String summary, String kind) {
        ensureLlmReady();
        String prompt = extractPreferencePromptTemplate
                .replace("{{language}}", language())
                .replace("{{kind}}", nullToEmpty(kind))
                .replace("{{title}}", truncate(nullToEmpty(title), 200))
                .replace("{{summary}}", truncate(nullToEmpty(summary), 400));
        JsonNode response = chatJson("extractPreference", prompt);
        String keyword = response.path("keyword").asText("").trim();
        return keyword.isBlank() ? null : keyword;
    }

    @Override
    public ItemActionSuggestion suggestItemAction(String title, String url, String summary) {
        ensureLlmReady();
        String prompt = suggestItemActionPromptTemplate
                .replace("{{language}}", language())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", truncate(nullToEmpty(title), 200))
                .replace("{{url}}", truncate(nullToEmpty(url), 200))
                .replace("{{summary}}", truncate(nullToEmpty(summary), 600));
        JsonNode response = chatJson("suggestItemAction", prompt);
        boolean shouldAct = response.path("shouldAct").asBoolean(false);
        if (!shouldAct) {
            return ItemActionSuggestion.none();
        }
        List<String> steps = new ArrayList<>();
        JsonNode stepsNode = response.path("steps");
        if (stepsNode.isArray()) {
            stepsNode.forEach(n -> {
                String s = n.asText("").trim();
                if (!s.isBlank()) {
                    steps.add(s);
                }
            });
        }
        return new ItemActionSuggestion(
                true,
                response.path("title").asText("Next step").trim(),
                steps.isEmpty() ? List.of("Review the article and decide next step") : steps,
                response.path("estimatedMinutes").asInt(30),
                response.path("successCriteria").asText("").trim()
        );
    }

    @Override
    public EventAssignResult assignEvent(NewsItem item, List<EventCandidate> candidates) {
        ensureLlmReady();
        ArrayNode cand = objectMapper.createArrayNode();
        List<EventCandidate> list = candidates == null ? List.of() : candidates;
        int limit = Math.min(8, list.size());
        for (int i = 0; i < limit; i++) {
            EventCandidate c = list.get(i);
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", c.id());
            n.put("title", truncate(nullToEmpty(c.title()), 120));
            n.put("summary", truncate(nullToEmpty(c.summary()), 200));
            n.put("score", c.score());
            cand.add(n);
        }
        String prompt = assignEventPromptTemplate
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", truncate(nullToEmpty(item.getTitle()), 200))
                .replace("{{url}}", truncate(nullToEmpty(item.getCanonicalUrl()), 200))
                .replace("{{snippet}}", truncate(nullToEmpty(item.getContentSnippet()), 400))
                .replace("{{candidatesJson}}", cand.toPrettyString());
        JsonNode response = chatJson("assignEvent", prompt);
        boolean createNew = response.path("createNew").asBoolean(true);
        double confidence = response.path("confidence").asDouble(0.5);
        String reason = response.path("reason").asText("");
        String title = response.path("title").asText(nullToEmpty(item.getTitle()));
        if (confidence < 0.55) {
            createNew = true;
        }
        if (createNew) {
            return EventAssignResult.create(title.isBlank() ? nullToEmpty(item.getTitle()) : title, confidence, reason);
        }
        long eventId = response.path("eventId").asLong(-1);
        if (eventId <= 0) {
            return EventAssignResult.create(title, confidence, reason + ";missing_eventId");
        }
        return EventAssignResult.assign(eventId, title, confidence, reason);
    }

    @Override
    public EventIntelligence refreshEventIntelligence(String eventTitle, List<NewsItem> memberItems) {
        ensureLlmReady();
        ArrayNode itemsJson = objectMapper.createArrayNode();
        if (memberItems != null) {
            int limit = Math.min(6, memberItems.size());
            for (int i = 0; i < limit; i++) {
                NewsItem item = memberItems.get(i);
                ObjectNode n = objectMapper.createObjectNode();
                n.put("title", truncate(nullToEmpty(item.getTitle()), 120));
                n.put("summary", truncate(nullToEmpty(item.getSummary()), 200));
                n.put("url", truncate(nullToEmpty(item.getCanonicalUrl()), 200));
                n.put("score", item.getScore() == null ? 0 : item.getScore());
                itemsJson.add(n);
            }
        }
        String prompt = eventIntelligencePromptTemplate
                .replace("{{language}}", properties.getSummaryLanguage())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", truncate(nullToEmpty(eventTitle), 200))
                .replace("{{itemsJson}}", itemsJson.toPrettyString());
        JsonNode response = chatJson("eventIntelligence", prompt);
        return new EventIntelligence(
                response.path("summary").asText(""),
                response.path("impact").asText(""),
                response.path("watchNext").asText("")
        );
    }

    @Override
    public List<ExtractedItem> extractItems(String content, String extractionPrompt) {
        ensureLlmReady();
        String prompt = webExtractPromptTemplate
                .replace("{{extractionPrompt}}", truncate(nullToEmpty(extractionPrompt), 500))
                .replace("{{content}}", truncate(nullToEmpty(content), 4000));
        JsonNode response = chatJson("extractItems", prompt);
        List<ExtractedItem> items = new ArrayList<>();
        JsonNode arr = response.path("items");
        if (!arr.isArray()) {
            return items;
        }
        for (JsonNode node : arr) {
            String title = node.path("title").asText("").trim();
            String url = node.path("url").asText("").trim();
            String body = node.path("content").asText("").trim();
            if (title.isBlank() || url.isBlank()) {
                continue;
            }
            items.add(new ExtractedItem(title, url, body));
            if (items.size() >= 10) {
                break;
            }
        }
        return items;
    }

    @Override
    public ContextExtractResult extractContext(String text) {
        ensureLlmReady();
        String prompt = extractContextPromptTemplate.replace("{{text}}", truncate(nullToEmpty(text), 4000));
        JsonNode response = chatJson("extractContext", prompt);
        return parseContext(response);
    }

    @Override
    public ImpactAnalysisResult analyzeImpact(String contextJson, String title, String summary, String eventImpact, String memoryHints) {
        ensureLlmReady();
        String prompt = analyzeImpactPromptTemplate
                .replace("{{memory}}", truncate(nullToEmpty(memoryHints), 500))
                .replace("{{context}}", truncate(nullToEmpty(contextJson), 2000))
                .replace("{{title}}", truncate(nullToEmpty(title), 200))
                .replace("{{summary}}", truncate(nullToEmpty(summary), 800))
                .replace("{{eventImpact}}", truncate(nullToEmpty(eventImpact), 500));
        JsonNode response = chatJson("analyzeImpact", prompt);
        return parseImpact(response);
    }

    @Override
    public OpportunitySuggestion suggestOpportunity(String contextJson, String title, String why, String recommendation) {
        ensureLlmReady();
        String prompt = suggestOpportunityPromptTemplate
                .replace("{{context}}", truncate(nullToEmpty(contextJson), 2000))
                .replace("{{title}}", truncate(nullToEmpty(title), 200))
                .replace("{{why}}", truncate(nullToEmpty(why), 800))
                .replace("{{recommendation}}", truncate(nullToEmpty(recommendation), 800));
        JsonNode response = chatJson("suggestOpportunity", prompt);
        List<String> steps = new ArrayList<>();
        JsonNode stepsNode = response.path("steps");
        if (stepsNode.isArray()) {
            stepsNode.forEach(n -> steps.add(n.asText()));
        }
        if (steps.isEmpty()) {
            steps.add("Try a small pilot");
        }
        String kind = response.path("kind").asText("OPPORTUNITY");
        if (!"RISK".equalsIgnoreCase(kind)) {
            kind = "OPPORTUNITY";
        } else {
            kind = "RISK";
        }
        return new OpportunitySuggestion(
                kind,
                response.path("title").asText("Opportunity"),
                response.path("summary").asText(""),
                response.path("estimatedHoursPerMonth").asDouble(4),
                response.path("coveragePct").asDouble(30),
                response.path("actionTitle").asText("Start a trial"),
                steps,
                response.path("estimatedMinutes").asInt(60),
                response.path("successCriteria").asText("")
        );
    }

    @SuppressWarnings("unchecked")
    private ContextExtractResult parseContext(JsonNode response) {
        Map<String, Object> profile = objectMapper.convertValue(
                response.path("profile").isMissingNode() ? objectMapper.createObjectNode() : response.path("profile"),
                Map.class);
        List<Map<String, Object>> projects = new ArrayList<>();
        JsonNode projectsNode = response.path("projects");
        if (projectsNode.isArray()) {
            for (JsonNode p : projectsNode) {
                projects.add(objectMapper.convertValue(p, Map.class));
            }
        }
        List<String> technologies = readStringList(response.path("technologies"));
        List<String> interests = readStringList(response.path("interests"));
        List<String> goals = readStringList(response.path("goals"));
        Map<String, Object> preferences = objectMapper.convertValue(
                response.path("preferences").isMissingNode() ? objectMapper.createObjectNode() : response.path("preferences"),
                Map.class);
        return new ContextExtractResult(profile, projects, technologies, interests, goals, preferences);
    }

    private ImpactAnalysisResult parseImpact(JsonNode response) {
        String tier = response.path("tier").asText("MEDIUM").toUpperCase();
        if (!List.of("HIGH", "MEDIUM", "LOW", "IGNORE").contains(tier)) {
            tier = "MEDIUM";
        }
        return new ImpactAnalysisResult(
                clamp(response.path("relevance").asDouble(50)),
                clamp(response.path("impact").asDouble(50)),
                clamp(response.path("urgency").asDouble(40)),
                clamp(response.path("confidence").asDouble(50)),
                clamp(response.path("effort").asDouble(50)),
                response.path("why").asText(""),
                response.path("evidence").asText(""),
                response.path("recommendation").asText(""),
                tier
        );
    }

    private static List<String> readStringList(JsonNode node) {
        List<String> out = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(n -> {
                String v = n.asText("").trim();
                if (!v.isBlank()) {
                    out.add(v);
                }
            });
        }
        return out;
    }

    private static double clamp(double v) {
        return Math.max(0, Math.min(100, v));
    }

    private List<ScoreResult> parseScoreResults(JsonNode response, int expected) {
        List<ScoreResult> results = new ArrayList<>();
        for (int i = 0; i < expected; i++) {
            results.add(new ScoreResult(0, "unscored", List.of(), "other"));
        }
        JsonNode arr = response.path("items");
        if (!arr.isArray()) {
            if (response.has("score")) {
                results.set(0, toScoreResult(response));
            }
            return results;
        }
        for (JsonNode node : arr) {
            int index = node.path("index").asInt(-1);
            if (index < 0 || index >= expected) {
                continue;
            }
            results.set(index, toScoreResult(node));
        }
        return results;
    }

    private ScoreResult toScoreResult(JsonNode node) {
        double score = node.path("score").asDouble(0);
        score = Math.max(0, Math.min(100, score));
        String reason = node.path("reason").asText("");
        String category = node.path("category").asText("other");
        List<String> tags = new ArrayList<>();
        JsonNode tagsNode = node.path("tags");
        if (tagsNode.isArray()) {
            tagsNode.forEach(t -> tags.add(t.asText()));
        }
        return new ScoreResult(score, reason, tags, category);
    }

    /**
     * Each call is a fresh single-turn conversation: system + user only.
     * Local Ollama uses SSE streaming so the monitor UI can show tokens live.
     * Process-wide {@link AiCallGate} ensures only one LLM HTTP call at a time.
     */
    private JsonNode chatJson(String operation, String userPrompt) {
        return aiCallGate.call(() -> chatJsonUnlocked(operation, userPrompt));
    }

    private JsonNode chatJsonUnlocked(String operation, String userPrompt) {
        RadarProperties.OpenAi cfg = properties.getOpenai();
        String baseUrl = trimTrailingSlash(cfg.getBaseUrl());
        int contextWindow = Math.max(1024, cfg.getContextWindowTokens());
        int maxCompletion = Math.max(64, Math.min(cfg.getMaxCompletionTokens(), contextWindow / 2));
        int promptBudget = Math.max(512, contextWindow - maxCompletion);

        BudgetFit fit = fitToBudget(SYSTEM_PROMPT, userPrompt, promptBudget);
        String finalPrompt = fit.prompt();
        boolean truncated = fit.truncated();
        boolean stream = isLocalOllama(baseUrl);

        Map<String, Object> body = new HashMap<>();
        body.put("model", cfg.getModel());
        body.put("temperature", 0.2);
        body.put("max_tokens", maxCompletion);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", finalPrompt)
        ));
        if (!stream) {
            body.put("response_format", Map.of("type", "json_object"));
            body.put("stream", false);
        } else {
            body.put("stream", true);
            String keepAlive = cfg.getKeepAlive();
            if (keepAlive != null && !keepAlive.isBlank()) {
                body.put("keep_alive", keepAlive);
            }
            // Cap Ollama KV cache to the configured context window (not just client truncation).
            body.put("options", Map.of("num_ctx", contextWindow));
        }

        int maxAttempts = 1 + Math.max(0, cfg.getMaxRetries());
        long backoffBase = Math.max(0L, cfg.getRetryBackoffMs());
        int estimatedPromptTokens = estimateTokens(SYSTEM_PROMPT) + estimateTokens(finalPrompt);
        Exception lastError = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            long start = System.currentTimeMillis();
            String callId = monitor.begin(operation, cfg.getModel(), finalPrompt, contextWindow);
            try {
                String content;
                int promptTokens;
                int completionTokens;
                Long decodeMs = null;
                if (stream) {
                    StreamResult streamResult = chatJsonStream(baseUrl, cfg, body, callId);
                    content = streamResult.content();
                    decodeMs = streamResult.decodeMs();
                    promptTokens = estimatedPromptTokens;
                    completionTokens = estimateTokens(content);
                } else {
                    var request = restClientBuilder.build()
                            .post()
                            .uri(baseUrl + "/chat/completions")
                            .header("Content-Type", "application/json");
                    if (cfg.hasApiKey()) {
                        request = request.header("Authorization", "Bearer " + cfg.getApiKey());
                    }
                    String raw = request
                            .body(body)
                            .retrieve()
                            .body(String.class);

                    JsonNode root = objectMapper.readTree(raw);
                    content = root.path("choices").path(0).path("message").path("content").asText();
                    promptTokens = root.path("usage").path("prompt_tokens").asInt(estimatedPromptTokens);
                    completionTokens = root.path("usage").path("completion_tokens").asInt(estimateTokens(content));
                }

                long latency = System.currentTimeMillis() - start;
                log.info("ai_call op={} model={} latencyMs={} promptTokens≈{} completionTokens≈{} truncated={} budget={} stream={} decodeMs={} attempt={}/{}",
                        operation, cfg.getModel(), latency, promptTokens, completionTokens, truncated, promptBudget, stream, decodeMs,
                        attempt, maxAttempts);

                monitor.complete(callId, AiCallMonitor.AiCallRecord.success(
                        operation, cfg.getModel(), promptTokens, completionTokens, contextWindow, latency, truncated,
                        finalPrompt, content, decodeMs
                ));

                String cleaned = stripCodeFence(content);
                return objectMapper.readTree(cleaned);
            } catch (Exception e) {
                lastError = e;
                long latency = System.currentTimeMillis() - start;
                boolean canRetry = attempt < maxAttempts && isRetryableAiError(e);
                if (canRetry) {
                    long sleepMs = backoffBase * (1L << (attempt - 1));
                    log.warn("AI call failed attempt={}/{} retrying in {}ms: {}",
                            attempt, maxAttempts, sleepMs, e.getMessage());
                    monitor.clearInFlight(callId);
                    if (sleepMs > 0) {
                        try {
                            Thread.sleep(sleepMs);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            monitor.complete(callId, AiCallMonitor.AiCallRecord.failure(
                                    operation, cfg.getModel(), estimatedPromptTokens, contextWindow, latency, truncated,
                                    ie.getMessage(), finalPrompt
                            ));
                            throw new IllegalStateException("AI call interrupted during retry", ie);
                        }
                    }
                    continue;
                }
                monitor.complete(callId, AiCallMonitor.AiCallRecord.failure(
                        operation, cfg.getModel(), estimatedPromptTokens, contextWindow, latency, truncated,
                        e.getMessage(), finalPrompt
                ));
                throw new IllegalStateException("AI call failed: " + e.getMessage(), e);
            }
        }
        throw new IllegalStateException("AI call failed: " + (lastError != null ? lastError.getMessage() : "unknown"), lastError);
    }

    /** Transient network / upstream errors worth retrying; permanent auth/client errors are not. */
    static boolean isRetryableAiError(Throwable e) {
        if (e == null) {
            return false;
        }
        for (Throwable t = e; t != null; t = t.getCause()) {
            String msg = t.getMessage() == null ? "" : t.getMessage().toLowerCase(Locale.ROOT);
            String name = t.getClass().getName().toLowerCase(Locale.ROOT);
            if (msg.contains("401") || msg.contains("403") || msg.contains("400")
                    || msg.contains("unauthorized") || msg.contains("forbidden") || msg.contains("bad request")) {
                return false;
            }
            if (name.contains("sockettimeout") || name.contains("connectexception")
                    || name.contains("httptimeout") || name.contains("resourceaccessexception")
                    || name.contains("httpconnect") || name.contains("interruptedio")) {
                return true;
            }
            if (msg.contains("429") || msg.contains("502") || msg.contains("503") || msg.contains("504")
                    || msg.contains("timeout") || msg.contains("timed out") || msg.contains("connection reset")
                    || msg.contains("connection refused") || msg.contains("empty") || msg.contains("incomplete")
                    || msg.contains("temporarily unavailable") || msg.contains("too many requests")) {
                return true;
            }
        }
        // Unknown HTTP/IO failures: retry once-class of errors (default allow for RestClient/IO)
        String top = e.getClass().getName().toLowerCase(Locale.ROOT);
        return top.contains("restclient") || top.contains("ioexception") || top.contains("http");
    }

    private record StreamResult(String content, Long decodeMs) {
    }

    private StreamResult chatJsonStream(String baseUrl, RadarProperties.OpenAi cfg, Map<String, Object> body, String callId)
            throws IOException, InterruptedException {
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofMillis(Math.max(60_000, properties.getFetchTimeoutMs())))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));
        if (cfg.hasApiKey()) {
            builder.header("Authorization", "Bearer " + cfg.getApiKey());
        }
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        long requestStart = System.currentTimeMillis();
        HttpResponse<InputStream> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() >= 400) {
            String err = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new IllegalStateException("HTTP " + response.statusCode() + ": " + truncate(err, 300));
        }
        StringBuilder content = new StringBuilder();
        Long firstTokenAt = null;
        Long lastTokenAt = null;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank() || !line.startsWith("data:")) {
                    continue;
                }
                String data = line.substring(5).trim();
                if ("[DONE]".equals(data)) {
                    break;
                }
                try {
                    JsonNode chunk = objectMapper.readTree(data);
                    String delta = chunk.path("choices").path(0).path("delta").path("content").asText("");
                    if (delta.isEmpty()) {
                        delta = chunk.path("choices").path(0).path("message").path("content").asText("");
                    }
                    if (!delta.isEmpty()) {
                        long now = System.currentTimeMillis();
                        if (firstTokenAt == null) {
                            firstTokenAt = now;
                        }
                        lastTokenAt = now;
                        content.append(delta);
                        monitor.appendDelta(callId, delta);
                    }
                } catch (Exception parseErr) {
                    log.debug("sse_chunk_skip error={}", parseErr.getMessage());
                }
            }
        }
        if (content.isEmpty()) {
            throw new IllegalStateException("Empty streamed response from model");
        }
        Long decodeMs = null;
        if (firstTokenAt != null && lastTokenAt != null && lastTokenAt > firstTokenAt) {
            decodeMs = lastTokenAt - firstTokenAt;
        } else if (firstTokenAt != null) {
            decodeMs = Math.max(1L, firstTokenAt - requestStart);
        }
        return new StreamResult(content.toString(), decodeMs);
    }

    /** True for local Ollama-style OpenAI-compatible endpoints (streaming enabled). */
    static boolean isLocalOllama(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return false;
        }
        String u = baseUrl.toLowerCase(Locale.ROOT);
        return u.contains("localhost") || u.contains("127.0.0.1") || u.contains("0.0.0.0")
                || u.contains(":11434");
    }

    private record BudgetFit(String prompt, boolean truncated) {
    }

    private BudgetFit fitToBudget(String system, String userPrompt, int promptBudget) {
        int systemTokens = estimateTokens(system);
        int available = Math.max(256, promptBudget - systemTokens);
        int userTokens = estimateTokens(userPrompt);
        if (userTokens <= available) {
            return new BudgetFit(userPrompt, false);
        }
        // Approximate chars-per-token using current estimate; shrink until under budget.
        String trimmed = userPrompt;
        int guard = 0;
        while (estimateTokens(trimmed) > available && trimmed.length() > 64 && guard < 20) {
            double ratio = (double) available / estimateTokens(trimmed);
            int newLen = Math.max(64, (int) (trimmed.length() * Math.min(0.95, ratio * 0.9)));
            trimmed = trimmed.substring(0, newLen) + "\n...[truncated to fit context window]";
            guard++;
        }
        log.warn("ai_prompt_truncated op_budget={} estimatedBefore={} estimatedAfter={}",
                available, userTokens, estimateTokens(trimmed));
        return new BudgetFit(trimmed, true);
    }

    private void ensureLlmReady() {
        if (!properties.getOpenai().isLlmReady()) {
            throw new IllegalStateException("LLM is not configured (set local Ollama URL/model or OPENAI_API_KEY)");
        }
    }

    private static String readPrompt(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        return resource.getContentAsString(StandardCharsets.UTF_8);
    }

    private static String stripCodeFence(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstNl = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNl > 0 && lastFence > firstNl) {
                return trimmed.substring(firstNl + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    /** Conservative mixed CJK/Latin estimate: CJK ≈ 1 tok/char, else ≈ 4 chars/tok. */
    static int estimateTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        int cjk = 0;
        int other = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (isCjk(c)) {
                cjk++;
            } else {
                other++;
            }
        }
        return Math.max(1, cjk + (other + 3) / 4);
    }

    private static boolean isCjk(char c) {
        Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
        if (block == null) {
            return false;
        }
        return block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_SYMBOLS_AND_PUNCTUATION
                || block == Character.UnicodeBlock.HALFWIDTH_AND_FULLWIDTH_FORMS
                || block == Character.UnicodeBlock.HIRAGANA
                || block == Character.UnicodeBlock.KATAKANA
                || block == Character.UnicodeBlock.HANGUL_SYLLABLES;
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
