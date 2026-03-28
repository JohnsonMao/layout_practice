use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Window,
};
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, collect_events, Builder};

mod providers;
mod engine;

use providers::{
    cursor::CursorProvider, 
    gemini::GeminiProvider, 
    copilot::CopilotProvider, 
    CliProvider, 
    RelayEvent
};

// 範例資料結構
#[derive(serde::Serialize, serde::Deserialize, Clone, specta::Type)]
pub struct AppStatus {
    pub is_running: bool,
    pub version: String,
}

#[tauri::command]
#[specta::specta]
fn get_app_status(app_handle: tauri::AppHandle) -> AppStatus {
    let status = AppStatus {
        is_running: true,
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    
    // 發送事件示範
    let _ = app_handle.emit("status_checked", status.clone());
    
    status
}

#[tauri::command]
#[specta::specta]
async fn run_cli_relay(
    window: Window<tauri::Wry>,
    provider_name: String,
    prompt: String,
    session_id: Option<String>,
    workspace: Option<String>,
) -> Result<(), String> {
    let provider: Box<dyn CliProvider> = match provider_name.as_str() {
        "cursor" => Box::new(CursorProvider),
        "gemini" => Box::new(GeminiProvider),
        "copilot" => Box::new(CopilotProvider),
        _ => return Err(format!("Unknown provider: {}", provider_name)),
    };

    engine::run_provider_relay(window, provider, prompt, session_id, workspace).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![get_app_status, run_cli_relay])
        .events(collect_events![RelayEvent]);

    #[cfg(debug_assertions)]
    builder
        .export(&Typescript::default(), "../src/types/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // 建立主菜單
            let quit_i = MenuItem::with_id(app, "quit", "Quit Agent Relay", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;
            app.set_menu(menu)?;

            // 處理菜單點擊
            app.on_menu_event(move |app, event| {
                if event.id == "quit" {
                    app.exit(0);
                }
            });

            // 建立系統列 (Tray)
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
