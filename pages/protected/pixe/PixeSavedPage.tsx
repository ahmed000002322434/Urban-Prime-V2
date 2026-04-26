import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeGridPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeTopHeader from '../../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../../components/pixe/pixeHeaderConfig';
import { formatCount, formatDuration } from '../../../components/pixe/PixePublicSurface';
import { pixeService, type PixeVideo } from '../../../services/pixeService';

const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const headerLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

type SavedViewMode = 'cards' | 'rows';

const viewToggleButtonClassName = 'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition';

const HoverPreviewFrame: React.FC<{
  video: PixeVideo;
  aspectClassName: string;
  compact?: boolean;
}> = ({ video, aspectClassName, compact = false }) => {
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`group relative overflow-hidden bg-black ${aspectClassName}`}
      onMouseEnter={() => {
        if (!video.preview_url) return;
        if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = window.setTimeout(() => setShowPreview(true), 300);
      }}
      onMouseLeave={() => {
        if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
        setShowPreview(false);
      }}
    >
      {showPreview && video.preview_url ? (
        <img
          src={video.preview_url}
          alt={video.title || 'Saved Pixe preview'}
          className="h-full w-full object-cover"
        />
      ) : video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title || 'Saved Pixe clip'}
          className={`h-full w-full object-cover transition duration-500 ${compact ? 'group-hover:scale-[1.01]' : 'group-hover:scale-[1.03]'}`}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-black/10" />
      <div className="absolute bottom-3 left-3 rounded-full bg-black/72 px-3 py-1 text-[11px] font-semibold text-white">
        {formatDuration(video.duration_ms)}
      </div>
      <div className="absolute right-3 top-3 rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[11px] font-semibold text-white/82">
        @{video.channel?.handle || 'pixe'}
      </div>
    </div>
  );
};

const ViewModeToggle: React.FC<{
  value: SavedViewMode;
  onChange: (mode: SavedViewMode) => void;
}> = ({ value, onChange }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1">
    <button
      type="button"
      onClick={() => onChange('cards')}
      className={`${viewToggleButtonClassName} ${value === 'cards' ? 'bg-white text-black' : 'text-white/72 hover:text-white'}`}
      aria-label="Cards view"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    </button>
    <button
      type="button"
      onClick={() => onChange('rows')}
      className={`${viewToggleButtonClassName} ${value === 'rows' ? 'bg-white text-black' : 'text-white/72 hover:text-white'}`}
      aria-label="Rows view"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h14" />
      </svg>
    </button>
  </div>
);

const SavedVideoCard: React.FC<{
  video: PixeVideo;
  removing: boolean;
  onRemove: (video: PixeVideo) => Promise<void>;
  viewMode: SavedViewMode;
}> = ({ video, removing, onRemove, viewMode }) => (
  <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_26px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    {viewMode === 'cards' ? (
      <>
        <Link to={`/pixe/watch/${video.id}`} className="block">
          <HoverPreviewFrame video={video} aspectClassName="aspect-[9/16]" />
        </Link>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Link to={`/pixe/watch/${video.id}`} className="block text-lg font-semibold text-white transition hover:text-white/88" style={clampTextStyle(2)}>
              {video.title || 'Untitled clip'}
            </Link>
            {video.caption ? (
              <p className="text-sm leading-6 text-white/62" style={clampTextStyle(3)}>
                {video.caption}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
              {formatCount(video.metrics.qualified_views)} views
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
              {formatCount(video.metrics.likes)} likes
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
              {formatCount(video.metrics.comments)} comments
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/pixe/watch/${video.id}`}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Watch
            </Link>
            <button
              type="button"
              onClick={() => void onRemove(video)}
              disabled={removing}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/82 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removing ? 'Removing' : 'Remove'}
            </button>
          </div>
        </div>
      </>
    ) : (
      <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
        <Link to={`/pixe/watch/${video.id}`} className="block">
          <HoverPreviewFrame video={video} aspectClassName="aspect-[9/13] md:h-full md:aspect-auto" compact />
        </Link>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Saved</p>
            <Link to={`/pixe/watch/${video.id}`} className="mt-2 block text-xl font-semibold text-white transition hover:text-white/88">
              {video.title || 'Untitled clip'}
            </Link>
            {video.caption ? (
              <p className="mt-2 text-sm leading-6 text-white/58" style={clampTextStyle(3)}>
                {video.caption}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(video.metrics.qualified_views)} views</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(video.metrics.likes)} likes</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(video.metrics.comments)} comments</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/pixe/watch/${video.id}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Watch
            </Link>
            <button
              type="button"
              onClick={() => void onRemove(video)}
              disabled={removing}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/82 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removing ? 'Removing' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    )}
  </article>
);

const PixeSavedPage: React.FC = () => {
  const [items, setItems] = useState<PixeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [removingVideoId, setRemovingVideoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SavedViewMode>(() => {
    if (typeof window === 'undefined') return 'rows';
    const saved = window.localStorage.getItem('pixe-saved-view-mode');
    return saved === 'cards' ? 'cards' : 'rows';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pixe-saved-view-mode', viewMode);
  }, [viewMode]);

  const loadSaved = useCallback(async (cursor?: string | null) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const response = await pixeService.getSavedVideos(cursor || null, 18);
      setItems((current) => (cursor ? [...current, ...response.items] : response.items));
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (loadError) {
      console.error('Unable to load saved Pixe videos:', loadError);
      setError('Unable to load saved videos right now.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const handleRemove = useCallback(async (video: PixeVideo) => {
    setRemovingVideoId(video.id);
    try {
      const next = await pixeService.saveVideo(video.id);
      if (!next.saved) {
        setItems((current) => current.filter((entry) => entry.id !== video.id));
      }
    } catch (removeError) {
      console.error('Unable to remove saved Pixe video:', removeError);
    } finally {
      setRemovingVideoId(null);
    }
  }, []);

  const itemCountLabel = useMemo(() => {
    if (items.length === 1) return '1 saved clip';
    return `${items.length} saved clips`;
  }, [items.length]);

  return (
    <div className="pixe-noir-shell min-h-[100svh] text-white">
      <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={headerLinks} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-3 rounded-[32px] border border-white/10 bg-white/[0.035] px-5 py-5 shadow-[0_30px_110px_rgba(0,0,0,0.28)] sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/46">Saved</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Your saved Pixe clips</h1>
              <p className="mt-2 text-sm text-white/58">Keep the clips you want to revisit in one place.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/76">
                {itemCountLabel}
              </div>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </section>

        {loading ? (
          <PixeGridPageSkeleton mediaClassName="aspect-[9/16]" />
        ) : error ? (
          <PixeEmptyState
            title="Saved clips are unavailable"
            message={error}
            primaryAction={{ label: 'Back to feed', to: '/pixe' }}
            secondaryAction={{ label: 'Open Explore', to: '/pixe/explore' }}
          />
        ) : items.length === 0 ? (
          <PixeEmptyState
            title="No saved clips yet"
            message="Save clips from the feed or watch page and they will appear here."
            primaryAction={{ label: 'Open feed', to: '/pixe' }}
            secondaryAction={{ label: 'Explore creators', to: '/pixe/explore' }}
          />
        ) : (
          <>
            <section className={viewMode === 'cards' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-5'}>
              {items.map((video) => (
                <SavedVideoCard
                  key={video.id}
                  video={video}
                  removing={removingVideoId === video.id}
                  onRemove={handleRemove}
                  viewMode={viewMode}
                />
              ))}
            </section>

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => void loadSaved(nextCursor)}
                  disabled={loadingMore}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? 'Loading' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default PixeSavedPage;
