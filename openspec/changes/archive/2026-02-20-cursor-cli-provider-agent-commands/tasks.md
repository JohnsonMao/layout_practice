## 1. Core

- [x] 1.1 Add required `workspace` to RelayRequest in packages/core/src/types.ts and document that it is the workspace path passed as --workspace to CLI and used as spawn cwd

## 2. Provider: workspace and spawn cwd

- [x] 2.1 Use request.workspace for --workspace in buildArgs and buildStreamArgs and for spawn cwd in execute and executeStream

## 3. Provider: create-chat and list-models

- [x] 3.1 Add runCli(args, { timeoutMs, cwd? }) helper that spawns agent with args and returns { stdout, stderr, code } on close
- [x] 3.2 Implement createChat(workspace?) using runCli with agent create-chat and optional --workspace; return { chatId: stdout.trim() }; throw on non-zero or empty chatId
- [x] 3.3 Implement listModels() using runCli with agent models; parse stdout (skip "Available models", take segment before " - " per line); return string[]; throw on non-zero
- [x] 3.4 Define CursorCliProvider interface extending StreamingProvider with createChat and listModels; make createCursorCliProvider return CursorCliProvider; export CursorCliProvider from index

## 4. Tests

- [x] 4.1 Add tests for execute/executeStream: --workspace and spawn cwd from request.workspace
- [x] 4.2 Add tests for createChat (with/without workspace, failure) and listModels (success, failure) with mocked spawn
