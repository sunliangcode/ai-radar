package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeuristicAiServiceTest {

    private HeuristicAiService service;

    @BeforeEach
    void setUp() {
        RadarProperties props = new RadarProperties();
        props.setInterestProfile("开源模型、Agent、推理基建、LLM");
        props.setSummaryLanguage("zh");
        service = new HeuristicAiService(props);
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
}
