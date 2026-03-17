import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import BackButton from '../../components/BackButton';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const SalesUnitsAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalUnits: 0,
    averageUnitsPerOrder: 0,
    topSellingProducts: [] as Array<{ itemId: string; title: string; units: number; revenue: number }>,
    unitsTrend: [] as Array<{ date: string; units: number }>
  });

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!activePersona?.id) {
        setLoading(false);
        return;
      }

      try {
        const analytics = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        
        if (analytics) {
          const unitsTrend = (analytics.unitsTrend || analytics.ordersTrend || []).map((entry) => ({
            date: entry.date,
            units: entry.value
          }));
          const totalUnits = analytics.topProducts?.reduce((sum, product) => sum + Number(product.unitsSold || product.totalCheckouts || 0), 0) || analytics.completedCheckouts;
          const totalOrders = analytics.totalOrders || analytics.completedCheckouts;

          setData({
            totalUnits,
            averageUnitsPerOrder: totalOrders > 0
              ? parseFloat((totalUnits / totalOrders).toFixed(2))
              : 0,
            topSellingProducts: analytics.topProducts?.slice(0, 5).map(p => ({
              itemId: p.itemId,
              title: p.itemTitle,
              units: Number(p.unitsSold || p.totalCheckouts || 0),
              revenue: Number(p.revenue || 0)
            })) || [],
            unitsTrend: unitsTrend.length > 0 ? unitsTrend : [{ date: new Date().toISOString().split('T')[0], units: totalUnits }]
          });
        }
      } catch (error) {
        console.error('Failed to load sales data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [activePersona?.id]);

  if (loading) {
    return <DashboardPageLoader title="Loading sales units analytics..." />;
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex items-center gap-4">
        <BackButton to="/store/manager/analytics" alwaysShowText />
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Sales Units Analytics</h1>
          <p className="text-sm text-[#666] mt-1">Track units sold and sales performance metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Total Units Sold</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.totalUnits}</p>
          <p className="mt-1 text-xs text-[#727272]">All-time sales</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Avg Units Per Order</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.averageUnitsPerOrder.toFixed(1)}</p>
          <p className="mt-1 text-xs text-[#727272]">Average order size</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Orders Completed</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.totalUnits}</p>
          <p className="mt-1 text-xs text-[#727272]">Total transactions</p>
        </div>
      </div>

      {/* Sales Trend */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Daily Sales Trend</h2>
        {data.unitsTrend.length > 0 ? (
          <div className="space-y-3">
            {data.unitsTrend.map((day, idx) => {
              const maxUnits = Math.max(...data.unitsTrend.map(d => d.units), 1);
              const percentage = (day.units / maxUnits) * 100;
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-semibold text-[#666]">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-[#f0f0f0] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b82f6] to-[#0fb9b1] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-bold text-[#1f1f1f]">{day.units} units</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No sales data available yet</p>
          </div>
        )}
      </div>

      {/* Top Selling Products */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Top Selling Products</h2>
        {data.topSellingProducts.length > 0 ? (
          <div className="space-y-3">
            {data.topSellingProducts.map((product, idx) => (
              <div
                key={product.itemId}
                className="flex items-center justify-between p-4 rounded-lg bg-[#f7f7f7] border border-[#e0e0e0] hover:bg-white transition-colors cursor-pointer"
                onClick={() => navigate(`/item/${product.itemId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1f1f1f]">{product.title}</p>
                    <p className="text-xs text-[#666]">${product.revenue.toFixed(2)} revenue</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#3b82f6]">{product.units}</p>
                  <p className="text-xs text-[#666]">units sold</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No sales data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesUnitsAnalyticsPage;
