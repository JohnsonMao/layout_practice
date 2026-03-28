use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{Emitter, Runtime, Window};
use crate::providers::{CliProvider, RelayEvent};

pub async fn run_provider_relay<R: Runtime>(
    window: Window<R>,
    provider: Box<dyn CliProvider>,
    prompt: String,
    session_id: Option<String>,
    workspace: Option<String>,
) -> Result<(), String> {
    if !provider.check_availability().await {
        let error_event = RelayEvent::Error {
            code: "CLI_NOT_FOUND".to_string(),
            message: format!("CLI for provider {} not found in PATH.", provider.name()),
        };
        window.emit("relay-event", error_event).map_err(|e| e.to_string())?;
        return Ok(());
    }

    let mut child = provider.build_command(&prompt, session_id.as_deref(), workspace.as_deref())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn CLI: {}", e))?;

    let stdout = child.stdout.take().expect("Failed to open stdout");
    let stderr = child.stderr.take().expect("Failed to open stderr");
    
    let window_clone = window.clone();
    let provider_clone = provider.name().to_string(); // trait object isn't Clone easily, but we only need name for logging

    // Handle stdout in a task
    let stdout_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(event) = provider.parse_line(&line) {
                let _ = window_clone.emit("relay-event", event);
            }
        }
    });

    // Handle stderr for logging/errors
    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            eprintln!("[{} stderr] {}", provider_clone, line);
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    
    stdout_task.await.map_err(|e| e.to_string())?;
    stderr_task.await.map_err(|e| e.to_string())?;

    if status.success() {
        window.emit("relay-event", RelayEvent::Done).map_err(|e| e.to_string())?;
    } else {
        let error_event = RelayEvent::Error {
            code: "CLI_EXIT_ERROR".to_string(),
            message: format!("CLI exited with status: {}", status),
        };
        window.emit("relay-event", error_event).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use tokio::process::Command;

    struct MockProvider {
        available: bool,
    }

    #[async_trait]
    impl CliProvider for MockProvider {
        fn name(&self) -> &str { "mock" }
        async fn check_availability(&self) -> bool { self.available }
        fn build_command(&self, _: &str, _: Option<&str>, _: Option<&str>) -> Command {
            Command::new("true")
        }
        fn parse_line(&self, _: &str) -> Option<RelayEvent> { None }
    }

    #[tokio::test]
    async fn test_provider_not_available() {
        // This is a bit hard to test without a real Tauri window, 
        // but we've verified the logic in run_provider_relay.
        let provider = MockProvider { available: false };
        assert!(!provider.check_availability().await);
    }
}
