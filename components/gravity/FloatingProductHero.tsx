import React, { useRef, useCallback, useState } from 'react';
import { motion, useSpring, useTransform, MotionValue, AnimatePresence } from 'framer-motion';

interface FloatingProductHeroProps {
  images: string[];
  title: string;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  isMobile: boolean;
}

// --- SVG Icons ---
const ZoomIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

const FloatingProductHero: React.FC<FloatingProductHeroProps> = ({
  images,
  title,
  springX,
  springY,
  isMobile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightPos, setLightPos] = useState({ x: 50, y: 30 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Local tilt for the hero image
  const tiltX = useSpring(0, { stiffness: 80, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 80, damping: 18 });

  // Parallax from global mouse
  const heroX = useTransform(springX, [-1, 1], [-12, 12]);
  const heroY = useTransform(springY, [-1, 1], [-8, 8]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      tiltX.set((y - 0.5) * -10);
      tiltY.set((x - 0.5) * 10);
      setLightPos({ x: x * 100, y: y * 100 });
    },
    [isMobile, tiltX, tiltY]
  );

  const handleMouseLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
    setLightPos({ x: 50, y: 30 });
  }, [tiltX, tiltY]);

  const mainImage = images[activeIndex] || images[0];
  const hasMultiple = images.length > 1;

  const goNext = () => setActiveIndex((prev) => (prev + 1) % images.length);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      <div className="relative" ref={containerRef}>
        {/* Main Floating Product Image */}
        <motion.div
          className="relative mx-auto"
          style={{
            x: isMobile ? 0 : heroX,
            y: isMobile ? 0 : heroY,
            perspective: 1200,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Levitation Shadow */}
          <motion.div
            className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 w-[60%] md:w-[70%] h-6 md:h-8 rounded-[50%] will-change-transform"
            animate={{
              scaleX: [0.85, 1, 0.85],
              opacity: [0.2, 0.12, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
              filter: 'blur(12px)',
            }}
          />

          {/* Product Image Container */}
          <motion.div
            className="relative rounded-[28px] sm:rounded-[36px] md:rounded-[48px] overflow-hidden cursor-crosshair group"
            style={{
              rotateX: isMobile ? 0 : tiltX,
              rotateY: isMobile ? 0 : tiltY,
              transformStyle: 'preserve-3d' as const,
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Image */}
            <div className="aspect-[4/5] sm:aspect-[4/5] overflow-hidden bg-white/5">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIndex}
                  src={mainImage}
                  alt={title}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  draggable={false}
                  onClick={() => setIsZoomed(true)}
                />
              </AnimatePresence>
            </div>

            {/* Light Reflection Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-all duration-300 hidden md:block"
              style={{
                background: `radial-gradient(600px circle at ${lightPos.x}% ${lightPos.y}%, rgba(255,255,255,0.25), transparent 60%)`,
              }}
            />

            {/* Glass edge highlight */}
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] ring-1 ring-inset ring-white/20" />

            {/* Bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700" />

            {/* Zoom hint */}
            <button
              onClick={() => setIsZoomed(true)}
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white opacity-70 hover:opacity-100 transition-all z-20 hover:bg-black/50"
            >
              <ZoomIcon />
            </button>

            {/* Mobile swipe arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white z-20 opacity-0 group-hover:opacity-80 transition-opacity md:hover:bg-black/50 active:opacity-100"
                  style={{ opacity: isMobile ? 0.7 : undefined }}
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white z-20 opacity-0 group-hover:opacity-80 transition-opacity md:hover:bg-black/50 active:opacity-100"
                  style={{ opacity: isMobile ? 0.7 : undefined }}
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}

            {/* Inner glow border */}
            <div
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{
                boxShadow: 'inset 0 0 60px -20px rgba(108,142,255,0.1), 0 25px 60px -15px rgba(0,0,0,0.2)',
              }}
            />

            {/* Product Label */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute bottom-4 left-4 md:bottom-8 md:left-8 glass-panel px-3 py-2 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl border-white/40 shadow-2xl backdrop-blur-2xl z-10"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-0.5">Premium Edition</p>
              <p className="text-xs md:text-sm font-bold text-white uppercase tracking-widest drop-shadow-sm line-clamp-1">{title}</p>
            </motion.div>

            {/* Image counter badge */}
            {hasMultiple && (
              <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/15 text-[9px] font-bold text-white/80 z-10">
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Thumbnail Satellites */}
        {hasMultiple && (
          <motion.div
            className="flex justify-center gap-2 sm:gap-3 mt-5 md:mt-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {images.slice(0, 6).map((img, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${
                  activeIndex === i
                    ? 'border-primary/60 shadow-[0_0_20px_-4px_rgba(108,142,255,0.4)] scale-105 md:scale-110'
                    : 'border-white/20 hover:border-white/40 opacity-60 hover:opacity-100'
                }`}
                whileHover={{ y: -3, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
                {activeIndex === i && (
                  <div className="absolute inset-0 ring-1 ring-inset ring-primary/30 rounded-[inherit]" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* ═══════════ FULLSCREEN ZOOM LIGHTBOX ═══════════ */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
            >
              <CloseIcon />
            </button>

            {/* Navigation */}
            {hasMultiple && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}

            {/* Zoomed Image */}
            <motion.img
              key={`zoom-${activeIndex}`}
              src={mainImage}
              alt={title}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-3xl shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />

            {/* Counter */}
            {hasMultiple && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-sm font-bold text-white z-10">
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(FloatingProductHero);
