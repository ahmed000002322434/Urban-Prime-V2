import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import analyticsService, { SellerAnalyticsDashboard, TrendData } from '../../services/analyticsService';
import listerService from '../../services/listerService';

const StoreAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userPersona } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SellerAnalyticsDashboard | null>(null);
  const [topItems, setTopItems] = useState<Array<{ name: string; revenue: number; orders: number; views: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const getDaysBack = (range: string): number => {
    switch (range) {
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'year':
        return 365;
      default:
        return 30;
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!currentUser?.uid || !userPersona?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const daysBack = getDaysBack(timeRange);
        
        // Fetch seller analytics
        const analyticsData = await analyticsService.getSellerAnalytics(
          userPersona.id,
          daysBack
        );
        
        setAnalytics(analyticsData);

        // Fetch real-time metrics
        const metrics = await analyticsService.getRealTimeMetrics(userPersona.id);
        console.log('Real-time metrics:', metrics);

        // Fetch recent bookings/orders
        try {
          const bookings = await listerService.getBookings(userPersona.id, 10);
          const formattedOrders = bookings.slice(0, 3).map(booking => ({
            id: `#${booking.id?.slice(0, 5).toUpperCase() || 'ORDER'}`,
            customer: booking.buyerName || 'Guest',
            item: booking.itemTitle || 'Product',
            amount: `$${(booking.totalPrice || 0).toFixed(2)}`,
            status: booking.status || 'pending'
          }));
          setRecentOrders(formattedOrders);
        } catch (error) {
          console.warn('Failed to fetch bookings:', error);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange, currentUser?.uid, userPersona?.id]);

  const stats = analytics ? {
    totalRevenue: analytics.totalRevenue || 0,
    totalOrders: analytics.completedCheckouts || 0,
    conversionRate: parseFloat((analytics.conversionRate || 0).toFixed(1)),
    avgOrderValue: parseFloat((analytics.averageOrderValue || 0).toFixed(2)),
    cartAbandonmentRate: parseFloat((analytics.cartAbandonmentRate || 0).toFixed(1)),
  } : {
    totalRevenue: 0,
    totalOrders: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    cartAbandonmentRate: 0,
  };

  // Transform trend data for chart display
  const lineChartData = (analytics?.revenueTrend || []).map((trend, idx) => ({
    day: trend.label,
    orders: Math.floor(Math.random() * 50),
    revenue: trend.value
  })).slice(-7);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.header
        className="bg-black/40 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">📊 Store Analytics</h1>
              <p className="text-purple-300 text-sm">Track your business performance</p>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-purple-500/30 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
              <button
                onClick={() => navigate('/store/manager')}
                className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Main Stats Grid */}
        <motion.div
          className="grid md:grid-cols-5 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[
            { label: 'Total Revenue', value: loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: 'from-emerald-600 to-emerald-400' },
            { label: 'Total Orders', value: loading ? '...' : stats.totalOrders, icon: '📦', color: 'from-blue-600 to-blue-400' },
            { label: 'Avg Order Value', value: loading ? '...' : `$${stats.avgOrderValue}`, icon: '💵', color: 'from-yellow-600 to-yellow-400' },
            { label: 'Conversion Rate', value: loading ? '...' : `${stats.conversionRate}%`, icon: '📈', color: 'from-purple-600 to-purple-400' },
            { label: 'Cart Abandonment', value: loading ? '...' : `${stats.cartAbandonmentRate}%`, icon: '🛒', color: 'from-red-600 to-red-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-xl`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-white/80 text-sm">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <motion.div
            className="lg:col-span-2 bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Weekly Performance</h2>
            <div className="flex items-end gap-4 h-64">
              {lineChartData.map((data, i) => {
                const maxRevenue = Math.max(...lineChartData.map(d => d.revenue));
                const height = (data.revenue / maxRevenue) * 100;
                return (
                  <motion.div
                    key={data.day}
                    className="flex-1 flex flex-col items-center"
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className="text-sm text-gray-300 mb-2">${data.revenue}</div>
                    <motion.div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:opacity-80"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                    />
                    <div className="text-xs text-gray-400 mt-2">{data.day}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Top Items */}
          <motion.div
            className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Top Performing Items</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : analytics?.topProducts && analytics.topProducts.length > 0 ? (
                analytics.topProducts.slice(0, 3).map((item, i) => (
                  <motion.div
                    key={item.itemId}
                    className="p-4 bg-white/5 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                    onClick={() => navigate(`/item/${item.itemId}`)}
                  >
                    <p className="font-semibold text-white truncate">{item.itemTitle}</p>
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>${item.totalCheckouts * 50} revenue</span>
                      <span>{item.totalCheckouts} orders • {item.totalViews} views</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">No sales data yet</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Customer Insights */}
        <motion.div
          className="grid md:grid-cols-3 gap-8 mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-4">Total Product Views</h3>
            <p className="text-4xl font-black text-emerald-400">{loading ? '...' : analytics?.totalViews || 0}</p>
            <p className="text-sm text-gray-400 mt-2">All-time listing exposure</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-4">Cart Additions</h3>
            <p className="text-4xl font-black text-blue-400">{loading ? '...' : analytics?.totalCartAdds || 0}</p>
            <p className="text-sm text-gray-400 mt-2">{loading ? '...' : `${(100 - stats.cartAbandonmentRate).toFixed(1)}% to checkout`}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-4">Conversion Funnel</h3>
            <p className="text-4xl font-black text-yellow-400">{loading ? '...' : `${stats.conversionRate}%`}</p>
            <p className="text-sm text-gray-400 mt-2">Views to checkout rate</p>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8 mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Recent Orders</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading orders...</div>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order, i) => (
                <motion.div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate('/orders')}
                >
                  <div>
                    <p className="font-semibold text-white">{order.id}</p>
                    <p className="text-sm text-gray-400">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">{order.item}</p>
                    <p className="font-bold text-white">{order.amount}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                    order.status === 'shipped' ? 'bg-blue-500/20 text-blue-300' :
                    order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {order.status}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No recent orders</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StoreAnalyticsPage;
