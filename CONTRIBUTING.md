# Contributing

Thanks for helping improve ai-radar.

## Project layout

```
ai-radar/
├── backend/       # Spring Boot API, jobs, delivery, static SPA host
├── frontend/      # React + Vite + Tailwind UI
├── mcp/           # Read-only MCP sidecar
├── packs/         # Source pack manifests
├── docs/          # Extensibility docs
├── scripts/       # Smoke and helper scripts
├── aim/           # Execution plans (historical / internal)
├── Dockerfile
├── docker-compose.yml
└── install.sh
```

## Scope

Contributions are welcome across:

- Fetch connectors (RSS, HN, Reddit, GitHub, Google News, GDELT, Telegram, Twitter, …)
- Scoring / summarization / event clustering
- Delivery channels (Feishu, Email, Webhook, Outbox)
- Web UI and intelligence home
- MCP sidecar and pack manifests
- Docs, tests, and install / Docker experience

Planning notes under `aim/` are historical — prefer updating `CHANGELOG.md` and product docs for user-visible work.

## Setup

Requires **Java 21**, **Node 20+**, and optionally an OpenAI-compatible API key.

**Backend**

```bash
cd backend
cp .env.example .env
./mvnw spring-boot:run
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
# UI: http://localhost:5173 (proxies /api → :8080)
```

**MCP (optional)**

```bash
cd mcp
npm install
node server.mjs
```

## Making changes

1. Edit the relevant module (`backend/`, `frontend/`, `mcp/`, `docs/`, …)
2. Add or update tests where practical
3. Run the checks below
4. Update `CHANGELOG.md` for user-visible changes

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run lint && npm run test && npm run build
```

Optional smoke:

```bash
./scripts/smoke-extensibility.sh
```

## Pull requests

- Keep PRs focused
- Fill out the PR template (summary, test plan, CHANGELOG checkbox)
- Do not commit secrets (`.env`) or `node_modules`
