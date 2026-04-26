import { auth } from '../firebase';
import { dataModeConfig, prefersSupabase } from './dataMode';

type QueuedWriteRequest = {
  id: string;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string | null;
  contentType: string | null;
  token?: string;
  createdAt: string;
};

type CachedReadEntry = {
  key: string;
  namespace: string;
  path: string;
  payload: any;
  cachedAt: number;
  expiresAt: number;
};

type BackendFetchOptions = RequestInit & {
  backendNoQueue?: boolean;
  backendNoCache?: boolean;
};

const BACKEND_LAST_OK_KEY = 'urbanprime_backend_last_ok_v1';
const BACKEND_OVERRIDE_KEY = 'urbanprime_backend_override_v1';
const BACKEND_QUEUE_KEY = 'urbanprime_backend_write_queue_v1';
const BACKEND_QUEUE_EVENT = 'urbanprime:backend-queue';
const BACKEND_READ_CACHE_KEY = 'urbanprime_backend_read_cache_v1';
const BACKEND_QUEUE_MAX_ITEMS = 500;
const BACKEND_READ_CACHE_MAX_ITEMS = 250;
const BACKEND_HEALTH_TIMEOUT_MS = 1800;
const BACKEND_RETRY_INTERVAL_MS = 20000;
const DEFAULT_BACKEND_READ_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_BACKEND_REQUEST_TIMEOUT_MS = 12_000;
const CANDIDATE_DEFAULT_COOLDOWN_MS = 30_000;
const CANDIDATE_NOT_FOUND_COOLDOWN_MS = 90_000;
const CANDIDATE_RATE_LIMIT_MIN_COOLDOWN_MS = 5_000;
const CANDIDATE_RATE_LIMIT_MAX_COOLDOWN_MS = 300_000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_CANDIDATE_STATUS_CODES = new Set([404, 405, 408, 425, 500, 502, 503, 504]);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UNIFIED_PROFILE_CACHE_PREFIX = 'urbanprime_unified_profile_cache_v2:';

let activeBackendBaseUrl = '';
let resolveBackendPromise: Promise<string> | null = null;
let flushQueuePromise: Promise<void> | null = null;
let syncListenersInitialized = false;
const candidateCooldownUntil = new Map<string, number>();

const isBrowserRuntime = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeBaseUrl = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/$/, '');
};

const parseCandidateList = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .split(/[,\n; ]+/g)
    .map((entry) => normalizeBaseUrl(entry))
    .filter(Boolean);
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const BACKEND_READ_CACHE_TTL_MS = parsePositiveInt(
  (import.meta.env.VITE_BACKEND_READ_CACHE_TTL_MS as string | undefined),
  DEFAULT_BACKEND_READ_CACHE_TTL_MS
);

const BACKEND_REQUEST_TIMEOUT_MS = parsePositiveInt(
  (import.meta.env.VITE_BACKEND_REQUEST_TIMEOUT_MS as string | undefined),
  DEFAULT_BACKEND_REQUEST_TIMEOUT_MS
);

const parseHostMappedCandidates = (value: string | null | undefined) => {
  if (!value) return new Map<string, string[]>();
  const map = new Map<string, string[]>();
  value
    .split(/[;\n]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [hostRaw, urlsRaw] = entry.split('=');
      const host = String(hostRaw || '').trim().toLowerCase();
      if (!host || !urlsRaw) return;
      const urls = urlsRaw
        .split(/[|, ]+/g)
        .map((url) => normalizeBaseUrl(url))
        .filter(Boolean);
      if (urls.length === 0) return;
      map.set(host, urls);
    });
  return map;
};

const nowMs = () => Date.now();

const getCandidateCooldownUntil = (candidate: string) => {
  const value = candidateCooldownUntil.get(candidate);
  if (!value) return 0;
  if (value <= nowMs()) {
    candidateCooldownUntil.delete(candidate);
    return 0;
  }
  return value;
};

const markCandidateCooldown = (candidate: string, ms: number) => {
  if (!candidate || ms <= 0) return;
  candidateCooldownUntil.set(candidate, nowMs() + ms);
};

