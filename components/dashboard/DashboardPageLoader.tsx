import React from 'react';
import { motion } from 'framer-motion';

interface DashboardPageLoaderProps {
  title?: string;
}

const pulseTransition = {
  repeat: Infinity,
  repeatType: 'reverse' as const,
  duration: 0.85
};

const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    animate={{ opacity: 0.48 }}
    transition={pulseTransition}
    className={`rounded-lg bg-gradient-to-r from-[#ececec] via-[#f6f6f6] to-[#ececec] ${className}`}
  />
);

const DashboardPageLoader: React.FC<DashboardPageLoaderProps> = ({ title = 'Loading dashboard...' }) => {
  return (
    <div className="dashboard-page space-y-4">
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-5">
        <p className="text-sm font-semibold text-[#3f3f3f]">{title}</p>
        <Block className="mt-3 h-3 w-44" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Block className="h-[122px]" />
        <Block className="h-[122px]" />
        <Block className="h-[122px]" />
        <Block className="h-[122px]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Block className="h-[300px]" />
        <Block className="h-[300px]" />
      </div>
    </div>
  );
};

export default DashboardPageLoader;
