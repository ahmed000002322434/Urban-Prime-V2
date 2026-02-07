
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';
import IconBadge from '../../components/IconBadge';

// --- Custom Animated Logo ---
const NetworkLogo = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Connecting Nodes */}
            <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0 w-full h-full text-yellow-500/30 animate-spin-slow">
                <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="10 10" fill="none" />
                <circle cx="100" cy="20" r="5" fill="currentColor" />
                <circle cx="180" cy="100" r="5" fill="currentColor" />
                <circle cx="100" cy="180" r="5" fill="currentColor" />
                <circle cx="20" cy="100" r="5" fill="currentColor" />
                <line x1="100" y1="100" x2="100" y2="20" stroke="currentColor" strokeWidth="1" />
                <line x1="100" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="1" />
                <line x1="100" y1="100" x2="100" y2="180" stroke="currentColor" strokeWidth="1" />
                <line x1="100" y1="100" x2="20" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
             {/* Central Node */}
            <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="relative z-10 w-20 h-20 bg-yellow-400 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.6)] flex items-center justify-center text-4xl"
            >
                🤝
            </motion.div>
        </div>
    );
};

const DeepDiveSection: React.FC<{ title: string; description: string; features: string[]; image: string; index: number }> = ({ title, description, features, image, index }) => {
    return (
        <section className="py-24 relative border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
            <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                 <div className={`relative ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <div className="absolute inset-0 bg-yellow-400/20 blur-[80px] rounded-full"></div>
                    <img src={image} alt={title} className="relative z-10 rounded-2xl shadow-xl w-full transform hover:-translate-y-2 transition-transform duration-500" />
                </div>
                <div className={`space-y-6 ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white font-display">{title}</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
                    <ul className="space-y-3 pt-4">
                        {features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="mt-1 w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-[10px] text-yellow-600 dark:text-yellow-400 font-bold">✓</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{feat}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="p-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-white/10 hover:shadow-xl transition-all duration-300 group">
        <IconBadge icon={icon} size="md" className="mb-4 group-hover:scale-110 transition-transform duration-300" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const AffiliateLandingPage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    const topics = [
        {
            title: "High-Ticket Commissions",
            image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop",
            description: "Earn up to 20% on every sale or rental you generate. With high-value items like luxury cameras and drones, your payouts stack up fast. We offer industry-leading rates to our top partners.",
            features: ["Competitive Base Rates", "Performance Bonuses", "Recurring Commissions on Rentals", "No Earning Caps", "Instant Payout Options"]
        },
        {
            title: "Advanced Tracking Dashboard",
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
            description: "See exactly which links are performing in real-time. Track clicks, conversions, and revenue by channel. Use our deep-linking tools to direct users to specific product pages.",
            features: ["Real-time Analytics", "UTM Parameter Support", "Conversion Heatmaps", "Device & Geo Tracking", "Exportable Data"]
        },
        {
            title: "Creative Asset Library",
            image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop",
            description: "Don't waste time designing. Access a massive library of high-converting banners, social media templates, and email swipes. Just copy, paste, and post.",
            features: ["Instagram Story Templates", "High-Res Product Imagery", "Email Copy Swipes", "Video Ad Reels", "Seasonal Campaign Kits"]
        },
        {
            title: "Influencer Seeding Kits",
            image: "https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=1200&auto=format&fit=crop",
            description: "Top-tier affiliates get free access to products for review. Unbox, test, and showcase the latest gear to your audience without spending a dime.",
            features: ["Free Product Samples", "Early Access to Launches", "Exclusive Discount Codes", "Co-branded Giveaways", "Featured Creator Spotlights"]
        },
        {
            title: "Sub-Affiliate Network",
            image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop",
            description: "Build your own team. Refer other affiliates to Urban Prime and earn a percentage of their sales forever. Scale your income passively.",
            features: ["2nd Tier Commissions", "Team Management Tools", "Referral Leaderboards", "Passive Income Stream", "Mentorship Resources"]
        },
         {
            title: "Global Payout System",
            image: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=1200&auto=format&fit=crop",
            description: "Get paid how you want, when you want. We support direct bank transfer, PayPal, Crypto, and Urban Prime store credit with a bonus multiplier.",
            features: ["Weekly Payouts", "Multiple Currencies", "Low Withdrawal Minimums", "Automated Invoicing", "Tax Documentation Support"]
        }
    ];

    const extendedFeatures = [
        { title: "Deep Linking", desc: "Link directly to any specific product page.", icon: "🔗" },
        { title: "Custom Coupons", desc: "Create your own vanity codes (e.g. SAVE20).", icon: "🎟️" },
        { title: "Bonus Tiers", desc: "Hit targets to unlock higher commission rates.", icon: "🚀" },
        { title: "Leaderboards", desc: "Compete with other affiliates for cash prizes.", icon: "🏆" },
        { title: "Real-time Clicks", desc: "Watch traffic hit your links live.", icon: "⏱️" },
        { title: "Pixel Tracking", desc: "Add your own Facebook/Google pixel.", icon: "🎯" },
        { title: "Postback URLs", desc: "Server-to-server tracking for pro marketers.", icon: "📡" },
        { title: "API Access", desc: "Pull product data into your own apps.", icon: "🤖" },
        { title: "Media Kits", desc: "Auto-generated kits to pitch to brands.", icon: "📂" },
        { title: "Exclusive Events", desc: "Invites to affiliate networking parties.", icon: "🥂" },
        { title: "Dedicated Manager", desc: "1-on-1 support to help you grow.", icon: "👨‍💼" },
        { title: "Brand Collabs", desc: "Direct deals with top sellers on the platform.", icon: "🤝" }
    ];

    const techSpecs = [
        "Cookie Duration: 30 Days", "Cross-Device Tracking", "Sub-ID Tracking", "CSV Export",
        "Multi-Currency Support", "Tax Form Automation", "Community Forum Access", "Compliance Tools"
    ];

    return (
        <div className="bg-white dark:bg-[#0a0a0a] min-h-screen font-sans overflow-x-hidden selection:bg-yellow-400 selection:text-black">
            <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 transform-origin-0 z-50" style={{ scaleX }} />

            {/* HERO */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-gray-50 dark:bg-[#050505]">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-gray-900 dark:text-white hover:text-yellow-500" />
                </div>
                <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    <div className="mb-8 animate-float"><NetworkLogo /></div>
                    <h1 className="text-6xl md:text-9xl font-black font-display tracking-tighter text-gray-900 dark:text-white mb-6">
                        EARN <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">TOGETHER</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed font-light mb-10">
                        Turn your influence into income. Join the world's fastest-growing circular economy affiliate network.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <Link to="/profile/affiliate" className="px-12 py-5 bg-yellow-400 text-black rounded-full font-bold text-lg hover:bg-yellow-500 transition-all shadow-[0_10px_30px_rgba(250,204,21,0.4)]">
                            Join Program
                        </Link>
                         <Link to="/about" className="px-12 py-5 border-2 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white rounded-full font-bold text-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            Learn More
                        </Link>
                    </div>
                </div>
            </section>

            {/* CONTENT */}
            <div>
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
            <section className="py-24 bg-gray-50 dark:bg-[#0F0F0F]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 font-display">Partner Perks</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Tools and benefits designed to help you earn more.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extendedFeatures.map((feat, i) => (
                            <GridFeature key={i} title={feat.title} desc={feat.desc} icon={feat.icon} />
                        ))}
                    </div>
                </div>
            </section>

            {/* TECH SPECS */}
            <section className="py-24 bg-white dark:bg-black border-t border-gray-200 dark:border-white/10">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white font-display">Program Details</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                <span className="text-yellow-500">★</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-yellow-50 dark:bg-[#111] text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl md:text-7xl font-black font-display mb-8 text-gray-900 dark:text-white">MONETIZE YOUR PASSION</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                        Whether you're a blogger, influencer, or just have a lot of friends, there's a place for you in our partner network.
                    </p>
                    <Link to="/profile/affiliate" className="inline-block px-16 py-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-xl font-bold hover:scale-105 transform duration-300">
                        Start Earning Now
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default AffiliateLandingPage;
