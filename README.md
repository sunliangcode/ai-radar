# AI Intelligence Radar

Personal AI intel: multi-source fetch → score/summary → **Event clustering** → daily brief → Feishu / Email / Webhook / Outbox. Single-user Web UI with four-column intelligence home.

**Stack:** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI-compatible LLM (optional)

## 3-step quick start

### 1. Configure

```bash
cd backend
cp .env.example .env
# optional: OPENAI_API_KEY, FEISHU_WEBHOOK_URL, WEBHOOK_URL, SMTP_*
```

Without `OPENAI_API_KEY`, the pipeline uses **heuristic** scoring (still produces a usable brief).

### 2. Run (pick one)

**Dev (API + UI separately)**

```bash
# terminal 1
cd backend && ./mvnw spring-boot:run

# terminal 2
cd frontend && npm install && npm run dev
# UI: http://localhost:5173  (proxies /api → :8080)
```

**Single process (UI baked into Spring)**

```bash
cd frontend && npm install && npm run build
rm -rf ../backend/src/main/resources/static/*
cp -R dist/. ../backend/src/main/resources/static/
cd ../backend && ./mvnw spring-boot:run
# http://localhost:8080
```

**Docker**

```bash
cp backend/.env.example backend/.env   # edit as needed
docker compose up -d --build
curl -s http://localhost:8080/api/health
```

**install.sh**

```bash
./install.sh
```

### 3. Trigger

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .   # needs a delivery channel
curl -s http://localhost:8080/api/items | jq .
```

Open the UI: Sources → Fetch → Items → Briefs → Settings.

## Delivery

| Channel | Env / Settings |
| --- | --- |
| Feishu | `FEISHU_WEBHOOK_URL` or Settings |
| Webhook | `WEBHOOK_URL` (+ optional headers JSON) |
| Email | `SMTP_HOST`, `SMTP_TO`, `SMTP_PASSWORD`, … |

Push runs daily at `radar.push-cron` (default `08:00` `Asia/Shanghai`). Fetch every `radar.fetch-interval-ms` (default 2h). Overlapping jobs are mutex-blocked (`409`).

No channels configured → fetch still works; push logs `no_channels` and skips.

## Main APIs

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| POST | `/api/jobs/fetch`, `/api/jobs/push` |
| CRUD | `/api/sources` |
| GET/PATCH | `/api/items` |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| POST | `/api/pipeline/run` (legacy alias of fetch pipeline) |

Swagger UI: `/swagger-ui.html`

Optional LAN guard: set `LOCAL_TOKEN` and send header `X-Local-Token`.

## Default sources

Seeded on empty DB: OpenAI Blog RSS, Hacker News, Reddit (ML / LocalLLaMA / artificial), GitHub search.

## Layout

```text
backend/     Spring Boot API + jobs + delivery + static SPA
frontend/    React + Vite + Tailwind
aim/         execution plans
Dockerfile / docker-compose.yml / install.sh
```

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

## Roadmap

See [`aim/README.md`](aim/README.md). Steps 1–3 (pipeline, run experience, product UI) are implemented. Event clustering is step 4.


## Events & extensibility

- Intelligence home: `GET /api/intelligence/home` (four columns)
- Events: `GET /api/events`, `GET /api/events/{id}`; job `POST /api/jobs/cluster`
- Packs: `POST /api/packs/import` (`packs/sources/ai-core.json`)
- Docs: [extending-connectors](docs/extending-connectors.md), [extending-delivery](docs/extending-delivery.md), [mcp](docs/mcp.md)
- MCP sidecar: `mcp/server.mjs` (read-only by default)
- Smoke: `scripts/smoke-extensibility.sh`
