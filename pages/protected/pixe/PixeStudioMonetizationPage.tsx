import React, { useEffect, useState } from 'react';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import { pixeService, type PixeRevenueAnalyticsResponse } from '../../../services/pixeService';

const PixeStudioMonetizationPage: React.FC = () => {
  const [state, setState] = useState<PixeRevenueAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: '',
    destination_label: '',
    note: ''
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getRevenueAnalytics();
        if (!cancelled) setState(payload);
      } catch (error) {
        console.error('Unable to load Pixe monetization:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PixeChartPageSkeleton />;
  }

  if (!state) {
    return (
      <PixeEmptyState
        title="Monetization data is unavailable"
        message="Revenue reporting could not be loaded. Memberships, commerce, and payout ledger entries will appear once this channel starts earning."
        animation="noFileFound"
        primaryAction={{ label: 'Back to dashboard', to: '/pixe-studio/dashboard' }}
        secondaryAction={{ label: 'Open channel', to: '/pixe-studio/channel' }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Monetization</p>
        <h2 className="mt-2 text-3xl font-semibold">Revenue</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Membership Revenue', `$${state.summary.membership_revenue.toFixed(2)}`],
          ['Product Revenue', `$${state.summary.product_revenue_amount.toFixed(2)}`],
          ['Active Members', String(state.summary.active_memberships)],
          ['Available Balance', `$${state.summary.available_balance.toFixed(2)}`],
          ['Pending Payouts', `$${state.summary.pending_payouts.toFixed(2)}`]
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-lg font-semibold">Memberships</h3>
          <div className="space-y-3">
            {state.memberships.map((membership) => (
              <div key={String(membership.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{String(membership.tier_name || 'Supporter')}</p>
                  <p className="text-xs text-white/45">{String(membership.status || 'active')}</p>
                </div>
                <span>${Number(membership.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {state.memberships.length === 0 ? (
              <PixeEmptyState
                title="No memberships yet"
                message="Supporter tiers will show up here once recurring memberships are enabled and viewers subscribe."
                animation="nothing"
                primaryAction={{ label: 'Open channel settings', to: '/pixe-studio/channel' }}
                contained={false}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Payout Requests</h3>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/65">
              {state.payout_requests.length} requests
            </span>
          </div>
          <form
            className="mb-4 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                setRequesting(true);
                const result = await pixeService.requestPayout({
                  amount: Number(requestForm.amount || 0),
                  destination_label: requestForm.destination_label,
                  note: requestForm.note
                });
                setRequestForm({ amount: '', destination_label: '', note: '' });
                setState((current) => (
                  current
                    ? {
                      ...current,
                      summary: {
                        ...current.summary,
                        available_balance: result.available_balance,
                        pending_payouts: Number((current.summary.pending_payouts + Number(result.request?.amount || 0)).toFixed(2))
                      },
                      payout_requests: result.request ? [result.request, ...current.payout_requests] : current.payout_requests
                    }
                    : current
                ));
              } finally {
                setRequesting(false);
              }
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={requestForm.amount}
                onChange={(event) => setRequestForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="Amount"
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none"
              />
              <input
                value={requestForm.destination_label}
                onChange={(event) => setRequestForm((current) => ({ ...current, destination_label: event.target.value }))}
                placeholder="Destination"
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none"
              />
            </div>
            <textarea
              value={requestForm.note}
              onChange={(event) => setRequestForm((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              placeholder="Admin note"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none"
            />
            <button type="submit" disabled={requesting || !requestForm.amount || !requestForm.destination_label} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {requesting ? 'Submitting…' : 'Request payout'}
            </button>
          </form>
          <div className="space-y-3">
            {state.payout_requests.map((entry) => (
              <div key={String(entry.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{String(entry.destination_label || 'Payout request')}</p>
                  <p className="text-xs text-white/45">{String(entry.status || 'pending')}</p>
                </div>
                <span>${Number(entry.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {state.payout_requests.length === 0 ? (
              <PixeEmptyState
                title="No payout requests yet"
                message="Request payouts from the available balance once this channel starts earning."
                animation="noResults"
                primaryAction={{ label: 'Back to analytics', to: '/pixe-studio/analytics' }}
                contained={false}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-lg font-semibold">Payout Ledger</h3>
        <div className="space-y-3">
          {state.payout_ledger.map((entry) => (
            <div key={String(entry.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">{String(entry.entry_type || 'credit')}</p>
                <p className="text-xs text-white/45">{String(entry.status || 'pending')}</p>
              </div>
              <span>${Number(entry.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          {state.payout_ledger.length === 0 ? (
            <PixeEmptyState
              title="No payout ledger entries yet"
              message="Credit and payout rows appear here as memberships, commerce, and paid requests are processed."
              animation="noResults"
              primaryAction={{ label: 'Back to analytics', to: '/pixe-studio/analytics' }}
              contained={false}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PixeStudioMonetizationPage;
