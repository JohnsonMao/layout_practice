## Why

目前的架構將 Provider 初始化與平台載入邏輯強耦合在 `apps/relay-service` 的 `context.ts` 與 `loader.ts` 中。每新增一個 Provider 或 Platform，都必須手動修改這些檔案，這不僅增加維護成本，也阻礙了未來桌面應用的插件化擴展。

## What Changes

- 建立統一的 `PluginRegistry` 抽象介面，涵蓋 `Provider` 與 `Platform` 的動態註冊機制。
- 重構 `RelayContext` 與 `PlatformLoader`，支援從 `registry.config.ts` (優先) 或自動掃描 (後備) 加載所有插件。
- 規範所有 `packages/*` 的 `package.json` (exports 配置) 與 `tsup.config.ts`，確保建構與開發體驗一致。

## Capabilities

### New Capabilities

- `plugin-registry`: 提供統一的 `Provider` 與 `Platform` 註冊與動態加載機制。
- `plugin-loader`: 實現支援宣告式配置與自動探測的插件載入器。

### Modified Capabilities

- `core-relay`: 調整其對 Provider 與 Platform 的依賴方式，由硬依賴改為透過 Registry 獲取。

## Impact

- 影響 `apps/relay-service` 中的初始化邏輯 (`context.ts`, `loader.ts`)。
- 影響 `packages/core` 中對於 Provider 與 Platform 的型別定義與介面交互。
- 將完全解除 `apps` 對 `packages/provider/*` 與 `packages/platform/*` 的直接 import 耦合。
