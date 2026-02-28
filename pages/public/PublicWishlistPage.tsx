import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userService, itemService } from '../../services/itemService';
import type { User, WishlistItem, Item } from '../../types';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/EmptyState';
import { useNotification } from '../../context/NotificationContext';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

const HeartIcon: React.FC<{isFilled: boolean}> = ({ isFilled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={isFilled ? 'text-red-500' : 'text-gray-500'}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
);

const WishlistItemCard: React.FC<{ wishlistItem: WishlistItem; item: Item; ownerId: string; onUpdate: () => void }> = ({ wishlistItem, item, ownerId, onUpdate }) => {
    // FIX: Removed unused `currencySymbol` and consolidated useAuth hook call.
    const { user, isAuthenticated, openAuthModal } = useAuth();
    const [newComment, setNewComment] = useState('');
    
    const isLiked = user ? wishlistItem.likes.includes(user.id) : false;

    const handleLike = async () => {
        if (!isAuthenticated || !user) { openAuthModal('login'); return; }
        await userService.toggleWishlistLike(ownerId, wishlistItem.itemId, user.id);
        onUpdate();
    };
    
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user || !newComment.trim()) return;
        await userService.addWishlistComment(ownerId, wishlistItem.itemId, user, newComment);
        setNewComment('');
        onUpdate();
    }
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-soft border flex flex-col sm:flex-row gap-4">
            <Link to={`/item/${item.id}`} className="block sm:w-40 flex-shrink-0">
                <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover rounded-md" />
            </Link>
            <div className="flex-1 flex flex-col">
                <h3 className="font-bold text-lg"><Link to={`/item/${item.id}`}>{item.title}</Link></h3>
                <p className="text-sm text-gray-500">Added on {new Date(wishlistItem.addedAt).toLocaleDateString()}</p>
                <div className="flex-grow my-4">
                    {/* Comments */}
                    <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
                        {wishlistItem.comments.map((comment, i) => (
                            <div key={i} className="text-xs flex gap-2 items-start">
                                <img src={comment.avatar} alt={comment.name} className="w-5 h-5 rounded-full" />
                                <p><span className="font-semibold">{comment.name}:</span> {comment.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                {isAuthenticated && (
                     <form onSubmit={handleComment} className="flex gap-2 text-sm mt-auto pt-2 border-t">
                        <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 p-1 bg-gray-100 rounded" />
                        <button type="submit" className="font-semibold text-primary">Post</button>
                    </form>
                )}
                 <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                         <button onClick={handleLike} className="flex items-center gap-1 text-sm font-semibold text-gray-600"><HeartIcon isFilled={isLiked}/> {wishlistItem.likes.length}</button>
                    </div>
                    <Link to={`/item/${item.id}`} className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm">
                        Gift This Item
                    </Link>
                </div>
            </div>
        </div>
    );
};


const PublicWishlistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<User | null>(null);
    const [wishlistItems, setWishlistItems] = useState<Item[]>([]);
    const [wishlistData, setWishlistData] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [profileData, publicWishlist] = await Promise.all([
                userService.getPublicProfile(id).then(p => p?.user || null),
                userService.getPublicWishlist(id)
            ]);

            setProfile(profileData);
            
            const publicWishlistItems = publicWishlist.filter(w => w.isPublic);
            setWishlistData(publicWishlistItems);
            
            if (publicWishlistItems.length > 0) {
                const itemDetails = await Promise.all(
                    publicWishlistItems.map(w => itemService.getItemById(w.itemId))
                );
                setWishlistItems(itemDetails.filter(Boolean) as Item[]);
            } else {
                 setWishlistItems([]);
            }

        } catch (error) {
            console.error("Failed to load wishlist", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) return <Spinner size="lg" className="mt-20" />;
    if (!profile) {
        return (
            <div className="text-center py-20">
                <LottieAnimation src={uiLottieAnimations.noFileFound} className="h-44 w-44 mx-auto" loop autoplay />
                <p>User not found.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <header className="text-center mb-10">
                    <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg" />
                    <h1 className="text-4xl font-extrabold font-display mt-4">{profile.name}'s Wishlist</h1>
                    <Link to={`/user/${profile.id}`} className="text-primary hover:underline">&larr; Back to Profile</Link>
                </header>
                
                {wishlistItems.length > 0 ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {wishlistItems.map(item => {
                            const data = wishlistData.find(w => w.itemId === item.id);
                            return data ? <WishlistItemCard key={item.id} wishlistItem={data} item={item} ownerId={profile.id} onUpdate={fetchData} /> : null;
                        })}
                    </div>
                ) : (
                    <EmptyState
                        title="Wishlist is Empty"
                        message={`${profile.name} hasn't added any public items to their wishlist yet.`}
                        buttonText="Browse Items"
                        buttonLink="/browse"
                    />
                )}
            </div>
        </div>
    );
};

export default PublicWishlistPage;
