import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fs from 'fs';
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import createAnalyticsEngine from './analyticsEngine.js';
import registerSpotlightRoutes from './spotlightEngine.js';
import registerPixeRoutes from './pixeRoutes.js';
import registerCommerceRoutes from './commerceRoutes.js';
import registerDigitalMarketplaceRoutes from './digitalMarketplaceRoutes.js';
import registerPodMarketplaceRoutes from './podMarketplaceRoutes.js';
import { createStripeWebhookHandler } from './webhooks/stripeWebhook.js';
import { createPaypalWebhookHandler } from './webhooks/paypalWebhook.js';
import { createMuxWebhookHandler } from './webhooks/muxWebhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = Array.from(
  new Set(
    [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../.env.local'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../.env.local'),
      process.env.DOTENV_PATH
    ]
      .filter(Boolean)
      .map((candidate) => path.resolve(candidate))
  )
);

const loadedEnvPaths = [];
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    loadedEnvPaths.push(candidate);
  }
}

if (loadedEnvPaths.length === 0) {
  dotenv.config();
  console.warn('No .env file found. Looked in:', envCandidates.join(', '));
} else {
  console.log('Loaded env from', loadedEnvPaths.join(', '));
}

const toBool = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '').toLowerCase();

const parseCommaList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseTrustProxy = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return 1;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  return value;
};

const secureCompare = (leftValue, rightValue) => {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const {
  PORT: ENV_PORT = '5050',
  HOST: ENV_HOST = '0.0.0.0',
  CORS_ORIGIN = '',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BACKEND_API_KEY,
  FIREBASE_ADMIN_CREDENTIALS,
  FIREBASE_ADMIN_CREDENTIALS_FILE,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  PROFILE_ONBOARDING_V2,
  UPLOADS_DIR,
  NODE_ENV = 'development',
  TRUST_PROXY,
  ENFORCE_AUTH_IN_PROD,
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX,
  CORS_ALLOW_ALL,
  CORS_ALLOW_SAME_HOST,
  APP_PUBLIC_URL,
  PUSH_NOTIFICATIONS_ENABLED,
  WEB_PUSH_NOTIFICATION_ICON,
  WEB_PUSH_NOTIFICATION_BADGE,
  CHAT_RELIABILITY_V2,
  BRAND_HUB_V3,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_FOLDER,
  CLOUDINARY_DELIVERY_BASE_URL,
  PASSWORD_RESET_PIN_TTL_MS,
  PASSWORD_RESET_EXPOSE_PIN,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SERVICE,
  SUPPORT_EMAIL,
  EMAIL_NOTIFICATIONS_ENABLED,
  EMAIL_AI_ENABLED,
  EMAIL_AI_MODEL,
  EMAIL_OVERRIDE_TO,
  EMAIL_UNREAD_MESSAGE_DEDUPE_MS,
  EMAIL_EVENT_DEDUPE_MS,
  EMAIL_REENGAGEMENT_AFTER_HOURS,
  GEMINI_API_KEY,
  GOOGLE_AI_API_KEY,
  WHATSAPP_ENABLED,
  WHATSAPP_GRAPH_VERSION,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET,
  WHATSAPP_DEFAULT_LOCALE,
  WHATSAPP_DRY_RUN,
  WHATSAPP_TEMPLATE_AUTH_CODE,
  WHATSAPP_TEMPLATE_LOGIN_ALERT,
  WHATSAPP_TEMPLATE_OFFER_UPDATE,
  WHATSAPP_TEMPLATE_DISCOUNT_ALERT,
  WHATSAPP_TEMPLATE_SELLER_UPDATE,
  WHATSAPP_TEMPLATE_FEED_ALERT,
  WHATSAPP_TEMPLATE_VERIFICATION_UPDATE,
  WHATSAPP_TEMPLATE_RENTAL_REMINDER,
  PHONE_AUTH_PIN_TTL_MS,
  PHONE_AUTH_EXPOSE_PIN
} = process.env;

const parsePort = (value, fallback = 5050) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const START_PORT = parsePort(ENV_PORT, 5050);
const START_HOST = String(ENV_HOST || '0.0.0.0').trim() || '0.0.0.0';
const PORT_RETRY_LIMIT = parsePort(process.env.PORT_RETRY_LIMIT ?? '20', 20);
const IS_PRODUCTION = NODE_ENV === 'production';
const MUX_VIDEO_CONFIGURED = Boolean(String(process.env.MUX_TOKEN_ID || '').trim() && String(process.env.MUX_TOKEN_SECRET || '').trim());
const MUX_WEBHOOK_CONFIGURED = Boolean(String(process.env.MUX_WEBHOOK_SECRET || '').trim());
const AUTH_ENFORCED_IN_PRODUCTION = toBool(ENFORCE_AUTH_IN_PROD, true);
const RATE_LIMITING_ENABLED = toBool(RATE_LIMIT_ENABLED, true);
const GLOBAL_RATE_LIMIT_WINDOW_MS = parsePort(RATE_LIMIT_WINDOW_MS ?? '60000', 60000);
const GLOBAL_RATE_LIMIT_MAX = parsePort(RATE_LIMIT_MAX ?? '240', 240);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parsePort(AUTH_RATE_LIMIT_MAX ?? '60', 60);
const ALLOW_ALL_CORS_ORIGINS = toBool(CORS_ALLOW_ALL, !IS_PRODUCTION);
const ALLOW_SAME_HOST_CORS = toBool(CORS_ALLOW_SAME_HOST, true);
const TRUST_PROXY_VALUE = parseTrustProxy(TRUST_PROXY, IS_PRODUCTION ? 1 : false);
const ALLOWED_CORS_ORIGINS = parseCommaList(CORS_ORIGIN).map((origin) => normalizeOrigin(origin));
const PUSH_NOTIFICATIONS_ACTIVE = toBool(PUSH_NOTIFICATIONS_ENABLED, true);
const APP_PUBLIC_URL_NORMALIZED = String(APP_PUBLIC_URL || '').trim().replace(/\/$/, '');
const PUSH_NOTIFICATION_ICON = String(WEB_PUSH_NOTIFICATION_ICON || '/icons/favicon-192.png');
const PUSH_NOTIFICATION_BADGE = String(WEB_PUSH_NOTIFICATION_BADGE || '/icons/favicon-64.png');
const CLOUDINARY_CLOUD = String(CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_PRESET = String(CLOUDINARY_UPLOAD_PRESET || '').trim();
const CLOUDINARY_FOLDER_PREFIX = String(CLOUDINARY_FOLDER || 'urbanprime').trim().replace(/^\/+|\/+$/g, '');
const CLOUDINARY_PUBLIC_BASE = String(CLOUDINARY_DELIVERY_BASE_URL || '').trim().replace(/\/$/, '');
const CLOUDINARY_ENABLED = Boolean(CLOUDINARY_CLOUD && CLOUDINARY_PRESET);
const PASSWORD_RESET_COLLECTION = 'auth_password_reset_pins';
const PASSWORD_RESET_TTL_MS = parsePort(PASSWORD_RESET_PIN_TTL_MS ?? '600000', 600000);
const PASSWORD_RESET_DEBUG_PIN_ENABLED = toBool(PASSWORD_RESET_EXPOSE_PIN, false);
const PHONE_AUTH_PIN_COLLECTION = 'auth_phone_pins';
const PHONE_AUTH_ACCOUNT_COLLECTION = 'auth_phone_accounts';
const PHONE_AUTH_TTL_MS = parsePort(PHONE_AUTH_PIN_TTL_MS ?? '600000', 600000);
const PHONE_AUTH_DEBUG_PIN_ENABLED = toBool(PHONE_AUTH_EXPOSE_PIN, false);
const PHONE_PASSWORD_ITERATIONS = 120000;
const WHATSAPP_ACTIVE = toBool(WHATSAPP_ENABLED, false);
const WHATSAPP_DRY_RUN_ACTIVE = toBool(WHATSAPP_DRY_RUN, false);
const WHATSAPP_GRAPH_API_VERSION = String(WHATSAPP_GRAPH_VERSION || 'v24.0').trim().replace(/^\/+|\/+$/g, '') || 'v24.0';
const WHATSAPP_LOCALE = String(WHATSAPP_DEFAULT_LOCALE || 'en_US').trim() || 'en_US';
const WHATSAPP_TEMPLATES = {
  authCode: String(WHATSAPP_TEMPLATE_AUTH_CODE || 'urbanprime_auth_code').trim(),
  loginAlert: String(WHATSAPP_TEMPLATE_LOGIN_ALERT || 'urbanprime_login_alert').trim(),
  offerUpdate: String(WHATSAPP_TEMPLATE_OFFER_UPDATE || 'urbanprime_offer_update').trim(),
  discountAlert: String(WHATSAPP_TEMPLATE_DISCOUNT_ALERT || 'urbanprime_discount_alert').trim(),
  sellerUpdate: String(WHATSAPP_TEMPLATE_SELLER_UPDATE || 'urbanprime_seller_update').trim(),
  feedAlert: String(WHATSAPP_TEMPLATE_FEED_ALERT || 'urbanprime_feed_alert').trim(),
  verificationUpdate: String(WHATSAPP_TEMPLATE_VERIFICATION_UPDATE || 'urbanprime_verification_update').trim(),
  rentalReminder: String(WHATSAPP_TEMPLATE_RENTAL_REMINDER || 'urbanprime_rental_reminder').trim()
};
const SMTP_PORT_NUMBER = parsePort(SMTP_PORT ?? '587', 587);
const SMTP_SECURE_ENABLED = toBool(SMTP_SECURE, SMTP_PORT_NUMBER === 465);
const EMAIL_NOTIFICATIONS_ACTIVE = toBool(EMAIL_NOTIFICATIONS_ENABLED, true);
const EMAIL_AI_ACTIVE = toBool(EMAIL_AI_ENABLED, false);
const EMAIL_OVERRIDE_RECIPIENT = String(EMAIL_OVERRIDE_TO || '').trim().toLowerCase();
const EMAIL_AI_KEY = String(GEMINI_API_KEY || GOOGLE_AI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
const EMAIL_AI_MODEL_NAME = String(EMAIL_AI_MODEL || 'gemini-1.5-flash').trim();
const EMAIL_UNREAD_MESSAGE_DEDUPE_WINDOW_MS = parsePort(EMAIL_UNREAD_MESSAGE_DEDUPE_MS ?? '1800000', 1800000);
const EMAIL_EVENT_DEDUPE_WINDOW_MS = parsePort(EMAIL_EVENT_DEDUPE_MS ?? '21600000', 21600000);
const EMAIL_REENGAGEMENT_AFTER_MS = parsePort(String(Number(EMAIL_REENGAGEMENT_AFTER_HOURS || 48) * 60 * 60 * 1000), 172800000);

const PROFILE_ONBOARDING_V2_ENABLED = toBool(PROFILE_ONBOARDING_V2, true);
const CHAT_RELIABILITY_V2_ENABLED = toBool(CHAT_RELIABILITY_V2, true);
const BRAND_HUB_V3_ENABLED = toBool(BRAND_HUB_V3, true);
const FEATURE_FLAGS = {
  profileOnboardingV2: PROFILE_ONBOARDING_V2_ENABLED,
  chatReliabilityV2: CHAT_RELIABILITY_V2_ENABLED,
  brandHubV3: BRAND_HUB_V3_ENABLED
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let firebaseApp = null;
try {
  if (FIREBASE_ADMIN_CREDENTIALS) {
    const creds = JSON.parse(FIREBASE_ADMIN_CREDENTIALS);
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else if (FIREBASE_ADMIN_CREDENTIALS_FILE && fs.existsSync(FIREBASE_ADMIN_CREDENTIALS_FILE)) {
    const raw = fs.readFileSync(FIREBASE_ADMIN_CREDENTIALS_FILE, 'utf8');
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  } else if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  }
} catch (error) {
  console.warn('Firebase admin init failed:', error);
}

if (IS_PRODUCTION && AUTH_ENFORCED_IN_PRODUCTION && !BACKEND_API_KEY && !firebaseApp) {
  console.error(
    'Refusing to start in production without auth. Configure FIREBASE admin credentials or BACKEND_API_KEY.'
  );
  process.exit(1);
}

if (MUX_VIDEO_CONFIGURED && !MUX_WEBHOOK_CONFIGURED) {
  console.warn(
    'Mux video upload is configured without MUX_WEBHOOK_SECRET. Signed webhook processing will fail until this variable is set in every deploy target.'
  );
}

const ALLOWED_TABLES = new Set([
  'users', 'user_profiles', 'stores', 'store_settings', 'categories',
  'items', 'item_images', 'item_variants', 'item_collections', 'item_collection_items',
  'carts', 'cart_items', 'shipping_addresses', 'orders', 'order_items',
  'payments', 'refunds', 'shipping_methods', 'shipments', 'pod_jobs',
  'rental_bookings', 'rental_blocks', 'auction_bids', 'auction_sessions', 'commerce_disputes',
  'reviews', 'wishlists', 'wishlist_items', 'user_follows', 'store_follows',
  'chat_threads', 'chat_messages', 'custom_offers', 'notifications',
  'message_consents', 'message_outbox', 'message_deliveries', 'message_preferences',
  'payout_methods', 'payouts', 'suppliers', 'supplier_products', 'supplier_orders',
  'stores_v2', 'store_layouts', 'store_analytics', 'affiliate_programs',
  'affiliate_profiles', 'affiliate_users', 'affiliate_links', 'affiliate_coupons', 'affiliate_clicks',
  'affiliate_commissions', 'affiliate_submissions', 'affiliate_attributions', 'affiliate_conversions', 'affiliate_payouts',
  'admin_users', 'site_settings', 'moderation_flags', 'audit_logs', 'mirror_documents',
  'personas', 'persona_members', 'persona_wallet_ledgers', 'persona_notifications', 'persona_capability_requests',
  'uploaded_assets', 'user_onboarding_state',
  'brands', 'brand_aliases', 'brand_catalog_nodes', 'brand_catalog_aliases',
  'brand_match_queue', 'brand_catalog_match_queue', 'brand_claim_requests',
  'brand_followers', 'brand_catalog_followers',
  'brand_price_snapshots', 'brand_catalog_price_snapshots',
  'brand_trust_signals', 'brand_catalog_trust_signals',
  'work_listings', 'work_requests', 'work_proposals', 'work_contracts', 'work_milestones',
  'work_provider_applications',
  'work_engagements', 'work_escrow_ledger', 'work_disputes', 'work_reputation', 'work_autopilot_runs',
  'spotlight_content', 'spotlight_metrics', 'spotlight_views', 'spotlight_likes',
  'spotlight_dislikes', 'spotlight_reposts', 'spotlight_comments', 'spotlight_comment_likes',
  'spotlight_reports', 'saved_items', 'user_blocks', 'user_restrictions',
  'spotlight_feed_impressions', 'spotlight_product_links', 'spotlight_product_events',
  'spotlight_commission_ledger', 'spotlight_product_performance_v',
  'spotlight_creator_conversion_v', 'spotlight_tag_conversion_v',
  'webhook_events'
]);

const uploadsRoot = path.resolve(UPLOADS_DIR || path.resolve(__dirname, '../uploads'), NODE_ENV === 'production' ? 'prod' : 'dev');
fs.mkdirSync(uploadsRoot, { recursive: true });

const app = express();
app.set('trust proxy', TRUST_PROXY_VALUE);
app.disable('x-powered-by');

const getRequestOrigin = (req) => {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host');
  if (!host) return '';
  const protoHeader = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const protocol = protoHeader || req.protocol || 'http';
  return normalizeOrigin(`${protocol}://${host}`);
};

const resolveCorsOptions = (req, callback) => {
  const originHeader = req.header('Origin') || req.header('origin');
  if (!originHeader) {
    callback(null, { origin: true, credentials: true });
    return;
  }

  if (ALLOW_ALL_CORS_ORIGINS) {
    callback(null, { origin: true, credentials: true });
    return;
  }

  const normalizedOrigin = normalizeOrigin(originHeader);
  const matchesConfiguredOrigin = ALLOWED_CORS_ORIGINS.includes(normalizedOrigin);
  const matchesSameHostOrigin = ALLOW_SAME_HOST_CORS && normalizedOrigin === getRequestOrigin(req);

  callback(null, { origin: matchesConfiguredOrigin || matchesSameHostOrigin, credentials: true });
};

app.use(cors(resolveCorsOptions));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (IS_PRODUCTION && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), createStripeWebhookHandler(supabase));
app.post('/webhooks/mux', express.raw({ type: 'application/json' }), createMuxWebhookHandler(supabase));

app.use(express.json({
  limit: '25mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/webhooks/paypal', createPaypalWebhookHandler(supabase));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsRoot));

const PUBLIC_SITEMAP_PATHS = [
  '/',
  '/spotlight',
  '/reels',
  '/pixe',
  '/community',
  '/browse',
  '/browse-services',
  '/services',
  '/stores',
  '/brands',
  '/live-shopping',
  '/deals',
  '/new-arrivals',
  '/compare',
  '/about',
  '/contact',
  '/support-center',
  '/purchase-protection',
  '/trust-and-safety',
  '/privacy-policy',
  '/terms-of-use',
  '/shipping-policy',
  '/return-policy',
  '/press',
  '/careers',
  '/events',
  '/guides',
  '/perks',
  '/rewards',
  '/gift-cards',
  '/affiliate',
  '/seller-resource-center',
  '/blogs',
  '/lookbook',
  '/style-guides',
  '/games',
  '/print-on-demand'
];

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const resolvePublicBaseUrl = (req) => APP_PUBLIC_URL_NORMALIZED || getRequestOrigin(req);

const buildAbsoluteUrl = (req, pathname) => {
  const baseUrl = resolvePublicBaseUrl(req);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const normalizeHttpOrigin = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
  } catch {
    return '';
  }
};

const isTrustedEmailActionOrigin = (origin, req) => {
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) return true;
    if (['urbanprime.tech', 'www.urbanprime.tech', 'urbanprim.vercel.app', 'urbanprimebeta.vercel.app'].includes(hostname)) return true;

    const configuredOrigin = normalizeHttpOrigin(APP_PUBLIC_URL_NORMALIZED);
    if (configuredOrigin && origin === configuredOrigin) return true;

    const requestOrigin = normalizeHttpOrigin(getRequestOrigin(req));
    if (requestOrigin && origin === requestOrigin) return true;
  } catch {
    return false;
  }
  return false;
};

const resolveEmailActionBaseUrl = (req) => {
  const requestedOrigin = normalizeHttpOrigin(req.body?.appUrl);
  if (isTrustedEmailActionOrigin(requestedOrigin, req)) return requestedOrigin;
  return resolvePublicBaseUrl(req);
};

const buildEmailActionUrl = (req, pathname) => {
  const baseUrl = resolveEmailActionBaseUrl(req);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const buildSitemapXml = (req) => {
  const entries = PUBLIC_SITEMAP_PATHS.map((pathname) => {
    const priority = pathname === '/' ? '1.0' : pathname.startsWith('/spotlight') ? '0.9' : '0.7';
    const changefreq = pathname === '/' || pathname.startsWith('/spotlight') ? 'daily' : 'weekly';
    return [
      '  <url>',
      `    <loc>${escapeXml(buildAbsoluteUrl(req, pathname))}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>'
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>'
  ].join('\n');
};

const buildRobotsTxt = (req) => [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin/',
  'Disallow: /auth/',
  'Disallow: /api/',
  'Disallow: /checkout/',
  'Disallow: /profile/settings',
  'Disallow: /profile/edit',
  'Disallow: /profile/legacy-edit',
  `Sitemap: ${buildAbsoluteUrl(req, '/sitemap.xml')}`
].join('\n');

const buildLlmGuide = (req) => [
  '# Urban Prime',
  '',
  'Urban Prime is a premium marketplace, creator hub, and social discovery platform.',
  '',
  `Base URL: ${buildAbsoluteUrl(req, '/')}`,
  '',
  '## Public surfaces',
  '- `/` Home and marketplace discovery',
  '- `/spotlight` Prime Spotlight social feed',
  '- `/spotlight/post/:id` Spotlight post detail',
  '- `/reels` Immersive video viewer',
  '- `/pixe` Creator studio and media workflows',
  '- `/community` Community surface',
  '- `/browse` Product browsing',
  '- `/browse-services` Service browsing',
  '- `/stores` Store directory',
  '- `/brands` Brand discovery',
  '',
  '## Spotlight surfaces',
  '- `/profile/:username` Public creator profile',
  '- `/spotlight/create` Create a Spotlight post',
  '',
  '## Notes',
  '- Public pages are indexable.',
  '- Auth pages, admin pages, and account management pages are intentionally noindexed.'
].join('\n');

app.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').send(buildRobotsTxt(req));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml; charset=utf-8').send(buildSitemapXml(req));
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').send(buildLlmGuide(req));
});

if (!BACKEND_API_KEY && !firebaseApp && !IS_PRODUCTION) {
  console.warn('Backend auth disabled for local development. Configure BACKEND_API_KEY or Firebase admin credentials.');
}

if (IS_PRODUCTION && !ALLOW_ALL_CORS_ORIGINS && ALLOWED_CORS_ORIGINS.length === 0) {
  console.warn('CORS_ORIGIN is empty in production. Only same-host browser requests will be allowed.');
}

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav'
};

const normalizeMimeTypeValue = (value) => String(value || '').trim().toLowerCase().split(';')[0];

const sanitizeBaseName = (fileName = 'asset') =>
  String(fileName)
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset';

const ensureDirectory = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const resolveUserIdFromFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
};

const userCanAccessPersona = async (personaId, firebaseUid) => {
  if (!personaId) return false;
  if (!firebaseUid) return true;

  const currentUserId = await resolveUserIdFromFirebaseUid(firebaseUid);
  if (!currentUserId) return false;

  const { data: persona, error: personaError } = await supabase
    .from('personas')
    .select('id,user_id')
    .eq('id', personaId)
    .maybeSingle();

  if (personaError || !persona) return false;
  if (persona.user_id === currentUserId) return true;

  const { data: member, error: memberError } = await supabase
    .from('persona_members')
    .select('id')
    .eq('persona_id', personaId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (memberError) return false;
  return Boolean(member);
};

const ONBOARDING_FLOW_VERSION = 1;
const ONBOARDING_INTENTS = new Set(['buy', 'rent', 'sell', 'provide', 'affiliate']);
const ROLE_INTENTS = new Set(['sell', 'provide', 'affiliate']);
const ONBOARDING_EVENTS = new Set([
  'resumed',
  'step_viewed',
  'step_saved',
  'step_error',
  'completed',
  'completion_failed'
]);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeHandle = (value) => {
  if (!hasText(value)) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40) || null;
};

const normalizePublicUsername = (value) => {
  if (!hasText(value)) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32) || null;
};

const normalizeBrandText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugifyPathSegment = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'node';
};

const tokenizeBrandText = (value) => {
  const normalized = normalizeBrandText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
};

const scoreBrandSimilarity = (left, right) => {
  const leftNorm = normalizeBrandText(left);
  const rightNorm = normalizeBrandText(right);
  if (!leftNorm || !rightNorm) return 0;
  if (leftNorm === rightNorm) return 1;

  const leftTokens = tokenizeBrandText(leftNorm);
  const rightTokens = tokenizeBrandText(rightNorm);
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const intersection = leftTokens.filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size || 1;
  const jaccard = intersection / union;

  let prefixBonus = 0;
  if (leftNorm.startsWith(rightNorm) || rightNorm.startsWith(leftNorm)) prefixBonus = 0.15;
  const lengthPenalty = Math.min(Math.abs(leftNorm.length - rightNorm.length) / 40, 0.25);
  return Math.max(0, Math.min(1, jaccard + prefixBonus - lengthPenalty));
};

const parsePageLimit = (value, fallback = 24, max = 80) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const parsePageOffset = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const parseCommaSeparatedValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const toNullableText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toIsoTimestamp = (value) => {
  const dateValue = new Date(value || Date.now());
  if (Number.isNaN(dateValue.getTime())) return new Date().toISOString();
  return dateValue.toISOString();
};

const normalizeJsonObject = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const normalizeJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry)).filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const normalizeCurrencyCode = (value, fallback = 'USD') => {
  const text = String(value || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(text)) return text;
  return fallback;
};

const normalizeWorkMode = (value, fallback = 'hybrid') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['instant', 'proposal', 'hybrid'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeFulfillmentKind = (value, fallback = 'hybrid') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['local', 'remote', 'onsite', 'hybrid'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkListingStatus = (value, fallback = 'draft') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'pending_review', 'published', 'rejected', 'archived', 'paused'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
const normalizePin = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

const passwordResetSecret = () =>
  String(BACKEND_API_KEY || FIREBASE_PRIVATE_KEY || SUPABASE_SERVICE_ROLE_KEY || 'urban-prime-password-reset-dev-secret');

const hashPasswordResetValue = (value) =>
  createHash('sha256').update(String(value)).digest('hex');

const hashPasswordResetPin = ({ email, uid, pin, salt }) =>
  hashPasswordResetValue(`${passwordResetSecret()}:${email}:${uid}:${pin}:${salt}`);

const passwordResetDocId = (email) => hashPasswordResetValue(`password-reset:${normalizeEmail(email)}`);
const phonePinDocId = ({ phone, purpose }) => hashPasswordResetValue(`phone-pin:${purpose}:${normalizePhone(phone)}`);
const phoneAccountDocId = (phone) => hashPasswordResetValue(`phone-account:${normalizePhone(phone)}`);

const safeEqualHash = (leftValue, rightValue) => {
  const left = Buffer.from(String(leftValue || ''), 'hex');
  const right = Buffer.from(String(rightValue || ''), 'hex');
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const hashPhonePin = ({ phone, purpose, pin, salt }) =>
  hashPasswordResetValue(`${passwordResetSecret()}:phone-pin:${purpose}:${normalizePhone(phone)}:${pin}:${salt}`);

const createPasswordHash = ({ phone, password, salt = randomBytes(16).toString('hex') }) => ({
  salt,
  iterations: PHONE_PASSWORD_ITERATIONS,
  hash: pbkdf2Sync(
    `${passwordResetSecret()}:phone-password:${normalizePhone(phone)}:${password}`,
    salt,
    PHONE_PASSWORD_ITERATIONS,
    32,
    'sha256'
  ).toString('hex')
});

const verifyPasswordHash = ({ phone, password, account }) => {
  const data = normalizeJsonObject(account);
  const salt = String(data.password_salt || '');
  const expectedHash = String(data.password_hash || '');
  const iterations = Number(data.password_iterations || PHONE_PASSWORD_ITERATIONS);
  if (!salt || !expectedHash || !Number.isFinite(iterations) || iterations < 1) return false;
  const actualHash = pbkdf2Sync(
    `${passwordResetSecret()}:phone-password:${normalizePhone(phone)}:${password}`,
    salt,
    iterations,
    32,
    'sha256'
  ).toString('hex');
  return safeEqualHash(actualHash, expectedHash);
};

const isPasswordResetEmailConfigured = () =>
  Boolean((SMTP_SERVICE || SMTP_HOST) && SMTP_USER && SMTP_PASS && (SMTP_FROM || SMTP_USER));

let passwordResetMailer = null;
const getPasswordResetMailer = () => {
  if (!isPasswordResetEmailConfigured()) return null;
  if (passwordResetMailer) return passwordResetMailer;

  const transportOptions = SMTP_SERVICE
    ? {
        service: SMTP_SERVICE,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      }
    : {
        host: SMTP_HOST,
        port: SMTP_PORT_NUMBER,
        secure: SMTP_SECURE_ENABLED,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      };

  passwordResetMailer = nodemailer.createTransport(transportOptions);
  return passwordResetMailer;
};

const escapeEmailHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const resolveSupportEmail = () => String(SUPPORT_EMAIL || SMTP_USER || 'support@urbanprime.com').trim();
const resolveMailFromAddress = () => {
  const fallbackAddress = String(SMTP_USER || '').trim();
  const configuredFrom = String(SMTP_FROM || '').trim();
  if (!configuredFrom) {
    return fallbackAddress ? `"Urban Prime" <${fallbackAddress}>` : 'Urban Prime';
  }
  if (configuredFrom.includes('<') && configuredFrom.includes('>')) {
    return configuredFrom;
  }
  if (configuredFrom.includes('@')) {
    return `"Urban Prime" <${configuredFrom}>`;
  }
  return fallbackAddress ? `"Urban Prime" <${fallbackAddress}>` : '"Urban Prime"';
};

const buildEmailButton = ({ href, label, variant = 'primary' }) => {
  const safeHref = escapeEmailHtml(href);
  const safeLabel = escapeEmailHtml(label);
  const styles = {
    primary: 'background:linear-gradient(135deg,#0f766e,#14b8a6);color:#ffffff;border:1px solid #0f766e;box-shadow:0 12px 24px rgba(20,184,166,.28);',
    secondary: 'background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;box-shadow:0 7px 18px rgba(15,23,42,.08);',
    ghost: 'background:transparent;color:#0f766e;border:1px solid transparent;'
  };
  const style = styles[variant] || styles.primary;
  return `<a href="${safeHref}" style="display:inline-block;${style}border-radius:14px;padding:14px 22px;font-size:14px;line-height:18px;font-weight:800;text-decoration:none;letter-spacing:.01em">${safeLabel}</a>`;
};

const buildUrbanPrimeEmail = ({
  preheader,
  eyebrow,
  title,
  intro,
  code,
  details = [],
  primaryAction,
  secondaryActions = [],
  trustLabel = 'Protected by Urban Prime Security',
  statusLabel = 'Security verified',
  warning,
  footer
}) => {
  const safePreheader = escapeEmailHtml(preheader);
  const detailRows = details
    .filter((entry) => entry?.label && entry?.value)
    .map((entry) => `
      <tr>
        <td style="padding:16px 18px;color:#64748b;font-size:12px;line-height:18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid #e5e7eb">${escapeEmailHtml(entry.label)}</td>
        <td style="padding:16px 18px;color:#0f172a;font-size:14px;line-height:20px;font-weight:800;text-align:right;border-bottom:1px solid #e5e7eb">${escapeEmailHtml(entry.value)}</td>
      </tr>
    `)
    .join('');
  const actionButtons = [
    primaryAction ? buildEmailButton(primaryAction) : '',
    ...secondaryActions.map((action, index) => buildEmailButton({
      ...action,
      variant: action.variant || (index === 0 ? 'secondary' : 'ghost')
    }))
  ].filter(Boolean).join('<span style="display:inline-block;width:10px"></span>');

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;background:#edf7f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${safePreheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at 50% 0%,#d8fffb 0,#edf7f6 34%,#f8fafc 78%);padding:44px 14px">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid rgba(15,118,110,.14);border-radius:28px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.13),0 2px 0 rgba(255,255,255,.7) inset">',
    '<tr><td style="background:linear-gradient(135deg,#f8fffd 0%,#eefcf8 38%,#ecfeff 100%);padding:28px 32px 26px;color:#0f172a;border-bottom:1px solid #dbeafe">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>',
    '<td style="vertical-align:middle"><div style="display:inline-block;background:#0f766e;color:#ffffff;border-radius:16px;padding:11px 13px;font-size:15px;line-height:15px;font-weight:900;letter-spacing:.03em;box-shadow:0 10px 26px rgba(15,118,110,.24)">UP</div></td>',
    `<td align="right" style="vertical-align:middle"><span style="display:inline-block;background:#ffffff;border:1px solid #ccfbf1;color:#0f766e;border-radius:999px;padding:8px 12px;font-size:12px;line-height:14px;font-weight:800">${escapeEmailHtml(statusLabel)}</span></td>`,
    '</tr></table>',
    '<div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#0f766e;font-weight:900;margin-top:22px">Urban Prime</div>',
    `<h1 style="margin:10px 0 0;font-size:31px;line-height:1.18;color:#0f172a;font-weight:900;letter-spacing:0">${escapeEmailHtml(title)}</h1>`,
    '</td></tr>',
    '<tr><td style="padding:34px 32px 32px">',
    `<div style="display:inline-block;background:#f0fdfa;border:1px solid #ccfbf1;color:#0f766e;border-radius:999px;padding:8px 12px;font-size:12px;line-height:14px;font-weight:900;margin-bottom:18px">${escapeEmailHtml(trustLabel)}</div>`,
    eyebrow ? `<div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#0f766e;font-weight:900;margin-bottom:12px">${escapeEmailHtml(eyebrow)}</div>` : '',
    `<p style="font-size:16px;line-height:1.75;color:#475569;margin:0 0 26px;font-weight:400">${escapeEmailHtml(intro)}</p>`,
    code ? `<div style="border:1px solid #99f6e4;background:linear-gradient(180deg,#f0fdfa,#ffffff);border-radius:22px;padding:26px;text-align:center;margin:26px 0;box-shadow:0 16px 36px rgba(15,118,110,.1)">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#0f766e;font-weight:900">Secure PIN</div>
      <div style="font-size:38px;line-height:44px;letter-spacing:.34em;font-weight:900;color:#0f172a;margin-top:10px">${escapeEmailHtml(code)}</div>
    </div>` : '',
    detailRows ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;margin:28px 0;box-shadow:0 10px 30px rgba(15,23,42,.04)"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows}</table></div>` : '',
    warning ? `<div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:18px;padding:16px 18px;font-size:14px;line-height:1.7;font-weight:600;margin:24px 0">${escapeEmailHtml(warning)}</div>` : '',
    actionButtons ? `<div style="margin:30px 0 10px">${actionButtons}</div>` : '',
    footer ? `<p style="font-size:13px;line-height:1.7;color:#64748b;margin:26px 0 0;font-weight:400">${escapeEmailHtml(footer)}</p>` : '',
    '</td></tr>',
    '</table>',
    `<p style="max-width:620px;margin:20px auto 0;font-size:12px;line-height:1.7;color:#64748b;text-align:center">This security email was sent by Urban Prime. Support: <a href="mailto:${escapeEmailHtml(resolveSupportEmail())}" style="color:#0f766e;font-weight:700;text-decoration:none">${escapeEmailHtml(resolveSupportEmail())}</a></p>`,
    '</td></tr></table>',
    '</body></html>'
  ].join('');
};

const sendUrbanPrimeEmail = async ({ to, subject, text, html }) => {
  const mailer = getPasswordResetMailer();
  if (!mailer) {
    throw new Error('Reset PIN email delivery is not configured.');
  }

  const from = resolveMailFromAddress();
  const originalTo = normalizeEmail(to);
  const overrideTo = isEmailAddress(EMAIL_OVERRIDE_RECIPIENT) ? EMAIL_OVERRIDE_RECIPIENT : '';
  await mailer.sendMail({
    from,
    to: overrideTo || to,
    subject,
    text,
    html,
    headers: overrideTo && originalTo
      ? { 'X-UrbanPrime-Original-To': originalTo }
      : undefined
  });
};

const buildUrbanPrimeMomentEmail = ({
  preheader,
  badge = 'Urban Prime',
  title,
  intro,
  highlight,
  stats = [],
  previewItems = [],
  primaryAction,
  secondaryActions = [],
  footer = 'You are receiving this because this activity belongs to your Urban Prime account.'
}) => {
  const statCards = stats
    .filter((entry) => entry?.label && entry?.value !== undefined && entry?.value !== null)
    .slice(0, 4)
    .map((entry) => `
      <td style="width:50%;padding:7px">
        <div style="background:rgba(255,255,255,.78);border:1px solid rgba(15,118,110,.13);border-radius:18px;padding:16px 16px 15px;box-shadow:0 12px 28px rgba(15,23,42,.06)">
          <div style="font-size:11px;line-height:15px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:850">${escapeEmailHtml(entry.label)}</div>
          <div style="font-size:22px;line-height:28px;color:#0f172a;font-weight:950;margin-top:5px">${escapeEmailHtml(entry.value)}</div>
        </div>
      </td>
    `);
  const statRows = [];
  for (let index = 0; index < statCards.length; index += 2) {
    statRows.push(`<tr>${statCards[index]}${statCards[index + 1] || '<td style="width:50%;padding:7px"></td>'}</tr>`);
  }

  const previews = previewItems
    .filter((entry) => entry?.title || entry?.body)
    .slice(0, 5)
    .map((entry) => `
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:15px 16px;margin-top:10px;box-shadow:0 8px 20px rgba(15,23,42,.035)">
        ${entry.title ? `<div style="font-size:14px;line-height:20px;color:#0f172a;font-weight:850">${escapeEmailHtml(entry.title)}</div>` : ''}
        ${entry.body ? `<div style="font-size:13px;line-height:20px;color:#64748b;font-weight:450;margin-top:4px">${escapeEmailHtml(entry.body)}</div>` : ''}
      </div>
    `)
    .join('');

  const actionButtons = [
    primaryAction ? buildEmailButton(primaryAction) : '',
    ...secondaryActions.map((action, index) => buildEmailButton({
      ...action,
      variant: action.variant || (index === 0 ? 'secondary' : 'ghost')
    }))
  ].filter(Boolean).join('<span style="display:inline-block;width:10px"></span>');

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;background:#f3f7f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(preheader || intro || title)}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at 50% -8%,rgba(20,184,166,.24),rgba(255,255,255,0) 35%),linear-gradient(135deg,#f8fafc 0%,#effaf6 44%,#fdfefe 100%);padding:46px 14px">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:separate;border-spacing:0">',
    '<tr><td style="padding:0 8px 14px">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>',
    '<td><div style="display:inline-block;background:#0f172a;color:#ffffff;border-radius:18px;padding:11px 14px;font-size:15px;line-height:16px;font-weight:950;letter-spacing:.04em;box-shadow:0 16px 34px rgba(15,23,42,.18)">UP</div></td>',
    '<td align="right"><div style="display:inline-block;background:#ffffff;border:1px solid rgba(15,118,110,.18);color:#0f766e;border-radius:999px;padding:9px 13px;font-size:12px;line-height:14px;font-weight:850">Protected by Urban Prime</div></td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td style="background:rgba(255,255,255,.92);border:1px solid rgba(15,23,42,.08);border-radius:30px;overflow:hidden;box-shadow:0 30px 80px rgba(15,23,42,.12),0 1px 0 rgba(255,255,255,.9) inset">',
    '<div style="background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 48%,#f0fdf4 100%);border-bottom:1px solid #dbeafe;padding:32px 34px 30px">',
    `<div style="display:inline-block;background:#ffffff;border:1px solid #99f6e4;border-radius:999px;padding:8px 12px;font-size:12px;line-height:14px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;font-weight:950">${escapeEmailHtml(badge)}</div>`,
    `<h1 style="margin:15px 0 0;font-size:33px;line-height:1.14;color:#0f172a;font-weight:950;letter-spacing:0">${escapeEmailHtml(title)}</h1>`,
    '</div>',
    '<div style="padding:34px">',
    `<p style="margin:0;color:#475569;font-size:16px;line-height:1.78;font-weight:430">${escapeEmailHtml(intro)}</p>`,
    highlight ? `<div style="margin:26px 0 0;background:linear-gradient(135deg,#0f172a,#164e63);border-radius:24px;padding:24px;color:#ffffff;box-shadow:0 18px 40px rgba(15,23,42,.18)">
      <div style="font-size:12px;line-height:16px;letter-spacing:.14em;text-transform:uppercase;color:#99f6e4;font-weight:900">Next best move</div>
      <div style="font-size:19px;line-height:1.55;font-weight:850;margin-top:8px">${escapeEmailHtml(highlight)}</div>
    </div>` : '',
    statRows.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:25px -7px 0">${statRows.join('')}</table>` : '',
    previews ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:24px;padding:16px;margin:28px 0 0">${previews}</div>` : '',
    actionButtons ? `<div style="margin:30px 0 4px">${actionButtons}</div>` : '',
    footer ? `<p style="font-size:12px;line-height:1.75;color:#64748b;margin:26px 0 0;font-weight:420">${escapeEmailHtml(footer)}</p>` : '',
    '</div>',
    '</td></tr>',
    `<tr><td align="center" style="padding:20px 16px 0;color:#64748b;font-size:12px;line-height:1.7">Urban Prime notifications. Support: <a href="mailto:${escapeEmailHtml(resolveSupportEmail())}" style="color:#0f766e;font-weight:800;text-decoration:none">${escapeEmailHtml(resolveSupportEmail())}</a></td></tr>`,
    '</table>',
    '</td></tr></table>',
    '</body></html>'
  ].join('');
};

const extractJsonObject = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

const generateMomentEmailCopy = async ({ eventType, name, title, body, link, stats = [] }) => {
  const fallback = {
    badge: 'Urban Prime',
    title,
    intro: body || 'Something worth checking is waiting for you on Urban Prime.',
    highlight: 'Open Urban Prime to see the full update and take the next step.',
    subject: title
  };
  if (!EMAIL_AI_ACTIVE || !EMAIL_AI_KEY) return fallback;

  try {
    const prompt = [
      'Create premium transactional email copy for Urban Prime.',
      'Return strict JSON only with keys: badge, subject, title, intro, highlight.',
      'No markdown, no emojis, no raw HTML. Keep it concise and human.',
      'Never say the user was inactive, absent, or away for two days. Use indirect curiosity and momentum.',
      `Event: ${eventType}`,
      `Recipient: ${name || 'there'}`,
      `Current title: ${title || ''}`,
      `Current body: ${body || ''}`,
      `Link path: ${link || ''}`,
      `Stats: ${JSON.stringify(stats || [])}`
    ].join('\n');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(EMAIL_AI_MODEL_NAME)}:generateContent?key=${encodeURIComponent(EMAIL_AI_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 420, responseMimeType: 'application/json' }
      })
    });
    if (!response.ok) throw new Error(`Gemini email copy failed with ${response.status}`);
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('\n') || '';
    const parsed = extractJsonObject(text);
    if (!parsed) return fallback;
    return {
      badge: String(parsed.badge || fallback.badge).slice(0, 48),
      subject: String(parsed.subject || fallback.subject).slice(0, 120),
      title: String(parsed.title || fallback.title).slice(0, 120),
      intro: String(parsed.intro || fallback.intro).slice(0, 480),
      highlight: String(parsed.highlight || fallback.highlight).slice(0, 240)
    };
  } catch (error) {
    console.warn('AI email copy skipped:', error?.message || error);
    return fallback;
  }
};

const hasRecentEmailOutbox = async (dedupeKey, windowMs = EMAIL_EVENT_DEDUPE_WINDOW_MS) => {
  if (!dedupeKey || windowMs <= 0) return false;
  try {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { data, error } = await supabase
      .from('message_outbox')
      .select('id')
      .eq('channel', 'email')
      .eq('dedupe_key', dedupeKey)
      .gte('created_at', since)
      .limit(1);
    if (error) throw error;
    return (data || []).length > 0;
  } catch (error) {
    console.warn('Email outbox dedupe skipped:', error?.message || error);
    return false;
  }
};

const sendMomentEmail = async ({
  userId,
  eventType,
  title,
  body,
  link = '/',
  ctaLabel = 'Open Urban Prime',
  stats = [],
  previewItems = [],
  dedupeKey = null,
  dedupeMs = EMAIL_EVENT_DEDUPE_WINDOW_MS,
  badge = 'Urban Prime',
  highlight = null,
  req = null
}) => {
  if (!EMAIL_NOTIFICATIONS_ACTIVE) return { skipped: true, reason: 'disabled' };
  if (!userId) return { skipped: true, reason: 'missing_user' };
  if (dedupeKey && await hasRecentEmailOutbox(dedupeKey, dedupeMs)) {
    return { skipped: true, reason: 'deduped' };
  }

  const profile = await getUserMessagingProfile(userId);
  const email = normalizeEmail(profile?.email);
  if (!isEmailAddress(email)) return { skipped: true, reason: 'missing_email' };

  const safeName = String(profile?.name || email.split('@')[0] || 'there').trim();
  const actionUrl = req ? buildEmailActionUrl(req, link || '/') : `${APP_PUBLIC_URL_NORMALIZED || ''}${String(link || '/').startsWith('/') ? link || '/' : `/${link || ''}`}`;
  const copy = await generateMomentEmailCopy({
    eventType,
    name: safeName,
    title,
    body,
    link,
    stats
  });
  const subject = copy.subject || title || 'Urban Prime update';
  const text = [
    `Hi ${safeName},`,
    '',
    copy.intro || body || title,
    highlight || copy.highlight || '',
    '',
    actionUrl,
    '',
    `Support: ${resolveSupportEmail()}`
  ].filter(Boolean).join('\n');
  const html = buildUrbanPrimeMomentEmail({
    preheader: copy.intro || body || title,
    badge: copy.badge || badge,
    title: copy.title || title,
    intro: `Hi ${safeName}, ${copy.intro || body || title}`,
    highlight: highlight || copy.highlight,
    stats,
    previewItems,
    primaryAction: { href: actionUrl, label: ctaLabel },
    secondaryActions: [{ href: `mailto:${resolveSupportEmail()}`, label: 'Contact support', variant: 'ghost' }]
  });

  const outbox = await createMessageOutbox({
    userId,
    channel: 'email',
    eventType,
    templateName: 'urbanprime_moment_email',
    recipient: email,
    payload: { title, body, link, stats, previewItems },
    dedupeKey
  });

  try {
    await sendUrbanPrimeEmail({ to: email, subject, text, html });
    await updateMessageOutbox(outbox?.id, {
      status: 'sent',
      attempt_count: Number(outbox?.attempt_count || 0) + 1,
      sent_at: new Date().toISOString(),
      last_error: null
    });
    return { ok: true };
  } catch (error) {
    await updateMessageOutbox(outbox?.id, {
      status: 'failed',
      attempt_count: Number(outbox?.attempt_count || 0) + 1,
      last_error: String(error?.message || error).slice(0, 900)
    });
    throw error;
  }
};

const WHATSAPP_MESSAGE_CATEGORIES = new Set(['authentication', 'security', 'utility', 'marketing']);

const normalizeMessageCategory = (value, fallback = 'utility') => {
  const normalized = String(value || '').trim().toLowerCase();
  return WHATSAPP_MESSAGE_CATEGORIES.has(normalized) ? normalized : fallback;
};

const isWhatsAppConfigured = () =>
  Boolean(WHATSAPP_ACTIVE && WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);

const normalizeWhatsAppTo = (value) => {
  const normalized = normalizePhone(value);
  return normalized ? normalized.replace(/\D/g, '') : '';
};

const maskPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 4) return digits ? `...${digits}` : '';
  return `+${digits.slice(0, Math.min(3, digits.length - 4))}...${digits.slice(-4)}`;
};

const compactTemplateParameters = (values = []) =>
  values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((text) => ({ type: 'text', text: text.slice(0, 900) }));

const buildWhatsAppTemplatePayload = ({ to, templateName, locale = WHATSAPP_LOCALE, bodyParams = [] }) => {
  const components = [];
  const parameters = compactTemplateParameters(bodyParams);
  if (parameters.length > 0) {
    components.push({ type: 'body', parameters });
  }
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeWhatsAppTo(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: locale },
      ...(components.length > 0 ? { components } : {})
    }
  };
};

const createMessageOutbox = async ({
  userId = null,
  channel,
  eventType,
  templateName = null,
  recipient,
  payload = {},
  status = 'queued',
  dedupeKey = null,
  providerMessageId = null,
  lastError = null
}) => {
  try {
    const now = new Date().toISOString();
    const insertPayload = {
      user_id: userId,
      channel,
      event_type: eventType,
      template_name: templateName,
      recipient,
      payload,
      status,
      dedupe_key: dedupeKey,
      attempt_count: status === 'queued' ? 0 : 1,
      last_error: lastError,
      provider_message_id: providerMessageId,
      sent_at: ['accepted', 'sent', 'delivered', 'read'].includes(status) ? now : null,
      updated_at: now
    };
    const { data, error } = await supabase
      .from('message_outbox')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Message outbox insert skipped:', error?.message || error);
    return null;
  }
};

const updateMessageOutbox = async (outboxId, patch = {}) => {
  if (!outboxId) return null;
  try {
    const { data, error } = await supabase
      .from('message_outbox')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', outboxId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Message outbox update skipped:', error?.message || error);
    return null;
  }
};

const recordMessageDelivery = async ({ outboxId = null, provider = 'meta_whatsapp', providerMessageId, status, rawEvent = {} }) => {
  try {
    const { error } = await supabase.from('message_deliveries').insert({
      outbox_id: outboxId,
      provider,
      provider_message_id: providerMessageId || null,
      status,
      raw_event: rawEvent
    });
    if (error) throw error;
  } catch (error) {
    console.warn('Message delivery insert skipped:', error?.message || error);
  }
};

const sendWhatsAppTemplate = async ({
  to,
  templateName,
  locale = WHATSAPP_LOCALE,
  bodyParams = [],
  userId = null,
  eventType,
  category = 'utility',
  dedupeKey = null,
  fallbackText = ''
}) => {
  const recipient = normalizePhone(to);
  if (!recipient) {
    throw new Error('Enter a valid WhatsApp phone number with country code.');
  }
  const payload = buildWhatsAppTemplatePayload({ to: recipient, templateName, locale, bodyParams });
  const outbox = await createMessageOutbox({
    userId,
    channel: 'whatsapp',
    eventType,
    templateName,
    recipient,
    payload: { category: normalizeMessageCategory(category), template: payload.template, fallbackText },
    status: WHATSAPP_DRY_RUN_ACTIVE ? 'dry_run' : 'queued',
    dedupeKey
  });

  if (!isWhatsAppConfigured()) {
    const error = new Error('WhatsApp Business delivery is not configured.');
    await updateMessageOutbox(outbox?.id, { status: 'failed', last_error: error.message, attempt_count: 1 });
    throw error;
  }

  if (WHATSAPP_DRY_RUN_ACTIVE) {
    console.info('WhatsApp dry run:', JSON.stringify({ to: maskPhone(recipient), templateName, bodyParams }));
    return { ok: true, dryRun: true, outboxId: outbox?.id || null };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(WHATSAPP_PHONE_NUMBER_ID)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responsePayload?.error?.message || responsePayload?.message || `WhatsApp provider error ${response.status}`;
    await updateMessageOutbox(outbox?.id, { status: 'failed', last_error: message, attempt_count: 1 });
    throw new Error(message);
  }

  const providerMessageId = responsePayload?.messages?.[0]?.id || null;
  await updateMessageOutbox(outbox?.id, {
    status: responsePayload?.messages?.[0]?.message_status || 'accepted',
    provider_message_id: providerMessageId,
    sent_at: new Date().toISOString(),
    attempt_count: 1
  });
  await recordMessageDelivery({
    outboxId: outbox?.id || null,
    providerMessageId,
    status: responsePayload?.messages?.[0]?.message_status || 'accepted',
    rawEvent: responsePayload || {}
  });
  return { ok: true, providerMessageId, outboxId: outbox?.id || null };
};

const sendWhatsAppText = async ({ to, text, userId = null, eventType = 'service_reply' }) => {
  const recipient = normalizePhone(to);
  if (!recipient || !text) return null;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeWhatsAppTo(recipient),
    type: 'text',
    text: { preview_url: false, body: String(text).slice(0, 4000) }
  };
  const outbox = await createMessageOutbox({
    userId,
    channel: 'whatsapp',
    eventType,
    templateName: null,
    recipient,
    payload,
    status: WHATSAPP_DRY_RUN_ACTIVE ? 'dry_run' : 'queued'
  });
  if (!isWhatsAppConfigured() || WHATSAPP_DRY_RUN_ACTIVE) return { ok: true, outboxId: outbox?.id || null };
  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(WHATSAPP_PHONE_NUMBER_ID)}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responsePayload?.error?.message || `WhatsApp provider error ${response.status}`;
    await updateMessageOutbox(outbox?.id, { status: 'failed', last_error: message, attempt_count: 1 });
    throw new Error(message);
  }
  const providerMessageId = responsePayload?.messages?.[0]?.id || null;
  await updateMessageOutbox(outbox?.id, { status: 'accepted', provider_message_id: providerMessageId, sent_at: new Date().toISOString(), attempt_count: 1 });
  return { ok: true, providerMessageId, outboxId: outbox?.id || null };
};

const sendPhonePinWhatsApp = async ({ phone, pin, purpose, userId = null, name = '' }) => {
  const expiresInMinutes = Math.max(1, Math.round(PHONE_AUTH_TTL_MS / 60000));
  const purposeLabel = purpose === 'signup' ? 'create your account' : 'sign in';
  return sendWhatsAppTemplate({
    to: phone,
    templateName: WHATSAPP_TEMPLATES.authCode,
    userId,
    eventType: `phone_${purpose}_otp`,
    category: 'authentication',
    bodyParams: [
      pin,
      String(expiresInMinutes),
      String(name || 'there'),
      purposeLabel
    ],
    fallbackText: `Urban Prime PIN: ${pin}. It expires in ${expiresInMinutes} minutes. Do not share it.`
  });
};

const sendPasswordResetPinEmail = async ({ email, pin, expiresInMinutes }) => {
  const subject = 'Your Urban Prime password reset PIN';
  const text = [
    `Your Urban Prime password reset PIN is ${pin}.`,
    '',
    `This PIN expires in ${expiresInMinutes} minutes.`,
    "Don't share this PIN with anyone.",
    '',
    'If you did not request a password reset, you can ignore this email.'
  ].join('\n');
  const html = buildUrbanPrimeEmail({
    preheader: 'Use this private PIN to finish resetting your Urban Prime password.',
    eyebrow: 'Password Reset',
    title: 'Reset your Urban Prime password',
    intro: 'Use the secure PIN below to continue resetting your password. This code is private and should never be shared.',
    code: pin,
    details: [
      { label: 'Account', value: email },
      { label: 'Expires in', value: `${expiresInMinutes} minutes` }
    ],
    warning: "Don't share this PIN with anyone. Urban Prime support will never ask for it.",
    footer: 'If you did not request this, you can safely ignore the email or contact support.'
  });

  await sendUrbanPrimeEmail({ to: email, subject, text, html });
};

const normalizeWorkRequestStatus = (value, fallback = 'open') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['open', 'in_review', 'matched', 'cancelled', 'closed'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkRequestType = (value, fallback = 'quote') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['booking', 'quote'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkProposalStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'accepted', 'declined', 'withdrawn', 'expired'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkContractStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'pending', 'active', 'completed', 'cancelled', 'disputed'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeProviderApplicationStatus = (value, fallback = 'draft') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'submitted', 'under_review', 'approved', 'rejected', 'resubmission_requested'].includes(normalized)) {
    return normalized;
  }
  return fallback;
};

const enrichProviderApplicationsWithUserRows = async (rows = []) => {
  const sourceRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (sourceRows.length === 0) return [];

  const userIds = Array.from(new Set(sourceRows.map((row) => String(row?.user_id || '').trim()).filter(Boolean)));
  if (userIds.length === 0) return sourceRows;

  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid,name,email,avatar_url')
    .in('id', userIds);
  if (error) throw error;

  const userMap = new Map((data || []).map((row) => [String(row.id), row]));
  return sourceRows.map((row) => {
    const userRow = userMap.get(String(row?.user_id || '').trim());
    return {
      ...row,
      user_supabase_id: row?.user_id || null,
      user_firebase_uid: userRow?.firebase_uid || null,
      user_name: userRow?.name || null,
      user_email: userRow?.email || null,
      user_avatar_url: userRow?.avatar_url || null
    };
  });
};

const normalizeMilestoneStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'submitted', 'approved', 'released', 'rejected'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeEscrowAction = (value, fallback = 'hold') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['hold', 'release', 'refund', 'adjustment'].includes(normalized)) return normalized;
  return fallback;
};

const parsePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const WORK_MATCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that',
  'the', 'this', 'to', 'with', 'you', 'your', 'need', 'needs', 'want', 'wants', 'will', 'must', 'can', 'our'
]);

const tokenizeWorkMatchText = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]+/g, ' ')
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 2 && !WORK_MATCH_STOP_WORDS.has(entry));
  return Array.from(new Set(normalized));
};

const buildRequestedMatchSignals = (body) => {
  const brief = toNullableText(body.brief) || '';
  const requirements = Array.isArray(body.requirements)
    ? body.requirements.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
  const requestedSkills = Array.isArray(body.skills)
    ? body.skills.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
    : [];

  const tokenPool = new Set(requestedSkills);
  requirements.forEach((entry) => tokenizeWorkMatchText(entry).forEach((token) => tokenPool.add(token)));
  tokenizeWorkMatchText(brief).forEach((token) => tokenPool.add(token));

  return {
    brief,
    requirements,
    requestedSkills,
    requestedTokens: Array.from(tokenPool).slice(0, 36)
  };
};

const getListingStartingPrice = (listing) => {
  const packagePrices = Array.isArray(listing?.packages)
    ? listing.packages.map((entry) => parsePositiveNumber(entry?.price, 0)).filter((value) => value > 0)
    : [];
  const basePrice = parsePositiveNumber(listing?.base_price, 0);
  const prices = [...packagePrices, ...(basePrice > 0 ? [basePrice] : [])];
  return prices.length > 0 ? Math.min(...prices) : 0;
};

const computePriceFitScore = (startingPrice, budgetMin, budgetMax) => {
  const min = parsePositiveNumber(budgetMin, 0);
  const max = parsePositiveNumber(budgetMax, 0);

  if (startingPrice <= 0 && !min && !max) return 58;
  if (!min && !max) return 68;
  if (startingPrice <= 0) return 45;

  if (min && max && startingPrice >= min && startingPrice <= max) {
    return 96;
  }

  if (max && startingPrice <= max) {
    return 88;
  }

  if (min && startingPrice >= min && !max) {
    return 84;
  }

  if (max && startingPrice > max) {
    const overRatio = (startingPrice - max) / Math.max(max, 1);
    return Math.max(8, 72 - overRatio * 120);
  }

  if (min && startingPrice < min) {
    const underRatio = (min - startingPrice) / Math.max(min, 1);
    return Math.max(24, 78 - underRatio * 80);
  }

  return 60;
};

const mapAutopilotListingForClient = (listing, providerApplication, providerUser) => {
  const providerSnapshot = normalizeJsonObject(listing?.provider_snapshot);
  const details = normalizeJsonObject(listing?.details);
  const packages = Array.isArray(listing?.packages) ? listing.packages : [];
  const trustBadges = new Set(Array.isArray(details.trustBadges) ? details.trustBadges : []);
  const responseSlaHours = parsePositiveNumber(
    details.responseSlaHours ?? providerApplication?.response_sla_hours,
    0
  );

  if (providerApplication?.status === 'approved') trustBadges.add('Approved provider');
  if (providerApplication?.payout_ready) trustBadges.add('Payout ready');
  if (Array.isArray(providerApplication?.portfolio) && providerApplication.portfolio.length > 0) trustBadges.add('Portfolio available');
  if (responseSlaHours > 0 && responseSlaHours <= 24) trustBadges.add('Fast response');

  const providerId = String(
    providerUser?.firebase_uid ||
    providerSnapshot.id ||
    listing?.seller_id ||
    ''
  ).trim();

  return {
    id: String(listing?.id || ''),
    title: String(listing?.title || 'Untitled service'),
    description: String(listing?.description || ''),
    category: String(listing?.category || 'general'),
    mode: normalizeWorkMode(listing?.mode, 'hybrid'),
    fulfillmentKind: normalizeFulfillmentKind(listing?.fulfillment_kind, 'hybrid'),
    sellerId: providerId || String(listing?.seller_id || ''),
    sellerPersonaId: listing?.seller_persona_id || null,
    providerSnapshot: {
      id: providerId || String(listing?.seller_id || ''),
      name: providerSnapshot.name || providerUser?.name || providerApplication?.business_name || 'Provider',
      avatar: providerSnapshot.avatar || providerUser?.avatar_url || '/icons/urbanprime.svg',
      rating: parsePositiveNumber(providerSnapshot.rating, 0),
      reviews: Array.isArray(providerSnapshot.reviews) ? providerSnapshot.reviews : []
    },
    currency: normalizeCurrencyCode(listing?.currency, 'USD'),
    timezone: toNullableText(listing?.timezone) || 'UTC',
    basePrice: parsePositiveNumber(listing?.base_price, 0),
    packages,
    skills: Array.isArray(listing?.skills) ? listing.skills : [],
    media: Array.isArray(listing?.media) ? listing.media : [],
    availability: normalizeJsonObject(listing?.availability),
    details: {
      ...details,
      responseSlaHours: responseSlaHours > 0 ? responseSlaHours : details.responseSlaHours,
      trustBadges: Array.from(trustBadges)
    },
    riskScore: parsePositiveNumber(listing?.risk_score, 0),
    status: normalizeWorkListingStatus(listing?.status, 'draft'),
    visibility: toNullableText(listing?.visibility) || 'public',
    reviewNotes: toNullableText(listing?.review_notes),
    submittedAt: listing?.submitted_at || null,
    reviewedAt: listing?.reviewed_at || null,
    publishedAt: listing?.published_at || null,
    createdAt: listing?.created_at || new Date().toISOString(),
    updatedAt: listing?.updated_at || null
  };
};

const resolveUserById = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id,name,avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const writeAuditLog = async ({ actorUserId, action, entityType, entityId, details = {} }) => {
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (error) {
    console.warn('Audit log write failed:', error?.message || error);
  }
};

const mapWorkListingToLegacyServiceRecord = (row) => {
  const providerSnapshot = normalizeJsonObject(row?.provider_snapshot);
  const packages = Array.isArray(row?.packages) ? row.packages : [];
  const details = normalizeJsonObject(row?.details);
  const pricingModels = packages.length > 0
    ? packages.map((pkg) => ({
        type: pkg?.type || 'fixed',
        price: Number(pkg?.price || row?.base_price || 0),
        description: pkg?.description || pkg?.name || 'Service package',
        currency: pkg?.currency || row?.currency || 'USD',
        deliveryDays: pkg?.deliveryDays || null,
        revisions: pkg?.revisions || null
      }))
    : [{
        type: 'fixed',
        price: Number(row?.base_price || 0),
        description: 'Standard package',
        currency: row?.currency || 'USD'
      }];

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'general',
    provider: {
      id: providerSnapshot?.id || row?.seller_id || '',
      name: providerSnapshot?.name || 'Provider',
      avatar: providerSnapshot?.avatar || '/icons/urbanprime.svg',
      rating: Number(providerSnapshot?.rating || 0),
      reviews: Array.isArray(providerSnapshot?.reviews) ? providerSnapshot.reviews : []
    },
    imageUrls: Array.isArray(row?.media) ? row.media : [],
    pricingModels,
    avgRating: Number(providerSnapshot?.rating || 0),
    reviews: Array.isArray(providerSnapshot?.reviews) ? providerSnapshot.reviews : [],
    mode: row?.mode || 'hybrid',
    fulfillmentKind: row?.fulfillment_kind || 'hybrid',
    riskScore: Number(row?.risk_score || 0),
    currency: row?.currency || 'USD',
    timezone: row?.timezone || null,
    availability: normalizeJsonObject(row?.availability),
    details,
    status: row?.status || 'draft',
    providerPersonaId: row?.seller_persona_id || null,
    listingSource: 'omniwork'
  };
};

const mirrorWorkCollectionRecord = async (collectionName, docId, data) => {
  if (!collectionName || !docId) return;
  try {
    await supabase.from('mirror_documents').upsert({
      collection: collectionName,
      doc_id: docId,
      data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'collection,doc_id',
      ignoreDuplicates: false
    });
  } catch (error) {
    console.warn(`Failed to mirror ${collectionName}:`, error?.message || error);
  }
};

const mirrorWorkListingForLegacy = async (row) => {
  const legacyService = mapWorkListingToLegacyServiceRecord(row);
  try {
    await supabase.from('mirror_documents').upsert([
      {
        collection: 'work_listings',
        doc_id: row.id,
        data: row,
        updated_at: new Date().toISOString()
      },
      {
        collection: 'services',
        doc_id: row.id,
        data: legacyService,
        updated_at: new Date().toISOString()
      }
    ], {
      onConflict: 'collection,doc_id',
      ignoreDuplicates: false
    });
  } catch (error) {
    console.warn('Failed to mirror work listing:', error?.message || error);
  }
};

const createPendingProviderCapabilities = () => ({
  buy: 'inactive',
  rent: 'inactive',
  sell: 'inactive',
  provide_service: 'pending',
  affiliate: 'inactive',
  ship: 'inactive',
  admin: 'inactive'
});

const createActiveProviderCapabilities = () => ({
  buy: 'inactive',
  rent: 'inactive',
  sell: 'inactive',
  provide_service: 'active',
  affiliate: 'inactive',
  ship: 'inactive',
  admin: 'inactive'
});

const deepMergeDraft = (base, patch) => {
  const baseObject = normalizeJsonObject(base);
  const patchObject = normalizeJsonObject(patch);
  const output = { ...baseObject };

  Object.entries(patchObject).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      output[key] = value.slice();
      return;
    }
    if (value && typeof value === 'object') {
      output[key] = deepMergeDraft(baseObject[key], value);
      return;
    }
    output[key] = value;
  });

  return output;
};

const normalizeIntent = (rawIntent) => {
  if (!rawIntent) return null;
  const normalized = String(rawIntent).trim().toLowerCase();
  if (normalized === 'list') return 'sell';
  if (normalized === 'provide_service') return 'provide';
  if (ONBOARDING_INTENTS.has(normalized)) return normalized;
  return null;
};

const normalizeIntents = (rawIntents) => {
  if (!rawIntents) return [];
  const source = Array.isArray(rawIntents) ? rawIntents : [rawIntents];
  const flattened = source.flatMap((entry) => {
    if (Array.isArray(entry)) return entry;
    if (typeof entry === 'string' && entry.includes(',')) {
      return entry.split(',').map((value) => value.trim());
    }
    return [entry];
  });

  const normalized = flattened
    .map((entry) => normalizeIntent(entry))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const parsePurposeToIntents = (purpose) => {
  if (!purpose) return [];
  const normalized = String(purpose).trim().toLowerCase();
  if (normalized === 'both') return ['buy', 'sell'];
  return normalizeIntents(normalized);
};

const intentsToPurpose = (intents) => normalizeIntents(intents).join(',');

const normalizeOnboardingStep = (step) => {
  const normalized = String(step || '').trim().toLowerCase();
  if (['intent', 'identity', 'preferences', 'role_setup', 'review', 'completed'].includes(normalized)) {
    return normalized;
  }
  return 'intent';
};

const normalizePhone = (value) => {
  if (!hasText(value)) return null;
  let compact = String(value).replace(/[^\d+]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (/^\d+$/.test(compact)) compact = `+${compact}`;
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) return null;
  return compact;
};

const buildPersonaCapabilities = (type, role = 'user') => {
  const capabilities = {
    buy: 'inactive',
    rent: 'inactive',
    sell: 'inactive',
    provide_service: 'inactive',
    affiliate: 'inactive',
    admin: role === 'admin' ? 'active' : 'inactive'
  };

  if (type === 'consumer') {
    capabilities.buy = 'active';
    capabilities.rent = 'active';
  }
  if (type === 'seller') capabilities.sell = 'active';
  if (type === 'provider') capabilities.provide_service = 'active';
  if (type === 'affiliate') capabilities.affiliate = 'active';
  return capabilities;
};

const mapOnboardingStateRow = (row) => {
  if (!row) return null;
  return {
    userId: row.user_id,
    currentStep: row.current_step,
    flowVersion: row.flow_version,
    selectedIntents: normalizeIntents(row.selected_intents),
    draft: normalizeJsonObject(row.draft),
    startedAt: row.started_at,
    updatedAt: row.updated_at
  };
};

const completionToResponse = (completion) => ({
  isComplete: completion.isComplete,
  missingRequiredFields: completion.missingRequiredFields,
  nextStep: completion.nextStep
});

const getRequestFirebaseUid = (req) => {
  const tokenUid =
    req.user?.uid ||
    req.user?.user_id ||
    req.user?.sub ||
    req.user?.firebase_uid;
  if (hasText(tokenUid)) return tokenUid;

  const headerUid = req.headers['x-firebase-uid'];
  if (Array.isArray(headerUid) && hasText(headerUid[0])) return headerUid[0];
  if (hasText(headerUid)) return headerUid;

  const bodyUid = req.body?.firebase_uid || req.body?.firebaseUid;
  if (hasText(bodyUid)) return bodyUid;

  const queryUid = req.query?.firebase_uid || req.query?.firebaseUid;
  if (Array.isArray(queryUid) && hasText(queryUid[0])) return queryUid[0];
  if (hasText(queryUid)) return queryUid;

  return null;
};

const hydrateRequestUserFromFirebaseUid = (req) => {
  const firebaseUid = getRequestFirebaseUid(req);
  if (!hasText(firebaseUid)) return null;

  const currentUser = normalizeJsonObject(req.user);
  if (!hasText(currentUser.uid)) currentUser.uid = firebaseUid;
  if (!hasText(currentUser.firebase_uid)) currentUser.firebase_uid = firebaseUid;
  if (!hasText(currentUser.sub)) currentUser.sub = firebaseUid;
  req.user = currentUser;
  return firebaseUid;
};

const isUniqueViolation = (error) => error?.code === '23505' || /duplicate key/i.test(error?.message || '');

const ensureUserRow = async (firebaseUid, hints = {}) => {
  const { data: existingUser, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (existingError) return { error: existingError };

  const basePayload = {
    firebase_uid: firebaseUid,
    email: toNullableText(hints.email),
    name: toNullableText(hints.name),
    avatar_url: toNullableText(hints.avatar_url),
    phone: normalizePhone(hints.phone) || undefined
  };

  const payload = Object.fromEntries(
    Object.entries(basePayload).filter(([, value]) => value !== undefined)
  );

  if (!existingUser) {
    let insertPayload = { ...payload };
    let insertResult = await supabase.from('users').insert(insertPayload).select('*').maybeSingle();

    if (insertResult.error && isUniqueViolation(insertResult.error) && insertPayload.email) {
      delete insertPayload.email;
      insertResult = await supabase.from('users').insert(insertPayload).select('*').maybeSingle();
    }

    return { user: insertResult.data || null, error: insertResult.error || null };
  }

  const updatePayload = {};
  if (payload.email && payload.email !== existingUser.email) updatePayload.email = payload.email;
  if (payload.name && payload.name !== existingUser.name) updatePayload.name = payload.name;
  if (payload.avatar_url && payload.avatar_url !== existingUser.avatar_url) updatePayload.avatar_url = payload.avatar_url;
  if (payload.phone && payload.phone !== existingUser.phone) updatePayload.phone = payload.phone;

  if (Object.keys(updatePayload).length === 0) {
    return { user: existingUser, error: null };
  }

  let updateResult = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', existingUser.id)
    .select('*')
    .maybeSingle();

  if (updateResult.error && isUniqueViolation(updateResult.error) && updatePayload.email) {
    delete updatePayload.email;
    if (Object.keys(updatePayload).length > 0) {
      updateResult = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select('*')
        .maybeSingle();
    } else {
      updateResult = { data: existingUser, error: null };
    }
  }

  return { user: updateResult.data || existingUser, error: updateResult.error || null };
};

const getUserMessagingProfile = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid,email,name,phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Unable to load messaging profile:', error.message);
    return null;
  }
  return data || null;
};

const resolveUserIdByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (error) {
    console.warn('Unable to resolve user by email:', error.message);
    return null;
  }
  return data?.id || null;
};

const upsertMessagePreference = async ({ userId, phone, category, enabled, source = 'settings' }) => {
  const normalizedCategory = normalizeMessageCategory(category);
  const normalizedPhone = normalizePhone(phone);
  if (!userId || !normalizedPhone) return;
  const now = new Date().toISOString();
  try {
    await supabase.from('message_preferences').upsert({
      user_id: userId,
      channel: 'whatsapp',
      category: normalizedCategory,
      enabled: Boolean(enabled),
      updated_at: now
    }, { onConflict: 'user_id,channel,category', ignoreDuplicates: false });
    await supabase.from('message_consents').upsert({
      user_id: userId,
      channel: 'whatsapp',
      phone_e164: normalizedPhone,
      category: normalizedCategory,
      status: enabled ? 'opted_in' : 'opted_out',
      source,
      updated_at: now
    }, { onConflict: 'user_id,channel,category', ignoreDuplicates: false });
  } catch (error) {
    console.warn('Unable to save WhatsApp preference:', error?.message || error);
  }
};

const ensureDefaultWhatsAppConsents = async ({ userId, phone, source = 'phone_auth' }) => {
  for (const category of ['authentication', 'security', 'utility']) {
    await upsertMessagePreference({ userId, phone, category, enabled: true, source });
  }
};

const getWhatsAppPreferenceSnapshot = async (userId) => {
  const defaults = {
    authentication: false,
    security: false,
    utility: false,
    marketing: false
  };
  if (!userId) return defaults;
  try {
    const { data, error } = await supabase
      .from('message_preferences')
      .select('category,enabled')
      .eq('user_id', userId)
      .eq('channel', 'whatsapp');
    if (error) throw error;
    const output = { ...defaults };
    (data || []).forEach((row) => {
      const category = normalizeMessageCategory(row?.category, '');
      if (category) output[category] = row?.enabled === true;
    });
    return output;
  } catch (error) {
    console.warn('WhatsApp preference snapshot skipped:', error?.message || error);
    return defaults;
  }
};

const canSendWhatsAppCategory = async ({ userId, category }) => {
  const normalizedCategory = normalizeMessageCategory(category);
  if (!userId) return normalizedCategory === 'authentication';
  try {
    const { data, error } = await supabase
      .from('message_preferences')
      .select('enabled')
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .eq('category', normalizedCategory)
      .maybeSingle();
    if (error) throw error;
    return data?.enabled === true;
  } catch (error) {
    console.warn('WhatsApp preference check skipped:', error?.message || error);
    return false;
  }
};

const ensureUserProfileRow = async (userId) => {
  const existing = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing.error) return { profile: null, error: existing.error };
  if (existing.data) return { profile: existing.data, error: null };

  const insert = await supabase
    .from('user_profiles')
    .insert({ user_id: userId })
    .select('*')
    .maybeSingle();

  return { profile: insert.data || null, error: insert.error || null };
};

const loadOnboardingStateRow = async (userId) => {
  const { data, error } = await supabase
    .from('user_onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { row: data || null, error: error || null };
};

const buildDefaultOnboardingDraft = ({ user, profile, selectedIntents = [] }) => ({
  intent: {
    selectedIntents
  },
  identity: {
    name: user?.name || '',
    phone: user?.phone || '',
    country: profile?.country || '',
    city: profile?.city || '',
    currencyPreference: profile?.currency_preference || '',
    avatarUrl: user?.avatar_url || ''
  },
  preferences: {
    interests: normalizeJsonArray(profile?.interests)
  },
  roleSetup: {
    businessName: profile?.business_name || '',
    businessDescription: profile?.business_description || '',
    about: profile?.about || ''
  }
});

const computeProfileCompletion = ({ user, profile, onboardingState }) => {
  const intentsFromState = normalizeIntents(onboardingState?.selected_intents || onboardingState?.selectedIntents);
  const intents = intentsFromState.length > 0
    ? intentsFromState
    : parsePurposeToIntents(profile?.purpose);

  const onboardingMarkedComplete = profile
    && (profile.onboarding_required === false || hasText(profile.onboarding_completed_at));

  if (onboardingMarkedComplete) {
    return {
      isComplete: true,
      missingRequiredFields: [],
      nextStep: 'completed',
      selectedIntents: intents
    };
  }

  const interests = normalizeJsonArray(profile?.interests);
  const roleSetup = normalizeJsonObject(onboardingState?.draft?.roleSetup);
  const missingRequiredFields = [];

  if (!hasText(user?.name)) missingRequiredFields.push('name');
  if (!normalizePhone(user?.phone)) missingRequiredFields.push('phone');
  if (!hasText(profile?.country)) missingRequiredFields.push('country');
  if (!hasText(profile?.city)) missingRequiredFields.push('city');
  if (!hasText(profile?.currency_preference)) missingRequiredFields.push('currency_preference');
  if (!intents.length) missingRequiredFields.push('purpose');
  if (!interests.length) missingRequiredFields.push('interests');

  if (intents.includes('sell')) {
    if (!hasText(profile?.business_name) && !hasText(roleSetup.businessName)) {
      missingRequiredFields.push('business_name');
    }
    if (!hasText(roleSetup.industry)) missingRequiredFields.push('industry');
  }

  if (intents.includes('provide')) {
    if (!hasText(roleSetup.industry)) missingRequiredFields.push('industry');
    if (!hasText(profile?.city)) missingRequiredFields.push('city');
    if (!hasText(roleSetup.experienceYears)) missingRequiredFields.push('experienceYears');
  }

  if (intents.includes('affiliate')) {
    if (!hasText(roleSetup.channelType)) missingRequiredFields.push('channelType');
    if (!hasText(roleSetup.goals)) missingRequiredFields.push('goals');
  }

  const dedupedMissing = Array.from(new Set(missingRequiredFields));
  const identityFields = new Set(['name', 'phone', 'country', 'city', 'currency_preference']);
  const roleFields = new Set(['business_name', 'industry', 'experienceYears', 'channelType', 'goals']);

  let nextStep = 'completed';
  if (!intents.length || dedupedMissing.includes('purpose')) {
    nextStep = 'intent';
  } else if (dedupedMissing.some((field) => identityFields.has(field))) {
    nextStep = 'identity';
  } else if (dedupedMissing.includes('interests')) {
    nextStep = 'preferences';
  } else if (dedupedMissing.some((field) => roleFields.has(field))) {
    nextStep = 'role_setup';
  } else if (dedupedMissing.length > 0) {
    nextStep = 'review';
  }

  return {
    isComplete: dedupedMissing.length === 0,
    missingRequiredFields: dedupedMissing,
    nextStep,
    selectedIntents: intents
  };
};

const applyProfilePatch = async ({
  userRow,
  profileRow,
  userPatch = {},
  profilePatch = {},
  strictPhone = true
}) => {
  const normalizedUserPatch = {};
  const normalizedProfilePatch = {};

  Object.entries(userPatch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'phone') {
      const normalized = normalizePhone(value);
      if (!normalized && strictPhone) {
        throw new Error('Phone number must be in international format, e.g. +14155552671.');
      }
      if (normalized) normalizedUserPatch.phone = normalized;
      return;
    }
    normalizedUserPatch[key] = value;
  });

  Object.entries(profilePatch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'interests') {
      normalizedProfilePatch.interests = normalizeJsonArray(value);
      return;
    }
    if (key === 'preferences' || key === 'social_links') {
      normalizedProfilePatch[key] = normalizeJsonObject(value);
      return;
    }
    normalizedProfilePatch[key] = value;
  });

  let nextUser = userRow;
  let nextProfile = profileRow;

  if (normalizedProfilePatch.preferences) {
    normalizedProfilePatch.preferences = {
      ...normalizeJsonObject(profileRow?.preferences),
      ...normalizeJsonObject(normalizedProfilePatch.preferences)
    };
  }
  if (normalizedProfilePatch.social_links) {
    normalizedProfilePatch.social_links = {
      ...normalizeJsonObject(profileRow?.social_links),
      ...normalizeJsonObject(normalizedProfilePatch.social_links)
    };
  }

  if (Object.keys(normalizedUserPatch).length > 0) {
    const { data, error } = await supabase
      .from('users')
      .update(normalizedUserPatch)
      .eq('id', userRow.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    nextUser = data || userRow;
  }

  if (Object.keys(normalizedProfilePatch).length > 0) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(normalizedProfilePatch)
      .eq('user_id', userRow.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    nextProfile = data || profileRow;
  }

  return { user: nextUser, profile: nextProfile };
};

const upsertOnboardingState = async ({ userId, existingRow, patch = {} }) => {
  const existingDraft = normalizeJsonObject(existingRow?.draft);
  const patchDraft = normalizeJsonObject(patch.draft);
  const selectedIntents = patch.selectedIntents !== undefined
    ? normalizeIntents(patch.selectedIntents)
    : normalizeIntents(existingRow?.selected_intents);

  const payload = {
    user_id: userId,
    current_step: normalizeOnboardingStep(patch.currentStep || existingRow?.current_step || 'intent'),
    flow_version: Number(patch.flowVersion || existingRow?.flow_version || ONBOARDING_FLOW_VERSION) || ONBOARDING_FLOW_VERSION,
    selected_intents: selectedIntents,
    draft: deepMergeDraft(existingDraft, patchDraft),
    started_at: existingRow?.started_at || new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_onboarding_state')
    .upsert(payload, { onConflict: 'user_id', ignoreDuplicates: false })
    .select('*')
    .maybeSingle();

  return { row: data || null, error: error || null };
};

const buildValidationErrors = (missingRequiredFields) => {
  const stepByField = {
    purpose: 'intent',
    name: 'identity',
    phone: 'identity',
    country: 'identity',
    city: 'identity',
    currency_preference: 'identity',
    interests: 'preferences',
    business_name: 'role_setup',
    industry: 'role_setup',
    experienceYears: 'role_setup',
    channelType: 'role_setup',
    goals: 'role_setup'
  };

  const messageByField = {
    purpose: 'Select at least one intent to continue.',
    name: 'Name is required.',
    phone: 'Valid phone number is required.',
    country: 'Country is required.',
    city: 'City is required.',
    currency_preference: 'Currency preference is required.',
    interests: 'Select at least one interest.',
    business_name: 'Business name is required for seller intent.',
    industry: 'Industry is required for seller/provider intents.',
    experienceYears: 'Experience years is required for provider intent.',
    channelType: 'Channel type is required for affiliate intent.',
    goals: 'Goals are required for affiliate intent.'
  };

  return missingRequiredFields.map((field) => ({
    field,
    step: stepByField[field] || 'review',
    message: messageByField[field] || 'This field is required.'
  }));
};

const derivePatchesFromOnboardingInput = ({ selectedIntents, draft }) => {
  const normalizedDraft = normalizeJsonObject(draft);
  const identity = normalizeJsonObject(normalizedDraft.identity);
  const preferences = normalizeJsonObject(normalizedDraft.preferences);
  const roleSetup = normalizeJsonObject(normalizedDraft.roleSetup);

  const userPatch = {};
  const profilePatch = {};

  if (identity.name !== undefined) userPatch.name = toNullableText(identity.name);
  if (identity.phone !== undefined) userPatch.phone = identity.phone;
  if (identity.avatarUrl !== undefined) userPatch.avatar_url = toNullableText(identity.avatarUrl);

  if (identity.country !== undefined) profilePatch.country = toNullableText(identity.country);
  if (identity.city !== undefined) profilePatch.city = toNullableText(identity.city);
  if (identity.currencyPreference !== undefined || identity.currency_preference !== undefined) {
    profilePatch.currency_preference = toNullableText(identity.currencyPreference ?? identity.currency_preference);
  }

  if (preferences.interests !== undefined) {
    profilePatch.interests = normalizeJsonArray(preferences.interests);
  }

  if (roleSetup.about !== undefined) profilePatch.about = toNullableText(roleSetup.about);
  if (roleSetup.businessName !== undefined) profilePatch.business_name = toNullableText(roleSetup.businessName);
  if (roleSetup.businessDescription !== undefined) {
    profilePatch.business_description = toNullableText(roleSetup.businessDescription);
  }

  const intents = normalizeIntents(selectedIntents);
  if (intents.length > 0) {
    profilePatch.purpose = intentsToPurpose(intents);
  }

  return { userPatch, profilePatch };
};

const buildUnifiedProfileResponse = async ({ user, profile, onboardingStateRow }) => {
  let onboardingState = onboardingStateRow;
  if (!onboardingState) {
    const stateLookup = await loadOnboardingStateRow(user.id);
    onboardingState = stateLookup.row;
  }

  let isAdmin = false;
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'super_admin') {
    isAdmin = true;
  } else {
    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (adminError) throw adminError;
    if (adminRow) isAdmin = true;
  }

  const { data: personas, error: personasError } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (personasError) throw personasError;

  const completionSnapshot = computeProfileCompletion({ user, profile, onboardingState });
  const completion = PROFILE_ONBOARDING_V2_ENABLED
    ? completionSnapshot
    : {
        ...completionSnapshot,
        isComplete: true,
        missingRequiredFields: [],
        nextStep: 'completed'
      };
  const activePersona = (personas || []).find((persona) => persona.status === 'active') || (personas || [])[0] || null;

  return {
    user: {
      ...user,
      is_admin: isAdmin,
      isAdmin
    },
    profile,
    personas: personas || [],
    activePersona,
    completion: completionToResponse(completion),
    featureFlags: FEATURE_FLAGS,
    onboardingState: PROFILE_ONBOARDING_V2_ENABLED ? mapOnboardingStateRow(onboardingState) : null
  };
};

const getUserContext = async (req) => {
  const firebaseUid = getRequestFirebaseUid(req);
  if (!firebaseUid) {
    return { error: new Error('Authenticated firebase uid is required.') };
  }

  const hints = {
    email: req.user?.email || req.body?.email,
    name: req.user?.name || req.body?.name,
    avatar_url: req.user?.picture || req.body?.avatar_url,
    phone: req.user?.phone_number || req.body?.phone
  };

  const ensuredUser = await ensureUserRow(firebaseUid, hints);
  if (ensuredUser.error || !ensuredUser.user) {
    return { error: ensuredUser.error || new Error('Unable to resolve user record.') };
  }

  const ensuredProfile = await ensureUserProfileRow(ensuredUser.user.id);
  if (ensuredProfile.error || !ensuredProfile.profile) {
    return { error: ensuredProfile.error || new Error('Unable to resolve profile record.') };
  }

  return {
    firebaseUid,
    user: ensuredUser.user,
    profile: ensuredProfile.profile
  };
};

const resolveOptionalUserContext = async (req) => {
  hydrateRequestUserFromFirebaseUid(req);
  const firebaseUid = getRequestFirebaseUid(req);
  if (!firebaseUid) return null;

  try {
    const context = await getUserContext(req);
    if (context?.error) {
      console.warn('Optional user context resolution failed:', context.error?.message || context.error);
      return null;
    }
    return context;
  } catch (error) {
    console.warn('Optional user context resolution threw:', error?.message || error);
    return null;
  }
};

const resolveBrandBySlug = async (slugValue) => {
  const slug = slugifyPathSegment(slugValue);
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const resolveCatalogNodeByPath = async (brandId, pathValue) => {
  const normalizedPath = String(pathValue || '')
    .split('/')
    .map((entry) => slugifyPathSegment(entry))
    .filter(Boolean)
    .join('/');
  if (!normalizedPath) return null;
  const { data, error } = await supabase
    .from('brand_catalog_nodes')
    .select('*')
    .eq('brand_id', brandId)
    .eq('path', normalizedPath)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const buildBrandCatalogTree = (rows = []) => {
  const nodeMap = new Map();
  const rootNodes = [];

  rows.forEach((row) => {
    if (!row?.id) return;
    nodeMap.set(String(row.id), { ...row, children: [] });
  });

  nodeMap.forEach((node) => {
    const parentId = node.parent_node_id ? String(node.parent_node_id) : '';
    if (!parentId || !nodeMap.has(parentId)) {
      rootNodes.push(node);
      return;
    }
    nodeMap.get(parentId).children.push(node);
  });

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => {
      const byOrder = Number(left.sort_order || 0) - Number(right.sort_order || 0);
      if (byOrder !== 0) return byOrder;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
    nodes.forEach((entry) => sortNodes(entry.children || []));
  };

  sortNodes(rootNodes);
  return rootNodes;
};

const pickListingPrice = (row = {}) => {
  const candidates = [
    row.sale_price,
    row.rental_price,
    row.auction_start_price,
    row.auction_reserve_price
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const computePriceSummary = (rows = []) => {
  const prices = rows
    .map((row) => pickListingPrice(row))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (prices.length === 0) return null;
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  const min = prices[0];
  const max = prices[prices.length - 1];
  const currencySource = rows.find((row) => row?.currency)?.currency;
  const currency = String(currencySource || 'USD');
  const dealBandLow = Math.max(0, median * 0.9);
  const dealBandHigh = median * 1.1;

  return {
    min: Number(min.toFixed(2)),
    median: Number(median.toFixed(2)),
    max: Number(max.toFixed(2)),
    sampleSize: prices.length,
    currency,
    dealBandLow: Number(dealBandLow.toFixed(2)),
    dealBandHigh: Number(dealBandHigh.toFixed(2))
  };
};

const loadBrandPriceSummary = async (brandId, nodeId = null) => {
  if (!brandId) return null;
  let query = supabase
    .from('items')
    .select('currency,sale_price,rental_price,auction_start_price,auction_reserve_price')
    .eq('brand_id', brandId)
    .eq('status', 'published')
    .limit(5000);
  if (nodeId) {
    query = query.eq('brand_catalog_node_id', nodeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return computePriceSummary(data || []);
};

const resolveAdminContext = async (req) => {
  const context = await getUserContext(req);
  if (context.error) return context;

  const role = String(context.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'super_admin') {
    return { ...context, isAdmin: true };
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', context.user.id)
    .limit(1)
    .maybeSingle();

  if (error) return { error };
  if (!data) return { error: new Error('Admin access is required.') };
  return { ...context, isAdmin: true };
};

const upsertProviderPersonaForUser = async (userRow, status = 'pending', extra = {}) => {
  if (!userRow?.id) return null;
  const personaId = `provider-${userRow.id}`;
  const capabilities = status === 'active'
    ? createActiveProviderCapabilities()
    : createPendingProviderCapabilities();
  const now = new Date().toISOString();

  const payload = {
    id: personaId,
    user_id: userRow.id,
    firebase_uid: userRow.firebase_uid || null,
    type: 'provider',
    status,
    display_name: extra.displayName || userRow.name || 'Provider',
    avatar_url: extra.avatarUrl || userRow.avatar_url || '/icons/urbanprime.svg',
    handle: extra.handle || null,
    bio: extra.bio || null,
    settings: normalizeJsonObject(extra.settings),
    verification: normalizeJsonObject(extra.verification),
    capabilities,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabase
    .from('personas')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const ensureItemOwnedByUser = async (itemId, userId) => {
  if (!itemId || !userId) return { allowed: false, item: null };
  const { data, error } = await supabase
    .from('items')
    .select('id,seller_id,brand,metadata,title,category_id')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { allowed: false, item: null };
  return { allowed: String(data.seller_id || '') === String(userId || ''), item: data };
};

const loadBrandTrustMap = async (brandIds = []) => {
  const ids = Array.from(new Set(brandIds.map((entry) => String(entry || '').trim()).filter(Boolean)));
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('brand_trust_signals')
    .select('*')
    .in('brand_id', ids);
  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => map.set(String(row.brand_id), row));
  return map;
};

const loadBrandStatsMap = async (brandIds = []) => {
  const ids = Array.from(new Set(brandIds.map((entry) => String(entry || '').trim()).filter(Boolean)));
  const map = new Map(ids.map((id) => [id, { itemCount: 0, storeCount: 0, followerCount: 0 }]));
  if (ids.length === 0) return map;

  const [itemsResult, followersResult] = await Promise.all([
    supabase
      .from('items')
      .select('brand_id,store_id,seller_id')
      .in('brand_id', ids)
      .limit(10000),
    supabase
      .from('brand_followers')
      .select('brand_id,user_id')
      .in('brand_id', ids)
      .limit(10000)
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (followersResult.error) throw followersResult.error;

  const storeSets = new Map(ids.map((id) => [id, new Set()]));
  (itemsResult.data || []).forEach((row) => {
    const brandId = String(row.brand_id || '');
    if (!brandId || !map.has(brandId)) return;
    const current = map.get(brandId);
    current.itemCount += 1;
    const storeKey = row.store_id || row.seller_id;
    if (storeKey) storeSets.get(brandId).add(String(storeKey));
  });

  (followersResult.data || []).forEach((row) => {
    const brandId = String(row.brand_id || '');
    if (!brandId || !map.has(brandId)) return;
    map.get(brandId).followerCount += 1;
  });

  storeSets.forEach((set, brandId) => {
    if (!map.has(brandId)) return;
    map.get(brandId).storeCount = set.size;
  });

  return map;
};

const ensurePersonaHandleAvailable = async (handle, ignorePersonaId = null) => {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return { handle: null, error: null };

  let query = supabase
    .from('personas')
    .select('id')
    .eq('handle', normalizedHandle)
    .limit(1);

  if (ignorePersonaId) query = query.neq('id', ignorePersonaId);
  const { data, error } = await query.maybeSingle();
  if (error) return { handle: normalizedHandle, error };
  if (data) {
    return { handle: normalizedHandle, error: new Error(`Handle "${normalizedHandle}" is already taken.`) };
  }
  return { handle: normalizedHandle, error: null };
};

const bootstrapPersonasFromIntents = async ({ user, firebaseUid, selectedIntents, roleSetup }) => {
  const intents = normalizeIntents(selectedIntents);
  const roleSetupDraft = normalizeJsonObject(roleSetup);

  const typesToEnsure = new Set(['consumer']);
  if (intents.includes('sell')) typesToEnsure.add('seller');
  if (intents.includes('provide')) typesToEnsure.add('provider');
  if (intents.includes('affiliate')) typesToEnsure.add('affiliate');

  const { data: existingRows, error: existingError } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (existingError) throw existingError;

  const existingByType = new Map((existingRows || []).map((row) => [row.type, row]));
  const ensuredRows = [];

  for (const type of typesToEnsure) {
    const existing = existingByType.get(type);

    const candidateHandle = normalizeHandle(
      roleSetupDraft?.handles?.[type]
      || roleSetupDraft?.[`${type}Handle`]
      || roleSetupDraft?.handle
    );

    const handleCheck = await ensurePersonaHandleAvailable(candidateHandle, existing?.id || null);
    if (handleCheck.error) throw handleCheck.error;

    const displayName = toNullableText(
      type === 'consumer'
        ? roleSetupDraft.displayName || user.name
        : roleSetupDraft.businessName || roleSetupDraft.displayName || `${user.name || 'User'} ${type}`
    ) || `${user.name || 'User'} ${type}`;

    const mergedSettings = {
      ...(normalizeJsonObject(existing?.settings)),
      onboarding: {
        intents,
        roleSetup: roleSetupDraft,
        flowVersion: ONBOARDING_FLOW_VERSION,
        updatedAt: new Date().toISOString()
      }
    };

    const commonPayload = {
      user_id: user.id,
      firebase_uid: firebaseUid,
      type,
      status: 'active',
      display_name: displayName,
      avatar_url: user.avatar_url || null,
      bio: toNullableText(roleSetupDraft.about) || existing?.bio || null,
      capabilities: buildPersonaCapabilities(type, user.role),
      settings: mergedSettings
    };

    if (handleCheck.handle) {
      commonPayload.handle = handleCheck.handle;
    }

    let savedRow = null;
    if (existing) {
      const { data, error } = await supabase
        .from('personas')
        .update(commonPayload)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      savedRow = data || existing;
    } else {
      const { data, error } = await supabase
        .from('personas')
        .insert({ id: randomUUID(), ...commonPayload })
        .select('*')
        .maybeSingle();
      if (error) throw error;
      savedRow = data;
    }

    if (savedRow) ensuredRows.push(savedRow);
  }

  return ensuredRows;
};

const normalizeRelativePath = (fullPath) => fullPath.replace(uploadsRoot, '').replace(/^[\\/]+/, '').replace(/\\/g, '/');
const resolveUploadPublicUrl = (row) => {
  if (!row) return '';
  if (row.storage_driver === 'cloudinary') {
    return String(row.storage_path || '').trim();
  }
  return `/uploads/${row.storage_path}`;
};

const uploadToCloudinary = async ({
  base64Data,
  mimeType,
  fileName,
  assetType,
  userId,
  uploadId
}) => {
  if (!CLOUDINARY_ENABLED) return null;

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;
  const folder = [CLOUDINARY_FOLDER_PREFIX, sanitizeBaseName(assetType || 'generic'), userId].filter(Boolean).join('/');
  const publicId = `${sanitizeBaseName(fileName || 'asset')}-${uploadId}`;
  const form = new FormData();
  form.append('file', `data:${mimeType};base64,${base64Data}`);
  form.append('upload_preset', CLOUDINARY_PRESET);
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('resource_type', 'auto');

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url) {
    const message = payload?.error?.message || `Cloudinary upload failed with status ${response.status}`;
    throw new Error(message);
  }

  let deliveryUrl = String(payload.secure_url || '').trim();
  if (CLOUDINARY_PUBLIC_BASE && payload.public_id && payload.format && payload.resource_type) {
    deliveryUrl = `${CLOUDINARY_PUBLIC_BASE}/${payload.resource_type}/upload/v${payload.version}/${payload.public_id}.${payload.format}`;
  }

  return {
    storageDriver: 'cloudinary',
    storagePath: deliveryUrl,
    publicUrl: deliveryUrl
  };
};

const hashPushToken = (token) => createHash('sha256').update(String(token || '')).digest('hex');

const isPushTokenLikelyValid = (token) => {
  const value = String(token || '').trim();
  return value.length >= 80 && value.length <= 4096;
};

const pushCollectionForUser = (userId) => `push_tokens:${String(userId || '').trim()}`;

const resolvePushOpenLink = (rawLink) => {
  const fallbackHashPath = '/#/profile/messages';
  const value = String(rawLink || '').trim();
  if (!value) {
    return APP_PUBLIC_URL_NORMALIZED ? `${APP_PUBLIC_URL_NORMALIZED}${fallbackHashPath}` : fallbackHashPath;
  }

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/#/')) {
    return APP_PUBLIC_URL_NORMALIZED ? `${APP_PUBLIC_URL_NORMALIZED}${value}` : value;
  }
  if (value.startsWith('#/')) {
    const normalizedHashPath = `/${value}`;
    return APP_PUBLIC_URL_NORMALIZED ? `${APP_PUBLIC_URL_NORMALIZED}${normalizedHashPath}` : normalizedHashPath;
  }

  const pathPart = value.startsWith('/') ? value : `/${value}`;
  if (APP_PUBLIC_URL_NORMALIZED) {
    return `${APP_PUBLIC_URL_NORMALIZED}#${pathPart}`;
  }
  return `/#${pathPart}`;
};

const listPushTokenDocsForUser = async (userId) => {
  const collectionKey = pushCollectionForUser(userId);
  if (!collectionKey) return [];

  const { data, error } = await supabase
    .from('mirror_documents')
    .select('doc_id,data')
    .eq('collection', collectionKey)
    .limit(200);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => ({
      docId: String(row?.doc_id || ''),
      token: String(row?.data?.token || '')
    }))
    .filter((row) => row.docId && row.token);
};

const removePushTokenDocsById = async (userId, docIds = []) => {
  const ids = Array.from(new Set(docIds.map((entry) => String(entry || '')).filter(Boolean)));
  if (!userId || ids.length === 0) return;
  const collectionKey = pushCollectionForUser(userId);
  await supabase
    .from('mirror_documents')
    .delete()
    .eq('collection', collectionKey)
    .in('doc_id', ids);
};

const sendPushToUser = async ({
  recipientUserId,
  title,
  body,
  link,
  threadId,
  senderFirebaseUid
}) => {
  if (!PUSH_NOTIFICATIONS_ACTIVE || !firebaseApp || !recipientUserId) {
    return { sentCount: 0, attemptedCount: 0 };
  }

  const tokenDocs = await listPushTokenDocsForUser(recipientUserId);
  if (tokenDocs.length === 0) {
    return { sentCount: 0, attemptedCount: 0 };
  }

  const pushLink = resolvePushOpenLink(link || (threadId ? `/profile/messages/${threadId}` : '/profile/messages'));
  const messageTitle = String(title || 'Urban Prime');
  const messageBody = String(body || 'New message');
  const sendPayload = {
    tokens: tokenDocs.map((entry) => entry.token),
    notification: {
      title: messageTitle,
      body: messageBody
    },
    data: {
      type: 'chat_message',
      title: messageTitle,
      body: messageBody,
      link: pushLink,
      threadId: String(threadId || ''),
      senderId: String(senderFirebaseUid || '')
    },
    webpush: {
      fcmOptions: {
        link: pushLink
      },
      notification: {
        title: messageTitle,
        body: messageBody,
        icon: PUSH_NOTIFICATION_ICON,
        badge: PUSH_NOTIFICATION_BADGE,
        tag: threadId ? `chat-thread-${threadId}` : 'chat-message',
        renotify: true,
        actions: [
          { action: 'reply', title: 'Reply' },
          { action: 'mark_read', title: 'Mark read' },
          { action: 'react', title: 'React +1' }
        ]
      }
    }
  };

  const multicastResult = await admin.messaging().sendEachForMulticast(sendPayload);
  const invalidDocIds = [];
  multicastResult.responses.forEach((response, index) => {
    if (response.success) return;
    const code = String(response.error?.code || '');
    if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
      const doc = tokenDocs[index];
      if (doc?.docId) invalidDocIds.push(doc.docId);
    }
  });

  if (invalidDocIds.length > 0) {
    await removePushTokenDocsById(recipientUserId, invalidDocIds);
  }

  return { sentCount: multicastResult.successCount || 0, attemptedCount: tokenDocs.length };
};

const CHAT_CALL_COLLECTION_PREFIX = 'chat_calls:';
const CHAT_PRESENCE_COLLECTION = 'chat_presence';
const CHAT_PRESENCE_ONLINE_TTL_MS = parsePort(process.env.CHAT_PRESENCE_ONLINE_TTL_MS ?? '45000', 45000);

const callCollectionForThread = (threadId) => `${CHAT_CALL_COLLECTION_PREFIX}${String(threadId || '').trim()}`;

const isActiveCallStatus = (value) => ['ringing', 'accepted'].includes(String(value || '').toLowerCase());

const normalizeCallMode = (value) => (String(value || '').toLowerCase() === 'video' ? 'video' : 'voice');

const normalizeCallAction = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['accept', 'decline', 'silent'].includes(normalized)) return normalized;
  return '';
};

const mapCallDocumentRow = (row, firebaseUidByUserId = new Map()) => {
  if (!row) return null;
  const data = normalizeJsonObject(row.data);
  const threadId = String(data.thread_id || data.threadId || row.collection?.replace(CHAT_CALL_COLLECTION_PREFIX, '') || '').trim();
  const initiatorUserId = String(data.initiator_user_id || data.initiatorId || '').trim();
  const receiverUserId = String(data.receiver_user_id || data.receiverId || '').trim();
  const acceptedByUserId = String(data.accepted_by_user_id || data.acceptedById || '').trim();
  const silentByUserIds = (Array.isArray(data.silent_by_user_ids) ? data.silent_by_user_ids : data.silentByIds || [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  const status = String(data.status || 'ringing').toLowerCase();

  return {
    id: String(row.doc_id || data.id || ''),
    thread_id: threadId,
    room_name: String(data.room_name || data.roomName || `urbanprime-${threadId}`),
    mode: normalizeCallMode(data.mode),
    status: ['ringing', 'accepted', 'declined', 'ended', 'missed'].includes(status) ? status : 'ringing',
    initiator_user_id: initiatorUserId || null,
    receiver_user_id: receiverUserId || null,
    accepted_by_user_id: acceptedByUserId || null,
    silent_by_user_ids: Array.from(new Set(silentByUserIds)),
    reason: toNullableText(data.reason || data.end_reason || data.endReason),
    started_at: data.started_at || data.startedAt || row.updated_at || new Date().toISOString(),
    ended_at: data.ended_at || data.endedAt || null,
    updated_at: data.updated_at || data.updatedAt || row.updated_at || new Date().toISOString(),
    initiator_firebase_uid: initiatorUserId ? (firebaseUidByUserId.get(initiatorUserId) || null) : null,
    receiver_firebase_uid: receiverUserId ? (firebaseUidByUserId.get(receiverUserId) || null) : null,
    accepted_by_firebase_uid: acceptedByUserId ? (firebaseUidByUserId.get(acceptedByUserId) || null) : null
  };
};

const buildFirebaseUidMap = async (userIds = []) => {
  const ids = Array.from(new Set(userIds.map((entry) => String(entry || '').trim()).filter(Boolean)));
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid')
    .in('id', ids);
  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => {
    if (!row?.id) return;
    map.set(String(row.id), String(row.firebase_uid || row.id));
  });
  return map;
};

const getThreadParticipantContext = async (threadId, currentUserId) => {
  const { data: threadRow, error: threadError } = await supabase
    .from('chat_threads')
    .select('id,buyer_id,seller_id')
    .eq('id', threadId)
    .maybeSingle();

  if (threadError) {
    return { error: threadError };
  }
  if (!threadRow) {
    return { error: new Error('Conversation not found.') };
  }
  const participants = [String(threadRow.buyer_id || ''), String(threadRow.seller_id || '')].filter(Boolean);
  if (!participants.includes(currentUserId)) {
    return { error: new Error('You are not a participant in this conversation.') };
  }
  const receiverUserId = participants.find((id) => id !== currentUserId) || null;
  return { threadRow, participants, receiverUserId };
};

const loadCallDocument = async (callId) => {
  const { data, error } = await supabase
    .from('mirror_documents')
    .select('collection,doc_id,data,updated_at')
    .eq('doc_id', callId)
    .like('collection', `${CHAT_CALL_COLLECTION_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { row: data || null, error: error || null };
};

const isLocalDevelopmentRequest = (req) => {
  const clientIp = String(req.ip || req.socket?.remoteAddress || '').trim().toLowerCase();
  const origin = normalizeOrigin(req.headers.origin || req.headers.referer || '');
  const hostOrigin = getRequestOrigin(req);

  return ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].some((value) =>
    clientIp.includes(value) || origin.includes(value) || hostOrigin.includes(value)
  );
};

const createRateLimiter = ({ windowMs, maxRequests, namespace, skip }) => {
  const hitMap = new Map();

  // Cleanup stale entries to keep memory bounded.
  const sweepInterval = Math.max(windowMs, 10_000);
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hitMap.entries()) {
      if (value.resetAt <= now) {
        hitMap.delete(key);
      }
    }
  }, sweepInterval).unref?.();

  return (req, res, next) => {
    if (!RATE_LIMITING_ENABLED || (typeof skip === 'function' && skip(req))) {
      return next();
    }

    const now = Date.now();
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const hintedFirebaseUid = String(req.headers['x-firebase-uid'] || '').trim();
    const key = `${namespace}:${hintedFirebaseUid || clientIp}`;
    const current = hitMap.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      hitMap.set(key, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(maxRequests - 1, 0)));
      res.setHeader('X-RateLimit-Reset', new Date(resetAt).toISOString());
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(current.resetAt).toISOString());
      return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
    }

    current.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(maxRequests - current.count, 0)));
    res.setHeader('X-RateLimit-Reset', new Date(current.resetAt).toISOString());
    return next();
  };
};

const globalRateLimiter = createRateLimiter({
  windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  maxRequests: GLOBAL_RATE_LIMIT_MAX,
  namespace: 'global',
  skip: (req) => isLocalDevelopmentRequest(req) || req.path === '/health' || req.path.startsWith('/uploads/')
});

const strictAuthRateLimiter = createRateLimiter({
  windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS,
  namespace: 'auth',
  skip: isLocalDevelopmentRequest
});

app.use(globalRateLimiter);

const verifyWhatsAppWebhookSignature = (req) => {
  if (!WHATSAPP_APP_SECRET) return true;
  const signature = String(req.headers['x-hub-signature-256'] || '').trim();
  if (!signature.startsWith('sha256=')) return false;
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = `sha256=${createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBody).digest('hex')}`;
  return secureCompare(signature, expected);
};

app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge || ''));
  }
  return res.status(403).send('Forbidden');
});

app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    if (!verifyWhatsAppWebhookSignature(req)) {
      return res.status(403).json({ error: 'Invalid webhook signature.' });
    }

    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = normalizeJsonObject(change?.value);
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const statusEvent of statuses) {
          const providerMessageId = String(statusEvent?.id || '').trim();
          const status = String(statusEvent?.status || '').trim().toLowerCase() || 'unknown';
          let outboxId = null;
          if (providerMessageId) {
            try {
              const { data: outboxRow } = await supabase
                .from('message_outbox')
                .select('id')
                .eq('provider_message_id', providerMessageId)
                .maybeSingle();
              outboxId = outboxRow?.id || null;
              if (outboxId) {
                await updateMessageOutbox(outboxId, {
                  status,
                  last_error: status === 'failed' ? JSON.stringify(statusEvent?.errors || statusEvent?.error || {}) : null
                });
              }
            } catch (error) {
              console.warn('WhatsApp webhook outbox lookup skipped:', error?.message || error);
            }
          }
          await recordMessageDelivery({
            outboxId,
            providerMessageId,
            status,
            rawEvent: statusEvent
          });
        }

        const inboundMessages = Array.isArray(value.messages) ? value.messages : [];
        for (const message of inboundMessages) {
          const fromPhone = normalizePhone(message?.from);
          const body = String(message?.text?.body || message?.button?.text || '').trim();
          const command = body.toUpperCase();
          if (!fromPhone || !command) continue;
          if (['STOP', 'UNSUBSCRIBE', 'CANCEL'].includes(command)) {
            try {
              const { data: consentRows } = await supabase
                .from('message_consents')
                .select('user_id,category')
                .eq('channel', 'whatsapp')
                .eq('phone_e164', fromPhone);
              for (const row of consentRows || []) {
                await upsertMessagePreference({
                  userId: row.user_id,
                  phone: fromPhone,
                  category: row.category,
                  enabled: false,
                  source: 'whatsapp_stop'
                });
              }
              await sendWhatsAppText({
                to: fromPhone,
                text: 'You have been unsubscribed from Urban Prime WhatsApp messages. Reply HELP for support options.',
                eventType: 'whatsapp_opt_out'
              }).catch(() => null);
            } catch (error) {
              console.warn('WhatsApp STOP handling failed:', error?.message || error);
            }
          } else if (command === 'HELP') {
            await sendWhatsAppText({
              to: fromPhone,
              text: `Urban Prime support: ${resolveSupportEmail()}. You can also manage notification settings in your Urban Prime profile.`,
              eventType: 'whatsapp_help'
            }).catch(() => null);
          }
        }
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('WhatsApp webhook failed:', error);
    return res.status(500).json({ error: 'Unable to process WhatsApp webhook.' });
  }
});

const requestPasswordResetPin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isEmailAddress(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!firebaseApp) {
      return res.status(503).json({ error: 'Password reset requires Firebase Admin credentials on the backend.' });
    }
    if (!isPasswordResetEmailConfigured() && !PASSWORD_RESET_DEBUG_PIN_ENABLED) {
      return res.status(501).json({ error: 'Reset PIN email delivery is not configured.' });
    }

    let firebaseUser = null;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      const code = String(error?.code || '');
      if (code !== 'auth/user-not-found') throw error;
    }

    if (!firebaseUser?.uid) {
      return res.json({ ok: true, expiresInSeconds: Math.round(PASSWORD_RESET_TTL_MS / 1000) });
    }

    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString();
    const payload = {
      email,
      uid: firebaseUser.uid,
      pin_hash: hashPasswordResetPin({ email, uid: firebaseUser.uid, pin, salt }),
      salt,
      attempts: 0,
      created_at: now.toISOString(),
      expires_at: expiresAt
    };

    const { error } = await supabase.from('mirror_documents').upsert({
      collection: PASSWORD_RESET_COLLECTION,
      doc_id: passwordResetDocId(email),
      data: payload,
      updated_at: now.toISOString()
    }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });
    if (error) throw error;

    if (isPasswordResetEmailConfigured()) {
      try {
        await sendPasswordResetPinEmail({
          email,
          pin,
          expiresInMinutes: Math.max(1, Math.round(PASSWORD_RESET_TTL_MS / 60000))
        });
      } catch (mailError) {
        await supabase.from('mirror_documents').delete().eq('collection', PASSWORD_RESET_COLLECTION).eq('doc_id', passwordResetDocId(email));
        throw mailError;
      }
    } else if (PASSWORD_RESET_DEBUG_PIN_ENABLED) {
      console.info(`Password reset PIN for ${email}: ${pin}`);
    }

    return res.json({
      ok: true,
      delivery: isPasswordResetEmailConfigured() ? 'email' : 'debug',
      ...(PASSWORD_RESET_DEBUG_PIN_ENABLED && !isPasswordResetEmailConfigured() ? { pin } : {}),
      expiresInSeconds: Math.round(PASSWORD_RESET_TTL_MS / 1000)
    });
  } catch (error) {
    console.error('Password reset PIN request failed:', error);
    return res.status(500).json({ error: 'Unable to create password reset PIN.' });
  }
};

app.post('/auth/password-reset/request', strictAuthRateLimiter, requestPasswordResetPin);
app.post('/api/auth/password-reset/request', strictAuthRateLimiter, requestPasswordResetPin);

const confirmPasswordResetPin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const pin = normalizePin(req.body?.pin);
    const newPassword = String(req.body?.password || req.body?.newPassword || '');

    if (!isEmailAddress(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (pin.length !== 6) {
      return res.status(400).json({ error: 'Enter the 6-digit reset PIN.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!firebaseApp) {
      return res.status(503).json({ error: 'Password reset requires Firebase Admin credentials on the backend.' });
    }

    const docId = passwordResetDocId(email);
    const { data: row, error: loadError } = await supabase
      .from('mirror_documents')
      .select('data,updated_at')
      .eq('collection', PASSWORD_RESET_COLLECTION)
      .eq('doc_id', docId)
      .maybeSingle();
    if (loadError) throw loadError;

    const data = normalizeJsonObject(row?.data);
    const genericError = 'Invalid or expired reset PIN.';
    if (!row || data.email !== email || !data.uid || !data.pin_hash || !data.salt) {
      return res.status(400).json({ error: genericError });
    }
    if (Date.parse(String(data.expires_at || '')) <= Date.now()) {
      await supabase.from('mirror_documents').delete().eq('collection', PASSWORD_RESET_COLLECTION).eq('doc_id', docId);
      return res.status(400).json({ error: genericError });
    }
    if (Number(data.attempts || 0) >= 5) {
      await supabase.from('mirror_documents').delete().eq('collection', PASSWORD_RESET_COLLECTION).eq('doc_id', docId);
      return res.status(400).json({ error: genericError });
    }

    const expectedHash = hashPasswordResetPin({ email, uid: data.uid, pin, salt: data.salt });
    if (!safeEqualHash(expectedHash, data.pin_hash)) {
      const attempts = Number(data.attempts || 0) + 1;
      await supabase.from('mirror_documents').upsert({
        collection: PASSWORD_RESET_COLLECTION,
        doc_id: docId,
        data: { ...data, attempts, last_failed_at: new Date().toISOString() },
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });
      return res.status(400).json({ error: genericError });
    }

    await admin.auth().updateUser(data.uid, { password: newPassword });
    await supabase.from('mirror_documents').delete().eq('collection', PASSWORD_RESET_COLLECTION).eq('doc_id', docId);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Password reset PIN confirmation failed:', error);
    return res.status(500).json({ error: 'Unable to reset password.' });
  }
};

app.post('/auth/password-reset/confirm', strictAuthRateLimiter, confirmPasswordResetPin);
app.post('/api/auth/password-reset/confirm', strictAuthRateLimiter, confirmPasswordResetPin);

const savePhonePin = async ({ phone, purpose, name }) => {
  const normalizedPhone = normalizePhone(phone);
  const pin = generateResetPin();
  const salt = randomUUID();
  const now = new Date();
  const payload = {
    phone: normalizedPhone,
    purpose,
    name: toNullableText(name),
    pin_hash: hashPhonePin({ phone: normalizedPhone, purpose, pin, salt }),
    salt,
    attempts: 0,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + PHONE_AUTH_TTL_MS).toISOString()
  };

  const { error } = await supabase.from('mirror_documents').upsert({
    collection: PHONE_AUTH_PIN_COLLECTION,
    doc_id: phonePinDocId({ phone: normalizedPhone, purpose }),
    data: payload,
    updated_at: now.toISOString()
  }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });
  if (error) throw error;
  return { pin };
};

const loadPhoneAccount = async (phone) => {
  const { data, error } = await supabase
    .from('mirror_documents')
    .select('data,updated_at')
    .eq('collection', PHONE_AUTH_ACCOUNT_COLLECTION)
    .eq('doc_id', phoneAccountDocId(phone))
    .maybeSingle();
  if (error) throw error;
  return normalizeJsonObject(data?.data);
};

const verifyPhonePin = async ({ phone, purpose, pin }) => {
  const normalizedPhone = normalizePhone(phone);
  const docId = phonePinDocId({ phone: normalizedPhone, purpose });
  const { data: row, error } = await supabase
    .from('mirror_documents')
    .select('data,updated_at')
    .eq('collection', PHONE_AUTH_PIN_COLLECTION)
    .eq('doc_id', docId)
    .maybeSingle();
  if (error) throw error;

  const data = normalizeJsonObject(row?.data);
  const genericError = new Error('Invalid or expired phone PIN.');
  genericError.statusCode = 400;
  if (!row || data.phone !== normalizedPhone || data.purpose !== purpose || !data.pin_hash || !data.salt) throw genericError;
  if (Date.parse(String(data.expires_at || '')) <= Date.now()) {
    await supabase.from('mirror_documents').delete().eq('collection', PHONE_AUTH_PIN_COLLECTION).eq('doc_id', docId);
    throw genericError;
  }
  if (Number(data.attempts || 0) >= 5) {
    await supabase.from('mirror_documents').delete().eq('collection', PHONE_AUTH_PIN_COLLECTION).eq('doc_id', docId);
    throw genericError;
  }

  const expectedHash = hashPhonePin({ phone: normalizedPhone, purpose, pin, salt: data.salt });
  if (!safeEqualHash(expectedHash, data.pin_hash)) {
    const attempts = Number(data.attempts || 0) + 1;
    await supabase.from('mirror_documents').upsert({
      collection: PHONE_AUTH_PIN_COLLECTION,
      doc_id: docId,
      data: { ...data, attempts, last_failed_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });
    throw genericError;
  }

  await supabase.from('mirror_documents').delete().eq('collection', PHONE_AUTH_PIN_COLLECTION).eq('doc_id', docId);
  return data;
};

const requestPhoneSignupPin = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const name = toNullableText(req.body?.name);
    const password = String(req.body?.password || '');
    if (!phone) return res.status(400).json({ error: 'Enter a valid phone number with country code.' });
    if (!name) return res.status(400).json({ error: 'Enter your name.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!firebaseApp) return res.status(503).json({ error: 'Phone sign up requires Firebase Admin credentials.' });
    if (!isWhatsAppConfigured() && !PHONE_AUTH_DEBUG_PIN_ENABLED) {
      return res.status(503).json({ error: 'WhatsApp Business PIN delivery is not configured.' });
    }

    const existingAccount = await loadPhoneAccount(phone);
    if (existingAccount?.uid) return res.status(409).json({ error: 'This phone number is already registered.' });
    try {
      await admin.auth().getUserByPhoneNumber(phone);
      return res.status(409).json({ error: 'This phone number is already registered.' });
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    const { pin } = await savePhonePin({ phone, purpose: 'signup', name });
    if (isWhatsAppConfigured()) {
      await sendPhonePinWhatsApp({ phone, pin, purpose: 'signup', name });
    } else if (PHONE_AUTH_DEBUG_PIN_ENABLED) {
      console.info(`Phone sign-up PIN for ${phone}: ${pin}`);
    } else {
      throw new Error('WhatsApp Business PIN delivery is not configured.');
    }

    return res.json({
      ok: true,
      delivery: isWhatsAppConfigured() ? 'whatsapp' : 'debug',
      ...(PHONE_AUTH_DEBUG_PIN_ENABLED && !isWhatsAppConfigured() ? { pin } : {}),
      expiresInSeconds: Math.round(PHONE_AUTH_TTL_MS / 1000)
    });
  } catch (error) {
    console.error('Phone sign-up PIN request failed:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to send phone PIN.' });
  }
};

const confirmPhoneSignupPin = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const name = toNullableText(req.body?.name);
    const password = String(req.body?.password || '');
    const pin = normalizePin(req.body?.pin);
    if (!phone) return res.status(400).json({ error: 'Enter a valid phone number with country code.' });
    if (!name) return res.status(400).json({ error: 'Enter your name.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (pin.length !== 6) return res.status(400).json({ error: 'Enter the 6-digit phone PIN.' });
    if (!firebaseApp) return res.status(503).json({ error: 'Phone sign up requires Firebase Admin credentials.' });

    await verifyPhonePin({ phone, purpose: 'signup', pin });
    const userRecord = await admin.auth().createUser({ phoneNumber: phone, displayName: name, password });
    const passwordRecord = createPasswordHash({ phone, password });
    await supabase.from('mirror_documents').upsert({
      collection: PHONE_AUTH_ACCOUNT_COLLECTION,
      doc_id: phoneAccountDocId(phone),
      data: {
        uid: userRecord.uid,
        phone,
        name,
        password_hash: passwordRecord.hash,
        password_salt: passwordRecord.salt,
        password_iterations: passwordRecord.iterations,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

    const ensured = await ensureUserRow(userRecord.uid, { phone, name });
    if (ensured.error) console.warn('Phone user Supabase sync failed:', ensured.error);
    if (ensured.user?.id) {
      await ensureDefaultWhatsAppConsents({ userId: ensured.user.id, phone, source: 'phone_signup' });
    }
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    return res.json({ ok: true, customToken, user: { uid: userRecord.uid, phone, name } });
  } catch (error) {
    console.error('Phone sign-up PIN confirm failed:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to complete phone sign up.' });
  }
};

const requestPhoneLoginPin = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || '');
    if (!phone) return res.status(400).json({ error: 'Enter a valid phone number with country code.' });
    if (password.length < 6) return res.status(400).json({ error: 'Enter your password.' });
    if (!isWhatsAppConfigured() && !PHONE_AUTH_DEBUG_PIN_ENABLED) {
      return res.status(503).json({ error: 'WhatsApp Business PIN delivery is not configured.' });
    }

    const account = await loadPhoneAccount(phone);
    if (!account?.uid || !verifyPasswordHash({ phone, password, account })) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const { pin } = await savePhonePin({ phone, purpose: 'login', name: account.name });
    const userId = account?.uid ? await resolveUserIdFromFirebaseUid(account.uid) : null;
    if (userId) {
      await ensureDefaultWhatsAppConsents({ userId, phone, source: 'phone_login' });
    }
    if (isWhatsAppConfigured()) {
      await sendPhonePinWhatsApp({ phone, pin, purpose: 'login', userId, name: account.name });
    } else if (PHONE_AUTH_DEBUG_PIN_ENABLED) {
      console.info(`Phone sign-in PIN for ${phone}: ${pin}`);
    } else {
      throw new Error('WhatsApp Business PIN delivery is not configured.');
    }

    return res.json({
      ok: true,
      delivery: isWhatsAppConfigured() ? 'whatsapp' : 'debug',
      ...(PHONE_AUTH_DEBUG_PIN_ENABLED && !isWhatsAppConfigured() ? { pin } : {}),
      expiresInSeconds: Math.round(PHONE_AUTH_TTL_MS / 1000)
    });
  } catch (error) {
    console.error('Phone sign-in PIN request failed:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to send phone PIN.' });
  }
};

const confirmPhoneLoginPin = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const pin = normalizePin(req.body?.pin);
    if (!phone) return res.status(400).json({ error: 'Enter a valid phone number with country code.' });
    if (pin.length !== 6) return res.status(400).json({ error: 'Enter the 6-digit phone PIN.' });
    if (!firebaseApp) return res.status(503).json({ error: 'Phone sign in requires Firebase Admin credentials.' });

    await verifyPhonePin({ phone, purpose: 'login', pin });
    const account = await loadPhoneAccount(phone);
    if (!account?.uid) return res.status(401).json({ error: 'Invalid phone number or PIN.' });

    const customToken = await admin.auth().createCustomToken(account.uid);
    return res.json({ ok: true, customToken, user: { uid: account.uid, phone, name: account.name || '' } });
  } catch (error) {
    console.error('Phone sign-in PIN confirm failed:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to complete phone sign in.' });
  }
};

app.post('/auth/phone/signup/request', strictAuthRateLimiter, requestPhoneSignupPin);
app.post('/api/auth/phone/signup/request', strictAuthRateLimiter, requestPhoneSignupPin);
app.post('/auth/phone/signup/confirm', strictAuthRateLimiter, confirmPhoneSignupPin);
app.post('/api/auth/phone/signup/confirm', strictAuthRateLimiter, confirmPhoneSignupPin);
app.post('/auth/phone/login/request', strictAuthRateLimiter, requestPhoneLoginPin);
app.post('/api/auth/phone/login/request', strictAuthRateLimiter, requestPhoneLoginPin);
app.post('/auth/phone/login/confirm', strictAuthRateLimiter, confirmPhoneLoginPin);
app.post('/api/auth/phone/login/confirm', strictAuthRateLimiter, confirmPhoneLoginPin);

const resolveSupabaseOAuthName = (user) => {
  const metadata = normalizeJsonObject(user?.user_metadata);
  return String(
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    metadata.preferred_username ||
    user?.email ||
    'Urban Prime member'
  ).trim();
};

const resolveSupabaseOAuthAvatar = (user) => {
  const metadata = normalizeJsonObject(user?.user_metadata);
  return String(metadata.avatar_url || metadata.picture || metadata.photo_url || '').trim();
};

const upsertFirebaseCustomUser = async ({ uid, email, name, avatarUrl }) => {
  if (!firebaseApp) throw new Error('Firebase Admin is required for Supabase provider sign-in.');
  const basePayload = {
    displayName: name || undefined,
    photoURL: avatarUrl || undefined,
    disabled: false
  };
  const emailPayload = isEmailAddress(email) ? { ...basePayload, email, emailVerified: true } : basePayload;

  try {
    await admin.auth().getUser(uid);
    try {
      await admin.auth().updateUser(uid, emailPayload);
    } catch (error) {
      await admin.auth().updateUser(uid, basePayload);
    }
  } catch {
    try {
      await admin.auth().createUser({ uid, ...emailPayload });
    } catch (error) {
      await admin.auth().createUser({ uid, ...basePayload });
    }
  }
};

const exchangeSupabaseOAuthSession = async (req, res) => {
  try {
    const accessToken = String(req.body?.accessToken || req.body?.access_token || '').trim();
    if (!accessToken) return res.status(400).json({ error: 'Supabase access token is required.' });
    if (!firebaseApp) return res.status(503).json({ error: 'Firebase Admin is not configured.' });

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user?.id) {
      return res.status(401).json({ error: error?.message || 'Invalid Supabase session.' });
    }

    const supabaseUser = data.user;
    const firebaseUid = `supabase:${supabaseUser.id}`;
    const email = normalizeEmail(supabaseUser.email);
    const name = resolveSupabaseOAuthName(supabaseUser);
    const avatarUrl = resolveSupabaseOAuthAvatar(supabaseUser);
    const provider = String(supabaseUser.app_metadata?.provider || req.body?.provider || 'supabase').trim();

    await upsertFirebaseCustomUser({ uid: firebaseUid, email, name, avatarUrl });

    const payload = {
      firebase_uid: firebaseUid,
      email: email || null,
      name: name || 'Urban Prime member',
      avatar_url: avatarUrl || null,
      phone: supabaseUser.phone || null
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'firebase_uid', ignoreDuplicates: false })
      .select('*')
      .maybeSingle();
    if (userError) throw userError;
    if (user?.id) {
      await supabase.from('user_profiles').upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    }

    const customToken = await admin.auth().createCustomToken(firebaseUid, {
      supabase_user_id: supabaseUser.id,
      provider
    });

    return res.json({
      ok: true,
      customToken,
      provider,
      user: {
        uid: firebaseUid,
        email,
        name,
        avatarUrl,
        supabaseUserId: supabaseUser.id
      }
    });
  } catch (error) {
    console.error('Supabase provider exchange failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to finish provider sign-in.' });
  }
};

app.post('/auth/supabase/exchange', strictAuthRateLimiter, exchangeSupabaseOAuthSession);
app.post('/api/auth/supabase/exchange', strictAuthRateLimiter, exchangeSupabaseOAuthSession);

const requireAuth = async (req, res, next) => {
  const hintedFirebaseUid = hydrateRequestUserFromFirebaseUid(req);

  if (!BACKEND_API_KEY && !firebaseApp) {
    if (!IS_PRODUCTION) {
      return next();
    }
    return res.status(503).json({ error: 'Authentication backend is not configured.' });
  }

  if (BACKEND_API_KEY && secureCompare(req.headers['x-backend-key'], BACKEND_API_KEY)) {
    hydrateRequestUserFromFirebaseUid(req);
    return next();
  }

  if (firebaseApp) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        return next();
      } catch (error) {
        console.warn('Firebase token verify failed:', error?.message || error);
      }
    }
  }

  if (!IS_PRODUCTION && hintedFirebaseUid) {
    hydrateRequestUserFromFirebaseUid(req);
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

const resolveLoginProviderLabel = (provider) => {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'google') return 'Google';
  if (normalized === 'apple') return 'Apple';
  if (normalized === 'facebook') return 'Facebook';
  if (normalized === 'linkedin' || normalized === 'linkedin_oidc') return 'LinkedIn';
  if (normalized === 'phone') return 'phone number and password';
  if (['email', 'password', 'email-password'].includes(normalized)) return 'email and password';
  return 'your account credentials';
};

const pickClientHintBrowser = (clientHints) => {
  const lists = [clientHints?.fullVersionList, clientHints?.brands].filter(Array.isArray);
  for (const list of lists) {
    const match = list.find((entry) => {
      const brand = String(entry?.brand || '').toLowerCase();
      return brand.includes('google chrome') || brand.includes('microsoft edge') || brand.includes('firefox') || brand === 'safari';
    });
    if (!match) continue;
    const brand = String(match.brand || '').replace('Google Chrome', 'Chrome').replace('Microsoft Edge', 'Microsoft Edge');
    const version = String(match.version || '').split('.')[0];
    return version ? `${brand} ${version}` : brand;
  }
  return '';
};

const parseBrowserName = (userAgent, clientHints = {}) => {
  const hintedBrowser = pickClientHintBrowser(clientHints);
  if (hintedBrowser) return hintedBrowser;
  const ua = String(userAgent || '');
  const edge = /Edg\/([\d.]+)/i.exec(ua);
  if (edge) return `Microsoft Edge ${edge[1].split('.')[0]}`;
  const chrome = /Chrome\/([\d.]+)/i.exec(ua);
  if (chrome && !/Chromium/i.test(ua)) return `Chrome ${chrome[1].split('.')[0]}`;
  const firefox = /Firefox\/([\d.]+)/i.exec(ua);
  if (firefox) return `Firefox ${firefox[1].split('.')[0]}`;
  const safari = /Version\/([\d.]+).*Safari/i.exec(ua);
  if (safari) return `Safari ${safari[1].split('.')[0]}`;
  return 'Unknown browser';
};

const parseOperatingSystem = (userAgent, clientHints = {}) => {
  const hintedPlatform = String(clientHints?.platform || '').trim();
  const hintedPlatformVersion = String(clientHints?.platformVersion || '').trim();
  if (/windows/i.test(hintedPlatform)) {
    const major = Number.parseInt(hintedPlatformVersion.split('.')[0] || '0', 10);
    if (major >= 13) return 'Windows 11';
    if (major > 0) return 'Windows 10';
    return 'Windows';
  }
  if (/macos/i.test(hintedPlatform)) return 'macOS';
  if (/android/i.test(hintedPlatform)) return 'Android';
  if (/ios/i.test(hintedPlatform)) return 'iOS';
  if (/linux/i.test(hintedPlatform)) return 'Linux';

  const ua = String(userAgent || '');
  if (/Windows NT 10\.0/i.test(ua)) return 'Windows 11 or 10';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
};

const parseDeviceType = (userAgent, clientHints = {}) => {
  if (clientHints?.mobile === true) return 'Mobile device';
  const ua = String(userAgent || '');
  if (/iPad|Tablet/i.test(ua)) return 'Tablet device';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile device';
  return 'Desktop device';
};

const describeUserAgent = (userAgent, clientHints = {}) => {
  const browser = parseBrowserName(userAgent, clientHints);
  const os = parseOperatingSystem(userAgent, clientHints);
  if (browser === 'Unknown browser' && os === 'Unknown OS') return 'Unknown browser and device';
  return `${browser} on ${os}`;
};

const resolveApproximateLocation = (req) => {
  const city = String(req.headers['x-vercel-ip-city'] || req.headers['cf-ipcity'] || '').trim();
  const region = String(req.headers['x-vercel-ip-country-region'] || req.headers['cf-region'] || '').trim();
  const country = String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '').trim();
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');

  const ipAddress = String(req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
  if (!ipAddress || ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ipAddress)) {
    return 'Local development device';
  }
  return 'Approximate location unavailable';
};

const sendLoginSecurityEmail = async ({ email, displayName, provider, req, localTime, timeZone, clientHints }) => {
  if (!isPasswordResetEmailConfigured()) {
    throw new Error('Login alert email delivery is not configured.');
  }

  const accountEmail = normalizeEmail(email);
  const safeName = String(displayName || '').trim() || accountEmail.split('@')[0] || 'there';
  const providerLabel = resolveLoginProviderLabel(provider);
  const supportEmail = resolveSupportEmail();
  const occurredAt = localTime || new Date().toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
  const ipAddress = String(req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'Unknown')
    .split(',')[0]
    .trim();
  const userAgent = String(req.headers['user-agent'] || 'Unknown device').slice(0, 180);
  const browserDevice = describeUserAgent(userAgent, clientHints);
  const deviceType = parseDeviceType(userAgent, clientHints);
  const approximateLocation = resolveApproximateLocation(req);
  const normalizedTimeZone = String(timeZone || '').trim() || 'Not provided';
  const resetUrl = buildEmailActionUrl(req, `/forgot-password?email=${encodeURIComponent(accountEmail)}`);
  const logoutUrl = buildEmailActionUrl(req, '/auth?logout=1');
  const supportUrl = `mailto:${supportEmail}?subject=${encodeURIComponent('Urban Prime suspicious login')}`;
  const subject = `Security notice: Urban Prime ${providerLabel} login`;
  const text = [
    `Hi ${safeName},`,
    '',
    `A login using ${providerLabel} was detected for your Urban Prime account.`,
    '',
    `Name: ${safeName}`,
    `Account: ${accountEmail}`,
    `Sign-in method: ${providerLabel}`,
    `Time: ${occurredAt}`,
    `Time zone: ${normalizedTimeZone}`,
    `IP address: ${ipAddress}`,
    `Device: ${browserDevice}`,
    `Device type: ${deviceType}`,
    `Approximate location: ${approximateLocation}`,
    '',
    'If this was you, no action is needed.',
    `If this was not you, sign out here: ${logoutUrl}`,
    `Then reset your password here: ${resetUrl}`,
    `Contact support: ${supportEmail}`
  ].join('\n');
  const html = buildUrbanPrimeEmail({
    preheader: `A ${providerLabel} login was detected on your Urban Prime account.`,
    eyebrow: 'Security Alert',
    title: `Hi ${safeName}, new login detected`,
    intro: `A sign-in using ${providerLabel} just happened on your Urban Prime account. Review the details below so you can act quickly if this was not you.`,
    details: [
      { label: 'Name', value: safeName },
      { label: 'Account', value: accountEmail },
      { label: 'Sign-in method', value: providerLabel },
      { label: 'Time', value: occurredAt },
      { label: 'Time zone', value: normalizedTimeZone },
      { label: 'Device', value: browserDevice },
      { label: 'Device type', value: deviceType },
      { label: 'Approx. location', value: approximateLocation },
      { label: 'Risk level', value: 'Standard login alert' }
    ],
    warning: 'If this was not you, sign out and reset your password immediately. Then contact support so we can help protect your account.',
    primaryAction: { href: resetUrl, label: 'Reset Password' },
    secondaryActions: [
      { href: logoutUrl, label: 'Sign Out' },
      { href: supportUrl, label: 'Contact Support' }
    ],
    footer: 'If this was you, no action is needed. We send these alerts to help keep your Urban Prime account protected.'
  });

  await sendUrbanPrimeEmail({ to: accountEmail, subject, text, html });
};

const sendLoginSecurityWhatsApp = async ({ email, displayName, provider, req, localTime, timeZone, clientHints }) => {
  const firebaseUid = getRequestFirebaseUid(req);
  const userId = firebaseUid ? await resolveUserIdFromFirebaseUid(firebaseUid) : await resolveUserIdByEmail(email);
  if (!userId) return { skipped: true, reason: 'user_not_found' };
  const allowed = await canSendWhatsAppCategory({ userId, category: 'security' });
  if (!allowed) return { skipped: true, reason: 'not_opted_in' };

  const profile = await getUserMessagingProfile(userId);
  const phone = normalizePhone(profile?.phone);
  if (!phone) return { skipped: true, reason: 'missing_phone' };

  const accountEmail = normalizeEmail(email || profile?.email);
  const safeName = String(displayName || profile?.name || '').trim() || accountEmail.split('@')[0] || 'there';
  const providerLabel = resolveLoginProviderLabel(provider);
  const occurredAt = localTime || new Date().toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
  const userAgent = String(req.headers['user-agent'] || 'Unknown device').slice(0, 180);
  const browserDevice = describeUserAgent(userAgent, clientHints);
  const deviceType = parseDeviceType(userAgent, clientHints);
  const approximateLocation = resolveApproximateLocation(req);
  const resetUrl = buildEmailActionUrl(req, `/forgot-password?email=${encodeURIComponent(accountEmail)}`);
  const supportUrl = `mailto:${resolveSupportEmail()}?subject=${encodeURIComponent('Urban Prime suspicious login')}`;

  return sendWhatsAppTemplate({
    to: phone,
    userId,
    templateName: WHATSAPP_TEMPLATES.loginAlert,
    eventType: 'login_alert',
    category: 'security',
    bodyParams: [
      safeName,
      providerLabel,
      occurredAt,
      browserDevice,
      deviceType,
      approximateLocation,
      String(timeZone || 'Time zone unavailable'),
      resetUrl,
      supportUrl
    ],
    dedupeKey: `login-alert:${userId}:${providerLabel}:${Math.floor(Date.now() / 60000)}`
  });
};

const loginAlertHandler = async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email || req.body?.email);
    if (!isEmailAddress(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    await sendLoginSecurityEmail({
      email,
      displayName: toNullableText(req.body?.displayName || req.user?.name),
      provider: toNullableText(req.body?.provider),
      req,
      localTime: toNullableText(req.body?.localTime),
      timeZone: toNullableText(req.body?.timeZone),
      clientHints: normalizeJsonObject(req.body?.clientHints)
    });
    try {
      await sendLoginSecurityWhatsApp({
        email,
        displayName: toNullableText(req.body?.displayName || req.user?.name),
        provider: toNullableText(req.body?.provider),
        req,
        localTime: toNullableText(req.body?.localTime),
        timeZone: toNullableText(req.body?.timeZone),
        clientHints: normalizeJsonObject(req.body?.clientHints)
      });
    } catch (whatsAppError) {
      console.warn('Login security WhatsApp failed:', whatsAppError?.message || whatsAppError);
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Login security email failed:', error);
    return res.status(500).json({ error: 'Unable to send login security email.' });
  }
};

app.post('/auth/login-alert', strictAuthRateLimiter, requireAuth, loginAlertHandler);
app.post('/api/auth/login-alert', strictAuthRateLimiter, requireAuth, loginAlertHandler);

app.get('/api/message-preferences/whatsapp', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getRequestFirebaseUid(req);
    const userId = firebaseUid ? await resolveUserIdFromFirebaseUid(firebaseUid) : null;
    if (!userId) return res.status(404).json({ error: 'User profile not found.' });
    const profile = await getUserMessagingProfile(userId);
    const phone = normalizePhone(profile?.phone);
    const preferences = await getWhatsAppPreferenceSnapshot(userId);
    return res.json({
      ok: true,
      channel: 'whatsapp',
      phone,
      maskedPhone: maskPhone(phone),
      configured: isWhatsAppConfigured(),
      dryRun: WHATSAPP_DRY_RUN_ACTIVE,
      preferences
    });
  } catch (error) {
    console.error('WhatsApp preferences load failed:', error);
    return res.status(500).json({ error: 'Unable to load WhatsApp notification settings.' });
  }
});

app.patch('/api/message-preferences/whatsapp', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getRequestFirebaseUid(req);
    const userId = firebaseUid ? await resolveUserIdFromFirebaseUid(firebaseUid) : null;
    if (!userId) return res.status(404).json({ error: 'User profile not found.' });
    const profile = await getUserMessagingProfile(userId);
    const phone = normalizePhone(req.body?.phone || profile?.phone);
    if (!phone) return res.status(400).json({ error: 'Add a valid phone number before enabling WhatsApp messages.' });

    const preferences = normalizeJsonObject(req.body?.preferences);
    for (const [category, enabled] of Object.entries(preferences)) {
      if (!WHATSAPP_MESSAGE_CATEGORIES.has(category)) continue;
      await upsertMessagePreference({
        userId,
        phone,
        category,
        enabled: enabled === true,
        source: category === 'marketing' ? 'settings_marketing_opt_in' : 'settings'
      });
    }

    const snapshot = await getWhatsAppPreferenceSnapshot(userId);
    return res.json({
      ok: true,
      channel: 'whatsapp',
      phone,
      maskedPhone: maskPhone(phone),
      configured: isWhatsAppConfigured(),
      dryRun: WHATSAPP_DRY_RUN_ACTIVE,
      preferences: snapshot
    });
  } catch (error) {
    console.error('WhatsApp preferences update failed:', error);
    return res.status(500).json({ error: 'Unable to save WhatsApp notification settings.' });
  }
});

const inferWhatsAppNotificationRoute = (notification = {}) => {
  const type = String(notification.type || '').trim().toLowerCase();
  const title = String(notification.title || '').trim();
  const body = String(notification.body || notification.message || '').trim();
  const copy = `${title} ${body}`.toLowerCase();

  if (copy.includes('verification') || copy.includes('verify')) {
    return { templateName: WHATSAPP_TEMPLATES.verificationUpdate, eventType: 'verification_update', category: 'utility' };
  }
  if (copy.includes('rental') || copy.includes('rent') || copy.includes('return') || copy.includes('pickup')) {
    return { templateName: WHATSAPP_TEMPLATES.rentalReminder, eventType: 'rental_reminder', category: 'utility' };
  }
  if (copy.includes('offer') || copy.includes('bid') || copy.includes('counter')) {
    return { templateName: WHATSAPP_TEMPLATES.offerUpdate, eventType: 'offer_update', category: 'utility' };
  }
  if (type === 'promo' || copy.includes('discount') || copy.includes('coupon') || copy.includes('sale')) {
    return { templateName: WHATSAPP_TEMPLATES.discountAlert, eventType: 'discount_alert', category: 'marketing' };
  }
  if (type === 'listing' || copy.includes('listing') || copy.includes('seller') || copy.includes('order')) {
    return { templateName: WHATSAPP_TEMPLATES.sellerUpdate, eventType: 'seller_update', category: 'utility' };
  }
  if (type === 'message' || copy.includes('feed') || copy.includes('post') || copy.includes('spotlight')) {
    return { templateName: WHATSAPP_TEMPLATES.feedAlert, eventType: 'feed_alert', category: 'marketing' };
  }
  return { templateName: WHATSAPP_TEMPLATES.sellerUpdate, eventType: 'seller_update', category: 'utility' };
};

const sendWhatsAppForNotification = async (notification, req = null) => {
  const userId = notification?.user_id || notification?.userId || null;
  if (!userId) return { skipped: true, reason: 'missing_user' };
  const route = inferWhatsAppNotificationRoute(notification);
  const allowed = await canSendWhatsAppCategory({ userId, category: route.category });
  if (!allowed) return { skipped: true, reason: 'not_opted_in' };

  const profile = await getUserMessagingProfile(userId);
  const phone = normalizePhone(profile?.phone);
  if (!phone) return { skipped: true, reason: 'missing_phone' };

  const title = String(notification.title || 'Urban Prime update').trim();
  const body = String(notification.body || notification.message || '').trim();
  const link = String(notification.link || '').trim();
  const actionUrl = link
    ? (req ? buildEmailActionUrl(req, link) : `${APP_PUBLIC_URL_NORMALIZED}${link.startsWith('/') ? link : `/${link}`}`)
    : (APP_PUBLIC_URL_NORMALIZED || 'Open Urban Prime');
  const safeName = String(profile?.name || '').trim() || String(profile?.email || '').split('@')[0] || 'there';

  return sendWhatsAppTemplate({
    to: phone,
    userId,
    templateName: route.templateName,
    eventType: route.eventType,
    category: route.category,
    bodyParams: [
      safeName,
      title,
      body,
      actionUrl
    ],
    dedupeKey: notification?.id ? `${route.eventType}:${notification.id}` : null
  });
};

const scheduleWhatsAppForNotifications = (rows, req = null) => {
  const notifications = Array.isArray(rows) ? rows : [rows];
  notifications
    .filter(Boolean)
    .forEach((notification) => {
      void sendWhatsAppForNotification(notification, req)
        .catch((error) => console.warn('Notification WhatsApp failed:', error?.message || error));
    });
};

const inferEmailNotificationRoute = (notification = {}) => {
  const type = String(notification.type || '').trim().toLowerCase();
  const title = String(notification.title || '').trim();
  const body = String(notification.body || notification.message || '').trim();
  const copy = `${type} ${title} ${body}`.toLowerCase();

  if (type === 'message' || copy.includes('message') || copy.includes('chat')) {
    return { eventType: 'unread_messages', ctaLabel: 'Go to messages', badge: 'Inbox pulse' };
  }
  if (copy.includes('pixe')) {
    return { eventType: 'pixe_moment', ctaLabel: 'Open Pixe', badge: 'Pixe creator' };
  }
  if (copy.includes('spotlight') || copy.includes('follower') || copy.includes('like') || copy.includes('comment')) {
    return { eventType: 'spotlight_moment', ctaLabel: 'Open Spotlight', badge: 'Spotlight' };
  }
  if (copy.includes('trending') || copy.includes('surging') || copy.includes('popular')) {
    return { eventType: 'trending_signal', ctaLabel: 'View performance', badge: 'Trend signal' };
  }
  if (copy.includes('rental') || copy.includes('rent') || copy.includes('pickup') || copy.includes('return')) {
    return { eventType: 'rental_update', ctaLabel: 'View rental', badge: 'Rental desk' };
  }
  if (copy.includes('auction') || copy.includes('bid')) {
    return { eventType: 'auction_update', ctaLabel: 'View auction', badge: 'Auction room' };
  }
  if (copy.includes('service') || copy.includes('work') || copy.includes('proposal') || copy.includes('booking')) {
    return { eventType: 'service_update', ctaLabel: 'View service', badge: 'Service desk' };
  }
  if (copy.includes('sold') || copy.includes('bought') || copy.includes('order') || copy.includes('purchase')) {
    return { eventType: 'commerce_update', ctaLabel: 'View order', badge: 'Marketplace' };
  }
  if (copy.includes('listing') || copy.includes('published')) {
    return { eventType: 'listing_update', ctaLabel: 'View listing', badge: 'Seller studio' };
  }
  if (copy.includes('verification') || copy.includes('verify')) {
    return { eventType: 'verification_update', ctaLabel: 'Review status', badge: 'Verification' };
  }
  return { eventType: 'account_activity', ctaLabel: 'Open Urban Prime', badge: 'Account activity' };
};

const loadUnreadMessagePreview = async (userId, fallbackNotification = {}) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,link,created_at')
      .eq('user_id', userId)
      .eq('type', 'message')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    const rows = Array.isArray(data) && data.length > 0 ? data : [fallbackNotification];
    return {
      count: rows.filter(Boolean).length,
      items: rows
        .filter(Boolean)
        .map((row) => ({
          title: row.title || 'Unread message',
          body: row.body || row.message || 'A conversation is ready for you.'
        }))
    };
  } catch (error) {
    console.warn('Unread message preview skipped:', error?.message || error);
    return {
      count: 1,
      items: [{
        title: fallbackNotification.title || 'Unread message',
        body: fallbackNotification.body || fallbackNotification.message || 'A conversation is ready for you.'
      }]
    };
  }
};

const sendEmailForNotification = async (notification, req = null) => {
  const userId = notification?.user_id || notification?.userId || null;
  if (!userId) return { skipped: true, reason: 'missing_user' };
  const route = inferEmailNotificationRoute(notification);
  const title = String(notification.title || 'Urban Prime update').trim();
  const body = String(notification.body || notification.message || '').trim();
  const link = String(notification.link || '').trim() || '/profile/notifications';

  if (route.eventType === 'unread_messages') {
    const preview = await loadUnreadMessagePreview(userId, notification);
    return sendMomentEmail({
      userId,
      eventType: route.eventType,
      title: preview.count > 1 ? `${preview.count} conversations are waiting` : 'A conversation is waiting',
      body: 'Your inbox has something new to pick up.',
      link: link || '/profile/messages',
      ctaLabel: 'Go to messages',
      badge: route.badge,
      highlight: 'Open the conversation while the context is still fresh.',
      previewItems: preview.items,
      stats: [{ label: 'Unread', value: String(preview.count) }],
      dedupeKey: `email:unread-message:${userId}:${link || 'inbox'}`,
      dedupeMs: EMAIL_UNREAD_MESSAGE_DEDUPE_WINDOW_MS,
      req
    });
  }

  return sendMomentEmail({
    userId,
    eventType: route.eventType,
    title,
    body: body || title,
    link,
    ctaLabel: route.ctaLabel,
    badge: route.badge,
    highlight: 'The update is already organized inside your Urban Prime workspace.',
    previewItems: [{ title, body }],
    dedupeKey: notification?.id ? `email:notification:${notification.id}` : `email:notification:${userId}:${route.eventType}:${title}:${link}`,
    req
  });
};

const scheduleEmailForNotifications = (rows, req = null) => {
  const notifications = Array.isArray(rows) ? rows : [rows];
  notifications
    .filter(Boolean)
    .forEach((notification) => {
      void sendEmailForNotification(notification, req)
        .catch((error) => console.warn('Notification email failed:', error?.message || error));
    });
};

const scheduleListingPublishedEmail = (rows, req = null) => {
  const items = Array.isArray(rows) ? rows : [rows];
  items
    .filter(Boolean)
    .forEach((item) => {
      const status = String(item.status || item.listing_status || '').toLowerCase();
      if (status && !['published', 'active', 'live'].includes(status)) return;
      const sellerId = item.seller_id || item.owner_user_id || item.user_id || item.created_by_user_id || null;
      if (!sellerId) return;
      const title = String(item.title || item.name || 'Your listing').trim();
      void sendMomentEmail({
        userId: sellerId,
        eventType: 'listing_published',
        title: `${title} is live`,
        body: 'Your listing is now placed in the marketplace with its first visibility moment ready.',
        link: item.id ? `/item/${item.id}` : '/profile/listings',
        ctaLabel: 'View listing',
        badge: 'Seller launch',
        highlight: 'Add a stronger cover image, pricing detail, or delivery note to turn early views into action.',
        stats: [
          { label: 'Status', value: 'Live' },
          { label: 'Next goal', value: 'First buyer' }
        ],
        dedupeKey: item.id ? `email:listing-published:${item.id}` : null,
        req
      }).catch((error) => console.warn('Listing email failed:', error?.message || error));
    });
};

const sendGoalInviteEmail = async ({ userId, goal, req = null }) => {
  const goalMap = {
    product: {
      title: 'Your first product deserves a proper launch',
      body: 'A polished listing helps buyers trust the item faster.',
      link: '/sell',
      ctaLabel: 'List first product',
      badge: 'Seller start',
      highlight: 'Start with one clear photo, a confident price, and the condition details buyers ask for first.'
    },
    rental: {
      title: 'Turn an idle item into a rental',
      body: 'A rental listing can create repeat demand without selling the item.',
      link: '/rentals/new',
      ctaLabel: 'Create rental listing',
      badge: 'Rental start',
      highlight: 'Set availability, pickup rules, and deposit terms so renters can move quickly.'
    },
    pixe: {
      title: 'Your first Pixe can start the discovery loop',
      body: 'Short product-led clips give your marketplace profile more personality.',
      link: '/pixe/studio',
      ctaLabel: 'Upload first Pixe',
      badge: 'Pixe launch',
      highlight: 'Use the first three seconds to show the item, the result, or the reason people should care.'
    },
    spotlight: {
      title: 'Spotlight is ready for your first post',
      body: 'A simple post can bring your profile into the social side of Urban Prime.',
      link: '/spotlight',
      ctaLabel: 'Create Spotlight post',
      badge: 'Spotlight start',
      highlight: 'Share a product moment, behind-the-scenes update, or quick story that makes your profile feel active.'
    }
  };
  const config = goalMap[goal];
  if (!config) return { skipped: true, reason: 'unknown_goal' };
  return sendMomentEmail({
    userId,
    eventType: `invite_${goal}`,
    ...config,
    stats: [{ label: 'Goal', value: 'First step' }],
    dedupeKey: `email:invite:${goal}:${userId}`,
    dedupeMs: 7 * 24 * 60 * 60 * 1000,
    req
  });
};

const countRowsForUserColumn = async ({ table, column, userId, filters = {} }) => {
  try {
    let query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(column, userId);
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === null) query = query.is(key, null);
      else if (Array.isArray(value)) query = query.in(key, value);
      else query = query.eq(key, value);
    });
    const { count, error } = await query;
    if (error) throw error;
    return Number(count || 0);
  } catch {
    return 0;
  }
};

const loadUserGoalSignals = async (userId) => {
  const [
    sellerIdItems,
    ownerUserIdItems,
    rentalItems,
    pixeVideos,
    spotlightPosts
  ] = await Promise.all([
    countRowsForUserColumn({ table: 'items', column: 'seller_id', userId }),
    countRowsForUserColumn({ table: 'items', column: 'owner_user_id', userId }),
    countRowsForUserColumn({ table: 'items', column: 'seller_id', userId, filters: { listing_type: 'rental' } }),
    countRowsForUserColumn({ table: 'pixe_videos', column: 'creator_user_id', userId }),
    countRowsForUserColumn({ table: 'spotlight_content', column: 'creator_user_id', userId })
  ]);
  const productListings = sellerIdItems + ownerUserIdItems;
  return {
    hasProduct: productListings > 0,
    hasRental: rentalItems > 0,
    hasPixe: pixeVideos > 0,
    hasSpotlight: spotlightPosts > 0
  };
};

const sendMissingGoalInviteEmails = async ({ userId, req = null }) => {
  const signals = await loadUserGoalSignals(userId);
  const goals = [];
  if (!signals.hasProduct) goals.push('product');
  if (!signals.hasRental) goals.push('rental');
  if (!signals.hasPixe) goals.push('pixe');
  if (!signals.hasSpotlight) goals.push('spotlight');
  for (const goal of goals) {
    try {
      await sendGoalInviteEmail({ userId, goal, req });
    } catch (error) {
      console.warn(`Goal invite email failed for ${goal}:`, error?.message || error);
    }
  }
  return goals;
};

const requireAutomationAuth = (req, res, next) => {
  if (BACKEND_API_KEY && secureCompare(req.headers['x-backend-key'], BACKEND_API_KEY)) {
    return next();
  }
  if (!IS_PRODUCTION) {
    return next();
  }
  return res.status(401).json({ error: 'Automation key required.' });
};

app.post('/api/engagement/presence', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getRequestFirebaseUid(req);
    const userId = firebaseUid ? await resolveUserIdFromFirebaseUid(firebaseUid) : null;
    if (!userId) return res.status(404).json({ error: 'User profile not found.' });
    const now = new Date().toISOString();
    const metadata = {
      path: String(req.body?.path || '').slice(0, 240),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    };
    const { error } = await supabase.from('email_engagement_state').upsert({
      user_id: userId,
      last_seen_at: now,
      metadata,
      updated_at: now
    }, { onConflict: 'user_id', ignoreDuplicates: false });
    if (error) throw error;
    return res.json({ ok: true, last_seen_at: now });
  } catch (error) {
    console.warn('Presence update failed:', error?.message || error);
    return res.status(500).json({ error: 'Unable to update engagement presence.' });
  }
});

app.post('/api/engagement/invites', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getRequestFirebaseUid(req);
    const userId = firebaseUid ? await resolveUserIdFromFirebaseUid(firebaseUid) : null;
    if (!userId) return res.status(404).json({ error: 'User profile not found.' });
    const requestedGoals = Array.isArray(req.body?.goals)
      ? req.body.goals.map((goal) => String(goal || '').trim().toLowerCase()).filter(Boolean)
      : [];
    const goals = requestedGoals.length > 0
      ? requestedGoals
      : await sendMissingGoalInviteEmails({ userId, req });
    for (const goal of requestedGoals) {
      await sendGoalInviteEmail({ userId, goal, req });
    }
    return res.json({ ok: true, goals });
  } catch (error) {
    console.warn('Invite email request failed:', error?.message || error);
    return res.status(500).json({ error: 'Unable to send invite emails.' });
  }
});

app.post('/api/engagement/sweep', requireAutomationAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parsePort(req.body?.limit ?? '50', 50), 1), 100);
    const cutoff = new Date(Date.now() - EMAIL_REENGAGEMENT_AFTER_MS).toISOString();
    const { data, error } = await supabase
      .from('email_engagement_state')
      .select('user_id,last_seen_at,last_reengagement_at')
      .not('last_seen_at', 'is', null)
      .lt('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const results = [];
    for (const row of data || []) {
      const lastSeenMs = new Date(row.last_seen_at).getTime();
      const lastReengagementMs = row.last_reengagement_at ? new Date(row.last_reengagement_at).getTime() : 0;
      if (Number.isFinite(lastReengagementMs) && lastReengagementMs >= lastSeenMs) {
        results.push({ userId: row.user_id, skipped: 'already_sent' });
        continue;
      }

      try {
        const unread = await loadUnreadMessagePreview(row.user_id, {});
        await sendMomentEmail({
          userId: row.user_id,
          eventType: 'reengagement_momentum',
          title: 'Fresh movement is waiting on Urban Prime',
          body: 'A few parts of your marketplace profile have new momentum to pick up.',
          link: '/profile/notifications',
          ctaLabel: 'See what is new',
          badge: 'Market pulse',
          highlight: 'Open your workspace and choose the next action while the feed is still warm.',
          previewItems: unread.items,
          stats: [
            { label: 'Inbox', value: unread.count > 0 ? `${unread.count} new` : 'Ready' },
            { label: 'Next step', value: 'Waiting' }
          ],
          dedupeKey: `email:reengagement:${row.user_id}:${new Date().toISOString().slice(0, 10)}`,
          dedupeMs: 20 * 60 * 60 * 1000,
          req
        });
        const inviteGoals = await sendMissingGoalInviteEmails({ userId: row.user_id, req });
        await supabase
          .from('email_engagement_state')
          .update({ last_reengagement_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('user_id', row.user_id);
        results.push({ userId: row.user_id, sent: true, inviteGoals });
      } catch (sendError) {
        results.push({ userId: row.user_id, error: String(sendError?.message || sendError) });
      }
    }
    return res.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error('Engagement sweep failed:', error);
    return res.status(500).json({ error: 'Unable to run engagement sweep.' });
  }
});

const requireTable = (req, res, next) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'Table not allowed' });
  }
  return next();
};

const analyticsEngine = createAnalyticsEngine({
  app,
  supabase,
  requireAuth,
  userCanAccessPersona,
  resolveUserIdFromFirebaseUid,
  resolveAdminContext,
  writeAuditLog
});

analyticsEngine.registerRoutes();
analyticsEngine.startQueueWorker();

registerSpotlightRoutes({
  app,
  supabase,
  requireAuth,
  resolveUserIdFromFirebaseUid,
  scheduleEmailForNotifications
});

registerPixeRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  resolveAdminContext,
  createRateLimiter,
  writeAuditLog,
  scheduleEmailForNotifications,
  uploadsRoot
});

registerCommerceRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  createRateLimiter,
  resolveAdminContext,
  writeAuditLog,
  firebaseApp
});

registerDigitalMarketplaceRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  writeAuditLog,
  uploadsRoot
});

registerPodMarketplaceRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  writeAuditLog,
  uploadsRoot
});

app.get('/health', async (_req, res) => {
  const analyticsHealth = await analyticsEngine.getHealthSnapshot();
  res.json({ ok: true, firebaseAdmin: Boolean(firebaseApp), featureFlags: FEATURE_FLAGS, analytics: analyticsHealth });
});

app.post('/auth/sync-user', strictAuthRateLimiter, requireAuth, async (req, res) => {
  const { firebase_uid, email, name, avatar_url, phone } = req.body || {};
  if (!firebase_uid) {
    return res.status(400).json({ error: 'firebase_uid is required' });
  }

  if (req.user?.uid && req.user.uid !== firebase_uid) {
    return res.status(403).json({ error: 'Cannot sync profile for another user.' });
  }

  const payload = { firebase_uid, email, name, avatar_url, phone };

  let user = null;
  let syncError = null;

  try {
    const upsertResult = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'firebase_uid', ignoreDuplicates: false })
      .select('*')
      .maybeSingle();

    user = upsertResult.data;
    syncError = upsertResult.error;

    if (!user) {
      const selectResult = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', firebase_uid)
        .maybeSingle();

      if (selectResult.error) {
        syncError = selectResult.error;
      } else {
        user = selectResult.data;
        if (user) {
          const updateResult = await supabase
            .from('users')
            .update({ email, name, avatar_url, phone })
            .eq('id', user.id)
            .select('*')
            .maybeSingle();

          if (updateResult.error) {
            syncError = updateResult.error;
          } else if (updateResult.data) {
            user = updateResult.data;
            syncError = null;
          }
        }
      }
    }

    if (!user) {
      throw syncError || new Error('Unable to sync user');
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.from('user_profiles').insert({ user_id: user.id });
    }

    return res.json({ user });
  } catch (error) {
    const message = String(error?.message || error || '').toLowerCase();
    if (message.includes('fetch failed') || message.includes('enotfound') || message.includes('network')) {
      return res.json({
        user: {
          firebase_uid,
          email: email || null,
          name: name || 'Urban Prime user',
          avatar_url: avatar_url || '/icons/urbanprime.svg',
          phone: phone || null
        },
        offline: true
      });
    }
    return res.status(400).json({ error: error?.message || 'Unable to sync user' });
  }
});

app.get('/profile/me', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const response = await buildUnifiedProfileResponse(context);
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch profile.' });
  }
});

app.patch('/profile/me', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const userSource = normalizeJsonObject(body.user);
    const profileSource = normalizeJsonObject(body.profile);

    const pick = (...values) => values.find((value) => value !== undefined);

    const userPatch = {};
    const profilePatch = {};

    const nameValue = pick(body.name, userSource.name);
    const emailValue = pick(body.email, userSource.email);
    const avatarValue = pick(body.avatar, body.avatar_url, userSource.avatar, userSource.avatar_url);
    const phoneValue = pick(body.phone, userSource.phone);

    if (nameValue !== undefined) userPatch.name = toNullableText(nameValue);
    if (emailValue !== undefined) userPatch.email = toNullableText(emailValue);
    if (avatarValue !== undefined) userPatch.avatar_url = toNullableText(avatarValue);
    if (phoneValue !== undefined) userPatch.phone = phoneValue;

    const purposeValue = pick(body.purpose, profileSource.purpose);
    const interestsValue = pick(body.interests, profileSource.interests);
    const cityValue = pick(body.city, profileSource.city);
    const countryValue = pick(body.country, profileSource.country);
    const currencyValue = pick(body.currencyPreference, body.currency_preference, profileSource.currencyPreference, profileSource.currency_preference);
    const dobValue = pick(body.dob, profileSource.dob);
    const genderValue = pick(body.gender, profileSource.gender);
    const aboutValue = pick(body.about, profileSource.about);
    const businessNameValue = pick(body.businessName, body.business_name, profileSource.businessName, profileSource.business_name);
    const businessDescriptionValue = pick(body.businessDescription, body.business_description, profileSource.businessDescription, profileSource.business_description);
    const preferencesValue = pick(body.preferences, profileSource.preferences);
    const socialLinksValue = pick(body.socialLinks, body.social_links, profileSource.socialLinks, profileSource.social_links);
    const usernameValue = pick(body.username, profileSource.username);

    if (purposeValue !== undefined) {
      if (Array.isArray(purposeValue)) {
        profilePatch.purpose = intentsToPurpose(purposeValue);
      } else {
        profilePatch.purpose = toNullableText(purposeValue);
      }
    }
    if (interestsValue !== undefined) profilePatch.interests = normalizeJsonArray(interestsValue);
    if (cityValue !== undefined) profilePatch.city = toNullableText(cityValue);
    if (countryValue !== undefined) profilePatch.country = toNullableText(countryValue);
    if (currencyValue !== undefined) profilePatch.currency_preference = toNullableText(currencyValue);
    if (dobValue !== undefined) profilePatch.dob = toNullableText(dobValue);
    if (genderValue !== undefined) profilePatch.gender = toNullableText(genderValue);
    if (aboutValue !== undefined) profilePatch.about = toNullableText(aboutValue);
    if (businessNameValue !== undefined) profilePatch.business_name = toNullableText(businessNameValue);
    if (businessDescriptionValue !== undefined) profilePatch.business_description = toNullableText(businessDescriptionValue);
    if (preferencesValue !== undefined) profilePatch.preferences = normalizeJsonObject(preferencesValue);
    if (socialLinksValue !== undefined) profilePatch.social_links = normalizeJsonObject(socialLinksValue);
    if (usernameValue !== undefined) {
      const normalizedUsername = normalizePublicUsername(usernameValue);
      if (!normalizedUsername || normalizedUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
      }
      const { data: existingUsername, error: existingUsernameError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', normalizedUsername)
        .neq('user_id', context.user.id)
        .limit(1)
        .maybeSingle();
      if (existingUsernameError) {
        return res.status(400).json({ error: existingUsernameError.message || 'Unable to validate username.' });
      }
      if (existingUsername?.user_id) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      profilePatch.username = normalizedUsername;
    }

    const patchResult = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch,
      profilePatch,
      strictPhone: true
    });

    const selectedIntents = body.selectedIntents !== undefined
      ? normalizeIntents(body.selectedIntents)
      : undefined;

    const currentStep = body.currentStep || body.current_step;
    const draftPatch = normalizeJsonObject(body.draft);
    let onboardingStateRow = null;
    if (selectedIntents !== undefined || currentStep !== undefined || Object.keys(draftPatch).length > 0) {
      const onboardingStateLookup = await loadOnboardingStateRow(context.user.id);
      if (onboardingStateLookup.error) throw onboardingStateLookup.error;

      const stateUpsert = await upsertOnboardingState({
        userId: context.user.id,
        existingRow: onboardingStateLookup.row,
        patch: {
          currentStep,
          selectedIntents,
          draft: draftPatch
        }
      });
      if (stateUpsert.error) throw stateUpsert.error;
      onboardingStateRow = stateUpsert.row;
    }

    const response = await buildUnifiedProfileResponse({
      user: patchResult.user,
      profile: patchResult.profile,
      onboardingStateRow
    });
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update profile.' });
  }
});

app.get('/onboarding/state', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    let onboardingStateRow = onboardingLookup.row;
    const completionSnapshot = computeProfileCompletion({
      user: context.user,
      profile: context.profile,
      onboardingState: onboardingStateRow
    });

    const defaultDraft = buildDefaultOnboardingDraft({
      user: context.user,
      profile: context.profile,
      selectedIntents: completionSnapshot.selectedIntents
    });

    if (!onboardingStateRow) {
      const created = await upsertOnboardingState({
        userId: context.user.id,
        existingRow: null,
        patch: {
          currentStep: completionSnapshot.nextStep,
          selectedIntents: completionSnapshot.selectedIntents,
          draft: defaultDraft
        }
      });
      if (created.error) throw created.error;
      onboardingStateRow = created.row;
    } else {
      const mergedDraft = deepMergeDraft(defaultDraft, onboardingStateRow.draft);
      const normalizedSelectedIntents = normalizeIntents(onboardingStateRow.selected_intents);
      const shouldBackfillState = normalizedSelectedIntents.length === 0 && completionSnapshot.selectedIntents.length > 0;

      if (shouldBackfillState || JSON.stringify(mergedDraft) !== JSON.stringify(onboardingStateRow.draft)) {
        const updated = await upsertOnboardingState({
          userId: context.user.id,
          existingRow: onboardingStateRow,
          patch: {
            selectedIntents: shouldBackfillState ? completionSnapshot.selectedIntents : undefined,
            draft: mergedDraft
          }
        });
        if (updated.error) throw updated.error;
        onboardingStateRow = updated.row;
      }
    }

    const completion = computeProfileCompletion({
      user: context.user,
      profile: context.profile,
      onboardingState: onboardingStateRow
    });

    return res.json({
      data: mapOnboardingStateRow(onboardingStateRow),
      completion: completionToResponse(completion),
      featureFlags: FEATURE_FLAGS
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch onboarding state.' });
  }
});

app.put('/onboarding/state', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const stateUpsert = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingLookup.row,
      patch: {
        currentStep: body.currentStep || body.current_step,
        flowVersion: body.flowVersion || body.flow_version,
        selectedIntents: body.selectedIntents ?? body.selected_intents,
        draft: body.draft
      }
    });
    if (stateUpsert.error) throw stateUpsert.error;

    const patchPayload = derivePatchesFromOnboardingInput({
      selectedIntents: stateUpsert.row?.selected_intents,
      draft: stateUpsert.row?.draft
    });

    const patched = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch: patchPayload.userPatch,
      profilePatch: patchPayload.profilePatch,
      strictPhone: false
    });

    const completion = computeProfileCompletion({
      user: patched.user,
      profile: patched.profile,
      onboardingState: stateUpsert.row
    });

    return res.json({
      data: mapOnboardingStateRow(stateUpsert.row),
      completion: completionToResponse(completion),
      featureFlags: FEATURE_FLAGS
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to save onboarding state.' });
  }
});

app.post('/onboarding/persona-bootstrap', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const onboardingStateRow = onboardingLookup.row;
    const selectedIntents = normalizeIntents(
      body.selectedIntents
      ?? body.selected_intents
      ?? onboardingStateRow?.selected_intents
      ?? parsePurposeToIntents(context.profile?.purpose)
    );

    if (selectedIntents.length === 0) {
      return res.status(400).json({ error: 'At least one intent is required to bootstrap personas.' });
    }

    const roleSetup = normalizeJsonObject(
      body.roleSetup
      || normalizeJsonObject(body.draft).roleSetup
      || onboardingStateRow?.draft?.roleSetup
    );

    const personas = await bootstrapPersonasFromIntents({
      user: context.user,
      firebaseUid: context.firebaseUid,
      selectedIntents,
      roleSetup
    });

    const stateSync = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingStateRow,
      patch: {
        currentStep: onboardingStateRow?.current_step || 'role_setup',
        selectedIntents,
        draft: { roleSetup }
      }
    });
    if (stateSync.error) throw stateSync.error;

    return res.status(201).json({ data: personas });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to bootstrap personas.' });
  }
});

app.post('/onboarding/complete', strictAuthRateLimiter, requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const bodyDraft = normalizeJsonObject(body.draft);
    const roleSetupDraft = normalizeJsonObject(body.roleSetup);
    const draftPatch = Object.keys(roleSetupDraft).length > 0
      ? deepMergeDraft(bodyDraft, { roleSetup: roleSetupDraft })
      : bodyDraft;

    const selectedIntents = normalizeIntents(
      body.selectedIntents
      ?? body.selected_intents
      ?? onboardingLookup.row?.selected_intents
      ?? parsePurposeToIntents(context.profile?.purpose)
    );

    const stateUpsert = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingLookup.row,
      patch: {
        currentStep: 'review',
        selectedIntents,
        draft: draftPatch
      }
    });
    if (stateUpsert.error) throw stateUpsert.error;

    const derivedPatch = derivePatchesFromOnboardingInput({
      selectedIntents: stateUpsert.row?.selected_intents,
      draft: stateUpsert.row?.draft
    });

    const patched = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch: derivedPatch.userPatch,
      profilePatch: derivedPatch.profilePatch,
      strictPhone: true
    });

    const completionBeforeFinalize = computeProfileCompletion({
      user: patched.user,
      profile: patched.profile,
      onboardingState: stateUpsert.row
    });

    if (!completionBeforeFinalize.isComplete) {
      return res.status(422).json({
        error: 'Onboarding requirements are not complete.',
        completion: completionToResponse(completionBeforeFinalize),
        validationErrors: buildValidationErrors(completionBeforeFinalize.missingRequiredFields)
      });
    }

    await bootstrapPersonasFromIntents({
      user: patched.user,
      firebaseUid: context.firebaseUid,
      selectedIntents: completionBeforeFinalize.selectedIntents,
      roleSetup: stateUpsert.row?.draft?.roleSetup
    });

    const finalizedProfile = await applyProfilePatch({
      userRow: patched.user,
      profileRow: patched.profile,
      profilePatch: {
        onboarding_required: false,
        onboarding_completed_at: new Date().toISOString(),
        profile_version: Math.max(Number(patched.profile?.profile_version || 1), ONBOARDING_FLOW_VERSION)
      },
      strictPhone: true
    });

    const completedState = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: stateUpsert.row,
      patch: {
        currentStep: 'completed',
        selectedIntents: completionBeforeFinalize.selectedIntents
      }
    });
    if (completedState.error) throw completedState.error;

    const response = await buildUnifiedProfileResponse({
      user: finalizedProfile.user,
      profile: finalizedProfile.profile,
      onboardingStateRow: completedState.row
    });

    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to complete onboarding.' });
  }
});

app.post('/onboarding/events', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const event = String(body.event || '').trim().toLowerCase();
    if (!ONBOARDING_EVENTS.has(event)) {
      return res.status(400).json({ error: 'Unsupported onboarding event.' });
    }

    const step = normalizeOnboardingStep(body.step || body.stepId || 'intent');
    const details = normalizeJsonObject(body.details);

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: context.user.id,
        action: `onboarding_${event}`,
        entity_type: 'onboarding',
        entity_id: context.user.id,
        details: {
          step,
          flowVersion: ONBOARDING_FLOW_VERSION,
          ...details
        }
      })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to track onboarding event.' });
  }
});

app.post('/push/token', requireAuth, async (req, res) => {
  if (!PUSH_NOTIFICATIONS_ACTIVE) {
    return res.status(200).json({ ok: true, disabled: true });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const token = String(body.token || '').trim();
    if (!isPushTokenLikelyValid(token)) {
      return res.status(400).json({ error: 'Valid push token is required.' });
    }

    const now = new Date().toISOString();
    const collectionKey = pushCollectionForUser(context.user.id);
    const tokenId = hashPushToken(token);
    const payload = {
      token,
      platform: String(body.platform || 'web').trim() || 'web',
      user_agent: String(body.userAgent || req.get('user-agent') || '').slice(0, 512),
      permission: String(body.permission || '').slice(0, 32),
      user_id: context.user.id,
      firebase_uid: context.firebaseUid,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('mirror_documents')
      .upsert({
        collection: collectionKey,
        doc_id: tokenId,
        data: payload,
        updated_at: now
      }, {
        onConflict: 'collection,doc_id',
        ignoreDuplicates: false
      })
      .select('collection,doc_id,updated_at')
      .maybeSingle();
    if (error) throw error;

    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to register push token.' });
  }
});

app.delete('/push/token', requireAuth, async (req, res) => {
  if (!PUSH_NOTIFICATIONS_ACTIVE) {
    return res.status(200).json({ ok: true, disabled: true });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const token = String(body.token || '').trim();
    if (!isPushTokenLikelyValid(token)) {
      return res.status(400).json({ error: 'Valid push token is required.' });
    }

    const collectionKey = pushCollectionForUser(context.user.id);
    const tokenId = hashPushToken(token);
    const { error } = await supabase
      .from('mirror_documents')
      .delete()
      .eq('collection', collectionKey)
      .eq('doc_id', tokenId);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to remove push token.' });
  }
});

app.post('/push/notify-message', requireAuth, async (req, res) => {
  if (!PUSH_NOTIFICATIONS_ACTIVE) {
    return res.status(200).json({ ok: true, disabled: true });
  }
  if (!firebaseApp) {
    return res.status(200).json({ ok: true, skipped: 'firebase_admin_unavailable' });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const threadId = String(body.thread_id || body.threadId || '').trim();
    if (!threadId) {
      return res.status(400).json({ error: 'thread_id is required' });
    }

    const { data: threadRow, error: threadError } = await supabase
      .from('chat_threads')
      .select('id,buyer_id,seller_id')
      .eq('id', threadId)
      .maybeSingle();
    if (threadError) throw threadError;
    if (!threadRow) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const participants = [String(threadRow.buyer_id || ''), String(threadRow.seller_id || '')].filter(Boolean);
    if (!participants.includes(context.user.id)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }

    const suggestedRecipient = String(body.recipient_supabase_id || body.recipientUserId || '').trim();
    const recipientUserId = participants.find((id) => id !== context.user.id && (!suggestedRecipient || id === suggestedRecipient));
    if (!recipientUserId) {
      return res.status(200).json({ ok: true, skipped: 'recipient_missing' });
    }

    const preview = String(body.preview || '').trim().slice(0, 280) || 'New message';
    const link = String(body.link || '').trim() || `/profile/messages/${threadId}`;
    const senderName = String(context.user.name || 'New message').trim();
    const senderTitle = senderName ? `${senderName}` : 'Urban Prime';

    const pushResult = await sendPushToUser({
      recipientUserId,
      title: senderTitle,
      body: preview,
      link,
      threadId,
      senderFirebaseUid: context.firebaseUid
    });

    return res.json({
      ok: true,
      data: {
        sentCount: pushResult.sentCount,
        attemptedCount: pushResult.attemptedCount
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to send push notification.' });
  }
});

app.post('/chat/calls/start', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const threadId = String(body.threadId || body.thread_id || '').trim();
    if (!threadId) {
      return res.status(400).json({ error: 'threadId is required.' });
    }

    const mode = normalizeCallMode(body.mode);
    const threadContext = await getThreadParticipantContext(threadId, context.user.id);
    if (threadContext.error || !threadContext.threadRow) {
      return res.status(403).json({ error: threadContext.error?.message || 'Conversation access denied.' });
    }

    const collectionKey = callCollectionForThread(threadId);
    const existingCalls = await supabase
      .from('mirror_documents')
      .select('collection,doc_id,data,updated_at')
      .eq('collection', collectionKey)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (existingCalls.error) throw existingCalls.error;

    const activeRow = (existingCalls.data || []).find((row) => {
      const rowData = normalizeJsonObject(row?.data);
      return isActiveCallStatus(rowData.status) && !hasText(rowData.ended_at || rowData.endedAt);
    });

    const now = new Date().toISOString();
    let savedCallRow = activeRow || null;
    if (!savedCallRow) {
      const callId = randomUUID();
      const data = {
        id: callId,
        thread_id: threadId,
        room_name: `urbanprime-${threadId}`,
        mode,
        status: 'ringing',
        initiator_user_id: context.user.id,
        receiver_user_id: threadContext.receiverUserId,
        accepted_by_user_id: null,
        silent_by_user_ids: [],
        started_at: now,
        updated_at: now,
        ended_at: null,
        reason: null
      };

      const upsert = await supabase
        .from('mirror_documents')
        .upsert({
          collection: collectionKey,
          doc_id: callId,
          data,
          updated_at: now
        }, { onConflict: 'collection,doc_id', ignoreDuplicates: false })
        .select('collection,doc_id,data,updated_at')
        .maybeSingle();
      if (upsert.error) throw upsert.error;
      savedCallRow = upsert.data;

      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_id: context.user.id,
        message_type: 'system',
        body: mode === 'video' ? 'Started a video call.' : 'Started a voice call.',
        created_at: now
      });
      await supabase.from('chat_threads').update({ last_message_at: now }).eq('id', threadId);
    }

    const firebaseUidMap = await buildFirebaseUidMap([
      context.user.id,
      threadContext.receiverUserId
    ]);
    const response = mapCallDocumentRow(savedCallRow, firebaseUidMap);
    return res.status(201).json({ ok: true, data: response });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to start call.' });
  }
});

app.post('/chat/calls/:callId/respond', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const callId = String(req.params.callId || '').trim();
    const action = normalizeCallAction(req.body?.action);
    if (!callId || !action) {
      return res.status(400).json({ error: 'Valid callId and action are required.' });
    }

    const callLookup = await loadCallDocument(callId);
    if (callLookup.error) throw callLookup.error;
    if (!callLookup.row) return res.status(404).json({ error: 'Call session not found.' });

    const existingData = normalizeJsonObject(callLookup.row.data);
    const threadId = String(existingData.thread_id || existingData.threadId || '').trim();
    const participantIds = [
      String(existingData.initiator_user_id || ''),
      String(existingData.receiver_user_id || '')
    ].filter(Boolean);
    if (!participantIds.includes(context.user.id)) {
      return res.status(403).json({ error: 'You are not allowed to respond to this call.' });
    }

    const now = new Date().toISOString();
    const nextData = {
      ...existingData,
      id: callId,
      thread_id: threadId,
      updated_at: now
    };

    if (action === 'accept') {
      nextData.status = 'accepted';
      nextData.accepted_by_user_id = context.user.id;
      nextData.accepted_at = now;
      nextData.ended_at = null;
      nextData.reason = null;
    } else if (action === 'decline') {
      nextData.status = 'declined';
      nextData.ended_at = now;
      nextData.reason = 'declined';
    } else if (action === 'silent') {
      const currentSilent = Array.isArray(existingData.silent_by_user_ids) ? existingData.silent_by_user_ids : [];
      nextData.silent_by_user_ids = Array.from(new Set([...currentSilent, context.user.id]));
    }

    const updateResult = await supabase
      .from('mirror_documents')
      .upsert({
        collection: callLookup.row.collection,
        doc_id: callId,
        data: nextData,
        updated_at: now
      }, { onConflict: 'collection,doc_id', ignoreDuplicates: false })
      .select('collection,doc_id,data,updated_at')
      .maybeSingle();
    if (updateResult.error) throw updateResult.error;

    if (threadId && action !== 'silent') {
      const systemBody = action === 'accept' ? 'Accepted the call.' : 'Declined the call.';
      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_id: context.user.id,
        message_type: 'system',
        body: systemBody,
        created_at: now
      });
      await supabase.from('chat_threads').update({ last_message_at: now }).eq('id', threadId);
    }

    const firebaseUidMap = await buildFirebaseUidMap(participantIds);
    const response = mapCallDocumentRow(updateResult.data, firebaseUidMap);
    return res.json({ ok: true, data: response });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to respond to call.' });
  }
});

app.post('/chat/calls/:callId/end', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const callId = String(req.params.callId || '').trim();
    if (!callId) return res.status(400).json({ error: 'callId is required.' });

    const callLookup = await loadCallDocument(callId);
    if (callLookup.error) throw callLookup.error;
    if (!callLookup.row) return res.status(404).json({ error: 'Call session not found.' });

    const existingData = normalizeJsonObject(callLookup.row.data);
    const threadId = String(existingData.thread_id || existingData.threadId || '').trim();
    const participantIds = [
      String(existingData.initiator_user_id || ''),
      String(existingData.receiver_user_id || '')
    ].filter(Boolean);
    if (!participantIds.includes(context.user.id)) {
      return res.status(403).json({ error: 'You are not allowed to end this call.' });
    }

    const body = normalizeJsonObject(req.body);
    const now = new Date().toISOString();
    const nextData = {
      ...existingData,
      id: callId,
      thread_id: threadId,
      status: 'ended',
      ended_at: now,
      reason: toNullableText(body.reason) || 'ended',
      updated_at: now
    };

    const updateResult = await supabase
      .from('mirror_documents')
      .upsert({
        collection: callLookup.row.collection,
        doc_id: callId,
        data: nextData,
        updated_at: now
      }, { onConflict: 'collection,doc_id', ignoreDuplicates: false })
      .select('collection,doc_id,data,updated_at')
      .maybeSingle();
    if (updateResult.error) throw updateResult.error;

    if (threadId) {
      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_id: context.user.id,
        message_type: 'system',
        body: 'Call ended.',
        created_at: now
      });
      await supabase.from('chat_threads').update({ last_message_at: now }).eq('id', threadId);
    }

    const firebaseUidMap = await buildFirebaseUidMap(participantIds);
    const response = mapCallDocumentRow(updateResult.data, firebaseUidMap);
    return res.json({ ok: true, data: response });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to end call.' });
  }
});

app.get('/chat/calls/active', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const threadId = String(req.query.threadId || req.query.thread_id || '').trim();
    if (!threadId) return res.status(400).json({ error: 'threadId is required.' });

    const threadContext = await getThreadParticipantContext(threadId, context.user.id);
    if (threadContext.error || !threadContext.threadRow) {
      return res.status(403).json({ error: threadContext.error?.message || 'Conversation access denied.' });
    }

    const collectionKey = callCollectionForThread(threadId);
    const callsResult = await supabase
      .from('mirror_documents')
      .select('collection,doc_id,data,updated_at')
      .eq('collection', collectionKey)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (callsResult.error) throw callsResult.error;

    const activeRow = (callsResult.data || []).find((row) => {
      const rowData = normalizeJsonObject(row?.data);
      return isActiveCallStatus(rowData.status) && !hasText(rowData.ended_at || rowData.endedAt);
    });

    if (!activeRow) return res.json({ ok: true, data: null });

    const firebaseUidMap = await buildFirebaseUidMap([
      context.user.id,
      threadContext.receiverUserId
    ]);
    const response = mapCallDocumentRow(activeRow, firebaseUidMap);
    return res.json({ ok: true, data: response });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch active call.' });
  }
});

app.put('/chat/presence', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const now = new Date().toISOString();
    const isOnline = body.isOnline === undefined ? true : Boolean(body.isOnline);
    const hasVisibilityPatch = body.visibility !== undefined;
    const existingPresenceResult = await supabase
      .from('mirror_documents')
      .select('data')
      .eq('collection', CHAT_PRESENCE_COLLECTION)
      .eq('doc_id', context.user.id)
      .maybeSingle();
    if (existingPresenceResult.error) throw existingPresenceResult.error;
    const existingVisibility = normalizeJsonObject(existingPresenceResult.data?.data).visibility !== false;
    const visibility = hasVisibilityPatch ? Boolean(body.visibility) : existingVisibility;
    const lastSeenAt = isOnline
      ? toNullableText(body.lastSeenAt || body.last_seen_at)
      : toNullableText(body.lastSeenAt || body.last_seen_at) || now;

    const data = {
      user_id: context.user.id,
      firebase_uid: context.firebaseUid,
      is_online: isOnline,
      heartbeat_at: now,
      last_seen_at: lastSeenAt,
      visibility,
      updated_at: now
    };

    const upsert = await supabase
      .from('mirror_documents')
      .upsert({
        collection: CHAT_PRESENCE_COLLECTION,
        doc_id: context.user.id,
        data,
        updated_at: now
      }, { onConflict: 'collection,doc_id', ignoreDuplicates: false })
      .select('collection,doc_id,data,updated_at')
      .maybeSingle();
    if (upsert.error) throw upsert.error;

    if (hasVisibilityPatch) {
      const nextPreferences = {
        ...normalizeJsonObject(context.profile?.preferences),
        chatPresenceVisible: visibility
      };
      const prefUpdate = await supabase
        .from('user_profiles')
        .update({ preferences: nextPreferences })
        .eq('user_id', context.user.id);
      if (prefUpdate.error) throw prefUpdate.error;
    }

    return res.json({
      ok: true,
      data: {
        userId: context.user.id,
        firebaseUid: context.firebaseUid,
        isOnline,
        lastSeenAt,
        visibility,
        updatedAt: now
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update presence.' });
  }
});

app.get('/chat/presence', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const rawIds = String(req.query.userIds || req.query.user_ids || '').trim();
    if (!rawIds) return res.json({ ok: true, data: [] });
    const userIds = Array.from(new Set(rawIds.split(',').map((entry) => entry.trim()).filter(Boolean))).slice(0, 200);
    if (userIds.length === 0) return res.json({ ok: true, data: [] });

    const presenceResult = await supabase
      .from('mirror_documents')
      .select('collection,doc_id,data,updated_at')
      .eq('collection', CHAT_PRESENCE_COLLECTION)
      .in('doc_id', userIds);
    if (presenceResult.error) throw presenceResult.error;

    const firebaseUidMap = await buildFirebaseUidMap(userIds);
    const nowMs = Date.now();
    const rows = Array.isArray(presenceResult.data) ? presenceResult.data : [];

    const data = rows.map((row) => {
      const payload = normalizeJsonObject(row.data);
      const visibility = payload.visibility !== false;
      const heartbeatAt = Date.parse(String(payload.heartbeat_at || payload.updated_at || row.updated_at || ''));
      const hasHeartbeat = Number.isFinite(heartbeatAt);
      const onlineByHeartbeat = hasHeartbeat && nowMs - heartbeatAt <= CHAT_PRESENCE_ONLINE_TTL_MS;
      const online = visibility && Boolean(payload.is_online) && onlineByHeartbeat;
      const fallbackLastSeen = payload.last_seen_at || payload.updated_at || row.updated_at || new Date().toISOString();

      return {
        userId: String(row.doc_id || ''),
        firebaseUid: firebaseUidMap.get(String(row.doc_id || '')) || payload.firebase_uid || null,
        isOnline: online,
        lastSeenAt: visibility ? toIsoTimestamp(online ? (payload.last_seen_at || payload.heartbeat_at || fallbackLastSeen) : fallbackLastSeen) : null,
        visibility,
        updatedAt: toIsoTimestamp(payload.updated_at || row.updated_at)
      };
    });

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch presence.' });
  }
});

app.get('/dashboard/buyer', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const recentLimit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 30);
    const summaryWindowLimit = Math.max(recentLimit, 120);

    const totalOrdersQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', context.user.id);

    const summaryOrdersQuery = supabase
      .from('orders')
      .select('id,status,total,currency,created_at')
      .eq('buyer_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(summaryWindowLimit);

    const notificationsQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', context.user.id)
      .is('read_at', null);

    const conversationsQuery = supabase
      .from('chat_threads')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${context.user.id},seller_id.eq.${context.user.id}`);

    const wishlistsQuery = supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', context.user.id);

    const [
      totalOrdersResult,
      summaryOrdersResult,
      notificationsResult,
      conversationsResult,
      wishlistsResult
    ] = await Promise.all([
      totalOrdersQuery,
      summaryOrdersQuery,
      notificationsQuery,
      conversationsQuery,
      wishlistsQuery
    ]);

    if (totalOrdersResult.error) throw totalOrdersResult.error;
    if (summaryOrdersResult.error) throw summaryOrdersResult.error;
    if (notificationsResult.error) throw notificationsResult.error;
    if (conversationsResult.error) throw conversationsResult.error;
    if (wishlistsResult.error) throw wishlistsResult.error;

    const summaryOrders = summaryOrdersResult.data || [];
    const recentOrders = summaryOrders.slice(0, recentLimit);
    const summaryOrderIds = summaryOrders.map((order) => order.id).filter(Boolean);

    let orderItems = [];
    if (summaryOrderIds.length > 0) {
      const orderItemsResult = await supabase
        .from('order_items')
        .select('id,order_id,item_id,listing_type,quantity,rental_end,metadata')
        .in('order_id', summaryOrderIds);
      if (orderItemsResult.error) throw orderItemsResult.error;
      orderItems = orderItemsResult.data || [];
    }

    const wishlistIds = (wishlistsResult.data || []).map((row) => row.id).filter(Boolean);
    let wishlistItemsCount = 0;
    if (wishlistIds.length > 0) {
      const wishlistItemsResult = await supabase
        .from('wishlist_items')
        .select('id', { count: 'exact', head: true })
        .in('wishlist_id', wishlistIds);
      if (wishlistItemsResult.error) throw wishlistItemsResult.error;
      wishlistItemsCount = wishlistItemsResult.count || 0;
    }

    const orderStatusMap = new Map(summaryOrders.map((order) => [order.id, order.status]));
    const orderItemCountMap = new Map();
    const rentalItemCountMap = new Map();
    const saleItemCountMap = new Map();
    const orderQuantityMap = new Map();

    orderItems.forEach((row) => {
      const orderId = row.order_id;
      const listingType = String(row.listing_type || '').toLowerCase();
      const quantity = Number(row.quantity || 1);

      orderItemCountMap.set(orderId, (orderItemCountMap.get(orderId) || 0) + 1);
      orderQuantityMap.set(orderId, (orderQuantityMap.get(orderId) || 0) + quantity);

      if (listingType === 'rent') {
        rentalItemCountMap.set(orderId, (rentalItemCountMap.get(orderId) || 0) + 1);
      } else {
        saleItemCountMap.set(orderId, (saleItemCountMap.get(orderId) || 0) + 1);
      }
    });

    const activeStatuses = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered']);
    const pendingStatuses = new Set(['pending', 'confirmed', 'processing']);
    const completedStatuses = new Set(['delivered', 'completed']);

    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemIdsForUpcoming = [];
    const upcomingRentalsRaw = [];
    let activeRentals = 0;
    let totalPurchases = 0;

    orderItems.forEach((row) => {
      const orderStatus = String(orderStatusMap.get(row.order_id) || '').toLowerCase();
      const listingType = String(row.listing_type || '').toLowerCase();
      if (listingType === 'rent' && activeStatuses.has(orderStatus)) {
        activeRentals += Number(row.quantity || 1);

        if (row.rental_end) {
          const rentalEnd = new Date(row.rental_end);
          if (rentalEnd >= now && rentalEnd <= inSevenDays) {
            upcomingRentalsRaw.push({
              orderId: row.order_id,
              orderItemId: row.id,
              itemId: row.item_id || null,
              rentalEnd: row.rental_end,
              quantity: Number(row.quantity || 1),
              metadata: normalizeJsonObject(row.metadata)
            });
            if (row.item_id) itemIdsForUpcoming.push(row.item_id);
          }
        }
      } else if (listingType !== 'rent') {
        totalPurchases += Number(row.quantity || 1);
      }
    });

    const uniqueItemIds = Array.from(new Set(itemIdsForUpcoming.filter(Boolean)));
    const itemTitleMap = new Map();
    if (uniqueItemIds.length > 0) {
      const itemsResult = await supabase
        .from('items')
        .select('id,title')
        .in('id', uniqueItemIds);
      if (itemsResult.error) throw itemsResult.error;
      (itemsResult.data || []).forEach((item) => itemTitleMap.set(item.id, item.title || 'Item'));
    }

    const upcomingReturns = upcomingRentalsRaw
      .sort((a, b) => new Date(a.rentalEnd).getTime() - new Date(b.rentalEnd).getTime())
      .slice(0, 10)
      .map((entry) => ({
        orderId: entry.orderId,
        orderItemId: entry.orderItemId,
        itemId: entry.itemId,
        itemTitle: itemTitleMap.get(entry.itemId) || entry.metadata?.itemTitle || 'Item',
        rentalEnd: entry.rentalEnd,
        quantity: entry.quantity
      }));

    const pendingOrders = summaryOrders.filter((order) => pendingStatuses.has(String(order.status || '').toLowerCase())).length;
    const completedOrders = summaryOrders.filter((order) => completedStatuses.has(String(order.status || '').toLowerCase())).length;

    const recentOrdersPayload = recentOrders.map((order) => ({
      id: order.id,
      status: order.status,
      total: Number(order.total || 0),
      currency: order.currency || 'USD',
      createdAt: order.created_at,
      itemCount: orderItemCountMap.get(order.id) || 0,
      quantityTotal: orderQuantityMap.get(order.id) || 0,
      rentalItems: rentalItemCountMap.get(order.id) || 0,
      saleItems: saleItemCountMap.get(order.id) || 0
    }));

    return res.json({
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalOrders: totalOrdersResult.count || 0,
          pendingOrders,
          completedOrders,
          activeRentals,
          upcomingReturns: upcomingReturns.length,
          totalPurchases,
          wishlistItems: wishlistItemsCount,
          unreadNotifications: notificationsResult.count || 0,
          conversations: conversationsResult.count || 0
        },
        recentOrders: recentOrdersPayload,
        upcomingReturns
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load buyer dashboard.' });
  }
});

app.get('/dashboard/seller', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const recentLimit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 30);

    const contentAssetTypes = ['creator_post', 'creator_video', 'reel', 'story', 'short', 'marketing_asset'];
    const [storesResult, itemsResult, orderItemsResult, unreadMessagesResult, contentAssetsResult] = await Promise.all([
      supabase
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', context.user.id),
      supabase
        .from('items')
        .select('id,title,stock,views,status,category_id,store_id,created_at')
        .eq('seller_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('order_items')
        .select('id,order_id,item_id,quantity,unit_price,created_at,listing_type')
        .eq('seller_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', context.user.id)
        .eq('type', 'message')
        .is('read_at', null),
      supabase
        .from('uploaded_assets')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', context.user.id)
        .eq('status', 'active')
        .in('asset_type', contentAssetTypes)
    ]);

    if (storesResult.error) throw storesResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (orderItemsResult.error) throw orderItemsResult.error;
    if (unreadMessagesResult.error) throw unreadMessagesResult.error;
    if (contentAssetsResult.error) throw contentAssetsResult.error;

    const items = itemsResult.data || [];
    const orderItems = orderItemsResult.data || [];

    const orderIds = Array.from(new Set(orderItems.map((row) => row.order_id).filter(Boolean)));
    let orders = [];
    if (orderIds.length > 0) {
      const ordersResult = await supabase
        .from('orders')
        .select('id,status,currency,created_at,total')
        .in('id', orderIds)
        .order('created_at', { ascending: false });
      if (ordersResult.error) throw ordersResult.error;
      orders = ordersResult.data || [];
    }

    const categoryIds = Array.from(new Set(items.map((item) => item.category_id).filter(Boolean)));
    const categoryNameById = new Map();
    if (categoryIds.length > 0) {
      const categoriesResult = await supabase
        .from('categories')
        .select('id,name')
        .in('id', categoryIds);
      if (categoriesResult.error) throw categoriesResult.error;
      (categoriesResult.data || []).forEach((row) => categoryNameById.set(row.id, row.name || 'Uncategorized'));
    }

    const itemById = new Map(items.map((item) => [item.id, item]));
    const orderById = new Map(orders.map((order) => [order.id, order]));

    const orderItemCountByOrderId = new Map();
    const orderQuantityByOrderId = new Map();

    orderItems.forEach((row) => {
      const orderId = row.order_id;
      const quantity = Number(row.quantity || 1);
      orderItemCountByOrderId.set(orderId, (orderItemCountByOrderId.get(orderId) || 0) + 1);
      orderQuantityByOrderId.set(orderId, (orderQuantityByOrderId.get(orderId) || 0) + quantity);
    });

    const pendingStatuses = new Set(['pending', 'confirmed', 'processing']);
    const completedStatuses = new Set(['delivered', 'completed']);
    const excludedStatuses = new Set(['cancelled', 'refunded']);

    const months = [];
    const monthTotals = new Map();
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label: monthLabel });
      monthTotals.set(key, 0);
    }

    const categoryTotals = new Map();
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let totalSalesUnits = 0;

    orderItems.forEach((row) => {
      const order = orderById.get(row.order_id);
      const orderStatus = String(order?.status || '').toLowerCase();
      const quantity = Number(row.quantity || 1);
      const unitPrice = Number(row.unit_price || 0);
      const amount = quantity * unitPrice;

      if (pendingStatuses.has(orderStatus)) {
        pendingOrders += quantity;
      }

      if (completedStatuses.has(orderStatus)) {
        completedOrders += quantity;
      }

      if (excludedStatuses.has(orderStatus)) return;

      totalRevenue += amount;
      totalSalesUnits += quantity;

      const monthDate = new Date(order?.created_at || row.created_at || now.toISOString());
      const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
      if (monthTotals.has(monthKey)) {
        monthTotals.set(monthKey, monthTotals.get(monthKey) + amount);
      }

      const linkedItem = itemById.get(row.item_id);
      const categoryName = categoryNameById.get(linkedItem?.category_id) || 'Uncategorized';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + quantity);
    });

    const totalViews = items.reduce((sum, item) => sum + Number(item.views || 0), 0);
    const conversionRate = totalViews > 0
      ? Number(((completedOrders / totalViews) * 100).toFixed(2))
      : 0;

    const lowStockItems = items
      .filter((item) => Number(item.stock || 0) <= 5 && String(item.status || 'active').toLowerCase() !== 'archived')
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        title: item.title || 'Untitled item',
        stock: Number(item.stock || 0),
        status: item.status || 'active'
      }));

    const recentOrders = orders
      .slice(0, recentLimit)
      .map((order) => ({
        id: order.id,
        status: order.status || 'pending',
        total: Number(order.total || 0),
        currency: order.currency || 'USD',
        createdAt: order.created_at || new Date().toISOString(),
        itemCount: orderItemCountByOrderId.get(order.id) || 0,
        quantityTotal: orderQuantityByOrderId.get(order.id) || 0
      }));

    const earningsByMonth = months.map((month) => ({
      month: month.label,
      earnings: Number((monthTotals.get(month.key) || 0).toFixed(2))
    }));

    const categorySales = Array.from(categoryTotals.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const hasStore = (storesResult.count || 0) > 0;
    const hasProducts = items.length > 0;
    const hasContent = (contentAssetsResult.count || 0) > 0;
    const hasApps = false;

    const insights = [];
    if (!hasStore) {
      insights.push({
        id: 'setup-store',
        type: 'marketing',
        message: 'Create your store to unlock storefront analytics and branded checkout.',
        actionLabel: 'Set up store',
        actionLink: '/profile/store'
      });
    }
    if (!hasProducts) {
      insights.push({
        id: 'setup-products',
        type: 'marketing',
        message: 'Add your first product so customers can discover and order from your profile.',
        actionLabel: 'Add product',
        actionLink: '/profile/products/new'
      });
    }
    if (lowStockItems.length > 0) {
      insights.push({
        id: 'inventory-low',
        type: 'inventory',
        message: `${lowStockItems.length} items are low in stock and may stop converting soon.`,
        actionLabel: 'Manage inventory',
        actionLink: '/profile/products'
      });
    }
    if (conversionRate > 0 && conversionRate < 2) {
      insights.push({
        id: 'conversion-low',
        type: 'pricing',
        message: 'Conversion is below 2%. Review pricing and product media to improve performance.',
        actionLabel: 'Open analytics',
        actionLink: '/profile/analytics/advanced'
      });
    }
    if (pendingOrders > 0) {
      insights.push({
        id: 'orders-pending',
        type: 'marketing',
        message: `${pendingOrders} order units need fulfillment attention.`,
        actionLabel: 'Review orders',
        actionLink: '/profile/sales'
      });
    }

    return res.json({
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          pendingOrders,
          completedOrders,
          totalSalesUnits,
          totalViews,
          conversionRate,
          lowStockCount: lowStockItems.length,
          unreadMessages: unreadMessagesResult.count || 0
        },
        earningsByMonth,
        categorySales,
        recentOrders,
        lowStockItems,
        insights,
        setup: {
          hasStore,
          hasProducts,
          hasContent,
          hasApps
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load seller dashboard.' });
  }
});

app.get('/personas', requireAuth, async (req, res) => {
  const { firebase_uid, type, status, limit = '100' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
  const requesterFirebaseUid = getRequestFirebaseUid(req);

  let query = supabase
    .from('personas')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (requesterFirebaseUid) {
    query = query.eq('firebase_uid', requesterFirebaseUid);
  } else if (firebase_uid) {
    query = query.eq('firebase_uid', firebase_uid);
  }
  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data, count });
});

app.post('/personas', requireAuth, async (req, res) => {
  const payload = normalizeJsonObject(req.body);
  const upsert = req.query.upsert === '1' || req.query.upsert === 'true';
  const requesterFirebaseUid = getRequestFirebaseUid(req);

  if (requesterFirebaseUid) {
    const requesterUserId = await resolveUserIdFromFirebaseUid(requesterFirebaseUid);
    if (!requesterUserId) {
      return res.status(400).json({ error: 'Requester user not found.' });
    }
    if (payload.firebase_uid && payload.firebase_uid !== requesterFirebaseUid) {
      return res.status(403).json({ error: 'Cannot create persona for another user.' });
    }
    if (payload.user_id && payload.user_id !== requesterUserId) {
      return res.status(403).json({ error: 'Cannot create persona for another user.' });
    }
    payload.firebase_uid = requesterFirebaseUid;
    payload.user_id = requesterUserId;
  }

  let query = supabase.from('personas');
  query = upsert
    ? query.upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
    : query.insert(payload);

  const { data, error } = await query.select('*');
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ data });
});

app.patch('/personas/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const payload = normalizeJsonObject(req.body);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    delete payload.user_id;
    delete payload.firebase_uid;
  }

  const { data, error } = await supabase.from('personas').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post('/personas/:id/switch', strictAuthRateLimiter, requireAuth, async (req, res) => {
  const { id } = req.params;
  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const { data, error } = await supabase.from('personas').select('*').eq('id', id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Persona not found' });
  return res.json({ data, switched_at: new Date().toISOString() });
});

app.post('/personas/:id/capability-requests', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { capability, notes } = req.body || {};

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  if (!capability) {
    return res.status(400).json({ error: 'capability is required' });
  }

  const payload = {
    persona_id: id,
    capability,
    notes: notes || null,
    status: 'pending'
  };

  const { data, error } = await supabase.from('persona_capability_requests').insert(payload).select('*').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ data });
});

app.get('/personas/:id/notifications', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { limit = '50' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('persona_notifications')
    .select('*')
    .eq('persona_id', id)
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post('/personas/:id/notifications/read', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('persona_notifications')
    .update({ read_at: readAt })
    .eq('persona_id', id)
    .is('read_at', null)
    .select('*');

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data, read_at: readAt });
});

const DEFAULT_ACTIVITY_PREFERENCES = {
  itemView: true,
  cartAdd: true,
  purchase: true,
  rent: true,
  auctionWin: true,
  instantAlert: true,
  dailyDigest: true
};

const ACTION_TO_PREFERENCE_KEY = {
  item_view: 'itemView',
  cart_add: 'cartAdd',
  purchase: 'purchase',
  rent: 'rent',
  auction_win: 'auctionWin'
};

const normalizeActivityPreferences = (raw = {}) => ({
  ...DEFAULT_ACTIVITY_PREFERENCES,
  ...(raw && typeof raw === 'object' ? raw : {})
});

const buildActivityNotificationBody = ({ action, actorName, itemTitle, quantity }) => {
  const safeActor = actorName || 'Someone';
  const safeItem = itemTitle || 'your listing';
  const qty = quantity ? ` x${quantity}` : '';

  if (action === 'cart_add') return `${safeActor} added ${safeItem} to cart${qty}.`;
  if (action === 'purchase') return `${safeActor} purchased ${safeItem}${qty}.`;
  if (action === 'rent') return `${safeActor} rented ${safeItem}${qty}.`;
  if (action === 'auction_win') return `${safeActor} won the auction for ${safeItem}.`;
  return `${safeActor} viewed ${safeItem}.`;
};

app.post('/activity/events', requireAuth, async (req, res) => {
  const {
    action,
    owner_firebase_uid,
    owner_persona_id,
    actor_firebase_uid,
    actor_persona_id,
    actor_name,
    item_id,
    item_title,
    listing_type,
    quantity,
    duration_ms,
    metadata = {}
  } = req.body || {};

  if (!action || !owner_firebase_uid || !item_id) {
    return res.status(400).json({ error: 'action, owner_firebase_uid, and item_id are required' });
  }

  const ownerUserId = await resolveUserIdFromFirebaseUid(owner_firebase_uid);
  if (!ownerUserId) {
    return res.status(400).json({ error: 'Owner user not found' });
  }

  const actorUserId = actor_firebase_uid ? await resolveUserIdFromFirebaseUid(actor_firebase_uid) : null;

  const { data: itemRow } = await supabase
    .from('items')
    .select('id,title,owner_persona_id,metadata')
    .eq('id', item_id)
    .maybeSingle();

  const ownerPersonaId = owner_persona_id || itemRow?.owner_persona_id || null;
  const itemTitle = item_title || itemRow?.title || 'Item';
  const activityPreferences = normalizeActivityPreferences(itemRow?.metadata?.activityPreferences || {});
  const actionPreferenceKey = ACTION_TO_PREFERENCE_KEY[action] || null;
  const allowsActionNotification = actionPreferenceKey ? activityPreferences[actionPreferenceKey] !== false : true;
  const shouldSendInstantAlert = allowsActionNotification && activityPreferences.instantAlert !== false;

  const details = {
    ownerFirebaseUid: owner_firebase_uid,
    ownerPersonaId,
    actorFirebaseUid: actor_firebase_uid || null,
    actorPersonaId: actor_persona_id || null,
    actorName: actor_name || null,
    itemId: item_id,
    itemTitle,
    listingType: listing_type || null,
    quantity: quantity || null,
    durationMs: duration_ms || null,
    metadata: metadata || {}
  };

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_user_id: actorUserId,
      action,
      entity_type: 'item',
      entity_id: owner_firebase_uid,
      details
    })
    .select('*')
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });

  if (shouldSendInstantAlert) {
    const notificationBody = buildActivityNotificationBody({
      action,
      actorName: actor_name,
      itemTitle,
      quantity
    });

    if (ownerPersonaId) {
      await supabase.from('persona_notifications').insert({
        persona_id: ownerPersonaId,
        type: 'listing',
        title: 'Listing activity',
        body: notificationBody,
        link: `/item/${item_id}`
      });
    }

    const { data: ownerNotification } = await supabase.from('notifications').insert({
      user_id: ownerUserId,
      type: 'listing',
      title: 'Listing activity',
      body: notificationBody,
      link: `/item/${item_id}`
    }).select('*').maybeSingle();
    if (ownerNotification) scheduleWhatsAppForNotifications(ownerNotification, req);
    if (ownerNotification) scheduleEmailForNotifications(ownerNotification, req);
  }

  try {
    await analyticsEngine.enqueueFromActivity({
      action,
      ownerPersonaId,
      ownerFirebaseUid: owner_firebase_uid,
      ownerUserId,
      actorUserId,
      actorFirebaseUid: actor_firebase_uid || null,
      actorPersonaId: actor_persona_id || null,
      actorName: actor_name || null,
      itemId: item_id,
      itemTitle,
      listingType: listing_type || null,
      quantity: quantity || null,
      durationMs: duration_ms || null,
      metadata: {
        ...(metadata || {}),
        source: metadata?.source || 'activity',
        referrer: metadata?.referrer || null,
        deviceType: metadata?.deviceType || metadata?.device_type || null,
        sessionId: metadata?.sessionId || metadata?.session_id || null,
        urlPath: metadata?.urlPath || metadata?.url_path || null,
        amount: metadata?.amount || null,
        currency: metadata?.currency || null
      },
      createdAt: data?.created_at || new Date().toISOString(),
      amount: metadata?.amount || null,
      currency: metadata?.currency || null,
      req
    });
  } catch (analyticsError) {
    console.warn('Activity analytics enqueue failed:', analyticsError?.message || analyticsError);
  }

  return res.status(201).json({ data });
});

app.get('/activity/owner/:personaId', requireAuth, async (req, res) => {
  const { personaId } = req.params;
  const { limit = '100' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 1000);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(personaId, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .contains('details', { ownerPersonaId: personaId })
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data: data || [] });
});

app.get('/activity/summary/:personaId', requireAuth, async (req, res) => {
  const { personaId } = req.params;

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(personaId, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, details, created_at')
    .contains('details', { ownerPersonaId: personaId })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return res.status(400).json({ error: error.message });

  const rows = data || [];
  const viewRows = rows.filter((row) => row.action === 'item_view');
  const totalViewMs = viewRows.reduce((sum, row) => sum + Number(row?.details?.durationMs || 0), 0);

  const summary = {
    totalEvents: rows.length,
    views: viewRows.length,
    cartAdds: rows.filter((row) => row.action === 'cart_add').length,
    purchases: rows.filter((row) => row.action === 'purchase').length,
    rentals: rows.filter((row) => row.action === 'rent').length,
    auctionWins: rows.filter((row) => row.action === 'auction_win').length,
    averageViewSeconds: viewRows.length ? Math.round(totalViewMs / viewRows.length / 1000) : 0
  };

  return res.json({ data: summary });
});

// OmniWork V1 endpoints
app.post('/work/listings', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const title = toNullableText(body.title);
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const providerSnapshotInput = normalizeJsonObject(body.providerSnapshot || body.provider_snapshot);
    const normalizedStatus = normalizeWorkListingStatus(body.status, 'draft');
    const providerSnapshot = {
      id: context.user.id,
      name: providerSnapshotInput.name || context.user.name || 'Provider',
      avatar: providerSnapshotInput.avatar || context.user.avatar_url || '/icons/urbanprime.svg',
      rating: parsePositiveNumber(providerSnapshotInput.rating, 0),
      reviews: Array.isArray(providerSnapshotInput.reviews) ? providerSnapshotInput.reviews : []
    };

    const payload = {
      seller_id: context.user.id,
      seller_persona_id: body.sellerPersonaId || body.seller_persona_id || null,
      title,
      description: toNullableText(body.description) || '',
      category: toNullableText(body.category) || 'general',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      pricing_type: toNullableText(body.pricingType || body.pricing_type) || 'fixed',
      base_price: parsePositiveNumber(body.basePrice ?? body.base_price, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      packages: Array.isArray(body.packages) ? body.packages : [],
      skills: Array.isArray(body.skills) ? body.skills : [],
      media: Array.isArray(body.media) ? body.media : (Array.isArray(body.imageUrls) ? body.imageUrls : []),
      availability: normalizeJsonObject(body.availability),
      details: normalizeJsonObject(body.details),
      provider_snapshot: providerSnapshot,
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizedStatus,
      visibility: toNullableText(body.visibility) || 'public',
      review_notes: toNullableText(body.reviewNotes || body.review_notes),
      submitted_at: normalizedStatus === 'pending_review' ? new Date().toISOString() : null,
      reviewed_at: ['published', 'rejected'].includes(normalizedStatus) ? new Date().toISOString() : null,
      published_at: normalizedStatus === 'published' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('work_listings')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_created',
      entityType: 'work_listing',
      entityId: data.id,
      details: {
        mode: data.mode,
        fulfillmentKind: data.fulfillment_kind,
        status: data.status
      }
    });

    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create work listing.' });
  }
});

app.get('/work/listings', async (req, res) => {
  try {
    const {
      status,
      sellerId,
      mode,
      category,
      q,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = supabase
      .from('work_listings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', normalizeWorkListingStatus(status, 'published'));
    if (sellerId) query = query.eq('seller_id', sellerId);
    if (mode) query = query.eq('mode', normalizeWorkMode(mode, 'hybrid'));
    if (category) query = query.eq('category', category);
    if (q && typeof q === 'string') query = query.ilike('title', `%${q}%`);

    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ data: data || [], count: count || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to list work listings.' });
  }
});

app.get('/work/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('work_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Work listing not found' });
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load work listing.' });
  }
});

app.patch('/work/listings/:id', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const existingLookup = await supabase
      .from('work_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (existingLookup.error) throw existingLookup.error;
    if (!existingLookup.data) return res.status(404).json({ error: 'Work listing not found' });
    if (String(existingLookup.data.seller_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to update this listing.' });
    }

    const updates = {};
    if (body.title !== undefined) updates.title = toNullableText(body.title) || existingLookup.data.title;
    if (body.description !== undefined) updates.description = toNullableText(body.description) || '';
    if (body.category !== undefined) updates.category = toNullableText(body.category) || 'general';
    if (body.mode !== undefined) updates.mode = normalizeWorkMode(body.mode, existingLookup.data.mode || 'hybrid');
    if (body.fulfillmentKind !== undefined || body.fulfillment_kind !== undefined) {
      updates.fulfillment_kind = normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, existingLookup.data.fulfillment_kind || 'hybrid');
    }
    if (body.pricingType !== undefined || body.pricing_type !== undefined) {
      updates.pricing_type = toNullableText(body.pricingType || body.pricing_type) || 'fixed';
    }
    if (body.basePrice !== undefined || body.base_price !== undefined) {
      updates.base_price = parsePositiveNumber(body.basePrice ?? body.base_price, 0);
    }
    if (body.currency !== undefined) updates.currency = normalizeCurrencyCode(body.currency, existingLookup.data.currency || 'USD');
    if (body.timezone !== undefined) updates.timezone = toNullableText(body.timezone) || existingLookup.data.timezone || 'UTC';
    if (body.packages !== undefined) updates.packages = Array.isArray(body.packages) ? body.packages : [];
    if (body.skills !== undefined) updates.skills = Array.isArray(body.skills) ? body.skills : [];
    if (body.media !== undefined || body.imageUrls !== undefined) {
      updates.media = Array.isArray(body.media) ? body.media : (Array.isArray(body.imageUrls) ? body.imageUrls : []);
    }
    if (body.availability !== undefined) updates.availability = normalizeJsonObject(body.availability);
    if (body.details !== undefined) updates.details = normalizeJsonObject(body.details);
    if (body.providerSnapshot !== undefined || body.provider_snapshot !== undefined) {
      updates.provider_snapshot = {
        ...normalizeJsonObject(existingLookup.data.provider_snapshot),
        ...normalizeJsonObject(body.providerSnapshot || body.provider_snapshot)
      };
    }
    if (body.riskScore !== undefined || body.risk_score !== undefined) {
      updates.risk_score = parsePositiveNumber(body.riskScore ?? body.risk_score, 0);
    }
    if (body.visibility !== undefined) updates.visibility = toNullableText(body.visibility) || 'public';
    if (body.reviewNotes !== undefined || body.review_notes !== undefined) {
      updates.review_notes = toNullableText(body.reviewNotes || body.review_notes);
    }
    if (body.status !== undefined) {
      updates.status = normalizeWorkListingStatus(body.status, existingLookup.data.status || 'draft');
      if (updates.status === 'pending_review') updates.submitted_at = new Date().toISOString();
      if (updates.status === 'published') updates.published_at = new Date().toISOString();
      if (['published', 'rejected'].includes(updates.status)) updates.reviewed_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_listings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_updated',
      entityType: 'work_listing',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update work listing.' });
  }
});

app.post('/work/listings/:id/submit', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const lookup = await supabase
      .from('work_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (lookup.error) throw lookup.error;
    if (!lookup.data) return res.status(404).json({ error: 'Work listing not found' });
    if (String(lookup.data.seller_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to submit this listing.' });
    }

    const updates = {
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('work_listings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_submitted',
      entityType: 'work_listing',
      entityId: id,
      details: { status: 'pending_review' }
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to submit work listing.' });
  }
});

app.post('/work/listings/:id/approve', requireAuth, async (req, res) => {
  try {
    const context = await resolveAdminContext(req);
    if (context.error) {
      return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const updates = {
      status: 'published',
      review_notes: toNullableText(body.reviewNotes || body.review_notes),
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('work_listings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Work listing not found' });

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_approved',
      entityType: 'work_listing',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to approve work listing.' });
  }
});

app.post('/work/listings/:id/reject', requireAuth, async (req, res) => {
  try {
    const context = await resolveAdminContext(req);
    if (context.error) {
      return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const updates = {
      status: 'rejected',
      review_notes: toNullableText(body.reviewNotes || body.review_notes),
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('work_listings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Work listing not found' });

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_rejected',
      entityType: 'work_listing',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to reject work listing.' });
  }
});

app.post('/work/provider-applications', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const requestedStatus = normalizeProviderApplicationStatus(
      body.status,
      body.submit ? 'submitted' : 'draft'
    );
    const payload = {
      user_id: context.user.id,
      provider_persona_id: toNullableText(body.providerPersonaId || body.provider_persona_id),
      business_name: toNullableText(body.businessName || body.business_name),
      business_type: toNullableText(body.businessType || body.business_type),
      bio: toNullableText(body.bio) || '',
      service_categories: Array.isArray(body.serviceCategories || body.service_categories)
        ? (body.serviceCategories || body.service_categories).map((entry) => String(entry).trim()).filter(Boolean)
        : [],
      languages: Array.isArray(body.languages) ? body.languages.map((entry) => String(entry).trim()).filter(Boolean) : [],
      years_experience: parsePositiveNumber(body.yearsExperience ?? body.years_experience, 0),
      service_area: Array.isArray(body.serviceArea || body.service_area) ? (body.serviceArea || body.service_area) : [],
      response_sla_hours: parsePositiveNumber(body.responseSlaHours ?? body.response_sla_hours, 24),
      payout_ready: Boolean(body.payoutReady ?? body.payout_ready),
      website: toNullableText(body.website),
      documents: Array.isArray(body.documents) ? body.documents : [],
      portfolio: Array.isArray(body.portfolio) ? body.portfolio : [],
      onboarding_progress: parsePositiveNumber(body.onboardingProgress ?? body.onboarding_progress, 0),
      status: requestedStatus,
      notes: toNullableText(body.notes),
      reviewer_notes: toNullableText(body.reviewerNotes || body.reviewer_notes),
      submitted_at: ['submitted', 'under_review'].includes(requestedStatus) ? new Date().toISOString() : null,
      reviewed_at: ['approved', 'rejected'].includes(requestedStatus) ? new Date().toISOString() : null
    };

    const existingLookup = await supabase
      .from('work_provider_applications')
      .select('*')
      .eq('user_id', context.user.id)
      .maybeSingle();
    if (existingLookup.error) throw existingLookup.error;

    const operation = existingLookup.data
      ? supabase
          .from('work_provider_applications')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existingLookup.data.id)
          .select('*')
          .maybeSingle()
      : supabase
          .from('work_provider_applications')
          .insert(payload)
          .select('*')
          .maybeSingle();

    const { data, error } = await operation;
    if (error) throw error;

    await upsertProviderPersonaForUser(context.user, requestedStatus === 'approved' ? 'active' : 'pending', {
      bio: payload.bio,
      displayName: payload.business_name || context.user.name || 'Provider',
      settings: {
        applicationStatus: requestedStatus,
        serviceCategories: payload.service_categories,
        serviceArea: payload.service_area,
        payoutReady: payload.payout_ready,
        onboardingProgress: payload.onboarding_progress
      },
      verification: {
        level: requestedStatus === 'approved' ? 'verified' : 'pending'
      }
    });

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: context.user.id,
        about: payload.bio || null,
        business_name: payload.business_name || null,
        business_description: payload.business_type || null,
        is_provider: requestedStatus === 'approved'
      }, { onConflict: 'user_id' })
      .throwOnError();

    const [enrichedApplication] = await enrichProviderApplicationsWithUserRows([data]);

    await mirrorWorkCollectionRecord('work_provider_applications', data.id, enrichedApplication);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: existingLookup.data ? 'provider_application_updated' : 'provider_application_created',
      entityType: 'work_provider_application',
      entityId: data.id,
      details: { status: data.status }
    });

    return res.status(existingLookup.data ? 200 : 201).json({ data: enrichedApplication });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to save provider application.' });
  }
});

app.get('/work/provider-applications', requireAuth, async (req, res) => {
  try {
    const context = await resolveAdminContext(req);
    const isAdmin = !context.error;
    const safeContext = isAdmin ? context : await getUserContext(req);
    if (safeContext.error) {
      return res.status(400).json({ error: safeContext.error.message || 'Unable to resolve user context.' });
    }

    const { userId, status, limit = '100', offset = '0' } = req.query;
    let query = supabase
      .from('work_provider_applications')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false });

    if (status) query = query.eq('status', normalizeProviderApplicationStatus(status, 'submitted'));
    if (isAdmin) {
      if (userId) query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_id', safeContext.user.id);
    }

    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 200);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    const enrichedRows = await enrichProviderApplicationsWithUserRows(data || []);
    return res.json({ data: enrichedRows, count: count || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load provider applications.' });
  }
});

app.get('/work/provider-applications/:id', requireAuth, async (req, res) => {
  try {
    const adminContext = await resolveAdminContext(req);
    const isAdmin = !adminContext.error;
    const userContext = isAdmin ? adminContext : await getUserContext(req);
    if (userContext.error) {
      return res.status(400).json({ error: userContext.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const { data, error } = await supabase
      .from('work_provider_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Provider application not found' });
    if (!isAdmin && String(data.user_id || '') !== String(userContext.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to this application.' });
    }
    const [enrichedApplication] = await enrichProviderApplicationsWithUserRows([data]);
    return res.json({ data: enrichedApplication });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load provider application.' });
  }
});

app.patch('/work/provider-applications/:id', requireAuth, async (req, res) => {
  try {
    const adminContext = await resolveAdminContext(req);
    const isAdmin = !adminContext.error;
    const userContext = isAdmin ? adminContext : await getUserContext(req);
    if (userContext.error) {
      return res.status(400).json({ error: userContext.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const existingLookup = await supabase
      .from('work_provider_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (existingLookup.error) throw existingLookup.error;
    if (!existingLookup.data) return res.status(404).json({ error: 'Provider application not found' });

    const isOwner = String(existingLookup.data.user_id || '') === String(userContext.user.id || '');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to update this application.' });
    }

    const nextStatus = body.status !== undefined
      ? normalizeProviderApplicationStatus(body.status, existingLookup.data.status || 'draft')
      : existingLookup.data.status || 'draft';
    if (!isAdmin && body.status !== undefined && !['draft', 'submitted'].includes(nextStatus)) {
      return res.status(403).json({ error: 'Only admins can set this application status.' });
    }

    const updates = {
      business_name: body.businessName !== undefined || body.business_name !== undefined
        ? toNullableText(body.businessName || body.business_name)
        : existingLookup.data.business_name,
      business_type: body.businessType !== undefined || body.business_type !== undefined
        ? toNullableText(body.businessType || body.business_type)
        : existingLookup.data.business_type,
      bio: body.bio !== undefined ? toNullableText(body.bio) || '' : existingLookup.data.bio,
      service_categories: body.serviceCategories !== undefined || body.service_categories !== undefined
        ? (Array.isArray(body.serviceCategories || body.service_categories) ? (body.serviceCategories || body.service_categories) : [])
        : existingLookup.data.service_categories,
      languages: body.languages !== undefined
        ? (Array.isArray(body.languages) ? body.languages : [])
        : existingLookup.data.languages,
      years_experience: body.yearsExperience !== undefined || body.years_experience !== undefined
        ? parsePositiveNumber(body.yearsExperience ?? body.years_experience, 0)
        : existingLookup.data.years_experience,
      service_area: body.serviceArea !== undefined || body.service_area !== undefined
        ? (Array.isArray(body.serviceArea || body.service_area) ? (body.serviceArea || body.service_area) : [])
        : existingLookup.data.service_area,
      response_sla_hours: body.responseSlaHours !== undefined || body.response_sla_hours !== undefined
        ? parsePositiveNumber(body.responseSlaHours ?? body.response_sla_hours, 24)
        : existingLookup.data.response_sla_hours,
      payout_ready: body.payoutReady !== undefined || body.payout_ready !== undefined
        ? Boolean(body.payoutReady ?? body.payout_ready)
        : existingLookup.data.payout_ready,
      website: body.website !== undefined ? toNullableText(body.website) : existingLookup.data.website,
      documents: body.documents !== undefined ? (Array.isArray(body.documents) ? body.documents : []) : existingLookup.data.documents,
      portfolio: body.portfolio !== undefined ? (Array.isArray(body.portfolio) ? body.portfolio : []) : existingLookup.data.portfolio,
      onboarding_progress: body.onboardingProgress !== undefined || body.onboarding_progress !== undefined
        ? parsePositiveNumber(body.onboardingProgress ?? body.onboarding_progress, 0)
        : existingLookup.data.onboarding_progress,
      status: nextStatus,
      notes: body.notes !== undefined ? toNullableText(body.notes) : existingLookup.data.notes,
      reviewer_notes: body.reviewerNotes !== undefined || body.reviewer_notes !== undefined
        ? toNullableText(body.reviewerNotes || body.reviewer_notes)
        : existingLookup.data.reviewer_notes,
      submitted_at: nextStatus === 'submitted'
        ? (existingLookup.data.submitted_at || new Date().toISOString())
        : existingLookup.data.submitted_at,
      reviewed_at: ['approved', 'rejected'].includes(nextStatus)
        ? new Date().toISOString()
        : existingLookup.data.reviewed_at,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('work_provider_applications')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    const applicantLookup = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user_id)
      .maybeSingle();
    if (applicantLookup.error) throw applicantLookup.error;

    if (applicantLookup.data) {
      await upsertProviderPersonaForUser(applicantLookup.data, nextStatus === 'approved' ? 'active' : 'pending', {
        bio: data.bio,
        displayName: data.business_name || applicantLookup.data.name || 'Provider',
        settings: {
          applicationStatus: nextStatus,
          serviceCategories: data.service_categories,
          serviceArea: data.service_area,
          payoutReady: data.payout_ready,
          onboardingProgress: data.onboarding_progress
        },
        verification: {
          level: nextStatus === 'approved' ? 'verified' : 'pending'
        }
      });

      await supabase
        .from('user_profiles')
        .upsert({
          user_id: applicantLookup.data.id,
          about: data.bio || null,
          business_name: data.business_name || null,
          business_description: data.business_type || null,
          is_provider: nextStatus === 'approved'
        }, { onConflict: 'user_id' })
        .throwOnError();
    }

    const [enrichedApplication] = await enrichProviderApplicationsWithUserRows([data]);

    await mirrorWorkCollectionRecord('work_provider_applications', data.id, enrichedApplication);
    await writeAuditLog({
      actorUserId: userContext.user.id,
      action: 'provider_application_status_updated',
      entityType: 'work_provider_application',
      entityId: data.id,
      details: { status: data.status }
    });

    return res.json({ data: enrichedApplication });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update provider application.' });
  }
});

app.post('/work/requests', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const title = toNullableText(body.title);
    const brief = toNullableText(body.brief);
    if (!title || !brief) {
      return res.status(400).json({ error: 'title and brief are required' });
    }

    const listingId = body.listingId || body.listing_id || null;
    const requestType = normalizeWorkRequestType(body.requestType || body.request_type || body?.details?.requestType, 'quote');
    let targetProviderId = body.targetProviderId || body.target_provider_id || null;
    if (!targetProviderId && listingId) {
      const listingLookup = await supabase
        .from('work_listings')
        .select('seller_id')
        .eq('id', listingId)
        .maybeSingle();
      if (listingLookup.error) throw listingLookup.error;
      targetProviderId = listingLookup.data?.seller_id || null;
    }

    const payload = {
      requester_id: context.user.id,
      requester_persona_id: body.requesterPersonaId || body.requester_persona_id || null,
      requester_snapshot: {
        id: context.user.id,
        name: context.user.name || 'Client',
        avatar: context.user.avatar_url || '/icons/urbanprime.svg'
      },
      title,
      brief,
      listing_id: listingId,
      target_provider_id: targetProviderId,
      category: toNullableText(body.category) || 'general',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      budget_min: parsePositiveNumber(body.budgetMin ?? body.budget_min, 0),
      budget_max: parsePositiveNumber(body.budgetMax ?? body.budget_max, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      location: normalizeJsonObject(body.location),
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      request_type: requestType,
      details: normalizeJsonObject(body.details),
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkRequestStatus(body.status, 'open'),
      scheduled_at: body.scheduledAt || body.scheduled_at || null
    };

    const { data, error } = await supabase
      .from('work_requests')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await mirrorWorkCollectionRecord('work_requests', data.id, data);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_request_created',
      entityType: 'work_request',
      entityId: data.id,
      details: {
        mode: data.mode,
        fulfillmentKind: data.fulfillment_kind,
        targetProviderId: data.target_provider_id || null
      }
    });

    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create work request.' });
  }
});

app.get('/work/requests', requireAuth, async (req, res) => {
  try {
    const {
      status,
      requesterId,
      targetProviderId,
      mode,
      category,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = supabase
      .from('work_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', normalizeWorkRequestStatus(status, 'open'));
    if (requesterId) query = query.eq('requester_id', requesterId);
    if (targetProviderId) query = query.eq('target_provider_id', targetProviderId);
    if (mode) query = query.eq('mode', normalizeWorkMode(mode, 'hybrid'));
    if (category) query = query.eq('category', category);

    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({ data: data || [], count: count || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to list work requests.' });
  }
});

app.post('/work/bookings', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const listingId = body.listingId || body.listing_id;
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const listingLookup = await supabase
      .from('work_listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();
    if (listingLookup.error) throw listingLookup.error;
    const listing = listingLookup.data;
    if (!listing) return res.status(404).json({ error: 'Work listing not found' });

    const packages = Array.isArray(listing.packages) ? listing.packages : [];
    const packageId = body.packageId || body.package_id || null;
    const selectedPackage = packages.find((entry) => String(entry?.id || '') === String(packageId || '')) || packages[0] || null;
    const amount = parsePositiveNumber(
      body.amount ?? body.totalAmount ?? body.total_amount ?? selectedPackage?.price ?? listing.base_price,
      0
    );
    if (amount <= 0) {
      return res.status(400).json({ error: 'A positive booking amount is required.' });
    }

    const scheduledAt = body.scheduledAt || body.scheduled_at || null;
    const timezone = toNullableText(body.timezone) || listing.timezone || 'UTC';
    const currency = normalizeCurrencyCode(body.currency, listing.currency || 'USD');
    const brief = toNullableText(body.brief) || toNullableText(body.description) || toNullableText(body.notes) || `Booking for ${listing.title}`;
    const requestDetails = {
      ...normalizeJsonObject(body.details),
      requestType: 'booking',
      packageId: selectedPackage?.id || packageId || null,
      packageName: selectedPackage?.name || null,
      packageType: selectedPackage?.type || null,
      desiredDate: body.desiredDate || null,
      desiredTime: body.desiredTime || null,
      schedulingNotes: toNullableText(body.notes),
      serviceAddress: normalizeJsonObject(body.serviceAddress || body.service_address)
    };

    const requestInsert = await supabase
      .from('work_requests')
      .insert({
        requester_id: context.user.id,
        requester_persona_id: body.requesterPersonaId || body.requester_persona_id || null,
        requester_snapshot: {
          id: context.user.id,
          name: context.user.name || 'Client',
          avatar: context.user.avatar_url || '/icons/urbanprime.svg'
        },
        title: toNullableText(body.title) || `${listing.title} booking`,
        brief,
        listing_id: listing.id,
        target_provider_id: listing.seller_id,
        category: listing.category || 'general',
        mode: normalizeWorkMode(listing.mode, 'hybrid'),
        fulfillment_kind: normalizeFulfillmentKind(listing.fulfillment_kind, 'hybrid'),
        budget_min: amount,
        budget_max: amount,
        currency,
        timezone,
        location: normalizeJsonObject(body.location || body.serviceAddress || body.service_address),
        requirements: Array.isArray(body.requirements) ? body.requirements : [],
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        request_type: 'booking',
        details: requestDetails,
        risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, listing.risk_score || 0),
        status: 'open',
        scheduled_at: scheduledAt
      })
      .select('*')
      .maybeSingle();
    if (requestInsert.error) throw requestInsert.error;

    const engagementInsert = await supabase
      .from('work_engagements')
      .insert({
        source_type: 'booking',
        source_id: 'pending',
        mode: normalizeWorkMode(listing.mode, 'hybrid'),
        fulfillment_kind: normalizeFulfillmentKind(listing.fulfillment_kind, 'hybrid'),
        buyer_id: context.user.id,
        buyer_persona_id: body.requesterPersonaId || body.requester_persona_id || null,
        provider_id: listing.seller_id,
        provider_persona_id: listing.seller_persona_id || null,
        currency,
        timezone,
        gross_amount: amount,
        escrow_status: 'none',
        risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, listing.risk_score || 0),
        status: 'created',
        metadata: {
          listingId: listing.id,
          requestId: requestInsert.data.id,
          packageId: selectedPackage?.id || null
        }
      })
      .select('*')
      .maybeSingle();
    if (engagementInsert.error) throw engagementInsert.error;

    const contractInsert = await supabase
      .from('work_contracts')
      .insert({
        request_id: requestInsert.data.id,
        listing_id: listing.id,
        engagement_id: engagementInsert.data.id,
        client_id: context.user.id,
        client_persona_id: body.requesterPersonaId || body.requester_persona_id || null,
        client_snapshot: {
          id: context.user.id,
          name: context.user.name || 'Client',
          avatar: context.user.avatar_url || '/icons/urbanprime.svg'
        },
        provider_id: listing.seller_id,
        provider_persona_id: listing.seller_persona_id || null,
        provider_snapshot: normalizeJsonObject(listing.provider_snapshot),
        scope: brief,
        mode: normalizeWorkMode(listing.mode, 'hybrid'),
        fulfillment_kind: normalizeFulfillmentKind(listing.fulfillment_kind, 'hybrid'),
        currency,
        timezone,
        total_amount: amount,
        escrow_held: 0,
        risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, listing.risk_score || 0),
        status: 'pending',
        terms: normalizeJsonObject(body.terms),
        start_at: scheduledAt,
        due_at: scheduledAt
      })
      .select('*')
      .maybeSingle();
    if (contractInsert.error) throw contractInsert.error;

    await supabase
      .from('work_engagements')
      .update({
        source_id: contractInsert.data.id,
        escrow_status: 'held',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', engagementInsert.data.id);

    const escrowInsert = await supabase
      .from('work_escrow_ledger')
      .insert({
        engagement_id: engagementInsert.data.id,
        contract_id: contractInsert.data.id,
        payer_id: context.user.id,
        payee_id: listing.seller_id,
        action: 'hold',
        amount,
        currency,
        status: 'succeeded',
        metadata: {
          listingId: listing.id,
          requestId: requestInsert.data.id,
          packageId: selectedPackage?.id || null
        }
      })
      .select('*')
      .maybeSingle();
    if (escrowInsert.error) throw escrowInsert.error;

    await supabase
      .from('work_contracts')
      .update({
        escrow_held: amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractInsert.data.id);

    await mirrorWorkCollectionRecord('work_requests', requestInsert.data.id, requestInsert.data);
    await mirrorWorkCollectionRecord('work_contracts', contractInsert.data.id, {
      ...contractInsert.data,
      escrow_held: amount
    });

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_booking_created',
      entityType: 'work_contract',
      entityId: contractInsert.data.id,
      details: {
        requestId: requestInsert.data.id,
        listingId: listing.id,
        amount
      }
    });

    return res.status(201).json({
      data: {
        request: requestInsert.data,
        engagement: { ...engagementInsert.data, source_id: contractInsert.data.id, escrow_status: 'held', status: 'active' },
        contract: { ...contractInsert.data, escrow_held: amount },
        escrow: escrowInsert.data
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create booking workflow.' });
  }
});

app.post('/work/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const requestLookup = await supabase
      .from('work_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (requestLookup.error) throw requestLookup.error;
    const requestRow = requestLookup.data;
    if (!requestRow) return res.status(404).json({ error: 'Work request not found' });
    if (String(requestRow.target_provider_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to accept this request.' });
    }

    const acceptedAt = new Date().toISOString();
    const requestUpdate = await supabase
      .from('work_requests')
      .update({
        status: 'matched',
        accepted_at: acceptedAt,
        updated_at: acceptedAt
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (requestUpdate.error) throw requestUpdate.error;

    let contract = null;
    const contractLookup = await supabase
      .from('work_contracts')
      .select('*')
      .eq('request_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;

    if (contractLookup.data) {
      const contractUpdate = await supabase
        .from('work_contracts')
        .update({
          status: 'active',
          start_at: contractLookup.data.start_at || acceptedAt,
          updated_at: acceptedAt
        })
        .eq('id', contractLookup.data.id)
        .select('*')
        .maybeSingle();
      if (contractUpdate.error) throw contractUpdate.error;
      contract = contractUpdate.data;

      if (contract.engagement_id) {
        await supabase
          .from('work_engagements')
          .update({
            status: 'active',
            updated_at: acceptedAt
          })
          .eq('id', contract.engagement_id);
      }
    } else {
      const listingLookup = requestRow.listing_id
        ? await supabase.from('work_listings').select('*').eq('id', requestRow.listing_id).maybeSingle()
        : { data: null, error: null };
      if (listingLookup.error) throw listingLookup.error;
      const listing = listingLookup.data || null;

      const engagementInsert = await supabase
        .from('work_engagements')
        .insert({
          source_type: requestRow.request_type === 'booking' ? 'booking' : 'service_request',
          source_id: 'pending',
          mode: requestRow.mode || 'hybrid',
          fulfillment_kind: requestRow.fulfillment_kind || 'hybrid',
          buyer_id: requestRow.requester_id,
          buyer_persona_id: requestRow.requester_persona_id || null,
          provider_id: requestRow.target_provider_id,
          provider_persona_id: listing?.seller_persona_id || null,
          currency: requestRow.currency || 'USD',
          timezone: requestRow.timezone || 'UTC',
          gross_amount: Number(requestRow.budget_max || requestRow.budget_min || 0),
          escrow_status: 'none',
          risk_score: Number(requestRow.risk_score || 0),
          status: 'active',
          metadata: {
            requestId: requestRow.id,
            listingId: requestRow.listing_id || null
          }
        })
        .select('*')
        .maybeSingle();
      if (engagementInsert.error) throw engagementInsert.error;

      const providerLookup = await supabase
        .from('users')
        .select('id,name,avatar_url')
        .eq('id', requestRow.target_provider_id)
        .maybeSingle();
      if (providerLookup.error) throw providerLookup.error;

      const contractInsert = await supabase
        .from('work_contracts')
        .insert({
          request_id: requestRow.id,
          listing_id: requestRow.listing_id || null,
          engagement_id: engagementInsert.data.id,
          client_id: requestRow.requester_id,
          client_persona_id: requestRow.requester_persona_id || null,
          client_snapshot: normalizeJsonObject(requestRow.requester_snapshot),
          provider_id: requestRow.target_provider_id,
          provider_persona_id: listing?.seller_persona_id || null,
          provider_snapshot: providerLookup.data ? {
            id: providerLookup.data.id,
            name: providerLookup.data.name || 'Provider',
            avatar: providerLookup.data.avatar_url || '/icons/urbanprime.svg'
          } : {},
          scope: requestRow.brief || requestRow.title || 'Service request',
          mode: requestRow.mode || 'hybrid',
          fulfillment_kind: requestRow.fulfillment_kind || 'hybrid',
          currency: requestRow.currency || 'USD',
          timezone: requestRow.timezone || 'UTC',
          total_amount: Number(requestRow.budget_max || requestRow.budget_min || 0),
          escrow_held: 0,
          risk_score: Number(requestRow.risk_score || 0),
          status: 'active',
          terms: {},
          start_at: acceptedAt,
          due_at: requestRow.scheduled_at || null
        })
        .select('*')
        .maybeSingle();
      if (contractInsert.error) throw contractInsert.error;

      await supabase
        .from('work_engagements')
        .update({
          source_id: contractInsert.data.id,
          updated_at: acceptedAt
        })
        .eq('id', engagementInsert.data.id);

      contract = contractInsert.data;
    }

    await mirrorWorkCollectionRecord('work_requests', requestUpdate.data.id, requestUpdate.data);
    if (contract?.id) {
      await mirrorWorkCollectionRecord('work_contracts', contract.id, contract);
    }

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_request_accepted',
      entityType: 'work_request',
      entityId: id,
      details: { contractId: contract?.id || null }
    });

    return res.json({ data: { request: requestUpdate.data, contract } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to accept work request.' });
  }
});

app.post('/work/requests/:id/decline', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const requestLookup = await supabase
      .from('work_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (requestLookup.error) throw requestLookup.error;
    const requestRow = requestLookup.data;
    if (!requestRow) return res.status(404).json({ error: 'Work request not found' });
    if (String(requestRow.target_provider_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to decline this request.' });
    }

    const body = normalizeJsonObject(req.body);
    const declinedAt = new Date().toISOString();
    const requestUpdate = await supabase
      .from('work_requests')
      .update({
        status: 'cancelled',
        declined_at: declinedAt,
        updated_at: declinedAt,
        details: {
          ...normalizeJsonObject(requestRow.details),
          declineReason: toNullableText(body.reason)
        }
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (requestUpdate.error) throw requestUpdate.error;

    const contractLookup = await supabase
      .from('work_contracts')
      .select('*')
      .eq('request_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;

    let contract = contractLookup.data || null;
    if (contract?.id) {
      await supabase
        .from('work_contracts')
        .update({
          status: 'cancelled',
          updated_at: declinedAt
        })
        .eq('id', contract.id);

      if (contract.engagement_id) {
        const heldAmount = parsePositiveNumber(contract.escrow_held, 0);
        if (heldAmount > 0) {
          await supabase.from('work_escrow_ledger').insert({
            engagement_id: contract.engagement_id,
            contract_id: contract.id,
            payer_id: contract.provider_id || context.user.id,
            payee_id: contract.client_id || null,
            action: 'refund',
            amount: heldAmount,
            currency: contract.currency || 'USD',
            status: 'succeeded',
            metadata: {
              reason: toNullableText(body.reason) || 'Provider declined request'
            }
          });
        }

        await supabase
          .from('work_engagements')
          .update({
            escrow_status: heldAmount > 0 ? 'refunded' : 'none',
            status: 'cancelled',
            updated_at: declinedAt
          })
          .eq('id', contract.engagement_id);
      }

      contract = {
        ...contract,
        status: 'cancelled',
        escrow_held: 0,
        updated_at: declinedAt
      };
    }

    await mirrorWorkCollectionRecord('work_requests', requestUpdate.data.id, requestUpdate.data);
    if (contract?.id) {
      await mirrorWorkCollectionRecord('work_contracts', contract.id, contract);
    }

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_request_declined',
      entityType: 'work_request',
      entityId: id,
      details: { reason: toNullableText(body.reason) }
    });

    return res.json({ data: { request: requestUpdate.data, contract } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to decline work request.' });
  }
});

app.post('/work/proposals', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const requestId = body.requestId || body.request_id || null;
    let requestRow = null;

    if (requestId) {
      const requestLookup = await supabase
        .from('work_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();
      if (requestLookup.error) throw requestLookup.error;
      requestRow = requestLookup.data;
      if (!requestRow) {
        return res.status(404).json({ error: 'Work request not found' });
      }
      if (String(requestRow.target_provider_id || '') !== String(context.user.id || '')) {
        return res.status(403).json({ error: 'You do not have access to propose on this request.' });
      }
      if (['matched', 'cancelled', 'closed'].includes(String(requestRow.status || '').toLowerCase())) {
        return res.status(409).json({ error: 'This lead can no longer receive proposals.' });
      }
      const requestDetails = normalizeJsonObject(requestRow.details);
      const requestType = String(requestRow.request_type || requestDetails.requestType || '').toLowerCase();
      if (requestType === 'booking') {
        return res.status(409).json({ error: 'Booking leads should be accepted directly.' });
      }
    }

    const listingId = body.listingId || body.listing_id || requestRow?.listing_id || null;
    if (listingId) {
      const listingLookup = await supabase
        .from('work_listings')
        .select('id,status')
        .eq('id', listingId)
        .maybeSingle();
      if (listingLookup.error) throw listingLookup.error;
      if (!listingLookup.data || String(listingLookup.data.status || '') !== 'published') {
        return res.status(409).json({ error: 'Linked listing is no longer available.' });
      }
    }

    const clientId = body.clientId || body.client_id || requestRow?.requester_id || null;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    let existingProposal = null;
    if (requestId) {
      const existingLookup = await supabase
        .from('work_proposals')
        .select('*')
        .eq('request_id', requestId)
        .eq('provider_id', context.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingLookup.error) throw existingLookup.error;
      existingProposal = existingLookup.data || null;
      if (existingProposal?.status === 'accepted') {
        return res.status(409).json({ error: 'This proposal has already been accepted.' });
      }
    }

    const now = new Date().toISOString();
    const providerSnapshotInput = normalizeJsonObject(body.providerSnapshot);
    const clientSnapshotInput = normalizeJsonObject(body.clientSnapshot || body.client_snapshot);
    const payload = {
      request_id: requestId,
      listing_id: listingId,
      provider_id: context.user.id,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      provider_snapshot: Object.keys(providerSnapshotInput).length ? providerSnapshotInput : {
        id: context.user.id,
        name: context.user.name || 'Provider',
        avatar: context.user.avatar_url || '/icons/urbanprime.svg',
        rating: 0
      },
      client_id: clientId,
      client_persona_id: body.clientPersonaId || body.client_persona_id || requestRow?.requester_persona_id || null,
      client_snapshot: Object.keys(clientSnapshotInput).length ? clientSnapshotInput : normalizeJsonObject(requestRow?.requester_snapshot),
      title: toNullableText(body.title) || 'Proposal',
      cover_letter: toNullableText(body.coverLetter || body.cover_letter) || '',
      price_total: parsePositiveNumber(body.priceTotal ?? body.price_total, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      delivery_days: parsePositiveNumber(body.deliveryDays ?? body.delivery_days, 0),
      milestones: Array.isArray(body.milestones) ? body.milestones : [],
      terms: normalizeJsonObject(body.terms),
      revision_limit: parsePositiveNumber(body.revisionLimit ?? body.revision_limit, 0),
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkProposalStatus(body.status, 'pending'),
      updated_at: now
    };

    const writeResult = existingProposal?.id
      ? await supabase
          .from('work_proposals')
          .update({
            ...payload,
            responded_at: null
          })
          .eq('id', existingProposal.id)
          .select('*')
          .maybeSingle()
      : await supabase
          .from('work_proposals')
          .insert(payload)
          .select('*')
          .maybeSingle();
    if (writeResult.error) throw writeResult.error;
    if (!writeResult.data) {
      return res.status(400).json({ error: 'Unable to save proposal.' });
    }

    let requestUpdate = null;
    if (requestId && payload.status === 'pending') {
      const requestStatusUpdate = await supabase
        .from('work_requests')
        .update({
          status: 'in_review',
          updated_at: now
        })
        .eq('id', requestId)
        .select('*')
        .maybeSingle();
      if (requestStatusUpdate.error) throw requestStatusUpdate.error;
      requestUpdate = requestStatusUpdate.data || null;
    }

    await mirrorWorkCollectionRecord('work_proposals', writeResult.data.id, writeResult.data);
    if (requestUpdate?.id) {
      await mirrorWorkCollectionRecord('work_requests', requestUpdate.id, requestUpdate);
    }

    await writeAuditLog({
      actorUserId: context.user.id,
      action: existingProposal?.id ? 'work_proposal_updated' : 'work_proposal_created',
      entityType: 'work_proposal',
      entityId: writeResult.data.id,
      details: {
        requestId: writeResult.data.request_id,
        listingId: writeResult.data.listing_id,
        status: writeResult.data.status,
        priceTotal: writeResult.data.price_total
      }
    });

    return res.status(existingProposal?.id ? 200 : 201).json({ data: writeResult.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create proposal.' });
  }
});

app.patch('/work/proposals/:id', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const existingLookup = await supabase
      .from('work_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (existingLookup.error) throw existingLookup.error;
    const existingProposal = existingLookup.data;
    if (!existingProposal) return res.status(404).json({ error: 'Proposal not found' });
    if (String(existingProposal.provider_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to edit this proposal.' });
    }

    const body = normalizeJsonObject(req.body);
    const now = new Date().toISOString();
    const nextStatus = body.status !== undefined
      ? normalizeWorkProposalStatus(body.status, existingProposal.status || 'pending')
      : existingProposal.status || 'pending';

    if (existingProposal.request_id && nextStatus === 'pending') {
      const requestLookup = await supabase
        .from('work_requests')
        .select('*')
        .eq('id', existingProposal.request_id)
        .maybeSingle();
      if (requestLookup.error) throw requestLookup.error;
      const requestRow = requestLookup.data;
      if (!requestRow) {
        return res.status(404).json({ error: 'Work request not found' });
      }
      if (['matched', 'cancelled', 'closed'].includes(String(requestRow.status || '').toLowerCase())) {
        return res.status(409).json({ error: 'This lead can no longer receive proposals.' });
      }
      const requestDetails = normalizeJsonObject(requestRow.details);
      const requestType = String(requestRow.request_type || requestDetails.requestType || '').toLowerCase();
      if (requestType === 'booking') {
        return res.status(409).json({ error: 'Booking leads should be accepted directly.' });
      }
    }

    const listingId = body.listingId || body.listing_id || existingProposal.listing_id || null;
    if (listingId && nextStatus === 'pending') {
      const listingLookup = await supabase
        .from('work_listings')
        .select('id,status')
        .eq('id', listingId)
        .maybeSingle();
      if (listingLookup.error) throw listingLookup.error;
      if (!listingLookup.data || String(listingLookup.data.status || '') !== 'published') {
        return res.status(409).json({ error: 'Linked listing is no longer available.' });
      }
    }

    const updates = {};
    if (body.status !== undefined) updates.status = nextStatus;
    if (body.title !== undefined) updates.title = toNullableText(body.title) || existingProposal.title || 'Proposal';
    if (body.coverLetter !== undefined || body.cover_letter !== undefined) {
      updates.cover_letter = toNullableText(body.coverLetter || body.cover_letter) || '';
    }
    if (body.priceTotal !== undefined || body.price_total !== undefined) {
      updates.price_total = parsePositiveNumber(body.priceTotal ?? body.price_total, 0);
    }
    if (body.deliveryDays !== undefined || body.delivery_days !== undefined) {
      updates.delivery_days = parsePositiveNumber(body.deliveryDays ?? body.delivery_days, 0);
    }
    if (body.milestones !== undefined) updates.milestones = Array.isArray(body.milestones) ? body.milestones : [];
    if (body.terms !== undefined) updates.terms = normalizeJsonObject(body.terms);
    if (body.revisionLimit !== undefined || body.revision_limit !== undefined) {
      updates.revision_limit = parsePositiveNumber(body.revisionLimit ?? body.revision_limit, 0);
    }
    if (updates.status && ['accepted', 'declined'].includes(updates.status)) {
      updates.responded_at = now;
    }
    if (updates.status === 'pending') {
      updates.responded_at = null;
    }
    updates.updated_at = now;

    const { data, error } = await supabase
      .from('work_proposals')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Proposal not found' });

    let requestUpdate = null;
    if (data.request_id && updates.status === 'pending') {
      const requestStatusUpdate = await supabase
        .from('work_requests')
        .update({
          status: 'in_review',
          updated_at: now
        })
        .eq('id', data.request_id)
        .select('*')
        .maybeSingle();
      if (requestStatusUpdate.error) throw requestStatusUpdate.error;
      requestUpdate = requestStatusUpdate.data || null;
    }

    await mirrorWorkCollectionRecord('work_proposals', data.id, data);
    if (requestUpdate?.id) {
      await mirrorWorkCollectionRecord('work_requests', requestUpdate.id, requestUpdate);
    }

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_proposal_updated',
      entityType: 'work_proposal',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update proposal.' });
  }
});

app.post('/work/proposals/:id/accept', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const proposalLookup = await supabase
      .from('work_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (proposalLookup.error) throw proposalLookup.error;
    const proposal = proposalLookup.data;
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (String(proposal.client_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to accept this proposal.' });
    }
    if (['declined', 'withdrawn', 'expired'].includes(String(proposal.status || '').toLowerCase())) {
      return res.status(409).json({ error: 'This proposal can no longer be accepted.' });
    }

    const now = new Date().toISOString();
    const proposalUpdate = await supabase
      .from('work_proposals')
      .update({
        status: 'accepted',
        responded_at: now,
        updated_at: now
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (proposalUpdate.error) throw proposalUpdate.error;

    let contractLookup = await supabase
      .from('work_contracts')
      .select('*')
      .eq('proposal_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;

    let contract = contractLookup.data || null;
    if (!contract) {
      const requestLookup = proposal.request_id
        ? await supabase.from('work_requests').select('*').eq('id', proposal.request_id).maybeSingle()
        : { data: null, error: null };
      if (requestLookup.error) throw requestLookup.error;
      const requestRow = requestLookup.data || null;
      const listingLookup = proposal.listing_id
        ? await supabase.from('work_listings').select('*').eq('id', proposal.listing_id).maybeSingle()
        : { data: null, error: null };
      if (listingLookup.error) throw listingLookup.error;
      const listing = listingLookup.data || null;

      const engagementInsert = await supabase
        .from('work_engagements')
        .insert({
          source_type: 'contract',
          source_id: 'pending',
          mode: requestRow?.mode || listing?.mode || 'hybrid',
          fulfillment_kind: requestRow?.fulfillment_kind || listing?.fulfillment_kind || 'hybrid',
          buyer_id: proposal.client_id,
          buyer_persona_id: proposal.client_persona_id || null,
          provider_id: proposal.provider_id,
          provider_persona_id: proposal.provider_persona_id || null,
          currency: proposal.currency || 'USD',
          timezone: requestRow?.timezone || listing?.timezone || 'UTC',
          gross_amount: Number(proposal.price_total || 0),
          escrow_status: 'none',
          risk_score: Number(proposal.risk_score || 0),
          status: 'active',
          metadata: {
            proposalId: proposal.id,
            requestId: proposal.request_id || null,
            listingId: proposal.listing_id || null
          }
        })
        .select('*')
        .maybeSingle();
      if (engagementInsert.error) throw engagementInsert.error;

      const contractInsert = await supabase
        .from('work_contracts')
        .insert({
          proposal_id: proposal.id,
          request_id: proposal.request_id || null,
          listing_id: proposal.listing_id || null,
          engagement_id: engagementInsert.data.id,
          client_id: proposal.client_id,
          client_persona_id: proposal.client_persona_id || null,
          client_snapshot: normalizeJsonObject(proposal.client_snapshot),
          provider_id: proposal.provider_id,
          provider_persona_id: proposal.provider_persona_id || null,
          provider_snapshot: normalizeJsonObject(proposal.provider_snapshot),
          scope: toNullableText(proposal.cover_letter) || toNullableText(proposal.title) || 'Accepted proposal',
          mode: normalizeWorkMode(requestRow?.mode || listing?.mode, 'hybrid'),
          fulfillment_kind: normalizeFulfillmentKind(requestRow?.fulfillment_kind || listing?.fulfillment_kind, 'hybrid'),
          currency: normalizeCurrencyCode(proposal.currency, 'USD'),
          timezone: requestRow?.timezone || listing?.timezone || 'UTC',
          total_amount: Number(proposal.price_total || 0),
          escrow_held: 0,
          risk_score: Number(proposal.risk_score || 0),
          status: 'active',
          terms: normalizeJsonObject(proposal.terms),
          due_at: proposal.delivery_days ? new Date(Date.now() + Number(proposal.delivery_days || 0) * 86400000).toISOString() : null
        })
        .select('*')
        .maybeSingle();
      if (contractInsert.error) throw contractInsert.error;

      await supabase
        .from('work_engagements')
        .update({
          source_id: contractInsert.data.id,
          updated_at: now
        })
        .eq('id', engagementInsert.data.id);

      contract = contractInsert.data;
    }

    const heldAmount = parsePositiveNumber(contract.escrow_held, 0);
    const amountToHold = heldAmount > 0 ? 0 : parsePositiveNumber(proposal.price_total, 0);
    if (contract.engagement_id && amountToHold > 0) {
      const escrowInsert = await supabase
        .from('work_escrow_ledger')
        .insert({
          engagement_id: contract.engagement_id,
          contract_id: contract.id,
          payer_id: proposal.client_id,
          payee_id: proposal.provider_id,
          action: 'hold',
          amount: amountToHold,
          currency: proposal.currency || 'USD',
          status: 'succeeded',
          metadata: {
            proposalId: proposal.id
          }
        })
        .select('*')
        .maybeSingle();
      if (escrowInsert.error) throw escrowInsert.error;

      const contractUpdate = await supabase
        .from('work_contracts')
        .update({
          status: 'active',
          escrow_held: amountToHold,
          updated_at: now
        })
        .eq('id', contract.id)
        .select('*')
        .maybeSingle();
      if (contractUpdate.error) throw contractUpdate.error;
      contract = contractUpdate.data;

      await supabase
        .from('work_engagements')
        .update({
          escrow_status: 'held',
          status: 'active',
          updated_at: now
        })
        .eq('id', contract.engagement_id);
    }

    let requestUpdate = null;
    if (proposal.request_id) {
      const requestStatusUpdate = await supabase
        .from('work_requests')
        .update({
          status: 'matched',
          accepted_at: now,
          updated_at: now
        })
        .eq('id', proposal.request_id)
        .select('*')
        .maybeSingle();
      if (requestStatusUpdate.error) throw requestStatusUpdate.error;
      requestUpdate = requestStatusUpdate.data || null;
    }

    await mirrorWorkCollectionRecord('work_proposals', proposalUpdate.data.id, proposalUpdate.data);
    if (requestUpdate?.id) {
      await mirrorWorkCollectionRecord('work_requests', requestUpdate.id, requestUpdate);
    }
    if (contract?.id) {
      await mirrorWorkCollectionRecord('work_contracts', contract.id, contract);
    }

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_proposal_accepted',
      entityType: 'work_proposal',
      entityId: id,
      details: { contractId: contract?.id || null }
    });

    return res.json({ data: { proposal: proposalUpdate.data, contract } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to accept proposal.' });
  }
});

app.post('/work/proposals/:id/decline', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const proposalLookup = await supabase
      .from('work_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (proposalLookup.error) throw proposalLookup.error;
    const proposal = proposalLookup.data;
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (String(proposal.client_id || '') !== String(context.user.id || '')) {
      return res.status(403).json({ error: 'You do not have access to decline this proposal.' });
    }
    if (String(proposal.status || '').toLowerCase() === 'accepted') {
      return res.status(409).json({ error: 'Accepted proposals can no longer be declined.' });
    }

    const now = new Date().toISOString();
    const body = normalizeJsonObject(req.body);
    const { data, error } = await supabase
      .from('work_proposals')
      .update({
        status: 'declined',
        responded_at: now,
        terms: {
          ...normalizeJsonObject(proposal.terms),
          declineReason: toNullableText(body.reason)
        },
        updated_at: now
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    let requestUpdate = null;
    if (proposal.request_id) {
      const requestStatusUpdate = await supabase
        .from('work_requests')
        .update({
          status: 'open',
          updated_at: now
        })
        .eq('id', proposal.request_id)
        .select('*')
        .maybeSingle();
      if (requestStatusUpdate.error) throw requestStatusUpdate.error;
      requestUpdate = requestStatusUpdate.data || null;
    }

    await mirrorWorkCollectionRecord('work_proposals', data.id, data);
    if (requestUpdate?.id) {
      await mirrorWorkCollectionRecord('work_requests', requestUpdate.id, requestUpdate);
    }
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_proposal_declined',
      entityType: 'work_proposal',
      entityId: id,
      details: { reason: toNullableText(body.reason) }
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to decline proposal.' });
  }
});

app.post('/work/contracts', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    let providerId = body.providerId || body.provider_id || null;
    let clientId = body.clientId || body.client_id || null;

    if (body.proposalId || body.proposal_id) {
      const proposalLookup = await supabase
        .from('work_proposals')
        .select('*')
        .eq('id', body.proposalId || body.proposal_id)
        .maybeSingle();
      if (proposalLookup.error) throw proposalLookup.error;
      if (proposalLookup.data) {
        providerId = providerId || proposalLookup.data.provider_id;
        clientId = clientId || proposalLookup.data.client_id;
      }
    }

    if (!providerId || !clientId) {
      return res.status(400).json({ error: 'providerId and clientId are required for contract creation.' });
    }

    const provider = await resolveUserById(providerId);
    const client = await resolveUserById(clientId);

    const engagementPayload = {
      source_type: 'contract',
      source_id: 'pending',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      buyer_id: clientId,
      buyer_persona_id: body.clientPersonaId || body.client_persona_id || null,
      provider_id: providerId,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      gross_amount: parsePositiveNumber(body.totalAmount ?? body.total_amount, 0),
      escrow_status: 'none',
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: 'created',
      metadata: normalizeJsonObject(body.metadata)
    };

    const engagementInsert = await supabase
      .from('work_engagements')
      .insert(engagementPayload)
      .select('*')
      .maybeSingle();
    if (engagementInsert.error) throw engagementInsert.error;

    const contractPayload = {
      proposal_id: body.proposalId || body.proposal_id || null,
      request_id: body.requestId || body.request_id || null,
      listing_id: body.listingId || body.listing_id || null,
      engagement_id: engagementInsert.data.id,
      client_id: clientId,
      client_persona_id: body.clientPersonaId || body.client_persona_id || null,
      client_snapshot: client ? {
        id: client.id,
        name: client.name || 'Client',
        avatar: client.avatar_url || '/icons/urbanprime.svg'
      } : {},
      provider_id: providerId,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      provider_snapshot: provider ? {
        id: provider.id,
        name: provider.name || 'Provider',
        avatar: provider.avatar_url || '/icons/urbanprime.svg'
      } : {},
      scope: toNullableText(body.scope) || '',
      mode: normalizeWorkMode(body.mode, engagementPayload.mode),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, engagementPayload.fulfillment_kind),
      currency: normalizeCurrencyCode(body.currency, engagementPayload.currency),
      timezone: toNullableText(body.timezone) || engagementPayload.timezone,
      total_amount: parsePositiveNumber(body.totalAmount ?? body.total_amount, 0),
      escrow_held: parsePositiveNumber(body.escrowHeld ?? body.escrow_held, 0),
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkContractStatus(body.status, 'pending'),
      terms: normalizeJsonObject(body.terms),
      start_at: body.startAt || body.start_at || null,
      due_at: body.dueAt || body.due_at || null
    };

    const contractInsert = await supabase
      .from('work_contracts')
      .insert(contractPayload)
      .select('*')
      .maybeSingle();
    if (contractInsert.error) throw contractInsert.error;

    await mirrorWorkCollectionRecord('work_contracts', contractInsert.data.id, contractInsert.data);

    await supabase
      .from('work_engagements')
      .update({
        source_id: contractInsert.data.id,
        status: contractInsert.data.status === 'active' ? 'active' : 'created',
        updated_at: new Date().toISOString()
      })
      .eq('id', engagementInsert.data.id);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_contract_created',
      entityType: 'work_contract',
      entityId: contractInsert.data.id,
      details: {
        engagementId: engagementInsert.data.id,
        providerId,
        clientId,
        totalAmount: contractInsert.data.total_amount
      }
    });

    return res.status(201).json({ data: contractInsert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create contract.' });
  }
});

app.patch('/work/contracts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const updates = {};

    if (body.scope !== undefined) updates.scope = toNullableText(body.scope) || '';
    if (body.mode !== undefined) updates.mode = normalizeWorkMode(body.mode, 'hybrid');
    if (body.fulfillmentKind !== undefined || body.fulfillment_kind !== undefined) {
      updates.fulfillment_kind = normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid');
    }
    if (body.currency !== undefined) updates.currency = normalizeCurrencyCode(body.currency, 'USD');
    if (body.timezone !== undefined) updates.timezone = toNullableText(body.timezone) || 'UTC';
    if (body.totalAmount !== undefined || body.total_amount !== undefined) {
      updates.total_amount = parsePositiveNumber(body.totalAmount ?? body.total_amount, 0);
    }
    if (body.escrowHeld !== undefined || body.escrow_held !== undefined) {
      updates.escrow_held = parsePositiveNumber(body.escrowHeld ?? body.escrow_held, 0);
    }
    if (body.terms !== undefined) updates.terms = normalizeJsonObject(body.terms);
    if (body.startAt !== undefined || body.start_at !== undefined) {
      updates.start_at = body.startAt || body.start_at || null;
    }
    if (body.dueAt !== undefined || body.due_at !== undefined) {
      updates.due_at = body.dueAt || body.due_at || null;
    }
    if (body.status !== undefined) {
      updates.status = normalizeWorkContractStatus(body.status, 'pending');
      if (updates.status === 'completed') updates.completed_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_contracts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contract not found' });

    await mirrorWorkCollectionRecord('work_contracts', data.id, data);

    if (data.engagement_id) {
      const nextEngagementStatus = data.status === 'completed'
        ? 'completed'
        : data.status === 'cancelled'
          ? 'cancelled'
          : data.status === 'disputed'
            ? 'disputed'
            : data.status === 'active'
              ? 'active'
              : 'created';
      await supabase
        .from('work_engagements')
        .update({
          status: nextEngagementStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.engagement_id);
    }

    await writeAuditLog({
      actorUserId: req.user?.uid ? (await resolveSupabaseUserId(req.user.uid)) : null,
      action: 'work_contract_updated',
      entityType: 'work_contract',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update contract.' });
  }
});

app.post('/work/contracts/:id/complete', requireAuth, async (req, res) => {
  try {
    const adminContext = await resolveAdminContext(req);
    const isAdmin = !adminContext.error;
    const userContext = isAdmin ? adminContext : await getUserContext(req);
    if (userContext.error) {
      return res.status(400).json({ error: userContext.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const contractLookup = await supabase
      .from('work_contracts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;
    const contract = contractLookup.data;
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const isParticipant = [contract.client_id, contract.provider_id].some((entry) => String(entry || '') === String(userContext.user.id || ''));
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to complete this contract.' });
    }

    const now = new Date().toISOString();
    let nextEscrow = parsePositiveNumber(contract.escrow_held, 0);
    const shouldReleaseEscrow = Boolean(body.releaseEscrow ?? body.release_escrow);
    const releaseAmount = shouldReleaseEscrow
      ? Math.min(nextEscrow, parsePositiveNumber(body.amount ?? body.releaseAmount ?? body.release_amount, nextEscrow))
      : 0;

    if (contract.engagement_id && releaseAmount > 0) {
      const releaseInsert = await supabase
        .from('work_escrow_ledger')
        .insert({
          engagement_id: contract.engagement_id,
          contract_id: contract.id,
          payer_id: contract.client_id,
          payee_id: contract.provider_id,
          action: 'release',
          amount: releaseAmount,
          currency: contract.currency || 'USD',
          status: 'succeeded',
          metadata: normalizeJsonObject(body.metadata)
        })
        .select('*')
        .maybeSingle();
      if (releaseInsert.error) throw releaseInsert.error;
      nextEscrow = Math.max(0, nextEscrow - releaseAmount);
    }

    const updates = {
      status: 'completed',
      completed_at: now,
      escrow_held: nextEscrow,
      updated_at: now
    };
    const { data, error } = await supabase
      .from('work_contracts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    if (contract.engagement_id) {
      await supabase
        .from('work_engagements')
        .update({
          escrow_status: nextEscrow > 0 ? 'partial' : releaseAmount > 0 ? 'released' : contract.escrow_held > 0 ? 'held' : 'none',
          status: 'completed',
          updated_at: now
        })
        .eq('id', contract.engagement_id);
    }

    await mirrorWorkCollectionRecord('work_contracts', data.id, data);
    await writeAuditLog({
      actorUserId: userContext.user.id,
      action: 'work_contract_completed',
      entityType: 'work_contract',
      entityId: id,
      details: {
        releaseAmount
      }
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to complete contract.' });
  }
});

app.post('/work/contracts/:id/dispute', requireAuth, async (req, res) => {
  try {
    const adminContext = await resolveAdminContext(req);
    const isAdmin = !adminContext.error;
    const userContext = isAdmin ? adminContext : await getUserContext(req);
    if (userContext.error) {
      return res.status(400).json({ error: userContext.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const contractLookup = await supabase
      .from('work_contracts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;
    const contract = contractLookup.data;
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const isParticipant = [contract.client_id, contract.provider_id].some((entry) => String(entry || '') === String(userContext.user.id || ''));
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to dispute this contract.' });
    }

    const reason = toNullableText(body.reason);
    if (!reason) {
      return res.status(400).json({ error: 'reason is required' });
    }

    const now = new Date().toISOString();
    const disputeInsert = await supabase
      .from('work_disputes')
      .insert({
        engagement_id: contract.engagement_id,
        contract_id: contract.id,
        opened_by: userContext.user.id,
        against_user_id: String(contract.client_id || '') === String(userContext.user.id || '') ? contract.provider_id : contract.client_id,
        reason,
        summary: toNullableText(body.summary),
        evidence: Array.isArray(body.evidence) ? body.evidence : [],
        ai_summary: null,
        status: 'open',
        resolution: {}
      })
      .select('*')
      .maybeSingle();
    if (disputeInsert.error) throw disputeInsert.error;

    await supabase
      .from('work_contracts')
      .update({
        status: 'disputed',
        updated_at: now
      })
      .eq('id', id);

    if (contract.engagement_id) {
      await supabase
        .from('work_engagements')
        .update({
          status: 'disputed',
          updated_at: now
        })
        .eq('id', contract.engagement_id);
    }

    await writeAuditLog({
      actorUserId: userContext.user.id,
      action: 'work_contract_disputed',
      entityType: 'work_contract',
      entityId: id,
      details: { disputeId: disputeInsert.data.id, reason }
    });

    return res.status(201).json({ data: disputeInsert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to dispute contract.' });
  }
});

app.post('/work/contracts/:id/milestones', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const milestonesInput = Array.isArray(body.milestones)
      ? body.milestones
      : [body];

    const contractLookup = await supabase
      .from('work_contracts')
      .select('id,currency')
      .eq('id', id)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;
    if (!contractLookup.data) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const normalizedRows = milestonesInput
      .map((entry, index) => {
        const item = normalizeJsonObject(entry);
        const title = toNullableText(item.title);
        if (!title) return null;
        return {
          contract_id: id,
          title,
          description: toNullableText(item.description) || '',
          amount: parsePositiveNumber(item.amount, 0),
          currency: normalizeCurrencyCode(item.currency, contractLookup.data.currency || 'USD'),
          due_at: item.dueAt || item.due_at || null,
          sort_order: parsePositiveNumber(item.sortOrder ?? item.sort_order, index),
          status: normalizeMilestoneStatus(item.status, 'pending'),
          deliverables: Array.isArray(item.deliverables) ? item.deliverables : []
        };
      })
      .filter(Boolean);

    if (normalizedRows.length === 0) {
      return res.status(400).json({ error: 'At least one milestone with title is required.' });
    }

    const { data, error } = await supabase
      .from('work_milestones')
      .insert(normalizedRows)
      .select('*');
    if (error) throw error;

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_milestones_created',
      entityType: 'work_contract',
      entityId: id,
      details: { count: data?.length || 0 }
    });

    return res.status(201).json({ data: data || [] });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to add milestones.' });
  }
});

app.post('/work/escrow/hold', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'hold';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementIdInput = body.engagementId || body.engagement_id || null;
    let engagementId = engagementIdInput;
    let contract = null;

    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      engagementId = engagementId || contract?.engagement_id || null;
    }
    if (!engagementId) return res.status(400).json({ error: 'engagementId or contractId is required' });

    const payload = {
      engagement_id: engagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.provider_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: parsePositiveNumber(contract.escrow_held, 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'held',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', engagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_hold',
      entityType: 'work_engagement',
      entityId: engagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to hold escrow.' });
  }
});

app.post('/work/escrow/release', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'release';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementId = body.engagementId || body.engagement_id || null;
    if (!engagementId && !contractId) {
      return res.status(400).json({ error: 'engagementId or contractId is required' });
    }

    let contract = null;
    let resolvedEngagementId = engagementId;
    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      resolvedEngagementId = resolvedEngagementId || contract?.engagement_id || null;
    }
    if (!resolvedEngagementId) {
      return res.status(400).json({ error: 'Unable to resolve engagement for release.' });
    }

    const payload = {
      engagement_id: resolvedEngagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.provider_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      const nextEscrow = Math.max(0, parsePositiveNumber(contract.escrow_held, 0) - amount);
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: nextEscrow,
          status: nextEscrow === 0 && contract.status === 'active' ? 'completed' : contract.status,
          completed_at: nextEscrow === 0 ? new Date().toISOString() : contract.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'released',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedEngagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_release',
      entityType: 'work_engagement',
      entityId: resolvedEngagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to release escrow.' });
  }
});

app.post('/work/escrow/refund', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'refund';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementId = body.engagementId || body.engagement_id || null;
    if (!engagementId && !contractId) {
      return res.status(400).json({ error: 'engagementId or contractId is required' });
    }

    let contract = null;
    let resolvedEngagementId = engagementId;
    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      resolvedEngagementId = resolvedEngagementId || contract?.engagement_id || null;
    }
    if (!resolvedEngagementId) {
      return res.status(400).json({ error: 'Unable to resolve engagement for refund.' });
    }

    const payload = {
      engagement_id: resolvedEngagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || contract?.provider_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.client_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      const nextEscrow = Math.max(0, parsePositiveNumber(contract.escrow_held, 0) - amount);
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: nextEscrow,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'refunded',
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedEngagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_refund',
      entityType: 'work_engagement',
      entityId: resolvedEngagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to refund escrow.' });
  }
});

app.get('/work/provider/summary', requireAuth, async (req, res) => {
  try {
    const adminContext = await resolveAdminContext(req);
    const isAdmin = !adminContext.error;
    const userContext = isAdmin ? adminContext : await getUserContext(req);
    if (userContext.error) {
      return res.status(400).json({ error: userContext.error.message || 'Unable to resolve user context.' });
    }

    const providerId = isAdmin && req.query.providerId ? req.query.providerId : userContext.user.id;
    const [contractsRes, requestsRes, proposalsRes, listingsRes, applicationsRes, ledgerRes] = await Promise.all([
      supabase.from('work_contracts').select('*').eq('provider_id', providerId),
      supabase.from('work_requests').select('*').eq('target_provider_id', providerId),
      supabase.from('work_proposals').select('*').eq('provider_id', providerId),
      supabase.from('work_listings').select('*').eq('seller_id', providerId),
      supabase.from('work_provider_applications').select('*').eq('user_id', providerId).limit(1),
      supabase.from('work_escrow_ledger').select('*').eq('payee_id', providerId)
    ]);

    if (contractsRes.error) throw contractsRes.error;
    if (requestsRes.error) throw requestsRes.error;
    if (proposalsRes.error) throw proposalsRes.error;
    if (listingsRes.error) throw listingsRes.error;
    if (applicationsRes.error) throw applicationsRes.error;
    if (ledgerRes.error) throw ledgerRes.error;

    const contracts = contractsRes.data || [];
    const requests = requestsRes.data || [];
    const proposals = proposalsRes.data || [];
    const listings = listingsRes.data || [];
    const applications = applicationsRes.data || [];
    const ledger = ledgerRes.data || [];
    const completedContracts = contracts.filter((entry) => entry.status === 'completed');
    const activeContracts = contracts.filter((entry) => ['pending', 'active', 'disputed'].includes(String(entry.status || '')));
    const nextBooking = activeContracts
      .map((entry) => entry.start_at || entry.due_at || entry.created_at)
      .filter(Boolean)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

    const held = contracts.reduce((sum, entry) => sum + parsePositiveNumber(entry.escrow_held, 0), 0);
    const released = ledger
      .filter((entry) => String(entry.action || '') === 'release')
      .reduce((sum, entry) => sum + parsePositiveNumber(entry.amount, 0), 0);
    const refunded = ledger
      .filter((entry) => String(entry.action || '') === 'refund')
      .reduce((sum, entry) => sum + parsePositiveNumber(entry.amount, 0), 0);
    const totalEarned = completedContracts.reduce((sum, entry) => sum + parsePositiveNumber(entry.total_amount, 0), 0);

    const data = {
      stats: {
        earnings: totalEarned,
        activeJobs: activeContracts.length,
        jobsCompleted: completedContracts.length,
        averageRating: Number(Math.max(3.5, 5 - Math.min((contracts.length ? contracts.reduce((sum, entry) => sum + parsePositiveNumber(entry.risk_score, 0), 0) / contracts.length : 0) / 20, 1.2)).toFixed(2)),
        responseRate: requests.length > 0
          ? Number(((requests.filter((entry) => entry.status !== 'open').length / requests.length) * 100).toFixed(1))
          : 100
      },
      queues: {
        leads: requests.filter((entry) => entry.status === 'open').length,
        proposals: proposals.filter((entry) => entry.status === 'pending').length,
        activeContracts: activeContracts.length,
        pendingListings: listings.filter((entry) => ['draft', 'pending_review', 'rejected'].includes(String(entry.status || ''))).length,
        pendingApplication: applications.some((entry) => entry.status !== 'approved') ? 1 : 0
      },
      calendar: {
        upcomingBookings: activeContracts.length,
        nextBookingAt: nextBooking || null,
        timezone: listings[0]?.timezone || requests[0]?.timezone || 'UTC'
      },
      escrow: {
        held,
        released,
        refunded
      },
      payouts: {
        available: totalEarned,
        processing: 0,
        pendingRequests: 0,
        totalPaidOut: released
      }
    };

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load provider summary.' });
  }
});

app.post('/work/autopilot/scope', async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await resolveOptionalUserContext(req);
    const body = normalizeJsonObject(req.body);
    const brief = toNullableText(body.brief) || '';
    if (!brief) {
      return res.status(400).json({ error: 'brief is required' });
    }

    const wordCount = brief.split(/\s+/).filter(Boolean).length;
    const complexity = Math.min(5, Math.max(1, Math.round(wordCount / 60)));
    const suggestedTimelineDays = Math.min(45, Math.max(5, complexity * 5));
    const confidence = Number(Math.min(0.95, 0.55 + complexity * 0.08).toFixed(2));

    const output = {
      normalizedRequest: {
        title: toNullableText(body.title) || brief.slice(0, 80) || 'Autopilot generated request',
        brief,
        category: toNullableText(body.category) || 'general',
        mode: normalizeWorkMode(body.mode, 'hybrid'),
        fulfillmentKind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
        budgetMin: parsePositiveNumber(body.budgetMin ?? body.budget_min, 0),
        budgetMax: parsePositiveNumber(body.budgetMax ?? body.budget_max, 0),
        currency: normalizeCurrencyCode(body.currency, 'USD'),
        timezone: toNullableText(body.timezone) || 'UTC',
        requirements: brief
          .split(/[.;\n]/)
          .map((segment) => segment.trim())
          .filter(Boolean)
          .slice(0, 8)
      },
      suggestedMilestones: [
        { title: 'Scope Alignment', amountPct: 20, description: 'Confirm deliverables and project boundaries.' },
        { title: 'Main Delivery', amountPct: 50, description: 'Deliver core output for review.' },
        { title: 'Revision & Handoff', amountPct: 30, description: 'Finalize revisions and transfer all assets.' }
      ],
      suggestedTimelineDays,
      confidence
    };

    const latencyMs = Date.now() - startedAt;
    try {
      await supabase.from('work_autopilot_runs').insert({
        run_type: 'scope',
        actor_user_id: context?.user?.id || null,
        actor_persona_id: body.actorPersonaId || body.actor_persona_id || null,
        request_id: body.requestId || body.request_id || null,
        listing_id: body.listingId || body.listing_id || null,
        contract_id: body.contractId || body.contract_id || null,
        input_payload: body,
        output_payload: output,
        model: 'heuristic-v1',
        status: 'succeeded',
        latency_ms: latencyMs
      });
    } catch (runError) {
      console.warn('Autopilot scope run write failed:', runError?.message || runError);
    }

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to run autopilot scope.' });
  }
});

app.post('/work/autopilot/match', async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await resolveOptionalUserContext(req);
    const body = normalizeJsonObject(req.body);
    const category = toNullableText(body.category);
    const mode = normalizeWorkMode(body.mode, 'hybrid');
    const fulfillmentKind = normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid');
    const limit = Math.min(Math.max(parseInt(String(body.limit || 20), 10) || 20, 1), 50);
    const budgetMin = parsePositiveNumber(body.budgetMin ?? body.budget_min, 0);
    const budgetMax = parsePositiveNumber(body.budgetMax ?? body.budget_max, 0);
    const { requestedSkills, requestedTokens } = buildRequestedMatchSignals(body);

    let listingQuery = supabase
      .from('work_listings')
      .select('*')
      .eq('status', 'published')
      .order('risk_score', { ascending: true })
      .limit(limit * 4);

    if (category) listingQuery = listingQuery.eq('category', category);

    const { data: listings, error } = await listingQuery;
    if (error) throw error;

    const sellerIds = Array.from(new Set((listings || []).map((listing) => String(listing?.seller_id || '').trim()).filter(Boolean)));
    const [providerApplicationsRes, providerUsersRes] = await Promise.all([
      sellerIds.length > 0
        ? supabase.from('work_provider_applications').select('*').in('user_id', sellerIds)
        : Promise.resolve({ data: [], error: null }),
      sellerIds.length > 0
        ? supabase.from('users').select('id,firebase_uid,name,avatar_url').in('id', sellerIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (providerApplicationsRes.error) throw providerApplicationsRes.error;
    if (providerUsersRes.error) throw providerUsersRes.error;

    const providerApplicationMap = new Map();
    (providerApplicationsRes.data || []).forEach((entry) => {
      const key = String(entry?.user_id || '').trim();
      if (!key) return;
      const existing = providerApplicationMap.get(key);
      if (!existing || (entry?.status === 'approved' && existing?.status !== 'approved')) {
        providerApplicationMap.set(key, entry);
      }
    });
    const providerUserMap = new Map((providerUsersRes.data || []).map((entry) => [String(entry.id), entry]));

    const matches = (listings || []).map((listing) => {
      let score = 18;
      const reasons = [];
      const providerApplication = providerApplicationMap.get(String(listing?.seller_id || '').trim()) || null;
      const providerUser = providerUserMap.get(String(listing?.seller_id || '').trim()) || null;
      const listingDetails = normalizeJsonObject(listing?.details);
      const startingPrice = getListingStartingPrice(listing);
      const priceFit = Number(computePriceFitScore(startingPrice, budgetMin, budgetMax).toFixed(2));

      let trustScore = 44;
      const responseSlaHours = parsePositiveNumber(
        listingDetails.responseSlaHours ?? providerApplication?.response_sla_hours,
        0
      );
      const portfolioCount =
        (Array.isArray(providerApplication?.portfolio) ? providerApplication.portfolio.length : 0) +
        (Array.isArray(listingDetails.portfolio) ? listingDetails.portfolio.length : 0);
      const riskScore = parsePositiveNumber(listing?.risk_score, 0);

      if (listing.mode === mode) {
        score += 18;
        reasons.push('Mode aligned');
      } else if (listing.mode === 'hybrid' || mode === 'hybrid') {
        score += 10;
        reasons.push('Flexible mode compatibility');
      }

      if ((listing.fulfillment_kind || 'hybrid') === fulfillmentKind) {
        score += 14;
        reasons.push('Fulfillment aligned');
      } else if ((listing.fulfillment_kind || 'hybrid') === 'hybrid' || fulfillmentKind === 'hybrid') {
        score += 8;
        reasons.push('Hybrid fulfillment compatibility');
      }

      if (category && String(listing.category || '').trim().toLowerCase() === category.toLowerCase()) {
        score += 12;
        reasons.push('Category match');
      }

      const listingSkills = Array.isArray(listing.skills)
        ? listing.skills.map((entry) => String(entry).toLowerCase())
        : [];
      const listingTokens = Array.from(new Set([
        ...listingSkills,
        ...tokenizeWorkMatchText(listing.title),
        ...tokenizeWorkMatchText(listing.description),
        ...tokenizeWorkMatchText(listing.category)
      ]));
      const overlap = requestedSkills.filter((skill) => listingSkills.includes(skill)).length;
      const tokenOverlap = requestedTokens.filter((token) => listingTokens.includes(token)).length;
      if (overlap > 0) {
        score += Math.min(16, overlap * 4);
        reasons.push(`${overlap} requested skill match${overlap > 1 ? 'es' : ''}`);
      } else if (tokenOverlap > 0) {
        score += Math.min(12, tokenOverlap * 3);
        reasons.push('Requirement overlap found');
      }

      if (priceFit >= 85) {
        reasons.push('Budget-friendly starting point');
      } else if (priceFit >= 65) {
        reasons.push('Budget range is workable');
      }

      if (providerApplication?.status === 'approved') {
        trustScore += 24;
        reasons.push('Approved provider');
      }
      if (providerApplication?.payout_ready) {
        trustScore += 12;
        reasons.push('Escrow and payout ready');
      }
      if (portfolioCount > 0) {
        trustScore += Math.min(12, 4 + portfolioCount * 2);
        reasons.push('Portfolio evidence available');
      }
      if (responseSlaHours > 0 && responseSlaHours <= 24) {
        trustScore += 10;
        reasons.push(`Responds within ${responseSlaHours}h`);
      } else if (responseSlaHours > 0 && responseSlaHours <= 48) {
        trustScore += 5;
        reasons.push('Responsive provider lane');
      }
      if (riskScore <= 25) {
        trustScore += 10;
        reasons.push('Low risk profile');
      } else {
        trustScore -= Math.min(16, riskScore / 6);
      }

      trustScore = Math.max(0, Math.min(100, trustScore));
      score += priceFit * 0.14;
      score += trustScore * 0.16;

      const recommendedPath =
        listing.mode === 'instant' || (listing.mode === 'hybrid' && priceFit >= 80 && trustScore >= 72)
          ? 'instant'
          : 'proposal';

      return {
        listing: mapAutopilotListingForClient(listing, providerApplication, providerUser),
        providerId: String(
          providerUser?.firebase_uid ||
          providerUser?.id ||
          listing?.seller_id ||
          ''
        ) || null,
        score: Number(Math.max(0, Math.min(100, score)).toFixed(2)),
        reasons: Array.from(new Set(reasons)).slice(0, 5),
        recommendedPath,
        priceFit,
        trustScore: Number(trustScore.toFixed(2)),
        responseSlaHours: responseSlaHours > 0 ? responseSlaHours : null
      };
    })
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    const output = { matches };
    const latencyMs = Date.now() - startedAt;
    try {
      await supabase.from('work_autopilot_runs').insert({
        run_type: 'match',
        actor_user_id: context?.user?.id || null,
        actor_persona_id: body.actorPersonaId || body.actor_persona_id || null,
        request_id: body.requestId || body.request_id || null,
        input_payload: body,
        output_payload: output,
        model: 'heuristic-match-v2',
        status: 'succeeded',
        latency_ms: latencyMs
      });
    } catch (runError) {
      console.warn('Autopilot match run write failed:', runError?.message || runError);
    }

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to run autopilot match.' });
  }
});

app.post('/work/autopilot/health', requireAuth, async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const [listingsCount, requestsCount, proposalsCount, contractsCount, disputesCount] = await Promise.all([
      supabase.from('work_listings').select('id', { count: 'exact', head: true }),
      supabase.from('work_requests').select('id', { count: 'exact', head: true }),
      supabase.from('work_proposals').select('id', { count: 'exact', head: true }),
      supabase.from('work_contracts').select('id', { count: 'exact', head: true }),
      supabase.from('work_disputes').select('id', { count: 'exact', head: true })
    ]);

    if (listingsCount.error) throw listingsCount.error;
    if (requestsCount.error) throw requestsCount.error;
    if (proposalsCount.error) throw proposalsCount.error;
    if (contractsCount.error) throw contractsCount.error;
    if (disputesCount.error) throw disputesCount.error;

    const output = {
      ok: true,
      engine: 'omniwork-autopilot-v1',
      generatedAt: new Date().toISOString(),
      counters: {
        listings: listingsCount.count || 0,
        requests: requestsCount.count || 0,
        proposals: proposalsCount.count || 0,
        contracts: contractsCount.count || 0,
        disputes: disputesCount.count || 0
      }
    };

    const latencyMs = Date.now() - startedAt;
    await supabase.from('work_autopilot_runs').insert({
      run_type: 'health',
      actor_user_id: context.user.id,
      input_payload: {},
      output_payload: output,
      model: 'omniwork-health-v1',
      status: 'succeeded',
      latency_ms: latencyMs
    });

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to get autopilot health.' });
  }
});

const BRAND_MATCH_AUTO_THRESHOLD = 0.93;
const BRAND_MATCH_REVIEW_THRESHOLD = 0.75;
const BRAND_SELECT_FIELDS = 'id,name,slug,normalized_name,logo_url,cover_url,description,status,verification_level,country,website,story,claimed_by_user_id,created_at,updated_at';
const BRAND_NODE_SELECT_FIELDS = 'id,brand_id,parent_node_id,name,slug,normalized_name,node_type,depth,path,sort_order,status,source,created_at,updated_at';

const classifyBrandCandidate = async (rawBrand) => {
  const normalized = normalizeBrandText(rawBrand);
  if (!normalized) {
    return { normalized, confidence: 0, outcome: 'unresolved', brand: null, source: null };
  }

  const [exactBrandResult, exactAliasResult] = await Promise.all([
    supabase
      .from('brands')
      .select(BRAND_SELECT_FIELDS)
      .eq('normalized_name', normalized)
      .eq('status', 'active')
      .limit(3),
    supabase
      .from('brand_aliases')
      .select('brand_id,normalized_alias,confidence')
      .eq('normalized_alias', normalized)
      .limit(20)
  ]);

  if (exactBrandResult.error) throw exactBrandResult.error;
  if (exactAliasResult.error) throw exactAliasResult.error;

  const exactBrand = (exactBrandResult.data || [])[0];
  if (exactBrand) {
    return {
      normalized,
      confidence: 0.995,
      outcome: 'auto',
      brand: exactBrand,
      source: 'auto_exact_brand'
    };
  }

  const aliasRows = exactAliasResult.data || [];
  const aliasBrandIds = Array.from(new Set(aliasRows.map((row) => String(row.brand_id || '')).filter(Boolean)));
  if (aliasBrandIds.length === 1) {
    const { data: aliasBrand, error: aliasBrandError } = await supabase
      .from('brands')
      .select(BRAND_SELECT_FIELDS)
      .eq('id', aliasBrandIds[0])
      .eq('status', 'active')
      .maybeSingle();
    if (aliasBrandError) throw aliasBrandError;
    if (aliasBrand) {
      return {
        normalized,
        confidence: 0.985,
        outcome: 'auto',
        brand: aliasBrand,
        source: 'auto_exact_alias'
      };
    }
  }

  const primaryToken = normalized.split(' ')[0] || normalized;
  const fuzzyBrandsResult = await supabase
    .from('brands')
    .select(BRAND_SELECT_FIELDS)
    .eq('status', 'active')
    .ilike('normalized_name', `%${primaryToken}%`)
    .limit(250);
  if (fuzzyBrandsResult.error) throw fuzzyBrandsResult.error;
  const fuzzyBrands = fuzzyBrandsResult.data || [];
  if (fuzzyBrands.length === 0) {
    return { normalized, confidence: 0, outcome: 'unresolved', brand: null, source: null };
  }

  const fuzzyBrandIds = fuzzyBrands.map((row) => row.id).filter(Boolean);
  const fuzzyAliasesResult = await supabase
    .from('brand_aliases')
    .select('brand_id,normalized_alias,confidence')
    .in('brand_id', fuzzyBrandIds)
    .limit(2000);
  if (fuzzyAliasesResult.error) throw fuzzyAliasesResult.error;
  const aliasByBrandId = new Map();
  (fuzzyAliasesResult.data || []).forEach((row) => {
    const key = String(row.brand_id || '');
    if (!key) return;
    const list = aliasByBrandId.get(key) || [];
    list.push(row);
    aliasByBrandId.set(key, list);
  });

  let best = { brand: null, confidence: 0, source: 'auto_fuzzy_brand' };
  fuzzyBrands.forEach((brandRow) => {
    const brandScore = scoreBrandSimilarity(normalized, brandRow.normalized_name || brandRow.name);
    let aliasScore = 0;
    const aliasRowsForBrand = aliasByBrandId.get(String(brandRow.id)) || [];
    aliasRowsForBrand.forEach((aliasRow) => {
      const score = scoreBrandSimilarity(normalized, aliasRow.normalized_alias || '');
      if (score > aliasScore) aliasScore = score;
    });
    const score = Math.max(brandScore, aliasScore);
    if (score > best.confidence) {
      best = {
        brand: brandRow,
        confidence: Number(score.toFixed(4)),
        source: aliasScore > brandScore ? 'auto_fuzzy_alias' : 'auto_fuzzy_brand'
      };
    }
  });

  if (!best.brand) {
    return { normalized, confidence: 0, outcome: 'unresolved', brand: null, source: null };
  }

  if (best.confidence >= BRAND_MATCH_AUTO_THRESHOLD) {
    return { normalized, confidence: best.confidence, outcome: 'auto', brand: best.brand, source: best.source };
  }
  if (best.confidence >= BRAND_MATCH_REVIEW_THRESHOLD) {
    return { normalized, confidence: best.confidence, outcome: 'review', brand: best.brand, source: best.source };
  }
  return { normalized, confidence: best.confidence, outcome: 'unresolved', brand: null, source: best.source };
};

const classifyCatalogNodeCandidate = async ({ brandId, rawPath }) => {
  const normalizedPath = String(rawPath || '')
    .split(/[>/|]/g)
    .map((entry) => slugifyPathSegment(entry))
    .filter(Boolean)
    .join('/');

  if (!brandId || !normalizedPath) {
    return { normalizedPath, confidence: 0, outcome: 'unresolved', node: null, source: null };
  }

  const [directPathResult, aliasResult] = await Promise.all([
    supabase
      .from('brand_catalog_nodes')
      .select(BRAND_NODE_SELECT_FIELDS)
      .eq('brand_id', brandId)
      .eq('path', normalizedPath)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('brand_catalog_aliases')
      .select('node_id,normalized_alias,confidence')
      .eq('brand_id', brandId)
      .eq('normalized_alias', normalizeBrandText(rawPath))
      .limit(10)
  ]);

  if (directPathResult.error) throw directPathResult.error;
  if (aliasResult.error) throw aliasResult.error;

  if (directPathResult.data) {
    return {
      normalizedPath,
      confidence: 0.995,
      outcome: 'auto',
      node: directPathResult.data,
      source: 'auto_exact_path'
    };
  }

  const aliasRows = aliasResult.data || [];
  const aliasNodeId = aliasRows[0]?.node_id ? String(aliasRows[0].node_id) : '';
  if (aliasNodeId) {
    const { data: aliasNode, error: aliasNodeError } = await supabase
      .from('brand_catalog_nodes')
      .select(BRAND_NODE_SELECT_FIELDS)
      .eq('id', aliasNodeId)
      .eq('status', 'active')
      .maybeSingle();
    if (aliasNodeError) throw aliasNodeError;
    if (aliasNode) {
      return {
        normalizedPath,
        confidence: 0.985,
        outcome: 'auto',
        node: aliasNode,
        source: 'auto_exact_alias'
      };
    }
  }

  const nodeResult = await supabase
    .from('brand_catalog_nodes')
    .select(BRAND_NODE_SELECT_FIELDS)
    .eq('brand_id', brandId)
    .eq('status', 'active')
    .limit(1200);
  if (nodeResult.error) throw nodeResult.error;
  const nodes = nodeResult.data || [];
  if (nodes.length === 0) {
    return { normalizedPath, confidence: 0, outcome: 'unresolved', node: null, source: null };
  }

  const normalizedPathText = normalizedPath.replace(/\//g, ' ');
  let best = { node: null, confidence: 0, source: 'auto_fuzzy_path' };
  nodes.forEach((node) => {
    const pathScore = scoreBrandSimilarity(normalizedPathText, String(node.path || '').replace(/\//g, ' '));
    const nameScore = scoreBrandSimilarity(normalizedPathText, node.normalized_name || node.name);
    const score = Math.max(pathScore, nameScore);
    if (score > best.confidence) {
      best = {
        node,
        confidence: Number(score.toFixed(4)),
        source: nameScore > pathScore ? 'auto_fuzzy_name' : 'auto_fuzzy_path'
      };
    }
  });

  if (!best.node) {
    return { normalizedPath, confidence: 0, outcome: 'unresolved', node: null, source: null };
  }
  if (best.confidence >= BRAND_MATCH_AUTO_THRESHOLD) {
    return { normalizedPath, confidence: best.confidence, outcome: 'auto', node: best.node, source: best.source };
  }
  if (best.confidence >= BRAND_MATCH_REVIEW_THRESHOLD) {
    return { normalizedPath, confidence: best.confidence, outcome: 'review', node: best.node, source: best.source };
  }
  return { normalizedPath, confidence: best.confidence, outcome: 'unresolved', node: null, source: best.source };
};

app.get('/brands', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const limit = parsePageLimit(req.query.limit, 24, 80);
    const offset = parsePageOffset(req.query.offset);
    const search = String(req.query.search || '').trim();
    const country = String(req.query.country || '').trim();
    const status = String(req.query.status || 'active').trim().toLowerCase();
    const sort = String(req.query.sort || 'name').trim().toLowerCase();

    let query = supabase
      .from('brands')
      .select(BRAND_SELECT_FIELDS, { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status || 'active');
    }

    if (country) {
      query = query.ilike('country', country);
    }

    if (search) {
      const normalized = normalizeBrandText(search);
      query = query.or(`name.ilike.%${search}%,normalized_name.ilike.%${normalized}%`);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data || [];
    const ids = rows.map((row) => row.id).filter(Boolean);
    const [trustMap, statsMap] = await Promise.all([
      loadBrandTrustMap(ids),
      loadBrandStatsMap(ids)
    ]);

    let cards = rows.map((row) => {
      const trust = trustMap.get(String(row.id)) || null;
      const stats = statsMap.get(String(row.id)) || { itemCount: 0, storeCount: 0, followerCount: 0 };
      return {
        ...row,
        trust,
        stats
      };
    });

    if (sort === 'trust') {
      cards = cards.sort((left, right) => Number(right?.trust?.overall_trust_score || 0) - Number(left?.trust?.overall_trust_score || 0));
    } else if (sort === 'followers') {
      cards = cards.sort((left, right) => Number(right?.stats?.followerCount || 0) - Number(left?.stats?.followerCount || 0));
    }

    return res.json({
      data: cards,
      count: count || cards.length,
      limit,
      offset
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brands.' });
  }
});

app.get('/brands/:brandSlug', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brand = await resolveBrandBySlug(req.params.brandSlug);
    if (!brand || (brand.status !== 'active' && req.query.includeInactive !== '1')) {
      return res.status(404).json({ error: 'Brand not found.' });
    }

    const [nodesResult, trustResult, statsMap, priceSummary] = await Promise.all([
      supabase
        .from('brand_catalog_nodes')
        .select(BRAND_NODE_SELECT_FIELDS)
        .eq('brand_id', brand.id)
        .eq('status', 'active')
        .is('parent_node_id', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(200),
      supabase
        .from('brand_trust_signals')
        .select('*')
        .eq('brand_id', brand.id)
        .maybeSingle(),
      loadBrandStatsMap([brand.id]),
      loadBrandPriceSummary(brand.id)
    ]);

    if (nodesResult.error) throw nodesResult.error;
    if (trustResult.error) throw trustResult.error;
    const stats = statsMap.get(String(brand.id)) || { itemCount: 0, storeCount: 0, followerCount: 0 };

    return res.json({
      data: {
        ...brand,
        trust: trustResult.data || null,
        stats,
        priceSummary,
        topNodes: nodesResult.data || []
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand profile.' });
  }
});

app.get('/brands/:brandSlug/tree', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brand = await resolveBrandBySlug(req.params.brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const { data, error } = await supabase
      .from('brand_catalog_nodes')
      .select(BRAND_NODE_SELECT_FIELDS)
      .eq('brand_id', brand.id)
      .eq('status', 'active')
      .order('depth', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(4000);
    if (error) throw error;

    const rows = data || [];
    return res.json({
      data: {
        brand: { id: brand.id, slug: brand.slug, name: brand.name },
        tree: buildBrandCatalogTree(rows),
        flatCount: rows.length
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand tree.' });
  }
});

app.get('/brands/:brandSlug/catalog', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brand = await resolveBrandBySlug(req.params.brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const requestedPath = String(req.query.path || '').trim();
    if (!requestedPath) {
      const { data, error } = await supabase
        .from('brand_catalog_nodes')
        .select(BRAND_NODE_SELECT_FIELDS)
        .eq('brand_id', brand.id)
        .eq('status', 'active')
        .is('parent_node_id', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(400);
      if (error) throw error;
      return res.json({
        data: {
          brand: { id: brand.id, slug: brand.slug, name: brand.name },
          node: null,
          breadcrumbs: [],
          children: data || []
        }
      });
    }

    const node = await resolveCatalogNodeByPath(brand.id, requestedPath);
    if (!node) return res.status(404).json({ error: 'Catalog node not found.' });

    const [childrenResult, trustResult, priceSummary] = await Promise.all([
      supabase
        .from('brand_catalog_nodes')
        .select(BRAND_NODE_SELECT_FIELDS)
        .eq('brand_id', brand.id)
        .eq('parent_node_id', node.id)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(400),
      supabase
        .from('brand_catalog_trust_signals')
        .select('*')
        .eq('node_id', node.id)
        .maybeSingle(),
      loadBrandPriceSummary(brand.id, node.id)
    ]);
    if (childrenResult.error) throw childrenResult.error;
    if (trustResult.error) throw trustResult.error;

    const segments = String(node.path || '').split('/').filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => ({
      name: segment.replace(/-/g, ' '),
      path: segments.slice(0, index + 1).join('/')
    }));

    return res.json({
      data: {
        brand: { id: brand.id, slug: brand.slug, name: brand.name },
        node,
        breadcrumbs,
        trust: trustResult.data || null,
        priceSummary,
        children: childrenResult.data || []
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand catalog node.' });
  }
});

app.get('/brands/:brandSlug/items', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brand = await resolveBrandBySlug(req.params.brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const limit = parsePageLimit(req.query.limit, 30, 120);
    const offset = parsePageOffset(req.query.offset);
    const includeDraft = String(req.query.includeDraft || '').trim() === '1';
    const requestedPath = String(req.query.path || '').trim();

    let nodeId = String(req.query.nodeId || '').trim() || null;
    if (!nodeId && requestedPath) {
      const node = await resolveCatalogNodeByPath(brand.id, requestedPath);
      nodeId = node?.id || null;
      if (!nodeId) {
        return res.status(404).json({ error: 'Catalog path not found for this brand.' });
      }
    }

    let query = supabase
      .from('items')
      .select('id,seller_id,store_id,category_id,title,description,listing_type,status,condition,brand,brand_id,brand_catalog_node_id,currency,sale_price,rental_price,auction_start_price,auction_reserve_price,stock,is_featured,is_verified,metadata,created_at,updated_at', { count: 'exact' })
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeDraft) {
      query = query.eq('status', 'published');
    }
    if (nodeId) {
      query = query.eq('brand_catalog_node_id', nodeId);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({
      data: data || [],
      count: count || 0,
      limit,
      offset,
      filters: {
        brandId: brand.id,
        nodeId
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand items.' });
  }
});

app.get('/brands/:brandSlug/stores', async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brand = await resolveBrandBySlug(req.params.brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const requestedPath = String(req.query.path || '').trim();
    let nodeId = String(req.query.nodeId || '').trim() || null;
    if (!nodeId && requestedPath) {
      const node = await resolveCatalogNodeByPath(brand.id, requestedPath);
      nodeId = node?.id || null;
      if (!nodeId) return res.status(404).json({ error: 'Catalog path not found for this brand.' });
    }

    let itemQuery = supabase
      .from('items')
      .select('store_id,seller_id')
      .eq('brand_id', brand.id)
      .eq('status', 'published')
      .limit(5000);
    if (nodeId) itemQuery = itemQuery.eq('brand_catalog_node_id', nodeId);
    const { data: itemRows, error: itemError } = await itemQuery;
    if (itemError) throw itemError;

    const storeIds = Array.from(new Set((itemRows || []).map((row) => String(row.store_id || '').trim()).filter(Boolean)));
    const sellerIds = Array.from(new Set((itemRows || []).map((row) => String(row.seller_id || '').trim()).filter(Boolean)));

    let stores = [];
    if (storeIds.length > 0) {
      const { data, error } = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,logo_url,cover_url,status,rating,created_at')
        .in('id', storeIds)
        .order('rating', { ascending: false });
      if (error) throw error;
      stores = data || [];
    }

    return res.json({
      data: stores,
      meta: {
        directStoreCount: storeIds.length,
        sellerCount: sellerIds.length
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand stores.' });
  }
});

app.get(/^\/brands\/([^/]+)\/catalog\/(.+)\/items$/, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brandSlug = decodeURIComponent(req.params[0] || '');
    const path = decodeURIComponent(req.params[1] || '');
    const brand = await resolveBrandBySlug(brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const node = await resolveCatalogNodeByPath(brand.id, path);
    if (!node) return res.status(404).json({ error: 'Catalog path not found for this brand.' });

    const limit = parsePageLimit(req.query.limit, 30, 120);
    const offset = parsePageOffset(req.query.offset);
    const includeDraft = String(req.query.includeDraft || '').trim() === '1';

    let query = supabase
      .from('items')
      .select('id,seller_id,store_id,category_id,title,description,listing_type,status,condition,brand,brand_id,brand_catalog_node_id,currency,sale_price,rental_price,auction_start_price,auction_reserve_price,stock,is_featured,is_verified,metadata,created_at,updated_at', { count: 'exact' })
      .eq('brand_id', brand.id)
      .eq('brand_catalog_node_id', node.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (!includeDraft) query = query.eq('status', 'published');

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({
      data: data || [],
      count: count || 0,
      limit,
      offset,
      filters: {
        brandId: brand.id,
        nodeId: node.id,
        path
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand catalog items.' });
  }
});

app.get(/^\/brands\/([^/]+)\/catalog\/(.+)\/stores$/, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brandSlug = decodeURIComponent(req.params[0] || '');
    const path = decodeURIComponent(req.params[1] || '');
    const brand = await resolveBrandBySlug(brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const node = await resolveCatalogNodeByPath(brand.id, path);
    if (!node) return res.status(404).json({ error: 'Catalog path not found for this brand.' });

    const { data: itemRows, error: itemError } = await supabase
      .from('items')
      .select('store_id,seller_id')
      .eq('brand_id', brand.id)
      .eq('brand_catalog_node_id', node.id)
      .eq('status', 'published')
      .limit(5000);
    if (itemError) throw itemError;

    const storeIds = Array.from(new Set((itemRows || []).map((row) => String(row.store_id || '').trim()).filter(Boolean)));
    let stores = [];
    if (storeIds.length > 0) {
      const { data, error } = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,logo_url,cover_url,status,rating,created_at')
        .in('id', storeIds)
        .order('rating', { ascending: false });
      if (error) throw error;
      stores = data || [];
    }

    return res.json({
      data: stores,
      meta: {
        path,
        nodeId: node.id,
        directStoreCount: storeIds.length
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand catalog stores.' });
  }
});

app.get(/^\/brands\/([^/]+)\/catalog\/(.+)$/, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const brandSlug = decodeURIComponent(req.params[0] || '');
    const path = decodeURIComponent(req.params[1] || '');
    const brand = await resolveBrandBySlug(brandSlug);
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const node = await resolveCatalogNodeByPath(brand.id, path);
    if (!node) return res.status(404).json({ error: 'Catalog node not found.' });

    const [childrenResult, trustResult, priceSummary] = await Promise.all([
      supabase
        .from('brand_catalog_nodes')
        .select(BRAND_NODE_SELECT_FIELDS)
        .eq('brand_id', brand.id)
        .eq('parent_node_id', node.id)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(400),
      supabase
        .from('brand_catalog_trust_signals')
        .select('*')
        .eq('node_id', node.id)
        .maybeSingle(),
      loadBrandPriceSummary(brand.id, node.id)
    ]);
    if (childrenResult.error) throw childrenResult.error;
    if (trustResult.error) throw trustResult.error;

    const segments = String(node.path || '').split('/').filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => ({
      name: segment.replace(/-/g, ' '),
      path: segments.slice(0, index + 1).join('/')
    }));

    return res.json({
      data: {
        brand: { id: brand.id, slug: brand.slug, name: brand.name },
        node,
        breadcrumbs,
        trust: trustResult.data || null,
        priceSummary,
        children: childrenResult.data || []
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand catalog node.' });
  }
});

app.post('/brands/suggest', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const rawBrand = toNullableText(body.brand || body.rawBrand || body.name);
    const rawLine = toNullableText(body.line || body.rawLine || body.path);
    if (!rawBrand && !rawLine) {
      return res.status(400).json({ error: 'brand or line suggestion is required.' });
    }

    const suggestionId = randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id: suggestionId,
      user_id: context.user.id,
      item_id: toNullableText(body.itemId || body.item_id),
      brand: rawBrand,
      line: rawLine,
      notes: toNullableText(body.notes),
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    const { error } = await supabase.from('mirror_documents').upsert({
      collection: 'brand_suggestions',
      doc_id: suggestionId,
      data: payload,
      updated_at: now
    }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });
    if (error) throw error;

    return res.status(201).json({ data: payload });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to save suggestion.' });
  }
});

app.get('/brands/:brandId/follow-state', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }
  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    const brandId = String(req.params.brandId || '').trim();
    if (!brandId) return res.status(400).json({ error: 'brandId is required.' });

    const { data, error } = await supabase
      .from('brand_followers')
      .select('id')
      .eq('brand_id', brandId)
      .eq('user_id', context.user.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return res.json({ data: { following: Boolean(data?.id) } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load follow state.' });
  }
});

app.post('/brands/:brandId/follow', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }
  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });

    const brandId = String(req.params.brandId || '').trim();
    if (!brandId) return res.status(400).json({ error: 'brandId is required.' });

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id,status')
      .eq('id', brandId)
      .maybeSingle();
    if (brandError) throw brandError;
    if (!brand || brand.status !== 'active') return res.status(404).json({ error: 'Brand not found.' });

    const { data, error } = await supabase
      .from('brand_followers')
      .upsert({ brand_id: brandId, user_id: context.user.id }, { onConflict: 'brand_id,user_id', ignoreDuplicates: false })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to follow brand.' });
  }
});

app.delete('/brands/:brandId/follow', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }
  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    const brandId = String(req.params.brandId || '').trim();
    if (!brandId) return res.status(400).json({ error: 'brandId is required.' });
    const { error } = await supabase
      .from('brand_followers')
      .delete()
      .eq('brand_id', brandId)
      .eq('user_id', context.user.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to unfollow brand.' });
  }
});

app.post('/brands/:brandId/claim', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }
  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    const brandId = String(req.params.brandId || '').trim();
    if (!brandId) return res.status(400).json({ error: 'brandId is required.' });
    const body = normalizeJsonObject(req.body);

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id,status')
      .eq('id', brandId)
      .maybeSingle();
    if (brandError) throw brandError;
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const { data, error } = await supabase
      .from('brand_claim_requests')
      .insert({
        brand_id: brandId,
        requester_user_id: context.user.id,
        payload: body,
        status: 'pending'
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to submit claim request.' });
  }
});

app.post('/brands/classify-item', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });

    const body = normalizeJsonObject(req.body);
    const itemId = toNullableText(body.itemId || body.item_id);
    const rawBrand = toNullableText(body.brand || body.rawBrand || body.raw_brand || body.name);
    if (!rawBrand) {
      return res.status(400).json({ error: 'raw brand is required.' });
    }

    const classification = await classifyBrandCandidate(rawBrand);
    const now = new Date().toISOString();

    if (itemId) {
      const ownership = await ensureItemOwnedByUser(itemId, context.user.id);
      if (!ownership.item) return res.status(404).json({ error: 'Item not found.' });
      if (!ownership.allowed) return res.status(403).json({ error: 'You can classify only your own item.' });
    }

    if (itemId && classification.outcome === 'auto' && classification.brand) {
      const { error: updateError } = await supabase
        .from('items')
        .update({
          brand: rawBrand,
          brand_id: classification.brand.id,
          brand_match_confidence: classification.confidence,
          brand_match_source: classification.source || 'auto'
        })
        .eq('id', itemId);
      if (updateError) throw updateError;
    }

    if (itemId && classification.outcome === 'review') {
      const { error: queueError } = await supabase
        .from('brand_match_queue')
        .insert({
          item_id: itemId,
          raw_brand: rawBrand,
          normalized_brand: classification.normalized,
          proposed_brand_id: classification.brand?.id || null,
          confidence: classification.confidence,
          status: 'pending',
          reason: 'fuzzy_match_requires_review',
          created_at: now
        });
      if (queueError) throw queueError;
    }

    return res.json({
      data: {
        itemId,
        rawBrand,
        normalizedBrand: classification.normalized,
        confidence: classification.confidence,
        outcome: classification.outcome,
        source: classification.source,
        brand: classification.brand
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to classify brand.' });
  }
});

app.post('/brands/classify-item-catalog', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });

    const body = normalizeJsonObject(req.body);
    const itemId = toNullableText(body.itemId || body.item_id);
    const fallbackPath = toNullableText(body.path || body.rawPath || body.raw_path || body.line);
    const explicitBrandId = toNullableText(body.brandId || body.brand_id);

    if (!itemId && !explicitBrandId) {
      return res.status(400).json({ error: 'itemId or brandId is required.' });
    }

    let resolvedBrandId = explicitBrandId;
    let itemRecord = null;
    if (itemId) {
      const ownership = await ensureItemOwnedByUser(itemId, context.user.id);
      if (!ownership.item) return res.status(404).json({ error: 'Item not found.' });
      if (!ownership.allowed) return res.status(403).json({ error: 'You can classify only your own item.' });
      itemRecord = ownership.item;
      resolvedBrandId = resolvedBrandId || ownership.item.brand_id || null;
    }

    if (!resolvedBrandId) {
      return res.status(400).json({ error: 'Brand must be resolved before line classification.' });
    }

    const rawPath = fallbackPath || itemRecord?.metadata?.brandCatalogPath || itemRecord?.title || '';
    const classification = await classifyCatalogNodeCandidate({
      brandId: resolvedBrandId,
      rawPath
    });

    if (itemId && classification.outcome === 'auto' && classification.node) {
      const { error: updateError } = await supabase
        .from('items')
        .update({
          brand_catalog_node_id: classification.node.id,
          brand_catalog_match_confidence: classification.confidence,
          brand_match_source: classification.source || 'auto'
        })
        .eq('id', itemId);
      if (updateError) throw updateError;
    }

    if (itemId && classification.outcome === 'review') {
      const { error: queueError } = await supabase
        .from('brand_catalog_match_queue')
        .insert({
          item_id: itemId,
          brand_id: resolvedBrandId,
          raw_path: rawPath,
          normalized_path: classification.normalizedPath,
          proposed_node_id: classification.node?.id || null,
          confidence: classification.confidence,
          status: 'pending',
          reason: 'fuzzy_catalog_match_requires_review'
        });
      if (queueError) throw queueError;
    }

    return res.json({
      data: {
        itemId,
        brandId: resolvedBrandId,
        rawPath,
        normalizedPath: classification.normalizedPath,
        confidence: classification.confidence,
        outcome: classification.outcome,
        source: classification.source,
        node: classification.node
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to classify brand catalog node.' });
  }
});

app.post('/admin/brands/import', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const rows = Array.isArray(body.brands) ? body.brands : [];
    if (rows.length === 0) return res.status(400).json({ error: 'brands array is required.' });

    const payload = rows.map((entry) => {
      const source = normalizeJsonObject(entry);
      const name = toNullableText(source.name);
      const slug = slugifyPathSegment(source.slug || name);
      return {
        name: name || slug,
        slug,
        normalized_name: normalizeBrandText(name || slug),
        logo_url: toNullableText(source.logo_url || source.logoUrl),
        cover_url: toNullableText(source.cover_url || source.coverUrl),
        description: toNullableText(source.description),
        story: normalizeJsonObject(source.story),
        website: toNullableText(source.website),
        country: toNullableText(source.country),
        status: toNullableText(source.status) || 'active',
        verification_level: toNullableText(source.verification_level || source.verificationLevel) || 'community',
        claimed_by_user_id: toNullableText(source.claimed_by_user_id || source.claimedByUserId)
      };
    }).filter((entry) => entry.name);

    const { data, error } = await supabase
      .from('brands')
      .upsert(payload, { onConflict: 'slug', ignoreDuplicates: false })
      .select('*');
    if (error) throw error;
    return res.status(201).json({ data: data || [], imported: data?.length || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to import brands.' });
  }
});

app.post('/admin/brands/catalog/import', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) {
    return res.status(404).json({ error: 'Brand hub is disabled.' });
  }

  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const brandId = toNullableText(body.brandId || body.brand_id);
    const brandSlug = toNullableText(body.brandSlug || body.brand_slug);
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    if (nodes.length === 0) return res.status(400).json({ error: 'nodes array is required.' });

    let brand = null;
    if (brandId) {
      const { data, error } = await supabase.from('brands').select('id,slug,name').eq('id', brandId).maybeSingle();
      if (error) throw error;
      brand = data || null;
    } else if (brandSlug) {
      brand = await resolveBrandBySlug(brandSlug);
    }
    if (!brand) return res.status(404).json({ error: 'Brand not found.' });

    const createdNodes = [];
    for (const entry of nodes) {
      const source = normalizeJsonObject(entry);
      const name = toNullableText(source.name);
      if (!name) continue;
      const parentNodeId = toNullableText(source.parentNodeId || source.parent_node_id);
      let resolvedParentId = parentNodeId;
      if (!resolvedParentId && (source.parentPath || source.parent_path)) {
        const parent = await resolveCatalogNodeByPath(brand.id, source.parentPath || source.parent_path);
        resolvedParentId = parent?.id || null;
      }

      const payload = {
        brand_id: brand.id,
        parent_node_id: resolvedParentId,
        name,
        slug: slugifyPathSegment(source.slug || name),
        normalized_name: normalizeBrandText(name),
        node_type: toNullableText(source.nodeType || source.node_type) || 'line',
        sort_order: Number.parseInt(String(source.sortOrder || source.sort_order || '0'), 10) || 0,
        status: toNullableText(source.status) || 'active',
        source: toNullableText(source.source) || 'import',
        created_by_user_id: context.user.id
      };

      const { data, error } = await supabase
        .from('brand_catalog_nodes')
        .insert(payload)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (data) createdNodes.push(data);
    }

    return res.status(201).json({ data: createdNodes, imported: createdNodes.length });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to import catalog nodes.' });
  }
});

app.get('/admin/brands/match-queue', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const limit = parsePageLimit(req.query.limit, 100, 200);
    const status = String(req.query.status || 'pending').trim().toLowerCase();

    let query = supabase
      .from('brand_match_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load brand match queue.' });
  }
});

app.get('/admin/brands/catalog-match-queue', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const limit = parsePageLimit(req.query.limit, 100, 200);
    const status = String(req.query.status || 'pending').trim().toLowerCase();

    let query = supabase
      .from('brand_catalog_match_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load catalog match queue.' });
  }
});

app.post('/admin/brands/match-review', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const queueId = toNullableText(body.queueId || body.queue_id);
    const status = String(body.status || '').trim().toLowerCase();
    const resolvedStatus = ['approved', 'rejected', 'pending'].includes(status) ? status : '';
    if (!queueId || !resolvedStatus) return res.status(400).json({ error: 'queueId and valid status are required.' });

    const { data: queueRow, error: queueError } = await supabase
      .from('brand_match_queue')
      .select('*')
      .eq('id', queueId)
      .maybeSingle();
    if (queueError) throw queueError;
    if (!queueRow) return res.status(404).json({ error: 'Queue item not found.' });

    const brandId = toNullableText(body.brandId || body.brand_id) || queueRow.proposed_brand_id || null;
    if (resolvedStatus === 'approved' && !brandId) {
      return res.status(400).json({ error: 'brandId is required for approval.' });
    }

    if (resolvedStatus === 'approved' && queueRow.item_id) {
      const { error: itemUpdateError } = await supabase
        .from('items')
        .update({
          brand_id: brandId,
          brand: queueRow.raw_brand || null,
          brand_match_confidence: queueRow.confidence || 0,
          brand_match_source: 'reviewed'
        })
        .eq('id', queueRow.item_id);
      if (itemUpdateError) throw itemUpdateError;
    }

    const updates = {
      status: resolvedStatus,
      proposed_brand_id: brandId,
      reviewed_by: context.user.id,
      reviewed_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('brand_match_queue')
      .update(updates)
      .eq('id', queueId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to review brand match.' });
  }
});

app.post('/admin/brands/catalog-match-review', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const queueId = toNullableText(body.queueId || body.queue_id);
    const status = String(body.status || '').trim().toLowerCase();
    const resolvedStatus = ['approved', 'rejected', 'pending'].includes(status) ? status : '';
    if (!queueId || !resolvedStatus) return res.status(400).json({ error: 'queueId and valid status are required.' });

    const { data: queueRow, error: queueError } = await supabase
      .from('brand_catalog_match_queue')
      .select('*')
      .eq('id', queueId)
      .maybeSingle();
    if (queueError) throw queueError;
    if (!queueRow) return res.status(404).json({ error: 'Queue item not found.' });

    const nodeId = toNullableText(body.nodeId || body.node_id) || queueRow.proposed_node_id || null;
    if (resolvedStatus === 'approved' && !nodeId) {
      return res.status(400).json({ error: 'nodeId is required for approval.' });
    }

    if (resolvedStatus === 'approved' && queueRow.item_id) {
      const { error: itemUpdateError } = await supabase
        .from('items')
        .update({
          brand_catalog_node_id: nodeId,
          brand_catalog_match_confidence: queueRow.confidence || 0,
          brand_match_source: 'reviewed'
        })
        .eq('id', queueRow.item_id);
      if (itemUpdateError) throw itemUpdateError;
    }

    const updates = {
      status: resolvedStatus,
      proposed_node_id: nodeId,
      reviewed_by: context.user.id,
      reviewed_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('brand_catalog_match_queue')
      .update(updates)
      .eq('id', queueId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to review catalog match.' });
  }
});

app.post('/admin/brands/merge', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const sourceBrandId = toNullableText(body.sourceBrandId || body.source_brand_id);
    const targetBrandId = toNullableText(body.targetBrandId || body.target_brand_id);
    if (!sourceBrandId || !targetBrandId || sourceBrandId === targetBrandId) {
      return res.status(400).json({ error: 'sourceBrandId and targetBrandId are required and must be different.' });
    }

    const [sourceBrandResult, targetBrandResult] = await Promise.all([
      supabase.from('brands').select('*').eq('id', sourceBrandId).maybeSingle(),
      supabase.from('brands').select('*').eq('id', targetBrandId).maybeSingle()
    ]);
    if (sourceBrandResult.error) throw sourceBrandResult.error;
    if (targetBrandResult.error) throw targetBrandResult.error;
    if (!sourceBrandResult.data || !targetBrandResult.data) {
      return res.status(404).json({ error: 'Source or target brand not found.' });
    }

    await Promise.all([
      supabase.from('items').update({ brand_id: targetBrandId, brand_match_source: 'reviewed' }).eq('brand_id', sourceBrandId),
      supabase.from('brand_aliases').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId),
      supabase.from('brand_catalog_nodes').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId),
      supabase.from('brand_match_queue').update({ proposed_brand_id: targetBrandId }).eq('proposed_brand_id', sourceBrandId),
      supabase.from('brand_claim_requests').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId),
      supabase.from('brand_followers').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId),
      supabase.from('brand_price_snapshots').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId),
      supabase.from('brand_catalog_match_queue').update({ brand_id: targetBrandId }).eq('brand_id', sourceBrandId)
    ]);

    const mergedStory = {
      ...normalizeJsonObject(sourceBrandResult.data.story),
      merged_into_brand_id: targetBrandId,
      merged_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('brands')
      .update({ status: 'merged', story: mergedStory })
      .eq('id', sourceBrandId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'brand_merge',
      entityType: 'brand',
      entityId: sourceBrandId,
      details: { targetBrandId }
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to merge brands.' });
  }
});

app.post('/admin/brands/catalog/merge-nodes', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const body = normalizeJsonObject(req.body);
    const sourceNodeId = toNullableText(body.sourceNodeId || body.source_node_id);
    const targetNodeId = toNullableText(body.targetNodeId || body.target_node_id);
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      return res.status(400).json({ error: 'sourceNodeId and targetNodeId are required and must be different.' });
    }

    const [sourceNodeResult, targetNodeResult] = await Promise.all([
      supabase.from('brand_catalog_nodes').select('*').eq('id', sourceNodeId).maybeSingle(),
      supabase.from('brand_catalog_nodes').select('*').eq('id', targetNodeId).maybeSingle()
    ]);
    if (sourceNodeResult.error) throw sourceNodeResult.error;
    if (targetNodeResult.error) throw targetNodeResult.error;
    if (!sourceNodeResult.data || !targetNodeResult.data) {
      return res.status(404).json({ error: 'Source or target node not found.' });
    }

    await Promise.all([
      supabase.from('items').update({ brand_catalog_node_id: targetNodeId, brand_match_source: 'reviewed' }).eq('brand_catalog_node_id', sourceNodeId),
      supabase.from('brand_catalog_aliases').update({ node_id: targetNodeId }).eq('node_id', sourceNodeId),
      supabase.from('brand_catalog_match_queue').update({ proposed_node_id: targetNodeId }).eq('proposed_node_id', sourceNodeId),
      supabase.from('brand_catalog_price_snapshots').update({ node_id: targetNodeId }).eq('node_id', sourceNodeId),
      supabase.from('brand_catalog_followers').update({ node_id: targetNodeId }).eq('node_id', sourceNodeId)
    ]);

    const { data, error } = await supabase
      .from('brand_catalog_nodes')
      .update({ status: 'merged', source: 'merge', sort_order: 999999, updated_at: new Date().toISOString() })
      .eq('id', sourceNodeId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await supabase.from('mirror_documents').upsert({
      collection: 'brand_catalog_node_redirects',
      doc_id: sourceNodeId,
      data: {
        merged_into_node_id: targetNodeId,
        merged_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'brand_catalog_node_merge',
      entityType: 'brand_catalog_node',
      entityId: sourceNodeId,
      details: { targetNodeId }
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to merge catalog nodes.' });
  }
});

app.get('/admin/brands/duplicates', requireAuth, async (req, res) => {
  if (!BRAND_HUB_V3_ENABLED) return res.status(404).json({ error: 'Brand hub is disabled.' });
  try {
    const context = await resolveAdminContext(req);
    if (context.error) return res.status(403).json({ error: context.error.message || 'Admin access required.' });
    const limit = parsePageLimit(req.query.limit, 200, 500);
    const { data, error } = await supabase
      .from('brands')
      .select('id,name,slug,normalized_name,status,created_at')
      .order('normalized_name', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const groups = new Map();
    (data || []).forEach((row) => {
      const key = String(row.normalized_name || '').trim();
      if (!key) return;
      const list = groups.get(key) || [];
      list.push(row);
      groups.set(key, list);
    });

    const duplicates = Array.from(groups.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([normalizedName, rows]) => ({ normalizedName, rows }));

    return res.json({ data: duplicates });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load duplicate candidates.' });
  }
});

app.get('/api/:table', requireAuth, requireTable, async (req, res) => {
  const { table } = req.params;
  const { select = '*', limit = '50', offset = '0', order } = req.query;

  let query = supabase.from(table).select(select, { count: 'exact' });

  if (order && typeof order === 'string') {
    const [col, dir] = order.split('.');
    query = query.order(col, { ascending: dir !== 'desc' });
  }

  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
  const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
  query = query.range(offsetNum, offsetNum + limitNum - 1);

  Object.entries(req.query).forEach(([key, value]) => {
    if (['select', 'limit', 'offset', 'order'].includes(key)) return;
    if (value === undefined) return;
    const val = Array.isArray(value) ? value[0] : value;

    if (key.includes('.')) {
      const [op, field] = key.split('.', 2);
      switch (op) {
        case 'eq':
          query = query.eq(field, val);
          break;
        case 'ilike':
          query = query.ilike(field, String(val));
          break;
        case 'gt':
          query = query.gt(field, val);
          break;
        case 'gte':
          query = query.gte(field, val);
          break;
        case 'lt':
          query = query.lt(field, val);
          break;
        case 'lte':
          query = query.lte(field, val);
          break;
        case 'in':
          query = query.in(field, String(val).split(','));
          break;
        default:
          break;
      }
      return;
    }

    query = query.eq(key, val);
  });

  const { data, error, count } = await query;
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.json({ data, count });
});

app.get('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json({ data });
});

app.post('/api/:table', requireAuth, requireTable, async (req, res) => {
  const { table } = req.params;
  const { upsert, onConflict } = req.query;
  const payload = req.body;

  let query = supabase.from(table);
  if (upsert) {
    query = query.upsert(payload, {
      onConflict: typeof onConflict === 'string' ? onConflict : undefined,
      ignoreDuplicates: false
    });
  } else {
    query = query.insert(payload);
  }

  const { data, error } = await query.select('*');
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (table === 'notifications') {
    scheduleWhatsAppForNotifications(data, req);
    scheduleEmailForNotifications(data, req);
  }
  if (table === 'items') {
    scheduleListingPublishedEmail(data, req);
  }
  return res.status(201).json({ data });
});

app.patch('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const payload = req.body;
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (table === 'items') {
    scheduleListingPublishedEmail(data, req);
  }
  return res.json({ data });
});

app.delete('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(204).send();
});

const resolveUploadContext = async (req, requestedOwnerFirebaseUid = null) => {
  const context = await getUserContext(req);
  if (context?.error || !context?.user?.id) {
    return { error: context?.error || new Error('Unable to resolve upload owner.') };
  }

  const requestedOwnerUid = hasText(requestedOwnerFirebaseUid)
    ? String(requestedOwnerFirebaseUid).trim()
    : null;
  if (requestedOwnerUid && requestedOwnerUid !== context.firebaseUid) {
    return { error: new Error('Cannot access uploads for another user.') };
  }

  return context;
};

const canAccessUploadedAsset = async (asset, context) => {
  if (!asset || !context?.user?.id) return false;
  if (String(asset.owner_user_id || '') === String(context.user.id || '')) return true;
  if (asset.owner_persona_id) {
    return userCanAccessPersona(asset.owner_persona_id, context.firebaseUid);
  }
  return false;
};


app.post('/uploads', requireAuth, async (req, res) => {
  const {
    fileName,
    mimeType,
    base64Data,
    owner_firebase_uid,
    owner_persona_id,
    asset_type = 'generic',
    resource_id,
    is_public = false
  } = req.body || {};

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'base64Data and mimeType are required' });
  }

  const normalizedMimeType = normalizeMimeTypeValue(mimeType);
  const extension = MIME_EXTENSION_MAP[normalizedMimeType];
  if (!extension) {
    return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
  }

  let binary;
  try {
    binary = Buffer.from(base64Data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 payload' });
  }

  const sizeBytes = binary.length;
  const maxBytes = 15 * 1024 * 1024;
  if (sizeBytes <= 0 || sizeBytes > maxBytes) {
    return res.status(400).json({ error: 'File size must be between 1 byte and 15MB' });
  }

  const uploadContext = await resolveUploadContext(req, owner_firebase_uid);
  if (uploadContext.error) {
    return res.status(400).json({ error: uploadContext.error.message || 'Unable to resolve upload owner.' });
  }

  if (owner_persona_id) {
    const canAccessPersona = await userCanAccessPersona(owner_persona_id, uploadContext.firebaseUid);
    if (!canAccessPersona) {
      return res.status(403).json({ error: 'You do not have access to upload for this persona.' });
    }
  }
  const userId = uploadContext.user.id;

  const safeType = sanitizeBaseName(asset_type || 'generic');
  const safeBase = sanitizeBaseName(fileName || 'asset');
  const id = randomUUID();
  let storageDriver = 'local_disk';
  let storagePath = '';
  let publicUrl = '';
  let localWrittenPath = '';

  try {
    if (CLOUDINARY_ENABLED) {
      const cloudResult = await uploadToCloudinary({
        base64Data,
        mimeType: normalizedMimeType,
        fileName: safeBase,
        assetType: safeType,
        userId,
        uploadId: id
      });
      if (cloudResult?.storagePath) {
        storageDriver = cloudResult.storageDriver;
        storagePath = cloudResult.storagePath;
        publicUrl = cloudResult.publicUrl;
      }
    }
  } catch (error) {
    console.warn('Cloudinary upload failed, falling back to local disk:', error?.message || error);
  }

  if (!storagePath) {
    const relativeDir = `${safeType}/${userId}`;
    ensureDirectory(path.join(uploadsRoot, relativeDir));
    const relativePath = `${relativeDir}/${safeBase}-${id}.${extension}`;
    const fullPath = path.join(uploadsRoot, relativePath);
    try {
      fs.writeFileSync(fullPath, binary);
    } catch (error) {
      return res.status(500).json({ error: `Failed to write upload: ${error.message}` });
    }
    localWrittenPath = fullPath;
    storageDriver = 'local_disk';
    storagePath = normalizeRelativePath(fullPath);
    publicUrl = `/uploads/${storagePath}`;
  }

  const payload = {
    id,
    owner_user_id: userId,
    owner_persona_id: owner_persona_id || null,
    asset_type: safeType,
    file_name: fileName || `${safeBase}.${extension}`,
    mime_type: normalizedMimeType,
    size_bytes: sizeBytes,
    storage_driver: storageDriver,
    storage_path: storagePath,
    resource_id: resource_id || null,
    is_public: Boolean(is_public),
    status: 'active'
  };

  const { data, error } = await supabase.from('uploaded_assets').insert(payload).select('*').maybeSingle();
  if (error) {
    if (localWrittenPath && fs.existsSync(localWrittenPath)) {
      try {
        fs.unlinkSync(localWrittenPath);
      } catch {
        // ignore cleanup error
      }
    }
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ data: { ...data, public_url: publicUrl || resolveUploadPublicUrl(data || payload) } });
});

app.get('/uploads', requireAuth, async (req, res) => {
  const { owner_firebase_uid, asset_type, resource_id, limit = '100' } = req.query;
  const uploadContext = await resolveUploadContext(req, owner_firebase_uid);
  if (uploadContext.error) {
    return res.status(400).json({ error: uploadContext.error.message || 'Unable to resolve upload owner.' });
  }
  const ownerUserId = uploadContext.user.id;

  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 1000);

  let query = supabase
    .from('uploaded_assets')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (asset_type) query = query.eq('asset_type', asset_type);
  if (resource_id) query = query.eq('resource_id', resource_id);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  return res.json({
    data: (data || []).map((row) => ({
      ...row,
      public_url: resolveUploadPublicUrl(row)
    }))
  });
});

app.get('/uploads/:id', requireAuth, async (req, res) => {
  const uploadContext = await resolveUploadContext(req);
  if (uploadContext.error) {
    return res.status(400).json({ error: uploadContext.error.message || 'Unable to resolve upload owner.' });
  }

  const { id } = req.params;
  const { data, error } = await supabase.from('uploaded_assets').select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  if (!(await canAccessUploadedAsset(data, uploadContext))) {
    return res.status(403).json({ error: 'You cannot access this upload.' });
  }
  return res.json({ data: { ...data, public_url: resolveUploadPublicUrl(data) } });
});

app.delete('/uploads/:id', requireAuth, async (req, res) => {
  const uploadContext = await resolveUploadContext(req);
  if (uploadContext.error) {
    return res.status(400).json({ error: uploadContext.error.message || 'Unable to resolve upload owner.' });
  }

  const { id } = req.params;
  const { data, error } = await supabase.from('uploaded_assets').select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  if (!(await canAccessUploadedAsset(data, uploadContext))) {
    return res.status(403).json({ error: 'You cannot delete this upload.' });
  }

  const fullPath = data.storage_driver === 'local_disk'
    ? path.join(uploadsRoot, data.storage_path || '')
    : '';
  if (fullPath && fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // ignore unlink errors; metadata still removed
    }
  }

  const { error: deleteError } = await supabase.from('uploaded_assets').delete().eq('id', id);
  if (deleteError) {
    return res.status(400).json({ error: deleteError.message });
  }

  return res.status(204).send();
});

const startServer = (port, retriesRemaining) => {
  const server = app.listen(port, START_HOST, () => {
    console.log(`Urban Prime backend listening on http://${START_HOST}:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesRemaining > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      setTimeout(() => startServer(nextPort, retriesRemaining - 1), 120);
      return;
    }

    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
};

const isDirectRun = Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);

if (isDirectRun) {
  startServer(START_PORT, PORT_RETRY_LIMIT);
}

export { app, startServer };
export default app;





