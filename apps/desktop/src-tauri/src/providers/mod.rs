use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Clone, Type, tauri_specta::Event)]
#[serde(tag = "type", content = "data")]
pub enum RelayEvent {
    #[serde(rename = "text")]
    Text(String),
    #[serde(rename = "system")]
    System { session_id: String, model: Option<String> },
    #[serde(rename = "tool_call")]
    ToolCall { name: String, completed: bool, rejected: Option<bool> },
    #[serde(rename = "error")]
    Error { code: String, message: String },
    #[serde(rename = "done")]
    Done,
}

#[async_trait]
pub trait CliProvider: Send + Sync {
    /// Returns the provider name (e.g., "cursor", "copilot")
    fn name(&self) -> &str;

    /// Checks if the provider CLI is available in the system
    async fn check_availability(&self) -> bool;

    /// Builds the CLI command and arguments
    fn build_command(&self, prompt: &str, session_id: Option<&str>, workspace: Option<&str>) -> tokio::process::Command;

    /// Parses a single line from the CLI output into a RelayEvent
    fn parse_line(&self, line: &str) -> Option<RelayEvent>;
}

pub mod cursor;
pub mod gemini;
pub mod copilot;
// pub mod claude;
