import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

const SLIDE_DURATION_MS = 5000;

const slides = [
  {
    id: 'buyables-banner',
    title: 'Find What Makes Your Day Better',
    description: 'Discover curated products that simplify, inspire, and elevate your lifestyle.',
    primaryCta: { label: 'Explore Now', to: '/browse' },
    secondaryCta: { label: 'View Deals', to: '/deals' },
    visual: '/mobile-banners/buyables.png',
    imagePosition: 'center 35%',
    contentPosition: { left: '5%', top: '28%' },
    ctaPosition: { left: '5%', top: '52%' },
    titleClass: 'text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.65)]',
    descriptionClass: 'text-white/85 font-medium',
    primaryClass: 'border border-white/40 bg-white/15 text-white shadow-[0_8px_24px_rgba(255,255,255,0.2)] hover:bg-white/25 hover:border-white/60 backdrop-blur-md',
    secondaryClass: 'border border-white/30 bg-black/35 text-white hover:bg-black/50 hover:border-white/45 backdrop-blur-md',
  },
  {
    id: 'rentables-banner',
    title: 'Rent Premium Items Today',
    description: 'Access everything you need without the commitment. Quality gear, zero ownership stress.',
    primaryCta: { label: 'Start Renting', to: '/renters' },
    secondaryCta: { label: 'Learn More', to: '/renters' },
    visual: '/mobile-banners/rentables.png',
    imagePosition: 'center 38%',
    contentPosition: { left: '5%', top: '28%' },
    ctaPosition: { left: '5%', top: '52%' },
    titleClass: 'text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.65)]',
    descriptionClass: 'text-white/85 font-medium',
    primaryClass: 'border border-white/40 bg-white/15 text-white shadow-[0_8px_24px_rgba(255,255,255,0.2)] hover:bg-white/25 hover:border-white/60 backdrop-blur-md',
    secondaryClass: 'border border-white/30 bg-black/35 text-white hover:bg-black/50 hover:border-white/45 backdrop-blur-md',
  },
  {
    id: 'pixe-banner',
    title: 'Watch. Scroll. Shop.',
    description: 'Discover products through engaging short videos. The future of shopping is now.',
    primaryCta: { label: 'Open Pixe', to: '/pixe' },
    secondaryCta: { label: 'Watch Feed', to: '/pixe' },
    visual: '/mobile-banners/pixe.png',
    imagePosition: 'center 40%',
    contentPosition: { left: '5%', top: '28%' },
    ctaPosition: { left: '5%', top: '52%' },
    titleClass: 'text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.65)]',
    descriptionClass: 'text-white/85 font-medium',
    primaryClass: 'border border-white/40 bg-white/15 text-white shadow-[0_8px_24px_rgba(255,255,255,0.2)] hover:bg-white/25 hover:border-white/60 backdrop-blur-md',
    secondaryClass: 'border border-white/30 bg-black/35 text-white hover:bg-black/50 hover:border-white/45 backdrop-blur-md',
  },
  {
    id: 'profit-banner',
    title: 'Grow Your Income. No Limits.',
    description: 'Turn your expertise into profit. Zero inventory, zero shipping. Pure earning potential.',
    primaryCta: { label: 'Start Selling', to: '/dropshipping' },
    secondaryCta: { label: 'Creator Hub', to: '/seller-resource-center' },
    visual: '/mobile-banners/profit.png',
    imagePosition: 'center 35%',
    contentPosition: { left: '5%', top: '28%' },
    ctaPosition: { left: '5%', top: '52%' },
    titleClass: 'text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.65)]',
    descriptionClass: 'text-white/85 font-medium',
    primaryClass: 'border border-white/40 bg-white/15 text-white shadow-[0_8px_24px_rgba(255,255,255,0.2)] hover:bg-white/25 hover:border-white/60 backdrop-blur-md',
    secondaryClass: 'border border-white/30 bg-black/35 text-white hover:bg-black/50 hover:border-white/45 backdrop-blur-md',
  },
];

