
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { itemService } from '../../services/itemService';
import analyticsService from '../../services/analyticsService';
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
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75H3.75a2.25 2.25 0 01-2.25-2.25V9m0 0h18m-3 9h3.75a2.25 2.25 0 002.25-2.25V9m-15 0h18v2.25a2.25 2.25 0 01-2.25 2.25h-5.25a2.25 2.25 0 00-2.25 2.25v3.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-5.25a2.25 2.25 0 00-2.25-2.25H3.75m0 0a3 3 0 00-3 3v6a3 3 0 003 3h15a3 3 0 003-3v-6a3 3 0 00-3-3m-6-4h6" /></svg>;
const CertificateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3.042.512m0 0a9.035 9.035 0 019.042 0m0 0a9.967 9.967 0 016 3.75m0 0a9.035 9.035 0 019.042 0m0 0a9.967 9.967 0 016-3.75m-6 2.25a0 0 0 00-3.042 0m0 0a9.967 9.967 0 010 5.25m0 0a9.035 9.035 0 01-9.042 0m0 0a9.967 9.967 0 010-5.25m0 0a9.035 9.035 0 019.042 0z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25.75 11.25 12 0l11.25 11.25m-11.25 0v7.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-7.5m8.25 0v7.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-7.5" /></svg>;

// --- ANIMATION VARIANTS ---
const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      type: 'spring', 
      stiffness: 40, 
      damping: 15, 
      duration: 0.9,
      delay: 0.1
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 60, damping: 15 },
  },
};

const Section: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <motion.section 
        className={className}
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
    >
        {children}
    </motion.section>
);

