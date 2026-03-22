## 1. 核心介面定義與 PluginRegistry 實作

- [x] 1.1 在 `packages/core` 定義 `PluginRegistry` 抽象介面，支援 `Provider` 與 `Platform`
- [x] 1.2 在 `packages/core` 實作 `PluginRegistry` 類別並處理插件的動態註冊與獲取

## 2. 插件載入器實作

- [x] 2.1 實作 `PluginLoader`，支援優先讀取 `registry.config.ts` 定義的 `Provider` 與 `Platform`
- [x] 2.2 實作 `PluginLoader` 的 Workspace 自動探測機制 (作為後備策略)

## 3. 整合重構與架構標準化

- [x] 3.1 統一 `packages/*` 下的 `package.json` 配置 (新增 `exports` 與標準化開發/生產環境指向)
- [x] 3.2 標準化各 `packages` 的 `tsup.config.ts` 設定，確保多格式輸出 (ESM/CJS) 與型別定義生成
- [x] 3.3 重構 `apps/relay-service/src/context.ts` 以使用 `PluginRegistry` 替換手動 Provider 初始化
- [x] 3.4 重構 `apps/relay-service/src/loader.ts` 以使用 `PluginLoader` 動態加載 Platform
- [x] 3.5 驗證重構後的相容性與開發體驗 (Dev Mode vs Build Mode)
