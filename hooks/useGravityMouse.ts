import { useEffect, useState, useCallback, useRef } from 'react';
import { useSpring } from 'framer-motion';

interface GravityMouseState {
  /** Raw mouse X position (px) */
  clientX: number;
  /** Raw mouse Y position (px) */
  clientY: number;
  /** Normalized X: -1 (left) to 1 (right) */
  normalizedX: number;
  /** Normalized Y: -1 (top) to 1 (bottom) */
  normalizedY: number;
}

interface UseGravityMouseOptions {
  /** Spring stiffness – lower = more floaty (default 50) */
  stiffness?: number;
  /** Spring damping – higher = less oscillation (default 20) */
  damping?: number;
  /** Disable on mobile/touch devices (default true) */
  disableOnMobile?: boolean;
}

export function useGravityMouse(options: UseGravityMouseOptions = {}) {
  const { stiffness = 50, damping = 20, disableOnMobile = true } = options;

  const [isMobile, setIsMobile] = useState(false);
  const mouseRef = useRef<GravityMouseState>({
    clientX: 0,
    clientY: 0,
    normalizedX: 0,
    normalizedY: 0,
  });

  // Spring-dampened values for smooth parallax
  const springX = useSpring(0, { stiffness, damping, restDelta: 0.001 });
  const springY = useSpring(0, { stiffness, damping, restDelta: 0.001 });

  // For 3D tilt (stronger spring)
  const rotateX = useSpring(0, { stiffness: stiffness * 1.5, damping: damping * 1.2, restDelta: 0.001 });
  const rotateY = useSpring(0, { stiffness: stiffness * 1.5, damping: damping * 1.2, restDelta: 0.001 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disableOnMobile && isMobile) return;

      const { clientX, clientY } = e;
      const nx = (clientX / window.innerWidth) * 2 - 1;
      const ny = (clientY / window.innerHeight) * 2 - 1;

      mouseRef.current = { clientX, clientY, normalizedX: nx, normalizedY: ny };

      springX.set(nx);
      springY.set(ny);
      rotateX.set(-ny * 7); // tilt up to ±7 degrees
      rotateY.set(nx * 7);
    },
    [isMobile, disableOnMobile, springX, springY, rotateX, rotateY]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return {
    /** Raw mouse state ref (no re-renders) */
    mouseRef,
    /** Spring-dampened normalized X (-1 to 1) */
    springX,
    /** Spring-dampened normalized Y (-1 to 1) */
    springY,
    /** Spring-dampened tilt X rotation (degrees) */
    rotateX,
    /** Spring-dampened tilt Y rotation (degrees) */
    rotateY,
    /** Whether the device is mobile/touch */
    isMobile,
  };
}
