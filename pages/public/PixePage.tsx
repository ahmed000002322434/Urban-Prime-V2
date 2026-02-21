
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';
import IconBadge from '../../components/IconBadge';

// --- Icons ---
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>;

// --- Components ---

// 1. Custom Futuristic Play Logo (Code Generated)
const FuturisticPlayLogo = () => {
    return (
        <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Outer Rotating Ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-gray-300 dark:border-gray-700 opacity-40 border-dashed"
            />
             {/* Counter Rotating Digital Arcs */}
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-3 rounded-full border-t-4 border-r-4 border-transparent border-t-cyan-500 border-r-purple-500 opacity-80 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
            />
            
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

            {/* The Play Button Shape - Pixelated & Vibrant */}
             <motion.div 
                whileHover={{ scale: 1.1 }}
                className="relative z-10 w-32 h-32 flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
                <div className="w-full h-full relative" style={{ clipPath: "polygon(25% 20%, 85% 50%, 25% 80%)" }}>
                     <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600"></div>
                     {/* Pixel Overlay */}
                     <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhZWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-30 mix-blend-overlay"></div>
                </div>
            </motion.div>

            {/* Floating Particles */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-sm"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: [0, (Math.random() - 0.5) * 150],
                        y: [0, (Math.random() - 0.5) * 150],
                        rotate: [0, 180]
                    }}
                    transition={{
                        duration: 2 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeOut"
                    }}
                    style={{ top: '50%', left: '50%' }}
                />
            ))}
        </div>
    );
};

// 2. Word Reveal Component for Topic Text
const WordReveal: React.FC<{ text: string; delay?: number, className?: string }> = ({ text, delay = 0, className = "" }) => {
    const words = text.split(" ");
    return (
        <p className={className}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.5, delay: delay + i * 0.02 }}
                    className="inline-block mr-1.5 last:mr-0"
                >
                    {word}
                </motion.span>
            ))}
        </p>
    );
};

// 3. Deep Dive Blog Section Component
const DeepDiveSection: React.FC<{ 
    title: string; 
    subtitle: string;
    paragraphs: string[]; 
    image: string; 
    index: number; 
}> = ({ title, subtitle, paragraphs, image, index }) => {
    const isEven = index % 2 === 0;
    
    return (
        <section className="py-16 sm:py-20 md:py-32 relative overflow-hidden">
             {/* Background decoration */}
             <div className={`absolute top-1/2 -translate-y-1/2 ${isEven ? 'right-0 translate-x-1/3' : 'left-0 -translate-x-1/3'} w-1/2 h-full bg-gradient-to-b from-primary/5 via-purple-500/5 to-transparent blur-[100px] pointer-events-none rounded-full`} />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-24 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    
                    {/* Image Side */}
                    <div className="lg:w-1/2 w-full">
                        <div className="relative group perspective-1000">
                             <motion.div 
                                initial={{ rotateY: isEven ? 5 : -5, opacity: 0, scale: 0.95 }}
                                whileInView={{ rotateY: 0, opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
                                className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 dark:border-white/10"
                             >
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent z-10"></div>
                                <img src={image} alt={title} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-[2s] ease-out" />
                                
                                {/* Floating Glass Card Overlay */}
                                <motion.div 
                                    initial={{ y: 30, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.8 }}
                                    className={`absolute bottom-6 ${isEven ? 'left-6' : 'right-6'} bg-white/10 backdrop-blur-xl border border-white/30 p-5 rounded-2xl z-20 max-w-[280px] shadow-lg`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                                        <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Active Feature</span>
                                    </div>
                                    <p className="text-white text-sm font-medium leading-relaxed opacity-95">{subtitle}</p>
                                </motion.div>
                             </motion.div>
                             
                             {/* Decorative offset border */}
                             <div className={`absolute inset-0 rounded-[2rem] border-2 border-dashed border-gray-300 dark:border-gray-700 -z-10 transform ${isEven ? 'translate-x-6 translate-y-6' : '-translate-x-6 translate-y-6'} opacity-50`} />
                        </div>
                    </div>

                    {/* Text Side */}
                    <div className="lg:w-1/2 w-full space-y-8">
                        <div>
                            <motion.div 
                                initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="flex items-center gap-4 mb-4"
                            >
                                <span className="text-6xl font-black text-gray-200 dark:text-white/5 font-display select-none">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="h-px bg-gradient-to-r from-primary to-transparent w-24"></div>
                            </motion.div>
                            
                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-display text-gray-900 dark:text-white leading-[1.1] mb-6">
                                {title}
                            </h2>
                        </div>
                        
                        <div className="space-y-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                            {paragraphs.map((para, i) => (
                                <WordReveal key={i} text={para} delay={i * 0.15} className="mb-4" />
                            ))}
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.6 }}
                            className="pt-4"
                        >
                            <Link to="/pixe-studio" className="group inline-flex items-center gap-3 text-primary font-bold text-lg hover:text-purple-500 transition-colors">
                                <span className="border-b-2 border-primary group-hover:border-purple-500 transition-colors">Experience It Live</span>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transform group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// 4. Monetization Card Component
