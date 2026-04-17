import React from 'react';
import { motion, useTransform, MotionValue } from 'framer-motion';

interface GravityBackgroundProps {
  springX: MotionValue<number>;
  springY: MotionValue<number>;
}

// Generate deterministic particle data at module level
const PARTICLE_COUNT = 50;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 3,
  opacity: 0.15 + Math.random() * 0.35,
  duration: 15 + Math.random() * 25,
  delay: Math.random() * 10,
}));

const GravityBackground: React.FC<GravityBackgroundProps> = ({ springX, springY }) => {
  // Parallax offset for gradient blobs
  const blob1X = useTransform(springX, [-1, 1], [-30, 30]);
  const blob1Y = useTransform(springY, [-1, 1], [-20, 20]);
  const blob2X = useTransform(springX, [-1, 1], [20, -20]);
  const blob2Y = useTransform(springY, [-1, 1], [15, -15]);
  const blob3X = useTransform(springX, [-1, 1], [-15, 15]);
  const blob3Y = useTransform(springY, [-1, 1], [-25, 25]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Primary Gradient Blob – Top Right */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, 30, 0],
          opacity: [0.18, 0.28, 0.18],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-[15%] -right-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full will-change-transform"
        style={{
          x: blob1X,
          y: blob1Y,
          background: 'radial-gradient(circle, rgba(15,185,177,0.18) 0%, rgba(243,156,18,0.08) 52%, transparent 72%)',
          filter: 'blur(120px)',
        }}
      />

      {/* Secondary Gradient Blob – Bottom Left */}
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          rotate: [0, -25, 0],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-[20%] -left-[10%] w-[75vw] h-[75vw] max-w-[950px] max-h-[950px] rounded-full will-change-transform"
        style={{
          x: blob2X,
          y: blob2Y,
          background: 'radial-gradient(circle, rgba(148,163,184,0.18) 0%, rgba(15,23,42,0.08) 52%, transparent 72%)',
          filter: 'blur(140px)',
        }}
      />

      {/* Tertiary Spotlight – Center for hero */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[10%] left-[25%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full will-change-transform"
        style={{
          x: blob3X,
          y: blob3Y,
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(15,185,177,0.06) 42%, transparent 72%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Particle System */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full will-change-transform"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(255,255,255,${p.opacity}) 0%, transparent 70%)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(148,163,184,${p.opacity * 0.35})`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            x: [0, (Math.random() - 0.5) * 50, 0],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

export default React.memo(GravityBackground);
