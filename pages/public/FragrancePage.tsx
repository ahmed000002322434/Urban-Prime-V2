


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
        <h2 className="text-3xl font-bold font-serif-display text-gray-800 dark:text-dark-text">{title}</h2>
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

const FragrancesPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [forHim, setForHim] = useState<Item[]>([]);
    const [forHer, setForHer] = useState<Item[]>([]);
    const [unisex, setUnisex] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                // FIX: Added missing page property to the pagination object.
                const { items } = await itemService.getItems({ category: 'fragrances' }, { page: 1, limit: 12 });
                // Mock filtering for demonstration
                setForHim(items.slice(0, 4));
                setForHer(items.slice(4, 8));
                setUnisex(items.slice(8, 12));
            } catch (error) {
                console.error("Failed to fetch fragrances:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-indigo-50/20 dark:bg-dark-background animate-fade-in-up">
                <style>{`.font-serif-display { font-family: 'Playfair Display', serif; }`}</style>
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">Signature Scents</h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Explore a world of captivating fragrances. Discover the scent that defines you.</p>
                </section>
                
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="For Him" linkTo="/browse?category=fragrances" />
                        <ProductGrid items={forHim} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="For Her" linkTo="/browse?category=fragrances" />
                        <ProductGrid items={forHer} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                     <section>
                        <SectionHeader title="Unisex" linkTo="/browse?category=fragrances" />
                        <ProductGrid items={unisex} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default FragrancesPage;