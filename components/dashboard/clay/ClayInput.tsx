import React from 'react';
import { cx } from './classNames';

export type ClayInputElement = 'input' | 'textarea' | 'select';
export type ClayInputVariant = 'default' | 'quiet';
export type ClayInputSize = 'sm' | 'md' | 'lg';
export type ClayInputTone = 'neutral' | 'accent' | 'danger';

type NativeFieldProps = React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  React.SelectHTMLAttributes<HTMLSelectElement>;

export interface ClayInputProps extends Omit<NativeFieldProps, 'size'> {
  as?: ClayInputElement;
  variant?: ClayInputVariant;
  size?: ClayInputSize;
  tone?: ClayInputTone;
  interactive?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export const ClayInput: React.FC<ClayInputProps> = ({
  className,
  as: Component = 'input',
  size = 'md',
  isActive = false,
  icon,
  trailing,
  ...rest
}) => {
  const baseClasses = 'glass-input rounded-xl px-4 py-2 text-sm font-medium focus:outline-none transition-all w-full';
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  const finalClassName = cx(
    baseClasses,
    sizeClasses[size as keyof typeof sizeClasses],
    icon && 'pl-10',
    trailing && 'pr-10',
    isActive && '!border-blue-500 !bg-blue-500/5',
    className
  );

  return (
    <div className="relative w-full">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">{icon}</span>}
      {Component === 'textarea' ? (
        <textarea className={finalClassName} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : Component === 'select' ? (
        <select className={finalClassName} {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)} />
      ) : (
        <input className={finalClassName} {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60">{trailing}</span>}
    </div>
  );
};

export default ClayInput;
