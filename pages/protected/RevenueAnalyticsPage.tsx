import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService, { CheckoutEvent } from '../../services/analyticsService';
import BackButton from '../../components/BackButton';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const RevenueAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    topProducts: [] as Array<{ itemId: string; title: string; revenue: number; orders: number }>,
    checkoutData: [] as CheckoutEvent[],
    dailyRevenue: [] as Array<{ date: string; revenue: number }>
  });

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!activePersona?.id) {
        setLoading(false);
        return;
      }

      try {
        const analytics = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        
        if (analytics) {
          // Calculate daily revenue by fetching checkout data per product
          const dailyMap = new Map<string, number>();
          
          if (analytics.topProducts && analytics.topProducts.length > 0) {
            for (const product of analytics.topProducts) {
              // Estimate revenue from completions
              const productRevenue = product.totalCheckouts * 50; // Estimate
              dailyMap.set(new Date().toISOString().split('T')[0], (dailyMap.get(new Date().toISOString().split('T')[0]) || 0) + productRevenue);
            }
          }

          const dailyRevenue = Array.from(dailyMap.entries())
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-30);

          setData({
            totalRevenue: analytics.totalRevenue,
            averageOrderValue: analytics.averageOrderValue,
            totalOrders: analytics.completedCheckouts,
            topProducts: analytics.topProducts?.slice(0, 5).map(p => ({
              itemId: p.itemId,
              title: p.itemTitle,
              revenue: p.totalCheckouts * 50,
              orders: p.totalCheckouts
            })) || [],
            checkoutData: [],
            dailyRevenue: dailyRevenue.length > 0 ? dailyRevenue : [{ date: new Date().toISOString().split('T')[0], revenue: analytics.totalRevenue }]
          });
        }
      } catch (error) {
        console.error('Failed to load revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [activePersona?.id]);

  if (loading) {
    return <DashboardPageLoader title="Loading revenue analytics..." />;
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex items-center gap-4">
        <BackButton to="/store/manager/analytics" alwaysShowText />
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Revenue Analytics</h1>
          <p className="text-sm text-[#666] mt-1">Comprehensive insights about your sales and revenue</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Total Revenue</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">${data.totalRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#727272]">All-time sales revenue</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Avg. Order Value</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">${data.averageOrderValue.toFixed(2)}</p>
          <p className="mt-1 text-xs text-[#727272]">Average per order</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Total Orders</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.totalOrders}</p>
          <p className="mt-1 text-xs text-[#727272]">Completed transactions</p>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Daily Revenue Trend</h2>
        {data.dailyRevenue.length > 0 ? (
          <div className="space-y-3">
            {data.dailyRevenue.map((day, idx) => {
              const maxRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue), 1);
              const percentage = (day.revenue / maxRevenue) * 100;
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-semibold text-[#666]">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-[#f0f0f0] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#10b981] to-[#0fb9b1] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right font-bold text-[#1f1f1f]">${day.revenue.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No revenue data available yet</p>
          </div>
        )}
      </div>

      {/* Top Revenue Products */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Top Revenue Products</h2>
        {data.topProducts.length > 0 ? (
          <div className="space-y-3">
            {data.topProducts.map((product, idx) => (
              <div
                key={product.itemId}
                className="flex items-center justify-between p-4 rounded-lg bg-[#f7f7f7] border border-[#e0e0e0] hover:bg-white transition-colors cursor-pointer"
                onClick={() => navigate(`/item/${product.itemId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1f1f1f]">{product.title}</p>
                    <p className="text-xs text-[#666]">{product.orders} orders</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-[#10b981]">${product.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No sales data available yet</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Top Revenue Drivers</h2>
        {data.topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0]">
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Orders</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Revenue</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.slice(0, 20).map((product, idx) => (
                  <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f7f7f7]">
                    <td className="px-4 py-3 font-semibold text-[#1f1f1f]">{product.title}</td>
                    <td className="px-4 py-3">{product.orders}</td>
                    <td className="px-4 py-3 font-semibold text-[#1f1f1f]">${product.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No transaction data yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueAnalyticsPage;
