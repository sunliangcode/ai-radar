# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
