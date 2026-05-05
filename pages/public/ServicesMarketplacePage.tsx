import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spinner from '../../components/Spinner';
import ServiceWorkflowEmptyState from '../../components/service/ServiceWorkflowEmptyState';
import { serviceService } from '../../services/itemService';
import providerWorkspaceService from '../../services/providerWorkspaceService';
import type { Service } from '../../types';

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating';
type ModeFilter = 'all' | 'instant' | 'proposal' | 'hybrid';

type ProviderSpotlight = {
  key: string;
  providerId?: string;
  name: string;
  avatar: string;
  count: number;
  confidence: number;
  coverage: string;
  startingAt: number;
  categories: string[];
  verified: boolean;
  rating: number;
  responseSlaHours: number;
  headline: string;
};

const modeOptions: Array<{ value: ModeFilter; label: string; note: string }> = [
  { value: 'all', label: 'All services', note: 'Show the full public catalog' },
  { value: 'instant', label: 'Instant', note: 'Ready-to-book packages' },
  { value: 'proposal', label: 'Proposal', note: 'Custom scope first' },
  { value: 'hybrid', label: 'Hybrid', note: 'Supports both lanes' }
];

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 21s7-3.8 7-9.5V5.8L12 3 5 5.8v5.7C5 17.2 12 21 12 21Z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5V12l2.8 1.8" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 20s5.8-5.1 5.8-10a5.8 5.8 0 1 0-11.6 0c0 4.9 5.8 10 5.8 10Z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500">
    <path d="m12 3.4 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9L12 3.4Z" />
  </svg>
);

const getMinPrice = (service: Service) => {
  const values = (service.pricingModels || []).map((entry) => Number(entry.price || 0)).filter((entry) => entry > 0);
  return values.length > 0 ? Math.min(...values) : 0;
};

const getCurrency = (service: Service) => service.currency || service.pricingModels?.[0]?.currency || 'USD';

const getTurnaroundLabel = (service: Service) => {
  const deliveryDays = (service.pricingModels || [])
    .map((entry) => Number(entry.deliveryDays || 0))
    .filter((entry) => entry > 0);

  if (deliveryDays.length > 0) {
    const fastest = Math.min(...deliveryDays);
    return fastest <= 1 ? 'Same day to 1 day' : `${fastest} day turnaround`;
  }

  if (service.availability?.leadTimeHours) return `${service.availability.leadTimeHours}h lead time`;
  return 'Custom timeline';
};

const getCoverageLabel = (service: Service) => {
  const availabilityCoverage = (service.availability?.serviceArea || []).map((entry) => entry.label).filter(Boolean);
  if (availabilityCoverage.length > 0) return availabilityCoverage.slice(0, 2).join(', ');
  if (service.providerProfile?.serviceArea) return service.providerProfile.serviceArea;
  if (service.details?.serviceAreaLabel) return service.details.serviceAreaLabel;
  if (service.fulfillmentKind === 'remote') return 'Remote delivery';
  return 'Flexible coverage';
};

const getConfidenceScore = (service: Service) => {
  let score = 52;
  if (service.providerProfile?.verificationLevel === 'verified') score += 14;
  if (service.providerProfile?.status === 'approved') score += 8;
  if (service.providerProfile?.payoutReady) score += 6;
  if ((service.details?.portfolio || service.providerProfile?.portfolio || []).length > 0) score += 7;
  if ((service.details?.faqs || []).length > 0) score += 4;
  if ((service.reviews?.length || 0) > 0) score += 4;
  if ((service.providerProfile?.responseSlaHours || 48) <= 24) score += 5;
  return Math.max(0, Math.min(100, score));
};

