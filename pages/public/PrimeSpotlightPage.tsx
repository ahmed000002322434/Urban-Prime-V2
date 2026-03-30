import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import {
  spotlightService,
  type SpotlightComment,
  type SpotlightContextResponse,
  type SpotlightCreator,
  type SpotlightFeedMode,
  type SpotlightItem,
  type SpotlightProductLink
} from '../../services/spotlightService';
import { generateImageFromPrompt } from '../../services/geminiService';
import BackgroundRemovalModal from '../../components/BackgroundRemovalModal';
import BlueTickBadge from '../../components/spotlight/BlueTickBadge';
import SpotlightMessageDrawer from '../../components/spotlight/SpotlightMessageDrawer';
import SpotlightProfileCardModal from '../../components/spotlight/SpotlightProfileCardModal';

type SpotlightTab = 'for_you' | 'following';

const TABS: Array<{ id: SpotlightTab; label: string; hint: string }> = [
  { id: 'for_you', label: 'For you', hint: 'Curated discovery' },
  { id: 'following', label: 'Following', hint: 'Creators you follow' }
];

const NAV_ITEMS = [
  { to: '/', label: 'Back to home page', icon: HomeIcon },
  { to: '/spotlight', label: 'Spotlight', icon: SpotlightIcon },
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/messages', label: 'Messages', icon: MessagesIcon },
  { to: '/profile/me', label: 'Profile', icon: ProfileIcon },
  { to: '/more', label: 'More', icon: MoreIcon }
] as const;

const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');
const isVideo = (item: SpotlightItem) => item.media_type === 'video';
const isTextSpotlight = (item: SpotlightItem) => !isVideo(item) && String(item.media_url || '').startsWith('data:image/svg+xml');
const getSpotlightMediaLabel = (item: SpotlightItem) => {
  if (isVideo(item)) return 'Video spotlight';
  if (isTextSpotlight(item)) return 'Text spotlight';
  return 'Image spotlight';
};
const normalizeTag = (value: string) => value.replace(/^#/, '').toLowerCase().trim();
const formatTimeAgo = (value?: string | null) => {
  if (!value) return '';
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
};

const feedModeForTab = (tab: SpotlightTab): SpotlightFeedMode => {
  return tab;
};

type ComposerAttachment = {
  mediaType: 'image' | 'video';
  previewUrl: string;
  kind: 'file' | 'remote' | 'data';
  file?: File | null;
  fileName?: string;
};

const EMOJI_GRID = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '😇', '😉', '🥳', '🤩', '🔥', '💥', '✨', '💫',
  '🤝', '👏', '🙌', '🎉', '💯', '❤️', '🩵', '💙',
  '🫶', '🙏', '👌', '👍', '👀', '💭', '🌟', '⚡',
  '🍀', '🌈', '🎬', '📸', '🎵', '🪩', '🍾', '🚀',
  '🕶️', '💎', '🌙', '🎯', '🎁', '💖', '🧡', '💚'
];

const GIF_SEARCH_HINTS = [
  'celebrate',
  'clap',
  'fire',
  'wow',
  'mood',
  'party',
  'yes',
  'love',
  'cool',
  'dance',
  'thumbs up',
  'mind blown'
];

