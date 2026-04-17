import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
} from 'react'

import { generateInsights } from '../services/provider-service'
import { isTauri } from '../lib/tauri'
import {
  capturePreview,
  listenToCaptureStatus,
  listenToContextSnapshots,
  pauseObservation,
  resizeForOverlay,
  resumeObservation,
  saveSettings,
  startObservation,
  updateDenylist,
} from '../services/tauri-bridge'
import { hasSupabase, requestEmailOtp, syncInsightHistory, syncProfile, syncProviders, verifyEmailOtp, getCurrentSession } from '../services/supabase'
import type { ContextSnapshot } from '../types/glaze'
import { useGlazeDispatch, useGlazeState } from '../state/glaze-context'

async function syncRemoteStateNow(state: ReturnType<typeof useGlazeState>) {
  if (!hasSupabase()) {
    return
  }

  const session = await getCurrentSession()
  if (!session) {
    return
  }

  await syncProfile(session, state.user, state.permissions, state.preferences)
  await syncProviders(session, state.providers)
}

export function useGlazeEngine() {
  const state = useGlazeState()
  const dispatch = useGlazeDispatch()
  const scanTimer = useRef<number | null>(null)

  const activeProvider = useMemo(
    () => state.providers.find((provider) => provider.id === state.selectedProviderId),
    [state.providers, state.selectedProviderId],
  )

  const handleSnapshot = useEffectEvent(async (snapshot: ContextSnapshot) => {
    startTransition(() => {
      dispatch({ type: 'set-active-snapshot', snapshot })
      dispatch({
        type: 'set-overlay-state',
        overlayState: state.permissions.observationConsent ? 'orb_pulsing' : 'paused',
      })
    })

    const insightResult = await generateInsights(snapshot, activeProvider)

    startTransition(() => {
      dispatch({ type: 'set-active-snapshot', snapshot: insightResult.snapshot })
      dispatch({ type: 'add-insights', insights: insightResult.cards })
      dispatch({ type: 'set-overlay-state', overlayState: 'cards_expanded' })
    })

    const session = await getCurrentSession()
    if (session) {
      await Promise.all(insightResult.cards.map((card) => syncInsightHistory(session, card)))
    }

    await resizeForOverlay(true)
  })

  useEffect(() => {
    void saveSettings(state.permissions, state.preferences)
  }, [state.permissions, state.preferences])

  useEffect(() => {
    void updateDenylist(state.permissions.deniedApps)
  }, [state.permissions.deniedApps])

  useEffect(() => {
    void syncRemoteStateNow(state)
  }, [state])

  useEffect(() => {
    if (state.phase !== 'overlay') {
      return
    }

    let disposeSnapshot = () => {}
    let disposeCapture = () => {}

    void startObservation()

    if (!state.permissions.observationConsent) {
      void pauseObservation()
    } else {
      void resumeObservation()
    }

    void listenToContextSnapshots((snapshot) => {
      void handleSnapshot(snapshot)
    }).then((unlisten) => {
      disposeSnapshot = unlisten
    })

    void listenToCaptureStatus((captureStatus) => {
      startTransition(() => {
        dispatch({ type: 'set-capture-status', captureStatus })
      })
    }).then((unlisten) => {
      disposeCapture = unlisten
    })

    return () => {
      disposeSnapshot()
      disposeCapture()
    }
  }, [dispatch, state.permissions.observationConsent, state.phase])

  useEffect(() => {
    if (isTauri() || state.phase !== 'overlay' || !state.permissions.observationConsent) {
      if (scanTimer.current) {
        window.clearInterval(scanTimer.current)
      }
      return
    }

    scanTimer.current = window.setInterval(() => {
      void capturePreview().then((snapshot) => {
        void handleSnapshot(snapshot)
      })
    }, state.preferences.scanIntervalMs)

    return () => {
      if (scanTimer.current) {
        window.clearInterval(scanTimer.current)
      }
    }
  }, [state.permissions.observationConsent, state.phase, state.preferences.scanIntervalMs])

  return {
    activeProvider,
    async sendOtp(email: string) {
      const result = await requestEmailOtp(email)
      if (result.ok) {
        dispatch({
          type: 'set-user',
          user: { email, authStatus: 'pending', otpSentAt: new Date().toISOString() },
        })
      }
      return result
    },
    async verifyOtp(email: string, token: string) {
      const result = await verifyEmailOtp(email, token)
      if (result.ok) {
        dispatch({ type: 'set-user', user: { authStatus: 'signed_in' } })
        await syncRemoteStateNow({
          ...state,
          user: { ...state.user, authStatus: 'signed_in' },
        })
      }
      return result
    },
    async setObservationPaused(paused: boolean) {
      if (paused) {
        await pauseObservation()
      } else {
        await resumeObservation()
      }

      if (!isTauri()) {
        dispatch({ type: 'set-overlay-state', overlayState: paused ? 'paused' : 'orb_idle' })
      }
    },
  }
}
