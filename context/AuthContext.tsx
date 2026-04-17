import React, { createContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type {
  AccountPersona,
  Capability,
  CapabilityState,
  OnboardingData,
  OnboardingDraft,
  OnboardingIntent,
  OnboardingStepId,
  PersonaType,
  ProfileCompletion,
  UnifiedProfile,
  User,
  UserOnboardingState
} from '../types';
import profileOnboardingService from '../services/profileOnboardingService';
import personaService from '../services/personaService';
import { auth, isFirebaseDisabled } from '../firebase';
import { localDb } from '../services/localDb';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Spinner from '../components/Spinner';
import { enforceAvatarIdentity, needsAvatarNormalization } from '../utils/avatarEnforcement';

const ONBOARDING_PRESET_KEY = 'urbanprime_onboarding_preset_v2';
const ONBOARDING_REDIRECT_KEY = 'urbanprime_onboarding_redirect_v2';
const UNIFIED_PROFILE_CACHE_PREFIX = 'urbanprime_unified_profile_cache_v2:';
type ItemServiceModule = typeof import('../services/itemService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../services/itemService');
  }
  return itemServiceModulePromise;
};

const withAuthService = async <T,>(
  callback: (service: ItemServiceModule['authService']) => Promise<T> | T
): Promise<T> => callback((await loadItemServiceModule()).authService);

const withUserService = async <T,>(
  callback: (service: ItemServiceModule['userService']) => Promise<T> | T
): Promise<T> => callback((await loadItemServiceModule()).userService);

const toLegacyPurpose = (intents: OnboardingIntent[]): OnboardingData['purpose'] | undefined => {
  const hasSell = intents.includes('sell');
  const hasBuy = intents.includes('buy') || intents.includes('rent');
  if (hasSell && hasBuy) return 'both';
  if (hasSell) return 'list';
  if (hasBuy) return 'rent';
  return undefined;
};

const mapPurposeToIntents = (
  purpose?: OnboardingData['purpose'] | OnboardingIntent | OnboardingIntent[]
): OnboardingIntent[] => {
  if (!purpose) return [];
  if (Array.isArray(purpose)) {
    return Array.from(new Set(purpose.filter(Boolean)));
  }

  const normalized = String(purpose).trim().toLowerCase();
  if (normalized === 'both') return ['buy', 'sell'];
  if (normalized === 'list') return ['sell'];
  if (normalized === 'rent') return ['rent'];
  if (normalized === 'provide_service') return ['provide'];
  if (['buy', 'sell', 'provide', 'affiliate'].includes(normalized)) {
    return [normalized as OnboardingIntent];
  }
  return [];
};

const defaultCompletion: ProfileCompletion = {
  isComplete: false,
  missingRequiredFields: ['name', 'phone', 'country', 'city', 'currency_preference', 'purpose', 'interests'],
  nextStep: 'intent'
};

const completedBypassCompletion: ProfileCompletion = {
  isComplete: true,
  missingRequiredFields: [],
  nextStep: 'completed'
};

const readProfileOnboardingFlag = () => {
  const raw = import.meta.env.VITE_PROFILE_ONBOARDING_V2 as string | undefined;
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return true;
};

const getUnifiedProfileCacheKey = (firebaseUid: string) => `${UNIFIED_PROFILE_CACHE_PREFIX}${firebaseUid}`;

const readCachedUnifiedProfile = (firebaseUid: string): UnifiedProfile | null => {
  if (!firebaseUid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getUnifiedProfileCacheKey(firebaseUid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as UnifiedProfile;
  } catch {
    return null;
  }
};

const writeCachedUnifiedProfile = (firebaseUid: string, profile: UnifiedProfile) => {
  if (!firebaseUid || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getUnifiedProfileCacheKey(firebaseUid), JSON.stringify(profile));
  } catch {
    // ignore cache write failures
  }
};

