import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BlueTickBadge from './BlueTickBadge';
import {
  buildSpotlightProfileForm,
  compactSpotlightNumber,
  normalizeSpotlightUsernameInput,
  safeSpotlightAvatar,
  SpotlightAvatarImage,
  SpotlightPinnedSpotlightSection,
  SpotlightProfileEditorOverlay,
  SpotlightProfileHeaderCard,
  SpotlightProfileMediaGrid,
  SpotlightProfileTabBar,
  SpotlightProfileTimelineList,
  type SpotlightProfileFormState,
  type SpotlightProfileTab,
  type UsernameStateKind
} from './SpotlightProfileShared';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { uploadService } from '../../services/uploadService';
import {
  spotlightService,
  type SpotlightCreator,
  type SpotlightItem,
  type SpotlightProfileResponse
} from '../../services/spotlightService';
import { auth } from '../../firebase';

const resolveSpotlightViewerFirebaseUid = (userId?: string | null) => {
  const authUid = String(auth.currentUser?.uid || '').trim();
  if (authUid) return authUid;
  const fallbackUid = String(userId || '').trim();
  return fallbackUid && fallbackUid !== 'local-user' ? fallbackUid : '';
};

type PeopleTab = 'followers' | 'following';

type SpotlightProfileCardModalProps = {
  open: boolean;
  username: string | null;
  onClose: () => void;
  onOpenItem: (item: SpotlightItem) => void;
  onOpenMessage: (creator: SpotlightCreator) => void;
  onBlocked?: () => void;
};

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
          className="spotlight-modal spotlight-profile-sheet absolute inset-0 z-20 flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="spotlight-profile-panel w-full overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/96 text-white shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-3xl sm:max-w-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Spotlight social</p>
                <h3 className="text-lg font-black text-white">{title}</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:-translate-y-0.5 hover:bg-white/15">
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
                  <SpotlightAvatarImage src={safeSpotlightAvatar(person.avatar_url)} alt={person.name} className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{person.name}</p>
                      {person.is_verified ? <BlueTickBadge className="h-4 w-4" /> : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {compactSpotlightNumber(person.followers_count)} followers / {compactSpotlightNumber(person.following_count)} following
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {person.firebase_uid !== viewerFirebaseUid ? (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(person)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${person.is_following ? 'border border-white/50 bg-slate-950 text-white dark:border-white/10 dark:bg-white dark:text-slate-950' : 'bg-[linear-gradient(135deg,#111111_0%,#7c2d12_52%,#ea580c_100%)] text-white hover:brightness-110'}`}
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
  const navigate = useNavigate();
  const { user, openAuthModal, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const [tab, setTab] = useState<SpotlightProfileTab>('posts');
  const [payload, setPayload] = useState<SpotlightProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
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
  const viewerFirebaseUid = useMemo(() => resolveSpotlightViewerFirebaseUid(user?.id), [user?.id]);

  const profile = payload?.profile || null;
  const isSelf = Boolean(payload?.is_self);
  const isFollowing = Boolean(payload?.is_following);
  const followsYou = Boolean(payload?.follows_you);
  const items = payload?.items || [];
  const counts = payload?.counts || { posts: 0, media: 0, likes: 0, saved: 0 };
  const pinnedItem = payload?.pinned_item || null;
  const profileLookupKey = payload?.profile?.id || payload?.profile?.firebase_uid || payload?.profile?.username || username;

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

  const fetchProfile = useCallback(async (lookupKey: string, nextTab: SpotlightProfileTab) => (
    await spotlightService.getProfile(lookupKey, {
      tab: nextTab,
      limit: nextTab === 'media' ? 18 : 12,
      viewerFirebaseUid: viewerFirebaseUid || undefined
    })
  ), [viewerFirebaseUid]);

  const loadProfile = useCallback(async (lookupKey = profileLookupKey, nextTab = tab) => {
    if (!open || !lookupKey) return null;
    setLoading(true);
    try {
      const nextPayload = await fetchProfile(lookupKey, nextTab);
      setPayload(nextPayload);
      if (!editorOpen) {
        syncProfileEditor(nextPayload);
      }
      return nextPayload;
    } catch (error: any) {
      showNotification(error?.message || 'Unable to load Spotlight profile.');
      setPayload(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [editorOpen, fetchProfile, open, profileLookupKey, showNotification, syncProfileEditor, tab]);

  useEffect(() => {
    if (!open) {
      setPayload(null);
      setTab('posts');
      setPeopleTab(null);
      setPeople([]);
      setPeopleLoading(false);
      setMoreOpen(false);
      setEditorOpen(false);
      setSavingProfile(false);
      setPinOptions([]);
      setPinOptionsLoading(false);
      syncProfileEditor(null);
      return;
    }
    void loadProfile();
  }, [loadProfile, open, syncProfileEditor]);

  useEffect(() => {
    if (!isSelf && (tab === 'likes' || tab === 'saved')) {
      setTab('posts');
    }
  }, [isSelf, tab]);

  useEffect(() => {
    if (!open || !peopleTab || !profileLookupKey) {
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
  }, [open, peopleTab, profileLookupKey, showNotification, viewerFirebaseUid]);

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
      if (!cancelled) {
        setPinOptions(response?.items || []);
      }
    }).catch(() => {
      if (!cancelled) {
        setPinOptions([]);
      }
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
    setMoreOpen(false);
    onOpenMessage(creatorTarget);
  }, [creatorTarget, onOpenMessage, openAuthModal, user]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${encodeURIComponent(profile.username || profile.firebase_uid || username || profile.name)}`);
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
      showNotification('User report submitted.');
      setMoreOpen(false);
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

      const refreshedPayload = await fetchProfile(updatedProfile.id || updatedProfile.firebase_uid || updatedProfile.username || profileLookupKey || username || profile.firebase_uid, tab);
      setPayload(refreshedPayload);
      syncProfileEditor(refreshedPayload);
      setEditorOpen(false);
      showNotification('Spotlight profile updated.');
    } catch (error: any) {
      showNotification(error?.message || 'Unable to update Spotlight profile.');
    } finally {
      setSavingProfile(false);
    }
  }, [avatarFile, bannerFile, fetchProfile, openAuthModal, profile, profile?.firebase_uid, profileForm.avatar_url, profileForm.banner_url, profileForm.bio, profileForm.city, profileForm.country, profileForm.name, profileForm.pinned_content_id, profileForm.username, profileForm.website_url, profileLookupKey, showNotification, syncProfileEditor, tab, updateUser, user, username, usernameState.kind, usernameState.message]);

  const handleOpenItem = useCallback((item: SpotlightItem) => {
    onClose();
    onOpenItem(item);
  }, [onClose, onOpenItem]);

  const emptyMessage = tab === 'media'
    ? 'No media available for this profile yet.'
    : tab === 'likes'
      ? 'No liked posts to show yet.'
      : tab === 'saved'
        ? 'No saved posts to show yet.'
        : 'No Spotlight posts available yet.';
  const visibleItems = (!isSelf && (tab === 'likes' || tab === 'saved')) ? [] : items;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 26, scale: 0.97 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[1.55rem] border border-white/10 bg-slate-950/96 text-white shadow-[0_28px_80px_rgba(0,0,0,0.52)] backdrop-blur-[28px] sm:rounded-[2.4rem]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-amber-400/18 blur-3xl" />
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-orange-500/16 blur-3xl" />
              <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-rose-500/12 blur-3xl" />
            </div>

            <div className="relative border-b border-white/10 px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Prime identity</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">Spotlight profile card</h2>
                </div>
                <div className="flex items-center gap-2">
                  {profile ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/profile/${encodeURIComponent(isSelf ? 'me' : (profile.id || username || profile.firebase_uid || profile.username || profile.name))}`);
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Open page
                    </button>
                  ) : null}
                  <button onClick={onClose} className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {loading && !payload ? (
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="h-64 animate-pulse rounded-[2rem] bg-white/5" />
                  <div className="h-20 animate-pulse rounded-[1.7rem] bg-white/5" />
                  <div className="h-72 animate-pulse rounded-[1.8rem] bg-white/5" />
                </div>
              ) : null}

              {!loading && !payload ? (
                <div className="p-6 text-center text-sm text-slate-300">
                  Profile not found.
                </div>
              ) : null}

              {payload && profile ? (
                <div className="space-y-4 p-3 sm:space-y-5 sm:p-6">
                  <SpotlightProfileHeaderCard
                    surface="dark"
                    profile={profile}
                    counts={counts}
                    isSelf={isSelf}
                    isFollowing={isFollowing}
                    followsYou={followsYou}
                    followersPreview={payload.followers_preview || []}
                    followingPreview={payload.following_preview || []}
                    moreOpen={moreOpen}
                    onOpenFollowers={() => setPeopleTab('followers')}
                    onOpenFollowing={() => setPeopleTab('following')}
                    onEdit={isSelf ? handleOpenEditor : undefined}
                    onCreate={isSelf ? () => {
                      onClose();
                      navigate('/spotlight/create');
                    } : undefined}
                    onShare={handleShare}
                    onToggleFollow={!isSelf ? () => void handleToggleFollow(creatorTarget) : undefined}
                    onMessage={!isSelf ? handleMessage : undefined}
                    onToggleMore={!isSelf ? () => setMoreOpen((current) => !current) : undefined}
                    onRestrict={!isSelf ? () => void handleRestrict() : undefined}
                    onReport={!isSelf ? () => void handleReportUser() : undefined}
                    onBlock={!isSelf ? () => void handleBlock() : undefined}
                  />

                  <SpotlightPinnedSpotlightSection
                    surface="dark"
                    pinnedItem={pinnedItem}
                    isSelf={isSelf}
                    onOpenItem={handleOpenItem}
                    onEditProfile={isSelf ? handleOpenEditor : undefined}
                  />

                  <SpotlightProfileTabBar
                    surface="dark"
                    activeTab={tab}
                    isSelf={isSelf}
                    onTabChange={setTab}
                  />

                  {tab === 'media' || tab === 'saved' ? (
                    <SpotlightProfileMediaGrid
                      surface="dark"
                      items={visibleItems}
                      pinnedItemId={pinnedItem?.id}
                      emptyMessage={emptyMessage}
                      compact={tab === 'saved'}
                      onOpenItem={handleOpenItem}
                    />
                  ) : (
                    <SpotlightProfileTimelineList
                      surface="dark"
                      items={visibleItems}
                      pinnedItemId={pinnedItem?.id}
                      emptyMessage={emptyMessage}
                      onOpenItem={handleOpenItem}
                    />
                  )}
                </div>
              ) : null}
            </div>

            <PeopleSheet
              open={Boolean(peopleTab)}
              title={peopleTab === 'following' ? 'Following' : 'Followers'}
              people={people}
              loading={peopleLoading}
              viewerFirebaseUid={viewerFirebaseUid || null}
              onClose={() => setPeopleTab(null)}
              onToggleFollow={(creator) => void handleToggleFollow(creator)}
              onOpenMessage={onOpenMessage}
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SpotlightProfileCardModal;
