# AI Radar 前端页面功能梳理

> 快照日期：2026-09-16。基于 `frontend/src` 路由与页面实现，供历史对照；现行规格以 `docs/`、`CHANGELOG.md` 为准。

## 1. 整体结构

前端为 React 19 + Vite SPA，挂在左侧 Sidebar + 右侧主内容壳层上。路由在 `App.tsx` 内声明并按页懒加载；全局提供 Toast、主题/密度偏好、错误边界、404。⌘K / Ctrl+K 打开命令面板。UI 文案走 react-i18next（中/英界面切换），摘要语言是设置里的 `summaryLanguage`，与整站 locale 分开。

**侧栏主导航八项**（顺序固定）：Today → Changes → Watching → Decisions → Explore → Chat → Who I am（Context）→ Settings。Briefs 与 AI 监控不在侧栏：前者经命令面板 / Today 相关入口进入，后者在设置中枢「System」。侧栏另按已启用源类型展示未读快捷入口（直达 Explore `?sourceType=`）。

**信息流主线**：配置 Context / 情报源 → 抓取评分聚类 → Today / Changes 决策浏览 → Watching / Decisions 跟踪执行 → Explore 扫全量信号 → Chat 问答 → Briefs 日报与推送。System 监控负责「看得见」AI 链路。

## 2. 主导航页面

### 2.1 Today `/`

首页决策视图。拉取 `intelligenceHome`，展示今日高相关 Impact：`RadarDeck` 呈现 major changes（关注 / 忽略 / 决策 / 深入），可折叠 minor signals；主动告警与「待回顾决策」横幅。点决策打开 ImmersiveDrawer + `DecisionForm`。「立即更新」走抓取进度，成功后可重算 Impact。空态：无源则 Pack 导入；有源则一键更新 / 去填 Context。支持 display-source 过滤。

### 2.2 变化 `/changes`

聚类 Change 列表（约 50 条）：标题、摘要摘要、tier 徽章、更新时间；点进 `/changes/:id`。应用 display-source 过滤；空态提示暂无变化。

### 2.3 关注 `/watching`

三块：关注时间线（可展开）、跟踪中的 Change（HIGH/MEDIUM 或 WATCHING，杂志网格 + 抽屉）、收藏条目（取消收藏可撤销）。入口可链到 Decisions。标记已读会同步 Feed 等缓存。

### 2.4 决策 `/decisions`

取代旧 Actions 页。两段列表：到期需回顾（due）与开放中的决策（open）；展示 kind、理由、revisit、关联 Change 标题，链到 Change 详情。按 display-source 过滤。旧路径 `/actions` 重定向至此。仓库内仍有未挂载的 `ActionsPage.tsx`（旧 action 卡片 UI），路由未引用。

### 2.5 探索 `/explore`

原 Feed 全量信号流（`FeedPage`）。工具栏：搜索、时间范围、来源类型、仅未读、瀑布/专注视图；侧栏 `?sourceType=` 可直达。杂志卡片 + 沉浸抽屉；知乎 Enter 进详情，其它开原文。操作：收藏、已读、全部已读（确认）、不感兴趣、立即更新。键盘：j/k（专注模式 n/p）、Enter / o / s / m / `/` / Esc。分页；未读角标挂在侧栏 Explore。`/feed` 重定向到本页。

### 2.6 对话 `/chat`

基于雷达情报的 LLM 对话：流式回复、本地 session（`localStorage`）、清空会话。支持建议提问；`?changeId=` 作为种子带入当前 Change；回复可引用 Change 并展示引用列表。Change 详情有「Ask in Chat」入口。

### 2.7 我是谁 `/settings/context`

结构化 Context：角色、简介、技术栈、兴趣、目标、项目。支持自由文本 AI 提取、GitHub 仓库导入，确认后保存；脏状态有保存条与离开确认。同时出现在侧栏与设置中枢。

### 2.8 设置中枢 `/settings`

