import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { Item } from '../../types';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import QuickViewModal from '../../components/QuickViewModal';
import ItemCard from '../../components/ItemCard';

const WomensClothingPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const shopLookRef = useScrollReveal<HTMLDivElement>();
    const essentialsRef = useScrollReveal<HTMLDivElement>();
    
    const [essentials, setEssentials] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        itemService.getItems({ category: 'womens-clothing' }, { page: 1, limit: 4 })
            .then(data => {
                setEssentials(data.items);
                setIsLoading(false);
            });
    }, []);

    const look = {
        mainImage: 'https://picsum.photos/seed/wlook-main/800/1000',
        items: [
            { id: 'item-w-dress', name: 'Flowy Maxi Dress', imageUrl: 'https://picsum.photos/seed/wlook-dress/400/400' },
            { id: 'item-w-bag', name: 'Leather Crossbody Bag', imageUrl: 'https://picsum.photos/seed/wlook-bag/400/400' },
            { id: 'item-w-shoes', name: 'Strappy Sandals', imageUrl: 'https://picsum.photos/seed/wlook-shoes/400/400' },
        ]
    };

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="bg-white dark:bg-dark-background text-gray-800 dark:text-dark-text animate-fade-in-up">
                <section ref={heroRef} className="animate-reveal relative h-[70vh] text-white">
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" poster="https://picsum.photos/seed/w-hero-poster/1920/1080">
                        {/* Mock video */}
                    </video>
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-4">
                        <h1 className="text-5xl md:text-7xl font-extrabold font-serif-display">Effortless Elegance</h1>
                        <p className="mt-4 text-lg max-w-xl">Curated styles for the modern woman. Confident, chic, and timeless.</p>
                    </div>
                </section>

                <section ref={shopLookRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <h2 className="text-4xl font-bold font-serif-display text-center mb-12">Shop the Look</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="aspect-[4/5] rounded-lg overflow-hidden">
                            <img src={look.mainImage} alt="Model wearing curated look" className="w-full h-full object-cover"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {look.items.map((item, index) => (
                                <Link to="#" key={item.id} className="group" style={{ transitionDelay: `${index * 100}ms` }}>
                                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                    <h3 className="font-semibold text-sm mt-2">{item.name}</h3>
                                </Link>
                            ))}
                             <div className="col-span-2">
                                <Link to="/browse?category=womens-clothing" className="block w-full text-center mt-4 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
                                    Shop All New Arrivals
                                </Link>
                             </div>
                        </div>
                    </div>
                </section>
                
                <section ref={essentialsRef} className="animate-reveal bg-gray-50/50 dark:bg-dark-surface py-24">
                     <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-4xl font-bold font-serif-display text-center mb-12">The Essentials</h2>
                        {isLoading ? <Spinner /> : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {essentials.map(item => (
                                    <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
};

export default WomensClothingPage;