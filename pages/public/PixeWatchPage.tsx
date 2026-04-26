import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PixeEmptyState from '../../components/pixe/PixeEmptyState';
import {
  formatCount,
  formatDuration,
  PixeCommentThread,
  PixeContextRail,
  type PixeContextRailTab,
  PixeProductList,
  PixeQueueList,
  PixeVideoSurface,
  type PixeWatchQueueItem
} from '../../components/pixe/PixePublicSurface';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';
import { pixeLibraryHeaderLink } from '../../components/pixe/pixeHeaderConfig';
import { PixeMiniRailSkeleton, PixeWatchPageSkeleton } from '../../components/pixe/PixeSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { pixeService, type PixeComment, type PixeProductTag, type PixeVideo } from '../../services/pixeService';

const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const getViewerSessionId = () => {
  const storageKey = 'pixe_viewer_session_v1';
  if (typeof window === 'undefined') return 'server-session';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `session-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
};

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

type WatchPlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

type WatchSession = {
  activationKey: string;
  startCurrentTime: number;
  maxProgressRatio: number;
  lastActivitySyncTime: number;
};

const OverlayControlButton: React.FC<{
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, active = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-11 w-11 items-center justify-center rounded-full border text-white backdrop-blur-xl transition ${
      active
        ? 'border-white/24 bg-white/16 shadow-[0_18px_42px_rgba(0,0,0,0.3)]'
        : 'border-white/12 bg-black/42 hover:border-white/18 hover:bg-white/[0.08]'
    }`}
    aria-label={label}
  >
    {children}
  </button>
);

const OverlayMetricButton: React.FC<{
  label: string;
  value: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}> = ({ label, value, onClick, active = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-2 rounded-full px-1 py-1 text-white transition ${
      active ? 'scale-[1.03]' : 'opacity-95 hover:opacity-100'
    }`}
    aria-label={label}
  >
    <span className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.28)] ${
      active
        ? 'border-white/24 bg-white/16'
        : 'border-white/14 bg-black/42'
    }`}>
      {children}
    </span>
    <span className="text-[11px] font-semibold tracking-[0.08em] text-white/84">{value}</span>
  </button>
);

