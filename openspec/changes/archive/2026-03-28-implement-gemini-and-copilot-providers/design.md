## Context

目前 `apps/desktop` 使用 Rust (Tauri) 實作後端，並透過 `CliProvider` Trait 定義了與命令行 AI 工具互動的統一介面。現有的 `CursorProvider` 已成功封裝了 `agent` CLI。本設計旨在擴展此模式，將 `gemini` 與 `gh copilot` 納入支援，使桌面端能調度更多元的 CLI 供應商。

## Goals / Non-Goals

**Goals:**
- 在 Rust 層面實作 `GeminiProvider` 與 `CopilotProvider`。
- 支援 `gemini` CLI 的 `stream-json` 輸出解析。
- 支援 `gh copilot` 的基礎提示與建議輸出解析。
- 在 `run_cli_relay` 命令中動態分派至指定的 Provider。

**Non-Goals:**
- 不涉及 TypeScript 層面 `packages/provider` 的修改。
- 不實作新的 CLI 工具，僅封裝現有工具。
- 不處理 CLI 工具的自動安裝，僅負責偵測其是否存在。

## Decisions

### 1. 實作 GeminiProvider 與 CopilotProvider
- **選擇**: 仿照 `CursorProvider`，在 `src-tauri/src/providers/` 目錄下分別建立 `gemini.rs` 與 `copilot.rs`。
- **理由**: 每個 CLI 的參數結構與輸出格式略有不同，獨立實作能確保解析邏輯的準確性與可維護性。
- **替代方案**: 使用單一的 `GenericCliProvider` 並透過設定檔驅動。雖然擴展性較高，但目前各 CLI 輸出格式（如 `gh copilot` 尚未完全標準化為 NDJSON）差異較大，寫死的實作更為穩健。

### 2. 動態註冊與分派
- **選擇**: 在 `run_cli_relay` 中使用 `match` 語句根據傳入的 `provider` 字串建立對應的實例。
- **理由**: Rust 的 Trait Object (`Box<dyn CliProvider>`) 能很好地處理這種多型需求，且目前的 Provider 數量較少，手動分派清晰易懂。

### 3. 解析 gh copilot 輸出
- **選擇**: 針對 `gh copilot` 的非標準輸出，先嘗試解析為 JSON，若失敗則回退至純文字。
- **理由**: `gh copilot` 的輸出格式可能隨版本變動，回退機制能保證基本的可用性。

## Risks / Trade-offs

- **[Risk] CLI 格式變更** → 導致解析失敗。
  - **Mitigation**: 實作強健的錯誤處理與 fallback 至純文字顯示。
- **[Trade-off] 效能與資源** → 啟動子進程會消耗較多資源。
  - **Mitigation**: 僅在需要時啟動進程，並確保進程結束時正確回收資源。
