# 步骤 08 — 系统状态可见性（Health in UI）

## 目标

用户不必猜「翻译挂了没 / DB 正常吗 / 该去哪看日志」。在设置页直接看到运行状态，并与 CLI `scripts/status.sh` 对齐。

## 问题

| 问题 | 影响 | 方案 |
| --- | --- | --- |
| `GET /api/health` 已含 translate，但 UI 未展示 | 标题不译时用户不知原因 | Settings Hub 增加 System health 卡片 |
| `api.health` 类型仍是旧字段 | 前端无法安全读 translate | 补齐 TypeScript 类型 |
| 首启 Getting Started 未链到 Context | 个性化路径断层 | 增加 Context 步骤链接 |
| 本地缺少「一键对齐 CI」 | 贡献者验证命令散落 | `scripts/check.sh` |

## 交付物

1. Settings Hub 系统健康卡片（backend / db / translate）
2. 更新 `api.health` 类型与 i18n
3. Today 首启步骤补 Context 链接
4. `scripts/check.sh`（backend test + frontend lint/test/build + mcp syntax）

## 任务清单

- [x] SystemHealthCard + Settings Hub 接入
- [x] api.health 类型与 zh/en 文案
- [x] Today Getting Started 增加 Context 链接
- [x] scripts/check.sh
- [x] CHANGELOG / AGENTS / CONTRIBUTING / installation 同步

## 验收

- [x] 设置页可见 db/translate 状态；translate down 时文案可操作
- [x] 前端 typecheck/build 通过
- [x] 本地已跑 backend 单测 + frontend lint/test/build（`check.sh` 脚本已提供）

## 状态

**已完成（本轮）**

## 明确不做

- 不做实时 WebSocket 健康流
- 不做独立 /status 路由页
