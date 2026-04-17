import { ArrowRight, CheckCircle2, Download, MonitorSmartphone, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { downloadHighlights, installSteps } from '@/lib/site-content'

const releaseNotes = [
  'Glassy desktop shell with animated overlay surfaces',
  'In-app setup flow for provider connection and vault unlock',
  'Pause control, deny list support, and contextual card previews',
]

export default function DownloadPage() {
  return (
    <div className="page-stack">
      <section className="surface page-hero">
        <span className="eyebrow">Download</span>
        <h1 className="display-title display-title--page">Install Glaze on the computer and keep the public site for everything around it.</h1>
        <p className="body-copy body-copy--lead">
          The desktop app is the main experience. Download the Windows setup, install it, and use the site for release notes, onboarding context, and workflow articles.
        </p>

        <div className="cta-row">
          <a className="button-primary" href="/downloads/glaze-setup.exe">
            <Download size={18} />
            Download Windows setup
          </a>
          <Link href="/help" className="button-secondary">
            Installation help
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section-grid section-grid--three">
        {downloadHighlights.map((item) => (
          <article key={item.label} className="surface info-card">
            <span className="info-label">{item.label}</span>
            <h2>{item.value}</h2>
            <p className="body-copy body-copy--muted">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="section-grid section-grid--split">
        <div className="surface content-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Install steps</span>
              <h2 className="section-title">A short path from download to a working desktop layer.</h2>
            </div>
            <span className="section-chip">Windows preview</span>
          </div>

          <div className="timeline-grid">
            {installSteps.map((step, index) => (
              <article key={step.title} className="timeline-card">
                <span className="timeline-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p className="body-copy body-copy--muted">{step.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="surface callout-panel">
          <span className="eyebrow">Included in the app</span>
          <div className="callout-stack">
            <div className="callout-item">
              <MonitorSmartphone size={16} />
              <div>
                <strong>Desktop shell</strong>
                <span>Transparent overlay presentation with a focused setup flow.</span>
              </div>
            </div>
            <div className="callout-item">
              <Sparkles size={16} />
              <div>
                <strong>Insight cards</strong>
                <span>Context-aware suggestion surfaces built for quick review and approval.</span>
              </div>
            </div>
            <div className="callout-item">
              <ShieldCheck size={16} />
              <div>
                <strong>Companion safety</strong>
                <span>Pause controls and approval boundaries that keep the user in charge.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface content-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Preview notes</span>
            <h2 className="section-title">What the current download is centered around.</h2>
          </div>
          <Link href="/articles" className="text-link">
            Read workflow notes
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="list-grid">
          {releaseNotes.map((note) => (
            <div key={note} className="list-card">
              <CheckCircle2 size={16} />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
