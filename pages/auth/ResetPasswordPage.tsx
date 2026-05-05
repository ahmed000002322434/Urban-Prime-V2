
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import EmailInput from '../../components/EmailInput';
import BackButton from '../../components/BackButton';
import AuthVideoBackdrop from '../../components/auth/AuthVideoBackdrop';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [pin, setPin] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const getResetErrorMessage = (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err || '');
        if (/Firebase Admin credentials/i.test(message)) {
            return 'Password reset is not configured yet. Add Firebase Admin credentials to the backend and try again.';
        }
        return message || 'An unknown error occurred.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Email is required.");
            return;
        }
        if (pin.replace(/\D/g, '').length !== 6) {
            setError("Enter the 6-digit reset PIN.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');
        try {
            await authService.resetPasswordWithPin(email, pin, password);
            setMessage("Your password has been reset successfully!");
        } catch (err) {
            setError(getResetErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-body relative overflow-hidden bg-transparent">
            <AuthVideoBackdrop />
            <BackButton to="/auth" text="Back to Login" className="absolute top-8 left-8 z-[101]" />
            <div className="auth-container relative z-10" style={{ minHeight: '400px', width: '420px', display: 'flex' }}>
                <div className="form-container" style={{ width: '100%', left: 0, zIndex: 2 }}>
                    <form onSubmit={handleSubmit} className="auth-form animate-fade-in-up">
                        <h1 className="auth-h1">Set New Password</h1>
                        {message ? (
                            <div className="mt-6 text-center">
                                <p className="text-green-600 dark:text-green-400">{message}</p>
                                <Link to="/auth"><button className="auth-button mt-4">Back to Login</button></Link>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-500 dark:text-gray-400 my-4">Enter the reset PIN and choose a new password.</p>
                                <div className={`auth-input-group ${email ? 'is-filled' : ''}`}>
                                    <EmailInput name="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder=" " />
                                    <span className="bar"></span>
                                    <label className="auth-label">Email</label>
                                </div>
                                <div className={`auth-input-group ${pin ? 'is-filled' : ''}`}>
                                    <input
                                        className="auth-input text-center tracking-[0.35em]"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={pin}
                                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        placeholder=" "
                                    />
                                    <span className="bar"></span>
                                    <label className="auth-label">Reset PIN</label>
                                </div>
                                <div className={`auth-input-group ${password ? 'is-filled' : ''}`} style={{marginBottom: 4}}>
                                    <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder=" " />
                                    <span className="bar"></span>
                                    <label className="auth-label">New Password</label>
                                </div>
                                <PasswordStrengthMeter password={password} />
                                <div className={`auth-input-group ${confirmPassword ? 'is-filled' : ''}`}>
                                    <input className="auth-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder=" " />
                                    <span className="bar"></span>
                                    <label className="auth-label">Confirm New Password</label>
                                </div>
                                
                                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                                
                                <button className="auth-button mt-4" type="submit" disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : 'Reset Password'}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
