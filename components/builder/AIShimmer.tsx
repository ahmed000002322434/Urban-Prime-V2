
import React from 'react';
import { motion } from 'framer-motion';

const AIShimmer: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[60] bg-white/20 dark:bg-black/20 backdrop-blur-[2px] overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute inset-0 w-[200%]"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(15, 185, 177, 0.2) 50%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-[#121212] px-6 py-4 rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-xl">✨</div>
          </div>
          <p className="text-sm font-black text-primary uppercase tracking-[0.2em] animate-pulse">AI Designing...</p>
        </div>
      </div>
    </div>
  );
};

export default AIShimmer;
