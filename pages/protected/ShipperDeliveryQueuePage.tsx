import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import shipperService from '../../services/shipperService';
import type { ShipperDeliveryQueueEntry } from '../../types';

type QueueFilter = 'all' | 'active' | 'delayed' | 'pending' | 'delivered';

const ACTIVE_STATUSES = ['in_transit', 'out_for_delivery', 'picked_up'];
const PENDING_STATUSES = ['pending_pickup', 'label_created', 'processing'];

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatStatusLabel = (value: string) =>
  String(value || 'processing')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatLoadError = (value: unknown, fallback: string) => {
  const message = String((value as any)?.message || value || fallback).trim();
  if (/unauthorized|authentication required/i.test(message)) {
    return 'Sign in with a shipper-enabled account to load the live delivery queue.';
  }
  if (/firestore fallback/i.test(message)) {
    return 'Disable fallback mode to review the live shipper queue.';
  }
  if (/backend/i.test(message)) {
    return 'Live delivery data is unavailable until the commerce backend is reachable.';
  }
  return message || fallback;
};

const getStatusClasses = (value: string, delayed = false) => {
  if (delayed) return 'bg-rose-50 text-rose-700 border-rose-200';
  const status = String(value || '').toLowerCase();
  if (status === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (ACTIVE_STATUSES.includes(status)) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (PENDING_STATUSES.includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const normalizeFilter = (value: string | null): QueueFilter => {
  if (value === 'active' || value === 'delayed' || value === 'pending' || value === 'delivered') {
    return value;
  }
  return 'all';
};

const ShipperDeliveryQueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<ShipperDeliveryQueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [filter, setFilter] = useState<QueueFilter>(() => normalizeFilter(searchParams.get('filter')));
  const { showNotification } = useNotification();
  const mountedRef = useRef(true);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filter !== 'all') nextParams.set('filter', filter);
    if (search.trim()) nextParams.set('search', search.trim());
    setSearchParams(nextParams, { replace: true });
  }, [filter, search, setSearchParams]);

  const loadQueue = useCallback(
    async ({ background = false, notify = false }: { background?: boolean; notify?: boolean } = {}) => {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const next = await shipperService.getDeliveryQueue();
        if (!mountedRef.current) return;
        setEntries(next);
        setLastLoadedAt(new Date().toISOString());
        setError('');
        if (notify) showNotification('Delivery queue refreshed.');
      } catch (loadError) {
        if (!mountedRef.current) return;
        setError(formatLoadError(loadError, 'Unable to load the delivery queue.'));
      } finally {
        if (!mountedRef.current) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadQueue();

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadQueue({ background: true });
    }, 15000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [loadQueue]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === 'active' && !ACTIVE_STATUSES.includes(entry.status)) return false;
      if (filter === 'delayed' && !entry.delayed) return false;
      if (filter === 'pending' && !PENDING_STATUSES.includes(entry.status)) return false;
      if (filter === 'delivered' && entry.status !== 'delivered') return false;
      if (!query) return true;
      return [
        entry.orderId,
        entry.buyerName,
        entry.buyerEmail,
        entry.status,
        entry.carrier,
        entry.trackingNumber
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [entries, filter, search]);

  const summary = useMemo(
    () => ({
      total: entries.length,
      active: entries.filter((entry) => ACTIVE_STATUSES.includes(entry.status)).length,
      delayed: entries.filter((entry) => entry.delayed).length,
      pending: entries.filter((entry) => PENDING_STATUSES.includes(entry.status)).length,
      delivered: entries.filter((entry) => entry.status === 'delivered').length
    }),
    [entries]
  );

  const copyTracking = async (trackingNumber?: string) => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      showNotification('Tracking number copied.');
    } catch {
      showNotification('Unable to copy tracking number.');
    }
  };

  const clearFilters = () => {
    setFilter('all');
    setSearch('');
  };

  const shouldMaskSummary = isLoading || (error && entries.length === 0);
  const hasFilters = filter !== 'all' || search.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Shipper workflow</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Delivery queue</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Live shipment rows from the commerce backend, grouped for dispatch and exception follow-up.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Live backend
              </span>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                Auto-refresh 15s
              </span>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                Last sync {formatDateTime(lastLoadedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadQueue({ background: !isLoading, notify: true })}
              disabled={isLoading || isRefreshing}
              className="clay-button clay-button-secondary clay-size-sm is-interactive disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link to="/profile/shipper-dashboard" className="clay-button clay-button-secondary clay-size-sm is-interactive">
              Shipper hub
            </Link>
            <Link to="/profile/analytics/shipper/overview" className="clay-button clay-button-secondary clay-size-sm is-interactive">
              SLA analytics
            </Link>
            <Link to="/profile/messages" className="clay-button clay-button-secondary clay-size-sm is-interactive">
              Messages
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-100/90 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Shipments</p>
            <p className="mt-2 text-3xl font-black text-text-primary">{shouldMaskSummary ? '--' : summary.total}</p>
          </div>
          <div className="rounded-[24px] border border-sky-200 bg-sky-50/90 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700/80">Active</p>
            <p className="mt-2 text-3xl font-black text-sky-700">{shouldMaskSummary ? '--' : summary.active}</p>
          </div>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700/80">Pending pickup</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{shouldMaskSummary ? '--' : summary.pending}</p>
          </div>
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700/80">Delayed</p>
            <p className="mt-2 text-3xl font-black text-rose-700">{shouldMaskSummary ? '--' : summary.delayed}</p>
          </div>
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700/80">Delivered</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{shouldMaskSummary ? '--' : summary.delivered}</p>
          </div>
        </div>
      </div>

      <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:max-w-md">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, buyer, carrier, or tracking"
              className="h-12 w-full rounded-2xl border border-border bg-surface-soft px-4 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
              <span>{filteredEntries.length} visible</span>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-border bg-white px-3 py-1 text-text-primary transition hover:border-primary/35 hover:text-primary dark:bg-surface"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'delayed', label: 'Delayed' },
              { id: 'pending', label: 'Pending' },
              { id: 'delivered', label: 'Delivered' }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id as QueueFilter)}
                className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                  filter === option.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface-soft text-text-secondary hover:border-primary/40 hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-text-secondary">Loading delivery queue...</p>
          ) : error && !entries.length ? (
            <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-6 py-10 text-center">
              <p className="text-lg font-black text-text-primary">Live queue unavailable</p>
              <p className="mt-2 text-sm text-text-secondary">{error}</p>
            </div>
          ) : filteredEntries.length ? (
            filteredEntries.map((entry) => (
              <article
                key={entry.shipmentId}
                className={`rounded-[24px] border p-4 transition-colors ${
                  entry.delayed ? 'border-rose-200 bg-rose-50/70' : 'border-border bg-surface-soft'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                      Order {entry.orderId.slice(0, 8)}
                    </p>
                    <h2 className="mt-2 text-lg font-black text-text-primary">{entry.buyerName}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{entry.buyerEmail || 'Buyer email unavailable'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusClasses(entry.status, entry.delayed)}`}>
                      {entry.delayed ? 'Delayed' : formatStatusLabel(entry.status)}
                    </span>
                    <Link
                      to={`/profile/track-delivery/${entry.detailId}`}
                      className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-surface"
                    >
                      View delivery
                    </Link>
                    {entry.trackingNumber ? (
                      <button
                        type="button"
                        onClick={() => void copyTracking(entry.trackingNumber)}
                        className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-surface"
                      >
                        Copy tracking
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Carrier</p>
                    <p className="mt-2 font-semibold text-text-primary">{entry.carrier || 'Assign carrier'}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Tracking</p>
                    <p className="mt-2 break-all font-semibold text-text-primary">{entry.trackingNumber || 'Pending label'}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">ETA</p>
                    <p className="mt-2 font-semibold text-text-primary">{formatDateTime(entry.eta)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Last update</p>
                    <p className="mt-2 font-semibold text-text-primary">{formatDateTime(entry.updatedAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Items</p>
                    <p className="mt-2 font-semibold text-text-primary">{entry.itemCount || 1}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-6 py-10 text-center">
              <p className="text-lg font-black text-text-primary">No shipments match this view</p>
              <p className="mt-2 text-sm text-text-secondary">
                Adjust the filter or wait for new order handoffs to enter the queue.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ShipperDeliveryQueuePage;
