import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';

type BackendUserIdentityRow = {
  id?: string | null;
  firebase_uid?: string | null;
};

const USER_LOOKUP_SELECT = 'id,firebase_uid';
const LOOKUP_MISS_TTL_MS = 20_000;
const backendUserIdByFrontendId = new Map<string, string>();
const frontendUserIdByBackendId = new Map<string, string>();
const lookupMissUntil = new Map<string, number>();

export const isUuidLike = (value?: string | null) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const cacheIdentity = (row: BackendUserIdentityRow | null | undefined) => {
  const backendUserId = String(row?.id || '').trim();
  const frontendUserId = String(row?.firebase_uid || '').trim();

  if (backendUserId && frontendUserId) {
    backendUserIdByFrontendId.set(frontendUserId, backendUserId);
    frontendUserIdByBackendId.set(backendUserId, frontendUserId);
    lookupMissUntil.delete(frontendUserId);
    lookupMissUntil.delete(backendUserId);
  }
};

const getCachedIdentity = (identifier: string) => {
  const normalized = String(identifier || '').trim();
  if (!normalized) return null;

  if (isUuidLike(normalized)) {
    const frontendUserId = frontendUserIdByBackendId.get(normalized);
    return frontendUserId ? { id: normalized, firebase_uid: frontendUserId } : null;
  }

  const backendUserId = backendUserIdByFrontendId.get(normalized);
  return backendUserId ? { id: backendUserId, firebase_uid: normalized } : null;
};

const isLookupCoolingDown = (identifier: string) => {
  const until = lookupMissUntil.get(identifier) || 0;
  if (until <= Date.now()) {
    lookupMissUntil.delete(identifier);
    return false;
  }
  return true;
};

const markLookupMiss = (identifier: string) => {
  if (!identifier) return;
  lookupMissUntil.set(identifier, Date.now() + LOOKUP_MISS_TTL_MS);
};

const fetchIdentityRow = async (identifier: string): Promise<BackendUserIdentityRow | null> => {
  const normalized = String(identifier || '').trim();
  if (!normalized || !isBackendConfigured()) return null;

  const cached = getCachedIdentity(normalized);
  if (cached) return cached;
  if (isLookupCoolingDown(normalized)) return null;

  const token = await getToken();
  const queries = isUuidLike(normalized)
    ? [`/api/users?id=${encodeURIComponent(normalized)}&select=${USER_LOOKUP_SELECT}&limit=1`]
    : [
        `/api/users?firebase_uid=${encodeURIComponent(normalized)}&select=${USER_LOOKUP_SELECT}&limit=1`,
        `/api/users?id=${encodeURIComponent(normalized)}&select=${USER_LOOKUP_SELECT}&limit=1`
      ];

  for (const query of queries) {
    const response = await backendFetch(query, {}, token).catch(() => null);
    const rows = Array.isArray(response?.data) ? response.data : [];
    const row = rows[0] || null;
    if (row?.id || row?.firebase_uid) {
      cacheIdentity(row);
      return row;
    }
  }

  markLookupMiss(normalized);
  return null;
};

export const resolveBackendUserId = async (identifier: string): Promise<string> => {
  const normalized = String(identifier || '').trim();
  if (!normalized || !isBackendConfigured()) return normalized;
  if (isUuidLike(normalized)) return normalized;

  const row = await fetchIdentityRow(normalized);
  return String(row?.id || normalized).trim() || normalized;
};

export const resolveFrontendUserId = async (identifier: string): Promise<string> => {
  const normalized = String(identifier || '').trim();
  if (!normalized || !isBackendConfigured()) return normalized;
  if (!isUuidLike(normalized)) return normalized;

  const row = await fetchIdentityRow(normalized);
  return String(row?.firebase_uid || normalized).trim() || normalized;
};

export const resolveBackendUserLookupKeys = async (identifier: string): Promise<string[]> => {
  const normalized = String(identifier || '').trim();
  if (!normalized) return [];

  const backendUserId = await resolveBackendUserId(normalized);
  return Array.from(new Set([normalized, backendUserId].map((value) => String(value || '').trim()).filter(Boolean)));
};
