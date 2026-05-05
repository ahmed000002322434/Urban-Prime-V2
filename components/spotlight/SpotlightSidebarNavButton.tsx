import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type SpotlightSidebarNavButtonProps = {
  to: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number;
  collapsed?: boolean;
};

const SpotlightSidebarNavButton: React.FC<SpotlightSidebarNavButtonProps> = ({
  to,
  label,
  icon,
  active = false,
  badge = 0,
  collapsed = false
}) => {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`group flex items-center rounded-[20px] border px-3 py-2.5 transition duration-200 ${
        active
          ? 'border-white/[0.12] bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'border-transparent bg-transparent text-white/72 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white'
      } ${collapsed ? 'justify-center gap-0 px-2.5' : 'gap-3'}`}
    >
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition duration-200 ${
          active
            ? 'border-white bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.08)]'
            : 'border-white/[0.08] bg-white/[0.02] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] group-hover:border-white/[0.14] group-hover:bg-white/[0.05]'
        }`}
      >
        {icon}
        {badge > 0 ? (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ${
              active ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>

      {!collapsed ? (
        <span className={`min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.02em] ${active ? 'text-white' : 'text-white/84'}`}>
          {label}
        </span>
      ) : null}
    </Link>
  );
};

export default SpotlightSidebarNavButton;
