import React from 'react';
import { Link } from 'react-router-dom';
import { cx } from './classNames';

export type ClayStatCardVariant = 'default' | 'accent';
export type ClayStatCardSize = 'sm' | 'md' | 'lg';
export type ClayStatCardTone = 'neutral' | 'accent' | 'success' | 'warning';

export interface ClayStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  to?: string;
  variant?: ClayStatCardVariant;
  size?: ClayStatCardSize;
  tone?: ClayStatCardTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

const ClayStatCard: React.FC<ClayStatCardProps> = ({
  label,
  value,
  subtext,
  to,
  className,
  ...rest
}) => {
  const content = (
    <div className={cx('glass-panel glass-panel-hover p-5 block transition-all group', className)} {...rest}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-text-secondary opacity-70 uppercase tracking-wider">{label}</p>
        <div className="h-2 w-2 rounded-full bg-blue-500/40 group-hover:bg-blue-500 transition-colors" />
      </div>
      <p className="text-2xl font-black text-text-primary mt-2">{value}</p>
      {subtext && <p className="text-[11px] font-bold text-text-secondary opacity-60 mt-2">{subtext}</p>}
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};

export default ClayStatCard;
