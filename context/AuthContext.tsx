import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User, OnboardingData } from '../types';
import { authService, userService } from '../services/itemService';
import { auth } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Spinner from '../components/Spinner';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  showOnboarding: boolean;
  onboardingPreset: OnboardingData['purpose'] | null;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string, phone: string, city: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  logout: () => void;
  switchUser: (targetUserId: string) => Promise<void>;
  completeOnboarding: (data: OnboardingData) => void;
  openOnboarding: (purpose?: OnboardingData['purpose'], redirectPath?: string) => void;
  closeOnboarding: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  openAuthModal: (view: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalView: 'login' | 'register' | null;
  authRedirectPath: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingPreset, setOnboardingPreset] = useState<OnboardingData['purpose'] | null>(null);
    const [onboardingRedirect, setOnboardingRedirect] = useState<string | null>(null);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    const fromPath = location.state?.from?.pathname || "/";
    const authRedirectPath = (location.state?.from as any)?.pathname || "/";

    const buildFallbackUser = useCallback((firebaseUser: FirebaseUser): User => ({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        avatar: firebaseUser.photoURL || 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
        following: [],
        followers: [],
        wishlist: [],
        cart: [],
        badges: [],
        memberSince: new Date().toISOString(),
        status: 'active'
    }), []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            try {
                if (firebaseUser) {
                    try {
                        const profile = await authService.getProfile(firebaseUser.uid);
                        if (profile) {
                            setUser(profile);
                            if (!profile.interests || profile.interests.length === 0) {
                                setIsNewUser(true);
                            } else {
                                setIsNewUser(false);
                            }
                        } else {
                            const newUserProfile = await authService.createUserProfile(firebaseUser, {});
                            setUser(newUserProfile);
                            setIsNewUser(true);
                        }
                    } catch (error) {
                        console.error('Auth profile load failed, using fallback user:', error);
                        setUser(buildFallbackUser(firebaseUser));
                        setIsNewUser(true);
                    }
                } else {
                    setUser(null);
                    setIsNewUser(false);
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
            } finally {
                setIsLoading(false);
                clearTimeout(timeoutId);
            }
        });

        // Cleanup subscription on unmount
        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, [buildFallbackUser]);

    const openAuthModal = useCallback((view: 'login' | 'register') => {
        navigate('/auth', { state: { from: location } });
    }, [navigate, location]);

    const closeAuthModal = useCallback(() => {
        navigate(fromPath, { replace: true });
    }, [navigate, fromPath]);
    
    const login = useCallback(async (email: string, pass: string) => {
        const loggedInUser = await authService.login(email, pass);
        setUser(loggedInUser);
        return loggedInUser;
    }, []);

    const register = useCallback(async (name: string, email: string, pass: string, phone: string, city: string) => {
        const created = await authService.register(name, email, pass, phone, city);
        setUser(created);
        setIsNewUser(true);
        return created;
    }, []);

    const signInWithGoogle = useCallback(async () => {
        const googleUser = await authService.signInWithGoogle();
        setUser(googleUser);
        if (!googleUser.interests || googleUser.interests.length === 0) {
            setIsNewUser(true);
        }
    }, []);
    
    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        navigate('/');
    }, [navigate]);

    const switchUser = useCallback(async (_targetUserId: string) => {
       await authService.logout();
       setUser(null);
       navigate('/auth');
    }, [navigate]);

    const completeOnboarding = useCallback(async (data: OnboardingData) => {
        try {
            if (user) {
                const updatedUser = await userService.updateUserProfile(user.id, { 
                    interests: data.interests, 
                    country: data.country, 
                    currencyPreference: data.currency 
                });
                setUser(updatedUser);
            } else {
                localStorage.setItem('onboarding_data', JSON.stringify(data));
            }
            localStorage.setItem('onboarding_completed', 'true');
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            if (user) {
                setUser({
                    ...user,
                    interests: data.interests,
                    country: data.country,
                    currencyPreference: data.currency
                });
            }
            localStorage.setItem('onboarding_completed', 'true');
        } finally {
            setIsNewUser(false);
            setShowOnboarding(false);
            if (onboardingRedirect) {
                navigate(onboardingRedirect);
                setOnboardingRedirect(null);
            }
        }
    }, [user, onboardingRedirect, navigate]);

    const openOnboarding = useCallback((purpose?: OnboardingData['purpose'], redirectPath?: string) => {
        const completed = localStorage.getItem('onboarding_completed') === 'true';
        if (completed) return;
        setOnboardingPreset(purpose || null);
        setOnboardingRedirect(redirectPath || null);
        setShowOnboarding(true);
    }, []);

    const closeOnboarding = useCallback(() => {
        setShowOnboarding(false);
        setOnboardingRedirect(null);
    }, []);

    const updateUser = useCallback((updatedData: Partial<User>) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            return { ...currentUser, ...updatedData };
        });
    }, []);

    const value = useMemo(() => ({
        isAuthenticated: !!user,
        user,
        isLoading,
        isNewUser,
        showOnboarding,
        onboardingPreset,
        login,
        register,
        signInWithGoogle,
        logout,
        switchUser,
        completeOnboarding,
        openOnboarding,
        closeOnboarding,
        updateUser,
        openAuthModal,
        closeAuthModal,
        authModalView: null, // This is now handled by the /auth route
        authRedirectPath
    }), [
        user, 
        isLoading, 
        isNewUser, 
        showOnboarding,
        onboardingPreset,
        login, 
        register, 
        signInWithGoogle, 
        logout,
        switchUser, 
        completeOnboarding, 
        openOnboarding,
        closeOnboarding,
        updateUser,
        openAuthModal,
        closeAuthModal,
        authRedirectPath
    ]);
    
    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-background"><Spinner size="lg" /></div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