入口页：系统健康卡（后端、DB、翻译侧车、LLM、下次抓取/推送）+ 四入口卡——Context、情报源、偏好与通知、System（AI 监控）。LLM 运维在 `.env`，不在 UI 里改模型。

## 3. 次级页与详情页

### 3.1 偏好与通知 `/settings/preferences`

摘要语言 zh/en；通知：推送时刻预设/自定义 cron、时区、无内容是否跳过、SMTP 收件人、飞书绑定（含二维码流程）、立即推送。脏数据有保存条。`/settings/llm` 重定向到本页。

### 3.2 情报源 `/settings/sources` · `/settings/sources/:id`

列表：启用/停用、删除确认、Pack 导入、立即更新与进度、UI 显示源选择（display picker）。创建：默认 RSS，可展开更多连接器（按后端 descriptor 动态表单）。详情：配置键值、近期抽样条目与分数条。

### 3.3 系统监控 `/settings/system`

原顶层 AI 监控。实时观察 LLM：队列卡片、Live Console（流式气泡）、进行中进度、统计卡；按 operation 过滤、暂停滚动；SSE 连通时提示 streaming。偏运维可见性，不改业务数据。`/monitor` 重定向至此。

### 3.4 日报 `/briefs` · `/briefs/:date`

不在侧栏。列表：今日角标、最新一期突出、往期归档；可立即更新、发送今日日报。详情：解析 Markdown 正文 + 当日相关条目。推送结果 Toast 汇总通道成败。命令面板与部分 Today 链路可到达。

### 3.5 Change 详情 `/changes/:id`

标题、类型、分数、tier/status、摘要、为何相关、证据、Impact 分项、watch next、时间线、证据来源条目；FeedbackBar；「Ask in Chat」。知乎成员条目可开 ImmersiveDrawer。返回优先 history，否则回 Watching。被 display-source 隐藏时提示并返回。

## 4. 跨页能力

| 能力 | 说明 |
| --- | --- |
| 命令面板 | 跳转：system / today / explore / changes / decisions / watching / briefs / settings；任务：推送日报、重算 Impact、二次确认全部已读；输入可搜条目并开原文 |
| 抓取进度 | 阶段文案（收集→去重→评分→摘要→聚类→日报等）、失败源重试、完成后摘要 |
| 杂志 UI | MagGrid / MagCard / ImmersiveDrawer；Explore、Watching、部分详情共用 |
| Pack 导入 | Today / Sources 空态可导入推荐源包（ai-core / ai-cn / ai-signals） |
| Display 过滤 | 设置中隐藏的源在 Today / Changes / Decisions / Watching / Briefs 等处统一过滤 |
| 健康可见 | 设置中枢健康卡；System 页暴露 LLM 流与队列 |
| 兼容路由 | 见下表 |

### 兼容重定向

| 旧路径 | 目标 |
| --- | --- |
| `/monitor` | `/settings/system` |
| `/feed` | `/explore` |
| `/actions` | `/decisions` |
| `/settings/llm` | `/settings/preferences` |
| `/items` | `/explore` |
| `/events` | `/explore` |
| `/events/:id` | `/changes/:id` |
| `/contexts` | `/settings/context` |
| `/sources` | `/settings/sources` |
| `/sources/:id` | `/settings/sources/:id` |

## 5. 页面关系（简图）

```
设置(Context/源/偏好/System) ──抓取──► Explore（原始信号）
              │                            │
              └─ 聚类 Impact ─► Today / Changes
                                    │
                     Watching / Decisions / Chat
                                    │
                              Briefs（沉淀+推送）
```

## 6. 小结

前端服务单用户自托管决策闭环：Today 看「今天该不该动」，Changes 浏览聚类变化，Watching / Decisions 跟踪与回顾，Explore 扫全量信号，Chat 用情报问答，Briefs 沉淀与外发；设置定义「你是谁、从哪看、推到哪」，System 保证 AI 链路可诊断。交互偏键盘友好与渐进空态引导；运维型 LLM 参数留在环境变量，产品面只暴露偏好、通知与健康状态。
