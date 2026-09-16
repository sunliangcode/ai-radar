# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- **Settings**：Hub 恢复「系统 / AI 监控」入口（四卡片 + 状态条链到监控）；通知页默认仍简洁，经「详细配置」展开只读时区与「仅有内容才推」；兴趣与忽略仍只在 Context 编辑，保存时同步到评分用的 `interestProfile` 与 dislike 关键词
- **Settings 极简收敛**（前次）：Hub 收成核心入口 + 可折叠状态条；偏好页去掉兴趣描述与关键词编辑

### Added

- **Radar Chat** (`/chat`): multi-turn chat with the configured Ollama/OpenAI model; injects at most 2 related Changes per turn (seed via `?changeId=` from change detail); SSE streaming; session in localStorage
- `POST /api/chat` (SSE) and `POST /api/chat/sync`; prompt `chat_radar.md`

### Fixed

- Local Ollama (Qwen3.5 thinking models): chat/pipeline calls use native `/api/chat` with `think:false` so streamed `content` is not empty (OpenAI-compat was filling only `reasoning`)

### Changed

- **My Context** UX: free-text intro first; save auto-extracts when structured fields are empty; compact “how AI reads you” + collapsed advanced fields; extract prompt includes `current_focus` / `explicit_ignore`
- Settings → Sources: checkboxes to limit which sources appear across Today, Explore, Changes, Watching, Decisions, Actions, Briefs, and ⌘K search (stored locally; items API accepts `sourceIds`)
- **Today Radar Deck**: major changes are cleared one card at a time (keyboard w/x/i/d, progress strip); Explore adds Focus browse mode next to the waterfall grid
- Light engagement (local only): visit streak + today-read pills in the sidebar; Inbox Zero / deck-clear bursts; playful fetch/decision toasts
- Nav & copy: Chinese labels for 今日 / 变化 / 我的 Context; fetch steps and empty states lean more narrative
- **V2 product IA**: Today centers on ≤3 major Changes (why / what changed / what to do) with Watch · Dismiss · Decide; Explore replaces Feed in nav; Changes + Decisions pages; Monitor moves to Settings → System
- Flyway: single baseline `V1__init.sql` (delete local `data/radar.db` after pull to migrate)
- Daily Intelligence brief template (replaces “AI Radar Brief” header sections)
- Context schema v2 fields: `current_focus`, `explicit_ignore`; feedback nudges topic weights

### Fixed

- Flyway baseline `V1__init.sql`: migration sections run in dependency order (V1→V16); `install.sh` prints reset steps on checksum mismatch

### Added

- `decisions` + `watch_subscriptions` tables; APIs `POST /api/changes/{id}/decisions`, `POST …/dismiss`, `PUT /api/watch/{id}`, `GET /api/decisions?revisit=due`
- Intelligence home: `majorChanges`, `minorSignals`, `decisionsToRevisit`, `proactiveAlerts`
- Change detail: in-app Zhihu reading from evidence list (shared `ItemDetailBody` drawer)
- Scheduled daily decision revisit check (surfaces on Today)

### Changed (prior)

- Briefs UI: calendar-style archive cards (latest featured), structured detail cards (events + top picks), and header actions for update / send
- Feed Zhihu UX: localized source filter chips; sidebar highlights active `sourceType`; strip `【SOURCE】` title-echo from card leads; Zhihu card click / Enter opens the immersive drawer (original stays in drawer CTA); single-source filter uses a denser 1–2 column list and hides redundant source chips; Zhihu cards promote Expand over Not interested; score tiers get left-edge cues
- Feed cards: compact source chip + title-first layout (dropped empty cover band); click opens original URL; drawer shows a clear **Open original** CTA
- Feed browse UI: 2–3 column waterfall grid, slim chip filters, collapsible shortcuts; Save / Not interested stay primary
- Magazine MagCard / MagGrid shared by Today and Watching inherit the same cover + waterfall rhythm

### Added

