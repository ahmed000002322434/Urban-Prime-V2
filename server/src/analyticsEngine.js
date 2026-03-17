import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';

const EVENT_QUEUE_COLLECTION = 'analytics_event_queue_pending';
const EVENT_ARCHIVE_COLLECTION = 'analytics_event_queue_archive';
const FEATURE_STORE_COLLECTION = 'analytics_feature_store';
const RECOMMENDATION_FEEDBACK_COLLECTION = 'analytics_recommendation_feedback';
const RECOMMENDATION_SNAPSHOT_COLLECTION = 'analytics_recommendation_snapshot';
const EXPERIMENT_COLLECTION = 'analytics_experiments';
const EXPERIMENT_ASSIGNMENT_COLLECTION = 'analytics_experiment_assignments';
const EXPERIMENT_EVENT_COLLECTION = 'analytics_experiment_events';
const PRIVACY_DELETION_COLLECTION = 'analytics_privacy_deletions';

const COMPLETED_ORDER_STATUSES = new Set(['completed', 'delivered']);
const RETURNED_ORDER_STATUSES = new Set(['refunded', 'cancelled']);
const PENDING_ORDER_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped']);
const COMPLETED_EVENT_NAMES = new Set(['checkout_completed', 'purchase', 'rent', 'auction_win']);

const EVENT_ALIAS_MAP = new Map([
  ['item_view', 'item_view'],
  ['view', 'item_view'],
  ['listing_view', 'item_view'],
  ['product_view', 'item_view'],
  ['cart_add', 'cart_add'],
  ['add_to_cart', 'cart_add'],
  ['cart', 'cart_add'],
  ['checkout_started', 'checkout_started'],
  ['checkout_start', 'checkout_started'],
  ['checkout', 'checkout_started'],
  ['pending', 'checkout_started'],
  ['checkout_completed', 'checkout_completed'],
  ['checkout_complete', 'checkout_completed'],
  ['purchase', 'purchase'],
  ['order_completed', 'purchase'],
  ['rent', 'rent'],
  ['rental', 'rent'],
  ['auction_win', 'auction_win']
]);

const ALLOWED_EVENT_NAMES = new Set(['item_view', 'cart_add', 'checkout_started', 'checkout_completed', 'purchase', 'rent', 'auction_win']);

const DAY_FORMATTER_CACHE = new Map();
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const DEFAULT_RETENTION_DAYS = Number.parseInt(String(process.env.ANALYTICS_RETENTION_DAYS || '180'), 10) || 180;

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normalizeJsonObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const safeString = (value, max = 180) => {
  if (!hasText(value)) return '';
  return String(value).trim().slice(0, max);
};

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toIsoTimestamp = (value) => {
  const dateValue = new Date(value || Date.now());
  if (Number.isNaN(dateValue.getTime())) return new Date().toISOString();
  return dateValue.toISOString();
};

const getDayFormatter = (timezone = 'UTC') => {
  const key = String(timezone || 'UTC');
  if (!DAY_FORMATTER_CACHE.has(key)) {
    DAY_FORMATTER_CACHE.set(
      key,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: key,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    );
  }
  return DAY_FORMATTER_CACHE.get(key);
};

const getDayKey = (value, timezone = 'UTC') => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return getDayKey(Date.now(), timezone);

  const parts = getDayFormatter(timezone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
};

const formatTrendLabel = (dayKey, timezone = 'UTC') => {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric' });
};

const buildTrendSkeleton = (daysBack, timezone = 'UTC') => {
  const output = [];
  for (let offset = daysBack - 1; offset >= 0; offset -= 1) {
    const timestamp = Date.now() - offset * 24 * HOUR;
    const dayKey = getDayKey(timestamp, timezone);
    output.push({ date: dayKey, label: formatTrendLabel(dayKey, timezone), value: 0 });
  }
  return output;
};

const hashValue = (value) => createHash('sha256').update(String(value || '')).digest('hex');

const resolvePiiKey = () => {
  const raw = String(process.env.ANALYTICS_PII_KEY || '').trim();
  if (!raw) return null;

  const fromHex = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : null;
  if (fromHex && fromHex.length === 32) return fromHex;

  const fromBase64 = /^[A-Za-z0-9+/=]+$/.test(raw) ? Buffer.from(raw, 'base64') : null;
  if (fromBase64 && fromBase64.length === 32) return fromBase64;

  const fallback = Buffer.from(raw, 'utf8');
  if (fallback.length === 32) return fallback;
  return null;
};

const PII_KEY = resolvePiiKey();

const encryptPii = (value) => {
  if (!PII_KEY || !hasText(value)) return null;
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', PII_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
  } catch {
    return null;
  }
};

const decryptPii = (value) => {
  if (!PII_KEY || !hasText(value)) return null;
  try {
    const [ivB64, tagB64, dataB64] = String(value).split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', PII_KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    return null;
  }
};

const extractClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim() || 'unknown';
};

const normalizeEventName = (value, fallback = 'item_view') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  const mapped = EVENT_ALIAS_MAP.get(normalized);
  if (mapped && ALLOWED_EVENT_NAMES.has(mapped)) return mapped;
  if (ALLOWED_EVENT_NAMES.has(normalized)) return normalized;
  return fallback;
};

const normalizeDeviceType = (value, userAgent = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['mobile', 'tablet', 'desktop'].includes(normalized)) return normalized;
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/iphone|android|mobile/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
};

const normalizeChannel = (source, referrer) => {
  const merged = `${String(source || '')} ${String(referrer || '')}`.toLowerCase();
  if (!merged.trim()) return 'direct';
  if (merged.includes('instagram')) return 'instagram';
  if (merged.includes('facebook') || merged.includes('fb')) return 'facebook';
  if (merged.includes('tiktok')) return 'tiktok';
  if (merged.includes('youtube')) return 'youtube';
  if (merged.includes('google') || merged.includes('search')) return 'search';
  if (merged.includes('ad') || merged.includes('campaign') || merged.includes('utm_')) return 'paid';
  if (merged.includes('email') || merged.includes('newsletter')) return 'email';
  if (merged.includes('reddit')) return 'reddit';
  return 'referral';
};

const normalizeSource = (value, referrer) => {
  const direct = safeString(value, 120);
  if (direct) return direct.toLowerCase();
  const fromReferrer = safeString(referrer, 120);
  if (!fromReferrer) return 'direct';
  return fromReferrer.toLowerCase();
};

const deriveVisitorId = ({ payload, metadata, actorFirebaseUid, actorUserId, req }) => {
  const explicit = safeString(
    payload?.visitorId
      || payload?.visitor_id
      || metadata?.visitorId
      || metadata?.visitor_id,
    128
  );
  if (explicit) return explicit;
  if (actorFirebaseUid) return actorFirebaseUid;
  if (actorUserId) return actorUserId;

  const sessionId = safeString(payload?.sessionId || payload?.session_id || metadata?.sessionId || metadata?.session_id, 128);
  const userAgent = String(req.get('user-agent') || '').slice(0, 220);
  const ip = extractClientIp(req);
  const fingerprint = `${sessionId || 'anonymous'}|${ip}|${userAgent}`;
  return `anon_${hashValue(fingerprint).slice(0, 22)}`;
};

const sanitizeMetadata = (value) => {
  const raw = normalizeJsonObject(value);
  const normalized = {};
  Object.entries(raw).forEach(([key, entry]) => {
    if (!hasText(key)) return;
    const safeKey = safeString(key, 80);
    if (entry === null || entry === undefined) return;
    if (typeof entry === 'number' || typeof entry === 'boolean') {
      normalized[safeKey] = entry;
      return;
    }
    if (typeof entry === 'string') {
      normalized[safeKey] = entry.slice(0, 600);
      return;
    }
    if (Array.isArray(entry)) {
      normalized[safeKey] = entry.slice(0, 20).map((item) => (typeof item === 'string' ? item.slice(0, 180) : item));
      return;
    }
    if (typeof entry === 'object') {
      normalized[safeKey] = JSON.parse(JSON.stringify(entry));
    }
  });
  return normalized;
};

const isCompletedEvent = (eventName) => COMPLETED_EVENT_NAMES.has(eventName);

const computePercentChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const buildEmptySellerAnalytics = (daysBack = 30, timezone = 'UTC') => ({
  totalRevenue: 0,
  totalOrders: 0,
  totalViews: 0,
  uniqueVisitors: 0,
  uniqueBuyers: 0,
  conversionRate: 0,
  conversionRateEventBased: 0,
  conversionRateVisitorBased: 0,
  averageOrderValue: 0,
  pendingOrders: 0,
  completedOrders: 0,
  returnedOrders: 0,
  topProducts: [],
  viewsTrend: buildTrendSkeleton(daysBack, timezone),
  ordersTrend: buildTrendSkeleton(daysBack, timezone),
  revenueTrend: buildTrendSkeleton(daysBack, timezone),
  unitsTrend: buildTrendSkeleton(daysBack, timezone),
  cartAbandonmentRate: 0,
  totalCartAdds: 0,
  totalCheckoutStarts: 0,
  completedCheckouts: 0,
  totalTrustedViews: 0,
  trustedConversionRate: 0,
  realtimeMetrics: [],
  recentOrders: [],
  funnel: {
    stages: [
      { stage: 'Viewed', count: 0, percentage: 100 },
      { stage: 'Added to Cart', count: 0, percentage: 0 },
      { stage: 'Checkout Started', count: 0, percentage: 0 },
      { stage: 'Checkout Completed', count: 0, percentage: 0 }
    ],
    dropOffStage: 'Viewed',
    dropOffRate: 0,
    eventBasedConversionRate: 0,
    visitorBasedConversionRate: 0
  },
  insights: [],
  anomalies: [],
  trendAcceleration: [],
  attribution: [],
  forecasts: [],
  journeys: {
    topSuccessfulPaths: [],
    topDropOffPaths: []
  },
  recommendations: [],
  cohorts: [],
  trust: {
    totalEvents: 0,
    trustedEvents: 0,
    highTrust: 0,
    mediumTrust: 0,
    lowTrust: 0,
    lowTrustRate: 0
  },
  generatedAt: new Date().toISOString(),
  timezone
});

const rollingSignalMap = new Map();
const publicEventRateMap = new Map();

const incrementRollingSignal = (key, windowMs) => {
  const now = Date.now();
  const records = rollingSignalMap.get(key) || [];
  const cutoff = now - windowMs;
  const next = records.filter((timestamp) => timestamp >= cutoff);
  next.push(now);
  rollingSignalMap.set(key, next);
  return next.length;
};

const isPublicRateLimited = (ip) => {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const windowMs = 60 * 1000;
  const limit = 180;
  const records = publicEventRateMap.get(key) || [];
  const next = records.filter((timestamp) => timestamp >= now - windowMs);
  next.push(now);
  publicEventRateMap.set(key, next);
  return next.length > limit;
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rollingSignalMap.entries()) {
    if (!Array.isArray(value)) {
      rollingSignalMap.delete(key);
      continue;
    }
    const next = value.filter((timestamp) => timestamp >= now - 30 * MINUTE);
    if (next.length === 0) rollingSignalMap.delete(key);
    else rollingSignalMap.set(key, next);
  }

  for (const [key, value] of publicEventRateMap.entries()) {
    if (!Array.isArray(value)) {
      publicEventRateMap.delete(key);
      continue;
    }
    const next = value.filter((timestamp) => timestamp >= now - 2 * MINUTE);
    if (next.length === 0) publicEventRateMap.delete(key);
    else publicEventRateMap.set(key, next);
  }
}, 60 * 1000).unref?.();

const computeTrustScore = ({ eventName, durationMs, quantity, isAnonymous, userAgent, burstCount, duplicateCount, channel }) => {
  let score = 1;
  const reasons = [];

  if (isAnonymous) {
    score -= 0.08;
    reasons.push('anonymous_visitor');
  }

  if (!hasText(userAgent)) {
    score -= 0.16;
    reasons.push('missing_user_agent');
  }

  if (eventName === 'item_view' && durationMs > 0 && durationMs < 250) {
    score -= 0.15;
    reasons.push('very_short_view');
  }

  if (quantity > 12) {
    score -= 0.2;
    reasons.push('unusually_high_quantity');
  }

  if (burstCount > 15) {
    score -= 0.32;
    reasons.push('burst_activity');
  } else if (burstCount > 8) {
    score -= 0.14;
    reasons.push('elevated_activity');
  }

  if (duplicateCount > 4) {
    score -= 0.28;
    reasons.push('rapid_duplicate_events');
  } else if (duplicateCount > 2) {
    score -= 0.12;
    reasons.push('duplicate_events');
  }

  if (channel === 'paid' && eventName === 'cart_add' && burstCount > 10) {
    score -= 0.1;
    reasons.push('paid_click_spike');
  }

  const trustScore = clamp(Number(score.toFixed(4)), 0, 1);
  let trustTier = 'low';
  if (trustScore >= 0.78) trustTier = 'high';
  else if (trustScore >= 0.45) trustTier = 'medium';

  return { trustScore, trustTier, reasons };
};

