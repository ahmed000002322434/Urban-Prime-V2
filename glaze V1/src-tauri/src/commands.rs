use tauri::{AppHandle, Emitter, State};

use crate::{
    app_state::AppState,
    desktop::{active_window_snapshot, apply_action},
    models::{
        ActionRequest, CaptureStatus, ContextSnapshot, OperationStatus, PermissionState,
        UserPreferences,
    },
    observation::spawn_observer,
    runtime,
};

#[tauri::command]
pub async fn auth_sign_in_email(email: String) -> OperationStatus {
    OperationStatus::ok(format!(
    "Account setup for {email} should be completed on the Glaze website before launching the desktop runtime."
  ))
}

#[tauri::command]
pub async fn vault_unlock(passphrase_hash: String, state: State<'_, AppState>) -> OperationStatus {
    if passphrase_hash.trim().is_empty() {
        return OperationStatus::error(
            "Glaze needs a vault passphrase before unlocking provider keys.",
        );
    }

    state.set_vault_unlocked(true);
    OperationStatus::ok("Vault unlocked for this desktop session.")
}

#[tauri::command]
pub async fn vault_store_key(
    provider_id: String,
    provider_kind: String,
    state: State<'_, AppState>,
) -> OperationStatus {
    state.remember_provider(format!("{provider_kind}:{provider_id}"));
    OperationStatus::ok("Provider metadata stored for the current desktop session.")
}

#[tauri::command]
pub async fn provider_test_connection(
    provider_id: String,
    provider_kind: String,
    model: String,
    base_url: Option<String>,
    supports_vision: bool,
) -> OperationStatus {
    OperationStatus::ok(format!(
    "Provider {provider_kind}/{provider_id} with model `{model}` is configured in the desktop adapter. Vision support: {supports_vision}. Base URL: {}",
    base_url.unwrap_or_else(|| "default".to_string())
  ))
}

#[tauri::command]
pub async fn observation_start(app: AppHandle, state: State<'_, AppState>) -> OperationStatus {
    if state.observer_started() {
        return OperationStatus::ok("Passive observation is already active.");
    }

    state.mark_observer_started();
    spawn_observer(app, state.inner().clone());

    OperationStatus::ok("Passive observation is now running in the desktop runtime.")
}

#[tauri::command]
pub async fn observation_pause(app: AppHandle, state: State<'_, AppState>) -> OperationStatus {
    runtime::set_observation_paused(&app, state.inner(), true, "Passive observation paused.");
    OperationStatus::ok("Passive observation paused.")
}

#[tauri::command]
pub async fn observation_resume(app: AppHandle, state: State<'_, AppState>) -> OperationStatus {
    runtime::set_observation_paused(&app, state.inner(), false, "Passive observation resumed.");
    OperationStatus::ok("Passive observation resumed.")
}

#[tauri::command]
pub async fn observation_set_denylist(
    denied_apps: Vec<String>,
    state: State<'_, AppState>,
) -> OperationStatus {
    state.set_denied_apps(denied_apps);
    OperationStatus::ok("Denylist updated for passive observation.")
}

#[tauri::command]
pub async fn capture_preview(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ContextSnapshot, String> {
    let _ = app.emit("glaze://capture_status", CaptureStatus::new(true));
    let snapshot = active_window_snapshot();
    let _ = app.emit("glaze://capture_status", CaptureStatus::new(false));
    if let Ok(snapshot) = snapshot.as_ref() {
        state.remember_window_handle(snapshot.window_handle);
    }
    snapshot
}

#[tauri::command]
pub async fn insight_generate() -> OperationStatus {
    OperationStatus::ok("Insight generation is orchestrated in the desktop UI layer.")
}

#[tauri::command]
pub async fn action_apply(request: ActionRequest, state: State<'_, AppState>) -> OperationStatus {
    apply_action(
        &request.action_type,
        &request.payload,
        state.last_window_handle(),
    )
}

#[tauri::command]
pub async fn settings_save(
    permissions: PermissionState,
    preferences: UserPreferences,
    state: State<'_, AppState>,
) -> OperationStatus {
    state.update_settings(permissions, preferences);
    OperationStatus::ok("Desktop settings saved.")
}
