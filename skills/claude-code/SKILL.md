---
name: ai-radar
description: Operate local AI Radar via ops CLI or MCP (health, home, fetch, sources).
---

# AI Radar (Claude Code)

Clone or open [ai-radar](https://github.com/sunliangcode/ai-radar), then:

```bash
/path/to/ai-radar/bin/ai-radar doctor
/path/to/ai-radar/bin/ai-radar home
/path/to/ai-radar/bin/ai-radar connectors
/path/to/ai-radar/bin/ai-radar delivery-channels
/path/to/ai-radar/bin/ai-radar pack list
/path/to/ai-radar/bin/ai-radar fetch
```

No npm install required for the CLI (`cli/` uses Node built-ins). Backend must be running on `:8080` (or set `AI_RADAR_BASE_URL`).

MCP (read-only by default): prefer `get_health` / `probe_llm` / `get_intelligence_home` before write tools. SPI catalogs: `list_connectors` / `list_delivery_channels` (sorted by id).

```bash
cd /path/to/ai-radar/mcp && npm install
# Cursor / Claude Desktop: command node, args [.../mcp/server.mjs]
```

See root [SKILL.md](../../SKILL.md), [docs/cli.md](../../docs/cli.md), [docs/mcp.md](../../docs/mcp.md).
