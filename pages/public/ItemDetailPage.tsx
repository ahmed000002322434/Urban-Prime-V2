import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { itemService } from '../../services/itemService';
import { spotlightService } from '../../services/spotlightService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';

// Gravity UI Components
import { useGravityMouse } from '../../hooks/useGravityMouse';
import GravityBackground from '../../components/gravity/GravityBackground';
import FloatingProductHero from '../../components/gravity/FloatingProductHero';
import GravityPurchasePanel from '../../components/gravity/GravityPurchasePanel';
import ProductSpecs from '../../components/gravity/ProductSpecs';
import SellerProfileCard from '../../components/gravity/SellerProfileCard';
import GravityReviews from '../../components/gravity/GravityReviews';
import DiscoverMoreProducts from '../../components/gravity/DiscoverMoreProducts';

import LiquidGlassItemDetail from '../../components/gravity/LiquidGlassItemDetail';

const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  // Data State
  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction State
  const [activeMode, setActiveMode] = useState<'buy' | 'bid' | 'rent'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [rentalDates, setRentalPeriod] = useState({ start: '', end: '' });
  const [isWishlisted, setIsWishlisted] = useState(false);
  const trackedSpotlightViewRef = useRef<string | null>(null);

  const attributionStorageKey = useMemo(() => (id ? `urbanprime:spotlight:attribution:${id}` : ''), [id]);
  const spotlightAttribution = useMemo(() => {
    if (!id) return null;

    const params = new URLSearchParams(location.search);
    const contentId = String(params.get('spotlight_content_id') || '').trim();
    const productLinkId = String(params.get('spotlight_product_link_id') || '').trim();
    const campaignKey = String(params.get('spotlight_campaign_key') || '').trim();
    const expiresAt = String(params.get('spotlight_attribution_expires_at') || '').trim();

    const isExpired = (value?: string | null) => {
      if (!value) return false;
      const expiryMs = Date.parse(value);
      return Number.isFinite(expiryMs) && expiryMs <= Date.now();
    };

    if (contentId && !isExpired(expiresAt)) {
      return {
        spotlightContentId: contentId,
        spotlightProductLinkId: productLinkId || null,
        campaignKey: campaignKey || null,
        expiresAt: expiresAt || null
      };
    }

    if (!attributionStorageKey || typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(attributionStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.spotlightContentId || isExpired(parsed?.expiresAt)) {
        window.localStorage.removeItem(attributionStorageKey);
        return null;
      }
      return {
        spotlightContentId: String(parsed.spotlightContentId),
        spotlightProductLinkId: parsed.spotlightProductLinkId ? String(parsed.spotlightProductLinkId) : null,
        campaignKey: parsed.campaignKey ? String(parsed.campaignKey) : null,
        expiresAt: parsed.expiresAt ? String(parsed.expiresAt) : null
      };
    } catch {
      return null;
    }
  }, [attributionStorageKey, id, location.search]);

  // Gravity System
  const { springX, springY, isMobile } = useGravityMouse({ stiffness: 40, damping: 22 });

  // Scroll-driven transforms (window-based – no target ref needed)
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 120], [0, 1]);
  const headerBackdrop = useTransform(scrollY, [0, 120], ['blur(0px)', 'blur(32px)']);

  useEffect(() => {
    if (!attributionStorageKey || !spotlightAttribution || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(attributionStorageKey, JSON.stringify(spotlightAttribution));
    } catch {
      // ignore attribution persistence failures
    }
  }, [attributionStorageKey, spotlightAttribution]);

  // --- Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const fetched = await itemService.getItemById(id);
        if (!fetched) {
          setError('Item not found.');
          return;
        }
        setItem(spotlightAttribution ? { ...fetched, spotlightAttribution } : fetched);
        setBidAmount(
          Math.ceil(
            (fetched.auctionDetails?.currentBid || fetched.auctionDetails?.startingBid || fetched.price || 0) + 1
          )
        );

        if (fetched.listingType === 'rent') setActiveMode('rent');
        else if (fetched.listingType === 'auction') setActiveMode('bid');
        else setActiveMode('buy');

        const { items: related } = await itemService.getItems(
          { category: fetched.category },
          { page: 1, limit: 4 }
        );
        setRelatedItems(related.filter((i) => i.id !== fetched.id));
      } catch (err) {
        console.error(err);
        setError('Unable to load item details.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, spotlightAttribution]);

  useEffect(() => {
    setItem((current) => {
      if (!current) return current;
      if (!spotlightAttribution) {
        if (!current.spotlightAttribution) return current;
        const next = { ...current };
        delete next.spotlightAttribution;
        return next;
      }
      return { ...current, spotlightAttribution };
    });
  }, [spotlightAttribution]);

  useEffect(() => {
    if (!item?.id || !spotlightAttribution?.spotlightContentId) return;
    const trackingKey = `${item.id}:${spotlightAttribution.spotlightContentId}:${spotlightAttribution.spotlightProductLinkId || 'none'}`;
    if (trackedSpotlightViewRef.current === trackingKey) return;
    trackedSpotlightViewRef.current = trackingKey;

    let cancelled = false;
    void spotlightService.trackProductEvent({
      content_id: spotlightAttribution.spotlightContentId,
      product_link_id: spotlightAttribution.spotlightProductLinkId || null,
      item_id: item.id,
      event_name: 'view_item',
      campaign_key: spotlightAttribution.campaignKey || null,
      viewer_firebase_uid: user?.id,
      metadata: {
        source: 'item_detail_page',
        path: location.pathname
      }
    }).catch(() => {
      if (!cancelled) {
        // quietly ignore tracking failures so commerce attribution never blocks the item page
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item?.id, location.pathname, spotlightAttribution, user?.id]);

  // --- Derived Data ---
  const galleryImages = useMemo(() => {
    if (!item) return [];
    const imgs = [...(item.imageUrls || []), ...(item.images || [])];
    return Array.from(new Set(imgs)).filter(Boolean);
  }, [item]);

  // --- Handlers ---
  const handleAddToCart = (checkout = false) => {
    if (!item) return;
    const rentalPeriod =
      activeMode === 'rent' ? { startDate: rentalDates.start, endDate: rentalDates.end } : undefined;
    if (activeMode === 'rent' && (!rentalDates.start || !rentalDates.end)) {
      alert('Please select rental dates');
      return;
    }
    addItemToCart(item, activeMode === 'buy' ? quantity : 1, undefined, rentalPeriod, activeMode === 'rent' ? 'rent' : 'sale');
    if (checkout) navigate('/checkout');
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbff] dark:bg-[#020205]">
        <GravityBackground springX={springX} springY={springY} />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <Spinner size="lg" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-50 animate-pulse">
            Loading Experience
          </p>
        </motion.div>
      </div>
    );
  }

  // --- Error State ---
  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbff] dark:bg-[#020205]">
        <GravityBackground springX={springX} springY={springY} />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 gravity-glass p-12 rounded-[48px] text-center max-w-md backdrop-blur-[40px] bg-white/20 dark:bg-black/20 border border-white/15"
        >
          <p className="text-xl font-black text-text-primary uppercase tracking-wider mb-4">Item Not Found</p>
          <p className="text-sm text-text-secondary mb-8">{error || 'The item you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/browse')}
            className="px-8 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Browse Products
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <LiquidGlassItemDetail 
      item={item} 
      relatedItems={relatedItems} 
      onAddToCart={handleAddToCart}
      quantity={quantity}
      setQuantity={setQuantity}
    />
  );
};

export default ItemDetailPage;
