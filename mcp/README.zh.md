# MCP 边车

AI Radar 的本地 **stdio** MCP 服务。通过 loopback 调用后端 REST API（默认 `http://127.0.0.1:8080`）。边车本身不需要云端 API Key。

[English](README.md)

完整工具表、示例与错误码见：[docs/mcp.md](../docs/mcp.md)。

## 目录结构

| 文件 | 作用 |
| --- | --- |
| `server.mjs` | MCP stdio 入口（`ai-radar-mcp` bin） |
| `errors.mjs` | 工具错误 JSON（`error` / `hint` / `fix[]`） |
| `package.json` | 包元数据 + `@modelcontextprotocol/sdk` |

## 前置条件

- **Node 20.19+**
- 后端可达（例如 `./install.sh`，或 `cd backend && ./mvnw spring-boot:run`）

## 安装与运行

```bash
cd mcp
npm install
node --check server.mjs
node server.mjs
# 或：npx ai-radar-mcp
```

## 环境变量

| 变量 | 默认 | 含义 |
| --- | --- | --- |
| `AI_RADAR_BASE_URL` | `http://127.0.0.1:8080` | 后端 base URL |
| `LOCAL_TOKEN` | 空 | 后端需要时作为 `X-Local-Token` 发送 |
| `ALLOW_WRITES` | `false` | 为 `true` 时注册 `run_fetch` / `run_push` / `run_cluster` |
| `AI_RADAR_TIMEOUT_MS` | 读请求 `8000`；任务无超时 | 与 CLI 一致；详见 [docs/mcp.md](../docs/mcp.md) |

除非明确希望 Agent 触发流水线任务，否则建议保持 **只读**（`ALLOW_WRITES=false`）。

## Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "ai-radar": {
      "command": "node",
      "args": ["/ABS/PATH/ai-radar/mcp/server.mjs"],
      "env": {
        "AI_RADAR_BASE_URL": "http://127.0.0.1:8080",
        "LOCAL_TOKEN": "",
        "ALLOW_WRITES": "false"
      }
    }
  }
}
```

将 `/ABS/PATH/ai-radar` 替换为你的仓库绝对路径。

## 工具（概览）

**只读**（始终注册）：如 `get_health`、`probe_llm`、`get_intelligence_home`、`list_events`、`list_sources`、`list_connectors`、…

**写入**（仅当 `ALLOW_WRITES=true`）：`run_fetch`、`run_push`、`run_cluster`

完整列表与参数：[docs/mcp.md](../docs/mcp.md#tools)。

## 安全

- 仅对接 **loopback**；不要把该进程暴露到公网接口。
- 除非信任 MCP 客户端，否则保持 `ALLOW_WRITES=false`。
- 若后端配置了 `LOCAL_TOKEN`，此处使用相同值。

## 相关文档

- [docs/mcp.md](../docs/mcp.md) · [docs/cli.md](../docs/cli.md) · [docs/agents.md](../docs/agents.md) · [SKILL.md](../SKILL.md)
