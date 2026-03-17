import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import BackButton from '../../components/BackButton';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const ConversionAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!activePersona?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snapshot = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        if (!cancelled) setAnalytics(snapshot);
      } catch (error) {
        console.error('Failed to load conversion analytics:', error);
        if (!cancelled) setAnalytics(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activePersona?.id]);

  const funnel = analytics?.funnel?.stages || [
    { stage: 'Viewed', count: analytics?.totalViews || 0, percentage: 100 },
    { stage: 'Added to Cart', count: analytics?.totalCartAdds || 0, percentage: analytics?.totalViews ? ((analytics.totalCartAdds / analytics.totalViews) * 100) : 0 },
    { stage: 'Checked Out', count: analytics?.completedCheckouts || 0, percentage: analytics?.totalViews ? ((analytics.completedCheckouts / analytics.totalViews) * 100) : 0 }
  ];

  const topProducts = useMemo(() => {
    return (analytics?.topProducts || []).map((product: any) => ({
      itemId: product.itemId,
      title: product.itemTitle,
      views: product.totalViews,
      carts: product.totalCartAdds,
      checkouts: product.totalCheckouts,
      conversionRate: product.totalViews > 0 ? (product.totalCheckouts / product.totalViews) * 100 : 0
    }));
  }, [analytics]);

  if (loading) return <DashboardPageLoader title="Loading conversion analytics..." />;

  const eventBased = analytics?.conversionRateEventBased ?? analytics?.conversionRate ?? 0;
  const visitorBased = analytics?.conversionRateVisitorBased ?? eventBased;
  const cartRate = analytics?.totalViews ? ((analytics.totalCartAdds / analytics.totalViews) * 100) : 0;
  const checkoutRate = analytics?.totalCartAdds ? ((analytics.completedCheckouts / analytics.totalCartAdds) * 100) : 0;

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex items-center gap-4">
        <BackButton to="/store/manager/analytics" alwaysShowText />
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Conversion Analytics</h1>
          <p className="text-sm text-[#666] mt-1">Event and visitor conversion intelligence with live funnel stage drop-off.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Event Conversion</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{eventBased.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Completed checkouts / views</p>
        </div>
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Visitor Conversion</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{visitorBased.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Unique buyers / unique visitors</p>
        </div>
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Cart Completion</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{checkoutRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Checkout completed / cart adds</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-6">Live Funnel</h2>
        <div className="space-y-4">
          {funnel.map((stage: any) => (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1f1f1f]">{stage.stage}</p>
                <p className="text-sm text-[#666]">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</p>
              </div>
              <div className="h-10 rounded-lg bg-[#f0f0f0] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0fb9b1] to-[#3b82f6] transition-all flex items-center justify-end pr-3"
                  style={{ width: `${Math.min(stage.percentage, 100)}%` }}
                >
                  {stage.percentage > 15 ? (
                    <span className="text-white font-bold text-sm">{stage.percentage.toFixed(1)}%</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#666] mt-6">
          Cart addition rate: {cartRate.toFixed(2)}% • Largest drop-off stage: {analytics?.funnel?.dropOffStage || 'N/A'} ({(analytics?.funnel?.dropOffRate || 0).toFixed(1)}%)
        </p>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Product Conversion Rates</h2>
        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0]">
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Views</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Added to Cart</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Checkouts</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#666]">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 20).map((product) => (
                  <tr
                    key={product.itemId}
                    className="border-b border-[#f0f0f0] hover:bg-[#f7f7f7] cursor-pointer"
                    onClick={() => navigate(`/item/${product.itemId}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1f1f1f]">{product.title}</td>
                    <td className="px-4 py-3">{product.views}</td>
                    <td className="px-4 py-3">{product.carts}</td>
                    <td className="px-4 py-3">{product.checkouts}</td>
                    <td className="px-4 py-3 font-semibold text-[#0fb9b1]">{product.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#666]">
            <p>No conversion data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionAnalyticsPage;
