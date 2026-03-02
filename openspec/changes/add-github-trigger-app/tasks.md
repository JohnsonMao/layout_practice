## 1. 專案與 workspace 設定

- [x] 1.1 在 `apps/` 下新增 `github-bot` package（package.json、tsconfig、依賴 @octokit/webhooks、@octokit/rest、packages/core）
- [x] 1.2 將 `apps/github-bot` 加入 pnpm-workspace.yaml 與 turbo.json 的 build/lint/test 任務

## 2. Webhook 伺服器與簽章驗證（安全性）

- [x] 2.1 實作 HTTP server 接收 GitHub webhook POST（單一路由，如 `/webhook`）
- [x] 2.2 實作 webhook 簽章驗證：讀取 WEBHOOK_SECRET、驗證 X-Hub-Signature-256（HMAC-SHA256）、驗證失敗回傳 401 且不解析 body
- [x] 2.3 使用 constant-time 比較驗證簽章，避免 timing attack

## 3. 事件解析與觸發辨識

- [x] 3.1 解析 webhook payload（issue_comment、issues、pull_request 相關、discussion_comment），擷取 repo、issue/PR/discussion id、comment body
- [x] 3.2 實作觸發規則（關鍵字/前綴或 @mention）：符合則組裝 relay prompt，不符合則 200 不呼叫 relay
- [x] 3.3 對擷取之 body 做輸入驗證：最大長度限制（可配置 default），超過則不呼叫 relay 或截斷並註明

## 4. Relay 整合

- [x] 4.1 依 design 建立 relay 介面呼叫（使用 packages/core 型別與既有 relay 協調方式）
- [x] 4.2 從環境讀取 provider 設定，組裝 relay 請求（prompt、可選 cwd/options），呼叫 relay
- [x] 4.3 處理 relay 成功/錯誤回應，轉為「待回貼內容」或「錯誤訊息」（不含內部 stack trace 或 secret）

## 5. 回貼至 GitHub

- [x] 5.1 使用 GitHub API（Octokit）建立 comment：依 event 類型張貼至對應 issue、PR 或 discussion
- [x] 5.2 實作 GitHub 認證（App 的 installation access token 或 token），確保僅在已授權 repo 操作
- [x] 5.3 實作評論長度限制：超過平台上限則截斷並附加 truncation 說明（與 platform-discord 一致）

## 6. 設定與啟動

- [x] 6.1 從環境讀取 GITHUB_APP_ID、GITHUB_PRIVATE_KEY（或 token）、WEBHOOK_SECRET、relay/provider 相關變數
- [x] 6.2 啟動時缺少必要設定則 fail fast 並 exit，不啟動 webhook server
- [x] 6.3 確保 secret/token 不寫入 log、不出現在對外錯誤訊息中（對應 spec 敏感性要求）

## 7. 限流與可選強化

- [x] 7.1 （可選）實作 per-repo 或 per-user rate limit：超過時不呼叫 relay，並回貼「請求過於頻繁」等使用者訊息
- [x] 7.2 （可選）支援 repo/installation 白名單：僅處理白名單內之 webhook，其餘 200 不處理

## 8. 測試與文件

- [x] 8.1 為 webhook 簽章驗證、觸發規則、輸入長度限制撰寫單元測試（Vitest）
- [x] 8.2 為「relay 成功/失敗 → 回貼內容」撰寫單元或整合測試（可 mock GitHub API 與 relay）
- [x] 8.3 在 README 或 docs 說明部署所需環境變數、webhook URL 設定與安全性注意事項
