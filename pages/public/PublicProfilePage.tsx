import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { itemService, reelService, userService } from '../../services/itemService';
import {
  spotlightService,
  type SpotlightItem,
  type SpotlightProfile,
  type SpotlightProfileResponse
} from '../../services/spotlightService';
import type { Item, ItemCollection, Reel, Store, User } from '../../types';
import Spinner from '../../components/Spinner';
import VerifiedBadge from '../../components/VerifiedBadge';
import Badge from '../../components/Badge';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import StarRating from '../../components/StarRating';
import LottieAnimation from '../../components/LottieAnimation';
import SpotlightTextCard from '../../components/spotlight/SpotlightTextCard';
import { useUserData } from '../../hooks/useUserData';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';
import { pixeService, type PixeVideo } from '../../services/pixeService';

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <path d="M17.5 6.5h.01" />
  </svg>
);

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.59 13.51 6.83 3.98" />
    <path d="m15.41 6.51-6.82 3.98" />
  </svg>
);

const PostsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const PixesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SpotlightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.65 5.37L20 9.27l-4 3.9.94 5.46L12 15.9l-4.94 2.73.94-5.46-4-3.9 5.35-.9L12 3Z" />
  </svg>
);

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.max(0, value)}`;
};

const formatDateLabel = (value?: string) => {
  if (!value) return 'Recently joined';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently joined';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

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

const normalizeExternalHref = (value: string, type: 'website' | 'instagram' | 'twitter') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (type === 'instagram') return `https://instagram.com/${trimmed.replace(/^@/, '')}`;
  if (type === 'twitter') return `https://x.com/${trimmed.replace(/^@/, '')}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const getSafeWebsite = (user: User, store: Store | null) =>
  store?.socialLinks?.website || (user as User & { website?: string }).website || '';

const isSpotlightText = (item: SpotlightItem) => String(item.media_url || '').startsWith('data:image/svg+xml');

const AffiliateTierBadge: React.FC<{ tier: 'bronze' | 'silver' | 'gold' }> = ({ tier }) => {
  const classMap = {
    bronze: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
    silver: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
    gold: 'bg-amber-500/14 text-amber-700 dark:text-amber-300'
  };

  return (
    <span className={`rounded-full px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.2em] ${classMap[tier]}`}>
      {tier} affiliate
    </span>
  );
};

const PublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { badges: allBadgesData } = useUserData();
  const { user: loggedInUser, isAuthenticated, openAuthModal } = useAuth();
  const { showNotification } = useNotification();

  const [profile, setProfile] = useState<{ user: User; items: Item[]; store: Store | null } | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [pixeVideos, setPixeVideos] = useState<PixeVideo[]>([]);
  const [collections, setCollections] = useState<ItemCollection[]>([]);
  const [spotlightPayload, setSpotlightPayload] = useState<SpotlightProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'pixes'>('posts');
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);

    const loadProfile = async () => {
      const [
        profileRes,
        collectionsRes,
        reelsRes,
        reviewsRes,
        spotlightRes,
        pixeRes
      ] = await Promise.allSettled([
        userService.getPublicProfile(id, { publishedOnly: true }),
        userService.getPublicCollectionsForUser(id),
        reelService.getReelsByCreator(id),
        itemService.getReviewsForOwner(id),
        spotlightService.getProfile(id, {
          tab: 'posts',
          limit: 6,
          viewerFirebaseUid: loggedInUser?.id
        }),
        pixeService.getProfileVideos(id)
      ]);

      if (profileRes.status !== 'fulfilled' || !profileRes.value) {
        setProfile(null);
        setLoadError('Unable to load this profile right now.');
        setIsLoading(false);
        return;
      }

      const profileData = profileRes.value;
      const collectionsData = collectionsRes.status === 'fulfilled' ? collectionsRes.value : [];
      const reelsData = reelsRes.status === 'fulfilled' ? reelsRes.value : [];
      const reviewsData = reviewsRes.status === 'fulfilled' ? reviewsRes.value : [];
      const spotlightData = spotlightRes.status === 'fulfilled' ? spotlightRes.value : null;
      const pixeData = pixeRes.status === 'fulfilled' ? pixeRes.value : null;

      const safeUser: User = {
        ...profileData.user,
        avatar: profileData.user.avatar || '/icons/urbanprime.svg',
        badges: Array.isArray(profileData.user.badges) ? profileData.user.badges : [],
        following: Array.isArray(profileData.user.following) ? profileData.user.following : [],
        followers: Array.isArray(profileData.user.followers) ? profileData.user.followers : [],
        wishlist: Array.isArray(profileData.user.wishlist) ? profileData.user.wishlist : [],
        cart: Array.isArray(profileData.user.cart) ? profileData.user.cart : []
      };

      setProfile({ ...profileData, user: safeUser });
      setCollections(collectionsData);
      setReels(reelsData);
      setPixeVideos(pixeData?.videos || []);
      setSpotlightPayload(spotlightData);
      setFollowersCount(spotlightData?.profile?.followers_count ?? safeUser.followers.length);
      setIsFollowing(
        spotlightData?.is_following ??
        Boolean(loggedInUser && (loggedInUser.following || []).includes(safeUser.id))
      );
      setTotalReviews(reviewsData.length);
      setAverageRating(
        reviewsData.length > 0
          ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length
          : 0
      );
      setIsLoading(false);
    };

    void loadProfile().catch((error) => {
      console.error(error);
      setLoadError('Unable to load this profile right now.');
      setIsLoading(false);
    });
  }, [id, loggedInUser]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !loggedInUser || !profile) {
      openAuthModal('login');
      return;
    }

    if (spotlightPayload?.profile?.firebase_uid) {
      try {
        const result = await spotlightService.followCreator(spotlightPayload.profile.firebase_uid);
        setSpotlightPayload((current) => {
          if (!current) return current;
          const delta = result?.following ? 1 : -1;
          return {
            ...current,
            is_following: Boolean(result?.following),
            profile: {
              ...current.profile,
              followers_count: Math.max(0, Number(current.profile.followers_count || 0) + delta)
            }
          };
        });
        setIsFollowing(Boolean(result?.following));
        return;
      } catch (error) {
        console.warn('Spotlight follow failed, falling back to marketplace follow.', error);
      }
    }

    await userService.toggleFollow(loggedInUser.id, profile.user.id);
    setIsFollowing((current) => {
      const next = !current;
      setFollowersCount((count) => count + (next ? 1 : -1));
      return next;
    });
  };

  const handleShareProfile = async (shareUrl: string, shareTitle: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: `View ${shareTitle} on Urban Prime`,
          url: shareUrl
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Profile link copied.');
        return;
      }

      throw new Error('Sharing is not supported on this browser.');
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        showNotification('Unable to share this profile right now.');
      }
    }
  };

  const featuredCollections = useMemo(
    () => collections.filter((collection) => collection.isShopTheLook).slice(0, 2),
    [collections]
  );

  if (isLoading) {
    return <Spinner size="lg" className="mt-20" />;
  }

  if (loadError) {
    return (
      <div className="py-20 text-center text-text-secondary">
        <LottieAnimation src={uiLottieAnimations.noFileFound} className="mx-auto h-44 w-44" loop autoplay />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <LottieAnimation src={uiLottieAnimations.noFileFound} className="mx-auto h-44 w-44" loop autoplay />
        <p>User not found.</p>
      </div>
    );
  }

  const { user, items, store } = profile;
  const spotlightProfile: SpotlightProfile | null = spotlightPayload?.profile || null;
  const spotlightItems = spotlightPayload?.items || [];
  const spotlightRoute = spotlightProfile
    ? `/profile/${encodeURIComponent(spotlightProfile.firebase_uid || spotlightProfile.username || user.id)}`
    : null;
  const resolvedUsername = spotlightProfile?.username || user.id;
  const resolvedBio =
    spotlightProfile?.bio ||
    spotlightProfile?.about ||
    user.about ||
    user.businessDescription ||
    'This profile has not added a public bio yet.';
  const displayName = user.businessName || spotlightProfile?.name || user.name;
  const displayedFollowersCount = spotlightProfile?.followers_count ?? followersCount;
  const displayedFollowingCount = spotlightProfile?.following_count ?? (user.following || []).length;
  const displayedSpotlightCount = spotlightPayload?.counts?.posts ?? spotlightProfile?.posts_count ?? 0;
  const displayedSpotlightMediaCount = spotlightPayload?.counts?.media ?? spotlightProfile?.reels_count ?? 0;
  const userBadges = allBadgesData.filter((badge) => (user.badges || []).includes(badge.id));
  const isOwnProfile = isAuthenticated && loggedInUser?.id === user.id;
  const websiteHref = getSafeWebsite(user, store);
  const shareUrl = `${window.location.origin}/user/${encodeURIComponent(user.id)}`;
  const socialLinks = [
    { label: 'Website', href: normalizeExternalHref(websiteHref, 'website'), icon: <GlobeIcon /> },
    { label: 'Instagram', href: normalizeExternalHref(store?.socialLinks?.instagram || '', 'instagram'), icon: <InstagramIcon /> },
    { label: 'Twitter', href: normalizeExternalHref(store?.socialLinks?.twitter || '', 'twitter'), icon: <TwitterIcon /> }
  ].filter((entry) => entry.href);
  const stats = [
    { label: 'Listings', value: formatCount(items.length), icon: <PostsIcon /> },
    { label: 'Pixes', value: formatCount(pixeVideos.length || reels.length), icon: <PixesIcon /> },
    { label: spotlightProfile ? 'Spotlight' : 'Collections', value: formatCount(spotlightProfile ? displayedSpotlightCount : collections.length), icon: <SpotlightIcon /> },
    { label: 'Followers', value: formatCount(displayedFollowersCount), icon: <ShareIcon /> }
  ];

  return (
    <>
      {quickViewItem ? <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} /> : null}

      <div className="min-h-screen bg-background pb-14 text-text-primary">
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:p-7">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/18 via-primary/8 to-transparent" />
                <div className="relative flex flex-col gap-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <img
                      src={user.avatar || '/icons/urbanprime.svg'}
                      alt={displayName}
                      className="h-24 w-24 rounded-[1.6rem] border border-border object-cover shadow-soft sm:h-28 sm:w-28"
                      onError={(event) => {
                        event.currentTarget.src = '/icons/urbanprime.svg';
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.22em] text-text-secondary">
                          Public profile
                        </span>
                        {spotlightProfile ? (
                          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.22em] text-primary">
                            Spotlight connected
                          </span>
                        ) : null}
                        {user.affiliateTier ? <AffiliateTierBadge tier={user.affiliateTier} /> : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <h1 className="min-w-0 text-3xl font-black tracking-[-0.04em] text-text-primary sm:text-[2.6rem]">
                          {displayName}
                        </h1>
                        {user.verificationLevel ? <VerifiedBadge type="user" level={user.verificationLevel} className="shrink-0" /> : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                        <span className="font-semibold text-primary">@{resolvedUsername}</span>
                        <span>Member since {formatDateLabel(user.memberSince)}</span>
                        {user.yearsInBusiness ? <span>{user.yearsInBusiness} years in business</span> : null}
                        {spotlightProfile?.is_verified ? <span>Spotlight verified</span> : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-text-primary">
                          <StarRating rating={averageRating} size="sm" />
                          <span>{averageRating.toFixed(1)} rating</span>
                          <span className="text-text-secondary">/</span>
                          <span>{totalReviews} reviews</span>
                        </div>
                        {store ? (
                          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-text-secondary">
                            {store.name}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-5 max-w-3xl text-sm leading-7 text-text-secondary sm:text-[0.96rem]">
                        {resolvedBio}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {isOwnProfile ? (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate('/profile/settings')}
                          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                        >
                          Edit profile
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShareProfile(shareUrl, displayName)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
                        >
                          <ShareIcon />
                          <span>Share profile</span>
                        </button>
                        {store ? (
                          <Link
                            to="/store/edit"
                            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
                          >
                            Edit store
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleFollowToggle()}
                          className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition ${
                            isFollowing
                              ? 'border border-border bg-background text-text-primary hover:border-primary/30 hover:text-primary'
                              : 'bg-primary text-white hover:brightness-110'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <Link
                          to={`/profile/messages?sellerId=${encodeURIComponent(user.id)}`}
                          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
                        >
                          Message
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleShareProfile(shareUrl, displayName)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
                        >
                          <ShareIcon />
                          <span>Share profile</span>
                        </button>
                        {store ? (
                          <Link
                            to={`/store/${store.slug}`}
                            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
                          >
                            View store
                          </Link>
                        ) : null}
                        {spotlightRoute ? (
                          <Link
                            to={spotlightRoute}
                            className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
                          >
                            Open Spotlight
                          </Link>
                        ) : null}
                      </>
                    )}
                  </div>

                  {socialLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((entry) => (
                        <a
                          key={entry.label}
                          href={entry.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary"
                        >
                          {entry.icon}
                          <span>{entry.label}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-soft">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Profile pulse</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {stats.map((stat) => (
                      <div key={stat.label} className="rounded-[1.35rem] border border-border bg-surface-soft p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-text-secondary">{stat.icon}</span>
                          <p className="text-2xl font-black text-text-primary">{stat.value}</p>
                        </div>
                        <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-soft">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Highlights</p>
                  <div className="mt-4 space-y-3 text-sm text-text-secondary">
                    <div className="rounded-[1.25rem] border border-border bg-surface-soft px-4 py-3">
                      <span className="font-semibold text-text-primary">Location:</span> {user.city || 'Flexible'}{user.country ? `, ${user.country}` : ''}
                    </div>
                    <div className="rounded-[1.25rem] border border-border bg-surface-soft px-4 py-3">
                      <span className="font-semibold text-text-primary">Collections:</span> {collections.length} public collections available
                    </div>
                    <div className="rounded-[1.25rem] border border-border bg-surface-soft px-4 py-3">
                      <span className="font-semibold text-text-primary">Following:</span> {formatCount(displayedFollowingCount)} accounts
                    </div>
                    {spotlightProfile ? (
                      <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
                        <span className="font-semibold">Spotlight activity:</span> {formatCount(displayedSpotlightCount)} posts and {formatCount(displayedSpotlightMediaCount)} media moments
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <main className="space-y-6">
              {featuredCollections.length > 0 ? (
                <section className="rounded-[1.9rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Collections</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Shop the look highlights</h2>
                    </div>
                    <Link to={`/collections/${user.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View all collections
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {featuredCollections.map((collection) => (
                      <Link
                        key={collection.id}
                        to={`/collections/${user.id}`}
                        className="group overflow-hidden rounded-[1.6rem] border border-border bg-surface-soft transition hover:-translate-y-1 hover:border-primary/30"
                      >
                        <div className="aspect-[16/10] overflow-hidden">
                          <img
                            src={collection.coverImageUrl || items[0]?.imageUrls?.[0] || '/icons/urbanprime.svg'}
                            alt={collection.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-lg font-bold text-text-primary">{collection.name}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                            {collection.description || 'Curated picks grouped into one visual story.'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {spotlightProfile ? (
                <section className="rounded-[1.9rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Spotlight</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Connected Spotlight profile</h2>
                      <p className="mt-2 text-sm text-text-secondary">
                        @{spotlightProfile.username} with {formatCount(displayedSpotlightCount)} posts and {formatCount(displayedSpotlightMediaCount)} media moments.
                      </p>
                    </div>
                    {spotlightRoute ? (
                      <Link to={spotlightRoute} className="inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
                        Open full Spotlight
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {spotlightItems.length > 0 ? spotlightItems.map((item) => (
                      <Link
                        key={item.id}
                        to={`/spotlight/post/${item.id}`}
                        className="group overflow-hidden rounded-[1.55rem] border border-border bg-surface-soft transition hover:-translate-y-1 hover:border-primary/30"
                      >
                        <div className="relative aspect-[4/5] overflow-hidden bg-background">
                          {isSpotlightText(item) ? (
                            <SpotlightTextCard
                              caption={item.caption}
                              creatorName={spotlightProfile.name}
                              timeLabel={formatTimeAgo(item.published_at || item.created_at)}
                              variant="tile"
                              className="h-full rounded-none"
                            />
                          ) : (
                            <>
                              <img
                                src={item.thumbnail_url || item.media_url}
                                alt={item.caption || 'Spotlight content'}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
                                {item.media_type === 'video' ? 'Video' : 'Image'}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="space-y-2 p-4">
                          <p className="line-clamp-2 text-sm font-semibold text-text-primary">
                            {item.caption || 'Spotlight post'}
                          </p>
                          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                            <span>{formatTimeAgo(item.published_at || item.created_at)}</span>
                            <span>{formatCount(item.metrics.likes || 0)} likes</span>
                          </div>
                        </div>
                      </Link>
                    )) : (
                      <div className="sm:col-span-2 xl:col-span-3 rounded-[1.6rem] border border-dashed border-border bg-surface-soft px-6 py-10 text-center">
                        <p className="text-base font-semibold text-text-primary">This Spotlight profile does not have public posts yet.</p>
                        <p className="mt-2 text-sm text-text-secondary">New Spotlight content will appear here when it goes live.</p>
                      </div>
                    )}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.9rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Content</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Listings and pixes</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('posts')}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === 'posts'
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface-soft text-text-secondary hover:border-primary/30 hover:text-text-primary'
                      }`}
                    >
                      <PostsIcon />
                      <span>Listings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pixes')}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === 'pixes'
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface-soft text-text-secondary hover:border-primary/30 hover:text-text-primary'
                      }`}
                    >
                      <PixesIcon />
                      <span>Pixes</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  {activeTab === 'posts' ? (
                    items.length > 0 ? (
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => (
                          <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.6rem] border border-border bg-surface-soft px-6 py-14 text-center">
                        <p className="text-base font-semibold text-text-primary">{displayName} has not listed any items yet.</p>
                        <p className="mt-2 text-sm text-text-secondary">Check back later for fresh drops and curated product stories.</p>
                      </div>
                    )
                  ) : pixeVideos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {pixeVideos.map((video) => (
                        <Link key={video.id} to={`/pixe/watch/${video.id}`} className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-surface-soft">
                          <div className="aspect-[9/13] overflow-hidden bg-black">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                            ) : null}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/24 to-transparent p-4 text-white">
                            <p className="line-clamp-2 text-sm font-semibold">{video.title || video.caption || 'Urban Prime Pixe'}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/72">
                              {formatCount(video.metrics.qualified_views || 0)} views
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : reels.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {reels.map((reel) => (
                        <Link key={reel.id} to="/reels" className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-surface-soft">
                          <div className="aspect-[3/4] overflow-hidden">
                            <img src={reel.coverImageUrl} alt={reel.caption} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 text-white">
                            <p className="line-clamp-2 text-sm font-semibold">{reel.caption || 'UrbanPrime pixe'}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/70">{formatCount(reel.views || 0)} views</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.6rem] border border-border bg-surface-soft px-6 py-14 text-center">
                      <p className="text-base font-semibold text-text-primary">{displayName} has not posted any pixes yet.</p>
                      <p className="mt-2 text-sm text-text-secondary">Reels, vertical clips, and motion content will appear here.</p>
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside className="space-y-6">
              {userBadges.length > 0 ? (
                <section className="rounded-[1.9rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Reputation</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Badges and trust signals</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {userBadges.slice(0, 4).map((badge) => (
                      <Badge key={badge.id} badge={badge} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.9rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Snapshot</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Why this profile stands out</h2>
                <div className="mt-5 space-y-3">
                  {[ 
                    `${formatCount(items.length)} published listings available now`,
                    `${formatCount(pixeVideos.length || reels.length)} pixes in the content archive`,
                    `${formatCount(collections.length)} public collections ready to browse`,
                    spotlightProfile
                      ? `${formatCount(displayedSpotlightCount)} Spotlight posts linked to this identity`
                      : 'Spotlight profile not connected yet',
                    averageRating > 0
                      ? `${averageRating.toFixed(1)} average rating across ${totalReviews} reviews`
                      : 'Profile is building review history'
                  ].map((entry) => (
                    <div key={entry} className="rounded-[1.25rem] border border-border bg-surface-soft px-4 py-3 text-sm text-text-primary">
                      {entry}
                    </div>
                  ))}
                </div>
              </section>

              {spotlightProfile && spotlightRoute ? (
                <section className="rounded-[1.9rem] border border-primary/20 bg-primary/10 p-5 shadow-soft sm:p-6">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-primary">Spotlight route</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">One identity across Urban Prime</h2>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    This public profile is connected to the Spotlight creator page for @{spotlightProfile.username}, so visitors can move between storefront content and Spotlight content without losing context.
                  </p>
                  <Link
                    to={spotlightRoute}
                    className="mt-4 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Open Spotlight profile
                  </Link>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicProfilePage;
