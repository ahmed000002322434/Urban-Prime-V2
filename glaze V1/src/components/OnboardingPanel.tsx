import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Code2,
  Eye,
  KeyRound,
  LifeBuoy,
  Mail,
  PenTool,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import type { OperationStatus, PermissionState, ProviderConfig, UserProfile } from '../types/glaze'

interface OnboardingPanelProps {
  providers: ProviderConfig[]
  hasSupabase: boolean
  user: UserProfile
  onSendOtp: (email: string) => Promise<OperationStatus>
  onVerifyOtp: (email: string, token: string) => Promise<OperationStatus>
  onComplete: (payload: {
    user: UserProfile
    provider: ProviderConfig
    vaultPassphrase: string
    permissions: PermissionState
    apiKey: string
  }) => Promise<OperationStatus>
}

const steps = [
  { id: 'identity', label: 'Identity' },
  { id: 'provider', label: 'AI Provider' },
  { id: 'consent', label: 'Consent' },
]

const articles = [
  {
    icon: PenTool,
    title: 'Writing Flow',
    body: 'Glaze catches awkward phrasing, tone drift, and missing transitions while you stay inside the page.',
  },
  {
    icon: Code2,
    title: 'Coding Flow',
    body: 'The orb can watch the current editor, notice errors or repetition, and surface compact fix cards instead of giant chats.',
  },
  {
    icon: BookOpenText,
    title: 'Research Flow',
    body: 'When you read articles or docs, Glaze can compress the visible context into key takeaways and next actions.',
  },
]

const quickHelp = [
  'You stay in control. Nothing is applied without your click.',
  'Pause observation at any time from the orb.',
  'Sensitive apps can be denied before you start.',
]

