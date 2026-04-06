import React from 'react';
import { useTheme } from '../hooks/useTheme';

type Star = {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

const STARS: Star[] = Array.from({ length: 56 }, (_, index) => {
  const leftSeed = (index * 17) % 100;
  const topSeed = (index * 29) % 100;
  return {
    id: index,
    left: `${leftSeed}%`,
    top: `${topSeed}%`,
    size: 1 + (index % 4) * 0.5,
    duration: 10 + (index % 6) * 2,
    delay: (index % 9) * 0.45,
    opacity: 0.22 + (index % 5) * 0.11
  };
});

const AURORAS = [
  {
    id: 'violet',
    className: 'spotlight-aurora violet',
    left: '-8%',
    top: '-6%',
    size: '54vw',
    delay: '0s'
  },
  {
    id: 'cyan',
    className: 'spotlight-aurora cyan',
    left: '38%',
    top: '-12%',
    size: '42vw',
    delay: '-4s'
  },
  {
    id: 'pink',
    className: 'spotlight-aurora pink',
    left: '18%',
    top: '34%',
    size: '48vw',
    delay: '-8s'
  }
];

const StarryBackground: React.FC = () => {
  const { resolvedTheme } = useTheme();

  if (resolvedTheme !== 'obsidian') {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020205]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(85,103,255,0.16),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(14,165,233,0.08),transparent_30%),linear-gradient(180deg,#020205_0%,#050611_38%,#090b14_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.02)_18%,transparent_36%,rgba(255,255,255,0.03)_55%,transparent_74%)] opacity-70" />

      <div className="absolute inset-0">
        {AURORAS.map((aurora) => (
          <span
            key={aurora.id}
            className={`spotlight-aurora ${aurora.className}`}
            style={{
              left: aurora.left,
              top: aurora.top,
              width: aurora.size,
              height: aurora.size,
              animationDelay: aurora.delay
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 opacity-90 mix-blend-screen">
        {STARS.map((star) => (
          <span
            key={star.id}
            className="spotlight-star"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`
            }}
          />
        ))}
      </div>

      <style>{`
        .spotlight-aurora {
          position: absolute;
          border-radius: 9999px;
          filter: blur(96px);
          opacity: 0.72;
          transform: translate3d(0, 0, 0);
          animation: spotlight-aurora-sway 18s ease-in-out infinite;
        }

        .spotlight-aurora.violet {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(168, 85, 247, 0.08) 42%, transparent 72%);
        }

        .spotlight-aurora.cyan {
          background: radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, rgba(34, 211, 238, 0.08) 44%, transparent 72%);
        }

        .spotlight-aurora.pink {
          background: radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, rgba(236, 72, 153, 0.06) 45%, transparent 72%);
        }

        .spotlight-star {
          position: absolute;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 14px rgba(196, 220, 255, 0.32);
          animation-name: spotlight-star-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform: translate3d(0, 0, 0);
        }

        @keyframes spotlight-star-float {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -16px, 0) scale(1.15);
          }
        }

        @keyframes spotlight-aurora-sway {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          50% {
            transform: translate3d(18px, -14px, 0) rotate(6deg) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
};

export default StarryBackground;
