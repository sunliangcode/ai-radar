# CLI Reference

Complete command-line reference for the **ai-radar** ops CLI — a thin HTTP wrapper around the Spring Boot API.

For product overview see [README.md](../README.md). For install see [installation.md](installation.md). Agent usage: [SKILL.md](../SKILL.md) · [agents.md](agents.md).

---

## Quick recipes

```bash
# From a git clone (no npm install)
./bin/ai-radar health
./bin/ai-radar home
./bin/ai-radar sources

# Trigger pipeline jobs (backend must be up)
./bin/ai-radar fetch
./bin/ai-radar fetch --type RSS
./bin/ai-radar cluster
./bin/ai-radar push
./bin/ai-radar impact

# Import a source pack
./bin/ai-radar pack import ai-core

# Validate pack JSON locally (no backend)
./bin/ai-radar pack validate examples/packs/demo-local.json
./bin/ai-radar pack list

# Prereq + backend snapshot (JSON; agents / CI)
./bin/ai-radar doctor

# Local scripts (same as ./scripts/…)
./bin/ai-radar check
./bin/ai-radar backup

# Optional: put on PATH via npm link
cd cli && npm link
ai-radar health
```

---

## How to run

| Method | When to use | Example |
| --- | --- | --- |
| **`./bin/ai-radar`** | Git clone or Cursor skill; **no npm install** | `./bin/ai-radar health` |
| **`node cli/ai-radar.mjs`** | Same CLI without the bash wrapper | `node cli/ai-radar.mjs home` |
| **`npm link` in `cli/`** | Put `ai-radar` on PATH | `ai-radar status` |

### Requirements

| Component | Required when |
| --- | --- |
| Node **20.12+** | Always (CLI uses built-in `fetch`) |
| Running backend on `:8080` | All HTTP commands (`health`, `fetch`, …) |
| Bash | `check` / `backup` subcommands only |

The CLI package has **no npm dependencies**. MCP (`mcp/`) is separate and still needs `npm install` once.

---

## Environment

| Var | Default | Meaning |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | Backend base URL (no trailing slash required) |
| `LOCAL_TOKEN` | empty | If set, sent as header `X-Local-Token` |
| `AI_RADAR_TIMEOUT_MS` | `8000` | Per-request HTTP timeout (AbortSignal); `0` / negative / non-numeric disables; empty/unset uses default |
| `AI_RADAR_DB` | `data/radar.db` (repo root) | SQLite path for `backup` only. If unset and root DB missing, falls back to `backend/data/radar.db` |
| `BACKUP_KEEP` | `14` | How many `data/backups/radar-*.db` files `backup` retains (whitespace trimmed; non-numeric / <1 → 14) |

```bash
AI_RADAR_BASE_URL=http://127.0.0.1:8080 LOCAL_TOKEN=secret ./bin/ai-radar health
```

Same variables as the [MCP sidecar](mcp.md).

---

## Commands

### `health` / `status`

`GET /api/health` — `version` (`radar.api.version`), DB, translate sidecar, LLM config snapshot.

```bash
./bin/ai-radar health
./bin/ai-radar status    # alias
```

### `health-llm`

`GET /api/health/llm` — live probe against the configured OpenAI-compatible base URL (`GET {baseUrl}/models`).

JSON fields include `ok`, `latencyMs`, `models[]`, and `modelPresent` (whether `OPENAI_MODEL` appears in the list). When the endpoint is up but the model is missing, a `hint` suggests pulling or picking an available id. An empty `models[]` (some providers omit ids) skips the presence check and reports `modelPresent: true`. Parsing accepts OpenAI `{ "data": [...] }` or a bare `[{ "id": "…" }]` array.

```bash
./bin/ai-radar health-llm
make health-llm
```

### `home`

`GET /api/intelligence/home` — five-question intelligence payload (changed / why care / impact / do / watch).

```bash
./bin/ai-radar home | jq .
```

