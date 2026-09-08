# 步骤 5 — 扩展面预埋（Plugin / MCP / Marketplace 接口）

## 目标

在核心管道与 Event 情报稳定后，把系统做成**可扩展的个人情报底座**：第三方（或未来的自己）能按文档新增 Source / Delivery，Agent 能通过 MCP **只读查询** Event 与 Brief，而不改动机密路径。

本步交付的是 **SPI + 文档 + 最小 MCP**，不是完整 Source Marketplace 产品。

## 参考来源

| 项目 | 借鉴点 | 路径提示 |
| --- | --- | --- |
| Horizon | MCP staged tools、profile 插件化思想 | `src/mcp/`、`profiles/` |
| News Agent | MCP 控制面、Web/API/MCP 共用配置与 Job | `src/mcp_server.py` |
| Morning Deck | Provider 接口可替换 | `provider/*` |
| 本仓库方案 | Connector 插件化、第五阶段 Marketplace | [`推荐开源项目.md`](../推荐开源项目.md) 第二十七节、第四十一节 |

## 交付物

1. **`SourceConnector` SPI 稳定版**
   - 发现机制：Spring Bean / `ServiceLoader` / 外部 jar 目录（先 Bean + 文档化扩展步骤）
   - 版本化配置 schema：`connector.schema.json` 或 Java 校验注解
2. **`Delivery` SPI 稳定版**
   - 新渠道只需实现 `deliver` + 注册 settings 字段描述
3. **Source Pack / Interest Profile 目录约定**
   ```text
   packs/
   ├── sources/ai-core.json      # 预置源列表
   └── profiles/builder.md      # 兴趣与评分说明
   ```
4. **只读 MCP Server**（stdio 或 SSE，优先 stdio 本地）
   - `list_events`、`get_event`、`list_briefs`、`get_intelligence_home`
   - （可选只读）`list_sources`；**写操作默认关闭**或需显式 `allowWrites=true`
5. **扩展文档**
   - `docs/extending-connectors.md`
   - `docs/extending-delivery.md`
   - `docs/mcp.md`
6. **示例插件**
   - 一个示范 Connector（如 arXiv 或静态 JSON fixture connector）放在独立模块 `connectors-example`
   - 一个示范 Delivery（如「写入本地 `outbox/`」）

## 任务清单

### 5.1 SPI 固化

- [x] 整理 `SourceConnector`、`Delivery` 接口 JavaDoc 与错误契约
- [x] 定义 `ConnectorDescriptor`：id、显示名、config 字段列表（供 Settings UI 动态表单，可后接）
- [x] 核心模块不依赖具体 Reddit/GitHub 实现细节（实现类独立包）

### 5.2 Pack 约定

- [x] 设计 `sources/*.json` schema：type、name、config、defaultEnabled
- [x] 设计 `profiles/*.md`：兴趣说明，导入时写入 `interestProfile`
- [x] 启动或设置页支持「导入 Pack」（至少 CLI / API：`POST /api/packs/import`）

### 5.3 MCP

- [x] 引入 MCP Java SDK 或轻量桥接进程（若 Java SDK 不成熟：可用小 Python/Node sidecar 调 REST — 计划允许，但需文档写清）
- [x] 实现只读 tools；返回精简 JSON
- [x] 本地 token 与 loopback 绑定，避免误暴露到公网
- [x] 在 Cursor / Claude Desktop 配置示例片段写入 `docs/mcp.md`

### 5.4 示例与验收插件

- [x] `ExampleFixtureConnector`：读本地 JSON，便于无网测试
- [x] `OutboxDelivery`：把 Brief 写到 `data/outbox/`
- [x] CI 或脚本：仅加载 example 模块跑通「抓取 → 挂 Event（若有）→ outbox」

### 5.5 Marketplace 预埋（文档级）

- [x] 写下一代接口草案：`PackManifest`（name、version、connectors、profiles、license）
- [x] 明确：**本步不实现**在线市场、签名校验、付费

## 验收标准

1. 按 `docs/extending-connectors.md`，贡献者可不改 `pipeline` 核心代码新增一个 Connector 并被编排器调用
2. 按文档新增一个 Delivery，Settings / PushJob 能发现并调用
3. MCP 客户端能查出至少一个 Event 或 Brief（有数据的环境下）
4. 导入一个 Source Pack 后 Sources 列表出现预置项
5. 关闭写权限时，MCP 无法触发 fetch/push

## 明确不做

- 完整 Community Marketplace / 插件商店前端
- 插件签名、沙箱、热加载生产级体系
- 开放任意 Prompt 远程执行
- 多租户插件隔离
- 替代步骤 1–4 的核心质量工作（扩展是锦上添花，不能倒逼重写管道）

## 五步收束检查（本步完成后回头勾选）

对照 [README.md](./README.md)「全局验收」：

- [x] 10 分钟上手 + 飞书/邮件
- [x] 四源管道
- [x] Event + Timeline
- [x] Web UI 闭环
- [x] Connector/Delivery 可扩展 + MCP 只读
- [x] 无重基础设施硬依赖
