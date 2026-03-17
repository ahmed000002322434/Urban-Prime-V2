import React from 'react';
import { cx } from './classNames';

export type ClayCardVariant = 'default' | 'hero' | 'muted';
export type ClayCardSize = 'sm' | 'md' | 'lg';
export type ClayCardTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ClayCardVariant;
  size?: ClayCardSize;
  tone?: ClayCardTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  interactive = false,
  isActive: active = false,
  tone,
  ...props
}) => {
  const baseClasses = 'glass-panel';
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };
  const interactiveClasses = interactive ? 'glass-panel-hover cursor-pointer active:scale-[0.99]' : '';
  const activeClasses = active ? '!border-blue-500/50 !bg-blue-500/5' : '';
  
  const toneClasses = tone ? {
    accent: '!border-blue-500/30',
    success: '!border-emerald-500/30',
    warning: '!border-amber-500/30',
    danger: '!border-red-500/30',
    neutral: '',
  }[tone] : '';

  return (
    <div
      className={cx(
        baseClasses,
        sizeClasses[size],
        interactiveClasses,
        activeClasses,
        toneClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ClayCard;
