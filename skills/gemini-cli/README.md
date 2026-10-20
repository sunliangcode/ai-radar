# AI Radar (Gemini CLI)

Use the repo checkout — no separate Gemini package.

```bash
# From ai-radar root
./bin/ai-radar doctor
./bin/ai-radar home
./bin/ai-radar connectors
./bin/ai-radar delivery-channels
./bin/ai-radar pack list
```

Env: `AI_RADAR_BASE_URL` (default `http://127.0.0.1:8080`), optional `LOCAL_TOKEN`.

Prefer the root [SKILL.md](../../SKILL.md) for agent workflow. For IDE MCP, see [docs/mcp.md](../../docs/mcp.md) (`get_health` / `probe_llm` first; Change loop: `list_changes` / `get_change` / `list_decisions` / `list_actions`; SPI catalogs: `list_connectors` / `list_delivery_channels`).
