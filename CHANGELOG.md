# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- **Frontend UX polish**: keyboard `focus-visible` rings on Button/Chip/nav/toolbar; MagCard roving tabindex (j/k stays primary); shared `QueryErrorState` with Retry on Today/Radar/Sources/Feed/Decisions/Actions/Settings; Toast dismiss + assertive errors; Sources create toast + optimistic enable toggle; `prefers-reduced-motion` covers skeleton/spinner; ListSkeleton announces loading to AT
- **Frontend UX (batch 2)**: Command Palette uses shared focus trap + body scroll lock + restore focus; 「全部已读」二次确认不再误关面板；危险 ConfirmDialog 默认焦点在取消；侧栏增加情报源入口且移动端可见主题/语言；Today 关注/忽略仅锁当前卡片；Settings/Context 统一骨架与 Retry
- **Frontend UX (batch 3)**: Brief/Change/Source 详情与 Briefs/Watching 错误态统一 Retry；移动端源类型横向 chips；Context/情报源配置/Radar 搜索改用共享 Input·Textarea 焦点样式
- **Frontend UX (batch 4)**: `PageHeader` 统一返回控件（Brief/Change/Source/Settings 子页）；Settings Hub 卡片与列表行 `focus-visible`；跳过导航链；进度条尊重 reduced-motion；Changes/Decisions/Radar 空态统一 `EmptyState`
- **Frontend UX (batch 5)**: Decisions 整行可聚焦跳转；Context/创建情报源用 `Field`；`textLinkClass` 统一 Today/健康条文字链焦点；due 决策错误可 Retry
- **Frontend UX (batch 6)**: Change 证据链/抽屉评论展开、Brief 证据链接、Notify 高级配置与 Watching 时间线展开按钮统一 `textLinkClass`；无时间线改用 EmptyState
- **Frontend UX (batch 7)**: 路由 Suspense 改用 ListSkeleton；PackPicker 用共享 Select；剩余文字链/Fetch 详情/Monitor raw/区域模式按钮补齐 focus-visible；侧栏在情报源页不再误标「设置」为当前
- **Frontend UX (batch 8)**: 侧栏次级入口改 Link + 路径高亮，避免「设置/情报源」双标当前；Source/Brief/Change 详情 not-found 与显示过滤空态统一 EmptyState；Fetch 进度条补 reduced-motion
- **Frontend UX (batch 9)**: 共享 `focusRingClass`；Chat 清空/引用链焦点、错误 `role=alert`、流式状态 `aria-live`、滚动尊重 reduced-motion；Actions 筛选/状态/步骤勾选、RadarDeck/Hero 标题、Monitor 控制台、Feed 快捷键切换补齐焦点环
- **Frontend UX (batch 10)**: ImmersiveDrawer 背景层 `tabIndex=-1` 避免进 Tab 序；情报源名/Today 探索与次要信号/Watching 时间线与卡片次操作/Brief 原文链补齐焦点环
- **Frontend UX (batch 11)**: Today 空态区分「仅有源」与「雷达已有未读」——后者引导浏览雷达或单独重算 Impact；Brief 标题/创建源更多类型/Feed「更多时间」补焦点环
- **Frontend UX (batch 12)**: Sources 创建表单改用共享 Input/Select、打开自动聚焦、Esc 关闭、`aria-expanded`；创建错误 `role=alert`；Settings 未保存条 `aria-live`；Fetch/Monitor 脉冲与进度条补 reduced-motion；monitor 光标减动效
- **Frontend UX (batch 13)**: Source 详情配置改用 sticky `FormSaveBar`（脏态/放弃/导航守卫）；配置字段 Textarea 统一；Radar 搜索 `role=search`+aria-label；Brief 卡片悬浮动效尊重 reduced-motion
- **Frontend UX (batch 14)**: 路由切换滚回顶部；404 用 EmptyState；Settings 健康条加载态「检查中」；Radar 模式栏 sticky + `aria-pressed`；Hub 卡片减动效
- **Frontend UX (batch 15)**: Radar 搜索无结果可「清除搜索」；筛选空态可「清除筛选」；FeedToolbar sticky；Toast/侧栏补 safe-area；Chip 减动效
- **Frontend UX (batch 16)**: Chat 流式可停止、清空二次确认、建议用 Chip；Decisions 空态引导去雷达；Today 关注卡片减动效
- **Frontend UX (batch 17)**: Chat/LLM 错误不再泄露 JVM 异常链、可关闭；停止生成清理空回复；Actions 空态引导回 Today；移动端侧栏纵向布局并收紧品牌区
- **Frontend UX (batch 18)**: Settings Hub「通知」深链到 `#notify` 并滚动定位；卡片 CTA 文案；Pack 导入中禁用选择
- **Frontend UX (batch 19)**: 恢复 `/actions` 路由（Settings Hub + ⌘K）；空态引导回 Today；返回设置
- **Frontend UX (batch 20)**: Sources 试抓取仅当前类型显示加载；Actions 筛选 `aria-pressed`、步骤触控与无障碍；MagCard 操作触控目标；Feedback 错误 `role=alert`；中文 Actions 标题
- **Frontend UX (batch 21)**: Feed 分页 `nav` + 翻页滚回列表（尊重 reduced-motion）；筛选组无障碍标签；Change「问 AI」焦点环；Radar/视图切换减动效
- **Frontend UX (batch 22)**: Sources 国内/国外模式 `aria-pressed`；飞书绑定链接焦点环；FormSaveBar 安全区；Context「更多」`aria-controls`；Brief 卡片焦点偏移
- **Frontend UX (batch 23)**: Today 甲板清空 CTA 焦点、减动效跳过离场、卡片 picker `aria-pressed`；Fetch 详情展开无障碍；Monitor 暂停/筛选 pressed + live log
- **Frontend UX (batch 24)**: Brief 额外条目行焦点；Toast 悬停/聚焦暂停自动关闭 + 安全区；Fetch 结果摘要 live region；Brief 卡片减动效
- **Frontend UX (batch 25)**: ConfirmDialog 描述关联 + pending 禁关/锁滚动/安全区；⌘K listbox `aria-activedescendant`；Radar 变化空态 CTA（Context/清除搜索/回 Today）；抽屉正文错误可重试 + 评论 `aria-expanded`；创建源取消与提交中禁用
- **Frontend UX (batch 26)**: ImmersiveDrawer 安全区 + 焦点环；Radar 搜索 `role=search`；Watching 空态 CTA（Today/雷达）；收藏空态改去雷达；语言切换 `aria-pressed` + 触控目标
- **Frontend UX (batch 27)**: Notify/时间线/Feed 快捷键补 `aria-controls`；凭证粘贴 live 反馈；Today 关注标题可聚焦；Briefs 空态回 Today
- **Frontend UX (batch 28)**: MagCard 可访问名 + focus-visible；健康条 `aria-controls`；源详情抽样空态 CTA；Feed 计数 live region；MagAction 减动效
- **Frontend UX (batch 29)**: Change 详情空态/问 AI/证据链焦点；时间线空态说明；Monitor 原始输出 `aria-expanded`；队列进度用 ProgressBar；ScorePill 可读
- **Frontend UX (batch 30)**: ScoreBar progressbar；Input/Select/Textarea 减动效；FormSaveBar `aria-busy`；Radar 模式栏安全区；跳过导航安全区；Brief 空日 CTA
- **Frontend UX (batch 31)**: Sources 删除确认在 pending 中保持打开；Actions 筛选/状态触控与 `aria-pressed`、步骤 44px 触控；Monitor 历史行 focus + `aria-controls`；ErrorBoundary 聚焦标题 + 就地 Retry；PageHeader 返回触控/减动效
- **Frontend UX (batch 32)**: Decisions 行统一 focusRing/减动效；Feed 搜索清除触控、视图切换 min 触控、sticky 安全区；Chat 清空/关闭触控、composer sticky+安全区、`aria-busy`；icon Button 触控加大
- **Frontend UX (batch 33)**: Chip/Button 默认 min 触控高度；Today 甲板进度条标签、快捷键/卡片切换/打开变化焦点；Brief 卡片 aria-label + reduced-motion 阴影；Settings Hub 统一 focusRing；来源区域模式触控
- **Frontend UX (batch 34)**: 侧栏导航/源类型触控与减动效；语言/主题/密度触控；Toast Esc 关闭（避让 dialog）+ 栈上限 3 + 关闭触控；Radar 模式栏触控；Context「更多」焦点；展示选择行触控；Card/MagAction 触控与减动效
- **Frontend UX (batch 35)**: Fetch 详情触控 + 抓取中 live；Notify 高级/勾选触控；Watching 时间线展开触控；Hero 标题减动效；Feedback `aria-busy`；404 CTA；Monitor 控制台/筛选触控
- **Frontend UX (batch 36)**: EmptyState `role=status`、QueryError `role=alert`；抽屉关闭触控；Change 分数可读 dl、证据「站内阅读」触控、抽屉标题链到原文；评论展开 `aria-controls`；源详情 not-found CTA
- **Frontend UX (batch 37)**: Feed「全部已读」确认在 pending 中保持打开；快捷键触控；ChangeCard 打开链触控；⌘K 选项触控；健康条/刷新触控
- **Frontend UX (batch 38)**: Input/Select/Textarea `min-h-10`；危险 ConfirmDialog 用 `alertdialog`；创建源 Esc 提交中禁用、`aria-busy`、更多类型触控；凭证粘贴触控；Brief 原文/证据链与 Today 关注/次要信号/日报链触控
- **Frontend UX (batch 39)**: ListSkeleton i18n 加载文案；FormSaveBar ⌘/Ctrl+S；Feed 分页 sticky+安全区；Radar 搜索一键清除 + 变化行减动效；Chat 引用/种子链触控
- **Frontend UX (batch 40)**: ⌘K 搜索清除；Sources 名链触控；Actions 关联链触控；Settings 表单 `aria-busy`；Feed「更多时间」触控；展示筛选 live；抽屉正文加载 i18n；PackPicker `role=group`
- **Frontend UX (batch 41)**: MagCard 减动效禁滑动；Context 简介无障碍 + 空文禁用提取 + `aria-busy`；Today 提醒/回访/页脚触控；飞书链/健康条链触控；Change 分数 region + 证据标题触控；源详情抽样触控
- **Frontend UX (batch 42)**: Feed 选中滚动尊重 reduced-motion；快捷键面板 region；主题切换 live + 密度触控；侧栏未读 aria-label；Brief 额外条目触控；Hero region；抓取步骤 `aria-current`；Field hint `aria-describedby`
- **Frontend UX (batch 43)**: PageHeader 用 `h1`；焦点陷阱跳过 disabled；Chat 建议组/表单 busy/消息区 region；Radar Signals 隐藏标题补 sr-only h1；Timeline/Watching/Toast 动作触控；Monitor 进行中 live
- **Frontend UX (batch 44)**: Sources 创建表单 `aria-controls`；Decisions 行 aria 含标题；LiveConsole 暂停关 live；甲板清空 CTA 触控 + 快捷键 region；注意力列表 `role=feed`；ErrorBoundary `h1`；抓取面板 busy；Hub 卡片 min 高度
- **Frontend UX (batch 45)**: 源详情空抽样不再空框 + 配置 busy；Monitor 原始切换触控、历史表关联/行高；HistoryBody 唯一 raw id；Decisions 开放区 section；Brief/Mag 减动效补齐
- **Frontend UX (batch 46)**: Feed 抽屉原文 CTA 触控/焦点；ConfirmDialog 唯一 title/desc id；健康条行可读名 + 详情 region；Tracked 打开链触控；ScorePill 可读 aria
- **Frontend UX (batch 47)**: ChangeCard/甲板动作组 `aria-busy`；Changes 列表减动效；EmptyState 用 `h2`；文字链焦点 offset；MagCard `is-dimmed` 禁点 + 选中恢复
- **Frontend UX (batch 48)**: ImmersiveDrawer 唯一标题 id + 减模糊；Sources 分类 `aria-labelledby`、行 busy、启用 `aria-pressed`；Monitor 流式 `role=status`；Feedback 已选禁用重提
- **Frontend UX (batch 49)**: FormSaveBar ⌘/Ctrl+S 可视提示；Brief 条目 aria-label；MagAction 禁用链/aria-label；Today 空态减动效；⌘K 搜索加载态
- **Frontend UX (batch 50)**: Actions 状态筛选/步骤 checkbox；PackPicker 下拉独立标签；Radar 视图/筛选组标签；Chat 消息 log + 流式禁用清空；ScoreBar 无分值；Changes 列表 busy
- **Frontend UX (batch 51)**: Hero 无 onOpen 不渲染按钮；Briefs 推送禁用提示 + 归档 heading；SettingsHub 分区 labelledby；Monitor 历史空态/行 button；ScorePill 无分值可读
- **Frontend UX (batch 52)**: Feed 时间筛选可收起 + 减模糊；抓取进度 valuetext/空详情；结果摘要 Esc 关闭；飞书绑定 busy/live；展示源 indeterminate `aria-checked=mixed`
- **Frontend UX (batch 53)**: Sidebar 品牌链非 h1 + ⌘K shortcuts；Toast 区域标签 + 减动效延长；PageHeader 返回/操作组；Change 详情标题层级 h2
- **Frontend UX (batch 54)**: Source 配置/样例 h2；收藏区 busy + 取消收藏 title；健康卡 live/刷新 busy；ProgressBar valuetext
- **Frontend UX (batch 55)**: Field 合并 aria-describedby；Confirm 减模糊 + 按钮组；Brief 详情分区 labelledby；崩溃页操作组
- **Frontend UX (batch 56)**: Feed 分页减模糊；InFlight valuetext；Deck busy 禁快捷键 + 进度文案；Monitor bubble article；MagCard 操作组
- **Frontend UX (batch 57)**: ItemDetail 正文 region + 评论 labelledby；Feedback 保存 live；Attention 卡片 busy/操作组；Create 表单按钮组
- **Frontend UX (batch 58)**: Monitor SSE/轮询状态；关注变化计数；Settings 表单 label；Basics/Queue labelledby
- **Frontend UX (batch 59)**: ImmersiveDrawer 关闭符/内容 region/页脚操作组；Sources 分类 h2；Decisions labelledby + busy；Today 页 busy
- **Frontend UX (batch 60)**: MagGrid `role=feed`；Feed 焦点栏操作组 + 快捷键 kbd；Sources 页 busy；Skip link 加粗
- **Frontend UX (batch 61)**: Radar 页 busy + 操作组；Brief 证据列表；配置粘贴 aria-label；Drawer 减动效去位移
- **Frontend UX (batch 62)**: FocusTrap 跳过 hidden/inert；Timeline labelledby/article；Radar 变化行 aria-label；StatusBadge title
- **Frontend UX (batch 63)**: ProgressBar 真实百分比 + 可视最小宽度；⌘K combobox；Sources 行操作组
- **Frontend UX (batch 64)**: Today 提醒/复盘 `role=status`、关注分区 labelledby；主题 `color-scheme`；Chip 显式 disabled
- **Frontend UX (batch 65)**: Today 次要信号/日报 labelledby；Feed 全部已读 danger 确认 + loading；抽屉 footer 操作 title
- **Frontend UX (batch 66)**: MagCard 未读 sr-only + aria-label；Contexts GitHub 导入空 URL 禁用 + 输入 aria-label；Notify 分区 labelledby；FormSaveBar backdrop 减动效实底；收藏分区 labelledby
- **Frontend UX (batch 67)**: Watching 时间线加载/错误态；条目数可读 aria-label；创建源空名禁用提交；Changes 列表 aria-label；Hero labelledby；跟踪计数 aria-label
- **Frontend UX (batch 68)**: PageHeader 语义 header；Brief 卡片今日/最新入 aria-label；抓取源状态 i18n；MagGrid feed 标签；Chat 发送/停止 aria-label；Briefs 页 busy
- **Frontend UX (batch 69)**: Actions 筛选计数 aria-label + 分区 labelledby；步骤 checkbox labelledby；Decisions 行含决策类型；Monitor 统计区 labelledby + valuetext
- **Frontend UX (batch 70)**: Sources 展示区 labelledby + 空区域 title；Change 详情分区 labelledby、「问 AI」入 header；RadarDeck/InboxZero labelledby；Sources 列表 busy
- **Frontend UX (batch 71)**: Fetch 结果源状态 i18n；Context/源详情抽样 labelledby；Radar 变化列表 busy+label；Chip pressed 仅激活时；侧栏活跃度 label
- **Frontend UX (batch 72)**: Status/Score badge aria-label；Today 关注 feed 标签；Monitor busy；空态按钮禁用链；Feed toolbar 语义；Brief 条目 labelledby；Settings Hub busy
- **Frontend UX (batch 73)**: Decisions due 加载骨架 + 页 busy；Chat 清空 aria-label；Toast atomic；SourceBadge/分类计数可读
### Added

