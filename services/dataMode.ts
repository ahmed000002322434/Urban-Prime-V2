export type DataMode = 'supabase' | 'firebase' | 'hybrid';

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const normalizeDataMode = (value: string | undefined): DataMode => {
  const normalized = (value || 'supabase').trim().toLowerCase();
  if (normalized === 'firebase') return 'firebase';
  if (normalized === 'hybrid') return 'hybrid';
  return 'supabase';
};

const DATA_MODE = normalizeDataMode(import.meta.env.VITE_DATA_MODE as string | undefined);
const ENABLE_FIRESTORE_FALLBACK = toBool(import.meta.env.VITE_ENABLE_FIRESTORE_FALLBACK as string | undefined, false);
const ENABLE_LOCAL_MOCK_FALLBACK = toBool(import.meta.env.VITE_ENABLE_LOCAL_MOCK_FALLBACK as string | undefined, true);
const REQUIRE_BACKEND = toBool(import.meta.env.VITE_REQUIRE_BACKEND as string | undefined, false);

export interface DataModeConfig {
  mode: DataMode;
  requireBackend: boolean;
  enableFirestoreFallback: boolean;
  enableLocalMockFallback: boolean;
}

export const dataModeConfig: DataModeConfig = {
  mode: DATA_MODE,
  requireBackend: REQUIRE_BACKEND,
  enableFirestoreFallback: ENABLE_FIRESTORE_FALLBACK,
  enableLocalMockFallback: ENABLE_LOCAL_MOCK_FALLBACK
};

export const prefersSupabase = () => DATA_MODE === 'supabase' || DATA_MODE === 'hybrid';
export const prefersFirebase = () => DATA_MODE === 'firebase';
export const shouldUseFirestoreFallback = () => ENABLE_FIRESTORE_FALLBACK || DATA_MODE === 'firebase' || DATA_MODE === 'hybrid';
export const shouldUseLocalMockFallback = () => ENABLE_LOCAL_MOCK_FALLBACK;

export const getDataModeSummary = () =>
  `${dataModeConfig.mode} (backend required: ${dataModeConfig.requireBackend ? 'yes' : 'no'}, firestore fallback: ${
    shouldUseFirestoreFallback() ? 'on' : 'off'
  }, mock fallback: ${shouldUseLocalMockFallback() ? 'on' : 'off'})`;
