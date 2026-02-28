import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import ItemCard from '../../components/ItemCard';
import ReviewForm from '../../components/ReviewForm';
import Spinner from '../../components/Spinner';
import WishlistButton from '../../components/WishlistButton';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useTranslation } from '../../hooks/useTranslation';
import analyticsService from '../../services/analyticsService';
import { itemService } from '../../services/itemService';
import type { Item, Review } from '../../types';

type PolicyKey = 'description' | 'shipping' | 'returns' | 'warranty';
type ReviewSort = 'most-relevant' | 'newest' | 'oldest' | 'rating-high' | 'rating-low';

const Icon = ({ d, size = 20, stroke = 1.8 }: { d: string; size?: number; stroke?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const Star = ({ active = false, size = 14 }: { active?: boolean; size?: number }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: size, height: size, color: active ? '#0f172a' : '#cbd5e1' }}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" /></svg>
);

const formatDate = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getReviewTitle = (comment: string) => {
  const cleaned = (comment || '').trim();
  if (!cleaned) return 'Verified buyer review';
  const firstSentence = cleaned.split(/[.!?]/).map((part) => part.trim()).find(Boolean) || cleaned;
  return firstSentence.length > 72 ? `${firstSentence.slice(0, 72)}...` : firstSentence;
};

const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activePersona, openAuthModal } = useAuth();
  const { addItemToCart, cartCount } = useCart();
  const { showNotification } = useNotification();
  const { currency } = useTranslation();

  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isSubscribeSelected, setIsSubscribeSelected] = useState(false);
  const [bidAmount, setBidAmount] = useState<number | ''>('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyKey | null>(null);
  const [reviewSort, setReviewSort] = useState<ReviewSort>('most-relevant');
  const [appliedRatings, setAppliedRatings] = useState<number[]>([]);
  const [pendingRatings, setPendingRatings] = useState<number[]>([]);
  const [isReviewFilterOpen, setIsReviewFilterOpen] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});

  const viewStartRef = useRef<number | null>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const fetched = await itemService.getItemById(id);
        if (!fetched) {
          setItem(null);
          setError('This listing is not available right now.');
          return;
        }
        setItem(fetched);
        setCurrentMediaIndex(0);
        setIsSubscribeSelected(false);
        setQuantity(1);

        const variants = (fetched as any).variants;
        setSelectedColor(variants?.color?.[0]?.name || null);
        setSelectedSize(variants?.size?.[0]?.name || null);

        const { items: related } = await itemService.getItems({ category: fetched.category }, { page: 1, limit: 16 });
        setRelatedItems((related || []).filter((entry) => entry.id !== fetched.id));
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load item details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!item) return;
    viewStartRef.current = Date.now();
    return () => {
      const started = viewStartRef.current;
      if (!started || !item.owner?.id || (user?.id && user.id === item.owner.id)) return;
      const durationMs = Math.max(0, Date.now() - started);
      itemService.logItemEvent({ action: 'item_view', ownerId: item.owner.id, ownerPersonaId: item.ownerPersonaId || null, itemId: item.id, itemTitle: item.title, listingType: item.listingType, actorId: user?.id || null, actorPersonaId: activePersona?.id || null, actorName: user?.name || user?.email || 'Visitor', durationMs }).catch(() => {});
      if (item.ownerPersonaId) analyticsService.recordView(item.id, user?.id || `visitor_${Date.now()}`, user?.name || 'Visitor', durationMs, 'web', 'direct').catch(() => {});
    };
  }, [item, user?.id, user?.name, user?.email, activePersona?.id]);

  const media = useMemo(() => {
    if (!item) return [] as Array<{ type: 'image' | 'video'; url: string }>;
    const images = (item.imageUrls?.length ? item.imageUrls : item.images || []).filter(Boolean);
    const fallback = images.length ? images : [`https://picsum.photos/seed/${item.id}/1200/1500`];
    const imageMedia = fallback.map((url) => ({ type: 'image' as const, url }));
    return item.videoUrl ? [{ type: 'video' as const, url: item.videoUrl }, ...imageMedia] : imageMedia;
  }, [item]);

  useEffect(() => {
    if (media.length && currentMediaIndex >= media.length) setCurrentMediaIndex(0);
  }, [media.length, currentMediaIndex]);

  const variants = (item as any)?.variants || {};
  const colorVariants = Array.isArray(variants?.color) ? variants.color : [];
  const sizeVariants = Array.isArray(variants?.size) ? variants.size : [];
  const reviews: Review[] = item?.reviews || [];
  const rating = Number(item?.avgRating ?? 0);
  const ratingRounded = Math.min(5, Math.max(0, Math.round(rating)));
  const canPurchase = item?.listingType === 'sale' || item?.listingType === 'both';
  const canRent = item?.listingType === 'rent';
  const canBid = item?.listingType === 'auction' && !!item?.auctionDetails;
  const unitPrice = canRent ? Number(item?.rentalPrice ?? item?.price ?? 0) : Number(item?.salePrice ?? item?.price ?? 0);
  const subscribePrice = Number((unitPrice * 0.9).toFixed(2));
  const regularPrice = Number(item?.compareAtPrice ?? 0);
  const effectivePrice = isSubscribeSelected ? subscribePrice : unitPrice;
  const discountPct = regularPrice > unitPrice ? Math.round(((regularPrice - unitPrice) / regularPrice) * 100) : 0;
  const selectedMedia = media[currentMediaIndex];
  const sellerName = item?.owner?.businessName || item?.owner?.name || 'Seller';
  const sellerAvatar = item?.owner?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(sellerName)}`;
  const listingLabel = canRent ? 'Rental' : canBid ? 'Auction' : 'For Sale';
  const currencySymbol = currency?.symbol || '$';

  const ratingBreakdown = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const key = Math.min(5, Math.max(1, Math.round(review.rating)));
      map[key] += 1;
    });
    return map;
  }, [reviews]);
  const filteredSortedReviews = useMemo(() => {
    let list = [...reviews];
    if (appliedRatings.length > 0) list = list.filter((review) => appliedRatings.includes(Math.min(5, Math.max(1, Math.round(review.rating)))));
    switch (reviewSort) {
      case 'newest':
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'rating-high':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating-low':
        list.sort((a, b) => a.rating - b.rating);
        break;
      default:
        list.sort((a, b) => b.rating * 1000 + new Date(b.date).getTime() - (a.rating * 1000 + new Date(a.date).getTime()));
    }
    return list;
  }, [reviews, appliedRatings, reviewSort]);

  const updateQuantity = (next: number) => {
    if (!item) return;
    setQuantity(Math.max(1, Math.min(Math.max(1, item.stock || 1), next)));
  };
  const prevMedia = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);
  const nextMedia = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const handleAddToCart = () => {
    if (!item) return;
    addItemToCart(item, quantity);
    if (item.ownerPersonaId) analyticsService.recordCartAdd(item.id, user?.id || 'anonymous', user?.name || 'Visitor', quantity).catch(() => {});
    showNotification(cartCount + quantity > 1 ? `${item.title} added (${quantity})` : `${item.title} added to cart`);
  };
  const handleBuyNow = () => {
    if (!item) return;
    addItemToCart(item, quantity);
    navigate('/checkout');
  };
  const handleRentNow = () => {
    if (!item) return;
    if (!user) return openAuthModal('login');
    navigate('/checkout', { state: { item, type: 'rent' } });
  };
  const handleShare = async () => {
    if (!item) return;
    const url = `${window.location.origin}${window.location.pathname}#/item/${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: (item.description || '').slice(0, 120), url });
      else {
        await navigator.clipboard.writeText(url);
        showNotification('Item link copied to clipboard.');
      }
    } catch {
      return;
    }
  };
  const handleMessageSeller = () => {
    if (!item) return;
    if (!user) return openAuthModal('login');
    navigate(`/profile/messages?sellerId=${item.owner.id}&itemId=${item.id}`);
  };

  const handlePlaceBid = async () => {
    if (!item?.auctionDetails) return;
    if (!user) return openAuthModal('login');
    const current = item.auctionDetails.currentBid ?? item.auctionDetails.startingBid;
    const bid = Number(bidAmount);
    if (!Number.isFinite(bid) || bid <= current) return showNotification(`Bid must be higher than ${currencySymbol}${current.toFixed(2)}.`);
    setIsPlacingBid(true);
    try {
      const updated = await itemService.placeBid(item.id, bid, { id: user.id, name: user.name });
      setItem(updated);
      setBidAmount('');
      showNotification('Bid placed successfully.');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to place bid.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const scrollRelated = (dir: 'left' | 'right') => {
    if (!relatedScrollRef.current) return;
    const amount = relatedScrollRef.current.clientWidth * 0.88;
    relatedScrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const policyBody = (key: PolicyKey) => {
    if (key === 'description') return item.description || 'No description provided.';
    if (key === 'shipping') {
      if (!item.shippingEstimates?.length) return 'Shipping details will be confirmed at checkout.';
      return item.shippingEstimates.map((estimate, index) => (
        <div key={`shipping-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-900">{estimate.carrier || 'Standard shipping'}{estimate.serviceLevel ? ` - ${estimate.serviceLevel}` : ''}</p>
          <p className="text-slate-600">{estimate.minDays}-{estimate.maxDays} business days{typeof estimate.cost === 'number' ? ` - ${currencySymbol}${estimate.cost.toFixed(2)}` : ''}</p>
        </div>
      ));
    }
    if (key === 'returns') return item.returnPolicy ? `Return window: ${item.returnPolicy.windowDays} days.` : 'No return policy details provided.';
    return item.warranty ? item.warranty.coverage : 'No warranty information available.';
  };

  if (isLoading && !item) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-text-primary">
        <div className="w-full max-w-5xl grid gap-4 lg:grid-cols-[1fr_420px]"><div className="aspect-[4/5] rounded-3xl bg-slate-100 animate-pulse" /><div className="rounded-3xl border border-slate-200 p-6 space-y-3"><div className="h-4 w-36 rounded-full bg-slate-100 animate-pulse" /><div className="h-8 w-3/4 rounded-lg bg-slate-100 animate-pulse" /><div className="h-5 w-40 rounded-full bg-slate-100 animate-pulse" /><div className="h-12 rounded-full bg-slate-100 animate-pulse" /><div className="h-12 rounded-full bg-slate-100 animate-pulse" /></div></div>
        <div className="mt-6"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-text-primary"><div className="max-w-xl rounded-3xl border border-border bg-surface p-6 text-center"><h1 className="text-3xl font-bold">Item unavailable</h1><p className="mt-3 text-text-secondary">{error || 'This listing is not available right now.'}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => navigate('/browse')} className="h-11 rounded-full border border-border px-4 font-semibold">Browse items</button><button type="button" onClick={() => window.location.reload()} className="h-11 rounded-full bg-slate-900 px-4 font-semibold text-white dark:bg-primary">Retry</button></div></div></div>
    );
  }

  return (
    <div className="item-detail-shell bg-background text-text-primary" style={{ background: 'radial-gradient(1000px 640px at 92% -120px,#dcefff 0%,transparent 52%),radial-gradient(900px 620px at -80px 620px,#e8f5ff 0%,transparent 58%),var(--color-background)' }}>
      <div className="mx-auto max-w-[1480px] px-3 pb-28 pt-6 lg:px-5 lg:pb-14" data-testid="product-details-view">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="lg:sticky lg:top-5 lg:self-start lg:max-w-[860px]">
            <div className="grid gap-3 lg:grid-cols-[74px_minmax(0,1fr)]">
              {media.length > 1 ? <div className="flex gap-2 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:max-h-[78vh] lg:flex-col">{media.map((entry, idx) => <button key={`${entry.url}-${idx}`} type="button" onClick={() => setCurrentMediaIndex(idx)} className={`h-[74px] w-[74px] overflow-hidden rounded-xl border bg-white ${idx === currentMediaIndex ? 'border-slate-900 border-2' : 'border-slate-300'}`}>{entry.type === 'video' ? <video src={entry.url} muted playsInline className="h-full w-full object-cover" /> : <img src={entry.url} alt={`${item.title} ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />}</button>)}</div> : null}
              <div className="relative aspect-[5/6] max-h-[68vh] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_20px_52px_rgba(17,24,39,0.08)] sm:aspect-[4/5]">
                <AnimatePresence mode="wait"><motion.div key={`${selectedMedia?.url || 'fallback'}-${currentMediaIndex}`} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="absolute inset-0">{selectedMedia?.type === 'video' ? <video src={selectedMedia.url} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : <img src={selectedMedia?.url} alt={item.title} className="h-full w-full object-cover" loading="eager" />}</motion.div></AnimatePresence>
                <WishlistButton itemId={item.id} />
                {media.length > 1 ? <><button type="button" onClick={prevMedia} aria-label="Previous image" className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 grid place-items-center"><Icon d="M15 18l-6-6 6-6" size={18} stroke={2} /></button><button type="button" onClick={nextMedia} aria-label="Next image" className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 grid place-items-center"><Icon d="M9 6l6 6-6 6" size={18} stroke={2} /></button></> : null}
              </div>
            </div>
          </motion.section>
          <motion.aside initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.33, delay: 0.04 }} className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)] lg:overflow-auto">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><img src={sellerAvatar} alt={sellerName} className="h-9 w-9 rounded-full border border-slate-200 object-cover" /><button type="button" onClick={() => navigate(`/user/${item.owner.id}`)} className="text-left"><p className="truncate text-sm font-semibold">{sellerName}</p><p className="text-xs text-slate-500">Seller profile</p></button></div><span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-700">{listingLabel}</span></div>
            <h1 className="mt-2 text-[1.85rem] font-bold leading-[1.15] tracking-[-0.02em]">{item.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2"><div className="inline-flex gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={`star-top-${index}`} active={index < ratingRounded} size={13} />)}</div><span className="text-sm font-bold">{rating.toFixed(1)}</span><span className="text-sm text-slate-500">{reviews.length > 0 ? `${reviews.length} ratings` : 'No ratings yet'}</span></div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2" data-testid="product-card-price"><span className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]" data-testid="regularPrice">{currencySymbol}{effectivePrice.toFixed(2)}</span>{regularPrice > unitPrice ? <span className="text-base text-slate-400 line-through">{currencySymbol}{regularPrice.toFixed(2)}</span> : null}{discountPct > 0 ? <span className="text-xs font-bold text-rose-700">-{discountPct}%</span> : null}</div>

            {sizeVariants.length ? <div className="mt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Size {selectedSize ? `- ${selectedSize}` : ''}</p><div className="flex flex-wrap gap-2" data-testid="variant-picker-pill-Size">{sizeVariants.map((size: any, index: number) => { const value = size?.name || size?.value || `Size ${index + 1}`; const selected = selectedSize === value; return <button key={`${value}-${index}`} type="button" onClick={() => setSelectedSize(value)} className={`min-h-[38px] rounded-full px-3 text-sm font-semibold ${selected ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-900'}`}>{value}</button>; })}</div></div> : null}

            {colorVariants.length ? <div className="mt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Color {selectedColor ? `- ${selectedColor}` : ''}</p><div className="flex flex-wrap gap-2">{colorVariants.map((color: any, index: number) => { const name = color?.name || `Color ${index + 1}`; const selected = selectedColor === name; return <button key={`${name}-${index}`} type="button" onClick={() => setSelectedColor(name)} className={`h-8 w-8 rounded-full border p-0.5 ${selected ? 'border-2 border-slate-900' : 'border-slate-300'}`} title={name}><span className="block h-full w-full rounded-full" style={{ backgroundColor: color?.hex || '#0f172a', backgroundImage: color?.image ? `url(${color.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} /></button>; })}</div></div> : null}

            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-300 bg-white p-2.5" data-testid="QuantitySelector"><p className="text-sm font-semibold text-slate-700">Quantity</p><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300" data-testid="DecrementQuantity"><Icon d="M7 12h10" size={16} stroke={2} /></button><span data-testid="QuantityValue" className="min-w-[18px] text-center font-bold">{quantity}</span><button type="button" onClick={() => updateQuantity(quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300" data-testid="IncrementQuantity"><Icon d="M12 7v10M7 12h10" size={16} stroke={2} /></button></div></div>

            {canPurchase ? <div className="mt-3 grid gap-2"><button type="button" onClick={() => setIsSubscribeSelected(false)} className={`rounded-xl border p-3 text-left ${!isSubscribeSelected ? 'border-2 border-slate-900 bg-white' : 'border-slate-300 bg-white'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">One time purchase</p><p className="text-sm font-bold">{currencySymbol}{unitPrice.toFixed(2)}</p></div></button><button type="button" onClick={() => setIsSubscribeSelected(true)} className={`rounded-xl border p-3 text-left ${isSubscribeSelected ? 'border-2 border-slate-900 bg-white' : 'border-slate-300 bg-slate-50'}`}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">Subscribe and save</p><p className="text-xs text-slate-500">Monthly auto-delivery</p></div><div className="text-right"><span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">Save 10%</span><p className="mt-1 text-sm font-bold">{currencySymbol}{subscribePrice.toFixed(2)}</p></div></div></button></div> : null}

            {canBid ? <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Place your bid</p><div className="mt-2 flex gap-2"><input type="number" value={bidAmount} onChange={(event) => setBidAmount(Number(event.target.value))} placeholder="Enter amount" min="0" className="h-10 flex-1 rounded-full border border-slate-300 px-3" /><button type="button" onClick={handlePlaceBid} disabled={isPlacingBid} className="h-10 rounded-full bg-slate-900 px-4 font-bold text-white">{isPlacingBid ? '...' : 'Bid'}</button></div></div> : null}

            <div className="mt-3 grid grid-cols-2 gap-2" data-testid="pdp-actions">{canRent ? <button type="button" onClick={handleRentNow} className="col-span-2 h-12 rounded-full bg-slate-900 font-bold text-white">Rent now</button> : <><button type="button" onClick={handleBuyNow} data-testid="buy-now-btn" disabled={!canPurchase} className="h-12 rounded-full bg-slate-900 font-bold text-white">Buy now</button><button type="button" onClick={handleAddToCart} data-testid="add-to-cart-btn" disabled={!canPurchase} className="h-12 rounded-full border border-slate-300 bg-white font-bold text-slate-900">Add to cart</button></>}</div>
            <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={handleShare} className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><Icon d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M16 6l-4-4-4 4M12 2v14" size={15} stroke={2} />Share</button><button type="button" onClick={handleMessageSeller} className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><Icon d="M21 11.5a8.38 8.38 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5A8.5 8.5 0 0 1 12.5 3h.5A8.5 8.5 0 0 1 21 11.5z" size={15} stroke={2} />Message</button></div>
            <p className="mt-2 text-xs text-slate-500">{item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}</p>
            <div className="mt-3 grid gap-2"><button type="button" onClick={() => setActivePolicy('description')} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Description <Icon d="M9 6l6 6-6 6" size={15} stroke={2} /></button><button type="button" onClick={() => setActivePolicy('shipping')} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Shipping Policy <Icon d="M9 6l6 6-6 6" size={15} stroke={2} /></button><button type="button" onClick={() => setActivePolicy('returns')} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refund Policy <Icon d="M9 6l6 6-6 6" size={15} stroke={2} /></button><button type="button" onClick={() => setActivePolicy('warranty')} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Warranty <Icon d="M9 6l6 6-6 6" size={15} stroke={2} /></button></div>
          </motion.aside>
        </div>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.35 }} className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[1.8rem] font-bold tracking-[-0.02em]">Reviews</h2><div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2" data-testid="reviews-summary-card"><strong>{rating.toFixed(1)}</strong><div className="inline-flex gap-1" data-testid="review-stars">{Array.from({ length: 5 }).map((_, index) => <Star key={`summary-${index}`} active={index < ratingRounded} size={12} />)}</div><span className="text-xs text-slate-500">{reviews.length > 0 ? `${reviews.length} ratings` : 'No ratings yet'}</span></div></div>
          <div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Sort by<select value={reviewSort} onChange={(event) => setReviewSort(event.target.value as ReviewSort)} className="bg-transparent outline-none"><option value="most-relevant">Most relevant</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="rating-high">Rating: High to Low</option><option value="rating-low">Rating: Low to High</option></select></label><button type="button" onClick={() => { setPendingRatings(appliedRatings); setIsReviewFilterOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Rating filter{appliedRatings.length > 0 ? <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] text-white">{appliedRatings.length}</span> : null}</button></div>
          {filteredSortedReviews.length > 0 ? <div className="mt-3 grid gap-2 lg:grid-cols-2">{filteredSortedReviews.map((review) => <article key={review.id} data-testid="reviews-card" className="rounded-2xl border border-slate-200 bg-white p-3"><h3 className="text-[15px] font-bold">{getReviewTitle(review.comment)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="inline-flex gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={`${review.id}-${index}`} active={index < Math.round(review.rating)} size={12} />)}</div><span className="text-xs text-slate-500">{review.author.name} - {formatDate(review.date)}</span></div><div className="mt-2 flex justify-end"><button type="button" onClick={() => { setHelpfulVotes((prev) => ({ ...prev, [review.id]: (prev[review.id] || 0) + 1 })); showNotification('Thanks for your feedback.'); }} className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700">Helpful{helpfulVotes[review.id] ? <span>({helpfulVotes[review.id]})</span> : null}</button></div></article>)}</div> : <p className="mt-3 text-sm text-slate-500">No reviews match your filter.</p>}
          <div className="mt-4"><ReviewForm itemId={item.id} onReviewSubmit={(updated) => setItem(updated)} /></div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.35 }} className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[1.6rem] font-bold tracking-[-0.02em]">More from {sellerName}</h2>{relatedItems.length > 0 ? <div className="flex gap-2"><button type="button" onClick={() => scrollRelated('left')} className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3"><Icon d="M15 18l-6-6 6-6" size={16} stroke={2} /></button><button type="button" onClick={() => scrollRelated('right')} className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3"><Icon d="M9 6l6 6-6 6" size={16} stroke={2} /></button></div> : null}</div>
          {relatedItems.length > 0 ? <div ref={relatedScrollRef} className="mt-3 flex gap-3 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{relatedItems.slice(0, 14).map((entry) => <div key={entry.id} className="w-[250px] flex-shrink-0"><ItemCard item={entry} onQuickView={() => {}} /></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No related items found.</p>}
        </motion.section>
      </div>
      <div className="fixed bottom-2 left-2 right-2 z-[55] flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.18)] backdrop-blur lg:hidden"><div className="min-w-0 flex-1"><p className="m-0 text-sm font-extrabold">{currencySymbol}{effectivePrice.toFixed(2)}</p><p className="m-0 text-[11px] text-slate-500">{listingLabel}</p></div>{canRent ? <button type="button" onClick={handleRentNow} className="h-10 rounded-full bg-slate-900 px-4 text-sm font-bold text-white">Rent now</button> : <button type="button" onClick={handleAddToCart} disabled={!canPurchase} className="h-10 rounded-full bg-slate-900 px-4 text-sm font-bold text-white">Add to cart</button>}</div>

      <AnimatePresence>
        {activePolicy ? (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-slate-900/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActivePolicy(null)} />
            <motion.aside className="fixed inset-x-0 bottom-0 z-[81] max-h-[86vh] overflow-auto rounded-t-3xl border border-slate-200 bg-white p-4 lg:inset-y-0 lg:left-auto lg:w-[520px] lg:rounded-none lg:border-l" initial={{ y: 320, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 320, opacity: 0 }} transition={{ duration: 0.24 }}>
              <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-bold">{activePolicy === 'description' ? 'Description' : activePolicy === 'shipping' ? 'Shipping Policy' : activePolicy === 'returns' ? 'Refund Policy' : 'Warranty'}</h3><button type="button" onClick={() => setActivePolicy(null)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-300"><Icon d="M6 6l12 12M18 6L6 18" size={16} stroke={2} /></button></div>
              <div className="space-y-2 text-sm leading-7 text-slate-700">{policyBody(activePolicy)}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isReviewFilterOpen ? (
          <>
            <motion.div className="fixed inset-0 z-[82] bg-slate-900/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReviewFilterOpen(false)} />
            <motion.div className="fixed inset-x-0 bottom-0 z-[83] rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl" initial={{ y: 320, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 320, opacity: 0 }} transition={{ duration: 0.22 }}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Rating filter</h3><button type="button" onClick={() => setIsReviewFilterOpen(false)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300"><Icon d="M6 6l12 12M18 6L6 18" size={14} stroke={2} /></button></div>
              <div className="mt-2 grid gap-2">{[5, 4, 3, 2, 1].map((value) => { const selected = pendingRatings.includes(value); return <button key={value} type="button" onClick={() => setPendingRatings((prev) => (prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value].sort((a, b) => b - a)))} className={`flex h-11 items-center justify-between rounded-xl border px-3 ${selected ? 'border-slate-900 bg-slate-50' : 'border-slate-300 bg-white'}`}><span className="inline-flex items-center gap-2"><strong className="w-3 text-left">{value}</strong><span className="inline-flex gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={`${value}-${index}`} active={index < value} size={11} />)}</span></span><span className="inline-flex items-center gap-2"><span className="text-xs text-slate-500">{ratingBreakdown[value]}</span><span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>{selected ? <Icon d="M5 12l4 4 10-10" size={11} stroke={2.2} /> : null}</span></span></button>;})}</div>
              <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPendingRatings([])} className="h-10 rounded-full border border-slate-300 bg-white font-bold text-slate-700">Reset</button><button type="button" onClick={() => { setAppliedRatings([...pendingRatings].sort((a, b) => b - a)); setIsReviewFilterOpen(false); }} className="h-10 rounded-full bg-slate-900 font-bold text-white">Done</button></div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <style>{`
        .theme-obsidian .item-detail-shell,
        .theme-hydra .item-detail-shell,
        .theme-noir .item-detail-shell {
          background: radial-gradient(1200px 700px at 92% -120px, rgba(37, 99, 235, 0.16) 0%, transparent 52%),
            radial-gradient(1100px 680px at -100px 620px, rgba(6, 182, 212, 0.14) 0%, transparent 58%),
            var(--color-background) !important;
          color: var(--color-text-primary);
        }
        .theme-obsidian .item-detail-shell .bg-white,
        .theme-obsidian .item-detail-shell .bg-slate-50,
        .theme-obsidian .item-detail-shell .bg-slate-100,
        .theme-hydra .item-detail-shell .bg-white,
        .theme-hydra .item-detail-shell .bg-slate-50,
        .theme-hydra .item-detail-shell .bg-slate-100,
        .theme-noir .item-detail-shell .bg-white,
        .theme-noir .item-detail-shell .bg-slate-50,
        .theme-noir .item-detail-shell .bg-slate-100 {
          background-color: rgba(14, 18, 28, 0.88) !important;
          color: var(--color-text-primary) !important;
        }
        .theme-obsidian .item-detail-shell .border-slate-200,
        .theme-obsidian .item-detail-shell .border-slate-300,
        .theme-hydra .item-detail-shell .border-slate-200,
        .theme-hydra .item-detail-shell .border-slate-300,
        .theme-noir .item-detail-shell .border-slate-200,
        .theme-noir .item-detail-shell .border-slate-300 {
          border-color: rgba(148, 163, 184, 0.28) !important;
        }
        .theme-obsidian .item-detail-shell .text-slate-900,
        .theme-obsidian .item-detail-shell .text-slate-800,
        .theme-hydra .item-detail-shell .text-slate-900,
        .theme-hydra .item-detail-shell .text-slate-800,
        .theme-noir .item-detail-shell .text-slate-900,
        .theme-noir .item-detail-shell .text-slate-800 {
          color: var(--color-text-primary) !important;
        }
        .theme-obsidian .item-detail-shell .text-slate-700,
        .theme-obsidian .item-detail-shell .text-slate-600,
        .theme-obsidian .item-detail-shell .text-slate-500,
        .theme-hydra .item-detail-shell .text-slate-700,
        .theme-hydra .item-detail-shell .text-slate-600,
        .theme-hydra .item-detail-shell .text-slate-500,
        .theme-noir .item-detail-shell .text-slate-700,
        .theme-noir .item-detail-shell .text-slate-600,
        .theme-noir .item-detail-shell .text-slate-500 {
          color: rgba(226, 232, 240, 0.84) !important;
        }
        .theme-obsidian .item-detail-shell .bg-slate-900,
        .theme-hydra .item-detail-shell .bg-slate-900,
        .theme-noir .item-detail-shell .bg-slate-900 {
          background-color: var(--color-primary) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
};

export default ItemDetailPage;
