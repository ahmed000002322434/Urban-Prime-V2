import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { articles } from '@/lib/site-content'

type ArticlePageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = articles.find((entry) => entry.slug === slug)

  if (!article) {
    return {}
  }

  return {
    title: `${article.title} | Glaze`,
    description: article.excerpt,
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = articles.find((entry) => entry.slug === slug)

  if (!article) {
    notFound()
  }

  const relatedArticles = articles.filter((entry) => entry.slug !== article.slug).slice(0, 2)

  return (
    <div className="page-stack">
      <section className="surface article-hero">
        <Link href="/articles" className="text-link text-link--back">
          <ArrowLeft size={15} />
          Back to articles
        </Link>
        <span className="eyebrow">{article.kicker}</span>
        <h1 className="display-title display-title--page">{article.title}</h1>
        <p className="body-copy body-copy--lead">{article.heroBlurb}</p>
        <div className="article-meta-row">
          <span className="mini-meta">{article.readTime}</span>
          <span className="mini-meta">Desktop workflow guide</span>
        </div>
      </section>

      <section className="article-layout">
        <article className="surface article-body">
          {article.sections.map((section) => (
            <section key={section.heading} className="article-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="body-copy body-copy--article">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="bullet-list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.callout ? <div className="article-callout">{section.callout}</div> : null}
            </section>
          ))}
        </article>

        <aside className="surface article-rail">
          <span className="eyebrow">More to explore</span>
          <div className="article-rail-stack">
            {relatedArticles.map((related) => (
              <Link key={related.slug} href={`/articles/${related.slug}`} className="rail-link">
                <div>
                  <strong>{related.title}</strong>
                  <span>{related.readTime}</span>
                </div>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
          <Link href="/download" className="button-secondary">
            Download Glaze
            <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </div>
  )
}
