import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { itemService, userService } from '../../services/itemService';
import type { PixeComment, PixeFeedMode, PixeProductTag, PixeVideo } from '../../services/pixeService';
import { pixeService } from '../../services/pixeService';
import { useAuth } from '../../hooks/useAuth';
import PixeEmptyState from './PixeEmptyState';
import { PixeCommentThreadSkeleton, PixeFeedPageSkeleton, PixeInlineSkeleton, PixeMiniRailSkeleton } from './PixeSkeleton';
import {
  formatCount,
  formatDuration,
  PixeCommentThread,
  PixeProductList,
  PixeVideoSurface
} from './PixePublicSurface';
import PixeTopHeader from './PixeTopHeader';
import { pixeLibraryHeaderLink } from './pixeHeaderConfig';

type FeedSession = {
  activationKey: string;
  startCurrentTime: number;
  maxProgressRatio: number;
  lastActivitySyncTime: number;
};

type NetworkProfile = {
  allowWarmPreload: boolean;
  saveData: boolean;
};

type ActivePlaybackState = {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

type ViewportMetrics = {
  width: number;
  height: number;
};

type DesktopPanelKey = 'comments' | 'share' | 'products' | null;

type ShareTarget = {
  threadId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string;
};

type CommentNode = PixeComment & {
  replies: CommentNode[];
};

const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const truncateWords = (value: string | null | undefined, count: number) => {
  const text = String(value || '').trim();
  if (!text) return { text: '', truncated: false };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= count) return { text, truncated: false };
  return {
    text: words.slice(0, count).join(' '),
    truncated: true
  };
};

const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return 'Now';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
};

const buildCommentTree = (comments: PixeComment[]) => {
  const visible = comments.filter((comment) => comment.status !== 'deleted');
  const byParent = new Map<string, PixeComment[]>();

  visible.forEach((comment) => {
    const key = comment.parent_comment_id || 'root';
    const bucket = byParent.get(key) || [];
    bucket.push(comment);
    byParent.set(key, bucket);
  });

  const sortByCreated = (left: PixeComment, right: PixeComment) =>
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

  const makeNode = (comment: PixeComment): CommentNode => ({
    ...comment,
    replies: (byParent.get(comment.id) || []).sort(sortByCreated).map(makeNode)
  });

  return (byParent.get('root') || []).sort(sortByCreated).map(makeNode);
};

