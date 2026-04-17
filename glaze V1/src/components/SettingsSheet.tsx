import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Lock, Radar, Save, ShieldOff, Zap } from 'lucide-react'

import { testProviderConnection } from '../services/provider-service'
import type { PermissionState, ProviderConfig, UserPreferences } from '../types/glaze'

interface SettingsSheetProps {
  providers: ProviderConfig[]
  selectedProviderId: string
  permissions: PermissionState
  preferences: UserPreferences
  onChangeProviders: (providers: ProviderConfig[], selectedProviderId: string) => void
  onChangePermissions: (permissions: PermissionState) => void
  onChangePreferences: (preferences: UserPreferences) => void
  onLockVault: () => void
  onClose: () => void
}

export function SettingsSheet({
  providers,
  selectedProviderId,
  permissions,
  preferences,
  onChangeProviders,
  onChangePermissions,
  onChangePreferences,
  onLockVault,
  onClose,
}: SettingsSheetProps) {
  const [status, setStatus] = useState('Adjust scanning, denylist, and provider routing here.')
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId],
  )

  async function handleTestProvider() {
    if (!selectedProvider) {
      return
    }

    const result = await testProviderConnection(selectedProvider)
    setStatus(result.message)

    onChangeProviders(
      providers.map((provider) =>
        provider.id === selectedProvider.id
          ? {
              ...provider,
              status: result.ok ? 'connected' : 'error',
              lastValidatedAt: new Date().toISOString(),
            }
          : provider,
      ),
      selectedProviderId,
    )
  }

  return (
    <motion.aside
      className="settings-sheet glass-card"
      initial={{ opacity: 0, x: 42 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 42 }}
      transition={{ type: 'spring', stiffness: 155, damping: 18 }}
    >
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h3>Companion controls</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          <Save size={17} />
        </button>
      </div>

      <section className="settings-section">
        <div className="section-title">
          <Radar size={18} />
          <span>Observation</span>
        </div>
        <div className="toggle-row compact">
          <div>
            <p>Observation enabled</p>
            <span>Allow Glaze to scan the active window and surface contextual suggestions.</span>
          </div>
          <button
            type="button"
            className={permissions.observationConsent ? 'toggle active' : 'toggle'}
            onClick={() =>
              onChangePermissions({
                ...permissions,
                observationConsent: !permissions.observationConsent,
              })
            }
          >
            <span />
          </button>
        </div>
        <label className="field">
          <span>Scan interval</span>
          <input
            type="number"
            min={2000}
            step={500}
            value={preferences.scanIntervalMs}
            onChange={(event) =>
              onChangePreferences({
                ...preferences,
                scanIntervalMs: Number(event.target.value),
              })
            }
          />
        </label>
        <label className="field">
          <span>Denylisted apps</span>
          <textarea
            value={permissions.deniedApps.join(', ')}
            onChange={(event) =>
              onChangePermissions({
                ...permissions,
                deniedApps: event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <KeyRound size={18} />
          <span>Provider routing</span>
        </div>
        <label className="field">
          <span>Selected provider</span>
          <select value={selectedProviderId} onChange={(event) => onChangeProviders(providers, event.target.value)}>
            {providers.map((provider) => (
              <option value={provider.id} key={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Model</span>
          <input
            value={selectedProvider?.model ?? ''}
            onChange={(event) =>
              onChangeProviders(
                providers.map((provider) =>
                  provider.id === selectedProviderId
                    ? { ...provider, model: event.target.value }
                    : provider,
                ),
                selectedProviderId,
              )
            }
          />
        </label>
        <button type="button" className="secondary-button full-width" onClick={handleTestProvider}>
          <Zap size={15} />
          Test live connection
        </button>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <ShieldOff size={18} />
          <span>Safety</span>
        </div>
        <div className="toggle-row compact">
          <div>
            <p>Emergency shortcut</p>
            <span>Enable Ctrl+Shift+G to hide Glaze and pause observation instantly.</span>
          </div>
          <button
            type="button"
            className={permissions.emergencyShortcutEnabled ? 'toggle active' : 'toggle'}
            onClick={() =>
              onChangePermissions({
                ...permissions,
                emergencyShortcutEnabled: !permissions.emergencyShortcutEnabled,
              })
            }
          >
            <span />
          </button>
        </div>
        <div className="toggle-row compact">
          <div>
            <p>Auto-expand cards</p>
            <span>Expand Glaze when a strong suggestion arrives.</span>
          </div>
          <button
            type="button"
            className={preferences.autoExpand ? 'toggle active' : 'toggle'}
            onClick={() =>
              onChangePreferences({
                ...preferences,
                autoExpand: !preferences.autoExpand,
              })
            }
          >
            <span />
          </button>
        </div>
        <p className="subtle-copy">
          Glaze also lives in the system tray now, so the desktop app can be restored, paused, or quit without reopening the installer flow.
        </p>
      </section>

      <p className="status-pill wide">{status}</p>

      <button type="button" className="secondary-button full-width" onClick={onLockVault}>
        <Lock size={15} />
        Lock vault
      </button>
    </motion.aside>
  )
}
