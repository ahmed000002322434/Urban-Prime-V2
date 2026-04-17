import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import { AuthLockScreen } from './components/AuthLockScreen'
import { BrowserPreviewPanel } from './components/BrowserPreviewPanel'
import { ContextPreviewSheet } from './components/ContextPreviewSheet'
import { DesktopSetupPanel } from './components/DesktopSetupPanel'
import { GlazeOverlay } from './components/GlazeOverlay'
import { SettingsSheet } from './components/SettingsSheet'
import { useGlazeEngine } from './hooks/use-glaze-engine'
import { encryptSecret, unlockProviders } from './services/crypto'
import { isTauri } from './lib/tauri'
import {
  applyAction,
  listenToRuntimeEvents,
  resizeForOverlay,
  vaultStoreKey,
  vaultUnlock,
} from './services/tauri-bridge'
import { hasSupabase } from './services/supabase'
import { useGlazeDispatch, useGlazeState } from './state/glaze-context'
import type { InsightCard, OperationStatus, PermissionState, ProviderConfig, UserPreferences } from './types/glaze'

function App() {
  const state = useGlazeState()
  const dispatch = useGlazeDispatch()
  const glazeEngine = useGlazeEngine()
  const [statusMessage, setStatusMessage] = useState('Glaze is staged and ready.')

  const visibleInsights = useMemo(
    () => state.recentInsights.filter((insight) => insight.status !== 'dismissed'),
    [state.recentInsights],
  )
  const desktopRuntime = isTauri()

  const overlayExpanded = state.overlayState === 'cards_expanded' || state.settingsOpen || state.contextPreviewOpen

  useEffect(() => {
    if (!desktopRuntime) {
      return
    }

    let dispose = () => {}

    void listenToRuntimeEvents((event) => {
      setStatusMessage(event.message)

      dispatch({
        type: 'set-overlay-state',
        overlayState: event.windowVisible ? (event.paused ? 'paused' : 'orb_idle') : 'hidden',
      })

      if (!event.windowVisible) {
        dispatch({ type: 'toggle-settings', open: false })
        dispatch({ type: 'toggle-context-preview', open: false })
      }
    }).then((unlisten) => {
      dispose = unlisten
    })

    return () => {
      dispose()
    }
  }, [desktopRuntime, dispatch])

  async function handleCompleteOnboarding(payload: {
    user: typeof state.user
    provider: ProviderConfig
    vaultPassphrase: string
    permissions: PermissionState
    apiKey: string
  }): Promise<OperationStatus> {
    const keyEnvelope = await encryptSecret(payload.apiKey, payload.vaultPassphrase)
    const providers = state.providers.map((provider) =>
      provider.id === payload.provider.id
        ? {
            ...payload.provider,
            enabled: true,
            status: 'idle' as const,
            keyEnvelope,
            apiKeyPlaintext: payload.apiKey,
          }
        : { ...provider, enabled: false, apiKeyPlaintext: undefined },
    )

    dispatch({
      type: 'set-permissions',
      permissions: payload.permissions,
    })
    dispatch({
      type: 'complete-onboarding',
      user: {
        ...payload.user,
        authStatus: hasSupabase() ? state.user.authStatus : 'signed_in',
      },
      providers,
      vaultPassphraseHint: payload.user.email || payload.user.displayName,
    })

    await resizeForOverlay(false)
    await vaultUnlock(payload.user.email || payload.user.displayName)
    await vaultStoreKey(payload.provider)

    setStatusMessage('Glaze launched. The orb is live, tray controls are ready, and passive observation is online.')
    return { ok: true, message: 'Glaze is now live as your floating desktop companion.' }
  }

  async function handleUnlockVault(passphrase: string) {
    const unlockedProviders = await unlockProviders(state.providers, passphrase)
    const selected = unlockedProviders.find((provider) => provider.id === state.selectedProviderId)

    if (!selected?.apiKeyPlaintext) {
      return 'The passphrase did not decrypt your active provider key.'
    }

    dispatch({ type: 'set-providers', providers: unlockedProviders })
    dispatch({ type: 'set-vault-unlocked', value: true })
    await vaultUnlock(passphrase)
    setStatusMessage(`${selected.label} is unlocked and the companion is back online.`)
    return 'Vault unlocked. Glaze can resume live suggestions.'
  }

  async function handleToggleExpanded(expanded: boolean) {
    dispatch({
      type: 'set-overlay-state',
      overlayState: expanded ? 'cards_expanded' : 'orb_idle',
    })
    dispatch({ type: 'toggle-settings', open: false })
    dispatch({ type: 'toggle-context-preview', open: false })
    await resizeForOverlay(expanded)
  }

  async function handlePauseToggle() {
    if (!state.permissions.observationConsent) {
      setStatusMessage('Passive observation is disabled in settings.')
      return
    }

    const paused = state.overlayState === 'paused'
    await glazeEngine.setObservationPaused(!paused)
    setStatusMessage(paused ? 'Passive observation resumed.' : 'Passive observation paused.')
  }

  async function handleApplyInsight(insight: InsightCard, actionType: InsightCard['applyMode']) {
    const result = await applyAction({
      cardId: insight.id,
      actionType,
      payload: insight.preview,
      sourceApp: insight.sourceApp,
    })

    dispatch({ type: 'mark-insight', insightId: insight.id, status: 'applied' })
    dispatch({ type: 'set-overlay-state', overlayState: 'typing' })
    setStatusMessage(result.message)

    window.setTimeout(() => {
      dispatch({ type: 'set-overlay-state', overlayState: 'orb_idle' })
    }, 700)
  }

  function handleDismissInsight(insightId: string) {
    dispatch({ type: 'mark-insight', insightId, status: 'dismissed' })
  }

  function handleProviderSelection(providers: ProviderConfig[], selectedProviderId: string) {
    dispatch({ type: 'set-providers', providers })
    dispatch({ type: 'set-selected-provider', providerId: selectedProviderId })
  }

  function handlePermissionsChange(permissions: PermissionState) {
    dispatch({ type: 'set-permissions', permissions })
  }

  function handlePreferencesChange(preferences: UserPreferences) {
    dispatch({ type: 'set-preferences', preferences })
  }

  function handleLockVault() {
    dispatch({
      type: 'set-providers',
      providers: state.providers.map((provider) => ({
        ...provider,
        apiKeyPlaintext: undefined,
      })),
    })
    dispatch({ type: 'set-vault-unlocked', value: false })
    dispatch({ type: 'toggle-settings', open: false })
    setStatusMessage('Vault locked. Provider secrets were cleared from live memory.')
  }

  return (
    <div className={state.phase === 'overlay' ? 'app-shell overlay-mode' : 'app-shell'}>
      <div className="app-aurora" />
      <div className="app-stars" />

      {!desktopRuntime ? <BrowserPreviewPanel /> : null}

      {desktopRuntime && state.phase === 'onboarding' ? (
        <DesktopSetupPanel
          providers={state.providers}
          onComplete={handleCompleteOnboarding}
        />
      ) : null}

      {desktopRuntime && state.phase === 'auth_locked' ? (
        <AuthLockScreen email={state.user.email} onUnlock={handleUnlockVault} />
      ) : null}

      {desktopRuntime && state.phase === 'overlay' ? (
        <div className="overlay-cluster">
          <GlazeOverlay
            overlayState={state.overlayState}
            insights={visibleInsights}
            snapshot={state.activeSnapshot}
            captureStatus={state.captureStatus}
            activeProvider={glazeEngine.activeProvider}
            settingsOpen={state.settingsOpen}
            onToggleExpanded={handleToggleExpanded}
            onPauseToggle={handlePauseToggle}
            onOpenSettings={() => {
              dispatch({ type: 'toggle-settings', open: true })
              dispatch({ type: 'toggle-context-preview', open: false })
              void resizeForOverlay(true)
            }}
            onOpenPreview={() => {
              dispatch({ type: 'toggle-context-preview', open: true })
              dispatch({ type: 'toggle-settings', open: false })
              void resizeForOverlay(true)
            }}
            onDismissInsight={handleDismissInsight}
            onApplyInsight={handleApplyInsight}
          />

          <AnimatePresence>
            {state.settingsOpen ? (
              <SettingsSheet
                providers={state.providers}
                selectedProviderId={state.selectedProviderId}
                permissions={state.permissions}
                preferences={state.preferences}
                onChangeProviders={handleProviderSelection}
                onChangePermissions={handlePermissionsChange}
                onChangePreferences={handlePreferencesChange}
                onLockVault={handleLockVault}
                onClose={() => {
                  dispatch({ type: 'toggle-settings', open: false })
                  if (!overlayExpanded) {
                    void resizeForOverlay(false)
                  }
                }}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {state.contextPreviewOpen ? (
              <ContextPreviewSheet
                snapshot={state.activeSnapshot}
                onClose={() => {
                  dispatch({ type: 'toggle-context-preview', open: false })
                  if (!overlayExpanded) {
                    void resizeForOverlay(false)
                  }
                }}
              />
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <div className="environment-pill">
        <span>{desktopRuntime ? 'Desktop shell' : 'Browser preview'}</span>
        <span>{hasSupabase() ? 'Cloud sync ready' : 'Local mode'}</span>
        <span>
          {!desktopRuntime ? 'Open the Next.js site for the public experience.' : statusMessage}
        </span>
      </div>
    </div>
  )
}

export default App
