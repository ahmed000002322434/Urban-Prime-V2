import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceService } from '../../services/itemService';
import type { Service } from '../../types';
import Spinner from '../../components/Spinner';

const getServiceMinPrice = (service: Service) => {
  const prices = (service.pricingModels || []).map((model) => Number(model.price || 0)).filter((price) => price > 0);
  if (prices.length === 0) return 0;
  return Math.min(...prices);
};

const getServicePrimaryCurrency = (service: Service) =>
  service.currency || service.pricingModels?.[0]?.currency || 'USD';

const BrowseServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'instant' | 'proposal' | 'hybrid'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating_desc'>('relevance');

  useEffect(() => {
    let cancelled = false;
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const servicesData = await serviceService.getServices();
        if (!cancelled) setServices(servicesData || []);
      } catch (error) {
        console.error('Failed to fetch services:', error);
        if (!cancelled) setServices([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchServices();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(services.map((service) => String(service.category || '').trim()).filter(Boolean)));
    return values.sort((left, right) => left.localeCompare(right));
  }, [services]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = services.filter((service) => {
      if (categoryFilter !== 'all' && String(service.category || '') !== categoryFilter) return false;
      if (modeFilter !== 'all' && (service.mode || 'hybrid') !== modeFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        service.title,
        service.description,
        service.category,
        service.provider?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    if (sortBy === 'price_asc') {
      filtered.sort((left, right) => getServiceMinPrice(left) - getServiceMinPrice(right));
    } else if (sortBy === 'price_desc') {
      filtered.sort((left, right) => getServiceMinPrice(right) - getServiceMinPrice(left));
    } else if (sortBy === 'rating_desc') {
      filtered.sort((left, right) => Number(right.avgRating || 0) - Number(left.avgRating || 0));
    }

    return filtered;
  }, [categoryFilter, modeFilter, query, services, sortBy]);

  const stats = useMemo(() => {
    const providerIds = new Set(services.map((service) => String(service.provider?.id || '')).filter(Boolean));
    const instantCount = services.filter((service) => (service.mode || 'hybrid') !== 'proposal').length;
    return {
      services: services.length,
      providers: providerIds.size,
      instantCount
    };
  }, [services]);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-surface-soft p-6 shadow-soft sm:p-8">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative">
            <p className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Service Marketplace
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Hire verified providers</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary sm:text-base">
              Browse real service listings, compare packages, message providers, and book directly from Urban Prime.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md">
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center">
                <p className="text-lg font-black">{stats.services}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Services</p>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center">
                <p className="text-lg font-black">{stats.providers}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Providers</p>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center">
                <p className="text-lg font-black">{stats.instantCount}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Instant Ready</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services, providers, categories..."
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value as 'all' | 'instant' | 'proposal' | 'hybrid')}
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All engagement modes</option>
              <option value="instant">Instant</option>
              <option value="proposal">Proposal</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc')}
              className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price_asc">Sort: Price low to high</option>
              <option value="price_desc">Sort: Price high to low</option>
              <option value="rating_desc">Sort: Highest rated</option>
            </select>
          </div>
        </section>

        <section className="mt-5">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <h2 className="text-xl font-bold">No services matched your filters</h2>
              <p className="mt-2 text-sm text-text-secondary">Try another category, mode, or search phrase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service) => {
                const minPrice = getServiceMinPrice(service);
                const currency = getServicePrimaryCurrency(service);
                const providerName = service.provider?.name || 'Provider';
                const previewImage = service.imageUrls?.[0] || '/icons/urbanprime.svg';
                return (
                  <article
                    key={service.id}
                    className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35"
                  >
                    <Link to={`/service/${service.id}`} className="block">
                      <div className="aspect-[16/10] w-full overflow-hidden bg-surface-soft">
                        <img src={previewImage} alt={service.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      </div>
                    </Link>
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          {service.category || 'general'}
                        </span>
                        <span className="text-xs font-semibold text-text-secondary">{(service.mode || 'hybrid').toUpperCase()}</span>
                      </div>
                      <Link to={`/service/${service.id}`}>
                        <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-text-primary">{service.title}</h2>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{service.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Starting at</p>
                          <p className="text-xl font-black text-text-primary">
                            {currency} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">{providerName}</p>
                          <p className="text-xs text-text-secondary">Rating {Number(service.avgRating || 0).toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          to={`/service/${service.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-soft"
                        >
                          View details
                        </Link>
                        <Link
                          to={`/profile/messages?sellerId=${encodeURIComponent(service.provider?.id || '')}&serviceId=${encodeURIComponent(service.id)}`}
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                        >
                          Hire now
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BrowseServicesPage;
