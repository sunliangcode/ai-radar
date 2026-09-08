package com.airadar.delivery;

public record DeliveryResult(String channel, boolean success, int itemCount, long durationMs, String error) {

    public static DeliveryResult ok(String channel, int itemCount, long durationMs) {
        return new DeliveryResult(channel, true, itemCount, durationMs, null);
    }

    public static DeliveryResult fail(String channel, int itemCount, long durationMs, String error) {
        return new DeliveryResult(channel, false, itemCount, durationMs, error);
    }

    public static DeliveryResult skipped(String channel, String reason) {
        return new DeliveryResult(channel, true, 0, 0, "skipped: " + reason);
    }
}
