# 步骤 1 — 信息管道（Horizon 式 Pipeline）

## 目标

搭好个人可用的**采集大脑**：多源抓取 → 归一化 → URL 去重 → AI 评分筛选 → 摘要，产出当日 Top N AI 情报（JSON / Markdown）。

本步只解决「有高质量 Item」，还不做 Event 聚类、完整 Web UI、飞书推送（分别在步骤 4、3、2）。

## 参考来源

| 项目 | 借鉴点 | 路径提示 |
| --- | --- | --- |
| Horizon | Orchestrator 流水线、ContentItem、scraper 插件、两阶段 LLM（先筛后富化） | `src/orchestrator.py`、`src/scrapers/`、`src/ai/`、`profiles/` |
| Morning Deck | `SourceFetcher` 接口、Fetch/Processing Worker、结构化 AI 输出 | `provider/sourcefetch/`、`core/queue/`、`provider/ai/` |
| News Agent | 统一 entry 字段、`score_batch` 再 digest、源分类 | `src/sections/signals/`、`prompts/score_batch.md` |
| 本仓库方案 | V0.1 范围、Event 升级的前置 | [`推荐开源项目.md`](../推荐开源项目.md) 第八节、第三十三节 |

**许可**：只复用模式与接口形状，不复制 AGPL（Morning Deck）或其它项目源码。

## 交付物

实现阶段应产出：

1. **领域模型**
   - `RawItem`：connector 原始输出（title, url, publishedAt, sourceType, sourceId, contentSnippet, rawMeta）
   - `NewsItem`：管道处理后的条目（id, canonicalUrl, score, summary, tags, status, …）
   - `Source`：用户配置的源（type, config JSON, enabled, lastFetchedAt）
2. **`SourceConnector` SPI**
   - `SourceType type()`
   - `List<RawItem> fetch(FetchContext ctx)`
3. **首批 Connector**：`RssConnector`、`GithubConnector`、`HackerNewsConnector`、`RedditConnector`
4. **Pipeline 阶段**（可单机内存队列或同步编排）
   - Fetch → Normalize → UrlDedup → AiScore → Filter → Summary
5. **AiService**（OpenAI-compatible）：`score` / `enrichWithScore` / `summarize`，JSON Schema 结构化输出
6. **持久化**：SQLite 表 `sources`、`news_items`；当日 briefing 可先落 `data/briefs/YYYY-MM-DD.md`
7. **CLI 或管理 API 入口**：`POST /api/pipeline/run` 或 `./mvnw -pl backend exec:java -Drun=pipeline`（二选一，优先 REST 便于后续 UI）

建议包结构：

```text
backend/.../connector/
backend/.../pipeline/
backend/.../provider/ai/
backend/.../domain/
```

## 任务清单

### 1.1 工程骨架

- [x] 创建 `backend/`：Java 21、Spring Boot 3、Maven Wrapper
- [x] 引入依赖：Spring Web、Spring Data JPA、SQLite JDBC、Flyway（或启动时 schema）、HTTP client、JSON Schema / 校验
- [x] 配置 `application.yml`：`spring.datasource` → SQLite 文件路径（如 `./data/radar.db`）
- [x] 提供 `.env.example`：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`

### 1.2 统一模型与 SPI

- [x] 定义 `RawItem`、`NewsItem`、`Source`、`SourceType`、`FetchContext`（含 since / lookbackHours）
- [x] 定义 `SourceConnector` 接口；用 Spring 注入收集所有实现
- [x] URL 规范化：去 UTM / fragment / trailing slash，生成 `canonicalUrl` 作为去重键

### 1.3 首批 Connector

- [x] **RSS**：Rome 或等价库；支持多 feed URL；正文过短时可选后续全文抓取（本步可只留 hook）
- [x] **Hacker News**：官方 / Algolia API；限制 lookback；保留 score/comments 元数据
- [x] **Reddit**：公开 JSON 或受限 API；子版块可配置（默认 `r/MachineLearning`、`r/LocalLLaMA` 等）
- [x] **GitHub**：Trending 或 Releases / Search（先选一种做稳）；记录 repo、stars、描述
- [x] 每个 connector 单测或集成冒烟：mock HTTP 或录制 fixture

### 1.4 管道编排

- [x] `PipelineOrchestrator.run(PipelineRequest)`：串起各阶段，记录耗时与计数日志
- [x] **Normalize**：字段清洗、时区统一（UTC）、截断超长正文
- [x] **UrlDedup**：按 `canonicalUrl` 与库内近 N 天条目合并；保留多源引用列表（为步骤 4 Event 预留）
- [x] **AiScore**：批量或单条；输出 `score`（0–100）、`reason`、`tags`、`category`（ai / oss / product / other）
- [x] **Filter**：阈值可配置（默认 score ≥ 60）；`maxItems` 上限（默认 30）
- [x] **Summary**：仅对通过筛选的条目生成中文摘要（个人场景默认中文；可配置语言）
- [x] 状态机：`NEW → SCORING → DONE | ERROR`（命名可对齐 Morning Deck 精神，不必相同）

### 1.5 AI 与兴趣

- [x] Prompt 模板外置：`backend/src/main/resources/prompts/score.md`、`summarize.md`
- [x] 兴趣字符串配置：`interestProfile`（自由文本，如「开源模型、Agent、推理基建」）传入评分 prompt
- [x] Token / 费用日志：每次调用记录模型、耗时、估算 token（便于个人控成本）

### 1.6 产出物

- [x] 将 Top N 写入 SQLite `news_items`
- [x] 额外导出当日 Markdown：`data/briefs/YYYY-MM-DD.md`（标题、分数、摘要、原文链接）
- [x] 提供一次手动触发入口并写清 README 用法（实现阶段产品 README）

## 验收标准

全部满足即本步完成：

1. **配置 LLM Key 后**，本地执行一次管道，无外部 Postgres/Redis 依赖
2. 至少 **3/4** 类源（RSS、HN、Reddit、GitHub）成功写入条目；失败源不影响其它源
3. 同一 URL 重复抓取不产生重复 `NewsItem`
4. 输出中含 score + 中文 summary，且按分数降序可得 Top N
5. 生成可读的 `data/briefs/YYYY-MM-DD.md` 或等价 JSON
6. 有结构化日志：fetched / deduped / scored / kept 数量

## 明确不做

- Event 聚类 / Timeline / 四栏情报（步骤 4）
- 飞书 / 邮件推送与一键 Docker 体验打磨（步骤 2）
- React 完整产品 UI（步骤 3；本步最多临时 Swagger / 简单 JSON）
- MCP、Plugin Marketplace（步骤 5）
- Telegram / X / arXiv / YouTube 等扩展源（后续用 SPI 加）
- 重度 Enrichment（背景搜索、社区讨论全文）— 可留接口，本步不做
- 多租户、认证体系
