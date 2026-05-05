import React from 'react';
import { Link } from 'react-router-dom';

type SpotlightBrandProps = {
  title?: string;
  subtitle?: string;
  to: string;
  compact?: boolean;
};

export const SpotlightBrandIcon: React.FC = () => (
  <span className="flex h-9 w-9 items-center justify-center rounded-[1.1rem] border border-white/12 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.14),rgba(255,255,255,0.04)_42%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] text-white shadow-[0_16px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]">
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
        <span className="hidden truncate text-[8px] font-semibold uppercase tracking-[0.2em] text-white/52 sm:block">
          {subtitle}
        </span>
        <span className={`block truncate font-semibold tracking-[-0.02em] text-white ${compact ? 'text-[15px]' : 'text-[15px] sm:text-[16px]'}`}>
          {title}
        </span>
      </span>
    </Link>
  );
};

export default SpotlightBrand;
