import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BlueTickBadge from './BlueTickBadge';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import {
  spotlightService,
  type SpotlightCreator,
  type SpotlightItem,
  type SpotlightProfileResponse
} from '../../services/spotlightService';

type ProfileTab = 'posts' | 'media' | 'likes' | 'saved';
type PeopleTab = 'followers' | 'following';

type SpotlightProfileCardModalProps = {
  open: boolean;
  username: string | null;
  onClose: () => void;
  onOpenItem: (item: SpotlightItem) => void;
  onOpenMessage: (creator: SpotlightCreator) => void;
  onBlocked?: () => void;
};

const PROFILE_TABS: ProfileTab[] = ['posts', 'media', 'likes', 'saved'];

const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');
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

function PeopleSheet({
  open,
  title,
  people,
  loading,
  viewerUserId,
  onClose,
  onToggleFollow,
  onOpenMessage
}: {
  open: boolean;
  title: string;
  people: SpotlightCreator[];
  loading: boolean;
  viewerUserId?: string | null;
  onClose: () => void;
  onToggleFollow: (creator: SpotlightCreator) => void;
  onOpenMessage: (creator: SpotlightCreator) => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex items-end bg-slate-950/35 p-0 sm:items-center sm:justify-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="w-full overflow-hidden rounded-t-[2rem] border border-white/40 bg-white/78 shadow-[0_28px_90px_rgba(15,23,42,0.24)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-950/88 sm:max-w-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-center justify-between border-b border-white/30 px-4 py-4 dark:border-white/10">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Spotlight social</p>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/60 bg-white/70 p-2 text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              {loading ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/65 p-10 text-center text-sm text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Loading people...
                </div>
              ) : null}
              {!loading && people.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/65 p-10 text-center text-sm text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  No people to show yet.
                </div>
              ) : null}
              {!loading ? people.map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-[1.4rem] border border-white/40 bg-white/72 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <img src={safeAvatar(person.avatar_url)} alt={person.name} className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{person.name}</p>
                      {person.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{compact(person.followers_count)} followers · {compact(person.following_count)} following</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {person.id !== viewerUserId ? (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(person)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${person.is_following ? 'border border-white/50 bg-slate-950 text-white dark:border-white/10 dark:bg-white dark:text-slate-950' : 'bg-sky-500 text-white hover:brightness-110 dark:bg-sky-400 dark:text-slate-950'}`}
                      >
                        {person.is_following ? 'Following' : 'Follow'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenMessage(person)}
                      className="rounded-full border border-white/50 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      Message
                    </button>
                  </div>
                </div>
              )) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const SpotlightProfileCardModal: React.FC<SpotlightProfileCardModalProps> = ({
  open,
  username,
  onClose,
  onOpenItem,
  onOpenMessage,
  onBlocked
}) => {
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [payload, setPayload] = useState<SpotlightProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [peopleTab, setPeopleTab] = useState<PeopleTab | null>(null);
  const [people, setPeople] = useState<SpotlightCreator[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const profile = payload?.profile || null;
  const isSelf = Boolean(payload?.is_self);
  const isFollowing = Boolean(payload?.is_following);
  const items = payload?.items || [];
  const counts = payload?.counts || { posts: 0, media: 0, likes: 0, saved: 0 };

  const creatorTarget = useMemo<SpotlightCreator | null>(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      firebase_uid: profile.firebase_uid,
      name: profile.name,
      avatar_url: profile.avatar_url,
      is_verified: profile.is_verified,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      posts_count: profile.posts_count,
      reels_count: profile.reels_count,
      is_following: payload?.is_following
    };
  }, [payload?.is_following, profile]);

  const loadProfile = useCallback(async () => {
    if (!open || !username) return;
    setLoading(true);
    try {
      const nextPayload = await spotlightService.getProfile(username, {
        tab,
        limit: 12,
        viewerFirebaseUid: user?.id
      });
      setPayload(nextPayload);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to load Spotlight profile.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [open, showNotification, tab, user?.id, username]);

  useEffect(() => {
    if (!open) {
      setPayload(null);
      setTab('posts');
      setPeopleTab(null);
      setPeople([]);
      setPeopleLoading(false);
      setMoreOpen(false);
      return;
    }
    void loadProfile();
  }, [loadProfile, open]);

  useEffect(() => {
    if (!open || !peopleTab || !username) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    spotlightService.getProfilePeople(username, {
      tab: peopleTab,
      limit: 120,
      viewerFirebaseUid: user?.id
    }).then((response) => {
      if (!cancelled) setPeople(response?.items || []);
    }).catch((error: any) => {
      if (!cancelled) {
        showNotification(error?.message || 'Unable to load this list.');
        setPeople([]);
      }
    }).finally(() => {
      if (!cancelled) setPeopleLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, peopleTab, showNotification, user?.id, username]);

  const handleToggleFollow = useCallback(async (creator: SpotlightCreator | null) => {
    if (!creator) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      const result = await spotlightService.followCreator(creator.firebase_uid);
      const delta = result?.following ? 1 : -1;
      setPayload((current) => current ? {
        ...current,
        is_following: Boolean(result?.following),
        profile: {
          ...current.profile,
          followers_count: Math.max(0, Number(current.profile.followers_count || 0) + delta)
        }
      } : current);
      setPeople((current) => current
        .map((entry) => entry.id === creator.id
          ? { ...entry, is_following: Boolean(result?.following), followers_count: Math.max(0, Number(entry.followers_count || 0) + delta) }
          : entry
        )
        .filter((entry) => !(isSelf && peopleTab === 'following' && entry.id === creator.id && !result?.following))
      );
      showNotification(result?.following ? `Following ${creator.name}.` : `Unfollowed ${creator.name}.`);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update follow state.');
    }
  }, [isSelf, openAuthModal, peopleTab, showNotification, user]);

  const handleMessage = useCallback(() => {
    if (!creatorTarget) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    onOpenMessage(creatorTarget);
  }, [creatorTarget, onOpenMessage, openAuthModal, user]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${encodeURIComponent(profile.username || username || profile.name)}`);
      showNotification('Profile link copied.');
    } catch {
      showNotification('Unable to copy profile link.');
    }
  }, [profile, showNotification, username]);

  const handleRestrict = useCallback(async () => {
    if (!profile) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      await spotlightService.restrictUser({ targetUserId: profile.id, targetFirebaseUid: profile.firebase_uid });
      showNotification(`Restricted ${profile.name}.`);
      setMoreOpen(false);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to restrict user.');
    }
  }, [openAuthModal, profile, showNotification, user]);

  const handleBlock = useCallback(async () => {
    if (!profile) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      await spotlightService.blockUser({ targetUserId: profile.id, targetFirebaseUid: profile.firebase_uid });
      showNotification(`Blocked ${profile.name}.`);
      setMoreOpen(false);
      onClose();
      onBlocked?.();
    } catch (error: any) {
      showNotification(error?.message || 'Unable to block user.');
    }
  }, [onBlocked, onClose, openAuthModal, profile, showNotification, user]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 26, scale: 0.97 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] border border-white/35 bg-white/70 shadow-[0_40px_120px_rgba(15,23,42,0.28)] backdrop-blur-[28px] dark:border-white/10 dark:bg-slate-950/86 sm:rounded-[2.4rem]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-sky-400/18 blur-3xl" />
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-400/16 blur-3xl" />
              <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-cyan-300/14 blur-3xl" />
            </div>

            <div className="relative border-b border-white/30 px-4 py-4 dark:border-white/10 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Prime identity</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Spotlight profile card</h2>
                </div>
                <button onClick={onClose} className="rounded-full border border-white/60 bg-white/75 p-2 text-slate-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {loading && !payload ? (
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="h-56 animate-pulse rounded-[2rem] bg-white/55 dark:bg-white/5" />
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="h-80 animate-pulse rounded-[2rem] bg-white/55 dark:bg-white/5" />
                    <div className="h-80 animate-pulse rounded-[2rem] bg-white/55 dark:bg-white/5" />
                  </div>
                </div>
              ) : null}

              {!loading && !payload ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Profile not found.
                </div>
              ) : null}

              {payload && profile ? (
                <div className="space-y-5 p-4 sm:p-6">
                  <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/55 shadow-[0_22px_70px_rgba(15,23,42,0.14)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5">
                    <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,rgba(8,17,31,0.98),rgba(29,78,216,0.86),rgba(103,232,249,0.55))]">
                      <div className="absolute left-10 top-12 h-28 w-28 rounded-full border border-white/25 bg-white/12 backdrop-blur-2xl" />
                      <div className="absolute right-10 top-8 h-36 w-36 rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
                          <img src={safeAvatar(profile.avatar_url)} alt={profile.name} className="h-28 w-28 rounded-[1.8rem] border-4 border-white object-cover shadow-[0_18px_50px_rgba(15,23,42,0.28)] dark:border-slate-950 sm:h-32 sm:w-32" />
                          <div className="pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{profile.name}</h3>
                              {profile.is_verified ? <BlueTickBadge className="h-6 w-6" /> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">@{profile.username || username}</p>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{profile.bio || 'This creator has not added a bio yet.'}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isSelf ? (
                            <>
                              <button className="rounded-full border border-white/50 bg-white/72 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">Your profile</button>
                              <button onClick={handleShare} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950">Share</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => void handleToggleFollow(creatorTarget)} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${isFollowing ? 'border border-white/50 bg-slate-950 text-white dark:border-white/10 dark:bg-white dark:text-slate-950' : 'bg-sky-500 text-white hover:brightness-110 dark:bg-sky-400 dark:text-slate-950'}`}>
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                              <button onClick={handleMessage} className="rounded-full border border-white/50 bg-white/72 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">Message</button>
                              <div className="relative">
                                <button onClick={() => setMoreOpen((current) => !current)} className="rounded-full border border-white/50 bg-white/72 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">More</button>
                                {moreOpen ? (
                                  <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-[1.2rem] border border-white/50 bg-white/88 p-2 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90">
                                    <button onClick={handleShare} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Copy profile link</button>
                                    <button onClick={() => void handleRestrict()} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Restrict</button>
                                    <button onClick={() => void handleBlock()} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Block</button>
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <button onClick={() => setPeopleTab('followers')} className="rounded-[1.5rem] border border-white/35 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5">
                          <span className="block text-xl font-black text-slate-950 dark:text-white">{compact(profile.followers_count)}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Followers</span>
                        </button>
                        <button onClick={() => setPeopleTab('following')} className="rounded-[1.5rem] border border-white/35 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5">
                          <span className="block text-xl font-black text-slate-950 dark:text-white">{compact(profile.following_count)}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Following</span>
                        </button>
                        <div className="rounded-[1.5rem] border border-white/35 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                          <span className="block text-xl font-black text-slate-950 dark:text-white">{compact(profile.posts_count)}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Posts</span>
                        </div>
                        <div className="rounded-[1.5rem] border border-white/35 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                          <span className="block text-xl font-black text-slate-950 dark:text-white">{compact(profile.reels_count)}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Media</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <section className="rounded-[2rem] border border-white/35 bg-white/58 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 sm:p-5">
                      <div className="flex flex-wrap gap-2">
                        {PROFILE_TABS.map((key) => (
                          <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950' : 'bg-white/78 text-slate-700 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'}`}
                          >
                            {key.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onClose();
                              onOpenItem(item);
                            }}
                            className="group overflow-hidden rounded-[1.5rem] border border-white/35 bg-white/68 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/82 dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 dark:bg-white/5">
                              <img src={item.thumbnail_url || item.media_url} alt={item.caption || 'Spotlight content'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                              <div className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                                {item.media_type === 'video' ? 'Video' : String(item.media_url || '').startsWith('data:image/svg+xml') ? 'Text' : 'Image'}
                              </div>
                            </div>
                            <div className="space-y-1 p-3">
                              <p className="line-clamp-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.caption || 'Prime Spotlight post'}</p>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span>{formatTimeAgo(item.published_at || item.created_at)}</span>
                                <span>{compact(item.metrics.likes)} likes</span>
                              </div>
                            </div>
                          </button>
                        ))}

                        {items.length === 0 ? (
                          <div className="col-span-full rounded-[1.5rem] border border-dashed border-slate-300 bg-white/62 p-8 text-center text-sm text-slate-500 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            No content available for this tab yet.
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <aside className="space-y-4">
                      <section className="rounded-[2rem] border border-white/35 bg-white/58 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-500">Creator pulse</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-[1.4rem] border border-white/35 bg-white/72 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tab focus</p>
                            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{compact(counts[tab])}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visible in {tab}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-white/35 bg-white/72 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Profile state</p>
                            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{isSelf ? 'Owner view' : isFollowing ? 'Following' : 'Discovery mode'}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Built directly inside Spotlight</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[2rem] border border-white/35 bg-white/58 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-500">Quick actions</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={handleShare} className="rounded-full border border-white/50 bg-white/72 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">Share</button>
                          {!isSelf ? <button onClick={handleMessage} className="rounded-full border border-white/50 bg-white/72 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white">Message</button> : null}
                          {!isSelf ? <button onClick={() => void handleToggleFollow(creatorTarget)} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950">{isFollowing ? 'Following' : 'Follow'}</button> : null}
                        </div>
                      </section>
                    </aside>
                  </div>
                </div>
              ) : null}
            </div>

            <PeopleSheet
              open={Boolean(peopleTab)}
              title={peopleTab === 'following' ? 'Following' : 'Followers'}
              people={people}
              loading={peopleLoading}
              viewerUserId={user?.id || null}
              onClose={() => setPeopleTab(null)}
              onToggleFollow={(creator) => void handleToggleFollow(creator)}
              onOpenMessage={onOpenMessage}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SpotlightProfileCardModal;
