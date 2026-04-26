import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { commerceService } from '../../services/commerceService';
import type { PublicOrderTrackingResult } from '../../types';

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${String(currency || 'USD').toUpperCase()}`;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatStatusLabel = (value?: string | null) =>
  String(value || 'processing')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClasses = (value?: string | null) => {
  const status = String(value || '').toLowerCase();
  if (['delivered', 'completed'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['out_for_delivery', 'in_transit', 'shipped'].includes(status)) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (['cancelled', 'returned', 'failed'].includes(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const TrackOrderPage: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<PublicOrderTrackingResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeShipment = useMemo(
    () => result?.shipments?.[0] || null,
    [result]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const tracking = await commerceService.getPublicOrderTracking(orderId.trim(), email.trim());
      setResult(tracking);
    } catch (submitError: any) {
      setResult(null);
      setError(String(submitError?.message || 'Tracking details were not found for that order and email.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,243,255,0.8),rgba(244,247,250,0.9)_36%,rgba(255,255,255,1)_70%)] dark:bg-[radial-gradient(circle_at_top,_rgba(34,69,104,0.32),rgba(13,18,28,0.96)_36%,rgba(5,9,15,1)_72%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <header className="grid gap-6 rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:grid-cols-[1.15fr,0.85fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-700/80 dark:text-sky-200/80">
              Order Tracking
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Follow every shipment with real order data.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Enter the order ID from your confirmation email and the billing email used at checkout. The tracker shows the live order record, shipment status, and delivery details from the commerce backend.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Real shipment status
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Pickup and delivery windows
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Multi-item orders supported
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-white/10 dark:bg-[#0d1522]/92">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="orderId" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  Order ID
                </label>
                <input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  required
                  placeholder="Paste your order ID"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  Billing Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="name@example.com"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#2563eb)] px-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? <Spinner size="sm" className="text-white" /> : 'Track order'}
              </button>
            </form>

            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Need the full order workspace, receipts, or dispute tools?{' '}
              <Link to="/auth" className="font-bold text-sky-700 hover:underline dark:text-sky-300">
                Sign in to My Orders
              </Link>
              .
            </p>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}
          </div>
        </header>

        {result ? (
          <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Order {result.orderId.slice(0, 8)}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      {formatStatusLabel(activeShipment?.status || result.status)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Placed {formatDateTime(result.placedAt)}. Last updated {formatDateTime(result.updatedAt)}.
                    </p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${getStatusClasses(activeShipment?.status || result.status)}`}>
                    {formatStatusLabel(activeShipment?.status || result.status)}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total</p>
                    <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                      {formatMoney(result.total, result.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payment</p>
                    <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                      {formatStatusLabel(result.paymentStatus)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Items</p>
                    <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{result.items.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Shipment updates
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">Delivery timeline</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {result.shipments.length} event{result.shipments.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {result.shipments.length ? (
                    result.shipments.map((shipment) => (
                      <div key={shipment.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950 dark:text-white">{formatStatusLabel(shipment.status)}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Updated {formatDateTime(shipment.updatedAt)}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusClasses(shipment.status)}`}>
                            {formatStatusLabel(shipment.status)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Carrier</p>
                            <p className="mt-1 font-semibold">{shipment.carrier || 'Assigned soon'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Tracking</p>
                            <p className="mt-1 break-all font-semibold">{shipment.trackingNumber || 'Pending label'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Estimated delivery</p>
                            <p className="mt-1 font-semibold">{formatDateTime(shipment.estimatedDelivery)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      This order exists in the system, but a shipment record has not been created yet. Check back after the seller confirms fulfillment.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Order items</p>
                <div className="mt-5 space-y-4">
                  {result.items.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex gap-4">
                        <img
                          src={item.itemImageUrl}
                          alt={item.itemTitle}
                          className="h-20 w-20 rounded-2xl border border-slate-200 object-cover dark:border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="line-clamp-2 text-base font-black text-slate-950 dark:text-white">
                                {item.itemTitle}
                              </h3>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                {formatStatusLabel(item.listingMode)} | Qty {item.quantity}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusClasses(item.status)}`}>
                              {formatStatusLabel(item.legacyStatus)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {formatMoney(item.totalPrice, result.currency)}
                          </p>
                          {item.trackingNumber ? (
                            <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">
                              Tracking: <span className="font-semibold text-slate-900 dark:text-white">{item.trackingNumber}</span>
                            </p>
                          ) : null}
                          {item.deliveryMode === 'pickup' ? (
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                              <p className="font-semibold text-slate-900 dark:text-white">Pickup handoff</p>
                              {item.pickupInstructions ? <p className="mt-1">{item.pickupInstructions}</p> : null}
                              {item.pickupWindowStart || item.pickupWindowEnd ? (
                                <p className="mt-1">
                                  Window: {formatDateTime(item.pickupWindowStart)} to {formatDateTime(item.pickupWindowEnd)}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Delivery address</p>
                {result.shippingAddress ? (
                  <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p className="font-black text-slate-950 dark:text-white">{result.shippingAddress.name || 'Delivery destination'}</p>
                    <p>{result.shippingAddress.line1 || result.shippingAddress.addressLine1}</p>
                    {result.shippingAddress.line2 ? <p>{result.shippingAddress.line2}</p> : null}
                    <p>
                      {[result.shippingAddress.city, result.shippingAddress.state, result.shippingAddress.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p>{result.shippingAddress.country}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                    No shipping address is attached to this order. This usually means the order is digital or pickup-only.
                  </p>
                )}

                {result.note ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Order note</p>
                    <p className="mt-2">{result.note}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default TrackOrderPage;
