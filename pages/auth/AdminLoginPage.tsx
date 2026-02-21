
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import EmailInput from '../../components/EmailInput';
import AuthVideoBackdrop from '../../components/auth/AuthVideoBackdrop';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@urbanprime.com');
  const [password, setPassword] = useState('secret_admin_123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      if (user.isAdmin) {
        navigate('/admin/dashboard');
      } else {
        setError('Access Denied. This account does not have administrator privileges.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in-up relative overflow-hidden">
      <AuthVideoBackdrop />
      <BackButton to="/" alwaysShowText className="absolute top-8 left-8 !text-white" />
      <div className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display text-center">Admin Access</h2>
          <p className="text-gray-600 mb-6 text-center text-sm">Enter administrator credentials to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="sr-only">Email</label>
              <EmailInput
                id="admin-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="mt-1 block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="sr-only">Password</label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="mt-1 block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 transition-all active:scale-95 !mt-6"
            >
              {isLoading ? <Spinner size="sm" /> : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
