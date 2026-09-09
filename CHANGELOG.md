# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Connectors: Google News, GDELT, OSS Insight, GitHub Trending, V2EX, Telegram, Product Hunt, Twitter, WEB, EMAIL
- Source packs `ai-cn` / `ai-signals`; empty DB seeds from `ai-core` + `ai-cn` packs
- Web full-text enrich (`WEB_FETCH_*`), batch LLM summarize, `/api/connectors` descriptors
- Fetch progress / result summary UI; schema-driven Sources form

### Changed

- Pipeline no longer holds one long SQLite transaction across network/LLM I/O
- Persist uses bulk URL lookup + `saveAll`; web enrich runs with bounded parallelism
- Frontend `build:embed` writes into Spring `static/`; hashed assets are gitignored
- Settings exposes push-only-when-items, SMTP STARTTLS, and browser local token

### Fixed

- Home / Sources / Briefs keep content visible while a fetch job runs

## [0.1.0] - 2026-09-08

### Added

- Multi-source fetch pipeline (RSS, Hacker News, Reddit, GitHub) with normalize / dedup
- Heuristic and optional LLM scoring / summarization
- Event clustering and four-column intelligence home
- Daily brief generation and delivery via Feishu / Email / Webhook / Outbox
- Single-user Web UI (React + Vite + Tailwind) with Sources → Items → Briefs → Settings
- Spring Boot 3 backend on Java 21 with SQLite
- Source pack import (`packs/`) and extensibility docs
- Read-only MCP sidecar (`mcp/server.mjs`)
- Docker Compose / `install.sh` one-box run paths
- MIT license, contributing / security docs, CI, and self-hosted star history
