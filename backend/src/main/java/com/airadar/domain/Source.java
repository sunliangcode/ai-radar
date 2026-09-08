package com.airadar.domain;

import java.time.Instant;
import java.util.Map;

public record Source(
        Long id,
        String name,
        SourceType type,
        Map<String, Object> config,
        boolean enabled,
        Instant lastFetchedAt
) {
}
