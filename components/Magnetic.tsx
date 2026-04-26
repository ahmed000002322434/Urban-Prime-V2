
import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import useLowEndMode from '../hooks/useLowEndMode';

interface MagneticProps {
  children: React.ReactElement;
  strength?: number; // How far it moves
  className?: string;
  disabled?: boolean;
}

const Magnetic: React.FC<MagneticProps> = ({ children, strength = 20, className = "", disabled = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isLowEndMode = useLowEndMode();
  const shouldDisable = disabled || isLowEndMode;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 18, mass: 0.12 });
  const springY = useSpring(y, { stiffness: 180, damping: 18, mass: 0.12 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldDisable) return;

    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };
    
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    const strengthMultiplier = strength / 20;

    x.set(middleX * 0.5 * strengthMultiplier);
    y.set(middleY * 0.5 * strengthMultiplier);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={shouldDisable ? undefined : handleMouse}
      onMouseLeave={shouldDisable ? undefined : reset}
      style={shouldDisable ? undefined : { x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      {React.cloneElement(children, {
        // Pass style or className if needed to children, but mostly handled by motion wrapper
      })}
    </motion.div>
  );
};

export default Magnetic;
