# Connector CLI setup UX — design

**Date:** 2026-10-20  
**Status:** accepted (defaults locked; proceeding to implementation)  
**Goal:** Per-source reachability for CLI-backed connectors; when unreachable and a local/other AI is available, show Install → clone GitHub OSS CLI, set `cliPath`, cookie dialog, auto-probe until success or clear failure. Audit all connectors; adapt those that need this flow; ship matching Sources UI.

## Assumptions (locked unless revised)

| Topic | Choice |
|-------|--------|
| AI role | **None** — Install is always available for supported types that are not ready. Wizard does not call or require the LLM. |
| Scope (v1) | **ZHIHU / WEIBO / BILIBILI** get the wizard. Full audit of others; no wizard unless they need a local OSS CLI. |
| Install mechanism | **Prefer package install** (`uv tool install` → else `pipx install` → else `pip install --user`) using allowlisted PyPI package names. **Fallback:** `git clone` + `uv sync` / `pip install -e .` into `~/.ai-radar/clis/<type>/`, then absolute `cliPath`. Fail clearly if git/Python/`uv`/`pipx` missing. |
| Approach | Connector **setup SPI** + source-scoped setup APIs + Sources row Install modal. |

## Problem

Today:

- Weibo / Bilibili wrap public GitHub CLIs; users must install binaries themselves and paste Cookie into source config.
- Zhihu hardcodes a **machine-local** default path (`/Users/sunliang/workspace/own/zhihu-cli-go/zhihu`) — not portable.
- Sources list has Test / Enable / Delete only — no readiness chip, no guided Install.
- Boot seeders create CLI sources **disabled** when the binary is missing, with no path to “make it work” in-product.

## Architecture

### Optional SPI: `CliSetupSupport`

Implemented only by setup-capable connectors (or a registry of descriptors keyed by `SourceType`).

```text
repoUrl          — GitHub HTTPS clone URL (docs + clone fallback)
pypiPackage      — allowlisted PyPI / uv tool name (preferred install)
binaryName       — e.g. bili, weibo, zhihu (on PATH after tool install)
installRelPath   — relative binary under clone when using source fallback
buildCommands    — ordered argv lists for source fallback (cwd = clone dir)
writeCookie(c)   — CliCredentialWriter / zhihu cookies.json / ZHIHU_COOKIE
resolveCliPath(config) — env override → source cliPath → which(binary) → clone path
probe(cliPath)   — smoke command; returns ProbeResult
```

`ProbeResult.state`: `ok` | `need_cookie` | `cli_missing` | `failed`  
`ProbeResult.reason`: short user-facing string (never huge logs; truncate stderr ~400 chars, same as fetch errors today).

