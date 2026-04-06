import React, { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotification } from '../../context/NotificationContext';
import { useSpotlightPreferences } from './SpotlightPreferencesContext';

const HomeIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 3 3 10v11h7v-7h4v7h7V10z" /></svg>;
const SpotlightIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z" /></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 3a6 6 0 0 0-6 6v3.3l-1.7 2.8A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.5L18 12.3V9a6 6 0 0 0-6-6Zm0 18a2.5 2.5 0 0 0 2.4-1.8h-4.8A2.5 2.5 0 0 0 12 21Z" /></svg>;
const MessagesIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M4 5h16v11H8l-4 3z" /></svg>;
const ProfileIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.5-8 5.5V21h16v-1.5c0-3-3.6-5.5-8-5.5Z" /></svg>;
const MoreIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;

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

const NAV_ITEMS = [
  { to: '/', label: 'Back to home page', icon: HomeIcon },
  { to: '/spotlight', label: 'Spotlight', icon: SpotlightIcon },
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/messages', label: 'Messages', icon: MessagesIcon },
  { to: '/profile/me', label: 'Profile', icon: ProfileIcon },
  { to: '/more', label: 'More', icon: MoreIcon }
] as const;

const navBase = 'group flex w-full max-w-[198px] items-center gap-3 rounded-[1.15rem] border border-transparent px-4 py-3 text-sm font-semibold transition duration-200';
const mobileNavBase = 'group flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-full border border-transparent px-1.5 py-2.5 text-[10px] font-semibold transition duration-200';

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
  const items = NAV_ITEMS.map((item) => item.to === '/profile/me' ? { ...item, to: profileLink } : item);
  const renderNavItem = (item: typeof items[number], variant: 'desktop' | 'mobile') => {
    const isMessages = item.to === '/messages' && Boolean(onMessagesClick);
    const isNotifications = item.to === '/notifications' && Boolean(onNotificationsClick);
    const isMore = item.to === '/more' && Boolean(onMoreClick);
    const isActionButton = isMessages || isNotifications || isMore;
    const isActive = (item.to === '/messages' && messagesActive) || (item.to === '/notifications' && notificationsActive) || (item.to === '/more' && moreActive);
    const mobileLabel =
      item.to === '/'
        ? 'Home'
        : item.to === '/spotlight'
          ? 'Spot'
          : item.to === '/notifications'
            ? 'Alerts'
            : item.to === '/messages'
              ? 'Chats'
              : item.to === profileLink
                ? 'Profile'
                : 'More';
    const activeClass = variant === 'desktop'
      ? 'border-sky-300/40 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(29,78,216,0.94),rgba(56,189,248,0.94))] text-white shadow-[0_18px_38px_rgba(29,78,216,0.22)]'
      : 'border-sky-300/40 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(29,78,216,0.94),rgba(56,189,248,0.94))] text-white shadow-[0_18px_38px_rgba(29,78,216,0.22)] ring-1 ring-white/25';
    const inactiveClass = variant === 'desktop'
      ? 'border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
      : 'border-slate-200/60 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
    const iconClass = variant === 'desktop' ? 'relative h-9 w-9 rounded-2xl' : 'relative h-8 w-8 rounded-full';
    const buttonClass = variant === 'desktop' ? navBase : mobileNavBase;

    if (isActionButton) {
      return (
        <button
          key={item.to}
          type="button"
          onClick={isMessages ? onMessagesClick : isNotifications ? onNotificationsClick : onMoreClick}
          className={`${buttonClass} ${isActive ? activeClass : inactiveClass}`}
          aria-pressed={isActive}
        >
          <span className={`flex items-center justify-center bg-white/70 text-current shadow-sm transition duration-200 group-hover:scale-105 dark:bg-white/10 ${iconClass}`}>
            <item.icon />
            {item.to === '/notifications' && effectiveNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow-lg">
                {effectiveNotifications > 9 ? '9+' : effectiveNotifications}
              </span>
            ) : null}
          </span>
          <span className={variant === 'mobile' ? 'max-w-full truncate text-[10px] leading-none' : ''}>{variant === 'mobile' ? mobileLabel : item.label}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `${buttonClass} ${isActive ? activeClass : inactiveClass}`}
      >
        <span className={`flex items-center justify-center bg-white/70 text-current shadow-sm transition duration-200 group-hover:scale-105 dark:bg-white/10 ${iconClass}`}>
          <item.icon />
          {item.to === '/notifications' && effectiveNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow-lg">
              {effectiveNotifications > 9 ? '9+' : effectiveNotifications}
            </span>
          ) : null}
        </span>
        <span className={variant === 'mobile' ? 'max-w-full truncate text-[10px] leading-none' : ''}>{variant === 'mobile' ? mobileLabel : item.label}</span>
      </NavLink>
    );
  };

  return (
    <div
      className={`spotlight-theme-root spotlight-shell-root min-h-screen overflow-hidden text-slate-950 dark:text-white ${className}`}
      data-spotlight-density={preferences.compactDensity ? 'compact' : 'regular'}
      data-spotlight-reduced-motion={preferences.reducedMotion ? 'true' : 'false'}
      style={surfaceStyle}
    >
      <div className="relative z-[1] mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_360px] lg:px-5">
        <aside className="spotlight-shell-panel sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/65 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 lg:flex">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(14,165,233,1),rgba(96,165,250,1))] text-sm font-black text-white shadow-lg">
              UP
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Urban Prime</p>
              <p className="text-sm font-bold text-slate-950 dark:text-white">Spotlight</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {items.map((item) => (
              <div key={item.to}>{renderNavItem(item, 'desktop')}</div>
            ))}
          </nav>

          <div className="mt-auto rounded-[1.35rem] border border-white/60 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <Link to="/spotlight/create" className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(37,99,235,0.96),rgba(56,189,248,0.96))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">
              Create spotlight
            </Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-4 pb-28 lg:pb-0">
          <div className="spotlight-shell-topbar sticky top-0 z-20 -mx-4 border-b border-white/60 bg-white/75 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Urban Prime</p>
                <p className="text-base font-bold text-slate-950 dark:text-white">Spotlight</p>
              </div>
              <Link to="/spotlight/create" className="rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(37,99,235,0.96),rgba(56,189,248,0.96))] px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">Create</Link>
            </div>
          </div>

          {children}
        </div>

        {rightRail ? (
          <aside className="spotlight-shell-panel sticky top-4 hidden h-[calc(100vh-2rem)] overflow-y-auto rounded-[1.8rem] border border-white/70 bg-white/55 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 xl:block">
            {rightRail}
          </aside>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: 'easeOut' }}
        className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 px-3 lg:hidden"
      >
        <div className="spotlight-shell-mobilebar mx-auto grid max-w-[34rem] grid-cols-6 gap-1.5 rounded-full border border-white/75 bg-white/90 p-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.2)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-950/92 max-sm:border-white/10 max-sm:bg-slate-950/94 max-sm:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
          {items.map((item) => (
            <div key={item.to}>
              {renderNavItem(item, 'mobile')}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SpotlightShell;

