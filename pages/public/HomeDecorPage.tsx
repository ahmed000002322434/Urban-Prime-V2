

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

const HomeDecorPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [wallArt, setWallArt] = useState<Item[]>([]);
    const [vases, setVases] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Added missing page property to the pagination object.
        itemService.getItems({ category: 'home-decor' }, { page: 1, limit: 8 })
            .then(data => {
                // Mock filtering for demonstration
                setWallArt(data.items.slice(0, 4));
                setVases(data.items.slice(4, 8));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-200">
                     <img src="https://picsum.photos/seed/decor-hero/1920/1080" alt="Well-decorated room" className="absolute inset-0 w-full h-full object-cover"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4 bg-black/30">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-serif-display text-white">Details That Matter</h1>
                        <p className="mt-4 text-lg max-w-xl text-gray-100">Add character and personality to your space with our curated collection of home décor.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Wall Art & Mirrors" linkTo="/browse?category=home-decor" />
                        <ProductGrid items={wallArt} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Vases & Decorative Objects" linkTo="/browse?category=home-decor" />
                        <ProductGrid items={vases} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default HomeDecorPage;