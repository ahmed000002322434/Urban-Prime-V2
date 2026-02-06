
import React from 'react';
import { motion } from 'framer-motion';

interface OmniTriggerProps {
  onClick: () => void;
}

const OmniTrigger: React.FC<OmniTriggerProps> = ({ onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, rotate: 90 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 left-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center z-[150] shadow-2xl border border-white/20 group"
    >
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-colors"></div>
      <span className="relative z-10 text-2xl font-black font-display">O</span>
    </motion.button>
  );
};

export default OmniTrigger;
