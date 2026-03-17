import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import StarRating from '../StarRating';
import type { Review } from '../../types';

interface GravityReviewsProps {
  reviews: Review[] | any[];
  avgRating: number;
  totalReviews: number;
}

// Rating distribution mock
const ratingDistribution = [
  { stars: 5, percent: 72 },
  { stars: 4, percent: 18 },
  { stars: 3, percent: 6 },
  { stars: 2, percent: 3 },
  { stars: 1, percent: 1 },
];

// --- Icons ---
const QuoteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12C15.017 12.5523 14.5693 13 14.017 13H11.017V21H14.017ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C10.5693 16 11.017 15.5523 11.017 15V9C11.017 8.44772 10.5693 8 10.017 8H7.017C6.46472 8 6.017 8.44772 6.017 9V12C6.017 12.5523 5.5693 13 5.017 13H2.017V21H5.017Z"/>
  </svg>
);
const MessageSquareIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const GravityReviews: React.FC<GravityReviewsProps> = ({
  reviews,
  avgRating,
  totalReviews,
}) => {
  const displayReviews = reviews.length > 0
    ? reviews
    : [
        { userName: 'Premium User', rating: 5, comment: 'Exceptional quality and service. Exceeded all my expectations. The delivery was fast and the item arrived in perfect condition.' },
        { userName: 'Design Enthusiast', rating: 5, comment: 'Stunning craftsmanship. The attention to detail is remarkable. Worth every penny for the premium experience.' },
        { userName: 'Verified Buyer', rating: 4, comment: 'Great product overall. Beautiful packaging and fast shipping. The quality speaks for itself. Highly recommended!' },
      ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8 }}
      className="space-y-8 sm:space-y-10 md:space-y-12"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 flex-shrink-0">
            <MessageSquareIcon />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1 sm:mb-2 opacity-70">Client Feedback</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-text-primary uppercase tracking-tight">
              Reviews
            </h2>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-[16px] sm:rounded-[20px] bg-white/10 dark:bg-white/5 border border-white/15 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-primary hover:text-white transition-all shadow-lg self-start sm:self-auto"
        >
          Write Review
        </motion.button>
      </div>

      {/* Rating Summary */}
      <GlassCard
        className="p-5 sm:p-6 md:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] md:rounded-[40px] backdrop-blur-[30px] bg-white/20 dark:bg-black/20 border border-white/15 dark:border-white/8"
        enableFloat={false}
        maxTilt={3}
        glowColor="rgba(255,200,50,0.1)"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 md:gap-12">
          {/* Big Score */}
          <div className="text-center sm:text-left flex-shrink-0">
            <div className="text-5xl sm:text-6xl md:text-7xl font-black text-text-primary tracking-tighter">
              {avgRating.toFixed(1)}
            </div>
            <div className="mt-2">
              <StarRating rating={Math.round(avgRating)} size="md" />
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-2 opacity-50">
              {totalReviews} verified reviews
            </p>
          </div>

          {/* Distribution Bars */}
          <div className="flex-1 w-full space-y-2 sm:space-y-2.5">
            {ratingDistribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs font-bold text-text-secondary w-5 sm:w-6 text-right opacity-60">{item.stars}★</span>
                <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + (5 - item.stars) * 0.1, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary w-7 sm:w-8 opacity-40">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {displayReviews.map((review: any, i: number) => (
          <GlassCard
            key={i}
            className="p-5 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[28px] md:rounded-[36px] backdrop-blur-[30px] bg-white/15 dark:bg-black/15 border border-white/15 dark:border-white/8 group"
            maxTilt={5}
            enableFloat={false}
            glowColor="rgba(255,200,50,0.08)"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
          >
            <div className="relative z-10 space-y-4 sm:space-y-5">
              {/* Quote icon */}
              <div className="text-primary group-hover:text-primary/40 transition-colors">
                <QuoteIcon />
              </div>

              {/* User */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center font-black text-primary text-xs sm:text-sm border border-primary/15 shadow-inner flex-shrink-0">
                  {(review.userName || review.author?.name || 'U').charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider truncate">
                    {review.userName || review.author?.name || 'Premium User'}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <StarRating rating={review.rating || 5} size="sm" />
                    <span className="text-[8px] sm:text-[9px] font-bold text-text-secondary opacity-40 uppercase tracking-wider">Verified</span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <p className="text-xs sm:text-sm leading-relaxed text-text-secondary font-medium italic">
                "{review.comment || 'Exceptional quality and service. Exceeded all my expectations.'}"
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.section>
  );
};

export default React.memo(GravityReviews);
