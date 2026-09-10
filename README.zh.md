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

**技术栈：** Java 21 · Spring Boot 3 · SQLite · React/Vite/Tailwind · OpenAI 兼容 LLM（默认本地 Ollama）

## 演示

![AI Radar 情报首页](assets/demo/intelligence-home.png)

- **变了什么** — 今天 AI 世界真正重要的变化是什么？
- **为何关心** — 这件事为什么和你的项目 / 技术栈有关？
- **做什么** — 你下一步应该做什么？

### 完整路径

1. 在设置 / Context 里填写角色、项目与技术栈，并选择**主语言**（中文或英文）。
2. 触发一次抓取 — Feed 会在**每条新闻评分并摘要完成后立刻出现**，无需等整批结束。
3. 阅读 AI 一句话总结；点「不感兴趣」或「收藏」，系统会沉淀喜欢 / 不喜欢关键词。
4. 打开变化查看 **Impact**，或在 **Actions** 里跟进下一步（收藏也可能触发行动建议）。
5. 在 **AI 监控** 查看分析队列进度，以及本地 Ollama 的流式输入输出。

## 为什么选择 AI Radar

大多数 AI 资讯是噪音。AI Radar 用你的上下文过滤噪音，只留下值得关注的变化，并告诉你该怎么做。

## 工作方式

```text
你的 Context → 信号 → 逐条评分与摘要 → 影响 → 行动
```

## 快速开始

```bash
git clone https://github.com/sunliangcode/ai-radar.git
cd ai-radar
./install.sh
```

打开 [http://localhost:8080](http://localhost:8080)。

停止由 `install.sh` 拉起的后台进程：

```bash
./stop.sh
```

Docker、开发模式、环境变量与推送渠道见：[docs/installation.md](docs/installation.md)。

## 核心能力

- **个人 Context** — 画像、项目与技术栈，相关性围绕「你」，而不是全球热榜。
- **主语言** — 摘要与展示标题支持中文 / 英文；有 AI 时英文源会按主语言本地化。
- **实时 Feed** — 每条一句话 AI 总结；分析完一条就能在列表里看到一条。
- **喜欢 / 不喜欢关键词** — 收藏或不感兴趣会写入偏好短语，可在设置中增删。
- **变化发现** — 重要外部变化，而不是无尽原始信息流。
- **影响分析** — 用白话说明这件事对你的工作意味着什么。
- **推荐行动** — 待办式 checklist；收藏后可由 LLM 判断是否值得生成下一步。
- **AI 监控** — 队列进度（总数 / 已处理 / 剩余、每条请求数）+ 本地 Ollama 流式 I/O。

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
