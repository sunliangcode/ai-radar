# AI Radar 前端页面功能梳理

> 快照日期：2026-09-16。基于 `frontend/src` 路由与页面实现，供历史对照；现行规格以 `docs/`、`CHANGELOG.md` 为准。

## 1. 整体结构

前端为 React 19 + Vite SPA，挂在左侧 Sidebar + 右侧主内容壳层上。路由按页懒加载；全局提供 Toast、主题/密度偏好、错误边界、404。侧栏主导航七项，并按已启用源类型展示未读快捷入口；⌘K / Ctrl+K 打开命令面板。UI 文案走 react-i18next（中/英界面切换），摘要语言是设置里的 `summaryLanguage`，与整站 locale 分开。

**信息流主线**：配置 Context / 情报源 → 抓取评分聚类 → Today / Feed 阅读 → Watching 跟踪 → Actions 落地 → Briefs 日报与推送。AI 监控与设置负责「看得见、调得动」。

## 2. 主导航页面

### 2.1 AI 监控 `/monitor`

实时观察 LLM 调用：队列卡片、Live Console（流式输入输出气泡）、进行中进度条、统计卡。支持按 operation 过滤、暂停滚动；SSE 连通时提示 streaming。偏运维可见性，不改业务数据。

### 2.2 Today `/`

首页决策视图。拉取 `intelligenceHome`，展示今日高相关 Impact 卡片：优先 HIGH 作 Hero，其余杂志网格；点开 ImmersiveDrawer 看 why / evidence / 建议。「立即更新」触发抓取进度条，成功后自动重算 Impact。空态引导：无源则 Pack 导入；有源则一键更新 / 重算 / 去填 Context。

### 2.3 Feed `/feed`

全量信号流。工具栏：搜索、时间范围（24h/7d/30d/全部）、来源类型、仅未读；侧栏 `?sourceType=` 可直达。杂志卡片 + 沉浸抽屉；知乎 Enter 进详情，其它开原文。操作：收藏、已读、全部已读（确认）、不感兴趣、立即更新（可按源类型）。键盘：j/k 移动，Enter / o / s / m / `/` / Esc。分页；搜索时筛选暂时禁用。未读角标挂在侧栏 Feed。

### 2.4 关注 `/watching`

三块：关注时间线（可展开）、跟踪中的 Change（HIGH/MEDIUM 或 WATCHING）、收藏条目（取消收藏可撤销）。入口链到 Actions。标记已读会同步 Feed 等缓存。

### 2.5 Actions `/actions`

Impact 产出的行动建议列表。按状态过滤：待处理 / 关注中 / 已尝试 / 有用 / 已忽略 / 全部。行内改状态、勾选步骤、看成功标准与关联 Change/条目；FeedbackBar 记录有用/不相关等。

### 2.6 日报 `/briefs` · `/briefs/:date`

列表：今日角标、最新一期突出、往期归档；可立即更新、发送今日日报。详情：Markdown 正文 + 当日相关条目（分数、外链）。推送结果 Toast 汇总通道成败。

### 2.7 设置中枢 `/settings`

入口页：AI 就绪横幅（on / degraded / off）、系统健康卡（后端、DB、翻译侧车、LLM、下次抓取/推送）、三入口卡（偏好与通知、Context、情报源）、评分机制说明。LLM 运维在 `.env`，不在 UI 里改模型。

## 3. 设置子页与详情页

### 3.1 偏好与通知 `/settings/preferences`

兴趣描述、摘要语言 zh/en、偏好关键词编辑；通知：推送时刻预设/自定义 cron、时区、无内容是否跳过、SMTP 收件人、飞书绑定（含二维码流程）、立即推送。脏数据有保存条与离开确认。`/settings/llm` 重定向到本页。

### 3.2 Context `/settings/context`

结构化「我是谁」：角色、简介、技术栈、兴趣、目标、项目。支持自由文本 AI 提取、GitHub 仓库导入，确认后保存；脏状态可放弃。

### 3.3 情报源 `/settings/sources` · `/settings/sources/:id`

列表：启用/停用、删除确认、Pack 导入、立即更新与进度。创建：默认 RSS，可展开更多连接器类型（按后端 descriptor 动态表单）。详情：配置键值、近期抽样条目与分数条。

### 3.4 Change 详情 `/changes/:id`

标题、类型、分数、tier/status、摘要、为何相关、证据、Impact 分项、watch next、时间线、证据来源；FeedbackBar。返回优先 history，否则回 Watching。

## 4. 跨页能力

| 能力 | 说明 |
| --- | --- |
| 命令面板 | 跳转各页；任务：推送日报、重算 Impact、二次确认全部已读；输入可搜条目并开原文 |
| 抓取进度 | 阶段文案（收集→去重→评分→摘要→聚类→日报等）、失败源重试、完成后摘要 |
| 杂志 UI | MagGrid / MagCard / Hero / ImmersiveDrawer，Today 与 Feed 共用 |
| Pack 导入 | 空态与 Sources 可导入推荐源包 |
| 健康可见 | 设置页与监控页暴露 LLM/翻译/调度状态 |
| 兼容路由 | `/changes` `/items` `/events` `/sources` `/contexts` 等旧路径重定向 |

## 5. 页面关系（简图）

```
设置(Context/源/偏好) ──抓取──► Feed（原始信号）
         │                      │
         └─ Impact ─► Today ◄───┘
                        │
              Watching / Actions / Briefs(+推送)
                        │
                   AI 监控（旁路观察）
```

## 6. 小结

前端服务单用户自托管决策闭环：Today 看「今天该不该动」，Feed 扫全量，Watching/Actions 跟踪与执行，Briefs 沉淀与外发，设置定义「你是谁、从哪看、推到哪」，监控保证 AI 链路可诊断。交互偏键盘友好与渐进空态引导；运维型 LLM 参数留在环境变量，产品面只暴露偏好、通知与健康状态。
