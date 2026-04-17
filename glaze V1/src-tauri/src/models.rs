use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationStatus {
    pub ok: bool,
    pub message: String,
}

impl OperationStatus {
    pub fn ok(message: impl Into<String>) -> Self {
        Self {
            ok: true,
            message: message.into(),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            ok: false,
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextSnapshot {
    pub id: String,
    pub timestamp: String,
    pub app_name: String,
    pub window_title: String,
    pub window_handle: Option<u64>,
    pub process_id: Option<u32>,
    pub process_path: Option<String>,
    pub window_bounds: WindowBounds,
    pub screenshot_data_url: Option<String>,
    pub extracted_text: Option<String>,
    pub context_summary: Option<String>,
}

impl ContextSnapshot {
    pub fn new(
        app_name: impl Into<String>,
        window_title: impl Into<String>,
        window_handle: Option<u64>,
        process_id: Option<u32>,
        bounds: WindowBounds,
        process_path: Option<String>,
    ) -> Self {
        let app_name = app_name.into();
        let window_title = window_title.into();

        Self {
            id: format!("snapshot_{}", Uuid::new_v4().simple()),
            timestamp: Utc::now().to_rfc3339(),
            context_summary: Some(format!(
                "Focused app: {app_name}\nWindow title: {window_title}\nProcess id: {}\nBounds: {}x{} at {}, {}",
                process_id
                    .map(|value| value.to_string())
                    .unwrap_or_else(|| "unknown".to_string()),
                bounds.width,
                bounds.height,
                bounds.x,
                bounds.y
            )),
            app_name,
            window_title,
            window_handle,
            process_id,
            process_path,
            window_bounds: bounds,
            screenshot_data_url: None,
            extracted_text: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureStatus {
    pub active: bool,
    pub timestamp: String,
}

impl CaptureStatus {
    pub fn new(active: bool) -> Self {
        Self {
            active,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeEvent {
    pub kind: String,
    pub message: String,
    pub paused: bool,
    pub window_visible: bool,
}

impl RuntimeEvent {
    pub fn new(
        kind: impl Into<String>,
        message: impl Into<String>,
        paused: bool,
        window_visible: bool,
    ) -> Self {
        Self {
            kind: kind.into(),
            message: message.into(),
            paused,
            window_visible,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRequest {
    pub card_id: String,
    pub action_type: String,
    pub payload: String,
    pub source_app: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PermissionState {
    pub observation_consent: bool,
    pub input_automation_consent: bool,
    pub emergency_shortcut_enabled: bool,
    pub capture_indicator_enabled: bool,
    pub denied_apps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub scan_interval_ms: u64,
    pub orb_dock: String,
    pub auto_expand: bool,
    pub pulse_intensity: String,
    pub reduce_motion: bool,
}
