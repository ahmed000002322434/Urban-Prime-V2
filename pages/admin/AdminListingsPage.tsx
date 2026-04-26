import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import workService from '../../services/workService';
import type { WorkListing } from '../../types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' }
] as const;

const statusClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'published' || normalized === 'approved') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (normalized === 'pending_review' || normalized === 'submitted' || normalized === 'under_review') return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (normalized === 'rejected') return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return 'border-border bg-surface-soft text-text-secondary';
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString();
};

const AdminListingsPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]['id']>('pending_review');
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<WorkListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>('');

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const rows = await workService.getListings({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200
      });
      setListings(rows);
    } catch (error) {
      console.error(error);
      showNotification('Unable to load admin listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, [statusFilter]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return listings;
    return listings.filter((listing) =>
      [listing.title, listing.category, listing.providerSnapshot?.name, listing.sellerId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [listings, search]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      pending: listings.filter((listing) => listing.status === 'pending_review').length,
      published: listings.filter((listing) => listing.status === 'published').length,
      rejected: listings.filter((listing) => listing.status === 'rejected').length
    }),
    [listings]
  );

  const reviewListing = async (listingId: string, action: 'approve' | 'reject') => {
    setBusyId(listingId);
    try {
      if (action === 'approve') {
        await workService.approveListing(listingId, 'Approved from admin listings review.');
      } else {
        await workService.rejectListing(listingId, 'Needs revision before publishing.');
      }
      showNotification(`Listing ${action}d.`);
      await loadListings();
    } catch (error) {
      console.error(error);
      showNotification('Unable to review listing.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-text-secondary">Admin Listings</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Listings Review Desk</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Review work listings, publish approved inventory, and keep the marketplace moderation queue moving.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                  statusFilter === filter.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface-soft text-text-secondary hover:bg-white/5'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { id: 'total', label: 'Total Listings', value: stats.total },
            { id: 'pending', label: 'Pending Review', value: stats.pending },
            { id: 'published', label: 'Published', value: stats.published },
            { id: 'rejected', label: 'Rejected', value: stats.rejected }
          ].map((card) => (
            <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-secondary">{card.label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-text-primary">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-surface p-5 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-text-primary">Moderation Queue</h2>
            <p className="text-sm text-text-secondary">Search by title, category, provider, or seller id.</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings..."
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm text-text-primary outline-none focus:border-primary md:max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-10 text-center text-sm text-text-secondary">
            No listings matched this review filter.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {filteredListings.map((listing) => {
              const price = listing.basePrice != null ? `${listing.currency || 'USD'} ${Number(listing.basePrice).toLocaleString()}` : 'Custom pricing';
              const isPending = listing.status === 'pending_review';
              return (
                <div key={listing.id} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClass(listing.status)}`}>
                          {String(listing.status || 'draft').replace(/_/g, ' ')}
                        </span>
                        <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">
                          {listing.category}
                        </span>
                        <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">
                          {listing.mode}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black text-text-primary">{listing.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        {listing.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm text-text-secondary md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary/70">Provider</p>
                          <p className="mt-1 font-semibold text-text-primary">{listing.providerSnapshot?.name || listing.sellerId}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary/70">Price</p>
                          <p className="mt-1 font-semibold text-text-primary">{price}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary/70">Submitted</p>
                          <p className="mt-1 font-semibold text-text-primary">{formatDate(listing.submittedAt || listing.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary/70">Risk Score</p>
                          <p className="mt-1 font-semibold text-text-primary">{listing.riskScore ?? '--'}</p>
                        </div>
                      </div>

                      {listing.reviewNotes ? (
                        <div className="mt-4 rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm text-text-secondary">
                          <span className="font-black uppercase tracking-[0.16em] text-[10px] text-text-secondary/70">Review Notes</span>
                          <p className="mt-2">{listing.reviewNotes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 lg:w-44">
                      <button
                        type="button"
                        onClick={() => void reviewListing(listing.id, 'approve')}
                        disabled={!isPending || busyId === listing.id}
                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
                      >
                        {busyId === listing.id ? 'Working...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewListing(listing.id, 'reject')}
                        disabled={!isPending || busyId === listing.id}
                        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminListingsPage;