const sum = (numbers) => numbers.reduce((acc, value) => acc + safeNumber(value, 0), 0);

const createAnalyticsEngine = ({
  app,
  supabase,
  requireAuth,
  userCanAccessPersona,
  resolveUserIdFromFirebaseUid,
  writeAuditLog
}) => {
  const sellerSubscribers = new Map();

  let queueWorkerRunning = false;
  let queueWorkerTimer = null;
  let queueProcessingLocked = false;
  let retentionSweepAt = 0;

  const userFirebaseUidCache = new Map();
  const itemContextCache = new Map();

  const resolveFirebaseUidByUserId = async (userId) => {
    const key = safeString(userId, 64);
    if (!key) return '';
    if (userFirebaseUidCache.has(key)) return userFirebaseUidCache.get(key);

    const { data, error } = await supabase
      .from('users')
      .select('id,firebase_uid')
      .eq('id', key)
      .maybeSingle();

    if (error) throw error;
    const firebaseUid = safeString(data?.firebase_uid, 120);
    userFirebaseUidCache.set(key, firebaseUid);
    return firebaseUid;
  };

  const resolveItemContext = async (itemId, forceRefresh = false) => {
    const key = safeString(itemId, 64);
    if (!key) return null;
    const cached = itemContextCache.get(key);
    if (!forceRefresh && cached && Date.now() - cached.cachedAt <= 2 * MINUTE) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('items')
      .select('id,title,owner_persona_id,seller_id,listing_type,sale_price,rental_price,currency,metadata,status,created_at')
      .eq('id', key)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    itemContextCache.set(key, { data, cachedAt: Date.now() });
    return data;
  };

  const normalizeIncomingEvent = async ({ payload, req, defaults = {} }) => {
    const metadata = sanitizeMetadata(payload?.metadata || payload?.details || {});
    const userAgent = safeString(req.get('user-agent') || metadata.userAgent || metadata.user_agent, 260);
    const itemId = safeString(
      payload?.itemId
        || payload?.item_id
        || metadata?.itemId
        || metadata?.item_id,
      72
    );

    if (!itemId) throw new Error('item_id is required');

    const itemContext = await resolveItemContext(itemId);
    if (!itemContext) throw new Error('Item not found for analytics event');

    const ownerPersonaId = safeString(
      payload?.ownerPersonaId
        || payload?.owner_persona_id
        || metadata?.ownerPersonaId
        || metadata?.owner_persona_id
        || itemContext?.owner_persona_id,
      72
    );
    if (!ownerPersonaId) throw new Error('owner persona is required for analytics event');

    const ownerUserId = safeString(
      payload?.ownerUserId
        || payload?.owner_user_id
        || metadata?.ownerUserId
        || metadata?.owner_user_id
        || itemContext?.seller_id,
      72
    );

    let ownerFirebaseUid = safeString(
      payload?.ownerFirebaseUid
        || payload?.owner_firebase_uid
        || metadata?.ownerFirebaseUid
        || metadata?.owner_firebase_uid,
      160
    );
    if (!ownerFirebaseUid && ownerUserId) ownerFirebaseUid = await resolveFirebaseUidByUserId(ownerUserId);
    if (!ownerFirebaseUid) throw new Error('owner firebase uid is required for analytics event');

    const actorFirebaseUid = safeString(
      payload?.actorFirebaseUid
        || payload?.actor_firebase_uid
        || metadata?.actorFirebaseUid
        || metadata?.actor_firebase_uid,
      160
    );

    let actorUserId = safeString(
      payload?.actorUserId
        || payload?.actor_user_id
        || metadata?.actorUserId
        || metadata?.actor_user_id,
      72
    );
    if (!actorUserId && actorFirebaseUid) {
      try {
        actorUserId = safeString(await resolveUserIdFromFirebaseUid(actorFirebaseUid), 72);
      } catch {
        actorUserId = '';
      }
    }

    const actorPersonaId = safeString(
      payload?.actorPersonaId
        || payload?.actor_persona_id
        || metadata?.actorPersonaId
        || metadata?.actor_persona_id,
      72
    );

    const eventName = normalizeEventName(
      payload?.eventName
        || payload?.event_name
        || payload?.action
        || metadata?.eventName
        || defaults.eventName,
      defaults.eventName || 'item_view'
    );

    const occurredAt = toIsoTimestamp(
      payload?.occurredAt
      || payload?.occurred_at
      || payload?.createdAt
      || payload?.created_at
      || metadata?.occurredAt
      || metadata?.createdAt
      || Date.now()
    );

    const source = normalizeSource(payload?.source || metadata?.source, payload?.referrer || metadata?.referrer);
    const referrer = safeString(payload?.referrer || metadata?.referrer || '', 240).toLowerCase();
    const channel = normalizeChannel(source, referrer);
    const deviceType = normalizeDeviceType(payload?.deviceType || payload?.device_type || metadata?.deviceType, userAgent);

    const durationMs = Math.max(0, Math.round(safeNumber(
      payload?.durationMs
      || payload?.duration_ms
      || metadata?.durationMs
      || metadata?.duration_ms,
      0
    )));

    const quantity = clamp(Math.round(safeNumber(payload?.quantity || metadata?.quantity || 1, 1)), 1, 999);
    const amount = Math.max(0, safeNumber(payload?.amount || payload?.total || metadata?.amount || metadata?.total, 0));
    const currency = safeString(payload?.currency || metadata?.currency || itemContext?.currency || 'USD', 8).toUpperCase() || 'USD';

    const visitorId = deriveVisitorId({ payload, metadata, actorFirebaseUid, actorUserId, req });

    const sessionId = safeString(
      payload?.sessionId
      || payload?.session_id
      || metadata?.sessionId
      || metadata?.session_id,
      120
    );

    const urlPath = safeString(
      payload?.urlPath
      || payload?.url_path
      || metadata?.urlPath
      || metadata?.url_path
      || metadata?.fullPath,
      420
    );

    const actorName = safeString(payload?.actorName || payload?.actor_name || metadata?.actorName, 160);
    const visitorName = safeString(payload?.visitorName || payload?.visitor_name || metadata?.visitorName, 160);
    const itemTitle = safeString(payload?.itemTitle || payload?.item_title || metadata?.itemTitle || itemContext?.title, 220);
    const listingType = safeString(payload?.listingType || payload?.listing_type || metadata?.listingType || itemContext?.listing_type, 20).toLowerCase() || 'sale';

    const isAnonymous = !actorFirebaseUid && !actorUserId;
    const clientIp = extractClientIp(req);
    const burstCount = incrementRollingSignal(`${eventName}:${clientIp}:${deviceType}`, 2 * MINUTE);
    const duplicateCount = incrementRollingSignal(`${eventName}:${visitorId}:${itemId}`, 5 * MINUTE);

    const trust = computeTrustScore({
      eventName,
      durationMs,
      quantity,
      isAnonymous,
      userAgent,
      burstCount,
      duplicateCount,
      channel
    });

    return {
      id: randomUUID(),
      eventName,
      occurredAt,
      ownerPersonaId,
      ownerFirebaseUid,
      ownerUserId,
      actorFirebaseUid,
      actorUserId,
      actorPersonaId,
      actorName,
      actorNameEncrypted: encryptPii(actorName),
      visitorId,
      visitorName,
      visitorNameEncrypted: encryptPii(visitorName),
      itemId,
      itemTitle,
      listingType,
      quantity,
      durationMs,
      amount,
      currency,
      source,
      referrer,
      channel,
      deviceType,
      sessionId,
      urlPath,
      metadata,
      trustScore: trust.trustScore,
      trustTier: trust.trustTier,
      trustReasons: trust.reasons,
      isAnonymous,
      requestIpHash: hashValue(clientIp).slice(0, 20),
      requestUserAgent: userAgent,
      pipelineVersion: 1
    };
  };

  const toAuditAction = (eventName, listingType = '') => {
    if (eventName === 'checkout_completed') return listingType === 'rent' ? 'rent' : 'purchase';
    if (eventName === 'checkout_started') return 'checkout_started';
    return eventName;
  };

  const writeAnalyticsAuditLog = async (event) => {
    const details = {
      ownerFirebaseUid: event.ownerFirebaseUid,
      ownerPersonaId: event.ownerPersonaId,
      actorFirebaseUid: event.actorFirebaseUid || null,
      actorPersonaId: event.actorPersonaId || null,
      actorName: event.actorName || event.visitorName || null,
      itemId: event.itemId,
      itemTitle: event.itemTitle,
      listingType: event.listingType,
      quantity: event.quantity || null,
      durationMs: event.durationMs || null,
      metadata: {
        ...event.metadata,
        source: event.source,
        referrer: event.referrer,
        channel: event.channel,
        deviceType: event.deviceType,
        sessionId: event.sessionId,
        urlPath: event.urlPath
      },
      createdAt: event.occurredAt,
      analytics: {
        eventId: event.id,
        eventName: event.eventName,
        trustScore: event.trustScore,
        trustTier: event.trustTier,
        trustReasons: event.trustReasons,
        visitorId: event.visitorId,
        amount: event.amount,
        currency: event.currency,
        pii: {
          actorNameEncrypted: event.actorNameEncrypted,
          visitorNameEncrypted: event.visitorNameEncrypted
        }
      }
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: event.actorUserId || null,
        action: toAuditAction(event.eventName, event.listingType),
        entity_type: 'item',
        entity_id: event.ownerFirebaseUid,
        details
      });
    if (error) throw error;
  };

  const enqueueAnalyticsEvent = async (event, options = {}) => {
    const nowIso = new Date().toISOString();
    const queueData = {
      ...event,
      status: 'pending',
      attempts: 0,
      receivedAt: nowIso,
      nextAttemptAt: nowIso
    };

    const { error: queueError } = await supabase
      .from('mirror_documents')
      .upsert({
        collection: EVENT_QUEUE_COLLECTION,
        doc_id: event.id,
        data: queueData,
        updated_at: nowIso
      }, {
        onConflict: 'collection,doc_id',
        ignoreDuplicates: false
      });
    if (queueError) throw queueError;

    if (options.persistAuditLog !== false) await writeAnalyticsAuditLog(event);
    return { id: event.id, queued: true, trustScore: event.trustScore, trustTier: event.trustTier };
  };

  const normalizeAuditEvent = (row) => {
    const details = normalizeJsonObject(row?.details);
    const metadata = normalizeJsonObject(details?.metadata);
    const analytics = normalizeJsonObject(details?.analytics);

    const eventName = normalizeEventName(
      analytics?.eventName || details?.eventName || row?.action,
      normalizeEventName(row?.action || 'item_view', 'item_view')
    );

    const occurredAt = toIsoTimestamp(details?.createdAt || details?.occurredAt || row?.created_at);

    const visitorId = safeString(
      analytics?.visitorId
      || details?.visitorId
      || details?.actorFirebaseUid
      || details?.actorId,
      160
    ) || `visitor_${hashValue(row?.id || occurredAt).slice(0, 16)}`;

    return {
      id: safeString(row?.id, 80),
      eventName,
      occurredAt,
      ownerPersonaId: safeString(details?.ownerPersonaId, 72),
      ownerFirebaseUid: safeString(details?.ownerFirebaseUid, 160),
      actorFirebaseUid: safeString(details?.actorFirebaseUid, 160),
      actorPersonaId: safeString(details?.actorPersonaId, 72),
      actorName: safeString(details?.actorName, 160),
      actorNameEncrypted: analytics?.pii?.actorNameEncrypted,
      visitorId,
      visitorName: safeString(details?.visitorName || '', 160),
      visitorNameEncrypted: analytics?.pii?.visitorNameEncrypted,
      itemId: safeString(details?.itemId, 80),
      itemTitle: safeString(details?.itemTitle, 220),
      listingType: safeString(details?.listingType, 24).toLowerCase() || 'sale',
      quantity: Math.max(1, Math.round(safeNumber(details?.quantity, 1))),
      durationMs: Math.max(0, safeNumber(details?.durationMs, 0)),
      amount: Math.max(0, safeNumber(analytics?.amount ?? details?.amount ?? metadata?.amount, 0)),
      currency: safeString(analytics?.currency || metadata?.currency || 'USD', 8).toUpperCase() || 'USD',
      source: normalizeSource(metadata?.source || details?.source, metadata?.referrer),
      referrer: safeString(metadata?.referrer || details?.referrer || '', 240).toLowerCase(),
      channel: normalizeChannel(metadata?.source || details?.source, metadata?.referrer || details?.referrer),
      deviceType: normalizeDeviceType(metadata?.deviceType || details?.deviceType, metadata?.userAgent || ''),
      urlPath: safeString(metadata?.urlPath || metadata?.url_path || details?.urlPath || '', 420),
      sessionId: safeString(metadata?.sessionId || metadata?.session_id || '', 120),
      trustScore: clamp(safeNumber(analytics?.trustScore, 0.7), 0, 1),
      trustTier: safeString(analytics?.trustTier, 24) || 'medium',
      trustReasons: ensureArray(analytics?.trustReasons),
      metadata,
      row
    };
  };

  const fetchSellerAuditEvents = async (sellerPersonaId, daysBack) => {
    const cutoffIso = new Date(Date.now() - daysBack * 24 * HOUR).toISOString();
    const pageSize = 1000;
    const maxRows = 25_000;
    const rows = [];

    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id,action,details,created_at')
        .contains('details', { ownerPersonaId: sellerPersonaId })
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      const batch = ensureArray(data);
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    return rows.map(normalizeAuditEvent);
  };

  const fetchSellerOrderRows = async (sellerUserId, daysBack) => {
    if (!sellerUserId) return [];

    const cutoffIso = new Date(Date.now() - daysBack * 24 * HOUR).toISOString();
    const pageSize = 1000;
    const maxRows = 25_000;
    const rows = [];

    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const { data, error } = await supabase
        .from('order_items')
        .select('id,order_id,item_id,seller_id,quantity,unit_price,listing_type,created_at,metadata,orders!inner(id,status,total,currency,created_at,buyer_id,buyer_persona_id)')
        .eq('seller_id', sellerUserId)
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      const batch = ensureArray(data);
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    return rows;
  };

  const loadSellerContext = async (sellerPersonaId) => {
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('id,user_id,display_name,settings')
      .eq('id', sellerPersonaId)
      .maybeSingle();
    if (personaError) throw personaError;
    if (!persona) return null;

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id,title,owner_persona_id,seller_id,listing_type,sale_price,rental_price,currency,stock,metadata,created_at,status')
      .eq('owner_persona_id', sellerPersonaId);
    if (itemsError) throw itemsError;

    const itemMap = new Map();
    ensureArray(items).forEach((item) => itemMap.set(String(item.id), item));

    return {
      persona,
      timezone: safeString(persona?.settings?.timezone || 'UTC', 80) || 'UTC',
      itemMap,
      items: ensureArray(items)
    };
  };

  const buildRealtimeMetrics = ({ events, orderRows, now = Date.now() }) => {
    const windows = {
      current24hStart: now - 24 * HOUR,
      previous24hStart: now - 48 * HOUR
    };

    const currentViews = events.filter((entry) => entry.eventName === 'item_view' && new Date(entry.occurredAt).getTime() >= windows.current24hStart).length;
    const previousViews = events.filter((entry) => entry.eventName === 'item_view' && new Date(entry.occurredAt).getTime() >= windows.previous24hStart && new Date(entry.occurredAt).getTime() < windows.current24hStart).length;

    const currentCarts = events.filter((entry) => entry.eventName === 'cart_add' && new Date(entry.occurredAt).getTime() >= windows.current24hStart).length;
    const previousCarts = events.filter((entry) => entry.eventName === 'cart_add' && new Date(entry.occurredAt).getTime() >= windows.previous24hStart && new Date(entry.occurredAt).getTime() < windows.current24hStart).length;

    const currentOrders = ensureArray(orderRows).filter((row) => new Date(row?.created_at || row?.orders?.created_at).getTime() >= windows.current24hStart).length;
    const previousOrders = ensureArray(orderRows).filter((row) => {
      const timestamp = new Date(row?.created_at || row?.orders?.created_at).getTime();
      return timestamp >= windows.previous24hStart && timestamp < windows.current24hStart;
    }).length;

    const currentRevenue = sum(
      ensureArray(orderRows)
        .filter((row) => new Date(row?.created_at || row?.orders?.created_at).getTime() >= windows.current24hStart)
        .map((row) => safeNumber(row?.unit_price, 0) * Math.max(1, safeNumber(row?.quantity, 1)))
    );

    const previousRevenue = sum(
      ensureArray(orderRows)
        .filter((row) => {
          const timestamp = new Date(row?.created_at || row?.orders?.created_at).getTime();
          return timestamp >= windows.previous24hStart && timestamp < windows.current24hStart;
        })
        .map((row) => safeNumber(row?.unit_price, 0) * Math.max(1, safeNumber(row?.quantity, 1)))
    );

    return [
      {
        metric: 'Views (24h)',
        value: currentViews,
        change: currentViews - previousViews,
        changePercent: computePercentChange(currentViews, previousViews),
        trend: currentViews > previousViews ? 'up' : currentViews < previousViews ? 'down' : 'stable'
      },
      {
        metric: 'Cart Additions (24h)',
        value: currentCarts,
        change: currentCarts - previousCarts,
        changePercent: computePercentChange(currentCarts, previousCarts),
        trend: currentCarts > previousCarts ? 'up' : currentCarts < previousCarts ? 'down' : 'stable'
      },
      {
        metric: 'Orders (24h)',
        value: currentOrders,
        change: currentOrders - previousOrders,
        changePercent: computePercentChange(currentOrders, previousOrders),
        trend: currentOrders > previousOrders ? 'up' : currentOrders < previousOrders ? 'down' : 'stable'
      },
      {
        metric: 'Revenue (24h)',
        value: Number(currentRevenue.toFixed(2)),
        change: Number((currentRevenue - previousRevenue).toFixed(2)),
        changePercent: computePercentChange(currentRevenue, previousRevenue),
        trend: currentRevenue > previousRevenue ? 'up' : currentRevenue < previousRevenue ? 'down' : 'stable'
      }
    ];
  };

  const computeForecast = (series, horizonDays) => {
    const values = ensureArray(series).map((entry) => safeNumber(entry, 0));
    if (values.length === 0) return { expected: 0, confidence: 0.2 };

    const alpha = 0.35;
    let level = values[0];
    let trend = values.length > 1 ? values[1] - values[0] : 0;

    for (let index = 1; index < values.length; index += 1) {
      const value = values[index];
      const prevLevel = level;
      level = alpha * value + (1 - alpha) * (level + trend);
      trend = alpha * (level - prevLevel) + (1 - alpha) * trend;
    }

    const projectedDaily = Math.max(0, level + trend * 0.35);
    const expected = projectedDaily * horizonDays;

    const lastWindow = values.slice(-Math.min(values.length, 14));
    const mean = sum(lastWindow) / Math.max(lastWindow.length, 1);
    const variance = sum(lastWindow.map((value) => (value - mean) ** 2)) / Math.max(lastWindow.length, 1);
    const stdDev = Math.sqrt(variance);
    const coefficient = mean > 0 ? stdDev / mean : 1;
    const confidence = clamp(1 - coefficient, 0.25, 0.92);

    return { expected: Number(expected.toFixed(2)), confidence: Number(confidence.toFixed(2)) };
  };

  const computeCohorts = (events, timezone) => {
    const firstSeenByVisitor = new Map();
    const eventsByVisitor = new Map();

    events.forEach((entry) => {
      if (!entry.visitorId) return;
      const current = firstSeenByVisitor.get(entry.visitorId);
      if (!current || new Date(entry.occurredAt).getTime() < new Date(current.occurredAt).getTime()) {
        firstSeenByVisitor.set(entry.visitorId, { occurredAt: entry.occurredAt, channel: entry.channel || 'direct' });
      }
      const visitorEvents = eventsByVisitor.get(entry.visitorId) || [];
      visitorEvents.push(entry);
      eventsByVisitor.set(entry.visitorId, visitorEvents);
    });

    const cohorts = new Map();
    firstSeenByVisitor.forEach((firstSeen, visitorId) => {
      const dayKey = getDayKey(firstSeen.occurredAt, timezone);
      const weekKey = `${dayKey.slice(0, 8)}01`;
      const channel = firstSeen.channel || 'direct';
      const cohortKey = `${weekKey}:${channel}`;

      const cohort = cohorts.get(cohortKey) || { cohort: weekKey, channel, visitors: 0, returningVisitors: 0, convertedVisitors: 0 };
      const visitorEvents = eventsByVisitor.get(visitorId) || [];
      const daySet = new Set(visitorEvents.map((entry) => getDayKey(entry.occurredAt, timezone)));
      const hasConversion = visitorEvents.some((entry) => isCompletedEvent(entry.eventName));

      cohort.visitors += 1;
      if (daySet.size > 1) cohort.returningVisitors += 1;
      if (hasConversion) cohort.convertedVisitors += 1;
      cohorts.set(cohortKey, cohort);
    });

    return Array.from(cohorts.values())
      .map((entry) => ({
        ...entry,
        repeatRate: entry.visitors > 0 ? Number(((entry.returningVisitors / entry.visitors) * 100).toFixed(2)) : 0,
        conversionRate: entry.visitors > 0 ? Number(((entry.convertedVisitors / entry.visitors) * 100).toFixed(2)) : 0
      }))
      .sort((left, right) => String(right.cohort).localeCompare(String(left.cohort)))
      .slice(0, 16);
  };

  const computeJourneys = (events) => {
    const byVisitor = new Map();
    events.forEach((entry) => {
      if (!entry.visitorId) return;
      const current = byVisitor.get(entry.visitorId) || [];
      current.push(entry);
      byVisitor.set(entry.visitorId, current);
    });

    const successful = new Map();
    const dropOff = new Map();

    byVisitor.forEach((visitorEvents) => {
      const sorted = visitorEvents.slice().sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
      const steps = [];
      sorted.forEach((entry) => {
        const step = entry.urlPath || (entry.itemId ? `item/${entry.itemId}` : entry.eventName);
        if (!step) return;
        if (steps.length === 0 || steps[steps.length - 1] !== step) steps.push(step);
      });

      if (steps.length === 0) return;
      const path = steps.slice(0, 8).join(' -> ');
      const targetMap = sorted.some((entry) => isCompletedEvent(entry.eventName)) ? successful : dropOff;
      targetMap.set(path, (targetMap.get(path) || 0) + 1);
    });

    const toSorted = (map) => Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10);

    return { topSuccessfulPaths: toSorted(successful), topDropOffPaths: toSorted(dropOff) };
  };

  const buildRecommendations = ({
    totalViews,
    conversionRateEvent,
    cartAbandonmentRate,
    averageViewDuration,
    attribution,
    trendAcceleration,
    trust,
    feedbackStats
  }) => {
    const recommendations = [];

    if (totalViews > 80 && conversionRateEvent < 2.5) {
      recommendations.push({
        id: randomUUID(),
        type: 'pricing',
        priority: 'high',
        score: 88,
        message: 'High traffic but low conversion detected. Consider a 5-10% price test for this listing.',
        expectedImpact: 'Improve conversion rate over the next 7 days.'
      });
    }

    if (averageViewDuration > 0 && averageViewDuration < 8) {
      recommendations.push({
        id: randomUUID(),
        type: 'content',
        priority: 'medium',
        score: 74,
        message: 'Visitors spend very little time on product pages. Improve headline image and first 2 lines of description.',
        expectedImpact: 'Increase engagement depth and cart additions.'
      });
    }

    if (cartAbandonmentRate >= 55) {
      recommendations.push({
        id: randomUUID(),
        type: 'checkout',
        priority: 'high',
        score: 92,
        message: 'Cart abandonment is elevated. Review shipping costs and checkout friction for mobile users.',
        expectedImpact: 'Reduce abandonment and improve completed checkouts.'
      });
    }

    const topAttribution = ensureArray(attribution).sort((left, right) => safeNumber(right.revenue, 0) - safeNumber(left.revenue, 0))[0];
    if (topAttribution && topAttribution.channel !== 'direct') {
      recommendations.push({
        id: randomUUID(),
        type: 'channel',
        priority: 'medium',
        score: 68,
        message: `${topAttribution.channel} is currently your strongest revenue channel. Shift more budget to this source.`,
        expectedImpact: 'Increase high-intent traffic acquisition.'
      });
    }

    const strongestAcceleration = ensureArray(trendAcceleration).sort((left, right) => safeNumber(right.accelerationRatio, 0) - safeNumber(left.accelerationRatio, 0))[0];
    if (strongestAcceleration && strongestAcceleration.accelerationRatio >= 2.5) {
      recommendations.push({
        id: randomUUID(),
        type: 'inventory',
        priority: 'high',
        score: 86,
        message: 'Traffic is accelerating rapidly. Consider increasing available inventory and boosting campaign spend now.',
        expectedImpact: 'Capture viral demand before momentum decays.'
      });
    }

    if (safeNumber(trust?.lowTrustRate, 0) >= 25) {
      recommendations.push({
        id: randomUUID(),
        type: 'fraud',
        priority: 'high',
        score: 90,
        message: 'Low-trust traffic is elevated. Exclude suspicious sessions from optimization decisions and ad retargeting.',
        expectedImpact: 'Protect analytics quality and budget efficiency.'
      });
    }

    const acceptanceMultiplier = new Map();
    ensureArray(feedbackStats).forEach((entry) => {
      const type = safeString(entry?.type, 40);
      if (!type) return;
      const accepted = safeNumber(entry?.accepted, 0);
      const total = safeNumber(entry?.total, 0);
      const ratio = total > 0 ? accepted / total : 0;
      acceptanceMultiplier.set(type, ratio);
    });

    return recommendations
      .map((entry) => {
        const ratio = acceptanceMultiplier.get(entry.type) || 0;
        const adjustedScore = Math.round(entry.score * (1 + ratio * 0.15));
        return { ...entry, score: adjustedScore };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);
  };

  const computeAnomalies = ({ events, orderRows }) => {
    const now = Date.now();
    const withinWindow = (timestamp, from, to) => timestamp >= from && timestamp < to;
    const windows = [{ label: '5m', ms: 5 * MINUTE }, { label: '30m', ms: 30 * MINUTE }];

    const anomalies = [];
    const trendAcceleration = [];

    windows.forEach((window) => {
      const currentFrom = now - window.ms;
      const previousFrom = now - 2 * window.ms;

      const currentViews = events.filter((entry) => entry.eventName === 'item_view' && withinWindow(new Date(entry.occurredAt).getTime(), currentFrom, now)).length;
      const previousViews = events.filter((entry) => entry.eventName === 'item_view' && withinWindow(new Date(entry.occurredAt).getTime(), previousFrom, currentFrom)).length;

      const currentCheckouts = events.filter((entry) => isCompletedEvent(entry.eventName) && withinWindow(new Date(entry.occurredAt).getTime(), currentFrom, now)).length;
      const previousCheckouts = events.filter((entry) => isCompletedEvent(entry.eventName) && withinWindow(new Date(entry.occurredAt).getTime(), previousFrom, currentFrom)).length;

      const currentRevenue = sum(
        ensureArray(orderRows)
          .filter((row) => withinWindow(new Date(row?.created_at || row?.orders?.created_at).getTime(), currentFrom, now))
          .map((row) => safeNumber(row?.unit_price, 0) * Math.max(1, safeNumber(row?.quantity, 1)))
      );

      const previousRevenue = sum(
        ensureArray(orderRows)
          .filter((row) => withinWindow(new Date(row?.created_at || row?.orders?.created_at).getTime(), previousFrom, currentFrom))
          .map((row) => safeNumber(row?.unit_price, 0) * Math.max(1, safeNumber(row?.quantity, 1)))
      );

      const viewAcceleration = previousViews > 0 ? currentViews / previousViews : currentViews > 0 ? 3 : 1;
      const checkoutAcceleration = previousCheckouts > 0 ? currentCheckouts / previousCheckouts : currentCheckouts > 0 ? 3 : 1;
      const revenueAcceleration = previousRevenue > 0 ? currentRevenue / previousRevenue : currentRevenue > 0 ? 3 : 1;

      trendAcceleration.push({ window: window.label, metric: 'views', current: currentViews, previous: previousViews, accelerationRatio: Number(viewAcceleration.toFixed(2)) });
      trendAcceleration.push({ window: window.label, metric: 'checkouts', current: currentCheckouts, previous: previousCheckouts, accelerationRatio: Number(checkoutAcceleration.toFixed(2)) });
      trendAcceleration.push({ window: window.label, metric: 'revenue', current: Number(currentRevenue.toFixed(2)), previous: Number(previousRevenue.toFixed(2)), accelerationRatio: Number(revenueAcceleration.toFixed(2)) });

      if (viewAcceleration >= 3) {
        anomalies.push({ id: randomUUID(), severity: 'info', type: 'traffic_spike', message: `Traffic in the last ${window.label} is ${viewAcceleration.toFixed(1)}x above baseline.`, value: currentViews, baseline: previousViews });
      }
      if (currentViews > 20 && viewAcceleration <= 0.4) {
        anomalies.push({ id: randomUUID(), severity: 'warning', type: 'traffic_drop', message: `Traffic in the last ${window.label} dropped sharply versus baseline.`, value: currentViews, baseline: previousViews });
      }
      if (currentCheckouts + previousCheckouts > 0 && checkoutAcceleration <= 0.35) {
        anomalies.push({ id: randomUUID(), severity: 'warning', type: 'checkout_drop', message: `Checkout completions in the last ${window.label} are significantly lower than expected.`, value: currentCheckouts, baseline: previousCheckouts });
      }
    });

    return {
      anomalies: anomalies.slice(0, 12),
      trendAcceleration: trendAcceleration.sort((left, right) => safeNumber(right.accelerationRatio, 0) - safeNumber(left.accelerationRatio, 0)).slice(0, 12)
    };
  };

  const buildInsights = ({
    conversionRateEvent,
    previousDayConversion,
    attribution,
    cartAbandonmentRate,
    trendAcceleration,
    anomalies,
    trust
  }) => {
    const insights = [];

    if (previousDayConversion > 0) {
      const delta = computePercentChange(conversionRateEvent, previousDayConversion);
      if (Math.abs(delta) >= 5) {
        insights.push({
          id: randomUUID(),
          severity: delta > 0 ? 'positive' : 'warning',
          type: 'conversion_shift',
          message: `Your product is converting ${Math.abs(delta).toFixed(1)}% ${delta > 0 ? 'better' : 'worse'} than yesterday.`,
          metric: Number(delta.toFixed(2))
        });
      }
    }

    const mobile = ensureArray(attribution).find((entry) => entry.deviceType === 'mobile');
    const desktop = ensureArray(attribution).find((entry) => entry.deviceType === 'desktop');
    if (mobile && desktop) {
      const mobileAbandon = safeNumber(mobile.cartAbandonmentRate, 0);
      const desktopAbandon = safeNumber(desktop.cartAbandonmentRate, 0);
      if (desktopAbandon > 0 && mobileAbandon >= desktopAbandon * 1.8) {
        insights.push({
          id: randomUUID(),
          severity: 'warning',
          type: 'mobile_friction',
          message: `Visitors from mobile devices abandon carts ${(mobileAbandon / desktopAbandon).toFixed(1)}x more often than desktop users.`,
          metric: Number((mobileAbandon / desktopAbandon).toFixed(2))
        });
      }
    }

    if (cartAbandonmentRate >= 55) {
      insights.push({
        id: randomUUID(),
        severity: 'warning',
        type: 'abandonment',
        message: `Cart abandonment is ${cartAbandonmentRate.toFixed(1)}%. Checkout optimization is recommended.`,
        metric: Number(cartAbandonmentRate.toFixed(2))
      });
    }

    const acceleration = ensureArray(trendAcceleration)[0];
    if (acceleration && safeNumber(acceleration.accelerationRatio, 0) >= 2) {
      insights.push({
        id: randomUUID(),
        severity: 'info',
        type: 'acceleration',
        message: `Traffic is increasing ${safeNumber(acceleration.accelerationRatio, 0).toFixed(1)}x faster than baseline (${acceleration.window}).`,
        metric: safeNumber(acceleration.accelerationRatio, 0)
      });
    }

    if (safeNumber(trust?.lowTrustRate, 0) >= 25) {
      insights.push({
        id: randomUUID(),
        severity: 'warning',
        type: 'trust',
        message: `${safeNumber(trust.lowTrustRate, 0).toFixed(1)}% of recent events are low-trust and filtered for trusted analytics.`,
        metric: Number(safeNumber(trust.lowTrustRate, 0).toFixed(2))
      });
    }

    ensureArray(anomalies).filter((entry) => entry.severity === 'warning').slice(0, 2).forEach((entry) => {
      insights.push({ id: randomUUID(), severity: entry.severity, type: entry.type, message: entry.message, metric: safeNumber(entry.value, 0) });
    });

    if (insights.length === 0) {
      insights.push({
        id: randomUUID(),
        severity: 'info',
        type: 'baseline',
        message: 'No major anomalies detected. Performance is stable in the selected window.',
        metric: 0
      });
    }

    return insights.slice(0, 12);
  };

  const loadRecommendationFeedbackStats = async (sellerPersonaId) => {
    const { data, error } = await supabase
      .from('mirror_documents')
      .select('doc_id,data,updated_at')
      .eq('collection', RECOMMENDATION_FEEDBACK_COLLECTION)
      .like('doc_id', `${sellerPersonaId}:%`)
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (error) return [];

    const grouped = new Map();
    ensureArray(data).forEach((row) => {
      const payload = normalizeJsonObject(row?.data);
      const type = safeString(payload?.type, 40) || 'general';
      const action = safeString(payload?.action, 20);
      const current = grouped.get(type) || { type, accepted: 0, dismissed: 0, ignored: 0, total: 0 };
      current.total += 1;
      if (action === 'accepted') current.accepted += 1;
      else if (action === 'dismissed') current.dismissed += 1;
      else current.ignored += 1;
      grouped.set(type, current);
    });

    return Array.from(grouped.values());
  };

  const computeSellerAnalytics = async ({ sellerPersonaId, daysBack = 30, timezone }) => {
    const sellerContext = await loadSellerContext(sellerPersonaId);
    if (!sellerContext) return buildEmptySellerAnalytics(daysBack, timezone || 'UTC');

    const resolvedTimezone = timezone || sellerContext.timezone || 'UTC';
    const events = await fetchSellerAuditEvents(sellerPersonaId, daysBack);
    const orderRows = await fetchSellerOrderRows(sellerContext.persona.user_id, daysBack);

    const analytics = buildEmptySellerAnalytics(daysBack, resolvedTimezone);
    const dayLookup = new Map();
    analytics.viewsTrend.forEach((entry) => {
      dayLookup.set(entry.date, { views: 0, orders: 0, revenue: 0, units: 0, carts: 0, checkoutStarts: 0, checkouts: 0 });
    });

    const productMap = new Map();
    const attributionMap = new Map();
    const viewerSet = new Set();
    const purchaserSet = new Set();
    const trustedViewers = new Set();
    const eventsByDay = new Map();

    events.forEach((entry) => {
      const dayKey = getDayKey(entry.occurredAt, resolvedTimezone);
      if (!dayLookup.has(dayKey)) {
        dayLookup.set(dayKey, { views: 0, orders: 0, revenue: 0, units: 0, carts: 0, checkoutStarts: 0, checkouts: 0 });
      }
      const dayStats = dayLookup.get(dayKey);
      const byDay = eventsByDay.get(dayKey) || { views: 0, checkouts: 0 };

      const productKey = entry.itemId || 'unknown_item';
      const product = productMap.get(productKey) || {
        itemId: productKey,
        itemTitle: entry.itemTitle || sellerContext.itemMap.get(productKey)?.title || 'Untitled product',
        totalViews: 0,
        totalClicks: 0,
        totalCartAdds: 0,
        totalCheckouts: 0,
        conversionRate: 0,
        averageViewDurationSeconds: 0,
        totalViewDurationMs: 0,
        revenue: 0,
        unitsSold: 0,
        topReferrersMap: new Map(),
        viewsData: [],
        cartAddData: [],
        checkoutData: []
      };

      const attributionKey = `${entry.channel || 'direct'}:${entry.deviceType || 'unknown'}`;
      const attribution = attributionMap.get(attributionKey) || {
        channel: entry.channel || 'direct',
        deviceType: entry.deviceType || 'unknown',
        source: entry.source || 'direct',
        views: 0,
        carts: 0,
        checkouts: 0,
        revenue: 0,
        uniqueVisitors: new Set()
      };

      if (entry.eventName === 'item_view') {
        analytics.totalViews += 1;
        dayStats.views += 1;
        byDay.views += 1;
        product.totalViews += 1;
        product.totalClicks += entry.durationMs > 1000 ? 1 : 0;
        product.totalViewDurationMs += entry.durationMs;
        product.viewsData.push({
          id: entry.id,
          visitorId: entry.visitorId,
          visitorName: entry.actorName || entry.visitorName || decryptPii(entry.visitorNameEncrypted) || 'Visitor',
          itemId: entry.itemId,
          viewedAt: entry.occurredAt,
          durationMs: entry.durationMs,
          deviceType: entry.deviceType,
          source: entry.source
        });
        viewerSet.add(entry.visitorId);
        attribution.views += 1;
        attribution.uniqueVisitors.add(entry.visitorId);
        if (entry.trustScore >= 0.45) {
          analytics.totalTrustedViews += 1;
          trustedViewers.add(entry.visitorId);
        }
      }

      if (entry.eventName === 'cart_add') {
        analytics.totalCartAdds += 1;
        dayStats.carts += 1;
        product.totalCartAdds += 1;
        product.cartAddData.push({
          id: entry.id,
          userId: entry.actorFirebaseUid || entry.visitorId,
          userName: entry.actorName || entry.visitorName || decryptPii(entry.actorNameEncrypted) || 'Visitor',
          itemId: entry.itemId,
          addedAt: entry.occurredAt,
          quantity: entry.quantity,
          completedCheckout: false
        });
        attribution.carts += 1;
      }

      if (entry.eventName === 'checkout_started') {
        analytics.totalCheckoutStarts += 1;
        dayStats.checkoutStarts += 1;
      }

      if (isCompletedEvent(entry.eventName)) {
        analytics.completedCheckouts += 1;
        dayStats.checkouts += 1;
        byDay.checkouts += 1;
        product.totalCheckouts += 1;
        product.checkoutData.push({
          id: entry.id,
          userId: entry.actorFirebaseUid || entry.visitorId,
          userName: entry.actorName || entry.visitorName || decryptPii(entry.actorNameEncrypted) || 'Customer',
          itemId: entry.itemId,
          orderId: '',
          checkoutTime: entry.occurredAt,
          amount: entry.amount,
          status: 'completed'
        });
        purchaserSet.add(entry.visitorId);
        attribution.checkouts += 1;
      }

      if (entry.eventName === 'item_view') {
        const refKey = entry.source || 'direct';
        product.topReferrersMap.set(refKey, (product.topReferrersMap.get(refKey) || 0) + 1);
      }

      attributionMap.set(attributionKey, attribution);
      productMap.set(productKey, product);
      eventsByDay.set(dayKey, byDay);
    });

    const orderById = new Map();
    ensureArray(orderRows).forEach((row) => {
      const order = normalizeJsonObject(row?.orders);
      const orderId = safeString(row?.order_id || order?.id, 72);
      const orderStatus = safeString(order?.status, 40).toLowerCase();
      const dayKey = getDayKey(row?.created_at || order?.created_at, resolvedTimezone);
      const quantity = Math.max(1, Math.round(safeNumber(row?.quantity, 1)));
      const unitPrice = safeNumber(row?.unit_price, 0);
      const lineRevenue = quantity * unitPrice;

      analytics.totalRevenue += lineRevenue;

      const dayStats = dayLookup.get(dayKey) || { views: 0, orders: 0, revenue: 0, units: 0, carts: 0, checkoutStarts: 0, checkouts: 0 };
      dayStats.revenue += lineRevenue;
      dayStats.units += quantity;
      dayLookup.set(dayKey, dayStats);

      if (!orderById.has(orderId)) {
        orderById.set(orderId, {
          id: orderId,
          status: orderStatus,
          currency: safeString(order?.currency || row?.currency || 'USD', 8).toUpperCase() || 'USD',
          total: 0,
          quantityTotal: 0,
          createdAt: toIsoTimestamp(order?.created_at || row?.created_at),
          itemCount: 0,
          buyerId: safeString(order?.buyer_id, 72)
        });
        dayStats.orders += 1;
      }

      const orderEntry = orderById.get(orderId);
      orderEntry.total += lineRevenue;
      orderEntry.quantityTotal += quantity;
      orderEntry.itemCount += 1;

      const productKey = safeString(row?.item_id, 72) || 'unknown_item';
      const product = productMap.get(productKey) || {
        itemId: productKey,
        itemTitle: sellerContext.itemMap.get(productKey)?.title || 'Untitled product',
        totalViews: 0,
        totalClicks: 0,
        totalCartAdds: 0,
        totalCheckouts: 0,
        conversionRate: 0,
        averageViewDurationSeconds: 0,
        totalViewDurationMs: 0,
        revenue: 0,
        unitsSold: 0,
        topReferrersMap: new Map(),
        viewsData: [],
        cartAddData: [],
        checkoutData: []
      };
      product.revenue += lineRevenue;
      product.unitsSold += quantity;
      if (product.totalCheckouts === 0) product.totalCheckouts = quantity;
      productMap.set(productKey, product);
      if (hasText(orderEntry.buyerId)) purchaserSet.add(`buyer_${orderEntry.buyerId}`);
    });

    analytics.totalOrders = orderById.size;
    analytics.averageOrderValue = analytics.totalOrders > 0 ? Number((analytics.totalRevenue / analytics.totalOrders).toFixed(2)) : 0;
    analytics.pendingOrders = Array.from(orderById.values()).filter((entry) => PENDING_ORDER_STATUSES.has(entry.status)).length;
    analytics.completedOrders = Array.from(orderById.values()).filter((entry) => COMPLETED_ORDER_STATUSES.has(entry.status)).length;
    analytics.returnedOrders = Array.from(orderById.values()).filter((entry) => RETURNED_ORDER_STATUSES.has(entry.status)).length;
    analytics.uniqueVisitors = viewerSet.size;
    analytics.uniqueBuyers = purchaserSet.size;
    analytics.conversionRateEventBased = analytics.totalViews > 0 ? Number(((analytics.completedCheckouts / analytics.totalViews) * 100).toFixed(2)) : 0;
    analytics.conversionRateVisitorBased = analytics.uniqueVisitors > 0 ? Number(((analytics.uniqueBuyers / analytics.uniqueVisitors) * 100).toFixed(2)) : 0;
    analytics.conversionRate = analytics.conversionRateEventBased;
    analytics.cartAbandonmentRate = analytics.totalCartAdds > 0 ? Number((((analytics.totalCartAdds - analytics.completedCheckouts) / analytics.totalCartAdds) * 100).toFixed(2)) : 0;
    analytics.trustedConversionRate = analytics.totalTrustedViews > 0 ? Number(((analytics.completedCheckouts / analytics.totalTrustedViews) * 100).toFixed(2)) : 0;

    const trustCounts = { highTrust: 0, mediumTrust: 0, lowTrust: 0 };
    events.forEach((entry) => {
      if (entry.trustTier === 'high') trustCounts.highTrust += 1;
      else if (entry.trustTier === 'medium') trustCounts.mediumTrust += 1;
      else trustCounts.lowTrust += 1;
    });

    const totalTrustEvents = trustCounts.highTrust + trustCounts.mediumTrust + trustCounts.lowTrust;
    analytics.trust = {
      totalEvents: totalTrustEvents,
      trustedEvents: trustCounts.highTrust + trustCounts.mediumTrust,
      highTrust: trustCounts.highTrust,
      mediumTrust: trustCounts.mediumTrust,
      lowTrust: trustCounts.lowTrust,
      lowTrustRate: totalTrustEvents > 0 ? Number(((trustCounts.lowTrust / totalTrustEvents) * 100).toFixed(2)) : 0
    };

    const viewsTrend = buildTrendSkeleton(daysBack, resolvedTimezone);
    const ordersTrend = buildTrendSkeleton(daysBack, resolvedTimezone);
    const revenueTrend = buildTrendSkeleton(daysBack, resolvedTimezone);
    const unitsTrend = buildTrendSkeleton(daysBack, resolvedTimezone);

    viewsTrend.forEach((entry) => { const day = dayLookup.get(entry.date); entry.value = day ? day.views : 0; });
    ordersTrend.forEach((entry) => { const day = dayLookup.get(entry.date); entry.value = day ? day.orders : 0; });
    revenueTrend.forEach((entry) => { const day = dayLookup.get(entry.date); entry.value = day ? Number(day.revenue.toFixed(2)) : 0; });
    unitsTrend.forEach((entry) => { const day = dayLookup.get(entry.date); entry.value = day ? day.units : 0; });

    analytics.viewsTrend = viewsTrend;
    analytics.ordersTrend = ordersTrend;
    analytics.revenueTrend = revenueTrend;
    analytics.unitsTrend = unitsTrend;

    const topProducts = Array.from(productMap.values())
      .map((entry) => {
        const averageViewDurationSeconds = entry.totalViews > 0 ? Number((entry.totalViewDurationMs / entry.totalViews / 1000).toFixed(1)) : 0;
        const topReferrers = Array.from(entry.topReferrersMap.entries())
          .map(([source, count]) => ({
            source,
            totalVisitors: count,
            conversionRate: entry.totalViews > 0 ? Number(((count / entry.totalViews) * 100).toFixed(2)) : 0
          }))
          .sort((left, right) => right.totalVisitors - left.totalVisitors)
          .slice(0, 6);

        return {
          itemId: entry.itemId,
          itemTitle: entry.itemTitle,
          totalViews: entry.totalViews,
          totalClicks: entry.totalClicks,
          totalCartAdds: entry.totalCartAdds,
          totalCheckouts: entry.totalCheckouts,
          conversionRate: entry.totalViews > 0 ? Number(((entry.totalCheckouts / entry.totalViews) * 100).toFixed(2)) : 0,
          averageViewDurationSeconds,
          viewsData: entry.viewsData.slice(-200),
          cartAddData: entry.cartAddData.slice(-200),
          checkoutData: entry.checkoutData.slice(-200),
          topReferrers,
          revenue: Number(safeNumber(entry.revenue, 0).toFixed(2)),
          unitsSold: entry.unitsSold
        };
      })
      .sort((left, right) => {
        const byRevenue = safeNumber(right.revenue, 0) - safeNumber(left.revenue, 0);
        if (byRevenue !== 0) return byRevenue;
        return safeNumber(right.totalViews, 0) - safeNumber(left.totalViews, 0);
      })
      .slice(0, 20);
    analytics.topProducts = topProducts;

    const attribution = Array.from(attributionMap.values())
      .map((entry) => ({
        channel: entry.channel,
        deviceType: entry.deviceType,
        source: entry.source,
        views: entry.views,
        carts: entry.carts,
        checkouts: entry.checkouts,
        revenue: Number(safeNumber(entry.revenue, 0).toFixed(2)),
        uniqueVisitors: entry.uniqueVisitors.size,
        conversionRate: entry.views > 0 ? Number(((entry.checkouts / entry.views) * 100).toFixed(2)) : 0,
        cartAbandonmentRate: entry.carts > 0 ? Number((((entry.carts - entry.checkouts) / entry.carts) * 100).toFixed(2)) : 0
      }))
      .sort((left, right) => safeNumber(right.revenue, 0) - safeNumber(left.revenue, 0));
    analytics.attribution = attribution;

    analytics.realtimeMetrics = buildRealtimeMetrics({ events, orderRows });
    analytics.journeys = computeJourneys(events);
    analytics.cohorts = computeCohorts(events, resolvedTimezone);

    const { anomalies, trendAcceleration } = computeAnomalies({ events, orderRows });
    analytics.anomalies = anomalies;
    analytics.trendAcceleration = trendAcceleration;

    const revenueSeries = revenueTrend.map((entry) => safeNumber(entry.value, 0));
    const unitsSeries = unitsTrend.map((entry) => safeNumber(entry.value, 0));
    const viewsSeries = viewsTrend.map((entry) => safeNumber(entry.value, 0));

    const forecastWindows = [7, 30, 90];
    analytics.forecasts = forecastWindows.map((windowDays) => {
      const revenueForecast = computeForecast(revenueSeries, windowDays);
      const unitsForecast = computeForecast(unitsSeries, windowDays);
      const viewsForecast = computeForecast(viewsSeries, windowDays);
      return {
        horizonDays: windowDays,
        expectedRevenue: revenueForecast.expected,
        expectedUnits: unitsForecast.expected,
        expectedViews: viewsForecast.expected,
        confidence: Number(((revenueForecast.confidence + unitsForecast.confidence + viewsForecast.confidence) / 3).toFixed(2)),
        summary: `Estimated revenue ${revenueForecast.expected.toFixed(0)} and units ${unitsForecast.expected.toFixed(0)} in the next ${windowDays} days.`
      };
    });

    const lastDay = viewsTrend[viewsTrend.length - 1];
    const previousDay = viewsTrend[viewsTrend.length - 2];
    const lastDayCheckouts = eventsByDay.get(lastDay?.date || '')?.checkouts || 0;
    const previousDayCheckouts = eventsByDay.get(previousDay?.date || '')?.checkouts || 0;
    const previousDayConversion = safeNumber(previousDay?.value, 0) > 0 ? (previousDayCheckouts / safeNumber(previousDay?.value, 0)) * 100 : 0;

    analytics.funnel = {
      stages: [
        { stage: 'Viewed', count: analytics.totalViews, percentage: 100 },
        { stage: 'Added to Cart', count: analytics.totalCartAdds, percentage: analytics.totalViews > 0 ? Number(((analytics.totalCartAdds / analytics.totalViews) * 100).toFixed(2)) : 0 },
        { stage: 'Checkout Started', count: analytics.totalCheckoutStarts, percentage: analytics.totalViews > 0 ? Number(((analytics.totalCheckoutStarts / analytics.totalViews) * 100).toFixed(2)) : 0 },
        { stage: 'Checkout Completed', count: analytics.completedCheckouts, percentage: analytics.totalViews > 0 ? Number(((analytics.completedCheckouts / analytics.totalViews) * 100).toFixed(2)) : 0 }
      ],
      dropOffStage: 'Added to Cart',
      dropOffRate: analytics.cartAbandonmentRate,
      eventBasedConversionRate: analytics.conversionRateEventBased,
      visitorBasedConversionRate: analytics.conversionRateVisitorBased
    };

    const feedbackStats = await loadRecommendationFeedbackStats(sellerPersonaId);
    const averageViewDuration = analytics.totalViews > 0
      ? Number((sum(topProducts.map((entry) => entry.averageViewDurationSeconds * entry.totalViews)) / analytics.totalViews).toFixed(2))
      : 0;

    analytics.insights = buildInsights({
      conversionRateEvent: analytics.conversionRateEventBased,
      previousDayConversion,
      attribution,
      cartAbandonmentRate: analytics.cartAbandonmentRate,
      trendAcceleration,
      anomalies,
      trust: analytics.trust
    });

    analytics.recommendations = buildRecommendations({
      totalViews: analytics.totalViews,
      conversionRateEvent: analytics.conversionRateEventBased,
      cartAbandonmentRate: analytics.cartAbandonmentRate,
      averageViewDuration,
      attribution,
      trendAcceleration,
      trust: analytics.trust,
      feedbackStats
    });

    analytics.recentOrders = Array.from(orderById.values())
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 40)
      .map((entry) => ({
        id: entry.id,
        status: entry.status,
        currency: entry.currency,
        total: Number(entry.total.toFixed(2)),
        quantityTotal: entry.quantityTotal,
        createdAt: entry.createdAt,
        itemCount: entry.itemCount
      }));

    analytics.generatedAt = new Date().toISOString();
    analytics.timezone = resolvedTimezone;
    return analytics;
  };

  const broadcastSellerUpdate = (sellerPersonaId, payload) => {
    const subscribers = sellerSubscribers.get(sellerPersonaId);
    if (!subscribers || subscribers.size === 0) return;
    const frame = `event: analytics\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const response of subscribers) {
      try {
        response.write(frame);
      } catch {
        // ignore dead stream
      }
    }
  };

  const refreshSellerFeatureStore = async (sellerPersonaId) => {
    if (!sellerPersonaId) return null;
    const snapshot = await computeSellerAnalytics({ sellerPersonaId, daysBack: 30 });
    const nowIso = new Date().toISOString();

    await supabase
      .from('mirror_documents')
      .upsert({
        collection: FEATURE_STORE_COLLECTION,
        doc_id: sellerPersonaId,
        data: { sellerPersonaId, generatedAt: nowIso, snapshot },
        updated_at: nowIso
      }, {
        onConflict: 'collection,doc_id',
        ignoreDuplicates: false
      });

    await supabase
      .from('mirror_documents')
      .upsert({
        collection: RECOMMENDATION_SNAPSHOT_COLLECTION,
        doc_id: sellerPersonaId,
        data: { sellerPersonaId, generatedAt: nowIso, recommendations: snapshot.recommendations, insights: snapshot.insights },
        updated_at: nowIso
      }, {
        onConflict: 'collection,doc_id',
        ignoreDuplicates: false
      });

    broadcastSellerUpdate(sellerPersonaId, {
      type: 'analytics.update',
      sellerPersonaId,
      generatedAt: nowIso,
      summary: {
        totalRevenue: snapshot.totalRevenue,
        totalViews: snapshot.totalViews,
        totalOrders: snapshot.totalOrders,
        conversionRate: snapshot.conversionRate,
        cartAbandonmentRate: snapshot.cartAbandonmentRate
      },
      realtimeMetrics: snapshot.realtimeMetrics,
      funnel: snapshot.funnel,
      insights: snapshot.insights.slice(0, 6),
      anomalies: snapshot.anomalies.slice(0, 4),
      recommendations: snapshot.recommendations.slice(0, 4)
    });

    return snapshot;
  };

  const pruneAnalyticsData = async () => {
    const now = Date.now();
    if (now - retentionSweepAt < HOUR) return;
    retentionSweepAt = now;
    const cutoffIso = new Date(now - DEFAULT_RETENTION_DAYS * 24 * HOUR).toISOString();

    try {
      await supabase.from('mirror_documents').delete().eq('collection', EVENT_ARCHIVE_COLLECTION).lt('updated_at', cutoffIso);
      await supabase.from('audit_logs').delete().in('action', ['item_view', 'cart_add', 'checkout_started', 'purchase', 'rent', 'auction_win']).lt('created_at', cutoffIso);
    } catch {
      // no-op
    }
  };

  const processQueueBatch = async () => {
    if (queueProcessingLocked) return;
    queueProcessingLocked = true;
    try {
      const { data, error } = await supabase
        .from('mirror_documents')
        .select('collection,doc_id,data,updated_at')
        .eq('collection', EVENT_QUEUE_COLLECTION)
        .order('updated_at', { ascending: true })
        .limit(180);
      if (error) throw error;

      const rows = ensureArray(data);
      if (rows.length === 0) {
        await pruneAnalyticsData();
        return;
      }

      const sellersTouched = new Set();
      for (const row of rows) {
        const payload = normalizeJsonObject(row?.data);
        const nextAttemptAt = new Date(payload?.nextAttemptAt || 0).getTime();
        if (Number.isFinite(nextAttemptAt) && nextAttemptAt > Date.now()) continue;

        const eventId = safeString(payload?.id || row?.doc_id, 80) || randomUUID();
        const sellerPersonaId = safeString(payload?.ownerPersonaId, 72);

        try {
          await supabase.from('mirror_documents').upsert({
            collection: EVENT_ARCHIVE_COLLECTION,
            doc_id: eventId,
            data: { ...payload, id: eventId, status: 'processed', processedAt: new Date().toISOString() },
            updated_at: new Date().toISOString()
          }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

          await supabase.from('mirror_documents').delete().eq('collection', EVENT_QUEUE_COLLECTION).eq('doc_id', row.doc_id);
          if (sellerPersonaId) sellersTouched.add(sellerPersonaId);
        } catch (eventError) {
          const attempts = Math.max(1, Math.round(safeNumber(payload?.attempts, 0)) + 1);
          const backoffMs = Math.min(60 * 1000, attempts * 2500);
          await supabase.from('mirror_documents').update({
            data: {
              ...payload,
              attempts,
              lastError: safeString(eventError?.message || String(eventError), 380),
              nextAttemptAt: new Date(Date.now() + backoffMs).toISOString(),
              status: 'pending'
            },
            updated_at: new Date().toISOString()
          }).eq('collection', EVENT_QUEUE_COLLECTION).eq('doc_id', row.doc_id);
        }
      }

      for (const sellerPersonaId of sellersTouched) {
        try {
          await refreshSellerFeatureStore(sellerPersonaId);
        } catch {
          // continue
        }
      }

      await pruneAnalyticsData();
    } finally {
      queueProcessingLocked = false;
    }
  };

  const startQueueWorker = () => {
    if (queueWorkerRunning) return;
    queueWorkerRunning = true;
    queueWorkerTimer = setInterval(() => {
      void processQueueBatch();
    }, 2500);
    queueWorkerTimer.unref?.();
  };

  const stopQueueWorker = () => {
    queueWorkerRunning = false;
    if (queueWorkerTimer) {
      clearInterval(queueWorkerTimer);
      queueWorkerTimer = null;
    }
  };

  const getSellerSnapshot = async (sellerPersonaId, daysBack, timezone) => {
    const cacheRow = await supabase
      .from('mirror_documents')
      .select('doc_id,data,updated_at')
      .eq('collection', FEATURE_STORE_COLLECTION)
      .eq('doc_id', sellerPersonaId)
      .maybeSingle();

    if (!cacheRow.error && cacheRow.data?.data?.snapshot) {
      const snapshot = cacheRow.data.data.snapshot;
      const snapshotAge = Date.now() - new Date(cacheRow.data.updated_at || 0).getTime();
      if (snapshotAge <= 45 * 1000 && Number(daysBack || 30) === 30 && !timezone) return snapshot;
    }

    return computeSellerAnalytics({ sellerPersonaId, daysBack, timezone });
  };

  const buildListingAnalytics = async ({ itemId, daysBack = 30, timezone = 'UTC' }) => {
    const itemContext = await resolveItemContext(itemId);
    if (!itemContext) return null;
    const sellerPersonaId = safeString(itemContext.owner_persona_id, 72);
    if (!sellerPersonaId) return null;

    const events = await fetchSellerAuditEvents(sellerPersonaId, daysBack);
    const itemEvents = events.filter((entry) => entry.itemId === itemId);
    const views = itemEvents.filter((entry) => entry.eventName === 'item_view');
    const carts = itemEvents.filter((entry) => entry.eventName === 'cart_add');
    const checkouts = itemEvents.filter((entry) => isCompletedEvent(entry.eventName));

    const referrerMap = new Map();
    views.forEach((entry) => {
      const source = entry.source || 'direct';
      referrerMap.set(source, (referrerMap.get(source) || 0) + 1);
    });

    const topReferrers = Array.from(referrerMap.entries())
      .map(([source, count]) => ({ source, totalVisitors: count, conversionRate: views.length > 0 ? Number(((count / views.length) * 100).toFixed(2)) : 0 }))
      .sort((left, right) => right.totalVisitors - left.totalVisitors)
      .slice(0, 6);

    const averageViewDurationSeconds = views.length > 0 ? Number((sum(views.map((entry) => entry.durationMs)) / views.length / 1000).toFixed(2)) : 0;
    return {
      itemId,
      itemTitle: safeString(itemContext.title, 220),
      totalViews: views.length,
      totalClicks: views.filter((entry) => entry.durationMs > 1000).length,
      totalCartAdds: carts.length,
      totalCheckouts: checkouts.length,
      conversionRate: views.length > 0 ? Number(((checkouts.length / views.length) * 100).toFixed(2)) : 0,
      averageViewDurationSeconds,
      viewsData: views.map((entry) => ({ id: entry.id, visitorId: entry.visitorId, visitorName: entry.actorName || entry.visitorName || decryptPii(entry.visitorNameEncrypted) || 'Visitor', itemId, viewedAt: entry.occurredAt, durationMs: entry.durationMs, deviceType: entry.deviceType, source: entry.source })),
      cartAddData: carts.map((entry) => ({ id: entry.id, userId: entry.actorFirebaseUid || entry.visitorId, userName: entry.actorName || entry.visitorName || decryptPii(entry.actorNameEncrypted) || 'Visitor', itemId, addedAt: entry.occurredAt, quantity: entry.quantity, completedCheckout: false })),
      checkoutData: checkouts.map((entry) => ({ id: entry.id, userId: entry.actorFirebaseUid || entry.visitorId, userName: entry.actorName || entry.visitorName || decryptPii(entry.actorNameEncrypted) || 'Customer', itemId, orderId: '', checkoutTime: entry.occurredAt, amount: entry.amount, status: 'completed' })),
      topReferrers,
      timezone
    };
  };

  const buildAbandonedCarts = async ({ sellerPersonaId, daysBack = 7 }) => {
    const events = await fetchSellerAuditEvents(sellerPersonaId, daysBack);
    const carts = events
      .filter((entry) => entry.eventName === 'cart_add')
      .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());

    const checkoutsByKey = new Map();
    events.filter((entry) => isCompletedEvent(entry.eventName)).forEach((entry) => {
      const key = `${entry.visitorId}:${entry.itemId}`;
      const current = checkoutsByKey.get(key) || [];
      current.push(new Date(entry.occurredAt).getTime());
      checkoutsByKey.set(key, current);
    });

    const abandoned = [];
    carts.forEach((cart) => {
      const key = `${cart.visitorId}:${cart.itemId}`;
      const checkoutTimes = checkoutsByKey.get(key) || [];
      const cartTime = new Date(cart.occurredAt).getTime();
      const matched = checkoutTimes.some((timestamp) => timestamp >= cartTime && timestamp <= cartTime + 14 * 24 * HOUR);
      if (!matched) {
        abandoned.push({
          id: cart.id,
          userId: cart.actorFirebaseUid || cart.visitorId,
          userName: cart.actorName || cart.visitorName || decryptPii(cart.actorNameEncrypted) || 'Visitor',
          itemId: cart.itemId,
          addedAt: cart.occurredAt,
          quantity: cart.quantity,
          completedCheckout: false
        });
      }
    });
    return abandoned.sort((left, right) => new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime()).slice(0, 500);
  };

  const ensurePersonaAccess = async (req, sellerPersonaId, res) => {
    if (!req.user?.uid) return true;
    const canAccess = await userCanAccessPersona(sellerPersonaId, req.user.uid);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
    return true;
  };

  const upsertRecommendationFeedback = async ({ sellerPersonaId, recommendationId, type, action, context = {} }) => {
    const nowIso = new Date().toISOString();
    const id = `${sellerPersonaId}:${recommendationId}:${randomUUID()}`;
    const { data, error } = await supabase
      .from('mirror_documents')
      .upsert({
        collection: RECOMMENDATION_FEEDBACK_COLLECTION,
        doc_id: id,
        data: { sellerPersonaId, recommendationId, type, action, context, recordedAt: nowIso },
        updated_at: nowIso
      }, {
        onConflict: 'collection,doc_id',
        ignoreDuplicates: false
      })
      .select('collection,doc_id,updated_at')
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const listExperiments = async (sellerPersonaId) => {
    const { data, error } = await supabase
      .from('mirror_documents')
      .select('doc_id,data,updated_at')
      .eq('collection', EXPERIMENT_COLLECTION)
      .order('updated_at', { ascending: false })
      .limit(400);
    if (error) throw error;
    return ensureArray(data).map((row) => ({ id: row.doc_id, ...normalizeJsonObject(row.data) })).filter((experiment) => experiment.sellerPersonaId === sellerPersonaId);
  };

  const fetchExperiment = async (experimentId) => {
    const { data, error } = await supabase
      .from('mirror_documents')
      .select('doc_id,data,updated_at')
      .eq('collection', EXPERIMENT_COLLECTION)
      .eq('doc_id', experimentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.doc_id, ...normalizeJsonObject(data.data) };
  };

  const registerRoutes = () => {
    app.post('/analytics/events', async (req, res) => {
      try {
        const ip = extractClientIp(req);
        if (isPublicRateLimited(ip)) return res.status(429).json({ error: 'Too many analytics events from this client. Retry shortly.' });
        const event = await normalizeIncomingEvent({ payload: req.body || {}, req });
        const queued = await enqueueAnalyticsEvent(event, { persistAuditLog: true });
        return res.status(201).json({ data: queued });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to ingest analytics event.' });
      }
    });

    app.post('/analytics/views', async (req, res) => {
      try {
        const payload = normalizeJsonObject(req.body);
        const event = await normalizeIncomingEvent({ payload: { ...payload, eventName: 'item_view' }, req, defaults: { eventName: 'item_view' } });
        const queued = await enqueueAnalyticsEvent(event, { persistAuditLog: true });
        return res.status(201).json({ data: queued });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to track view event.' });
      }
    });

    app.post('/analytics/cart-adds', async (req, res) => {
      try {
        const payload = normalizeJsonObject(req.body);
        const event = await normalizeIncomingEvent({ payload: { ...payload, eventName: 'cart_add' }, req, defaults: { eventName: 'cart_add' } });
        const queued = await enqueueAnalyticsEvent(event, { persistAuditLog: true });
        return res.status(201).json({ data: queued });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to track cart event.' });
      }
    });

    app.post('/analytics/checkouts', async (req, res) => {
      try {
        const payload = normalizeJsonObject(req.body);
        const status = safeString(payload?.status, 24).toLowerCase();
        const eventName = status === 'completed' ? 'checkout_completed' : 'checkout_started';
        const event = await normalizeIncomingEvent({ payload: { ...payload, eventName }, req, defaults: { eventName } });
        const queued = await enqueueAnalyticsEvent(event, { persistAuditLog: true });
        return res.status(201).json({ data: queued });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to track checkout event.' });
      }
    });

    app.get('/analytics/sellers/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;

        const daysBack = clamp(Math.round(safeNumber(req.query.days, 30)), 1, 365);
        const timezone = safeString(req.query.timezone || '', 80) || undefined;
        const snapshot = await getSellerSnapshot(sellerPersonaId, daysBack, timezone);

        await writeAuditLog({
          actorUserId: null,
          action: 'analytics_seller_read',
          entityType: 'analytics',
          entityId: sellerPersonaId,
          details: { daysBack, timezone: timezone || snapshot.timezone }
        });

        return res.json({ data: snapshot });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load seller analytics.' });
      }
    });

    app.get('/analytics/intelligence/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;
        const daysBack = clamp(Math.round(safeNumber(req.query.days, 30)), 1, 365);
        const snapshot = await getSellerSnapshot(sellerPersonaId, daysBack);

        return res.json({
          data: {
            insights: snapshot.insights,
            funnel: snapshot.funnel,
            forecasts: snapshot.forecasts,
            journeys: snapshot.journeys,
            anomalies: snapshot.anomalies,
            trendAcceleration: snapshot.trendAcceleration,
            attribution: snapshot.attribution,
            recommendations: snapshot.recommendations,
            cohorts: snapshot.cohorts,
            trust: snapshot.trust,
            realtimeMetrics: snapshot.realtimeMetrics,
            generatedAt: snapshot.generatedAt,
            timezone: snapshot.timezone
          }
        });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load seller intelligence.' });
      }
    });

    app.get('/analytics/realtime/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;
        const snapshot = await getSellerSnapshot(sellerPersonaId, 30);
        return res.json({ data: snapshot.realtimeMetrics || [] });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load realtime metrics.' });
      }
    });

    app.get('/analytics/listings/:itemId', requireAuth, async (req, res) => {
      try {
        const itemId = safeString(req.params.itemId, 72);
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        const itemContext = await resolveItemContext(itemId);
        if (!itemContext?.owner_persona_id) return res.status(404).json({ error: 'Listing not found' });

        const allowed = await ensurePersonaAccess(req, itemContext.owner_persona_id, res);
        if (!allowed) return;

        const daysBack = clamp(Math.round(safeNumber(req.query.days, 30)), 1, 365);
        const timezone = safeString(req.query.timezone || '', 80) || 'UTC';
        const listing = await buildListingAnalytics({ itemId, daysBack, timezone });
        if (!listing) return res.status(404).json({ error: 'Listing analytics not found' });

        return res.json({ data: listing });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load listing analytics.' });
      }
    });

    app.get('/analytics/listings/:itemId/visitors', requireAuth, async (req, res) => {
      try {
        const itemId = safeString(req.params.itemId, 72);
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        const itemContext = await resolveItemContext(itemId);
        if (!itemContext?.owner_persona_id) return res.status(404).json({ error: 'Listing not found' });

        const allowed = await ensurePersonaAccess(req, itemContext.owner_persona_id, res);
        if (!allowed) return;

        const daysBack = clamp(Math.round(safeNumber(req.query.days, 7)), 1, 90);
        const listing = await buildListingAnalytics({ itemId, daysBack });
        const visitors = ensureArray(listing?.viewsData).sort((left, right) => new Date(right.viewedAt).getTime() - new Date(left.viewedAt).getTime()).slice(0, 1000);
        return res.json({ data: visitors });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load listing visitors.' });
      }
    });

    app.get('/analytics/sellers/:sellerId/abandoned-carts', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;

        const daysBack = clamp(Math.round(safeNumber(req.query.days, 7)), 1, 90);
        const abandoned = await buildAbandonedCarts({ sellerPersonaId, daysBack });
        return res.json({ data: abandoned });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load abandoned carts.' });
      }
    });

    app.get('/analytics/stream/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const initialSnapshot = await getSellerSnapshot(sellerPersonaId, 30);
        res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, sellerPersonaId, connectedAt: new Date().toISOString() })}\n\n`);
        res.write(`event: analytics\ndata: ${JSON.stringify({
          type: 'analytics.snapshot',
          sellerPersonaId,
          generatedAt: initialSnapshot.generatedAt,
          summary: {
            totalRevenue: initialSnapshot.totalRevenue,
            totalViews: initialSnapshot.totalViews,
            totalOrders: initialSnapshot.totalOrders,
            conversionRate: initialSnapshot.conversionRate,
            cartAbandonmentRate: initialSnapshot.cartAbandonmentRate
          },
          realtimeMetrics: initialSnapshot.realtimeMetrics,
          funnel: initialSnapshot.funnel,
          insights: initialSnapshot.insights.slice(0, 6),
          recommendations: initialSnapshot.recommendations.slice(0, 4),
          anomalies: initialSnapshot.anomalies.slice(0, 4)
        })}\n\n`);

        const heartbeat = setInterval(() => {
          try {
            res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
          } catch {
            // noop
          }
        }, 20 * 1000);
        heartbeat.unref?.();

        const subscribers = sellerSubscribers.get(sellerPersonaId) || new Set();
        subscribers.add(res);
        sellerSubscribers.set(sellerPersonaId, subscribers);

        req.on('close', () => {
          clearInterval(heartbeat);
          const current = sellerSubscribers.get(sellerPersonaId);
          if (!current) return;
          current.delete(res);
          if (current.size === 0) sellerSubscribers.delete(sellerPersonaId);
        });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to open analytics stream.' });
      }
    });

    app.post('/analytics/recommendations/:sellerId/feedback', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;

        const payload = normalizeJsonObject(req.body);
        const recommendationId = safeString(payload.recommendationId || payload.recommendation_id, 120);
        const type = safeString(payload.type, 40) || 'general';
        const action = safeString(payload.action, 20).toLowerCase();
        if (!recommendationId) return res.status(400).json({ error: 'recommendationId is required' });
        if (!['accepted', 'dismissed', 'ignored'].includes(action)) return res.status(400).json({ error: 'action must be accepted, dismissed, or ignored' });

        const context = sanitizeMetadata(payload.context || {});
        const saved = await upsertRecommendationFeedback({ sellerPersonaId, recommendationId, type, action, context });
        return res.status(201).json({ data: saved });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to save recommendation feedback.' });
      }
    });

    app.post('/analytics/experiments', requireAuth, async (req, res) => {
      try {
        const payload = normalizeJsonObject(req.body);
        const sellerPersonaId = safeString(payload.sellerPersonaId || payload.seller_persona_id, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerPersonaId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;

        const name = safeString(payload.name, 120);
        const target = safeString(payload.target || 'listing', 40).toLowerCase();
        const metric = safeString(payload.metric || 'conversion_rate', 50).toLowerCase();
        const variantsRaw = ensureArray(payload.variants).filter((entry) => entry && typeof entry === 'object');
        if (!name) return res.status(400).json({ error: 'name is required' });
        if (variantsRaw.length < 2) return res.status(400).json({ error: 'At least two variants are required' });

        const variants = variantsRaw.slice(0, 8).map((entry, index) => ({
          id: safeString(entry.id, 80) || `variant_${index + 1}`,
          label: safeString(entry.label, 120) || `Variant ${index + 1}`,
          weight: clamp(safeNumber(entry.weight, 1), 0.01, 100),
          config: sanitizeMetadata(entry.config || {})
        }));

        const experimentId = randomUUID();
        const nowIso = new Date().toISOString();
        const experiment = {
          sellerPersonaId,
          name,
          target,
          metric,
          status: 'active',
          variants,
          startedAt: nowIso,
          endedAt: null,
          metadata: sanitizeMetadata(payload.metadata || {}),
          createdAt: nowIso,
          updatedAt: nowIso
        };

        await supabase.from('mirror_documents').upsert({
          collection: EXPERIMENT_COLLECTION,
          doc_id: experimentId,
          data: experiment,
          updated_at: nowIso
        }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

        return res.status(201).json({ data: { id: experimentId, ...experiment } });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to create experiment.' });
      }
    });

    app.get('/analytics/experiments/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;
        const experiments = await listExperiments(sellerPersonaId);
        return res.json({ data: experiments });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load experiments.' });
      }
    });

    app.post('/analytics/experiments/:experimentId/assign', async (req, res) => {
      try {
        const experimentId = safeString(req.params.experimentId, 80);
        if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
        const experiment = await fetchExperiment(experimentId);
        if (!experiment) return res.status(404).json({ error: 'Experiment not found' });
        if (safeString(experiment.status, 20) !== 'active') return res.status(409).json({ error: 'Experiment is not active' });

        const payload = normalizeJsonObject(req.body);
        const visitorId = safeString(payload.visitorId || payload.visitor_id, 180)
          || deriveVisitorId({ payload, metadata: normalizeJsonObject(payload.metadata), actorFirebaseUid: '', actorUserId: '', req });
        const variants = ensureArray(experiment.variants);
        if (variants.length === 0) return res.status(400).json({ error: 'Experiment has no variants' });

        const assignmentHash = hashValue(`${experimentId}:${visitorId}`);
        const parsed = Number.parseInt(assignmentHash.slice(0, 8), 16);
        const index = Number.isFinite(parsed) ? parsed % variants.length : 0;
        const selected = variants[index];
        const nowIso = new Date().toISOString();

        await supabase.from('mirror_documents').upsert({
          collection: EXPERIMENT_ASSIGNMENT_COLLECTION,
          doc_id: `${experimentId}:${visitorId}`,
          data: { experimentId, sellerPersonaId: experiment.sellerPersonaId, visitorId, variantId: selected.id, assignedAt: nowIso },
          updated_at: nowIso
        }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

        return res.json({ data: { experimentId, visitorId, variant: selected } });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to assign experiment variant.' });
      }
    });

    app.post('/analytics/experiments/:experimentId/event', async (req, res) => {
      try {
        const experimentId = safeString(req.params.experimentId, 80);
        if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
        const experiment = await fetchExperiment(experimentId);
        if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

        const payload = normalizeJsonObject(req.body);
        const variantId = safeString(payload.variantId || payload.variant_id, 80);
        const eventName = normalizeEventName(payload.eventName || payload.event_name || 'item_view', 'item_view');
        const visitorId = safeString(payload.visitorId || payload.visitor_id, 180)
          || deriveVisitorId({ payload, metadata: normalizeJsonObject(payload.metadata), actorFirebaseUid: '', actorUserId: '', req });
        if (!variantId) return res.status(400).json({ error: 'variantId is required' });

        const eventId = randomUUID();
        const nowIso = new Date().toISOString();
        const payloadData = {
          experimentId,
          sellerPersonaId: experiment.sellerPersonaId,
          variantId,
          eventName,
          visitorId,
          amount: Math.max(0, safeNumber(payload.amount, 0)),
          metadata: sanitizeMetadata(payload.metadata || {}),
          occurredAt: nowIso
        };

        await supabase.from('mirror_documents').upsert({
          collection: EXPERIMENT_EVENT_COLLECTION,
          doc_id: eventId,
          data: payloadData,
          updated_at: nowIso
        }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

        return res.status(201).json({ data: { id: eventId, ...payloadData } });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to record experiment event.' });
      }
    });

    app.get('/analytics/experiments/:experimentId/results', requireAuth, async (req, res) => {
      try {
        const experimentId = safeString(req.params.experimentId, 80);
        if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
        const experiment = await fetchExperiment(experimentId);
        if (!experiment) return res.status(404).json({ error: 'Experiment not found' });
        const allowed = await ensurePersonaAccess(req, experiment.sellerPersonaId, res);
        if (!allowed) return;

        const { data, error } = await supabase
          .from('mirror_documents')
          .select('doc_id,data,updated_at')
          .eq('collection', EXPERIMENT_EVENT_COLLECTION)
          .order('updated_at', { ascending: false })
          .limit(10000);
        if (error) throw error;

        const rows = ensureArray(data).map((row) => normalizeJsonObject(row.data)).filter((row) => row.experimentId === experimentId);
        const byVariant = new Map();
        ensureArray(experiment.variants).forEach((variant) => {
          byVariant.set(String(variant.id), { variantId: String(variant.id), label: safeString(variant.label, 120) || String(variant.id), views: 0, carts: 0, checkouts: 0, revenue: 0, uniqueVisitors: new Set() });
        });

        rows.forEach((row) => {
          const variantId = safeString(row.variantId, 80);
          if (!byVariant.has(variantId)) return;
          const bucket = byVariant.get(variantId);
          bucket.uniqueVisitors.add(safeString(row.visitorId, 180));
          const eventName = normalizeEventName(row.eventName, 'item_view');
          if (eventName === 'item_view') bucket.views += 1;
          if (eventName === 'cart_add') bucket.carts += 1;
          if (isCompletedEvent(eventName)) {
            bucket.checkouts += 1;
            bucket.revenue += Math.max(0, safeNumber(row.amount, 0));
          }
        });

        const results = Array.from(byVariant.values()).map((entry) => ({
          variantId: entry.variantId,
          label: entry.label,
          views: entry.views,
          carts: entry.carts,
          checkouts: entry.checkouts,
          revenue: Number(entry.revenue.toFixed(2)),
          uniqueVisitors: entry.uniqueVisitors.size,
          conversionRate: entry.views > 0 ? Number(((entry.checkouts / entry.views) * 100).toFixed(2)) : 0
        }));

        return res.json({ data: { experimentId, results } });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load experiment results.' });
      }
    });

    app.get('/analytics/cohorts/:sellerId', requireAuth, async (req, res) => {
      try {
        const sellerPersonaId = safeString(req.params.sellerId, 72);
        if (!sellerPersonaId) return res.status(400).json({ error: 'sellerId is required' });
        const allowed = await ensurePersonaAccess(req, sellerPersonaId, res);
        if (!allowed) return;
        const daysBack = clamp(Math.round(safeNumber(req.query.days, 90)), 7, 365);
        const snapshot = await getSellerSnapshot(sellerPersonaId, daysBack);
        return res.json({ data: snapshot.cohorts || [] });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to load cohort analytics.' });
      }
    });

    app.post('/analytics/privacy/delete-persona/:personaId', requireAuth, async (req, res) => {
      try {
        const personaId = safeString(req.params.personaId, 72);
        if (!personaId) return res.status(400).json({ error: 'personaId is required' });
        const allowed = await ensurePersonaAccess(req, personaId, res);
        if (!allowed) return;

        const nowIso = new Date().toISOString();
        const requestId = randomUUID();
        const payload = normalizeJsonObject(req.body);

        await supabase.from('mirror_documents').upsert({
          collection: PRIVACY_DELETION_COLLECTION,
          doc_id: requestId,
          data: {
            personaId,
            requestedAt: nowIso,
            requestedBy: safeString(req.user?.uid, 160),
            reason: safeString(payload.reason, 220) || null,
            status: 'processing'
          },
          updated_at: nowIso
        }, { onConflict: 'collection,doc_id', ignoreDuplicates: false });

        await supabase.from('audit_logs').delete().contains('details', { ownerPersonaId: personaId });
        await supabase.from('audit_logs').delete().contains('details', { actorPersonaId: personaId });

        const analyticsCollections = [
          EVENT_QUEUE_COLLECTION,
          EVENT_ARCHIVE_COLLECTION,
          FEATURE_STORE_COLLECTION,
          RECOMMENDATION_FEEDBACK_COLLECTION,
          RECOMMENDATION_SNAPSHOT_COLLECTION,
          EXPERIMENT_COLLECTION,
          EXPERIMENT_ASSIGNMENT_COLLECTION,
          EXPERIMENT_EVENT_COLLECTION
        ];

        for (const collection of analyticsCollections) {
          const { data } = await supabase.from('mirror_documents').select('collection,doc_id,data').eq('collection', collection).limit(10000);
          for (const row of ensureArray(data)) {
            const rowData = normalizeJsonObject(row?.data);
            if (rowData?.sellerPersonaId === personaId || rowData?.ownerPersonaId === personaId || rowData?.personaId === personaId) {
              await supabase.from('mirror_documents').delete().eq('collection', collection).eq('doc_id', row.doc_id);
            }
          }
        }

        await supabase.from('mirror_documents').update({
          data: { personaId, requestedAt: nowIso, completedAt: new Date().toISOString(), status: 'completed', slaHours: 72 },
          updated_at: new Date().toISOString()
        }).eq('collection', PRIVACY_DELETION_COLLECTION).eq('doc_id', requestId);

        return res.status(202).json({ data: { requestId, personaId, status: 'completed', slaHours: 72, completedAt: new Date().toISOString() } });
      } catch (error) {
        return res.status(400).json({ error: error?.message || 'Unable to process privacy deletion request.' });
      }
    });
  };

  const enqueueFromActivity = async ({
    action,
    ownerPersonaId,
    ownerFirebaseUid,
    ownerUserId,
    actorUserId,
    actorFirebaseUid,
    actorPersonaId,
    actorName,
    itemId,
    itemTitle,
    listingType,
    quantity,
    durationMs,
    metadata,
    createdAt,
    amount,
    currency,
    req
  }) => {
    if (!itemId || !ownerPersonaId || !ownerFirebaseUid) return null;

    const requestLike = req || {
      get: () => '',
      headers: {},
      ip: 'unknown',
      socket: { remoteAddress: 'unknown' }
    };

    const event = await normalizeIncomingEvent({
      payload: {
        eventName: normalizeEventName(action, 'item_view'),
        ownerPersonaId,
        ownerFirebaseUid,
        ownerUserId,
        actorUserId,
        actorFirebaseUid,
        actorPersonaId,
        actorName,
        itemId,
        itemTitle,
        listingType,
        quantity,
        durationMs,
        metadata: metadata || {},
        occurredAt: createdAt,
        amount,
        currency
      },
      req: requestLike,
      defaults: { eventName: normalizeEventName(action, 'item_view') }
    });

    return enqueueAnalyticsEvent(event, { persistAuditLog: false });
  };

  const getHealthSnapshot = async () => {
    try {
      const { count } = await supabase
        .from('mirror_documents')
        .select('doc_id', { count: 'exact', head: true })
        .eq('collection', EVENT_QUEUE_COLLECTION);

      return {
        queuePending: count || 0,
        subscribers: Array.from(sellerSubscribers.values()).reduce((acc, current) => acc + current.size, 0),
        workerRunning: queueWorkerRunning
      };
    } catch {
      return {
        queuePending: null,
        subscribers: Array.from(sellerSubscribers.values()).reduce((acc, current) => acc + current.size, 0),
        workerRunning: queueWorkerRunning
      };
    }
  };

  return {
    registerRoutes,
    enqueueFromActivity,
    startQueueWorker,
    stopQueueWorker,
    getHealthSnapshot
  };
};

export default createAnalyticsEngine;
