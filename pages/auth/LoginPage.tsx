
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';
import EmailInput from '../../components/EmailInput';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../hooks/useTheme';
import AuthVideoBackdrop from '../../components/auth/AuthVideoBackdrop';

// Icons for social buttons
const FacebookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg>;
const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/></svg>;
const AppleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43ZM14.9 11.196c-.11.245-.56 1.9-1.64 3.21-.961 1.168-1.958 1.147-2.456 1.147-.498 0-1.274-.329-2.177-.329-.903 0-1.77.34-2.333.34-.562 0-1.61-.052-2.57-1.267C2.642 12.93 1.8 10.44 1.8 8.032c0-2.37 1.548-3.63 3.064-3.66.593-.01 1.454.378 1.945.378.49 0 1.337-.467 2.266-.398.389.016 1.48.156 2.18 1.184-.057.035-1.302.758-1.288 2.28.017 1.82 1.589 2.426 1.607 2.434-.015.046-.25.855-.674 1.946Z"/></svg>;
const LinkedinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3.654 1.328a.678.678 0 0 1 .737-.154l2.522 1.01c.329.132.51.486.421.83l-.528 2.11a.678.678 0 0 1-.65.514l-1.004.018a11.9 11.9 0 0 0 5.192 5.192l.018-1.004a.678.678 0 0 1 .514-.65l2.11-.528a.678.678 0 0 1 .83.421l1.01 2.522a.678.678 0 0 1-.154.737l-1.14 1.14c-.593.593-1.47.79-2.263.51C5.977 12.12 3.88 10.023 2.004 4.712c-.28-.793-.083-1.67.51-2.263l1.14-1.121z"/></svg>;

// Utility function to parse name from email
const parseNameFromEmail = (email: string): string => {
  if (!email || !email.includes('@')) {
    return '';
  }
  let localPart = email.split('@')[0];
  localPart = localPart.replace(/[\d_.-]+$/, '');
  const separatorMatch = localPart.match(/[._-]/);
  if (separatorMatch) {
    localPart = localPart.substring(0, separatorMatch.index);
  }
  localPart = localPart.replace(/\d/g, '');

  if (localPart.length < 2) {
    return '';
  }
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
};

const getAuthErrorMessage = (error: unknown, mode: 'login' | 'register' | 'google') => {
    const err = error as { code?: string; message?: string };
    const code = err?.code || '';
    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is disabled in Firebase. Enable it in the Firebase console.';
        case 'auth/popup-blocked':
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return 'Google sign-in popup was blocked. The app will retry with a full-page redirect.';
        case 'auth/operation-not-supported-in-this-environment':
            return 'This browser blocked popup sign-in. Retry and the app will switch to redirect sign-in.';
        case 'auth/unauthorized-domain':
            return 'This domain is not authorized in Firebase Authentication. Add urbanprime.tech, www.urbanprime.tech, and urbanprim.vercel.app in Firebase Auth > Settings > Authorized domains.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again in a few minutes.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.';
        default:
            if (mode === 'google') {
                return 'Google sign-in failed. Please try again.';
            }
            return err?.message || 'An unknown error occurred.';
    }
};


const LoginPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        login,
        register,
        signInWithGoogle,
        signInWithSocialProvider,
        completeSupabaseOAuthSignIn,
        requestPhoneSignupPin,
        confirmPhoneSignupPin,
        requestPhoneLoginPin,
        confirmPhoneLoginPin,
        logout,
        isAuthenticated,
        profileCompletion,
        isProfileOnboardingEnabled
    } = useAuth();
    const { resolvedTheme } = useTheme();

    const [isSignUpActive, setIsSignUpActive] = useState(location.pathname === '/register');

    // Refs for password inputs
    const signInPasswordRef = useRef<HTMLInputElement>(null);
    const signUpPasswordRef = useRef<HTMLInputElement>(null);
    
    // Form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
    const [loginPhone, setLoginPhone] = useState('');
    const [phoneLoginPassword, setPhoneLoginPassword] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [phonePin, setPhonePin] = useState('');
    const [pendingPhoneFlow, setPendingPhoneFlow] = useState<'login' | 'signup' | null>(null);
    const [pinDeliveryMessage, setPinDeliveryMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // State for personalized greetings
    const [signInOverlayName, setSignInOverlayName] = useState('Friend');
    const [signInNameKey, setSignInNameKey] = useState(0);
    const [signUpOverlayName, setSignUpOverlayName] = useState('');
    const [signUpNameKey, setSignUpNameKey] = useState(0);
    
    const from = location.state?.from?.pathname || "/";

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('logout') !== '1') return;
        logout();
        navigate('/auth', { replace: true });
    }, [location.search, logout, navigate]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('supabase_oauth') !== '1') return;
        let cancelled = false;
        setLoading(true);
        setError('');
        (async () => {
            try {
                await completeSupabaseOAuthSignIn();
                if (!cancelled) {
                    navigate('/auth', { replace: true, state: location.state });
                }
            } catch (err) {
                if (!cancelled) setError((err as { message?: string })?.message || 'Provider sign-in failed. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [completeSupabaseOAuthSignIn, location.search, location.state, navigate]);

    useEffect(() => {
        if (new URLSearchParams(location.search).get('logout') === '1') return;
        if (isAuthenticated) {
            if (!profileCompletion) return;
            setLoading(false);
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, profileCompletion, navigate, from, location.search]);

    const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setLoginEmail(newEmail);
        const newName = parseNameFromEmail(newEmail) || 'Friend';
        if (newName !== signInOverlayName) {
            setSignInNameKey(k => k + 1);
            setSignInOverlayName(newName);
        }
    };

    const handleRegisterEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setRegEmail(newEmail);
        const newName = parseNameFromEmail(newEmail) || '';
        if (newName !== signUpOverlayName) {
            setSignUpNameKey(k => k + 1);
            setSignUpOverlayName(newName);
        }
    };

    const handleSignInAutocomplete = () => {
        signInPasswordRef.current?.focus();
    };

    const handleSignUpAutocomplete = () => {
        signUpPasswordRef.current?.focus();
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (authMethod === 'phone') {
                const response = await requestPhoneLoginPin(loginPhone, phoneLoginPassword);
                setPendingPhoneFlow('login');
                setPhonePin('');
                setPinDeliveryMessage(response?.pin ? `Development PIN: ${response.pin}` : `We sent a 6-digit PIN to your WhatsApp number ${loginPhone}.`);
                return;
            }
            await login(loginEmail, loginPassword);
        } catch (err) {
            setError(getAuthErrorMessage(err, 'login'));
        } finally {
            setLoading(false);
        }
    };
    
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (authMethod === 'phone') {
                const response = await requestPhoneSignupPin(regName, regPhone, regPassword);
                setPendingPhoneFlow('signup');
                setPhonePin('');
                setPinDeliveryMessage(response?.pin ? `Development PIN: ${response.pin}` : `We sent a 6-digit PIN to your WhatsApp number ${regPhone}.`);
                return;
            }
            await register(regName, regEmail, regPassword, '', '');
        } catch (err) {
            setError(getAuthErrorMessage(err, 'register'));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPhonePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingPhoneFlow) return;
        setError('');
        setLoading(true);
        try {
            if (pendingPhoneFlow === 'signup') {
                await confirmPhoneSignupPin(regName, regPhone, regPassword, phonePin);
            } else {
                await confirmPhoneLoginPin(loginPhone, phonePin);
            }
            setPendingPhoneFlow(null);
            setPhonePin('');
        } catch (err) {
            setError((err as { message?: string })?.message || 'Invalid phone PIN.');
        } finally {
            setLoading(false);
        }
    };

    const switchAuthMethod = (method: 'email' | 'phone') => {
        setAuthMethod(method);
        setError('');
        setPendingPhoneFlow(null);
        setPhonePin('');
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
             const code = (err as { code?: string })?.code;
             if (code === 'auth/redirect') {
                 // Redirect flow in progress; no error to show here.
                 return;
             }
             setError(getAuthErrorMessage(err, 'google'));
        } finally {
            setLoading(false);
        }
    }

    const handleSupabaseProviderSignIn = async (provider: 'apple' | 'facebook' | 'linkedin_oidc') => {
        setError('');
        setLoading(true);
        try {
            await signInWithSocialProvider(provider);
        } catch (err) {
            setError((err as { message?: string })?.message || 'Provider sign-in failed. Please try again.');
            setLoading(false);
        }
    };


    return (
        <div className="auth-body relative overflow-hidden flex flex-col justify-center items-center h-screen bg-transparent">
            <AuthVideoBackdrop />
            <BackButton className="absolute top-8 left-8 z-[101]" />
            <div className={`auth-container relative z-10 ${isSignUpActive ? 'right-panel-active' : ''} ${resolvedTheme === 'obsidian' || resolvedTheme === 'hydra' ? '!bg-white/5 !backdrop-blur-xl border border-white/20 shadow-2xl' : ''}`} style={{ minHeight: '600px' }}>
                {/* Sign Up Form */}
                <div 
                    className="form-container sign-up-container" 
                    style={{ 
                        opacity: isSignUpActive ? 1 : 0, 
                        zIndex: isSignUpActive ? 5 : 1,
                        transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                        pointerEvents: isSignUpActive ? 'auto' : 'none'
                    }}
                >
                    <form onSubmit={handleRegisterSubmit} className="auth-form" style={{ height: '100%', justifyContent: 'center' }}>
                        <h1 className="auth-h1 text-text-primary mb-2">Create Account</h1>
                        <div className="social-container mb-4">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleGoogleSignIn(); }}><GoogleIcon /></a>
                            <a href="#" title="Continue with Apple" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('apple'); }}><AppleIcon /></a>
                            <a href="#" title="Continue with Facebook" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('facebook'); }}><FacebookIcon /></a>
                            <a href="#" title="Continue with LinkedIn" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('linkedin_oidc'); }}><LinkedinIcon /></a>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 mb-4">
                            {authMethod === 'phone' ? 'or create with WhatsApp phone verification' : 'or use your email for registration'}
                        </span>

                        <div className={`auth-input-group ${regName ? 'is-filled' : ''}`}>
                            <input className="auth-input bg-surface-soft text-text-primary border-border" type="text" value={regName} onChange={e => setRegName(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Name</label>
                        </div>
                        {authMethod === 'phone' ? (
                            <div className={`auth-input-group ${regPhone ? 'is-filled' : ''}`}>
                                <input className="auth-input bg-surface-soft text-text-primary border-border" type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required placeholder=" " inputMode="tel" />
                                <span className="bar"></span>
                                <label className="auth-label">Phone number (+923...)</label>
                            </div>
                        ) : (
                            <div className={`auth-input-group ${regEmail ? 'is-filled' : ''}`}>
                                <EmailInput name="regEmail" className="auth-input bg-surface-soft text-text-primary border-border" value={regEmail} onChange={handleRegisterEmailChange} onAutocomplete={handleSignUpAutocomplete} required placeholder=" " />
                                 <span className="bar"></span>
                                <label className="auth-label">Email</label>
                            </div>
                        )}
                        <div className={`auth-input-group ${regPassword ? 'is-filled' : ''}`} style={{marginBottom: 4}}>
                            <input ref={signUpPasswordRef} className="auth-input bg-surface-soft text-text-primary border-border" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Password</label>
                        </div>
                        <PasswordStrengthMeter password={regPassword} />

                        {error && isSignUpActive && <p className="text-red-500 text-xs mt-2">{error}</p>}
                        <button className="auth-button mt-6" type="submit" disabled={loading}>
                            {loading && isSignUpActive ? <Spinner size="sm" /> : authMethod === 'phone' ? 'Send PIN' : 'Sign Up'}
                        </button>
                        <p className="mt-8 text-sm md:hidden text-gray-600 dark:text-gray-300">
                            Already have an account?{' '}
                            <button type="button" onClick={() => setIsSignUpActive(false)} className="font-semibold text-primary hover:underline focus:outline-none">
                                Sign In
                            </button>
                        </p>
                    </form>
                </div>

                {/* Sign In Form */}
                <div 
                    className="form-container sign-in-container" 
                    style={{ 
                        opacity: !isSignUpActive ? 1 : 0, 
                        zIndex: !isSignUpActive ? 5 : 1,
                        transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                        pointerEvents: !isSignUpActive ? 'auto' : 'none'
                    }}
                >
                    <form onSubmit={handleLoginSubmit} className="auth-form" style={{ height: '100%', justifyContent: 'center' }}>
                        <h1 className="auth-h1 text-text-primary mb-2">Sign in</h1>
                        <div className="social-container mb-4">
                           <a href="#" onClick={(e) => { e.preventDefault(); handleGoogleSignIn(); }}><GoogleIcon /></a>
                           <a href="#" title="Continue with Apple" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('apple'); }}><AppleIcon /></a>
                           <a href="#" title="Continue with Facebook" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('facebook'); }}><FacebookIcon /></a>
                           <a href="#" title="Continue with LinkedIn" onClick={(e) => { e.preventDefault(); handleSupabaseProviderSignIn('linkedin_oidc'); }}><LinkedinIcon /></a>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 mb-4">
                            {authMethod === 'phone' ? 'or use WhatsApp phone verification' : 'or use your account'}
                        </span>
                        {authMethod === 'phone' ? (
                            <div className={`auth-input-group ${loginPhone ? 'is-filled' : ''}`}>
                                <input className="auth-input bg-surface-soft text-text-primary border-border" type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required placeholder=" " inputMode="tel" />
                                <span className="bar"></span>
                                <label className="auth-label">Phone number (+923...)</label>
                            </div>
                        ) : (
                            <div className={`auth-input-group ${loginEmail ? 'is-filled' : ''}`}>
                                <EmailInput name="loginEmail" className="auth-input bg-surface-soft text-text-primary border-border" value={loginEmail} onChange={handleLoginEmailChange} onAutocomplete={handleSignInAutocomplete} required placeholder=" " />
                                <span className="bar"></span>
                                <label className="auth-label">Email</label>
                            </div>
                        )}
                        <div className={`auth-input-group ${(authMethod === 'phone' ? phoneLoginPassword : loginPassword) ? 'is-filled' : ''}`}>
                             <input ref={signInPasswordRef} className="auth-input bg-surface-soft text-text-primary border-border" type="password" value={authMethod === 'phone' ? phoneLoginPassword : loginPassword} onChange={e => authMethod === 'phone' ? setPhoneLoginPassword(e.target.value) : setLoginPassword(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Password</label>
                        </div>
                        {error && !isSignUpActive && <p className="text-red-500 text-xs mt-2">{error}</p>}
                        {authMethod === 'email' && <Link to="/forgot-password" className="text-xs my-4 text-gray-500 dark:text-gray-400 hover:underline">Forgot your password?</Link>}
                        <button className="auth-button" type="submit" disabled={loading}>
                             {loading && !isSignUpActive ? <Spinner size="sm" /> : authMethod === 'phone' ? 'Send PIN' : 'Sign In'}
                        </button>
                        <p className="mt-8 text-sm md:hidden text-gray-600 dark:text-gray-300">
                            Don't have an account?{' '}
                            <button type="button" onClick={() => setIsSignUpActive(true)} className="font-semibold text-primary hover:underline focus:outline-none">
                                Sign Up
                            </button>
                        </p>
                    </form>
                </div>
                
                {/* Overlay Panels */}
                <div className="overlay-container">
                    <div className="auth-overlay">
                        <div className="overlay-panel overlay-left">
                           <div key={isSignUpActive ? 'left-active' : 'left-inactive'} className="animate-fade-in-up-delayed">
                                <h1 className="auth-h1 text-white mb-2">
                                    Hello{signUpOverlayName ? ', ' : ''}
                                    <span key={signUpNameKey} className="animate-fade-in-text">{signUpOverlayName}</span>!
                                </h1>
                                <p className="auth-p text-white/90">If you already have an account, please sign in.</p>
                           </div>
                            <button className="auth-button ghost mt-6" onClick={() => setIsSignUpActive(false)}>Sign In</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <div key={!isSignUpActive ? 'right-active' : 'right-inactive'} className="animate-fade-in-up-delayed">
                                <h1 className="auth-h1 text-white mb-2">
                                    Welcome back, <span key={signInNameKey} className="animate-fade-in-text">{signInOverlayName}</span>!
                                </h1>
                                <p className="auth-p text-white/90">If you don't have an account, please register with us.</p>
                            </div>
                            <button className="auth-button ghost mt-6" onClick={() => setIsSignUpActive(true)}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>

            {pendingPhoneFlow && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
                    <form onSubmit={handleConfirmPhonePin} className="w-full max-w-md rounded-[28px] border border-white/60 bg-white p-8 text-center shadow-2xl">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <PhoneIcon />
                        </div>
                        <h2 className="text-2xl font-black text-gray-950">Enter WhatsApp PIN</h2>
                        <p className="mt-3 text-sm leading-6 text-gray-500">{pinDeliveryMessage}</p>
                        <div className={`auth-input-group mt-6 ${phonePin ? 'is-filled' : ''}`}>
                            <input className="auth-input bg-surface-soft text-center text-xl tracking-[0.35em] text-text-primary border-border" value={phonePin} onChange={e => setPhonePin(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder=" " inputMode="numeric" autoFocus />
                            <span className="bar"></span>
                            <label className="auth-label">6-digit PIN</label>
                        </div>
                        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                        <button className="auth-button mt-6 w-full" type="submit" disabled={loading || phonePin.length !== 6}>
                            {loading ? <Spinner size="sm" /> : pendingPhoneFlow === 'signup' ? 'Verify & Sign Up' : 'Verify & Sign In'}
                        </button>
                        <button type="button" onClick={() => setPendingPhoneFlow(null)} className="mt-4 text-xs font-semibold text-gray-500 hover:text-gray-900">
                            Cancel
                        </button>
                    </form>
                </div>
            )}

        </div>
    );
};

export default LoginPage;
