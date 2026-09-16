package com.airadar.provider.ai;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FitMessagesToBudgetTest {

    @Test
    void dropsOldestNonSystemWhenOverBudget() {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", "sys"));
        messages.add(Map.of("role", "user", "content", "old ".repeat(2000)));
        messages.add(Map.of("role", "assistant", "content", "old reply ".repeat(2000)));
        messages.add(Map.of("role", "user", "content", "latest question"));

        List<Map<String, String>> fitted = OpenAiCompatibleAiService.fitMessagesToBudget(messages, 400);
        assertTrue(fitted.size() < messages.size());
        assertEquals("system", fitted.getFirst().get("role"));
        assertEquals("latest question", fitted.getLast().get("content"));
    }
}
