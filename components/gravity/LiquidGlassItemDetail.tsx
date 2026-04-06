import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Item } from '../../types';
import GlassCard from './GlassCard';

interface LiquidGlassItemDetailProps {
  item: Item;
  relatedItems: Item[];
  activeMode: 'buy' | 'bid' | 'rent';
  setActiveMode: (mode: 'buy' | 'bid' | 'rent') => void;
  quantity: number;
  setQuantity: (q: number) => void;
  bidAmount: number;
  setBidAmount: (amount: number) => void;
  rentalDates: { start: string; end: string };
  setRentalPeriod: (value: { start: string; end: string }) => void;
  onAddToCart?: (checkout?: boolean, mode?: 'sale' | 'rent') => void;
}

const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');
const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);
const shortDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)) : 'TBD';
const relTime = (value?: string | null) => {
  if (!value) return '';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;
};

const isDigital = (item: Item) => item.productType === 'digital' || item.itemType === 'digital' || Boolean(item.digitalFileUrl);
const isAuction = (item: Item) => item.listingType === 'auction';
const isRental = (item: Item) => item.listingType === 'rent' || item.listingType === 'both';
const isSale = (item: Item) => item.listingType === 'sale' || item.listingType === 'both';
const imagesFor = (item: Item) => Array.from(new Set([...(item.imageUrls || []), ...(item.images || [])].filter(Boolean)));
const primaryPrice = (item: Item, mode: 'buy' | 'bid' | 'rent') => {
  if (mode === 'rent') return item.rentalPrice || item.rentalRates?.daily || item.price || 0;
  if (mode === 'bid') return item.auctionDetails?.currentBid || item.auctionDetails?.startingBid || item.price || 0;
  return item.buyNowPrice || item.salePrice || item.price || 0;
};

