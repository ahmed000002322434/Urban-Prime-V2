import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import SpotlightCommerceBridge from '../../components/spotlight/SpotlightCommerceBridge';
import { SpotlightProfileTimelineList } from '../../components/spotlight/SpotlightProfileShared';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightService, type SpotlightCreator, type SpotlightItem, type SpotlightSearchResponse } from '../../services/spotlightService';
import { buildSpotlightAttribution, buildSpotlightItemHref } from '../../utils/spotlightCommerce';

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';
const softClass =
  'rounded-[24px] border border-white/[0.06] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

const SpotlightSearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [query, setQuery] = useState(() => params.get('q') || '');
  const [searchResults, setSearchResults] = useState<SpotlightSearchResponse | null>(null);
  const [trendingPosts, setTrendingPosts] = useState<SpotlightItem[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<SpotlightCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sentImpressionRef = useRef(new Set<string>());
  const isExplore = location.pathname.startsWith('/spotlight/explore');
  const activeQuery = query.trim();

  const loadSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeQuery) {
        const nextResults = await spotlightService.search(activeQuery, {
          limit: 12,
          viewerFirebaseUid: user?.id
        });
        setSearchResults(nextResults);
      } else {
        setSearchResults(null);
        const [feed, creators] = await Promise.all([
          spotlightService.getFeed({ mode: 'trending', limit: 10, viewerFirebaseUid: user?.id }),
          spotlightService.getSuggestedUsers(user?.id)
        ]);
        setTrendingPosts(feed.items || []);
        setSuggestedCreators(creators || []);
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to load Spotlight discovery.');
    } finally {
      setIsLoading(false);
    }
  }, [activeQuery, showNotification, user?.id]);

  useEffect(() => {
    void loadSearch();
  }, [loadSearch]);

  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    if (query.trim()) nextParams.set('q', query.trim());
    else nextParams.delete('q');
    if (nextParams.toString() !== params.toString()) {
      setParams(nextParams, { replace: true });
    }
  }, [location.search, params, query, setParams]);

  const handleOpenProduct = useCallback(async (item: SpotlightItem, product: SpotlightSearchResponse['products'][number]['product']) => {
    try {
      await spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'click',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        metadata: {
          source: 'spotlight_search',
          placement: product.placement
        }
      });
    } catch {
      // Navigation still continues.
    }
    navigate(buildSpotlightItemHref(product.item_id, buildSpotlightAttribution(item, product)));
  }, [navigate, user?.id]);

  useEffect(() => {
    (searchResults?.products || []).slice(0, 4).forEach(({ item, product }) => {
      const key = `${item.id}:${product.id}`;
      if (sentImpressionRef.current.has(key)) return;
      sentImpressionRef.current.add(key);
      void spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'impression',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        metadata: {
          source: 'spotlight_search',
          placement: product.placement
        }
      }).catch(() => undefined);
    });
  }, [searchResults?.products, user?.id]);

  const commerceEntries = useMemo(() => searchResults?.products || [], [searchResults?.products]);

  return (
    <SpotlightNoirBlankSurface>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className={`${panelClass} p-6 sm:p-7`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/36">
                {isExplore ? 'Spotlight explore' : 'Spotlight search'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                {isExplore ? 'Trending creators, posts, and shop-connected discovery.' : 'Search Spotlight, creators, tags, and tagged products.'}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/spotlight" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74">Feed</Link>
              <Link to="/spotlight/create" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">Post</Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Spotlight..."
              className="h-13 flex-1 rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-5 text-sm text-white outline-none placeholder:text-white/28"
            />
            <button type="button" onClick={() => void loadSearch()} className="rounded-[22px] bg-white px-5 py-3 text-sm font-semibold text-black">
              Search
            </button>
          </div>
        </section>

        {isLoading ? (
          <section className={`${panelClass} p-6 text-center text-sm text-white/54`}>Loading discovery...</section>
        ) : activeQuery ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-5">
              <div className={`${panelClass} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Matching tags</p>
                    <p className="mt-2 text-sm text-white/56">Search terms pulled from hashtags and interest tags.</p>
                  </div>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/58">{searchResults?.tags.length || 0}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(searchResults?.tags || []).map((tag) => (
                    <button key={tag.key} type="button" onClick={() => setQuery(tag.label.replace(/^#/, ''))} className={`${softClass} px-3 py-2 text-xs font-semibold text-white/72`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${panelClass} p-5`}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Posts</p>
                <div className="mt-4">
                  <SpotlightProfileTimelineList
                    surface="dark"
                    items={searchResults?.posts || []}
                    emptyMessage="No Spotlight posts matched this search."
                    onOpenItem={(item) => navigate(`/spotlight/post/${item.id}`)}
                  />
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className={`${panelClass} p-5`}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Creators</p>
                <div className="mt-4 space-y-3">
                  {(searchResults?.creators || []).length === 0 ? (
                    <div className={`${softClass} px-4 py-4 text-sm text-white/54`}>No creator matches yet.</div>
                  ) : (searchResults?.creators || []).map((creator) => (
                    <Link key={creator.id} to={`/spotlight/profile/${encodeURIComponent(creator.username || creator.firebase_uid || creator.id)}`} className={`${softClass} block px-4 py-4`}>
                      <p className="text-sm font-semibold text-white">{creator.name}</p>
                      <p className="mt-1 text-xs text-white/42">{creator.followers_count} followers</p>
                    </Link>
                  ))}
                </div>
              </section>

              <SpotlightCommerceBridge
                entries={commerceEntries}
                onOpenProduct={handleOpenProduct}
                onBuyProduct={handleOpenProduct}
              />
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-5">
              <div className={`${panelClass} p-5`}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Trending posts</p>
                <div className="mt-4">
                  <SpotlightProfileTimelineList
                    surface="dark"
                    items={trendingPosts}
                    emptyMessage="No trending Spotlight posts yet."
                    onOpenItem={(item) => navigate(`/spotlight/post/${item.id}`)}
                  />
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className={`${panelClass} p-5`}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Suggested creators</p>
                <div className="mt-4 space-y-3">
                  {suggestedCreators.map((creator) => (
                    <Link key={creator.id} to={`/spotlight/profile/${encodeURIComponent(creator.username || creator.firebase_uid || creator.id)}`} className={`${softClass} block px-4 py-4`}>
                      <p className="text-sm font-semibold text-white">{creator.name}</p>
                      <p className="mt-1 text-xs text-white/42">{creator.followers_count} followers</p>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </SpotlightNoirBlankSurface>
  );
};

export default SpotlightSearchPage;
