[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/sunliangcode/ai-radar/actions/workflows/ci.yml)
![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3-green)

# AI Radar

**你的个人 AI 决策系统。**

知道变了什么。知道为何重要。知道下一步做什么。

AI Radar 不只是告诉你 AI 世界发生了什么，而是告诉你哪些变化与你有关、影响什么，以及下一步做什么。它持续理解你的工作与技术栈，把重要变化变成可执行行动。

[演示](#演示) · [快速开始](#快速开始) · [文档](#文档)

**技术栈：** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI 兼容 LLM（可选）

## 演示

![AI Radar 情报首页](assets/demo/intelligence-home.png)

- **变了什么** — 今天 AI 世界真正重要的变化是什么？
- **为何关心** — 这件事为什么和你的项目 / 技术栈有关？
- **做什么** — 你下一步应该做什么？

### 完整路径

1. 在设置 / Context 里填写角色、项目与技术栈。
2. 触发一次抓取 — Radar 只突出与你相关的 **Change**，而不是所有头条。
3. 打开一条变化，查看 **Impact**：为什么这件事对你重要，而不是泛泛摘要。
4. 采纳推荐 **Action** — 可执行的下一步，或进一步做实验验证。

## 为什么选择 AI Radar

大多数 AI 资讯是噪音。AI Radar 用你的上下文过滤噪音，只留下值得关注的变化，并告诉你该怎么做。

## 工作方式

```text
你的 Context → 信号 → 重要变化 → 影响 → 行动
```

## 快速开始

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

打开 [http://localhost:8080](http://localhost:8080)。

Docker、开发模式、环境变量与推送渠道见：[docs/installation.md](docs/installation.md)。

## 核心能力

- **个人 Context** — 画像、项目与技术栈，相关性围绕「你」，而不是全球热榜。
- **变化发现** — 重要外部变化，而不是无尽原始信息流。
- **影响分析** — 用白话说明这件事对你的工作意味着什么。
- **推荐行动** — 可执行的下一步（可选实验与结果追踪）。

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

MIT — see [LICENSE](LICENSE).

## Star History

GitHub 于 2026 限制了公开 stargazer API，多数仓库上的 `api.star-history.com` 徽章已不可用。本图由 [`.github/workflows/star-history.yml`](.github/workflows/star-history.yml) 生成并提交进仓库。

<!-- star-history:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/star-history/star-history-dark.svg">
  <img alt="Star history" src="assets/star-history/star-history-light.svg">
</picture>
<!-- star-history:end -->
