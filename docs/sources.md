# Sources & packs

English | [中文](#数据源与-pack)

## Default sources

Seeded on empty DB: OpenAI / Hugging Face / Simon Willison RSS, 量子位 & 新智元 WeChat RSS, 36氪, HN, Reddit, GitHub search, Google News, GDELT, OSS Insight, GitHub Trending, V2EX. Token-gated samples (Product Hunt, Twitter, Telegram) are seeded **disabled**.

**Zhihu** (`知乎推荐`) is ensured on every application start. It is enabled only when the preferred CLI exists (`ZHIHU_CLI_PATH` or `zhihu` on PATH); otherwise the source is created **disabled**. A working custom `cliPath` is not overwritten. Sources can **Install** `pyzhihu-cli` and probe with Cookie by default (no AI required; same for Weibo / Bilibili).

## Import packs

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

Manifests live under `packs/sources/*.json`. Draft format notes: [pack-manifest-draft.md](pack-manifest-draft.md).

CLI:

```bash
./bin/ai-radar pack import ai-core
```

## 15-minute pack walkthrough

Goal: add a **local-only** pack JSON, import it, and see a new FIXTURE source (no new connector code).

**Prereqs:** backend up; you understand [extensibility.md](extensibility.md) (packs configure instances of existing types).

1. **Use the sample** at [`examples/packs/demo-local.json`](../examples/packs/demo-local.json) (or copy it and edit).

2. **Validate locally** (no backend):

```bash
./bin/ai-radar pack validate examples/packs/demo-local.json
```

3. **Import without rebuilding** via `--path` (CLI) or JSON `path` on `POST /api/packs/import`:

```bash
./bin/ai-radar pack import demo-local --path examples/packs/demo-local.json
# equivalent curl:
# curl -s -X POST http://127.0.0.1:8080/api/packs/import \
#   -H 'Content-Type: application/json' \
#   -d "{\"packId\":\"demo-local\",\"path\":\"$(pwd)/examples/packs/demo-local.json\"}"
```

   To ship a built-in pack id long-term, keep the file under `packs/sources/<id>.json` (Maven copies it into the jar) and use `./bin/ai-radar pack import <id>` after rebuild.

4. **Verify**:

```bash
./bin/ai-radar sources | jq '.[].name' | grep -i 'Demo Local'
./bin/ai-radar fetch --type FIXTURE
```

5. **Do not commit** throwaway packs; use `ai-core` / `ai-cn` / `ai-signals` patterns for real contributions. New **types** still need a connector — [extending-connectors.md](extending-connectors.md).

Built-in packs: `ai-cn` (default seed), `ai-core`, `ai-signals`. List + schema-check without a backend:

```bash
./bin/ai-radar pack list
```

## Connector types

Full table: [extending-connectors.md](extending-connectors.md). Live catalog: `./bin/ai-radar connectors`.

RSS · HN · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt (`PH_TOKEN`) · Twitter/X (`APIFY_TOKEN`) · WEB · EMAIL · Zhihu · Weibo · Bilibili · DailyHot · Fixture. Legacy (no bean): JUEJIN / CSDN.

Optional: `WEB_FETCH_ENABLED=true` to expand short feed snippets before scoring.

How to add a connector: [extending-connectors.md](extending-connectors.md).

---

## 数据源与 Pack

### 默认源

空库种子：OpenAI / Hugging Face / Simon Willison RSS、量子位与新智元微信 RSS、36氪、HN、Reddit、GitHub Search、Google News、GDELT、OSS Insight、GitHub Trending、V2EX。Product Hunt / Twitter / Telegram 示例默认关闭（需 token）。

**知乎**（「知乎推荐」）每次启动都会 ensure。仅当本机 CLI 可执行时（`ZHIHU_CLI_PATH` 或 PATH 上的 `zhihu`）默认启用；否则创建为**禁用**。可用的自定义 `cliPath` 不会被覆盖。情报源页默认即可一键安装 `pyzhihu-cli` 并探测 Cookie（无需 AI；微博 / B 站同理）。

### 导入 Pack

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

清单位于 `packs/sources/*.json`。格式草稿：[pack-manifest-draft.md](pack-manifest-draft.md)。

CLI：`./bin/ai-radar pack import ai-core`

**15 分钟写 Pack：** 见上文英文 [15-minute pack walkthrough](#15-minute-pack-walkthrough)（用 `FIXTURE` 本地 JSON，无需写新连接器）。

### 连接器类型

完整表：[extending-connectors.md](extending-connectors.md)。实时目录：`./bin/ai-radar connectors`。

RSS · HN · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt（`PH_TOKEN`）· Twitter/X（`APIFY_TOKEN`）· WEB · EMAIL · 知乎 · 微博 · B站 · DailyHot · Fixture。遗留（无 bean）：JUEJIN / CSDN。

可选：`WEB_FETCH_ENABLED=true` 在评分前补全短摘要正文。
