import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import podMarketplaceService from '../../../services/podMarketplaceService';
import type { PodStudioDashboard } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const currency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const PODStudioDashboardPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [dashboard, setDashboard] = useState<PodStudioDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await podMarketplaceService.getDashboard();
        if (!cancelled) setDashboard(response);
      } catch (error) {
        console.error('POD dashboard load failed:', error);
        if (!cancelled) showNotification('Unable to load POD studio dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  if (loading) {
    return (
      <PODStudioLayout
        eyebrow="POD Studio"
        title="Manual fulfillment with a premium storefront workflow."
        description="Create fixed-design POD products, monitor queue health, and move orders through production."
      >
        <div className="pod-panel flex min-h-[420px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PODStudioLayout>
    );
  }

  return (
    <PODStudioLayout
      eyebrow="POD Studio"
      title="Manual fulfillment with a premium storefront workflow."
      description="Create fixed-design POD products, monitor queue health, and move orders through production."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link to="/profile/pod-studio/new" className="pod-button">
            New product
          </Link>
          <Link to="/print-on-demand" className="pod-button secondary">
            View discovery
          </Link>
        </div>
      }
      stats={[
        {
          label: 'Revenue',
          value: currency(dashboard?.summary.revenue || 0),
          detail: 'Completed POD jobs'
        },
        {
          label: 'Active listings',
          value: String(dashboard?.summary.activeListings || 0),
          detail: 'Published storefront products'
        },
        {
          label: 'Queued jobs',
          value: String(dashboard?.summary.queuedJobs || 0),
          detail: 'Production work waiting'
        },
        {
          label: 'Margin alerts',
          value: String(dashboard?.summary.lowMarginAlerts || 0),
          detail: 'Listings under target margin'
        }
      ]}
    >
      <section className="pod-panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="pod-step-label">Products</p>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-white">Published and draft listings</h2>
          </div>
          <Link to="/profile/pod-studio/products" className="pod-button secondary">
            Open products
          </Link>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {(dashboard?.listings || []).slice(0, 4).map((listing) => (
            <Link key={listing.id} to={`/profile/pod-studio/new?id=${listing.id}`} className="pod-media-card">
              <div className="pod-media-thumb">
                <img src={listing.coverImageUrl} alt={listing.title} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{listing.title}</h3>
                    <p>{listing.templateName}</p>
                  </div>
                  <span className="pod-badge">{listing.status}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="pod-inline-stat">
                    <span>Price</span>
                    <strong>{currency(listing.price)}</strong>
                  </div>
                  <div className="pod-inline-stat">
                    <span>Margin</span>
                    <strong>{listing.marginPercent}%</strong>
                  </div>
                  <div className="pod-inline-stat">
                    <span>Queued</span>
                    <strong>{listing.queuedJobs}</strong>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="pod-panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="pod-step-label">Orders</p>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-white">Recent production queue</h2>
          </div>
          <Link to="/profile/pod-studio/orders" className="pod-button secondary">
            Open queue
          </Link>
        </div>
        <div className="space-y-3">
          {(dashboard?.jobs || []).slice(0, 5).map((job) => (
            <div key={job.id} className="pod-order-row">
              <div>
                <p className="text-sm font-black text-white">{job.itemTitle}</p>
                <p className="text-xs text-white/56">
                  {job.buyerName || 'Buyer'} {job.variantSnapshot?.color ? `- ${job.variantSnapshot.color}` : ''}
                  {job.variantSnapshot?.size ? ` / ${job.variantSnapshot.size}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="pod-badge">{job.status}</span>
                <span className="text-xs font-semibold text-white/56">{job.buyerCity || 'No city yet'}</span>
              </div>
            </div>
          ))}
          {!dashboard?.jobs?.length ? (
            <p className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-5 py-8 text-sm text-white/62">
              No POD jobs yet. The queue will populate as soon as a buyer checks out a POD line item.
            </p>
          ) : null}
        </div>
      </section>
    </PODStudioLayout>
  );
};

export default PODStudioDashboardPage;
