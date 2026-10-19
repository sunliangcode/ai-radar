# scripts/

Ops helpers used by contributors and `make` / `./bin/ai-radar`.

| Script | Purpose |
| --- | --- |
| [`check.sh`](check.sh) | Local CI parity (`make check` / `ai-radar check`) |
| [`status.sh`](status.sh) | Human health snapshot (PIDs, ports `:8080`/`:8765`/optional `:6688`, LLM probe → `health-llm` / `modelPresent`, soft SPI via [`shared/check-spi-catalog.mjs`](../shared/check-spi-catalog.mjs)) |
| [`backup.sh`](backup.sh) | WAL-safe SQLite backup (`ai-radar backup`; `AI_RADAR_DB` override; keeps last `BACKUP_KEEP` default 14; auto-fallback to `backend/data/radar.db`) |
| [`smoke-extensibility.sh`](smoke-extensibility.sh) | Live SPI + fetch/cluster/push smoke (needs `:8080`; same `check-spi-catalog.mjs` as status/doctor) |

Prefer JSON machine checks via:

```bash
./bin/ai-radar doctor          # includes cliVersion + versionAlign + llm + soft modelPresent + SPI catalogs when backend is up
./bin/ai-radar health-llm      # live models probe (also: make health-llm / MCP probe_llm)
./bin/ai-radar connectors
./bin/ai-radar delivery-channels
./bin/ai-radar pack list
```
