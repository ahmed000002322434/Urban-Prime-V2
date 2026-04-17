import { motion } from 'framer-motion'
import { ArrowRight, Download, ExternalLink, MonitorSmartphone, Sparkles } from 'lucide-react'

const previewCards = [
  {
    title: 'Website lives in Next.js',
    body: 'The public product surface now lives in the separate Next.js site with download, help, and articles.',
  },
  {
    title: 'This renderer powers the app',
    body: 'The Vite frontend at port 5173 is only the desktop shell renderer used by the installed Tauri application.',
  },
  {
    title: 'Desktop setup stays in-app',
    body: 'Provider connection, vault unlock, pause controls, and overlay behavior belong inside the desktop application itself.',
  },
]

export function BrowserPreviewPanel() {
  return (
    <div className="glaze-stage">
      <div className="stage-orbit stage-orbit-a" />
      <div className="stage-orbit stage-orbit-b" />

      <motion.section
        className="brand-billboard glass-card"
        initial={{ opacity: 0, y: 42 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className="brand-caustic" />
        <div className="brand-lockup">
          <motion.div
            className="brand-mark"
            animate={{ rotate: [0, 4, 0, -3, 0], y: [0, -6, 0] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <span />
          </motion.div>
          <div>
            <p className="eyebrow">Website moved</p>
            <h1>Glaze</h1>
          </div>
        </div>

        <p className="hero-copy">
          You are looking at the desktop renderer in a normal browser tab. The actual public website now lives separately in Next.js, and the real desktop setup only appears inside the installed app.
        </p>

        <div className="wizard-actions browser-preview-actions">
          <a className="hero-pill" href="http://localhost:3000" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            <span>Open Next.js website</span>
          </a>
          <a className="secondary-button" href="#desktop-preview">
            <MonitorSmartphone size={16} />
            Desktop app info
          </a>
        </div>

        <div className="brand-metrics">
          <div className="metric-pill">
            <strong>3000</strong>
            <span>website port</span>
          </div>
          <div className="metric-pill">
            <strong>5173</strong>
            <span>desktop renderer</span>
          </div>
          <div className="metric-pill">
            <strong>Tauri</strong>
            <span>real desktop shell</span>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="wizard-shell glass-card browser-preview-card"
        id="desktop-preview"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className="wizard-header">
          <div>
            <p className="eyebrow">Correct entry points</p>
            <h2>Use the right surface for the right job</h2>
          </div>
        </div>

        <div className="wizard-grid">
          <div className="settings-section">
            <div className="toggle-row compact browser-preview-row">
              <div>
                <p>For the website</p>
                <span>Run the root command and open the Next.js public site for download, help, and editorial content.</span>
              </div>
              <span className="browser-command">npm run dev</span>
            </div>

            <div className="toggle-row compact browser-preview-row">
              <div>
                <p>For the desktop application</p>
                <span>Launch the Tauri shell when you want the actual installable app, floating orb, and in-app setup flow.</span>
              </div>
              <span className="browser-command">npm run dev:desktop</span>
            </div>
          </div>

          <p className="status-pill wide">
            <Sparkles size={16} />
            Browser preview no longer doubles as the main website.
          </p>

          <div className="articles-grid">
            {previewCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="article-card"
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 + index * 0.08, type: 'spring', stiffness: 140, damping: 18 }}
              >
                <div className="article-icon">
                  {index === 0 ? <ExternalLink size={18} /> : index === 1 ? <MonitorSmartphone size={18} /> : <Download size={18} />}
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </div>

          <div className="help-strip">
            <div className="help-bullet">
              <ArrowRight size={15} />
              <span>The site is separate by design.</span>
            </div>
            <div className="help-bullet">
              <ArrowRight size={15} />
              <span>The app setup belongs in the desktop shell.</span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
