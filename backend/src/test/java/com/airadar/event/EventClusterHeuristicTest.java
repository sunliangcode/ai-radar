package com.airadar.event;

import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.provider.ai.HeuristicAiService;
import com.airadar.config.RadarProperties;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EventClusterHeuristicTest {

    @Test
    void relatedTitlesAssignToSameCandidate() {
        RadarProperties props = new RadarProperties();
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of());
        HeuristicAiService ai = new HeuristicAiService(props, new InterestSignalsService(props, repo));

        NewsItem a = item("OpenAI releases GPT-5 preview for developers", Instant.parse("2026-09-06T10:00:00Z"));
        NewsItem b = item("GPT-5 preview expands to API customers", Instant.parse("2026-09-07T10:00:00Z"));
        NewsItem c = item("Developers react to OpenAI GPT-5 preview launch", Instant.parse("2026-09-08T10:00:00Z"));

        var first = ai.assignEvent(a, List.of());
        assertTrue(first.createNew());

        var candidates = List.of(new com.airadar.provider.ai.EventCandidate(
                1L, first.title(), a.getTitle(), 80));
        var second = ai.assignEvent(b, candidates);
        var third = ai.assignEvent(c, candidates);

        assertTrue(!second.createNew() || second.confidence() >= 0.5);
        assertTrue(!third.createNew() || third.confidence() >= 0.5);

        // With strong entity overlap, at least one of b/c should assign
        int assigns = 0;
        if (!second.createNew()) {
            assigns++;
        }
        if (!third.createNew()) {
            assigns++;
        }
        assertTrue(assigns >= 1, "expected at least one assign among related GPT-5 items");
        assertEquals(1L, (!second.createNew() ? second : third).eventId());
    }

    @Test
    void entityLexiconFindsOverlap() {
        var a = EntityLexicon.extract("OpenAI GPT and Claude comparison");
        var b = EntityLexicon.extract("Anthropic Claude update");
        assertTrue(a.contains("openai") || a.contains("gpt"));
        assertTrue(EntityLexicon.jaccard(a, b) > 0 || b.contains("claude"));
    }

    private static NewsItem item(String title, Instant at) {
        NewsItem item = new NewsItem();
        item.setTitle(title);
        item.setCanonicalUrl("https://example.com/" + title.hashCode());
        item.setPublishedAt(at);
        item.setStatus(ItemStatus.DONE);
        item.setScore(80.0);
        item.setPrimarySourceType(SourceType.RSS);
        item.setContentSnippet(title);
        return item;
    }
}
