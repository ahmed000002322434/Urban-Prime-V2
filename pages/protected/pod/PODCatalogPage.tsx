import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import podMarketplaceService from '../../../services/podMarketplaceService';
import type { PodCatalogTemplate } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const PODCatalogPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [templates, setTemplates] = useState<PodCatalogTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await podMarketplaceService.getCatalog();
        if (!cancelled) setTemplates(response);
      } catch (error) {
        console.error('POD catalog load failed:', error);
        if (!cancelled) showNotification('Unable to load the POD starter catalog.');
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
      eyebrow="Starter Catalog"
      title="Curated blanks for apparel, wall art, drinkware, and carry goods."
      description="These code-backed templates set the base cost, lead time, color range, and print areas for POD v1."
      actions={
        <Link to="/profile/pod-studio/new" className="pod-button">
          Start a product
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
            {templates.map((template) => (
              <Link key={template.key} to={`/profile/pod-studio/new?template=${template.key}`} className="pod-catalog-card">
                <div className="pod-catalog-media">
                  <img src={template.mockupImageUrls[0]} alt={template.name} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3>{template.name}</h3>
                    <span>{template.category}</span>
                  </div>
                  <p>{template.description}</p>
                  <div className="grid gap-2 text-xs text-white/62 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Base cost</span>
                      <strong className="mt-2 block text-sm font-black text-white">${template.baseCost.toFixed(2)}</strong>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Lead time</span>
                      <strong className="mt-2 block text-sm font-black text-white">{template.leadTimeDays} days</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.availableColors.slice(0, 4).map((color) => (
                      <span key={color} className="pod-badge">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PODStudioLayout>
  );
};

export default PODCatalogPage;
