import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const SettingItemIcon: React.FC<{ type: 'profile' | 'verify' | 'address' | 'privacy' | 'notify' }> = ({ type }) => {
  if (type === 'verify') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (type === 'address') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (type === 'privacy') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (type === 'notify') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
};

const SettingsSidebar: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-5 py-3.5 text-sm font-medium border-l-4 transition-all duration-200 ${
      isActive
        ? `${
            isDark
              ? 'border-primary text-primary bg-gradient-to-r from-primary/15 to-transparent font-semibold shadow-sm'
              : 'border-primary text-primary bg-gradient-to-r from-primary/10 to-transparent font-semibold shadow-sm'
          }`
        : `${
            isDark
              ? 'border-transparent text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`
    }`;

  const itemClass = `flex items-center gap-2.5`;

  return (
    <nav
      className={`w-full md:w-64 flex-shrink-0 rounded-xl shadow-lg border-2 transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700'
          : 'bg-gradient-to-b from-slate-50 to-white border-slate-200'
      }`}
    >
      <ul className="flex flex-row flex-wrap md:flex-col divide-y md:divide-slate-200 dark:divide-slate-700">
        <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
          <NavLink to="/profile/settings" end className={getNavLinkClass}>
            <span className={itemClass}><SettingItemIcon type="profile" /> Edit Profile</span>
          </NavLink>
        </li>
        <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
          <NavLink to="/profile/settings/trust-and-verification" className={getNavLinkClass}>
            <span className={itemClass}><SettingItemIcon type="verify" /> Trust & Verification</span>
          </NavLink>
        </li>
        <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
          <NavLink to="/profile/settings/addresses" className={getNavLinkClass}>
            <span className={itemClass}><SettingItemIcon type="address" /> Addresses</span>
          </NavLink>
        </li>
        <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
          <NavLink to="/profile/settings/privacy" className={getNavLinkClass}>
            <span className={itemClass}><SettingItemIcon type="privacy" /> Privacy</span>
          </NavLink>
        </li>
        <li className={`flex-1 md:flex-none transition-colors duration-150 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50/50'}`}>
          <NavLink to="/profile/settings/notifications" className={getNavLinkClass}>
            <span className={itemClass}><SettingItemIcon type="notify" /> Notifications</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default SettingsSidebar;
