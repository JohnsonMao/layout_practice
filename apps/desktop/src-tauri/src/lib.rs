use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

// 範例資料結構
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AppStatus {
    pub is_running: bool,
    pub version: String,
}

#[tauri::command]
fn get_app_status(app_handle: tauri::AppHandle) -> AppStatus {
    let status = AppStatus {
        is_running: true,
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    
    // 發送事件示範
    let _ = app_handle.emit("status_checked", status.clone());
    
    status
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .invoke_handler(tauri::generate_handler![get_app_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
