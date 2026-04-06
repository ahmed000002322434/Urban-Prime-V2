import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SpotlightShell from '../../components/spotlight/SpotlightShell';
import SpotlightCommerceBridge from '../../components/spotlight/SpotlightCommerceBridge';
import BlueTickBadge from '../../components/spotlight/BlueTickBadge';
import SpotlightMessageDrawer from '../../components/spotlight/SpotlightMessageDrawer';
import SpotlightUtilitySheet from '../../components/spotlight/SpotlightUtilitySheet';
import SpotlightTextCard from '../../components/spotlight/SpotlightTextCard';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { useSpotlightPreferences } from '../../components/spotlight/SpotlightPreferencesContext';
import { itemService } from '../../services/itemService';
import { spotlightService, type SpotlightCreator, type SpotlightItem, type SpotlightProfile, type SpotlightProfileResponse } from '../../services/spotlightService';
import { AnimatePresence, motion } from 'framer-motion';

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
      <div className="h-[150px] rounded-[1.8rem] bg-slate-200/80 sm:h-[180px] lg:h-[210px] dark:bg-white/10" />
      <div className="flex items-end gap-4 px-2">
        <div className="-mt-10 h-[80px] w-[80px] rounded-full border-4 border-white bg-slate-200/80 sm:-mt-12 sm:h-[96px] sm:w-[96px] dark:border-slate-950 dark:bg-white/10" />
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
        className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg dark:border-white/10 dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/70 text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'}`}
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
    <div className="spotlight-modal spotlight-people-modal fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xl md:items-center md:p-4" onClick={onClose}>
      <div
        className="spotlight-people-panel w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-white/15 bg-white/90 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl dark:bg-[#08111f]/95 md:rounded-[2rem]"
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
              <img src={safeAvatar(person.avatar_url)} alt={person.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10" />
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
                <Link to={`/profile/${encodeURIComponent(person.firebase_uid || person.name)}`} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
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
  const isText = String(item.media_url || '').startsWith('data:image/svg+xml');

  return (
    <div className="spotlight-modal spotlight-viewer-modal fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xl md:items-center md:p-4" onClick={onClose}>
      <div
        className="spotlight-viewer-panel w-full max-w-6xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-white shadow-[0_40px_100px_rgba(0,0,0,0.35)] dark:bg-[#08111f] md:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <button onClick={onOpenSpotlight} className="flex items-center gap-3 text-left">
            <img src={safeAvatar(item.creator?.avatar_url)} alt={item.creator?.name || 'Creator'} className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10" />
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
          <div className={`min-h-[48vh] ${item.media_type === 'video' ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950'} lg:min-h-[75vh]`}>
            {isText ? (
              <div className="flex h-full min-h-[48vh] items-start justify-center p-4 sm:items-center lg:min-h-[75vh]">
                <SpotlightTextCard
                  caption={item.caption}
                  variant="detail"
                  className="w-full max-w-3xl"
                />
              </div>
            ) : item.media_type === 'video' ? (
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
  const { showNotification, unreadNotificationCount } = useNotification();
  const { preferences, updatePreferences, resetPreferences } = useSpotlightPreferences();
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
  const [utilitySheet, setUtilitySheet] = useState<'notifications' | 'more' | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<{ user: any; items: any[]; store: any } | null>(null);
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);
  const trackedViewIdsRef = useRef(new Set<string>());
  const activeViewTimerRef = useRef<number | null>(null);
  const activeViewPendingRef = useRef(false);
  const seenIds = useRef(new Set<string>());
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const profileLink = useMemo(() => `/profile/${encodeURIComponent(user?.id || 'me')}`, [user?.id]);
  const reducedMotion = preferences.reducedMotion;
  const compactDensity = preferences.compactDensity;
  const spotlightPreferenceItems = useMemo(() => ([
    {
      key: 'compactDensity',
      label: 'Compact density',
      description: 'Tightens card spacing and makes the feed feel denser.',
      value: preferences.compactDensity,
      onToggle: () => updatePreferences({ compactDensity: !preferences.compactDensity })
    },
    {
      key: 'reducedMotion',
      label: 'Reduced motion',
      description: 'Softens hover lifts and cuts motion for a calmer feel.',
      value: preferences.reducedMotion,
      onToggle: () => updatePreferences({ reducedMotion: !preferences.reducedMotion })
    },
    {
      key: 'autoplayVideos',
      label: 'Autoplay videos',
      description: 'Starts videos as they enter the feed viewport.',
      value: preferences.autoplayVideos,
      onToggle: () => updatePreferences({ autoplayVideos: !preferences.autoplayVideos })
    },
    {
      key: 'showViewCounts',
      label: 'Show view counts',
      description: 'Keeps view numbers visible on post actions.',
      value: preferences.showViewCounts,
      onToggle: () => updatePreferences({ showViewCounts: !preferences.showViewCounts })
    }
  ]), [preferences.autoplayVideos, preferences.compactDensity, preferences.reducedMotion, preferences.showViewCounts, updatePreferences]);

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
    if (!profile?.firebase_uid) {
      setLinkedProfile(null);
      return;
    }

    let cancelled = false;
    itemService.getPublicProfile(profile.firebase_uid, { publishedOnly: true }).then((payload) => {
      if (cancelled) return;
      setLinkedProfile(payload ? { user: payload.user, items: payload.items || [], store: payload.store || null } : null);
    }).catch(() => {
      if (!cancelled) setLinkedProfile(null);
    });

    return () => {
      cancelled = true;
    };
  }, [profile?.firebase_uid]);

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

  const recordContentView = useCallback(async (item: SpotlightItem, visibleRatio = 1) => {
    if (!item?.id || trackedViewIdsRef.current.has(item.id)) return;
    const watchTimeMs = item.media_type === 'video' ? 2500 : 1500;
    try {
      const response = await spotlightService.trackView({
        content_id: item.id,
        media_type: item.media_type === 'video' ? 'video' : 'image',
        watch_time_ms: watchTimeMs,
        visible_ratio: visibleRatio,
        viewer_firebase_uid: user?.id
      });
      const payload = (response as any)?.data || response;
      if (payload?.counted || payload?.deduped) {
        trackedViewIdsRef.current.add(item.id);
      }
      if (payload?.counted && typeof payload.views === 'number') {
        const nextViews = Number(payload.views || 0);
        const nextWatchTime = Number(payload.watch_time_ms || watchTimeMs || 0);
        setItems((current) => current.map((entry) => (
          entry.id === item.id
            ? { ...entry, metrics: { ...entry.metrics, views: nextViews, watch_time_ms: nextWatchTime } }
            : entry
        )));
        setActiveItem((current) => (
          current && current.id === item.id
            ? { ...current, metrics: { ...current.metrics, views: nextViews, watch_time_ms: nextWatchTime } }
            : current
        ));
      }
    } catch {
      // Best effort only.
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeViewTimerRef.current !== null) {
      window.clearTimeout(activeViewTimerRef.current);
      activeViewTimerRef.current = null;
    }
    if (!activeItem || trackedViewIdsRef.current.has(activeItem.id)) {
      activeViewPendingRef.current = false;
      return;
    }
    if (activeViewPendingRef.current) return;

    const watchTimeMs = activeItem.media_type === 'video' ? 2500 : 1500;
    activeViewPendingRef.current = true;
    activeViewTimerRef.current = window.setTimeout(() => {
      activeViewPendingRef.current = false;
      void recordContentView(activeItem, 1);
    }, watchTimeMs);

    return () => {
      if (activeViewTimerRef.current !== null) {
        window.clearTimeout(activeViewTimerRef.current);
        activeViewTimerRef.current = null;
      }
      activeViewPendingRef.current = false;
    };
  }, [activeItem, recordContentView]);

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
    setMoreOpen(false);
    setUtilitySheet(null);
    setMessageTarget({
      id: profile.id,
      firebase_uid: profile.firebase_uid,
      name: profile.name || username,
      avatar_url: profile.avatar_url
    });
    setMessageOpen(true);
  };

  const openNotificationsCard = () => {
    setMoreOpen(false);
    setMessageOpen(false);
    setMessageTarget(null);
    setUtilitySheet((current) => (current === 'notifications' ? null : 'notifications'));
  };

  const openMoreCard = () => {
    setMoreOpen(false);
    setMessageOpen(false);
    setMessageTarget(null);
    setUtilitySheet((current) => (current === 'more' ? null : 'more'));
  };

  const openVideoInViewer = useCallback((item: SpotlightItem) => {
    navigate(`/reels?focus=${item.id}`);
  }, [navigate]);

  const editProfile = () => navigate('/profile/settings/legacy-edit');

  const handleToggleProfileItemVisibility = useCallback(async (item: SpotlightItem) => {
    if (!profile || !isSelf) return;
    if (!user) {
      openAuthModal('login');
      return;
    }

    const nextStatus = item.status === 'published' ? 'archived' : 'published';
    setMutatingItemId(item.id);
    try {
      await spotlightService.updateContent(item.id, { status: nextStatus });
      showNotification(nextStatus === 'published' ? 'Post is public again.' : 'Post hidden from Spotlight.');
      if (activeItem?.id === item.id) {
        setActiveItem((current) => current ? { ...current, status: nextStatus } : current);
      }
      await loadProfile(true);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update post visibility.');
    } finally {
      setMutatingItemId(null);
    }
  }, [activeItem, isSelf, loadProfile, openAuthModal, profile, showNotification, user]);

  const handleDeleteProfileItem = useCallback(async (item: SpotlightItem) => {
    if (!profile || !isSelf) return;
    if (!user) {
      openAuthModal('login');
      return;
    }

    const confirmed = window.confirm(`Delete this ${item.media_type === 'video' ? 'video' : 'post'}?`);
    if (!confirmed) return;

    setMutatingItemId(item.id);
    try {
      await spotlightService.deleteContent(item.id);
      showNotification('Post deleted.');
      if (activeItem?.id === item.id) {
        setActiveItem(null);
      }
      await loadProfile(true);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to delete post.');
    } finally {
      setMutatingItemId(null);
    }
  }, [activeItem, isSelf, loadProfile, openAuthModal, profile, showNotification, user]);

  const shareProfile = async () => {
    try {
      const canonicalUsername = profile?.firebase_uid || profile?.username || username || 'me';
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${encodeURIComponent(canonicalUsername)}`);
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
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <ProfileSkeleton />
          </motion.div>
        </div>
      </SpotlightShell>
    );
  }

  if (!profile) {
    return (
      <SpotlightShell profileLink={profileLink}>
        <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-2">
          <div className="spotlight-profile-empty w-full rounded-[2rem] border border-dashed border-slate-300 p-10 text-center shadow-xl backdrop-blur-2xl dark:border-white/10">
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">Profile not found</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">We could not find a Spotlight profile for <span className="font-semibold">@{username}</span>.</p>
            <Link to="/spotlight" className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Back to Spotlight</Link>
          </div>
        </div>
      </SpotlightShell>
    );
  }

  const mainContent = (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`space-y-5 ${compactDensity ? 'spotlight-density-compact' : ''}`}
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`spotlight-profile-hero overflow-hidden rounded-[2.25rem] border border-white/75 bg-white/65 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/[0.05] ${compactDensity ? 'spotlight-profile-hero--compact' : ''}`}
      >
          <div
            className="relative h-[150px] overflow-hidden sm:h-[180px] lg:h-[210px]"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface, #ffffff) 0%, var(--color-background, #f8fafc) 100%)'
            }}
          >
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />
          </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="-mt-10 flex flex-col items-center gap-4 text-center md:-mt-12 md:flex-row md:items-end md:gap-5 md:text-left lg:-mt-14">
              <div className="relative">
                <div className="absolute -inset-3 rounded-[2rem] bg-sky-500/10 blur-2xl" />
                  <img
                    src={safeAvatar(profile.avatar_url)}
                    alt={profile.name || username}
                    className="relative h-[84px] w-[84px] rounded-full border-4 border-white object-cover shadow-[0_18px_50px_rgba(15,23,42,0.24)] ring-1 ring-slate-200 dark:border-slate-950 dark:ring-white/10 sm:h-[100px] sm:w-[100px] lg:h-[112px] lg:w-[112px]"
                  />
                </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{profile.name || username}</h1>
                  {profile.is_verified ? <BlueTickBadge className="h-6 w-6" /> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">@{profile.username || username}</p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{profile.bio || profile.about || 'This creator has not added a bio yet.'}</p>
                {profile.about ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{profile.about}</p> : null}
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:justify-end">
              {isSelf ? (
                <>
                    <button onClick={editProfile} className="rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Edit profile</button>
                    <button onClick={shareProfile} className="rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Share profile</button>
                    <button onClick={() => navigate('/spotlight/create')} className="col-span-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 dark:bg-white dark:text-slate-950">Create Spotlight</button>
                </>
              ) : (
                <>
                    <button onClick={toggleFollow} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 dark:bg-white dark:text-slate-950">{isFollowing ? 'Following' : 'Follow'}</button>
                    <button onClick={openMessageThread} className="rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Message</button>
                    <div className="relative col-span-2 md:col-span-1">
                      <button onClick={() => setMoreOpen((current) => !current)} className="w-full rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">More</button>
                    {moreOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#09111d]/95">
                        <button onClick={shareProfile} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Copy profile link</button>
                        <button onClick={() => { setMoreOpen(false); void handleRestrict(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Restrict user</button>
                        <button onClick={() => { setMoreOpen(false); void handleBlock(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10">Block user</button>
                        <button onClick={() => { setMoreOpen(false); showNotification('Report flow coming soon.'); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">Report profile</button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
              <button onClick={() => setPeopleTab('followers')} className="rounded-[1.35rem] border border-white/70 bg-white/70 px-3 py-3 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="block text-base font-black text-slate-950 dark:text-white sm:text-lg">{compact(profile.followers_count || 0)}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">Followers</span>
            </button>
              <button onClick={() => setPeopleTab('following')} className="rounded-[1.35rem] border border-white/70 bg-white/70 px-3 py-3 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="block text-base font-black text-slate-950 dark:text-white sm:text-lg">{compact(profile.following_count || 0)}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">Following</span>
            </button>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/70 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <span className="block text-base font-black text-slate-950 dark:text-white sm:text-lg">{compact(profile.posts_count || 0)}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">Posts</span>
            </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/70 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <span className="block text-base font-black text-slate-950 dark:text-white sm:text-lg">{compact(profile.reels_count || 0)}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">Media</span>
            </div>
          </div>
        </div>
      </motion.section>

      {linkedProfile ? (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0.01 } : { duration: 0.35, ease: 'easeOut', delay: 0.03 }}
          className={`overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${compactDensity ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-500">Main profile</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                {linkedProfile.user.businessName || linkedProfile.user.name || 'Public profile'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Linked site profile data with posts, store, and public account details. Open it for the full non-Spotlight view.
              </p>
            </div>
            <Link
              to={`/user/${encodeURIComponent(linkedProfile.user.id)}`}
              className="rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(37,99,235,0.96),rgba(56,189,248,0.96))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Open full profile
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Public posts</p>
              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{compact(linkedProfile.items.length)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Store</p>
              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{linkedProfile.store ? 'Live' : 'None'}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Main identity</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{linkedProfile.user.id}</p>
            </div>
          </div>
        </motion.section>
      ) : null}

      {isSelf ? (
        <>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0.01 } : { duration: 0.4, ease: 'easeOut', delay: 0.04 }}
          className={`spotlight-profile-settings overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${compactDensity ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Spotlight settings</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Behavior controls</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Tune how Spotlight behaves while keeping one permanent visual language.</p>
            </div>
            <button
              type="button"
              onClick={resetPreferences}
              className="rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Reset settings
            </button>
          </div>

          <div className={`mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 ${compactDensity ? 'sm:gap-2 md:gap-2.5' : 'sm:gap-2.5 md:gap-3'}`}>
            {spotlightPreferenceItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onToggle}
                className={`rounded-[1.35rem] border px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${item.value ? 'border-sky-200 bg-sky-50/85 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100' : 'border-white/70 bg-white/75 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${item.value ? 'bg-white/80 text-sky-700 dark:bg-white/10 dark:text-sky-200' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                    {item.value ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-current/70">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Card opacity</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">Make Spotlight cards softer or more solid.</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">
                {Math.round(preferences.surfaceOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.28"
              step="0.01"
              value={preferences.surfaceOpacity}
              onChange={(event) => updatePreferences({ surfaceOpacity: Number(event.target.value) })}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-950 dark:bg-white/10 dark:accent-white"
              aria-label="Adjust Spotlight card opacity"
            />
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <span>Airy</span>
              <span>Balanced</span>
              <span>Solid</span>
            </div>
          </div>

          <div className="mt-4 rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Default visibility</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">Used when you open the composer</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">
                {preferences.defaultVisibility}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['public', 'followers', 'private'] as const).map((visibility) => (
                <button
                  key={visibility}
                  type="button"
                  onClick={() => updatePreferences({ defaultVisibility: visibility })}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${preferences.defaultVisibility === visibility ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/70 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
                >
                  {visibility}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={editProfile} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Edit profile</button>
            <button onClick={shareProfile} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Copy link</button>
            <button onClick={() => navigate('/spotlight/create')} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 dark:bg-white dark:text-slate-950">Create spotlight</button>
          </div>
        </motion.section>

        <SpotlightCommerceBridge
          className="rounded-[2rem] border border-white/70 bg-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          quickLinks={[
            { label: 'Products', hint: 'Manage your listings', to: '/profile/products' },
            { label: 'Storefront', hint: 'Open your shop', to: '/profile/store' },
            { label: 'Sales', hint: 'View orders', to: '/profile/sales' },
            { label: 'Earnings', hint: 'Check payout flow', to: '/profile/earnings' },
            { label: 'Create product', hint: 'List something new', to: '/profile/products/new' },
            { label: 'Checkout', hint: 'Preview buyer flow', to: '/checkout' }
          ]}
        />
        </>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        className={`spotlight-profile-tabs sticky top-[4.75rem] z-20 rounded-[2rem] border border-white/70 bg-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${compactDensity ? 'p-3' : 'p-4'}`}
      >
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
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}
        className={`spotlight-profile-grid grid grid-cols-3 ${compactDensity ? 'gap-1 sm:gap-2 md:gap-2.5' : 'gap-1.5 sm:gap-2.5 md:gap-3'} lg:grid-cols-4`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {showItems.map((item, index) => (
            <ProfileTile
              key={item.id}
              item={item}
              index={index}
              compactDensity={compactDensity}
              reducedMotion={reducedMotion}
              isOwner={isSelf}
              busy={mutatingItemId === item.id}
              onOpenVideo={openVideoInViewer}
              onDelete={handleDeleteProfileItem}
              onToggleVisibility={handleToggleProfileItemVisibility}
              onClick={() => void openItem(item)}
            />
          ))}
        </AnimatePresence>
        {!loading && showItems.length === 0 ? (
          <div className="spotlight-profile-empty rounded-[1.75rem] border border-dashed border-slate-300 p-8 text-sm text-slate-500 backdrop-blur-2xl dark:border-white/10 dark:text-slate-300">
            No content available for this tab.
          </div>
        ) : null}
      </motion.section>

      {hasMore ? <div ref={sentinelRef} className="h-8" /> : null}
      {loadingMore ? (
        <div className="spotlight-profile-empty rounded-[1.75rem] border border-white/70 p-6 text-sm text-slate-500 backdrop-blur-2xl dark:border-white/10 dark:text-slate-300">
          Loading more...
        </div>
      ) : null}
    </motion.div>
  );

  return (
    <>
      <SpotlightShell
        profileLink={profileLink}
        onMessagesClick={isSelf ? undefined : () => void openMessageThread()}
        messagesActive={messageOpen}
        onNotificationsClick={openNotificationsCard}
        notificationsActive={utilitySheet === 'notifications'}
        notificationsBadgeCount={unreadNotificationCount}
        onMoreClick={openMoreCard}
        moreActive={utilitySheet === 'more'}
      >
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

      <SpotlightUtilitySheet
        open={utilitySheet === 'notifications'}
        variant="notifications"
        onClose={() => setUtilitySheet(null)}
      />

      <SpotlightUtilitySheet
        open={utilitySheet === 'more'}
        variant="more"
        onClose={() => setUtilitySheet(null)}
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

function ProfileTile({
  item,
  index,
  onClick,
  onOpenVideo,
  onDelete,
  onToggleVisibility,
  compactDensity,
  reducedMotion,
  isOwner = false,
  busy = false
}: {
  item: SpotlightItem;
  index: number;
  onClick: () => void;
  onOpenVideo: (item: SpotlightItem) => void;
  onDelete: (item: SpotlightItem) => void;
  onToggleVisibility: (item: SpotlightItem) => void;
  compactDensity: boolean;
  reducedMotion: boolean;
  isOwner?: boolean;
  busy?: boolean;
}) {
  const isText = String(item.media_url || '').startsWith('data:image/svg+xml');
  const isVideo = item.media_type === 'video';
  const [menuOpen, setMenuOpen] = useState(false);
  const lift = reducedMotion ? 0 : compactDensity ? 2 : 4;
  const enterOffset = reducedMotion ? 8 : 18;
  const transitionDuration = reducedMotion ? 0.01 : 0.24;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: enterOffset, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{ duration: transitionDuration, ease: 'easeOut', delay: reducedMotion ? 0 : Math.min(index * 0.04 * (compactDensity ? 0.75 : 1), 0.24) }}
      whileHover={reducedMotion ? undefined : { y: -lift, scale: 1.01 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      onClick={() => {
        setMenuOpen(false);
        onClick();
      }}
      className={`spotlight-profile-tile group relative cursor-pointer overflow-hidden rounded-[1.55rem] border border-white/15 bg-white/70 text-left shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-[16px] transition duration-200 ease-out hover:shadow-[0_18px_50px_rgba(0,0,0,0.16)] dark:border-white/10 dark:bg-white/[0.06] ${compactDensity ? 'spotlight-profile-tile--compact' : ''}`}
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-white/5">
        {isText ? (
          <SpotlightTextCard
            caption={item.caption}
            variant="tile"
            className="h-full w-full rounded-none"
          />
        ) : (
          <img
            src={isVideo ? (item.thumbnail_url || item.media_url) : item.media_url}
            alt={item.caption || 'Media'}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        )}

        {isText ? null : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <div className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                {isVideo ? 'Video' : 'Photo'}
              </div>
              {item.status !== 'published' ? (
                <div className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-md">
                  {item.status === 'draft' ? 'Draft' : 'Hidden'}
                </div>
              ) : null}
            </div>
          </>
        )}

        {isVideo ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenVideo(item);
            }}
            className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/20"
          >
            View video
          </button>
        ) : null}

        {isOwner ? (
          <div className="absolute right-3 top-3 z-20">
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((current) => !current);
              }}
              className="rounded-full border border-white/20 bg-black/35 p-2 text-white backdrop-blur-xl transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Open post actions"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M5 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" /></svg>
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 top-11 w-44 overflow-hidden rounded-[1.1rem] border border-white/70 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#09111d]/95"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onToggleVisibility(item);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {item.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onDelete(item);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {busy ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/35 text-white backdrop-blur-sm">
            <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">Updating</div>
          </div>
        ) : null}
      </div>

      <div className="hidden space-y-1 p-3 sm:block">
        {isText ? (
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{formatTimeAgo(item.published_at || item.created_at)}</span>
            <span>{compact(item.metrics.likes)} likes</span>
          </div>
        ) : (
          <>
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.caption || 'Untitled Spotlight content'}</p>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{formatTimeAgo(item.published_at || item.created_at)}</span>
              <span>{compact(item.metrics.likes)} likes</span>
            </div>
          </>
        )}
      </div>
    </motion.article>
  );
}

export default SpotlightProfilePage;



