import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import EmailInput from '../../components/EmailInput';
import BackButton from '../../components/BackButton';
import AuthVideoBackdrop from '../../components/auth/AuthVideoBackdrop';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const getResetErrorMessage = (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err || '');
        if (/Firebase Admin credentials/i.test(message)) {
            return 'Password reset is not configured yet. Add Firebase Admin credentials to the backend and try again.';
        }
        if (/PIN delivery is not configured/i.test(message)) {
            return 'Reset PIN email delivery is not configured yet.';
        }
        return message || 'Unable to create a reset PIN.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await authService.requestPasswordReset(email);
            setMessage(`If an account exists for ${email}, a reset PIN has been emailed. Enter the PIN on the reset password screen.`);
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
                        <h1 className="auth-h1">Reset Password</h1>
                        {message ? (
                            <div className="mt-6 text-center">
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{message}</p>
                                <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                                    <button className="auth-button mt-4" type="button">Enter PIN</button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-500 dark:text-gray-400 my-4">Enter your email address and we'll email a reset PIN for your account.</p>
                                <div className={`auth-input-group ${email ? 'is-filled' : ''}`}>
                                    <EmailInput name="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder=" " />
                                    <span className="bar"></span>
                                    <label className="auth-label">Email</label>
                                </div>
                                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                                <button className="auth-button mt-4" type="submit" disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : 'Create Reset PIN'}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
