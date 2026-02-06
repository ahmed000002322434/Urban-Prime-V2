

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

const DIYToolsPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [powerTools, setPowerTools] = useState<Item[]>([]);
    const [handTools, setHandTools] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Added missing page property to the pagination object.
        itemService.getItems({ category: 'diy-tools' }, { page: 1, limit: 8 })
            .then(data => {
                // Mock filtering for demonstration
                setPowerTools(data.items.slice(0, 4));
                setHandTools(data.items.slice(4, 8));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-800 text-white">
                     <img src="https://picsum.photos/seed/tools-hero/1920/1080" alt="Workshop with tools" className="absolute inset-0 w-full h-full object-cover opacity-50"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-display">Build, Fix, Create.</h1>
                        <p className="mt-4 text-lg max-w-xl">The right tools for any DIY project, big or small. Rent what you need, when you need it.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Power Tools" linkTo="/browse?category=diy-tools" />
                        <ProductGrid items={powerTools} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Hand Tools" linkTo="/browse?category=diy-tools" />
                        <ProductGrid items={handTools} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default DIYToolsPage;