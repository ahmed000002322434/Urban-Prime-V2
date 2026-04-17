# Glaze

Glaze is a desktop-first AI companion built as a Tauri application with a separate Next.js public website.

The split is intentional:

- `site/` is the public website for download, articles, and help.
- `src/` + `src-tauri/` are the actual desktop product.

## Current Shape

- Glass-first desktop overlay with orb, insight cards, settings, and context preview.
- Native Windows observation loop that watches the active window.
- Native tray menu and emergency shortcut.
- Browser preview guard so the desktop renderer no longer pretends to be the public site.
- Separate Next.js website for download, help, and editorial content.

## Commands

- `npm run dev`
  Starts the Next.js website.

- `npm run dev:desktop`
  Starts the Tauri desktop app.

- `npm run build:site`
  Builds the Next.js website.

- `npm run build:desktop:web`
  Builds the desktop renderer.

- `npm run build:desktop`
  Builds the full desktop bundle through Tauri.

- `npm run release:windows`
  Builds the Windows bundle and copies the newest installer into `site/public/downloads/`.

## Windows Build Requirements

To produce a real clickable Windows installer, the machine needs:

- Node.js and npm
- Rust toolchain
- Visual Studio Build Tools with `Desktop development with C++`
- `link.exe` available on `PATH`
- Enough free space on `C:` for the Visual Studio installer and toolchain payloads

Without `link.exe`, Rust can compile dependencies only up to the point where the Windows linker is required, and the installer cannot be generated.

## Release Flow

1. Install Visual Studio Build Tools with the C++ desktop workload.
2. Run `npm run release:windows`.
3. The script builds the Tauri bundle and publishes the newest installer into `site/public/downloads/`.
4. Deploy the `site/` app so the download page serves the current installer.

## Highest-Value Next Desktop Work

1. Finish validating the new native active-window screenshot path on a Windows machine with MSVC installed.
2. Improve automation coverage for editors and document apps.
3. Replace placeholder icons and bundle art with final Glaze branding.
4. Add signed release builds and an updater path.
