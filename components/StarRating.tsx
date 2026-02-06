
import React, { useState } from 'react';

const StarIcon: React.FC<{ filled: boolean; className?: string; onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void }> = ({ filled, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-yellow-400 ${className}`}
        {...props}
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);


interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ rating, interactive = false, onRatingChange, className, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (interactive) {
      setHoverRating(index);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className={`flex items-center ${className}`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <StarIcon
          key={index}
          filled={index <= displayRating}
          onClick={() => handleClick(index)}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
          className={`${sizeClass} ${interactive ? 'cursor-pointer' : ''} transition-transform duration-200 ${hoverRating === index ? 'scale-125' : ''}`}
        />
      ))}
    </div>
  );
};

export default StarRating;