export function OnboardingPanel({
  providers,
  hasSupabase,
  user,
  onSendOtp,
  onVerifyOtp,
  onComplete,
}: OnboardingPanelProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [email, setEmail] = useState(user.email)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('Glaze is in guided setup mode.')
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [model, setModel] = useState(providers[0]?.model ?? '')
  const [baseUrl, setBaseUrl] = useState(providers[0]?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [vaultPassphrase, setVaultPassphrase] = useState('')
  const [permissions, setPermissions] = useState<PermissionState>({
    observationConsent: true,
    inputAutomationConsent: true,
    emergencyShortcutEnabled: true,
    captureIndicatorEnabled: true,
    deniedApps: ['1Password', 'Bitwarden'],
  })
  const [busy, setBusy] = useState(false)

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === providerId) ?? providers[0],
    [providerId, providers],
  )

  const canAdvanceIdentity = displayName.trim().length > 1 && (!hasSupabase || email.includes('@'))
  const canAdvanceProvider = Boolean(selectedProvider && model.trim() && apiKey.trim() && vaultPassphrase.length >= 8)

  async function handleSendOtp() {
    setBusy(true)
    const result = await onSendOtp(email)
    setStatus(result.message)
    setBusy(false)
  }

  async function handleVerifyOtp() {
    setBusy(true)
    const result = await onVerifyOtp(email, otp)
    setStatus(result.message)
    setBusy(false)
  }

  async function handleComplete() {
    if (!selectedProvider) {
      return
    }

    setBusy(true)
    const result = await onComplete({
      user: {
        email,
        displayName,
        authStatus: hasSupabase ? user.authStatus : 'signed_in',
        otpSentAt: user.otpSentAt,
      },
      provider: {
        ...selectedProvider,
        model,
        baseUrl,
      },
      vaultPassphrase,
      permissions,
      apiKey,
    })

    setStatus(result.message)
    setBusy(false)
  }

  return (
    <div className="glaze-stage">
      <div className="stage-orbit stage-orbit-a" />
      <div className="stage-orbit stage-orbit-b" />

      <motion.div
        className="brand-billboard glass-card"
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className="brand-caustic" />
        <motion.div
          className="floating-token floating-token-a"
          animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        >
          Passive awareness
        </motion.div>
        <motion.div
          className="floating-token floating-token-b"
          animate={{ y: [0, 14, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.6 }}
        >
          Liquid cards
        </motion.div>

        <div className="brand-lockup">
          <motion.div
            className="brand-mark"
            animate={{ rotate: [0, 4, 0, -3, 0], y: [0, -6, 0] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <span />
          </motion.div>
          <div>
            <p className="eyebrow">Glass-first OS companion</p>
            <h1>Glaze</h1>
          </div>
        </div>

        <p className="hero-copy">
          Glaze watches the current window, understands what you are doing, and expands into liquid insight cards the moment it can help.
        </p>

        <button className="hero-pill" type="button" onClick={() => setStepIndex(0)}>
          <span>Glaze Your Ideas Into Reality</span>
          <ArrowRight size={18} />
        </button>

        <div className="brand-metrics">
          <motion.div
            className="metric-pill"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <strong>5s</strong>
            <span>scan rhythm</span>
          </motion.div>
          <motion.div
            className="metric-pill"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.3 }}
          >
            <strong>3</strong>
            <span>live cards max</span>
          </motion.div>
          <motion.div
            className="metric-pill"
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 5.9, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.7 }}
          >
            <strong>1 click</strong>
            <span>to apply</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="quote-panel glass-card"
        initial={{ opacity: 0, y: 64 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 110, damping: 18 }}
      >
        <div className="quote-caustic" />
        <p>
          "Absolutely stunning. Glaze transforms your ideas into liquid, living guidance. The interface feels soft, fast, and uncannily present."
        </p>
        <div className="quote-tags">
          <span>Companion first</span>
          <span>Ghost typing</span>
          <span>Human final say</span>
        </div>
      </motion.div>

      <motion.section
        className="wizard-shell glass-card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className="wizard-header">
          <div>
            <p className="eyebrow">First-run wizard</p>
            <h2>Companion-first onboarding</h2>
          </div>
          <div className="wizard-steps">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={index === stepIndex ? 'step-chip active' : 'step-chip'}
                onClick={() => setStepIndex(index)}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {stepIndex === 0 ? (
            <motion.div
              key="identity"
              className="wizard-grid"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <label className="field">
                <span><Sparkles size={16} /> Display name</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Glaze Pilot" />
              </label>
              <label className="field">
                <span><Mail size={16} /> Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pilot@glaze.so" />
              </label>

              {hasSupabase ? (
                <>
                  <div className="field-row">
                    <button type="button" className="secondary-button" onClick={handleSendOtp} disabled={busy || !email}>
                      Send code
                    </button>
                    <label className="field compact">
                      <span>Verification code</span>
                      <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" />
                    </label>
                    <button type="button" className="secondary-button" onClick={handleVerifyOtp} disabled={busy || otp.length < 6}>
                      Verify
                    </button>
                  </div>
                  <p className="subtle-copy">
                    Use email verification if you want your setup, recent cards, and preferences to stay with you across devices.
                  </p>
                </>
              ) : (
                <p className="subtle-copy">
                  You can finish setup now and add account sync later. Nothing here blocks the first launch.
                </p>
              )}
            </motion.div>
          ) : null}

          {stepIndex === 1 ? (
            <motion.div
              key="provider"
              className="wizard-grid"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
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
                    <option value={provider.id} key={provider.id}>
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
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste the provider key Glaze should use" />
              </label>
              <label className="field">
                <span><ShieldCheck size={16} /> Vault passphrase</span>
                <input
                  value={vaultPassphrase}
                  onChange={(event) => setVaultPassphrase(event.target.value)}
                  placeholder="At least 8 characters"
                  type="password"
                />
              </label>
              <p className="subtle-copy">
                Your provider key is sealed inside the Glaze vault and only unlocked on this device when you enter your passphrase.
              </p>
            </motion.div>
          ) : null}

          {stepIndex === 2 ? (
            <motion.div
              key="consent"
              className="wizard-grid"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <div className="toggle-row">
                <div>
                  <p>Passive observation</p>
                  <span>Scan the focused app every 5 seconds and pulse when new insights are ready.</span>
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
              <div className="toggle-row">
                <div>
                  <p>Ghost typing</p>
                  <span>Insert or replace approved content inside the active app, with clipboard fallback when injection is blocked.</span>
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
              <div className="toggle-row">
                <div>
                  <p>Capture indicator</p>
                  <span>Show a visible pulse whenever Glaze is reading the current screen context.</span>
                </div>
                <button
                  type="button"
                  className={permissions.captureIndicatorEnabled ? 'toggle active' : 'toggle'}
                  onClick={() =>
                    setPermissions((current) => ({
                      ...current,
                      captureIndicatorEnabled: !current.captureIndicatorEnabled,
                    }))
                  }
                >
                  <span />
                </button>
              </div>
              <div className="consent-strip">
                <Eye size={18} />
                <span>Denylisted by default: {permissions.deniedApps.join(', ')}</span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="wizard-footer">
          <p className="status-pill">
            <CheckCircle2 size={16} />
            {status}
          </p>
          <div className="wizard-actions">
            {stepIndex > 0 ? (
              <button type="button" className="secondary-button" onClick={() => setStepIndex((current) => current - 1)}>
                Back
              </button>
            ) : null}
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => setStepIndex((current) => current + 1)}
                disabled={busy || (stepIndex === 0 ? !canAdvanceIdentity : !canAdvanceProvider)}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={handleComplete} disabled={busy || !canAdvanceProvider}>
                Launch Glaze
              </button>
            )}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="knowledge-band glass-card"
        initial={{ opacity: 0, y: 70 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 110, damping: 18 }}
      >
        <div className="knowledge-header">
          <div>
            <p className="eyebrow">Articles & help</p>
            <h2>How Glaze shows up across your day</h2>
          </div>
          <div className="knowledge-help-pill">
            <LifeBuoy size={16} />
            <span>Quick help built in</span>
          </div>
        </div>

        <div className="articles-grid">
          {articles.map((article, index) => {
            const Icon = article.icon
            return (
              <motion.article
                key={article.title}
                className="article-card"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 + index * 0.08, type: 'spring', stiffness: 140, damping: 18 }}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <div className="article-icon">
                  <Icon size={18} />
                </div>
                <h3>{article.title}</h3>
                <p>{article.body}</p>
                <button type="button" className="ghost-link" onClick={() => setStepIndex(index)}>
                  Explore this mode
                  <ArrowRight size={15} />
                </button>
              </motion.article>
            )
          })}
        </div>

        <div className="help-strip">
          {quickHelp.map((item, index) => (
            <motion.div
              key={item}
              className="help-bullet"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.34 + index * 0.05 }}
            >
              <ShieldCheck size={15} />
              <span>{item}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}
