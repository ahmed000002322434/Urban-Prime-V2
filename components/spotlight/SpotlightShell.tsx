import React, { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

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

const navBase = 'group flex w-full max-w-[198px] items-center gap-3 rounded-[1.15rem] px-4 py-3 text-sm font-semibold transition duration-200';

const SpotlightShell: React.FC<SpotlightShellProps> = ({ children, rightRail, profileLink = '/profile/me', onMessagesClick, messagesActive = false, className = '' }) => {
  const items = NAV_ITEMS.map((item) => item.to === '/profile/me' ? { ...item, to: profileLink } : item);
  const renderNavItem = (item: typeof items[number], variant: 'desktop' | 'mobile') => {
    const isMessages = item.to === '/messages' && Boolean(onMessagesClick);
    const activeClass = variant === 'desktop'
      ? 'bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950'
      : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950';
    const inactiveClass = variant === 'desktop'
      ? 'text-slate-700 hover:bg-white/80 hover:shadow-sm dark:text-slate-200 dark:hover:bg-white/10'
      : 'bg-white/80 text-slate-500 dark:bg-white/5 dark:text-slate-300';
    const iconClass = variant === 'desktop' ? 'h-9 w-9 rounded-2xl' : 'h-8 w-8 rounded-xl';

    if (isMessages) {
      return (
        <button
          key={item.to}
          type="button"
          onClick={onMessagesClick}
          className={`${variant === 'desktop' ? navBase : 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition'} ${messagesActive ? activeClass : inactiveClass}`}
        >
          <span className={`flex items-center justify-center bg-white/70 text-current shadow-sm transition duration-200 group-hover:scale-105 dark:bg-white/10 ${iconClass}`}>
            <item.icon />
          </span>
          <span>{item.label}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `${variant === 'desktop' ? navBase : 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition'} ${isActive ? activeClass : inactiveClass}`}
      >
        <span className={`flex items-center justify-center bg-white/70 text-current shadow-sm transition duration-200 group-hover:scale-105 dark:bg-white/10 ${iconClass}`}>
          <item.icon />
        </span>
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18)_0%,_rgba(248,250,252,0.95)_38%,_rgba(255,255,255,1)_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16)_0%,_rgba(2,6,23,0.92)_42%,_rgba(2,6,23,1)_100%)] dark:text-white ${className}`}>
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_360px] lg:px-5">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/65 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 lg:flex">
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
            <Link to="/spotlight/create" className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950">
              Create spotlight
            </Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="sticky top-0 z-20 -mx-4 border-b border-white/60 bg-white/75 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Urban Prime</p>
                <p className="text-base font-bold text-slate-950 dark:text-white">Spotlight</p>
              </div>
              <Link to="/spotlight/create" className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">Create</Link>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {items.map((item) => (
                <div key={item.to}>
                  {renderNavItem(item, 'mobile')}
                </div>
              ))}
            </div>
          </div>

          {children}
        </div>

        {rightRail ? (
          <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] overflow-y-auto rounded-[1.8rem] border border-white/70 bg-white/55 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 xl:block">
            {rightRail}
          </aside>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/80 px-3 py-2 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85 lg:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto">
          {items.map((item) => (
            <div key={item.to}>
              {renderNavItem(item, 'mobile')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpotlightShell;

