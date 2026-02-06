

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
const SectionHeader: React.FC<{ title: string; subtitle: string; linkTo: string }> = ({ title, subtitle, linkTo }) => (
    <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-3xl font-bold font-display text-[#5C4B41] dark:text-dark-text">{title}</h2>
            <p className="text-sm text-[#8A7A70] dark:text-gray-400">{subtitle}</p>
        </div>
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


const BabyWearPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'baby-wear' }, { page: 1, limit: 12 })
            .then(data => {
                setItems(data.items);
                setIsLoading(false);
            });
    }, []);

    // Mock filtering for different age groups
    const newbornItems = items.slice(0, 4);
    const infantItems = items.slice(4, 8);
    const toddlerItems = items.slice(8, 12);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-[#FFFBF0] dark:bg-dark-background text-gray-800 dark:text-dark-text animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold font-display text-[#5C4B41]">Little Outfits, Big Adventures</h1>
                    <p className="mt-4 text-lg text-[#8A7A70] max-w-xl mx-auto">Discover adorable, comfortable, and durable clothing for your little ones.</p>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Newborn" subtitle="0-3 Months" linkTo="/browse?category=baby-wear" />
                        <ProductGrid items={newbornItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Infant" subtitle="3-12 Months" linkTo="/browse?category=baby-wear" />
                        <ProductGrid items={infantItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Toddler" subtitle="12-24 Months" linkTo="/browse?category=baby-wear" />
                        <ProductGrid items={toddlerItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default BabyWearPage;