import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

// --- Inline SVG Icons ---
const ShieldCheckIcon = ({ size = 10 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);
const StarIcon = ({ size = 10 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const MessageIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);
const ExternalLinkIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
);

interface SellerProfileCardProps {
  sellerName?: string;
  sellerAvatar?: string;
  rating?: number;
  totalSales?: number;
  joinDate?: string;
  description?: string;
  onVisitStore?: () => void;
  onMessage?: () => void;
}

const SellerProfileCard: React.FC<SellerProfileCardProps> = ({
  sellerName = 'Urban Prime Store',
  sellerAvatar,
  rating = 4.9,
  totalSales = 1247,
  joinDate = '2023',
  description = 'Curating premium products with a focus on quality and authenticity. Every item is hand-selected and verified.',
  onVisitStore,
  onMessage,
}) => {
  const avatar = sellerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerName}`;

  return (
    <GlassCard
      className="p-5 sm:p-6 md:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] md:rounded-[48px] backdrop-blur-[40px] bg-white/25 dark:bg-black/25 border border-white/20 dark:border-white/8 shadow-2xl"
      enableFloat={true}
      floatDelay={2}
      maxTilt={5}
      glowColor="rgba(139,92,246,0.12)"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Section Label */}
        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-40">About the Seller</p>

        {/* Seller Info Row */}
        <div className="flex items-start gap-3 sm:gap-4 md:gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-[16px] sm:rounded-[22px] overflow-hidden border-2 border-white/30 shadow-xl">
              <img src={avatar} alt={sellerName} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-blue-500 border-2 sm:border-[3px] border-white dark:border-[#0a0a0a] flex items-center justify-center shadow-lg">
              <ShieldCheckIcon size={9} />
              <span className="sr-only">Verified</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-black text-text-primary uppercase tracking-wider truncate">{sellerName}</h3>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <StarIcon key={s} size={9} />
                ))}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-text-secondary">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-text-secondary opacity-40">•</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary opacity-50">{totalSales.toLocaleString()} sales</span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold text-text-secondary opacity-40 mt-1 uppercase tracking-wider">
              Member since {joinDate}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm leading-relaxed text-text-secondary font-medium">{description}</p>

        {/* Response Stats */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-1 p-2.5 sm:p-3 rounded-[14px] sm:rounded-[18px] bg-white/5 border border-white/10 text-center">
            <p className="text-base sm:text-lg font-black text-text-primary">98%</p>
            <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-text-secondary opacity-50 mt-0.5">Response Rate</p>
          </div>
          <div className="flex-1 p-2.5 sm:p-3 rounded-[14px] sm:rounded-[18px] bg-white/5 border border-white/10 text-center">
            <p className="text-base sm:text-lg font-black text-text-primary">&lt;2h</p>
            <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-text-secondary opacity-50 mt-0.5">Avg Response</p>
          </div>
          <div className="flex-1 p-2.5 sm:p-3 rounded-[14px] sm:rounded-[18px] bg-white/5 border border-white/10 text-center">
            <p className="text-base sm:text-lg font-black text-text-primary">4.9</p>
            <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-text-secondary opacity-50 mt-0.5">Seller Score</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onVisitStore}
            className="flex-1 py-3 sm:py-3.5 rounded-[14px] sm:rounded-[18px] bg-white/10 dark:bg-white/5 border border-white/15 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-text-primary hover:bg-white/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <ExternalLinkIcon size={12} />
            Visit Store
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMessage}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[18px] bg-white/10 dark:bg-white/5 border border-white/15 flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all flex-shrink-0"
          >
            <MessageIcon size={16} />
          </motion.button>
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(SellerProfileCard);
