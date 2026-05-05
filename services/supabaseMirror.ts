import supabase from '../utils/supabase';
import { backendFetch, isBackendConfigured, shouldUseBackend } from './backendClient';
import { prefersSupabase } from './dataMode';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined;
  return Boolean(url && key);
};

const readDirectMirrorFlag = () =>
  (import.meta.env.VITE_ENABLE_DIRECT_SUPABASE_MIRROR as string | undefined)
  ?? (import.meta.env.VITE_ENABLE_SUPABASE_DIRECT_WRITE as string | undefined);

const isDirectMirrorEnabled = () => readDirectMirrorFlag() === 'true';
const MIRROR_UPSERT_MIN_INTERVAL_MS = 10_000;
const MIRROR_BACKEND_SUSPEND_MS = 60_000;
const MIRROR_BACKEND_SUSPEND_MS_404 = 5 * 60_000;
const recentMirrorUpserts = new Map<string, number>();
let backendMirrorSuspendedUntil = 0;

type MirrorRecord<T> = {
  collection: string;
  doc_id: string;
  data: T;
  updated_at?: string;
};

const buildPayload = <T>(collection: string, docId: string, data: T): MirrorRecord<T> => ({
  collection,
  doc_id: docId,
  data,
  updated_at: new Date().toISOString()
});

const handleSupabaseError = (error: any) => {
  if (!error) return;
  const status = error.status || error.code;
  const message = (error.message || '').toLowerCase();
  if (status === 401 || message.includes('unauthorized') || message.includes('invalid api key')) {
    supabaseMirror.enabled = false;
    console.warn('Supabase mirror disabled due to authorization error.');
  }
};

