# 步骤 2 — 极简运行与个人分发（News Agent 级体验）

## 目标

让个人用户在新机器上 **10 分钟内**跑起来，并稳定收到**飞书 / 邮件 / Webhook** 日报。管道能力来自步骤 1；本步解决「装得上、跑得稳、推得到」。

## 参考来源

| 项目 | 借鉴点 | 路径提示 |
| --- | --- | --- |
| News Agent | 一键安装、APScheduler 式定时、飞书/Discord/自定义 webhook、fetch/push 分离 | `scripts/install.*`、`src/push/`、`src/server.py`、`src/jobs.py` |
| Horizon | Email / Webhook 多渠道、cron `daily-run.sh`、Docker Compose | `src/services/`、`scripts/daily-run.sh`、`docker-compose.yml` |
| Morning Deck | 定时 Job + BriefingWorker、报告邮件 | `core/job/`、`BriefingWorker`、`provider/emailsend/` |
| 本仓库方案 | 模式 A/B/C 零摩擦启动 | [`推荐开源项目.md`](../推荐开源项目.md) 第五、十四节 |

## 交付物

1. **启动方式（至少两种）**
   - 开发：`./mvnw spring-boot:run`（后端）+ 前端可后置；本步允许先无完整 UI
   - 一键：`docker compose up -d`（单服务优先：后端 + 内嵌静态资源或同容器）
2. **最小配置面**
   - 必填：`OPENAI_API_KEY`（及可选 `OPENAI_BASE_URL` / `OPENAI_MODEL`）
   - 可选推送：`FEISHU_WEBHOOK_URL`、SMTP 一组变量、`WEBHOOK_URL`
3. **调度**
   - Fetch 周期（默认每 1–2 小时）
   - Daily Push cron（默认本地时区 08:00，可配置）
4. **Delivery 适配器**
   - `FeishuDelivery`、`EmailDelivery`、`WebhookDelivery`
   - 统一接口：`deliver(BriefPayload payload)`
5. **推送内容**
   - 基于步骤 1 的 Top N Markdown / 卡片：标题、分数、摘要、链接
6. **运维友好**
   - 健康检查 `GET /actuator/health` 或 `/api/health`
   - 推送失败可重试 + 日志；不阻塞抓取

## 任务清单

### 2.1 配置与密钥

- [x] 统一 `application.yml` + 环境变量覆盖；敏感信息不入库明文（可用本地加密或仅 env）
- [x] 提供 `config.example.env` / `.env.example`，字段 ≤ 10 个核心项
- [x] Settings 持久化表（可选）：推送开关、cron 表达式、兴趣文本（为步骤 3 UI 预留）

### 2.2 调度与任务互斥

- [x] 启用 Spring `@Scheduled` 或等价调度器
- [x] `FetchJob`：调用步骤 1 `PipelineOrchestrator`（可跳过已在窗口内抓过的源）
- [x] `PushJob`：组装当日 Brief → 调用已启用的 Delivery
- [x] 任务互斥：同一时刻只允许一个 fetch / 一个 push（避免重叠烧钱）
- [x] 手动触发：`POST /api/jobs/fetch`、`POST /api/jobs/push`（本地无鉴权或简单 token）

### 2.3 飞书推送

- [x] 实现飞书自定义机器人 Webhook（Markdown / post 消息）
- [x] 消息长度截断与「查看更多」指向本地 UI URL（若 UI 未就绪则给原文链接列表）
- [x] 用真实 webhook 或 mock server 做联调清单

### 2.4 邮件推送

- [x] SMTP 发送：主题含日期 + 「AI Radar 日报」
- [x] HTML 或纯文本模板；失败时 ERROR 日志含不含密码的诊断信息
- [x] 可选：仅当有 score ≥ 阈值的新条目时才发信（避免空日报骚扰）

### 2.5 通用 Webhook

- [x] POST JSON：`{ date, items: [{title, score, summary, url}], generatedAt }`
- [x] 支持自定义 Header（如签名 token）

### 2.6 Docker / 一键体验

- [x] 编写 `Dockerfile`（多阶段：build + JRE 运行）
- [x] `docker-compose.yml`：挂载 `./data` 卷持久化 SQLite 与 briefs
- [x] 文档写清：复制 env → `docker compose up -d` → 打开 health → 等首次 push 或手动 trigger
- [x] （可选，非阻塞）提供 `install.sh`：检测 Java、写 env、后台启动 — 对齐 News Agent 体验

### 2.7 可观测性

- [x] 记录每次 push：渠道、成功/失败、条目数、耗时
- [x] `sent-history`：已推送 URL 集合，避免同日重复刷屏（可参考 News Agent 思路）

## 验收标准

1. 干净机器（或干净 Docker）：按文档操作，**10 分钟内**完成配置并成功跑通一次 fetch
2. 配置飞书 webhook 后，手动 `push` 能在飞书群收到可读日报
3. 配置 SMTP 后，能收到一封含 Top N 的邮件（或明确跳过：文档标明「二选一即可」）
4. 定时任务按配置触发；重叠执行被互斥挡住
5. 重启进程后 SQLite 与配置不丢（volume / 本地 `./data`）
6. 未配置任何推送渠道时，系统仍可正常 fetch，仅跳过 push 并打 INFO 日志

## 明确不做

- 完整 React 产品页（步骤 3）；本步可用 API + Markdown 文件验收
- Discord / Telegram / Slack 全渠道（Webhook 通用即可覆盖；飞书+邮件优先）
- 云端 SaaS、账号系统、多用户订阅
- 高可用集群、消息队列
- 付费 Credits / 用量网关
