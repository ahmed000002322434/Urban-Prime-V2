
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOmni } from '../../context/OmniContext';
import { OmniHeartbeat } from '../../services/OmniHeartbeat';

interface OmniFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

const OmniFloatingButton: React.FC<OmniFloatingButtonProps> = ({ onClick, isOpen }) => {
  const { isThinking, authError, setAuthError } = useOmni();
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (authError) {
      setTimeout(() => setAuthError(false), 5000);
    }
  }, [authError, setAuthError]);

  useEffect(() => {
    OmniHeartbeat.init();
    return OmniHeartbeat.subscribe(() => {
        setPulseActive(true);
        setTimeout(() => setPulseActive(false), 600);
    });
  }, []);

  return (
    <motion.button
      layoutId="omni-panel"
      onClick={onClick}
      initial={false}
      animate={{ 
        x: isOpen ? -100 : 0, 
        opacity: isOpen ? 0 : 1,
        scale: isOpen ? 0.5 : 1
      }}
      className="fixed left-6 bottom-1/2 z-[150] w-16 h-16 rounded-full flex items-center justify-center cursor-pointer overflow-visible"
    >
      <motion.div
        animate={{ 
          scale: isThinking || authError ? [1, 1.4, 1] : [1, 1.2, 1],
          opacity: isThinking || authError ? [0.6, 0.9, 0.6] : [0.3, 0.6, 0.3],
          backgroundColor: authError ? 'rgba(239, 68, 68, 0.4)' : isThinking ? 'rgba(124, 58, 237, 0.4)' : 'rgba(15, 185, 177, 0.2)'
        }}
        transition={{ duration: isThinking || authError ? 0.8 : 3, repeat: Infinity }}
        className={`absolute inset-0 rounded-full blur-xl ${authError ? 'shadow-[0_0_40px_rgba(239,68,68,0.6)]' : ''}`}
      />
      
      <div className={`relative w-full h-full rounded-full backdrop-blur-2xl border transition-all duration-500 flex items-center justify-center shadow-2xl ${
        authError ? 'bg-red-600/60 border-red-400' :
        isThinking ? 'bg-purple-600/40 border-purple-400/50' : 
        'bg-white/10 dark:bg-black/40 border-white/20 dark:border-white/10'
      }`}>
        <span className={`text-2xl font-black font-display ${authError ? 'text-white' : isThinking ? 'text-white' : 'text-primary'}`}>
          {authError ? '!' : isThinking ? '⟁' : 'O'}
        </span>
      </div>
    </motion.button>
  );
};

export default OmniFloatingButton;
