
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../hooks/useTheme';

// Custom Reveal Component
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; width?: "fit-content" | "100%" }> = ({ children, delay = 0, width = "fit-content" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    
    return (
        <motion.div
            ref={ref}
            initial={{ y: 75, opacity: 0, filter: 'blur(10px)' }}
            animate={isInView ? { y: 0, opacity: 1, filter: 'blur(0px)' } : {}}
            transition={{ duration: 1, delay: delay, ease: [0.16, 1, 0.3, 1] }}
            style={{ width }}
        >
            {children}
        </motion.div>
    );
};

const GemstoneShowcasePage: React.FC = () => {
    // Parallax logic
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 1000], [0, 400]);
    const textY = useTransform(scrollY, [0, 1000], [0, 200]);

    return (
        <div className="bg-[#FDFBF7] dark:bg-[#050505] text-[#121212] dark:text-[#FDFBF7] font-sans selection:bg-[#D4AF37] selection:text-black overflow-hidden">
            {/* Navigation Overlay - Keeping App Header but adding local branding if needed, or just let App Header handle it. 
                We'll add a back button for context. */}
            <div className="fixed top-24 left-8 z-40 hidden md:block">
                 <BackButton className="text-white mix-blend-difference hover:text-[#D4AF37]" />
            </div>

            {/* --- HERO SECTION --- */}
            <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#050505]">
                <div className="absolute inset-0 z-0">
                    <motion.div style={{ y: heroY }} className="w-full h-full">
                        <img 
                            alt="Ethereal Model Background" 
                            className="w-full h-full object-cover opacity-60 scale-105" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz3X9wILGED9fSyzVW4i8ma8lL1pDzU42o01l5-daQB5r9rVvuZY1BJiwO5Pqjy_KKrRAFLJQC18F_lnA-AEm4j_N8h6FoTNEeQ9kqeoB_-OMHyV3YeuCwE9TU0N5H9P3_md99UT5I25ezQEgnYQc_vuW9HdSOiJ_sntxL-ZXJwZIFQol2aPTKUj3zn5qaWmT2lmEWLyEBGnlOnm5EXh-GKv5pFu719D1UbY1BQxJrj0PpJMn3pT63VylX3Xa53pVyUw0iqw-Sxg" 
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/60 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 lg:px-12 relative z-10 h-full flex flex-col justify-center">
                    <motion.div style={{ y: textY }} className="relative max-w-5xl">
                        <Reveal delay={0.1}>
                            <span className="block text-[#D4AF37] text-xs font-bold uppercase tracking-[0.5em] mb-6">The 2025 Collection</span>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <h1 className="font-serif text-[5rem] lg:text-[8rem] leading-[0.85] text-white mix-blend-overlay relative z-20">
                                Ethereal <br/>
                                <span className="italic font-light ml-12 lg:ml-32 text-white/90 font-serif">Adornments</span>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.3}>
                            <div className="mt-12 max-w-lg border-l border-[#D4AF37]/50 pl-8 backdrop-blur-sm p-4 rounded-r-lg bg-black/10">
                                <p className="text-lg font-light leading-relaxed text-gray-200">
                                    Where digital scarcity meets physical grandeur. A sanctuary for the rare, the unseen, and the meticulously crafted.
                                </p>
                                <div className="flex gap-8 items-center mt-8">
                                    <button onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white text-black px-10 py-4 uppercase text-[10px] tracking-[0.25em] font-bold hover:bg-[#D4AF37] hover:text-white transition-all duration-500 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                                        Explore
                                    </button>
                                    <span className="h-[1px] w-12 bg-white/30"></span>
                                    <span className="text-xs text-white/60 font-serif italic">Scroll to discover</span>
                                </div>
                            </div>
                        </Reveal>
                    </motion.div>
                </div>

                {/* Floating Parallax Element */}
                <motion.div 
                    className="absolute bottom-[10%] right-[5%] lg:right-[10%] w-64 lg:w-96 aspect-[3/4] z-20 hidden md:block group cursor-pointer"
                    style={{ y: useTransform(scrollY, [0, 1000], [0, -200]) }}
                >
                    <div className="relative w-full h-full overflow-hidden shadow-2xl border border-white/10 hover:border-[#D4AF37]/50 transition-colors duration-500">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                        <img 
                            alt="Floating Watch Detail" 
                            className="w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-[1.5s]" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk2TjMKhYhkhwh0EEzGAeFIV8k61vdwopqihCt5gDbu5ns9BPVI7re3l1VMlODX9z3F-sr6XIZ-a6w7shmVTTXJAkND7M_iMveYLAkHX5oIalvxqHPIIxp5wfij4y5NMSt9PmVATFvyH6PtTrZOTTo-Cp8wO3plI2-b3qA1HwaVss3sJ4x_uhHqvWDZOMWaY-mN4rxEhq-aysFCzWTymwWKZDHtOptdxmHZLJas5T0i4n8xuic49ilMgvSYwZSzJPT09-rGEgZWg"
                        />
                        <div className="absolute -left-12 top-12 bg-[#050505] text-white py-3 px-6 -rotate-90 origin-center text-[9px] uppercase tracking-widest border border-white/20">
                            Featured Rarity
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* --- CURATED RARITIES --- */}
            <section className="py-32 lg:py-48 bg-[#FDFBF7] dark:bg-[#0a0a0a] relative overflow-hidden" id="featured">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-16 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-32">
                        <div className="max-w-2xl">
                            <Reveal>
                                <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] block mb-4">The Selection</span>
                                <h2 className="font-serif text-5xl lg:text-7xl text-[#050505] dark:text-white leading-none">
                                    Curated <span className="italic text-[#AA8C2C] font-light">Rarities</span>
                                </h2>
                                <div className="h-[1px] bg-[#050505] dark:bg-white mt-8 w-32"></div>
                            </Reveal>
                        </div>
                        <div className="hidden md:block text-right">
                             <Reveal delay={0.2}>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Available Assets</p>
                                <p className="font-serif text-4xl text-[#050505] dark:text-white">04 / <span className="text-gray-300 dark:text-gray-700">24</span></p>
                            </Reveal>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-y-32 gap-x-12 w-full">
                        {/* ITEM 1 */}
                        <div className="col-span-1 md:col-span-5 md:col-start-1 group cursor-pointer">
                            <Reveal delay={0.1}>
                                <Link to="/clothing">
                                    <div className="relative w-full aspect-[3/4] overflow-hidden mb-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-shadow duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(212,175,55,0.25)]">
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10"></div>
                                        <img 
                                            alt="Haute Couture" 
                                            className="w-full h-full object-cover object-top transition-transform duration-[2s] ease-out group-hover:scale-105" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6YxWHzYNrL9jMkzZPWqydoP-LrPZQ_bpZarB2MrKBIWnDj5P40EIpDbuSBYe8MoRhrEZ82DBXwmIMaiyihh0mx0dzWuDCxEFVzXuZAzJhJvUuaSSjAeFSDghqcJv_YoWZVlpbifaojoYgdjiKblOxxWiLm2Jo0URMLBqRxo5VB_UuBYBgLoZIP0MOjPCUFOmDBwfVx54KfamhUyktER-ZX-9D3SlH01eZLdXFdEa5Iwz6Bigo9K1spu8tee2Vz67vsSsIQ7mhkQ"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                                            <span className="text-white text-[9px] uppercase tracking-widest border border-white/30 px-3 py-1">View Details</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-baseline border-t border-gray-200 dark:border-gray-800 pt-6 group-hover:border-[#D4AF37]/50 transition-colors">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-2">Couture</p>
                                            <h3 className="font-serif text-3xl italic text-[#121212] dark:text-white group-hover:translate-x-2 transition-transform duration-500">Sculptural Form</h3>
                                        </div>
                                        <span className="font-mono text-xs text-gray-400">#001</span>
                                    </div>
                                </Link>
                            </Reveal>
                        </div>

                        {/* ITEM 2 */}
                        <div className="col-span-1 md:col-span-6 md:col-start-7 md:mt-48 group cursor-pointer">
                            <Reveal delay={0.3}>
                                <Link to="/jewelry">
                                    <div className="relative w-full aspect-square overflow-hidden mb-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-shadow duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(212,175,55,0.25)] bg-[#F2F0ED]">
                                        <img 
                                            alt="Fine Jewelry" 
                                            className="w-full h-full object-cover p-12 transition-transform duration-[2s] ease-out group-hover:scale-110 group-hover:rotate-3" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgkPtoXvbDR1KVRWi4BWYlGP10iwisJ3fqrobCEDMnsJdaNi-73RBMTuL7ZMDjttGsLapTdO22kJAcAMXcDf-6lSXD7e6p8v00uztjVWmG0h0LasQThgmMUTVpzHZvNAEYv48ZFf70VWIUNyXLOSdXSC5O9ZUH6RjRhqr7wd9fLPwV3GvIgm3kj9O7l3-OnXUrPMsuX9AjC9QJrY00rGZks3MHwVEtpTH68AehgywE4ln1CLm5fOscTkVPpGNFjz27b96H2UmZaA"
                                        />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 group-hover:ring-[#D4AF37]/20 transition-all"></div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-2">Fine Jewelry</p>
                                        <h3 className="font-serif text-3xl text-[#121212] dark:text-white group-hover:text-[#AA8C2C] transition-colors">Luminous Objects</h3>
                                    </div>
                                </Link>
                            </Reveal>
                        </div>

                        {/* ITEM 3 */}
                        <div className="col-span-1 md:col-span-8 md:col-start-3 md:-mt-20 z-20 group cursor-pointer">
                            <Reveal delay={0.2}>
                                <Link to="/digital-products">
                                    <div className="relative w-full aspect-[16/9] overflow-hidden mb-8 shadow-2xl border-[10px] border-white dark:border-white/5 transition-shadow duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(212,175,55,0.25)]">
                                        <img 
                                            alt="Digital Asset" 
                                            className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105 filter contrast-125" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpoxSE9HVrhTaCpPrEAE0x12OmreltGy76TA1hnJfM-zEXzllC1resdz_72SFAlx_GkFSm_CE3-tdv-LATCYCfX0QYfq5EkNPEYMMX6I5t0MIABfas-fD6utX2Aq-AF2-dj2v7fkfGLf4ST-1dC2DwBPAOE6C259pbjQsh_dYWWVFR2yY2ZnDM0Oxh4kdQgbSIZjrwZG5vYWvoWEYFskhZtVsCMK1doUM_RfAM2M6i5ctSpB98xe0QkCTInCVDdeLzPTdjzBVV9g"
                                        />
                                        <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-black">NFT Verified</span>
                                        </div>
                                    </div>
                                    <div className="pl-6 border-l-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-colors">
                                        <div className="flex items-center gap-4">
                                            <h3 className="font-serif text-4xl italic text-[#121212] dark:text-white">Virtual Rarities</h3>
                                            <span className="h-[1px] w-12 bg-gray-300"></span>
                                            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Digital Asset</p>
                                        </div>
                                    </div>
                                </Link>
                            </Reveal>
                        </div>

                        {/* ITEM 4 */}
                        <div className="col-span-1 md:col-span-4 md:col-start-9 md:mt-24 group cursor-pointer">
                            <Reveal delay={0.4}>
                                <Link to="/shoes">
                                    <div className="relative w-full aspect-[2/3] overflow-hidden mb-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
                                        <img 
                                            alt="Designer Footwear" 
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQy3coXp91Z1ZM3lAwxkg6WfEmePb7inGu7sYVwMyZsQq85VnjLuGDc_nIw2cd1hKUdThHZSeqLuM2XbG3hbfTiERZatics_4mZ-pgmDnwfVtl4AqHsDJ-4fFFYysQWjPqo7G2vLD8EttvcRC3yfc5Jm1hVh5GRjRxt1CVaqVxfzadN5EIC8bN2gDRQ-cKH43ZizY9UISkZome-3e71DbOPuvqJzAZxSH2HC54H8llH4co5uSXj7XN--Lmpu7rHF4ADkXcZIIuUw"
                                        />
                                    </div>
                                    <div className="flex justify-between items-baseline border-t border-gray-200 dark:border-gray-800 pt-6">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-2">Footwear</p>
                                            <h3 className="font-serif text-2xl text-[#121212] dark:text-white group-hover:translate-x-2 transition-transform duration-500">Limited Iterations</h3>
                                        </div>
                                        <span className="font-mono text-xs text-gray-400">#004</span>
                                    </div>
                                </Link>
                            </Reveal>
                        </div>
                    </div>

                    <div className="text-center mt-40">
                         <Reveal>
                            <Link to="/browse" className="inline-block relative overflow-hidden py-5 px-10 border border-[#050505] dark:border-white group hover:bg-[#050505] dark:hover:bg-white transition-all duration-500">
                                <span className="relative z-10 font-serif text-xl italic text-[#050505] dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors duration-500">Discover Full Collection</span>
                                <div className="absolute inset-0 bg-[#050505] dark:bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out -z-0"></div>
                            </Link>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* --- MASTERPIECE ACQUISITION --- */}
            <section className="relative py-40 overflow-hidden bg-[#050505] text-[#FDFBF7]">
                <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
                    <img 
                        alt="Masterpiece Background" 
                        className="w-full h-full object-cover grayscale brightness-50 parallax-bg" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk2TjMKhYhkhwh0EEzGAeFIV8k61vdwopqihCt5gDbu5ns9BPVI7re3l1VMlODX9z3F-sr6XIZ-a6w7shmVTTXJAkND7M_iMveYLAkHX5oIalvxqHPIIxp5wfij4y5NMSt9PmVATFvyH6PtTrZOTTo-Cp8wO3plI2-b3qA1HwaVss3sJ4x_uhHqvWDZOMWaY-mN4rxEhq-aysFCzWTymwWKZDHtOptdxmHZLJas5T0i4n8xuic49ilMgvSYwZSzJPT09-rGEgZWg"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
                
                <div className="container mx-auto px-6 lg:px-16 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
                        <div className="w-full lg:w-1/2 relative group perspective-1000">
                            <Reveal>
                                <div className="aspect-[4/5] overflow-hidden relative shadow-[0_0_100px_rgba(212,175,55,0.1)] border border-white/5 transition-all duration-700 group-hover:shadow-[0_0_150px_rgba(212,175,55,0.25)]">
                                    <img 
                                        alt="Jewelry Macro" 
                                        className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-[3s] ease-out" 
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk2TjMKhYhkhwh0EEzGAeFIV8k61vdwopqihCt5gDbu5ns9BPVI7re3l1VMlODX9z3F-sr6XIZ-a6w7shmVTTXJAkND7M_iMveYLAkHX5oIalvxqHPIIxp5wfij4y5NMSt9PmVATFvyH6PtTrZOTTo-Cp8wO3plI2-b3qA1HwaVss3sJ4x_uhHqvWDZOMWaY-mN4rxEhq-aysFCzWTymwWKZDHtOptdxmHZLJas5T0i4n8xuic49ilMgvSYwZSzJPT09-rGEgZWg"
                                    />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none mix-blend-difference z-20">
                                        <h2 className="font-serif text-[6rem] lg:text-[10rem] italic leading-none text-white opacity-60 whitespace-nowrap">Exquisite</h2>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                        <div className="w-full lg:w-1/2 space-y-12">
                            <Reveal delay={0.2}>
                                <h2 className="font-serif text-6xl lg:text-8xl leading-[0.9] text-white">
                                    <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 text-5xl lg:text-6xl mb-4 tracking-tight">Masterpiece</span>
                                    Acquisition
                                </h2>
                            </Reveal>
                            <Reveal delay={0.3}>
                                <p className="text-gray-400 font-light text-xl leading-relaxed max-w-md border-l-2 border-[#D4AF37] pl-8">
                                    Authenticated through our proprietary dual-verification process. A synthesis of physical pedigree and blockchain permanence for the discerning collector.
                                </p>
                            </Reveal>
                            <Reveal delay={0.4}>
                                <div className="grid grid-cols-2 gap-12 border-t border-white/10 pt-12">
                                    <div className="group cursor-default">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="material-symbols-outlined text-[#D4AF37] text-xl">history_edu</span>
                                            <h4 className="text-white text-xs uppercase tracking-widest font-bold">Provenance</h4>
                                        </div>
                                        <p className="text-sm text-gray-400 group-hover:text-white transition-colors">Verified ownership history through immutable ledgers.</p>
                                    </div>
                                    <div className="group cursor-default">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="material-symbols-outlined text-[#D4AF37] text-xl">diamond</span>
                                            <h4 className="text-white text-xs uppercase tracking-widest font-bold">Materiality</h4>
                                        </div>
                                        <p className="text-sm text-gray-400 group-hover:text-white transition-colors">Rare earth elements sourced from conflict-free zones.</p>
                                    </div>
                                </div>
                            </Reveal>
                            <Reveal delay={0.5}>
                                <div className="pt-8">
                                    <Link to="/audit" className="bg-transparent border border-white/30 text-white hover:bg-white hover:text-black px-12 py-5 uppercase text-[11px] tracking-[0.2em] font-bold transition-all duration-500 w-full md:w-auto hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                                        Request Private Viewing
                                    </Link>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- JOURNAL --- */}
            <section className="py-32 lg:py-48 bg-[#F5F3EF] dark:bg-[#0f0f0f] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white rounded-full blur-[120px] -z-10 mix-blend-soft-light pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-12">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-24 border-b border-black/10 dark:border-white/10 pb-8">
                        <div>
                            <h2 className="font-serif text-[6rem] lg:text-[9rem] leading-[0.8] text-[#050505] dark:text-white tracking-tighter opacity-10 absolute -top-10 left-0 pointer-events-none select-none z-0">JOURNAL</h2>
                            <Reveal>
                                <h2 className="font-serif text-5xl lg:text-7xl text-[#050505] dark:text-white relative z-10">The <span className="italic">Journal</span></h2>
                            </Reveal>
                        </div>
                        <div className="mb-4 md:mb-2 text-right relative z-10">
                            <Reveal delay={0.2}>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-[#AA8C2C]">Volume II</p>
                                <p className="text-lg font-serif italic text-gray-600 dark:text-gray-400">Stories of Craft & Code</p>
                            </Reveal>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
                        <div className="lg:col-span-8 group cursor-pointer">
                            <Reveal>
                                <div className="relative overflow-hidden aspect-[16/10] shadow-2xl mb-10">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-700"></div>
                                    <img 
                                        alt="Sartorial Arts" 
                                        className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" 
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3x8mEC-WDAEiILbDJ9e0K5OO8Lr1ZzkHstAB_sdG5pLrsx6u3TTHOM0QCd5swtxteJfLC3qIbIxpgFGxTAIp83dMhhj04OHctTY_7_qqyP7dOwnqmvQB7s8cVJTxFzrxEJ2VKesakfA91iRJOQ4hh6-59fZ5zgoAKj35PcQWEgJXdeLs1EeVV2sh6JBtI_VOrBIqIWjfoN8SL32cNLFDo4fU_XUO3MnxZFfu4YPHAfsePm1zyiZ2zppdVPGulNcf1el531N1aLA"
                                    />
                                    <div className="absolute bottom-8 left-8 z-20">
                                        <span className="bg-white text-black px-4 py-2 text-[9px] uppercase tracking-widest font-bold mb-4 inline-block">Featured Story</span>
                                        <h3 className="font-serif text-4xl lg:text-6xl text-white italic leading-tight group-hover:underline decoration-1 underline-offset-8 decoration-[#D4AF37]">The Evolution of <br/> Silhouette</h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <p className="text-xl font-serif italic text-gray-800 dark:text-gray-200 leading-relaxed border-l-4 border-[#D4AF37] pl-6">
                                        "Deconstructing the architectural shift in modern high-fashion. We explore the fabrics of the future."
                                    </p>
                                    <div className="flex flex-col justify-between">
                                        <p className="text-sm font-light text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                                From the ateliers of Paris to the digital runways of the metaverse, the definition of what we wear is changing. Discover how designers are merging code with cotton.
                                            </p>
                                            <Link className="text-[10px] uppercase tracking-widest font-bold border-b border-black dark:border-white pb-1 self-start hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors text-black dark:text-white" to="/press">Read Full Article</Link>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                        <div className="lg:col-span-4 flex flex-col gap-12 justify-center lg:border-l lg:border-black/5 dark:lg:border-white/5 lg:pl-12">
                            <article className="group cursor-pointer">
                                <Reveal delay={0.2}>
                                    <div className="overflow-hidden aspect-[3/2] mb-6 relative shadow-lg">
                                        <img 
                                            alt="Digital Scarcity" 
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQy3coXp91Z1ZM3lAwxkg6WfEmePb7inGu7sYVwMyZsQq85VnjLuGDc_nIw2cd1hKUdThHZSeqLuM2XbG3hbfTiERZatics_4mZ-pgmDnwfVtl4AqHsDJ-4fFFYysQWjPqo7G2vLD8EttvcRC3yfc5Jm1hVh5GRjRxt1CVaqVxfzadN5EIC8bN2gDRQ-cKH43ZizY9UISkZome-3e71DbOPuvqJzAZxSH2HC54H8llH4co5uSXj7XN--Lmpu7rHF4ADkXcZIIuUw"
                                        />
                                    </div>
                                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest mb-2 block">Innovation</span>
                                    <h4 className="font-serif text-2xl text-[#050505] dark:text-white group-hover:text-[#AA8C2C] transition-colors mb-2">Digital Scarcity: The New Gold</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">How virtual couture is redefining luxury ownership through blockchain verification.</p>
                                </Reveal>
                            </article>
                            <article className="group cursor-pointer">
                                <Reveal delay={0.4}>
                                    <div className="overflow-hidden aspect-[3/2] mb-6 relative shadow-lg">
                                        <img 
                                            alt="Modern Heirlooms" 
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3TSJfqftM288CeGA7kliCD81dpZoyUc1B7uvGMPF_3LC0UuoG2WJy5tYQeeY4kqGBA_S9O6cLeRv-RUjw8YxIbZaq9lXFMy4s3N0gj0FxOw2KKE1ZZnuWPRom1htYhtwwXnaU0MCgTcprIYZ1WWMJbJYfwUv-j6yxdONJSxyWRvW5zC-Ts_LjNni0fxfe0D-3Yp8I9LQlTHkG1A51Tiof5-i5j9L-ww8uw2vMZBfccLrkCW292hvVcSOYsZfJUvCLqTIsaQo1Vw"
                                        />
                                    </div>
                                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest mb-2 block">Heritage</span>
                                    <h4 className="font-serif text-2xl text-[#050505] dark:text-white group-hover:text-[#AA8C2C] transition-colors mb-2">Modern Heirlooms</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">Blending ancestral techniques with avant-garde aesthetics for the next generation.</p>
                                </Reveal>
                            </article>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- INNER CIRCLE --- */}
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-black">
                <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#1a1a1a] to-[#3a2a0d] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
                
                <div className="relative z-10 text-center max-w-3xl px-6 w-full">
                    <motion.div 
                        className="mb-12"
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="w-24 h-24 mx-auto rounded-full border border-[#D4AF37]/30 flex items-center justify-center backdrop-blur-md bg-white/5 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                            <span className="material-symbols-outlined text-5xl font-thin text-[#D4AF37]">Fingerprint</span>
                        </div>
                    </motion.div>
                    
                    <Reveal>
                        <h2 className="font-serif text-7xl md:text-9xl text-white mb-8 tracking-tighter mix-blend-hard-light">Inner Circle</h2>
                    </Reveal>
                    
                    <Reveal delay={0.2}>
                        <p className="text-xl md:text-2xl font-light font-serif italic text-white/70 mb-16 leading-relaxed">
                            "A private communique for those who appreciate the finer details. <br/> Early access to the unseen."
                        </p>
                    </Reveal>
                    
                    <Reveal delay={0.4}>
                        <form className="flex flex-col relative group max-w-md mx-auto">
                            <div className="relative overflow-hidden rounded-none bg-white/5 backdrop-blur-sm border border-white/20 transition-all duration-500 hover:border-[#D4AF37] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:bg-white/10">
                                <input 
                                    className="w-full bg-transparent border-none p-6 text-center text-xl text-white focus:ring-0 placeholder:text-white/30 placeholder:font-serif placeholder:italic outline-none" 
                                    placeholder="Enter your correspondence" 
                                    type="email"
                                />
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] opacity-50 hover:opacity-100 transition-opacity" type="button">
                                    <span className="material-symbols-outlined text-3xl">→</span>
                                </button>
                            </div>
                            <div className="mt-4 text-[9px] uppercase tracking-[0.2em] text-white/40">Exclusivity Guaranteed</div>
                        </form>
                    </Reveal>
                </div>
            </section>
        </div>
    );
};

export default GemstoneShowcasePage;
