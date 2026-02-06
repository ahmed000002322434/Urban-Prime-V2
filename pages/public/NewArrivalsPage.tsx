import React, { useState, useEffect, useCallback, useRef } from 'react';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';
import SkeletonCard from '../../components/SkeletonCard';
import QuickViewModal from '../../components/QuickViewModal';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const NewArrivalsPage: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const heroRef = useScrollReveal<HTMLDivElement>();

    const fetchNewArrivals = useCallback(async (pageNum: number) => {
        if (pageNum === 1) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const { items: allItems, total } = await itemService.getItems({}, { page: pageNum, limit: 20 });
            // Sort by creation date descending
            const sortedItems = allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setItems(prev => pageNum === 1 ? sortedItems : [...prev, ...sortedItems]);
            setTotalItems(total);
        } catch (error) {
            console.error("Failed to fetch new arrivals:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchNewArrivals(page);
    }, [fetchNewArrivals, page]);
    
    // Infinite scroll observer
     useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && items.length < totalItems) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 1.0 }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [isLoadingMore, items.length, totalItems]);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                {/* Hero Section */}
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold font-display text-gray-900 dark:text-dark-text">New Arrivals</h1>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Check out the latest items added to the marketplace.</p>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : items.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {items.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <h3 className="text-2xl font-semibold dark:text-dark-text">No New Items Found</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Check back soon for the latest additions!</p>
                        </div>
                    )}
                    
                    <div ref={loaderRef} className="h-20 flex justify-center items-center">
                        {isLoadingMore && <Spinner />}
                    </div>
                </main>
            </div>
        </>
    );
};

export default NewArrivalsPage;