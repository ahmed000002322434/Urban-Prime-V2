import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type SpotlightVisibilityPreference = 'public' | 'followers' | 'private';

export interface SpotlightPreferences {
  compactDensity: boolean;
  reducedMotion: boolean;
  autoplayVideos: boolean;
  showViewCounts: boolean;
  surfaceOpacity: number;
  defaultVisibility: SpotlightVisibilityPreference;
}

type SpotlightPreferencesContextValue = {
  preferences: SpotlightPreferences;
  updatePreferences: (patch: Partial<SpotlightPreferences>) => void;
  resetPreferences: () => void;
};

const STORAGE_KEY = 'urbanprime:spotlight:preferences:v1';
const MIN_SURFACE_OPACITY = 0.08;
const MAX_SURFACE_OPACITY = 0.28;
const DEFAULT_SURFACE_OPACITY = 0.16;

const DEFAULT_PREFERENCES: SpotlightPreferences = {
  compactDensity: false,
  reducedMotion: false,
  autoplayVideos: true,
  showViewCounts: true,
  surfaceOpacity: DEFAULT_SURFACE_OPACITY,
  defaultVisibility: 'public'
};

const isVisibilityPreference = (value: unknown): value is SpotlightVisibilityPreference => (
  value === 'public' || value === 'followers' || value === 'private'
);

const clampSurfaceOpacity = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SURFACE_OPACITY;
  return Math.min(MAX_SURFACE_OPACITY, Math.max(MIN_SURFACE_OPACITY, Math.round(numeric * 100) / 100));
};

const readStoredPreferences = (): SpotlightPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      compactDensity: parsed?.compactDensity === true,
      reducedMotion: parsed?.reducedMotion === true,
      autoplayVideos: parsed?.autoplayVideos !== false,
      showViewCounts: parsed?.showViewCounts !== false,
      surfaceOpacity: clampSurfaceOpacity(parsed?.surfaceOpacity),
      defaultVisibility: isVisibilityPreference(parsed?.defaultVisibility) ? parsed.defaultVisibility : DEFAULT_PREFERENCES.defaultVisibility
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const SpotlightPreferencesContext = createContext<SpotlightPreferencesContextValue | undefined>(undefined);

export const SpotlightPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<SpotlightPreferences>(() => readStoredPreferences());

  const persist = useCallback((next: SpotlightPreferences) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage issues and keep the session state.
    }
  }, []);

  const updatePreferences = useCallback((patch: Partial<SpotlightPreferences>) => {
    setPreferences((current) => {
      const nextSurfaceOpacity = Object.prototype.hasOwnProperty.call(patch, 'surfaceOpacity')
        ? clampSurfaceOpacity(patch.surfaceOpacity)
        : current.surfaceOpacity;
      const next = {
        ...current,
        ...patch,
        surfaceOpacity: nextSurfaceOpacity,
        defaultVisibility: isVisibilityPreference(patch.defaultVisibility)
          ? patch.defaultVisibility
          : current.defaultVisibility
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetPreferences = useCallback(() => {
    persist(DEFAULT_PREFERENCES);
    setPreferences(DEFAULT_PREFERENCES);
  }, [persist]);

  const value = useMemo(() => ({ preferences, updatePreferences, resetPreferences }), [preferences, resetPreferences, updatePreferences]);

  return <SpotlightPreferencesContext.Provider value={value}>{children}</SpotlightPreferencesContext.Provider>;
};

export const useSpotlightPreferences = () => {
  const context = useContext(SpotlightPreferencesContext);
  if (!context) {
    throw new Error('useSpotlightPreferences must be used within a SpotlightPreferencesProvider');
  }
  return context;
};
