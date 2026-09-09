# AI Radar MCP (read-only)

Local stdio MCP sidecar that calls the AI Radar REST API on loopback.

## Setup

```bash
cd mcp
npm install
```

Environment:

| Var | Default | Meaning |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | Backend base URL (loopback) |
| `LOCAL_TOKEN` | empty | Sent as `X-Local-Token` when backend requires it |
| `ALLOW_WRITES` | `false` | If `true`, exposes `run_fetch` / `run_push` |

## Cursor / Claude Desktop snippet

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

## Tools

- `list_events`, `get_event`
- `list_briefs`
- `get_intelligence_home` (five-question home)
- `list_sources`
- `list_contexts`
- `list_high_impacts`
- `list_active_experiments`
- Writes (`run_fetch`, `run_push`) only when `ALLOW_WRITES=true`

With writes disabled, write tool names are not registered (and are rejected if called).
