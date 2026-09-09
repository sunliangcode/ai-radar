package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Primary
public class CompositeAiService implements AiService {

    private static final Logger log = LoggerFactory.getLogger(CompositeAiService.class);

    private final RadarProperties properties;
    private final OpenAiCompatibleAiService openAi;
    private final HeuristicAiService heuristic;

    public CompositeAiService(
            RadarProperties properties,
            OpenAiCompatibleAiService openAi,
            HeuristicAiService heuristic
    ) {
        this.properties = properties;
        this.openAi = openAi;
        this.heuristic = heuristic;
    }

    @Override
    public List<ScoreResult> score(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        if (!hasApiKey()) {
            log.info("ai_mode=heuristic reason=no_api_key items={}", items.size());
            return heuristic.score(items);
        }
        try {
            log.info("ai_mode=openai items={}", items.size());
            return openAi.score(items);
        } catch (Exception e) {
            log.warn("ai_mode=heuristic reason=openai_failed error={}", e.getMessage());
            return heuristic.score(items);
        }
    }

    @Override
    public String summarize(NewsItem item) {
        if (!hasApiKey()) {
            return heuristic.summarize(item);
        }
        try {
            return openAi.summarize(item);
        } catch (Exception e) {
            log.warn("ai_summary_fallback=heuristic error={}", e.getMessage());
            return heuristic.summarize(item);
        }
    }

    @Override
    public List<String> summarizeBatch(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        if (!hasApiKey()) {
            return heuristic.summarizeBatch(items);
        }
        try {
            return openAi.summarizeBatch(items);
        } catch (Exception e) {
            log.warn("ai_summary_batch_fallback=heuristic error={}", e.getMessage());
            return heuristic.summarizeBatch(items);
        }
    }

    @Override
    public EventAssignResult assignEvent(NewsItem item, List<EventCandidate> candidates) {
        if (!hasApiKey()) {
            return heuristic.assignEvent(item, candidates);
        }
        try {
            return openAi.assignEvent(item, candidates);
        } catch (Exception e) {
            log.warn("ai_assign_fallback=heuristic error={}", e.getMessage());
            return heuristic.assignEvent(item, candidates);
        }
    }

    @Override
    public EventIntelligence refreshEventIntelligence(String eventTitle, List<NewsItem> memberItems) {
        if (!hasApiKey()) {
            return heuristic.refreshEventIntelligence(eventTitle, memberItems);
        }
        try {
            return openAi.refreshEventIntelligence(eventTitle, memberItems);
        } catch (Exception e) {
            log.warn("ai_event_intel_fallback=heuristic error={}", e.getMessage());
            return heuristic.refreshEventIntelligence(eventTitle, memberItems);
        }
    }

    @Override
    public List<ExtractedItem> extractItems(String content, String extractionPrompt) {
        if (!hasApiKey()) {
            return heuristic.extractItems(content, extractionPrompt);
        }
        try {
            return openAi.extractItems(content, extractionPrompt);
        } catch (Exception e) {
            log.warn("ai_extract_fallback=heuristic error={}", e.getMessage());
            return heuristic.extractItems(content, extractionPrompt);
        }
    }

    @Override
    public ContextExtractResult extractContext(String text) {
        if (!hasApiKey()) {
            return heuristic.extractContext(text);
        }
        try {
            return openAi.extractContext(text);
        } catch (Exception e) {
            log.warn("ai_context_fallback=heuristic error={}", e.getMessage());
            return heuristic.extractContext(text);
        }
    }

    @Override
    public ImpactAnalysisResult analyzeImpact(String contextJson, String title, String summary, String eventImpact, String memoryHints) {
        if (!hasApiKey()) {
            return heuristic.analyzeImpact(contextJson, title, summary, eventImpact, memoryHints);
        }
        try {
            return openAi.analyzeImpact(contextJson, title, summary, eventImpact, memoryHints);
        } catch (Exception e) {
            log.warn("ai_impact_fallback=heuristic error={}", e.getMessage());
            return heuristic.analyzeImpact(contextJson, title, summary, eventImpact, memoryHints);
        }
    }

    @Override
    public OpportunitySuggestion suggestOpportunity(String contextJson, String title, String why, String recommendation) {
        if (!hasApiKey()) {
            return heuristic.suggestOpportunity(contextJson, title, why, recommendation);
        }
        try {
            return openAi.suggestOpportunity(contextJson, title, why, recommendation);
        } catch (Exception e) {
            log.warn("ai_opportunity_fallback=heuristic error={}", e.getMessage());
            return heuristic.suggestOpportunity(contextJson, title, why, recommendation);
        }
    }

    private boolean hasApiKey() {
        String key = properties.getOpenai().getApiKey();
        return key != null && !key.isBlank()
                && !"sk-your-key-here".equals(key);
    }
}
