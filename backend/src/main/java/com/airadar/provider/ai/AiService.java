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
}
