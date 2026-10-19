package com.airadar.api;

import java.util.List;

/** OpenAPI-friendly row for {@code GET /api/delivery/channels}. */
public record DeliveryChannelView(
        String id,
        String displayName,
        List<String> settingsKeys,
        boolean enabled
) {
}
