import React from 'react';
import { Link } from 'react-router-dom';
import LottieAnimation from '../LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

type AnimationKey = keyof typeof uiLottieAnimations;

type Action = {
  label: string;
  to: string;
};

interface ServiceWorkflowEmptyStateProps {
  eyebrow?: string;
  title: string;
  body: string;
  animation?: AnimationKey;
  imageSrc?: string;
  imageAlt?: string;
  highlights?: string[];
  primaryAction?: Action;
  secondaryAction?: Action;
  compact?: boolean;
  className?: string;
}

const cx = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join(' ');

const ServiceWorkflowEmptyState: React.FC<ServiceWorkflowEmptyStateProps> = ({
  eyebrow,
  title,
  body,
  animation = 'noResults',
  imageSrc,
  imageAlt,
  highlights = [],
  primaryAction,
  secondaryAction,
  compact = false,
  className
}) => (
  <div
    className={cx(
      'overflow-hidden rounded-[30px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(255,255,255,0.72)_42%,_rgba(242,245,255,0.92)_100%),linear-gradient(160deg,_rgba(255,255,255,0.96),_rgba(245,247,255,0.88))] shadow-soft dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03)_42%,_rgba(24,29,42,0.98)_100%),linear-gradient(160deg,_rgba(20,24,35,0.96),_rgba(12,15,24,0.96))]',
      compact ? 'p-5' : 'p-6 sm:p-7',
      className
    )}
  >
    <div className={cx('grid gap-5', compact ? 'lg:grid-cols-[0.8fr_1.2fr] lg:items-center' : 'lg:grid-cols-[0.95fr_1.05fr] lg:items-center')}>
      <div className="relative flex justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex h-full min-h-[180px] w-full items-center justify-center rounded-[28px] border border-white/50 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
          {imageSrc ? (
            <img src={imageSrc} alt={imageAlt || title} className={cx(compact ? 'h-36 w-auto' : 'h-44 w-auto', 'max-w-full object-contain')} />
          ) : (
            <LottieAnimation
              src={uiLottieAnimations[animation]}
              alt={imageAlt || title}
              className={cx(compact ? 'h-36 w-36' : 'h-44 w-44', 'object-contain')}
              loop
              autoplay
            />
          )}
        </div>
      </div>

      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        ) : null}
        <h3 className={cx('mt-2 font-black tracking-tight text-text-primary', compact ? 'text-2xl' : 'text-3xl')}>{title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{body}</p>

        {highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.map((entry) => (
              <span
                key={entry}
                className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
              >
                {entry}
              </span>
            ))}
          </div>
        ) : null}

        {(primaryAction || secondaryAction) ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {primaryAction ? (
              <Link to={primaryAction.to} className="inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:brightness-110">
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className="inline-flex rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-soft"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

export default ServiceWorkflowEmptyState;
