# Design: Discord bot create-chat 取代 prompt

## Context

- **現狀**：Discord bot 註冊 `/prompt`，以 prompt 字串建立 Thread（title = prompt 截斷 100 字），在 Thread 內跑 `relay.runStream({ prompt, workspace, ... })`，stream 回傳 system chunk 時寫入 threadId ↔ sessionId、workspace；後續同 Thread 訊息當作 follow-up，以 sessionId resume。
- **邊界**：apps/discord-bot 依賴 @agent-relay/core（Relay）、@agent-relay/provider-cursor-cli（CursorCliProvider）。Core 只定義 RelayRequest / runStream；provider 已實作 `createChat(workspace?)` 與 `executeStream`（--resume 用 sessionId）。Thread session 存於 SQLite（thread_id, session_id, workspace）。
- **目標**：改為以「建立聊天」為入口：必填 title、選填 workspace/model，建立乾淨 Thread 後顯示 model 與 workspace，再在 Thread 內與 AI 互動；移除 `/prompt`。

## Goals / Non-Goals

**Goals:**

- 新增 `/create-chat`（title 必填，workspace、model 選填），建立 Thread 時 title 由使用者指定，不再綁定 prompt。
- 建立 Thread 後呼叫 provider 的 create-chat 取得 chatId（即 sessionId），寫入 session store，並在 Thread 內顯示使用的 model 與 workspace。
- 後續在該 Thread 的訊息與現有 follow-up 一致：runStream(resume) + 同一套 rate limit、streaming、status message、錯誤處理。
- 移除 `/prompt` 指令與其註冊。

**Non-Goals:**

- 不在 core 新增 Relay.createChat；由 app 直接使用既有 CursorCliProvider.createChat。
- 不變更 provider-cursor-cli 的 create-chat 簽名（目前僅 workspace 選填；model 在後續 runStream 的 options 傳遞即可）。
- Slack bot 不在本次變更範圍。

## Decisions

1. **create-chat 由 app 直接呼叫 provider**
   - Relay 僅有 runStream，且 core 不應依賴具體 provider 型別。Discord app 已同時持有 `createCursorCliProvider()` 與 `createRelay({ provider })`，故由 app 在 handleCreateChat 內呼叫 `provider.createChat(workspace)`，取得 chatId 後當作 sessionId 寫入 store，follow-up 時照舊用 `relay.runStream({ prompt, workspace, sessionId, options: { model } })`。
   - 替代案：在 core 的 Relay 介面新增 createChat 並委派給 provider。不採納，因會讓 core 依賴「具 createChat 的 provider」介面，且目前僅 Discord 需要此流程。

2. **Session store 擴充 model（選填）**
   - create-chat 時使用者可選 model；後續 resume 須帶同一 model。現有 ThreadSession 僅 sessionId、workspace，改為支援選填 model（例如 `model?: string`），setSession 時一併寫入，getSession 回傳給 runStream 的 options.model。
   - 替代案：不存 model，每次 follow-up 用預設。不採納，因與「建立時可選 model 並顯示」需求不一致。

3. **create-chat 不帶初始 prompt**
   - Thread 建立後只顯示「使用的 model 與 workspace」的說明訊息，不自動送第一則 prompt。使用者在此 Thread 發送的第一則（及後續）一般訊息即為與 AI 的對話，由既有 MessageCreate + 依 session 的 follow-up 邏輯處理。
   - 替代案：create-chat 可選「第一則訊息」。不採納，以簡化流程與 spec；若未來要加可再擴充。

4. **指令命名與參數**
   - Slash command 名稱：`/create-chat`。選項：title（必填，string）、workspace（選填，string）、model（選填，string）。Title 直接用於 Thread 名稱（Discord 有長度上限則在 app 內截斷）。
   - 替代案：保留 `/prompt` 並新增 `/create-chat`。不採納，proposal 已定為 BREAKING 移除 prompt，單一入口較單純。

5. **錯誤處理：createChat 失敗**
   - 若 provider.createChat(workspace) 拋錯或失敗，在 Thread 內回覆錯誤訊息（例如「無法建立聊天，請稍後再試」），不寫入 session；該 Thread 不會變成 follow-up workspace，使用者可重試或另建 Thread。

## Risks / Trade-offs

- **[Risk] provider 非 CursorCliProvider**：若未來 Discord 換成不實作 createChat 的 provider，handleCreateChat 需改為條件呼叫或回退行為。
  - *Mitigation*：型別上以 CursorCliProvider 呼叫 createChat；若改為抽象介面，可日後在 core 或共用層定義「CreateChatProvider」並由 app 依賴。

- **[Risk] create-chat 與 runStream 的 model 語意**：create-chat 時選的 model 存進 session，後續 resume 一律帶該 model；若 CLI 不支援同一 chat 換 model，行為已一致。
  - *Mitigation*：spec 明訂「建立後顯示的 model 即為該 Thread 使用的模型」；實作上不允許同 thread 動態改 model。

- **[Trade-off] 無「一鍵送 prompt」**：移除 /prompt 後，使用者需先 /create-chat 再在 Thread 發訊息。若多數情境是「單一 prompt 即結束」，操作步驟變多。
  - *Mitigation*：接受為設計取捨；若需求回流可再考慮選填「初始訊息」或保留輕量 /prompt 僅建 thread+送一則。

## Migration Plan

- 實作順序：session store 擴充 model → 新增 create-chat 指令與 handleCreateChat → 註冊 /create-chat、移除 /prompt 註冊與 handlePrompt。
- 部署：一次部署即可；無資料遷移（既有 thread_sessions 無 model 欄位時，getSession 回傳 model 為 undefined，runStream 不帶 model，與現有行為相容）。
- 回滾：還原程式碼並重新 deploy；舊 Thread 若已用新 session 格式不影響，僅新 bot 版本不再建立新 create-chat session。

## Open Questions

- 無。Spec 與 tasks 可依此設計產出。
