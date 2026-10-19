# MCP sidecar

Local **stdio** MCP server for AI Radar. It calls the backend REST API on loopback (default `http://127.0.0.1:8080`). No cloud API keys for the sidecar itself.

[中文](README.zh.md)

Full tool tables, examples, and error codes: [docs/mcp.md](../docs/mcp.md).

## Layout

| File | Role |
| --- | --- |
| `server.mjs` | MCP stdio entry (`ai-radar-mcp` bin) |
| `errors.mjs` | Tool error JSON (`error` / `hint` / `fix[]`) |
| `package.json` | Package metadata + `@modelcontextprotocol/sdk` |

## Prerequisites

- **Node 20.19+**
- Backend reachable (e.g. `./install.sh` or `cd backend && ./mvnw spring-boot:run`)

## Install & run

```bash
cd mcp
npm install
node --check server.mjs
node server.mjs
# or: npx ai-radar-mcp
```

## Environment

| Var | Default | Meaning |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | Backend base URL |
| `LOCAL_TOKEN` | empty | Sent as `X-Local-Token` when backend requires it |
| `ALLOW_WRITES` | `false` | If `true`, registers `run_fetch` / `run_push` / `run_cluster` |
| `AI_RADAR_TIMEOUT_MS` | reads `8000`; jobs none | Same as CLI; see [docs/mcp.md](../docs/mcp.md) |

Prefer **read-only** (`ALLOW_WRITES=false`) unless you explicitly want agents to trigger pipeline jobs.

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

Replace `/ABS/PATH/ai-radar` with your checkout path.

## Tools (overview)

**Read** (always registered): e.g. `get_health`, `probe_llm`, `get_intelligence_home`, `list_events`, `list_sources`, `list_connectors`, …

**Write** (`ALLOW_WRITES=true` only): `run_fetch`, `run_push`, `run_cluster`

Complete list and args: [docs/mcp.md](../docs/mcp.md#tools).

## Security

- Target **loopback** only; do not expose this process on a public interface.
- Keep `ALLOW_WRITES=false` unless you trust the MCP client.
- If the backend sets `LOCAL_TOKEN`, use the same value here.

## Related

- [docs/mcp.md](../docs/mcp.md) · [docs/cli.md](../docs/cli.md) · [docs/agents.md](../docs/agents.md) · [SKILL.md](../SKILL.md)
