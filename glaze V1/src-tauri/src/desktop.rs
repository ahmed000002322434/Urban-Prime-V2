use crate::models::{ContextSnapshot, OperationStatus, WindowBounds};

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use arboard::Clipboard;
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
    use image::{imageops::FilterType, DynamicImage, ImageBuffer, ImageFormat, Rgba};
    use std::{ffi::c_void, io::Cursor, mem::size_of, thread, time::Duration};
    use windows::{
        core::PWSTR,
        Win32::{
            Foundation::{HWND, RECT},
            Graphics::Gdi::{
                BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
                GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
                CAPTUREBLT, DIB_RGB_COLORS, HGDIOBJ, SRCCOPY,
            },
            UI::{
                Input::KeyboardAndMouse::{
                    keybd_event, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
                    KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, VK_CONTROL,
                },
                WindowsAndMessaging::{
                    GetForegroundWindow, GetWindowRect, GetWindowTextLengthW, GetWindowTextW,
                    GetWindowThreadProcessId, SetForegroundWindow, ShowWindow, SW_RESTORE,
                },
            },
        },
    };

    fn read_window_title(hwnd: HWND) -> String {
        unsafe {
            let title_len = GetWindowTextLengthW(hwnd) as usize;

            if title_len == 0 {
                return "Focused Window".to_string();
            }

            let mut buffer = vec![0u16; title_len + 1];
            let written = GetWindowTextW(hwnd, PWSTR(buffer.as_mut_ptr()), (title_len + 1) as i32);

            String::from_utf16_lossy(&buffer[..written as usize])
        }
    }

    fn capture_window_region(bounds: &WindowBounds) -> Result<String, String> {
        let width = bounds.width as i32;
        let height = bounds.height as i32;

        if width <= 0 || height <= 0 {
            return Err("Active window bounds are empty.".to_string());
        }

        unsafe {
            let desktop = HWND(0);
            let screen_dc = GetDC(desktop);
            if screen_dc.0 == 0 {
                return Err("Glaze could not acquire the desktop device context.".to_string());
            }

            let memory_dc = CreateCompatibleDC(Some(screen_dc));
            if memory_dc.0 == 0 {
                let _ = ReleaseDC(desktop, screen_dc);
                return Err("Glaze could not create a compatible capture context.".to_string());
            }

            let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
            if bitmap.0 == 0 {
                let _ = DeleteDC(memory_dc);
                let _ = ReleaseDC(desktop, screen_dc);
                return Err("Glaze could not allocate a window capture bitmap.".to_string());
            }

            let previous = SelectObject(memory_dc, HGDIOBJ(bitmap.0));
            let copied = BitBlt(
                memory_dc,
                0,
                0,
                width,
                height,
                Some(screen_dc),
                bounds.x,
                bounds.y,
                SRCCOPY | CAPTUREBLT,
            )
            .as_bool();

            if !copied {
                let _ = SelectObject(memory_dc, previous);
                let _ = DeleteObject(HGDIOBJ(bitmap.0));
                let _ = DeleteDC(memory_dc);
                let _ = ReleaseDC(desktop, screen_dc);
                return Err(
                    "Glaze could not copy the active window from the desktop surface.".to_string(),
                );
            }

            let mut bitmap_info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    biHeight: -height,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };

            let mut pixels = vec![0u8; (width as usize) * (height as usize) * 4];
            let copied_rows = GetDIBits(
                memory_dc,
                bitmap,
                0,
                height as u32,
                Some(pixels.as_mut_ptr() as *mut c_void),
                &mut bitmap_info,
                DIB_RGB_COLORS,
            );

            let _ = SelectObject(memory_dc, previous);
            let _ = DeleteObject(HGDIOBJ(bitmap.0));
            let _ = DeleteDC(memory_dc);
            let _ = ReleaseDC(desktop, screen_dc);

            if copied_rows == 0 {
                return Err(
                    "Glaze captured the window surface but could not read the bitmap pixels."
                        .to_string(),
                );
            }

            for pixel in pixels.chunks_exact_mut(4) {
                pixel.swap(0, 2);
                if pixel[3] == 0 {
                    pixel[3] = 255;
                }
            }

            let image =
                ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(bounds.width, bounds.height, pixels)
                    .ok_or_else(|| {
                        "Glaze could not assemble the captured bitmap into an image.".to_string()
                    })?;

            let dynamic_image = DynamicImage::ImageRgba8(image);
            let optimized = if bounds.width > 1440 || bounds.height > 900 {
                dynamic_image.resize(1440, 900, FilterType::Triangle)
            } else {
                dynamic_image
            };

            let mut cursor = Cursor::new(Vec::new());
            optimized
                .write_to(&mut cursor, ImageFormat::Png)
                .map_err(|error| format!("Glaze could not encode the capture as PNG: {error}"))?;

            Ok(format!(
                "data:image/png;base64,{}",
                BASE64.encode(cursor.into_inner())
            ))
        }
    }

    fn focus_target_window(window_handle: Option<u64>) -> Result<(), String> {
        let Some(raw_handle) = window_handle else {
            return Err("Glaze has no remembered target window to apply into yet.".to_string());
        };

        let hwnd = HWND(raw_handle as isize);
        if hwnd.0 == 0 {
            return Err("Glaze remembered an invalid target window handle.".to_string());
        }

        unsafe {
            let _ = ShowWindow(hwnd, SW_RESTORE);
            thread::sleep(Duration::from_millis(70));

            if !SetForegroundWindow(hwnd).as_bool() {
                return Err(
                    "Glaze could not bring the target window back to the foreground.".to_string(),
                );
            }
        }

        thread::sleep(Duration::from_millis(85));
        Ok(())
    }

    fn stage_clipboard(payload: &str) -> Result<(Clipboard, Option<String>), String> {
        let mut clipboard =
            Clipboard::new().map_err(|_| "Glaze could not access the clipboard.".to_string())?;
        let previous = clipboard.get_text().ok();
        clipboard
            .set_text(payload.to_string())
            .map_err(|_| "Glaze could not stage clipboard content.".to_string())?;

        Ok((clipboard, previous))
    }

    fn restore_clipboard(mut clipboard: Clipboard, previous: Option<String>) {
        if let Some(text) = previous {
            let _ = clipboard.set_text(text);
        }
    }

    fn send_paste_shortcut() {
        unsafe {
            keybd_event(VK_CONTROL.0 as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
            keybd_event(b'V', 0, KEYBD_EVENT_FLAGS(0), 0);
            keybd_event(b'V', 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL.0 as u8, 0, KEYEVENTF_KEYUP, 0);
        }
    }

    fn paste_payload(payload: &str, success_message: &str) -> OperationStatus {
        let (clipboard, previous) = match stage_clipboard(payload) {
            Ok(result) => result,
            Err(message) => return OperationStatus::error(message),
        };

        thread::sleep(Duration::from_millis(55));
        send_paste_shortcut();
        thread::sleep(Duration::from_millis(120));
        restore_clipboard(clipboard, previous);

        OperationStatus::ok(success_message)
    }

    fn send_unicode_text(payload: &str) -> bool {
        let mut inputs = Vec::with_capacity(payload.encode_utf16().count() * 2);

        for unit in payload.encode_utf16() {
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: Default::default(),
                        wScan: unit,
                        dwFlags: KEYEVENTF_UNICODE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: Default::default(),
                        wScan: unit,
                        dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }

        unsafe { SendInput(&inputs, size_of::<INPUT>() as i32) as usize == inputs.len() }
    }

    pub fn active_window_snapshot() -> Result<ContextSnapshot, String> {
        unsafe {
            let hwnd = GetForegroundWindow();

            if hwnd.0 == 0 {
                return Ok(ContextSnapshot::new(
                    "Desktop Session",
                    "No active window found",
                    None,
                    None,
                    WindowBounds::default(),
                    None,
                ));
            }

            let title = read_window_title(hwnd);
            let mut rect = RECT::default();
            let rect_result = GetWindowRect(hwnd, &mut rect);

            if !rect_result.as_bool() {
                return Err("Unable to read the active window bounds.".to_string());
            }

            let mut process_id = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));

            let width = (rect.right - rect.left).max(0) as u32;
            let height = (rect.bottom - rect.top).max(0) as u32;
            let window_bounds = WindowBounds {
                x: rect.left,
                y: rect.top,
                width,
                height,
            };
            let screenshot = capture_window_region(&window_bounds).ok();
            let app_name = title
                .split(" - ")
                .last()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or("Focused Window")
                .to_string();

            let mut snapshot = ContextSnapshot::new(
                app_name,
                title,
                Some(hwnd.0 as u64),
                Some(process_id),
                window_bounds,
                None,
            );
            snapshot.screenshot_data_url = screenshot;

            if snapshot.screenshot_data_url.is_none() {
                snapshot.context_summary = snapshot.context_summary.map(|summary| {
                    format!("{summary}\nVisual capture: unavailable in the current window state")
                });
            }

            Ok(snapshot)
        }
    }

    pub fn apply_action(
        action_type: &str,
        payload: &str,
        window_handle: Option<u64>,
    ) -> OperationStatus {
        match action_type {
            "copy" => {
                let mut clipboard = match Clipboard::new() {
                    Ok(clipboard) => clipboard,
                    Err(_) => {
                        return OperationStatus::error("Glaze could not access the clipboard.")
                    }
                };

                if clipboard.set_text(payload.to_string()).is_ok() {
                    OperationStatus::ok("Copied to the system clipboard.")
                } else {
                    OperationStatus::error("Glaze could not copy to the system clipboard.")
                }
            }
            "insert" => {
                if let Err(message) = focus_target_window(window_handle) {
                    return OperationStatus::error(message);
                }

                if payload.chars().count() <= 500 && send_unicode_text(payload) {
                    OperationStatus::ok("Inserted directly into the active app.")
                } else {
                    paste_payload(
                        payload,
                        "Direct typing failed, so Glaze pasted the content instead.",
                    )
                }
            }
            "replace_selection" => {
                if let Err(message) = focus_target_window(window_handle) {
                    return OperationStatus::error(message);
                }

                paste_payload(
                    payload,
                    "Replaced the active selection via clipboard paste.",
                )
            }
            _ => OperationStatus::error("Unknown action type."),
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_impl {
    use super::*;

    pub fn active_window_snapshot() -> Result<ContextSnapshot, String> {
        Ok(ContextSnapshot::new(
            "Desktop Session",
            "Glaze desktop preview",
            None,
            None,
            WindowBounds::default(),
            None,
        ))
    }

    pub fn apply_action(
        action_type: &str,
        _payload: &str,
        _window_handle: Option<u64>,
    ) -> OperationStatus {
        OperationStatus::ok(format!(
            "The `{action_type}` action is stubbed outside Windows in this preview build."
        ))
    }
}

pub use windows_impl::{active_window_snapshot, apply_action};
