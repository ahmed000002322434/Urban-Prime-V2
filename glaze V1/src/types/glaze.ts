export type OverlayState =
  | 'hidden'
  | 'orb_idle'
  | 'orb_pulsing'
  | 'cards_expanded'
  | 'dragging'
  | 'paused'
  | 'typing'
  | 'onboarding'
  | 'settings'
  | 'auth_locked'

export type AppPhase = 'onboarding' | 'auth_locked' | 'overlay'

export type ProviderKind =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'custom-openai'

export type ApplyMode = 'copy' | 'insert' | 'replace_selection'

export interface VaultEnvelope {
  version: 1
  algorithm: 'AES-GCM'
  salt: string
  iv: string
  ciphertext: string
  createdAt: string
}

export interface ProviderConfig {
  id: string
  kind: ProviderKind
  label: string
  model: string
  baseUrl?: string
  supportsVision: boolean
  enabled: boolean
  status: 'idle' | 'connected' | 'error'
  lastValidatedAt?: string
  keyEnvelope?: VaultEnvelope
  apiKeyPlaintext?: string
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ContextSnapshot {
  id: string
  timestamp: string
  appName: string
  windowTitle: string
  windowHandle?: number
  processId?: number
  processPath?: string
  windowBounds: WindowBounds
  screenshotDataUrl?: string
  extractedText?: string
  contextSummary?: string
}

export interface InsightCard {
  id: string
  title: string
  reason: string
  confidence: number
  suggestedAction: string
  applyMode: ApplyMode
  sourceApp: string
  expiresAt: string
  preview: string
  status: 'fresh' | 'applied' | 'dismissed'
}

export interface ActionRequest {
  cardId: string
  actionType: ApplyMode
  payload: string
  sourceApp: string
}

export interface PermissionState {
  observationConsent: boolean
  inputAutomationConsent: boolean
  emergencyShortcutEnabled: boolean
  captureIndicatorEnabled: boolean
  deniedApps: string[]
}

export interface UserPreferences {
  scanIntervalMs: number
  orbDock: 'left' | 'right'
  autoExpand: boolean
  pulseIntensity: 'soft' | 'medium' | 'high'
  reduceMotion: boolean
}

export interface UserProfile {
  email: string
  displayName: string
  authStatus: 'signed_out' | 'pending' | 'signed_in'
  otpSentAt?: string
}

export interface PersistedState {
  phase: AppPhase
  overlayState: OverlayState
  user: UserProfile
  providers: ProviderConfig[]
  selectedProviderId: string
  permissions: PermissionState
  preferences: UserPreferences
  recentInsights: InsightCard[]
  onboardingComplete: boolean
}

export interface OnboardingPayload {
  email: string
  displayName: string
  vaultPassphrase: string
  provider: ProviderConfig
  permissions: PermissionState
}

export interface CaptureStatus {
  active: boolean
  timestamp: string
}

export interface RuntimeEvent {
  kind: 'window_hidden' | 'window_shown' | 'pause_changed' | 'shortcut_ignored'
  message: string
  paused: boolean
  windowVisible: boolean
}

export interface OperationStatus {
  ok: boolean
  message: string
}
