
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { itemService } from '../../services/itemService';
import type { Item, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import WishlistButton from '../../components/WishlistButton';
import ItemCard from '../../components/ItemCard';
import ReviewCard from '../../components/ReviewCard';
import VerifiedBadge from '../../components/VerifiedBadge';
import ReviewForm from '../../components/ReviewForm';
import QuestionCard from '../../components/QuestionCard';
import Calendar from '../../components/Calendar';

// --- ICONS ---
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>;
const GavelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.111 48.111 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const MessageCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const LightningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;

// --- ANIMATION VARIANTS ---
const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 50, damping: 20, duration: 0.8 },
  },
};

const Section: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <motion.section 
        className={className}
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
    >
        {children}
    </motion.section>
);

const AuctionTimer: React.FC<{ endTime: string }> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const distance = end - now;
            
            if (distance < 0) {
                clearInterval(interval);
                return;
            }
            
            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [endTime]);
    
    return (
        <div className="flex gap-2 text-center text-xs font-bold font-mono text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
            <div className="flex flex-col"><span className="text-sm">{timeLeft.days}</span><span>D</span></div>:
            <div className="flex flex-col"><span className="text-sm">{timeLeft.hours}</span><span>H</span></div>:
            <div className="flex flex-col"><span className="text-sm">{timeLeft.minutes}</span><span>M</span></div>:
            <div className="flex flex-col"><span className="text-sm">{timeLeft.seconds}</span><span>S</span></div>
        </div>
    );
};

// --- MODAL COMPONENT ---
type SellerProfile = User & { rating?: number };

