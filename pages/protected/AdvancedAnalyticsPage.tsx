import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import analyticsService from '../../services/analyticsService';
import type { SellerDashboardSnapshot } from '../../types';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';

const COLORS = ['#0fb9b1', '#3b82f6', '#f39c12', '#ec4899', '#8b5cf6', '#22c55e'];

const defaultSnapshot: SellerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSalesUnits: 0,
    totalViews: 0,
    conversionRate: 0,
    lowStockCount: 0,
    unreadMessages: 0
  },
  earningsByMonth: [],
  categorySales: [],
  recentOrders: [],
  lowStockItems: [],
  insights: [],
  setup: {
    hasStore: false,
    hasProducts: false,
    hasContent: false,
    hasApps: false
  }
};

const MetricCard: React.FC<{ label: string; value: string | number; helper: string; onClick?: () => void }> = ({ label, value, helper, onClick }) => (
  <div 
    onClick={onClick}
    className="rounded-xl border border-[#d8d8d8] bg-white p-4 cursor-pointer hover:shadow-lg transition-all hover:border-[#0fb9b1]"
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a6a6a]">{label}</p>
    <p className="mt-2 text-[22px] font-semibold leading-none text-[#1f1f1f] sm:text-[28px]">{value}</p>
    <p className="mt-1 text-xs text-[#727272]">{helper}</p>
  </div>
);

const EmptyPanel: React.FC<{ title: string; body: string; actionLabel: string; actionTo: string }> = ({
  title,
  body,
  actionLabel,
  actionTo
}) => (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d8d8d8] bg-[#fafafa] p-6 text-center">
    <p className="text-base font-semibold text-[#1f1f1f]">{title}</p>
    <p className="mt-2 text-sm text-[#666]">{body}</p>
    <Link
      to={actionTo}
      className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#cfcfcf] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f6f6f6]"
    >
      {actionLabel}
    </Link>
  </div>
);

