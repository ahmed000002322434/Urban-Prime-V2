import React, { useEffect, useState } from 'react';

type DeferredMountProps = {
  children: React.ReactNode;
  enabled?: boolean;
  timeoutMs?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DeferredMount: React.FC<DeferredMountProps> = ({
  children,
  enabled = true,
  timeoutMs = 1200
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      return;
    }

    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    const idleWindow = window as IdleWindow;
    let cancelled = false;
    const activate = () => {
      if (!cancelled) {
        setIsReady(true);
      }
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleHandle = idleWindow.requestIdleCallback(activate, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(idleHandle);
        }
      };
    }

    const timer = window.setTimeout(activate, timeoutMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, timeoutMs]);

  if (!enabled || !isReady) return null;

  return <>{children}</>;
};

export default DeferredMount;
