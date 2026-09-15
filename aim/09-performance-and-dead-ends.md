# 步骤 09 — 性能与「死胡同」体验

## 目标

让页面更快出首屏、让「空 / 出错」时用户永远有下一步可点。不加新功能，只消除摩擦。

## 问题清单（本轮实测）

| 问题 | 影响 | 方案 |
| --- | --- | --- |
| 前端打成单个 640KB chunk | 首屏加载慢，所有路由一次下载 | 路由级 `React.lazy` + `Suspense` 拆包 |
| `vite.config.ts` 用 `__dirname` | 每次 build 报警告，未来 Vite 默认 loader 不再支持 | 改用 `import.meta.dirname` |
| Feed 页无源时「立即更新」是死胡同 | 点了没反应，用户卡住 | 无源时主操作改为「添加情报源」，有源时才显示「立即更新」 |
| `api.request` 网络失败抛 `Failed to fetch` | 后端未起/网络断时，报错不可读 | 捕获 fetch 异常，抛带 `code=network` 的 `ApiError`，UI 用本地化文案 |

## 交付物

1. 路由级拆包（`Suspense` 回退态）
2. Vite 配置去 `__dirname` 警告
3. Feed 空态按「有无源」分流
4. `api.request` 网络错误 → 本地化提示

## 任务清单

- [x] `App.tsx` 路由 `React.lazy` + `Suspense`，含轻量回退
- [x] `vite.config.ts` `import.meta.dirname`
- [x] `FeedPage` 空态：无源 → 「添加情报源」链接；有源 → 「立即更新」（页头主操作同样分流）
- [x] `api.ts` 捕获 fetch 异常抛 `ApiError(0, 'network', …)`；新增 `common.networkError` zh/en 文案；共享错误渲染统一走 `lib/errors.ts#errorText`
- [x] `CHANGELOG.md`、`AGENTS.md` 同步

## 验收

- [x] `cd frontend && npm run build` 无 `__dirname` 警告，产物拆分为多个 chunk（主 chunk 显著缩小）
- [x] `cd frontend && npm run test`、`npm run lint` 通过
- [x] `cd backend && ./mvnw -B test` 通过
- [x] 无源时 Feed 空态给出「添加情报源」入口；有源时仍为「立即更新」
- [x] 后端未起时（dev 模式）错误提示为本地化「无法连接服务」，不再是 `Failed to fetch`

## 明确不做

- 不引入 SSR / 预渲染
- 不做 service worker / PWA 离线
- 不改打包器（保持 Vite）

## 状态

**已完成（本轮）**
