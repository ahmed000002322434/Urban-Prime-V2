
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
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

const MensClothingPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [shirts, setShirts] = useState<Item[]>([]);
    const [jackets, setJackets] = useState<Item[]>([]);
    const [pants, setPants] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items } = await itemService.getItems({ category: 'mens-clothing' }, { page: 1, limit: 20 });
                // Simple filtering based on title for demonstration
                setShirts(items.filter(i => i.title.toLowerCase().includes('shirt')).slice(0, 4));
                setJackets(items.filter(i => i.title.toLowerCase().includes('jacket')).slice(0, 4));
                setPants(items.filter(i => i.title.toLowerCase().includes('pants') || i.title.toLowerCase().includes('jeans')).slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch men's clothing items:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, []);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-800 text-white">
                    <img src="https://picsum.photos/seed/men-hero/1920/1080" alt="Men's Fashion" className="absolute inset-0 w-full h-full object-cover opacity-50"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-display">Men's Collection</h1>
                        <p className="mt-4 text-lg max-w-xl">Refined style for the discerning gentleman. Quality, comfort, and craftsmanship.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Shirts" linkTo="/browse?category=mens-clothing" />
                        <ProductGrid items={shirts} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Jackets & Outerwear" linkTo="/browse?category=mens-clothing" />
                        <ProductGrid items={jackets} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Pants & Jeans" linkTo="/browse?category=mens-clothing" />
                        <ProductGrid items={pants} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default MensClothingPage;
