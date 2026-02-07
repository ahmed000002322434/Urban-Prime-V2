
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Store, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import { useNotification } from '../../context/NotificationContext';
import { useCategories } from '../../context/CategoryContext';

const VerifiedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;

interface StoreCardProps {
  store: Store & { owner: User };
}

const StoreCard: React.FC<StoreCardProps> = ({ store }) => {
    const { user, openAuthModal, updateUser } = useAuth();
    const { showNotification } = useNotification();
    const { flatCategories } = useCategories();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false); // Local state for demo

    useEffect(() => {
        if (user) {
            setIsFollowing(user.following.includes(store.owner.id));
        }
    }, [user, store.owner.id]);

    const { name: storeName, tagline, logo } = store;
    
    const isNew = new Date(store.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Mock logic for top seller
    const isTopSeller = store.owner.rating > 4.7 && store.owner.followers.length > 1;
    const isJustLaunched = store.products.length === 0;
    const categoryName = flatCategories.find(c => c.id === store.category)?.name;

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { openAuthModal('login'); return; }
        setIsFollowing(prev => !prev);
        try {
            const { currentUser } = await userService.toggleFollow(user.id, store.owner.id);
            updateUser(currentUser);
        } catch (error) {
            setIsFollowing(prev => !prev);
            showNotification('Failed to follow store.');
        }
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { openAuthModal('login'); return; }
        setIsFavorited(prev => !prev);
    };
    
    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/#/store/${store.slug}`;
        navigator.clipboard.writeText(url);
        showNotification("Store link copied to clipboard!");
    };

    return (
        <Link to={`/store/${store.slug}`} className="group block bg-surface rounded-xl shadow-soft border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300">
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-dark-background rounded-t-xl overflow-hidden flex items-center justify-center p-4">
                {logo ? (
                    <img src={logo} alt={`${storeName} logo`} className="max-w-full max-h-24 object-contain transition-transform duration-300 group-hover:scale-110" />
                ) : (
                    <span className="text-xl font-bold text-center text-gray-600 dark:text-gray-400 transition-transform duration-300 group-hover:scale-110">{store.brandingKit.logoDescription}</span>
                )}
                 <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleFavorite} className={`p-2 rounded-full backdrop-blur-sm transition-colors ${isFavorited ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}><HeartIcon /></button>
                    <button onClick={handleShare} className="p-2 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60"><ShareIcon /></button>
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <img src={store.owner.avatar} alt={store.owner.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-dark-text truncate">{storeName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">by {store.owner.name}</p>
                    </div>
                    <button onClick={handleFollow} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-primary text-white'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 h-10 line-clamp-2">{tagline}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {store.owner.verificationLevel === 'level2' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">✅ Verified Store</span>}
                    {isNew && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">🆕 New</span>}
                    {isTopSeller && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">🏆 Top Seller</span>}
                    {isJustLaunched && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">🚀 Just Launched</span>}
                    {categoryName && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">{categoryName}</span>}
                    {store.city && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">📍 {store.city}</span>}
                </div>
            </div>
        </Link>
    );
};

export default StoreCard;
