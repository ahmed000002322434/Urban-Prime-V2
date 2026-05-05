import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import useLowEndMode from '../../hooks/useLowEndMode';
import type { Item } from '../../types';

type ItemServiceModule = typeof import('../../services/itemService');
type MobileHomeArrivalsCache = {
  items: ProductCard[];
  cachedAt: number;
};

const MOBILE_HOME_ARRIVALS_CACHE_KEY = 'urbanprime:mobile-home-arrivals:v1';
const MOBILE_HOME_ARRIVALS_CACHE_TTL_MS = 5 * 60 * 1000;

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;
let mobileHomeArrivalsMemoryCache: MobileHomeArrivalsCache | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../../services/itemService');
  }

  return itemServiceModulePromise;
};

const isFreshMobileHomeArrivalsCache = (payload: MobileHomeArrivalsCache | null) => (
  Boolean(payload && Array.isArray(payload.items) && payload.items.length > 0 && (Date.now() - payload.cachedAt) < MOBILE_HOME_ARRIVALS_CACHE_TTL_MS)
);

const readMobileHomeArrivalsCache = (): MobileHomeArrivalsCache | null => {
  if (mobileHomeArrivalsMemoryCache && isFreshMobileHomeArrivalsCache(mobileHomeArrivalsMemoryCache)) {
    return mobileHomeArrivalsMemoryCache;
  }

  if (typeof window === 'undefined') {
    return mobileHomeArrivalsMemoryCache;
  }

  try {
    const rawValue = window.sessionStorage.getItem(MOBILE_HOME_ARRIVALS_CACHE_KEY);
    if (!rawValue) return mobileHomeArrivalsMemoryCache;
    const parsed = JSON.parse(rawValue) as MobileHomeArrivalsCache;
    if (!isFreshMobileHomeArrivalsCache(parsed)) return null;
    mobileHomeArrivalsMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
};

const writeMobileHomeArrivalsCache = (payload: MobileHomeArrivalsCache) => {
  mobileHomeArrivalsMemoryCache = payload;
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(MOBILE_HOME_ARRIVALS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore best-effort cache failures.
  }
};

type HeroSlide = {
  id: string;
  label?: string;
  headline?: string;
  subtext?: string;
  primaryCta: string;
  secondaryCta?: string;
  to: string;
  secondaryTo?: string;
  visual: string;
};

type ProductCard = {
  id: string;
  name: string;
  price: string;
  badge?: string;
  image: string;
  to: string;
};

type ExploreCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  to: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: 'buyables-banner',
    label: 'BUYABLES',
    primaryCta: 'Shop Buyables',
    secondaryCta: 'View Deals',
    to: '/browse',
    secondaryTo: '/deals',
    visual: '/mobile-banners/buyables.png'
  },
  {
    id: 'rentables-banner',
    label: 'RENTABLES',
    primaryCta: 'Explore Rentables',
    secondaryCta: 'Start Renting',
    to: '/renters',
    secondaryTo: '/renters',
    visual: '/mobile-banners/rentables.png'
  },
  {
    id: 'pixe-banner',
    label: 'PIXE',
    primaryCta: 'Watch Pixe',
    secondaryCta: 'Open Pixe Feed',
    to: '/pixe',
    secondaryTo: '/pixe/explore',
    visual: '/mobile-banners/pixe.png'
  },
  {
    id: 'profit-banner',
    label: 'SELLER GROWTH',
    primaryCta: 'Start Selling',
    secondaryCta: 'Seller Resources',
    to: '/dropshipping',
    secondaryTo: '/seller-resource-center',
    visual: '/mobile-banners/profit.png'
  }
];

