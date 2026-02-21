# Proposal: Discord bot 改為 create-chat 建立乾淨 Thread，取代 prompt 指令

## Why

目前 `/prompt` 會直接建立 Thread，且 thread 的 title 來自 prompt 內容（截斷至 100 字），導致 prompt 寫太長時 title 過長、語意也不適合作為討論串標題。改為使用「建立聊天」流程：先以必填的 title、選填的 workspace 與 model 建立一個乾淨的 Thread，建立後顯示使用的 model 與 workspace，使用者即可在該 Thread 內與 AI 互動。這樣討論串標題可控、語意清楚，且 prompt 指令可被此流程取代。

## What Changes

- 新增 slash command `/create-chat`（或等效名稱）：
  - **title**（必填）：討論串標題，不再綁定 prompt 內容。
  - **workspace**（選填）：工作目錄。
  - **model**（選填）：使用的模型。
- 建立 Thread 後，透過 relay 的 create-chat（或等同能力）建立 session，並在 Thread 內顯示使用的 **model** 與 **workspace**。
- 後續在該 Thread 的互動與現有 follow-up 行為一致（resume session、stream、rate limit 等）。
- **BREAKING**：移除 `/prompt` 指令；改由 `/create-chat` 建立 Thread，使用者在此 Thread 發送的第一則（及後續）訊息作為與 AI 的對話內容。

## Capabilities

### New Capabilities

- 無（本次僅修改既有 platform-discord 行為與需求）。

### Modified Capabilities

- **platform-discord**：將「Prompt command and thread isolation」改為「Create-chat command and thread isolation」— 改為以 title/workspace/model 建立乾淨 Thread、建立後顯示 model 與 workspace、在 Thread 內與 AI 互動；移除以 prompt 為標題的 `/prompt` 指令需求。

## Impact

- **apps/discord-bot**：註冊新指令（create-chat）、移除 prompt 指令；handlePrompt 改為 handleCreateChat（建立 Thread → 呼叫 create-chat → 顯示 model/workspace → 依賴既有 thread follow-up 邏輯）。
- **packages/provider（cursor-cli）**：若尚未支援「僅建立 session、不帶初始 prompt」的 create-chat，需新增或調整 API。
- **packages/core**：若 relay 介面需區分「runStream 從頭帶 prompt」與「create-chat 只建立 session」，可能需擴充型別或介面。
- **openspec/specs/platform-discord**：對應需求與情境改寫（create-chat 情境、移除 /prompt 情境）。
