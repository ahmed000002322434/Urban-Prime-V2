

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import EmailInput from './EmailInput';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import BackButton from './BackButton';

// Icons for social buttons
const FacebookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg>;
const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/></svg>;
const LinkedinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>;

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


const AuthModal: React.FC = () => {
    const [isSignUpActive, setIsSignUpActive] = useState(false);
    
    const { login, register, signInWithGoogle, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const signInPasswordRef = useRef<HTMLInputElement>(null);
    const signUpPasswordRef = useRef<HTMLInputElement>(null);
    
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [signInOverlayName, setSignInOverlayName] = useState('Friend');
    const [signInNameKey, setSignInNameKey] = useState(0);
    const [signUpOverlayName, setSignUpOverlayName] = useState('');
    const [signUpNameKey, setSignUpNameKey] = useState(0);
    
    const from = location.state?.from?.pathname || "/";

    useEffect(() => {
        if (isAuthenticated) {
            setLoading(false);
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

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
            await login(loginEmail, loginPassword);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(regName, regEmail, regPassword, '', '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
            navigate(from, { replace: true });
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    }

    const handleFacebookSignIn = () => {
        setError('Facebook sign-in is coming soon.');
    };

    const handleLinkedinSignIn = () => {
        setError('LinkedIn sign-in is coming soon.');
    };

    return (
        <div className="auth-body">
            <BackButton className="absolute top-8 left-8 z-[101]" />
            <div className={`auth-container ${isSignUpActive ? 'right-panel-active' : ''}`}>
                {/* Sign Up Form */}
                <div className="form-container sign-up-container">
                    <form onSubmit={handleRegisterSubmit} className="auth-form">
                        <h1 className="auth-h1">Create Account</h1>
                        <div className="social-container">
                            <button type="button" onClick={handleGoogleSignIn}><GoogleIcon /></button>
                            <button type="button" onClick={handleFacebookSignIn}><FacebookIcon /></button>
                            <button type="button" onClick={handleLinkedinSignIn}><LinkedinIcon /></button>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">or use your email for registration</span>

                        <div className={`auth-input-group ${regName ? 'is-filled' : ''}`}>
                            <input className="auth-input" type="text" value={regName} onChange={e => setRegName(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Name</label>
                        </div>
                        <div className={`auth-input-group ${regEmail ? 'is-filled' : ''}`}>
                            <EmailInput name="regEmail" className="auth-input" value={regEmail} onChange={handleRegisterEmailChange} onAutocomplete={handleSignUpAutocomplete} required placeholder=" " />
                             <span className="bar"></span>
                            <label className="auth-label">Email</label>
                        </div>
                        <div className={`auth-input-group ${regPassword ? 'is-filled' : ''}`} style={{marginBottom: 4}}>
                            <input ref={signUpPasswordRef} className="auth-input" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Password</label>
                        </div>
                        <PasswordStrengthMeter password={regPassword} />

                        {error && isSignUpActive && <p className="text-red-500 text-xs mt-2">{error}</p>}
                        <button className="auth-button mt-4" type="submit" disabled={loading}>
                            {loading && isSignUpActive ? <Spinner size="sm" /> : 'Sign Up'}
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
                <div className="form-container sign-in-container">
                    <form onSubmit={handleLoginSubmit} className="auth-form">
                        <h1 className="auth-h1">Sign in</h1>
                        <div className="social-container">
                           <button type="button" onClick={handleGoogleSignIn}><GoogleIcon /></button>
                           <button type="button" onClick={handleFacebookSignIn}><FacebookIcon /></button>
                           <button type="button" onClick={handleLinkedinSignIn}><LinkedinIcon /></button>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">or use your account</span>
                        <div className={`auth-input-group ${loginEmail ? 'is-filled' : ''}`}>
                            <EmailInput name="loginEmail" className="auth-input" value={loginEmail} onChange={handleLoginEmailChange} onAutocomplete={handleSignInAutocomplete} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Email</label>
                        </div>
                        <div className={`auth-input-group ${loginPassword ? 'is-filled' : ''}`}>
                             <input ref={signInPasswordRef} className="auth-input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder=" " />
                            <span className="bar"></span>
                            <label className="auth-label">Password</label>
                        </div>
                        {error && !isSignUpActive && <p className="text-red-500 text-xs mt-2">{error}</p>}
                        <Link to="/forgot-password" className="text-xs my-2 text-gray-500 dark:text-gray-400 hover:underline">Forgot your password?</Link>
                        <button className="auth-button" type="submit" disabled={loading}>
                             {loading && !isSignUpActive ? <Spinner size="sm" /> : 'Sign In'}
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
                                <h1 className="auth-h1">
                                    Hello{signUpOverlayName ? ', ' : ''}
                                    <span key={signUpNameKey} className="animate-fade-in-text">{signUpOverlayName}</span>!
                                </h1>
                                <p className="auth-p">If you already have an account, please sign in.</p>
                           </div>
                            <button className="auth-button ghost" onClick={() => setIsSignUpActive(false)}>Sign In</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <div key={!isSignUpActive ? 'right-active' : 'right-inactive'} className="animate-fade-in-up-delayed">
                                <h1 className="auth-h1">
                                    Welcome back, <span key={signInNameKey} className="animate-fade-in-text">{signInOverlayName}</span>!
                                </h1>
                                <p className="auth-p">If you don't have an account, please register with us.</p>
                            </div>
                            <button className="auth-button ghost" onClick={() => setIsSignUpActive(true)}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AuthModal;