const fallbackArrivals: ProductCard[] = [
  {
    id: 'fallback-1',
    name: 'Lunar Chronograph',
    price: '$295.00',
    badge: 'NEW',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3X5BiWrErY17PHVSZXF5Y5RnnSjkNodxHtoRFE4fufJ-VIgqT7XW2_HvxbbE5a4tc-tYN7gszwCMtBZy5aH1E0E6JEBcW8oHuR-ERqeIywX1iqTwP4G1cD7upeGxk31npORRrU5A8A-9KxJEspxWdRX_jo1J3zX4zNwXSuxq2ySlXDTgoztOIud6_n015CX1IJzSQH4uYnpsECZyJG73CWwojr9pJ8ne6uWgPcUjp0fE3bwE_Vt-IcZoYAGk0F8S3tqgAnFDGAX8',
    to: '/new-arrivals'
  },
  {
    id: 'fallback-2',
    name: 'Apex Velocity',
    price: '$180.00',
    badge: 'LIMITED',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN_5RNEf2ZoGJmBKNRfbR1DlcaeHsUYwu-w1K-dQncQJE2o-mW_EV8sz1EZ10xoaex0sdOFvBkVcMwjY1X7Mq0TWtL9y4ZrfhpOAPF_bpBz9mZP1s-dSPdjl7i7NXDJUtMJRZ0H1_3pBcdmMkl_upDKJqhS0hCE11Qjl99-yo_kdPqvhiKOKMO0eFoTn2UAkvn5ZYgZAm8I3n6vDw3jaVuTw8Qd1JgHwrgsVt9V9tH-A9JZIr1s21dJ-cwE6pds-qL1GJv_IDRJ6M',
    to: '/new-arrivals'
  }
];

const exploreMore: ExploreCard[] = [
  {
    id: 'explore-1',
    title: 'Future Tech',
    description: 'Next-gen wearables available now.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_jcgo7mD9QB9kkX9TXoddziI0XLKtFv0ot9Iu-4j4ZP9JBQWrc0f7WihNLwfeV-eZljBgSyp_R-oaXOtLAdo9a1nl5FA7z4_5Drw-6eMkVmSljE4p1kqpe9eF2oYEQnGQxEIk1AJN8iwM-hhX2wc2l4dxEHE7nML1nLoQGwnZHJCsdvQu4UuidIakldQUXHogSC_8CDwSGaVzAZtsFmdCR1KRCAX5ITUuAgN3_LuHjj-rc6AwQdFmKC5nMEP1mWNgoDWjhbimvJU',
    to: '/electronics'
  },
  {
    id: 'explore-2',
    title: 'MINIMALIST APPAREL',
    description: '',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWsp5tgC3p3JRyFnrnLY02dzWoUUikqQVXzf_DepH081Fzpa9ukvYChN4wMV3XcoBgXWcATPdcIRDn4Pwwueje_AExEXOioB-TuNsedMfMZYcWe9tKaiVIwk6dC6c8Bquw42pgHmnpZxXyKCTkOUjFr7_ZBwtnfRAWuAC1OXu1FGxNrouZusleIM66wgzhqIljj2Tunarz-iGw-zeC_xStSFwD5hXyiAuoLr469OxaPzUXYD7xU34HQGzKJRPHhq2IYqtqU2NJ8-M',
    to: '/clothing'
  },
  {
    id: 'explore-3',
    title: 'ORGANIC SPACES',
    description: '',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN_5RNEf2ZoGJmBKNRfbR1DlcaeHsUYwu-w1K-dQncQJE2o-mW_EV8sz1EZ10xoaex0sdOFvBkVcMwjY1X7Mq0TWtL9y4ZrfhpOAPF_bpBz9mZP1s-dSPdjl7i7NXDJUtMJRZ0H1_3pBcdmMkl_upDKJqhS0hCE11Qjl99-yo_kdPqvhiKOKMO0eFoTn2UAkvn5ZYgZAm8I3n6vDw3jaVuTw8Qd1JgHwrgsVt9V9tH-A9JZIr1s21dJ-cwE6pds-qL1GJv_IDRJ6M',
    to: '/home-living'
  }
];

const quickActions = [
  { id: 'buyables', label: 'Explore Buyables', to: '/browse', icon: 'bag' },
  { id: 'rentables', label: 'Explore Rentables', to: '/renters', icon: 'cube' },
  { id: 'pixe', label: 'Explore Pixe', to: '/pixe/explore', icon: 'play' },
  { id: 'stores', label: 'Explore Stores', to: '/stores', icon: 'store' }
] as const;

const headerSearchQuickLinks = [
  { id: 'search-browse', label: 'Browse', to: '/browse' },
  { id: 'search-rentables', label: 'Rentables', to: '/renters' },
  { id: 'search-pixe', label: 'Pixe', to: '/pixe/explore' },
  { id: 'search-stores', label: 'Stores', to: '/stores' }
];

const SearchIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
const CartIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h2l2.4 10.2h9.9L20 8H8.1" /><circle cx="10" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></svg>;
const PlusIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>;

