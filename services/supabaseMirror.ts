import supabase from '../utils/supabase';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined;
  return Boolean(url && key);
};

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

export const supabaseMirror = {
  enabled: isSupabaseConfigured(),

  upsert: async <T>(collection: string, docId: string, data: T) => {
    if (!supabaseMirror.enabled) return;
    try {
      const { error } = await supabase.from('mirror_documents').upsert(buildPayload(collection, docId, data), {
        onConflict: 'collection,doc_id'
      });
      if (error) handleSupabaseError(error);
    } catch (error) {
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
      const { error } = await supabase.from('mirror_documents').delete().eq('collection', collection).eq('doc_id', docId);
      if (error) handleSupabaseError(error);
    } catch (error) {
      handleSupabaseError(error);
      console.warn('Supabase mirror delete failed:', error);
    }
  },

  get: async <T>(collection: string, docId: string): Promise<T | null> => {
    if (!supabaseMirror.enabled) return null;
    try {
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
      let query = supabase.from('mirror_documents').select('doc_id,data').eq('collection', collection).order('updated_at', { ascending: false });
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
      return (data || []).map(row => {
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
