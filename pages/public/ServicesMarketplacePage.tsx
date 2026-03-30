import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { serviceService } from '../../services/itemService';
import type { Service } from '../../types';
import Spinner from '../../components/Spinner';

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating';
type ModeFilter = 'all' | 'instant' | 'proposal' | 'hybrid';

const getMinPrice = (service: Service) => {
  const values = (service.pricingModels || []).map((entry) => Number(entry.price || 0)).filter((entry) => entry > 0);
  if (values.length === 0) return 0;
  return Math.min(...values);
};

const getCurrency = (service: Service) => service.currency || service.pricingModels?.[0]?.currency || 'USD';

const ServicesMarketplacePage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await serviceService.getServices();
        if (!cancelled) setServices(rows || []);
      } catch (error) {
        console.error('Unable to load services marketplace:', error);
        if (!cancelled) setServices([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(services.map((entry) => String(entry.category || '').trim()).filter(Boolean)));
    return values.sort((left, right) => left.localeCompare(right));
  }, [services]);

  const topProviders = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar: string; count: number; rating: number }>();
    services.forEach((service) => {
      const provider = service.provider;
      if (!provider?.id) return;
      const existing = map.get(provider.id);
      if (!existing) {
        map.set(provider.id, {
          id: provider.id,
          name: provider.name || 'Provider',
          avatar: provider.avatar || '/icons/urbanprime.svg',
          count: 1,
          rating: Number(provider.rating || service.avgRating || 0)
        });
        return;
      }
      existing.count += 1;
      existing.rating = Math.max(existing.rating, Number(provider.rating || service.avgRating || 0));
    });
    return Array.from(map.values())
      .sort((left, right) => right.count - left.count || right.rating - left.rating)
      .slice(0, 6);
  }, [services]);

  const filteredServices = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const rows = services.filter((service) => {
      if (mode !== 'all' && (service.mode || 'hybrid') !== mode) return false;
      if (category !== 'all' && String(service.category || '') !== category) return false;
      if (!normalized) return true;
      const haystack = [
        service.title,
        service.description,
        service.category,
        service.provider?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });

    if (sortBy === 'price_low') rows.sort((left, right) => getMinPrice(left) - getMinPrice(right));
    if (sortBy === 'price_high') rows.sort((left, right) => getMinPrice(right) - getMinPrice(left));
    if (sortBy === 'rating') rows.sort((left, right) => Number(right.avgRating || 0) - Number(left.avgRating || 0));

    return rows;
  }, [category, deferredQuery, mode, services, sortBy]);

  const stats = useMemo(() => {
    const instant = services.filter((entry) => (entry.mode || 'hybrid') !== 'proposal').length;
    return {
      services: services.length,
      providers: topProviders.length,
      instant
    };
  }, [services, topProviders.length]);

  return (
    <div className="min-h-screen bg-background pb-[7.2rem] text-text-primary md:pb-24">
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-surface-soft p-6 shadow-soft sm:p-8"
        >
          <div className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Service Marketplace
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Hire trusted experts fast</h1>
              <p className="mt-3 max-w-2xl text-sm text-text-secondary sm:text-base">
                Search providers, compare packages, and start hiring directly in chat. Everything is linked to live service profiles and real provider pages.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/browse" className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft">
                  Browse products
                </Link>
                <Link to="/stores" className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft">
                  Explore stores
                </Link>
                <Link to="/profile/messages" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110">
                  Open hiring inbox
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-lg font-black">{stats.services}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Services</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-lg font-black">{stats.providers}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Providers</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-lg font-black">{stats.instant}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Instant</p>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills, categories, providers..."
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
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
              value={mode}
              onChange={(event) => setMode(event.target.value as ModeFilter)}
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All engagement modes</option>
              <option value="instant">Instant packages</option>
              <option value="proposal">Proposal based</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price_low">Sort: Price low to high</option>
              <option value="price_high">Sort: Price high to low</option>
              <option value="rating">Sort: Highest rated</option>
            </select>
          </div>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
            {(['all', 'instant', 'proposal', 'hybrid'] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  mode === entry
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-surface-soft text-text-secondary'
                }`}
              >
                {entry}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setMode('all');
                setCategory('all');
                setSortBy('relevance');
              }}
              className="whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-secondary">Top providers</h2>
            <Link to="/sellers" className="text-xs font-semibold text-primary hover:underline">
              View all professionals
            </Link>
          </div>
          {topProviders.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Provider profiles will appear here after services are published.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {topProviders.map((provider) => (
                <Link key={provider.id} to={`/user/${provider.id}`} className="rounded-xl border border-border bg-surface-soft p-3 transition hover:border-primary/35">
                  <img src={provider.avatar || '/icons/urbanprime.svg'} alt={provider.name} loading="lazy" decoding="async" className="h-12 w-12 rounded-full object-cover" />
                  <p className="mt-2 truncate text-sm font-semibold text-text-primary">{provider.name}</p>
                  <p className="text-xs text-text-secondary">{provider.count} services</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5">
          {!isLoading ? (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs text-text-secondary">
              <span>{filteredServices.length} services shown</span>
              <span className="font-semibold uppercase tracking-[0.12em]">{sortBy.replace('_', ' ')}</span>
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <h2 className="text-xl font-bold">No matching services</h2>
              <p className="mt-2 text-sm text-text-secondary">Try changing category, mode, or search text.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service, index) => {
                const minPrice = getMinPrice(service);
                const currency = getCurrency(service);
                const cover = service.imageUrls?.[0] || '/icons/urbanprime.svg';
                return (
                  <motion.article
                    key={service.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2) }}
                    whileHover={{ y: -4 }}
                    className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
                  >
                    <Link to={`/service/${service.id}`} className="block">
                      <div className="aspect-[16/10] w-full overflow-hidden bg-surface-soft">
                        <img src={cover} alt={service.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      </div>
                    </Link>
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-full border border-border bg-surface-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          {service.category || 'General'}
                        </span>
                        <span className="text-xs font-semibold text-text-secondary">{(service.mode || 'hybrid').toUpperCase()}</span>
                      </div>
                      <Link to={`/service/${service.id}`}>
                        <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-text-primary">{service.title}</h3>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{service.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">From</p>
                          <p className="text-xl font-black text-text-primary">
                            {currency} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">{service.provider?.name || 'Provider'}</p>
                          <p className="text-xs text-text-secondary">Rating {Number(service.avgRating || 0).toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          to={`/service/${service.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft"
                        >
                          Details
                        </Link>
                        <Link
                          to={`/profile/messages?sellerId=${encodeURIComponent(service.provider?.id || '')}&serviceId=${encodeURIComponent(service.id)}`}
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                        >
                          Hire now
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-7 grid gap-3 pb-4 md:grid-cols-3">
          {[
            { title: 'Post your request', body: 'Describe your goal and timeline, then invite providers.' },
            { title: 'Compare packages', body: 'Review pricing, delivery, and provider track record in one flow.' },
            { title: 'Hire and manage', body: 'Chat, approve milestones, and track outcomes from your dashboard.' }
          ].map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.24, delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-text-primary">{step.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{step.body}</p>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ServicesMarketplacePage;
