# API reference

English | [中文](#api-参考)

Interactive docs (when the backend is running): [Swagger UI](http://localhost:8080/swagger-ui.html) · OpenAPI JSON at `/api-docs` (externalDocs link back to this page).

Swagger tags include **Health**, **Connectors**, and **Delivery** (also `./bin/ai-radar health` / `connectors` / `delivery-channels`). Default Try-it server: `http://127.0.0.1:8080`.

There is **no separate Java client SDK**. Use:

- Browser / curl against REST
- Ops [CLI](cli.md) (`./bin/ai-radar …`)
- [MCP](mcp.md) sidecar for agents

Optional LAN guard: set `LOCAL_TOKEN` in `backend/.env` and send header `X-Local-Token` on mutating routes and `/api/settings`. Values are trimmed (accidental whitespace ignored). `GET /api/health` and `GET /api/health/llm` remain open for probes (compose / `doctor` / Settings LLM test); other read-only GETs are also open.

Domain model: [ai-radar-2.0-domain.md](ai-radar-2.0-domain.md).

---

## Conventions

| Topic | Behavior |
| --- | --- |
| Base URL | `http://127.0.0.1:8080` (Vite dev proxies `/api` → same) |
| Auth | Optional shared token header — single-user, not multi-tenant OAuth |
| Job mutex | Overlapping `fetch` / `push` / `cluster` (and related) return **409** |
| Errors | Problem details / message body; see Swagger for schemas |

### curl helpers

```bash
export BASE=http://127.0.0.1:8080
# export TOKEN=... ; HDR=(-H "X-Local-Token: $TOKEN")

curl -s "$BASE/api/health" | jq .
curl -s "$BASE/api/health/llm" | jq .
curl -s -X POST "$BASE/api/jobs/fetch" | jq .
curl -s "$BASE/api/intelligence/home" | jq .
```

Same via CLI: `./bin/ai-radar health` · `./bin/ai-radar health-llm` · `./bin/ai-radar fetch` · `./bin/ai-radar home`.

---

## Health & monitor

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `version` (`radar.api.version`) + DB + `translate.status` (`up` / `down` / `disabled`) + LLM config snapshot |
| GET | `/api/health/llm` | Live probe (`GET {OPENAI_BASE_URL}/models`); `modelPresent` / `hint` when model missing from list (empty `models[]` or blank configured model skips; configured name trimmed; accepts `{data:[]}` or bare array) |
| GET | `/api/ai/monitor` | LLM context usage & token/s |
| GET | `/api/ai/monitor/stream` | SSE monitor stream |

---

## Jobs & pipeline

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/jobs/schedule` | Schedule snapshot |
| POST | `/api/jobs/fetch` | Full fetch; optional `?sourceType=` |
| GET | `/api/jobs/fetch/progress` | In-flight fetch progress |
| POST | `/api/jobs/push` | Delivery push |
| POST | `/api/jobs/cluster` | Event clustering |
| POST | `/api/jobs/impact` | Impact scoring |
| POST | `/api/jobs/cleanup` | Retention cleanup |
| POST | `/api/jobs/cleanup-duplicate-titles` | Title dedup maintenance |
| POST | `/api/pipeline/run` | Legacy alias of fetch pipeline |

Mutex: concurrent runs of guarded jobs → **409**. CLI maps this to exit code **3**. The SPA treats fetch **409** as join-in-progress (poll `GET …/fetch/progress`) rather than a hard failure.

---

## Intelligence & context

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/intelligence/home` | Five-question home (changed / why care / impact / do / watch); `majorChanges` excludes dismissed / watched / open decisions; includes `following` |
| PUT/DELETE | `/api/watch/{changeId}` | Follow / unfollow a change (`GET /api/changes/{id}` includes `watched`) |
| GET | `/api/watching/timeline` | Followed changes + recent timeline entries (subscriptions, not memory audit) |
| GET/PUT | `/api/contexts` | Single-user Context profile |
| POST | `/api/contexts/extract` | Draft Context fields from free text |
| POST | `/api/contexts/import/markdown` | Import Context from markdown |
| POST | `/api/contexts/import/github` | Import Context hints from a GitHub profile/repo URL |
| GET | `/api/decisions` | Open decisions; `?revisit=due` for past-revisit queue |
| GET | `/api/actions` | Recommended actions derived from decisions / opportunities |
| PATCH | `/api/actions/{id}` | Update action status |
| GET | `/api/opportunities` | Opportunity list (internal engine surface) |
| GET | `/api/memory` | Memory audit rows |
| GET | `/api/outcomes/summary` | Outcome summary |
| GET | `/api/events` | List events (filters: status, scores, limit — see Swagger) |
| GET | `/api/events/{id}` | Event + timeline / items |
| GET | `/api/changes` / `/api/changes/{id}` | Change cards (impact why / recommendation; detail includes `latestDecision` when open) |
| POST | `/api/changes/{id}/recompute-impact` | Refresh one change’s impact scores + copy (current Context / `summaryLanguage`) |
| POST | `/api/changes/{id}/decisions` | Record a decision; kind `watch` upserts Follow; kind `ignore` removes Follow if present |
| POST/DELETE | `/api/changes/{id}/dismiss` | Dismiss from Today triage / undo dismiss (clears dismissed memory rows) |

---

## Sources, packs, items, briefs

| Method | Path | Notes |
| --- | --- | --- |
| CRUD | `/api/sources` | Source configuration |
| GET | `/api/connectors` | Connector catalog sorted by id case-insensitively (Swagger tag **Connectors**; expect `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath`; field types: `text`/`path`/`secret`/`textarea`) |
| GET | `/api/delivery/channels` | Delivery channel catalog sorted by id case-insensitively (`id` == `channel()`, `displayName`, `settingsKeys`, `enabled`; expect `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`; Swagger tag **Delivery**) |
| POST | `/api/packs/import` | Body `{"packId":"ai-core\|ai-cn\|ai-signals"}`; optional `"path"` = absolute JSON array file (no jar rebuild). Prefer CLI: `ai-radar pack validate` / `pack import … --path` |
| GET/PATCH | `/api/items` | Filters: `saved` / `unread` / `sourceType`; list also accepts `cursor` + `limit` (returns `nextCursor` / `hasMore`; `offset` still supported). PATCH `read` / `saved` / `dismissed` |
| GET | `/api/items/{id}` | Single item DTO (deep-link / Actions related item) |
| GET | `/api/items/{id}/detail` | Item + enrichment / related context for reader drawer |
| GET | `/api/items/unread-counts` | Unread per `primary_source_type` plus aggregate `total`; optional `sourceIds` / `sourceType` |
| GET | `/api/items/badge` | `{ unreadItems, total }` for nav badges; optional `sourceIds` / `sourceType` / `since` |
| POST | `/api/items/mark-all-read` | Optional query `sourceType` / `since` / `sourceIds`; returns `{ updated, ids }` (`ids` capped at 2000 for Undo) |
| GET | `/api/items/search` | Also accepts `sourceType` / `unread` / `since` (plus `sourceIds`) so search matches feed filters |
| GET | `/api/decisions/badge` | `{ due }` count of open decisions past revisit |
| POST | `/api/decisions/{id}/snooze` | Body optional `{ days }` (default 7, max 90) or `{ revisitAt }` to restore absolute time (Undo) |
| DELETE | `/api/decisions/{id}` | Withdraw an open decision (Undo after save); watch-kind also Unfollows |
| POST | `/api/items/batch` | Body `ids` + optional `read` / `saved` / `dismissed` |
| GET | `/api/items/interest-keywords` | Keywords from Interested titles |
| GET | `/api/news` | Legacy news list alias (prefer `/api/items`) |
| POST | `/api/feedback` | Light feedback on a change or action (`useful` / `irrelevant` / `watch` / `ignore` / `tried`) |
| DELETE | `/api/feedback` | Undo feedback: body `{ targetType, targetId, kind, previousActionStatus? }` — forgets memory; reverses topic-weight nudge for changes; restores action status when `previousActionStatus` set |
| POST | `/api/delivery/feishu/bind/start` | Start Feishu scan-to-bind session (Settings) |
| GET | `/api/delivery/feishu/bind/{sessionId}` | Poll bind session status |
| DELETE | `/api/delivery/feishu/bind` | Clear Feishu bind |
| GET | `/api/briefs` | Brief dates |
| GET | `/api/briefs/{date}` | Brief for a date |

---

## Settings, chat, experiments

| Method | Path | Notes |
| --- | --- | --- |
| GET/PUT | `/api/settings` | App settings (customer PUT: language, push, smtpTo, `retentionDays` ≥ 0; secrets stay env-only) |
| GET/POST | `/api/preferences/keywords` | Manual preference keywords (`?kind=`); POST body `{ kind, text }` |
| DELETE | `/api/preferences/keywords/{id}` | Delete a preference keyword |
| POST | `/api/chat` | SSE Radar Chat |
| POST | `/api/chat/sync` | Sync chat helper |
| GET | `/api/experiments` | Experiments list (MCP filters to `running`) |
| PUT | `/api/experiments/{id}` | Update experiment fields / status |

---

## Main endpoints (quick table)

| Method | Path |
| --- | --- |
| GET | `/api/health` (includes `version` + `translate.status`: up/down/disabled) |
| POST | `/api/jobs/fetch`, `/api/jobs/push` |
| CRUD | `/api/sources` |
| GET/PATCH | `/api/items` (`saved` / `unread` / `sourceType`; `cursor` / `hasMore` / `nextCursor`; PATCH `read` / `saved` / `dismissed`) |
| GET | `/api/items/unread-counts`, `/api/items/badge` |
| GET | `/api/items/interest-keywords` (keywords from Interested titles) |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| GET | `/api/ai/monitor` (LLM context usage & token/s) |
| POST | `/api/chat` (SSE Radar Chat), `/api/chat/sync` |
| POST | `/api/pipeline/run` (legacy alias of fetch pipeline) |
| GET | `/api/intelligence/home` (changed / why care / impact / do / watch) |
| GET/PUT | `/api/contexts` |
| POST | `/api/jobs/impact` |
| GET | `/api/events`, `/api/events/{id}` |
| POST | `/api/jobs/cluster` |
| POST | `/api/packs/import` body `{"packId":"…"}` + optional `"path"` (see English table above) |

---

## Related

- [CLI](cli.md) · [MCP](mcp.md) · [Development](development.md) · [Installation](installation.md)

---

## API 参考

交互文档：[Swagger UI](http://localhost:8080/swagger-ui.html)（`/swagger-ui.html`），OpenAPI：`/api-docs`。

**没有单独的 Java 客户端 SDK。** 脚本与 Agent 请直接调 REST，或使用 [CLI](cli.md) / [MCP](mcp.md)。

可选局域网保护：设置 `LOCAL_TOKEN`，写操作与 `/api/settings` 请求头带 `X-Local-Token`（首尾空白会 trim）。`GET /api/health` 与 `GET /api/health/llm` 不加 token 也可访问（探针 / `doctor` / 设置里测 LLM）；其他只读 GET 同样开放。Swagger 标签含 **Health** / **Connectors** / **Delivery**。

领域模型：[ai-radar-2.0-domain.md](ai-radar-2.0-domain.md)。

### 约定

| 主题 | 行为 |
| --- | --- |
| 基址 | `http://127.0.0.1:8080`（Vite 开发时 `/api` 代理到后端） |
| 鉴权 | 可选共享 token，单用户 |
| 任务互斥 | 重叠的 fetch/push/cluster 等返回 **409** |

### 主要接口

| Method | Path |
| --- | --- |
| GET | `/api/health`（含 `version` + `translate.status`：up/down/disabled） |
| GET | `/api/health/llm`（在线探测；含 `modelPresent` / `hint`；空 `models[]` 或空白配置模型跳过；配置名会 trim；接受 `{data:[]}` 或裸数组；CLI `health-llm` / MCP `probe_llm`） |
| GET | `/api/connectors`（连接器目录，按 id 忽略大小写排序；`id` == `typeCode`；需有 `FIXTURE`/`path`, `RSS`/`feedUrl`, `DAILY_HOT`/`route`, `WEB`/`url`, `TELEGRAM`/`channels`, `HACKER_NEWS`/`query`, `GOOGLE_NEWS`/`query`, `GDELT`/`query`, `REDDIT`/`subreddits`, `V2EX`/`nodes`, `GITHUB`/`query`, `TWITTER`/`users`, `OSS_INSIGHT`/`keywords`, `GITHUB_TRENDING`/`since`, `PRODUCT_HUNT`/`maxItems`, `EMAIL`/`maxMessages`, `ZHIHU`/`cliPath`, `WEIBO`/`cliPath`, `BILIBILI`/`cliPath`；字段类型 `text`/`path`/`secret`/`textarea`；CLI `connectors` / MCP `list_connectors`） |
| GET | `/api/delivery/channels`（投递渠道目录，按 id 忽略大小写排序；`id` == `channel()`；需有 `outbox`/`radar.delivery.outbox-enabled`, `webhook`/`WEBHOOK_URL`, `email`/`SMTP_HOST`, `email`/`SMTP_TO`, `feishu`/`FEISHU_WEBHOOK_URL`；CLI `delivery-channels` / MCP `list_delivery_channels`） |
| POST | `/api/jobs/fetch`, `/api/jobs/push` |
| CRUD | `/api/sources` |
| GET/PATCH | `/api/items`（`saved` / `unread` / `sourceType`；`cursor` / `hasMore` / `nextCursor`；`PATCH` 可设 `read` / `saved` / `dismissed`） |
| GET | `/api/items/unread-counts`、`/api/items/badge` |
| GET | `/api/items/interest-keywords`（从感兴趣标题提取的关键词） |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| GET | `/api/ai/monitor`（LLM 上下文用量与 token/s） |
| POST | `/api/chat`（SSE 对话）、`/api/chat/sync` |
| POST | `/api/pipeline/run`（fetch 流水线遗留别名） |
| GET | `/api/intelligence/home`（变了什么 / 为何关心 / 影响 / 做什么 / 观察） |
| GET/PUT | `/api/contexts`；`POST /api/contexts/extract` · `/import/markdown` · `/import/github` |
| GET | `/api/changes` · `/api/changes/{id}`；`POST …/decisions` · `…/dismiss` · `…/recompute-impact` |
| PUT/DELETE | `/api/watch/{changeId}`；`GET /api/watching/timeline` |
| GET | `/api/decisions`（`?revisit=due`）；`POST /api/decisions/{id}/snooze`；`DELETE /api/decisions/{id}`（撤销 open）；`GET /api/decisions/badge` |
| POST/DELETE | `/api/feedback`（提交 / 撤销反馈） |
| GET/PATCH | `/api/actions` · `/api/actions/{id}`；`GET /api/opportunities` · `/api/memory` · `/api/outcomes/summary` |
| GET | `/api/items/{id}/detail`；`GET/POST/DELETE /api/preferences/keywords` |
| GET/PUT | `/api/experiments` · `/api/experiments/{id}` |
| POST/GET/DELETE | `/api/delivery/feishu/bind/*`（设置页扫码绑定） |
| POST | `/api/jobs/impact` · `/api/jobs/cleanup` · `/api/jobs/cleanup-duplicate-titles`；`GET /api/jobs/schedule` · `/api/jobs/fetch/progress` |
| GET | `/api/events`, `/api/events/{id}` |
| POST | `/api/jobs/cluster` |
| POST | `/api/packs/import` body `{"packId":"…"}`，可选 `"path"`（本地 JSON 数组，无需重打 jar） |

完整分组说明见上文英文节；以 Swagger 为字段级真源。
