
// pages/public/HomePage.tsx
import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import { useTheme } from '../../hooks/useTheme';
import useLowEndMode from '../../hooks/useLowEndMode';
import { useHeroStyle } from '../../context/HeroStyleContext';
import Magnetic from '../../components/Magnetic';
import HomePageMobile from './HomePageMobile';
import HeroSwitcher from '../../components/Hero/HeroSwitcher';

// --- Assets & Icons ---
const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const StarIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const QuickViewModal = lazy(() => import('../../components/QuickViewModal'));
const GemstoneHeroCard = lazy(() => import('../../components/GemstoneHeroCard'));

type ItemServiceModule = typeof import('../../services/itemService');
type HomePageCachePayload = {
    products: Item[];
    flashSaleItems: Item[];
    cachedAt: number;
};

const HOME_PAGE_CACHE_KEY = 'urbanprime:home-page-cache:v1';
const HOME_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;
let homePageMemoryCache: HomePageCachePayload | null = null;

const loadItemServiceModule = () => {
    if (!itemServiceModulePromise) {
        itemServiceModulePromise = import('../../services/itemService');
    }

    return itemServiceModulePromise;
};

const isFreshHomeCache = (payload: HomePageCachePayload | null) => (
    Boolean(payload && Array.isArray(payload.products) && payload.products.length > 0 && (Date.now() - payload.cachedAt) < HOME_PAGE_CACHE_TTL_MS)
);

const readHomePageCache = (): HomePageCachePayload | null => {
    if (homePageMemoryCache && isFreshHomeCache(homePageMemoryCache)) {
        return homePageMemoryCache;
    }

    if (typeof window === 'undefined') {
        return homePageMemoryCache;
    }

    try {
        const rawValue = window.sessionStorage.getItem(HOME_PAGE_CACHE_KEY);
        if (!rawValue) return homePageMemoryCache;
        const parsed = JSON.parse(rawValue) as HomePageCachePayload;
        if (!isFreshHomeCache(parsed)) return null;
        homePageMemoryCache = parsed;
        return parsed;
    } catch {
        return null;
    }
};

const writeHomePageCache = (payload: HomePageCachePayload) => {
    homePageMemoryCache = payload;
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(HOME_PAGE_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore storage failures; cache is best-effort only.
    }
};

type ExploreOption = {
    id: string;
    label: string;
    to: string;
    icon: 'bag' | 'cube' | 'play' | 'store';
    image: string;
    detail: string;
    video?: string;
};

const HOME_EXPLORE_OPTIONS: ExploreOption[] = [
    {
        id: 'buyables',
        label: 'Explore Buyables',
        to: '/browse',
        icon: 'bag',
        image: '/explore-cards/buyables.jpg',
        detail: 'Curated tech, fashion, and essentials in one premium feed.'
    },
    {
        id: 'rentables',
        label: 'Explore Rentables',
        to: '/renters',
        icon: 'cube',
        image: '/explore-cards/rentables.png',
        detail: 'Access luxury stays and vehicles without full ownership.'
    },
    {
        id: 'pixe',
        label: 'Explore Pixe',
        to: '/pixe/explore',
        icon: 'play',
        image: '/explore-cards/pixe.png',
        detail: 'Scroll cinematic short videos and live visual shopping.'
    },
    {
        id: 'stores',
        label: 'Explore Stores',
        to: '/stores',
        icon: 'store',
        image: '/explore-cards/rentables.png',
        video: '/explore-cards/stores.mp4',
        detail: 'Jump into flagship storefronts and branded experiences.'
    }
];

const HomeExploreIcon: React.FC<{ type: ExploreOption['icon']; className?: string }> = ({ type, className = 'h-7 w-7' }) => {
    if (type === 'bag') {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M5 8h14l-1.1 11H6.1z" />
                <path d="M9 9V7a3 3 0 0 1 6 0v2" />
            </svg>
        );
    }
    if (type === 'cube') {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
                <path d="m12 12 8-4.5M12 12 4 7.5M12 12v9" />
            </svg>
        );
    }
    if (type === 'play') {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
                <circle cx="12" cy="12" r="8" />
                <path d="m10 9 5 3-5 3z" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M4 7h16v12H4z" />
            <path d="M8 7V5h8v2" />
            <path d="M9 12h6" />
        </svg>
    );
};

