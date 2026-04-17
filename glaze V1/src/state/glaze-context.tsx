import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from 'react'

import { loadPersistedState, savePersistedState } from '../services/persistence'
import { isTauri, uid } from '../lib/tauri'
import type {
  AppPhase,
  CaptureStatus,
  ContextSnapshot,
  InsightCard,
  PermissionState,
  PersistedState,
  ProviderConfig,
  UserPreferences,
  UserProfile,
  OverlayState,
} from '../types/glaze'

export interface GlazeState {
  phase: AppPhase
  overlayState: OverlayState
  user: UserProfile
  providers: ProviderConfig[]
  selectedProviderId: string
  permissions: PermissionState
  preferences: UserPreferences
  recentInsights: InsightCard[]
  activeSnapshot: ContextSnapshot | null
  captureStatus: CaptureStatus
  onboardingComplete: boolean
  vaultPassphraseHint: string
  settingsOpen: boolean
  contextPreviewOpen: boolean
  vaultUnlocked: boolean
}

type GlazeAction =
  | { type: 'set-phase'; phase: AppPhase }
  | { type: 'set-overlay-state'; overlayState: OverlayState }
  | { type: 'set-user'; user: Partial<UserProfile> }
  | { type: 'set-providers'; providers: ProviderConfig[] }
  | { type: 'set-selected-provider'; providerId: string }
  | { type: 'set-permissions'; permissions: PermissionState }
  | { type: 'set-preferences'; preferences: UserPreferences }
  | { type: 'set-recent-insights'; recentInsights: InsightCard[] }
  | { type: 'add-insights'; insights: InsightCard[] }
  | { type: 'mark-insight'; insightId: string; status: InsightCard['status'] }
  | { type: 'set-active-snapshot'; snapshot: ContextSnapshot | null }
  | { type: 'set-capture-status'; captureStatus: CaptureStatus }
  | { type: 'complete-onboarding'; user: UserProfile; providers: ProviderConfig[]; vaultPassphraseHint: string }
  | { type: 'toggle-settings'; open?: boolean }
  | { type: 'toggle-context-preview'; open?: boolean }
  | { type: 'set-vault-unlocked'; value: boolean }

const providerPresets: ProviderConfig[] = [
  {
    id: uid('provider'),
    kind: 'openai',
    label: 'OpenAI',
    model: 'gpt-4.1-mini',
    supportsVision: true,
    enabled: true,
    status: 'idle',
  },
  {
    id: uid('provider'),
    kind: 'anthropic',
    label: 'Anthropic',
    model: 'claude-3-7-sonnet-latest',
    supportsVision: true,
    enabled: false,
    status: 'idle',
  },
  {
    id: uid('provider'),
    kind: 'gemini',
    label: 'Gemini',
    model: 'gemini-2.5-flash',
    supportsVision: true,
    enabled: false,
    status: 'idle',
  },
  {
    id: uid('provider'),
    kind: 'groq',
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsVision: false,
    enabled: false,
    status: 'idle',
  },
  {
    id: uid('provider'),
    kind: 'openrouter',
    label: 'OpenRouter',
    model: 'openai/gpt-4.1-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsVision: true,
    enabled: false,
    status: 'idle',
  },
  {
    id: uid('provider'),
    kind: 'custom-openai',
    label: 'Custom OpenAI-Compatible',
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.example.com/v1',
    supportsVision: true,
    enabled: false,
    status: 'idle',
  },
]

const defaultPermissions: PermissionState = {
  observationConsent: true,
  inputAutomationConsent: true,
  emergencyShortcutEnabled: true,
  captureIndicatorEnabled: true,
  deniedApps: ['1Password', 'Bitwarden'],
}

const defaultPreferences: UserPreferences = {
  scanIntervalMs: 5000,
  orbDock: 'right',
  autoExpand: true,
  pulseIntensity: 'medium',
  reduceMotion: false,
}

const defaultUser: UserProfile = {
  email: '',
  displayName: 'Glaze Pilot',
  authStatus: 'signed_out',
}

function toPersistedState(state: GlazeState): PersistedState {
  return {
    phase: state.phase,
    overlayState: state.overlayState,
    user: state.user,
    providers: state.providers.map((provider) => ({
      ...provider,
      apiKeyPlaintext: undefined,
    })),
    selectedProviderId: state.selectedProviderId,
    permissions: state.permissions,
    preferences: state.preferences,
    recentInsights: state.recentInsights,
    onboardingComplete: state.onboardingComplete,
  }
}

