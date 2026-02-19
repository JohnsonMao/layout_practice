## 1. Core

- [x] 1.1 在 `packages/core` 的 RelayRequest 型別新增可選欄位 `sessionId?: string`
- [x] 1.2 在 `packages/core` 的 StreamChunk 新增 variant：`{ type: 'system'; sessionId: string }`（SystemStreamChunk），並在 relay 傳遞

## 2. Provider (cursor-cli)

- [x] 2.1 在 cursor-cli provider 的 parseStreamLine（或 stream 處理迴圈）中解析 `session_id`（如 type 'system' event 的 session_id），並 yield `{ type: 'system', sessionId }` chunk（僅一次）
- [x] 2.2 當 `request.sessionId` 存在時，buildStreamArgs 改為傳入 `--resume <sessionId>` 與 prompt（新訊息），否則維持 `-p "<prompt>"`

## 3. Discord bot — SQLite 儲存

- [x] 3.1 在 discord-bot 新增 SQLite 依賴（sql.js，純 JS 無需原生編譯）；建立 `data/` 目錄並加入 .gitignore，支援 THREAD_SESSION_DB_PATH 環境變數
- [x] 3.2 新增 `thread-session-store.ts`：實作 getSession(threadId)、setSession(threadId, sessionId, cwd?)、啟動時初始化 DB 與 CREATE TABLE IF NOT EXISTS thread_sessions

## 4. Discord bot — 辨識本 bot 與 follow-up

- [x] 4.1 實作「本 bot 的 thread」判斷：thread 擁有者（thread.ownerId）等於 client.user.id；在 MessageCreate 與必要處使用
- [x] 4.2 /prompt 流程：stream 收到 type 'system' chunk 時，呼叫 setSession(threadId, sessionId, cwd)；保留 cwd 語意供寫入
- [x] 4.3 Follow-up 流程：僅在「本 bot 的 thread」且 getSession(threadId) 有值時處理；呼叫 runStream 時帶入 sessionId 與 cwd、prompt 僅為新訊息內容（不組歷史）
- [x] 4.4 移除或簡化 thread-workspace 的 in-memory history 與 buildPromptFromHistory 在 follow-up 的用途（可保留 registerThread/cwd 若仍需要）

## 5. 錯誤處理與可選

- [x] 5.1 若 resume 失敗（provider 回傳錯誤），discord-bot 可選擇刪除該 thread 的 session 紀錄並回覆使用者「請用 /prompt 重新開新對話」
