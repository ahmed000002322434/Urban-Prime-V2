import React, { useMemo } from 'react';
import type { VerificationLevel } from '../types';

interface VerifiedBadgeProps {
  type: 'user' | 'item';
  level?: VerificationLevel;
  className?: string;
}

const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ type, level = 'none', className = '' }) => {
  const badgeInfo = useMemo(() => {
    if (type === 'item') {
      return {
        text: 'Verified Item',
        tooltip: 'This item has been verified by Urban Prime for quality and accuracy.',
        colorClasses: 'text-gray-600 bg-gray-100',
        render: true,
      };
    }

    switch (level) {
      case 'level2':
        return {
          text: 'ID Verified',
          tooltip: 'This user has completed identity verification with a government-issued ID.',
          colorClasses: 'text-green-600 bg-green-100',
          render: true,
        };
      case 'level1':
        return {
          text: 'Email Verified',
          tooltip: 'This user has verified their email address.',
          colorClasses: 'text-gray-600 bg-gray-100',
          render: true,
        };
      default:
        return { render: false, text: '', tooltip: '', colorClasses: '' };
    }
  }, [type, level]);

  if (!badgeInfo.render) {
    return null;
  }

  return (
    <div className={`relative group inline-flex items-center ${className}`}>
      <div className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full ${badgeInfo.colorClasses}`}>
        <ShieldIcon />
        <span>{badgeInfo.text}</span>
      </div>
      <div className="absolute bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {badgeInfo.tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
      </div>
    </div>
  );
};

export default VerifiedBadge;
