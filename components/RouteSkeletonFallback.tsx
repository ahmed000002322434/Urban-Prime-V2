import React from 'react';
import { useLocation } from 'react-router-dom';

const blockStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface-soft)',
};

const PulseBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl ${className}`} style={blockStyle} />
);

const ShellChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
    <div
      className="sticky top-0 z-20 border-b px-4 py-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <PulseBlock className="h-10 w-36 rounded-full" />
        <div className="hidden items-center gap-3 md:flex">
          <PulseBlock className="h-10 w-24 rounded-full" />
          <PulseBlock className="h-10 w-24 rounded-full" />
          <PulseBlock className="h-10 w-24 rounded-full" />
        </div>
        <PulseBlock className="h-10 w-10 rounded-full" />
      </div>
    </div>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
  </div>
);

const BrowseSkeleton = () => (
  <ShellChrome>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="hidden rounded-[28px] border p-5 lg:block" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <PulseBlock className="mb-5 h-6 w-28" />
        <div className="space-y-4">
          <PulseBlock className="h-12 w-full" />
          <PulseBlock className="h-28 w-full" />
          <PulseBlock className="h-20 w-full" />
          <PulseBlock className="h-24 w-full" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-[28px] border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <PulseBlock className="h-8 w-56" />
              <PulseBlock className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex gap-3">
              <PulseBlock className="h-11 w-32 rounded-full" />
              <PulseBlock className="h-11 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[28px] border p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <PulseBlock className="aspect-[4/5] w-full rounded-[22px]" />
              <div className="space-y-3 px-1 pb-2 pt-4">
                <PulseBlock className="h-4 w-20" />
                <PulseBlock className="h-5 w-full" />
                <PulseBlock className="h-5 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                  <PulseBlock className="h-6 w-24" />
                  <PulseBlock className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </ShellChrome>
);

const DetailSkeleton = () => (
  <ShellChrome>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div className="space-y-4">
        <PulseBlock className="aspect-[4/5] w-full rounded-[32px]" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <PulseBlock key={index} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="rounded-[32px] border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="space-y-4">
          <PulseBlock className="h-4 w-24" />
          <PulseBlock className="h-10 w-full" />
          <PulseBlock className="h-10 w-4/5" />
          <PulseBlock className="h-8 w-40" />
          <PulseBlock className="h-24 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <PulseBlock className="h-14 w-full rounded-full" />
            <PulseBlock className="h-14 w-full rounded-full" />
          </div>
          <PulseBlock className="h-40 w-full" />
        </div>
      </div>
    </div>
  </ShellChrome>
);

const DashboardSkeleton = () => (
  <ShellChrome>
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-4 rounded-[28px] border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <PulseBlock className="h-16 w-full rounded-2xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <PulseBlock key={index} className="h-12 w-full rounded-2xl" />
        ))}
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border p-5"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <PulseBlock className="h-4 w-24" />
              <PulseBlock className="mt-4 h-10 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-[28px] border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <PulseBlock className="mb-5 h-7 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <PulseBlock key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </ShellChrome>
);

const MediaSkeleton = () => (
  <ShellChrome>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_360px]">
      <PulseBlock className="min-h-[70vh] rounded-[36px]" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border p-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <PulseBlock className="aspect-[9/16] w-full rounded-[24px]" />
          </div>
        ))}
      </div>
    </div>
  </ShellChrome>
);

const AuthSkeleton = () => (
  <div
    className="flex min-h-screen items-center justify-center px-4"
    style={{ backgroundColor: 'var(--color-background)' }}
  >
    <div
      className="w-full max-w-md rounded-[32px] border p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="space-y-4">
        <PulseBlock className="mx-auto h-12 w-12 rounded-full" />
        <PulseBlock className="mx-auto h-8 w-40" />
        <PulseBlock className="h-12 w-full" />
        <PulseBlock className="h-12 w-full" />
        <PulseBlock className="h-12 w-full rounded-full" />
      </div>
    </div>
  </div>
);

const GenericSkeleton = () => (
  <ShellChrome>
    <div className="space-y-6">
      <div className="rounded-[32px] border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <PulseBlock className="h-10 w-56" />
        <PulseBlock className="mt-4 h-5 w-96 max-w-full" />
        <PulseBlock className="mt-3 h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <PulseBlock className="h-40 w-full" />
            <PulseBlock className="mt-4 h-5 w-2/3" />
            <PulseBlock className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  </ShellChrome>
);

const categoryLikeRoutes = new Set([
  '/explore',
  '/stores',
  '/brands',
  '/deals',
  '/new-arrivals',
  '/compare',
  '/sellers',
  '/buyers',
  '/renters',
  '/electronics',
  '/clothing',
  '/beauty-personal-care',
  '/home-living',
  '/groceries-essentials',
  '/sports-outdoors',
]);

const authPrefixes = ['/auth', '/register', '/forgot-password', '/reset-password', '/admin-login'];
const mediaPrefixes = ['/reels', '/spotlight', '/pixe', '/live'];
const detailPrefixes = ['/item/', '/service/', '/s/'];
const dashboardPrefixes = ['/profile', '/cart', '/checkout', '/messages', '/admin', '/payment-options'];

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

const isBrowseLikeRoute = (pathname: string) => {
  if (pathname.startsWith('/browse')) return true;
  if (pathname.startsWith('/brands/')) return true;
  return categoryLikeRoutes.has(pathname);
};

type RouteSkeletonFallbackProps = {
  pathname?: string;
};

const RouteSkeletonFallback: React.FC<RouteSkeletonFallbackProps> = ({ pathname: pathnameProp }) => {
  const location = useLocation();
  const pathname = pathnameProp || location.pathname;

  if (matchesPrefix(pathname, authPrefixes)) return <AuthSkeleton />;
  if (matchesPrefix(pathname, mediaPrefixes)) return <MediaSkeleton />;
  if (matchesPrefix(pathname, detailPrefixes)) return <DetailSkeleton />;
  if (matchesPrefix(pathname, dashboardPrefixes)) return <DashboardSkeleton />;
  if (isBrowseLikeRoute(pathname)) return <BrowseSkeleton />;
  return <GenericSkeleton />;
};

export default RouteSkeletonFallback;
