import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import { serviceService } from '../../../services/itemService';
import type { Review, Service } from '../../../types';
import { ProviderEmptyState, ProviderSurface } from './providerWorkspaceUi';

const ProviderReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const rows = await serviceService.getServicesByProvider(user.id);
        if (!cancelled) setServices(rows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const reviews = useMemo(
    () =>
      services.flatMap((service) =>
        (service.reviews || []).map((review: any) => ({
          ...review,
          serviceTitle: service.title
        }))
      ) as Array<Review & { serviceTitle: string }>,
    [services]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <ProviderEmptyState title="No provider reviews yet" body="Client feedback will be aggregated here across your published services." ctaLabel="View services" ctaTo="/profile/provider/services" />
    );
  }

  return (
    <div className="grid gap-4">
      {reviews.map((review, index) => (
        <ProviderSurface key={`${review.id || 'review'}-${index}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">{review.serviceTitle}</p>
              <p className="mt-2 text-sm text-text-secondary">{review.comment}</p>
            </div>
            <div className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-sm font-semibold text-text-primary">
              {review.rating}/5
            </div>
          </div>
        </ProviderSurface>
      ))}
    </div>
  );
};

export default ProviderReviewsPage;
