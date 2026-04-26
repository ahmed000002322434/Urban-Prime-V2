import React from 'react';

const shellClassName = 'rounded-[28px] bg-[#17171a]/92 shadow-[0_24px_80px_rgba(0,0,0,0.32)]';
const blockClassName = 'animate-pulse rounded-[18px] bg-[#2a2a2f]';

const Block: React.FC<{ className: string }> = ({ className }) => (
  <div className={`${blockClassName} ${className}`} />
);

export const PixeInlineSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-[20px] bg-[#18181b]/92 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] ${className}`}>
    <div className="space-y-3">
      <Block className="h-4 w-28" />
      <Block className="h-4 w-full" />
      <Block className="h-4 w-4/5" />
      <Block className="h-4 w-2/5" />
    </div>
  </div>
);

export const PixeFeedPageSkeleton: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] px-4 pb-8 pt-20 text-white sm:px-6 lg:px-8">
    <div className="mx-auto grid max-w-[112rem] gap-6 xl:grid-cols-[320px_minmax(0,1fr)_108px]">
      <div className={`${shellClassName} hidden p-5 xl:block`}>
        <Block className="h-12 w-12 rounded-full" />
        <div className="mt-4 space-y-3">
          <Block className="h-5 w-40" />
          <Block className="h-4 w-28" />
          <Block className="h-8 w-24 rounded-full" />
        </div>
        <div className="mt-6 space-y-3">
          <Block className="h-6 w-3/4" />
          <Block className="h-4 w-full" />
          <Block className="h-4 w-5/6" />
          <div className="flex gap-2 pt-1">
            <Block className="h-8 w-16 rounded-full" />
            <Block className="h-8 w-20 rounded-full" />
            <Block className="h-8 w-14 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className={`${shellClassName} w-full max-w-[30rem] overflow-hidden p-3`}>
          <Block className="aspect-[9/16] w-full rounded-[24px]" />
        </div>
      </div>

      <div className="hidden items-center justify-center xl:flex">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Block key={index} className="h-14 w-14 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const PixeWatchPageSkeleton: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] px-4 pb-8 pt-20 text-white sm:px-6 lg:px-8">
    <div className="mx-auto grid max-w-[112rem] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex items-center justify-center">
        <div className={`${shellClassName} w-full max-w-[34rem] overflow-hidden p-3`}>
          <Block className="aspect-[9/16] w-full rounded-[24px]" />
        </div>
      </div>
      <div className={`${shellClassName} hidden h-[calc(100svh-9rem)] min-h-[36rem] p-5 lg:block`}>
        <div className="space-y-4">
          <Block className="h-5 w-28" />
          <Block className="h-10 w-full" />
          <Block className="h-24 w-full" />
          <Block className="h-24 w-full" />
          <Block className="h-24 w-full" />
        </div>
      </div>
    </div>
  </div>
);

export const PixeGridPageSkeleton: React.FC<{
  cards?: number;
  columns?: string;
  mediaClassName?: string;
}> = ({ cards = 6, columns = 'sm:grid-cols-2 xl:grid-cols-3', mediaClassName = 'aspect-[9/13]' }) => (
  <div className="space-y-7">
    <section className={`${shellClassName} p-5 sm:p-6`}>
      <div className="space-y-3">
        <Block className="h-4 w-24" />
        <Block className="h-8 w-72 max-w-full" />
        <Block className="h-4 w-full max-w-2xl" />
      </div>
    </section>
    <section className={`grid gap-5 ${columns}`}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className={`${shellClassName} overflow-hidden p-4`}>
          <Block className={`${mediaClassName} w-full rounded-[22px]`} />
          <div className="mt-4 space-y-3">
            <Block className="h-5 w-2/3" />
            <Block className="h-4 w-full" />
            <Block className="h-4 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Block className="h-8 w-20 rounded-full" />
              <Block className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </section>
  </div>
);

