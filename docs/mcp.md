# MCP server

Local **stdio** MCP sidecar that calls the AI Radar REST API on loopback. No cloud API keys for the sidecar itself (the backend may still talk to a local or cloud LLM).

For CLI ops see [cli.md](cli.md). Agent workflow: [agents.md](agents.md) · [SKILL.md](../SKILL.md).

---

## Install

```bash
cd mcp
npm install
```

Requires **Node 20.19+**. The backend must be reachable (default `http://127.0.0.1:8080`).

Verify syntax:

```bash
node --check server.mjs
```

Optional bin after install:

```bash
npx ai-radar-mcp
# or: node server.mjs
```

---

## Environment

| Var | Default | Meaning |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | Backend base URL |
| `LOCAL_TOKEN` | empty | Sent as `X-Local-Token` when backend requires it |
| `ALLOW_WRITES` | `false` | If `true`, registers `run_fetch` / `run_push` / `run_cluster` |
| `AI_RADAR_TIMEOUT_MS` | reads `8000`; jobs none | Same as CLI: short GETs default **8000** ms; `run_fetch` / `run_push` / `run_cluster` default to **no** client timeout. Set explicitly to force a limit on all calls. `0` / negative / non-numeric disables; empty/unset uses the per-call default |

With writes disabled, write tool names are **not registered** (and are rejected if called).

---

## Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "ai-radar": {
      "command": "node",
      "args": ["/ABS/PATH/ai-radar/mcp/server.mjs"],
      "env": {
        "AI_RADAR_BASE_URL": "http://127.0.0.1:8080",
        "LOCAL_TOKEN": "",
        "ALLOW_WRITES": "false"
      }
    }
  }
}
```

Replace `/ABS/PATH/ai-radar` with your checkout. Prefer **read-only** (`ALLOW_WRITES=false`) for agents unless you explicitly want job triggers.

---

## Tools

### Read (always registered)

| Tool | Args | Backend |
| --- | --- | --- |
| `get_health` | — | `GET /api/health` (`version`, DB, translate, LLM) |
| `probe_llm` | — | `GET /api/health/llm` (live models probe; check `modelPresent` / `hint`; empty `models[]` skips; accepts `{data:[]}` or bare array) |
| `list_events` | optional `status`, `minScore`, `limit` | `GET /api/events?…` |
| `get_event` | required `id` | `GET /api/events/{id}` |
| `list_briefs` | — | `GET /api/briefs` |
| `get_intelligence_home` | — | `GET /api/intelligence/home` |
| `list_sources` | — | `GET /api/sources` |
| `list_connectors` | — | `GET /api/connectors` (sorted by id; id == typeCode; expect `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath`) |
| `list_delivery_channels` | — | `GET /api/delivery/channels` (sorted by id; id == channel(); expect `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`) |
| `list_contexts` | — | `GET /api/contexts` |
| `list_high_impacts` | — | Derived from intelligence home (`impacts` / `whyCare`) |
| `list_active_experiments` | — | `GET /api/experiments` filtered to `status=running` |

### Write (`ALLOW_WRITES=true` only)

| Tool | Backend |
| --- | --- |
| `run_fetch` | `POST /api/jobs/fetch` |
| `run_push` | `POST /api/jobs/push` |
| `run_cluster` | `POST /api/jobs/cluster` |

Overlapping jobs return HTTP **409** from the API (mutex). Surfaces as a tool error string like `409 …`.

---

## Examples

Health (version / DB / translate / LLM):

```text
Tool: get_health
Args: {}
```

Live LLM probe:

```text
Tool: probe_llm
Args: {}
```

Intelligence home:

```text
Tool: get_intelligence_home
Args: {}
```

List high-score events:

```text
Tool: list_events
Args: { "minScore": 0.7, "limit": 20 }
```

Trigger fetch (writes enabled):

```text
Tool: run_fetch
Args: {}
```

---

## CLI ↔ MCP map

| Intent | MCP | CLI |
| --- | --- | --- |
| Health snapshot | `get_health` | `ai-radar health` |
| Live LLM probe | `probe_llm` | `ai-radar health-llm` |
| Home payload | `get_intelligence_home` | `ai-radar home` |
| Sources | `list_sources` | `ai-radar sources` |
| Connector catalog | `list_connectors` | `ai-radar connectors` |
| Delivery catalog | `list_delivery_channels` | `ai-radar delivery-channels` |
| Fetch | `run_fetch` | `ai-radar fetch` |
| Cluster | `run_cluster` | `ai-radar cluster` |
| Push | `run_push` | `ai-radar push` |
| Prereq / doctor JSON | — | `ai-radar doctor` |
| Process/PID status | — | `./scripts/status.sh` |

CI keeps the Tools tables above aligned with `mcp/server.mjs` (`shared/mcp-tools-sync.test.mjs`).

---

## Security

- Default bind target is **loopback**. Do not expose the MCP process on a public interface.
- Keep `ALLOW_WRITES=false` unless you trust the MCP client to trigger pipeline jobs.
- If the backend sets `LOCAL_TOKEN`, configure the same value on the MCP server.
- Responses are JSON text blobs; treat them as local-user data.

---

## Errors

Tool failures return **JSON** (not a bare stack string) with `error`, `hint`, and `fix[]` — same intent as the [CLI](cli.md) actionable messages:

```json
{
  "error": "backend_unreachable",
  "hint": "Cannot reach backend at http://127.0.0.1:8080.",
  "fix": [
    "Start: ./install.sh  or  cd backend && ./mvnw spring-boot:run",
    "Verify: ./scripts/status.sh  or  ./bin/ai-radar doctor",
    "Check AI_RADAR_BASE_URL"
  ]
}
```

```json
{
  "error": "request_timeout",
  "hint": "Request to http://127.0.0.1:8080 timed out.",
  "fix": [
    "Raise AI_RADAR_TIMEOUT_MS (reads default 8000; job POSTs default none) or set 0 to disable",
    "Client abort does not stop a server job — wait, then retry (overlapping POST → 409)",
    "Check AI Monitor / GET /api/jobs/fetch/progress, or ./bin/ai-radar doctor / ./scripts/status.sh"
  ]
}
```

| `error` | Cause | Fix |
| --- | --- | --- |
| `backend_unreachable` | Backend down / bad base URL | `./install.sh`; `./bin/ai-radar doctor`; check `AI_RADAR_BASE_URL` |
| `request_timeout` | AbortSignal timeout | Raise / clear `AI_RADAR_TIMEOUT_MS` (jobs default to no timeout); abort does not cancel server job |
| `writes_disabled` | Write tool with `ALLOW_WRITES=false` | Enable writes only with user consent, or use CLI |
| `job_conflict` | HTTP 409 mutex | Wait; AI Monitor / `./bin/ai-radar doctor` |
| `unauthorized` | 401/403 | Set `LOCAL_TOKEN` |
| `api_error` | Other HTTP/API failure | See `hint`; [cli.md](cli.md) |

Helpers live in [`shared/errors.mjs`](../shared/errors.mjs) (re-exported as `mcp/errors.mjs`). Unit tests: `node --test shared/errors.test.mjs`.

---

## Related

- Package quickstart: [mcp/README.md](../mcp/README.md) · [mcp/README.zh.md](../mcp/README.zh.md)
- [CLI](cli.md) · [API](api.md) · [Agents](agents.md) · [Installation](installation.md)
