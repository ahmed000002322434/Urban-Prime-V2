import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { Item } from '../../types';
import GlassCard from './GlassCard';
import { useGravityMouse } from '../../hooks/useGravityMouse';
import GravityBackground from './GravityBackground';

interface LiquidGlassItemDetailProps {
  item: Item;
  relatedItems: Item[];
  onAddToCart?: (checkout?: boolean) => void;
  quantity: number;
  setQuantity: (q: number) => void;
}

const StarIcon = ({ size = 16, filled = true }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "gold" : "none"} stroke={filled ? "gold" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const RippleButton = ({ children, className, onClick, style, whileHover }: any) => {
  const [ripples, setRipples] = useState<any[]>([]);

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const newRipple = { x, y, size, id: Date.now() };
    setRipples([...ripples, newRipple]);
    if (onClick) onClick(event);
  };

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={createRipple}
      style={style}
      whileTap={{ scale: 0.95 }}
      whileHover={whileHover}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => setRipples(prev => prev.filter(r => r.id !== ripple.id))}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
};

const LiquidGlassItemDetail: React.FC<LiquidGlassItemDetailProps> = ({ 
  item, 
  relatedItems,
  onAddToCart,
  quantity,
  setQuantity
}) => {
  const { springX, springY, rotateX, rotateY, isMobile } = useGravityMouse({ stiffness: 40, damping: 22 });

  const { scrollY } = useScroll();
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      if (latest > 500 && !showFloatingCTA) setShowFloatingCTA(true);
      else if (latest <= 500 && showFloatingCTA) setShowFloatingCTA(false);
    });
  }, [scrollY, showFloatingCTA]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDiscoverHovered, setIsDiscoverHovered] = useState(false);
  const [isSellerHovered, setIsSellerHovered] = useState(false);
  const [isReviewsHovered, setIsReviewsHovered] = useState(false);

  // Data mapping
  const series = (item as any).category || (item as any).series || "ELECTRONICS";
  const productTitle = item.title || item.name || "Aether Orbit Pro";
  const description = item.description || "Revolutionary graphene drivers with integrated spatial tracking for a 360-degree sonic journey.";
  const price = item.price || 299;
  const rating = item.avgRating || 4.98;
  const defaultImageUrl = item.imageUrls?.[0] || item.images?.[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop";
  
  const displayImage = selectedImage || defaultImageUrl;
  const allImages = [...(item.imageUrls || []), ...(item.images || [])].filter(Boolean);
  const galleryImages = Array.from(new Set(allImages.length ? allImages : [defaultImageUrl]));

  let featuresList = item.features || [];
  if (typeof featuresList === 'string') {
    featuresList = [featuresList];
  }
  const quickInfo = featuresList?.length ? featuresList.slice(0, 3).map((f: string, i: number) => ({
    icon: i === 0 ? "✨" : i === 1 ? "🚀" : "💎",
    label: f,
    id: i + 1
  })) : [
    { icon: "🎵", label: "Premium Quality", id: 1 },
    { icon: "🛡️", label: "Verified Authentic", id: 2 },
    { icon: "💎", label: "Exclusive Design", id: 3 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const labelVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { delay: 0.5, duration: 0.5 }
    }
  };

  return (
    <div className="relative min-h-screen w-full text-[#1a1a1a] font-sans overflow-hidden bg-[#fafbff] dark:bg-[#020205]">
      {/* Background remains site-consistent */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <GravityBackground springX={springX} springY={springY} />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-[1400px] mx-auto px-6 pt-[60px] pb-20 flex flex-col gap-12"
      >
        {/* Main 3-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
          
          {/* LEFT COLUMN: Quick Info Card (300px) */}
          <motion.div variants={cardVariants} className="w-full lg:w-[300px] shrink-0 order-3 lg:order-1">
            <GlassCard 
              className="p-[28px] rounded-[22px] border border-white/12 backdrop-blur-[18px] bg-white/[0.08] transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
              enableTilt={false} // Only use global hover effects as per prompt
              enableGlow={false}
            >
              <h3 className="text-[20px] font-semibold mb-[20px] text-[#1a1a1a]">Quick Info</h3>
              <div className="flex flex-col gap-[12px]">
                {quickInfo.map((info) => (
                  <div 
                    key={info.id} 
                    className="flex items-center gap-3 h-[52px] pl-[14px] rounded-[14px] bg-white/5"
                  >
                    <div className="w-9 h-9 flex items-center justify-center text-[20px]">
                      {info.icon}
                    </div>
                    <span className="text-[15px] font-medium text-[#2a2a2a]">{info.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-[18px]">
                <p className="text-[13px] leading-[1.6] text-[#444] italic border-l-2 border-primary/40 pl-3">
                  AI Summary: This {item.category?.toLowerCase() || 'item'} offers distinct design, verified authenticity, and premium craft. Built to impress and perform.
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* CENTER COLUMN: Product Hero (520px) */}
          <div className="w-full lg:w-[520px] shrink-0 flex flex-col items-center justify-center relative min-h-[520px] order-1 lg:order-2">
            {/* Soft Glow Behind Product */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-[450px] h-[450px] rounded-full opacity-[0.35]"
                style={{
                  background: 'radial-gradient(circle, rgba(108,142,255,0.3) 0%, transparent 70%)',
                  filter: 'blur(60px)'
                }}
              />
            </div>

            <motion.div
              style={{ rotateX, rotateY, perspective: 1000 }}
              className="relative z-10 w-full flex flex-col items-center justify-center cursor-zoom-in"
              transition={{ duration: 0.25 }}
              onClick={() => setIsZoomed(true)}
            >
              <motion.img 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                src={displayImage} 
                alt={productTitle}
                className="max-w-[420px] max-h-[460px] w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.3)] rounded-[24px]"
              />
              
              {/* Image Gallery Thumbnails */}
              <div className="flex gap-3 mt-6 justify-center z-20">
                {galleryImages.map((img, idx) => (
                   <motion.div 
                     key={idx}
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={(e) => { e.stopPropagation(); setSelectedImage(img as string); }}
                     className={`w-[50px] h-[50px] rounded-[12px] overflow-hidden border-2 cursor-pointer transition-colors ${selectedImage === img || (!selectedImage && idx === 0) ? 'border-primary' : 'border-black/5 hover:border-black/20'}`}
                   >
                     <img src={img as string} alt="thumbnail" className="w-full h-full object-cover" />
                   </motion.div>
                ))}
              </div>
              
              {/* Floating Feature Labels */}
              <motion.div 
                variants={labelVariants}
                className="absolute top-[15%] -right-4 px-[14px] py-[6px] bg-white/70 backdrop-blur-md border border-white/20 rounded-[18px] text-[12px] font-medium text-[#1a1a1a] shadow-xl"
              >
                Spatial Audio
              </motion.div>
              <motion.div 
                variants={labelVariants}
                className="absolute bottom-[25%] -left-8 px-[14px] py-[6px] bg-white/70 backdrop-blur-md border border-white/20 rounded-[18px] text-[12px] font-medium text-[#1a1a1a] shadow-xl"
              >
                Graphene Drivers
              </motion.div>
              <motion.div 
                variants={labelVariants}
                className="absolute top-[40%] -left-4 px-[14px] py-[6px] bg-white/70 backdrop-blur-md border border-white/20 rounded-[18px] text-[12px] font-medium text-[#1a1a1a] shadow-xl"
              >
                Cooling System
              </motion.div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Purchase Card (380px) */}
          <motion.div variants={cardVariants} className="w-full lg:w-[380px] shrink-0 order-2 lg:order-3">
            <GlassCard 
              className="p-[32px] rounded-[22px] border border-white/12 bg-white/[0.08] backdrop-blur-[20px] transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col gap-6"
              enableTilt={false}
              enableGlow={false}
            >
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium tracking-[1px] text-[#6b6b6b] uppercase">{series}</span>
                <h1 className="text-[30px] font-bold leading-[1.25] text-[#111]">{productTitle}</h1>
              </div>

              <div className="relative">
                <p className={`text-[14px] text-[#444] leading-[1.6] ${!isDescExpanded ? 'line-clamp-2' : ''} transition-all duration-300`}>
                  {description}
                </p>
                {description && description.length > 80 && (
                  <button 
                     onClick={() => setIsDescExpanded(!isDescExpanded)}
                     className="mt-2 text-[12px] font-bold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    {isDescExpanded ? 'Show Less' : 'Read More ▼'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-[18px]">
                <span className="text-[28px] font-semibold text-[#111]">${price}</span>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <StarIcon key={i} size={16} filled={i <= Math.round(rating)} />)}
                  </div>
                  <span className="text-[12px] text-[#6b6b6b] font-medium">{rating} Rating</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center bg-white/10 border border-white/15 rounded-xl h-[40px] w-[120px] overflow-hidden">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="w-[32px] h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      −
                    </motion.button>
                    <span className="flex-1 text-center text-[15px] font-bold text-[#111]">{quantity}</span>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(quantity + 1)} 
                      className="w-[32px] h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      +
                    </motion.button>
                 </div>
              </div>

              <div className="flex flex-col gap-4">
                <RippleButton
                  onClick={() => onAddToCart?.(false)}
                  className="w-full h-[52px] rounded-[14px] bg-white/25 border border-white/20 text-[14px] font-bold text-[#111] transition-all"
                  whileHover={{ translateY: -2, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                >
                  Add to Cart
                </RippleButton>
                <RippleButton
                  onClick={() => onAddToCart?.(true)}
                  className="w-full h-[56px] rounded-[16px] bg-gradient-to-r from-[#4f7cff] to-[#7b3ff2] text-[16px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(79,124,255,0.4)' }}
                >
                  Buy Now
                </RippleButton>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* BOTTOM SECTION: Extra Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 order-4 w-full max-w-[900px] mx-auto">

          {/* Feature Highlights */}
          <motion.div 
             variants={cardVariants}
             onHoverStart={() => setIsReviewsHovered(true)}
             onHoverEnd={() => setIsReviewsHovered(false)}
          >
            <GlassCard 
              className="p-[22px] w-full lg:w-[420px] rounded-[18px] border border-white/12 bg-white/[0.08] backdrop-blur-[20px] transition-all duration-300 flex flex-col justify-between overflow-hidden"
              enableTilt={false}
              enableGlow={false}
              style={{ minHeight: '140px' }}
            >
              <h3 className="text-[16px] font-bold text-[#1a1a1a]">Recent Reviews</h3>
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-col gap-1 rounded-[14px] bg-black/5 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-[#1a1a1a]">Alex M.</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <StarIcon key={i} size={12} />)}
                    </div>
                  </div>
                  <p className="text-[12px] italic text-[#444] line-clamp-2">"The most immersive experience I've ever had. Truly futuristic."</p>
                </div>
                <AnimatePresence>
                  {isReviewsHovered && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="flex flex-col gap-3 overflow-hidden mt-2"
                     >
                       <div className="flex flex-col gap-1 rounded-[14px] bg-black/5 p-3">
                         <div className="flex justify-between items-center">
                           <span className="text-[12px] font-bold text-[#1a1a1a]">Sarah K.</span>
                           <div className="flex gap-0.5">
                             {[1,2,3,4,5].map(i => <StarIcon key={i} size={12} filled={i<=4}/>)}
                           </div>
                         </div>
                         <p className="text-[12px] italic text-[#444] line-clamp-2">"Great quality and matched the description perfectly."</p>
                       </div>
                       <button className="text-[12px] font-bold text-blue-600 hover:text-blue-500 transition-colors text-center w-full mt-1">Read all 124 reviews</button>
                     </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div 
             variants={cardVariants}
             onHoverStart={() => setIsSellerHovered(true)}
             onHoverEnd={() => setIsSellerHovered(false)}
          >
            <GlassCard 
              className="p-[22px] w-full lg:w-[420px] rounded-[18px] border border-white/12 bg-white/[0.08] backdrop-blur-[20px] transition-all duration-300 flex flex-col justify-between overflow-hidden"
              enableTilt={false}
              enableGlow={false}
              style={{ minHeight: '140px' }}
            >
              <div className="flex items-center gap-4">
                <img src={item.owner?.avatarUrl || "https://i.pravatar.cc/150?u=seller"} className="w-[42px] h-[42px] rounded-full border border-white/20" alt="seller" />
                <div>
                  <h4 className="text-[16px] font-bold text-[#1a1a1a]">{item.owner?.name || "Nova Dynamics"}</h4>
                  <div className="flex items-center gap-2 text-[13px] text-[#6b6b6b]">
                    <span>⭐ {item.owner?.rating || 4.9} Rating</span>
                    <span>• {item.owner?.salesCount || "12k+"} Sales</span>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                 {isSellerHovered && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0, marginTop: 0 }}
                     animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                     exit={{ height: 0, opacity: 0, marginTop: 0 }}
                     className="text-[13px] text-[#444] flex flex-col gap-2"
                   >
                     <div className="flex justify-between border-t border-black/5 pt-2">
                       <span className="font-semibold text-[#1a1a1a]">Products</span>
                       <span>{item.owner?.productsCount || 142} Active</span>
                     </div>
                     <div className="flex justify-between border-t border-black/5 pt-2">
                       <span className="font-semibold text-[#1a1a1a]">Followers</span>
                       <span>{item.owner?.followersCount || "8.4k"}</span>
                     </div>
                     <div className="flex justify-between border-t border-black/5 pt-2">
                       <span className="font-semibold text-[#1a1a1a]">Joined</span>
                       <span>{item.owner?.joinedDate || "2023"}</span>
                     </div>
                   </motion.div>
                 )}
              </AnimatePresence>
              <button className="text-[12px] font-bold text-blue-600 hover:text-blue-500 transition-colors text-left mt-3">View Store Profile →</button>
            </GlassCard>
          </motion.div>
        </div>
        {/* Discover More Full-Width Section */}
        <motion.div variants={cardVariants} className="w-full mt-8 order-5">
           <div className="flex flex-col gap-6 p-8 rounded-[32px] border border-white/12 bg-white/[0.04] backdrop-blur-[20px]">
             <div className="flex justify-between items-end">
               <div>
                 <h2 className="text-[28px] font-bold text-[#1a1a1a] dark:text-white tracking-tight">Discover More Products</h2>
                 <p className="text-[15px] text-[#666] dark:text-[#aaa] mt-1">Explore items inspired by your selection</p>
               </div>
               <button className="text-[14px] font-bold text-blue-600 hover:text-blue-500 transition-colors">View Collection →</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
               {relatedItems.slice(0, 4).length > 0 ? relatedItems.slice(0, 4).map((relItem, i) => (
                 <motion.div 
                   key={relItem.id || i}
                   whileHover={{ y: -8 }}
                   className="group relative flex flex-col rounded-[24px] overflow-hidden border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] transition-all p-3 cursor-pointer"
                   onClick={() => window.location.href = `/item/${relItem.id}`}
                 >
                   <div className="w-full h-[200px] rounded-[16px] overflow-hidden bg-black/5 mb-4 relative">
                     <img 
                       src={relItem.imageUrls?.[0] || relItem.images?.[0] || `https://picsum.photos/seed/${i + 70}/400`} 
                       alt={relItem.title || "product"} 
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                     />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 text-black px-4 py-2 rounded-full text-[13px] font-bold shadow-lg backdrop-blur-md translate-y-4 group-hover:translate-y-0 transition-all duration-300">View Details</span>
                     </div>
                   </div>
                   <div className="flex flex-col px-2 pb-2">
                     <span className="text-[15px] font-bold text-[#111] dark:text-white line-clamp-1">{relItem.title || "Aether Product"}</span>
                     <span className="text-[14px] text-[#666] font-medium mt-1">${relItem.price || 299}</span>
                   </div>
                 </motion.div>
               )) : [1,2,3,4].map((i) => (
                 <motion.div 
                   key={i}
                   whileHover={{ y: -8 }}
                   className="group relative flex flex-col rounded-[24px] overflow-hidden border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] transition-all p-3 cursor-pointer"
                 >
                   <div className="w-full h-[200px] rounded-[16px] overflow-hidden bg-black/5 mb-4 relative">
                     <img 
                       src={`https://picsum.photos/seed/${i + 50}/400`} 
                       alt="product mock" 
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                     />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 text-black px-4 py-2 rounded-full text-[13px] font-bold shadow-lg backdrop-blur-md translate-y-4 group-hover:translate-y-0 transition-all duration-300">View Details</span>
                     </div>
                   </div>
                   <div className="flex flex-col px-2 pb-2">
                     <span className="text-[15px] font-bold text-[#111] dark:text-white line-clamp-1">Premium Item {i}</span>
                     <span className="text-[14px] text-[#666] font-medium mt-1">$299</span>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </motion.div>
      </motion.div>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl cursor-zoom-out p-8"
            onClick={() => setIsZoomed(false)}
          >
            <motion.img
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.8, opacity: 0 }}
               src={displayImage}
               alt="Zoomed Product"
               className="max-w-[90vw] max-h-[90vh] object-contain rounded-[24px]"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Action Bar */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[90] flex items-center gap-4 px-3 py-3 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            style={{ width: 'max-content' }}
          >
             <div className="flex items-center gap-3 mr-2 hidden md:flex pl-3">
               <img src={displayImage} alt="thumbnail" className="w-10 h-10 rounded-full object-cover border border-black/10 dark:border-white/10" />
               <div className="flex flex-col w-[120px]">
                 <span className="text-[13px] font-bold text-black dark:text-white line-clamp-1">{productTitle}</span>
                 <span className="text-[12px] font-medium text-black/60 dark:text-white/60">${price}</span>
               </div>
             </div>
             
             <div className="flex items-center bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 rounded-full h-[44px] px-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-full text-center hover:text-primary transition-colors text-black dark:text-white font-medium">−</button>
                <span className="w-6 text-center text-[13px] font-bold text-black dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-full text-center hover:text-primary transition-colors text-black dark:text-white font-medium">+</button>
             </div>

             <RippleButton
               onClick={() => onAddToCart?.(false)}
               className="h-[44px] px-6 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 text-[13px] font-bold text-[#111] dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-all"
               whileHover={{ translateY: -2 }}
             >
               Add to Cart
             </RippleButton>
             <RippleButton
               onClick={() => onAddToCart?.(true)}
               className="h-[44px] px-8 rounded-full bg-gradient-to-r from-[#4f7cff] to-[#7b3ff2] text-[14px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all"
               whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(79,124,255,0.4)' }}
             >
               Buy Now
             </RippleButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiquidGlassItemDetail;
