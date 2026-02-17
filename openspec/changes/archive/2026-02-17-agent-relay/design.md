# Design: agent-relay（Phase 1: Discord + Cursor CLI）

## Context

- **現狀**：monorepo 已有 root 設定（pnpm workspace、Turborepo），`package.json` 預留 `dev:discord`、`deploy:discord` 等 script；尚未有 `apps/` 或 `packages/` 實作。
- **約束**：TypeScript、Node 20.x、pnpm 10.x；遵循 workspace 既有的 `turbo.json` 與 `pnpm-workspace.yaml`（apps/*, packages/core, packages/provider/*）。
- **利害關係**：開發者透過 Discord 下指令，由 relay 呼叫 Cursor CLI，並將結果回傳至 Discord。

## Goals / Non-Goals

**Goals:**

- 實作「Discord → relay → Cursor CLI」端到端流程：Discord 指令觸發、relay 組裝請求、呼叫 Cursor CLI、解析輸出、回傳 Discord。
- 定義 core 協定（請求/回應格式、錯誤碼），使後續 Slack、其他 AI 提供商可重用。
- 將 Cursor CLI 封裝為單一 provider 套件，對 core 暴露統一介面。

**Non-Goals:**

- Slack、Copilot、Claude Code 等不在本設計實作範圍。
- 不實作 Cursor 的互動式 session 或 Cloud Agent handoff；僅使用 non-interactive（`agent -p "..."`）模式。
- 不處理 Cursor 帳號/API key 的取得流程（假設由環境變數或設定提供）。

## Decisions

### 1. Cursor 整合方式：CLI 子行程 vs 官方 SDK

- **選擇**：以 **CLI 子行程** 呼叫 `agent -p "<prompt>" --output-format json`（或 text，再解析）。
- **理由**：Cursor 官方文件以 CLI 為主；`--output-format json` 適合程式解析。若日後提供 Node SDK，可在同一 provider 內替換實作，介面不變。
- **替代**：直接使用 Cursor Cloud Agents API（需確認是否涵蓋「從外部觸發 agent 並取回結果」）；目前以 CLI 可達標且文件明確。

### 2. Relay 與平台/提供商的邊界

- **選擇**：**core** 只定義「型別 + 介面」與一層薄協調（接受平台請求、呼叫 provider、回傳）。Discord 整合放在 app（`apps/discord-bot`），提供商（cursor-cli）為獨立 package，皆依賴 core。
- **理由**：符合 monorepo 邊界、易於後續加 Slack 或新 provider；平台邏輯在 app 內即可，無需額外 `packages/platform`。
- **依賴方向**：`apps/discord-bot` → `packages/core`；`provider-cursor-cli` → `packages/core`；core 不依賴任何 app 或 provider。

### 3. Discord 觸發方式

- **選擇**：**Slash commands** 為主（例如 `/ask <prompt>`、`/agent <prompt>`），可選支援一般訊息 @bot 觸發以利快速測試。
- **理由**：Slash 有結構化參數、權限與說明，較易維護；訊息觸發可作為後續擴充。
- **部署**：使用 root 既有 `deploy:discord` 對應的 `deploy-commands` task 註冊 slash commands。

### 4. 請求/回應與錯誤協定（core）

- **選擇**：core 定義 TypeScript 型別與介面：
  - **RelayRequest**：`{ prompt, options?: { model?, mode? } }`
  - **RelayResponse**：`{ success, result?: string, error?: { code, message } }`
  - **Provider 介面**：`execute(request: RelayRequest): Promise<RelayResponse>`
- **理由**：簡單、可序列化、易於從 Discord 參數組裝並回傳給使用者；錯誤碼利於 i18n 或後續擴充。

### 5. Cursor CLI 輸出解析

- **選擇**：優先使用 `--output-format json`；若 CLI 版本不支援或輸出非預期，fallback 為擷取 stdout 文字當成單一 `result` 字串。
- **理由**：結構化輸出利於 truncation、摘要或未來擴充；fallback 確保相容性。

### 6. 執行環境與安全

- **選擇**：provider 在 **本機** 執行 `agent` CLI（與 Discord bot 同機或指定 runner 節點）；不假設 Cursor 在遠端 API 可被任意呼叫。
- **理由**：Cursor CLI 設計為本機/已登入環境；Phase 1 不引入遠端 worker 架構。
- **風險**：若 bot 與 CLI 分離部署，需額外設計 queue + worker，留作後續。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| Cursor CLI 輸出格式變更導致解析失敗 | 封裝解析邏輯於 provider、fallback 到 raw text；對輸出做寬鬆解析。 |
| Discord 訊息長度限制（2000 字） | 結果超過時 truncate 並註明「已截斷」或提供 summary；必要時以檔案上傳（後續）。 |
| 長時間任務導致 Discord 逾時 | Phase 1 以「單次請求/單次回應」為主；長時間任務可回傳「已排入」並以 follow-up 訊息補結果（後續）。 |
| Cursor 未安裝或未登入 | 啟動時或首次呼叫時檢查 `agent --version` 或類似；回傳明確錯誤訊息引導使用者。 |

## Migration Plan

- **部署**：依序建置 `packages/core` → `packages/provider/cursor-cli` → `apps/discord-bot`；註冊 Discord slash commands 後啟用 bot。
- **Rollback**：無狀態設計；關閉 bot 或回退部署即可，無資料遷移。

## Open Questions

- Discord bot 的 **token** 與 **Cursor 認證**（API key / 本機登入）的存放方式：環境變數 vs 秘密管理服務（後續可統一）。
- 是否在 Phase 1 支援「選擇 model / mode」的 slash 選項（如 `--model`、`--mode=plan`）：可選實作，不阻塞 MVP。