- **CN media RSS**: 虎嗅 / InfoQ 中国 / 钛媒体 / 雷峰网 / 掘金 / 新浪科技 / 人人都是产品经理 / HelloGitHub / SegmentFault / 数英 / 数字尾巴 — pack + boot-ensure (live-probed)
- **DailyHot connector** (`DAILY_HOT`): self-hosted [DailyHotApi](https://github.com/imsyy/DailyHotApi) via `docker compose` `daily-hot` + `DAILY_HOT_BASE_URL`; create hot-list sources in UI after sidecar is verified (not pre-seeded until routes return live data)
- **Sources settings categories**: 热榜 / 科技媒体 / 社区 / 公众号 / 国际与开源 / 需凭证 — list, display picker, and create-type optgroups

### Changed

- **36氪 feed**: `36kr.com/feed` (anti-bot HTML) → `www.36kr.com/feed`; boot repairs existing rows
- **Google News 科技 CN / V2EX / Zhihu·Weibo·Bilibili pack defaults**: `defaultEnabled: false` until reachable (V2EX often times out; CLI sources enabled by seeder only when binary present)
- **ai-signals**: dropped dead vLLM blog RSS and Nitter proxy sample

### Changed

- **Domestic open-source only**: removed homemade `JUEJIN` / `CSDN` HTTP scrapers; `WEIBO` / `BILIBILI` now wrap [weibo-cli](https://github.com/jackwener/weibo-cli) / [bilibili-cli](https://github.com/public-clis/bilibili-cli); paste Cookie in source config (writes CLI credential files) — no per-project setup
- **Source region modes**: 国内模式 / 国外模式 / 全部 on Sources display picker
- **IA contraction (2.0)**: primary nav is Today · Radar · Decisions · Chat · Settings. Changes / Watching / Context leave the sidebar (soft redirects keep deep links). Explore becomes **Radar** (`/radar`); default tab is browse waterfall (Signals), Changes secondary
- **Today**: vertical Change Attention list (Explore / Ask AI / Follow / Not now) instead of swipe Radar Deck; Daily Brief as artifact link; greeting + “N changes worth your attention”
- **Intelligence home**: `MAJOR_CAP` raised to 5; home cards include `watched` for Follow state
- **Decisions / Chat / Settings**: Needs-review framing; Chat positioned as Change interpreter; Settings hub grouped Personal / Sources / Notifications / Advanced
- **Tagline**: Know what changed. Know why it matters. Decide what to do.

### Changed

- **Settings**：Hub 恢复「系统 / AI 监控」入口（四卡片 + 状态条链到监控）；通知页默认仍简洁，经「详细配置」展开只读时区与「仅有内容才推」；兴趣与忽略仍只在 Context 编辑，保存时同步到评分用的 `interestProfile` 与 dislike 关键词
- **Settings 极简收敛**（前次）：Hub 收成核心入口 + 可折叠状态条；偏好页去掉兴趣描述与关键词编辑

### Added

- **CN tech RSS**: IT之家 / Solidot / 极客公园 / 爱范儿 — pack + boot-ensure by name
- **CN-first boot**: empty DB seeds `ai-cn` only (import `ai-core` via UI); zh locale first visit auto-applies「国内模式」display filter
- **Sources display**: region mode presets; browse chips sort CN types first
- **Today attention cards**: feed-like layout (index, larger title, pill CTAs)
- **Radar browse-first**: default waterfall feed; MagCards + always-visible 收藏/不感兴趣; toolbar collapses 30d/all behind「更多」; default range 24h; `x` dismisses and advances; **swipe right=save / left=skip** on touch (save is sticky, not toggle)
- **CN-first docs**: README.zh documents domestic sources and browse path- **Radar Chat** (`/chat`): multi-turn chat with the configured Ollama/OpenAI model; injects at most 2 related Changes per turn (seed via `?changeId=` from change detail); SSE streaming; session in localStorage
- `POST /api/chat` (SSE) and `POST /api/chat/sync`; prompt `chat_radar.md`

### Removed

- Homemade Juejin / CSDN HTTP connectors (no maintained open-source CLI); existing DB rows are disabled on boot

### Fixed

- Zhihu fetch: CLI/auth/JSON failures surface as source errors in FetchProgress (with `zhihu login` hint) instead of silent `0` items
- Local Ollama (Qwen3.5 thinking models): chat/pipeline calls use native `/api/chat` with `think:false` so streamed `content` is not empty (OpenAI-compat was filling only `reasoning`)

### Changed

- **My Context** UX: free-text intro first; save auto-extracts when structured fields are empty; compact “how AI reads you” + collapsed advanced fields; extract prompt includes `current_focus` / `explicit_ignore`
- Settings → Sources: checkboxes to limit which sources appear across Today, Explore, Changes, Watching, Decisions, Actions, Briefs, and ⌘K search (stored locally; items API accepts `sourceIds`)
- **Today Radar Deck**: major changes are cleared one card at a time (keyboard w/x/i/d, progress strip); Explore adds Focus browse mode next to the waterfall grid
- Light engagement (local only): visit streak + today-read pills in the sidebar; Inbox Zero / deck-clear bursts; playful fetch/decision toasts
- Nav & copy: Chinese labels for 今日 / 变化 / 我的 Context; fetch steps and empty states lean more narrative
- **V2 product IA**: Today centers on ≤3 major Changes (why / what changed / what to do) with Watch · Dismiss · Decide; Explore replaces Feed in nav; Changes + Decisions pages; Monitor moves to Settings → System
- Flyway: single baseline `V1__init.sql` (delete local `data/radar.db` after pull to migrate)
- Daily Intelligence brief template (replaces “AI Radar Brief” header sections)
- Context schema v2 fields: `current_focus`, `explicit_ignore`; feedback nudges topic weights

### Fixed

- Flyway baseline `V1__init.sql`: migration sections run in dependency order (V1→V16); `install.sh` prints reset steps on checksum mismatch

### Added

- `decisions` + `watch_subscriptions` tables; APIs `POST /api/changes/{id}/decisions`, `POST …/dismiss`, `PUT /api/watch/{id}`, `GET /api/decisions?revisit=due`
- Intelligence home: `majorChanges`, `minorSignals`, `decisionsToRevisit`, `proactiveAlerts`
- Change detail: in-app Zhihu reading from evidence list (shared `ItemDetailBody` drawer)
- Scheduled daily decision revisit check (surfaces on Today)

### Changed (prior)

- Briefs UI: calendar-style archive cards (latest featured), structured detail cards (events + top picks), and header actions for update / send
- Feed Zhihu UX: localized source filter chips; sidebar highlights active `sourceType`; strip `【SOURCE】` title-echo from card leads; Zhihu card click / Enter opens the immersive drawer (original stays in drawer CTA); single-source filter uses a denser 1–2 column list and hides redundant source chips; Zhihu cards promote Expand over Not interested; score tiers get left-edge cues
- Feed cards: compact source chip + title-first layout (dropped empty cover band); click opens original URL; drawer shows a clear **Open original** CTA
- Feed browse UI: 2–3 column waterfall grid, slim chip filters, collapsible shortcuts; Save / Not interested stay primary
- Magazine MagCard / MagGrid shared by Today and Watching inherit the same cover + waterfall rhythm

### Added

- Exact-title fetch dedup: after URL merge, drop new items whose `title` already exists in-batch or in DB (`POST` fetch path via `UrlDedupStage`)
- `POST /api/jobs/cleanup-duplicate-titles` — merge duplicate `news_items` rows that share an exact title (keep best row; rewire event/timeline/actions links)
- Feishu scan-to-bind (Device Authorization Grant): Settings shows a QR code, stores app credentials + open_id, one-click unbind; push prefers IM API with legacy webhook fallback
- `POST/GET/DELETE /api/delivery/feishu/bind*` bind session APIs
- Magazine-style Feed / Today / Watching: dual-column MagCards + immersive detail drawer (browse rhythm + single-item focus)
- Today hero focus card for the top HIGH impact signal
- `JobScheduleCoordinator` — programmatic fetch / push / cluster schedule that re-arms from live settings; `@Scheduled` no longer freezes `${radar.*}` at boot
- `GET /api/jobs/schedule` — next/last run times, current cron/interval, and push-cron errors
- Settings save now hot-reloads the job schedule (no backend restart after changing fetch interval or push cron)
- Settings notify section + command palette: **Send today's brief** (manual push)
- Command palette: jump to Briefs, recompute impact, and trigger push
- Settings → System health shows next auto-fetch / auto-push; Advanced → Schedule shows the live plan after save
- Settings notify section shows a readable push result (channel / item count / failure reason)
- Dirty settings forms confirm before in-app navigation (in addition to browser unload)
- Feed shortcut footer labels each key (`j/k` move, `o` expand, `s` save, …)
- Optional item retention (`retentionDays`) + `POST /api/jobs/cleanup`; scheduled fetch runs it automatically when enabled
- `scripts/backup.sh` — WAL-safe SQLite backup into `data/backups/` (keeps last 14)
- `scripts/status.sh` — local health snapshot (backend, Argos translate, PID files, ports)
- `scripts/check.sh` — local CI-parity checks (backend tests, frontend lint/test/build, mcp syntax)
- Settings hub **System health** card (backend / DB / title-translate, same signals as `status.sh`)
- `GET /api/health` now reports Argos translate sidecar status (`up` / `down` / `disabled`)
- `install.sh` waits for `GET /api/health` after starting the backend
- Connectors: Google News, GDELT, OSS Insight, GitHub Trending, V2EX, Telegram, Product Hunt, Twitter, WEB, EMAIL
- Source packs `ai-cn` / `ai-signals`; empty DB seeds from `ai-core` + `ai-cn` packs
- Web full-text enrich (`WEB_FETCH_*`), batch LLM summarize, `/api/connectors` descriptors
- Fetch progress / result summary UI; schema-driven Sources form
- `frontend/src/lib/errors.ts` — shared `errorText()` so every failure surface reads the same
- Route-level code splitting (`React.lazy` + `Suspense`) and a localized "server unreachable" message
- Top-level `ErrorBoundary` with a localized fallback — a render crash used to leave a blank page
- Source-type display names (`zh`/`en`) for badges and the source-weight sliders, instead of raw enum keys
- `AiHealthTracker` + `GET /api/health` `llm` block: whether scoring/summaries run on the live model or on rules, with the last failure reason
- `GET /api/health/llm` live probe and a **Test connection** button under Settings → AI model
- Settings → System health shows an **AI model** row; `scripts/status.sh` reports the LLM mode
- **Briefs** page (`/briefs`) plus a sidebar entry — `/briefs/:date` was previously reachable only by typing the URL
- 404 page for unknown routes (previously a blank main area)
- `/api/health` reports configured LLM readiness (`ready`, `model`, `baseUrl`, `local`, `hasApiKey`)

### Changed

- Settings product surface: customers only edit interests / language / inbox email / Feishu bind / push time; LLM, SMTP transport, webhooks, weights, and pipeline knobs move to `.env` / `application.yml`
- Email notify: single inbox field (`smtpTo`); SMTP host/user/password are deployer-only; public DTO exposes `emailTransportReady`
- Settings hub card “AI model” → “Preferences & notifications” (`/settings/preferences`; `/settings/llm` redirects)
- Feed / Today / Watching lists use magazine MagCards + immersive drawer instead of flat accordion / divide-y stacks; shell content width `max-w-5xl`

- Sidebar source filters use localized source-type display names instead of raw enum keys (`HACKER_NEWS` → Hacker News)
- Zhihu source seed is portable: enable only when the local CLI exists; stop force-pinning a machine-specific `cliPath` over working custom paths
- Pipeline no longer holds one long SQLite transaction across network/LLM I/O
- Persist uses bulk URL lookup + `saveAll`; web enrich runs with bounded parallelism
- Frontend `build:embed` writes into Spring `static/`; hashed assets are gitignored
- Settings exposes push-only-when-items, SMTP STARTTLS, and browser local token
- Feed empty state is no longer a dead end: with no sources it links to **Add a source**, otherwise it offers **Update now**
- `vite.config.ts` uses `import.meta.dirname` (drops the Vite native-config-loader warning)
- **Update now** on Today now recomputes impact automatically, and a **Recompute impact** button was added — Today/Actions used to stay empty forever because nothing ever triggered impact
- Today's getting-started panel branches on whether sources exist (the "no sources" branch was unreachable after auto-seeding)
- The fetch result summary is no longer auto-dismissed the instant a job finishes, so kept/failed counts and "retry failed sources" are actually readable
- `SettingsHubPage` AI banner is three-state (live / degraded / rules) and derives from real call outcomes instead of a config string check
- `install.sh` hard-fails without npm or on Node/Java below the required version, probes the LLM after startup, and ends with explicit next steps
- Numeric settings keep a local draft and reject `NaN`/out-of-range input instead of PUTting it
- Context window default is consistently **8192** across `.env.example`, `application.yml` and docs (docs said 4096)
- `AI_PARALLELISM` docs no longer claim a tunable 1–8 range: LLM calls run single-threaded by design
- A failed LLM call now enters a short cooldown (`AI_FAILURE_COOLDOWN_MS`, default 60s) instead of paying the retry ladder for every batch — a first fetch against a dead endpoint dropped from ~200s to ~5s, and the log reason distinguishes `llm_not_ready` from `llm_failure_cooldown`. A successful call or **Test connection** clears it immediately
- `scripts/smoke-extensibility.sh` bounds every request with a timeout and prints progress, so it can no longer hang silently
- `scripts/status.sh` actively verifies the LLM instead of trusting cached state, so it no longer reports a dead endpoint as live

### Fixed

- Align `OPENAI_KEEP_ALIVE` docs/tests with runtime default `0` (unload after each local call)
- Home / Sources / Briefs keep content visible while a fetch job runs
- LLM failures logged as the unactionable `AI call failed: null`; failures now name the exception and walk the cause chain (`Failures.describe`)
- Silent mutation failures in the Feed (save / read / not-interested) and the command palette's bulk "mark all read" now toast the error, and bulk mark-all-read needs a confirming second Enter
- "Not interested" is undoable from its toast and no longer permanently hides an item on a single misclick
- `WatchingPage` shows an error + retry instead of "nothing here yet" when its queries fail; settings hub surfaces a settings load failure
- `ConfirmDialog` disables its buttons while the confirmed action is in flight (prevents double deletes)

## [0.1.0] - 2026-09-08

### Added

- Multi-source fetch pipeline (RSS, Hacker News, Reddit, GitHub) with normalize / dedup
- Heuristic and optional LLM scoring / summarization
- Event clustering and four-column intelligence home
- Daily brief generation and delivery via Feishu / Email / Webhook / Outbox
- Single-user Web UI (React + Vite + Tailwind) with Sources → Items → Briefs → Settings
- Spring Boot 3 backend on Java 21 with SQLite
- Source pack import (`packs/`) and extensibility docs
- Read-only MCP sidecar (`mcp/server.mjs`)
- Docker Compose / `install.sh` one-box run paths
- MIT license, contributing / security docs, CI, and self-hosted star history
