## Why

目前 Agent Relay 服務直接在主機環境執行，在開發與部署時會面臨環境不一致、依賴項衝突（如不同版本的 Node.js 或系統工具）等問題。為了解決這些問題並簡化部署流程，我們需要支援 Docker 啟動，讓服務能在完全隔離且一致的容器環境中執行。

## What Changes

- 在專案根目錄新增 `Dockerfile` 與 `.dockerignore`。
- 新增 `docker-compose.yml` 用於多容器編排（如未來整合資料庫）。
- 修改 `apps/relay-service` 的啟動腳本，確保其在 Docker 環境下的相容性。
- 配置環境變數，使其在 Docker 容器內能正確讀取配置並執行 AI 中繼任務。

### Goals
- 提供可靠的 Docker 映像檔構建流程。
- 支援一鍵啟動整個 Relay 服務環境。
- 確保容器內的權限與執行路徑與主機環境一致或可配置。

### Non-Goals
- 實作複雜的容器編排邏輯（如 Kubernetes 部署檔案）。
- 處理跨雲端環境的映像檔儲存庫管理。

## Capabilities

### New Capabilities

- `docker-deployment`: 提供構建 Docker 映像檔並在隔離容器中啟動 Agent Relay 服務的能力。
- `container-runtime-config`: 規格化容器內的環境變數、掛載點以及與主機通訊的網路配置。

### Modified Capabilities

(none)

## Impact

- **Affected code**: 
  - 專案根目錄 (新增 `Dockerfile`, `docker-compose.yml`, `.dockerignore`)
  - `apps/relay-service` (啟動邏輯調整)
- **APIs & Dependencies**: 增加對 Docker 引擎與 Docker Compose 的運行環境依賴。
- **Build System**: `pnpm` 工作區需要在多階段構建中正確處理模組依賴。