### APIs

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/sources/{id}/setup` | `{ supported, state, cliPath, installAvailable, reason, openSourceUrl }` |
| POST | `/api/sources/{id}/setup/install` | Clone+build (mutex per type), patch source config `cliPath` to absolute binary, return `{ cliPath, state, reason }` |
| POST | `/api/sources/{id}/setup/probe` | Optional body `{ cookie?: string }` — write cookie if provided, run probe, return `{ state, reason }` |

**`installAvailable`** = `supported && state != ready` (no AI gate).

**Unsupported types:** `supported: false`, `state: unsupported` — frontend keeps current buttons only.

**Concurrency:** overlapping install for the same type returns conflict (409), same spirit as fetch job mutex.

**Security:** local single-user app; still: no shell string concatenation (argv lists), clone only allowlisted `repoUrl` from connector code (not client-supplied), cookie written with existing 0600 credential files.

### Zhihu portability (resolved default)

- Replace `DEFAULT_CLI` machine path with portable `"zhihu"` + `OPEN_SOURCE_URL`.
- **Default public target:** [BAIGUANGMEI/zhihu-cli](https://github.com/BAIGUANGMEI/zhihu-cli) / PyPI `pyzhihu-cli` — supports `feeds --json` and `answer … --comments` matching current connector.
- Cookie: Python CLI stores `~/.zhihu-cli/cookies.json`; connector today sets `ZHIHU_COOKIE`. Setup probe should **write cookies file** (and keep env override for fetch). Optionally run `zhihu login --cookie "…"` if file format is non-trivial.
- If the operator still uses a private Go binary, custom `cliPath` continues to work; Install installs the public Python CLI.

### Install recipes (upstream-aligned)

| Type | Preferred install | Binary | Repo / docs | Cookie sink | Probe |
|------|-------------------|--------|-------------|-------------|-------|
| WEIBO | `uv tool install kabi-weibo-cli` (else pipx) | `weibo` | https://github.com/jackwener/weibo-cli | `~/.config/weibo-cli/credential.json` | `weibo hot --json --count 1` |
| BILIBILI | `uv tool install bilibili-cli` (else pipx) | `bili` | https://github.com/jackwener/bilibili-cli (code may still cite `public-clis/bilibili-cli` mirror — prefer jackwener canonical) | `~/.bilibili-cli/credential.json` | `bili hot --max 1 --json` |
| ZHIHU | `uv tool install pyzhihu-cli` (else pipx) | `zhihu` | https://github.com/BAIGUANGMEI/zhihu-cli | `~/.zhihu-cli/cookies.json` (+ `ZHIHU_COOKIE` for fetch) | `zhihu feeds --json --limit 1` |

After preferred install, resolve binary via `PATH` (`which`/`where`) and persist absolute path into source `cliPath` when found.

## Frontend

### Sources list (`SourceList`)

For each source with `supported: true`:

- **Chip** by `state`: ready / cli_missing / need_cookie / unreachable.
- **Install** button on the right when `installAvailable`.
- Existing Test / Enable / Delete unchanged.

Batch: N GETs on list load is OK for typical source counts; optional later `GET /api/sources/setup` batch.

### Install wizard modal

1. **Install** — call install; show progress phases (clone / build); show resolved `cliPath` on success.
2. **Cookie** — textarea + paste; allow empty if probe can succeed without auth (Bilibili hot often can).
3. **Probe** — call probe; on `need_cookie` / auth failure stay on cookie with reason; on `ok` close, refresh chip, optionally enable source if user wants (default: enable on success).

i18n: `en.json` + `zh.json` keys under `sources.setup.*`.

Manual `cliPath` + cookie on source detail remain for power users.

## Connector audit

| Type | Wizard v1? | Notes |
|------|------------|-------|
| ZHIHU, WEIBO, BILIBILI | **Yes** | OSS CLI + cookie |
| DAILY_HOT | No | Sidecar HTTP (`DAILY_HOT_BASE_URL` / compose) — different install model; future optional |
| TWITTER, PRODUCT_HUNT, EMAIL | No | Token / IMAP via env + source fields |
| RSS, HACKER_NEWS, REDDIT, GITHUB, GITHUB_TRENDING, GOOGLE_NEWS, GDELT, OSS_INSIGHT, V2EX, TELEGRAM, WEB, FIXTURE | No | Network/API; no local binary |
| JUEJIN, CSDN | No | Legacy; boot-disabled |

## Error matrix

| Failure | `reason` (examples) | UI |
|---------|---------------------|-----|
| git missing | Need `git` on PATH | Stay on Install |
| go/python/node missing | Need toolchain X | Stay on Install |
| clone/build fail | Truncated stderr | Retry Install |
| binary not executable | Path + hint | Retry Install |
| auth / cookie | Paste valid Cookie / login expired | Cookie step |
| timeout / other | Truncated CLI message | Retry Probe |
| concurrent install | Conflict | Wait / retry |

Success requires probe `ok` (after cookie if required) before chip → `ready`.

## Testing

- Backend unit tests (no `@SpringBootTest`): probe classification, `installAvailable` without AI, path resolution, credential write (temp HOME), fake Process/installer.
- Frontend vitest: Install visibility vs `installAvailable`; wizard happy/fail paths.
- CI must **not** clone live GitHub; mock installer interface.
- Update docs: `docs/api.md`, `docs/extending-connectors.md`, `docs/sources.md`, `CHANGELOG.md`, SPI catalog blurbs if descriptor fields change.

## Out of scope (v1)

- LLM narrating or driving install steps
- DailyHot / Docker one-click
- Streaming install logs (SSE)
- Windows packaging polish beyond best-effort
- Client-supplied arbitrary repo URLs

## Defaults for former open questions (override if you disagree)

1. **Zhihu:** BAIGUANGMEI / `pyzhihu-cli` via `uv tool install` (custom Go `cliPath` still OK).
2. **Enable on success:** yes — wizard enables the source after probe `ok`.
3. **AI gate:** none — Install works without Ollama / API key.

## Success criteria

- [ ] ZHIHU / WEIBO / BILIBILI expose setup status + install + probe APIs.
- [ ] Sources UI shows readiness + Install (LLM-gated) + cookie/probe wizard with clear failures.
- [ ] Zhihu default path is portable (no machine-local absolute path).
- [ ] Audit documented; non-CLI connectors unchanged aside from any shared list plumbing.
- [ ] Unit/frontend tests cover gate, probe states, and install path writing; CHANGELOG + API docs updated.
