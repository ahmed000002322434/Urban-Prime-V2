import React from 'react';
import type { RuntimeAvailabilitySnapshot } from '../types';

interface RuntimeModeNoticeProps {
  snapshot: RuntimeAvailabilitySnapshot | null;
  title?: string;
  className?: string;
}

const toneMap: Record<RuntimeAvailabilitySnapshot['state'], string> = {
  backend_live: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  firestore_fallback: 'border-amber-200 bg-amber-50 text-amber-950',
  local_fallback: 'border-rose-200 bg-rose-50 text-rose-950',
  offline_blocked: 'border-rose-200 bg-rose-50 text-rose-950'
};

const RuntimeModeNotice: React.FC<RuntimeModeNoticeProps> = ({ snapshot, title, className = '' }) => {
  if (!snapshot) return null;

  const heading = title || (snapshot.backendAvailable ? 'Live backend' : 'Degraded runtime');

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${toneMap[snapshot.state]} ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{heading}</p>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
          {snapshot.dataMode}
        </span>
      </div>
      <p className="mt-1 leading-relaxed">{snapshot.message}</p>
    </div>
  );
};

export default RuntimeModeNotice;
