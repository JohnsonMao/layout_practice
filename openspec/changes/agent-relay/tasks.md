# Tasks: agent-relay（Phase 1: Discord + Cursor CLI）

## 1. Monorepo 與 core 套件

- [x] 1.1 在 `packages/core` 建立 package.json（name、exports、依賴）、tsconfig、符合 workspace 的目錄結構
- [x] 1.2 在 core 定義 RelayRequest / RelayResponse / 錯誤型別與 Provider 介面（types.ts）
- [x] 1.3 實作 relay 協調層：接受 request、呼叫指定 provider.execute、回傳 response（relay.ts 或 index）
- [x] 1.4 為 core 新增 build 與 test script，並在 root turbo.json 中可正確執行

## 2. Cursor CLI Provider

- [x] 2.1 在 `packages/provider/cursor-cli` 建立 package.json（依賴 core）、tsconfig、目錄結構
- [x] 2.2 實作 Cursor CLI 子行程呼叫：spawn `agent -p "<prompt>"`，支援 --output-format 與可選 --model、--mode
- [x] 2.3 實作輸出解析：優先 JSON，fallback 為 raw stdout；將結果對應到 RelayResponse
- [x] 2.4 實作逾時與非零 exit 處理，回傳錯誤碼與訊息（CURSOR_CLI_NOT_FOUND、timeout 等）
- [x] 2.5 實作 Provider 介面 export（execute(request) => Promise<RelayResponse>），並通過對應 spec 的測試或手動驗證

## 3. Discord 平台

- [x] 3.1 在 `apps/discord-bot` 建立 package.json（依賴 core、discord.js）、tsconfig、目錄結構
- [x] 3.2 註冊 slash command（例如 /ask prompt:string），並實作 deploy-commands 對應的 script
- [x] 3.3 在 command handler 中組裝 RelayRequest、呼叫 core relay（使用 cursor-cli 為預設 provider）、取得 RelayResponse
- [x] 3.4 實作回覆邏輯：成功時回傳 result；失敗時回傳錯誤訊息；結果超過 2000 字時截斷並加 truncation 說明
- [x] 3.5 從環境變數讀取 Discord token 與 provider 設定，啟動時缺少必要設定則 process.exit 並報錯
- [x] 3.6 在 root package.json 確認 dev:discord、deploy:discord 可正確啟動與部署

## 4. 整合與驗證

- [x] 4.1 執行 pnpm run check（build + test）確保全 repo 通過
- [ ] 4.2 手動驗證：部署 Discord 指令、在頻道執行 /ask、確認 Cursor CLI 被呼叫且結果回傳至 Discord
