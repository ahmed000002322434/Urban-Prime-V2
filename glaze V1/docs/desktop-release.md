# Desktop Release Checklist

## Goal

Ship Glaze as a normal downloadable Windows application that users can install and launch like any other desktop product.

## Prerequisites

- Install Visual Studio Build Tools.
- Enable the `Desktop development with C++` workload.
- Confirm `link.exe` is available in PowerShell.
- Keep the Rust toolchain updated.
- Keep at least 20 GB free on drive `C:` while Visual Studio Build Tools installs and updates.

## Build Commands

### Public site

```powershell
npm run build:site
```

### Desktop renderer only

```powershell
npm run build:desktop:web
```

### Full Windows release

```powershell
npm run release:windows
```

## What the release script does

1. Verifies that `npm` and `link.exe` exist.
2. Builds the desktop renderer.
3. Runs the Tauri bundle build.
4. Finds the newest `.exe` or `.msi` inside `src-tauri/target/release/bundle/`.
5. Copies that artifact into `site/public/downloads/` with a stable name.

## Expected Output

- Tauri bundle output inside:

```text
src-tauri/target/release/bundle/
```

- Website download artifact inside:

```text
site/public/downloads/glaze-setup.exe
```

or, if the bundle produced MSI first:

```text
site/public/downloads/glaze-setup.msi
```

## Before Publishing

- Verify the app launches normally from the installer.
- Verify tray icon, emergency shortcut, and pause behavior.
- Verify active-window capture and insight preview.
- Verify insert and replace selection in a browser textarea, Notepad, and a code editor.
- Verify the download page links to the correct artifact.
