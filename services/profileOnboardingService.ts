import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { localDb } from './localDb';
import personaService from './personaService';
import { deriveDisplayNameFromEmail, resolveDisplayName } from '../utils/profileIdentity';
import type {
  AccountPersona,
  CapabilityState,
  FeatureFlags,
  OnboardingDraft,
  OnboardingIntent,
  OnboardingStepId,
  ProfileCompletion,
  UnifiedProfile,
  User,
  UserOnboardingState
} from '../types';

const BASE_CAPABILITIES: Record<string, CapabilityState> = {
  buy: 'inactive',
  rent: 'inactive',
  sell: 'inactive',
  provide_service: 'inactive',
  affiliate: 'inactive',
  admin: 'inactive'
};

const hasBackendApiKey = Boolean((import.meta.env.VITE_BACKEND_API_KEY as string | undefined)?.trim());

const normalizeStep = (step: unknown): OnboardingStepId => {
  const normalized = String(step || '').toLowerCase();
  if (normalized === 'intent') return 'intent';
  if (normalized === 'identity') return 'identity';
  if (normalized === 'preferences') return 'preferences';
  if (normalized === 'role_setup') return 'role_setup';
  if (normalized === 'review') return 'review';
  if (normalized === 'completed') return 'completed';
  return 'intent';
};

const normalizeIntents = (value: unknown): OnboardingIntent[] => {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  const allValues = source
    .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : [entry]))
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean)
    .map((entry) => {
      if (entry === 'list') return 'sell';
      if (entry === 'provide_service') return 'provide';
      return entry;
    })
    .filter((entry): entry is OnboardingIntent => ['buy', 'rent', 'sell', 'provide', 'affiliate'].includes(entry));

  return Array.from(new Set(allValues));
};

const normalizeArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry)).filter(Boolean);
    } catch {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
  }
  return [];
};

const mapPersona = (row: any): AccountPersona => {
  const capabilities = {
    ...BASE_CAPABILITIES,
    ...(row?.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {})
  } as AccountPersona['capabilities'];

  return {
    id: row?.id || '',
    userId: row?.firebase_uid || row?.user_id || '',
    type: row?.type || 'consumer',
    status: row?.status || 'active',
    displayName: row?.display_name || row?.displayName || 'Persona',
    avatar: row?.avatar_url || row?.avatar || undefined,
    handle: row?.handle || undefined,
    bio: row?.bio || undefined,
    settings: row?.settings || {},
    verification: row?.verification || {},
    capabilities,
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || row?.updatedAt || new Date().toISOString()
  };
};

const mapCompletion = (raw: any): ProfileCompletion => ({
  isComplete: Boolean(raw?.isComplete),
  missingRequiredFields: Array.isArray(raw?.missingRequiredFields) ? raw.missingRequiredFields.map(String) : [],
  nextStep: normalizeStep(raw?.nextStep)
});

const mapFeatureFlags = (raw: any): FeatureFlags => ({
  profileOnboardingV2: raw?.profileOnboardingV2 !== false,
  chatReliabilityV2: raw?.chatReliabilityV2 !== false,
  brandHubV3: raw?.brandHubV3 !== false
});

const mapOnboardingState = (raw: any): UserOnboardingState | null => {
  if (!raw) return null;
  return {
    userId: raw.userId || raw.user_id || '',
    currentStep: normalizeStep(raw.currentStep || raw.current_step),
    flowVersion: Number(raw.flowVersion || raw.flow_version || 1),
    selectedIntents: normalizeIntents(raw.selectedIntents || raw.selected_intents),
    draft: (raw.draft || {}) as OnboardingDraft,
    startedAt: raw.startedAt || raw.started_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString()
  };
};

const mapPurpose = (rawPurpose: unknown): User['purpose'] | undefined => {
  const intents = normalizeIntents(rawPurpose);
  if (intents.includes('sell') && (intents.includes('buy') || intents.includes('rent'))) return 'both';
  if (intents.includes('sell')) return 'list';
  if (intents.length > 0) return 'rent';
  return undefined;
};

