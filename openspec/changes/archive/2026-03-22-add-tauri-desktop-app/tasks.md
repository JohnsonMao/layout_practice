## 1. 專案環境初始化

- [x] 1.1 執行 **Decision: 目錄結構與 Framework 選擇**：更新 `pnpm-workspace.yaml` 以納入 `apps/desktop` 路徑（已完成部分）
- [x] 1.2 更新 `turbo.json` 增加 `tauri` 開發與構建任務配置
- [x] 1.3 建立 `apps/desktop` 目錄並初始化 Vite + React + TypeScript 前端基礎

## 2. Tauri 基礎建設 (Desktop Shell)

- [x] 2.1 初始化 `apps/desktop/src-tauri` 並配置基礎 Rust 依賴 (tauri, specta)
- [x] 2.2 實作 **Cross-Platform Window Management**：配置 `tauri.conf.json` 定義主視窗屬性
- [x] 2.3 實作 **System Tray Integration**：在 Rust 中建立系統托盤選單與後台執行邏輯
- [x] 2.4 實作 **Native Menu Support**：定義 OS 原生菜單（File/Edit/View）及其事件處理機制

## 3. IPC 橋接與型別同步 (Desktop IPC Bridge)

- [x] 3.1 執行 **Decision: 型別同步工具 (Specta)**：配置 `specta` 並建立導出腳本將 Rust 型別輸出至 `apps/desktop/src/types/generated.ts`
- [x] 3.2 實作 **Automated Type Synchronization**：確保 Rust 資料結構標註正確並能自動生成 TS 型別
- [x] 3.3 實作 **Command Invocation Bridge**：在 Rust 中定義基礎 Command 範例，並在 TS 側封裝 `invoke` 調用邏輯
- [x] 3.4 實作 **Event Streaming Bridge**：建立從 Rust 到 TS 的事件發送機制（emit/listen）以支援串流數據

## 4. 前端開發與整合

- [x] 4.1 執行 **Decision: Monorepo 依賴關係**：在 `apps/desktop/package.json` 中配置 `workspace:*` 依賴以引用 `packages/core`
- [x] 4.2 建立基礎的 React 佈局（Layouts）並整合 `packages/core` 的型別定義
- [x] 4.3 實作桌面端的導航與狀態顯示 UI

## 5. 驗證與發布

- [x] 5.1 執行本地開發模式驗證視窗、選單與 IPC 通訊是否正常
- [x] 5.2 執行 Tauri 構建任務確保二進制文件可正確打包
- [x] 5.3 驗證生成的 TypeScript 型別是否正確對應 Rust 資料結構
