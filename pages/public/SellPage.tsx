
import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';

// --- Custom Animated Logo ---
const CommerceLogo = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Morphing Background */}
            <motion.div 
                animate={{ borderRadius: ["20%", "50%", "20%"], rotate: [0, 90, 180] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20 blur-xl"
            />
            {/* Tag Icon */}
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-400 z-10 drop-shadow-2xl">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            {/* Coin Animation */}
            <motion.div
                className="absolute top-1/4 right-1/4 w-12 h-12 bg-yellow-400 rounded-full border-4 border-yellow-200 z-20 shadow-lg flex items-center justify-center font-bold text-yellow-900"
                animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
                $
            </motion.div>
        </div>
    );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center gap-3 mb-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
        <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white">✓</span>
        <span className="text-gray-300 text-sm font-medium">{text}</span>
    </div>
);

const DeepDiveSection: React.FC<{ title: string; description: string; features: string[]; image: string; index: number }> = ({ title, description, features, image, index }) => {
    return (
        <section className="py-24 relative border-b border-white/5">
            <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                <div className={`space-y-8 ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <div className="inline-block p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Capability {index + 1}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white font-display">{title}</h2>
                    <p className="text-lg text-gray-400 leading-relaxed">{description}</p>
                    <div className="grid grid-cols-1 gap-2">
                        {features.map((feat, i) => <FeatureItem key={i} text={feat} />)}
                    </div>
                </div>
                <div className={`relative ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                    <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full"></div>
                    <img src={image} alt={title} className="relative z-10 rounded-2xl shadow-2xl border border-white/10 w-full transform hover:scale-[1.02] transition-transform duration-500" />
                </div>
            </div>
        </section>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="p-6 bg-[#0f0f0f] border border-white/10 rounded-2xl hover:bg-[#151515] transition-colors">
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const SellPage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const { openOnboarding } = useAuth();

    const coreTopics = [
        {
            title: "Professional Storefronts",
            image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1200&auto=format&fit=crop",
            description: "Don't just list items; build a brand. Our AI-powered store builder creates a stunning, mobile-responsive website for your products in seconds. Customize colors, fonts, and layouts to match your identity.",
            features: ["AI-Generated Branding Kit", "Custom Domain Support", "Mobile-First Design", "SEO Optimization", "Blog & Content Pages"]
        },
        {
            title: "Global Commerce Ready",
            image: "https://images.unsplash.com/photo-1526304640152-d4619684e7ad?q=80&w=1200&auto=format&fit=crop",
            description: "Break down borders. Sell to customers in over 150 countries. We handle currency conversion, international shipping calculations, and customs documentation automatically.",
            features: ["Multi-Currency Support", "Automated Duties & Taxes", "Global Logistics Partners", "Localized Checkout Experience", "Language Translation"]
        },
        {
            title: "AI Listing Assistant",
            image: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?q=80&w=1200&auto=format&fit=crop",
            description: "Stop typing descriptions manually. Upload a photo, and our AI identifies the product, writes a compelling description, suggests a price based on market data, and tags it for SEO.",
            features: ["Image-to-Text Generation", "Price Intelligence", "Auto-Tagging", "Background Removal", "Multi-platform Sync"]
        },
        {
            title: "Marketing Automation",
            image: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=1200&auto=format&fit=crop",
            description: "Drive sales while you sleep. Set up automated email sequences, abandoned cart recovery, and retargeting ads directly from your dashboard.",
            features: ["Abandoned Cart Emails", "Customer Segmentation", "Discount Codes & Coupons", "Social Media Integration", "Flash Sale Countdown Timers"]
        },
        {
            title: "Inventory Command Center",
            image: "https://images.unsplash.com/photo-1580974619472-a72eb375003c?q=80&w=1200&auto=format&fit=crop",
            description: "Manage stock across multiple channels. Whether you sell on Urban Prime, Instagram, or in person, your inventory stays synced in real-time.",
            features: ["Multi-Channel Sync", "Low Stock Alerts", "Barcode Scanning App", "Supplier Management", "Batch Editing"]
        },
         {
            title: "Advanced Analytics",
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
            description: "Data-driven decisions made easy. Visualize your sales funnel, understand customer lifetime value, and identify your top-performing products.",
            features: ["Real-time Sales Dashboard", "Customer Cohort Analysis", "Profit Margin Tracking", "Traffic Source Heatmaps", "Exportable Reports"]
        }
    ];

    const extendedFeatures = [
        { title: "SEO Tools", desc: "Built-in tools to help your products rank higher on search engines.", icon: "🔍" },
        { title: "Social Selling", desc: "Sell directly on Instagram and TikTok with synced catalogs.", icon: "📱" },
        { title: "Customer Loyalty", desc: "Reward repeat buyers with points and exclusive tiers.", icon: "❤️" },
        { title: "Wholesale Pricing", desc: "Set bulk pricing rules for B2B transactions.", icon: "🏭" },
        { title: "Digital Products", desc: "Instant delivery for software, ebooks, and art.", icon: "💾" },
        { title: "Pre-orders", desc: "Gauge interest and fund production before you ship.", icon: "⏱️" },
        { title: "Gift Cards", desc: "Let your customers share your brand with friends.", icon: "🎁" },
        { title: "POS Integration", desc: "Sync your online store with your physical retail location.", icon: "🏪" },
        { title: "Staff Accounts", desc: "Give your team access with custom permissions.", icon: "👥" },
        { title: "Multi-currency", desc: "Customers shop in their local currency automatically.", icon: "💱" },
        { title: "Auto-Tax Calc", desc: "We calculate and collect sales tax for you.", icon: "🧾" },
        { title: "Shipping Labels", desc: "Print discounted shipping labels from home.", icon: "🏷️" }
    ];

    const techSpecs = [
        "Return Management Portal", "Product Review System", "Integrated Blog", "Email Marketing Suite",
        "Flash Sale Engine", "B2B Quote Request", "Subscription Billing", "API Webhooks",
        "Custom Checkout Fields", "GDPR Compliance Tools", "Fraud Analysis", "Dark Mode Storefronts"
    ];

    return (
        <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-indigo-500 selection:text-white">
            <motion.div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform-origin-0 z-50" style={{ scaleX }} />

            {/* HERO */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-white hover:text-indigo-400" />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505] z-0"></div>
                <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    <div className="mb-8 animate-float"><CommerceLogo /></div>
                    <h1 className="text-6xl md:text-9xl font-black font-display tracking-tighter mb-6">
                        SELL <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">SMARTER</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light mb-10">
                        The all-in-one platform for modern merchants. From AI-generated listings to global fulfillment, we give you the tools to scale.
                    </p>
                    <button
                        onClick={() => openOnboarding('list', '/profile/become-a-provider')}
                        className="px-12 py-5 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                    >
                        Launch Your Store
                    </button>
                </div>
            </section>

            {/* CONTENT */}
            <div className="bg-[#0a0a0a]">
                {coreTopics.map((item, index) => (
                    <DeepDiveSection 
                        key={index} 
                        index={index} 
                        title={item.title} 
                        description={item.description}
                        features={item.features}
                        image={item.image} 
                    />
                ))}
            </div>

            {/* EXTENDED GRID */}
            <section className="py-24 bg-[#050505]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 font-display">Merchant Toolkit</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to run a successful business, built right in.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extendedFeatures.map((feat, i) => (
                            <GridFeature key={i} title={feat.title} desc={feat.desc} icon={feat.icon} />
                        ))}
                    </div>
                </div>
            </section>

             {/* TECH SPECS */}
            <section className="py-24 bg-[#080808] border-t border-white/5">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white font-display">Technical Capabilities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-indigo-500">✓</span>
                                <span className="text-sm font-medium text-gray-300">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-gradient-to-b from-[#0a0a0a] to-indigo-900/20 text-center relative">
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-5xl md:text-7xl font-black font-display mb-8">BUILD YOUR EMPIRE</h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                        Join thousands of entrepreneurs who have turned their passion into profit on Urban Prime.
                    </p>
                    <button
                        onClick={() => openOnboarding('list', '/profile/become-a-provider')}
                        className="inline-block px-16 py-6 bg-indigo-600 text-white rounded-full text-xl font-bold hover:bg-indigo-500 transition-colors shadow-2xl shadow-indigo-500/30"
                    >
                        Start Selling Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default SellPage;
