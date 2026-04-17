'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenText,
  Bot,
  Download,
  LifeBuoy,
  MonitorSmartphone,
  PenTool,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import Link from 'next/link'

import { articles, installSteps, supportGuides } from '@/lib/site-content'

const featureCards = [
  {
    icon: Bot,
    title: 'Desktop-first by design',
    body: 'Glaze is not the product inside the browser. The installable app is the product, and the overlay is the core interaction layer.',
  },
  {
    icon: Sparkles,
    title: 'Liquid cards, not clunky panels',
    body: 'Suggestions arrive in soft glass cards with spring motion, glow, drift, and quick approval paths that stay close to the work.',
  },
  {
    icon: ShieldCheck,
    title: 'Quiet until useful',
    body: 'The companion waits, reads context, and respects the approval boundary. The user remains the pilot.',
  },
]

const previewSignals = [
  'Overlay ready',
  'Writing context',
  'Calm scan cadence',
  'Apply only on approval',
]

const homeArticles = articles.map((article, index) => ({
  ...article,
  icon: [PenTool, Workflow, BookOpenText][index] ?? PenTool,
}))

export function LandingPage() {
  return (
    <div className="page-stack">
      <section className="hero-grid">
        <motion.div
          className="surface hero-panel"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 145, damping: 18 }}
        >
          <div className="hero-halo hero-halo--one" />
          <div className="hero-halo hero-halo--two" />

          <span className="eyebrow">Installable AI companion</span>
          <h1 className="display-title">
            Glaze turns the computer into a living glass workspace instead of another place to open tabs.
          </h1>
          <p className="body-copy body-copy--lead">
            The site handles download, onboarding context, articles, and help. The actual experience lives on the desktop as a calm overlay with liquid cards, spring motion, and fast approval flows.
          </p>

          <div className="cta-row">
            <Link href="/download" className="button-primary">
              <Download size={18} />
              Download Windows setup
            </Link>
            <Link href="/articles" className="button-secondary">
              Explore articles
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="ribbon-row">
            {previewSignals.map((signal) => (
              <span key={signal} className="ribbon-pill">
                {signal}
              </span>
            ))}
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <strong>Desktop-first</strong>
              <span>Main product lives on the computer</span>
            </div>
            <div className="metric-card">
              <strong>Theme aware</strong>
              <span>Dark, light, and system-ready visuals</span>
            </div>
            <div className="metric-card">
              <strong>Low friction</strong>
              <span>Download, install, unlock, and work</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="surface hero-preview"
          initial={{ opacity: 0, x: 32, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 19, delay: 0.06 }}
        >
          <div className="spectral-stream spectral-stream--one" />
          <div className="spectral-stream spectral-stream--two" />

          <div className="desktop-stage">
            <div className="stage-topbar">
              <span className="status-pill">
                <MonitorSmartphone size={14} />
                Desktop layer active
              </span>
              <span className="status-pill status-pill--muted">Theme adaptive</span>
            </div>

            <div className="stage-panel stage-panel--header">
              <span className="eyebrow eyebrow--tight">Live overlay</span>
              <h2>Thin glass, soft bloom, and suggestions that expand only when they matter.</h2>
            </div>

            <div className="stage-orb">
              <span className="stage-orb-core" />
            </div>

            <motion.div
              className="stage-card stage-card--primary"
              animate={{ y: [0, -8, 0], rotate: [0, -1.6, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 7.2, ease: 'easeInOut' }}
            >
              <span className="eyebrow eyebrow--tight">Insight card</span>
              <h3>Trim this section and move the call to action up one paragraph.</h3>
              <p>Context-aware suggestions appear as compact cards instead of taking over the screen.</p>
            </motion.div>

            <motion.div
              className="stage-card stage-card--secondary"
              animate={{ y: [0, 10, 0], rotate: [0, 1.5, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8.4, ease: 'easeInOut' }}
            >
              <span className="stage-chip">Preview</span>
              <p>Writing detected</p>
              <strong>Suggested action ready</strong>
            </motion.div>

            <motion.div
              className="stage-card stage-card--tertiary"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 6.2, ease: 'easeInOut' }}
            >
              <span className="eyebrow eyebrow--tight">Companion state</span>
              <ul className="mini-list">
                <li>Observe visible context</li>
                <li>Pause instantly</li>
                <li>Apply only on approval</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="section-grid section-grid--three">
        {featureCards.map((feature, index) => {
          const Icon = feature.icon

          return (
            <motion.article
              key={feature.title}
              className="surface info-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 150, damping: 18 }}
            >
              <div className="icon-badge">
                <Icon size={18} />
              </div>
              <h3>{feature.title}</h3>
              <p className="body-copy body-copy--muted">{feature.body}</p>
            </motion.article>
          )
        })}
      </section>

      <section className="section-grid section-grid--split">
        <div className="surface content-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">From site to software</span>
              <h2 className="section-title">A public front door and a focused desktop workflow.</h2>
            </div>
            <span className="section-chip">No browser-first compromise</span>
          </div>

          <div className="timeline-grid">
            {installSteps.map((step, index) => (
              <article className="timeline-card" key={step.title}>
                <span className="timeline-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p className="body-copy body-copy--muted">{step.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="surface callout-panel">
          <span className="eyebrow">What the site is for</span>
          <h2 className="section-title">Download, release context, guides, and editorial content.</h2>
          <p className="body-copy body-copy--muted">
            The website should feel premium and alive, but it should not pretend to be the main software. It exists to make the desktop product easier to discover, install, and trust.
          </p>
          <div className="callout-stack">
            {supportGuides.map((guide) => (
              <div className="callout-item" key={guide.title}>
                <LifeBuoy size={16} />
                <div>
                  <strong>{guide.title}</strong>
                  <span>{guide.body}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/help" className="button-secondary">
            Open help center
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section-grid section-grid--split">
        <div className="surface content-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Articles</span>
              <h2 className="section-title">Guides and workflow notes for using Glaze in real work.</h2>
            </div>
            <Link href="/articles" className="text-link">
              Browse all articles
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="article-grid">
            {homeArticles.map((article, index) => {
              const Icon = article.icon

              return (
                <motion.article
                  key={article.slug}
                  className="article-card"
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 150, damping: 18 }}
                >
                  <div className="article-topline">
                    <div className="icon-badge icon-badge--small">
                      <Icon size={16} />
                    </div>
                    <span>{article.kicker}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p className="body-copy body-copy--muted">{article.excerpt}</p>
                  <div className="article-actions">
                    <span className="mini-meta">{article.readTime}</span>
                    <Link href={`/articles/${article.slug}`} className="text-link">
                      Read article
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>

        <div className="surface cta-panel">
          <span className="eyebrow">Download</span>
          <h2 className="section-title">Get the setup and put the real product on the machine where it belongs.</h2>
          <p className="body-copy body-copy--muted">
            Keep the site for discovery. Keep the work inside the installable app.
          </p>
          <Link href="/download" className="button-primary">
            <Download size={18} />
            Go to downloads
          </Link>
        </div>
      </section>
    </div>
  )
}
