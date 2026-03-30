import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SpotlightShell from '../../components/spotlight/SpotlightShell';
import BlueTickBadge from '../../components/spotlight/BlueTickBadge';
import SpotlightMessageDrawer from '../../components/spotlight/SpotlightMessageDrawer';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightService, type SpotlightCreator, type SpotlightItem, type SpotlightProfile, type SpotlightProfileResponse } from '../../services/spotlightService';

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

const tabs = ['posts', 'media', 'likes', 'saved'] as const;
type ProfileTab = typeof tabs[number];
type PeopleTab = 'followers' | 'following';

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
      <div className="h-64 rounded-[1.8rem] bg-slate-200/80 dark:bg-white/10" />
      <div className="flex items-end gap-4 px-2">
        <div className="-mt-16 h-28 w-28 rounded-[1.6rem] border-4 border-white bg-slate-200/80 dark:border-slate-950 dark:bg-white/10" />
        <div className="flex-1 space-y-2 pb-2">
          <div className="h-4 w-48 rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-3 w-64 rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="h-16 rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-16 rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-16 rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-16 rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="h-40 rounded-[1.6rem] bg-slate-200/80 dark:bg-white/10" />
        <div className="h-40 rounded-[1.6rem] bg-slate-200/80 dark:bg-white/10" />
        <div className="h-40 rounded-[1.6rem] bg-slate-200/80 dark:bg-white/10" />
        <div className="h-40 rounded-[1.6rem] bg-slate-200/80 dark:bg-white/10" />
      </div>
    </div>
  );
}

