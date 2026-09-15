# AGENTS.md

Personal AI intelligence pipeline: fetch → score/summarize → events → impact → actions → delivery.
Single-user app. Java 21 + Spring Boot 3 + SQLite; React/Vite UI; optional Argos title-translate sidecar and MCP sidecar.

## Layout

Not a Maven/npm monorepo — independent packages under one repo:

| Path | Role |
| --- | --- |
| `backend/` | Spring Boot API, jobs, delivery, static SPA host (`com.airadar.*`) |
| `frontend/` | React 19 + Vite + Tailwind 4 UI |
| `mcp/` | Read-only MCP stdio server (`server.mjs`) |
| `translate-service/` | Argos Translate en→zh sidecar (Python 3.10+) |
| `packs/` | Source pack JSON (copied into backend classpath at package time) |
| `docs/` | Extensibility + ops docs (prefer these over `aim/`) |
| `aim/` | Historical iteration notes — do not treat as current product truth |

Runtime data lives in `data/` (repo root, used by `install.sh`) and `backend/data/` (when Maven is run from `backend/`). Both are gitignored.

## Commands

Prereqs: **Java 21**, **Node 20.12+** (Vite 8 / `util.styleText`). Optional: Python 3.10+ (translate), local Ollama (default LLM).

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

Local CI-parity (backend tests + frontend lint/test/build + mcp syntax):

```bash
./scripts/check.sh
```

User-visible changes → update `CHANGELOG.md` (PR template checkbox).

## Architecture notes

- **SQLite + Flyway**: schema is Flyway-only (`ddl-auto: none`). New columns → new `backend/src/main/resources/db/migration/V*.sql`. WAL + `busy_timeout=30000`; Hikari pool size 4.
- **DB path is relative** (`./data/radar.db` from the process CWD). Running Maven from `backend/` writes `backend/data/`; `install.sh` uses root `data/`. Do not assume one path.
- **Env loading**: Spring `optional:file:.env[.properties]` from **backend working directory**. Copy `backend/.env.example` → `backend/.env`. Never commit `.env`.
- **Default LLM is local Ollama** (`OPENAI_BASE_URL=http://localhost:11434/v1`, no API key for localhost). Cloud still needs `OPENAI_API_KEY`. LLM failure falls back to heuristics — unit tests do not need a live model.
- **Backend tests are plain unit tests** (no `@SpringBootTest`). `./mvnw test` does not boot Spring, touch SQLite, or call the network. Keep it that way unless you intentionally add integration tests.
- **en→zh titles use Argos Translate** (`translate-service/`, port 8765), **not** the LLM. Sidecar down → titles stay English; scoring/summarize still work. Do not install `argostranslate[stanza]` (see `docs/installation.md`).
- **Packs**: empty DB is seeded from packs `ai-core` + `ai-cn` on first boot. `pom.xml` copies `packs/sources/*.json` and `packs/profiles/**` into the jar classpath. Prefer editing pack JSON over hardcoding sources.
- **Zhihu boot seeder**: every startup, `SourceSeeder.ensureZhihu` creates 「知乎推荐」 if missing. Default-enable only when the preferred CLI is executable (`ZHIHU_CLI_PATH` else `ZhihuConnector.DEFAULT_CLI`). Does not overwrite a working custom `cliPath`. Missing binary → source created **disabled** so other machines stay quiet.
- **Jobs**: fetch/push/cluster are mutex-guarded; overlapping runs return **409**. Manual: `POST /api/jobs/fetch`, `POST /api/jobs/push`, `POST /api/jobs/cluster`. Health: `GET /api/health`.
- **Extensibility contracts**: connectors implement `SourceConnector` (`@Component` under `com.airadar.connector`); delivery implements `DeliveryChannel`. New type codes need a `SourceType` enum value. Details: `docs/extending-connectors.md`, `docs/extending-delivery.md`.
- **OpenAPI**: springdoc at `/swagger-ui.html` and `/api-docs` (also proxied in Vite dev).

## Frontend

- Scripts: `dev`, `build`, `build:embed` (`RADAR_EMBED=1`), `lint` (oxlint), `test` (vitest).
- `build:embed` `emptyOutDir: true` wipes `backend/src/main/resources/static/` — expected; do not hand-edit those baked assets.
- i18n via `react-i18next`; primary language is a Settings concept (`summaryLanguage` zh/en), not a locale switch of the whole SPA.

## Do not commit

`backend/.env`, `data/`, `backend/data/`, `*.db`, `translate-service/.venv/`, `node_modules/`, `backend/src/main/resources/static/assets/` + `index.html` + `icons.svg`.

## Useful docs

`CONTRIBUTING.md` · `docs/installation.md` · `docs/ai-radar-2.0-domain.md` · `docs/extending-connectors.md` · `docs/extending-delivery.md` · `docs/mcp.md`
