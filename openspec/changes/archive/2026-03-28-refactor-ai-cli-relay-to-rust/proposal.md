## Why

當前 `cursor-cli` provider 是由 TypeScript 實作並運行於 Node.js 環境。這增加了桌面應用程式（Tauri）對 Node.js 執行環境的依賴。為了簡化桌面端的部署、提升串流效能並建立一個通用的 AI CLI 轉發架構，我們需要將此邏輯遷移至 Rust 後端。

## What Changes

- **Rust Provider 框架**: 在 Tauri 後端實作通用的 `CliProvider` Trait 與 `RelayEvent` 協議。
- **Cursor CLI 遷移**: 將 `cursor-cli` 的呼叫、串流解析（NDJSON）與生命週期管理從 TypeScript 遷移至 Rust。
- **統一串流協議**: 定義前端與 Rust 後端通訊的標準事件格式（Text, System, ToolCall, Error, Done）。
- **桌面端 IPC 更新**: 更新 Tauri 的 `invoke_handler` 以支援新的 `run_cli_relay` 命令。

## Capabilities

### New Capabilities

- `desktop-rust-relay`: 定義 Rust 後端作為 AI CLI 轉發器的通訊協議與架構規範。

### Modified Capabilities

- `provider-cursor-cli`: 修改 Cursor CLI 的提供方式，從 TypeScript Node.js 實作轉向 Rust Native 實作。
- `desktop-ipc-bridge`: 更新桌面端 IPC 橋接規範，以支援新的 Rust 串流命令。

## Impact

- **Affected code**: 
    - `apps/desktop/src-tauri/src/providers/` (New)
    - `apps/desktop/src-tauri/src/engine.rs` (New)
    - `apps/desktop/src-tauri/src/lib.rs` (Updated)
    - `apps/desktop/src/App.tsx` (Updated to call Rust command)
- **Dependencies**: 新增 `tokio`, `serde`, `serde_json`, `async-trait` 到桌面端 Rust 依賴。
- **Systems**: 減少了桌面應用程式對本地 Node.js/pnpm 環境的依賴（僅需 CLI 二進位檔案存在）。