const QuickActionIcon: React.FC<{ type: 'bag' | 'cube' | 'play' | 'store' }> = ({ type }) => {
  if (type === 'bag') {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 8h14l-1.1 11H6.1z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></svg>;
  }
  if (type === 'cube') {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m12 12 8-4.5M12 12 4 7.5M12 12v9" /></svg>;
  }
  if (type === 'play') {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="m10 9 5 3-5 3z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16v12H4z" /><path d="M8 7V5h8v2" /><path d="M9 12h6" /></svg>;
};

const HomePageMobile: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isLowEndMode = useLowEndMode();
  const headerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const cachedMobileArrivals = readMobileHomeArrivalsCache();
  const [activeSlide, setActiveSlide] = useState(0);
  const [newArrivals, setNewArrivals] = useState<ProductCard[]>(() => cachedMobileArrivals?.items || fallbackArrivals);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadArrivals = async () => {
      try {
        const { itemService } = await loadItemServiceModule();
        const { items } = await itemService.getItems({}, { page: 1, limit: 16 });
        if (!mounted) return;

        const mapped = items
          .filter((item: Item) => (item.imageUrls?.length || item.images?.length || 0) > 0)
          .slice(0, 6)
          .map((item: Item, index: number) => {
            const image = item.imageUrls?.[0] || item.images?.[0] || '';
            const rawPrice = item.salePrice || item.rentalPrice || item.price || 0;
            const badge = index % 2 === 0 ? 'NEW' : 'LIMITED';
            return {
              id: item.id,
              name: item.title,
              price: `$${Number(rawPrice).toFixed(2)}`,
              badge,
              image,
              to: `/item/${item.id}`
            };
          });

        if (mapped.length > 0) {
          setNewArrivals(mapped);
          writeMobileHomeArrivalsCache({
            items: mapped,
            cachedAt: Date.now()
          });
        }
      } catch (error) {
        console.warn('Mobile home arrivals fetch failed:', error);
      }
    };

    const scheduleLoad = () => {
      void loadArrivals();
    };

    if (cachedMobileArrivals) {
      if ('requestIdleCallback' in window) {
        const idleHandle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback?.(
          () => scheduleLoad(),
          { timeout: 2200 }
        );

        return () => {
          mounted = false;
          if (typeof idleHandle === 'number') {
            (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(idleHandle);
          }
        };
      }

      const timer = window.setTimeout(scheduleLoad, 900);
      return () => {
        mounted = false;
        window.clearTimeout(timer);
      };
    }

    scheduleLoad();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const idleHandle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback?.(
        () => {
          void loadItemServiceModule();
        },
        { timeout: 1600 }
      );

      return () => {
        if (typeof idleHandle === 'number') {
          (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(idleHandle);
        }
      };
    }

    const timer = window.setTimeout(() => {
      void loadItemServiceModule();
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isHeaderSearchOpen) return;
    const timer = window.setTimeout(() => headerSearchInputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [isHeaderSearchOpen]);

  const active = useMemo(() => heroSlides[activeSlide], [activeSlide]);
  const topSpacingClass = isHeaderSearchOpen ? 'pt-[11.4rem]' : 'pt-[6.8rem]';
  const isDarkTheme = resolvedTheme === 'obsidian' || resolvedTheme === 'noir' || resolvedTheme === 'hydra';
  const prefersNoirTuning = isLowEndMode || resolvedTheme === 'noir';
  const rootThemeClass = 'bg-background text-text-primary';
  const headerSurfaceClass = isDarkTheme
    ? prefersNoirTuning
      ? 'border-white/12 bg-[#121923]/96 shadow-[0_12px_28px_rgba(0,0,0,0.4)]'
      : 'border-white/15 bg-[#121923]/92 shadow-[0_14px_34px_rgba(0,0,0,0.45)]'
    : 'border-white/80 bg-white/[0.985] shadow-[0_14px_34px_rgba(15,23,42,0.14)]';
  const headerSearchPanelClass = isDarkTheme
    ? prefersNoirTuning
      ? 'mt-2 rounded-[1.25rem] border border-white/12 bg-[#141d29]/94 p-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.42)] backdrop-blur-md'
      : 'mt-2 rounded-[1.25rem] border border-white/15 bg-[#141d29]/88 p-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.44)] backdrop-blur-2xl'
    : 'mt-2 rounded-[1.25rem] border border-white/80 bg-white/[0.9] p-2.5 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl';
  const headerInputWrapClass = isDarkTheme
    ? 'flex items-center gap-2 rounded-full border border-white/15 bg-[#0f1722] px-3 py-2.5'
    : 'flex items-center gap-2 rounded-full border border-white/80 bg-gradient-to-r from-[#eff5fb] to-[#f9fdff] px-3 py-2.5';
  const headerInputClass = isDarkTheme
    ? 'w-full bg-transparent text-sm font-medium text-slate-100 outline-none placeholder:text-slate-400'
    : 'w-full bg-transparent text-sm font-medium text-[#1f2937] outline-none placeholder:text-[#7f8b98]';
  const headerActionClass = isDarkTheme ? 'text-slate-200' : 'text-text-primary';
  const sectionTitleClass = `text-[1.9rem] font-semibold tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-[#4b5560]'}`;
  const sectionLinkClass = isDarkTheme
    ? 'border-b border-slate-500/60 pb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.13em] text-slate-300'
    : 'border-b border-[#7f8b98] pb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.13em] text-[#7f8b98]';
  const heroPanelClass = isDarkTheme
    ? 'mb-5 overflow-hidden rounded-[1.05rem] border border-white/12 bg-surface shadow-[0_16px_32px_rgba(0,0,0,0.34)]'
    : 'mb-5 overflow-hidden rounded-[1.05rem] border border-[#d3d8de] bg-[#dce2e8] shadow-[0_16px_32px_rgba(20,58,40,0.14)]';
  const heroDotsWrapClass = isDarkTheme ? 'flex items-center justify-center gap-1.5 bg-surface/95 py-2' : 'flex items-center justify-center gap-1.5 bg-[#dce2e8] py-2';
  const quickActionIconClass = isDarkTheme
    ? 'flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/20 bg-slate-900/80 text-slate-100 shadow-[0_10px_22px_rgba(0,0,0,0.32)]'
    : 'flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-black/10 bg-white text-black shadow-[0_10px_22px_rgba(0,0,0,0.08)]';
  const quickActionLabelClass = isDarkTheme
    ? 'text-[0.68rem] font-semibold leading-tight tracking-[0.06em] text-slate-200'
    : 'text-[0.68rem] font-semibold leading-tight tracking-[0.06em] text-black';
  const arrivalCardClass = isDarkTheme
    ? 'block overflow-hidden rounded-[0.85rem] border border-white/10 bg-surface p-2 shadow-[0_12px_28px_rgba(0,0,0,0.3)]'
    : 'block overflow-hidden rounded-[0.85rem] bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]';
  const arrivalBadgeClass = isDarkTheme
    ? 'absolute left-3 top-3 rounded-full bg-slate-800/85 px-2.5 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-slate-200'
    : 'absolute left-3 top-3 rounded-full bg-[#e8edf0] px-2.5 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-[#334155]';
  const arrivalActionClass = isDarkTheme
    ? 'absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/92 text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.35)]'
    : 'absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1f2937] shadow-[0_8px_18px_rgba(15,23,42,0.2)]';
  const arrivalTitleClass = isDarkTheme ? 'line-clamp-1 text-[1.05rem] font-semibold tracking-tight text-slate-100' : 'line-clamp-1 text-[1.05rem] font-semibold tracking-tight text-slate-900';
  const arrivalPriceClass = isDarkTheme ? 'mt-0.5 text-[1.1rem] text-slate-300' : 'mt-0.5 text-[1.1rem] text-slate-700';
  const curationCardClass = isDarkTheme
    ? 'block overflow-hidden rounded-[0.95rem] border border-white/10 bg-surface p-1.5 shadow-[0_10px_22px_rgba(0,0,0,0.28)]'
    : 'block overflow-hidden rounded-[0.95rem] border border-[#d5dae0] bg-white p-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)]';
  const quickSearchChipClass = isDarkTheme
    ? 'rounded-full border border-white/15 bg-slate-900/75 px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-slate-200 shadow-[0_8px_18px_rgba(0,0,0,0.25)] transition-transform duration-200 active:scale-95'
    : 'rounded-full border border-white/85 bg-white/80 px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#334155] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-transform duration-200 active:scale-95';
  const searchGoClass = isDarkTheme
    ? 'rounded-full bg-primary px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)]'
    : 'rounded-full bg-[#0f4b35] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(15,75,53,0.3)]';

  const submitHeaderSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = headerSearchQuery.trim();
    setIsHeaderSearchOpen(false);
    if (!query) {
      navigate('/browse');
      return;
    }
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  const openQuickSearchRoute = (to: string) => {
    setIsHeaderSearchOpen(false);
    navigate(to);
  };

  return (
    <div
      className={`relative overflow-x-hidden pb-8 pt-0 ${rootThemeClass}`}
      style={{ fontFamily: '"SF Pro Display","Avenir Next","Segoe UI",sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-20 top-[-12rem] h-72 w-72 rounded-full ${prefersNoirTuning ? 'blur-2xl' : 'blur-3xl'} ${isDarkTheme ? 'bg-primary/25' : 'bg-primary/15'}`} />
        <div className={`absolute -right-24 top-[17rem] h-80 w-80 rounded-full ${prefersNoirTuning ? 'blur-2xl' : 'blur-3xl'} ${isDarkTheme ? 'bg-slate-500/15' : 'bg-slate-200/60'}`} />
        <div className={`absolute bottom-[-12rem] left-10 h-80 w-80 rounded-full ${prefersNoirTuning ? 'blur-2xl' : 'blur-3xl'} ${isDarkTheme ? 'bg-primary/20' : 'bg-emerald-200/60'}`} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-2 z-[75] mx-auto w-full max-w-[560px] px-4">
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={prefersNoirTuning ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -1.4, 0], scale: [1, 1.01, 1] }}
          transition={prefersNoirTuning
            ? { opacity: { duration: 0.32, ease: 'easeOut' } }
            : {
                opacity: { duration: 0.45, ease: 'easeOut' },
                y: { duration: 4.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 },
                scale: { duration: 5.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }
              }}
          className={`pointer-events-auto grid grid-cols-3 items-center rounded-[1.2rem] border px-3 py-3 ${prefersNoirTuning ? 'backdrop-blur-md' : 'backdrop-blur-xl'} ${headerSurfaceClass}`}
        >
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsHeaderSearchOpen((prev) => !prev)}
            className={`justify-self-start rounded-full p-2 transition-transform duration-200 active:scale-95 ${headerActionClass}`}
          >
            <SearchIcon />
          </button>
          <div className={`justify-self-center text-[1.05rem] font-semibold tracking-tight ${headerActionClass}`}>
            UrbanPrime
          </div>
          <button
            type="button"
            aria-label="Cart"
            onClick={() => navigate('/cart')}
            className={`justify-self-end rounded-full p-2 transition-transform duration-200 active:scale-95 ${headerActionClass}`}
          >
            <CartIcon />
          </button>
        </motion.header>

        <AnimatePresence>
          {isHeaderSearchOpen ? (
            <motion.form
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 250, damping: 22 }}
              onSubmit={submitHeaderSearch}
              className={`pointer-events-auto ${headerSearchPanelClass}`}
            >
              <div className={headerInputWrapClass}>
                <SearchIcon />
                <input
                  ref={headerSearchInputRef}
                  value={headerSearchQuery}
                  onChange={(event) => setHeaderSearchQuery(event.target.value)}
                  placeholder="Search products, stores, creators..."
                  className={headerInputClass}
                />
                <button
                  type="submit"
                  className={searchGoClass}
                >
                  Go
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {headerSearchQuickLinks.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => openQuickSearchRoute(entry.to)}
                    className={quickSearchChipClass}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </div>

      <div className={`relative mx-auto max-w-[560px] px-4 ${topSpacingClass}`}>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={heroPanelClass}
        >
          <div className="relative aspect-[3/2] min-h-[320px] overflow-hidden rounded-[1.05rem]">
            <img src={active.visual} alt={active.headline || active.label || 'UrbanPrime banner'} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a18] via-[#0f172a1f] to-[#0f172a45]" />
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -26 }}
                transition={{ duration: 0.42, ease: 'easeInOut' }}
                className="relative z-10 flex h-full flex-col justify-end p-5"
              >
                {active.label ? (
                  <div className="mb-3 inline-flex w-fit rounded-full bg-black/40 px-3.5 py-1 text-[0.62rem] font-semibold tracking-[0.24em] text-white backdrop-blur-sm">
                    {active.label}
                  </div>
                ) : null}
                {active.headline ? (
                  <h1 className="max-w-[70%] text-[3rem] font-semibold leading-[0.93] tracking-tight text-white">{active.headline}</h1>
                ) : null}
                {active.subtext ? (
                  <p className="mt-3 max-w-[88%] text-[0.65rem] leading-relaxed text-white/88">{active.subtext}</p>
                ) : null}
                <div className="mt-6 flex items-center gap-2.5">
                  <Link
                    to={active.to}
                    className="inline-flex min-w-[128px] items-center justify-center rounded-full bg-white px-4 py-2.5 text-[0.64rem] font-semibold tracking-[0.12em] text-[#0f172a] shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-transform duration-300 active:scale-95"
                  >
                    {active.primaryCta}
                  </Link>
                  {active.secondaryCta ? (
                    <Link
                      to={active.secondaryTo || active.to}
                      className="inline-flex min-w-[128px] items-center justify-center rounded-full border border-white/55 bg-white/24 px-4 py-2.5 text-[0.64rem] font-semibold tracking-[0.12em] text-white backdrop-blur-sm transition-transform duration-300 active:scale-95"
                    >
                      {active.secondaryCta}
                    </Link>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className={heroDotsWrapClass}>
            {heroSlides.map((slide, index) => (
              <span
                key={slide.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === activeSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/45'}`}
              />
            ))}
          </div>
        </motion.section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitleClass}>Explore the Social Marketplace</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  to={action.to}
                  className={`group relative flex min-h-[114px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.35rem] border px-2 py-3 text-center ${prefersNoirTuning ? 'backdrop-blur-md' : 'backdrop-blur-xl'} transition duration-200 active:scale-95 ${isDarkTheme ? 'border-white/10 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.28)]' : 'border-white/80 bg-white/75 shadow-[0_12px_28px_rgba(15,23,42,0.08)]'}`}
                >
                  <span className="absolute right-2 top-2 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-600 dark:bg-sky-400/10 dark:text-sky-200">Go</span>
                  <span className={quickActionIconClass}>
                    <QuickActionIcon type={action.icon} />
                  </span>
                  <span className={quickActionLabelClass}>{action.label}</span>
                  <span className="absolute bottom-2 right-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><path d="M9 5h10v10M19 5 5 19" /></svg>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitleClass}>New Arrivals</h2>
            <div className="flex items-center gap-2">
              <Link to="/new-arrivals" className={sectionLinkClass}>View all</Link>
            </div>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {newArrivals.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 22 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-55px' }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className="min-w-[212px] snap-start"
              >
                <Link to={item.to} className={arrivalCardClass}>
                  <div className="relative overflow-hidden rounded-[0.82rem]">
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-[284px] w-full object-cover" />
                    {item.badge ? (
                      <span className={arrivalBadgeClass}>
                        {item.badge}
                      </span>
                    ) : null}
                    <button type="button" className={arrivalActionClass} aria-label="Quick add">
                      <PlusIcon />
                    </button>
                  </div>
                  <div className="px-0.5 pt-2.5">
                    <h3 className={arrivalTitleClass}>{item.name}</h3>
                    <p className={arrivalPriceClass}>{item.price}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitleClass}>Explore Curation</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-45px' }}
            transition={{ duration: 0.35 }}
            whileTap={{ scale: 0.98 }}
            className="mb-3"
          >
            <Link to={exploreMore[0].to} className={curationCardClass}>
              <div className="relative overflow-hidden rounded-[0.8rem]">
                <img src={exploreMore[0].image} alt={exploreMore[0].title} loading="lazy" decoding="async" className="h-[220px] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3">
                  <h3 className="text-[2rem] font-semibold leading-[1] tracking-tight text-white">{exploreMore[0].title}</h3>
                  <p className="text-[1rem] text-white/90">{exploreMore[0].description}</p>
                </div>
              </div>
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-2.5">
            {exploreMore.slice(1).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-45px' }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={item.to} className={curationCardClass}>
                  <div className="relative overflow-hidden rounded-[0.8rem]">
                    <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-[182px] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-2.5">
                      <h3 className="text-[1.6rem] font-semibold leading-[0.9] text-white">{item.title}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePageMobile;
