import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import type {
  BuyerDashboardSnapshot,
  GrowthInsight,
  SellerDashboardCategoryPoint,
  SellerDashboardEarningsPoint,
  SellerDashboardSnapshot
} from '../../types';
import SellerActionCenter from '../../components/dashboard/SellerActionCenter';
import AIGrowthInsights from '../../components/dashboard/AIGrowthInsights';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const COLORS = ['#0fb9b1', '#f39c12', '#3b82f6', '#ec4899', '#8b5cf6'];

const GlassStatCard: React.FC<{ label: string; value: string | number; subtext?: string; to?: string; className?: string }> = ({ label, value, subtext, to, className }) => {
  const content = (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', damping: 15, stiffness: 200 }} className={`glass-panel p-6 flex flex-col justify-between h-full glass-panel-shadow ${className}`}>
      <div>
        <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-4xl font-black text-text-primary mt-2">{value}</p>
      </div>
      {subtext && <p className="text-xs font-medium text-text-secondary opacity-70 mt-4">{subtext}</p>}
    </motion.div>
  );

  return to ? <Link to={to} className="glass-panel-hover block">{content}</Link> : <div className="glass-panel-hover">{content}</div>;
};

const DashboardHero: React.FC<{ title: string; subtitle: string; chips: string[] }> = ({ title, subtitle, chips }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="relative overflow-hidden p-6 md:p-8 glass-panel">
    <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
    <div className="relative">
      <h2 className="text-2xl font-black tracking-tight text-text-primary md:text-3xl text-center">{title}</h2>
      <p className="mt-1.5 text-sm font-medium text-text-secondary opacity-80 md:text-base">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-text-secondary glass-panel">
            {chip}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);

const defaultBuyerSnapshot: BuyerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: { totalOrders: 0, pendingOrders: 0, completedOrders: 0, activeRentals: 0, upcomingReturns: 0, totalPurchases: 0, wishlistItems: 0, unreadNotifications: 0, conversations: 0 },
  recentOrders: [],
  upcomingReturns: []
};

const defaultSellerSnapshot: SellerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: { totalRevenue: 0, pendingOrders: 0, completedOrders: 0, totalSalesUnits: 0, totalViews: 0, conversionRate: 0, lowStockCount: 0, unreadMessages: 0 },
  earningsByMonth: [],
  categorySales: [],
  recentOrders: [],
  lowStockItems: [],
  insights: [],
  setup: { hasStore: false, hasProducts: false, hasContent: false, hasApps: false }
};

const DashboardOverview: React.FC = () => {
  const { user, activePersona } = useAuth();
  const navigate = useNavigate();

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const [buyerSnapshot, setBuyerSnapshot] = useState<BuyerDashboardSnapshot>(defaultBuyerSnapshot);
  const [sellerSnapshot, setSellerSnapshot] = useState<SellerDashboardSnapshot>(defaultSellerSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  const isSellerWorkspace = activePersona?.type === 'seller';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const snapshot = isSellerWorkspace 
          ? await dashboardService.getSellerDashboardSnapshot(8)
          : await dashboardService.getBuyerDashboardSnapshot(8);
        
        if (isSellerWorkspace) {
          setSellerSnapshot(snapshot as SellerDashboardSnapshot);
        } else {
          setBuyerSnapshot(snapshot as BuyerDashboardSnapshot);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isSellerWorkspace, user]);

  if (isLoading) return <DashboardPageLoader title="Loading dashboard..." />;
  if (!user) return null;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <DashboardHero
        title={`Welcome back, ${user?.name || 'Urbanite'}!`}
        subtitle={isSellerWorkspace ? "Your premium business dashboard is ready." : "Track orders, rentals, and conversations."}
        chips={isSellerWorkspace ? ['Premium Access', 'Glass UI', 'Real-time Sync'] : [`${buyerSnapshot.summary.pendingOrders} pending`, `${buyerSnapshot.summary.wishlistItems} wishlist`] }
      />

      {isSellerWorkspace ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants}><GlassStatCard label="Total Revenue" value={`$${sellerSnapshot.summary.totalRevenue.toLocaleString()}`} subtext="All-time earnings" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Sales Units" value={sellerSnapshot.summary.totalSalesUnits} subtext="Units sold to date" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Pending Orders" value={sellerSnapshot.summary.pendingOrders} subtext="Requiring fulfillment" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Conversion Rate" value={`${sellerSnapshot.summary.conversionRate.toFixed(1)}%`} subtext="Visitor to order ratio" /></motion.div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary">Earnings Overview</h3>
              <div className="mt-6 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sellerSnapshot.earningsByMonth}>
                    <defs><linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} /><stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="month" stroke="var(--dash-border)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--dash-border)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip contentStyle={{ background: 'var(--dash-surface)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid var(--dash-border)', color: 'inherit' }} />
                    <Area type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.3 }} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary">Sales by Category</h3>
              <div className="mt-6 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sellerSnapshot.categorySales} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                      {sellerSnapshot.categorySales.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--dash-surface)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid var(--dash-border)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SellerActionCenter pendingShipments={sellerSnapshot.summary.pendingOrders} lowStockItems={sellerSnapshot.lowStockItems} unreadMessages={sellerSnapshot.summary.unreadMessages} />
            <AIGrowthInsights insights={sellerSnapshot.insights} />
          </div>
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants}><GlassStatCard label="Total Orders" value={buyerSnapshot.summary.totalOrders} subtext={`${buyerSnapshot.summary.completedOrders} completed`} to="/profile/orders" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Pending Orders" value={buyerSnapshot.summary.pendingOrders} subtext="Needs review" to="/profile/orders" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Active Rentals" value={buyerSnapshot.summary.activeRentals} subtext="Current bookings" to="/profile/orders" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Wishlist" value={buyerSnapshot.summary.wishlistItems} subtext="Saved products" to="/profile/wishlist" /></motion.div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div variants={itemVariants} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary flex items-center gap-2">Upcoming Returns</h3>
              <div className="mt-5 space-y-3">
                {buyerSnapshot.upcomingReturns.length > 0 ? (
                  buyerSnapshot.upcomingReturns.map((entry) => (
                    <Link key={entry.orderItemId} to={`/profile/orders/${entry.orderId}`} className="block p-4 transition-all glass-panel glass-panel-hover border-l-4 border-blue-500/50">
                      <p className="text-sm font-bold text-text-primary">{entry.itemTitle}</p>
                      <p className="mt-1 text-xs font-medium text-text-secondary opacity-70">Due {new Date(entry.rentalEnd).toLocaleDateString()} | Qty {entry.quantity}</p>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-sm font-medium border border-dashed rounded-2xl border-white/10 text-text-secondary opacity-60 text-center py-8">No returns due soon.</p>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary flex items-center gap-2">Recent Orders</h3>
              <div className="mt-5 space-y-3">
                {buyerSnapshot.recentOrders.length > 0 ? (
                  buyerSnapshot.recentOrders.map((order) => (
                    <Link key={order.id} to={`/profile/orders/${order.id}`} className="block p-4 transition-all glass-panel glass-panel-hover border-l-4 border-purple-500/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-text-primary">Order #{order.id.slice(0, 8)}</p>
                          <p className="mt-1 text-xs font-medium text-text-secondary opacity-70">{new Date(order.createdAt).toLocaleDateString()} | {order.quantityTotal} items</p>
                        </div>
                        <span className="text-xs font-black text-primary">{order.currency} {order.total.toFixed(2)}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-sm font-medium border border-dashed rounded-2xl border-white/10 text-text-secondary opacity-60 text-center py-8">No recent orders yet.</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default DashboardOverview;
