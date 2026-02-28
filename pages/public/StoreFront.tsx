
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { storefrontService } from '../../services/storefrontService';
import { itemService } from '../../services/itemService';
import type { StoreLayout } from '../../storeTypes';
import type { Store, Item } from '../../types';
import Spinner from '../../components/Spinner';
import EditableHero from '../../components/builder/sections/EditableHero';
import EditableProductGrid from '../../components/builder/sections/EditableProductGrid';
import EditableTextSection from '../../components/builder/sections/EditableTextSection';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

const StoreFront: React.FC = () => {
    const { storeSlug } = useParams<{ storeSlug: string }>();
    const [layout, setLayout] = useState<StoreLayout | null>(null);
    const [storeBase, setStoreBase] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStore = async () => {
            if (!storeSlug) return;
            setIsLoading(true);
            try {
                const store = await storefrontService.getStorefrontBySlug(storeSlug);
                if (store && store.layout) {
                    setStoreBase(store);
                    setLayout(JSON.parse(store.layout));
                } else {
                    setError("Store not found or not published.");
                }
            } catch (err) {
                setError("Error loading store.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStore();
    }, [storeSlug]);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-black"><Spinner size="lg" /></div>;
    if (error || !layout) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white text-center p-8">
            <LottieAnimation src={uiLottieAnimations.error404} className="h-56 w-56" loop autoplay />
            <p className="text-gray-500 mb-8">{error || "This store is currently unavailable."}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full font-bold uppercase tracking-widest">
                <LottieAnimation src={uiLottieAnimations.home} alt="Home icon" className="h-5 w-5 object-contain" loop autoplay />
                Return Home
            </Link>
        </div>
    );

    return (
        <HelmetProvider>
            <div className="min-h-screen" style={{ backgroundColor: layout.theme.backgroundColor, fontFamily: layout.theme.font }}>
                <Helmet>
                    <title>{layout.seo.metaTitle || storeBase?.name}</title>
                    <meta name="description" content={layout.seo.metaDescription} />
                    <meta property="og:title" content={layout.seo.metaTitle || storeBase?.name} />
                    <meta property="og:description" content={layout.seo.metaDescription} />
                    <meta property="og:image" content={layout.seo.socialImage} />
                    <meta property="og:type" content="website" />
                </Helmet>

                <nav className="h-16 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 flex items-center px-6">
                    <h1 className="text-xl font-black uppercase tracking-tighter" style={{ color: layout.theme.primaryColor }}>
                        {storeBase?.name}
                    </h1>
                </nav>

                <main>
                    {layout.sections.map(section => (
                        <div key={section.id}>
                            {section.type === 'hero' && <EditableHero content={section.content} theme={layout.theme} />}
                            {section.type === 'products' && <EditableProductGrid content={section.content} theme={layout.theme} />}
                            {section.type === 'info' && <EditableTextSection content={section.content} theme={layout.theme} />}
                        </div>
                    ))}
                </main>

                <footer className="py-20 bg-gray-50 text-center border-t">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Powered by Urban Prime</p>
                </footer>
            </div>
        </HelmetProvider>
    );
};

export default StoreFront;
