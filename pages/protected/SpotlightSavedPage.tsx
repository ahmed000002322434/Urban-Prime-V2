import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import SpotlightCommerceBridge from '../../components/spotlight/SpotlightCommerceBridge';
import { SpotlightProfileTimelineList } from '../../components/spotlight/SpotlightProfileShared';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightService, type SpotlightItem } from '../../services/spotlightService';
import { buildSpotlightAttribution, buildSpotlightItemHref } from '../../utils/spotlightCommerce';

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';

const SpotlightSavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadSaved = useCallback(async (cursor?: string | null) => {
    if (!user?.id) return;
    if (cursor) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      const payload = await spotlightService.getSaved({
        cursor,
        limit: 20,
        viewerFirebaseUid: user.id
      });
      setItems((current) => cursor ? [...current, ...payload.items] : payload.items);
      setNextCursor(payload.next_cursor);
      setHasMore(payload.has_more);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to load saved Spotlights.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [showNotification, user?.id]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const commerceEntries = useMemo(
    () => items.flatMap((item) => (item.products || []).slice(0, 1).map((product) => ({ item, product }))).slice(0, 4),
    [items]
  );

  const openProduct = useCallback(async (item: SpotlightItem, product: NonNullable<SpotlightItem['products']>[number]) => {
    try {
      await spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'click',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        metadata: { source: 'spotlight_saved', placement: product.placement }
      });
    } catch {
      // Navigation still continues.
    }
    navigate(buildSpotlightItemHref(product.item_id, buildSpotlightAttribution(item, product)));
  }, [navigate, user?.id]);

  return (
    <SpotlightNoirBlankSurface>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className={`${panelClass} p-6 sm:p-7`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/36">Spotlight saved</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Bookmarked posts and shop-connected references, all in one lane.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/spotlight" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74">Back to feed</Link>
              <Link to="/spotlight/create" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">Post</Link>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className={`${panelClass} p-5`}>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-white/54">Loading saved Spotlights...</div>
            ) : (
              <>
                <SpotlightProfileTimelineList
                  surface="dark"
                  items={items}
                  emptyMessage="You have not saved any Spotlight posts yet."
                  onOpenItem={(item) => navigate(`/spotlight/post/${item.id}`)}
                />
                {hasMore ? (
                  <div className="mt-5 flex justify-center">
                    <button type="button" onClick={() => void loadSaved(nextCursor)} className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74">
                      {isLoadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside className="space-y-5">
            <SpotlightCommerceBridge entries={commerceEntries} onOpenProduct={openProduct} onBuyProduct={openProduct} />
          </aside>
        </div>
      </div>
    </SpotlightNoirBlankSurface>
  );
};

export default SpotlightSavedPage;