const clearCandidateCooldown = (candidate: string) => {
  if (!candidate) return;
  candidateCooldownUntil.delete(candidate);
};

const getAvailableCandidates = (candidates: string[]) => {
  const now = nowMs();
  return candidates.filter((candidate) => {
    const cooldownUntil = candidateCooldownUntil.get(candidate) || 0;
    if (cooldownUntil <= now) {
      candidateCooldownUntil.delete(candidate);
      return true;
    }
    return false;
  });
};

const parseRetryAfterMs = (value: string | null) => {
  if (!value) return CANDIDATE_RATE_LIMIT_MIN_COOLDOWN_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.max(seconds * 1000, CANDIDATE_RATE_LIMIT_MIN_COOLDOWN_MS), CANDIDATE_RATE_LIMIT_MAX_COOLDOWN_MS);
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    const diff = dateMs - nowMs();
    return Math.min(Math.max(diff, CANDIDATE_RATE_LIMIT_MIN_COOLDOWN_MS), CANDIDATE_RATE_LIMIT_MAX_COOLDOWN_MS);
  }

  return CANDIDATE_RATE_LIMIT_MIN_COOLDOWN_MS;
};

const uniqueUrls = (urls: string[]) => Array.from(new Set(urls.filter(Boolean)));

const isSameOriginAllowed = () => {
  if (!isBrowserRuntime()) return false;
  const raw = String(import.meta.env.VITE_BACKEND_ALLOW_SAME_ORIGIN || '')
    .trim()
    .toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return false;
};

const isUrbanPrimeBetaHost = () => {
  if (!isBrowserRuntime()) return false;
  return String(window.location.hostname || '').trim().toLowerCase() === 'urbanprimebeta.vercel.app';
};

const isLocalBrowserHost = () => {
  if (!isBrowserRuntime()) return false;
  const hostname = String(window.location.hostname || '').trim().toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const isSameOriginCandidate = (candidate: string) => {
  if (!isBrowserRuntime()) return false;
  const sameOrigin = normalizeBaseUrl(window.location.origin);
  return Boolean(sameOrigin && normalizeBaseUrl(candidate) === sameOrigin);
};

const shouldSkipCandidate = (candidate: string) => {
  if (!candidate) return true;
  if (isSameOriginCandidate(candidate) && !isSameOriginAllowed() && !isUrbanPrimeBetaHost()) return true;
  return false;
};

const getStorageValue = (key: string) => {
  if (!isBrowserRuntime()) return '';
  try {
    return normalizeBaseUrl(window.localStorage.getItem(key));
  } catch {
    return '';
  }
};

const setStorageValue = (key: string, value: string) => {
  if (!isBrowserRuntime()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore persistence failures
  }
};

const getBackendApiKey = () => (import.meta.env.VITE_BACKEND_API_KEY as string | undefined)?.trim();

const getPersistedFirebaseUid = () => {
  if (!isBrowserRuntime()) return '';
  if (auth.currentUser?.uid) return String(auth.currentUser.uid).trim();

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = String(window.localStorage.key(index) || '');
      if (!key.startsWith('firebase:authUser:')) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const uid = String(parsed?.uid || '').trim();
      if (uid) return uid;
    }
  } catch {
    // ignore local auth cache parse failures
  }

  try {
    const fallbackKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = String(window.localStorage.key(index) || '');
      if (key.startsWith(UNIFIED_PROFILE_CACHE_PREFIX)) {
        fallbackKeys.push(key);
      }
    }
    if (fallbackKeys.length === 1) {
      return fallbackKeys[0].slice(UNIFIED_PROFILE_CACHE_PREFIX.length).trim();
    }
  } catch {
    // ignore unified profile cache lookup failures
  }

  return '';
};

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const dispatchQueueEvent = (count: number) => {
  if (!isBrowserRuntime()) return;
  window.dispatchEvent(new CustomEvent(BACKEND_QUEUE_EVENT, { detail: { pending: count } }));
};

