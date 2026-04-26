import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ProviderInlineNav, providerNavItems } from './providerWorkspaceUi';

const workspaceCopy: Record<string, { description: string; actionLabel: string; actionTo: string }> = {
  '/profile/provider': {
    description: 'See the provider business in one place: live services, new demand, active delivery, and payout movement without layered dashboard noise.',
    actionLabel: 'Review today',
    actionTo: '/profile/provider'
  },
  '/profile/provider/hub-profile': {
    description: 'Shape the public identity buyers see before they trust, message, shortlist, or book a service.',
    actionLabel: 'Open services',
    actionTo: '/profile/provider/services'
  },
  '/profile/provider/services': {
    description: 'Manage publishing, moderation, and storefront quality in one clean catalog workflow.',
    actionLabel: 'Add service',
    actionTo: '/profile/provider/services/new'
  },
  '/profile/provider/services/new': {
    description: 'Create a service with pricing, availability, media, policies, and review state in one guided flow.',
    actionLabel: 'View services',
    actionTo: '/profile/provider/services'
  },
  '/profile/provider/leads': {
    description: 'Handle new demand before it goes stale, then move serious buyers into contract-ready work.',
    actionLabel: 'Open inbox',
    actionTo: '/profile/messages'
  },
  '/profile/provider/proposals': {
    description: 'Turn custom scope requests into approved work with cleaner proposal context and less handoff friction.',
    actionLabel: 'View leads',
    actionTo: '/profile/provider/leads'
  },
  '/profile/provider/jobs': {
    description: 'Keep delivery, due dates, and execution status readable without mixing them into publishing or finance views.',
    actionLabel: 'Check calendar',
    actionTo: '/profile/provider/calendar'
  },
  '/profile/provider/calendar': {
    description: 'Control availability, blackout dates, and schedule pressure so bookings stay realistic.',
    actionLabel: 'Open jobs',
    actionTo: '/profile/provider/jobs'
  },
  '/profile/provider/earnings': {
    description: 'Track commercial performance, completed revenue, and operational momentum from the same workspace.',
    actionLabel: 'Open payouts',
    actionTo: '/profile/provider/payouts'
  },
  '/profile/provider/payouts': {
    description: 'Review released escrow, payout readiness, and settlement requests without leaving the provider workflow.',
    actionLabel: 'Review earnings',
    actionTo: '/profile/provider/earnings'
  },
  '/profile/provider/reviews': {
    description: 'Monitor trust signals and reputation health where the work is already being managed.',
    actionLabel: 'Open jobs',
    actionTo: '/profile/provider/jobs'
  },
  '/profile/provider/settings': {
    description: 'Keep payout setup, workspace defaults, and provider preferences easy to find and easy to understand.',
    actionLabel: 'Open overview',
    actionTo: '/profile/provider'
  }
};

const flowLabels = ['Storefront', 'Demand', 'Delivery', 'Settlement'];

const ProviderWorkspaceLayout: React.FC = () => {
  const location = useLocation();
  const currentItem = providerNavItems.find((item) =>
    item.to === '/profile/provider' ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ) || providerNavItems[0];
  const copy = workspaceCopy[currentItem.to] || workspaceCopy['/profile/provider'];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[36px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(139,123,232,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,190,112,0.15),_transparent_28%),linear-gradient(140deg,rgba(255,255,255,0.98),rgba(246,249,255,0.94)_48%,rgba(255,249,240,0.96)_100%)] p-6 shadow-[0_24px_56px_rgba(15,23,42,0.07)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,123,232,0.2),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(255,190,112,0.14),_transparent_24%),linear-gradient(140deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96)_48%,rgba(29,24,19,0.98)_100%)]">
        <div className="pointer-events-none absolute -top-24 left-[-2rem] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-3rem] top-10 h-48 w-48 rounded-full bg-[#ffcf8c]/20 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Provider hub
              </span>
              <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {currentItem.hint}
              </span>
            </div>

            <h1 className="mt-4 text-[2rem] font-black tracking-[-0.03em] text-text-primary sm:text-[2.35rem]">
              {currentItem.to === '/profile/provider' ? 'Run the service side from one clear hub' : currentItem.label}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {copy.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                Current section: {currentItem.label}
              </span>
              {flowLabels.map((label) => (
                <span key={label} className="rounded-full border border-border bg-background/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-white/72 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_42px_rgba(0,0,0,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Hub routing</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Everything operational stays in this standalone space</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              The main account dashboard stays separate. Publishing, leads, delivery, and payout work now live here.
            </p>

            <div className="mt-4 rounded-[24px] border border-border bg-background/82 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Current page</p>
              <p className="mt-2 text-lg font-black tracking-tight text-text-primary">{currentItem.label}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{currentItem.hint}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={copy.actionTo}
                className="inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110"
              >
                {copy.actionLabel}
              </Link>
              <Link
                to="/profile/messages"
                className="inline-flex rounded-full border border-border bg-background/90 px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
              >
                Shared messages
              </Link>
              {currentItem.to !== '/profile/provider/hub-profile' ? (
                <Link
                  to="/profile/provider/hub-profile"
                  className="inline-flex rounded-full border border-border bg-background/90 px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                >
                  Hub profile
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-surface p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Hub navigation</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary">Move through publishing, demand, delivery, and settlement without losing context</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            The active page stays obvious, the rest of the routes stay reachable, and the provider hub now reads like its own product instead of another dashboard panel.
          </p>
        </div>

        <div className="mt-4">
          <ProviderInlineNav />
        </div>
      </section>

      <div className="space-y-5">
        <Outlet />
      </div>
    </div>
  );
};

export default ProviderWorkspaceLayout;
