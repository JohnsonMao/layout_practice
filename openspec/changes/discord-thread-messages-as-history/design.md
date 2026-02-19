# Design: Discord thread follow-up via resume + SQLite persistence

## Context

- Discord bot 目前用 in-memory `thread-workspace`（Map）存 thread 的對話歷史，follow-up 時組「Previous conversation: …」再送 relay。歷史與 Cursor 端 session 脫節，且 bot 重開即丟失。
- Cursor CLI 的 stream-json 會回傳 `session_id`，且支援 `--resume <sessionId>` 接續同一 session。我們要改為：首次 /prompt 取得 session_id 並持久化，follow-up 時只送 resume + 新訊息。
- 同一 Discord 伺服器可能有多個 bot，須只對「本應用程式 bot」建立或擁有的 thread 做 follow-up。
- 依賴邊界：core 只定義型別；discord-bot 依賴 core + provider；provider 不依賴 platform。sessionId 的傳遞為 relay request 的擴充（core），由 discord-bot 填入、cursor-cli 消費。

## Goals / Non-Goals

**Goals:**
- Follow-up 改為 resume session，不傳歷史給 Cursor。
- 僅對本 bot 的 thread 做 follow-up。
- threadId ↔ sessionId 持久化，bot 重開後仍可 resume。
- Relay 與 cursor-cli provider 支援可選 sessionId 與 stream 回傳 session_id。

**Non-Goals:**
- 不把 sessionId 寫進 Discord（僅 bot 端 SQLite）。
- 不做跨 bot 或跨伺服器 session 共用；不做 session 過期或限流（可之後再加）。

## Decisions

### 1. threadId ↔ sessionId 持久化：SQLite

- **選擇**：在 discord-bot 內用 **SQLite** 存 thread–session 對應，單一 DB 檔，由 discord-bot 獨占讀寫。
- **理由**：不需額外服務、部署簡單、bot 重開可保留對應；單表、低 QPS，SQLite 足夠。
- **替代**：in-memory Map → 重開即丟。Redis/Postgres → 過度設計且需額外 infra。

### 2. SQLite 表結構與檔案位置

- **表**：單表 `thread_sessions`。
  - `thread_id TEXT PRIMARY KEY` — Discord thread snowflake。
  - `session_id TEXT NOT NULL` — Cursor session_id（用於 --resume）。
  - `cwd TEXT` — 該 thread 的 workspace 路徑（可選，與現有 cwd 語意一致）。
  - `created_at INTEGER DEFAULT (unixepoch())` — 方便日後清理或除錯。
- **檔案**：`apps/discord-bot/data/thread_sessions.sqlite`（或由 env `THREAD_SESSION_DB_PATH` 覆寫）。目錄需在啟動時建立；DB 檔不進版控（.gitignore）。
- **初始化**：首次啟動時若檔案不存在則建立；若表不存在則執行 `CREATE TABLE IF NOT EXISTS thread_sessions (...)`。

### 3. SQLite 讀寫時機與 API

- **寫入**：在該 thread 首次完成 /prompt 且從 stream 收到 `session_id` 後，`INSERT OR REPLACE INTO thread_sessions (thread_id, session_id, cwd, created_at) VALUES (?, ?, ?, unixepoch())`。
- **讀取**：使用者於 thread 發一般訊息時，用 `thread_id` 查 `SELECT session_id, cwd FROM thread_sessions WHERE thread_id = ?`；有列則視為可 follow-up，帶該 session_id（及 cwd）呼叫 relay。
- **模組**：在 discord-bot 內新增 `thread-session-store.ts`（或同名模組），提供 `getSession(threadId)`、`setSession(threadId, sessionId, cwd?)`、`deleteSession(threadId)`（皆為 async API）；底層用 sql.js（純 JS SQLite，無需原生編譯）；不在 core/provider 內引入 DB。

### 4. Core：RelayRequest 支援可選 sessionId

- **選擇**：在 `RelayRequest` 增加可選欄位 `sessionId?: string`（及既有 `cwd` 保留）。Discord 在 follow-up 時帶入從 SQLite 查到的 sessionId；cursor-cli 在有 sessionId 時改為 `--resume <sessionId>` + 新訊息。
- **理由**：介面單一、向後相容；provider 可依 sessionId 有無決定是否 resume。

### 5. Provider：stream 回傳 session_id、執行時支援 resume

- **選擇**：從 stream-json 的 event（如 `type: 'system'` 且帶 `session_id`）解析出 session_id，以新 chunk 型別（如 `{ type: 'session', sessionId: string }`）或首個 chunk 的擴充欄位傳給上層；discord-bot 收到後寫入 SQLite。執行時若 `request.sessionId` 存在，則 CLI 參數改為 `--resume <sessionId>` + prompt（新訊息），否則維持 `-p "<prompt>"`。
- **理由**：Cursor 文件與現有 stream-types 已有 session_id；需一次性地把 session_id 傳到 app 層才能寫入 DB。

### 6. 本 bot 的 thread 辨識

- **選擇**：僅當 thread 的**擁有者**（或建立 thread 的首則訊息作者）為當前 `client.user?.id` 時，才視為「本 bot 的 thread」並允許 follow-up。使用 Discord API 的 thread 資訊（如 `thread.ownerId` 或 fetch 首則訊息）與 `client.user.id` 比對。
- **理由**：避免把其他 bot 建立的 thread 當成我們的 workspace。

## Risks / Trade-offs

- **[Risk] SQLite 檔案損壞或權限** → 啟動時檢查 DB 可寫、表存在；若無法寫入則 log 並退避（例如該次不持久化，或 fallback 不 resume）。
- **[Risk] Cursor 端 session 過期或失效** → 若 resume 失敗，可選擇清除該 thread 的 DB 紀錄並回覆使用者「請重新用 /prompt 開新對話」；細節可放在 tasks。
- **[Risk] 單表成長** → 目前不實作 TTL；若未來要清理，可用 `created_at` 做定期 DELETE。
- **[Trade-off] 新增 SQLite 依賴** → 僅限 discord-bot，不影響 core/provider 的純 JS 依賴。

## Migration Plan

- **部署**：discord-bot 新版本上線時，若 DB 路徑為新目錄則自動建目錄與表；既存 bot 無需手動遷移（舊 in-memory 狀態本來就不持久）。
- **回滾**：若需回滾，可關閉 follow-up 或改回「無 sessionId 時用舊邏輯（若仍保留））；SQLite 檔可保留不刪，以便之後再啟用 resume。

## Open Questions

- 是否在首次寫入 session 時一併寫入 `cwd`（從目前 thread workspace 或 /prompt 當下 cwd）？建議是，以便 resume 時用同一 cwd 呼叫 CLI。
- 若 Cursor 回傳的 session_id 在後續 resume 時失效，錯誤處理與使用者提示要落在哪一層（provider 回傳錯誤碼 vs. discord-bot 判斷並清 DB）— 建議在 tasks 定案。
