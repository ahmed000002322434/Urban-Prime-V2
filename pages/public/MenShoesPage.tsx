

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
        <h2 className="text-3xl font-bold font-serif-display text-gray-900 dark:text-dark-text">{title}</h2>
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

const MenShoesPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [sneakers, setSneakers] = useState<Item[]>([]);
    const [formal, setFormal] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'mens-shoes' }, { page: 1, limit: 8 })
            .then(data => {
                // Mock filtering
                setSneakers(data.items.slice(0, 4));
                setFormal(data.items.slice(4, 8));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-purple-50/20 dark:bg-dark-background animate-fade-in-up">
                <style>{`
                    .font-serif-display { font-family: 'Playfair Display', serif; }
                `}</style>
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">Men's Shoe Collection</h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Crafted for comfort, built for style. Find your foundation.</p>
                </section>
                
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Sneakers & Casual" linkTo="/browse?category=mens-shoes" />
                        <ProductGrid items={sneakers} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Formal Shoes & Boots" linkTo="/browse?category=mens-shoes" />
                        <ProductGrid items={formal} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};
export default MenShoesPage;