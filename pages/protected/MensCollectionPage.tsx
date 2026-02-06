
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';

const MensClothingPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const newArrivalsRef = useScrollReveal<HTMLDivElement>();
    const categoriesRef = useScrollReveal<HTMLDivElement>();
    
    const [newArrivals, setNewArrivals] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'mens-clothing' }, { page: 1, limit: 8 })
            .then(data => {
                setNewArrivals(data.items);
                setIsLoading(false);
            });
    }, []);

    const categories = [
        { name: 'Shirts', link: '/browse?category=mens-clothing', image: 'https://picsum.photos/seed/mcat-shirts/600/800' },
        { name: 'Jackets', link: '/browse?category=mens-clothing', image: 'https://picsum.photos/seed/mcat-jackets/600/800' },
        { name: 'Pants', link: '/browse?category=mens-clothing', image: 'https://picsum.photos/seed/mcat-pants/600/800' },
        { name: 'Suits', link: '/browse?category=mens-clothing', image: 'https://picsum.photos/seed/mcat-suits/600/800' },
    ];

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-gray-100 dark:bg-dark-background text-gray-800 dark:text-dark-text animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[60vh] text-white bg-black">
                    <img src="https://picsum.photos/seed/men-hero/1920/1080" alt="Men's Fashion" className="absolute inset-0 w-full h-full object-cover opacity-50"/>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4">
                        <h1 className="text-5xl md:text-7xl font-extrabold font-display">Modern Menswear</h1>
                        <p className="mt-4 text-lg max-w-xl">Refined style for the discerning gentleman. Quality, comfort, and craftsmanship.</p>
                    </div>
                </section>

                <section ref={newArrivalsRef} className="animate-reveal py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-4xl font-bold font-display text-center mb-12">New Arrivals</h2>
                        {isLoading ? <Spinner /> : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {newArrivals.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                            </div>
                        )}
                    </div>
                </section>
                
                <section ref={categoriesRef} className="animate-reveal bg-white dark:bg-dark-surface py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-4xl font-bold font-display text-center mb-12">Shop by Category</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {categories.map(cat => (
                                <Link key={cat.name} to={cat.link} className="group">
                                    <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                    <h3 className="font-semibold text-center mt-4">{cat.name}</h3>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default MensClothingPage;
