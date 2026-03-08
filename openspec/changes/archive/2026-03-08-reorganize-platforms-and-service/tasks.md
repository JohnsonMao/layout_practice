## 1. 基礎架構與 Package 建立

- [x] 1.1 建立 `packages/platform/base` 定義 `Shared Platform Interface` (init, start, stop)
- [x] 1.2 在 `pnpm-workspace.yaml` 與 `turbo.json` 中新增 platform 相關配置
- [x] 1.3 執行 `structure: packages/platform/* for logic extraction`：建立 `packages/platform/discord` 並從 `apps/discord-bot` 遷移事件處理邏輯
- [x] 1.4 執行 `structure: packages/platform/* for logic extraction`：建立 `packages/platform/github` 並從 `apps/github-bot` 遷移 webhook 邏輯

## 2. 統一服務實作 (relay-service)

- [x] 2.1 執行 `unified entry point: apps/relay-service`：建立專案結構與 `package.json`
- [x] 2.2 實作 `Configuration-driven platform loading`：依據 `RELAY_PLATFORMS` 動態載入平台套件
- [x] 2.3 實作 `Unified service entry point`：整合各平台的生命週期管理與啟動邏輯
- [x] 2.4 實作 `Graceful startup and failure`：處理配置缺失與啟動錯誤的 Fail-fast 機制
- [x] 2.5 在 `apps/relay-service` 的 `tsup.config.ts` 中加入 `build-time flags for tree-shaking`

## 3. 測試與驗證

- [x] 3.1 驗證 `platform-discord` 遷移後的指令與 Relay 功能正常
- [x] 3.2 驗證 `platform-github` 遷移後的 Webhook 觸發功能正常
- [x] 3.3 撰寫整合測試驗證 `relay-service` 同時啟動多個平台的情境
- [x] 3.4 驗證 `apps/relay-service` 的 Tree-shaking 效果與 Bundle Size

## 4. 清理與文件

- [x] 4.1 移除或簡化 `apps/discord-bot` 與 `apps/github-bot` 的重複代碼
- [x] 4.2 更新 `README.md` 說明如何使用 `apps/relay-service` 啟動服務