const GIF_LIBRARY = [
  { title: 'Celebrate', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { title: 'Hype', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { title: 'Mood', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { title: 'Win', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { title: 'Applause', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { title: 'Glow', url: 'https://media.giphy.com/media/xT0GqssRweIhlz209i/giphy.gif' },
  { title: 'Party', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { title: 'Fire', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { title: 'Dance', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy8/giphy.gif' },
  { title: 'Love', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif' },
  { title: 'Yes', url: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif' },
  { title: 'Wow', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif' }
];
const SPOTLIGHT_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const wrapCaptionLines = (value: string, maxLineLength = 28, maxLines = 5) => {
  const words = value.trim().split(/\s+/g).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  const trimmed = lines.slice(0, maxLines);
  if (lines.length > maxLines && trimmed.length > 0) {
    trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1]}…`;
  }
  return trimmed.length > 0 ? trimmed : ['Urban Prime', 'Spotlight'];
};

const buildTextPosterDataUrl = (caption: string) => {
  const safeCaption = caption.trim() || 'Urban Prime Spotlight';
  const lines = wrapCaptionLines(safeCaption, 28, 5);
  const lineSpans = lines
    .map((line, index) => `<tspan x="92" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`)
    .join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1800" viewBox="0 0 1400 1800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#08111f"/>
          <stop offset="48%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
        <radialGradient id="glow1" cx="30%" cy="20%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="80%" cy="75%" r="60%">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1400" height="1800" fill="url(#bg)" rx="72" />
      <circle cx="300" cy="320" r="220" fill="url(#glow1)" />
      <circle cx="1120" cy="1280" r="260" fill="url(#glow2)" />
      <rect x="72" y="72" width="1256" height="1656" rx="56" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <text x="92" y="170" font-family="Inter, Arial, sans-serif" font-size="30" letter-spacing="6" fill="rgba(255,255,255,0.78)">URBAN PRIME</text>
      <text x="92" y="248" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800" fill="#ffffff">Prime Spotlight</text>
      <text x="92" y="320" font-family="Inter, Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.82)">Created in-feed from a simple text prompt.</text>
      <rect x="92" y="420" width="410" height="56" rx="28" fill="rgba(255,255,255,0.16)" />
      <text x="122" y="458" font-family="Inter, Arial, sans-serif" font-size="24" fill="#ffffff">Text-first spotlight post</text>
      <text x="92" y="640" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${lineSpans}</text>
      <text x="92" y="1535" font-family="Inter, Arial, sans-serif" font-size="24" letter-spacing="3" fill="rgba(255,255,255,0.72)">Urban Prime • Spotlight</text>
      <text x="92" y="1605" font-family="Inter, Arial, sans-serif" font-size="26" fill="rgba(255,255,255,0.84)">From input bar to post, without leaving the page.</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';
  return new File([blob], fileName, { type: mimeType });
};

const captureVideoThumbnail = async (file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    await video.play().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    return new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
};

function HomeIcon() { return <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />; }
function SpotlightIcon() { return <path d="M12 2l2.8 6.2L21 11l-6 2.4L12 20l-3-6.6L3 11l6.2-2.8z" />; }
function BellIcon() { return <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6m6 11a2.5 2.5 0 0 1-2.5-2.5h5A2.5 2.5 0 0 1 12 20z" />; }
function MessagesIcon() { return <path d="M4 5h16v11H8l-4 3z" />; }
function ProfileIcon() { return <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 8a8 8 0 0 1 16 0" />; }
function MoreIcon() { return <path d="M6 12h.01M12 12h.01M18 12h.01" />; }
function SearchIcon() { return <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m5.2 12.2L21 21" />; }
function HeartIcon() { return <path d="M12 21s-8-5.1-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.9-8 11-8 11z" />; }
function CommentIcon() { return <path d="M4 5h16v11H8l-4 3z" />; }
function ShareIcon() { return <path d="M16 5a3 3 0 1 0-2.8-4m2.8 4L7 10m0 0 9 5m-9-5V5" />; }
function SaveIcon() { return <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1z" />; }
function RepostIcon() { return <path d="M7 7h10a4 4 0 0 1 4 4v2m0 0-2-2m2 2 2-2M17 17H7a4 4 0 0 1-4-4v-2m0 0 2 2m-2-2-2 2" />; }
function DislikeIcon() { return <path d="M6 15l6-6 6 6M12 9v12" />; }
function EyeIcon() { return <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />; }
function LogoMark() { return <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] text-sm font-black text-white shadow-lg">UP</div>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{children}</p>; }
function ActionPill({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/70 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">{children}</svg>
      <span>{label}</span>
    </button>
  );
}
function TrendPill({ label, category, count }: { label: string; category: string; count: number }) {
  return (
    <button className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">#{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{category}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">{compact(count)}</span>
      </div>
    </button>
  );
}
function FeedSkeleton() {
  return (
    <div className="rounded-[1.5rem] border border-white/60 bg-white/70 p-4 shadow-xl dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-2 w-1/4 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
      </div>
      <div className="mt-4 h-72 animate-pulse rounded-[1.35rem] bg-gradient-to-br from-slate-200/90 to-slate-300/70 dark:from-white/10 dark:to-white/5" />
      <div className="mt-4 h-3 w-5/6 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
    </div>
  );
}
function CommentNode({ comment, onLike, onReply, onDelete }: { comment: SpotlightComment; onLike: (id: string) => void; onReply: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <img src={safeAvatar(comment.user?.avatar_url)} alt={comment.user?.name || 'User'} className="h-8 w-8 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{comment.user?.name || 'User'}</p>
            {comment.user?.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
            <span className="text-[11px] text-slate-400">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{comment.body}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
            <button onClick={() => onLike(comment.id)} className="transition hover:text-sky-500">Like {compact(comment.like_count)}</button>
            <button onClick={() => onReply(comment.id)} className="transition hover:text-violet-500">Reply {compact(comment.reply_count)}</button>
            {comment.can_delete ? <button onClick={() => onDelete(comment.id)} className="transition hover:text-rose-500">Delete</button> : null}
          </div>
        </div>
      </div>
      {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
        <div className="mt-3 space-y-2 pl-10">
          {comment.replies.map((reply) => <CommentNode key={reply.id} comment={reply} onLike={onLike} onReply={onReply} onDelete={onDelete} />)}
        </div>
      ) : null}
    </div>
  );
}

function FeedCard({
  item,
  index,
  liked,
  disliked,
  reposted,
  saved,
  onLike,
  onDislike,
  onRepost,
  onSave,
  onShare,
  onOpenComment,
  onFollow,
  onOpenProfile,
  onOpenContext,
  onOpenImage,
  onOpenVideo,
  onOpenProduct,
  onProductImpression,
  onDoubleLike,
  viewerUserId
}: {
  item: SpotlightItem;
  index: number;
  liked: boolean;
  disliked: boolean;
  reposted: boolean;
  saved: boolean;
  onLike: (item: SpotlightItem) => void;
  onDislike: (item: SpotlightItem) => void;
  onRepost: (item: SpotlightItem) => void;
  onSave: (item: SpotlightItem) => void;
  onShare: (item: SpotlightItem) => void;
  onOpenComment: (item: SpotlightItem) => void;
  onFollow: (creator: SpotlightCreator | null) => void;
  onOpenProfile: (creator: SpotlightCreator | null) => void;
  onOpenContext: (item: SpotlightItem) => void;
  onOpenImage: (item: SpotlightItem) => void;
  onOpenVideo: (item: SpotlightItem) => void;
  onOpenProduct: (item: SpotlightItem, product: SpotlightProductLink) => void;
  onProductImpression: (item: SpotlightItem) => void;
  onDoubleLike: (item: SpotlightItem) => void;
  viewerUserId?: string | null;
}) {
  const tapRef = useRef<number>(0);
  const mediaRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVideo(item)) return;
    const node = mediaRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.6);
    }, { threshold: [0, 0.6, 1], rootMargin: '120px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [item]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo(item)) return;
    video.muted = true;
    if (isVisible) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isVisible, item]);

  useEffect(() => {
    if (!isVisible || !Array.isArray(item.products) || item.products.length === 0) return;
    onProductImpression(item);
  }, [isVisible, item, onProductImpression]);

  const handleMediaClick = () => {
    const now = Date.now();
    if (now - tapRef.current < 280) {
      onDoubleLike(item);
      tapRef.current = 0;
      return;
    }
    tapRef.current = now;
    if (isVideo(item)) onOpenVideo(item); else onOpenImage(item);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-140px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(index * 0.04, 0.16) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.995 }}
      className="mx-2 my-2 rounded-[1.8rem] border border-white/80 bg-white/75 px-3 py-3 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur-3xl transition duration-300 hover:bg-white hover:shadow-[0_26px_68px_rgba(15,23,42,0.13)] dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10 sm:mx-3 sm:my-3 sm:px-4 sm:py-4">
      <header className="flex items-start gap-3">
        <button type="button" onClick={() => onOpenProfile(item.creator)} className="shrink-0">
          <img src={safeAvatar(item.creator?.avatar_url)} alt={item.creator?.name || 'Creator'} className="h-11 w-11 rounded-full object-cover shadow-sm transition duration-200 hover:scale-[1.03] sm:h-12 sm:w-12" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[14px] sm:text-[15px]">
            <button type="button" onClick={() => onOpenProfile(item.creator)} className="truncate font-bold text-slate-950 transition hover:underline dark:text-white">{item.creator?.name || 'Creator'}</button>
            {item.creator?.is_verified ? <BlueTickBadge className="h-5 w-5" /> : null}
            <span className="truncate text-slate-500 dark:text-slate-400">@{(item.creator?.name || 'creator').toLowerCase().replace(/\s+/g, '')}</span>
            <span className="text-slate-500 dark:text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">{formatTimeAgo(item.published_at || item.created_at)}</span>
          </div>
          <p className="mt-1 text-[14px] leading-6 text-slate-900 dark:text-slate-100 sm:text-[15px]">{item.caption}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.creator && item.creator.id !== viewerUserId ? (
            <button
              onClick={() => onFollow(item.creator)}
              className={`rounded-full border px-3 py-2 text-[11px] font-bold transition duration-200 hover:-translate-y-0.5 ${item.creator.is_following ? 'border-slate-200 bg-slate-950 text-white shadow-md dark:border-white/10 dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
            >
              {item.creator.is_following ? 'Following' : 'Follow'}
            </button>
          ) : null}
          <button onClick={() => onOpenComment(item)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Open details">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 12h.01M12 12h.01M18 12h.01" /></svg>
          </button>
        </div>
      </header>

      <div className="relative mt-3 overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-slate-100/70 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
        <button ref={mediaRef} onClick={handleMediaClick} className="group/media relative block w-full overflow-hidden text-left">
          {isVideo(item) ? (
            <div className="relative w-full overflow-hidden rounded-[1.15rem] bg-black" style={{ aspectRatio: '9 / 16', maxHeight: '500px' }}>
              <video
                ref={videoRef}
                src={item.media_url}
                poster={item.thumbnail_url || undefined}
                autoPlay
                muted
                loop
                playsInline
                preload={index < 2 ? 'auto' : 'metadata'}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover/media:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white shadow-2xl backdrop-blur-xl transition duration-200 group-hover/media:scale-105">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden rounded-[1.15rem] bg-slate-100 dark:bg-white/5" style={{ aspectRatio: '4 / 5', maxHeight: '540px' }}>
              <img src={item.media_url} alt={item.caption || 'Spotlight post'} loading={index < 3 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover/media:scale-[1.01]" />
            </div>
          )}
        </button>
        <div className="absolute left-4 top-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xl">{getSpotlightMediaLabel(item)}</div>
      </div>

      {Array.isArray(item.products) && item.products.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.products.slice(0, 3).map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onOpenProduct(item, product)}
              className={`group/product flex min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${product.is_primary ? 'border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100' : 'border-white/70 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition duration-300 group-hover/product:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">UP</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold">{product.title}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {product.sale_price ? `${product.currency || 'USD'} ${product.sale_price}` : product.cta_label}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-500 dark:text-slate-400 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:text-[13px]">
        <button onClick={() => onLike(item)} className={`flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 ${liked ? 'bg-rose-500/10 text-rose-500 sm:bg-transparent' : 'hover:text-slate-900 dark:hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 21s-8-5.1-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.9-8 11-8 11z" /></svg>
          <span>{compact(item.metrics.likes)}</span>
        </button>
        <button onClick={() => onDislike(item)} className={`flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 ${disliked ? 'bg-orange-500/10 text-orange-500 sm:bg-transparent' : 'hover:text-slate-900 dark:hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 15l6-6 6 6M12 9v12" /></svg>
          <span>{compact(item.metrics.dislikes || 0)}</span>
        </button>
        <button onClick={() => onRepost(item)} className={`flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 ${reposted ? 'bg-emerald-500/10 text-emerald-500 sm:bg-transparent' : 'hover:text-slate-900 dark:hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={reposted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M7 7h10a4 4 0 0 1 4 4v2m0 0-2-2m2 2 2-2M17 17H7a4 4 0 0 1-4-4v-2m0 0 2 2m-2-2-2 2" /></svg>
          <span>{compact(item.metrics.reposts || 0)}</span>
        </button>
        <button onClick={() => onOpenComment(item)} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 hover:text-slate-900 dark:hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 5h16v11H8l-4 3z" /></svg>
          <span>{compact(item.metrics.comments)}</span>
        </button>
        <button onClick={() => onShare(item)} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 hover:text-slate-900 dark:hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M16 5a3 3 0 1 0-2.8-4m2.8 4L7 10m0 0 9 5m-9-5V5" /></svg>
          <span>{compact(item.metrics.shares)}</span>
        </button>
        <button onClick={() => onSave(item)} className={`flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 ${saved ? 'bg-sky-500/10 text-sky-500 sm:bg-transparent' : 'hover:text-slate-900 dark:hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1z" /></svg>
          <span>{compact(item.metrics.saves)}</span>
        </button>
        <button onClick={() => onOpenContext(item)} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 hover:text-slate-900 dark:hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 5h16v10H8l-4 4V5z" /></svg>
          <span>Context</span>
        </button>
        <button onClick={() => onOpenImage(item)} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition sm:rounded-none sm:px-0 sm:py-0 hover:text-slate-900 dark:hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
          <span>{compact(item.metrics.views)}</span>
        </button>
      </div>
    </motion.article>
  );
}

function DetailModal({
  item,
  comments,
  commentSort,
  commentText,
  replyTo,
  liked,
  disliked,
  reposted,
  saved,
  onClose,
  onLike,
  onDislike,
  onRepost,
  onSave,
  onShare,
  onCommentSort,
  onCommentText,
  onSubmitComment,
  onLikeComment,
  onReplyTo,
  onDeleteComment,
  onOpenProfile
}: {
  item: SpotlightItem | null;
  comments: SpotlightComment[];
  commentSort: 'top' | 'new';
  commentText: string;
  replyTo: string | null;
  liked: boolean;
  disliked: boolean;
  reposted: boolean;
  saved: boolean;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onRepost: () => void;
  onSave: () => void;
  onShare: () => void;
  onCommentSort: (sort: 'top' | 'new') => void;
  onCommentText: (value: string) => void;
  onSubmitComment: () => void;
  onLikeComment: (id: string) => void;
  onReplyTo: (id: string | null) => void;
  onDeleteComment: (id: string) => void;
  onOpenProfile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item || !isVideo(item)) return;
    video.muted = isMuted;
    if (isPlaying) video.play().catch(() => undefined);
    else video.pause();
  }, [isMuted, isPlaying, item]);

  useEffect(() => {
    setIsPlaying(true);
    setIsMuted(true);
    setProgress(0);
    setDuration(0);
  }, [item?.id]);

  if (!item) return null;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = async () => {
    const node = videoRef.current?.parentElement?.parentElement as HTMLElement | null;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      if (node.requestFullscreen) {
        await node.requestFullscreen().catch(() => undefined);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-2xl md:items-center md:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-white shadow-[0_40px_100px_rgba(0,0,0,0.35)] dark:bg-[#08111f] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <button onClick={onOpenProfile} className="flex items-center gap-3 text-left">
            <img src={safeAvatar(item.creator?.avatar_url)} alt={item.creator?.name || 'Creator'} className="h-11 w-11 rounded-2xl object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{item.creator?.name || 'Creator'}</p>
                {item.creator?.is_verified ? <BlueTickBadge className="h-5 w-5" /> : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(item.published_at || item.created_at)}</p>
            </div>
          </button>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="grid flex-1 min-h-0 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="relative min-h-0 bg-black">
            {isVideo(item) ? (
              <div className="relative h-full w-full">
                <video
                  ref={videoRef}
                  src={item.media_url}
                  poster={item.thumbnail_url || undefined}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="h-full w-full object-contain"
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    setProgress(video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0);
                  }}
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                  <div className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-xl">{getSpotlightMediaLabel(item)}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted((value) => !value)} className="rounded-full border border-white/20 bg-white/10 p-2 text-white backdrop-blur-xl transition hover:bg-white/20" aria-label={isMuted ? 'Unmute video' : 'Mute video'}>
                      {isMuted ? <VolumeXIcon /> : <VolumeIcon />}
                    </button>
                    <button onClick={togglePlay} className="rounded-full border border-white/20 bg-white/10 p-2 text-white backdrop-blur-xl transition hover:bg-white/20" aria-label={isPlaying ? 'Pause video' : 'Play video'}>
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </button>
                    <button onClick={toggleFullscreen} className="rounded-full border border-white/20 bg-white/10 p-2 text-white backdrop-blur-xl transition hover:bg-white/20" aria-label="Toggle fullscreen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="rounded-full bg-white/12 p-1 backdrop-blur-xl">
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-white/75">
                    <span>{Math.round(progress)}%</span>
                    <span>{duration ? `${Math.max(0, Math.round(duration - (duration * progress) / 100))}s left` : 'Live playback'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <img src={item.media_url} alt={item.caption || 'Spotlight post'} className="h-full w-full object-contain" />
            )}
          </div>
          <div className="flex min-h-0 flex-col border-t border-slate-200/70 dark:border-white/10 lg:border-l lg:border-t-0">
            <div className="space-y-4 overflow-y-auto px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.caption}</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <ActionPill active={liked} label={compact(item.metrics.likes)} onClick={onLike}><HeartIcon /></ActionPill>
                <ActionPill active={disliked} label={compact(item.metrics.dislikes || 0)} onClick={onDislike}><DislikeIcon /></ActionPill>
                <ActionPill active={reposted} label={compact(item.metrics.reposts || 0)} onClick={onRepost}><RepostIcon /></ActionPill>
                <ActionPill active={saved} label={compact(item.metrics.saves)} onClick={onSave}><SaveIcon /></ActionPill>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
                <button onClick={() => onCommentSort('top')} className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold ${commentSort === 'top' ? 'bg-white text-slate-950 shadow dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>Top</button>
                <button onClick={() => onCommentSort('new')} className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold ${commentSort === 'new' ? 'bg-white text-slate-950 shadow dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>New</button>
              </div>
              <div className="space-y-3">
                {comments.map((comment) => <CommentNode key={comment.id} comment={comment} onLike={onLikeComment} onReply={onReplyTo} onDelete={onDeleteComment} />)}
                {comments.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">No comments yet. Start the conversation.</div> : null}
              </div>
            </div>
            <div className="border-t border-slate-200/70 p-4 dark:border-white/10">
              {replyTo ? <div className="mb-2 flex items-center justify-between rounded-2xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><span>Replying to a comment</span><button onClick={() => onReplyTo(null)}>Cancel</button></div> : null}
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                <input value={commentText} onChange={(e) => onCommentText(e.target.value)} placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white" />
                <button onClick={onSubmitComment} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950">Send</button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{compact(item.metrics.comments)} comments</span>
                <button onClick={onShare} className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-300">Copy share link</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextModeModal({
  item,
  related,
  sameCreator,
  similar,
  products,
  similarProducts,
  loading,
  onClose,
  onOpenItem,
  onOpenProduct
}: {
  item: SpotlightItem | null;
  related: SpotlightItem[];
  sameCreator: SpotlightItem[];
  similar: SpotlightItem[];
  products: SpotlightProductLink[];
  similarProducts: SpotlightProductLink[];
  loading: boolean;
  onClose: () => void;
  onOpenItem: (item: SpotlightItem) => void;
  onOpenProduct: (item: SpotlightItem, product: SpotlightProductLink) => void;
}) {
  if (!item) return null;

  const renderCard = (entry: SpotlightItem) => (
    <button
      key={entry.id}
      type="button"
      onClick={() => onOpenItem(entry)}
      className="group flex w-full gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white/80 p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-slate-100 dark:bg-white/5">
        <img src={entry.thumbnail_url || entry.media_url} alt={entry.caption || 'Related post'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
          {getSpotlightMediaLabel(entry)}
        </div>
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{entry.creator?.name || 'Creator'}</p>
          {entry.creator?.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{entry.caption || 'Related Spotlight content'}</p>
        <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{compact(entry.metrics.likes)} likes · {compact(entry.metrics.views)} views</p>
      </div>
    </button>
  );

  const renderProductCard = (product: SpotlightProductLink, tone: 'primary' | 'secondary' = 'secondary') => (
    <button
      key={product.id}
      type="button"
      onClick={() => onOpenProduct(item, product)}
      className={`group flex w-full gap-3 rounded-[1.2rem] border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tone === 'primary' ? 'border-sky-200 bg-sky-50/85 dark:border-sky-400/20 dark:bg-sky-400/10' : 'border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5'}`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-slate-100 dark:bg-white/5">
        {product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : null}
        {product.is_primary ? (
          <div className="absolute left-2 top-2 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm">
            Primary
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{product.title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {product.sale_price ? `${product.currency || 'USD'} ${product.sale_price}` : product.cta_label}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{product.cta_label}</p>
      </div>
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] bg-slate-950/55 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.aside
          initial={{ x: 28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 28, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-white/92 shadow-[0_40px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl dark:bg-[#08111f]/96"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 dark:border-white/10">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-500">Context mode</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Why this post is showing up</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Related posts, creator context, and similar content based on signals already in Spotlight.</p>
            </div>
            <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" aria-label="Close context mode">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <section className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">Tagged products</p>
                <div className="mt-3 space-y-3">
                  {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading context signals...</p> : null}
                  {!loading && products.length > 0 ? products.map((product) => renderProductCard(product, product.is_primary ? 'primary' : 'secondary')) : null}
                  {!loading && products.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Add tagged products to turn this post into a shopping entry point.</p> : null}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Same creator</p>
                <div className="mt-3 space-y-3">
                  {sameCreator.length > 0 ? sameCreator.map(renderCard) : <p className="text-sm text-slate-500 dark:text-slate-400">More posts from this creator will appear here.</p>}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-500">Related by tags</p>
                <div className="mt-3 space-y-3">
                  {related.length > 0 ? related.map(renderCard) : <p className="text-sm text-slate-500 dark:text-slate-400">No tag-based matches yet. Keep browsing to improve suggestions.</p>}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500">Similar content</p>
                <div className="mt-3 space-y-3">
                  {similar.length > 0 ? similar.map(renderCard) : <p className="text-sm text-slate-500 dark:text-slate-400">Similar media will surface here as the feed grows.</p>}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-500">Similar products</p>
                <div className="mt-3 space-y-3">
                  {similarProducts.length > 0 ? similarProducts.map((product) => renderProductCard(product)) : <p className="text-sm text-slate-500 dark:text-slate-400">Similar products will appear here as Spotlight product tagging grows.</p>}
                </div>
              </section>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}

const PrimeSpotlightPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { scrollYProgress } = useScroll();
  const heroGlow = useTransform(scrollYProgress, [0, 0.35], [0.18, 0.05]);

  const [tab, setTab] = useState<SpotlightTab>('for_you');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeItem, setActiveItem] = useState<SpotlightItem | null>(null);
  const [contextItem, setContextItem] = useState<SpotlightItem | null>(null);
  const [contextData, setContextData] = useState<SpotlightContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [comments, setComments] = useState<SpotlightComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<'top' | 'new'>('top');
  const [suggestedCreators, setSuggestedCreators] = useState<SpotlightCreator[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [messageTarget, setMessageTarget] = useState<SpotlightCreator | null>(null);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [profileCardUsername, setProfileCardUsername] = useState<string | null>(null);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [followPrompt, setFollowPrompt] = useState<SpotlightCreator | null>(null);
  const [composerText, setComposerText] = useState('');
  const [composerAttachment, setComposerAttachment] = useState<ComposerAttachment | null>(null);
  const [composerScheduledFor, setComposerScheduledFor] = useState('');
  const [composerVisibility, setComposerVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [composerAllowComments, setComposerAllowComments] = useState(true);
  const [composerGifUrl, setComposerGifUrl] = useState('');
  const [composerGifSearch, setComposerGifSearch] = useState('');
  const [composerAiPrompt, setComposerAiPrompt] = useState('');
  const [composerAiStyle, setComposerAiStyle] = useState('clean editorial spotlight');
  const [composerTool, setComposerTool] = useState<'gif' | 'emoji' | 'schedule' | 'edit' | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPublishingComposer, setIsPublishingComposer] = useState(false);
  const seenIdsRef = useRef(new Set<string>());
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const composerAttachmentObjectUrlRef = useRef<string | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const followPromptTimerRef = useRef<number | null>(null);
  const trackedProductImpressionsRef = useRef(new Set<string>());
  const activePostId = routeId || null;
  const sessionId = useMemo(() => `spotlight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  const canInteract = () => {
    if (user) return true;
    openAuthModal('login');
    return false;
  };

  const buildSpotlightAttribution = useCallback((item: SpotlightItem, product?: SpotlightProductLink) => {
    const expiresAt = new Date(Date.now() + SPOTLIGHT_ATTRIBUTION_WINDOW_MS).toISOString();
    return {
      spotlightContentId: item.id,
      spotlightProductLinkId: product?.id || null,
      campaignKey: product?.campaign_key || null,
      expiresAt
    };
  }, []);

  const buildProductHref = useCallback((item: SpotlightItem, product: SpotlightProductLink) => {
    const attribution = buildSpotlightAttribution(item, product);
    const params = new URLSearchParams({
      spotlight_content_id: attribution.spotlightContentId,
      spotlight_product_link_id: attribution.spotlightProductLinkId || '',
      spotlight_campaign_key: attribution.campaignKey || '',
      spotlight_attribution_expires_at: attribution.expiresAt || ''
    });
    return `/item/${product.item_id}?${params.toString()}`;
  }, [buildSpotlightAttribution]);

  const persistProductAttribution = useCallback((itemId: string, item: SpotlightItem, product?: SpotlightProductLink) => {
    if (!itemId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        `urbanprime:spotlight:attribution:${itemId}`,
        JSON.stringify(buildSpotlightAttribution(item, product))
      );
    } catch {
      // ignore attribution persistence failures
    }
  }, [buildSpotlightAttribution]);

  const mergeItems = useCallback((incoming: SpotlightItem[], reset = false) => {
    setItems((prev) => {
      const base = reset ? [] : [...prev];
      if (reset) seenIdsRef.current.clear();
      incoming.forEach((item) => {
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);
        base.push(item);
      });
      return base;
    });
  }, []);

  const pushItemToFront = useCallback((incoming: SpotlightItem | null | undefined) => {
    if (!incoming?.id) return;
    seenIdsRef.current.add(incoming.id);
    setItems((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)]);
  }, []);

  const loadFeed = useCallback(async (reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const payload = await spotlightService.getFeed({
        mode: feedModeForTab(tab),
        cursor: reset ? null : cursorRef.current,
        limit: 10,
        viewerFirebaseUid: user?.id
      });
      mergeItems(payload.items, reset);
      setCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
    } catch (error: any) {
      showNotification(error?.message || 'Failed to load Spotlight.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mergeItems, showNotification, tab, user?.id]);

  const refreshComments = useCallback(async (contentId: string, sort: 'top' | 'new' = 'top') => {
    const nextComments = await spotlightService.getComments(contentId, sort, user?.id);
    setComments(nextComments);
  }, [user?.id]);

  const setItemState = useCallback((contentId: string, mutator: (item: SpotlightItem) => SpotlightItem) => {
    setItems((prev) => prev.map((item) => (item.id === contentId ? mutator(item) : item)));
    setActiveItem((current) => (current && current.id === contentId ? mutator(current) : current));
  }, []);

  const openItem = useCallback(async (item: SpotlightItem) => {
    setActiveItem(item);
    setCommentSort('top');
    setReplyTo(null);
    try {
      await refreshComments(item.id, 'top');
    } catch {
      setComments([]);
    }
  }, [refreshComments]);

  const openContextMode = useCallback(async (item: SpotlightItem) => {
    setContextItem(item);
    setContextData(null);
    setContextLoading(true);
    try {
      const response = await spotlightService.getContext(item.id, user?.id);
      if (response?.content) {
        setContextItem(response.content);
      }
      setContextData(response || null);
    } catch {
      setContextData(null);
    } finally {
      setContextLoading(false);
    }
  }, [user?.id]);

  const closeContextMode = useCallback(() => {
    setContextItem(null);
    setContextData(null);
    setContextLoading(false);
  }, []);

  const openRouteItem = useCallback(async (contentId: string) => {
    const found = items.find((item) => item.id === contentId);
    if (found) return openItem(found);
    try {
      const item = await spotlightService.getContent(contentId, user?.id);
      if (item) await openItem(item);
    } catch {
      showNotification('Unable to open post.');
    }
  }, [items, openItem, showNotification, user?.id]);

  useEffect(() => {
    if (!activePostId) return;
    void openRouteItem(activePostId);
  }, [activePostId, openRouteItem]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    void loadFeed(true);
  }, [loadFeed, tab, user?.id]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    spotlightService.getSuggestedUsers(user?.id).then(setSuggestedCreators).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    if (followPromptTimerRef.current) {
      window.clearTimeout(followPromptTimerRef.current);
      followPromptTimerRef.current = null;
    }
    if (!followPrompt) return;
    followPromptTimerRef.current = window.setTimeout(() => {
      setFollowPrompt(null);
      followPromptTimerRef.current = null;
    }, 2800);
    return () => {
      if (followPromptTimerRef.current) {
        window.clearTimeout(followPromptTimerRef.current);
        followPromptTimerRef.current = null;
      }
    };
  }, [followPrompt]);

  useEffect(() => {
    const previewItems = items.filter((item) => {
      if (!search.trim()) return true;
      const creatorName = item.creator?.name || '';
      const haystack = [item.caption, creatorName, ...(item.hashtags || []), ...(item.interest_tags || [])].join(' ').toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
    const sources = previewItems.slice(0, 6).flatMap((item) => {
      if (item.media_type === 'video') {
        return [item.thumbnail_url || item.media_url];
      }
      return [item.media_url];
    }).filter(Boolean) as string[];
    sources.slice(0, 3).forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });
  }, [items, search]);

  useEffect(() => {
    const draftKey = `urbanprime:spotlight:composer:${user?.id || 'guest'}`;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setComposerText(String(parsed?.text || ''));
      setComposerVisibility(parsed?.visibility || 'public');
      setComposerAllowComments(parsed?.allowComments !== false);
      setComposerScheduledFor(String(parsed?.scheduledFor || ''));
      setComposerGifUrl(String(parsed?.gifUrl || ''));
      setComposerAiPrompt(String(parsed?.aiPrompt || ''));
    } catch {
      // ignore invalid draft data
    }
  }, [user?.id]);

  useEffect(() => {
    const draftKey = `urbanprime:spotlight:composer:${user?.id || 'guest'}`;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          text: composerText,
          visibility: composerVisibility,
          allowComments: composerAllowComments,
          scheduledFor: composerScheduledFor,
          gifUrl: composerGifUrl,
          aiPrompt: composerAiPrompt,
          updatedAt: new Date().toISOString()
        })
      );
    } catch {
      // ignore draft persistence failures
    }
  }, [composerAiPrompt, composerAllowComments, composerGifUrl, composerScheduledFor, composerText, composerVisibility, user?.id]);

  useEffect(() => {
    return () => {
      if (composerAttachmentObjectUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(composerAttachmentObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMore || tab === 'people') return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore) void loadFeed(false);
    }, { rootMargin: '320px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadFeed, loadingMore, tab]);

  useEffect(() => {
    const preloadTargets = items.slice(0, 5);
    preloadTargets.forEach((item) => {
      const preloader = new Image();
      preloader.src = item.thumbnail_url || item.media_url;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let list = items;
    if (needle) {
      list = list.filter((item) => {
        const creatorName = item.creator?.name || '';
        const haystack = [item.caption, creatorName, ...(item.hashtags || []), ...(item.interest_tags || [])].join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }
    return list;
  }, [items, search, tab]);

  const trendItems = useMemo(() => {
    const map = new Map<string, { count: number; category: string }>();
    items.forEach((item) => {
      (item.hashtags || []).forEach((tag) => {
        const key = tag.replace(/^#/, '').toLowerCase();
        if (!key) return;
        const category = item.media_type === 'video' ? 'Video' : 'Photo';
        const current = map.get(key) || { count: 0, category };
        current.count += 1;
        current.category = category;
        map.set(key, current);
      });
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, category: value.category, count: value.count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [items]);

  const visibleCreators = useMemo(() => {
    const map = new Map<string, SpotlightCreator>();
    items.forEach((item) => { if (item.creator) map.set(item.creator.id, item.creator); });
    return Array.from(map.values()).slice(0, 6);
  }, [items]);

  const contextCollections = useMemo(() => {
    if (!contextItem) {
      return { related: [] as SpotlightItem[], sameCreator: [] as SpotlightItem[], similar: [] as SpotlightItem[] };
    }

    const contextTags = new Set(
      [...(contextItem.hashtags || []), ...(contextItem.interest_tags || [])]
        .map(normalizeTag)
        .filter(Boolean)
    );

    const overlapScore = (candidate: SpotlightItem) => {
      if (candidate.id === contextItem.id) return -1;
      const candidateTags = [...(candidate.hashtags || []), ...(candidate.interest_tags || [])].map(normalizeTag);
      const tagScore = candidateTags.reduce((total, tag) => total + (contextTags.has(tag) ? 1 : 0), 0);
      const creatorScore = candidate.creator_user_id === contextItem.creator_user_id ? 4 : 0;
      const mediaScore = candidate.media_type === contextItem.media_type ? 1 : 0;
      return tagScore * 3 + creatorScore + mediaScore;
    };

    const sameCreator = items
      .filter((item) => item.id !== contextItem.id && item.creator_user_id === contextItem.creator_user_id)
      .sort((left, right) => (new Date(right.published_at || right.created_at).getTime() - new Date(left.published_at || left.created_at).getTime()))
      .slice(0, 6);

    const related = [...items]
      .filter((item) => item.id !== contextItem.id)
      .map((item) => ({ item, score: overlapScore(item) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item)
      .slice(0, 8);

    const similar = [...items]
      .filter((item) => item.id !== contextItem.id && item.media_type === contextItem.media_type)
      .sort((left, right) => (new Date(right.published_at || right.created_at).getTime() - new Date(left.published_at || left.created_at).getTime()))
      .slice(0, 6);

    return { related, sameCreator, similar };
  }, [contextItem, items]);

  const contextSameCreator = contextData?.same_creator || contextCollections.sameCreator;
  const contextRelated = contextData?.related_posts || contextCollections.related;
  const contextSimilar = contextData?.similar_posts || contextCollections.similar;
  const contextProducts = contextData?.products || contextItem?.products || [];
  const contextSimilarProducts = contextData?.similar_products || [];

  const handleLike = async (item: SpotlightItem) => {
    if (!canInteract()) return;
    const liked = likedIds.has(item.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setDislikedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, likes: Math.max(0, Number(current.metrics.likes || 0) + (liked ? -1 : 1)) } }));
    try {
      const result = await spotlightService.likeContent(item.id);
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, likes: result.likes } }));
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, likes: Math.max(0, Number(current.metrics.likes || 0) + (liked ? 1 : -1)) } }));
        showNotification('Unable to update like.');
    }
  };

  const handleDislike = async (item: SpotlightItem) => {
    if (!canInteract()) return;
    const disliked = dislikedIds.has(item.id);
    setDislikedIds((prev) => {
      const next = new Set(prev);
      if (disliked) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, dislikes: Math.max(0, Number(current.metrics.dislikes || 0) + (disliked ? -1 : 1)) } }));
    try {
      const result = await spotlightService.dislikeContent(item.id);
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, dislikes: result.dislikes } }));
    } catch {
      setDislikedIds((prev) => {
        const next = new Set(prev);
        if (disliked) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, dislikes: Math.max(0, Number(current.metrics.dislikes || 0) + (disliked ? 1 : -1)) } }));
      showNotification('Unable to update dislike state.');
    }
  };

  const handleDoubleLike = async (item: SpotlightItem) => {
    if (!likedIds.has(item.id)) await handleLike(item);
  };

  const handleSave = async (item: SpotlightItem) => {
    if (!canInteract()) return;
    const saved = savedIds.has(item.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, saves: Math.max(0, Number(current.metrics.saves || 0) + (saved ? -1 : 1)) } }));
    try {
      const result = await spotlightService.saveContent(item.id);
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, saves: result.saves } }));
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, saves: Math.max(0, Number(current.metrics.saves || 0) + (saved ? 1 : -1)) } }));
      showNotification('Unable to update save state.');
    }
  };

  const handleRepost = async (item: SpotlightItem) => {
    if (!canInteract()) return;
    const reposted = repostedIds.has(item.id);
    setRepostedIds((prev) => {
      const next = new Set(prev);
      if (reposted) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, reposts: Math.max(0, Number(current.metrics.reposts || 0) + (reposted ? -1 : 1)) } }));
    try {
      const result = await spotlightService.repostContent(item.id);
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, reposts: result.reposts } }));
      if (result.content?.id) {
        setItems((prev) => [result.content as SpotlightItem, ...prev.filter((entry) => entry.id !== result.content?.id)]);
      }
      showNotification(reposted ? 'Removed repost.' : 'Reposted to your profile.');
    } catch (error: any) {
      setRepostedIds((prev) => {
        const next = new Set(prev);
        if (reposted) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItemState(item.id, (current) => ({ ...current, metrics: { ...current.metrics, reposts: Math.max(0, Number(current.metrics.reposts || 0) + (reposted ? 1 : -1)) } }));
      showNotification(error?.message || 'Unable to repost content.');
    }
  };

  const handleShare = async (item: SpotlightItem) => {
    await spotlightService.shareContent(item.id).catch(() => undefined);
    if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(`${window.location.origin}/spotlight/post/${item.id}`);
    showNotification('Share link copied.');
  };

  const handleProductImpression = useCallback((item: SpotlightItem) => {
    const products = Array.isArray(item.products) ? item.products.slice(0, 3) : [];
    products.forEach((product) => {
      const impressionKey = `${item.id}:${product.id}`;
      if (trackedProductImpressionsRef.current.has(impressionKey)) return;
      trackedProductImpressionsRef.current.add(impressionKey);
      void spotlightService.trackProductEvent({
        content_id: item.id,
        product_link_id: product.id,
        item_id: product.item_id,
        event_name: 'impression',
        campaign_key: product.campaign_key || null,
        viewer_firebase_uid: user?.id,
        session_id: sessionId,
        metadata: {
          surface: 'spotlight_feed',
          placement: product.placement
        }
      }).catch(() => undefined);
    });
  }, [sessionId, user?.id]);

  const handleOpenProduct = useCallback((item: SpotlightItem, product: SpotlightProductLink) => {
    persistProductAttribution(product.item_id, item, product);
    void spotlightService.trackProductEvent({
      content_id: item.id,
      product_link_id: product.id,
      item_id: product.item_id,
      event_name: 'click',
      campaign_key: product.campaign_key || null,
      viewer_firebase_uid: user?.id,
      session_id: sessionId,
      metadata: {
        surface: contextItem?.id === item.id ? 'context_mode' : 'spotlight_feed',
        placement: product.placement
      }
    }).catch(() => undefined);
    navigate(buildProductHref(item, product));
  }, [buildProductHref, contextItem?.id, navigate, persistProductAttribution, sessionId, user?.id]);

  const handleFollow = useCallback(async (creator: SpotlightCreator | null) => {
    if (!creator || !canInteract()) return;
    await spotlightService.followCreator(creator.firebase_uid).then((result) => {
      const followerDelta = result?.following ? 1 : -1;
      if (result?.following) {
        setFollowPrompt(creator);
        setItems((prev) => prev.map((item) => (
          item.creator?.id === creator.id || item.creator?.firebase_uid === creator.firebase_uid
            ? { ...item, creator: item.creator ? { ...item.creator, is_following: true, followers_count: Math.max(0, Number(item.creator.followers_count || 0) + followerDelta) } : item.creator }
            : item
        )));
        setSuggestedCreators((prev) => prev.map((entry) => (
          entry.id === creator.id || entry.firebase_uid === creator.firebase_uid
            ? { ...entry, is_following: true, followers_count: Math.max(0, Number(entry.followers_count || 0) + followerDelta) }
            : entry
        )));
        showNotification(`Following ${creator.name}.`);
      } else {
        setFollowPrompt(null);
        setItems((prev) => prev.map((item) => (
          item.creator?.id === creator.id || item.creator?.firebase_uid === creator.firebase_uid
            ? { ...item, creator: item.creator ? { ...item.creator, is_following: false, followers_count: Math.max(0, Number(item.creator.followers_count || 0) + followerDelta) } : item.creator }
            : item
        )));
        setSuggestedCreators((prev) => prev.map((entry) => (
          entry.id === creator.id || entry.firebase_uid === creator.firebase_uid
            ? { ...entry, is_following: false, followers_count: Math.max(0, Number(entry.followers_count || 0) + followerDelta) }
            : entry
        )));
        showNotification(`Unfollowed ${creator.name}.`);
      }
      if (tab === 'following') {
        seenIdsRef.current.clear();
        void loadFeed(true);
      }
    }).catch((error: any) => showNotification(error?.message || 'Unable to follow creator.'));
  }, [canInteract, loadFeed, showNotification, tab]);

  const handleOpenImage = async (item: SpotlightItem) => {
    if (isVideo(item)) {
      navigate(`/reels?focus=${item.id}`);
      return;
    }
    await openItem(item);
    if (activePostId !== item.id) navigate(`/spotlight/post/${item.id}`);
  };

  const handleOpenVideo = (item: SpotlightItem) => navigate(`/reels?focus=${item.id}`);

  const handleOpenComments = async (item: SpotlightItem) => {
    if (!canInteract()) return;
    await openItem(item);
  };

  const openMessageDrawerFor = (creator: SpotlightCreator | null) => {
    if (!creator) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    setMessageTarget(creator);
    setMessageDrawerOpen(true);
  };

  const openProfileCard = useCallback((creator: SpotlightCreator | null) => {
    if (!creator?.name && !creator?.firebase_uid) return;
    setProfileCardUsername(creator?.name || creator?.firebase_uid || null);
    setProfileCardOpen(true);
  }, []);

  const openViewerProfileCard = useCallback(() => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    const viewerName = String((user as any)?.name || '').trim() || String(user.id || '').trim();
    if (!viewerName) return;
    setProfileCardUsername(viewerName);
    setProfileCardOpen(true);
  }, [openAuthModal, user]);

  const openMessagesPanel = () => {
    const target = suggestedCreators[0] || visibleCreators[0] || null;
    if (!target) {
      showNotification('Pick a creator to start a chat.');
      return;
    }
    openMessageDrawerFor(target);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!activeItem || !canInteract()) return;
    await spotlightService.likeComment(commentId).then(() => refreshComments(activeItem.id, commentSort)).catch(() => undefined);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeItem || !canInteract()) return;
    await spotlightService.deleteComment(commentId).then(() => refreshComments(activeItem.id, commentSort)).catch(() => undefined);
  };

  const handleSubmitComment = async () => {
    if (!activeItem || !canInteract() || !commentText.trim()) return;
    await spotlightService.addComment(activeItem.id, commentText.trim(), replyTo).then(async () => {
      setCommentText('');
      setReplyTo(null);
      setItemState(activeItem.id, (current) => ({ ...current, metrics: { ...current.metrics, comments: Number(current.metrics.comments || 0) + 1 } }));
      await refreshComments(activeItem.id, commentSort);
    }).catch((error: any) => showNotification(error?.message || 'Unable to post comment.'));
  };

  const userAvatar = (user as any)?.photoURL || (user as any)?.avatar_url || null;

  const clearComposerAttachment = useCallback(() => {
    if (composerAttachmentObjectUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(composerAttachmentObjectUrlRef.current);
    }
    composerAttachmentObjectUrlRef.current = null;
    setComposerAttachment(null);
  }, []);

  const insertTextAtCursor = useCallback((value: string) => {
    const textarea = composerTextareaRef.current;
    if (!textarea) {
      setComposerText((prev) => `${prev}${value}`);
      return;
    }
    const start = textarea.selectionStart ?? composerText.length;
    const end = textarea.selectionEnd ?? composerText.length;
    const next = `${composerText.slice(0, start)}${value}${composerText.slice(end)}`;
    setComposerText(next);
    requestAnimationFrame(() => {
      const nextPosition = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  }, [composerText]);

  const attachComposerFile = useCallback(async (file: File) => {
    if (!canInteract()) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showNotification('Please choose an image, GIF, or video file.');
      return;
    }
    if (composerAttachmentObjectUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(composerAttachmentObjectUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    composerAttachmentObjectUrlRef.current = previewUrl;
    setComposerAttachment({
      mediaType: file.type.startsWith('video/') ? 'video' : 'image',
      previewUrl,
      kind: 'file',
      file,
      fileName: file.name
    });
    showNotification(file.type.startsWith('video/') ? 'Video attached.' : file.type === 'image/gif' ? 'GIF attached.' : 'Image attached.');
  }, [canInteract, showNotification]);

  const attachComposerRemoteMedia = useCallback((previewUrl: string, mediaType: 'image' | 'video', fileName = 'media.gif') => {
    if (!canInteract()) return;
    if (composerAttachmentObjectUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(composerAttachmentObjectUrlRef.current);
    }
    composerAttachmentObjectUrlRef.current = null;
    setComposerAttachment({
      mediaType,
      previewUrl,
      kind: 'remote',
      fileName
    });
    showNotification(mediaType === 'video' ? 'Video preview attached.' : 'GIF attached.');
  }, [canInteract, showNotification]);

  const attachComposerDataUrl = useCallback((previewUrl: string, fileName = 'spotlight-ai.png') => {
    if (!canInteract()) return;
    if (composerAttachmentObjectUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(composerAttachmentObjectUrlRef.current);
    }
    composerAttachmentObjectUrlRef.current = null;
    setComposerAttachment({
      mediaType: 'image',
      previewUrl,
      kind: 'data',
      fileName
    });
    showNotification('Image ready to post.');
  }, [canInteract, showNotification]);

  const handleComposerFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    await attachComposerFile(file);
  }, [attachComposerFile]);

  const openComposer = useCallback(() => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    composerTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    composerTextareaRef.current?.focus();
  }, [openAuthModal, user]);

  const saveComposerDraft = useCallback((note: string) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      const draftKey = `urbanprime:spotlight:composer:${user.id}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          text: composerText,
          visibility: composerVisibility,
          allowComments: composerAllowComments,
          scheduledFor: composerScheduledFor,
          gifUrl: composerGifUrl,
          aiPrompt: composerAiPrompt,
          updatedAt: new Date().toISOString()
        })
      );
      showNotification(note);
    } catch {
      showNotification('Unable to save this draft right now.');
    }
  }, [composerAiPrompt, composerAllowComments, composerGifUrl, composerScheduledFor, composerText, composerVisibility, openAuthModal, showNotification, user]);

  const publishComposer = useCallback(async () => {
    if (!canInteract()) return;
    const caption = composerText.trim();
    const hasAttachment = Boolean(composerAttachment?.previewUrl);
    if (!caption && !hasAttachment) {
      showNotification('Add a caption, media, or GIF first.');
      return;
    }

    setIsPublishingComposer(true);
    try {
      const scheduled = Boolean(composerScheduledFor && new Date(composerScheduledFor).getTime() > Date.now());
      const mediaType = composerAttachment?.mediaType || 'image';
      let mediaUrl = composerAttachment?.previewUrl || '';
      let thumbnailUrl: string | null = mediaType === 'image' ? composerAttachment?.previewUrl || null : null;

      if (!composerAttachment) {
        mediaUrl = buildTextPosterDataUrl(caption || 'Urban Prime Spotlight');
        thumbnailUrl = mediaUrl;
      }

      if (composerAttachment?.kind === 'file' && composerAttachment.file) {
        const uploaded = await spotlightService.uploadSpotlightAsset(composerAttachment.file, user!.id, 'spotlight');
        mediaUrl = uploaded.public_url;
        if (mediaType === 'video') {
          const thumbFile = await captureVideoThumbnail(composerAttachment.file);
          if (thumbFile) {
            const thumbAsset = await spotlightService.uploadSpotlightAsset(thumbFile, user!.id, 'spotlight-thumb');
            thumbnailUrl = thumbAsset.public_url;
          }
        }
        if (mediaType === 'image') {
          thumbnailUrl = uploaded.public_url;
        }
      } else if (composerAttachment?.kind === 'data') {
        const fileName = composerAttachment.fileName || 'spotlight-ai.png';
        const file = await dataUrlToFile(composerAttachment.previewUrl, fileName);
        const uploaded = await spotlightService.uploadSpotlightAsset(file, user!.id, 'spotlight');
        mediaUrl = uploaded.public_url;
        thumbnailUrl = uploaded.public_url;
      }

      if (scheduled) {
        saveComposerDraft(`Scheduled draft saved for ${new Date(composerScheduledFor).toLocaleString()}.`);
        return;
      }

      const created = await spotlightService.createContent({
        media_type: mediaType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        caption,
        visibility: composerVisibility,
        allow_comments: composerAllowComments,
        hashtags: caption ? caption.match(/#([a-z0-9_]+)/gi)?.map((tag) => tag.replace('#', '')) || [] : [],
        interest_tags: caption ? caption.match(/#([a-z0-9_]+)/gi)?.map((tag) => tag.replace('#', '')) || [] : [],
        status: 'published'
      });

      pushItemToFront(created);
      clearComposerAttachment();
      setComposerText('');
      setComposerScheduledFor('');
      setComposerTool(null);
      setComposerGifUrl('');
      setComposerGifSearch('');
      setComposerAiPrompt('');
      setSearch('');
      setTab('for_you');
      localStorage.removeItem(`urbanprime:spotlight:composer:${user.id}`);
      showNotification('Spotlight posted successfully.');
      if (created?.id) {
        await openItem(created);
        navigate(`/spotlight/post/${created.id}`);
      }
    } catch (error: any) {
      showNotification(error?.message || 'Failed to create Spotlight post.');
    } finally {
      setIsPublishingComposer(false);
    }
  }, [canInteract, clearComposerAttachment, composerAllowComments, composerAttachment, composerAiPrompt, composerGifSearch, composerScheduledFor, composerText, composerTool, composerVisibility, navigate, openItem, pushItemToFront, saveComposerDraft, showNotification, user]);

  const handleGenerateImage = useCallback(async () => {
    if (!canInteract()) return;
    const prompt = `${composerAiPrompt || composerText || 'Urban Prime Spotlight'} in a premium editorial look, cinematic lighting, polished social media composition, high detail`;
    setIsGeneratingImage(true);
    try {
      const image = await generateImageFromPrompt(`${prompt}. Style: ${composerAiStyle}.`);
      attachComposerDataUrl(image, `spotlight-ai-${Date.now()}.png`);
      setComposerTool(null);
    } catch (error: any) {
      showNotification(error?.message || 'Content generation failed.');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [attachComposerDataUrl, canInteract, composerAiPrompt, composerAiStyle, composerText, showNotification]);

  const openGifPicker = useCallback(() => {
    if (!canInteract()) return;
    setComposerTool((current) => current === 'gif' ? null : 'gif');
  }, [canInteract]);

  const openEmojiPicker = useCallback(() => {
    if (!canInteract()) return;
    setComposerTool((current) => current === 'emoji' ? null : 'emoji');
    requestAnimationFrame(() => composerTextareaRef.current?.focus());
  }, [canInteract]);

  const openSchedulePicker = useCallback(() => {
    if (!canInteract()) return;
    setComposerTool((current) => current === 'schedule' ? null : 'schedule');
  }, [canInteract]);

  const clearSpotlightFilters = useCallback(() => {
    setSearch('');
    setTab('for_you');
    showNotification('Spotlight filters cleared.');
  }, [showNotification]);

  const composerCanEditImage = Boolean(composerAttachment?.mediaType === 'image' && composerAttachment?.previewUrl);

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f5f7fb] text-slate-950 dark:bg-[#08111f] dark:text-white">
      <motion.div
        className="fixed left-0 top-0 z-[60] h-[2px] w-full origin-left bg-[linear-gradient(90deg,rgba(15,23,42,0.95),rgba(29,78,216,0.95),rgba(56,189,248,0.95))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.85),rgba(56,189,248,0.95),rgba(99,102,241,0.95))]"
        style={{ scaleX: scrollYProgress, opacity: heroGlow }}
      />

      <div className="mx-auto grid h-full min-h-0 max-w-[1440px] lg:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="sticky top-0 hidden h-full min-h-0 overflow-y-auto flex-col border-r border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#0b1220] lg:flex">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] text-sm font-black text-white shadow-lg">UP</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Urban Prime</p>
              <p className="text-sm font-bold text-slate-950 dark:text-white">Prime Spotlight</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = item.to === '/spotlight' || (item.to === '/profile/me' && Boolean(user)) || (item.to === '/messages' && messageDrawerOpen);
              return (
                item.to === '/messages' ? (
                  <button
                    key={item.to}
                    type="button"
                    onClick={openMessagesPanel}
                    className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-[17px] font-medium transition duration-200 hover:bg-slate-100 dark:hover:bg-white/6 ${
                      active
                        ? 'font-semibold text-slate-950 dark:text-white'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0">{item.icon()}</svg>
                    <span>{item.label}</span>
                  </button>
                ) : item.to === '/profile/me' ? (
                  <button
                    key={item.to}
                    type="button"
                    onClick={openViewerProfileCard}
                    className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-[17px] font-medium transition duration-200 hover:bg-slate-100 dark:hover:bg-white/6 ${
                      active
                        ? 'font-semibold text-slate-950 dark:text-white'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0">{item.icon()}</svg>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-4 rounded-full px-4 py-3 text-[17px] font-medium transition duration-200 hover:bg-slate-100 dark:hover:bg-white/6 ${
                      active
                        ? 'font-semibold text-slate-950 dark:text-white'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0">{item.icon()}</svg>
                    <span>{item.label}</span>
                  </Link>
                )
              );
            })}
          </nav>

          <div className="mt-5 px-2">
            <button
              onClick={() => openComposer()}
              className="flex w-full items-center justify-center rounded-full bg-[#0f1419] px-6 py-4 text-[17px] font-bold text-white shadow-[0_10px_30px_rgba(15,20,25,0.2)] transition hover:brightness-110 dark:bg-white dark:text-slate-950"
            >
              Post
            </button>
          </div>

          <div className="mt-auto px-2 pb-2">
            <button onClick={openViewerProfileCard} className="flex w-full items-center gap-3 rounded-[1.5rem] px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/6">
              <img src={safeAvatar(userAvatar)} alt={user?.name || 'Profile'} className="h-11 w-11 rounded-full object-cover bg-slate-200" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{user?.name || 'Ahmed'}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{(user?.name || 'ahmadoffcl').toLowerCase().replace(/\s+/g, '')}</p>
              </div>
              <span className="text-xl leading-none text-slate-500 dark:text-slate-400">...</span>
            </button>
          </div>
        </aside>

        <main ref={mainScrollRef} className="h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain border-x border-slate-200 bg-white scroll-smooth dark:border-white/10 dark:bg-[#0a1018]">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a1018]/95">
            <div className="grid grid-cols-2">
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className="relative py-3 text-center text-[14px] font-semibold text-slate-500 transition hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 sm:py-4 sm:text-[15px]"
                  >
                    <span className={active ? 'text-slate-950 dark:text-white' : ''}>{item.label}</span>
                    <span className={`absolute inset-x-1/2 bottom-0 h-1 w-12 -translate-x-1/2 rounded-full bg-sky-500 transition ${active ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-slate-200 px-3 py-3 sm:px-4 sm:py-4 dark:border-white/10">
            <div className="flex gap-3">
              <img src={safeAvatar(userAvatar)} alt={user?.name || 'You'} className="mt-1 h-10 w-10 rounded-full object-cover bg-slate-200 sm:h-11 sm:w-11" />
              <div className="min-w-0 flex-1">
                <textarea
                  ref={composerTextareaRef}
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value.slice(0, 2200))}
                  placeholder="What&apos;s happening?"
                  rows={3}
                  className="w-full cursor-text resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-[16px] leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-500/50 sm:text-[18px]"
                />

                {composerAttachment ? (
                  <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">Attached {composerAttachment.mediaType}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{composerAttachment.kind === 'remote' ? 'GIF preview ready' : composerAttachment.kind === 'data' ? 'AI generated or edited media' : 'Local upload ready'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {composerAttachment.mediaType === 'image' ? (
                          <button
                            onClick={() => setComposerTool('gif')}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                          >
                            Swap GIF/Image
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            clearComposerAttachment();
                            showNotification('Attachment removed.');
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="relative bg-black">
                      {composerAttachment.mediaType === 'video' ? (
                        <video src={composerAttachment.previewUrl} controls className="max-h-[320px] w-full object-cover sm:max-h-[420px]" />
                      ) : (
                        <img src={composerAttachment.previewUrl} alt="Composer attachment preview" className="max-h-[320px] w-full object-cover sm:max-h-[420px]" />
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2 text-sky-500 sm:flex sm:flex-wrap sm:items-center">
                  <button type="button" onClick={() => composerFileInputRef.current?.click()} className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-sky-200" aria-label="Upload media">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 5h16v14H4z" /><path d="m8 13 2-2 3 3 3-4 4 5" /></svg>
                    Media
                  </button>
                  <button type="button" onClick={openGifPicker} className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-sky-200" aria-label="Insert GIF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 8h16v8H4z" /><path d="M7 11h2m1-1v2" /></svg>
                    GIF
                  </button>
                  <button type="button" onClick={openEmojiPicker} className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-sky-200" aria-label="Add emoji">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9.5 15c1.2 1 3.8 1 5 0" /></svg>
                    Emoji
                  </button>
                    <button type="button" onClick={openSchedulePicker} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${composerScheduledFor ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`} aria-label="Schedule post">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
                    Schedule
                  </button>
                  <button type="button" onClick={() => saveComposerDraft('Draft saved.')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" aria-label="Save draft">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1z" /></svg>
                    Draft
                  </button>
                  <button type="button" onClick={() => { setComposerText(''); clearComposerAttachment(); setComposerScheduledFor(''); setComposerGifUrl(''); setComposerAiPrompt(''); showNotification('Composer cleared.'); }} className="flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-200 dark:border-white/10 dark:bg-white/5 dark:text-rose-200" aria-label="Clear composer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    Clear
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openEmojiPicker}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${composerTool === 'emoji' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'}`}
                  >
                    {composerTool === 'emoji' ? 'Hide emojis' : 'Open emoji library'}
                  </button>
                  <button
                    type="button"
                    onClick={openGifPicker}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${composerTool === 'gif' ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'}`}
                  >
                    {composerTool === 'gif' ? 'Hide GIFs' : 'Open GIF library'}
                  </button>
                  <button
                    type="button"
                    onClick={openSchedulePicker}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${composerTool === 'schedule' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'}`}
                  >
                    {composerTool === 'schedule' ? 'Hide schedule' : 'Open schedule'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{composerText.length}/2200</span>
                    {composerScheduledFor ? <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">Scheduled</span> : null}
                    {composerAttachment ? <span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">{composerAttachment.mediaType.toUpperCase()}</span> : null}
                  </div>
                  <button
                    onClick={publishComposer}
                    disabled={isPublishingComposer}
                    className="h-11 rounded-full bg-[#0f1419] px-5 text-sm font-bold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950"
                  >
                    {isPublishingComposer ? 'Working...' : composerScheduledFor ? 'Schedule' : 'Post'}
                  </button>
                </div>

                <input
                  ref={composerFileInputRef}
                  type="file"
                  accept="image/*,video/*,.gif"
                  className="hidden"
                  onChange={(event) => void handleComposerFileChange(event)}
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {loading ? Array.from({ length: 3 }).map((_, index) => <FeedSkeleton key={index} />) : null}
            {!loading && filteredItems.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No Spotlight posts match your current filters.</div>
            ) : null}
            {filteredItems.map((item, index) => (
              <FeedCard
                key={item.id}
                item={item}
                index={index}
                liked={likedIds.has(item.id)}
                disliked={dislikedIds.has(item.id)}
                reposted={repostedIds.has(item.id)}
                saved={savedIds.has(item.id)}
                onLike={handleLike}
                onDislike={handleDislike}
                onRepost={handleRepost}
                onSave={handleSave}
                onShare={handleShare}
                onOpenComment={handleOpenComments}
                onFollow={handleFollow}
                onOpenProfile={openProfileCard}
                onOpenContext={openContextMode}
                onOpenImage={handleOpenImage}
                onOpenVideo={handleOpenVideo}
                onOpenProduct={handleOpenProduct}
                onProductImpression={handleProductImpression}
                onDoubleLike={handleDoubleLike}
                viewerUserId={user?.id}
              />
            ))}
            {hasMore ? <div ref={sentinelRef} className="h-10" /> : null}
            {loadingMore ? <FeedSkeleton /> : null}
          </div>
        </main>

        <aside className="sticky top-0 hidden h-full min-h-0 overflow-y-auto flex-col gap-4 border-l border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0b1220] lg:flex">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400"><SearchIcon /></svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Spotlight"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[22px] font-black tracking-tight text-slate-950 dark:text-white">Today&apos;s Trending</h2>
              <button onClick={clearSpotlightFilters} className="text-2xl leading-none text-slate-400 transition hover:text-slate-900 dark:hover:text-white" aria-label="Clear filters">×</button>
            </div>
            <div className="space-y-4">
              {trendItems.length > 0 ? trendItems.slice(0, 4).map((trend, index) => (
                <button key={trend.label} onClick={() => setSearch(`#${trend.label}`)} className="block w-full text-left transition hover:translate-x-0.5">
                  <p className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">#{trend.label}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{trend.category} · {compact(trend.count)} posts</p>
                  {index < 3 ? <div className="mt-4 h-px bg-slate-200 dark:bg-white/10" /> : null}
                </button>
              )) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Trending conversations will appear here as the feed grows.</p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Suggested accounts to follow</p>
              <div className="mt-3 space-y-3">
                {(suggestedCreators.length > 0 ? suggestedCreators : visibleCreators).slice(0, 2).map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3">
                    <button type="button" onClick={() => openProfileCard(creator)} className="shrink-0">
                      <img src={safeAvatar(creator.avatar_url)} alt={creator.name} className="h-10 w-10 rounded-full object-cover transition duration-200 hover:scale-[1.04]" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => openProfileCard(creator)} className="truncate text-sm font-semibold text-slate-950 transition hover:underline dark:text-white">{creator.name}</button>
                        {creator.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{compact(creator.followers_count)} followers</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleFollow(creator)} className="rounded-full bg-[#0f1419] px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950">{creator.is_following ? 'Following' : 'Follow'}</button>
                      <button onClick={() => openMessageDrawerFor(creator)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Message</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-20 right-5 z-40 hidden lg:flex flex-col gap-3">
        <button onClick={() => openComposer()} className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.18)] transition hover:scale-105 dark:border-white/10 dark:bg-[#0b1220] dark:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-7 w-7"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button onClick={openMessagesPanel} className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.18)] transition hover:scale-105 dark:border-white/10 dark:bg-[#0b1220] dark:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-7 w-7"><path d="M4 5h16v11H8l-4 3z" /></svg>
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#09111d]/95 lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
          <Link to="/" className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">Back to home page</Link>
          <Link to="/spotlight" className="rounded-2xl bg-slate-950 px-2 py-2 text-center text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">Spotlight</Link>
          <Link to="/notifications" className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">Alerts</Link>
          <button onClick={openViewerProfileCard} className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">Profile</button>
          <button onClick={openMessagesPanel} className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">Messages</button>
        </div>
      </div>

      {composerTool === 'edit' && composerAttachment?.mediaType === 'image' ? (
        <BackgroundRemovalModal
          imageUrl={composerAttachment.previewUrl}
          onClose={() => setComposerTool(null)}
          onImageUpdate={(newImageUrl) => {
            clearComposerAttachment();
            attachComposerDataUrl(newImageUrl, `spotlight-edited-${Date.now()}.png`);
            setComposerTool(null);
          }}
        />
      ) : null}

      {composerTool === 'gif' ? (
        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-500">GIF picker</p>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Attach a GIF directly to your post</p>
            </div>
            <button type="button" onClick={() => setComposerTool(null)} className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Close GIF picker">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={composerGifUrl}
                onChange={(event) => setComposerGifUrl(event.target.value)}
                placeholder="Paste a GIF URL from Giphy, Tenor, or your own CDN"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!composerGifUrl.trim()) return;
                  attachComposerRemoteMedia(composerGifUrl.trim(), 'image', 'spotlight-gif.gif');
                  setComposerTool(null);
                }}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                Attach GIF
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {GIF_SEARCH_HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setComposerGifSearch(hint)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${composerGifSearch === hint ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {GIF_LIBRARY.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setComposerGifUrl(item.url);
                    attachComposerRemoteMedia(item.url, 'image', `${item.title.toLowerCase()}-spotlight.gif`);
                    setComposerTool(null);
                  }}
                  className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50 text-left transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                >
                  <img src={item.url} alt={item.title} className="h-36 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="px-3 py-2">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">One tap attach</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {composerTool === 'emoji' ? (
        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-500">Emoji picker</p>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Tap to insert emojis into your caption</p>
            </div>
            <button type="button" onClick={() => setComposerTool(null)} className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Close emoji picker">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
            <div className="grid grid-cols-5 gap-3 p-4 sm:grid-cols-8 lg:grid-cols-10">
            {EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  insertTextAtCursor(emoji);
                  setComposerTool(null);
                }}
                className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {composerTool === 'schedule' ? (
        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-500">Schedule</p>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Save this post for later</p>
            </div>
            <button type="button" onClick={() => setComposerTool(null)} className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Close schedule picker">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Scheduled time</label>
              <input
                type="datetime-local"
                value={composerScheduledFor}
                onChange={(event) => setComposerScheduledFor(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-emerald-300 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">This saves a scheduled draft in Spotlight so your post stays ready for later publishing.</p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setComposerScheduledFor(''); showNotification('Schedule cleared.'); }} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white">
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposerTool(null);
                  showNotification(composerScheduledFor ? `Scheduled for ${new Date(composerScheduledFor).toLocaleString()}.` : 'Schedule closed.');
                }}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {followPrompt ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 left-4 z-40 max-w-[320px] rounded-[1.6rem] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#09111d]/92"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M21 15a4 4 0 0 1-4 4H9l-6 3 2-5a4 4 0 0 1-2-3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">New follow</p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">Say hi, {followPrompt.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">A quick message can turn a follow into a real connection.</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => openMessageDrawerFor(followPrompt)}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950"
                  >
                    Say hi
                  </button>
                  <button
                    onClick={() => setFollowPrompt(null)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DetailModal
        item={activeItem}
        comments={comments}
        commentSort={commentSort}
        commentText={commentText}
        replyTo={replyTo}
        liked={activeItem ? likedIds.has(activeItem.id) : false}
        disliked={activeItem ? dislikedIds.has(activeItem.id) : false}
        reposted={activeItem ? repostedIds.has(activeItem.id) : false}
        saved={activeItem ? savedIds.has(activeItem.id) : false}
        onClose={() => { setActiveItem(null); if (activePostId) navigate('/spotlight'); }}
        onLike={() => { if (activeItem) void handleLike(activeItem); }}
        onDislike={() => { if (activeItem) void handleDislike(activeItem); }}
        onRepost={() => { if (activeItem) void handleRepost(activeItem); }}
        onSave={() => { if (activeItem) void handleSave(activeItem); }}
        onShare={() => { if (activeItem) void handleShare(activeItem); }}
        onCommentSort={(sort) => { if (!activeItem) return; setCommentSort(sort); void refreshComments(activeItem.id, sort); }}
        onCommentText={setCommentText}
        onSubmitComment={() => void handleSubmitComment()}
        onLikeComment={(id) => void handleLikeComment(id)}
        onReplyTo={setReplyTo}
        onDeleteComment={(id) => void handleDeleteComment(id)}
        onOpenProfile={() => { if (!activeItem?.creator) return; openProfileCard(activeItem.creator); }}
      />

      <SpotlightMessageDrawer
        open={messageDrawerOpen}
        target={messageTarget}
        onClose={() => {
          setMessageDrawerOpen(false);
          setMessageTarget(null);
        }}
      />

      <ContextModeModal
        item={contextItem}
        related={contextRelated}
        sameCreator={contextSameCreator}
        similar={contextSimilar}
        products={contextProducts}
        similarProducts={contextSimilarProducts}
        loading={contextLoading}
        onClose={closeContextMode}
        onOpenItem={(item) => {
          closeContextMode();
          void openItem(item);
        }}
        onOpenProduct={handleOpenProduct}
      />

      <SpotlightProfileCardModal
        open={profileCardOpen}
        username={profileCardUsername}
        onClose={() => {
          setProfileCardOpen(false);
          setProfileCardUsername(null);
        }}
        onOpenItem={(item) => {
          void openItem(item);
        }}
        onOpenMessage={(creator) => {
          setProfileCardOpen(false);
          setProfileCardUsername(null);
          openMessageDrawerFor(creator);
        }}
        onBlocked={() => {
          setProfileCardOpen(false);
          setProfileCardUsername(null);
          void loadFeed(true);
        }}
      />
    </div>
  );
};

export default PrimeSpotlightPage;


