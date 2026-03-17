import React from 'react';
import { cx } from './classNames';

export type ClaySectionHeaderVariant = 'default' | 'compact';
export type ClaySectionHeaderSize = 'sm' | 'md' | 'lg';
export type ClaySectionHeaderTone = 'neutral' | 'accent';

export interface ClaySectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  variant?: ClaySectionHeaderVariant;
  size?: ClaySectionHeaderSize;
  tone?: ClaySectionHeaderTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

const ClaySectionHeader: React.FC<ClaySectionHeaderProps> = ({
  title,
  subtitle,
  variant = 'default',
  size = 'md',
  tone = 'neutral',
  interactive = false,
  isActive = false,
  icon,
  trailing,
  className,
  ...rest
}) => (
  <div
    className={cx(
      'clay-section-header',
      `clay-section-header-${variant}`,
      `clay-size-${size}`,
      `clay-tone-${tone}`,
      interactive && 'is-interactive',
      isActive && 'is-active',
      className
    )}
    {...rest}
  >
    <div className="clay-section-header-leading">
      {icon ? <span className="clay-section-header-icon">{icon}</span> : null}
      <div>
        <h2 className="clay-section-header-title">{title}</h2>
        {subtitle ? <p className="clay-section-header-subtitle">{subtitle}</p> : null}
      </div>
    </div>
    {trailing ? <div className="clay-section-header-trailing">{trailing}</div> : null}
  </div>
);

export default ClaySectionHeader;
