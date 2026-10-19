# Support

AI Radar is a **single-user, self-hosted** project. Use the channels below.

| Need | Where |
| --- | --- |
| Bug report | [GitHub Issues](https://github.com/sunliangcode/ai-radar/issues) — use the Bug report template |
| Feature idea | [GitHub Issues](https://github.com/sunliangcode/ai-radar/issues) — use the Feature request template |
| How to install / run | [docs/installation.md](docs/installation.md) · [README.md](README.md) |
| How to extend (connectors / delivery) | [docs/extending-connectors.md](docs/extending-connectors.md) · [docs/extending-delivery.md](docs/extending-delivery.md) |
| Security vulnerability | [SECURITY.md](SECURITY.md) — **do not** open a public issue |
| Community conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

There is no commercial SLA. Maintainers respond as capacity allows.

Before opening an issue, run `./bin/ai-radar doctor` (includes `cliVersion` and, when the backend is up, `versionAlign` + `llm` + soft `modelPresent` + soft SPI connectors/`deliveryChannels`) or `./scripts/status.sh` / `./bin/ai-radar health` / `./bin/ai-radar health-llm` / MCP `get_health` / `probe_llm`, and paste the JSON when relevant. Catalog dumps: `./bin/ai-radar connectors` / `delivery-channels`.

Database path tip: `install.sh` uses `data/radar.db`; Maven from `backend/` uses `backend/data/radar.db` — `backup` auto-finds either; override with `AI_RADAR_DB` if needed. Retention: `BACKUP_KEEP` (default 14; invalid → 14).

Slow/hanging CLI or MCP calls: raise `AI_RADAR_TIMEOUT_MS` (or set `0` to disable). Timed-out calls return `request_timeout` in MCP JSON.
