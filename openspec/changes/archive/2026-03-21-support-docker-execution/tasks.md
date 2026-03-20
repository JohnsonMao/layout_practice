## 1. 基礎架構配置

- [x] 1.1 在專案根目錄新增 `.dockerignore` 檔案，排除 `node_modules` 與 `.git` 等非必要的構建上下文。
- [x] 1.2 撰寫多階段構建的 `Dockerfile` 以落實「決策 1：使用多階段構建 (Multi-stage Build)」與滿足「Docker Image Construction」需求。
- [x] 1.3 在 `Dockerfile` 中實作「決策 2：在容器內使用非 root 使用者執行」，以達成「Container Isolation」要求。

## 2. 服務啟動與編排

- [x] 2.1 新增 `docker-compose.yml` 檔案以支援「Service Execution via Docker Compose」。
- [x] 2.2 在 `docker-compose.yml` 中實踐「決策 3：環境變數與卷軸掛載配置」，確保支援「Environment Variable Injection」與「External Configuration Mounting」。
- [x] 2.3 在 `docker-compose.yml` 中定義卷軸 (volumes) 以支援「Persistence Support」需求。

## 3. 驗證與驗收

- [x] 3.1 執行 Docker 構建指令，驗證映像檔是否能成功產出編譯後的 `relay-service` 產物。
- [x] 3.2 透過 `docker-compose up` 啟動服務，驗證其是否能正確載入 `.env` 配置。
- [x] 3.3 檢查容器內部行程權限，確認符合非 root 使用者執行的安全性目標。
