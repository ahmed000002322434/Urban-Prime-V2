import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import type { WorkListing } from '../../../types';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

type ListingFilter = 'all' | 'draft' | 'pending_review' | 'published' | 'rejected';

const ProviderServicesPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [listings, setListings] = useState<WorkListing[]>([]);
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const rows = await providerWorkspaceService.getProviderListings(user.id);
      setListings(rows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const visibleListings = useMemo(() => {
    if (filter === 'all') return listings;
    return listings.filter((entry) => entry.status === filter);
  }, [filter, listings]);

  const submitForReview = async (listingId: string) => {
    setSubmittingId(listingId);
    try {
      await providerWorkspaceService.submitListingForReview(listingId);
      showNotification('Listing submitted for admin review.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to submit listing for review.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!listings.length) {
    return (
      <ProviderEmptyState
        title="No service listings yet"
        body="Create your first service, save it as draft, and send it through moderation."
        ctaLabel="Create service"
        ctaTo="/profile/provider/services/new"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex gap-2">
          {(['all', 'draft', 'pending_review', 'published', 'rejected'] as ListingFilter[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setFilter(entry)}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${filter === entry ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-soft text-text-secondary'}`}
            >
              {formatStatus(entry)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {visibleListings.map((listing) => (
          <ProviderSurface key={listing.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex gap-4">
                <img src={listing.media?.[0] || '/icons/urbanprime.svg'} alt={listing.title} className="h-20 w-20 rounded-2xl object-cover" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{listing.title}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(listing.status)}`}>
                      {formatStatus(listing.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {listing.category} · {formatMoney(listing.basePrice || listing.packages?.[0]?.price || 0, listing.currency)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{listing.description}</p>
                  {listing.reviewNotes ? (
                    <div className="mt-3 rounded-2xl border border-border bg-surface-soft px-3 py-2 text-xs text-text-secondary">
                      Review notes: {listing.reviewNotes}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:w-[360px]">
                <Link to={`/service/${listing.id}`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Preview
                </Link>
                <Link to={`/profile/provider/services/${listing.id}/edit`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Edit
                </Link>
                {listing.status === 'draft' || listing.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => void submitForReview(listing.id)}
                    disabled={submittingId === listing.id}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submittingId === listing.id ? 'Submitting...' : 'Submit'}
                  </button>
                ) : (
                  <Link to="/profile/provider/leads" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Leads
                  </Link>
                )}
              </div>
            </div>
          </ProviderSurface>
        ))}
      </div>
    </div>
  );
};

export default ProviderServicesPage;