const buildMirrorQuery = (
  collection: string,
  options?: { limit?: number; filters?: Record<string, string | number | boolean> }
) => {
  const params: string[] = [`eq.collection=${encodeURIComponent(collection)}`];
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      params.push(`eq.${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    });
  }
  if (options?.limit) {
    params.push(`limit=${options.limit}`);
  }
  params.push('order=updated_at.desc');
  return `/api/mirror_documents?${params.join('&')}`;
};

const shouldUseDirectSupabase = () => !shouldUseBackend() && isSupabaseConfigured() && isDirectMirrorEnabled();

const parseBackendStatusCode = (error: unknown): number => {
  const message = String((error as any)?.message || '');
  const statusMatch = message.match(/\b(\d{3})\b/);
  if (!statusMatch) return 0;
  const status = Number(statusMatch[1]);
  return Number.isFinite(status) ? status : 0;
};

const recordBackendMirrorFailure = (error: unknown) => {
  const status = parseBackendStatusCode(error);
  if (status === 404) {
    backendMirrorSuspendedUntil = Date.now() + MIRROR_BACKEND_SUSPEND_MS_404;
    return;
  }
  if (status === 429) {
    backendMirrorSuspendedUntil = Date.now() + MIRROR_BACKEND_SUSPEND_MS;
    return;
  }
  backendMirrorSuspendedUntil = Date.now() + Math.min(MIRROR_BACKEND_SUSPEND_MS, 20_000);
};

const canAttemptBackendMirror = () => Date.now() >= backendMirrorSuspendedUntil;

const shouldSkipFrequentUpsert = (collection: string, docId: string) => {
  const key = `${collection}:${docId}`;
  const last = recentMirrorUpserts.get(key) || 0;
  const now = Date.now();
  if (now - last < MIRROR_UPSERT_MIN_INTERVAL_MS) {
    return true;
  }
  recentMirrorUpserts.set(key, now);
  return false;
};

export const supabaseMirror = {
  enabled: prefersSupabase() && (shouldUseBackend() || shouldUseDirectSupabase()),

  upsert: async <T>(collection: string, docId: string, data: T) => {
    if (!supabaseMirror.enabled) return;
    if (shouldSkipFrequentUpsert(collection, docId)) return;
    try {
      if (shouldUseBackend() && isBackendConfigured() && canAttemptBackendMirror()) {
        await backendFetch('/api/mirror_documents?upsert=1&onConflict=collection,doc_id', {
          method: 'POST',
          body: JSON.stringify(buildPayload(collection, docId, data))
        });
        backendMirrorSuspendedUntil = 0;
        return;
      }

      if (!shouldUseDirectSupabase()) return;

      const { error } = await supabase.from('mirror_documents').upsert(buildPayload(collection, docId, data), {
        onConflict: 'collection,doc_id'
      });
      if (error) handleSupabaseError(error);
    } catch (error) {
      recordBackendMirrorFailure(error);
      handleSupabaseError(error);
      console.warn('Supabase mirror upsert failed:', error);
    }
  },

  mergeUpdate: async <T extends Record<string, any>>(collection: string, docId: string, updates: Partial<T>) => {
    if (!supabaseMirror.enabled) return;
    try {
      const existing = await supabaseMirror.get<T>(collection, docId);
      const merged = { ...(existing || {}), ...updates } as T;
      await supabaseMirror.upsert(collection, docId, merged);
      return merged;
    } catch (error) {
      handleSupabaseError(error);
      console.warn('Supabase mirror mergeUpdate failed:', error);
      return undefined;
    }
  },

  remove: async (collection: string, docId: string) => {
    if (!supabaseMirror.enabled) return;
    try {
      if (shouldUseBackend() && isBackendConfigured() && canAttemptBackendMirror()) {
        await backendFetch(`/api/mirror_documents?eq.collection=${encodeURIComponent(collection)}&eq.doc_id=${encodeURIComponent(docId)}`, {
          method: 'DELETE'
        });
        backendMirrorSuspendedUntil = 0;
        return;
      }

      if (!shouldUseDirectSupabase()) return;

      const { error } = await supabase.from('mirror_documents').delete().eq('collection', collection).eq('doc_id', docId);
      if (error) handleSupabaseError(error);
    } catch (error) {
      recordBackendMirrorFailure(error);
      handleSupabaseError(error);
      console.warn('Supabase mirror delete failed:', error);
    }
  },

  get: async <T>(collection: string, docId: string): Promise<T | null> => {
    if (!supabaseMirror.enabled) return null;
    try {
      if (shouldUseBackend() && isBackendConfigured()) {
        const res = await backendFetch(`/api/mirror_documents?eq.collection=${encodeURIComponent(collection)}&eq.doc_id=${encodeURIComponent(docId)}&limit=1`);
        const data = res?.data || [];
        if (Array.isArray(data) && data[0]?.data) {
          return data[0].data as T;
        }
        return null;
      }

      if (!shouldUseDirectSupabase()) return null;

      const { data, error } = await supabase
        .from('mirror_documents')
        .select('data')
        .eq('collection', collection)
        .eq('doc_id', docId)
        .maybeSingle();
      if (error || !data) {
        if (error) handleSupabaseError(error);
        return null;
      }
      return data.data as T;
    } catch (error) {
      handleSupabaseError(error);
      console.warn('Supabase mirror get failed:', error);
      return null;
    }
  },

  list: async <T>(collection: string, options?: { limit?: number; filters?: Record<string, string | number | boolean> }) => {
    if (!supabaseMirror.enabled) return [] as T[];
    try {
      if (shouldUseBackend() && isBackendConfigured()) {
        const res = await backendFetch(buildMirrorQuery(collection, options));
        const data = res?.data || [];
        return (data || []).map((row: any) => {
          const payload = row.data as Record<string, any>;
          if (payload && typeof payload === 'object') {
            return { id: row.doc_id, ...payload } as T;
          }
          return row.data as T;
        });
      }

      if (!shouldUseDirectSupabase()) return [] as T[];

      let query = supabase
        .from('mirror_documents')
        .select('doc_id,data')
        .eq('collection', collection)
        .order('updated_at', { ascending: false });

      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (key.includes('.')) {
            const [root, child] = key.split('.');
            query = query.filter(`data->'${root}'->>'${child}'`, 'eq', String(value));
          } else {
            query = query.filter(`data->>${key}`, 'eq', String(value));
          }
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) {
        handleSupabaseError(error);
      }
      return (data || []).map((row) => {
        const payload = row.data as Record<string, any>;
        if (payload && typeof payload === 'object') {
          return { id: row.doc_id, ...payload } as T;
        }
        return row.data as T;
      });
    } catch (error) {
      console.warn('Supabase mirror list failed:', error);
      return [] as T[];
    }
  }
};

export default supabaseMirror;
