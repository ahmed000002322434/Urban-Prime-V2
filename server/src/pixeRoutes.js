import { createHash, randomUUID } from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  buildMuxPlaybackLinks,
  buildMuxTextTrackUrls,
  createMuxAssetTrack,
  createMuxDirectUpload,
  fetchMuxOverallMetric,
  getMuxAsset,
  getMuxAssetDimensions,
  getMuxAssetPlaybackId,
  getMuxPrimaryAudioTrack,
  getMuxDirectUpload,
  getMuxTextTracks,
  generateMuxTrackSubtitles,
  hasMuxDataConfig,
  hasMuxVideoConfig
} from './muxClient.js';

const FEED_MODES = new Set(['for_you', 'following', 'explore']);
const VIDEO_VISIBILITY_VALUES = new Set(['public', 'followers', 'private']);
const VIDEO_STATUS_VALUES = new Set(['draft', 'uploading', 'processing', 'ready', 'published', 'failed', 'archived']);
const COMMENT_STATUS_VALUES = new Set(['active', 'hidden', 'deleted', 'flagged']);
const MAX_FEED_LIMIT = 20;
const MAX_STUDIO_LIMIT = 50;
const MAX_TITLE_LENGTH = 120;
const MAX_CAPTION_LENGTH = 2200;
const MAX_COMMENT_LENGTH = 600;
const MAX_VIDEO_DURATION_MS = 60_000;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MIN_ASPECT_RATIO = 1 / 2;
const MAX_ASPECT_RATIO = 1;
const MAX_VIDEO_WIDTH = 2160;
const MAX_VIDEO_HEIGHT = 3840;
const LOCAL_UPLOAD_SESSION_TTL_MS = 30 * 60 * 1000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ANALYTICS_TIMEFRAME = ['30:days'];
const SEARCH_MAX_QUERY_LENGTH = 80;
const SEARCH_RESULT_LIMIT = 12;
const SEARCH_TOKEN_LIMIT = 6;
const MAX_SUBTITLE_TEXT_LENGTH = 30_000;
const MAX_TRANSCRIPT_TEXT_LENGTH = 24_000;
const DEFAULT_MEMBERSHIP_AMOUNT = 4.99;
const ANALYTICS_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const ANALYTICS_VIEWER_WINDOW_MS = 15 * 60 * 1000;
const ANALYTICS_IP_WINDOW_MS = 60 * 60 * 1000;
const ANALYTICS_ALLOWED_EVENT_NAMES = new Set([
  'impression',
  'view_3s',
  'view_50',
  'view_95',
  'complete',
  'product_click',
  'dwell',
  'skip',
  'mute',
  'unmute'
]);
const ANALYTICS_EVENT_RANK = {
  impression: 0,
  view_3s: 1,
  view_50: 2,
  view_95: 3,
  complete: 4,
  product_click: 2,
  dwell: 1,
  skip: 1,
  mute: 0,
  unmute: 0
};
const ANALYTICS_VIEWER_LIMITS = {
  impression: 120,
  view_3s: 90,
  view_50: 70,
  view_95: 50,
  complete: 35,
  product_click: 40,
  dwell: 120,
  skip: 120,
  mute: 120,
  unmute: 120
};
const ANALYTICS_IP_LIMITS = {
  impression: 360,
  view_3s: 240,
  view_50: 180,
  view_95: 120,
  complete: 80,
  product_click: 120,
  dwell: 360,
  skip: 360,
  mute: 360,
  unmute: 360
};
const BOT_USER_AGENT_PATTERN = /(bot|crawl|spider|headless|puppeteer|playwright|selenium|phantom|scrapy|curl|wget|python-requests|aiohttp|okhttp|postman|insomnia|go-http-client)/i;
const MUX_QOE_METRICS = [
  { key: 'viewer_experience_score', measurement: 'avg' },
  { key: 'video_startup_time', measurement: 'median' },
  { key: 'rebuffer_percentage', measurement: 'avg' },
  { key: 'playback_failure_percentage', measurement: 'avg' },
  { key: 'weighted_average_bitrate', measurement: 'median' }
];

const safeString = (value, fallback = '') => (value == null ? fallback : String(value));
const normalizeJsonObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parsePositiveInt = (value, fallback, min = 1, max = 200) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};
const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};
const isUniqueViolation = (error) => safeString(error?.message || '').toLowerCase().includes('duplicate key');
const isMissingRelationError = (error) => safeString(error?.code) === '42P01'
  || safeString(error?.message || '').toLowerCase().includes('does not exist');
const slugifyHandle = (value) => safeString(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 32);
const normalizeFeedMode = (value) => {
  const mode = safeString(value || 'for_you').trim().toLowerCase();
  return FEED_MODES.has(mode) ? mode : 'for_you';
};
const normalizeVisibility = (value) => {
  const visibility = safeString(value || 'public').trim().toLowerCase();
  return VIDEO_VISIBILITY_VALUES.has(visibility) ? visibility : 'public';
};
const normalizeCommentStatus = (value) => {
  const status = safeString(value || 'active').trim().toLowerCase();
  return COMMENT_STATUS_VALUES.has(status) ? status : 'active';
};
const normalizeStatus = (value) => {
  const status = safeString(value || 'draft').trim().toLowerCase();
  return VIDEO_STATUS_VALUES.has(status) ? status : 'draft';
};
const normalizeTextArray = (value, limit = 12) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeString(entry).trim())
    .filter(Boolean)
    .slice(0, limit);
};
const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => safeString(entry).trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
};
const normalizeCommerceLinks = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const item = normalizeJsonObject(entry);
      const title = safeString(item.title).trim().slice(0, 120);
      const href = safeString(item.href).trim();
      if (!title && !href) return null;
      return {
        item_id: safeString(item.item_id).trim() || null,
        title,
        image_url: safeString(item.image_url).trim() || null,
        href: href || null,
        cta_label: safeString(item.cta_label || 'Shop').trim().slice(0, 24) || 'Shop',
        price_amount: Number(parseNumber(item.price_amount, 0).toFixed(2)),
        currency: safeString(item.currency || 'USD').trim().slice(0, 12) || 'USD'
      };
    })
    .filter(Boolean)
    .slice(0, 8);
};
const normalizeIsoTimestamp = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const createCursor = (value) => {
  if (!value) return null;
  return Buffer.from(String(value), 'utf8').toString('base64url');
};
const parseCursor = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    return normalizeIsoTimestamp(decoded);
  } catch {
    return null;
  }
};
const hashEventKey = (value) => createHash('sha1').update(safeString(value), 'utf8').digest('hex');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getHourBucketStart = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
};
const getDayBucket = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};
const analyticsSessionLedger = new Map();
const analyticsWindowLedger = new Map();

const pruneTimestampWindow = (timestamps, now, windowMs) =>
  (Array.isArray(timestamps) ? timestamps : []).filter((timestamp) => now - Number(timestamp || 0) < windowMs);