const loadQueue = (): QueuedWriteRequest[] => {
  if (!isBrowserRuntime()) return [];
  try {
    const raw = window.localStorage.getItem(BACKEND_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        id: String(entry?.id || ''),
        path: String(entry?.path || ''),
        method: String(entry?.method || 'POST').toUpperCase() as QueuedWriteRequest['method'],
        body: entry?.body == null ? null : String(entry.body),
        contentType: entry?.contentType == null ? null : String(entry.contentType),
        token: entry?.token ? String(entry.token) : undefined,
        createdAt: String(entry?.createdAt || new Date().toISOString())
      }))
      .filter((entry) => entry.id && entry.path && MUTATING_METHODS.has(entry.method));
  } catch {
    return [];
  }
};

const persistQueue = (queue: QueuedWriteRequest[]) => {
  if (!isBrowserRuntime()) return;
  try {
    const next = queue.slice(-BACKEND_QUEUE_MAX_ITEMS);
    window.localStorage.setItem(BACKEND_QUEUE_KEY, JSON.stringify(next));
    dispatchQueueEvent(next.length);
  } catch {
    // ignore persistence failures
  }
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingLength);
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(padded);
    }
    return globalThis.atob(padded);
  } catch {
    return '';
  }
};

const resolveTokenNamespace = (token?: string) => {
  if (!token) return 'anon';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 'anon';
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const subject = String(payload?.user_id || payload?.sub || '').trim();
    if (!subject) return 'anon';
    return subject;
  } catch {
    return 'anon';
  }
};

const buildReadCacheKey = (namespace: string, path: string) => `${namespace}:${path}`;

