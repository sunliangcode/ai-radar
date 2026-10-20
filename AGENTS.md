# AGENTS.md

Personal AI intelligence pipeline: fetch → score/summarize → events → impact → actions → delivery.
Single-user app. Java 21 + Spring Boot 3 + SQLite; React/Vite UI; optional Argos title-translate sidecar and MCP sidecar.

## Layout

Not a Maven/npm monorepo — independent packages under one repo:

| Path | Role |
| --- | --- |
| `backend/` | Spring Boot API, jobs, delivery, static SPA host (`com.airadar.*`) |
| `frontend/` | React 19 + Vite + Tailwind 4 UI |
| `cli/` | Ops CLI (`ai-radar`) — Node, zero deps; wrapper `bin/ai-radar` |
| `mcp/` | MCP stdio server (`server.mjs`; writes optional via `ALLOW_WRITES`) |
| `shared/` | Shared Node helpers + inventory gates (`errors`/`http`/`pack`; see `shared/README.md`) |
| `translate-service/` | Argos Translate en→zh sidecar (Python 3.10+) |
| `packs/` | Source pack JSON (copied into backend classpath at package time) |
| `docs/` | Extensibility + ops docs (prefer these over `aim/`) |
| `SKILL.md` / `skills/` | Agent skills (Cursor + Claude/Codex/Gemini copies) |
| `aim/` | Historical iteration notes — do not treat as current product truth |

Runtime data lives in `data/` (repo root, used by `install.sh`) and `backend/data/` (when Maven is run from `backend/`). Both are gitignored.

## Commands

Prereqs: **Java 21**, **Node 20.19+** (oxlint native bindings / Vite 8). Optional: Python 3.10+ (translate), local Ollama (default LLM).

```bash
# Backend
cd backend && cp .env.example .env   # first time
./mvnw spring-boot:run               # http://localhost:8080

# Frontend (dev; proxies /api → :8080)
cd frontend && npm install && npm run dev   # http://localhost:5173

# Bake SPA into Spring static (single-process mode)
cd frontend && npm run build:embed
# writes backend/src/main/resources/static/ (assets are gitignored)

# One-box (sidecar + embed UI + background backend)
./install.sh
./stop.sh
./scripts/status.sh   # health snapshot (backend + translate + pids/logs)
# SKIP_TRANSLATE=1 ./install.sh  — skip Argos for faster cold start

# Docker
cp backend/.env.example backend/.env
docker compose up -d --build   # argos-translate :8765 + ai-radar :8080
```

### Checks (what CI actually runs)

```bash
cd backend && ./mvnw -B test
cd frontend && npm ci
cd frontend && node ./node_modules/oxlint/bin/oxlint src   # lint is oxlint, not eslint
cd frontend && npm run test     # vitest
cd frontend && npm run build    # tsc -b && vite build
cd mcp && node --check server.mjs
cd cli && node --check ai-radar.mjs
```

Ops CLI (backend running):

```bash
./bin/ai-radar health
./bin/ai-radar home
```

Focused runs:

```bash
cd backend && ./mvnw -Dtest=UrlNormalizerTest test
cd frontend && npx vitest run src/lib/format.test.ts
```

Smoke (needs a **running** backend on :8080):

```bash
./scripts/smoke-extensibility.sh
./scripts/status.sh
```

Local CI-parity (backend tests + frontend lint/test/build + mcp/cli + shared tests):

```bash
make check
# same as: ./scripts/check.sh
```

User-visible changes → update `CHANGELOG.md` (PR template checkbox).

## Architecture notes

