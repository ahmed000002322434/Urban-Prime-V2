import { createHash } from 'crypto';
import {
  buildMockSpotlightFeedResponse,
  isSpotlightBackendUnavailableError
} from './spotlightFallback.js';

const FEED_MODES = new Set(['for_you', 'following', 'trending']);
const MEDIA_TYPES = new Set(['image', 'video']);
const VISIBILITY_VALUES = new Set(['public', 'followers', 'private']);
const CONTENT_STATUS_VALUES = new Set(['draft', 'published', 'archived']);
const MAX_CAPTION_LENGTH = 2200;
const MAX_COMMENT_LENGTH = 1000;
const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const PRODUCT_EVENT_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const PRODUCT_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SOCIAL_NOTIFICATION_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const FEED_CREATOR_PAGE_CAP = 2;
const DEFAULT_SPOTLIGHT_COMMISSION_RATE = 0.10;
const PRODUCT_EVENT_TYPES = new Set(['impression', 'click', 'view_item', 'add_to_cart', 'purchase']);
const PRODUCT_LINK_PLACEMENTS = new Set(['inline_chip', 'mini_card', 'context_mode', 'hero']);
const PRODUCT_LINK_SOURCES = new Set(['creator_tagged', 'algorithmic', 'campaign']);

const parsePositiveInt = (value, fallback, min = 1, max = 200) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};
const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeString = (value, fallback = '') => (value == null ? fallback : String(value));
const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const normalizeFeedMode = (value) => {
  const mode = safeString(value, 'for_you').trim().toLowerCase();
  return FEED_MODES.has(mode) ? mode : 'for_you';
};
const normalizeMediaType = (value) => {
  const mediaType = safeString(value).trim().toLowerCase();
  return MEDIA_TYPES.has(mediaType) ? mediaType : '';
};
const normalizeVisibility = (value) => {
  const visibility = safeString(value, 'public').trim().toLowerCase();
  return VISIBILITY_VALUES.has(visibility) ? visibility : 'public';
};
const normalizeStatus = (value) => {
  const status = safeString(value, 'draft').trim().toLowerCase();
  return CONTENT_STATUS_VALUES.has(status) ? status : 'draft';
};
const slugifyUsername = (value) => safeString(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 60);
const normalizeTagArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeString(entry).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
};
const extractHashtagsFromCaption = (caption) => {
  const tags = new Set();
  const matches = safeString(caption).match(/#([a-zA-Z0-9_]+)/g) || [];
  matches.forEach((match) => {
    const normalized = match.replace('#', '').trim().toLowerCase();
    if (normalized) tags.add(normalized);
  });
  return Array.from(tags).slice(0, 30);
};

const encodeCursor = (score, publishedAt, id) =>
  Buffer.from(`${Number(score || 0).toFixed(4)}|${publishedAt || ''}|${id || ''}`, 'utf8').toString('base64url');

const decodeCursor = (cursor) => {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [scoreRaw, publishedAtRaw, idRaw] = decoded.split('|');
    const score = Number.parseFloat(scoreRaw);
    const parsedDate = new Date(publishedAtRaw || '');
    if (!Number.isFinite(score) || Number.isNaN(parsedDate.getTime()) || !idRaw) return null;
    return { score, publishedAt: parsedDate.toISOString(), id: idRaw };
  } catch {
    return null;
  }
};

const parseBannedWords = (rawValue) =>
  rawValue
    ? String(rawValue)
      .split(/[\n,;]+/g)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
    : [];
const containsBannedWord = (text, bannedWords) => bannedWords.some((word) => safeString(text).toLowerCase().includes(word));

const createSessionFingerprint = (seedParts) => createHash('sha1').update(seedParts.map((entry) => safeString(entry)).join('|')).digest('hex');
const getDateBucketKey = (timestampMs, windowMs) => Math.floor(timestampMs / windowMs);
const getMentionCount = (text) => (safeString(text).match(/@[a-z0-9._-]+/gi) || []).length;
const parseCommentSort = (value) => (safeString(value, 'top').trim().toLowerCase() === 'new' ? 'new' : 'top');
const isUniqueViolation = (error) => safeString(error?.message || '').toLowerCase().includes('duplicate key');
const normalizeProductPlacement = (value) => {
  const normalized = safeString(value || 'inline_chip').trim().toLowerCase();
  return PRODUCT_LINK_PLACEMENTS.has(normalized) ? normalized : 'inline_chip';
};
const normalizeProductSource = (value) => {
  const normalized = safeString(value || 'creator_tagged').trim().toLowerCase();
  return PRODUCT_LINK_SOURCES.has(normalized) ? normalized : 'creator_tagged';
};
const normalizeProductEventType = (value) => {
  const normalized = safeString(value).trim().toLowerCase();
  return PRODUCT_EVENT_TYPES.has(normalized) ? normalized : '';
};
const toIsoOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const normalizeJsonObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const extractItemImage = (row) => {
  const metadata = normalizeJsonObject(row?.metadata);
  const imageList = Array.isArray(metadata.imageUrls)
    ? metadata.imageUrls
    : Array.isArray(metadata.images)
      ? metadata.images
      : [];
  return safeString(imageList[0] || row?.thumbnail_url || row?.image_url || '', '').trim();
};
const extractItemCategory = (row) => {
  const metadata = normalizeJsonObject(row?.metadata);
  return safeString(row?.category || metadata.category || '', '').trim().toLowerCase();
};
const extractItemBrand = (row) => {
  const metadata = normalizeJsonObject(row?.metadata);
  return safeString(row?.brand || metadata.brand || '', '').trim().toLowerCase();
};
const compactContextSummary = (row, products) => ({
  tag_count: [...(Array.isArray(row?.hashtags) ? row.hashtags : []), ...(Array.isArray(row?.interest_tags) ? row.interest_tags : [])].filter(Boolean).length,
  product_count: Array.isArray(products) ? products.length : 0,
  has_conversion_signals: Number(row?.product_purchases || 0) > 0 || Number(row?.product_clicks || 0) > 0
});

const mapContentRow = (row, metricsById, creatorsById, followedCreatorIds, productLinksByContentId = new Map()) => {
  const metrics = metricsById.get(row.id) || {};
  const creator = creatorsById.get(row.creator_user_id) || null;
  const baseScore = Number(row.feed_score || 0);
  const followBoost = followedCreatorIds.has(row.creator_user_id) ? 20 : 0;
  const products = productLinksByContentId.get(row.id) || [];
  return {
    id: row.id,
    creator_user_id: row.creator_user_id,
    media_type: row.media_type,
    media_url: row.media_url,
    thumbnail_url: row.thumbnail_url,
    caption: row.caption || '',
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    interest_tags: Array.isArray(row.interest_tags) ? row.interest_tags : [],
    visibility: row.visibility,
    allow_comments: Boolean(row.allow_comments),
    status: row.status,
    published_at: row.published_at,
    reposted_from_content_id: row.reposted_from_content_id || null,
    feed_score: baseScore,
    trending_score: Number(row.trending_score || 0),
    final_score: baseScore + followBoost,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metrics: {
      impressions: Number(metrics.impressions || 0),
      views: Number(metrics.views || 0),
      watch_time_ms: Number(metrics.watch_time_ms || 0),
      likes: Number(metrics.likes || 0),
      comments: Number(metrics.comments || 0),
      saves: Number(metrics.saves || 0),
      shares: Number(metrics.shares || 0),
      dislikes: Number(metrics.dislikes || 0),
      reposts: Number(metrics.reposts || 0),
      reports: Number(metrics.reports || 0),
      product_clicks: Number(metrics.product_clicks || 0),
      product_item_views: Number(metrics.product_item_views || 0),
      product_cart_adds: Number(metrics.product_cart_adds || 0),
      product_purchases: Number(metrics.product_purchases || 0),
      product_revenue_amount: Number(metrics.product_revenue_amount || 0),
      product_ctr: Number(metrics.product_ctr || 0),
      product_conversion_rate: Number(metrics.product_conversion_rate || 0),
      engagement_rate: Number(metrics.engagement_rate || 0)
    },
    products,
    conversion_metrics: {
      impressions: Number(metrics.impressions || 0),
      clicks: Number(metrics.product_clicks || 0),
      item_views: Number(metrics.product_item_views || 0),
      cart_adds: Number(metrics.product_cart_adds || 0),
      purchases: Number(metrics.product_purchases || 0),
      revenue_amount: Number(metrics.product_revenue_amount || 0),
      ctr: Number(metrics.product_ctr || 0),
      conversion_rate: Number(metrics.product_conversion_rate || 0)
    },
    context_summary: compactContextSummary(row, products),
    creator: creator
      ? {
          id: creator.id,
          firebase_uid: creator.firebase_uid,
          name: creator.name || 'Creator',
          avatar_url: creator.avatar_url || '/icons/urbanprime.svg',
          is_verified: Boolean(creator.is_verified),
          followers_count: Number(creator.followers_count || 0),
          following_count: Number(creator.following_count || 0),
          posts_count: Number(creator.posts_count || 0),
          reels_count: Number(creator.reels_count || 0),
          is_following: followedCreatorIds.has(row.creator_user_id)
        }
      : null
  };
};

const createActionRateGuard = () => {
  const bucket = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of bucket.entries()) {
      if (value.resetAt <= now) bucket.delete(key);
    }
  }, 30_000).unref?.();

  return ({ userId, action, windowMs, max }) => {
    const now = Date.now();
    const key = `${userId}:${action}`;
    const current = bucket.get(key);
    if (!current || current.resetAt <= now) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }
    if (current.count >= max) return { retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1) };
    current.count += 1;
    return null;
  };
};

const createCommentSpamGuard = () => {
  const cache = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of cache.entries()) {
      if (expiry <= now) cache.delete(key);
    }
  }, 30_000).unref?.();
  return ({ userId, contentId, text, cooldownMs = 45_000 }) => {
    const key = `${userId}:${contentId}:${safeString(text).trim().toLowerCase()}`;
    const now = Date.now();
    const current = cache.get(key) || 0;
    if (current > now) return Math.max(Math.ceil((current - now) / 1000), 1);
    cache.set(key, now + cooldownMs);
    return 0;
  };
};

const createNotificationDeduper = () => {
  const cache = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of cache.entries()) {
      if (expiry <= now) cache.delete(key);
    }
  }, 60_000).unref?.();
  return (key) => {
    const now = Date.now();
    const existing = cache.get(key) || 0;
    if (existing > now) return false;
    cache.set(key, now + SOCIAL_NOTIFICATION_DEDUPE_WINDOW_MS);
    return true;
  };
};

