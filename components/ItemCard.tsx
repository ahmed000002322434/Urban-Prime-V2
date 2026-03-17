
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Item } from '../types';
import { useAuth } from '../hooks/useAuth';
import StarRating from './StarRating';
import CategoryPill from './CategoryPill';
import WishlistButton from './WishlistButton';
import { useComparison } from '../hooks/useComparison';
import { useCart } from '../hooks/useCart';
import { useTranslatedItem, useTranslation } from '../hooks/useTranslation';
import LottieAnimation from './LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

const CompareIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.828L12 12m0 0l-3.182-3.182M12 12l3.182 3.182M12 12l-3.182 3.182M3.75 7.5h4.992V12m-4.993 0l3.182 3.182a8.25 8.25 0 0011.667 0l3.182-3.182m-13.5-2.828L12 12m0 0l3.182-3.182m0 0l3.182 3.182m0 0l3.182 3.182" /></svg>;
const EyeIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CartIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;

const ListingTypeBadge: React.FC<{ listingType: Item['listingType'] }> = ({ listingType }) => {
  const typeInfo = {
    sale: { text: 'Buy', className: 'bg-green-100 text-green-800' },
    rent: { text: 'Rent', className: 'bg-blue-100 text-blue-800' },
    auction: { text: 'Bid', className: 'bg-red-100 text-red-800' },
    both: { text: 'Buy/Rent', className: 'bg-purple-100 text-purple-800' },
  }[listingType];

  if (!typeInfo) return null;

  return (
    <div className={`absolute bottom-2 right-2 text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm ${typeInfo.className}`}>
      {typeInfo.text}
    </div>
  );
};

