package com.airadar.provider.ai;

import java.util.List;

public record OpportunitySuggestion(
        String kind,
        String title,
        String summary,
        Double estimatedHoursPerMonth,
        Double coveragePct,
        String actionTitle,
        List<String> steps,
        Integer estimatedMinutes,
        String successCriteria
) {
}
