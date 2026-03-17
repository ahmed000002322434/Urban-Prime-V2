import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { itemService } from '../../services/itemService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';

// Gravity UI Components
import { useGravityMouse } from '../../hooks/useGravityMouse';
import GravityBackground from '../../components/gravity/GravityBackground';
import FloatingProductHero from '../../components/gravity/FloatingProductHero';
import GravityPurchasePanel from '../../components/gravity/GravityPurchasePanel';
import ProductSpecs from '../../components/gravity/ProductSpecs';
import SellerProfileCard from '../../components/gravity/SellerProfileCard';
import GravityReviews from '../../components/gravity/GravityReviews';
import DiscoverMoreProducts from '../../components/gravity/DiscoverMoreProducts';

// --- Inline SVG Icons ---
const ChevronLeft = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const Heart = ({ size = 20, fill = 'none' }: { size?: number; fill?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const Share2 = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
);
const ShoppingCart = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.56-7.43a1 1 0 0 0-1-1.21H5.14"/></svg>
);

const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  // Data State
  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction State
  const [activeMode, setActiveMode] = useState<'buy' | 'bid' | 'rent'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [rentalDates, setRentalPeriod] = useState({ start: '', end: '' });
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Gravity System
  const { springX, springY, isMobile } = useGravityMouse({ stiffness: 40, damping: 22 });

  // Scroll-driven transforms (window-based – no target ref needed)
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 120], [0, 1]);
  const headerBackdrop = useTransform(scrollY, [0, 120], ['blur(0px)', 'blur(32px)']);

  // --- Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const fetched = await itemService.getItemById(id);
        if (!fetched) {
          setError('Item not found.');
          return;
        }
        setItem(fetched);
        setBidAmount(
          Math.ceil(
            (fetched.auctionDetails?.currentBid || fetched.auctionDetails?.startingBid || fetched.price || 0) + 1
          )
        );

        if (fetched.listingType === 'rent') setActiveMode('rent');
        else if (fetched.listingType === 'auction') setActiveMode('bid');
        else setActiveMode('buy');

        const { items: related } = await itemService.getItems(
          { category: fetched.category },
          { page: 1, limit: 4 }
        );
        setRelatedItems(related.filter((i) => i.id !== fetched.id));
      } catch (err) {
        console.error(err);
        setError('Unable to load item details.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // --- Derived Data ---
  const galleryImages = useMemo(() => {
    if (!item) return [];
    const imgs = [...(item.imageUrls || []), ...(item.images || [])];
    return Array.from(new Set(imgs)).filter(Boolean);
  }, [item]);

  // --- Handlers ---
  const handleAddToCart = (checkout = false) => {
    if (!item) return;
    const rentalPeriod =
      activeMode === 'rent' ? { startDate: rentalDates.start, endDate: rentalDates.end } : undefined;
    if (activeMode === 'rent' && (!rentalDates.start || !rentalDates.end)) {
      alert('Please select rental dates');
      return;
    }
    addItemToCart(item, activeMode === 'buy' ? quantity : 1, undefined, rentalPeriod, activeMode === 'rent' ? 'rent' : 'sale');
    if (checkout) navigate('/checkout');
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbff] dark:bg-[#020205]">
        <GravityBackground springX={springX} springY={springY} />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <Spinner size="lg" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-50 animate-pulse">
            Loading Experience
          </p>
        </motion.div>
      </div>
    );
  }

  // --- Error State ---
  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbff] dark:bg-[#020205]">
        <GravityBackground springX={springX} springY={springY} />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 gravity-glass p-12 rounded-[48px] text-center max-w-md backdrop-blur-[40px] bg-white/20 dark:bg-black/20 border border-white/15"
        >
          <p className="text-xl font-black text-text-primary uppercase tracking-wider mb-4">Item Not Found</p>
          <p className="text-sm text-text-secondary mb-8">{error || 'The item you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/browse')}
            className="px-8 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Browse Products
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fafbff] dark:bg-[#020205] transition-colors duration-700 selection:bg-primary/30"
    >
      {/* ═══════════ GRAVITY BACKGROUND ═══════════ */}
      <GravityBackground springX={springX} springY={springY} />

      {/* ═══════════ NAVIGATION HEADER ═══════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-[100] px-4 md:px-6 py-4 flex items-center justify-between"
      >
        <motion.div
          className="absolute inset-0 border-b border-white/10 dark:border-white/5"
          style={{
            opacity: headerOpacity,
            backdropFilter: headerBackdrop,
            WebkitBackdropFilter: headerBackdrop,
            background: 'rgba(255,255,255,0.4)',
          }}
        />

        <div className="container mx-auto relative flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-3 text-xs font-black uppercase tracking-[0.15em] text-text-primary/70 hover:text-primary transition-all"
          >
            <motion.div
              whileHover={{ scale: 1.08, rotate: -5 }}
              whileTap={{ scale: 0.92 }}
              className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center backdrop-blur-xl shadow-lg group-hover:bg-primary group-hover:text-white group-hover:border-primary/50 transition-all"
            >
              <ChevronLeft />
            </motion.div>
            <span className="hidden sm:inline opacity-60 group-hover:opacity-100 transition-opacity">Back</span>
          </button>

          {/* Title (Desktop) */}
          <div className="flex-1 max-w-lg px-8 hidden lg:block text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 mb-0.5">Current Item</p>
            <p className="text-xs font-black truncate uppercase tracking-widest text-text-primary">{item.title}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={`w-11 h-11 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center backdrop-blur-xl shadow-lg transition-all ${
                isWishlisted ? 'text-red-500 bg-red-50/20 border-red-500/20' : 'text-text-secondary hover:text-red-500'
              }`}
            >
              <Heart fill={isWishlisted ? 'currentColor' : 'none'} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08, rotate: -5 }}
              whileTap={{ scale: 0.92 }}
              className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center text-text-secondary hover:text-primary backdrop-blur-xl shadow-lg transition-all"
            >
              <Share2 />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="container mx-auto px-4 md:px-6 lg:px-12 py-8 md:py-12 relative z-10">
        {/* ——— HERO ZONE: Product + Purchase Panel ——— */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left Column: Floating Product Hero (7/12) */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <FloatingProductHero
              images={galleryImages}
              title={item.title}
              springX={springX}
              springY={springY}
              isMobile={isMobile}
            />
          </motion.div>

          {/* Right Column: Purchase Panel (5/12) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-6">
              <GravityPurchasePanel
                item={item}
                activeMode={activeMode}
                setActiveMode={setActiveMode}
                quantity={quantity}
                setQuantity={setQuantity}
                bidAmount={bidAmount}
                setBidAmount={setBidAmount}
                rentalDates={rentalDates}
                setRentalPeriod={setRentalPeriod}
                onAddToCart={() => handleAddToCart()}
                onBuyNow={() => handleAddToCart(true)}
              />

              {/* Seller Card */}
              <SellerProfileCard
                sellerName={(item as any).sellerName || item.owner?.name}
                sellerAvatar={item.owner?.avatar}
                onVisitStore={() => navigate(`/store/${item.owner?.id}`)}
              />
            </div>
          </div>
        </div>

        {/* ——— DEPTH SECTION: Product Specs ——— */}
        <motion.div className="mt-20 md:mt-32">
          <ProductSpecs item={item} />
        </motion.div>

        {/* ——— DEPTH SECTION: Reviews ——— */}
        <motion.div className="mt-20 md:mt-32">
          <GravityReviews
            reviews={item.reviews || []}
            avgRating={item.avgRating || 4.8}
            totalReviews={item.reviews?.length || 24}
          />
        </motion.div>

        {/* ——— DEPTH SECTION: Discover More Products ——— */}
        <motion.div className="mt-20 md:mt-32">
          <DiscoverMoreProducts items={relatedItems} />
        </motion.div>
      </main>

      {/* ═══════════ MOBILE STICKY CTA ═══════════ */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
        className="fixed bottom-0 inset-x-0 z-[80] p-4 md:hidden"
      >
        <div className="gravity-glass p-3 rounded-[28px] backdrop-blur-[40px] bg-white/30 dark:bg-black/30 border border-white/25 dark:border-white/10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
          <div className="px-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary opacity-50">Price</p>
            <p className="text-lg font-black text-text-primary tracking-tight">
              ${(item.salePrice || item.price || 0).toLocaleString()}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAddToCart()}
            className="flex-1 py-3.5 rounded-[20px] bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <ShoppingCart />
            Add to Bag
          </motion.button>
        </div>
      </motion.div>

      {/* Footer Buffer */}
      <div className="h-24 md:h-32" />
    </div>
  );
};

export default ItemDetailPage;
