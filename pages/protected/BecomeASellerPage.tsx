import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// SVG Icons
const RocketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 18.75h-7.5m0 0A2.25 2.25 0 005.25 16.5m0-12.75h4.5m0 0a2.25 2.25 0 110 4.5H5.25m11.25-4.5h7.5m0 0a2.25 2.25 0 010 4.5m0-4.5a2.25 2.25 0 110 4.5m0-12.75h-7.5m0 0A2.25 2.25 0 0020.25 5.25" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.541c.212 1.162-.87 2.069-1.969 1.61l-4.823-2.937-4.822 2.937c-1.1.46-2.18-.448-1.969-1.61l1.257-5.541-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" /></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7.5h8m0 0l-8-4m8 4l-8 4m0 0H5m0 0l8-4m0 0v12m0 0l-8-4m0 0v4a2 2 0 002 2h8a2 2 0 002-2v-4" /></svg>;
const TrendingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.25 11.25 0 015.814-5.518l2.74-1.22m0 0l-5.94 5.94m5.94-5.94l1.068 3.897m-2.441 2.261c.419.238.576.534.576.897v4.413m0-5.26c.331.18.566.478.566.897v4.413m0-5.26V8.25" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-12.812m-8.716 12.812A9.004 9.004 0 013.284 9.188M9.879 9.879l3.242 3.242m9.878-9.878l-3.242 3.242m0 0a3 3 0 10-4.242 4.242m4.242-4.242L9.88 9.88" /></svg>;

const BecomeASellerPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const benefits = [
    { icon: <TrendingIcon />, title: 'Increase Revenue', desc: 'Start renting your items and earn passive income' },
    { icon: <StoreIcon />, title: 'Professional Store', desc: 'Beautiful storefront that looks like a real business' },
    { icon: <GlobeIcon />, title: 'Global Reach', desc: 'Reach customers worldwide from day one' },
    { icon: <StarIcon />, title: 'Build Reputation', desc: 'Reviews and ratings to build trust with customers' },
  ];

  const steps = [
    { num: 1, title: 'Create Profile', desc: 'Set up your seller account in minutes' },
    { num: 2, title: 'Build Store', desc: 'Design your beautiful rental storefront' },
    { num: 3, title: 'Add AI Content', desc: 'Use AI to create descriptions and content (optional)' },
    { num: 4, title: 'Customize Layout', desc: 'Add sections and customize your store design' },
    { num: 5, title: 'Set Policies', desc: 'Configure shipping, payments, and rental policies' },
    { num: 6, title: 'Go Live!', desc: 'Launch your store and start renting to customers' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Navigation */}
      <motion.nav 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-slate-900/95 backdrop-blur shadow-lg' : 'bg-transparent'}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center">
              <RocketIcon />
            </div>
            <span className="text-white font-bold text-xl">Urban Prime</span>
          </div>
          <button onClick={() => navigate('/profile')} className="px-4 py-2 text-gray-300 hover:text-white transition">
            Back
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 pb-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl font-black text-white mb-6 leading-tight">
            Start Your Rental <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Empire Today</span>
          </h1>
          <p className="text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Launch a professional rental store in minutes. No technical skills needed.
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Join thousands of successful rental business owners earning passive income with our all-in-one platform.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          className="flex gap-4 justify-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <button 
            onClick={() => navigate('/store/setup')}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-lg text-lg"
          >
            Get Started Now →
          </button>
          <button className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition text-lg">
            Watch Demo
          </button>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6 hover:bg-white/15 transition"
              whileHover={{ y: -5 }}
            >
              <div className="text-blue-400 mb-3">{benefit.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{benefit.title}</h3>
              <p className="text-gray-300 text-sm">{benefit.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* How It Works */}
        <motion.div 
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-4xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-400/30 rounded-xl p-8 relative"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {step.num}
                </div>
                <h3 className="text-white font-bold text-lg mb-2 mt-4">{step.title}</h3>
                <p className="text-gray-300 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div 
          className="bg-gradient-to-r from-blue-500/20 to-indigo-600/20 border border-blue-400/30 rounded-2xl p-12 mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8">Everything You Need</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Professional store design templates',
              'AI-powered content generation (optional)',
              'Secure payment processing',
              'Rental management system',
              'Customer reviews & ratings',
              'Analytics & insights',
              'Multi-language support',
              'Mobile-optimized store',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckIcon />
                <span className="text-gray-200">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Start?</h3>
          <p className="text-xl text-gray-300 mb-6">Create your rental store in less than 10 minutes</p>
          <motion.button 
            onClick={() => navigate('/store/setup')}
            className="px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg text-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Building Your Store →
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default BecomeASellerPage;
