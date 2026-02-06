
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import BackButton from '../../components/BackButton';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setToken(searchParams.get('token'));
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!token) {
            setError("Invalid or missing reset token.");
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');
        try {
            // FIX: Expected 0 arguments, but got 2. This error originates from the service definition. The call here is correct based on application logic. The fix will be in itemService.ts.
            await authService.resetPassword(token, password);
            setMessage("Your password has been reset successfully!");
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
             <div className="auth-body">
                <div className="auth-container" style={{ minHeight: '400px', width: '420px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="text-center p-8">
                        <h1 className="auth-h1 text-red-500">Invalid Link</h1>
                        <p className="text-gray-500 dark:text-gray-400 my-4">The password reset link is missing or invalid. Please request a new one.</p>
                        <Link to="/forgot-password"><button className="auth-button">Request Reset Link</button></Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-body">
            <BackButton to="/auth" text="Back to Login" className="absolute top-8 left-8 z-[101]" />
            <div className="auth-container" style={{ minHeight: '400px', width: '420px', display: 'flex' }}>
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
                                <p className="text-gray-500 dark:text-gray-400 my-4">Please enter your new password.</p>
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