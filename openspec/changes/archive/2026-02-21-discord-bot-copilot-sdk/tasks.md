## 1. 依賴與配置

- [x] 1.1 在 `apps/discord-bot` 的 package.json 新增依賴 `@github/copilot-sdk`
- [x] 1.2 在 config 或環境變數中支援 `RELAY_PROVIDER`（如 `cursor-cli` | `copilot-sdk`）及 Copilot 相關變數（如 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`）；未設定時預設為 `cursor-cli`
- [x] 1.3 啟動時若 `RELAY_PROVIDER=copilot-sdk` 且必要 Copilot 認證未設定，fail fast 或記錄明確錯誤

## 2. Copilot SDK 介面與生命週期

- [x] 2.1 在 app 內新增 Copilot 客戶端模組（或 adapter）：依 SDK 文件建立連線、管理 CLI/server 生命週期
- [x] 2.2 實作「create session」：呼叫 SDK 建立 session，回傳可儲存之 session 識別子
- [x] 2.3 實作「send prompt / stream」：接受 sessionId 與 prompt，回傳非同步迭代器或 stream（與現有 relay.runStream 語意對齊：chunk 含 text、tool_call、system、done/error）
- [x] 2.4 處理 SDK 與 CLI 錯誤、逾時，轉成統一錯誤格式供上層顯示

## 3. Provider 選擇與 relay 分支

- [x] 3.1 在 `index.ts`（或入口）依 `RELAY_PROVIDER` 決定使用 `createCursorCliProvider()` 或 Copilot adapter；建立單一 relay 或雙分支（create-chat / runStream 依 provider 分流）
- [x] 3.2 確保單一 thread 僅使用一種 provider：session 儲存時可標記 provider 類型，follow-up 時依該標記選擇 relay 路徑

## 4. Create-chat 與 Copilot

- [x] 4.1 當 provider 為 Copilot 時，/create-chat 改為呼叫 Copilot adapter 建立 session，並將 threadId 與 Copilot session id 寫入既有 thread-session store
- [x] 4.2 在 thread 內張貼 session 資訊（例如 model/workspace 或「使用 Copilot」），與現有 create-chat 回覆格式一致

## 5. Follow-up 與串流

- [x] 5.1 當 follow-up 訊息所屬 thread 的 session 為 Copilot 時，改為使用 Copilot adapter 的 stream API 取得回應
- [x] 5.2 複用既有 status 訊息更新與最終貼文邏輯（單一 status、截斷、錯誤訊息）；若 SDK 不支援串流則改為單次請求後一次回覆

## 6. 錯誤與使用者訊息

- [x] 6.1 Copilot 相關錯誤（CLI 未安裝、連線失敗、逾時、認證失敗）轉成使用者可見訊息，不暴露 stack 或內部細節
- [x] 6.2 文件或註解說明：使用 Copilot 時需安裝 Copilot CLI 並設定 token（或 BYOK）

## 7. 驗證與收尾

- [ ] 7.1 手動或自動測試：`RELAY_PROVIDER=cursor-cli` 時行為與改動前一致
- [ ] 7.2 手動或自動測試：`RELAY_PROVIDER=copilot-sdk` 時，/create-chat 與 thread 內 follow-up 可完成並回傳結果（或預期錯誤）
- [x] 7.3 執行 `pnpm run check` 通過（typecheck、lint、test）
