# 步骤 4 — Event + Timeline + Intelligence（核心差异化）

## 目标

把产品从 **Item-oriented（一条条新闻）** 升级为 **Event-oriented（持续演化的事件）**：跨源跨日合并同一故事、生成时间线与影响说明，并在 UI 默认呈现四栏情报。

这是相对 Horizon「帮我筛选新闻」的壁垒：**帮我理解 AI 世界正在发生什么**。

## 参考来源

| 项目 | 借鉴点 | 路径提示 |
| --- | --- | --- |
| Horizon | 主题去重、enrichment blocks、背景信息 — 作为聚类前的 Item 质量基础 | `src/processing/`、`src/ai/` |
| Morning Deck | Briefing criteria、报告叙事 | `BriefingWorker`、prompts |
| News Agent | 关键词去重、diversity caps、insights 元数据 | `rank_entries_for_delivery`、`insights` |
| 本仓库方案 | Event Timeline 图、五痛点、四栏默认栏目 | [`推荐开源项目.md`](../推荐开源项目.md) 第三节、十四–十八节、三十九–四十节 |

## 交付物

### 领域模型

- **Event**：`id`、`title`、`status`（emerging / active / cooling）、`summary`、`impact`、`watchNext`、`firstSeenAt`、`lastUpdatedAt`、`score`
- **EventItemLink**：Event ↔ NewsItem（多对多），含 `role`（seed / update / discussion）
- **TimelineEntry**：`eventId`、`at`、`label`、`itemId?`、`note`

### 能力

1. **Clustering**：新 Item 进入后，匹配已有 Event 或创建新 Event（LLM + 规则：实体/标题相似度/时间窗）
2. **Timeline**：事件下按时间排列的节点
3. **Intelligence 字段**：为什么重要、影响谁、接下来关注什么
4. **四栏聚合 API / UI**
   - What Changed（较上次 brief 的新节点）
   - What Matters（高分 active events）
   - What's Emerging（新事件 / 分数爬升）
   - What You Should Watch（watchNext 汇总）

### UI

- `/events` 列表、`/events/:id` 详情（Timeline + 关联 Items）
- 首页默认四栏，替代纯 Item 瀑布流为「情报首页」

## 任务清单

### 4.1 数据与迁移

- [x] SQLite 表：`events`、`event_items`、`timeline_entries`
- [x] 索引：`lastUpdatedAt`、`status`、`score`
- [x] 从已有 `news_items` 可批量回填聚类（批处理 job）

### 4.2 聚类策略（务实可跑）

- [x] 规则预筛：同一规范化实体（公司/模型名词典）+ 72h 窗口 → 候选 Event
- [x] LLM 判定：`assign_or_create_event`（输入 item + 候选 events 摘要）→ `{ eventId | new, title, confidence }`
- [x] 低置信度：创建独立 Event，避免误合并
- [x] 合并审计日志：便于个人纠错（后续可加「手动拆分/合并」，本步可选）

### 4.3 Timeline 与情报文案

- [x] Item 挂到 Event 时追加 `TimelineEntry`
- [x] 定期或在 push 前刷新 Event：`summary` / `impact` / `watchNext`（单独 prompt，控制调用频率）
- [x] Event `score`：成员 Item 最高分与新颖度加权

### 4.4 API

- [x] `GET /api/events`、`GET /api/events/{id}`
- [x] `GET /api/intelligence/home` → 四栏结构
- [x] Brief 生成改为 **以 Event 为主、Item 为证据链接**（兼容步骤 2 推送模板升级）

### 4.5 UI

- [x] 首页四栏
- [x] Event 详情页：Timeline + 来源列表 + 影响 / 关注
- [x] Items 页保留，但展示「所属 Event」链接
- [x] 飞书/邮件模板升级为「事件卡片」而非纯标题列表

### 4.6 质量闸门

- [x] 准备 1 组黄金样例（如连续 3 天同一模型发布相关新闻）自动化或脚本断言合并为 1 Event
- [x] 监控：平均每 Event 的 Item 数、孤立 Event 比例

## 验收标准

1. 同一主题、不同来源/日期的多条新闻，在样例集上合并为 **1 个 Event**
2. Event 详情有 **可读 Timeline**（≥ 2 个节点时时间顺序正确）
3. 首页四栏均有数据或明确空状态文案
4. 日报 / 飞书推送以 Event 为主视角
5. 聚类失败不阻塞步骤 1 管道：Item 仍可 DONE，稍后重试挂载

## 明确不做

- 完整事实核查网络、来源信誉市场（可留 `reliability` 字段占位）
- 知识图谱数据库（Neo4j 等）
- 向量库强依赖（可用简单 embedding + SQLite；若引入需可选、默认关闭）
- 自动写博客 / 社交媒体发布
- 全球 Source Marketplace（步骤 5 仅接口预埋）
