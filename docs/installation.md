# Installation & operations

English | [中文](#安装与运维)

Fastest path (also in the root README):

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

Open [http://localhost:8080](http://localhost:8080). `install.sh` copies `backend/.env.example` → `backend/.env` if missing, sets up the **Argos Translate** sidecar (Python 3, en→zh titles), embeds the frontend into Spring static resources, and starts the backend.

Stop:

```bash
./stop.sh
```

`stop.sh` reads `data/ai-radar.pid` and `data/argos-translate.pid` (and frees ports `8080` / `8765` if leftover processes are still listening).

Backup the SQLite database (WAL-safe; keeps the last 14 copies under `data/backups/`):

```bash
./scripts/backup.sh
# restore: stop the backend, then
#   cp data/backups/radar-YYYYmmdd-HHMMSS.db data/radar.db
```

Optional retention: Settings → Advanced → **Keep items for N days** (default `0` = forever). Items older than N days that are not saved and not linked to an event are deleted after each scheduled fetch (and via `POST /api/jobs/cleanup`).

---

## Configure

```bash
cd backend
cp .env.example .env
# defaults: local Ollama at http://localhost:11434/v1 model qwen3.5:2b-mlx
# optional for cloud: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
# optional context budget: OPENAI_CONTEXT_WINDOW_TOKENS=8192 OPENAI_MAX_COMPLETION_TOKENS=1024
# optional Ollama residency: OPENAI_KEEP_ALIVE=5m (use 0 to unload after each call)
# host tip: OLLAMA_NUM_PARALLEL=1 keeps a single runner; OPENAI_KEEP_ALIVE=0 lowers peak RAM
# optional fetch HTTP timeout: FETCH_TIMEOUT_MS=60000 (pipeline default; override in .env / application.yml)
# optional title translate sidecar: RADAR_TRANSLATE_URL=http://127.0.0.1:8765
#   RADAR_TRANSLATE_ENABLED=false to skip Argos
# optional delivery: SMTP_* for email transport; FEISHU_WEBHOOK_URL legacy only (prefer Settings scan-bind)
```

**Default LLM** is local Ollama (no API key required for `localhost`). Cloud endpoints still need `OPENAI_API_KEY`. Context window defaults to **8192** tokens (also sent as Ollama `num_ctx` for local endpoints) and is adjustable under **Settings → AI model**; oversized prompts are truncated. Local calls use `OPENAI_KEEP_ALIVE` (default **0** = unload after each call; set `5m` if you want short residency). Live token/s, in-flight progress, and prompt/response previews appear on the **AI monitor** page (`/monitor`, `GET /api/ai/monitor`). News pull HTTP read timeout defaults to **60s** and is adjustable under **Settings → Advanced**.

### Title translation (Argos Translate)

When **primary language** is Chinese (`summaryLanguage=zh`), English-looking titles are localized to `titleDisplay` by a local **Argos Translate** HTTP sidecar (`translate-service/`), not by the LLM.

| Requirement | Notes |
| --- | --- |
| Python 3.10+ | Used by `install.sh` / Docker image |
| `argostranslate==1.11.0` | Pinned in `translate-service/requirements.txt` |
| Package `translate-en_zh` | Downloaded at install (~100MB); **not** in git |
| Port | Default `127.0.0.1:8765` (`RADAR_TRANSLATE_URL`) |

Manual sidecar:

```bash
cd translate-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python install_model.py
python server.py
# curl http://127.0.0.1:8765/health
```

Offline: pre-download `.argosmodel` via `argospm` on a networked machine, then install from path (see Argos docs). Licenses and attribution: [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

AI Radar uses **`ARGOS_CHUNK_TYPE=MINISBD`** and removes optional **Stanza/PyTorch** after install (titles are short). Do not install `argostranslate[stanza]` unless your Python has `_lzma` (some pyenv builds lack it). Fixing lzma is optional: `brew install xz` then reinstall that Python with lzma enabled.

If the sidecar is down, summarization still works; titles fall back to the original English.

Optional LAN guard: set `LOCAL_TOKEN` and send header `X-Local-Token`.

## Run modes

### Dev (API + UI separately)

```bash
# terminal 0 (optional if install.sh already started it)
cd translate-service && source .venv/bin/activate && python server.py

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
# starts argos-translate (:8765) + ai-radar (:8080)
curl -s http://localhost:8080/api/health
curl -s http://localhost:8765/health
```

### install.sh / stop.sh

```bash
./install.sh   # venv + Argos model + embed UI + start sidecar + backend (waits for /api/health)
./stop.sh      # stop data/ai-radar.pid + data/argos-translate.pid (+ free :8080/:8765)
./scripts/status.sh   # health snapshot: backend, translate, PID files, ports
./scripts/check.sh    # local CI-parity tests (backend + frontend + mcp)
```

First Argos `pip install` can take several minutes (ctranslate2 / spaCy wheels). Later runs skip pip/model when already present. For a faster cold start without titles: `SKIP_TRANSLATE=1 ./install.sh`.

## Trigger jobs manually

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .   # needs a delivery channel
curl -s http://localhost:8080/api/items | jq .
```

In the UI: Sources → Fetch → Items → Briefs → Settings.

## Delivery channels

Customer UI (**Settings → Preferences & notifications**): inbox email + Feishu scan-to-bind + push time.

Deployer (`.env` / `application.yml`): SMTP transport, optional legacy Feishu webhook, generic webhook, LLM, pipeline knobs. See comments in `backend/.env.example`.

| Channel | Customer | Deployer |
| --- | --- | --- |
| Feishu | Scan QR in Settings (binds open_id; one-click unbind) | Optional legacy `FEISHU_WEBHOOK_URL` if you already have a custom bot |
| Email | Inbox address only (`smtpTo`) | `SMTP_HOST` / `SMTP_USERNAME` / `SMTP_PASSWORD` (+ optional port/from/starttls) |
| Webhook | — | `WEBHOOK_URL` (+ optional `WEBHOOK_HEADERS` JSON) |
| Outbox | — | `./data/outbox/` files when `radar.delivery.outbox-enabled=true` (default) |

Push runs daily at `radar.push-cron` (default `08:00` `Asia/Shanghai`; customer can pick a preset hour in Settings). Fetch every `radar.fetch-interval-ms` (default 2h). Overlapping jobs are mutex-blocked (`409`).

No channels configured → fetch still works; push logs `no_channels` and skips.

See also: [extending-delivery.md](extending-delivery.md).

## Layout

```text
backend/     Spring Boot API + jobs + delivery + static SPA
frontend/    React + Vite + Tailwind
mcp/         Read-only MCP sidecar
packs/       Source pack manifests
docs/        Documentation
aim/         historical iteration notes
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

`stop.sh` 读取 `data/ai-radar.pid` 与 `data/argos-translate.pid`（若仍有进程占用 `8080` / `8765` 也会一并释放）。

### 配置

```bash
cd backend
cp .env.example .env
# 默认：本地 Ollama http://localhost:11434/v1 模型 qwen3.5:2b-mlx
# 云端可选：OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL
# 上下文预算可选：OPENAI_CONTEXT_WINDOW_TOKENS=8192 OPENAI_MAX_COMPLETION_TOKENS=1024
# Ollama 常驻可选：OPENAI_KEEP_ALIVE=5m（设为 0 则每次调用后卸载）
# 本机建议：OLLAMA_NUM_PARALLEL=1；更省内存可用 OPENAI_KEEP_ALIVE=0
# 拉取超时可选：FETCH_TIMEOUT_MS=60000（流水线默认，在 .env / application.yml 覆盖）
# 标题翻译侧车：RADAR_TRANSLATE_URL=http://127.0.0.1:8765
#   RADAR_TRANSLATE_ENABLED=false 可关闭 Argos
# 推送：客户在设置里填邮箱 / 扫码绑飞书；部署者配 SMTP_*（可选遗留 FEISHU_WEBHOOK_URL、WEBHOOK_URL）
```

**默认 LLM** 为本地 Ollama（`localhost` 无需 API Key）。云端接口仍需 `OPENAI_API_KEY`。上下文窗口默认 **8192** tokens（本地会作为 Ollama `num_ctx` 下发），可在 **设置 → AI 模型** 调节；超长 prompt 会截断。本地调用使用 `OPENAI_KEEP_ALIVE`（默认 **0**，每次调用后卸载；需要短驻留可设 `5m`）。**AI 监控** 页面（`/monitor`）显示进行中进度、输入/输出预览与 token/s（`GET /api/ai/monitor`）。新闻拉取 HTTP 读超时默认 **60s**，可在 **设置 → 高级** 调节。

### 标题翻译（Argos Translate）

主语言为中文时，英文标题由本地 **Argos Translate** HTTP 侧车翻译为 `titleDisplay`，不再占用 LLM。依赖：Python 3.10+、`argostranslate==1.11.0`、安装时下载的 `translate-en_zh` 模型（约 100MB，不入库）。默认端口 `8765`，断句用 `ARGOS_CHUNK_TYPE=MINISBD`（不装 Stanza）。许可证与归属见 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。侧车不可用时摘要仍正常，标题回退原文。部分 pyenv Python 缺少 `_lzma` 时不要装 `argostranslate[stanza]`。

可选局域网保护：设置 `LOCAL_TOKEN`，请求头带 `X-Local-Token`。

### 运行方式

**开发模式（API + UI 分开）**

```bash
# terminal 0（若尚未由 install.sh 启动）
cd translate-service && source .venv/bin/activate && python server.py

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
# 启动 argos-translate (:8765) + ai-radar (:8080)
curl -s http://localhost:8080/api/health
curl -s http://localhost:8765/health
```

### 手动触发

```bash
curl -s -X POST http://localhost:8080/api/jobs/fetch | jq .
curl -s -X POST http://localhost:8080/api/jobs/push | jq .
curl -s http://localhost:8080/api/items | jq .
```

### 投递渠道

客户 UI（**设置 → 偏好与通知**）：接收邮箱 + 飞书扫码绑定 + 推送时间。

部署者（`.env` / `application.yml`）：SMTP 传输、可选旧版飞书 Webhook、通用 Webhook、LLM、流水线参数。详见 `backend/.env.example` 注释。

| 渠道 | 客户 | 部署者 |
| --- | --- | --- |
| 飞书 | 设置里扫码绑定（一键解除） | 可选遗留 `FEISHU_WEBHOOK_URL`（已有自定义机器人时） |
| 邮件 | 只填接收邮箱 | `SMTP_HOST` / `SMTP_USERNAME` / `SMTP_PASSWORD`（可选 port/from/starttls） |
| Webhook | — | `WEBHOOK_URL`（可选 `WEBHOOK_HEADERS`） |
| Outbox | — | `radar.delivery.outbox-enabled=true` 时写入 `./data/outbox/`（默认开） |

推送按 `radar.push-cron` 每日执行（默认 `08:00` `Asia/Shanghai`；客户可在设置里选常用时刻）。抓取间隔 `radar.fetch-interval-ms`（默认 2h）。重叠任务互斥（`409`）。

未配置渠道时抓取仍可用；推送会记录 `no_channels` 并跳过。

扩展投递： [extending-delivery.md](extending-delivery.md)。

### 测试

```bash
cd backend && ./mvnw test
cd frontend && npm run build
```

扩展 smoke：`scripts/smoke-extensibility.sh`。
