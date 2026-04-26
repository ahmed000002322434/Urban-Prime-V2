import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type AccountQuickAccessProps = {
  user?: {
    id?: string;
    avatar?: string;
    name?: string;
  } | null;
  roleLabel: string;
  onNavigate?: () => void;
};

const AccountQuickAccess: React.FC<AccountQuickAccessProps> = ({ user, roleLabel, onNavigate }) => {
  const location = useLocation();
  const profileHref = user?.id ? `/user/${user.id}` : '/profile/settings';
  const isActive = location.pathname === profileHref || location.pathname.startsWith(`${profileHref}/`);

  return (
    <Link
      to={profileHref}
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_28px_rgba(74,16,69,0.1)] backdrop-blur-xl transition-all duration-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_26px_rgba(0,0,0,0.18)] ${
        isActive
          ? 'border-white/32 bg-white/18 dark:border-white/14 dark:bg-white/[0.08]'
          : 'border-white/22 bg-white/14 hover:bg-white/18 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/45 bg-white/90 shadow-[0_10px_18px_rgba(83,26,79,0.1)] dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none">
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
