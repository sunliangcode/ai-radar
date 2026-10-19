# Agents (Cursor / Claude / Codex / Gemini)

How AI coding agents should operate a **local** AI Radar instance.

Canonical skill: [SKILL.md](../SKILL.md). Platform short copies: [skills/](../skills/).

---

## What agents are for

| Surface | Role |
| --- | --- |
| **Ops CLI** ([cli.md](cli.md)) | Doctor/health/`health-llm`, home JSON, jobs, connectors, delivery-channels, pack list/validate/import, backup (`AI_RADAR_DB` / `BACKUP_KEEP`) |
| **MCP** ([mcp.md](mcp.md)) | Structured tool calls (read-mostly; optional writes) |
| **In-app Chat** | Interprets a **Change** for the human — not a general ops channel |

Agents should **not** scrape the SPA or invent SQL against `radar.db`. Prefer CLI or MCP → REST.

---

## Cursor skill

1. Point Cursor at the repo (or copy/symlink root `SKILL.md` into your skills directory).
2. Skill root = directory containing `SKILL.md` and `bin/ai-radar`.
3. Typical prompts the skill handles well:
   - “Is AI Radar healthy?” → prefer `doctor` (CLI; check `versionAlign` / `llm` / `modelPresent` / SPI `connectors`·`deliveryChannels` against `BUILTIN_CONNECTOR_PAIRS` / `BUILTIN_DELIVERY_SETTINGS`) or MCP `get_health`
   - “What changed today / show intelligence home”
   - “Run a fetch” (only when user asks)
   - “List / validate / import packs”

```bash
"<skill-root>/bin/ai-radar" doctor
"<skill-root>/bin/ai-radar" home
"<skill-root>/bin/ai-radar" pack list
```

No `npm install` required for the CLI. If `doctor` reports backend down, tell the user to run `./install.sh` (or `cd backend && ./mvnw spring-boot:run`) — do not invent SQL or scrape the SPA.

---

## Claude Code / Codex / Gemini

| Copy | Path |
| --- | --- |
| Claude Code | [skills/claude-code/SKILL.md](../skills/claude-code/SKILL.md) |
| Codex | [skills/codex/SKILL.md](../skills/codex/SKILL.md) |
| Gemini CLI | [skills/gemini-cli/README.md](../skills/gemini-cli/README.md) |

These are thin redirects to the same CLI/MCP workflow.

---

## MCP in the IDE

Read-only by default (recommended for agents):

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

Enable writes only when the user wants the agent to trigger fetch/push/cluster:

```json
"ALLOW_WRITES": "true"
```

Setup steps: [mcp.md](mcp.md).

---

## Safety defaults

1. **Read first** — CLI `doctor`/`health`/`health-llm` or MCP `get_health` / `probe_llm` / `get_intelligence_home` / `list_*` before any write tool.
2. **No write loops** — HTTP **409** means a job is already running; wait and report.
3. **Loopback** — default base URL is `127.0.0.1`; do not point agents at untrusted hosts.
4. **Token** — if `LOCAL_TOKEN` is set on the backend, pass the same value in CLI/MCP env.
5. **Timeouts** — slow backends: raise `AI_RADAR_TIMEOUT_MS` (empty/unset/whitespace → default 8000) or set `0` / negative / non-numeric to disable; MCP may return `request_timeout`.
6. **Chat vs MCP** — use Chat only when the user is already in a Change conversation in the UI.

---

## Related

- [CLI](cli.md) · [MCP](mcp.md) · [Installation](installation.md) · [API](api.md)
