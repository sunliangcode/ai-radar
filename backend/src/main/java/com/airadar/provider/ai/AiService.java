package com.airadar.provider.ai;

import com.airadar.domain.NewsItem;

import java.util.List;

public interface AiService {

    List<ScoreResult> score(List<NewsItem> items);

    default ScoreResult enrichWithScore(NewsItem item) {
        List<ScoreResult> results = score(List.of(item));
        return results.isEmpty()
                ? new ScoreResult(0, "no result", List.of(), "other")
                : results.getFirst();
    }

    String summarize(NewsItem item);

    /**
     * Summarize with optional localized display title.
     * Default wraps {@link #summarize(NewsItem)}.
     */
    default SummarizeResult summarizeDetailed(NewsItem item) {
        return SummarizeResult.of(summarize(item));
    }

    /**
     * Batch summarize; default loops {@link #summarizeDetailed(NewsItem)}.
     * Implementations may issue a single LLM call for the batch.
     */
    default List<String> summarizeBatch(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<String> out = new java.util.ArrayList<>(items.size());
        for (NewsItem item : items) {
            out.add(summarize(item));
        }
        return out;
    }

    default List<SummarizeResult> summarizeDetailedBatch(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<SummarizeResult> out = new java.util.ArrayList<>(items.size());
        for (NewsItem item : items) {
            out.add(summarizeDetailed(item));
        }
        return out;
    }

    /** Extract a like/dislike preference phrase from an item. */
    default String extractPreferenceKeyword(String title, String summary, String kind) {
        String base = title == null ? "" : title.trim();
        if (base.length() > 120) {
            return base.substring(0, 120);
        }
        return base.isBlank() ? null : base;
    }

    /** Suggest a next action for a saved news item. */
    default ItemActionSuggestion suggestItemAction(String title, String url, String summary) {
        return ItemActionSuggestion.none();
    }

    /**
     * Decide whether to attach an item to an existing candidate event or create a new one.
     * Low confidence should prefer createNew to avoid bad merges.
     */
    EventAssignResult assignEvent(NewsItem item, List<EventCandidate> candidates);

    EventIntelligence refreshEventIntelligence(String eventTitle, List<NewsItem> memberItems);

    /**
     * Extract news-like items from page or email text using the given instruction prompt.
     */
    default List<ExtractedItem> extractItems(String content, String extractionPrompt) {
        return List.of();
    }

    /** Extract structured personal Context from free text. */
    default ContextExtractResult extractContext(String text) {
        return ContextExtractResult.empty();
    }

    /** Score how a Change impacts the user Context. */
    default ImpactAnalysisResult analyzeImpact(String contextJson, String title, String summary, String eventImpact, String memoryHints) {
        return new ImpactAnalysisResult(50, 50, 40, 50, 50, "Related to your interests.", summary, "Watch for follow-ups.", "MEDIUM");
    }

    /** Suggest opportunity/risk + action from a high-impact change. */
    default OpportunitySuggestion suggestOpportunity(String contextJson, String title, String why, String recommendation) {
        return new OpportunitySuggestion(
                "OPPORTUNITY",
                "Explore: " + title,
                why,
                4.0,
                30.0,
                "Run a small trial",
                List.of("Pick 3 real tasks", "Try the new approach", "Record success rate"),
                90,
                "Useful enough to keep using"
        );
    }
}
