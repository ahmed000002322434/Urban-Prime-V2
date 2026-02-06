import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { SellerPerformanceStats, GrowthInsight } from '../../types';
import Spinner from '../../components/Spinner';
import VerifiedBadge from '../../components/VerifiedBadge';
import SellerActionCenter from '../../components/dashboard/SellerActionCenter';
import AIGrowthInsights from '../../components/dashboard/AIGrowthInsights';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

// --- Icons for Stat Cards ---
const EarningsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; link: string; badge?: number }> = ({ title, value, icon, link, badge }) => (
    <Link to={link}>
        <motion.div 
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="relative block bg-surface/80 backdrop-blur-xl p-4 rounded-2xl shadow-soft border border-border/50 transition-all duration-300 group"
        >
            {badge && badge > 0 ? (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {badge} New
                </span>
            ) : null}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-black text-text-primary tracking-tight">{value}</p>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">{title}</h3>
                </div>
            </div>
        </motion.div>
    </Link>
);

const COLORS = ['#0fb9b1', '#f39c12', '#3b82f6', '#ec4899', '#8b5cf6'];

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const DashboardOverview: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<SellerPerformanceStats | null>(null);
    const [insights, setInsights] = useState<GrowthInsight[]>([]);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const performanceStats = await listerService.getSellerPerformanceStats(user.id);
            const growthInsights = await listerService.getGrowthInsights(performanceStats);
            const bookings = await listerService.getBookings(user.id);
            
            const newSales = bookings.filter(b => b.status === 'confirmed').length;
            
            setStats(performanceStats);
            setInsights(growthInsights);
            setPendingOrdersCount(newSales);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-[50vh]"><Spinner size="lg" /></div>;
    }
    if (!user) return null;

    const chartData = stats?.earnings.length ? stats.earnings : [
        { date: 'Jan', amount: 0 }, { date: 'Feb', amount: 0 }, { date: 'Mar', amount: 0 }, 
        { date: 'Apr', amount: 0 }, { date: 'May', amount: 0 }, { date: 'Jun', amount: 0 }
    ];
    const pieData = stats?.categorySales.length ? stats.categorySales : [{ category: 'No Sales', value: 1 }];

    const totalEarnings = stats?.earnings.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const completedSales = stats?.categorySales.reduce((acc, curr) => acc + curr.value, 0) || 0;

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="bg-surface/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-soft border border-border/50 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <img src={user.avatar} alt={user.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-white dark:ring-white/10 shadow-lg object-cover z-10"/>
                <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                        <h1 className="text-3xl font-black font-display text-text-primary tracking-tight">Welcome, {user.name.split(' ')[0]}!</h1>
                        <VerifiedBadge type="user" level={user.verificationLevel} />
                    </div>
                    <p className="text-text-secondary mt-1 font-medium">Here's your performance overview for today.</p>
                </div>
            </motion.div>

            {/* Quick Stats Row */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Earnings" value={`$${totalEarnings.toLocaleString()}`} icon={<EarningsIcon />} link="/profile/earnings" />
                 <StatCard title="New Sales" value={pendingOrdersCount} icon={<BellIcon />} link="/profile/sales" badge={pendingOrdersCount} />
                 <StatCard title="Total Orders" value={completedSales} icon={<OrdersIcon />} link="/profile/sales" />
                 <StatCard title="Conversion Rate" value={`${stats?.conversionRate.toFixed(1)}%`} icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>} link="/profile/analytics/advanced" />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column: Charts */}
                <div className="lg:col-span-2 space-y-8">
                     {/* Earnings Chart */}
                    <motion.div 
                        variants={itemVariants} 
                        className="bg-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-soft border border-border/50"
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="font-bold text-lg text-text-primary mb-6">Earnings Overview</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0fb9b1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#0fb9b1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)' }} />
                                    <Area type="monotone" dataKey="amount" stroke="#0fb9b1" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                    
                    {/* Action Center */}
                    <motion.div variants={itemVariants}>
                        {stats && <SellerActionCenter pendingShipments={pendingOrdersCount} lowStockItems={stats.lowStockItems} unreadMessages={stats.unreadMessages} />}
                    </motion.div>
                </div>

                {/* Right Column: Insights & Pie Chart */}
                <div className="space-y-8">
                     <motion.div variants={itemVariants}>
                        <AIGrowthInsights insights={insights} />
                     </motion.div>
                     
                     <motion.div 
                        variants={itemVariants}
                        className="bg-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-soft border border-border/50"
                     >
                        <h3 className="font-bold text-lg text-text-primary mb-4">Sales by Category</h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                     </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default DashboardOverview;