const loadReadCache = (): CachedReadEntry[] => {
  if (!isBrowserRuntime()) return [];
  try {
    const raw = window.localStorage.getItem(BACKEND_READ_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = nowMs();
    return parsed
      .map((entry) => ({
        key: String(entry?.key || ''),
        namespace: String(entry?.namespace || ''),
        path: String(entry?.path || ''),
        payload: entry?.payload,
        cachedAt: Number(entry?.cachedAt || 0),
        expiresAt: Number(entry?.expiresAt || 0)
      }))
      .filter((entry) => entry.key && entry.path && entry.expiresAt > now);
  } catch {
    return [];
  }
};

const persistReadCache = (entries: CachedReadEntry[]) => {
  if (!isBrowserRuntime()) return;
  try {
    const now = nowMs();
    const pruned = entries
      .filter((entry) => entry.expiresAt > now)
      .sort((left, right) => right.cachedAt - left.cachedAt)
      .slice(0, BACKEND_READ_CACHE_MAX_ITEMS);
    window.localStorage.setItem(BACKEND_READ_CACHE_KEY, JSON.stringify(pruned));
  } catch {
    // ignore cache persistence failures
  }
};

const readCachedResponse = (path: string, token?: string) => {
  const namespace = resolveTokenNamespace(token);
  const key = buildReadCacheKey(namespace, path);
  const cached = loadReadCache().find((entry) => entry.key === key);
  if (!cached) return null;
  return cached.payload;
};

const writeCachedResponse = (path: string, payload: any, token?: string) => {
  if (!path || path === '/health') return;
  const namespace = resolveTokenNamespace(token);
  const key = buildReadCacheKey(namespace, path);
  const now = nowMs();
  const cache = loadReadCache().filter((entry) => entry.key !== key);
  cache.unshift({
    key,
    namespace,
    path,
    payload,
    cachedAt: now,
    expiresAt: now + BACKEND_READ_CACHE_TTL_MS
  });
  persistReadCache(cache);
};

const invalidateReadCacheByApiPath = (path: string, token?: string) => {
  const namespace = resolveTokenNamespace(token);
  const cache = loadReadCache();

  if (path.startsWith('/spotlight/')) {
    const next = cache.filter((entry) => !(entry.namespace === namespace && entry.path.startsWith('/spotlight/')));
    if (next.length !== cache.length) {
      persistReadCache(next);
    }
    return;
  }

  if (path.startsWith('/pixe/')) {
    const next = cache.filter((entry) => !(entry.namespace === namespace && entry.path.startsWith('/pixe/')));
    if (next.length !== cache.length) {
      persistReadCache(next);
    }
    return;
  }

  if (!path.startsWith('/api/')) return;
  const tableMatch = /^\/api\/([^/?]+)/.exec(path);
  if (!tableMatch) return;
  const tablePrefix = `/api/${tableMatch[1]}`;
  const next = cache.filter((entry) => !(entry.namespace === namespace && entry.path.startsWith(tablePrefix)));
  if (next.length !== cache.length) {
    persistReadCache(next);
  }
};

const mergeRowsById = (currentRows: any[], updates: any[]) => {
  const map = new Map<string, any>();
  currentRows.forEach((row) => {
    const id = String(row?.id || '');
    if (id) map.set(id, row);
  });
  updates.forEach((row) => {
    const id = String(row?.id || '');
    if (!id) return;
    map.set(id, { ...(map.get(id) || {}), ...row });
  });
  return Array.from(map.values());
};

const applyOptimisticMutationToReadCache = (
  path: string,
  method: string,
  contentType: string | null,
  body: string | null,
  token?: string
) => {
  if (!path.startsWith('/api/')) return;
  const namespace = resolveTokenNamespace(token);
  const cache = loadReadCache();
  const tableMatch = /^\/api\/([^/?]+)(?:\/([^/?]+))?/.exec(path);
  if (!tableMatch) return;
  const tablePrefix = `/api/${tableMatch[1]}`;
  const rowId = tableMatch[2] ? decodeURIComponent(tableMatch[2]) : '';
  const parsed = parseJsonBody(contentType, body);
  if (!parsed) return;

  let mutated = false;
  const next = cache.map((entry) => {
    if (entry.namespace !== namespace || !entry.path.startsWith(tablePrefix)) {
      return entry;
    }
    if (!entry.payload || typeof entry.payload !== 'object') {
      return entry;
    }

    const payload = entry.payload as { data?: any; count?: number };
    const rows = Array.isArray(payload.data) ? payload.data : null;
    const single = rows ? null : payload.data && typeof payload.data === 'object' ? payload.data : null;

    if (method === 'POST' && rows) {
      const updates = Array.isArray(parsed) ? parsed : [parsed];
      const mergedRows = mergeRowsById(rows, updates);
      mutated = true;
      return { ...entry, payload: { ...payload, data: mergedRows, count: Number(payload.count || mergedRows.length) }, cachedAt: nowMs() };
    }

    if (method === 'PATCH') {
      if (rows) {
        const updates = Array.isArray(parsed) ? parsed : [parsed];
        const mergedRows = mergeRowsById(rows, updates);
        mutated = true;
        return { ...entry, payload: { ...payload, data: mergedRows }, cachedAt: nowMs() };
      }
      if (single && (!rowId || String(single.id || '') === rowId)) {
        mutated = true;
        return { ...entry, payload: { ...payload, data: { ...single, ...(Array.isArray(parsed) ? parsed[0] : parsed) } }, cachedAt: nowMs() };
      }
    }

    if (method === 'DELETE') {
      if (rows && rowId) {
        const filteredRows = rows.filter((row) => String(row?.id || '') !== rowId);
        if (filteredRows.length !== rows.length) {
          mutated = true;
          return { ...entry, payload: { ...payload, data: filteredRows, count: Math.max(Number(payload.count || filteredRows.length) - 1, 0) }, cachedAt: nowMs() };
        }
      }
      if (single && rowId && String(single.id || '') === rowId) {
        mutated = true;
        return { ...entry, payload: { ...payload, data: null }, cachedAt: nowMs() };
      }
    }

    return entry;
  });

  if (mutated) {
    persistReadCache(next);
  }
};

const getBackendCandidates = () => {
  const candidates: string[] = [];
  const hostMappedCandidates = parseHostMappedCandidates(import.meta.env.VITE_BACKEND_HOST_MAP as string | undefined);
  const urbanPrimeBetaBackend = normalizeBaseUrl(import.meta.env.VITE_URBANPRIMEBETA_BACKEND_URL as string | undefined);
  const localBrowserCandidates = isLocalBrowserHost()
    ? [
      'http://127.0.0.1:5050',
      'http://localhost:5050',
      'http://127.0.0.1:5052',
      'http://localhost:5052',
      'http://127.0.0.1:5051',
      'http://localhost:5051'
    ]
    : [];

  const overrideUrl = getStorageValue(BACKEND_OVERRIDE_KEY);
  const lastHealthyUrl = getStorageValue(BACKEND_LAST_OK_KEY);
  const envPrimary = parseCandidateList((import.meta.env.VITE_BACKEND_URL as string | undefined) || '');
  const envCandidates = parseCandidateList((import.meta.env.VITE_BACKEND_CANDIDATES as string | undefined) || '');

  if (overrideUrl && !shouldSkipCandidate(overrideUrl)) {
    candidates.push(overrideUrl);
  } else if (overrideUrl && isBrowserRuntime()) {
    try {
      window.localStorage.removeItem(BACKEND_OVERRIDE_KEY);
    } catch {
      // ignore storage failures
    }
  }
  candidates.push(...localBrowserCandidates);
  if (activeBackendBaseUrl) candidates.push(activeBackendBaseUrl);
  if (lastHealthyUrl && !shouldSkipCandidate(lastHealthyUrl)) {
    candidates.push(lastHealthyUrl);
  } else if (lastHealthyUrl && isBrowserRuntime()) {
    try {
      window.localStorage.removeItem(BACKEND_LAST_OK_KEY);
    } catch {
      // ignore storage failures
    }
  }
  candidates.push(...envPrimary);
  candidates.push(...envCandidates);

  if (isBrowserRuntime()) {
    const hostname = String(window.location.hostname || '').trim().toLowerCase();
    if (hostname) {
      hostMappedCandidates.forEach((mappedUrls, hostPattern) => {
        if (hostname === hostPattern || hostname.endsWith(`.${hostPattern}`)) {
          candidates.push(...mappedUrls);
        }
      });

      if (hostname === 'urbanprimebeta.vercel.app' && urbanPrimeBetaBackend) {
        candidates.push(urbanPrimeBetaBackend);
      }
      if (hostname === 'urbanprimebeta.vercel.app') {
        candidates.push(normalizeBaseUrl(window.location.origin));
      }
    }

    try {
      const queryUrl = normalizeBaseUrl(new URL(window.location.href).searchParams.get('backend'));
      if (queryUrl) {
        candidates.unshift(queryUrl);
        setStorageValue(BACKEND_OVERRIDE_KEY, queryUrl);
      }
    } catch {
      // ignore URL parsing failures
    }

    const allowSameOrigin = isSameOriginAllowed();
    const sameOrigin = normalizeBaseUrl(window.location.origin);
    if (allowSameOrigin && sameOrigin && !sameOrigin.startsWith('file://')) {
      candidates.push(sameOrigin);
    }
  }

  if (import.meta.env.DEV) {
    candidates.push('http://localhost:5050');
  }

  return uniqueUrls(candidates).filter((candidate) => !shouldSkipCandidate(candidate));
};

const createHeaders = (headersInput: HeadersInit | undefined, body: BodyInit | null | undefined, token?: string) => {
  const headers = new Headers(headersInput || {});
  if (!headers.has('Content-Type') && body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const firebaseUid = getPersistedFirebaseUid();
  if (firebaseUid && !headers.has('x-firebase-uid')) {
    headers.set('x-firebase-uid', firebaseUid);
  }
  const backendKey = getBackendApiKey();
  if (backendKey) {
    headers.set('x-backend-key', backendKey);
  }
  return headers;
};

const parseResponsePayload = async (response: Response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const checkHealth = async (baseUrl: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal
    });
    if (!response.ok) return false;
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) return false;
    const payload = await response.json().catch(() => null);
    return payload?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const isQueueSupportedBody = (body: BodyInit | null | undefined) => {
  if (!body) return true;
  if (typeof body === 'string') return true;
  if (body instanceof URLSearchParams) return true;
  return false;
};

const parseJsonBody = (contentType: string | null, body: string | null) => {
  if (!body || !contentType || !contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

const buildQueuedOptimisticPayload = (
  path: string,
  method: string,
  contentType: string | null,
  body: string | null
) => {
  const parsed = parseJsonBody(contentType, body);
  const apiCreateMatch = /^\/api\/([^/?]+)$/.exec(path);
  const apiRowMatch = /^\/api\/([^/?]+)\/([^/?]+)$/.exec(path);

  if (method === 'POST' && apiCreateMatch && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (!('id' in parsed)) {
      (parsed as Record<string, unknown>).id = createClientId();
    }
    return {
      body: JSON.stringify(parsed),
      response: { data: [parsed], queued: true, offline: true }
    };
  }

  if (method === 'PATCH' && apiRowMatch && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (!('id' in parsed)) {
      (parsed as Record<string, unknown>).id = decodeURIComponent(apiRowMatch[2]);
    }
    return {
      body: JSON.stringify(parsed),
      response: { data: [parsed], queued: true, offline: true }
    };
  }

  if (method === 'DELETE' && apiRowMatch) {
    return {
      body,
      response: { data: null, queued: true, offline: true }
    };
  }

  return {
    body,
    response: {
      data: parsed ?? null,
      queued: true,
      offline: true
    }
  };
};

const enqueueWriteRequest = (request: QueuedWriteRequest) => {
  applyOptimisticMutationToReadCache(request.path, request.method, request.contentType, request.body, request.token);
  const queue = loadQueue();
  queue.push(request);
  persistQueue(queue);
};

const shouldQueueOnFailure = (errorOrStatus: number | Error) => {
  if (typeof errorOrStatus === 'number') {
    return RETRYABLE_STATUS_CODES.has(errorOrStatus) || errorOrStatus === 404 || errorOrStatus === 405;
  }
  return true;
};

const shouldTreatAsConflictSuccess = (payload: any) => {
  const message = String(payload?.error || payload?.message || '').toLowerCase();
  return message.includes('duplicate key') || message.includes('already exists') || message.includes('23505');
};

const executeRequest = async (
  baseUrl: string,
  path: string,
  method: string,
  options: RequestInit,
  body: BodyInit | null | undefined,
  token?: string
) => {
  const headers = createHeaders(options.headers, body, token);
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), BACKEND_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      method,
      body,
      headers,
      credentials: 'include',
      signal: controller.signal
    });

    const payload = await parseResponsePayload(response);
    return { response, payload };
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortFromExternal);
    }
  }
};

