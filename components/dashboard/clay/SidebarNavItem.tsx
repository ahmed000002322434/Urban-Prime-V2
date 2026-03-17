import React from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from './classNames';

export type SidebarNavItemVariant = 'default' | 'danger';

export interface SidebarNavItemProps {
  to?: string;
  end?: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: SidebarNavItemVariant;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  to,
  end,
  label,
  icon,
  onClick,
  variant = 'default',
}) => {
  const baseClassName = cx(
    'group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold',
    variant === 'danger' 
      ? 'text-red-500 hover:bg-red-500/10' 
      : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
  );

  const activeClassName = '!bg-primary/10 !text-primary';

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => cx(baseClassName, isActive && activeClassName)}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClassName}
    >
      {content}
    </button>
  );
};

export default SidebarNavItem;
