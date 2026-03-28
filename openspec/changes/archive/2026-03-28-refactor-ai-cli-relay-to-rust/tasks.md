## 1. 基礎架構與依賴設定

- [x] 1.1 在 `apps/desktop/src-tauri/Cargo.toml` 中新增 `tokio`, `serde`, `serde_json`, `async-trait` 依賴。
- [x] 1.2 建立 `apps/desktop/src-tauri/src/providers/mod.rs` 並實作 `Modular Provider Architecture` 與 `使用 Trait 定義抽象 Provider`。
- [x] 1.3 在 `providers/mod.rs` 中定義 `Unified Stream Protocol` 所需的 `RelayEvent` 列舉。

## 2. Provider 實作 (Rust)

- [x] 2.1 建立 `apps/desktop/src-tauri/src/providers/cursor.rs` 並實作 `Rust Implementation Support` 的 `CursorProvider`。
- [x] 2.2 在 `CursorProvider` 中實作 `Execute via Cursor CLI non-interactive mode` 的參數建構邏輯。
- [x] 2.3 實作 `Streaming execution` 邏輯，解析 NDJSON 並轉換為 `RelayEvent`。

## 3. 執行引擎與 IPC 橋接

- [x] 3.1 建立 `apps/desktop/src-tauri/src/engine.rs` 處理 `Process Lifecycle Management` 並實施 `使用 Tokio Process 進行進程管理`。
- [x] 3.2 在 `engine.rs` 中實作基於 `Tokio Process 進行進程管理` 的非同步 IO 讀取。
- [x] 3.3 更新 `apps/desktop/src-tauri/src/lib.rs` 以實作 `Command Invocation Bridge` 中的 `run_cli_relay` 命令。
- [x] 3.4 在 `lib.rs` 實施 `基於 Tauri Window Event 的串流回傳` 與 `Event Streaming Bridge`，透過 `window.emit` 發送 `Relay Stream Events`。

## 4. 前端整合與驗證

- [x] 4.1 更新 `apps/desktop/src/App.tsx` 以調用 `run_cli_relay` 並監聽 `relay-event`。
- [x] 4.2 驗證 `Successful execution` 與 `CLI not found` 等情境。
- [x] 4.3 確保 `Automated Type Synchronization` 正常運作，產生對應的 TypeScript 型別。
