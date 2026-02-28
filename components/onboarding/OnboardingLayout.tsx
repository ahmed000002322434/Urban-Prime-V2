import React from 'react';
import AuthVideoBackdrop from '../auth/AuthVideoBackdrop';

interface OnboardingLayoutProps {
  title: string;
  subtitle?: string;
  stepLabel: string;
  stepIndex: number;
  totalSteps: number;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'local' | 'error';
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  nextDisabled?: boolean;
  showSubmit?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

const autosaveCopy: Record<OnboardingLayoutProps['autosaveStatus'], string> = {
  idle: 'All changes synced',
  saving: 'Saving changes...',
  saved: 'Saved',
  local: 'Saved locally (sync pending)',
  error: 'Autosave failed'
};

const autosaveClass: Record<OnboardingLayoutProps['autosaveStatus'], string> = {
  idle: 'border-white/30 bg-white/15 text-white',
  saving: 'border-amber-300/60 bg-amber-400/20 text-amber-100',
  saved: 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100',
  local: 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100',
  error: 'border-red-300/70 bg-red-400/20 text-red-100'
};

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  title,
  subtitle,
  stepLabel,
  stepIndex,
  totalSteps,
  autosaveStatus,
  children,
  onBack,
  onNext,
  onSubmit,
  backLabel = 'Back',
  nextLabel = 'Continue',
  submitLabel = 'Complete setup',
  nextDisabled = false,
  showSubmit = false,
  onSkip,
  skipLabel = 'Skip for now'
}) => {
  const percent = Math.max(0, Math.min(100, (stepIndex / totalSteps) * 100));

  return (
    <div className="relative min-h-screen overflow-x-hidden px-4 py-3 sm:px-6 sm:py-4 md:h-screen md:overflow-hidden">
      <AuthVideoBackdrop />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col md:h-full md:min-h-0">
        <header className="mb-3 rounded-3xl border border-white/25 bg-white/12 p-3 text-white shadow-[0_20px_70px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{stepLabel}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-white/80">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {onSkip ? (
                <button
                  type="button"
                  onClick={onSkip}
                  className="rounded-full border border-white/40 bg-black/30 px-3 py-1 text-xs font-semibold text-white transition hover:bg-black/45"
                >
                  {skipLabel}
                </button>
              ) : null}
              <p className={`rounded-full border px-3 py-1 text-xs font-semibold ${autosaveClass[autosaveStatus]}`}>
                {autosaveCopy[autosaveStatus]}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-white/80">
              Step {stepIndex} of {totalSteps}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-visible md:overflow-hidden">{children}</div>

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="min-w-[128px] rounded-xl border border-white/60 bg-black/35 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {`<- ${backLabel}`}
          </button>
          {showSubmit ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={nextDisabled}
              className="min-w-[168px] rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-12px_rgba(16,185,129,0.9)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="min-w-[168px] rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-12px_rgba(15,185,177,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {`${nextLabel} ->`}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default OnboardingLayout;
