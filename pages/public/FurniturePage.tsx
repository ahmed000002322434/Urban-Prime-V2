

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

const FurniturePage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [livingRoom, setLivingRoom] = useState<Item[]>([]);
    const [bedroom, setBedroom] = useState<Item[]>([]);
    const [office, setOffice] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Added missing page property to the pagination object.
        itemService.getItems({ category: 'furniture' }, { page: 1, limit: 12 })
            .then(data => {
                // Mock filtering for demonstration
                setLivingRoom(data.items.slice(0, 4));
                setBedroom(data.items.slice(4, 8));
                setOffice(data.items.slice(8, 12));
                setIsLoading(false);
            });
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-200">
                     <img src="https://picsum.photos/seed/furniture-hero/1920/1080" alt="Stylish living room" className="absolute inset-0 w-full h-full object-cover"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4 bg-black/30">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-serif-display text-white">Design Your Dream Space</h1>
                        <p className="mt-4 text-lg max-w-xl text-gray-100">From statement pieces to essential comforts, find furniture that brings your vision to life.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Living Room Furniture" linkTo="/browse?category=furniture" />
                        <ProductGrid items={livingRoom} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Bedroom Furniture" linkTo="/browse?category=furniture" />
                        <ProductGrid items={bedroom} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Office Furniture" linkTo="/browse?category=furniture" />
                        <ProductGrid items={office} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default FurniturePage;