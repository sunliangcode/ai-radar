# Security Policy

AI Radar is a **single-user, self-hosted** app. Treat the host and `.env` as the trust boundary.
What data stays local vs leaves the host: [PRIVACY.md](PRIVACY.md).

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes |
| `< 0.1` | No |

## Reporting a Vulnerability

Please report security vulnerabilities via [GitHub Security Advisories](https://github.com/sunliangcode/ai-radar/security/advisories/new) (private disclosure).

**Do not** open public issues for security reports.

We will acknowledge receipt and work on a fix; no specific SLA is guaranteed.

## Self-hosted assumptions

- Bind to **localhost** (or a private network) unless you intentionally reverse-proxy with auth.
- Set `LOCAL_TOKEN` in `backend/.env` and send it as `X-Local-Token` from the CLI/MCP when the API is reachable beyond loopback. Mutating routes and `/api/settings` require the token. (`GET /api/health` and `GET /api/health/llm` stay reachable without it so probes / compose healthchecks / Settings “Test connection” keep working; other read-only GETs are also open.)
- Never commit `.env`, cookies, API keys, or SQLite DBs (`data/`, `backend/data/`).
- MCP writes (`run_fetch` / `run_push` / `run_cluster`) stay off unless `ALLOW_WRITES=true`.
- Connector credentials (Zhihu/Weibo cookies, `PH_TOKEN`, `APIFY_TOKEN`, …) are secrets — paste in Settings / Sources UI, do not put them in pack JSON committed to git.
- When `LOCAL_TOKEN` is set, paste the same value in **Settings → Browser local token** (stored in this browser as `X-Local-Token`). Without it, Settings and mutations return 401.

## Dependency updates

Weekly [Dependabot](.github/dependabot.yml) PRs cover Maven (`backend/`), npm (`frontend/`, `mcp/`), pip (`translate-service/`), Docker (root + `translate-service/`), and GitHub Actions. Review and CI-gate before merge.

PRs also run [dependency review](.github/workflows/dependency-review.yml) (fails on high+ advisories in changed manifests). [CodeQL](.github/workflows/codeql.yml) scans Java and JavaScript/TypeScript on push/PR and weekly.

## Useful checks

```bash
./bin/ai-radar doctor          # prereq + health JSON (versionAlign, llm, translate)
./bin/ai-radar health-llm      # live models probe (or MCP probe_llm)
./scripts/status.sh            # PID / port snapshot
```
