package com.airadar.provider.ai;

import java.util.List;
import java.util.Map;

public record ContextExtractResult(
        Map<String, Object> profile,
        List<Map<String, Object>> projects,
        List<String> technologies,
        List<String> interests,
        List<String> goals,
        List<String> currentFocus,
        List<String> explicitIgnore,
        Map<String, Object> preferences
) {
    public static ContextExtractResult empty() {
        return new ContextExtractResult(
                Map.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), Map.of());
    }
}
