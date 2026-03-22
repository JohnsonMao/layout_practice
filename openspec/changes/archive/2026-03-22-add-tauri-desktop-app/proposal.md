## Why

當前的 `agent-relay` 依賴於命令行或聊天平台（Discord/GitHub）進行交互。引入桌面應用程式（Tauri）能提供更直觀的配置界面、即時的狀態監控，並利用 Rust 後端提供比 Node.js 更高效的系統級整合（如進程管理與本地檔案存取），同時保持極小的安裝包體積。

## What Changes

- **新增 `apps/desktop`**：建立一個基於 Tauri (Rust) + React (TypeScript) + Vite 的桌面端應用程式。
- **更新工作區配置**：修改 `pnpm-workspace.yaml` 與 `turbo.json` 以納入新應用並定義構建流水線。
- **整合 `packages/core`**：桌面端前端將直接引用 core 套件中的型別與邏輯。
- **建立型別自動化同步**：配置 Rust (Specta/ts-rs) 以自動生成對應的 TypeScript 型別定義。

## Capabilities

### New Capabilities

- `desktop-shell`: 定義桌面端的基礎視窗行為、原生選單、系統列（Tray）功能以及更新機制。
- `desktop-ipc-bridge`: 定義前端 TypeScript 與 Rust 後端之間的通訊合約、指令（Commands）與事件（Events）架構。

### Modified Capabilities

(無)

## Impact

- **Affected code**: 
  - `pnpm-workspace.yaml` (已修改)
  - `turbo.json` (新增桌面端任務配置)
  - `packages/core` (可能需要微調型別以相容於 Rust 序列化)
- **Dependencies**: 新增 Rust 工具鏈依賴與 Tauri 相關的 npm 套件。
- **Systems**: 新增桌面端發行版構建流程。
