[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml)
![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3-green)

# AI Radar

**个人 AI 决策系统** — 知道变了什么、为何重要、下一步做什么。

持续理解你的工作与技术栈，发现外部重要变化，判断影响，并给出可执行行动（可选实验与 ROI）。底盘仍是 1.0：多源抓取 → 打分/摘要 → 事件聚类 → 每日简报 → 飞书 / 邮件 / Webhook / Outbox。

**技术栈：** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI 兼容 LLM（可选）

### 为什么选择 ai-radar？

- ✓ AI 理解你的 **Context**（画像、项目、技术栈）
- ✓ 发现高影响 **Change**（以 Event 为证据）
- ✓ 解释 **为何与你有关**（Impact × Context）
- ✓ 把洞察变成 **Action** 与可度量 **Experiment**
- ✓ 标记**感兴趣**条目；标题关键词用于后续相关度评分（不改写设置里的兴趣描述）
- ✓ 1.0 底盘：连接器、简报、投递、Pack、只读 MCP

[安装](#三步快速开始) · [GitHub](https://github.com/sunliangcode/ai-radar)

## 三步快速开始

### 1. 配置

```bash
cd backend
cp .env.example .env
# 可选: OPENAI_API_KEY, FEISHU_WEBHOOK_URL, WEBHOOK_URL, SMTP_*
```

未配置 `OPENAI_API_KEY` 时，流水线使用**启发式**打分（仍可生成可用简报）。

### 2. 运行（任选其一）

**开发模式（API + UI 分开）**

```bash
# terminal 1
cd backend && ./mvnw spring-boot:run

# terminal 2
cd frontend && npm install && npm run dev
# UI: http://localhost:5173  (proxies /api → :8080)
```

**单进程（UI 打进 Spring）**

```bash
cd frontend && npm install && npm run build:embed
# 输出到 backend/src/main/resources/static/
cd ../backend && ./mvnw spring-boot:run
# http://localhost:8080
```

**Docker**

```bash
cp backend/.env.example backend/.env   # 按需编辑
docker compose up -d --build
curl -s http://localhost:8080/api/health
```

**install.sh**

```bash
./install.sh
```

### 3. 触发

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .   # 需要已配置投递渠道
curl -s http://localhost:8080/api/items | jq .
```

打开 UI：Sources → Fetch → Items → Briefs → Settings。

## 投递

| 渠道 | Env / Settings |
| --- | --- |
| 飞书 | `FEISHU_WEBHOOK_URL` 或 Settings |
| Webhook | `WEBHOOK_URL`（可选 headers JSON） |
| 邮件 | `SMTP_HOST`, `SMTP_TO`, `SMTP_PASSWORD`, … |

推送按 `radar.push-cron` 每日执行（默认 `08:00` `Asia/Shanghai`）。抓取间隔 `radar.fetch-interval-ms`（默认 2h）。重叠任务互斥（`409`）。

未配置渠道时抓取仍可用；推送会记录 `no_channels` 并跳过。

## 主要 API

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

Swagger UI：`/swagger-ui.html`

可选局域网保护：设置 `LOCAL_TOKEN`，请求头带 `X-Local-Token`。

## 默认源

空库种子：OpenAI / Hugging Face / Simon Willison RSS、量子位与新智元微信 RSS、36氪、HN、Reddit、GitHub Search、Google News、GDELT、OSS Insight、GitHub Trending、V2EX。Product Hunt / Twitter / Telegram 示例默认关闭（需 token）。

导入更多 Pack：

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

### 连接器类型

RSS · Hacker News · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt（`PH_TOKEN`）· Twitter/X via Apify（`APIFY_TOKEN`）· WEB（AI 抽取）· EMAIL（IMAP）· Fixture

可选：`WEB_FETCH_ENABLED=true` 在评分前补全短摘要正文。

## 目录结构

```text
backend/     Spring Boot API + jobs + delivery + static SPA
frontend/    React + Vite + Tailwind
mcp/         只读 MCP sidecar
packs/       源 Pack 清单
docs/        扩展文档
aim/         执行计划
Dockerfile / docker-compose.yml / install.sh
```

## 测试

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

## 事件、2.0 与扩展

- 情报首页：`GET /api/intelligence/home`（五问：变了什么 / 为何关心 / 影响 / 做什么 / 观察）
- 感兴趣：原始条目 →「感兴趣」/「只看感兴趣」；收藏标题关键词参与评分 `effectiveInterest = interestProfile + keywords(saved titles)`（仅影响后续入库打分；取消后下次评分不再使用）
- Context：`GET/PUT /api/contexts`，自然语言提取与 GitHub 导入
- Impact 任务：`POST /api/jobs/impact`
- 事件：`GET /api/events`、`GET /api/events/{id}`；任务 `POST /api/jobs/cluster`
- Pack：`POST /api/packs/import`，body `{"packId":"ai-core|ai-cn|ai-signals"}`（`packs/sources/*.json`）
- 领域模型：[ai-radar-2.0-domain](docs/ai-radar-2.0-domain.md) · 计划：[aim/06](aim/06-ai-radar-2.0.md)
- 文档：[extending-connectors](docs/extending-connectors.md)、[extending-delivery](docs/extending-delivery.md)、[mcp](docs/mcp.md)
- MCP sidecar：`mcp/server.mjs`（默认只读）
- Smoke：`scripts/smoke-extensibility.sh`

## 文档

- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [变更日志](CHANGELOG.md)
- [路线图 / 计划](aim/README.md)
- [2.0 领域模型](docs/ai-radar-2.0-domain.md)

## License

MIT — see [LICENSE](LICENSE).

## Star History

GitHub 于 2026 限制了公开 stargazer API，多数仓库上的 `api.star-history.com` 徽章已不可用。本图由 [`.github/workflows/star-history.yml`](.github/workflows/star-history.yml) 生成并提交进仓库。

<!-- star-history:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/star-history/star-history-dark.svg">
  <img alt="Star history" src="assets/star-history/star-history-light.svg">
</picture>
<!-- star-history:end -->