function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'accent' | 'success' | 'warning' }) {
  const cls = {
    muted: 'border-border bg-surface/80 text-text-primary dark:bg-white/5',
    accent: 'border-sky-200/40 bg-sky-500/10 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100',
    success: 'border-emerald-200/40 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100',
    warning: 'border-amber-200/40 bg-amber-500/10 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100'
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${cls}`}>{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-border bg-surface/80 px-3 py-3 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">{label}</span>
      <span className="text-right text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function ModeButton({
  active,
  children,
  onClick
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
        active
          ? 'border-primary bg-primary text-primary-text shadow-[0_14px_30px_rgba(59,130,246,0.24)]'
          : 'border-border bg-surface/80 text-text-primary dark:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

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
  onAddToCart
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const galleryImages = useMemo(() => imagesFor(item), [item]);
  const activeImage = selectedImage || galleryImages[0] || item.videoUrl || '/icons/urbanprime.svg';
  const activeImageIndex = useMemo(() => {
    const index = galleryImages.findIndex((image) => image === activeImage);
    return index >= 0 ? index : 0;
  }, [activeImage, galleryImages]);
  const price = primaryPrice(item, activeMode);
  const ownerAvatar = safeAvatar(item.owner?.avatar);
  const ownerSlug = encodeURIComponent(item.owner?.id || item.owner?.name || 'seller');
  const isDigitalProduct = isDigital(item);
  const auctionBid = item.auctionDetails?.currentBid || item.auctionDetails?.startingBid || item.price || 0;
  const saleSave = item.compareAtPrice && item.compareAtPrice > price ? Math.round(100 - (price / item.compareAtPrice) * 100) : 0;
  const lowStock = item.stock > 0 && item.stock <= 3;
  const trending = Number((item as any).views || 0) >= 1000 || (item.avgRating || 0) >= 4.7 || Boolean(item.isFeatured);

  const modes = [
    { id: 'buy' as const, label: isDigitalProduct ? 'Instant access' : 'Buy', show: isSale(item) || isDigitalProduct },
    { id: 'bid' as const, label: 'Bid', show: isAuction(item) },
    { id: 'rent' as const, label: 'Rent', show: isRental(item) }
  ].filter((mode) => mode.show);

  const titleLine = isDigitalProduct ? 'Digital product' : item.productType || 'Product';
  const deliveryText = isDigitalProduct
    ? 'Instant download'
    : item.whoPaysShipping === 'buyer'
      ? 'Buyer pays shipping'
      : 'Seller ships';
  const returnText = isDigitalProduct
    ? item.licenseType || 'License included'
    : item.returnPolicy?.windowDays
      ? `${item.returnPolicy.windowDays}-day returns`
      : 'See return policy';
  const stockText = item.stock > 0 ? (lowStock ? `Only ${item.stock} left` : 'In stock') : 'Sold out';
  const summaryLabel = activeMode === 'bid' ? 'Current bid' : activeMode === 'rent' ? 'Daily rate' : 'Price';
  const primaryCtaLabel = activeMode === 'bid'
    ? 'Place bid'
    : isDigitalProduct
      ? 'Continue to checkout'
      : activeMode === 'rent'
        ? 'Reserve and checkout'
        : 'Buy now';
  const secondaryCtaLabel = activeMode === 'bid'
    ? 'Add to cart'
    : activeMode === 'rent'
      ? 'Add rental to cart'
      : 'Add to cart';

  const setImageByOffset = (offset: number) => {
    if (!galleryImages.length) return;
    const nextIndex = (activeImageIndex + offset + galleryImages.length) % galleryImages.length;
    setSelectedImage(galleryImages[nextIndex] || null);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartXRef.current == null || galleryImages.length < 2) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    if (Math.abs(delta) > 50) {
      setImageByOffset(delta < 0 ? 1 : -1);
    }
    touchStartXRef.current = null;
  };

  const openBidComposer = () => {
    window.postMessage(
      {
        type: 'urbanprime:item-detail-action',
        action: 'place_bid',
        itemId: item.id,
        sellerId: item.owner?.id || '',
        amount: bidAmount,
        item
      },
      window.location.origin
    );
  };

  const primaryAction = () => {
    if (activeMode === 'bid') return openBidComposer();
    onAddToCart?.(true, activeMode === 'rent' ? 'rent' : 'sale');
  };

  const secondaryAction = () => {
    if (activeMode === 'bid') {
      onAddToCart?.(false, 'sale');
      return;
    }
    onAddToCart?.(false, activeMode === 'rent' ? 'rent' : 'sale');
  };

  const renderMedia = () => (
    <GlassCard
      className="overflow-hidden rounded-[2rem] border border-border/70 bg-surface/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:bg-white/[0.05]"
      enableTilt={false}
      enableGlow={false}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{titleLine}</Pill>
            {item.isVerified ? <Pill tone="success">Verified</Pill> : null}
            {trending ? <Pill tone="accent">Trending</Pill> : null}
            {lowStock ? <Pill tone="warning">{stockText}</Pill> : null}
          </div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="rounded-full border border-border bg-surface/80 px-4 py-2 text-xs font-semibold text-text-primary transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] dark:bg-white/5"
          >
            View full screen
          </button>
        </div>

        <motion.button
          type="button"
          onClick={() => setZoomed(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="relative mt-4 block w-full overflow-hidden rounded-[1.7rem] border border-border/60 bg-background/70 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            {item.videoUrl && !selectedImage ? (
              <video
                src={item.videoUrl}
                poster={activeImage || undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="h-full w-full object-cover"
              />
            ) : (
              <motion.img
                src={activeImage}
                alt={item.title}
                className="h-full w-full object-cover"
                loading="eager"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Pill tone="accent">{item.listingType}</Pill>
              {item.videoUrl ? <Pill tone="warning">Video</Pill> : null}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div className="max-w-[70%]">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/70">Urban Prime</p>
                <p className="mt-1 text-lg font-bold text-white sm:text-xl">{item.title}</p>
              </div>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur-2xl">
                Open
              </span>
            </div>
          </div>
        </motion.button>

        {galleryImages.length > 1 ? (
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
                className={`relative aspect-square overflow-hidden rounded-[1rem] border transition duration-200 ${
                  selectedImage === image || (!selectedImage && index === 0)
                    ? 'border-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.12)]'
                    : 'border-border/60 dark:border-white/10'
                }`}
              >
                <img src={image} alt={`${item.title} ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </GlassCard>
  );

  const renderActionPair = () => (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <motion.button
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={primaryAction}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(37,99,235,0.96),rgba(56,189,248,0.96))] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.22)] transition hover:brightness-110"
      >
        {primaryCtaLabel}
      </motion.button>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={secondaryAction}
        className="inline-flex h-12 items-center justify-center rounded-full border border-border/70 bg-surface/80 px-5 text-sm font-semibold text-text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-surface/95 dark:bg-white/5"
      >
        {secondaryCtaLabel}
      </motion.button>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-2">
      <Stat label={summaryLabel} value={money(price)} />
      <Stat label="Rating" value={item.avgRating ? item.avgRating.toFixed(1) : 'New'} />
      <Stat label="Stock" value={stockText} />
      <Stat label="Updated" value={relTime(item.createdAt)} />
    </div>
  );

  const renderCommercePanel = (compactMode = false) => (
    <GlassCard
      className={`rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/[0.05] ${
        compactMode ? '' : 'sticky top-5'
      }`}
      enableTilt={false}
      enableGlow={false}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">{item.listingType}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-text-primary">{money(price)}</h2>
        </div>
        {saleSave > 0 ? <Pill tone="success">Save {saleSave}%</Pill> : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        {activeMode === 'bid'
          ? `Current bid ${money(auctionBid)}. Ends ${shortDate(item.auctionDetails?.endTime)}.`
          : activeMode === 'rent'
            ? `${money(price)} per day. ${item.minRentalDuration ? `${item.minRentalDuration}+ days` : 'Flexible duration'}.`
            : isDigitalProduct
              ? 'Instant digital delivery with license details below.'
              : item.buyNowPrice
                ? `Buy now for ${money(item.buyNowPrice)}.`
                : `Available from ${money(item.salePrice || item.price || 0)}.`}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Delivery" value={deliveryText} />
        <Stat label="Returns" value={returnText} />
        <Stat label="Fulfillment" value={isDigitalProduct ? 'Download' : item.whoPaysShipping || 'Seller'} />
      </div>

      <div className="mt-5 space-y-3 rounded-[1.4rem] border border-border/70 bg-background/70 p-4 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          {modes.map((mode) => (
            <ModeButton key={mode.id} active={activeMode === mode.id} onClick={() => setActiveMode(mode.id)}>
              {mode.label}
            </ModeButton>
          ))}
        </div>

        {activeMode === 'buy' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Quantity</span>
              <span className="text-sm font-bold text-text-primary">{quantity}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface/80 p-1.5 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-background/70 font-bold text-text-primary transition hover:bg-background"
              >
                -
              </button>
              <div className="flex-1 text-center text-sm font-bold text-text-primary">{quantity}</div>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-background/70 font-bold text-text-primary transition hover:bg-background"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {activeMode === 'rent' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Start</span>
              <input
                type="date"
                value={rentalDates.start}
                onChange={(event) => setRentalPeriod({ ...rentalDates, start: event.target.value })}
                className="mt-2 w-full bg-transparent text-sm font-semibold text-text-primary outline-none"
              />
            </label>
            <label className="rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">End</span>
              <input
                type="date"
                value={rentalDates.end}
                onChange={(event) => setRentalPeriod({ ...rentalDates, end: event.target.value })}
                className="mt-2 w-full bg-transparent text-sm font-semibold text-text-primary outline-none"
              />
            </label>
          </div>
        ) : null}

        {activeMode === 'bid' ? (
          <label className="rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Your bid</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-black text-text-primary">$</span>
              <input
                type="number"
                min={Math.ceil(auctionBid + 1)}
                step={1}
                value={bidAmount}
                onChange={(event) => setBidAmount(Number(event.target.value))}
                className="w-full bg-transparent text-xl font-black text-text-primary outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-text-secondary">Current bid {money(auctionBid)}. Ends {shortDate(item.auctionDetails?.endTime)}.</p>
          </label>
        ) : null}
      </div>

      {renderActionPair()}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Stat label="Secure" value="Checkout" />
        <Stat label="Delivery" value={deliveryText} />
        <Stat label="Returns" value={returnText} />
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-text-secondary dark:bg-white/5">
        <p className="font-semibold text-text-primary">Trust signals</p>
        <p className="mt-2 leading-relaxed">Fast checkout, clear ownership details, and a responsive buying flow optimized for mobile and desktop.</p>
      </div>
    </GlassCard>
  );

  const renderDetails = (compactMode = false) => (
    <div className="space-y-5">
      {!compactMode ? (
        <GlassCard className="rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Item detail</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{item.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">{isDigitalProduct ? 'Digital' : item.listingType}</Pill>
              {saleSave > 0 ? <Pill tone="success">Save {saleSave}%</Pill> : null}
              {trending ? <Pill tone="warning">Trending</Pill> : null}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Price" value={money(price)} />
            <Stat label="Status" value={stockText} />
            <Stat label="Delivery" value={deliveryText} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{isDigitalProduct ? 'Digital product' : item.productType || 'Product'}</Pill>
            {item.isVerified ? <Pill tone="success">Verified</Pill> : null}
            {item.condition ? <Pill>{item.condition}</Pill> : null}
            {item.spotlightAttribution?.spotlightContentId ? <Pill tone="accent">Spotlight linked</Pill> : null}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Description</p>
            <h2 className="mt-1 text-lg font-black text-text-primary">Why it stands out</h2>
          </div>
          {lowStock ? <Pill tone="warning">{stockText}</Pill> : null}
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            {expanded ? item.description : (item.description || '').slice(0, compactMode ? 180 : 240)}
            {!expanded && item.description && item.description.length > (compactMode ? 180 : 240) ? '...' : ''}
          </p>
          {item.description && item.description.length > (compactMode ? 180 : 240) ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Key info</p>
            <h2 className="mt-1 text-lg font-black text-text-primary">At a glance</h2>
          </div>
          {saleSave > 0 ? <Pill tone="success">Save {saleSave}%</Pill> : null}
        </div>
        <div className="mt-4 divide-y divide-black/6 rounded-[1.35rem] border border-black/6 bg-white/55 px-4 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
          <InfoRow label="Category" value={item.category || 'General'} />
          <InfoRow label="Brand" value={item.brand || 'Urban Prime'} />
          <InfoRow label="SKU" value={item.sku || 'Not listed'} />
          <InfoRow label="Updated" value={relTime(item.createdAt)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(item.features || []).slice(0, 5).map((feature, index) => (
            <Pill key={`${feature}-${index}`} tone="accent">
              {feature}
            </Pill>
          ))}
          {isDigitalProduct ? <Pill tone="warning">License included</Pill> : null}
          {!isDigitalProduct && item.returnPolicy?.windowDays ? <Pill tone="success">{item.returnPolicy.windowDays}-day returns</Pill> : null}
        </div>
      </GlassCard>

      <GlassCard className="rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Seller</p>
            <h2 className="mt-1 text-lg font-black text-text-primary">{item.owner?.name || 'Seller'}</h2>
          </div>
          <Pill>{compact(Number((item.owner as any)?.salesCount || 0))} sales</Pill>
        </div>
        <div className="mt-4 flex items-start gap-4">
          <img src={ownerAvatar} alt={item.owner?.name || 'Seller'} className="h-16 w-16 rounded-[1.2rem] object-cover shadow-[0_12px_30px_rgba(15,23,42,0.18)]" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-text-secondary">
              {item.owner?.businessName || item.owner?.name || 'Seller'} ships premium listings with a clean, responsive checkout and clear ownership details.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/user/${ownerSlug}`} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950">
                Open profile
              </Link>
              <Link to="/messages" className="rounded-full border border-border/70 bg-surface/80 px-4 py-2 text-xs font-semibold text-text-primary transition hover:bg-background/80 dark:bg-white/5">
                Message seller
              </Link>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Related products</p>
            <h2 className="mt-1 text-lg font-black text-text-primary">Discover more like this</h2>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-sky-600 dark:text-sky-300">
            Browse all
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {relatedItems.slice(0, 4).map((relatedItem, index) => {
            const relatedPrice = relatedItem.salePrice || relatedItem.rentalPrice || relatedItem.auctionDetails?.currentBid || relatedItem.price || 0;
            return (
              <Link
                key={relatedItem.id}
                to={`/item/${relatedItem.id}`}
                className="group overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/80 p-3 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:bg-white/[0.05]"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem]">
                  <img
                    src={relatedItem.imageUrls?.[0] || relatedItem.images?.[0] || `https://picsum.photos/seed/${index + 30}/600/750`}
                    alt={relatedItem.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3">
                    <Pill>{relatedItem.listingType}</Pill>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="truncate text-sm font-bold text-text-primary">{relatedItem.title}</p>
                  <p className="text-sm text-text-secondary">{money(relatedPrice)}</p>
                </div>
              </Link>
            );
          })}
          {relatedItems.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-text-secondary sm:col-span-2 xl:col-span-4">
              Related items will appear here as the catalog grows.
            </div>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );

  const renderMobileTop = () => (
    <section className="xl:hidden space-y-4">
      <GlassCard className="sticky top-3 z-20 rounded-[2rem] border border-border/70 bg-surface/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.05]" enableTilt={false} enableGlow={false}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary">Prime Spotlight</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary">{item.title}</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {saleSave > 0 ? <Pill tone="success">Save {saleSave}%</Pill> : null}
            {trending ? <Pill tone="accent">Trending</Pill> : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">{summaryLabel}</p>
            <p className="mt-1 text-[2rem] font-black tracking-tight text-text-primary">{money(price)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Status</p>
            <p className="mt-1 text-sm font-bold text-text-primary">{stockText}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {modes.map((mode) => (
            <ModeButton key={mode.id} active={activeMode === mode.id} onClick={() => setActiveMode(mode.id)}>
              {mode.label}
            </ModeButton>
          ))}
        </div>

        {renderActionPair()}

        {activeMode === 'buy' ? (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Quantity</span>
              <span className="text-sm font-bold text-text-primary">{quantity}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-full border border-border/70 bg-surface/80 p-1.5 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-background/70 font-bold text-text-primary transition hover:bg-background"
              >
                -
              </button>
              <div className="flex-1 text-center text-sm font-bold text-text-primary">{quantity}</div>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-background/70 font-bold text-text-primary transition hover:bg-background"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {activeMode === 'rent' ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Start</span>
              <input
                type="date"
                value={rentalDates.start}
                onChange={(event) => setRentalPeriod({ ...rentalDates, start: event.target.value })}
                className="mt-2 w-full bg-transparent text-sm font-semibold text-text-primary outline-none"
              />
            </label>
            <label className="rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">End</span>
              <input
                type="date"
                value={rentalDates.end}
                onChange={(event) => setRentalPeriod({ ...rentalDates, end: event.target.value })}
                className="mt-2 w-full bg-transparent text-sm font-semibold text-text-primary outline-none"
              />
            </label>
          </div>
        ) : null}

        {activeMode === 'bid' ? (
          <label className="mt-4 block rounded-[1.1rem] border border-border/70 bg-surface/80 p-3 dark:bg-white/5">
            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Your bid</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-black text-text-primary">$</span>
              <input
                type="number"
                min={Math.ceil(auctionBid + 1)}
                step={1}
                value={bidAmount}
                onChange={(event) => setBidAmount(Number(event.target.value))}
                className="w-full bg-transparent text-xl font-black text-text-primary outline-none"
              />
            </div>
          </label>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Delivery" value={deliveryText} />
          <Stat label="Returns" value={returnText} />
          <Stat label="Seller" value={compact(Number((item.owner as any)?.salesCount || 0))} />
        </div>
      </GlassCard>
    </section>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-primary pb-10 xl:pb-0">
      <motion.div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <section className="xl:hidden space-y-4">
          {renderMedia()}
          {renderMobileTop()}
          {renderDetails(true)}
        </section>

        <section className="hidden xl:grid grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)_420px] gap-6 items-start">
          <div className="space-y-5">{renderMedia()}</div>
          <div className="space-y-5">{renderDetails(false)}</div>
          <div className="space-y-5">{renderCommercePanel(false)}</div>
        </section>
      </motion.div>

      <AnimatePresence>
        {zoomed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/88 p-4 backdrop-blur-2xl"
            onClick={() => setZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomed(false)}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-2xl"
              >
                Close
              </button>
              {item.videoUrl && !selectedImage ? (
                <video src={item.videoUrl} poster={activeImage || undefined} controls autoPlay className="h-[80vh] w-full object-contain" />
              ) : (
                <img src={activeImage} alt={item.title} className="h-[80vh] w-full object-contain" />
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

};

export default React.memo(LiquidGlassItemDetail);
