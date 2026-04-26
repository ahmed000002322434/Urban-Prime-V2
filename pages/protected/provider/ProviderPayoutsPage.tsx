import React, { useEffect, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import { providerApplicationService } from '../../../services/providerWorkspaceService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import type { ProviderApplication, ProviderWorkspaceSummary } from '../../../types';
import { ProviderEmptyState, ProviderStatCard, ProviderSurface, formatMoney } from './providerWorkspaceUi';

const ProviderPayoutsPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProviderWorkspaceSummary | null>(null);
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [summaryRow, applicationRow] = await Promise.all([
          providerWorkspaceService.getWorkspaceSummary().catch(() => null),
          providerApplicationService.getMyApplication(user.id).catch(() => undefined)
        ]);
        if (cancelled) return;
        setSummary(summaryRow);
        setApplication(applicationRow || null);
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
      <ProviderEmptyState title="Payouts are not ready" body="Provider settlements appear after contract completion and escrow release." ctaLabel="Open earnings" ctaTo="/profile/provider/earnings" />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProviderStatCard label="Available to settle" value={formatMoney(summary.payouts.available)} />
        <ProviderStatCard label="Processing" value={formatMoney(summary.payouts.processing)} />
        <ProviderStatCard label="Total paid out" value={formatMoney(summary.payouts.totalPaidOut)} />
        <ProviderStatCard label="Pending payout requests" value={summary.payouts.pendingRequests} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <ProviderSurface className="overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Settlement desk</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Move completed work into clean cashflow</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
                This lane tracks approval readiness, escrow release, and payout movement so providers can see exactly why money is still pending.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Ready now</p>
                  <p className="mt-2 text-3xl font-black text-text-primary">{formatMoney(summary.payouts.available)}</p>
                  <p className="mt-2 text-xs leading-6 text-text-secondary">Funds closest to release or payout request.</p>
                </div>
                <div className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Held in escrow</p>
                  <p className="mt-2 text-3xl font-black text-text-primary">{formatMoney(summary.escrow.held)}</p>
                  <p className="mt-2 text-xs leading-6 text-text-secondary">Protected until completion or dispute handling.</p>
                </div>
                <div className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Approval gate</p>
                  <p className="mt-2 text-base font-bold text-text-primary">{application?.status === 'approved' ? 'Provider approved' : 'Approval still required'}</p>
                  <p className="mt-2 text-xs leading-6 text-text-secondary">Approval and payout readiness remove manual settlement delays.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { title: '1. Finish delivery', note: 'Completed contracts are the first unlock for releasing held funds.' },
                { title: '2. Release escrow', note: 'Available balance rises when work is completed and released cleanly.' },
                { title: '3. Request payout', note: 'Admin-reviewed payout requests then move into processing and paid-out states.' }
              ].map((entry) => (
                <div key={entry.title} className="rounded-[24px] border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-text-primary">{entry.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Release blockers</h2>
          <p className="mt-1 text-sm text-text-secondary">The shortest path to fewer payout delays.</p>
          <div className="mt-4 grid gap-3">
            {[
              {
                title: 'Provider approval',
                body: application?.status === 'approved'
                  ? 'Provider approval is complete, so the platform can settle provider earnings.'
                  : 'Provider approval is still a gating item for live settlement.'
              },
              {
                title: 'Payout setup readiness',
                body: application?.payoutReady
                  ? 'Payout setup is marked ready inside the provider profile.'
                  : 'Mark payout readiness in onboarding or settings to remove manual follow-up.'
              },
              {
                title: 'Escrow completion discipline',
                body: 'Close contracts quickly after delivery so held funds do not sit idle between completion and release.'
              }
            ].map((entry) => (
              <div key={entry.title} className="rounded-3xl border border-border bg-surface-soft p-4">
                <p className="text-sm font-semibold text-text-primary">{entry.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{entry.body}</p>
              </div>
            ))}
          </div>
        </ProviderSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Settlement readiness</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-text-primary">Application approval</p>
              <p className="mt-1 text-sm text-text-secondary">{application?.status === 'approved' ? 'Approved for provider payouts.' : 'Provider approval is still required before payouts can flow.'}</p>
            </div>
            <div className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-text-primary">Payout setup</p>
              <p className="mt-1 text-sm text-text-secondary">{application?.payoutReady ? 'Marked ready in provider settings.' : 'Update payout readiness in onboarding or settings.'}</p>
            </div>
            <div className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-text-primary">Escrow release</p>
              <p className="mt-1 text-sm text-text-secondary">Funds move into the available balance when contracts complete and escrow is released.</p>
            </div>
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Payout history</h2>
          <p className="mt-4 text-sm text-text-secondary">
            Admin-reviewed payout requests will appear here as the connected payout service is expanded. Current totals already reflect available, processing, and paid-out states from the work ledger.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-text-primary">Available balance</p>
              <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(summary.payouts.available)}</p>
            </div>
            <div className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-text-primary">Processing volume</p>
              <p className="mt-2 text-2xl font-black text-text-primary">{formatMoney(summary.payouts.processing)}</p>
            </div>
          </div>
        </ProviderSurface>
      </div>
    </div>
  );
};

export default ProviderPayoutsPage;
