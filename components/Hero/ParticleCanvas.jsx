import React, { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 10;
const FRAME_INTERVAL_MS = 1000 / 24;

const ParticleCanvas = ({ className = '', opacity = 0.7 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frameId = 0;
    let lastFrameTime = 0;
    let isVisible = true;
    const particles = [];

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const createParticle = () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      radius: 1.2 + Math.random() * 2.2,
      speedX: -0.12 + Math.random() * 0.24,
      speedY: -0.08 + Math.random() * 0.16,
      alpha: 0.3 + Math.random() * 0.5,
    });

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        particles.push(createParticle());
      }
    };

    const tick = (time = 0) => {
      if (!isVisible) {
        frameId = 0;
        return;
      }

      if (time - lastFrameTime < FRAME_INTERVAL_MS) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      lastFrameTime = time;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.fillStyle = `rgba(255, 122, 0, ${opacity})`;

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < -10) particle.x = canvas.clientWidth + 10;
        if (particle.x > canvas.clientWidth + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.clientHeight + 10;
        if (particle.y > canvas.clientHeight + 10) particle.y = -10;

        ctx.globalAlpha = particle.alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      frameId = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && frameId === 0) {
          lastFrameTime = 0;
          frameId = window.requestAnimationFrame(tick);
        }
      },
      { threshold: 0.05 }
    );

    resize();
    init();
    observer.observe(canvas);
    frameId = window.requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frameId);
    };
  }, [opacity]);

  return <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${className}`} />;
};

export default ParticleCanvas;
