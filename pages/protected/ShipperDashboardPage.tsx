import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import shipperService from '../../services/shipperService';
import type { ShipperDashboardSnapshot, ShipperDeliveryQueueEntry } from '../../types';
import { useNotification } from '../../context/NotificationContext';

type FocusLane = 'all' | 'delayed' | 'pickup' | 'transit' | 'delivery' | 'delivered';

const ACTIVE_STATUSES = ['in_transit', 'out_for_delivery', 'picked_up'];
const PENDING_STATUSES = ['pending_pickup', 'label_created', 'processing'];

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not synced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatRelativeEta = (value?: string | null) => {
  if (!value) return 'ETA pending';
  const etaMs = new Date(value).getTime();
  if (!Number.isFinite(etaMs)) return 'ETA pending';
  const diffMs = etaMs - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return diffMinutes >= 0 ? `Due in ${absMinutes}m` : `${absMinutes}m late`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return diffMinutes >= 0 ? `Due in ${absHours}h` : `${absHours}h late`;
  }

  const absDays = Math.round(absHours / 24);
  return diffMinutes >= 0 ? `Due in ${absDays}d` : `${absDays}d late`;
};

const formatStatusLabel = (value: string) =>
  String(value || 'processing')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatLoadError = (value: unknown, fallback: string) => {
  const message = String((value as any)?.message || value || fallback).trim();
  if (/unauthorized|authentication required/i.test(message)) {
    return 'Sign in with a shipper-enabled account to load live shipping data.';
  }
  if (/firestore fallback/i.test(message)) {
    return 'Disable fallback mode to open the live shipper workspace.';
  }
  if (/backend/i.test(message)) {
    return 'Live shipping data is unavailable until the commerce backend is reachable.';
  }
  return message || fallback;
};

const getStatusClasses = (value: string, delayed = false) => {
  if (delayed) return 'border-rose-200 bg-rose-50 text-rose-700';
  const status = String(value || '').toLowerCase();
  if (status === 'delivered') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'out_for_delivery') return 'border-violet-200 bg-violet-50 text-violet-700';
  if (ACTIVE_STATUSES.includes(status)) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (PENDING_STATUSES.includes(status)) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
};

const matchesFocusLane = (entry: ShipperDeliveryQueueEntry, focus: FocusLane) => {
  if (focus === 'all') return true;
  if (focus === 'delayed') return entry.delayed;
  if (focus === 'pickup') return PENDING_STATUSES.includes(entry.status);
  if (focus === 'transit') return ['in_transit', 'picked_up'].includes(entry.status);
  if (focus === 'delivery') return entry.status === 'out_for_delivery';
  if (focus === 'delivered') return entry.status === 'delivered';
  return true;
};

const isDueSoon = (entry: ShipperDeliveryQueueEntry) => {
  const etaMs = new Date(entry.eta).getTime();
  if (!Number.isFinite(etaMs)) return false;
  if (entry.delayed || ['delivered', 'cancelled', 'returned'].includes(entry.status)) return false;
  const diffMs = etaMs - Date.now();
  return diffMs >= 0 && diffMs <= 12 * 60 * 60 * 1000;
};

