import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import contractService from '../../../services/contractService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import type { Contract, WorkListing } from '../../../types';
import { ProviderEmptyState, ProviderSurface, formatDateTime, formatStatus, statusPillClass } from './providerWorkspaceUi';

const ProviderCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [listings, setListings] = useState<WorkListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [contractRows, listingRows] = await Promise.all([
          contractService.getContracts({ providerId: user.id, limit: 100 }),
          providerWorkspaceService.getProviderListings(user.id)
        ]);
        if (cancelled) return;
        setContracts(contractRows);
        setListings(listingRows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const timeline = useMemo(
    () =>
      contracts
        .filter((entry) => ['pending', 'active', 'disputed'].includes(entry.status))
        .sort((left, right) => new Date(left.startAt || left.dueAt || left.createdAt).getTime() - new Date(right.startAt || right.dueAt || right.createdAt).getTime()),
    [contracts]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!timeline.length) {
    return (
      <ProviderEmptyState
        title="Calendar is clear"
        body="Accepted bookings and active contracts will appear here in schedule order."
        ctaLabel="Manage services"
        ctaTo="/profile/provider/services"
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <ProviderSurface>
        <h2 className="text-lg font-bold text-text-primary">Upcoming work</h2>
        <div className="mt-4 space-y-3">
          {timeline.map((contract) => (
            <div key={contract.id} className="rounded-3xl border border-border bg-surface-soft p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{contract.scope || 'Booked engagement'}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{formatDateTime(contract.startAt || contract.dueAt || contract.createdAt)}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(contract.status)}`}>
                  {formatStatus(contract.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ProviderSurface>

      <ProviderSurface>
        <h2 className="text-lg font-bold text-text-primary">Availability notes</h2>
        <div className="mt-4 space-y-3">
          {listings.slice(0, 4).map((listing) => (
            <div key={listing.id} className="rounded-3xl border border-border bg-surface-soft p-4">
              <p className="font-semibold text-text-primary">{listing.title}</p>
              <p className="mt-2 text-sm text-text-secondary">{listing.availability?.notes || 'Availability managed in the service editor.'}</p>
            </div>
          ))}
        </div>
      </ProviderSurface>
    </div>
  );
};

export default ProviderCalendarPage;
