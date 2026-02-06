

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
        <h2 className="text-3xl font-bold font-serif-display text-gray-700 dark:text-dark-text">{title}</h2>
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

const WomensAccessoriesPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [jewelry, setJewelry] = useState<Item[]>([]);
    const [scarves, setScarves] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items } = await itemService.getItems({ category: 'womens-accessories' }, { page: 1, limit: 8 });
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items: jewelryItems } = await itemService.getItems({ category: 'jewelry' }, { page: 1, limit: 4 });
                
                // Mock filtering
                setJewelry(jewelryItems);
                setScarves(items.filter(i => i.title.toLowerCase().includes('scarf')).slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch women's accessories:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchItems();
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-[#F8F4F1] dark:bg-dark-background text-gray-700 dark:text-dark-text animate-fade-in-up">
                 <style>{`
                    .font-serif-display { font-family: 'Playfair Display', serif; }
                `}</style>
                <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif-display font-bold">The Art of Adornment</h1>
                    <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">Discover delicate jewelry, luxurious scarves, and the perfect finishing touches.</p>
                </section>
                
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Jewelry" linkTo="/jewelry" />
                        <ProductGrid items={jewelry} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Scarves & Hats" linkTo="/browse?category=womens-accessories" />
                        <ProductGrid items={scarves} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default WomensAccessoriesPage;