import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="surface page-hero">
        <span className="eyebrow">Not found</span>
        <h1 className="display-title display-title--page">That page is not part of the public Glaze surface.</h1>
        <p className="body-copy body-copy--lead">
          Use the main routes for download, help, and articles, then move into the desktop app for the actual product experience.
        </p>
        <div className="cta-row">
          <Link href="/" className="button-primary">
            Back to overview
          </Link>
          <Link href="/download" className="button-secondary">
            Go to download
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
