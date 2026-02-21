import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';
import { itemService, ItemActivitySummary, OwnerControlRow } from '../../services/itemService';
import type { ListingActivityPreferences } from '../../types';

const preferenceLabels: Array<{ key: keyof ListingActivityPreferences; label: string }> = [
  { key: 'itemView', label: 'View' },
  { key: 'cartAdd', label: 'Cart' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'rent', label: 'Rent' },
  { key: 'auctionWin', label: 'Auction' },
  { key: 'instantAlert', label: 'Instant' },
  { key: 'dailyDigest', label: 'Digest' }
];

const emptySummary: ItemActivitySummary = {
  totalEvents: 0,
  views: 0,
  cartAdds: 0,
  purchases: 0,
  rentals: 0,
  auctionWins: 0,
  averageViewSeconds: 0
};

const OwnerControlsPage: React.FC = () => {
  const { user, activePersona } = useAuth();
  const { showNotification } = useNotification();
  const [rows, setRows] = useState<OwnerControlRow[]>([]);
  const [summary, setSummary] = useState<ItemActivitySummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  const personaId = activePersona?.id;

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setSummary(emptySummary);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [controlRows, activitySummary] = await Promise.all([
        itemService.getOwnerControlRows(user.id, personaId),
        itemService.getOwnerActivitySummary(user.id, personaId)
      ]);
      setRows(controlRows);
      setSummary(activitySummary);
    } catch (error) {
      console.error('Owner controls load failed:', error);
      showNotification('Unable to load owner controls right now.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, personaId, showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const togglePreference = (itemId: string, key: keyof ListingActivityPreferences) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemId === itemId
          ? {
              ...row,
              preferences: {
                ...row.preferences,
                [key]: !row.preferences[key]
              }
            }
          : row
      )
    );
  };

  const savePreferences = async (row: OwnerControlRow) => {
    setSavingMap((prev) => ({ ...prev, [row.itemId]: true }));
    try {
      await itemService.updateListingActivityPreferences(row.itemId, row.preferences);
      showNotification(`Saved controls for ${row.itemTitle}.`);
    } catch (error) {
      console.error('Save listing preferences failed:', error);
      showNotification(`Unable to save controls for ${row.itemTitle}.`);
    } finally {
      setSavingMap((prev) => ({ ...prev, [row.itemId]: false }));
    }
  };

  const totals = useMemo(
    () => [
      { label: 'Events', value: summary.totalEvents },
      { label: 'Views', value: summary.views },
      { label: 'Cart Adds', value: summary.cartAdds },
      { label: 'Purchases', value: summary.purchases },
      { label: 'Rentals', value: summary.rentals },
      { label: 'Auctions', value: summary.auctionWins },
      { label: 'Avg Stay', value: `${summary.averageViewSeconds}s` }
    ],
    [summary]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Owner Controls</h1>
          <p className="text-sm text-text-secondary">
            Monitor listing activity and choose which events trigger alerts for each listing.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-full border border-border/70 bg-surface text-sm font-semibold text-text-primary hover:bg-surface-soft"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {totals.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">{card.label}</p>
            <p className="text-2xl font-bold text-text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold text-text-primary">Listing-level controls</h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-text-secondary">No listings found for this workspace.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-soft/60 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Listing</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Views</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Cart</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Purchases</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Rentals</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Auctions</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Avg Stay</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Alerts</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((row) => (
                  <tr key={row.itemId}>
                    <td className="px-4 py-3 min-w-[220px]">
                      <p className="font-semibold text-text-primary">{row.itemTitle}</p>
                      <p className="text-xs text-text-secondary uppercase tracking-wide">
                        {row.listingType || 'sale'} {row.status ? `- ${row.status}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.views}</td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.cartAdds}</td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.purchases}</td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.rentals}</td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.auctionWins}</td>
                    <td className="px-4 py-3 text-text-primary">{row.metrics.averageViewSeconds}s</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {preferenceLabels.map((pref) => (
                          <button
                            key={pref.key}
                            onClick={() => togglePreference(row.itemId, pref.key)}
                            className={`px-2 py-1 rounded-full border text-xs font-semibold transition ${
                              row.preferences[pref.key]
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface-soft text-text-secondary border-border'
                            }`}
                          >
                            {pref.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => savePreferences(row)}
                        disabled={Boolean(savingMap[row.itemId])}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface-soft text-xs font-semibold text-text-primary hover:bg-surface disabled:opacity-50"
                      >
                        {savingMap[row.itemId] ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerControlsPage;
