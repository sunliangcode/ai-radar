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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiCompatibleAiService implements AiService {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleAiService.class);

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final RadarProperties properties;
    private final InterestSignalsService interestSignals;
    private final String scorePromptTemplate;
    private final String summarizePromptTemplate;
    private final String summarizeBatchPromptTemplate;
    private final String assignEventPromptTemplate;
    private final String eventIntelligencePromptTemplate;
    private final String webExtractPromptTemplate;
    private final String extractContextPromptTemplate;
    private final String analyzeImpactPromptTemplate;
    private final String suggestOpportunityPromptTemplate;

    public OpenAiCompatibleAiService(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            RadarProperties properties,
            InterestSignalsService interestSignals
    ) throws IOException {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.interestSignals = interestSignals;
        this.scorePromptTemplate = readPrompt("prompts/score.md");
        this.summarizePromptTemplate = readPrompt("prompts/summarize.md");
        this.summarizeBatchPromptTemplate = readPrompt("prompts/summarize-batch.md");
        this.assignEventPromptTemplate = readPrompt("prompts/assign_event.md");
        this.eventIntelligencePromptTemplate = readPrompt("prompts/event_intelligence.md");
        this.webExtractPromptTemplate = readPrompt("prompts/web-extract.md");
        this.extractContextPromptTemplate = readPrompt("prompts/extract_context.md");
        this.analyzeImpactPromptTemplate = readPrompt("prompts/analyze_impact.md");
        this.suggestOpportunityPromptTemplate = readPrompt("prompts/suggest_opportunity.md");
    }

    private String interestProfile() {
        return interestSignals.effectiveInterestProfile();
    }

    @Override
    public List<ScoreResult> score(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        ensureApiKey();
        ArrayNode payloadItems = objectMapper.createArrayNode();
        for (int i = 0; i < items.size(); i++) {
            NewsItem item = items.get(i);
            ObjectNode node = objectMapper.createObjectNode();
            node.put("index", i);
            node.put("title", nullToEmpty(item.getTitle()));
            node.put("url", nullToEmpty(item.getCanonicalUrl()));
            node.put("snippet", truncate(nullToEmpty(item.getContentSnippet()), 500));
            node.put("sourceType", item.getPrimarySourceType() == null ? "" : item.getPrimarySourceType().name());
            payloadItems.add(node);
        }
        String prompt = scorePromptTemplate
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{itemsJson}}", payloadItems.toPrettyString());

        JsonNode response = chatJson(prompt, true);
        return parseScoreResults(response, items.size());
    }

    @Override
    public String summarize(NewsItem item) {
        ensureApiKey();
        String prompt = summarizePromptTemplate
                .replace("{{language}}", properties.getSummaryLanguage())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", nullToEmpty(item.getTitle()))
                .replace("{{url}}", nullToEmpty(item.getCanonicalUrl()))
                .replace("{{snippet}}", truncate(nullToEmpty(item.getContentSnippet()), 1200))
                .replace("{{scoreReason}}", nullToEmpty(item.getScoreReason()));
        JsonNode response = chatJson(prompt, true);
        JsonNode summary = response.path("summary");
        if (summary.isMissingNode() || summary.asText().isBlank()) {
            throw new IllegalStateException("Empty summary from model");
        }
        return summary.asText().trim();
    }

    @Override
    public List<String> summarizeBatch(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        if (items.size() == 1) {
            return List.of(summarize(items.getFirst()));
        }
        ensureApiKey();
        ArrayNode payloadItems = objectMapper.createArrayNode();
        for (int i = 0; i < items.size(); i++) {
            NewsItem item = items.get(i);
            ObjectNode node = objectMapper.createObjectNode();
            node.put("index", i);
            node.put("title", nullToEmpty(item.getTitle()));
            node.put("url", nullToEmpty(item.getCanonicalUrl()));
            node.put("snippet", truncate(nullToEmpty(item.getContentSnippet()), 800));
            node.put("scoreReason", nullToEmpty(item.getScoreReason()));
            payloadItems.add(node);
        }
        String prompt = summarizeBatchPromptTemplate
                .replace("{{language}}", properties.getSummaryLanguage())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{itemsJson}}", payloadItems.toPrettyString());
        JsonNode response = chatJson(prompt, true);
        List<String> results = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            results.add("");
        }
        JsonNode arr = response.path("items");
        if (arr.isArray()) {
            for (JsonNode node : arr) {
                int index = node.path("index").asInt(-1);
                if (index < 0 || index >= items.size()) {
                    continue;
                }
                results.set(index, node.path("summary").asText("").trim());
            }
        } else if (response.has("summary") && items.size() == 1) {
            results.set(0, response.path("summary").asText("").trim());
        }
        for (int i = 0; i < results.size(); i++) {
            if (results.get(i) == null || results.get(i).isBlank()) {
                results.set(i, summarize(items.get(i)));
            }
        }
        return results;
    }

    @Override
    public EventAssignResult assignEvent(NewsItem item, List<EventCandidate> candidates) {
        ensureApiKey();
        ArrayNode cand = objectMapper.createArrayNode();
        for (EventCandidate c : candidates == null ? List.<EventCandidate>of() : candidates) {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", c.id());
            n.put("title", nullToEmpty(c.title()));
            n.put("summary", truncate(nullToEmpty(c.summary()), 300));
            n.put("score", c.score());
            cand.add(n);
        }
        String prompt = assignEventPromptTemplate
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", nullToEmpty(item.getTitle()))
                .replace("{{url}}", nullToEmpty(item.getCanonicalUrl()))
                .replace("{{snippet}}", truncate(nullToEmpty(item.getContentSnippet()), 500))
                .replace("{{candidatesJson}}", cand.toPrettyString());
        JsonNode response = chatJson(prompt, true);
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
        ensureApiKey();
        ArrayNode itemsJson = objectMapper.createArrayNode();
        if (memberItems != null) {
            for (NewsItem item : memberItems) {
                ObjectNode n = objectMapper.createObjectNode();
                n.put("title", nullToEmpty(item.getTitle()));
                n.put("summary", truncate(nullToEmpty(item.getSummary()), 300));
                n.put("url", nullToEmpty(item.getCanonicalUrl()));
                n.put("score", item.getScore() == null ? 0 : item.getScore());
                itemsJson.add(n);
            }
        }
        String prompt = eventIntelligencePromptTemplate
                .replace("{{language}}", properties.getSummaryLanguage())
                .replace("{{interestProfile}}", interestProfile())
                .replace("{{title}}", nullToEmpty(eventTitle))
                .replace("{{itemsJson}}", itemsJson.toPrettyString());
        JsonNode response = chatJson(prompt, true);
        return new EventIntelligence(
                response.path("summary").asText(""),
                response.path("impact").asText(""),
                response.path("watchNext").asText("")
        );
    }

    @Override
    public List<ExtractedItem> extractItems(String content, String extractionPrompt) {
        ensureApiKey();
        String prompt = webExtractPromptTemplate
                .replace("{{extractionPrompt}}", nullToEmpty(extractionPrompt))
                .replace("{{content}}", truncate(nullToEmpty(content), 100_000));
        JsonNode response = chatJson(prompt, true);
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
        ensureApiKey();
        String prompt = extractContextPromptTemplate.replace("{{text}}", truncate(nullToEmpty(text), 8000));
        JsonNode response = chatJson(prompt, true);
        return parseContext(response);
    }

    @Override
    public ImpactAnalysisResult analyzeImpact(String contextJson, String title, String summary, String eventImpact, String memoryHints) {
        ensureApiKey();
        String prompt = analyzeImpactPromptTemplate
                .replace("{{memory}}", nullToEmpty(memoryHints))
                .replace("{{context}}", nullToEmpty(contextJson))
                .replace("{{title}}", nullToEmpty(title))
                .replace("{{summary}}", truncate(nullToEmpty(summary), 2000))
                .replace("{{eventImpact}}", nullToEmpty(eventImpact));
        JsonNode response = chatJson(prompt, true);
        return parseImpact(response);
    }

    @Override
    public OpportunitySuggestion suggestOpportunity(String contextJson, String title, String why, String recommendation) {
        ensureApiKey();
        String prompt = suggestOpportunityPromptTemplate
                .replace("{{context}}", nullToEmpty(contextJson))
                .replace("{{title}}", nullToEmpty(title))
                .replace("{{why}}", nullToEmpty(why))
                .replace("{{recommendation}}", nullToEmpty(recommendation));
        JsonNode response = chatJson(prompt, true);
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
            // allow single-object responses
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

    private JsonNode chatJson(String userPrompt, boolean retry) {
        RadarProperties.OpenAi cfg = properties.getOpenai();
        String baseUrl = trimTrailingSlash(cfg.getBaseUrl());
        Map<String, Object> body = new HashMap<>();
        body.put("model", cfg.getModel());
        body.put("temperature", 0.2);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("messages", List.of(
                Map.of("role", "system", "content", "You are a careful JSON-only assistant."),
                Map.of("role", "user", "content", userPrompt)
        ));

        long start = System.currentTimeMillis();
        try {
            String raw = restClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/chat/completions")
                    .header("Authorization", "Bearer " + cfg.getApiKey())
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(String.class);

            long latency = System.currentTimeMillis() - start;
            JsonNode root = objectMapper.readTree(raw);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            int promptTokens = root.path("usage").path("prompt_tokens").asInt(estimateTokens(userPrompt));
            int completionTokens = root.path("usage").path("completion_tokens").asInt(estimateTokens(content));
            log.info("ai_call model={} latencyMs={} promptTokens≈{} completionTokens≈{}",
                    cfg.getModel(), latency, promptTokens, completionTokens);

            String cleaned = stripCodeFence(content);
            return objectMapper.readTree(cleaned);
        } catch (Exception e) {
            if (retry) {
                log.warn("AI call failed, retrying once: {}", e.getMessage());
                return chatJson(userPrompt, false);
            }
            throw new IllegalStateException("AI call failed: " + e.getMessage(), e);
        }
    }

    private void ensureApiKey() {
        String key = properties.getOpenai().getApiKey();
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
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

    private static int estimateTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return Math.max(1, text.length() / 4);
    }

    private static String truncate(String text, int max) {
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
