import { auth } from '../firebase';
import { backendFetch, isBackendConfigured, resolveBackendBaseUrl } from './backendClient';
import type {
  AnalyticsPageId,
  AnalyticsScopeType,
  AnalyticsTimeRange,
  LiveAnalyticsEnvelope,
  PersonaAnalyticsPagePayload
} from '../types';

const unwrapBackendPayload = <T>(response: any): T | null => {
  if (response == null) return null;
  if (typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

const parseSseFrame = (frame: string): LiveAnalyticsEnvelope | null => {
  if (!frame || !frame.trim()) return null;

  let eventName = 'message';
  let payload = '';

  frame.split('\n').forEach((line) => {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message';
      return;
    }
    if (line.startsWith('data:')) {
      const chunk = line.slice(5).trimStart();
      payload = payload ? `${payload}\n${chunk}` : chunk;
    }
  });

  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload);
    return {
      ...parsed,
      type: parsed?.type || (eventName === 'connected' ? 'analytics.connected' : 'analytics.update')
    } as LiveAnalyticsEnvelope;
  } catch {
    return null;
  }
};

const getBackendToken = async (): Promise<string | undefined> => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const buildQuery = (range: AnalyticsTimeRange, timezone?: string) => {
  const params = new URLSearchParams();
  params.set('range', range);
  if (timezone) params.set('timezone', timezone);
  return params.toString();
};

export const personaAnalyticsService = {
  async getScopedPagePayload(
    scopeType: AnalyticsScopeType,
    scopeId: string,
    pageId: AnalyticsPageId,
    range: AnalyticsTimeRange = '30d',
    timezone?: string
  ): Promise<PersonaAnalyticsPagePayload> {
    const token = await getBackendToken();
    const query = buildQuery(range, timezone);
    const response = await backendFetch(
      `/analytics/scopes/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}/pages/${encodeURIComponent(pageId)}?${query}`,
      {},
      token
    );
    return unwrapBackendPayload<PersonaAnalyticsPagePayload>(response) as PersonaAnalyticsPagePayload;
  },

  async getScopedLiveEnvelope(
    scopeType: AnalyticsScopeType,
    scopeId: string,
    range: AnalyticsTimeRange = '30d',
    timezone?: string
  ): Promise<LiveAnalyticsEnvelope | null> {
    const token = await getBackendToken();
    const query = buildQuery(range, timezone);
    const response = await backendFetch(
      `/analytics/scopes/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}/live?${query}`,
      {},
      token
    );
    return unwrapBackendPayload<LiveAnalyticsEnvelope>(response);
  },

  subscribeScopedStream(
    scopeType: AnalyticsScopeType,
    scopeId: string,
    onMessage: (message: LiveAnalyticsEnvelope) => void,
    onError?: (error: Error) => void
  ): (() => void) {
    if (!scopeType || !scopeId || !isBackendConfigured()) {
      return () => {};
    }

    let closed = false;
    let reconnectTimer: number | undefined;
    let controller: AbortController | null = null;

    const connect = async () => {
      if (closed) return;

      try {
        const baseUrl = await resolveBackendBaseUrl();
        if (!baseUrl) throw new Error('Backend URL unavailable for analytics stream.');

        controller = new AbortController();
        const token = await getBackendToken();
        const headers: Record<string, string> = {
          Accept: 'text/event-stream'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(
          `${baseUrl}/analytics/stream/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}`,
          {
            method: 'GET',
            headers,
            signal: controller.signal
          }
        );

        if (!response.ok || !response.body) {
          throw new Error(`Analytics stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';

          frames.forEach((frame) => {
            const parsed = parseSseFrame(frame);
            if (parsed) onMessage(parsed);
          });
        }

        if (!closed) {
          reconnectTimer = window.setTimeout(() => {
            void connect();
          }, 3000);
        }
      } catch (error) {
        if (closed) return;
        onError?.(error instanceof Error ? error : new Error('Analytics stream failed'));
        reconnectTimer = window.setTimeout(() => {
          void connect();
        }, 5000);
      }
    };

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (controller) controller.abort();
    };
  }
};

export default personaAnalyticsService;
