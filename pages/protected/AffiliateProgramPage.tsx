
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { itemService, listerService, userService } from '../../services/itemService';
import type { Affiliate, AffiliateEarning, AffiliateLink, AffiliateCoupon, CreativeAsset, Item, AffiliateCampaign, ExternalProductSubmission, ContentReviewSubmission, AffiliateProfile } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import AffiliateOnboarding from '../../components/AffiliateOnboarding';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';

// Icons
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ClipboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const MousePointerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const PercentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M18 12a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2H4"/></svg>;
const SubmitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border text-center flex flex-col items-center justify-center">
        <div className="text-primary mb-2">{icon}</div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
    </div>
);

// --- NEW: Affiliate Performance Chart ---
const AffiliateChart: React.FC<{ earnings: AffiliateEarning[] }> = ({ earnings }) => {
    const [chartData, setChartData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [trend, setTrend] = useState(0);

    useEffect(() => {
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (6 - i));
            return d;
        });

        const dailyEarnings = last7Days.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            // Filter earnings that match the date (YYYY-MM-DD)
            return earnings
                .filter(e => e.date.startsWith(dateStr))
                .reduce((sum, e) => sum + e.amount, 0);
        });

        setChartData(dailyEarnings);
        setLabels(last7Days.map(d => d.toLocaleDateString(undefined, { weekday: 'short' })));

        const currentPeriod = dailyEarnings.slice(3).reduce((a, b) => a + b, 0);
        const prevPeriod = dailyEarnings.slice(0, 3).reduce((a, b) => a + b, 0);
        
        if (prevPeriod === 0) {
            setTrend(currentPeriod > 0 ? 100 : 0);
        } else {
            setTrend(((currentPeriod - prevPeriod) / prevPeriod) * 100);
        }

    }, [earnings]);

    const max = Math.max(...chartData, 5); // Use 5 as min max to avoid flat line
    const points = chartData.map((val, i) => `${(i / (chartData.length - 1)) * 100},${100 - (val / max) * 100}`).join(' ');

    return (
        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Earnings Performance</h3>
                    <p className="text-sm text-text-secondary">Last 7 Days</p>
                </div>
                <div className={`flex items-center gap-2 font-bold text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUpIcon /> {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </div>
            </div>
            <div className="h-48 w-full relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                     {/* Grid lines */}
                    <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" className="text-gray-300 dark:text-gray-600" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" className="text-gray-300 dark:text-gray-600" />
                    <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" className="text-gray-300 dark:text-gray-600" />

                    <path 
                        d={`M0,100 ${points} L100,100 Z`} 
                        fill="url(#gradient)" 
                        opacity="0.2"
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0fb9b1" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                    
                    <polyline
                        fill="none"
                        stroke="#0fb9b1"
                        strokeWidth="3"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    
                    {chartData.map((val, i) => (
                         <circle 
                            key={i}
                            cx={(i / (chartData.length - 1)) * 100}
                            cy={100 - (val / max) * 100}
                            r="3" 
                            fill="white"
                            stroke="#0fb9b1"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </svg>
            </div>
             <div className="flex justify-between mt-2 text-xs text-text-secondary">
                {labels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
        </div>
    );
};

// --- NEW: Tier Progress Widget ---
const TierProgress: React.FC<{ affiliate: Affiliate }> = ({ affiliate }) => {
    const tiers = [
        { name: 'Bronze', min: 0, rate: 0.05 },
        { name: 'Silver', min: 10, rate: 0.07 },
        { name: 'Gold', min: 50, rate: 0.10 },
    ];

    const currentConversions = affiliate.signups;
    let nextTier = tiers[1]; // Default next is Silver
    let progressPercent = 0;
    
    if (currentConversions >= tiers[2].min) {
        nextTier = { name: 'Platinum', min: 100, rate: 0.12 }; // Hypothetical next
        progressPercent = 100;
    } else if (currentConversions >= tiers[1].min) {
        nextTier = tiers[2];
        progressPercent = ((currentConversions - tiers[1].min) / (tiers[2].min - tiers[1].min)) * 100;
    } else {
        progressPercent = (currentConversions / tiers[1].min) * 100;
    }
    
    return (
         <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-black p-6 rounded-xl shadow-soft text-white relative overflow-hidden border border-white/10">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-xl"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Current Tier</p>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            {currentConversions >= tiers[2].min ? 'Gold' : currentConversions >= tiers[1].min ? 'Silver' : 'Bronze'} Affiliate
                            <span className="px-2 py-0.5 rounded-md bg-primary text-xs font-bold text-white">{(affiliate.commissionRate * 100).toFixed(0)}% Comm.</span>
                        </h3>
                    </div>
                    <div className="p-2 bg-white/10 rounded-lg">
                        <TrophyIcon />
                    </div>
                </div>

                <div className="mb-2 flex justify-between text-xs font-medium text-gray-300">
                    <span>{currentConversions} Referrals</span>
                    <span>Goal: {nextTier.min}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
                    </div>
                </div>
                
                <p className="text-sm text-gray-300">
                    {nextTier.min - currentConversions > 0 
                        ? `Just ${nextTier.min - currentConversions} more sales to unlock ${nextTier.name} status and earn ${(nextTier.rate * 100).toFixed(0)}% commission!`
                        : "You're at the top of your game! Keep earning."}
                </p>
            </div>
        </div>
    );
};


const AffiliateProgramPage: React.FC = () => {
    const { user, ...auth } = useAuth();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();

    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
    const [links, setLinks] = useState<AffiliateLink[]>([]);
    const [coupons, setCoupons] = useState<AffiliateCoupon[]>([]);
    const [assets, setAssets] = useState<CreativeAsset[]>([]);
    const [leaderboard, setLeaderboard] = useState<(Affiliate & {name:string, avatar:string})[]>([]);
    const [trendingItems, setTrendingItems] = useState<Item[]>([]);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newCoupon, setNewCoupon] = useState({ code: '', percentage: 10 });
    const [submission, setSubmission] = useState({ url: '', type: 'product' });
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);

    const fetchData = useCallback(async () => {
        if (!user || !user.isAffiliate) {
            setIsLoading(false);
            return;
        }
        
        if (!user.affiliateOnboardingCompleted) {
            setIsOnboarding(true);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [affiliateData, linkData, couponData, assetData, leaderboardData, trendingData] = await Promise.all([
                listerService.getAffiliateData(user.id),
                listerService.getAffiliateLinks(user.id),
                listerService.getAffiliateCoupons(user.id),
                listerService.getCreativeAssets(),
                listerService.getAffiliateLeaderboard(),
                itemService.getTrendingItems(user.affiliateProfile?.interestedCategories || [])
            ]);
            setAffiliate(affiliateData.affiliate);
            setEarnings(affiliateData.earnings);
            setLinks(linkData);
            setCoupons(couponData);
            setAssets(assetData);
            setLeaderboard(leaderboardData);
            setTrendingItems(trendingData);
            setCampaigns([
                { id: 'camp-1', title: 'Spring Drop', description: 'Highlight top verified listings', commissionRate: 0.12 },
                { id: 'camp-2', title: 'Creator Week', description: 'Boost creator content + reels', commissionRate: 0.15 }
            ]);
        } catch (error) {
            console.error(error);
            showNotification("Failed to load affiliate data.");
        } finally {
            setIsLoading(false);
        }
    }, [user, showNotification]);

    useEffect(() => {
       fetchData();
    }, [user, fetchData]);

    const handleJoinProgram = async () => {
        if (!user) return;
        setIsLoading(true);
        const updatedUser = await listerService.joinAffiliateProgram(user.id);
        auth.updateUser(updatedUser);
        await fetchData(); 
        setIsLoading(false);
    }
    
    const handleGenerateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newLinkUrl) return;
        const newLink = await listerService.generateAffiliateLink(user.id, newLinkUrl);
        setLinks(prev => [newLink, ...prev]);
        setNewLinkUrl('');
        showNotification("Affiliate link generated!");
    };

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newCoupon.code || newCoupon.percentage <= 0) return;
        try {
            const createdCoupon = await listerService.createAffiliateCoupon(user.id, newCoupon.code, newCoupon.percentage);
            setCoupons(prev => [createdCoupon, ...prev]);
            setNewCoupon({ code: '', percentage: 10 });
            showNotification("Coupon created!");
        } catch (error) {
            showNotification(error instanceof Error ? error.message : "Failed to create coupon");
        }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        showNotification("Copied to clipboard!");
    }

    const handleOnboardingComplete = async () => {
        if(!user) return;
        const updatedUser = await userService.getUserById(user.id);
        if(updatedUser) {
           auth.updateUser(updatedUser);
        }
        setIsOnboarding(false);
        fetchData();
    };
    
    const availableForPayout = useMemo(() => {
        return earnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    }, [earnings]);

    const handlePayout = async () => {
        if (!user || availableForPayout <= 0) return;
        setIsSubmitting(true);
        try {
            const updatedUser = await listerService.transferEarningsToWallet(user.id);
            auth.updateUser(updatedUser);
            await fetchData();
            showNotification("Earnings transferred to your wallet!");
        } catch (error) {
            showNotification(error instanceof Error ? error.message : "Payout failed.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !submission.url) return;
        setIsSubmitting(true);
        try {
            if (submission.type === 'product') {
                await listerService.submitExternalProduct(user.id, submission.url);
            } else {
                await listerService.submitContentReview(user.id, submission.url);
            }
            showNotification("Submission received for review!");
            setSubmission({ url: '', type: 'product' });
            await fetchData();
        } catch(error) {
             showNotification("Submission failed.");
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) return <Spinner size="lg" className="m-auto" />;

    if (!user?.isAffiliate) {
        return (
            <div className="bg-surface p-8 rounded-xl shadow-soft border border-border text-center animate-fade-in-up">
                <h1 className="text-3xl font-bold font-display text-text-primary">Join the Urban Prime Affiliate Program</h1>
                <p className="text-text-secondary mt-2 max-w-xl mx-auto">Earn commissions by referring new users and driving sales. It's free to join and easy to get started.</p>
                <button onClick={handleJoinProgram} className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90">Become an Affiliate</button>
            </div>
        );
    }
    
    if (isOnboarding) {
        return <AffiliateOnboarding onComplete={handleOnboardingComplete} />;
    }

    if (!affiliate) {
         return <div className="text-center p-8">Could not load affiliate data. Please refresh.</div>;
    }

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    return (
        <>
        {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold font-display text-text-primary">Affiliate Dashboard</h1>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full">Active</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">{affiliate.signups} Conversions</span>
                </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Clicks" value={affiliate.clicks.toLocaleString()} icon={<MousePointerIcon />} />
                <StatCard title="Conversions" value={affiliate.signups.toLocaleString()} icon={<TargetIcon />} />
                <StatCard title="Total Earned" value={`${currency.symbol}${totalEarnings.toFixed(2)}`} icon={<DollarSignIcon />} />
                <StatCard title="Commission Rate" value={`${(affiliate.commissionRate * 100).toFixed(0)}%`} icon={<PercentIcon />} />
            </div>

            {/* Charts & Progression */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AffiliateChart earnings={earnings} />
                <TierProgress affiliate={affiliate} />
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-primary">Campaigns</h3>
                    <button
                        onClick={() => {
                            const newCamp = { id: `camp-${Date.now()}`, title: 'New Campaign', description: 'Custom promotion', commissionRate: affiliate.commissionRate };
                            setCampaigns(prev => [newCamp, ...prev]);
                            showNotification('Campaign created.');
                        }}
                        className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg"
                    >
                        + New Campaign
                    </button>
                </div>
                <div className="space-y-3">
                    {campaigns.map(c => (
                        <div key={c.id} className="p-4 border border-border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                                <p className="font-semibold text-text-primary">{c.title}</p>
                                <p className="text-sm text-text-secondary">{c.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{Math.round((c.commissionRate || 0) * 100)}% Comm</span>
                                <button className="text-xs font-bold text-primary hover:underline">View Assets</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {trendingItems.length > 0 && (
                 <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                    <h2 className="text-xl font-bold font-display mb-4 text-text-primary">Personalized For You: Trending Products</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {trendingItems.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface p-6 rounded-xl shadow-soft border border-border space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Your Main Referral Link</h2>
                            <div className="flex mt-2">
                                <input type="text" readOnly value={`https://urbanprime.com/?ref=${affiliate.referralCode}`} className="w-full p-2 bg-surface-soft border border-border rounded-l-md text-text-primary" />
                                <button onClick={() => handleCopy(`https://urbanprime.com/?ref=${affiliate.referralCode}`)} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-r-md hover:opacity-90"><ClipboardIcon/></button>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Product Link Generator</h2>
                            <form onSubmit={handleGenerateLink} className="flex mt-2">
                                <input type="url" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="Paste product URL here..." required className="w-full p-2 border border-border bg-surface-soft rounded-l-md text-text-primary" />
                                <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold rounded-r-md text-sm hover:bg-primary/90">Generate</button>
                            </form>
                            {links.length > 0 && (
                                <ul className="text-sm mt-2 space-y-1 max-h-40 overflow-y-auto pr-2">
                                    {links.map(link => (
                                        <li key={link.id} className="text-xs flex justify-between items-center bg-surface-soft p-2 rounded text-text-secondary">
                                            <span className="truncate max-w-[200px]">{link.originalUrl} &rarr; {link.shortCode}</span> 
                                            <span>{link.clicks} clicks</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                     <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                        <h2 className="text-xl font-bold font-display mb-4 text-text-primary">Commission History</h2>
                        <div className="overflow-x-auto max-h-60">
                            <table className="w-full text-sm">
                                <thead className="text-left text-text-secondary"><tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2 text-right">Amount</th></tr></thead>
                                <tbody>
                                    {earnings.length > 0 ? earnings.map(e => (
                                        <tr key={e.id} className="border-b border-border hover:bg-surface-soft">
                                            <td className="p-2 text-text-primary">{new Date(e.date).toLocaleDateString()}</td>
                                            <td className="p-2 text-text-secondary capitalize">{e.type}</td>
                                            <td className="p-2 capitalize font-medium text-text-secondary">{e.status}</td>
                                            <td className="p-2 text-right font-bold text-green-600">+{currency.symbol}{e.amount.toFixed(2)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={4} className="text-center p-4 text-gray-400">No earnings yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                        <h2 className="text-lg font-bold text-text-primary">Advanced Tools</h2>
                        <div className="mt-4 border-t border-border pt-4">
                             <h3 className="font-semibold text-sm mb-2 text-text-secondary">Payouts</h3>
                             <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md text-center">
                                <p className="text-xs text-green-700 dark:text-green-400">Available for Payout</p>
                                <p className="text-2xl font-bold text-green-800 dark:text-green-300">{currency.symbol}{availableForPayout.toFixed(2)}</p>
                             </div>
                             <button onClick={handlePayout} disabled={availableForPayout <= 0 || isSubmitting} className="w-full mt-2 text-sm p-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md flex items-center justify-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 hover:opacity-90">
                                <WalletIcon/> {isSubmitting ? <Spinner size="sm" /> : 'Transfer to Wallet'}
                             </button>
                        </div>
                        <div className="mt-4 border-t border-border pt-4">
                             <h3 className="font-semibold text-sm mb-2 text-text-secondary">Submissions for Rewards</h3>
                             <form onSubmit={handleSubmission} className="space-y-2">
                                <select value={submission.type} onChange={e => setSubmission({url: '', type: e.target.value})} className="w-full p-2 border rounded-md text-sm bg-surface-soft border-border text-text-primary">
                                    <option value="product">Submit External Product</option>
                                    <option value="review">Submit Content/Review</option>
                                </select>
                                <input type="url" value={submission.url} onChange={e => setSubmission(p => ({...p, url: e.target.value}))} placeholder="Paste URL..." required className="w-full p-2 border rounded-md bg-surface-soft border-border text-text-primary" />
                                <button type="submit" disabled={isSubmitting} className="w-full text-sm p-2 bg-primary text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:bg-primary/70 hover:opacity-90">
                                    <SubmitIcon /> {isSubmitting ? <Spinner size="sm" /> : 'Submit for Review'}
                                </button>
                             </form>
                        </div>
                    </div>
                    <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                        <h2 className="text-lg font-bold text-text-primary">Custom Coupon Codes</h2>
                        <form onSubmit={handleCreateCoupon} className="flex gap-2 mt-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-text-secondary">Code</label>
                                <input type="text" value={newCoupon.code} onChange={e=>setNewCoupon(p=>({...p, code:e.target.value.toUpperCase()}))} required placeholder="SARA10" className="w-full p-2 border rounded-md bg-surface-soft border-border text-text-primary"/>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-text-secondary">% Off</label>
                                <input type="number" min="1" max="90" value={newCoupon.percentage} onChange={e=>setNewCoupon(p=>({...p, percentage:Number(e.target.value)}))} required className="w-20 p-2 border rounded-md bg-surface-soft border-border text-text-primary"/>
                            </div>
                            <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm hover:opacity-90">Create</button>
                        </form>
                        {coupons.length > 0 && (
                            <ul className="text-sm mt-2 space-y-1 max-h-40 overflow-y-auto pr-2">
                                {coupons.map(c => (
                                    <li key={c.id} className="text-xs flex justify-between items-center bg-surface-soft p-2 rounded text-text-secondary">
                                        <span>Code: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{c.code}</span> ({c.discountPercentage}% off)</span> 
                                        <span>{c.uses} uses</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                    <h2 className="text-xl font-bold font-display mb-4 text-text-primary">Creative Assets</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {assets.map(asset => (
                            <div key={asset.id} className="group relative rounded-md overflow-hidden">
                                <img src={asset.imageUrl} alt={asset.title} className="w-full h-auto object-cover aspect-video"/>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                    <p className="text-white text-xs font-bold truncate">{asset.title}</p>
                                    <button onClick={() => handleCopy(asset.imageUrl)} className="text-xs text-primary font-semibold text-left hover:underline">Copy Link</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                    <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2 text-text-primary"><TrophyIcon/> Leaderboard</h2>
                    <ol className="space-y-3">
                        {leaderboard.map((aff, index) => (
                            <li key={aff.userId} className={`flex items-center gap-4 p-2 rounded-md ${aff.userId === user.id ? 'bg-primary/10' : 'hover:bg-surface-soft'}`}>
                                <span className="font-bold text-lg w-6 text-text-secondary">{index + 1}</span>
                                <img src={aff.avatar} alt={aff.name} className="w-10 h-10 rounded-full" />
                                <span className="font-semibold flex-1 text-text-primary">{aff.name}</span>
                                <span className="font-bold text-text-secondary">{aff.signups.toLocaleString()} conversions</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
        </>
    );
};

export default AffiliateProgramPage;
