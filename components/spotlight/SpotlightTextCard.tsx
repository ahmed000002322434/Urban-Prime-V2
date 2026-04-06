import React from 'react';

type SpotlightTextCardProps = {
  caption: string;
  creatorName?: string;
  timeLabel?: string;
  variant?: 'feed' | 'detail' | 'tile';
  className?: string;
};

const SpotlightTextCard: React.FC<SpotlightTextCardProps> = ({
  caption,
  creatorName,
  timeLabel,
  variant = 'feed',
  className = ''
}) => {
  const isDetail = variant === 'detail';
  const isTile = variant === 'tile';
  const showMeta = Boolean(creatorName || timeLabel);
  const bodySizeClass = isDetail
    ? 'text-xl leading-9 sm:text-2xl sm:leading-[2.35rem]'
    : isTile
      ? 'text-sm leading-6 sm:text-[15px] sm:leading-7'
      : 'text-[15px] leading-6 sm:text-lg sm:leading-8';
  const clampClass = isDetail ? '' : isTile ? 'line-clamp-4' : 'line-clamp-5';
  const paddingClass = isDetail
    ? 'px-5 py-5 sm:px-7 sm:py-6'
    : isTile
      ? 'px-3.5 py-3.5 sm:px-4 sm:py-4'
      : 'px-3.5 py-3.5 sm:px-5 sm:py-5';

  return (
    <div className={`spotlight-text-card relative w-full ${paddingClass} ${className}`}>
      <div className="relative flex w-full flex-col gap-3">
        {showMeta ? (
          <div className="flex items-center justify-between gap-3">
            {creatorName ? (
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {creatorName}
              </p>
            ) : <span />}
            {timeLabel ? (
              <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {timeLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <p className={`max-w-full whitespace-pre-wrap break-words font-medium text-slate-950 dark:text-slate-100 ${bodySizeClass} ${clampClass}`}>
          {caption || 'Urban Prime Spotlight'}
        </p>
      </div>
    </div>
  );
};

export default SpotlightTextCard;
