import type { RuntimeAvailabilitySnapshot } from '../types';
import {
  getBackendBaseUrl,
  getQueuedBackendWriteCount,
  isBackendConfigured,
  resolveBackendBaseUrl
} from './backendClient';
import { dataModeConfig, shouldUseFirestoreFallback, shouldUseLocalMockFallback } from './dataMode';

const HEALTH_TIMEOUT_MS = 2500;

const probeBackendHealth = async (baseUrl: string) => {
  if (!baseUrl) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal
    });
    if (!response.ok) return false;

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) return true;

    const payload = await response.json().catch(() => null);
    return payload?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const resolveState = (backendAvailable: boolean, firestoreFallbackAvailable: boolean, localFallbackAvailable: boolean) => {
  if (backendAvailable) return 'backend_live';
  if (firestoreFallbackAvailable) return 'firestore_fallback';
  if (localFallbackAvailable) return 'local_fallback';
  return 'offline_blocked';
};

const buildRuntimeMessage = (snapshot: Omit<RuntimeAvailabilitySnapshot, 'message'>) => {
  if (snapshot.backendAvailable) {
    return snapshot.queuedWriteCount > 0
      ? `${snapshot.queuedWriteCount} queued backend write${snapshot.queuedWriteCount === 1 ? '' : 's'} will sync automatically once the backlog clears.`
      : 'Live backend connected. Checkout, payouts, and attribution can commit immediately.';
  }

  if (snapshot.requiresLiveBackend) {
    if (snapshot.firestoreFallbackAvailable) {
      return 'Live backend is unavailable. Browsing can fall back to cached or Firestore data, but this action is blocked until the commerce backend is reachable.';
    }
    if (snapshot.localFallbackAvailable) {
      return 'Live backend is unavailable. Local fallback is available for browsing only; money movement and contracts are blocked.';
    }
    return 'Live backend is unavailable and no safe fallback can complete this action.';
  }

  if (snapshot.firestoreFallbackAvailable) {
    return 'Backend is degraded. Firestore fallback is active for browsing, but transactional actions stay backend-only.';
  }

  if (snapshot.localFallbackAvailable) {
    return 'Backend is degraded. Local mock fallback is active for non-transactional views only.';
  }

  return 'Backend is unavailable.';
};

export const getRuntimeAvailabilitySnapshot = async (
  options: { forceRefresh?: boolean; requiresLiveBackend?: boolean } = {}
): Promise<RuntimeAvailabilitySnapshot> => {
  const backendConfigured = isBackendConfigured();
  const backendBaseUrl = backendConfigured
    ? await resolveBackendBaseUrl(options.forceRefresh === true)
    : getBackendBaseUrl();
  const backendAvailable = backendBaseUrl ? await probeBackendHealth(backendBaseUrl) : false;
  const firestoreFallbackAvailable = shouldUseFirestoreFallback();
  const localFallbackAvailable = shouldUseLocalMockFallback();

  const baseSnapshot = {
    state: resolveState(backendAvailable, firestoreFallbackAvailable, localFallbackAvailable),
    backendConfigured,
    backendAvailable,
    firestoreFallbackAvailable,
    localFallbackAvailable,
    requiresLiveBackend: Boolean(options.requiresLiveBackend),
    queuedWriteCount: getQueuedBackendWriteCount(),
    dataMode: dataModeConfig.mode,
    checkedAt: new Date().toISOString()
  } satisfies Omit<RuntimeAvailabilitySnapshot, 'message'>;

  return {
    ...baseSnapshot,
    message: buildRuntimeMessage(baseSnapshot)
  };
};

export const ensureCriticalBackendReady = async (actionLabel = 'This action') => {
  const snapshot = await getRuntimeAvailabilitySnapshot({
    forceRefresh: true,
    requiresLiveBackend: true
  });

  if (!snapshot.backendAvailable) {
    throw new Error(snapshot.message || `${actionLabel} requires a live backend connection.`);
  }

  return snapshot;
};
