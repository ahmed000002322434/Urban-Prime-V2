import React from 'react';
import { Link } from 'react-router-dom';
import LottieAnimation from '../LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

type PixeEmptyStateProps = {
  title: string;
  message: string;
  animation?: keyof typeof uiLottieAnimations;
  primaryAction?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    to: string;
  };
  className?: string;
  contained?: boolean;
};

const PixeEmptyState: React.FC<PixeEmptyStateProps> = ({
  title,
  message,
  animation = 'noResults',
  primaryAction,
  secondaryAction,
  className = '',
  contained = true
}) => {
  return (
    <div className={`flex w-full items-center justify-center ${className}`.trim()}>
      <div className={`w-full max-w-xl text-center ${contained ? 'rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8' : 'p-2 sm:p-4'}`.trim()}>
        <div className="mb-4 flex items-center justify-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${contained ? 'border border-white/10 bg-black/35' : 'border border-white/8 bg-black/20'}`.trim()}>
            <img src="/icons/urbanprime.svg" alt="Urban Prime" className="h-8 w-8 object-contain" />
          </div>
        </div>

        <div className="mb-5 flex justify-center">
          <LottieAnimation
            src={uiLottieAnimations[animation]}
            alt={title}
            className="h-40 w-40 object-contain"
            loop
            autoplay
          />
        </div>

        <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/62">{message}</p>

        {primaryAction || secondaryAction ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {primaryAction ? (
              <Link
                to={primaryAction.to}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/82"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PixeEmptyState;
