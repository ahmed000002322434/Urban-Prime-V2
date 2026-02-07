

import React, { useState, useEffect } from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to named imports for 'useParams' and 'useNavigate' to resolve module resolution errors.
import { useNavigate, useParams, Link } from 'react-router-dom';
import { userService, reelService, itemService } from '../../services/itemService';
import type { User, Item, ItemCollection, Reel, Store } from '../../types';
import Spinner from '../../components/Spinner';
import VerifiedBadge from '../../components/VerifiedBadge';
import Badge from '../../components/Badge';
import ItemCard from '../../components/ItemCard';
import { useUserData } from '../../hooks/useUserData';
import { useAuth } from '../../hooks/useAuth';
import QuickViewModal from '../../components/QuickViewModal';
import StarRating from '../../components/StarRating';

const WebsiteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const TwitterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
const CollectionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"/><rect x="2" y="10" width="20" height="12" rx="2"/></svg>;
const WishlistIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const PostsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
const PixesIcon = () => <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated-Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="w-5 h-5 object-contain" />;

const formatCount = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

const AffiliateTierBadge: React.FC<{tier: 'bronze' | 'silver' | 'gold'}> = ({ tier }) => {
    const tierColors = {
        bronze: 'bg-orange-200 text-orange-800',
        silver: 'bg-gray-200 text-gray-800',
        gold: 'bg-yellow-200 text-yellow-800',
    }
    return <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${tierColors[tier]} capitalize`}>{tier} Tier Affiliate</span>
}

const PublicProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { badges: allBadgesData } = useUserData();
    const [profile, setProfile] = useState<{ user: User; items: Item[]; store: Store | null } | null>(null);
    const [reels, setReels] = useState<Reel[]>([]);
    const [collections, setCollections] = useState<ItemCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { user: loggedInUser, isAuthenticated, openAuthModal } = useAuth();
    const navigate = useNavigate();
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
        Promise.all([
            userService.getPublicProfile(id),
            userService.getPublicCollectionsForUser(id),
            reelService.getReelsByCreator(id),
            itemService.getReviewsForOwner(id)
        ]).then(([profileData, collectionsData, reelsData, reviewsData]) => {
                if (profileData) {
                    setProfile(profileData);
                    setCollections(collectionsData);
                    setReels(reelsData);
                    setFollowersCount(profileData.user.followers.length);
                    if (loggedInUser) {
                        setIsFollowing(loggedInUser.following.includes(profileData.user.id));
                    }
                    // Calculate Rating
                    setTotalReviews(reviewsData.length);
                    const avg = reviewsData.length > 0 
                        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
                        : 0;
                    setAverageRating(avg);
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.error(error);
                setLoadError('Unable to load this profile right now.');
                setIsLoading(false);
            });
    }, [id, loggedInUser]);
    
    if (isLoading) return <Spinner size="lg" className="mt-20" />;
    if (loadError) return <div className="text-center py-20 text-text-secondary">{loadError}</div>;
    if (!profile) return <div className="text-center py-20">User not found.</div>;

    const { user, items, store } = profile;
    const userBadges = allBadgesData.filter(b => user.badges.includes(b.id));
    const isOwnProfile = isAuthenticated && loggedInUser?.id === user.id;
    const shopTheLookCollections = collections.filter(c => c.isShopTheLook);

    const handleFollowToggle = async () => {
        if (!isAuthenticated || !loggedInUser) {
            openAuthModal('login');
            return;
        }
        if (!profile) return;
        
        await userService.toggleFollow(loggedInUser.id, profile.user.id);
        setIsFollowing(prev => !prev);
        setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);
    };
    
    const Stat: React.FC<{ count: number, label: string }> = ({ count, label }) => (
        <div className="text-center">
            <p className="font-bold text-lg">{count}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
    
    const TabButton: React.FC<{ tab: 'posts' | 'pixes', children: React.ReactNode }> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
            {children}
        </button>
    );

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
                <div className="max-w-5xl mx-auto">
                    {/* Profile Header */}
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg flex flex-col items-center gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                             <img src={user.avatar} alt={user.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary dark:border-white flex-shrink-0" />
                            <div className="flex-1 w-full text-center sm:text-left">
                                <div className="flex items-center gap-4 justify-center sm:justify-start flex-wrap">
                                    <h1 className="text-3xl font-bold font-display">{user.businessName || user.name}</h1>
                                    {user.affiliateTier && <AffiliateTierBadge tier={user.affiliateTier} />}
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        <StarRating rating={averageRating} size="sm" />
                                        <span className="text-xs font-bold ml-1">{averageRating.toFixed(1)} ({totalReviews})</span>
                                    </div>
                                </div>
                                 <div className="mt-2 flex justify-center sm:justify-start gap-2">
                                    {isOwnProfile ? (
                                        <>
                                            <button onClick={() => navigate('/profile/settings')} className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Edit Profile</button>
                                            {store && <Link to="/store/edit" className="px-4 py-1.5 text-sm bg-primary text-white font-semibold rounded-lg hover:opacity-90">Edit Store</Link>}
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={handleFollowToggle} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${isFollowing ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600' : 'bg-primary text-white hover:opacity-90'}`}>
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                            {store && <Link to={`/store/${store.slug}`} className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">View Store</Link>}
                                        </>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">Member since {new Date(user.memberSince).toLocaleDateString()}{user.yearsInBusiness ? ` • ${user.yearsInBusiness} Years in Business` : ''}</p>
                                <p className="mt-2 text-sm text-light-text dark:text-gray-300">{user.about || user.businessDescription}</p>
                            </div>
                        </div>
                        <div className="w-full flex justify-around items-center pt-4 border-t dark:border-gray-700">
                             <Stat count={items.length} label="Posts" />
                             <Stat count={reels.length} label="Pixes" />
                             <Stat count={followersCount} label="Followers" />
                             <Stat count={user.following.length} label="Following" />
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="mt-8 border-b dark:border-gray-700 flex justify-center">
                        <TabButton tab="posts"><PostsIcon/> Posts</TabButton>
                        <TabButton tab="pixes"><PixesIcon/> Pixes</TabButton>
                    </div>

                    <div className="mt-8">
                        {activeTab === 'posts' && (
                            items.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                    {items.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow-lg">
                                    <p className="text-slate-500 dark:text-gray-400">{user.name} has not listed any items yet.</p>
                                </div>
                            )
                        )}
                        {activeTab === 'pixes' && (
                             reels.length > 0 ? (
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {reels.map(reel => (
                                        <Link to="/reels" key={reel.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden">
                                            <img src={reel.coverImageUrl} alt={reel.caption} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                            <div className="absolute bottom-2 left-2 text-white flex items-center gap-1 text-xs font-bold">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                <span>{formatCount(reel.views || 0)}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow-lg">
                                    <p className="text-slate-500 dark:text-gray-400">{user.name} has not posted any pixes yet.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PublicProfilePage;

