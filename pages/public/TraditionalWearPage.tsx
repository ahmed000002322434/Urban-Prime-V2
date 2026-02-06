

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import QuickViewModal from '../../components/QuickViewModal';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import SkeletonCard from '../../components/SkeletonCard';

// Reusable component for section headers
const SectionHeader: React.FC<{ title: string; linkTo: string }> = ({ title, linkTo }) => (
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-serif-display text-[#4A3728] dark:text-dark-text">{title}</h2>
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

const TraditionalWearPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'traditional-wear' }, { page: 1, limit: 12 })
            .then(data => {
                setItems(data.items);
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-[#FDF6E3] dark:bg-dark-background text-[#4A3728] dark:text-dark-text animate-fade-in-up">
                 <style>{`
                    .font-serif-display { font-family: 'Playfair Display', serif; }
                `}</style>

                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif-display font-bold">Celebrating Heritage Through Style</h1>
                    <p className="mt-6 text-lg text-[#6E5641] dark:text-gray-400 max-w-2xl mx-auto">Explore a vibrant collection of traditional and cultural attire from around the world.</p>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="South Asian Elegance" linkTo="/browse?category=traditional-wear" />
                        <ProductGrid items={items.slice(0, 4)} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    <section>
                        <SectionHeader title="African Prints & Patterns" linkTo="/browse?category=traditional-wear" />
                        <ProductGrid items={items.slice(4, 8)} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    <section>
                        <SectionHeader title="East Asian Grace" linkTo="/browse?category=traditional-wear" />
                        <ProductGrid items={items.slice(8, 12)} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default TraditionalWearPage;