- **SQLite + Flyway**: schema is Flyway-only (`ddl-auto: none`). Pre-release baseline is a **single** `backend/src/main/resources/db/migration/V1__init.sql`; after first production release, add `V2__…` incrementally. Local schema drift → delete `./data/radar.db` (or `backend/data/radar.db`) and restart. WAL + `busy_timeout=30000`; Hikari pool size 4.
- **DB path is relative** (`./data/radar.db` from the process CWD). Running Maven from `backend/` writes `backend/data/`; `install.sh` uses root `data/`. Do not assume one path. Backup (`./bin/ai-radar backup`) auto-falls back to `backend/data/radar.db` when root DB is missing; override with `AI_RADAR_DB`. Retention: `BACKUP_KEEP` (default 14; non-numeric / <1 → 14).
- **Env loading**: Spring `optional:file:.env[.properties]` from **backend working directory**. Copy `backend/.env.example` → `backend/.env`. Never commit `.env`.
- **Default LLM is local Ollama** (`OPENAI_BASE_URL=http://localhost:11434/v1`, no API key for localhost). Cloud still needs `OPENAI_API_KEY`. LLM failure falls back to heuristics — unit tests do not need a live model.
- **Backend tests are plain unit tests** (no `@SpringBootTest`). `./mvnw test` does not boot Spring, touch SQLite, or call the network. Keep it that way unless you intentionally add integration tests.
- **en→zh titles use Argos Translate** (`translate-service/`, port 8765), **not** the LLM. Sidecar down → titles stay English; scoring/summarize still work. Do not install `argostranslate[stanza]` (see `docs/installation.md`).
- **Packs**: empty DB is seeded from pack `ai-cn` on first boot (CN-first). Import `ai-core` / `ai-signals` via Settings when needed. `pom.xml` copies `packs/sources/*.json` and `packs/profiles/**` into the jar classpath. Prefer editing pack JSON over hardcoding sources.
- **Zhihu / Weibo / Bilibili boot seeders**: every startup ensures 「知乎推荐」「微博热搜」「B站热门」 if missing. Default-enable only when the preferred CLI is executable (`ZHIHU_CLI_PATH` / `WEIBO_CLI_PATH` / `BILI_CLI_PATH`, else connector defaults). Does not overwrite a working custom `cliPath`. Paste Cookie in Sources UI — fetch writes CLI credential files (or `ZHIHU_COOKIE`). Missing binary → source created **disabled**. Homemade `JUEJIN` / `CSDN` rows are **disabled** on boot (no OSS connector).
- **CN RSS seeders**: every startup ensures IT之家 / Solidot / 极客公园 / 爱范儿 / 虎嗅 / InfoQ 中国 / 钛媒体 / 雷峰网 / 掘金 / 新浪科技 / 人人都是产品经理 / HelloGitHub by name if missing (RSS). Repairs broken `36氪` feed URL (`36kr.com` → `www.36kr.com`).
- **DailyHot**: optional compose service `daily-hot` (:6688); connector type `DAILY_HOT`; pack hot-list rows default disabled until sidecar is reachable (`DAILY_HOT_BASE_URL`).
- **Jobs**: fetch/push/cluster are mutex-guarded; overlapping runs return **409**. Manual: `POST /api/jobs/fetch`, `POST /api/jobs/push`, `POST /api/jobs/cluster`. Health: `GET /api/health` (includes `version` from `radar.api.version`). Ops: `./bin/ai-radar doctor` (`versionAlign`, `llm` mode, translate, soft `modelPresent`, soft SPI catalogs) / MCP `get_health` / `probe_llm`. CLI/MCP HTTP timeout: `AI_RADAR_TIMEOUT_MS` (default 8000; empty/unset → default; `0` / negative / non-numeric disables) → `request_timeout` on abort.
- **Extensibility contracts**: connectors implement `SourceConnector` (`@Component` under `com.airadar.connector`); delivery implements `DeliveryChannel`. New type codes need a `SourceType` enum value. Built-in field/settings tables: `shared/spi-catalog.mjs` (`BUILTIN_CONNECTOR_PAIRS` / `BUILTIN_DELIVERY_SETTINGS`); OpenAPI blurbs: `SpiCatalogBlurbs.java`. Details: `docs/extending-connectors.md`, `docs/extending-delivery.md`, `docs/extensibility.md`.
- **OpenAPI**: springdoc at `/swagger-ui.html` and `/api-docs` (also proxied in Vite dev).

## Frontend

- Scripts: `dev`, `build`, `build:embed` (`RADAR_EMBED=1`), `lint` (oxlint), `test` (vitest).
- `build:embed` `emptyOutDir: true` wipes `backend/src/main/resources/static/` — expected; do not hand-edit those baked assets.
- i18n via `react-i18next`; primary language is a Settings concept (`summaryLanguage` zh/en), not a locale switch of the whole SPA.
- **Source region modes** (localStorage): 国内模式 / 国外模式 / 全部 on Settings → Sources display picker.
- UI norms: [docs/product-principles.md](docs/product-principles.md) (empty vs filter-empty vs 404, Undo, display filter, i18n). Privacy: [PRIVACY.md](PRIVACY.md).

## Do not commit

`backend/.env`, `data/`, `backend/data/`, `*.db`, `translate-service/.venv/`, `node_modules/`, `backend/src/main/resources/static/assets/` + `index.html` + `icons.svg`.

## Useful docs

`CONTRIBUTING.md` · `docs/installation.md` · `docs/cli.md` · `docs/api.md` · `docs/mcp.md` · `docs/agents.md` · `docs/development.md` · `docs/extensibility.md` · `docs/extending-connectors.md` · `docs/extending-delivery.md` · `docs/release.md` · `docs/ai-radar-2.0-domain.md` · `docs/product-principles.md` · `PRIVACY.md` · `GOVERNANCE.md` · `SKILL.md`
