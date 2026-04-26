export type DataMode = 'supabase' | 'firebase' | 'hybrid' | 'local';

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const normalizeDataMode = (value: string | undefined): DataMode | 'auto' => {
  const normalized = (value || 'auto').trim().toLowerCase();
  if (normalized === 'firebase') return 'firebase';
  if (normalized === 'hybrid') return 'hybrid';
  if (normalized === 'local') return 'local';
  if (normalized === 'supabase') return 'supabase';
  return 'auto';
};

const isSupabaseEnvConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  return Boolean(url && key);
};

const isBackendEnvConfigured = () => {
  const primary = (import.meta.env.VITE_BACKEND_URL as string | undefined) || '';
  const candidates = (import.meta.env.VITE_BACKEND_CANDIDATES as string | undefined) || '';
  const hostMap = (import.meta.env.VITE_BACKEND_HOST_MAP as string | undefined) || '';
  return Boolean(primary.trim() || candidates.trim() || hostMap.trim());
};

const isFirebaseDisabled = toBool(import.meta.env.VITE_DISABLE_FIREBASE as string | undefined, false);

const resolveAutoMode = (): DataMode => {
  if (isSupabaseEnvConfigured() || isBackendEnvConfigured()) return 'supabase';
  if (!isFirebaseDisabled) return 'firebase';
  return 'local';
};

const rawMode = normalizeDataMode(import.meta.env.VITE_DATA_MODE as string | undefined);
const DATA_MODE = rawMode === 'auto' ? resolveAutoMode() : rawMode;

const ENABLE_FIRESTORE_FALLBACK = toBool(import.meta.env.VITE_ENABLE_FIRESTORE_FALLBACK as string | undefined, false);
const ENABLE_LOCAL_MOCK_FALLBACK = toBool(import.meta.env.VITE_ENABLE_LOCAL_MOCK_FALLBACK as string | undefined, false);
const REQUIRE_BACKEND = toBool(import.meta.env.VITE_REQUIRE_BACKEND as string | undefined, false);
const ENABLE_LOCAL_FALLBACK = !REQUIRE_BACKEND && (ENABLE_LOCAL_MOCK_FALLBACK || DATA_MODE === 'local');

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
export const shouldUseFirestoreFallback = () =>
  !isFirebaseDisabled && (ENABLE_FIRESTORE_FALLBACK || DATA_MODE === 'firebase' || DATA_MODE === 'hybrid');
export const shouldUseLocalMockFallback = () => ENABLE_LOCAL_FALLBACK;
export const shouldUseLocalDb = () => ENABLE_LOCAL_FALLBACK;

export const getDataModeSummary = () =>
  `${dataModeConfig.mode} (backend required: ${dataModeConfig.requireBackend ? 'yes' : 'no'}, firestore fallback: ${
    shouldUseFirestoreFallback() ? 'on' : 'off'
  }, mock fallback: ${shouldUseLocalMockFallback() ? 'on' : 'off'})`;
