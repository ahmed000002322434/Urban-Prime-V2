import React from 'react';

interface IconBadgeProps {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-10 h-10 text-xl',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-14 h-14 text-3xl'
};

const IconBadge: React.FC<IconBadgeProps> = ({ icon, size = 'md', className = '' }) => (
  <div className={`rounded-2xl border border-border bg-surface-soft shadow-sm flex items-center justify-center ${sizeMap[size]} ${className}`}>
    {typeof icon === 'string' ? <span className="leading-none">{icon}</span> : icon}
  </div>
);

export default IconBadge;
