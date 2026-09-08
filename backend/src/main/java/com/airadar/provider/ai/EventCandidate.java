package com.airadar.provider.ai;

public record EventCandidate(
        Long id,
        String title,
        String summary,
        double score
) {
}
