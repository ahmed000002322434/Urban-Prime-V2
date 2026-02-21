import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import BackButton from '../../components/BackButton';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const ConversionAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overallConversion: 0,
    cartAdditionRate: 0,
    checkoutCompletionRate: 0,
    totalViews: 0,
    cartAdditions: 0,
    checkouts: 0,
    productConversions: [] as Array<{
      itemId: string;
      title: string;
      conversionRate: number;
      views: number;
      carts: number;
      checkouts: number;
    }>,
    funnelData: [] as Array<{ stage: string; count: number; percentage: number }>
  });

  useEffect(() => {
    const fetchConversionData = async () => {
      if (!activePersona?.id) {
        setLoading(false);
        return;
      }

      try {
        const analytics = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        
        if (analytics) {
          const totalViews = analytics.totalViews;
          const cartAdditions = analytics.totalCartAdds;
          const checkouts = analytics.completedCheckouts;

          const conversionRate = totalViews > 0 ? (checkouts / totalViews) * 100 : 0;
          const cartRate = totalViews > 0 ? (cartAdditions / totalViews) * 100 : 0;
          const checkoutRate = cartAdditions > 0 ? (checkouts / cartAdditions) * 100 : 0;

          const productConversions = analytics.topProducts?.map(p => ({
            itemId: p.itemId,
            title: p.itemTitle,
            conversionRate: p.totalViews > 0 ? (p.totalCheckouts / p.totalViews) * 100 : 0,
            views: p.totalViews,
            carts: p.totalCartAdds,
            checkouts: p.totalCheckouts
          })) || [];

          const funnelData = [
            { stage: 'Viewed', count: totalViews, percentage: 100 },
            { stage: 'Added to Cart', count: cartAdditions, percentage: cartRate },
            { stage: 'Checked Out', count: checkouts, percentage: conversionRate }
          ];

          setData({
            overallConversion: conversionRate,
            cartAdditionRate: cartRate,
            checkoutCompletionRate: checkoutRate,
            totalViews,
            cartAdditions,
            checkouts,
            productConversions,
            funnelData
          });
        }
      } catch (error) {
        console.error('Failed to load conversion data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversionData();
  }, [activePersona?.id]);

  if (loading) {
    return <DashboardPageLoader title="Loading conversion analytics..." />;
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex items-center gap-4">
        <BackButton to="/store/manager/analytics" alwaysShowText />
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Conversion Analytics</h1>
          <p className="text-sm text-[#666] mt-1">Analyze your sales funnel and conversion metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Overall Conversion</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.overallConversion.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Views to checkout</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Cart Addition Rate</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.cartAdditionRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Views to cart</p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">Checkout Completion</p>
          <p className="mt-3 text-4xl font-bold text-[#1f1f1f]">{data.checkoutCompletionRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-[#727272]">Cart to checkout</p>
        </div>
      </div>

      {/* Sales Funnel */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-6">Sales Funnel</h2>
        <div className="space-y-4">
          {data.funnelData.map((stage, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1f1f1f]">{stage.stage}</p>
                <p className="text-sm text-[#666]">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</p>
              </div>
              <div className="h-10 rounded-lg bg-[#f0f0f0] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f39c12] to-[#ec4899] transition-all flex items-center justify-end pr-3"
                  style={{ width: `${stage.percentage}%` }}
                >
                  {stage.percentage > 15 && (
                    <span className="text-white font-bold text-sm">{stage.percentage.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#666] mt-6">
          ℹ️ Each stage represents the percentage of users who progressed from the previous stage
        </p>
      </div>

      {/* Product Conversion Rates */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Product Conversion Rates</h2>
        {data.productConversions.length > 0 ? (
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
                {data.productConversions.slice(0, 20).map((product, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-[#f0f0f0] hover:bg-[#f7f7f7] cursor-pointer"
                    onClick={() => navigate(`/item/${product.itemId}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1f1f1f]">{product.title}</td>
                    <td className="px-4 py-3">{product.views}</td>
                    <td className="px-4 py-3">{product.carts}</td>
                    <td className="px-4 py-3">{product.checkouts}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-[#e0e0e0] overflow-hidden">
                          <div
                            className="h-full bg-[#8b5cf6]"
                            style={{ width: `${Math.min(product.conversionRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#8b5cf6]">{product.conversionRate.toFixed(1)}%</span>
                      </div>
                    </td>
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

      {/* Insights */}
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Key Insights</h2>
        <div className="space-y-3">
          {data.overallConversion > 5 ? (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-800">
                ✓ Your conversion rate of {data.overallConversion.toFixed(2)}% is strong. Keep optimizing product descriptions!
              </p>
            </div>
          ) : data.overallConversion > 0 ? (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠ Your conversion rate is {data.overallConversion.toFixed(2)}%. Focus on improving product images and descriptions.
              </p>
            </div>
          ) : null}

          {data.checkoutCompletionRate < 50 && data.cartAdditions > 0 ? (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠ {((100 - data.checkoutCompletionRate).toFixed(1))}% of cart additions are abandoned. Consider optimizing checkout process.
              </p>
            </div>
          ) : null}

          {data.totalViews > 0 && data.cartAdditions === 0 ? (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠ No cart additions yet. Consider reviewing your pricing and product appeal.
              </p>
            </div>
          ) : null}

          {data.totalViews === 0 ? (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                ℹ No traffic yet. Share your store link to get started!
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ConversionAnalyticsPage;
