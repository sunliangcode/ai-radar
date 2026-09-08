package com.airadar.delivery;

import java.util.List;

public record DeliveryDescriptor(
        String id,
        String displayName,
        List<String> settingsKeys
) {
    public static DeliveryDescriptor of(String id, String displayName, List<String> settingsKeys) {
        return new DeliveryDescriptor(id, displayName, settingsKeys == null ? List.of() : settingsKeys);
    }
}
