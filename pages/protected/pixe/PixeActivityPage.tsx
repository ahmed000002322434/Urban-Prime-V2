import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeTopHeader from '../../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../../components/pixe/pixeHeaderConfig';
import { formatCount, formatDuration } from '../../../components/pixe/PixePublicSurface';
import {
  pixeService,
  type PixeActivityCommentEntry,
  type PixeActivityLikeEntry,
  type PixeActivityOverviewResponse,
  type PixeActivityRange,
  type PixeActivityWatchedEntry
} from '../../../services/pixeService';

const headerLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const activityRangeOptions: Array<{ key: PixeActivityRange; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'All' }
];

const cardClassName = 'rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';
const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});
type HistoryViewMode = 'cards' | 'rows';
const viewToggleButtonClassName = 'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition';

const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return 'Now';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const formatHours = (value: number) => `${(value / 3_600_000).toFixed(value >= 3_600_000 ? 1 : 2)}h`;

const activityOverviewAccents = [
  'from-sky-500/18 to-cyan-500/8',
  'from-violet-500/18 to-fuchsia-500/8',
  'from-rose-500/16 to-pink-500/8',
  'from-emerald-500/16 to-teal-500/8',
  'from-amber-500/16 to-orange-500/8'
];

const chartTooltipStyle = {
  background: 'rgba(10,10,12,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  boxShadow: '0 22px 42px rgba(0,0,0,0.28)'
};

const mergeUniqueByKey = <T,>(incoming: T[], existing: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>();
  const merged: T[] = [];

  [...incoming, ...existing].forEach((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
};

const getWatchedEntryKey = (entry: PixeActivityWatchedEntry) =>
  entry.video?.id || `${entry.first_watched_at || 'missing'}-${entry.last_watched_at || 'missing'}`;

const ResumeEdgeMarker: React.FC<{ ratio: number }> = ({ ratio }) => {
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return (
    <div className="absolute bottom-4 right-3 top-4 flex w-[4px] overflow-hidden rounded-full bg-white/14 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div
        className="mt-auto w-full rounded-full bg-white transition-all duration-500"
        style={{ height: `${Math.max(safeRatio > 0 ? 8 : 0, safeRatio * 100)}%` }}
      />
    </div>
  );
};

const HistoryPreviewFrame: React.FC<{
  entry: PixeActivityWatchedEntry;
  aspectClassName: string;
  compact?: boolean;
}> = ({ entry, aspectClassName, compact = false }) => {
  const video = entry.video;
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!video) {
    return <div className={`relative bg-black ${aspectClassName}`} />;
  }

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
          alt={video.title || 'Pixe history preview'}
          className="h-full w-full object-cover"
        />
      ) : video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title || 'Pixe history clip'}
          className={`h-full w-full object-cover transition duration-500 ${compact ? 'group-hover:scale-[1.01]' : 'group-hover:scale-[1.03]'}`}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/12" />
      <div className="absolute bottom-3 left-3 rounded-full bg-black/72 px-3 py-1 text-[11px] font-semibold text-white">
        {formatDuration(video.duration_ms)}
      </div>
      <div className="absolute right-8 top-3 rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[11px] font-semibold text-white/82">
        @{video.channel?.handle || 'pixe'}
      </div>
      <ResumeEdgeMarker ratio={entry.resume_ratio} />
    </div>
  );
};

