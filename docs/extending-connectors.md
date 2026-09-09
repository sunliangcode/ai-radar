# Extending connectors

AI Radar discovers source connectors as Spring beans implementing `SourceConnector`.

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
| `RSS` | Rome RSS/Atom | `feedUrl` |
| `HACKER_NEWS` | Algolia (+ Firebase fallback) | `query`, `tags` |
| `REDDIT` | Public JSON / RSS | `subreddits` |
| `GITHUB` | Search repositories API | optional `GITHUB_TOKEN` |
| `GITHUB_TRENDING` | HTML scrape | `since`, `language` |
| `GOOGLE_NEWS` | Google News RSS search | `query`, `hl`, `gl` |
| `GDELT` | GDELT DOC API | `query`, `timespan` |
| `OSS_INSIGHT` | Star-velocity trends | `keywords`, `period` |
| `V2EX` | Official JSON API | `nodes` |
| `TELEGRAM` | Public `t.me/s` HTML | `channels` |
| `PRODUCT_HUNT` | GraphQL | requires `PH_TOKEN` |
| `TWITTER` | Apify actor | requires `APIFY_TOKEN` |
| `WEB` | HTML + AI extract | `url`, `extractionPrompt` |
| `EMAIL` | IMAP unread + AI extract | `EMAIL_INGEST_ENABLED` + IMAP_* |
| `FIXTURE` | Local JSON | demos / offline |

Optional full-text enrichment: set `WEB_FETCH_ENABLED=true` (`radar.web-fetch.enabled`), with optional `WEB_FETCH_PARALLELISM` (default 4).

Empty databases are seeded from packs `ai-core` + `ai-cn` via `PackImportService` (filesystem `packs/` or classpath). Prefer editing pack JSON rather than hard-coding sources.

The UI loads field schemas from `GET /api/connectors`.

## Steps to add a connector

1. Create a `@Component` under `com.airadar.connector` (or your module scanned by Spring).
2. Implement `type()` / `typeCode()` with a unique code (e.g. `ARXIV`).
3. If the code is new, add it to `SourceType` enum (current persistence uses the enum).
4. Override `descriptor()` with config field definitions.
5. Restart the app. Create a source via UI/API with matching `type` and `config`.

## Example: FixtureConnector

`FixtureConnector` (`type=FIXTURE`) reads JSON from classpath/file:

```json
{ "path": "fixtures/demo-events.json" }
```

See `backend/src/main/java/com/airadar/connector/FixtureConnector.java`.

## Packs

Importable presets under `packs/sources/`:

- `ai-core.json` — English AI blogs + Google News / GDELT / OSS Insight / Trending
- `ai-cn.json` — WeChat bridges, 36氪, 即刻, V2EX, CN Google News
- `ai-signals.json` — Product Hunt / Twitter / WEB / EMAIL samples (often disabled until tokens are set)

```bash
curl -s -X POST http://localhost:8080/api/packs/import \
  -H 'Content-Type: application/json' \
  -d '{"packId":"ai-cn"}'
```

## Registration

`ConnectorRegistry` indexes beans by `typeCode()`. `PipelineOrchestrator` resolves connectors through the registry — no core pipeline edits required for a new bean.