const matchesSearch = (entry: ShipperDeliveryQueueEntry, query: string) =>
  [
    entry.orderId,
    entry.buyerName,
    entry.buyerEmail,
    entry.status,
    entry.carrier,
    entry.trackingNumber
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const buildQueueLink = (params: { filter?: string; search?: string }) => {
  const query = new URLSearchParams();
  if (params.filter && params.filter !== 'all') query.set('filter', params.filter);
  if (params.search?.trim()) query.set('search', params.search.trim());
  const suffix = query.toString();
  return suffix ? `/profile/shipper/queue?${suffix}` : '/profile/shipper/queue';
};

const ShipperDashboardPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ShipperDashboardSnapshot | null>(null);
  const [entries, setEntries] = useState<ShipperDeliveryQueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<FocusLane>('all');
  const { showMessageBanner, showNotification } = useNotification();
  const prevDelayedRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const loadHub = useCallback(
    async ({ background = false, notify = false }: { background?: boolean; notify?: boolean } = {}) => {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [snapshotResult, queueResult] = await Promise.allSettled([
          shipperService.getDashboardSnapshot(),
          shipperService.getDeliveryQueue()
        ]);

        if (!mountedRef.current) return;

        const issues: string[] = [];
        let hadSuccess = false;

        if (snapshotResult.status === 'fulfilled') {
          hadSuccess = true;
          setSnapshot(snapshotResult.value);
        } else {
          issues.push(formatLoadError(snapshotResult.reason, 'Unable to load shipper dashboard.'));
        }

        if (queueResult.status === 'fulfilled') {
          hadSuccess = true;
          setEntries(queueResult.value);
        } else {
          issues.push(formatLoadError(queueResult.reason, 'Unable to load the delivery queue.'));
        }

        if (hadSuccess) {
          setLastLoadedAt(new Date().toISOString());
          if (notify) showNotification('Shipper hub refreshed.');
        } else {
          setSnapshot(null);
          setEntries([]);
        }

        if (issues.length === 0) {
          setError('');
        } else if (hadSuccess) {
          setError(`Some live controls are temporarily unavailable. ${issues[0]}`);
        } else {
          setError(issues[0]);
        }
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
    void loadHub();

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadHub({ background: true });
    }, 12000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [loadHub]);

  const summary = useMemo(() => {
    const total = entries.length;
    const activeShipments = snapshot?.summary.activeShipments ?? entries.filter((entry) => ACTIVE_STATUSES.includes(entry.status)).length;
    const pendingPickup = snapshot?.summary.pendingPickup ?? entries.filter((entry) => PENDING_STATUSES.includes(entry.status)).length;
    const deliveredToday =
      snapshot?.summary.deliveredToday ??
      entries.filter((entry) => entry.status === 'delivered').length;
    const delayedShipments = snapshot?.summary.delayedShipments ?? entries.filter((entry) => entry.delayed).length;
    const outForDelivery = entries.filter((entry) => entry.status === 'out_for_delivery').length;
    const trackingCoverage = total > 0 ? Math.round((entries.filter((entry) => entry.trackingNumber).length / total) * 100) : 0;
    const onTimeRate = total > 0 ? Math.max(0, Math.round(((total - delayedShipments) / total) * 100)) : 100;
    const dueSoonCount = entries.filter(isDueSoon).length;
    const labelGapCount = entries.filter((entry) => !entry.trackingNumber).length;

    return {
      total,
      activeShipments,
      pendingPickup,
      deliveredToday,
      delayedShipments,
      outForDelivery,
      trackingCoverage,
      onTimeRate,
      dueSoonCount,
      labelGapCount
    };
  }, [entries, snapshot]);

  useEffect(() => {
    if (isLoading) return;
    const delayed = summary.delayedShipments;
    const previous = prevDelayedRef.current;
    prevDelayedRef.current = delayed;
    if (previous !== null && delayed > previous && delayed > 0) {
      showMessageBanner({
        title: 'Logistics alert',
        message: `${delayed} shipment(s) are now outside the ETA window. Review the exception lane.`,
        tone: 'info',
        durationMs: 9000
      });
    }
  }, [isLoading, showMessageBanner, summary.delayedShipments]);

  const focusOptions = useMemo(
    () => [
      { id: 'all' as const, label: 'All lanes', count: entries.length },
      { id: 'delayed' as const, label: 'Exceptions', count: entries.filter((entry) => entry.delayed).length },
      { id: 'pickup' as const, label: 'Pickup', count: entries.filter((entry) => PENDING_STATUSES.includes(entry.status)).length },
      { id: 'transit' as const, label: 'Transit', count: entries.filter((entry) => ['in_transit', 'picked_up'].includes(entry.status)).length },
      { id: 'delivery' as const, label: 'Out today', count: entries.filter((entry) => entry.status === 'out_for_delivery').length },
      { id: 'delivered' as const, label: 'Delivered', count: entries.filter((entry) => entry.status === 'delivered').length }
    ],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!matchesFocusLane(entry, focus)) return false;
      if (!query) return true;
      return matchesSearch(entry, query);
    });
  }, [entries, focus, search]);

  const boardEntries = useMemo(() => filteredEntries.slice(0, 6), [filteredEntries]);
  const delayedEntries = useMemo(() => entries.filter((entry) => entry.delayed).slice(0, 4), [entries]);
  const dueSoonEntries = useMemo(() => entries.filter(isDueSoon).slice(0, 4), [entries]);
  const upcomingEntries = useMemo(() => (snapshot?.upcoming || []).slice(0, 4), [snapshot?.upcoming]);
  const noLiveData = !isLoading && !snapshot && entries.length === 0;

  const hubActions = useMemo(
    () => [
      {
        title: 'Delivery queue',
        description: 'Work the full queue with search, filters, and tracking details.',
        to: '/profile/shipper/queue',
        count: summary.total,
        accent: 'border-sky-200 bg-sky-50/80 text-sky-700'
      },
      {
        title: 'Exception desk',
        description: 'Jump straight into shipments that need follow-up now.',
        to: buildQueueLink({ filter: 'delayed' }),
        count: summary.delayedShipments,
        accent: 'border-rose-200 bg-rose-50/80 text-rose-700'
      },
      {
        title: 'Pickup prep',
        description: 'Review pending handoffs and shipments waiting on labels.',
        to: buildQueueLink({ filter: 'pending' }),
        count: summary.pendingPickup,
        accent: 'border-amber-200 bg-amber-50/80 text-amber-700'
      },
      {
        title: 'Messages',
        description: 'Coordinate with buyers, sellers, and support from one inbox.',
        to: '/profile/messages',
        count: dueSoonEntries.length,
        accent: 'border-violet-200 bg-violet-50/80 text-violet-700'
      },
      {
        title: 'SLA analytics',
        description: 'Review delay pressure and shipper performance trends.',
        to: '/profile/analytics/shipper/overview',
        count: summary.onTimeRate,
        suffix: '%',
        accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
      },
      {
        title: 'Workflow map',
        description: 'Keep the wider buyer, seller, and shipper journey easy to reach.',
        to: '/profile/workflows',
        count: upcomingEntries.length,
        accent: 'border-slate-200 bg-slate-100 text-slate-700'
      }
    ],
    [dueSoonEntries.length, summary.delayedShipments, summary.onTimeRate, summary.pendingPickup, summary.total, upcomingEntries.length]
  );

  const metricCards = useMemo(
    () => [
      {
        label: 'Live queue',
        value: summary.total,
        tone: 'border-slate-200 bg-slate-100/90 text-text-primary'
      },
      {
        label: 'Active shipments',
        value: summary.activeShipments,
        tone: 'border-sky-200 bg-sky-50/90 text-sky-700'
      },
      {
        label: 'Pending pickup',
        value: summary.pendingPickup,
        tone: 'border-amber-200 bg-amber-50/90 text-amber-700'
      },
      {
        label: 'Out for delivery',
        value: summary.outForDelivery,
        tone: 'border-violet-200 bg-violet-50/90 text-violet-700'
      },
      {
        label: 'Delivered today',
        value: summary.deliveredToday,
        tone: 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
      },
      {
        label: 'Exceptions',
        value: summary.delayedShipments,
        tone: 'border-rose-200 bg-rose-50/90 text-rose-700'
      }
    ],
    [summary.activeShipments, summary.delayedShipments, summary.deliveredToday, summary.outForDelivery, summary.pendingPickup, summary.total]
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Shipper control</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Logistics command hub</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Dispatch, queue pressure, and delivery follow-up now live in one shipper workspace.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Live backend
              </span>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                Auto-refresh 12s
              </span>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                Last sync {formatDateTime(lastLoadedAt || snapshot?.generatedAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadHub({ background: !isLoading, notify: true })}
              disabled={isLoading || isRefreshing}
              className="clay-button clay-button-secondary clay-size-sm is-interactive disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link to="/profile/shipper/queue" className="clay-button clay-button-secondary clay-size-sm is-interactive">
              Open queue
            </Link>
            <Link to="/profile/analytics/shipper/overview" className="clay-button clay-button-secondary clay-size-sm is-interactive">
              SLA analytics
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hubActions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="group rounded-[24px] border border-border bg-surface-soft p-4 transition hover:border-primary/35 hover:bg-white dark:hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-text-primary">{action.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{action.description}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${action.accent}`}>
                  {action.count}
                  {action.suffix || ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-[24px] border p-4 ${card.tone}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-current">{isLoading && !lastLoadedAt ? '--' : card.value}</p>
          </div>
        ))}
      </section>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Dispatch board</p>
                <h2 className="mt-2 text-2xl font-black text-text-primary">Live shipment lanes</h2>
              </div>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                {filteredEntries.length} visible
              </span>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, buyer, carrier, or tracking"
                className="h-12 w-full rounded-2xl border border-border bg-surface-soft px-4 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 lg:max-w-md"
              />
              <div className="flex flex-wrap gap-2">
                {focusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFocus(option.id)}
                    className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                      focus === option.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface-soft text-text-secondary hover:border-primary/35 hover:text-text-primary'
                    }`}
                  >
                    {option.label} {option.count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-text-secondary">Loading shipper hub...</p>
            ) : noLiveData ? (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-6 py-10 text-center">
                <p className="text-lg font-black text-text-primary">Live shipper hub unavailable</p>
                <p className="mt-2 text-sm text-text-secondary">{error || 'No live shipping data is available yet.'}</p>
              </div>
            ) : boardEntries.length ? (
              boardEntries.map((entry) => (
                <article
                  key={entry.shipmentId}
                  className={`rounded-[24px] border p-4 transition-colors ${
                    entry.delayed ? 'border-rose-200 bg-rose-50/70' : 'border-border bg-surface-soft'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusClasses(entry.status, entry.delayed)}`}>
                          {entry.delayed ? 'Delayed' : formatStatusLabel(entry.status)}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                          Order {entry.orderId.slice(0, 8)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-black text-text-primary">{entry.buyerName}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{entry.buyerEmail || 'Buyer email unavailable'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/profile/track-delivery/${entry.detailId}`}
                        className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-text-primary transition hover:border-primary/35 hover:text-primary dark:bg-surface"
                      >
                        View delivery
                      </Link>
                      <Link
                        to={buildQueueLink({ search: entry.orderId })}
                        className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-text-primary transition hover:border-primary/35 hover:text-primary dark:bg-surface"
                      >
                        Open queue
                      </Link>
                      {entry.trackingNumber ? (
                        <button
                          type="button"
                          onClick={() => void copyTracking(entry.trackingNumber)}
                          className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-text-primary transition hover:border-primary/35 hover:text-primary dark:bg-surface"
                        >
                          Copy tracking
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-surface p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">ETA</p>
                      <p className="mt-2 font-semibold text-text-primary">{formatDateTime(entry.eta)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{formatRelativeEta(entry.eta)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Carrier</p>
                      <p className="mt-2 font-semibold text-text-primary">{entry.carrier || 'Assign carrier'}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Tracking</p>
                      <p className="mt-2 break-all font-semibold text-text-primary">{entry.trackingNumber || 'Pending label'}</p>
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
                <p className="text-lg font-black text-text-primary">No shipments match this lane</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Clear the search or switch lanes to widen the view.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Operational health</p>
                <h2 className="mt-2 text-xl font-black text-text-primary">Queue pressure</h2>
              </div>
              <Link
                to="/profile/shipper/queue"
                className="text-[11px] font-black uppercase tracking-[0.16em] text-primary"
              >
                Full queue
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/80">On-time now</p>
                <p className="mt-2 text-3xl font-black text-emerald-700">{isLoading && !lastLoadedAt ? '--' : `${summary.onTimeRate}%`}</p>
              </div>
              <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700/80">Tracking coverage</p>
                <p className="mt-2 text-3xl font-black text-sky-700">{isLoading && !lastLoadedAt ? '--' : `${summary.trackingCoverage}%`}</p>
              </div>
              <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700/80">Due next 12h</p>
                <p className="mt-2 text-3xl font-black text-amber-700">{isLoading && !lastLoadedAt ? '--' : summary.dueSoonCount}</p>
              </div>
              <div className="rounded-[24px] border border-violet-200 bg-violet-50/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700/80">Label gaps</p>
                <p className="mt-2 text-3xl font-black text-violet-700">{isLoading && !lastLoadedAt ? '--' : summary.labelGapCount}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Exception watch</p>
                <h2 className="mt-2 text-xl font-black text-text-primary">Need follow-up</h2>
              </div>
              <Link
                to={buildQueueLink({ filter: 'delayed' })}
                className="text-[11px] font-black uppercase tracking-[0.16em] text-primary"
              >
                Open lane
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {delayedEntries.length ? (
                delayedEntries.map((entry) => (
                  <div key={entry.shipmentId} className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700/80">
                          Order {entry.orderId.slice(0, 8)}
                        </p>
                        <p className="mt-2 text-sm font-black text-text-primary">{entry.buyerName}</p>
                        <p className="mt-1 text-sm text-text-secondary">{formatRelativeEta(entry.eta)}</p>
                      </div>
                      <Link
                        to={`/profile/track-delivery/${entry.detailId}`}
                        className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700 transition hover:border-rose-300 dark:bg-surface"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-4 py-8 text-center">
                  <p className="text-sm font-black text-text-primary">No delayed shipments right now</p>
                  <p className="mt-2 text-sm text-text-secondary">Exceptions will surface here as soon as ETAs slip.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-text-secondary">Next actions</p>
                <h2 className="mt-2 text-xl font-black text-text-primary">Due soon and upcoming</h2>
              </div>
              <Link
                to={buildQueueLink({ filter: 'active' })}
                className="text-[11px] font-black uppercase tracking-[0.16em] text-primary"
              >
                Active lane
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {dueSoonEntries.length ? (
                dueSoonEntries.map((entry) => (
                  <div key={entry.shipmentId} className="rounded-[24px] border border-border bg-surface-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                          {formatStatusLabel(entry.status)}
                        </p>
                        <p className="mt-2 text-sm font-black text-text-primary">{entry.buyerName}</p>
                        <p className="mt-1 text-sm text-text-secondary">{formatDateTime(entry.eta)}</p>
                      </div>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                        {formatRelativeEta(entry.eta)}
                      </span>
                    </div>
                  </div>
                ))
              ) : upcomingEntries.length ? (
                upcomingEntries.map((entry) => (
                  <div key={entry.shipmentId} className="rounded-[24px] border border-border bg-surface-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                          {formatStatusLabel(entry.status)}
                        </p>
                        <p className="mt-2 text-sm font-black text-text-primary">{entry.buyerName}</p>
                        <p className="mt-1 text-sm text-text-secondary">ETA {formatDateTime(entry.eta)}</p>
                      </div>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary dark:bg-surface">
                        {entry.city || 'Route live'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-soft px-4 py-8 text-center">
                  <p className="text-sm font-black text-text-primary">Nothing queued for the next window</p>
                  <p className="mt-2 text-sm text-text-secondary">New handoffs will appear here as live shipments move into the active lanes.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShipperDashboardPage;
