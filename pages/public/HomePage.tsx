
// pages/public/HomePage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import GemstoneHeroCard from '../../components/GemstoneHeroCard';
import { useTheme } from '../../hooks/useTheme';
import Magnetic from '../../components/Magnetic';

// --- Assets & Icons ---
const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const StarIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;

type CollectionCardMeta = {
    id: string;
    label: string;
    title: string;
    image: string;
    link: string;
    video?: string;
};

const COLLECTION_FEATURES: CollectionCardMeta[] = [
    {
        id: 'best-products',
        label: 'Curated for Your Lifestyle.',
        title: 'Discover Products',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3X5BiWrErY17PHVSZXF5Y5RnnSjkNodxHtoRFE4fufJ-VIgqT7XW2_HvxbbE5a4tc-tYN7gszwCMtBZy5aH1E0E6JEBcW8oHuR-ERqeIywX1iqTwP4G1cD7upeGxk31npORRrU5A8A-9KxJEspxWdRX_jo1J3zX4zNwXSuxq2ySlXDTgoztOIud6_n015CX1IJzSQH4uYnpsECZyJG73CWwojr9pJ8ne6uWgPcUjp0fE3bwE_Vt-IcZoYAGk0F8S3tqgAnFDGAX8',
        link: '/browse',
        video: '/card-videos/product-card.mp4'
    },
    {
        id: 'services',
        label: 'Smarter Ways to Get Things Done.',
        title: 'Explore Services',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWsp5tgC3p3JRyFnrnLY02dzWoUUikqQVXzf_DepH081Fzpa9ukvYChN4wMV3XcoBgXWcATPdcIRDn4Pwwueje_AExEXOioB-TuNsedMfMZYcWe9tKaiVIwk6dC6c8Bquw42pgHmnpZxXyKCTkOUjFr7_ZBwtnfRAWuAC1OXu1FGxNrouZusleIM66wgzhqIljj2Tunarz-iGw-zeC_xStSFwD5hXyiAuoLr469OxaPzUXYD7xU34HQGzKJRPHhq2IYqtqU2NJ8-M',
        link: '/services/marketplace',
        video: '/card-videos/explore-services.mp4'
    },
    {
        id: 'stores',
        label: 'Explore New Shopping Worlds.',
        title: 'Visit Stores',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_jcgo7mD9QB9kkX9TXoddziI0XLKtFv0ot9Iu-4j4ZP9JBQWrc0f7WihNLwfeV-eZljBgSyp_R-oaXOtLAdo9a1nl5FA7z4_5Drw-6eMkVmSljE4p1kqpe9eF2oYEQnGQxEIk1AJN8iwM-hhX2wc2l4dxEHE7nML1nLoQGwnZHJCsdvQu4UuidIakldQUXHogSC_8CDwSGaVzAZtsFmdCR1KRCAX5ITUuAgN3_LuHjj-rc6AwQdFmKC5nMEP1mWNgoDWjhbimvJU',
        link: '/stores',
        video: '/card-videos/explore-stores.mp4'
    }
];

