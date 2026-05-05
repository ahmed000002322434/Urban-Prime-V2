import React, { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { itemService, serviceService, userService, reelService } from '../../services/itemService';
import type { Item, Category, Service, ChatThread, Reel, User } from '../../types';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';
import SkeletonCard from '../../components/SkeletonCard';
import QuickViewModal from '../../components/QuickViewModal';
import StarRating from '../../components/StarRating';
import LottieAnimation from '../../components/LottieAnimation';
import { useCategories } from '../../context/CategoryContext';
import { useAuth } from '../../hooks/useAuth';
import { useBrowsingHistory } from '../../hooks/useBrowsingHistory'; // NEW
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ShuffleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.828L12 12m0 0l-3.182-3.182M12 12l3.182 3.182M12 12l-3.182 3.182M3.75 7.5h4.992V12m-4.993 0l3.182 3.182a8.25 8.25 0 0011.667 0l3.182-3.182m-13.5-2.828L12 12m0 0l3.182-3.182m0 0l3.182 3.182m0 0l3.182 3.182" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

const DEFAULT_PRICE_RANGE: [number, number] = [0, 10000];
const BRANDS_CACHE_KEY = 'urbanprime:browse:brands:v1';
const BRANDS_CACHE_TTL_MS = 1000 * 60 * 20;
type GlobalSearchSectionKey = 'pages' | 'features' | 'users' | 'items' | 'services' | 'messages' | 'pixes';

interface GlobalSearchEntry {
    id: string;
    title: string;
    subtitle: string;
    to: string;
}

type GlobalSearchResults = Record<GlobalSearchSectionKey, GlobalSearchEntry[]>;

const EMPTY_GLOBAL_RESULTS: GlobalSearchResults = {
    pages: [],
    features: [],
    users: [],
    items: [],
    services: [],
    messages: [],
    pixes: []
};

const PAGE_SEARCH_INDEX: GlobalSearchEntry[] = [
    { id: 'page-home', title: 'Home', subtitle: 'Urban Prime home feed', to: '/' },
    { id: 'page-explore', title: 'Explore', subtitle: 'Discover modules and directories', to: '/explore' },
    { id: 'page-browse', title: 'Browse products', subtitle: 'Marketplace product discovery', to: '/browse' },
    { id: 'page-services', title: 'Browse services', subtitle: 'Service provider listings', to: '/browse/services' },
    { id: 'page-sellers', title: 'Seller directory', subtitle: 'Explore seller personas', to: '/sellers' },
    { id: 'page-buyers', title: 'Buyer directory', subtitle: 'Explore buyer personas', to: '/buyers' },
    { id: 'page-renters', title: 'Renter directory', subtitle: 'Explore renter personas', to: '/renters' },
    { id: 'page-stores', title: 'Stores', subtitle: 'Public store directory', to: '/stores' },
    { id: 'page-pixe', title: 'Pixe', subtitle: 'Creator and short-form hub', to: '/pixe' },
    { id: 'page-reels', title: 'Reels', subtitle: 'Vertical media discovery', to: '/reels' },
    { id: 'page-live', title: 'Live shopping', subtitle: 'Live commerce sessions', to: '/live' },
    { id: 'page-features', title: 'Features', subtitle: 'Platform feature hub', to: '/features' }
];

const FEATURE_SEARCH_INDEX: GlobalSearchEntry[] = [
    { id: 'feature-deals', title: 'Deals and promotions', subtitle: 'Flash offers and campaigns', to: '/deals' },
    { id: 'feature-new-arrivals', title: 'New arrivals', subtitle: 'Latest marketplace drops', to: '/new-arrivals' },
    { id: 'feature-compare', title: 'Compare items', subtitle: 'Side-by-side item comparison', to: '/compare' },
    { id: 'feature-tracking', title: 'Track order', subtitle: 'Order and delivery tracking', to: '/track-order' },
    { id: 'feature-battles', title: 'Product battles', subtitle: 'Interactive item voting', to: '/battles' },
    { id: 'feature-genie', title: 'Urban Genie', subtitle: 'AI assisted shopping help', to: '/genie' },
    { id: 'feature-dropshipping', title: 'Dropshipping', subtitle: 'Supplier and fulfillment workflows', to: '/dropshipping' },
    { id: 'feature-community', title: 'Community', subtitle: 'Events, guides, and social discovery', to: '/community' }
];

const PIXE_SEARCH_INDEX: GlobalSearchEntry[] = [
    { id: 'pixe-feed', title: 'Pixe feed', subtitle: 'Browse creator content', to: '/pixe' },
    { id: 'pixe-reels', title: 'Reels stream', subtitle: 'Fast vertical video feed', to: '/reels' },
    { id: 'pixe-live', title: 'Live shopping events', subtitle: 'Join creator live sessions', to: '/live' }
];

const GLOBAL_SECTION_META: Record<GlobalSearchSectionKey, { title: string; tone: string }> = {
    pages: { title: 'Pages', tone: 'from-cyan-500/15 to-sky-500/5' },
    features: { title: 'Features', tone: 'from-indigo-500/15 to-blue-500/5' },
    users: { title: 'Users', tone: 'from-emerald-500/15 to-teal-500/5' },
    items: { title: 'Products', tone: 'from-amber-500/15 to-orange-500/5' },
    services: { title: 'Services', tone: 'from-fuchsia-500/15 to-purple-500/5' },
    messages: { title: 'Your messages', tone: 'from-rose-500/15 to-pink-500/5' },
    pixes: { title: 'Pixe', tone: 'from-violet-500/15 to-purple-500/5' }
};

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const includesQuery = (haystack: string, normalizedQuery: string) => haystack.toLowerCase().includes(normalizedQuery);

const formatPriceRange = (range: [number, number]) => {
    const [min, max] = range;
    if (min === 0 && max >= 10000) return 'Any price';
    if (min === 0) return `Under $${max}`;
    if (max >= 10000) return `$${min}+`;
    return `$${min} - $${max}`;
};


const FilterDisclosure: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-border py-4 last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center">
                <span className="font-semibold text-text-primary text-sm uppercase tracking-wider">{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {isOpen && <div className="mt-3 space-y-2">{children}</div>}
        </div>
    );
};

