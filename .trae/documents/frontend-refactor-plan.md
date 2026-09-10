# 前端 UI 重构计划：ai-radar/frontend

> 目标：**功能不减** 的前提下，重构代码结构、统一视觉系统、引入轻量工具链，让原本"凌乱"的前端变得清晰、可维护。
> 范围：代码结构重构 + 视觉改版（用户已确认）。
> 现有规模：12 个页面、6 个组件、2 个 hook，约 6500 行源码。

---

## 一、现状分析（基于实际代码证据）

### 1.1 巨型单体文件（行数倒序）

| 文件 | 行数 | 问题 |
|------|------|------|
| `src/pages/AiMonitorPage.tsx` | **687** | 单文件包含：3 个嵌套子组件（MonitorBubble/HistoryBody/AiMonitorPage）、SSE 订阅、轮询、表格展开、进度条、上下文用量条。混杂"数据流 + 视图 + 副作用"。 |
| `src/pages/SettingsPage.tsx` | **574** | 表单 ~25 个字段全部内联；包含 2 个内部子组件（PreferenceKeywordsEditor / KeywordChips）；`saveSettings()` 手工拼装 24 个字段。 |
| `src/lib/formatAiMonitorBody.ts` | 532 | 纯函数库但单文件过长，可按 operation 分模块。 |
| `src/components/ui.tsx` | **518** | "巨桶"文件：providers（PrefsProvider/ToastProvider）+ 4 个 hook（usePrefs/useToast/useBeforeUnload）+ 一堆 primitives（Button/EmptyState/ConfirmDialog/PageHeader...）+ **legacy row**（ItemRow / ScorePill，注释明确写"kept for older pages"）。 |
| `src/lib/api.ts` | 511 | API 层合理，不需大改。 |
| `src/pages/FeedPage.tsx` | **467** | 路由参数 + 搜索 + 分页 + 键盘导航 + mutation + cache 操作全部内联，5 个 useEffect。 |

### 1.2 双套混用的样式体系（核心痛点）

`@theme` 里同时定义了两套语义色，互相重叠却不完全一致：

| 语义 | "新"系（surface/border） | "旧"系（paper/mist） | 是否一致 |
|------|------------------------|-------------------|---------|
| 卡片背景 | `--color-surface` | `--color-paper` | light/dark 完全相同 |
| 分隔线 | `--color-border` | `--color-mist` | light 微差（#e5e6eb vs #f2f3f5），dark 相同 |
| 页面底色 | `--color-bg` | `--color-sidebar` | 不同但本就分工不同 |

**结果**：13 个文件中共 **112 处**混用 `border-mist` / `bg-paper` / `border-border` / `bg-surface`，相同组件出现两套写法。例如：
- `TodayPage`/`WatchingPage`/`ActionsPage`/`SettingsHubPage` 用 `bg-surface border-border`
- `SettingsPage`/`ContextsPage`/`AiMonitorPage`/`SourcesPage` 用 `bg-paper/70 border-mist`

### 1.3 重复的"工厂模式"与内联按钮

- `SettingsPage` 内联了 `field(key, label, type)` 工厂生成 input；同样的 label+input 模式在 `ContextsPage`、`SourcesPage` 又各写一遍，且各自 className 略有不同。
- 三种**互斥的 filter 按钮视觉**：
  - `ActionsPage`：`bg-ink text-paper`
  - `FeedPage`：`bg-accent text-white`
  - `AiMonitorPage`：`bg-moss text-paper`
- `ui.tsx` 有完整的 `Button` 组件（5 个 variant），但页面里仍散落原生 `<button>` + 内联 className。

### 1.4 重复的数据获取与 mutation

- `['sources']` query 在 `App.tsx`、`FeedPage`、`TodayPage`、`SourcesPage` **4 处**独立 `useQuery`，无共享 `useSources` hook。
- `importPack` mutation 在 `TodayPage`、`SourcesPage`、`SettingsPage` **3 处**几乎逐字复制。
- `FetchProgressPanel` + `FetchResultSummary` 的 JSX 块在 `FeedPage`、`TodayPage`、`SourcesPage` **3 处**重复：
  ```tsx
  {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
  {phase === 'summary' ? <FetchResultSummary ... /> : null}
  ```

