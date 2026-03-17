import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import analyticsService, { SellerAnalyticsDashboard } from '../../services/analyticsService';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const EMPTY: SellerAnalyticsDashboard = {
  totalRevenue: 0,
  totalOrders: 0,
  totalViews: 0,
  conversionRate: 0,
  averageOrderValue: 0,
  pendingOrders: 0,
  completedOrders: 0,
  returnedOrders: 0,
  topProducts: [],
  viewsTrend: [],
  ordersTrend: [],
  revenueTrend: [],
  cartAbandonmentRate: 0,
  totalCartAdds: 0,
  completedCheckouts: 0
};

const RANGE_TO_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 90
};

const StoreAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePersona } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SellerAnalyticsDashboard>(EMPTY);
  const [refreshTick, setRefreshTick] = useState(0);

  const daysBack = RANGE_TO_DAYS[timeRange] || 30;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!activePersona?.id) {
        setAnalytics(EMPTY);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snapshot = await analyticsService.getSellerAnalytics(activePersona.id, daysBack);
        if (!cancelled && snapshot) {
          setAnalytics(snapshot);
        } else if (!cancelled) {
          setAnalytics(EMPTY);
        }
      } catch (error) {
        console.error('Store analytics load failed:', error);
        if (!cancelled) setAnalytics(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activePersona?.id, daysBack, refreshTick]);

  useEffect(() => {
    if (!activePersona?.id) return;

    let pendingRefresh: number | undefined;
    const unsubscribe = analyticsService.subscribeSellerStream(
      activePersona.id,
      (message) => {
        if (message.event !== 'analytics' || !message.data?.type) return;
        if (pendingRefresh) window.clearTimeout(pendingRefresh);
        pendingRefresh = window.setTimeout(() => {
          setRefreshTick((value) => value + 1);
        }, 500);
      },
      (error) => {
        console.warn('Realtime analytics stream failed:', error);
      }
    );

    return () => {
      if (pendingRefresh) window.clearTimeout(pendingRefresh);
      unsubscribe();
    };
  }, [activePersona?.id]);

  const metrics = useMemo(() => ([
    { label: 'Revenue', value: `$${analytics.totalRevenue.toLocaleString()}`, helper: 'All order statuses' },
    { label: 'Orders', value: analytics.totalOrders.toLocaleString(), helper: 'All status orders' },
    { label: 'Conversion', value: `${(analytics.conversionRateEventBased ?? analytics.conversionRate ?? 0).toFixed(2)}%`, helper: 'Event-based conversion' },
    { label: 'Unique Visitors', value: (analytics.uniqueVisitors ?? 0).toLocaleString(), helper: 'Distinct traffic' },
    { label: 'Cart Abandonment', value: `${(analytics.cartAbandonmentRate ?? 0).toFixed(2)}%`, helper: 'Cart to checkout loss' },
    { label: 'Avg Order Value', value: `$${(analytics.averageOrderValue ?? 0).toFixed(2)}`, helper: 'Revenue per order' }
  ]), [analytics]);

  if (loading) {
    return <DashboardPageLoader title="Loading store analytics..." />;
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#1f1f1f]">Store analytics</h1>
            <p className="mt-1 text-sm text-[#666]">Realtime funnel, AI insights, attribution, and forecasting.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as 'week' | 'month' | 'quarter')}
              className="h-9 rounded-lg border border-[#cccccc] bg-white px-3 text-sm"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
            </select>
            <button
              type="button"
              onClick={() => navigate('/store/manager')}
              className="inline-flex h-9 items-center rounded-lg border border-[#cccccc] bg-white px-3 text-sm font-semibold hover:bg-[#f7f7f7]"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[#d8d8d8] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#1f1f1f]">{metric.value}</p>
            <p className="mt-1 text-xs text-[#727272]">{metric.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#1f1f1f]">Live funnel intelligence</h2>
          <div className="mt-4 space-y-3">
            {(analytics.funnel?.stages || []).map((stage) => (
              <div key={stage.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#1f1f1f]">{stage.stage}</span>
                  <span className="text-[#666]">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#ececec]">
                  <div className="h-2 rounded-full bg-[#0fb9b1]" style={{ width: `${Math.min(stage.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#666]">
            Largest drop-off stage: <span className="font-semibold text-[#1f1f1f]">{analytics.funnel?.dropOffStage || 'N/A'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#1f1f1f]">AI insights</h2>
          <div className="mt-3 space-y-2">
            {(analytics.insights || []).slice(0, 6).map((insight) => (
              <div key={insight.id} className="rounded-lg border border-[#e6e6e6] bg-[#fafafa] px-3 py-2 text-sm text-[#333]">
                {insight.message}
              </div>
            ))}
            {(analytics.insights || []).length === 0 ? (
              <div className="rounded-lg border border-[#e6e6e6] bg-[#fafafa] px-3 py-2 text-sm text-[#666]">
                No major anomalies detected in this range.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#1f1f1f]">Forecast (7/30/90 days)</h2>
          <div className="mt-3 space-y-2">
            {(analytics.forecasts || []).map((forecast) => (
              <div key={forecast.horizonDays} className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-sm">
                <p className="font-semibold text-[#1f1f1f]">{forecast.horizonDays}d • Confidence {(forecast.confidence * 100).toFixed(0)}%</p>
                <p className="text-[#666]">Revenue ${forecast.expectedRevenue.toFixed(0)} • Units {forecast.expectedUnits.toFixed(0)} • Views {forecast.expectedViews.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#1f1f1f]">Top products</h2>
          <div className="mt-3 space-y-2">
            {(analytics.topProducts || []).slice(0, 6).map((product) => (
              <button
                key={product.itemId}
                type="button"
                onClick={() => navigate(`/item/${product.itemId}`)}
                className="flex w-full items-center justify-between rounded-lg border border-[#e6e6e6] px-3 py-2 text-left hover:bg-[#f8f8f8]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1f1f1f]">{product.itemTitle}</p>
                  <p className="text-xs text-[#666]">{product.totalViews} views • {product.totalCheckouts} checkouts</p>
                </div>
                <p className="text-sm font-semibold text-[#1f1f1f]">${(product.revenue || 0).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h2 className="text-lg font-semibold text-[#1f1f1f]">Recent orders</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e3e3e3] text-left text-xs uppercase tracking-[0.1em] text-[#6a6a6a]">
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {(analytics.recentOrders || []).slice(0, 20).map((order) => (
                <tr key={order.id} className="border-b border-[#f0f0f0]">
                  <td className="px-2 py-2 font-medium text-[#1f1f1f]">#{order.id.slice(0, 8)}</td>
                  <td className="px-2 py-2 text-[#555]">{order.status}</td>
                  <td className="px-2 py-2 text-[#555]">{order.quantityTotal}</td>
                  <td className="px-2 py-2 text-[#555]">{order.currency} {order.total.toFixed(2)}</td>
                  <td className="px-2 py-2 text-[#555]">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(analytics.recentOrders || []).length === 0 ? (
                <tr>
                  <td className="px-2 py-6 text-center text-[#666]" colSpan={5}>No orders in this period.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsPage;
