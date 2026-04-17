'use client'

import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowUpRight, Download, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { PropsWithChildren } from 'react'

import { articles } from '@/lib/site-content'

import { ThemeToggle } from './theme-toggle'

const navLinks = [
  { href: '/', label: 'Overview', match: (pathname: string) => pathname === '/' },
  { href: '/download', label: 'Download', match: (pathname: string) => pathname.startsWith('/download') },
  { href: '/articles', label: 'Articles', match: (pathname: string) => pathname.startsWith('/articles') },
  { href: '/help', label: 'Help', match: (pathname: string) => pathname.startsWith('/help') },
]

export function SiteFrame({ children }: PropsWithChildren) {
  const pathname = usePathname()

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <div className="shell-grid">
        <motion.header
          className="site-header surface"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 170, damping: 18 }}
        >
          <Link href="/" className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              <span className="eyebrow eyebrow--tight">Desktop AI Companion</span>
              <strong>Glaze</strong>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx('nav-link', link.match(pathname) && 'is-active')}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Link href="/download" className="button-secondary button-secondary--compact">
              <Download size={16} />
              Get Setup
            </Link>
            <ThemeToggle />
          </div>
        </motion.header>

        <main className="page-slot">{children}</main>

        <footer className="site-footer surface">
          <div className="footer-grid">
            <div className="footer-panel">
              <span className="eyebrow eyebrow--tight">Glaze</span>
              <h2 className="footer-title">The desktop layer stays on the computer. The website keeps everything around it clear.</h2>
              <p className="body-copy body-copy--muted">
                Use the public site for download, guides, release context, and workflow articles. Use the desktop app when the work actually starts.
              </p>
            </div>

            <div className="footer-panel">
              <span className="footer-kicker">Jump in</span>
              <div className="footer-link-stack">
                <Link href="/download" className="footer-link">
                  <Download size={16} />
                  Download the Windows setup
                </Link>
                <Link href="/help" className="footer-link">
                  <Sparkles size={16} />
                  Read help and onboarding notes
                </Link>
              </div>
            </div>

            <div className="footer-panel">
              <span className="footer-kicker">Articles</span>
              <div className="footer-link-stack">
                {articles.map((article) => (
                  <Link key={article.slug} href={`/articles/${article.slug}`} className="footer-link footer-link--plain">
                    {article.title}
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
