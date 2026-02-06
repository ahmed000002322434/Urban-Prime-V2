
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';

// --- Custom Animated Logo ---
const InfinityLoopLogo = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dotted border-green-200 dark:border-green-900/30 opacity-50"
            />
             <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border-2 border-dashed border-emerald-400 opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <svg width="120" height="60" viewBox="0 0 200 100" className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                    <motion.path 
                        d="M50 50 C 20 50 20 10 50 10 C 80 10 80 50 110 50 C 140 50 140 10 170 10 C 200 10 200 50 170 50 C 140 50 140 90 110 90 C 80 90 80 50 50 50 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
                    />
                </svg>
            </div>
        </div>
    );
};

// --- Components ---
const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{text}</span>
    </div>
);

const DeepDiveSection: React.FC<{ 
    title: string; 
    subtitle: string;
    description: string;
    features: string[]; 
    image: string; 
    index: number; 
}> = ({ title, subtitle, description, features, image, index }) => {
    const isEven = index % 2 === 0;
    
    return (
        <section className="py-24 md:py-32 relative overflow-hidden group">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-24 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    <div className="lg:w-1/2 w-full">
                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 dark:border-white/5 transform transition-transform duration-700 hover:scale-[1.02]">
                            <img src={image} alt={title} className="w-full h-[500px] object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute bottom-8 left-8 right-8">
                                <span className="px-3 py-1 bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-300 text-xs font-bold uppercase tracking-widest rounded-full mb-3 inline-block">
                                    Feature {index + 1}
                                </span>
                                <h3 className="text-2xl font-bold text-white mb-2">{subtitle}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 w-full space-y-8">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black font-display text-gray-900 dark:text-white leading-[1.1] mb-6">
                                {title}
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-light mb-8">
                                {description}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                {features.map((feat, i) => <FeatureItem key={i} text={feat} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="p-6 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
    >
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
);

const RentPage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const { openOnboarding } = useAuth();

    const coreTopics = [
        {
            title: "Smart Calendar & Scheduling",
            subtitle: "Never Double Book Again",
            image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
            description: "Our intelligent booking engine handles the complexity of rental periods, buffers, and turnarounds. It ensures your item is available when you say it is, automatically blocking out time for maintenance or shipping.",
            features: ["Real-time availability syncing", "Automated buffer periods", "Weekend pricing rules", "Long-term rental discounts", "Instant Book option"]
        },
        {
            title: "Lender Protection Guarantee",
            subtitle: "Rent with Total Peace of Mind",
            image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop",
            description: "We understand your items are valuable. Our comprehensive protection covers damage, theft, and loss up to $50,000. Every renter is ID-verified before they can touch your gear.",
            features: ["$50k Damage Protection", "Identity Verification", "Facial Recognition", "Security Deposits", "Fraud Detection"]
        },
        {
            title: "Dynamic Pricing Engine",
            subtitle: "Maximize Your Yield",
            image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop",
            description: "Don't leave money on the table. Our AI suggests optimal rental prices based on demand, seasonality, and competitor data. Charge more on weekends, or offer deals to fill idle inventory.",
            features: ["Demand-based surge pricing", "Competitor price tracking", "Seasonal adjustments", "Custom offer creation", "Bulk packages"]
        },
        {
            title: "Seamless Logistics",
            subtitle: "Pickup, Delivery, Done.",
            image: "https://images.unsplash.com/photo-1620917670397-a44840e69e48?q=80&w=1200&auto=format&fit=crop",
            description: "Whether you prefer meeting locals or shipping nationwide, we handle the logistics. Print shipping labels directly from your dashboard or use our Uber-integrated local courier service.",
            features: ["Integrated Shipping Labels", "Local Courier Integration", "Safe Meetup Spots", "QR Code Handover", "Return Tracking"]
        },
        {
            title: "Inventory Management",
            subtitle: "Your Personal Warehouse",
            image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop",
            description: "Track every asset in your portfolio. Know exactly where each item is, its condition history, and maintenance schedule. It's enterprise-level asset tracking for everyone.",
            features: ["Barcode/QR Scanning", "Maintenance logs", "Condition reporting", "Sub-item tracking", "Lost & Found recovery"]
        },
         {
            title: "Renter Vetting & Trust",
            subtitle: "Community You Can Rely On",
            image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1200&auto=format&fit=crop",
            description: "Not everyone gets to rent on Urban Prime. We use a rigorous vetting process involving social footprint analysis, credit checks (optional), and peer reviews to ensure quality.",
            features: ["Social Cross-Reference", "Rental History Analysis", "Two-way Ratings", "Trust Indicators", "Block/Report Tools"]
        }
    ];

    const extendedFeatures = [
        { title: "Instant Payouts", desc: "Get paid immediately after the rental period ends via instant transfer.", icon: "⚡" },
        { title: "Tax Reporting", desc: "Automated generation of 1099-K forms and expense tracking reports.", icon: "📄" },
        { title: "Usage Analytics", desc: "Deep insights into which items earn the most and when.", icon: "📊" },
        { title: "Cancellation Policies", desc: "Choose from Flexible, Moderate, or Strict policies.", icon: "🛑" },
        { title: "Multi-Location", desc: "Manage inventory across multiple storage units or cities.", icon: "📍" },
        { title: "Bundle Rentals", desc: "Create kits (e.g., Camera + Lens + Tripod) for higher AOV.", icon: "📦" },
        { title: "Seasonal Promos", desc: "Schedule discounts for holidays or slow seasons automatically.", icon: "🗓️" },
        { title: "Auto-Messaging", desc: "Set up welcome messages and return reminders.", icon: "💬" },
        { title: "GPS Integration", desc: "Optional GPS tracker integration for high-value assets.", icon: "🛰️" },
        { title: "Insurance Add-ons", desc: "Offer renters optional extra insurance at checkout.", icon: "🛡️" },
        { title: "Subscription Models", desc: "Offer monthly subscriptions for frequent renters.", icon: "🔄" },
        { title: "Waitlist System", desc: "Capture demand for booked items with automated notifications.", icon: "⏳" }
    ];

    const techSpecs = [
        "Review Automation", "Late Fee Calculator", "Deposit Handling", "ID Verification API", 
        "Mobile App Management", "API Access", "Webhook Integrations", "Sub-user Accounts", 
        "White-label Options", "Custom Domain", "SEO Optimization", "Social Sharing Tools"
    ];

    return (
        <div className="bg-white dark:bg-[#050505] min-h-screen font-sans overflow-x-hidden selection:bg-green-500 selection:text-white">
            <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-green-600 transform-origin-0 z-50" style={{ scaleX }} />

            {/* HERO */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                 <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-white hover:text-green-400" />
                 </div>
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black z-0"></div>
                 <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    <div className="mb-12 animate-float"><InfinityLoopLogo /></div>
                    <h1 className="text-6xl md:text-9xl font-black font-display tracking-tighter text-white mb-8">
                        RENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">ANYTHING</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
                        Turn your idle assets into a recurring revenue stream. The circular economy isn't just ethical—it's profitable.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 mt-12">
                        <button
                            onClick={() => openOnboarding('list', '/profile/become-a-provider')}
                            className="px-10 py-5 bg-green-500 text-black rounded-full font-bold text-lg hover:bg-green-400 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            Start Lending
                        </button>
                        <button
                            onClick={() => openOnboarding('rent', '/browse?listingType=rent')}
                            className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-colors"
                        >
                            Start Renting
                        </button>
                        <Link to="/browse?listingType=rent" className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-colors">
                            Find Items
                        </Link>
                    </div>
                </div>
            </section>

            {/* DEEP DIVE SECTIONS */}
            <div className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-white/5">
                {coreTopics.map((item, index) => (
                    <DeepDiveSection 
                        key={index} 
                        index={index} 
                        title={item.title} 
                        subtitle={item.subtitle}
                        description={item.description}
                        features={item.features}
                        image={item.image} 
                    />
                ))}
            </div>

            {/* EXTENDED FEATURES GRID */}
            <section className="py-24 bg-gray-100 dark:bg-[#080808]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 font-display">Power Features</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Advanced tools designed for power lenders and rental businesses.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extendedFeatures.map((feat, i) => (
                            <GridFeature key={i} title={feat.title} desc={feat.desc} icon={feat.icon} />
                        ))}
                    </div>
                </div>
            </section>

            {/* TECH SPECS LIST */}
            <section className="py-24 bg-white dark:bg-black border-t border-gray-200 dark:border-white/10">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white font-display">Technical Specifications</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                <span className="text-green-500">✓</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-40 bg-green-900 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-5xl md:text-8xl font-black font-display mb-8 tracking-tighter">UNLOCK VALUE</h2>
                    <p className="text-2xl text-green-100 mb-12 max-w-2xl mx-auto font-light">
                        Your closet, garage, and studio are full of hidden income. Let's find it.
                    </p>
                    <button
                        onClick={() => openOnboarding('list', '/profile/become-a-provider')}
                        className="inline-block px-16 py-6 bg-white text-green-900 rounded-full text-xl font-bold hover:scale-105 transform duration-300 shadow-2xl"
                    >
                        List Your First Item
                    </button>
                </div>
            </section>
        </div>
    );
};

export default RentPage;
