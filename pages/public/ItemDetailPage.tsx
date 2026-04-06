import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { itemService } from '../../services/itemService';
import { spotlightService } from '../../services/spotlightService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import LiquidGlassItemDetail from '../../components/gravity/LiquidGlassItemDetail';

const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'buy' | 'bid' | 'rent'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [rentalDates, setRentalPeriod] = useState({ start: '', end: '' });
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

  useEffect(() => {
    if (!attributionStorageKey || !spotlightAttribution || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(attributionStorageKey, JSON.stringify(spotlightAttribution));
    } catch {
      // ignore persistence issues
    }
  }, [attributionStorageKey, spotlightAttribution]);

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
        setBidAmount(Math.ceil((fetched.auctionDetails?.currentBid || fetched.auctionDetails?.startingBid || fetched.price || 0) + 1));

        if (fetched.listingType === 'rent') setActiveMode('rent');
        else if (fetched.listingType === 'auction') setActiveMode('bid');
        else setActiveMode('buy');

        const { items: related } = await itemService.getItems({ category: fetched.category }, { page: 1, limit: 4 });
        setRelatedItems(related.filter((relatedItem) => relatedItem.id !== fetched.id));
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
        // keep commerce attribution non-blocking
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item?.id, location.pathname, spotlightAttribution, user?.id]);

  const handleAddToCart = (checkout = false, mode: 'sale' | 'rent' = activeMode === 'rent' ? 'rent' : 'sale') => {
    if (!item) return;

    const rentalPeriod = mode === 'rent' ? { startDate: rentalDates.start, endDate: rentalDates.end } : undefined;
    if (mode === 'rent' && (!rentalDates.start || !rentalDates.end)) {
      alert('Please select rental dates');
      return;
    }

    const checkoutItem = {
      ...item,
      price: mode === 'rent'
        ? (item.rentalPrice || item.rentalRates?.daily || item.price || 0)
        : (item.buyNowPrice || item.salePrice || item.price || 0)
    };

    addItemToCart(checkoutItem, mode === 'rent' ? 1 : quantity, undefined, rentalPeriod, mode);
    if (checkout) navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5">
          <Spinner size="lg" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-60">Loading experience</p>
        </motion.div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md rounded-[2rem] border border-white/10 bg-white/80 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/[0.06]"
        >
          <p className="text-xl font-black uppercase tracking-wider text-text-primary mb-3">Item not found</p>
          <p className="text-sm text-text-secondary mb-7">{error || 'The item you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/browse')}
            className="rounded-full bg-slate-950 px-8 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950"
          >
            Browse products
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <LiquidGlassItemDetail
      item={item}
      relatedItems={relatedItems}
      activeMode={activeMode}
      setActiveMode={setActiveMode}
      quantity={quantity}
      setQuantity={setQuantity}
      bidAmount={bidAmount}
      setBidAmount={setBidAmount}
      rentalDates={rentalDates}
      setRentalPeriod={setRentalPeriod}
      onAddToCart={handleAddToCart}
    />
  );
};

export default ItemDetailPage;
