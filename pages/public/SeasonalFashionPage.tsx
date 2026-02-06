

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import Spinner from '../../components/Spinner';
import SkeletonCard from '../../components/SkeletonCard';

// Reusable component for section headers
const SectionHeader: React.FC<{ title: string; linkTo: string }> = ({ title, linkTo }) => (
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-display text-light-text dark:text-dark-text">{title}</h2>
        <Link to={linkTo} className="font-semibold text-primary hover:underline text-sm">View All &rarr;</Link>
    </div>
);

// Reusable component for product grids
const ProductGrid: React.FC<{ items: Item[]; onQuickView: (item: Item) => void; isLoading: boolean; }> = ({ items, onQuickView, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }
     if (items.length === 0) {
        return <p className="text-center text-gray-500 py-4">No items found for this category.</p>;
    }
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(item => <ItemCard key={item.id} item={item} onQuickView={onQuickView} />)}
        </div>
    );
};

const SeasonalFashionPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [summerItems, setSummerItems] = useState<Item[]>([]);
    const [winterItems, setWinterItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // Mock fetching for seasonal items
        setIsLoading(true);
        Promise.all([
            // FIX: Property 'page' is missing in type '{ limit: number; }'.
            itemService.getItems({ category: 'womens-clothing' }, { page: 1, limit: 4 }),
            // FIX: Property 'page' is missing in type '{ limit: number; }'.
            itemService.getItems({ category: 'mens-clothing' }, { page: 1, limit: 4 })
        ]).then(([summerData, winterData]) => {
            setSummerItems(summerData.items);
            setWinterItems(winterData.items);
            setIsLoading(false);
        });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                 <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold font-display text-gray-900 dark:text-dark-text">Seasonal Styles</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Shop the latest trends for every season.</p>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="The Summer Edit" linkTo="/browse?category=seasonal-fashion" />
                        <ProductGrid items={summerItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Winter Layers" linkTo="/browse?category=seasonal-fashion" />
                        <ProductGrid items={winterItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default SeasonalFashionPage;