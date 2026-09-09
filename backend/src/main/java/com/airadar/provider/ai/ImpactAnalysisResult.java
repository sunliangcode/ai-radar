package com.airadar.provider.ai;

public record ImpactAnalysisResult(
        double relevance,
        double impact,
        double urgency,
        double confidence,
        double effort,
        String why,
        String evidence,
        String recommendation,
        String tier
) {
}
