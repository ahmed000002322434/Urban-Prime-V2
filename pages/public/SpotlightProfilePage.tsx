import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BlueTickBadge from '../../components/spotlight/BlueTickBadge';
import SpotlightCommerceBridge from '../../components/spotlight/SpotlightCommerceBridge';
import SpotlightMessageDrawer from '../../components/spotlight/SpotlightMessageDrawer';
import SpotlightShell from '../../components/spotlight/SpotlightShell';
import SpotlightUtilitySheet from '../../components/spotlight/SpotlightUtilitySheet';
import {
  buildSpotlightProfileForm,
  compactSpotlightNumber,
  normalizeSpotlightUsernameInput,
  PROFILE_TABS,
  TAB_LABELS,
  safeSpotlightAvatar,
  SpotlightAvatarImage,
  SpotlightPinnedSpotlightSection,
  SpotlightProfileEditorOverlay,
  SpotlightProfileMediaGrid,
  SpotlightProfileTimelineList,
  type SpotlightProfileFormState,
  type SpotlightProfileTab,
  type UsernameStateKind
} from '../../components/spotlight/SpotlightProfileShared';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import {
  spotlightService,
  type SpotlightCreator,
  type SpotlightItem,
  type SpotlightProfileResponse,
  type SpotlightProductLink
} from '../../services/spotlightService';
import { uploadService } from '../../services/uploadService';
import { auth } from '../../firebase';

const resolveSpotlightViewerFirebaseUid = (userId?: string | null) => {
  const authUid = String(auth.currentUser?.uid || '').trim();
  if (authUid) return authUid;
  const fallbackUid = String(userId || '').trim();
  return fallbackUid && fallbackUid !== 'local-user' ? fallbackUid : '';
};

type PeopleTab = 'followers' | 'following';
type UtilitySheetKind = 'notifications' | 'more' | null;
type MessageTarget = {
  id: string;
  name: string;
  avatar_url?: string | null;
  firebase_uid?: string | null;
};
type LinkedPublicProfile = Awaited<ReturnType<typeof itemService.getPublicProfile>>;

