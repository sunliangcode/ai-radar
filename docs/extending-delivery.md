# Extending delivery channels

Delivery channels implement `DeliveryChannel` and are collected by `DeliveryService`.

Architecture context: [extensibility.md](extensibility.md).

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
- Override `descriptor()` with a human `displayName` and `settingsKeys` (catalog UX; CI enforces).
- `channel()` must be unique ignoring case. Do not pad `channel()`, `descriptor().id()`, `displayName`, or `settingsKeys` with surrounding whitespace — startup rejects that. `DeliveryService` and `GET /api/delivery/channels` both refuse to start on a blank or duplicate id; `descriptor().id()` must match `channel()` (same check). `displayName` and each `settingsKeys` entry must be non-blank; settings keys must be unique ignoring case. The catalog is sorted by id case-insensitively (same as connectors / smoke).
- Never log secrets (SMTP passwords, webhook tokens).
- Prefer Event cards from `payload.events()`; fall back to `payload.items()`.

## Built-in channels

| Channel | Class | Enable when | Required `settingsKeys` (doctor/CI) |
| --- | --- | --- | --- |
| `outbox` | `OutboxDelivery` | `radar.delivery.outbox-enabled=true` (default) | `radar.delivery.outbox-enabled` |
| `feishu` | `FeishuDelivery` | Feishu bind / webhook configured | `FEISHU_WEBHOOK_URL` |
| `email` | `EmailDelivery` | SMTP + customer inbox | `SMTP_HOST`, `SMTP_TO` |
| `webhook` | `WebhookDelivery` | `WEBHOOK_URL` set | `WEBHOOK_URL` |

CI keeps this table aligned with `*Delivery` beans via [`shared/delivery-inventory.test.mjs`](../shared/delivery-inventory.test.mjs) (also hard-gates the required keys above). A blank or duplicate `channel()` (case-insensitive, trimmed), or a `descriptor().id()` that does not match it, fails startup in both `DeliveryService` and `DeliveryChannelsController` via `DeliveryChannelIndex.requireUnique`. Live checks (`doctor` / `status.sh` / smoke) expect those built-in keys on the catalog.

Live catalog: `GET /api/delivery/channels`, `./bin/ai-radar delivery-channels`, or MCP `list_delivery_channels`.

## 15-minute delivery walkthrough

Goal: add a local “echo” channel that writes one line to a file when push runs (no Feishu/SMTP).

**Prereqs:** backend runnable; outbox already proves the path — this walkthrough shows a **new** channel bean.

1. **Add** `backend/src/main/java/com/airadar/delivery/EchoFileDelivery.java`:

   ```java
   @Component
   public class EchoFileDelivery implements DeliveryChannel {
       @Override public String channel() { return "echo-file"; }

       @Override public boolean isEnabled() {
           return Boolean.parseBoolean(System.getenv().getOrDefault("ECHO_FILE_DELIVERY", "false"));
       }

       @Override
       public DeliveryDescriptor descriptor() {
           return DeliveryDescriptor.of("echo-file", "Echo File", List.of("ECHO_FILE_DELIVERY"));
       }

       @Override
       public DeliveryResult deliver(BriefPayload payload) {
           long t0 = System.currentTimeMillis();
           try {
               Path dir = Path.of("./data/echo-delivery");
               Files.createDirectories(dir);
               Path file = dir.resolve(payload.date() + ".txt");
               int n = payload.events() != null && !payload.events().isEmpty()
                       ? payload.events().size() : payload.items().size();
               Files.writeString(file, "eventsOrItems=" + n + "\n");
               return DeliveryResult.ok(channel(), n, System.currentTimeMillis() - t0);
           } catch (Exception e) {
               return DeliveryResult.fail(channel(), 0, System.currentTimeMillis() - t0, e.getMessage());
           }
       }
   }
   ```

2. **Restart** with the gate on:

   ```bash
   ECHO_FILE_DELIVERY=true ./mvnw spring-boot:run
   # from backend/ — or export in the process that runs install.sh's backend
   ```

3. **Verify catalog** then **push**:

   ```bash
   ./bin/ai-radar delivery-channels | jq '.[] | select(.id=="echo-file")'
   ./bin/ai-radar push
   # or: curl -s -X POST http://127.0.0.1:8080/api/jobs/push
   ls data/echo-delivery/
   ```

4. **Disable** by unsetting the env var — `isEnabled()` false → channel skipped (no error).

**Prefer for smoke without new code:** keep using Outbox (`./data/outbox/*.json`) — see below. Remove demo channels before shipping.

## Steps

1. Add a `@Component` implementing `DeliveryChannel`.
2. Gate `isEnabled()` on config / `RadarProperties` / env.
3. Implement `deliver` and return `DeliveryResult.ok/fail/skipped`.
4. Override `descriptor()` so the id equals `channel()` and `displayName` is human-readable (startup + CI enforce id match and displayName). Add a row to the built-in table above.
5. Restart. Confirm `./bin/ai-radar delivery-channels` or MCP `list_delivery_channels`. Manual `POST /api/jobs/push` (or `./bin/ai-radar push`) includes the channel when enabled.

## Example: OutboxDelivery

Writes JSON payloads under `./data/outbox/` when `radar.delivery.outbox-enabled=true` (default true).

Useful for local smoke tests without Feishu/SMTP. See `backend/src/main/java/com/airadar/delivery/OutboxDelivery.java`.

```bash
./bin/ai-radar push
ls data/outbox/   # or backend/data/outbox/ if CWD is backend/
```