const ViewModeToggle: React.FC<{
  value: HistoryViewMode;
  onChange: (mode: HistoryViewMode) => void;
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

const ActivityOverviewCard: React.FC<{
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  to: string;
  accentClassName?: string;
}> = ({ eyebrow, title, value, detail, to, accentClassName = 'from-white/10 to-transparent' }) => (
  <Link to={to} className={`${cardClassName} block bg-gradient-to-br ${accentClassName} p-5 transition hover:border-white/18 hover:bg-white/[0.06]`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{eyebrow}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    <p className="mt-2 text-sm font-semibold text-white/84">{title}</p>
    <p className="mt-2 text-sm leading-6 text-white/58">{detail}</p>
  </Link>
);

const RangePills: React.FC<{
  value: PixeActivityRange;
  onChange: (next: PixeActivityRange) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {activityRangeOptions.map((option) => (
      <button
        key={option.key}
        type="button"
        onClick={() => onChange(option.key)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          value === option.key
            ? 'bg-white text-black'
            : 'border border-white/10 bg-white/[0.04] text-white/74 hover:border-white/18 hover:text-white'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const WatchedCard: React.FC<{ entry: PixeActivityWatchedEntry }> = ({ entry }) => {
  if (!entry.video) {
    return (
      <article className={`${cardClassName} p-5`}>
        <p className="text-sm font-semibold text-white">Video unavailable</p>
        <p className="mt-2 text-sm text-white/58">This clip was watched before it became unavailable.</p>
      </article>
    );
  }

  return (
    <article className={`${cardClassName} overflow-hidden`}>
      <Link to={`/pixe/watch/${entry.video.id}`} className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative aspect-[9/13] bg-black md:aspect-auto md:h-full">
          {entry.video.thumbnail_url ? <img src={entry.video.thumbnail_url} alt={entry.video.title || 'Pixe clip'} className="h-full w-full object-cover" /> : null}
          <div className="absolute bottom-3 left-3 rounded-full bg-black/72 px-3 py-1 text-[11px] font-semibold text-white">
            {formatDuration(entry.video.duration_ms)}
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Watched</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{entry.video.title || 'Untitled clip'}</h2>
            <p className="mt-2 text-sm text-white/56">@{entry.video.channel?.handle || 'pixe'} · {formatRelativeTime(entry.last_watched_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.view_count)} watched</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatHours(entry.watch_time_ms)}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.completed_count)} completed</span>
          </div>
        </div>
      </Link>
    </article>
  );
};

const WatchedHistoryCard: React.FC<{
  entry: PixeActivityWatchedEntry;
  viewMode: HistoryViewMode;
}> = ({ entry, viewMode }) => {
  if (!entry.video) {
    return (
      <article className={`${cardClassName} p-5`}>
        <p className="text-sm font-semibold text-white">Video unavailable</p>
        <p className="mt-2 text-sm text-white/58">This clip was watched before it became unavailable.</p>
      </article>
    );
  }

  return (
    <article className={`${cardClassName} overflow-hidden`}>
      {viewMode === 'cards' ? (
        <>
          <Link to={`/pixe/watch/${entry.video.id}`} className="block">
            <HistoryPreviewFrame entry={entry} aspectClassName="aspect-[9/16]" />
          </Link>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Watched</p>
              <Link to={`/pixe/watch/${entry.video.id}`} className="block text-lg font-semibold text-white transition hover:text-white/88" style={clampTextStyle(2)}>
                {entry.video.title || 'Untitled clip'}
              </Link>
              {entry.video.caption ? (
                <p className="text-sm leading-6 text-white/62" style={clampTextStyle(3)}>
                  {entry.video.caption}
                </p>
              ) : null}
              <p className="text-sm text-white/52">{formatRelativeTime(entry.last_watched_at)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
                {formatCount(entry.view_count)} watched
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
                {formatHours(entry.watch_time_ms)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
                {Math.round(Math.max(0, Math.min(1, entry.resume_ratio)) * 100)}% left
              </span>
            </div>

            <Link
              to={`/pixe/watch/${entry.video.id}`}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Resume
            </Link>
          </div>
        </>
      ) : (
        <Link to={`/pixe/watch/${entry.video.id}`} className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
          <HistoryPreviewFrame entry={entry} aspectClassName="aspect-[9/13] md:h-full md:aspect-auto" compact />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Watched</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{entry.video.title || 'Untitled clip'}</h2>
              <p className="mt-2 text-sm text-white/56">@{entry.video.channel?.handle || 'pixe'} · {formatRelativeTime(entry.last_watched_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.view_count)} watched</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatHours(entry.watch_time_ms)}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.completed_count)} completed</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{Math.round(Math.max(0, Math.min(1, entry.resume_ratio)) * 100)}% left</span>
            </div>
          </div>
        </Link>
      )}
    </article>
  );
};

const LikeCard: React.FC<{ entry: PixeActivityLikeEntry }> = ({ entry }) => {
  if (!entry.video) {
    return (
      <article className={`${cardClassName} p-5`}>
        <p className="text-sm font-semibold text-white">Liked clip unavailable</p>
      </article>
    );
  }

  return (
    <article className={`${cardClassName} overflow-hidden`}>
      <Link to={`/pixe/watch/${entry.video.id}`} className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative aspect-[9/13] bg-black md:aspect-auto md:h-full">
          {entry.video.thumbnail_url ? <img src={entry.video.thumbnail_url} alt={entry.video.title || 'Liked Pixe clip'} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Liked</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{entry.video.title || 'Untitled clip'}</h2>
            <p className="mt-2 text-sm text-white/56">@{entry.video.channel?.handle || 'pixe'} · {formatRelativeTime(entry.liked_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.video.metrics.likes)} likes</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatCount(entry.video.metrics.qualified_views)} views</span>
          </div>
        </div>
      </Link>
    </article>
  );
};

const CommentCard: React.FC<{ entry: PixeActivityCommentEntry }> = ({ entry }) => (
  <article className={`${cardClassName} overflow-hidden`}>
    <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
      <Link to={entry.video ? `/pixe/watch/${entry.video.id}` : '/pixe'} className="relative aspect-[9/13] bg-black md:aspect-auto md:h-full">
        {entry.video?.thumbnail_url ? <img src={entry.video.thumbnail_url} alt={entry.video.title || 'Commented Pixe clip'} className="h-full w-full object-cover" /> : null}
      </Link>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Comment</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link to={entry.video ? `/pixe/watch/${entry.video.id}` : '/pixe'} className="text-xl font-semibold text-white transition hover:text-white/86">
              {entry.video?.title || 'Unavailable clip'}
            </Link>
            <span className="text-sm text-white/44">{formatRelativeTime(entry.created_at)}</span>
          </div>
        </div>
        <p className="rounded-[22px] border border-white/10 bg-black/24 px-4 py-3 text-sm leading-6 text-white/80">{entry.body}</p>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">@{entry.video?.channel?.handle || 'pixe'}</span>
          {entry.parent_comment_id ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Reply</span> : null}
        </div>
      </div>
    </div>
  </article>
);

const PixeActivityPage: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = useMemo(() => {
    if (location.pathname.endsWith('/watched')) return 'watched';
    if (location.pathname.endsWith('/likes')) return 'likes';
    if (location.pathname.endsWith('/comments')) return 'comments';
    return 'overview';
  }, [location.pathname]);
  const range = (searchParams.get('range') || '30d') as PixeActivityRange;

  const [overview, setOverview] = useState<PixeActivityOverviewResponse | null>(null);
  const [watched, setWatched] = useState<PixeActivityWatchedEntry[]>([]);
  const [likes, setLikes] = useState<PixeActivityLikeEntry[]>([]);
  const [comments, setComments] = useState<PixeActivityCommentEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [savedLibraryCount, setSavedLibraryCount] = useState<number | null>(null);
  const [watchedViewMode, setWatchedViewMode] = useState<HistoryViewMode>(() => {
    if (typeof window === 'undefined') return 'cards';
    const saved = window.localStorage.getItem('pixe-watched-view-mode');
    return saved === 'rows' ? 'rows' : 'cards';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pixe-watched-view-mode', watchedViewMode);
  }, [watchedViewMode]);

  const setRange = (nextRange: PixeActivityRange) => {
    const next = new URLSearchParams(searchParams);
    next.set('range', nextRange);
    setSearchParams(next);
  };

  const loadActivity = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      if (section === 'overview') {
        const payload = await pixeService.getActivityOverview(range);
        setOverview(payload);
        try {
          const savedPayload = await pixeService.getSavedVideos(null, 1);
          setSavedLibraryCount(savedPayload.totalCount ?? payload.summary.saved_videos ?? 0);
        } catch (savedCountError) {
          console.error('Unable to refresh saved Pixe count:', savedCountError);
          setSavedLibraryCount(payload.summary.saved_videos ?? 0);
        }
        setWatched([]);
        setLikes([]);
        setComments([]);
        setNextCursor(null);
        setHasMore(false);
        return;
      }

      if (section === 'watched') {
        const payload = await pixeService.getActivityWatched(range, null, 18);
        setWatched((current) => (
          silent
            ? mergeUniqueByKey(payload.items, current, getWatchedEntryKey)
            : payload.items
        ));
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
        setLikes([]);
        setComments([]);
        return;
      }

      if (section === 'likes') {
        const payload = await pixeService.getActivityLikes(range, null, 18);
        setLikes(payload.items);
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
        setWatched([]);
        setComments([]);
        return;
      }

      const payload = await pixeService.getActivityComments(range, null, 18);
      setComments(payload.items);
      setNextCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
      setWatched([]);
      setLikes([]);
    } catch (activityError) {
      console.error('Unable to load Pixe activity:', activityError);
      if (!silent) setError('Unable to load activity right now.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [range, section]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (loading) return undefined;

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (loadingMore) return;
      void loadActivity({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadActivity, loading, loadingMore]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      if (section === 'watched') {
        const payload = await pixeService.getActivityWatched(range, nextCursor, 18);
        setWatched((current) => [...current, ...payload.items]);
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
      } else if (section === 'likes') {
        const payload = await pixeService.getActivityLikes(range, nextCursor, 18);
        setLikes((current) => [...current, ...payload.items]);
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
      } else if (section === 'comments') {
        const payload = await pixeService.getActivityComments(range, nextCursor, 18);
        setComments((current) => [...current, ...payload.items]);
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
      }
    } catch (loadMoreError) {
      console.error('Unable to load more Pixe activity:', loadMoreError);
    } finally {
      setLoadingMore(false);
    }
  };

  const dailyChartData = useMemo(
    () => (overview?.daily || []).map((row) => ({
      day: new Date(row.bucket_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      watchMinutes: Number((row.watch_time_ms / 60_000).toFixed(1)),
      watched: row.watched_count,
      likes: row.liked_count,
      comments: row.commented_count,
      saves: row.saved_count,
      engagement: row.liked_count + row.commented_count + row.saved_count
    })),
    [overview?.daily]
  );

  const activeDays = useMemo(
    () => dailyChartData.filter((row) => row.watched > 0 || row.watchMinutes > 0 || row.engagement > 0).length,
    [dailyChartData]
  );

  const peakWatchDay = useMemo(
    () => dailyChartData.reduce<typeof dailyChartData[number] | null>((best, row) => {
      if (!best || row.watchMinutes > best.watchMinutes) return row;
      return best;
    }, null),
    [dailyChartData]
  );

  const averageDailyViews = useMemo(
    () => (activeDays > 0 ? Number(((overview?.summary.total_watched || 0) / activeDays).toFixed(1)) : 0),
    [activeDays, overview?.summary.total_watched]
  );

  const engagementShareData = useMemo(() => (
    overview
      ? [
        { label: 'Likes', value: overview.summary.liked_videos, fill: '#f472b6' },
        { label: 'Comments', value: overview.summary.comments_made, fill: '#34d399' },
        { label: 'Saved', value: savedLibraryCount ?? overview.summary.saved_videos, fill: '#60a5fa' },
        { label: 'Completed', value: overview.summary.completed_views, fill: '#f59e0b' }
      ].filter((entry) => entry.value > 0)
      : []
  ), [overview, savedLibraryCount]);

  const engagementShareTotal = useMemo(
    () => engagementShareData.reduce((sum, item) => sum + item.value, 0),
    [engagementShareData]
  );

  const showInitialLoader = loading && (
    section === 'overview'
      ? !overview
      : section === 'watched'
        ? watched.length === 0
        : section === 'likes'
          ? likes.length === 0
          : comments.length === 0
  );

  const pageTitle = section === 'overview'
    ? 'Your Pixe activity'
    : section === 'watched'
      ? 'Watch history'
      : section === 'likes'
        ? 'Liked Pixe'
        : 'Your comments';

  return (
    <div className="pixe-noir-shell min-h-[100svh] text-white">
      <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={headerLinks} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className={`${cardClassName} flex flex-col gap-5 px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Activity</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{pageTitle}</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <RangePills value={range} onChange={setRange} />
              {section === 'watched' ? <ViewModeToggle value={watchedViewMode} onChange={setWatchedViewMode} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/pixe/activity" className={`rounded-full px-4 py-2 text-sm font-semibold transition ${section === 'overview' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/74'}`}>Overview</Link>
            <Link to={`/pixe/activity/watched?range=${range}`} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${section === 'watched' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/74'}`}>Watch history</Link>
            <Link to={`/pixe/activity/likes?range=${range}`} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${section === 'likes' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/74'}`}>Likes</Link>
            <Link to={`/pixe/activity/comments?range=${range}`} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${section === 'comments' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/74'}`}>Comments</Link>
          </div>
        </section>

        {showInitialLoader ? (
          <PixeChartPageSkeleton />
        ) : error ? (
          <PixeEmptyState
            title="Activity is unavailable"
            message={error}
            primaryAction={{ label: 'Back to feed', to: '/pixe' }}
            secondaryAction={{ label: 'Open saved', to: '/pixe/saved' }}
          />
        ) : section === 'overview' ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <ActivityOverviewCard
                eyebrow="History"
                title={`${formatCount(overview?.summary.total_watched || 0)} total plays`}
                value={formatCount(overview?.summary.unique_videos_watched || 0)}
                detail="Unique clips watched since your activity started."
                to={`/pixe/activity/watched?range=${range}`}
                accentClassName={activityOverviewAccents[0]}
              />
              <ActivityOverviewCard
                eyebrow="Watch time"
                title="Total time spent watching"
                value={formatHours(overview?.summary.watch_time_ms || 0)}
                detail={`${formatCount(overview?.summary.completed_views || 0)} completed views recorded.`}
                to={`/pixe/activity/watched?range=${range}`}
                accentClassName={activityOverviewAccents[1]}
              />
              <ActivityOverviewCard
                eyebrow="Likes"
                title="Current liked Pixe"
                value={formatCount(overview?.summary.liked_videos || 0)}
                detail="Every clip still saved in your liked activity."
                to={`/pixe/activity/likes?range=${range}`}
                accentClassName={activityOverviewAccents[2]}
              />
              <ActivityOverviewCard
                eyebrow="Saved"
                title="Saved to your library"
                value={formatCount((savedLibraryCount ?? overview?.summary.saved_videos) || 0)}
                detail="Open the Pixe clips you saved."
                to="/pixe/saved"
                accentClassName={activityOverviewAccents[3]}
              />
              <ActivityOverviewCard
                eyebrow="Comments"
                title="Comments you've posted"
                value={formatCount(overview?.summary.comments_made || 0)}
                detail="Jump into the clips where you left your comments."
                to={`/pixe/activity/comments?range=${range}`}
                accentClassName={activityOverviewAccents[4]}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className={`${cardClassName} p-5`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Pixe numbers</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Pixe watched per day</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/24 px-4 py-2 text-sm font-semibold text-white/78">
                    {formatCount(overview?.summary.total_watched || 0)} watched
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="day" scale="point" padding={{ left: 0, right: 0 }} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="watched"
                        stroke="#fb7185"
                        strokeWidth={3}
                        dot={{ r: 3.5, fill: '#ffffff', stroke: '#fb7185', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: '#ffffff', stroke: '#fb7185', strokeWidth: 2.5 }}
                        isAnimationActive
                        animationDuration={420}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Total</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatCount(overview?.summary.total_watched || 0)}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Average / day</p>
                    <p className="mt-2 text-lg font-semibold text-white">{averageDailyViews}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Peak day</p>
                    <p className="mt-2 text-lg font-semibold text-white">{peakWatchDay?.day || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className={`${cardClassName} p-5`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Watch time</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Watch minutes by day</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/24 px-4 py-2 text-sm font-semibold text-white/78">
                    {activeDays > 0 ? `${activeDays} active days` : 'No activity yet'}
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="day" scale="point" padding={{ left: 0, right: 0 }} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="watchMinutes"
                        stroke="#818cf8"
                        strokeWidth={3}
                        dot={{ r: 3.5, fill: '#ffffff', stroke: '#818cf8', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: '#ffffff', stroke: '#818cf8', strokeWidth: 2.5 }}
                        isAnimationActive
                        animationDuration={420}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Hours</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatHours(overview?.summary.watch_time_ms || 0)}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Active days</p>
                    <p className="mt-2 text-lg font-semibold text-white">{activeDays}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Peak day</p>
                    <p className="mt-2 text-lg font-semibold text-white">{peakWatchDay?.day || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className={`${cardClassName} p-5`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Engagement</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Likes, comments, and saves by day</h2>
                  </div>
                  <Link to={`/pixe/activity/comments?range=${range}`} className="rounded-full border border-white/10 bg-black/24 px-4 py-2 text-sm font-semibold text-white/78">
                    Open comments
                  </Link>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pixeLikesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f472b6" stopOpacity={0.44} />
                          <stop offset="100%" stopColor="#f472b6" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="pixeCommentsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="pixeSavesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.36} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="day" scale="point" padding={{ left: 0, right: 0 }} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                      <Area type="monotone" dataKey="likes" stackId="engagement" stroke="#f472b6" fill="url(#pixeLikesFill)" strokeWidth={2.2} isAnimationActive animationDuration={420} />
                      <Area type="monotone" dataKey="comments" stackId="engagement" stroke="#34d399" fill="url(#pixeCommentsFill)" strokeWidth={2.2} isAnimationActive animationDuration={420} />
                      <Area type="monotone" dataKey="saves" stackId="engagement" stroke="#60a5fa" fill="url(#pixeSavesFill)" strokeWidth={2.2} isAnimationActive animationDuration={420} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${cardClassName} p-5`}>
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Mix</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Your interaction split</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                  <div className="relative h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={engagementShareData.length > 0 ? engagementShareData : [{ label: 'No activity', value: 1, fill: 'rgba(255,255,255,0.12)' }]}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={engagementShareData.length > 0 ? 4 : 0}
                          stroke="rgba(10,10,12,0.55)"
                          strokeWidth={2}
                          isAnimationActive
                          animationDuration={420}
                        >
                          {(engagementShareData.length > 0 ? engagementShareData : [{ label: 'No activity', value: 1, fill: 'rgba(255,255,255,0.12)' }]).map((entry) => (
                            <Cell key={entry.label} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Total</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{engagementShareTotal}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(engagementShareData.length > 0 ? engagementShareData : [{ label: 'No activity yet', value: 0, fill: 'rgba(255,255,255,0.12)' }]).map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-sm font-semibold text-white">{entry.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-sm font-semibold text-white/76">{entry.value}</span>
                          <span className="mt-0.5 block text-[11px] font-medium text-white/42">
                            {engagementShareTotal > 0 ? `${Math.round((entry.value / engagementShareTotal) * 100)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${cardClassName} p-5 xl:col-span-2`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Interest overview</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">How your interest shifted across Pixe</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/24 px-4 py-2 text-sm font-semibold text-white/78">
                    {engagementShareTotal} total signals
                  </div>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="day" scale="point" padding={{ left: 0, right: 0 }} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                      <Line type="monotone" dataKey="watched" stroke="#fb7185" strokeWidth={2.4} dot={false} isAnimationActive animationDuration={420} />
                      <Line type="monotone" dataKey="watchMinutes" stroke="#818cf8" strokeWidth={2.4} dot={false} isAnimationActive animationDuration={420} />
                      <Line type="monotone" dataKey="likes" stroke="#f472b6" strokeWidth={2.2} dot={false} isAnimationActive animationDuration={420} />
                      <Line type="monotone" dataKey="comments" stroke="#34d399" strokeWidth={2.2} dot={false} isAnimationActive animationDuration={420} />
                      <Line type="monotone" dataKey="saves" stroke="#60a5fa" strokeWidth={2.2} dot={false} isAnimationActive animationDuration={420} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        ) : section === 'watched' ? (
          watched.length > 0 ? (
            <section className={watchedViewMode === 'cards' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'space-y-5'}>
              {watched.map((entry, index) => (
                <WatchedHistoryCard
                  key={`${entry.video?.id || 'missing'}-${entry.last_watched_at || entry.first_watched_at || index}`}
                  entry={entry}
                  viewMode={watchedViewMode}
                />
              ))}
            </section>
          ) : (
            <PixeEmptyState title="No watch history yet" message="Watch clips from the feed or watch page and the history will build here." primaryAction={{ label: 'Open feed', to: '/pixe' }} />
          )
        ) : section === 'likes' ? (
          likes.length > 0 ? (
            <section className="space-y-5">
              {likes.map((entry, index) => <LikeCard key={`${entry.video?.id || 'missing'}-${entry.liked_at || index}`} entry={entry} />)}
            </section>
          ) : (
            <PixeEmptyState title="No liked Pixe yet" message="Like clips from feed or watch and they will show up here." primaryAction={{ label: 'Open explore', to: '/pixe/explore' }} />
          )
        ) : comments.length > 0 ? (
          <section className="space-y-5">
            {comments.map((entry) => <CommentCard key={entry.id} entry={entry} />)}
          </section>
        ) : (
          <PixeEmptyState title="No comment activity yet" message="Comments you post on Pixe clips will appear here." primaryAction={{ label: 'Watch Pixe', to: '/pixe' }} />
        )}

        {section !== 'overview' && hasMore ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? 'Loading' : 'Load more'}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default PixeActivityPage;