const getMatchReasons = (service: Service) => {
  const reasons: string[] = [];
  if (service.providerProfile?.verificationLevel === 'verified') reasons.push('Verified storefront');
  if ((service.providerProfile?.responseSlaHours || 48) <= 24) reasons.push('Fast response');
  if ((service.details?.portfolio || service.providerProfile?.portfolio || []).length > 0) reasons.push('Portfolio shown');
  if ((service.details?.faqs || []).length > 0) reasons.push('Clear FAQs');
  if (service.mode === 'instant') reasons.push('Instant-ready');
  if (service.fulfillmentKind === 'remote') reasons.push('Remote capable');
  return reasons.slice(0, 3);
};

const getWorkflowLabel = (service: Service) => {
  if (service.mode === 'instant') return 'Instant booking';
  if (service.mode === 'proposal') return 'Scoped proposal';
  return 'Hybrid workflow';
};

const filterByAvailability = (service: Service) => {
  const weekly = service.availability?.weeklySchedule;
  const hasWindows = weekly ? Object.values(weekly).some((entry) => entry?.enabled && (entry.windows || []).length > 0) : false;
  return hasWindows || Boolean(service.availability?.notes);
};

const isPublishedService = (service?: Service | null) =>
  String(service?.status || 'published').toLowerCase() === 'published';

const mergeCatalogServices = (services: Service[]) => {
  const map = new Map<string, Service>();
  services.forEach((service) => {
    if (!service?.id || !isPublishedService(service)) return;
    if (!map.has(service.id)) {
      map.set(service.id, service);
    }
  });
  return Array.from(map.values());
};

const getProviderId = (service: Service) => String(service.provider?.id || '').trim();
const getProviderName = (service: Service) => service.providerProfile?.businessName || service.provider?.name || 'Provider';
const getProviderAvatar = (service: Service) => service.provider?.avatar || '/icons/urbanprime.svg';
const getProviderRating = (service: Service) => Number(service.provider?.rating || service.avgRating || 0);
const getProviderResponseSla = (service: Service) => Number(service.details?.responseSlaHours || service.providerProfile?.responseSlaHours || 24);
const getProviderHeadline = (service: Service) => {
  const bio = String(service.providerProfile?.bio || '').trim();
  if (bio) return bio;
  return String(service.description || 'Open the storefront to review the provider profile, live services, and hiring path.').trim();
};

const buildProviderSpotlights = (services: Service[]) => {
  const map = new Map<string, ProviderSpotlight>();

  services.forEach((service) => {
    const providerId = getProviderId(service);
    const key = providerId || `name:${getProviderName(service)}`;
    const existing = map.get(key);
    const confidence = getConfidenceScore(service);
    const minPrice = getMinPrice(service);
    const rating = getProviderRating(service);

    if (!existing) {
      map.set(key, {
        key,
        providerId: providerId || undefined,
        name: getProviderName(service),
        avatar: getProviderAvatar(service),
        count: 1,
        confidence,
        coverage: getCoverageLabel(service),
        startingAt: minPrice,
        categories: service.category ? [service.category] : [],
        verified: service.providerProfile?.verificationLevel === 'verified',
        rating,
        responseSlaHours: getProviderResponseSla(service),
        headline: getProviderHeadline(service)
      });
      return;
    }

    existing.count += 1;
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.coverage = existing.coverage || getCoverageLabel(service);
    existing.startingAt =
      existing.startingAt > 0 && minPrice > 0 ? Math.min(existing.startingAt, minPrice) : existing.startingAt || minPrice;
    existing.verified = existing.verified || service.providerProfile?.verificationLevel === 'verified';
    existing.rating = Math.max(existing.rating, rating);
    existing.responseSlaHours = Math.min(existing.responseSlaHours || 999, getProviderResponseSla(service));
    existing.categories = Array.from(new Set([...existing.categories, ...(service.category ? [service.category] : [])])).slice(0, 3);
    if (existing.headline.length < 40) existing.headline = getProviderHeadline(service);
  });

  return Array.from(map.values())
    .sort((left, right) => right.confidence - left.confidence || right.count - left.count || right.rating - left.rating)
    .slice(0, 6);
};

const statCardClass =
  'rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm';

