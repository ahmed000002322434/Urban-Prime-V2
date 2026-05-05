import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import {
  spotlightService,
  type SpotlightComment,
  type SpotlightCreator,
  type SpotlightFeedMode,
  type SpotlightItem,
  type SpotlightProductLink
} from '../../services/spotlightService';
import { spotlightRealtime } from '../../services/spotlightRealtime';
import { buildSpotlightAttribution, buildSpotlightItemHref } from '../../utils/spotlightCommerce';

const TABS: Array<{ id: SpotlightFeedMode; label: string; detail: string }> = [
  { id: 'for_you', label: 'For You', detail: 'Best matches from the Spotlight graph.' },
  { id: 'following', label: 'Following', detail: 'Latest drops from creators you track.' },
  { id: 'trending', label: 'Trending', detail: 'What is moving hard across Spotlight right now.' }
];

const motionEase = [0.22, 1, 0.36, 1] as const;
const headingFontStyle = { fontFamily: 'Inter, "Segoe UI", sans-serif' } as const;

const panelClass =
  'rounded-[26px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(16,17,20,0.97),rgba(7,8,10,0.95))] shadow-[0_24px_56px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[20px]';
const mutedPanelClass =
  'rounded-[22px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(19,20,24,0.92),rgba(8,9,11,0.94))] shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[16px]';
const insetStripClass =
  'rounded-[18px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.024),rgba(255,255,255,0.012))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';
const darkButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/74 transition duration-200 hover:bg-white/[0.06] hover:text-white';
const solidButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_14px_26px_rgba(255,255,255,0.08)] transition duration-200 hover:brightness-95';

type FeedTrend = {
  key: string;
  label: string;
  hits: number;
  kind: 'hashtag' | 'topic';
};

