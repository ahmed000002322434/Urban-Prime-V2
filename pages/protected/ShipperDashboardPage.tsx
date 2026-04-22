import React, { useEffect, useMemo, useRef, useState } from 'react';
import shipperService from '../../services/shipperService';
import type { ShipperDashboardSnapshot } from '../../types';
import { useNotification } from '../../context/NotificationContext';

const formatEta = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const ShipperDashboardPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ShipperDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showMessageBanner } = useNotification();
  const prevDelayedRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await shipperService.getDashboardSnapshot();
      if (!active) return;
      setSnapshot(next);
      setIsLoading(false);
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void load();
    }, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !snapshot) return;
    const delayed = snapshot.summary.delayedShipments;
    const prev = prevDelayedRef.current;
    prevDelayedRef.current = delayed;
    if (prev !== null && delayed > prev && delayed > 0) {
      showMessageBanner({
        title: 'Logistics alert',
        message: `${delayed} shipment(s) are past the follow-up window. Review the delivery queue.`,
        tone: 'info',
        durationMs: 9000
      });
    }
  }, [isLoading, snapshot, showMessageBanner]);

  const cards = useMemo(() => {
    const summary = snapshot?.summary;
    return [
      { label: 'Active shipments', value: summary?.activeShipments ?? 0 },
      { label: 'Pending pickup', value: summary?.pendingPickup ?? 0 },
      { label: 'Delivered today', value: summary?.deliveredToday ?? 0 },
      { label: 'Delayed', value: summary?.delayedShipments ?? 0 }
    ];
  }, [snapshot?.summary]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Shipper Control</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Logistics Command Center</h1>
        <p className="mt-2 text-sm text-text-secondary">Live shipping operations across pickup, in-transit, and delivery.</p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-surface-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-text-primary">{isLoading ? '--' : card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Upcoming Deliveries</h2>
          <span className="text-xs text-text-secondary">Auto-refresh: 12s</span>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-text-secondary">Loading shipments...</p>
        ) : snapshot?.upcoming?.length ? (
          <div className="space-y-2">
            {snapshot.upcoming.map((entry) => (
              <div key={entry.shipmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-soft px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    Order {(entry.orderId || '—').slice(0, 8)}
                  </p>
                  <p className="text-xs text-text-secondary">{entry.buyerName || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{entry.status.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-text-secondary">ETA {formatEta(entry.eta)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-border bg-surface-soft/80">
            <p className="text-sm font-bold text-text-primary">Queue is clear</p>
            <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
              When buyers check out on Supabase-backed listings, shipments land here with live status. Legacy Firestore-only orders stay in seller tools until those listings are migrated.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ShipperDashboardPage;