const preloadImage = (src) => {
  if (typeof window === 'undefined') return;
  const image = new window.Image();
  image.src = src;
};

const CinematicHero = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const stageRef = useRef(null);
  const contentRef = useRef(null);
  const pausedIndexRef = useRef(0);
  const timerRef = useRef(null);

  const activeSlide = useMemo(() => slides[renderIndex], [renderIndex]);

  useEffect(() => {
    slides.forEach((slide) => preloadImage(slide.visual));
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVisible(false);
        pausedIndexRef.current = activeIndex;
      } else {
        setIsVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeIndex]);

  useEffect(() => {
    if (isPaused || !isVisible) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION_MS);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, isVisible]);

  useEffect(() => {
    if (activeIndex === renderIndex) return;
    if (!stageRef.current) {
      setRenderIndex(activeIndex);
      return;
    }

    gsap.killTweensOf(stageRef.current);
    gsap.to(stageRef.current, {
      autoAlpha: 0,
      duration: 0.52,
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      onComplete: () => setRenderIndex(activeIndex),
    });
  }, [activeIndex, renderIndex]);

  useEffect(() => {
    if (!stageRef.current) return;

    gsap.killTweensOf(stageRef.current);
    gsap.fromTo(stageRef.current, { autoAlpha: 0, scale: 0.98 }, { autoAlpha: 1, scale: 1, duration: 0.88, ease: 'cubic-bezier(0.23, 1, 0.320, 1)' });

    if (contentRef.current) {
      gsap.killTweensOf(contentRef.current);
      gsap.fromTo(
        contentRef.current,
        { autoAlpha: 0, y: 32 },
        { autoAlpha: 1, y: 0, duration: 0.68, delay: 0.15, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );
    }

  }, [renderIndex]);

  return (
    <section
      className="relative isolate h-[88vh] min-h-[680px] max-h-[940px] w-full overflow-hidden bg-[#050505] text-white"
      style={{ minHeight: '680px' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Hero banner carousel"
    >
      <div
        ref={stageRef}
        className="absolute inset-0 overflow-hidden"
      >
        <img
          src={activeSlide.visual}
          alt="Urban Prime banner"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: activeSlide.imagePosition }}
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/64 via-black/18 to-black/8" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-transparent to-black/55" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/42 to-transparent" />

      <div
        ref={contentRef}
        className="absolute z-20 flex max-w-[70%] flex-col items-start pointer-events-auto gap-5"
        style={activeSlide.contentPosition}
      >
        <h1 className={`max-w-[95%] text-4xl font-black leading-[1.1] tracking-tight md:text-5xl lg:text-6xl word-break ${activeSlide.titleClass}`}>
          {activeSlide.title}
        </h1>
        <p className={`max-w-[90%] text-base leading-relaxed md:text-lg lg:text-xl word-break ${activeSlide.descriptionClass}`}>
          {activeSlide.description}
        </p>
      </div>

      <div
        className="absolute z-20 flex flex-wrap gap-4 pointer-events-auto"
        style={activeSlide.ctaPosition}
      >
        <Link
          to={activeSlide.primaryCta.to}
          className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-xs font-black uppercase tracking-[0.25em] transition-all duration-300 hover:scale-108 hover:-translate-y-1 active:scale-95 whitespace-nowrap ${activeSlide.primaryClass}`}
        >
          {activeSlide.primaryCta.label}
        </Link>
        <Link
          to={activeSlide.secondaryCta.to}
          className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-xs font-black uppercase tracking-[0.25em] transition-all duration-300 hover:scale-108 hover:-translate-y-1 active:scale-95 whitespace-nowrap ${activeSlide.secondaryClass}`}
        >
          {activeSlide.secondaryCta.label}
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-12 z-20 flex items-center justify-center gap-3 px-6">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-400 ${
              renderIndex === index
                ? 'w-10 bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)] scale-100'
                : 'w-3 bg-white/40 hover:bg-white/60 scale-95'
            }`}
            aria-label={`Show slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default CinematicHero;
