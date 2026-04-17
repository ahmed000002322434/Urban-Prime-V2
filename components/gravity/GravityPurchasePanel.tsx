import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import type { Item } from '../../types';
import StarRating from '../StarRating';
import { cx } from '../dashboard/clay/classNames';

// --- Inline SVG Icons ---
const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.56-7.43a1 1 0 0 0-1-1.21H5.14"/></svg>
);
const ShieldCheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);
const TruckIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="13" x="2" y="4" rx="2"/><polyline points="18 9 22 9 22 17 18 17"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
);
const RefreshIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
const ZapIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

interface GravityPurchasePanelProps {
  item: Item;
  activeMode: 'buy' | 'bid' | 'rent';
  setActiveMode: (mode: 'buy' | 'bid' | 'rent') => void;
  quantity: number;
  setQuantity: (q: number) => void;
  bidAmount: number;
  setBidAmount: (a: number) => void;
  rentalDates: { start: string; end: string };
  setRentalPeriod: (d: { start: string; end: string }) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

const GravityPurchasePanel: React.FC<GravityPurchasePanelProps> = ({
  item,
  activeMode,
  setActiveMode,
  quantity,
  setQuantity,
  bidAmount,
  setBidAmount,
  rentalDates,
  setRentalPeriod,
  onAddToCart,
  onBuyNow,
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = () => {
    setIsAddingToCart(true);
    onAddToCart();
    setTimeout(() => setIsAddingToCart(false), 800);
  };

  const displayPrice =
    activeMode === 'rent'
      ? item.rentalPrice || item.rentalRates?.daily
      : item.salePrice || item.price || item.auctionDetails?.currentBid;

  const discount = item.compareAtPrice && item.compareAtPrice > (item.salePrice || item.price || 0)
    ? Math.round(100 - ((item.salePrice || item.price || 0) / item.compareAtPrice) * 100)
    : 0;
  const highlights = [
    item.isVerified ? 'Verified marketplace seller' : '',
    item.returnPolicy?.windowDays ? `${item.returnPolicy.windowDays}-day returns` : '',
    item.whoPaysShipping === 'seller' ? 'Seller-paid shipping' : 'Shipping calculated at checkout',
    ...(item.certifications || []).slice(0, 2),
    ...(item.features || []).slice(0, 2)
  ].filter(Boolean);

  return (
    <GlassCard
      className="p-4 sm:p-5 md:p-6 lg:p-7 rounded-[28px] sm:rounded-[36px] md:rounded-[42px] backdrop-blur-[40px] bg-white/30 dark:bg-black/30 border border-white/25 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
      enableFloat={true}
      floatDelay={1}
      maxTilt={4}
      glowColor="rgba(108,142,255,0.12)"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />

      <div className="space-y-5 sm:space-y-6 md:space-y-7 relative z-10">
        {/* Brand & Verification */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black dark:bg-white/10 flex items-center justify-center font-black text-white text-[9px] sm:text-[10px] shadow-lg">
              {item.brand?.charAt(0) || 'UP'}
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-text-primary">
              {item.brand || 'Urban Prime Select'}
            </span>
          </div>
          {item.isVerified && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <ShieldCheckIcon size={10} />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Verified</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl md:text-[2rem] lg:text-[2.15rem] font-black tracking-tight text-text-primary leading-[1.08]">
          {item.title}
        </h1>

        {/* Rating */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/10 dark:bg-white/5 border border-white/10">
            <StarRating rating={item.avgRating || 4.8} size="sm" />
            <span className="text-[10px] sm:text-xs font-black text-text-primary">{(item.avgRating || 4.8).toFixed(1)}</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary uppercase tracking-wider opacity-50">
            {item.reviews?.length || 24} Reviews
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
          <span className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tighter">
            ${displayPrice?.toLocaleString()}
          </span>
          {activeMode === 'rent' && (
            <span className="text-sm sm:text-base font-bold text-text-secondary opacity-50">/ day</span>
          )}
          {item.compareAtPrice && item.compareAtPrice > (item.salePrice || item.price || 0) && (
            <span className="text-base sm:text-lg text-text-secondary line-through font-bold opacity-30">
              ${item.compareAtPrice.toLocaleString()}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              Save {discount}%
            </span>
          )}
        </div>

        {/* Mode Selector */}
        <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-5 border-t border-white/10">
          <div className="p-1 sm:p-1.5 rounded-[18px] sm:rounded-[24px] flex gap-1 bg-black/5 dark:bg-white/5 border border-white/15 shadow-inner">
            {(item.listingType === 'sale' || item.listingType === 'both') && (
              <button
                onClick={() => setActiveMode('buy')}
                className={cx(
                  'flex-1 py-2.5 sm:py-3 rounded-[14px] sm:rounded-[18px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all',
                  activeMode === 'buy'
                    ? 'bg-white dark:bg-white/10 text-primary shadow-lg'
                    : 'text-text-secondary hover:text-text-primary opacity-50'
                )}
              >
                Purchase
              </button>
            )}
            {(item.listingType === 'auction' || item.listingType === 'both') && (
              <button
                onClick={() => setActiveMode('bid')}
                className={cx(
                  'flex-1 py-2.5 sm:py-3 rounded-[14px] sm:rounded-[18px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all',
                  activeMode === 'bid'
                    ? 'bg-white dark:bg-white/10 text-primary shadow-lg'
                    : 'text-text-secondary hover:text-text-primary opacity-50'
                )}
              >
                Place Bid
              </button>
            )}
            {(item.listingType === 'rent' || item.listingType === 'both') && (
              <button
                onClick={() => setActiveMode('rent')}
                className={cx(
                  'flex-1 py-2.5 sm:py-3 rounded-[14px] sm:rounded-[18px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all',
                  activeMode === 'rent'
                    ? 'bg-white dark:bg-white/10 text-primary shadow-lg'
                    : 'text-text-secondary hover:text-text-primary opacity-50'
                )}
              >
                Rental
              </button>
            )}
          </div>

          {/* Mode-Specific Controls */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {activeMode === 'buy' && (
                <div className="flex items-center justify-between p-4 sm:p-5 rounded-[18px] sm:rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/10">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary opacity-60">Quantity</span>
                  <div className="flex items-center gap-4 sm:gap-5">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
                    >
                      <svg width="10" height="2" viewBox="0 0 10 2"><path d="M1 1H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                    <span className="text-base sm:text-lg font-black w-6 text-center text-text-primary">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {activeMode === 'bid' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 sm:p-5 rounded-[18px] sm:rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/10">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary opacity-60">Your Bid</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-black text-primary">$</span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-24 sm:w-28 bg-transparent text-lg sm:text-xl font-black text-text-primary focus:outline-none border-b-2 border-primary/20 focus:border-primary transition-all text-right"
                      />
                    </div>
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-center text-text-secondary opacity-40">Min increase: $10.00</p>
                </div>
              )}

              {activeMode === 'rent' && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary opacity-60 block">Check-in</span>
                    <input
                      type="date"
                      value={rentalDates.start}
                      onChange={(e) => setRentalPeriod({ ...rentalDates, start: e.target.value })}
                      className="bg-transparent w-full text-[10px] sm:text-xs font-bold text-text-primary focus:outline-none"
                    />
                  </div>
                  <div className="p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary opacity-60 block">Check-out</span>
                    <input
                      type="date"
                      value={rentalDates.end}
                      onChange={(e) => setRentalPeriod({ ...rentalDates, end: e.target.value })}
                      className="bg-transparent w-full text-[10px] sm:text-xs font-bold text-text-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-2 sm:gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.015, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddToCart}
              className={cx(
                'w-full py-4 sm:py-5 rounded-[18px] sm:rounded-[24px] text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] flex items-center justify-center gap-2 sm:gap-3 relative overflow-hidden group transition-all',
                isAddingToCart
                  ? 'bg-green-500 shadow-[0_15px_35px_-8px_rgba(34,197,94,0.4)]'
                  : 'bg-gradient-to-tr from-primary via-primary to-secondary shadow-[0_15px_35px_-8px_rgba(var(--dash-accent-rgb),0.35)] hover:shadow-[0_20px_45px_-10px_rgba(var(--dash-accent-rgb),0.45)]'
              )}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              <div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.15)' }}
              />
              <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                <ShoppingCartIcon />
                {isAddingToCart
                  ? 'Added'
                  : activeMode === 'buy'
                    ? 'Secure Purchase'
                    : activeMode === 'bid'
                      ? 'Commit Bid'
                      : 'Reserve Now'}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBuyNow}
              className="w-full py-3 sm:py-4 rounded-[18px] sm:rounded-[24px] bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <ZapIcon size={14} />
              Express Checkout
            </motion.button>
          </div>

          <div className="space-y-3 rounded-[18px] sm:rounded-[24px] bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">
              {(item.description || '').slice(0, 170)}
              {item.description && item.description.length > 170 ? '...' : ''}
            </p>
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-text-primary dark:bg-white/5"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-5 sm:pt-7 border-t border-white/10">
          {[
            { Icon: ShieldCheckIcon, text: 'Escrow Protected' },
            { Icon: TruckIcon, text: 'Global Express' },
            { Icon: RefreshIcon, text: '7-Day Returns' },
          ].map((badge, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1.5 sm:gap-2 text-center group cursor-default"
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/30 transition-all">
                <badge.Icon size={14} />
              </div>
              <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-text-secondary opacity-50 leading-tight">
                {badge.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(GravityPurchasePanel);
