# API reference

English | [中文](#api-参考)

Interactive docs: [Swagger UI](http://localhost:8080/swagger-ui.html) (`/swagger-ui.html`).

Optional LAN guard: set `LOCAL_TOKEN` and send header `X-Local-Token`.

## Main endpoints

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| POST | `/api/jobs/fetch`, `/api/jobs/push` |
| CRUD | `/api/sources` |
| GET/PATCH | `/api/items` (`saved` / `unread` / `sourceType` filters; PATCH `read` / `saved`) |
| GET | `/api/items/interest-keywords` (keywords from Interested titles) |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| POST | `/api/pipeline/run` (legacy alias of fetch pipeline) |
| GET | `/api/intelligence/home` (changed / why care / impact / do / watch) |
| GET/PUT | `/api/contexts` |
| POST | `/api/jobs/impact` |
| GET | `/api/events`, `/api/events/{id}` |
| POST | `/api/jobs/cluster` |
| POST | `/api/packs/import` body `{"packId":"ai-core\|ai-cn\|ai-signals"}` |

Domain model and object mapping: [ai-radar-2.0-domain.md](ai-radar-2.0-domain.md).

---

## API 参考

交互文档：[Swagger UI](http://localhost:8080/swagger-ui.html)（`/swagger-ui.html`）。

可选局域网保护：设置 `LOCAL_TOKEN`，请求头带 `X-Local-Token`。

### 主要接口

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| POST | `/api/jobs/fetch`, `/api/jobs/push` |
| CRUD | `/api/sources` |
| GET/PATCH | `/api/items`（`saved` / `unread` / `sourceType` 过滤；`PATCH` 可设 `read` / `saved`） |
| GET | `/api/items/interest-keywords`（从感兴趣标题提取的关键词） |
| GET | `/api/briefs`, `/api/briefs/{date}` |
| GET/PUT | `/api/settings` |
| POST | `/api/pipeline/run`（fetch 流水线遗留别名） |
| GET | `/api/intelligence/home`（变了什么 / 为何关心 / 影响 / 做什么 / 观察） |
| GET/PUT | `/api/contexts` |
| POST | `/api/jobs/impact` |
| GET | `/api/events`, `/api/events/{id}` |
| POST | `/api/jobs/cluster` |
| POST | `/api/packs/import` body `{"packId":"ai-core\|ai-cn\|ai-signals"}` |

领域模型：[ai-radar-2.0-domain.md](ai-radar-2.0-domain.md)。