interface ItemCardProps {
  item: Item;
  onQuickView: (item: Item) => void;
  viewMode?: 'grid' | 'list';
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onQuickView, viewMode = 'grid' }) => {
  const { currency } = useTranslation();
  const { translatedItem, isLoadingTranslation } = useTranslatedItem(item);
  const { isComparing, toggleCompare } = useComparison();
  const { addItemToCart, cartCount } = useCart();
  const navigate = useNavigate();
  const [cartAnimationType, setCartAnimationType] = useState<'single' | 'multiple' | null>(null);
  const isAnimatingCart = cartAnimationType !== null;
  const cartAnimationClass = cartAnimationType === 'multiple' ? 'animate-add-to-cart-multi' : 'animate-add-to-cart-single';
  const cartAnimationSrc =
    cartAnimationType === 'multiple' ? uiLottieAnimations.addToCartMultiple : uiLottieAnimations.addToCartSingle;

  // State and refs for thinking bubble
  const [bubble, setBubble] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageUrl = item.imageUrls?.[0] || item.images?.[0] || `https://picsum.photos/seed/${item.id}/600/750`;
  const normalizedBrandSlug = item.brand
    ? String((item as any).brandSlug || item.brand)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    : '';
  const brandHref = normalizedBrandSlug ? `/brands/${normalizedBrandSlug}` : null;
  
  // Logic to determine display price
  let displayPrice = 0;
  let priceLabel = '';
  
  if (translatedItem.listingType === 'rent' || (translatedItem.listingType === 'both' && translatedItem.rentalRates)) {
      // Prioritize daily rate
      if (translatedItem.rentalRates?.daily) {
          displayPrice = translatedItem.rentalRates.daily;
          priceLabel = '/day';
      } else if (translatedItem.rentalRates?.hourly) {
          displayPrice = translatedItem.rentalRates.hourly;
          priceLabel = '/hr';
      } else if (translatedItem.rentalPrice) {
          displayPrice = translatedItem.rentalPrice;
          priceLabel = translatedItem.rentalPriceType ? ` / ${translatedItem.rentalPriceType}` : '';
      }
  } else if (translatedItem.listingType === 'auction') {
      displayPrice = translatedItem.auctionDetails?.currentBid || translatedItem.auctionDetails?.startingBid || translatedItem.salePrice || 0;
      priceLabel = ' (Bid)';
  } else {
      displayPrice = translatedItem.salePrice || 0;
  }
  
  const discountPercentage = translatedItem.compareAtPrice && translatedItem.salePrice ? Math.round(((translatedItem.compareAtPrice - translatedItem.salePrice) / translatedItem.compareAtPrice) * 100) : 0;

  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const displayDueDate = dueDate ? new Date(dueDate.valueOf() + dueDate.getTimezoneOffset() * 60 * 1000).toLocaleDateString() : null;

  const handleAddToCartClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (translatedItem.listingType === 'auction') {
        navigate(`/item/${item.id}`);
        return;
      }
      addItemToCart(item, 1);
      setCartAnimationType(cartCount + 1 > 1 ? 'multiple' : 'single');
      setTimeout(() => setCartAnimationType(null), 900);
  };
  
  const handleBuyNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (translatedItem.listingType === 'auction') {
      navigate(`/item/${item.id}`);
      return;
    }
    addItemToCart(item, 1);
    navigate('/checkout');
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(item);
  };

  const cancelHide = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimeoutRef.current = setTimeout(() => {
      setBubble(prev => ({ ...prev, visible: false }));
    }, 2000); // 2 seconds
  };

  const handleMouseEnterLower = (e: React.MouseEvent) => {
    cancelHide();
    if (bubble.visible) return;

    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Coordinates relative to the card's top-left corner
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    showTimeoutRef.current = setTimeout(() => {
      setBubble({ visible: true, x, y });
    }, 300); // 0.3 seconds
  };
  
  const handleMouseLeaveLower = () => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    scheduleHide();
  };

  const BubbleContent = () => (
    <div 
        className="thinking-bubble" 
        style={{ top: `${bubble.y}px`, left: `${bubble.x}px` }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
    >
        <div className="flex flex-col gap-2">
            <button onClick={handleAddToCartClick} className={`relative overflow-hidden w-full text-left px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold ${isAnimatingCart ? cartAnimationClass : ''}`}>
                <span className="relative z-10">Add to Cart</span>
                {isAnimatingCart && (
                  <span
                    className={`absolute inset-0 z-0 pointer-events-none ${cartAnimationType === 'multiple' ? 'opacity-95' : 'opacity-50 flex items-center justify-center'}`}
                  >
                    <LottieAnimation
                      src={cartAnimationSrc}
                      className={cartAnimationType === 'multiple' ? 'h-full w-full object-cover' : 'w-16 h-16 object-contain'}
                      autoplay
                      loop={false}
                      speed={1.2}
                    />
                  </span>
                )}
            </button>
            <button onClick={handleBuyNowClick} className="w-full text-left px-3 py-2 rounded-lg bg-surface-soft hover:bg-gray-200 text-sm font-bold text-text-primary">
                {translatedItem.listingType === 'rent' ? 'Rent Now' : translatedItem.listingType === 'auction' ? 'Bid Now' : 'Buy Now'}
            </button>
        </div>
    </div>
  );

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div ref={cardRef} className="relative group flex flex-col glass-panel glass-panel-hover h-full overflow-hidden">
        <Link to={`/item/${item.id}`} className="block">
          <div className="relative overflow-hidden aspect-[4/5] bg-gray-100/10">
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            {discountPercentage > 0 && <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">-{discountPercentage}%</div>}
            <WishlistButton itemId={item.id} className="text-white hover:text-red-500" />
             <div className="absolute bottom-2 left-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={handleCompareClick} className={`p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors ${isComparing(item.id) ? 'bg-primary text-white' : ''}`} aria-label="Compare">
                  <CompareIcon/>
                </button>
                <button onClick={() => onQuickView(item)} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors" aria-label="Quick view">
                  <EyeIcon />
                </button>
            </div>
            <ListingTypeBadge listingType={item.listingType} />
          </div>
        </Link>
        <div className="p-3 sm:p-4 flex flex-col flex-grow">
          <div className="flex-grow">
            {(item.brand || (item as any).brandCatalogPath) ? (
              <div className="mb-1 flex flex-wrap items-center gap-1">
                {item.brand ? (
                  brandHref ? (
                    <Link
                      to={brandHref}
                      onClick={(event) => event.stopPropagation()}
                      className="text-[10px] font-bold text-text-secondary uppercase tracking-widest inline-flex hover:text-primary"
                    >
                      {item.brand}
                    </Link>
                  ) : (
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{item.brand}</p>
                  )
                ) : null}
                {(item as any).brandCatalogPath ? (
                  <Link
                    to={brandHref ? `${brandHref}/${String((item as any).brandCatalogPath).replace(/^\/+|\/+$/g, '')}` : '#'}
                    onClick={(event) => {
                      if (!brandHref) event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="text-[10px] font-semibold text-text-secondary/80 inline-flex hover:text-primary"
                  >
                    {String((item as any).brandCatalogPath).replace(/\//g, ' / ')}
                  </Link>
                ) : null}
              </div>
            ) : null}
            <h3 className="font-bold text-[13px] sm:text-sm text-text-primary line-clamp-2 leading-snug font-display">
              {isLoadingTranslation ? (
                <div className="space-y-1.5">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              ) : (
                <Link to={`/item/${item.id}`} className="hover:text-primary transition-colors">{translatedItem.title}</Link>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2 mb-3">
            <StarRating rating={item.avgRating} size="sm" />
            <span className="text-[10px] text-text-secondary font-medium">({item.reviews.length})</span>
          </div>
          <div 
            className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 border-t pt-3 border-white/10"
            onMouseEnter={handleMouseEnterLower}
            onMouseLeave={handleMouseLeaveLower}
          >
            <div>
              {translatedItem.compareAtPrice && <p className="text-[10px] text-text-secondary/70 line-through font-medium">{currency.symbol}{translatedItem.compareAtPrice.toFixed(2)}</p>}
              <p className="font-extrabold text-base sm:text-lg text-text-primary tracking-tight">{currency.symbol}{displayPrice.toFixed(2)}<span className="text-[10px] font-normal text-text-secondary capitalize ml-0.5">{priceLabel}</span></p>
              {displayDueDate && <p className="text-[10px] font-bold text-red-500 mt-0.5">Due: {displayDueDate}</p>}
            </div>
            <button onClick={handleAddToCartClick} className={`relative overflow-hidden p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-colors shadow-md self-start sm:self-auto ${isAnimatingCart ? cartAnimationClass : ''}`} aria-label="Add to cart">
              <span className="relative z-10"><CartIcon /></span>
              {isAnimatingCart && (
                <span
                  className={`absolute inset-0 z-0 pointer-events-none ${cartAnimationType === 'multiple' ? 'opacity-95' : 'opacity-80 flex items-center justify-center'}`}
                >
                  <LottieAnimation
                    src={cartAnimationSrc}
                    className={cartAnimationType === 'multiple' ? 'h-full w-full object-cover scale-110' : 'w-12 h-12 object-contain'}
                    autoplay
                    loop={false}
                    speed={1.2}
                  />
                </span>
              )}
            </button>
          </div>
        </div>
        {bubble.visible && <BubbleContent />}
      </div>
    );
  }

  // List view
  return (
     <div ref={cardRef} className="glass-panel glass-panel-hover flex flex-col sm:flex-row gap-0 overflow-hidden relative">
      <div className="absolute top-2 right-2 z-10">
          <WishlistButton itemId={item.id} />
      </div>
      <Link to={`/item/${item.id}`} className="block flex-shrink-0 w-full sm:w-48 relative">
        <img src={imageUrl} alt={item.title} className="w-full h-full object-cover aspect-[4/3] sm:aspect-auto" />
        <ListingTypeBadge listingType={item.listingType} />
      </Link>
      <div className="flex-grow flex flex-col p-4 sm:p-5">
        {item.brand && <p className="text-xs font-bold text-text-secondary mb-1 uppercase tracking-widest">{item.brand}</p>}
        <h3 className="font-bold text-base sm:text-lg mb-2 text-text-primary font-display">
            {isLoadingTranslation ? (
              <div className="h-6 bg-surface-soft rounded animate-pulse w-3/4"></div>
            ) : (
              <Link to={`/item/${item.id}`} className="hover:text-primary transition-colors">{translatedItem.title}</Link>
            )}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2 flex-grow mb-4 leading-relaxed">
          {isLoadingTranslation ? (
            <div className="space-y-1.5">
              <div className="h-4 bg-surface-soft rounded animate-pulse w-full"></div>
              <div className="h-4 bg-surface-soft rounded animate-pulse w-5/6"></div>
            </div>
          ) : translatedItem.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10" 
             onMouseEnter={handleMouseEnterLower}
             onMouseLeave={handleMouseLeaveLower}
        >
            <div>
                 <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={item.avgRating} size="sm" />
                    <span className="text-xs text-text-secondary font-medium">({item.reviews.length})</span>
                </div>
                {translatedItem.compareAtPrice && <p className="text-xs text-text-secondary/70 line-through font-medium">{currency.symbol}{translatedItem.compareAtPrice.toFixed(2)}</p>}
                <p className="font-extrabold text-lg sm:text-xl text-text-primary tracking-tight">{currency.symbol}{displayPrice.toFixed(2)}<span className="text-sm font-normal text-text-secondary capitalize ml-1">{priceLabel}</span></p>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => onQuickView(item)} className="p-2.5 glass-button rounded-lg text-text-secondary transition-colors font-bold text-sm">
                    Quick View
                </button>
                <button onClick={handleAddToCartClick} className={`relative overflow-hidden px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:opacity-80 transition-colors shadow-md ${isAnimatingCart ? cartAnimationClass : ''}`}>
                    <span className="relative z-10">Add to Cart</span>
                    {isAnimatingCart && (
                      <span
                        className={`absolute inset-0 z-0 pointer-events-none ${cartAnimationType === 'multiple' ? 'opacity-95' : 'opacity-70 flex items-center justify-center'}`}
                      >
                        <LottieAnimation
                          src={cartAnimationSrc}
                          className={cartAnimationType === 'multiple' ? 'h-full w-full object-cover' : 'w-16 h-16 object-contain'}
                          autoplay
                          loop={false}
                          speed={1.2}
                        />
                      </span>
                    )}
                </button>
            </div>
        </div>
      </div>
      {bubble.visible && <BubbleContent />}
    </div>
  );
};

export default ItemCard;

