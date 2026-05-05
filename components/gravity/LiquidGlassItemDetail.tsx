import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuctionSnapshot, Item, PodVariantOption, RentalDeliveryMode, RentalQuote } from '../../types';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

type PurchaseMode = 'buy' | 'bid' | 'rent';
type CheckoutMode = 'sale' | 'rent';

interface LiquidGlassItemDetailProps {
  item: Item;
  relatedItems: Item[];
  activeMode: PurchaseMode;
  setActiveMode: (mode: PurchaseMode) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  bidAmount: number;
  setBidAmount: (amount: number) => void;
  rentalDates: { start: string; end: string };
  setRentalPeriod: (period: { start: string; end: string }) => void;
  deliveryMode: RentalDeliveryMode;
  setDeliveryMode: (mode: RentalDeliveryMode) => void;
  rentalQuote: RentalQuote | null;
  rentalQuoteLoading: boolean;
  auction: AuctionSnapshot | null;
  bidSubmitting: boolean;
  podVariantOptions?: PodVariantOption[];
  selectedPodVariant?: PodVariantOption | null;
  onSelectPodVariant?: (variantId: string) => void;
  onAddToCart: (
    checkout?: boolean,
    mode?: CheckoutMode,
    options?: { deliveryMode?: RentalDeliveryMode }
  ) => void;
  onPlaceBid: () => Promise<void>;
}

const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);

const titleCase = (value?: string | null) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const uniq = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));

const imagesFor = (item: Item) => Array.from(new Set([...(item.imageUrls || []), ...(item.images || [])].filter(Boolean)));
const isDigital = (item: Item) => item.productType === 'digital' || item.itemType === 'digital' || Boolean(item.digitalFileUrl);
const isAuction = (item: Item) => item.listingType === 'auction';
const isRental = (item: Item) => item.listingType === 'rent' || item.listingType === 'both';
const isSale = (item: Item) => item.listingType === 'sale' || item.listingType === 'both';

const rentalDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
};

const auctionCountdown = (value?: string | null) => {
  if (!value) return 'Awaiting close time';
  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return 'Auction ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(minutes, 1)}m left`;
};

const historyName = (entry: any) =>
  String(entry?.bidderDisplayName || entry?.userName || entry?.bidderId || entry?.userId || 'Bidder');

const historyPlacedAt = (entry: any) => String(entry?.placedAt || entry?.placed_at || '');

