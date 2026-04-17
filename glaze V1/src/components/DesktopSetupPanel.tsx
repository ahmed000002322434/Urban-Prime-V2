import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, MonitorCog, ShieldCheck, Sparkles } from 'lucide-react'

import type { PermissionState, ProviderConfig, UserProfile } from '../types/glaze'

interface DesktopSetupPanelProps {
  providers: ProviderConfig[]
  onComplete: (payload: {
    user: UserProfile
    provider: ProviderConfig
    vaultPassphrase: string
    permissions: PermissionState
    apiKey: string
  }) => Promise<{ ok: boolean; message: string }>
}

export function DesktopSetupPanel({
  providers,
  onComplete,
}: DesktopSetupPanelProps) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [model, setModel] = useState(providers[0]?.model ?? '')
  const [baseUrl, setBaseUrl] = useState(providers[0]?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [displayName, setDisplayName] = useState('Glaze Pilot')
  const [status, setStatus] = useState('Connect a provider, unlock the vault, and start the overlay.')
  const [busy, setBusy] = useState(false)
  const [permissions, setPermissions] = useState<PermissionState>({
    observationConsent: true,
    inputAutomationConsent: true,
    emergencyShortcutEnabled: true,
    captureIndicatorEnabled: true,
    deniedApps: ['1Password', 'Bitwarden'],
  })

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === providerId) ?? providers[0],
    [providerId, providers],
  )

  async function handleLaunch() {
    if (!selectedProvider) {
      return
    }

    setBusy(true)
    const result = await onComplete({
      user: {
        email: '',
        displayName,
        authStatus: 'signed_in',
      },
      provider: {
        ...selectedProvider,
        model,
        baseUrl,
      },
      vaultPassphrase: passphrase,
      permissions,
      apiKey,
    })

    setStatus(result.message)
    setBusy(false)
  }

  return (
    <motion.section
      className="desktop-setup glass-card"
      initial={{ opacity: 0, scale: 0.96, y: 32 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 16 }}
    >
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Desktop setup</p>
          <h3>Prepare the installed Glaze app</h3>
        </div>
        <div className="icon-button">
          <MonitorCog size={17} />
        </div>
      </div>

      <div className="settings-section">
        <label className="field">
          <span><Sparkles size={16} /> Display name</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label className="field">
          <span><KeyRound size={16} /> Provider</span>
          <select
            value={providerId}
            onChange={(event) => {
              const next = providers.find((provider) => provider.id === event.target.value)
              setProviderId(event.target.value)
              setModel(next?.model ?? '')
              setBaseUrl(next?.baseUrl ?? '')
            }}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Model</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>
        <label className="field">
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" />
        </label>
        <label className="field">
          <span>API key</span>
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your provider key" />
        </label>
        <label className="field">
          <span><ShieldCheck size={16} /> Vault passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="At least 8 characters"
          />
        </label>
      </div>

      <div className="settings-section">
        <div className="toggle-row compact">
          <div>
            <p>Passive observation</p>
            <span>Let Glaze watch the active window and pulse when it has something useful.</span>
          </div>
          <button
            type="button"
            className={permissions.observationConsent ? 'toggle active' : 'toggle'}
            onClick={() =>
              setPermissions((current) => ({
                ...current,
                observationConsent: !current.observationConsent,
              }))
            }
          >
            <span />
          </button>
        </div>
        <div className="toggle-row compact">
          <div>
            <p>Ghost typing</p>
            <span>Insert approved suggestions directly into the active app with clipboard fallback.</span>
          </div>
          <button
            type="button"
            className={permissions.inputAutomationConsent ? 'toggle active' : 'toggle'}
            onClick={() =>
              setPermissions((current) => ({
                ...current,
                inputAutomationConsent: !current.inputAutomationConsent,
              }))
            }
          >
            <span />
          </button>
        </div>
      </div>

      <p className="status-pill wide">{status}</p>

      <button
        type="button"
        className="primary-button full-width"
        onClick={handleLaunch}
        disabled={busy || !apiKey.trim() || passphrase.length < 8}
      >
        Launch desktop companion
      </button>
    </motion.section>
  )
}