const FilterSidebar: React.FC<{
    allBrands: string[];
    filters: any;
    setFilters: React.Dispatch<React.SetStateAction<any>>;
}> = ({ allBrands, filters, setFilters }) => {
    const { categories } = useCategories();
    
    const handleFilterChange = (key: string, value: any) => {
        setFilters((prev: any) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleCheckboxChange = (key: string, value: string) => {
        const currentValues = filters[key] || [];
        const newValues = currentValues.includes(value) 
            ? currentValues.filter((v: string) => v !== value) 
            : [...currentValues, value];
        handleFilterChange(key, newValues);
    };
    
    // Simple Range Slider for Price
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const newRange = [...filters.priceRange];
        newRange[index] = Number(e.target.value);
        handleFilterChange('priceRange', newRange);
    }

    return (
        <div className="pr-2">
            <FilterDisclosure title="Category" defaultOpen>
                <ul className="space-y-1">
                    <li><button onClick={() => handleFilterChange('category', '')} className={`w-full text-left px-2 py-1 rounded-md text-sm ${!filters.category ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-soft'}`}>All Categories</button></li>
                    {categories.map(cat => (
                        <li key={cat.id}>
                            <button onClick={() => handleFilterChange('category', cat.id)} className={`w-full text-left px-2 py-1 rounded-md text-sm font-medium ${filters.category === cat.id ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-soft'}`}>{cat.name}</button>
                            {filters.category === cat.id && cat.subcategories && (
                                <ul className="pl-3 mt-1 border-l-2 border-border space-y-1">
                                    {cat.subcategories.map(sub => (
                                         <li key={sub.id}><button onClick={(e) => { e.stopPropagation(); handleFilterChange('category', sub.id) }} className={`w-full text-left px-2 py-1 rounded-md text-xs ${filters.category === sub.id ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'}`}>{sub.name}</button></li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </FilterDisclosure>

            <FilterDisclosure title="Price Range" defaultOpen>
                <div className="px-2">
                    <div className="flex justify-between text-xs text-text-secondary mb-2">
                        <span>${filters.priceRange[0]}</span>
                        <span>${filters.priceRange[1]}+</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <input type="number" min="0" value={filters.priceRange[0]} onChange={(e) => handlePriceChange(e, 0)} className="w-20 p-1 text-sm border rounded bg-surface border-border text-text-primary focus:ring-1 focus:ring-primary outline-none" />
                        <span className="text-text-secondary">-</span>
                        <input type="number" min="0" value={filters.priceRange[1]} onChange={(e) => handlePriceChange(e, 1)} className="w-20 p-1 text-sm border rounded bg-surface border-border text-text-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                </div>
            </FilterDisclosure>
            
             <FilterDisclosure title="Type" defaultOpen>
                <div className="space-y-2 px-2">
                     <label className="flex items-center text-sm text-text-primary cursor-pointer"><input type="radio" name="listingType" checked={!filters.listingType} onChange={() => handleFilterChange('listingType', '')} className="mr-2 h-4 w-4 accent-primary" /> All</label>
                     <label className="flex items-center text-sm text-text-primary cursor-pointer"><input type="radio" name="listingType" checked={filters.listingType === 'sale'} onChange={() => handleFilterChange('listingType', 'sale')} className="mr-2 h-4 w-4 accent-primary" /> Buy</label>
                     <label className="flex items-center text-sm text-text-primary cursor-pointer"><input type="radio" name="listingType" checked={filters.listingType === 'rent'} onChange={() => handleFilterChange('listingType', 'rent')} className="mr-2 h-4 w-4 accent-primary"/> Rent</label>
                     <label className="flex items-center text-sm text-text-primary cursor-pointer"><input type="radio" name="listingType" checked={filters.listingType === 'auction'} onChange={() => handleFilterChange('listingType', 'auction')} className="mr-2 h-4 w-4 accent-primary"/> Auction</label>
                </div>
            </FilterDisclosure>

            <FilterDisclosure title="Condition">
                <div className="space-y-2 px-2">
                    {['new', 'used-like-new', 'used-good', 'refurbished'].map(cond => (
                        <label key={cond} className="flex items-center text-sm text-text-primary cursor-pointer">
                            <input type="checkbox" checked={filters.conditions.includes(cond)} onChange={() => handleCheckboxChange('conditions', cond)} className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-surface" /> 
                            <span className="capitalize">{cond.replace(/-/g, ' ')}</span>
                        </label>
                    ))}
                </div>
            </FilterDisclosure>
            
             <FilterDisclosure title="Rating">
                 <div className="space-y-1 px-2">
                    {[4, 3, 2, 1].map(rating => (
                        <button key={rating} onClick={() => handleFilterChange('minRating', rating)} className={`w-full flex items-center gap-2 p-1 rounded hover:bg-surface-soft ${filters.minRating === rating ? 'bg-surface-soft font-bold' : ''}`}>
                            <StarRating rating={rating} size="sm" />
                            <span className="text-xs text-text-secondary">& Up</span>
                        </button>
                    ))}
                 </div>
            </FilterDisclosure>
        </div>
    );
};

// --- Recently Viewed Component ---
const RecentlyViewedBar: React.FC = () => {
    const { historyItems, isLoading } = useBrowsingHistory();
    const navigate = useNavigate();

    if (isLoading || historyItems.length === 0) return null;

    return (
        <div className="mb-6 rounded-2xl border border-border bg-surface/70 p-4 shadow-soft md:mb-8">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Recently Viewed</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:gap-4">
                {historyItems.map(item => (
                    <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="flex-shrink-0 w-32 cursor-pointer group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-border mb-2">
                             <img src={item.imageUrls[0]} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <p className="text-xs font-semibold text-text-primary truncate">{item.title}</p>
                        <p className="text-xs text-text-secondary font-bold">${item.salePrice || item.rentalPrice}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const BrowsePage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { categories } = useCategories();
    const [items, setItems] = useState<Item[]>([]);
    const [allBrands, setAllBrands] = useState<string[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const fetchRequestIdRef = useRef(0);
    const servicesCacheRef = useRef<Service[] | null>(null);
    const threadsCacheRef = useRef<ChatThread[] | null>(null);
    const reelsCacheRef = useRef<Reel[] | null>(null);
    const threadPartnerCacheRef = useRef<Record<string, User | null>>({});
    const globalSearchCacheRef = useRef<Record<string, GlobalSearchResults>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile state
    const [showFilters, setShowFilters] = useState(false); // Desktop state
    const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResults>(EMPTY_GLOBAL_RESULTS);
    const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);

    const [filters, setFilters] = useState({
        query: searchParams.get('q') || '',
        category: searchParams.get('category') || '',
        location: '',
        priceRange: DEFAULT_PRICE_RANGE,
        minRating: 0,
        listingType: '' as 'sale' | 'rent' | 'auction' | '',
        conditions: [] as string[],
        sortBy: 'newest' as 'newest' | 'price_asc' | 'price_desc' | 'popularity',
        page: 1
    });

    const deferredGlobalQuery = useDeferredValue(filters.query);
    const hasGlobalQuery = deferredGlobalQuery.trim().length >= 2;

    const categoryLabel = useMemo(() => {
        if (!filters.category) return '';
        const findCategory = (list: Category[], id: string): string | null => {
            for (const cat of list) {
                if (cat.id === id) return cat.name;
                if (cat.subcategories) {
                    const sub = findCategory(cat.subcategories, id);
                    if (sub) return sub;
                }
            }
            return null;
        };
        return findCategory(categories, filters.category) || filters.category;
    }, [categories, filters.category]);

    const activeFilterChips = useMemo(() => {
        const chips: { label: string; onRemove: () => void }[] = [];
        if (filters.category) {
            chips.push({ label: categoryLabel, onRemove: () => setFilters(p => ({ ...p, category: '', page: 1 })) });
        }
        if (filters.listingType) {
            chips.push({ label: `Type: ${filters.listingType}`, onRemove: () => setFilters(p => ({ ...p, listingType: '', page: 1 })) });
        }
        if (filters.minRating) {
            chips.push({ label: `Rating ${filters.minRating}+`, onRemove: () => setFilters(p => ({ ...p, minRating: 0, page: 1 })) });
        }
        if (filters.location) {
            chips.push({ label: 'Local Only', onRemove: () => setFilters(p => ({ ...p, location: '', page: 1 })) });
        }
        if (filters.priceRange[0] !== DEFAULT_PRICE_RANGE[0] || filters.priceRange[1] !== DEFAULT_PRICE_RANGE[1]) {
            chips.push({ label: formatPriceRange(filters.priceRange), onRemove: () => setFilters(p => ({ ...p, priceRange: DEFAULT_PRICE_RANGE, page: 1 })) });
        }
        filters.conditions.forEach(cond => {
            chips.push({ label: cond.replace(/-/g, ' '), onRemove: () => setFilters(p => ({ ...p, conditions: p.conditions.filter(c => c !== cond), page: 1 })) });
        });
        return chips;
    }, [filters, categoryLabel]);

    const activeFilterCount = activeFilterChips.length;

    useEffect(() => {
        threadsCacheRef.current = null;
        threadPartnerCacheRef.current = {};
        globalSearchCacheRef.current = {};
    }, [user?.id]);

    useEffect(() => {
        if (!hasGlobalQuery) {
            setGlobalSearchResults(EMPTY_GLOBAL_RESULTS);
            setIsGlobalSearchLoading(false);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            const queryText = deferredGlobalQuery.trim();
            const normalizedQuery = normalizeSearchText(queryText);
            if (!normalizedQuery) return;

            const cachedResult = globalSearchCacheRef.current[normalizedQuery];
            if (cachedResult) {
                if (!cancelled) {
                    setGlobalSearchResults(cachedResult);
                    setIsGlobalSearchLoading(false);
                }
                return;
            }

            setIsGlobalSearchLoading(true);
            try {
                const pageMatches = PAGE_SEARCH_INDEX
                    .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                    .slice(0, 6);

                const featureMatches = FEATURE_SEARCH_INDEX
                    .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                    .slice(0, 6);

                const [itemPayload, foundUsers] = await Promise.all([
                    itemService.getItems({ search: queryText }, { page: 1, limit: 6 }).catch(() => ({ items: [], total: 0 })),
                    userService.searchUsers(queryText, { excludeUserId: user?.id, limit: 6 }).catch(() => [])
                ]);

                const itemMatches = (itemPayload.items || []).slice(0, 6).map((item) => ({
                    id: `item-${item.id}`,
                    title: item.title,
                    subtitle: item.category || 'Product listing',
                    to: `/item/${item.id}`
                }));

                const userMatches = (foundUsers || []).slice(0, 6).map((entry) => ({
                    id: `user-${entry.id}`,
                    title: entry.name || 'User',
                    subtitle: entry.email || 'Marketplace profile',
                    to: buildPublicProfilePath(entry)
                }));

                if (!servicesCacheRef.current) {
                    servicesCacheRef.current = await serviceService.getServices().catch(() => []);
                }

                const serviceMatches = (servicesCacheRef.current || [])
                    .filter((service) => {
                        const source = `${service.title} ${service.description || ''} ${service.category || ''} ${service.provider?.name || ''}`;
                        return includesQuery(source, normalizedQuery);
                    })
                    .slice(0, 6)
                    .map((service) => ({
                        id: `service-${service.id}`,
                        title: service.title,
                        subtitle: service.provider?.name ? `By ${service.provider.name}` : service.category || 'Service listing',
                        to: `/service/${service.id}`
                    }));

                if (user?.id && !threadsCacheRef.current) {
                    threadsCacheRef.current = await itemService.getChatThreadsForUser(user.id).catch(() => []);
                }
                const messageThreads = threadsCacheRef.current || [];

                if (user?.id && messageThreads.length > 0) {
                    const partnerIds = Array.from(
                        new Set(
                            messageThreads
                                .map((thread) => (thread.buyerId === user.id ? thread.sellerId : thread.buyerId))
                                .filter((id) => Boolean(id) && id !== user.id)
                        )
                    ).slice(0, 24);

                    const missingPartnerIds = partnerIds.filter((id) => !(id in threadPartnerCacheRef.current));
                    if (missingPartnerIds.length > 0) {
                        const partners = await Promise.all(
                            missingPartnerIds.map((id) => userService.getUserById(id).catch(() => null))
                        );
                        missingPartnerIds.forEach((id, index) => {
                            threadPartnerCacheRef.current[id] = partners[index] || null;
                        });
                    }
                }

                const messageMatches = messageThreads
                    .filter((thread) => {
                        const partnerId = user?.id ? (thread.buyerId === user.id ? thread.sellerId : thread.buyerId) : '';
                        const partnerName = partnerId ? threadPartnerCacheRef.current[partnerId]?.name || '' : '';
                        const searchable = `${partnerName} ${thread.lastMessage || ''}`;
                        return includesQuery(searchable, normalizedQuery);
                    })
                    .slice(0, 6)
                    .map((thread) => {
                        const partnerId = user?.id ? (thread.buyerId === user.id ? thread.sellerId : thread.buyerId) : '';
                        const partnerName = partnerId ? threadPartnerCacheRef.current[partnerId]?.name || 'Conversation' : 'Conversation';
                        return {
                            id: `message-${thread.id}`,
                            title: partnerName,
                            subtitle: thread.lastMessage || 'Open conversation',
                            to: `/profile/messages/${thread.id}`
                        };
                    });

                if (!reelsCacheRef.current) {
                    reelsCacheRef.current = await reelService.getReelsForFeed(user?.id || '').catch(() => []);
                }

                const reelMatches = (reelsCacheRef.current || [])
                    .filter((reel) => {
                        const source = `${reel.caption || ''} ${(reel.hashtags || []).join(' ')}`;
                        return includesQuery(source, normalizedQuery);
                    })
                    .slice(0, 6)
                    .map((reel) => ({
                        id: `pixe-${reel.id}`,
                        title: reel.caption || 'Pixe reel',
                        subtitle: `${reel.views || 0} views`,
                        to: `/reels?focus=${encodeURIComponent(reel.id)}`
                    }));

                const fallbackPixeMatches = PIXE_SEARCH_INDEX
                    .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                    .slice(0, 4);

                if (!cancelled) {
                    const nextResults: GlobalSearchResults = {
                        pages: pageMatches,
                        features: featureMatches,
                        users: userMatches,
                        items: itemMatches,
                        services: serviceMatches,
                        messages: messageMatches,
                        pixes: reelMatches.length > 0 ? reelMatches : fallbackPixeMatches
                    };
                    globalSearchCacheRef.current[normalizedQuery] = nextResults;
                    setGlobalSearchResults(nextResults);
                }
            } catch (error) {
                console.warn('Global browse search failed:', error);
                if (!cancelled) {
                    setGlobalSearchResults({
                        ...EMPTY_GLOBAL_RESULTS,
                        pages: PAGE_SEARCH_INDEX
                            .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                            .slice(0, 6),
                        features: FEATURE_SEARCH_INDEX
                            .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                            .slice(0, 6),
                        pixes: PIXE_SEARCH_INDEX
                            .filter((entry) => includesQuery(`${entry.title} ${entry.subtitle}`, normalizedQuery))
                            .slice(0, 4)
                    });
                }
            } finally {
                if (!cancelled) setIsGlobalSearchLoading(false);
            }
        }, 280);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [deferredGlobalQuery, hasGlobalQuery, user?.id]);

    const fetchAllBrands = async () => {
        try {
            const cachedRaw = sessionStorage.getItem(BRANDS_CACHE_KEY);
            if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw) as { timestamp: number; brands: string[] };
                if (
                    parsed &&
                    Array.isArray(parsed.brands) &&
                    Date.now() - Number(parsed.timestamp || 0) < BRANDS_CACHE_TTL_MS
                ) {
                    setAllBrands(parsed.brands);
                    return;
                }
            }
        } catch (error) {
            console.warn('Unable to read brands cache:', error);
        }

        const { items: allItems } = await itemService.getItems({}, { page: 1, limit: 600 });
        const uniqueBrands = [...new Set(allItems.map(item => item.brand).filter(Boolean) as string[])].slice(0, 120);
        setAllBrands(uniqueBrands);
        try {
            sessionStorage.setItem(BRANDS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), brands: uniqueBrands }));
        } catch (error) {
            console.warn('Unable to store brands cache:', error);
        }
    };

    const fetchData = useCallback(async (isNewSearch = false) => {
        const requestId = ++fetchRequestIdRef.current;
        if (isNewSearch) {
            setIsLoading(true);
            // Reset items on new search
            setItems([]);
        } else {
            setIsLoadingMore(true);
        }
        
        try {
            const { page, query, priceRange, ...apiFilters } = filters;
            const serviceFilters = {
                ...apiFilters,
                search: query, // Mapping query to search prop
                minPrice: priceRange[0],
                maxPrice: priceRange[1],
                listingType: apiFilters.listingType ? apiFilters.listingType : undefined,
            };
            const { items: newItems, total } = await itemService.getItems(serviceFilters, { page: filters.page, limit: 12 });
            if (requestId !== fetchRequestIdRef.current) return;
            setItems(prev => {
                const nextItems = isNewSearch ? newItems : [...prev, ...newItems];
                const seen = new Set<string>();
                return nextItems.filter((item) => {
                    if (!item.id || seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });
            });
            setTotalItems(total);
        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) return;
            console.error("Failed to fetch items:", error);
        } finally {
            if (requestId !== fetchRequestIdRef.current) return;
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [filters]);

    useEffect(() => {
        void fetchAllBrands();
    }, []);

    useEffect(() => {
        // Debounce fetching for filters to avoid too many requests
        const timeoutId = setTimeout(() => {
             const newSearchParams = new URLSearchParams();
            if (filters.query) newSearchParams.set('q', filters.query);
            if (filters.category) newSearchParams.set('category', filters.category);
            setSearchParams(newSearchParams, { replace: true });
            
            fetchData(true);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters.query, filters.category, filters.priceRange, filters.minRating, filters.listingType, filters.conditions, filters.sortBy, filters.location]);
    
    useEffect(() => {
        if (filters.page > 1) {
            fetchData();
        }
    }, [filters.page]); // removed fetchData from dependency to avoid loop

    // Infinite scroll observer
     useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && !isLoading && items.length < totalItems) {
                    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
                }
            },
            { threshold: 1.0 }
        );
        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }
        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [isLoadingMore, isLoading, items.length, totalItems]);
    
    const handleShuffle = async () => {
        setFilters(prev => ({...prev, sortBy: 'popularity'})); // Just trigger a sort change for now
    };
    
    const toggleNeighborhoodMode = () => {
        setFilters(prev => ({
            ...prev,
            location: prev.location ? '' : user?.city || '',
            page: 1
        }));
    };

    const resetFilters = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            query: '',
            category: '',
            location: '',
            priceRange: DEFAULT_PRICE_RANGE,
            minRating: 0,
            listingType: '',
            conditions: [],
            page: 1
        }));
    }, []);

    const globalSearchSections = useMemo(() => {
        return (Object.keys(GLOBAL_SECTION_META) as GlobalSearchSectionKey[])
            .map((key) => ({
                key,
                title: GLOBAL_SECTION_META[key].title,
                tone: GLOBAL_SECTION_META[key].tone,
                entries: globalSearchResults[key]
            }))
            .filter((section) => section.entries.length > 0);
    }, [globalSearchResults]);

    const globalSearchResultCount = useMemo(
        () => globalSearchSections.reduce((sum, section) => sum + section.entries.length, 0),
        [globalSearchSections]
    );

    const openSearchResult = useCallback((path: string) => {
        if (path.startsWith('/profile') && !user) {
            navigate('/auth', { state: { from: { pathname: path } } });
            return;
        }
        navigate(path);
    }, [navigate, user]);

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="container mx-auto animate-fade-in-up px-4 pb-[7.2rem] pt-5 sm:px-6 md:py-8 md:pb-8 lg:px-8">
                
                <RecentlyViewedBar />
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-soft"
                >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-secondary">Product Discovery</p>
                            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Find products, then hire services or visit stores</h1>
                            <p className="mt-1 text-sm text-text-secondary">This page now connects all discovery modules: products, services, and stores.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center sm:w-[220px]">
                            <div className="rounded-xl border border-border bg-surface-soft px-3 py-2">
                                <p className="text-lg font-black text-text-primary">{totalItems}</p>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Products</p>
                            </div>
                            <div className="rounded-xl border border-border bg-surface-soft px-3 py-2">
                                <p className="text-lg font-black text-text-primary">{allBrands.length}</p>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Brands</p>
                            </div>
                        </div>
                    </div>
                    <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                        {[ 
                            {
                                title: 'Explore services',
                                desc: 'Open the dedicated hiring marketplace for service providers.',
                                tag: 'Hire',
                                to: '/services/marketplace'
                            },
                            {
                                title: 'Explore stores',
                                desc: 'Jump into storefront discovery and follow verified sellers.',
                                tag: 'Stores',
                                to: '/stores'
                            },
                            {
                                title: 'Seller directory',
                                desc: 'Browse seller personas and open direct conversations.',
                                tag: 'People',
                                to: '/sellers'
                            },
                            {
                                title: 'Live and pixe',
                                desc: 'Discover creator-led product showcases and launches.',
                                tag: 'Content',
                                to: '/pixe'
                            }
                        ].map((card, index) => (
                            <motion.button
                                key={card.title}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: 0.06 + index * 0.04 }}
                                onClick={() => navigate(card.to)}
                                className="min-w-[240px] snap-start rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-soft p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-soft sm:min-w-0"
                            >
                                <p className="text-[10px] uppercase tracking-[0.3em] text-text-secondary">{card.tag}</p>
                                <h3 className="mt-2 font-bold text-text-primary">{card.title}</h3>
                                <p className="mt-2 text-sm text-text-secondary">{card.desc}</p>
                            </motion.button>
                        ))}
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 }}
                    className="mb-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
                >
                    <div className="relative p-5">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />
                        <div className="relative">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-text-secondary">Marketplace Search</p>
                            <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary sm:text-2xl">
                                Find anything: products, services, users, messages, pages, and pixe
                            </h2>
                            <p className="mt-2 text-sm text-text-secondary">
                                Type at least 2 characters to unlock cross-platform search cards with direct navigation.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-border bg-surface p-5">
                        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                                    <SearchIcon />
                                </span>
                                <input
                                    value={filters.query}
                                    onChange={e => setFilters(p => ({ ...p, query: e.target.value, page: 1 }))}
                                    placeholder="Search items, users, services, pages, messages, pixe..."
                                    className="w-full rounded-xl border border-border bg-surface-soft py-3 pl-12 pr-10 font-medium text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                />
                                {filters.query && (
                                    <button
                                        onClick={() => setFilters(p => ({ ...p, query: '', page: 1 }))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={handleShuffle} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-soft sm:w-auto sm:text-sm">
                                    <ShuffleIcon /> Shuffle
                                </button>
                                <button onClick={() => setShowFilters(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 sm:w-auto sm:text-sm">
                                    Advanced Filters
                                    {activeFilterCount > 0 ? (
                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                                            {activeFilterCount}
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                        </div>

                        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 text-xs sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                            {allBrands.slice(0, 6).map(brand => (
                                <Link
                                    key={brand}
                                    to={`/brands/${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                                    onClick={(event) => {
                                        if (!brand) return;
                                        setFilters(p => ({ ...p, query: brand, page: 1 }));
                                        if (!brand.trim()) event.preventDefault();
                                    }}
                                    className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-primary hover:text-text-primary"
                                >
                                    {brand}
                                </Link>
                            ))}
                            <button onClick={() => setFilters(p => ({ ...p, query: 'limited', page: 1 }))} className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-primary hover:text-text-primary">Limited</button>
                            <button onClick={() => setFilters(p => ({ ...p, query: 'verified', page: 1 }))} className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-primary hover:text-text-primary">Verified</button>
                            <button onClick={() => setFilters(p => ({ ...p, query: 'auction', page: 1 }))} className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-primary hover:text-text-primary">Auction</button>
                            <button onClick={() => setFilters(p => ({ ...p, query: 'service', page: 1 }))} className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-primary hover:text-text-primary">Service</button>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 text-xs sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                                {activeFilterChips.map((chip, idx) => (
                                    <button
                                        key={`${chip.label}-${idx}`}
                                        onClick={chip.onRemove}
                                        className="flex items-center gap-2 rounded-full border border-border bg-surface-soft px-3 py-1 text-text-primary hover:border-primary"
                                    >
                                        <span className="capitalize">{chip.label}</span>
                                        <span className="text-text-secondary">x</span>
                                    </button>
                                ))}
                                <button onClick={resetFilters} className="rounded-full border border-primary px-3 py-1 font-semibold text-primary">
                                    Clear All
                                </button>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                        {hasGlobalQuery ? (
                            <motion.div
                                key="global-search-panel"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.22 }}
                                className="mt-5 rounded-2xl border border-border bg-surface-soft/80 p-3 sm:p-4"
                            >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
                                        Universal search
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        {isGlobalSearchLoading ? 'Searching...' : `${globalSearchResultCount} results`}
                                    </p>
                                </div>

                                {isGlobalSearchLoading && globalSearchResultCount === 0 ? (
                                    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
                                        <Spinner size="sm" />
                                        <span>Looking across pages, users, items, services, messages, and pixe...</span>
                                    </div>
                                ) : globalSearchSections.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-3 text-sm text-text-secondary">
                                        No global matches found for "{filters.query}".
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                        {globalSearchSections.map((section) => (
                                            <div key={section.key} className="overflow-hidden rounded-xl border border-border bg-surface">
                                                <div className={`border-b border-border bg-gradient-to-r ${section.tone} px-3 py-2`}>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{section.title}</p>
                                                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                                                            {section.entries.length}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 p-2.5">
                                                    {section.entries.map((entry) => (
                                                        <button
                                                            key={entry.id}
                                                            type="button"
                                                            onClick={() => openSearchResult(entry.to)}
                                                            className="block w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition hover:border-primary/40 hover:bg-surface-soft"
                                                        >
                                                            <p className="truncate text-sm font-semibold text-text-primary">{entry.title}</p>
                                                            <p className="truncate text-xs text-text-secondary">{entry.subtitle}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ) : null}
                        </AnimatePresence>
                    </div>
                </motion.section>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Mobile Filter Toggle */}
                    <div className="lg:hidden w-full flex flex-col gap-2">
                        <div className="flex gap-2">
                         <button onClick={() => setIsSidebarOpen(true)} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3 font-semibold text-text-primary shadow-sm">
                            <FilterIcon/> Filters
                            {activeFilterCount > 0 && (
                                <span className="text-[10px] font-bold bg-text-primary/10 text-text-primary px-2 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <select 
                            value={filters.sortBy}
                            onChange={e => setFilters(p => ({...p, sortBy: e.target.value as any}))}
                            className="flex-1 rounded-xl border border-border bg-surface p-3 font-semibold text-text-primary outline-none"
                        >
                            <option value="newest">Newest</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="popularity">Popularity</option>
                        </select>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-soft p-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">View</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setViewMode('grid')} className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-text-secondary hover:bg-surface'}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-text-secondary hover:bg-surface'}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="lg:hidden text-xs text-text-secondary px-1 -mt-1">
                        {isLoading && items.length === 0 ? 'Loading results...' : `${totalItems} results`}
                    </div>

                    {/* Sidebar */}
                    <aside className={`
                        fixed inset-0 z-50 bg-background/95 backdrop-blur-md 
                        lg:static lg:bg-transparent lg:z-auto 
                        lg:w-1/4 xl:w-1/5 overflow-y-auto lg:overflow-visible p-5 lg:p-0 pb-24 
                        transition-transform duration-300
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        ${showFilters ? 'lg:translate-x-0 lg:block' : 'lg:hidden'}
                    `}>
                        <div className="flex justify-between items-center mb-6 lg:hidden">
                            <h2 className="text-xl font-bold text-text-primary">Filters</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-md hover:bg-surface-soft text-text-secondary">
                                <CloseIcon/>
                            </button>
                        </div>
                        <div className="bg-surface/50 backdrop-blur-sm lg:bg-transparent rounded-xl border border-border lg:border-0 p-4 lg:p-0">
                             <FilterSidebar allBrands={allBrands} filters={filters} setFilters={setFilters}/>
                        </div>
                        <div className="mt-6 lg:hidden">
                             <button onClick={() => setIsSidebarOpen(false)} className="w-full py-3 bg-primary text-white font-bold rounded-lg">Show Results</button>
                        </div>
                    </aside>

                    <main className="flex-1 min-w-0">
                         {/* Desktop Toolbar */}
                         <div className="hidden lg:flex bg-surface rounded-xl shadow-soft border border-border p-3 mb-6 justify-between items-center sticky top-24 z-20">
                             <div className="flex items-center gap-4 px-2">
                                <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 font-bold text-text-primary hover:text-primary transition-colors text-sm">
                                    <FilterIcon/> {showFilters ? 'Hide Filters' : 'Show Filters'}
                                </button>
                                <div className="h-6 w-px bg-border mx-1"></div>
                                <p className="text-sm font-semibold text-text-secondary">{totalItems} Results</p>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-text-primary hover:text-primary transition-colors ml-2">
                                    <input type="checkbox" checked={!!filters.location} onChange={toggleNeighborhoodMode} className="toggle-checkbox" />
                                    <span>Local Only</span>
                                </label>
                             </div>
                             <div className="flex items-center gap-3">
                                <select 
                                    value={filters.sortBy}
                                    onChange={e => setFilters(p => ({...p, sortBy: e.target.value as any}))}
                                    className="text-sm font-semibold bg-surface-soft text-text-primary border-transparent rounded-lg p-2 hover:bg-border transition-colors cursor-pointer outline-none"
                                >
                                    <option value="newest">Sort: Newest</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="popularity">Popularity</option>
                                </select>
                                <div className="h-6 w-px bg-border mx-1"></div>
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-text-secondary hover:bg-surface-soft'}`}>
                                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-text-secondary hover:bg-surface-soft'}`}>
                                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </button>
                             </div>
                         </div>

                        {/* Results Grid */}
                        {isLoading && items.length === 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : items.length > 0 ? (
                            <div className={`grid gap-4 sm:gap-6 animate-fade-in-up ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                                {items.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.22) }}
                                    >
                                        <ItemCard item={item} onQuickView={setQuickViewItem} viewMode={viewMode} />
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-surface/50 border border-dashed border-border rounded-xl">
                                <LottieAnimation src={uiLottieAnimations.noResults} className="h-40 w-40 mb-2" loop autoplay />
                                <h3 className="text-xl font-bold text-text-primary">No Items Found</h3>
                                <p className="text-text-secondary mt-2">Try adjusting your filters or search terms.</p>
                                <button onClick={resetFilters} className="mt-6 text-primary font-bold hover:underline">Clear All Filters</button>
                            </div>
                        )}

                        <div ref={loaderRef} className="h-20 flex justify-center items-center mt-8">
                            {isLoadingMore && <Spinner />}
                        </div>
                    </main>
                </div>
            </div>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
        </>
    );
};

export default BrowsePage;

