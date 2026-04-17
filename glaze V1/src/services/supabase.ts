import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

import { env, hasSupabaseEnv } from '../lib/env'
import type {
  InsightCard,
  PermissionState,
  ProviderConfig,
  UserPreferences,
  UserProfile,
} from '../types/glaze'

type DatabaseClient = SupabaseClient | null

let client: DatabaseClient = null

function getClient() {
  if (!hasSupabaseEnv) {
    return null
  }

  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  return client
}

export function hasSupabase() {
  return hasSupabaseEnv
}

export async function requestEmailOtp(email: string) {
  const supabase = getClient()

  if (!supabase) {
    return { ok: false, message: 'Supabase env vars are missing.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: undefined,
    },
  })

  return {
    ok: !error,
    message: error?.message ?? 'A verification code was sent to your inbox.',
  }
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = getClient()

  if (!supabase) {
    return { ok: false, message: 'Supabase env vars are missing.', session: null }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  return {
    ok: !error,
    message: error?.message ?? 'Glaze is now synced to your Supabase account.',
    session: data.session,
  }
}

export async function getCurrentSession() {
  const supabase = getClient()
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signOut() {
  const supabase = getClient()
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}

export async function syncProfile(
  session: Session,
  profile: UserProfile,
  permissions: PermissionState,
  preferences: UserPreferences,
) {
  const supabase = getClient()
  if (!supabase) {
    return
  }

  await supabase.from('profiles').upsert({
    id: session.user.id,
    email: profile.email,
    display_name: profile.displayName,
  })

  await supabase.from('user_preferences').upsert({
    user_id: session.user.id,
    denied_apps: permissions.deniedApps,
    observation_consent: permissions.observationConsent,
    input_automation_consent: permissions.inputAutomationConsent,
    emergency_shortcut_enabled: permissions.emergencyShortcutEnabled,
    capture_indicator_enabled: permissions.captureIndicatorEnabled,
    scan_interval_ms: preferences.scanIntervalMs,
    orb_dock: preferences.orbDock,
    auto_expand: preferences.autoExpand,
    pulse_intensity: preferences.pulseIntensity,
    reduce_motion: preferences.reduceMotion,
  })
}

export async function syncProviders(session: Session, providers: ProviderConfig[]) {
  const supabase = getClient()
  if (!supabase) {
    return
  }

  const rows = providers
    .filter((provider) => provider.keyEnvelope)
    .map((provider) => ({
      user_id: session.user.id,
      provider_id: provider.id,
      provider_kind: provider.kind,
      label: provider.label,
      model: provider.model,
      base_url: provider.baseUrl ?? null,
      supports_vision: provider.supportsVision,
      enabled: provider.enabled,
      key_envelope: provider.keyEnvelope,
    }))

  if (rows.length > 0) {
    await supabase.from('provider_credentials').upsert(rows)
  }
}

export async function syncInsightHistory(session: Session, insight: InsightCard) {
  const supabase = getClient()
  if (!supabase) {
    return
  }

  await supabase.from('insight_cards').insert({
    id: insight.id,
    user_id: session.user.id,
    title: insight.title,
    reason: insight.reason,
    confidence: insight.confidence,
    suggested_action: insight.suggestedAction,
    apply_mode: insight.applyMode,
    source_app: insight.sourceApp,
    expires_at: insight.expiresAt,
    preview: insight.preview,
    status: insight.status,
  })
}
