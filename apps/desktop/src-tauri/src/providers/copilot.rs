use async_trait::async_trait;
use std::process::Stdio;
use tokio::process::Command;
use super::{CliProvider, RelayEvent};

pub struct CopilotProvider;

#[async_trait]
impl CliProvider for CopilotProvider {
    fn name(&self) -> &str {
        "copilot"
    }

    async fn check_availability(&self) -> bool {
        // gh copilot is an extension, so we check gh first
        let gh_check = Command::new("gh")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false);

        if !gh_check {
            return false;
        }

        // Then check if copilot extension is installed
        let output = Command::new("gh")
            .args(["extension", "list"])
            .stdout(Stdio::piped())
            .spawn()
            .ok();

        if let Some(child) = output {
            if let Ok(output) = child.wait_with_output().await {
                return String::from_utf8_lossy(&output.stdout).contains("copilot");
            }
        }
        false
    }

    fn build_command(&self, prompt: &str, _session_id: Option<&str>, _workspace: Option<&str>) -> Command {
        let mut cmd = Command::new("gh");
        
        // Default to 'suggest' for general prompts
        // In a more advanced version, we could detect 'explain' or other subcommands
        cmd.args([
            "copilot", "suggest",
            "-t", "shell", // Default to shell type for command suggestions
            prompt
        ]);

        cmd
    }

    fn parse_line(&self, line: &str) -> Option<RelayEvent> {
        if line.is_empty() {
            return None;
        }

        // gh copilot suggest output is typically text-heavy
        // If it's valid JSON, we could try to parse it, but standard output is plain text
        if line.starts_with('{') {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(msg) = json.get("message").and_then(|m| m.as_str()) {
                    return Some(RelayEvent::Text(msg.to_string()));
                }
            }
        }

        // Fallback to plain text
        Some(RelayEvent::Text(line.to_string()))
    }
}
