import React from 'react';

type SkeletonBlockProps = {
  className?: string;
};

const baseClassName =
  'animate-pulse rounded-[24px] bg-[linear-gradient(90deg,rgba(226,232,240,0.95)_0%,rgba(203,213,225,0.92)_45%,rgba(226,232,240,0.95)_100%)] dark:bg-[linear-gradient(90deg,rgba(51,65,85,0.88)_0%,rgba(71,85,105,0.92)_45%,rgba(51,65,85,0.88)_100%)]';

export const CommerceSkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '' }) => (
  <div aria-hidden="true" className={`${baseClassName} ${className}`.trim()} />
);

export const CommerceListPanelSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`.trim()}>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CommerceSkeletonBlock className="h-16 w-16 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <CommerceSkeletonBlock className="h-4 w-32 rounded-full" />
              <CommerceSkeletonBlock className="h-7 w-56 rounded-full" />
              <CommerceSkeletonBlock className="h-4 w-40 rounded-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CommerceSkeletonBlock className="h-9 w-24 rounded-full" />
            <CommerceSkeletonBlock className="h-9 w-28 rounded-full" />
            <CommerceSkeletonBlock className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const CommerceDetailPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background px-4 pb-16 pt-10 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1500px] space-y-8">
      <div className="space-y-3">
        <CommerceSkeletonBlock className="h-4 w-48 rounded-full" />
        <CommerceSkeletonBlock className="h-14 w-full max-w-4xl rounded-[32px]" />
        <CommerceSkeletonBlock className="h-5 w-full max-w-2xl rounded-full" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CommerceSkeletonBlock className="aspect-[4/4.2] w-full rounded-[28px]" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <CommerceSkeletonBlock key={index} className="h-20 w-20 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <CommerceSkeletonBlock key={index} className="h-24 rounded-[24px]" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CommerceSkeletonBlock className="h-4 w-36 rounded-full" />
            <CommerceSkeletonBlock className="mt-4 h-12 w-full rounded-[28px]" />
            <CommerceSkeletonBlock className="mt-4 h-10 w-40 rounded-full" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <CommerceSkeletonBlock key={index} className="h-20 rounded-[24px]" />
              ))}
            </div>
            <CommerceSkeletonBlock className="mt-5 h-12 w-full rounded-full" />
            <CommerceSkeletonBlock className="mt-3 h-12 w-full rounded-full" />
          </div>
          <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CommerceSkeletonBlock className="h-4 w-40 rounded-full" />
            {Array.from({ length: 5 }).map((_, index) => (
              <CommerceSkeletonBlock key={index} className="mt-4 h-12 w-full rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const CommerceOrderDetailSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in-up">
    <div className="space-y-3">
      <CommerceSkeletonBlock className="h-4 w-32 rounded-full" />
      <CommerceSkeletonBlock className="h-12 w-72 rounded-[28px]" />
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-4 sm:grid-cols-2">
            <CommerceSkeletonBlock className="h-24 rounded-[24px]" />
            <CommerceSkeletonBlock className="h-24 rounded-[24px]" />
          </div>
          <CommerceSkeletonBlock className="mt-5 h-12 w-full rounded-full" />
        </div>
        <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <CommerceSkeletonBlock key={index} className="h-16 rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <CommerceSkeletonBlock className="h-20 w-full rounded-[24px]" />
          {Array.from({ length: 4 }).map((_, index) => (
            <CommerceSkeletonBlock key={index} className="mt-4 h-10 w-full rounded-[18px]" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const CommerceDashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CommerceSkeletonBlock className="h-4 w-32 rounded-full" />
      <CommerceSkeletonBlock className="mt-4 h-12 w-full max-w-3xl rounded-[28px]" />
      <CommerceSkeletonBlock className="mt-4 h-5 w-full max-w-2xl rounded-full" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <CommerceSkeletonBlock className="h-4 w-24 rounded-full" />
          <CommerceSkeletonBlock className="mt-4 h-12 w-24 rounded-[24px]" />
          <CommerceSkeletonBlock className="mt-4 h-4 w-full rounded-full" />
        </div>
      ))}
    </div>
    <div className="grid gap-6 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <CommerceSkeletonBlock className="h-4 w-32 rounded-full" />
          <CommerceSkeletonBlock className="mt-4 h-8 w-56 rounded-full" />
          {Array.from({ length: 4 }).map((__, row) => (
            <CommerceSkeletonBlock key={row} className="mt-4 h-24 w-full rounded-[20px]" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
