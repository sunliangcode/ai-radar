English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml)
![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3-green)

# AI Radar

**Personal AI Intelligence** — Know what changed. Know why it matters. Know what to do.

Understands your work & stack, detects external changes, explains impact, and suggests next actions (with optional experiments & ROI). Built on a 1.0 chassis: multi-source fetch → score/summary → Event clustering → daily brief → Feishu / Email / Webhook / Outbox.

**Stack:** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI-compatible LLM (optional)

### Why ai-radar?

- ✓ AI understands your **Context** (profile, projects, stack)
- ✓ Detects high-impact **Changes** (Event-backed)
- ✓ Explains **why you should care** (Impact × Context)
- ✓ Turns insight into **Actions** and measurable **Experiments**
- ✓ Mark **Interested** items; title keywords boost later relevance scoring (without overwriting Settings interest profile)
- ✓ 1.0 chassis: connectors, briefs, delivery, packs, read-only MCP

[Install](#3-step-quick-start) · [GitHub](https://github.com/sunliangcode/ai-radar)

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
cd frontend && npm install && npm run build:embed
# writes into backend/src/main/resources/static/
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
| GET/PATCH | `/api/items` (`saved` / `unread` / `sourceType` filters; PATCH `read` / `saved`) |
| GET | `/api/items/interest-keywords` (keywords from Interested titles) |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| POST | `/api/pipeline/run` (legacy alias of fetch pipeline) |

Swagger UI: `/swagger-ui.html`

Optional LAN guard: set `LOCAL_TOKEN` and send header `X-Local-Token`.

## Default sources

Seeded on empty DB: OpenAI / Hugging Face / Simon Willison RSS, 量子位 & 新智元 WeChat RSS, 36氪, HN, Reddit, GitHub search, Google News, GDELT, OSS Insight, GitHub Trending, V2EX. Token-gated samples (Product Hunt, Twitter, Telegram) are seeded **disabled**.

Import more packs:

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

### Connector types

RSS · Hacker News · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt (`PH_TOKEN`) · Twitter/X via Apify (`APIFY_TOKEN`) · WEB (AI extract) · EMAIL (IMAP) · Fixture

Optional: `WEB_FETCH_ENABLED=true` to expand short feed snippets before scoring.

## Layout

```text
backend/     Spring Boot API + jobs + delivery + static SPA
frontend/    React + Vite + Tailwind
mcp/         Read-only MCP sidecar
packs/       Source pack manifests
docs/        Extensibility docs
aim/         execution plans
Dockerfile / docker-compose.yml / install.sh
```

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

## Events, 2.0 & extensibility

- Intelligence home: `GET /api/intelligence/home` (five questions: changed / why care / impact / do / watch)
- Interested items: Raw feed → Interested / Interested only; keywords from saved titles feed scoring as `effectiveInterest = interestProfile + keywords(saved titles)` (affects later ingest scores only; unsaving drops them next run)
- Context: `GET/PUT /api/contexts`, extract & GitHub import
- Impact job: `POST /api/jobs/impact`
- Events: `GET /api/events`, `GET /api/events/{id}`; job `POST /api/jobs/cluster`
- Packs: `POST /api/packs/import` with body `{"packId":"ai-core|ai-cn|ai-signals"}` (`packs/sources/*.json`)
- Domain: [ai-radar-2.0-domain](docs/ai-radar-2.0-domain.md) · Plan: [aim/06](aim/06-ai-radar-2.0.md)
- Docs: [extending-connectors](docs/extending-connectors.md), [extending-delivery](docs/extending-delivery.md), [mcp](docs/mcp.md)
- MCP sidecar: `mcp/server.mjs` (read-only by default)
- Smoke: `scripts/smoke-extensibility.sh`

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Roadmap / plans](aim/README.md)
- [2.0 domain model](docs/ai-radar-2.0-domain.md)

## License

MIT — see [LICENSE](LICENSE).

## Star History

GitHub restricted public stargazer API access in 2026, so hosted `api.star-history.com` badges no longer work for most repos. This chart is generated by [`.github/workflows/star-history.yml`](.github/workflows/star-history.yml) and committed into the repo.

<!-- star-history:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/star-history/star-history-dark.svg">
  <img alt="Star history" src="assets/star-history/star-history-light.svg">
</picture>
<!-- star-history:end -->
