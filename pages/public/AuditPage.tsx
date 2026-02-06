
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';

// --- Custom Animated Logo ---
const ShieldScanLogo = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Rotating Shields */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-cyan-500/30 rounded-[30%]"
            />
             <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border-2 border-blue-500/30 rounded-[40%]"
            />
            {/* Center Shield */}
            <svg width="80" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400 z-10">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {/* Scanning Beam */}
            <motion.div 
                className="absolute w-full h-1 bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,1)] z-20"
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center gap-3 mb-2 text-cyan-100/80">
        <span className="text-cyan-400">●</span>
        <span className="text-sm font-medium tracking-wide">{text}</span>
    </div>
);

const DeepDiveSection: React.FC<{ title: string; description: string; features: string[]; image: string; index: number }> = ({ title, description, features, image, index }) => {
    return (
        <section className="py-24 relative border-b border-cyan-900/30 bg-[#020617]">
            <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                <div className={`space-y-8 ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <h2 className="text-3xl md:text-5xl font-bold text-white font-display tracking-tight">
                        <span className="text-cyan-500">0{index + 1}.</span> {title}
                    </h2>
                    <p className="text-lg text-slate-400 leading-relaxed font-light">{description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        {features.map((feat, i) => <FeatureItem key={i} text={feat} />)}
                    </div>
                </div>
                <div className={`relative ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                    <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] rounded-full"></div>
                    <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] group">
                         <img src={image} alt={title} className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                         {/* Overlay Scanner Effect */}
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-20"></div>
                         <motion.div 
                            className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.8)]"
                            animate={{ top: ['0%', '100%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="p-6 bg-[#0B1120] border border-cyan-900/30 rounded-2xl hover:bg-[#0F172A] hover:border-cyan-500/30 transition-all duration-300 group">
        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-cyan-400 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
);

const AuditPage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    const coreTopics = [
        {
            title: "AI-Powered Visual Verification",
            image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop",
            description: "Our proprietary Computer Vision models analyze item photos pixel-by-pixel. We check for brand authenticity markers, wear-and-tear consistency, and metadata anomalies to ensure what you see is what you get.",
            features: ["Pattern Recognition", "Metadata Forensics", "Logo Authenticity Check", "Reverse Image Search", "Condition Grading AI"]
        },
        {
            title: "Physical Inspection Hubs",
            image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop",
            description: "For high-value items, we offer an optional 'Prime Certified' service. Items are shipped to our secure facilities where experts physically inspect, clean, and verify them before they reach the buyer.",
            features: ["White-Glove Inspection", "Professional Cleaning", "Secure Custody Chain", "Certification Tags", "Tamper-Proof Packaging"]
        },
        {
            title: "Blockchain Authenticity Records",
            image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop",
            description: "Every verified item gets a digital twin on the blockchain. This immutable record tracks ownership history, condition reports, and service logs, creating a permanent provenance trail.",
            features: ["NFT Digital Twins", "Ownership History", "Immutable Repair Logs", "Transferable Value", "Anti-Counterfeit Ledger"]
        },
        {
            title: "Identity & Trust Scoring",
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
            description: "We don't just verify items; we verify people. Our multi-layered identity check uses government ID scanning, biometric matching, and social graph analysis to keep bad actors out.",
            features: ["Biometric Facial Match", "Gov ID Scanning", "Watchlist Screening", "Behavioral Biometrics", "Social Graph Analysis"]
        },
        {
            title: "Secure Escrow Payments",
            image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop",
            description: "Money never changes hands until the deal is verified. Buyer funds are held in a secure neutral vault and only released to the seller once the item is received and approved.",
            features: ["Milestone Releases", "Dispute Freezing", "Multi-Sig Wallets", "Auto-Refund Triggers", "Fraud Transaction Monitoring"]
        },
         {
            title: "Smart Dispute Resolution",
            image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
            description: "If something goes wrong, our AI mediator analyzes chat logs, contract terms, and evidence photos to propose a fair resolution instantly. Human experts are always on standby for complex cases.",
            features: ["Evidence Analysis AI", "Policy Enforcement", "Neutral Arbitration", "Instant Mediation Proposals", "24/7 Resolution Center"]
        }
    ];

    const extendedFeatures = [
        { title: "3D Scanning", desc: "Create rotatable 3D models of items for inspection.", icon: "🧊" },
        { title: "Holographic Tags", desc: "Tamper-evident seals for physical verification.", icon: "🏷️" },
        { title: "NFC Certificates", desc: "Tap-to-verify cards included with luxury items.", icon: "📱" },
        { title: "Background Checks", desc: "Optional criminal record checks for service providers.", icon: "🕵️" },
        { title: "Social Footprint", desc: "Analysis of public social data to verify persona.", icon: "🌐" },
        { title: "Device Fingerprinting", desc: "Advanced anti-fraud tech to block repeat offenders.", icon: "💻" },
        { title: "Shipping Insurance", desc: "Full coverage for items in transit.", icon: "📦" },
        { title: "Condition Reports", desc: "Standardized grading system (Mint, Good, Fair).", icon: "📋" },
        { title: "Stolen Item Registry", desc: "Cross-referenced with police databases.", icon: "🚓" },
        { title: "Expert Panels", desc: "Niche experts available for rare collectibles.", icon: "🧐" },
        { title: "Video Verification", desc: "Live video calls to inspect items remotely.", icon: "📹" },
        { title: "Geo-Verification", desc: "Location confirmation for local pickups.", icon: "📍" }
    ];

    const techSpecs = [
        "Buyer Protection", "Seller Protection", "Fast Track Verification", "Document Analysis",
        "Community Policing", "Audit Trails", "GDPR Compliance", "Data Encryption",
        "Two-Factor Auth", "Session Management", "IP Whitelisting", "Incident Reporting"
    ];

    return (
        <div className="bg-[#020617] text-slate-300 min-h-screen font-sans selection:bg-cyan-500 selection:text-black">
            <motion.div className="fixed top-0 left-0 right-0 h-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4] transform-origin-0 z-50" style={{ scaleX }} />

            {/* HERO */}
            <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-white hover:text-cyan-400" />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] z-0"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                    <div className="mb-10 animate-float"><ShieldScanLogo /></div>
                    <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white mb-6 drop-shadow-lg">
                        TRUST <span className="text-cyan-500">VERIFIED</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-light mb-12">
                        The gold standard in marketplace security. Advanced verification, physical auditing, and blockchain provenance.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <Link to="/safety-center" className="px-10 py-4 bg-cyan-500 text-black font-bold rounded-sm hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] tracking-widest uppercase text-sm">
                            Safety Center
                        </Link>
                         <Link to="/support-center" className="px-10 py-4 border border-cyan-500/30 text-cyan-400 font-bold rounded-sm hover:bg-cyan-950/30 transition-all tracking-widest uppercase text-sm">
                            File a Claim
                        </Link>
                    </div>
                </div>
            </section>

            {/* CONTENT */}
            <div className="bg-[#020617]">
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
            <section className="py-24 bg-[#050B1C]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 font-display">Security Layers</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Multiple tiers of protection for every transaction type.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extendedFeatures.map((feat, i) => (
                            <GridFeature key={i} title={feat.title} desc={feat.desc} icon={feat.icon} />
                        ))}
                    </div>
                </div>
            </section>

             {/* TECH SPECS */}
            <section className="py-24 bg-[#020617] border-t border-cyan-900/20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white font-display">Protection Protocols</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-cyan-950/20 rounded-lg border border-cyan-900/30">
                                <span className="text-cyan-500">🛡️</span>
                                <span className="text-sm font-medium text-slate-300">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

             {/* CTA */}
            <section className="py-32 bg-slate-900 relative overflow-hidden border-t border-cyan-900/30">
                <div className="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none">
                     <ShieldScanLogo />
                </div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h2 className="text-4xl md:text-6xl font-black font-display text-white mb-6">SECURE YOUR NEXT DEAL</h2>
                    <p className="text-xl text-slate-400 mb-10">Transactions backed by the Urban Prime Guarantee.</p>
                    <Link to="/browse" className="inline-block px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform">
                        Shop Verified Items
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default AuditPage;
