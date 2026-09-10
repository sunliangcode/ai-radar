package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.preference.PreferenceKeywordRepository;
import com.airadar.settings.SettingsService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CompositeAiServiceTest {

    private static HeuristicAiService heuristic(RadarProperties props) {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of());
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc(org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        SettingsService settings = mock(SettingsService.class);
        when(settings.effectiveSourceWeights()).thenReturn(Map.of());
        return new HeuristicAiService(props, new InterestSignalsService(props, repo, prefRepo), settings);
    }

    @Test
    void usesHeuristicWhenRemoteWithoutApiKey() {
        RadarProperties props = new RadarProperties();
        props.getOpenai().setApiKey("");
        props.getOpenai().setBaseUrl("https://api.openai.com/v1");
        props.getOpenai().setModel("gpt-4o-mini");
        props.setInterestProfile("LLM,Agent");
        props.setSummaryLanguage("en");

        HeuristicAiService heuristic = heuristic(props);
        OpenAiCompatibleAiService openAi = mock(OpenAiCompatibleAiService.class);
        CompositeAiService composite = new CompositeAiService(props, openAi, heuristic);

        NewsItem item = new NewsItem();
        item.setTitle("LLM Agent release");
        item.setContentSnippet("New open source agent toolkit");
        item.setPrimarySourceType(SourceType.GITHUB);

        List<ScoreResult> scores = composite.score(List.of(item));
        assertEquals(1, scores.size());
        assertTrue(scores.getFirst().score() > 0);

        List<String> summaries = composite.summarizeBatch(List.of(item));
        assertEquals(1, summaries.size());
        assertTrue(summaries.getFirst().contains("GITHUB"));
        verify(openAi, never()).score(anyList());
        verify(openAi, never()).summarizeBatch(anyList());
    }

    @Test
    void fallsBackToHeuristicWhenOpenAiFails() {
        RadarProperties props = new RadarProperties();
        props.getOpenai().setApiKey("sk-test");
        props.setInterestProfile("LLM");
        props.setSummaryLanguage("en");

        HeuristicAiService heuristic = heuristic(props);
        OpenAiCompatibleAiService openAi = mock(OpenAiCompatibleAiService.class);
        when(openAi.summarizeBatch(anyList())).thenThrow(new IllegalStateException("boom"));
        CompositeAiService composite = new CompositeAiService(props, openAi, heuristic);

        NewsItem item = new NewsItem();
        item.setTitle("Only title");
        item.setPrimarySourceType(SourceType.RSS);

        List<String> summaries = composite.summarizeBatch(List.of(item));
        assertEquals(1, summaries.size());
        assertTrue(summaries.getFirst().contains("RSS"));
    }
}