// Enhanced Information Card Component
const InfoCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  content: string | string[] | React.ReactNode;
  className?: string;
}> = ({ icon, title, content, className = '' }) => (
  <motion.div 
    className={`bg-gradient-to-br from-gray-50 to-white dark:from-dark-surface dark:to-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all ${className}`}
    variants={itemVariants}
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        {Array.isArray(content) ? (
          <ul className="space-y-1">
            {content.map((item, i) => (
              <li key={i} className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-medium text-text-primary">{content}</p>
        )}
      </div>
    </div>
  </motion.div>
);

// Specifications Grid with Animation
const SpecificationGrid: React.FC<{ specs: Array<{ key: string; value: string }> }> = ({ specs }) => (
  <motion.div 
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
    variants={containerVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
  >
    {specs.map((spec) => (
      <motion.div 
        key={spec.key}
        className="bg-white dark:bg-dark-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        variants={itemVariants}
      >
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{spec.key}</p>
        <p className="text-sm font-semibold text-text-primary">{spec.value}</p>
      </motion.div>
    ))}
  </motion.div>
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
                                <span>â€¢ {rating.toFixed(1)}</span>
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
    const { user, activePersona, openAuthModal } = useAuth();
    const navigate = useNavigate();
    const { addItemToCart } = useCart();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    
    const [item, setItem] = useState<Item | null>(null);
    const [relatedItems, setRelatedItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const viewStartRef = useRef<number | null>(null);
    
    // Variant State
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    
    // Rental State
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalEndDate, setRentalEndDate] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (!item) return;
        viewStartRef.current = Date.now();

        return () => {
            const start = viewStartRef.current;
            if (!start) return;
            const durationMs = Math.max(0, Date.now() - start);
            const ownerId = item.owner?.id;
            if (!ownerId) return;
            if (user?.id && user.id === ownerId) return;

            // Log event to item service
            itemService.logItemEvent({
                action: 'item_view',
                ownerId,
                ownerPersonaId: item.ownerPersonaId || null,
                itemId: item.id,
                itemTitle: item.title,
                listingType: item.listingType,
                actorId: user?.id || null,
                actorPersonaId: activePersona?.id || null,
                actorName: user?.name || user?.email || 'Visitor',
                durationMs
            }).catch(() => {});

            // Also track in analytics service for real-time dashboard
            if (item.ownerPersonaId) {
                analyticsService.recordView(
                    item.id,
                    user?.id || `visitor_${Date.now()}`,
                    user?.name || 'Visitor',
                    durationMs,
                    'web',
                    'direct'
                ).catch(() => {});
            }
        };
    }, [item, user?.id, activePersona?.id]);
    
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
            
            // Track cart addition analytics
            if (item.ownerPersonaId) {
                analyticsService.recordCartAdd(
                    item.id,
                    user?.id || 'anonymous',
                    user?.name || 'Visitor',
                    quantity
                ).catch(error => console.warn('Analytics cart tracking failed:', error));
            }
            
            showNotification(`${item.title} added to cart!`);
        }
    };

    const handleBuyNow = () => {
        if (item) {
            addItemToCart(item, quantity);
            
            // Track cart addition analytics
            if (item.ownerPersonaId) {
                analyticsService.recordCartAdd(
                    item.id,
                    user?.id || 'anonymous',
                    user?.name || 'Visitor',
                    quantity
                ).catch(error => console.warn('Analytics cart tracking failed:', error));
            }
            
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

    if (isLoading && !item) return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <motion.div 
              className="space-y-8 w-full max-w-6xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left skeleton */}
                    <motion.div className="lg:col-span-2 space-y-4">
                        <motion.div 
                          className="aspect-square bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="grid grid-cols-5 gap-2">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="aspect-square bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg"
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                />
                            ))}
                        </div>
                    </motion.div>
                    {/* Right skeleton */}
                    <motion.div className="lg:col-span-3 space-y-4">
                        <motion.div 
                          className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg w-3/4"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div 
                          className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg w-1/2"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
                        />
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded w-full"
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
    if (!item) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <motion.div 
                  className="max-w-md w-full bg-surface rounded-3xl border border-border p-8 text-center space-y-4 shadow-lg"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 60 }}
                >
                    <motion.div 
                      className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600 dark:text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    </motion.div>
                    <h2 className="text-2xl font-bold font-display text-text-primary">Item unavailable</h2>
                    <p className="text-sm text-text-secondary">{loadError || 'This listing is not available right now.'}</p>
                    <div className="flex flex-col items-center justify-center gap-3 pt-4">
                        <motion.button
                            onClick={() => navigate('/browse')}
                            className="px-6 py-2 rounded-full border-2 border-text-primary text-sm font-semibold hover:bg-text-primary hover:text-white transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Browse Products
                        </motion.button>
                        <motion.button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 rounded-full bg-text-primary text-white text-sm font-semibold hover:shadow-lg transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Try Again
                        </motion.button>
                    </div>
                </motion.div>
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
                className="sticky top-[72px] z-30 bg-gradient-to-b from-surface via-surface/95 to-surface/90 backdrop-blur-xl border-b border-border/60 shadow-lg transition-all duration-300 lg:hidden"
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
                    <motion.div 
                      className="lg:col-span-2 order-first"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                        {/* Main Image Container with Click-to-Zoom */}
                        <motion.div 
                          className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-surface dark:to-dark-surface/80 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 mb-4 cursor-pointer hover:shadow-2xl transition-all"
                          onClick={() => setIsZoomOpen(true)}
                          whileHover={{ boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}
                        >
                            <div className="aspect-square flex items-center justify-center relative group overflow-hidden bg-gray-100 dark:bg-gray-900">
                                {/* Background Blur */}
                                <div className="absolute inset-0 blur-2xl opacity-20">
                                    <img src={media[currentMediaIndex].url} alt="bg-blur" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                                
                                {/* Main Image */}
                                <AnimatePresence initial={false}>
                                    <motion.div 
                                      key={currentMediaIndex} 
                                      initial={{ opacity: 0, scale: 0.95 }} 
                                      animate={{ opacity: 1, scale: 1 }} 
                                      exit={{ opacity: 0, scale: 0.95 }} 
                                      transition={{ duration: 0.4, ease: 'easeOut' }}
                                      className="absolute inset-0 flex items-center justify-center p-4"
                                    >
                                        {media[currentMediaIndex].type === 'image' ? (
                                            <motion.img 
                                                src={media[currentMediaIndex].url} 
                                                alt={item.title} 
                                                className="w-full h-full object-contain max-w-full max-h-full drop-shadow-xl" 
                                                whileHover={{ scale: 1.05 }} 
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                                loading="eager"
                                            />
                                        ) : (
                                            <motion.video 
                                                src={media[currentMediaIndex].url} 
                                                autoPlay loop muted playsInline 
                                                className="w-full h-full object-contain max-w-full max-h-full drop-shadow-xl rounded-lg" 
                                                whileHover={{ scale: 1.05 }} 
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                                
                                {/* Media Counter + Click to Zoom Hint */}
                                <motion.div 
                                  className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2"
                                  initial={{ opacity: 0, y: -10 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                    <motion.div 
                                      className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-white/30"
                                      whileHover={{ scale: 1.1 }}
                                    >
                                        {currentMediaIndex + 1} / {media.length}
                                    </motion.div>
                                    <motion.div 
                                      className="bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                      initial={{ opacity: 0 }}
                                      whileHover={{ opacity: 1 }}
                                    >
                                        Click to zoom
                                    </motion.div>
                                </motion.div>
                                
                                {/* Navigation Buttons (Hidden on mobile, show on hover) */}
                                {media.length > 1 && (
                                    <>
                                        <motion.button 
                                          onClick={(e) => { e.stopPropagation(); handlePrevMedia(); }} 
                                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg border border-white/20"
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                            <ArrowLeftIcon/>
                                        </motion.button>
                                        <motion.button 
                                          onClick={(e) => { e.stopPropagation(); handleNextMedia(); }} 
                                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg border border-white/20"
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                            <ArrowRightIcon/>
                                        </motion.button>
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* Thumbnail Gallery */}
                        {media.length > 1 && (
                            <motion.div 
                              className="bg-white dark:bg-dark-surface rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Gallery ({media.length})</p>
                                <motion.div 
                                  className="grid grid-cols-4 sm:grid-cols-5 gap-2"
                                  variants={containerVariants}
                                  initial="hidden"
                                  whileInView="visible"
                                  viewport={{ once: true }}
                                >
                                    {media.map((m, index) => (
                                        <motion.button 
                                            key={index} 
                                            onClick={() => setCurrentMediaIndex(index)} 
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 transform ${
                                                currentMediaIndex === index 
                                                    ? 'border-primary ring-2 ring-primary/40 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 shadow-sm'
                                            }`}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {m.type === 'image' ? (
                                                <img 
                                                    src={m.url} 
                                                    alt={`thumbnail ${index}`} 
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-125"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-xs font-bold">
                                                    â–¶
                                                </div>
                                            )}
                                            {currentMediaIndex === index && (
                                                <motion.div 
                                                  className="absolute inset-0 ring-2 ring-primary pointer-events-none rounded-lg"
                                                  layoutId="activeThumb"
                                                />
                                            )}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Right Column: Product Details & Actions (Desktop: 3 cols) */}
                    <motion.div 
                      className="lg:col-span-3"
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        {/* Product Title & Price (Desktop) */}
                        <motion.div 
                          className="hidden lg:block mb-8 pb-8 border-b-2 border-gradient-to-r from-blue-200 to-transparent dark:border-blue-900/30"
                          initial={{ opacity: 0, y: -20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6 }}
                        >
                            <motion.h1 
                              className="text-4xl font-bold font-display text-text-primary mb-4 leading-tight"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                            >
                              {item.title}
                            </motion.h1>
                            <motion.div 
                              className="flex items-center gap-3 mb-6"
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                                <StarRating rating={item.avgRating} /> 
                                <span className="text-sm text-text-secondary font-medium">({item.reviews.length} reviews)</span>
                                {item.isVerified && (
                                  <motion.span 
                                    className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 text-blue-800 dark:text-blue-200 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1"
                                    initial={{ scale: 0 }}
                                    whileInView={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                  >
                                    <CheckIcon className="w-3 h-3" /> VERIFIED
                                  </motion.span>
                                )}
                            </motion.div>
                            <motion.div 
                              className="space-y-3"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl font-black text-text-primary font-display tracking-tight">{currency.symbol}{mainPrice.toFixed(2)}</span>
                                    {item.compareAtPrice && (
                                      <span className="text-2xl text-text-secondary line-through opacity-60 font-semibold">{currency.symbol}{item.compareAtPrice.toFixed(2)}</span>
                                    )}
                                </div>
                                {item.listingType === 'rent' && <p className="text-base text-text-secondary font-medium">per day</p>}
                                <div className={`text-base font-bold tracking-wide ${stockStatus.color} flex items-center gap-2`}>
                                  {stockStatus.text === 'In Stock' ? <CheckIcon className="w-5 h-5" /> : <InfoIcon className="w-5 h-5" />}
                                  {stockStatus.text}
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Action Buttons & Rental Picker */}
                        <motion.div 
                          className="hidden lg:block bg-gradient-to-br from-white to-gray-50 dark:from-dark-surface dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-8 space-y-4"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                            {/* Rental Date Picker */}
                            {item.listingType === 'rent' && (
                                <motion.button 
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 text-text-primary rounded-xl font-bold text-sm transition-all"
                                    whileHover={{ scale: 1.02, boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <CalendarIcon /> 
                                    {rentalStartDate && rentalEndDate ? `${new Date(rentalStartDate).toLocaleDateString()} to ${new Date(rentalEndDate).toLocaleDateString()}` : "Select Rental Dates"}
                                </motion.button>
                            )}
                            
                            {/* Primary Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {(item.listingType === 'sale' || item.listingType === 'both') && (
                                    <>
                                        <motion.button 
                                          onClick={handleBuyNow} 
                                          className="col-span-2 py-3 px-4 bg-gradient-to-r from-secondary to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                          whileHover={{ scale: 1.05, translateY: -2 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                            <LightningIcon /> Buy Now
                                        </motion.button>
                                        <motion.button 
                                          onClick={handleAddToCart} 
                                          className="py-3 px-4 bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold rounded-xl hover:from-primary/30 hover:to-primary/20 transition-all border-2 border-primary/30 flex items-center justify-center gap-1"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                            <CartIcon /> Add
                                        </motion.button>
                                    </>
                                )}
                                
                                {item.listingType === 'rent' && (
                                    <motion.button 
                                      onClick={handleRentNow} 
                                      className="col-span-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                      whileHover={{ scale: 1.05, translateY: -2 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                        <LightningIcon /> Rent Now
                                    </motion.button>
                                )}
                            </div>
                            
                            {/* Secondary Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <motion.button 
                                  onClick={() => setIsContactModalOpen(true)} 
                                  className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-text-primary font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                    <MessageCircleIcon /> Message
                                </motion.button>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <WishlistButton itemId={item.id} className="!relative !top-0 !right-0 !w-full !h-auto !py-2.5 !px-3 !bg-gray-100 dark:!bg-gray-800 !text-text-secondary hover:!bg-red-50 dark:hover:!bg-red-900/30 hover:!text-red-500 !border-0 !rounded-lg !flex !items-center !justify-center" />
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Mobile Title Block - Shown at top on mobile */}
                        <motion.div 
                          className="lg:hidden mb-6 pb-6 border-b border-gray-200 dark:border-gray-700"
                          initial={{ opacity: 0, y: -20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                            <motion.h1 
                              className="text-2xl font-bold font-display text-text-primary mb-3"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                            >
                              {item.title}
                            </motion.h1>
                            <motion.div 
                              className="flex items-center gap-2 mb-4"
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                                <span className="text-3xl font-black text-primary">{currency.symbol}{mainPrice.toFixed(2)}</span>
                                {item.compareAtPrice && <span className="text-sm text-text-secondary line-through opacity-60">{currency.symbol}{item.compareAtPrice.toFixed(2)}</span>}
                                {stockStatus.text === 'In Stock' && <motion.span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full ml-2" whileHover={{ scale: 1.05 }}>In Stock</motion.span>}
                            </motion.div>
                            <motion.div 
                              className="flex items-center gap-2 mb-4"
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.15 }}
                            >
                                <StarRating rating={item.avgRating} size="sm" /> 
                                <span className="text-xs text-text-secondary font-medium">({item.reviews.length})</span>
                            </motion.div>

                            {/* Mobile Action Buttons */}
                            <motion.div 
                              className="space-y-3"
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                                {(item.listingType === 'sale' || item.listingType === 'both') && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <motion.button 
                                          onClick={handleBuyNow} 
                                          className="col-span-2 py-3 px-4 bg-gradient-to-r from-secondary to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                          whileHover={{ scale: 1.05, translateY: -2 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                            <LightningIcon /> Buy Now
                                        </motion.button>
                                        <motion.button 
                                          onClick={handleAddToCart} 
                                          className="py-3 px-4 bg-primary/20 text-primary font-bold rounded-xl hover:bg-primary/30 transition-all border-2 border-primary/30 flex items-center justify-center gap-2"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                            <CartIcon /> Add Cart
                                        </motion.button>
                                        <motion.button 
                                          onClick={() => setIsContactModalOpen(true)} 
                                          className="py-3 px-4 bg-gray-100 dark:bg-gray-800 text-text-primary font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                            <MessageCircleIcon /> Message
                                        </motion.button>
                                    </div>
                                )}
                                
                                {item.listingType === 'rent' && (
                                    <motion.button 
                                      onClick={handleRentNow} 
                                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                      whileHover={{ scale: 1.05, translateY: -2 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                        <LightningIcon /> Rent Now
                                    </motion.button>
                                )}
                            </motion.div>
                        </motion.div>
                    </motion.div>

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


                {/* Price Details Section */}
                {item.compareAtPrice && item.compareAtPrice > mainPrice && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Price Information</h2>
                        <motion.div 
                          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800"
                          variants={itemVariants}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Regular Price</p>
                                    <p className="text-2xl font-bold line-through text-text-secondary">{currency.symbol}{item.compareAtPrice.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-2">You Save</p>
                                        <p className="text-3xl font-black text-green-600 dark:text-green-400">{(((item.compareAtPrice - mainPrice) / item.compareAtPrice) * 100).toFixed(0)}%</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Sale Price</p>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">{currency.symbol}{mainPrice.toFixed(2)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </Section>
                )}

                {/* Description */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2"><LightningIcon/> Product Highlights</h2>
                    <div className="prose prose-lg text-text-secondary leading-relaxed max-w-none font-medium bg-gradient-to-br from-gray-50 to-white dark:from-dark-surface dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                        {item.description.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>
                        ))}
                    </div>
                </Section>

                {/* Key Product Details Section */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Product Details</h2>
                    <motion.div 
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                      {item.brand && <InfoCard icon={<CheckIcon />} title="Brand" content={item.brand} />}
                      {item.condition && <InfoCard icon={<ShieldIcon />} title="Condition" content={`${item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}`} />}
                      {item.sku && <InfoCard icon={<InfoIcon />} title="SKU" content={item.sku} />}
                      {item.productType && <InfoCard icon={<InfoIcon />} title="Type" content={item.productType} />}
                      {item.itemType && <InfoCard icon={<PackageIcon />} title="Item Type" content={item.itemType === 'digital' ? 'Digital Product' : 'Physical Product'} />}
                      {(item.stock !== undefined) && <InfoCard icon={<PackageIcon />} title="Stock Available" content={`${item.stock} units`} />}
                    </motion.div>
                </Section>
                
                {/* Variants */}
                {(variants?.color || variants?.size) && (
                    <Section className="mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                            {variants?.color && (
                                <motion.div variants={itemVariants}>
                                    <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-secondary">Available Colors: <span className="text-text-primary capitalize">{selectedColor}</span></h3>
                                    <div className="flex flex-wrap gap-3">
                                        {variants.color.map((color: any) => (
                                            <motion.button 
                                              key={color.name} 
                                              onClick={() => setSelectedColor(color.name)} 
                                              title={color.name} 
                                              style={{ backgroundColor: color.hex }} 
                                              className={`w-10 h-10 rounded-full shadow-sm ring-offset-2 ring-offset-surface transition-all border-2 ${selectedColor === color.name ? 'ring-2 ring-primary scale-110 border-white dark:border-gray-800' : 'hover:scale-105 border-gray-200 dark:border-gray-700'}`}
                                              whileHover={{ scale: 1.15 }}
                                              whileTap={{ scale: 0.95 }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            {variants?.size && (
                                <motion.div variants={itemVariants}>
                                    <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-secondary">Available Sizes: <span className="text-text-primary">{selectedSize}</span></h3>
                                    <div className="flex flex-wrap gap-3">
                                        {variants.size.map((size: any) => (
                                            <motion.button 
                                              key={size.name} 
                                              onClick={() => setSelectedSize(size.name)} 
                                              className={`px-4 py-2 text-sm font-semibold border-2 rounded-lg transition-all ${selectedSize === size.name ? 'border-primary bg-primary text-white shadow-md' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface hover:border-primary text-text-primary'}`}
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                            >{size.name}</motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Specifications - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.883.883 2.318.883 3.201 0l6.718-6.718c.882-.883.882-2.318 0-3.201L11.589 3.66a2.25 2.25 0 00-1.591-.66H9.569z" /></svg>
                        Technical Specifications
                    </h2>
                    {item.specifications && item.specifications.length > 0 ? (
                        <SpecificationGrid specs={item.specifications} />
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No specifications provided</p>
                        </motion.div>
                    )}
                </Section>

                {/* Rental Details */}
                {(item.listingType === 'rent' || item.listingType === 'both') && item.rentalRates && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                            <CalendarIcon />
                            Rental Information
                        </h2>
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.rentalRates.hourly && (
                                <InfoCard 
                                  icon={<CalendarIcon />}
                                  title="Hourly Rate"
                                  content={`${currency.symbol}${item.rentalRates.hourly.toFixed(2)}/hr`}
                                />
                            )}
                            {item.rentalRates.daily && (
                                <InfoCard 
                                  icon={<CalendarIcon />}
                                  title="Daily Rate"
                                  content={`${currency.symbol}${item.rentalRates.daily.toFixed(2)}/day`}
                                />
                            )}
                            {item.rentalRates.weekly && (
                                <InfoCard 
                                  icon={<CalendarIcon />}
                                  title="Weekly Rate"
                                  content={`${currency.symbol}${item.rentalRates.weekly.toFixed(2)}/week`}
                                />
                            )}
                            {item.minRentalDuration && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Min Duration"
                                  content={`${item.minRentalDuration} days`}
                                />
                            )}
                            {item.securityDeposit && (
                                <InfoCard 
                                  icon={<ShieldIcon />}
                                  title="Security Deposit"
                                  content={`${currency.symbol}${item.securityDeposit.toFixed(2)}`}
                                />
                            )}
                        </motion.div>
                    </Section>
                )}

                {/* Auction Details */}
                {item.listingType === 'auction' && item.auctionDetails && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                            <GavelIcon />
                            Auction Information
                        </h2>
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            <InfoCard 
                              icon={<GavelIcon />}
                              title="Starting Bid"
                              content={`${currency.symbol}${item.auctionDetails.startingBid.toFixed(2)}`}
                            />
                            <InfoCard 
                              icon={<GavelIcon />}
                              title="Current Bid"
                              content={`${currency.symbol}${item.auctionDetails.currentBid.toFixed(2)}`}
                            />
                            <InfoCard 
                              icon={<InfoIcon />}
                              title="Total Bids"
                              content={`${item.auctionDetails.bidCount} bids`}
                            />
                            {item.reservePrice && (
                                <InfoCard 
                                  icon={<ShieldIcon />}
                                  title="Reserve Price"
                                  content={`${currency.symbol}${item.reservePrice.toFixed(2)}`}
                                />
                            )}
                            {item.buyNowPrice && (
                                <InfoCard 
                                  icon={<LightningIcon />}
                                  title="Buy Now Price"
                                  content={`${currency.symbol}${item.buyNowPrice.toFixed(2)}`}
                                />
                            )}
                        </motion.div>
                    </Section>
                )}

                {/* Digital Product Details */}
                {item.itemType === 'digital' && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            Digital Product Information
                        </h2>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.licenseType && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="License Type"
                                  content={item.licenseType}
                                />
                            )}
                            {item.licenseDescription && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="License Details"
                                  content={item.licenseDescription}
                                />
                            )}
                        </motion.div>
                    </Section>
                )}

                {/* Supplier Information */}
                {item.supplierInfo && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                            <InfoIcon />
                            Supplier Information
                        </h2>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.supplierInfo.name && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Supplier Name"
                                  content={item.supplierInfo.name}
                                />
                            )}
                            {item.supplierInfo.processingTimeDays && (
                                <InfoCard 
                                  icon={<CalendarIcon />}
                                  title="Processing Time"
                                  content={`${item.supplierInfo.processingTimeDays} days`}
                                />
                            )}
                            {item.supplierInfo.originCountry && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Supplier Country"
                                  content={item.supplierInfo.originCountry}
                                />
                            )}
                            {item.supplierInfo.rating && (
                                <InfoCard 
                                  icon={<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.576 0l-4.725 2.885a.562.562 0 01-.84-.61l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>}
                                  title="Supplier Rating"
                                  content={`${item.supplierInfo.rating.toFixed(1)}/5`}
                                />
                            )}
                        </motion.div>
                    </Section>
                )}

                {/* Dropship Information */}
                {item.dropshipProfile && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                            <PackageIcon />
                            Dropship Details
                        </h2>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.dropshipProfile.supplierId && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Supplier ID"
                                  content={item.dropshipProfile.supplierId}
                                />
                            )}
                            {item.dropshipProfile.supplierSku && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Supplier SKU"
                                  content={item.dropshipProfile.supplierSku}
                                />
                            )}
                            {item.dropshipProfile.fulfillment && (
                                <InfoCard 
                                  icon={<PackageIcon />}
                                  title="Fulfillment"
                                  content={item.dropshipProfile.fulfillment === 'auto' ? 'Automatic' : 'Manual'}
                                />
                            )}
                            {item.dropshipProfile.minOrderQuantity && (
                                <InfoCard 
                                  icon={<InfoIcon />}
                                  title="Min Order Quantity"
                                  content={`${item.dropshipProfile.minOrderQuantity} units`}
                                />
                            )}
                            {item.dropshipProfile.handlingTimeDays && (
                                <InfoCard 
                                  icon={<CalendarIcon />}
                                  title="Handling Time"
                                  content={`${item.dropshipProfile.handlingTimeDays} days`}
                                />
                            )}
                        </motion.div>
                    </Section>
                )}

                {/* Wholesale Information */}
                {item.wholesalePrice && (
                    <Section className="mb-12">
                        <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Wholesale Price</h2>
                        <motion.div 
                          className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800"
                          variants={itemVariants}
                        >
                            <div className="flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Wholesale Price</p>
                                    <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{currency.symbol}{item.wholesalePrice.toFixed(2)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </Section>
                )}

                {/* Features Section - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <CheckIcon />
                        Key Features
                    </h2>
                    {item.features && item.features.filter(f => f).length > 0 ? (
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.features.filter(f => f).map((feature, idx) => (
                                <motion.div 
                                  key={idx}
                                  className="flex items-start gap-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
                                  variants={itemVariants}
                                >
                                    <span className="flex-shrink-0 p-1.5 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full mt-0.5">
                                        <CheckIcon />
                                    </span>
                                    <p className="text-sm font-medium text-text-primary">{feature}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No features listed</p>
                        </motion.div>
                    )}
                </Section>

                {/* Materials Section - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Materials</h2>
                    {(item as any).materials && (item as any).materials.length > 0 ? (
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {(item as any).materials.map((material: any, idx: number) => (
                                    <motion.span 
                                      key={idx}
                                      className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold"
                                      whileHover={{ scale: 1.05 }}
                                    >
                                        {material.name || material}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No materials specified</p>
                        </motion.div>
                    )}
                </Section>

                {/* Dimensions & Weight - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.75-13.5h-15a2.25 2.25 0 00-2.25 2.25v15a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25z" /></svg>
                        Dimensions & Weight
                    </h2>
                    {item.dimensionsIn || item.weightLbs || item.originCountry || item.originCity ? (
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.dimensionsIn && (
                                <>
                                    <InfoCard icon={<InfoIcon />} title="Length" content={`${item.dimensionsIn.l} in`} />
                                    <InfoCard icon={<InfoIcon />} title="Width" content={`${item.dimensionsIn.w} in`} />
                                    <InfoCard icon={<InfoIcon />} title="Height" content={`${item.dimensionsIn.h} in`} />
                                </>
                            )}
                            {item.weightLbs && <InfoCard icon={<InfoIcon />} title="Weight" content={`${item.weightLbs} lbs`} />}
                            {item.originCountry && <InfoCard icon={<InfoIcon />} title="Origin Country" content={item.originCountry} />}
                            {item.originCity && <InfoCard icon={<InfoIcon />} title="Origin City" content={item.originCity} />}
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No dimensions or weight information provided</p>
                        </motion.div>
                    )}
                </Section>

                {/* Package Contents - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <PackageIcon />
                        What's in the Box?
                    </h2>
                    {packageContents.length > 0 ? (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-8 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-start gap-6">
                            <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-full shadow-sm text-purple-600 dark:text-purple-300 flex-shrink-0"><PackageIcon /></div>
                            <div className="flex-1">
                                <motion.div 
                                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                  variants={containerVariants}
                                  initial="hidden"
                                  whileInView="visible"
                                  viewport={{ once: true }}
                                >
                                    {packageContents.map((content, i) => (
                                        <motion.li key={i} className="flex items-center gap-3 text-text-secondary font-medium list-none" variants={itemVariants}>
                                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0"></span> {content}
                                        </motion.li>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No package contents specified</p>
                        </motion.div>
                    )}
                </Section>

                {/* Care Instructions - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Care Instructions
                    </h2>
                    {item.careInstructions && item.careInstructions.length > 0 ? (
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.careInstructions.filter(c => c).map((instruction, idx) => (
                                <motion.div 
                                  key={idx}
                                  className="flex gap-3 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800"
                                  variants={itemVariants}
                                >
                                    <span className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded-lg font-bold text-sm w-8 h-8 flex items-center justify-center">{idx + 1}</span>
                                    <p className="text-sm font-medium text-text-primary">{instruction}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No care instructions provided</p>
                        </motion.div>
                    )}
                </Section>

                {/* Warranty Section - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <ShieldIcon />
                        Warranty Information
                    </h2>
                    {item.warranty ? (
                        <motion.div 
                          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800"
                          variants={itemVariants}
                        >
                            <div className="space-y-4">
                                {item.warranty.coverage && (
                                    <div className="flex items-start gap-3">
                                        <CheckIcon className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Coverage</p>
                                            <p className="text-sm font-medium text-text-primary">{item.warranty.coverage}</p>
                                        </div>
                                    </div>
                                )}
                                {item.warranty.durationMonths && (
                                    <div className="flex items-start gap-3">
                                        <CheckIcon className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Duration</p>
                                            <p className="text-sm font-medium text-text-primary">{item.warranty.durationMonths} months</p>
                                        </div>
                                    </div>
                                )}
                                {item.warranty.provider && (
                                    <div className="flex items-start gap-3">
                                        <CheckIcon className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Provider</p>
                                            <p className="text-sm font-medium text-text-primary capitalize">{item.warranty.provider}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No warranty information provided</p>
                        </motion.div>
                    )}
                </Section>

                {/* Return Policy - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        Return Policy
                    </h2>
                    {item.returnPolicy ? (
                        <motion.div 
                          className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800"
                          variants={itemVariants}
                        >
                            <div className="space-y-4">
                                {item.returnPolicy.windowDays && (
                                    <div className="flex items-start gap-3">
                                        <CheckIcon className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Return Window</p>
                                            <p className="text-sm font-medium text-text-primary">{item.returnPolicy.windowDays} days</p>
                                        </div>
                                    </div>
                                )}
                                {item.returnPolicy.conditions && item.returnPolicy.conditions.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <CheckIcon className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Conditions</p>
                                            <ul className="space-y-1">
                                                {item.returnPolicy.conditions.map((cond, idx) => (
                                                    <li key={idx} className="text-sm font-medium text-text-primary flex items-start gap-2">
                                                        <span className="text-red-500 mt-1">•</span> {cond}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No return policy specified</p>
                        </motion.div>
                    )}
                </Section>

                {/* Shipping Information - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <TruckIcon />
                        Shipping Information
                    </h2>
                    {item.shippingEstimates && item.shippingEstimates.length > 0 ? (
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.shippingEstimates.map((shipping, idx) => (
                                <motion.div 
                                  key={idx}
                                  className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-5 rounded-lg border border-teal-200 dark:border-teal-800"
                                  variants={itemVariants}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <TruckIcon className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Shipping Method</p>
                                            <p className="text-sm font-semibold text-text-primary">{shipping.carrier} - {shipping.serviceLevel}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <p className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Duration:</span> <span className="font-semibold">{shipping.minDays}-{shipping.maxDays} days</span></p>
                                        {shipping.cost !== undefined && <p className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Cost:</span> <span className="font-semibold">{currency.symbol}{shipping.cost.toFixed(2)}</span></p>}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No shipping information provided</p>
                        </motion.div>
                    )}
                </Section>

                {/* Additional Info - Fulfillment, Certifications, etc */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary">Additional Information</h2>
                    <motion.div 
                      className="grid grid-cols-2 md:grid-cols-3 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                        {item.fulfillmentType && (
                            <InfoCard 
                              icon={<PackageIcon />}
                              title="Fulfillment"
                              content={item.fulfillmentType === 'in_house' ? 'In-House' : item.fulfillmentType === 'dropship' ? 'Dropship' : '3PL'}
                            />
                        )}
                        {item.shippingWeightClass && (
                            <InfoCard 
                              icon={<InfoIcon />}
                              title="Weight Class"
                              content={item.shippingWeightClass}
                            />
                        )}
                        {item.whoPaysShipping && (
                            <InfoCard 
                              icon={<TruckIcon />}
                              title="Shipping Paid By"
                              content={item.whoPaysShipping === 'seller' ? 'Seller' : 'Buyer'}
                            />
                        )}
                        {item.status && (
                            <InfoCard 
                              icon={<CheckIcon />}
                              title="Status"
                              content={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            />
                        )}
                        {item.boostLevel && (
                            <InfoCard 
                              icon={<LightningIcon />}
                              title="Boost Level"
                              content={item.boostLevel}
                            />
                        )}
                    </motion.div>
                </Section>

                {/* Certifications - ALWAYS SHOW */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-6 text-text-primary flex items-center gap-2">
                        <CertificateIcon />
                        Certifications & Standards
                    </h2>
                    {item.certifications && item.certifications.filter(c => c).length > 0 ? (
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                            {item.certifications.filter(c => c).map((cert, idx) => (
                                <motion.div 
                                  key={idx}
                                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 p-4 rounded-lg border border-emerald-300 dark:border-emerald-700 text-center"
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                                >
                                    <CertificateIcon className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-text-primary">{cert}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center text-text-secondary italic"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                        >
                            <p>No certifications provided</p>
                        </motion.div>
                    )}
                </Section>
                


                {/* Reviews */}
                <Section className="mb-12">
                    <h2 className="text-2xl font-bold font-display mb-8 text-text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.576 0l-4.725 2.885a.562.562 0 01-.84-.61l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                        Reviews & Ratings
                    </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <motion.div 
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-2xl text-center border border-blue-200 dark:border-blue-800 flex flex-col justify-center items-center shadow-lg hover:shadow-xl transition-all"
                          whileHover={{ scale: 1.02, y: -5 }}
                        >
                            <motion.p 
                              className="text-6xl font-black text-text-primary mb-2"
                              initial={{ opacity: 0,scale: 0.5 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring' }}
                            >
                              {item.avgRating.toFixed(1)}
                            </motion.p>
                            <StarRating rating={item.avgRating} className="justify-center mb-3" />
                            <p className="text-sm font-semibold text-text-secondary">{item.reviews.length} Verified Reviews</p>
                        </motion.div>
                        <div className="md:col-span-2 space-y-4">
                            {item.reviews.length > 0 ? (
                              item.reviews.slice(0, 3).map((review) => (
                                <motion.div key={review.id} variants={itemVariants}><ReviewCard review={review} /></motion.div>
                              ))
                            ) : (
                              <p className="text-center text-text-secondary pt-8 italic">No reviews yet. Be the first!</p>
                            )}
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
                <Section className="mt-20 pt-16 border-t border-gray-300 dark:border-gray-700/50">
                     <motion.div 
                       className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
                       whileHover={{ scale: 1.01 }}
                       transition={{ type: 'spring', stiffness: 100 }}
                     >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                              className="group relative flex-shrink-0"
                            >
                                <Link to={`/user/${item.owner.id}`} className="block">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110">
                                        <img src={item.owner.avatar} alt={item.owner.name} className="w-full h-full rounded-full object-cover border-4 border-slate-900" />
                                    </div>
                                </Link>
                                {sellerProfile.verificationLevel === 'level2' && (
                                    <motion.div 
                                      className="absolute bottom-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-2 rounded-full border-4 border-slate-900 shadow-lg"
                                      title="Verified Seller"
                                      animate={{ scale: [1, 1.1, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>
                                    </motion.div>
                                )}
                            </motion.div>
                            
                            <motion.div 
                              className="flex-1 text-center md:text-left"
                              initial={{ opacity: 0, x: -30 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                                <p className="text-xs font-bold text-purple-200 uppercase tracking-widest mb-2">Trusted Seller</p>
                                <h3 className="text-3xl md:text-4xl font-bold font-display mb-3 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">{sellerProfile.name}</h3>
                                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 mb-4 text-purple-100 text-sm md:text-base">
                                    <div className="flex items-center gap-2">
                                        <span className="flex text-yellow-300">â˜… â˜… â˜… â˜… â˜…</span> 
                                        <span className="font-bold text-white">{sellerRating.toFixed(1)}</span> 
                                    </div>
                                    <span className="hidden md:block">â€¢</span>
                                    <span>Member since {new Date(sellerProfile.memberSince).getFullYear()}</span>
                                </div>
                                <p className="text-purple-100 max-w-xl mx-auto md:mx-0 leading-relaxed text-sm md:text-base">{sellerProfile.about || "This seller specializes in quality items with excellent customer service and fast shipping!"}</p>
                            </motion.div>
                            
                            <motion.div 
                              className="flex flex-col gap-3 min-w-[200px]"
                              initial={{ opacity: 0, x: 30 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                                <motion.button 
                                    onClick={() => setIsContactModalOpen(true)}
                                    className="w-full py-3 px-6 bg-white text-slate-900 font-bold rounded-xl hover:bg-purple-100 transition-all shadow-lg"
                                    whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Contact Seller
                                </motion.button>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link 
                                        to={`/user/${item.owner.id}`}
                                        className="w-full py-3 px-6 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all border border-white/40 text-center block backdrop-blur-sm"
                                    >
                                        View Profile
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </div>
                     </motion.div>
                </Section>


                {/* Related Items */}
                {relatedItems.length > 0 && (
                     <Section className="mt-20">
                        <h2 className="text-3xl font-bold font-display text-center mb-12 text-text-primary">Explore Similar Products</h2>
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true, amount: 0.1 }}
                        >
                            {relatedItems.map((relItem) => (
                                <motion.div key={relItem.id} variants={itemVariants}>
                                    <ItemCard item={relItem} onQuickView={() => {}} />
                                </motion.div>
                            ))}
                        </motion.div>
                         <motion.div 
                           className="text-center mt-12"
                           initial={{ opacity: 0 }}
                           whileInView={{ opacity: 1 }}
                           transition={{ delay: 0.3 }}
                         >
                             <Link to={`/browse?category=${item.category}`} className="inline-block px-8 py-3 border-2 border-text-primary font-bold rounded-full hover:bg-text-primary hover:text-white transition-all uppercase tracking-wider text-sm shadow-lg hover:shadow-xl">
                                View All Similar Items
                            </Link>
                        </motion.div>
                    </Section>
                )}
            </main>
        </div>
    );
};

export default ItemDetailPage;


