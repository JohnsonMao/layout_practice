## Context

目前 Agent Relay 專案是一個 pnpm monorepo，包含多個 apps 與 packages。目前的執行環境依賴於主機安裝的 Node.js 與 pnpm。為了確保在不同部署環境（如雲端主機、CI 流程）中能有一致的行為，我們需要將核心服務 `apps/relay-service` 容器化。

## Goals / Non-Goals

**Goals:**

- 建立一個基於 pnpm 工作區的高效多階段 `Dockerfile`。
- 支援透過 `docker-compose.yml` 快速啟動並配置服務。
- 提供容器化的執行環境規格，確保與主機環境的隔離性。

**Non-Goals:**

- 實作複雜的容器編排系統（如 Kubernetes）。
- 在容器內執行所有的開發流程（如 Vitest 測試），主要聚焦於生產環境執行。

## Decisions

### 決策 1：使用多階段構建 (Multi-stage Build)
- **內容**: 使用 `node:20-slim` 作為基礎映像檔。第一階段 (builder) 負責安裝所有依賴並執行 `pnpm build`；第二階段 (runner) 僅從 builder 複製編譯產物與生產環境所需的依賴。
- **原因**: 顯著縮小映像檔體積，並移除構建階段所需的開發工具，提高安全性。
- **替代方案**: 單階段構建。簡單但映像檔過大且包含不必要的源代碼。

### 決策 2：在容器內使用非 root 使用者執行
- **內容**: 在 `Dockerfile` 中建立一個名為 `relay` 的系統使用者，並使用 `USER relay` 指令。
- **原因**: 符合安全最小權限原則，降低容器被攻破後對系統造成的潛在損害。

### 決策 3：環境變數與卷軸掛載配置
- **內容**: 透過 `docker-compose.yml` 支援環境變數注入與 `.env` 檔案掛載到 `/app/.env`。
- **原因**: 提供靈活的配置方式，無需重新構建映像檔即可調整平台密鑰或 API 金鑰。

## Risks / Trade-offs

- **[風險]** 某些 AI 提供者工具（如 Cursor CLI）可能需要特定的系統依賴項 → **[對策]** 在 `Dockerfile` 中保留 `apt-get` 安裝必要依賴的能力，並在測試階段驗證其運行狀況。
- **[權衡]** pnpm monorepo 的 Docker 快取機制較為複雜 → **[對策]** 優先複製 `pnpm-lock.yaml` 與 `package.json` 並執行 `pnpm fetch` 以最大化層快取效果。
