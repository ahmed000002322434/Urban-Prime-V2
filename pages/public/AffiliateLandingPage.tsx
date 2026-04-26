import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import BackButton from '../../components/BackButton';
import IconBadge from '../../components/IconBadge';

const NetworkLogo = () => {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center md:h-64 md:w-64">
      <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow text-yellow-500/30">
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

      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]"
      >
        <span className="text-lg font-black tracking-[0.2em] text-black">UP</span>
      </motion.div>
    </div>
  );
};

const FeatureCheck = () => (
  <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </span>
);

const DeepDiveSection: React.FC<{ title: string; description: string; features: string[]; image: string; index: number }> = ({ title, description, features, image, index }) => {
  return (
    <section className="relative border-b border-gray-100 bg-white py-24 dark:border-white/5 dark:bg-[#0a0a0a]">
      <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-2">
        <div className={`relative ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
          <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-[80px]" />
          <img src={image} alt={title} className="relative z-10 w-full rounded-2xl shadow-xl transition-transform duration-500 hover:-translate-y-2" />
        </div>
        <div className={`space-y-6 ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
          <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
          <ul className="space-y-3 pt-4">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <FeatureCheck />
                <span className="font-medium text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

const GridFeature: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
  <div className="group rounded-2xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:bg-white hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
    <IconBadge icon={icon} size="md" className="mb-4 transition-transform duration-300 group-hover:scale-110" />
    <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
  </div>
);

const AffiliateLandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const topics = [
    {
      title: 'High-Ticket Commissions',
      image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop',
      description: 'Earn commissions on tracked sales and rentals across seller programs. Rates, caps, and seller referral bonuses are managed per store, with approved earnings moving through the Urban Prime wallet flow.',
      features: ['Seller-Defined Commission Rates', 'Rental And Sale Tracking', 'Seller Referral Bonuses', 'Wallet-Based Payout Flow', 'Manual Or Automatic Approvals']
    },
    {
      title: 'Advanced Tracking Dashboard',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
      description: 'Track referral links, coupon conversions, Spotlight commerce, and wallet-ready commissions from one dashboard. Deep links can point to the homepage or to specific product pages.',
      features: ['Tracked Referral Links', 'Coupon Attribution', 'Spotlight Commerce Attribution', 'Commission Status History', 'Wallet Transfer Eligibility']
    },
    {
      title: 'Creative Asset Library',
      image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop',
      description: 'Start promoting quickly with lightweight Urban Prime creative assets designed for links, coupons, and creator-led commerce campaigns.',
      features: ['Banner Assets', 'Story Card Assets', 'Creator Card Assets', 'Copyable Asset Links', 'Campaign Ready Formats']
    },
    {
      title: 'Influencer Seeding Kits',
      image: 'https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=1200&auto=format&fit=crop',
      description: 'Affiliates can pair tracked links, vanity coupon codes, and creator-led product promotion to drive measurable conversions without leaving the platform workflow.',
      features: ['Tracked Product Links', 'Vanity Coupons', 'Creator Commerce Support', 'Store-Level Approval Controls', 'Submission Review Queue']
    },
    {
      title: 'Seller Referral Rewards',
      image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop',
      description: 'Eligible programs can reward affiliates when a referred seller publishes their first store. The bonus is recorded in the same commission ledger and paid through the same wallet flow.',
      features: ['First Store Publish Bonus', 'Shared Commission Ledger', 'Wallet Transfer Flow', 'Program-Level Bonus Amounts', 'Unified Payout Tracking']
    },
    {
      title: 'Global Payout System',
      image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=1200&auto=format&fit=crop',
      description: 'Approved affiliate earnings move into your Urban Prime wallet, then follow the existing withdrawal request and admin payout review flow.',
      features: ['Approved-Only Wallet Transfers', 'Withdrawal Requests', 'Admin Payout Review', 'Rejected Payout Refunds', 'Commission History']
    }
  ];

  const extendedFeatures = [
    { title: 'Deep Linking', desc: 'Generate referral links to the homepage or to a specific product page.', icon: 'DL' },
    { title: 'Custom Coupons', desc: 'Create store-aware coupon codes that attribute conversions to your account.', icon: 'CC' },
    { title: 'Seller Bonuses', desc: 'Earn a one-time bonus when an eligible referred seller publishes their first store.', icon: 'SB' },
    { title: 'Wallet Transfers', desc: 'Move approved commissions into your Urban Prime wallet before requesting payout.', icon: 'WT' },
    { title: 'Attribution History', desc: 'Track clicks, conversions, and commission status from one affiliate workspace.', icon: 'AH' },
    { title: 'Approval Controls', desc: 'Seller programs can run with manual or automatic affiliate approval.', icon: 'AC' },
    { title: 'Review Queue', desc: 'Submission requests are stored for review instead of disappearing into a placeholder flow.', icon: 'RQ' },
    { title: 'Campaign Snapshots', desc: 'See core performance totals, live links, coupons, and leaderboard slices together.', icon: 'CS' },
    { title: 'Spotlight Support', desc: 'Creator-driven Spotlight traffic can convert through the same commission engine.', icon: 'SP' },
    { title: 'Pixe Support', desc: 'Pixe promotion sessions can feed into the same attribution and payout flow.', icon: 'PX' },
    { title: 'Partner Management', desc: 'Sellers can approve, pause, or suspend affiliates from the program manager.', icon: 'PM' },
    { title: 'Unified Ledger', desc: 'Sales, rentals, and seller bonuses are recorded inside one commission history.', icon: 'UL' }
  ];

  const techSpecs = [
    'Program-level commission rates',
    'Store-defined cookie windows',
    'Link, coupon, Spotlight, and Pixe attribution',
    'Pending to approved commission lifecycle',
    'Approved-only wallet transfers',
    'Withdrawal request and admin review flow',
    'Seller referral bonus support',
    'Status history for payouts and commissions'
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans selection:bg-yellow-400 selection:text-black dark:bg-[#0a0a0a]">
      <motion.div className="fixed left-0 right-0 top-0 z-50 h-1.5 origin-left bg-gradient-to-r from-yellow-400 to-orange-500" style={{ scaleX }} />

      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-gray-50 px-4 text-center dark:bg-[#050505]">
        <div className="absolute left-8 top-8 z-50">
          <BackButton className="text-gray-900 hover:text-yellow-500 dark:text-white" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
          <div className="mb-8 animate-float">
            <NetworkLogo />
          </div>
          <h1 className="mb-6 font-display text-6xl font-black tracking-tighter text-gray-900 dark:text-white md:text-9xl">
            EARN <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">TOGETHER</span>
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl font-light leading-relaxed text-gray-600 dark:text-gray-400 md:text-2xl">
            Turn your audience into tracked sales, rentals, and seller referrals inside Urban Prime&apos;s affiliate network.
          </p>
          <div className="flex flex-col gap-6 sm:flex-row">
            <Link to="/profile/affiliate" className="rounded-full bg-yellow-400 px-12 py-5 text-lg font-bold text-black shadow-[0_10px_30px_rgba(250,204,21,0.4)] transition-all hover:bg-yellow-500">
              Join Program
            </Link>
            <Link to="/about" className="rounded-full border-2 border-gray-300 px-12 py-5 text-lg font-bold text-gray-900 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <div>
        {topics.map((topic, index) => (
          <DeepDiveSection key={topic.title} index={index} title={topic.title} description={topic.description} features={topic.features} image={topic.image} />
        ))}
      </div>

      <section className="bg-gray-50 py-24 dark:bg-[#0F0F0F]">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-display text-4xl font-black text-gray-900 dark:text-white md:text-5xl">Partner Perks</h2>
            <p className="mx-auto max-w-2xl text-gray-500 dark:text-gray-400">Tools and benefits designed around the affiliate workflow that is actually live in the product.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {extendedFeatures.map((feature) => (
              <GridFeature key={feature.title} title={feature.title} desc={feature.desc} icon={feature.icon} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white py-24 dark:border-white/10 dark:bg-black">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-gray-900 dark:text-white">Program Details</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {techSpecs.map((spec) => (
              <div key={spec} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                <span className="text-yellow-500">*</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-yellow-50 py-32 text-center dark:bg-[#111]">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 font-display text-4xl font-black text-gray-900 dark:text-white md:text-7xl">MONETIZE YOUR PASSION</h2>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-600 dark:text-gray-400">
            Whether you promote products, Spotlight drops, or seller programs, the workflow now routes earnings into one payout system.
          </p>
          <Link to="/profile/affiliate" className="inline-block rounded-full bg-black px-16 py-6 text-xl font-bold text-white duration-300 hover:scale-105 dark:bg-white dark:text-black">
            Start Earning Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AffiliateLandingPage;
