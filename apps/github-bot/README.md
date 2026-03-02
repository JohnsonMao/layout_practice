# github-bot

GitHub 觸發媒介：透過 Webhook 在 Issues、Pull Requests、Discussions 上以關鍵字觸發 agent-relay，並將結果回貼為評論。

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `WEBHOOK_SECRET` | 是 | GitHub Webhook 的 Secret，用於驗證 `X-Hub-Signature-256`。 |
| `GITHUB_TOKEN` | 是 | GitHub Personal Access Token 或 App Installation Token，用於張貼評論。 |
| `PORT` | 否 | HTTP 伺服器 port，預設 `3000`。 |
| `GITHUB_BOT_WORKSPACE` | 否 | Relay 預設工作目錄，預設為 process.cwd()。 |
| `GITHUB_BOT_MAX_PROMPT_LENGTH` | 否 | 觸發內容最大字元數，預設 `16000`。 |
| `RELAY_PROVIDER` | 否 | Relay 後端：`cursor-cli`（預設）或 `copilot-sdk`。 |
| `GITHUB_BOT_RATE_LIMIT_PER_MIN` | 否 | 若設定，每個 repo 每分鐘最多觸發次數；超過則回貼「請求過於頻繁」。 |
| `GITHUB_BOT_ALLOWED_REPOS` | 否 | 白名單：逗號分隔的 `owner/repo`，僅這些 repo 會觸發 relay；未設定則不限制。 |

## Webhook 設定

1. 在 GitHub repo 或 App 設定中新增 Webhook。
2. **Payload URL**：`https://<your-host>:<PORT>/webhook`
3. **Content type**：`application/json`
4. **Secret**：與 `WEBHOOK_SECRET` 一致。
5. 訂閱事件建議：`Issue comments`、`Issues`、`Pull requests`、`Discussion comments`（依需要勾選）。

## 觸發方式

在 Issue / PR / Discussion 的內容或評論中，以以下任一前綴開頭並接一段文字，即會觸發 relay 並將回覆貼成評論：

- `/ask <prompt>`
- `@bot <prompt>`
- `!ask <prompt>`

範例：評論寫入 `/ask 解釋這段程式碼`，bot 會呼叫 relay 並將結果回貼至同一則討論。

## 安全性注意事項

- **Secret 保管**：`WEBHOOK_SECRET`、`GITHUB_TOKEN` 僅自環境讀取，請勿寫入程式碼或 log。部署時使用 secret 管理（如 GitHub Actions secrets、Kubernetes secrets）。
- **簽章驗證**：所有 Webhook 請求皆會驗證 `X-Hub-Signature-256`；驗證失敗回傳 401，不處理 body。
- **錯誤訊息**：對使用者顯示的錯誤不包含內部路徑、token 或 stack trace。
- **權限**：建議 GitHub Token 僅授與所需 repo 的最小權限（例如 `repo` 下僅 Comments）。若只允許特定 repo，請設定 `GITHUB_BOT_ALLOWED_REPOS`。

## 開發與建置

```bash
pnpm install
pnpm --filter github-bot build
pnpm --filter github-bot test
```

本地執行（需先設定上述環境變數）：

```bash
pnpm --filter github-bot dev
```
