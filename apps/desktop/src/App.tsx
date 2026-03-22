import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
// 假設生成的型別路徑
// import type { AppStatus } from "./types/generated"; 
import "./App.css";

function App() {
  const [status, setStatus] = useState<{ is_running: boolean, version: String } | null>(null);

  useEffect(() => {
    // 呼叫 Rust 指令獲取初始狀態
    invoke<{ is_running: boolean, version: String }>("get_app_status").then(setStatus);

    // 監聽 Rust 發送的事件
    const unlisten = listen<{ is_running: boolean, version: String }>("status_checked", (event) => {
      console.log("Status checked event received:", event.payload);
      setStatus(event.payload);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <main className="container">
      <h1>Agent Relay Desktop</h1>
      
      <div className="card">
        <h2>System Status</h2>
        {status ? (
          <div>
            <p>Version: <strong>{status.version}</strong></p>
            <p>Status: <span style={{ color: status.is_running ? 'green' : 'red' }}>
              {status.is_running ? 'Running' : 'Stopped'}
            </span></p>
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </div>

      <div className="card">
        <button onClick={() => invoke("get_app_status").then(setStatus)}>
          Refresh Status
        </button>
      </div>
    </main>
  );
}

export default App;