const COLLECTION_CATALOGUE: CollectionCardMeta[] = [
    {
        id: 'luxury-assets',
        label: 'Assets',
        title: 'Luxury Assets',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN_5RNEf2ZoGJmBKNRfbR1DlcaeHsUYwu-w1K-dQncQJE2o-mW_EV8sz1EZ10xoaex0sdOFvBkVcMwjY1X7Mq0TWtL9y4ZrfhpOAPF_bpBz9mZP1s-dSPdjl7i7NXDJUtMJRZ0H1_3pBcdmMkl_upDKJqhS0hCE11Qjl99-yo_kdPqvhiKOKMO0eFoTn2UAkvn5ZYgZAm8I3n6vDw3jaVuTw8Qd1JgHwrgsVt9V9tH-A9JZIr1s21dJ-cwE6pds-qL1GJv_IDRJ6M',
        link: '/luxury',
        video: '/card-videos/luxury-assets.mp4'
    },
    {
        id: 'interiors',
        label: 'Living',
        title: 'Interiors',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_jcgo7mD9QB9kkX9TXoddziI0XLKtFv0ot9Iu-4j4ZP9JBQWrc0f7WihNLwfeV-eZljBgSyp_R-oaXOtLAdo9a1nl5FA7z4_5Drw-6eMkVmSljE4p1kqpe9eF2oYEQnGQxEIk1AJN8iwM-hhX2wc2l4dxEHE7nML1nLoQGwnZHJCsdvQu4UuidIakldQUXHogSC_8CDwSGaVzAZtsFmdCR1KRCAX5ITUuAgN3_LuHjj-rc6AwQdFmKC5nMEP1mWNgoDWjhbimvJU',
        link: '/home-decor',
        video: '/card-videos/interiors.mp4'
    },
    {
        id: 'travel',
        label: 'Journey',
        title: 'Travel',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWsp5tgC3p3JRyFnrnLY02dzWoUUikqQVXzf_DepH081Fzpa9ukvYChN4wMV3XcoBgXWcATPdcIRDn4Pwwueje_AExEXOioB-TuNsedMfMZYcWe9tKaiVIwk6dC6c8Bquw42pgHmnpZxXyKCTkOUjFr7_ZBwtnfRAWuAC1OXu1FGxNrouZusleIM66wgzhqIljj2Tunarz-iGw-zeC_xStSFwD5hXyiAuoLr469OxaPzUXYD7xU34HQGzKJRPHhq2IYqtqU2NJ8-M',
        link: '/events',
        video: '/card-videos/travel.mp4'
    },
    {
        id: 'accessories',
        label: 'Details',
        title: 'Accessories',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3X5BiWrErY17PHVSZXF5Y5RnnSjkNodxHtoRFE4fufJ-VIgqT7XW2_HvxbbE5a4tc-tYN7gszwCMtBZy5aH1E0E6JEBcW8oHuR-ERqeIywX1iqTwP4G1cD7upeGxk31npORRrU5A8A-9KxJEspxWdRX_jo1J3zX4zNwXSuxq2ySlXDTgoztOIud6_n015CX1IJzSQH4uYnpsECZyJG73CWwojr9pJ8ne6uWgPcUjp0fE3bwE_Vt-IcZoYAGk0F8S3tqgAnFDGAX8',
        link: '/womens-accessories',
        video: '/card-videos/accessories.mp4'
    },
    {
        id: 'electronics',
        label: 'Tech',
        title: 'Electronics',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN_5RNEf2ZoGJmBKNRfbR1DlcaeHsUYwu-w1K-dQncQJE2o-mW_EV8sz1EZ10xoaex0sdOFvBkVcMwjY1X7Mq0TWtL9y4ZrfhpOAPF_bpBz9mZP1s-dSPdjl7i7NXDJUtMJRZ0H1_3pBcdmMkl_upDKJqhS0hCE11Qjl99-yo_kdPqvhiKOKMO0eFoTn2UAkvn5ZYgZAm8I3n6vDw3jaVuTw8Qd1JgHwrgsVt9V9tH-A9JZIr1s21dJ-cwE6pds-qL1GJv_IDRJ6M',
        link: '/electronics',
        video: '/card-videos/electronics.mp4'
    }
];

