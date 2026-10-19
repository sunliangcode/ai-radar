package com.airadar.api;

import com.airadar.delivery.BriefPayload;
import com.airadar.delivery.DeliveryChannel;
import com.airadar.delivery.DeliveryDescriptor;
import com.airadar.delivery.DeliveryResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeliveryChannelsControllerTest {

    @Test
    void listsSortedDescriptorsWithEnabledFlag() {
        DeliveryChannel a = stub("webhook", false);
        DeliveryChannel b = stub("outbox", true);
        DeliveryChannelsController ctl = new DeliveryChannelsController(List.of(a, b));
        List<DeliveryChannelView> rows = ctl.list();
        assertEquals(2, rows.size());
        assertEquals("outbox", rows.get(0).id());
        assertTrue(rows.get(0).enabled());
        assertEquals("Outbox Display", rows.get(0).displayName());
        assertEquals("webhook", rows.get(1).id());
        assertFalse(rows.get(1).enabled());
    }

    @Test
    void listsSortedCaseInsensitive() {
        DeliveryChannelsController ctl = new DeliveryChannelsController(List.of(
                stub("Webhook", false),
                stub("email", true),
                stub("Outbox", false)));
        List<String> ids = ctl.list().stream().map(DeliveryChannelView::id).toList();
        assertEquals(List.of("email", "Outbox", "Webhook"), ids);
    }

    @Test
    void duplicateChannelIdFailsFast() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> new DeliveryChannelsController(List.of(stub("Webhook", true), stub("webhook", false))));
        assertEquals(true, ex.getMessage().contains("Duplicate DeliveryChannel id webhook"));
    }

    @Test
    void blankChannelIdFailsFast() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> new DeliveryChannelsController(List.of(stub("  ", true))));
        assertEquals(true, ex.getMessage().contains("blank channel()"));
    }

    private static DeliveryChannel stub(String id, boolean enabled) {
        return new DeliveryChannel() {
            @Override
            public String channel() {
                return id;
            }

            @Override
            public boolean isEnabled() {
                return enabled;
            }

            @Override
            public DeliveryResult deliver(BriefPayload payload) {
                return DeliveryResult.skipped(id, "test");
            }

            @Override
            public DeliveryDescriptor descriptor() {
                return DeliveryDescriptor.of(id, id.substring(0, 1).toUpperCase() + id.substring(1) + " Display", List.of("KEY"));
            }
        };
    }
}
