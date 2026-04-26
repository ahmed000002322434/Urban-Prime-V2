import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PixeEmptyState from '../../components/pixe/PixeEmptyState';
import { PixeGridPageSkeleton } from '../../components/pixe/PixeSkeleton';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../components/pixe/pixeHeaderConfig';
import { useAuth } from '../../hooks/useAuth';
import { pixeService, type PixeChannelResponse, type PixeVideo } from '../../services/pixeService';

type ChannelTab = 'home' | 'clips' | 'about';

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Recently';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const sectionTitleClassName = 'text-xl font-semibold text-white sm:text-2xl';

const PixeClipCard: React.FC<{ video: PixeVideo }> = ({ video }) => (
  <Link
    to={`/pixe/watch/${video.id}`}
    className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] transition hover:border-white/16 hover:bg-white/[0.06]"
  >
    <div className="relative aspect-[4/5] overflow-hidden bg-black">
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title || 'Pixe clip'}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-white/35">Preview unavailable</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/10 to-transparent" />
    </div>

    <div className="space-y-2.5 p-4">
      <h2 className="line-clamp-2 text-base font-semibold text-white">{video.title || 'Untitled clip'}</h2>
      <p className="text-xs text-white/56">
        {formatCount(video.metrics.qualified_views)} views
        <span className="mx-1.5 text-white/24">•</span>
        {formatDate(video.published_at || video.created_at)}
      </p>
    </div>
  </Link>
);

