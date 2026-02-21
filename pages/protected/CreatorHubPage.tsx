



import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { supplierService } from '../../services/supplierService';
import { itemService } from '../../services/itemService';
import { analyzeMarketTrends } from '../../services/geminiService';
import type { SupplierProduct, Item, TrendAnalysis } from '../../types';
import Spinner from '../../components/Spinner';
import SetPriceModal from '../../components/SetPriceModal';
import { useNotification } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';

// --- Icons ---
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4a4.5 4.5 0 1 0 0 5.2a4.5 4.5 0 1 0 0-5.2Z"/><path d="M16.5 9.4a4.5 4.5 0 1 1 0 5.2"/><path d="M3 12h13.5"/><path d="M21 12h-1.5"/><path d="M12 3v18"/></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const TrendsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 2c1.5 2.5 4 4 4 7 0 2.5-2.5 4.5-4 4.5s-4-2-4-4.5c0-3 2.5-4.5 4-7z"/><path d="M12 11.5c-2 2-3 4-3 6 0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0-2-1-4-3-6z"/></svg>;
const GemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M12 22 6 9l-4-6h12Z"/></svg>;
const CategoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

// --- Sub-components (moved outside main component to fix React error) ---
const SupplierProductCard: React.FC<{ product: SupplierProduct; onImport: (product: SupplierProduct) => void; }> = ({ product, onImport }) => {
    const { currency } = useTranslation();
    const imageUrl = product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/400/300`;
    return (
        <div className="bg-surface rounded-lg shadow-soft border border-border overflow-hidden flex flex-col">
            <img src={imageUrl} alt={product.title} className="w-full h-40 object-cover" />
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-sm truncate flex-grow text-text-primary">{product.title}</h3>
                <p className="text-xs text-text-secondary mt-1">{product.supplierName}</p>
                <div className="mt-3 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-text-secondary">Wholesale</p>
                        <p className="font-bold text-primary">{currency.symbol}{product.wholesalePrice.toFixed(2)}</p>
                    </div>
                    <button onClick={() => onImport(product)} className="px-3 py-1 bg-black text-white font-semibold rounded-md text-xs hover:bg-gray-800">
                        Import
                    </button>
                </div>
            </div>
        </div>
    );
};

// FIX: Moved TabButton component outside of CreatorHubPage to prevent re-definition on every render,
// which causes React Hook errors. Added dark mode styling.
const TabButton: React.FC<{
    tab: 'find' | 'my-products' | 'orders' | 'trends' | 'intelligence';
    activeTab: 'find' | 'my-products' | 'orders' | 'trends' | 'intelligence';
    onClick: (tab: 'find' | 'my-products' | 'orders' | 'trends' | 'intelligence') => void;
    children: React.ReactNode;
}> = ({ tab, activeTab, onClick, children }) => (
    <button
        onClick={() => onClick(tab)}
        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === tab 
            ? 'bg-primary/10 text-primary' 
            : 'text-text-secondary hover:bg-surface-soft'
        }`}
    >
        {children}
    </button>
);


