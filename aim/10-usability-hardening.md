# 步骤 10 — 易用性加固（Usability Hardening）

## 目标

把「能用」变成「好用」：新用户从 `./install.sh` 到看见决策不应踩空，AI 是否真的在工作必须可见，
任何失败都不应是静默的。

本轮由两条只读审计驱动（首次启动体验 / 前端交互摩擦）+ 真实运行日志证据，不加产品大功能。

## 问题清单（实测证据）

| 问题 | 证据 | 影响 | 方案 |
| --- | --- | --- | --- |
| AI 失败原因不可读 | `data/ai-radar.log` 出现 21 次 `AI call failed: null` | 用户永远不知道模型为何不可用 | `describeFailure()` 遍历 cause 链，始终带上异常类型 |
| AI 状态在 UI 不可见 | `/api/health` 只有 db + translate；LLM 无对应字段 | 静默回落到规则模式，用户以为在看 AI | `/api/health` 增加 `llm` 块 + 设置页「AI 模型」行 |
| 「AI 已就绪」是假阳性 | `isLlmReady()` 只做字符串匹配；默认 localhost 即「就绪」 | Ollama 没跑也显示「已开启」 | 用真实调用结果（`AiHealthTracker`）判定 ai / degraded / heuristic |
| 无法验证模型连通性 | 设置页只有 baseUrl/model 输入框 | 配错了也没反馈 | `GET /api/health/llm` 实探 `/models` + 「测试连接」按钮 |
| **Impact 从不重算 → Today/Actions 永远为空** | `api.impactJob()` 前端定义了但无人调用；无定时任务 | 首启完全跑不通：onboarding 说「更新一次看 Today」，Today 永远空 | 更新成功后自动链式重算 + Today 增加「重算 Impact」按钮 |
| 空态文案指向不存在的控件 | `actions.emptyHint` 让用户去 Today 重算，但没这个按钮 | 死胡同 | 按钮落地 + 文案与之一致 |
| Today 引导不区分有无源 | `sourceCount === 0` 分支因自动播种永不命中 | 引导文案与实际不符 | 按 `hasSources` 分流，启用既有闲置文案 |

## 交付物

1. `AiHealthTracker` — 记录最近一次真实调用的成功/失败
2. `OpenAiCompatibleAiService.describeFailure()` — 可读的失败原因（含 cause 链）
3. `GET /api/health` 的 `llm` 块；`GET /api/health/llm` 实时探针
4. 设置页「系统状态」新增 AI 模型行；「AI 模型」页新增「测试连接」
5. `SettingsHubPage` 横幅改为三态（AI / 降级 / 规则）
6. Today 自动链式重算 Impact + 手动按钮
7. `scripts/status.sh` 显示 LLM 模式

## 任务清单

- [x] `AiHealthTracker` + `describeFailure` + 单测
- [x] `/api/health` 增加 `llm`；`/api/health/llm` 探针
- [x] `scripts/status.sh` 的 llm 段
- [x] `SystemHealthCard` AI 行（含「已配置但未调用」的诚实提示）
- [x] 设置页「AI 模型」→「测试连接」
- [x] `SettingsHubPage` 三态横幅 + 设置加载失败态
- [x] Today：更新后自动重算 Impact；新增「重算 Impact」按钮；按有无源分流引导
- [x] `actions.emptyHint` 文案与真实控件一致
- [x] 前端静默失败修复：`FeedPage.patch` 失败提示、命令面板「全部已读」二次确认 + 错误提示、`ConfirmDialog` 提交中禁用
- [x] 抓取结果摘要不再被自动关闭（`useFetchJobWithProgress` 拆分 invalidate 与 dismiss）
- [x] `WatchingPage` / 设置中心查询失败态 + 重试
- [x] 未知路由 404 页 + `/briefs` 日报列表页与侧栏入口
- [x] `install.sh`：npm / Java / Node 版本硬校验、失败时 tail 日志、LLM 探测、编号下一步
- [x] 文档漂移（context window 8192、aiParallelism 单线程、monitor 指向 /monitor）

## 验收

- [x] Ollama 未运行时 `/api/health` 的 `llm.mode` 不会谎报「ai」（有调用记录后为 degraded）
- [x] Ollama 未运行时「测试连接」返回可读原因（`ConnectException`），而非 `null`
- [x] `./scripts/status.sh` 在 LLM 不可用时给出明确 WARN
- [x] Today 点「立即更新」后自动重算 Impact，Today/Actions 会填充
- [x] `cd backend && ./mvnw -B test` 通过
- [x] `cd frontend && npm run lint && npm run test && npm run build` 通过
- [x] `./scripts/check.sh` 全绿

## 明确不做

- 不做定时 Impact 任务（成本：每次全量重算会打满本地模型）；改为用户动作触发 + 更新后自动链式
- 不引入 ErrorBoundary 之外的全局状态库
- 不做多语言 UI 切换改造
- 未做：脏表单的路由切换拦截（目前只有 `beforeunload`）；未做：`FeedRow` 的行级键盘可达性

## 追加轮次（性能与兜底）

| 项 | 证据 | 方案 |
| --- | --- | --- |
| LLM 不可达时仍对每个 batch 重试 | 日志 254 次 `AI call failed attempt`；一次抓取耗时 199s | 失败后进入冷却（`AI_FAILURE_COOLDOWN_MS`，默认 60s）直接走规则；成功调用或「测试连接」立即解除 |
| `scripts/smoke-extensibility.sh` 无超时会假死 | 实测 180s 无任何输出 | 每个请求加超时并打印进度与进度查询地址 |
| 渲染期异常导致白屏 | 全仓无 ErrorBoundary | 路由级 `ErrorBoundary` + 本地化兜底与「返回 Today / 刷新」 |
| 状态脚本会谎报 LLM 为 live | 只读 `/api/health` 的配置位，未验证连通性 | `status.sh` 主动探测并报告实测结果 |
| 来源类型显示原始枚举 | `ZHIHU` / `HACKER_NEWS` 直接展示 | `sourceType.*` 中英显示名，用于徽章与权重滑块 |

- [x] LLM 失败冷却 + 精确日志原因（`llm_not_ready` vs `llm_failure_cooldown`）
- [x] `smoke-extensibility.sh` 超时与进度
- [x] `ErrorBoundary`
- [x] `status.sh` 主动探测
- [x] 来源类型显示名

**实测收益**：LLM 不可达时的一次抓取 199s → 5s，重试告警 254 次 → 0 次，结果同为规则模式。