// --- 1. HERO SECTION (Optimized Physics & Glass) ---
const HeroSection: React.FC = () => {
    const { theme, resolvedTheme } = useTheme();
    const isLowEndMode = useLowEndMode();
    const prefersNoirTuning = isLowEndMode || resolvedTheme === 'noir';
    // Removed heavy spring physics for mouse movement to improve performance
    // Using lighter CSS-based animations for background
    
    // Dynamic glass style based on theme
    let glassClass = prefersNoirTuning
        ? "bg-white/40 border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.05)] backdrop-blur-[20px] dark:bg-[#121216]/84 dark:border-white/[0.08] dark:shadow-[0_0_34px_rgba(80,20,255,0.08)] dark:backdrop-blur-[16px]"
        : "bg-white/40 border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.05)] backdrop-blur-[20px] dark:bg-white/[0.02] dark:border-white/[0.1] dark:shadow-[0_0_60px_rgba(80,20,255,0.1)] dark:backdrop-blur-[30px]";
    
    if (theme === 'sandstone') {
        glassClass = "bg-[rgba(230,220,200,0.25)] border border-[rgba(255,255,255,0.2)] shadow-[0_20px_40px_rgba(62,39,35,0.08)] backdrop-blur-[25px]";
    } else if (theme === 'icy') {
        glassClass = "bg-[rgba(225,245,255,0.35)] border border-[rgba(255,255,255,0.6)] shadow-[0_15px_50px_rgba(0,119,182,0.15)] backdrop-blur-[20px] saturate-150";
    } else if (theme === 'hydra') {
        // Deep ocean dark glass
        glassClass = "bg-[rgba(0,20,40,0.4)] border border-[rgba(0,229,255,0.3)] shadow-[0_0_40px_rgba(0,229,255,0.15)] backdrop-blur-[20px]";
    }

    return (
        <section 
            className="relative min-h-[85vh] sm:min-h-[90vh] w-full overflow-hidden flex items-center justify-center bg-transparent pt-16 pb-16 md:pt-20 md:pb-20 transition-colors duration-700"
        >
             {/* Optimized Background Gradients - Reduced blur radius for performance */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className={`absolute top-[-10%] left-[-5%] w-[80%] h-[80%] rounded-full ${
                        prefersNoirTuning ? 'blur-2xl opacity-28' : 'filter blur-3xl opacity-40 animate-pulse'
                    }
                    bg-gradient-to-tr from-blue-200 via-purple-200 to-indigo-100 
                    dark:from-indigo-600/30 dark:via-violet-600/30 dark:to-blue-600/30`}
                    style={prefersNoirTuning ? undefined : { animationDuration: '8s' }}
                />
                <div 
                    className={`absolute bottom-[-10%] right-[-5%] w-[70%] h-[70%] rounded-full ${
                        prefersNoirTuning ? 'blur-2xl opacity-24' : 'filter blur-3xl opacity-40 animate-pulse'
                    }
                    bg-gradient-to-bl from-rose-100 via-orange-100 to-amber-100 
                    dark:from-fuchsia-600/30 dark:via-purple-600/30 dark:to-cyan-600/30`}
                     style={prefersNoirTuning ? undefined : { animationDuration: '10s', animationDelay: '1s' }}
                />
             </div>

            <div
                className="relative z-10 w-[94%] max-w-[1100px] aspect-[4/3] sm:aspect-[16/10] md:aspect-[2.4/1] min-h-[420px] sm:min-h-[480px] flex items-center justify-center"
            >
                <div className={`absolute inset-0 rounded-[2.5rem] overflow-hidden transition-all duration-700 ${glassClass}`}>
                    <div className="absolute inset-0 opacity-[0.03] bg-black mix-blend-overlay"></div>
                    {/* Simplified Sheen Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="relative z-30 flex flex-col items-center text-center px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
                         <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full shadow-lg transition-colors duration-700
                            ${theme === 'sandstone' 
                                ? 'bg-[rgba(230,220,200,0.5)] border border-[rgba(78,52,46,0.1)] text-[#3E2723]' 
                                : theme === 'icy'
                                    ? 'bg-[rgba(225,245,255,0.5)] border border-white/50 text-[#023E8A]'
                                    : theme === 'hydra'
                                        ? 'bg-[rgba(0,20,40,0.7)] border border-[rgba(0,229,255,0.3)] text-[#00E5FF]'
                                        : 'bg-white/60 border border-white/80 text-gray-600 dark:bg-black/40 dark:border-white/10 dark:text-gray-200'
                            } ${prefersNoirTuning ? 'backdrop-blur-sm' : 'backdrop-blur-md'}`}
                        >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            <span className="uppercase tracking-[0.25em] text-[10px] font-bold">The Future of Commerce</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="mb-6 relative">
                         <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-serif font-black tracking-tighter leading-[0.9] drop-shadow-2xl">
                            <span className={`block bg-clip-text text-transparent bg-gradient-to-b transition-all duration-700
                                ${theme === 'sandstone' 
                                    ? 'from-[#3E2723] via-[#5D4037] to-[#8D6E63]' 
                                    : theme === 'icy'
                                        ? 'from-[#023E8A] via-[#0077B6] to-[#00B4D8]'
                                        : theme === 'hydra'
                                            ? 'from-[#E0F7FA] via-[#B2EBF2] to-[#4DD0E1]'
                                            : 'from-gray-900 via-gray-800 to-gray-500 dark:from-white dark:via-white dark:to-white/60'
                                }`}>
                                URBAN
                            </span>
                            <span className={`block text-transparent bg-clip-text bg-gradient-to-r 
                                ${theme === 'hydra' 
                                    ? 'from-[#00E5FF] via-[#00BCD4] to-[#006064]' 
                                    : 'from-cyan-500 via-blue-500 to-purple-600 dark:from-cyan-300 dark:via-white dark:to-purple-400'
                                }`}>
                                PRIME
                            </span>
                        </h1>
                    </motion.div>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className={`max-w-lg mx-auto text-sm sm:text-base md:text-lg font-medium leading-relaxed mb-10 drop-shadow-md tracking-wide transition-colors duration-700
                            ${theme === 'sandstone' ? 'text-[#4E342E]' 
                            : theme === 'icy' ? 'text-[#022B3A]' 
                            : theme === 'hydra' ? 'text-[#B2EBF2]'
                            : 'text-gray-600 dark:text-gray-300/90'}`}
                    >
                        Experience possession without ownership. <br className="hidden md:block" /> Curated luxury rentals and exclusive sales.
                    </motion.p>
                    
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex flex-col sm:flex-row gap-5 items-center">
                        <Magnetic strength={20} disabled={prefersNoirTuning}>
                            <Link to="/browse" className={`group relative px-6 sm:px-8 py-3 sm:py-4 font-bold text-xs sm:text-sm uppercase tracking-widest rounded-full overflow-hidden transition-all duration-300
                                ${theme === 'sandstone' 
                                    ? 'bg-[#3E2723] text-[#E6DCC8] shadow-lg hover:shadow-xl' 
                                    : theme === 'icy'
                                        ? 'bg-[#0077B6] text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 border border-white/20'
                                        : theme === 'hydra'
                                            ? 'bg-gradient-to-r from-[#00BCD4] to-[#00E5FF] text-[#001020] shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(0,229,255,0.6)]'
                                            : 'bg-gray-900 text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] dark:bg-white dark:text-black dark:shadow-[0_0_30px_rgba(255,255,255,0.15)] dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]'
                                }`}
                            >
                                <span className="relative z-10 transition-colors">Start Exploring</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"></div>
                            </Link>
                        </Magnetic>

                        <Magnetic strength={16} disabled={prefersNoirTuning}>
                            <Link to="/spotlight" className={`group flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest ${prefersNoirTuning ? 'backdrop-blur-md' : 'backdrop-blur-xl'} transition-all shadow-lg
                                ${theme === 'sandstone'
                                    ? 'bg-[rgba(230,220,200,0.55)] border border-[rgba(78,52,46,0.08)] text-[#3E2723] hover:bg-[rgba(230,220,200,0.82)]'
                                    : theme === 'icy'
                                        ? 'bg-white/42 border border-white/60 text-[#0B5FA5] hover:bg-white/65'
                                        : theme === 'hydra'
                                            ? 'bg-[rgba(0,20,40,0.62)] border border-[rgba(0,229,255,0.28)] text-[#D7FBFF] hover:bg-[rgba(0,40,80,0.72)]'
                                            : 'bg-white/64 border border-white/80 text-gray-800 hover:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20'
                                }`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform
                                    ${theme === 'sandstone' ? 'bg-[#6D4C41] text-[#FFF4E3]' 
                                    : theme === 'icy' ? 'bg-[#0B5FA5] text-white' 
                                    : theme === 'hydra' ? 'bg-[#00E5FF] text-[#001020]'
                                    : 'bg-slate-950 text-white dark:bg-white dark:text-black'}`}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                                        <path d="M12 3.2l2.1 5.2L19 10.5l-4.9 2.1L12 18l-2.1-5.4L5 10.5l4.9-2.1z" />
                                    </svg>
                                </div>
                                <span>Spotlight</span>
                            </Link>
                        </Magnetic>

                        <Magnetic strength={15} disabled={prefersNoirTuning}>
                            <Link to="/reels" className={`group flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest ${prefersNoirTuning ? 'backdrop-blur-md' : 'backdrop-blur-xl'} transition-all shadow-lg
                                ${theme === 'sandstone'
                                    ? 'bg-[rgba(230,220,200,0.5)] border border-[rgba(78,52,46,0.1)] text-[#3E2723] hover:bg-[rgba(230,220,200,0.8)]'
                                    : theme === 'icy'
                                        ? 'bg-white/40 border border-white/60 text-[#0077B6] hover:bg-white/60'
                                        : theme === 'hydra'
                                            ? 'bg-[rgba(0,20,40,0.6)] border border-[rgba(0,229,255,0.3)] text-[#E0F7FA] hover:bg-[rgba(0,40,80,0.6)]'
                                            : 'bg-white/60 border border-white/80 text-gray-800 hover:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform
                                    ${theme === 'sandstone' ? 'bg-[#3E2723] text-[#E6DCC8]' 
                                    : theme === 'icy' ? 'bg-[#0077B6] text-white' 
                                    : theme === 'hydra' ? 'bg-[#00E5FF] text-[#001020]'
                                    : 'bg-gray-900 text-white dark:bg-white dark:text-black'}`}>
                                    <PlayIcon />
                                </div>
                                <span>Watch Pixes</span>
                            </Link>
                        </Magnetic>
                    </motion.div>
                </div>
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={prefersNoirTuning ? { opacity: 0.42, y: 0 } : { opacity: 0.6, y: [0, 8, 0] }}
                transition={prefersNoirTuning ? { delay: 1.1, duration: 0.5, ease: 'easeOut' } : { delay: 1.5, duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-20
                    ${theme === 'sandstone' ? 'text-[#5D4037]' 
                    : theme === 'icy' ? 'text-[#023E8A]' 
                    : theme === 'hydra' ? 'text-[#00E5FF]'
                    : 'text-gray-400 dark:text-white/30'}`}
            >
                <span className="text-[9px] uppercase tracking-widest font-bold">Discover</span>
                <div className={`w-px h-10 bg-gradient-to-b ${theme === 'sandstone' ? 'from-[#5D4037]' : theme === 'icy' ? 'from-[#023E8A]' : theme === 'hydra' ? 'from-[#00E5FF]' : 'from-gray-400 dark:from-white/30'} to-transparent`}></div>
            </motion.div>
        </section>
    );
};

// --- 2. INFINITY RIBBON MARQUEE ---
const Marquee: React.FC<{ isBannerHero?: boolean }> = ({ isBannerHero = false }) => (
  <div
    className={`relative z-20 ${
      isBannerHero
        ? '-mt-12 mb-12 md:mb-16 rotate-[-0.45deg] scale-[1.01]'
        : '-mt-10 mb-12 md:mb-20 rotate-[-1deg] scale-105'
    } origin-center pointer-events-none select-none`}
  >
    {/* Glass Strip */}
    <div className="absolute inset-0 border-y border-border/60 bg-surface/80 backdrop-blur-xl shadow-xl dark:border-white/10 dark:bg-[#111]/80"></div>
    
    <div className="relative flex overflow-x-hidden py-5 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs font-black">
      <div className="animate-marquee whitespace-nowrap flex gap-16 text-gray-900 dark:text-white/90 items-center">
        {Array(8).fill("Exclusive Drop").map((text, i) => (
          <React.Fragment key={i}>
            <span>{text}</span>
            <span className="text-primary"><StarIcon /></span>
             <span>Luxury Rentals</span>
             <span className="text-[#d5bf7f]"><StarIcon /></span>
             <span>Verified</span>
             <span className="text-primary"><StarIcon /></span>
          </React.Fragment>
        ))}
      </div>
       <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex gap-16 text-gray-900 dark:text-white/90 items-center py-5">
        {Array(8).fill("Exclusive Drop").map((text, i) => (
          <React.Fragment key={i}>
            <span>{text}</span>
            <span className="text-primary"><StarIcon /></span>
             <span>Luxury Rentals</span>
             <span className="text-[#d5bf7f]"><StarIcon /></span>
             <span>Verified</span>
             <span className="text-primary"><StarIcon /></span>
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
);

// --- 3. QUICK EXPLORE (MONOCHROME NAVIGATION) ---
const CollectionDiscovery: React.FC = () => {
    const { theme, resolvedTheme } = useTheme();
    const isLowEndMode = useLowEndMode();
    const prefersNoirTuning = isLowEndMode || resolvedTheme === 'noir';
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [isDeckHovered, setIsDeckHovered] = useState(false);
    const [supportsWheelLock, setSupportsWheelLock] = useState(false);
    const wheelGateRef = useRef(0);
    const tiltX = useMotionValue(0);
    const tiltY = useMotionValue(0);
    const shineShift = useMotionValue(0);
    const smoothTiltX = useSpring(tiltX, { stiffness: 170, damping: 22, mass: 0.35 });
    const smoothTiltY = useSpring(tiltY, { stiffness: 170, damping: 22, mass: 0.35 });
    const smoothShineShift = useSpring(shineShift, { stiffness: 120, damping: 20, mass: 0.55 });

    const rotateDeck = useCallback((direction: 1 | -1) => {
        setActiveCardIndex((prev) => {
            const total = HOME_EXPLORE_OPTIONS.length;
            return (prev + direction + total) % total;
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia('(hover: hover) and (pointer: fine)');
        const sync = () => setSupportsWheelLock(media.matches);
        sync();

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', sync);
            return () => media.removeEventListener('change', sync);
        }

        media.addListener(sync);
        return () => media.removeListener(sync);
    }, []);

    useEffect(() => {
        if (!(isDeckHovered && supportsWheelLock && !prefersNoirTuning)) return;

        const previousOverflow = document.body.style.overflow;
        const previousOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'contain';

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.overscrollBehavior = previousOverscroll;
        };
    }, [isDeckHovered, prefersNoirTuning, supportsWheelLock]);

    useEffect(() => {
        if (!(isDeckHovered && supportsWheelLock && !prefersNoirTuning)) return;
        const interval = window.setInterval(() => rotateDeck(1), 2100);
        return () => window.clearInterval(interval);
    }, [isDeckHovered, prefersNoirTuning, rotateDeck, supportsWheelLock]);

    const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (!supportsWheelLock || prefersNoirTuning) return;
        event.preventDefault();
        event.stopPropagation();

        const now = Date.now();
        if (Math.abs(event.deltaY) < 10 || now - wheelGateRef.current < 460) return;
        wheelGateRef.current = now;
        rotateDeck(event.deltaY > 0 ? 1 : -1);
    }, [prefersNoirTuning, rotateDeck, supportsWheelLock]);

    const handleDeckMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (prefersNoirTuning) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1);
        const relativeY = (event.clientY - rect.top) / Math.max(rect.height, 1);
        const xFromCenter = (relativeX - 0.5) * 2;
        const yFromCenter = (relativeY - 0.5) * 2;

        tiltX.set(-(yFromCenter * 6.5));
        tiltY.set(xFromCenter * 8);
        shineShift.set((relativeX - 0.5) * 28);
    }, [prefersNoirTuning, shineShift, tiltX, tiltY]);

    const resetDeckMotion = useCallback(() => {
        tiltX.set(0);
        tiltY.set(0);
        shineShift.set(0);
    }, [shineShift, tiltX, tiltY]);

    const orderedCards = HOME_EXPLORE_OPTIONS.map((_, offset) => {
        const index = (activeCardIndex + offset) % HOME_EXPLORE_OPTIONS.length;
        return HOME_EXPLORE_OPTIONS[index];
    });

    const stackTransforms = [
        { x: 0, y: 0, rotate: -2.8, scale: 1, opacity: 1, blur: 0 },
        { x: 30, y: 52, rotate: 2.2, scale: 0.945, opacity: 0.94, blur: 0 },
        { x: 54, y: 106, rotate: -1.8, scale: 0.9, opacity: 0.85, blur: 0.5 },
        { x: 74, y: 154, rotate: 1.2, scale: 0.86, opacity: 0.72, blur: 1.1 }
    ] as const;

    let sectionSurface = 'from-[rgba(255,252,245,0.88)] via-[rgba(250,245,229,0.72)] to-[rgba(241,232,199,0.34)] border-[rgba(156,167,99,0.28)] text-[#2f3720]';
    let textSecondary = 'text-[#6f7754]';
    let activeDot = 'bg-[#2f3720]';
    let inactiveDot = 'bg-[#b7b487]/45';
    let hintTone = 'text-[#6f7754]';
    let glowOne = 'from-[#d9dfbc]/55 to-transparent';
    let glowTwo = 'from-[#efe0b4]/55 to-transparent';
    let imageOverlay = 'from-[#fffef7]/8 via-transparent to-[#f1e8c7]/16';

    if (theme === 'sandstone') {
        sectionSurface = 'from-[#f4eee4]/80 via-[#e8dcc6]/42 to-[#f6eee2]/20 border-[#d2bfa0]/55 text-[#3b2d20]';
        textSecondary = 'text-[#6b5440]';
        activeDot = 'bg-[#3b2d20]';
        inactiveDot = 'bg-[#8a7156]/40';
        hintTone = 'text-[#5f4a38]';
        glowOne = 'from-[#f0d8b5]/45 to-transparent';
        glowTwo = 'from-[#cda978]/35 to-transparent';
        imageOverlay = 'from-[#fff7ef]/6 via-transparent to-[#f4e7d2]/12';
    } else if (theme === 'icy') {
        sectionSurface = 'from-[#ecf8ff]/80 via-[#d9efff]/45 to-[#eef9ff]/20 border-[#9dcbe4]/55 text-[#0d3550]';
        textSecondary = 'text-[#1f5878]';
        activeDot = 'bg-[#0d3550]';
        inactiveDot = 'bg-[#2d76a0]/35';
        hintTone = 'text-[#145073]';
        glowOne = 'from-[#bfe7ff]/45 to-transparent';
        glowTwo = 'from-[#7fc9ef]/35 to-transparent';
        imageOverlay = 'from-[#effbff]/8 via-transparent to-[#c9ecff]/12';
    } else if (theme === 'hydra') {
        sectionSurface = 'from-[#052238]/78 via-[#0a314f]/38 to-[#031624]/24 border-[#1d607f]/55 text-[#e0f8ff]';
        textSecondary = 'text-[#89c8df]';
        activeDot = 'bg-[#d2f7ff]';
        inactiveDot = 'bg-[#4f89a3]/42';
        hintTone = 'text-[#92cfe6]';
        glowOne = 'from-[#00bcd4]/28 to-transparent';
        glowTwo = 'from-[#46e5ff]/22 to-transparent';
        imageOverlay = 'from-[#9be8ff]/10 via-transparent to-[#6dd5ef]/14';
    }

    return (
        <section className="py-14 sm:py-16 md:py-20 bg-transparent text-text-primary relative overflow-hidden">
            <div className={`absolute -top-24 left-[-6%] h-[320px] w-[320px] rounded-full bg-gradient-to-br pointer-events-none ${prefersNoirTuning ? 'blur-2xl opacity-75' : 'blur-3xl'} ${glowOne}`} />
            <div className={`absolute -bottom-24 right-[-6%] h-[340px] w-[340px] rounded-full bg-gradient-to-tl pointer-events-none ${prefersNoirTuning ? 'blur-2xl opacity-70' : 'blur-3xl'} ${glowTwo}`} />
            <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className={`relative overflow-hidden rounded-[2rem] border bg-gradient-to-br ${prefersNoirTuning ? 'backdrop-blur-lg' : 'backdrop-blur-2xl'} px-5 py-8 md:px-10 md:py-12 ${sectionSurface}`}>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
                    <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_520px]">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.5 }}
                            className="space-y-5 md:space-y-7"
                        >
                            <span className="inline-flex rounded-full border border-current/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                                Smart Explore Deck
                            </span>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold leading-[0.95] tracking-tight">
                                Urban Prime
                            </h2>
                            <p className={`max-w-md text-base md:text-xl ${textSecondary}`}>
                                Everything you need. One platform. Hover the deck and scroll to fluidly rotate Buyables, Rentables, Pixe, and Stores.
                            </p>
                            <div className={`inline-flex rounded-xl border border-current/15 px-4 py-2 text-xs uppercase tracking-[0.14em] ${prefersNoirTuning ? 'bg-white/38 dark:bg-black/32' : 'bg-white/30 backdrop-blur-xl dark:bg-black/25'} ${hintTone}`}>
                                {supportsWheelLock && !prefersNoirTuning ? 'Hover Deck: Page Scroll Locks For Immersive Card Control' : 'Touch Device: Tap Dots Or Cards To Navigate'}
                            </div>
                        </motion.div>

                        <div className="relative">
                            <div
                                className="relative mx-auto h-[450px] w-full max-w-[500px]"
                                onMouseEnter={() => {
                                    if (!prefersNoirTuning) setIsDeckHovered(true);
                                }}
                                onMouseLeave={() => {
                                    setIsDeckHovered(false);
                                    resetDeckMotion();
                                }}
                                onMouseMove={prefersNoirTuning ? undefined : handleDeckMouseMove}
                                onWheel={prefersNoirTuning ? undefined : handleWheel}
                            >
                                {orderedCards
                                    .map((card, rank) => ({ card, rank }))
                                    .reverse()
                                    .map(({ card, rank }) => {
                                        const transform = stackTransforms[Math.min(rank, stackTransforms.length - 1)];
                                        const isFront = rank === 0;
                                        return (
                                            <motion.div
                                                key={card.id}
                                                className="absolute inset-0 origin-bottom-right"
                                                style={{
                                                    zIndex: 40 - rank,
                                                    pointerEvents: isFront ? 'auto' : 'none',
                                                    transformStyle: 'preserve-3d',
                                                    perspective: 1800,
                                                    ...(isFront && !prefersNoirTuning ? { rotateX: smoothTiltX, rotateY: smoothTiltY } : {})
                                                }}
                                                animate={{
                                                    x: transform.x,
                                                    y: transform.y,
                                                    rotate: transform.rotate,
                                                    scale: transform.scale,
                                                    opacity: transform.opacity,
                                                    ...(prefersNoirTuning ? {} : { filter: `blur(${transform.blur}px)` })
                                                }}
                                                transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.95 }}
                                            >
                                                <Link
                                                    to={card.to}
                                                    className={`group relative block h-[360px] overflow-hidden rounded-[2rem] border border-white/55 p-3 ${
                                                        prefersNoirTuning
                                                            ? 'bg-white/38 shadow-[0_22px_52px_rgba(0,0,0,0.22)] backdrop-blur-xl'
                                                            : 'bg-white/25 shadow-[0_30px_78px_rgba(0,0,0,0.24)] backdrop-blur-3xl'
                                                    }`}
                                                    aria-label={card.label}
                                                >
                                                    <div className="relative h-full overflow-hidden rounded-[1.5rem]">
                                                        {card.video ? (
                                                            <video
                                                                src={card.video}
                                                                poster={card.image}
                                                                className="h-full w-full object-cover grayscale-[0.05] contrast-[1.07] transition-transform duration-1000 group-hover:scale-[1.045]"
                                                                autoPlay
                                                                muted
                                                                loop
                                                                playsInline
                                                                preload="metadata"
                                                            />
                                                        ) : (
                                                            <img
                                                                src={card.image}
                                                                alt={card.label}
                                                                className="h-full w-full object-cover grayscale-[0.05] contrast-[1.07] transition-transform duration-1000 group-hover:scale-[1.045]"
                                                                loading={isFront ? 'eager' : 'lazy'}
                                                            />
                                                        )}
                                                        <div className={`absolute inset-0 bg-gradient-to-b ${imageOverlay}`} />
                                                        {isFront && !prefersNoirTuning && (
                                                            <motion.div
                                                                className="pointer-events-none absolute inset-y-0 left-[-25%] w-[38%] rotate-[14deg] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.35)_55%,rgba(255,255,255,0)_100%)] mix-blend-screen"
                                                                style={{ x: smoothShineShift }}
                                                            />
                                                        )}
                                                        <div className="absolute left-4 top-4 right-4 flex items-center justify-between">
                                                            <span className={`rounded-full px-3 py-1 text-[1.35rem] font-serif italic tracking-tight text-slate-900 ${prefersNoirTuning ? 'bg-white/82' : 'bg-white/72 backdrop-blur-md'}`}>
                                                                {card.label.replace('Explore ', '')}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-slate-700 ${prefersNoirTuning ? 'bg-white/78' : 'bg-white/65 backdrop-blur-md'}`}>
                                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                            </span>
                                                        </div>
                                                        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-white/85">
                                                            <span className={`rounded-full border border-white/55 p-2 ${prefersNoirTuning ? 'bg-white/30' : 'bg-white/20 backdrop-blur-md'}`}><HomeExploreIcon type={card.icon} className="h-4 w-4" /></span>
                                                            <span className="h-2 w-2 rounded-full bg-white/90" />
                                                            <span className="h-2 w-2 rounded-full bg-white/65" />
                                                            <span className="h-2 w-2 rounded-full bg-white/50" />
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 p-5">
                                                            <p className={`max-w-[84%] rounded-xl px-3 py-2 text-[12px] leading-relaxed text-slate-800 ${prefersNoirTuning ? 'bg-white/82' : 'bg-white/72 backdrop-blur-md'}`}>
                                                                {card.detail}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                            </div>

                            <div className="mt-4 flex items-center justify-center gap-2">
                                {HOME_EXPLORE_OPTIONS.map((card, index) => (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => setActiveCardIndex(index)}
                                        className={`h-2.5 rounded-full transition-all duration-300 ${index === activeCardIndex ? `w-8 ${activeDot}` : `w-2.5 ${inactiveDot}`}`}
                                        aria-label={`Show ${card.label}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- 4. THE RUNWAY (PRODUCT GRID) ---
const FeaturedRunway: React.FC<{
    products: Item[];
    isLoading: boolean;
    hasMore: boolean;
    onQuickView: (item: Item) => void;
    lastElementRef: any;
}> = ({ products, isLoading, hasMore, onQuickView, lastElementRef }) => {
    
    // Parallax Text Background
    const { scrollY } = useScroll({});
    const x1 = useTransform(scrollY, [0, 2000], [0, -400]);
    const x2 = useTransform(scrollY, [0, 2000], [-400, 0]);

    return (
        // FIX: Removed bg-gray-50/dark:bg-[#080808] so global texture shows
        <section className="py-20 md:py-32 relative overflow-hidden bg-transparent">
             {/* Moving Background Typography */}
             <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none overflow-hidden">
                <motion.div style={{ x: x1 }} className="whitespace-nowrap text-[15vw] font-black uppercase text-text-primary leading-none">
                    Discover Collection Discover Collection
                </motion.div>
                <motion.div style={{ x: x2 }} className="whitespace-nowrap text-[15vw] font-black uppercase text-text-primary leading-none ml-40">
                    Urban Prime Urban Prime
                </motion.div>
            </div>

            <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className="flex flex-col items-center mb-20">
                     <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">The Runway</span>
                     <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-text-primary text-center">New Arrivals</h2>
                     <div className="w-24 h-1 bg-gradient-to-r from-primary to-[#d5bf7f] mt-6 rounded-full"></div>
                </div>
                
                {isLoading && products.length === 0 ? (
                    <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 gap-y-10 sm:gap-y-12">
                        {products.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                ref={products.length === index + 1 ? lastElementRef : null}
                            >
                                <ItemCard item={item} onQuickView={onQuickView} />
                            </motion.div>
                        ))}
                    </div>
                )}
                
                {!hasMore && products.length > 0 && (
                    <div className="mt-12 md:mt-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-px h-16 bg-gradient-to-b from-transparent via-text-secondary to-transparent"></div>
                        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">End of Collection</p>
                    </div>
                )}
            </div>
        </section>
    );
};

// --- 5. THE MIDNIGHT LOUNGE (FLASH SALES) ---
const GemstoneLoungeInner: React.FC<{ items: Item[] }> = ({ items }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

    return (
        <section ref={containerRef} className="py-40 relative overflow-hidden bg-[#02040a] text-white">
             {/* Atmospheric Glow */}
             <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-[#93a05c]/18 rounded-full blur-[150px] pointer-events-none"></div>
             <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[80%] bg-[#d9c18c]/16 rounded-full blur-[150px] pointer-events-none"></div>
             
             {/* Noise Texture */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

             <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                    
                    {/* Text Content */}
                    <div className="lg:w-1/3 text-center lg:text-left">
                        <motion.div style={{ y }} className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#FBBF24]"></span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-100">Flash Archive</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-serif italic leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500">
                                Rare & <br/>Radiant
                            </h2>
                            <p className="text-gray-400 text-lg font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                                Handpicked luxury items available for a limited time. Indulge in the extraordinary before they vanish.
                            </p>
                            <Link to="/luxury" className="inline-block mt-8 border-b border-white pb-1 text-sm font-bold uppercase tracking-widest hover:text-primary hover:border-primary transition-all">
                                Enter The Lounge
                            </Link>
                        </motion.div>
                    </div>

                    {/* Horizontal Scroll / Spotlight Area */}
                    <div className="lg:w-2/3 w-full">
                        <div className="flex gap-8 overflow-x-auto pb-12 pt-12 px-4 no-scrollbar snap-x snap-mandatory">
                            {items.map((item, i) => (
                                <motion.div 
                                    key={item.id} 
                                    className="flex-shrink-0 w-[280px] snap-center"
                                    initial={{ opacity: 0, x: 100 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.6 }}
                                >
                                    <Suspense fallback={<div className="h-[460px] rounded-[2rem] border border-white/10 bg-white/5 animate-pulse" />}>
                                        <GemstoneHeroCard item={item} />
                                    </Suspense>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
        </section>
    );
};

const GemstoneLounge: React.FC<{ items: Item[] }> = ({ items }) => {
    if (items.length === 0) return null;
    return <GemstoneLoungeInner items={items} />;
};

// --- MAIN PAGE ---
const HomePageDesktop: React.FC = () => {
    const { theme } = useTheme();
    const { heroStyle } = useHeroStyle();
    const cachedHomePayload = readHomePageCache();
    const [products, setProducts] = useState<Item[]>(() => cachedHomePayload?.products || []);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [flashSaleItems, setFlashSaleItems] = useState<Item[]>(() => cachedHomePayload?.flashSaleItems || []);
    const [isLoading, setIsLoading] = useState(() => !cachedHomePayload);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    const observer = useRef<IntersectionObserver | null>(null);
    
    const lastProductElementRef = useCallback(node => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMore]);

    const isIgnorableFirebaseError = (error: unknown) => {
        if (!error || typeof error !== 'object') return false;
        const maybeError = error as { code?: string; message?: string };
        const message = (maybeError.message || String(error)).toLowerCase();
        const code = (maybeError.code || '').toLowerCase();
        return (
            message.includes('client is offline') ||
            code === 'unavailable' ||
            code === 'failed-precondition'
        );
    };

    const fetchItems = useCallback(async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const { itemService } = await loadItemServiceModule();
            const currentPage = isInitial ? 1 : page;
            const productsData = await itemService.getItems({}, { page: currentPage, limit: 12 });
            
            if (isInitial) {
                setProducts(productsData.items);
                // Separate logic for flash sale items if desired, or just use high rated ones
                const gemData = productsData.items.filter(i => (i.avgRating || 0) > 4.5).slice(0, 4);
                const gemItemsWithDiscount = gemData.map(item => ({
                    ...item,
                    compareAtPrice: item.compareAtPrice || (item.salePrice ? item.salePrice * 1.5 : 0)
                }));
                setFlashSaleItems(gemItemsWithDiscount);
                writeHomePageCache({
                    products: productsData.items,
                    flashSaleItems: gemItemsWithDiscount,
                    cachedAt: Date.now()
                });
            } else {
                setProducts(prev => [...prev, ...productsData.items]);
            }
            
            setHasMore(productsData.items.length > 0);
        } catch (error) {
            if (!isIgnorableFirebaseError(error)) {
                console.error("Failed to fetch home page data:", error);
            }
        } finally {
            if (isInitial) setIsLoading(false);
            else setIsLoadingMore(false);
        }
    }, [page]);

    useEffect(() => {
        const scheduleInitialFetch = () => {
            void fetchItems(true);
        };

        if (cachedHomePayload) {
            if ('requestIdleCallback' in window) {
                const idleHandle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback?.(
                    () => scheduleInitialFetch(),
                    { timeout: 2200 }
                );

                return () => {
                    if (typeof idleHandle === 'number') {
                        (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(idleHandle);
                    }
                };
            }

            const timer = window.setTimeout(scheduleInitialFetch, 900);
            return () => window.clearTimeout(timer);
        }

        scheduleInitialFetch();
    }, []);

    useEffect(() => {
        if (page > 1) fetchItems(false);
    }, [page]);

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
    
    return (
        // FIX: Remove bg-white from container so global texture shows
        <div className="min-h-screen overflow-x-hidden relative bg-transparent">
            {quickViewItem && (
                <Suspense fallback={null}>
                    <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />
                </Suspense>
            )}
            
            <HeroSwitcher OldHero={HeroSection} />
            <Marquee isBannerHero={heroStyle === 'banner'} />
            <GemstoneLounge items={flashSaleItems} />
            <FeaturedRunway 
                products={products} 
                isLoading={isLoading} 
                hasMore={hasMore} 
                onQuickView={setQuickViewItem} 
                lastElementRef={lastProductElementRef}
            />
             {isLoadingMore && (
                <div className="pb-20 flex justify-center bg-transparent">
                    <Spinner />
                </div>
            )}
        </div>
    );
};

const shouldUseMobileHome = (): boolean => {
    if (typeof window === 'undefined') return false;

    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, 1);
    const aspectRatio = width / height;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const prefersMobileWidth = width <= 900;
    const shortAspectRatio = aspectRatio <= 0.82;

    return width <= 640 || (prefersMobileWidth && (hasCoarsePointer || shortAspectRatio));
};

const HomePage: React.FC = () => {
    const [isMobileHome, setIsMobileHome] = useState<boolean>(() => shouldUseMobileHome());

    useEffect(() => {
        const handleResize = () => {
            setIsMobileHome(shouldUseMobileHome());
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <AnimatePresence mode="wait" initial={false}>
            {isMobileHome ? (
                <motion.div
                    key="urbanprime-mobile-home"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                    <HomePageMobile />
                </motion.div>
            ) : (
                <motion.div
                    key="urbanprime-desktop-home"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <HomePageDesktop />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HomePage;
