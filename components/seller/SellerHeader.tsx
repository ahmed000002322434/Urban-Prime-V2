import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

interface SellerHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const SellerHeader: React.FC<SellerHeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
    const { resolvedTheme } = useTheme();
    const { user, logout } = useAuth();
    const [isProfileOpen, setProfileOpen] = useState(false);
    const isDark = resolvedTheme === 'dark';

    return (
        <header className={`sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b-2 transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 border-b-slate-700'
            : 'bg-gradient-to-r from-white via-slate-50 to-blue-50 border-b-slate-200'
        }`}>
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}>
                    <MenuIcon />
                </button>
                <h1 className={`text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                  isDark
                    ? 'from-blue-300 to-indigo-300'
                    : 'from-slate-800 to-slate-600'
                }`}>Add New Product</h1>
            </div>
            
            <div className="relative">
                <button onClick={() => setProfileOpen(p => !p)} className={`block w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                  isDark
                    ? 'border-primary/60 hover:border-primary'
                    : 'border-primary/40 hover:border-primary'
                }`}>
                    <img src={user?.avatar} alt="User avatar" className="w-full h-full object-cover" />
                </button>
                {isProfileOpen && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border-2 p-2 z-20 backdrop-blur-sm transition-colors duration-300 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-white border-slate-200'
                  }`}>
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className={`block w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all duration-150 font-medium ${
                      isDark
                        ? 'text-slate-200 hover:bg-slate-700 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}>👤 My Profile</Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className={`block w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all duration-150 font-medium ${
                      isDark
                        ? 'text-slate-200 hover:bg-slate-700 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}>⚙️ Settings</Link>
                    <button onClick={logout} className={`w-full text-left px-4 py-2.5 text-sm rounded-lg mt-1 flex items-center gap-2 font-medium transition-all duration-150 border-t ${
                      isDark
                        ? 'text-red-400 hover:bg-red-500/20 border-slate-700 hover:text-red-300'
                        : 'text-red-600 hover:bg-red-50 hover:text-red-700 border-slate-200'
                    }`}>
                        <LogoutIcon/> Logout
                    </button>
                  </div>
                )}
            </div>
        </header>
    );
};

export default SellerHeader;
