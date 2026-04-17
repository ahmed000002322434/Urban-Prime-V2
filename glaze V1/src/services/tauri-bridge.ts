import { LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import { isTauri, uid } from '../lib/tauri'
import type {
  ActionRequest,
  CaptureStatus,
  ContextSnapshot,
  OperationStatus,
  PermissionState,
  ProviderConfig,
  RuntimeEvent,
  UserPreferences,
} from '../types/glaze'

type Unlisten = () => void

export async function resizeForOverlay(expanded: boolean) {
  if (!isTauri()) {
    return
  }

  const appWindow = getCurrentWindow()
  const width = expanded ? 460 : 104
  const height = expanded ? 820 : 104
  await appWindow.setSize(new LogicalSize(width, height))
}

export async function beginDragging() {
  if (!isTauri()) {
    return
  }

  const appWindow = getCurrentWindow()
  await appWindow.startDragging()
}

export async function startObservation() {
  if (!isTauri()) {
    return invoke<OperationStatus>('observation_start')
  }

  return invoke<OperationStatus>('observation_start')
}

export async function pauseObservation() {
  if (!isTauri()) {
    return { ok: true, message: 'Observation paused locally.' }
  }

  return invoke<OperationStatus>('observation_pause')
}

export async function resumeObservation() {
  if (!isTauri()) {
    return { ok: true, message: 'Observation resumed locally.' }
  }

  return invoke<OperationStatus>('observation_resume')
}

export async function updateDenylist(deniedApps: string[]) {
  if (!isTauri()) {
    return { ok: true, message: 'Denylist updated in demo mode.' }
  }

  return invoke<OperationStatus>('observation_set_denylist', { deniedApps })
}

export async function capturePreview() {
  if (!isTauri()) {
    return {
      id: uid('snapshot'),
      timestamp: new Date().toISOString(),
      appName: 'Browser Demo',
      windowTitle: 'Glaze web preview',
      windowBounds: { x: 0, y: 0, width: 1440, height: 900 },
      extractedText:
        'This is a browser-only preview. Launch the desktop shell to enable real window capture.',
    } satisfies ContextSnapshot
  }

  return invoke<ContextSnapshot>('capture_preview')
}

export async function applyAction(action: ActionRequest) {
  if (!isTauri()) {
    await navigator.clipboard.writeText(action.payload)
    return { ok: true, message: 'Copied to clipboard in browser preview.' }
  }

  return invoke<OperationStatus>('action_apply', { request: action })
}

export async function saveSettings(
  permissions: PermissionState,
  preferences: UserPreferences,
) {
  if (!isTauri()) {
    return { ok: true, message: 'Settings saved locally.' }
  }

  return invoke<OperationStatus>('settings_save', { permissions, preferences })
}

export async function authSignInEmail(email: string) {
  if (!isTauri()) {
    return { ok: true, message: `Browser preview queued an OTP for ${email}.` }
  }

  return invoke<OperationStatus>('auth_sign_in_email', { email })
}

export async function vaultUnlock(passphraseHash: string) {
  if (!isTauri()) {
    return { ok: true, message: 'Vault unlocked in browser preview.' }
  }

  return invoke<OperationStatus>('vault_unlock', { passphraseHash })
}

export async function vaultStoreKey(provider: ProviderConfig) {
  if (!isTauri()) {
    return { ok: true, message: `${provider.label} stored locally.` }
  }

  return invoke<OperationStatus>('vault_store_key', {
    providerId: provider.id,
    providerKind: provider.kind,
  })
}

export async function providerTestConnection(provider: ProviderConfig) {
  if (!isTauri()) {
    return { ok: true, message: 'Provider will be tested through the web adapter.' }
  }

  return invoke<OperationStatus>('provider_test_connection', {
    providerId: provider.id,
    providerKind: provider.kind,
    model: provider.model,
    baseUrl: provider.baseUrl,
    supportsVision: provider.supportsVision,
  })
}

export async function listenToContextSnapshots(
  handler: (snapshot: ContextSnapshot) => void,
) {
  if (!isTauri()) {
    return () => {}
  }

  const unlisten = await listen<ContextSnapshot>('glaze://context_snapshot', (event) => {
    handler(event.payload)
  })

  return unlisten as Unlisten
}

export async function listenToCaptureStatus(
  handler: (status: CaptureStatus) => void,
) {
  if (!isTauri()) {
    return () => {}
  }

  const unlisten = await listen<CaptureStatus>('glaze://capture_status', (event) => {
    handler(event.payload)
  })

  return unlisten as Unlisten
}

export async function listenToRuntimeEvents(
  handler: (event: RuntimeEvent) => void,
) {
  if (!isTauri()) {
    return () => {}
  }

  const unlisten = await listen<RuntimeEvent>('glaze://runtime_event', (event) => {
    handler(event.payload)
  })

  return unlisten as Unlisten
}
