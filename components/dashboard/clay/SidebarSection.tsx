import React from 'react';
import { cx } from './classNames';

export type SidebarSectionVariant = 'default' | 'subtle';
export type SidebarSectionSize = 'sm' | 'md' | 'lg';
export type SidebarSectionTone = 'neutral' | 'accent';

export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  headingArrow?: boolean;
  isCollapsed?: boolean;
  variant?: SidebarSectionVariant;
  size?: SidebarSectionSize;
  tone?: SidebarSectionTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  headingArrow = false,
  isCollapsed = false,
  variant = 'default',
  size = 'md',
  tone = 'neutral',
  interactive = false,
  isActive = false,
  icon,
  trailing,
  className,
  children,
  ...rest
}) => (
  <div
    className={cx(
      'clay-sidebar-section',
      `clay-sidebar-section-${variant}`,
      `clay-size-${size}`,
      `clay-tone-${tone}`,
      interactive && 'is-interactive',
      isActive && 'is-active',
      isCollapsed && 'is-collapsed',
      className
    )}
    {...rest}
  >
    {title ? (
      <p className="clay-sidebar-section-title" title={isCollapsed ? title : undefined}>
        {icon ? <span className="clay-sidebar-section-title-icon">{icon}</span> : null}
        <span className="clay-sidebar-section-title-label">{title}</span>
        {headingArrow ? <span className="clay-sidebar-section-title-arrow">›</span> : null}
        {trailing ? <span className="clay-sidebar-section-title-trailing">{trailing}</span> : null}
      </p>
    ) : null}
    <div className="clay-sidebar-section-content">{children}</div>
  </div>
);

export default SidebarSection;