const LiquidGlassItemDetail: React.FC<LiquidGlassItemDetailProps> = ({
  item,
  relatedItems,
  activeMode,
  setActiveMode,
  quantity,
  setQuantity,
  bidAmount,
  setBidAmount,
  rentalDates,
  setRentalPeriod,
  deliveryMode,
  setDeliveryMode,
  rentalQuote,
  rentalQuoteLoading,
  auction,
  bidSubmitting,
  podVariantOptions = [],
  selectedPodVariant = null,
  onSelectPodVariant,
  onAddToCart,
  onPlaceBid
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showMobilePill, setShowMobilePill] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setShowMobilePill(window.scrollY > 340);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const images = useMemo(() => {
    const list = imagesFor(item);
    return list.length > 0 ? list : [`https://picsum.photos/seed/${item.id}/1200/1400`];
  }, [item]);

  const auctionHistory = auction?.history || item.auctionDetails?.bids || [];
  const auctionCurrentBid =
    auction?.currentBid || item.auctionDetails?.currentBid || item.auctionDetails?.startingBid || item.price || 0;
  const minNextBid = Math.ceil(auctionCurrentBid + 1);
  const compareAt = activeMode === 'buy' ? item.compareAtPrice : undefined;
  const savePercent = compareAt && compareAt > (item.buyNowPrice || item.salePrice || item.price || 0)
    ? Math.round(((compareAt - (item.buyNowPrice || item.salePrice || item.price || 0)) / compareAt) * 100)
    : 0;
  const stayDays = rentalQuote?.rentalDays || rentalDays(rentalDates.start, rentalDates.end);
  const rentalUnitPrice = rentalQuote?.dailyRate || item.rentalRates?.daily || item.rentalPrice || item.price || 0;
  const rentalTotal = rentalQuote?.totalDueNow || stayDays * rentalUnitPrice + (rentalQuote?.securityDeposit || 0);
  const currentPrice =
    activeMode === 'rent'
      ? rentalUnitPrice
      : activeMode === 'bid'
        ? auctionCurrentBid
        : item.buyNowPrice || item.salePrice || item.price || 0;
  const digital = isDigital(item);
  const pod = item.productType === 'pod' || item.fulfillmentType === 'pod' || Boolean(item.podProfile);
  const podTurnaroundDays = Number(item.podProfile?.turnaroundDays || item.processingTimeDays || 4);
  const lowStock = item.stock > 0 && item.stock <= 5;
  const canBuy = item.stock > 0 || digital;
  const canBuyAuctionNow = Boolean(auction?.canBuyNow || item.buyNowPrice);
  const canPickup = item.rentalFulfillment ? item.rentalFulfillment.pickup !== false : true;
  const canShip = item.rentalFulfillment ? item.rentalFulfillment.shipping !== false : true;

  const shippingSummary = (item.shippingEstimates || [])
    .map((estimate: any) => {
      const min = Number(estimate?.minDays || 0);
      const max = Number(estimate?.maxDays || 0);
      const carrier = String(estimate?.carrier || '').trim();
      return `${carrier ? `${carrier} ` : ''}${min && max ? `${min}-${max} days` : min ? `${min}+ days` : ''}`.trim();
    })
    .filter(Boolean)[0];

  const deliveryText = digital
    ? 'Delivered instantly after checkout'
    : pod
      ? `Made to order. Seller target turnaround ${podTurnaroundDays} day${podTurnaroundDays === 1 ? '' : 's'}.`
      : shippingSummary || (item.whoPaysShipping === 'seller' ? 'Ships in 1-3 business days' : 'Shipping calculated at checkout');
  const returnText = digital
    ? item.licenseType || 'Digital license included'
    : pod
      ? 'Made-to-order POD policy applies'
    : item.returnPolicy?.windowDays
      ? `${item.returnPolicy.windowDays}-day returns`
      : 'Return policy available';
  const stockText = item.stock > 0 ? (lowStock ? `Only ${item.stock} left` : `${item.stock} in stock`) : 'Sold out';

  const benefits = uniq([
    item.isVerified ? 'Verified marketplace seller' : '',
    deliveryText,
    returnText,
    item.affiliateEligibility?.enabled ? 'Creator commission enabled' : '',
    ...(item.certifications || []).slice(0, 2),
    ...(item.features || []).slice(0, 4)
  ]).slice(0, 6);

  const activeImage = selectedImage || images[0];
  const shortDescription = item.description || 'Seller description coming soon.';
  const visibleDescription = expanded ? shortDescription : shortDescription.slice(0, 280);

  const handlePrimaryAction = () => {
    if (activeMode === 'bid') {
      if (typeof document !== 'undefined') {
        const offerPanel = document.getElementById('auction-offer-panel');
        offerPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = offerPanel?.querySelector('input[type="number"]');
        if (input instanceof HTMLInputElement) {
          window.setTimeout(() => input.focus(), 180);
        }
      }
      return;
    }
    onAddToCart(false, activeMode === 'rent' ? 'rent' : 'sale', { deliveryMode });
  };

  const handleBuyNow = () => {
    if (activeMode === 'bid' && !canBuyAuctionNow) return;
    onAddToCart(true, activeMode === 'rent' ? 'rent' : 'sale', { deliveryMode });
  };

  const modeButtons = [
    { id: 'buy' as const, label: digital ? 'Instant access' : 'Buy', show: isSale(item) || digital },
    { id: 'rent' as const, label: 'Rent', show: isRental(item) },
    { id: 'bid' as const, label: 'Bid', show: isAuction(item) }
  ].filter((mode) => mode.show);

  const attributeRows = [
    ['Category', titleCase(item.category) || 'General'],
    ['Brand', item.brand || 'Urban Prime'],
    ['Condition', titleCase(item.condition) || 'New'],
    ['SKU', item.sku || 'Not listed'],
    ['Fulfillment', titleCase(item.fulfillmentType || 'in_house')],
    ['Shipping', item.whoPaysShipping === 'seller' ? 'Seller pays shipping' : 'Buyer pays shipping'],
    ['Origin', [item.originCity, item.originCountry].filter(Boolean).join(', ') || 'Not specified'],
    ['Weight', item.weightLbs ? `${item.weightLbs} lb` : 'Not specified']
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-text-primary">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.26),transparent_38%),radial-gradient(circle_at_76%_12%,rgba(148,163,184,0.2),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col gap-10 px-4 pb-20 pt-16 sm:px-6 lg:px-10 lg:pt-20">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
          <span>{item.brand || titleCase(item.category) || 'Urban Prime'}</span>
          <span>/</span>
          <span>{digital ? 'Digital product' : titleCase(item.productType || item.itemType || 'Physical product')}</span>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="order-2 space-y-5 lg:order-1">
            <div className="glass-panel p-5 sm:p-6">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
                    {titleCase(item.listingType)}
                  </span>
                  {item.isVerified ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                      Verified
                    </span>
                  ) : null}
                  {savePercent > 0 ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                      Save {savePercent}%
                    </span>
                  ) : null}
                </div>
                <img
                  src={activeImage}
                  alt={item.title}
                  loading="eager"
                  className="aspect-[4/4.2] w-full object-contain px-8 py-8"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`h-20 w-20 overflow-hidden rounded-2xl border ${image === activeImage ? 'border-primary/60' : 'border-white/15'}`}
                  >
                    <img src={image} alt={`${item.title} ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-text-secondary">Key benefits</p>
                  <p className="mt-1 text-lg font-bold text-text-primary">What you get with this listing</p>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
                  {stockText}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {activeMode === 'bid' ? (
              <div className="glass-panel p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-secondary">Bid history</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-text-primary">Live auction activity</h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">
                    {auction?.reserveMet ? 'Reserve met' : 'Reserve active'}
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {auctionHistory.length > 0 ? auctionHistory.slice(0, 6).map((entry: any) => (
                    <div key={entry.id || `${historyPlacedAt(entry)}-${historyName(entry)}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-text-primary">{historyName(entry)}</p>
                        <p className="text-xs text-text-secondary">{historyPlacedAt(entry) ? new Date(historyPlacedAt(entry)).toLocaleString() : 'Just now'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-text-primary">{money(Number(entry.amount || 0))}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">{String(entry.status || 'placed')}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-text-secondary">
                      No bids yet. Open the bid panel to place the first public offer.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="order-1 space-y-5 lg:order-2 lg:sticky lg:top-24">
            <div className="glass-panel p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-secondary">{item.brand || titleCase(item.category) || 'Urban Prime Select'}</p>
              <h1 className="mt-2 text-[1.8rem] font-bold leading-[1.05] tracking-[-0.02em] text-text-primary sm:text-[2.2rem]">
                {item.title}
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                <span className="rounded-full bg-amber-500/15 px-2 py-1 font-bold text-amber-600 dark:text-amber-300">{(item.avgRating || 0).toFixed(1)}</span>
                <span>{item.reviews?.length || 0} reviews</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 font-semibold uppercase tracking-[0.14em]">
                  {item.isVerified ? 'Trusted seller' : 'Profile available'}
                </span>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex flex-wrap items-end gap-3">
                  <p className="text-[2rem] font-bold tracking-[-0.04em] text-text-primary sm:text-[2.35rem]">{money(currentPrice)}</p>
                  {activeMode === 'rent' ? <span className="pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">per day</span> : null}
                  {compareAt && compareAt > currentPrice ? <span className="pb-1 text-sm text-text-secondary line-through">{money(compareAt)}</span> : null}
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {activeMode === 'bid'
                    ? `Current bid ${money(auctionCurrentBid)}. ${auctionCountdown(auction?.endTime || item.auctionDetails?.endTime)}.`
                    : activeMode === 'rent'
                      ? `${money(rentalUnitPrice)} per day${item.minRentalDuration ? ` with a minimum ${item.minRentalDuration}-hour listing rule.` : '.'}`
                      : digital
                        ? 'Instant digital fulfillment with secure checkout.'
                        : deliveryText}
                </p>
              </div>

              {modeButtons.length > 1 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {modeButtons.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setActiveMode(mode.id)}
                      className={`h-10 rounded-full px-4 text-xs font-bold uppercase tracking-[0.2em] transition ${activeMode === mode.id ? 'bg-primary text-primary-text' : 'border border-white/15 text-text-primary hover:bg-white/10'}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {activeMode === 'buy' ? (
                  <div className="space-y-3">
                    {pod && podVariantOptions.length ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Variant</p>
                            <p className="mt-1 text-sm font-bold text-text-primary">
                              {selectedPodVariant
                                ? [selectedPodVariant.color, selectedPodVariant.size].filter(Boolean).join(' / ')
                                : 'Choose a POD variant'}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/15 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary dark:bg-white/5">
                            {podTurnaroundDays} day turnaround
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {podVariantOptions.map((variant) => {
                            const active = selectedPodVariant?.id === variant.id;
                            const label = [variant.color, variant.size].filter(Boolean).join(' / ');
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => onSelectPodVariant?.(variant.id)}
                                className={`rounded-2xl border px-4 py-3 text-left transition ${
                                  active
                                    ? 'border-primary/50 bg-primary/10 text-primary'
                                    : 'border-white/10 bg-black/10 text-text-primary hover:border-white/25 dark:bg-white/5'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-bold">{label}</span>
                                  <span className="text-xs font-black uppercase tracking-[0.16em]">
                                    {money(Number(variant.salePrice || currentPrice))}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                                  SKU {variant.sku || variant.id}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8 rounded-full border border-white/15 text-text-primary">-</button>
                        <span className="w-6 text-center text-sm font-bold text-text-primary">{quantity}</span>
                        <button type="button" onClick={() => setQuantity(quantity + 1)} className="h-8 w-8 rounded-full border border-white/15 text-text-primary">+</button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeMode === 'rent' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Start</span>
                        <input type="date" value={rentalDates.start} onChange={(event) => setRentalPeriod({ ...rentalDates, start: event.target.value })} className="mt-2 w-full bg-transparent text-xs font-bold text-text-primary" />
                      </label>
                      <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">End</span>
                        <input type="date" value={rentalDates.end} onChange={(event) => setRentalPeriod({ ...rentalDates, end: event.target.value })} className="mt-2 w-full bg-transparent text-xs font-bold text-text-primary" />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {canPickup ? (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('pickup')}
                          className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${deliveryMode === 'pickup' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-text-primary'}`}
                        >
                          Pickup
                        </button>
                      ) : null}
                      {canShip ? (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('shipping')}
                          className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${deliveryMode === 'shipping' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-text-primary'}`}
                        >
                          Shipping
                        </button>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Quote status</p>
                          <p className="mt-1 text-sm font-bold text-text-primary">
                            {rentalQuoteLoading
                              ? 'Checking availability'
                              : rentalQuote
                                ? rentalQuote.available
                                  ? 'Dates available'
                                  : 'Dates blocked'
                                : 'Select dates to quote'}
                          </p>
                        </div>
                        {rentalQuote ? (
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${rentalQuote.available ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-300'}`}>
                            {rentalQuote.available ? 'Available' : 'Unavailable'}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Rental</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(rentalQuote?.subtotal || stayDays * rentalUnitPrice)}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Deposit</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(rentalQuote?.securityDeposit || item.securityDeposit || 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Due now</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(rentalTotal)}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-text-secondary">
                        {rentalQuote?.availabilityFeedback || 'We revalidate blackouts and active bookings before checkout.'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {activeMode === 'bid' ? (
                  <div className="space-y-3">
                    <div id="auction-offer-panel" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Auction status</p>
                          <p className="mt-2 text-base font-black text-text-primary">{auction?.status ? titleCase(auction.status) : 'Live'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Minimum next bid</p>
                          <p className="mt-2 text-lg font-black text-text-primary">{money(minNextBid)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Current</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(auctionCurrentBid)}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Bid count</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{auction?.bidCount || item.auctionDetails?.bidCount || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Buy now</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{canBuyAuctionNow ? money(auction?.buyNowPrice || item.buyNowPrice || 0) : 'Disabled'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Place a public bid</p>
                          <p className="mt-2 text-sm text-text-secondary">
                            Seller counters and winner checkout windows stay inside the auction workflow.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">
                          {auctionCountdown(auction?.endTime || item.auctionDetails?.endTime)}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 dark:bg-white/5">
                        <span className="text-2xl font-black text-text-primary">$</span>
                        <input
                          type="number"
                          min={minNextBid}
                          value={bidAmount}
                          onChange={(event) => setBidAmount(Number(event.target.value))}
                          className="w-full bg-transparent text-3xl font-black text-text-primary outline-none"
                        />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Minimum next bid</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(minNextBid)}</p>
                        </div>
                        <div className="rounded-2xl bg-black/10 p-3 dark:bg-white/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">Current bid</p>
                          <p className="mt-2 text-sm font-black text-text-primary">{money(auctionCurrentBid)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onPlaceBid()}
                        disabled={bidSubmitting || bidAmount < minNextBid}
                        className="mt-5 h-12 w-full rounded-full bg-primary text-xs font-black uppercase tracking-[0.22em] text-primary-text disabled:opacity-45"
                      >
                        {bidSubmitting ? 'Submitting...' : 'Submit bid'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={activeMode === 'rent' && Boolean(rentalQuote) && !rentalQuote.available}
                  className="h-12 rounded-full bg-primary text-xs font-black uppercase tracking-[0.2em] text-primary-text disabled:opacity-50"
                >
                  {activeMode === 'bid' ? 'Review bid' : activeMode === 'rent' ? 'Add rental to cart' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={activeMode === 'bid' ? !canBuyAuctionNow : !canBuy && activeMode !== 'rent'}
                  className="h-12 rounded-full border border-white/20 text-xs font-black uppercase tracking-[0.2em] text-text-primary disabled:opacity-40"
                >
                  {activeMode === 'rent' ? `Reserve now - ${money(rentalTotal)}` : activeMode === 'bid' ? `Buy now${canBuyAuctionNow ? ` - ${money(auction?.buyNowPrice || item.buyNowPrice || 0)}` : ''}` : 'Buy now'}
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-text-secondary">
                <p className="font-bold text-text-primary">Delivery and policy</p>
                <p className="mt-2">{deliveryText}</p>
                <p className="mt-1">{returnText}</p>
                {activeMode === 'bid' ? <p className="mt-2">{auctionCountdown(auction?.endTime || item.auctionDetails?.endTime)}</p> : null}
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-text-secondary">Secure checkout powered by Urban Prime</p>
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-secondary">Listing details</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-text-primary">Everything the seller configured</h2>
              <p className="mt-4 text-sm leading-7 text-text-secondary">
                {visibleDescription}
                {shortDescription.length > 280 ? (
                  <button onClick={() => setExpanded((value) => !value)} className="ml-2 font-black uppercase tracking-[0.18em] text-primary">
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                ) : null}
              </p>
              <div className="mt-5 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5 px-4">
                {attributeRows.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">{label}</span>
                    <span className="text-right text-sm font-semibold text-text-primary">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-secondary">Seller</p>
              <h3 className="mt-2 text-lg font-bold text-text-primary">{item.owner?.businessName || item.owner?.name || 'Urban Prime seller'}</h3>
              <p className="mt-2 text-sm text-text-secondary">{item.isVerified ? 'Verified seller on Urban Prime with clear catalog and fulfillment details.' : 'Seller profile available with shipping, policy, and fulfillment details before checkout.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={buildPublicProfilePath(item.owner)} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-xs font-black uppercase tracking-[0.2em] text-primary-text">View profile</Link>
                <Link to="/messages" className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-xs font-black uppercase tracking-[0.2em] text-text-primary">Message seller</Link>
              </div>
            </div>
          </div>
        </section>

        {relatedItems.length > 0 ? (
          <section className="glass-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-secondary">More like this</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-text-primary">Continue browsing nearby picks</h2>
              </div>
              <Link to="/browse" className="text-xs font-black uppercase tracking-[0.2em] text-primary">View catalog</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedItems.slice(0, 4).map((related, index) => (
                <Link key={related.id} to={`/item/${related.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1">
                  <div className="aspect-[4/5] overflow-hidden rounded-xl">
                    <img
                      src={related.imageUrls?.[0] || related.images?.[0] || `https://picsum.photos/seed/${index + 50}/600/750`}
                      alt={related.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="line-clamp-2 text-sm font-bold text-text-primary">{related.title}</p>
                    <p className="text-sm text-text-secondary">{money(related.buyNowPrice || related.salePrice || related.rentalPrice || related.auctionDetails?.currentBid || related.price || 0)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showMobilePill ? (
        <div
          className="floating-pill glass-panel fixed left-1/2 z-[95] flex w-[calc(100vw-1rem)] max-w-[430px] -translate-x-1/2 items-center gap-3 rounded-full px-3 py-2 lg:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.8rem)' }}
        >
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="h-12 w-12 overflow-hidden rounded-full border border-white/20">
            <img src={images[0]} alt={item.title} className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text-primary">{item.title}</p>
            <p className="text-xs font-medium text-text-secondary">{money(currentPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrimaryAction} className="rounded-full bg-primary px-3 py-2 text-xs font-black uppercase tracking-wide text-primary-text">
              {activeMode === 'bid' ? 'Review' : activeMode === 'rent' ? 'Cart' : 'Add'}
            </button>
            <button type="button" onClick={handleBuyNow} disabled={activeMode === 'bid' ? !canBuyAuctionNow : !canBuy && activeMode !== 'rent'} className="rounded-full border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-text-primary disabled:opacity-40">
              {activeMode === 'rent' ? 'Reserve' : 'Buy'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(LiquidGlassItemDetail);
