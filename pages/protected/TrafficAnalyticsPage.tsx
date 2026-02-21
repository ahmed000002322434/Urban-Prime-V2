import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService, { ViewEvent } from '../../services/analyticsService';
import BackButton from '../../components/BackButton';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const TrafficAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalViews: 0,
    averageTimeOnSite: 0,
    uniqueVisitors: 0,
    topProducts: [] as Array<{ itemId: string; title: string; views: number; avgTime: number }>,
    visitorsData: [] as ViewEvent[]
  });

  useEffect(() => {
    const fetchTrafficData = async () => {
      if (!activePersona?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get all listings for this seller to calculate traffic per product
        const analytics = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        
        if (analytics) {
          // Get detailed visitor data
          const allVisitors: ViewEvent[] = [];
          
          // Fetch visitors for each product
          if (analytics.topProducts && analytics.topProducts.length > 0) {
            for (const product of analytics.topProducts) {
              const visitors = await analyticsService.getProductVisitors(product.itemId, 30);
              allVisitors.push(...visitors);
            }
          }

          const uniqueVisitorsSet = new Set(allVisitors.map(v => v.visitorId));
          
          setData({
            totalViews: analytics.totalViews,
            averageTimeOnSite: allVisitors.length > 0 
              ? parseFloat((allVisitors.reduce((sum, v) => sum + (v.durationMs || 0), 0) / allVisitors.length / 1000).toFixed(1))
              : 0,
            uniqueVisitors: uniqueVisitorsSet.size,
            topProducts: analytics.topProducts?.slice(0, 5).map(p => ({
              itemId: p.itemId,
              title: p.itemTitle,
              views: p.totalViews,
              avgTime: p.averageViewDurationSeconds
            })) || [],
            visitorsData: allVisitors
          });
        }
      } catch (error) {
        console.error('Failed to load traffic data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficData();
  }, [activePersona?.id]);

  if (loading) {
    return <DashboardPageLoader title="Loading traffic analytics..." />;
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex items-center gap-4">
        <BackButton to="/store/manager/analytics" alwaysShowText />
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Traffic Analytics</h1>
          <p className="text-sm text-[#666] mt-1">Detailed insights about your store traffic and visitor behavior</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Total Views</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.totalViews.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#727272]">All-time product views</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Unique Visitors</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.uniqueVisitors.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#727272]">Individual visitors</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Avg. Time on Site</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.averageTimeOnSite}s</p>
          <p className="mt-1 text-xs text-[#727272]">Average session duration</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Top Performing Products</h2>
        {data.topProducts.length > 0 ? (
          <div className="space-y-3">
            {data.topProducts.map((product, idx) => (
              <div
                key={product.itemId}
                className="flex items-center justify-between p-4 rounded-lg bg-[#f7f7f7] border border-[#e0e0e0] hover:bg-white transition-colors cursor-pointer"
                onClick={() => navigate(`/item/${product.itemId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0fb9b1] flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1f1f1f]">{product.title}</p>
                    <p className="text-xs text-[#666]">Avg. {product.avgTime}s per view</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-[#0fb9b1]">{product.views} views</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No traffic data available yet</p>
          </div>
        )}
      </div>

      {/* Recent Visitors */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Recent Visitors</h2>
        {data.visitorsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0]">
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Visitor</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Time Spent</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.visitorsData.slice(0, 20).map((visitor, idx) => (
                  <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f7f7f7]">
                    <td className="px-4 py-3">{visitor.visitorName}</td>
                    <td className="px-4 py-3 text-[#0fb9b1]">{visitor.itemId?.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{(visitor.durationMs / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3 text-[#666]">{new Date(visitor.viewedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No visitor data yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficAnalyticsPage;
