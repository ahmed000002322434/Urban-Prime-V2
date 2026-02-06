
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import StarRating from './StarRating';
import VerifiedBadge from './VerifiedBadge';

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;

interface QuickViewModalProps {
  item: Item;
  onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ item, onClose }) => {
  // --- HOOKS (MUST BE AT THE TOP) ---
  const { currency } = useTranslation();
  const { addItemToCart } = useCart();
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState(item ? item.imageUrls[0] : '');

  useEffect(() => {
    // Keep image in sync if item prop changes
    if (item) {
        setSelectedImage(item.imageUrls[0]);
    }
  }, [item]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // --- EARLY RETURN (AFTER HOOKS) ---
  if (!item) {
    return null;
  }

  // --- LOGIC & RENDER ---
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleAddToCart = () => {
    addItemToCart(item, 1);
    onClose();
  };

  const mainPrice = Number(item.salePrice ?? item.rentalPrice ?? 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in-up" onClick={handleBackdropClick}>
      <div ref={modalRef} className="relative bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white z-10 p-1 bg-white/50 dark:bg-dark-surface/50 rounded-full"><CloseIcon /></button>
        
        {/* Image Section */}
        <div className="w-full md:w-1/2 p-4 flex flex-col">
            <div className="aspect-square bg-gray-100 dark:bg-dark-background rounded-lg flex-grow">
                <img src={selectedImage} alt={item.title} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="flex space-x-2 mt-2 overflow-x-auto p-1">
                {item.imageUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setSelectedImage(url)} className={`w-16 h-16 rounded border-2 p-0.5 flex-shrink-0 ${selectedImage === url ? 'border-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}>
                        <img src={url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-sm" />
                    </button>
                ))}
            </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">{item.title}</h2>
            <div className="flex items-center gap-3 mt-2">
                <StarRating rating={item.avgRating} />
                <span className="text-sm text-gray-500 dark:text-gray-400">({item.reviews.length} reviews)</span>
                {item.isVerified && <VerifiedBadge type="item" />}
            </div>
            
            <p className="text-3xl font-extrabold my-4 text-gray-900 dark:text-dark-text">{currency.symbol}{mainPrice.toLocaleString()}</p>
            
            <div className="prose prose-sm text-gray-600 dark:text-gray-300 line-clamp-4 flex-grow">
                <p>{item.description}</p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                {(item.listingType === 'sale' || item.listingType === 'both') && item.stock > 0 && 
                    <button onClick={handleAddToCart} className="w-full py-3 px-4 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
                        <CartIcon /> Add to Cart
                    </button>
                }
                {(item.listingType === 'rent' || item.listingType === 'both') && 
                    <button className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        Rent Now
                    </button>
                }
            </div>

            <div className="mt-4 text-center">
                <Link to={`/item/${item.id}`} onClick={onClose} className="text-sm font-semibold text-primary hover:underline">
                    View Full Details &rarr;
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;