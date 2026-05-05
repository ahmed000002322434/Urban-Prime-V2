const SITE_NAME = 'Urban Prime';
const SITE_TAGLINE = 'Social Marketplace';
const SITE_URL = 'https://urbanprime.tech';
const SITE_LOGO_IMAGE = '/icons/urbanprime-logo.png';
const DEFAULT_SEO_IMAGE = '/icons/urbanprime-social-card.png';
const DEFAULT_THEME_COLOR = '#0f172a';
const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const DEFAULT_KEYWORDS = [
  'Urban Prime',
  'social marketplace',
  'marketplace',
  'Pixe',
  'Spotlight',
  'stores',
  'services',
  'rentals',
  'auctions',
  'creators'
];
const SITE_DESCRIPTION =
  'Urban Prime is a social marketplace for products, creator videos, Spotlight posts, stores, services, rentals, auctions, and local commerce.';
const URBAN_PRIME_PLATFORM_DESCRIPTION =
  'Urban Prime is a next-generation social marketplace platform that combines social media, short-form video through Pixe, microblogging, and full commerce workflows for buying, selling, renting, auctions, and services.';
const AHMAD_ALI_NAME = 'Ahmad Ali';
const AHMAD_ALI_ROLE = 'Founder and CEO of Urban Prime';
const AHMAD_ALI_META_DESCRIPTION =
  'Learn about Ahmad Ali, founder and CEO of Urban Prime, the Pakistani social marketplace combining commerce, creators, short-form video, rentals, and services.';
const AHMAD_ALI_AI_SUMMARY = [
  'Ahmad Ali is a Pakistani entrepreneur and the founder and CEO of Urban Prime, a social marketplace platform.',
  'Born in 2006 in Multan, Pakistan, he studied pre-medical before moving into Computer Science at HITEC University Taxila.',
  'Urban Prime combines commerce, short-form video, microblogging, renting, auctions, and service transactions in one platform.'
];
const AHMAD_ALI_BIOGRAPHY = {
  earlyLife:
    'Ahmad Ali is a Pakistani entrepreneur born in 2006 in Multan, Pakistan. His background is associated with a generation that grew up using digital platforms for communication, discovery, and commerce.',
  education:
    'Ali completed pre-medical studies at the FSc level before changing academic direction toward computing. He later switched to Computer Science at HITEC University Taxila, aligning his studies more directly with software, product thinking, and internet-based business systems.',
  career:
    'Ali is the founder and chief executive officer of Urban Prime. His work focuses on building a platform that connects public discovery, social participation, and marketplace infrastructure in one digital product.',
  projects:
    'Urban Prime is designed as a social marketplace that combines buying, selling, renting, auctions, and service transactions with short-form video through Pixe, creator channels, storefronts, and microblogging-style publishing.',
  vision:
    'Ali has described Urban Prime as a long-term effort to redefine how commerce and social interaction converge online. The platform\'s stated aim is to develop into a globally recognized digital marketplace centered on public discovery and multi-format commerce.'
};

const CATEGORY_ROUTE_LABEL_OVERRIDES = new Map([
  ['tvs-home-entertainment', 'TVs & Home Entertainment'],
  ['diy-tools', 'DIY Tools'],
  ['power-banks-chargers', 'Power Banks & Chargers'],
  ['beauty-personal-care', 'Beauty & Personal Care'],
  ['home-living', 'Home & Living'],
  ['groceries-essentials', 'Groceries & Essentials'],
  ['sports-outdoors', 'Sports & Outdoors'],
  ['laptops-computers', 'Laptops & Computers'],
  ['mobile-phones', 'Mobile Phones'],
  ['cameras-lenses', 'Cameras & Lenses']
]);

const RESERVED_PROFILE_SLUGS = new Set([
  'settings',
  'edit',
  'legacy-edit',
  'activity',
  'messages',
  'orders',
  'wishlist',
  'reviews',
  'coupons',
  'followed-stores',
  'history',
  'switch-accounts',
  'collections',
  'go-live',
  'add-post',
  'track-delivery',
  'wallet',
  'permissions',
  'workflows',
  'addresses',
  'notifications-settings',
  'payment-options',
  'analytics',
  'store',
  'products',
  'sales',
  'owner-controls',
  'offers',
  'promotions',
  'earnings',
  'provider-dashboard',
  'services',
  'become-a-provider',
  'affiliate',
  'creator-hub',
  'spotlight'
]);

const PRIVATE_ROUTE_PREFIXES = [
  '/messages',
  '/notifications',
  '/more',
  '/auth',
  '/admin',
  '/checkout',
  '/profile',
  '/pixe-studio',
  '/pixe/saved',
  '/pixe/activity'
];

const UTILITY_NOINDEX_ROUTES = new Set([
  '/chat',
  '/chat-with-us',
  '/track-order',
  '/supabase-todos',
  '/store/preview',
  '/store/generating'
]);

