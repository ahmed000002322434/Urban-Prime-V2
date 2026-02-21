
import React from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to a named import for 'NavLink' to resolve module resolution error.
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const AccountSidebar: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const navLinkClass = "block px-5 py-3.5 text-sm font-medium border-l-4 transition-all duration-200";
    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `${navLinkClass} ${isActive ? `${
          isDark
            ? 'border-primary text-primary bg-gradient-to-r from-primary/15 to-transparent font-semibold shadow-sm'
            : 'border-primary text-primary bg-gradient-to-r from-primary/10 to-transparent font-semibold shadow-sm'
        }` : `${
          isDark
            ? 'border-transparent text-slate-300 hover:bg-slate-700 hover:text-slate-100'
            : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}`;

    return (
        <nav className={`w-full md:w-64 flex-shrink-0 rounded-xl shadow-lg border-2 transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700'
            : 'bg-gradient-to-b from-slate-50 to-white border-slate-200'
        }`}>
            <ul className="flex md:flex-col divide-y md:divide-slate-200 dark:divide-slate-700">
                <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
                    <NavLink to="/profile/orders" className={getNavLinkClass}>📦 My Orders</NavLink>
                </li>
                <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
                    <NavLink to="/packages" className={getNavLinkClass}>🎁 My Bought Packages</NavLink>
                </li>
                <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
                    <NavLink to="/profile/settings/addresses" className={getNavLinkClass}>📍 My Addresses</NavLink>
                </li>
                <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
                    <NavLink to="/payment-options" className={getNavLinkClass}>💳 My Payment Options</NavLink>
                </li>
            </ul>
        </nav>
    );
};

export default AccountSidebar;
