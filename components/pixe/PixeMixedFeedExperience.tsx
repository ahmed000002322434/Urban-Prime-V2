import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  PixeComment,
  PixeFeedEvent,
  PixeFeedMode,
  PixeMixedFeedItem,
  PixeMixedFeedScope,
  PixeVideo
} from '../../services/pixeService';
import { pixeService } from '../../services/pixeService';
import { useAuth } from '../../hooks/useAuth';
import PixeEmptyState from './PixeEmptyState';
import { PixeCommentThread, PixeVideoSurface, formatCount, formatDuration } from './PixePublicSurface';
import { PixeInlineSkeleton } from './PixeSkeleton';
import PixeTopHeader from './PixeTopHeader';
import { pixeLibraryHeaderLink } from './pixeHeaderConfig';

const ESTIMATED_CARD_HEIGHT = 820;
const FEED_PAGE_LIMIT = 12;
const OVERSCAN_ITEMS = 5;
const MUTE_STORAGE_KEY = 'pixe_feed_muted_v2';
const SESSION_STORAGE_KEY = 'pixe_mixed_feed_session_v1';

const feedHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed', end: true },
  { to: '/pixe/following', label: 'Following' },
  { to: '/pixe/explore', label: 'Explore' },
  pixeLibraryHeaderLink,
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const modeToScope = (mode: PixeFeedMode): PixeMixedFeedScope => {
  if (mode === 'following') return 'following';
  if (mode === 'explore') return 'explore';
  return 'for-you';
};

const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return 'Now';
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
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

