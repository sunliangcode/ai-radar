# Extending delivery channels

Delivery channels implement `DeliveryChannel` and are collected by `DeliveryService`.

## Contract

```java
public interface DeliveryChannel {
  String channel();
  boolean isEnabled();
  DeliveryResult deliver(BriefPayload payload);
  DeliveryDescriptor descriptor();
}
```

- Return `isEnabled() == false` when not configured so push can skip cleanly.
- Never log secrets (SMTP passwords, webhook tokens).
- Prefer Event cards from `payload.events()`; fall back to `payload.items()`.

## Steps

1. Add a `@Component` implementing `DeliveryChannel`.
2. Gate `isEnabled()` on config / `RadarProperties`.
3. Implement `deliver` and return `DeliveryResult.ok/fail/skipped`.
4. Restart. Manual `POST /api/jobs/push` will include the channel when enabled.

## Example: OutboxDelivery

Writes JSON payloads under `./data/outbox/` when `radar.delivery.outbox-enabled=true` (default true).

Useful for local smoke tests without Feishu/SMTP.
