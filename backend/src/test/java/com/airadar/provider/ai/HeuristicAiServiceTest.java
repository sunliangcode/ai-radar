package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.preference.PreferenceKeywordRepository;
import com.airadar.settings.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HeuristicAiServiceTest {

    private HeuristicAiService service;

    @BeforeEach
    void setUp() {
        RadarProperties props = new RadarProperties();
        props.setInterestProfile("开源模型、Agent、推理基建、LLM");
        props.setSummaryLanguage("zh");
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of());
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc(org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        InterestSignalsService signals = new InterestSignalsService(props, repo, prefRepo);
        SettingsService settings = mock(SettingsService.class);
        when(settings.effectiveSourceWeights()).thenReturn(Map.of());
        service = new HeuristicAiService(props, signals, settings);
    }

    @Test
    void scoresInterestHitsAboveThreshold() {
        NewsItem item = new NewsItem();
        item.setTitle("New open-source LLM Agent for inference");
        item.setContentSnippet("A toolkit for agentic LLM workflows");
        item.setPrimarySourceType(SourceType.GITHUB);
        item.setRawMeta(Map.of("stars", 1200));

        ScoreResult result = service.score(List.of(item)).getFirst();
        assertTrue(result.score() >= 60, "score=" + result.score());
        assertFalse(result.tags().isEmpty());
        assertEquals("oss", result.category());
    }

    @Test
    void summarizesWithSnippet() {
        NewsItem item = new NewsItem();
        item.setTitle("Tiny model release");
        item.setContentSnippet("This release improves latency on consumer GPUs.");
        item.setPrimarySourceType(SourceType.HACKER_NEWS);

        String summary = service.summarize(item);
        assertTrue(summary.contains("HACKER_NEWS"));
        assertTrue(summary.contains("Tiny model release"));
        assertTrue(summary.contains("latency"));
    }

    @Test
    void summarizesWithoutSnippetUsesTitle() {
        NewsItem item = new NewsItem();
        item.setTitle("Only a title");
        item.setContentSnippet("");
        item.setPrimarySourceType(SourceType.RSS);

        String summary = service.summarize(item);
        assertTrue(summary.contains("Only a title"));
        assertTrue(summary.contains("RSS"));
    }

    @Test
    void parseInterestKeywordsSplitsMixedDelimiters() {
        List<String> kws = HeuristicAiService.parseInterestKeywords("开源模型、Agent, LLM；推理");
        assertTrue(kws.contains("开源模型"));
        assertTrue(kws.contains("Agent"));
        assertTrue(kws.contains("LLM"));
    }

    @Test
    void analyzeImpactUsesZhCopyWhenSummaryLanguageZh() {
        ImpactAnalysisResult hit = service.analyzeImpact(
                "{\"role\":\"eng\"}",
                "New open-source LLM Agent for inference",
                "agentic toolkit",
                null,
                null);
        assertTrue(hit.why().contains("Context"), "why=" + hit.why());
        assertTrue(hit.recommendation().contains("试验") || hit.recommendation().contains("小试验"),
                "rec=" + hit.recommendation());

        ImpactAnalysisResult ignored = service.analyzeImpact(
                "{\"explicit_ignore\":[\"cryptocurrency trading bots\"]}",
                "Best cryptocurrency trading bots for 2026",
                "crypto trading",
                null,
                null);
        assertEquals("IGNORE", ignored.tier());
        assertTrue(ignored.why().contains("忽略"), "why=" + ignored.why());
    }

    @Test
    void analyzeImpactUsesEnCopyWhenSummaryLanguageEn() {
        RadarProperties props = new RadarProperties();
        props.setInterestProfile("LLM, Agent");
        props.setSummaryLanguage("en");
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of());
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc(org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        InterestSignalsService signals = new InterestSignalsService(props, repo, prefRepo);
        SettingsService settings = mock(SettingsService.class);
        when(settings.effectiveSourceWeights()).thenReturn(Map.of());
        HeuristicAiService en = new HeuristicAiService(props, signals, settings);

        ImpactAnalysisResult r = en.analyzeImpact(
                "{\"explicit_ignore\":[\"cryptocurrency trading\"]}",
                "cryptocurrency trading guide",
                "crypto",
                null,
                null);
        assertEquals("IGNORE", r.tier());
        assertTrue(r.why().toLowerCase().contains("ignored theme") || r.why().toLowerCase().contains("ignore"),
                "why=" + r.why());
        assertTrue(r.recommendation().toLowerCase().contains("experiment"), "rec=" + r.recommendation());
    }

    @Test
    void analyzeImpactDoesNotIgnoreJustBecauseContextHasExplicitIgnoreKey() {
        ImpactAnalysisResult r = service.analyzeImpact(
                "{\"explicit_ignore\":[\"体育赛况\"]}",
                "New open-source LLM Agent for inference",
                "agentic toolkit",
                null,
                null);
        assertFalse("IGNORE".equals(r.tier()), "tier=" + r.tier() + " why=" + r.why());
    }
}
