import { useEffect } from 'react';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_ROBOTS,
  DEFAULT_SEO_IMAGE,
  DEFAULT_THEME_COLOR,
  SITE_NAME,
  createBaseMeta,
  getCanonicalUrl,
  toSeoImage
} from '../seo/siteMetadata.js';

type SeoMetaInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  themeColor?: string;
  noIndex?: boolean;
  keywords?: string[] | string;
  imageAlt?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
} | null | undefined;

const ensureMeta = (
  selector: string,
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string
) => {
  const existing = document.head.querySelector<HTMLMetaElement>(`${selector}[${attributeName}="${attributeValue}"]`);
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }

  const meta = document.createElement('meta');
  meta.setAttribute(attributeName, attributeValue);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
};

const ensureLink = (rel: string, href: string) => {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (existing) {
    existing.setAttribute('href', href);
    return;
  }

  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  document.head.appendChild(link);
};

const removeManagedStructuredData = () => {
  document.head
    .querySelectorAll('script[data-seo-jsonld="true"]')
    .forEach((node) => node.parentNode?.removeChild(node));
};

const appendStructuredData = (jsonLd: Record<string, any> | Array<Record<string, any>> | undefined) => {
  const list = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  list.forEach((entry) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
};

export const useSeoMeta = (meta: SeoMetaInput) => {
  useEffect(() => {
    if (!meta || typeof document === 'undefined') return;

    const effectiveMeta = createBaseMeta({
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      image: DEFAULT_SEO_IMAGE,
      themeColor: DEFAULT_THEME_COLOR,
      keywords: DEFAULT_KEYWORDS,
      ...meta
    });

    const canonicalUrl = getCanonicalUrl(effectiveMeta.path);
    const imageUrl = toSeoImage(effectiveMeta.image);
    const keywords = Array.isArray(effectiveMeta.keywords)
      ? effectiveMeta.keywords.join(', ')
      : String(effectiveMeta.keywords || '');

    document.title = effectiveMeta.title;
    ensureMeta('meta', 'name', 'description', effectiveMeta.description);
    ensureMeta('meta', 'name', 'keywords', keywords);
    ensureMeta('meta', 'name', 'robots', effectiveMeta.noIndex ? 'noindex,nofollow' : DEFAULT_ROBOTS);
    ensureMeta('meta', 'name', 'application-name', SITE_NAME);
    ensureMeta('meta', 'name', 'apple-mobile-web-app-title', SITE_NAME);
    ensureMeta('meta', 'name', 'theme-color', effectiveMeta.themeColor || DEFAULT_THEME_COLOR);
    ensureMeta('meta', 'name', 'format-detection', 'telephone=no,address=no,email=no');
    ensureMeta('meta', 'property', 'og:site_name', SITE_NAME);
    ensureMeta('meta', 'property', 'og:locale', 'en_US');
    ensureMeta('meta', 'property', 'og:type', effectiveMeta.type || 'website');
    ensureMeta('meta', 'property', 'og:title', effectiveMeta.title);
    ensureMeta('meta', 'property', 'og:description', effectiveMeta.description);
    ensureMeta('meta', 'property', 'og:url', canonicalUrl);
    ensureMeta('meta', 'property', 'og:image', imageUrl);
    ensureMeta('meta', 'property', 'og:image:alt', effectiveMeta.imageAlt || `${SITE_NAME} preview image`);
    ensureMeta('meta', 'name', 'twitter:card', 'summary_large_image');
    ensureMeta('meta', 'name', 'twitter:title', effectiveMeta.title);
    ensureMeta('meta', 'name', 'twitter:description', effectiveMeta.description);
    ensureMeta('meta', 'name', 'twitter:image', imageUrl);
    ensureLink('canonical', canonicalUrl);

    document.documentElement.setAttribute('lang', 'en');
    removeManagedStructuredData();
    appendStructuredData(effectiveMeta.jsonLd);
  }, [meta]);
};

export default useSeoMeta;