### `sources`

`GET /api/sources` — configured sources JSON.

```bash
./bin/ai-radar sources
```

### `connectors`

`GET /api/connectors` — connector SPI catalog sorted by id (type codes + config field descriptors). Use when adding a pack entry or a new connector.

```bash
./bin/ai-radar connectors | jq '.[].id'   # descriptor id == typeCode
```

### `delivery-channels`

`GET /api/delivery/channels` — delivery SPI catalog sorted by id (`id` == `channel()`, `displayName`, `settingsKeys`, `enabled`).

```bash
./bin/ai-radar delivery-channels | jq .
```

### `fetch`

`POST /api/jobs/fetch` — run the fetch pipeline.

```bash
./bin/ai-radar fetch
./bin/ai-radar fetch --type RSS
./bin/ai-radar fetch --type=GITHUB
```

Overlapping fetch/push/cluster jobs return **HTTP 409**; the CLI exits with code **3**.

### `push` / `cluster` / `impact`

```bash
./bin/ai-radar push       # POST /api/jobs/push
./bin/ai-radar cluster    # POST /api/jobs/cluster
./bin/ai-radar impact     # POST /api/jobs/impact
```

### `pack import <id> [--path FILE]`

`POST /api/packs/import` with body `{"packId":"…"}` and optional `"path"` (absolute path to a sources JSON array). Relative `--path` is resolved from the current working directory.

```bash
./bin/ai-radar pack import ai-cn
./bin/ai-radar pack import ai-core
./bin/ai-radar pack import ai-signals

# Local / uncommitted pack file (no jar rebuild)
./bin/ai-radar pack import demo-local --path examples/packs/demo-local.json
```

With `--path`, the CLI **preflights** with the same rules as `pack validate` (exit `2` on failure) before calling the API.

### `pack validate FILE`

Local-only schema check — **no backend**. Prints JSON `{ ok, path, count, errors, warnings }` and exits `2` when `ok` is false.

Checks: file exists · valid JSON · top-level **array** · each entry has non-empty `name` / `type` · `type` is a known `SourceType` · optional `defaultEnabled` is boolean · optional `config` is an object · warns on duplicate names · warns when `name` / `type` have surrounding whitespace (still accepted after trim) · warns when `type` casing is not canonical uppercase (still accepted after normalize) · warns on legacy `JUEJIN`/`CSDN` · warns when `FIXTURE` lacks `config.path` · warns when `RSS` lacks `config.feedUrl` (legacy `config.url` accepted).

```bash
./bin/ai-radar pack validate examples/packs/demo-local.json
./bin/ai-radar pack validate packs/sources/ai-core.json
```

### `pack list`

Lists `packs/sources/*.json` with per-pack validate results — **no backend**. Exit `1` if any pack fails schema.

```bash
./bin/ai-radar pack list | jq .
```

