

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
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

const SmallHomeAppliancesPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [kitchen, setKitchen] = useState<Item[]>([]);
    const [cleaning, setCleaning] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Added missing page property to the pagination object.
        itemService.getItems({ category: 'small-home-appliances' }, { page: 1, limit: 8 })
            .then(data => {
                // Mock filtering for demonstration
                setKitchen(data.items.slice(0, 4));
                setCleaning(data.items.slice(4, 8));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-100">
                     <img src="https://picsum.photos/seed/small-appl-hero/1920/1080" alt="Small kitchen appliances" className="absolute inset-0 w-full h-full object-cover"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4 bg-white/40 dark:bg-black/40">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-serif-display text-gray-800 dark:text-white">Make Life Easier</h1>
                        <p className="mt-4 text-lg max-w-xl text-gray-700 dark:text-gray-200">Discover small appliances that make a big difference in your daily routine.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Kitchen Appliances" linkTo="/browse?category=small-home-appliances" />
                        <ProductGrid items={kitchen} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Cleaning & Garment Care" linkTo="/browse?category=small-home-appliances" />
                        <ProductGrid items={cleaning} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default SmallHomeAppliancesPage;