import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { listerService } from '../../services/itemService';
import type { DashboardAnalytics, Booking, DiscountCode, ItemBundle } from '../../types';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
};

const BarChart: React.FC<{ data: { month: string; earnings: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.earnings), 1); // Avoid division by zero
    const chartHeight = 200;
    const barWidthPercent = 100 / (data.length || 1);
  
    return (
      <div className="w-full" style={{ height: `${chartHeight}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
          {data.map((d, i) => {
            const barHeight = (d.earnings / maxValue) * (chartHeight - 20); // 20px for labels
            return (
              <g key={d.month} transform={`translate(${i * barWidthPercent}, 0)`}>
                <rect
                  width={`${barWidthPercent * 0.7}`}
                  x={`${barWidthPercent * 0.15}`}
                  height={barHeight}
                  y={chartHeight - barHeight - 15}
                  fill="currentColor"
                  className="text-primary/70 hover:text-primary transition-colors"
                />
                 <text 
                    x={`${barWidthPercent / 2}`}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-current text-gray-500 font-semibold"
                >
                    {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
};

const statusColors: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-100',
    confirmed: 'text-green-600 bg-green-100',
    completed: 'text-blue-600 bg-blue-100',
    cancelled: 'text-red-600 bg-red-100',
};

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
    const [bundles, setBundles] = useState<ItemBundle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const sidebarY = 0;

    const fetchDashboardData = () => {
        if (!user) return;
        setIsLoading(true);
        setLoadError(null);
        Promise.all([
            listerService.getDashboardAnalytics(user.id),
            listerService.getBookings(user.id),
            listerService.getDiscountCodes(user.id),
            listerService.getBundles(user.id),
        ]).then(([analyticsData, bookingsData, discountsData, bundlesData]) => {
            setAnalytics(analyticsData);
            setBookings(bookingsData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setDiscounts(discountsData);
            setBundles(bundlesData);
            setIsLoading(false);
        }).catch((error) => {
            console.error(error);
            setLoadError('Could not load dashboard data.');
            setIsLoading(false);
        });
    }

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const handleUpdateBooking = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
        await listerService.updateBookingStatus(bookingId, status);
        fetchDashboardData(); // Refetch to update UI
    };


    if (isLoading) return <DashboardPageLoader title="Loading dashboard data..." />;
    if (loadError || !analytics) {
        return (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <LottieAnimation src={uiLottieAnimations.noFileFound} className="h-44 w-44 mx-auto object-contain" />
                <h2 className="mt-3 text-2xl font-bold text-text-primary">Could not load dashboard data</h2>
                <p className="mt-2 text-sm text-text-secondary">{loadError || 'Please try again.'}</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                    <button onClick={fetchDashboardData} className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-text">
                        Retry
                    </button>
                    <button onClick={() => window.location.reload()} className="rounded-full border border-border px-6 py-2 text-sm font-semibold text-text-primary">
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Lister Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Analytics */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-surface/80 backdrop-blur-xl p-4 sm:p-6 rounded-lg shadow-soft border border-border/50 hover:shadow-lg transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-4">Performance Overview</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center mb-6">
                            <motion.div 
                                whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200/50 dark:border-blue-/20"
                            >
                                <motion.p 
                                    className="text-2xl font-bold text-primary"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {currency.symbol}{analytics.totalEarnings.toLocaleString()}
                                </motion.p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total Earnings</p>
                            </motion.div>

                            <motion.div 
                                whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200/50 dark:border-green-/20"
                            >
                                <motion.p 
                                    className="text-2xl font-bold text-green-600 dark:text-green-400"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {analytics.rentalCount}
                                </motion.p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Completed Rentals/Sales</p>
                            </motion.div>

                            <motion.div 
                                whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200/50 dark:border-purple-/20"
                            >
                                <motion.p 
                                    className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    {analytics.topItem}
                                </motion.p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Top Performing Item</p>
                            </motion.div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Monthly Earnings</h3>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <BarChart data={analytics.earningsByMonth} />
                        </motion.div>
                    </motion.div>

                    {/* Booking Management */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-surface/80 backdrop-blur-xl p-6 rounded-lg shadow-soft border border-border/50 hover:shadow-lg transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-4">Manage Bookings</h2>
                        <div className="space-y-4">
                            {bookings.length > 0 ? (
                                <motion.div 
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="space-y-4"
                                >
                                    {bookings.map((booking, index) => (
                                        <motion.div
                                            key={booking.id}
                                            variants={itemVariants}
                                            whileHover={{ x: 5, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                            className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer transition-all"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.7 + index * 0.1 }}
                                            >
                                                <p className="font-bold text-text-primary">{booking.itemTitle}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Renter: {booking.renterName}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Dates: {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}</p>
                                            </motion.div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <motion.span 
                                                    whileHover={{ scale: 1.05 }}
                                                    className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[booking.status]} transition-all`}
                                                >
                                                    {booking.status.toUpperCase()}
                                                </motion.span>
                                                {booking.status === 'pending' && (
                                                    <motion.div className="flex items-center gap-2">
                                                        <motion.button 
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleUpdateBooking(booking.id, 'confirmed')} 
                                                            className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                                        >
                                                            Approve
                                                        </motion.button>
                                                        <motion.button 
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleUpdateBooking(booking.id, 'cancelled')} 
                                                            className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                                        >
                                                            Deny
                                                        </motion.button>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
                                    <LottieAnimation src={uiLottieAnimations.nothing} className="h-32 w-32 mx-auto object-contain" />
                                    <p className="text-slate-500 dark:text-slate-400">No bookings found.</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar */}
                <motion.div 
                    style={{ y: sidebarY }}
                    className="space-y-6 sticky top-6 max-h-[calc(100vh-32px)] overflow-y-auto"
                >
                    {/* Renter Insights */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-surface/80 backdrop-blur-xl p-6 rounded-lg shadow-soft border border-border/50 hover:shadow-lg transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-4">Renter Insights</h2>
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-4"
                        >
                            <motion.div 
                                variants={itemVariants}
                                className="flex justify-between items-baseline p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-/20"
                            >
                                <span className="text-sm text-slate-500 dark:text-slate-400">Repeat Renters</span>
                                <motion.span 
                                    className="font-bold text-lg text-blue-600 dark:text-blue-400"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                >
                                    {analytics.repeatRenters}%
                                </motion.span>
                            </motion.div>

                            <motion.div 
                                variants={itemVariants}
                                className="flex justify-between items-baseline p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-/20"
                            >
                                <span className="text-sm text-slate-500 dark:text-slate-400">Avg. Rental Duration</span>
                                <motion.span 
                                    className="font-bold text-lg text-green-600 dark:text-green-400"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                >
                                    {analytics.avgRentalDuration} days
                                </motion.span>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Discount Codes */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-surface/80 backdrop-blur-xl p-6 rounded-lg shadow-soft border border-border/50 hover:shadow-lg transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-4">Discount Codes</h2>
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-3"
                        >
                            {discounts.length > 0 ? (
                                discounts.map((d, index) => (
                                <motion.div 
                                    key={d.id} 
                                    variants={itemVariants}
                                    whileHover={{ x: 5 }}
                                    className="text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <motion.span 
                                        className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-900 dark:text-slate-100"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        {d.code}
                                    </motion.span>
                                    <span className="text-slate-700 dark:text-slate-300">{d.percentage}% Off</span>
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1 + index * 0.1 }}
                                        className={`text-xs font-bold ${d.isActive ? 'text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded' : 'text-slate-400'}`}
                                    >
                                        {d.isActive ? '✓ ACTIVE' : '○ INACTIVE'}
                                    </motion.span>
                                </motion.div>
                                ))
                            ) : (
                                <div className="py-3 text-center">
                                    <LottieAnimation src={uiLottieAnimations.noFileFound} className="h-28 w-28 mx-auto object-contain" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">No discount codes yet.</p>
                                </div>
                            )}
                        </motion.div>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-4 w-full text-sm py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all font-semibold"
                        >
                            Create New Code
                        </motion.button>
                    </motion.div>

                    {/* Item Bundles */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-surface/80 backdrop-blur-xl p-6 rounded-lg shadow-soft border border-border/50 hover:shadow-lg transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-4">Item Bundles</h2>
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-3"
                        >
                            {bundles.length > 0 ? (
                                bundles.map((b, index) => (
                                <motion.div 
                                    key={b.id} 
                                    variants={itemVariants}
                                    whileHover={{ x: 5, backgroundColor: "rgba(0,0,0,0.02)" }}
                                    className="p-3 border-l-4 border-purple-500 bg-slate-50 dark:bg-slate-900/30 rounded-r-md hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <p className="font-semibold text-sm text-text-primary">{b.name}</p>
                                    <motion.p 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.2 + index * 0.1 }}
                                        className="text-xs text-slate-500 dark:text-slate-400 mt-1"
                                    >
                                        {b.itemTitles.join(', ')}
                                    </motion.p>
                                </motion.div>
                                ))
                            ) : (
                                <div className="py-3 text-center">
                                    <LottieAnimation src={uiLottieAnimations.noResults} className="h-28 w-28 mx-auto object-contain" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">No bundles created yet.</p>
                                </div>
                            )}
                        </motion.div>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-4 w-full text-sm py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-md hover:from-purple-600 hover:to-purple-700 transition-all font-semibold"
                        >
                            Create New Bundle
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default DashboardPage;