const isValidBackendPayload = (response: Response, payload: any) => {
  if (response.status === 204) return true;

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) return true;

  const raw = typeof payload?.raw === 'string' ? payload.raw.trim().toLowerCase() : '';
  if (!raw) return false;

  if (raw.startsWith('<!doctype html') || raw.startsWith('<html')) {
    return false;
  }

  return false;
};

const resolveBackendInternal = async (forceRefresh = false) => {
  if (!forceRefresh && activeBackendBaseUrl) {
    return activeBackendBaseUrl;
  }

  const candidates = getBackendCandidates();
  if (candidates.length === 0) {
    activeBackendBaseUrl = '';
    return '';
  }

  const preferredCandidates = getAvailableCandidates(candidates);
  const probeList = preferredCandidates.length > 0 ? preferredCandidates : candidates;

  for (const candidate of probeList) {
    if (await checkHealth(candidate)) {
      activeBackendBaseUrl = candidate;
      setStorageValue(BACKEND_LAST_OK_KEY, candidate);
      clearCandidateCooldown(candidate);
      return candidate;
    }
    markCandidateCooldown(candidate, CANDIDATE_DEFAULT_COOLDOWN_MS);
  }

  const fallback = probeList[0] || candidates[0] || '';
  activeBackendBaseUrl = fallback;
  return fallback;
};

