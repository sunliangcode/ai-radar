package com.airadar.delivery;

/**
 * SPI for pushing a daily brief payload to an external channel.
 *
 * <p>Implementations are Spring beans collected by {@link DeliveryService}.
 * {@link #isEnabled()} should be false when credentials/config are missing so push can skip cleanly.
 *
 * <p>See docs/extending-delivery.md.
 */
public interface DeliveryChannel {

    String channel();

    boolean isEnabled();

    DeliveryResult deliver(BriefPayload payload);

    default DeliveryDescriptor descriptor() {
        return DeliveryDescriptor.of(channel(), channel(), java.util.List.of());
    }
}