export const PixeCreatorGridSkeleton: React.FC<{ cards?: number; columns?: string }> = ({
  cards = 6,
  columns = 'md:grid-cols-2 xl:grid-cols-3'
}) => (
  <div className="space-y-7">
    <section className={`${shellClassName} p-5 sm:p-6`}>
      <div className="space-y-3">
        <Block className="h-4 w-24" />
        <Block className="h-8 w-72 max-w-full" />
        <Block className="h-4 w-full max-w-2xl" />
      </div>
    </section>
    <section className={`grid gap-5 ${columns}`}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className={`${shellClassName} p-5`}>
          <div className="flex items-start gap-4">
            <Block className="h-[4.5rem] w-[4.5rem] rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Block className="h-4 w-20 rounded-full" />
              <Block className="h-6 w-2/3" />
              <Block className="h-4 w-1/2" />
              <Block className="h-4 w-full" />
              <Block className="h-4 w-5/6" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-[#101013] px-4 py-4">
              <Block className="h-4 w-16" />
              <Block className="mt-3 h-7 w-20" />
            </div>
            <div className="rounded-[20px] bg-[#101013] px-4 py-4">
              <Block className="h-4 w-12" />
              <Block className="mt-3 h-7 w-16" />
            </div>
          </div>
        </div>
      ))}
    </section>
  </div>
);

export const PixeChartPageSkeleton: React.FC = () => (
  <div className="space-y-7">
    <section className={`${shellClassName} p-5 sm:p-6`}>
      <div className="space-y-3">
        <Block className="h-4 w-20" />
        <Block className="h-8 w-72 max-w-full" />
        <div className="flex gap-2 pt-1">
          <Block className="h-9 w-14 rounded-full" />
          <Block className="h-9 w-14 rounded-full" />
          <Block className="h-9 w-14 rounded-full" />
        </div>
      </div>
    </section>
    <section className="grid gap-5 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`${shellClassName} p-5`}>
          <Block className="h-4 w-20" />
          <Block className="mt-4 h-9 w-24" />
          <Block className="mt-3 h-4 w-full" />
        </div>
      ))}
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <div className={`${shellClassName} p-5`}>
        <Block className="h-5 w-40" />
        <Block className="mt-5 h-[18rem] w-full rounded-[22px]" />
      </div>
      <div className={`${shellClassName} p-5`}>
        <Block className="h-5 w-44" />
        <Block className="mt-5 h-[18rem] w-full rounded-[22px]" />
      </div>
    </section>
  </div>
);

export const PixeStudioListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-6">
    <section className={`${shellClassName} p-5 sm:p-6`}>
      <div className="space-y-3">
        <Block className="h-4 w-20" />
        <Block className="h-8 w-64" />
        <Block className="h-4 w-full max-w-2xl" />
      </div>
    </section>
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Block key={index} className="h-10 w-24 rounded-full" />
      ))}
    </div>
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`${shellClassName} p-4`}>
          <div className="flex gap-4">
            <Block className="h-24 w-16 rounded-[18px]" />
            <div className="flex-1 space-y-3">
              <Block className="h-5 w-1/3" />
              <Block className="h-4 w-full" />
              <Block className="h-4 w-2/3" />
              <div className="flex gap-2 pt-1">
                <Block className="h-8 w-16 rounded-full" />
                <Block className="h-8 w-16 rounded-full" />
                <Block className="h-8 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PixeCommentThreadSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="rounded-[22px] bg-[#1a1a1d]/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <div className="flex gap-3">
          <Block className="h-9 w-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Block className="h-4 w-28" />
            <Block className="h-4 w-full" />
            <Block className="h-4 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Block className="h-8 w-16 rounded-full" />
              <Block className="h-8 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const PixeMiniRailSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-[20px] bg-[#1a1a1d]/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <Block className="h-14 w-10 rounded-[14px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Block className="h-4 w-3/4" />
          <Block className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
