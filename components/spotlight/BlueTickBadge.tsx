import React from 'react';

type BlueTickBadgeProps = {
  className?: string;
};

const BlueTickBadge: React.FC<BlueTickBadgeProps> = ({ className = '' }) => {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} aria-label="Verified creator">
      <svg viewBox="0 0 96 96" className="h-full w-full drop-shadow-[0_8px_18px_rgba(14,165,233,0.35)]" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="blueTickOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="blueTickInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path
          d="M48 3.5l5.6 4.1 6.9-1.4 4.7 5.2 7.1.3 2.8 6.5 6.6 2.7.3 7.1 5.2 4.7-1.4 6.9 4.1 5.6-4.1 5.6 1.4 6.9-5.2 4.7-.3 7.1-6.6 2.7-2.8 6.5-7.1.3-4.7 5.2-6.9-1.4L48 92.5l-5.6-4.1-6.9 1.4-4.7-5.2-7.1-.3-2.8-6.5-6.6-2.7-.3-7.1-5.2-4.7 1.4-6.9L3.5 48l4.1-5.6-1.4-6.9 5.2-4.7.3-7.1 6.6-2.7 2.8-6.5 7.1-.3 4.7-5.2 6.9 1.4L48 3.5z"
          fill="url(#blueTickOuter)"
        />
        <path
          d="M48 10.5l4.2 3.1 5.1-1 3.5 3.9 5.2.2 2.1 4.7 4.8 2 .2 5.2 3.9 3.5-1 5.1 3.1 4.2-3.1 4.2 1 5.1-3.9 3.5-.2 5.2-4.8 2-2.1 4.7-5.2.2-3.5 3.9-5.1-1L48 85.5l-4.2-3.1-5.1 1-3.5-3.9-5.2-.2-2.1-4.7-4.8-2-.2-5.2-3.9-3.5 1-5.1-3.1-4.2 3.1-4.2-1-5.1 3.9-3.5.2-5.2 4.8-2 2.1-4.7 5.2-.2 3.5-3.9 5.1 1L48 10.5z"
          fill="rgba(255,255,255,0.18)"
        />
        <path d="M36 49.2l7.7 7.9 16.4-18.1" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 49.2l7.7 7.9 16.4-18.1" fill="none" stroke="url(#blueTickInner)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};

export default BlueTickBadge;