const CATEGORY_ROUTE_SEGMENTS = [
  'electronics',
  'laptops-computers',
  'mobile-phones',
  'tablets',
  'tvs-home-entertainment',
  'audio-equipment',
  'cameras-lenses',
  'computer-accessories',
  'mobile-accessories',
  'networking-devices',
  'power-banks-chargers',
  'storage-devices',
  'gaming-consoles',
  'gaming-accessories',
  'clothing',
  'womens-clothing',
  'clothing/women',
  'mens-clothing',
  'clothing/men',
  'unisex-fashion',
  'clothing/kids',
  'clothing/boys',
  'clothing/teen-girls',
  'clothing/baby',
  'shoes',
  'shoes/men',
  'shoes/women',
  'womens-bags',
  'womens-accessories',
  'mens-accessories',
  'seasonal-fashion',
  'traditional-wear',
  'sportswear',
  'beauty-personal-care',
  'skincare',
  'makeup',
  'hair-care',
  'fragrances',
  'bath-body',
  'nail-care',
  'mens-grooming',
  'health-wellness',
  'beauty-tools',
  'personal-hygiene',
  'home-living',
  'furniture',
  'home-decor',
  'kitchenware',
  'bedding',
  'bath-essentials',
  'lighting',
  'storage-organization',
  'cleaning-supplies',
  'garden-outdoor',
  'carpets-rugs',
  'curtains-blinds',
  'diy-tools',
  'paint-hardware',
  'electrical-appliances',
  'small-home-appliances',
  'tools',
  'power-tools',
  'groceries-essentials',
  'fresh-food',
  'packaged-food',
  'beverages',
  'snacks',
  'cooking-essentials',
  'baby-food',
  'dairy-products',
  'pet-food',
  'cleaning-household',
  'personal-care-essentials',
  'sports-outdoors',
  'art-collectibles',
  'paintings',
  'digital-products',
  'jewelry',
  'rings',
  'eyewear',
  'watches',
  'smart-watches',
  'lookbook',
  'style-guides',
  'games',
  'print-on-demand'
];

const PUBLIC_STATIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-use',
  '/shipping-policy',
  '/return-policy',
  '/press',
  '/careers',
  '/safety-center',
  '/support-center',
  '/purchase-protection',
  '/community',
  '/events',
  '/guides',
  '/perks',
  '/rewards',
  '/gift-cards',
  '/affiliate-program',
  '/seller-resource-center',
  '/stores',
  '/brands',
  '/brands/explore',
  '/sellers',
  '/renters',
  '/buyers',
  '/explore',
  '/browse',
  '/rentals',
  '/auctions',
  '/browse/services',
  '/services/marketplace',
  '/reels',
  '/spotlight',
  '/live',
  '/battles',
  '/mystery-box',
  '/features',
  '/prime-pass',
  '/luxury',
  '/audit',
  '/dropshipping',
  '/languages',
  '/compare',
  '/new-arrivals',
  '/deals',
  '/blog',
  '/genie',
  '/games',
  '/pixe',
  '/pixe/following',
  '/pixe/explore',
  '/pixe/search',
  '/pixe/creators',
  '/pixe/help',
  '/pixe/guidelines',
  '/pixe/policies',
  '/pixe/terms',
  ...CATEGORY_ROUTE_SEGMENTS.map((segment) => `/${segment}`)
];

