# Proposal: agent-relay

## Why

開發者希望在任何環境（例如 Discord、Slack）都能觸發與維繫 AI 輔助編碼流程，而不是只能守在單一 IDE。現有 AI 工具（Cursor、Copilot、Claude Code 等）多綁在本地或特定介面，缺乏統一、可從聊天平台驅動的橋接。本專案建立「agent-relay」：透過各平台介面與各 AI 提供商的 SDK/CLI 串接，實現「到處都能 AI Vibe Coding」。優先以 **Discord + Cursor CLI** 驗證端到端流程，再擴充其他平台與提供商。

## What Changes

- **Phase 1（本變更優先範圍）**
  - 新增 **Discord 平台整合**：Discord bot 可接收指令、觸發 AI 任務、回傳結果到頻道或 DM。
  - 新增 **Cursor CLI 提供商**：透過 Cursor 提供的 CLI/SDK 執行編輯、補全、對話等能力，並將結果回傳給 relay。
  - 新增 **core 協定與 relay 核心**：定義「平台 → relay → 提供商」的請求/回應格式與執行流程，供後續 Slack、其他 AI 提供商擴充。
- **後續（本 proposal 僅標註，不納入本次 spec 細化）**
  - Slack 平台、Copilot/Claude Code 等其他提供商將在後續 change 或同一 repo 的後續 artifacts 中處理。

## Capabilities

### New Capabilities

- `core-relay`: 請求/回應協定、任務排程、提供商與平台的抽象介面；relay 核心邏輯。
- `provider-cursor-cli`: 整合 Cursor CLI/SDK，執行 AI 編碼操作並回傳結構化結果給 relay。
- `platform-discord`（實作於 `apps/discord-bot`）：Discord bot 註冊指令、接收訊息、呼叫 relay、將結果回傳至 Discord（頻道/DM）。

### Modified Capabilities

- （無既有 spec，留空）

## Impact

- **程式與架構**：TypeScript monorepo（pnpm workspace + Turborepo），預計新增 `packages/core`、`packages/provider/cursor-cli`、`apps/discord-bot`（Discord 平台整合），與 root 的 `turbo.json` / `pnpm-workspace.yaml` 對齊。
- **依賴**：Discord 官方 SDK（discord.js 或類似）、Cursor 官方 CLI/SDK（依其公開 API 選型）、Node 20.x。
- **對外**：Phase 1 僅影響本 monorepo；無對現有對外 API 或服務的 breaking 變更。
