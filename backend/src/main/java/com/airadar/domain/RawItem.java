package com.airadar.domain;

import java.time.Instant;
import java.util.Map;

public record RawItem(
        String title,
        String url,
        Instant publishedAt,
        SourceType sourceType,
        String sourceId,
        String contentSnippet,
        Map<String, Object> rawMeta
) {
}
