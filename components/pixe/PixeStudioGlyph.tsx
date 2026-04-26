import React from 'react';

type PixeStudioGlyphName =
  | 'dashboard'
  | 'upload'
  | 'content'
  | 'comments'
  | 'channel'
  | 'analytics'
  | 'money'
  | 'settings'
  | 'edit'
  | 'watch'
  | 'delete'
  | 'collapse'
  | 'expand';

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.85,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const PixeStudioGlyph: React.FC<{ name: PixeStudioGlyphName; className?: string }> = ({ name, className = 'h-4.5 w-4.5' }) => {
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.8" />
          <rect x="14" y="3" width="7" height="4.5" rx="1.8" />
          <rect x="14" y="10.5" width="7" height="10.5" rx="1.8" />
          <rect x="3" y="13" width="7" height="8" rx="1.8" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M12 16V4" />
          <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
          <path d="M4 18.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5" />
        </svg>
      );
    case 'content':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <rect x="3" y="4" width="18" height="16" rx="2.4" />
          <path d="M10 9.2 15 12l-5 2.8Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'comments':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M6 17.5 3.5 20V6.8A2.8 2.8 0 0 1 6.3 4h11.4a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8H6Z" />
          <path d="M8 9h8" />
          <path d="M8 12.5h5.5" />
        </svg>
      );
    case 'channel':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M4 19.5h16" />
          <path d="M7 15V10" />
          <path d="M12 15V6.5" />
          <path d="M17 15v-3.5" />
        </svg>
      );
    case 'money':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <rect x="3" y="6" width="18" height="12" rx="2.4" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7 12h.01M17 12h.01" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.4 1.4 0 0 1 0 2l-.1.1a1.4 1.4 0 0 1-2 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a1.5 1.5 0 0 1-1.5 1.5h-.6A1.5 1.5 0 0 1 12 19v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.4 1.4 0 0 1-2 0l-.1-.1a1.4 1.4 0 0 1 0-2l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5a1.5 1.5 0 0 1-1.5-1.5v-.6A1.5 1.5 0 0 1 5 11h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.4 1.4 0 0 1 0-2l.1-.1a1.4 1.4 0 0 1 2 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5A1.5 1.5 0 0 1 11 3.5h.6A1.5 1.5 0 0 1 13 5v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.4 1.4 0 0 1 2 0l.1.1a1.4 1.4 0 0 1 0 2l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H19a1.5 1.5 0 0 1 1.5 1.5v.6A1.5 1.5 0 0 1 19 14h-.1a1 1 0 0 0-.9.6Z" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M4 20h4l10-10-4-4L4 16v4Z" />
          <path d="m12.5 6.5 4 4" />
        </svg>
      );
    case 'watch':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M4.5 7.5h15" />
          <path d="M9.5 3.5h5l1 2.5h4" />
          <path d="M7.5 7.5v10.2A1.8 1.8 0 0 0 9.3 19.5h5.4a1.8 1.8 0 0 0 1.8-1.8V7.5" />
          <path d="M10 10.5v5.5M14 10.5v5.5" />
        </svg>
      );
    case 'collapse':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      );
    case 'expand':
      return (
        <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
};

export default PixeStudioGlyph;