function ActionButton({
  active,
  label,
  onClick
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 ${active ? 'bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950' : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

function PeopleModal({
  title,
  people,
  loading,
  viewerUserId,
  onToggleFollow,
  onClose
}: {
  title: string;
  people: SpotlightCreator[];
  loading: boolean;
  viewerUserId?: string | null;
  onToggleFollow: (person: SpotlightCreator) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xl md:items-center md:p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-white/15 bg-white/90 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl dark:bg-[#08111f]/95 md:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Social graph</p>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Loading people...
            </div>
          ) : null}
          {!loading && people.length > 0 ? people.map((person) => (
            <div key={person.id} className="flex items-center gap-3 rounded-[1.3rem] border border-white/70 bg-white/70 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <img src={safeAvatar(person.avatar_url)} alt={person.name} className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{person.name}</p>
                  {person.is_verified ? <BlueTickBadge className="h-5 w-5" /> : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{compact(person.followers_count)} followers · {compact(person.following_count)} following</p>
              </div>
              <div className="flex items-center gap-2">
                {person.id !== viewerUserId ? (
                  <button
                    type="button"
                    onClick={() => onToggleFollow(person)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition duration-200 ${person.is_following ? 'border border-slate-200 bg-slate-950 text-white dark:border-white/10 dark:bg-white dark:text-slate-950' : 'bg-sky-500 text-white hover:brightness-110 dark:bg-sky-400 dark:text-slate-950'}`}
                  >
                    {person.is_following ? 'Following' : 'Follow'}
                  </button>
                ) : null}
                <Link to={`/profile/${encodeURIComponent(person.name)}`} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                  Open
                </Link>
              </div>
            </div>
          )) : (
            !loading ? <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              No profiles to show yet.
            </div> : null
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileViewerModal({
  item,
  onClose,
  onOpenSpotlight
}: {
  item: SpotlightItem | null;
  onClose: () => void;
  onOpenSpotlight: () => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xl md:items-center md:p-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-white shadow-[0_40px_100px_rgba(0,0,0,0.35)] dark:bg-[#08111f] md:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <button onClick={onOpenSpotlight} className="flex items-center gap-3 text-left">
            <img src={safeAvatar(item.creator?.avatar_url)} alt={item.creator?.name || 'Creator'} className="h-11 w-11 rounded-2xl object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{item.creator?.name || 'Creator'}</p>
                {item.creator?.is_verified ? <BlueTickBadge className="h-5 w-5" /> : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(item.published_at || item.created_at)}</p>
            </div>
          </button>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" aria-label="Close viewer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="grid max-h-[90vh] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-h-[48vh] bg-black lg:min-h-[75vh]">
            {item.media_type === 'video' ? (
              <video src={item.media_url} poster={item.thumbnail_url || undefined} autoPlay muted playsInline controls className="h-full w-full object-contain" />
            ) : (
              <img src={item.media_url} alt={item.caption || 'Spotlight content'} className="h-full w-full object-contain" />
            )}
          </div>
          <div className="flex min-h-0 flex-col border-t border-slate-200/70 dark:border-white/10 lg:border-l lg:border-t-0">
            <div className="space-y-4 overflow-y-auto px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.caption}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/5">
                  <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(item.metrics.likes)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Likes</span>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/5">
                  <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(item.metrics.views)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Views</span>
                </div>
              </div>
              <Link to={`/spotlight/post/${item.id}`} onClick={onOpenSpotlight} className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                Open in Spotlight
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SpotlightProfilePage: React.FC = () => {
  const { username = '' } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [profile, setProfile] = useState<SpotlightProfile | null>(null);
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeItem, setActiveItem] = useState<SpotlightItem | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [peopleTab, setPeopleTab] = useState<PeopleTab | null>(null);
  const [people, setPeople] = useState<SpotlightCreator[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<SpotlightCreator | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const seenIds = useRef(new Set<string>());
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const profileLink = useMemo(() => `/profile/${encodeURIComponent(user?.name || 'me')}`, [user?.name]);
  const routeProfileLink = useMemo(() => `/profile/${encodeURIComponent(profile?.username || username)}`, [profile?.username, username]);

  const loadProfile = useCallback(async (reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const payload: SpotlightProfileResponse = await spotlightService.getProfile(username, {
        tab,
        cursor: reset ? null : cursorRef.current,
        limit: 24,
        viewerFirebaseUid: user?.id
      });
      setProfile(payload.profile);
      setIsSelf(payload.is_self);
      setIsFollowing(payload.is_following);
      setCursor(payload.next_cursor);
      setHasMore(payload.has_more);
      setItems((prev) => {
        const base = reset ? [] : [...prev];
        if (reset) seenIds.current.clear();
        payload.items.forEach((item) => {
          if (seenIds.current.has(item.id)) return;
          seenIds.current.add(item.id);
          base.push(item);
        });
        return base;
      });
    } catch (error: any) {
      showNotification(error?.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showNotification, tab, user?.id, username]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setActiveItem(null);
    void loadProfile(true);
  }, [loadProfile, tab, username, user?.id]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore) void loadProfile(false);
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadProfile, loadingMore]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (peopleTab) setPeopleTab(null);
      else if (activeItem) setActiveItem(null);
      else setMoreOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeItem, peopleTab]);

  useEffect(() => {
    if (!peopleTab) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    spotlightService.getProfilePeople(username, {
      tab: peopleTab,
      limit: 100,
      viewerFirebaseUid: user?.id
    }).then((payload) => {
      if (cancelled) return;
      setPeople(payload?.items || []);
    }).catch((error: any) => {
      if (cancelled) return;
      showNotification(error?.message || 'Unable to load this list.');
      setPeople([]);
    }).finally(() => {
      if (!cancelled) setPeopleLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [peopleTab, showNotification, user?.id, username]);

  const openItem = (item: SpotlightItem) => setActiveItem(item);
  const closeModal = () => setActiveItem(null);

  const toggleFollow = async () => {
    if (!profile) return;
    if (!user) { openAuthModal('login'); return; }
    try {
      const result = await spotlightService.followCreator(profile.firebase_uid);
      setIsFollowing(Boolean(result?.following));
      setProfile((current) => current ? {
        ...current,
        followers_count: Math.max(0, Number(current.followers_count || 0) + (result?.following ? 1 : -1))
      } : current);
      showNotification(result?.following ? 'Following now.' : 'Unfollowed.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update follow state.');
    }
  };

  const togglePersonFollow = async (person: SpotlightCreator) => {
    if (!user) { openAuthModal('login'); return; }
    try {
      const result = await spotlightService.followCreator(person.firebase_uid);
      const delta = result?.following ? 1 : -1;
      setPeople((current) => current
        .map((entry) => (
          entry.id === person.id
            ? { ...entry, is_following: Boolean(result?.following), followers_count: Math.max(0, Number(entry.followers_count || 0) + delta) }
            : entry
        ))
        .filter((entry) => !(isSelf && peopleTab === 'following' && entry.id === person.id && !result?.following))
      );
      if (isSelf && peopleTab === 'following') {
        setProfile((current) => current ? {
          ...current,
          following_count: Math.max(0, Number(current.following_count || 0) + delta)
        } : current);
      }
      showNotification(result?.following ? `Following ${person.name}.` : `Unfollowed ${person.name}.`);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update follow state.');
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    if (!user) { openAuthModal('login'); return; }
    try {
      await spotlightService.blockUser({ targetUserId: profile.id, targetFirebaseUid: profile.firebase_uid });
      showNotification(`Blocked ${profile.name || username}.`);
      navigate('/spotlight');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to block user.');
    }
  };

  const handleRestrict = async () => {
    if (!profile) return;
    if (!user) { openAuthModal('login'); return; }
    try {
      await spotlightService.restrictUser({ targetUserId: profile.id, targetFirebaseUid: profile.firebase_uid });
      showNotification(`Restricted ${profile.name || username}.`);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to restrict user.');
    }
  };

  const openMessageThread = async () => {
    if (!profile) return;
    if (!user) { openAuthModal('login'); return; }
    setMessageTarget({
      id: profile.id,
      firebase_uid: profile.firebase_uid,
      name: profile.name || username,
      avatar_url: profile.avatar_url
    });
    setMessageOpen(true);
  };

  const editProfile = () => navigate('/profile/settings/legacy-edit');

  const shareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showNotification('Profile link copied.');
    } catch {
      showNotification('Unable to copy profile link.');
    }
  };

  const showItems = useMemo(() => {
    if (tab === 'likes' && !isSelf) return [];
    if (tab === 'saved' && !isSelf) return [];
    return items;
  }, [isSelf, items, tab]);

  if (loading && !profile) {
    return (
      <SpotlightShell profileLink={profileLink}>
        <div className="mx-auto w-full max-w-6xl px-0 lg:px-0">
          <ProfileSkeleton />
        </div>
      </SpotlightShell>
    );
  }

  if (!profile) {
    return (
      <SpotlightShell profileLink={profileLink}>
        <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-2">
          <div className="w-full rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">Profile not found</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">We could not find a Spotlight profile for <span className="font-semibold">@{username}</span>.</p>
            <Link to="/spotlight" className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Back to Spotlight</Link>
          </div>
        </div>
      </SpotlightShell>
    );
  }

  const mainContent = (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
        <div className="h-60 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(29,78,216,0.92),rgba(56,189,248,0.75))]" />
        <div className="px-4 pb-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="-mt-16 flex items-end gap-4">
              <img src={safeAvatar(profile.avatar_url)} alt={profile.name || username} className="h-28 w-28 rounded-[1.75rem] border-4 border-white object-cover shadow-xl dark:border-slate-950" />
              <div className="pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{profile.name || username}</h1>
                  {profile.is_verified ? <BlueTickBadge className="h-6 w-6" /> : null}
              </div>
                <p className="text-sm text-slate-500 dark:text-slate-300">@{profile.username || username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSelf ? (
                <>
                  <button onClick={editProfile} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Edit profile</button>
                  <button onClick={shareProfile} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Share profile</button>
                </>
              ) : (
                <>
                  <button onClick={toggleFollow} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">{isFollowing ? 'Following' : 'Follow'}</button>
                  <button onClick={openMessageThread} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Message</button>
                  <div className="relative">
                    <button onClick={() => setMoreOpen((current) => !current)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">More</button>
                    {moreOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#09111d]/95">
                        <button onClick={shareProfile} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Copy profile link</button>
                        <button onClick={() => { setMoreOpen(false); void handleRestrict(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Restrict user</button>
                        <button onClick={() => { setMoreOpen(false); void handleBlock(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10">Block user</button>
                        <button onClick={() => { setMoreOpen(false); showNotification('Report flow coming soon.'); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Report profile</button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{profile.bio || 'This creator has not added a bio yet.'}</p>
          {profile.about ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{profile.about}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button onClick={() => setPeopleTab('followers')} className="rounded-2xl bg-slate-100 px-4 py-3 text-left transition hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(profile.followers_count || 0)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Followers</span>
            </button>
            <button onClick={() => setPeopleTab('following')} className="rounded-2xl bg-slate-100 px-4 py-3 text-left transition hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(profile.following_count || 0)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Following</span>
            </button>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-white/5">
              <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(profile.posts_count || 0)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Posts</span>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-white/5">
              <span className="block text-lg font-black text-slate-950 dark:text-white">{compact(profile.reels_count || 0)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Media</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((key) => (
            <ActionButton
              key={key}
              label={key.toUpperCase()}
              active={tab === key}
              onClick={() => setTab(key)}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {showItems.map((item) => (
          <ProfileTile key={item.id} item={item} onClick={() => void openItem(item)} />
        ))}
        {!loading && showItems.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-8 text-sm text-slate-500 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            No content available for this tab.
          </div>
        ) : null}
      </section>

      {hasMore ? <div ref={sentinelRef} className="h-8" /> : null}
      {loadingMore ? (
        <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 text-sm text-slate-500 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Loading more...
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <SpotlightShell profileLink={profileLink} onMessagesClick={isSelf ? undefined : () => void openMessageThread()} messagesActive={messageOpen}>
        <div className="mx-auto w-full max-w-6xl">
          {mainContent}
        </div>
      </SpotlightShell>

      {peopleTab ? (
        <PeopleModal
          title={peopleTab === 'followers' ? 'Followers' : 'Following'}
          people={people}
          loading={peopleLoading}
          viewerUserId={user?.id || null}
          onToggleFollow={togglePersonFollow}
          onClose={() => setPeopleTab(null)}
        />
      ) : null}

      <ProfileViewerModal
        item={activeItem}
        onClose={closeModal}
        onOpenSpotlight={() => {
          if (!activeItem) return;
          navigate(`/spotlight/post/${activeItem.id}`);
        }}
      />

      <SpotlightMessageDrawer
        open={messageOpen}
        target={messageTarget}
        onClose={() => {
          setMessageOpen(false);
          setMessageTarget(null);
        }}
      />
    </>
  );
};

function ProfileTile({ item, onClick }: { item: SpotlightItem; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/75 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
      <div className="relative aspect-[4/5] bg-slate-100 dark:bg-white/5">
        {item.media_type === 'video' ? (
          <img src={item.thumbnail_url || item.media_url} alt={item.caption || 'Media'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <img src={item.media_url} alt={item.caption || 'Media'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          {item.media_type === 'video' ? 'Video' : 'Photo'}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.caption || 'Untitled Spotlight content'}</p>
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span>{formatTimeAgo(item.published_at || item.created_at)}</span>
          <span>{compact(item.metrics.likes)} likes</span>
        </div>
      </div>
    </button>
  );
}

export default SpotlightProfilePage;



