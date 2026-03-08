## 1. 核心型別遷移與介面更新 (Core Composition)

- [x] 1.1 執行 `Core Type Consolidation`：將 `RelayContext` 等型別搬移至 `packages/core`
- [x] 1.2 執行 `Dependency Injection for Platforms`：更新 `Platform.init(ctx)` 介面
- [x] 1.3 執行 `Removal of Workspace Path Management`：從核心與平台中移除 workspace 路徑邏輯

## 2. 實作組合根 (Composition Root in relay-service)

- [x] 2.1 實作 `Single Composition Root: apps/relay-service`：整合所有 Provider 與 Platform
- [x] 2.2 實作 `Unified Environment-Driven Tree-shaking`：在 `tsup.config.ts` 中從 `.env` 讀取配置
- [x] 2.3 驗證 `relay-service` 能正確執行多平台編排與啟動

## 3. 清理與移除 (Cleanup)

- [x] 3.1 徹底執行 `Removal of Redundant Packages and Apps`：刪除 `packages/relay-context`、`apps/discord-bot`、`apps/github-bot`
- [x] 3.2 清理 `pnpm-workspace.yaml` 與全局相依性

## 4. 驗證與文件

- [x] 4.1 驗證全系統建置成功 (pnpm build)
- [x] 4.2 更新 `README.md` 與 `.env.example` 反映極簡架構