function PeopleSheet({
  open,
  title,
  people,
  loading,
  viewerFirebaseUid,
  onClose,
  onToggleFollow,
  onOpenMessage
}: {
  open: boolean;
  title: string;
  people: SpotlightCreator[];
  loading: boolean;
  viewerFirebaseUid?: string | null;
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
          className="spotlight-modal spotlight-profile-sheet fixed inset-0 z-[95] flex items-end bg-black/72 p-0 backdrop-blur-xl sm:items-center sm:justify-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="w-full overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/96 text-white shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-3xl sm:max-w-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Spotlight social</p>
                <h3 className="text-lg font-black text-white">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                aria-label="Close people sheet"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              {loading ? (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">
                  Loading people...
                </div>
              ) : null}
              {!loading && people.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">
                  No people to show yet.
                </div>
              ) : null}
              {!loading ? people.map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-xl">
                  <SpotlightAvatarImage src={safeSpotlightAvatar(person.avatar_url)} alt={person.name} className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{person.name}</p>
                      {person.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                    </div>
                    <p className="text-xs text-slate-400">
                      {compactSpotlightNumber(person.followers_count)} followers / {compactSpotlightNumber(person.following_count)} following
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {person.firebase_uid !== viewerFirebaseUid ? (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(person)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${person.is_following ? 'border border-white/10 bg-white text-slate-950' : 'bg-[linear-gradient(135deg,#111111_0%,#7c2d12_52%,#ea580c_100%)] text-white hover:brightness-110'}`}
                      >
                        {person.is_following ? 'Following' : 'Follow'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenMessage(person)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
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

const SpotlightProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const normalizedUsername = useMemo(() => String(username || '').trim(), [username]);
  const isSelfRoute = useMemo(() => normalizedUsername.toLowerCase() === 'me', [normalizedUsername]);
  const viewerFirebaseUid = useMemo(() => resolveSpotlightViewerFirebaseUid(user?.id), [user?.id]);
  const requestedProfileKey = useMemo(() => {
    if (!isSelfRoute) return normalizedUsername;
    return 'me';
  }, [isSelfRoute, normalizedUsername]);

  const [activeTab, setActiveTab] = useState<SpotlightProfileTab>('posts');
  const [payload, setPayload] = useState<SpotlightProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [peopleTab, setPeopleTab] = useState<PeopleTab | null>(null);
  const [people, setPeople] = useState<SpotlightCreator[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<SpotlightProfileFormState>(buildSpotlightProfileForm(null));
  const [usernameState, setUsernameState] = useState<{ kind: UsernameStateKind; message: string }>({
    kind: 'idle',
    message: 'Claim a unique public handle.'
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [pinOptions, setPinOptions] = useState<SpotlightItem[]>([]);
  const [pinOptionsLoading, setPinOptionsLoading] = useState(false);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null);
  const [utilitySheet, setUtilitySheet] = useState<UtilitySheetKind>(null);
  const [linkedProfile, setLinkedProfile] = useState<LinkedPublicProfile>(null);
  const [linkedProfileLoading, setLinkedProfileLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const profile = payload?.profile || null;
  const isSelf = Boolean(payload?.is_self);
  const isFollowing = Boolean(payload?.is_following);
  const followsYou = Boolean(payload?.follows_you);
  const counts = payload?.counts || { posts: 0, media: 0, likes: 0, saved: 0 };
  const items = payload?.items || [];
  const pinnedItem = payload?.pinned_item || null;
  const profileLookupKey = payload?.profile?.id || payload?.profile?.firebase_uid || payload?.profile?.username || requestedProfileKey;

  const creatorTarget = useMemo<SpotlightCreator | null>(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      firebase_uid: profile.firebase_uid,
      name: profile.name,
      avatar_url: profile.avatar_url,
      username: profile.username,
      is_verified: profile.is_verified,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      posts_count: profile.posts_count,
      reels_count: profile.reels_count,
      is_following: payload?.is_following
    };
  }, [payload?.is_following, profile]);

  const linkedUser = linkedProfile?.user as any;
  const linkedStore = linkedProfile?.store as any;
  const linkedItems = linkedProfile?.items || [];

  const shellProfileLink = useMemo(() => {
    const candidate = isSelf ? 'me' : (profile?.id || profile?.username || normalizedUsername || 'me');
    return `/profile/${encodeURIComponent(candidate)}`;
  }, [isSelf, normalizedUsername, profile?.id, profile?.username]);

  const syncProfileEditor = useCallback((nextPayload: SpotlightProfileResponse | null) => {
    const nextForm = buildSpotlightProfileForm(nextPayload?.profile || null, nextPayload?.pinned_item?.id || null);
    setProfileForm(nextForm);
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(nextForm.avatar_url);
    setBannerPreview(nextForm.banner_url);
    setUsernameState({
      kind: nextForm.username ? 'current' : 'idle',
      message: nextForm.username ? 'This is your current username.' : 'Claim a unique public handle.'
    });
  }, []);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => () => {
    if (bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview]);

  const fetchProfile = useCallback(async (
    lookupKey: string,
    nextTab: SpotlightProfileTab,
    cursor?: string | null
  ) => (
    await spotlightService.getProfile(lookupKey, {
      tab: nextTab,
      cursor: cursor || undefined,
      limit: nextTab === 'media' || nextTab === 'saved' ? 18 : 12,
      viewerFirebaseUid: viewerFirebaseUid || undefined
    })
  ), [viewerFirebaseUid]);

  const loadProfile = useCallback(async (lookupKey: string, nextTab: SpotlightProfileTab) => {
    if (!lookupKey) {
      setPayload(null);
      setLoadError('Spotlight profile not found.');
      setIsLoading(false);
      return null;
    }
    if (isSelfRoute && !isAuthenticated) {
      setPayload(null);
      setLoadError('Sign in to view your Spotlight profile.');
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const nextPayload = await fetchProfile(lookupKey, nextTab);
      setPayload(nextPayload);
      if (!editorOpen) {
        syncProfileEditor(nextPayload);
      }
      return nextPayload;
    } catch (error: any) {
      setPayload(null);
      setLoadError(error?.message || 'Unable to load this Spotlight profile right now.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [editorOpen, fetchProfile, isAuthenticated, isSelfRoute, syncProfileEditor]);

  useEffect(() => {
    setMoreOpen(false);
    setPeopleTab(null);
    setPeople([]);
    void loadProfile(requestedProfileKey, activeTab);
  }, [activeTab, loadProfile, requestedProfileKey]);

  useEffect(() => {
    if (!isSelf && (activeTab === 'likes' || activeTab === 'saved')) {
      setActiveTab('posts');
    }
  }, [activeTab, isSelf]);

  useEffect(() => {
    if (!peopleTab || !profileLookupKey) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    spotlightService.getProfilePeople(profileLookupKey, {
      tab: peopleTab,
      limit: 120,
      viewerFirebaseUid: viewerFirebaseUid || undefined
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
  }, [peopleTab, profileLookupKey, showNotification, viewerFirebaseUid]);

  useEffect(() => {
    if (!editorOpen || !isSelf || !profileLookupKey) {
      setPinOptions([]);
      setPinOptionsLoading(false);
      return;
    }
    let cancelled = false;
    setPinOptionsLoading(true);
    spotlightService.getProfile(profileLookupKey, {
      tab: 'posts',
      limit: 48,
      viewerFirebaseUid: viewerFirebaseUid || undefined
    }).then((response) => {
      if (!cancelled) setPinOptions(response?.items || []);
    }).catch(() => {
      if (!cancelled) setPinOptions([]);
    }).finally(() => {
      if (!cancelled) setPinOptionsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editorOpen, isSelf, profileLookupKey, viewerFirebaseUid]);

  useEffect(() => {
    if (!editorOpen || !isSelf) return;

    const nextUsername = normalizeSpotlightUsernameInput(profileForm.username);
    const currentUsername = normalizeSpotlightUsernameInput(profile?.username || '');
    if (!nextUsername || nextUsername.length < 3) {
      setUsernameState({ kind: 'invalid', message: 'Username must be at least 3 characters.' });
      return;
    }
    if (nextUsername === currentUsername) {
      setUsernameState({ kind: 'current', message: 'This is your current username.' });
      return;
    }

    let cancelled = false;
    setUsernameState({ kind: 'checking', message: 'Checking username...' });
    const timer = window.setTimeout(() => {
      spotlightService.checkUsernameAvailability(nextUsername)
        .then((response) => {
          if (cancelled) return;
          if (response?.available) {
            setUsernameState({ kind: 'available', message: 'Username is available.' });
          } else {
            setUsernameState({ kind: 'taken', message: response?.reason || 'This username is already taken.' });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUsernameState({ kind: 'idle', message: 'Unable to validate username right now.' });
          }
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editorOpen, isSelf, profile?.username, profileForm.username]);

  useEffect(() => {
    if (!profile?.id) {
      setLinkedProfile(null);
      setLinkedProfileLoading(false);
      return;
    }
    let cancelled = false;
    setLinkedProfileLoading(true);
    itemService.getPublicProfile(profile.id, { publishedOnly: true })
      .then((response) => {
        if (!cancelled) setLinkedProfile(response);
      })
      .catch(() => {
        if (!cancelled) setLinkedProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLinkedProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

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

  const openInboxDrawer = useCallback(() => {
    setMessageTarget(null);
    setMessageDrawerOpen(true);
    setUtilitySheet(null);
  }, []);

  const openMessageDrawerForCreator = useCallback((creator: SpotlightCreator | null) => {
    if (!creator) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    setMessageTarget({
      id: creator.id,
      name: creator.name,
      avatar_url: creator.avatar_url,
      firebase_uid: creator.firebase_uid
    });
    setMessageDrawerOpen(true);
    setMoreOpen(false);
  }, [openAuthModal, user]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${encodeURIComponent(profile.username || profile.firebase_uid || normalizedUsername || profile.name)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.name,
          text: profile.bio || 'Open this Spotlight profile on Urban Prime.',
          url
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      showNotification('Spotlight profile link copied.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        showNotification('Unable to share this Spotlight profile right now.');
      }
    }
  }, [normalizedUsername, profile, showNotification]);

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
      setMoreOpen(false);
      showNotification(`Blocked ${profile.name}.`);
      navigate('/spotlight', { replace: true });
    } catch (error: any) {
      showNotification(error?.message || 'Unable to block user.');
    }
  }, [navigate, openAuthModal, profile, showNotification, user]);

  const handleReportUser = useCallback(async () => {
    if (!profile) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    const reason = window.prompt(`Why are you reporting ${profile.name}?`, 'Harassment or spam');
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) return;
    try {
      await spotlightService.reportUser({
        target_user_id: profile.id,
        target_firebase_uid: profile.firebase_uid,
        reason: trimmedReason
      });
      setMoreOpen(false);
      showNotification('User report submitted.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to report user.');
    }
  }, [openAuthModal, profile, showNotification, user]);

  const handleFormChange = useCallback((field: keyof SpotlightProfileFormState, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleAvatarFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return previewUrl;
    });
    event.target.value = '';
  }, []);

  const handleBannerFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setBannerFile(file);
    setBannerPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return previewUrl;
    });
    event.target.value = '';
  }, []);

  const handleRemoveBanner = useCallback(() => {
    setBannerFile(null);
    setBannerPreview('');
    setProfileForm((current) => ({ ...current, banner_url: '' }));
  }, []);

  const handleOpenEditor = useCallback(() => {
    if (!payload) return;
    syncProfileEditor(payload);
    setMoreOpen(false);
    setEditorOpen(true);
  }, [payload, syncProfileEditor]);

  const handleCloseEditor = useCallback(() => {
    syncProfileEditor(payload);
    setEditorOpen(false);
  }, [payload, syncProfileEditor]);

  const handleSaveProfile = useCallback(async () => {
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    const nextName = profileForm.name.trim();
    const nextUsername = normalizeSpotlightUsernameInput(profileForm.username);
    const nextBio = profileForm.bio.trim();

    if (!nextName) {
      showNotification('Display name is required.');
      return;
    }
    if (!nextUsername || nextUsername.length < 3) {
      showNotification('Username must be at least 3 characters.');
      return;
    }
    if (usernameState.kind === 'taken' || usernameState.kind === 'invalid') {
      showNotification(usernameState.message || 'Choose a different username.');
      return;
    }

    setSavingProfile(true);
    try {
      let avatarUrl = profileForm.avatar_url.trim();
      let bannerUrl = profileForm.banner_url.trim();

      if (avatarFile) {
        const uploadedAvatar = await uploadService.uploadImage({
          file: avatarFile,
          uploadType: 'profile',
          userId: user.id,
          resourceId: 'spotlight-profile-avatar'
        });
        avatarUrl = uploadedAvatar.url;
      }

      if (bannerFile) {
        const uploadedBanner = await uploadService.uploadImage({
          file: bannerFile,
          uploadType: 'spotlight-banner',
          userId: user.id,
          resourceId: 'spotlight-profile-banner'
        });
        bannerUrl = uploadedBanner.url;
      }

      const updatedProfile = await spotlightService.updateMyProfile({
        name: nextName,
        username: nextUsername,
        bio: nextBio,
        website_url: profileForm.website_url.trim() || null,
        city: profileForm.city.trim() || null,
        country: profileForm.country.trim() || null,
        pinned_content_id: profileForm.pinned_content_id || null,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null
      });

      updateUser({
        name: updatedProfile.name,
        avatar: updatedProfile.avatar_url,
        about: updatedProfile.bio
      });

      const nextLookup = updatedProfile.id || updatedProfile.firebase_uid || updatedProfile.username || nextUsername || profileLookupKey || normalizedUsername;
      const refreshedPayload = await fetchProfile(nextLookup, activeTab);
      setPayload(refreshedPayload);
      syncProfileEditor(refreshedPayload);
      setEditorOpen(false);
      if (nextLookup && nextLookup !== normalizedUsername) {
        navigate(`/profile/${encodeURIComponent(nextLookup)}`, { replace: true });
      }
      showNotification('Spotlight profile updated.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update Spotlight profile.');
    } finally {
      setSavingProfile(false);
    }
  }, [activeTab, avatarFile, bannerFile, fetchProfile, navigate, normalizedUsername, openAuthModal, profile, profileForm.avatar_url, profileForm.banner_url, profileForm.bio, profileForm.city, profileForm.country, profileForm.name, profileForm.pinned_content_id, profileForm.username, profileForm.website_url, profileLookupKey, showNotification, syncProfileEditor, updateUser, user, usernameState.kind, usernameState.message]);

  const handleOpenItem = useCallback((item: SpotlightItem) => {
    navigate(`/spotlight/post/${encodeURIComponent(item.id)}`);
  }, [navigate]);

  const handleToggleItemVisibility = useCallback(async (item: SpotlightItem) => {
    if (!profileLookupKey) return;
    setBusyItemId(item.id);
    try {
      const nextStatus = item.status === 'published' ? 'draft' : 'published';
      await spotlightService.updateContent(item.id, { status: nextStatus });
      await loadProfile(profileLookupKey, activeTab);
      showNotification(nextStatus === 'published' ? 'Spotlight published.' : 'Spotlight moved to drafts.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update this Spotlight post.');
    } finally {
      setBusyItemId(null);
    }
  }, [activeTab, loadProfile, profileLookupKey, showNotification]);

  const handleDeleteItem = useCallback(async (item: SpotlightItem) => {
    if (!profileLookupKey) return;
    const confirmed = window.confirm('Delete this Spotlight post? This cannot be undone.');
    if (!confirmed) return;
    setBusyItemId(item.id);
    try {
      await spotlightService.deleteContent(item.id);
      await loadProfile(profileLookupKey, activeTab);
      showNotification('Spotlight deleted.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to delete this Spotlight post.');
    } finally {
      setBusyItemId(null);
    }
  }, [activeTab, loadProfile, profileLookupKey, showNotification]);

  const handleLoadMore = useCallback(async () => {
    if (!payload?.has_more || !payload?.next_cursor || !profileLookupKey) return;
    setLoadingMore(true);
    try {
      const nextPayload = await fetchProfile(profileLookupKey, activeTab, payload.next_cursor);
      setPayload((current) => current ? {
        ...nextPayload,
        items: [...current.items, ...(nextPayload.items || [])]
      } : nextPayload);
    } catch (error: any) {
      showNotification(error?.message || 'Unable to load more Spotlight posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, fetchProfile, payload?.has_more, payload?.next_cursor, profileLookupKey, showNotification]);

  const emptyMessage = activeTab === 'media'
    ? 'No media available for this profile yet.'
    : activeTab === 'likes'
      ? 'No liked posts to show yet.'
      : activeTab === 'saved'
        ? 'No saved posts to show yet.'
        : 'No Spotlight posts available yet.';
  const visibleItems = (!isSelf && (activeTab === 'likes' || activeTab === 'saved')) ? [] : items;
  const canManageVisibleItems = isSelf && (activeTab === 'posts' || activeTab === 'media');

  const commerceEntries = useMemo(() => {
    const sourceItems: SpotlightItem[] = [];
    if (pinnedItem) sourceItems.push(pinnedItem);
    sourceItems.push(...items);

    const seen = new Set<string>();
    const entries: Array<{ item: SpotlightItem; product: SpotlightProductLink }> = [];
    sourceItems.forEach((item) => {
      (item.products || []).forEach((product) => {
        const key = `${item.id}:${product.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ item, product });
      });
    });
    return entries.slice(0, 4);
  }, [items, pinnedItem]);

  const commerceQuickLinks = useMemo(() => {
    const publicProfileLink = profile ? `/user/${encodeURIComponent(profile.id)}` : '/spotlight';
    return [
      { label: 'Spotlight Feed', hint: 'Open discovery', to: '/spotlight' },
      { label: isSelf ? 'Create Post' : 'Public Profile', hint: isSelf ? 'Publish a new Spotlight' : 'Open marketplace identity', to: isSelf ? '/spotlight/create' : publicProfileLink },
      { label: 'Messages', hint: 'Jump to inbox', to: '/messages' },
      { label: 'Notifications', hint: 'Recent activity', to: '/notifications' },
      { label: 'Cart', hint: 'Review your bag', to: '/cart' },
      { label: isSelf ? 'Marketplace' : 'Browse', hint: isSelf ? 'Open your public profile' : 'Explore more products', to: publicProfileLink }
    ];
  }, [isSelf, profile]);
  const visibleTabs = isSelf ? PROFILE_TABS : PROFILE_TABS.filter((tab) => tab === 'posts' || tab === 'media');
  const activeTabLabel = TAB_LABELS[activeTab];
  const activeTabCount = activeTab === 'posts'
    ? counts.posts || profile?.posts_count || 0
    : activeTab === 'media'
      ? counts.media || profile?.reels_count || 0
      : activeTab === 'likes'
        ? counts.likes || 0
        : counts.saved || 0;

  return (
    <SpotlightShell
      profileLink={shellProfileLink}
      onMessagesClick={openInboxDrawer}
      messagesActive={messageDrawerOpen}
      onNotificationsClick={() => setUtilitySheet((current) => current === 'notifications' ? null : 'notifications')}
      notificationsActive={utilitySheet === 'notifications'}
      onMoreClick={() => setUtilitySheet((current) => current === 'more' ? null : 'more')}
      moreActive={utilitySheet === 'more'}
    >
      {isLoading && !payload ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-[2.15rem] border border-white/70 bg-white/70 dark:border-white/10 dark:bg-white/5" />
          <div className="h-20 animate-pulse rounded-[1.7rem] border border-white/70 bg-white/70 dark:border-white/10 dark:bg-white/5" />
          <div className="h-80 animate-pulse rounded-[1.8rem] border border-white/70 bg-white/70 dark:border-white/10 dark:bg-white/5" />
        </div>
      ) : null}

      {!isLoading && (loadError || !payload || !profile) ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/72 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Spotlight profile</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Profile unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {loadError || 'This Spotlight profile could not be loaded.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/spotlight')}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950"
            >
              Back to Spotlight
            </button>
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-full border border-white/70 bg-white/85 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Sign in
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {payload && profile ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] shadow-[0_28px_64px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
              <div className="relative overflow-hidden p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_34%)]" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <SpotlightAvatarImage
                      src={safeSpotlightAvatar(profile.avatar_url)}
                      alt={profile.name}
                      className="h-24 w-24 shrink-0 rounded-[1.75rem] object-cover shadow-[0_16px_36px_rgba(0,0,0,0.28)] sm:h-28 sm:w-28"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Spotlight profile</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-[2rem]">{profile.name}</h1>
                        {profile.is_verified ? <BlueTickBadge className="h-5 w-5" /> : null}
                        {followsYou && !isSelf ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                            Follows you
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-400">@{profile.username || 'spotlight'}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">{profile.bio || 'This creator has not added a profile bio yet.'}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.website_url ? (
                          <a
                            href={profile.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                          >
                            {profile.website_url.replace(/^https?:\/\//, '')}
                          </a>
                        ) : null}
                        {[profile.city, profile.country].filter(Boolean).length > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                            {[profile.city, profile.country].filter(Boolean).join(', ')}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                          {compactSpotlightNumber(counts.posts || profile.posts_count)} spotlight posts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[210px] xl:grid-cols-1">
                    {isSelf ? (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenEditor}
                          className="rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-95"
                        >
                          Edit profile
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/spotlight/create')}
                          className="rounded-full border border-sky-400/30 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(29,78,216,0.94),rgba(56,189,248,0.88))] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
                        >
                          Create spotlight
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShare()}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          Share profile
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleToggleFollow(creatorTarget)}
                          className={`rounded-full px-4 py-3 text-sm font-bold transition ${isFollowing ? 'border border-white/10 bg-white text-slate-950 hover:brightness-95' : 'border border-sky-400/30 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(29,78,216,0.94),rgba(56,189,248,0.88))] text-white hover:brightness-110'}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openMessageDrawerForCreator(creatorTarget)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShare()}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          Share
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoreOpen((current) => !current)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          More
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!isSelf && moreOpen ? (
                  <div className="relative mt-4 grid gap-2 rounded-[1.6rem] border border-white/10 bg-black/26 p-3 sm:grid-cols-3">
                    <button type="button" onClick={() => void handleRestrict()} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">Restrict</button>
                    <button type="button" onClick={() => void handleReportUser()} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/16">Report</button>
                    <button type="button" onClick={() => void handleBlock()} className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/16">Block</button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <button type="button" onClick={() => setPeopleTab('followers')} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Followers</p>
                  <p className="mt-2 text-2xl font-black text-white">{compactSpotlightNumber(profile.followers_count)}</p>
                </button>
                <button type="button" onClick={() => setPeopleTab('following')} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Following</p>
                  <p className="mt-2 text-2xl font-black text-white">{compactSpotlightNumber(profile.following_count)}</p>
                </button>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Posts</p>
                  <p className="mt-2 text-2xl font-black text-white">{compactSpotlightNumber(counts.posts || profile.posts_count)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Media</p>
                  <p className="mt-2 text-2xl font-black text-white">{compactSpotlightNumber(counts.media || profile.reels_count)}</p>
                </div>
              </div>
            </section>

            {pinnedItem ? (
              <SpotlightPinnedSpotlightSection
                surface="dark"
                pinnedItem={pinnedItem}
                isSelf={isSelf}
                onOpenItem={handleOpenItem}
                onEditProfile={isSelf ? handleOpenEditor : undefined}
              />
            ) : null}

            <div className="sticky top-[5.25rem] z-20 rounded-[1.7rem] border border-white/10 bg-black/66 p-2 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <div className="flex flex-wrap gap-2">
                {visibleTabs.map((tab) => {
                  const selected = activeTab === tab;
                  const tabCount = tab === 'posts'
                    ? counts.posts || profile.posts_count || 0
                    : tab === 'media'
                      ? counts.media || profile.reels_count || 0
                      : tab === 'likes'
                        ? counts.likes || 0
                        : counts.saved || 0;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${selected ? 'bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'}`}
                    >
                      <span>{TAB_LABELS[tab]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selected ? 'bg-slate-950/8 text-slate-700' : 'bg-white/[0.06] text-slate-400'}`}>
                        {compactSpotlightNumber(tabCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_48px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Content</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">{activeTabLabel}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                  {compactSpotlightNumber(activeTabCount)} items
                </span>
              </div>

              {activeTab === 'media' || activeTab === 'saved' ? (
                <SpotlightProfileMediaGrid
                  surface="dark"
                  items={visibleItems}
                  pinnedItemId={pinnedItem?.id}
                  emptyMessage={emptyMessage}
                  compact={activeTab === 'saved'}
                  onOpenItem={handleOpenItem}
                  onToggleVisibility={canManageVisibleItems ? handleToggleItemVisibility : undefined}
                  onDelete={canManageVisibleItems ? handleDeleteItem : undefined}
                  busyItemId={busyItemId}
                />
              ) : (
                <SpotlightProfileTimelineList
                  surface="dark"
                  items={visibleItems}
                  pinnedItemId={pinnedItem?.id}
                  emptyMessage={emptyMessage}
                  onOpenItem={handleOpenItem}
                  onToggleVisibility={canManageVisibleItems ? handleToggleItemVisibility : undefined}
                  onDelete={canManageVisibleItems ? handleDeleteItem : undefined}
                  busyItemId={busyItemId}
                />
              )}
            </section>

            {payload.has_more ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_48px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Snapshot</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-slate-400">Handle</p>
                  <p className="mt-2 text-sm font-bold text-white">@{profile.username || 'spotlight'}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-slate-400">Bio</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{profile.bio || 'No bio added yet.'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_48px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Community</p>
                  <h3 className="mt-1 text-lg font-black text-white">People around this profile</h3>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {(payload.followers_preview || []).slice(0, 3).map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-3">
                    <SpotlightAvatarImage src={safeSpotlightAvatar(creator.avatar_url)} alt={creator.name} className="h-11 w-11 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{creator.name}</p>
                      <p className="text-xs text-slate-400">{compactSpotlightNumber(creator.followers_count)} followers</p>
                    </div>
                    <button type="button" onClick={() => setPeopleTab('followers')} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                      View
                    </button>
                  </div>
                ))}
                {(payload.followers_preview || []).length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    Followers and following previews will appear here.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_48px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Connected profile</p>
                  <h3 className="mt-1 text-lg font-black text-white">Marketplace identity</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-300">Linked</span>
              </div>

              {linkedProfileLoading ? (
                <div className="mt-4 space-y-3">
                  <div className="h-16 animate-pulse rounded-[1.35rem] bg-white/10" />
                  <div className="h-20 animate-pulse rounded-[1.35rem] bg-white/10" />
                </div>
              ) : linkedProfile && profile ? (
                <div className="mt-4 space-y-3">
                  <Link
                    to={`/user/${encodeURIComponent(profile.id)}`}
                    className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                  >
                    <SpotlightAvatarImage
                      src={safeSpotlightAvatar(linkedUser?.avatar_url || linkedUser?.avatar || profile.avatar_url)}
                      alt={linkedUser?.name || profile.name}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{linkedUser?.name || profile.name}</p>
                        {profile.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {linkedStore?.name || linkedStore?.storeName || linkedStore?.title || 'Marketplace profile'}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-sky-300">Open marketplace profile</p>
                    </div>
                  </Link>

                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Listings</p>
                      <p className="mt-2 text-lg font-black text-white">{linkedItems.length}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Followers</p>
                      <p className="mt-2 text-lg font-black text-white">{compactSpotlightNumber(profile.followers_count)}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Spotlight</p>
                      <p className="mt-2 text-lg font-black text-white">{compactSpotlightNumber(counts.posts || profile.posts_count)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  No linked marketplace profile data is available right now.
                </div>
              )}
            </section>

            <SpotlightCommerceBridge
              entries={commerceEntries}
              quickLinks={commerceQuickLinks}
              onOpenProduct={(_, product) => navigate(`/item/${encodeURIComponent(product.item_id)}`)}
              onBuyProduct={(_, product) => navigate(`/item/${encodeURIComponent(product.item_id)}`)}
            />
          </aside>
        </div>
      ) : null}

      <PeopleSheet
        open={Boolean(peopleTab)}
        title={peopleTab === 'following' ? 'Following' : 'Followers'}
        people={people}
        loading={peopleLoading}
        viewerFirebaseUid={viewerFirebaseUid || null}
        onClose={() => setPeopleTab(null)}
        onToggleFollow={(creator) => void handleToggleFollow(creator)}
        onOpenMessage={(creator) => openMessageDrawerForCreator(creator)}
      />

      <SpotlightMessageDrawer
        open={messageDrawerOpen}
        target={messageTarget}
        onClose={() => {
          setMessageDrawerOpen(false);
          setMessageTarget(null);
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

      <SpotlightProfileEditorOverlay
        open={editorOpen}
        form={profileForm}
        usernameState={usernameState}
        saving={savingProfile}
        avatarPreview={avatarPreview}
        bannerPreview={bannerPreview}
        pinnedCandidates={pinOptions}
        pinOptionsLoading={pinOptionsLoading}
        onChange={handleFormChange}
        onAvatarFileChange={handleAvatarFileChange}
        onBannerFileChange={handleBannerFileChange}
        onRemoveBanner={handleRemoveBanner}
        onClose={handleCloseEditor}
        onSave={() => void handleSaveProfile()}
      />
    </SpotlightShell>
  );
};

export default SpotlightProfilePage;
