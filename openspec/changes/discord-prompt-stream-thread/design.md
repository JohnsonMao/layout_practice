# Design: discord-prompt-stream-thread

## Context

- **現狀**：Discord bot 已有 `/ask`（單次 prompt → 單次 reply）、core 僅有 `run(request)`、cursor-cli provider 僅有 `execute()` 回傳完整結果。無串流、無 Thread、無續問、無工具審批、無 rate limit。
- **約束**：沿用 TypeScript、Node 20、pnpm、Turborepo；不破壞既有 `/ask` 與 relay 介面；esbuild（tsup）不支援物件字面內 async generator 語法，需以獨立函式回傳 generator。
- **利害關係**：使用者希望即時看到回應、多任務並行、在 Thread 內續問、對工具呼叫有審批入口，並避免濫用。

## Goals / Non-Goals

**Goals:**

- 串流：relay 與 provider 支援 incremental chunks（text / tool_call / done / error），Discord 端以 2 秒節流更新同一則訊息。
- Thread = workspace：每個 `/prompt` 建立一個 Public Thread，該 Thread 內保留對話歷史，續問時組裝成單一 prompt 送 relay。
- 工具審批：串流中收到 tool_call 時，在 Thread 發一則帶「核准」「拒絕」按鈕的訊息；點擊後回覆狀態（實際是否阻斷 CLI 依 Cursor 能力，本階段僅做 UI）。
- Rate limit：每 user 每 60 秒最多 5 次（/ask、/prompt、Thread 續問皆計入），超過則回傳友善訊息。

**Non-Goals:**

- 多 workspace 切換（不同專案路徑）不在本變更範圍。
- Cursor CLI 端暫停等待審批結果的雙向通訊不在本變更保證（僅 Discord 端 UI 與狀態紀錄）。
- 歷史持久化（目前為 in-memory；重啟即清空）。

## Decisions

### 1. 串流協定（core）

- **選擇**：新增 `StreamChunk`（text | tool_call | done | error）、`StreamingProvider.executeStream()` 回傳 `AsyncGenerator<StreamChunk>`；relay 提供 `runStream(request)`，若 provider 實作 executeStream 則 yield 其結果，否則 fallback 為 `execute()` 後 yield 單一 text + done。
- **理由**：向後相容既有 provider；平台可依 chunk 類型做不同處理（更新訊息、發按鈕、結束）。

### 2. runStream 實作與 build 相容性

- **選擇**：將 async generator 邏輯放在獨立模組 `relay-stream.ts` 的 `createRunStream(provider)`，回傳 `async function* runStreamImpl(request)`；`relay.ts` 僅呼叫並回傳該函式。不在物件字面內寫 `runStream(req: RelayRequest): AsyncGenerator<...>`，避免 esbuild 解析型別註解錯誤。
- **理由**：tsup/esbuild 在物件方法參數型別註解上有解析問題；獨立函式可通過 build 與 dts。

### 3. Discord 串流節流

- **選擇**：累積 chunk 的 text，每 2 秒或收到 tool_call/done/error 時 flush 一次，以 `message.edit()` 更新「正在處理…」那則訊息；結束後若總長度超過 2000 字則刪除該則並改發多則（每則 2000 字內）。
- **理由**：避免每 chunk 都 edit（Discord rate limit）；2 秒為平衡即時感與 API 負載。

### 4. Thread 與續問

- **選擇**：`/prompt` 在當前頻道建立 Public Thread，名稱取自 prompt 前 100 字；在 Thread 內送「正在處理…」並串流更新。以 `thread-workspace.ts` 的 Map<threadId, ThreadMessage[]> 存歷史；僅在「該 thread 已有歷史」的 Thread 內監聽 MessageCreate，將新訊息視為續問，以 `buildPromptFromHistory` 組裝成單一 prompt 送 relay，並將新一輪 user/assistant 寫回歷史。
- **理由**：Thread 天然隔離並行任務；續問不需新指令，打字即可；歷史組裝成單一 prompt 與現有 relay 介面一致。

### 5. 工具審批 UI

- **選擇**：收到 `StreamChunk.type === 'tool_call'` 時，在 Thread 發一則訊息，內容簡述工具呼叫，附 ActionRow 兩按鈕 customId `tool_approve:<id>`、`tool_reject:<id>`；點擊後 `interaction.reply` 回覆「已核准」或「已拒絕」（ephemeral）。不在此變更實作「將審批結果回傳給 Cursor CLI」。
- **理由**：先建立審批入口與狀態；日後若 CLI 支援 stdin 或審批 API 可再接上。

### 6. Rate limiting

- **選擇**：in-memory Map<userId, timestamps[]>，60 秒滑動視窗、每窗最多 5 次；每次 /ask、/prompt、Thread 續問前檢查，超過則回傳「請求過於頻繁，請稍後再試」。
- **理由**：簡單、無額外依賴；重啟清空可接受。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| Cursor CLI stream-json 格式與文件不符 | parseStreamLine 採寬鬆解析，未知欄位忽略；必要時對照實際輸出調整。 |
| Thread 歷史僅 in-memory，重啟遺失 | 本階段接受；後續可改為持久化（DB 或檔案）。 |
| 工具審批按鈕無法真正阻斷 CLI | 文件說明為「審批 UI 與狀態」；若需阻斷需 Cursor 端支援。 |
| Message Content Intent 需開啟 | 文件與部署說明中註明需在 Developer Portal 開啟。 |

## Migration Plan

- 部署：建置順序 core → provider/cursor-cli → discord-bot；執行 `pnpm run deploy:discord` 註冊 `/prompt`；確認 Discord Bot 已開啟 Message Content Intent。
- Rollback：無狀態（除 in-memory 歷史）；回退部署即可。