const MobileCommentSheet: React.FC<{
  open: boolean;
  video: PixeVideo;
  comments: PixeComment[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
  viewerUserId?: string | null;
  onCommentLike?: (comment: PixeComment) => Promise<void> | void;
  onCommentReport?: (comment: PixeComment) => Promise<void> | void;
  onCommentDelete?: (comment: PixeComment) => Promise<void> | void;
  commentLikePendingId?: string | null;
  commentReportPendingId?: string | null;
  commentDeletePendingId?: string | null;
}> = ({
  open,
  video,
  comments,
  loading,
  onClose,
  onSubmit,
  viewerUserId = null,
  onCommentLike,
  onCommentReport,
  onCommentDelete,
  commentLikePendingId = null,
  commentReportPendingId = null,
  commentDeletePendingId = null
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/68 backdrop-blur-sm lg:hidden">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close comments" />
      <div className="absolute inset-x-0 bottom-0 max-h-[76vh] rounded-t-[32px] border border-white/10 bg-zinc-950 text-white shadow-2xl">
        <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-white/16" />
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Comments</p>
              <p className="mt-1 text-xs text-white/52" style={clampTextStyle(1)}>
                {video.title || 'Untitled clip'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/68">
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[calc(76vh-4.75rem)] overflow-y-auto px-5 py-4">
          <PixeCommentThread
            video={video}
            comments={comments}
            loading={loading}
            onSubmit={onSubmit}
            viewerUserId={viewerUserId}
            onCommentLike={onCommentLike}
            onCommentReport={onCommentReport}
            onCommentDelete={onCommentDelete}
            commentLikePendingId={commentLikePendingId}
            commentReportPendingId={commentReportPendingId}
            commentDeletePendingId={commentDeletePendingId}
          />
        </div>
      </div>
    </div>
  );
};

const PixeWatchPage: React.FC = () => {
  const { videoId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const viewerSessionId = useMemo(() => getViewerSessionId(), []);
  const [video, setVideo] = useState<PixeVideo | null>(null);
  const [comments, setComments] = useState<PixeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [queue, setQueue] = useState<PixeWatchQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [desktopRailTab, setDesktopRailTab] = useState<PixeContextRailTab>('queue');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentLikePendingId, setCommentLikePendingId] = useState<string | null>(null);
  const [commentReportPendingId, setCommentReportPendingId] = useState<string | null>(null);
  const [commentDeletePendingId, setCommentDeletePendingId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));
  const [playbackState, setPlaybackState] = useState<WatchPlaybackState>({
    isPlaying: true,
    currentTime: 0,
    duration: 0
  });
  const playerRef = useRef<any | null>(null);
  const currentVideoRef = useRef<PixeVideo | null>(null);
  const watchSessionRef = useRef<WatchSession | null>(null);
  const watchProgressPendingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getVideo(videoId);
        if (cancelled) return;
        setVideo(payload);
        setComments(payload.comments || []);
      } catch (error) {
        console.error('Unable to load Pixe watch page:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    currentVideoRef.current = video;
  }, [video]);

  useEffect(() => {
    if (!video) return;
    watchSessionRef.current = null;
    setPlaybackState({
      isPlaying: playerRef.current ? !playerRef.current.paused : true,
      currentTime: Number(playerRef.current?.currentTime || 0),
      duration: Math.max(Number(playerRef.current?.duration || video.duration_ms / 1000 || 0), 0)
    });
  }, [video]);

  const ensureWatchSession = useCallback((targetVideo: PixeVideo | null, playerNode?: any | null) => {
    const player = playerNode || playerRef.current;
    if (!targetVideo || !player || watchSessionRef.current) return;
    const durationSeconds = Math.max(Number(player.duration || targetVideo.duration_ms / 1000 || 1), 1);
    const currentTime = Number(player.currentTime || 0);
    watchSessionRef.current = {
      activationKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startCurrentTime: currentTime,
      maxProgressRatio: currentTime / durationSeconds,
      lastActivitySyncTime: currentTime
    };
  }, []);

  const syncWatchProgress = useCallback(async (targetVideo: PixeVideo | null = currentVideoRef.current) => {
    if (!targetVideo || !user?.id || watchProgressPendingRef.current) return;
    const player = playerRef.current;
    const session = watchSessionRef.current;
    if (!player || !session) return;

    const currentTime = Number(player.currentTime || 0);
    const durationSeconds = Math.max(Number(player.duration || targetVideo.duration_ms / 1000 || 1), 1);
    const progressRatio = Math.max(session.maxProgressRatio, currentTime / durationSeconds);
    const lastSyncTime = session.lastActivitySyncTime;
    const watchTimeMs = Math.max(0, Math.round((currentTime - lastSyncTime) * 1000));
    if (watchTimeMs < 700) return;

    watchProgressPendingRef.current = true;
    try {
      await pixeService.recordWatchProgress({
        video_id: targetVideo.id,
        viewer_session_id: viewerSessionId,
        watch_time_ms: watchTimeMs,
        progress_ratio: progressRatio,
        completed: progressRatio >= 0.99,
        occurred_at: new Date().toISOString()
      });
      if (watchSessionRef.current === session) {
        watchSessionRef.current = {
          ...session,
          maxProgressRatio: progressRatio,
          lastActivitySyncTime: currentTime
        };
      }
    } catch (error) {
      console.error('Unable to sync Pixe watch progress:', error);
    } finally {
      watchProgressPendingRef.current = false;
    }
  }, [user?.id, viewerSessionId]);

  const flushWatchSession = useCallback(async (targetVideo: PixeVideo | null = currentVideoRef.current) => {
    const player = playerRef.current;
    const session = watchSessionRef.current;
    if (!targetVideo || !player || !session) return;

    const currentTime = Number(player.currentTime || 0);
    const durationSeconds = Math.max(Number(player.duration || targetVideo.duration_ms / 1000 || 1), 1);
    const highestRatio = Math.max(session.maxProgressRatio, currentTime / durationSeconds);
    const watchTimeMs = Math.max(0, Math.round((currentTime - session.startCurrentTime) * 1000));
    const baseId = `${session.activationKey}-${targetVideo.id}`;
    const occurredAt = new Date().toISOString();
    const events: Array<{
      event_id: string;
      video_id: string;
      event_name: string;
      viewer_session_id: string;
      occurred_at: string;
      watch_time_ms?: number;
    }> = [
      {
        event_id: `${baseId}-impression`,
        video_id: targetVideo.id,
        event_name: 'impression',
        viewer_session_id: viewerSessionId,
        occurred_at: occurredAt,
        ...(watchTimeMs > 0 && highestRatio < 0.05 ? { watch_time_ms: watchTimeMs } : {})
      }
    ];

    if (watchTimeMs >= 3000 || highestRatio >= 0.05) {
      events.push({
        event_id: `${baseId}-3s`,
        video_id: targetVideo.id,
        event_name: 'view_3s',
        viewer_session_id: viewerSessionId,
        occurred_at: occurredAt,
        ...(watchTimeMs > 0 && highestRatio < 0.5 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.5) {
      events.push({
        event_id: `${baseId}-50`,
        video_id: targetVideo.id,
        event_name: 'view_50',
        viewer_session_id: viewerSessionId,
        occurred_at: occurredAt,
        ...(watchTimeMs > 0 && highestRatio < 0.95 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.95) {
      events.push({
        event_id: `${baseId}-95`,
        video_id: targetVideo.id,
        event_name: 'view_95',
        viewer_session_id: viewerSessionId,
        occurred_at: occurredAt,
        ...(watchTimeMs > 0 && highestRatio < 0.99 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.99) {
      events.push({
        event_id: `${baseId}-complete`,
        video_id: targetVideo.id,
        event_name: 'complete',
        viewer_session_id: viewerSessionId,
        occurred_at: occurredAt,
        ...(watchTimeMs > 0 ? { watch_time_ms: watchTimeMs } : {})
      });
    }

    watchSessionRef.current = null;

    try {
      await pixeService.sendEvents(events);
    } catch (error) {
      console.error('Unable to send Pixe watch playback events:', error);
    }
  }, [viewerSessionId]);

  useEffect(() => {
    return () => {
      void syncWatchProgress();
      void flushWatchSession();
    };
  }, [flushWatchSession, syncWatchProgress, videoId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      playerRef.current?.pause?.();
      void syncWatchProgress();
      void flushWatchSession();
    };

    const handlePageHide = () => {
      void syncWatchProgress();
      void flushWatchSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [flushWatchSession, syncWatchProgress]);

  useEffect(() => {
    if (!video || !user?.id) return undefined;

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const player = playerRef.current;
      if (!player || player.paused) return;
      void syncWatchProgress(video);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [syncWatchProgress, user?.id, video]);

  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      if (!video) {
        setQueue([]);
        return;
      }

      try {
        setQueueLoading(true);
        const feed = await pixeService.getFeed('for_you', null, 8);
        let nextItems = feed.items.filter((item) => item.id !== video.id);

        if (nextItems.length < 6 && video.channel?.handle) {
          const channelPayload = await pixeService.getChannel(video.channel.handle);
          nextItems = [...nextItems, ...channelPayload.videos.filter((item) => item.id !== video.id)];
        }

        const deduped = nextItems.filter((item, index, collection) => (
          collection.findIndex((candidate) => candidate.id === item.id) === index
        ));

        if (!cancelled) {
          setQueue(deduped.slice(0, 8));
        }
      } catch (error) {
        console.error('Unable to load Pixe watch queue:', error);
        if (!cancelled) {
          setQueue([]);
        }
      } finally {
        if (!cancelled) {
          setQueueLoading(false);
        }
      }
    };

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [video?.id, video?.channel?.handle]);

  const requireAuth = () => {
    navigate('/auth', { state: { from: `/pixe/watch/${videoId}` } });
  };

  const reloadComments = async () => {
    if (!video) return;
    try {
      setCommentsLoading(true);
      const result = await pixeService.getComments(video.id);
      setComments(result);
    } catch (error) {
      console.error('Unable to load Pixe comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!video?.channel) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.subscribe(video.channel.id);
    setVideo((current) => (
      current
        ? {
          ...current,
          channel: current.channel
            ? {
              ...current.channel,
              is_subscribed: next.subscribed,
              subscriber_count: next.subscriber_count
            }
            : current.channel
        }
        : current
    ));
  };

  const handleLike = async () => {
    if (!video) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.likeVideo(video.id);
    setVideo((current) => (
      current
        ? {
          ...current,
          viewer_state: { ...current.viewer_state, liked: next.liked },
          metrics: { ...current.metrics, likes: next.like_count }
        }
        : current
    ));
  };

  const handleSave = async () => {
    if (!video) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.saveVideo(video.id);
    setVideo((current) => (
      current
        ? {
          ...current,
          viewer_state: { ...current.viewer_state, saved: next.saved },
          metrics: { ...current.metrics, saves: next.save_count }
        }
        : current
    ));
  };

  const handleShare = async () => {
    if (!video) return;
    const shareUrl = `${window.location.origin}/pixe/watch/${video.id}`;
    if (navigator.share) {
      await navigator.share({
        title: video.title || 'Pixe clip',
        text: video.caption,
        url: shareUrl
      }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }

    const next = await pixeService.shareVideo(video.id);
    setVideo((current) => (
      current
        ? {
          ...current,
          metrics: { ...current.metrics, shares: next.share_count }
        }
        : current
    ));
  };

  const handleTogglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      void player.play?.().catch(() => undefined);
    } else {
      player.pause?.();
    }
  };

  const handleProductClick = async (tag: PixeProductTag) => {
    if (!video) return;
    await pixeService.sendEvents([
      {
        event_id: `${video.id}-${tag.id}-${Date.now()}`,
        video_id: video.id,
        event_name: 'product_click',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString()
      }
    ]);
  };

  const handleCommentSubmit = async (body: string) => {
    if (!video) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const nextComment = await pixeService.addComment(video.id, body);
    setComments((current) => [nextComment, ...current]);
    setVideo((current) => (
      current
        ? {
          ...current,
          metrics: { ...current.metrics, comments: current.metrics.comments + 1 }
        }
        : current
    ));
  };

  const handleCommentLike = async (comment: PixeComment) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    setCommentLikePendingId(comment.id);
    try {
      const next = await pixeService.likeComment(comment.id);
      setComments((current) => current.map((entry) => (
        entry.id === comment.id
          ? {
            ...entry,
            metrics: { ...entry.metrics, likes: next.like_count },
            viewer_state: { ...entry.viewer_state, liked: next.liked }
          }
          : entry
      )));
    } finally {
      setCommentLikePendingId(null);
    }
  };

  const handleCommentReport = async (comment: PixeComment) => {
    if (!video) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    if (comment.viewer_state?.reported) return;

    setCommentReportPendingId(comment.id);
    try {
      await pixeService.reportComment(comment.id);
      await reloadComments();
    } finally {
      setCommentReportPendingId(null);
    }
  };

  const handleCommentDelete = async (comment: PixeComment) => {
    if (!video || !comment.user || comment.user.id !== user?.id) return;

    setCommentDeletePendingId(comment.id);
    try {
      await pixeService.updateComment(comment.id, { status: 'deleted' });
      setComments((current) => current.filter((entry) => entry.id !== comment.id));
      setVideo((current) => (
        current
          ? {
            ...current,
            metrics: { ...current.metrics, comments: Math.max(0, current.metrics.comments - 1) }
          }
          : current
      ));
    } finally {
      setCommentDeletePendingId(null);
    }
  };

  const openCommentsPanel = async () => {
    if (comments.length === 0) {
      await reloadComments();
    }

    if (isDesktop) {
      setDesktopRailTab('comments');
      return;
    }

    setCommentsOpen(true);
  };

  const previewComments = useMemo(() => comments.slice(0, 3), [comments]);

  if (loading) {
    return <PixeWatchPageSkeleton />;
  }

  if (!video) {
    return (
      <div className="pixe-noir-shell flex min-h-[100svh] flex-col text-white">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <PixeEmptyState
            title="Video unavailable"
            message="This clip is unavailable, private, or still processing. Go back to the feed or explore other creators and products."
            animation="noFileFound"
            primaryAction={{ label: 'Back to feed', to: '/pixe' }}
            secondaryAction={{ label: 'Open Explore', to: '/pixe/explore' }}
          />
        </div>
      </div>
    );
  }

  const playbackDuration = Math.max(playbackState.duration, video.duration_ms / 1000);
  const playbackProgress = playbackDuration > 0 ? Math.min(playbackState.currentTime / playbackDuration, 1) : 0;

  return (
    <>
      <div className="pixe-noir-shell relative min-h-[100svh] text-white lg:h-[100svh] lg:overflow-hidden">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} overlay containerClassName="mx-auto max-w-[112rem]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden h-28 bg-gradient-to-b from-black/82 via-black/22 to-transparent lg:block" />

        <div className="mx-auto max-w-[112rem] px-4 pb-8 pt-[4.85rem] sm:px-6 sm:pt-[5.05rem] lg:h-full lg:px-8 lg:pb-0 lg:pt-[5.35rem]">
          <div className="space-y-5">
            <section className="relative lg:grid lg:h-[calc(100svh-6.75rem)] lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
              <div className="relative flex min-w-0 items-center justify-center">
                <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[74%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_rgba(255,255,255,0.06)_32%,_transparent_72%)] opacity-80 blur-3xl" />
                <div className="pixe-noir-panel-strong overflow-hidden rounded-[34px] p-3 sm:p-4 lg:rounded-[38px] lg:bg-transparent lg:p-0 lg:shadow-none">
                  <PixeVideoSurface
                    video={video}
                    active
                    muted={isMuted}
                    autoPlay
                    preload="auto"
                    className="w-full"
                    frameClassName="aspect-[9/16] h-[min(79svh,calc(100svh-11.75rem))] w-full max-w-[min(100%,24rem)] shadow-[0_36px_84px_rgba(0,0,0,0.52)] sm:max-w-[min(100%,27rem)] md:max-w-[min(100%,30rem)] lg:h-[calc(100svh-8.45rem)] lg:max-h-[52rem] lg:max-w-[32rem] xl:max-w-[34rem]"
                    playerRef={(node) => {
                      playerRef.current = node;
                    }}
                    onTimeUpdate={(event: any) => {
                      const player = event.currentTarget;
                      ensureWatchSession(video, player);
                      const session = watchSessionRef.current;
                      if (session) {
                        const currentTime = Number(player.currentTime || 0);
                        const duration = Math.max(Number(player.duration || video.duration_ms / 1000 || 1), 1);
                        session.maxProgressRatio = Math.max(session.maxProgressRatio, currentTime / duration);
                      }
                      setPlaybackState({
                        isPlaying: !player.paused,
                        currentTime: Number(player.currentTime || 0),
                        duration: Math.max(Number(player.duration || video.duration_ms / 1000 || 0), 0)
                      });
                    }}
                    onPlay={() => {
                      const player = playerRef.current;
                      ensureWatchSession(video, player);
                      setPlaybackState({
                        isPlaying: true,
                        currentTime: Number(player?.currentTime || 0),
                        duration: Math.max(Number(player?.duration || video.duration_ms / 1000 || 0), 0)
                      });
                    }}
                    onPause={() => {
                      const player = playerRef.current;
                      setPlaybackState({
                        isPlaying: false,
                        currentTime: Number(player?.currentTime || 0),
                        duration: Math.max(Number(player?.duration || video.duration_ms / 1000 || 0), 0)
                      });
                      void syncWatchProgress(video);
                      void flushWatchSession(video);
                    }}
                    overlay={(
                      <div className="flex h-full flex-col justify-between p-3 sm:p-4 lg:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex max-w-[70%] flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-black/42 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-white/72 backdrop-blur-md">
                              Pixe
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/42 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-white/72 backdrop-blur-md">
                              {formatCount(video.metrics.qualified_views)} views
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <OverlayControlButton
                              label={playbackState.isPlaying ? 'Pause clip' : 'Play clip'}
                              onClick={handleTogglePlayback}
                              active={playbackState.isPlaying}
                            >
                              {playbackState.isPlaying ? (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                                  <rect x="6" y="5" width="4" height="14" rx="1.2" />
                                  <rect x="14" y="5" width="4" height="14" rx="1.2" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                                  <path d="M8 5.8v12.4a1 1 0 0 0 1.55.83l9.26-6.2a1 1 0 0 0 0-1.66L9.55 4.97A1 1 0 0 0 8 5.8Z" />
                                </svg>
                              )}
                            </OverlayControlButton>
                            <OverlayControlButton
                              label={isMuted ? 'Unmute clip' : 'Mute clip'}
                              onClick={() => setIsMuted((current) => !current)}
                              active={!isMuted}
                            >
                              {isMuted ? (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                  <path d="M5 10h4l5-4v12l-5-4H5Z" />
                                  <path d="m17 9 4 6" />
                                  <path d="m21 9-4 6" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                  <path d="M5 10h4l5-4v12l-5-4H5Z" />
                                  <path d="M18 9a4.5 4.5 0 0 1 0 6" />
                                  <path d="M20.5 6.5a8 8 0 0 1 0 11" />
                                </svg>
                              )}
                            </OverlayControlButton>
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          <div className="max-w-[calc(100%-5.6rem)] flex-1 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,9,9,0.26),rgba(9,9,9,0.62))] px-4 py-4 backdrop-blur-xl shadow-[0_24px_52px_rgba(0,0,0,0.34)] sm:max-w-[calc(100%-6rem)]">
                            <div className="flex items-start justify-between gap-3">
                              <Link to={video.channel ? `/pixe/channel/${video.channel.handle}` : '/pixe'} className="flex min-w-0 items-center gap-3">
                                <img
                                  src={video.channel?.avatar_url || '/icons/urbanprime.svg'}
                                  alt={video.channel?.display_name || 'Creator'}
                                  className="h-10 w-10 rounded-full border border-white/16 object-cover shadow-[0_14px_34px_rgba(0,0,0,0.3)]"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">{video.channel?.display_name || 'Creator'}</p>
                                  <p className="truncate text-xs text-white/58">@{video.channel?.handle || 'pixe'}</p>
                                </div>
                              </Link>

                              <div className="flex items-center gap-2">
                                <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/72 sm:inline-flex">
                                  {formatDuration(video.duration_ms)}
                                </span>
                                {video.channel ? (
                                  <button
                                    type="button"
                                    className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/16"
                                    onClick={handleSubscribe}
                                  >
                                    {video.channel.is_subscribed ? 'Following' : 'Follow'}
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <p className="mt-3 text-base font-semibold text-white sm:text-[1.05rem]" style={clampTextStyle(2)}>
                              {video.title || 'Untitled clip'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/76" style={clampTextStyle(isDesktop ? 3 : 4)}>
                              {video.caption || 'No caption added yet.'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/72">
                                {video.metrics.completion_rate}% completion
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/72 sm:hidden">
                                {formatDuration(video.duration_ms)}
                              </span>
                              {video.hashtags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/72">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 space-y-2">
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-white transition-[width] duration-200"
                                  style={{ width: `${Math.max(playbackProgress, 0.02) * 100}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.08em] text-white/56">
                                <span>{formatDuration(Math.round(playbackState.currentTime * 1000))}</span>
                                <span>{formatDuration(Math.round(playbackDuration * 1000))}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-3">
                            <OverlayMetricButton label="Like" value={formatCount(video.metrics.likes)} active={video.viewer_state.liked} onClick={() => void handleLike()}>
                              <svg viewBox="0 0 24 24" className={`h-6 w-6 ${video.viewer_state.liked ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                                <path d="M12 21s-7-4.35-9.5-8.28C.57 9.93 2.11 5.5 6.3 5.5c2.3 0 3.7 1.29 4.54 2.45.52.72 1.3.72 1.83 0C13.99 6.79 15.39 5.5 17.7 5.5c4.19 0 5.73 4.43 3.8 7.22C19 16.65 12 21 12 21Z" />
                              </svg>
                            </OverlayMetricButton>
                            <OverlayMetricButton label="Comments" value={formatCount(video.metrics.comments)} onClick={() => void openCommentsPanel()}>
                              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                              </svg>
                            </OverlayMetricButton>
                            <OverlayMetricButton label="Save" value={formatCount(video.metrics.saves)} active={video.viewer_state.saved} onClick={() => void handleSave()}>
                              <svg viewBox="0 0 24 24" className={`h-6 w-6 ${video.viewer_state.saved ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                              </svg>
                            </OverlayMetricButton>
                            <OverlayMetricButton label="Share" value={formatCount(video.metrics.shares)} onClick={() => void handleShare()}>
                              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                                <path d="M12 16V3" />
                                <path d="m7 8 5-5 5 5" />
                              </svg>
                            </OverlayMetricButton>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="hidden lg:flex lg:h-[calc(100svh-8rem)] lg:min-w-0 lg:flex-col lg:gap-4">
                <PixeContextRail
                  variant="watch"
                  video={video}
                  comments={comments}
                  commentsLoading={commentsLoading}
                  queue={queue}
                  activeTab={desktopRailTab}
                  onTabChange={setDesktopRailTab}
                  onSubscribe={handleSubscribe}
                  onProductClick={handleProductClick}
                  onCommentSubmit={handleCommentSubmit}
                  viewerUserId={user?.id || null}
                  onCommentLike={handleCommentLike}
                  onCommentReport={handleCommentReport}
                  onCommentDelete={handleCommentDelete}
                  commentLikePendingId={commentLikePendingId}
                  commentReportPendingId={commentReportPendingId}
                  commentDeletePendingId={commentDeletePendingId}
                  className="lg:flex lg:min-h-0 lg:flex-1"
                />
              </div>
            </section>

            <section className="pixe-noir-panel rounded-[28px] p-4 sm:p-5 lg:hidden">
              <div className="flex items-start gap-3">
                <img
                  src={video.channel?.avatar_url || '/icons/urbanprime.svg'}
                  alt={video.channel?.display_name || 'Creator'}
                  className="h-12 w-12 rounded-full border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={video.channel ? `/pixe/channel/${video.channel.handle}` : '/pixe'} className="block text-sm font-semibold text-white">
                        {video.channel?.display_name || 'Creator'}
                      </Link>
                      <p className="mt-1 text-xs text-white/52">@{video.channel?.handle || 'pixe'}</p>
                    </div>
                    {video.channel ? (
                      <button
                        type="button"
                        onClick={handleSubscribe}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/82"
                      >
                        {video.channel.is_subscribed ? 'Subscribed' : 'Subscribe'}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                      {formatCount(video.metrics.qualified_views)} views
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                      {video.metrics.completion_rate}% completion
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                      {formatCount(video.metrics.likes)} likes
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                      {formatCount(video.metrics.shares)} shares
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-base font-semibold text-white" style={clampTextStyle(2)}>
                {video.title || 'Untitled clip'}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/68" style={clampTextStyle(4)}>
                {video.caption || 'No caption added yet.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {video.hashtags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="pixe-noir-panel rounded-[28px] p-4 sm:p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Queue</p>
                  <h2 className="mt-1 text-sm font-semibold">Up next</h2>
                </div>
                {queueLoading ? <PixeMiniRailSkeleton rows={3} /> : null}
              </div>
              <PixeQueueList items={queue.slice(0, 4)} currentVideoId={video.id} />
            </section>

            <section className="pixe-noir-panel rounded-[28px] p-4 sm:p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Products</p>
                  <h2 className="mt-1 text-sm font-semibold">Tagged products</h2>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/52">
                  Shop
                </span>
              </div>
              <PixeProductList tags={video.product_tags} onProductClick={handleProductClick} />
            </section>

            <section className="pixe-noir-panel rounded-[28px] p-4 sm:p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Comments</p>
                  <h2 className="mt-1 text-sm font-semibold">Preview</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void openCommentsPanel()}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/68"
                >
                  Open
                </button>
              </div>
              <PixeCommentThread
                video={video}
                comments={previewComments}
                loading={commentsLoading}
                maxItems={3}
                compact
                viewerUserId={user?.id || null}
                onCommentLike={handleCommentLike}
                onCommentReport={handleCommentReport}
                onCommentDelete={handleCommentDelete}
                commentLikePendingId={commentLikePendingId}
                commentReportPendingId={commentReportPendingId}
                commentDeletePendingId={commentDeletePendingId}
              />
            </section>

          </div>
        </div>
      </div>

      <MobileCommentSheet
        open={commentsOpen}
        video={video}
        comments={comments}
        loading={commentsLoading}
        onClose={() => setCommentsOpen(false)}
        onSubmit={handleCommentSubmit}
        viewerUserId={user?.id || null}
        onCommentLike={handleCommentLike}
        onCommentReport={handleCommentReport}
        onCommentDelete={handleCommentDelete}
        commentLikePendingId={commentLikePendingId}
        commentReportPendingId={commentReportPendingId}
        commentDeletePendingId={commentDeletePendingId}
      />
    </>
  );
};

export default PixeWatchPage;
