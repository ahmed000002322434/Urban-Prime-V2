import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MuxPlayer from '@mux/mux-player-react';
import type { PixeComment, PixeProductTag, PixeVideo } from '../../services/pixeService';
import { pixeService } from '../../services/pixeService';
import LottieAnimation from '../LottieAnimation';
import { PixeCommentThreadSkeleton } from './PixeSkeleton';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

const clampTextStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const isInternalHref = (href: string | null | undefined) => Boolean(href && href.startsWith('/'));
const isMuxStreamManifest = (value: string | null | undefined) => /https?:\/\/stream\.mux\.com\/.+\.m3u8/i.test(String(value || '').trim());

export type PixePlaybackSource =
  | { kind: 'mux-manifest'; value: string }
  | { kind: 'mux-playback-id'; value: string }
  | { kind: 'native'; value: string };

export type PixeWatchQueueItem = Pick<
  PixeVideo,
  'id' | 'title' | 'caption' | 'thumbnail_url' | 'duration_ms' | 'channel' | 'metrics'
>;

export type PixeVideoSurfaceProps = {
  video: PixeVideo;
  active?: boolean;
  posterOnly?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  className?: string;
  frameClassName?: string;
  frameStyle?: React.CSSProperties;
  mediaClassName?: string;
  overlay?: React.ReactNode;
  showLoadingState?: boolean;
  playerRef?: (node: any | null) => void;
  onTimeUpdate?: (event: any) => void;
  onPlay?: (event: any) => void;
  onPause?: (event: any) => void;
};

export type PixeContextRailTab = 'queue' | 'comments' | 'products';

export type PixeContextRailProps = {
  variant: 'feed' | 'watch';
  video: PixeVideo | null;
  comments: PixeComment[];
  commentsLoading?: boolean;
  queue?: PixeWatchQueueItem[];
  activeTab?: PixeContextRailTab;
  onTabChange?: (tab: PixeContextRailTab) => void;
  onSubscribe?: () => void | Promise<void>;
  onProductClick?: (tag: PixeProductTag) => void | Promise<void>;
  onCommentSubmit?: (body: string) => Promise<void>;
  viewerUserId?: string | null;
  onCommentLike?: (comment: PixeComment) => Promise<void> | void;
  onCommentReport?: (comment: PixeComment) => Promise<void> | void;
  onCommentDelete?: (comment: PixeComment) => Promise<void> | void;
  commentLikePendingId?: string | null;
  commentReportPendingId?: string | null;
  commentDeletePendingId?: string | null;
  className?: string;
};

export const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

