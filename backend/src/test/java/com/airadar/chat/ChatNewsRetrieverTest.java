package com.airadar.chat;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatNewsRetrieverTest {

    @Test
    void seedIsPreferredAndCountsTowardLimit() {
        List<Map<String, Object>> candidates = List.of(
                card(1, "Alpha model", "HIGH"),
                card(2, "Beta pricing", "MEDIUM"),
                card(3, "Gamma release", "LOW")
        );
        List<Map<String, Object>> picked = ChatNewsRetriever.pick(
                candidates, "tell me about gamma", List.of(), 3L, 2);
        assertEquals(2, picked.size());
        assertEquals(3L, ((Number) picked.getFirst().get("id")).longValue());
    }

    @Test
    void skipsAlreadyCited() {
        List<Map<String, Object>> candidates = List.of(
                card(1, "OpenAI model", "HIGH"),
                card(2, "Claude pricing", "HIGH")
        );
        List<Map<String, Object>> picked = ChatNewsRetriever.pick(
                candidates, "OpenAI Claude", List.of(1L), null, 2);
        assertEquals(1, picked.size());
        assertEquals(2L, ((Number) picked.getFirst().get("id")).longValue());
    }

    @Test
    void overviewFallsBackToTopTier() {
        List<Map<String, Object>> candidates = List.of(
                card(10, "zzz unrelated", "LOW"),
                card(11, "aaa also", "HIGH")
        );
        List<Map<String, Object>> picked = ChatNewsRetriever.pick(
                candidates, "今天最该看什么？", List.of(), null, 1);
        assertEquals(1, picked.size());
        assertEquals(11L, ((Number) picked.getFirst().get("id")).longValue());
    }

    @Test
    void tokenizeIncludesCjkBigrams() {
        Set<String> tokens = ChatNewsRetriever.tokenize("模型发布");
        assertTrue(tokens.contains("模型") || tokens.contains("型发") || tokens.contains("发布"));
    }

    private static Map<String, Object> card(long id, String title, String tier) {
        return Map.of(
                "id", id,
                "title", title,
                "summary", title + " summary",
                "why", "",
                "tier", tier,
                "priority", tier.equals("HIGH") ? 80 : 20,
                "score", 50
        );
    }
}
