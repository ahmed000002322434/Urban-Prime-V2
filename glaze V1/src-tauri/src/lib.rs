mod app_state;
mod commands;
mod desktop;
mod models;
mod observation;
mod runtime;

use tauri::Manager;

use crate::app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
            }

            runtime::configure(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth_sign_in_email,
            commands::vault_unlock,
            commands::vault_store_key,
            commands::provider_test_connection,
            commands::observation_start,
            commands::observation_pause,
            commands::observation_resume,
            commands::observation_set_denylist,
            commands::capture_preview,
            commands::insight_generate,
            commands::action_apply,
            commands::settings_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
