use tauri::{AppHandle, Emitter};

use crate::{
    app_state::AppState,
    desktop::active_window_snapshot,
    models::{CaptureStatus, ContextSnapshot},
};

pub fn spawn_observer(app: AppHandle, state: AppState) {
    tauri::async_runtime::spawn(async move {
        let mut last_window_title = String::new();
        let mut last_emitted_at = std::time::Instant::now()
            .checked_sub(std::time::Duration::from_secs(10))
            .unwrap_or_else(std::time::Instant::now);

        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            if state.is_paused() {
                continue;
            }

            let snapshot = match active_window_snapshot() {
                Ok(snapshot) => snapshot,
                Err(error) => {
                    log::warn!("Observation loop could not read the active window: {error}");
                    continue;
                }
            };

            if should_ignore_snapshot(&state, &snapshot) {
                continue;
            }

            state.remember_window_handle(snapshot.window_handle);

            let due_for_scan =
                last_emitted_at.elapsed().as_millis() >= state.scan_interval_ms() as u128;
            let switched_window = snapshot.window_title != last_window_title;

            if !due_for_scan && !switched_window {
                continue;
            }

            let _ = app.emit("glaze://capture_status", CaptureStatus::new(true));
            let _ = app.emit("glaze://context_snapshot", snapshot.clone());
            let _ = app.emit("glaze://capture_status", CaptureStatus::new(false));

            last_window_title = snapshot.window_title.clone();
            last_emitted_at = std::time::Instant::now();
        }
    });
}

fn should_ignore_snapshot(state: &AppState, snapshot: &ContextSnapshot) -> bool {
    let denied_apps = state.denied_apps();

    denied_apps.iter().any(|entry| {
        let entry = entry.to_lowercase();
        snapshot.app_name.to_lowercase().contains(&entry)
            || snapshot.window_title.to_lowercase().contains(&entry)
    })
}
