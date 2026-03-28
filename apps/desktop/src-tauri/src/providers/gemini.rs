use async_trait::async_trait;
use serde::Deserialize;
use std::process::Stdio;
use tokio::process::Command;
use super::{CliProvider, RelayEvent};

pub struct GeminiProvider;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
#[allow(dead_code)]
pub enum GeminiStreamEvent {
    #[serde(rename = "chunk")]
    Chunk { content: String },
    #[serde(rename = "text")]
    Text { content: String },
    #[serde(rename = "thought")]
    Thought { content: String },
    #[serde(rename = "call")]
    Call { 
        tool: String, 
        args: Option<serde_json::Value> 
    },
    #[serde(rename = "response")]
    Response { 
        tool: String, 
        content: String 
    },
    #[serde(rename = "system")]
    System { session_id: String, model: Option<String> },
    #[serde(rename = "error")]
    Error { code: String, message: String },
    #[serde(rename = "usage")]
    Usage { tokens: u32, cost: f64 },
    #[serde(rename = "done")]
    Done,
}

#[async_trait]
impl CliProvider for GeminiProvider {
    fn name(&self) -> &str {
        "gemini"
    }

    async fn check_availability(&self) -> bool {
        Command::new("gemini")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    }

    fn build_command(&self, prompt: &str, session_id: Option<&str>, workspace: Option<&str>) -> Command {
        let mut cmd = Command::new("gemini");
        
        cmd.args([
            "-p", prompt,
            "--output-format", "stream-json"
        ]);

        if let Some(ws) = workspace {
            cmd.arg("--workspace");
            cmd.arg(ws);
        }

        if let Some(sid) = session_id {
            cmd.arg("--resume");
            cmd.arg(sid);
        }

        cmd
    }

    fn parse_line(&self, line: &str) -> Option<RelayEvent> {
        let event: GeminiStreamEvent = serde_json::from_str(line).ok()?;
        match event {
            GeminiStreamEvent::Chunk { content } | GeminiStreamEvent::Text { content } => {
                Some(RelayEvent::Text(content))
            }
            GeminiStreamEvent::Thought { content: _ } => {
                // Internal thought - not sent to frontend
                None
            }
            GeminiStreamEvent::System { session_id, model } => {
                Some(RelayEvent::System { session_id, model })
            }
            GeminiStreamEvent::Call { tool, args: _ } => {
                Some(RelayEvent::ToolCall { 
                    name: tool, 
                    completed: false, 
                    rejected: None 
                })
            }
            GeminiStreamEvent::Response { tool, content: _ } => {
                Some(RelayEvent::ToolCall { 
                    name: tool, 
                    completed: true, 
                    rejected: None // Gemini response doesn't explicitly state rejection in this schema
                })
            }
            GeminiStreamEvent::Error { code, message } => {
                Some(RelayEvent::Error { code, message })
            }
            GeminiStreamEvent::Usage { tokens: _, cost: _ } => {
                // Usage statistics - not currently sent to frontend
                None
            }
            GeminiStreamEvent::Done => {
                Some(RelayEvent::Done)
            }
        }
    }
}
