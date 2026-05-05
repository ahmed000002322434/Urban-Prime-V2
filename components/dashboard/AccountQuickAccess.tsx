import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

type AccountQuickAccessProps = {
  user?: {
    id?: string;
    avatar?: string;
    name?: string;
  } | null;
  roleLabel: string;
  onNavigate?: () => void;
  compact?: boolean;
};

const AccountQuickAccess: React.FC<AccountQuickAccessProps> = ({ user, roleLabel, onNavigate, compact = false }) => {
  const location = useLocation();
  const profileHref = buildPublicProfilePath(user);
  const isActive = location.pathname === profileHref || location.pathname.startsWith(`${profileHref}/`);
  const profileLabel = `${user?.name || 'UrbanPrime User'} profile`;

  if (compact) {
    return (
      <Link
        to={profileHref}
        onClick={onNavigate}
        aria-label={profileLabel}
        className={`group relative mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_28px_rgba(74,16,69,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_26px_rgba(0,0,0,0.18)] ${
          isActive
            ? 'bg-white/20 dark:bg-white/[0.08]'
            : 'bg-white/12 dark:bg-white/[0.05]'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/24 bg-white/90 shadow-[0_10px_18px_rgba(83,26,79,0.1)] dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none">
          {user?.avatar ? (
            <img src={user.avatar} className="h-full w-full object-cover" alt="" />
          ) : (
            <span className="text-sm font-black text-[#6b4d83] dark:text-[#f3eadf]">{user?.name?.charAt(0) || 'U'}</span>
          )}
        </div>
        <span className="pointer-events-none absolute left-[calc(100%+0.8rem)] top-1/2 z-[320] -translate-y-1/2 whitespace-nowrap rounded-full border border-white/18 bg-[#21172e]/95 px-3 py-1.5 text-[0.72rem] font-bold text-white opacity-0 shadow-[0_18px_34px_rgba(20,10,31,0.28)] backdrop-blur-xl transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:translate-x-1 group-focus-visible:opacity-100">
          Profile
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={profileHref}
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_28px_rgba(74,16,69,0.1)] backdrop-blur-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_26px_rgba(0,0,0,0.18)] ${
        isActive
          ? 'bg-white/18 dark:bg-white/[0.08]'
          : 'bg-white/14 hover:bg-white/18 dark:bg-white/[0.05] dark:hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/24 bg-white/90 shadow-[0_10px_18px_rgba(83,26,79,0.1)] dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none">
        {user?.avatar ? (
          <img src={user.avatar} className="h-full w-full object-cover" alt="" />
        ) : (
          <span className="text-sm font-black text-[#6b4d83] dark:text-[#f3eadf]">{user?.name?.charAt(0) || 'U'}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.78rem] font-black uppercase tracking-[0.07em] text-white">{user?.name || 'UrbanPrime User'}</p>
        <p className="mt-0.5 truncate text-[0.66rem] font-medium text-white/72">{roleLabel}</p>
        <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-white/52">Profile</p>
      </div>

      <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/62">
        Open
      </span>
    </Link>
  );
};

export default AccountQuickAccess;
