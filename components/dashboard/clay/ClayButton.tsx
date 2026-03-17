import React from 'react';
import { cx } from './classNames';

export type ClayButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ClayButtonSize = 'sm' | 'md' | 'lg';
export type ClayButtonTone = 'neutral' | 'accent' | 'danger';

export interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  tone?: ClayButtonTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  tone = 'neutral',
  interactive = true,
  isActive = false,
  icon,
  trailing,
  ...rest
}) => {
  const baseClasses = 'glass-button inline-flex items-center justify-center rounded-lg font-bold transition-all';
  const variantClasses = variant === 'primary' ? 'bg-blue-600/20 text-blue-500 border-blue-500/30 hover:bg-blue-600/30' : '';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  const toneClasses = tone !== 'neutral' ? {
    danger: '!border-red-500/30 !text-red-500 !bg-red-500/10 hover:!bg-red-500/20',
    success: '!border-emerald-500/30 !text-emerald-500 !bg-emerald-500/10 hover:!bg-emerald-500/20',
  }[tone] : '';

  return (
    <button
      className={cx(
        baseClasses,
        variantClasses,
        sizeClasses[size],
        toneClasses,
        interactive && 'is-interactive',
        isActive && 'is-active',
        className
      )}
      {...rest}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
      {trailing && <span className="ml-2">{trailing}</span>}
    </button>
  );
};

export default ClayButton;