- Exact-title fetch dedup: after URL merge, drop new items whose `title` already exists in-batch or in DB (`POST` fetch path via `UrlDedupStage`)
- `POST /api/jobs/cleanup-duplicate-titles` — merge duplicate `news_items` rows that share an exact title (keep best row; rewire event/timeline/actions links)
- Feishu scan-to-bind (Device Authorization Grant): Settings shows a QR code, stores app credentials + open_id, one-click unbind; push prefers IM API with legacy webhook fallback
- `POST/GET/DELETE /api/delivery/feishu/bind*` bind session APIs
- Magazine-style Feed / Today / Watching: dual-column MagCards + immersive detail drawer (browse rhythm + single-item focus)
- Today hero focus card for the top HIGH impact signal
- `JobScheduleCoordinator` — programmatic fetch / push / cluster schedule that re-arms from live settings; `@Scheduled` no longer freezes `${radar.*}` at boot
- `GET /api/jobs/schedule` — next/last run times, current cron/interval, and push-cron errors
- Settings save now hot-reloads the job schedule (no backend restart after changing fetch interval or push cron)
- Settings notify section + command palette: **Send today's brief** (manual push)
- Command palette: jump to Briefs, recompute impact, and trigger push
- Settings → System health shows next auto-fetch / auto-push; Advanced → Schedule shows the live plan after save
- Settings notify section shows a readable push result (channel / item count / failure reason)
- Dirty settings forms confirm before in-app navigation (in addition to browser unload)
- Feed shortcut footer labels each key (`j/k` move, `o` expand, `s` save, …)
- Optional item retention (`retentionDays`) + `POST /api/jobs/cleanup`; scheduled fetch runs it automatically when enabled
- `scripts/backup.sh` — WAL-safe SQLite backup into `data/backups/` (keeps last 14)
- `scripts/status.sh` — local health snapshot (backend, Argos translate, PID files, ports)
- `scripts/check.sh` — local CI-parity checks (backend tests, frontend lint/test/build, mcp syntax)
- Settings hub **System health** card (backend / DB / title-translate, same signals as `status.sh`)
- `GET /api/health` now reports Argos translate sidecar status (`up` / `down` / `disabled`)
- `install.sh` waits for `GET /api/health` after starting the backend
- Connectors: Google News, GDELT, OSS Insight, GitHub Trending, V2EX, Telegram, Product Hunt, Twitter, WEB, EMAIL
- Source packs `ai-cn` / `ai-signals`; empty DB seeds from `ai-core` + `ai-cn` packs
- Web full-text enrich (`WEB_FETCH_*`), batch LLM summarize, `/api/connectors` descriptors
- Fetch progress / result summary UI; schema-driven Sources form
- `frontend/src/lib/errors.ts` — shared `errorText()` so every failure surface reads the same
- Route-level code splitting (`React.lazy` + `Suspense`) and a localized "server unreachable" message
- Top-level `ErrorBoundary` with a localized fallback — a render crash used to leave a blank page
- Source-type display names (`zh`/`en`) for badges and the source-weight sliders, instead of raw enum keys
- `AiHealthTracker` + `GET /api/health` `llm` block: whether scoring/summaries run on the live model or on rules, with the last failure reason
- `GET /api/health/llm` live probe and a **Test connection** button under Settings → AI model
- Settings → System health shows an **AI model** row; `scripts/status.sh` reports the LLM mode
- **Briefs** page (`/briefs`) plus a sidebar entry — `/briefs/:date` was previously reachable only by typing the URL
- 404 page for unknown routes (previously a blank main area)
- `/api/health` reports configured LLM readiness (`ready`, `model`, `baseUrl`, `local`, `hasApiKey`)

### Changed

- Settings product surface: customers only edit interests / language / inbox email / Feishu bind / push time; LLM, SMTP transport, webhooks, weights, and pipeline knobs move to `.env` / `application.yml`
- Email notify: single inbox field (`smtpTo`); SMTP host/user/password are deployer-only; public DTO exposes `emailTransportReady`
- Settings hub card “AI model” → “Preferences & notifications” (`/settings/preferences`; `/settings/llm` redirects)
- Feed / Today / Watching lists use magazine MagCards + immersive drawer instead of flat accordion / divide-y stacks; shell content width `max-w-5xl`

- Sidebar source filters use localized source-type display names instead of raw enum keys (`HACKER_NEWS` → Hacker News)
- Zhihu source seed is portable: enable only when the local CLI exists; stop force-pinning a machine-specific `cliPath` over working custom paths
- Pipeline no longer holds one long SQLite transaction across network/LLM I/O
- Persist uses bulk URL lookup + `saveAll`; web enrich runs with bounded parallelism
- Frontend `build:embed` writes into Spring `static/`; hashed assets are gitignored
- Settings exposes push-only-when-items, SMTP STARTTLS, and browser local token
- Feed empty state is no longer a dead end: with no sources it links to **Add a source**, otherwise it offers **Update now**
- `vite.config.ts` uses `import.meta.dirname` (drops the Vite native-config-loader warning)
- **Update now** on Today now recomputes impact automatically, and a **Recompute impact** button was added — Today/Actions used to stay empty forever because nothing ever triggered impact
- Today's getting-started panel branches on whether sources exist (the "no sources" branch was unreachable after auto-seeding)
- The fetch result summary is no longer auto-dismissed the instant a job finishes, so kept/failed counts and "retry failed sources" are actually readable
- `SettingsHubPage` AI banner is three-state (live / degraded / rules) and derives from real call outcomes instead of a config string check
- `install.sh` hard-fails without npm or on Node/Java below the required version, probes the LLM after startup, and ends with explicit next steps
- Numeric settings keep a local draft and reject `NaN`/out-of-range input instead of PUTting it
- Context window default is consistently **8192** across `.env.example`, `application.yml` and docs (docs said 4096)
- `AI_PARALLELISM` docs no longer claim a tunable 1–8 range: LLM calls run single-threaded by design
- A failed LLM call now enters a short cooldown (`AI_FAILURE_COOLDOWN_MS`, default 60s) instead of paying the retry ladder for every batch — a first fetch against a dead endpoint dropped from ~200s to ~5s, and the log reason distinguishes `llm_not_ready` from `llm_failure_cooldown`. A successful call or **Test connection** clears it immediately
- `scripts/smoke-extensibility.sh` bounds every request with a timeout and prints progress, so it can no longer hang silently
- `scripts/status.sh` actively verifies the LLM instead of trusting cached state, so it no longer reports a dead endpoint as live

### Fixed

- Align `OPENAI_KEEP_ALIVE` docs/tests with runtime default `0` (unload after each local call)
- Home / Sources / Briefs keep content visible while a fetch job runs
- LLM failures logged as the unactionable `AI call failed: null`; failures now name the exception and walk the cause chain (`Failures.describe`)
- Silent mutation failures in the Feed (save / read / not-interested) and the command palette's bulk "mark all read" now toast the error, and bulk mark-all-read needs a confirming second Enter
- "Not interested" is undoable from its toast and no longer permanently hides an item on a single misclick
- `WatchingPage` shows an error + retry instead of "nothing here yet" when its queries fail; settings hub surfaces a settings load failure
- `ConfirmDialog` disables its buttons while the confirmed action is in flight (prevents double deletes)

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