const fallbackCompletion = (profile: User): ProfileCompletion => {
  const missingRequiredFields: string[] = [];
  if (!profile?.name) missingRequiredFields.push('name');
  if (!profile?.phone) missingRequiredFields.push('phone');
  if (!profile?.country) missingRequiredFields.push('country');
  if (!profile?.city) missingRequiredFields.push('city');
  if (!profile?.currencyPreference) missingRequiredFields.push('currency_preference');
  if (!profile?.purpose) missingRequiredFields.push('purpose');
  if (!profile?.interests || profile.interests.length === 0) missingRequiredFields.push('interests');

  let nextStep: OnboardingStepId = 'completed';
  if (missingRequiredFields.includes('purpose')) nextStep = 'intent';
  else if (missingRequiredFields.some((field) => ['name', 'phone', 'country', 'city', 'currency_preference'].includes(field))) nextStep = 'identity';
  else if (missingRequiredFields.includes('interests')) nextStep = 'preferences';
  else if (missingRequiredFields.length > 0) nextStep = 'review';

  return {
    isComplete: missingRequiredFields.length === 0,
    missingRequiredFields,
    nextStep
  };
};

interface AuthContextType {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  personas: AccountPersona[];
  activePersona: AccountPersona | null;
  isLoading: boolean;
  isNewUser: boolean;
  showOnboarding: boolean;
  onboardingPreset: OnboardingData['purpose'] | OnboardingIntent | null;
  profileCompletion: ProfileCompletion | null;
  isProfileOnboardingEnabled: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    pass: string,
    phone: string,
    city: string,
    profileOverrides?: Partial<User>
  ) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  logout: () => void;
  switchUser: (targetUserId: string) => Promise<void>;
  completeOnboarding: (payload: OnboardingData | { selectedIntents?: OnboardingIntent[]; draft?: OnboardingDraft; roleSetup?: Record<string, unknown> }) => Promise<void>;
  saveOnboardingStep: (stepId: OnboardingStepId, payload: { selectedIntents?: OnboardingIntent[]; draft?: OnboardingDraft }) => Promise<UserOnboardingState | null>;
  refreshProfile: () => Promise<UnifiedProfile | null>;
  openOnboarding: (purpose?: OnboardingData['purpose'] | OnboardingIntent | OnboardingIntent[], redirectPath?: string) => void;
  closeOnboarding: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  setActivePersona: (personaId: string, options?: { requireConfirmation?: boolean; confirmationMessage?: string }) => Promise<void>;
  createPersona: (type: PersonaType, payload?: Partial<AccountPersona>) => Promise<AccountPersona>;
  hasCapability: (capability: Capability, personaId?: string) => boolean;
  capabilityState: (capability: Capability, personaId?: string) => CapabilityState;
  openAuthModal: (view: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalView: 'login' | 'register' | null;
  authRedirectPath: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const onboardingFeatureDefault = readProfileOnboardingFlag();
  const [user, setUser] = useState<User | null>(null);
  const [personas, setPersonas] = useState<AccountPersona[]>([]);
  const [activePersona, setActivePersonaState] = useState<AccountPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding] = useState(false);
  const [onboardingPreset, setOnboardingPreset] = useState<OnboardingData['purpose'] | OnboardingIntent | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
  const [isProfileOnboardingEnabled, setIsProfileOnboardingEnabled] = useState<boolean>(onboardingFeatureDefault);
  const avatarNormalizationAttemptRef = useRef(new Set<string>());
  const avatarDirectoryNormalizationRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from?.pathname || '/';
  const authRedirectPath = (location.state?.from as any)?.pathname || '/';

  const buildFallbackUser = useCallback(
    (firebaseUser: FirebaseUser): User =>
      enforceAvatarIdentity({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
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
        capabilities: personaService.getCapabilitiesForPersonaType('consumer', { isAdmin: false })
      }),
    []
  );

  const syncPersonas = useCallback(async (currentUser: User): Promise<AccountPersona[]> => {
    const list = await personaService.ensureDefaultConsumerPersona(currentUser);
    setPersonas(list);
    const active = personaService.getActivePersona(currentUser.id, list);
    setActivePersonaState(active);
    if (active) {
      setUser((prev) => {
        const base = prev && prev.id === currentUser.id ? prev : currentUser;
        return enforceAvatarIdentity({ ...base, activePersonaId: active.id, capabilities: active.capabilities });
      });
    }
    return list;
  }, []);

  const ensureCurrentUserAvatarNormalized = useCallback(async (currentUser: User) => {
    if (!currentUser?.id) return;
    if (!needsAvatarNormalization(currentUser)) return;
    if (avatarNormalizationAttemptRef.current.has(currentUser.id)) return;

    avatarNormalizationAttemptRef.current.add(currentUser.id);
    const normalized = enforceAvatarIdentity(currentUser);
    setUser((prev) => (prev && prev.id === currentUser.id ? { ...prev, avatar: normalized.avatar, gender: normalized.gender } : prev));

    try {
      await withUserService((userService) => userService.updateUserProfile(currentUser.id, {
        avatar: normalized.avatar,
        gender: normalized.gender
      }));
    } catch (error) {
      console.warn('Avatar normalization sync skipped:', error);
    }
  }, []);

  const normalizeAvatarDirectory = useCallback(async () => {
    if (avatarDirectoryNormalizationRef.current) return;
    avatarDirectoryNormalizationRef.current = true;
    try {
      await withUserService((userService) => userService.normalizeAllUserAvatars());
    } catch (error) {
      console.warn('Avatar directory normalization skipped:', error);
    }
  }, []);

  const applyUnifiedProfile = useCallback(
    async (unified: UnifiedProfile) => {
      const normalizedUser = enforceAvatarIdentity(unified.user);
      const onboardingEnabled = unified.featureFlags?.profileOnboardingV2 ?? onboardingFeatureDefault;
      const normalizedUnified: UnifiedProfile = {
        ...unified,
        user: normalizedUser
      };
      setIsProfileOnboardingEnabled(onboardingEnabled);
      setUser(normalizedUser);
      setPersonas(unified.personas);
      setActivePersonaState(unified.activePersona || null);
      setProfileCompletion(onboardingEnabled ? (unified.completion || defaultCompletion) : completedBypassCompletion);
      const firebaseUid = auth.currentUser?.uid || normalizedUser.id;
      writeCachedUnifiedProfile(firebaseUid, normalizedUnified);
      if (firebaseUid !== normalizedUser.id) {
        writeCachedUnifiedProfile(normalizedUser.id, normalizedUnified);
      }
      if (!unified.personas || unified.personas.length === 0) {
        await syncPersonas(normalizedUser);
      }
      await ensureCurrentUserAvatarNormalized(normalizedUser);
      void normalizeAvatarDirectory();
    },
    [ensureCurrentUserAvatarNormalized, normalizeAvatarDirectory, onboardingFeatureDefault, syncPersonas]
  );

  const refreshProfile = useCallback(async (): Promise<UnifiedProfile | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setUser(null);
      setPersonas([]);
      setActivePersonaState(null);
      setProfileCompletion(null);
      setIsProfileOnboardingEnabled(onboardingFeatureDefault);
      return null;
    }

    try {
      const unified = await profileOnboardingService.getProfileMe();
      await applyUnifiedProfile(unified);
      return unified;
    } catch (error) {
      console.error('Profile API unavailable, using fallback:', error);
      const cachedUnified = readCachedUnifiedProfile(firebaseUser.uid);
      if (cachedUnified) {
        await applyUnifiedProfile(cachedUnified);
        return cachedUnified;
      }
      const fallbackRaw = (await withAuthService((authService) => authService.getProfile(firebaseUser.uid))) || buildFallbackUser(firebaseUser);
      const fallback = enforceAvatarIdentity(fallbackRaw);
      setUser(fallback);
      const completion = fallbackCompletion(fallback);
      setProfileCompletion(onboardingFeatureDefault ? completion : completedBypassCompletion);
      setIsProfileOnboardingEnabled(onboardingFeatureDefault);
      const syncedPersonas = await syncPersonas(fallback);
      const active = personaService.getActivePersona(fallback.id, syncedPersonas);
      if (active) {
        setUser((prev) => (prev ? { ...prev, activePersonaId: active.id, capabilities: active.capabilities } : prev));
      }
      await ensureCurrentUserAvatarNormalized(fallback);
      void normalizeAvatarDirectory();
      const fallbackUnified: UnifiedProfile = {
        user: fallback,
        profile: {},
        personas: syncedPersonas,
        activePersona: active,
        completion,
        featureFlags: {
          profileOnboardingV2: onboardingFeatureDefault,
          brandHubV3: true
        }
      };
      writeCachedUnifiedProfile(firebaseUser.uid, fallbackUnified);
      return fallbackUnified;
    }
  }, [applyUnifiedProfile, buildFallbackUser, ensureCurrentUserAvatarNormalized, normalizeAvatarDirectory, onboardingFeatureDefault, syncPersonas]);

  useEffect(() => {
    if (isFirebaseDisabled()) {
      let cancelled = false;
      setIsLoading(true);
      (async () => {
        await localDb.init();
        const localUsers = await localDb.list<User>('users');
        const fallbackUser = enforceAvatarIdentity(
          localUsers[0] || {
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
            capabilities: personaService.getCapabilitiesForPersonaType('consumer')
          } as User
        );

        if (cancelled) return;
        setIsProfileOnboardingEnabled(false);
        setUser(fallbackUser);
        const syncedPersonas = await syncPersonas(fallbackUser);
        const active = personaService.getActivePersona(fallbackUser.id, syncedPersonas);
        setActivePersonaState(active);
        setProfileCompletion(completedBypassCompletion);
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          try {
            await withAuthService((authService) => authService.syncAuthenticatedUser());
          } catch (syncError) {
            console.warn('Auth restore sync skipped:', syncError);
          }
          await refreshProfile();
        } else {
          avatarNormalizationAttemptRef.current.clear();
          avatarDirectoryNormalizationRef.current = false;
          setUser(null);
          setPersonas([]);
          setActivePersonaState(null);
          setProfileCompletion(null);
          setIsProfileOnboardingEnabled(onboardingFeatureDefault);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [onboardingFeatureDefault, refreshProfile]);

  const openAuthModal = useCallback(
    (_view: 'login' | 'register') => {
      navigate('/auth', { state: { from: location } });
    },
    [navigate, location]
  );

  const closeAuthModal = useCallback(() => {
    navigate(fromPath, { replace: true });
  }, [navigate, fromPath]);

  const login = useCallback(
    async (email: string, pass: string) => {
      const authUser = await withAuthService((authService) => authService.login(email, pass));

      // --- Admin Portal Portal Bypass ---
      if (authUser.id === 'admin-bypass') {
        setUser(authUser);
        // Also ensure default persona is synced for admin bypass
        await syncPersonas(authUser);
        return authUser;
      }

      const unified = await refreshProfile();
      if (unified?.user) return unified.user;
      if (user) return user;
      throw new Error('Login succeeded but profile could not be loaded.');
    },
    [refreshProfile, syncPersonas, user]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      pass: string,
      phone: string,
      city: string,
      profileOverrides?: Partial<User>
    ) => {
      await withAuthService((authService) =>
        authService.register(name, email, pass, phone, city, profileOverrides)
      );
      const unified = await refreshProfile();
      if (unified?.user) return unified.user;
      if (user) return user;
      throw new Error('Registration succeeded but profile could not be loaded.');
    },
    [refreshProfile, user]
  );

  const signInWithGoogle = useCallback(async () => {
    await withAuthService((authService) => authService.signInWithGoogle());
    const unified = await refreshProfile();
    if (unified?.user) return unified.user;
    if (user) return user;
    throw new Error('Google sign-in succeeded but profile could not be loaded.');
  }, [refreshProfile, user]);

  const logout = useCallback(() => {
    void withAuthService((authService) => authService.logout());
    avatarNormalizationAttemptRef.current.clear();
    avatarDirectoryNormalizationRef.current = false;
    setUser(null);
    setPersonas([]);
    setActivePersonaState(null);
    setProfileCompletion(null);
    setIsProfileOnboardingEnabled(onboardingFeatureDefault);
    navigate('/');
  }, [navigate, onboardingFeatureDefault]);

  const switchUser = useCallback(
    async (_targetUserId: string) => {
      if (!user) {
        throw new Error('You must be logged in to switch accounts.');
      }
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Switching account will log you out first. Continue?');
      if (!confirmed) {
        return;
      }
      }
      await withAuthService((authService) => authService.logout());
      avatarNormalizationAttemptRef.current.clear();
      avatarDirectoryNormalizationRef.current = false;
      setUser(null);
      setPersonas([]);
      setActivePersonaState(null);
      setProfileCompletion(null);
      setIsProfileOnboardingEnabled(onboardingFeatureDefault);
      navigate('/auth');
    },
    [navigate, onboardingFeatureDefault, user]
  );

  const saveOnboardingStep = useCallback(
    async (stepId: OnboardingStepId, payload: { selectedIntents?: OnboardingIntent[]; draft?: OnboardingDraft }) => {
      if (!isProfileOnboardingEnabled) return null;
      const response = await profileOnboardingService.saveOnboardingState({
        currentStep: stepId,
        selectedIntents: payload.selectedIntents,
        draft: payload.draft
      });
      setProfileCompletion(response.completion);
      return response.state;
    },
    [isProfileOnboardingEnabled]
  );

  const completeOnboarding = useCallback(
    async (payload: OnboardingData | { selectedIntents?: OnboardingIntent[]; draft?: OnboardingDraft; roleSetup?: Record<string, unknown> }) => {
      if (!isProfileOnboardingEnabled) {
        await refreshProfile();
        navigate('/profile', { replace: true });
        return;
      }

      const isLegacyPayload = (payload as OnboardingData).interests !== undefined;
      const normalizedPayload = isLegacyPayload
        ? {
            selectedIntents: mapPurposeToIntents((payload as OnboardingData).purpose),
            draft: {
              identity: {
                country: (payload as OnboardingData).country,
                currencyPreference: (payload as OnboardingData).currency
              },
              preferences: {
                interests: (payload as OnboardingData).interests
              }
            } as OnboardingDraft
          }
        : payload;

      const unified = await profileOnboardingService.completeOnboarding(normalizedPayload as any);
      await applyUnifiedProfile(unified);

      sessionStorage.removeItem(ONBOARDING_PRESET_KEY);
      const redirectPath = sessionStorage.getItem(ONBOARDING_REDIRECT_KEY);
      sessionStorage.removeItem(ONBOARDING_REDIRECT_KEY);
      navigate(redirectPath || '/profile', { replace: true });
    },
    [applyUnifiedProfile, isProfileOnboardingEnabled, navigate, refreshProfile]
  );

  const openOnboarding = useCallback(
    (purpose?: OnboardingData['purpose'] | OnboardingIntent | OnboardingIntent[], redirectPath?: string) => {
      if (!isProfileOnboardingEnabled) {
        navigate(redirectPath || '/profile');
        return;
      }

      const intents = mapPurposeToIntents(purpose);
      const legacyPurpose = toLegacyPurpose(intents);
      if (legacyPurpose) {
        setOnboardingPreset(legacyPurpose);
      } else if (intents[0]) {
        setOnboardingPreset(intents[0]);
      } else {
        setOnboardingPreset(null);
      }

      if (intents.length > 0) {
        sessionStorage.setItem(ONBOARDING_PRESET_KEY, JSON.stringify(intents));
      }
      if (redirectPath) {
        sessionStorage.setItem(ONBOARDING_REDIRECT_KEY, redirectPath);
      }

      if (!user) {
        navigate('/auth', { state: { from: { pathname: '/auth/onboarding' } } });
        return;
      }

      navigate('/auth/onboarding');
    },
    [isProfileOnboardingEnabled, navigate, user]
  );

  const closeOnboarding = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return null;
      return enforceAvatarIdentity({ ...currentUser, ...updatedData });
    });
  }, []);

  const setActivePersona = useCallback(
    async (
      personaId: string,
      options?: { requireConfirmation?: boolean; confirmationMessage?: string }
    ) => {
      if (!user) {
        throw new Error('You must be logged in to switch workspaces.');
      }
      const target = personas.find((persona) => persona.id === personaId);
      if (!target) {
        throw new Error('Selected workspace was not found for this account.');
      }

      const requireConfirmation = options?.requireConfirmation ?? true;
      if (requireConfirmation && typeof window !== 'undefined') {
        const confirmed = window.confirm(
          options?.confirmationMessage ||
            `Switch workspace to "${target.displayName}"? You can change it again any time.`
        );
        if (!confirmed) {
          throw new Error('Workspace switch cancelled.');
        }
      }

      await personaService.setActivePersona(user.id, personaId);
      setActivePersonaState(target);
      setUser((prev) => (prev ? { ...prev, activePersonaId: personaId, capabilities: target.capabilities } : prev));
    },
    [user, personas]
  );

  const createPersona = useCallback(
    async (type: PersonaType, payload?: Partial<AccountPersona>) => {
      if (!user) {
        throw new Error('You must be logged in to create a persona.');
      }
      const created = await personaService.createPersona(user, type, {
        displayName: payload?.displayName,
        avatar: payload?.avatar,
        handle: payload?.handle,
        bio: payload?.bio,
        settings: payload?.settings,
        verification: payload?.verification
      });
      const updatedPersonas = await personaService.getPersonasForUser(user);
      setPersonas(updatedPersonas);
      if (!activePersona) {
        await setActivePersona(created.id, { requireConfirmation: false });
      }
      return created;
    },
    [user, activePersona, setActivePersona]
  );

  const hasCapability = useCallback(
    (capability: Capability, personaId?: string) => {
      const targetPersona = personaId
        ? personas.find((persona) => persona.id === personaId) || null
        : activePersona;
      return personaService.hasCapability(targetPersona, capability);
    },
    [personas, activePersona]
  );

  const capabilityState = useCallback(
    (capability: Capability, personaId?: string): CapabilityState => {
      const targetPersona = personaId
        ? personas.find((persona) => persona.id === personaId) || null
        : activePersona;
      if (!targetPersona) return 'inactive';
      return targetPersona.capabilities?.[capability] || 'inactive';
    },
    [personas, activePersona]
  );

  const isNewUser = Boolean(isProfileOnboardingEnabled && user && profileCompletion && !profileCompletion.isComplete);

  const value = useMemo(
    () => ({
      isAuthenticated: !!user,
      isGuest: !user,
      user,
      personas,
      activePersona,
      isLoading,
      isNewUser,
      showOnboarding,
      onboardingPreset,
      profileCompletion,
      isProfileOnboardingEnabled,
      login,
      register,
      signInWithGoogle,
      logout,
      switchUser,
      completeOnboarding,
      saveOnboardingStep,
      refreshProfile,
      openOnboarding,
      closeOnboarding,
      updateUser,
      setActivePersona,
      createPersona,
      hasCapability,
      capabilityState,
      openAuthModal,
      closeAuthModal,
      authModalView: null,
      authRedirectPath
    }),
    [
      user,
      personas,
      activePersona,
      isLoading,
      isNewUser,
      showOnboarding,
      onboardingPreset,
      profileCompletion,
      isProfileOnboardingEnabled,
      login,
      register,
      signInWithGoogle,
      logout,
      switchUser,
      completeOnboarding,
      saveOnboardingStep,
      refreshProfile,
      openOnboarding,
      closeOnboarding,
      updateUser,
      setActivePersona,
      createPersona,
      hasCapability,
      capabilityState,
      openAuthModal,
      closeAuthModal,
      authRedirectPath
    ]
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
