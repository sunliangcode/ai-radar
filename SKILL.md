---
name: ai-radar
description: >-
  Operate a local AI Radar instance — personal AI intelligence pipeline
  (fetch → score → events → impact → Today). Use the ops CLI for health/jobs,
  or the MCP sidecar for read-mostly agent queries. Prefer read-only tools
  unless the user explicitly asks to fetch/push/cluster.
---

# AI Radar

**Personal AI intelligence radar** for a single self-hosted instance.

```
Context → Signal → Change → Decision → Review on Today
```

## Quick start (Cursor skill — **no npm install**)

Skill root = directory containing this `SKILL.md` (repo root).

```bash
# Prereq + health (JSON; use when unsure if the stack is up)
"<skill-root>/bin/ai-radar" doctor

# Health snapshot (JSON)
"<skill-root>/bin/ai-radar" health

# Intelligence home (five-question payload)
"<skill-root>/bin/ai-radar" home

# Trigger one fetch cycle (backend must be running)
"<skill-root>/bin/ai-radar" fetch

# List sources / SPI catalogs
"<skill-root>/bin/ai-radar" sources
"<skill-root>/bin/ai-radar" connectors
"<skill-root>/bin/ai-radar" delivery-channels

# Validate then import a local pack JSON (no jar rebuild)
"<skill-root>/bin/ai-radar" pack validate examples/packs/demo-local.json
"<skill-root>/bin/ai-radar" pack import demo-local --path examples/packs/demo-local.json
```

Equivalent without the wrapper:

```bash
node "<skill-root>/cli/ai-radar.mjs" health
```

**Do not** require `npm install` in `cli/` — the CLI uses Node built-ins only. MCP still needs `cd mcp && npm install` once.

## Agent workflow

1. Resolve **skill-root** (parent of `bin/ai-radar` / this file).
2. Confirm the stack is up: `bin/ai-radar doctor` (or `health` / MCP `get_health` / ask the user to run `./install.sh` / `./scripts/status.sh`).
3. For “what changed / why care”:
   - Prefer `bin/ai-radar home` or MCP `get_intelligence_home`
   - Prefer Change loop: `bin/ai-radar changes` / `change <id>` / `decisions` / `actions`, or MCP `list_changes` / `get_change` / `list_decisions` / `list_actions`
   - Optionally `list_high_impacts` / `list_events` via MCP (events are internal clustering)
4. For connector / delivery SPI catalogs: `bin/ai-radar connectors` / `delivery-channels`, or MCP `list_connectors` / `list_delivery_channels` (sorted by id).
5. For ops the user explicitly requests:
   - Fetch → `bin/ai-radar fetch` or MCP `run_fetch` (**only if** `ALLOW_WRITES=true`)
   - Push / cluster → same pattern (`push` / `cluster`)
   - Local pack file → `bin/ai-radar pack validate …` then `pack import <id> --path …` (see `docs/sources.md`)
6. Overlapping jobs return **409** — report that a job is already running; do not retry in a tight loop.
7. Prefer **read-only MCP** by default. Enable writes only when the user asks to mutate the pipeline.
8. Do **not** treat in-app **Chat** as a substitute for MCP/CLI — Chat interprets a Change; MCP/CLI talk to the REST API.

## Environment

| Var | Default | Meaning |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | Backend base URL |
| `LOCAL_TOKEN` | empty | Sent as `X-Local-Token` when set |
| `AI_RADAR_TIMEOUT_MS` | `8000` | CLI/MCP HTTP timeout (ms); `0` / negative / non-numeric disables; empty/unset → default |
| `AI_RADAR_DB` | `data/radar.db` | SQLite path for `backup` (`backend/data/radar.db` if Maven CWD) |
| `BACKUP_KEEP` | `14` | How many `data/backups/radar-*.db` files to retain (invalid → 14) |
| `ALLOW_WRITES` | `false` (MCP only) | Exposes `run_fetch` / `run_push` / `run_cluster` |

## Troubleshooting

| Error | Fix |
| --- | --- |
| `fetch failed` / connection refused | Start backend (`./install.sh` or `cd backend && ./mvnw spring-boot:run`) |
| `401` / forbidden | Set `LOCAL_TOKEN` to match backend `.env` |
| `409` on fetch/push/cluster | Another job holds the mutex — wait or check AI Monitor |
| doctor `versionAlign` warn | CLI SemVer ≠ API — `git pull` + `./install.sh` / rebuild |
| doctor `llm` heuristic/degraded | Configure Settings → AI model / start Ollama; `./bin/ai-radar health-llm` or MCP `probe_llm` |
| `health-llm` / doctor `modelPresent` warn | Pull `OPENAI_MODEL` (e.g. `ollama pull …`) or pick an id from `models[]` |
| doctor / status SPI catalog warn | Connector/delivery catalog unsorted, missing `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath`, `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`, or bad field types — see `docs/extending-connectors.md` / `docs/extending-delivery.md` |
| backup: database not found | Prefer `./bin/ai-radar backup` (auto-falls back to `backend/data/radar.db`); or set `AI_RADAR_DB` |
| Request timed out | Raise `AI_RADAR_TIMEOUT_MS` (empty/unset → 8000) or set `0` to disable |
| MCP tools missing writes | Set `ALLOW_WRITES=true` in MCP server env |
| `Unknown command` | Run `bin/ai-radar help` |

## Resources

- [CLI reference](docs/cli.md)
- [MCP setup](docs/mcp.md)
- [Agents](docs/agents.md)
- [Installation](docs/installation.md)
- [HTTP API](docs/api.md)
- [Development](docs/development.md)
