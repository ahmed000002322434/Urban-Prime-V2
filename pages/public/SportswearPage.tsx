

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
        <h2 className="text-3xl font-bold font-display uppercase tracking-tight text-white">{title}</h2>
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


const SportswearPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [runningItems, setRunningItems] = useState<Item[]>([]);
    const [gymItems, setGymItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'sportswear' }, { page: 1, limit: 8 })
            .then(data => {
                // Mock filtering
                setRunningItems(data.items.slice(0, 4));
                setGymItems(data.items.slice(4, 8));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-black text-white animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[60vh] flex items-center">
                     <img src="https://picsum.photos/seed/sport-hero/1920/1080" alt="Athlete in action" className="absolute inset-0 w-full h-full object-cover opacity-50"/>
                    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">Engineered for<br/>Performance</h1>
                        <p className="mt-4 text-lg max-w-md">High-performance athletic wear designed to help you push your limits.</p>
                    </div>
                </section>
                
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Running" linkTo="/browse?category=sportswear" />
                        <ProductGrid items={runningItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Training & Gym" linkTo="/browse?category=sportswear" />
                        <ProductGrid items={gymItems} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default SportswearPage;