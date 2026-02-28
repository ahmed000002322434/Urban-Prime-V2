import React, { useState, useEffect, createContext, useContext } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { storefrontService } from '../services/storefrontService';
import type { Store } from '../types';
import Spinner from '../components/Spinner';
import LottieAnimation from '../components/LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

// Context to provide store data to child pages
const StoreContext = createContext<Store | null>(null);
export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useStore must be used within a StoreLayout");
    }
    return context;
};

const StoreLayout: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [storefront, setStorefront] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setError("Store not found.");
            setIsLoading(false);
            return;
        }

        const fetchStore = async () => {
            setIsLoading(true);
            try {
                const data = await storefrontService.getStorefrontBySlug(slug);
                if (data) {
                    setStorefront(data);
                } else {
                    setError(`No store found with the name "${slug}".`);
                }
            } catch (err) {
                setError("An error occurred while fetching the store.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStore();
    }, [slug]);
    
    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (error || !storefront) {
        return (
            <div className="container mx-auto text-center py-20">
                <h2 className="text-2xl text-red-500">Error</h2>
                <p className="mt-2 text-gray-500">{error || 'Store data could not be loaded.'}</p>
                <Link to="/" className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-black text-white rounded-md">
                    <LottieAnimation src={uiLottieAnimations.home} alt="Home icon" className="h-5 w-5 object-contain" loop autoplay />
                    Back to Home
                </Link>
            </div>
        );
    }
    
    const { brandingKit } = storefront;
    const customStyles = {
        '--theme-primary': brandingKit?.palette?.primary || '#3a77ff',
        '--theme-secondary': brandingKit?.palette?.secondary || '#f8f9fa',
        '--theme-accent': brandingKit?.palette?.accent || '#ffce32',
    } as React.CSSProperties;

    return (
        <StoreContext.Provider value={storefront}>
            <div style={customStyles} className="bg-[var(--theme-secondary)] text-gray-800 min-h-screen">
                <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${brandingKit?.fontPairing?.heading?.replace(' ', '+') || 'Lexend'}:wght@700;900&family=${brandingKit?.fontPairing?.body?.replace(' ', '+') || 'Inter'}:wght@400;600&display=swap`}/>
                
                <main style={{fontFamily: `'${brandingKit?.fontPairing?.body || 'Inter'}', sans-serif`}}>
                    <Outlet />
                </main>
            </div>
        </StoreContext.Provider>
    );
};

export default StoreLayout;
