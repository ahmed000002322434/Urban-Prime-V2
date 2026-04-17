import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Copy,
  Eye,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'

import { beginDragging } from '../services/tauri-bridge'
import type { CaptureStatus, ContextSnapshot, InsightCard, OverlayState, ProviderConfig } from '../types/glaze'

interface GlazeOverlayProps {
  overlayState: OverlayState
  insights: InsightCard[]
  snapshot: ContextSnapshot | null
  captureStatus: CaptureStatus
  activeProvider?: ProviderConfig
  settingsOpen: boolean
  onToggleExpanded: (expanded: boolean) => void
  onPauseToggle: () => void
  onOpenSettings: () => void
  onOpenPreview: () => void
  onDismissInsight: (insightId: string) => void
  onApplyInsight: (insight: InsightCard, actionType: InsightCard['applyMode']) => void
}

function confidenceLabel(confidence: number) {
  return `${Math.round(confidence * 100)}% match`
}

export function GlazeOverlay({
  overlayState,
  insights,
  snapshot,
  captureStatus,
  activeProvider,
  settingsOpen,
  onToggleExpanded,
  onPauseToggle,
  onOpenSettings,
  onOpenPreview,
  onDismissInsight,
  onApplyInsight,
}: GlazeOverlayProps) {
  const expanded = overlayState === 'cards_expanded' || settingsOpen

  return (
    <div className={expanded ? 'overlay-shell expanded' : 'overlay-shell collapsed'}>
      <motion.button
        type="button"
        className={overlayState === 'paused' ? 'orb-button paused' : 'orb-button'}
        layout
        onClick={() => onToggleExpanded(!expanded)}
        onPointerDown={() => {
          void beginDragging()
        }}
        whileTap={{ scale: 0.96 }}
      >
        <span className="orb-core">
          <span className="orb-wave" />
          <span className="orb-logo">G</span>
        </span>
        <span className="orb-meta">
          <span>{overlayState === 'paused' ? 'Paused' : 'Glaze'}</span>
          <small>{snapshot?.appName ?? 'Awaiting context'}</small>
        </span>
        {captureStatus.active ? <span className="capture-dot" /> : null}
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.section
            className="overlay-panel glass-card"
            layout
            initial={{ opacity: 0, x: 72, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 72, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          >
            <div className="panel-caustic" />
            <header className="overlay-header" data-tauri-drag-region>
              <div>
                <p className="eyebrow">Floating companion</p>
                <h2>{snapshot?.appName ?? 'Waiting for a live window'}</h2>
              </div>
              <div className="overlay-header-actions">
                <button type="button" className="icon-button" onClick={onPauseToggle}>
                  {overlayState === 'paused' ? <Play size={17} /> : <Pause size={17} />}
                </button>
                <button type="button" className="icon-button" onClick={onOpenPreview}>
                  <Eye size={17} />
                </button>
                <button type="button" className="icon-button" onClick={onOpenSettings}>
                  <Settings2 size={17} />
                </button>
                <button type="button" className="icon-button" onClick={() => onToggleExpanded(false)}>
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="snapshot-strip">
              <div>
                <span className="strip-label">Focused window</span>
                <strong>{snapshot?.windowTitle ?? 'No active snapshot yet'}</strong>
              </div>
              <div>
                <span className="strip-label">Provider</span>
                <strong>{activeProvider?.label ?? 'Demo engine'}</strong>
              </div>
              <div>
                <span className="strip-label">Mode</span>
                <strong>{activeProvider?.supportsVision ? 'Vision scan' : 'OCR fallback'}</strong>
              </div>
            </div>

            <div className="overlay-hero">
              <div>
                <p className="eyebrow">Live suggestion pulse</p>
                <h3>Glaze is reading the room, not interrupting it.</h3>
              </div>
              <div className="hero-status">
                <Sparkles size={16} />
                <span>{captureStatus.active ? 'Visual scan in progress' : 'Passive watch online'}</span>
              </div>
            </div>

            <div className="insight-stack">
              {insights.slice(0, 3).map((insight, index) => (
                <motion.article
                  key={insight.id}
                  className="insight-card"
                  initial={{ opacity: 0, y: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 150, damping: 18 }}
                >
                  <div className="insight-header">
                    <div>
                      <p>{insight.title}</p>
                      <span>{confidenceLabel(insight.confidence)} · {insight.sourceApp}</span>
                    </div>
                    <button type="button" className="dismiss-button" onClick={() => onDismissInsight(insight.id)}>
                      <X size={16} />
                    </button>
                  </div>
                  <p className="insight-reason">{insight.reason}</p>
                  <div className="preview-block">
                    <span className="strip-label">Preview</span>
                    <p>{insight.preview}</p>
                  </div>
                  <div className="insight-footer">
                    <button type="button" className="secondary-button" onClick={() => onApplyInsight(insight, 'copy')}>
                      <Copy size={15} />
                      Copy
                    </button>
                    <button type="button" className="secondary-button" onClick={() => onApplyInsight(insight, 'replace_selection')}>
                      <Wand2 size={15} />
                      Replace
                    </button>
                    <button type="button" className="primary-button" onClick={() => onApplyInsight(insight, 'insert')}>
                      <Check size={15} />
                      Insert
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
