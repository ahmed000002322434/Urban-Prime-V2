
import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import AnimatedHowToIcon from '../../components/AnimatedHowToIcon';
import Spinner from '../../components/Spinner';
import { askAboutShaiza } from '../../services/geminiService';

const ShaizaPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
    >
        <div 
            className="bg-white dark:bg-[#121212] p-8 rounded-3xl shadow-2xl border border-white/20 max-w-md text-center space-y-6"
            onClick={e => e.stopPropagation()}
        >
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-3xl">
                🚫
            </div>
            <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white uppercase tracking-tight">The CEO Offer</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Legend has it that Shaiza Muskan was offered the position of permanent CEO during the early Hitech Uni days, but she rejected it to pursue her own path.
            </p>
            <button 
                onClick={onClose}
                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:opacity-90 transition-opacity"
            >
                Understood
            </button>
        </div>
    </motion.div>
);

const AboutPage: React.FC = () => {
  const missionRef = useScrollReveal();
  const howToRef = useScrollReveal();
  const teamRef = useScrollReveal();
  const [showShaizaPopup, setShowShaizaPopup] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Scroll animations for the "Meet the Founders" section
  const { scrollYProgress } = useScroll({
    target: teamRef,
    offset: ["start end", "end start"]
  });

  // Fade out Shaiza's badge as we scroll past the section
  const shaizaOpacity = useTransform(scrollYProgress, [0.3, 0.6], [1, 0]);
  const shaizaScale = useTransform(scrollYProgress, [0.3, 0.6], [1, 0.8]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || isAsking) return;
    setIsAsking(true);
    try {
        const response = await askAboutShaiza(aiQuestion);
        setAiAnswer(response);
    } catch(err) {
        setAiAnswer("Connection lost. The past is clouded.");
    } finally {
        setIsAsking(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up min-h-screen">
      <AnimatePresence>
          {showShaizaPopup && <ShaizaPopup onClose={() => setShowShaizaPopup(false)} />}
      </AnimatePresence>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <header className="text-center mb-20">
          <h1 className="text-6xl font-extrabold text-gray-900 dark:text-dark-text font-display">About Urban Prime</h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Powering the circular economy, one rental at a time.</p>
        </header>

        <section ref={missionRef} className="mb-24 animate-reveal">
          <h2 className="text-4xl font-bold text-center mb-10 font-display text-gray-900 dark:text-dark-text">Our Mission</h2>
          <div className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-400 space-y-6 leading-relaxed">
            <p>At Urban Prime, we believe in a future where access triumphs over ownership. Our mission is to build a trusted community marketplace that empowers people to unlock the value of their possessions and provides affordable, convenient access to a wide variety of items. We're committed to reducing waste, fostering local connections, and helping people save money.</p>
            <p>By making it easy and safe to rent from your neighbors, we aim to create a more sustainable and resourceful world.</p>
          </div>
        </section>

        <section ref={howToRef} className="bg-gray-50 dark:bg-dark-surface rounded-xl p-16 mb-24 animate-reveal">
          <h2 className="text-4xl font-bold text-center mb-12 font-display text-gray-900 dark:text-dark-text">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div style={{ animationDelay: '0s' }}>
              <AnimatedHowToIcon
                icon="list"
                title="List Your Item"
                description="Easily list your unused items with photos, a description, and your rental price. It’s free and simple."
              />
            </div>
            <div style={{ animationDelay: '0.2s' }}>
              <AnimatedHowToIcon
                icon="book"
                title="Get Booked"
                description="Renters can discover your item and send you a rental request. You have full control to accept or decline."
              />
            </div>
            <div style={{ animationDelay: '0.4s' }}>
              <AnimatedHowToIcon
                icon="earn"
                title="Rent & Earn"
                description="Coordinate a pickup, get paid securely through our platform, and watch your items make you money."
              />
            </div>
          </div>
        </section>

        <section ref={teamRef} className="animate-reveal py-20">
          <h2 className="text-4xl font-bold text-center mb-16 font-display text-gray-900 dark:text-dark-text">Meet the Founders</h2>
          <div className="flex justify-center flex-wrap gap-12 items-start mb-20">
            {/* Ahmed Ali */}
            <div className="text-center group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img className="relative w-40 h-40 rounded-full mx-auto mb-6 object-cover border-4 border-transparent group-hover:border-primary transition-all duration-500 shadow-2xl" src="https://picsum.photos/seed/ahmedali/400" alt="Ahmed Ali"/>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Ahmed Ali</h4>
              <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">CEO & Founder</p>
            </div>

            {/* Shaiza Muskan - Animated Badge */}
            <motion.div 
                style={{ opacity: shaizaOpacity, scale: shaizaScale }}
                className="text-center group cursor-pointer"
                onClick={() => setShowShaizaPopup(true)}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img className="relative w-40 h-40 rounded-full mx-auto mb-6 object-cover border-4 border-transparent group-hover:border-purple-500 transition-all duration-500 shadow-2xl" src="https://picsum.photos/seed/shaiza/400" alt="Shaiza Muskan"/>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Shaiza Muskan</h4>
              <p className="text-purple-500 font-bold uppercase tracking-widest text-xs mt-1">Co-Founder (Legacy)</p>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Click to reveal history</p>
            </motion.div>
          </div>

          {/* AI History Assistant Section */}
          <div className="max-w-2xl mx-auto mt-20 p-8 bg-gray-50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">✨</div>
                <div>
                    <h3 className="font-black font-display text-gray-900 dark:text-white uppercase tracking-tight">The Founder Archives</h3>
                    <p className="text-xs text-gray-500 font-medium">Ask about Shaiza Muskan or the Hitech Uni days.</p>
                </div>
             </div>

             <form onSubmit={handleAskAI} className="relative group">
                <input 
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    placeholder="Who was Shaiza Muskan at Hitech Uni?"
                    className="w-full py-4 pl-6 pr-24 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white"
                />
                <button 
                    disabled={isAsking || !aiQuestion}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-80 disabled:opacity-30 transition-all"
                >
                    {isAsking ? <Spinner size="sm" /> : 'Ask'}
                </button>
             </form>

             <AnimatePresence>
                {aiAnswer && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 p-5 bg-white dark:bg-white/5 border border-primary/20 rounded-2xl"
                    >
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">
                            {aiAnswer}
                        </p>
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </section>

        <section className="mb-24 text-center">
            <h2 className="text-3xl font-black font-display text-gray-900 dark:text-white uppercase tracking-tighter mb-8">Our Cultural Heritage</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">🏫</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Hitech Uni</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">🤝</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Old Bonds</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">🌅</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">New Horizons</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">🛡️</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Truth Prevails</p>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
