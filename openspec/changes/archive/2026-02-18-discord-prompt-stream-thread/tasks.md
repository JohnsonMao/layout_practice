# Tasks: discord-prompt-stream-thread

本變更為事後補文件；以下任務均已完成。

## core-relay

- [x] 在 types 中新增 StreamChunk、StreamingProvider 型別
- [x] 新增 relay-stream.ts，實作 createRunStream(provider) 回傳 async generator
- [x] relay 匯出 runStream，使用 createRunStream；無 executeStream 的 provider fallback 為單次 execute 再 yield
- [x] 為 runStream 行為撰寫單元測試（fallback 情境）

## provider-cursor-cli

- [x] 新增 buildStreamArgs、parseStreamLine，支援 stream-json 輸出解析
- [x] 實作 executeStream：spawn 使用 stream-json、依行解析 NDJSON、yield text / tool_call / done / error
- [x] 修正 child error 型別（NodeJS.ErrnoError → Error & { code?: string }）以通過 dts build

## platform-discord

- [x] 新增 rate-limit.ts：每 user 每 60 秒最多 5 次，check/record
- [x] 新增 thread-workspace.ts：Map<threadId, history>、getThreadHistory、appendThreadMessage、registerThread、buildPromptFromHistory
- [x] 新增 /prompt slash command（commands/prompt.ts）並註冊
- [x] 擴充 intents：GuildMessages、MessageContent
- [x] 實作 handlePrompt：建立 Thread、runStreamWithThrottle（2 秒節流）、tool_call 時發按鈕訊息、長文拆多則
- [x] 實作 handleThreadFollowUp：MessageCreate 在已註冊 Thread 且非 / 開頭時組裝歷史並 runStream，更新歷史
- [x] 實作 tool 按鈕 interaction：tool_approve / tool_reject 回覆「已核准」「已拒絕」
- [x] /ask 與 /prompt、續問皆套用 rate limit 檢查

## 驗證

- [x] pnpm run check（build + test）通過
