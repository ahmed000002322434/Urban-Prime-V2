import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { storeBuildService } from '../../services/storeBuildService';
import { rentalOrderService } from '../../services/rentalOrderService';

const StoreManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [storeData, setStoreData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalRentals: 0,
    completedRentals: 0,
    revenue: 0,
    averageRating: 4.5,
    customerCount: 0,
    returnRate: 0,
    pendingRequests: 0,
    topItems: [] as any[],
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get user's store
        const store = await storeBuildService.getUserStore(user.uid);
        if (!store) {
          setError('No store found. Please create one.');
          setIsLoading(false);
          return;
        }

        setStoreData(store);

        // Get real rental metrics
        const storeMetrics = await rentalOrderService.getStoreMetrics(store.id || '');
        setMetrics({
          totalRentals: storeMetrics.totalRentals,
          completedRentals: storeMetrics.completedRentals,
          revenue: storeMetrics.totalRevenue,
          averageRating: storeMetrics.averageRating,
          customerCount: storeMetrics.customerCount,
          returnRate: storeMetrics.returnRate,
          pendingRequests: 0,
          topItems: storeMetrics.topItems,
        });

        // Get recent requests
        const requests = await rentalOrderService.getStoreRequests(store.id || '', 5);
        setRecentRequests(
          requests.map((req) => ({
            id: req.id,
            customer: req.customerId,
            item: req.itemName,
            date: req.createdAt,
            status: req.status,
          }))
        );
      } catch (err: any) {
        console.error('Error loading store data:', err);
        setError(err.message || 'Failed to load store data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '#dashboard' },
    { icon: '📦', label: 'Manage Listings', href: '#listings' },
    { icon: '💰', label: 'Earnings', href: '#earnings' },
    { icon: '👥', label: 'Customers', href: '#customers' },
    { icon: '📝', label: 'Requests', href: '#requests' },
    { icon: '⚙️', label: 'Settings', href: '#settings' },
  ];

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

      return d.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full mx-auto mb-4"
          />
          <p className="text-purple-300 font-semibold">Loading your store...</p>
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-6xl mb-4">🚨</div>
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-purple-300 mb-6">{error || 'Store not found'}</p>
          <button
            onClick={() => navigate('/seller/setup')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all"
          >
            Create Store →
          </button>
        </motion.div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-black text-white mb-1">
                {storeData.logoEmoji} {storeData.storeName}
              </h1>
              <p className="text-purple-300 text-sm">
                {storeData.city} • {storeData.category}
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-purple-500/30 transition-all"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.nav
            className="lg:col-span-1"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4">Menu</h2>
              <nav className="space-y-2">
                {menuItems.map((item, i) => (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-500/20 hover:text-white transition-all"
                    whileHover={{ x: 4 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-semibold">{item.label}</span>
                  </motion.a>
                ))}
              </nav>
            </div>
          </motion.nav>

          {/* Main Content */}
          <motion.div
            className="lg:col-span-3 space-y-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Rentals',
                  value: metrics.totalRentals.toString(),
                  icon: '📦',
                  color: 'from-blue-600 to-blue-400',
                },
                {
                  label: 'Total Revenue',
                  value: `$${metrics.revenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  icon: '💰',
                  color: 'from-green-600 to-green-400',
                },
                {
                  label: 'Customers',
                  value: metrics.customerCount.toString(),
                  icon: '👥',
                  color: 'from-purple-600 to-purple-400',
                },
                {
                  label: 'Rating',
                  value: metrics.averageRating.toFixed(1),
                  icon: '⭐',
                  color: 'from-yellow-600 to-yellow-400',
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-xl`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <p className="text-white/80 text-sm">{stat.label}</p>
                  <p className="text-3xl font-black">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <motion.div
              className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <motion.button
                  className="p-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg text-white font-bold hover:shadow-lg transition-all group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/seller/listings')}
                >
                  <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">📦</div>
                  <p>Add New Listing</p>
                  <p className="text-xs opacity-75">Create rental item</p>
                </motion.button>

                <motion.button
                  className="p-6 bg-gradient-to-br from-green-600 to-green-500 rounded-lg text-white font-bold hover:shadow-lg transition-all group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/seller/analytics')}
                >
                  <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">📊</div>
                  <p>View Analytics</p>
                  <p className="text-xs opacity-75">Sales & traffic</p>
                </motion.button>

                <motion.button
                  className="p-6 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg text-white font-bold hover:shadow-lg transition-all group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/store/customizer')}
                >
                  <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">✨</div>
                  <p>Customize Store</p>
                  <p className="text-xs opacity-75">Design & layout</p>
                </motion.button>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Recent Rental Requests</h2>
              <div className="space-y-3">
                {recentRequests.length > 0 ? (
                  recentRequests.map((request, i) => (
                    <motion.div
                      key={request.id || i}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-all group cursor-pointer"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      whileHover={{ x: 4, backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                    >
                      <div>
                        <p className="font-semibold text-white">{request.customer}</p>
                        <p className="text-sm text-gray-400">{request.item}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatDate(request.date)}</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                            request.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : request.status === 'confirmed'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No rental requests yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Requests will appear here once you add listings
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Store Performance */}
            <motion.div
              className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Performance Insights</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Top Performing Items</h3>
                  {metrics.topItems.length > 0 ? (
                    metrics.topItems.slice(0, 3).map((item, index) => (
                      <div key={item.itemId || index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-300 truncate">{item.name}</span>
                        <div className="h-1 flex-1 mx-3 bg-gradient-to-r from-purple-600 to-transparent rounded-full" />
                        <span className="text-sm font-bold text-purple-400">{item.rentals} rentals</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm py-4">No rental data yet</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Store Statistics</h3>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Completed Rentals</span>
                    <span className="text-sm font-bold text-green-400">{metrics.completedRentals}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Return Rate</span>
                    <span className="text-sm font-bold text-yellow-400">
                      {metrics.returnRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Avg. Order Value</span>
                    <span className="text-sm font-bold text-blue-400">
                      $
                      {metrics.completedRentals > 0
                        ? (metrics.revenue / metrics.completedRentals).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StoreManagerPage;
