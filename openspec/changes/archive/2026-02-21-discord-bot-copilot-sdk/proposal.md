# Proposal: Discord bot 串接 Copilot SDK

## Goals

- 讓 Discord 用戶在 thread 內透過 bot 使用 GitHub Copilot Agent 能力（規劃、工具呼叫、串流回應等），無需自建 orchestration。
- 在既有 agent-relay 架構下，將 Copilot SDK 作為可選的 agent runtime，與現有 provider（如 cursor-cli）並存。

## Non-Goals

- 不取代既有 cursor-cli provider；兩者可依配置並存。
- 不在此 change 內實作 Slack 或其他平台的 Copilot SDK 串接。
- 不實作 BYOK 或進階認證流程的完整 UI；僅支援環境變數或既有配置方式。

## Why

Discord bot 目前透過 core relay 與單一 provider（如 Cursor CLI）互動。引入 [GitHub Copilot SDK](https://github.com/github/copilot-sdk) 可讓用戶在 Discord 內直接使用 Copilot 的 agent 工作流（規劃、工具呼叫、檔案編輯等），由 SDK 與 Copilot CLI（server mode）通訊，我們不需自建 agent 編排邏輯。現在做是因為 SDK 提供 Node/TypeScript 支援且以 JSON-RPC 與 CLI 通訊，易於整合進現有 TypeScript 與 thread-session 架構。

## What Changes

- 在 `apps/discord-bot` 新增依賴 `@github/copilot-sdk`。
- 新增「Copilot SDK」作為可選的 provider/backend：當配置指向 Copilot 時，create-chat 與 thread 內訊息改為經由 SDK 呼叫 Copilot CLI（或既有 server），並將串流/結果回傳至 Discord。
- 管理 Copilot CLI 生命週期或連線（依 SDK 建議：自動啟動 CLI server 或連線至既有 server）。
- 認證：支援環境變數（如 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`）或 BYOK 設定，與現有「從環境讀取配置」一致。
- 不變：既有 slash 指令（如 `/create-chat`）、thread 隔離、訊息長度與錯誤處理等行為維持；僅 backend 可切換為 Copilot SDK。

## Capabilities

### New Capabilities

- **copilot-sdk-integration**: 在 Discord 應用中整合 Copilot SDK：建立/管理與 Copilot CLI 的連線、將 thread 會話對應到 SDK session、發送用戶訊息並取得串流或最終結果、錯誤與逾時處理，以及所需環境/認證設定。

### Modified Capabilities

- **platform-discord**: 允許使用 Copilot SDK 作為可選的 agent/chat provider；當配置為 Copilot 時，create-chat 與 thread 內互動改由 Copilot SDK 驅動，其餘平台行為（指令、thread、長度限制、配置讀取）不變。

## Impact

- **程式**：`apps/discord-bot`（依賴、provider 抽象或分支、訊息處理與 session 對應）。
- **依賴**：新增 `@github/copilot-sdk`；執行時需可用的 Copilot CLI（或已啟動的 server）。
- **配置**：新增或沿用與 Copilot 相關的環境變數（如 token、server 位址）。
- **既有行為**：不破壞現有僅使用 cursor-cli 的部署；Copilot 為可選。
