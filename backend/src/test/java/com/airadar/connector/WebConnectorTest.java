package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.domain.SourceType;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.preference.PreferenceKeywordRepository;
import com.airadar.provider.ai.ExtractedItem;
import com.airadar.provider.ai.HeuristicAiService;
import com.airadar.config.RadarProperties;
import com.airadar.settings.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebConnectorTest {

    @Test
    void mapsExtractedItemsAndResolvesRelativeUrls() {
        RadarProperties props = new RadarProperties();
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of());
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc(org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        SettingsService settings = mock(SettingsService.class);
        when(settings.effectiveSourceWeights()).thenReturn(Map.of());
        WebConnector connector = new WebConnector(
                RestClient.builder(),
                new HeuristicAiService(props, new InterestSignalsService(props, repo, prefRepo), settings)
        );
        Source source = new Source(1L, "web", SourceType.WEB, Map.of(), true, null);
        List<RawItem> items = connector.toRawItems(
                List.of(new ExtractedItem("Story One", "/post/1", "summary")),
                new FetchContext(Instant.EPOCH, 48, source),
                "https://news.example.com/index"
        );
        assertEquals(1, items.size());
        assertEquals("https://news.example.com/post/1", items.getFirst().url());
    }

    @Test
    void readableTextStripsTags() {
        String text = WebConnector.toReadableText("<html><body><h1>Hello</h1><p>World</p></body></html>", "https://x.test");
        assertTrue(text.contains("Hello"));
        assertTrue(text.contains("World"));
    }
}
