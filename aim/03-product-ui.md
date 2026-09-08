# 步骤 3 — 产品化 Web UI（Morning Deck 形态，单用户）

## 目标

提供单用户 Web 界面，浏览器内完成：**加源 → 看情报 → 看日报 → 改兴趣/推送设置**。后端沿用步骤 1–2 的 API 与管道；体验对齐 Morning Deck 的 Sources / Briefs / Reports，但砍掉多租户与计费。

## 参考来源

| 项目 | 借鉴点 | 路径提示 |
| --- | --- | --- |
| Morning Deck | React+Vite+Tailwind、TanStack Query、Sources/Briefs/Reports 页面、REST 客户端 | `frontend/src/pages/`、`frontend/src/lib/api.ts` |
| News Agent | 本地 Web Console 与配置一体 | `src/server.py` 静态/控制台 |
| Horizon | 日报可读性（结构清晰的 briefing） | `docs/_posts/` 内容结构 |
| 本仓库方案 | 产品化 UI，第一阶段不做太重 | [`推荐开源项目.md`](../推荐开源项目.md) 第二节、第三十三节 V0.1 |

## 交付物

### 前端页面

| 路由 | 职责 |
| --- | --- |
| `/` | 今日概览：Top 条目 + 最近 Brief 入口 |
| `/sources` | 源列表：增删改、启用/停用、上次抓取时间 |
| `/sources/:id` | 源详情与原始条目抽样 |
| `/items` | Feed：按分数/时间排序、已读、筛选 |
| `/briefs` | 日报列表 |
| `/briefs/:date` | 单日 Brief 详情 |
| `/settings` | LLM、兴趣 Profile、推送渠道、调度 cron |

### REST API（建议前缀 `/api`）

- `GET/POST/PATCH/DELETE /api/sources`
- `GET /api/items`（query: since, minScore, unread, sourceId）
- `PATCH /api/items/{id}`（read / saved）
- `GET /api/briefs`、`GET /api/briefs/{date}`
- `GET/PUT /api/settings`
- `POST /api/jobs/fetch`、`POST /api/jobs/push`（复用步骤 2）

### 工程

- `frontend/`：React 18+、TypeScript、Vite、Tailwind
- 开发代理到后端（如 `localhost:8080`）
- 生产：前端 build 产物由 Spring 静态资源托管或同域 Nginx（个人场景优先 Spring 托管，减少组件）

## 任务清单

### 3.1 API 完善

- [x] 为步骤 1–2 能力补齐 CRUD 与分页 DTO
- [x] 统一错误响应：`{ code, message }`
- [x] OpenAPI / springdoc（可选但推荐）：`/swagger-ui.html`
- [x] 单用户模式：默认无登录；可选 `LOCAL_TOKEN` Header 防局域网误触

### 3.2 前端骨架

- [x] Vite + React + TS + Tailwind 初始化
- [x] 布局：侧栏导航（Sources / Items / Briefs / Settings）
- [x] `api.ts` 封装 fetch；环境变量 `VITE_API_BASE_URL`
- [x] TanStack Query：列表缓存与手动 refetch

### 3.3 Sources

- [x] 列表展示 type、名称、enabled、lastFetchedAt
- [x] 新增表单：按 type 显示不同字段（RSS URL、Reddit subreddit、GitHub 模式等）
- [x] 启用开关、删除确认、手动「立即抓取」按钮

### 3.4 Items Feed

- [x] 卡片/列表：标题、来源、分数、摘要、外链
- [x] 排序：score desc / publishedAt desc
- [x] 标记已读；批量「全部已读」（可选）
- [x] 空状态：引导去加源或触发 fetch

### 3.5 Briefs

- [x] 按日期列出已生成日报
- [x] 详情页渲染 Markdown（或后端返回结构化 blocks）
- [x] 「立即生成/推送」按钮调用 jobs API

### 3.6 Settings

- [x] 兴趣 Profile 文本框
- [x] LLM base URL / model（API Key 仅写 env 的说明 + 是否已配置的布尔状态，避免 Key 回显）
- [x] 飞书 webhook、SMTP、通用 webhook 表单
- [x] Fetch 间隔与 Push cron
- [x] 保存后 toast 成功/失败

### 3.7 打通与打磨

- [x] Docker 镜像包含前端静态资源，单端口访问
- [x] 移动端基本可用（列表不横溢）
- [x] README 截图位与 3 步上手说明（实现阶段产品 README）

## 验收标准

1. 浏览器内完成闭环：**加源 → 触发抓取 → Items 可见 → 生成 Brief → Settings 改兴趣后再抓分数变化可感知**
2. 无多用户注册/登录流程；本地打开即用（或仅可选 token）
3. 核心列表接口有加载中 / 空 / 错误三态
4. 生产模式单端口可访问 UI + API
5. 不出现 Credits、Admin、订阅付费相关页面

## 明确不做

- 多租户、JWT 完整账号体系、Admin 后台
- Credits / 用量计费 UI
- Writers / Channels / Podcast 等内容生产（Morning Deck 愿景）
- Meilisearch 独立搜索集群（可用 SQLite FTS5 后续加；本步可用简单 filter）
- Event 四栏情报主界面（步骤 4；本步 Brief 仍以 Item 列表日报为主）
- 像素级复刻 Morning Deck UI / 复制其组件代码
