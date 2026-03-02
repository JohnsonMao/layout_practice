# Design: add-github-trigger-app

## Context

- 現有 agent-relay 已有 Discord、Slack 兩類觸發 app，皆位於 `apps/*`，依賴 `packages/core` 的 relay 型別與 provider 介面。
- 本 change 新增以 GitHub 為觸發媒介的 app：透過 GitHub Webhooks（Issues、PR、Discussions）接收事件，組裝 relay 請求、呼叫 relay、再將結果回貼至對應位置。
- 約束：新 app 僅為又一「平台端」；不修改 core 的對外契約；依賴方向為 `apps/github-bot` → `packages/core`，不依賴任一 provider package。

## Goals / Non-Goals

**Goals:**

- 實作 GitHub 觸發 app，支援 Issue / PR / Discussion 上的觸發與回貼。
- Webhook 驗證、認證與設定自環境讀取，與既有 app 模式一致。
- 確保安全性：webhook 簽章驗證、敏感資訊不落 log、可選的 rate limit 與權限檢查。

**Non-Goals:**

- 不實作 GitHub App 的完整 OAuth 安裝 UI 或進階權限流程。
- 不支援 GitLab / Bitbucket 等其他 Git 託管。

## Decisions

### 1. 觸發方式：GitHub Webhooks

- **選擇**：使用 GitHub App 或 repo Webhooks 的 HTTP delivery，接收 `issue_comment`、`issues`、`discussion_comment` 等事件。
- **理由**：即時、不需輪詢；與 GitHub 官方建議一致。
- **替代**：Polling API — 延遲高、API 配額消耗大，不採用。

### 2. 觸發辨識方式

- **選擇**：以「關鍵字/指令前綴」辨識是否為對 bot 的觸發（例如 `@bot` 或 `/ask` 或指定 prefix）。僅在符合條件時組裝 relay 請求並回貼。
- **理由**：避免對每一則留言都呼叫 relay；與 platform-discord 的 slash command 概念對齊（明確觸發）。

### 3. Relay 與 session 對應

- **選擇**：以「GitHub 脈絡 id」（例如 `owner/repo#issue_number` 或 `owner/repo#discussion_id`）作為 conversation 邊界；可選在同一 issue/PR/discussion 內維持 session（resume）或每次觸發為新 session。
- **理由**：與 Discord thread ↔ session 類似；實作可先採「每次觸發為新 session」，後續再擴充 resume。

### 4. 安全性

- **Webhook 簽章**：必須驗證 `X-Hub-Signature-256`（HMAC-SHA256），使用設定中的 webhook secret；驗證失敗則 401，不處理 body。
- **敏感資料**：Token、webhook secret、API key 僅自環境變數或安全 secret store 讀取；不寫入 log、不出現在錯誤訊息中。
- **輸入**：從 GitHub payload 擷取的 text（body、comment）在組裝 prompt 前做長度與字元限制，避免 DoS 或 injection 導向 downstream。
- **權限**：僅處理 bot 有權限的 repo/org；可選在處理前檢查 `installation_id` / repo 白名單，避免未授權 repo 觸發。

### 5. 專案結構與依賴

- **選擇**：新增 `apps/github-bot`（或 `apps/github-app`），內含 webhook HTTP server、事件解析、relay 呼叫、GitHub API 回貼；使用 `@octokit/webhooks` 與 `@octokit/rest`（或同等 SDK）。
- **理由**：與 `discord-bot`、`slack-bot` 並列；core 僅型別/介面，不新增 core 依賴。

### 6. 回貼長度與格式

- **選擇**：GitHub 評論有字數限制；若 relay 回傳過長，則截斷並註明（與 platform-discord 的 message limit 處理一致）。
- **理由**：避免 API 錯誤與使用者困惑。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-------------|
| Webhook secret 洩漏 | 僅從環境讀取；不在 log/error 中輸出；文件註明部署時設定 |
| 惡意 payload 或過大 body | 驗證簽章後再解析；對 body 長度與內容做上限與 sanitization |
| 未授權 repo 觸發 | 可選 installation/repo 白名單；文件建議最小權限安裝 |
| Relay 延遲導致 GitHub 超時 | 回覆先 200 OK，再非同步呼叫 relay 並回貼；或採用 GitHub 的 202 + 背景處理 |
| Rate limit（GitHub API / 自建） | 對外遵守 GitHub API rate limit；對內可做 per-repo 或 per-user 限流（見 spec） |

## Migration Plan

- 新 app 為新增 package，不影響既有 app。
- 部署：在目標環境設定 `GITHUB_APP_ID`、`GITHUB_PRIVATE_KEY`、`WEBHOOK_SECRET`、relay/provider 相關變數；註冊 webhook URL；啟動 `apps/github-bot`。
- Rollback：停用 webhook 或下線 app 即可，無資料遷移。

## Open Questions

- 是否在第一版就支援「同一 issue/PR 內 resume session」？若否，可留待後續 spec 擴充。
- 觸發關鍵字/前綴的最終語意（例如是否支援多種指令）可在實作時與 product 敲定。
