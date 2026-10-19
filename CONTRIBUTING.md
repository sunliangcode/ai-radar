# Contributing

Thanks for helping improve ai-radar.

## Project layout

```
ai-radar/
├── backend/       # Spring Boot API, jobs, delivery, static SPA host
├── frontend/      # React + Vite + Tailwind UI
├── cli/           # Ops CLI (ai-radar); bin/ai-radar wrapper
├── mcp/           # MCP stdio sidecar
├── shared/        # Shared Node helpers (errors, pack validate)
├── packs/         # Source pack manifests
├── docs/          # Ops + extensibility docs
├── skills/        # Claude / Codex / Gemini skill copies
├── SKILL.md       # Cursor agent skill
├── scripts/       # Smoke and helper scripts
├── aim/           # Historical iteration notes (not current specs)
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
- Ops CLI, MCP sidecar, agent skills, and pack manifests
- Docs, tests, and install / Docker experience

Notes under `aim/` are historical iteration only — prefer updating `CHANGELOG.md` and product docs for user-visible work.

## Setup

Requires **Java 21**, **Node 20.12+** (see root `.nvmrc`; Vite 8 needs `util.styleText`), and optionally an OpenAI-compatible API key.

**First hour**

```bash
nvm use                 # or install Node 20.12+
./bin/ai-radar doctor   # prereqs + whether backend is up
make check              # CI-parity before you push
```

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

**Ops CLI (optional)**

```bash
./bin/ai-radar doctor       # Node/Java/pack + backend snapshot (JSON; soft modelPresent)
./bin/ai-radar health       # GET /api/health (backend must be running)
./bin/ai-radar health-llm   # live LLM probe (or: make health-llm)
./bin/ai-radar help
```

**MCP (optional)**

```bash
cd mcp
npm install
node server.mjs
```

## Making changes

1. Edit the relevant module (`backend/`, `frontend/`, `cli/`, `mcp/`, `docs/`, …)
2. Add or update tests where practical
3. Run the checks below
4. Update `CHANGELOG.md` for user-visible changes

## Tests

Preferred one-shot (matches local CI parity):

```bash
make check
# same as: ./scripts/check.sh
```

Other shortcuts: `make help` · `make status` · `make health` · `make health-llm` · `make doctor` · `make backup` · `make pack-list` · `make pack-validate FILE=…` · `make smoke`.

`make backup` / `./bin/ai-radar backup` WAL-safely copies SQLite; if root `data/radar.db` is missing it auto-uses `backend/data/radar.db` (Maven CWD). Retention: `BACKUP_KEEP` (default 14; invalid → 14).

Equivalent pieces:

```bash
cd backend && ./mvnw test
cd frontend && npm run lint && npm run test && npm run build
cd mcp && node --check server.mjs
cd shared && node --test *.test.mjs   # inventory / version / docs / skills gates
cd cli && node --check ai-radar.mjs
```

Optional smoke:

```bash
./scripts/smoke-extensibility.sh   # needs a running backend
./scripts/status.sh                # health snapshot (backend + translate + soft SPI catalogs via check-spi-catalog; LLM soft → health-llm)
./bin/ai-radar doctor              # prereq + health JSON (includes cliVersion + soft SPI catalogs / BUILTIN_CONNECTOR_PAIRS + BUILTIN_DELIVERY_SETTINGS)
./bin/ai-radar health              # HTTP health JSON (includes version)
./bin/ai-radar health-llm          # live models probe
```

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Support: [SUPPORT.md](SUPPORT.md). Security reports: [SECURITY.md](SECURITY.md) (not public issues).

Cutting a version: [docs/release.md](docs/release.md) (bump package.json + `radar.api.version` + `CITATION.cff` together). Extending connectors/delivery: [docs/extensibility.md](docs/extensibility.md).

When changing the Argos Translate pin, update `translate-service/requirements.txt` and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) together (CI: `shared/argos-version-sync.test.mjs`).

## Pull requests

- Keep PRs focused
- Fill out the PR template (summary, test plan, CHANGELOG checkbox)
- Do not commit secrets (`.env`) or `node_modules`
- Line endings: [`.gitattributes`](.gitattributes) forces LF for shell, Node, Java, YAML, Markdown, XML, JSON, TypeScript, CSS
- Reviewers: see [`.github/CODEOWNERS`](.github/CODEOWNERS) (GitHub may auto-request)