export const formatDuration = (valueMs: number) => {
  const totalSeconds = Math.max(0, Math.round(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const resolvePixePlaybackSource = (video: Pick<PixeVideo, 'manifest_url' | 'playback_id'>): PixePlaybackSource | null => {
  if (isMuxStreamManifest(video.manifest_url)) {
    return { kind: 'mux-manifest', value: String(video.manifest_url).trim() };
  }
  if (video.playback_id) {
    return { kind: 'mux-playback-id', value: video.playback_id };
  }
  if (video.manifest_url) {
    return { kind: 'native', value: video.manifest_url };
  }
  return null;
};

const MetricChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-white/68">
    {label}
  </span>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; action?: React.ReactNode }> = ({ eyebrow, title, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-semibold text-white/92">{title}</h3>
    </div>
    {action}
  </div>
);

const CommentRow: React.FC<{
  comment: PixeComment;
  viewerUserId?: string | null;
  onLike?: (comment: PixeComment) => Promise<void> | void;
  onReport?: (comment: PixeComment) => Promise<void> | void;
  onDelete?: (comment: PixeComment) => Promise<void> | void;
  likePending?: boolean;
  reportPending?: boolean;
  deletePending?: boolean;
}> = ({
  comment,
  viewerUserId = null,
  onLike,
  onReport,
  onDelete,
  likePending = false,
  reportPending = false,
  deletePending = false
}) => {
  const isOwnComment = Boolean(viewerUserId && comment.user?.id === viewerUserId);
  const likeCount = Number(comment.metrics?.likes || 0);
  const liked = Boolean(comment.viewer_state?.liked);

  return (
    <div className="flex gap-3 rounded-[22px] border border-white/6 bg-white/[0.03] p-3">
      <Link to={comment.user ? buildPublicProfilePath({ id: comment.user.id, name: comment.user.name, username: (comment.user as { username?: string }).username }) : '/'} className="shrink-0">
        <img
          src={comment.user?.avatar_url || '/icons/urbanprime.svg'}
          alt={comment.user?.name || 'Viewer'}
          className="h-9 w-9 rounded-full object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Link to={comment.user ? buildPublicProfilePath({ id: comment.user.id, name: comment.user.name, username: (comment.user as { username?: string }).username }) : '/'} className="truncate text-sm font-semibold text-white">
            {comment.user?.name || 'Viewer'}
          </Link>
          {comment.is_pinned ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              Pinned
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-5 text-white/72" style={clampTextStyle(4)}>
          {comment.body}
        </p>
        {(onLike || onReport || onDelete) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {onLike ? (
              <button
                type="button"
                onClick={() => void onLike(comment)}
                disabled={likePending}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  liked
                    ? 'border-white/20 bg-white/[0.1] text-white'
                    : 'border-white/10 text-white/54 hover:border-white/18 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {likePending ? 'Saving' : `${liked ? 'Liked' : 'Like'}${likeCount > 0 ? ` · ${formatCount(likeCount)}` : ''}`}
              </button>
            ) : null}

            {isOwnComment ? (
              onDelete ? (
                <button
                  type="button"
                  onClick={() => void onDelete(comment)}
                  disabled={deletePending}
                  className="rounded-full border border-rose-300/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-100/78 transition hover:border-rose-300/24 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletePending ? 'Removing' : 'Delete'}
                </button>
              ) : null
            ) : onReport ? (
              <button
                type="button"
                onClick={() => void onReport(comment)}
                disabled={reportPending || Boolean(comment.viewer_state?.reported)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/54 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportPending ? 'Reporting' : comment.viewer_state?.reported ? 'Reported' : 'Report'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const PixeCommentThread: React.FC<{
  video: PixeVideo | null;
  comments: PixeComment[];
  loading?: boolean;
  onSubmit?: (body: string) => Promise<void>;
  maxItems?: number;
  compact?: boolean;
  viewerUserId?: string | null;
  onCommentLike?: (comment: PixeComment) => Promise<void> | void;
  onCommentReport?: (comment: PixeComment) => Promise<void> | void;
  onCommentDelete?: (comment: PixeComment) => Promise<void> | void;
  commentLikePendingId?: string | null;
  commentReportPendingId?: string | null;
  commentDeletePendingId?: string | null;
}> = ({
  video,
  comments,
  loading = false,
  onSubmit,
  maxItems = 10,
  compact = false,
  viewerUserId = null,
  onCommentLike,
  onCommentReport,
  onCommentDelete,
  commentLikePendingId = null,
  commentReportPendingId = null,
  commentDeletePendingId = null
}) => {
  const [body, setBody] = useState('');

  useEffect(() => {
    setBody('');
  }, [video?.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {loading ? (
        <PixeCommentThreadSkeleton rows={compact ? 2 : 3} />
      ) : comments.length === 0 ? (
        <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03] px-6 py-5 text-center">
          <LottieAnimation src={uiLottieAnimations.noResults} alt="No comments yet" className="h-20 w-20 object-contain" loop autoplay />
          <p className="mt-2 text-sm font-semibold text-white">No comments yet</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-white/52">
            {video ? `The thread for ${video.title || 'this clip'} will appear here once viewers start replying.` : 'Comments appear here once viewers start replying.'}
          </p>
        </div>
      ) : (
        <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${compact ? 'pr-1' : 'pr-2'}`}>
          {comments.slice(0, maxItems).map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              viewerUserId={viewerUserId}
              onLike={onCommentLike}
              onReport={onCommentReport}
              onDelete={onCommentDelete}
              likePending={commentLikePendingId === comment.id}
              reportPending={commentReportPendingId === comment.id}
              deletePending={commentDeletePendingId === comment.id}
            />
          ))}
        </div>
      )}

      {onSubmit ? (
        <form
          className="mt-4 border-t border-white/8 pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = body.trim();
            if (!trimmed) return;
            await onSubmit(trimmed);
            setBody('');
          }}
        >
          <div className={`flex ${compact ? 'flex-col gap-2' : 'gap-3'}`}>
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add a comment"
              className="pixe-noir-input h-11 rounded-full px-4 text-sm outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Post
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export const PixeProductList: React.FC<{
  tags: PixeProductTag[];
  onProductClick?: (tag: PixeProductTag) => void | Promise<void>;
  compact?: boolean;
}> = ({ tags, onProductClick, compact = false }) => {
  if (tags.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-5 text-center text-sm text-white/52">
        No products are tagged on this clip yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tags.map((tag) => {
        const classes = `flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.04] px-3 py-3 transition hover:border-white/14 hover:bg-white/[0.06] ${compact ? '' : ''}`;
        const content = (
          <>
            <div className="h-12 w-12 overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04]">
              {tag.image_url ? (
                <img src={tag.image_url} alt={tag.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/45">UP</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white" style={clampTextStyle(2)}>
                {tag.title}
              </p>
              <p className="mt-1 text-xs text-white/52">
                {tag.currency} {tag.price_amount.toFixed(2)}
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              {tag.cta_label}
            </span>
          </>
        );

        if (tag.item_id) {
          return (
            <Link key={tag.id} to={`/item/${encodeURIComponent(tag.item_id)}`} className={classes} onClick={() => void onProductClick?.(tag)}>
              {content}
            </Link>
          );
        }

        if (isInternalHref(tag.href)) {
          return (
            <Link key={tag.id} to={tag.href || '/'} className={classes} onClick={() => void onProductClick?.(tag)}>
              {content}
            </Link>
          );
        }

        return (
          <a
            key={tag.id}
            href={tag.href || '#'}
            target={tag.href ? '_blank' : undefined}
            rel={tag.href ? 'noreferrer' : undefined}
            className={classes}
            onClick={() => void onProductClick?.(tag)}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
};

export const PixeQueueList: React.FC<{
  items: PixeWatchQueueItem[];
  currentVideoId?: string | null;
}> = ({ items, currentVideoId = null }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-5 text-center text-sm text-white/52">
        More recommendations will appear here as the feed loads.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          to={`/pixe/watch/${item.id}`}
          className={`flex items-center gap-3 rounded-[24px] border px-3 py-3 transition ${
            item.id === currentVideoId
              ? 'border-white/18 bg-white/[0.08]'
              : 'border-white/8 bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]'
          }`}
        >
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[16px] border border-white/8 bg-black">
            {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title || 'Pixe queue item'} className="h-full w-full object-cover" /> : null}
            <div className="absolute inset-x-1 bottom-1 rounded-full bg-black/70 px-2 py-0.5 text-center text-[10px] font-semibold text-white/82">
              {formatDuration(item.duration_ms)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white" style={clampTextStyle(2)}>
              {item.title || 'Untitled clip'}
            </p>
            <p className="mt-1 text-xs text-white/54">
              @{item.channel?.handle || 'pixe'} · {formatCount(item.metrics.qualified_views)} views
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

const RailSummaryCard: React.FC<{
  video: PixeVideo;
  onSubscribe?: () => void | Promise<void>;
}> = ({ video, onSubscribe }) => (
  <section className="pixe-noir-panel rounded-[30px] p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={video.channel?.avatar_url || '/icons/urbanprime.svg'}
          alt={video.channel?.display_name || 'Creator'}
          className="h-12 w-12 rounded-full border border-white/10 object-cover"
        />
        <div className="min-w-0">
          <Link to={video.channel ? `/pixe/channel/${video.channel.handle}` : '/pixe'} className="block text-sm font-semibold text-white">
            {video.channel?.display_name || 'Creator'}
          </Link>
          <p className="mt-1 text-xs text-white/52">@{video.channel?.handle || 'pixe'}</p>
        </div>
      </div>
      {video.channel && onSubscribe ? (
        <button
          type="button"
          onClick={() => void onSubscribe()}
          className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/82 transition hover:bg-white/[0.1]"
        >
          {video.channel.is_subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      ) : null}
    </div>

    <div className="mt-4">
      <h2 className="text-lg font-semibold text-white" style={clampTextStyle(2)}>
        {video.title || 'Untitled clip'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/68" style={clampTextStyle(4)}>
        {video.caption || 'No caption added yet.'}
      </p>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <MetricChip label={`${formatCount(video.metrics.qualified_views)} views`} />
      <MetricChip label={`${video.metrics.completion_rate}% completion`} />
      <MetricChip label={`${formatCount(video.metrics.likes)} likes`} />
      <MetricChip label={`${formatCount(video.metrics.comments)} comments`} />
      <MetricChip label={formatDuration(video.duration_ms)} />
    </div>

    {video.hashtags.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-2">
        {video.hashtags.slice(0, 6).map((tag) => (
          <span key={tag} className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/62">
            #{tag}
          </span>
        ))}
      </div>
    ) : null}
  </section>
);

export const PixeVideoSurface: React.FC<PixeVideoSurfaceProps> = ({
  video,
  active = false,
  posterOnly = false,
  muted = true,
  autoPlay = false,
  loop = true,
  controls = false,
  preload = 'metadata',
  className = '',
  frameClassName = '',
  frameStyle,
  mediaClassName = '',
  overlay,
  showLoadingState = true,
  playerRef,
  onTimeUpdate,
  onPlay,
  onPause
}) => {
  const source = useMemo(() => resolvePixePlaybackSource(video), [video]);
  const [hasError, setHasError] = useState(false);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setHasError(false);
    setReady(false);
  }, [video.id, source?.kind, source?.value]);

  const handleRetry = () => {
    setHasError(false);
    setReady(false);
    setReloadKey((current) => current + 1);
  };

  const outerClasses = `group relative overflow-visible rounded-[38px] motion-safe:transform-gpu transition-transform duration-500 ${
    active ? 'scale-[1.01]' : 'scale-[0.995] hover:scale-[1.003]'
  } ${className}`.trim();
  const innerClasses = `relative mx-auto h-full w-full overflow-hidden rounded-[30px] bg-black ring-1 ring-white/[0.06] shadow-[0_36px_96px_rgba(0,0,0,0.46)] motion-safe:transform-gpu transition-[box-shadow,transform,border-radius] duration-500 ${
    active ? 'shadow-[0_44px_120px_rgba(0,0,0,0.54)]' : ''
  } ${frameClassName}`.trim();
  const mediaClasses = `h-full w-full object-cover ${mediaClassName}`.trim();

  return (
    <div className={outerClasses}>
      <div
        className={`pointer-events-none absolute inset-x-[8%] top-[10%] bottom-[8%] rounded-[42px] bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.18),rgba(255,255,255,0.06)_34%,transparent_72%)] blur-[44px] transition-opacity duration-500 ${
          active ? 'opacity-80' : 'opacity-42 group-hover:opacity-58'
        }`}
      />
      <div className="pointer-events-none absolute inset-x-[14%] top-[2%] h-16 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)] opacity-45 blur-2xl" />
      <div className={innerClasses} style={frameStyle}>
        {posterOnly ? (
          <div className="absolute inset-0">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title || 'Pixe preview'} className="h-full w-full object-cover opacity-82" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/45">Preview</div>
            )}
            <div className="absolute inset-0 bg-black/34" />
          </div>
        ) : !source ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title || 'Pixe preview'} className="absolute inset-0 h-full w-full object-cover opacity-35" />
            ) : null}
            <div className="absolute inset-0 bg-black/72" />
            <div className="relative z-10">
              <p className="text-base font-semibold text-white">Video unavailable</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-white/55">Playback is not ready for this clip yet.</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title || 'Pixe preview'} className="absolute inset-0 h-full w-full object-cover opacity-35" />
            ) : null}
            <div className="absolute inset-0 bg-black/72" />
            <div className="relative z-10">
              <p className="text-base font-semibold text-white">Playback error</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-white/55">The player could not load this clip. Try the stream again.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Retry
              </button>
            </div>
          </div>
        ) : source.kind === 'native' ? (
          <video
            key={`${video.id}:${source.kind}:${source.value}:${reloadKey}`}
            ref={(node) => playerRef?.(node)}
            src={source.value}
            poster={video.thumbnail_url || undefined}
            preload={preload}
            autoPlay={autoPlay}
            muted={muted}
            loop={loop}
            playsInline
            controls={controls}
            className={mediaClasses}
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onPlaying={() => setReady(true)}
            onError={() => setHasError(true)}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
          />
        ) : (
          <MuxPlayer
            key={`${video.id}:${source.kind}:${source.value}:${reloadKey}`}
            ref={(node: any) => playerRef?.(node)}
            {...(
              source.kind === 'mux-manifest'
                ? ({ src: source.value } as any)
                : ({ playbackId: source.value } as any)
            )}
            poster={video.thumbnail_url || undefined}
            preload={preload}
            streamType="on-demand"
            preferPlayback="mse"
            maxResolution="720p"
            minResolution="240p"
            renditionOrder="desc"
            autoPlay={autoPlay ? (muted ? 'muted' : true) : undefined}
            muted={muted}
            loop={loop}
            playsInline
            controls={controls}
            accentColor="#ffffff"
            metadata={{
              video_id: video.id,
              video_title: video.title || 'Pixe video'
            }}
            envKey={pixeService.getMuxEnvKey() || undefined}
            className={mediaClasses}
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onPlaying={() => setReady(true)}
            onError={() => setHasError(true)}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
          />
        )}

        <div className="pointer-events-none absolute inset-x-5 top-0 h-20 rounded-b-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03),transparent)] opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-black/24" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.05]" />
        {showLoadingState && source && !hasError && !posterOnly && !ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/32 backdrop-blur-[2px]">
            <div className="rounded-full border border-white/10 bg-black/45 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-400/80" />
                <span className="h-2.5 w-14 animate-pulse rounded-full bg-zinc-500/70" />
              </div>
            </div>
          </div>
        ) : null}
        {overlay ? <div className="absolute inset-0 z-10">{overlay}</div> : null}
      </div>
    </div>
  );
};

export const PixeContextRail: React.FC<PixeContextRailProps> = ({
  variant,
  video,
  comments,
  commentsLoading = false,
  queue = [],
  activeTab = 'queue',
  onTabChange,
  onSubscribe,
  onProductClick,
  onCommentSubmit,
  viewerUserId = null,
  onCommentLike,
  onCommentReport,
  onCommentDelete,
  commentLikePendingId = null,
  commentReportPendingId = null,
  commentDeletePendingId = null,
  className = ''
}) => {
  if (!video) return null;

  const tabs: Array<{ id: PixeContextRailTab; label: string }> = [
    { id: 'queue', label: variant === 'watch' ? 'Up Next' : 'Queue' },
    { id: 'comments', label: 'Comments' },
    { id: 'products', label: 'Products' }
  ];

  const sharedSections = (
    <>
      <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
        <SectionHeading eyebrow="Queue" title={variant === 'watch' ? 'Up next' : 'Next in feed'} />
        <PixeQueueList items={queue} currentVideoId={video.id} />
      </section>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
        <SectionHeading eyebrow="Products" title="Tagged products" />
        <PixeProductList tags={video.product_tags} onProductClick={onProductClick} compact />
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
        <SectionHeading eyebrow="Comments" title="Thread" action={<span className="text-xs text-white/45">{comments.length}</span>} />
        <PixeCommentThread
          video={video}
          comments={comments}
          loading={commentsLoading}
          onSubmit={onCommentSubmit}
          maxItems={variant === 'watch' ? 12 : 6}
          compact
          viewerUserId={viewerUserId}
          onCommentLike={onCommentLike}
          onCommentReport={onCommentReport}
          onCommentDelete={onCommentDelete}
          commentLikePendingId={commentLikePendingId}
          commentReportPendingId={commentReportPendingId}
          commentDeletePendingId={commentDeletePendingId}
        />
      </section>
    </>
  );

  return (
    <aside className={`hidden min-h-0 lg:flex lg:h-full lg:flex-col lg:gap-4 ${className}`.trim()}>
      <RailSummaryCard video={video} onSubscribe={onSubscribe} />

      <div className="pixe-noir-panel-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] p-4">
        {variant === 'watch' ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id ? 'bg-white text-black' : 'border border-white/8 bg-white/[0.04] text-white/72 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {activeTab === 'queue' ? (
                <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                  <SectionHeading eyebrow="Queue" title="Up next" />
                  <PixeQueueList items={queue} currentVideoId={video.id} />
                </section>
              ) : null}

              {activeTab === 'products' ? (
                <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                  <SectionHeading eyebrow="Products" title="Tagged products" />
                  <PixeProductList tags={video.product_tags} onProductClick={onProductClick} />
                </section>
              ) : null}

              {activeTab === 'comments' ? (
                <section className="flex min-h-full flex-col rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                  <SectionHeading eyebrow="Comments" title="Thread" action={<span className="text-xs text-white/45">{comments.length}</span>} />
                  <PixeCommentThread
                    video={video}
                    comments={comments}
                    loading={commentsLoading}
                    onSubmit={onCommentSubmit}
                    maxItems={14}
                    viewerUserId={viewerUserId}
                    onCommentLike={onCommentLike}
                    onCommentReport={onCommentReport}
                    onCommentDelete={onCommentDelete}
                    commentLikePendingId={commentLikePendingId}
                    commentReportPendingId={commentReportPendingId}
                    commentDeletePendingId={commentDeletePendingId}
                  />
                </section>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">{sharedSections}</div>
        )}
      </div>
    </aside>
  );
};
