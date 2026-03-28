## 1. 實作 GeminiProvider 與 CopilotProvider

- [x] 1.1 建立 `apps/desktop/src-tauri/src/providers/gemini.rs` 並實作 `CliProvider` Trait 以支援 **Execute via Gemini CLI**。
- [x] 1.2 建立 `apps/desktop/src-tauri/src/providers/copilot.rs` 並實作 `CliProvider` Trait 以支援 **Execute via GitHub CLI Copilot**。
- [x] 1.3 在 `GeminiProvider` 中實作 **Availability check**，確認 `gemini` 指令是否可用。
- [x] 1.4 在 `CopilotProvider` 中實作 **Authentication and availability**，確認 `gh` 與 `copilot` 擴展是否可用。

## 2. 解析與分派邏輯

- [x] 2.1 在 `GeminiProvider` 中實作 **Output format support**，解析 `stream-json` 格式。
- [x] 2.2 在 `CopilotProvider` 中實作 **Output parsing and fallback** 與 **解析 gh copilot 輸出**，處理 JSON 與純文字輸出。
- [x] 2.3 修改 `apps/desktop/src-tauri/src/providers/mod.rs` 以匯出新的 Provider 並完成 **動態註冊與分派**。
- [x] 2.4 修改 `apps/desktop/src-tauri/src/lib.rs` 的 `run_cli_relay` 命令，根據參數選擇正確的 Provider。

## 3. 驗證與測試

- [x] 3.1 驗證 `gemini` Provider 能正確啟動進程並回傳串流事件。
- [x] 3.2 驗證 `copilot` Provider 能正確處理 `gh copilot` 的輸出並回傳結果。
