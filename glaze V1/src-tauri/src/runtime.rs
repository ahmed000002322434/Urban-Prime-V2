use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Result,
};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

use crate::{app_state::AppState, models::RuntimeEvent};

const MENU_SHOW: &str = "show_glaze";
const MENU_HIDE: &str = "hide_glaze";
const MENU_TOGGLE_PAUSE: &str = "toggle_pause";
const MENU_QUIT: &str = "quit_glaze";
const EMERGENCY_SHORTCUT: &str = "ctrl+shift+g";

pub fn configure(app: &mut App) -> Result<()> {
    let show_item = MenuItem::with_id(app, MENU_SHOW, "Show Glaze", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, MENU_HIDE, "Hide Glaze", true, None::<&str>)?;
    let pause_item = MenuItem::with_id(
        app,
        MENU_TOGGLE_PAUSE,
        "Pause / Resume Observation",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, MENU_QUIT, "Quit Glaze", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &pause_item, &quit_item])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .menu_on_left_click(false)
        .tooltip("Glaze desktop companion")
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let state = app.state::<AppState>();
                show_main_window(&app);
                emit_runtime_event(
                    &app,
                    &state,
                    "window_shown",
                    "Glaze restored from the system tray.",
                    true,
                );
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;

    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_shortcuts([EMERGENCY_SHORTCUT])?
            .with_handler(|app, shortcut, event| {
                if event.state == ShortcutState::Pressed
                    && shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyG)
                {
                    let state = app.state::<AppState>();
                    if !state.emergency_shortcut_enabled() {
                        emit_runtime_event(
                            app,
                            &state,
                            "shortcut_ignored",
                            "Emergency shortcut is disabled in Glaze settings.",
                            is_main_window_visible(app),
                        );
                        return;
                    }

                    toggle_emergency_mode(app, &state);
                }
            })
            .build(),
    )?;

    Ok(())
}

pub fn set_observation_paused(
    app: &AppHandle,
    state: &AppState,
    paused: bool,
    message: impl Into<String>,
) {
    state.set_paused(paused);
    emit_runtime_event(
        app,
        state,
        "pause_changed",
        message,
        is_main_window_visible(app),
    );
}

fn handle_menu_event(app: &AppHandle, menu_id: &str) {
    let state = app.state::<AppState>();

    match menu_id {
        MENU_SHOW => {
            show_main_window(app);
            emit_runtime_event(
                app,
                &state,
                "window_shown",
                "Glaze restored from the tray menu.",
                true,
            );
        }
        MENU_HIDE => {
            hide_main_window(app);
            emit_runtime_event(
                app,
                &state,
                "window_hidden",
                "Glaze hidden to the tray menu.",
                false,
            );
        }
        MENU_TOGGLE_PAUSE => {
            let paused = !state.is_paused();
            state.set_paused(paused);
            emit_runtime_event(
                app,
                &state,
                "pause_changed",
                if paused {
                    "Passive observation paused from the tray."
                } else {
                    "Passive observation resumed from the tray."
                },
                is_main_window_visible(app),
            );
        }
        MENU_QUIT => app.exit(0),
        _ => {}
    }
}

fn toggle_emergency_mode(app: &AppHandle, state: &AppState) {
    if is_main_window_visible(app) {
        state.set_paused(true);
        hide_main_window(app);
        emit_runtime_event(
            app,
            state,
            "window_hidden",
            "Emergency shortcut engaged. Glaze is hidden and paused.",
            false,
        );
    } else {
        state.set_paused(false);
        show_main_window(app);
        emit_runtime_event(
            app,
            state,
            "window_shown",
            "Emergency shortcut released. Glaze is visible and resumed.",
            true,
        );
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
    }
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn is_main_window_visible(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(true)
}

fn emit_runtime_event(
    app: &AppHandle,
    state: &AppState,
    kind: impl Into<String>,
    message: impl Into<String>,
    window_visible: bool,
) {
    let payload = RuntimeEvent::new(kind, message, state.is_paused(), window_visible);
    let _ = app.emit("glaze://runtime_event", payload);
}
