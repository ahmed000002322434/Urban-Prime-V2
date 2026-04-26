import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { itemService, listerService } from '../../services/itemService';
import type { Booking, Item } from '../../types';

type TimelineStep = {
  id: string;
  label: string;
  detail: string;
};

const formatMoney = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
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
  String(value || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClasses = (value?: string | null) => {
  const status = String(value || '').toLowerCase();
  if (['completed', 'delivered'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['shipped', 'returned'].includes(status)) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (['cancelled'].includes(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const buildTimeline = (booking: Booking): TimelineStep[] => {
  if (booking.type === 'rent') {
    if (booking.deliveryMode === 'pickup') {
      return [
        { id: 'pending', label: 'Requested', detail: 'Rental request is waiting for confirmation.' },
        { id: 'confirmed', label: 'Confirmed', detail: 'Pickup details are locked in with the seller.' },
        { id: 'shipped', label: 'Ready for pickup', detail: 'Pickup code or handoff window is available.' },
        { id: 'delivered', label: 'Active rental', detail: 'The rental is now with the buyer.' },
        { id: 'returned', label: 'Returned', detail: 'The item is back with the seller and inspection is in progress.' },
        { id: 'completed', label: 'Settled', detail: 'The rental lifecycle and deposit handling are complete.' }
      ];
    }

    return [
      { id: 'pending', label: 'Requested', detail: 'Rental request is waiting for confirmation.' },
      { id: 'confirmed', label: 'Confirmed', detail: 'The seller approved the booking and is preparing handoff.' },
      { id: 'shipped', label: 'In transit', detail: 'The rental is on its way to the buyer.' },
      { id: 'delivered', label: 'Active rental', detail: 'The buyer has the rental item.' },
      { id: 'returned', label: 'Return in progress', detail: 'The item has been handed back and is being reconciled.' },
      { id: 'completed', label: 'Settled', detail: 'The rental lifecycle and deposit handling are complete.' }
    ];
  }

  return [
    { id: 'pending', label: 'Processing', detail: 'Order created and awaiting seller confirmation.' },
    { id: 'confirmed', label: 'Confirmed', detail: 'The seller accepted the order and is preparing fulfillment.' },
    { id: 'shipped', label: 'In transit', detail: 'The shipment is moving through the delivery network.' },
    { id: 'delivered', label: 'Delivered', detail: 'The shipment reached the buyer.' },
    { id: 'completed', label: 'Completed', detail: 'Receipt was confirmed and the order is closed.' }
  ];
};

const getTimelineIndex = (booking: Booking, steps: TimelineStep[]) => {
  const normalized = String(booking.status || 'pending').toLowerCase();
  const statusToStepId =
    booking.type === 'sale'
      ? normalized === 'completed'
        ? 'completed'
        : normalized === 'delivered'
          ? 'delivered'
          : normalized === 'shipped'
            ? 'shipped'
            : normalized === 'confirmed'
              ? 'confirmed'
              : 'pending'
      : normalized === 'completed'
        ? 'completed'
        : normalized === 'returned'
          ? 'returned'
          : normalized === 'delivered'
            ? 'delivered'
            : normalized === 'shipped'
              ? 'shipped'
              : normalized === 'confirmed'
                ? 'confirmed'
                : 'pending';

  return Math.max(
    steps.findIndex((step) => step.id === statusToStepId),
    0
  );
};

const TrackDeliveryPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!bookingId) {
        setError('Delivery reference is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const nextBooking = await listerService.getBookingById(bookingId);
        if (!active) return;
        if (!nextBooking) {
          setBooking(null);
          setItem(null);
          setError('Delivery details were not found.');
          return;
        }

        const nextItem = await itemService.getItemById(nextBooking.itemId);
        if (!active) return;
        setBooking(nextBooking);
        setItem(nextItem || null);
      } catch (loadError: any) {
        if (!active) return;
        setBooking(null);
        setItem(null);
        setError(String(loadError?.message || 'Unable to load delivery details.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const trackingReference = booking?.podJob?.trackingNumber || booking?.trackingNumber || '';
  const currency = booking?.currency || 'USD';
  const timeline = useMemo(() => (booking ? buildTimeline(booking) : []), [booking]);
  const activeTimelineIndex = useMemo(
    () => (booking ? getTimelineIndex(booking, timeline) : 0),
    [booking, timeline]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4 rounded-[28px] border border-border bg-surface p-6 shadow-soft">
        <BackButton />
        <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-6 py-10 text-center">
          <h1 className="text-xl font-black text-text-primary">Delivery details unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">{error || 'No live booking record was found for this reference.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <BackButton />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">
                Delivery tracking
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
                {formatStatusLabel(booking.status)}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Order {String(booking.orderId || booking.id).slice(0, 8)} | {booking.type === 'rent' ? 'Rental workflow' : 'Purchase fulfillment'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${getStatusClasses(booking.status)}`}>
              {formatStatusLabel(booking.status)}
            </span>
            <Link
              to={`/profile/orders/${booking.id}`}
              className="rounded-full border border-border bg-surface-soft px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-text-primary transition hover:border-primary/50 hover:text-primary"
            >
              Order details
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Current status</p>
            <p className="mt-2 text-lg font-black text-text-primary">{formatStatusLabel(booking.status)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Tracking</p>
            <p className="mt-2 break-all text-sm font-semibold text-text-primary">{trackingReference || 'Pending label'}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Fulfillment</p>
            <p className="mt-2 text-lg font-black text-text-primary">
              {booking.deliveryMode === 'pickup' ? 'Pickup' : booking.type === 'rent' ? 'Rental delivery' : 'Shipment'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Order total</p>
            <p className="mt-2 text-lg font-black text-text-primary">{formatMoney(booking.totalPrice, currency)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Progress</p>
              <h2 className="mt-2 text-xl font-black text-text-primary">Fulfillment timeline</h2>
            </div>
            <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
              Step {Math.min(activeTimelineIndex + 1, timeline.length)} of {timeline.length}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {timeline.map((step, index) => {
              const reached = activeTimelineIndex >= index && booking.status !== 'cancelled';
              const current = activeTimelineIndex === index && booking.status !== 'cancelled';
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-4 transition-colors ${
                    current
                      ? 'border-primary bg-primary/5'
                      : reached
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-border bg-surface-soft'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                        current
                          ? 'bg-primary text-white'
                          : reached
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-text-primary">{step.label}</p>
                      <p className="mt-1 text-sm text-text-secondary">{step.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Item summary</p>
            <div className="mt-5 flex gap-4">
              <img
                src={item?.imageUrls?.[0] || item?.images?.[0] || '/icons/urbanprime.svg'}
                alt={booking.itemTitle}
                className="h-24 w-24 rounded-2xl border border-border object-cover"
              />
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-lg font-black text-text-primary">{booking.itemTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {booking.type === 'rent' ? 'Rental booking' : 'Purchase order'}
                </p>
                <p className="mt-3 text-sm font-semibold text-text-primary">{formatMoney(booking.totalPrice, currency)}</p>
                <div className="mt-3 text-sm text-text-secondary">
                  <p>Start: {formatDateTime(booking.startDate)}</p>
                  <p>End: {formatDateTime(booking.endDate)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Handoff details</p>

            {booking.deliveryMode === 'pickup' ? (
              <div className="mt-4 space-y-3 text-sm text-text-secondary">
                <div className="rounded-2xl border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Pickup window</p>
                  <p className="mt-2 font-semibold text-text-primary">
                    {booking.pickupWindowStart || booking.pickupWindowEnd
                      ? `${formatDateTime(booking.pickupWindowStart)} to ${formatDateTime(booking.pickupWindowEnd)}`
                      : 'Awaiting seller schedule'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Pickup instructions</p>
                  <p className="mt-2 font-semibold text-text-primary">{booking.pickupInstructions || 'Instructions will appear here once the seller confirms.'}</p>
                </div>
                {booking.pickupCode ? (
                  <div className="rounded-2xl border border-border bg-surface-soft p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Pickup code</p>
                    <p className="mt-2 text-lg font-black text-text-primary">{booking.pickupCode}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-text-secondary">
                <div className="rounded-2xl border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Tracking number</p>
                  <p className="mt-2 break-all text-base font-semibold text-text-primary">{trackingReference || 'Tracking reference will appear once the seller ships this order.'}</p>
                </div>
                {booking.shippingAddress ? (
                  <div className="rounded-2xl border border-border bg-surface-soft p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Destination</p>
                    <div className="mt-2 space-y-1 font-semibold text-text-primary">
                      <p>{booking.shippingAddress.name || 'Delivery destination'}</p>
                      <p>{booking.shippingAddress.line1 || booking.shippingAddress.addressLine1}</p>
                      {booking.shippingAddress.line2 ? <p>{booking.shippingAddress.line2}</p> : null}
                      <p>
                        {[booking.shippingAddress.city, booking.shippingAddress.state, booking.shippingAddress.zip]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <p>{booking.shippingAddress.country}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TrackDeliveryPage;
