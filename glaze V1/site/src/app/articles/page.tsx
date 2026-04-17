import { ArrowRight, BookOpenText, PenTool, Workflow } from 'lucide-react'
import Link from 'next/link'

import { articles } from '@/lib/site-content'

const articleIcons = [PenTool, Workflow, BookOpenText]

export default function ArticlesPage() {
  return (
    <div className="page-stack">
      <section className="surface page-hero">
        <span className="eyebrow">Articles</span>
        <h1 className="display-title display-title--page">A sharper public layer for how Glaze fits into writing, coding, and research.</h1>
        <p className="body-copy body-copy--lead">
          The site should teach the product, not just market it. These pieces explain where the overlay helps, where it should stay quiet, and how the desktop workflow should feel.
        </p>
      </section>

      <section className="section-grid section-grid--three">
        {articles.map((article, index) => {
          const Icon = articleIcons[index] ?? PenTool

          return (
            <article key={article.slug} className="surface article-card article-card--route">
              <div className="article-topline">
                <div className="icon-badge icon-badge--small">
                  <Icon size={16} />
                </div>
                <span>{article.kicker}</span>
              </div>
              <h2>{article.title}</h2>
              <p className="body-copy body-copy--muted">{article.excerpt}</p>
              <div className="article-actions">
                <span className="mini-meta">{article.readTime}</span>
                <Link href={`/articles/${article.slug}`} className="text-link">
                  Read article
                  <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
