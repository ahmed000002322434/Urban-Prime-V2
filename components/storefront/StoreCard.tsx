import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Store, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import { useNotification } from '../../context/NotificationContext';
import { useCategories } from '../../context/CategoryContext';

const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
);

interface StoreCardProps {
    store: Store & { owner: User };
}

const StoreCard: React.FC<StoreCardProps> = ({ store }) => {
    const { user, openAuthModal, updateUser } = useAuth();
    const { showNotification } = useNotification();
    const { flatCategories } = useCategories();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        if (user) {
            setIsFollowing(user.following.includes(store.owner.id));
        }
    }, [store.owner.id, user]);

    const { name: storeName, tagline, logo } = store;
    const isNew = new Date(store.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const isTopSeller = Number(store.owner.rating || 0) > 4.7 && store.owner.followers.length > 1;
    const isJustLaunched = store.products.length === 0;
    const categoryName = flatCategories.find((entry) => entry.id === store.category)?.name;

    const handleFollow = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
            openAuthModal('login');
            return;
        }
        setIsFollowing((prev) => !prev);
        try {
            const { currentUser } = await userService.toggleFollow(user.id, store.owner.id);
            updateUser(currentUser);
        } catch (error) {
            setIsFollowing((prev) => !prev);
            showNotification('Failed to follow store.');
        }
    };

    const handleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
            openAuthModal('login');
            return;
        }
        setIsFavorited((prev) => !prev);
    };

    const handleShare = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const url = `${window.location.origin}/#/s/${store.slug}`;
        navigator.clipboard.writeText(url);
        showNotification('Store link copied to clipboard.');
    };

    return (
        <Link to={`/s/${store.slug}`} className="group block rounded-xl border border-transparent bg-surface shadow-soft transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-700">
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100 p-4 dark:bg-dark-background">
                {logo ? (
                    <img src={logo} alt={`${storeName} logo`} className="mx-auto max-h-24 max-w-full object-contain transition-transform duration-300 group-hover:scale-110" />
                ) : (
                    <span className="flex h-full items-center justify-center text-center text-xl font-bold text-gray-600 transition-transform duration-300 group-hover:scale-110 dark:text-gray-400">
                        {store.brandingKit.logoDescription}
                    </span>
                )}
                <div className="absolute right-2 top-2 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={handleFavorite} className={`rounded-full p-2 backdrop-blur-sm transition-colors ${isFavorited ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}>
                        <HeartIcon />
                    </button>
                    <button onClick={handleShare} className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60">
                        <ShareIcon />
                    </button>
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <img src={store.owner.avatar} alt={store.owner.name} className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-gray-900 dark:text-dark-text">{storeName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">by {store.owner.name}</p>
                    </div>
                    <button onClick={handleFollow} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-primary text-white'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
                <p className="mt-3 h-10 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {store.owner.verificationLevel === 'level2' ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">Verified Store</span> : null}
                    {isNew ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">New</span> : null}
                    {isTopSeller ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">Top Seller</span> : null}
                    {isJustLaunched ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">Just Launched</span> : null}
                    {categoryName ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">{categoryName}</span> : null}
                    {store.city ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">{store.city}</span> : null}
                </div>
            </div>
        </Link>
    );
};

export default StoreCard;
