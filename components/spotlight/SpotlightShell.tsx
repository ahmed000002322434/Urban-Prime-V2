import React, { type ReactNode, useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useSpotlightPreferences } from './SpotlightPreferencesContext';
import SpotlightBrand from './SpotlightBrand';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 3 3 10v11h7v-7h4v7h7V10z" />
  </svg>
);

const SpotlightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="m12 3 2.6 5.9L21 10l-4.9 4.2L17.5 21 12 17.8 6.5 21l1.4-6.8L3 10l6.4-1.1L12 3Z" />
  </svg>
);

const BellIcon = ({ badge = 0 }: { badge?: number }) => (
  <span className="relative flex items-center">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 3a6 6 0 0 0-6 6v3.3l-1.7 2.8A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.5L18 12.3V9a6 6 0 0 0-6-6Z" />
      <path d="M9.6 19.2a2.5 2.5 0 0 0 4.8 0" />
    </svg>
    {badge > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
        {badge > 9 ? '9+' : badge}
      </span>
    ) : null}
  </span>
);

const MessagesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 5h16v11H8l-4 3z" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
    <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

type SpotlightShellProps = {
  children: ReactNode;
  rightRail?: ReactNode;
  profileLink?: string;
  onMessagesClick?: () => void;
  messagesActive?: boolean;
  onNotificationsClick?: () => void;
  notificationsActive?: boolean;
  notificationsBadgeCount?: number;
  onMoreClick?: () => void;
  moreActive?: boolean;
  className?: string;
};

const basePillClassName =
  'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition';

const SpotlightShell: React.FC<SpotlightShellProps> = ({
  children,
  rightRail,
  profileLink = '/profile/me',
  onMessagesClick,
  messagesActive = false,
  onNotificationsClick,
  notificationsActive = false,
  notificationsBadgeCount = 0,
  onMoreClick,
  moreActive = false,
  className = ''
}) => {
  const location = useLocation();
  const { preferences } = useSpotlightPreferences();
  const { unreadNotificationCount } = useNotification();
  const surfaceMix = Math.min(0.34, Math.max(0.14, preferences.surfaceOpacity * 0.45 + 0.1));
  const surfaceSoftMix = Math.min(0.22, Math.max(0.06, preferences.surfaceOpacity * 0.3 + 0.04));
  const effectiveNotifications = Math.max(notificationsBadgeCount, unreadNotificationCount);
  const surfaceStyle = {
    '--spotlight-surface-alpha': preferences.surfaceOpacity.toFixed(3),
    '--spotlight-surface-soft-alpha': Math.max(0.04, Math.min(0.18, preferences.surfaceOpacity * 0.42)).toFixed(3),
    '--spotlight-surface-mix': `${Math.round(surfaceMix * 100)}%`,
    '--spotlight-surface-soft-mix': `${Math.round(surfaceSoftMix * 100)}%`
  } as React.CSSProperties & Record<string, string>;

  const navItems = useMemo(
    () => [
      { type: 'link' as const, to: '/', label: 'Home', icon: <HomeIcon />, active: location.pathname === '/' },
      { type: 'link' as const, to: '/spotlight', label: 'Explore', icon: <SpotlightIcon />, active: location.pathname.startsWith('/spotlight') },
      { type: 'action' as const, label: 'Messages', icon: <MessagesIcon />, active: messagesActive, onClick: onMessagesClick },
      { type: 'action' as const, label: 'Alerts', icon: <BellIcon badge={effectiveNotifications} />, active: notificationsActive, onClick: onNotificationsClick },
      { type: 'link' as const, to: profileLink, label: 'Profile', icon: <ProfileIcon />, active: location.pathname === profileLink || location.pathname.startsWith(`${profileLink}/`) },
      ...(onMoreClick
        ? [{ type: 'action' as const, label: 'More', icon: <MoreIcon />, active: moreActive, onClick: onMoreClick }]
        : [])
    ],
    [effectiveNotifications, location.pathname, messagesActive, moreActive, notificationsActive, onMessagesClick, onMoreClick, onNotificationsClick, profileLink]
  );

  return (
    <div
      className={`pixe-noir-shell spotlight-theme-root spotlight-shell-root min-h-screen text-white ${className}`}
      data-spotlight-density={preferences.compactDensity ? 'compact' : 'regular'}
      data-spotlight-reduced-motion={preferences.reducedMotion ? 'true' : 'false'}
      style={surfaceStyle}
    >
      <div className="sticky top-0 z-40 px-3 pt-2 sm:px-5 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-white/10 bg-black/52 px-3 py-2 shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <SpotlightBrand to="/spotlight" compact />
            </div>

            <nav className="inline-flex max-w-[calc(100vw-6rem)] flex-wrap items-center justify-end gap-1 rounded-full border border-white/10 bg-black/52 px-2 py-2 shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              {navItems.map((item) => {
                if (item.type === 'link') {
                  return (
                    <NavLink
                      key={`${item.to}-${item.label}`}
                      to={item.to}
                      className={({ isActive }) =>
                        `${basePillClassName} ${
                          isActive || item.active
                            ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
                            : 'text-white/74 hover:bg-white/[0.08] hover:text-white'
                        }`
                      }
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`${basePillClassName} ${
                      item.active
                        ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
                        : 'text-white/74 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <Link
                to="/spotlight/create"
                className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[13px] font-semibold text-black shadow-[0_10px_24px_rgba(255,255,255,0.14)] transition hover:brightness-95"
              >
                Post
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 pt-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {children}
        </div>

        {rightRail ? (
          <aside className="hidden xl:block">
            <div className="sticky top-[5.25rem] max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-[1.8rem] border border-white/10 bg-black/42 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              {rightRail}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

export default SpotlightShell;
