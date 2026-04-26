import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BlueTickBadge from './BlueTickBadge';
import SpotlightTextCard from './SpotlightTextCard';
import type {
  SpotlightCreator,
  SpotlightItem,
  SpotlightProfile,
  SpotlightProfileResponse
} from '../../services/spotlightService';

export type SpotlightProfileTab = 'posts' | 'media' | 'likes' | 'saved';
export type SpotlightProfileSurface = 'light' | 'dark';
export type UsernameStateKind = 'idle' | 'checking' | 'available' | 'taken' | 'current' | 'invalid';

export type SpotlightProfileFormState = {
  name: string;
  username: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  website_url: string;
  city: string;
  country: string;
  pinned_content_id: string;
};

export const PROFILE_TABS: SpotlightProfileTab[] = ['posts', 'media', 'likes', 'saved'];
export const TAB_LABELS: Record<SpotlightProfileTab, string> = {
  posts: 'Posts',
  media: 'Media',
  likes: 'Likes',
  saved: 'Saved'
};

const GlobeIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c3 3.3 4.5 6.3 4.5 9S15 17.7 12 21c-3-3.3-4.5-6.3-4.5-9S9 6.3 12 3Z" />
  </svg>
);

const MapPinIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

const CalendarIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path d="M7 3v3M17 3v3M4 9h16" />
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
  </svg>
);

const PinIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path d="m14.4 4.4 5.2 5.2-2.8 2.8 1.5 4.3-1.2 1.2-4.3-1.5-6.2 6.2-1.6-1.6 6.2-6.2-1.5-4.3 1.2-1.2 4.3 1.5 2.8-2.8Z" />
  </svg>
);

const MoreIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const EmptyStateIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 17 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
    <path d="M8 10.5h8M8 14h5" />
  </svg>
);

const joinedDateFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

