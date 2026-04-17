import { motion } from 'framer-motion'
import { EyeOff, ScanText } from 'lucide-react'

import type { ContextSnapshot } from '../types/glaze'

interface ContextPreviewSheetProps {
  snapshot: ContextSnapshot | null
  onClose: () => void
}

export function ContextPreviewSheet({ snapshot, onClose }: ContextPreviewSheetProps) {
  return (
    <motion.aside
      className="preview-sheet glass-card"
      initial={{ opacity: 0, x: 42 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 42 }}
      transition={{ type: 'spring', stiffness: 155, damping: 18 }}
    >
      <div className="sheet-header">
        <div>
          <p className="eyebrow">What Glaze saw</p>
          <h3>{snapshot?.appName ?? 'No snapshot yet'}</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          <EyeOff size={17} />
        </button>
      </div>

      <div className="preview-meta">
        <div>
          <span className="strip-label">Window title</span>
          <strong>{snapshot?.windowTitle ?? 'Waiting for context'}</strong>
        </div>
        <div>
          <span className="strip-label">Bounds</span>
          <strong>
            {snapshot
              ? `${snapshot.windowBounds.width} x ${snapshot.windowBounds.height}`
              : 'Unknown'}
          </strong>
        </div>
      </div>

      {snapshot?.screenshotDataUrl ? (
        <div className="preview-block image-preview">
          <span className="strip-label">Window capture</span>
          <img
            className="preview-image"
            src={snapshot.screenshotDataUrl}
            alt={`Captured view of ${snapshot.windowTitle}`}
          />
        </div>
      ) : null}

      <div className="preview-block large">
        <span className="strip-label">
          <ScanText size={14} />
          Extracted context
        </span>
        <p>
          {snapshot?.contextSummary ||
            snapshot?.extractedText ||
            'Glaze has not produced extracted text yet. If the selected provider supports vision, the screenshot is being sent directly instead.'}
        </p>
      </div>

      <button type="button" className="secondary-button full-width" onClick={onClose}>
        Return to overlay
      </button>
    </motion.aside>
  )
}