const CreatorHubPage: React.FC = () => {
    // --- HOOKS (MUST BE AT THE TOP) ---
    const { user } = useAuth();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'find' | 'my-products' | 'orders' | 'trends' | 'intelligence'>('find');
    const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
    const [isLoadingSupplier, setIsLoadingSupplier] = useState(true);
    const [productToImport, setProductToImport] = useState<SupplierProduct | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [myProducts, setMyProducts] = useState<Item[]>([]);
    const [isLoadingMyProducts, setIsLoadingMyProducts] = useState(false);
    const [trends, setTrends] = useState<TrendAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const mockOrders = [
        { id: 'ds-1', item: 'Wireless Earbuds', status: 'processing', profit: 18.5, eta: '3-5 days' },
        { id: 'ds-2', item: 'Minimalist Lamp', status: 'shipped', profit: 24.2, eta: '2-4 days' },
        { id: 'ds-3', item: 'Travel Organizer', status: 'delivered', profit: 12.0, eta: 'Delivered' }
    ];

    const intelligenceSignals = useMemo(() => {
        const marginScores = myProducts.map(item => {
            const price = item.salePrice || 0;
            const cost = (item.wholesalePrice || 0) + (item.supplierInfo?.shippingCost || 0);
            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
            return { id: item.id, title: item.title, margin };
        }).sort((a, b) => a.margin - b.margin);

        return {
            marginAlerts: marginScores.slice(0, 3),
            supplierHealth: 96,
            deliverySla: 92,
            chargebackRisk: 'Low',
            nextActions: [
                { title: 'Enable auto-reprice for low-margin items', action: 'Enable automation' },
                { title: 'Request samples for top 3 trending picks', action: 'Request samples' },
                { title: 'Turn on branded inserts for premium SKUs', action: 'Enable branding' }
            ]
        };
    }, [myProducts]);

    const fetchMyProducts = useCallback(async () => {
        if (user) {
            setIsLoadingMyProducts(true);
            const allItems = await itemService.getItemsByOwner(user.id);
            setMyProducts(allItems.filter(item => item.productType === 'dropship'));
            setIsLoadingMyProducts(false);
        }
    }, [user]);

    useEffect(() => {
        supplierService.getProducts().then(setSupplierProducts).finally(() => setIsLoadingSupplier(false));
        fetchMyProducts();
    }, [fetchMyProducts]);
    
    // --- LOGIC & RENDER (AFTER HOOKS) ---
    const handleAnalyzeTrends = async () => {
        setIsAnalyzing(true);
        setTrends(null);
        try {
            const trendData = await analyzeMarketTrends();
            setTrends(trendData);
        } catch (error) {
            console.error(error);
            showNotification("Failed to analyze market trends.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImport = async (salePrice: number) => {
        if (!productToImport || !user) return;
        setIsImporting(true);
        try {
            await itemService.importDropshipItem(productToImport, salePrice, user);
            showNotification(`${productToImport.title} has been imported to your products!`);
            setProductToImport(null);
            await fetchMyProducts(); // Refresh my products list
        } catch (error) {
            console.error(error);
            showNotification("Failed to import product.");
        } finally {
            setIsImporting(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'find':
                return isLoadingSupplier ? <Spinner /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {supplierProducts.map(p => <SupplierProductCard key={p.id} product={p} onImport={setProductToImport} />)}
                    </div>
                );
            case 'my-products':
                 return isLoadingMyProducts ? <Spinner /> : (
                    <div className="space-y-4">
                        {myProducts.length > 0 ? myProducts.map(item => (
                             <div key={item.id} className="p-3 bg-surface rounded-md border border-border flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                 <img src={item.imageUrls?.[0] || item.images?.[0] || `https://picsum.photos/seed/${item.id}/200/200`} alt={item.title} className="w-16 h-16 rounded object-cover" />
                                 <div className="flex-1">
                                    <Link to={`/item/${item.id}`} className="font-bold hover:underline text-text-primary">{item.title}</Link>
                                    <p className="text-xs text-text-secondary">From: {item.supplierInfo?.name}</p>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-sm text-text-secondary">Your Price</p>
                                     <p className="font-bold text-lg text-text-primary">{currency.symbol}{(item.salePrice || 0).toFixed(2)}</p>
                                 </div>
                                  <div className="text-right">
                                     <p className="text-sm text-text-secondary">Profit</p>
                                     <p className="font-bold text-lg text-green-600">{currency.symbol}{((item.salePrice || 0) - (item.wholesalePrice || 0) - (item.supplierInfo?.shippingCost || 0)).toFixed(2)}</p>
                                 </div>
                             </div>
                        )) : <p className="text-center text-text-secondary py-10">You haven't imported any products yet.</p>}
                    </div>
                );
            case 'orders':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-surface p-3 sm:p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Orders in Progress</p>
                                <p className="text-2xl font-bold text-text-primary">{mockOrders.filter(o => o.status !== 'delivered').length}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Avg Profit / Order</p>
                                <p className="text-2xl font-bold text-text-primary">{currency.symbol}{(mockOrders.reduce((sum, o) => sum + o.profit, 0) / mockOrders.length).toFixed(2)}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Supplier SLA</p>
                                <p className="text-2xl font-bold text-text-primary">98%</p>
                            </div>
                        </div>
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                            <div className="px-4 py-3 bg-surface-soft border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">Live Dropship Orders</div>
                            <div className="divide-y divide-border">
                                {mockOrders.map(order => (
                                    <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-text-primary">{order.item}</p>
                                            <p className="text-xs text-text-secondary">ETA: {order.eta}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{order.status}</span>
                                            <span className="text-sm font-semibold text-text-primary">{currency.symbol}{order.profit.toFixed(2)} profit</span>
                                            <button className="text-xs font-bold text-primary hover:underline">Track</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'intelligence':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-surface p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Supplier Health</p>
                                <p className="text-2xl font-bold text-text-primary">{intelligenceSignals.supplierHealth}%</p>
                                <p className="text-xs text-text-secondary mt-1">On-time processing & QC</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Delivery SLA</p>
                                <p className="text-2xl font-bold text-text-primary">{intelligenceSignals.deliverySla}%</p>
                                <p className="text-xs text-text-secondary mt-1">Last 30 days</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border border-border">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Chargeback Risk</p>
                                <p className="text-2xl font-bold text-text-primary">{intelligenceSignals.chargebackRisk}</p>
                                <p className="text-xs text-text-secondary mt-1">Based on returns & disputes</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                            <div className="bg-surface rounded-xl border border-border p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-4">Margin Guardrails</h3>
                                {intelligenceSignals.marginAlerts.length > 0 ? (
                                    <div className="space-y-3">
                                        {intelligenceSignals.marginAlerts.map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-3 last:border-none last:pb-0">
                                                <div>
                                                    <p className="font-semibold text-text-primary">{item.title}</p>
                                                    <p className="text-xs text-text-secondary">Margin {item.margin.toFixed(1)}%</p>
                                                </div>
                                                <button
                                                    onClick={() => showNotification(`Suggested repricing for ${item.title}.`)}
                                                    className="px-3 py-1 rounded-full border border-border text-xs font-semibold hover:border-primary hover:text-primary"
                                                >
                                                    Optimize
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-secondary">No margin risks detected.</p>
                                )}
                            </div>
                            <div className="bg-surface rounded-xl border border-border p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-4">Next Best Actions</h3>
                                <div className="space-y-3">
                                    {intelligenceSignals.nextActions.map(action => (
                                        <div key={action.title} className="flex items-center justify-between text-sm border-b border-border/60 pb-3 last:border-none last:pb-0">
                                            <p className="text-text-secondary">{action.title}</p>
                                            <button
                                                onClick={() => showNotification(action.action)}
                                                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                                            >
                                                {action.action}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'trends':
                return (
                    <div className="bg-surface p-6 rounded-lg shadow-soft border border-border">
                        <h2 className="text-xl font-bold font-display mb-2 text-text-primary">AI Product & Trend Forecaster</h2>
                        <p className="text-sm text-text-secondary mb-6">Discover winning products before they peak. Our AI analyzes market data, social media, and sales velocity to find your next bestseller.</p>

                        {!trends && !isAnalyzing && (
                            <div className="text-center py-10">
                                <button onClick={handleAnalyzeTrends} className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 mx-auto">
                                    🔮 Analyze Market Trends
                                </button>
                            </div>
                        )}

                        {isAnalyzing && <Spinner size="lg" />}

                        {trends && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary"><CategoryIcon /> Top Trending Categories</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {trends.trendingCategories.map(cat => (
                                            <div key={cat.category} className="p-4 bg-surface-soft rounded-lg">
                                                <p className="font-semibold text-text-primary">{cat.category}</p>
                                                <p className="text-sm text-text-secondary">{cat.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary"><FireIcon /> Hot Products Right Now</h3>
                                    <div className="space-y-3">
                                        {trends.hotProducts.map(prod => (
                                            <div key={prod.name} className="p-4 bg-surface-soft rounded-lg flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-text-primary">{prod.name}</p>
                                                    <p className="text-sm text-text-secondary">{prod.reason}</p>
                                                </div>
                                                <div className="text-center ml-4 flex-shrink-0">
                                                    <p className="text-xs text-text-secondary">Opportunity</p>
                                                    <p className="text-2xl font-bold text-primary">{prod.opportunityScore}/10</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary"><GemIcon /> Hidden Gems</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {trends.hiddenGems.map(gem => (
                                            <div key={gem.name} className="p-4 bg-surface-soft rounded-lg">
                                                <p className="font-semibold text-text-primary">{gem.name}</p>
                                                <p className="text-sm text-text-secondary">{gem.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <>
        <div className="bg-background min-h-[calc(100vh-80px)]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                <header className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">Creator Hub</h1>
                    <p className="text-text-secondary">Your dashboard for managing your dropshipping business.</p>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-surface p-4 rounded-lg border border-border">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Imported Products</p>
                        <p className="text-2xl font-bold text-text-primary">{myProducts.length}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Active Suppliers</p>
                        <p className="text-2xl font-bold text-text-primary">{new Set(myProducts.map(p => p.supplierInfo?.name).filter(Boolean)).size || 0}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Auto-fulfill</p>
                        <p className="text-2xl font-bold text-text-primary">Enabled</p>
                    </div>
                </div>
                <div className="flex gap-2 p-2 bg-surface rounded-lg shadow-sm border border-border mb-6 overflow-x-auto no-scrollbar">
                    <TabButton tab="find" activeTab={activeTab} onClick={setActiveTab}><SearchIcon /> Find Products</TabButton>
                    <TabButton tab="trends" activeTab={activeTab} onClick={setActiveTab}><TrendsIcon /> Trends</TabButton>
                    <TabButton tab="intelligence" activeTab={activeTab} onClick={setActiveTab}><FireIcon /> Intelligence</TabButton>
                    <TabButton tab="my-products" activeTab={activeTab} onClick={setActiveTab}><PackageIcon /> My Products</TabButton>
                    <TabButton tab="orders" activeTab={activeTab} onClick={setActiveTab}><DollarSignIcon /> Orders</TabButton>
                </div>
                <div>{renderContent()}</div>
            </div>
        </div>
        {productToImport && (
            <SetPriceModal 
                supplierProduct={productToImport} 
                onClose={() => setProductToImport(null)}
                onImport={handleImport}
                isImporting={isImporting}
            />
        )}
        </>
    );
};

export default CreatorHubPage;

