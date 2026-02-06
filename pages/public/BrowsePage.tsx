
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { Item, Category } from '../../types';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';
import SkeletonCard from '../../components/SkeletonCard';
import QuickViewModal from '../../components/QuickViewModal';
import StarRating from '../../components/StarRating';
import { useCategories } from '../../context/CategoryContext';
import { useAuth } from '../../hooks/useAuth';
import { useBrowsingHistory } from '../../hooks/useBrowsingHistory'; // NEW

const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ShuffleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.828L12 12m0 0l-3.182-3.182M12 12l3.182 3.182M12 12l-3.182 3.182M3.75 7.5h4.992V12m-4.993 0l3.182 3.182a8.25 8.25 0 0011.667 0l3.182-3.182m-13.5-2.828L12 12m0 0l3.182-3.182m0 0l3.182 3.182m0 0l3.182 3.182" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


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
        <div className="mb-8 p-4 bg-surface/50 rounded-xl border border-border">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Recently Viewed</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {historyItems.map(item => (
                    <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="flex-shrink-0 w-32 cursor-pointer group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-border mb-2">
                             <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
    const [items, setItems] = useState<Item[]>([]);
    const [allBrands, setAllBrands] = useState<string[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile state
    const [showFilters, setShowFilters] = useState(false); // Desktop state

    const [filters, setFilters] = useState({
        query: searchParams.get('q') || '',
        category: searchParams.get('category') || '',
        location: '',
        priceRange: [0, 10000] as [number, number],
        minRating: 0,
        listingType: '' as 'sale' | 'rent' | 'auction' | '',
        conditions: [] as string[],
        sortBy: 'newest' as 'newest' | 'price_asc' | 'price_desc' | 'popularity',
        page: 1
    });

    const fetchAllBrands = async () => {
        const { items: allItems } = await itemService.getItems({}, { page: 1, limit: 1000 });
        const uniqueBrands = [...new Set(allItems.map(item => item.brand).filter(Boolean) as string[])];
        setAllBrands(uniqueBrands);
    };

    const fetchData = useCallback(async (isNewSearch = false) => {
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
            setItems(prev => isNewSearch ? newItems : [...prev, ...newItems]);
            setTotalItems(total);
        } catch (error) {
            console.error("Failed to fetch items:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAllBrands();
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

    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                
                <RecentlyViewedBar />

                <div className="mb-8 bg-surface rounded-2xl border border-border p-5 shadow-soft">
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                        <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                                <SearchIcon />
                            </span>
                            <input
                                value={filters.query}
                                onChange={e => setFilters(p => ({ ...p, query: e.target.value, page: 1 }))}
                                placeholder="Search items, brands, categories, creators..."
                                className="w-full pl-12 pr-10 py-3 rounded-xl border border-border bg-surface-soft text-text-primary font-medium focus:ring-2 focus:ring-primary outline-none"
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
                        <div className="flex items-center gap-3">
                            <button onClick={handleShuffle} className="px-4 py-3 rounded-xl border border-border text-sm font-semibold text-text-primary hover:bg-surface-soft flex items-center gap-2">
                                <ShuffleIcon /> Shuffle
                            </button>
                            <button onClick={() => setShowFilters(true)} className="px-4 py-3 rounded-xl bg-black text-white font-semibold text-sm hover:opacity-90">
                                Advanced Filters
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {allBrands.slice(0, 6).map(brand => (
                            <button
                                key={brand}
                                onClick={() => setFilters(p => ({ ...p, query: brand, page: 1 }))}
                                className="px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-primary"
                            >
                                {brand}
                            </button>
                        ))}
                        <button onClick={() => setFilters(p => ({ ...p, query: 'limited', page: 1 }))} className="px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-primary">Limited</button>
                        <button onClick={() => setFilters(p => ({ ...p, query: 'verified', page: 1 }))} className="px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-primary">Verified</button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Mobile Filter Toggle */}
                    <div className="lg:hidden w-full flex gap-2">
                         <button onClick={() => setIsSidebarOpen(true)} className="flex-1 flex items-center justify-center gap-2 p-3 font-semibold text-text-primary bg-surface border border-border rounded-lg shadow-sm">
                            <FilterIcon/> Filters
                        </button>
                        <select 
                            value={filters.sortBy}
                            onChange={e => setFilters(p => ({...p, sortBy: e.target.value as any}))}
                            className="flex-1 p-3 bg-surface text-text-primary border border-border rounded-lg font-semibold outline-none"
                        >
                            <option value="newest">Newest</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="popularity">Popularity</option>
                        </select>
                    </div>

                    {/* Sidebar */}
                    <aside className={`
                        fixed inset-0 z-50 bg-background 
                        lg:static lg:bg-transparent lg:z-auto 
                        lg:w-1/4 xl:w-1/5 overflow-y-auto lg:overflow-visible p-6 lg:p-0 
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
                         <div className="hidden lg:flex bg-surface rounded-xl shadow-soft border border-border p-3 mb-6 justify-between items-center">
                             <div className="flex items-center gap-4 px-2">
                                <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 font-bold text-text-primary hover:text-primary transition-colors text-sm">
                                    <FilterIcon/> {showFilters ? 'Hide Filters' : 'Show Filters'}
                                </button>
                                <div className="h-6 w-px bg-border mx-1"></div>
                                <p className="text-sm font-semibold text-text-secondary">{totalItems} Results</p>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-text-primary hover:text-primary transition-colors ml-2">
                                    <input type="checkbox" checked={!!filters.location} onChange={toggleNeighborhoodMode} className="toggle-checkbox" />
                                    <span>🌍 Local Only</span>
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
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : items.length > 0 ? (
                            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                                {items.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} viewMode={viewMode} />)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-surface/50 border border-dashed border-border rounded-xl">
                                <div className="text-4xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-text-primary">No Items Found</h3>
                                <p className="text-text-secondary mt-2">Try adjusting your filters or search terms.</p>
                                <button onClick={() => setFilters(p => ({...p, query: '', category: '', priceRange: [0, 10000]}))} className="mt-6 text-primary font-bold hover:underline">Clear All Filters</button>
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
