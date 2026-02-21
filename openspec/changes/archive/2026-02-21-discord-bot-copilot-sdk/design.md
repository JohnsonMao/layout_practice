# Design: Discord bot 串接 Copilot SDK

## Context

- **現狀**：Discord bot 在 `apps/discord-bot` 使用 core relay 型別，經由單一 provider（目前為 `packages/provider-cursor-cli` 或 app 內對應）處理 create-chat 與 runStream。Thread 與 session 對應儲存在 thread-session store（如 SQLite）；訊息長度、錯誤、rate limit 均在 app 內處理。
- **邊界**：core 只定義型別/介面、不依賴 provider；apps 與 provider 依賴 core。平台邏輯在 app 內，無獨立 `packages/platform`。新邏輯需維持「app 依賴 core；app 可依配置選用 cursor-cli 或 copilot-sdk」。
- **約束**：TypeScript 5.7、Node 20.x、pnpm workspace、Turborepo；不破壞既有僅使用 cursor-cli 的部署。

## Goals / Non-Goals

**Goals:**

- 在 Discord app 內整合 `@github/copilot-sdk`，使 create-chat 與 thread 內 follow-up 可改由 Copilot CLI（經 SDK）處理。
- 透過配置選擇 provider（cursor-cli vs copilot-sdk），單一 thread 僅使用一種 provider。
- 複用既有 thread-session 儲存、訊息長度與錯誤處理、rate limit；僅「誰執行 relay」改變。

**Non-Goals:**

- 不將 Copilot SDK 抽成獨立 `packages/provider-copilot-sdk`（可選未來重構）；此 change 可在 app 內直接使用 SDK。
- 不實作 BYOK UI 或進階認證流程；僅環境變數或既有 config。
- 不更動 core 或 cursor-cli 的既有介面，除非 core 需要擴充「provider 抽象」以支援兩種 backend。

## Decisions

### D1: Provider 選擇方式

- **決策**：以環境變數（例如 `RELAY_PROVIDER=cursor-cli` 或 `RELAY_PROVIDER=copilot-sdk`）決定使用哪一個 backend。App 啟動時讀取，create-chat 與 follow-up 皆使用同一 provider。
- **理由**：與現有「從環境讀取配置」一致，無需改動 Discord 指令或 UX。
- **替代**：在 `/create-chat` 用選項選 provider — 捨棄，因增加 UX 複雜度且與「thread 單一 session 對應單一 backend」需額外約束。

### D2: Copilot SDK 放置位置

- **決策**：在 `apps/discord-bot` 內直接依賴 `@github/copilot-sdk`，並在 app 內實作「Copilot 版」的 create-chat 與 runStream 介面（或 adapter），供既有 message/thread 流程呼叫。
- **理由**：快速落地、符合「平台邏輯在 app 內」；若日後要共用可再抽出為 `packages/provider-copilot-sdk`。
- **替代**：一開始就建 `packages/provider-copilot-sdk` — 捨棄，因 scope 以 Discord 為主，先驗證再抽 package。

### D3: Session 與 thread 對應

- **決策**：沿用既有 thread-session store（threadId ↔ sessionId）。Copilot 使用時，sessionId 存 SDK 回傳的 session/conversation 識別子；create-chat 時由 SDK 建立 session 並寫入 store，follow-up 時由 store 取回 sessionId 再呼叫 SDK。
- **理由**：不增加新儲存或 schema；僅「sessionId 語意」依 provider 不同（cursor 的 chat id vs Copilot 的 session id）。
- **替代**：為 Copilot 另建 store — 捨棄，因會重複邏輯且不利單一 thread 單一 backend。

### D4: 串流與狀態訊息

- **決策**：若 Copilot SDK 支援串流，則與現有 runStream 行為對齊：單一 status 訊息更新、結束時移除並貼最終結果；若不支援串流則改為單次請求後一次回覆。沿用既有 2000 字截斷與錯誤處理。
- **理由**：spec 要求與其他 provider 一致的使用者體驗；實作上可共用「更新 status / 貼文」的 helper。
- **替代**：Copilot 專用 UI（例如多則訊息）— 捨棄，以一致性為先。

### D5: 認證與 CLI 生命週期

- **決策**：認證僅透過環境變數（如 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN`），依 SDK 文件；不在此 change 實作 BYOK 設定檔。CLI 生命週期依 SDK 預設（自動啟動 CLI server 或連線至既有 server）。
- **理由**：與 proposal 的 Non-Goals 一致；BYOK 可後續擴充。
- **替代**：在 Discord 內輸入 token — 捨棄，安全與 UX 均不適合。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| Copilot CLI 未安裝或未登入導致 create-chat 失敗 | 啟動時或首次使用時檢查並回傳明確錯誤訊息；文件說明需安裝 Copilot CLI 並登入或設定 token。 |
| SDK API 變更或與現有 runStream 語意不同 | 以 adapter 封裝 SDK 呼叫，介面與現有 relay 對齊；若 SDK 不支援串流則 fallback 為單次請求。 |
| 單一 process 同時服務多 thread（cursor + Copilot 混用） | 每個 thread 僅綁定一種 provider；同一 bot 可依配置只開一種 provider，或日後支援 per-thread 配置（此 change 不實作）。 |
| 依賴 `@github/copilot-sdk` 版本與 Copilot CLI 相容性 | 鎖定 SDK 版本、在 README 或 design 註明建議 CLI 版本；若有 breaking 再升級與測試。 |

## Migration Plan

- **部署**：新增環境變數（如 `RELAY_PROVIDER`、`COPILOT_GITHUB_TOKEN` 等）；未設定則維持現狀（cursor-cli）。部署後可先以單一 server 使用 Copilot 驗證，再視需要推廣。
- **回滾**：將 `RELAY_PROVIDER` 改回 `cursor-cli` 或移除 Copilot 相關變數即可回到原有行為；無資料遷移。

## Open Questions

- 是否需在 core 定義「provider 介面」（createChat、runStream）以讓 app 僅依賴介面？目前可在 app 內以型別或 adapter 抽象，待實作時再定。
- Copilot SDK 實際串流 API 與錯誤碼需對照文件後，再對齊現有「status 訊息 / 錯誤轉譯」實作。
