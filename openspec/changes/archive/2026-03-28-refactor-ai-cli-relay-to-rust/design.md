## Context

目前桌面應用程式透過 `packages/provider/cursor-cli` 與 Cursor 互動，該 package 是 TypeScript 實作。在 Tauri 環境中，這要求使用者機器必須安裝 Node.js 且開發者需處理 child_process 的 JS 封裝。為了追求更高的效能與更純粹的二進位部署，我們決定在 Rust 後端重構這套轉發邏輯。

## Goals / Non-Goals

**Goals:**

- 建立一個抽象的 Rust `CliProvider` Trait。
- 實作 `CursorProvider` 以替代現有的 TypeScript 實作。
- 提供異步、串流式的 IPC 通訊（Tauri Event）。
- 支援多個 CLI 工具的併發執行管理。

**Non-Goals:**

- 移除 `packages/provider/cursor-cli`（其他 Node.js 平台如 Discord Bot 仍需使用它）。
- 在 Rust 中重新實作 LLM 邏輯（僅作為 CLI 的 Proxy/Relay）。

## Decisions

### 使用 Trait 定義抽象 Provider
為了支援未來的 `copilot-cli` 或 `claude-code-cli`，我們定義了 `CliProvider` Trait。這讓 `engine.rs` 能夠以統一的方式處理進程生成與輸出解析。

### 基於 Tauri Window Event 的串流回傳
由於 `invoke` 預設是 Request-Response 模式，對於長時間運行的 AI 回覆並不友善。我們決定在 Rust 端使用 `window.emit` 發送 `RelayEvent`，讓前端能即時渲染文字。

### 使用 Tokio Process 進行進程管理
選用 `tokio::process::Command` 而非標準庫的 `std::process`，以確保進程執行不會阻塞 Tauri 的主執行緒，並能妥善處理非同步的 `stdout` 讀取。

## Risks / Trade-offs

- **[Risk] PATH 找不到二進位檔案** → **[Mitigation]** 實作 `check_availability` 並在啟動前通知前端引導使用者安裝。
- **[Trade-off] 程式碼重疊** → 雖然與 TypeScript 的 `cursor-cli` 邏輯有部分重複，但為了桌面端效能與去 Node.js 化，這份維護成本是值得的。
- **[Risk] 串流 JSON 解析失敗** → **[Mitigation]** 使用強型別的 `serde` 進行解析，並在解析失敗時回傳特定的 `Error` 事件而非直接崩潰。
