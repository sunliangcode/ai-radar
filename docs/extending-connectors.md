# Extending connectors

AI Radar discovers source connectors as Spring beans implementing `SourceConnector`.

Architecture context: [extensibility.md](extensibility.md).

## Contract

```java
public interface SourceConnector {
  String typeCode();                 // stored in sources.type
  SourceType type();                 // built-in enum; add FIXTURE-style values for in-repo plugins
  ConnectorDescriptor descriptor();  // UI/docs metadata
  List<RawItem> fetch(FetchContext ctx);
}
```

- Throw unchecked exceptions on hard failures. The orchestrator isolates per-source errors.
- Return an empty list when there is nothing new.
- Prefer absolute/canonical URLs; the pipeline will normalize.
- For token-gated sources (Product Hunt, Twitter, Email), prefer warn + empty list when credentials are missing.

## Built-in connector types

| Type | Mechanism | Notes |
|------|-----------|-------|
| `RSS` | Rome RSS/Atom | `feedUrl` (doctor/CI require this config field) |
| `HACKER_NEWS` | Algolia (+ Firebase fallback) | `query` (doctor/CI require this config field; pack validate warns when missing), `tags` |
| `REDDIT` | Public JSON / RSS | `subreddits` (doctor/CI require this config field; pack validate warns when missing) |
| `GITHUB` | Search repositories API | `query` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing); optional `GITHUB_TOKEN` |
| `GITHUB_TRENDING` | HTML scrape | `since` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing), `language` |
| `GOOGLE_NEWS` | Google News RSS search | `query` (doctor/CI require this config field; pack validate warns when missing), `hl`, `gl` |
| `GDELT` | GDELT DOC API | `query` (doctor/CI require this config field; pack validate warns when missing), `timespan` |
| `OSS_INSIGHT` | Star-velocity trends | `keywords` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing), `period` |
| `V2EX` | Official JSON API | `nodes` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing) |
| `TELEGRAM` | Public `t.me/s` HTML | `channels` (doctor/CI require this config field) |
| `PRODUCT_HUNT` | GraphQL | `maxItems` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing); requires `PH_TOKEN` |
| `TWITTER` | Apify actor | `users` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing); requires `APIFY_TOKEN` |
| `WEB` | HTML + AI extract | `url` (doctor/CI require this config field), `extractionPrompt` |
| `EMAIL` | IMAP unread + AI extract | `maxMessages` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing); `EMAIL_INGEST_ENABLED` + IMAP_* |
| `ZHIHU` | Open-source [zhihu-cli](https://github.com/BAIGUANGMEI/zhihu-cli) (`pyzhihu-cli`) | `cliPath` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing), paste `cookie` → `~/.zhihu-cli/cookies.json` (also `ZHIHU_COOKIE`); Sources **Install** wizard (no AI required) |
| `WEIBO` | Open-source [weibo-cli](https://github.com/jackwener/weibo-cli) (`kabi-weibo-cli`) | `cliPath` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing), paste `cookie` → `~/.config/weibo-cli/credential.json`; Sources **Install** wizard (no AI required) |
| `BILIBILI` | Open-source [bilibili-cli](https://github.com/jackwener/bilibili-cli) | `cliPath` (doctor/CI/MCP/OpenAPI require this config field; pack validate warns when missing), paste `cookie` → `~/.bilibili-cli/credential.json`; Sources **Install** wizard (no AI required) |
| `DAILY_HOT` | Self-hosted [DailyHotApi](https://github.com/imsyy/DailyHotApi) | `route` (doctor/CI require this config field) + optional `baseUrl` (`DAILY_HOT_BASE_URL`, default `http://127.0.0.1:6688`); compose service `daily-hot` |
| `FIXTURE` | Local JSON | demos / offline; doctor/CI require `path` (`ConfigField.path`) |

Optional full-text enrichment: set `WEB_FETCH_ENABLED=true` (`radar.web-fetch.enabled`), with optional `WEB_FETCH_PARALLELISM` (default 4).

Empty databases are seeded from pack `ai-cn` via `PackImportService` (filesystem `packs/` or classpath). Import `ai-core` from the UI when you want English AI sources. Prefer editing pack JSON rather than hard-coding sources.

**Zhihu / Weibo / Bilibili** are ensured on every boot: create the named source if missing; **enabled only when the preferred CLI binary is present**. A working custom `cliPath` is never overwritten. Paste Cookie in the Sources UI — AI Radar writes the open-source CLI credential file (or sets `ZHIHU_COOKIE`) so you do not configure each CLI project separately. Sources always shows **Install** for missing/broken CLIs (`GET/POST /api/sources/{id}/setup*`) — allowlisted `uv tool install` / `pipx`, then Cookie + probe (no AI required).

**Removed (no OSS)**: homemade `JUEJIN` / `CSDN` HTTP scrapers. Enum values remain for old DB rows; boot disables them. Listed in `LEGACY_SOURCE_TYPES` (`shared/pack.mjs`); CI [`connector-inventory.test.mjs`](../shared/connector-inventory.test.mjs) requires every other `SourceType` to have a `*Connector` bean.

Discover live catalog: `./bin/ai-radar connectors` or MCP `list_connectors`.

The UI loads field schemas from `GET /api/connectors`. Config field type `secret` renders a textarea + clipboard paste for Cookie one-click setup.

## 15-minute connector walkthrough

Goal: add a new in-repo connector type, see it in the UI catalog, and fetch once.

**Prereqs:** backend runnable (`cd backend && ./mvnw spring-boot:run`), Java 21.

1. **Add enum value** in `backend/src/main/java/com/airadar/domain/SourceType.java`:

   ```java
   DEMO_ECHO,   // example — pick a unique name
   ```

   Also add the same code to `SOURCE_TYPES` in [`shared/pack.mjs`](../shared/pack.mjs) so `ai-radar pack validate` / `pack list` stay accurate (`shared/source-types-sync.test.mjs` enforces this in CI). Put the type in either `DOMESTIC_SOURCE_TYPES` or `FOREIGN_SOURCE_TYPES` in [`frontend/src/lib/displaySources.ts`](../frontend/src/lib/displaySources.ts) (region-mode UI; `shared/frontend-region-sync.test.mjs`). Add `sourceType.YOUR_TYPE` in `frontend/src/i18n/locales/{en,zh}.json` (`shared/i18n-source-types-sync.test.mjs`).

2. **Add a `@Component`** under `com.airadar.connector` (copy/adapt):

   ```java
   @Component
   public class DemoEchoConnector implements SourceConnector {
       @Override public SourceType type() { return SourceType.DEMO_ECHO; }

       @Override
       public ConnectorDescriptor descriptor() {
           return ConnectorDescriptor.of(
                   "DEMO_ECHO",
                   "Demo Echo",
                   List.of(
                           ConnectorDescriptor.ConfigField.text("topic", "Topic", true)
                           // Also: .path / .secret / .textarea (UI-backed types only)
                   )
           );
       }

       @Override
       public List<RawItem> fetch(FetchContext ctx) {
           String topic = String.valueOf(ctx.source().config().getOrDefault("topic", "ai"));
           String url = "https://example.com/demo/" + topic;
           return List.of(new RawItem(
                   "Demo: " + topic,
                   UrlNormalizer.canonicalize(url),
                   Instant.now(),
                   SourceType.DEMO_ECHO,
                   String.valueOf(ctx.source().id()),
                   "echo connector",
                   Map.of("demo", true)
           ));
       }
   }
   ```

3. **Restart** the backend. Confirm registration:

   ```bash
   curl -s http://127.0.0.1:8080/api/connectors | jq '.[].id' | grep DEMO_ECHO
   # or: ./bin/ai-radar connectors | jq '.[].id' | grep DEMO_ECHO
   # or: ./bin/ai-radar sources   # after you create a source row
   ```

4. **Create a source** (UI: Settings → Sources, or API):

   ```bash
   curl -s -X POST http://127.0.0.1:8080/api/sources \
     -H 'Content-Type: application/json' \
     -d '{"name":"Demo Echo","type":"DEMO_ECHO","enabled":true,"config":{"topic":"radar"}}'
   ```

5. **Fetch** and inspect items:

   ```bash
   ./bin/ai-radar fetch --type DEMO_ECHO
   # or: curl -s -X POST 'http://127.0.0.1:8080/api/jobs/fetch?sourceType=DEMO_ECHO'
   ```

6. **Optional E2E** (needs a running backend): `./scripts/smoke-extensibility.sh` exercises the built-in `FIXTURE` path end-to-end.

**Notes:** New type codes currently require an enum edit (not an external JAR SPI). Keep demo types out of production packs unless intentional. Prefer extending `FIXTURE` for offline tests without a new enum.

## Steps to add a connector

1. Create a `@Component` under `com.airadar.connector` (or your module scanned by Spring).
2. Implement `type()` with a unique code (e.g. `ARXIV`). `typeCode()` defaults to `type().name()`.
3. If the code is new, add it to `SourceType` and the CI inventories listed in the [15-minute walkthrough](#15-minute-connector-walkthrough) (`shared/pack.mjs`, region sets, i18n `sourceType.*`).
4. Override `descriptor()` so the first argument equals `type().name()` (startup + CI: catalog id must match `typeCode()`).
5. Restart the app. Create a source via UI (`/settings/sources`) or API with matching `type` and `config`. Confirm with `./bin/ai-radar connectors` or MCP `list_connectors`.

## Example: FixtureConnector

`FixtureConnector` (`type=FIXTURE`) reads JSON from classpath/file:

```json
{ "path": "fixtures/demo-events.json" }
```

See `backend/src/main/java/com/airadar/connector/FixtureConnector.java`.

## Packs

Importable presets under `packs/sources/`:

- `ai-core.json` — English AI blogs + Google News / GDELT / OSS Insight / Trending
- `ai-cn.json` — WeChat bridges, 36氪 (`www.36kr.com/feed`), 即刻, V2EX, CN tech RSS (IT之家 / 虎嗅 / InfoQ / …), Zhihu / Weibo / Bilibili (OSS CLI), DailyHot hot lists (disabled until sidecar)
- `ai-signals.json` — Product Hunt / Twitter / WEB / EMAIL samples (often disabled until tokens are set)

```bash
curl -s -X POST http://localhost:8080/api/packs/import \
  -H 'Content-Type: application/json' \
  -d '{"packId":"ai-cn"}'
```

## Registration

`ConnectorRegistry` indexes beans by trimmed `typeCode()` (lookup is case-insensitive). A blank or duplicate code fails startup instead of silently replacing the earlier bean. `typeCode()`, `descriptor().id()`, `displayName`, and config field `key`/`type` must not have surrounding whitespace. `descriptor().id()` must match that code (case-insensitive). `displayName` must be non-blank. Config field keys must be non-blank and unique ignoring case. Allowed `type` values (lowercase): `text`, `path`, `secret`, `textarea` — use the `ConfigField.*` factories; unknown types fail startup. Duplicates would overwrite the same source config entry. `PipelineOrchestrator` resolves connectors through the registry — no core pipeline edits required for a new bean.
