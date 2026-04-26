import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { itemService } from '../../services/itemService';
import commerceService from '../../services/commerceService';
import { spotlightService } from '../../services/spotlightService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import type { AuctionSnapshot, Item, PodVariantOption, RentalDeliveryMode, RentalQuote } from '../../types';
import { CommerceDetailPageSkeleton } from '../../components/commerce/CommerceSkeleton';
import LiquidGlassItemDetail from '../../components/gravity/LiquidGlassItemDetail';

const ItemDetailPage: React.FC = () => {
  const { id, itemId } = useParams<{ id?: string; itemId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const resolvedItemId = id || itemId || '';

  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'buy' | 'bid' | 'rent'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [rentalDates, setRentalPeriod] = useState({ start: '', end: '' });
  const [deliveryMode, setDeliveryMode] = useState<RentalDeliveryMode>('shipping');
  const [rentalQuote, setRentalQuote] = useState<RentalQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [auction, setAuction] = useState<AuctionSnapshot | null>(null);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [selectedPodVariantId, setSelectedPodVariantId] = useState('');
  const trackedSpotlightViewRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const podVariantOptions = useMemo(
    () => (item?.podProfile?.variantOptions || []).filter((variant) => variant.isEnabled !== false),
    [item?.podProfile?.variantOptions]
  );

  const selectedPodVariant = useMemo(
    () => podVariantOptions.find((variant) => variant.id === selectedPodVariantId) || podVariantOptions[0] || null,
    [podVariantOptions, selectedPodVariantId]
  );

  const displayItem = useMemo<Item | null>(() => {
    if (!item) return null;
    if (!selectedPodVariant) return item;

    const variantPrice = Number(selectedPodVariant.salePrice || item.salePrice || item.price || 0);
    return {
      ...item,
      price: variantPrice,
      salePrice: variantPrice,
      compareAtPrice: selectedPodVariant.compareAtPrice || item.compareAtPrice,
      stock: typeof selectedPodVariant.stock === 'number' ? selectedPodVariant.stock : item.stock
    };
  }, [item, selectedPodVariant]);

  const attributionStorageKey = useMemo(
    () => (resolvedItemId ? `urbanprime:spotlight:attribution:${resolvedItemId}` : ''),
    [resolvedItemId]
  );
  const spotlightAttribution = useMemo(() => {
    if (!resolvedItemId) return null;

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
  }, [attributionStorageKey, location.search, resolvedItemId]);

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
      if (!resolvedItemId) return;
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const fetched = await itemService.getItemById(resolvedItemId);
        if (requestId !== loadRequestIdRef.current) return;
        if (!fetched) {
          setError('Item not found.');
          return;
        }

        setItem(spotlightAttribution ? { ...fetched, spotlightAttribution } : fetched);
        setBidAmount(Math.ceil((fetched.auctionDetails?.currentBid || fetched.auctionDetails?.startingBid || fetched.price || 0) + 1));
        setDeliveryMode(fetched.rentalFulfillment?.defaultMode || 'shipping');

        if (fetched.listingType === 'rent') setActiveMode('rent');
        else if (fetched.listingType === 'auction') setActiveMode('bid');
        else setActiveMode('buy');

        const { items: related } = await itemService.getItems({ category: fetched.category }, { page: 1, limit: 4 });
        if (requestId !== loadRequestIdRef.current) return;
        setRelatedItems(related.filter((relatedItem) => relatedItem.id !== fetched.id).slice(0, 4));

        if (fetched.listingType === 'auction' && commerceService.enabled()) {
          try {
            const snapshot = await commerceService.getAuctionSnapshot(fetched.id);
            if (requestId !== loadRequestIdRef.current) return;
            setAuction(snapshot);
            setBidAmount(Math.ceil((snapshot.currentBid || snapshot.startingBid || fetched.price || 0) + 1));
          } catch (auctionError) {
            console.warn('Auction snapshot load skipped:', auctionError);
            setAuction(null);
          }
        } else {
          setAuction(null);
        }
      } catch (err) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error(err);
        setError('Unable to load item details.');
      } finally {
        if (requestId === loadRequestIdRef.current) setLoading(false);
      }
    };

    loadData();
    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [resolvedItemId, spotlightAttribution]);

  useEffect(() => {
    const current = item;
    if (!current || !commerceService.enabled()) {
      setRentalQuote(null);
      return;
    }
    if (!(current.listingType === 'rent' || current.listingType === 'both')) {
      setRentalQuote(null);
      return;
    }
    if (!rentalDates.start || !rentalDates.end) {
      setRentalQuote(null);
      return;
    }

    let cancelled = false;
    const loadQuote = async () => {
      setQuoteLoading(true);
      try {
        const quote = await commerceService.quoteRental({
          itemId: current.id,
          rentalStart: rentalDates.start,
          rentalEnd: rentalDates.end,
          deliveryMode
        });
        if (!cancelled) setRentalQuote(quote);
      } catch (quoteError) {
        if (!cancelled) {
          console.warn('Rental quote failed:', quoteError);
          setRentalQuote(null);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [deliveryMode, item, rentalDates.end, rentalDates.start]);

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

  useEffect(() => {
    if (!podVariantOptions.length) {
      setSelectedPodVariantId('');
      return;
    }

    setSelectedPodVariantId((current) =>
      podVariantOptions.some((variant) => variant.id === current) ? current : podVariantOptions[0].id
    );
  }, [item?.id, podVariantOptions]);

  const handleAddToCart = (
    checkout = false,
    mode: 'sale' | 'rent' = activeMode === 'rent' ? 'rent' : 'sale',
    options?: { deliveryMode?: RentalDeliveryMode }
  ) => {
    if (!item) return;
    if (mode === 'sale' && item.podProfile && !selectedPodVariant) {
      showNotification('Choose a POD variant before continuing.');
      return;
    }

    const rentalPeriod = mode === 'rent' ? { startDate: rentalDates.start, endDate: rentalDates.end } : undefined;
    const availableStock = typeof selectedPodVariant?.stock === 'number' ? selectedPodVariant.stock : item.stock;
    if (mode === 'rent' && (!rentalDates.start || !rentalDates.end)) {
      showNotification('Please select rental dates.');
      return;
    }
    if (mode === 'rent' && new Date(rentalDates.end).getTime() < new Date(rentalDates.start).getTime()) {
      showNotification('Rental end date must be after the start date.');
      return;
    }
    if (mode === 'rent' && rentalQuote && !rentalQuote.available) {
      showNotification(rentalQuote.availabilityFeedback || 'Selected dates are no longer available.');
      return;
    }
    if (mode === 'sale' && quantity < 1) {
      showNotification('Please choose a valid quantity.');
      return;
    }
    if (mode === 'sale' && availableStock > 0 && quantity > availableStock) {
      showNotification(`Only ${availableStock} item(s) available.`);
      return;
    }

    const salePrice = Number(selectedPodVariant?.salePrice || auction?.buyNowPrice || item.buyNowPrice || item.salePrice || item.price || 0);
    const checkoutItem = {
      ...item,
      price: mode === 'rent'
        ? (rentalQuote?.dailyRate || item.rentalPrice || item.rentalRates?.daily || item.price || 0)
        : salePrice,
      salePrice: mode === 'rent' ? item.salePrice : salePrice,
      compareAtPrice: selectedPodVariant?.compareAtPrice || item.compareAtPrice,
      stock: typeof selectedPodVariant?.stock === 'number' ? selectedPodVariant.stock : item.stock,
      deliveryMode: options?.deliveryMode || deliveryMode,
      podSelection: selectedPodVariant
        ? {
            variantId: selectedPodVariant.id,
            color: selectedPodVariant.color,
            size: selectedPodVariant.size,
            unitPrice: salePrice,
            templateKey: item.podProfile?.templateKey || 'pod',
            templateName: item.category || item.brand || undefined,
            mockupImageUrl: item.imageUrls?.[0] || item.images?.[0] || undefined
          }
        : undefined
    };

    addItemToCart(checkoutItem as Item, mode === 'rent' ? 1 : quantity, undefined, rentalPeriod, mode);
    if (checkout) navigate('/checkout');
  };

  const handlePlaceBid = async () => {
    if (!item) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    setBidSubmitting(true);
    try {
      const updated = await itemService.placeBid(item.id, bidAmount, {
        id: user.id,
        name: user.name || 'Bidder'
      });
      setItem(updated);
      if (commerceService.enabled()) {
        try {
          const snapshot = await commerceService.getAuctionSnapshot(item.id);
          setAuction(snapshot);
          setBidAmount(Math.ceil((snapshot.currentBid || snapshot.startingBid || updated.price || 0) + 1));
        } catch {
          setAuction(null);
        }
      }
      showNotification('Bid submitted successfully.');
    } catch (bidError) {
      console.error(bidError);
      showNotification(bidError instanceof Error ? bidError.message : 'Unable to place bid.');
    } finally {
      setBidSubmitting(false);
    }
  };

  if (loading) {
    return <CommerceDetailPageSkeleton />;
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
      item={displayItem || item}
      relatedItems={relatedItems}
      activeMode={activeMode}
      setActiveMode={setActiveMode}
      quantity={quantity}
      setQuantity={setQuantity}
      bidAmount={bidAmount}
      setBidAmount={setBidAmount}
      rentalDates={rentalDates}
      setRentalPeriod={setRentalPeriod}
      deliveryMode={deliveryMode}
      setDeliveryMode={setDeliveryMode}
      rentalQuote={rentalQuote}
      rentalQuoteLoading={quoteLoading}
      auction={auction}
      bidSubmitting={bidSubmitting}
      podVariantOptions={podVariantOptions as PodVariantOption[]}
      selectedPodVariant={selectedPodVariant}
      onSelectPodVariant={setSelectedPodVariantId}
      onAddToCart={handleAddToCart}
      onPlaceBid={handlePlaceBid}
    />
  );
};

export default ItemDetailPage;
