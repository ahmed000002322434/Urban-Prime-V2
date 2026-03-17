
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import EmailInput from '../../components/EmailInput';
import AuthVideoBackdrop from '../../components/auth/AuthVideoBackdrop';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in-up relative overflow-hidden dashboard-shell">
      <AuthVideoBackdrop />
      <BackButton to="/" alwaysShowText className="absolute top-8 left-8 !text-white glass-button px-4 py-2" />
      <div className="relative z-10 w-full max-w-sm glass-panel p-1 border-white/20 shadow-2xl">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-3 shadow-lg">
              <img src="/icons/urbanprime.svg" alt="Urban Prime" className="h-full w-full invert" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary mb-2 font-display text-center tracking-tighter">Admin Access</h2>
          <p className="text-text-secondary mb-8 text-center text-sm font-medium opacity-70 uppercase tracking-widest">Portal Credentials Required</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-xs font-black uppercase tracking-wider text-text-secondary ml-1">Email Address</label>
              <EmailInput
                id="admin-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@urbanprime.com"
                className="mt-1 block w-full px-4 py-3 glass-input rounded-xl focus:ring-2 ring-primary/30"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-black uppercase tracking-wider text-text-secondary ml-1">Secure Password</label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-4 py-3 glass-input rounded-xl focus:ring-2 ring-primary/30"
                required
              />
            </div>
            
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.p>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 rounded-xl text-sm font-black uppercase tracking-widest text-white glass-button-vibrant disabled:opacity-50 transition-all shadow-xl !mt-8"
            >
              {isLoading ? <Spinner size="sm" /> : 'Authorize Access'}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