export const getBackendBaseUrl = () => activeBackendBaseUrl || getBackendCandidates()[0] || '';

export const resolveBackendBaseUrl = async (forceRefresh = false) => {
  if (!forceRefresh && activeBackendBaseUrl) {
    return activeBackendBaseUrl;
  }
  if (resolveBackendPromise && !forceRefresh) {
    return resolveBackendPromise;
  }
  resolveBackendPromise = resolveBackendInternal(forceRefresh);
  try {
    return await resolveBackendPromise;
  } finally {
    resolveBackendPromise = null;
  }
};

export const getQueuedBackendWriteCount = () => loadQueue().length;

export const flushQueuedBackendWrites = async (latestToken?: string) => {
  if (!isBrowserRuntime()) return;
  const queue = loadQueue();
  if (queue.length === 0) return;
  if (flushQueuePromise) {
    return flushQueuePromise;
  }

  flushQueuePromise = (async () => {
    const baseUrl = await resolveBackendBaseUrl();
    if (!baseUrl) return;

    const pending = loadQueue();
    if (pending.length === 0) return;

    const remaining: QueuedWriteRequest[] = [];

    for (let index = 0; index < pending.length; index += 1) {
      const item = pending[index];
      const requestToken = latestToken || item.token;
      try {
        const { response, payload } = await executeRequest(
          baseUrl,
          item.path,
          item.method,
          { headers: item.contentType ? { 'Content-Type': item.contentType } : undefined },
          item.body,
          requestToken
        );

        if (response.ok || shouldTreatAsConflictSuccess(payload)) {
          invalidateReadCacheByApiPath(item.path, requestToken);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          invalidateReadCacheByApiPath(item.path, requestToken);
          continue;
        }

        remaining.push(item, ...pending.slice(index + 1));
        break;
      } catch {
        remaining.push(item, ...pending.slice(index + 1));
        activeBackendBaseUrl = '';
        break;
      }
    }

    persistQueue(remaining);
  })();

  try {
    await flushQueuePromise;
  } finally {
    flushQueuePromise = null;
  }
};

