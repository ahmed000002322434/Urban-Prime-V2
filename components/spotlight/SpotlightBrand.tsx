import React from 'react';
import { Link } from 'react-router-dom';

type SpotlightBrandProps = {
  title?: string;
  subtitle?: string;
  to: string;
  compact?: boolean;
};

export const SpotlightBrandIcon: React.FC = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.045] text-white shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
    <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m16 5.5 2.75 6.2 6.75.9-5 4.5 1.35 6.65L16 20.2l-5.85 3.55 1.35-6.65-5-4.5 6.75-.9L16 5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  </span>
);

const SpotlightBrand: React.FC<SpotlightBrandProps> = ({
  title = 'Spotlight',
  subtitle = 'Urban Prime',
  to,
  compact = false
}) => {
  return (
    <Link to={to} className="inline-flex min-w-0 items-center gap-2.5 rounded-full">
      <SpotlightBrandIcon />
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

export default SpotlightBrand;
