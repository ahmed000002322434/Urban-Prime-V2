
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';

// --- Custom Animated Logo ---
const GlobeNetworkLogo = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Globe Grid */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-pink-500/20"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />
             {/* Orbiting Box */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-pink-500 rounded-md shadow-[0_0_20px_rgba(236,72,153,0.8)] flex items-center justify-center text-white text-xs font-bold">
                    📦
                </div>
            </motion.div>
             {/* Central Hub */}
            <div className="absolute w-24 h-24 bg-gradient-to-br from-pink-600 to-purple-700 rounded-full flex items-center justify-center shadow-2xl z-10">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
            </div>
        </div>
    );
};

const FeatureTag: React.FC<{ text: string }> = ({ text }) => (
    <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-300 text-xs font-bold uppercase tracking-wider">
        {text}
    </span>
);

const DeepDiveSection: React.FC<{ title: string; description: string; features: string[]; image: string; index: number }> = ({ title, description, features, image, index }) => {
    return (
        <section className="py-24 relative border-b border-white/5 bg-[#0f0518]">
            <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                <div className={`space-y-6 ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <h2 className="text-4xl md:text-5xl font-bold text-white font-display leading-tight">{title}</h2>
                    <p className="text-lg text-gray-400 leading-relaxed">{description}</p>
                    <div className="flex flex-wrap gap-2 pt-4">
                        {features.map((feat, i) => <FeatureTag key={i} text={feat} />)}
                    </div>
                </div>
                <div className={`relative group ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gray-900">
                        <img src={image} alt={title} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>
        </section>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="p-6 bg-[#1A1025] border border-pink-500/10 rounded-2xl hover:bg-[#251530] hover:border-pink-500/30 transition-all duration-300 group">
        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-lg font-bold text-pink-200 mb-2 group-hover:text-pink-400 transition-colors">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const DropshippingPage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    const topics = [
        {
            title: "Verified Supplier Network",
            image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop",
            description: "Access a curated directory of millions of products from vetted suppliers in the US, Europe, and Asia. We strictly quality-check partners for shipping speed and product reliability so you never have to worry about bad reviews.",
            features: ["US/EU Suppliers", "Fast Shipping Filters", "Blind Dropshipping", "Quality Inspections", "Negotiated Rates"]
        },
        {
            title: "One-Click Import & Sync",
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
            description: "Find a winning product? Add it to your store instantly. We pull images, descriptions, and variants automatically. Inventory and pricing sync in real-time, preventing out-of-stock orders.",
            features: ["Auto-Image Import", "Variant Mapping", "Real-Time Sync", "Bulk Editing", "Pricing Rules"]
        },
        {
            title: "Automated Fulfillment",
            image: "https://images.unsplash.com/photo-1566576912906-60034896330e?q=80&w=1200&auto=format&fit=crop",
            description: "Hands-free operations. When you get a sale, the order is automatically routed to the supplier. Tracking numbers are synced back to your customer instantly. You focus on marketing; we handle the rest.",
            features: ["Auto-Ordering", "Tracking Sync", "Order Batching", "Address Verification", "Risk Analysis"]
        },
        {
            title: "AI Trend Forecasting",
            image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1200&auto=format&fit=crop",
            description: "Stop guessing what to sell. Our 'Creator Hub' algorithm analyzes social media trends and search volume to predict the next viral product before it peaks.",
            features: ["Viral Product Alerts", "Competitor Spy Tool", "Niche Analysis", "Saturation Score", "Ad Creative Vault"]
        },
        {
            title: "Custom Branding & Packaging",
            image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop",
            description: "Stand out from generic dropshippers. Many of our suppliers offer print-on-demand packaging, custom thank-you cards, and white-labeling services to build a real brand asset.",
            features: ["Custom Inserts", "Private Labeling", "Eco-Friendly Packaging", "Print-On-Demand", "Logo Stickers"]
        },
         {
            title: "Profit & Margin Calculator",
            image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop",
            description: "Know your numbers down to the penny. Our dashboard tracks COGS, shipping fees, ad spend, and transaction fees to show you your true net profit per item.",
            features: ["Net Profit Tracking", "Break-Even Calculator", "Ad Spend Integration", "Currency Conversion", "Expense Management"]
        }
    ];

    const extendedFeatures = [
        { title: "Supplier Chat", desc: "Communicate directly with suppliers to negotiate.", icon: "💬" },
        { title: "Sample Ordering", desc: "Easily order samples to verify quality before selling.", icon: "📦" },
        { title: "Bulk Import", desc: "Upload thousands of products via CSV.", icon: "📥" },
        { title: "Price Rules", desc: "Set automatic markup rules by category.", icon: "💲" },
        { title: "Currency Converter", desc: "View supplier prices in your local currency.", icon: "💱" },
        { title: "Profit Dashboard", desc: "Visualize your net profit in real-time.", icon: "📈" },
        { title: "Winning Finder", desc: "AI tool to scan TikTok for trending items.", icon: "🏆" },
        { title: "Ad Creative Gen", desc: "Auto-generate video ads from product images.", icon: "🎬" },
        { title: "Competitor Analysis", desc: "See who else is selling this product.", icon: "🕵️" },
        { title: "Influencer Outreach", desc: "Find creators to promote your products.", icon: "🤳" },
        { title: "Virtual Warehouse", desc: "Manage stock across multiple suppliers.", icon: "🏭" },
        { title: "Fast Ship Filter", desc: "Only show products with <7 day delivery.", icon: "🚀" }
    ];

    const techSpecs = [
        "Inventory Sync API", "Order Routing", "Tracking Webhooks", "Supplier API",
        "Variant Mapping", "Image Editor", "Translation Engine", "Fraud Filter",
        "Cost Analysis", "Margin Alerts", "Auto-Fulfillment", "Return Labels"
    ];

    return (
        <div className="bg-[#0f0518] text-white min-h-screen font-sans selection:bg-pink-500 selection:text-white">
            <motion.div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-600 transform-origin-0 z-50" style={{ scaleX }} />

            {/* HERO */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-white hover:text-pink-400" />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/30 via-[#0f0518] to-[#0f0518] z-0"></div>
                
                <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    <div className="mb-10 animate-float"><GlobeNetworkLogo /></div>
                    <h1 className="text-6xl md:text-9xl font-black font-display tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-pink-200 to-purple-400">
                        ZERO INVENTORY.
                        <br/>INFINITE SCALE.
                    </h1>
                    <p className="text-xl md:text-2xl text-purple-200/60 max-w-3xl mx-auto leading-relaxed font-light mb-12">
                        Build a global e-commerce empire from your laptop. We connect you to thousands of suppliers and automate the hard stuff.
                    </p>
                    <Link to="/profile/creator-hub" className="px-12 py-5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-[0_0_50px_rgba(236,72,153,0.5)] transition-all transform hover:scale-105">
                        Access Creator Hub
                    </Link>
                </div>
            </section>

            {/* CONTENT */}
            <div className="bg-[#0f0518]">
                {topics.map((item, index) => (
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
            <section className="py-24 bg-[#13081E]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 font-display">Creator Tools</h2>
                        <p className="text-purple-300/60 max-w-2xl mx-auto">Advanced features to supercharge your dropshipping business.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extendedFeatures.map((feat, i) => (
                            <GridFeature key={i} title={feat.title} desc={feat.desc} icon={feat.icon} />
                        ))}
                    </div>
                </div>
            </section>

             {/* TECH SPECS */}
            <section className="py-24 bg-[#0f0518] border-t border-purple-900/20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white font-display">Automation Engine</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-purple-900/10 rounded-lg border border-purple-500/20">
                                <span className="text-pink-500">⚙️</span>
                                <span className="text-sm font-medium text-purple-200">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-gradient-to-t from-purple-900/20 to-[#0f0518] text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl md:text-6xl font-black font-display text-white mb-8">FIND YOUR WINNING PRODUCT</h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                        The trends are waiting. Start dropshipping with Urban Prime today.
                    </p>
                    <Link to="/profile/creator-hub" className="inline-block px-16 py-6 border border-pink-500/50 text-pink-400 rounded-full text-xl font-bold hover:bg-pink-500 hover:text-white transition-all duration-300">
                        Explore Catalog
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default DropshippingPage;
