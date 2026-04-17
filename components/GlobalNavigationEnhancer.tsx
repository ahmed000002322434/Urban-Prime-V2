import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import RouteSkeletonFallback from './RouteSkeletonFallback';
import { prefetchRoute } from '../utils/routePrefetch';

const NAVIGATION_OVERLAY_DELAY_MS = 120;
const NAVIGATION_OVERLAY_MIN_VISIBLE_MS = 180;

const modifierKeysPressed = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const resolveInternalPathname = (anchor: HTMLAnchorElement | null) => {
  if (!anchor) return '';
  if (anchor.target && anchor.target !== '_self') return '';
  if (anchor.hasAttribute('download')) return '';

  const href = anchor.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return '';

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return '';
    return url.pathname || '';
  } catch {
    return '';
  }
};

const getAnchorFromTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;
  return target.closest('a[href]') as HTMLAnchorElement | null;
};

const GlobalNavigationEnhancer: React.FC = () => {
  const location = useLocation();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const overlayShownAtRef = useRef<number>(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const locationKey = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.pathname, location.search, location.hash]
  );

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const scheduleOverlayHide = () => {
      if (!pendingPathname) return;
      clearHideTimer();
      const elapsed = Date.now() - overlayShownAtRef.current;
      const remaining = Math.max(0, NAVIGATION_OVERLAY_MIN_VISIBLE_MS - elapsed);
      hideTimerRef.current = window.setTimeout(() => {
        startTransition(() => setPendingPathname(null));
      }, remaining);
    };

    const queueOverlay = (pathname: string) => {
      clearShowTimer();
      if (!pathname || pathname === location.pathname) return;
      showTimerRef.current = window.setTimeout(() => {
        overlayShownAtRef.current = Date.now();
        startTransition(() => setPendingPathname(pathname));
      }, NAVIGATION_OVERLAY_DELAY_MS);
    };

    const handleHoverPrefetch = (event: Event) => {
      const anchor = getAnchorFromTarget(event.target);
      const pathname = resolveInternalPathname(anchor);
      if (!pathname) return;
      prefetchRoute(pathname);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || modifierKeysPressed(event)) return;
      const anchor = getAnchorFromTarget(event.target);
      const pathname = resolveInternalPathname(anchor);
      if (!pathname || pathname === location.pathname) return;
      prefetchRoute(pathname);
      queueOverlay(pathname);
    };

    document.addEventListener('mouseover', handleHoverPrefetch, true);
    document.addEventListener('focusin', handleHoverPrefetch, true);
    document.addEventListener('touchstart', handleHoverPrefetch, true);
    document.addEventListener('click', handleClick);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const anchor = entry.target as HTMLAnchorElement;
            const pathname = resolveInternalPathname(anchor);
            if (pathname) {
              prefetchRoute(pathname);
            }
            observer?.unobserve(anchor);
          });
        },
        {
          rootMargin: '160px',
          threshold: 0.01,
        }
      );

      Array.from(document.querySelectorAll('a[href]')).forEach((anchor) => {
        const pathname = resolveInternalPathname(anchor as HTMLAnchorElement);
        if (pathname) {
          observer?.observe(anchor);
        }
      });
    }

    return () => {
      clearShowTimer();
      clearHideTimer();
      observer?.disconnect();
      document.removeEventListener('mouseover', handleHoverPrefetch, true);
      document.removeEventListener('focusin', handleHoverPrefetch, true);
      document.removeEventListener('touchstart', handleHoverPrefetch, true);
      document.removeEventListener('click', handleClick);
    };
  }, [location.pathname, pendingPathname]);

  useEffect(() => {
    if (!pendingPathname) return;

    const elapsed = Date.now() - overlayShownAtRef.current;
    const remaining = Math.max(0, NAVIGATION_OVERLAY_MIN_VISIBLE_MS - elapsed);
    const handle = window.setTimeout(() => {
      startTransition(() => setPendingPathname(null));
    }, remaining);

    return () => window.clearTimeout(handle);
  }, [locationKey, pendingPathname]);

  if (!pendingPathname) return null;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      <RouteSkeletonFallback pathname={pendingPathname} />
    </div>
  );
};

export default GlobalNavigationEnhancer;
