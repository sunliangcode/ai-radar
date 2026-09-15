# Sources & packs

English | [中文](#数据源与-pack)

## Default sources

Seeded on empty DB: OpenAI / Hugging Face / Simon Willison RSS, 量子位 & 新智元 WeChat RSS, 36氪, HN, Reddit, GitHub search, Google News, GDELT, OSS Insight, GitHub Trending, V2EX. Token-gated samples (Product Hunt, Twitter, Telegram) are seeded **disabled**.

**Zhihu** (`知乎推荐`) is ensured on every application start. It is enabled only when the preferred CLI exists (`ZHIHU_CLI_PATH` or the historical default path); otherwise the source is created **disabled**. A working custom `cliPath` is not overwritten.

## Import packs

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

Manifests live under `packs/sources/*.json`. Draft format notes: [pack-manifest-draft.md](pack-manifest-draft.md).

## Connector types

RSS · Hacker News · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt (`PH_TOKEN`) · Twitter/X via Apify (`APIFY_TOKEN`) · WEB (AI extract) · EMAIL (IMAP) · Zhihu · Fixture

Optional: `WEB_FETCH_ENABLED=true` to expand short feed snippets before scoring.

How to add a connector: [extending-connectors.md](extending-connectors.md).

---

## 数据源与 Pack

### 默认源

空库种子：OpenAI / Hugging Face / Simon Willison RSS、量子位与新智元微信 RSS、36氪、HN、Reddit、GitHub Search、Google News、GDELT、OSS Insight、GitHub Trending、V2EX。Product Hunt / Twitter / Telegram 示例默认关闭（需 token）。

**知乎**（「知乎推荐」）每次启动都会 ensure。仅当本机 CLI 可执行时（`ZHIHU_CLI_PATH` 或历史默认路径）默认启用；否则创建为**禁用**。可用的自定义 `cliPath` 不会被覆盖。

### 导入 Pack

```bash
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-core"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-cn"}'
curl -s -X POST http://localhost:8080/api/packs/import -H 'Content-Type: application/json' -d '{"packId":"ai-signals"}'
```

清单位于 `packs/sources/*.json`。格式草稿：[pack-manifest-draft.md](pack-manifest-draft.md)。

### 连接器类型

RSS · Hacker News · Reddit · GitHub · GitHub Trending · Google News · GDELT · OSS Insight · V2EX · Telegram · Product Hunt（`PH_TOKEN`）· Twitter/X via Apify（`APIFY_TOKEN`）· WEB（AI 抽取）· EMAIL（IMAP）· 知乎 · Fixture

可选：`WEB_FETCH_ENABLED=true` 在评分前补全短摘要正文。

扩展连接器：[extending-connectors.md](extending-connectors.md)。
