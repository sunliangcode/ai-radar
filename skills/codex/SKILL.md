---
name: ai-radar
description: Operate local AI Radar via ops CLI or MCP (health, home, fetch, sources).
---

# AI Radar (Codex)

Point the skill at the repo root (directory with `SKILL.md` / `bin/ai-radar`).

```bash
./bin/ai-radar doctor
./bin/ai-radar home
./bin/ai-radar connectors
./bin/ai-radar delivery-channels
./bin/ai-radar pack list
./bin/ai-radar sources
```

Writes (fetch / push / cluster) only when the user asks and the backend is up. MCP: prefer `get_health` / `probe_llm` before writes; Change loop via `list_changes` / `get_change` / `list_decisions` / `list_actions`; SPI catalogs via `list_connectors` / `list_delivery_channels`; write tools need `ALLOW_WRITES=true`.

Full agent guide: [SKILL.md](../../SKILL.md) · CLI: [docs/cli.md](../../docs/cli.md) · MCP: [docs/mcp.md](../../docs/mcp.md).
