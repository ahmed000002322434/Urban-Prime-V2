import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { storefrontService } from '../../services/storefrontService';
import type { Store, User } from '../../types';
import Spinner from '../../components/Spinner';

type EnrichedStore = Store & { owner: User };
type StoreSort = 'featured' | 'recent' | 'followers' | 'products' | 'name';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const getStoreScore = (store: EnrichedStore) => {
    const followers = Array.isArray(store.owner?.followers) ? store.owner.followers.length : 0;
    const products = Array.isArray(store.products) ? store.products.length : 0;
    const rating = Number(store.owner?.rating || 0);
    return followers * 3 + products * 2 + rating * 10;
};

const getStoreCover = (store: EnrichedStore) =>
    store.storeBannerUrl ||
    store.logo ||
    store.owner?.avatar ||
    '/icons/urbanprime.svg';

const toBrandSlug = (value: string) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const getTopStoreBrands = (store: EnrichedStore, limit = 3) => {
    const counts = new Map<string, number>();
    (store.products || []).forEach((product: any) => {
        const brandName = String(product?.brand || '').trim();
        if (!brandName) return;
        counts.set(brandName, (counts.get(brandName) || 0) + 1);
    });
    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name]) => ({ name, slug: toBrandSlug(name) }));
};

const StoresDirectoryPage: React.FC = () => {
    const [allStores, setAllStores] = useState<EnrichedStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<StoreSort>('featured');
    const [category, setCategory] = useState('all');
    const [city, setCity] = useState('all');
    const [visibleCount, setVisibleCount] = useState(12);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const rows = await storefrontService.getAllStorefronts();
                if (mounted) {
                    setAllStores((rows || []).filter((store): store is EnrichedStore => Boolean(store?.owner?.id)));
                }
            } catch (error) {
                console.error('Unable to load stores directory:', error);
                if (mounted) setAllStores([]);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        void load();
        return () => {
            mounted = false;
        };
    }, []);

    const categories = useMemo(() => {
        return Array.from(new Set(allStores.map((store) => String(store.category || '').trim()).filter(Boolean))).sort((left, right) =>
            left.localeCompare(right)
        );
    }, [allStores]);

    const cities = useMemo(() => {
        return Array.from(new Set(allStores.map((store) => String(store.city || '').trim()).filter(Boolean))).sort((left, right) =>
            left.localeCompare(right)
        );
    }, [allStores]);

    const filteredStores = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        const base = allStores.filter((store) => {
            if (category !== 'all' && String(store.category || '') !== category) return false;
            if (city !== 'all' && String(store.city || '') !== city) return false;
            if (!normalized) return true;

            const source = [
                store.name,
                store.tagline,
                store.owner?.name,
                store.owner?.businessName,
                store.category,
                store.city
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return source.includes(normalized);
        });

        const ranked = [...base];
        if (sortBy === 'featured') ranked.sort((left, right) => getStoreScore(right) - getStoreScore(left));
        if (sortBy === 'recent')
            ranked.sort((left, right) => new Date(right.createdAt || '').getTime() - new Date(left.createdAt || '').getTime());
        if (sortBy === 'followers')
            ranked.sort(
                (left, right) =>
                    (Array.isArray(right.owner?.followers) ? right.owner.followers.length : 0) -
                    (Array.isArray(left.owner?.followers) ? left.owner.followers.length : 0)
            );
        if (sortBy === 'products')
            ranked.sort(
                (left, right) => (Array.isArray(right.products) ? right.products.length : 0) - (Array.isArray(left.products) ? left.products.length : 0)
            );
        if (sortBy === 'name') ranked.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

        return ranked;
    }, [allStores, category, city, query, sortBy]);

    const stats = useMemo(() => {
        const totalFollowers = allStores.reduce((sum, store) => sum + (Array.isArray(store.owner?.followers) ? store.owner.followers.length : 0), 0);
        const totalProducts = allStores.reduce((sum, store) => sum + (Array.isArray(store.products) ? store.products.length : 0), 0);
        const ratings = allStores
            .map((store) => Number(store.owner?.rating || 0))
            .filter((entry) => Number.isFinite(entry) && entry > 0);
        const avgRating = ratings.length > 0 ? ratings.reduce((sum, entry) => sum + entry, 0) / ratings.length : 0;

        return {
            stores: allStores.length,
            followers: totalFollowers,
            products: totalProducts,
            avgRating
        };
    }, [allStores]);

    const featuredStores = useMemo(() => {
        return [...filteredStores].sort((left, right) => getStoreScore(right) - getStoreScore(left)).slice(0, 4);
    }, [filteredStores]);

    const visibleStores = filteredStores.slice(0, visibleCount);
    const hasMore = visibleStores.length < filteredStores.length;

    return (
        <div className="min-h-screen bg-background pb-24 text-text-primary">
            <div className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-surface-soft p-6 shadow-soft sm:p-8"
                >
                    <div className="pointer-events-none absolute -left-10 -top-16 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                    <div className="relative grid gap-6 lg:grid-cols-[1.65fr_1fr] lg:items-end">
                        <div>
                            <p className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                                Store Discovery
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Discover high-performing storefronts</h1>
                            <p className="mt-3 max-w-2xl text-sm text-text-secondary sm:text-base">
                                Browse verified stores, compare catalog depth, and jump directly into product discovery, service hiring, or seller messaging.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link to="/browse" className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft">
                                    Browse products
                                </Link>
                                <Link
                                    to="/services/marketplace"
                                    className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft"
                                >
                                    Explore services
                                </Link>
                                <Link to="/sellers" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110">
                                    Seller directory
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-border bg-surface p-3 text-center">
                                <p className="text-lg font-black">{compact.format(stats.stores)}</p>
                                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Stores</p>
                            </div>
                            <div className="rounded-xl border border-border bg-surface p-3 text-center">
                                <p className="text-lg font-black">{compact.format(stats.products)}</p>
                                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Products</p>
                            </div>
                            <div className="rounded-xl border border-border bg-surface p-3 text-center">
                                <p className="text-lg font-black">{compact.format(stats.followers)}</p>
                                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Followers</p>
                            </div>
                            <div className="rounded-xl border border-border bg-surface p-3 text-center">
                                <p className="text-lg font-black">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</p>
                                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Avg rating</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <section className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-soft">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setVisibleCount(12);
                            }}
                            placeholder="Search by store, owner, category, city..."
                            className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <select
                            value={category}
                            onChange={(event) => {
                                setCategory(event.target.value);
                                setVisibleCount(12);
                            }}
                            className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All categories</option>
                            {categories.map((entry) => (
                                <option key={entry} value={entry}>
                                    {entry}
                                </option>
                            ))}
                        </select>
                        <select
                            value={city}
                            onChange={(event) => {
                                setCity(event.target.value);
                                setVisibleCount(12);
                            }}
                            className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All cities</option>
                            {cities.map((entry) => (
                                <option key={entry} value={entry}>
                                    {entry}
                                </option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as StoreSort)}
                            className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="featured">Sort: Featured</option>
                            <option value="recent">Sort: Recently created</option>
                            <option value="followers">Sort: Most followed</option>
                            <option value="products">Sort: Most products</option>
                            <option value="name">Sort: Name (A-Z)</option>
                        </select>
                    </div>
                </section>

                {!isLoading && featuredStores.length > 0 ? (
                    <section className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-soft">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-secondary">Featured stores</h2>
                            <p className="text-xs text-text-secondary">{filteredStores.length} matches</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {featuredStores.map((store, index) => {
                                const topBrands = getTopStoreBrands(store, 2);
                                return (
                                    <motion.article
                                        key={`featured-${store.id}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.24, delay: index * 0.04 }}
                                        className="overflow-hidden rounded-xl border border-border bg-surface-soft"
                                    >
                                        <Link to={`/s/${store.slug}`} className="block">
                                            <div className="relative aspect-[16/9] overflow-hidden">
                                                <img src={getStoreCover(store)} alt={store.name} className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                <p className="absolute bottom-2 left-3 text-sm font-semibold text-white">
                                                    {store.products?.length || 0} products
                                                </p>
                                            </div>
                                        </Link>
                                        <div className="p-3">
                                            <p className="truncate text-sm font-semibold text-text-primary">{store.name || 'Store'}</p>
                                            <p className="truncate text-xs text-text-secondary">by {store.owner?.name || 'Owner'}</p>
                                            {topBrands.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {topBrands.map((brand) => (
                                                        <Link
                                                            key={`${store.id}-${brand.slug}`}
                                                            to={`/brands/${brand.slug}`}
                                                            className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary hover:border-primary/50 hover:text-primary"
                                                        >
                                                            {brand.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                <section className="mt-5">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : visibleStores.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                            <h2 className="text-xl font-bold">No stores found</h2>
                            <p className="mt-2 text-sm text-text-secondary">Adjust search or filters to discover more storefronts.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setCategory('all');
                                    setCity('all');
                                    setSortBy('featured');
                                }}
                                className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-soft"
                            >
                                Reset filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {visibleStores.map((store, index) => {
                                    const followerCount = Array.isArray(store.owner?.followers) ? store.owner.followers.length : 0;
                                    const rating = Number(store.owner?.rating || 0);
                                    const createdYear = store.createdAt ? new Date(store.createdAt).getFullYear() : null;
                                    const topBrands = getTopStoreBrands(store);
                                    return (
                                        <motion.article
                                            key={store.id}
                                            initial={{ opacity: 0, y: 14 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2) }}
                                            whileHover={{ y: -4 }}
                                            className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
                                        >
                                            <Link to={`/s/${store.slug}`} className="block">
                                                <div className="relative aspect-[16/10] overflow-hidden bg-surface-soft">
                                                    <img src={getStoreCover(store)} alt={store.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                    <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                                        {store.category || 'General'}
                                                    </div>
                                                </div>
                                            </Link>
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <Link to={`/s/${store.slug}`}>
                                                            <h3 className="truncate text-lg font-bold tracking-tight text-text-primary">{store.name || 'Store'}</h3>
                                                        </Link>
                                                        <p className="line-clamp-1 text-sm text-text-secondary">{store.tagline || 'Explore curated products and offers.'}</p>
                                                    </div>
                                                    <img src={store.owner?.avatar || '/icons/urbanprime.svg'} alt={store.owner?.name || 'Owner'} className="h-11 w-11 rounded-full object-cover" />
                                                </div>
                                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded-lg border border-border bg-surface-soft px-2 py-2">
                                                        <p className="text-sm font-bold text-text-primary">{store.products?.length || 0}</p>
                                                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Products</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-surface-soft px-2 py-2">
                                                        <p className="text-sm font-bold text-text-primary">{followerCount}</p>
                                                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Followers</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-surface-soft px-2 py-2">
                                                        <p className="text-sm font-bold text-text-primary">{rating > 0 ? rating.toFixed(1) : 'N/A'}</p>
                                                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Rating</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                                                    <span>{store.city || 'Location not set'}</span>
                                                    <span>{createdYear ? `Since ${createdYear}` : 'New store'}</span>
                                                </div>
                                                {topBrands.length > 0 ? (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {topBrands.map((brand) => (
                                                            <Link
                                                                key={`${store.id}-${brand.slug}`}
                                                                to={`/brands/${brand.slug}`}
                                                                className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary hover:border-primary/50 hover:text-primary"
                                                            >
                                                                {brand.name}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                <div className="mt-4 grid grid-cols-3 gap-2">
                                                    <Link
                                                        to={`/s/${store.slug}`}
                                                        className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft"
                                                    >
                                                        Visit
                                                    </Link>
                                                    <Link
                                                        to={`/user/${store.owner?.id}`}
                                                        className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft"
                                                    >
                                                        Owner
                                                    </Link>
                                                    <Link
                                                        to={`/profile/messages?sellerId=${encodeURIComponent(store.owner?.id || '')}`}
                                                        className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                                                    >
                                                        Message
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.article>
                                    );
                                })}
                            </div>
                            {hasMore ? (
                                <div className="mt-8 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((count) => count + 12)}
                                        className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-soft"
                                    >
                                        Load more stores
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default StoresDirectoryPage;