const getViewerSessionId = () => {
  if (typeof window === 'undefined') return 'server-session';
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const created = `pixe-${randomId}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return `pixe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const readStoredMuted = () => {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
  return stored === null ? true : stored !== 'false';
};

const toRenderableVideo = (item: PixeMixedFeedItem): PixeVideo => {
  if (item.sourceVideo) return item.sourceVideo;
  return {
    id: item.id,
    title: item.title || '',
    caption: item.text || '',
    hashtags: item.hashtags,
    visibility: 'public',
    status: 'published',
    moderation_state: 'approved',
    mux_upload_status: 'ready',
    duration_ms: Number(item.media?.durationMs || 0),
    width: Number(item.media?.width || 0),
    height: Number(item.media?.height || 0),
    fps: 0,
    thumbnail_url: item.media?.posterUrl || null,
    preview_url: null,
    manifest_url: item.media?.manifestUrl || item.media?.url || null,
    playback_id: item.media?.playbackId || null,
    allow_comments: true,
    scheduled_for: null,
    published_at: item.createdAt,
    created_at: item.createdAt,
    updated_at: item.createdAt,
    source_size_bytes: 0,
    processing_error: null,
    metrics: {
      impressions: item.metrics.impressions,
      qualified_views: item.metrics.views,
      watch_time_ms: item.metrics.watchTimeMs,
      completions: item.metrics.completions,
      likes: item.metrics.likes,
      comments: item.metrics.comments,
      saves: item.metrics.saves,
      shares: item.metrics.shares,
      product_clicks: 0,
      product_revenue_amount: 0,
      completion_rate: item.metrics.completionRate || 0,
      average_view_duration_ms: item.metrics.averageViewDurationMs || 0
    },
    channel: {
      id: item.author.id,
      handle: item.author.handle,
      display_name: item.author.displayName,
      avatar_url: item.author.avatarUrl,
      banner_url: item.author.bannerUrl || null,
      bio: item.author.bio || '',
      subscriber_count: item.author.followerCount || 0,
      video_count: 0,
      published_video_count: 0,
      tip_enabled: false,
      membership_enabled: false,
      is_subscribed: item.author.isFollowing
    },
    product_tags: [],
    viewer_state: {
      liked: item.viewerState.liked,
      saved: item.viewerState.saved
    }
  };
};

const Icon: React.FC<{ name: 'heart' | 'comment' | 'bookmark' | 'share' | 'flag' | 'volume' | 'muted' | 'refresh' | 'play' | 'image' | 'text' | 'spark'; className?: string }> = ({
  name,
  className = 'h-5 w-5'
}) => {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'heart') return <svg {...common}><path d="M20.8 4.6c-2-1.8-5.1-1.5-6.9.6L12 7.4l-1.9-2.2C8.3 3.1 5.2 2.8 3.2 4.6.9 6.7.8 10.3 3 12.7c2.5 2.8 9 7.1 9 7.1s6.5-4.3 9-7.1c2.2-2.4 2.1-6-.2-8.1Z" /></svg>;
  if (name === 'comment') return <svg {...common}><path d="M21 14.5a4.5 4.5 0 0 1-4.5 4.5H8l-5 3V7.5A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5Z" /></svg>;
  if (name === 'bookmark') return <svg {...common}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>;
  if (name === 'share') return <svg {...common}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /></svg>;
  if (name === 'flag') return <svg {...common}><path d="M5 21V4" /><path d="M5 4h11l-1 4 1 4H5" /></svg>;
  if (name === 'volume') return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 8.5a5 5 0 0 1 0 7" /><path d="M18.5 6a8.5 8.5 0 0 1 0 12" /></svg>;
  if (name === 'muted') return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 4 4" /><path d="m21 9-4 4" /></svg>;
  if (name === 'refresh') return <svg {...common}><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v6h-6" /></svg>;
  if (name === 'play') return <svg {...common}><path d="m9 6 9 6-9 6V6Z" /></svg>;
  if (name === 'image') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m7 15 3.3-3.3a1 1 0 0 1 1.4 0L15 15" /><path d="m14 14 1.3-1.3a1 1 0 0 1 1.4 0L19 15" /><circle cx="8.5" cy="9.5" r="1.2" /></svg>;
  if (name === 'text') return <svg {...common}><path d="M4 6h16" /><path d="M7 10h10" /><path d="M6 14h12" /><path d="M9 18h6" /></svg>;
  return <svg {...common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></svg>;
};

type ActionButtonProps = {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
};

const ActionButton: React.FC<ActionButtonProps> = ({ label, count, active = false, disabled = false, icon, onClick }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition motion-safe:transform-gpu ${
      active
        ? 'border-white/24 bg-white text-black shadow-[0_14px_30px_rgba(255,255,255,0.12)]'
        : 'border-white/10 bg-white/[0.045] text-white/78 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08] hover:text-white'
    } disabled:cursor-not-allowed disabled:opacity-50`}
  >
    {icon}
    <span>{count === undefined ? label : formatCount(count)}</span>
  </button>
);

const TypeBadge: React.FC<{ type: PixeMixedFeedItem['type'] }> = ({ type }) => {
  const icon = type === 'video' ? 'play' : type === 'image' ? 'image' : 'text';
  const label = type === 'video' ? 'Video' : type === 'image' ? 'Image' : 'Text';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/34 px-2.5 py-1 text-[11px] font-semibold uppercase text-white/70">
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

const PixeFeedCard: React.FC<{
  item: PixeMixedFeedItem;
  active: boolean;
  near: boolean;
  nextVideo: boolean;
  muted: boolean;
  onToggleMute: (item: PixeMixedFeedItem) => void;
  onPlayerRef: (itemId: string, node: any | null) => void;
  onTimeUpdate: (item: PixeMixedFeedItem, event: any) => void;
  onLike: (item: PixeMixedFeedItem) => void;
  onSave: (item: PixeMixedFeedItem) => void;
  onShare: (item: PixeMixedFeedItem) => void;
  onComment: (item: PixeMixedFeedItem) => void;
  onFollow: (item: PixeMixedFeedItem) => void;
  onReport: (item: PixeMixedFeedItem) => void;
}> = ({
  item,
  active,
  near,
  nextVideo,
  muted,
  onToggleMute,
  onPlayerRef,
  onTimeUpdate,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
  onReport
}) => {
  const isVideo = item.type === 'video';
  const authorHref = item.author.handle ? `/pixe/channel/${encodeURIComponent(item.author.handle)}` : '/pixe';
  const mediaFrameClass = isVideo ? 'aspect-[9/13] min-h-[28rem] max-h-[74svh]' : 'aspect-[4/5]';
  const renderVideo = near || active || nextVideo;

  return (
    <article
      data-feed-item-id={item.id}
      tabIndex={0}
      className={`group rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-3 text-white shadow-[0_26px_70px_rgba(0,0,0,0.32)] outline-none backdrop-blur-2xl transition duration-300 focus-visible:ring-2 focus-visible:ring-white/45 sm:p-4 ${
        active ? 'border-white/18 shadow-[0_34px_90px_rgba(0,0,0,0.42)]' : 'hover:border-white/16'
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={authorHref} className="shrink-0">
            <img
              src={item.author.avatarUrl || '/icons/urbanprime.svg'}
              alt={item.author.displayName}
              className="h-11 w-11 rounded-full border border-white/12 object-cover shadow-[0_14px_30px_rgba(0,0,0,0.26)]"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Link to={authorHref} className="truncate text-[15px] font-semibold text-white hover:text-white/82">
                {item.author.displayName}
              </Link>
              <span className="h-1 w-1 shrink-0 rounded-full bg-white/28" />
              <span className="shrink-0 text-xs font-medium text-white/45">{formatRelativeTime(item.createdAt)}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/42">@{item.author.handle || 'pixe'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TypeBadge type={item.type} />
          <button
            type="button"
            onClick={() => onFollow(item)}
            className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/72 transition hover:border-white/18 hover:bg-white/[0.09] hover:text-white sm:inline-flex"
          >
            {item.author.isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-black/72 ${mediaFrameClass}`}>
        {isVideo ? (
          renderVideo ? (
            <PixeVideoSurface
              video={toRenderableVideo(item)}
              active={active}
              muted={muted}
              autoPlay={active}
              preload={active ? 'auto' : nextVideo ? 'metadata' : 'none'}
              className="h-full w-full rounded-none"
              frameClassName="h-full w-full rounded-[26px]"
              mediaClassName="h-full w-full object-cover"
              frameStyle={{ aspectRatio: 'auto' }}
              playerRef={(node) => onPlayerRef(item.id, node)}
              onTimeUpdate={(event) => onTimeUpdate(item, event)}
              overlay={(
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/88 via-black/34 to-transparent" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMute(item);
                    }}
                    className="pointer-events-auto absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/42 text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-black/58"
                    aria-label={muted ? 'Unmute video' : 'Mute video'}
                  >
                    <Icon name={muted ? 'muted' : 'volume'} className="h-[1.125rem] w-[1.125rem]" />
                  </button>
                  {item.media?.durationMs ? (
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/62 px-2.5 py-1 text-[11px] font-semibold text-white/84 backdrop-blur-md">
                      {formatDuration(item.media.durationMs)}
                    </span>
                  ) : null}
                </div>
              )}
            />
          ) : (
            <div className="absolute inset-0">
              {item.media?.posterUrl ? (
                <img src={item.media.posterUrl} alt={item.media.alt || item.title || 'Pixe video'} className="h-full w-full object-cover opacity-82" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/48">Video</div>
              )}
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/14 bg-white/[0.08] text-white backdrop-blur-xl">
                  <Icon name="play" className="h-6 w-6" />
                </span>
              </div>
            </div>
          )
        ) : item.type === 'image' ? (
          item.media?.url ? (
            <img
              src={item.media.url}
              alt={item.media.alt || item.title || item.text || 'Pixe image'}
              className="h-full w-full object-cover"
              loading={near ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/48">Image unavailable</div>
          )
        ) : (
          <div className="flex h-full min-h-[22rem] flex-col justify-between bg-[linear-gradient(145deg,rgba(16,185,129,0.18),rgba(15,23,42,0.42)_42%,rgba(244,63,94,0.14))] p-6 sm:p-8">
            <Icon name="spark" className="h-7 w-7 text-emerald-100/82" />
            <p className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl sm:leading-tight">
              {item.text || item.title || 'Pixe update'}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.hashtags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/72">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-1 pt-4">
        {item.title ? (
          <h2 className="text-lg font-semibold leading-tight text-white" style={clampTextStyle(2)}>
            {item.title}
          </h2>
        ) : null}
        {item.text && item.type !== 'text' ? (
          <p className="mt-2 text-[15px] leading-7 text-white/72" style={clampTextStyle(4)}>
            {item.text}
          </p>
        ) : null}
        {item.hashtags.length > 0 && item.type !== 'text' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.hashtags.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-white/58">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ActionButton label="Like" count={item.metrics.likes} active={item.viewerState.liked} icon={<Icon name="heart" className={item.viewerState.liked ? 'h-[1.125rem] w-[1.125rem] fill-current' : 'h-[1.125rem] w-[1.125rem]'} />} onClick={() => onLike(item)} />
          <ActionButton label="Comment" count={item.metrics.comments} icon={<Icon name="comment" className="h-[1.125rem] w-[1.125rem]" />} onClick={() => onComment(item)} />
          <ActionButton label="Save" count={item.metrics.saves} active={item.viewerState.saved} icon={<Icon name="bookmark" className={item.viewerState.saved ? 'h-[1.125rem] w-[1.125rem] fill-current' : 'h-[1.125rem] w-[1.125rem]'} />} onClick={() => onSave(item)} />
          <ActionButton label="Share" count={item.metrics.shares} icon={<Icon name="share" className="h-[1.125rem] w-[1.125rem]" />} onClick={() => onShare(item)} />
          <button
            type="button"
            onClick={() => onReport(item)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-white/52 transition hover:border-rose-200/22 hover:bg-rose-400/[0.09] hover:text-rose-50"
          >
            <Icon name="flag" className="h-[1.125rem] w-[1.125rem]" />
            <span>Report</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const CommentsDialog: React.FC<{
  item: PixeMixedFeedItem | null;
  comments: PixeComment[];
  loading: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}> = ({ item, comments, loading, submitting, onClose, onSubmit }) => {
  if (!item) return null;
  const video = item.type === 'video' ? toRenderableVideo(item) : null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 px-3 py-6 text-white backdrop-blur-sm sm:px-5">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close comments" />
      <section className="pixe-noir-panel-strong relative mx-auto flex h-full max-h-[48rem] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] p-4 shadow-[0_34px_100px_rgba(0,0,0,0.5)] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/8 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Comments</p>
            <p className="mt-1 text-sm text-white/52" style={clampTextStyle(1)}>{item.title || item.text || 'Pixe post'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08]">
            Close
          </button>
        </div>
        {video ? (
          <PixeCommentThread video={video} comments={comments} loading={loading || submitting} onSubmit={onSubmit} maxItems={16} />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03] px-6 text-center text-sm leading-6 text-white/58">
            Comments are not available for this post yet.
          </div>
        )}
      </section>
    </div>
  );
};

const LeftRail: React.FC<{
  items: PixeMixedFeedItem[];
  scope: PixeMixedFeedScope;
  isAuthenticated: boolean;
  userName?: string;
}> = ({ items, scope, isAuthenticated, userName }) => {
  const videoCount = items.filter((item) => item.type === 'video').length;
  const imageCount = items.filter((item) => item.type === 'image').length;
  const textCount = items.filter((item) => item.type === 'text').length;
  const totalEngagement = items.reduce((sum, item) => sum + item.metrics.likes + item.metrics.comments + item.metrics.saves + item.metrics.shares, 0);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-4">
        <section className="pixe-noir-panel rounded-[28px] p-5">
          <p className="text-[11px] font-semibold uppercase text-emerald-100/62">Pixe Feed</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">
            {scope === 'following' ? 'Following' : scope === 'explore' ? 'Explore' : 'For You'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            {isAuthenticated ? `${userName || 'Your'} discovery stream` : 'Public discovery stream'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[11px] uppercase text-white/38">Items</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatCount(items.length)}</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[11px] uppercase text-white/38">Signals</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatCount(totalEngagement)}</p>
            </div>
          </div>
        </section>

        <section className="pixe-noir-panel rounded-[28px] p-5">
          <p className="text-sm font-semibold text-white">Content mix</p>
          <div className="mt-4 space-y-3">
            {[
              ['Video', videoCount, 'bg-emerald-300'],
              ['Image', imageCount, 'bg-sky-300'],
              ['Text', textCount, 'bg-rose-300']
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <span className="flex-1 text-sm text-white/64">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

const RightRail: React.FC<{
  items: PixeMixedFeedItem[];
  onFollow: (item: PixeMixedFeedItem) => void;
}> = ({ items, onFollow }) => {
  const trends = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => item.hashtags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const creators = useMemo(() => {
    const map = new Map<string, PixeMixedFeedItem>();
    items.forEach((item) => {
      if (!map.has(item.author.id)) map.set(item.author.id, item);
    });
    return Array.from(map.values()).slice(0, 5);
  }, [items]);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28 space-y-4">
        <section className="pixe-noir-panel rounded-[28px] p-5">
          <p className="text-sm font-semibold text-white">Trending now</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {trends.length === 0 ? (
              <span className="text-sm text-white/48">Topics appear as posts load.</span>
            ) : trends.map(([tag, count]) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/66">
                #{tag} <span className="text-white/34">{count}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="pixe-noir-panel rounded-[28px] p-5">
          <p className="text-sm font-semibold text-white">Suggested creators</p>
          <div className="mt-4 space-y-3">
            {creators.map((item) => (
              <div key={item.author.id} className="flex items-center gap-3">
                <img src={item.author.avatarUrl || '/icons/urbanprime.svg'} alt={item.author.displayName} className="h-10 w-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.author.displayName}</p>
                  <p className="truncate text-xs text-white/42">@{item.author.handle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onFollow(item)}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                >
                  {item.author.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

const PixeMixedFeedExperience: React.FC<{ mode: PixeFeedMode }> = ({ mode }) => {
  const { isAuthenticated, user } = useAuth();
  const scope = modeToScope(mode);
  const viewerSessionId = useMemo(() => getViewerSessionId(), []);
  const [items, setItems] = useState<PixeMixedFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(readStoredMuted);
  const [commentsItem, setCommentsItem] = useState<PixeMixedFeedItem | null>(null);
  const [comments, setComments] = useState<PixeComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [scrollState, setScrollState] = useState({ offset: 0, viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900 });

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const playerRefs = useRef<Record<string, any>>({});
  const itemsRef = useRef<PixeMixedFeedItem[]>([]);
  const activeItemIdRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef(Date.now());
  const loggedImpressionsRef = useRef<Set<string>>(new Set());
  const videoThresholdsRef = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const updateItem = useCallback((itemId: string, updater: (item: PixeMixedFeedItem) => PixeMixedFeedItem) => {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  }, []);

  const sendFeedEvent = useCallback((item: PixeMixedFeedItem, eventName: PixeFeedEvent['eventName'], watchTimeMs?: number) => {
    void pixeService.sendFeedEvents([{
      eventId: `${viewerSessionId}-${item.id}-${eventName}-${Date.now()}`,
      itemId: item.id,
      itemType: item.type,
      eventName,
      viewerSessionId,
      occurredAt: new Date().toISOString(),
      watchTimeMs
    }]).catch((eventError) => {
      console.warn('Pixe feed event skipped:', eventError);
    });
  }, [viewerSessionId]);

  const loadFeed = useCallback(async (reset: boolean, nextCursor?: string | null) => {
    if (scope === 'following' && !isAuthenticated) {
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const response = await pixeService.getMixedFeed(scope, reset ? null : nextCursor || null, FEED_PAGE_LIMIT);
      setItems((current) => {
        if (reset) return response.items;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
      if (reset) {
        setNewPostsAvailable(false);
        window.setTimeout(() => {
          const first = response.items[0];
          if (first) setActiveItemId(first.id);
        }, 80);
      }
    } catch (loadError: any) {
      console.error('Unable to load mixed Pixe feed:', loadError);
      setError(loadError?.message || 'Unable to load Pixe feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, scope]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setActiveItemId(null);
    setCommentsItem(null);
    setError(null);
    void loadFeed(true, null);
  }, [loadFeed]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => {
      const top = listRef.current ? listRef.current.getBoundingClientRect().top + window.scrollY : 0;
      setScrollState({
        offset: Math.max(0, window.scrollY - top),
        viewportHeight: window.innerHeight
      });
    };
    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const virtualWindow = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollState.offset / ESTIMATED_CARD_HEIGHT) - OVERSCAN_ITEMS);
    const visibleCount = Math.ceil(scrollState.viewportHeight / ESTIMATED_CARD_HEIGHT) + OVERSCAN_ITEMS * 2;
    const end = Math.min(items.length, start + visibleCount);
    return {
      start,
      end,
      topSpacer: start * ESTIMATED_CARD_HEIGHT,
      bottomSpacer: Math.max(0, (items.length - end) * ESTIMATED_CARD_HEIGHT),
      rendered: items.slice(start, end)
    };
  }, [items, scrollState.offset, scrollState.viewportHeight]);

  useEffect(() => {
    if (!sentinelRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loading || loadingMore || !hasMore) return;
        void loadFeed(false, cursor);
      },
      { rootMargin: '900px 0px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadFeed, loading, loadingMore]);

  useEffect(() => {
    const renderedIds = virtualWindow.rendered.map((item) => item.id);
    if (renderedIds.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute('data-feed-item-id');
        if (id && visible.intersectionRatio >= 0.45) {
          setActiveItemId(id);
        }
      },
      { threshold: [0.18, 0.45, 0.68], rootMargin: '-12% 0px -20% 0px' }
    );
    renderedIds.forEach((id) => {
      const node = cardRefs.current[id];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [virtualWindow.rendered]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) setNewPostsAvailable(true);
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    Object.entries(playerRefs.current).forEach(([itemId, player]) => {
      if (!player) return;
      if (itemId === activeItemId) {
        const playResult = player.play?.();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => undefined);
        }
      } else {
        player.pause?.();
      }
    });
  }, [activeItemId, virtualWindow.rendered]);

  useEffect(() => {
    const previousId = activeItemIdRef.current;
    const previousStartedAt = activeStartedAtRef.current;
    if (previousId && previousId !== activeItemId) {
      const previous = itemsRef.current.find((item) => item.id === previousId);
      if (previous) {
        const dwellMs = Math.max(0, Date.now() - previousStartedAt);
        sendFeedEvent(previous, dwellMs >= 1400 ? 'dwell' : 'skip', dwellMs);
        if (previous.type === 'video' && user?.id && dwellMs >= 800) {
          const player = playerRefs.current[previous.id];
          const currentTime = Number(player?.currentTime || 0);
          const duration = Math.max(Number(player?.duration || ((previous.media?.durationMs || 0) / 1000) || 1), 1);
          void pixeService.recordWatchProgress({
            video_id: previous.id,
            viewer_session_id: viewerSessionId,
            watch_time_ms: dwellMs,
            progress_ratio: currentTime / duration,
            completed: currentTime / duration >= 0.98,
            occurred_at: new Date().toISOString()
          }).catch(() => undefined);
        }
      }
    }

    activeItemIdRef.current = activeItemId;
    activeStartedAtRef.current = Date.now();

    const active = items.find((item) => item.id === activeItemId);
    if (active && !loggedImpressionsRef.current.has(active.id)) {
      loggedImpressionsRef.current.add(active.id);
      sendFeedEvent(active, 'impression');
    }
  }, [activeItemId, items, sendFeedEvent, user?.id, viewerSessionId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!['j', 'J', 'ArrowDown', 'k', 'K', 'ArrowUp'].includes(event.key)) return;
      const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeItemId));
      const nextIndex = event.key === 'k' || event.key === 'K' || event.key === 'ArrowUp'
        ? Math.max(0, activeIndex - 1)
        : Math.min(items.length - 1, activeIndex + 1);
      const next = items[nextIndex];
      const node = next ? cardRefs.current[next.id] : null;
      if (node) {
        event.preventDefault();
        node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItemId, items]);

  const handlePlayerRef = useCallback((itemId: string, node: any | null) => {
    if (node) playerRefs.current[itemId] = node;
    else delete playerRefs.current[itemId];
  }, []);

  const handleTimeUpdate = useCallback((item: PixeMixedFeedItem, event: any) => {
    if (item.type !== 'video') return;
    const player = event.currentTarget;
    const currentTime = Number(player?.currentTime || 0);
    const duration = Math.max(Number(player?.duration || ((item.media?.durationMs || 0) / 1000) || 1), 1);
    const ratio = currentTime / duration;
    const sent = videoThresholdsRef.current[item.id] || new Set<string>();
    const thresholds: Array<[string, boolean]> = [
      ['view_3s', currentTime >= 3],
      ['view_50', ratio >= 0.5],
      ['view_95', ratio >= 0.95],
      ['complete', ratio >= 0.99]
    ];
    thresholds.forEach(([eventName, reached]) => {
      if (!reached || sent.has(eventName)) return;
      sent.add(eventName);
      sendFeedEvent(item, eventName as any, Math.round(currentTime * 1000));
    });
    videoThresholdsRef.current[item.id] = sent;
  }, [sendFeedEvent]);

  const handleLike = useCallback(async (item: PixeMixedFeedItem) => {
    const nextLiked = !item.viewerState.liked;
    updateItem(item.id, (current) => ({
      ...current,
      viewerState: { ...current.viewerState, liked: nextLiked },
      metrics: { ...current.metrics, likes: Math.max(0, current.metrics.likes + (nextLiked ? 1 : -1)) }
    }));
    if (item.type !== 'video') return;
    try {
      const result = await pixeService.likeVideo(item.id);
      updateItem(item.id, (current) => ({
        ...current,
        viewerState: { ...current.viewerState, liked: Boolean(result.liked) },
        metrics: { ...current.metrics, likes: Number(result.like_count || current.metrics.likes) }
      }));
    } catch {
      updateItem(item.id, (current) => ({
        ...current,
        viewerState: { ...current.viewerState, liked: item.viewerState.liked },
        metrics: { ...current.metrics, likes: item.metrics.likes }
      }));
    }
  }, [updateItem]);

  const handleSave = useCallback(async (item: PixeMixedFeedItem) => {
    const nextSaved = !item.viewerState.saved;
    updateItem(item.id, (current) => ({
      ...current,
      viewerState: { ...current.viewerState, saved: nextSaved },
      metrics: { ...current.metrics, saves: Math.max(0, current.metrics.saves + (nextSaved ? 1 : -1)) }
    }));
    if (item.type !== 'video') return;
    try {
      const result = await pixeService.saveVideo(item.id);
      updateItem(item.id, (current) => ({
        ...current,
        viewerState: { ...current.viewerState, saved: Boolean(result.saved) },
        metrics: { ...current.metrics, saves: Number(result.save_count || current.metrics.saves) }
      }));
    } catch {
      updateItem(item.id, (current) => ({
        ...current,
        viewerState: { ...current.viewerState, saved: item.viewerState.saved },
        metrics: { ...current.metrics, saves: item.metrics.saves }
      }));
    }
  }, [updateItem]);

  const handleShare = useCallback(async (item: PixeMixedFeedItem) => {
    const shareUrl = `${window.location.origin}${item.type === 'video' ? `/pixe/watch/${item.id}` : '/pixe'}`;
    updateItem(item.id, (current) => ({ ...current, metrics: { ...current.metrics, shares: current.metrics.shares + 1 } }));
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title || 'Pixe', text: item.text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      if (item.type === 'video') {
        const result = await pixeService.shareVideo(item.id);
        updateItem(item.id, (current) => ({ ...current, metrics: { ...current.metrics, shares: Number(result.share_count || current.metrics.shares) } }));
      }
    } catch {
      updateItem(item.id, (current) => ({ ...current, metrics: { ...current.metrics, shares: Math.max(0, item.metrics.shares) } }));
    }
  }, [updateItem]);

  const handleFollow = useCallback(async (item: PixeMixedFeedItem) => {
    const nextFollowing = !item.author.isFollowing;
    setItems((current) => current.map((entry) => (
      entry.author.id === item.author.id
        ? { ...entry, author: { ...entry.author, isFollowing: nextFollowing } }
        : entry
    )));
    if (!item.author.id || item.author.id === 'pixe') return;
    try {
      const result = await pixeService.subscribe(item.author.id);
      setItems((current) => current.map((entry) => (
        entry.author.id === item.author.id
          ? {
            ...entry,
            author: {
              ...entry.author,
              isFollowing: Boolean(result.subscribed),
              followerCount: Number(result.subscriber_count || entry.author.followerCount || 0)
            }
          }
          : entry
      )));
    } catch {
      setItems((current) => current.map((entry) => (
        entry.author.id === item.author.id
          ? { ...entry, author: { ...entry.author, isFollowing: item.author.isFollowing } }
          : entry
      )));
    }
  }, []);

  const handleReport = useCallback((item: PixeMixedFeedItem) => {
    sendFeedEvent(item, 'skip');
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }, [sendFeedEvent]);

  const openComments = useCallback(async (item: PixeMixedFeedItem) => {
    setCommentsItem(item);
    setComments([]);
    if (item.type !== 'video') return;
    setCommentsLoading(true);
    try {
      const payload = await pixeService.getComments(item.id);
      setComments(payload);
    } catch (commentError) {
      console.error('Unable to load Pixe comments:', commentError);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const submitComment = useCallback(async (body: string) => {
    if (!commentsItem || commentsItem.type !== 'video') return;
    setCommentSubmitting(true);
    try {
      const created = await pixeService.addComment(commentsItem.id, body);
      setComments((current) => [...current, created]);
      updateItem(commentsItem.id, (current) => ({ ...current, metrics: { ...current.metrics, comments: current.metrics.comments + 1 } }));
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentsItem, updateItem]);

  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeItemId));
  const nextVideoId = items.slice(activeIndex + 1).find((item) => item.type === 'video')?.id || null;

  return (
    <div className="pixe-noir-shell min-h-[100svh] bg-[#050506] pb-12 text-white">
      <PixeTopHeader title="Pixe" subtitle="Feed" brandTo="/pixe" links={feedHeaderLinks} />

      <div className="mx-auto grid max-w-[96rem] gap-5 px-3 pt-7 sm:px-5 lg:grid-cols-[17rem_minmax(0,42rem)] lg:px-6 xl:grid-cols-[18rem_minmax(0,43rem)_18rem] 2xl:grid-cols-[20rem_minmax(0,46rem)_20rem]">
        <LeftRail items={items} scope={scope} isAuthenticated={isAuthenticated} userName={user?.name || user?.email || undefined} />

        <main className="min-w-0">
          <div className="mb-4 space-y-3">
            {!isOnline ? (
              <div className="rounded-[22px] border border-amber-200/18 bg-amber-300/[0.08] px-4 py-3 text-sm font-semibold text-amber-50/82">
                Offline mode. Cached feed items stay available while actions queue or retry.
              </div>
            ) : null}

            {newPostsAvailable ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadFeed(true, null)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white text-black px-4 py-2 text-sm font-semibold shadow-[0_18px_42px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  New posts
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <PixeInlineSkeleton key={index} className="h-[34rem]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <h2 className="text-xl font-semibold text-white">Pixe feed is unavailable</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/62">{error}</p>
              <button
                type="button"
                onClick={() => void loadFeed(true, null)}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:-translate-y-0.5"
              >
                Retry feed
              </button>
            </div>
          ) : items.length === 0 ? (
            <PixeEmptyState
              title={scope === 'following' ? 'No followed creators yet' : 'No posts in this feed'}
              message={scope === 'following' ? 'Follow creators from the main Pixe feed and their posts will appear here.' : 'Fresh Pixe posts will appear here as creators publish.'}
              primaryAction={{ label: 'Explore Pixe', to: '/pixe/explore' }}
            />
          ) : (
            <div ref={listRef} className="space-y-5">
              <div style={{ height: virtualWindow.topSpacer }} />
              {virtualWindow.rendered.map((item) => {
                const active = item.id === activeItemId;
                const near = Math.abs(items.findIndex((entry) => entry.id === item.id) - activeIndex) <= 2;
                return (
                  <div
                    key={item.id}
                    ref={(node) => {
                      cardRefs.current[item.id] = node;
                    }}
                    data-feed-item-id={item.id}
                    className="scroll-mt-28"
                  >
                    <PixeFeedCard
                      item={item}
                      active={active}
                      near={near}
                      nextVideo={item.id === nextVideoId}
                      muted={isMuted}
                      onToggleMute={(entry) => {
                        const nextMuted = !isMuted;
                        setIsMuted(nextMuted);
                        sendFeedEvent(entry, nextMuted ? 'mute' : 'unmute');
                      }}
                      onPlayerRef={handlePlayerRef}
                      onTimeUpdate={handleTimeUpdate}
                      onLike={(entry) => void handleLike(entry)}
                      onSave={(entry) => void handleSave(entry)}
                      onShare={(entry) => void handleShare(entry)}
                      onComment={(entry) => void openComments(entry)}
                      onFollow={(entry) => void handleFollow(entry)}
                      onReport={handleReport}
                    />
                  </div>
                );
              })}
              <div style={{ height: virtualWindow.bottomSpacer }} />
              <div ref={sentinelRef} className="h-12">
                {loadingMore ? <PixeInlineSkeleton className="mx-auto h-20 max-w-sm" /> : null}
              </div>
            </div>
          )}
        </main>

        <RightRail items={items} onFollow={(item) => void handleFollow(item)} />
      </div>

      <CommentsDialog
        item={commentsItem}
        comments={comments}
        loading={commentsLoading}
        submitting={commentSubmitting}
        onClose={() => setCommentsItem(null)}
        onSubmit={submitComment}
      />
    </div>
  );
};

export default PixeMixedFeedExperience;