export const compactSpotlightNumber = (value: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

export const safeSpotlightAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');
export const safeSpotlightBanner = (url?: string | null) => (url && url.trim() ? url : '');

export function SpotlightAvatarImage({
  src,
  alt,
  className,
  fallbackSrc = '/icons/urbanprime.svg',
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const fallbackValue = React.useMemo(() => safeSpotlightAvatar(fallbackSrc), [fallbackSrc]);
  const [imageSrc, setImageSrc] = React.useState(() => safeSpotlightAvatar(String(src || fallbackValue)));

  React.useEffect(() => {
    setImageSrc(safeSpotlightAvatar(String(src || fallbackValue)));
  }, [fallbackValue, src]);

  return (
    <img
      {...imgProps}
      src={imageSrc}
      alt={alt}
      className={className}
      onError={(event) => {
        imgProps.onError?.(event);
        setImageSrc((current) => current === fallbackValue ? current : fallbackValue);
      }}
    />
  );
}

export const normalizeSpotlightUsernameInput = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 32);

export const normalizeSpotlightWebsiteHref = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

export const formatSpotlightTimeAgo = (value?: string | null) => {
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

export const buildSpotlightProfileForm = (
  profile: SpotlightProfile | null,
  pinnedContentId?: string | null
): SpotlightProfileFormState => ({
  name: profile?.name || '',
  username: normalizeSpotlightUsernameInput(profile?.username || ''),
  bio: profile?.bio || profile?.about || '',
  avatar_url: profile?.avatar_url || '',
  banner_url: profile?.banner_url || '',
  website_url: profile?.website_url || '',
  city: profile?.city || '',
  country: profile?.country || '',
  pinned_content_id: pinnedContentId || ''
});

const isTextPost = (item: SpotlightItem) => String(item.media_url || '').startsWith('data:image/svg+xml');

const getItemLabel = (item: SpotlightItem) => {
  const base = (item.caption || '').trim();
  if (base) return base.length > 70 ? `${base.slice(0, 67)}...` : base;
  return item.media_type === 'video' ? 'Untitled video Spotlight' : 'Untitled Spotlight post';
};

const formatJoinedLabel = (joinedAt?: string | null) => {
  if (!joinedAt) return '';
  const parsed = new Date(joinedAt);
  if (Number.isNaN(parsed.getTime())) return '';
  return `Joined ${joinedDateFormatter.format(parsed)}`;
};

const buildLocationLabel = (profile: SpotlightProfile) =>
  [profile.city, profile.country].map((entry) => String(entry || '').trim()).filter(Boolean).join(', ');

const buildPreviewStrip = (
  followersPreview: SpotlightCreator[] = [],
  followingPreview: SpotlightCreator[] = []
) => {
  if (followersPreview.length > 0) {
    return {
      label: `${followersPreview.length} follower${followersPreview.length === 1 ? '' : 's'} in preview`,
      people: followersPreview.slice(0, 3)
    };
  }
  if (followingPreview.length > 0) {
    return {
      label: `${followingPreview.length} following in preview`,
      people: followingPreview.slice(0, 3)
    };
  }
  return null;
};

const surfaceTone = (surface: SpotlightProfileSurface) => surface === 'dark'
  ? {
    card: 'border-white/10 bg-[#120d0a]/96 text-white shadow-[0_22px_70px_rgba(0,0,0,0.34)]',
    softCard: 'border-white/10 bg-[#19110d]/92 text-white',
    pill: 'border-white/10 bg-white/[0.06] text-slate-100',
    pillActive: 'bg-[linear-gradient(90deg,#111111_0%,#7c2d12_48%,#ea580c_100%)] text-white shadow-[0_16px_35px_rgba(124,45,18,0.28)]',
    textStrong: 'text-white',
    textBody: 'text-slate-100',
    textMuted: 'text-slate-300',
    metaCard: 'border-white/10 bg-white/[0.06] text-slate-100',
    actionSecondary: 'border-white/10 bg-white/[0.06] text-white hover:bg-white/12',
    actionPrimary: 'bg-[linear-gradient(90deg,#111111_0%,#7c2d12_48%,#ea580c_100%)] text-white shadow-[0_18px_45px_rgba(124,45,18,0.32)] hover:brightness-110',
    outline: 'border-white/10 bg-[#140d09] hover:bg-[#1a120e]',
    dropdown: 'border-white/10 bg-[#110b08]/98 text-slate-100',
    overlay: 'from-black/15 via-black/5 to-black/70'
  }
  : {
    card: 'border-white/70 bg-white/65 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white',
    softCard: 'border-white/70 bg-white/75 text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white',
    pill: 'border-white/70 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
    pillActive: 'bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950',
    textStrong: 'text-slate-950 dark:text-white',
    textBody: 'text-slate-700 dark:text-slate-200',
    textMuted: 'text-slate-500 dark:text-slate-400',
    metaCard: 'border-white/70 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
    actionSecondary: 'border-white/70 bg-white/80 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
    actionPrimary: 'bg-[linear-gradient(90deg,#111111_0%,#7c2d12_48%,#ea580c_100%)] text-white shadow-[0_18px_42px_rgba(124,45,18,0.22)] hover:brightness-110 dark:bg-white dark:text-slate-950',
    outline: 'border-white/70 bg-white/80 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
    dropdown: 'border-white/70 bg-white/95 text-slate-700 dark:border-white/10 dark:bg-[#09111d]/95 dark:text-slate-200',
    overlay: 'from-black/5 via-transparent to-black/20 dark:from-slate-950/25 dark:via-transparent dark:to-slate-950/70'
  };

function ItemMenu({
  surface,
  item,
  busy = false,
  onToggleVisibility,
  onDelete
}: {
  surface: SpotlightProfileSurface;
  item: SpotlightItem;
  busy?: boolean;
  onToggleVisibility?: (item: SpotlightItem) => void;
  onDelete?: (item: SpotlightItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const tone = surfaceTone(surface);

  if (!onToggleVisibility && !onDelete) return null;

  return (
    <div className="relative z-10">
      <button
        type="button"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={`rounded-full border p-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${surface === 'dark' ? 'border-white/20 bg-black/35 text-white hover:bg-black/50' : 'border-white/70 bg-white/85 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'}`}
        aria-label="Open post actions"
      >
        <MoreIcon />
      </button>
      {open ? (
        <div
          className={`absolute right-0 top-11 w-44 overflow-hidden rounded-[1.1rem] border p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl ${tone.dropdown}`}
          onClick={(event) => event.stopPropagation()}
        >
          {onToggleVisibility ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onToggleVisibility(item);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              {item.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete(item);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SpotlightProfileHeaderCard({
  surface,
  profile,
  counts,
  isSelf,
  isFollowing,
  followsYou = false,
  followersPreview = [],
  followingPreview = [],
  moreOpen = false,
  onOpenFollowers,
  onOpenFollowing,
  onEdit,
  onCreate,
  onShare,
  onToggleFollow,
  onMessage,
  onToggleMore,
  onRestrict,
  onBlock
}: {
  surface: SpotlightProfileSurface;
  profile: SpotlightProfile;
  counts: SpotlightProfileResponse['counts'];
  isSelf: boolean;
  isFollowing: boolean;
  followsYou?: boolean;
  followersPreview?: SpotlightCreator[];
  followingPreview?: SpotlightCreator[];
  moreOpen?: boolean;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onEdit?: () => void;
  onCreate?: () => void;
  onShare: () => void;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  onToggleMore?: () => void;
  onRestrict?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}) {
  const tone = surfaceTone(surface);
  const websiteHref = normalizeSpotlightWebsiteHref(profile.website_url);
  const locationLabel = buildLocationLabel(profile);
  const joinedLabel = formatJoinedLabel(profile.joined_at);
  const previewStrip = buildPreviewStrip(followersPreview, followingPreview);
  const metaEntries = [
    websiteHref ? { key: 'website', label: 'Website', icon: <GlobeIcon />, content: websiteHref } : null,
    locationLabel ? { key: 'location', label: 'Location', icon: <MapPinIcon />, content: locationLabel } : null,
    joinedLabel ? { key: 'joined', label: 'Joined', icon: <CalendarIcon />, content: joinedLabel } : null
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ReactNode; content: string }>;

  return (
    <section className={`overflow-hidden rounded-[2.15rem] border ${tone.card}`}>
      <div className={`border-b px-4 py-4 sm:px-6 ${surface === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/70 bg-white/75 dark:border-white/10 dark:bg-white/[0.03]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${tone.textMuted}`}>Spotlight profile</p>
            <p className={`mt-1 text-sm ${tone.textBody}`}>Compact identity header, pinned Spotlight, and timeline tabs.</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] ${tone.metaCard}`}>
            <span>@{profile.username}</span>
            {profile.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="relative shrink-0">
              <div className={`absolute -inset-4 rounded-[2.5rem] blur-3xl ${surface === 'dark' ? 'bg-amber-400/18' : 'bg-orange-400/12 dark:bg-amber-400/14'}`} />
              <SpotlightAvatarImage
                src={safeSpotlightAvatar(profile.avatar_url)}
                alt={profile.name}
                className={`relative h-24 w-24 rounded-[1.8rem] border-[4px] object-cover shadow-[0_22px_60px_rgba(15,23,42,0.28)] sm:h-28 sm:w-28 ${surface === 'dark' ? 'border-slate-950' : 'border-white dark:border-slate-950'}`}
              />
            </div>

            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`truncate text-2xl font-black tracking-tight sm:text-3xl ${tone.textStrong}`}>{profile.name}</h1>
                {profile.is_verified ? <BlueTickBadge className="h-5 w-5 sm:h-6 sm:w-6" /> : null}
                {followsYou && !isSelf ? (
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${tone.metaCard}`}>
                    Follows you
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-sm ${tone.textMuted}`}>@{profile.username}</p>
              <p className={`mt-4 max-w-3xl text-sm leading-relaxed sm:text-[0.95rem] ${tone.textBody}`}>
                {profile.bio || 'No Spotlight bio yet. Add a sharp line so people understand your vibe in one glance.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <button onClick={onOpenFollowing} className={`font-semibold transition hover:opacity-80 ${tone.textStrong}`}>
                  {compactSpotlightNumber(profile.following_count)} <span className={tone.textMuted}>Following</span>
                </button>
                <button onClick={onOpenFollowers} className={`font-semibold transition hover:opacity-80 ${tone.textStrong}`}>
                  {compactSpotlightNumber(profile.followers_count)} <span className={tone.textMuted}>Followers</span>
                </button>
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.pill}`}>
                  {compactSpotlightNumber(counts.posts || profile.posts_count)} Posts
                </span>
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.pill}`}>
                  {compactSpotlightNumber(counts.media || profile.reels_count)} Media
                </span>
              </div>

              {metaEntries.length > 0 || previewStrip ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {metaEntries.map((entry) => (
                    entry.key === 'website' ? (
                      <a
                        key={entry.key}
                        href={entry.content}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition hover:-translate-y-0.5 ${tone.metaCard}`}
                      >
                        {entry.icon}
                        <span className="truncate">{entry.content.replace(/^https?:\/\//i, '')}</span>
                      </a>
                    ) : (
                      <div key={entry.key} className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-sm ${tone.metaCard}`}>
                        {entry.icon}
                        <span className="truncate">{entry.content}</span>
                      </div>
                    )
                  ))}

                  {previewStrip ? (
                    <div className={`inline-flex min-w-0 items-center gap-3 rounded-full border px-3 py-2 ${tone.metaCard}`}>
                      <div className="flex -space-x-2">
                        {previewStrip.people.map((person) => (
                          <SpotlightAvatarImage
                            key={person.id}
                            src={safeSpotlightAvatar(person.avatar_url)}
                            alt={person.name}
                            className={`h-7 w-7 rounded-full object-cover ring-2 ${surface === 'dark' ? 'ring-slate-950' : 'ring-white dark:ring-slate-950'}`}
                          />
                        ))}
                      </div>
                      <span className="truncate text-sm">{previewStrip.label}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            {isSelf ? (
              <>
                {onEdit ? (
                  <button onClick={onEdit} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${tone.actionSecondary}`}>
                    Edit profile
                  </button>
                ) : null}
                <button onClick={onShare} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${tone.actionSecondary}`}>
                  Share
                </button>
                {onCreate ? (
                  <button onClick={onCreate} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${tone.actionPrimary}`}>
                    Create Spotlight
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {onToggleFollow ? (
                  <button onClick={onToggleFollow} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${isFollowing ? tone.actionSecondary : tone.actionPrimary}`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : null}
                {onMessage ? (
                  <button onClick={onMessage} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${tone.actionSecondary}`}>
                    Message
                  </button>
                ) : null}
                {onToggleMore ? (
                  <div className="relative">
                    <button onClick={onToggleMore} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${tone.actionSecondary}`}>
                      More
                    </button>
                    {moreOpen ? (
                      <div className={`absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-[1.2rem] border p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl ${tone.dropdown}`}>
                        <button onClick={onShare} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5">
                          Copy profile link
                        </button>
                        {onRestrict ? (
                          <button onClick={onRestrict} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5">
                            Restrict user
                          </button>
                        ) : null}
                        {onReport ? (
                          <button onClick={onReport} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5">
                            Report user
                          </button>
                        ) : null}
                        {onBlock ? (
                          <button onClick={onBlock} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300">
                            Block user
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SpotlightPinnedSpotlightSection({
  surface,
  pinnedItem,
  isSelf,
  onOpenItem,
  onEditProfile
}: {
  surface: SpotlightProfileSurface;
  pinnedItem: SpotlightItem | null;
  isSelf: boolean;
  onOpenItem: (item: SpotlightItem) => void;
  onEditProfile?: () => void;
}) {
  const tone = surfaceTone(surface);

  if (!pinnedItem) {
    if (!isSelf || !onEditProfile) return null;
    return (
      <section className={`rounded-[1.8rem] border border-dashed p-4 sm:p-5 ${tone.softCard}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${tone.textMuted}`}>Pinned Spotlight</p>
            <p className={`mt-2 text-sm ${tone.textBody}`}>Pin one published Spotlight to anchor your profile like a featured post.</p>
          </div>
          <button onClick={onEditProfile} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${tone.actionSecondary}`}>
            Choose pinned post
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-[1.9rem] border p-4 sm:p-5 ${tone.softCard}`}>
      <div className="mb-4 flex items-center gap-2">
        <PinIcon className={`h-4 w-4 ${tone.textMuted}`} />
        <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${tone.textMuted}`}>Pinned Spotlight</p>
      </div>
      <button
        type="button"
        onClick={() => onOpenItem(pinnedItem)}
        className={`group grid w-full gap-4 overflow-hidden rounded-[1.6rem] border p-3 text-left transition hover:-translate-y-0.5 ${tone.outline} md:grid-cols-[220px_minmax(0,1fr)]`}
      >
        <div className="relative overflow-hidden rounded-[1.3rem] bg-slate-100 dark:bg-white/5">
          {isTextPost(pinnedItem) ? (
            <SpotlightTextCard
              caption={pinnedItem.caption}
              variant="tile"
              className="min-h-[220px] rounded-none"
            />
          ) : (
            <>
              <img
                src={pinnedItem.thumbnail_url || pinnedItem.media_url}
                alt={getItemLabel(pinnedItem)}
                className="h-full min-h-[220px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                {pinnedItem.media_type === 'video' ? 'Video' : 'Post'}
              </div>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone.pill}`}>
                Featured
              </span>
              <span className={`text-xs ${tone.textMuted}`}>{formatSpotlightTimeAgo(pinnedItem.published_at || pinnedItem.created_at)}</span>
            </div>
            <h3 className={`mt-3 line-clamp-2 text-lg font-black ${tone.textStrong}`}>{getItemLabel(pinnedItem)}</h3>
            <p className={`mt-3 line-clamp-3 text-sm leading-relaxed ${tone.textBody}`}>
              {pinnedItem.caption || 'Open this pinned Spotlight to see the full post.'}
            </p>
          </div>
          <div className={`flex flex-wrap items-center gap-3 text-xs font-semibold ${tone.textMuted}`}>
            <span>{compactSpotlightNumber(pinnedItem.metrics.likes)} likes</span>
            <span>{compactSpotlightNumber(pinnedItem.metrics.comments)} replies</span>
            <span>{compactSpotlightNumber(pinnedItem.metrics.shares)} shares</span>
            <span>{compactSpotlightNumber(pinnedItem.metrics.views)} views</span>
          </div>
        </div>
      </button>
    </section>
  );
}

export function SpotlightProfileTabBar({
  surface,
  activeTab,
  isSelf,
  onTabChange
}: {
  surface: SpotlightProfileSurface;
  activeTab: SpotlightProfileTab;
  isSelf: boolean;
  onTabChange: (tab: SpotlightProfileTab) => void;
}) {
  const tone = surfaceTone(surface);
  const visibleTabs = isSelf ? PROFILE_TABS : PROFILE_TABS.filter((tab) => tab === 'posts' || tab === 'media');

  return (
    <section className={`rounded-[1.7rem] border p-3 sm:p-4 ${tone.softCard}`}>
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab ? tone.pillActive : tone.pill}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </section>
  );
}

export function SpotlightProfileTimelineList({
  surface,
  items,
  pinnedItemId,
  showViewCounts = true,
  emptyMessage,
  onOpenItem,
  onToggleVisibility,
  onDelete,
  busyItemId
}: {
  surface: SpotlightProfileSurface;
  items: SpotlightItem[];
  pinnedItemId?: string | null;
  showViewCounts?: boolean;
  emptyMessage: string;
  onOpenItem: (item: SpotlightItem) => void;
  onToggleVisibility?: (item: SpotlightItem) => void;
  onDelete?: (item: SpotlightItem) => void;
  busyItemId?: string | null;
}) {
  const tone = surfaceTone(surface);

  if (items.length === 0) {
    return (
      <div className={`rounded-[1.7rem] border border-dashed p-8 text-center ${tone.softCard}`}>
        <EmptyStateIcon className={`mx-auto h-6 w-6 ${tone.textMuted}`} />
        <p className={`mt-3 text-sm ${tone.textBody}`}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isText = isTextPost(item);
        const creator = item.creator;
        const busy = busyItemId === item.id;

        return (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18), ease: 'easeOut' }}
            className={`overflow-hidden rounded-[1.8rem] border ${tone.softCard}`}
          >
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <button type="button" onClick={() => onOpenItem(item)} className="flex min-w-0 items-start gap-3 text-left">
                <SpotlightAvatarImage
                  src={safeSpotlightAvatar(creator?.avatar_url)}
                  alt={creator?.name || 'Creator'}
                  className={`h-11 w-11 rounded-2xl object-cover ${surface === 'dark' ? 'ring-1 ring-white/10' : 'ring-1 ring-slate-200 dark:ring-white/10'}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`truncate text-sm font-bold ${tone.textStrong}`}>{creator?.name || 'Creator'}</p>
                    {creator?.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                    {pinnedItemId === item.id ? (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone.pill}`}>
                        <PinIcon className="h-3 w-3" />
                        Pinned
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-1 text-xs ${tone.textMuted}`}>
                    @{creator?.username || 'spotlight'} · {formatSpotlightTimeAgo(item.published_at || item.created_at)}
                  </p>
                </div>
              </button>

              <ItemMenu
                surface={surface}
                item={item}
                busy={busy}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
              />
            </div>

            <button type="button" onClick={() => onOpenItem(item)} className="block w-full px-4 pb-5 text-left sm:px-5">
              <p className={`text-sm leading-relaxed sm:text-[0.95rem] ${tone.textBody}`}>{item.caption || 'Open this Spotlight to view the full post.'}</p>

              <div className={`mt-4 overflow-hidden rounded-[1.45rem] border ${tone.outline}`}>
                {isText ? (
                  <SpotlightTextCard
                    caption={item.caption}
                    variant="detail"
                    className="min-h-[220px] rounded-none"
                  />
                ) : (
                  <div className="relative">
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt={getItemLabel(item)}
                      className="max-h-[28rem] w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      {item.media_type === 'video' ? 'Video' : 'Image'}
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold ${tone.textMuted}`}>
                <span>{compactSpotlightNumber(item.metrics.likes)} likes</span>
                <span>{compactSpotlightNumber(item.metrics.comments)} replies</span>
                <span>{compactSpotlightNumber(item.metrics.shares)} shares</span>
                {showViewCounts ? <span>{compactSpotlightNumber(item.metrics.views)} views</span> : null}
              </div>
            </button>
          </motion.article>
        );
      })}
    </div>
  );
}

export function SpotlightProfileMediaGrid({
  surface,
  items,
  pinnedItemId,
  showViewCounts = true,
  emptyMessage,
  compact = false,
  onOpenItem,
  onToggleVisibility,
  onDelete,
  busyItemId
}: {
  surface: SpotlightProfileSurface;
  items: SpotlightItem[];
  pinnedItemId?: string | null;
  showViewCounts?: boolean;
  emptyMessage: string;
  compact?: boolean;
  onOpenItem: (item: SpotlightItem) => void;
  onToggleVisibility?: (item: SpotlightItem) => void;
  onDelete?: (item: SpotlightItem) => void;
  busyItemId?: string | null;
}) {
  const tone = surfaceTone(surface);

  if (items.length === 0) {
    return (
      <div className={`rounded-[1.7rem] border border-dashed p-8 text-center ${tone.softCard}`}>
        <EmptyStateIcon className={`mx-auto h-6 w-6 ${tone.textMuted}`} />
        <p className={`mt-3 text-sm ${tone.textBody}`}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-2 sm:grid-cols-3 xl:grid-cols-4' : 'gap-3 lg:grid-cols-3 xl:grid-cols-4'}`}>
      {items.map((item) => {
        const isText = isTextPost(item);
        const busy = busyItemId === item.id;
        return (
          <article
            key={item.id}
            className={`group overflow-hidden rounded-[1.55rem] border transition hover:-translate-y-0.5 ${tone.softCard}`}
          >
            <div className="relative">
              <button type="button" onClick={() => onOpenItem(item)} className="block w-full text-left">
                <div className={`relative overflow-hidden ${compact ? 'aspect-square' : 'aspect-[4/5]'}`}>
                  {isText ? (
                    <SpotlightTextCard
                      caption={item.caption}
                      variant="tile"
                      className="h-full w-full rounded-none"
                    />
                  ) : (
                    <>
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt={getItemLabel(item)}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          {item.media_type === 'video' ? 'Video' : 'Image'}
                        </span>
                        {pinnedItemId === item.id ? (
                          <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-md">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </button>

              <div className="absolute right-3 top-3">
                <ItemMenu
                  surface={surface}
                  item={item}
                  busy={busy}
                  onToggleVisibility={onToggleVisibility}
                  onDelete={onDelete}
                />
              </div>

              {busy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white backdrop-blur-sm">
                  <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
                    Updating
                  </div>
                </div>
              ) : null}
            </div>

            <button type="button" onClick={() => onOpenItem(item)} className={`block w-full text-left ${compact ? 'p-2.5' : 'p-3'}`}>
              <p className={`line-clamp-2 text-sm leading-relaxed ${tone.textBody}`}>{getItemLabel(item)}</p>
              <div className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold ${tone.textMuted}`}>
                <span>{formatSpotlightTimeAgo(item.published_at || item.created_at)}</span>
                <span>{compactSpotlightNumber(item.metrics.likes)} likes</span>
                {showViewCounts ? <span>{compactSpotlightNumber(item.metrics.views)} views</span> : null}
              </div>
            </button>
          </article>
        );
      })}
    </div>
  );
}

export function SpotlightProfileEditorOverlay({
  open,
  form,
  usernameState,
  saving,
  avatarPreview,
  bannerPreview,
  pinnedCandidates,
  pinOptionsLoading = false,
  onChange,
  onAvatarFileChange,
  onBannerFileChange,
  onRemoveBanner,
  onClose,
  onSave
}: {
  open: boolean;
  form: SpotlightProfileFormState;
  usernameState: { kind: UsernameStateKind; message: string };
  saving: boolean;
  avatarPreview: string;
  bannerPreview: string;
  pinnedCandidates: SpotlightItem[];
  pinOptionsLoading?: boolean;
  onChange: (field: keyof SpotlightProfileFormState, value: string) => void;
  onAvatarFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBanner?: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const usernameTone = usernameState.kind === 'taken' || usernameState.kind === 'invalid'
    ? 'text-rose-300'
    : usernameState.kind === 'available'
      ? 'text-emerald-300'
      : 'text-slate-300';
  const locationPreview = [form.city.trim(), form.country.trim()].filter(Boolean).join(', ');
  void onBannerFileChange;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-slate-950/84 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Prime identity</p>
                <h3 className="mt-1 text-xl font-black text-white">Edit Spotlight profile</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/15" aria-label="Close editor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="border-b border-white/10 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#18110d]/88 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
                  <div className="border-b border-white/10 bg-black/35 px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">Profile shell</p>
                        <h4 className="mt-2 text-lg font-black text-white">Banner-free Spotlight header</h4>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                          Spotlight now leads with your avatar, handle, bio, counts, and pinned post instead of a wide banner.
                        </p>
                      </div>
                      {form.banner_url.trim() || bannerPreview ? (
                        <button
                          type="button"
                          onClick={onRemoveBanner}
                          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Remove stored banner
                        </button>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                          No banner active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 px-4 pb-5 pt-4 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="relative h-24 w-24 shrink-0 rounded-[1.7rem] border-4 border-black bg-[#201611] shadow-[0_20px_45px_rgba(0,0,0,0.3)] sm:h-28 sm:w-28">
                        <SpotlightAvatarImage src={safeSpotlightAvatar(avatarPreview || form.avatar_url)} alt="Profile avatar preview" className="h-full w-full rounded-[1.35rem] object-cover" />
                        <label className="absolute -bottom-2 -right-2 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,#111111_0%,#9a3412_52%,#ea580c_100%)] p-2 text-white shadow-[0_14px_28px_rgba(124,45,18,0.35)]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
                          <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />
                        </label>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">Live preview</p>
                        <h4 className="mt-2 truncate text-2xl font-black text-white">{form.name || 'Your creator name'}</h4>
                        <p className="mt-1 truncate text-sm text-slate-300">@{form.username || 'claim-your-username'}</p>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">{form.bio || 'This is where your Spotlight bio will show up. Keep it sharp and identifiable.'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          {form.website_url.trim() ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5">
                              <GlobeIcon className="h-3.5 w-3.5" />
                              {form.website_url.replace(/^https?:\/\//i, '')}
                            </span>
                          ) : null}
                          {locationPreview ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5">
                              <MapPinIcon className="h-3.5 w-3.5" />
                              {locationPreview}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Avatar</p>
                        <p className="mt-2 text-sm font-semibold text-white">Square crop</p>
                        <p className="mt-1 text-xs text-slate-400">Best at 600 x 600 or larger.</p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Header</p>
                        <p className="mt-2 text-sm font-semibold text-white">No banner</p>
                        <p className="mt-1 text-xs text-slate-400">The Spotlight profile now uses a cleaner X-style identity block.</p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Pinned</p>
                        <p className="mt-2 text-sm font-semibold text-white">{form.pinned_content_id ? 'Featured live' : 'Not pinned yet'}</p>
                        <p className="mt-1 text-xs text-slate-400">Choose one published Spotlight to sit above the tabs.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Display name</label>
                    <input
                      value={form.name}
                      onChange={(event) => onChange('name', event.target.value.slice(0, 80))}
                      placeholder="Your creator name"
                      className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Username</label>
                      <span className={`text-xs font-semibold ${usernameTone}`}>
                        {usernameState.kind === 'checking' ? 'Checking...' : usernameState.message || 'Unique public handle'}
                      </span>
                    </div>
                    <div className="rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-1.5 transition focus-within:border-amber-400/60 focus-within:bg-[#241813]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-400">@</span>
                        <input
                          value={form.username}
                          onChange={(event) => onChange('username', normalizeSpotlightUsernameInput(event.target.value))}
                          placeholder="claim-your-name"
                          className="w-full bg-transparent py-3 text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Letters and numbers are normalized into a clean URL-safe handle.</p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Bio</label>
                      <span className="text-xs text-slate-500">{form.bio.length}/200</span>
                    </div>
                    <textarea
                      value={form.bio}
                      onChange={(event) => onChange('bio', event.target.value.slice(0, 200))}
                      rows={5}
                      placeholder="Tell people what you make, sell, or why they should follow your Spotlight."
                      className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Website</label>
                      <input
                        value={form.website_url}
                        onChange={(event) => onChange('website_url', event.target.value.trimStart().slice(0, 160))}
                        placeholder="urbanprime.com/your-brand"
                        className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">City</label>
                      <input
                        value={form.city}
                        onChange={(event) => onChange('city', event.target.value.slice(0, 80))}
                        placeholder="Karachi"
                        className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Country</label>
                      <input
                        value={form.country}
                        onChange={(event) => onChange('country', event.target.value.slice(0, 80))}
                        placeholder="Pakistan"
                        className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-[#1b120e] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Pinned Spotlight</p>
                        <p className="mt-1 text-sm text-slate-300">Choose one Spotlight to feature above your tabs.</p>
                      </div>
                      {pinOptionsLoading ? <span className="text-xs text-slate-400">Loading posts...</span> : null}
                    </div>
                    <select
                      value={form.pinned_content_id}
                      onChange={(event) => onChange('pinned_content_id', event.target.value)}
                      className="w-full rounded-[1.3rem] border border-white/10 bg-[#1d1410] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:bg-[#241813]"
                    >
                      <option value="">No pinned Spotlight</option>
                      {pinnedCandidates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getItemLabel(item)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-400">
                      {form.pinned_content_id ? 'This selection will appear as the featured post on your profile.' : 'Leave empty if you do not want a pinned Spotlight.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-full bg-[linear-gradient(90deg,#111111_0%,#7c2d12_48%,#ea580c_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(124,45,18,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving profile...' : 'Save profile'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
