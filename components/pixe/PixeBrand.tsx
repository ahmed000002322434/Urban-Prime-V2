import React from 'react';
import { Link } from 'react-router-dom';

type PixeBrandProps = {
  title: string;
  subtitle?: string;
  to: string;
  compact?: boolean;
};

const PixeBrandIcon: React.FC = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.045] text-white shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
    <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
      <rect x="6.25" y="5.25" width="19.5" height="21.5" rx="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 12.5 19.5 16 14 19.5V12.5Z" fill="currentColor" />
      <path d="M10.5 24h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </span>
);

const PixeBrand: React.FC<PixeBrandProps> = ({ title, subtitle = 'Urban Prime', to, compact = false }) => {
  return (
    <Link to={to} className="inline-flex min-w-0 items-center gap-2.5 rounded-full">
      <PixeBrandIcon />
      <span className="min-w-0">
        <span className="hidden truncate text-[8px] font-semibold uppercase tracking-[0.22em] text-white/38 sm:block">
          {subtitle}
        </span>
        <span className={`block truncate font-semibold text-white ${compact ? 'text-[14px]' : 'text-[14px] sm:text-[15px]'}`}>
          {title}
        </span>
      </span>
    </Link>
  );
};

export default PixeBrand;
