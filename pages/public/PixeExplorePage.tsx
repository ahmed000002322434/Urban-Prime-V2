import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PixeEmptyState from '../../components/pixe/PixeEmptyState';
import { PixeVideoSurface } from '../../components/pixe/PixePublicSurface';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../components/pixe/pixeHeaderConfig';
import { serviceService } from '../../services/itemService';
import {
  pixeService,
  type PixeChannel,
  type PixeSearchProduct,
  type PixeSearchResponse,
  type PixeVideo
} from '../../services/pixeService';
import type { Service } from '../../types';

type ExploreCachePayload = {
  state: PixeSearchResponse;
  services: Service[];
  cachedAt: number;
};

const EXPLORE_CACHE_TTL_MS = 3 * 60 * 1000;
const exploreCacheMemory = new Map<string, ExploreCachePayload>();

const getExploreCacheKey = (query: string) => `urbanprime:pixe-explore:${query.trim().toLowerCase() || 'all'}`;

const readExploreCache = (query: string): ExploreCachePayload | null => {
  const key = getExploreCacheKey(query);
  const memory = exploreCacheMemory.get(key);
  if (memory && (Date.now() - memory.cachedAt) < EXPLORE_CACHE_TTL_MS) {
    return memory;
  }
  if (typeof window === 'undefined') return memory || null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return memory || null;
    const parsed = JSON.parse(raw) as ExploreCachePayload;
    if (!parsed || (Date.now() - Number(parsed.cachedAt || 0)) >= EXPLORE_CACHE_TTL_MS) return null;
    exploreCacheMemory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
};

const writeExploreCache = (query: string, payload: ExploreCachePayload) => {
  const key = getExploreCacheKey(query);
  exploreCacheMemory.set(key, payload);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore cache persistence failures.
  }
};

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const formatProductPrice = (product: PixeSearchProduct) => `${product.currency} ${product.price_amount.toFixed(2)}`;

const formatServicePrice = (service: Service) => {
  const primary = service.pricingModels?.[0];
  if (!primary) return 'Custom pricing';
  return `${primary.currency || service.currency || 'USD'} ${Number(primary.price || 0).toFixed(2)}`;
};

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore', end: true },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const horizontalRowClassName =
  'flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const matchesServiceQuery = (service: Service, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    service.title,
    service.description,
    service.category,
    service.provider?.name
  ].some((value) => String(value || '').toLowerCase().includes(normalized));
};

const sortCreatorsByReach = (creators: PixeChannel[]) =>
  [...creators].sort((left, right) => {
    const subscriberDelta = Number(right.subscriber_count || 0) - Number(left.subscriber_count || 0);
    if (subscriberDelta !== 0) return subscriberDelta;
    return Number(right.published_video_count || right.video_count || 0) - Number(left.published_video_count || left.video_count || 0);
  });

const SectionHeader: React.FC<{
  eyebrow: string;
  title: string;
  to: string;
  actionLabel: string;
}> = ({ eyebrow, title, to, actionLabel }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
    </div>
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
    >
      <span>{actionLabel}</span>
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 10h12" />
        <path d="m11.5 6.5 3.5 3.5-3.5 3.5" />
      </svg>
    </Link>
  </div>
);

