# 步骤 07 — 易用性打磨（Usability Pass）

## 目标

降低「新机器 / 新会话」上手成本：少踩隐藏坑、装完能自检、失败时能看懂原因。

本步不加产品大功能，只修**会让用户或 agent 卡住**的点。

## 问题清单（本轮实测）

| 问题 | 影响 | 方案 |
| --- | --- | --- |
| `SourceSeeder.ensureZhihu` 每次启动把 `cliPath` pin 到本机绝对路径，并默认启用 | 其他机器必现 fetch 失败噪音；用户自定义路径会被覆盖 | 仅当 CLI 可执行时默认启用；优先 `ZHIHU_CLI_PATH`；不覆盖用户自定义可用路径 |
| `install.sh` 启动后只提示「等几秒」 | 用户不知道后端是否真正就绪 | 轮询 `/api/health`，失败则指向日志 |
| 缺少一键自检 | 排查要猜端口 / PID / 日志位置 | 新增 `scripts/status.sh` |
| 文档仍写死 Zhihu 本机路径 | 误导贡献者与 agent | 同步 `docs/` + `AGENTS.md` + `CHANGELOG.md` |

## 交付物

1. 可移植的 Zhihu 源种子逻辑 + 单测
2. `scripts/status.sh`
3. `install.sh` 健康等待
4. 文档 / CHANGELOG 同步

## 任务清单

- [x] Zhihu：按可执行文件与 env 决定启用与路径，不盲 pin
- [x] `SourceSeederTest` 覆盖缺失 / 存在 / 不覆盖自定义路径
- [x] `scripts/status.sh`（backend + translate + 日志与 URL）
- [x] `install.sh` 启动后等待 health
- [x] `GET /api/health` 上报 translate 侧车状态
- [x] 更新 `docs/extending-connectors.md`、`docs/sources.md`、`docs/installation.md`、`docs/api.md`、`AGENTS.md`、`CHANGELOG.md`、`README*.md`、`CONTRIBUTING.md`
- [x] 修复 `OPENAI_KEEP_ALIVE` 文档/测试与默认值 `0` 不一致

## 验收

- [x] `cd backend && ./mvnw -Dtest=SourceSeederTest test` 通过
- [x] 无 zhihu CLI 的环境：源存在但 `enabled=false`，无 pin 强制覆盖
- [x] CLI 存在或 `ZHIHU_CLI_PATH` 指向可执行文件：默认启用且路径正确
- [x] `./scripts/status.sh` 在服务未起时给出清晰 down 提示
- [x] 文档不再宣称「总是 pin 到某绝对路径」
- [x] 全量 `./mvnw test` 与 frontend vitest 通过

## 状态

**已完成（本轮）**

## 明确不做

- 不改 Zhihu CLI 协议 / Cookie 登录流程
- 不做 Web 向导式 Setup
- 不引入 Makefile / 重型任务编排
