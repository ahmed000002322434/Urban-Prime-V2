



import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { storefrontService } from '../../services/storefrontService';
import type { Store, User } from '../../types';
import Spinner from '../../components/Spinner';
import StoreCard from '../../components/storefront/StoreCard';
import BackButton from '../../components/BackButton';

const FollowedStoresPage: React.FC = () => {
    const { user } = useAuth();
    const [stores, setStores] = useState<(Store & { owner: User })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFollowedStores = async () => {
            if (!user || !user.following) return;
            setIsLoading(true);
            try {
                const allStores = await storefrontService.getAllStorefronts();
                const followed = allStores.filter(store => user.following.includes(store.ownerId));
                setStores(followed);
            } catch (error) {
                console.error("Failed to fetch followed stores:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFollowedStores();
    }, [user]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">Followed Stores</h1>
            </div>
            
            {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
                stores.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* FIX: Changed key from store.storeId to store.id to match the Store type */}
                        {stores.map(store => <StoreCard key={store.id} store={store} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-surface rounded-xl shadow-soft border border-border">
                        <p className="text-text-secondary">You are not following any stores yet.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default FollowedStoresPage;