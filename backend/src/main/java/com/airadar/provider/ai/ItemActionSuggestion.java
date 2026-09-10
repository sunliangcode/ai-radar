package com.airadar.provider.ai;

import java.util.List;

public record ItemActionSuggestion(
        boolean shouldAct,
        String title,
        List<String> steps,
        Integer estimatedMinutes,
        String successCriteria
) {
    public static ItemActionSuggestion none() {
        return new ItemActionSuggestion(false, null, List.of(), null, null);
    }
}
