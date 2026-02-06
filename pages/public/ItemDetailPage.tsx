import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import ReviewCard from '../../components/ReviewCard';
import ReviewSystem from '../../components/ReviewSystem';
import ThreeDPreview from '../../components/ThreeDPreview';
import { useBrowsingHistory } from '../../hooks/useBrowsingHistory';
import Calendar from '../../components/Calendar';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const getVideoEmbedUrl = (url?: string) => {
    if (!url) return null;
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
};

const StatPill: React.FC<{ label: string; value?: string; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.25em] font-semibold ${highlight ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-soft border-border text-text-secondary'}`}>
        <span className="mr-2">{label}</span>
        {value && <span className="text-text-primary font-bold tracking-normal">{value}</span>}
    </div>
);

const InfoRow: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 pb-3 text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium text-right">{value || '-'}</span>
    </div>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold font-display text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary mt-2 max-w-2xl">{subtitle}</p>}
    </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.25em] border transition ${active ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary/60 hover:text-primary'}`}
    >
        {children}
    </button>
);

const ItemDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToHistory } = useBrowsingHistory();
    const { addItemToCart } = useCart();
    const { showNotification } = useNotification();
    const { user } = useAuth();

    const [item, setItem] = useState<Item | null>(null);
    const [relatedItems, setRelatedItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);
    const [is3dEnabled, setIs3dEnabled] = useState(false);
    const [purchaseMode, setPurchaseMode] = useState<'sale' | 'rent'>('sale');
    const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'seller' | 'reviews'>('details');
    const [reloadKey, setReloadKey] = useState(0);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    const initialLoadRef = useRef(true);

    useEffect(() => {
        if (!id) return;
        let isActive = true;
        const hasItem = !!item && item.id === id;
        if (hasItem) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setLoadError(null);
        if (initialLoadRef.current) {
            window.scrollTo(0, 0);
        }

        const normalizeItem = (raw: Item): Item => ({
            ...raw,
            images: raw.images || [],
            imageUrls: raw.imageUrls || [],
            reviews: raw.reviews || [],
            avgRating: raw.avgRating || 0,
            owner: raw.owner || { id: 'seller', name: 'Verified Seller', avatar: '' },
            features: raw.features || [],
            specifications: raw.specifications || [],
            materials: raw.materials || [],
            careInstructions: raw.careInstructions || [],
            packageContents: raw.packageContents || [],
            certifications: raw.certifications || [],
            shippingEstimates: raw.shippingEstimates || []
        });

        itemService.getItemById(id).then(fetchedItem => {
            if (!isActive) return;
            if (fetchedItem) {
                const normalized = normalizeItem(fetchedItem);
                const isSameItem = item && item.id === normalized.id;
                setItem(normalized);
                if (!isSameItem) {
                    setActiveImage(0);
                }
                setIs3dEnabled(!!normalized.enable3dPreview);
                if (normalized.listingType === 'both') {
                    setPurchaseMode(normalized.salePrice ? 'sale' : 'rent');
                } else if (normalized.listingType === 'rent') {
                    setPurchaseMode('rent');
                } else {
                    setPurchaseMode('sale');
                }
                addToHistory(normalized);
                itemService.getItems({ category: normalized.category }, { page: 1, limit: 4 }).then(res => {
                    if (!isActive) return;
                    setRelatedItems(res.items.filter((i: Item) => i.id !== normalized.id));
                });
            } else {
                if (!item) setItem(null);
                setLoadError('This item could not be loaded. You may be offline or the listing no longer exists.');
            }
            setIsLoading(false);
            setIsRefreshing(false);
            initialLoadRef.current = false;
        }).catch((error) => {
            if (!isActive) return;
            console.error(error);
            setLoadError('We hit a loading issue. Please try again.');
            setIsLoading(false);
            setIsRefreshing(false);
            initialLoadRef.current = false;
        });

        return () => {
            isActive = false;
        };
    }, [id, addToHistory, reloadKey]);

    useEffect(() => {
        setIsAvailable(null);
    }, [startDate, endDate]);

    const galleryImages = useMemo(() => {
        if (!item) return [] as string[];
        const images = item.imageUrls?.length ? item.imageUrls : item.images || [];
        return images.length > 0 ? images : [`https://picsum.photos/seed/${item.id}/1200/1200`];
    }, [item]);

    if (isLoading) return <div className="h-screen flex justify-center items-center"><Spinner size="lg" /></div>;
    if (!item) {
        return (
            <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-6">
                <div className="max-w-lg w-full rounded-3xl border border-border bg-surface p-8 text-center space-y-4">
                    <h2 className="text-2xl font-bold font-display">Unable to load this item</h2>
                    <p className="text-sm text-text-secondary">{loadError || 'Something went wrong.'}</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => setReloadKey(k => k + 1)}
                            className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => navigate('/browse')}
                            className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
                        >
                            Back to Browse
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const displayPrice = item.salePrice || item.rentalPrice || item.price || 0;
    const isRentalOnly = item.listingType === 'rent';
    const isBoth = item.listingType === 'both';
    const isRentalMode = isRentalOnly || (isBoth && purchaseMode === 'rent');

    let totalRentalPrice = 0;
    let rentalDays = 0;

    if (isRentalMode && startDate && endDate && item.rentalRates?.daily) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalRentalPrice = rentalDays * item.rentalRates.daily;
    }

    const handleCheckAvailability = async () => {
        if (!startDate || !endDate) return;
        setIsCheckingAvailability(true);
        try {
            const available = await itemService.checkAvailability(item.id, startDate, endDate);
            setIsAvailable(available);
            if (!available) showNotification('Dates are not available. Please choose another range.');
        } catch (error) {
            console.error('Availability check failed', error);
        } finally {
            setIsCheckingAvailability(false);
        }
    };

    const handleAddToCart = async () => {
        if (isRentalMode) {
            if (!startDate || !endDate) {
                showNotification('Please select rental dates.');
                return;
            }
            if (isAvailable !== true) {
                setIsCheckingAvailability(true);
                const available = await itemService.checkAvailability(item.id, startDate, endDate);
                setIsCheckingAvailability(false);
                setIsAvailable(available);
                if (!available) {
                    showNotification('Item is not available for these dates.');
                    return;
                }
            }
            addItemToCart(item, 1, undefined, { startDate, endDate });
            navigate('/cart');
        } else {
            addItemToCart(item, 1);
        }
    };

    const handleSubmitReview = async (rating: number, comment: string) => {
        if (!user) {
            showNotification('Please log in to leave a review.');
            return;
        }
        try {
            const updated = await itemService.addReview(
                item.id,
                { rating, comment },
                { id: user.id, name: user.name, avatar: user.avatar }
            );
            setItem(updated);
            showNotification('Review submitted. Thank you!');
        } catch (error) {
            console.error(error);
            showNotification('Failed to submit review.');
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showNotification('Link copied to clipboard.');
        } catch {
            showNotification('Failed to copy link.');
        }
    };

    const videoEmbedUrl = getVideoEmbedUrl(item.videoUrl);
    const shippingEstimate = item.shippingEstimates?.[0] || item.supplierInfo?.shippingProfile?.fastestEstimate;
    const returnPolicy = item.returnPolicy || item.supplierInfo?.returnPolicy;
    const warranty = item.warranty;
    const ownerAvatar = item.owner?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.owner?.name || 'Seller')}`;

    return (
        <div className="min-h-screen bg-background text-text-primary">
            {isRefreshing && (
                <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-black/10">
                    <div className="h-full w-1/2 bg-primary animate-pulse" />
                </div>
            )}
            <div className="relative border-b border-border overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-surface-soft via-background to-background" />
                <div className="absolute -top-24 right-[-10%] w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[120px]" />
                <div className="container mx-auto px-4 md:px-8 py-10 relative">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-text-secondary">
                        <Link to="/browse" className="hover:text-primary">Browse</Link>
                        <span>/</span>
                        <span>{item.category}</span>
                        <span>/</span>
                        <span className="text-text-primary">{item.title}</span>
                    </div>
                    <div className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div className="space-y-3">
                            <h1 className="text-4xl md:text-5xl font-black font-display animate-fade-in-up">{item.title}</h1>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <StarRating rating={item.avgRating || 0} size="sm" />
                                    <span className="text-xs text-text-secondary">({item.reviews?.length || 0} reviews)</span>
                                </div>
                                {item.brand && <StatPill label="Brand" value={item.brand} />}
                                {item.isVerified && <StatPill label="Verified" highlight />}
                                {item.productType === 'dropship' && <StatPill label="Dropship" />}
                                {item.listingType === 'rent' && <StatPill label="Rental" />}
                                {item.fulfillmentType && <StatPill label="Fulfillment" value={item.fulfillmentType.replace('_', ' ')} />}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={handleCopyLink} className="px-4 py-2 rounded-full border border-border text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition">
                                Copy Link
                            </button>
                            <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-full bg-surface-soft text-xs uppercase tracking-[0.2em] hover:bg-surface transition">
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-8 py-12 space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12">
                    <div className="space-y-5">
                        <div className="rounded-3xl border border-border overflow-hidden bg-surface">
                            <div className="aspect-square">
                                {is3dEnabled ? (
                                    <ThreeDPreview imageUrl={galleryImages[activeImage]} alt={item.title} is3dEnabled={true} />
                                ) : (
                                    <img src={galleryImages[activeImage]} alt={item.title} className="w-full h-full object-cover" />
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => item.enable3dPreview && setIs3dEnabled(prev => !prev)}
                                    disabled={!item.enable3dPreview}
                                    className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.3em] border ${is3dEnabled ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-secondary'} ${!item.enable3dPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {is3dEnabled ? '3D On' : '3D Off'}
                                </button>
                                {item.enable3dPreview && <span className="text-xs text-text-secondary">Drag to rotate</span>}
                            </div>
                            <span className="text-xs text-text-secondary">{activeImage + 1} / {galleryImages.length}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={`${img}-${idx}`}
                                    onClick={() => setActiveImage(idx)}
                                    className={`rounded-2xl overflow-hidden border transition ${activeImage === idx ? 'border-primary' : 'border-border hover:border-primary/60'}`}
                                >
                                    <img src={img} alt={`${item.title} ${idx + 1}`} className="w-full h-full object-cover aspect-square" />
                                </button>
                            ))}
                        </div>
                        {videoEmbedUrl && (
                            <div className="rounded-3xl overflow-hidden border border-border bg-black">
                                <iframe
                                    title="Product video"
                                    src={videoEmbedUrl}
                                    className="w-full aspect-video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="bg-surface rounded-3xl border border-border p-8 space-y-6 lg:sticky lg:top-24">
                            <div className="rounded-2xl border border-border bg-surface-soft/70 p-4 text-xs text-text-secondary">
                                <p className="font-bold text-text-primary mb-1">Buyer Protection Included</p>
                                Secure payments, verified sellers, and support if your item arrives damaged or not as described.
                            </div>
                            <div>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-bold text-text-primary">
                                        {formatMoney(displayPrice)}
                                        {isRentalMode && item.rentalRates?.daily && <span className="text-sm text-text-secondary font-normal"> / day</span>}
                                    </p>
                                    {item.compareAtPrice && item.compareAtPrice > displayPrice && (
                                        <span className="text-sm text-text-secondary line-through">{formatMoney(item.compareAtPrice)}</span>
                                    )}
                                </div>
                                {item.securityDeposit && isRentalMode && (
                                    <p className="text-xs text-text-secondary mt-2">Security Deposit: {formatMoney(item.securityDeposit)} (refundable)</p>
                                )}
                                {item.stock <= 5 && item.stock > 0 && (
                                    <p className="text-xs text-amber-500 mt-2 font-semibold">Low stock: {item.stock} left</p>
                                )}
                            </div>

                            {isBoth && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setPurchaseMode('sale')}
                                        className={`py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${purchaseMode === 'sale' ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-secondary'}`}
                                    >
                                        Buy
                                    </button>
                                    <button
                                        onClick={() => setPurchaseMode('rent')}
                                        className={`py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${purchaseMode === 'rent' ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-secondary'}`}
                                    >
                                        Rent
                                    </button>
                                </div>
                            )}

                            {isRentalMode ? (
                                <div className="space-y-4">
                                    <div className="bg-surface-soft rounded-2xl p-4 border border-border">
                                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-3">Select Rental Dates</h3>
                                        <Calendar
                                            startDate={startDate}
                                            endDate={endDate}
                                            setStartDate={setStartDate}
                                            setEndDate={setEndDate}
                                            onClose={() => {}}
                                            bookedDates={item.bookedDates}
                                            mode="range"
                                        />
                                    </div>
                                    {startDate && endDate && (
                                        <div className="bg-surface-soft rounded-2xl p-4 border border-border space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>{formatMoney(item.rentalRates?.daily || 0)} x {rentalDays} days</span>
                                                <span>{formatMoney(totalRentalPrice)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Service Fee</span>
                                                <span>{formatMoney(totalRentalPrice * 0.1)}</span>
                                            </div>
                                            <div className="border-t border-border pt-2 flex justify-between font-bold">
                                                <span>Total</span>
                                                <span>{formatMoney(totalRentalPrice * 1.1)}</span>
                                            </div>
                                            {isAvailable === true && <p className="text-green-500 text-xs font-bold text-center">Available for these dates</p>}
                                            {isAvailable === false && <p className="text-red-500 text-xs font-bold text-center">Not available for these dates</p>}
                                        </div>
                                    )}
                                    {(!startDate || !endDate) && (
                                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                            {item.rentalRates?.hourly && (
                                                <div className="rounded-xl border border-border p-3 bg-surface-soft">
                                                    <p className="text-text-secondary">Hourly</p>
                                                    <p className="font-bold">{formatMoney(item.rentalRates.hourly)}</p>
                                                </div>
                                            )}
                                            {item.rentalRates?.daily && (
                                                <div className="rounded-xl border border-primary p-3 bg-primary/5 text-primary">
                                                    <p>Daily</p>
                                                    <p className="font-bold">{formatMoney(item.rentalRates.daily)}</p>
                                                </div>
                                            )}
                                            {item.rentalRates?.weekly && (
                                                <div className="rounded-xl border border-border p-3 bg-surface-soft">
                                                    <p className="text-text-secondary">Weekly</p>
                                                    <p className="font-bold">{formatMoney(item.rentalRates.weekly)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleCheckAvailability}
                                            disabled={!startDate || !endDate || isCheckingAvailability}
                                            className="py-3 rounded-xl border border-border font-semibold text-sm hover:bg-surface-soft disabled:opacity-50"
                                        >
                                            {isCheckingAvailability ? <Spinner size="sm" /> : 'Check Dates'}
                                        </button>
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={!startDate || !endDate || isAvailable === false}
                                            className="py-3 rounded-xl bg-black text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                                        >
                                            Rent Now
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <button
                                        onClick={handleAddToCart}
                                        className="w-full py-4 rounded-xl bg-black text-white font-semibold text-sm hover:opacity-90"
                                    >
                                        Add to Cart
                                    </button>
                                    <div className="text-xs text-text-secondary text-center">
                                        Secure checkout - Buyer protection - 24/7 support
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <StatPill label="Condition" value={item.condition || '-'} />
                                <StatPill label="Stock" value={item.stock?.toString()} />
                                <StatPill label="Shipping" value={item.whoPaysShipping === 'seller' ? 'Free' : 'Buyer'} />
                                <StatPill label="Origin" value={item.originCountry || item.supplierInfo?.originCountry || '-'} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-border bg-surface p-6">
                    <div className="flex flex-wrap gap-3">
                        <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>Details</TabButton>
                        <TabButton active={activeTab === 'shipping'} onClick={() => setActiveTab('shipping')}>Shipping</TabButton>
                        <TabButton active={activeTab === 'seller'} onClick={() => setActiveTab('seller')}>Seller</TabButton>
                        <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>Reviews</TabButton>
                    </div>

                    {activeTab === 'details' && (
                        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 animate-fade-in-up">
                            <div className="space-y-10">
                                <div>
                                    <SectionTitle title="Product Story" subtitle="Every detail, every angle. Know exactly what you are getting." />
                                    <p className="text-text-secondary leading-relaxed text-base">
                                        {item.description}
                                    </p>
                                </div>

                                {item.features && item.features.length > 0 && (
                                    <div>
                                        <SectionTitle title="Highlights" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {item.features.filter(Boolean).map((feature, idx) => (
                                                <div key={`${feature}-${idx}`} className="p-4 rounded-2xl border border-border bg-surface">
                                                    <p className="text-sm font-semibold text-text-primary">{feature}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {item.specifications && item.specifications.length > 0 && (
                                    <div>
                                        <SectionTitle title="Specifications" />
                                        <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
                                            {item.specifications.map((spec, idx) => (
                                                <InfoRow key={`${spec.key}-${idx}`} label={spec.key} value={spec.value} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(item.materials?.length || item.careInstructions?.length || item.packageContents?.length) && (
                                    <div>
                                        <SectionTitle title="Materials and Care" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {item.materials && item.materials.length > 0 && (
                                                <div className="rounded-2xl border border-border bg-surface p-6">
                                                    <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Materials</p>
                                                    <ul className="space-y-2 text-sm text-text-primary">
                                                        {item.materials.map((mat, idx) => (
                                                            <li key={`${mat.name}-${idx}`}>{mat.name}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {item.careInstructions && item.careInstructions.length > 0 && (
                                                <div className="rounded-2xl border border-border bg-surface p-6">
                                                    <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Care</p>
                                                    <ul className="space-y-2 text-sm text-text-primary">
                                                        {item.careInstructions.map((care, idx) => (
                                                            <li key={`${care}-${idx}`}>{care}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {item.packageContents && item.packageContents.length > 0 && (
                                                <div className="rounded-2xl border border-border bg-surface p-6">
                                                    <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">In the Box</p>
                                                    <ul className="space-y-2 text-sm text-text-primary">
                                                        {item.packageContents.map((content, idx) => (
                                                            <li key={`${content}-${idx}`}>{content}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-8">
                                <div className="rounded-2xl border border-border bg-surface p-6">
                                    <SectionTitle title="Sizing & Build" />
                                    <div className="space-y-3">
                                        <InfoRow label="Weight" value={item.weightLbs ? `${item.weightLbs} lbs` : undefined} />
                                        <InfoRow
                                            label="Dimensions"
                                            value={item.dimensionsIn ? `${item.dimensionsIn.l} x ${item.dimensionsIn.w} x ${item.dimensionsIn.h} in` : undefined}
                                        />
                                        <InfoRow label="Origin City" value={item.originCity} />
                                        <InfoRow label="Origin Country" value={item.originCountry || item.supplierInfo?.originCountry} />
                                    </div>
                                </div>
                                {item.certifications && item.certifications.length > 0 && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Certifications" />
                                        <div className="flex flex-wrap gap-2">
                                            {item.certifications.map((cert, idx) => (
                                                <span key={`${cert}-${idx}`} className="px-3 py-1 rounded-full bg-surface-soft border border-border text-xs text-text-secondary">
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {item.affiliateEligibility?.enabled && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Affiliate Program" subtitle="Creators can earn commission for sales." />
                                        <div className="space-y-3">
                                            <InfoRow label="Commission" value={item.affiliateEligibility.commissionRate ? `${item.affiliateEligibility.commissionRate}%` : undefined} />
                                            <InfoRow label="Cookie Window" value={item.affiliateEligibility.cookieWindowDays ? `${item.affiliateEligibility.cookieWindowDays} days` : undefined} />
                                            <InfoRow label="Creators" value={item.affiliateEligibility.approvedCreatorsOnly ? 'Approved only' : 'Open to all'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'shipping' && (
                        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 animate-fade-in-up">
                            <div className="space-y-8">
                                <div className="rounded-2xl border border-border bg-surface p-6">
                                    <SectionTitle title="Shipping and Returns" subtitle="Clear delivery expectations with protection." />
                                    <div className="space-y-3">
                                        <InfoRow
                                            label="Estimated Delivery"
                                            value={shippingEstimate ? `${shippingEstimate.minDays}-${shippingEstimate.maxDays} days` : item.shippingDetails?.shippingOptions?.[0]?.description}
                                        />
                                        <InfoRow label="Shipping Cost" value={item.whoPaysShipping === 'seller' ? 'Free Shipping' : 'Calculated at checkout'} />
                                        <InfoRow label="Return Window" value={returnPolicy ? `${returnPolicy.windowDays} days` : 'Check seller policy'} />
                                        <InfoRow label="Warranty" value={warranty?.coverage} />
                                    </div>
                                </div>
                                {item.shippingEstimates && item.shippingEstimates.length > 0 && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Delivery Options" />
                                        <div className="space-y-4">
                                            {item.shippingEstimates.map((estimate, idx) => (
                                                <div key={`${estimate.minDays}-${estimate.maxDays}-${idx}`} className="flex items-center justify-between text-sm border-b border-border/60 pb-3">
                                                    <div>
                                                        <p className="font-semibold">{estimate.serviceLevel || estimate.carrier || 'Standard'}</p>
                                                        <p className="text-text-secondary text-xs">{estimate.minDays}-{estimate.maxDays} days</p>
                                                    </div>
                                                    <span className="text-text-primary">{estimate.cost ? formatMoney(estimate.cost) : 'Included'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-8">
                                {returnPolicy && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Return Policy" />
                                        <div className="space-y-3 text-sm">
                                            <InfoRow label="Window" value={`${returnPolicy.windowDays} days`} />
                                            <InfoRow label="Restocking Fee" value={returnPolicy.restockingFeePercent ? `${returnPolicy.restockingFeePercent}%` : 'None'} />
                                            <InfoRow label="Return Shipping" value={returnPolicy.returnShippingPaidBy || 'Seller policy'} />
                                            {returnPolicy.conditions && returnPolicy.conditions.length > 0 && (
                                                <div className="pt-3 text-text-secondary">
                                                    {returnPolicy.conditions.map((condition, idx) => (
                                                        <div key={`${condition}-${idx}`} className="flex items-start gap-2">
                                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                                                            <span>{condition}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {warranty && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Warranty Coverage" />
                                        <div className="space-y-3">
                                            <InfoRow label="Coverage" value={warranty.coverage} />
                                            <InfoRow label="Duration" value={warranty.durationMonths ? `${warranty.durationMonths} months` : undefined} />
                                            <InfoRow label="Provider" value={warranty.provider || 'Seller'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'seller' && (
                        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 animate-fade-in-up">
                            <div className="rounded-2xl border border-border bg-surface p-6">
                                <SectionTitle title="Seller and Trust" />
                                <div className="flex items-center gap-4">
                                    <img src={ownerAvatar} alt={item.owner.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <p className="font-bold text-text-primary">{item.owner.businessName || item.owner.name}</p>
                                        <Link to={`/user/${item.owner.id}`} className="text-xs text-primary font-semibold">View profile</Link>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3">
                                    <InfoRow label="Verified Seller" value={item.isVerified ? 'Yes' : 'No'} />
                                    <InfoRow label="Average Rating" value={item.avgRating ? item.avgRating.toFixed(1) : '-'} />
                                    <InfoRow label="Reviews" value={item.reviews?.length || 0} />
                                    <InfoRow label="Fulfillment" value={item.fulfillmentType?.replace('_', ' ') || 'In-house'} />
                                </div>
                            </div>
                            <div className="space-y-8">
                                {item.productType === 'dropship' && (
                                    <div className="rounded-2xl border border-border bg-surface p-6">
                                        <SectionTitle title="Dropship Fulfillment" subtitle="Global supply chain details." />
                                        <div className="space-y-3">
                                            <InfoRow label="Supplier" value={item.supplierInfo?.name} />
                                            <InfoRow label="Processing Time" value={item.supplierInfo?.processingTimeDays ? `${item.supplierInfo.processingTimeDays} days` : undefined} />
                                            <InfoRow label="Origin" value={item.originCountry || item.supplierInfo?.originCountry} />
                                            <InfoRow label="Compliance" value={item.supplierInfo?.compliance?.certifications?.join(', ')} />
                                            <InfoRow label="Return Policy" value={item.supplierInfo?.returnPolicy?.windowDays ? `${item.supplierInfo.returnPolicy.windowDays} days` : undefined} />
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-2xl border border-border bg-surface p-6">
                                    <SectionTitle title="Support" />
                                    <div className="space-y-3 text-sm text-text-secondary">
                                        <p>Message the seller any time for sizing help, custom requests, or shipping updates.</p>
                                        <p>Urban Prime monitors response time and dispute resolution for premium service.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 animate-fade-in-up">
                            <div className="rounded-2xl border border-border bg-surface p-6">
                                <SectionTitle title="Customer Reviews" subtitle="Real experiences from verified community members." />
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold">{(item.avgRating || 0).toFixed(1)}</div>
                                    <div>
                                        <StarRating rating={item.avgRating || 0} size="md" />
                                        <p className="text-xs text-text-secondary mt-1">{item.reviews?.length || 0} total reviews</p>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {item.reviews && item.reviews.length > 0 ? (
                                        item.reviews.slice(0, 8).map(review => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))
                                    ) : (
                                        <p className="text-sm text-text-secondary">No reviews yet. Be the first to share your thoughts.</p>
                                    )}
                                </div>
                            </div>
                            <ReviewSystem onSubmit={handleSubmitReview} />
                        </div>
                    )}
                </div>

                {relatedItems.length > 0 && (
                    <div className="mt-16">
                        <SectionTitle title="Related Items" subtitle="More pieces curated just for you." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedItems.map(related => (
                                <ItemCard key={related.id} item={related} onQuickView={() => {}} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemDetailPage;
