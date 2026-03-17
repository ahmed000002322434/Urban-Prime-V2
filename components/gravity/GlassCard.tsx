import React, { useRef, useState, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
  maxTilt?: number;
  enableFloat?: boolean;
  floatDelay?: number;
  enableGlow?: boolean;
  glowColor?: string;
  onClick?: () => void;
  initial?: any;
  animate?: any;
  whileInView?: any;
  viewport?: any;
  transition?: any;
  style?: React.CSSProperties;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  enableTilt = true,
  maxTilt = 6,
  enableFloat = false,
  floatDelay = 0,
  enableGlow = true,
  glowColor = 'rgba(108,142,255,0.15)',
  onClick,
  initial,
  animate,
  whileInView,
  viewport,
  transition,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const tiltX = useSpring(0, { stiffness: 200, damping: 20 });
  const tiltY = useSpring(0, { stiffness: 200, damping: 20 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enableTilt || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      tiltX.set((y - 0.5) * -maxTilt);
      tiltY.set((x - 0.5) * maxTilt);
    },
    [enableTilt, maxTilt, tiltX, tiltY]
  );

  const handleMouseLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
    setIsHovered(false);
  }, [tiltX, tiltY]);

  // Use CSS animation for float to avoid conflicting with framer-motion animate/whileInView
  const floatClass = enableFloat ? 'gravity-float' : '';
  const floatStyle = enableFloat && floatDelay > 0
    ? { animationDelay: `${floatDelay}s` }
    : {};

  return (
    <motion.div
      ref={cardRef}
      className={`gravity-glass relative overflow-hidden ${floatClass} ${className}`}
      style={{
        rotateX: enableTilt ? tiltX : 0,
        rotateY: enableTilt ? tiltY : 0,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d' as const,
        ...floatStyle,
        ...style,
      }}
      initial={initial}
      animate={animate}
      whileInView={whileInView}
      viewport={viewport}
      transition={transition}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Glass surface */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none bg-gradient-to-br from-white/[0.12] to-transparent" />

      {/* Glow highlight following cursor */}
      {enableGlow && isHovered && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-60 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at 50% 50%, ${glowColor}, transparent 60%)`,
          }}
        />
      )}

      {/* Edge glow on hover */}
      {enableGlow && isHovered && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 1px 0 rgba(255,255,255,0.3), 0 0 20px -5px ${glowColor}`,
          }}
        />
      )}

      {children}
    </motion.div>
  );
};

export default React.memo(GlassCard);
