# Proposal: discord-prompt-stream-thread

## Why

既有 Discord 整合僅支援單次 `/ask`：一次 prompt、等完整回應、單則訊息回覆。缺少即時回饋、多任務隔離、延續對話與工具審批，不利於長時間協作與多工情境。本次變更擴充為：串流回應、Thread 隔離、續問對話、工具審批 UI、Rate limiting。

## What Changes

- **即時串流**：回應以 2 秒節流即時更新至 Discord，不需等完整回應。
- **Thread 隔離**：每個 `/prompt` 建立獨立 Thread，支援同時執行多個任務；每個 Thread 視為一個 workspace，擁有獨立對話歷史。
- **續問對話**：在 Thread 中直接打字即可續問，保留完整對話歷史並組裝成 relay 請求。
- **工具審批**：串流中出現 tool_call 時，於 Discord 以按鈕請求核准/拒絕（目前為 UI 與狀態紀錄，實際 CLI 是否暫停依 Cursor 能力）。
- **Rate limiting**：每使用者每分鐘最多 5 次請求，防止短時間大量呼叫。

## Capabilities

### Modified Capabilities

- **core-relay**：新增串流協定（StreamChunk、StreamingProvider、runStream）；非串流 provider 可 fallback 為單次執行再 yield。
- **provider-cursor-cli**：新增 executeStream，使用 `--output-format stream-json` 解析 NDJSON，yield text / tool_call / done / error。
- **platform-discord**：新增 `/prompt`、Thread 建立與註冊、MessageCreate 續問、串流節流更新、tool_call 按鈕、rate limit 檢查；保留既有 `/ask` 並套用 rate limit。

### New Capabilities

- 無（變更皆在既有 capabilities 內擴充）。

## Impact

- **程式**：`packages/core` 新增 `relay-stream.ts` 與型別；`packages/provider/cursor-cli` 擴充 provider；`apps/discord-bot` 新增 `rate-limit.ts`、`thread-workspace.ts`、`commands/prompt.ts`，並擴充 `index.ts`（intents、串流、Thread、續問、按鈕）。
- **依賴**：無新增外部依賴；需 Discord Message Content Intent 以讀取 Thread 內訊息。
- **對外**：需重新執行 `deploy:discord` 以註冊 `/prompt`；既有 `/ask` 行為相容，僅加上 rate limit。
