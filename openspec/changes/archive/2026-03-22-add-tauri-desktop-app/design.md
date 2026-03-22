## Context

目前 `agent-relay` 專案主要以 CLI 與 Bot 為主。為了提供更好的用戶體驗與本地資源控制，我們需要引入基於 Tauri 的桌面應用程式。Tauri 能讓我們在 Monorepo 中復用 React 組件，同時利用 Rust 處理敏感的系統級操作（如子進程調度與 API 金鑰的安全存儲）。

## Goals / Non-Goals

**Goals:**
- 在 `apps/` 目錄下建立一個可獨立啟動且具備基礎視窗、選單功能的 Tauri 應用。
- 達成 Rust 後端與 React 前端的型別自動化同步（透過 Specta）。
- 前端 React 應用需能直接引用 `packages/core` 的型別定義。
- 將 Tauri 的開發與構建流程整合進現有的 Turborepo 流水線。

**Non-Goals:**
- 目前不計畫將所有 Provider 邏輯搬移到 Rust（優先使用現有的 TS 實現）。
- 不處理跨平台的自動更新服務器設置（僅實作本地構建）。

## Decisions

### Decision: 目錄結構與 Framework 選擇
**Rationale:**
選擇 Tauri 2.0 + Vite + React + TypeScript。
- **優點**：安裝包體積小（< 20MB），與現有的 React/TS 技術棧無縫整合。
- **替代方案**：Electron（體積太大，不符合專案輕量化的追求）。

### Decision: 型別同步工具 (Specta)
**Rationale:**
使用 `specta` 套件在 Rust 中標註 Struct，並在 `apps/desktop/src/types/generated.ts` 生成 TS 定義。
- **優點**：前端呼叫 `invoke` 時能享有與 Rust 後端一致的強型別提示，減少通訊錯誤。

### Decision: Monorepo 依賴關係
**Rationale:**
`apps/desktop` 前端部分透過 `workspace:*` 引用 `packages/core`。
- **邊界約束**：桌面端不應直接依賴 `apps/relay-service`，其核心協調邏輯應逐步遷移至 Rust 或通過 `packages/core` 的介面定義。

## Risks / Trade-offs

- **[Risk] Rust 工具鏈門檻** → **Mitigation**: 提供清楚的 `README.md` 指引如何安裝 Rust 環境，並在 CI 中預裝相關依賴。
- **[Risk] Webview 兼容性** → **Mitigation**: Tauri 依賴系統原生 Webview (macOS: WebKit, Windows: WebView2)，需確保開發環境安裝了 WebView2。
- **[Trade-off] 效能 vs 開發速度** → 目前優先將複雜的 TS 邏輯作為 Sidecar 或保持在 TS 側，待穩定後再考慮 Rust 重寫。