function getInitialState(): GlazeState {
  const persisted = loadPersistedState()
  const shouldRelock =
    Boolean(persisted?.onboardingComplete) &&
    Boolean(persisted?.providers?.some((provider) => provider.keyEnvelope))

  return {
    phase: shouldRelock ? 'auth_locked' : persisted?.phase ?? 'onboarding',
    overlayState: shouldRelock ? 'auth_locked' : persisted?.overlayState ?? 'onboarding',
    user: persisted?.user ?? defaultUser,
    providers: persisted?.providers ?? providerPresets,
    selectedProviderId: persisted?.selectedProviderId ?? providerPresets[0].id,
    permissions: persisted?.permissions ?? defaultPermissions,
    preferences: persisted?.preferences ?? defaultPreferences,
    recentInsights: persisted?.recentInsights ?? [],
    activeSnapshot: null,
    captureStatus: { active: false, timestamp: new Date().toISOString() },
    onboardingComplete: persisted?.onboardingComplete ?? false,
    vaultPassphraseHint: persisted?.user.email ?? '',
    settingsOpen: false,
    contextPreviewOpen: false,
    vaultUnlocked: !shouldRelock && !isTauri(),
  }
}

function glazeReducer(state: GlazeState, action: GlazeAction): GlazeState {
  switch (action.type) {
    case 'set-phase':
      return { ...state, phase: action.phase }
    case 'set-overlay-state':
      return { ...state, overlayState: action.overlayState }
    case 'set-user':
      return { ...state, user: { ...state.user, ...action.user } }
    case 'set-providers':
      return { ...state, providers: action.providers }
    case 'set-selected-provider':
      return { ...state, selectedProviderId: action.providerId }
    case 'set-permissions':
      return { ...state, permissions: action.permissions }
    case 'set-preferences':
      return { ...state, preferences: action.preferences }
    case 'set-recent-insights':
      return { ...state, recentInsights: action.recentInsights }
    case 'add-insights':
      return {
        ...state,
        recentInsights: [...action.insights, ...state.recentInsights].slice(0, 8),
      }
    case 'mark-insight':
      return {
        ...state,
        recentInsights: state.recentInsights.map((insight) =>
          insight.id === action.insightId
            ? { ...insight, status: action.status }
            : insight,
        ),
      }
    case 'set-active-snapshot':
      return { ...state, activeSnapshot: action.snapshot }
    case 'set-capture-status':
      return { ...state, captureStatus: action.captureStatus }
    case 'complete-onboarding':
      return {
        ...state,
        phase: 'overlay',
        overlayState: 'orb_idle',
        onboardingComplete: true,
        user: action.user,
        providers: action.providers,
        selectedProviderId: action.providers[0]?.id ?? state.selectedProviderId,
        vaultPassphraseHint: action.vaultPassphraseHint,
        vaultUnlocked: true,
      }
    case 'toggle-settings':
      return {
        ...state,
        settingsOpen: action.open ?? !state.settingsOpen,
      }
    case 'toggle-context-preview':
      return {
        ...state,
        contextPreviewOpen: action.open ?? !state.contextPreviewOpen,
      }
    case 'set-vault-unlocked':
      return {
        ...state,
        vaultUnlocked: action.value,
        phase: action.value ? 'overlay' : 'auth_locked',
        overlayState: action.value ? 'orb_idle' : 'auth_locked',
      }
    default:
      return state
  }
}

const StateContext = createContext<GlazeState | null>(null)
const DispatchContext = createContext<Dispatch<GlazeAction> | null>(null)

export function GlazeProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(glazeReducer, undefined, getInitialState)

  useEffect(() => {
    startTransition(() => {
      savePersistedState(toPersistedState(state))
    })
  }, [state])

  const stateValue = useMemo(() => state, [state])
  const dispatchValue = useMemo(() => dispatch, [dispatch])

  return (
    <StateContext.Provider value={stateValue}>
      <DispatchContext.Provider value={dispatchValue}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useGlazeState() {
  const context = useContext(StateContext)

  if (!context) {
    throw new Error('useGlazeState must be used within GlazeProvider')
  }

  return context
}

export function useGlazeDispatch() {
  const context = useContext(DispatchContext)

  if (!context) {
    throw new Error('useGlazeDispatch must be used within GlazeProvider')
  }

  return context
}
