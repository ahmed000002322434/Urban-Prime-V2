import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import commerceService from '../../services/commerceService';
import { CommerceListPanelSkeleton } from '../../components/commerce/CommerceSkeleton';
import { useNotification } from '../../context/NotificationContext';
import type { CommerceDispute } from '../../types';

const reasonOptions = [
  { value: 'damage', label: 'Damage' },
  { value: 'late_return', label: 'Late return' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'payment', label: 'Payment' },
  { value: 'condition', label: 'Condition mismatch' },
  { value: 'other', label: 'Other' }
];

const statusTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'resolved') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200';
  if (normalized === 'reviewing') return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200';
  if (normalized === 'closed') return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200';
};

const DisputeCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const [disputes, setDisputes] = useState<CommerceDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    orderId: searchParams.get('orderId') || '',
    orderItemId: searchParams.get('orderItemId') || '',
    rentalBookingId: searchParams.get('bookingId') || '',
    reasonCode: searchParams.get('reasonCode') || 'other',
    details: ''
  });

  const referencedItemTitle = searchParams.get('itemTitle') || '';

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await commerceService.getDisputes();
      setDisputes(rows);
    } catch (error) {
      console.error('Failed to load disputes:', error);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  const canSubmit = useMemo(
    () =>
      Boolean((form.orderId || form.rentalBookingId).trim()) &&
      Boolean(form.reasonCode.trim()) &&
      Boolean(form.details.trim()),
    [form]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      showNotification('Order or booking reference, reason, and details are required.');
      return;
    }

    setSubmitting(true);
    try {
      await commerceService.createDispute({
        orderId: form.orderId || undefined,
        orderItemId: form.orderItemId || undefined,
        rentalBookingId: form.rentalBookingId || undefined,
        reasonCode: form.reasonCode,
        details: form.details
      });
      showNotification('Dispute opened successfully.');
      setForm((current) => ({
        ...current,
        details: ''
      }));
      setSearchParams({});
      await loadDisputes();
    } catch (error) {
      console.error(error);
      showNotification('Unable to open dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-[32px] border border-slate-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(241,245,249,0.88))] p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(148,163,184,0.04))]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Commerce operations</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">Disputes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Open, monitor, and resolve order or rental disputes from the canonical commerce layer without leaving the dashboard.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] border border-slate-300/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Open a case</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">Submit dispute details</h2>
            </div>
            {(form.orderId || form.rentalBookingId) && referencedItemTitle ? (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {referencedItemTitle}
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Order ID</span>
                <input
                  value={form.orderId}
                  onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
                  placeholder="Canonical order id"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Rental booking ID</span>
                <input
                  value={form.rentalBookingId}
                  onChange={(event) => setForm((current) => ({ ...current, rentalBookingId: event.target.value }))}
                  placeholder="Canonical rental booking id"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Order item ID</span>
              <input
                value={form.orderItemId}
                onChange={(event) => setForm((current) => ({ ...current, orderItemId: event.target.value }))}
                placeholder="Optional order item reference"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Reason</span>
              <select
                value={form.reasonCode}
                onChange={(event) => setForm((current) => ({ ...current, reasonCode: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Details</span>
              <textarea
                rows={7}
                value={form.details}
                onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
                placeholder="Explain what happened, the desired resolution, and any supporting evidence."
                className="w-full rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 outline-none focus:border-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="rounded-full bg-slate-950 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {submitting ? 'Submitting...' : 'Open dispute'}
              </button>
              {(form.orderId || form.rentalBookingId) ? (
                <button
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      orderId: '',
                      orderItemId: '',
                      rentalBookingId: ''
                    }));
                    setSearchParams({});
                  }}
                  className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:border-white/10 dark:text-slate-200"
                >
                  Clear references
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-[32px] border border-slate-300/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Case queue</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">Existing disputes</h2>
            </div>
            <button
              onClick={() => void loadDisputes()}
              className="rounded-full border border-slate-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:border-white/10 dark:text-slate-200"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <CommerceListPanelSkeleton rows={3} />
            ) : disputes.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center dark:border-white/10 dark:bg-slate-950/30">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">No cases</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">No disputes have been opened yet.</h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Open a case from an order detail page when a transaction needs ops review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute) => (
                  <article
                    key={dispute.id}
                    className="rounded-[28px] border border-slate-300/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-slate-950/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Case #{dispute.id.slice(0, 8)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusTone(dispute.status)}`}>
                            {dispute.status}
                          </span>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {dispute.reasonCode}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        <p>Opened by {dispute.openedBy.name}</p>
                        <p className="mt-1">{new Date(dispute.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">{dispute.details}</p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {dispute.orderId ? <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">Order {dispute.orderId.slice(0, 8)}</span> : null}
                      {dispute.orderItemId ? <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">Line {dispute.orderItemId.slice(0, 8)}</span> : null}
                      {dispute.rentalBookingId ? <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">Rental {dispute.rentalBookingId.slice(0, 8)}</span> : null}
                    </div>

                    {dispute.resolution || dispute.adminNotes ? (
                      <div className="mt-4 rounded-[24px] bg-white/80 p-4 dark:bg-white/[0.04]">
                        {dispute.resolution ? (
                          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                            <span className="font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Resolution</span>
                            <br />
                            {dispute.resolution}
                          </p>
                        ) : null}
                        {dispute.adminNotes ? (
                          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                            <span className="font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Admin notes</span>
                            <br />
                            {dispute.adminNotes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            Open new cases from <Link to="/profile/orders" className="font-bold text-slate-900 underline dark:text-white">order details</Link> for automatic reference prefill.
          </div>
        </section>
      </div>
    </div>
  );
};

export default DisputeCenterPage;
