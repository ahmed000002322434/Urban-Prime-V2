import { useEffect, useState } from 'react';

const detectLowEndDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const hardwareConcurrency = Number(nav.hardwareConcurrency || 8);
  const deviceMemory = Number(nav.deviceMemory || 8);
  const saveData = Boolean(nav.connection?.saveData);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return saveData || prefersReducedMotion || hardwareConcurrency <= 4 || deviceMemory <= 4;
};

export const useLowEndMode = () => {
  const [isLowEndMode, setIsLowEndMode] = useState<boolean>(() => detectLowEndDevice());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsLowEndMode(detectLowEndDevice());
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return isLowEndMode;
};

export default useLowEndMode;
