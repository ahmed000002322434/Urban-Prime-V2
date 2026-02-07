import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import EmailInput from '../../components/EmailInput';
import BackButton from '../../components/BackButton';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await authService.requestPasswordReset(email);
            setMessage(`If an account exists for ${email}, a password reset link has been sent. Please check your inbox.`);
        } catch (err) {
            // Display a generic message for security reasons, but still show the link for the demo user if they mistype.
            setMessage(`If an account exists for ${email}, a password reset link has been sent.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-body">
            <BackButton to="/auth" text="Back to Login" className="absolute top-8 left-8 z-[101]" />
            <div className="auth-container" style={{ minHeight: '400px', width: '420px', display: 'flex' }}>
                <div className="form-container" style={{ width: '100%', left: 0, zIndex: 2 }}>
                    <form onSubmit={handleSubmit} className="auth-form animate-fade-in-up">
                        <h1 className="auth-h1">Reset Password</h1>
                        {message ? (
                            <div className="mt-6 text-center">
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{message}</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-500 dark:text-gray-400 my-4">Enter your email address and we'll send you a link to reset your password.</p>
                                <div className={`auth-input-group ${email ? 'is-filled' : ''}`}>
                                    <EmailInput name="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder=" " />
                                    <span className="bar"></span>
                                    <label className="auth-label">Email</label>
                                </div>
                                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                                <button className="auth-button mt-4" type="submit" disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
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
