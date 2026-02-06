
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';

const StreakFireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-orange-500"><path d="M12 2c1.5 2.5 4 4 4 7 0 2.5-2.5 4.5-4 4.5s-4-2-4-4.5c0-3 2.5-4.5 4-7z"/><path d="M12 11.5c-2 2-3 4-3 6 0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0-2-1-4-3-6z"/></svg>;
const CoinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><circle cx="12" cy="12" r="10"/><text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fill="white" fontWeight="bold">$</text></svg>;

const RewardsPage: React.FC = () => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [points, setPoints] = useState(user?.rewardPoints || 100);
    const [streak, setStreak] = useState(user?.dailyStreak || 0);

    const handleDailyCheckIn = () => {
        if (isCheckedIn) return;
        setPoints(p => p + 10);
        setStreak(s => s + 1);
        setIsCheckedIn(true);
        // In a real app, call API to update streak
    };

    const nextTierPoints = 1000;
    const progress = Math.min((points / nextTierPoints) * 100, 100);

    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-primary dark:text-white font-display">Prime Rewards</h1>
                    <p className="mt-4 text-xl text-slate-600 dark:text-gray-400">Play, Shop, Earn. Get rewarded for being you.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Streak Section */}
                    <div className="bg-gradient-to-br from-orange-100 to-yellow-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-lg text-center">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Daily Streak</h2>
                        <div className="flex justify-center my-6">
                            <div className="relative">
                                <StreakFireIcon />
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-white text-xs">{streak}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{streak} Days on fire! Keep it up for a bonus.</p>
                        <button 
                            onClick={handleDailyCheckIn}
                            disabled={isCheckedIn}
                            className={`w-full py-3 rounded-full font-bold text-white transition-all ${isCheckedIn ? 'bg-gray-400 cursor-default' : 'bg-orange-500 hover:bg-orange-600 active:scale-95'}`}
                        >
                            {isCheckedIn ? 'Checked In' : 'Check In (+10 Pts)'}
                        </button>
                    </div>

                    {/* Points Balance */}
                    <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-lg border dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold dark:text-white">Your Balance</h2>
                            <div className="flex items-center gap-2 text-3xl font-extrabold text-primary">
                                <CoinIcon /> {points}
                            </div>
                        </div>
                        
                        <div className="mb-8">
                            <div className="flex justify-between text-sm font-semibold mb-2 dark:text-gray-300">
                                <span>Current Tier: Silver</span>
                                <span>Next: Gold ({nextTierPoints} pts)</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-primary h-4 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="border dark:border-gray-600 p-4 rounded-xl text-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                <p className="text-lg font-bold text-primary">100 pts</p>
                                <p className="font-semibold dark:text-white">$1 Off Coupon</p>
                            </div>
                             <div className="border dark:border-gray-600 p-4 rounded-xl text-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                <p className="text-lg font-bold text-primary">500 pts</p>
                                <p className="font-semibold dark:text-white">$5 Gift Card</p>
                            </div>
                             <div className="border dark:border-gray-600 p-4 rounded-xl text-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                <p className="text-lg font-bold text-primary">1000 pts</p>
                                <p className="font-semibold dark:text-white">Free Shipping</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ways to Earn */}
                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-center mb-8 dark:text-white">More Ways to Earn</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-md">
                            <p className="text-4xl font-bold text-primary mb-2">1 pt</p>
                            <h3 className="text-lg font-semibold dark:text-white">Per {currency.symbol}1 Spent</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Earn points on every rental.</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-md">
                            <p className="text-4xl font-bold text-primary mb-2">50 pts</p>
                            <h3 className="text-lg font-semibold dark:text-white">List an Item</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Add a new product to the marketplace.</p>
                        </div>
                         <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-md">
                            <p className="text-4xl font-bold text-primary mb-2">25 pts</p>
                            <h3 className="text-lg font-semibold dark:text-white">Leave a Review</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Help the community with feedback.</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default RewardsPage;
