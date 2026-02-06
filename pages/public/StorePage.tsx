

import React, { useState, useEffect } from 'react';
import { useStore } from '../../layouts/StoreLayout';
import { itemService, reelService } from '../../services/itemService';
import StoreHeader from '../../components/storefront/StoreHeader';
// FIX: Changed import to a named import.
import { StorefrontRenderer } from '../../components/storefront/StorefrontRenderer';
import type { Item, Reel } from '../../types';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import { Link } from 'react-router-dom';

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const ProductsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>;
const PixesIcon = () => <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="w-5 h-5 object-contain" />;

const StorePage: React.FC = () => {
    const storefront = useStore();
    const [activeTab, setActiveTab] = useState<'home' | 'products' | 'pixes'>('home');
    const [activePageSlug, setActivePageSlug] = useState('home');
    
    const [items, setItems] = useState<Item[]>([]);
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoadingContent(true);
            try {
                const [itemsData, reelsData] = await Promise.all([
                    itemService.getItemsByOwner(storefront.ownerId),
                    reelService.getReelsByCreator(storefront.ownerId)
                ]);
                setItems(itemsData);
                setReels(reelsData.filter(r => r.status === 'published'));
            } catch (error) {
                console.error("Failed to load store content", error);
            } finally {
                setIsLoadingContent(false);
            }
        };
        fetchContent();
    }, [storefront.ownerId]);

    const handleNavClick = (slug: string) => {
        setActiveTab('home');
        setActivePageSlug(slug);
    };

    const activePage = storefront.pages?.find(p => p.slug === activePageSlug) || storefront.pages?.[0];

    const TabButton: React.FC<{ tab: 'home' | 'products' | 'pixes', icon: React.ReactNode, label: string, count: number }> = ({ tab, icon, label, count }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors text-sm ${activeTab === tab ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
            {icon} {label} ({count})
        </button>
    );

    const renderContent = () => {
        if (isLoadingContent) {
            return <div className="py-20 flex justify-center"><Spinner size="lg" /></div>;
        }

        switch (activeTab) {
            case 'home':
                return activePage ? (
                    <StorefrontRenderer page={activePage} brandingKit={storefront.brandingKit} ownerId={storefront.ownerId} />
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <h3 className="text-xl font-semibold text-gray-700">Page Not Found</h3>
                        <p>This store doesn't have a home page configured yet.</p>
                    </div>
                );
            case 'products':
                return items.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8">
                        {items.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                    </div>
                ) : <p className="text-center py-20 text-gray-500">This store has not listed any products yet.</p>;
            case 'pixes':
                return reels.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-8">
                        {reels.map(reel => (
                            <Link to="/reels" key={reel.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden">
                                <img src={reel.coverImageUrl} alt={reel.caption} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            </Link>
                        ))}
                    </div>
                ) : <p className="text-center py-20 text-gray-500">This store has not created any Pixes yet.</p>;
            default:
                return null;
        }
    };
    
    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            {storefront.banner && <div className="bg-[var(--theme-accent)] text-center p-2 font-semibold text-sm">{storefront.banner.text}</div>}
            
            <StoreHeader 
                brandingKit={storefront.brandingKit} 
                pages={storefront.pages} 
                activePageSlug={activePageSlug} 
                onNavClick={handleNavClick} 
            />
            
            <div className="border-b bg-white/80 backdrop-blur-md">
                <div className="container mx-auto flex justify-center">
                    <TabButton tab="home" icon={<HomeIcon/>} label="Home" count={storefront.pages.length} />
                    <TabButton tab="products" icon={<ProductsIcon/>} label="Products" count={items.length} />
                    <TabButton tab="pixes" icon={<PixesIcon/>} label="Pixes" count={reels.length} />
                </div>
            </div>

            <div className="animate-fade-in-up">
                {renderContent()}
            </div>

            <footer className="p-10 text-center" style={{'fontFamily': `'${storefront.brandingKit?.fontPairing?.body || 'Inter'}', sans-serif`, backgroundColor: '#11182C', color: 'white'}}>
                <p>Powered by Urban Prime</p>
            </footer>
        </>
    );
};

export default StorePage;