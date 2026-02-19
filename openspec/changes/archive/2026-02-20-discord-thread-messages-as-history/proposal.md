# Proposal: Discord thread follow-up via Cursor resume session

## Goals

- Follow-up 訊息改為透過 Cursor CLI 的 **resume session** 接續對話，不再把過往對話當成 prompt 傳給 Cursor。
- 僅對「**本服務 Discord bot**」所建立或擁有的 thread 處理 follow-up，不與其他 bot 的 thread 混淆。
- 首次在 thread 完成 /prompt 後，儲存該 thread 與 Cursor session 的對應（threadId ↔ sessionId），供後續 follow-up 使用 `--resume`。

## Non-Goals

- 不在 prompt 中傳遞或重建完整對話歷史；歷史由 Cursor 端 session 負責。
- 不將 sessionId 寫入 Discord thread 內容或 metadata（僅在 bot 端儲存對應關係，除非未來另有需求）。
- 不變更非 Discord 的 platform 或非 cursor-cli 的 provider 行為。

## Why

目前 follow-up 是將 thread 的 in-memory 對話歷史組成一則長 prompt 再送給 relay，既佔 token 又與 Cursor 自身的 session 脫節。改用 Cursor CLI 的 **resume session** 接續對話，可讓上下文完全由 Cursor 端維護，我們只需在首次完成 /prompt 時取得並儲存 `session_id`，後續在該 thread 的訊息改為以 `--resume <sessionId>` 送出即可。同時，同一伺服器可能有多個 bot，必須明確只對「本應用程式 bot」建立或擁有的 thread 做 follow-up，避免誤處理其他服務的 thread。

## What Changes

- **Follow-up 改用 resume**：在已有對應 session 的 thread 中，使用者發送一般訊息時，改為以「resume 該 thread 的 session + 新訊息」呼叫 relay，不再組「Previous conversation: …」的 prompt。
- **辨識本 bot 的 thread**：僅當 thread 由本 bot（與當前 `client.user.id` 一致）建立或擁有時，才視為可 follow-up 的 workspace；實作上以 Discord API 的 thread 擁有者／首則訊息作者與本 bot 比對。
- **儲存 threadId ↔ sessionId（持久化）**：首次在 thread 內完成 /prompt 且 stream 回傳 `session_id` 時，將該 thread 與 sessionId 的對應寫入 **SQLite**，使 bot 重開機後仍可 resume；供 follow-up 時查詢並傳入 relay/provider。
- **Relay / provider 支援 resume**：relay 請求需能帶入可選的 sessionId；cursor-cli provider 在有 sessionId 時改為以 `--resume <sessionId>` + 新訊息呼叫 CLI，並在首次執行時從 stream 解析出 `session_id` 回傳給上層。
- **移除依賴 in-memory 對話歷史的 follow-up 邏輯**：不再依賴「thread 內建歷史」組 prompt；thread 是否可 follow-up 改由 SQLite 內是否有該 thread 的 session 紀錄判斷，不再用於組裝送給 Cursor 的歷史文字。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- **platform-discord**: Follow-up 改為使用 Cursor resume session（不傳歷史）；僅對「本 bot」建立或擁有的 thread 處理 follow-up；首次完成 /prompt 後儲存 threadId ↔ sessionId，並在後續 follow-up 使用該 session。

## Impact

- **apps/discord-bot**：`index.ts`（辨識本 bot thread、follow-up 時傳 sessionId）、thread–session 對應改為 **SQLite** 持久化（新建例如 `thread-session-store.ts` + DB 檔），可移除或簡化 in-memory 對話歷史與 thread-workspace 用於 prompt 的邏輯。
- **packages/core**：RelayRequest 或 StreamChunk 需支援可選的 sessionId（或等效欄位），以便 Discord 傳入、provider 使用。
- **packages/provider/cursor-cli**：從 stream-json 解析並回傳 `session_id`；執行時若收到 sessionId 則改為 `--resume <sessionId>` + 新訊息，而非僅 `-p "<prompt>"`。
- **openspec/specs/platform-discord**：需更新 delta spec，反映上述 follow-up 與 thread 歸屬之行為。