### 1.5 ConfirmDialog 与 CommandPalette 的 focus-trap 重复

`ui.tsx` 的 `ConfirmDialog`（[L276-L302](file:///Users/sunliang/workspace/source/ai-radar/frontend/src/components/ui.tsx#L276-L302)）和 `CommandPalette.tsx`（[L92-L134](file:///Users/sunliang/workspace/source/ai-radar/frontend/src/components/CommandPalette.tsx#L92-L134)）各自实现了一份几乎一样的 Tab/Shift+Tab focus cycling 逻辑。

### 1.6 图标缺位

`App.tsx` 侧边栏导航用 Unicode 符号（`◉ ◎ ≡ ★ → ⚙`），缺乏可识别的图标系统；页面内按钮多用文字标签，视觉密度高但层级不清。`public/icons.svg` 已存在但未被引用。

---

## 二、必须保留的功能清单（验收基线）

> 用户明确要求 **"功能不减"**。以下能力重构后必须仍可用：

- [ ] 12 个路由全部可达：`/`, `/feed`, `/watching`, `/actions`, `/monitor`, `/settings`, `/settings/context`, `/settings/sources`, `/settings/sources/:id`, `/settings/llm`, `/changes/:id`, `/briefs/:date`
- [ ] 6 条旧路由重定向仍生效：`/changes`, `/items`, `/contexts`, `/sources`, `/sources/:id`, `/events`, `/events/:id`, `/briefs`
- [ ] `⌘K` CommandPalette：导航 + 搜索 items + 标记全部已读
- [ ] FeedPage 键盘导航：`j/k` 上下、`o` 展开、`Enter` 打开外链、`s` 收藏、`m` 标记已读、`/` 聚焦搜索
- [ ] AiMonitorPage SSE 实时流式 IO（`delta` / `begin` / `complete` / `queue` 事件）+ 暂停/恢复 + 操作过滤 + 历史展开
- [ ] FetchProgressPanel 三阶段（collect/organize/write）+ FetchResultSummary 失败重试
- [ ] Toast 系统 + undo（`useMarkItemRead` 标记已读后可撤销）
- [ ] SettingsPage 全部 ~25 字段：基础/LLM/上下文窗口/权重滑块/通知/高级折叠区（pipeline/schedule/push/security/pack）/local token
- [ ] ContextsPage：rawText 提取 / GitHub URL 导入 / 表单编辑 / FormSaveBar 未保存提示
- [ ] 主题切换（system/light/dark）+ 密度切换（compact/comfortable/cozy）+ 语言切换（zh/en）+ localStorage 持久化
- [ ] SourcesPage：创建 RSS/其他类型、启用/禁用、删除（带 ConfirmDialog）、单源 test fetch
- [ ] FeedbackBar 5 种反馈（useful/irrelevant/watch/ignore/tried）+ sessionStorage 记忆
- [ ] 旧 `ItemRow` / `ScorePill` 仍被 `SourceDetailPage` 和 `ChangeDetailPage` 使用——重构时要么保留要么替换，但渲染结果必须等价

---

## 三、技术选型（轻量依赖）

用户已同意"允许少量轻量依赖"。**不引入 UI 组件库**（保持自研），只引入纯工具：

| 依赖 | 大小 | 用途 |
|------|------|------|
| `clsx` | ~1KB | 条件 className 拼接 |
| `tailwind-merge` | ~3KB | 合并 Tailwind 类，解决冲突（让组件支持 `className` override） |
| `class-variance-authority` (cva) | ~1KB | 声明式 variants（替代手写 `variant === 'x' ? ... : ...` 三元链） |
| `lucide-react` | tree-shake，每图标 ~200B | 图标系统，替代 Unicode 符号 |

**不引入**：radix-ui / shadcn / headlessui / react-aria（这些会让 bundle 翻倍并改变现有交互）。Focus trap 仍由自研 `useFocusTrap` hook 提供。

---

## 四、分阶段实施计划

> 每阶段独立可验证、可单独提交。建议按顺序执行，因为后续阶段依赖前面的基础设施。

### 阶段 1：基础设施 — 工具链 + 设计令牌统一

**目标**：建立 cva + clsx + tailwind-merge 工具，统一 `@theme` 颜色令牌，为后续组件抽取铺路。

**变更**：

1. **`package.json`** — 新增 4 个依赖：`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`。

2. **新建 `src/lib/cn.ts`** — 统一的 className 工具：
   ```ts
   import { clsx, type ClassValue } from 'clsx'
   import { twMerge } from 'tailwind-merge'
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
   }
   ```

3. **`src/index.css`** — 统一颜色令牌：
   - 保留：`ink, paper≡surface, muted, faint, accent, accent-soft, moss, moss-deep, ember, bg, surface, border, sidebar`
   - **删除** `paper` 和 `mist`（与 `surface`/`border` 在 light/dark 均等价或近乎等价），迁移所有 `paper → surface`、`mist → border`。
   - 新增几个语义令牌便于组件复用：`--color-card`（=surface）、`--color-card-hover`、`--color-ring`（=accent/15）。
   - 保留 density / score-bar / skeleton / prose / monitor / zhihu / thin-scroll / kbd 等已存在的实用样式。

4. **全局机械化替换**（可用脚本辅助但需逐文件 review）：
   - `bg-paper` → `bg-surface`
   - `border-mist` → `border-border`
   - `divide-mist` → `divide-border`
   - `bg-mist/XX` → `bg-border/XX`（半透明背景用作 hover 时改为 `hover:bg-border/60`）
   - `from-paper to-mist/30` → `from-surface to-border/30`
   - `border border-mist bg-paper/70 p-4` → 统一为新的 `Card` 组件（阶段 2）

**验证**：
- `npm run build`（tsc + vite）通过
- `npm run lint`（oxlint）通过
- 手动：12 路由可访问，颜色无视觉回归（light + dark 各看一遍）

---

### 阶段 2：拆分 `ui.tsx` 巨桶 + 建立 primitives 组件库

**目标**：把 518 行的 `ui.tsx` 按职责拆分，补齐缺失的基础组件（Input / Select / Field / Card / Chip / Progress / Tabs），并用 cva 重写 variants。

**新目录结构**：

```
src/components/
├── providers/
│   ├── PrefsProvider.tsx      (theme + density, 从 ui.tsx 抽出, ~60 行)
│   └── ToastProvider.tsx      (toast + useToast, 从 ui.tsx 抽出, ~80 行)
├── primitives/
│   ├── Button.tsx             (cva 重写, variants: primary/ghost/danger/text/icon + sizes)
│   ├── Input.tsx             (新, 替代 SettingsPage/ContextsPage/SourcesPage 内联 input)
│   ├── Select.tsx            (新, 替代内联 select)
│   ├── Textarea.tsx          (新)
│   ├── Field.tsx             (新, label + 控件 wrapper, 替代内联 <label> 模式)
│   ├── Card.tsx              (新, 统一 rounded-xl border bg-surface p-X)
│   ├── Badge.tsx             (合并 StatusBadge + ScoreSourceBadge + SourceBadge)
│   ├── Chip.tsx              (新, 替代 KeywordChips 内联 + FeedbackBar 按钮)
│   ├── Progress.tsx          (新, 抽取 AiMonitorPage/FetchProgressPanel 的 progress bar)
│   ├── Skeleton.tsx          (ListSkeleton, 从 ui.tsx 抽出)
│   ├── EmptyState.tsx        (从 ui.tsx 抽出)
│   ├── StateBox.tsx          (从 ui.tsx 抽出)
│   ├── ConfirmDialog.tsx     (从 ui.tsx 抽出, 改用 useFocusTrap)
│   ├── PageHeader.tsx        (从 ui.tsx 抽出, 视觉改版见阶段 6)
│   └── FormSaveBar.tsx       (从 ui.tsx 抽出)
├── score/
│   ├── ScoreBar.tsx          (从 ui.tsx 抽出)
│   ├── ScorePill.tsx         (legacy, 保留供 SourceDetailPage/ChangeDetailPage)
│   └── ItemRow.tsx           (legacy, 保留供 SourceDetailPage, 标记 @deprecated)
├── feedback/
│   └── FeedbackBar.tsx       (现有, 改用 Chip + cva)
├── fetch/
│   ├── FetchProgressPanel.tsx (现有)
│   ├── FetchResultSummary.tsx (现有)
│   └── FetchProgressSection.tsx (新, 封装 phase + progress + panel + summary 三段式)
├── layout/
│   ├── Sidebar.tsx           (从 App.tsx 抽出, 阶段 5 详述)
│   ├── LanguageSwitcher.tsx  (从 App.tsx 抽出)
│   ├── ThemeDensityControls.tsx (从 App.tsx 抽出)
│   └── useFocusTrap.ts       (新, 抽取 ConfirmDialog + CommandPalette 的重复逻辑)
├── CommandPalette.tsx        (现有, 改用 useFocusTrap)
├── FeedRow.tsx               (现有, 阶段 4 微调)
└── ui.tsx                    (改为纯 re-export barrel, 便于现有 import 不破坏)
```

**关键约束**：
- `ui.tsx` 保留为 **barrel re-export** 文件（`export * from './primitives/Button'` ...），让现有 `import { Button } from '../components/ui'` **不破坏**，降低迁移风险。
- `PrefsProvider` / `ToastProvider` / `usePrefs` / `useToast` / `useBeforeUnload` 同样 re-export。
- legacy `ItemRow` / `ScorePill` 标记 `@deprecated` 但保留，等阶段 6 决定是否替换 `SourceDetailPage` / `ChangeDetailPage` 的使用。

**Button cva 示例**：
```ts
export const buttonVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:opacity-90',
        ghost: 'border border-border bg-surface text-ink hover:bg-border/50',
        danger: 'border border-red-500/60 text-red-500 hover:bg-red-500/10',
        text: 'bg-transparent text-muted hover:text-ink underline-offset-2 hover:underline',
        icon: 'h-8 w-8 justify-center text-muted hover:bg-border/60 hover:text-ink',
      },
      size: { sm: 'px-2 py-1 text-xs', md: 'px-2.5 py-1.5 text-sm', lg: 'px-3.5 py-2 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
```

**验证**：
- `npm run build` + `npm run lint` 通过
- `npm test`（vitest，现有 format.test.ts / formatAiMonitorBody.test.ts）通过
- 手动：12 路由视觉无回归

---

### 阶段 3：抽取共享 hooks

**目标**：消除 4 处 `['sources']` query 重复 + 3 处 `importPack` mutation 重复 + FetchProgress JSX 重复。

**新建**：

```
src/hooks/
├── useFetchJobWithProgress.ts  (现有, 不改)
├── useMarkItemRead.ts          (现有, 不改)
├── useSources.ts              (新, useQuery(['sources'], api.sources))
├── useConnectors.ts            (新, useQuery(['connectors'], api.connectors))
├── useSettings.ts             (新, useQuery + useMutation save)
├── useImportPack.ts           (新, 替代 3 处重复)
└── useUnreadCounts.ts         (新, 替代 App.tsx 内联)
```

**FetchProgressSection 组件**（在阶段 2 已规划）：
```tsx
// 用法（FeedPage/TodayPage/SourcesPage 三处统一）
<FetchProgressSection
  phase={phase}
  progress={progress}
  onDismiss={() => void dismiss()}
  retrying={retryFailed.isPending}
  onRetryFailed={(types) => retryFailed.mutate(types)}
/>
```
替代原来的两行三元 + 两个组件调用。

**改造页面**（仅替换 import 与 query 调用，不动 JSX）：
- `App.tsx`：`useQuery(['sources'], ...)` → `useSources()`；`useQuery(['unread-counts'], ...)` → `useUnreadCounts()`
- `FeedPage.tsx`：同上 + `useConnectors`
- `TodayPage.tsx`：同上 + `useImportPack`
- `SourcesPage.tsx`：同上 + `useImportPack`
- `SettingsPage.tsx`：`useSettings`（替换内联 query + save mutation 的样板）

**验证**：
- `npm run build` + `npm test` 通过
- 手动：FeedPage 抓取 / TodayPage 抓取 / SourcesPage 单源抓取 均触发 FetchProgressSection

---

### 阶段 4：拆分巨型页面 — AiMonitorPage + SettingsPage + FeedPage

**目标**：把 3 个 400+ 行的页面拆为"页面组件 + 子组件 + hooks"，每个文件 ≤ ~200 行。

#### 4.1 `AiMonitorPage.tsx`（687 → 拆为 5 个文件）

```
src/pages/ai-monitor/
├── AiMonitorPage.tsx          (~120 行, 容器: useQuery + SSE + 状态)
├── MonitorBubble.tsx          (~100 行, 单条对话气泡)
├── MonitorHistoryTable.tsx    (~120 行, 历史表格 + 展开)
├── MonitorQueueCard.tsx      (~50 行, 队列进度卡片)
├── MonitorStatsCard.tsx      (~70 行, TPS / 上下文用量 / 调用统计)
└── useAiMonitorStream.ts     (~80 行, SSE 订阅 + 轮询降级 + streamFlights 状态)
```

`buildIoEntries` / `formatTps` / `formatClock` / `progressFromElapsed` 留在 `lib/formatAiMonitorBody.ts` 或迁到 `ai-monitor/utils.ts`。

#### 4.2 `SettingsPage.tsx`（574 → 拆为 6 个文件）

```
src/pages/settings/
├── SettingsPage.tsx           (~80 行, 容器: useSettings + form state)
├── BasicsSection.tsx          (~80 行, 兴趣画像 + 主语言)
├── LlmSection.tsx             (~90 行, baseUrl/model + 上下文窗口 + 并发)
├── WeightsSection.tsx         (~40 行, 14 个权重滑块)
├── NotifySection.tsx          (~50 行, 飞书 / SMTP)
├── AdvancedSection.tsx        (~90 行, 折叠区: pipeline/schedule/push/security/pack)
└── PreferenceKeywordsEditor.tsx (~90 行, 现有内部组件, 独立文件)
```

`saveSettings()` 不再手工列 24 字段——改为 `save.mutate(form)`（后端接受 Partial）。

`PreferenceKeywordsEditor` 改用新的 `Chip` + `Input` + `Field` 组件。

#### 4.3 `FeedPage.tsx`（467 → 拆为 4 个文件）

```
src/pages/feed/
├── FeedPage.tsx               (~150 行, 容器: useFeedQuery + state)
├── FeedToolbar.tsx            (~90 行, 搜索 + range + sourceType + unread 切换)
├── useFeedKeyboard.ts         (~50 行, j/k/o/s/m/Enter/slash 键盘导航)
└── FeedPagination.tsx         (~30 行, 分页)
```

`FeedRow` 仍在 `components/FeedRow.tsx`（已被良好复用，不大改）。

**验证**：
- `npm run build` + `npm test` 通过
- 手动：
  - AiMonitor SSE 仍实时推送（开 dev tools network 看到 event stream）
  - Settings 全部字段可保存且生效
  - Feed 键盘 j/k/o/s/m/Enter/slash 全部工作

---

### 阶段 5：拆分 Shell + 视觉改版（侧边栏 + PageHeader + 卡片）

**目标**：把 `App.tsx` 的 `Shell` 函数（~150 行）拆为 `layout/` 子组件，并完成视觉改版（用户已选）。

#### 5.1 拆分 Shell

```
src/components/layout/
├── AppShell.tsx               (容器: grid 布局 + <main> + <CommandPalette>)
├── Sidebar.tsx                (品牌 + nav + sourceTypes + 底部控件)
├── SidebarNav.tsx             (NavLink 列表 + unread badge + ⌘K 按钮)
├── SourceTypeList.tsx         (侧边栏 source type 链接 + unread 计数)
├── LanguageSwitcher.tsx       (中/EN 切换)
└── ThemeDensityControls.tsx   (theme cycle + density 三档)
```

`App.tsx` 缩到 ~30 行：`PrefsProvider > ToastProvider > AppShell`。

#### 5.2 视觉改版（用户选了"视觉改版"，必须做）

**a. 侧边栏导航**：
- Unicode 符号 → `lucide-react` 图标：
  - `◉` today → `Calendar` 或 `Sparkles`
  - `≡` feed → `Newspaper` 或 `List`
  - `★` watching → `Star` / `Bookmark`
  - `→` actions → `CheckSquare` / `ListTodo`
  - `◎` monitor → `Activity` / `MonitorDot`
  - `⚙` settings → `Settings`
- 图标 + 标签横向排列，active 状态用 `bg-accent-soft text-accent` + 左侧 3px accent 条（已有 `.feed-row.selected::before` 模式可复用）。

**b. PageHeader 改版**：
- 当前：`text-xl font-semibold` + `text-sm text-muted`。
- 改版：加可选 `icon` prop（lucide）+ 可选 `breadcrumbs`，actions 右对齐用 `flex-wrap`。视觉层级更清晰。

**c. Card 组件统一**：
- 所有 `rounded-xl border border-mist bg-paper/70 p-4` → `<Card>` 或 `<Card padding="md">`。
- 可选 `hover` variant（用于 `SettingsHubPage` 的可点击卡片）。

**d. Filter / Tab 按钮统一**：
- 新建 `primitives/Tabs.tsx`（cva variants: active `bg-ink text-paper` / inactive `text-muted hover:text-ink`）。
- 替换 `ActionsPage` / `FeedPage` / `AiMonitorPage` 三种互斥的 filter 按钮写法。

**e. 表单控件统一**：
- `Input` / `Select` / `Textarea` / `Field` 组件统一 `focus:border-accent focus:ring-2 focus:ring-accent/15`（FeedPage 搜索框已有此样式，推广到所有表单）。
- 替换 `SettingsPage` 内联 `field()` 工厂、`ContextsPage` / `SourcesPage` 内联 label+input。

**验证**：
- `npm run build` + `npm test` 通过
- 手动：12 路由视觉焕然一新但功能不变；侧边栏图标可点击；PageHeader 层级清晰；filter 按钮风格统一

---

### 阶段 6：收尾 — 清理 legacy + 文档

**目标**：清理标记为 `@deprecated` 的 legacy 组件，统一剩余内联按钮。

**变更**：

1. **legacy `ItemRow` / `ScorePill` 评估**：
   - `SourceDetailPage`（74 行）和 `ChangeDetailPage`（130 行）是仅有的使用者。
   - 改为使用 `FeedRow`（如可复用）或保留 `ItemRow` 但内部改用 `ScoreBar` + 新 `Card`。
   - 倾向：**保留** `ScorePill`（紧凑场景仍有用，且 `ChangeDetailPage` 的 sourcesItems 列表用了它），`ItemRow` 改为内部复用 `ScoreBar` + `Badge`，但仍以 `<ItemRow>` 名导出，避免破坏 import。

2. **剩余原生 `<button>` 统一为 `Button`**：
   - `AiMonitorPage`（拆分后子组件）：暂停/恢复、scroll-to-bottom、操作过滤
   - `FeedPage`（拆分后 `FeedToolbar`）：range 切换、sourceType chip、unread 切换
   - `SettingsPage`（拆分后各 Section）：上下文窗口 preset 按钮、advanced 折叠触发
   - `ContextsPage`：（无按钮，已是 Button）
   - 标签类小按钮（如 `RowActions` 里的 save/read/not interested）保留原生 `<button>` 但用 `cn()` 统一样式——它们是 inline 文本按钮，不适合包成 `Button`。

3. **`CommandPalette` 改用 `useFocusTrap`**。

4. **删除 `src/components/ui.tsx` 的 barrel re-export**（可选，若所有页面已改为具体路径 import）。若担心风险，保留 barrel 也无妨——它只是 re-export，无运行时成本。

**验证**：
- `npm run build` + `npm run lint` + `npm test` 全绿
- 手动烟雾测试清单：
  - [ ] 12 路由全部可访问
  - [ ] 6 条旧路由重定向
  - [ ] ⌘K CommandPalette
  - [ ] FeedPage 键盘 j/k/o/s/m/Enter/slash
  - [ ] AiMonitor SSE 实时流
  - [ ] FetchProgressPanel 三阶段 + summary 重试
  - [ ] Toast + undo
  - [ ] Settings 全部字段保存
  - [ ] Contexts 提取 / GitHub 导入
  - [ ] 主题 / 密度 / 语言切换 + 持久化
  - [ ] Sources 创建/禁用/删除/单源抓取
  - [ ] FeedbackBar 5 种反馈
  - [ ] light + dark 两种主题视觉一致

---

## 五、假设与决策

1. **不引入 UI 库**（radix/shadcn/headlessui）——保持自研，bundle 不大幅膨胀。
2. **`paper`/`mist` 删除迁移到 `surface`/`border`**——两套在 light/dark 均等价或近乎等价，迁移是机械且安全的。
3. **legacy `ItemRow`/`ScorePill` 保留**——少量页面使用，重写收益低、风险高；只内部统一样式，不改 API。
4. **`formatAiMonitorBody.ts`（532 行）不大改**——纯函数且有测试覆盖，拆分收益低。仅在阶段 4 顺便把 `AiMonitorPage` 内联的 `formatTps`/`formatClock`/`progressFromElapsed`/`buildIoEntries` 迁到同目录 `utils.ts`。
5. **`api.ts` 不改**——API 层职责清晰，不在本次重构范围。
6. **i18n 不改**——`zh.json` / `en.json` 现有 key 不变；新增组件若需要新文案，复用现有 key 或新增最小集。
7. **每个阶段独立提交**——便于 review 与回滚。建议每阶段一个 commit，commit message 形如 `refactor(frontend): phase N - <summary>`。
8. **阶段顺序**：1 → 2 → 3 → 4 → 5 → 6。阶段 2/3 可部分并行（hooks 抽取不依赖 primitives 完成），但建议串行以降低风险。

---

## 六、风险与缓解

| 风险 | 缓解 |
|------|------|
| `paper`/`mist` 迁移漏改导致样式断裂 | 阶段 1 后 `grep -r 'bg-paper\|border-mist\|divide-mist'` 应为 0；逐文件 review |
| 拆分页面引入 subtle bug（如 SSE effect 依赖） | 阶段 4 逐文件 diff review；AiMonitorPage SSE 行为手测 |
| `ItemRow`/`ScorePill` legacy 误删 | 阶段 6 才处理，且保留 re-export barrel 作为安全网 |
| cva + tailwind-merge 与 Tailwind v4 兼容性 | cva 是纯 JS，tailwind-merge 支持 v4；先在 Button 单组件试跑 |
| lucide-react 体积 | tree-shake，仅按需 import 命名图标；`npm run build` 后检查 bundle 大小 |
| 键盘导航 / focus trap 回归 | 阶段 2 抽 `useFocusTrap` 后，ConfirmDialog + CommandPalette 各自手测 Tab/Shift+Tab/Escape |

---

## 七、执行顺序与提交节奏

1. **Phase 1**（基础设施） — 1 个 commit
2. **Phase 2**（拆 ui.tsx + primitives） — 1 个 commit
3. **Phase 3**（共享 hooks + FetchProgressSection） — 1 个 commit
4. **Phase 4**（拆 3 个巨型页面） — 可拆 3 个 commit（每页一个）
5. **Phase 5**（Shell 拆分 + 视觉改版） — 可拆 2 个 commit（Shell 拆分 / 视觉改版）
6. **Phase 6**（清理 + 烟雾测试） — 1 个 commit

总计约 7-9 个 commit。每个 commit 后跑 `npm run build && npm run lint && npm test`，并在关键节点手动验证清单。
