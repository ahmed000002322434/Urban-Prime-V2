

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

const KitchenwarePage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [cookware, setCookware] = useState<Item[]>([]);
    const [bakeware, setBakeware] = useState<Item[]>([]);
    const [dinnerware, setDinnerware] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Added missing page property to the pagination object.
        itemService.getItems({ category: 'kitchenware-dining' }, { page: 1, limit: 12 })
            .then(data => {
                // Mock filtering for demonstration
                setCookware(data.items.slice(0, 4));
                setBakeware(data.items.slice(4, 8));
                setDinnerware(data.items.slice(8, 12));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-200">
                     <img src="https://picsum.photos/seed/kitchen-hero/1920/1080" alt="Modern kitchen" className="absolute inset-0 w-full h-full object-cover"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4 bg-black/30">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-serif-display text-white">The Heart of the Home</h1>
                        <p className="mt-4 text-lg max-w-xl text-gray-100">Equip your kitchen with high-quality cookware, bakeware, and dining essentials.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Cookware" linkTo="/browse?category=kitchenware-dining" />
                        <ProductGrid items={cookware} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Bakeware" linkTo="/browse?category=kitchenware-dining" />
                        <ProductGrid items={bakeware} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Dinnerware & Serveware" linkTo="/browse?category=kitchenware-dining" />
                        <ProductGrid items={dinnerware} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default KitchenwarePage;