const AdvancedAnalyticsPage: React.FC = () => {
  const { activePersona, hasCapability } = useAuth();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<SellerDashboardSnapshot>(defaultSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const isSellerWorkspace = activePersona?.type === 'seller' || hasCapability('sell');

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      if (!isSellerWorkspace || !activePersona?.id) {
        setSnapshot(defaultSnapshot);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        // Try to get real analytics data first
        const analyticsData = await analyticsService.getSellerAnalytics(activePersona.id, 30);
        
        if (analyticsData && !cancelled) {
          // Transform analytics data into snapshot format
          const transformedSnapshot: SellerDashboardSnapshot = {
            generatedAt: new Date().toISOString(),
            summary: {
              totalRevenue: analyticsData.totalRevenue,
              pendingOrders: analyticsData.pendingOrders,
              completedOrders: analyticsData.completedOrders,
              totalSalesUnits: analyticsData.completedCheckouts,
              totalViews: analyticsData.totalViews,
              conversionRate: analyticsData.conversionRate,
              lowStockCount: 0,
              unreadMessages: 0
            },
            earningsByMonth: analyticsData.revenueTrend.map((trend) => ({
              month: trend.label,
              earnings: trend.value
            })),
            categorySales: (analyticsData.topProducts || []).slice(0, 6).map((product) => ({
              category: product.itemTitle,
              value: Number(product.revenue || 0)
            })),
            recentOrders: (analyticsData.recentOrders || []).slice(0, 40).map((order) => ({
              id: order.id,
              status: order.status,
              total: order.total,
              currency: order.currency || 'USD',
              createdAt: order.createdAt,
              itemCount: order.itemCount || 1,
              quantityTotal: order.quantityTotal || 1
            })),
            lowStockItems: [],
            insights: (analyticsData.recommendations || analyticsData.insights || []).slice(0, 8).map((insight: any) => ({
              id: insight.id || `insight-${Math.random()}`,
              type: (insight.type === 'pricing' || insight.type === 'inventory' || insight.type === 'marketing')
                ? insight.type
                : (insight.type === 'channel' ? 'marketing' : insight.type === 'checkout' ? 'pricing' : 'inventory'),
              message: insight.message || insight.summary || 'Optimization insight available.',
              actionLabel: 'Review',
              actionLink: '/store/manager/analytics'
            })),
            setup: {
              hasStore: true,
              hasProducts: true,
              hasContent: true,
              hasApps: true
            }
          };
          
          setSnapshot(transformedSnapshot);
        } else if (!cancelled) {
          // Fallback to dashboard service if analytics service fails
          const response = await dashboardService.getSellerDashboardSnapshot(20);
          setSnapshot(response);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Analytics loading error:', error);
          // Fallback to dashboard service
          try {
            const response = await dashboardService.getSellerDashboardSnapshot(20);
            setSnapshot(response);
          } catch (fallbackError) {
            setLoadError(fallbackError instanceof Error ? fallbackError.message : 'Unable to load analytics.');
            setSnapshot(defaultSnapshot);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [isSellerWorkspace, activePersona?.id, refreshTick]);

  useEffect(() => {
    if (!isSellerWorkspace || !activePersona?.id) return;

    let refreshTimer: number | undefined;
    const unsubscribe = analyticsService.subscribeSellerStream(
      activePersona.id,
      (event) => {
        if (event.event !== 'analytics') return;
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          setRefreshTick((value) => value + 1);
        }, 600);
      },
      (error) => {
        console.warn('Advanced analytics stream warning:', error);
      }
    );

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [isSellerWorkspace, activePersona?.id]);

  const summary = snapshot.summary;

  const ordersByStatus = useMemo(
    () => [
      { status: 'Pending', value: summary.pendingOrders },
      { status: 'Completed', value: summary.completedOrders }
    ],
    [summary.completedOrders, summary.pendingOrders]
  );

  const handleExportCsv = () => {
    const header = ['order_id', 'status', 'currency', 'total', 'quantity_total', 'created_at'];
    const rows = snapshot.recentOrders.map((order) => [
      order.id,
      order.status,
      order.currency,
      String(order.total),
      String(order.quantityTotal),
      order.createdAt
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seller-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <DashboardPageLoader title="Loading advanced analytics..." />;
  }

  if (!isSellerWorkspace) {
    return (
      <div className="dashboard-page space-y-4">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-5">
          <h1 className="text-2xl font-semibold text-[#1f1f1f]">Advanced analytics</h1>
          <p className="mt-2 text-sm text-[#666]">Analytics is available in seller workspace after you enable selling and set up your store.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/profile/switch-accounts" className="inline-flex h-9 items-center rounded-lg border border-[#cfcfcf] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f6f6f6]">
              Switch workspace
            </Link>
            <Link to="/profile/store" className="inline-flex h-9 items-center rounded-lg border border-[#cfcfcf] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f6f6f6]">
              Store setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#d8d8d8] bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f1f1f]">Advanced analytics</h1>
          <p className="mt-1 text-sm text-[#666]">Real-time metrics sourced from your store, products, and order activity.</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex h-9 items-center rounded-lg border border-[#cfcfcf] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f6f6f6]"
        >
          Export recent orders CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          label="Revenue" 
          value={`$${summary.totalRevenue.toLocaleString()}`} 
          helper="All-time seller revenue"
          onClick={() => navigate('/store/manager/analytics/revenue')}
        />
        <MetricCard 
          label="Sales Units" 
          value={summary.totalSalesUnits} 
          helper="Units sold across all orders"
          onClick={() => navigate('/store/manager/analytics/sales-units')}
        />
        <MetricCard 
          label="Conversion" 
          value={`${summary.conversionRate.toFixed(1)}%`} 
          helper="Orders completed vs product views"
          onClick={() => navigate('/store/manager/analytics/conversion')}
        />
        <MetricCard 
          label="Traffic" 
          value={summary.totalViews} 
          helper="Total listing and store views"
          onClick={() => navigate('/store/manager/analytics/traffic')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Revenue trend</h3>
          <div className="mt-4 h-[300px] w-full">
            {snapshot.earningsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.earningsByMonth}>
                  <defs>
                    <linearGradient id="analyticsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} fill="url(#analyticsRevenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                title="No revenue data"
                body="Complete orders to populate monthly revenue trend."
                actionLabel="Manage products"
                actionTo="/profile/products"
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Order status</h3>
          <div className="mt-4 h-[300px] w-full">
            {(summary.pendingOrders > 0 || summary.completedOrders > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                title="No order volume yet"
                body="Orders will appear here after the first successful checkout."
                actionLabel="Open store"
                actionTo="/profile/store"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Category performance</h3>
          <div className="mt-4 h-[300px] w-full">
            {snapshot.categorySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={snapshot.categorySales} dataKey="value" nameKey="category" innerRadius={58} outerRadius={90} paddingAngle={3}>
                    {snapshot.categorySales.map((entry, index) => (
                      <Cell key={`category-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                title="No category data"
                body="Category split appears once your products receive completed sales."
                actionLabel="Add product"
                actionTo="/profile/products/new"
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Operational alerts</h3>
          <div className="mt-3 space-y-2">
            <Link to="/profile/sales" className="flex items-center justify-between rounded-lg border border-[#dddddd] bg-[#f7f7f7] px-3 py-3 hover:bg-white">
              <div>
                <p className="text-sm font-semibold text-[#1f1f1f]">Pending orders</p>
                <p className="text-xs text-[#666]">Fulfillment required</p>
              </div>
              <span className="rounded-full bg-[#111111] px-2 py-1 text-xs font-semibold text-white">{summary.pendingOrders}</span>
            </Link>
            <Link to="/profile/products" className="flex items-center justify-between rounded-lg border border-[#dddddd] bg-[#f7f7f7] px-3 py-3 hover:bg-white">
              <div>
                <p className="text-sm font-semibold text-[#1f1f1f]">Low stock items</p>
                <p className="text-xs text-[#666]">Restock products</p>
              </div>
              <span className="rounded-full bg-[#111111] px-2 py-1 text-xs font-semibold text-white">{summary.lowStockCount}</span>
            </Link>
            <Link to="/profile/messages" className="flex items-center justify-between rounded-lg border border-[#dddddd] bg-[#f7f7f7] px-3 py-3 hover:bg-white">
              <div>
                <p className="text-sm font-semibold text-[#1f1f1f]">Unread messages</p>
                <p className="text-xs text-[#666]">Buyer and lead inbox</p>
              </div>
              <span className="rounded-full bg-[#111111] px-2 py-1 text-xs font-semibold text-white">{summary.unreadMessages}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Recent orders</h3>
        <div className="mt-3 overflow-x-auto">
          {snapshot.recentOrders.length > 0 ? (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e3e3e3] text-xs uppercase tracking-[0.1em] text-[#6a6a6a]">
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#f0f0f0]">
                    <td className="px-2 py-2 font-medium text-[#1f1f1f]">#{order.id.slice(0, 8)}</td>
                    <td className="px-2 py-2 text-[#555]">{order.status}</td>
                    <td className="px-2 py-2 text-[#555]">{order.quantityTotal}</td>
                    <td className="px-2 py-2 text-[#555]">{order.currency} {order.total.toFixed(2)}</td>
                    <td className="px-2 py-2 text-[#555]">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyPanel
              title="No recent orders"
              body="Recent order analytics will appear here once sales begin."
              actionLabel="Go to products"
              actionTo="/profile/products"
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h3 className="text-[20px] font-semibold text-[#1f1f1f]">AI recommendations</h3>
        <div className="mt-3 space-y-2">
          {snapshot.insights.length > 0 ? (
            snapshot.insights.map((insight) => (
              <Link
                key={insight.id}
                to={insight.actionLink || '/store/manager/analytics'}
                className="block rounded-lg border border-[#dddddd] bg-[#f7f7f7] px-3 py-3 text-sm text-[#1f1f1f] hover:bg-white"
              >
                {insight.message}
              </Link>
            ))
          ) : (
            <EmptyPanel
              title="No recommendations yet"
              body="Actionable insights will appear as traffic and order patterns evolve."
              actionLabel="Refresh analytics"
              actionTo="/store/manager/analytics"
            />
          )}
        </div>
      </div>

      {loadError ? <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
    </div>
  );
};

export default AdvancedAnalyticsPage;
