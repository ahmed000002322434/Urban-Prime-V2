import React, { useState, useEffect } from 'react';
import { useUserData } from '../hooks/useUserData';
import { useAuth } from '../hooks/useAuth';

interface WishlistButtonProps {
  itemId: string;
  className?: string;
}

const HeartIcon: React.FC<{ isFilled: boolean }> = ({ isFilled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={isFilled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-all duration-300 ${isFilled ? 'text-red-500' : 'text-white'}`}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const WishlistButton: React.FC<WishlistButtonProps> = ({ itemId, className }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { isWishlisted, toggleWishlist } = useUserData();
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // duration of heart-beat animation
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  if (!isAuthenticated) return null;

  const isFilled = isWishlisted(itemId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if inside a card
    e.stopPropagation();
    
    if(!isAuthenticated) {
        openAuthModal('login');
        return;
    }
    
    // Animate only when adding to wishlist
    if (!isFilled) {
      setIsAnimating(true);
    }
    toggleWishlist(itemId);
  };

  return (
    <button
      onClick={handleToggle}
      className={`absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${className} ${isAnimating ? 'animate-heart-beat' : ''}`}
      aria-label={isFilled ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <HeartIcon isFilled={isFilled} />
    </button>
  );
};

export default WishlistButton;
