
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

const WomensClothingPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    
    const [dresses, setDresses] = useState<Item[]>([]);
    const [tops, setTops] = useState<Item[]>([]);
    const [accessories, setAccessories] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items: allWomenItems } = await itemService.getItems({ category: 'womens-clothing' }, { page: 1, limit: 12 });
                // FIX: Property 'page' is missing in type '{ limit: number; }'.
                const { items: allAccessoryItems } = await itemService.getItems({ category: 'womens-accessories' }, { page: 1, limit: 4 });

                // Simple filtering based on title for demonstration
                setDresses(allWomenItems.filter(i => i.title.toLowerCase().includes('dress')).slice(0, 4));
                setTops(allWomenItems.filter(i => i.title.toLowerCase().includes('shirt') || i.title.toLowerCase().includes('top') || i.title.toLowerCase().includes('blouse')).slice(0, 4));
                setAccessories(allAccessoryItems);
            } catch (error) {
                console.error("Failed to fetch women's clothing items:", error);
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
                <section ref={heroRef} className="animate-reveal relative h-[50vh] bg-gray-200">
                    <img src="https://picsum.photos/seed/w-hero-poster/1920/1080" alt="Women's Fashion" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30"></div>
                    <div className="relative h-full flex flex-col items-center justify-center text-center text-white p-4">
                        <h1 className="text-5xl md:text-6xl font-extrabold font-serif-display">Women's Collection</h1>
                        <p className="mt-4 text-lg max-w-xl">Confident, chic, and timeless styles for the modern woman.</p>
                    </div>
                </section>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    <section>
                        <SectionHeader title="Dresses" linkTo="/browse?category=womens-clothing" />
                        <ProductGrid items={dresses} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                    
                    <section>
                        <SectionHeader title="Tops & Shirts" linkTo="/browse?category=womens-clothing" />
                        <ProductGrid items={tops} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>

                    <section>
                        <SectionHeader title="Accessories" linkTo="/womens-accessories" />
                        <ProductGrid items={accessories} onQuickView={setQuickViewItem} isLoading={isLoading} />
                    </section>
                </main>
            </div>
        </>
    );
};

export default WomensClothingPage;
