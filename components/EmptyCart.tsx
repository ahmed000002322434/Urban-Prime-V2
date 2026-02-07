

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import { useAuth } from '../hooks/useAuth';
import ItemCard from './ItemCard';
import QuickViewModal from './QuickViewModal';
import SkeletonCard from './SkeletonCard';

const CartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
);

const EmptyCart: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [recommendedItems, setRecommendedItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setIsLoading(true);
            try {
                let items;
                if (isAuthenticated && user) {
                    items = await itemService.getPersonalizedFeed(user);
                } else {
                    // FIX: Added missing page property to the pagination object.
                    const data = await itemService.getItems({ isFeatured: true }, { page: 1, limit: 8 });
                    items = data.items;
                }
                setRecommendedItems(items);
            } catch (error) {
                console.error("Failed to fetch recommended items:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [user, isAuthenticated]);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="flex justify-center mb-6">
                        <CartIcon />
                    </div>
                    <h1 className="text-4xl font-extrabold font-display text-text-primary">Your cart is empty</h1>
                    <p className="text-text-secondary mt-4">
                        Looks like you haven’t added any items to your cart yet. Start exploring and find something you like!
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link
                            to="/browse"
                            className="w-full sm:w-auto inline-block bg-primary text-primary-text font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
                        >
                            Continue Shopping
                        </Link>
                        {isAuthenticated && (
                             <Link
                                to="/profile/wishlist"
                                className="w-full sm:w-auto inline-block bg-surface-soft border border-border text-text-primary font-bold py-3 px-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                View Wishlist
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mt-24">
                    <h2 className="text-3xl font-bold font-display text-center mb-8 text-text-primary">
                        Try These
                    </h2>
                    {isLoading ? (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {recommendedItems.map(item => (
                                <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default EmptyCart;
