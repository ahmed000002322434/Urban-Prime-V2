import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import PODProductStudio from '../../../components/pod/PODProductStudio';
import { itemService } from '../../../services/itemService';
import type { Item } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const PODProductEditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<Item | null>(null);

  const listingId = searchParams.get('id');
  const templateKey = searchParams.get('template');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!listingId) {
        setItem(null);
        return;
      }
      setLoading(true);
      try {
        const response = await itemService.getItemById(listingId);
        if (!cancelled) setItem(response || null);
      } catch (error) {
        console.error('POD editor listing load failed:', error);
        if (!cancelled) showNotification('Unable to load this POD listing.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId, showNotification]);

  return (
    <PODStudioLayout
      eyebrow={listingId ? 'Edit Product' : 'New Product'}
      title={listingId ? 'Refine an existing POD listing.' : 'Build a new POD listing from a curated starter blank.'}
      description="This wizard is mobile-first. On desktop the summary stays pinned while the step cards remain editable in one flow."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link to="/profile/pod-studio/designs" className="pod-button secondary">
            Design library
          </Link>
          <Link to="/profile/pod-studio/catalog" className="pod-button secondary">
            Catalog
          </Link>
        </div>
      }
    >
      <section className="pod-panel">
        {loading ? <Spinner size="lg" /> : <PODProductStudio initialItem={item} initialTemplateKey={templateKey} />}
      </section>
    </PODStudioLayout>
  );
};

export default PODProductEditorPage;
