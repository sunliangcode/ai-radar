# AI Radar — 历史迭代

> 本目录**仅作历史迭代展示**，不是当前产品规格或可执行 roadmap。  
> 现行文档：[`docs/`](../docs/) · [`CHANGELOG.md`](../CHANGELOG.md) · [`AGENTS.md`](../AGENTS.md)  
> 2.0 领域模型：[`docs/ai-radar-2.0-domain.md`](../docs/ai-radar-2.0-domain.md)

## 演进一句话

**1.0** 多源情报管道（抓取 → 评分 → Event → 推送 / MCP）  
→ **2.0** 个人决策系统（Context × Change → Impact → Action）  
→ **07–11** 易用性、系统可见性与日常摩擦打磨。

## 时间线

| 步骤 | 主题 | 落地要点 | 状态 |
| --- | --- | --- | --- |
| 01 | 信息管道 | 多源 Connector、归一化 / 去重、AI 评分与摘要 | 已完成 |
| 02 | 运行与分发 | 一键安装、定时抓取、飞书 / 邮件 / Webhook 推送 | 已完成 |
| 03 | 产品化 UI | React SPA：源 / Feed / Brief / 设置闭环 | 已完成 |
| 04 | 事件情报 | Event 聚类、Timeline、四栏情报视图 | 已完成 |
| 05 | 扩展预埋 | `SourceConnector` / `Delivery` SPI、只读 MCP、Pack 约定 | 已完成 |
| 06 | AI Radar 2.0 | Context / Impact / Action 等个人决策层（MVP） | 已完成 |
| 07 | 易用性打磨 | 可移植 Zhihu 种子、`status.sh`、安装健康等待 | 已完成 |
| 08 | 系统状态可见 | 设置页健康卡片、`check.sh`、首启 Context 引导 | 已完成 |
| 09 | 性能与空态 | 路由拆包、网络错误本地化、空态分流 | 已完成 |
| 10 | 易用性加固 | LLM 健康可见、Impact 触达、静默失败与安装加固 | 已完成 |
| 11 | 持续易用 | 调度热更新、立即推送、来源显示名与命令面板补齐 | 已完成 |

逐步计划原文与战略长文已删除；完整内容可在 git 历史中找回。

## 已锁定决策（当时）

| 项 | 选择 |
| --- | --- |
| 用户场景 | 个人自用 / 自托管 |
| 技术栈 | Java 21 + Spring Boot 3 + React/Vite + Tailwind |
| 存储 | SQLite（零外部依赖） |
| LLM | OpenAI-compatible（含 Ollama） |
| 产品定位 | Event-oriented 情报雷达 → 个人决策系统 |
| 许可注意 | 只借鉴架构模式，不复制 AGPL / 他库源码 |

## 刻意不做（全局）

- Kafka / Redis / Elasticsearch / Kubernetes
- 多用户权限、SaaS / 多租户、Credits 计费
- 完整 Fact-check 市场、全球 Source Marketplace
- 向量库 / 全量知识图谱 / 自动跑基准 Agent（2.0 MVP 非目标）