const PixeChannelPage: React.FC = () => {
  const { handle = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<PixeChannelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [activeTab, setActiveTab] = useState<ChannelTab>('home');
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const next = await pixeService.getChannel(handle);
        if (!cancelled) setState(next);
      } catch (error) {
        console.error('Unable to load Pixe channel page:', error);
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    const handleScroll = () => {
      setCompactHeader(window.scrollY > 88);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const requireAuth = () => navigate('/auth', { state: { from: `/pixe/channel/${handle}` } });
  const channel = state?.channel ?? null;
  const videos = state?.videos ?? [];
  const isOwner = Boolean(user?.id && channel?.owner_firebase_uid && channel.owner_firebase_uid === user.id);
  const publishedVideoCount = channel?.published_video_count || channel?.video_count || 0;
  const latestVideos = useMemo(
    () =>
      [...videos].sort(
        (left, right) =>
          new Date(right.published_at || right.created_at).getTime() - new Date(left.published_at || left.created_at).getTime()
      ),
    [videos]
  );
  const latestPreview = latestVideos.slice(0, 8);
  const popularVideos = useMemo(() => {
    const latestPreviewIds = new Set(latestPreview.map((video) => video.id));
    const score = (video: PixeVideo) =>
      video.metrics.qualified_views * 1.2 +
      video.metrics.likes * 8 +
      video.metrics.comments * 10 +
      video.metrics.saves * 12 +
      video.metrics.shares * 14;

    const ranked = [...videos].sort((left, right) => score(right) - score(left));
    const filtered = ranked.filter((video) => !latestPreviewIds.has(video.id));
    return (filtered.length > 0 ? filtered : ranked).slice(0, 4);
  }, [latestPreview, videos]);
  const statCards = channel
    ? [
      { label: 'Followers', value: formatCount(channel.subscriber_count) },
      { label: 'Total clips', value: formatCount(channel.video_count) },
      { label: 'Published clips', value: formatCount(publishedVideoCount) },
      { label: 'Handle', value: `@${channel.handle}` }
    ]
    : [];

  if (loading) {
    return (
      <div className="pixe-noir-shell min-h-[100svh] px-4 pb-10 pt-24 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PixeGridPageSkeleton mediaClassName="aspect-[4/5]" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="pixe-noir-shell flex min-h-[100svh] flex-col text-white">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <PixeEmptyState
            title="Channel unavailable"
            message="This channel is unavailable or has no public clips right now. Open the feed or search for other creators in Explore."
            animation="noFileFound"
            primaryAction={{ label: 'Back to feed', to: '/pixe' }}
            secondaryAction={{ label: 'Open Explore', to: '/pixe/explore' }}
          />
        </div>
      </div>
    );
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    if (isOwner) return;

    try {
      setActionPending(true);
      const next = await pixeService.subscribe(channel.id);
      setState((current) => (
        current
          ? {
            ...current,
            channel: {
              ...current.channel,
              is_subscribed: next.subscribed,
              subscriber_count: next.subscriber_count
            }
          }
          : current
      ));
    } finally {
      setActionPending(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharePending(true);
      const shareUrl = `${window.location.origin}/pixe/channel/${channel.handle}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Unable to copy channel link:', error);
    } finally {
      window.setTimeout(() => setSharePending(false), 900);
    }
  };

  const renderMainContent = () => {
    if (videos.length === 0) {
      return (
        <PixeEmptyState
          title="No published clips yet"
          message="This creator has not published any public Pixe clips yet. Check back later or discover active creators from Explore."
          animation="nothing"
          primaryAction={{ label: 'Open Explore', to: '/pixe/explore' }}
          secondaryAction={{ label: 'Back to feed', to: '/pixe' }}
          className="py-3"
        />
      );
    }

    if (activeTab === 'clips') {
      return (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Library</p>
              <h2 className={`${sectionTitleClassName} mt-2`}>All clips</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
              {formatCount(latestVideos.length)} clips
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {latestVideos.map((video) => (
              <PixeClipCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === 'about') {
      return (
        <section className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">About</p>
            <h2 className={`${sectionTitleClassName} mt-2`}>Channel details</h2>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="text-sm leading-7 text-white/70 sm:text-base">
              {channel.bio || 'This creator has not shared a channel bio yet.'}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/22 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    return (
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Latest</p>
              <h2 className={`${sectionTitleClassName} mt-2`}>Latest clips</h2>
            </div>
            {latestVideos.length > latestPreview.length ? (
              <button
                type="button"
                onClick={() => setActiveTab('clips')}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78"
              >
                View all
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {latestPreview.map((video) => (
              <PixeClipCard key={video.id} video={video} />
            ))}
          </div>
        </section>

        {popularVideos.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Popular</p>
                <h2 className={`${sectionTitleClassName} mt-2`}>Popular clips</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('clips')}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78"
              >
                View all
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {popularVideos.map((video) => (
                <PixeClipCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const actionButtons = isOwner ? (
    <>
      <Link to="/pixe-studio/channel" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
        Edit channel
      </Link>
      <Link to="/pixe-studio/analytics" className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/82">
        Analytics
      </Link>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={() => void handleFollow()}
        disabled={actionPending}
        className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
          channel.is_subscribed
            ? 'border border-white/10 bg-white/[0.05] text-white/82'
            : 'bg-white text-black'
        } disabled:opacity-60`}
      >
        {actionPending ? 'Working...' : channel.is_subscribed ? 'Following' : 'Follow'}
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/82"
      >
        {sharePending ? 'Copied' : 'Share'}
      </button>
    </>
  );

  return (
    <div className="pixe-noir-shell min-h-[100svh] text-white">
      <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <section
          className={`rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_28px_80px_rgba(0,0,0,0.28)] transition-all ${
            compactHeader ? 'p-5 sm:p-5' : 'p-5 sm:p-6 lg:p-7'
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={channel.avatar_url || '/icons/urbanprime.svg'}
                  alt={channel.display_name}
                  className={`rounded-full border border-white/12 object-cover shadow-[0_18px_44px_rgba(0,0,0,0.32)] transition-all ${
                    compactHeader ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]' : 'h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20'
                  }`}
                />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">{channel.display_name}</h1>
                  <p className="mt-1 text-sm text-white/54 sm:text-base">@{channel.handle}</p>
                  <p className="mt-3 max-w-3xl line-clamp-2 text-sm leading-6 text-white/70 sm:text-base">
                    {channel.bio || 'This creator has not shared a channel bio yet.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Followers</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCount(channel.subscriber_count)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Total clips</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCount(channel.video_count)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Published clips</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCount(publishedVideoCount)}</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 self-start lg:pl-6">
              {actionButtons}
            </div>
          </div>
        </section>

        <div className="sticky top-[4.75rem] z-30 mt-4 rounded-[24px] border border-white/10 bg-black/58 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-1 px-3 py-2">
              {([
                { key: 'home', label: 'Home' },
                { key: 'clips', label: 'Clips' },
                { key: 'about', label: 'About' }
              ] as Array<{ key: ChannelTab; label: string }>).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
                      : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-8">
            {renderMainContent()}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-[8.6rem] lg:self-start">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Channel snapshot</p>
              <div className="mt-4 space-y-3">
                {statCards.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-black/22 px-4 py-3">
                    <span className="text-sm font-semibold text-white/76">{item.label}</span>
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">About</p>
              <p className="mt-3 text-sm leading-6 text-white/68">
                {channel.bio || 'This creator has not shared a channel bio yet.'}
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default PixeChannelPage;