See [sources.md — 15-minute pack walkthrough](sources.md#15-minute-pack-walkthrough).

### `doctor`

Structured JSON health for onboarding and agents — **no curl required**. Top-level fields include `cliVersion`, `base`, `checks[]`, `next[]`. Checks Node ≥ 20.12, Java 21 (warn), demo pack + built-in `packs/sources/*.json` schema, then `GET /api/health` (backend `version`, translate, LLM mode). When the backend is up, also reports `versionAlign` (CLI SemVer vs `health.version`), `llm` (`ai` / `heuristic` / `degraded`), soft-warns `modelPresent` when `GET /api/health/llm` is ok but the configured model is missing from `models[]`, and soft-checks SPI catalogs (`connectors` / `deliveryChannels`: sorted, unique, no surrounding whitespace on ids/names/keys, `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath` / `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`, field types `text`/`path`/`secret`/`textarea`). Exit `1` when any check has `level: "error"` (warn-only mismatches do not fail).

```bash
./bin/ai-radar doctor | jq .
make doctor
```

For PID/port human snapshot, use [`./scripts/status.sh`](../scripts/status.sh) / `make status` (LLM soft → `health-llm`; soft SPI catalogs; optional daily-hot `:6688`).

### `check` / `backup`

Shell out to repo scripts (cwd = repo root):

| Command | Script |
| --- | --- |
| `ai-radar check` | [`scripts/check.sh`](../scripts/check.sh) — backend tests + frontend lint/test/build + mcp syntax |
| `ai-radar backup` | [`scripts/backup.sh`](../scripts/backup.sh) — WAL-safe SQLite backup (default `data/radar.db`; set `AI_RADAR_DB` for `backend/data/radar.db`) |

### `help` / `version`

```bash
./bin/ai-radar help
./bin/ai-radar version    # ai-radar-cli 0.1.0
```

---

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | HTTP or runtime error |
| `2` | Usage error (unknown command / bad `pack import`) |
| `3` | HTTP **409** conflict (job mutex) |

---

## CLI vs MCP vs curl

| Task | CLI | MCP tool | curl |
| --- | --- | --- | --- |
| Prereq / health JSON | `ai-radar doctor` | — (shell doctor) | — |
| Health | `ai-radar health` | `get_health` | `GET /api/health` |
| Live LLM probe | `ai-radar health-llm` | `probe_llm` | `GET /api/health/llm` |
| Intelligence home | `ai-radar home` | `get_intelligence_home` | `GET /api/intelligence/home` |
| List sources | `ai-radar sources` | `list_sources` | `GET /api/sources` |
| Connector catalog | `ai-radar connectors` | `list_connectors` | `GET /api/connectors` |
| Delivery catalog | `ai-radar delivery-channels` | `list_delivery_channels` | `GET /api/delivery/channels` |
| Pack list / validate | `pack list` / `pack validate` | — (local) | — |
| Fetch | `ai-radar fetch` | `run_fetch` (writes on) | `POST /api/jobs/fetch` |
| Cluster | `ai-radar cluster` | `run_cluster` (writes on) | `POST /api/jobs/cluster` |
| Push | `ai-radar push` | `run_push` (writes on) | `POST /api/jobs/push` |

Process/PID snapshot (not HTTP): still use [`./scripts/status.sh`](../scripts/status.sh). Script index: [`scripts/README.md`](../scripts/README.md).

---

## Troubleshooting

The CLI prints **actionable** multi-line hints (not a bare `fetch failed`):

| Symptom | Fix |
| --- | --- |
| `Cannot reach backend at …` | Start backend (`./install.sh` or `cd backend && ./mvnw spring-boot:run`), then `./scripts/status.sh` |
| `Unauthorized (401/403)` | Set `LOCAL_TOKEN` to match `backend/.env` |
| Exit code 3 / `Conflict (409)` | Wait for in-flight job; check Settings → System / AI Monitor |
| `Not found (404)` | Check `AI_RADAR_BASE_URL` |
| `Unknown command` | `./bin/ai-radar help` |
| `check` fails Node path | Use Node 20.12+; run from repo after `frontend` deps installed |
| doctor `versionAlign` warn | CLI SemVer ≠ `health.version` — `git pull` + `./install.sh` / rebuild |
| doctor `llm` heuristic/degraded | Configure LLM / Ollama; `./bin/ai-radar health-llm` |
| backup: database not found | Script auto-falls back to `backend/data/radar.db`; override with `AI_RADAR_DB` if needed |
| Request timed out | Raise `AI_RADAR_TIMEOUT_MS` (default 8000) or set `0` to disable |
| `health-llm` / doctor `modelPresent` warn | Pull `OPENAI_MODEL` or pick an id from `models[]` |

Offline smoke (used by `./scripts/check.sh` / CI): point at a closed port and confirm the “Cannot reach backend” hint appears.

---

## Related

- [MCP](mcp.md) · [HTTP API](api.md) · [Agents](agents.md) · [Development](development.md)
