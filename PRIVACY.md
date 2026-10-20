# Privacy

AI Radar is a **single-user, self-hosted** app. There is no hosted multi-tenant cloud service in this repository. Your data stays on the machine (or private network) where you run it, unless **you** configure outbound integrations.

## What stays local

| Data | Typical location / channel |
| --- | --- |
| SQLite database (items, changes, decisions, context, watches, …) | `./data/radar.db` (install) or `backend/data/radar.db` (Maven CWD) |
| Briefs / outbox artifacts | `./data/briefs/`, `./data/outbox/` |
| Settings & secrets you paste (API keys, cookies, tokens) | SQLite / env (e.g. `backend/.env`) — never commit these |
| UI prefs (display mode, localStorage) | Browser on your device |

Backups (`./bin/ai-radar backup` / `./scripts/backup.sh`) copy the DB under your control; retention is `BACKUP_KEEP` (default 14).

## What may leave the host (only if you enable it)

Outbound calls are opt-in via configuration and sources you enable:

- **Source fetch** — connectors pull from the feeds / APIs you configured (RSS, GitHub, Zhihu CLI, …). Cookies and tokens you paste are sent only to those services as required by the connector.
- **LLM** — scoring / summarize / chat use the OpenAI-compatible endpoint you set (`OPENAI_BASE_URL`). Default docs assume **local Ollama**; cloud providers receive prompts you trigger.
- **Title translation** — English→Chinese titles use the local Argos Translate sidecar when running; not a third-party SaaS by default.
- **Delivery** — Feishu / SMTP / webhook / outbox send content you choose to push.

The project does **not** ship product analytics, advertising SDKs, or phone-home telemetry.

## Auth boundary

Treat the host and `.env` as the trust boundary. See [SECURITY.md](SECURITY.md):

- Prefer binding to localhost or a private network behind your own reverse proxy + auth.
- Set `LOCAL_TOKEN` when the API is reachable beyond loopback.

## Your responsibilities

- Do not expose an unauthenticated instance to the public internet.
- Rotate or revoke connector credentials (cookies, API keys) if they leak.
- Delete or encrypt backups that leave the machine.
- When opening issues, redact secrets from `doctor` / health JSON and screenshots.

## Questions

Security-sensitive reports: [SECURITY.md](SECURITY.md) (private advisories).  
General support: [SUPPORT.md](SUPPORT.md).
