use async_trait::async_trait;
use serde::Deserialize;
use std::process::Stdio;
use tokio::process::Command;
use super::{CliProvider, RelayEvent};

pub struct CursorProvider;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum CursorStreamEvent {
    #[serde(rename = "system")]
    System { session_id: String, model: Option<String> },
    #[serde(rename = "assistant")]
    Assistant { message: AssistantMessage },
    #[serde(rename = "tool_call")]
    ToolCall { 
        subtype: String, 
        tool_call: Option<serde_json::Value> 
    },
    #[serde(rename = "user")]
    User,
    #[serde(rename = "result")]
    Result,
    #[serde(rename = "thinking")]
    Thinking,
}

#[derive(Debug, Deserialize)]
pub struct AssistantMessage {
    pub content: Vec<Content>,
}

#[derive(Debug, Deserialize)]
pub struct Content {
    pub text: String,
}

#[async_trait]
impl CliProvider for CursorProvider {
    fn name(&self) -> &str {
        "cursor"
    }

    async fn check_availability(&self) -> bool {
        Command::new("agent")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    }

    fn build_command(&self, prompt: &str, session_id: Option<&str>, workspace: Option<&str>) -> Command {
        let mut cmd = Command::new("agent");
        let ws = workspace.unwrap_or(".");
        
        cmd.args([
            "-p", prompt,
            "--model", "Auto",
            "--workspace", ws,
            "--output-format", "stream-json",
            "--force", "--approve-mcps", "--trust"
        ]);

        if let Some(sid) = session_id {
            cmd.arg("--resume");
            cmd.arg(sid);
        }

        cmd
    }

    fn parse_line(&self, line: &str) -> Option<RelayEvent> {
        let event: CursorStreamEvent = serde_json::from_str(line).ok()?;
        match event {
            CursorStreamEvent::System { session_id, model } => {
                Some(RelayEvent::System { session_id, model })
            }
            CursorStreamEvent::Assistant { message } => {
                let text = message.content.first()?.text.clone();
                Some(RelayEvent::Text(text))
            }
            CursorStreamEvent::ToolCall { subtype, tool_call } => {
                let name = tool_call.as_ref()
                    .and_then(|tc| tc.as_object())
                    .and_then(|obj| obj.keys().next())
                    .cloned()
                    .unwrap_or_else(|| "tool".to_string());
                
                let completed = subtype == "completed";
                let rejected = if completed {
                    tool_call.as_ref()
                        .and_then(|tc| tc.get(&name))
                        .and_then(|tc_val| tc_val.get("result"))
                        .and_then(|res| res.get("rejected"))
                        .and_then(|rej| rej.as_bool())
                } else {
                    None
                };

                Some(RelayEvent::ToolCall { name, completed, rejected })
            }
            _ => None,
        }
    }
}
