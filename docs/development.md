# Development

How to hack on AI Radar locally — layout, run modes, checks, and extension points.

Product overview: [README.md](../README.md). Ops install: [installation.md](installation.md). Domain model: [ai-radar-2.0-domain.md](ai-radar-2.0-domain.md). UI / empty-state norms: [product-principles.md](product-principles.md). Privacy: [PRIVACY.md](../PRIVACY.md).

---

## Layout

Not a Maven/npm monorepo — independent packages under one repo:

| Path | Role |
| --- | --- |
| `backend/` | Spring Boot API, jobs, delivery, static SPA host (`com.airadar.*`) |
| `frontend/` | React 19 + Vite + Tailwind 4 UI |
| `cli/` | Ops CLI (`ai-radar`) — Node, zero deps |
| `bin/ai-radar` | Clone-friendly wrapper → `cli/ai-radar.mjs` |
| `mcp/` | MCP stdio sidecar (`server.mjs`) |
| `shared/` | Shared Node helpers (errors, HTTP timeout, pack validate, version-align, llm-mode, model-present, translate-status, inventory tests) |
| `translate-service/` | Argos Translate en→zh sidecar (Python 3.10+) |
| `packs/` | Source pack JSON (copied into backend classpath at package time) |
| `docs/` | Product + extensibility docs (prefer over `aim/`) |
| `SKILL.md` / `skills/` | Agent skills |
| `aim/` | Historical iteration notes — not current product truth |

Runtime data: `data/` (repo root, `install.sh`) and `backend/data/` (Maven from `backend/`). Both gitignored.
Backup: `make backup` / `./bin/ai-radar backup` (auto-finds either DB path; `AI_RADAR_DB` override; `BACKUP_KEEP` default 14).

---

## Prerequisites

- **Java 21**
- **Node 20.19+** (oxlint native bindings / Vite 8; CLI uses built-in `fetch`). Pin with root [`.nvmrc`](../.nvmrc) (`nvm use`).
- Optional: **Python 3.10+** (Argos), local **Ollama** (default LLM)

---

## Run modes

### Dev (two processes)

```bash
# Terminal 1 — API
cd backend && cp .env.example .env   # first time
./mvnw spring-boot:run               # http://localhost:8080

# Terminal 2 — UI (proxies /api → :8080)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

### One-box

```bash
./install.sh    # embed UI + optional translate + background backend
./scripts/status.sh   # soft SPI catalogs when backend up; optional daily-hot :6688
./stop.sh
```

### Docker

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
```

Details: [installation.md](installation.md).

---

## Checks (CI parity)

```bash
cd backend && ./mvnw -B test
cd frontend && npm ci
cd frontend && node ./node_modules/oxlint/bin/oxlint src
cd frontend && npm run test
cd frontend && npm run build
cd mcp && node --check server.mjs
cd shared && node --test *.test.mjs   # inventory / pack / version gates
cd cli && node --check ai-radar.mjs
```

Or one shot from repo root:

```bash
make check
# same as:
./scripts/check.sh
./bin/ai-radar check
```

Contributor shortcuts: `make help` (install / status / doctor / connectors / smoke / …). See root `Makefile` and `.editorconfig`. Shared helpers: [`shared/README.md`](../shared/README.md).

Focused:

```bash
cd backend && ./mvnw -Dtest=UrlNormalizerTest test
cd frontend && npx vitest run src/lib/format.test.ts
cd shared && node --test connector-inventory.test.mjs
```

Smoke (needs running backend on `:8080`):

```bash
./scripts/smoke-extensibility.sh
./scripts/status.sh
./bin/ai-radar doctor
./bin/ai-radar health-llm      # optional live LLM probe
```

**Backend tests are plain unit tests** (no `@SpringBootTest`). `./mvnw test` does not boot Spring, touch SQLite, or call the network — keep it that way unless you intentionally add integration tests.

---

## HTTP API for scripts

There is **no separate Java client SDK**. Scripts and agents should call REST:

- Interactive: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- Overview: [api.md](api.md)
- Thin wrappers: [cli.md](cli.md), [mcp.md](mcp.md) (`AI_RADAR_TIMEOUT_MS` defaults to 8000; empty/unset → default; `0` / negative / non-numeric disables)

Example:

```bash
./bin/ai-radar doctor
./bin/ai-radar home
# or
curl -s http://127.0.0.1:8080/api/health | jq .version
curl -s http://127.0.0.1:8080/api/intelligence/home | jq .
```

---

## Extension points

Overview + diagram: [extensibility.md](extensibility.md).

| Add… | Doc |
| --- | --- |
| Source connector | [extending-connectors.md](extending-connectors.md) (15-minute walkthrough) |
| Delivery channel | [extending-delivery.md](extending-delivery.md) (15-minute walkthrough) |
| Pack sources | [sources.md](sources.md) · `packs/sources/*.json` |
| Cut a release | [release.md](release.md) |

Connectors: `SourceConnector` `@Component` under `com.airadar.connector`. Delivery: `DeliveryChannel`. New connector type codes need a `SourceType` enum value.

Startup fail-fast (blank/duplicate SPI ids, surrounding whitespace on ids/names/keys, blank `displayName`, blank/duplicate connector config-field keys or delivery `settingsKeys`, or `descriptor().id()` ≠ `typeCode()` / `channel()`): `ConnectorRegistry` and `DeliveryChannelIndex`. Delivery catalog sorts case-insensitively like connectors. CI also gates inventory tables (including required built-in `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath`, `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`), catalog id match, field-key uniqueness, and pack JSON (`shared/*-inventory.test.mjs`, `pack-files-sync.test.mjs`).

---

## Agent-facing surfaces

When changing ops behavior, keep these in sync:

1. REST controllers + [api.md](api.md)
2. [`cli/ai-radar.mjs`](../cli/ai-radar.mjs) + [cli.md](cli.md)
3. [`mcp/server.mjs`](../mcp/server.mjs) + [mcp.md](mcp.md)
4. Root [SKILL.md](../SKILL.md) / [agents.md](agents.md) if workflows change
5. SPI field tables: [`shared/spi-catalog.mjs`](../shared/spi-catalog.mjs) (`BUILTIN_CONNECTOR_PAIRS` / `BUILTIN_DELIVERY_SETTINGS` + `formatBuiltin*`) and [`SpiCatalogBlurbs.java`](../backend/src/main/java/com/airadar/config/SpiCatalogBlurbs.java) for OpenAPI

User-visible changes → update [CHANGELOG.md](../CHANGELOG.md).

---

## Do not commit

`backend/.env`, `data/`, `backend/data/`, `*.db`, `translate-service/.venv/`, `node_modules/`, baked `backend/src/main/resources/static/assets/` (+ `index.html`, `icons.svg`).