const reserveDedupeKey = async ({ supabase, dedupeKey, eventName, videoId, ttlMs = EVENT_TTL_MS }) => {
  try {
    const { error } = await supabase
      .from('pixe_event_keys')
      .insert({
        dedupe_key: dedupeKey,
        event_name: eventName,
        video_id: videoId,
        expires_at: new Date(Date.now() + ttlMs).toISOString()
      });
    if (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
};

const getFirstForwardedValue = (value) => safeString(value).split(',')[0].trim();

const getClientIp = (req) =>
  getFirstForwardedValue(req.headers['cf-connecting-ip'])
  || getFirstForwardedValue(req.headers['x-real-ip'])
  || getFirstForwardedValue(req.headers['x-forwarded-for'])
  || safeString(req.ip).trim()
  || 'unknown';

const getClientBotSignals = (req) => {
  const userAgent = safeString(req.headers['user-agent']).trim().slice(0, 280);
  const botScore = parseNumber(req.headers['x-cf-bot-score'], -1);
  const verifiedBot = parseBoolean(req.headers['x-cf-verified-bot'], false);
  const automatedUserAgent = BOT_USER_AGENT_PATTERN.test(userAgent);

  return {
    ip: getClientIp(req),
    userAgent,
    botScore: botScore > 0 ? botScore : null,
    verifiedBot,
    automatedUserAgent,
    suspicious: verifiedBot || automatedUserAgent || (botScore > 0 && botScore < 10)
  };
};

const normalizeSearchQuery = (value) => safeString(value)
  .toLowerCase()
  .replace(/[%_,]+/g, ' ')
  .replace(/[^a-z0-9\s#.-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, SEARCH_MAX_QUERY_LENGTH);

const buildSearchLikePattern = (value) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return null;
  return `%${normalized.replace(/\s+/g, '%')}%`;
};

const tokenizeSearchQuery = (value) => normalizeSearchQuery(value)
  .split(' ')
  .map((entry) => entry.trim().replace(/^#/, ''))
  .filter(Boolean)
  .slice(0, SEARCH_TOKEN_LIMIT);

const buildSearchableText = (parts) => parts
  .map((value) => safeString(value).toLowerCase())
  .join(' ')
  .trim();

const scoreTokenMatch = (tokens, searchableText) => {
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => {
    if (!searchableText) return score;
    if (searchableText.startsWith(token)) return score + 5;
    if (searchableText.includes(` ${token}`)) return score + 3;
    if (searchableText.includes(token)) return score + 1.5;
    return score;
  }, 0);
};

const getProductDisplayPrice = (row) => {
  const metadata = normalizeJsonObject(row?.metadata);
  return Number(
    parseNumber(
      row?.sale_price,
      parseNumber(row?.rental_price, parseNumber(row?.auction_start_price, parseNumber(metadata.salePrice, 0)))
    ).toFixed(2)
  );
};

const pickProductImageUrl = (row, imageMap) => {
  const mappedImages = imageMap.get(row.id) || [];
  if (mappedImages[0]) return mappedImages[0];

  const metadata = normalizeJsonObject(row?.metadata);
  const metadataCandidates = [
    ...(Array.isArray(metadata.imageUrls) ? metadata.imageUrls : []),
    ...(Array.isArray(metadata.images) ? metadata.images : []),
    ...(Array.isArray(metadata.galleryImageUrls) ? metadata.galleryImageUrls : [])
  ]
    .map((entry) => safeString(entry).trim())
    .filter(Boolean);
  return metadataCandidates[0] || '/icons/urbanprime.svg';
};

const getMinimumWatchTimeMs = (eventName, durationMs) => {
  const safeDuration = Math.max(Number(durationMs || 0), 1_000);
  if (eventName === 'view_3s') return Math.min(2_500, safeDuration * 0.35);
  if (eventName === 'view_50') return Math.min(12_000, safeDuration * 0.45);
  if (eventName === 'view_95') return Math.min(32_000, safeDuration * 0.8);
  if (eventName === 'complete') return Math.min(52_000, safeDuration * 0.9);
  return 0;
};

const recordWindowHit = ({ key, now, windowMs }) => {
  if (analyticsWindowLedger.size > 5000) {
    for (const [entryKey, timestamps] of analyticsWindowLedger.entries()) {
      const pruned = pruneTimestampWindow(timestamps, now, ANALYTICS_IP_WINDOW_MS);
      if (pruned.length === 0) analyticsWindowLedger.delete(entryKey);
      else analyticsWindowLedger.set(entryKey, pruned);
    }
  }
  const existing = analyticsWindowLedger.get(key) || [];
  const next = pruneTimestampWindow(existing, now, windowMs);
  next.push(now);
  analyticsWindowLedger.set(key, next);
  return next.length;
};

const getAnalyticsSessionKey = (viewerSeed, videoId) => hashEventKey(`pixe-session|${viewerSeed}|${videoId}`);

const getAnalyticsSessionState = (viewerSeed, videoId, now) => {
  if (analyticsSessionLedger.size > 4000) {
    for (const [entryKey, value] of analyticsSessionLedger.entries()) {
      if (!value || now >= Number(value.expiresAt || 0)) {
        analyticsSessionLedger.delete(entryKey);
      }
    }
  }
  const key = getAnalyticsSessionKey(viewerSeed, videoId);
  const existing = analyticsSessionLedger.get(key);
  if (existing && now < existing.expiresAt) {
    return { key, state: existing };
  }

  const fresh = {
    highestRank: -1,
    acceptedEvents: {},
    productClicks: 0,
    expiresAt: now + ANALYTICS_SESSION_TTL_MS,
    lastSeenAt: now
  };
  analyticsSessionLedger.set(key, fresh);
  return { key, state: fresh };
};

const canAcceptAnalyticsEvent = ({
  req,
  video,
  viewerId,
  viewerSessionId,
  eventName,
  eventTime,
  watchTimeMs
}) => {
  const now = Date.now();
  const viewerSession = safeString(viewerSessionId).trim().slice(0, 160);
  if (!viewerId && viewerSession.length < 8) {
    return { accepted: false };
  }

  const clientSignals = getClientBotSignals(req);
  if (clientSignals.suspicious) {
    return { accepted: false };
  }

  const eventTimestamp = new Date(eventTime).getTime();
  if (!Number.isFinite(eventTimestamp) || eventTimestamp < now - EVENT_TTL_MS || eventTimestamp > now + (5 * 60 * 1000)) {
    return { accepted: false };
  }

  const viewerSeed = hashEventKey([viewerId || 'guest', viewerSession || 'no-session', clientSignals.ip].join('|'));
  const eventRank = Number(ANALYTICS_EVENT_RANK[eventName] ?? -1);
  if (eventRank < 0) {
    return { accepted: false };
  }

  const { key: sessionKey, state } = getAnalyticsSessionState(viewerSeed, video.id, now);

  if (eventName === 'product_click') {
    if (!state.acceptedEvents.impression && state.highestRank < 0) {
      return { accepted: false };
    }
    if (state.productClicks >= 3) {
      return { accepted: false };
    }
  } else {
    if (state.acceptedEvents.complete) {
      return { accepted: false };
    }
    if (eventName !== 'impression' && !state.acceptedEvents.impression) {
      return { accepted: false };
    }
    if (state.acceptedEvents[eventName]) {
      return { accepted: false };
    }
    if (eventRank < state.highestRank) {
      return { accepted: false };
    }
  }

  const minimumWatchTimeMs = getMinimumWatchTimeMs(eventName, video.duration_ms);
  const normalizedWatchTimeMs = clamp(parseNumber(watchTimeMs, 0), 0, Number(video.duration_ms || 0));
  if (normalizedWatchTimeMs > 0 && minimumWatchTimeMs > 0 && normalizedWatchTimeMs < minimumWatchTimeMs) {
    return { accepted: false };
  }

  const viewerWindowCount = recordWindowHit({
    key: `${viewerSeed}:${eventName}`,
    now,
    windowMs: ANALYTICS_VIEWER_WINDOW_MS
  });
  if (viewerWindowCount > Number(ANALYTICS_VIEWER_LIMITS[eventName] || 0)) {
    return { accepted: false };
  }

  if (!viewerId) {
    const ipWindowCount = recordWindowHit({
      key: `${clientSignals.ip}:${eventName}`,
      now,
      windowMs: ANALYTICS_IP_WINDOW_MS
    });
    if (ipWindowCount > Number(ANALYTICS_IP_LIMITS[eventName] || 0)) {
      return { accepted: false };
    }
  }

  state.highestRank = Math.max(state.highestRank, eventRank);
  state.acceptedEvents[eventName] = true;
  state.productClicks = eventName === 'product_click' ? state.productClicks + 1 : state.productClicks;
  state.lastSeenAt = now;
  state.expiresAt = now + ANALYTICS_SESSION_TTL_MS;
  analyticsSessionLedger.set(sessionKey, state);

  return {
    accepted: true,
    viewerSeed,
    normalizedWatchTimeMs
  };
};

const calculateCompletionRate = (row) => {
  const qualifiedViews = Number(row?.qualified_view_count || 0);
  const completions = Number(row?.completion_count || 0);
  if (!qualifiedViews) return 0;
  return Number(((completions / qualifiedViews) * 100).toFixed(2));
};

const calculateAverageViewDuration = (row) => {
  const qualifiedViews = Number(row?.qualified_view_count || 0);
  const watchTime = Number(row?.watch_time_total_ms || 0);
  if (!qualifiedViews) return 0;
  return Math.round(watchTime / qualifiedViews);
};

const buildRequestBaseUrl = (req) => {
  const forwardedProto = getFirstForwardedValue(req.headers['x-forwarded-proto']);
  const forwardedHost = getFirstForwardedValue(req.headers['x-forwarded-host']);
  const host = forwardedHost || safeString(req.headers.host || req.get?.('host')).trim();
  const protocol = forwardedProto || safeString(req.protocol || 'http').trim() || 'http';
  return host ? `${protocol}://${host}` : '';
};

const createOptionalAuthMiddleware = (requireAuth) => async (req, res, next) => {
  const hasAuthHeader = Boolean(safeString(req.headers.authorization).trim());
  const hasBackendKey = Boolean(safeString(req.headers['x-backend-key']).trim());
  if (!hasAuthHeader && !hasBackendKey) {
    return next();
  }

  let resolved = false;
  const finish = () => {
    if (!resolved) {
      resolved = true;
      next();
    }
  };

  const fakeRes = {
    setHeader: () => fakeRes,
    status: () => fakeRes,
    json: () => {
      finish();
      return fakeRes;
    }
  };

  try {
    await requireAuth(req, fakeRes, finish);
  } catch {
    finish();
  }
};

const createNoopRateLimiter = () => (_req, _res, next) => next();

const buildVideoMetricDelta = (eventName, watchTimeMs = 0) => ({
  impression_count: eventName === 'impression' ? 1 : 0,
  qualified_view_count: eventName === 'view_3s' ? 1 : 0,
  completion_count: eventName === 'complete' ? 1 : 0,
  share_count: eventName === 'share' ? 1 : 0,
  product_click_count: eventName === 'product_click' ? 1 : 0,
  watch_time_total_ms: Math.max(0, Math.round(parseNumber(watchTimeMs, 0)))
});

const buildStatsDelta = (eventName, watchTimeMs = 0) => ({
  impressions: eventName === 'impression' ? 1 : 0,
  views_3s: eventName === 'view_3s' ? 1 : 0,
  views_50: eventName === 'view_50' ? 1 : 0,
  views_95: eventName === 'view_95' ? 1 : 0,
  completions: eventName === 'complete' ? 1 : 0,
  qualified_views: eventName === 'view_3s' ? 1 : 0,
  likes: eventName === 'like' ? 1 : 0,
  comments: eventName === 'comment' ? 1 : 0,
  saves: eventName === 'save' ? 1 : 0,
  shares: eventName === 'share' ? 1 : 0,
  product_clicks: eventName === 'product_click' ? 1 : 0,
  new_subscribers: eventName === 'subscribe' ? 1 : 0,
  watch_time_ms: Math.max(0, Math.round(parseNumber(watchTimeMs, 0)))
});

const sumBy = (rows, key) => (rows || []).reduce((sum, row) => sum + Number(row?.[key] || 0), 0);

const maybeSingle = async (query) => {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
};

const readRows = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const readRowsOrEmpty = async (query) => {
  try {
    return await readRows(query);
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
};

const maybeSingleOrNull = async (query) => {
  try {
    return await maybeSingle(query);
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
};

const insertPixeNotification = async (supabase, userId, { title, body, link = '/pixe', type = 'info' }, scheduleEmailForNotifications = null) => {
  const targetUserId = safeString(userId).trim();
  const messageBody = safeString(body).trim();
  if (!targetUserId || !messageBody) return;

  try {
    const { data, error } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      title: safeString(title || 'Pixe update').trim() || 'Pixe update',
      body: messageBody,
      link: safeString(link || '/pixe').trim() || '/pixe',
      type: safeString(type || 'info').trim().toLowerCase() || 'info',
      created_at: new Date().toISOString()
    }).select('*').maybeSingle();
    if (error) {
      console.warn('Insert Pixe notification failed:', error.message || error);
    } else if (data && typeof scheduleEmailForNotifications === 'function') {
      scheduleEmailForNotifications(data, null);
    }
  } catch (error) {
    console.warn('Insert Pixe notification failed:', error?.message || error);
  }
};

const safeDeleteRows = async (query) => {
  const { error } = await query;
  if (error && !isMissingRelationError(error)) throw error;
};

const normalizeCurrencyCode = (value) => safeString(value || 'USD').trim().toUpperCase().slice(0, 12) || 'USD';
const parseMoneyAmount = (value, fallback = 0) => Number(parseNumber(value, fallback).toFixed(2));
const sanitizeSubtitleLanguageCode = (value) => safeString(value || 'en').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '').slice(0, 16) || 'en';
const sanitizeSubtitleName = (value) => safeString(value || 'English').trim().slice(0, 80) || 'English';
const normalizeMultilineText = (value, limit) => safeString(value)
  .replace(/\r\n/g, '\n')
  .replace(/\u0000/g, '')
  .trim()
  .slice(0, limit);
const normalizeSubtitleVtt = (value) => {
  const normalized = normalizeMultilineText(value, MAX_SUBTITLE_TEXT_LENGTH);
  if (!normalized) return '';
  return /^WEBVTT/i.test(normalized) ? normalized : `WEBVTT\n\n${normalized}`;
};
const transcriptFromVtt = (value) => normalizeMultilineText(
  safeString(value)
    .replace(/^WEBVTT[^\n]*\n*/i, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (/^\d{2}:\d{2}[:.]\d{2,3}\s+-->\s+\d{2}:\d{2}[:.]\d{2,3}/.test(trimmed)) return false;
      if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(trimmed)) return false;
      return true;
    })
    .join('\n'),
  MAX_TRANSCRIPT_TEXT_LENGTH
);
const buildVttFromTranscript = (value) => {
  const normalized = normalizeMultilineText(value, MAX_TRANSCRIPT_TEXT_LENGTH);
  if (!normalized) return '';
  const body = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  return `WEBVTT\n\n00:00:00.000 --> 00:59:59.000\n${body}`;
};
const ensureDirectory = (targetPath) => {
  if (!targetPath) return;
  fs.mkdirSync(targetPath, { recursive: true });
};
const getPublicBaseUrl = (req) => {
  const configured = safeString(process.env.APP_PUBLIC_URL).trim().replace(/\/$/, '');
  if (configured) return configured;
  const origin = safeString(req.headers.origin).trim().replace(/\/$/, '');
  if (origin) return origin;
  const host = safeString(req.headers.host).trim();
  if (!host) return '';
  const forwardedProto = safeString(req.headers['x-forwarded-proto']).trim();
  const protocol = forwardedProto || (req.secure ? 'https' : 'http');
  return `${protocol}://${host}`;
};
const isPublicBaseUrlMuxReachable = (value) => {
  const baseUrl = safeString(value).trim().toLowerCase();
  if (!baseUrl) return false;
  return !(
    baseUrl.includes('localhost')
    || baseUrl.includes('127.0.0.1')
    || baseUrl.includes('::1')
  );
};
const buildSubtitleRelativePath = (videoId, languageCode) => `pixe/subtitles/${safeString(videoId).trim()}-${sanitizeSubtitleLanguageCode(languageCode)}.vtt`;
const writeSubtitleVttFile = ({ uploadsRoot, videoId, languageCode, vttText }) => {
  if (!uploadsRoot) return null;
  const relativePath = buildSubtitleRelativePath(videoId, languageCode);
  const fullPath = path.join(uploadsRoot, relativePath);
  ensureDirectory(path.dirname(fullPath));
  fs.writeFileSync(fullPath, normalizeSubtitleVtt(vttText), 'utf8');
  return {
    relativePath,
    fullPath,
    publicPath: `/uploads/${relativePath.replace(/\\/g, '/')}`
  };
};
const fetchTextAsset = async (url) => {
  const normalizedUrl = safeString(url).trim();
  if (!normalizedUrl) return '';
  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch text asset: ${response.status}`);
  }
  return await response.text();
};
const tokenizeComparableText = (value) => safeString(value)
  .toLowerCase()
  .replace(/[^a-z0-9\s#-]+/g, ' ')
  .split(/\s+/)
  .map((entry) => entry.trim().replace(/^#/, ''))
  .filter((entry) => entry.length >= 2)
  .slice(0, 120);
const calculateTokenOverlap = (leftTokens, rightTokens) => {
  const left = new Set(leftTokens || []);
  const right = new Set(rightTokens || []);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  return intersection / Math.max(left.size, right.size, 1);
};
const buildVideoFingerprint = (video) => [
  safeString(video?.title),
  safeString(video?.caption),
  ...(Array.isArray(video?.hashtags) ? video.hashtags : [])
].join(' ');
const sumNumericAmount = (rows) => (rows || []).reduce((sum, row) => sum + parseNumber(row?.amount, 0), 0);
const buildPayoutSnapshot = ({ tipRevenue, membershipRevenue, productRevenue, payoutRequests }) => {
  const totalEarned = parseMoneyAmount(tipRevenue + membershipRevenue + productRevenue, 0);
  const pendingPayouts = parseMoneyAmount(sumNumericAmount((payoutRequests || []).filter((row) => row.status === 'pending')), 0);
  const paidOut = parseMoneyAmount(sumNumericAmount((payoutRequests || []).filter((row) => row.status === 'paid' || row.status === 'approved')), 0);
  return {
    available_balance: Number(Math.max(0, totalEarned - pendingPayouts - paidOut).toFixed(2)),
    pending_payouts: pendingPayouts,
    paid_out: paidOut
  };
};
const buildSubtitlePayload = async ({ supabase, video, uploadsRoot = '', ownerUserId = null }) => {
  const record = await maybeSingleOrNull(
    supabase
      .from('pixe_video_subtitles')
      .select('*')
      .eq('video_id', video.id)
      .order('updated_at', { ascending: false })
  );

  let transcriptText = normalizeMultilineText(record?.transcript_text || '', MAX_TRANSCRIPT_TEXT_LENGTH);
  let vttText = normalizeSubtitleVtt(record?.vtt_text || '');
  let muxTrackId = safeString(record?.mux_track_id).trim() || null;
  let source = safeString(record?.source || '').trim() || 'generated';
  let status = safeString(record?.status || '').trim() || 'missing';
  let syncStatus = safeString(record?.sync_status || '').trim() || 'local';
  let languageCode = sanitizeSubtitleLanguageCode(record?.language_code || 'en');
  let name = sanitizeSubtitleName(record?.name || 'English');

  if ((!transcriptText || !vttText || !muxTrackId) && video.mux_asset_id && video.playback_id) {
    const asset = await getMuxAsset(video.mux_asset_id).catch(() => null);
    const textTrack = getMuxTextTracks(asset).find((track) => track.status === 'ready')
      || getMuxTextTracks(asset).find((track) => track.id === muxTrackId)
      || null;

    if (textTrack) {
      muxTrackId = textTrack.id;
      languageCode = sanitizeSubtitleLanguageCode(textTrack.language_code || languageCode);
      name = sanitizeSubtitleName(textTrack.name || name);
      const trackUrls = buildMuxTextTrackUrls({ playbackId: video.playback_id, trackId: textTrack.id });
      if (!transcriptText && trackUrls.transcript_url) {
        transcriptText = await fetchTextAsset(trackUrls.transcript_url).catch(() => '');
      }
      if (!vttText && trackUrls.vtt_url) {
        vttText = await fetchTextAsset(trackUrls.vtt_url).catch(() => '');
      }
      if (vttText && !transcriptText) {
        transcriptText = transcriptFromVtt(vttText);
      }
      if (transcriptText || vttText) {
        source = textTrack.text_source === 'generated_vod' ? 'generated' : source;
        status = record?.status || 'generated';
        syncStatus = record?.sync_status || 'mux';
      }
    }
  }

  const localFile = vttText
    ? writeSubtitleVttFile({ uploadsRoot: safeString(uploadsRoot).trim(), videoId: video.id, languageCode, vttText })
    : null;

  return {
    id: record?.id || null,
    video_id: video.id,
    language_code: languageCode,
    name,
    source,
    status,
    mux_track_id: muxTrackId,
    transcript_text: transcriptText,
    vtt_text: vttText,
    sync_status: syncStatus,
    subtitle_url: localFile ? localFile.publicPath : null,
    updated_at: record?.updated_at || null,
    created_at: record?.created_at || null,
    owner_user_id: ownerUserId || record?.created_by || null
  };
};

const normalizeUploadGeometry = ({ width, height }) => {
  const normalizedWidth = Math.min(Number(width || 0), Number(height || 0));
  const normalizedHeight = Math.max(Number(width || 0), Number(height || 0));
  return {
    width: normalizedWidth,
    height: normalizedHeight,
    aspectRatio: normalizedWidth / Math.max(normalizedHeight, 1),
    looksRotated: Number(width || 0) > Number(height || 0)
  };
};

const sanitizeUploadStem = (value) => {
  const normalized = safeString(value)
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return normalized || 'pixe-video';
};

const getVideoExtension = (fileName, mimeType) => {
  const fileExtension = safeString(fileName).trim().match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (fileExtension) return fileExtension;

  const normalizedMime = safeString(mimeType).trim().toLowerCase();
  if (normalizedMime.includes('quicktime')) return 'mov';
  if (normalizedMime.includes('webm')) return 'webm';
  if (normalizedMime.includes('ogg')) return 'ogv';
  return 'mp4';
};

const resolveWithinDirectory = (rootDir, relativePath) => {
  const absoluteRoot = path.resolve(rootDir);
  const absolutePath = path.resolve(absoluteRoot, relativePath);
  const relative = path.relative(absoluteRoot, absolutePath);
  if (!relative || relative === '') return absolutePath;
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return absolutePath;
};

const deriveLocalUploadPath = (uploadsRoot, urlValue) => {
  if (!uploadsRoot) return null;
  const raw = safeString(urlValue).trim();
  if (!raw) return null;

  let pathname = raw;
  try {
    pathname = new URL(raw, 'http://localhost').pathname;
  } catch {
    pathname = raw;
  }

  if (!pathname.startsWith('/uploads/')) return null;
  const relativePath = pathname.slice('/uploads/'.length).replace(/^\/+/, '');
  return resolveWithinDirectory(uploadsRoot, relativePath);
};

const removeFileIfPresent = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('Unable to remove local Pixe asset:', error);
    }
  }
};

const ensureChannelHandle = async (supabase, requestedHandle, fallbackSeed) => {
  const baseHandle = slugifyHandle(requestedHandle) || slugifyHandle(fallbackSeed) || 'creator';

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseHandle : `${baseHandle}-${attempt + 1}`;
    const existing = await maybeSingle(
      supabase
        .from('pixe_channels')
        .select('id')
        .eq('handle', candidate)
    );
    if (!existing) return candidate;
  }

  return `creator-${Date.now().toString(36).slice(-6)}`;
};

const refreshChannelCounters = async (supabase, channelId) => {
  if (!channelId) return;

  const [videos, subscriptions] = await Promise.all([
    readRows(
      supabase
        .from('pixe_videos')
        .select('id,status,impression_count,qualified_view_count,watch_time_total_ms')
        .eq('channel_id', channelId)
    ),
    readRows(
      supabase
        .from('pixe_subscriptions')
        .select('id')
        .eq('channel_id', channelId)
    )
  ]);

  const { error } = await supabase
    .from('pixe_channels')
    .update({
      subscriber_count: subscriptions.length,
      video_count: videos.length,
      published_video_count: videos.filter((row) => row.status === 'published').length,
      total_impressions: sumBy(videos, 'impression_count'),
      total_qualified_views: sumBy(videos, 'qualified_view_count'),
      total_watch_time_ms: sumBy(videos, 'watch_time_total_ms')
    })
    .eq('id', channelId);

  if (error) throw error;
};

const cleanupPixeAccountData = async ({ supabase, userId, uploadsRoot = '' }) => {
  const channelRows = await readRowsOrEmpty(
    supabase
      .from('pixe_channels')
      .select('id')
      .eq('user_id', userId)
  );

  const channelIds = channelRows.map((row) => row.id).filter(Boolean);
  const videoRows = channelIds.length > 0
    ? await readRowsOrEmpty(
      supabase
        .from('pixe_videos')
        .select('id')
        .in('channel_id', channelIds)
    )
    : [];
  const videoIds = videoRows.map((row) => row.id).filter(Boolean);

  const commentRows = videoIds.length > 0
    ? await readRowsOrEmpty(
      supabase
        .from('pixe_comments')
        .select('id')
        .in('video_id', videoIds)
    )
    : [];
  const commentIds = commentRows.map((row) => row.id).filter(Boolean);

  const subtitleRows = videoIds.length > 0
    ? await readRowsOrEmpty(
      supabase
        .from('pixe_video_subtitles')
        .select('subtitle_url')
        .in('video_id', videoIds)
    )
    : [];

  if (commentIds.length > 0) {
    await safeDeleteRows(
      supabase
        .from('pixe_comment_reports')
        .delete()
        .in('comment_id', commentIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_comment_likes')
        .delete()
        .in('comment_id', commentIds)
    );
  }

  await safeDeleteRows(
    supabase
      .from('pixe_comment_likes')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_comment_reports')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_saved_videos')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_user_video_activity')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_user_daily_activity')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_video_likes')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_comments')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_subscriptions')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_tips')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('pixe_memberships')
      .delete()
      .eq('user_id', userId)
  );

  if (channelIds.length > 0) {
    await safeDeleteRows(
      supabase
        .from('pixe_subscriptions')
        .delete()
        .in('channel_id', channelIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_tips')
        .delete()
        .in('channel_id', channelIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_memberships')
        .delete()
        .in('channel_id', channelIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_payout_ledger')
        .delete()
        .in('channel_id', channelIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_payout_requests')
        .delete()
        .in('channel_id', channelIds)
    );
  }

  if (videoIds.length > 0) {
    await safeDeleteRows(
      supabase
        .from('pixe_event_keys')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_saved_videos')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_likes')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_product_tags')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_stats_hourly')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_stats_daily')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_subtitles')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_video_reviews')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_comments')
        .delete()
        .in('video_id', videoIds)
    );
    await safeDeleteRows(
      supabase
        .from('pixe_videos')
        .delete()
        .in('id', videoIds)
    );
  }

  if (channelIds.length > 0) {
    await safeDeleteRows(
      supabase
        .from('pixe_channels')
        .delete()
        .in('id', channelIds)
    );
  }

  await safeDeleteRows(
    supabase
      .from('personas')
      .delete()
      .eq('user_id', userId)
  );
  await safeDeleteRows(
    supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)
  );

  const scrubToken = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const { error: scrubError } = await supabase
    .from('users')
    .update({
      firebase_uid: `deleted-${scrubToken}`,
      email: `deleted+${scrubToken}@urbanprime.local`,
      name: 'Deleted User',
      avatar_url: '/icons/urbanprime.svg',
      phone: null
    })
    .eq('id', userId);
  if (scrubError && !isMissingRelationError(scrubError)) throw scrubError;

  await Promise.all(
    subtitleRows
      .map((row) => deriveLocalUploadPath(uploadsRoot, row?.subtitle_url))
      .filter(Boolean)
      .map((filePath) => removeFileIfPresent(filePath))
  );
};

const ensureCreatorChannel = async (supabase, context) => {
  const existing = await maybeSingle(
    supabase
      .from('pixe_channels')
      .select('*')
      .eq('user_id', context.user.id)
  );

  const desiredPayload = {
    display_name: safeString(context.user?.name || 'Creator').trim() || 'Creator',
    avatar_url: safeString(context.user?.avatar_url || '').trim() || null,
    bio: safeString(context.profile?.bio || '').trim(),
    banner_url: safeString(context.profile?.preferences?.pixe_banner_url || '').trim() || null
  };

  if (!existing) {
    const handle = await ensureChannelHandle(
      supabase,
      context.profile?.username || context.user?.name || '',
      context.user?.firebase_uid || context.user?.id || 'creator'
    );
    const { data, error } = await supabase
      .from('pixe_channels')
      .insert({
        user_id: context.user.id,
        handle,
        onboarding_completed: false,
        ...desiredPayload
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const refreshPatch = {};
  if (!safeString(existing.display_name).trim() && desiredPayload.display_name) {
    refreshPatch.display_name = desiredPayload.display_name;
  }
  if (!safeString(existing.avatar_url).trim() && desiredPayload.avatar_url) {
    refreshPatch.avatar_url = desiredPayload.avatar_url;
  }
  if (!safeString(existing.bio).trim() && desiredPayload.bio) {
    refreshPatch.bio = desiredPayload.bio;
  }
  if (!safeString(existing.banner_url).trim() && desiredPayload.banner_url) {
    refreshPatch.banner_url = desiredPayload.banner_url;
  }

  const needsRefresh = Object.keys(refreshPatch).length > 0;

  if (needsRefresh) {
    const { data, error } = await supabase
      .from('pixe_channels')
      .update(refreshPatch)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data || existing;
  }

  return existing;
};

const releaseDueScheduledVideos = async (supabase, channelId = null) => {
  let query = supabase
    .from('pixe_videos')
    .update({
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('status', 'ready')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', new Date().toISOString())
    .not('playback_id', 'is', null);

  if (channelId) {
    query = query.eq('channel_id', channelId);
  }

  const { error } = await query;
  if (error) throw error;
};

const loadViewerContext = async (getUserContext, req) => {
  if (!req.user?.uid) return null;
  const context = await getUserContext(req);
  return context?.error ? null : context;
};

const viewerFollowsChannel = async (supabase, viewerUserId, channelId) => {
  if (!viewerUserId || !channelId) return false;
  const subscription = await maybeSingle(
    supabase
      .from('pixe_subscriptions')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', viewerUserId)
  );
  return Boolean(subscription);
};

const canViewerAccessVideo = async ({ supabase, video, viewerUserId = null }) => {
  if (!video) return false;
  const isOwner = Boolean(viewerUserId && viewerUserId === video.creator_user_id);
  if (isOwner) return true;
  if (video.status !== 'published') return false;
  if (video.visibility === 'public') return true;
  if (video.visibility === 'followers') {
    return await viewerFollowsChannel(supabase, viewerUserId, video.channel_id);
  }
  return false;
};

const loadChannelDecorations = async (supabase, channels) => {
  const userIds = Array.from(new Set(channels.map((row) => row.user_id).filter(Boolean)));
  if (userIds.length === 0) {
    return new Map();
  }

  const [users, profiles] = await Promise.all([
    readRows(
      supabase
        .from('users')
        .select('id,firebase_uid,name,avatar_url')
        .in('id', userIds)
    ),
    readRows(
      supabase
        .from('user_profiles')
        .select('user_id,username')
        .in('user_id', userIds)
    )
  ]);

  const usersById = new Map(users.map((row) => [row.id, row]));
  const profilesByUserId = new Map(profiles.map((row) => [row.user_id, row]));
  const map = new Map();

  channels.forEach((row) => {
    const user = usersById.get(row.user_id) || null;
    const profile = profilesByUserId.get(row.user_id) || null;
    map.set(row.id, {
      id: row.id,
      owner_firebase_uid: user?.firebase_uid || null,
      handle: row.handle,
      display_name: row.display_name || user?.name || 'Creator',
      avatar_url: row.avatar_url || user?.avatar_url || '/icons/urbanprime.svg',
      banner_url: row.banner_url || null,
      bio: row.bio || '',
      subscriber_count: Number(row.subscriber_count || 0),
      video_count: Number(row.video_count || 0),
      published_video_count: Number(row.published_video_count || 0),
      tip_enabled: Boolean(row.tip_enabled),
      membership_enabled: Boolean(row.membership_enabled),
      username: profile?.username || null
    });
  });

  return map;
};

const loadViewerFlags = async ({ supabase, viewerUserId, videoIds, channelIds }) => {
  if (!viewerUserId) {
    return {
      likedIds: new Set(),
      savedIds: new Set(),
      subscribedChannelIds: new Set()
    };
  }

  const [likes, saves, subscriptions] = await Promise.all([
    videoIds.length > 0
      ? readRows(
        supabase
          .from('pixe_video_likes')
          .select('video_id')
          .eq('user_id', viewerUserId)
          .in('video_id', videoIds)
      )
      : Promise.resolve([]),
    videoIds.length > 0
      ? readRows(
        supabase
          .from('pixe_saved_videos')
          .select('video_id')
          .eq('user_id', viewerUserId)
          .in('video_id', videoIds)
      )
      : Promise.resolve([]),
    channelIds.length > 0
      ? readRows(
        supabase
          .from('pixe_subscriptions')
          .select('channel_id')
          .eq('user_id', viewerUserId)
          .in('channel_id', channelIds)
      )
      : Promise.resolve([])
  ]);

  return {
    likedIds: new Set(likes.map((row) => row.video_id)),
    savedIds: new Set(saves.map((row) => row.video_id)),
    subscribedChannelIds: new Set(subscriptions.map((row) => row.channel_id))
  };
};

const loadProductTags = async (supabase, videoIds) => {
  if (videoIds.length === 0) return new Map();
  const rows = await readRows(
    supabase
      .from('pixe_video_product_tags')
      .select('*')
      .in('video_id', videoIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );

  const byVideoId = new Map();
  rows.forEach((row) => {
    if (!byVideoId.has(row.video_id)) {
      byVideoId.set(row.video_id, []);
    }
    byVideoId.get(row.video_id).push({
      id: row.id,
      item_id: row.item_id || null,
      title: row.title || '',
      image_url: row.image_url || null,
      href: row.href || null,
      cta_label: row.cta_label || 'Shop',
      price_amount: Number(row.price_amount || 0),
      currency: row.currency || 'USD'
    });
  });
  return byVideoId;
};

const hydrateVideos = async ({ supabase, rows, viewerUserId = null }) => {
  const videoIds = rows.map((row) => row.id);
  const channelIds = Array.from(new Set(rows.map((row) => row.channel_id).filter(Boolean)));
  const [channels, viewerFlags, productTags] = await Promise.all([
    channelIds.length > 0
      ? readRows(
        supabase
          .from('pixe_channels')
          .select('*')
          .in('id', channelIds)
      )
      : Promise.resolve([]),
    loadViewerFlags({ supabase, viewerUserId, videoIds, channelIds }),
    loadProductTags(supabase, videoIds)
  ]);

  const channelDecorations = await loadChannelDecorations(supabase, channels);

  return rows.map((row) => {
    const channel = channelDecorations.get(row.channel_id) || null;
    return {
      id: row.id,
      title: row.title || '',
      caption: row.caption || '',
      hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
      visibility: row.visibility,
      status: row.status,
      moderation_state: row.moderation_state,
      mux_upload_status: row.mux_upload_status,
      duration_ms: Number(row.duration_ms || 0),
      width: Number(row.width || 0),
      height: Number(row.height || 0),
      fps: Number(row.fps || 0),
      thumbnail_url: row.thumbnail_url || buildMuxPlaybackLinks(row.playback_id).thumbnail_url,
      preview_url: row.preview_url || buildMuxPlaybackLinks(row.playback_id).preview_url,
      manifest_url: row.manifest_url || buildMuxPlaybackLinks(row.playback_id).manifest_url,
      playback_id: row.playback_id || null,
      allow_comments: Boolean(row.allow_comments),
      scheduled_for: row.scheduled_for || null,
      published_at: row.published_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_size_bytes: Number(row.source_size_bytes || 0),
      processing_error: row.processing_error || null,
      metrics: {
        impressions: Number(row.impression_count || 0),
        qualified_views: Number(row.qualified_view_count || 0),
        watch_time_ms: Number(row.watch_time_total_ms || 0),
        completions: Number(row.completion_count || 0),
        likes: Number(row.like_count || 0),
        comments: Number(row.comment_count || 0),
        saves: Number(row.save_count || 0),
        shares: Number(row.share_count || 0),
        product_clicks: Number(row.product_click_count || 0),
        product_revenue_amount: Number(row.product_revenue_amount || 0),
        completion_rate: calculateCompletionRate(row),
        average_view_duration_ms: calculateAverageViewDuration(row)
      },
      channel: channel
        ? {
          ...channel,
          is_subscribed: viewerFlags.subscribedChannelIds.has(channel.id)
        }
        : null,
      product_tags: productTags.get(row.id) || [],
      viewer_state: {
        liked: viewerFlags.likedIds.has(row.id),
        saved: viewerFlags.savedIds.has(row.id)
      }
    };
  });
};

const loadItemImageMap = async (supabase, itemIds) => {
  if (itemIds.length === 0) return new Map();

  const rows = await readRows(
    supabase
      .from('item_images')
      .select('item_id,url,sort_order')
      .in('item_id', itemIds)
      .order('sort_order', { ascending: true })
  );

  const imageMap = new Map();
  rows.forEach((row) => {
    const itemId = safeString(row?.item_id).trim();
    const url = safeString(row?.url).trim();
    if (!itemId || !url) return;
    if (!imageMap.has(itemId)) {
      imageMap.set(itemId, []);
    }
    imageMap.get(itemId).push(url);
  });
  return imageMap;
};

const collectTrendingTopics = (videos, queryTokens = [], limit = 8) => {
  const counts = new Map();
  const tokenSet = new Set(queryTokens.map((token) => token.toLowerCase()));

  (videos || []).forEach((video) => {
    const hashtags = Array.isArray(video?.hashtags) ? video.hashtags : [];
    hashtags.forEach((tag) => {
      const normalized = safeString(tag).trim().replace(/^#/, '').toLowerCase();
      if (!normalized) return;
      if (tokenSet.size > 0 && !tokenSet.has(normalized) && !queryTokens.some((token) => normalized.includes(token))) {
        return;
      }
      counts.set(normalized, Number(counts.get(normalized) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([tag]) => tag);
};

const searchChannels = async ({ supabase, query, limit, viewerUserId }) => {
  let builder = supabase
    .from('pixe_channels')
    .select('*')
    .order('subscriber_count', { ascending: false })
    .order('published_video_count', { ascending: false })
    .limit(limit * 3);

  const likePattern = buildSearchLikePattern(query);
  const tokens = tokenizeSearchQuery(query);
  if (likePattern) {
    builder = builder.or(`handle.ilike.${likePattern},display_name.ilike.${likePattern},bio.ilike.${likePattern}`);
  }

  const rows = await readRows(builder);
  const channelViews = await loadChannelDecorations(supabase, rows);
  const viewerFlags = await loadViewerFlags({
    supabase,
    viewerUserId,
    videoIds: [],
    channelIds: rows.map((row) => row.id)
  });

  return rows
    .map((row) => {
      const channel = channelViews.get(row.id);
      if (!channel) return null;
      const searchableText = buildSearchableText([channel.display_name, channel.handle, channel.bio]);
      const searchScore = tokens.length > 0 ? scoreTokenMatch(tokens, searchableText) : 0;
      const trendScore = Math.log1p(Number(row.subscriber_count || 0)) + Math.log1p(Number(row.published_video_count || 0));

      return {
        ...channel,
        is_subscribed: viewerFlags.subscribedChannelIds.has(channel.id),
        search_score: (searchScore * 4) + trendScore
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const scoreDelta = Number(right.search_score || 0) - Number(left.search_score || 0);
      if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
      return Number(right.subscriber_count || 0) - Number(left.subscriber_count || 0);
    })
    .slice(0, limit)
    .map(({ search_score: _ignored, ...channel }) => channel);
};

const searchVideos = async ({ supabase, query, limit, viewerUserId }) => {
  let builder = supabase
    .from('pixe_videos')
    .select('*')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(limit * 4);

  const likePattern = buildSearchLikePattern(query);
  const tokens = tokenizeSearchQuery(query);
  if (likePattern) {
    builder = builder.or(`title.ilike.${likePattern},caption.ilike.${likePattern}`);
  }

  const rows = await readRows(builder);
  const filteredRows = tokens.length > 0
    ? rows.filter((row) => {
      const searchableText = buildSearchableText([
        row.title,
        row.caption,
        ...(Array.isArray(row.hashtags) ? row.hashtags : [])
      ]);
      return scoreTokenMatch(tokens, searchableText) > 0;
    })
    : rows;

  const rankedRows = rankFeedRows(filteredRows, 'explore').slice(0, limit);
  return await hydrateVideos({ supabase, rows: rankedRows, viewerUserId });
};

const searchProducts = async ({ supabase, query, limit }) => {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = tokenizeSearchQuery(query);
  let rows = [];

  if (normalizedQuery) {
    let builder = supabase
      .from('items')
      .select('id,title,description,brand,currency,sale_price,rental_price,auction_start_price,is_featured,is_verified,metadata,created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit * 4);

    const likePattern = buildSearchLikePattern(normalizedQuery);
    if (likePattern) {
      builder = builder.or(`title.ilike.${likePattern},description.ilike.${likePattern},brand.ilike.${likePattern}`);
    }
    rows = await readRows(builder);
  } else {
    const recentTags = await readRows(
      supabase
        .from('pixe_video_product_tags')
        .select('item_id,created_at')
        .not('item_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit * 8)
    );

    const counts = new Map();
    recentTags.forEach((row) => {
      const itemId = safeString(row.item_id).trim();
      if (!itemId) return;
      counts.set(itemId, Number(counts.get(itemId) || 0) + 1);
    });

    const rankedItemIds = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([itemId]) => itemId)
      .slice(0, limit * 2);

    if (rankedItemIds.length > 0) {
      rows = await readRows(
        supabase
          .from('items')
          .select('id,title,description,brand,currency,sale_price,rental_price,auction_start_price,is_featured,is_verified,metadata,created_at')
          .in('id', rankedItemIds)
          .eq('status', 'published')
      );
    }

    if (rows.length === 0) {
      rows = await readRows(
        supabase
          .from('items')
          .select('id,title,description,brand,currency,sale_price,rental_price,auction_start_price,is_featured,is_verified,metadata,created_at')
          .eq('status', 'published')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit * 3)
      );
    }
  }

  const imageMap = await loadItemImageMap(supabase, rows.map((row) => row.id));
  return rows
    .map((row) => {
      const metadata = normalizeJsonObject(row?.metadata);
      const searchableText = buildSearchableText([
        row.title,
        row.description,
        row.brand,
        metadata.category,
        ...(Array.isArray(metadata.tags) ? metadata.tags : [])
      ]);
      const queryScore = tokens.length > 0 ? scoreTokenMatch(tokens, searchableText) : 0;
      const trendScore = (Boolean(row?.is_featured) ? 1.2 : 0) + (Boolean(row?.is_verified) ? 0.8 : 0);
      return {
        id: row.id,
        title: row.title || metadata.title || 'Untitled product',
        description: row.description || metadata.description || '',
        brand: row.brand || metadata.brand || '',
        currency: row.currency || metadata.currency || 'USD',
        price_amount: getProductDisplayPrice(row),
        image_url: pickProductImageUrl(row, imageMap),
        href: `/item/${encodeURIComponent(row.id)}`,
        is_featured: Boolean(row.is_featured),
        is_verified: Boolean(row.is_verified),
        search_score: (queryScore * 4) + trendScore
      };
    })
    .filter((row) => tokens.length === 0 || row.search_score > 0)
    .sort((left, right) => {
      const scoreDelta = Number(right.search_score || 0) - Number(left.search_score || 0);
      if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
      return Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
    })
    .slice(0, limit)
    .map(({ search_score: _ignored, ...product }) => product);
};

const replaceProductTags = async (supabase, videoId, productTags) => {
  const normalizedTags = normalizeCommerceLinks(productTags);
  const { error: deleteError } = await supabase
    .from('pixe_video_product_tags')
    .delete()
    .eq('video_id', videoId);
  if (deleteError) throw deleteError;

  if (normalizedTags.length === 0) return [];

  const { data, error } = await supabase
    .from('pixe_video_product_tags')
    .insert(
      normalizedTags.map((tag, index) => ({
        video_id: videoId,
        item_id: tag.item_id,
        title: tag.title,
        image_url: tag.image_url,
        href: tag.href,
        cta_label: tag.cta_label,
        price_amount: tag.price_amount,
        currency: tag.currency,
        sort_order: index
      }))
    )
    .select('*');
  if (error) throw error;
  return data || [];
};

const validateUploadMetadata = ({ sizeBytes, durationMs, width, height }) => {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return 'A video file is required.';
  }
  if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
    return 'Video files must be 150MB or smaller.';
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_VIDEO_DURATION_MS) {
    return 'Videos must be 60 seconds or shorter.';
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Video dimensions are required.';
  }

  const normalizedGeometry = normalizeUploadGeometry({ width, height });
  if (normalizedGeometry.width > MAX_VIDEO_WIDTH || normalizedGeometry.height > MAX_VIDEO_HEIGHT) {
    return 'Video resolution must be 2160x3840 or lower.';
  }

  if (normalizedGeometry.aspectRatio < MIN_ASPECT_RATIO || normalizedGeometry.aspectRatio > MAX_ASPECT_RATIO) {
    return 'Pixe currently supports portrait or square uploads. For the best fullscreen fit, keep clips between 9:16 and 4:5.';
  }

  return null;
};

const validateProcessedAssetMetadata = ({ duration_ms: durationMs, width, height }) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_VIDEO_DURATION_MS) {
    return 'Processed clip exceeds the 60 second Pixe limit.';
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Processed clip dimensions are unavailable.';
  }

  const normalizedGeometry = normalizeUploadGeometry({ width, height });
  if (normalizedGeometry.width > MAX_VIDEO_WIDTH || normalizedGeometry.height > MAX_VIDEO_HEIGHT) {
    return 'Processed clip exceeds the 2160x3840 Pixe upload limit.';
  }
  if (normalizedGeometry.aspectRatio < MIN_ASPECT_RATIO || normalizedGeometry.aspectRatio > MAX_ASPECT_RATIO) {
    return 'Processed clip must stay in the portrait or square-safe Pixe range.';
  }
  return null;
};

const syncMuxVideoState = async ({ supabase, row }) => {
  if (!row || !row.mux_upload_id || !hasMuxVideoConfig()) return row;
  if ((row.status === 'ready' || row.status === 'published') && row.playback_id) return row;
  if (safeString(row.mux_upload_id).startsWith('local-')) return row;

  try {
    const upload = await getMuxDirectUpload(row.mux_upload_id);
    if (!upload) return row;

    const uploadStatus = safeString(upload?.status || row.mux_upload_status || '').trim() || row.mux_upload_status;
    const assetId = safeString(upload?.asset_id || row.mux_asset_id || '').trim() || null;

    if (!assetId) {
      if (uploadStatus !== row.mux_upload_status) {
        const { data, error } = await supabase
          .from('pixe_videos')
          .update({
            mux_upload_status: uploadStatus,
            status: uploadStatus === 'errored' ? 'failed' : 'uploading',
            processing_error: uploadStatus === 'errored' ? 'Mux upload reported an error before asset creation.' : null
          })
          .eq('id', row.id)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        return data || row;
      }
      return row;
    }

    const asset = await getMuxAsset(assetId);
    if (!asset) return row;

    const assetStatus = safeString(asset?.status || uploadStatus).trim().toLowerCase();
    const dimensions = getMuxAssetDimensions(asset);
    const playbackId = getMuxAssetPlaybackId(asset);

    if (assetStatus === 'errored') {
      const { data, error } = await supabase
        .from('pixe_videos')
        .update({
          mux_asset_id: assetId,
          mux_upload_status: 'errored',
          status: 'failed',
          processing_error: 'Mux reported an asset processing error.'
        })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data || row;
    }

    if (assetStatus !== 'ready' || !playbackId) {
      const { data, error } = await supabase
        .from('pixe_videos')
        .update({
          mux_asset_id: assetId,
          mux_upload_status: assetStatus || uploadStatus || 'processing',
          status: 'processing',
          processing_error: null
        })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data || row;
    }

    const processedValidationError = validateProcessedAssetMetadata(dimensions);
    if (processedValidationError) {
      const { data, error } = await supabase
        .from('pixe_videos')
        .update({
          mux_asset_id: assetId,
          playback_id: playbackId,
          mux_upload_status: 'ready',
          status: 'failed',
          duration_ms: dimensions.duration_ms,
          width: dimensions.width,
          height: dimensions.height,
          fps: Number(dimensions.fps || 0),
          processing_error: processedValidationError
        })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data || row;
    }

    const links = buildMuxPlaybackLinks(playbackId);
    const shouldPublish = row.status === 'published'
      || (row.scheduled_for && new Date(row.scheduled_for).getTime() <= Date.now());
    const nextStatus = shouldPublish ? 'published' : 'ready';
    const publishedAt = shouldPublish ? (row.published_at || new Date().toISOString()) : row.published_at || null;

    const { data, error } = await supabase
      .from('pixe_videos')
      .update({
        mux_asset_id: assetId,
        playback_id: playbackId,
        mux_upload_status: 'ready',
        status: nextStatus,
        duration_ms: dimensions.duration_ms,
        width: dimensions.width,
        height: dimensions.height,
        fps: Number(dimensions.fps || 0),
        thumbnail_url: row.thumbnail_url || links.thumbnail_url,
        preview_url: links.preview_url,
        manifest_url: links.manifest_url,
        processing_error: null,
        published_at: publishedAt
      })
      .eq('id', row.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    await refreshChannelCounters(supabase, row.channel_id);
    return data || row;
  } catch (error) {
    console.warn('Unable to sync Mux video state:', error?.message || error);
    return row;
  }
};

const enforceVideoOwnership = async (supabase, videoId, userId) => {
  const row = await maybeSingle(
    supabase
      .from('pixe_videos')
      .select('*')
      .eq('id', videoId)
      .eq('creator_user_id', userId)
  );
  return row || null;
};

const loadCommentWithVideo = async (supabase, commentId) => {
  const comment = await maybeSingle(
    supabase
      .from('pixe_comments')
      .select('*')
      .eq('id', commentId)
  );
  if (!comment) return null;

  const video = await maybeSingle(
    supabase
      .from('pixe_videos')
      .select('*')
      .eq('id', comment.video_id)
  );
  if (!video) return null;

  return { comment, video };
};

const loadCommentReportSummary = async (supabase, commentIds) => {
  const ids = Array.isArray(commentIds) ? commentIds.filter(Boolean) : [];
  if (ids.length === 0) return new Map();

  const reports = await readRowsOrEmpty(
    supabase
      .from('pixe_comment_reports')
      .select('*')
      .in('comment_id', ids)
      .order('created_at', { ascending: false })
  );

  const grouped = new Map();
  reports.forEach((report) => {
    if (!grouped.has(report.comment_id)) {
      grouped.set(report.comment_id, {
        report_count: 0,
        reasons: [],
        review_status: safeString(report.review_status || 'pending').trim() || 'pending',
        latest_reported_at: report.created_at || null
      });
    }
    const entry = grouped.get(report.comment_id);
    entry.report_count += 1;
    if (report.reason && entry.reasons.length < 4 && !entry.reasons.includes(report.reason)) {
      entry.reasons.push(report.reason);
    }
    if (!entry.latest_reported_at || new Date(report.created_at).getTime() > new Date(entry.latest_reported_at).getTime()) {
      entry.latest_reported_at = report.created_at;
    }
    if (entry.review_status !== 'pending' && safeString(report.review_status).trim() === 'pending') {
      entry.review_status = 'pending';
    }
  });

  return grouped;
};

const evaluateReviewSeverity = (signals) => {
  const items = Array.isArray(signals) ? signals : [];
  if (items.some((signal) => safeString(signal?.level).trim() === 'high')) return 'high';
  if (items.some((signal) => safeString(signal?.level).trim() === 'medium')) return 'medium';
  return 'low';
};

const buildModerationSignals = ({ title, caption, transcriptText }) => {
  const content = `${safeString(title)} ${safeString(caption)} ${safeString(transcriptText)}`.toLowerCase();
  const signals = [];

  if (/(kill|murder|shoot|blood|behead|violent|fight club|execution)/.test(content)) {
    signals.push({
      level: 'medium',
      title: 'Possible violence reference',
      body: 'Title, caption, or subtitles contain language often associated with violent content.'
    });
  }

  if (/(porn|nude|sex|nsfw|onlyfans|explicit|adult)/.test(content)) {
    signals.push({
      level: 'high',
      title: 'Possible adult-content wording',
      body: 'Language in the metadata or transcript may require age-gating or manual review.'
    });
  }

  if (/(hate|slur|racist|terror|bomb|suicide)/.test(content)) {
    signals.push({
      level: 'high',
      title: 'Sensitive safety keyword',
      body: 'This clip includes language that should be reviewed before it is pushed broadly.'
    });
  }

  if (signals.length === 0) {
    signals.push({
      level: 'low',
      title: 'No major moderation keywords found',
      body: 'Pixe did not detect common adult, hate, or violence markers in the current text surfaces.'
    });
  }

  return signals;
};

const buildCopyrightSignals = ({ title, caption, hashtags, transcriptText, duplicateCandidates }) => {
  const source = `${safeString(title)} ${safeString(caption)} ${safeString(transcriptText)} ${Array.isArray(hashtags) ? hashtags.join(' ') : ''}`.toLowerCase();
  const signals = [];

  if (/(official music video|full movie|movie clip|episode|trailer|lyrics|netflix|disney|warner|universal|sony)/.test(source)) {
    signals.push({
      level: 'high',
      title: 'Possible copyrighted source',
      body: 'The metadata or transcript mentions studio, label, trailer, or full-program language that usually needs rights clearance.'
    });
  }

  if (/(cover|remix|reupload|screen record|screenrecord|fan edit|scene pack|edit audio)/.test(source)) {
    signals.push({
      level: 'medium',
      title: 'Derivative-content wording',
      body: 'This clip reads like edited or reused source material. Review clip and soundtrack ownership before publishing.'
    });
  }

  duplicateCandidates
    .filter((candidate) => Number(candidate.score || 0) >= 0.6)
    .slice(0, 3)
    .forEach((candidate) => {
      signals.push({
        level: Number(candidate.score || 0) >= 0.82 ? 'high' : 'medium',
        title: `Possible duplicate of "${candidate.title || 'another clip'}"`,
        body: `Pixe found unusually similar metadata and timing against another video (${Math.round(Number(candidate.score || 0) * 100)}% similarity).`
      });
    });

  if (signals.length === 0) {
    signals.push({
      level: 'low',
      title: 'No major rights matches found',
      body: 'Pixe did not find common studio wording or near-duplicate metadata in the current comparison window.'
    });
  }

  return signals;
};

const loadPotentialDuplicateCandidates = async (supabase, video, transcriptText = '') => {
  const compareText = buildVideoFingerprint({
    title: video.title,
    caption: video.caption,
    hashtags: Array.isArray(video.hashtags) ? video.hashtags : []
  });
  const baseTokens = tokenizeComparableText(`${compareText} ${transcriptText}`);
  const durationMs = Number(video.duration_ms || 0);
  const rows = await readRows(
    supabase
      .from('pixe_videos')
      .select('id,title,caption,hashtags,duration_ms,width,height,source_size_bytes,creator_user_id,channel_id,published_at,created_at')
      .neq('id', video.id)
      .in('status', ['ready', 'published'])
      .order('created_at', { ascending: false })
      .limit(120)
  );

  return rows
    .filter((candidate) => candidate.creator_user_id !== video.creator_user_id)
    .map((candidate) => {
      const candidateTokens = tokenizeComparableText(buildVideoFingerprint(candidate));
      const tokenScore = calculateTokenOverlap(baseTokens, candidateTokens);
      const durationDelta = Math.abs(Number(candidate.duration_ms || 0) - durationMs);
      const durationScore = durationMs > 0 ? Math.max(0, 1 - (durationDelta / Math.max(durationMs, 1))) : 0;
      const geometryScore = (
        Number(candidate.width || 0) === Number(video.width || 0)
        && Number(candidate.height || 0) === Number(video.height || 0)
      ) ? 1 : 0;
      const sizeScore = (
        Number(candidate.source_size_bytes || 0) > 0
        && Number(candidate.source_size_bytes || 0) === Number(video.source_size_bytes || 0)
      ) ? 0.75 : 0;
      const score = Number(((tokenScore * 0.58) + (durationScore * 0.22) + (geometryScore * 0.12) + (sizeScore * 0.08)).toFixed(3));
      return {
        id: candidate.id,
        title: candidate.title || '',
        created_at: candidate.created_at,
        score
      };
    })
    .filter((candidate) => candidate.score >= 0.45)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
};

const upsertVideoReview = async ({ supabase, videoId, reviewType, signals, reviewerNote = '', reviewedBy = null, existing = null }) => {
  const severity = evaluateReviewSeverity(signals);
  const status = severity === 'high'
    ? 'needs_review'
    : severity === 'medium'
      ? 'needs_review'
      : 'clean';
  const summary = signals[0]?.title || 'Review updated';

  const payload = {
    video_id: videoId,
    review_type: reviewType,
    status,
    severity,
    summary,
    signals,
    reviewer_note: reviewerNote || existing?.reviewer_note || null,
    reviewed_at: reviewedBy ? new Date().toISOString() : existing?.reviewed_at || null,
    reviewed_by: reviewedBy || existing?.reviewed_by || null
  };

  const { data, error } = await supabase
    .from('pixe_video_reviews')
    .upsert(payload, { onConflict: 'video_id,review_type' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const loadVideoReviewBundle = async ({ supabase, video, subtitle }) => {
  const subtitleText = safeString(subtitle?.transcript_text || '').trim();
  const duplicateCandidates = await loadPotentialDuplicateCandidates(supabase, video, subtitleText);
  const copyrightSignals = buildCopyrightSignals({
    title: video.title,
    caption: video.caption,
    hashtags: Array.isArray(video.hashtags) ? video.hashtags : [],
    transcriptText: subtitleText,
    duplicateCandidates
  });
  const moderationSignals = buildModerationSignals({
    title: video.title,
    caption: video.caption,
    transcriptText: subtitleText
  });

  const existingRows = await readRowsOrEmpty(
    supabase
      .from('pixe_video_reviews')
      .select('*')
      .eq('video_id', video.id)
  );
  const existingByType = new Map(existingRows.map((row) => [row.review_type, row]));

  const [copyrightReview, moderationReview] = await Promise.all([
    upsertVideoReview({
      supabase,
      videoId: video.id,
      reviewType: 'copyright',
      signals: copyrightSignals,
      existing: existingByType.get('copyright') || null
    }),
    upsertVideoReview({
      supabase,
      videoId: video.id,
      reviewType: 'moderation',
      signals: moderationSignals,
      existing: existingByType.get('moderation') || null
    })
  ]);

  return {
    copyright: {
      ...(copyrightReview || {}),
      duplicate_candidates: duplicateCandidates
    },
    moderation: moderationReview || null
  };
};

const enforceCommentOwnership = async (supabase, commentId, ownerUserId) => {
  const comment = await maybeSingle(
    supabase
      .from('pixe_comments')
      .select('*')
      .eq('id', commentId)
  );
  if (!comment) return null;

  const video = await maybeSingle(
    supabase
      .from('pixe_videos')
      .select('id,creator_user_id,channel_id')
      .eq('id', comment.video_id)
  );
  if (!video || video.creator_user_id !== ownerUserId) {
    return null;
  }
  return { comment, video };
};

const recalculateVideoCommentCount = async (supabase, videoId) => {
  if (!videoId) return;
  const comments = await readRows(
    supabase
      .from('pixe_comments')
      .select('id')
      .eq('video_id', videoId)
      .eq('status', 'active')
  );
  const { error } = await supabase
    .from('pixe_videos')
    .update({ comment_count: comments.length })
    .eq('id', videoId);
  if (error) throw error;
};

const upsertHourlyStats = async (supabase, videoId, eventTime, delta) => {
  const bucketStart = getHourBucketStart(eventTime);
  const current = await maybeSingle(
    supabase
      .from('pixe_video_stats_hourly')
      .select('*')
      .eq('video_id', videoId)
      .eq('bucket_start', bucketStart)
  );

  const payload = current
    ? {
      impressions: Number(current.impressions || 0) + Number(delta.impressions || 0),
      views_3s: Number(current.views_3s || 0) + Number(delta.views_3s || 0),
      views_50: Number(current.views_50 || 0) + Number(delta.views_50 || 0),
      views_95: Number(current.views_95 || 0) + Number(delta.views_95 || 0),
      completions: Number(current.completions || 0) + Number(delta.completions || 0),
      qualified_views: Number(current.qualified_views || 0) + Number(delta.qualified_views || 0),
      watch_time_ms: Number(current.watch_time_ms || 0) + Number(delta.watch_time_ms || 0),
      likes: Number(current.likes || 0) + Number(delta.likes || 0),
      comments: Number(current.comments || 0) + Number(delta.comments || 0),
      saves: Number(current.saves || 0) + Number(delta.saves || 0),
      shares: Number(current.shares || 0) + Number(delta.shares || 0),
      product_clicks: Number(current.product_clicks || 0) + Number(delta.product_clicks || 0),
      new_subscribers: Number(current.new_subscribers || 0) + Number(delta.new_subscribers || 0)
    }
    : {
      video_id: videoId,
      bucket_start: bucketStart,
      ...delta
    };

  const query = current
    ? supabase.from('pixe_video_stats_hourly').update(payload).eq('id', current.id)
    : supabase.from('pixe_video_stats_hourly').insert(payload);
  const { error } = await query;
  if (error) throw error;
};

const upsertDailyStats = async (supabase, videoId, eventTime, delta) => {
  const bucketDate = getDayBucket(eventTime);
  const current = await maybeSingle(
    supabase
      .from('pixe_video_stats_daily')
      .select('*')
      .eq('video_id', videoId)
      .eq('bucket_date', bucketDate)
  );

  const payload = current
    ? {
      impressions: Number(current.impressions || 0) + Number(delta.impressions || 0),
      views_3s: Number(current.views_3s || 0) + Number(delta.views_3s || 0),
      views_50: Number(current.views_50 || 0) + Number(delta.views_50 || 0),
      views_95: Number(current.views_95 || 0) + Number(delta.views_95 || 0),
      completions: Number(current.completions || 0) + Number(delta.completions || 0),
      qualified_views: Number(current.qualified_views || 0) + Number(delta.qualified_views || 0),
      watch_time_ms: Number(current.watch_time_ms || 0) + Number(delta.watch_time_ms || 0),
      likes: Number(current.likes || 0) + Number(delta.likes || 0),
      comments: Number(current.comments || 0) + Number(delta.comments || 0),
      saves: Number(current.saves || 0) + Number(delta.saves || 0),
      shares: Number(current.shares || 0) + Number(delta.shares || 0),
      product_clicks: Number(current.product_clicks || 0) + Number(delta.product_clicks || 0),
      new_subscribers: Number(current.new_subscribers || 0) + Number(delta.new_subscribers || 0)
    }
    : {
      video_id: videoId,
      bucket_date: bucketDate,
      ...delta
    };

  const query = current
    ? supabase.from('pixe_video_stats_daily').update(payload).eq('id', current.id)
    : supabase.from('pixe_video_stats_daily').insert(payload);
  const { error } = await query;
  if (error) throw error;
};

const ACTIVITY_RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null
};

const parseActivityRange = (value) => {
  const normalized = safeString(value).trim().toLowerCase();
  if (normalized === '7d' || normalized === '30d' || normalized === '90d' || normalized === 'all') {
    return normalized;
  }
  return '30d';
};

const resolveActivityRangeDate = (range) => {
  if (!ACTIVITY_RANGE_DAYS[range]) return null;
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - (ACTIVITY_RANGE_DAYS[range] - 1));
  return next.toISOString().slice(0, 10);
};

const resolveActivityRangeTimestamp = (range) => {
  const bucketDate = resolveActivityRangeDate(range);
  return bucketDate ? `${bucketDate}T00:00:00.000Z` : null;
};

const upsertViewerDailyActivity = async (supabase, userId, eventTime, delta) => {
  if (!userId) return;
  const bucketDate = getDayBucket(eventTime);
  const current = await maybeSingleOrNull(
    supabase
      .from('pixe_user_daily_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('bucket_date', bucketDate)
  );

  const payload = current
    ? {
      watched_count: Number(current.watched_count || 0) + Number(delta.watched_count || 0),
      watch_time_ms: Number(current.watch_time_ms || 0) + Number(delta.watch_time_ms || 0),
      liked_count: Number(current.liked_count || 0) + Number(delta.liked_count || 0),
      commented_count: Number(current.commented_count || 0) + Number(delta.commented_count || 0),
      saved_count: Number(current.saved_count || 0) + Number(delta.saved_count || 0)
    }
    : {
      user_id: userId,
      bucket_date: bucketDate,
      watched_count: Number(delta.watched_count || 0),
      watch_time_ms: Number(delta.watch_time_ms || 0),
      liked_count: Number(delta.liked_count || 0),
      commented_count: Number(delta.commented_count || 0),
      saved_count: Number(delta.saved_count || 0)
    };

  const query = current
    ? supabase.from('pixe_user_daily_activity').update(payload).eq('id', current.id)
    : supabase.from('pixe_user_daily_activity').insert(payload);
  const { error } = await query;
  if (error && !isMissingRelationError(error)) throw error;
};

const upsertViewerVideoActivity = async (supabase, userId, videoId, {
  eventTime,
  watchedCount = 0,
  watchTimeMs = 0,
  completedCount = 0,
  likedState,
  savedState,
  commentBody
}) => {
  if (!userId || !videoId) return;
  const current = await maybeSingleOrNull(
    supabase
      .from('pixe_user_video_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
  );

  const touchWatch = watchedCount > 0 || watchTimeMs > 0 || completedCount > 0;
  const payload = current
    ? {
      first_watched_at: current.first_watched_at || (touchWatch ? eventTime : null),
      last_watched_at: touchWatch ? eventTime : current.last_watched_at,
      view_count: Number(current.view_count || 0) + Number(watchedCount || 0),
      completed_count: Number(current.completed_count || 0) + Number(completedCount || 0),
      watch_time_ms: Number(current.watch_time_ms || 0) + Number(watchTimeMs || 0),
      liked: likedState === undefined ? Boolean(current.liked) : Boolean(likedState),
      liked_at: likedState === undefined ? current.liked_at : (likedState ? eventTime : null),
      saved: savedState === undefined ? Boolean(current.saved) : Boolean(savedState),
      saved_at: savedState === undefined ? current.saved_at : (savedState ? eventTime : null),
      comment_count: Number(current.comment_count || 0) + (commentBody ? 1 : 0),
      last_commented_at: commentBody ? eventTime : current.last_commented_at,
      last_comment_excerpt: commentBody ? safeString(commentBody).trim().slice(0, 220) : (current.last_comment_excerpt || '')
    }
    : {
      user_id: userId,
      video_id: videoId,
      first_watched_at: touchWatch ? eventTime : null,
      last_watched_at: touchWatch ? eventTime : null,
      view_count: Number(watchedCount || 0),
      completed_count: Number(completedCount || 0),
      watch_time_ms: Number(watchTimeMs || 0),
      liked: Boolean(likedState),
      liked_at: likedState ? eventTime : null,
      saved: Boolean(savedState),
      saved_at: savedState ? eventTime : null,
      comment_count: commentBody ? 1 : 0,
      last_commented_at: commentBody ? eventTime : null,
      last_comment_excerpt: commentBody ? safeString(commentBody).trim().slice(0, 220) : ''
    };

  const query = current
    ? supabase.from('pixe_user_video_activity').update(payload).eq('id', current.id)
    : supabase.from('pixe_user_video_activity').insert(payload);
  const { error } = await query;
  if (error && !isMissingRelationError(error)) throw error;
};

const applyEventMetrics = async ({ supabase, videoRow, eventName, eventTime, watchTimeMs = 0 }) => {
  const videoDelta = buildVideoMetricDelta(eventName, watchTimeMs);
  const statsDelta = buildStatsDelta(eventName, watchTimeMs);
  const currentVideo = await maybeSingle(
    supabase
      .from('pixe_videos')
      .select('*')
      .eq('id', videoRow.id)
  );
  if (!currentVideo) return;

  const { error } = await supabase
    .from('pixe_videos')
    .update({
      impression_count: Number(currentVideo.impression_count || 0) + Number(videoDelta.impression_count || 0),
      qualified_view_count: Number(currentVideo.qualified_view_count || 0) + Number(videoDelta.qualified_view_count || 0),
      completion_count: Number(currentVideo.completion_count || 0) + Number(videoDelta.completion_count || 0),
      share_count: Number(currentVideo.share_count || 0) + Number(videoDelta.share_count || 0),
      product_click_count: Number(currentVideo.product_click_count || 0) + Number(videoDelta.product_click_count || 0),
      watch_time_total_ms: Number(currentVideo.watch_time_total_ms || 0) + Number(videoDelta.watch_time_total_ms || 0)
    })
    .eq('id', currentVideo.id);
  if (error) throw error;

  await Promise.all([
    upsertHourlyStats(supabase, currentVideo.id, eventTime, statsDelta),
    upsertDailyStats(supabase, currentVideo.id, eventTime, statsDelta)
  ]);
  await refreshChannelCounters(supabase, currentVideo.channel_id);
};

const getVideoAgeHours = (row) => {
  const publishedAtMs = new Date(row?.published_at || row?.created_at || Date.now()).getTime();
  if (!Number.isFinite(publishedAtMs)) return 9999;
  return Math.max((Date.now() - publishedAtMs) / (1000 * 60 * 60), 0.25);
};

const getWatchDepthRatio = (row) => {
  const qualifiedViews = Number(row?.qualified_view_count || 0);
  const durationMs = Math.max(Number(row?.duration_ms || 0), 1);
  if (!qualifiedViews) return 0;
  const averageViewDurationMs = Number(row?.watch_time_total_ms || 0) / qualifiedViews;
  return clamp(averageViewDurationMs / durationMs, 0, 1.25);
};

const getInteractionRate = (row) => {
  const base = Math.max(
    Number(row?.impression_count || 0),
    Number(row?.qualified_view_count || 0),
    1
  );
  const weightedInteractions = (
    Number(row?.like_count || 0) * 1
    + Number(row?.comment_count || 0) * 1.8
    + Number(row?.save_count || 0) * 2.5
    + Number(row?.share_count || 0) * 3
    + Number(row?.product_click_count || 0) * 1.4
  );
  return weightedInteractions / base;
};

const getFeedScore = (row, mode) => {
  const freshness = 1 / Math.pow(getVideoAgeHours(row) + 2, mode === 'following' ? 0.5 : 0.72);
  const watchDepth = getWatchDepthRatio(row);
  const completionRate = clamp(calculateCompletionRate(row) / 100, 0, 1.25);
  const interactionRate = getInteractionRate(row);
  const qualifiedViewSignal = Math.log1p(Number(row?.qualified_view_count || 0));
  const saveShareSignal = Math.log1p((Number(row?.save_count || 0) * 2) + (Number(row?.share_count || 0) * 3));
  const commerceSignal = Math.log1p(Number(row?.product_click_count || 0) + Number(row?.product_revenue_amount || 0));

  if (mode === 'following') {
    return (
      (freshness * 4.5)
      + (watchDepth * 2)
      + (completionRate * 1.8)
      + (interactionRate * 130)
      + (qualifiedViewSignal * 1.1)
      + (saveShareSignal * 0.75)
    );
  }

  if (mode === 'explore') {
    return (
      (freshness * 2.5)
      + (watchDepth * 2.3)
      + (completionRate * 2.1)
      + (interactionRate * 165)
      + (qualifiedViewSignal * 1.8)
      + (saveShareSignal * 1.1)
      + (commerceSignal * 0.8)
    );
  }

  return (
    (freshness * 3.2)
    + (watchDepth * 2.6)
    + (completionRate * 2.4)
    + (interactionRate * 155)
    + (qualifiedViewSignal * 1.35)
    + (saveShareSignal * 0.9)
    + (commerceSignal * 0.55)
  );
};

const rankFeedRows = (rows, mode) => [...rows].sort((left, right) => {
  const scoreDelta = getFeedScore(right, mode) - getFeedScore(left, mode);
  if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;

  const rightPublishedAt = new Date(right?.published_at || right?.created_at || 0).getTime();
  const leftPublishedAt = new Date(left?.published_at || left?.created_at || 0).getTime();
  if (rightPublishedAt !== leftPublishedAt) return rightPublishedAt - leftPublishedAt;

  return safeString(right?.id).localeCompare(safeString(left?.id));
});

const loadFeedRows = async ({
  supabase,
  mode,
  viewerContext,
  cursor,
  limit
}) => {
  await releaseDueScheduledVideos(supabase);

  const safeLimit = parsePositiveInt(limit, 8, 1, MAX_FEED_LIMIT);
  let followedChannelIds = [];

  if (mode === 'following') {
    if (!viewerContext?.user?.id) {
      const error = new Error('You must be signed in to view Following.');
      error.status = 401;
      throw error;
    }
    const subscriptions = await readRows(
      supabase
        .from('pixe_subscriptions')
        .select('channel_id')
        .eq('user_id', viewerContext.user.id)
    );
    followedChannelIds = subscriptions.map((row) => row.channel_id).filter(Boolean);
    if (followedChannelIds.length === 0) {
      return { rows: [], nextCursor: null, hasMore: false };
    }
  }

  let query = supabase
    .from('pixe_videos')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(safeLimit + 1);

  if (mode === 'following') {
    query = query.in('channel_id', followedChannelIds);
    query = query.in('visibility', ['public', 'followers']);
  } else {
    query = query.eq('visibility', 'public');
  }

  if (cursor) {
    query = query.lt('published_at', cursor);
  }

  const rows = await readRows(query);
  const hasMore = rows.length > safeLimit;
  const recentWindowRows = hasMore ? rows.slice(0, safeLimit) : rows;
  const selectedRows = rankFeedRows(recentWindowRows, mode);
  const nextCursor = hasMore ? createCursor(recentWindowRows[recentWindowRows.length - 1]?.published_at) : null;

  return {
    rows: selectedRows,
    nextCursor,
    hasMore
  };
};

const loadVideoComments = async (supabase, videoId, { includeHidden = false, viewerUserId = null } = {}) => {
  let query = supabase
    .from('pixe_comments')
    .select('*')
    .eq('video_id', videoId)
    .neq('status', 'deleted');

  if (!includeHidden) {
    query = query.eq('status', 'active');
  }

  const rows = await readRows(
    query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
  );

  const commentIds = rows.map((row) => row.id);
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const [users, commentLikes, viewerCommentLikes, viewerCommentReports] = await Promise.all([
    userIds.length > 0
      ? readRows(
        supabase
          .from('users')
          .select('id,name,avatar_url')
          .in('id', userIds)
      )
      : Promise.resolve([]),
    commentIds.length > 0
      ? readRowsOrEmpty(
        supabase
          .from('pixe_comment_likes')
          .select('comment_id')
          .in('comment_id', commentIds)
      )
      : Promise.resolve([]),
    viewerUserId && commentIds.length > 0
      ? readRowsOrEmpty(
        supabase
          .from('pixe_comment_likes')
          .select('comment_id')
          .eq('user_id', viewerUserId)
          .in('comment_id', commentIds)
      )
      : Promise.resolve([]),
    viewerUserId && commentIds.length > 0
      ? readRowsOrEmpty(
        supabase
          .from('pixe_comment_reports')
          .select('comment_id')
          .eq('user_id', viewerUserId)
          .in('comment_id', commentIds)
      )
      : Promise.resolve([])
  ]);
  const usersById = new Map(users.map((row) => [row.id, row]));
  const likeCountByCommentId = new Map();
  commentLikes.forEach((row) => {
    const commentId = safeString(row?.comment_id).trim();
    if (!commentId) return;
    likeCountByCommentId.set(commentId, Number(likeCountByCommentId.get(commentId) || 0) + 1);
  });
  const likedCommentIds = new Set(viewerCommentLikes.map((row) => safeString(row?.comment_id).trim()).filter(Boolean));
  const reportedCommentIds = new Set(viewerCommentReports.map((row) => safeString(row?.comment_id).trim()).filter(Boolean));
  const visibleRows = (!includeHidden && reportedCommentIds.size > 0)
    ? rows.filter((row) => !reportedCommentIds.has(row.id))
    : rows;

  return visibleRows.map((row) => ({
    id: row.id,
    video_id: row.video_id,
    parent_comment_id: row.parent_comment_id || null,
    body: row.body,
    status: row.status,
    is_pinned: Boolean(row.is_pinned),
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: usersById.has(row.user_id)
      ? {
        id: row.user_id,
        name: usersById.get(row.user_id).name || 'Viewer',
        avatar_url: usersById.get(row.user_id).avatar_url || '/icons/urbanprime.svg'
      }
      : null,
    metrics: {
      likes: Number(likeCountByCommentId.get(row.id) || 0)
    },
    viewer_state: {
      liked: likedCommentIds.has(row.id),
      reported: reportedCommentIds.has(row.id)
    }
  }));
};

const fetchMuxSummary = async (filters, timeframe = DEFAULT_ANALYTICS_TIMEFRAME) => {
  if (!hasMuxDataConfig()) return null;

  const pairs = await Promise.all(
    MUX_QOE_METRICS.map(async (metric) => {
      try {
        const result = await fetchMuxOverallMetric({
          metricId: metric.key,
          measurement: metric.measurement,
          filters,
          timeframe
        });
        return [metric.key, result ? result.value : null];
      } catch {
        return [metric.key, null];
      }
    })
  );

  return Object.fromEntries(pairs);
};

export default function registerPixeRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  resolveAdminContext,
  createRateLimiter,
  writeAuditLog,
  scheduleEmailForNotifications,
  uploadsRoot = ''
}) {
  const optionalAuth = createOptionalAuthMiddleware(requireAuth);
  const buildLimiter = typeof createRateLimiter === 'function' ? createRateLimiter : createNoopRateLimiter;
  const localUploadSessions = new Map();
  const hasLocalUploadFallback = Boolean(safeString(uploadsRoot).trim());
  const isLocalStudioRequest = (req) => {
    const clientIp = safeString(req.ip || req.socket?.remoteAddress || '').trim().toLowerCase();
    const origin = safeString(req.headers.origin || '').trim().toLowerCase();
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].some((value) =>
      clientIp.includes(value) || origin.includes(value)
    );
  };
  const uploadSessionRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 48, namespace: 'pixe-upload', skip: isLocalStudioRequest });
  const publishRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 48, namespace: 'pixe-publish', skip: isLocalStudioRequest });
  const commentRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 40, namespace: 'pixe-comment' });
  const searchRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 90, namespace: 'pixe-search' });
  const engagementRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 80, namespace: 'pixe-engagement' });
  const shareRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 40, namespace: 'pixe-share' });
  const eventBatchRateLimiter = buildLimiter({ windowMs: 60_000, maxRequests: 240, namespace: 'pixe-events' });
  const pruneLocalUploadSessions = () => {
    const now = Date.now();
    for (const [token, session] of localUploadSessions.entries()) {
      if (!session || Number(session.expiresAt || 0) <= now) {
        localUploadSessions.delete(token);
      }
    }
  };

  app.post('/pixe/videos', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const channel = await ensureCreatorChannel(supabase, context);
      const title = safeString(req.body?.title).trim().slice(0, MAX_TITLE_LENGTH);
      const caption = safeString(req.body?.caption).trim().slice(0, MAX_CAPTION_LENGTH);
      const visibility = normalizeVisibility(req.body?.visibility);
      const allowComments = parseBoolean(req.body?.allow_comments, true);
      const scheduledFor = normalizeIsoTimestamp(req.body?.scheduled_for);
      const hashtags = normalizeTags(req.body?.hashtags);

      const { data, error } = await supabase
        .from('pixe_videos')
        .insert({
          channel_id: channel.id,
          creator_user_id: context.user.id,
          title,
          caption,
          visibility,
          allow_comments: allowComments,
          scheduled_for: scheduledFor,
          hashtags
        })
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if ('product_tags' in req.body) {
        await replaceProductTags(supabase, data.id, req.body?.product_tags);
      }

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.video.create',
          entityType: 'pixe_video',
          entityId: data.id,
          details: { channel_id: channel.id }
        });
      }

      const latest = await enforceVideoOwnership(supabase, data.id, context.user.id);
      const [video] = await hydrateVideos({ supabase, rows: [latest || data], viewerUserId: context.user.id });
      return res.status(201).json({ data: video });
    } catch (error) {
      console.error('Create Pixe video failed:', error);
      return res.status(500).json({ error: 'Unable to create Pixe draft.' });
    }
  });

  app.patch('/pixe/videos/:videoId', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const patch = {};
      if ('title' in req.body) patch.title = safeString(req.body?.title).trim().slice(0, MAX_TITLE_LENGTH);
      if ('caption' in req.body) patch.caption = safeString(req.body?.caption).trim().slice(0, MAX_CAPTION_LENGTH);
      if ('visibility' in req.body) patch.visibility = normalizeVisibility(req.body?.visibility);
      if ('allow_comments' in req.body) patch.allow_comments = parseBoolean(req.body?.allow_comments, true);
      if ('scheduled_for' in req.body) patch.scheduled_for = normalizeIsoTimestamp(req.body?.scheduled_for);
      if ('hashtags' in req.body) patch.hashtags = normalizeTags(req.body?.hashtags);
      if ('commerce_links' in req.body) patch.commerce_links = normalizeCommerceLinks(req.body?.commerce_links);
      if ('thumbnail_url' in req.body) patch.thumbnail_url = safeString(req.body?.thumbnail_url).trim() || null;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase
          .from('pixe_videos')
          .update(patch)
          .eq('id', video.id);
        if (error) throw error;
      }

      if ('product_tags' in req.body) {
        await replaceProductTags(supabase, video.id, req.body?.product_tags);
      }

      const updated = await enforceVideoOwnership(supabase, video.id, context.user.id);
      const [hydrated] = await hydrateVideos({ supabase, rows: [updated], viewerUserId: context.user.id });
      return res.json({ data: hydrated });
    } catch (error) {
      console.error('Update Pixe video failed:', error);
      return res.status(500).json({ error: 'Unable to update Pixe video.' });
    }
  });

  const handleLocalPixeUpload = async (req, res) => {
    try {
      if (!hasLocalUploadFallback) {
        return res.status(503).json({ error: 'Local upload fallback is not configured.' });
      }

      pruneLocalUploadSessions();
      const token = safeString(req.params.token).trim();
      const session = localUploadSessions.get(token);
      if (!session) {
        return res.status(410).json({ error: 'Upload session expired. Request a new upload.' });
      }

      const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      if (!payload.length) {
        return res.status(400).json({ error: 'Upload body is empty.' });
      }

      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', session.videoId)
      );
      if (!video) {
        localUploadSessions.delete(token);
        return res.status(404).json({ error: 'Video draft not found.' });
      }

      const previousLocalFiles = [
        deriveLocalUploadPath(uploadsRoot, video.manifest_url),
        deriveLocalUploadPath(uploadsRoot, video.preview_url)
      ].filter(Boolean);

      const extension = getVideoExtension(session.fileName, session.mimeType);
      const relativePath = ['pixe', 'videos', session.userId, `${sanitizeUploadStem(session.fileName)}-${randomUUID()}.${extension}`].join('/');
      const absolutePath = resolveWithinDirectory(uploadsRoot, relativePath);
      if (!absolutePath) {
        throw new Error('Unable to resolve upload target path.');
      }

      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      await fs.promises.writeFile(absolutePath, payload);

      const baseUrl = buildRequestBaseUrl(req);
      const publicUrl = `${baseUrl}/uploads/${relativePath}`;

      const { error } = await supabase
        .from('pixe_videos')
        .update({
          mux_upload_id: session.uploadId,
          mux_upload_status: 'local_ready',
          status: 'ready',
          manifest_url: publicUrl,
          preview_url: publicUrl,
          playback_id: null,
          source_size_bytes: payload.length || session.sizeBytes,
          duration_ms: session.durationMs,
          width: session.width,
          height: session.height,
          fps: Number(video.fps || 30),
          processing_error: null
        })
        .eq('id', video.id);
      if (error) throw error;

      localUploadSessions.delete(token);
      await Promise.all(previousLocalFiles.map((filePath) => removeFileIfPresent(filePath)));
      await refreshChannelCounters(supabase, video.channel_id);

      return res.status(201).json({
        data: {
          video_id: video.id,
          status: 'ready',
          upload_id: session.uploadId,
          manifest_url: publicUrl
        }
      });
    } catch (error) {
      console.error('Complete local Pixe upload failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to finalize local upload.' });
    }
  };

  app.put('/pixe/uploads/local/:token', express.raw({ type: '*/*', limit: '160mb' }), handleLocalPixeUpload);
  app.post('/pixe/uploads/local/:token', express.raw({ type: '*/*', limit: '160mb' }), handleLocalPixeUpload);

  app.post('/pixe/uploads/video-session', requireAuth, uploadSessionRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const videoId = safeString(req.body?.video_id).trim();
      const video = await enforceVideoOwnership(supabase, videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video draft not found.' });
      }

      if (video.status === 'uploading' || video.status === 'processing') {
        return res.status(409).json({ error: 'This video already has an upload in progress.' });
      }

      if ((video.status === 'ready' || video.status === 'published') && (video.playback_id || video.manifest_url)) {
        return res.status(409).json({ error: 'This video already has uploaded media attached.' });
      }

      const fileName = safeString(req.body?.file_name).trim() || 'pixe-video.mp4';
      const mimeType = safeString(req.body?.mime_type).trim() || 'video/mp4';
      const sizeBytes = Math.round(parseNumber(req.body?.size_bytes, 0));
      const durationMs = Math.round(parseNumber(req.body?.duration_ms, 0));
      const width = Math.round(parseNumber(req.body?.width, 0));
      const height = Math.round(parseNumber(req.body?.height, 0));
      const validationError = validateUploadMetadata({ sizeBytes, durationMs, width, height });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const normalizedGeometry = normalizeUploadGeometry({ width, height });

      if (hasMuxVideoConfig()) {
        const origin = safeString(req.headers.origin || req.body?.origin || '*').trim() || '*';
        const upload = await createMuxDirectUpload({
          corsOrigin: origin,
          passthrough: video.id,
          title: video.title || fileName,
          creatorId: context.user.id,
          externalId: video.id,
          generatedSubtitles: true
        });

        const { error } = await supabase
          .from('pixe_videos')
          .update({
            mux_upload_id: upload.id,
            mux_upload_status: upload.status || 'waiting',
            status: 'uploading',
            source_size_bytes: sizeBytes,
            duration_ms: durationMs,
            width: normalizedGeometry.width,
            height: normalizedGeometry.height,
            processing_error: null
          })
          .eq('id', video.id);
        if (error) throw error;

        return res.status(201).json({
          data: {
            video_id: video.id,
            upload_id: upload.id,
            upload_url: upload.url,
            timeout: upload.timeout,
            status: upload.status,
            file_name: fileName,
            mime_type: mimeType
          }
        });
      }

      if (!hasLocalUploadFallback) {
        return res.status(503).json({ error: 'Mux video upload is not configured.' });
      }

      pruneLocalUploadSessions();
      const token = randomUUID();
      const uploadId = `local-${token}`;
      localUploadSessions.set(token, {
        token,
        uploadId,
        videoId: video.id,
        userId: context.user.id,
        fileName,
        mimeType,
        sizeBytes,
        durationMs,
        width: normalizedGeometry.width,
        height: normalizedGeometry.height,
        expiresAt: Date.now() + LOCAL_UPLOAD_SESSION_TTL_MS
      });

      const { error } = await supabase
        .from('pixe_videos')
        .update({
          mux_upload_id: uploadId,
          mux_upload_status: 'local_waiting',
          status: 'uploading',
          source_size_bytes: sizeBytes,
          duration_ms: durationMs,
          width: normalizedGeometry.width,
          height: normalizedGeometry.height,
          processing_error: null
        })
        .eq('id', video.id);
      if (error) throw error;

      const baseUrl = buildRequestBaseUrl(req);
      const uploadPath = `/pixe/uploads/local/${token}`;
      return res.status(201).json({
        data: {
          video_id: video.id,
          upload_id: uploadId,
          upload_url: baseUrl ? `${baseUrl}${uploadPath}` : uploadPath,
          timeout: Math.round(LOCAL_UPLOAD_SESSION_TTL_MS / 1000),
          status: 'local_waiting',
          file_name: fileName,
          mime_type: mimeType
        }
      });
    } catch (error) {
      console.error('Create Pixe upload session failed:', error);
      const status = Number(error?.status || 500);
      return res.status(status).json({ error: error?.message || 'Unable to create upload session.' });
    }
  });

  app.post('/pixe/videos/:videoId/publish', requireAuth, publishRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      if (video.status !== 'ready' && video.status !== 'published') {
        return res.status(409).json({ error: 'Video processing is not complete yet.' });
      }

      const scheduledFor = normalizeIsoTimestamp(req.body?.scheduled_for || video.scheduled_for);
      const shouldSchedule = scheduledFor && new Date(scheduledFor).getTime() > Date.now();
      const nextStatus = shouldSchedule ? 'ready' : 'published';
      const publishedAt = shouldSchedule ? null : (video.published_at || new Date().toISOString());

      const { error } = await supabase
        .from('pixe_videos')
        .update({
          status: nextStatus,
          scheduled_for: scheduledFor,
          published_at: publishedAt
        })
        .eq('id', video.id);
      if (error) throw error;

      await refreshChannelCounters(supabase, video.channel_id);

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: shouldSchedule ? 'pixe.video.schedule' : 'pixe.video.publish',
          entityType: 'pixe_video',
          entityId: video.id,
          details: { scheduled_for: scheduledFor }
        });
      }

      const updated = await enforceVideoOwnership(supabase, video.id, context.user.id);
      if (!shouldSchedule && nextStatus === 'published' && updated?.creator_user_id) {
        const publishedCount = await readRowsOrEmpty(
          supabase
            .from('pixe_videos')
            .select('id')
            .eq('creator_user_id', updated.creator_user_id)
            .eq('status', 'published')
            .limit(2)
        );
        await insertPixeNotification(supabase, updated.creator_user_id, {
          title: publishedCount.length <= 1 ? 'Your first Pixe is live' : 'Your Pixe is live',
          body: `${updated.title || 'Your clip'} is published and ready to be discovered.`,
          link: `/pixe/watch/${updated.id}`,
          type: 'info'
        }, scheduleEmailForNotifications);
      }
      const [hydrated] = await hydrateVideos({ supabase, rows: [updated], viewerUserId: context.user.id });
      return res.json({ data: hydrated });
    } catch (error) {
      console.error('Publish Pixe video failed:', error);
      return res.status(500).json({ error: 'Unable to publish Pixe video.' });
    }
  });

  app.delete('/pixe/videos/:videoId', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const filesToRemove = Array.from(new Set([
        deriveLocalUploadPath(uploadsRoot, video.manifest_url),
        deriveLocalUploadPath(uploadsRoot, video.preview_url)
      ].filter(Boolean)));

      const { error } = await supabase
        .from('pixe_videos')
        .delete()
        .eq('id', video.id);
      if (error) throw error;

      for (const [token, session] of localUploadSessions.entries()) {
        if (session?.videoId === video.id) {
          localUploadSessions.delete(token);
        }
      }

      await Promise.all(filesToRemove.map((filePath) => removeFileIfPresent(filePath)));
      await refreshChannelCounters(supabase, video.channel_id);

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.video.delete',
          entityType: 'pixe_video',
          entityId: video.id,
          details: { channel_id: video.channel_id }
        });
      }

      return res.json({ data: { id: video.id, deleted: true } });
    } catch (error) {
      console.error('Delete Pixe video failed:', error);
      return res.status(500).json({ error: 'Unable to delete Pixe video.' });
    }
  });

  app.get('/pixe/studio/videos/:videoId/subtitles', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const subtitles = await buildSubtitlePayload({
        supabase,
        video,
        uploadsRoot,
        ownerUserId: context.user.id
      });

      return res.json({ data: subtitles });
    } catch (error) {
      console.error('Load Pixe subtitles failed:', error);
      return res.status(500).json({ error: 'Unable to load subtitles.' });
    }
  });

  app.put('/pixe/studio/videos/:videoId/subtitles', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const existing = await maybeSingleOrNull(
        supabase
          .from('pixe_video_subtitles')
          .select('*')
          .eq('video_id', video.id)
          .eq('language_code', sanitizeSubtitleLanguageCode(req.body?.language_code || 'en'))
      );

      const languageCode = sanitizeSubtitleLanguageCode(req.body?.language_code || existing?.language_code || 'en');
      const name = sanitizeSubtitleName(req.body?.name || existing?.name || 'English');
      const transcriptText = normalizeMultilineText(
        req.body?.transcript_text || transcriptFromVtt(req.body?.vtt_text || existing?.vtt_text || ''),
        MAX_TRANSCRIPT_TEXT_LENGTH
      );
      const vttText = normalizeSubtitleVtt(
        req.body?.vtt_text
        || existing?.vtt_text
        || buildVttFromTranscript(transcriptText)
      );

      if (!transcriptText && !vttText) {
        return res.status(400).json({ error: 'Subtitle text is required.' });
      }

      const writtenFile = writeSubtitleVttFile({ uploadsRoot, videoId: video.id, languageCode, vttText });
      const publicBaseUrl = getPublicBaseUrl(req);
      let muxTrackId = safeString(existing?.mux_track_id).trim() || null;
      let syncStatus = muxTrackId ? 'edited_local' : 'local';

      if (!muxTrackId && writtenFile && video.mux_asset_id && isPublicBaseUrlMuxReachable(publicBaseUrl)) {
        try {
          const track = await createMuxAssetTrack(video.mux_asset_id, {
            url: `${publicBaseUrl}${writtenFile.publicPath}`,
            type: 'text',
            text_type: 'subtitles',
            language_code: languageCode,
            name,
            passthrough: `pixe:${video.id}:${languageCode}`
          });
          muxTrackId = safeString(track?.id).trim() || null;
          syncStatus = muxTrackId ? 'mux' : syncStatus;
        } catch (muxTrackError) {
          console.warn('Unable to create manual Mux subtitle track, keeping local override only:', muxTrackError?.message || muxTrackError);
        }
      }

      const { data, error } = await supabase
        .from('pixe_video_subtitles')
        .upsert({
          video_id: video.id,
          language_code: languageCode,
          name,
          source: existing?.source === 'generated' ? 'edited' : (existing?.source || 'edited'),
          status: 'ready',
          mux_track_id: muxTrackId,
          transcript_text: transcriptText,
          vtt_text: vttText,
          sync_status: syncStatus,
          last_synced_at: syncStatus === 'mux' ? new Date().toISOString() : existing?.last_synced_at || null,
          created_by: context.user.id
        }, { onConflict: 'video_id,language_code' })
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.subtitle.save',
          entityType: 'pixe_video',
          entityId: video.id,
          details: { language_code: languageCode, mux_track_id: muxTrackId }
        });
      }

      return res.json({
        data: {
          id: data?.id || null,
          video_id: video.id,
          language_code: languageCode,
          name,
          source: data?.source || 'edited',
          status: data?.status || 'ready',
          mux_track_id: muxTrackId,
          transcript_text: transcriptText,
          vtt_text: vttText,
          sync_status: syncStatus,
          subtitle_url: writtenFile ? writtenFile.publicPath : null,
          updated_at: data?.updated_at || new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Save Pixe subtitles failed:', error);
      return res.status(500).json({ error: 'Unable to save subtitles.' });
    }
  });

  app.post('/pixe/studio/videos/:videoId/subtitles/regenerate', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      if (!video.mux_asset_id) {
        return res.status(409).json({ error: 'This video has no Mux asset yet.' });
      }

      const asset = await getMuxAsset(video.mux_asset_id);
      const audioTrack = getMuxPrimaryAudioTrack(asset);
      if (!audioTrack?.id) {
        return res.status(409).json({ error: 'No audio track is available for subtitle generation.' });
      }

      const languageCode = sanitizeSubtitleLanguageCode(req.body?.language_code || 'en');
      const name = sanitizeSubtitleName(req.body?.name || 'English');
      await generateMuxTrackSubtitles({
        assetId: video.mux_asset_id,
        trackId: audioTrack.id,
        generatedSubtitles: [
          {
            language_code: languageCode,
            name,
            passthrough: `pixe-generated:${video.id}:${languageCode}`
          }
        ]
      });

      await supabase
        .from('pixe_video_subtitles')
        .upsert({
          video_id: video.id,
          language_code: languageCode,
          name,
          source: 'generated',
          status: 'generating',
          sync_status: 'mux',
          created_by: context.user.id
        }, { onConflict: 'video_id,language_code' });

      return res.json({
        data: {
          video_id: video.id,
          language_code: languageCode,
          status: 'generating'
        }
      });
    } catch (error) {
      console.error('Regenerate Pixe subtitles failed:', error);
      return res.status(500).json({ error: 'Unable to regenerate subtitles.' });
    }
  });

  app.get('/pixe/studio/videos/:videoId/reviews', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const subtitles = await buildSubtitlePayload({ supabase, video, uploadsRoot, ownerUserId: context.user.id });
      const reviews = await loadVideoReviewBundle({ supabase, video, subtitle: subtitles });
      return res.json({ data: reviews });
    } catch (error) {
      console.error('Load Pixe video reviews failed:', error);
      return res.status(500).json({ error: 'Unable to load video reviews.' });
    }
  });

  app.post('/pixe/studio/videos/:videoId/reviews/refresh', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await enforceVideoOwnership(supabase, req.params.videoId, context.user.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const subtitles = await buildSubtitlePayload({ supabase, video, uploadsRoot, ownerUserId: context.user.id });
      const reviews = await loadVideoReviewBundle({ supabase, video, subtitle: subtitles });
      return res.json({ data: reviews });
    } catch (error) {
      console.error('Refresh Pixe video reviews failed:', error);
      return res.status(500).json({ error: 'Unable to refresh video reviews.' });
    }
  });

  app.get('/pixe/feed', optionalAuth, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const mode = normalizeFeedMode(req.query?.mode);
      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const { rows, nextCursor, hasMore } = await loadFeedRows({
        supabase,
        mode,
        viewerContext,
        cursor,
        limit: req.query?.limit
      });

      const data = await hydrateVideos({
        supabase,
        rows,
        viewerUserId: viewerContext?.user?.id || null
      });

      return res.json({
        data,
        next_cursor: nextCursor,
        has_more: hasMore
      });
    } catch (error) {
      const status = Number(error?.status || 500);
      return res.status(status).json({ error: error?.message || 'Unable to load Pixe feed.' });
    }
  });

  app.get('/pixe/saved', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const limit = parsePositiveInt(req.query?.limit, 18, 1, MAX_FEED_LIMIT);
      let totalCount = 0;
      try {
        const { count, error } = await supabase
          .from('pixe_saved_videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', context.user.id);
        if (error) throw error;
        totalCount = Number(count || 0);
      } catch (countError) {
        if (!isMissingRelationError(countError)) {
          throw countError;
        }
      }
      let savedQuery = supabase
        .from('pixe_saved_videos')
        .select('video_id,created_at')
        .eq('user_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        savedQuery = savedQuery.lt('created_at', cursor);
      }

      const savedRows = await readRows(savedQuery);
      const hasMore = savedRows.length > limit;
      const windowRows = hasMore ? savedRows.slice(0, limit) : savedRows;
      const nextCursor = hasMore ? createCursor(windowRows[windowRows.length - 1]?.created_at || null) : null;
      const videoIds = windowRows.map((row) => row.video_id).filter(Boolean);
      const videoRows = videoIds.length > 0
        ? await readRows(
          supabase
            .from('pixe_videos')
            .select('*')
            .in('id', videoIds)
        )
        : [];
      const videosById = new Map(videoRows.map((row) => [row.id, row]));
      const accessibleRows = [];

      for (const row of windowRows) {
        const video = videosById.get(row.video_id);
        if (!video) continue;
        // Saved clips can disappear or turn private later; keep the saved library clean for the viewer.
        // eslint-disable-next-line no-await-in-loop
        const canAccess = await canViewerAccessVideo({
          supabase,
          video,
          viewerUserId: context.user.id
        });
        if (canAccess) {
          accessibleRows.push(video);
        }
      }

      const hydrated = await hydrateVideos({
        supabase,
        rows: accessibleRows,
        viewerUserId: context.user.id
      });
      const hydratedById = new Map(hydrated.map((row) => [row.id, row]));
      const ordered = windowRows
        .map((row) => hydratedById.get(row.video_id))
        .filter(Boolean);

      return res.json({
        data: ordered,
        next_cursor: nextCursor,
        has_more: hasMore,
        total_count: totalCount
      });
    } catch (error) {
      console.error('Load saved Pixe videos failed:', error);
      return res.status(500).json({ error: 'Unable to load saved videos.' });
    }
  });

  app.get('/pixe/activity/overview', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const range = parseActivityRange(req.query?.range);
      const sinceDate = resolveActivityRangeDate(range);
      const allWatchedRows = await readRowsOrEmpty(
        supabase
          .from('pixe_user_video_activity')
          .select('view_count,watch_time_ms,first_watched_at,completed_count')
          .eq('user_id', context.user.id)
      );
      const dailyQuery = supabase
        .from('pixe_user_daily_activity')
        .select('*')
        .eq('user_id', context.user.id)
        .order('bucket_date', { ascending: true });
      const dailyRows = await readRowsOrEmpty(
        sinceDate ? dailyQuery.gte('bucket_date', sinceDate) : dailyQuery
      );
      const likedRows = await readRowsOrEmpty(
        supabase
          .from('pixe_video_likes')
          .select('id')
          .eq('user_id', context.user.id)
      );
      const commentRows = await readRowsOrEmpty(
        supabase
          .from('pixe_comments')
          .select('id')
          .eq('user_id', context.user.id)
      );
      let savedVideosCount = 0;
      try {
        const { count, error } = await supabase
          .from('pixe_saved_videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', context.user.id);
        if (error) throw error;
        savedVideosCount = Number(count || 0);
      } catch (savedCountError) {
        if (!isMissingRelationError(savedCountError)) {
          throw savedCountError;
        }
      }

      const watchedRows = allWatchedRows.filter((row) => Number(row.view_count || 0) > 0);
      const firstActivityAt = watchedRows
        .map((row) => safeString(row.first_watched_at).trim())
        .filter(Boolean)
        .sort()[0] || null;

      return res.json({
        data: {
          summary: {
            total_watched: sumBy(watchedRows, 'view_count'),
            unique_videos_watched: watchedRows.length,
            liked_videos: likedRows.length,
            saved_videos: savedVideosCount,
            comments_made: commentRows.length,
            watch_time_ms: sumBy(allWatchedRows, 'watch_time_ms'),
            completed_views: sumBy(allWatchedRows, 'completed_count'),
            first_activity_at: firstActivityAt
          },
          daily: dailyRows.map((row) => ({
            bucket_date: row.bucket_date,
            watched_count: Number(row.watched_count || 0),
            watch_time_ms: Number(row.watch_time_ms || 0),
            liked_count: Number(row.liked_count || 0),
            commented_count: Number(row.commented_count || 0),
            saved_count: Number(row.saved_count || 0)
          }))
        }
      });
    } catch (error) {
      console.error('Load Pixe activity overview failed:', error);
      return res.status(500).json({ error: 'Unable to load activity overview.' });
    }
  });

  app.get('/pixe/activity/watched', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const limit = parsePositiveInt(req.query?.limit, 18, 1, MAX_FEED_LIMIT);
      const range = parseActivityRange(req.query?.range);
      const sinceTimestamp = resolveActivityRangeTimestamp(range);

      let query = supabase
        .from('pixe_user_video_activity')
        .select('*')
        .eq('user_id', context.user.id)
        .gt('view_count', 0)
        .order('last_watched_at', { ascending: false })
        .limit(limit + 1);
      if (cursor) {
        query = query.lt('last_watched_at', cursor);
      }
      if (sinceTimestamp) {
        query = query.gte('last_watched_at', sinceTimestamp);
      }

      const rows = await readRowsOrEmpty(query);
      const hasMore = rows.length > limit;
      const windowRows = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? createCursor(windowRows[windowRows.length - 1]?.last_watched_at || null) : null;
      const videoIds = windowRows.map((row) => row.video_id).filter(Boolean);
      const videos = videoIds.length > 0
        ? await readRowsOrEmpty(
          supabase
            .from('pixe_videos')
            .select('*')
            .in('id', videoIds)
        )
        : [];
      const hydrated = await hydrateVideos({ supabase, rows: videos, viewerUserId: context.user.id });
      const videoById = new Map(hydrated.map((row) => [row.id, row]));

      return res.json({
        data: windowRows.map((row) => ({
          video: videoById.get(row.video_id) || null,
          last_watched_at: row.last_watched_at || null,
          first_watched_at: row.first_watched_at || null,
          view_count: Number(row.view_count || 0),
          completed_count: Number(row.completed_count || 0),
          watch_time_ms: Number(row.watch_time_ms || 0),
          resume_ratio: (() => {
            const video = videoById.get(row.video_id) || null;
            const durationMs = Math.max(Number(video?.duration_ms || 0), 0);
            const totalWatchMs = Math.max(Number(row.watch_time_ms || 0), 0);
            const completedCount = Math.max(Number(row.completed_count || 0), 0);
            if (durationMs <= 0) return 0;
            const remainderMs = totalWatchMs > durationMs ? totalWatchMs % durationMs : totalWatchMs;
            if (completedCount > 0 && remainderMs < durationMs * 0.08) return 1;
            return clamp(remainderMs / durationMs, 0, 1);
          })()
        })),
        next_cursor: nextCursor,
        has_more: hasMore
      });
    } catch (error) {
      console.error('Load Pixe watched activity failed:', error);
      return res.status(500).json({ error: 'Unable to load watched activity.' });
    }
  });

  app.get('/pixe/activity/likes', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const limit = parsePositiveInt(req.query?.limit, 18, 1, MAX_FEED_LIMIT);
      const range = parseActivityRange(req.query?.range);
      const sinceTimestamp = resolveActivityRangeTimestamp(range);

      let query = supabase
        .from('pixe_video_likes')
        .select('video_id,created_at')
        .eq('user_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
      if (cursor) {
        query = query.lt('created_at', cursor);
      }
      if (sinceTimestamp) {
        query = query.gte('created_at', sinceTimestamp);
      }

      const rows = await readRowsOrEmpty(query);
      const hasMore = rows.length > limit;
      const windowRows = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? createCursor(windowRows[windowRows.length - 1]?.created_at || null) : null;
      const videoIds = windowRows.map((row) => row.video_id).filter(Boolean);
      const videos = videoIds.length > 0
        ? await readRowsOrEmpty(
          supabase
            .from('pixe_videos')
            .select('*')
            .in('id', videoIds)
        )
        : [];
      const hydrated = await hydrateVideos({ supabase, rows: videos, viewerUserId: context.user.id });
      const videoById = new Map(hydrated.map((row) => [row.id, row]));

      return res.json({
        data: windowRows.map((row) => ({
          video: videoById.get(row.video_id) || null,
          liked_at: row.created_at || null
        })),
        next_cursor: nextCursor,
        has_more: hasMore
      });
    } catch (error) {
      console.error('Load Pixe like activity failed:', error);
      return res.status(500).json({ error: 'Unable to load like activity.' });
    }
  });

  app.get('/pixe/activity/comments', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const limit = parsePositiveInt(req.query?.limit, 18, 1, MAX_FEED_LIMIT);
      const range = parseActivityRange(req.query?.range);
      const sinceTimestamp = resolveActivityRangeTimestamp(range);

      let query = supabase
        .from('pixe_comments')
        .select('id,video_id,parent_comment_id,body,status,created_at,updated_at')
        .eq('user_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
      if (cursor) {
        query = query.lt('created_at', cursor);
      }
      if (sinceTimestamp) {
        query = query.gte('created_at', sinceTimestamp);
      }

      const rows = await readRowsOrEmpty(query);
      const hasMore = rows.length > limit;
      const windowRows = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? createCursor(windowRows[windowRows.length - 1]?.created_at || null) : null;
      const videoIds = windowRows.map((row) => row.video_id).filter(Boolean);
      const videos = videoIds.length > 0
        ? await readRowsOrEmpty(
          supabase
            .from('pixe_videos')
            .select('*')
            .in('id', videoIds)
        )
        : [];
      const hydrated = await hydrateVideos({ supabase, rows: videos, viewerUserId: context.user.id });
      const videoById = new Map(hydrated.map((row) => [row.id, row]));

      return res.json({
        data: windowRows.map((row) => ({
          id: row.id,
          body: row.body || '',
          created_at: row.created_at,
          updated_at: row.updated_at,
          parent_comment_id: row.parent_comment_id || null,
          video: videoById.get(row.video_id) || null
        })),
        next_cursor: nextCursor,
        has_more: hasMore
      });
    } catch (error) {
      console.error('Load Pixe comment activity failed:', error);
      return res.status(500).json({ error: 'Unable to load comment activity.' });
    }
  });

  app.get('/pixe/search', optionalAuth, searchRateLimiter, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      await releaseDueScheduledVideos(supabase);

      const query = normalizeSearchQuery(req.query?.q);
      const limit = parsePositiveInt(req.query?.limit, 8, 1, SEARCH_RESULT_LIMIT);

      const [creators, videos, products] = await Promise.all([
        searchChannels({
          supabase,
          query,
          limit,
          viewerUserId: viewerContext?.user?.id || null
        }),
        searchVideos({
          supabase,
          query,
          limit,
          viewerUserId: viewerContext?.user?.id || null
        }),
        searchProducts({
          supabase,
          query,
          limit
        })
      ]);

      const topics = collectTrendingTopics(videos, tokenizeSearchQuery(query), Math.min(limit, 8));

      return res.json({
        data: {
          query,
          creators,
          videos,
          products,
          topics
        }
      });
    } catch (error) {
      console.error('Load Pixe search failed:', error);
      return res.status(500).json({ error: 'Unable to search Pixe.' });
    }
  });

  app.get('/pixe/videos/:videoId', optionalAuth, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      await releaseDueScheduledVideos(supabase);
      const row = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );

      if (!row) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const canAccess = await canViewerAccessVideo({
        supabase,
        video: row,
        viewerUserId: viewerContext?.user?.id || null
      });
      if (!canAccess) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const syncedRow = await syncMuxVideoState({ supabase, row });
      const [video] = await hydrateVideos({
        supabase,
        rows: [syncedRow],
        viewerUserId: viewerContext?.user?.id || null
      });
      const comments = await loadVideoComments(supabase, syncedRow.id, {
        viewerUserId: viewerContext?.user?.id || null
      });

      return res.json({ data: { ...video, comments } });
    } catch (error) {
      console.error('Load Pixe video failed:', error);
      return res.status(500).json({ error: 'Unable to load Pixe video.' });
    }
  });

  app.get('/pixe/channels/:handle', optionalAuth, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const handle = slugifyHandle(req.params.handle);
      const channel = await maybeSingle(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('handle', handle)
      );
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found.' });
      }

      await releaseDueScheduledVideos(supabase, channel.id);

      const channelDecorations = await loadChannelDecorations(supabase, [channel]);
      const viewerUserId = viewerContext?.user?.id || null;
      const isOwner = Boolean(viewerUserId && viewerUserId === channel.user_id);
      const isFollower = await viewerFollowsChannel(supabase, viewerUserId, channel.id);
      const channelView = channelDecorations.get(channel.id);
      const videos = await readRows(
        (isOwner
          ? supabase
            .from('pixe_videos')
            .select('*')
            .eq('channel_id', channel.id)
            .eq('status', 'published')
          : supabase
            .from('pixe_videos')
            .select('*')
            .eq('channel_id', channel.id)
            .eq('status', 'published')
            .in('visibility', isFollower ? ['public', 'followers'] : ['public']))
          .order('published_at', { ascending: false })
          .limit(18)
      );

      const hydratedVideos = await hydrateVideos({
        supabase,
        rows: videos,
        viewerUserId
      });

      return res.json({
        data: {
          channel: channelView
            ? {
              ...channelView,
              is_subscribed: isFollower
            }
            : channelView,
          videos: hydratedVideos
        }
      });
    } catch (error) {
      console.error('Load Pixe channel failed:', error);
      return res.status(500).json({ error: 'Unable to load Pixe channel.' });
    }
  });

  app.get('/pixe/profile/:firebaseUid', optionalAuth, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const requestedUid = safeString(req.params.firebaseUid).trim();
      if (!requestedUid) {
        return res.json({ data: { channel: null, videos: [] } });
      }

      const ownerUser = await maybeSingleOrNull(
        supabase
          .from('users')
          .select('id,firebase_uid')
          .eq('firebase_uid', requestedUid)
      ) || await maybeSingleOrNull(
        supabase
          .from('users')
          .select('id,firebase_uid')
          .eq('id', requestedUid)
      );

      if (!ownerUser?.id) {
        return res.json({ data: { channel: null, videos: [] } });
      }

      const channel = await maybeSingleOrNull(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('user_id', ownerUser.id)
      );

      if (!channel) {
        return res.json({ data: { channel: null, videos: [] } });
      }

      await releaseDueScheduledVideos(supabase, channel.id);

      const viewerUserId = viewerContext?.user?.id || null;
      const isOwner = Boolean(viewerUserId && viewerUserId === channel.user_id);
      const isFollower = await viewerFollowsChannel(supabase, viewerUserId, channel.id);
      const channelDecorations = await loadChannelDecorations(supabase, [channel]);
      const channelView = channelDecorations.get(channel.id) || null;

      const videos = await readRows(
        (isOwner
          ? supabase
            .from('pixe_videos')
            .select('*')
            .eq('channel_id', channel.id)
            .eq('status', 'published')
          : supabase
            .from('pixe_videos')
            .select('*')
            .eq('channel_id', channel.id)
            .eq('status', 'published')
            .in('visibility', isFollower ? ['public', 'followers'] : ['public']))
          .order('published_at', { ascending: false })
          .limit(24)
      );

      const hydratedVideos = await hydrateVideos({
        supabase,
        rows: videos,
        viewerUserId
      });

      return res.json({
        data: {
          channel: channelView
            ? {
              ...channelView,
              is_subscribed: isFollower
            }
            : null,
          videos: hydratedVideos
        }
      });
    } catch (error) {
      console.error('Load Pixe profile feed failed:', error);
      return res.status(500).json({ error: 'Unable to load profile Pixe.' });
    }
  });

  app.get('/pixe/videos/:videoId/comments', optionalAuth, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: viewerContext?.user?.id || null
      });
      if (!canAccess) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const comments = await loadVideoComments(supabase, req.params.videoId, {
        viewerUserId: viewerContext?.user?.id || null
      });
      return res.json({ data: comments });
    } catch (error) {
      console.error('Load Pixe comments failed:', error);
      return res.status(500).json({ error: 'Unable to load comments.' });
    }
  });

  app.post('/pixe/videos/:videoId/comments', requireAuth, commentRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!video || !video.allow_comments || !canAccess) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const body = safeString(req.body?.body).trim().slice(0, MAX_COMMENT_LENGTH);
      if (!body) {
        return res.status(400).json({ error: 'Comment body is required.' });
      }

      const { data, error } = await supabase
        .from('pixe_comments')
        .insert({
          video_id: video.id,
          user_id: context.user.id,
          parent_comment_id: safeString(req.body?.parent_comment_id).trim() || null,
          body
        })
        .select('*')
        .maybeSingle();
      if (error) throw error;

      await recalculateVideoCommentCount(supabase, video.id);
      await upsertHourlyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('comment'));
      await upsertDailyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('comment'));
      await upsertViewerVideoActivity(supabase, context.user.id, video.id, {
        eventTime: new Date().toISOString(),
        commentBody: body
      });
      await upsertViewerDailyActivity(supabase, context.user.id, new Date().toISOString(), {
        commented_count: 1
      });
      await refreshChannelCounters(supabase, video.channel_id);

      const actorName = safeString(context.user?.name || context.profile?.username || 'Someone').trim() || 'Someone';
      const channelOwner = await maybeSingleOrNull(
        supabase
          .from('pixe_channels')
          .select('user_id')
          .eq('id', video.channel_id)
      );
      if (channelOwner?.user_id && channelOwner.user_id !== context.user.id) {
        await insertPixeNotification(supabase, channelOwner.user_id, {
          title: 'New comment on your Pixe',
          body: `${actorName} commented on ${video.title || 'your clip'}.`,
          link: `/pixe/watch/${video.id}`,
          type: 'info'
        }, scheduleEmailForNotifications);
      }

      const [comment] = await Promise.all([loadVideoComments(supabase, video.id, { viewerUserId: context.user.id })]);
      return res.status(201).json({ data: comment.find((entry) => entry.id === data.id) || null });
    } catch (error) {
      console.error('Create Pixe comment failed:', error);
      return res.status(500).json({ error: 'Unable to create comment.' });
    }
  });

  app.patch('/pixe/comments/:commentId', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const ownership = await enforceCommentOwnership(supabase, req.params.commentId, context.user.id);
      if (!ownership) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const patch = {};
      if ('status' in req.body) patch.status = normalizeCommentStatus(req.body?.status);
      if ('is_pinned' in req.body) patch.is_pinned = parseBoolean(req.body?.is_pinned, false);

      const { error } = await supabase
        .from('pixe_comments')
        .update(patch)
        .eq('id', ownership.comment.id);
      if (error) throw error;

      await recalculateVideoCommentCount(supabase, ownership.video.id);
      const comments = await loadVideoComments(supabase, ownership.video.id, { includeHidden: true });
      return res.json({ data: comments.find((entry) => entry.id === ownership.comment.id) || null });
    } catch (error) {
      console.error('Moderate Pixe comment failed:', error);
      return res.status(500).json({ error: 'Unable to update comment.' });
    }
  });

  app.post('/pixe/comments/:commentId/like', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const loaded = await loadCommentWithVideo(supabase, req.params.commentId);
      if (!loaded) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const { comment, video } = loaded;
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!canAccess || comment.status !== 'active') {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const existing = await maybeSingle(
        supabase
          .from('pixe_comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', context.user.id)
      );

      let liked = false;
      if (existing) {
        const { error } = await supabase
          .from('pixe_comment_likes')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pixe_comment_likes')
          .insert({ comment_id: comment.id, user_id: context.user.id });
        if (error) throw error;
        liked = true;
      }

      const likes = await readRows(
        supabase
          .from('pixe_comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
      );

      return res.json({ data: { liked, like_count: likes.length } });
    } catch (error) {
      if (isMissingRelationError(error)) {
        return res.status(503).json({ error: 'Comment actions are not ready yet.' });
      }
      console.error('Toggle Pixe comment like failed:', error);
      return res.status(500).json({ error: 'Unable to like comment.' });
    }
  });

  app.post('/pixe/comments/:commentId/report', requireAuth, commentRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const loaded = await loadCommentWithVideo(supabase, req.params.commentId);
      if (!loaded) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const { comment, video } = loaded;
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!canAccess || comment.status !== 'active') {
        return res.status(404).json({ error: 'Comment not found.' });
      }
      if (comment.user_id === context.user.id) {
        return res.status(400).json({ error: 'You cannot report your own comment.' });
      }

      const existing = await maybeSingle(
        supabase
          .from('pixe_comment_reports')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', context.user.id)
      );

      if (!existing) {
        const reason = safeString(req.body?.reason).trim().slice(0, 240);
        const { error } = await supabase
          .from('pixe_comment_reports')
          .insert({
            comment_id: comment.id,
            user_id: context.user.id,
            reason
          });
        if (error) throw error;
      }

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.comment.report',
          entityType: 'pixe_comment',
          entityId: comment.id,
          details: { video_id: video.id }
        });
      }

      return res.json({ data: { reported: true } });
    } catch (error) {
      if (isMissingRelationError(error)) {
        return res.status(503).json({ error: 'Comment actions are not ready yet.' });
      }
      console.error('Report Pixe comment failed:', error);
      return res.status(500).json({ error: 'Unable to report comment.' });
    }
  });

  app.post('/pixe/videos/:videoId/like', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!video || !canAccess) return res.status(404).json({ error: 'Video not found.' });

      const existing = await maybeSingle(
        supabase
          .from('pixe_video_likes')
          .select('id')
          .eq('video_id', video.id)
          .eq('user_id', context.user.id)
      );

      let liked = false;
      if (existing) {
        const { error } = await supabase
          .from('pixe_video_likes')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pixe_video_likes')
          .insert({ video_id: video.id, user_id: context.user.id });
        if (error) throw error;
        liked = true;
      }

      const likes = await readRows(
        supabase
          .from('pixe_video_likes')
          .select('id')
          .eq('video_id', video.id)
      );
      const { error } = await supabase
        .from('pixe_videos')
        .update({ like_count: likes.length })
        .eq('id', video.id);
      if (error) throw error;

      if (liked) {
        await Promise.all([
          upsertHourlyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('like')),
          upsertDailyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('like'))
        ]);
      }
      await upsertViewerVideoActivity(supabase, context.user.id, video.id, {
        eventTime: new Date().toISOString(),
        likedState: liked
      });
      if (liked) {
        await upsertViewerDailyActivity(supabase, context.user.id, new Date().toISOString(), {
          liked_count: 1
        });
        const actorName = safeString(context.user?.name || context.profile?.username || 'Someone').trim() || 'Someone';
        const channelOwner = await maybeSingleOrNull(
          supabase
            .from('pixe_channels')
            .select('user_id')
            .eq('id', video.channel_id)
        );
        if (channelOwner?.user_id && channelOwner.user_id !== context.user.id) {
          await insertPixeNotification(supabase, channelOwner.user_id, {
            title: 'Your Pixe got a new like',
            body: `${actorName} liked ${video.title || 'your clip'}.`,
            link: `/pixe/watch/${video.id}`,
            type: 'info'
          }, scheduleEmailForNotifications);
          if (likes.length === 10) {
            await insertPixeNotification(supabase, channelOwner.user_id, {
              title: 'Your Pixe reached 10 likes',
              body: `${video.title || 'Your clip'} just crossed its first 10-like milestone.`,
              link: `/pixe/watch/${video.id}`,
              type: 'info'
            }, scheduleEmailForNotifications);
          }
        }
      }

      return res.json({ data: { liked, like_count: likes.length } });
    } catch (error) {
      console.error('Toggle Pixe like failed:', error);
      return res.status(500).json({ error: 'Unable to like video.' });
    }
  });

  app.post('/pixe/videos/:videoId/save', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!video || !canAccess) return res.status(404).json({ error: 'Video not found.' });

      const existing = await maybeSingle(
        supabase
          .from('pixe_saved_videos')
          .select('id')
          .eq('video_id', video.id)
          .eq('user_id', context.user.id)
      );

      let saved = false;
      if (existing) {
        const { error } = await supabase
          .from('pixe_saved_videos')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pixe_saved_videos')
          .insert({ video_id: video.id, user_id: context.user.id });
        if (error) throw error;
        saved = true;
      }

      const saves = await readRows(
        supabase
          .from('pixe_saved_videos')
          .select('id')
          .eq('video_id', video.id)
      );
      const { error } = await supabase
        .from('pixe_videos')
        .update({ save_count: saves.length })
        .eq('id', video.id);
      if (error) throw error;

      if (saved) {
        await Promise.all([
          upsertHourlyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('save')),
          upsertDailyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('save'))
        ]);
      }
      await upsertViewerVideoActivity(supabase, context.user.id, video.id, {
        eventTime: new Date().toISOString(),
        savedState: saved
      });
      if (saved) {
        await upsertViewerDailyActivity(supabase, context.user.id, new Date().toISOString(), {
          saved_count: 1
        });
      }

      return res.json({ data: { saved, save_count: saves.length } });
    } catch (error) {
      console.error('Toggle Pixe save failed:', error);
      return res.status(500).json({ error: 'Unable to save video.' });
    }
  });

  app.post('/pixe/videos/:videoId/share', optionalAuth, shareRateLimiter, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: viewerContext?.user?.id || null
      });
      if (!video || !canAccess) return res.status(404).json({ error: 'Video not found.' });

      const clientSignals = getClientBotSignals(req);
      if (clientSignals.suspicious) {
        return res.json({ data: { share_count: Number(video.share_count || 0) } });
      }

      const shareSeed = viewerContext?.user?.id || `${clientSignals.ip}:${clientSignals.userAgent || 'share'}`;
      const shareReserved = await reserveDedupeKey({
        supabase,
        dedupeKey: hashEventKey(`share|${video.id}|${shareSeed}|${getDayBucket(new Date().toISOString())}`),
        eventName: 'share',
        videoId: video.id
      });
      if (!shareReserved) {
        return res.json({ data: { share_count: Number(video.share_count || 0) } });
      }

      const nextShares = Number(video.share_count || 0) + 1;
      const { error } = await supabase
        .from('pixe_videos')
        .update({ share_count: nextShares })
        .eq('id', video.id);
      if (error) throw error;

      await Promise.all([
        upsertHourlyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('share')),
        upsertDailyStats(supabase, video.id, new Date().toISOString(), buildStatsDelta('share'))
      ]);
      await refreshChannelCounters(supabase, video.channel_id);

      return res.json({ data: { share_count: nextShares } });
    } catch (error) {
      console.error('Track Pixe share failed:', error);
      return res.status(500).json({ error: 'Unable to share video.' });
    }
  });

  app.post('/pixe/channels/:channelId/subscribe', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const channel = await maybeSingle(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('id', req.params.channelId)
      );
      if (!channel) return res.status(404).json({ error: 'Channel not found.' });
      if (channel.user_id === context.user.id) {
        return res.status(400).json({ error: 'You cannot subscribe to your own channel.' });
      }

      const existing = await maybeSingle(
        supabase
          .from('pixe_subscriptions')
          .select('id')
          .eq('channel_id', channel.id)
          .eq('user_id', context.user.id)
      );

      let subscribed = false;
      if (existing) {
        const { error } = await supabase
          .from('pixe_subscriptions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pixe_subscriptions')
          .insert({ channel_id: channel.id, user_id: context.user.id });
        if (error) throw error;
        subscribed = true;
      }

      await refreshChannelCounters(supabase, channel.id);

      if (subscribed) {
        const latestVideo = await maybeSingle(
          supabase
            .from('pixe_videos')
            .select('*')
            .eq('channel_id', channel.id)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(1)
        );
        if (latestVideo) {
          await Promise.all([
            upsertHourlyStats(supabase, latestVideo.id, new Date().toISOString(), buildStatsDelta('subscribe')),
            upsertDailyStats(supabase, latestVideo.id, new Date().toISOString(), buildStatsDelta('subscribe'))
          ]);
        }
        const actorName = safeString(context.user?.name || context.profile?.username || 'Someone').trim() || 'Someone';
        await insertPixeNotification(supabase, channel.user_id, {
          title: 'New Pixe subscriber',
          body: `${actorName} followed your Pixe channel.`,
          link: `/pixe/channel/${channel.handle}`,
          type: 'info'
        }, scheduleEmailForNotifications);
      }

      const refreshed = await maybeSingle(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('id', channel.id)
      );
      if (subscribed && refreshed?.user_id) {
        const subscriberCount = Number(refreshed.subscriber_count || 0);
        if (subscriberCount === 1 || subscriberCount === 10) {
          await insertPixeNotification(supabase, refreshed.user_id, {
            title: subscriberCount === 1 ? 'Your first Pixe subscriber joined' : 'Your Pixe channel reached 10 subscribers',
            body: subscriberCount === 1
              ? 'Your channel has its first subscriber. This is the start of a real audience.'
              : 'Ten people are now following your Pixe channel.',
            link: `/pixe/channel/${channel.handle}`,
            type: 'info'
          }, scheduleEmailForNotifications);
        }
      }

      return res.json({
        data: {
          subscribed,
          subscriber_count: Number(refreshed?.subscriber_count || 0)
        }
      });
    } catch (error) {
      console.error('Toggle Pixe subscription failed:', error);
      return res.status(500).json({ error: 'Unable to update subscription.' });
    }
  });

  app.post('/pixe/channels/:channelId/tip', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const channel = await maybeSingle(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('id', req.params.channelId)
      );
      if (!channel) return res.status(404).json({ error: 'Channel not found.' });
      if (!channel.tip_enabled) {
        return res.status(409).json({ error: 'This creator is not accepting tips right now.' });
      }
      if (channel.user_id === context.user.id) {
        return res.status(400).json({ error: 'You cannot tip your own channel.' });
      }

      const amount = parseMoneyAmount(req.body?.amount, 0);
      const currency = normalizeCurrencyCode(req.body?.currency || 'USD');
      const message = safeString(req.body?.message).trim().slice(0, 240);
      const videoId = safeString(req.body?.video_id).trim() || null;
      if (amount < 1 || amount > 500) {
        return res.status(400).json({ error: 'Tip amount must be between 1 and 500.' });
      }

      if (videoId) {
        const linkedVideo = await maybeSingle(
          supabase
            .from('pixe_videos')
            .select('id,channel_id')
            .eq('id', videoId)
        );
        if (!linkedVideo || linkedVideo.channel_id !== channel.id) {
          return res.status(400).json({ error: 'Linked video does not belong to this channel.' });
        }
      }

      const { data: tip, error: tipError } = await supabase
        .from('pixe_tips')
        .insert({
          channel_id: channel.id,
          user_id: context.user.id,
          video_id: videoId,
          amount,
          currency,
          status: 'completed',
          message
        })
        .select('*')
        .maybeSingle();
      if (tipError) throw tipError;

      await supabase
        .from('pixe_payout_ledger')
        .insert({
          channel_id: channel.id,
          source_type: 'tip',
          source_id: tip?.id || null,
          entry_type: 'credit',
          amount,
          currency,
          status: 'available',
          available_at: new Date().toISOString()
        });

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.tip.create',
          entityType: 'pixe_channel',
          entityId: channel.id,
          details: { amount, currency, video_id: videoId }
        });
      }

      return res.json({
        data: {
          ok: true,
          tip: tip || null,
          supporter_message: message || null
        }
      });
    } catch (error) {
      console.error('Create Pixe tip failed:', error);
      return res.status(500).json({ error: 'Unable to send tip.' });
    }
  });

  app.post('/pixe/channels/:channelId/membership', requireAuth, engagementRateLimiter, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const channel = await maybeSingle(
        supabase
          .from('pixe_channels')
          .select('*')
          .eq('id', req.params.channelId)
      );
      if (!channel) return res.status(404).json({ error: 'Channel not found.' });
      if (!channel.membership_enabled) {
        return res.status(409).json({ error: 'This creator is not accepting memberships right now.' });
      }
      if (channel.user_id === context.user.id) {
        return res.status(400).json({ error: 'You cannot join your own membership.' });
      }

      const amount = parseMoneyAmount(req.body?.amount, DEFAULT_MEMBERSHIP_AMOUNT);
      const currency = normalizeCurrencyCode(req.body?.currency || 'USD');
      const tierName = safeString(req.body?.tier_name || 'Supporter').trim().slice(0, 48) || 'Supporter';
      const existing = await maybeSingle(
        supabase
          .from('pixe_memberships')
          .select('*')
          .eq('channel_id', channel.id)
          .eq('user_id', context.user.id)
      );

      if (amount < 1 || amount > 200) {
        return res.status(400).json({ error: 'Membership amount must be between 1 and 200.' });
      }

      const renewsAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString();
      const tooSoonToRenew = existing?.status === 'active'
        && existing?.renews_at
        && new Date(existing.renews_at).getTime() - Date.now() > (7 * 24 * 60 * 60 * 1000);

      let membership = existing;
      if (!tooSoonToRenew) {
        const { data, error } = await supabase
          .from('pixe_memberships')
          .upsert({
            channel_id: channel.id,
            user_id: context.user.id,
            tier_name: tierName,
            amount,
            currency,
            status: 'active',
            renews_at: renewsAt
          }, { onConflict: 'channel_id,user_id' })
          .select('*')
          .maybeSingle();
        if (error) throw error;
        membership = data || existing;

        await supabase
          .from('pixe_payout_ledger')
          .insert({
            channel_id: channel.id,
            source_type: 'membership',
            source_id: membership?.id || null,
            entry_type: 'credit',
            amount,
            currency,
            status: 'available',
            available_at: new Date().toISOString()
          });
      }

      return res.json({
        data: {
          membership: membership || null,
          already_active: Boolean(tooSoonToRenew)
        }
      });
    } catch (error) {
      console.error('Create Pixe membership failed:', error);
      return res.status(500).json({ error: 'Unable to join membership.' });
    }
  });

  app.post('/pixe/studio/payout-requests', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const channel = await ensureCreatorChannel(supabase, context);
      const amount = parseMoneyAmount(req.body?.amount, 0);
      const currency = normalizeCurrencyCode(req.body?.currency || 'USD');
      const destinationLabel = safeString(req.body?.destination_label || '').trim().slice(0, 120);
      const note = safeString(req.body?.note || '').trim().slice(0, 280);
      if (amount <= 0) {
        return res.status(400).json({ error: 'A payout amount is required.' });
      }
      if (!destinationLabel) {
        return res.status(400).json({ error: 'A payout destination is required.' });
      }

      const [tips, memberships, videos, payoutRequests] = await Promise.all([
        readRowsOrEmpty(
          supabase
            .from('pixe_tips')
            .select('amount')
            .eq('channel_id', channel.id)
            .eq('status', 'completed')
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_memberships')
            .select('amount,status')
            .eq('channel_id', channel.id)
        ),
        readRows(
          supabase
            .from('pixe_videos')
            .select('product_revenue_amount')
            .eq('channel_id', channel.id)
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_payout_requests')
            .select('amount,status')
            .eq('channel_id', channel.id)
        )
      ]);

      const tipRevenue = sumBy(tips, 'amount');
      const membershipRevenue = sumBy(memberships.filter((row) => row.status === 'active'), 'amount');
      const productRevenue = sumBy(videos, 'product_revenue_amount');
      const payoutSnapshot = buildPayoutSnapshot({
        tipRevenue,
        membershipRevenue,
        productRevenue,
        payoutRequests
      });

      if (amount > payoutSnapshot.available_balance) {
        return res.status(400).json({ error: `Only ${payoutSnapshot.available_balance.toFixed(2)} is currently available for payout.` });
      }

      const { data, error } = await supabase
        .from('pixe_payout_requests')
        .insert({
          channel_id: channel.id,
          user_id: context.user.id,
          amount,
          currency,
          destination_label: destinationLabel,
          note,
          status: 'pending'
        })
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.payout.request',
          entityType: 'pixe_channel',
          entityId: channel.id,
          details: { amount, currency }
        });
      }

      return res.json({
        data: {
          request: data || null,
          available_balance: Number((payoutSnapshot.available_balance - amount).toFixed(2))
        }
      });
    } catch (error) {
      console.error('Create Pixe payout request failed:', error);
      return res.status(500).json({ error: 'Unable to create payout request.' });
    }
  });

  app.post('/pixe/activity/watch-progress', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const videoId = safeString(req.body?.video_id).trim();
      const viewerSessionId = safeString(req.body?.viewer_session_id).trim().slice(0, 120);
      const watchTimeMs = clamp(Math.round(parseNumber(req.body?.watch_time_ms, 0)), 0, 120_000);
      const progressRatio = clamp(parseNumber(req.body?.progress_ratio, 0), 0, 1);
      const completed = parseBoolean(req.body?.completed, false) || progressRatio >= 0.99;
      const occurredAt = normalizeIsoTimestamp(req.body?.occurred_at) || new Date().toISOString();

      if (!videoId || watchTimeMs <= 0) {
        return res.status(400).json({ error: 'A valid watch-progress payload is required.' });
      }

      const video = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', videoId)
      );
      if (!video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const canAccess = await canViewerAccessVideo({
        supabase,
        video,
        viewerUserId: context.user.id
      });
      if (!canAccess) {
        return res.status(403).json({ error: 'You do not have access to this video.' });
      }

      let watchedCount = 0;
      if (viewerSessionId && (watchTimeMs >= 3000 || progressRatio >= 0.05)) {
        const reserved = await reserveDedupeKey({
          supabase,
          dedupeKey: hashEventKey(`watch-progress:${context.user.id}:${video.id}:${viewerSessionId}`),
          eventName: 'watch_progress_session',
          videoId: video.id,
          ttlMs: ANALYTICS_SESSION_TTL_MS
        });
        watchedCount = reserved ? 1 : 0;
      }

      let completedCount = 0;
      if (viewerSessionId && completed) {
        const reservedCompletion = await reserveDedupeKey({
          supabase,
          dedupeKey: hashEventKey(`watch-progress-complete:${context.user.id}:${video.id}:${viewerSessionId}`),
          eventName: 'watch_progress_complete',
          videoId: video.id,
          ttlMs: ANALYTICS_SESSION_TTL_MS
        });
        completedCount = reservedCompletion ? 1 : 0;
      }

      await upsertViewerVideoActivity(supabase, context.user.id, video.id, {
        eventTime: occurredAt,
        watchedCount,
        watchTimeMs,
        completedCount
      });
      await upsertViewerDailyActivity(supabase, context.user.id, occurredAt, {
        watched_count: watchedCount,
        watch_time_ms: watchTimeMs
      });

      return res.json({
        data: {
          ok: true,
          watched_count: watchedCount,
          completed: completedCount
        }
      });
    } catch (error) {
      console.error('Record Pixe watch progress failed:', error);
      return res.status(500).json({ error: 'Unable to record watch progress.' });
    }
  });

  app.post('/pixe/events/batch', optionalAuth, eventBatchRateLimiter, async (req, res) => {
    try {
      const viewerContext = await loadViewerContext(getUserContext, req);
      const viewerId = viewerContext?.user?.id || null;
      const clientSignals = getClientBotSignals(req);
      if (clientSignals.suspicious) {
        return res.json({ data: { accepted_count: 0, accepted: [] } });
      }
      const events = Array.isArray(req.body?.events) ? req.body.events : [];
      const accepted = [];

      for (const rawEvent of events.slice(0, 30)) {
        const event = normalizeJsonObject(rawEvent);
        const videoId = safeString(event.video_id).trim();
        const eventName = safeString(event.event_name).trim().toLowerCase();
        if (!videoId || !ANALYTICS_ALLOWED_EVENT_NAMES.has(eventName)) {
          continue;
        }

        const video = await maybeSingle(
          supabase
            .from('pixe_videos')
            .select('*')
            .eq('id', videoId)
        );
        if (!video) continue;

        const canAccess = await canViewerAccessVideo({
          supabase,
          video,
          viewerUserId: viewerId
        });
        if (!canAccess) continue;

        const eventTime = normalizeIsoTimestamp(event.occurred_at) || new Date().toISOString();
        const eventAcceptance = canAcceptAnalyticsEvent({
          req,
          video,
          viewerId,
          viewerSessionId: event.viewer_session_id,
          eventName,
          eventTime,
          watchTimeMs: event.watch_time_ms
        });
        if (!eventAcceptance.accepted) {
          continue;
        }

        const dedupeKey = safeString(event.event_id).trim()
          || hashEventKey(`${video.id}|${eventName}|${eventAcceptance.viewerSeed}|${getHourBucketStart(eventTime)}`);
        const reserved = await reserveDedupeKey({
          supabase,
          dedupeKey,
          eventName,
          videoId: video.id
        });
        if (!reserved) continue;

        await applyEventMetrics({
          supabase,
          videoRow: video,
          eventName,
          eventTime,
          watchTimeMs: eventAcceptance.normalizedWatchTimeMs
        });

        accepted.push({ video_id: video.id, event_name: eventName });
      }

      return res.json({ data: { accepted_count: accepted.length, accepted } });
    } catch (error) {
      console.error('Pixe batch events failed:', error);
      return res.status(500).json({ error: 'Unable to record analytics events.' });
    }
  });

  app.get('/pixe/studio/dashboard', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }
      const channel = await ensureCreatorChannel(supabase, context);
      await releaseDueScheduledVideos(supabase, channel.id);

      const videos = await readRows(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
          .limit(6)
      );
      const syncedVideos = await Promise.all(videos.map((row) => syncMuxVideoState({ supabase, row })));
      const hydratedVideos = await hydrateVideos({ supabase, rows: syncedVideos, viewerUserId: context.user.id });

      return res.json({
        data: {
          channel,
          recent_videos: hydratedVideos,
          summary: {
            subscriber_count: Number(channel.subscriber_count || 0),
            video_count: Number(channel.video_count || 0),
            published_video_count: Number(channel.published_video_count || 0),
            total_impressions: Number(channel.total_impressions || 0),
            total_qualified_views: Number(channel.total_qualified_views || 0),
            total_watch_time_ms: Number(channel.total_watch_time_ms || 0)
          }
        }
      });
    } catch (error) {
      console.error('Load Pixe dashboard failed:', error);
      return res.status(500).json({ error: 'Unable to load Pixe dashboard.' });
    }
  });

  app.get('/pixe/studio/content', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }
      const channel = await ensureCreatorChannel(supabase, context);
      await releaseDueScheduledVideos(supabase, channel.id);

      const limit = parsePositiveInt(req.query?.limit, 20, 1, MAX_STUDIO_LIMIT);
      const cursor = parseCursor(safeString(req.query?.cursor).trim());
      const requestedStatus = safeString(req.query?.status).trim().toLowerCase();

      let query = supabase
        .from('pixe_videos')
        .select('*')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (requestedStatus && VIDEO_STATUS_VALUES.has(requestedStatus)) {
        query = query.eq('status', requestedStatus);
      }
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const rows = await readRows(query);
      const hasMore = rows.length > limit;
      const selectedRows = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? createCursor(selectedRows[selectedRows.length - 1]?.created_at) : null;
      const syncedRows = await Promise.all(selectedRows.map((row) => syncMuxVideoState({ supabase, row })));
      const data = await hydrateVideos({ supabase, rows: syncedRows, viewerUserId: context.user.id });

      return res.json({ data, next_cursor: nextCursor, has_more: hasMore });
    } catch (error) {
      console.error('Load Pixe studio content failed:', error);
      return res.status(500).json({ error: 'Unable to load studio content.' });
    }
  });

  app.get('/pixe/studio/comments', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }
      const channel = await ensureCreatorChannel(supabase, context);
      const videos = await readRows(
        supabase
          .from('pixe_videos')
          .select('id,title,thumbnail_url')
          .eq('channel_id', channel.id)
      );
      const videoIds = videos.map((row) => row.id);
      if (videoIds.length === 0) {
        return res.json({ data: [] });
      }

      const comments = await readRows(
        supabase
          .from('pixe_comments')
          .select('*')
          .in('video_id', videoIds)
          .order('created_at', { ascending: false })
          .limit(100)
      );

      const userIds = Array.from(new Set(comments.map((row) => row.user_id).filter(Boolean)));
      const users = userIds.length > 0
        ? await readRows(
          supabase
            .from('users')
            .select('id,name,avatar_url')
            .in('id', userIds)
        )
        : [];
      const usersById = new Map(users.map((row) => [row.id, row]));
      const videosById = new Map(videos.map((row) => [row.id, row]));
      const reportSummary = await loadCommentReportSummary(supabase, comments.map((row) => row.id));

      return res.json({
        data: comments.map((row) => ({
          id: row.id,
          body: row.body,
          status: row.status,
          is_pinned: Boolean(row.is_pinned),
          created_at: row.created_at,
          user: usersById.has(row.user_id)
            ? {
              id: row.user_id,
              name: usersById.get(row.user_id).name || 'Viewer',
              avatar_url: usersById.get(row.user_id).avatar_url || '/icons/urbanprime.svg'
            }
            : null,
          video: videosById.has(row.video_id)
            ? {
              id: row.video_id,
              title: videosById.get(row.video_id).title || '',
              thumbnail_url: videosById.get(row.video_id).thumbnail_url || null
            }
            : null,
          reports: reportSummary.get(row.id) || {
            report_count: 0,
            reasons: [],
            review_status: 'pending',
            latest_reported_at: null
          }
        }))
      });
    } catch (error) {
      console.error('Load Pixe studio comments failed:', error);
      return res.status(500).json({ error: 'Unable to load studio comments.' });
    }
  });

  app.get('/pixe/studio/channel', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }
      const channel = await ensureCreatorChannel(supabase, context);
      return res.json({ data: channel });
    } catch (error) {
      console.error('Load Pixe studio channel failed:', error);
      return res.status(500).json({ error: 'Unable to load channel settings.' });
    }
  });

  app.get('/pixe/studio/handle-availability', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      const requestedHandle = slugifyHandle(req.query?.handle);

      if (!requestedHandle) {
        return res.json({
          data: {
            handle: '',
            available: false,
            is_current: false,
            reason: 'invalid'
          }
        });
      }

      const channel = await maybeSingleOrNull(
        supabase
          .from('pixe_channels')
          .select('id,handle')
          .eq('user_id', context.user.id)
      );
      const existing = await maybeSingleOrNull(
        supabase
          .from('pixe_channels')
          .select('id')
          .eq('handle', requestedHandle)
      );

      const isCurrent = Boolean(
        (channel?.id && existing && existing.id === channel.id)
        || (channel?.handle && channel.handle === requestedHandle)
      );
      const available = !existing || isCurrent;

      return res.json({
        data: {
          handle: requestedHandle,
          available,
          is_current: isCurrent,
          reason: available ? null : 'taken'
        }
      });
    } catch (error) {
      console.error('Check Pixe handle availability failed:', error);
      return res.status(500).json({ error: 'Unable to check handle availability.' });
    }
  });

  app.patch('/pixe/studio/channel', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }
      const channel = await ensureCreatorChannel(supabase, context);
      const nextOnboardingCompleted = typeof req.body?.onboarding_completed === 'boolean'
        ? req.body.onboarding_completed
        : Boolean(channel.onboarding_completed);

      const patch = {
        display_name: safeString(req.body?.display_name || channel.display_name).trim().slice(0, 80) || channel.display_name,
        bio: safeString(req.body?.bio || channel.bio).trim().slice(0, 280),
        banner_url: safeString(req.body?.banner_url).trim() || null,
        avatar_url: safeString(req.body?.avatar_url).trim() || channel.avatar_url || null,
        hidden_words: normalizeTextArray(req.body?.hidden_words, 50),
        onboarding_completed: nextOnboardingCompleted
      };

      if (nextOnboardingCompleted && !patch.bio) {
        return res.status(400).json({ error: 'A public bio is required.' });
      }

      if ('handle' in req.body) {
        const requestedHandle = slugifyHandle(req.body?.handle);
        if (!requestedHandle) {
          return res.status(400).json({ error: 'A valid handle is required.' });
        }
        if (requestedHandle !== channel.handle) {
          const existing = await maybeSingleOrNull(
            supabase
              .from('pixe_channels')
              .select('id')
              .eq('handle', requestedHandle)
          );
          if (existing && existing.id !== channel.id) {
            return res.status(409).json({ error: 'This public handle is already in use.' });
          }
          patch.handle = requestedHandle;
        }
      }

      const { data, error } = await supabase
        .from('pixe_channels')
        .update(patch)
        .eq('id', channel.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;

      return res.json({ data });
    } catch (error) {
      console.error('Update Pixe channel failed:', error);
      return res.status(500).json({ error: 'Unable to update channel settings.' });
    }
  });

  app.delete('/pixe/studio/account', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) {
        return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      }

      await cleanupPixeAccountData({
        supabase,
        userId: context.user.id,
        uploadsRoot
      });

      if (typeof writeAuditLog === 'function') {
        await writeAuditLog({
          actorUserId: context.user.id,
          action: 'pixe.account.delete',
          entityType: 'user',
          entityId: context.user.id,
          details: {
            firebase_uid: context.user.firebase_uid || req.user?.uid || null
          }
        });
      }

      return res.json({ data: { ok: true } });
    } catch (error) {
      console.error('Delete Pixe account failed:', error);
      return res.status(500).json({ error: 'Unable to delete this account right now.' });
    }
  });

  app.get('/pixe/studio/analytics/overview', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      const channel = await ensureCreatorChannel(supabase, context);

      const videos = await readRows(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('channel_id', channel.id)
      );
      const videoIds = videos.map((row) => row.id);
      const dailyStats = videoIds.length > 0
        ? await readRows(
          supabase
            .from('pixe_video_stats_daily')
            .select('*')
            .in('video_id', videoIds)
            .order('bucket_date', { ascending: true })
            .limit(365)
        )
        : [];

      const muxSummary = await fetchMuxSummary([`video_creator_id:${context.user.id}`], DEFAULT_ANALYTICS_TIMEFRAME);
      return res.json({
        data: {
          summary: {
            total_videos: videos.length,
            published_videos: videos.filter((row) => row.status === 'published').length,
            impressions: sumBy(videos, 'impression_count'),
            qualified_views: sumBy(videos, 'qualified_view_count'),
            watch_time_ms: sumBy(videos, 'watch_time_total_ms'),
            likes: sumBy(videos, 'like_count'),
            comments: sumBy(videos, 'comment_count'),
            saves: sumBy(videos, 'save_count'),
            shares: sumBy(videos, 'share_count'),
            completion_rate: videos.length > 0
              ? Number((
                videos.reduce((sum, row) => sum + calculateCompletionRate(row), 0) / Math.max(videos.length, 1)
              ).toFixed(2))
              : 0
          },
          daily_stats: dailyStats,
          mux_qoe: muxSummary
        }
      });
    } catch (error) {
      console.error('Load Pixe overview analytics failed:', error);
      return res.status(500).json({ error: 'Unable to load overview analytics.' });
    }
  });

  app.get('/pixe/studio/analytics/content', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      const channel = await ensureCreatorChannel(supabase, context);
      const videos = await readRows(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
      );
      const data = await hydrateVideos({ supabase, rows: videos, viewerUserId: context.user.id });
      return res.json({ data });
    } catch (error) {
      console.error('Load Pixe content analytics failed:', error);
      return res.status(500).json({ error: 'Unable to load content analytics.' });
    }
  });

  app.get('/pixe/studio/analytics/audience', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      const channel = await ensureCreatorChannel(supabase, context);

      const subscriptions = await readRows(
        supabase
          .from('pixe_subscriptions')
          .select('id,created_at')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
      );
      const videos = await readRows(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('channel_id', channel.id)
      );

      const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return res.json({
        data: {
          subscriber_count: Number(channel.subscriber_count || 0),
          new_subscribers_last_30_days: subscriptions.filter((row) => new Date(row.created_at).getTime() >= last30Days).length,
          average_completion_rate: videos.length > 0
            ? Number((videos.reduce((sum, row) => sum + calculateCompletionRate(row), 0) / videos.length).toFixed(2))
            : 0,
          top_videos_by_watch_time: videos
            .sort((left, right) => Number(right.watch_time_total_ms || 0) - Number(left.watch_time_total_ms || 0))
            .slice(0, 5)
            .map((row) => ({
              id: row.id,
              title: row.title || '',
              watch_time_ms: Number(row.watch_time_total_ms || 0),
              qualified_views: Number(row.qualified_view_count || 0)
            }))
        }
      });
    } catch (error) {
      console.error('Load Pixe audience analytics failed:', error);
      return res.status(500).json({ error: 'Unable to load audience analytics.' });
    }
  });

  app.get('/pixe/studio/analytics/revenue', requireAuth, async (req, res) => {
    try {
      const context = await getUserContext(req);
      if (context?.error) return res.status(401).json({ error: context.error.message || 'Authentication required.' });
      const channel = await ensureCreatorChannel(supabase, context);

      const [tips, memberships, ledger, videos, payoutRequests] = await Promise.all([
        readRows(
          supabase
            .from('pixe_tips')
            .select('*')
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
        ),
        readRows(
          supabase
            .from('pixe_memberships')
            .select('*')
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
        ),
        readRows(
          supabase
            .from('pixe_payout_ledger')
            .select('*')
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
        ),
        readRows(
          supabase
            .from('pixe_videos')
            .select('id,product_revenue_amount,product_click_count')
            .eq('channel_id', channel.id)
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_payout_requests')
            .select('*')
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
        )
      ]);

      const tipRevenue = Number(sumBy(tips.filter((row) => row.status === 'completed' || !row.status), 'amount').toFixed(2));
      const membershipRevenue = Number(sumBy(memberships.filter((row) => row.status === 'active'), 'amount').toFixed(2));
      const productRevenue = Number(sumBy(videos, 'product_revenue_amount').toFixed(2));
      const payoutSnapshot = buildPayoutSnapshot({
        tipRevenue,
        membershipRevenue,
        productRevenue,
        payoutRequests
      });

      return res.json({
        data: {
          summary: {
            tip_revenue: tipRevenue,
            active_memberships: memberships.filter((row) => row.status === 'active').length,
            membership_revenue: membershipRevenue,
            product_clicks: sumBy(videos, 'product_click_count'),
            product_revenue_amount: productRevenue,
            available_balance: payoutSnapshot.available_balance,
            pending_payouts: payoutSnapshot.pending_payouts,
            paid_out: payoutSnapshot.paid_out
          },
          tips,
          memberships,
          payout_ledger: ledger,
          payout_requests: payoutRequests
        }
      });
    } catch (error) {
      console.error('Load Pixe revenue analytics failed:', error);
      return res.status(500).json({ error: 'Unable to load revenue analytics.' });
    }
  });

  app.get('/admin/pixe/overview', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const todayBucket = new Date().toISOString().slice(0, 10);
      const [
        channelCountRes,
        videoCountRes,
        publishedCountRes,
        processingCountRes,
        failedCountRes,
        todayStats,
        recentRows,
        topChannelRows,
        pendingReportRows,
        pendingReviewRows,
        pendingPayoutRows
      ] = await Promise.all([
        supabase.from('pixe_channels').select('id', { count: 'exact', head: true }),
        supabase.from('pixe_videos').select('id', { count: 'exact', head: true }),
        supabase.from('pixe_videos').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('pixe_videos').select('id', { count: 'exact', head: true }).in('status', ['uploading', 'processing', 'ready']),
        supabase.from('pixe_videos').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        readRows(
          supabase
            .from('pixe_video_stats_daily')
            .select('qualified_views,watch_time_ms,impressions')
            .eq('bucket_date', todayBucket)
        ),
        readRows(
          supabase
            .from('pixe_videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(18)
        ),
        readRows(
          supabase
            .from('pixe_channels')
            .select('*')
            .order('total_qualified_views', { ascending: false })
            .limit(8)
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_comment_reports')
            .select('id')
            .eq('review_status', 'pending')
            .limit(500)
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_video_reviews')
            .select('id')
            .in('status', ['needs_review', 'blocked'])
            .limit(500)
        ),
        readRowsOrEmpty(
          supabase
            .from('pixe_payout_requests')
            .select('id')
            .eq('status', 'pending')
            .limit(500)
        )
      ]);

      const syncedRecentRows = await Promise.all(recentRows.map((row) => syncMuxVideoState({ supabase, row })));
      const recentVideos = await hydrateVideos({ supabase, rows: syncedRecentRows, viewerUserId: context.user.id });
      const topChannelDecorations = await loadChannelDecorations(supabase, topChannelRows);

      return res.json({
        data: {
          config: {
            mux_video_configured: hasMuxVideoConfig(),
            mux_data_configured: hasMuxDataConfig(),
            mux_webhook_secret_configured: Boolean(safeString(process.env.MUX_WEBHOOK_SECRET).trim()),
            local_upload_fallback_enabled: hasLocalUploadFallback
          },
          counts: {
            channels: Number(channelCountRes.count || 0),
            videos: Number(videoCountRes.count || 0),
            published_videos: Number(publishedCountRes.count || 0),
            active_pipeline: Number(processingCountRes.count || 0),
            failed_videos: Number(failedCountRes.count || 0),
            qualified_views_today: sumBy(todayStats, 'qualified_views'),
            watch_time_today_ms: sumBy(todayStats, 'watch_time_ms'),
            impressions_today: sumBy(todayStats, 'impressions'),
            pending_comment_reports: pendingReportRows.length,
            pending_reviews: pendingReviewRows.length,
            pending_payout_requests: pendingPayoutRows.length
          },
          recent_videos: recentVideos,
          top_channels: topChannelRows.map((row) => topChannelDecorations.get(row.id) || {
            id: row.id,
            handle: row.handle,
            display_name: row.display_name || 'Creator',
            avatar_url: row.avatar_url || '/icons/urbanprime.svg',
            banner_url: row.banner_url || null,
            bio: row.bio || '',
            subscriber_count: Number(row.subscriber_count || 0),
            video_count: Number(row.video_count || 0),
            published_video_count: Number(row.published_video_count || 0),
            tip_enabled: Boolean(row.tip_enabled),
            membership_enabled: Boolean(row.membership_enabled)
          })
        }
      });
    } catch (error) {
      console.error('Load admin Pixe overview failed:', error);
      return res.status(500).json({ error: 'Unable to load admin Pixe overview.' });
    }
  });

  app.get('/admin/pixe/comment-reports', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const reviewStatus = safeString(req.query?.review_status || '').trim().toLowerCase();
      let reportsQuery = supabase
        .from('pixe_comment_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (reviewStatus) {
        reportsQuery = reportsQuery.eq('review_status', reviewStatus);
      }

      const reports = await readRowsOrEmpty(reportsQuery);
      const commentIds = Array.from(new Set(reports.map((row) => row.comment_id).filter(Boolean)));
      const comments = commentIds.length > 0
        ? await readRows(
          supabase
            .from('pixe_comments')
            .select('*')
            .in('id', commentIds)
        )
        : [];
      const videoIds = Array.from(new Set(comments.map((row) => row.video_id).filter(Boolean)));
      const userIds = Array.from(new Set(comments.map((row) => row.user_id).concat(reports.map((row) => row.reviewed_by)).filter(Boolean)));
      const [videos, users] = await Promise.all([
        videoIds.length > 0
          ? readRows(
            supabase
              .from('pixe_videos')
              .select('id,title,thumbnail_url,channel_id')
              .in('id', videoIds)
          )
          : Promise.resolve([]),
        userIds.length > 0
          ? readRows(
            supabase
              .from('users')
              .select('id,name,avatar_url')
              .in('id', userIds)
          )
          : Promise.resolve([])
      ]);

      const commentById = new Map(comments.map((row) => [row.id, row]));
      const videoById = new Map(videos.map((row) => [row.id, row]));
      const userById = new Map(users.map((row) => [row.id, row]));
      const grouped = [];
      const seen = new Set();

      reports.forEach((report) => {
        const commentId = safeString(report.comment_id).trim();
        if (!commentId || seen.has(commentId)) return;
        seen.add(commentId);
        const relatedReports = reports.filter((entry) => entry.comment_id === commentId);
        const comment = commentById.get(commentId) || null;
        const video = comment ? videoById.get(comment.video_id) || null : null;
        const author = comment ? userById.get(comment.user_id) || null : null;

        grouped.push({
          comment_id: commentId,
          report_count: relatedReports.length,
          reasons: Array.from(new Set(relatedReports.map((entry) => safeString(entry.reason).trim()).filter(Boolean))).slice(0, 5),
          review_status: safeString(relatedReports[0]?.review_status || 'pending').trim() || 'pending',
          latest_reported_at: relatedReports[0]?.created_at || null,
          reviewed_at: relatedReports[0]?.reviewed_at || null,
          admin_note: safeString(relatedReports[0]?.admin_note || '').trim(),
          comment: comment
            ? {
              id: comment.id,
              body: comment.body,
              status: comment.status,
              is_pinned: Boolean(comment.is_pinned),
              created_at: comment.created_at
            }
            : null,
          author: author
            ? {
              id: author.id,
              name: author.name || 'Viewer',
              avatar_url: author.avatar_url || '/icons/urbanprime.svg'
            }
            : null,
          video: video
            ? {
              id: video.id,
              title: video.title || 'Pixe clip',
              thumbnail_url: video.thumbnail_url || null
            }
            : null
        });
      });

      return res.json({ data: grouped });
    } catch (error) {
      console.error('Load admin Pixe comment reports failed:', error);
      return res.status(500).json({ error: 'Unable to load comment reports.' });
    }
  });

  app.post('/admin/pixe/comment-reports/:commentId/review', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const loaded = await loadCommentWithVideo(supabase, req.params.commentId);
      if (!loaded) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const action = safeString(req.body?.action).trim().toLowerCase();
      const adminNote = safeString(req.body?.admin_note || '').trim().slice(0, 280);
      const reviewStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
      let nextCommentStatus = loaded.comment.status;
      if (action === 'hide') nextCommentStatus = 'hidden';
      if (action === 'restore') nextCommentStatus = 'active';
      if (action === 'delete') nextCommentStatus = 'deleted';
      if (action === 'flag') nextCommentStatus = 'flagged';

      if (nextCommentStatus !== loaded.comment.status) {
        const { error } = await supabase
          .from('pixe_comments')
          .update({ status: nextCommentStatus })
          .eq('id', loaded.comment.id);
        if (error) throw error;
        await recalculateVideoCommentCount(supabase, loaded.video.id);
      }

      const { error } = await supabase
        .from('pixe_comment_reports')
        .update({
          review_status: reviewStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.user.id,
          admin_note: adminNote
        })
        .eq('comment_id', loaded.comment.id);
      if (error) throw error;

      return res.json({
        data: {
          comment_id: loaded.comment.id,
          status: nextCommentStatus,
          review_status: reviewStatus
        }
      });
    } catch (error) {
      console.error('Review admin Pixe comment report failed:', error);
      return res.status(500).json({ error: 'Unable to review this comment report.' });
    }
  });

  app.get('/admin/pixe/reviews', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const reviewType = safeString(req.query?.review_type || '').trim().toLowerCase();
      const reviewStatus = safeString(req.query?.status || '').trim().toLowerCase();
      let query = supabase
        .from('pixe_video_reviews')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(120);
      if (reviewType) query = query.eq('review_type', reviewType);
      if (reviewStatus) query = query.eq('status', reviewStatus);

      const rows = await readRowsOrEmpty(query);
      const videoIds = Array.from(new Set(rows.map((row) => row.video_id).filter(Boolean)));
      const videos = videoIds.length > 0
        ? await readRows(
          supabase
            .from('pixe_videos')
            .select('*')
            .in('id', videoIds)
        )
        : [];
      const hydratedVideos = await hydrateVideos({ supabase, rows: videos, viewerUserId: context.user.id });
      const videoById = new Map(hydratedVideos.map((row) => [row.id, row]));

      return res.json({
        data: rows.map((row) => ({
          ...row,
          video: videoById.get(row.video_id) || null
        }))
      });
    } catch (error) {
      console.error('Load admin Pixe reviews failed:', error);
      return res.status(500).json({ error: 'Unable to load review queue.' });
    }
  });

  app.post('/admin/pixe/reviews/:reviewId', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const row = await maybeSingleOrNull(
        supabase
          .from('pixe_video_reviews')
          .select('*')
          .eq('id', req.params.reviewId)
      );
      if (!row) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      const status = safeString(req.body?.status || row.status).trim().toLowerCase();
      const reviewerNote = safeString(req.body?.reviewer_note || '').trim().slice(0, 280);
      const { data, error } = await supabase
        .from('pixe_video_reviews')
        .update({
          status,
          reviewer_note: reviewerNote,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.user.id
        })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (['blocked', 'approved', 'clean'].includes(status)) {
        await supabase
          .from('pixe_videos')
          .update({ moderation_state: status })
          .eq('id', row.video_id);
      }

      return res.json({ data: data || null });
    } catch (error) {
      console.error('Review admin Pixe video review failed:', error);
      return res.status(500).json({ error: 'Unable to update this review.' });
    }
  });

  app.get('/admin/pixe/payout-requests', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const status = safeString(req.query?.status || '').trim().toLowerCase();
      let query = supabase
        .from('pixe_payout_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(120);
      if (status) query = query.eq('status', status);

      const rows = await readRowsOrEmpty(query);
      const channelIds = Array.from(new Set(rows.map((row) => row.channel_id).filter(Boolean)));
      const reviewerIds = Array.from(new Set(rows.map((row) => row.reviewed_by).filter(Boolean)));
      const [channels, users] = await Promise.all([
        channelIds.length > 0
          ? readRows(
            supabase
              .from('pixe_channels')
              .select('id,display_name,handle,avatar_url')
              .in('id', channelIds)
          )
          : Promise.resolve([]),
        reviewerIds.length > 0
          ? readRows(
            supabase
              .from('users')
              .select('id,name')
              .in('id', reviewerIds)
          )
          : Promise.resolve([])
      ]);
      const channelById = new Map(channels.map((row) => [row.id, row]));
      const userById = new Map(users.map((row) => [row.id, row]));

      return res.json({
        data: rows.map((row) => ({
          ...row,
          channel: channelById.get(row.channel_id) || null,
          reviewer: row.reviewed_by ? userById.get(row.reviewed_by) || null : null
        }))
      });
    } catch (error) {
      console.error('Load admin Pixe payout requests failed:', error);
      return res.status(500).json({ error: 'Unable to load payout requests.' });
    }
  });

  app.post('/admin/pixe/payout-requests/:requestId/review', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const request = await maybeSingleOrNull(
        supabase
          .from('pixe_payout_requests')
          .select('*')
          .eq('id', req.params.requestId)
      );
      if (!request) {
        return res.status(404).json({ error: 'Payout request not found.' });
      }

      const status = safeString(req.body?.status || '').trim().toLowerCase();
      if (!['pending', 'approved', 'rejected', 'paid'].includes(status)) {
        return res.status(400).json({ error: 'A valid payout review status is required.' });
      }

      const adminNote = safeString(req.body?.admin_note || '').trim().slice(0, 280);
      const { data, error } = await supabase
        .from('pixe_payout_requests')
        .update({
          status,
          admin_note: adminNote,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.user.id
        })
        .eq('id', request.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (status === 'paid') {
        const existingLedger = await maybeSingleOrNull(
          supabase
            .from('pixe_payout_ledger')
            .select('*')
            .eq('source_type', 'payout_request')
            .eq('source_id', request.id)
        );

        if (existingLedger) {
          await supabase
            .from('pixe_payout_ledger')
            .update({
              entry_type: 'debit',
              amount: request.amount,
              currency: request.currency,
              status: 'paid',
              paid_at: new Date().toISOString()
            })
            .eq('id', existingLedger.id);
        } else {
          await supabase
            .from('pixe_payout_ledger')
            .insert({
              channel_id: request.channel_id,
              source_type: 'payout_request',
              source_id: request.id,
              entry_type: 'debit',
              amount: request.amount,
              currency: request.currency,
              status: 'paid',
              paid_at: new Date().toISOString()
            });
        }
      }

      return res.json({ data: data || null });
    } catch (error) {
      console.error('Review admin Pixe payout request failed:', error);
      return res.status(500).json({ error: 'Unable to update payout request.' });
    }
  });

  app.post('/admin/pixe/videos/:videoId/sync', requireAuth, async (req, res) => {
    try {
      if (typeof resolveAdminContext !== 'function') {
        return res.status(403).json({ error: 'Admin access is required.' });
      }

      const context = await resolveAdminContext(req);
      if (context?.error) {
        return res.status(403).json({ error: context.error.message || 'Admin access is required.' });
      }

      const row = await maybeSingle(
        supabase
          .from('pixe_videos')
          .select('*')
          .eq('id', req.params.videoId)
      );
      if (!row) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      const syncedRow = await syncMuxVideoState({ supabase, row });
      const [video] = await hydrateVideos({ supabase, rows: [syncedRow], viewerUserId: context.user.id });
      return res.json({ data: video });
    } catch (error) {
      console.error('Admin Pixe sync failed:', error);
      return res.status(500).json({ error: 'Unable to sync this Pixe video.' });
    }
  });
}