const initializeQueueSync = () => {
  if (!isBrowserRuntime() || syncListenersInitialized) return;
  syncListenersInitialized = true;

  window.addEventListener('online', () => {
    void resolveBackendBaseUrl(true).then(() => flushQueuedBackendWrites());
  });

  window.addEventListener('focus', () => {
    void flushQueuedBackendWrites();
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void flushQueuedBackendWrites();
      }
    });
  }

  window.setInterval(() => {
    void flushQueuedBackendWrites();
  }, BACKEND_RETRY_INTERVAL_MS);
};

initializeQueueSync();

export const isBackendConfigured = () => Boolean(getBackendBaseUrl());

export const shouldUseBackend = () => {
  if (!prefersSupabase()) return false;
  return isBackendConfigured() || dataModeConfig.requireBackend;
};

export const backendFetch = async (
  path: string,
  options: BackendFetchOptions = {},
  token?: string
) => {
  initializeQueueSync();

  const { backendNoQueue = false, backendNoCache = false, ...requestOptions } = options;
  const method = String(requestOptions.method || 'GET').toUpperCase();
  const isReadRequest = method === 'GET';
  const shouldQueue = MUTATING_METHODS.has(method) && !backendNoQueue;
  const initialBody = requestOptions.body ?? null;

  if (shouldQueue && !isQueueSupportedBody(initialBody)) {
    throw new Error('This request type cannot be queued offline. Retry when backend is available.');
  }

  const contentType = (() => {
    const normalizedHeaders = new Headers(requestOptions.headers || {});
    if (!normalizedHeaders.has('Content-Type') && initialBody && !(initialBody instanceof FormData) && !(initialBody instanceof URLSearchParams)) {
      normalizedHeaders.set('Content-Type', 'application/json');
    }
    return normalizedHeaders.get('Content-Type');
  })();

  const optimistic = shouldQueue
    ? buildQueuedOptimisticPayload(path, method, contentType, initialBody ? String(initialBody) : null)
    : { body: initialBody, response: null as any };

  const requestBody = optimistic.body;
  let baseUrl = await resolveBackendBaseUrl();

  if (!baseUrl) {
    if (isReadRequest && !backendNoCache) {
      const cachedPayload = readCachedResponse(path, token);
      if (cachedPayload !== null) {
        return cachedPayload;
      }
    }

    if (shouldQueue) {
      enqueueWriteRequest({
        id: createClientId(),
        path,
        method: method as QueuedWriteRequest['method'],
        body: requestBody ? String(requestBody) : null,
        contentType,
        token,
        createdAt: new Date().toISOString()
      });
      return optimistic.response;
    }

    if (dataModeConfig.requireBackend) {
      throw new Error('Backend URL not configured. Set VITE_BACKEND_URL or VITE_BACKEND_CANDIDATES.');
    }
    throw new Error('Backend unavailable in current data mode.');
  }

  const candidates = uniqueUrls([baseUrl, ...getBackendCandidates()]);
  const activeCandidates = getAvailableCandidates(candidates);
  const candidatesToTry = activeCandidates.length > 0 ? activeCandidates : candidates;
  let lastResponsePayload: any = null;
  let lastStatus = 0;
  let preferredResponsePayload: any = null;
  let preferredStatus = 0;

  for (const candidate of candidatesToTry) {
    try {
      const { response, payload } = await executeRequest(
        candidate,
        path,
        method,
        requestOptions,
        requestBody,
        token
      );

      lastResponsePayload = payload;
      lastStatus = response.status;
      if (response.status !== 404 && response.status !== 405) {
        preferredResponsePayload = payload;
        preferredStatus = response.status;
      }

      if (response.ok && isValidBackendPayload(response, payload)) {
        activeBackendBaseUrl = candidate;
        setStorageValue(BACKEND_LAST_OK_KEY, candidate);
        clearCandidateCooldown(candidate);
        if (isReadRequest && !backendNoCache) {
          writeCachedResponse(path, payload, token);
        } else {
          invalidateReadCacheByApiPath(path, token);
        }
        if (getQueuedBackendWriteCount() > 0) {
          void flushQueuedBackendWrites(token);
        }
        return payload;
      }

      if (response.ok) {
        activeBackendBaseUrl = '';
        markCandidateCooldown(candidate, CANDIDATE_DEFAULT_COOLDOWN_MS);
        continue;
      }

      if (response.status === 404 || response.status === 405) {
        markCandidateCooldown(candidate, CANDIDATE_NOT_FOUND_COOLDOWN_MS);
      } else if (response.status === 429) {
        markCandidateCooldown(candidate, parseRetryAfterMs(response.headers.get('retry-after')));
        break;
      } else if (RETRYABLE_STATUS_CODES.has(response.status)) {
        markCandidateCooldown(candidate, CANDIDATE_DEFAULT_COOLDOWN_MS);
      }

      const canRetryCandidate = RETRYABLE_CANDIDATE_STATUS_CODES.has(response.status);
      if (!canRetryCandidate) {
        break;
      }
    } catch (error) {
      activeBackendBaseUrl = '';
      markCandidateCooldown(candidate, CANDIDATE_DEFAULT_COOLDOWN_MS);
      lastResponsePayload = error;
      lastStatus = 0;
    }
  }

  if (preferredStatus) {
    lastResponsePayload = preferredResponsePayload;
    lastStatus = preferredStatus;
  }

  if (shouldQueue && shouldQueueOnFailure(lastStatus || new Error('network'))) {
    enqueueWriteRequest({
      id: createClientId(),
      path,
      method: method as QueuedWriteRequest['method'],
      body: requestBody ? String(requestBody) : null,
      contentType,
      token,
      createdAt: new Date().toISOString()
    });
    return optimistic.response;
  }

  if (isReadRequest && !backendNoCache) {
    const cachedPayload = readCachedResponse(path, token);
    if (cachedPayload !== null) {
      return cachedPayload;
    }
  }

  const message = lastResponsePayload?.error || lastResponsePayload?.message || (lastStatus ? `Backend error ${lastStatus}` : 'Backend request failed');
  throw new Error(message);
};
