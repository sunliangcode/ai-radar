# Installation & operations

English | [中文](#安装与运维)

Fastest path (also in the root README):

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

Open [http://localhost:8080](http://localhost:8080). `install.sh` copies `backend/.env.example` → `backend/.env` if missing, embeds the frontend into Spring static resources, and starts the backend.

Stop:

```bash
./stop.sh
```

`stop.sh` reads `data/ai-radar.pid` (and frees port `8080` if a leftover Java process is still listening).

---

## Configure

```bash
cd backend
cp .env.example .env
# optional: OPENAI_API_KEY, FEISHU_WEBHOOK_URL, WEBHOOK_URL, SMTP_*
```

Without `OPENAI_API_KEY`, the pipeline uses **heuristic** scoring (still produces a usable brief).

Optional LAN guard: set `LOCAL_TOKEN` and send header `X-Local-Token`.

## Run modes

### Dev (API + UI separately)

```bash
# terminal 1
cd backend && ./mvnw spring-boot:run

# terminal 2
cd frontend && npm install && npm run dev
# UI: http://localhost:5173  (proxies /api → :8080)
```

### Single process (UI baked into Spring)

```bash
cd frontend && npm install && npm run build:embed
# writes into backend/src/main/resources/static/
cd ../backend && ./mvnw spring-boot:run
# http://localhost:8080
```

### Docker

```bash
cp backend/.env.example backend/.env   # edit as needed
docker compose up -d --build
curl -s http://localhost:8080/api/health
```

### install.sh / stop.sh

```bash
./install.sh   # build embed UI + start backend in background
./stop.sh      # stop process from data/ai-radar.pid (+ free :8080 if needed)
```

## Trigger jobs manually

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .   # needs a delivery channel
curl -s http://localhost:8080/api/items | jq .
```

In the UI: Sources → Fetch → Items → Briefs → Settings.

## Delivery channels

| Channel | Env / Settings |
| --- | --- |
| Feishu | `FEISHU_WEBHOOK_URL` or Settings |
| Webhook | `WEBHOOK_URL` (+ optional headers JSON) |
| Email | `SMTP_HOST`, `SMTP_TO`, `SMTP_PASSWORD`, … |

Push runs daily at `radar.push-cron` (default `08:00` `Asia/Shanghai`). Fetch every `radar.fetch-interval-ms` (default 2h). Overlapping jobs are mutex-blocked (`409`).

No channels configured → fetch still works; push logs `no_channels` and skips.

See also: [extending-delivery.md](extending-delivery.md).

## Layout

```text
backend/     Spring Boot API + jobs + delivery + static SPA
frontend/    React + Vite + Tailwind
mcp/         Read-only MCP sidecar
packs/       Source pack manifests
docs/        Documentation
aim/         execution plans
Dockerfile / docker-compose.yml / install.sh / stop.sh
```

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

Extensibility smoke: `scripts/smoke-extensibility.sh`.

---

## 安装与运维

最快路径：

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

打开 [http://localhost:8080](http://localhost:8080)。`install.sh` 会在缺少时复制 `.env`、把前端打进 Spring 静态资源并启动后端。

停止：

```bash
./stop.sh
```

`stop.sh` 读取 `data/ai-radar.pid`（若仍有进程占用 `8080` 也会一并释放）。

### 配置

```bash
cd backend
cp .env.example .env
# 可选: OPENAI_API_KEY, FEISHU_WEBHOOK_URL, WEBHOOK_URL, SMTP_*
```

未配置 `OPENAI_API_KEY` 时使用**启发式**打分（仍可生成可用简报）。

可选局域网保护：设置 `LOCAL_TOKEN`，请求头带 `X-Local-Token`。

### 运行方式

**开发模式（API + UI 分开）**

```bash
# terminal 1
cd backend && ./mvnw spring-boot:run

# terminal 2
cd frontend && npm install && npm run dev
# UI: http://localhost:5173  (proxies /api → :8080)
```

**单进程（UI 打进 Spring）**

```bash
cd frontend && npm install && npm run build:embed
cd ../backend && ./mvnw spring-boot:run
# http://localhost:8080
```

**Docker**

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
curl -s http://localhost:8080/api/health
```

### 手动触发

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .
curl -s http://localhost:8080/api/items | jq .
```

### 投递渠道

| 渠道 | Env / Settings |
| --- | --- |
| 飞书 | `FEISHU_WEBHOOK_URL` 或 Settings |
| Webhook | `WEBHOOK_URL`（可选 headers JSON） |
| 邮件 | `SMTP_HOST`, `SMTP_TO`, `SMTP_PASSWORD`, … |

推送按 `radar.push-cron` 每日执行（默认 `08:00` `Asia/Shanghai`）。抓取间隔 `radar.fetch-interval-ms`（默认 2h）。重叠任务互斥（`409`）。

未配置渠道时抓取仍可用；推送会记录 `no_channels` 并跳过。

扩展投递： [extending-delivery.md](extending-delivery.md)。

### 测试

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

扩展 smoke：`scripts/smoke-extensibility.sh`。
