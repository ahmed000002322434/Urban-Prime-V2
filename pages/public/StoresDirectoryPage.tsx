import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { storefrontService } from '../../services/storefrontService';
import { useAuth } from '../../hooks/useAuth';
import type { Store, User } from '../../types';
import Spinner from '../../components/Spinner';
import StoreCard from '../../components/storefront/StoreCard';
import EmptyState from '../../components/EmptyState';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCategories } from '../../context/CategoryContext';

type EnrichedStore = Store & { owner: User };
type SortOption = 'popular' | 'recent' | 'random';

const StoresDirectoryPage: React.FC = () => {
    const [allStores, setAllStores] = useState<EnrichedStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('popular');
    const [visibleCount, setVisibleCount] = useState(12);

    const { flatCategories } = useCategories();
    const [categoryFilter, setCategoryFilter] = useState('');

    const heroRef = useScrollReveal();

    useEffect(() => {
        setIsLoading(true);
        storefrontService.getAllStorefronts()
            .then(data => setAllStores(data))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredAndSortedStores = useMemo(() => {
        let stores = [...allStores];

        if (searchTerm) {
            const lowercasedSearch = searchTerm.toLowerCase();
            stores = stores.filter(store => {
                return store.name.toLowerCase().includes(lowercasedSearch) ||
                       store.tagline.toLowerCase().includes(lowercasedSearch) ||
                       store.owner.name.toLowerCase().includes(lowercasedSearch);
            });
        }
        
        // Sorting logic
        switch (sortOption) {
            case 'popular':
                stores.sort((a, b) => b.owner.followers.length - a.owner.followers.length);
                break;
            case 'recent':
                stores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'random':
                stores.sort(() => Math.random() - 0.5);
                break;
        }

        return stores;
    }, [allStores, searchTerm, sortOption]);

    const visibleStores = filteredAndSortedStores.slice(0, visibleCount);
    const hasMore = visibleCount < filteredAndSortedStores.length;

    const loadMore = () => {
        setVisibleCount(prev => prev + 12);
    };

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div>;
    }
    
    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen">
            <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">Discover Stores</h1>
                <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Explore unique storefronts from our community of creators and sellers.
                </p>
            </section>

            <div className="sticky top-[72px] z-30 bg-gray-50/80 dark:bg-dark-background/80 backdrop-blur-md py-4 border-b dark:border-gray-700">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-4 items-center">
                    <input
                        type="search"
                        placeholder="Search stores by name, owner, or category..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:flex-1 p-3 bg-white dark:bg-dark-surface border-2 border-gray-200 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value as SortOption)}
                        className="w-full sm:w-auto p-3 bg-white dark:bg-dark-surface border-2 border-gray-200 dark:border-gray-700 rounded-full font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="popular">⭐ Most Popular</option>
                        <option value="recent">⏳ Most Recent</option>
                        <option value="random">🎲 Random</option>
                    </select>
                </div>
            </div>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {visibleStores.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {visibleStores.map(store => <StoreCard key={store.slug} store={store} />)}
                        </div>
                        {hasMore && (
                            <div className="text-center mt-12">
                                <button onClick={loadMore} className="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
                                    Load More
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState
                        title="No Stores Found"
                        message={searchTerm ? "Try adjusting your search term." : "No stores have been created yet. Be the first!"}
                        buttonText="Create Your Store"
                        buttonLink="/create-store"
                    />
                )}
            </main>
        </div>
    );
};

export default StoresDirectoryPage;