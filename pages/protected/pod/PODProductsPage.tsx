import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import podMarketplaceService from '../../../services/podMarketplaceService';
import type { PodStudioDashboard } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const currency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const PODProductsPage: React.FC = () => {
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
        console.error('POD listings load failed:', error);
        if (!cancelled) showNotification('Unable to load POD products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  return (
    <PODStudioLayout
      eyebrow="Products"
      title="Every POD listing, draft, and storefront-ready drop in one workspace."
      description="Manage pricing, margin, mockups, and design reuse from a single catalog view."
      actions={
        <Link to="/profile/pod-studio/new" className="pod-button">
          Create new listing
        </Link>
      }
    >
      <section className="pod-panel">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(dashboard?.listings || []).map((listing) => (
              <Link key={listing.id} to={`/profile/pod-studio/new?id=${listing.id}`} className="pod-catalog-card">
                <div className="pod-catalog-media">
                  <img src={listing.coverImageUrl} alt={listing.title} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3>{listing.title}</h3>
                    <span>{listing.status}</span>
                  </div>
                  <p>{listing.templateName}</p>
                  <div className="grid gap-2 text-xs text-white/62 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Price</span>
                      <strong className="mt-2 block text-sm font-black text-white">{currency(listing.price)}</strong>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Margin</span>
                      <strong className="mt-2 block text-sm font-black text-white">{listing.marginPercent}%</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/48">
                    <span>{listing.designCount} designs attached</span>
                    <span>{listing.queuedJobs} queued</span>
                  </div>
                </div>
              </Link>
            ))}
            {!dashboard?.listings?.length ? (
              <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-5 py-10 text-sm text-white/64 md:col-span-2 xl:col-span-3">
                No POD listings yet. Start a product from the curated template catalog or attach artwork from your private design library.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </PODStudioLayout>
  );
};

export default PODProductsPage;
