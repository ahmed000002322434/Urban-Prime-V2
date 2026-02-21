import React from 'react';

interface StepCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ title, description, eyebrow, icon, hint, children }) => {
  return (
    <section
      data-onboarding-card="true"
      className="relative w-full overflow-visible rounded-3xl border border-white/25 bg-white/90 p-4 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-5"
    >
      <div className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-14 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl dark:bg-cyan-400/15" />
      <header className="relative mb-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          {eyebrow ? (
            <p className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : (
            <span />
          )}
          {icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        {hint && <p className="mt-1 text-xs font-medium text-primary/90">{hint}</p>}
      </header>
      <div className="relative">{children}</div>
    </section>
  );
};

export default StepCard;