const mapUnifiedProfile = (raw: any): UnifiedProfile => {
  const userRow = raw?.user || {};
  const profileRow = raw?.profile || {};
  const firebaseUser = auth.currentUser;
  const personas = Array.isArray(raw?.personas) ? raw.personas.map(mapPersona) : [];
  const activePersona = raw?.activePersona ? mapPersona(raw.activePersona) : (personas[0] || null);
  const completion = mapCompletion(raw?.completion || {});
  const featureFlags = mapFeatureFlags(raw?.featureFlags || raw?.feature_flags || {});
  const interests = normalizeArray(profileRow?.interests);
  const preferences = profileRow?.preferences && typeof profileRow.preferences === 'object' ? profileRow.preferences : {};
  const chatPresenceVisible = preferences?.chatPresenceVisible !== false;
  const resolvedEmail = resolveDisplayName(userRow?.email, firebaseUser?.email);
  const resolvedName = resolveDisplayName(
    userRow?.name,
    profileRow?.business_name,
    firebaseUser?.displayName,
    deriveDisplayNameFromEmail(resolvedEmail),
    'User'
  );

  const user: User = {
    id: userRow?.firebase_uid || userRow?.id || '',
    name: resolvedName,
    email: resolvedEmail,
    avatar: userRow?.avatar_url || firebaseUser?.photoURL || '/icons/urbanprime.svg',
    phone: userRow?.phone || '',
    city: profileRow?.city || '',
    country: profileRow?.country || '',
    purpose: mapPurpose(profileRow?.purpose),
    interests,
    currencyPreference: profileRow?.currency_preference || '',
    dob: profileRow?.dob || undefined,
    gender: profileRow?.gender || undefined,
    about: profileRow?.about || undefined,
    businessName: profileRow?.business_name || undefined,
    businessDescription: profileRow?.business_description || undefined,
    chatSettings: {
      e2eEnabled: false,
      presenceVisible: chatPresenceVisible,
      soundEnabled: true
    },
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: userRow?.created_at || new Date().toISOString(),
    status: userRow?.status || 'active',
    accountLifecycle: completion.isComplete ? 'member' : 'restricted',
    isAdmin: Boolean(userRow?.is_admin || userRow?.isAdmin || (String(userRow?.role || '').toLowerCase() === 'admin') || (String(userRow?.role || '').toLowerCase() === 'super_admin')),
    capabilities: activePersona?.capabilities || {
      ...BASE_CAPABILITIES,
      buy: 'active',
      rent: 'active'
    },
    activePersonaId: activePersona?.id
  };

  return {
    user,
    profile: profileRow,
    personas,
    activePersona,
    completion,
    featureFlags,
    onboardingState: mapOnboardingState(raw?.onboardingState)
  };
};

const getAuthContext = async (): Promise<{ token?: string; firebaseUid?: string }> => {
  if (!auth.currentUser) return {};
  const firebaseUid = auth.currentUser.uid;
  try {
    const token = await auth.currentUser.getIdToken();
    return { token, firebaseUid };
  } catch {
    return { firebaseUid };
  }
};

const request = async (path: string, options: RequestInit = {}) => {
  if (!isBackendConfigured()) {
    return { data: null };
  }
  const authContext = await getAuthContext();
  const headers = new Headers(options.headers || {});
  if (authContext.firebaseUid && !headers.has('x-firebase-uid')) {
    headers.set('x-firebase-uid', authContext.firebaseUid);
  }
  return backendFetch(path, { ...options, headers }, authContext.token);
};

const buildFallbackUnifiedProfile = async (user: User): Promise<UnifiedProfile> => {
  const personas = await personaService.ensureDefaultConsumerPersona(user);
  const activePersona = personas[0] || null;
  return {
    user: {
      ...user,
      activePersonaId: activePersona?.id,
      capabilities: activePersona?.capabilities || user.capabilities
    },
    profile: {},
    personas,
    activePersona,
    completion: {
      isComplete: true,
      missingRequiredFields: [],
      nextStep: 'completed'
    },
    featureFlags: {
      profileOnboardingV2: false,
      chatReliabilityV2: false,
      brandHubV3: true
    }
  };
};

const getFirebaseFallbackUnifiedProfile = async (): Promise<UnifiedProfile | null> => {
  if (!auth.currentUser) return null;

  const firebaseUser = auth.currentUser;
  const resolvedEmail = String(firebaseUser.email || '').trim();
  const fallbackUser: User = {
    id: firebaseUser.uid,
    name: resolveDisplayName(firebaseUser.displayName, deriveDisplayNameFromEmail(resolvedEmail), 'User'),
    email: resolvedEmail,
    avatar: firebaseUser.photoURL || '/icons/urbanprime.svg',
    phone: '',
    city: '',
    country: '',
    purpose: undefined,
    interests: [],
    currencyPreference: '',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: new Date().toISOString(),
    status: 'active',
    accountLifecycle: 'restricted',
    capabilities: {
      ...BASE_CAPABILITIES,
      buy: 'active',
      rent: 'active'
    }
  };

  return buildFallbackUnifiedProfile(fallbackUser);
};