const getAudioLabel = (video: PixeVideo) => {
  const caption = String(video.caption || '').trim();
  const audioMatch = caption.match(/(?:audio|song|track)\s*[:\-]\s*([^\n#]+)/i);
  if (audioMatch?.[1]) return audioMatch[1].trim();
  return `Original audio @${video.channel?.handle || 'pixe'}`;
};

const getVideoAspectRatio = (video: Pick<PixeVideo, 'width' | 'height'>) => {
  const width = Number(video.width || 0);
  const height = Number(video.height || 0);
  if (width > 0 && height > 0) {
    return width / height;
  }
  return 9 / 16;
};

const getDesktopFeedFramePreset = (video: Pick<PixeVideo, 'width' | 'height'>): 'square' | 'portrait' => {
  const ratio = getVideoAspectRatio(video);
  return ratio >= 0.92 ? 'square' : 'portrait';
};

const getViewerSessionId = () => {
  const storageKey = 'pixe_viewer_session_v1';
  if (typeof window === 'undefined') return 'server-session';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `session-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
};

const modeTabs: Array<{ mode: PixeFeedMode; label: string; path: string }> = [
  { mode: 'for_you', label: 'For You', path: '/pixe' },
  { mode: 'following', label: 'Following', path: '/pixe/following' },
  { mode: 'explore', label: 'Explore', path: '/pixe/explore' }
];

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe/explore', label: 'Search' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const feedHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed', end: true },
  { to: '/pixe/following', label: 'Following' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const IconButton: React.FC<{
  label: string;
  value?: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}> = ({ label, value, onClick, active, children }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onClick?.();
    }}
    className={`flex flex-col items-center gap-2 rounded-full px-1 py-1 text-white transition ${
      active ? 'scale-[1.03]' : 'opacity-92 hover:opacity-100'
    }`}
    aria-label={label}
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-black/38 backdrop-blur-md shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
      {children}
    </span>
    {value ? <span className="text-[11px] font-semibold tracking-[0.08em]">{value}</span> : null}
  </button>
);

const RailGlyphButton: React.FC<{
  label: string;
  value?: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, value, active = false, onClick, children }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onClick?.();
    }}
    className={`group flex w-full flex-col items-center gap-1.5 px-0.5 py-0.5 text-white transition ${
      active ? 'scale-[1.03]' : 'opacity-92 hover:scale-[1.02] hover:opacity-100'
    }`}
    aria-label={label}
  >
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition ${
        active
          ? 'bg-white text-black shadow-[0_14px_34px_rgba(255,255,255,0.18)]'
          : 'bg-transparent hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </span>
    {label ? <span className="text-[11px] font-medium leading-none text-white/74">{label}</span> : null}
    {value ? <span className="text-[13px] font-semibold leading-none text-white/96">{value}</span> : null}
  </button>
);

const PixeCommentSheet: React.FC<{
  open: boolean;
  video: PixeVideo | null;
  comments: PixeComment[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}> = ({ open, video, comments, loading, onClose, onSubmit }) => {
  if (!open || !video) return null;

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
          <PixeCommentThread video={video} comments={comments} loading={loading} onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
};

const usePreconnect = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const hrefs = ['https://stream.mux.com', 'https://image.mux.com'];
    const links = hrefs.map((href) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      document.head.appendChild(link);
      return link;
    });
    return () => {
      links.forEach((link) => link.remove());
    };
  }, []);
};

const getNetworkProfile = (): NetworkProfile => {
  if (typeof navigator === 'undefined') {
    return { allowWarmPreload: true, saveData: false };
  }

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    mozConnection?: { saveData?: boolean; effectiveType?: string };
    webkitConnection?: { saveData?: boolean; effectiveType?: string };
  }).connection
    || (navigator as any).mozConnection
    || (navigator as any).webkitConnection;

  const effectiveType = String(connection?.effectiveType || '').toLowerCase();
  const saveData = Boolean(connection?.saveData);
  const allowWarmPreload = !saveData && !effectiveType.includes('2g') && effectiveType !== 'slow-2g';

  return { allowWarmPreload, saveData };
};

export const PixeFeedExperience: React.FC<{ mode: PixeFeedMode }> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const viewerSessionId = useMemo(() => getViewerSessionId(), []);
  const [items, setItems] = useState<PixeVideo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<PixeComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  }));
  const [networkProfile, setNetworkProfile] = useState<NetworkProfile>(() => getNetworkProfile());
  const [activePlaybackState, setActivePlaybackState] = useState<ActivePlaybackState>({
    videoId: null,
    isPlaying: true,
    currentTime: 0,
    duration: 0
  });
  const [desktopPanel, setDesktopPanel] = useState<DesktopPanelKey>(null);
  const [expandedCaptionIds, setExpandedCaptionIds] = useState<Record<string, boolean>>({});
  const [expandedHashtagIds, setExpandedHashtagIds] = useState<Record<string, boolean>>({});
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [commentLikePendingId, setCommentLikePendingId] = useState<string | null>(null);
  const [commentReportPendingId, setCommentReportPendingId] = useState<string | null>(null);
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);
  const [shareTargetsLoading, setShareTargetsLoading] = useState(false);
  const [sharePendingThreadId, setSharePendingThreadId] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [likeBurstVideoId, setLikeBurstVideoId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const playerRefs = useRef<Record<string, any>>({});
  const sessionsRef = useRef<Record<string, FeedSession>>({});
  const watchProgressPendingRef = useRef<Record<string, boolean>>({});
  const previousActiveIndexRef = useRef(0);
  const itemsRef = useRef<PixeVideo[]>([]);
  const clickTimerRef = useRef<number | null>(null);
  const commentSubmittingRef = useRef(false);

  usePreconnect();

  const loadFeed = useCallback(async ({ reset, nextCursor }: { reset: boolean; nextCursor?: string | null }) => {
    if (mode === 'following' && !isAuthenticated) {
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await pixeService.getFeed(mode, reset ? null : nextCursor || null, 8);
      setItems((current) => (reset ? response.items : [...current, ...response.items]));
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Unable to load Pixe feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, mode]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setViewportMetrics({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setNetworkProfile(getNetworkProfile());
    };

    if (typeof window === 'undefined') return undefined;
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setActiveIndex(0);
    setCommentVideoId(null);
    setDesktopPanel(null);
    setReplyToCommentId(null);
    setCommentDraft('');
    setCopiedShareLink(false);
    void loadFeed({ reset: true, nextCursor: null });
  }, [mode, loadFeed]);

  useEffect(() => {
    const activeVideo = items[activeIndex];
    if (!activeVideo) return;
    const player = playerRefs.current[activeVideo.id];
    setActivePlaybackState({
      videoId: activeVideo.id,
      isPlaying: player ? !player.paused : true,
      currentTime: Number(player?.currentTime || 0),
      duration: Math.max(Number(player?.duration || activeVideo.duration_ms / 1000 || 0), 0)
    });
  }, [activeIndex, items]);

  const flushSession = useCallback(async (video: PixeVideo | undefined) => {
    if (!video) return;
    const player = playerRefs.current[video.id];
    const session = sessionsRef.current[video.id];
    if (!player || !session) return;

    const endTime = Number(player.currentTime || 0);
    const watchTimeMs = Math.max(0, Math.round((endTime - session.startCurrentTime) * 1000));
    const highestRatio = Math.max(0, session.maxProgressRatio);
    const baseId = `${session.activationKey}-${video.id}`;
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
        video_id: video.id,
        event_name: 'impression',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString(),
        ...(watchTimeMs > 0 && highestRatio < 0.05 ? { watch_time_ms: watchTimeMs } : {})
      }
    ];

    if (watchTimeMs >= 3000 || highestRatio >= 0.05) {
      events.push({
        event_id: `${baseId}-3s`,
        video_id: video.id,
        event_name: 'view_3s',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString(),
        ...(watchTimeMs > 0 && highestRatio < 0.5 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.5) {
      events.push({
        event_id: `${baseId}-50`,
        video_id: video.id,
        event_name: 'view_50',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString(),
        ...(watchTimeMs > 0 && highestRatio < 0.95 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.95) {
      events.push({
        event_id: `${baseId}-95`,
        video_id: video.id,
        event_name: 'view_95',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString(),
        ...(watchTimeMs > 0 && highestRatio < 0.99 ? { watch_time_ms: watchTimeMs } : {})
      });
    }
    if (highestRatio >= 0.99) {
      events.push({
        event_id: `${baseId}-complete`,
        video_id: video.id,
        event_name: 'complete',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString(),
        ...(watchTimeMs > 0 ? { watch_time_ms: watchTimeMs } : {})
      });
    }

    delete sessionsRef.current[video.id];

    try {
      await pixeService.sendEvents(events);
    } catch (error) {
      console.error('Unable to send Pixe playback events:', error);
    }
  }, [viewerSessionId]);

  const ensureFeedSession = useCallback((video: PixeVideo | undefined, playerNode?: any | null) => {
    if (!video) return;
    const player = playerNode || playerRefs.current[video.id];
    if (!player || sessionsRef.current[video.id]) return;
    sessionsRef.current[video.id] = {
      activationKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startCurrentTime: Number(player.currentTime || 0),
      maxProgressRatio: Number(player.currentTime || 0) / Math.max(Number(player.duration || video.duration_ms / 1000 || 1), 1),
      lastActivitySyncTime: Number(player.currentTime || 0)
    };
  }, []);

  const syncWatchProgress = useCallback(async (video: PixeVideo | undefined) => {
    if (!video || !user?.id || watchProgressPendingRef.current[video.id]) return;
    const player = playerRefs.current[video.id];
    const session = sessionsRef.current[video.id];
    if (!player || !session) return;

    const currentTime = Number(player.currentTime || 0);
    const durationSeconds = Math.max(Number(player.duration || video.duration_ms / 1000 || 1), 1);
    const progressRatio = Math.max(session.maxProgressRatio, currentTime / durationSeconds);
    const lastSyncTime = session.lastActivitySyncTime;
    const watchTimeMs = Math.max(0, Math.round((currentTime - lastSyncTime) * 1000));
    if (watchTimeMs < 700) return;

    watchProgressPendingRef.current[video.id] = true;
    try {
      await pixeService.recordWatchProgress({
        video_id: video.id,
        viewer_session_id: viewerSessionId,
        watch_time_ms: watchTimeMs,
        progress_ratio: progressRatio,
        completed: progressRatio >= 0.99,
        occurred_at: new Date().toISOString()
      });
      if (sessionsRef.current[video.id] === session) {
        sessionsRef.current[video.id] = {
          ...session,
          maxProgressRatio: progressRatio,
          lastActivitySyncTime: currentTime
        };
      }
    } catch (error) {
      console.error('Unable to sync Pixe feed watch progress:', error);
    } finally {
      watchProgressPendingRef.current[video.id] = false;
    }
  }, [user?.id, viewerSessionId]);

  useEffect(() => {
    return () => {
      void Promise.all(itemsRef.current.flatMap((item) => [syncWatchProgress(item), flushSession(item)]));
    };
  }, [flushSession, syncWatchProgress]);

  useEffect(() => {
    const cards = items.map((item) => cardRefs.current[item.id]).filter(Boolean) as HTMLDivElement[];
    if (cards.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        let highestIndex = activeIndex;
        let highestRatio = 0;
        entries.forEach((entry) => {
          const videoId = entry.target.getAttribute('data-video-id');
          const index = items.findIndex((item) => item.id === videoId);
          if (index >= 0 && entry.intersectionRatio > highestRatio) {
            highestRatio = entry.intersectionRatio;
            highestIndex = index;
          }
        });
        if (highestRatio >= 0.55) {
          setActiveIndex(highestIndex);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.25, 0.45, 0.55, 0.72, 0.9]
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items, activeIndex]);

  useEffect(() => {
    const previousIndex = previousActiveIndexRef.current;
    const previous = items[previousIndex];
    const activeChanged = previousIndex !== activeIndex;

    if (activeChanged && previous) {
      void syncWatchProgress(previous);
      void flushSession(previous);
    }

    items.forEach((item, index) => {
      const player = playerRefs.current[item.id];
      if (!player) return;
      if (index === activeIndex) {
        ensureFeedSession(item, player);
        player.muted = isMuted;
        if (player.paused) {
          void player.play?.().catch(() => undefined);
        }
      } else {
        player.muted = true;
        player.pause?.();
      }
    });

    previousActiveIndexRef.current = activeIndex;
  }, [activeIndex, ensureFeedSession, flushSession, isMuted, items, syncWatchProgress]);

  useEffect(() => {
    if (!hasMore || loadingMore || items.length === 0 || activeIndex < items.length - 3) return;
    void loadFeed({ reset: false, nextCursor: cursor });
  }, [activeIndex, cursor, hasMore, items.length, loadFeed, loadingMore]);

  useEffect(() => {
    const next = items[activeIndex + 1];
    if (!next || typeof document === 'undefined') return undefined;

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'preload';
    manifestLink.as = String(next.manifest_url || '').toLowerCase().includes('.mp4') ? 'video' : 'fetch';
    manifestLink.href = next.manifest_url || '';
    manifestLink.crossOrigin = 'anonymous';

    const posterLink = document.createElement('link');
    posterLink.rel = 'preload';
    posterLink.as = 'image';
    posterLink.href = next.thumbnail_url || '';

    if (manifestLink.href && !networkProfile.saveData) document.head.appendChild(manifestLink);
    if (posterLink.href) document.head.appendChild(posterLink);

    return () => {
      manifestLink.remove();
      posterLink.remove();
    };
  }, [activeIndex, items, networkProfile.saveData]);

  const loadComments = useCallback(async (videoId: string) => {
    setCommentsLoading(true);
    try {
      const result = await pixeService.getComments(videoId);
      setComments(result);
    } catch (error) {
      console.error('Unable to load comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const videoId = isDesktop ? (desktopPanel === 'comments' ? items[activeIndex]?.id : null) : commentVideoId;
    if (!videoId) return;
    void loadComments(videoId);
  }, [activeIndex, commentVideoId, desktopPanel, isDesktop, items, loadComments]);

  useEffect(() => {
    if (desktopPanel !== 'share' || !isDesktop) return;
    if (!user?.id) {
      setShareTargets([]);
      return;
    }

    let cancelled = false;
    setShareTargetsLoading(true);

    void (async () => {
      try {
        const threads = await itemService.getChatThreadsForUser(user.id);
        const uniqueTargets = new Map<string, ShareTarget>();

        for (const thread of threads) {
          const otherUserId = thread.buyerId === user.id ? thread.sellerId : thread.buyerId;
          if (!otherUserId || otherUserId === user.id || uniqueTargets.has(otherUserId)) continue;

          const profile = await userService.getUserById(otherUserId).catch(() => null);
          uniqueTargets.set(otherUserId, {
            threadId: thread.id,
            userId: otherUserId,
            name: profile?.name || 'Urban Prime user',
            avatarUrl: (profile as any)?.avatar || (profile as any)?.avatar_url || null,
            subtitle: thread.lastMessage || 'Recent chat'
          });

          if (uniqueTargets.size >= 5) break;
        }

        if (!cancelled) {
          setShareTargets(Array.from(uniqueTargets.values()));
        }
      } catch (error) {
        console.error('Unable to load recent share targets:', error);
        if (!cancelled) {
          setShareTargets([]);
        }
      } finally {
        if (!cancelled) {
          setShareTargetsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [desktopPanel, isDesktop, user?.id]);

  useEffect(() => {
    const currentVideo = items[activeIndex];
    if (desktopPanel === 'products' && currentVideo && currentVideo.product_tags.length === 0) {
      setDesktopPanel(null);
    }
  }, [activeIndex, desktopPanel, items]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      const activeVideo = itemsRef.current[previousActiveIndexRef.current];
      if (!activeVideo) return;
      const player = playerRefs.current[activeVideo.id];
      player?.pause?.();
      void syncWatchProgress(activeVideo);
      void flushSession(activeVideo);
      setActivePlaybackState({
        videoId: activeVideo.id,
        isPlaying: false,
        currentTime: Number(player?.currentTime || 0),
        duration: Math.max(Number(player?.duration || activeVideo.duration_ms / 1000 || 0), 0)
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushSession, syncWatchProgress]);

  useEffect(() => {
    if (!user?.id || items.length === 0) return undefined;

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const activeVideo = itemsRef.current[previousActiveIndexRef.current];
      if (!activeVideo) return;
      const player = playerRefs.current[activeVideo.id];
      if (!player || player.paused) return;
      void syncWatchProgress(activeVideo);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [items.length, syncWatchProgress, user?.id]);

  useEffect(() => {
    setCommentDraft('');
    setReplyToCommentId(null);
    setCommentLikePendingId(null);
    setCommentReportPendingId(null);
  }, [activeIndex, desktopPanel]);

  const requireAuth = useCallback(() => {
    navigate('/auth', { state: { from: location } });
  }, [location, navigate]);

  const mutateVideo = useCallback((videoId: string, updater: (video: PixeVideo) => PixeVideo) => {
    setItems((current) => current.map((item) => (item.id === videoId ? updater(item) : item)));
  }, []);

  const activeVideo = items[activeIndex] || null;
  const commentVideo = items.find((item) => item.id === commentVideoId) || null;
  const activeCommentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const scrollToIndex = useCallback((index: number) => {
    const target = items[index];
    if (!target) return;
    setActiveIndex(index);
    cardRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [items]);

  const setPlayerNode = useCallback((videoId: string, node: any | null) => {
    if (node) {
      playerRefs.current[videoId] = node;
    } else {
      delete playerRefs.current[videoId];
    }
  }, []);

  const toggleActivePlayback = useCallback(() => {
    const video = items[activeIndex];
    if (!video) return;
    const player = playerRefs.current[video.id];
    if (!player) return;
    if (player.paused) {
      void player.play?.().catch(() => undefined);
    } else {
      player.pause?.();
    }
  }, [activeIndex, items]);

  const handleSubscribe = useCallback(async (video: PixeVideo) => {
    if (!video.channel) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.subscribe(video.channel.id);
    mutateVideo(video.id, (current) => ({
      ...current,
      channel: current.channel
        ? {
          ...current.channel,
          is_subscribed: next.subscribed,
          subscriber_count: next.subscriber_count
        }
        : current.channel
    }));
  }, [isAuthenticated, mutateVideo, requireAuth]);

  const handleProductClick = useCallback(async (videoId: string, tag: PixeProductTag) => {
    await pixeService.sendEvents([
      {
        event_id: `${videoId}-${tag.id}-${Date.now()}`,
        video_id: videoId,
        event_name: 'product_click',
        viewer_session_id: viewerSessionId,
        occurred_at: new Date().toISOString()
      }
    ]);
  }, [viewerSessionId]);

  const handleLike = useCallback(async (video: PixeVideo) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.likeVideo(video.id);
    mutateVideo(video.id, (current) => ({
      ...current,
      viewer_state: { ...current.viewer_state, liked: next.liked },
      metrics: { ...current.metrics, likes: next.like_count }
    }));
  }, [isAuthenticated, mutateVideo, requireAuth]);

  const handleSave = useCallback(async (video: PixeVideo) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    const next = await pixeService.saveVideo(video.id);
    mutateVideo(video.id, (current) => ({
      ...current,
      viewer_state: { ...current.viewer_state, saved: next.saved },
      metrics: { ...current.metrics, saves: next.save_count }
    }));
  }, [isAuthenticated, mutateVideo, requireAuth]);

  const registerShare = useCallback(async (video: PixeVideo) => {
    const next = await pixeService.shareVideo(video.id);
    mutateVideo(video.id, (current) => ({
      ...current,
      metrics: { ...current.metrics, shares: next.share_count }
    }));
  }, [mutateVideo]);

  const handleShare = useCallback(async (video: PixeVideo) => {
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

    await registerShare(video);
  }, [registerShare]);

  const openComments = useCallback(async (videoId: string) => {
    if (isDesktop) {
      setDesktopPanel((current) => (current === 'comments' ? null : 'comments'));
    } else {
      await loadComments(videoId);
      setCommentVideoId(videoId);
    }
  }, [isDesktop, loadComments]);

  const toggleDesktopPanel = useCallback((panel: Exclude<DesktopPanelKey, null>) => {
    setDesktopPanel((current) => (current === panel ? null : panel));
  }, []);

  const showLikeBurst = useCallback((videoId: string) => {
    setLikeBurstVideoId(videoId);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setLikeBurstVideoId((current) => (current === videoId ? null : current));
      }, 720);
    }
  }, []);

  const handleVideoClick = useCallback((video: PixeVideo, isActive: boolean) => {
    if (!isActive || typeof window === 'undefined') return;
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (!video.viewer_state.liked) {
        void handleLike(video);
      }
      showLikeBurst(video.id);
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      toggleActivePlayback();
      clickTimerRef.current = null;
    }, 220);
  }, [handleLike, showLikeBurst, toggleActivePlayback]);

  const submitComment = useCallback(async (video: PixeVideo, body: string, parentCommentId?: string | null) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    if (commentSubmittingRef.current) return;

    commentSubmittingRef.current = true;
    setCommentSubmitting(true);
    try {
      const nextComment = await pixeService.addComment(video.id, body, parentCommentId);
      setComments((current) => [nextComment, ...current]);
      setCommentDraft('');
      setReplyToCommentId(null);
      mutateVideo(video.id, (current) => ({
        ...current,
        metrics: { ...current.metrics, comments: current.metrics.comments + 1 }
      }));
    } finally {
      commentSubmittingRef.current = false;
      setCommentSubmitting(false);
    }
  }, [isAuthenticated, mutateVideo, requireAuth]);

  const handleDeleteComment = useCallback(async (video: PixeVideo, comment: PixeComment) => {
    if (!comment.user || comment.user.id !== user?.id) return;
    setCommentActionId(comment.id);
    try {
      await pixeService.updateComment(comment.id, { status: 'deleted' });
      setComments((current) => current.filter((entry) => entry.id !== comment.id));
      mutateVideo(video.id, (current) => ({
        ...current,
        metrics: { ...current.metrics, comments: Math.max(0, current.metrics.comments - 1) }
      }));
    } finally {
      setCommentActionId(null);
    }
  }, [mutateVideo, user?.id]);

  const handleToggleCommentLike = useCallback(async (comment: PixeComment) => {
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
  }, [isAuthenticated, requireAuth]);

  const handleReportComment = useCallback(async (video: PixeVideo, comment: PixeComment) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    if (comment.viewer_state?.reported) return;

    setCommentReportPendingId(comment.id);
    try {
      await pixeService.reportComment(comment.id);
      await loadComments(video.id);
    } finally {
      setCommentReportPendingId(null);
    }
  }, [isAuthenticated, loadComments, requireAuth]);

  const copyShareLink = useCallback(async (video: PixeVideo) => {
    const shareUrl = `${window.location.origin}/pixe/watch/${video.id}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    await registerShare(video);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setCopiedShareLink(false), 1800);
    }
  }, [registerShare]);

  const sendVideoToThread = useCallback(async (video: PixeVideo, target: ShareTarget) => {
    if (!user?.id) {
      requireAuth();
      return;
    }

    const shareUrl = `${window.location.origin}/pixe/watch/${video.id}`;
    setSharePendingThreadId(target.threadId);
    try {
      await itemService.sendMessageToThread(
        target.threadId,
        user.id,
        `Check this on Pixe: ${shareUrl}`
      );
      await registerShare(video);
    } finally {
      setSharePendingThreadId(null);
    }
  }, [registerShare, requireAuth, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (window.innerWidth < 1024) return;

      const normalized = event.key.toLowerCase();
      if (event.key === 'ArrowDown' || normalized === 'k') {
        event.preventDefault();
        scrollToIndex(Math.min(items.length - 1, activeIndex + 1));
        return;
      }
      if (event.key === 'ArrowUp' || normalized === 'j') {
        event.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        toggleActivePlayback();
        return;
      }
      if (normalized === 'm') {
        event.preventDefault();
        setIsMuted((current) => !current);
        return;
      }
      if (event.key === 'Escape') {
        setCommentVideoId(null);
        setDesktopPanel(null);
        setReplyToCommentId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items.length, scrollToIndex, toggleActivePlayback]);

  const renderCommentNode = (video: PixeVideo, comment: CommentNode, depth = 0): React.ReactNode => {
    const isOwnComment = comment.user?.id && comment.user.id === user?.id;
    const isCommentLiked = Boolean(comment.viewer_state?.liked);
    const commentLikeCount = Number(comment.metrics?.likes || 0);
    const commentReported = Boolean(comment.viewer_state?.reported);

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 border-l border-white/8 pl-4' : ''}>
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-3">
            <Link to={comment.user?.id ? `/user/${comment.user.id}` : '/'} className="shrink-0">
              <img
                src={comment.user?.avatar_url || '/icons/urbanprime.svg'}
                alt={comment.user?.name || 'Viewer'}
                className="h-10 w-10 rounded-full border border-white/10 object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={comment.user?.id ? `/user/${comment.user.id}` : '/'} className="truncate text-sm font-semibold text-white">
                  {comment.user?.name || 'Viewer'}
                </Link>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/34">
                  {formatRelativeTime(comment.created_at)}
                </span>
                {comment.is_pinned ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                    Pinned
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/76">{comment.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplyToCommentId((current) => (current === comment.id ? null : comment.id))}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/54 transition hover:border-white/18 hover:text-white"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleCommentLike(comment)}
                  disabled={commentLikePendingId === comment.id}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    isCommentLiked
                      ? 'border-white/20 bg-white/[0.1] text-white'
                      : 'border-white/10 text-white/54 hover:border-white/18 hover:text-white'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {commentLikePendingId === comment.id
                    ? 'Saving'
                    : `${isCommentLiked ? 'Liked' : 'Like'}${commentLikeCount > 0 ? ` · ${formatCount(commentLikeCount)}` : ''}`}
                </button>
                {isOwnComment ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteComment(video, comment)}
                    disabled={commentActionId === comment.id}
                    className="rounded-full border border-rose-300/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-100/78 transition hover:border-rose-300/24 hover:text-rose-100 disabled:opacity-50"
                  >
                    {commentActionId === comment.id ? 'Removing' : 'Delete'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReportComment(video, comment)}
                    disabled={commentReportPendingId === comment.id || commentReported}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/54 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {commentReportPendingId === comment.id ? 'Reporting' : commentReported ? 'Reported' : 'Report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {comment.replies.length > 0 ? (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => renderCommentNode(video, reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderDesktopPanel = () => {
    if (!activeVideo || !desktopPanel) return null;

    if (desktopPanel === 'comments') {
      return (
        <div className="relative h-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(10,10,10,0.96))] shadow-[0_32px_72px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
          <div className="absolute left-0 top-[48%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-[rgba(14,14,14,0.96)]" />
          <div className="flex h-full flex-col">
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">Comments</p>
                  <h2 className="mt-1 text-sm font-semibold text-white">Clip conversation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDesktopPanel(null);
                    setReplyToCommentId(null);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/56 transition hover:border-white/18 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {commentsLoading ? (
                <PixeCommentThreadSkeleton rows={3} />
              ) : activeCommentTree.length === 0 ? (
                <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.04] px-5 text-center">
                  <p className="text-sm font-semibold text-white">No comments yet</p>
                  <p className="mt-2 text-xs leading-6 text-white/52">Start the thread for this clip.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCommentTree.map((comment) => renderCommentNode(activeVideo, comment))}
                </div>
              )}
            </div>

            <form
              className="border-t border-white/8 px-5 py-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const trimmed = commentDraft.trim();
                if (!trimmed) return;
                await submitComment(activeVideo, trimmed, replyToCommentId);
              }}
            >
              {replyToCommentId ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/52">
                  <span>Replying to a comment</span>
                  <button type="button" onClick={() => setReplyToCommentId(null)} className="text-white/74 transition hover:text-white">
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="flex gap-3">
                <input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Write a reply"
                  className="pixe-noir-input h-12 flex-1 rounded-full px-4 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentDraft.trim()}
                  className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {commentSubmitting ? 'Posting' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (desktopPanel === 'share') {
      return (
        <div className="relative h-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(10,10,10,0.96))] shadow-[0_32px_72px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
          <div className="absolute left-0 top-[52%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-[rgba(14,14,14,0.96)]" />
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">Share</p>
                <h2 className="mt-1 text-sm font-semibold text-white">Send this clip</h2>
              </div>
              <button
                type="button"
                onClick={() => setDesktopPanel(null)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/56 transition hover:border-white/18 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-4">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => void copyShareLink(activeVideo)}
                className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4 text-left transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">Copy link</span>
                  <span className="mt-1 block text-xs text-white/52">
                    {copiedShareLink ? 'Link copied' : 'Share the clip anywhere'}
                  </span>
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/68">
                  Copy
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleSave(activeVideo)}
                className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4 text-left transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">{activeVideo.viewer_state.saved ? 'Saved to account' : 'Save clip'}</span>
                  <span className="mt-1 block text-xs text-white/52">Add it to your saved Pixe list</span>
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/68">
                  {activeVideo.viewer_state.saved ? 'Saved' : 'Save'}
                </span>
              </button>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">Recent chats</p>
                  <h2 className="mt-1 text-sm font-semibold text-white">Send in Messages</h2>
                </div>
                <Link to="/messages" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/54 transition hover:text-white">
                  Open inbox
                </Link>
              </div>

              {shareTargetsLoading ? (
                <PixeMiniRailSkeleton rows={4} />
              ) : shareTargets.length === 0 ? (
                <div className="rounded-[28px] border border-white/8 bg-white/[0.04] px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-white">No recent chats yet</p>
                  <p className="mt-2 text-xs leading-6 text-white/52">Start a conversation from Messages and it will show up here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shareTargets.map((target) => (
                    <button
                      key={target.threadId}
                      type="button"
                      onClick={() => void sendVideoToThread(activeVideo, target)}
                      disabled={sharePendingThreadId === target.threadId}
                      className="flex w-full items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3 text-left transition hover:border-white/18 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <img
                        src={target.avatarUrl || '/icons/urbanprime.svg'}
                        alt={target.name}
                        className="h-11 w-11 rounded-full border border-white/10 object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{target.name}</span>
                        <span className="mt-1 block truncate text-xs text-white/48">{target.subtitle}</span>
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/68">
                        {sharePendingThreadId === target.threadId ? 'Sending' : 'Send'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative h-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(10,10,10,0.96))] shadow-[0_32px_72px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
        <div className="absolute left-0 top-[58%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-[rgba(14,14,14,0.96)]" />
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">Tagged items</p>
              <h2 className="mt-1 text-sm font-semibold text-white">Shop from this clip</h2>
            </div>
            <button
              type="button"
              onClick={() => setDesktopPanel(null)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/56 transition hover:border-white/18 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-full overflow-y-auto px-5 py-4">
          <PixeProductList tags={activeVideo.product_tags} onProductClick={(tag) => handleProductClick(activeVideo.id, tag)} />
        </div>
      </div>
    );
  };

  if (loading && items.length === 0) {
    return <PixeFeedPageSkeleton />;
  }

  if (mode === 'following' && !isAuthenticated) {
    return (
      <div className="pixe-noir-shell flex min-h-[100svh] flex-col text-white">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks}>
          <div className="flex flex-wrap gap-2">
            {modeTabs.map((tab) => (
              <Link
                key={tab.mode}
                to={tab.path}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab.mode === mode ? 'bg-white text-black' : 'pixe-noir-pill text-white/74 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </PixeTopHeader>
        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-xl">
            <PixeEmptyState
              title="Sign in to view Following"
              message="The Following feed only loads for signed-in viewers because it uses your subscriptions and channel relationships."
              animation="nothing"
              primaryAction={{ label: 'Go to sign in', to: '/auth' }}
              secondaryAction={{ label: 'Open Explore', to: '/pixe/explore' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="pixe-noir-shell relative flex min-h-[100svh] flex-col overflow-hidden text-white">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks}>
          <div className="flex flex-wrap gap-2">
            {modeTabs.map((tab) => (
              <Link
                key={tab.mode}
                to={tab.path}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab.mode === mode ? 'bg-white text-black' : 'pixe-noir-pill text-white/74 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </PixeTopHeader>

        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <PixeEmptyState
            title="No clips yet"
            message="Publish the first clip from Studio or browse connected discovery results in Explore."
            animation="noFileFound"
            primaryAction={{ label: 'New upload', to: '/pixe-studio/upload' }}
            secondaryAction={{ label: 'Explore', to: '/pixe/explore' }}
            className="py-10"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pixe-noir-shell relative h-[100svh] overflow-hidden text-white">
        <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={feedHeaderLinks} overlay containerClassName="max-w-[118rem]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black/88 via-black/26 to-transparent" />
        <div className="pointer-events-none absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 lg:flex lg:flex-col lg:gap-3">
          <button
            type="button"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex <= 0}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] text-white shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:border-white/18 hover:bg-white/[0.12] disabled:cursor-default disabled:opacity-35"
            aria-label="Previous video"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(Math.min(items.length - 1, activeIndex + 1))}
            disabled={activeIndex >= items.length - 1}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] text-white shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:border-white/18 hover:bg-white/[0.12] disabled:cursor-default disabled:opacity-35"
            aria-label="Next video"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className="h-[100svh] pt-[4.85rem] sm:pt-[5.05rem]">
          <div className="mx-auto h-full w-full max-w-[118rem] px-3 sm:px-5 lg:px-6 xl:px-8">
            <div
              ref={containerRef}
              className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {items.map((item, index) => {
                const isNear = Math.abs(index - activeIndex) <= 1;
                const isActive = index === activeIndex;
                const shouldWarmPreload = isActive || (Math.abs(index - activeIndex) === 1 && networkProfile.allowWarmPreload);
                const playbackDuration = isActive && activePlaybackState.videoId === item.id
                  ? Math.max(activePlaybackState.duration, item.duration_ms / 1000)
                  : Math.max(item.duration_ms / 1000, 0);
                const playbackCurrentTime = isActive && activePlaybackState.videoId === item.id ? activePlaybackState.currentTime : 0;
                const playbackProgress = playbackDuration > 0 ? Math.min(playbackCurrentTime / playbackDuration, 1) : 0;
                const descriptionPreview = truncateWords(item.caption, 5);
                const showFullDescription = Boolean(expandedCaptionIds[item.id]);
                const hashtagPreview = item.hashtags.slice(0, 5);
                const showAllHashtags = Boolean(expandedHashtagIds[item.id]);
                const panelOpen = isDesktop && isActive && Boolean(desktopPanel);
                const aspectRatio = getVideoAspectRatio(item);
                const desktopPreset = getDesktopFeedFramePreset(item);
                const mobileFrameCapWidth = aspectRatio >= 0.78 ? 480 : 448;
                const desktopAvailableHeight = Math.max(viewportMetrics.height - 156, 360);
                const mobileAvailableHeight = Math.max(viewportMetrics.height - 156, 380);
                const desktopSquareSize = Math.min(viewportMetrics.width >= 1500 ? 560 : 520, desktopAvailableHeight);
                const desktopPortraitHeight = Math.min(viewportMetrics.width >= 1500 ? 720 : 680, desktopAvailableHeight);
                const desktopFrameWidth = desktopPreset === 'square'
                  ? desktopSquareSize
                  : Math.round((desktopPortraitHeight * 9) / 16);
                const desktopFrameHeight = desktopPreset === 'square'
                  ? desktopSquareSize
                  : desktopPortraitHeight;
                const mobileRawWidth = mobileAvailableHeight * aspectRatio;
                const mobileFrameWidth = Math.min(mobileFrameCapWidth, mobileRawWidth);
                const mobileFrameHeight = mobileFrameWidth / Math.max(aspectRatio, 0.1);
                const desktopPlayerClassName = 'w-fit max-w-full rounded-[24px] bg-black shadow-[0_36px_90px_rgba(0,0,0,0.42)]';
                const mobilePlayerClassName = 'w-fit max-w-full';
                const desktopFrameClassName = 'w-full rounded-[20px] shadow-[0_18px_48px_rgba(0,0,0,0.32)]';
                const mobileFrameClassName = 'w-full rounded-[30px] shadow-[0_42px_94px_rgba(0,0,0,0.56)]';
                const desktopFrameStyle: React.CSSProperties = {
                  width: `${desktopFrameWidth}px`,
                  height: `${desktopFrameHeight}px`
                };
                const mobileFrameStyle: React.CSSProperties = {
                  width: `${mobileFrameWidth}px`,
                  height: `${mobileFrameHeight}px`
                };
                const previewFrameStyle = isDesktop ? desktopFrameStyle : mobileFrameStyle;

                const desktopOverlay = (
                  <div className="relative h-full p-4 sm:p-5" onClick={() => handleVideoClick(item, isActive)}>
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-full border border-white/10 bg-black/42 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/68 backdrop-blur-xl">
                          @{item.channel?.handle || 'pixe'}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setIsMuted((current) => !current);
                          }}
                          className="pointer-events-auto rounded-full border border-white/10 bg-black/42 p-2.5 text-white/82 backdrop-blur-xl transition hover:border-white/18 hover:text-white"
                          aria-label={isMuted ? 'Unmute clip' : 'Mute clip'}
                        >
                          {isMuted ? (
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M5 10h4l5-4v12l-5-4H5Z" />
                              <path d="m17 9 4 6" />
                              <path d="m21 9-4 6" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M5 10h4l5-4v12l-5-4H5Z" />
                              <path d="M18 9a4.5 4.5 0 0 1 0 6" />
                              <path d="M20.5 6.5a8 8 0 0 1 0 11" />
                            </svg>
                          )}
                        </button>
                      </div>

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white shadow-[0_24px_48px_rgba(0,0,0,0.35)] transition ${
                            isActive && activePlaybackState.isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                          }`}
                        >
                          {isActive && activePlaybackState.isPlaying ? (
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                              <rect x="6" y="5" width="4" height="14" rx="1.2" />
                              <rect x="14" y="5" width="4" height="14" rx="1.2" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                              <path d="M8 5.8v12.4a1 1 0 0 0 1.55.83l9.26-6.2a1 1 0 0 0 0-1.66L9.55 4.97A1 1 0 0 0 8 5.8Z" />
                            </svg>
                          )}
                        </div>

                        {likeBurstVideoId === item.id ? (
                          <div className="absolute flex h-24 w-24 items-center justify-center">
                            <span className="absolute h-24 w-24 animate-ping rounded-full bg-white/12" />
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/18 backdrop-blur-lg">
                              <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white text-white">
                                <path d="M12 21s-7-4.35-9.5-8.28C.57 9.93 2.11 5.5 6.3 5.5c2.3 0 3.7 1.29 4.54 2.45.52.72 1.3.72 1.83 0C13.99 6.79 15.39 5.5 17.7 5.5c4.19 0 5.73 4.43 3.8 7.22C19 16.65 12 21 12 21Z" />
                              </svg>
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="absolute inset-x-4 bottom-3 z-20">
                        <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/18">
                          <div
                            className="h-full rounded-full bg-white transition-[width] duration-150"
                            style={{ width: `${Math.max(playbackProgress, 0.015) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );

                const mobileOverlay = (
                  <div className="flex h-full flex-col justify-between p-4 sm:p-5" onClick={() => handleVideoClick(item, isActive)}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-black/42 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                        {mode === 'for_you' ? 'For You' : mode === 'following' ? 'Following' : 'Explore'}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsMuted((current) => !current);
                        }}
                        className="pointer-events-auto rounded-full border border-white/10 bg-black/42 p-2.5 text-white/82 backdrop-blur-xl transition hover:border-white/18 hover:text-white"
                        aria-label={isMuted ? 'Unmute clip' : 'Mute clip'}
                      >
                        {isMuted ? (
                          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M5 10h4l5-4v12l-5-4H5Z" />
                            <path d="m17 9 4 6" />
                            <path d="m21 9-4 6" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M5 10h4l5-4v12l-5-4H5Z" />
                            <path d="M18 9a4.5 4.5 0 0 1 0 6" />
                            <path d="M20.5 6.5a8 8 0 0 1 0 11" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="max-w-[calc(100%-5.5rem)] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,8,8,0.28),rgba(8,8,8,0.66))] px-4 py-4 backdrop-blur-xl shadow-[0_24px_52px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.channel?.avatar_url || '/icons/urbanprime.svg'}
                            alt={item.channel?.display_name || 'Creator'}
                            className="h-10 w-10 rounded-full border border-white/12 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{item.channel?.display_name || 'Creator'}</p>
                            <p className="truncate text-xs text-white/54">@{item.channel?.handle || 'pixe'}</p>
                          </div>
                          {item.channel ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSubscribe(item);
                              }}
                              className="pointer-events-auto rounded-full border border-white/12 bg-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {item.channel.is_subscribed ? 'Following' : 'Follow'}
                            </button>
                          ) : null}
                        </div>

                        {item.title ? (
                          <p className="mt-3 text-base font-semibold text-white" style={clampTextStyle(2)}>
                            {item.title}
                          </p>
                        ) : null}

                        <p className="mt-2 text-sm leading-6 text-white/76">
                          {showFullDescription ? (item.caption || 'No caption added yet.') : (descriptionPreview.text || 'No caption added yet.')}
                        </p>
                        {descriptionPreview.truncated ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedCaptionIds((current) => ({ ...current, [item.id]: !current[item.id] }));
                            }}
                            className="pointer-events-auto mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/76"
                          >
                            {showFullDescription ? 'Show less' : 'Read more'}
                          </button>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(showAllHashtags ? item.hashtags : hashtagPreview).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/72">
                              #{tag}
                            </span>
                          ))}
                          {item.hashtags.length > 5 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedHashtagIds((current) => ({ ...current, [item.id]: !current[item.id] }));
                              }}
                              className="pointer-events-auto rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/72"
                            >
                              {showAllHashtags ? 'Less' : `+${item.hashtags.length - 5}`}
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-white/62">
                          <div className="flex h-8 w-8 animate-[spin_7s_linear_infinite] items-center justify-center rounded-full border border-white/12 bg-white/[0.08]">
                            <img
                              src={item.channel?.avatar_url || '/icons/urbanprime.svg'}
                              alt="Audio"
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          </div>
                          <span className="min-w-0 flex-1 truncate">{getAudioLabel(item)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3">
                        <IconButton label="Like" value={formatCount(item.metrics.likes)} active={item.viewer_state.liked} onClick={() => void handleLike(item)}>
                          <svg viewBox="0 0 24 24" className={`h-6 w-6 ${item.viewer_state.liked ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                            <path d="M12 21s-7-4.35-9.5-8.28C.57 9.93 2.11 5.5 6.3 5.5c2.3 0 3.7 1.29 4.54 2.45.52.72 1.3.72 1.83 0C13.99 6.79 15.39 5.5 17.7 5.5c4.19 0 5.73 4.43 3.8 7.22C19 16.65 12 21 12 21Z" />
                          </svg>
                        </IconButton>
                        <IconButton label="Comments" value={formatCount(item.metrics.comments)} onClick={() => void openComments(item.id)}>
                          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                          </svg>
                        </IconButton>
                        <IconButton label="Share" value={formatCount(item.metrics.shares)} onClick={() => void handleShare(item)}>
                          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                            <path d="M12 16V3" />
                            <path d="m7 8 5-5 5 5" />
                          </svg>
                        </IconButton>
                        <IconButton label="Save" value={formatCount(item.metrics.saves)} active={item.viewer_state.saved} onClick={() => void handleSave(item)}>
                          <svg viewBox="0 0 24 24" className={`h-6 w-6 ${item.viewer_state.saved ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                          </svg>
                        </IconButton>
                        {item.product_tags.length > 0 ? (
                          <IconButton label="Shop" value={formatCount(item.product_tags.length)} onClick={() => navigate(`/pixe/watch/${item.id}`)}>
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 7h12l-1 12H7L6 7Z" />
                              <path d="M9 7a3 3 0 0 1 6 0" />
                            </svg>
                          </IconButton>
                        ) : null}
                      </div>
                    </div>

                    <div className="absolute inset-x-4 bottom-3 z-20">
                      <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/18">
                        <div
                          className="h-full rounded-full bg-white transition-[width] duration-150"
                          style={{ width: `${Math.max(playbackProgress, 0.015) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );

                const previewFrame = (
                  <div
                    className={`relative mx-auto overflow-hidden bg-black ${
                      isDesktop
                        ? 'rounded-[20px] shadow-[0_36px_90px_rgba(0,0,0,0.42)]'
                        : 'rounded-[30px] shadow-[0_42px_94px_rgba(0,0,0,0.56)]'
                    }`}
                    style={previewFrameStyle}
                  >
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title || 'Pixe preview'} className="h-full w-full object-cover opacity-84" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-white/45">Preview</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-black/12 to-black/36" />
                  </div>
                );

                return (
                  <section
                    key={item.id}
                    ref={(node) => {
                      cardRefs.current[item.id] = node;
                    }}
                    data-video-id={item.id}
                    className="relative flex min-h-[calc(100svh-4.85rem)] snap-start items-center justify-center overflow-hidden px-2 pb-4 pt-3 sm:px-3 lg:min-h-[calc(100svh-5.05rem)] lg:px-0 lg:pb-8 lg:pt-6"
                  >
                    <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-[72%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.13),_rgba(255,255,255,0.04)_30%,_transparent_72%)] opacity-70 blur-3xl" />

                    {isDesktop ? (
                      <div
                        className="grid w-full items-center justify-center"
                        style={{
                          gridTemplateColumns: panelOpen
                            ? 'minmax(14.5rem,16rem) minmax(0,auto) minmax(18.5rem,21rem)'
                            : 'minmax(14.5rem,16rem) minmax(0,auto)',
                          gap: '1rem'
                        }}
                      >
                      <aside className="self-center">
                        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                          <div className="flex items-center gap-3">
                            <Link to={item.channel ? `/pixe/channel/${item.channel.handle}` : '/pixe'}>
                              <img
                                src={item.channel?.avatar_url || '/icons/urbanprime.svg'}
                                alt={item.channel?.display_name || 'Creator'}
                                className="h-12 w-12 rounded-full border border-white/12 object-cover"
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link to={item.channel ? `/pixe/channel/${item.channel.handle}` : '/pixe'} className="block truncate text-base font-semibold text-white">
                                {item.channel?.display_name || 'Creator'}
                              </Link>
                              <p className="truncate text-sm text-white/54">@{item.channel?.handle || 'pixe'}</p>
                            </div>
                            {item.channel ? (
                              <button
                                type="button"
                                onClick={() => void handleSubscribe(item)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                  item.channel.is_subscribed
                                    ? 'border border-white/12 bg-white/[0.1] text-white'
                                    : 'border border-transparent bg-[linear-gradient(90deg,rgba(255,255,255,0.98),rgba(214,214,214,0.9))] text-black shadow-[0_12px_28px_rgba(255,255,255,0.14)] hover:scale-[1.02]'
                                }`}
                              >
                                {item.channel.is_subscribed ? 'Following' : 'Follow'}
                              </button>
                            ) : null}
                          </div>

                          {item.title ? (
                            <p className="mt-5 text-xl font-semibold leading-tight text-white" style={clampTextStyle(2)}>
                              {item.title}
                            </p>
                          ) : null}

                          <p className="mt-3 text-sm leading-7 text-white/72">
                            {showFullDescription ? (item.caption || 'No caption added yet.') : (descriptionPreview.text || 'No caption added yet.')}
                          </p>
                          {descriptionPreview.truncated ? (
                            <button
                              type="button"
                              onClick={() => setExpandedCaptionIds((current) => ({ ...current, [item.id]: !current[item.id] }))}
                              className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:text-white"
                            >
                              {showFullDescription ? 'Show less' : 'Read more'}
                            </button>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {(showAllHashtags ? item.hashtags : hashtagPreview).map((tag) => (
                              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/74">
                                #{tag}
                              </span>
                            ))}
                            {item.hashtags.length > 5 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedHashtagIds((current) => ({ ...current, [item.id]: !current[item.id] }))}
                                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/74 transition hover:border-white/18 hover:text-white"
                              >
                                {showAllHashtags ? 'Less' : '... more'}
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 animate-[spin_7s_linear_infinite] items-center justify-center rounded-full border border-white/12 bg-white/[0.06]">
                              <img
                                src={item.channel?.avatar_url || '/icons/urbanprime.svg'}
                                alt="Audio"
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Sound</p>
                              <p className="mt-1 truncate text-sm text-white/72">{getAudioLabel(item)}</p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/54">
                              {formatCount(item.metrics.qualified_views)} views
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/54">
                              {formatDuration(item.duration_ms)}
                            </span>
                          </div>
                        </div>
                      </aside>

                      <div className="flex min-w-0 items-center justify-center gap-3.5">
                        <div className="group relative flex w-fit max-w-full shrink-0 cursor-pointer">
                          {isNear ? (
                            <PixeVideoSurface
                              video={item}
                              active={isActive}
                              muted={isActive ? isMuted : true}
                              autoPlay={isActive}
                              preload={isActive ? 'auto' : shouldWarmPreload ? 'metadata' : 'none'}
                              className={desktopPlayerClassName}
                              frameClassName={desktopFrameClassName}
                              frameStyle={desktopFrameStyle}
                              showLoadingState
                              playerRef={(node) => {
                                setPlayerNode(item.id, node);
                              }}
                              onTimeUpdate={(event: any) => {
                                const player = event.currentTarget;
                                ensureFeedSession(item, player);
                                const session = sessionsRef.current[item.id];
                                if (!session) return;
                                const currentTime = Number(player.currentTime || 0);
                                const duration = Math.max(Number(player.duration || item.duration_ms / 1000 || 1), 1);
                                session.maxProgressRatio = Math.max(session.maxProgressRatio, currentTime / duration);
                                if (isActive) {
                                  setActivePlaybackState({
                                    videoId: item.id,
                                    isPlaying: !player.paused,
                                    currentTime,
                                    duration
                                  });
                                }
                              }}
                              onPlay={() => {
                                if (!isActive) return;
                                ensureFeedSession(item);
                                setActivePlaybackState((current) => ({
                                  videoId: item.id,
                                  isPlaying: true,
                                  currentTime: current.videoId === item.id ? current.currentTime : 0,
                                  duration: current.videoId === item.id && current.duration > 0
                                    ? current.duration
                                    : Math.max(item.duration_ms / 1000, 0)
                                }));
                              }}
                              onPause={() => {
                                if (!isActive) return;
                                const player = playerRefs.current[item.id];
                                setActivePlaybackState({
                                  videoId: item.id,
                                  isPlaying: false,
                                  currentTime: Number(player?.currentTime || 0),
                                  duration: Math.max(Number(player?.duration || item.duration_ms / 1000 || 0), 0)
                                });
                                void syncWatchProgress(item);
                                void flushSession(item);
                              }}
                              overlay={desktopOverlay}
                            />
                          ) : previewFrame}
                        </div>

                        <div className="flex shrink-0 flex-col items-center gap-3">
                            <RailGlyphButton label="Like" value={formatCount(item.metrics.likes)} active={item.viewer_state.liked} onClick={() => void handleLike(item)}>
                              <svg viewBox="0 0 24 24" className={`h-5 w-5 ${item.viewer_state.liked ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                                <path d="M12 21s-7-4.35-9.5-8.28C.57 9.93 2.11 5.5 6.3 5.5c2.3 0 3.7 1.29 4.54 2.45.52.72 1.3.72 1.83 0C13.99 6.79 15.39 5.5 17.7 5.5c4.19 0 5.73 4.43 3.8 7.22C19 16.65 12 21 12 21Z" />
                              </svg>
                            </RailGlyphButton>
                            <RailGlyphButton label="Comment" value={formatCount(item.metrics.comments)} onClick={() => void openComments(item.id)}>
                              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                              </svg>
                            </RailGlyphButton>
                            <RailGlyphButton label="Share" value={formatCount(item.metrics.shares)} onClick={() => toggleDesktopPanel('share')}>
                              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                                <path d="M12 16V3" />
                                <path d="m7 8 5-5 5 5" />
                              </svg>
                            </RailGlyphButton>
                            <RailGlyphButton label="Save" value={formatCount(item.metrics.saves)} active={item.viewer_state.saved} onClick={() => void handleSave(item)}>
                              <svg viewBox="0 0 24 24" className={`h-5 w-5 ${item.viewer_state.saved ? 'fill-white' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                              </svg>
                            </RailGlyphButton>
                            {item.product_tags.length > 0 ? (
                              <RailGlyphButton label="Shop" value={formatCount(item.product_tags.length)} onClick={() => toggleDesktopPanel('products')}>
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 7h12l-1 12H7L6 7Z" />
                                  <path d="M9 7a3 3 0 0 1 6 0" />
                                </svg>
                              </RailGlyphButton>
                            ) : null}
                            <RailGlyphButton
                              label={panelOpen ? 'Close' : 'More'}
                              onClick={() => setDesktopPanel((current) => (current ? null : 'comments'))}
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                <circle cx="5" cy="12" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="19" cy="12" r="1.8" />
                              </svg>
                            </RailGlyphButton>
                            {item.channel ? (
                              <Link
                                to={`/pixe/channel/${item.channel.handle}`}
                                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/26 shadow-[0_16px_34px_rgba(0,0,0,0.24)] transition hover:border-white/18"
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Open ${item.channel.display_name || item.channel.handle} channel`}
                              >
                                <img
                                  src={item.channel.avatar_url || '/icons/urbanprime.svg'}
                                  alt={item.channel.display_name || item.channel.handle || 'Channel'}
                                  className="h-full w-full object-cover"
                                />
                              </Link>
                            ) : null}
                        </div>
                      </div>

                      <div className={`min-w-0 overflow-hidden transition-all duration-300 ${panelOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'}`}>
                        <div className={`${panelOpen ? 'w-full' : 'w-0'} h-[calc(100svh-10.7rem)] max-w-[22rem]`}>
                          {isActive ? renderDesktopPanel() : null}
                        </div>
                      </div>
                    </div>
                    ) : (
                    <div className="flex w-full items-center justify-center">
                      <div className="group relative flex w-fit max-w-full cursor-pointer">
                        {isNear ? (
                          <PixeVideoSurface
                            video={item}
                            active={isActive}
                            muted={isActive ? isMuted : true}
                            autoPlay={isActive}
                            preload={isActive ? 'auto' : shouldWarmPreload ? 'metadata' : 'none'}
                            className={mobilePlayerClassName}
                            frameClassName={mobileFrameClassName}
                            frameStyle={mobileFrameStyle}
                            showLoadingState
                            playerRef={(node) => {
                              setPlayerNode(item.id, node);
                            }}
                            onTimeUpdate={(event: any) => {
                              const player = event.currentTarget;
                              ensureFeedSession(item, player);
                              const session = sessionsRef.current[item.id];
                              if (!session) return;
                              const currentTime = Number(player.currentTime || 0);
                              const duration = Math.max(Number(player.duration || item.duration_ms / 1000 || 1), 1);
                              session.maxProgressRatio = Math.max(session.maxProgressRatio, currentTime / duration);
                              if (isActive) {
                                setActivePlaybackState({
                                  videoId: item.id,
                                  isPlaying: !player.paused,
                                  currentTime,
                                  duration
                                });
                              }
                            }}
                            onPlay={() => {
                              if (!isActive) return;
                              ensureFeedSession(item);
                              setActivePlaybackState((current) => ({
                                videoId: item.id,
                                isPlaying: true,
                                currentTime: current.videoId === item.id ? current.currentTime : 0,
                                duration: current.videoId === item.id && current.duration > 0
                                  ? current.duration
                                  : Math.max(item.duration_ms / 1000, 0)
                              }));
                            }}
                            onPause={() => {
                              if (!isActive) return;
                              const player = playerRefs.current[item.id];
                              setActivePlaybackState({
                                videoId: item.id,
                                isPlaying: false,
                                currentTime: Number(player?.currentTime || 0),
                                duration: Math.max(Number(player?.duration || item.duration_ms / 1000 || 0), 0)
                              });
                              void syncWatchProgress(item);
                              void flushSession(item);
                            }}
                            overlay={mobileOverlay}
                          />
                        ) : previewFrame}
                      </div>
                    </div>
                    )}
                  </section>
                );
              })}

              {loadingMore ? (
                <PixeInlineSkeleton className="mx-auto h-20 max-w-[20rem]" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <PixeCommentSheet
        open={Boolean(commentVideoId)}
        video={commentVideo}
        comments={comments}
        loading={commentsLoading}
        onClose={() => setCommentVideoId(null)}
        onSubmit={async (body) => {
          if (!commentVideoId) return;
          const video = items.find((item) => item.id === commentVideoId);
          if (!video) return;
          await submitComment(video, body, null);
        }}
      />
    </>
  );
};

export default PixeFeedExperience;
