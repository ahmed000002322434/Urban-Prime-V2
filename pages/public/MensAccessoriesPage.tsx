

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
        <h2 className="text-3xl font-bold font-display text-white">{title}</h2>
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
        return <p className="text-center text-gray-400 py-4">No items found for this category.</p>;
    }
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(item => <ItemCard key={item.id} item={item} onQuickView={onQuickView} />)}
        </div>
    );
};


const MensAccessoriesPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [wallets, setWallets] = useState<Item[]>([]);
    const [belts, setBelts] = useState<Item[]>([]);
    const [watches, setWatches] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items } = await itemService.getItems({ category: 'mens-accessories' }, { page: 1, limit: 8 });
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items: watchItems } = await itemService.getItems({ category: 'watches' }, { page: 1, limit: 4 });
                
                // Mock filtering
                setWallets(items.filter(i => i.title.toLowerCase().includes('wallet')).slice(0, 4));
                setBelts(items.filter(i => i.title.toLowerCase().includes('belt')).slice(0, 4));
                setWatches(watchItems);
            } catch(error) {
                console.error("Failed to fetch men's accessories:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-[#1A1A1A] text-white animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative min-h-[50vh] flex items-center justify-center text-center p-4">
                    <img src="https://picsum.photos/seed/men-acc-hero/1920/1080" alt="Men's Accessories" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    <div className="relative">
                        <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight">The Finishing Touch</h1>
                        <p className="mt-4 text-lg text-gray-300 max-w-xl mx-auto">Discover the details that define your style. Premium wallets, belts, and timepieces.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Wallets" linkTo="/browse?category=mens-accessories" />
                        <ProductGrid items={wallets} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Belts" linkTo="/browse?category=mens-accessories" />
                        <ProductGrid items={belts} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Watches" linkTo="/watches" />
                        <ProductGrid items={watches} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default MensAccessoriesPage;