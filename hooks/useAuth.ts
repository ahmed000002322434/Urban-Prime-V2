import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('useAuth used outside AuthProvider. Returning fallback.');
    return {
      isAuthenticated: false,
      isGuest: true,
      user: null,
      personas: [],
      activePersona: null,
      isLoading: false,
      isNewUser: false,
      showOnboarding: false,
      onboardingPreset: null,
      profileCompletion: null,
      isProfileOnboardingEnabled: true,
      login: async () => {
        console.warn('AuthProvider not ready: login ignored.');
        return null as any;
      },
      requestPhoneSignupPin: async () => ({}),
      confirmPhoneSignupPin: async () => null as any,
      requestPhoneLoginPin: async () => ({}),
      confirmPhoneLoginPin: async () => null as any,
      register: async () => {
        console.warn('AuthProvider not ready: register ignored.');
        return null as any;
      },
      signInWithGoogle: async () => {
        console.warn('AuthProvider not ready: Google sign-in ignored.');
        return null as any;
      },
      signInWithSocialProvider: async () => {
        console.warn('AuthProvider not ready: social sign-in ignored.');
      },
      completeSupabaseOAuthSignIn: async () => null,
      logout: () => {},
      switchUser: async () => {},
      completeOnboarding: async () => {},
      saveOnboardingStep: async () => null,
      refreshProfile: async () => null,
      openOnboarding: () => {},
      closeOnboarding: () => {},
      updateUser: () => {},
      setActivePersona: async () => {},
      createPersona: async () => {
        console.warn('AuthProvider not ready: createPersona ignored.');
        return null as any;
      },
      hasCapability: () => false,
      capabilityState: () => 'inactive',
      openAuthModal: () => {},
      closeAuthModal: () => {},
      authModalView: null,
      authRedirectPath: '/'
    } as any;
  }
  return context;
};