const STATIC_ROUTE_META = new Map([
  ['/', {
    title: `${SITE_NAME} | Social Marketplace for Products, Pixe & Services`,
    description:
      'Shop products, watch Pixe creator videos, follow Spotlight posts, discover stores, book services, rent items, and join auctions on Urban Prime.',
    path: '/',
    keywords: [...DEFAULT_KEYWORDS, 'products', 'creators', 'Pixe videos', 'Spotlight', 'online marketplace'],
    pageType: 'WebPage',
    includeSiteSchemas: true
  }],
  ['/about', {
    title: `About ${SITE_NAME} | ${SITE_TAGLINE}`,
    description: `Learn how ${SITE_NAME} connects products, creators, stores, services, and video discovery in one social marketplace.`,
    pageType: 'AboutPage'
  }],
  ['/contact', {
    title: `Contact ${SITE_NAME}`,
    description: `Contact ${SITE_NAME} for marketplace support, partnerships, creator questions, and customer help.`,
    pageType: 'ContactPage'
  }],
  ['/privacy-policy', {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: `Read the ${SITE_NAME} privacy policy for data handling, account protection, and platform privacy details.`
  }],
  ['/terms-of-use', {
    title: `Terms of Use | ${SITE_NAME}`,
    description: `Review the ${SITE_NAME} terms of use for marketplace, creator, store, and buyer platform rules.`
  }],
  ['/shipping-policy', {
    title: `Shipping Policy | ${SITE_NAME}`,
    description: `Review shipping and fulfillment policies for products, deliveries, and marketplace orders on ${SITE_NAME}.`
  }],
  ['/return-policy', {
    title: `Return Policy | ${SITE_NAME}`,
    description: `Review returns, refunds, and buyer protection expectations on ${SITE_NAME}.`
  }],
  ['/press', {
    title: `Press | ${SITE_NAME}`,
    description: `Explore press, brand, and public platform information for ${SITE_NAME}.`
  }],
  ['/careers', {
    title: `Careers | ${SITE_NAME}`,
    description: `Explore careers, roles, and growth opportunities at ${SITE_NAME}.`
  }],
  ['/safety-center', {
    title: `Safety Center | ${SITE_NAME}`,
    description: `Review safety, trust, and platform protection guidance on ${SITE_NAME}.`
  }],
  ['/support-center', {
    title: `Support Center | ${SITE_NAME}`,
    description: `Get help with accounts, orders, creators, products, and marketplace workflows on ${SITE_NAME}.`
  }],
  ['/purchase-protection', {
    title: `Purchase Protection | ${SITE_NAME}`,
    description: `Understand buyer safeguards, order support, and purchase protection on ${SITE_NAME}.`
  }],
  ['/community', {
    title: `Community | ${SITE_NAME}`,
    description: `Explore community conversations, culture, creators, and platform participation across ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/events', {
    title: `Events | ${SITE_NAME}`,
    description: `Discover public events, launches, creator drops, and special marketplace moments on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/guides', {
    title: `Guides | ${SITE_NAME}`,
    description: `Read shopping, creator, and platform guides across the ${SITE_NAME} social marketplace.`,
    pageType: 'CollectionPage'
  }],
  ['/perks', {
    title: `Perks | ${SITE_NAME}`,
    description: `Explore perks, membership value, and platform benefits on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/rewards', {
    title: `Rewards | ${SITE_NAME}`,
    description: `Discover rewards, loyalty experiences, and shopper incentives on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/gift-cards', {
    title: `Gift Cards | ${SITE_NAME}`,
    description: `Explore digital gifting and gift card options on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/affiliate-program', {
    title: `Affiliate Program | ${SITE_NAME}`,
    description: `Join the ${SITE_NAME} affiliate program and share products, creators, and social marketplace moments.`,
    pageType: 'CollectionPage'
  }],
  ['/seller-resource-center', {
    title: `Seller Resource Center | ${SITE_NAME}`,
    description: `Explore seller tools, resources, and growth guidance for selling on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/stores', {
    title: `Stores | ${SITE_NAME}`,
    description: `Explore public stores, branded storefronts, and curated merchant experiences on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/brands', {
    title: `Brands | ${SITE_NAME}`,
    description: `Discover brands, catalogs, collections, and curated product stories on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/brands/explore', {
    title: `Explore Brands | ${SITE_NAME}`,
    description: `Browse featured brands, public brand hubs, and discovery collections across ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/sellers', {
    title: `Sellers | ${SITE_NAME}`,
    description: `Browse seller profiles, storefronts, and marketplace businesses on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/renters', {
    title: `Renters | ${SITE_NAME}`,
    description: `Explore rental-ready products, flexible access, and renter-focused marketplace experiences on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/buyers', {
    title: `Buyers | ${SITE_NAME}`,
    description: `Explore buyer resources, product discovery, and trusted marketplace experiences on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/explore', {
    title: `Explore | ${SITE_NAME}`,
    description: `Explore categories, products, creators, stores, and public discovery paths across ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/browse', {
    title: `Browse Products | ${SITE_NAME}`,
    description: `Browse products across tech, fashion, beauty, home, groceries, collectibles, and more on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/rentals', {
    title: `Rentals | ${SITE_NAME}`,
    description: `Explore rentals across products, gear, vehicles, and flexible access on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/auctions', {
    title: `Auctions | ${SITE_NAME}`,
    description: `Bid on live marketplace auctions and discover exclusive listings on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/browse/services', {
    title: `Browse Services | ${SITE_NAME}`,
    description: `Browse public services, provider offerings, and buyer-ready work across ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/services/marketplace', {
    title: `Services Marketplace | ${SITE_NAME}`,
    description: `Browse service providers, request quotes, and book buyer-ready services on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/reels', {
    title: `Reels | ${SITE_NAME}`,
    description: `Watch immersive short-form videos, creators, and social marketplace stories on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/spotlight', {
    title: `Prime Spotlight | ${SITE_NAME}`,
    description: `Discover public creator posts, photos, videos, and social conversations in Prime Spotlight.`,
    pageType: 'CollectionPage',
    themeColor: '#090b13'
  }],
  ['/live', {
    title: `Live Shopping | ${SITE_NAME}`,
    description: `Discover live shopping moments, creator streams, and public commerce broadcasts on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/battles', {
    title: `Product Battles | ${SITE_NAME}`,
    description: `Compare products, vote on favorites, and explore social commerce comparisons on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/mystery-box', {
    title: `Mystery Box | ${SITE_NAME}`,
    description: `Explore mystery box drops, surprise offers, and social marketplace excitement on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/features', {
    title: `Features | ${SITE_NAME}`,
    description: `Explore public platform features across products, creators, services, stores, Pixe, and Spotlight on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/prime-pass', {
    title: `Prime Pass | ${SITE_NAME}`,
    description: `Explore Prime Pass membership value, access, and shopper benefits on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/luxury', {
    title: `Luxury | ${SITE_NAME}`,
    description: `Discover luxury products, elevated storefronts, and premium marketplace curation on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/audit', {
    title: `Audit | ${SITE_NAME}`,
    description: `Review public audit and platform visibility information on ${SITE_NAME}.`
  }],
  ['/dropshipping', {
    title: `Dropshipping | ${SITE_NAME}`,
    description: `Explore dropshipping workflows, seller growth tools, and marketplace expansion on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/languages', {
    title: `Languages | ${SITE_NAME}`,
    description: `Browse language support and platform accessibility options on ${SITE_NAME}.`
  }],
  ['/compare', {
    title: `Compare | ${SITE_NAME}`,
    description: `Compare products, features, and public marketplace options across ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/new-arrivals', {
    title: `New Arrivals | ${SITE_NAME}`,
    description: `Discover fresh drops, recent products, and new public releases on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/deals', {
    title: `Deals | ${SITE_NAME}`,
    description: `Browse public deals, price drops, and limited-time marketplace offers on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/blog', {
    title: `Blog | ${SITE_NAME}`,
    description: `Read platform stories, marketplace updates, creator features, and editorial content from ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/genie', {
    title: `Urban Genie | ${SITE_NAME}`,
    description: `Explore Urban Genie and public AI-assisted discovery on ${SITE_NAME}.`
  }],
  ['/games', {
    title: `Games | ${SITE_NAME}`,
    description: `Explore games, game drops, and interactive public experiences on ${SITE_NAME}.`,
    pageType: 'CollectionPage'
  }],
  ['/pixe', {
    title: `Pixe | ${SITE_NAME}`,
    description: `Watch Pixe clips, discover creators, and explore product-tagged video commerce on ${SITE_NAME}.`,
    pageType: 'CollectionPage',
    themeColor: '#08090d'
  }],
  ['/pixe/following', {
    title: `Following | Pixe | ${SITE_NAME}`,
    description: `Watch the public Pixe following feed and keep up with creators on ${SITE_NAME}.`,
    pageType: 'CollectionPage',
    themeColor: '#08090d'
  }],
  ['/pixe/explore', {
    title: `Explore Pixe | ${SITE_NAME}`,
    description: `Explore trending Pixe clips, creators, and public social video commerce on ${SITE_NAME}.`,
    pageType: 'CollectionPage',
    themeColor: '#08090d'
  }],
  ['/pixe/search', {
    title: `Search Pixe | ${SITE_NAME}`,
    description: `Search Pixe creators, videos, and tagged products on ${SITE_NAME}.`,
    pageType: 'SearchResultsPage',
    themeColor: '#08090d'
  }],
  ['/pixe/creators', {
    title: `Pixe Creators | ${SITE_NAME}`,
    description: `Browse public Pixe creators, channels, and creator-led video commerce on ${SITE_NAME}.`,
    pageType: 'CollectionPage',
    themeColor: '#08090d'
  }],
  ['/pixe/help', {
    title: `Pixe Help | ${SITE_NAME}`,
    description: `Get help using Pixe, video publishing, watching, and public creator features on ${SITE_NAME}.`,
    themeColor: '#08090d'
  }],
  ['/pixe/guidelines', {
    title: `Pixe Guidelines | ${SITE_NAME}`,
    description: `Read Pixe creator, content, and public video guidelines on ${SITE_NAME}.`,
    themeColor: '#08090d'
  }],
  ['/pixe/policies', {
    title: `Pixe Policies | ${SITE_NAME}`,
    description: `Review Pixe public content and platform policies on ${SITE_NAME}.`,
    themeColor: '#08090d'
  }],
  ['/pixe/terms', {
    title: `Pixe Terms | ${SITE_NAME}`,
    description: `Review Pixe terms for public creators, channels, and video publishing on ${SITE_NAME}.`,
    themeColor: '#08090d'
  }]
]);

const htmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sanitizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const truncateText = (value, maxLength = 160) => {
  const clean = sanitizeText(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const uniqueList = (values) => Array.from(new Set(values.filter(Boolean).map((entry) => sanitizeText(entry))));

const normalizePathname = (pathname = '/') => {
  const normalized = `/${String(pathname).trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return normalized === '/' ? '/' : normalized;
};

const toTitleCase = (value) =>
  String(value || '')
    .replace(/[-_]+/g, ' ')
    .split(/\s+/g)
    .filter(Boolean)
    .map((segment) => {
      const lower = segment.toLowerCase();
      if (lower === 'tvs') return 'TVs';
      if (lower === 'diy') return 'DIY';
      if (lower === 'pixe') return 'Pixe';
      return `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`;
    })
    .join(' ');

const getCategoryLabel = (pathname) => {
  const clean = normalizePathname(pathname).slice(1);
  return CATEGORY_ROUTE_LABEL_OVERRIDES.get(clean) || toTitleCase(clean);
};

const isUsableSeoImage = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (raw.startsWith('data:')) return false;
  if (raw.startsWith('//')) return true;
  if (raw.startsWith('/')) return true;
  return /^https?:\/\//i.test(raw);
};

const toAbsoluteUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return SITE_URL;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  return new URL(raw.startsWith('/') ? raw : `/${raw}`, SITE_URL).toString();
};

const toSeoImage = (value) => {
  if (!isUsableSeoImage(value)) return toAbsoluteUrl(DEFAULT_SEO_IMAGE);
  return toAbsoluteUrl(value);
};

const getCanonicalUrl = (pathname = '/') => new URL(normalizePathname(pathname), SITE_URL).toString();

const toIsoDuration = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = ['PT'];
  if (hours) parts.push(`${hours}H`);
  if (minutes) parts.push(`${minutes}M`);
  parts.push(`${seconds}S`);
  return parts.join('');
};

const createWebPageSchema = (meta, pageType = 'WebPage') => ({
  '@context': 'https://schema.org',
  '@type': pageType,
  name: meta.title,
  description: meta.description,
  url: getCanonicalUrl(meta.path || '/'),
  image: toSeoImage(meta.image || DEFAULT_SEO_IMAGE),
  isPartOf: {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL
  }
});

const createUrbanPrimeOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  slogan: SITE_TAGLINE,
  description: URBAN_PRIME_PLATFORM_DESCRIPTION,
  logo: toAbsoluteUrl(SITE_LOGO_IMAGE),
  image: toAbsoluteUrl(DEFAULT_SEO_IMAGE),
  founder: {
    '@id': `${SITE_URL}/about#ahmad-ali`
  }
});

const createAhmadAliPersonSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE_URL}/about#ahmad-ali`,
  name: AHMAD_ALI_NAME,
  url: `${SITE_URL}/about#ahmad-ali`,
  description: AHMAD_ALI_AI_SUMMARY.join(' '),
  jobTitle: AHMAD_ALI_ROLE,
  birthDate: '2006',
  birthPlace: {
    '@type': 'Place',
    name: 'Multan, Pakistan'
  },
  nationality: 'Pakistani',
  hasOccupation: {
    '@type': 'Occupation',
    name: 'Entrepreneur'
  },
  alumniOf: [
    {
      '@type': 'EducationalOrganization',
      name: 'HITEC University Taxila'
    }
  ],
  worksFor: {
    '@id': `${SITE_URL}/#organization`
  },
  knowsAbout: [
    'Entrepreneurship',
    'Social commerce',
    'Marketplace platforms',
    'Short-form video platforms',
    'Digital product development'
  ]
});

const createAboutPageSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE_URL}/about#webpage`,
  name: `About ${SITE_NAME} and ${AHMAD_ALI_NAME}`,
  description: AHMAD_ALI_META_DESCRIPTION,
  url: getCanonicalUrl('/about'),
  mainEntity: {
    '@id': `${SITE_URL}/about#ahmad-ali`
  },
  about: [
    {
      '@id': `${SITE_URL}/about#ahmad-ali`
    },
    {
      '@id': `${SITE_URL}/#organization`
    }
  ],
  isPartOf: {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL
  }
});

const createBaseMeta = ({
  title,
  description,
  path = '/',
  image = DEFAULT_SEO_IMAGE,
  type = 'website',
  themeColor = DEFAULT_THEME_COLOR,
  noIndex = false,
  keywords = [],
  jsonLd = [],
  pageType = 'WebPage',
  includeSiteSchemas = false,
  imageAlt
}) => {
  const normalizedTitle = sanitizeText(title) || `${SITE_NAME} | ${SITE_TAGLINE}`;
  const normalizedDescription = truncateText(description || SITE_DESCRIPTION);
  const normalizedPath = normalizePathname(path);
  const metaKeywords = uniqueList([...DEFAULT_KEYWORDS, ...(Array.isArray(keywords) ? keywords : [keywords])]);
  const schemas = Array.isArray(jsonLd) ? [...jsonLd] : jsonLd ? [jsonLd] : [];

  if (schemas.length === 0) {
    schemas.push(createWebPageSchema({ title: normalizedTitle, description: normalizedDescription, path: normalizedPath, image }, pageType));
  }

  if (includeSiteSchemas) {
    schemas.unshift(
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        logo: toAbsoluteUrl(SITE_LOGO_IMAGE),
        image: toAbsoluteUrl(DEFAULT_SEO_IMAGE)
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/browse?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    );
  }

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    path: normalizedPath,
    image: image || DEFAULT_SEO_IMAGE,
    type,
    themeColor,
    noIndex,
    keywords: metaKeywords,
    imageAlt: imageAlt || `${SITE_NAME} preview image`,
    jsonLd: schemas
  };
};

