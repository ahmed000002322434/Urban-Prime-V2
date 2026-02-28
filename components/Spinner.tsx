import React from 'react';
import LottieAnimation from './LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <LottieAnimation src={uiLottieAnimations.loader} alt="Loading" className={`${sizeClasses[size]} object-contain`} loop autoplay />
    </div>
  );
};

export default Spinner;
