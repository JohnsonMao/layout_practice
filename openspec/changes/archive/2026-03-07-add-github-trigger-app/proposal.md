# Proposal: add-github-trigger-app

## Goals

- 新增一個以 **GitHub** 為觸發媒介的 app，與既有 Discord / Slack 並列，擴展 agent-relay 的觸發來源。
- 可透過 **GitHub API** 在 **Issues、Pull Requests、Discussions** 上觸發 AI 任務（例如留言、評論、或特定指令觸發 relay）。

## Non-Goals

- 不改變既有 Discord / Slack app 或 core relay 的對外行為與規格。
- 不在此 change 內實作 GitHub App 的完整 OAuth / 安裝流程以外的進階權限（僅涵蓋觸發所需之 Issue/PR/Discussions 讀寫）。
- 不支援 GitHub 以外的 Git 託管（如 GitLab、Bitbucket）。

## Why

需要讓 agent-relay 能從 GitHub 上的協作情境（Issue、PR、Discussions）觸發，讓開發者與協作者在 repo 內即可啟動 AI 任務並取得回覆。現有觸發媒介僅有 Discord 與 Slack，加入 GitHub 可涵蓋「在程式庫或專案討論脈絡中直接觸發」的使用場景。

## What Changes

- 新增 **GitHub 觸發媒介 app**（例如 `apps/github-bot` 或同級）：接收 GitHub 事件（webhook 或 API），辨識觸發來源為 Issue / PR / Discussion，組裝 relay 請求並呼叫既有 core relay，再將結果回寫至對應的 Issue/PR/Discussion。
- 支援的觸發入口：
  - **Issues**：在 issue 內以指定方式（例如留言、標籤、或關鍵字）觸發。
  - **Pull Requests**：在 PR 內以評論或指定方式觸發。
  - **Discussions**：在 discussion 內以評論或指定方式觸發。
- 新 app 使用既有 core relay 型別與 provider 介面，不包含 provider 專屬邏輯，僅負責「從 GitHub 事件 → relay 請求」與「relay 回應 → GitHub 回貼」的轉換。
- 設定與認證（GitHub App credentials、webhook secret、relay/provider 設定）自環境或設定檔讀取，與現有 app 模式一致。

## Capabilities

### New Capabilities

- **platform-github**：GitHub 觸發媒介。定義如何透過 GitHub API（Issues、PR、Discussions）接收觸發、組裝 relay 請求、呼叫 relay、以及將結果回貼至對應的 Issue/PR/Discussion；涵蓋 webhook 訂閱、事件過濾、認證與設定。

### Modified Capabilities

- （無。core-relay 已為平台無關之 request/response 契約，無需變更既有 spec 需求。）

## Impact

- **apps/**：新增一個 GitHub 觸發 app（例如 `github-bot`），結構與 `discord-bot`、`slack-bot` 類似，依賴 `packages/core`，不依賴特定 provider。
- **packages/core**：若需擴充 relay 請求欄位（例如來源平台、thread/issue id）以支援 GitHub 回貼，僅為介面擴充，不改變既有 core-relay spec 行為。
- **依賴**：新 app 會使用 GitHub API 與 webhook（含 @octokit 或類似 SDK、webhook 驗證），需列入該 app 的 dependencies。
- **turbo.json / pnpm-workspace**：新增 app 的 build/test 任務與 workspace 成員，符合既有邊界。
- **安全性**：Webhook 簽章驗證、敏感資訊不落 log、輸入長度限制與可選 rate limit；實作時需符合 design 與 platform-github spec 之安全性需求。
