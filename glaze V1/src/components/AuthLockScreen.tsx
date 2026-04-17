import { useState } from 'react'
import { motion } from 'framer-motion'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

interface AuthLockScreenProps {
  email: string
  onUnlock: (passphrase: string) => Promise<string>
}

export function AuthLockScreen({ email, onUnlock }: AuthLockScreenProps) {
  const [passphrase, setPassphrase] = useState('')
  const [message, setMessage] = useState('Enter the Glaze vault passphrase to decrypt your synced provider keys.')
  const [busy, setBusy] = useState(false)

  async function handleUnlock() {
    setBusy(true)
    const result = await onUnlock(passphrase)
    setMessage(result)
    setBusy(false)
  }

  return (
    <motion.section
      className="auth-lock glass-card"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 130, damping: 16 }}
    >
      <div className="lock-crest">
        <LockKeyhole size={28} />
      </div>
      <p className="eyebrow">Vault unlock</p>
      <h2>{email || 'Glaze Vault'}</h2>
      <p className="subtle-copy">
        Your provider secrets are sealed inside your secure vault. Glaze only unlocks them after this passphrase is entered here.
      </p>

      <label className="field">
        <span><ShieldCheck size={16} /> Vault passphrase</span>
        <input
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          placeholder="Enter the passphrase you set during onboarding"
        />
      </label>

      <button type="button" className="primary-button full-width" onClick={handleUnlock} disabled={busy || passphrase.length < 8}>
        Unlock companion
      </button>

      <p className="status-pill wide">{message}</p>
    </motion.section>
  )
}
