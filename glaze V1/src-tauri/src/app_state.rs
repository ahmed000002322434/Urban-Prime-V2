use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

use crate::models::{PermissionState, UserPreferences};

#[derive(Clone)]
pub struct AppState {
    inner: Arc<InnerState>,
}

struct InnerState {
    paused: AtomicBool,
    observer_started: AtomicBool,
    vault_unlocked: AtomicBool,
    denied_apps: Mutex<Vec<String>>,
    last_window_handle: Mutex<Option<u64>>,
    permissions: Mutex<Option<PermissionState>>,
    preferences: Mutex<Option<UserPreferences>>,
    last_provider: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            inner: Arc::new(InnerState {
                paused: AtomicBool::new(false),
                observer_started: AtomicBool::new(false),
                vault_unlocked: AtomicBool::new(false),
                denied_apps: Mutex::new(Vec::new()),
                last_window_handle: Mutex::new(None),
                permissions: Mutex::new(None),
                preferences: Mutex::new(None),
                last_provider: Mutex::new(None),
            }),
        }
    }
}

impl AppState {
    pub fn is_paused(&self) -> bool {
        self.inner.paused.load(Ordering::SeqCst)
    }

    pub fn set_paused(&self, value: bool) {
        self.inner.paused.store(value, Ordering::SeqCst)
    }

    pub fn observer_started(&self) -> bool {
        self.inner.observer_started.load(Ordering::SeqCst)
    }

    pub fn mark_observer_started(&self) {
        self.inner.observer_started.store(true, Ordering::SeqCst)
    }

    pub fn set_vault_unlocked(&self, value: bool) {
        self.inner.vault_unlocked.store(value, Ordering::SeqCst)
    }

    pub fn set_denied_apps(&self, apps: Vec<String>) {
        let mut denied_apps = self.inner.denied_apps.lock().expect("denied apps lock");
        *denied_apps = apps;
    }

    pub fn denied_apps(&self) -> Vec<String> {
        self.inner
            .denied_apps
            .lock()
            .expect("denied apps lock")
            .clone()
    }

    pub fn update_settings(&self, permissions: PermissionState, preferences: UserPreferences) {
        let denied = permissions.denied_apps.clone();

        {
            let mut current_permissions = self.inner.permissions.lock().expect("permissions lock");
            *current_permissions = Some(permissions);
        }

        {
            let mut current_preferences = self.inner.preferences.lock().expect("preferences lock");
            *current_preferences = Some(preferences);
        }

        self.set_denied_apps(denied);
    }

    pub fn remember_window_handle(&self, handle: Option<u64>) {
        let mut current = self
            .inner
            .last_window_handle
            .lock()
            .expect("window handle lock");
        *current = handle;
    }

    pub fn last_window_handle(&self) -> Option<u64> {
        *self
            .inner
            .last_window_handle
            .lock()
            .expect("window handle lock")
    }

    pub fn scan_interval_ms(&self) -> u64 {
        self.inner
            .preferences
            .lock()
            .expect("preferences lock")
            .as_ref()
            .map(|preferences| preferences.scan_interval_ms)
            .unwrap_or(5000)
    }

    pub fn emergency_shortcut_enabled(&self) -> bool {
        self.inner
            .permissions
            .lock()
            .expect("permissions lock")
            .as_ref()
            .map(|permissions| permissions.emergency_shortcut_enabled)
            .unwrap_or(true)
    }

    pub fn remember_provider(&self, provider_kind: impl Into<String>) {
        let mut current_provider = self.inner.last_provider.lock().expect("provider lock");
        *current_provider = Some(provider_kind.into());
    }
}