const pillBaseClass =
  'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition';

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
  const providerId = getProviderId(service);
  const providerName = getProviderName(service);
  const minPrice = getMinPrice(service);
  const confidence = getConfidenceScore(service);
  const rating = getProviderRating(service);
  const matchReasons = getMatchReasons(service);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="group overflow-hidden rounded-[34px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] shadow-[0_22px_44px_rgba(15,23,42,0.06)] dark:bg-[linear-gradient(180deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96))]"
    >
      <Link to={`/service/${service.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-soft">
          <img
            src={service.imageUrls?.[0] || '/icons/urbanprime.svg'}
            alt={service.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            <span className="rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              {getWorkflowLabel(service)}
            </span>
            <span className="rounded-full border border-white/15 bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-950">
              {confidence}% confidence
            </span>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          {providerId ? (
            <Link to={`/providers/${providerId}`} className="flex min-w-0 items-center gap-3">
              <img src={getProviderAvatar(service)} alt={providerName} className="h-11 w-11 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{providerName}</p>
                <p className="truncate text-xs text-text-secondary">{getCoverageLabel(service)}</p>
              </div>
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <img src={getProviderAvatar(service)} alt={providerName} className="h-11 w-11 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{providerName}</p>
                <p className="truncate text-xs text-text-secondary">{getCoverageLabel(service)}</p>
              </div>
            </div>
          )}
          {service.providerProfile?.verificationLevel === 'verified' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              <ShieldIcon /> Verified
            </span>
          ) : null}
        </div>

        <Link to={`/service/${service.id}`} className="block">
          <h3 className="mt-4 line-clamp-2 text-[1.35rem] font-black tracking-tight text-text-primary">{service.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{service.description}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[22px] border border-border bg-background/88 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Starting at</p>
            <p className="mt-1 text-sm font-black text-text-primary">
              {getCurrency(service)} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
            </p>
          </div>
          <div className="rounded-[22px] border border-border bg-background/88 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Turnaround</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{getTurnaroundLabel(service)}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background/88 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Rating</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-text-primary">
              <StarIcon />
              {rating.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {matchReasons.map((entry) => (
            <span key={entry} className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {entry}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            to={`/service/${service.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            View service
            <ArrowRightIcon />
          </Link>
          {providerId ? (
            <Link
              to={`/providers/${providerId}`}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
            >
              Storefront
            </Link>
          ) : (
            <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-secondary">
              Provider page pending
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const ProviderCard: React.FC<{ provider: ProviderSpotlight }> = ({ provider }) => {
  const content = (
    <div className="group rounded-[32px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-primary/30 dark:bg-[linear-gradient(180deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96))]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={provider.avatar || '/icons/urbanprime.svg'} alt={provider.name} className="h-14 w-14 rounded-[20px] object-cover" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-black tracking-tight text-text-primary">{provider.name}</p>
              {provider.verified ? (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                  Verified
                </span>
              ) : null}
            </div>
            <p className="truncate text-sm text-text-secondary">{provider.coverage}</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          {provider.confidence}% fit
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-text-secondary">{provider.headline}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[20px] border border-border bg-background/88 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Live services</p>
          <p className="mt-1 text-sm font-black text-text-primary">{provider.count}</p>
        </div>
        <div className="rounded-[20px] border border-border bg-background/88 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Response</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-text-primary">
            <ClockIcon />
            {provider.responseSlaHours}h
          </p>
        </div>
        <div className="rounded-[20px] border border-border bg-background/88 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Starting at</p>
          <p className="mt-1 text-sm font-black text-text-primary">
            {provider.startingAt > 0 ? `USD ${provider.startingAt.toLocaleString()}` : 'Quote'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {provider.categories.map((entry) => (
          <span key={`${provider.key}-${entry}`} className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {entry}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-text-primary">
          <StarIcon />
          {provider.rating.toFixed(1)}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Open storefront
          <ArrowRightIcon />
        </span>
      </div>
    </div>
  );

  return provider.providerId ? <Link to={`/providers/${provider.providerId}`}>{content}</Link> : content;
};

const ServicesMarketplacePage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [category, setCategory] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const liveRows = mergeCatalogServices(await serviceService.getServices().catch(() => []));

        if (!cancelled) {
          setServices(liveRows);
        }

        const providerIds = Array.from(new Set(liveRows.map((entry) => getProviderId(entry)).filter(Boolean)));
        const storefrontRows = await Promise.allSettled(
          providerIds.map(async (providerId) => {
            const storefront = await providerWorkspaceService.getPublicProviderStorefront(providerId).catch(() => null);
            return [providerId, storefront?.providerProfile || null] as const;
          })
        );

        const providerProfiles = new Map(
          storefrontRows
            .filter((entry): entry is PromiseFulfilledResult<readonly [string, any]> => entry.status === 'fulfilled')
            .map((entry) => entry.value)
        );

        if (!cancelled && providerProfiles.size > 0) {
          setServices((current) =>
            current.map((entry) => ({
              ...entry,
              providerProfile: providerProfiles.get(getProviderId(entry)) || entry.providerProfile
            }))
          );
        }
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

  const filteredServices = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const normalizedLocation = locationFilter.trim().toLowerCase();

    const rows = services.filter((service) => {
      if (mode !== 'all' && (service.mode || 'hybrid') !== mode) return false;
      if (category !== 'all' && String(service.category || '') !== category) return false;
      if (verifiedOnly && service.providerProfile?.verificationLevel !== 'verified') return false;
      if (availableOnly && !filterByAvailability(service)) return false;

      if (normalizedLocation) {
        const locationHaystack = [
          getCoverageLabel(service),
          service.providerProfile?.serviceArea,
          service.details?.serviceAreaLabel
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!locationHaystack.includes(normalizedLocation)) return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        service.title,
        service.description,
        service.category,
        getProviderName(service),
        getCoverageLabel(service),
        ...(service.details?.trustBadges || []),
        ...(service.providerProfile?.languages || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    if (sortBy === 'price_low') rows.sort((left, right) => getMinPrice(left) - getMinPrice(right));
    if (sortBy === 'price_high') rows.sort((left, right) => getMinPrice(right) - getMinPrice(left));
    if (sortBy === 'rating') rows.sort((left, right) => getProviderRating(right) - getProviderRating(left));
    if (sortBy === 'relevance') {
      rows.sort((left, right) =>
        getConfidenceScore(right) - getConfidenceScore(left) ||
        getProviderRating(right) - getProviderRating(left) ||
        getMinPrice(left) - getMinPrice(right)
      );
    }

    return rows;
  }, [availableOnly, category, deferredQuery, locationFilter, mode, services, sortBy, verifiedOnly]);

  const providerDirectory = useMemo(() => buildProviderSpotlights(services), [services]);
  const filteredProviderDirectory = useMemo(() => buildProviderSpotlights(filteredServices), [filteredServices]);

  const providerEntries = useMemo(() => {
    if (filteredProviderDirectory.length > 0) return filteredProviderDirectory;
    return providerDirectory;
  }, [filteredProviderDirectory, providerDirectory]);
  const providerPreviewEntries = useMemo(() => providerEntries.slice(0, 4), [providerEntries]);

  const stats = useMemo(() => {
    const instant = services.filter((entry) => (entry.mode || 'hybrid') !== 'proposal').length;
    const verified = services.filter((entry) => entry.providerProfile?.verificationLevel === 'verified').length;
    const proposalReady = services.filter((entry) => (entry.mode || 'hybrid') !== 'instant').length;
    const providers = buildProviderSpotlights(services).length;
    return {
      services: services.length,
      providers,
      verified,
      instant,
      proposalReady
    };
  }, [services]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (category !== 'all') filters.push(category);
    if (mode !== 'all') filters.push(`${mode} lane`);
    if (verifiedOnly) filters.push('verified only');
    if (availableOnly) filters.push('availability visible');
    if (locationFilter.trim()) filters.push(locationFilter.trim());
    if (deferredQuery.trim()) filters.push(`"${deferredQuery.trim()}"`);
    return filters;
  }, [availableOnly, category, deferredQuery, locationFilter, mode, verifiedOnly]);

  const resetFilters = () => {
    setQuery('');
    setMode('all');
    setCategory('all');
    setVerifiedOnly(false);
    setLocationFilter('');
    setAvailableOnly(false);
    setSortBy('relevance');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(248,250,255,0.92),rgba(244,247,252,0.98))] pb-20 text-text-primary dark:bg-[linear-gradient(180deg,rgba(11,15,24,0.96),rgba(15,20,31,0.99))]">
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-[40px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(135deg,_rgba(15,22,36,0.98),_rgba(28,45,82,0.97)_46%,_rgba(10,17,28,0.99))] p-6 text-white shadow-[0_30px_70px_rgba(15,23,42,0.14)] sm:p-8"
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
                Services marketplace
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                Find the right provider without digging through clutter
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
                Browse the live public catalog, compare real storefronts, and move into booking or quotes from one cleaner surface.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="flex items-center gap-3 rounded-[24px] border border-white/15 bg-white/10 px-4 py-3 text-white/70 focus-within:border-white/30 focus-within:bg-white/14">
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search services, providers, categories, or coverage"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  />
                </label>
                <Link
                  to="/services/concierge"
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Start with AI concierge
                  <ArrowRightIcon />
                </Link>
                <Link
                  to="/profile/messages"
                  className="inline-flex items-center justify-center rounded-[24px] border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white/88 transition hover:bg-white/12"
                >
                  Hiring inbox
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(activeFilters.length > 0 ? activeFilters : categories.slice(0, 5)).map((entry) => (
                  <span
                    key={entry}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      activeFilters.length > 0
                        ? 'border-white/24 bg-white/14 text-white'
                        : 'border-white/15 bg-white/10 text-white/80'
                    }`}
                  >
                    {entry}
                  </span>
                ))}
                {activeFilters.length === 0 ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/68">
                    Live public feed
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={statCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">Published services</p>
                <p className="mt-2 text-3xl font-black">{stats.services}</p>
                <p className="mt-2 text-sm text-white/74">Live listings visible to buyers right now.</p>
              </div>
              <div className={statCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">Public providers</p>
                <p className="mt-2 text-3xl font-black">{stats.providers}</p>
                <p className="mt-2 text-sm text-white/74">Storefronts surfaced from the same live catalog.</p>
              </div>
              <div className={statCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">Verified</p>
                <p className="mt-2 text-3xl font-black">{stats.verified}</p>
                <p className="mt-2 text-sm text-white/74">Providers carrying stronger trust proof.</p>
              </div>
              <div className={statCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">Instant-ready</p>
                <p className="mt-2 text-3xl font-black">{stats.instant}</p>
                <p className="mt-2 text-sm text-white/74">Services that can move into booking faster.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[34px] border border-border bg-surface p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Filter catalog</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Narrow the live public feed</h2>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-border bg-background px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-primary transition hover:bg-surface-soft"
                >
                  Reset
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Coverage</label>
                  <div className="mt-2 flex items-center gap-3 rounded-[24px] border border-border bg-surface-soft px-4 py-3 text-text-secondary">
                    <MapPinIcon />
                    <input
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                      placeholder="City, region, or service area"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="mt-2 w-full rounded-[24px] border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All categories</option>
                    {categories.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="mt-2 w-full rounded-[24px] border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="relevance">Best match</option>
                    <option value="price_low">Lowest price</option>
                    <option value="price_high">Highest price</option>
                    <option value="rating">Highest rated</option>
                  </select>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Workflow lane</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {modeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value)}
                        className={`${pillBaseClass} ${
                          mode === option.value
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : 'border-border bg-surface-soft text-text-secondary hover:border-primary/20 hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {modeOptions.find((entry) => entry.value === mode)?.note}
                  </p>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly((current) => !current)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      verifiedOnly ? 'border-primary/35 bg-primary/10 text-text-primary' : 'border-border bg-surface-soft text-text-secondary'
                    }`}
                  >
                    <p className="text-sm font-bold">Verified providers only</p>
                    <p className="mt-1 text-xs leading-5">Prioritize storefronts with stronger trust proof.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailableOnly((current) => !current)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      availableOnly ? 'border-primary/35 bg-primary/10 text-text-primary' : 'border-border bg-surface-soft text-text-secondary'
                    }`}
                  >
                    <p className="text-sm font-bold">Availability visible</p>
                    <p className="mt-1 text-xs leading-5">Keep only services already exposing schedule signals.</p>
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-border bg-surface p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Browse logic</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-text-primary">Providers and services stay in sync</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                The provider directory is built from the same live published services shown on the right, so storefronts and cards stay aligned.
              </p>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-[34px] border border-border bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Public providers</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
                    {providerEntries.length > 0 ? `${providerEntries.length} storefronts in the live catalog` : 'No storefronts surfaced yet'}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    Open the provider first if you want to compare trust signals, service coverage, and the rest of their public catalog before picking a listing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.length > 0 ? (
                    activeFilters.map((entry) => (
                      <span key={entry} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {entry}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      All public providers
                    </span>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-[28px] border border-border bg-surface-soft">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Spinner size="lg" />
                    <p className="text-sm font-semibold text-text-primary">Loading provider storefronts</p>
                    <p className="max-w-sm text-xs leading-6 text-text-secondary">The marketplace is assembling provider cards from the live published service feed.</p>
                  </div>
                </div>
              ) : providerPreviewEntries.length === 0 ? (
                <div className="mt-5">
                  <ServiceWorkflowEmptyState
                    compact
                    eyebrow="Provider directory pending"
                    title="No public provider storefronts match this filter set yet"
                    body="Reset the filters or broaden the search to surface providers from the live published catalog."
                    animation="noFileFound"
                    highlights={['Live published services', 'Real storefront links', 'Trust-aware ordering']}
                    primaryAction={{ label: 'Reset filters', to: '/services/marketplace' }}
                  />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {providerPreviewEntries.map((provider) => (
                    <ProviderCard key={provider.key} provider={provider} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-border bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Published services</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
                    {isLoading ? 'Loading published services' : `${filteredServices.length} live services ready to browse`}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    Every card below is focused on the few decisions that matter: provider, workflow lane, starting point, turnaround, and storefront access.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    {stats.services} total published
                  </span>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    {stats.providers} providers
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-5 overflow-hidden rounded-[30px] border border-border bg-surface-soft p-6 sm:p-8">
                  <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Loading live catalog</p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Preparing published services and provider storefronts</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
                        The marketplace is loading the live public catalog and joining it with storefront trust signals.
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-border bg-background px-6 py-10 text-center">
                      <Spinner size="lg" />
                      <p className="text-sm font-semibold text-text-primary">Building the catalog</p>
                      <p className="max-w-sm text-xs leading-6 text-text-secondary">Published services will appear here as soon as the live feed is ready.</p>
                    </div>
                  </div>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="mt-5">
                  <ServiceWorkflowEmptyState
                    eyebrow="No match found"
                    title="Nothing matches this public search yet"
                    body="The current filter combination is too strict for the live published catalog. Reset the search, remove one filter, or switch workflow lanes to reveal more public services."
                    animation="noResults"
                    highlights={['Reset one filter', 'Switch lanes', 'Search by provider or category']}
                    primaryAction={{ label: 'Reset and browse again', to: '/services/marketplace' }}
                    secondaryAction={{ label: 'Open hiring inbox', to: '/profile/messages' }}
                  />
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ServicesMarketplacePage;