// --- 1. HERO SECTION (Optimized Physics & Glass) ---
const HeroSection: React.FC = () => {
    const { theme } = useTheme();
    // Removed heavy spring physics for mouse movement to improve performance
    // Using lighter CSS-based animations for background
    
    // Dynamic glass style based on theme
    let glassClass = "bg-white/40 border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.05)] backdrop-blur-[20px] dark:bg-white/[0.02] dark:border-white/[0.1] dark:shadow-[0_0_60px_rgba(80,20,255,0.1)] dark:backdrop-blur-[30px]";
    
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
                    className="absolute top-[-10%] left-[-5%] w-[80%] h-[80%] rounded-full filter blur-3xl opacity-40 animate-pulse
                    bg-gradient-to-tr from-blue-200 via-purple-200 to-indigo-100 
                    dark:from-indigo-600/30 dark:via-violet-600/30 dark:to-blue-600/30"
                    style={{ animationDuration: '8s' }}
                />
                <div 
                    className="absolute bottom-[-10%] right-[-5%] w-[70%] h-[70%] rounded-full filter blur-3xl opacity-40 animate-pulse
                    bg-gradient-to-bl from-rose-100 via-orange-100 to-amber-100 
                    dark:from-fuchsia-600/30 dark:via-purple-600/30 dark:to-cyan-600/30"
                     style={{ animationDuration: '10s', animationDelay: '1s' }}
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
                            } backdrop-blur-md`}
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
                        <Magnetic strength={20} rotateStrength={2}>
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

                        <Magnetic strength={15} rotateStrength={1}>
                            <Link to="/reels" className={`group flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest backdrop-blur-xl transition-all shadow-lg
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
                animate={{ opacity: 0.6, y: [0, 8, 0] }}
                transition={{ delay: 1.5, duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
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
const Marquee: React.FC = () => (
  <div className="relative z-20 -mt-10 mb-12 md:mb-20 rotate-[-1deg] scale-105 origin-center pointer-events-none select-none">
    {/* Glass Strip */}
    <div className="absolute inset-0 bg-white/70 dark:bg-[#111]/80 backdrop-blur-xl border-y border-white/20 dark:border-white/10 shadow-xl"></div>
    
    <div className="relative flex overflow-x-hidden py-5 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs font-black">
      <div className="animate-marquee whitespace-nowrap flex gap-16 text-gray-900 dark:text-white/90 items-center">
        {Array(8).fill("Exclusive Drop").map((text, i) => (
          <React.Fragment key={i}>
            <span>{text}</span>
            <span className="text-primary"><StarIcon /></span>
             <span>Luxury Rentals</span>
             <span className="text-purple-500"><StarIcon /></span>
             <span>Verified</span>
             <span className="text-cyan-500"><StarIcon /></span>
          </React.Fragment>
        ))}
      </div>
       <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex gap-16 text-gray-900 dark:text-white/90 items-center py-5">
        {Array(8).fill("Exclusive Drop").map((text, i) => (
          <React.Fragment key={i}>
            <span>{text}</span>
            <span className="text-primary"><StarIcon /></span>
             <span>Luxury Rentals</span>
             <span className="text-purple-500"><StarIcon /></span>
             <span>Verified</span>
             <span className="text-cyan-500"><StarIcon /></span>
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
);

// --- 3. COLLECTION DISCOVERY (HOMEPAGE CARDS) ---
const CollectionDiscovery: React.FC = () => {
    const featureVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const catalogueVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const catalogueTrackRef = useRef<HTMLDivElement | null>(null);
    const [catalogueCards, setCatalogueCards] = useState<CollectionCardMeta[]>(() => [...COLLECTION_CATALOGUE]);

    useEffect(() => {
        const videos = [
            ...featureVideoRefs.current.filter(Boolean),
            ...catalogueVideoRefs.current.filter(Boolean)
        ] as HTMLVideoElement[];
        if (videos.length === 0) return;

        const playAll = () => {
            videos.forEach((video) => {
                video.play().catch(() => undefined);
            });
        };

        const handleVisibility = () => {
            if (document.hidden) {
                videos.forEach((video) => video.pause());
            } else {
                playAll();
            }
        };

        playAll();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            videos.forEach((video) => video.pause());
        };
    }, []);

    useEffect(() => {
        const track = catalogueTrackRef.current;
        if (!track) return;

        let rafId = 0;
        let lastTime = performance.now();
        let offset = 0;
        const speed = 0.02; // px per ms (20px/s)
        const gap = 16;

        const step = (time: number) => {
            const delta = time - lastTime;
            lastTime = time;

            if (!document.hidden) {
                offset += delta * speed;
                track.style.transform = `translateX(-${offset}px)`;

                const firstCard = track.firstElementChild as HTMLElement | null;
                if (firstCard) {
                    const firstWidth = firstCard.getBoundingClientRect().width + gap;
                    if (offset >= firstWidth) {
                        offset -= firstWidth;
                        track.style.transform = `translateX(-${offset}px)`;
                        setCatalogueCards((prev) => {
                            if (prev.length <= 1) return prev;
                            return [...prev.slice(1), prev[0]];
                        });
                    }
                }
            }

            rafId = requestAnimationFrame(step);
        };

        const handleVisibility = () => {
            lastTime = performance.now();
        };

        rafId = requestAnimationFrame(step);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelAnimationFrame(rafId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    return (
        <section className="py-16 sm:py-20 md:py-28 bg-background text-text-primary relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-purple-700/20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14">
                    <div>
                        <span className="text-primary text-[10px] font-bold uppercase tracking-[0.32em] block mb-3">Collection Discovery</span>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold leading-[1] tracking-tight">
                            The <span className="italic font-normal text-text-secondary opacity-70">New</span>
                            <br />
                            Standard
                        </h2>
                    </div>
                    <p className="max-w-xs text-text-secondary text-xs md:text-sm font-serif italic leading-relaxed">
                        "In the world of Urban Prime, ownership is a legacy, but access is the ultimate freedom."
                    </p>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {COLLECTION_FEATURES.map((card, index) => (
                        <Link
                            key={card.id}
                            to={card.link}
                            className="group flex flex-col gap-3"
                            aria-label={card.title}
                        >
                            <div className="relative min-h-[220px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px] overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_26px_60px_rgba(0,0,0,0.55)]">
                                {card.video ? (
                                    <video
                                        ref={(el) => {
                                            featureVideoRefs.current[index] = el;
                                        }}
                                        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                                        src={card.video}
                                        poster={card.image}
                                        muted
                                        loop
                                        playsInline
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        src={card.image}
                                        alt={card.title}
                                        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                                    />
                                )}
                            </div>
                            <div className="space-y-1">
                                <span className="text-primary text-[8px] sm:text-[10px] uppercase tracking-[0.25em] font-semibold">{card.label}</span>
                                <h3 className="text-sm sm:text-2xl md:text-4xl font-serif leading-tight text-text-primary">{card.title}</h3>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4 mt-12 md:mt-16 mb-6">
                    <h3 className="text-2xl md:text-3xl font-serif text-text-primary">Explore the Vast Catalogue</h3>
                    <div className="h-px flex-1 bg-border"></div>
                </div>

                <div className="catalogue-marquee">
                    <div className="catalogue-marquee-track will-change-transform" ref={catalogueTrackRef}>
                        {catalogueCards.map((card, index) => (
                            <Link
                                key={card.id}
                                to={card.link}
                                className="group flex flex-col gap-2 min-w-[150px] sm:min-w-[190px] md:min-w-[210px] lg:min-w-[230px]"
                                aria-label={card.title}
                            >
                                <div className="relative min-h-[170px] sm:min-h-[210px] md:min-h-[230px] lg:min-h-[250px] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
                                    {card.video ? (
                                        <video
                                            ref={(el) => {
                                                catalogueVideoRefs.current[index] = el;
                                            }}
                                            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                                            src={card.video}
                                            poster={card.image}
                                            muted
                                            loop
                                            playsInline
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            src={card.image}
                                            alt={card.title}
                                            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <span className="text-primary text-[8px] sm:text-[9px] uppercase tracking-[0.22em] font-semibold">{card.label}</span>
                                    <h4 className="text-xs sm:text-lg md:text-2xl font-serif leading-tight text-text-primary">{card.title}</h4>
                                </div>
                            </Link>
                        ))}
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
                     <div className="w-24 h-1 bg-gradient-to-r from-primary to-purple-600 mt-6 rounded-full"></div>
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
             <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-blue-900/20 rounded-full blur-[150px] pointer-events-none"></div>
             <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[150px] pointer-events-none"></div>
             
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
                                    <GemstoneHeroCard item={item} />
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
const HomePage: React.FC = () => {
    const { theme } = useTheme();
    const [products, setProducts] = useState<Item[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [flashSaleItems, setFlashSaleItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            let productsData = await itemService.getItems({}, { page: isInitial ? 1 : page, limit: 12 });
            
            if (isInitial) {
                setProducts(productsData.items);
                // Separate logic for flash sale items if desired, or just use high rated ones
                const gemData = productsData.items.filter(i => (i.avgRating || 0) > 4.5).slice(0, 4);
                const gemItemsWithDiscount = gemData.map(item => ({
                    ...item,
                    compareAtPrice: item.compareAtPrice || (item.salePrice ? item.salePrice * 1.5 : 0)
                }));
                setFlashSaleItems(gemItemsWithDiscount);
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
        fetchItems(true);
    }, []);

    useEffect(() => {
        if (page > 1) fetchItems(false);
    }, [page]);
    
    return (
        // FIX: Remove bg-white from container so global texture shows
        <div className="min-h-screen overflow-x-hidden relative bg-transparent">
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            
            <HeroSection />
            <Marquee />
            <CollectionDiscovery />
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

export default HomePage;
