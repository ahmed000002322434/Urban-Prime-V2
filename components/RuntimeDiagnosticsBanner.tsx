import React, { useEffect, useState } from 'react';
import { getDataModeSummary } from '../services/dataMode';
import { isBackendConfigured } from '../services/backendClient';

const RuntimeDiagnosticsBanner: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'up' | 'down' | 'disabled'>('checking');

  useEffect(() => {
    let cancelled = false;

    const checkBackend = async () => {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() || 'http://localhost:5050';

      if (!isBackendConfigured() && !import.meta.env.DEV) {
        setBackendStatus('disabled');
        return;
      }

      try {
        const res = await fetch(`${backendUrl.replace(/\/$/, '')}/health`, { method: 'GET' });
        if (!cancelled) {
          setBackendStatus(res.ok ? 'up' : 'down');
        }
      } catch {
        if (!cancelled) {
          setBackendStatus('down');
        }
      }
    };

    checkBackend();
    const intervalId = setInterval(checkBackend, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  const statusColor =
    backendStatus === 'up'
      ? 'bg-emerald-500/20 text-emerald-200'
      : backendStatus === 'down'
      ? 'bg-red-500/20 text-red-200'
      : 'bg-amber-500/20 text-amber-200';

  return (
    <div className="fixed bottom-3 left-3 z-[70] rounded-xl border border-white/20 bg-black/75 px-3 py-2 text-[11px] text-white shadow-xl backdrop-blur">
      <div className="font-semibold tracking-wide">Runtime Diagnostics</div>
      <div className="opacity-90">{getDataModeSummary()}</div>
      <div className={`mt-1 inline-flex items-center rounded px-2 py-0.5 ${statusColor}`}>
        backend: {backendStatus}
      </div>
    </div>
  );
};

export default RuntimeDiagnosticsBanner;
