

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

const UnisexFashionPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [hoodies, setHoodies] = useState<Item[]>([]);
    const [tees, setTees] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'unisex-fashion' }, { page: 1, limit: 8 })
            .then(data => {
                setHoodies(data.items.filter(i => i.title.toLowerCase().includes('hoodie')).slice(0, 4));
                setTees(data.items.filter(i => i.title.toLowerCase().includes('tee') || i.title.toLowerCase().includes('shirt')).slice(0, 4));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-black text-black dark:text-white animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter">STYLE BEYOND BINARIES</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">A curated collection of gender-neutral apparel. Clean lines, quality fabrics, for everyone.</p>
                </section>
                
                 <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Hoodies & Sweatshirts" linkTo="/browse?category=unisex-fashion" />
                        <ProductGrid items={hoodies} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="T-Shirts" linkTo="/browse?category=unisex-fashion" />
                        <ProductGrid items={tees} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default UnisexFashionPage;