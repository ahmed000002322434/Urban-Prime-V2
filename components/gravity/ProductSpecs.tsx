import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import type { Item } from '../../types';

interface ProductSpecsProps {
  item: Item;
}

// --- Icons ---
const InfoIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
const PackageIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);

const ProductSpecs: React.FC<ProductSpecsProps> = ({ item }) => {
  const specs = [
    { label: 'Category', value: item.category },
    { label: 'Material', value: (item as any).materials?.[0]?.name || 'Premium Grade' },
    { label: 'Condition', value: (item as any).condition || 'Pristine' },
    { label: 'Origin', value: (item as any).originCountry || 'International' },
    { label: 'Warranty', value: (item as any).warranty?.coverage || '2 Year Global' },
    { label: 'Shipping', value: 'Express Secured' },
  ].filter(s => s.value);

  const features = (item as any).features || ['Premium Quality', 'Authenticated', 'Fast Delivery', 'Insured Shipping', 'Gift Packaging'];

  return (
    <GlassCard
      className="p-5 sm:p-8 md:p-12 rounded-[28px] sm:rounded-[36px] md:rounded-[48px] backdrop-blur-[30px] bg-white/20 dark:bg-black/20 border border-white/15 dark:border-white/8 shadow-2xl"
      enableFloat={false}
      maxTilt={3}
      glowColor="rgba(108,142,255,0.08)"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Section Label */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <PackageIcon size={18} />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1 sm:mb-2 opacity-70">About This Product</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight">
              Product Details
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm sm:text-base md:text-lg leading-relaxed text-text-secondary font-medium max-w-3xl">
          {item.description || "Discover unparalleled quality and craftsmanship. This exclusive piece embodies the essence of luxury and functionality, designed for those who appreciate the finer details in life."}
        </p>

        {/* Feature Pills */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {features.map((feature: string, i: number) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-text-primary bg-white/10 dark:bg-white/5 border border-white/15 hover:border-primary/30 hover:text-primary transition-all cursor-default"
              >
                {feature}
              </motion.span>
            ))}
          </div>
        )}

        {/* Spec Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-white/10">
          {specs.map((spec, i) => (
            <motion.div
              key={i}
              className="space-y-1 sm:space-y-1.5"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
            >
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-40">
                {spec.label}
              </p>
              <p className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
                {spec.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Additional Specifications */}
        {(item as any).specifications && (item as any).specifications.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-6 border-t border-white/10">
            {(item as any).specifications.map((spec: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] sm:text-xs text-text-secondary font-medium opacity-60">{spec.key}</span>
                <span className="text-[10px] sm:text-xs font-bold text-text-primary">{spec.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Satisfaction Guarantee */}
        <div className="flex items-start gap-3 p-4 sm:p-5 rounded-[18px] sm:rounded-[24px] bg-green-500/5 border border-green-500/15">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <InfoIcon size={14} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-wider">100% Satisfaction Guarantee</p>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-1 leading-relaxed">Every purchase is backed by our buyer protection program. If you're not satisfied, return within 7 days for a full refund.</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(ProductSpecs);
