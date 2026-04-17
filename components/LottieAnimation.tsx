import React, { useEffect } from 'react';

interface LottieAnimationProps {
  src: string;
  className?: string;
  alt?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        loop?: boolean;
        autoplay?: boolean;
        speed?: number;
      };
    }
  }
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  className,
  alt = 'Animation',
  loop = true,
  autoplay = true,
  speed = 1
}) => {
  const isDotLottie = src.toLowerCase().includes('.lottie');

  useEffect(() => {
    if (!isDotLottie || typeof window === 'undefined') return;
    void import('@dotlottie/player-component').catch((error) => {
      console.warn('Failed to load dotLottie player:', error);
    });
  }, [isDotLottie]);

  if (isDotLottie) {
    return (
      <span className={`inline-block align-middle ${className || ''}`} aria-label={alt}>
        <dotlottie-player
          src={src}
          loop={loop}
          autoplay={autoplay}
          speed={speed}
          style={{ width: '100%', height: '100%' }}
        />
      </span>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
};

export default LottieAnimation;