const getLocalUnifiedProfile = async (): Promise<UnifiedProfile> => {
  const firebaseFallback = await getFirebaseFallbackUnifiedProfile();
  if (firebaseFallback) return firebaseFallback;

  await localDb.init();
  const users = await localDb.list<User>('users');
  const fallbackUser = users[0] || {
    id: 'local-user',
    name: 'Local User',
    email: '',
    avatar: '/icons/urbanprime.svg',
    phone: '',
    city: '',
    country: '',
    purpose: undefined,
    interests: [],
    currencyPreference: '',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: new Date().toISOString(),
    status: 'active',
    accountLifecycle: 'member',
    capabilities: {
      ...BASE_CAPABILITIES,
      buy: 'active',
      rent: 'active'
    }
  } as User;

  return buildFallbackUnifiedProfile(fallbackUser);
};

export interface SaveOnboardingStatePayload {
  currentStep?: OnboardingStepId;
  selectedIntents?: OnboardingIntent[];
  draft?: OnboardingDraft;
}

export interface CompleteOnboardingPayload {
  selectedIntents?: OnboardingIntent[];
  draft?: OnboardingDraft;
  roleSetup?: Record<string, unknown>;
}

export type OnboardingTelemetryEvent =
  | 'resumed'
  | 'step_viewed'
  | 'step_saved'
  | 'step_error'
  | 'completed'
  | 'completion_failed';

const profileOnboardingService = {
  getProfileMe: async (): Promise<UnifiedProfile> => {
    const authContext = await getAuthContext();
    if (!auth.currentUser) {
      return getLocalUnifiedProfile();
    }
    if (!authContext.token && !hasBackendApiKey) {
      const firebaseFallback = await getFirebaseFallbackUnifiedProfile();
      return firebaseFallback || getLocalUnifiedProfile();
    }
    const payload = await request('/profile/me');
    return mapUnifiedProfile(payload);
  },

  patchProfileMe: async (payload: Record<string, unknown>): Promise<UnifiedProfile> => {
    const authContext = await getAuthContext();
    if (!auth.currentUser) {
      return getLocalUnifiedProfile();
    }
    if (!authContext.token && !hasBackendApiKey) {
      throw new Error('Authenticated backend profile access is unavailable.');
    }
    const response = await request('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return mapUnifiedProfile(response);
  },

  getOnboardingState: async (): Promise<{ state: UserOnboardingState | null; completion: ProfileCompletion }> => {
    const authContext = await getAuthContext();
    if (!auth.currentUser || (!authContext.token && !hasBackendApiKey)) {
      return {
        state: null,
        completion: {
          isComplete: true,
          missingRequiredFields: [],
          nextStep: 'completed'
        }
      };
    }
    const payload = await request('/onboarding/state');
    return {
      state: mapOnboardingState(payload?.data),
      completion: mapCompletion(payload?.completion)
    };
  },

  saveOnboardingState: async (payload: SaveOnboardingStatePayload): Promise<{ state: UserOnboardingState | null; completion: ProfileCompletion }> => {
    const authContext = await getAuthContext();
    if (!auth.currentUser || (!authContext.token && !hasBackendApiKey)) {
      return {
        state: null,
        completion: {
          isComplete: true,
          missingRequiredFields: [],
          nextStep: 'completed'
        }
      };
    }
    const response = await request('/onboarding/state', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return {
      state: mapOnboardingState(response?.data),
      completion: mapCompletion(response?.completion)
    };
  },

  completeOnboarding: async (payload: CompleteOnboardingPayload): Promise<UnifiedProfile> => {
    const authContext = await getAuthContext();
    if (!auth.currentUser || (!authContext.token && !hasBackendApiKey)) {
      return getLocalUnifiedProfile();
    }
    const response = await request('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return mapUnifiedProfile(response);
  },

  trackOnboardingEvent: async (
    event: OnboardingTelemetryEvent,
    payload: { step?: OnboardingStepId; details?: Record<string, unknown> } = {}
  ) => {
    const authContext = await getAuthContext();
    if (!auth.currentUser || (!authContext.token && !hasBackendApiKey)) {
      return;
    }
    await request('/onboarding/events', {
      method: 'POST',
      body: JSON.stringify({
        event,
        step: payload.step,
        details: payload.details || {}
      })
    });
  },

  bootstrapPersonas: async (payload: { selectedIntents?: OnboardingIntent[]; roleSetup?: Record<string, unknown> }) => {
    const authContext = await getAuthContext();
    if (!auth.currentUser || (!authContext.token && !hasBackendApiKey)) {
      return [];
    }
    const response = await request('/onboarding/persona-bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return Array.isArray(response?.data) ? response.data.map(mapPersona) : [];
  }
};

export default profileOnboardingService;
