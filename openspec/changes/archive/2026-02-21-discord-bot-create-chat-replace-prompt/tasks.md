## 1. Thread session store 擴充 model

- [x] 1.1 在 thread_sessions 表新增 model 欄位（TEXT、可為 NULL），並在 setSession 簽名與實作中支援選填 model
- [x] 1.2 在 getSession 回傳型別與實作中包含選填 model，供 follow-up 傳入 runStream options

## 2. Discord bot：新增 /create-chat 指令與處理流程

- [x] 2.1 新增 create-chat 指令定義（title 必填，workspace、model 選填），並在 deploy 時註冊、從 commands 匯出
- [x] 2.2 實作 handleCreateChat：建立 Public Thread（名稱為 title，必要時截斷）、呼叫 provider.createChat(workspace)、setSession(threadId, chatId, workspace, model)、在 Thread 內發送顯示 model 與 workspace 的訊息；失敗時在 Thread 內回覆錯誤且不寫入 session
- [x] 2.3 在 InteractionCreate 中處理 commandName === 'create-chat'，執行 handleCreateChat（含 rate limit、頻道/thread 檢查）
- [x] 2.4 更新 follow-up 流程：從 getSession 取得 model 時，在 runStream 的 request.options 中帶入 model

## 3. Discord bot：移除 /prompt

- [x] 3.1 移除 prompt 指令定義與註冊，從 commands 匯出中移除 prompt，改為只匯出 create-chat
- [x] 3.2 移除 handlePrompt 及 InteractionCreate 中對 'prompt' 的處理
