import { ArrowRight, LifeBuoy, PauseCircle, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { faqs, supportGuides } from '@/lib/site-content'

export default function HelpPage() {
  return (
    <div className="page-stack">
      <section className="surface page-hero">
        <span className="eyebrow">Help</span>
        <h1 className="display-title display-title--page">Everything the public site should explain before the desktop workflow begins.</h1>
        <p className="body-copy body-copy--lead">
          The goal of the help layer is clarity. Download, install, unlock, understand the approval model, and get comfortable with the companion before it enters your daily flow.
        </p>
        <div className="cta-row">
          <Link href="/download" className="button-primary">
            Download setup
          </Link>
          <Link href="/articles" className="button-secondary">
            Read workflow articles
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section-grid section-grid--three">
        {supportGuides.map((guide, index) => {
          const Icon = [LifeBuoy, ShieldCheck, Sparkles][index] ?? LifeBuoy

          return (
            <article key={guide.title} className="surface info-card">
              <div className="icon-badge">
                <Icon size={18} />
              </div>
              <h2>{guide.title}</h2>
              <p className="body-copy body-copy--muted">{guide.body}</p>
            </article>
          )
        })}
      </section>

      <section className="section-grid section-grid--split">
        <div className="surface content-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Core behaviors</span>
              <h2 className="section-title">What users should understand immediately.</h2>
            </div>
          </div>

          <div className="list-grid">
            <div className="list-card">
              <PauseCircle size={16} />
              <span>Pause is a first-class control. The overlay should never feel impossible to quiet.</span>
            </div>
            <div className="list-card">
              <ShieldCheck size={16} />
              <span>Suggestions are visible first. Applying content remains a deliberate user action.</span>
            </div>
            <div className="list-card">
              <Sparkles size={16} />
              <span>The best experience comes from short contextual assistance, not constant interruption.</span>
            </div>
          </div>
        </div>

        <div className="surface callout-panel">
          <span className="eyebrow">Need the install path?</span>
          <h2 className="section-title">Use the download page for setup and the articles section for workflow guidance.</h2>
          <p className="body-copy body-copy--muted">
            Help should stay simple: how to install, how to pause, how to trust the companion model, and where to learn more.
          </p>
          <Link href="/download" className="button-secondary">
            Go to download page
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="surface content-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2 className="section-title">Short answers for the first questions people ask.</h2>
          </div>
        </div>

        <div className="faq-grid">
          {faqs.map((faq) => (
            <article key={faq.question} className="faq-card">
              <h3>{faq.question}</h3>
              <p className="body-copy body-copy--muted">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