const PricingCard: React.FC<{ tier: string; rate: string; color: string; features: string[] }> = ({ tier, rate, color, features }) => {
    return (
        <motion.div 
            whileHover={{ y: -15, rotateX: 5, rotateY: 5 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-6 sm:p-8 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-full transform transition-all duration-500 perspective-1000 group"
        >
            <div className={`absolute top-0 left-0 w-full h-1.5 ${color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
            
            <div className="mb-6">
                <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{tier} Creator</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Unlock potential</p>
            </div>

            <div className="flex items-baseline gap-1 mb-8 pb-8 border-b border-gray-100 dark:border-white/10">
                <span className={`text-6xl font-black ${color.replace('bg-', 'text-')} tracking-tighter`}>{rate}</span>
                <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Commission</span>
            </div>
            
            <ul className="space-y-5 flex-1">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-4">
                        <div className={`mt-0.5 w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[10px]`}>
                            <CheckIcon />
                        </div>
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">{feat}</span>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: React.ReactNode }> = ({ title, desc, icon }) => (
    <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:shadow-xl transition-all duration-300">
        <IconBadge icon={icon} size="md" className="mb-4 border-primary/10 bg-primary/10 text-primary" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const PixePage: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const ecosystemDetails = [
        {
            title: "Shop The Look Technology",
            subtitle: "Turn Inspiration into Instant Action",
            image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "Gone are the days of tirelessly scrolling through comments asking 'Where did you get that?'. With Pixe's revolutionary Shop The Look technology, every frame of a video becomes a shoppable storefront. Our system utilizes advanced computer vision to identify items within the video stream in real-time.",
                "Creators can tag products with pinpoint accuracy, linking directly to the inventory. When a viewer taps on a tagged item, a non-intrusive, sleek card slides up, revealing real-time pricing, availability, size options, and a direct 'Buy Now' button. The purchase happens seamlessly within the app, reducing friction and boosting conversion rates by up to 300% compared to traditional affiliate links.",
                "This isn't just convenience; it's a paradigm shift. It transforms passive viewing into active discovery, satisfying the immediate impulse to own what inspires us."
            ]
        },
        {
            title: "AI Discovery Engine",
            subtitle: "A Feed That Knows Your Vibe",
            image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "The Urban Genie Algorithm is the brain behind Pixe. It goes far beyond simple click tracking. It deeply analyzes the *vibe* of what you watch—the aesthetics, the pacing, the background music, and the semantic content of the video itself—to build a comprehensive 'Taste Profile' unique to every user.",
                "Whether you're into minimalist Japanese streetwear, maximalist bohemian home decor, or high-performance tech gadgets, the Discovery Engine ensures your feed is a constant stream of relevant inspiration. It solves the 'paradox of choice' by filtering out the noise and surfacing items you didn't even know you needed, exactly when you're most likely to want them.",
                "By predicting trends before they go mainstream, Pixe keeps you ahead of the curve, making discovery feel like serendipity engineered by intelligence."
            ]
        },
        {
            title: "Gamified Creator Tiers",
            subtitle: "Level Up Your Career",
            image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "We believe creating content is a legitimate profession, and professions should have clear career paths. Our Creator Tier System turns content creation into a transparent, gamified journey. Starting as a Bronze creator, you unlock tangible perks, higher commission rates, and exclusive tools as you drive sales and engagement.",
                "Climb the ranks to Silver to unlock detailed audience analytics, trend forecast reports, and priority support. Reach Gold status to get a dedicated account manager, access to our exclusive 'Brand Collabs' marketplace, and features on the homepage.",
                "It's not just about vanity metrics like follower counts; it's about the real value you create for the community. We reward consistency, quality, and conversion, giving every creator a fair shot at success."
            ]
        },
        {
            title: "Pixe Studio Editor",
            subtitle: "Hollywood In Your Pocket",
            image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44c?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "You don't need expensive software or a desktop rig to make Hollywood-level content. Pixe Studio is a powerful video editor built right into your browser. It features AI-powered auto-captioning that syncs perfectly with your speech, boosting accessibility and viewer retention.",
                "Our 'Smart Trim' feature automatically identifies and removes silence and filler words, tightening your pacing instantly. Plus, with direct integration to your inventory, tagging products is as simple as dragging and dropping them onto the timeline markers.",
                "From color grading presets to royalty-free music synchronization, Pixe Studio gives you all the tools to create, edit, and publish high-converting content in minutes, not hours."
            ]
        },
        {
            title: "Live Shopping Events",
            subtitle: "Interactive Real-Time Commerce",
            image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "Experience the thrill of the auction block and the intimacy of a personal shopping session from your living room. Pixe Live enables creators and brands to host real-time shopping events that are engaging, interactive, and highly profitable.",
                "Demonstrate products live, answer questions in the chat instantly, and drop exclusive limited-time discounts to drive urgency. Features include 'Flash Auctions' where prices drop every minute until sold out, and 'Battle Mode' where the audience votes on which product gets a discount.",
                "It turns solitary online shopping into a communal entertainment experience, fostering a sense of belonging and excitement that static pages simply cannot match."
            ]
        },
        {
            title: "Verified Video Reviews",
            subtitle: "Trust Through Authenticity",
            image: "https://images.unsplash.com/photo-1512418490979-59295d48651c?q=80&w=1200&auto=format&fit=crop",
            paragraphs: [
                "Text reviews can be faked. Video is visceral. Pixe encourages Verified Video Reviews, a system where only users who have actually purchased an item through Urban Prime can post a review video linked to that product.",
                "See how the fabric moves, hear how the speaker sounds, or watch the drone in flight. Authentic, user-generated proof helps buyers make confident decisions, knowing they are seeing the product in a real-world environment, not a staged studio.",
                "This transparency drastically reduces return rates for sellers and builds a community based on honest feedback and shared experiences."
            ]
        }
    ];

    const extendedFeatures = [
        { title: "Direct Messaging", desc: "Viewers can DM creators directly from a video to ask questions.", icon: "💬" },
        { title: "Polls & Quizzes", desc: "Interactive stickers to boost engagement and gather feedback.", icon: "📊" },
        { title: "Countdown Stickers", desc: "Create hype for product drops with reminders.", icon: "⏰" },
        { title: "Duet & Remix", desc: "Collaborate with other creators by remixing their content.", icon: "👥" },
        { title: "Audio Library", desc: "Access thousands of trending, royalty-free tracks.", icon: "🎵" },
        { title: "Auto-Captions", desc: "AI-generated subtitles for accessibility and silent viewing.", icon: "📝" },
        { title: "Beauty Filters", desc: "Subtle, professional-grade filters to look your best.", icon: "✨" },
        { title: "Green Screen", desc: "Change your background instantly without a physical screen.", icon: "🟩" },
        { title: "Scheduled Posting", desc: "Plan your content calendar in advance.", icon: "🗓️" },
        { title: "Multi-Clip Editing", desc: "Seamlessly stitch together multiple takes.", icon: "🎬" },
        { title: "Voiceover Tool", desc: "Record commentary over your video clips.", icon: "🎙️" },
        { title: "Hashtag Analytics", desc: "See which tags are driving the most traffic.", icon: "#️⃣" }
    ];

    const techSpecs = [
        "4K Video Support", "60fps Playback", "HDR Compatible", "Low Latency Streaming",
        "Adaptive Bitrate", "H.265 Compression", "Spatial Audio", "Cross-Platform Sync",
        "Cloud Drafts", "API Access", "RTMP Ingest", "Custom Thumbnails"
    ];

    return (
        <div className="bg-white dark:bg-[#0a0a0a] min-h-screen font-sans overflow-x-hidden selection:bg-primary selection:text-white">
            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transform-origin-0 z-50"
                style={{ scaleX }}
            />

            {/* HERO SECTION */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton className="text-gray-900 dark:text-white hover:text-cyan-500" />
                </div>
                {/* Background Video/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-black dark:to-[#0a0a0a] z-0"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50 blur-3xl animate-pulse"></div>

                <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    {/* Replaced Image with Code-Generated Logo */}
                    <div className="mb-12 scale-75 md:scale-100 animate-float">
                        <FuturisticPlayLogo />
                    </div>

                    <motion.h1 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                        className="text-6xl md:text-8xl lg:text-9xl font-black font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-8"
                    >
                        PIXE
                    </motion.h1>

                    <motion.p 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-light"
                    >
                        The next evolution of social commerce. Where <span className="text-primary font-bold">inspiration</span> meets <span className="text-purple-500 font-bold">instant ownership</span>.
                    </motion.p>

                    <motion.div 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-6 mt-12"
                    >
                        <Link to="/reels" className="group relative px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-lg overflow-hidden shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-105">
                             <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <span className="relative flex items-center gap-2">Start Watching</span>
                        </Link>
                        <Link to="/pixe-studio" className="px-10 py-5 bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-full font-bold text-lg hover:bg-white/10 transition-colors">
                            Creator Studio
                        </Link>
                    </motion.div>
                </div>
                
                {/* Scroll Down Indicator */}
                <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] uppercase tracking-widest font-bold">Discover The Ecosystem</span>
                    <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent"></div>
                </motion.div>
            </section>

            {/* DEEP DIVE BLOG SECTIONS */}
            <div className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-white/5">
                {ecosystemDetails.map((item, index) => (
                    <DeepDiveSection 
                        key={index} 
                        index={index} 
                        title={item.title} 
                        subtitle={item.subtitle}
                        paragraphs={item.paragraphs} 
                        image={item.image} 
                    />
                ))}
            </div>

            {/* EXTENDED FEATURES GRID */}
            <section className="py-24 bg-gray-100 dark:bg-[#080808]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 font-display">Creator Tools</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">A full suite of professional tools to help you create, engage, and earn.</p>
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
                                <span className="text-purple-500">✓</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* MONETIZATION POLICY */}
            <section className="py-32 bg-white dark:bg-black relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <span className="text-green-500 font-bold tracking-widest uppercase text-sm border border-green-500/30 px-3 py-1 rounded-full">Revenue Share</span>
                        <h2 className="text-5xl md:text-7xl font-black font-display text-gray-900 dark:text-white mt-6 mb-8 tracking-tight">
                            Transparent Monetization
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                            We offer the industry's most competitive revenue sharing model. Start earning from your very first sale with no hidden fees and instant payouts.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                        <PricingCard 
                            tier="Bronze" 
                            rate="5%" 
                            color="bg-orange-400"
                            features={['Basic Analytics', 'Standard Support', 'Creator Hub Access', 'Weekly Payouts']} 
                        />
                        <div className="transform scale-105 z-10">
                             <PricingCard 
                                tier="Silver" 
                                rate="7%" 
                                color="bg-gray-400"
                                features={['Advanced Analytics', 'Priority Support', 'Trend Forecasts', 'Profile Badge', 'Daily Payouts']} 
                            />
                        </div>
                        <PricingCard 
                            tier="Gold" 
                            rate="10%" 
                            color="bg-yellow-400"
                            features={['Dedicated Manager', 'Brand Sponsorships', 'Early Access Features', 'Homepage Feature', 'Instant Payouts']} 
                        />
                    </div>
                    
                    <div className="mt-16 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                             * Rates are subject to performance reviews. Terms and conditions apply.
                        </p>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-40 bg-black text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-6xl md:text-9xl font-black font-display mb-8 tracking-tighter">
                        GO VIRAL TODAY
                    </h2>
                    <p className="text-2xl text-gray-300 mb-12 max-w-2xl mx-auto font-light">
                        The tools are ready. The audience is waiting. All that's missing is you.
                    </p>
                    <Link 
                        to="/pixe-studio" 
                        className="inline-block px-16 py-6 bg-white text-black rounded-full text-xl font-bold hover:bg-gray-200 transition-colors shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-105 transform duration-300"
                    >
                        Launch Studio
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default PixePage;