const formatCompact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, 'day');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const normalizeToken = (value: string) => value.replace(/^#+/, '').trim().toLowerCase();

const HomeFeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M12 3 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="m12 3 2.7 5.9 6.4.9-4.7 4.4 1.2 6.5L12 17.6 6.4 20.7l1.2-6.5L3 9.8l6.4-.9Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M13.7 3.5c.1 3.2-1.3 4.7-2.8 6.3-1.4 1.4-2.8 2.9-2.8 5.5a4 4 0 0 0 8 0c0-1.8-.9-3.1-1.7-4.4-.8-1.2-1.6-2.4-1.4-4.2.1-1.1.4-2.1.7-3.2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 16.1c0 1.5 1 2.6 2.5 2.6s2.5-1.1 2.5-2.6c0-1-.4-1.8-1.2-2.8-.2 1-.8 1.8-1.8 2.4-.9.5-1.4 1.1-1.4 2.4Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M12 20.3 4.9 13.2a4.7 4.7 0 1 1 6.6-6.6l.5.5.5-.5a4.7 4.7 0 0 1 6.6 6.6Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M4 5.5h16v10.2H8.3L4 19Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M7 4.5h10v15l-5-3.4-5 3.4Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m10 14 9-9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 14.5v3a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 10h10" strokeLinecap="round" />
    <path d="m10 6 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-[18px] w-[18px]">
    <path d="M4 16.5 9.2 11l3.3 3.2 7.5-8.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 6v4h-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VerifiedBadge = () => (
  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/10 text-white/90">
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <path d="M8 1.7 9.6 3l2-.1.7 1.8 1.6 1-.4 2 1 1.6-1 1.6.4 2-1.6 1-.7 1.8-2-.1L8 14.3l-1.6 1.3-2-.1-.7-1.8-1.6-1 .4-2-1-1.6 1-1.6-.4-2 1.6-1 .7-1.8 2 .1L8 1.7Z" fill="currentColor" opacity=".18" />
      <path d="m5.6 8 1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const ProfileAvatar: React.FC<{
  src?: string;
  label: string;
  className?: string;
}> = ({ src, label, className = 'h-11 w-11' }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={label}
        onError={() => setHasError(true)}
        className={`${className} rounded-full object-cover shadow-[0_12px_24px_rgba(0,0,0,0.28)]`}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_44%,rgba(255,255,255,0)_78%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.016))] text-xs font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.28)]`}
    >
      {initials || 'UP'}
    </div>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, label, count, active = false, disabled = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200 ${
      active
        ? 'bg-white text-black shadow-[0_12px_24px_rgba(255,255,255,0.08)]'
        : 'border border-white/[0.06] bg-white/[0.03] text-white/68 hover:bg-white/[0.06] hover:text-white'
    } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
  >
    <span className={active ? 'text-black' : 'text-white/78'}>{icon}</span>
    <span>{label}</span>
    {typeof count === 'number' ? <span className={active ? 'text-black/62' : 'text-white/46'}>{formatCompact(count)}</span> : null}
  </button>
);

const CommentNode: React.FC<{
  comment: SpotlightComment;
  depth?: number;
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}> = ({ comment, depth = 0, onLike, onReply, onDelete }) => (
  <div className={`${insetStripClass} p-3 ${depth > 0 ? 'ml-4 mt-2' : ''}`}>
    <div className="flex items-start gap-3">
      <ProfileAvatar src={safeAvatar(comment.user?.avatar_url)} label={comment.user?.name || 'User'} className="h-9 w-9" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{comment.user?.name || 'User'}</p>
          {comment.user?.is_verified ? <VerifiedBadge /> : null}
          <span className="text-xs text-white/34">{formatRelativeTime(comment.created_at)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/72">{comment.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onLike(comment.id)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/62 transition hover:bg-white/[0.08] hover:text-white">
            Like {formatCompact(comment.like_count)}
          </button>
          <button type="button" onClick={() => onReply(comment.id)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/62 transition hover:bg-white/[0.08] hover:text-white">
            Reply
          </button>
          {comment.can_delete ? (
            <button type="button" onClick={() => onDelete(comment.id)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/12">
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
    {Array.isArray(comment.replies) ? comment.replies.map((reply) => (
      <CommentNode key={reply.id} comment={reply} depth={depth + 1} onLike={onLike} onReply={onReply} onDelete={onDelete} />
    )) : null}
  </div>
);

const SpotlightFeedCard: React.FC<{
  item: SpotlightItem;
  liked: boolean;
  saved: boolean;
  following: boolean;
  onLike: (item: SpotlightItem) => void;
  onSave: (item: SpotlightItem) => void;
  onShare: (item: SpotlightItem) => void;
  onComment: (item: SpotlightItem) => void;
  onFollow: (creator: SpotlightCreator) => void;
  onReport: (item: SpotlightItem) => void;
  onBlockCreator: (creator: SpotlightCreator) => void;
  onOpenProduct: (item: SpotlightItem, product: SpotlightProductLink) => void;
  onTrackProductImpressions: (item: SpotlightItem) => void;
  onTrackView: (item: SpotlightItem, watchTimeMs: number, visibleRatio: number) => void;
}> = ({
  item,
  liked,
  saved,
  following,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
  onReport,
  onBlockCreator,
  onOpenProduct,
  onTrackProductImpressions,
  onTrackView
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const tapRef = useRef(0);
  const viewTimerRef = useRef<number | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!cardRef.current || trackedRef.current) return undefined;
    const requiredMs = item.media_type === 'video' ? 2500 : 1500;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio || 0;
        if (entry.isIntersecting && ratio >= 0.6) {
          onTrackProductImpressions(item);
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

    observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
      if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
    };
  }, [item, onTrackProductImpressions, onTrackView]);

  const creator = item.creator;
  const creatorName = creator?.name || 'Creator';
  const profileHref = creator?.username ? `/spotlight/profile/${encodeURIComponent(creator.username)}` : '/spotlight/profile';
  const productChips = (item.products || []).filter((product) => product.placement === 'inline_chip' || product.placement === 'mini_card').slice(0, 3);
  const hashtags = item.hashtags.slice(0, 4).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  const topics = item.interest_tags.slice(0, 2);

  const handleImageTap = () => {
    const now = Date.now();
    if (now - tapRef.current <= 280) onLike(item);
    tapRef.current = now;
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: motionEase }}
      whileHover={{ y: -2 }}
      className={`${panelClass} overflow-hidden p-4 sm:p-5`}
    >
      <div className="flex items-start gap-3">
        <Link to={profileHref} className="shrink-0">
          <ProfileAvatar src={safeAvatar(creator?.avatar_url)} label={creatorName} className="h-12 w-12" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={profileHref} className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white transition hover:text-white/80">
                  {creatorName}
                </Link>
                {creator?.is_verified ? <VerifiedBadge /> : null}
                <span className="truncate text-sm text-white/34">{formatRelativeTime(item.published_at || item.created_at)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/36">
                <span>{formatCompact(item.metrics.views)} views</span>
                <span className="h-1 w-1 rounded-full bg-white/18" />
                <span>{formatCompact(item.metrics.engagement_rate || 0)}% engagement</span>
              </div>
            </div>

            {creator ? (
              <button
                type="button"
                onClick={() => onFollow(creator)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition duration-200 ${
                  following
                    ? 'border border-white/[0.08] bg-white/[0.05] text-white/72 hover:bg-white/[0.08] hover:text-white'
                    : 'bg-white text-black shadow-[0_16px_28px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 hover:brightness-95'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>

          {item.caption ? (
            <p className="mt-3 text-[15px] leading-7 text-white/78">
              {item.caption}
            </p>
          ) : null}

          {(hashtags.length > 0 || topics.length > 0) ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <span key={`${item.id}-${tag}`} className="rounded-full border border-sky-300/12 bg-sky-300/[0.08] px-3 py-1.5 text-xs font-semibold text-sky-100/82">
                  {tag}
                </span>
              ))}
              {topics.map((topic) => (
                <span key={`${item.id}-${topic}`} className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/58">
                  {topic}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-[26px] border border-white/[0.05] bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            {item.media_type === 'video' ? (
              <video
                className="max-h-[620px] w-full object-cover"
                src={item.media_url}
                poster={item.thumbnail_url || undefined}
                preload="metadata"
                controls
                playsInline
                muted
              />
            ) : (
              <button type="button" onClick={handleImageTap} className="block w-full">
                <img className="max-h-[620px] w-full object-cover" src={item.media_url} alt={item.caption || 'Spotlight post'} loading="lazy" />
              </button>
            )}
          </div>

          {productChips.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {productChips.map((product: SpotlightProductLink) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onOpenProduct(item, product)}
                  className="rounded-full border border-white/[0.06] bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white"
                >
                  {product.cta_label || product.title}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ActionButton icon={<HeartIcon />} label="Like" count={item.metrics.likes} active={liked} onClick={() => onLike(item)} />
            <ActionButton icon={<CommentIcon />} label="Comment" count={item.metrics.comments} disabled={!item.allow_comments} onClick={() => onComment(item)} />
            <ActionButton icon={<BookmarkIcon />} label="Save" count={item.metrics.saves} active={saved} onClick={() => onSave(item)} />
            <ActionButton icon={<ShareIcon />} label="Share" count={item.metrics.shares} onClick={() => onShare(item)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/34">
              <span>{item.allow_comments ? 'Replies open' : 'Replies off'}</span>
              <span className="h-1 w-1 rounded-full bg-white/18" />
              <span>{item.visibility}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {creator ? (
                <button type="button" onClick={() => onBlockCreator(creator)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/54 transition hover:bg-white/[0.08] hover:text-white">
                  Block
                </button>
              ) : null}
              <button type="button" onClick={() => onReport(item)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/54 transition hover:bg-white/[0.08] hover:text-white">
                Report
              </button>
              <Link to={`/spotlight/post/${item.id}`} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/66 transition hover:bg-white/[0.08] hover:text-white">
                <span>Open thread</span>
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const SpotlightHomeFeed: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SpotlightFeedMode>('for_you');
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeItem, setActiveItem] = useState<SpotlightItem | null>(null);
  const [comments, setComments] = useState<SpotlightComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentSort, setCommentSort] = useState<'top' | 'new'>('top');
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<SpotlightCreator[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(() => new Set());
  const seenIdsRef = useRef(new Set<string>());
  const viewSentRef = useRef(new Set<string>());
  const productImpressionSentRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<number | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => `spotlight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  const viewerName = String(user?.name || 'Urban Prime Creator').trim() || 'Urban Prime Creator';
  const avatarSrc = String((user as { avatar?: string; photoURL?: string } | null)?.avatar || (user as { avatar?: string; photoURL?: string } | null)?.photoURL || '').trim();
  const activeTab = TABS.find((tab) => tab.id === mode) || TABS[0];

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const mergeItems = useCallback((incoming: SpotlightItem[], reset: boolean) => {
    setItems((prev) => {
      if (reset) seenIdsRef.current.clear();
      const next = reset ? [] : [...prev];
      incoming.forEach((item) => {
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);
        next.push(item);
      });
      return next;
    });
  }, []);

  const ensureAuth = useCallback(() => {
    if (user) return true;
    openAuthModal('login');
    return false;
  }, [openAuthModal, user]);

  const loadFeed = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (!reset && (loadingMoreRef.current || !hasMoreRef.current || !cursor)) return;
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const payload = await spotlightService.getFeed({
        mode,
        cursor: reset ? null : cursor,
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
  }, [mergeItems, mode, showNotification, user?.id]);

  const scheduleFeedRefresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      setItems([]);
      setNextCursor(null);
      setHasMore(true);
      void loadFeed(true, null);
    }, 500);
  }, [loadFeed]);

  useEffect(() => {
    const unsubscribe = spotlightRealtime.subscribeFeed(() => {
      scheduleFeedRefresh();
    }, { fallbackMs: 45000 });
    return () => {
      unsubscribe();
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [scheduleFeedRefresh]);

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setActiveItem(null);
    setComments([]);
    void loadFeed(true, null);
  }, [loadFeed]);

  useEffect(() => {
    if (!hasMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isLoading && !isLoadingMore) {
        void loadFeed(false, nextCursor);
      }
    }, { rootMargin: '320px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadFeed, nextCursor]);

  useEffect(() => {
    spotlightService.getSuggestedUsers(user?.id).then((creators) => {
      setSuggestedUsers(creators);
      setFollowedCreatorIds((current) => {
        const next = new Set(current);
        creators.forEach((creator) => {
          if (creator.is_following) next.add(creator.firebase_uid);
        });
        return next;
      });
    }).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    setFollowedCreatorIds((current) => {
      const next = new Set(current);
      items.forEach((item) => {
        if (item.creator?.is_following) next.add(item.creator.firebase_uid);
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!activeItem) return;
    const next = items.find((item) => item.id === activeItem.id);
    if (next && next !== activeItem) setActiveItem(next);
  }, [activeItem, items]);

  const refreshComments = useCallback(async (contentId: string, sort: 'top' | 'new') => {
    setIsCommentsLoading(true);
    try {
      const nextComments = await spotlightService.getComments(contentId, sort, user?.id);
      setComments(nextComments);
    } finally {
      setIsCommentsLoading(false);
    }
  }, [user?.id]);

  const mutateItemMetrics = useCallback((contentId: string, mutator: (item: SpotlightItem) => SpotlightItem) => {
    setItems((prev) => prev.map((item) => (item.id === contentId ? mutator(item) : item)));
  }, []);

  const handleTrackView = useCallback(async (item: SpotlightItem, watchTimeMs: number, visibleRatio: number) => {
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

      mutateItemMetrics(item.id, (previous) => ({
        ...previous,
        metrics: { ...previous.metrics, views: previous.metrics.views + 1 }
      }));
    } catch {
      // Non-blocking feed telemetry.
    }
  }, [mutateItemMetrics, sessionId, user?.id]);

  const handleTrackProductImpressions = useCallback((item: SpotlightItem) => {
    const products = (item.products || []).filter((product) => product.item_id).slice(0, 4);
    products.forEach((product) => {
      const impressionKey = `${item.id}:${product.id}`;
      if (productImpressionSentRef.current.has(impressionKey)) return;
      productImpressionSentRef.current.add(impressionKey);
      void spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'impression',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        metadata: {
          source: 'spotlight_feed',
          placement: product.placement
        }
      }).catch(() => undefined);
    });
  }, [user?.id]);

  const handleOpenProduct = useCallback(async (item: SpotlightItem, product: SpotlightProductLink) => {
    const attribution = buildSpotlightAttribution(item, product);
    try {
      await spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'click',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        metadata: {
          source: 'spotlight_feed',
          placement: product.placement
        }
      });
    } catch {
      // Navigation should still continue even if tracking fails.
    }
    navigate(buildSpotlightItemHref(product.item_id, attribution));
  }, [navigate, user?.id]);

  const handleLike = useCallback(async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    try {
      const result = await spotlightService.likeContent(item.id);
      mutateItemMetrics(item.id, (previous) => ({
        ...previous,
        metrics: { ...previous.metrics, likes: result.likes }
      }));
      setLikedIds((current) => {
        const next = new Set(current);
        if (result.liked) next.add(item.id); else next.delete(item.id);
        return next;
      });
    } catch (error: any) {
      showNotification(error?.message || 'Unable to like post.');
    }
  }, [ensureAuth, mutateItemMetrics, showNotification]);

  const handleSave = useCallback(async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    try {
      const result = await spotlightService.saveContent(item.id);
      mutateItemMetrics(item.id, (previous) => ({
        ...previous,
        metrics: { ...previous.metrics, saves: result.saves }
      }));
      setSavedIds((current) => {
        const next = new Set(current);
        if (result.saved) next.add(item.id); else next.delete(item.id);
        return next;
      });
      showNotification(result.saved ? 'Saved.' : 'Removed from saved.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to save post.');
    }
  }, [ensureAuth, mutateItemMetrics, showNotification]);

  const handleShare = useCallback(async (item: SpotlightItem) => {
    try {
      const result = await spotlightService.shareContent(item.id).catch(() => null);
      if (result) {
        mutateItemMetrics(item.id, (previous) => ({
          ...previous,
          metrics: { ...previous.metrics, shares: result.shares }
        }));
      }

      const shareUrl = `${window.location.origin}/spotlight/post/${item.id}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Share link copied.');
      } else {
        showNotification(shareUrl);
      }
    } catch {
      showNotification('Unable to copy share link.');
    }
  }, [mutateItemMetrics, showNotification]);

  const handleFollow = useCallback(async (creator: SpotlightCreator) => {
    if (!ensureAuth()) return;
    try {
      const result = await spotlightService.followCreator(creator.firebase_uid);
      setFollowedCreatorIds((current) => {
        const next = new Set(current);
        if (result.following) next.add(creator.firebase_uid); else next.delete(creator.firebase_uid);
        return next;
      });
      setSuggestedUsers((current) => current.map((entry) => (
        entry.firebase_uid === creator.firebase_uid ? { ...entry, is_following: result.following } : entry
      )));
      setItems((current) => current.map((entry) => (
        entry.creator?.firebase_uid === creator.firebase_uid
          ? { ...entry, creator: entry.creator ? { ...entry.creator, is_following: result.following } : entry.creator }
          : entry
      )));
    } catch (error: any) {
      showNotification(error?.message || 'Follow failed.');
    }
  }, [ensureAuth, showNotification]);

  const handleReportContent = useCallback(async (item: SpotlightItem) => {
    if (!ensureAuth()) return;
    const reason = window.prompt('Reason for report (required):', 'spam');
    if (!reason || !reason.trim()) return;
    await spotlightService.reportContent({ content_id: item.id, reason: reason.trim() }).then(() => {
      showNotification('Report submitted.');
    }).catch((error) => showNotification(error?.message || 'Unable to submit report.'));
  }, [ensureAuth, showNotification]);

  const handleBlockCreator = useCallback(async (creator: SpotlightCreator) => {
    if (!ensureAuth()) return;
    const confirmed = window.confirm(`Block ${creator.name}? Their content and comments will be hidden.`);
    if (!confirmed) return;

    await spotlightService.blockUser({ targetUserId: creator.id }).then(() => {
      setItems((current) => current.filter((item) => item.creator_user_id !== creator.id));
      setSuggestedUsers((current) => current.filter((item) => item.id !== creator.id));
      setActiveItem((current) => (current?.creator_user_id === creator.id ? null : current));
      showNotification(`${creator.name} has been blocked.`);
    }).catch((error) => showNotification(error?.message || 'Unable to block user.'));
  }, [ensureAuth, showNotification]);

  const handleOpenComments = useCallback((item: SpotlightItem) => {
    if (!item.allow_comments) {
      showNotification('Comments are disabled for this spotlight.');
      return;
    }
    setActiveItem(item);
    setReplyToId(null);
    setCommentSort('top');
    setComments([]);
    void refreshComments(item.id, 'top');
  }, [refreshComments, showNotification]);

  const handleLikeComment = useCallback((commentId: string) => {
    if (!activeItem || !ensureAuth()) return;
    void spotlightService
      .likeComment(commentId)
      .then(() => refreshComments(activeItem.id, commentSort))
      .catch((error) => showNotification(error?.message || 'Unable to like comment.'));
  }, [activeItem, commentSort, ensureAuth, refreshComments, showNotification]);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!activeItem || !ensureAuth()) return;
    void spotlightService
      .deleteComment(commentId)
      .then(async () => {
        mutateItemMetrics(activeItem.id, (previous) => ({
          ...previous,
          metrics: { ...previous.metrics, comments: Math.max(0, Number(previous.metrics.comments || 0) - 1) }
        }));
        await refreshComments(activeItem.id, commentSort);
      })
      .catch((error) => showNotification(error?.message || 'Unable to delete comment.'));
  }, [activeItem, commentSort, ensureAuth, mutateItemMetrics, refreshComments, showNotification]);

  const handleSubmitComment = useCallback(async () => {
    if (!activeItem || !ensureAuth()) return;
    if (!commentText.trim()) return;

    try {
      await spotlightService.addComment(activeItem.id, commentText.trim(), replyToId);
      setCommentText('');
      setReplyToId(null);
      mutateItemMetrics(activeItem.id, (previous) => ({
        ...previous,
        metrics: { ...previous.metrics, comments: Number(previous.metrics.comments || 0) + 1 }
      }));
      await refreshComments(activeItem.id, commentSort);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to post comment.');
    }
  }, [activeItem, commentSort, commentText, ensureAuth, mutateItemMetrics, refreshComments, replyToId, showNotification]);

  const trends = useMemo<FeedTrend[]>(() => {
    const counts = new Map<string, FeedTrend>();

    const pushToken = (rawValue: string, kind: FeedTrend['kind']) => {
      const normalized = normalizeToken(rawValue);
      if (!normalized) return;

      const existing = counts.get(`${kind}:${normalized}`);
      if (existing) {
        existing.hits += 1;
        return;
      }

      counts.set(`${kind}:${normalized}`, {
        key: `${kind}:${normalized}`,
        label: kind === 'hashtag' ? `#${normalized}` : normalized,
        hits: 1,
        kind
      });
    };

    items.forEach((item) => {
      item.hashtags.forEach((tag) => pushToken(tag, 'hashtag'));
      item.interest_tags.forEach((tag) => pushToken(tag, 'topic'));
    });

    return [...counts.values()].sort((left, right) => {
      if (right.hits !== left.hits) return right.hits - left.hits;
      return left.label.localeCompare(right.label);
    }).slice(0, 6);
  }, [items]);

  return (
    <>
      <div className="w-full">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-4">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: motionEase }}
              className="sticky top-3 z-20 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[rgba(10,11,13,0.92)] px-4 pt-4 backdrop-blur-[18px] sm:px-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/32">Spotlight</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                    Home
                  </h1>
                  <p className="mt-2 text-sm text-white/48">A cleaner, faster timeline for live creator posts.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to="/spotlight/search" className={darkButtonClass}>
                    <ExploreIcon />
                    <span>Search</span>
                  </Link>
                  <Link to="/spotlight/create" className={solidButtonClass}>
                    <PlusIcon />
                    <span>Post</span>
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={`relative flex flex-1 items-center justify-center gap-2 border-b px-3 py-3 text-sm font-semibold transition ${
                      mode === tab.id
                        ? 'border-white text-white'
                        : 'border-white/[0.08] text-white/46 hover:text-white/72'
                    }`}
                  >
                    <span className={mode === tab.id ? 'text-white' : 'text-white/46'}>
                      {tab.id === 'for_you' ? <HomeFeedIcon /> : tab.id === 'following' ? <ExploreIcon /> : <FlameIcon />}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04, ease: motionEase }}
              className={`${panelClass} overflow-hidden p-4`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ProfileAvatar src={avatarSrc || undefined} label={viewerName} className="h-10 w-10" />
                <Link to="/spotlight/create" className={`${insetStripClass} block flex-1 px-4 py-3 transition hover:bg-white/[0.04]`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Quick post</p>
                  <p className="mt-1 text-sm text-white/58">Share a drop, creator note, or product story.</p>
                </Link>
                <Link to="/spotlight/create" className={`${solidButtonClass} shrink-0`}>
                  <PlusIcon />
                  <span>Create</span>
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/46">
                <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">Luxury drops</span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">Styling notes</span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">Launch previews</span>
              </div>
            </motion.section>

            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className={`${panelClass} overflow-hidden p-5`}>
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-40 rounded-full bg-white/[0.08]" />
                        <div className="mt-3 h-3 w-full rounded-full bg-white/[0.05]" />
                        <div className="mt-2 h-3 w-3/4 rounded-full bg-white/[0.05]" />
                        <div className="mt-4 h-[320px] rounded-[26px] bg-white/[0.04]" />
                      </div>
                    </div>
                  </div>
                ))
              ) : null}

              {!isLoading && items.length === 0 ? (
                <div className={`${panelClass} p-8 text-center`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/34">Quiet right now</p>
                  <p className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                    No Spotlight posts yet.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/52">
                    Switch feed mode or create the first spotlight for this lane.
                  </p>
                </div>
              ) : null}

              {!isLoading ? items.map((item) => {
                const creatorId = item.creator?.firebase_uid || '';
                return (
                  <SpotlightFeedCard
                    key={item.id}
                    item={item}
                    liked={likedIds.has(item.id)}
                    saved={savedIds.has(item.id)}
                    following={creatorId ? followedCreatorIds.has(creatorId) || Boolean(item.creator?.is_following) : false}
                    onLike={handleLike}
                    onSave={handleSave}
                    onShare={handleShare}
                    onComment={handleOpenComments}
                    onFollow={handleFollow}
                    onReport={handleReportContent}
                    onBlockCreator={handleBlockCreator}
                    onOpenProduct={handleOpenProduct}
                    onTrackProductImpressions={handleTrackProductImpressions}
                    onTrackView={handleTrackView}
                  />
                );
              }) : null}

              <div ref={sentinelRef} />

              {isLoadingMore ? (
                <div className={`${mutedPanelClass} px-4 py-4 text-center text-sm text-white/48`}>
                  Loading more Spotlight posts...
                </div>
              ) : null}
            </div>
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-4 space-y-5">
              <section className={`${panelClass} p-5`}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/34">What&apos;s happening</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                  {activeTab.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/48">{activeTab.detail}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`${insetStripClass} px-4 py-4`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Posts</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      {formatCompact(items.length)}
                    </p>
                  </div>
                  <div className={`${insetStripClass} px-4 py-4`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Likes</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      {formatCompact(items.reduce((total, item) => total + Number(item.metrics.likes || 0), 0))}
                    </p>
                  </div>
                  <div className={`${insetStripClass} px-4 py-4`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Comments</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      {formatCompact(items.reduce((total, item) => total + Number(item.metrics.comments || 0), 0))}
                    </p>
                  </div>
                  <div className={`${insetStripClass} px-4 py-4`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Saves</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      {formatCompact(items.reduce((total, item) => total + Number(item.metrics.saves || 0), 0))}
                    </p>
                  </div>
                </div>

                <div className={`${insetStripClass} mt-3 flex items-center justify-between gap-3 px-4 py-3`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Lead trend</p>
                    <p className="mt-1 text-sm font-semibold text-white">{trends[0]?.label || 'Building from live posts'}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/72">
                    <SparklineIcon />
                  </span>
                </div>
              </section>

              <section className={`${panelClass} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/34">Creators to watch</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      Suggested follows
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] font-semibold text-white/58">
                    {formatCompact(suggestedUsers.length)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {suggestedUsers.length === 0 ? (
                    <div className={`${insetStripClass} px-4 py-4 text-sm text-white/46`}>
                      Creator suggestions will land here as the feed expands.
                    </div>
                  ) : suggestedUsers.slice(0, 5).map((creator) => {
                    const isFollowing = followedCreatorIds.has(creator.firebase_uid) || Boolean(creator.is_following);
                    return (
                      <div key={creator.id} className={`${insetStripClass} flex items-center justify-between gap-3 px-4 py-4`}>
                        <div className="min-w-0 flex items-center gap-3">
                          <ProfileAvatar src={safeAvatar(creator.avatar_url)} label={creator.name} className="h-11 w-11" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{creator.name}</p>
                              {creator.is_verified ? <VerifiedBadge /> : null}
                            </div>
                            <p className="mt-1 text-xs text-white/42">{formatCompact(creator.followers_count)} followers</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFollow(creator)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                            isFollowing
                              ? 'bg-white/[0.05] text-white/68 hover:bg-white/[0.08] hover:text-white'
                              : 'bg-white text-black hover:brightness-95'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={`${panelClass} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/34">Trending now</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                      Tags and topics
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] font-semibold text-white/58">
                    {formatCompact(trends.length)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {trends.length === 0 ? (
                    <div className={`${insetStripClass} px-4 py-4 text-sm text-white/46`}>
                      Trends will build automatically from the live Spotlight posts in this lane.
                    </div>
                  ) : trends.map((trend, index) => (
                    <div key={trend.key} className={`${insetStripClass} flex items-center justify-between gap-3 px-4 py-4`}>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
                          {index + 1}. {trend.kind === 'hashtag' ? 'Hashtag' : 'Topic'}
                        </p>
                        <p className="mt-2 truncate text-sm font-semibold text-white">{trend.label}</p>
                      </div>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/58">
                        {trend.hits} hits
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {activeItem ? (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setActiveItem(null)} aria-label="Close comments" />

            <motion.section
              initial={{ opacity: 0, y: 32, x: 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 24, x: 0 }}
              transition={{ duration: 0.28, ease: motionEase }}
              className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[30px] border border-white/[0.06] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.055),rgba(255,255,255,0)_34%),linear-gradient(180deg,rgba(14,15,18,0.98),rgba(7,8,10,0.98))] shadow-[0_-24px_60px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[26px] lg:inset-y-5 lg:right-5 lg:left-auto lg:w-[420px] lg:max-h-none lg:rounded-[30px]"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/34">Comments</p>
                      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-white" style={headingFontStyle}>
                        {activeItem.creator?.name || 'Spotlight post'}
                      </p>
                      <p className="mt-1 max-h-10 overflow-hidden text-sm text-white/46">
                        {activeItem.caption || 'Join the thread.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveItem(null)}
                      className="rounded-full bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {(['top', 'new'] as const).map((sort) => (
                      <button
                        key={sort}
                        type="button"
                        onClick={() => {
                          setCommentSort(sort);
                          void refreshComments(activeItem.id, sort);
                        }}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                          commentSort === sort
                            ? 'bg-white text-black'
                            : 'bg-white/[0.045] text-white/64 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {sort === 'top' ? 'Top' : 'New'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                  {isCommentsLoading ? (
                    <div className={`${insetStripClass} px-4 py-5 text-sm text-white/46`}>
                      Loading comments...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className={`${insetStripClass} px-4 py-5 text-sm text-white/46`}>
                      {activeItem.allow_comments ? 'No comments yet. Start the thread.' : 'Comments are disabled for this spotlight.'}
                    </div>
                  ) : comments.map((comment) => (
                    <CommentNode key={comment.id} comment={comment} onLike={handleLikeComment} onReply={setReplyToId} onDelete={handleDeleteComment} />
                  ))}
                </div>

                <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                  {replyToId ? (
                    <div className={`${insetStripClass} mb-3 flex items-center justify-between gap-3 px-4 py-3 text-xs text-white/58`}>
                      <span>Replying to this comment</span>
                      <button type="button" onClick={() => setReplyToId(null)} className="font-semibold text-white/78 transition hover:text-white">
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder={replyToId ? 'Write a reply...' : 'Write a comment...'}
                      className="h-12 w-full rounded-full border border-white/[0.06] bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/12 focus:bg-white/[0.07]"
                    />
                    <button type="button" onClick={handleSubmitComment} className={solidButtonClass}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default SpotlightHomeFeed;