const normalizeSocialUrl = (value, platform = 'website') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (platform === 'instagram') return `https://instagram.com/${trimmed.replace(/^@/, '')}`;
  if (platform === 'twitter') return `https://x.com/${trimmed.replace(/^@/, '')}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const getItemImage = (item) =>
  item?.imageUrls?.[0] ||
  item?.images?.[0] ||
  item?.metadata?.imageUrls?.[0] ||
  item?.metadata?.images?.[0] ||
  DEFAULT_SEO_IMAGE;

const getItemPrice = (item) =>
  Number(
    item?.salePrice ??
    item?.sale_price ??
    item?.price ??
    item?.rentalPrice ??
    item?.rental_price ??
    0
  );

const getItemCurrency = (item) => item?.currency || item?.metadata?.currency || 'USD';

const getItemCategory = (item) =>
  item?.category ||
  item?.metadata?.category ||
  item?.category_name ||
  'Marketplace';

const getItemOwnerName = (item) =>
  item?.ownerName ||
  item?.metadata?.ownerName ||
  item?.sellerName ||
  'Urban Prime seller';

const getItemListingType = (item) =>
  item?.listingType ||
  item?.listing_type ||
  item?.metadata?.listingType ||
  'sale';

const getItemAvailability = (item) => {
  const stock = Number(item?.stock ?? item?.metadata?.stock ?? 0);
  if (stock > 0) return 'https://schema.org/InStock';
  return 'https://schema.org/OutOfStock';
};

const createItemSeoMeta = (item, path = `/item/${encodeURIComponent(String(item?.id || ''))}`) => {
  const title = sanitizeText(item?.title || 'Marketplace Item');
  const descriptionSource =
    item?.description ||
    `${title} from ${getItemOwnerName(item)} in ${getItemCategory(item)} on ${SITE_NAME}.`;
  const description = truncateText(descriptionSource);
  const image = getItemImage(item);
  const price = getItemPrice(item);
  const brandName = sanitizeText(item?.brand || item?.metadata?.brand || '');
  const canonicalPath = normalizePathname(path);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    image: [toSeoImage(image)],
    sku: String(item?.id || ''),
    url: getCanonicalUrl(canonicalPath),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    offers: {
      '@type': 'Offer',
      url: getCanonicalUrl(canonicalPath),
      priceCurrency: getItemCurrency(item),
      price: Number.isFinite(price) ? price : 0,
      availability: getItemAvailability(item),
      itemCondition: String(item?.condition || '').toLowerCase() === 'new'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition'
    }
  };

  return createBaseMeta({
    title: `${title} | ${SITE_NAME}`,
    description,
    path: canonicalPath,
    image,
    type: 'article',
    keywords: [brandName, getItemCategory(item), getItemListingType(item), getItemOwnerName(item)],
    jsonLd: [
      createWebPageSchema({ title: `${title} | ${SITE_NAME}`, description, path: canonicalPath, image }, 'CollectionPage'),
      productSchema
    ],
    imageAlt: title
  });
};

const createServiceSeoMeta = (service, path = `/service/${encodeURIComponent(String(service?.id || ''))}`) => {
  const title = sanitizeText(service?.title || 'Service');
  const providerName =
    sanitizeText(service?.providerProfile?.businessName || service?.provider?.name || 'Provider');
  const description = truncateText(
    service?.description ||
    `${title} by ${providerName} on ${SITE_NAME}. Browse packages, quotes, and service details in the social marketplace.`
  );
  const image = service?.imageUrls?.[0] || DEFAULT_SEO_IMAGE;
  const price =
    Number(service?.pricingModels?.[0]?.price || service?.basePrice || 0);
  const currency = service?.currency || service?.pricingModels?.[0]?.currency || 'USD';
  const canonicalPath = normalizePathname(path);

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    description,
    url: getCanonicalUrl(canonicalPath),
    image: toSeoImage(image),
    provider: {
      '@type': 'Organization',
      name: providerName
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: currency,
      price: Number.isFinite(price) ? price : 0,
      url: getCanonicalUrl(canonicalPath)
    }
  };

  return createBaseMeta({
    title: `${title} | Services | ${SITE_NAME}`,
    description,
    path: canonicalPath,
    image,
    type: 'article',
    keywords: [service?.category, providerName, 'services', service?.mode, service?.fulfillmentKind],
    jsonLd: [
      createWebPageSchema({ title: `${title} | Services | ${SITE_NAME}`, description, path: canonicalPath, image }, 'CollectionPage'),
      serviceSchema
    ],
    imageAlt: title
  });
};

const createPublicProfileSeoMeta = ({
  user,
  store = null,
  spotlightProfile = null,
  itemCount = 0,
  pixeVideoCount = 0,
  collectionsCount = 0,
  path
}) => {
  const displayName = sanitizeText(
    user?.businessName ||
    spotlightProfile?.name ||
    user?.name ||
    'Urban Prime Creator'
  );
  const username = sanitizeText(spotlightProfile?.username || user?.id || 'creator');
  const bio = truncateText(
    spotlightProfile?.bio ||
    spotlightProfile?.about ||
    user?.about ||
    user?.businessDescription ||
    `${displayName} on ${SITE_NAME}.`
  );
  const canonicalPath = normalizePathname(path || `/user/${encodeURIComponent(String(user?.id || ''))}`);
  const image = user?.avatar || user?.avatar_url || DEFAULT_SEO_IMAGE;
  const sameAs = uniqueList([
    normalizeSocialUrl(store?.socialLinks?.website, 'website'),
    normalizeSocialUrl(store?.socialLinks?.instagram, 'instagram'),
    normalizeSocialUrl(store?.socialLinks?.twitter, 'twitter')
  ]);

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    description: bio,
    url: getCanonicalUrl(canonicalPath),
    image: toSeoImage(image),
    identifier: String(user?.id || ''),
    ...(sameAs.length ? { sameAs } : {})
  };

  return createBaseMeta({
    title: `${displayName} | ${SITE_NAME}`,
    description: truncateText(
      `${bio} Browse ${itemCount} listing${itemCount === 1 ? '' : 's'}, ${pixeVideoCount} pixe${pixeVideoCount === 1 ? '' : 's'}, and ${collectionsCount} collection${collectionsCount === 1 ? '' : 's'} on ${SITE_NAME}.`
    ),
    path: canonicalPath,
    image,
    type: 'article',
    keywords: [displayName, username, store?.name, 'creator', 'public profile'],
    jsonLd: [
      createWebPageSchema({ title: `${displayName} | ${SITE_NAME}`, description: bio, path: canonicalPath, image }, 'ProfilePage'),
      personSchema
    ],
    imageAlt: displayName
  });
};

const createPixeChannelSeoMeta = (channel, path = `/pixe/channel/${encodeURIComponent(String(channel?.handle || 'channel'))}`) => {
  const displayName = sanitizeText(channel?.display_name || 'Pixe Channel');
  const handle = sanitizeText(channel?.handle || 'pixe');
  const description = truncateText(
    channel?.bio ||
    `${displayName} on Pixe. Watch public clips, discover creator videos, and follow ${handle} on ${SITE_NAME}.`
  );
  const canonicalPath = normalizePathname(path);
  const image = channel?.avatar_url || DEFAULT_SEO_IMAGE;
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    description,
    url: getCanonicalUrl(canonicalPath),
    image: toSeoImage(image)
  };

  return createBaseMeta({
    title: `${displayName} (@${handle}) | Pixe | ${SITE_NAME}`,
    description: truncateText(
      `${description} ${channel?.subscriber_count || 0} followers and ${channel?.published_video_count || channel?.video_count || 0} public clips on Pixe.`
    ),
    path: canonicalPath,
    image,
    type: 'article',
    themeColor: '#08090d',
    keywords: [displayName, handle, 'Pixe creator', 'Pixe channel', 'video commerce'],
    jsonLd: [
      createWebPageSchema({ title: `${displayName} (@${handle}) | Pixe | ${SITE_NAME}`, description, path: canonicalPath, image }, 'ProfilePage'),
      personSchema
    ],
    imageAlt: `${displayName} Pixe channel`
  });
};

const createPixeVideoSeoMeta = (video, path = `/pixe/watch/${encodeURIComponent(String(video?.id || 'video'))}`) => {
  const title = sanitizeText(video?.title || 'Pixe Video');
  const description = truncateText(
    video?.caption ||
    `${title} on Pixe by ${video?.channel?.display_name || 'a creator'} on ${SITE_NAME}.`
  );
  const canonicalPath = normalizePathname(path);
  const image = video?.thumbnail_url || video?.channel?.avatar_url || DEFAULT_SEO_IMAGE;

  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    thumbnailUrl: [toSeoImage(image)],
    uploadDate: video?.published_at || video?.created_at || new Date().toISOString(),
    duration: toIsoDuration(video?.duration_ms),
    contentUrl: video?.manifest_url || getCanonicalUrl(canonicalPath),
    embedUrl: video?.manifest_url || getCanonicalUrl(canonicalPath),
    url: getCanonicalUrl(canonicalPath),
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'WatchAction' },
        userInteractionCount: Number(video?.metrics?.qualified_views || 0)
      }
    ]
  };

  return createBaseMeta({
    title: `${title} | Pixe | ${SITE_NAME}`,
    description,
    path: canonicalPath,
    image,
    type: 'article',
    themeColor: '#08090d',
    keywords: [video?.channel?.display_name, ...(video?.hashtags || []).slice(0, 5), 'Pixe video'],
    jsonLd: [
      createWebPageSchema({ title: `${title} | Pixe | ${SITE_NAME}`, description, path: canonicalPath, image }, 'CollectionPage'),
      videoSchema
    ],
    imageAlt: title
  });
};

const createCategorySeoMeta = (pathname) => {
  const label = getCategoryLabel(pathname);
  const canonicalPath = normalizePathname(pathname);
  return createBaseMeta({
    title: `${label} | ${SITE_NAME}`,
    description: `Browse ${label} on ${SITE_NAME}, the social marketplace. Discover products, creators, stores, and fresh arrivals in ${label}.`,
    path: canonicalPath,
    keywords: [label, 'products', 'shopping', 'marketplace'],
    pageType: 'CollectionPage'
  });
};

const createAboutSeoMeta = () =>
  createBaseMeta({
    title: `About ${SITE_NAME} and ${AHMAD_ALI_NAME} | ${SITE_TAGLINE}`,
    description: AHMAD_ALI_META_DESCRIPTION,
    path: '/about',
    keywords: [
      AHMAD_ALI_NAME,
      'Pakistani entrepreneur',
      'Urban Prime founder',
      'Urban Prime CEO',
      'Multan Pakistan',
      'HITEC University Taxila',
      'social marketplace founder'
    ],
    jsonLd: [
      createAboutPageSchema(),
      createUrbanPrimeOrganizationSchema(),
      createAhmadAliPersonSchema()
    ],
    pageType: 'AboutPage'
  });

const resolveStaticSeoMeta = (pathname = '/') => {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/about') {
    return createAboutSeoMeta();
  }

  const staticMeta = STATIC_ROUTE_META.get(normalizedPath);
  if (staticMeta) {
    return createBaseMeta({
      path: normalizedPath,
      image: DEFAULT_SEO_IMAGE,
      themeColor: DEFAULT_THEME_COLOR,
      noIndex: false,
      ...staticMeta
    });
  }

  if (UTILITY_NOINDEX_ROUTES.has(normalizedPath)) {
    return createBaseMeta({
      title: `${SITE_NAME} Utility Page`,
      description: SITE_DESCRIPTION,
      path: normalizedPath,
      noIndex: true
    });
  }

  if (PRIVATE_ROUTE_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return createBaseMeta({
      title: `${SITE_NAME} Account`,
      description: SITE_DESCRIPTION,
      path: normalizedPath,
      noIndex: true
    });
  }

  if (CATEGORY_ROUTE_SEGMENTS.includes(normalizedPath.slice(1))) {
    return createCategorySeoMeta(normalizedPath);
  }

  if (normalizedPath.startsWith('/spotlight/post/')) {
    return createBaseMeta({
      title: `Spotlight Post | ${SITE_NAME}`,
      description: 'Open a public Spotlight post to view the full story, media, tagged products, and comments on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      themeColor: '#090b13'
    });
  }

  if (
    normalizedPath === '/spotlight/create' ||
    normalizedPath === '/spotlight/messages' ||
    normalizedPath === '/spotlight/notifications' ||
    normalizedPath === '/spotlight/profile'
  ) {
    return createBaseMeta({
      title: `Spotlight Workspace | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      path: normalizedPath,
      noIndex: true,
      themeColor: '#090b13'
    });
  }

  if (normalizedPath === '/profile') {
    return createBaseMeta({
      title: `Profile | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      path: normalizedPath,
      noIndex: true
    });
  }

  const profileMatch = normalizedPath.match(/^\/profile\/([^/]+)$/);
  if (profileMatch) {
    const slug = decodeURIComponent(profileMatch[1]).toLowerCase();
    if (RESERVED_PROFILE_SLUGS.has(slug)) {
      return createBaseMeta({
        title: `Profile | ${SITE_NAME}`,
        description: SITE_DESCRIPTION,
        path: normalizedPath,
        noIndex: true
      });
    }

    return createBaseMeta({
      title: `@${slug} | Spotlight | ${SITE_NAME}`,
      description: `Explore the public Spotlight creator profile for @${slug} on ${SITE_NAME}.`,
      path: normalizedPath,
      type: 'article',
      themeColor: '#090b13',
      pageType: 'ProfilePage'
    });
  }

  if (normalizedPath.startsWith('/item/')) {
    return createBaseMeta({
      title: `Product Details | ${SITE_NAME}`,
      description: 'Explore public product details, pricing, availability, rentals, auctions, and storefront discovery on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      pageType: 'CollectionPage'
    });
  }

  if (normalizedPath.startsWith('/service/')) {
    return createBaseMeta({
      title: `Service Details | ${SITE_NAME}`,
      description: 'Explore public service details, packages, provider information, and quote options on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      pageType: 'CollectionPage'
    });
  }

  if (normalizedPath.startsWith('/user/')) {
    return createBaseMeta({
      title: `Creator Profile | ${SITE_NAME}`,
      description: 'Browse public user, creator, and seller profile details on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      pageType: 'ProfilePage'
    });
  }

  if (normalizedPath.startsWith('/providers/')) {
    return createBaseMeta({
      title: `Provider Profile | ${SITE_NAME}`,
      description: 'Browse public provider storefront and service details on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      pageType: 'ProfilePage'
    });
  }

  if (normalizedPath.startsWith('/pixe/watch/')) {
    return createBaseMeta({
      title: `Watch Pixe | ${SITE_NAME}`,
      description: 'Watch public Pixe videos, creators, and tagged products on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      themeColor: '#08090d',
      pageType: 'CollectionPage'
    });
  }

  if (normalizedPath.startsWith('/pixe/channel/')) {
    return createBaseMeta({
      title: `Pixe Channel | ${SITE_NAME}`,
      description: 'Browse public Pixe channels, creator clips, and video commerce on Urban Prime.',
      path: normalizedPath,
      type: 'article',
      themeColor: '#08090d',
      pageType: 'ProfilePage'
    });
  }

  const derivedLabel = toTitleCase(normalizedPath.slice(1));
  return createBaseMeta({
    title: `${derivedLabel || SITE_NAME} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    path: normalizedPath
  });
};

