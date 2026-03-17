import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import GlassCard from './GlassCard';
import StarRating from '../StarRating';
import type { Item } from '../../types';

interface DiscoverMoreProductsProps {
  items: Item[];
}

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const SparklesIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);

const DiscoverMoreProducts: React.FC<DiscoverMoreProductsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8 }}
      className="space-y-8 sm:space-y-10"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <SparklesIcon />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1 sm:mb-2 opacity-70">Curated For You</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-text-primary uppercase tracking-tight">
              Discover More
            </h2>
          </div>
        </div>
        <Link
          to="/browse"
          className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] hover:opacity-70 transition-opacity flex items-center gap-2 self-start sm:self-auto"
        >
          View Catalog
          <ChevronRightIcon />
        </Link>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {items.map((item, i) => {
          const imageUrl = item.imageUrls?.[0] || item.images?.[0] || `https://picsum.photos/seed/${item.id}/400/500`;
          const price = item.salePrice || item.price || 0;

          return (
            <Link to={`/item/${item.id}`} key={item.id} className="block">
              <GlassCard
                className="rounded-[20px] sm:rounded-[24px] md:rounded-[32px] overflow-hidden backdrop-blur-[20px] bg-white/15 dark:bg-black/15 border border-white/15 dark:border-white/8 group cursor-pointer"
                maxTilt={8}
                enableFloat={false}
                glowColor="rgba(108,142,255,0.1)"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Image */}
                <div className="relative z-10 aspect-[3/4] sm:aspect-[4/5] overflow-hidden">
                  <motion.img
                    src={imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    draggable={false}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Info */}
                <div className="relative z-10 p-3 sm:p-4 md:p-5 space-y-1 sm:space-y-2">
                  {item.brand && (
                    <p className="text-[8px] sm:text-[9px] font-bold text-text-secondary uppercase tracking-widest opacity-50">{item.brand}</p>
                  )}
                  <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <StarRating rating={item.avgRating || 4.5} size="sm" />
                    <span className="text-[8px] sm:text-[10px] text-text-secondary font-medium opacity-50">
                      ({item.reviews?.length || 0})
                    </span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-black text-text-primary tracking-tight">
                    ${price.toLocaleString()}
                  </p>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </motion.section>
  );
};

export default React.memo(DiscoverMoreProducts);
