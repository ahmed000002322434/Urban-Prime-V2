
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import type { Item } from '../types';
import { useCart } from '../hooks/useCart';

interface GemstoneHeroCardProps {
  item: Item;
}

const Sparkle: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], rotate: [0, 45, 90] }}
    transition={{ duration: 2, repeat: Infinity, delay: delay, ease: "easeInOut" }}
    className="absolute w-4 h-4 pointer-events-none z-20"
    style={{
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
    }}
  >
    {/* Electric Blue Sparkle */}
    <svg viewBox="0 0 24 24" fill="#0066FF" className="w-full h-full drop-shadow-[0_0_5px_rgba(0,102,255,0.6)]">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </motion.div>
);

const GemstoneHeroCard: React.FC<GemstoneHeroCardProps> = ({ item }) => {
  const { addItemToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  // Calculate discount
  const discount = item.compareAtPrice && item.salePrice 
    ? Math.round(((item.compareAtPrice - item.salePrice) / item.compareAtPrice) * 100) 
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItemToCart(item, 1);

    // Electric Blue & Gold Confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0066FF', '#FBBF24', '#ffffff']
    });
  };

  return (
    <motion.div
      className="relative w-full max-w-[340px] mx-auto aspect-[4/5] md:aspect-square group cursor-pointer perspective-1000"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 50, damping: 20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Sparkles Container */}
      <div className="absolute inset-0 -z-10 overflow-visible">
        <Sparkle delay={0} />
        <Sparkle delay={1.5} />
        <Sparkle delay={0.8} />
      </div>

      {/* THE GEM: Main Container */}
      <motion.div
        className="relative w-full h-full shadow-2xl transition-all duration-700"
        animate={{ 
          rotate: isHovered ? 5 : 0,
          y: isHovered ? -10 : 0,
        }}
        style={{
          // Circle on mobile, Octagon on Desktop
          clipPath: "var(--clip-path)", 
        }}
      >
        {/* CSS Variable for responsive clip-path injection (handled via Tailwind arbitrary values or style prop) */}
        <style>{`
          @media (min-width: 768px) {
            .clip-gem { clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%); }
          }
          @media (max-width: 767px) {
            .clip-gem { clip-path: circle(50% at 50% 50%); }
          }
        `}</style>

        <div className="absolute inset-0 clip-gem bg-surface">
            {/* 1. Blue/Glass Refraction Border (The "Cut") */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-white/10 to-blue-50/20 opacity-80 z-10 pointer-events-none" />
            
            {/* 2. Glass Reflection / Lens Flare */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#0066FF]/10 to-transparent z-20"
              animate={{ x: isHovered ? ['-100%', '100%'] : '-100%' }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* 3. Product Image */}
            <div className="absolute inset-0 z-0 bg-[#F8FAFF] dark:bg-black/40">
                <motion.img 
                    src={item.imageUrls[0]} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                    animate={{ scale: isHovered ? 1.1 : 1 }}
                    transition={{ duration: 0.7 }}
                />
                {/* Slight blur overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90" />
            </div>

            {/* 4. Inner Content */}
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-8 text-center">
                <div className="mt-4 md:mt-8">
                    <p className="text-xs font-bold tracking-[0.2em] text-[#0066FF] uppercase mb-2 drop-shadow-sm">Limited Edition</p>
                    <h3 className="text-xl md:text-2xl font-black text-text-primary leading-tight font-display drop-shadow-sm">
                        {item.title}
                    </h3>
                </div>

                <div className="mb-8 md:mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                         <span className="text-2xl font-bold text-text-primary">${(item.salePrice || item.rentalPrice || 0)}</span>
                         {item.compareAtPrice && (
                             <span className="text-sm text-gray-400 line-through decoration-gray-400 decoration-2">${item.compareAtPrice}</span>
                         )}
                    </div>

                    <motion.button
                        onClick={handleAddToCart}
                        className="relative px-8 py-3 bg-[#0066FF] text-white text-sm font-bold uppercase tracking-wider rounded-full overflow-hidden shadow-[0_10px_20px_rgba(0,102,255,0.3)]"
                        whileHover={{ scale: 1.05, boxShadow: "0 15px 30px rgba(0,102,255,0.4)" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Buy Now
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0052cc] to-[#0066FF]" />
                    </motion.button>
                </div>
            </div>

            {/* 5. Bevel Highlight (Inner Border) */}
            <div className="absolute inset-[4px] clip-gem border border-[#0066FF]/20 pointer-events-none z-40" />
        </div>
      </motion.div>

      {/* Floating Discount Badge (Outside the Gem) - Gold */}
      {discount > 0 && (
        <motion.div 
          className="absolute bottom-0 right-0 md:bottom-4 md:right-4 z-50"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            <div className="bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white font-black text-lg w-16 h-16 flex items-center justify-center rounded-full shadow-xl border-4 border-surface transform rotate-12">
                -{discount}%
            </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GemstoneHeroCard;
