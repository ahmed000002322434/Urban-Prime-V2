import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PixeCreatorGridSkeleton } from '../../components/pixe/PixeSkeleton';
import PixeEmptyState from '../../components/pixe/PixeEmptyState';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../components/pixe/pixeHeaderConfig';
import { pixeService, type PixeChannel } from '../../services/pixeService';

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe/creators', label: 'Creators', end: true },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

type CreatorFilter = 'all' | 'following';
type CreatorSort = 'followers' | 'clips' | 'name';

const filterOptions: Array<{ key: CreatorFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'following', label: 'Following' }
];

const sortCreators = (creators: PixeChannel[], sort: CreatorSort) => {
  const rows = [...creators];
  rows.sort((left, right) => {
    if (sort === 'name') return left.display_name.localeCompare(right.display_name);
    if (sort === 'clips') {
      const clipDelta = Number(right.published_video_count || right.video_count || 0) - Number(left.published_video_count || left.video_count || 0);
      if (clipDelta !== 0) return clipDelta;
      return Number(right.subscriber_count || 0) - Number(left.subscriber_count || 0);
    }
    const followerDelta = Number(right.subscriber_count || 0) - Number(left.subscriber_count || 0);
    if (followerDelta !== 0) return followerDelta;
    return Number(right.published_video_count || right.video_count || 0) - Number(left.published_video_count || left.video_count || 0);
  });
  return rows;
};

const CreatorHubCard: React.FC<{ creator: PixeChannel }> = ({ creator }) => (
  <Link
    to={`/pixe/channel/${creator.handle}`}
    className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition hover:border-white/18 hover:bg-white/[0.07]"
  >
    <div className="flex items-start gap-4">
      <img
        src={creator.avatar_url || '/icons/urbanprime.svg'}
        alt={creator.display_name}
        className="h-[4.5rem] w-[4.5rem] rounded-full border border-white/10 object-cover shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          {creator.is_subscribed ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Following</span> : null}
        </div>
        <p className="mt-3 truncate text-xl font-semibold text-white">{creator.display_name}</p>
        <p className="truncate text-sm text-white/48">@{creator.handle}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">{creator.bio || 'Short-form creator channel on Pixe.'}</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Followers</p>
        <p className="mt-2 text-2xl font-semibold text-white">{formatCount(creator.subscriber_count)}</p>
      </div>
      <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Clips</p>
        <p className="mt-2 text-2xl font-semibold text-white">{formatCount(creator.published_video_count || creator.video_count)}</p>
      </div>
    </div>
  </Link>
);

const PixeCreatorsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [draftQuery, setDraftQuery] = useState(query);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<PixeChannel[]>([]);
  const [filter, setFilter] = useState<CreatorFilter>('all');
  const [sort, setSort] = useState<CreatorSort>('followers');

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.search(query || undefined, 48);
        if (cancelled) return;
        setCreators(payload.creators || []);
      } catch (error) {
        console.error('Unable to load Pixe creators hub:', error);
        if (!cancelled) setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const queryFiltered = creators.filter((creator) => {
      if (!normalizedQuery) return true;
      return [
        creator.display_name,
        creator.handle,
        creator.bio
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });

    const filtered = queryFiltered.filter((creator) => {
      if (filter === 'following') return Boolean(creator.is_subscribed);
      return true;
    });

    return sortCreators(filtered, sort);
  }, [creators, filter, query, sort]);

  return (
    <div className="pixe-noir-shell">
      <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Creator Hub</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                {query ? `Creators matching "${query}"` : 'Creator profiles ranked by reach'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
                Browse every visible creator profile in one place and sort by follower reach, clip volume, or name.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/74">
              {visibleCreators.length} creators
            </div>
          </div>

          <form
            className="mt-5 flex flex-col gap-3 lg:flex-row"
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
              placeholder="Search creator name, handle, or bio"
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

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === option.key
                      ? 'bg-white text-black'
                      : 'border border-white/10 bg-white/[0.04] text-white/74 hover:border-white/18 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as CreatorSort)}
                className="bg-transparent text-sm font-semibold text-white outline-none"
              >
                <option value="followers" className="bg-zinc-950 text-white">Top followers</option>
                <option value="clips" className="bg-zinc-950 text-white">Most clips</option>
                <option value="name" className="bg-zinc-950 text-white">A-Z</option>
              </select>
            </label>
          </div>
        </header>

        {loading ? (
          <PixeCreatorGridSkeleton />
        ) : visibleCreators.length === 0 ? (
          <div className="mt-6 flex min-h-[44vh] items-center">
            <PixeEmptyState
              title={query ? 'No creators found' : 'No creators available'}
              message={query ? 'Try a broader creator name or handle.' : 'Creator profiles will appear here as channels go live on Pixe.'}
              animation={query ? 'noResults' : 'nothing'}
              primaryAction={{ label: 'Back to explore', to: '/pixe/explore' }}
              secondaryAction={{ label: 'Open feed', to: '/pixe' }}
              className="py-10"
            />
          </div>
        ) : (
          <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCreators.map((creator) => (
              <CreatorHubCard key={creator.id} creator={creator} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default PixeCreatorsPage;
