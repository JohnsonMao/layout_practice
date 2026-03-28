## Why

目前 Desktop App 僅完整實作了 `CursorProvider` (對應 `cursor` 或 `agent` CLI)。為了讓使用者能直接在桌面端利用已安裝的 `gemini` 與 `gh copilot` 命令行工具，需要實作對應的 Rust Provider 並整合至 `CliProvider` 架構中。

## What Changes

- 新增 `apps/desktop/src-tauri/src/providers/gemini.rs`: 實作 `CliProvider` 以支援 `gemini` CLI。
- 新增 `apps/desktop/src-tauri/src/providers/copilot.rs`: 實作 `CliProvider` 以支援 `gh copilot` CLI。
- 修改 `apps/desktop/src-tauri/src/providers/mod.rs`: 導出並註冊新的 Provider。
- 修改 `apps/desktop/src-tauri/src/lib.rs`: 在 `run_cli_relay` 命令中支援切換至 `gemini` 與 `copilot`。

## Capabilities

### New Capabilities

- `provider-gemini-cli`: 封裝 `gemini` CLI 工具，支援 `-p` 提示與 `--output-format stream-json` 輸出解析。
- `provider-copilot-cli`: 封裝 `gh copilot` CLI 工具，解析其建議或對話輸出並轉換為 `RelayEvent`。

### Modified Capabilities

(none)

## Impact

- **Affected code**:
  - `apps/desktop/src-tauri/src/providers/mod.rs`
  - `apps/desktop/src-tauri/src/providers/gemini.rs` (new)
  - `apps/desktop/src-tauri/src/providers/copilot.rs` (new)
  - `apps/desktop/src-tauri/src/lib.rs`
- **Dependencies**: 需確保系統已安裝 `gemini` 與 `gh` (含 `copilot` 擴展) CLI。
