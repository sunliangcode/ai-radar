package com.airadar.delivery;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Startup checks shared by the delivery catalog and {@link DeliveryService}. */
public final class DeliveryChannelIndex {

    private DeliveryChannelIndex() {
    }

    public static void requireUnique(List<DeliveryChannel> channels) {
        Set<String> seen = new HashSet<>();
        for (DeliveryChannel ch : channels) {
            String raw = ch.channel();
            if (raw == null || raw.isBlank()) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName() + " has a blank channel()");
            }
            if (!raw.equals(raw.trim())) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " channel() has surrounding whitespace");
            }
            String key = raw.trim().toLowerCase();
            if (!seen.add(key)) {
                throw new IllegalStateException("Duplicate DeliveryChannel id " + key);
            }
            DeliveryDescriptor descriptor = ch.descriptor();
            String rawId = descriptor == null || descriptor.id() == null ? "" : descriptor.id();
            if (!rawId.equals(rawId.trim())) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " descriptor id has surrounding whitespace");
            }
            String id = rawId.trim().toLowerCase();
            if (!key.equals(id)) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " descriptor id \"" + id + "\" != channel() " + key);
            }
            String rawName = descriptor.displayName() == null ? "" : descriptor.displayName();
            if (!rawName.equals(rawName.trim())) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " displayName has surrounding whitespace");
            }
            if (rawName.trim().isEmpty()) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName() + " has a blank displayName");
            }
            requireUniqueSettings(ch, descriptor.settingsKeys());
        }
    }

    private static void requireUniqueSettings(DeliveryChannel ch, List<String> settingsKeys) {
        if (settingsKeys == null) {
            throw new IllegalStateException(
                    "DeliveryChannel " + ch.getClass().getName() + " descriptor settingsKeys is null");
        }
        Set<String> seen = new HashSet<>();
        for (String raw : settingsKeys) {
            String original = raw == null ? "" : raw;
            if (!original.equals(original.trim())) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " settings key has surrounding whitespace");
            }
            String setting = original.trim();
            if (setting.isEmpty()) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName() + " has a blank settings key");
            }
            if (!seen.add(setting.toLowerCase())) {
                throw new IllegalStateException(
                        "DeliveryChannel " + ch.getClass().getName()
                                + " has a duplicate settings key " + setting.toLowerCase());
            }
        }
    }
}
