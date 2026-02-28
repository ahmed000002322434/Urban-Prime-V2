import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const DotIcon = () => <span className="inline-block h-2 w-2 rounded-full bg-current" />;

const SetupStepCard: React.FC<{
  title: string;
  status: string;
  statusTone: 'ok' | 'pending';
  body: string;
  actionLabel: string;
  actionTo: string;
}> = ({ title, status, statusTone, body, actionLabel, actionTo }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-soft p-4 shadow-soft">
    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-90" />
    <div className="mb-3 flex items-start justify-between gap-2">
      <h3 className="text-lg font-semibold leading-6 text-text-primary">{title}</h3>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          statusTone === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
        }`}
      >
        <DotIcon />
        {status}
      </span>
    </div>
    <p className="text-sm text-text-secondary">{body}</p>
    <Link
      to={actionTo}
      className="mt-4 inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-text-primary hover:bg-surface-soft"
    >
      {actionLabel}
    </Link>
  </div>
);

const OverviewStat: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  to: string;
}> = ({ label, value, subtext, to }) => (
  <Link to={to} className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-soft">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
    <p className="mt-2 text-[23px] font-semibold leading-none text-text-primary sm:text-[30px]">{value}</p>
    {subtext ? <p className="mt-1 text-xs text-text-secondary">{subtext}</p> : null}
  </Link>
);

const EmptyChartState: React.FC<{ title: string; body: string; ctaLabel: string; ctaTo: string }> = ({
  title,
  body,
  ctaLabel,
  ctaTo
}) => (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d8d8d8] bg-[#fafafa] p-6 text-center">
    <p className="text-base font-semibold text-[#1f1f1f]">{title}</p>
    <p className="mt-2 text-sm text-[#666]">{body}</p>
    <Link
      to={ctaTo}
      className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#cfcfcf] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f6f6f6]"
    >
      {ctaLabel}
    </Link>
  </div>
);

const WorkspaceAction: React.FC<{ to: string; title: string; body: string }> = ({ to, title, body }) => (
  <Link to={to} className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-soft">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl opacity-80" />
    <p className="text-base font-semibold text-text-primary">{title}</p>
    <p className="mt-1 text-sm text-text-secondary">{body}</p>
  </Link>
);

const DashboardHero: React.FC<{ title: string; subtitle: string; chips: string[] }> = ({ title, subtitle, chips }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-soft p-5 shadow-soft">
    <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
    <div className="relative">
      <h2 className="text-2xl font-black tracking-tight text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            {chip}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const defaultBuyerSnapshot: BuyerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeRentals: 0,
    upcomingReturns: 0,
    totalPurchases: 0,
    wishlistItems: 0,
    unreadNotifications: 0,
    conversations: 0
  },
  recentOrders: [],
  upcomingReturns: []
};

const defaultSellerSnapshot: SellerDashboardSnapshot = {
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

const DashboardOverview: React.FC = () => {
  const { user, activePersona, hasCapability } = useAuth();
  const navigate = useNavigate();

  const [buyerSnapshot, setBuyerSnapshot] = useState<BuyerDashboardSnapshot>(defaultBuyerSnapshot);
  const [sellerSnapshot, setSellerSnapshot] = useState<SellerDashboardSnapshot>(defaultSellerSnapshot);
  const [insights, setInsights] = useState<GrowthInsight[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSellerWorkspace = activePersona?.type === 'seller' || hasCapability('sell');
  const isProviderWorkspace = activePersona?.type === 'provider' || hasCapability('provide_service');
  const isAffiliateWorkspace = activePersona?.type === 'affiliate' || hasCapability('affiliate');
  const isConsumerWorkspace = !isSellerWorkspace && !isProviderWorkspace && !isAffiliateWorkspace;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      if (isSellerWorkspace) {
        const snapshot = await dashboardService.getSellerDashboardSnapshot(8);
        setSellerSnapshot(snapshot);
        setInsights(snapshot.insights || []);
        setBuyerSnapshot(defaultBuyerSnapshot);
      } else {
        const snapshot = await dashboardService.getBuyerDashboardSnapshot(8);
        setBuyerSnapshot(snapshot);
        setSellerSnapshot(defaultSellerSnapshot);
        setInsights([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load dashboard data.');
      setBuyerSnapshot(defaultBuyerSnapshot);
      setSellerSnapshot(defaultSellerSnapshot);
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSellerWorkspace, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const earningsData = useMemo<SellerDashboardEarningsPoint[]>(
    () => sellerSnapshot.earningsByMonth,
    [sellerSnapshot.earningsByMonth]
  );

  const pieData = useMemo<SellerDashboardCategoryPoint[]>(() => sellerSnapshot.categorySales, [sellerSnapshot.categorySales]);

  if (isLoading) {
    return <DashboardPageLoader title="Loading dashboard overview..." />;
  }

  if (!user) return null;

  if (isConsumerWorkspace) {
    const summary = buyerSnapshot.summary;

    return (
      <div className="dashboard-page space-y-4">
        <DashboardHero
          title="Consumer dashboard"
          subtitle="Track orders, rentals, saved products, and conversations from one place."
          chips={[
            `${summary.pendingOrders} pending`,
            `${summary.wishlistItems} wishlist`,
            `${summary.conversations} chats`
          ]}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <SetupStepCard
            title="Complete your profile"
            status={user.phone && user.country && user.city ? 'Complete' : 'Pending'}
            statusTone={user.phone && user.country && user.city ? 'ok' : 'pending'}
            body="Keep your contact and profile info current so checkout and support work without issues."
            actionLabel="Open profile"
            actionTo="/profile/settings"
          />
          <SetupStepCard
            title="Review active orders"
            status={summary.pendingOrders === 0 ? 'Clear' : 'Needs action'}
            statusTone={summary.pendingOrders === 0 ? 'ok' : 'pending'}
            body="Track purchases and rentals, including return timelines and order states."
            actionLabel="Open orders"
            actionTo="/profile/orders"
          />
          <SetupStepCard
            title="Personalize your feed"
            status={summary.wishlistItems > 0 ? 'Configured' : 'Pending'}
            statusTone={summary.wishlistItems > 0 ? 'ok' : 'pending'}
            body="Add wishlist items and follow stores to improve recommendations."
            actionLabel="Manage wishlist"
            actionTo="/profile/wishlist"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewStat label="Total Orders" value={summary.totalOrders} subtext={`${summary.completedOrders} completed`} to="/profile/orders" />
          <OverviewStat label="Pending Orders" value={summary.pendingOrders} subtext="Needs review" to="/profile/orders" />
          <OverviewStat label="Active Rentals" value={summary.activeRentals} subtext="Current bookings" to="/profile/orders" />
          <OverviewStat label="Wishlist" value={summary.wishlistItems} subtext="Saved products" to="/profile/wishlist" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
            <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Upcoming returns</h3>
            <div className="mt-3 space-y-2">
              {buyerSnapshot.upcomingReturns.length > 0 ? (
                buyerSnapshot.upcomingReturns.map((entry) => (
                  <Link key={entry.orderItemId} to={`/profile/orders/${entry.orderId}`} className="block rounded-lg border border-[#e1e1e1] p-3 hover:bg-[#f8f8f8]">
                    <p className="text-sm font-semibold text-[#1f1f1f]">{entry.itemTitle}</p>
                    <p className="mt-1 text-xs text-[#666]">Due {new Date(entry.rentalEnd).toLocaleDateString()} | Qty {entry.quantity}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#d8d8d8] p-3 text-sm text-[#666]">No returns due in the next 7 days.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
            <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Recent orders</h3>
            <div className="mt-3 space-y-2">
              {buyerSnapshot.recentOrders.length > 0 ? (
                buyerSnapshot.recentOrders.map((order) => (
                  <Link key={order.id} to={`/profile/orders/${order.id}`} className="block rounded-lg border border-[#e1e1e1] p-3 hover:bg-[#f8f8f8]">
                    <p className="text-sm font-semibold text-[#1f1f1f]">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-[#666]">
                      {new Date(order.createdAt).toLocaleDateString()} | {order.quantityTotal} qty | {order.currency} {order.total.toFixed(2)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#d8d8d8] p-3 text-sm text-[#666]">No recent orders found yet.</p>
              )}
            </div>
          </div>
        </div>

        {loadError ? <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
      </div>
    );
  }

  if (!isSellerWorkspace) {
    const summary = buyerSnapshot.summary;

    return (
      <div className="dashboard-page space-y-4">
        <DashboardHero
          title={isProviderWorkspace ? 'Provider workspace' : 'Affiliate workspace'}
          subtitle="Use these actions to manage your workflow, availability, and conversion pipeline."
          chips={[
            `${summary.totalOrders} orders`,
            `${summary.conversations} chats`,
            `${summary.wishlistItems} saved products`
          ]}
        />

        <div className="grid gap-3 md:grid-cols-2">
          {isProviderWorkspace ? (
            <>
              <WorkspaceAction to="/profile/provider-dashboard" title="Provider dashboard" body="Manage service listings, leads, and requests." />
              <WorkspaceAction to="/profile/services/new" title="List a service" body="Create a new service offer with pricing and delivery details." />
            </>
          ) : null}
          {isAffiliateWorkspace ? (
            <WorkspaceAction to="/profile/affiliate" title="Affiliate dashboard" body="Track referral performance and commission activity." />
          ) : null}
          <WorkspaceAction to="/profile/switch-accounts" title="Switch workspace" body="Move to another persona to access the right tools." />
          <WorkspaceAction to="/profile/settings" title="Profile settings" body="Update account details, preferences, and verification." />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewStat label="Total Orders" value={summary.totalOrders} subtext={`${summary.completedOrders} completed`} to="/profile/orders" />
          <OverviewStat label="Pending Orders" value={summary.pendingOrders} subtext="Needs review" to="/profile/orders" />
          <OverviewStat label="Wishlist" value={summary.wishlistItems} subtext="Saved products" to="/profile/wishlist" />
          <OverviewStat label="Conversations" value={summary.conversations} subtext="Messages and threads" to="/profile/messages" />
        </div>

        {loadError ? <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
      </div>
    );
  }

  const sellerSummary = sellerSnapshot.summary;
  const attentionCount = sellerSummary.pendingOrders + sellerSummary.unreadMessages + sellerSummary.lowStockCount;

  return (
    <div className="dashboard-page space-y-4">
      <DashboardHero
        title="Seller command center"
        subtitle="Monitor revenue, operations, inventory, and inbox signals in real time."
        chips={[
          `${sellerSummary.pendingOrders} pending orders`,
          `${sellerSummary.unreadMessages} unread messages`,
          `${sellerSummary.lowStockCount} low stock`
        ]}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <SetupStepCard
          title="Store setup"
          status={sellerSnapshot.setup.hasStore ? 'Configured' : 'Pending'}
          statusTone={sellerSnapshot.setup.hasStore ? 'ok' : 'pending'}
          body={
            sellerSnapshot.setup.hasStore
              ? 'Store is connected and ready for catalog management.'
              : 'Create your store profile to unlock storefront and branded pages.'
          }
          actionLabel={sellerSnapshot.setup.hasStore ? 'Manage store' : 'Set up store'}
          actionTo="/profile/store"
        />
        <SetupStepCard
          title="Product catalog"
          status={sellerSnapshot.setup.hasProducts ? 'Live' : 'Empty'}
          statusTone={sellerSnapshot.setup.hasProducts ? 'ok' : 'pending'}
          body={
            sellerSnapshot.setup.hasProducts
              ? 'Catalog is active. Continue adding products and variants.'
              : 'Add your first product to start collecting traffic and orders.'
          }
          actionLabel={sellerSnapshot.setup.hasProducts ? 'Manage products' : 'Add product'}
          actionTo={sellerSnapshot.setup.hasProducts ? '/profile/products' : '/profile/products/new'}
        />
        <SetupStepCard
          title="Operations"
          status={attentionCount > 0 ? 'Needs action' : 'Healthy'}
          statusTone={attentionCount > 0 ? 'pending' : 'ok'}
          body={`${sellerSummary.pendingOrders} pending orders, ${sellerSummary.unreadMessages} unread messages, ${sellerSummary.lowStockCount} low-stock items.`}
          actionLabel="Open inbox"
          actionTo="/profile/messages"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStat
          label="Store Status"
          value={sellerSnapshot.setup.hasStore ? 'Healthy' : 'Setup pending'}
          subtext={sellerSnapshot.setup.hasStore ? 'No blockers' : 'Store not configured'}
          to="/profile/store"
        />
        <OverviewStat label="Total Earnings" value={`$${sellerSummary.totalRevenue.toLocaleString()}`} subtext="All time" to="/profile/earnings" />
        <OverviewStat label="Total Sales" value={sellerSummary.totalSalesUnits} subtext="Units sold" to="/profile/sales" />
        <OverviewStat label="Pending Orders" value={sellerSummary.pendingOrders} subtext="Requires action" to="/profile/sales" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Earnings overview</h3>
          <div className="mt-4 h-[280px] w-full">
            {earningsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                title="No earnings data yet"
                body="Publish products and complete orders to populate revenue analytics."
                ctaLabel="Add product"
                ctaTo="/profile/products/new"
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
          <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Sales by category</h3>
          <div className="mt-4 h-[280px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                title="No category sales yet"
                body="Category insights appear after your first completed orders."
                ctaLabel="Manage catalog"
                ctaTo="/profile/products"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <SellerActionCenter
          pendingShipments={sellerSummary.pendingOrders}
          lowStockItems={sellerSnapshot.lowStockItems}
          unreadMessages={sellerSummary.unreadMessages}
        />
        <AIGrowthInsights insights={insights} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStat label="Conversion Rate" value={`${sellerSummary.conversionRate.toFixed(1)}%`} subtext="Performance" to="/profile/analytics/advanced" />
        <OverviewStat label="Low Stock" value={sellerSummary.lowStockCount} subtext="Catalog alerts" to="/profile/products" />
        <OverviewStat label="Unread Messages" value={sellerSummary.unreadMessages} subtext="Inbox" to="/profile/messages" />
        <OverviewStat label="Total Views" value={sellerSummary.totalViews} subtext="Store traffic" to="/profile/analytics/advanced" />
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => navigate('/profile/products/new')} className="h-9 rounded-lg border border-[#c9c9c9] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f8f8f8]">
            List new item
          </button>
          <button onClick={() => navigate('/profile/sales')} className="h-9 rounded-lg border border-[#c9c9c9] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f8f8f8]">
            View orders
          </button>
          <button onClick={() => navigate('/profile/promotions')} className="h-9 rounded-lg border border-[#c9c9c9] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f8f8f8]">
            Run promotion
          </button>
          <button onClick={() => navigate('/profile/messages')} className="h-9 rounded-lg border border-[#c9c9c9] bg-white px-3 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f8f8f8]">
            Open inbox
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h3 className="text-[20px] font-semibold text-[#1f1f1f]">Recent orders</h3>
        <div className="mt-3 space-y-2">
          {sellerSnapshot.recentOrders.length > 0 ? (
            sellerSnapshot.recentOrders.map((order) => (
              <Link key={order.id} to="/profile/sales" className="block rounded-lg border border-[#e1e1e1] p-3 hover:bg-[#f8f8f8]">
                <p className="text-sm font-semibold text-[#1f1f1f]">Order #{order.id.slice(0, 8)}</p>
                <p className="mt-1 text-xs text-[#666]">
                  {new Date(order.createdAt).toLocaleDateString()} | {order.quantityTotal} qty | {order.currency} {order.total.toFixed(2)}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-[#d8d8d8] p-3 text-sm text-[#666]">No recent orders available yet.</p>
          )}
        </div>
      </div>

      {loadError ? <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
    </div>
  );
};

export default DashboardOverview;
