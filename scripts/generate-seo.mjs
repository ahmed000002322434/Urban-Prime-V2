import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AHMAD_ALI_AI_SUMMARY,
  AHMAD_ALI_BIOGRAPHY,
  AHMAD_ALI_NAME,
  PUBLIC_STATIC_ROUTES,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  URBAN_PRIME_PLATFORM_DESCRIPTION,
  createItemSeoMeta,
  createPixeChannelSeoMeta,
  createPixeVideoSeoMeta,
  createPublicProfileSeoMeta,
  createServiceSeoMeta,
  normalizePathname,
  renderSeoHeadBlock,
  resolveStaticSeoMeta
} from '../seo/siteMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const markerPattern = /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/;
const rootPattern = /<div id="root"><\/div>/;
const defaultApiOrigin = 'https://urbanprim.vercel.app/api';
const productionApiOriginByHost = new Map([
  ['urbanprime.tech', 'https://urbanprime.tech/api'],
  ['www.urbanprime.tech', 'https://www.urbanprime.tech/api'],
  ['urbanprim.vercel.app', 'https://urbanprim.vercel.app/api']
]);

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());
const isLocalhostUrl = (value) => /:\/\/(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(String(value || '').trim());

const uniqueBy = (items, getKey) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const pickApiOrigin = () => {
  const rawCandidates = [
    process.env.SEO_API_ORIGIN,
    process.env.VITE_BACKEND_URL,
    ...(process.env.VITE_BACKEND_CANDIDATES || '').split(/[,\n;| ]+/g)
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter(isHttpUrl)
    .filter((entry) => !isLocalhostUrl(entry));

  if (rawCandidates[0]) {
    return rawCandidates[0];
  }

  const siteUrlCandidates = [
    process.env.SEO_SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    SITE_URL
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter(isHttpUrl);

  for (const siteUrl of siteUrlCandidates) {
    try {
      const host = new URL(siteUrl).hostname.toLowerCase();
      const mapped = productionApiOriginByHost.get(host);
      if (mapped) return mapped;
    } catch {
      // ignore malformed urls
    }
  }

  return rawCandidates[0] || defaultApiOrigin;
};

const apiOrigin = pickApiOrigin();

const joinUrlPath = (basePath, requestPath) => {
  const normalizedBase = `/${String(basePath || '').trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
  const normalizedRequest = `/${String(requestPath || '').trim().replace(/^\/+/, '')}`;

  if (normalizedBase === '/' || !normalizedBase) {
    return normalizedRequest;
  }

  if (normalizedBase === '/api' && (normalizedRequest === '/api' || normalizedRequest.startsWith('/api/'))) {
    return normalizedRequest;
  }

  return `${normalizedBase}${normalizedRequest === '/' ? '' : normalizedRequest}`;
};

const getJson = async (pathname, searchParams = undefined) => {
  const originUrl = new URL(apiOrigin);
  const url = new URL(originUrl.origin);
  url.pathname = joinUrlPath(originUrl.pathname, pathname);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(process.env.BACKEND_API_KEY ? { 'x-backend-key': String(process.env.BACKEND_API_KEY).trim() } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`${url.toString()} returned ${response.status}`);
  }

  return response.json();
};

const replaceSeoBlock = (html, meta) => {
  const nextBlock = renderSeoHeadBlock(meta);
  if (markerPattern.test(html)) {
    return html.replace(markerPattern, nextBlock);
  }

  throw new Error('SEO markers were not found in dist/index.html.');
};

const replaceRootContent = (html, content) => {
  if (rootPattern.test(html)) {
    return html.replace(rootPattern, `<div id="root">${content}</div>`);
  }

  throw new Error('Root application container was not found in dist/index.html.');
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nonEmpty = (value) => String(value ?? '').trim();

const compactText = (...values) =>
  values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => nonEmpty(value))
    .filter(Boolean);

const renderSectionBlock = (section) => {
  if (!section) return '';

  const paragraphs = compactText(section.paragraphs);
  const items = compactText(section.items);
  if (!section.heading && paragraphs.length === 0 && items.length === 0) return '';

  return [
    '<section style="margin-top:28px;">',
    section.heading
      ? `<h2 style="margin:0 0 12px;font-size:1.35rem;line-height:1.25;font-family:Poppins,Inter,Arial,sans-serif;">${escapeHtml(section.heading)}</h2>`
      : '',
    ...paragraphs.map((paragraph) => `<p style="margin:0 0 14px;color:#374151;">${escapeHtml(paragraph)}</p>`),
    items.length
      ? `<ul style="margin:0;padding-left:20px;color:#374151;">${items.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('')}</ul>`
      : '',
    '</section>'
  ].filter(Boolean).join('');
};

const renderLinkPills = (links) => {
  const list = links.filter((link) => link?.href && link?.label);
  if (list.length === 0) return '';

  return [
    '<nav aria-label="Public links" style="margin-top:32px;">',
    '<h2 style="margin:0 0 12px;font-size:1rem;text-transform:uppercase;letter-spacing:0.18em;color:#6b7280;">Public links</h2>',
    '<ul style="display:flex;flex-wrap:wrap;gap:12px;list-style:none;padding:0;margin:0;">',
    ...list.map((link) => `<li><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:10px 14px;border-radius:999px;border:1px solid #d1d5db;color:#111827;text-decoration:none;font-weight:600;">${escapeHtml(link.label)}</a></li>`),
    '</ul>',
    '</nav>'
  ].join('');
};

const renderSeoShell = ({
  eyebrow,
  title,
  description,
  intro = [],
  sections = [],
  links = []
}) => [
  '<main data-seo-prerender="true" style="max-width:960px;margin:0 auto;padding:56px 20px 96px;font-family:Inter,Arial,sans-serif;line-height:1.7;color:#111827;background:#ffffff;">',
  '<article>',
  eyebrow
    ? `<p style="margin:0 0 14px;font-size:0.78rem;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:#0f766e;">${escapeHtml(eyebrow)}</p>`
    : '',
  `<h1 style="margin:0 0 18px;font-size:clamp(2.4rem,5vw,4.4rem);line-height:1.05;font-family:Poppins,Inter,Arial,sans-serif;">${escapeHtml(title)}</h1>`,
  `<p style="margin:0 0 22px;max-width:780px;font-size:1.1rem;color:#4b5563;">${escapeHtml(description)}</p>`,
  ...compactText(intro).map((paragraph) => `<p style="margin:0 0 14px;color:#374151;">${escapeHtml(paragraph)}</p>`),
  ...sections.map(renderSectionBlock),
  renderLinkPills(links),
  '</article>',
  '</main>'
].filter(Boolean).join('');

const basePublicLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/browse', label: 'Browse products' },
  { href: '/services/marketplace', label: 'Services' },
  { href: '/pixe/explore', label: 'Explore Pixe' },
  { href: '/deals', label: 'Deals' }
];

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount} ${String(currency || 'USD').toUpperCase()}`;
  }
};

const getItemTitle = (item) => nonEmpty(item?.title) || nonEmpty(item?.name) || 'Marketplace listing';
const getItemDescription = (item) =>
  nonEmpty(item?.description) ||
  nonEmpty(item?.metadata?.description) ||
  nonEmpty(item?.short_description) ||
  '';
const getUserName = (user) =>
  nonEmpty(user?.display_name) ||
  nonEmpty(user?.full_name) ||
  nonEmpty(user?.name) ||
  nonEmpty(user?.username) ||
  'Urban Prime member';
const getUserBio = (user) =>
  nonEmpty(user?.bio) ||
  nonEmpty(user?.headline) ||
  nonEmpty(user?.about) ||
  '';
const getServiceTitle = (service) =>
  nonEmpty(service?.title) ||
  nonEmpty(service?.name) ||
  nonEmpty(service?.serviceName) ||
  'Service listing';
const getServiceDescription = (service) =>
  nonEmpty(service?.description) ||
  nonEmpty(service?.shortDescription) ||
  '';
const getVideoTitle = (video) =>
  nonEmpty(video?.title) ||
  nonEmpty(video?.caption) ||
  'Pixe video';
const getVideoDescription = (video) =>
  nonEmpty(video?.description) ||
  nonEmpty(video?.caption) ||
  '';
const getChannelName = (channel) =>
  nonEmpty(channel?.display_name) ||
  nonEmpty(channel?.name) ||
  nonEmpty(channel?.handle) ||
  'Pixe channel';
const getChannelDescription = (channel) =>
  nonEmpty(channel?.bio) ||
  nonEmpty(channel?.description) ||
  '';

const renderStaticRouteShell = (routePath, meta) => {
  if (routePath === '/') {
    return renderSeoShell({
      eyebrow: SITE_NAME,
      title: `${SITE_NAME} ${SITE_TAGLINE}`,
      description: URBAN_PRIME_PLATFORM_DESCRIPTION,
      intro: [
        `${SITE_NAME} is a public social marketplace for products, creators, short-form video, stores, services, rentals, auctions, and discovery.`,
        `${AHMAD_ALI_NAME} serves as founder and CEO, and the platform presents commerce and social participation in one public web experience.`
      ],
      sections: [
        {
          heading: 'Marketplace features',
          items: [
            'Public product discovery, storefronts, and creator-led listings',
            'Short-form video through Pixe, including public watch pages and creator channels',
            'Buying, selling, renting, auctions, and service-based transactions',
            'Social publishing and conversation around products and creators'
          ]
        }
      ],
      links: basePublicLinks
    });
  }

  if (routePath === '/about') {
    return renderSeoShell({
      eyebrow: 'Founder profile',
      title: `About ${SITE_NAME} and ${AHMAD_ALI_NAME}`,
      description: meta.description,
      intro: AHMAD_ALI_AI_SUMMARY,
      sections: [
        { heading: 'Early Life', paragraphs: [AHMAD_ALI_BIOGRAPHY.earlyLife] },
        { heading: 'Education', paragraphs: [AHMAD_ALI_BIOGRAPHY.education] },
        { heading: 'Career', paragraphs: [AHMAD_ALI_BIOGRAPHY.career] },
        { heading: 'Projects', paragraphs: [AHMAD_ALI_BIOGRAPHY.projects] },
        { heading: 'Vision', paragraphs: [AHMAD_ALI_BIOGRAPHY.vision] }
      ],
      links: basePublicLinks
    });
  }

  return renderSeoShell({
    eyebrow: SITE_NAME,
    title: meta.title,
    description: meta.description,
    intro: [
      `${SITE_NAME} publishes this page as part of its public social marketplace.`,
      'Public routes are linked into the site sitemap and are available for product, creator, service, and Pixe discovery.'
    ],
    links: basePublicLinks
  });
};

const renderItemShell = (routePath, meta, item) => {
  const ownerId = nonEmpty(item?.ownerId) || nonEmpty(item?.owner_id) || nonEmpty(item?.sellerId);
  const ownerName = nonEmpty(item?.ownerName) || nonEmpty(item?.sellerName) || 'Urban Prime seller';
  const category = nonEmpty(item?.category) || nonEmpty(item?.category_name) || nonEmpty(item?.metadata?.category);
  const price = formatCurrency(
    item?.salePrice ?? item?.sale_price ?? item?.price ?? item?.rentalPrice ?? item?.rental_price,
    item?.currency || item?.metadata?.currency || 'USD'
  );

  return renderSeoShell({
    eyebrow: 'Product listing',
    title: getItemTitle(item),
    description: meta.description,
    intro: [getItemDescription(item)],
    sections: [
      {
        heading: 'Listing details',
        items: compactText(
          category ? `Category: ${category}` : '',
          price ? `Price: ${price}` : '',
          ownerName ? `Seller: ${ownerName}` : ''
        )
      }
    ],
    links: [
      { href: '/browse', label: 'Browse products' },
      ownerId ? { href: `/user/${encodeURIComponent(ownerId)}`, label: `View ${ownerName}` } : null,
      { href: '/deals', label: 'Deals' },
      { href: '/pixe/explore', label: 'Explore Pixe' }
    ].filter(Boolean)
  });
};

const renderUserShell = (routePath, meta, user) =>
  renderSeoShell({
    eyebrow: 'Public profile',
    title: getUserName(user),
    description: meta.description,
    intro: compactText(getUserBio(user)),
    sections: [
      {
        heading: 'Profile summary',
        items: compactText(
          nonEmpty(user?.username) ? `Username: @${String(user.username).replace(/^@+/, '')}` : '',
          nonEmpty(user?.location) ? `Location: ${user.location}` : '',
          nonEmpty(user?.role) ? `Role: ${user.role}` : ''
        )
      }
    ],
    links: [
      { href: '/browse', label: 'Browse products' },
      { href: '/stores', label: 'Explore stores' },
      { href: '/pixe/creators', label: 'Pixe creators' }
    ]
  });

const renderServiceShell = (routePath, meta, service) =>
  renderSeoShell({
    eyebrow: 'Service listing',
    title: getServiceTitle(service),
    description: meta.description,
    intro: compactText(getServiceDescription(service)),
    sections: [
      {
        heading: 'Service overview',
        items: compactText(
          nonEmpty(service?.category) ? `Category: ${service.category}` : '',
          nonEmpty(service?.providerName) ? `Provider: ${service.providerName}` : '',
          nonEmpty(service?.deliveryMode) ? `Delivery mode: ${service.deliveryMode}` : ''
        )
      }
    ],
    links: [
      { href: '/services/marketplace', label: 'Browse services' },
      { href: '/about', label: 'About Urban Prime' },
      { href: '/pixe/explore', label: 'Explore Pixe' }
    ]
  });

const renderPixeVideoShell = (routePath, meta, video) => {
  const handle = nonEmpty(video?.channel?.handle);
  const channelName = getChannelName(video?.channel);

  return renderSeoShell({
    eyebrow: 'Pixe video',
    title: getVideoTitle(video),
    description: meta.description,
    intro: compactText(getVideoDescription(video)),
    sections: [
      {
        heading: 'Video summary',
        items: compactText(
          channelName ? `Channel: ${channelName}` : '',
          Array.isArray(video?.hashtags) && video.hashtags.length ? `Tags: ${video.hashtags.join(', ')}` : ''
        )
      }
    ],
    links: [
      handle ? { href: `/pixe/channel/${encodeURIComponent(handle)}`, label: `Visit ${channelName}` } : null,
      { href: '/pixe/explore', label: 'Explore Pixe' },
      { href: '/browse', label: 'Browse products' }
    ].filter(Boolean)
  });
};

const renderPixeChannelShell = (routePath, meta, channel) =>
  renderSeoShell({
    eyebrow: 'Pixe channel',
    title: getChannelName(channel),
    description: meta.description,
    intro: compactText(getChannelDescription(channel)),
    sections: [
      {
        heading: 'Channel overview',
        items: compactText(
          nonEmpty(channel?.handle) ? `Handle: @${String(channel.handle).replace(/^@+/, '')}` : '',
          Number.isFinite(Number(channel?.follower_count)) ? `Followers: ${Number(channel.follower_count)}` : '',
          Number.isFinite(Number(channel?.video_count)) ? `Videos: ${Number(channel.video_count)}` : ''
        )
      }
    ],
    links: [
      { href: '/pixe/creators', label: 'Pixe creators' },
      { href: '/pixe/explore', label: 'Explore Pixe' },
      { href: '/browse', label: 'Browse products' }
    ]
  });

const renderRoutePrerender = (entry) => {
  switch (entry.kind) {
    case 'item':
      return renderItemShell(entry.path, entry.meta, entry.data);
    case 'user':
      return renderUserShell(entry.path, entry.meta, entry.data);
    case 'service':
      return renderServiceShell(entry.path, entry.meta, entry.data);
    case 'pixe-video':
      return renderPixeVideoShell(entry.path, entry.meta, entry.data);
    case 'pixe-channel':
      return renderPixeChannelShell(entry.path, entry.meta, entry.data);
    case 'static':
    default:
      return renderStaticRouteShell(entry.path, entry.meta);
  }
};

const writeRouteHtml = async (templateHtml, routePath, meta, prerenderHtml) => {
  const normalizedPath = normalizePathname(routePath);
  const html = replaceRootContent(replaceSeoBlock(templateHtml, meta), prerenderHtml);
  const targetDir = normalizedPath === '/'
    ? distDir
    : path.join(distDir, normalizedPath.slice(1));

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf8');
};

const xmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const createSitemapEntry = (routePath, lastModified, priority = 0.7, changefreq = 'weekly') => {
  const normalizedPath = normalizePathname(routePath);
  const absoluteUrl = new URL(normalizedPath, SITE_URL).toString();
  const lastmod = new Date(lastModified || Date.now()).toISOString();
  return { loc: absoluteUrl, lastmod, priority, changefreq };
};

const fetchItems = async () => {
  const payload = await getJson('/api/items', { limit: 250 });
  return uniqueBy(
    (payload?.data || []).filter((item) => String(item?.status || item?.metadata?.status || '').toLowerCase() === 'published'),
    (item) => item?.id
  );
};

const fetchUsers = async () => {
  const payload = await getJson('/api/users', { limit: 250 });
  return uniqueBy(
    (payload?.data || []).filter((user) => String(user?.status || '').toLowerCase() === 'active'),
    (user) => user?.id
  );
};

const fetchServices = async () => {
  const payload = await getJson('/work/listings', { status: 'published', limit: 250 });
  return uniqueBy(payload?.data || [], (service) => service?.id);
};

const fetchPixeFeed = async () => {
  const videos = [];
  let cursor = null;
  let pages = 0;

  while (pages < 5) {
    const payload = await getJson('/pixe/feed', {
      mode: 'explore',
      limit: 25,
      ...(cursor ? { cursor } : {})
    });

    const pageItems = payload?.data || payload?.items || [];
    videos.push(...pageItems);

    const nextCursor = payload?.next_cursor || payload?.nextCursor || null;
    const hasMore = Boolean(payload?.has_more ?? payload?.hasMore);
    if (!nextCursor || !hasMore) break;

    cursor = nextCursor;
    pages += 1;
  }

  return uniqueBy(
    videos.filter((video) => String(video?.status || '').toLowerCase() === 'published'),
    (video) => video?.id
  );
};

const collectDynamicRoutes = async () => {
  const routes = [];
  const warnings = [];
  const now = new Date().toISOString();

  try {
    const items = await fetchItems();
    for (const item of items) {
      const routePath = `/item/${encodeURIComponent(String(item.id))}`;
      routes.push({
        path: routePath,
        meta: createItemSeoMeta(item, routePath),
        kind: 'item',
        data: item,
        sitemap: createSitemapEntry(routePath, item.updated_at || item.created_at || now, 0.8, 'daily')
      });
    }
  } catch (error) {
    warnings.push(`Items sitemap generation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const users = await fetchUsers();
    for (const user of users) {
      const routePath = `/user/${encodeURIComponent(String(user.id))}`;
      routes.push({
        path: routePath,
        meta: createPublicProfileSeoMeta({
          user,
          path: routePath
        }),
        kind: 'user',
        data: user,
        sitemap: createSitemapEntry(routePath, user.updated_at || user.created_at || now, 0.6, 'weekly')
      });
    }
  } catch (error) {
    warnings.push(`User sitemap generation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const services = await fetchServices();
    for (const service of services) {
      const routePath = `/service/${encodeURIComponent(String(service.id))}`;
      routes.push({
        path: routePath,
        meta: createServiceSeoMeta(service, routePath),
        kind: 'service',
        data: service,
        sitemap: createSitemapEntry(routePath, service.updatedAt || service.updated_at || service.createdAt || service.created_at || now, 0.7, 'weekly')
      });
    }
  } catch (error) {
    warnings.push(`Service sitemap generation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const videos = await fetchPixeFeed();
    const channels = uniqueBy(
      videos
        .map((video) => video?.channel)
        .filter((channel) => channel && channel.handle),
      (channel) => channel.handle
    );

    for (const video of videos) {
      const routePath = `/pixe/watch/${encodeURIComponent(String(video.id))}`;
      routes.push({
        path: routePath,
        meta: createPixeVideoSeoMeta(video, routePath),
        kind: 'pixe-video',
        data: video,
        sitemap: createSitemapEntry(routePath, video.updated_at || video.published_at || video.created_at || now, 0.7, 'daily')
      });
    }

    for (const channel of channels) {
      const routePath = `/pixe/channel/${encodeURIComponent(String(channel.handle))}`;
      routes.push({
        path: routePath,
        meta: createPixeChannelSeoMeta(channel, routePath),
        kind: 'pixe-channel',
        data: channel,
        sitemap: createSitemapEntry(routePath, now, 0.7, 'daily')
      });
    }
  } catch (error) {
    warnings.push(`Pixe sitemap generation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    routes: uniqueBy(routes, (entry) => entry.path),
    warnings
  };
};

const writeSitemap = async (entries) => {
  const uniqueEntries = uniqueBy(entries, (entry) => entry.loc).sort((left, right) => left.loc.localeCompare(right.loc));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniqueEntries.map((entry) => [
      '  <url>',
      `    <loc>${xmlEscape(entry.loc)}</loc>`,
      `    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`,
      `    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>`,
      `    <priority>${Number(entry.priority || 0.7).toFixed(1)}</priority>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
};

const main = async () => {
  const templateHtml = await fs.readFile(indexHtmlPath, 'utf8');
  const staticEntries = PUBLIC_STATIC_ROUTES.map((routePath) => ({
    path: routePath,
    meta: resolveStaticSeoMeta(routePath),
    kind: 'static',
    sitemap: createSitemapEntry(routePath, Date.now(), routePath === '/' ? 1 : routePath.startsWith('/pixe') ? 0.8 : 0.7, routePath === '/' ? 'daily' : 'weekly')
  }));
  const dynamicResult = await collectDynamicRoutes();
  const allEntries = uniqueBy([...staticEntries, ...dynamicResult.routes], (entry) => entry.path);

  for (const entry of allEntries) {
    await writeRouteHtml(templateHtml, entry.path, entry.meta, renderRoutePrerender(entry));
  }

  await writeSitemap(allEntries.map((entry) => entry.sitemap));

  console.log(`[seo] generated ${staticEntries.length} static routes and ${dynamicResult.routes.length} dynamic routes using ${apiOrigin}`);
  dynamicResult.warnings.forEach((warning) => console.warn(`[seo] ${warning}`));
};

await main();
