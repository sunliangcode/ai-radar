[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml)
![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3-green)

# AI Radar

### 个人 AI 情报雷达

```
Context → Signal → Change → Decision → 回到 Today 回顾
```

发现重要变化，理解它与你的关系，决定下一步行动。

[演示](#演示)
· [快速开始](#快速开始)
· [文档](#文档)

**技术栈：** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI 兼容 LLM（默认本地 Ollama） · Argos Translate（英→中标题）

---

### 为什么选择 AI Radar？

大多数 AI 资讯是噪音。AI Radar 用你的上下文过滤噪音，只留下值得关注的**变化**，并帮你决定下一步。

- ✓ **Today** — 每日首页：3～5 个真正重要的 Change，以及为什么、该做什么
- ✓ **个人 Context** — 画像、项目与技术栈，相关性围绕「你」
- ✓ **Radar** — 默认瀑布流浏览情报；收藏 / 不感兴趣轻反馈；变化库按需切换
- ✓ **国内源优先** — 开箱 seed `ai-cn`：知乎 / 微博 / B站（开源 CLI）+ V2EX / IT之家等 RSS；页面可切国内/国外模式，Cookie 一键粘贴
- ✓ **Decisions** — 记录观察 / 行动，到期再判断
- ✓ **Chat** — 变化的解释器（从「问 AI」进入），不是第二个信息流
- ✓ **Briefs** — 推送沉淀与归档（`/briefs/:date`），不是一级导航
- ✓ **Settings → System** — 自托管诊断用的健康与 AI 监控

---

### 演示

![AI Radar 情报首页](assets/demo/intelligence-home.png)

- **变了什么** — 今天 AI 世界真正重要的变化是什么？
- **为何关心** — 这件事为什么和你的项目 / 技术栈有关？
- **做什么** — 关注、忽略或决策 — 需要时再复盘。

**完整路径**

1. 打开 **Settings → Context**，填写角色、项目与技术栈，并选择主语言。
2. 首次启动已带国内开源源；需要英文源时在 Settings 导入 `ai-core`。中文环境会自动「国内模式」展示。Cookie 在情报源详情粘贴即可。
3. **立即更新**，在 **Today** 处理值得关注的 Change（查看 / 问 AI / 关注 / 暂不处理）。
4. 点「继续逛逛」进入 **Radar** 瀑布流：右滑收藏、左滑不感兴趣（或 `s` / `x`）。
5. 在 **Settings → 情报源** 可一键「国内优先」，或开关单个源。

---

## 快速开始

**方式 A — 一键安装（推荐）**

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

打开 [http://localhost:8080](http://localhost:8080)。

```bash
./scripts/status.sh    # 健康状态快照
./scripts/backup.sh    # WAL 安全备份 → data/backups/
./stop.sh              # 停止 install.sh 拉起的后台进程
```

**方式 B — Docker**

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
```

Argos Translate 在 `:8765`，AI Radar 在 `:8080`。详情见：[docs/installation.md](docs/installation.md)。

**方式 C — 开发模式**

```bash
# 后端（http://localhost:8080）
cd backend && cp .env.example .env   # 首次
./mvnw spring-boot:run

# 前端（http://localhost:5173，/api 代理到 :8080）
cd frontend && npm install && npm run dev
```

环境变量、推送渠道等详见：[docs/installation.md](docs/installation.md)。

## 文档

- [文档目录](docs/README.md)
- [安装与运维](docs/installation.md)
- [数据源与 Pack](docs/sources.md)
- [API](docs/api.md)
- [架构 / 领域模型](docs/ai-radar-2.0-domain.md)
- [投递渠道](docs/extending-delivery.md)
- [MCP](docs/mcp.md)
- [连接器开发](docs/extending-connectors.md)
- [贡献指南](CONTRIBUTING.md) · [安全策略](SECURITY.md) · [变更日志](CHANGELOG.md)

## License

MIT — 见 [LICENSE](LICENSE)。

第三方翻译依赖（Argos Translate / 模型）：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## Star History

GitHub 于 2026 限制了公开 stargazer API，多数仓库上的 `api.star-history.com` 徽章已不可用。本图由 [`.github/workflows/star-history.yml`](.github/workflows/star-history.yml) 生成并提交进仓库。

<!-- star-history:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/star-history/star-history-dark.svg">
  <img alt="Star history" src="assets/star-history/star-history-light.svg">
</picture>
<!-- star-history:end -->
