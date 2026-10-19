package com.airadar.delivery;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeliveryChannelIndexTest {

    @Test
    void acceptsDistinctIds() {
        assertDoesNotThrow(() -> DeliveryChannelIndex.requireUnique(List.of(
                stub("outbox"),
                stub("webhook"))));
    }

    @Test
    void rejectsCaseFoldDuplicate() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(stub("Outbox"), stub("outbox"))));
        assertTrue(ex.getMessage().contains("Duplicate DeliveryChannel id outbox"));
    }

    @Test
    void rejectsChannelWithSurroundingWhitespace() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(stub(" outbox "))));
        assertTrue(ex.getMessage().contains("channel() has surrounding whitespace"));
    }

    @Test
    void rejectsDescriptorIdMismatch() {
        DeliveryChannel mismatch = new DeliveryChannel() {
            @Override
            public String channel() {
                return "webhook";
            }

            @Override
            public boolean isEnabled() {
                return false;
            }

            @Override
            public DeliveryDescriptor descriptor() {
                return DeliveryDescriptor.of("outbox", "Outbox", List.of());
            }

            @Override
            public DeliveryResult deliver(BriefPayload payload) {
                return DeliveryResult.skipped("webhook", "test");
            }
        };
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(mismatch)));
        assertTrue(ex.getMessage().contains("descriptor id \"outbox\" != channel() webhook"));
    }

    @Test
    void rejectsBlank() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(stub("\t"))));
        assertTrue(ex.getMessage().contains("blank channel()"));
    }

    @Test
    void rejectsBlankDisplayName() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(withDisplayName("webhook", ""))));
        assertTrue(ex.getMessage().contains("blank displayName"));
    }

    @Test
    void rejectsDisplayNameWithSurroundingWhitespace() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(withDisplayName("webhook", " Webhook "))));
        assertTrue(ex.getMessage().contains("displayName has surrounding whitespace"));
    }

    @Test
    void rejectsDuplicateSettingsKey() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(
                        withSettings("webhook", List.of("WEBHOOK_URL", "webhook_url")))));
        assertTrue(ex.getMessage().contains("duplicate settings key webhook_url"));
    }

    @Test
    void rejectsSettingsKeyWithSurroundingWhitespace() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(
                        withSettings("webhook", List.of(" WEBHOOK_URL ")))));
        assertTrue(ex.getMessage().contains("settings key has surrounding whitespace"));
    }

    @Test
    void rejectsBlankSettingsKey() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeliveryChannelIndex.requireUnique(List.of(withSettings("webhook", List.of("")))));
        assertTrue(ex.getMessage().contains("blank settings key"));
    }

    private static DeliveryChannel withSettings(String id, List<String> settingsKeys) {
        return withDescriptor(id, id, settingsKeys);
    }

    private static DeliveryChannel withDisplayName(String id, String displayName) {
        return withDescriptor(id, displayName, List.of());
    }

    private static DeliveryChannel withDescriptor(String id, String displayName, List<String> settingsKeys) {
        return new DeliveryChannel() {
            @Override
            public String channel() {
                return id;
            }

            @Override
            public boolean isEnabled() {
                return false;
            }

            @Override
            public DeliveryDescriptor descriptor() {
                return DeliveryDescriptor.of(id, displayName, settingsKeys);
            }

            @Override
            public DeliveryResult deliver(BriefPayload payload) {
                return DeliveryResult.skipped(id, "test");
            }
        };
    }

    private static DeliveryChannel stub(String id) {
        return new DeliveryChannel() {
            @Override
            public String channel() {
                return id;
            }

            @Override
            public boolean isEnabled() {
                return false;
            }

            @Override
            public DeliveryResult deliver(BriefPayload payload) {
                return DeliveryResult.skipped(id, "test");
            }
        };
    }
}
