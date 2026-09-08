package com.airadar.pipeline;

import com.airadar.domain.NewsItem;

import java.util.List;

public record PipelineResult(
        int fetched,
        int deduped,
        int scored,
        int kept,
        String briefPath,
        List<NewsItem> topItems,
        long durationMs
) {
}
