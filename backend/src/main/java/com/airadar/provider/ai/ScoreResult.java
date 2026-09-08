package com.airadar.provider.ai;

import java.util.List;

public record ScoreResult(
        double score,
        String reason,
        List<String> tags,
        String category
) {
}