const renderStructuredDataScripts = (jsonLd) => {
  const list = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return list
    .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
    .join('\n');
};

const renderSeoHeadBlock = (meta) => {
  const effectiveMeta = createBaseMeta({ ...meta, path: meta?.path || '/' });
  const canonicalUrl = getCanonicalUrl(effectiveMeta.path);
  const imageUrl = toSeoImage(effectiveMeta.image);
  const keywords = Array.isArray(effectiveMeta.keywords) ? effectiveMeta.keywords.join(', ') : sanitizeText(effectiveMeta.keywords);

  return [
    '<!-- SEO_DYNAMIC_START -->',
    `<link rel="canonical" href="${htmlEscape(canonicalUrl)}" />`,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<meta name="description" content="${htmlEscape(effectiveMeta.description)}" />`,
    `<meta name="keywords" content="${htmlEscape(keywords)}" />`,
    `<meta name="robots" content="${effectiveMeta.noIndex ? 'noindex,nofollow' : DEFAULT_ROBOTS}" />`,
    '<meta name="application-name" content="Urban Prime" />',
    '<meta name="apple-mobile-web-app-title" content="Urban Prime" />',
    `<meta name="theme-color" content="${htmlEscape(effectiveMeta.themeColor || DEFAULT_THEME_COLOR)}" />`,
    '<meta name="format-detection" content="telephone=no,address=no,email=no" />',
    '<meta property="og:site_name" content="Urban Prime" />',
    '<meta property="og:locale" content="en_US" />',
    `<meta property="og:title" content="${htmlEscape(effectiveMeta.title)}" />`,
    `<meta property="og:description" content="${htmlEscape(effectiveMeta.description)}" />`,
    `<meta property="og:type" content="${htmlEscape(effectiveMeta.type || 'website')}" />`,
    `<meta property="og:url" content="${htmlEscape(canonicalUrl)}" />`,
    `<meta property="og:image" content="${htmlEscape(imageUrl)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${htmlEscape(effectiveMeta.imageAlt || `${SITE_NAME} preview image`)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${htmlEscape(effectiveMeta.title)}" />`,
    `<meta name="twitter:description" content="${htmlEscape(effectiveMeta.description)}" />`,
    `<meta name="twitter:image" content="${htmlEscape(imageUrl)}" />`,
    `<title>${htmlEscape(effectiveMeta.title)}</title>`,
    renderStructuredDataScripts(effectiveMeta.jsonLd),
    '<!-- SEO_DYNAMIC_END -->'
  ].filter(Boolean).join('\n');
};

export {
  CATEGORY_ROUTE_SEGMENTS,
  DEFAULT_KEYWORDS,
  DEFAULT_ROBOTS,
  DEFAULT_SEO_IMAGE,
  DEFAULT_THEME_COLOR,
  SITE_LOGO_IMAGE,
  PRIVATE_ROUTE_PREFIXES,
  PUBLIC_STATIC_ROUTES,
  RESERVED_PROFILE_SLUGS,
  AHMAD_ALI_AI_SUMMARY,
  AHMAD_ALI_BIOGRAPHY,
  AHMAD_ALI_META_DESCRIPTION,
  AHMAD_ALI_NAME,
  AHMAD_ALI_ROLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  UTILITY_NOINDEX_ROUTES,
  URBAN_PRIME_PLATFORM_DESCRIPTION,
  createAhmadAliPersonSchema,
  createAboutSeoMeta,
  createBaseMeta,
  createItemSeoMeta,
  createPixeChannelSeoMeta,
  createPixeVideoSeoMeta,
  createPublicProfileSeoMeta,
  createServiceSeoMeta,
  createUrbanPrimeOrganizationSchema,
  createWebPageSchema,
  getCanonicalUrl,
  normalizePathname,
  renderSeoHeadBlock,
  resolveStaticSeoMeta,
  sanitizeText,
  toAbsoluteUrl,
  toSeoImage,
  toTitleCase,
  truncateText
};