const ContactSellerModal: React.FC<{ seller: SellerProfile; onClose: () => void; onMessage: () => void }> = ({ seller, onClose, onMessage }) => {
    const { showNotification } = useNotification();
    const rating = typeof seller.rating === 'number' ? seller.rating : 0;
    const displayEmail = seller.email || 'Not provided';
    const displayPhone = seller.phone || 'Not provided';

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${label} copied to clipboard!`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-dark-background">
                    <h3 className="font-bold text-lg dark:text-white font-display">Contact Seller</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><XIcon /></button>
                </div>
                <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <img src={seller.avatar} alt={seller.name} className="w-16 h-16 rounded-full border-2 border-primary object-cover" />
                        <div>
                            <h4 className="font-bold text-xl dark:text-white font-display">{seller.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <StarRating rating={rating} size="sm" /> 
                                <span>• {rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-background rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><MailIcon /></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email</p>
                                    <p className="text-sm font-medium dark:text-white">{displayEmail}</p>
                                </div>
                            </div>
                            <button onClick={() => copyToClipboard(displayEmail, 'Email')} className="text-gray-400 hover:text-primary"><CopyIcon/></button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-background rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-full"><PhoneIcon /></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Phone</p>
                                    <p className="text-sm font-medium dark:text-white">{displayPhone}</p>
                                </div>
                            </div>
                            <button onClick={() => copyToClipboard(displayPhone, 'Phone')} className="text-gray-400 hover:text-primary"><CopyIcon/></button>
                        </div>
                    </div>

                    <button 
                        onClick={onMessage}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <MessageCircleIcon /> Send Message
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- IMAGE ZOOM MODAL ---
const ImageZoomModal: React.FC<{ media: Array<{ type: 'image' | 'video'; url: string }>; currentIndex: number; isOpen: boolean; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({ media, currentIndex, isOpen, onClose, onPrev, onNext }) => {
    if (!isOpen || media.length === 0) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all z-10"
                aria-label="Close zoom"
            >
                <XIcon />
            </button>

            {/* Main Content */}
            <div 
                className="relative w-full h-full flex items-center justify-center"
                onClick={e => e.stopPropagation()}
            >
                {/* Image/Video Display */}
                {media[currentIndex].type === 'image' ? (
                    <motion.img 
                        key={currentIndex}
                        src={media[currentIndex].url} 
                        alt="Zoomed view"
                        className="max-w-4xl max-h-[85vh] w-full h-auto object-contain rounded-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    />
                ) : (
                    <motion.video 
                        key={currentIndex}
                        src={media[currentIndex].url} 
                        autoPlay loop muted playsInline
                        className="max-w-4xl max-h-[85vh] w-full h-auto object-contain rounded-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    />
                )}

                {/* Navigation */}
                {media.length > 1 && (
                    <>
                        <button 
                            onClick={onPrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all z-10"
                            aria-label="Previous image"
                        >
                            <ArrowLeftIcon />
                        </button>
                        <button 
                            onClick={onNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all z-10"
                            aria-label="Next image"
                        >
                            <ArrowRightIcon />
                        </button>

                        {/* Counter Badge */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/20">
                            {currentIndex + 1} / {media.length}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const ItemDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, openAuthModal } = useAuth();
    const navigate = useNavigate();
    const { addItemToCart } = useCart();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    
    const [item, setItem] = useState<Item | null>(null);
    const [relatedItems, setRelatedItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    
    // Variant State
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    
    // Rental State
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalEndDate, setRentalEndDate] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    // Auction State
    const [bidAmount, setBidAmount] = useState<number | ''>('');
    const [isPlacingBid, setIsPlacingBid] = useState(false);

    // Contact Modal State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Zoom Modal State
    const [isZoomOpen, setIsZoomOpen] = useState(false);

    // Scroll Animations
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 400], [0, 1]);
    const headerTranslateY = useTransform(scrollY, [0, 400], [-100, 0]);

    // Gallery State
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const media = useMemo(() => {
        if (!item) return [];
        const baseImages = (item.imageUrls?.length ? item.imageUrls : item.images || []).filter(Boolean);
        const normalized = baseImages.length > 0 ? baseImages : [`https://picsum.photos/seed/${item.id}/1200/1200`];
        const images = normalized.map(url => ({ type: 'image' as const, url }));
        if (item.videoUrl) {
            return [{ type: 'video' as const, url: item.videoUrl }, ...images];
        }
        return images;
    }, [item]);

    useEffect(() => {
        if (media.length > 0 && currentMediaIndex >= media.length) {
            setCurrentMediaIndex(0);
        }
    }, [media.length, currentMediaIndex]);

    useEffect(() => {
        const fetchItem = async () => {
            if (!id) return;
            setIsLoading(true);
            setLoadError(null);
            try {
                const fetchedItem = await itemService.getItemById(id);
                if (fetchedItem) {
                    setItem(fetchedItem);
                    setCurrentMediaIndex(0);
                    const variants = (fetchedItem as any).variants;
                    setSelectedColor(variants?.color?.[0]?.name || null);
                    setSelectedSize(variants?.size?.[0]?.name || null);
                    // Fetch more related items to simulate "Endless" exploring
                    const { items: related } = await itemService.getItems({ category: fetchedItem.category }, { page: 1, limit: 12 });
                    setRelatedItems(related.filter(i => i.id !== fetchedItem.id));
                } else {
                    setItem(null);
                    setLoadError('This item could not be found.');
                }
            } catch (error) {
                console.error(error);
                setLoadError('We could not load this item. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchItem();
    }, [id, navigate]);

    const handleNextMedia = () => {
        if (media.length === 0) return;
        setCurrentMediaIndex((prev) => (prev + 1) % media.length);
    };
    const handlePrevMedia = () => {
        if (media.length === 0) return;
        setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const handleAddToCart = () => {
        if (item) {
            addItemToCart(item, quantity);
            showNotification(`${item.title} added to cart!`);
        }
    };

    const handleBuyNow = () => {
        if (item) {
            addItemToCart(item, quantity);
            navigate('/cart');
        }
    };
    
    const handleRentNow = () => {
        if(!user) { openAuthModal('login'); return; }
        if (!rentalStartDate || !rentalEndDate) {
            showNotification("Please select rental dates.");
            setIsCalendarOpen(true);
            return;
        }
        navigate('/checkout', { state: { item, startDate: rentalStartDate, endDate: rentalEndDate, type: 'rent' } });
    };

    const handlePlaceBid = async () => {
         if(!user) { openAuthModal('login'); return; }
         if (!item?.auctionDetails) return;
         
         const current = item.auctionDetails.currentBid ?? item.auctionDetails.startingBid ?? item.salePrice ?? 0;
         const bid = Number(bidAmount);
         
         if (bid <= current) {
             showNotification(`Bid must be higher than ${currency.symbol}${current}`);
             return;
         }
         
         setIsPlacingBid(true);
         try {
             const updatedItem = await itemService.placeBid(item.id, bid, { id: user.id, name: user.name });
             setItem(updatedItem);
             showNotification("Bid placed successfully!");
             setBidAmount('');
         } catch (error) {
             showNotification(error instanceof Error ? error.message : "Failed to place bid.");
         } finally {
             setIsPlacingBid(false);
         }
    };
    
    const handleActionWithUpdatedItem = (updatedItem: Item) => {
        setItem(updatedItem);
    };
    
    const handleSendMessage = () => {
        if (!user) {
            openAuthModal('login');
            return;
        }
        if (item) {
            navigate(`/profile/messages?sellerId=${item.owner.id}&itemId=${item.id}`);
        }
    };

    if (isLoading && !item) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
    if (!item) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="max-w-md w-full bg-surface rounded-3xl border border-border p-8 text-center space-y-4">
                    <h2 className="text-2xl font-bold font-display text-text-primary">Item unavailable</h2>
                    <p className="text-sm text-text-secondary">{loadError || 'This listing is not available right now.'}</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/browse')}
                            className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
                        >
                            Back to Browse
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const mainPrice = Number(item.salePrice ?? item.rentalPrice ?? 0);
    const stockStatus = item.stock > 10 ? { text: 'In Stock', color: 'text-green-600' } : item.stock > 0 ? { text: `Low Stock (${item.stock} left)`, color: 'text-orange-500' } : { text: 'Out of Stock', color: 'text-red-600' };
    
    const rentalDays = (rentalStartDate && rentalEndDate) 
        ? Math.ceil((new Date(rentalEndDate).getTime() - new Date(rentalStartDate).getTime()) / (1000 * 60 * 60 * 24)) 
        : 0;
    const rentalTotal = rentalDays * (item.rentalPrice || 0);
    const createdAt = (item as any).createdAt || new Date().toISOString();
    const variants = (item as any).variants || {};
    const packageContents = ((item as any).shippingPackageContents || item.packageContents || []) as string[];
    const sellerProfile: SellerProfile = {
        id: item.owner.id,
        name: item.owner.businessName || item.owner.name,
        email: (item as any).owner?.email || '',
        avatar: item.owner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.owner.name || 'Seller')}`,
        following: [],
        followers: [],
        wishlist: [],
        cart: [],
        badges: [],
        memberSince: (item as any).owner?.memberSince || createdAt,
        phone: (item as any).owner?.phone || '',
        about: (item as any).owner?.about,
        verificationLevel: (item as any).owner?.verificationLevel,
        rating: (item as any).owner?.rating ?? item.avgRating ?? 4.8
    };
    const sellerRating = sellerProfile.rating ?? item.avgRating ?? 0;

    return (
        <div className="bg-surface font-sans min-h-screen pb-20">
            {isContactModalOpen && (
                <ContactSellerModal 
                    seller={sellerProfile} 
                    onClose={() => setIsContactModalOpen(false)} 
                    onMessage={handleSendMessage}
                />
            )}

            {/* Image Zoom Modal */}
            <ImageZoomModal 
                media={media}
                currentIndex={currentMediaIndex}
                isOpen={isZoomOpen}
                onClose={() => setIsZoomOpen(false)}
                onPrev={handlePrevMedia}
                onNext={handleNextMedia}
            />

            {/* 2. Unified Sticky Command Bar */}
            <motion.div 
                className="sticky top-[72px] z-30 bg-surface/95 backdrop-blur-xl border-b border-border/60 shadow-lg transition-all duration-300 lg:hidden"
                style={{ opacity: headerOpacity, translateY: headerTranslateY }}
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
                     <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Title & Info */}
                        <div className="flex-1 min-w-0 hidden lg:block">
                            <h1 className="text-xl font-bold font-display text-text-primary truncate">{item.title}</h1>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <StarRating rating={item.avgRating} size="sm" /> 
                                <span>({item.reviews.length} reviews)</span>
                                {item.isVerified && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">VERIFIED</span>}
                            </div>
                        </div>

                        {/* Right: Actions (Desktop & Tablet) */}
                        <div className="flex items-center justify-between lg:justify-end gap-4 flex-1">
                             {/* Price Display */}
                             <div className="text-left lg:text-right">
                                <div className="flex items-baseline justify-start lg:justify-end gap-2">
                                     <span className="text-2xl font-black text-text-primary tracking-tight font-display">{currency.symbol}{mainPrice.toFixed(2)}</span>
                                     {item.compareAtPrice && <span className="text-sm text-text-secondary line-through">{currency.symbol}{item.compareAtPrice.toFixed(2)}</span>}
                                </div>
                                {item.listingType === 'rent' && <p className="text-xs text-text-secondary text-right">per day</p>}
                             </div>

                             {/* Action Buttons */}
                             <div className="flex items-center gap-3">
                                 {/* Rental Date Picker Trigger */}
                                 {item.listingType === 'rent' && (
                                     <button 
                                        onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                                        className="hidden md:flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl font-bold text-sm transition-colors"
                                    >
                                        <CalendarIcon /> {rentalStartDate && rentalEndDate ? `${new Date(rentalStartDate).toLocaleDateString()}...` : "Dates"}
                                    </button>
                                 )}

                                 {/* Buy Buttons */}
                                 {(item.listingType === 'sale' || item.listingType === 'both') && (
                                     <>
                                        <button onClick={handleBuyNow} className="px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wide">
                                            Buy Now
                                        </button>
                                        <button onClick={handleAddToCart} className="px-4 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all text-sm flex items-center justify-center">
                                            <CartIcon/>
                                        </button>
                                     </>
                                 )}

                                 {item.listingType === 'rent' && (
                                     <button onClick={handleRentNow} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wide">
                                         Rent Now
                                     </button>
                                 )}
                                 
                                 <WishlistButton itemId={item.id} className="!relative !top-0 !right-0 !bg-transparent !text-text-secondary hover:!text-red-500 !p-2" />
                             </div>
                        </div>
                     </div>
                </div>
                {/* Calendar Dropdown */}
                {isCalendarOpen && (
                     <div className="absolute top-full right-4 lg:right-8 z-40 bg-white dark:bg-dark-surface shadow-2xl rounded-xl border border-border p-1 animate-fade-in-up">
                         <Calendar 
                            startDate={rentalStartDate} 
                            endDate={rentalEndDate} 
                            setStartDate={setRentalStartDate} 
                            setEndDate={setRentalEndDate} 
                            onClose={() => setIsCalendarOpen(false)} 
                            bookedDates={item.bookedDates}
                        />
                     </div>
                )}
            </motion.div>
            
            {/* Page Content Grid - Two Column Layout */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    
                    {/* Left Column: Image Showcase Panel (Desktop: 2 cols, Mobile: full width) */}
                    <div className="lg:col-span-2 order-first">
                        {/* Main Image Container with Click-to-Zoom */}
                        <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-surface dark:to-dark-surface/80 rounded-2xl overflow-hidden shadow-lg border border-border/40 mb-4 cursor-pointer hover:shadow-xl transition-all" onClick={() => setIsZoomOpen(true)}>
                            <div className="aspect-square flex items-center justify-center relative group overflow-hidden bg-gray-100 dark:bg-gray-900">
                                {/* Background Blur */}
                                <div className="absolute inset-0 blur-2xl opacity-20">
                                    <img src={media[currentMediaIndex].url} alt="bg-blur" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                                
                                {/* Main Image */}
                                <AnimatePresence initial={false}>
                                    <motion.div key={currentMediaIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="absolute inset-0 flex items-center justify-center p-4">
                                        {media[currentMediaIndex].type === 'image' ? (
                                            <motion.img 
                                                src={media[currentMediaIndex].url} 
                                                alt={item.title} 
                                                className="w-full h-full object-contain max-w-full max-h-full drop-shadow-xl" 
                                                whileHover={{ scale: 1.03 }} 
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                                loading="eager"
                                            />
                                        ) : (
                                            <motion.video 
                                                src={media[currentMediaIndex].url} 
                                                autoPlay loop muted playsInline 
                                                className="w-full h-full object-contain max-w-full max-h-full drop-shadow-xl rounded-lg" 
                                                whileHover={{ scale: 1.03 }} 
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                                
                                {/* Media Counter + Click to Zoom Hint */}
                                <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                                    <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-white/20">
                                        {currentMediaIndex + 1} / {media.length}
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[10px] font-semibold shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to zoom
                                    </div>
                                </div>
                                
                                {/* Navigation Buttons (Hidden on mobile, show on hover) */}
                                {media.length > 1 && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); handlePrevMedia(); }} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 shadow-lg border border-white/20"><ArrowLeftIcon/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleNextMedia(); }} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 shadow-lg border border-white/20"><ArrowRightIcon/></button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        {media.length > 1 && (
                            <div className="bg-white dark:bg-dark-surface rounded-xl p-4 border border-border/40 shadow-sm">
                                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Gallery ({media.length})</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {media.map((m, index) => (
                                        <button 
                                            key={index} 
                                            onClick={() => setCurrentMediaIndex(index)} 
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 ${
                                                currentMediaIndex === index 
                                                    ? 'border-primary ring-2 ring-primary/30 shadow-lg scale-105' 
                                                    : 'border-border/40 hover:border-primary/50 shadow-sm'
                                            }`}
                                        >
                                            {m.type === 'image' ? (
                                                <img 
                                                    src={m.url} 
                                                    alt={`thumbnail ${index}`} 
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-115"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-xs">
                                                    <span>▶</span>
                                                </div>
                                            )}
                                            {currentMediaIndex === index && (
                                                <div className="absolute inset-0 ring-2 ring-primary pointer-events-none rounded-lg" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Product Details & Actions (Desktop: 3 cols) */}
                    <div className="lg:col-span-3">
                        {/* Product Title & Price (Desktop) */}
                        <div className="hidden lg:block mb-8 pb-8 border-b border-border/40">
                            <h1 className="text-3xl font-bold font-display text-text-primary mb-4">{item.title}</h1>
                            <div className="flex items-center gap-3 mb-4">
                                <StarRating rating={item.avgRating} /> 
                                <span className="text-sm text-text-secondary font-medium">({item.reviews.length} reviews)</span>
                                {item.isVerified && <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">VERIFIED</span>}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-black text-text-primary font-display">{currency.symbol}{mainPrice.toFixed(2)}</span>
                                    {item.compareAtPrice && <span className="text-lg text-text-secondary line-through">{currency.symbol}{item.compareAtPrice.toFixed(2)}</span>}
                                </div>
                                {item.listingType === 'rent' && <p className="text-sm text-text-secondary font-medium">per day</p>}
                                <div className={`text-sm font-semibold ${stockStatus.color}`}>{stockStatus.text}</div>
                            </div>
                        </div>

                        {/* Action Buttons & Rental Picker */}
                        <div className="hidden lg:block bg-white dark:bg-dark-surface rounded-2xl p-6 border border-border/40 shadow-lg mb-8 space-y-4">
                            {/* Rental Date Picker */}
                            {item.listingType === 'rent' && (
                                <button 
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl font-bold text-sm transition-colors relative"
                                >
                                    <CalendarIcon /> 
                                    {rentalStartDate && rentalEndDate ? `${new Date(rentalStartDate).toLocaleDateString()} to ${new Date(rentalEndDate).toLocaleDateString()}` : "Select Rental Dates"}
                                </button>
                            )}
                            
                            {/* Primary Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {(item.listingType === 'sale' || item.listingType === 'both') && (
                                    <>
                                        <button onClick={handleBuyNow} className="col-span-2 py-3 px-4 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                            <LightningIcon /> Buy Now
                                        </button>
                                        <button onClick={handleAddToCart} className="py-3 px-4 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center justify-center">
                                            <CartIcon /> Add
                                        </button>
                                    </>
                                )}
                                
                                {item.listingType === 'rent' && (
                                    <button onClick={handleRentNow} className="col-span-2 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                        <LightningIcon /> Rent Now
                                    </button>
                                )}
                            </div>
                            
                            {/* Secondary Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                <button onClick={() => setIsContactModalOpen(true)} className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-text-primary font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                    <MessageCircleIcon /> Message
                                </button>
                                <WishlistButton itemId={item.id} className="!relative !top-0 !right-0 !w-full !h-auto !py-2.5 !px-3 !bg-gray-100 !text-text-secondary hover:!bg-red-50 hover:!text-red-500 !border-0 !rounded-lg" />
                            </div>
                        </div>

                        {/* Mobile Title Block - Shown at top on mobile */}
                        <div className="lg:hidden mb-6 pb-6 border-b border-border/40">
                            <h1 className="text-2xl font-bold font-display text-text-primary mb-3">{item.title}</h1>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl font-black text-primary">{currency.symbol}{mainPrice.toFixed(2)}</span>
                                {item.compareAtPrice && <span className="text-sm text-text-secondary line-through">{currency.symbol}{item.compareAtPrice.toFixed(2)}</span>}
                                {stockStatus.text === 'In Stock' && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-2">In Stock</span>}
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <StarRating rating={item.avgRating} size="sm" /> 
                                <span className="text-xs text-text-secondary font-medium">({item.reviews.length})</span>
                            </div>

                            {/* Mobile Action Buttons */}
                            <div className="space-y-3">
                                {(item.listingType === 'sale' || item.listingType === 'both') && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={handleBuyNow} className="col-span-2 py-3 px-4 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                            <LightningIcon /> Buy Now
                                        </button>
                                        <button onClick={handleAddToCart} className="py-3 px-4 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center justify-center">
                                            <CartIcon /> Add Cart
                                        </button>
                                        <button onClick={() => setIsContactModalOpen(true)} className="py-3 px-4 bg-gray-100 text-text-primary font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm">
                                            <MessageCircleIcon /> Message
                                        </button>
                                    </div>
                                )}
                                
                                {item.listingType === 'rent' && (
                                    <button onClick={handleRentNow} className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                        <LightningIcon /> Rent Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Calendar Dropdown (desktop only) */}
                {isCalendarOpen && (
                    <div className="fixed lg:absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white dark:bg-dark-surface shadow-2xl rounded-xl border border-border p-4 animate-fade-in-up">
                        <Calendar 
                            startDate={rentalStartDate} 
                            endDate={rentalEndDate} 
                            setStartDate={setRentalStartDate} 
                            setEndDate={setRentalEndDate} 
                            onClose={() => setIsCalendarOpen(false)} 
                            bookedDates={item.bookedDates}
                        />
                    </div>
                )}


                {/* Description */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2"><LightningIcon/> Highlights</h2>
                    <div className="prose prose-lg text-text-secondary leading-relaxed max-w-none font-medium">
                        {item.description.split('\n').map((paragraph, idx) => (
                            <p key={idx} className="mb-4">{paragraph}</p>
                        ))}
                    </div>
                </Section>
                
                {/* Variants */}
                {(variants?.color || variants?.size) && (
                    <Section className="mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-surface-soft rounded-2xl border border-border">
                            {variants?.color && (
                                <div>
                                    <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-text-secondary">Color: <span className="text-text-primary">{selectedColor}</span></h3>
                                    <div className="flex flex-wrap gap-3">
                                        {variants.color.map((color: any) => (
                                            <button key={color.name} onClick={() => setSelectedColor(color.name)} title={color.name} style={{ backgroundColor: color.hex }} className={`w-10 h-10 rounded-full shadow-sm ring-offset-2 ring-offset-surface transition-all ${selectedColor === color.name ? 'ring-2 ring-primary scale-110' : 'hover:scale-105'}`}></button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {variants?.size && (
                                <div>
                                    <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-text-secondary">Size: <span className="text-text-primary">{selectedSize}</span></h3>
                                    <div className="flex flex-wrap gap-3">
                                        {variants.size.map((size: any) => (
                                            <button key={size.name} onClick={() => setSelectedSize(size.name)} className={`px-4 py-2 text-sm font-semibold border rounded-lg transition-all ${selectedSize === size.name ? 'border-primary bg-primary text-white shadow-md' : 'border-border bg-white hover:border-gray-400 text-text-primary'}`}>{size.name}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Specifications */}
                <Section className="mb-12">
                    <h3 className="text-2xl font-bold font-display mb-6 text-text-primary">Specifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 bg-surface p-6 rounded-2xl border border-border/60 shadow-sm">
                        {item.specifications?.map(spec => (
                            <div key={spec.key} className="flex justify-between py-3 border-b border-border/40 last:border-0">
                                <span className="text-text-secondary font-medium">{spec.key}</span>
                                <span className="font-bold text-text-primary">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Package Contents */}
                {packageContents.length > 0 && (
                    <Section className="mb-12">
                        <div className="bg-surface-soft p-8 rounded-2xl border border-border flex items-start gap-6">
                            <div className="p-4 bg-white rounded-full shadow-sm text-primary"><PackageIcon /></div>
                            <div>
                                <h3 className="text-xl font-bold font-display mb-3 text-text-primary">What's in the Box?</h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {packageContents.map((content, i) => (
                                        <li key={i} className="flex items-center gap-2 text-text-secondary font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {content}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Section>
                )}
                
                {/* Media Gallery Grid */}
                {media.length > 1 && (
                    <Section className="mb-16">
                        <h3 className="text-2xl font-bold font-display mb-8 text-text-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V2.25a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 2.25v16.5a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                            Gallery
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                            {media.map((m, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => setCurrentMediaIndex(index)} 
                                    className={`relative aspect-square rounded-lg md:rounded-xl overflow-hidden border-2 transition-all duration-300 group transform hover:scale-105 ${
                                        currentMediaIndex === index 
                                            ? 'border-primary ring-2 ring-primary/30 shadow-lg scale-105' 
                                            : 'border-border/40 hover:border-primary/50 shadow-md'
                                    }`}
                                >
                                    {m.type === 'image' ? ( 
                                        <img 
                                            src={m.url} 
                                            alt={`thumbnail ${index}`} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-115"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
                                        </div>
                                    )}
                                    {m.type === 'video' && (
                                        <div className="absolute inset-0 border-2 border-white/30 rounded-lg md:rounded-xl pointer-events-none" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Reviews */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-8 text-text-primary">Reviews & Ratings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div className="bg-surface-soft p-6 rounded-2xl text-center border border-border flex flex-col justify-center items-center shadow-inner">
                            <p className="text-6xl font-black text-text-primary mb-2">{item.avgRating.toFixed(1)}</p>
                            <StarRating rating={item.avgRating} className="justify-center mb-2" />
                            <p className="text-sm font-semibold text-text-secondary">{item.reviews.length} Verified Reviews</p>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            {item.reviews.length > 0 ? (item.reviews.slice(0, 3).map(review => <ReviewCard key={review.id} review={review} />)) : <p className="text-center text-text-secondary pt-8 italic">No reviews yet. Be the first!</p>}
                        </div>
                        </div>
                        <ReviewForm itemId={item.id} onReviewSubmit={handleActionWithUpdatedItem} />
                </Section>
                
                {/* Q&A */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Questions & Answers</h2>
                    <div className="space-y-4">
                        {item.questions && item.questions.length > 0 ? (
                            item.questions.map(q => <QuestionCard key={q.id} question={q} itemId={item.id} sellerName={item.owner.name} />)
                        ) : <p className="text-left text-text-secondary italic">No questions have been asked yet.</p>}
                    </div>
                </Section>

                {/* Seller Profile Card - Moved to Bottom */}
                <Section className="mt-20 pt-16 border-t border-border/50">
                     <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden transform transition-transform hover:scale-[1.01]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <Link to={`/user/${item.owner.id}`} className="group relative flex-shrink-0">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br from-primary to-secondary shadow-lg">
                                    <img src={item.owner.avatar} alt={item.owner.name} className="w-full h-full rounded-full object-cover border-4 border-gray-900" />
                                </div>
                                {sellerProfile.verificationLevel === 'level2' && (
                                    <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full border-4 border-gray-900 shadow-sm" title="Verified Seller">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>
                                    </div>
                                )}
                            </Link>
                            
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sold By</p>
                                <h3 className="text-3xl font-bold font-display mb-2">{sellerProfile.name}</h3>
                                <div className="flex items-center justify-center md:justify-start gap-4 mb-4 text-gray-300">
                                    <div className="flex items-center gap-1"><span className="text-yellow-400">★</span> <span className="font-bold text-white">{sellerRating.toFixed(1)}</span> rating</div>
                                    <span>•</span>
                                    <span>Member since {new Date(sellerProfile.memberSince).getFullYear()}</span>
                                </div>
                                <p className="text-gray-400 max-w-xl mx-auto md:mx-0 leading-relaxed">{sellerProfile.about || "This seller hasn't written a bio yet, but they have great items!"}</p>
                            </div>
                            
                            <div className="flex flex-col gap-3 min-w-[200px]">
                                <button 
                                    onClick={() => setIsContactModalOpen(true)}
                                    className="w-full py-3 px-6 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                                >
                                    Contact Seller
                                </button>
                                <Link 
                                    to={`/user/${item.owner.id}`}
                                    className="w-full py-3 px-6 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-center"
                                >
                                    View Profile
                                </Link>
                            </div>
                        </div>
                     </div>
                </Section>


                {/* Related Items */}
                {relatedItems.length > 0 && (
                     <Section className="mt-20">
                        <h2 className="text-3xl font-bold font-display text-center mb-12 text-text-primary">Explore Similar Products</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {relatedItems.map(relItem => (
                                <ItemCard key={relItem.id} item={relItem} onQuickView={() => {}} />
                            ))}
                        </div>
                         <div className="text-center mt-12">
                             <Link to={`/browse?category=${item.category}`} className="inline-block px-8 py-3 border-2 border-text-primary font-bold rounded-full hover:bg-text-primary hover:text-surface transition-colors uppercase tracking-wider text-sm">
                                View All Similar Items
                            </Link>
                        </div>
                    </Section>
                )}
            </main>
        </div>
    );
};

export default ItemDetailPage;
