import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

interface SellerHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const SellerHeader: React.FC<SellerHeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
    const { user, logout } = useAuth();
    const [isProfileOpen, setProfileOpen] = useState(false);

    return (
        <header className="bg-white shadow-sm sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className="text-gray-600 hover:text-black">
                    <MenuIcon />
                </button>
                <h1 className="text-xl font-semibold text-gray-800">Add New Product</h1>
            </div>
            
            <div className="relative">
                <button onClick={() => setProfileOpen(p => !p)} className="block w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 hover:border-primary">
                    <img src={user?.avatar} alt="User avatar" className="w-full h-full object-cover" />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border p-2 z-20">
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">My Profile</Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Settings</Link>
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md mt-1 border-t flex items-center gap-2">
                        <LogoutIcon/> Logout
                    </button>
                  </div>
                )}
            </div>
        </header>
    );
};

export default SellerHeader;
