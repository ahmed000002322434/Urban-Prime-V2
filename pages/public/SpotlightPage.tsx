import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightService, type SpotlightComment, type SpotlightCreator, type SpotlightFeedMode, type SpotlightItem } from '../../services/spotlightService';

const TABS: Array<{ id: SpotlightFeedMode; label: string }> = [
  { id: 'for_you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' }
];

const formatCompact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');

const SpotlightCard: React.FC<{
  item: SpotlightItem;
  canModerate: boolean;
  videoPreload: 'none' | 'metadata' | 'auto';
  onLike: (item: SpotlightItem) => void;
  onSave: (item: SpotlightItem) => void;
  onShare: (item: SpotlightItem) => void;
  onComment: (item: SpotlightItem) => void;
  onFollow: (creator: SpotlightCreator) => void;
  onReport: (item: SpotlightItem) => void;
  onBlockCreator: (creator: SpotlightCreator) => void;
  onTrackView: (item: SpotlightItem, watchTimeMs: number, visibleRatio: number) => void;
}> = ({ item, canModerate, videoPreload, onLike, onSave, onShare, onComment, onFollow, onReport, onBlockCreator, onTrackView }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tapRef = useRef(0);
  const viewTimerRef = useRef<number | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || trackedRef.current) return undefined;
    const requiredMs = item.media_type === 'video' ? 2500 : 1500;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio || 0;
        if (entry.isIntersecting && ratio >= 0.6) {
          if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
          viewTimerRef.current = window.setTimeout(() => {
            trackedRef.current = true;
            onTrackView(item, requiredMs, ratio);
          }, requiredMs);
        } else if (viewTimerRef.current) {
          window.clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      },
      { threshold: [0.6] }
    );
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
    };
  }, [item, onTrackView]);

  const handleMediaClick = () => {
    const now = Date.now();
    if (now - tapRef.current <= 280) onLike(item);
    tapRef.current = now;
  };

  return (
    <article ref={containerRef} className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#121212]/80">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={safeAvatar(item.creator?.avatar_url)} alt={item.creator?.name || 'Creator'} className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.creator?.name || 'Creator'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.published_at || item.created_at).toLocaleString()}</p>
          </div>
        </div>
        {item.creator && (
          <button onClick={() => onFollow(item.creator!)} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black">
            Follow
          </button>
        )}
      </header>

      <button className="group relative mb-3 block w-full overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5" onClick={handleMediaClick}>
        {item.media_type === 'video' ? (
          <video
            className="max-h-[70vh] w-full rounded-2xl object-cover"
            src={item.media_url}
            poster={item.thumbnail_url || undefined}
            preload={videoPreload}
            controls
            muted
            playsInline
          />
        ) : (
          <img className="max-h-[70vh] w-full rounded-2xl object-cover" src={item.media_url} alt={item.caption || 'Spotlight post'} loading="lazy" />
        )}
      </button>

      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => onLike(item)} className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-300">
          Like {formatCompact(item.metrics.likes)}
        </button>
        <button onClick={() => onComment(item)} className="rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-300">
          Comments {formatCompact(item.metrics.comments)}
        </button>
        <button onClick={() => onSave(item)} className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Save {formatCompact(item.metrics.saves)}
        </button>
        <button onClick={() => onShare(item)} className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
          Share {formatCompact(item.metrics.shares)}
        </button>
      </div>

      {item.caption && <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{item.caption}</p>}
      {canModerate && item.creator ? (
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => onReport(item)} className="text-xs font-semibold text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-300">
            Report
          </button>
          <button onClick={() => onBlockCreator(item.creator!)} className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Block
          </button>
        </div>
      ) : null}
    </article>
  );
};

const CommentNode: React.FC<{
  comment: SpotlightComment;
  depth?: number;
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}> = ({ comment, depth = 0, onLike, onReply, onDelete }) => (
  <div className={`rounded-xl bg-gray-100/90 p-2 text-xs dark:bg-white/10 ${depth > 0 ? 'ml-4 mt-2' : ''}`}>
    <p className="font-semibold text-gray-900 dark:text-white">{comment.user?.name || 'User'}</p>
    <p className="text-gray-700 dark:text-gray-200">{comment.body}</p>
    <div className="mt-1 flex items-center gap-2">
      <button onClick={() => onLike(comment.id)} className="text-[11px] text-sky-600 dark:text-sky-300">Like {comment.like_count}</button>
      <button onClick={() => onReply(comment.id)} className="text-[11px] text-violet-600 dark:text-violet-300">Reply</button>
      {comment.can_delete ? <button onClick={() => onDelete(comment.id)} className="text-[11px] text-rose-600 dark:text-rose-300">Delete</button> : null}
    </div>
    {Array.isArray(comment.replies) ? comment.replies.map((reply) => (
      <CommentNode key={reply.id} comment={reply} depth={depth + 1} onLike={onLike} onReply={onReply} onDelete={onDelete} />
    )) : null}
  </div>
);

const SpotlightPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const { id: postId } = useParams();

  const [mode, setMode] = useState<SpotlightFeedMode>('for_you');
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeItem, setActiveItem] = useState<SpotlightItem | null>(null);
  const [comments, setComments] = useState<SpotlightComment[]>([]);
  const [commentSort, setCommentSort] = useState<'top' | 'new'>('top');
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<SpotlightCreator[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  const viewSentRef = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => `spotlight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  const mergeItems = (incoming: SpotlightItem[], reset: boolean) => {
    setItems((prev) => {
      if (reset) seenIdsRef.current.clear();
      const list = reset ? [] : [...prev];
      incoming.forEach((item) => {
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);
        list.push(item);
      });
      return list;
    });
  };

  const loadFeed = useCallback(async (reset = false) => {
    if (postId) return;
    if (reset) setIsLoading(true); else setIsLoadingMore(true);
    try {
      const payload = await spotlightService.getFeed({
        mode,
        cursor: reset ? null : nextCursor,
        limit: 20,
        viewerFirebaseUid: user?.id
      });
      mergeItems(payload.items, reset);
      setNextCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
    } catch (error: any) {
      showNotification(error?.message || 'Failed to load Spotlight feed.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [mode, nextCursor, postId, user?.id]);

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    void loadFeed(true);
  }, [mode, postId, user?.id]);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    spotlightService
      .getContent(postId, user?.id)
      .then((item) => setItems(item ? [item] : []))
      .catch((error) => showNotification(error?.message || 'Failed to load post.'))
      .finally(() => setIsLoading(false));
  }, [postId, user?.id]);

  useEffect(() => {
    if (!hasMore || postId) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isLoadingMore) void loadFeed(false);
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadFeed, postId]);

  useEffect(() => {
    spotlightService.getSuggestedUsers(user?.id).then(setSuggestedUsers).catch(() => undefined);
  }, [user?.id]);

  const refreshComments = async (contentId: string, sort: 'top' | 'new') => {
    const nextComments = await spotlightService.getComments(contentId, sort, user?.id);
    setComments(nextComments);
  };

  const mutateItemMetrics = (contentId: string, mutator: (item: SpotlightItem) => SpotlightItem) => {
    setItems((prev) => prev.map((item) => (item.id === contentId ? mutator(item) : item)));
  };

  const handleTrackView = async (item: SpotlightItem, watchTimeMs: number, visibleRatio: number) => {
    const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
    const dedupeKey = `${item.id}:${bucket}`;
    if (viewSentRef.current.has(dedupeKey)) return;
    viewSentRef.current.add(dedupeKey);
    try {
      await spotlightService.trackView({
        content_id: item.id,
        media_type: item.media_type,
        watch_time_ms: watchTimeMs,
        visible_ratio: visibleRatio,
        session_id: sessionId,
        viewer_firebase_uid: user?.id
      });
      mutateItemMetrics(item.id, (prev) => ({ ...prev, metrics: { ...prev.metrics, views: prev.metrics.views + 1 } }));
    } catch {
      // non-blocking
    }
  };

  const ensureAuth = () => {
    if (user) return true;
    openAuthModal('login');
    return false;
  };

  const handleLike = async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    try {
      const result = await spotlightService.likeContent(item.id);
      mutateItemMetrics(item.id, (prev) => ({ ...prev, metrics: { ...prev.metrics, likes: result.likes } }));
    } catch (error: any) {
      showNotification(error?.message || 'Unable to like post.');
    }
  };

  const handleSave = async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    try {
      const result = await spotlightService.saveContent(item.id);
      mutateItemMetrics(item.id, (prev) => ({ ...prev, metrics: { ...prev.metrics, saves: result.saves } }));
      showNotification(result.saved ? 'Saved.' : 'Removed from saved.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to save post.');
    }
  };

  const handleShare = async (item: SpotlightItem) => {
    const result = await spotlightService.shareContent(item.id).catch(() => null);
    if (result) {
      mutateItemMetrics(item.id, (prev) => ({ ...prev, metrics: { ...prev.metrics, shares: result.shares } }));
    }
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${window.location.origin}/spotlight/post/${item.id}`);
    }
    showNotification('Share link copied.');
  };

  const handleFollow = async (creator: SpotlightCreator) => {
    if (!ensureAuth()) return;
    await spotlightService.followCreator(creator.firebase_uid).catch((error) => showNotification(error?.message || 'Follow failed.'));
  };

  const handleReportContent = async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    const reason = window.prompt('Reason for report (required):', 'spam');
    if (!reason || !reason.trim()) return;
    await spotlightService.reportContent({ content_id: item.id, reason: reason.trim() }).then(() => {
      showNotification('Report submitted.');
    }).catch((error) => showNotification(error?.message || 'Unable to submit report.'));
  };

  const handleBlockCreator = async (creator: SpotlightCreator) => {
    if (!ensureAuth()) return;
    const confirmed = window.confirm(`Block ${creator.name}? Their content and comments will be hidden.`);
    if (!confirmed) return;
    await spotlightService.blockUser({ targetUserId: creator.id }).then(() => {
      setItems((prev) => prev.filter((item) => item.creator_user_id !== creator.id));
      showNotification(`${creator.name} has been blocked.`);
    }).catch((error) => showNotification(error?.message || 'Unable to block user.'));
  };

  const handleOpenComments = (item: SpotlightItem) => { setActiveItem(item); setReplyToId(null); setCommentSort('top'); void refreshComments(item.id, 'top'); };

  const handleLikeComment = (commentId: string) => {
    if (!activeItem) return;
    void spotlightService
      .likeComment(commentId)
      .then(() => refreshComments(activeItem.id, commentSort))
      .catch(() => undefined);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activeItem) return;
    void spotlightService
      .deleteComment(commentId)
      .then(async () => {
        mutateItemMetrics(activeItem.id, (prev) => ({
          ...prev,
          metrics: { ...prev.metrics, comments: Math.max(0, Number(prev.metrics.comments || 0) - 1) }
        }));
        await refreshComments(activeItem.id, commentSort);
      })
      .catch(() => undefined);
  };

  const handleSubmitComment = async () => {
    if (!activeItem || !ensureAuth()) return;
    if (!commentText.trim()) return;
    try {
      await spotlightService.addComment(activeItem.id, commentText.trim(), replyToId);
      setCommentText('');
      setReplyToId(null);
      mutateItemMetrics(activeItem.id, (prev) => ({
        ...prev,
        metrics: { ...prev.metrics, comments: Number(prev.metrics.comments || 0) + 1 }
      }));
      await refreshComments(activeItem.id, commentSort);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to post comment.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0,_#f8fafc_45%,_#ffffff_100%)] pb-20 pt-24 dark:bg-[radial-gradient(circle_at_top,_#1f2937_0,_#0b0f17_50%,_#05070b_100%)]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#101826]/70">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Prime Spotlight</h1>
              {user ? <Link to="/spotlight/create" className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black">Create</Link> : null}
            </div>
            <div className="flex gap-2">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setMode(tab.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white/70 text-gray-700 hover:bg-white dark:bg-white/10 dark:text-gray-200'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? <div className="rounded-3xl border border-white/50 bg-white/80 p-10 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-[#121212]/80 dark:text-gray-300">Loading Spotlight...</div> : null}
          {!isLoading && items.length === 0 ? <div className="rounded-3xl border border-white/50 bg-white/80 p-10 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-[#121212]/80 dark:text-gray-300">No Spotlight content yet.</div> : null}

          {items.map((item, index) => (
            <SpotlightCard
              key={item.id}
              item={item}
              canModerate={Boolean(user)}
              videoPreload={index < 3 ? 'auto' : 'metadata'}
              onLike={handleLike}
              onSave={handleSave}
              onShare={handleShare}
              onComment={handleOpenComments}
              onFollow={handleFollow}
              onReport={handleReportContent}
              onBlockCreator={handleBlockCreator}
              onTrackView={handleTrackView}
            />
          ))}
          <div ref={sentinelRef} />
        </section>

        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#101826]/70">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Suggested Creators</h2>
            <div className="space-y-3">
              {suggestedUsers.map((creator) => (
                <div key={creator.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img src={safeAvatar(creator.avatar_url)} alt={creator.name} className="h-8 w-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{creator.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatCompact(creator.followers_count)} followers</p>
                    </div>
                  </div>
                  <button onClick={() => handleFollow(creator)} className="rounded-full bg-black px-3 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-black">Follow</button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {activeItem && (
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-3xl rounded-t-3xl border border-white/50 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/95">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Comments</h3>
            <div className="flex items-center gap-2">
              <button className={`rounded-full px-3 py-1 text-xs ${commentSort === 'top' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'}`} onClick={() => { setCommentSort('top'); void refreshComments(activeItem.id, 'top'); }}>Top</button>
              <button className={`rounded-full px-3 py-1 text-xs ${commentSort === 'new' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'}`} onClick={() => { setCommentSort('new'); void refreshComments(activeItem.id, 'new'); }}>New</button>
              <button className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-300" onClick={() => setActiveItem(null)}>Close</button>
            </div>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <CommentNode key={comment.id} comment={comment} onLike={handleLikeComment} onReply={setReplyToId} onDelete={handleDeleteComment} />
            ))}
          </div>
          {replyToId ? (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <span>Replying to comment</span>
              <button onClick={() => setReplyToId(null)} className="font-semibold">Cancel</button>
            </div>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyToId ? 'Write a reply...' : 'Write a comment...'} className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-black dark:border-white/10 dark:bg-white/10 dark:text-white" />
            <button onClick={handleSubmitComment} className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotlightPage;
