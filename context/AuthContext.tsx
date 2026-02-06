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
  register: (name: string, email: string, pass: string, phone: string, city: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            try {
                if (firebaseUser) {
                    const profile = await authService.getProfile(firebaseUser.uid);
                    if (profile) {
                        setUser(profile);
                        if (!profile.interests || profile.interests.length === 0) {
                            setIsNewUser(true);
                        }
                    } else {
                        const isNewRegistration = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;
                        if (isNewRegistration) {
                            try {
                                const newUserProfile = await authService.createUserProfile(firebaseUser, {});
                                setUser(newUserProfile);
                            } catch (error) {
                                // Offline or Firestore unavailable. Use a local fallback profile.
                                setUser({
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
                                });
                            }
                            setIsNewUser(true);
                        } else {
                            console.error("User exists in Auth, but not in Firestore database.");
                            setUser(null);
                        }
                    }
                } else {
                    if(!user?.isAdmin) {
                        setUser(null);
                    }
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
    }, [user?.isAdmin]);

    const openAuthModal = useCallback((view: 'login' | 'register') => {
        navigate('/auth', { state: { from: location } });
    }, [navigate, location]);

    const closeAuthModal = useCallback(() => {
        navigate(fromPath, { replace: true });
    }, [navigate, fromPath]);
    
    const login = useCallback(async (email: string, pass: string) => {
        const loggedInUser = await authService.login(email, pass);
        if (loggedInUser.isAdmin) {
            // This is our mocked admin user, set it directly in the context state.
            setUser(loggedInUser);
        }
        // For regular users, onAuthStateChanged will handle setting the user state.
        return loggedInUser;
    }, []);

    const register = useCallback(async (name: string, email: string, pass: string, phone: string, city: string) => {
        await authService.register(name, email, pass, phone, city);
    }, []);

    const signInWithGoogle = useCallback(async () => {
        await authService.signInWithGoogle();
    }, []);
    
    const logout = useCallback(() => {
        if (user && user.isAdmin) {
            // For mocked admin user, just clear the state.
            setUser(null);
        } else {
            // For regular Firebase users.
            authService.logout();
        }
        navigate('/');
    }, [user, navigate]);

    const switchUser = useCallback(async (targetUserId: string) => {
       // This is a mock-specific feature. In a real Firebase app, you'd just sign out and sign in.
       // For demo purposes, we will simulate a login for the other user.
       await authService.logout();
       // In a real app, this would redirect to a login screen.
       alert(`Simulating switch to user ${targetUserId}. In a real app you would log in as this user. For now, we'll reload.`);
       window.location.hash = '/auth';
       window.location.reload();

    }, []);

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
