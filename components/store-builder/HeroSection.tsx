
import React from 'react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  headline: string;
  subheadline: string;
  ctaText: string;
  imageUrl: string;
  primaryColor: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ headline, subheadline, ctaText, imageUrl, primaryColor }) => {
  return (
    <section className="relative w-full h-[500px] flex items-center justify-center overflow-hidden bg-gray-900">
      <img 
        src={imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop'} 
        className="absolute inset-0 w-full h-full object-cover opacity-60" 
        alt="Hero Background"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black text-white font-display leading-tight mb-4"
        >
          {headline || "Welcome to our store"}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-white/80 mb-8"
        >
          {subheadline || "Discover unique collections curated just for you."}
        </motion.p>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 text-white font-black uppercase tracking-widest rounded-lg shadow-xl"
          style={{ backgroundColor: primaryColor || '#0fb9b1' }}
        >
          {ctaText || "Shop Now"}
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
