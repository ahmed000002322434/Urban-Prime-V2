export type PixeStudioPrefetchMode = 'lean' | 'balanced' | 'aggressive';
export type PixeStudioModerationMode = 'open' | 'hold-risky' | 'followers-first';

export type PixeStudioPreferences = {
  defaultVisibility: 'public' | 'followers' | 'private';
  defaultAllowComments: boolean;
  autoCaptionPreference: boolean;
  duplicateClipCheck: boolean;
  lowDataReview: boolean;
  prefetchMode: PixeStudioPrefetchMode;
  moderationMode: PixeStudioModerationMode;
  processingAlerts: boolean;
  analyticsDigest: boolean;
  fraudAlerts: boolean;
  productDisclosureReminder: boolean;
};

export const PIXE_STUDIO_PREFERENCES_KEY = 'pixe_studio_preferences_v1';

export const defaultPixeStudioPreferences: PixeStudioPreferences = {
  defaultVisibility: 'public',
  defaultAllowComments: true,
  autoCaptionPreference: true,
  duplicateClipCheck: true,
  lowDataReview: true,
  prefetchMode: 'balanced',
  moderationMode: 'hold-risky',
  processingAlerts: true,
  analyticsDigest: true,
  fraudAlerts: true,
  productDisclosureReminder: true
};

export const loadPixeStudioPreferences = (): PixeStudioPreferences => {
  if (typeof window === 'undefined') return defaultPixeStudioPreferences;
  try {
    const raw = window.localStorage.getItem(PIXE_STUDIO_PREFERENCES_KEY);
    if (!raw) return defaultPixeStudioPreferences;
    const parsed = JSON.parse(raw) as Partial<PixeStudioPreferences>;
    return {
      ...defaultPixeStudioPreferences,
      ...parsed
    };
  } catch {
    return defaultPixeStudioPreferences;
  }
};

export const savePixeStudioPreferences = (value: PixeStudioPreferences) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PIXE_STUDIO_PREFERENCES_KEY, JSON.stringify(value));
};
