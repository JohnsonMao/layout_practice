## Context

目前 `apps/relay-service` 中的 `context.ts` 與 `loader.ts` 對 Provider 與 Platform 的實現有強耦合，導致每新增一個 Provider/Platform 都需要修改這兩個檔案。本變更旨在解耦這種依賴，建立 `ProviderRegistry`，支援「宣告式配置 (registry.config.ts) + 自動探測 (Auto-discovery)」模式。

## Goals / Non-Goals

**Goals:**

- 導入插件註冊機制，實現 `apps` 與 `packages` 的解耦。
- 提供統一的宣告式配置入口，並支援 Workspace 自動掃描後備。
- 確保現有 `RelayProvider` 與 `Platform` 的介面兼容性。

**Non-Goals:**

- 移除現有的 `RelayContext` 功能。
- 改變現有的 `Discord/GitHub` 平台邏輯實現。

## Decisions

### 1. 導入 `ProviderRegistry` 模式
- **決定**: 在 `packages/core` 中定義 `ProviderRegistry` 介面與實作。
- **理由**: 提供統一的註冊點，使 Provider 能夠動態註冊，解除 `apps` 的直接 import 依賴。
- **替代方案**: 維持目前的硬編碼方式 (Rejected: 違反開閉原則，難以擴展)。

### 2. 混合型配置載入 (Registry + Auto-discovery)
- **決定**: Loader 優先讀取 `registry.config.ts`，未配置時自動掃描 workspace 目錄。
- **理由**: 同時滿足「靜態配置的需求 (桌面應用場景)」與「開發時的快速迭代 (自動發現)」。
- **替代方案**: 僅使用自動探測 (Rejected: 不利於打包與編譯最佳化)。

## Risks / Trade-offs

- **風險**: 動態載入可能會略微增加啟動時間。
- **緩解**: 透過 `turborepo` 的建構快取與動態載入最佳化來控制啟動效能。
- **Trade-off**: 增加了一層抽象，初期架構複雜度稍有提升，但長期維護成本顯著下降。