const ExploreRowSkeleton: React.FC<{
  cardCount: number;
  itemClassName: string;
  mediaClassName?: string;
  kind?: 'media' | 'creator';
}> = ({ cardCount, itemClassName, mediaClassName = '', kind = 'media' }) => (
  <div className={horizontalRowClassName}>
    {Array.from({ length: cardCount }).map((_, index) => (
      <div key={`explore-skeleton-${index}`} className={`${itemClassName} shrink-0 rounded-[28px] bg-[#18181b]/94 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.22)]`}>
        {kind === 'creator' ? (
          <>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-[#2a2a2f]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-20 rounded-full bg-[#2a2a2f]" />
                <div className="h-5 w-2/3 rounded-full bg-[#313137]" />
                <div className="h-3 w-1/2 rounded-full bg-[#26262b]" />
                <div className="h-3 w-full rounded-full bg-[#242428]" />
                <div className="h-3 w-4/5 rounded-full bg-[#242428]" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] bg-[#101013] px-4 py-3">
                <div className="h-3 w-16 rounded-full bg-[#26262b]" />
                <div className="mt-2 h-5 w-20 rounded-full bg-[#2f2f34]" />
              </div>
              <div className="rounded-[20px] bg-[#101013] px-4 py-3">
                <div className="h-3 w-12 rounded-full bg-[#26262b]" />
                <div className="mt-2 h-5 w-16 rounded-full bg-[#2f2f34]" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`rounded-[22px] bg-[#232326] ${mediaClassName}`} />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-[#2b2b30]" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-[#26262b]" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-8 rounded-full bg-[#2a2a2f]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded-full bg-[#2b2b30]" />
                <div className="h-3 w-1/2 rounded-full bg-[#242428]" />
              </div>
            </div>
          </>
        )}
      </div>
    ))}
  </div>
);

const ExploreVideoCard: React.FC<{ video: PixeVideo }> = ({ video }) => {
  const [previewActive, setPreviewActive] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  const clearPreviewTimer = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handlePreviewEnter = () => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    clearPreviewTimer();
    hoverTimerRef.current = window.setTimeout(() => setPreviewActive(true), 300);
  };

  const handlePreviewLeave = () => {
    clearPreviewTimer();
    setPreviewActive(false);
  };

  useEffect(() => () => clearPreviewTimer(), []);

  return (
    <Link
      to={`/pixe/watch/${video.id}`}
      onMouseEnter={handlePreviewEnter}
      onMouseLeave={handlePreviewLeave}
      onFocus={handlePreviewEnter}
      onBlur={handlePreviewLeave}
      className="group block w-[208px] shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/20 hover:bg-white/[0.06] sm:w-[220px]"
    >
      <div className="relative h-[318px] overflow-hidden rounded-[22px] bg-black sm:h-[336px]">
        {previewActive ? (
          <PixeVideoSurface
            video={video}
            active
            muted
            autoPlay
            preload="metadata"
            showLoadingState={false}
            className="h-full w-full rounded-none"
            frameClassName="rounded-none"
            mediaClassName="object-cover"
          />
        ) : video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/40">No preview</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
        <div className="absolute bottom-3 left-3 rounded-full bg-black/72 px-3 py-1 text-[11px] font-semibold text-white">
          {formatCount(video.metrics.qualified_views)} views
        </div>
      </div>
      <div className="space-y-3 px-3.5 py-3.5">
        <div className="flex items-center gap-3">
          <img
            src={video.channel?.avatar_url || '/icons/urbanprime.svg'}
            alt={video.channel?.display_name || 'Creator'}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{video.channel?.display_name || 'Creator'}</p>
            <p className="truncate text-xs text-white/50">@{video.channel?.handle || 'pixe'}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-6 text-white">{video.title || 'Untitled clip'}</p>
      </div>
    </Link>
  );
};

const ExploreCreatorCard: React.FC<{ creator: PixeChannel }> = ({ creator }) => (
  <Link
    to={`/pixe/channel/${creator.handle}`}
    className="group block w-[296px] shrink-0 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition hover:border-white/18 hover:bg-white/[0.07]"
  >
    <div className="flex items-start gap-4">
      <img
        src={creator.avatar_url || '/icons/urbanprime.svg'}
        alt={creator.display_name}
        className="h-16 w-16 rounded-full border border-white/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          {creator.is_subscribed ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Following</span> : null}
        </div>
        <p className="mt-3 truncate text-lg font-semibold text-white">{creator.display_name}</p>
        <p className="truncate text-sm text-white/50">@{creator.handle}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/62">{creator.bio || 'Short-form creator channel on Pixe.'}</p>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Followers</p>
        <p className="mt-2 text-lg font-semibold text-white">{formatCount(creator.subscriber_count)}</p>
      </div>
      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Clips</p>
        <p className="mt-2 text-lg font-semibold text-white">{formatCount(creator.published_video_count || creator.video_count)}</p>
      </div>
    </div>
  </Link>
);

const ExploreProductCard: React.FC<{ product: PixeSearchProduct }> = ({ product }) => (
  <Link
    to={product.href}
    className="group block w-[244px] shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/20 hover:bg-white/[0.06]"
  >
    <div className="aspect-square overflow-hidden bg-black">
      <img src={product.image_url || '/icons/urbanprime.svg'} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
    </div>
    <div className="space-y-2 px-4 py-4">
      <div className="flex flex-wrap gap-2">
        {product.is_featured ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">Featured</span> : null}
        {product.is_verified ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Verified</span> : null}
      </div>
      <p className="line-clamp-2 text-sm font-semibold text-white">{product.title}</p>
      <p className="line-clamp-2 text-xs leading-5 text-white/55">{product.description || product.brand || 'Shop this product from Urban Prime.'}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{formatProductPrice(product)}</span>
        {product.brand ? <span className="truncate text-xs text-white/45">{product.brand}</span> : null}
      </div>
    </div>
  </Link>
);

const ExploreServiceCard: React.FC<{ service: Service }> = ({ service }) => (
  <Link
    to={`/service/${service.id}`}
    className="group block w-[284px] shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/20 hover:bg-white/[0.06]"
  >
    <div className="aspect-[4/3] overflow-hidden bg-black">
      {service.imageUrls?.[0] ? (
        <img src={service.imageUrls[0]} alt={service.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-white/40">No preview</div>
      )}
    </div>
    <div className="space-y-2 px-4 py-4">
      <div className="flex items-center gap-3">
        <img
          src={service.provider?.avatar || '/icons/urbanprime.svg'}
          alt={service.provider?.name || 'Provider'}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{service.provider?.name || 'Provider'}</p>
          <p className="truncate text-xs text-white/50">{service.category}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm font-semibold text-white">{service.title}</p>
      <p className="line-clamp-2 text-xs leading-5 text-white/55">{service.description || 'Professional service listing on Urban Prime.'}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{formatServicePrice(service)}</span>
        <span className="text-xs text-white/45">{Number(service.avgRating || 0).toFixed(1)} rating</span>
      </div>
    </div>
  </Link>
);

const PixeExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const cached = useMemo(() => readExploreCache(query), [query]);
  const [draftQuery, setDraftQuery] = useState(query);
  const [state, setState] = useState<PixeSearchResponse | null>(cached?.state || null);
  const [services, setServices] = useState<Service[]>(cached?.services || []);
  const [coreLoading, setCoreLoading] = useState(!cached?.state);
  const [servicesLoading, setServicesLoading] = useState(!cached?.services?.length);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    let servicesTimerId: number | null = null;

    const cachedPayload = readExploreCache(query);
    if (cachedPayload?.state) {
      setState(cachedPayload.state);
      setCoreLoading(false);
    } else {
      setState(null);
      setCoreLoading(true);
    }
    if (cachedPayload?.services) {
      setServices(cachedPayload.services);
      setServicesLoading(false);
    } else {
      setServices([]);
      setServicesLoading(true);
    }

    const loadCore = async () => {
      try {
        const searchPayload = await pixeService.search(query || undefined, 8);

        if (cancelled) return;

        setState(searchPayload);
        writeExploreCache(query, {
          state: searchPayload,
          services: cachedPayload?.services || [],
          cachedAt: Date.now()
        });
      } catch (error) {
        console.error('Unable to load Pixe explore:', error);
        if (!cancelled) {
          setState({
            query,
            creators: [],
            videos: [],
            products: [],
            topics: []
          });
        }
      } finally {
        if (!cancelled) setCoreLoading(false);
      }
    };

    const loadServices = async () => {
      servicesTimerId = window.setTimeout(async () => {
        try {
          const serviceRows = await serviceService.getServices().catch(() => []);
          if (cancelled) return;
          setServices(serviceRows);
          writeExploreCache(query, {
            state: readExploreCache(query)?.state || state || {
              query,
              creators: [],
              videos: [],
              products: [],
              topics: []
            },
            services: serviceRows,
            cachedAt: Date.now()
          });
        } catch (error) {
          console.error('Unable to load Pixe explore services:', error);
        } finally {
          if (!cancelled) setServicesLoading(false);
        }
      }, 120);
    };

    void loadCore();
    void loadServices();
    return () => {
      cancelled = true;
      if (servicesTimerId) window.clearTimeout(servicesTimerId);
    };
  }, [query]);

  const rankedCreators = useMemo(() => sortCreatorsByReach(state?.creators || []), [state?.creators]);

  const filteredServices = useMemo(
    () => services.filter((service) => matchesServiceQuery(service, query)).sort((left, right) => Number(right.avgRating || 0) - Number(left.avgRating || 0)),
    [query, services]
  );

  const hasResults = useMemo(
    () => Boolean((rankedCreators.length || 0) + (state?.videos.length || 0) + (state?.products.length || 0) + filteredServices.length),
    [filteredServices.length, rankedCreators.length, state?.products.length, state?.videos.length]
  );

  return (
    <div className="pixe-noir-shell">
      <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Pixe Explore</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {query ? `Results for "${query}"` : 'Discover clips, creators, products, and services'}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
            Browse the active Pixe network and move across content, creators, commerce, and services without leaving the surface.
          </p>

          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const nextQuery = draftQuery.trim();
              if (nextQuery) setSearchParams({ q: nextQuery });
              else setSearchParams({});
            }}
          >
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search creators, clips, products, or services"
              className="pixe-noir-input h-12 rounded-full px-5 text-sm outline-none focus:border-white/20"
            />
            <div className="flex gap-3">
              <button type="submit" className="min-w-[120px] rounded-full bg-white px-5 text-sm font-semibold text-black">
                Search
              </button>
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftQuery('');
                    setSearchParams({});
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/78"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </form>

          {state?.topics.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {state.topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    setDraftQuery(topic);
                    setSearchParams({ q: topic });
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/75"
                >
                  #{topic}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {coreLoading ? (
          <div className="mt-7 space-y-10">
            <section>
              <SectionHeader eyebrow="Pixe videos" title="Clips moving right now" to="/pixe" actionLabel="Explore more clips" />
              <ExploreRowSkeleton cardCount={4} itemClassName="w-[208px] sm:w-[220px]" mediaClassName="h-[318px] sm:h-[336px]" />
            </section>
            <section>
              <SectionHeader eyebrow="Creators" title="Creators with the strongest reach" to="/pixe/creators" actionLabel="Explore more creators" />
              <ExploreRowSkeleton cardCount={3} itemClassName="w-[296px]" kind="creator" />
            </section>
            <section>
              <SectionHeader eyebrow="Products" title="Products moving through Pixe" to="/browse" actionLabel="Explore more products" />
              <ExploreRowSkeleton cardCount={4} itemClassName="w-[244px]" mediaClassName="aspect-square" />
            </section>
            <section>
              <SectionHeader eyebrow="Services" title="Providers connected to the marketplace" to="/services/marketplace" actionLabel="Explore more services" />
              <ExploreRowSkeleton cardCount={3} itemClassName="w-[284px]" mediaClassName="aspect-[4/3]" />
            </section>
          </div>
        ) : !state || (!hasResults && !servicesLoading) ? (
          <div className="flex min-h-[44vh] items-center">
            <PixeEmptyState
              title={query ? 'No matching results' : 'Explore is warming up'}
              message={query
                ? 'Try a broader creator name, hashtag, product term, or service keyword.'
                : 'Publish clips, tag products, and creator activity will start filling this explore surface.'}
              animation={query ? 'noResults' : 'nothing'}
              primaryAction={{ label: query ? 'Back to feed' : 'Open studio', to: query ? '/pixe' : '/pixe-studio/upload' }}
              secondaryAction={{ label: query ? 'Clear search' : 'Browse feed', to: '/pixe' }}
              className="py-10"
            />
          </div>
        ) : (
          <div className="mt-7 space-y-10">
            {state.videos.length > 0 ? (
              <section>
                <SectionHeader
                  eyebrow="Pixe videos"
                  title={query ? 'Matching clips' : 'Clips moving right now'}
                  to="/pixe"
                  actionLabel="Explore more clips"
                />
                <div className={horizontalRowClassName}>
                  {state.videos.map((video) => (
                    <ExploreVideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            ) : null}

            {rankedCreators.length > 0 ? (
              <section>
                <SectionHeader
                  eyebrow="Creators"
                  title={query ? 'Matching creator profiles' : 'Creators with the strongest reach'}
                  to={query ? `/pixe/creators?q=${encodeURIComponent(query)}` : '/pixe/creators'}
                  actionLabel="Explore more creators"
                />
                <div className={horizontalRowClassName}>
                  {rankedCreators.slice(0, 8).map((creator) => (
                    <ExploreCreatorCard key={creator.id} creator={creator} />
                  ))}
                </div>
              </section>
            ) : null}

            {state.products.length > 0 ? (
              <section>
                <SectionHeader
                  eyebrow="Products"
                  title={query ? 'Products linked to your search' : 'Products moving through Pixe'}
                  to="/browse"
                  actionLabel="Explore more products"
                />
                <div className={horizontalRowClassName}>
                  {state.products.map((product) => (
                    <ExploreProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : null}

            {filteredServices.length > 0 ? (
              <section>
                <SectionHeader
                  eyebrow="Services"
                  title={query ? 'Service listings matching your search' : 'Providers connected to the marketplace'}
                  to="/services/marketplace"
                  actionLabel="Explore more services"
                />
                <div className={horizontalRowClassName}>
                  {filteredServices.slice(0, 8).map((service) => (
                    <ExploreServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </section>
            ) : servicesLoading ? (
              <section>
                <SectionHeader
                  eyebrow="Services"
                  title={query ? 'Service listings matching your search' : 'Providers connected to the marketplace'}
                  to="/services/marketplace"
                  actionLabel="Explore more services"
                />
                <ExploreRowSkeleton cardCount={3} itemClassName="w-[284px]" mediaClassName="aspect-[4/3]" />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default PixeExplorePage;