const registerSpotlightRoutes = ({ app, supabase, requireAuth, resolveUserIdFromFirebaseUid }) => {
  const bannedWords = parseBannedWords(process.env.SPOTLIGHT_BANNED_WORDS);
  const enforceModeration = parseBoolean(process.env.SPOTLIGHT_BANNED_WORDS_ENFORCED, true);
  const hitRateGuard = createActionRateGuard();
  const commentSpamGuard = createCommentSpamGuard();
  const shouldEmitNotification = createNotificationDeduper();

  const ensureUserProfileRow = async (userId) => {
    if (!userId) return;
    await supabase.from('user_profiles').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  };

  const refreshCreatorCounters = async (creatorUserId) => {
    if (!creatorUserId) return;
    await ensureUserProfileRow(creatorUserId);
    const [{ data: rows }, { count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('spotlight_content').select('media_type').eq('creator_user_id', creatorUserId).eq('status', 'published'),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_user_id', creatorUserId),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', creatorUserId)
    ]);
    const postsCount = (rows || []).filter((entry) => entry.media_type === 'image').length;
    const reelsCount = (rows || []).filter((entry) => entry.media_type === 'video').length;
    await supabase
      .from('user_profiles')
      .update({
        followers_count: Number(followersCount || 0),
        following_count: Number(followingCount || 0),
        posts_count: postsCount,
        reels_count: reelsCount
      })
      .eq('user_id', creatorUserId);
  };

  const triggerRecomputeMetrics = async (contentId) => {
    if (!contentId) return;
    try {
      await supabase.rpc('spotlight_recompute_metrics', { p_content_id: contentId });
    } catch {
      // ignore recompute failures so user actions can still complete
    }
  };

  const ignoreSupabaseMutationError = async (operation) => {
    try {
      await operation;
    } catch {
      // intentionally ignored for cleanup-style operations
    }
  };

  const emitSocialNotification = async ({ type, targetUserId, actorUserId, contentId, title, body, link }) => {
    if (!targetUserId || !actorUserId || targetUserId === actorUserId) return;
    const dedupeKey = `${type}:${targetUserId}:${actorUserId}:${contentId || ''}`;
    if (!shouldEmitNotification(dedupeKey)) return;
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type,
        title,
        body,
        link: link || '/spotlight'
      });
    } catch (error) {
      console.warn('Spotlight notification skipped:', error?.message || error);
    }
  };

  const getRequestFirebaseUid = (req) => {
    const candidates = [
      req.user?.uid,
      req.headers['x-firebase-uid'],
      req.body?.firebase_uid,
      req.body?.firebaseUid,
      req.body?.viewer_firebase_uid,
      req.query?.firebase_uid,
      req.query?.firebaseUid,
      req.query?.viewer_firebase_uid
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const firstValue = safeString(candidate[0] || '').trim();
        if (firstValue) return firstValue;
        continue;
      }
      const normalized = safeString(candidate || '').trim();
      if (normalized) return normalized;
    }

    return '';
  };

  const resolveAuthedUserId = async (req, res) => {
    const firebaseUid = getRequestFirebaseUid(req);
    if (!firebaseUid) {
      res.status(401).json({ error: 'Missing authenticated user context.' });
      return null;
    }
    const userId = await resolveUserIdFromFirebaseUid(firebaseUid);
    if (!userId) {
      res.status(400).json({ error: 'Unable to resolve user id for current session.' });
      return null;
    }
    return { firebaseUid, userId };
  };

  const resolveViewerContext = async (req) => {
    let viewerFirebaseUid = getRequestFirebaseUid(req);
    if (!viewerFirebaseUid) viewerFirebaseUid = safeString(req.query.viewer_firebase_uid || req.body?.viewer_firebase_uid || '').trim();
    if (!viewerFirebaseUid) return { viewerFirebaseUid: '', viewerUserId: null };
    const viewerUserId = await resolveUserIdFromFirebaseUid(viewerFirebaseUid).catch(() => null);
    return { viewerFirebaseUid, viewerUserId: viewerUserId || null };
  };

  const checkActionRate = (res, { userId, action, windowMs, max }) => {
    const limitError = hitRateGuard({ userId, action, windowMs, max });
    if (!limitError) return false;
    res.setHeader('Retry-After', String(limitError.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests for this action. Please try again shortly.' });
    return true;
  };

  const getFollowedCreatorIds = async (viewerUserId) => {
    if (!viewerUserId) return new Set();
    const { data } = await supabase.from('user_follows').select('following_user_id').eq('follower_id', viewerUserId);
    return new Set((data || []).map((row) => row.following_user_id).filter(Boolean));
  };

  const getBlockedUserIdSet = async (viewerUserId) => {
    if (!viewerUserId) return new Set();
    const [{ data: blockedByViewer }, { data: blockedViewer }] = await Promise.all([
      supabase.from('user_blocks').select('blocked_user_id').eq('blocker_user_id', viewerUserId),
      supabase.from('user_blocks').select('blocker_user_id').eq('blocked_user_id', viewerUserId)
    ]);
    const blockedIds = new Set();
    (blockedByViewer || []).forEach((row) => row.blocked_user_id && blockedIds.add(row.blocked_user_id));
    (blockedViewer || []).forEach((row) => row.blocker_user_id && blockedIds.add(row.blocker_user_id));

    const [{ data: restrictedByViewer }, { data: restrictedViewer }] = await Promise.all([
      supabase.from('user_restrictions').select('restricted_user_id').eq('restrictor_user_id', viewerUserId),
      supabase.from('user_restrictions').select('restrictor_user_id').eq('restricted_user_id', viewerUserId)
    ]);
    (restrictedByViewer || []).forEach((row) => row.restricted_user_id && blockedIds.add(row.restricted_user_id));
    (restrictedViewer || []).forEach((row) => row.restrictor_user_id && blockedIds.add(row.restrictor_user_id));
    return blockedIds;
  };

  const canViewerAccessRow = ({ row, viewerUserId, followedCreatorIds }) => {
    const visibility = safeString(row?.visibility || 'public').toLowerCase();
    if (!row) return false;
    if (visibility === 'public') return true;
    if (!viewerUserId) return false;
    if (row.creator_user_id === viewerUserId) return true;
    if (visibility === 'private') return false;
    if (visibility === 'followers') return followedCreatorIds.has(row.creator_user_id);
    return false;
  };

  const computeRankingScoreForRow = ({ mode, row, followedCreatorIds }) => {
    if (mode === 'trending') return Number(row?.trending_score || 0);
    const baseScore = Number(row?.feed_score || 0);
    const followBoost = followedCreatorIds?.has(row?.creator_user_id) ? 20 : 0;
    return baseScore + followBoost;
  };

  const buildCreatorMaps = async (contentRows) => {
    const creatorIds = Array.from(new Set((contentRows || []).map((row) => row.creator_user_id).filter(Boolean)));
    if (creatorIds.length === 0) return new Map();
    const { data: creatorRows } = await supabase.from('users').select('id,firebase_uid,name,avatar_url').in('id', creatorIds);
    const { data: profileRows } = await supabase
      .from('user_profiles')
      .select('user_id,followers_count,following_count,posts_count,reels_count,is_verified')
      .in('user_id', creatorIds);
    const profileByUserId = new Map((profileRows || []).map((row) => [row.user_id, row]));
    const map = new Map();
    (creatorRows || []).forEach((creator) => map.set(creator.id, { ...creator, ...(profileByUserId.get(creator.id) || {}) }));
    return map;
  };

  const buildUserPreviewList = async (userIds) => {
    const filteredIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (filteredIds.length === 0) return [];
    const [{ data: userRows }, { data: profileRows }] = await Promise.all([
      supabase.from('users').select('id,firebase_uid,name,avatar_url').in('id', filteredIds),
      supabase.from('user_profiles').select('user_id,is_verified,followers_count,following_count,posts_count,reels_count').in('user_id', filteredIds)
    ]);
    const profileByUserId = new Map((profileRows || []).map((row) => [row.user_id, row]));
    return (userRows || []).map((row) => {
      const profile = profileByUserId.get(row.id) || {};
      return {
        id: row.id,
        firebase_uid: row.firebase_uid,
        name: row.name || 'Creator',
        avatar_url: row.avatar_url || '/icons/urbanprime.svg',
        is_verified: Boolean(profile.is_verified),
        followers_count: Number(profile.followers_count || 0),
        following_count: Number(profile.following_count || 0),
        posts_count: Number(profile.posts_count || 0),
        reels_count: Number(profile.reels_count || 0)
      };
    });
  };

  const resolveTargetUserByUsername = async (rawUsername) => {
    const normalizedUsername = slugifyUsername(rawUsername);
    if (!normalizedUsername) return null;
    const { data: candidateUsers, error: usersError } = await supabase
      .from('users')
      .select('id,firebase_uid,name,avatar_url')
      .limit(5000);
    if (usersError) throw usersError;
    return (candidateUsers || []).find((row) => {
      const rowSlug = slugifyUsername(row.name);
      return rowSlug === normalizedUsername || safeString(row.firebase_uid).trim().toLowerCase() === normalizedUsername;
    }) || null;
  };

  const buildMetricsMap = async (contentRows) => {
    const contentIds = Array.from(new Set((contentRows || []).map((row) => row.id).filter(Boolean)));
    if (contentIds.length === 0) return new Map();
    const { data: metricsRows } = await supabase
      .from('spotlight_metrics')
      .select('content_id,impressions,views,watch_time_ms,likes,comments,saves,shares,dislikes,reposts,reports,product_clicks,product_item_views,product_cart_adds,product_purchases,product_revenue_amount,product_ctr,product_conversion_rate,engagement_rate')
      .in('content_id', contentIds);
    return new Map((metricsRows || []).map((row) => [row.content_id, row]));
  };

  const buildProductLinkMap = async (contentRows) => {
    const contentIds = Array.from(new Set((contentRows || []).map((row) => row.id).filter(Boolean)));
    if (contentIds.length === 0) return new Map();
    const { data: linkRows, error: linkError } = await supabase
      .from('spotlight_product_links')
      .select('id,content_id,item_id,linked_by_user_id,placement,cta_label,sort_order,is_primary,source,campaign_key,metadata,created_at,updated_at')
      .in('content_id', contentIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (linkError) throw linkError;

    const itemIds = Array.from(new Set((linkRows || []).map((row) => row.item_id).filter(Boolean)));
    const { data: itemRows, error: itemError } = itemIds.length
      ? await supabase
        .from('items')
        .select('id,title,seller_id,listing_type,sale_price,rental_price,currency,status,metadata')
        .in('id', itemIds)
      : { data: [], error: null };
    if (itemError) throw itemError;

    const itemById = new Map((itemRows || []).map((row) => [row.id, row]));
    const map = new Map();
    (linkRows || []).forEach((row) => {
      const item = itemById.get(row.item_id);
      if (!item) return;
      if (!map.has(row.content_id)) map.set(row.content_id, []);
      map.get(row.content_id).push({
        id: row.id,
        item_id: row.item_id,
        title: safeString(item.title || 'Product'),
        image_url: extractItemImage(item),
        listing_type: safeString(item.listing_type || 'sale'),
        sale_price: Number(item.sale_price || 0),
        rental_price: Number(item.rental_price || 0),
        currency: safeString(item.currency || 'USD', 'USD'),
        status: safeString(item.status || 'published', 'published'),
        placement: row.placement,
        cta_label: safeString(row.cta_label || 'Shop now', 'Shop now'),
        sort_order: Number(row.sort_order || 0),
        is_primary: Boolean(row.is_primary),
        source: row.source,
        campaign_key: row.campaign_key || null,
        metadata: normalizeJsonObject(row.metadata)
      });
    });
    return map;
  };

  const recordFeedImpressions = async ({ rows, viewerUserId, sessionSeed, surface = 'feed', feedMode = 'for_you' }) => {
    const contentRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (contentRows.length === 0) return;
    const viewerSessionKey = sessionSeed || createSessionFingerprint([viewerUserId || 'guest', Date.now(), surface, feedMode]).slice(0, 32);
    const bucketKey = getDateBucketKey(Date.now(), PRODUCT_EVENT_DEDUPE_WINDOW_MS);
    const payload = contentRows.map((row, index) => ({
      content_id: row.id,
      viewer_user_id: viewerUserId,
      viewer_session_key: viewerSessionKey,
      surface,
      feed_mode: feedMode,
      position: index,
      dedupe_key: createSessionFingerprint([viewerUserId || 'guest', viewerSessionKey, row.id, surface, feedMode, bucketKey]),
      impressed_at: new Date().toISOString()
    }));
    if (payload.length === 0) return;
    const { error } = await supabase.from('spotlight_feed_impressions').insert(payload);
    if (error && !isUniqueViolation(error)) {
      console.warn('Spotlight feed impression tracking skipped:', error.message || error);
      return;
    }
    await Promise.all(contentRows.map((row) => triggerRecomputeMetrics(row.id)));
  };

  const hydrateFeedItems = async ({ contentRows, followedCreatorIds }) => {
    const [metricsById, creatorsById, productLinksByContentId] = await Promise.all([
      buildMetricsMap(contentRows),
      buildCreatorMaps(contentRows),
      buildProductLinkMap(contentRows)
    ]);
    return (contentRows || []).map((row) => mapContentRow(row, metricsById, creatorsById, followedCreatorIds, productLinksByContentId));
  };

  const cursorMatch = ({ cursor, item, score }) => {
    if (!cursor) return true;
    const normalizedScore = Number(score || 0);
    const publishedAt = safeString(item?.published_at || '');
    const id = safeString(item?.id || '');
    if (normalizedScore < cursor.score) return true;
    if (normalizedScore > cursor.score) return false;
    if (publishedAt < cursor.publishedAt) return true;
    if (publishedAt > cursor.publishedAt) return false;
    return id < cursor.id;
  };

  const hydrateCommentUsers = async (commentRows) => {
    const userIds = Array.from(new Set((commentRows || []).map((row) => row.user_id).filter(Boolean)));
    if (userIds.length === 0) return new Map();
    const { data: users } = await supabase.from('users').select('id,firebase_uid,name,avatar_url').in('id', userIds);
    const { data: profiles } = await supabase.from('user_profiles').select('user_id,is_verified').in('user_id', userIds);
    const profileByUserId = new Map((profiles || []).map((row) => [row.user_id, row]));
    const usersById = new Map();
    (users || []).forEach((row) =>
      usersById.set(row.id, {
        id: row.id,
        firebase_uid: row.firebase_uid,
        name: row.name || 'Creator',
        avatar_url: row.avatar_url || '/icons/urbanprime.svg',
        is_verified: Boolean(profileByUserId.get(row.id)?.is_verified)
      })
    );
    return usersById;
  };

  const buildCommentTree = ({ rows, usersById, likedCommentIds, viewerUserId, sort }) => {
    const byParent = new Map();
    const replyCountByParent = new Map();
    (rows || []).forEach((row) => {
      const parentId = row.parent_comment_id || 'root';
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId).push(row);
      if (row.parent_comment_id) replyCountByParent.set(row.parent_comment_id, Number(replyCountByParent.get(row.parent_comment_id) || 0) + 1);
    });
    const mapNode = (row) => {
      const replies = (byParent.get(row.id) || [])
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .map((replyRow) => mapNode(replyRow));
      return {
        id: row.id,
        content_id: row.content_id,
        user_id: row.user_id,
        parent_comment_id: row.parent_comment_id,
        body: row.body,
        status: row.status,
        like_count: Number(row.like_count || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        reply_count: Number(replyCountByParent.get(row.id) || replies.length || 0),
        liked_by_viewer: likedCommentIds.has(row.id),
        can_delete: Boolean(viewerUserId && viewerUserId === row.user_id),
        user: usersById.get(row.user_id) || null,
        replies
      };
    };
    const roots = (byParent.get('root') || []).map((row) => mapNode(row));
    roots.sort((a, b) => {
      if (sort === 'new') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      const scoreDiff = Number(b.like_count || 0) - Number(a.like_count || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const replyDiff = Number(b.reply_count || 0) - Number(a.reply_count || 0);
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return roots;
  };

  app.get('/spotlight/feed', async (req, res) => {
    let mode = 'for_you';
    let limit = 25;
    let cursor = null;
    let viewerUserId = null;
    const fallbackResponse = () => {
      const fallback = buildMockSpotlightFeedResponse({ mode, limit });
      return res.json({ mode, ...fallback });
    };

    try {
      mode = normalizeFeedMode(req.query.mode);
      limit = parsePositiveInt(req.query.limit, 25, 1, 50);
      cursor = decodeCursor(safeString(req.query.cursor || '').trim());
      const viewerContext = await resolveViewerContext(req);
      viewerUserId = viewerContext.viewerUserId;
      const followedCreatorIds = await getFollowedCreatorIds(viewerUserId);
      const blockedUserIds = await getBlockedUserIdSet(viewerUserId);
      if (mode === 'following' && !viewerUserId) return res.json({ data: [], next_cursor: null, has_more: false, mode });
      const baseSelect = 'id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at';
      let creatorIdsForFollowing = [];
      if (mode === 'following') {
        const creatorIds = Array.from(new Set([viewerUserId, ...Array.from(followedCreatorIds)])).filter(Boolean);
        if (creatorIds.length === 0) return res.json({ data: [], next_cursor: null, has_more: false, mode });
        creatorIdsForFollowing = creatorIds;
      }

      const dbSortColumn = mode === 'trending' ? 'trending_score' : 'feed_score';

      const buildBatchQuery = (start, end) => {
        let batchQuery = supabase
          .from('spotlight_content')
          .select(baseSelect)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order(dbSortColumn, { ascending: false })
          .order('published_at', { ascending: false })
          .order('id', { ascending: false })
          .range(start, end);

        if (mode === 'following') {
          batchQuery = batchQuery.in('creator_user_id', creatorIdsForFollowing);
        }

        if (!viewerUserId) {
          batchQuery = batchQuery.eq('visibility', 'public');
        }

        return batchQuery;
      };

      const acceptedRows = [];
      const acceptedCreatorCount = new Map();
      const batchSize = 180;
      const maxScannedRows = 3600;
      let scannedRows = 0;
      let offset = 0;

      while (acceptedRows.length < limit + 1 && scannedRows < maxScannedRows) {
        const { data: batchRows, error: batchError } = await buildBatchQuery(offset, offset + batchSize - 1);
        if (batchError) {
          if (isSpotlightBackendUnavailableError(batchError)) {
            return fallbackResponse();
          }
          return res.status(400).json({ error: batchError.message });
        }
        if (!batchRows || batchRows.length === 0) break;

        scannedRows += batchRows.length;
        offset += batchRows.length;

        for (const row of batchRows) {
          if (!canViewerAccessRow({ row, viewerUserId, followedCreatorIds })) continue;
          if (blockedUserIds.has(row.creator_user_id)) continue;
          const creatorSeenCount = Number(acceptedCreatorCount.get(row.creator_user_id) || 0);
          if (creatorSeenCount >= FEED_CREATOR_PAGE_CAP) continue;
          const rankingScore = computeRankingScoreForRow({ mode, row, followedCreatorIds });
          if (!cursorMatch({ cursor, item: row, score: rankingScore })) continue;
          acceptedRows.push({ row, ranking_score: rankingScore });
          acceptedCreatorCount.set(row.creator_user_id, creatorSeenCount + 1);
          if (acceptedRows.length >= limit + 1) break;
        }

        if (batchRows.length < batchSize) break;
      }

      acceptedRows.sort((left, right) => {
        const scoreDiff = Number(right.ranking_score || 0) - Number(left.ranking_score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const timeDiff = new Date(right.row?.published_at || 0).getTime() - new Date(left.row?.published_at || 0).getTime();
        if (timeDiff !== 0) return timeDiff;
        return safeString(right.row?.id).localeCompare(safeString(left.row?.id));
      });

      const pageRows = acceptedRows.slice(0, limit);
      const hasMore = acceptedRows.length > limit;
      const last = pageRows[pageRows.length - 1];
      const nextCursor = hasMore && last ? encodeCursor(last.ranking_score, last.row?.published_at, last.row?.id) : null;
      const feedItems = await hydrateFeedItems({
        contentRows: pageRows.map((entry) => entry.row),
        followedCreatorIds
      });
      await recordFeedImpressions({
        rows: pageRows.map((entry) => entry.row),
        viewerUserId,
        sessionSeed: createSessionFingerprint([
          viewerUserId || 'guest',
          safeString(req.query.session_id || req.headers['x-session-id'] || '').trim(),
          req.ip || '',
          req.headers['user-agent'] || '',
          'feed',
          mode
        ]).slice(0, 32),
        surface: 'feed',
        feedMode: mode
      });

      return res.json({
        mode,
        data: feedItems,
        next_cursor: nextCursor,
        has_more: hasMore
      });
    } catch (error) {
      if (isSpotlightBackendUnavailableError(error)) {
        return fallbackResponse();
      }
      return res.status(500).json({ error: safeString(error?.message || 'Failed to fetch spotlight feed.') });
    }
  });

  app.get('/spotlight/content/:id', async (req, res) => {
    const contentId = safeString(req.params.id || '').trim();
    if (!contentId) return res.status(400).json({ error: 'content id is required.' });
    try {
      const [{ data: row, error }, { viewerUserId }] = await Promise.all([
        supabase
          .from('spotlight_content')
          .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at')
          .eq('id', contentId)
          .eq('status', 'published')
          .maybeSingle(),
        resolveViewerContext(req)
      ]);
      if (error) return res.status(400).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Content not found.' });

      const followedCreatorIds = await getFollowedCreatorIds(viewerUserId);
      const blockedUserIds = await getBlockedUserIdSet(viewerUserId);
      if (!canViewerAccessRow({ row, viewerUserId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }
      if (blockedUserIds.has(row.creator_user_id)) return res.status(404).json({ error: 'Content not found.' });

      const [metricsById, creatorsById] = await Promise.all([buildMetricsMap([row]), buildCreatorMaps([row])]);
      return res.json({ data: mapContentRow(row, metricsById, creatorsById, followedCreatorIds) });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to fetch content.') });
    }
  });

  app.get('/spotlight/context/:id', async (req, res) => {
    const contentId = safeString(req.params.id || '').trim();
    if (!contentId) return res.status(400).json({ error: 'content id is required.' });
    try {
      const [{ data: row, error }, { viewerUserId }] = await Promise.all([
        supabase
          .from('spotlight_content')
          .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at')
          .eq('id', contentId)
          .eq('status', 'published')
          .maybeSingle(),
        resolveViewerContext(req)
      ]);
      if (error) return res.status(400).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Content not found.' });

      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(viewerUserId),
        getBlockedUserIdSet(viewerUserId)
      ]);
      if (!canViewerAccessRow({ row, viewerUserId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }
      if (blockedUserIds.has(row.creator_user_id)) return res.status(404).json({ error: 'Content not found.' });

      const [contentItems, sameCreatorRows, recentRows, productLinkMap] = await Promise.all([
        hydrateFeedItems({ contentRows: [row], followedCreatorIds }),
        supabase
          .from('spotlight_content')
          .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at')
          .eq('creator_user_id', row.creator_user_id)
          .eq('status', 'published')
          .neq('id', row.id)
          .order('published_at', { ascending: false })
          .limit(8),
        supabase
          .from('spotlight_content')
          .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at')
          .eq('status', 'published')
          .neq('id', row.id)
          .order('published_at', { ascending: false })
          .limit(120),
        buildProductLinkMap([row])
      ]);
      if (sameCreatorRows.error) return res.status(400).json({ error: sameCreatorRows.error.message });
      if (recentRows.error) return res.status(400).json({ error: recentRows.error.message });

      const contextTags = new Set(
        [...(Array.isArray(row.hashtags) ? row.hashtags : []), ...(Array.isArray(row.interest_tags) ? row.interest_tags : [])]
          .map((entry) => normalizeTagArray([entry])[0])
          .filter(Boolean)
      );
      const candidateRows = (recentRows.data || []).filter((entry) => !blockedUserIds.has(entry.creator_user_id));
      const accessibleCandidates = candidateRows.filter((entry) => canViewerAccessRow({ row: entry, viewerUserId, followedCreatorIds }));
      const sameCreator = await hydrateFeedItems({
        contentRows: (sameCreatorRows.data || []).filter((entry) => !blockedUserIds.has(entry.creator_user_id)),
        followedCreatorIds
      });
      const relatedRows = accessibleCandidates.filter((entry) => {
        const entryTags = new Set([...(Array.isArray(entry.hashtags) ? entry.hashtags : []), ...(Array.isArray(entry.interest_tags) ? entry.interest_tags : [])].map((value) => safeString(value).trim().toLowerCase()).filter(Boolean));
        return Array.from(contextTags).some((tag) => entryTags.has(tag));
      }).slice(0, 8);
      const similarRows = accessibleCandidates.filter((entry) => {
        if (entry.media_type !== row.media_type) return false;
        if (entry.creator_user_id === row.creator_user_id) return false;
        return true;
      }).slice(0, 8);
      const [relatedPosts, similarPosts] = await Promise.all([
        hydrateFeedItems({ contentRows: relatedRows, followedCreatorIds }),
        hydrateFeedItems({ contentRows: similarRows, followedCreatorIds })
      ]);

      const products = productLinkMap.get(row.id) || [];
      const linkedItemIds = products.map((entry) => entry.item_id).filter(Boolean);
      const categorySet = new Set(products.map((entry) => safeString(entry.metadata?.category || '').trim().toLowerCase()).filter(Boolean));
      const brandSet = new Set(products.map((entry) => safeString(entry.metadata?.brand || '').trim().toLowerCase()).filter(Boolean));
      let similarProducts = [];
      if (linkedItemIds.length > 0) {
        const { data: itemRows, error: itemError } = await supabase
          .from('items')
          .select('id,title,listing_type,sale_price,rental_price,currency,status,metadata')
          .neq('status', 'archived')
          .limit(160);
        if (itemError) return res.status(400).json({ error: itemError.message });
        similarProducts = (itemRows || [])
          .filter((entry) => !linkedItemIds.includes(entry.id))
          .filter((entry) => {
            const category = extractItemCategory(entry);
            const brand = extractItemBrand(entry);
            return (category && categorySet.has(category)) || (brand && brandSet.has(brand));
          })
          .slice(0, 8)
          .map((entry) => ({
            id: entry.id,
            item_id: entry.id,
            title: safeString(entry.title || 'Product'),
            image_url: extractItemImage(entry),
            listing_type: safeString(entry.listing_type || 'sale'),
            sale_price: Number(entry.sale_price || 0),
            rental_price: Number(entry.rental_price || 0),
            currency: safeString(entry.currency || 'USD', 'USD'),
            status: safeString(entry.status || 'published', 'published')
          }));
      }

      return res.json({
        data: {
          content: contentItems[0] || null,
          same_creator: sameCreator,
          related_posts: relatedPosts,
          similar_posts: similarPosts,
          products,
          similar_products: similarProducts
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to load Spotlight context.') });
    }
  });

  app.get('/spotlight/share/:id', async (req, res) => {
    const contentId = safeString(req.params.id || '').trim();
    if (!contentId) return res.status(400).json({ error: 'content id is required.' });
    try {
      const { data: row, error } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,status,published_at')
        .eq('id', contentId)
        .eq('status', 'published')
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Content not found.' });

      const { data: creator } = await supabase
        .from('users')
        .select('name')
        .eq('id', row.creator_user_id)
        .maybeSingle();
      const creatorName = safeString(creator?.name || 'Creator').trim() || 'Creator';
      const caption = safeString(row.caption || '').trim();
      const shortCaption = caption.length > 180 ? `${caption.slice(0, 177)}...` : caption;
      const title = `Prime Spotlight by ${creatorName}`;
      const description = shortCaption || 'Watch this Spotlight post on Urban Prime.';
      const image = safeString(row.thumbnail_url || row.media_url || '').trim();
      return res.json({
        data: {
          id: row.id,
          title,
          description,
          image,
          media_type: row.media_type,
          url: `/spotlight/post/${row.id}`,
          published_at: row.published_at
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to fetch share metadata.') });
    }
  });

  app.get('/spotlight/profile/:username', async (req, res) => {
    try {
      const rawUsername = safeString(req.params.username || '').trim();
      if (!rawUsername) return res.status(400).json({ error: 'username is required.' });

      const tab = safeString(req.query.tab || 'posts').trim().toLowerCase();
      const normalizedTab = ['posts', 'media', 'likes', 'saved'].includes(tab) ? tab : 'posts';
      const limit = parsePositiveInt(req.query.limit, 24, 1, 48);
      const cursor = decodeCursor(safeString(req.query.cursor || '').trim());
      const { viewerUserId } = await resolveViewerContext(req);
      const normalizedUsername = slugifyUsername(rawUsername);
      const blockedUserIds = await getBlockedUserIdSet(viewerUserId);
      const targetUser = await resolveTargetUserByUsername(rawUsername);
      if (!targetUser) return res.status(404).json({ error: 'Profile not found.' });
      if (blockedUserIds.has(targetUser.id)) return res.status(404).json({ error: 'Profile not found.' });

      const { data: profileRow, error: profileError } = await supabase
        .from('user_profiles')
        .select('about,followers_count,following_count,posts_count,reels_count,is_verified,interest_profile')
        .eq('user_id', targetUser.id)
        .maybeSingle();
      if (profileError) return res.status(400).json({ error: profileError.message });

      const [followedCreatorIds, targetFollowerCount, isFollowingRow, followerPreviewRows, followingPreviewRows] = await Promise.all([
        getFollowedCreatorIds(viewerUserId),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_user_id', targetUser.id),
        viewerUserId
          ? supabase.from('user_follows').select('id').eq('follower_id', viewerUserId).eq('following_user_id', targetUser.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('user_follows').select('follower_id').eq('following_user_id', targetUser.id).limit(8),
        supabase.from('user_follows').select('following_user_id').eq('follower_id', targetUser.id).limit(8)
      ]);

      const isSelf = viewerUserId === targetUser.id;
      const isFollowing = Boolean(isFollowingRow?.data?.id);
      const [likedCount, savedCount] = isSelf
        ? await Promise.all([
          supabase.from('spotlight_likes').select('id', { count: 'exact', head: true }).eq('user_id', targetUser.id),
          supabase.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', targetUser.id).eq('content_type', 'spotlight')
        ]).then(([likedRows, savedRows]) => [Number(likedRows?.count || 0), Number(savedRows?.count || 0)])
        : [0, 0];

      const baseSelect = 'id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,reposted_from_content_id,feed_score,trending_score,created_at,updated_at';
      const profileFields = {
        id: targetUser.id,
        firebase_uid: targetUser.firebase_uid,
        name: targetUser.name || 'Creator',
        avatar_url: targetUser.avatar_url || '/icons/urbanprime.svg',
        bio: safeString(profileRow?.about || '').trim(),
        about: safeString(profileRow?.about || '').trim(),
        followers_count: Number(profileRow?.followers_count || targetFollowerCount?.count || 0),
        following_count: Number(profileRow?.following_count || 0),
        posts_count: Number(profileRow?.posts_count || 0),
        reels_count: Number(profileRow?.reels_count || 0),
        is_verified: Boolean(profileRow?.is_verified),
        username: normalizedUsername
      };

      const followerPreviewIds = (followerPreviewRows?.data || []).map((row) => row.follower_id).filter(Boolean);
      const followingPreviewIds = (followingPreviewRows?.data || []).map((row) => row.following_user_id).filter(Boolean);
      const [followersPreview, followingPreview] = await Promise.all([
        buildUserPreviewList(followerPreviewIds),
        buildUserPreviewList(followingPreviewIds)
      ]);

      let itemsRows = [];
      let savedAtByContentId = new Map();
      let likedAtByContentId = new Map();

      if (normalizedTab === 'saved') {
        if (isSelf) {
          const { data: savedRows, error: savedError } = await supabase
            .from('saved_items')
            .select('content_id,saved_at')
            .eq('user_id', targetUser.id)
            .eq('content_type', 'spotlight')
            .order('saved_at', { ascending: false })
            .limit(limit * 8);
          if (savedError) return res.status(400).json({ error: savedError.message });
          const savedIds = (savedRows || []).map((row) => row.content_id).filter(Boolean);
          savedAtByContentId = new Map((savedRows || []).map((row) => [row.content_id, row.saved_at]));
          if (savedIds.length > 0) {
            const { data: savedContent, error: savedContentError } = await supabase
              .from('spotlight_content')
              .select(baseSelect)
              .in('id', savedIds)
              .eq('status', 'published')
              .not('published_at', 'is', null);
            if (savedContentError) return res.status(400).json({ error: savedContentError.message });
            itemsRows = savedContent || [];
          }
        }
      } else if (normalizedTab === 'likes') {
        if (isSelf) {
          const { data: likedRows, error: likedError } = await supabase
            .from('spotlight_likes')
            .select('content_id,created_at')
            .eq('user_id', targetUser.id)
            .order('created_at', { ascending: false })
            .limit(limit * 8);
          if (likedError) return res.status(400).json({ error: likedError.message });
          const likedIds = (likedRows || []).map((row) => row.content_id).filter(Boolean);
          likedAtByContentId = new Map((likedRows || []).map((row) => [row.content_id, row.created_at]));
          if (likedIds.length > 0) {
            const { data: likedContent, error: likedContentError } = await supabase
              .from('spotlight_content')
              .select(baseSelect)
              .in('id', likedIds)
              .eq('status', 'published')
              .not('published_at', 'is', null);
            if (likedContentError) return res.status(400).json({ error: likedContentError.message });
            itemsRows = likedContent || [];
          }
        }
      } else {
        let query = supabase
          .from('spotlight_content')
          .select(baseSelect)
          .eq('creator_user_id', targetUser.id)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .limit(limit * 10);

        if (normalizedTab === 'media') {
          query = query.in('media_type', ['image', 'video']);
        }

        const { data: contentRows, error: contentError } = await query;
        if (contentError) return res.status(400).json({ error: contentError.message });
        itemsRows = contentRows || [];
      }

      const accessibleRows = itemsRows.filter((row) => {
        if (!row) return false;
        if (blockedUserIds.has(row.creator_user_id)) return false;
        return canViewerAccessRow({ row, viewerUserId, followedCreatorIds });
      });

      const feedItems = await hydrateFeedItems({ contentRows: accessibleRows, followedCreatorIds });
      const sortedItems = feedItems
        .map((item) => ({
          ...item,
          saved_at: savedAtByContentId.get(item.id) || null,
          liked_at: likedAtByContentId.get(item.id) || null
        }))
        .sort((left, right) => {
          if (normalizedTab === 'saved') {
            const savedDiff = new Date(right.saved_at || 0).getTime() - new Date(left.saved_at || 0).getTime();
            if (savedDiff !== 0) return savedDiff;
          }
          if (normalizedTab === 'likes') {
            const likedDiff = new Date(right.liked_at || 0).getTime() - new Date(left.liked_at || 0).getTime();
            if (likedDiff !== 0) return likedDiff;
          }
          const scoreDiff = normalizedTab === 'posts' || normalizedTab === 'media'
            ? new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime()
            : computeRankingScoreForRow({ mode: 'trending', row: right, followedCreatorIds }) - computeRankingScoreForRow({ mode: 'trending', row: left, followedCreatorIds });
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime();
        });

      const cursorFiltered = sortedItems.filter((item) => {
        if (!cursor) return true;
        const score = normalizedTab === 'likes'
          ? new Date(item.liked_at || item.published_at || 0).getTime()
          : normalizedTab === 'saved'
            ? new Date(item.saved_at || item.published_at || 0).getTime()
            : new Date(item.published_at || 0).getTime();
        const cursorStamp = normalizedTab === 'saved'
          ? item.saved_at || item.published_at
          : normalizedTab === 'likes'
            ? item.liked_at || item.published_at
            : item.published_at;
        return cursorMatch({ cursor, item: { ...item, published_at: cursorStamp }, score });
      });

      const pageItems = cursorFiltered.slice(0, limit);
      const hasMore = cursorFiltered.length > limit;
      const last = pageItems[pageItems.length - 1];
      const nextCursor = hasMore && last
        ? encodeCursor(
          normalizedTab === 'likes'
            ? new Date(last.liked_at || last.published_at || 0).getTime()
            : normalizedTab === 'saved'
              ? new Date(last.saved_at || last.published_at || 0).getTime()
              : new Date(last.published_at || 0).getTime(),
          normalizedTab === 'saved'
            ? last.saved_at || last.published_at
            : normalizedTab === 'likes'
              ? last.liked_at || last.published_at
              : last.published_at,
          last.id
        )
        : null;

      return res.json({
        data: {
          profile: profileFields,
          is_self: isSelf,
          is_following: isFollowing,
          tab: normalizedTab,
          counts: {
            posts: Number(profileRow?.posts_count || 0),
            media: Number(profileRow?.reels_count || 0),
            likes: likedCount,
            saved: savedCount
          },
          followers_preview: followersPreview,
          following_preview: followingPreview,
          items: pageItems,
          next_cursor: nextCursor,
          has_more: hasMore
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to fetch spotlight profile.') });
    }
  });

  app.get('/spotlight/profile/:username/people', async (req, res) => {
    try {
      const rawUsername = safeString(req.params.username || '').trim();
      if (!rawUsername) return res.status(400).json({ error: 'username is required.' });
      const tab = safeString(req.query.tab || 'followers').trim().toLowerCase();
      const normalizedTab = tab === 'following' ? 'following' : 'followers';
      const limit = parsePositiveInt(req.query.limit, 80, 1, 200);
      const { viewerUserId } = await resolveViewerContext(req);
      const blockedUserIds = await getBlockedUserIdSet(viewerUserId);
      const followedCreatorIds = await getFollowedCreatorIds(viewerUserId);
      const targetUser = await resolveTargetUserByUsername(rawUsername);
      if (!targetUser) return res.status(404).json({ error: 'Profile not found.' });
      if (blockedUserIds.has(targetUser.id)) return res.status(404).json({ error: 'Profile not found.' });

      const peopleRows = normalizedTab === 'followers'
        ? await supabase
          .from('user_follows')
          .select('follower_id,created_at')
          .eq('following_user_id', targetUser.id)
          .order('created_at', { ascending: false })
          .limit(limit)
        : await supabase
          .from('user_follows')
          .select('following_user_id,created_at')
          .eq('follower_id', targetUser.id)
          .order('created_at', { ascending: false })
          .limit(limit);

      if (peopleRows.error) return res.status(400).json({ error: peopleRows.error.message });

      const relatedIds = (peopleRows.data || [])
        .map((row) => normalizedTab === 'followers' ? row.follower_id : row.following_user_id)
        .filter(Boolean)
        .filter((userId) => !blockedUserIds.has(userId));
      const people = await buildUserPreviewList(relatedIds);
      const peopleById = new Map(people.map((person) => [person.id, person]));
      const decoratedPeople = relatedIds.map((userId) => peopleById.get(userId)).filter(Boolean).map((person) => ({
        ...person,
        is_following: viewerUserId ? followedCreatorIds.has(person.id) : false
      }));

      return res.json({
        data: {
          tab: normalizedTab,
          items: decoratedPeople
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to load followers and following.') });
    }
  });

  app.get('/spotlight/content/:id/comments', async (req, res) => {
    const contentId = safeString(req.params.id || '').trim();
    if (!contentId) return res.status(400).json({ error: 'content id is required.' });
    try {
      const sort = parseCommentSort(req.query.sort);
      const limit = parsePositiveInt(req.query.limit, 100, 1, 200);
      const { viewerUserId } = await resolveViewerContext(req);
      const followedCreatorIds = await getFollowedCreatorIds(viewerUserId);
      const blockedUserIds = await getBlockedUserIdSet(viewerUserId);

      const [{ data: commentRows, error: commentsError }, { data: contentRow, error: contentError }] = await Promise.all([
        supabase
          .from('spotlight_comments')
          .select('id,content_id,user_id,parent_comment_id,body,like_count,status,created_at,updated_at')
          .eq('content_id', contentId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('spotlight_content')
          .select('id,creator_user_id,status,visibility')
          .eq('id', contentId)
          .maybeSingle()
      ]);
      if (commentsError) return res.status(400).json({ error: commentsError.message });
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow) return res.status(404).json({ error: 'Content not found.' });
      if (contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(404).json({ error: 'Content not found.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access comments for this content.' });
      }

      const filteredRows = (commentRows || []).filter((row) => !blockedUserIds.has(row.user_id));
      const usersById = await hydrateCommentUsers(filteredRows);
      let likedCommentIds = new Set();
      if (viewerUserId && filteredRows.length > 0) {
        const { data: likeRows } = await supabase
          .from('spotlight_comment_likes')
          .select('comment_id')
          .eq('user_id', viewerUserId)
          .in('comment_id', filteredRows.map((row) => row.id));
        likedCommentIds = new Set((likeRows || []).map((row) => row.comment_id).filter(Boolean));
      }

      const tree = buildCommentTree({ rows: filteredRows, usersById, likedCommentIds, viewerUserId, sort });
      return res.json({ data: tree, sort });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Failed to fetch comments.') });
    }
  });

  app.post('/spotlight/content', requireAuth, async (req, res) => {
    try {
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const mediaType = normalizeMediaType(req.body?.media_type);
      const mediaUrl = safeString(req.body?.media_url || '').trim();
      const thumbnailUrl = safeString(req.body?.thumbnail_url || '').trim();
      const caption = safeString(req.body?.caption || '').trim();
      const allowComments = parseBoolean(req.body?.allow_comments, true);
      const visibility = normalizeVisibility(req.body?.visibility);
      const status = normalizeStatus(req.body?.status);
      const hashtags = normalizeTagArray(req.body?.hashtags);
      const interestTags = normalizeTagArray(req.body?.interest_tags);

      if (!mediaType) return res.status(400).json({ error: 'media_type must be image or video.' });
      if (!mediaUrl) return res.status(400).json({ error: 'media_url is required.' });
      if (caption.length > MAX_CAPTION_LENGTH) {
        return res.status(400).json({ error: `Caption exceeds max length (${MAX_CAPTION_LENGTH}).` });
      }
      if (enforceModeration && containsBannedWord(caption, bannedWords)) {
        return res.status(400).json({ error: 'Caption contains restricted terms.' });
      }

      const mergedHashtags = Array.from(new Set([...hashtags, ...extractHashtagsFromCaption(caption)])).slice(0, 30);
      const publishedAt = status === 'published' ? new Date().toISOString() : null;
      const { data, error } = await supabase
        .from('spotlight_content')
        .insert({
          creator_user_id: authContext.userId,
          media_type: mediaType,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl || null,
          caption,
          hashtags: mergedHashtags,
          interest_tags: interestTags,
          visibility,
          allow_comments: allowComments,
          status,
          published_at: publishedAt
        })
        .select('*')
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      if (!data) return res.status(400).json({ error: 'Unable to create content.' });

      await Promise.all([triggerRecomputeMetrics(data.id), refreshCreatorCounters(authContext.userId)]);
      const followedCreatorIds = await getFollowedCreatorIds(authContext.userId);
      const hydratedItems = await hydrateFeedItems({
        contentRows: [data],
        followedCreatorIds
      });
      return res.status(201).json({ data: hydratedItems[0] || data });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Failed to create spotlight content.') });
    }
  });

  app.patch('/spotlight/content/:id', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const { data: existingRow, error: existingError } = await supabase.from('spotlight_content').select('*').eq('id', contentId).maybeSingle();
      if (existingError) return res.status(400).json({ error: existingError.message });
      if (!existingRow) return res.status(404).json({ error: 'Content not found.' });
      if (existingRow.creator_user_id !== authContext.userId) {
        return res.status(403).json({ error: 'You can only edit your own content.' });
      }

      const patch = {};
      if (req.body?.caption !== undefined) {
        const caption = safeString(req.body?.caption || '').trim();
        if (caption.length > MAX_CAPTION_LENGTH) {
          return res.status(400).json({ error: `Caption exceeds max length (${MAX_CAPTION_LENGTH}).` });
        }
        if (enforceModeration && containsBannedWord(caption, bannedWords)) {
          return res.status(400).json({ error: 'Caption contains restricted terms.' });
        }
        patch.caption = caption;
        patch.hashtags = Array.from(new Set([...normalizeTagArray(req.body?.hashtags), ...extractHashtagsFromCaption(caption)])).slice(0, 30);
      } else if (req.body?.hashtags !== undefined) {
        patch.hashtags = normalizeTagArray(req.body?.hashtags);
      }
      if (req.body?.interest_tags !== undefined) patch.interest_tags = normalizeTagArray(req.body?.interest_tags);
      if (req.body?.allow_comments !== undefined) patch.allow_comments = parseBoolean(req.body?.allow_comments, true);
      if (req.body?.visibility !== undefined) patch.visibility = normalizeVisibility(req.body?.visibility);
      if (req.body?.thumbnail_url !== undefined) patch.thumbnail_url = safeString(req.body?.thumbnail_url || '').trim() || null;
      if (req.body?.media_url !== undefined) patch.media_url = safeString(req.body?.media_url || '').trim();
      if (req.body?.status !== undefined) {
        const nextStatus = normalizeStatus(req.body?.status);
        patch.status = nextStatus;
        if (nextStatus === 'published') patch.published_at = existingRow.published_at || new Date().toISOString();
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields provided for update.' });

      const { data, error } = await supabase.from('spotlight_content').update(patch).eq('id', contentId).select('*').maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      await Promise.all([triggerRecomputeMetrics(contentId), refreshCreatorCounters(authContext.userId)]);
      return res.json({ data });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Failed to update content.') });
    }
  });

  app.delete('/spotlight/content/:id', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const { data: existingRow, error: existingError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id')
        .eq('id', contentId)
        .maybeSingle();
      if (existingError) return res.status(400).json({ error: existingError.message });
      if (!existingRow) return res.status(404).json({ error: 'Content not found.' });
      if (existingRow.creator_user_id !== authContext.userId) {
        return res.status(403).json({ error: 'You can only delete your own content.' });
      }

      const { error: deleteError } = await supabase.from('spotlight_content').delete().eq('id', contentId);
      if (deleteError) return res.status(400).json({ error: deleteError.message });
      await refreshCreatorCounters(authContext.userId);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Failed to delete content.') });
    }
  });

  app.post('/spotlight/content/:id/products', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow) return res.status(404).json({ error: 'Content not found.' });
      if (contentRow.creator_user_id !== authContext.userId) {
        return res.status(403).json({ error: 'You can only tag products on your own Spotlight posts.' });
      }

      const requestedProducts = Array.isArray(req.body?.products) ? req.body.products : [];
      if (requestedProducts.length > 5) return res.status(400).json({ error: 'A Spotlight post can tag up to 5 products.' });
      const primaryCount = requestedProducts.filter((entry) => Boolean(entry?.is_primary)).length;
      if (primaryCount > 1) return res.status(400).json({ error: 'Only one primary product can be set for a Spotlight post.' });

      const itemIds = Array.from(new Set(requestedProducts.map((entry) => safeString(entry?.item_id || '').trim()).filter(Boolean)));
      const { data: itemRows, error: itemError } = itemIds.length
        ? await supabase
          .from('items')
          .select('id,title,listing_type,sale_price,rental_price,currency,status,metadata')
          .in('id', itemIds)
        : { data: [], error: null };
      if (itemError) return res.status(400).json({ error: itemError.message });

      const itemById = new Map((itemRows || []).map((row) => [row.id, row]));
      if (itemById.size !== itemIds.length) return res.status(400).json({ error: 'One or more tagged products were not found.' });

      await supabase.from('spotlight_product_links').delete().eq('content_id', contentId);

      if (requestedProducts.length > 0) {
        const rows = requestedProducts.map((entry, index) => {
          const item = itemById.get(safeString(entry?.item_id || '').trim());
          const metadata = normalizeJsonObject(entry?.metadata);
          return {
            content_id: contentId,
            item_id: item.id,
            linked_by_user_id: authContext.userId,
            placement: normalizeProductPlacement(entry?.placement),
            cta_label: safeString(entry?.cta_label || 'Shop now', 'Shop now').slice(0, 40),
            sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
            is_primary: Boolean(entry?.is_primary),
            source: normalizeProductSource(entry?.source),
            campaign_key: safeString(entry?.campaign_key || '').trim() || null,
            metadata: {
              ...metadata,
              category: extractItemCategory(item) || metadata.category || null,
              brand: extractItemBrand(item) || metadata.brand || null
            }
          };
        });
        const { error: insertError } = await supabase.from('spotlight_product_links').insert(rows);
        if (insertError) return res.status(400).json({ error: insertError.message });
      }

      const productLinkMap = await buildProductLinkMap([{ id: contentId }]);
      return res.json({ data: { content_id: contentId, products: productLinkMap.get(contentId) || [] } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update Spotlight product tags.') });
    }
  });

  app.delete('/spotlight/product-links/:id', requireAuth, async (req, res) => {
    try {
      const linkId = safeString(req.params.id || '').trim();
      if (!linkId) return res.status(400).json({ error: 'product link id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const { data: linkRow, error: linkError } = await supabase
        .from('spotlight_product_links')
        .select('id,content_id')
        .eq('id', linkId)
        .maybeSingle();
      if (linkError) return res.status(400).json({ error: linkError.message });
      if (!linkRow) return res.status(404).json({ error: 'Product link not found.' });

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id')
        .eq('id', linkRow.content_id)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow) return res.status(404).json({ error: 'Content not found.' });
      if (contentRow.creator_user_id !== authContext.userId) {
        return res.status(403).json({ error: 'You can only update product links on your own Spotlight posts.' });
      }

      const { error: deleteError } = await supabase.from('spotlight_product_links').delete().eq('id', linkId);
      if (deleteError) return res.status(400).json({ error: deleteError.message });
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to delete Spotlight product link.') });
    }
  });

  app.post('/spotlight/product-events', async (req, res) => {
    try {
      const contentId = safeString(req.body?.content_id || '').trim();
      const productLinkId = safeString(req.body?.product_link_id || '').trim() || null;
      const itemId = safeString(req.body?.item_id || '').trim();
      const eventName = normalizeProductEventType(req.body?.event_name);
      const sessionHint = safeString(req.body?.session_id || req.headers['x-session-id'] || '').trim();
      const orderId = safeString(req.body?.order_id || '').trim() || null;
      const orderItemId = safeString(req.body?.order_item_id || '').trim() || null;
      const campaignKey = safeString(req.body?.campaign_key || '').trim() || null;
      const amount = Math.max(0, parseNumber(req.body?.amount, 0));
      const currency = safeString(req.body?.currency || 'USD', 'USD').slice(0, 8).toUpperCase();
      const metadata = normalizeJsonObject(req.body?.metadata);

      if (!contentId) return res.status(400).json({ error: 'content_id is required.' });
      if (!itemId) return res.status(400).json({ error: 'item_id is required.' });
      if (!eventName) return res.status(400).json({ error: 'event_name is invalid.' });

      const [{ data: contentRow, error: contentError }, { viewerUserId }] = await Promise.all([
        supabase.from('spotlight_content').select('id,creator_user_id,status').eq('id', contentId).maybeSingle(),
        resolveViewerContext(req)
      ]);
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow) return res.status(404).json({ error: 'Content not found.' });

      const viewerSessionKey = sessionHint
        || createSessionFingerprint([viewerUserId || 'guest', req.ip || '', req.headers['user-agent'] || '', itemId, contentId]).slice(0, 32);
      const dedupeKey = eventName === 'purchase'
        ? createSessionFingerprint([eventName, contentId, itemId, orderId || '', orderItemId || ''])
        : createSessionFingerprint([
          eventName,
          contentId,
          itemId,
          viewerUserId || 'guest',
          viewerSessionKey,
          getDateBucketKey(Date.now(), PRODUCT_EVENT_DEDUPE_WINDOW_MS)
        ]);

      const { data: insertedEvent, error: insertError } = await supabase
        .from('spotlight_product_events')
        .insert({
          content_id: contentId,
          product_link_id: productLinkId,
          item_id: itemId,
          creator_user_id: contentRow.creator_user_id,
          viewer_user_id: viewerUserId,
          viewer_session_key: viewerSessionKey,
          event_name: eventName,
          order_id: orderId,
          order_item_id: orderItemId,
          amount,
          currency,
          campaign_key: campaignKey,
          dedupe_key: dedupeKey,
          metadata
        })
        .select('*')
        .maybeSingle();
      if (insertError) {
        if (isUniqueViolation(insertError)) {
          return res.json({ data: { recorded: false, deduped: true, event_name: eventName, content_id: contentId, item_id: itemId } });
        }
        return res.status(400).json({ error: insertError.message });
      }

      if (eventName === 'purchase' && insertedEvent?.id) {
        const { data: existingLedger } = await supabase
          .from('spotlight_commission_ledger')
          .select('id')
          .eq('product_event_id', insertedEvent.id)
          .maybeSingle();
        if (!existingLedger?.id) {
          await ignoreSupabaseMutationError(
            supabase.from('spotlight_commission_ledger').insert({
              product_event_id: insertedEvent.id,
              content_id: contentId,
              item_id: itemId,
              creator_user_id: contentRow.creator_user_id,
              purchaser_user_id: viewerUserId,
              order_id: orderId,
              commission_rate: DEFAULT_SPOTLIGHT_COMMISSION_RATE,
              commission_amount: Number((amount * DEFAULT_SPOTLIGHT_COMMISSION_RATE).toFixed(2)),
              currency,
              status: 'pending',
              eligible_at: new Date(Date.now() + PRODUCT_ATTRIBUTION_WINDOW_MS).toISOString()
            })
          );
        }
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase
        .from('spotlight_metrics')
        .select('product_clicks,product_item_views,product_cart_adds,product_purchases,product_revenue_amount,product_ctr,product_conversion_rate')
        .eq('content_id', contentId)
        .maybeSingle();
      return res.status(201).json({
        data: {
          recorded: true,
          deduped: false,
          event_name: eventName,
          content_id: contentId,
          item_id: itemId,
          metrics: metrics || null
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to track Spotlight product event.') });
    }
  });

  app.post('/spotlight/content/:id/like', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_like', windowMs: 60_000, max: 30 })) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });
      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }

      const { data: existingLike } = await supabase
        .from('spotlight_likes')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', authContext.userId)
        .maybeSingle();

      let liked = false;
      if (existingLike?.id) {
        const { error } = await supabase.from('spotlight_likes').delete().eq('id', existingLike.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('spotlight_likes').insert({ content_id: contentId, user_id: authContext.userId });
        if (error) return res.status(400).json({ error: error.message });
        await ignoreSupabaseMutationError(
          supabase.from('spotlight_dislikes').delete().eq('content_id', contentId).eq('user_id', authContext.userId)
        );
        liked = true;
        await emitSocialNotification({
          type: 'social_like',
          targetUserId: contentRow.creator_user_id,
          actorUserId: authContext.userId,
          contentId,
          title: 'New like on your Spotlight post',
          body: 'Someone liked your post.',
          link: `/spotlight/post/${contentId}`
        });
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('likes').eq('content_id', contentId).maybeSingle();
      return res.json({ data: { content_id: contentId, liked, likes: Number(metrics?.likes || 0) } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update like.') });
    }
  });

  app.post('/spotlight/content/:id/dislike', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_dislike', windowMs: 60_000, max: 30 })) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });

      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }

      const { data: existingDislike } = await supabase
        .from('spotlight_dislikes')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', authContext.userId)
        .maybeSingle();

      let disliked = false;
      if (existingDislike?.id) {
        const { error } = await supabase.from('spotlight_dislikes').delete().eq('id', existingDislike.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('spotlight_dislikes').insert({ content_id: contentId, user_id: authContext.userId });
        if (error) return res.status(400).json({ error: error.message });
        await ignoreSupabaseMutationError(
          supabase.from('spotlight_likes').delete().eq('content_id', contentId).eq('user_id', authContext.userId)
        );
        disliked = true;
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('dislikes').eq('content_id', contentId).maybeSingle();
      return res.json({ data: { content_id: contentId, disliked, dislikes: Number(metrics?.dislikes || 0) } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update dislike state.') });
    }
  });

  app.post('/spotlight/content/:id/save', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_save', windowMs: 60_000, max: 30 })) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });
      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }

      const { data: existing } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', authContext.userId)
        .eq('content_id', contentId)
        .eq('content_type', 'spotlight')
        .maybeSingle();
      let saved = false;
      if (existing?.id) {
        const { error } = await supabase.from('saved_items').delete().eq('id', existing.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase
          .from('saved_items')
          .insert({ user_id: authContext.userId, content_id: contentId, content_type: 'spotlight' });
        if (error) return res.status(400).json({ error: error.message });
        saved = true;
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('saves').eq('content_id', contentId).maybeSingle();
      return res.json({ data: { content_id: contentId, saved, saves: Number(metrics?.saves || 0) } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update save state.') });
    }
  });

  app.post('/spotlight/content/:id/share', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_share', windowMs: 60_000, max: 30 })) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });
      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }

      const { data: existingMetrics } = await supabase.from('spotlight_metrics').select('content_id,shares').eq('content_id', contentId).maybeSingle();
      if (existingMetrics?.content_id) {
        const { error } = await supabase
          .from('spotlight_metrics')
          .update({ shares: Number(existingMetrics.shares || 0) + 1 })
          .eq('content_id', contentId);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('spotlight_metrics').insert({ content_id: contentId, shares: 1 });
        if (error) return res.status(400).json({ error: error.message });
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('shares').eq('content_id', contentId).maybeSingle();
      return res.json({ data: { content_id: contentId, shares: Number(metrics?.shares || 0) } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to track share.') });
    }
  });

  app.post('/spotlight/content/:id/repost', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_repost', windowMs: 60_000, max: 20 })) return;

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,media_type,media_url,thumbnail_url,caption,hashtags,interest_tags,visibility,allow_comments,status,published_at,feed_score,trending_score,created_at,updated_at,reposted_from_content_id')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });

      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }

      const { data: existingRepost } = await supabase
        .from('spotlight_reposts')
        .select('id,reposted_content_id')
        .eq('source_content_id', contentId)
        .eq('user_id', authContext.userId)
        .maybeSingle();

      if (existingRepost?.id) {
        if (existingRepost.reposted_content_id) {
          await ignoreSupabaseMutationError(
            supabase.from('spotlight_content').delete().eq('id', existingRepost.reposted_content_id)
          );
        }
        const { error } = await supabase.from('spotlight_reposts').delete().eq('id', existingRepost.id);
        if (error) return res.status(400).json({ error: error.message });
        await triggerRecomputeMetrics(contentId);
        const { data: metrics } = await supabase.from('spotlight_metrics').select('reposts').eq('content_id', contentId).maybeSingle();
        return res.json({ data: { content_id: contentId, reposted: false, reposts: Number(metrics?.reposts || 0) } });
      }

      const repostPayload = {
        creator_user_id: authContext.userId,
        media_type: contentRow.media_type,
        media_url: contentRow.media_url,
        thumbnail_url: contentRow.thumbnail_url,
        caption: contentRow.caption,
        hashtags: contentRow.hashtags || [],
        interest_tags: contentRow.interest_tags || [],
        visibility: 'public',
        allow_comments: contentRow.allow_comments,
        status: 'published',
        published_at: new Date().toISOString(),
        reposted_from_content_id: contentId
      };

      const { data: repostedContent, error: repostError } = await supabase
        .from('spotlight_content')
        .insert(repostPayload)
        .select('*')
        .maybeSingle();
      if (repostError) return res.status(400).json({ error: repostError.message });

      const { error: mappingError } = await supabase.from('spotlight_reposts').insert({
        source_content_id: contentId,
        reposted_content_id: repostedContent?.id || null,
        user_id: authContext.userId
      });
      if (mappingError) return res.status(400).json({ error: mappingError.message });

      await Promise.all([triggerRecomputeMetrics(contentId), refreshCreatorCounters(authContext.userId)]);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('reposts').eq('content_id', contentId).maybeSingle();
      return res.status(201).json({
        data: {
          content_id: contentId,
          reposted: true,
          reposts: Number(metrics?.reposts || 0),
          content: repostedContent || null
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to repost content.') });
    }
  });

  app.post('/spotlight/content/:id/comment', requireAuth, async (req, res) => {
    try {
      const contentId = safeString(req.params.id || '').trim();
      if (!contentId) return res.status(400).json({ error: 'content id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_comment', windowMs: 60_000, max: 12 })) return;

      const bodyText = safeString(req.body?.body || '').trim();
      const parentCommentId = safeString(req.body?.parent_comment_id || '').trim() || null;
      if (!bodyText) return res.status(400).json({ error: 'Comment body is required.' });
      if (bodyText.length > MAX_COMMENT_LENGTH) return res.status(400).json({ error: `Comment exceeds max length (${MAX_COMMENT_LENGTH}).` });
      if (getMentionCount(bodyText) > 8) return res.status(400).json({ error: 'Too many mentions in a single comment.' });
      if (enforceModeration && containsBannedWord(bodyText, bannedWords)) return res.status(400).json({ error: 'Comment contains restricted terms.' });

      const duplicateRetrySeconds = commentSpamGuard({ userId: authContext.userId, contentId, text: bodyText });
      if (duplicateRetrySeconds > 0) {
        res.setHeader('Retry-After', String(duplicateRetrySeconds));
        return res.status(429).json({ error: 'Duplicate comment detected. Please wait before posting again.' });
      }

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,allow_comments,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });
      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(authContext.userId),
        getBlockedUserIdSet(authContext.userId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(403).json({ error: 'You cannot interact with this content.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId: authContext.userId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }
      if (!contentRow.allow_comments) return res.status(403).json({ error: 'Comments are disabled for this post.' });

      if (parentCommentId) {
        const { data: parentComment, error: parentError } = await supabase
          .from('spotlight_comments')
          .select('id,content_id,status')
          .eq('id', parentCommentId)
          .maybeSingle();
        if (parentError) return res.status(400).json({ error: parentError.message });
        if (!parentComment || parentComment.status !== 'active' || parentComment.content_id !== contentId) {
          return res.status(400).json({ error: 'Invalid parent comment.' });
        }
      }

      const { data, error } = await supabase
        .from('spotlight_comments')
        .insert({
          content_id: contentId,
          user_id: authContext.userId,
          parent_comment_id: parentCommentId,
          body: bodyText,
          status: 'active'
        })
        .select('*')
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });

      await triggerRecomputeMetrics(contentId);
      await emitSocialNotification({
        type: 'social_comment',
        targetUserId: contentRow.creator_user_id,
        actorUserId: authContext.userId,
        contentId,
        title: 'New comment on your Spotlight post',
        body: parentCommentId ? 'Someone replied on your post.' : 'Someone commented on your post.',
        link: `/spotlight/post/${contentId}`
      });
      return res.status(201).json({ data });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to add comment.') });
    }
  });

  app.delete('/spotlight/comments/:id', requireAuth, async (req, res) => {
    try {
      const commentId = safeString(req.params.id || '').trim();
      if (!commentId) return res.status(400).json({ error: 'comment id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const { data: commentRow, error: commentError } = await supabase
        .from('spotlight_comments')
        .select('id,user_id,content_id,status')
        .eq('id', commentId)
        .maybeSingle();
      if (commentError) return res.status(400).json({ error: commentError.message });
      if (!commentRow || commentRow.status !== 'active') return res.status(404).json({ error: 'Comment not found.' });
      if (commentRow.user_id !== authContext.userId) return res.status(403).json({ error: 'You can only delete your own comments.' });

      const { error: updateError } = await supabase
        .from('spotlight_comments')
        .update({ status: 'deleted', body: '[deleted]' })
        .eq('id', commentId);
      if (updateError) return res.status(400).json({ error: updateError.message });
      await triggerRecomputeMetrics(commentRow.content_id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to delete comment.') });
    }
  });

  app.post('/spotlight/comments/:id/like', requireAuth, async (req, res) => {
    try {
      const commentId = safeString(req.params.id || '').trim();
      if (!commentId) return res.status(400).json({ error: 'comment id is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_comment_like', windowMs: 60_000, max: 30 })) return;

      const { data: commentRow, error: commentError } = await supabase.from('spotlight_comments').select('id,status').eq('id', commentId).maybeSingle();
      if (commentError) return res.status(400).json({ error: commentError.message });
      if (!commentRow || commentRow.status !== 'active') return res.status(404).json({ error: 'Comment not found.' });

      const { data: existing } = await supabase
        .from('spotlight_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', authContext.userId)
        .maybeSingle();
      let liked = false;
      if (existing?.id) {
        const { error } = await supabase.from('spotlight_comment_likes').delete().eq('id', existing.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('spotlight_comment_likes').insert({ comment_id: commentId, user_id: authContext.userId });
        if (error) return res.status(400).json({ error: error.message });
        liked = true;
      }
      await ignoreSupabaseMutationError(
        supabase.rpc('spotlight_refresh_comment_like_count', { p_comment_id: commentId })
      );
      const { data: refreshed } = await supabase.from('spotlight_comments').select('like_count').eq('id', commentId).maybeSingle();
      return res.json({ data: { comment_id: commentId, liked, like_count: Number(refreshed?.like_count || 0) } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update comment like.') });
    }
  });

  app.post('/spotlight/events/view', async (req, res) => {
    try {
      const contentId = safeString(req.body?.content_id || '').trim();
      const mediaType = normalizeMediaType(req.body?.media_type);
      const visibleRatio = parseNumber(req.body?.visible_ratio, 0);
      const watchTimeMs = parsePositiveInt(req.body?.watch_time_ms, 0, 0, 300_000);
      const sessionHint = safeString(req.body?.session_id || req.headers['x-session-id'] || '').trim();

      if (!contentId) return res.status(400).json({ error: 'content_id is required.' });
      if (!mediaType) return res.status(400).json({ error: 'media_type must be image or video.' });
      if (visibleRatio < 0.6) return res.json({ data: { counted: false, reason: 'visibility_threshold', deduped: false } });

      const requiredWatchMs = mediaType === 'video' ? 2500 : 1500;
      if (watchTimeMs < requiredWatchMs) return res.json({ data: { counted: false, reason: 'watch_threshold', deduped: false } });

      const { data: contentRow, error: contentError } = await supabase
        .from('spotlight_content')
        .select('id,creator_user_id,status,visibility')
        .eq('id', contentId)
        .maybeSingle();
      if (contentError) return res.status(400).json({ error: contentError.message });
      if (!contentRow || contentRow.status !== 'published') return res.status(404).json({ error: 'Content not found.' });

      const { viewerUserId } = await resolveViewerContext(req);
      const [followedCreatorIds, blockedUserIds] = await Promise.all([
        getFollowedCreatorIds(viewerUserId),
        getBlockedUserIdSet(viewerUserId)
      ]);
      if (blockedUserIds.has(contentRow.creator_user_id)) return res.status(404).json({ error: 'Content not found.' });
      if (!canViewerAccessRow({ row: contentRow, viewerUserId, followedCreatorIds })) {
        return res.status(403).json({ error: 'You cannot access this content.' });
      }
      const dedupeKey = createSessionFingerprint([
        viewerUserId || 'guest',
        sessionHint || '',
        req.ip || '',
        req.headers['user-agent'] || '',
        contentId,
        mediaType,
        getDateBucketKey(Date.now(), VIEW_DEDUPE_WINDOW_MS)
      ]);

      const { error: insertError } = await supabase.from('spotlight_views').insert({
        content_id: contentId,
        viewer_user_id: viewerUserId,
        viewer_session_key: sessionHint || dedupeKey.slice(0, 24),
        view_type: mediaType,
        watch_time_ms: watchTimeMs,
        dedupe_key: dedupeKey
      });
      if (insertError) {
        if (isUniqueViolation(insertError)) return res.json({ data: { counted: false, reason: 'dedupe_window', deduped: true } });
        return res.status(400).json({ error: insertError.message });
      }

      await triggerRecomputeMetrics(contentId);
      const { data: metrics } = await supabase.from('spotlight_metrics').select('views,watch_time_ms').eq('content_id', contentId).maybeSingle();
      return res.status(201).json({
        data: {
          counted: true,
          deduped: false,
          content_id: contentId,
          views: Number(metrics?.views || 0),
          watch_time_ms: Number(metrics?.watch_time_ms || 0)
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to track view event.') });
    }
  });

  app.post('/spotlight/report', requireAuth, async (req, res) => {
    try {
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_report', windowMs: 60 * 60_000, max: 10 })) return;

      const contentId = safeString(req.body?.content_id || '').trim() || null;
      const commentId = safeString(req.body?.comment_id || '').trim() || null;
      const reason = safeString(req.body?.reason || '').trim();
      const details = safeString(req.body?.details || '').trim() || null;

      if (!reason) return res.status(400).json({ error: 'reason is required.' });
      if (!contentId && !commentId) return res.status(400).json({ error: 'Provide content_id or comment_id.' });

      let reportedUserId = null;
      if (contentId) {
        const { data } = await supabase.from('spotlight_content').select('creator_user_id').eq('id', contentId).maybeSingle();
        reportedUserId = data?.creator_user_id || reportedUserId;
      }
      if (commentId) {
        const { data } = await supabase.from('spotlight_comments').select('user_id').eq('id', commentId).maybeSingle();
        reportedUserId = data?.user_id || reportedUserId;
      }

      const { data, error } = await supabase
        .from('spotlight_reports')
        .insert({
          reporter_user_id: authContext.userId,
          content_id: contentId,
          comment_id: commentId,
          reported_user_id: reportedUserId,
          reason,
          details
        })
        .select('*')
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to create report.') });
    }
  });

  app.post('/spotlight/block', requireAuth, async (req, res) => {
    try {
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const targetUserIdRaw = safeString(req.body?.target_user_id || '').trim();
      const targetFirebaseUid = safeString(req.body?.target_firebase_uid || '').trim();
      let targetUserId = targetUserIdRaw || null;
      if (!targetUserId && targetFirebaseUid) targetUserId = await resolveUserIdFromFirebaseUid(targetFirebaseUid);

      if (!targetUserId) return res.status(400).json({ error: 'target_user_id or target_firebase_uid is required.' });
      if (targetUserId === authContext.userId) return res.status(400).json({ error: 'Cannot block your own account.' });

      const { data: existing } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_user_id', authContext.userId)
        .eq('blocked_user_id', targetUserId)
        .maybeSingle();

      let blocked = false;
      if (existing?.id) {
        const { error } = await supabase.from('user_blocks').delete().eq('id', existing.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('user_blocks').insert({
          blocker_user_id: authContext.userId,
          blocked_user_id: targetUserId
        });
        if (error) return res.status(400).json({ error: error.message });
        blocked = true;
        await Promise.all([
          supabase.from('user_follows').delete().eq('follower_id', authContext.userId).eq('following_user_id', targetUserId),
          supabase.from('user_follows').delete().eq('follower_id', targetUserId).eq('following_user_id', authContext.userId)
        ]);
      }

      return res.json({ data: { target_user_id: targetUserId, blocked } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update block state.') });
    }
  });

  app.post('/spotlight/restrict', requireAuth, async (req, res) => {
    try {
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;

      const targetUserIdRaw = safeString(req.body?.target_user_id || '').trim();
      const targetFirebaseUid = safeString(req.body?.target_firebase_uid || '').trim();
      let targetUserId = targetUserIdRaw || null;
      if (!targetUserId && targetFirebaseUid) targetUserId = await resolveUserIdFromFirebaseUid(targetFirebaseUid);

      if (!targetUserId) return res.status(400).json({ error: 'target_user_id or target_firebase_uid is required.' });
      if (targetUserId === authContext.userId) return res.status(400).json({ error: 'Cannot restrict your own account.' });

      const { data: existing } = await supabase
        .from('user_restrictions')
        .select('id')
        .eq('restrictor_user_id', authContext.userId)
        .eq('restricted_user_id', targetUserId)
        .maybeSingle();

      let restricted = false;
      if (existing?.id) {
        const { error } = await supabase.from('user_restrictions').delete().eq('id', existing.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('user_restrictions').insert({
          restrictor_user_id: authContext.userId,
          restricted_user_id: targetUserId
        });
        if (error) return res.status(400).json({ error: error.message });
        restricted = true;
      }

      return res.json({ data: { target_user_id: targetUserId, restricted } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update restriction state.') });
    }
  });

  app.post('/spotlight/follow/:creatorFirebaseUid', requireAuth, async (req, res) => {
    try {
      const creatorFirebaseUid = safeString(req.params.creatorFirebaseUid || '').trim();
      if (!creatorFirebaseUid) return res.status(400).json({ error: 'creator firebase uid is required.' });
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      if (checkActionRate(res, { userId: authContext.userId, action: 'spotlight_follow', windowMs: 60_000, max: 20 })) return;

      const targetUserId = await resolveUserIdFromFirebaseUid(creatorFirebaseUid);
      if (!targetUserId) return res.status(404).json({ error: 'Creator not found.' });
      if (targetUserId === authContext.userId) return res.status(400).json({ error: 'Cannot follow your own account.' });
      const blockedSet = await getBlockedUserIdSet(authContext.userId);
      if (blockedSet.has(targetUserId)) return res.status(403).json({ error: 'Unblock this user before following.' });

      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', authContext.userId)
        .eq('following_user_id', targetUserId)
        .maybeSingle();

      let following = false;
      if (existingFollow?.id) {
        const { error } = await supabase.from('user_follows').delete().eq('id', existingFollow.id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('user_follows').insert({ follower_id: authContext.userId, following_user_id: targetUserId });
        if (error) return res.status(400).json({ error: error.message });
        following = true;
        await emitSocialNotification({
          type: 'social_follow',
          targetUserId,
          actorUserId: authContext.userId,
          contentId: null,
          title: 'You have a new follower',
          body: 'Someone started following you on Spotlight.',
          link: '/spotlight'
        });
      }

      await Promise.all([refreshCreatorCounters(authContext.userId), refreshCreatorCounters(targetUserId)]);
      return res.json({ data: { creator_user_id: targetUserId, following } });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to update follow state.') });
    }
  });

  app.get('/spotlight/analytics/creator/:userId', requireAuth, async (req, res) => {
    try {
      const authContext = await resolveAuthedUserId(req, res);
      if (!authContext) return;
      const rawTarget = safeString(req.params.userId || '').trim();
      let targetUserId = rawTarget;
      if (!targetUserId || targetUserId === 'me') {
        targetUserId = authContext.userId;
      } else if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
        targetUserId = await resolveUserIdFromFirebaseUid(targetUserId);
      }
      if (!targetUserId) return res.status(404).json({ error: 'Creator not found.' });
      if (targetUserId !== authContext.userId) {
        return res.status(403).json({ error: 'You can only access your own Spotlight analytics.' });
      }

      const [conversionRow, performanceRows, commissionRows] = await Promise.all([
        supabase.from('spotlight_creator_conversion_v').select('*').eq('creator_user_id', targetUserId).maybeSingle(),
        supabase
          .from('spotlight_product_performance_v')
          .select('content_id,item_id,campaign_key,clicks,cart_adds,purchases,revenue,ctr,purchase_rate')
          .eq('creator_user_id', targetUserId)
          .order('revenue', { ascending: false })
          .limit(12),
        supabase
          .from('spotlight_commission_ledger')
          .select('id,status,commission_amount,currency,content_id,created_at')
          .eq('creator_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (conversionRow.error) return res.status(400).json({ error: conversionRow.error.message });
      if (performanceRows.error) return res.status(400).json({ error: performanceRows.error.message });
      if (commissionRows.error) return res.status(400).json({ error: commissionRows.error.message });

      const topContentIds = Array.from(new Set((performanceRows.data || []).map((row) => row.content_id).filter(Boolean)));
      const { data: contentRows, error: contentError } = topContentIds.length
        ? await supabase
          .from('spotlight_content')
          .select('id,caption,thumbnail_url,media_url,published_at')
          .in('id', topContentIds)
        : { data: [], error: null };
      if (contentError) return res.status(400).json({ error: contentError.message });
      const contentById = new Map((contentRows || []).map((row) => [row.id, row]));

      const totalPendingCommission = (commissionRows.data || [])
        .filter((row) => row.status === 'pending' || row.status === 'approved')
        .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);
      const totalPaidCommission = (commissionRows.data || [])
        .filter((row) => row.status === 'paid')
        .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

      return res.json({
        data: {
          summary: {
            creator_user_id: targetUserId,
            content_count: Number(conversionRow.data?.content_count || 0),
            total_clicks: Number(conversionRow.data?.total_clicks || 0),
            total_cart_adds: Number(conversionRow.data?.total_cart_adds || 0),
            total_purchases: Number(conversionRow.data?.total_purchases || 0),
            total_revenue: Number(conversionRow.data?.total_revenue || 0),
            conversion_rate: Number(conversionRow.data?.conversion_rate || 0),
            pending_commission: Number(totalPendingCommission.toFixed(2)),
            paid_commission: Number(totalPaidCommission.toFixed(2))
          },
          top_posts: (performanceRows.data || []).map((row) => ({
            ...row,
            revenue: Number(row.revenue || 0),
            ctr: Number(row.ctr || 0),
            purchase_rate: Number(row.purchase_rate || 0),
            content: contentById.get(row.content_id) || null
          })),
          commissions: (commissionRows.data || []).map((row) => ({
            ...row,
            commission_amount: Number(row.commission_amount || 0)
          }))
        }
      });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to load Spotlight creator analytics.') });
    }
  });

  app.get('/spotlight/suggested-users', async (req, res) => {
    try {
      const limit = parsePositiveInt(req.query.limit, 8, 1, 20);
      const { viewerUserId } = await resolveViewerContext(req);
      const followedCreatorIds = await getFollowedCreatorIds(viewerUserId);
      const blockedSet = await getBlockedUserIdSet(viewerUserId);

      const { data: users } = await supabase.from('users').select('id,firebase_uid,name,avatar_url').limit(Math.max(limit * 4, 20));
      const userIds = (users || []).map((row) => row.id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase
          .from('user_profiles')
          .select('user_id,followers_count,posts_count,reels_count,is_verified')
          .in('user_id', userIds)
        : { data: [] };
      const profileById = new Map((profiles || []).map((row) => [row.user_id, row]));

      const suggestions = (users || [])
        .filter((userRow) => userRow.id !== viewerUserId)
        .filter((userRow) => !followedCreatorIds.has(userRow.id))
        .filter((userRow) => !blockedSet.has(userRow.id))
        .map((userRow) => {
          const profile = profileById.get(userRow.id) || {};
          return {
            id: userRow.id,
            firebase_uid: userRow.firebase_uid,
            name: userRow.name || 'Creator',
            avatar_url: userRow.avatar_url || '/icons/urbanprime.svg',
            followers_count: Number(profile.followers_count || 0),
            posts_count: Number(profile.posts_count || 0),
            reels_count: Number(profile.reels_count || 0),
            is_verified: Boolean(profile.is_verified)
          };
        })
        .sort((left, right) => Number(right.followers_count || 0) - Number(left.followers_count || 0))
        .slice(0, limit);

      return res.json({ data: suggestions });
    } catch (error) {
      return res.status(500).json({ error: safeString(error?.message || 'Unable to fetch suggestions.') });
    }
  });
};

export default registerSpotlightRoutes;

