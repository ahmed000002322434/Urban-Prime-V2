import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import contractService from '../../../services/contractService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import workService from '../../../services/workService';
import type { Contract, ProviderWorkspaceSummary, WorkListing, WorkRequest } from '../../../types';
import {
  ProviderEmptyState,
  ProviderStatCard,
  ProviderSurface,
  formatDateTime,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const InlineEmpty: React.FC<{
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
}> = ({ title, body, ctaLabel, ctaTo }) => (
  <div className="rounded-[24px] border border-dashed border-border bg-surface-soft p-5">
    <p className="text-base font-semibold text-text-primary">{title}</p>
    <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
    {ctaLabel && ctaTo ? (
      <Link
        to={ctaTo}
        className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:brightness-110"
      >
        {ctaLabel}
      </Link>
    ) : null}
  </div>
);

const ProviderWorkspaceOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProviderWorkspaceSummary | null>(null);
  const [leads, setLeads] = useState<WorkRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [listings, setListings] = useState<WorkListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [summaryRow, leadRows, contractRows, listingRows] = await Promise.all([
          providerWorkspaceService.getWorkspaceSummary().catch(() => null),
          workService.getRequests({ targetProviderId: user.id, status: 'open', limit: 8 }).catch(() => []),
          contractService.getContracts({ providerId: user.id, limit: 8 }).catch(() => []),
          providerWorkspaceService.getProviderListings(user.id).catch(() => [])
        ]);

        if (cancelled) return;
        setSummary(summaryRow);
        setLeads(leadRows);
        setContracts(contractRows);
        setListings(listingRows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <ProviderEmptyState
        title="Provider data is not ready"
        body="Complete onboarding or publish your first service to unlock the provider workspace."
        ctaLabel="Complete onboarding"
        ctaTo="/profile/provider/onboarding"
      />
    );
  }

  const activeContracts = contracts.filter((entry) => ['pending', 'active', 'disputed'].includes(entry.status));
  const completedContracts = contracts.filter((entry) => entry.status === 'completed');
  const recentContracts = contracts.slice(0, 4);
  const latestListings = listings.slice(0, 4);
  const latestLeads = leads.slice(0, 4);
  const liveListings = listings.filter((entry) => entry.status === 'published').length;
  const pendingReviewListings = listings.filter((entry) => entry.status === 'pending_review').length;
  const draftListings = listings.filter((entry) => entry.status === 'draft').length;
  const rejectedListings = listings.filter((entry) => entry.status === 'rejected').length;
  const leadPipelineValue = leads.reduce((sum, entry) => sum + Number(entry.budgetMax || entry.budgetMin || 0), 0);
  const responseRate = Math.round(summary.stats.responseRate || 0);
  const readinessScore = Math.min(
    100,
    Math.round(
      38 +
        Math.min(18, responseRate / 6) +
        Math.min(18, liveListings * 4) +
        Math.min(14, activeContracts.length * 5) +
        Math.min(12, completedContracts.length * 2)
    )
  );
  const averageRatingLabel = summary.stats.averageRating ? `${summary.stats.averageRating.toFixed(1)} / 5` : 'No ratings yet';
  const nextBookingLabel = summary.calendar.nextBookingAt ? formatDateTime(summary.calendar.nextBookingAt) : 'No booking locked yet';

  const nextAction =
    summary.queues.leads > 0
      ? {
          title: 'Respond to new demand',
          body: `${summary.queues.leads} open leads are still waiting for a decision. Move the best buyers into conversation before momentum fades.`,
          cta: 'Open leads',
          to: '/profile/provider/leads'
        }
      : pendingReviewListings > 0
        ? {
            title: 'Push storefront items through review',
            body: `${pendingReviewListings} services are paused in moderation, so they are not helping discovery or conversion yet.`,
            cta: 'Review services',
            to: '/profile/provider/services'
          }
        : liveListings === 0
          ? {
              title: 'Publish the first live service',
              body: 'Your provider workspace exists, but the public storefront still needs one approved service to start working for you.',
              cta: 'Create service',
              to: '/profile/provider/services/new'
            }
          : {
              title: 'Keep delivery and settlement clean',
              body: 'The catalog is live. Keep the calendar realistic, active jobs healthy, and payout readiness visible.',
              cta: 'Open calendar',
              to: '/profile/provider/calendar'
            };

  const commandRows = [
    {
      label: 'Demand',
      value: `${summary.queues.leads} open leads`,
      note: summary.queues.proposals > 0 ? `${summary.queues.proposals} proposals still in motion` : 'Proposal queue is currently clear'
    },
    {
      label: 'Storefront',
      value: `${liveListings} live services`,
      note: pendingReviewListings > 0 ? `${pendingReviewListings} still waiting for review` : 'Publishing lane is under control'
    },
    {
      label: 'Settlement',
      value: formatMoney(summary.payouts.available),
      note: summary.payouts.pendingRequests > 0 ? `${summary.payouts.pendingRequests} payout requests pending` : 'No payout backlog right now'
    }
  ];

  return (
    <div className="space-y-6">
      <ProviderSurface className="overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Today&apos;s command center</p>
            <h2 className="mt-2 text-[2rem] font-black tracking-[-0.03em] text-text-primary">
              A cleaner provider overview with one obvious next move
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              This page now keeps demand, storefront coverage, active delivery, and payout readiness in one sequence so you do not have to decode the workspace.
            </p>

            <div className="mt-5 rounded-[28px] border border-border bg-[linear-gradient(135deg,rgba(139,123,232,0.08),rgba(103,181,255,0.06))] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Next best move</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-text-primary">{nextAction.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{nextAction.body}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={nextAction.to}
                  className="inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110"
                >
                  {nextAction.cta}
                </Link>
                <Link
                  to="/profile/messages"
                  className="inline-flex rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                >
                  Shared messages
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {commandRows.map((entry) => (
                <div key={entry.label} className="rounded-[24px] border border-border bg-background/90 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{entry.label}</p>
                  <p className="mt-2 text-lg font-black tracking-tight text-text-primary">{entry.value}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-border bg-background/92 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Workspace health</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Readiness</p>
                  <p className="mt-2 text-3xl font-black text-text-primary">{readinessScore}%</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Response pace</p>
                  <p className="mt-2 text-3xl font-black text-text-primary">{responseRate}%</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Average rating</p>
                  <p className="mt-2 text-lg font-black text-text-primary">{averageRatingLabel}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Next booking</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-text-primary">{nextBookingLabel}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-background/92 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Commercial snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Lead value</p>
                  <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(leadPipelineValue)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Gross earnings</p>
                  <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(summary.stats.earnings)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Escrow held</p>
                  <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(summary.escrow.held)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Released</p>
                  <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(summary.escrow.released)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProviderSurface>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProviderStatCard label="Open leads" value={summary.queues.leads} hint={`${summary.queues.proposals} proposal threads in flight`} />
        <ProviderStatCard label="Active work" value={activeContracts.length} hint={`${summary.calendar.upcomingBookings} upcoming bookings`} />
        <ProviderStatCard label="Live services" value={liveListings} hint={`${pendingReviewListings} waiting for review`} />
        <ProviderStatCard label="Ready to settle" value={formatMoney(summary.payouts.available)} hint={`${summary.payouts.pendingRequests} payout requests pending`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
        <div className="space-y-6">
          <ProviderSurface>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Demand lane</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">New requests that need a decision</h2>
              </div>
              <Link to="/profile/provider/leads" className="text-sm font-semibold text-primary">
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {latestLeads.length === 0 ? (
                <InlineEmpty title="No open leads" body="New instant bookings and quote requests will appear here when buyers reach out." />
              ) : (
                latestLeads.map((lead) => (
                  <div key={lead.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-text-primary">{lead.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{lead.brief}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            {lead.category || 'General'}
                          </span>
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            {lead.fulfillmentKind || 'Flexible format'}
                          </span>
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            {lead.scheduledAt ? formatDateTime(lead.scheduledAt) : 'Flexible timing'}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(lead.requestType || lead.status)}`}>
                          {formatStatus(lead.requestType || lead.status || 'lead')}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          {formatMoney(lead.budgetMax || lead.budgetMin || 0, lead.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Storefront lane</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">What buyers can see right now</h2>
              </div>
              <Link to="/profile/provider/services" className="text-sm font-semibold text-primary">
                Manage services
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Live', value: liveListings },
                { label: 'Pending review', value: pendingReviewListings },
                { label: 'Drafts', value: draftListings },
                { label: 'Rejected', value: rejectedListings }
              ].map((entry) => (
                <div key={entry.label} className="rounded-[22px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{entry.label}</p>
                  <p className="mt-2 text-2xl font-black text-text-primary">{entry.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {latestListings.length === 0 ? (
                <InlineEmpty
                  title="No services yet"
                  body="Create the first service to give the provider storefront something live to sell."
                  ctaLabel="Create service"
                  ctaTo="/profile/provider/services/new"
                />
              ) : (
                latestListings.map((listing) => (
                  <div key={listing.id} className="rounded-[24px] border border-border bg-background/90 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-text-primary">{listing.title}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {listing.category || 'General'} | {formatMoney(listing.basePrice || listing.packages?.[0]?.price || 0, listing.currency)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(listing.status)}`}>
                        {formatStatus(listing.status)}
                      </span>
                    </div>
                    {listing.reviewNotes ? <p className="mt-2 text-xs leading-6 text-text-secondary">{listing.reviewNotes}</p> : null}
                  </div>
                ))
              )}
            </div>
          </ProviderSurface>
        </div>

        <div className="space-y-6">
          <ProviderSurface>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Delivery lane</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Active work and settlement</h2>
              </div>
              <Link to="/profile/provider/jobs" className="text-sm font-semibold text-primary">
                Open jobs
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Active contracts</p>
                <p className="mt-2 text-3xl font-black text-text-primary">{activeContracts.length}</p>
              </div>
              <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Completed jobs</p>
                <p className="mt-2 text-3xl font-black text-text-primary">{completedContracts.length}</p>
              </div>
              <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Upcoming bookings</p>
                <p className="mt-2 text-3xl font-black text-text-primary">{summary.calendar.upcomingBookings}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {recentContracts.length === 0 ? (
                <InlineEmpty title="No active contracts yet" body="Accepted proposals and instant bookings will create active work here." />
              ) : (
                recentContracts.map((contract) => (
                  <div key={contract.id} className="rounded-[24px] border border-border bg-background/90 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-text-primary">{contract.scope}</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {contract.dueAt ? `Due ${formatDateTime(contract.dueAt)}` : contract.startAt ? `Starts ${formatDateTime(contract.startAt)}` : 'Schedule to be confirmed'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(contract.status)}`}>
                          {formatStatus(contract.status)}
                        </span>
                        <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          {formatMoney(contract.totalAmount, contract.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link to="/profile/provider/calendar" className="rounded-[22px] border border-border bg-surface-soft p-4 transition hover:border-primary/25">
                <p className="text-sm font-semibold text-text-primary">Calendar and availability</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Keep booking pressure and blackout dates visible.</p>
              </Link>
              <Link to="/profile/provider/payouts" className="rounded-[22px] border border-border bg-surface-soft p-4 transition hover:border-primary/25">
                <p className="text-sm font-semibold text-text-primary">Payout desk</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Move released escrow into payout requests without losing track.</p>
              </Link>
            </div>
          </ProviderSurface>
        </div>
      </section>
    </div>
  );
};

export default ProviderWorkspaceOverviewPage;
