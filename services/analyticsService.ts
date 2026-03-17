import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  QueryConstraint,
  getDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { backendFetch, isBackendConfigured, resolveBackendBaseUrl } from './backendClient';

// Get Firebase Auth token for backend requests
const getBackendToken = async (): Promise<string | undefined> => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const parseSseFrame = (frame: string): SellerAnalyticsStreamEvent | null => {
  if (!frame || !frame.trim()) return null;
  const lines = frame.split('\n');
  let event = 'message';
  let dataText = '';

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || 'message';
      return;
    }
    if (line.startsWith('data:')) {
      const chunk = line.slice(5).trimStart();
      dataText = dataText ? `${dataText}\n${chunk}` : chunk;
    }
  });

  if (!dataText) return null;

  try {
    return {
      event,
      data: JSON.parse(dataText)
    };
  } catch {
    return {
      event,
      data: dataText
    };
  }
};

// --- TYPES ---
export interface ListingAnalytics {
  itemId: string;
  itemTitle: string;
  totalViews: number;
  totalClicks: number;
  totalCartAdds: number;
  totalCheckouts: number;
  conversionRate: number;
  averageViewDurationSeconds: number;
  viewsData: ViewEvent[];
  cartAddData: CartAddEvent[];
  checkoutData: CheckoutEvent[];
  topReferrers: ReferrerData[];
  revenue?: number;
  unitsSold?: number;
}

export interface ViewEvent {
  id: string;
  visitorId: string;
  visitorName?: string;
  itemId: string;
  viewedAt: string;
  durationMs: number;
  deviceType?: string;
  source?: string;
}

export interface CartAddEvent {
  id: string;
  userId: string;
  userName?: string;
  itemId: string;
  addedAt: string;
  quantity: number;
  completedCheckout: boolean;
  checkoutTime?: string;
}

export interface CheckoutEvent {
  id: string;
  userId: string;
  userName?: string;
  itemId: string;
  orderId: string;
  checkoutTime: string;
  amount: number;
  status: 'completed' | 'abandoned' | 'pending';
}

export interface ReferrerData {
  source: string;
  totalVisitors: number;
  conversionRate: number;
}

export interface SellerAnalyticsDashboard {
  totalRevenue: number;
  totalOrders: number;
  totalViews: number;
  conversionRate: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  returnedOrders: number;
  topProducts: ListingAnalytics[];
  viewsTrend: TrendData[];
  ordersTrend: TrendData[];
  revenueTrend: TrendData[];
  unitsTrend?: TrendData[];
  cartAbandonmentRate: number;
  totalCartAdds: number;
  totalCheckoutStarts?: number;
  completedCheckouts: number;
  uniqueVisitors?: number;
  uniqueBuyers?: number;
  conversionRateEventBased?: number;
  conversionRateVisitorBased?: number;
  totalTrustedViews?: number;
  trustedConversionRate?: number;
  realtimeMetrics?: RealTimeMetric[];
  recentOrders?: Array<{
    id: string;
    status: string;
    currency: string;
    total: number;
    quantityTotal: number;
    createdAt: string;
    itemCount?: number;
  }>;
  funnel?: FunnelAnalytics;
  insights?: InsightMessage[];
  anomalies?: AnomalySignal[];
  trendAcceleration?: TrendAccelerationSignal[];
  attribution?: AttributionSignal[];
  forecasts?: ForecastSignal[];
  journeys?: JourneyAnalytics;
  recommendations?: RecommendationSignal[];
  cohorts?: CohortSignal[];
  trust?: TrustOverview;
  generatedAt?: string;
  timezone?: string;
}

export interface TrendData {
  date: string;
  value: number;
  label: string;
}

export interface RealTimeMetric {
  metric: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FunnelAnalytics {
  stages: Array<{ stage: string; count: number; percentage: number }>;
  dropOffStage: string;
  dropOffRate: number;
  eventBasedConversionRate: number;
  visitorBasedConversionRate: number;
}

export interface InsightMessage {
  id: string;
  severity: 'positive' | 'info' | 'warning' | 'critical' | string;
  type: string;
  message: string;
  metric?: number;
}

export interface AnomalySignal {
  id: string;
  severity: string;
  type: string;
  message: string;
  value?: number;
  baseline?: number;
}

export interface TrendAccelerationSignal {
  window: string;
  metric: string;
  current: number;
  previous: number;
  accelerationRatio: number;
}

export interface AttributionSignal {
  channel: string;
  deviceType: string;
  source: string;
  views: number;
  carts: number;
  checkouts: number;
  revenue: number;
  uniqueVisitors: number;
  conversionRate: number;
  cartAbandonmentRate: number;
}

export interface ForecastSignal {
  horizonDays: number;
  expectedRevenue: number;
  expectedUnits: number;
  expectedViews: number;
  confidence: number;
  summary: string;
}

export interface JourneyAnalytics {
  topSuccessfulPaths: Array<{ path: string; count: number }>;
  topDropOffPaths: Array<{ path: string; count: number }>;
}

export interface RecommendationSignal {
  id: string;
  type: string;
  priority: string;
  score: number;
  message: string;
  expectedImpact?: string;
}

export interface CohortSignal {
  cohort: string;
  channel: string;
  visitors: number;
  returningVisitors: number;
  convertedVisitors: number;
  repeatRate: number;
  conversionRate: number;
}

export interface TrustOverview {
  totalEvents: number;
  trustedEvents: number;
  highTrust: number;
  mediumTrust: number;
  lowTrust: number;
  lowTrustRate: number;
}

export interface SellerIntelligenceSnapshot {
  insights: InsightMessage[];
  funnel: FunnelAnalytics;
  forecasts: ForecastSignal[];
  journeys: JourneyAnalytics;
  anomalies: AnomalySignal[];
  trendAcceleration: TrendAccelerationSignal[];
  attribution: AttributionSignal[];
  recommendations: RecommendationSignal[];
  cohorts: CohortSignal[];
  trust: TrustOverview;
  realtimeMetrics: RealTimeMetric[];
  generatedAt?: string;
  timezone?: string;
}

export interface SellerAnalyticsStreamEvent {
  event: string;
  data: any;
}

// --- ANALYTICS SERVICE ---
const analyticsService = {
  // Track a product view with duration
  recordView: async (
    itemId: string,
    visitorId: string,
    visitorName: string | null,
    durationMs: number,
    deviceType?: string,
    source?: string
  ): Promise<void> => {
    if (!itemId || !visitorId) return;

    try {
      // Get item to capture owner information
      let ownerPersonaId = '';
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        const itemData = itemDoc.data() as any;
        ownerPersonaId = itemData.ownerPersonaId || '';
      }

      const viewEvent = {
        id: `view_${Date.now()}_${Math.random()}`,
        visitorId,
        visitorName: visitorName || 'Anonymous',
        itemId,
        ownerPersonaId,
        viewedAt: Timestamp.now().toDate().toISOString(),
        durationMs,
        deviceType: deviceType || 'unknown',
        source: source || 'direct',
        timestamp: Timestamp.now()
      };

      if (isBackendConfigured()) {
        try {
          const token = await getBackendToken();
          await backendFetch('/analytics/views', {
            method: 'POST',
            body: JSON.stringify(viewEvent)
          }, token);
          return;
        } catch (error) {
          console.warn('Backend view tracking failed:', error);
        }
      }

      // Store in Firebase fallback
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'analytics_views')), viewEvent);
      await batch.commit();
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  },

  // Track cart additions
  recordCartAdd: async (
    itemId: string,
    userId: string,
    userName: string | null,
    quantity: number = 1
  ): Promise<void> => {
    if (!itemId || !userId) return;

    try {
      // Get item to capture owner information
      let ownerPersonaId = '';
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        const itemData = itemDoc.data() as any;
        ownerPersonaId = itemData.ownerPersonaId || '';
      }

      const cartEvent = {
        id: `cart_${Date.now()}_${Math.random()}`,
        userId,
        userName: userName || 'Anonymous',
        itemId,
        ownerPersonaId,
        addedAt: Timestamp.now().toDate().toISOString(),
        quantity,
        completedCheckout: false,
        timestamp: Timestamp.now()
      };

      if (isBackendConfigured()) {
        try {
          const token = await getBackendToken();
          await backendFetch('/analytics/cart-adds', {
            method: 'POST',
            body: JSON.stringify(cartEvent)
          }, token);
          return;
        } catch (error) {
          console.warn('Backend cart tracking failed:', error);
        }
      }

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'analytics_cart_adds')), cartEvent);
      await batch.commit();
    } catch (error) {
      console.error('Failed to record cart add:', error);
    }
  },

  // Track checkouts
  recordCheckout: async (
    itemId: string,
    userId: string,
    userName: string | null,
    orderId: string,
    amount: number,
    status: 'completed' | 'abandoned' | 'pending' = 'completed'
  ): Promise<void> => {
    if (!itemId || !userId) return;

    try {
      // Get item to capture owner information
      let ownerPersonaId = '';
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        const itemData = itemDoc.data() as any;
        ownerPersonaId = itemData.ownerPersonaId || '';
      }

      const checkoutEvent = {
        id: `checkout_${Date.now()}_${Math.random()}`,
        userId,
        userName: userName || 'Anonymous',
        itemId,
        ownerPersonaId,
        orderId,
        checkoutTime: Timestamp.now().toDate().toISOString(),
        amount,
        status,
        timestamp: Timestamp.now()
      };

      if (isBackendConfigured()) {
        try {
          const token = await getBackendToken();
          await backendFetch('/analytics/checkouts', {
            method: 'POST',
            body: JSON.stringify(checkoutEvent)
          }, token);
          return;
        } catch (error) {
          console.warn('Backend checkout tracking failed:', error);
        }
      }

      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'analytics_checkouts')), checkoutEvent);
      await batch.commit();
    } catch (error) {
      console.error('Failed to record checkout:', error);
    }
  },

  // Get analytics for a single listing
  getListingAnalytics: async (itemId: string, daysBack: number = 30): Promise<ListingAnalytics | null> => {
    if (!itemId) return null;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const response = await backendFetch(`/analytics/listings/${itemId}?days=${daysBack}`, {}, token);
        if (response?.data) {
          return {
            itemId,
            itemTitle: response.data.itemTitle || '',
            totalViews: response.data.totalViews || 0,
            totalClicks: response.data.totalClicks || 0,
            totalCartAdds: response.data.totalCartAdds || 0,
            totalCheckouts: response.data.totalCheckouts || 0,
            conversionRate: response.data.conversionRate || 0,
            averageViewDurationSeconds: response.data.averageViewDurationSeconds || 0,
            viewsData: response.data.viewsData || [],
            cartAddData: response.data.cartAddData || [],
            checkoutData: response.data.checkoutData || [],
            topReferrers: response.data.topReferrers || []
          };
        }
      } catch (error) {
        console.warn('Backend listing analytics failed:', error);
      }
    }

    try {
      // Firebase fallback
      const viewQuery = query(
        collection(db, 'analytics_views'),
        where('itemId', '==', itemId),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );
      
      const cartQuery = query(
        collection(db, 'analytics_cart_adds'),
        where('itemId', '==', itemId),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );
      
      const checkoutQuery = query(
        collection(db, 'analytics_checkouts'),
        where('itemId', '==', itemId),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );

      const [viewDocs, cartDocs, checkoutDocs] = await Promise.all([
        getDocs(viewQuery),
        getDocs(cartQuery),
        getDocs(checkoutQuery)
      ]);

      const viewsData = viewDocs.docs.map(d => ({ id: d.id, ...d.data() } as ViewEvent));
      const cartAddData = cartDocs.docs.map(d => ({ id: d.id, ...d.data() } as CartAddEvent));
      const checkoutData = checkoutDocs.docs.map(d => ({ id: d.id, ...d.data() } as CheckoutEvent));

      const totalViews = viewsData.length;
      const totalClicks = viewsData.filter(v => v.durationMs > 1000).length; // Click = view > 1 second
      const totalCartAdds = cartAddData.length;
      const totalCheckouts = checkoutData.filter(c => c.status === 'completed').length;
      const conversionRate = totalViews > 0 ? (totalCheckouts / totalViews) * 100 : 0;
      const averageViewDurationSeconds = totalViews > 0 
        ? viewsData.reduce((sum, v) => sum + (v.durationMs || 0), 0) / totalViews / 1000 
        : 0;

      // Group by referrer source
      const referrerMap = new Map<string, number>();
      viewsData.forEach(v => {
        const key = v.source || 'direct';
        referrerMap.set(key, (referrerMap.get(key) || 0) + 1);
      });

      const topReferrers = Array.from(referrerMap.entries())
        .map(([source, count]) => ({
          source,
          totalVisitors: count,
          conversionRate: totalViews > 0 ? (count / totalViews) * 100 : 0
        }))
        .sort((a, b) => b.totalVisitors - a.totalVisitors);

      return {
        itemId,
        itemTitle: '',
        totalViews,
        totalClicks,
        totalCartAdds,
        totalCheckouts,
        conversionRate,
        averageViewDurationSeconds,
        viewsData,
        cartAddData,
        checkoutData,
        topReferrers
      };
    } catch (error) {
      console.error('Failed to get listing analytics:', error);
      return null;
    }
  },

  // Get full seller dashboard analytics
  getSellerAnalytics: async (
    sellerId: string,
    daysBack: number = 30,
    timezone?: string
  ): Promise<SellerAnalyticsDashboard | null> => {
    if (!sellerId) return null;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const query = timezone ? `?days=${daysBack}&timezone=${encodeURIComponent(timezone)}` : `?days=${daysBack}`;
        const response = await backendFetch(`/analytics/sellers/${sellerId}${query}`, {}, token);
        if (response?.data) {
          return response.data;
        }
      } catch (error) {
        console.warn('Backend seller analytics failed:', error);
      }
    }

    try {
      // Firebase fallback - get all items that belong to this seller
      const itemsCollection = collection(db, 'items');
      const itemQuery = query(
        itemsCollection,
        where('ownerPersonaId', '==', sellerId)
      );
      const itemDocs = await getDocs(itemQuery);
      const sellerItemIds = itemDocs.docs.map(doc => doc.id);

      if (sellerItemIds.length === 0) {
        // No items for this seller yet
        return {
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
      }

      // Query views for seller's items
      const viewQuery = query(
        collection(db, 'analytics_views'),
        where('itemId', 'in', sellerItemIds.slice(0, 10)), // Firestore limits 'in' to 10 items
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );

      const cartQuery = query(
        collection(db, 'analytics_cart_adds'),
        where('itemId', 'in', sellerItemIds.slice(0, 10)),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );

      const checkoutQuery = query(
        collection(db, 'analytics_checkouts'),
        where('itemId', 'in', sellerItemIds.slice(0, 10)),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      );

      const [viewDocs, cartDocs, checkoutDocs] = await Promise.all([
        getDocs(viewQuery),
        getDocs(cartQuery),
        getDocs(checkoutQuery)
      ]);

      const views = viewDocs.docs.map(d => d.data() as ViewEvent);
      const cartAdds = cartDocs.docs.map(d => d.data() as CartAddEvent);
      const checkouts = checkoutDocs.docs.map(d => d.data() as CheckoutEvent).filter(c => c.status === 'completed');

      const totalViews = views.length;
      const totalOrders = checkouts.length;
      const totalRevenue = checkouts.reduce((sum, c) => sum + (c.amount || 0), 0);
      const totalCartAdds = cartAdds.length;
      const completedCheckouts = checkouts.length;
      const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const cartAbandonmentRate = totalCartAdds > 0 ? ((totalCartAdds - completedCheckouts) / totalCartAdds) * 100 : 0;

      // Calculate trend data from actual views
      const trendDataMap = new Map<string, { views: number; orders: number; revenue: number }>();
      
      views.forEach(v => {
        const date = new Date(v.viewedAt).toISOString().split('T')[0];
        const existing = trendDataMap.get(date) || { views: 0, orders: 0, revenue: 0 };
        trendDataMap.set(date, { ...existing, views: existing.views + 1 });
      });

      checkouts.forEach(c => {
        const date = new Date(c.checkoutTime).toISOString().split('T')[0];
        const existing = trendDataMap.get(date) || { views: 0, orders: 0, revenue: 0 };
        trendDataMap.set(date, { ...existing, orders: existing.orders + 1, revenue: existing.revenue + (c.amount || 0) });
      });

      const viewsTrend = generateTrendData(daysBack).map(d => ({
        ...d,
        value: trendDataMap.get(d.date)?.views || 0
      }));

      const ordersTrend = generateTrendData(daysBack).map(d => ({
        ...d,
        value: trendDataMap.get(d.date)?.orders || 0
      }));

      const revenueTrend = generateTrendData(daysBack).map(d => ({
        ...d,
        value: trendDataMap.get(d.date)?.revenue || 0
      }));

      // Aggregate by product
      const productMap = new Map<string, { title: string; views: number; carts: number; checkouts: number; revenue: number }>();

      views.forEach(v => {
        const existing = productMap.get(v.itemId) || { title: v.itemId, views: 0, carts: 0, checkouts: 0, revenue: 0 };
        productMap.set(v.itemId, { ...existing, views: existing.views + 1 });
      });

      cartAdds.forEach(c => {
        const existing = productMap.get(c.itemId) || { title: c.itemId, views: 0, carts: 0, checkouts: 0, revenue: 0 };
        productMap.set(c.itemId, { ...existing, carts: existing.carts + 1 });
      });

      checkouts.forEach(c => {
        const existing = productMap.get(c.itemId) || { title: c.itemId, views: 0, carts: 0, checkouts: 0, revenue: 0 };
        productMap.set(c.itemId, { ...existing, checkouts: existing.checkouts + 1, revenue: existing.revenue + (c.amount || 0) });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([itemId, data]) => ({
          itemId,
          itemTitle: data.title,
          totalViews: data.views,
          totalClicks: data.views > 0 ? data.views : 0,
          totalCartAdds: data.carts,
          totalCheckouts: data.checkouts,
          conversionRate: data.views > 0 ? (data.checkouts / data.views) * 100 : 0,
          averageViewDurationSeconds: 0,
          viewsData: [],
          cartAddData: [],
          checkoutData: [],
          topReferrers: []
        }))
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10);

      return {
        totalRevenue,
        totalOrders,
        totalViews,
        conversionRate,
        averageOrderValue,
        pendingOrders: 0,
        completedOrders: totalOrders,
        returnedOrders: 0,
        topProducts,
        viewsTrend,
        ordersTrend,
        revenueTrend,
        cartAbandonmentRate,
        totalCartAdds,
        completedCheckouts
      };
    } catch (error) {
      console.error('Failed to get seller analytics:', error);
      return null;
    }
  },

  // Get real-time metrics
  getRealTimeMetrics: async (sellerId: string): Promise<RealTimeMetric[]> => {
    if (!sellerId) return [];

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const response = await backendFetch(`/analytics/realtime/${sellerId}`, {}, token);
        if (Array.isArray(response?.data)) {
          return response.data;
        }
      } catch (error) {
        console.warn('Backend realtime metrics failed:', error);
      }
    }

    try {
      // Firebase fallback
      const viewsLast24 = query(
        collection(db, 'analytics_views'),
        where('timestamp', '>=', Timestamp.fromDate(last24Hours))
      );
      
      const viewsLast7 = query(
        collection(db, 'analytics_views'),
        where('timestamp', '>=', Timestamp.fromDate(last7Days))
      );

      const [views24Docs, views7Docs] = await Promise.all([
        getDocs(viewsLast24),
        getDocs(viewsLast7)
      ]);

      const views24 = views24Docs.size;
      const views7 = views7Docs.size;
      const viewsChange = views7 > 0 ? ((views24 - views7) / views7) * 100 : 0;

      // Get cart additions in last 24 hours
      const cartLast24 = query(
        collection(db, 'analytics_cart_adds'),
        where('timestamp', '>=', Timestamp.fromDate(last24Hours))
      );
      const cartLast7 = query(
        collection(db, 'analytics_cart_adds'),
        where('timestamp', '>=', Timestamp.fromDate(last7Days))
      );

      const [cart24Docs, cart7Docs] = await Promise.all([
        getDocs(cartLast24),
        getDocs(cartLast7)
      ]);

      const carts24 = cart24Docs.size;
      const carts7 = cart7Docs.size;
      const cartsChange = carts7 > 0 ? ((carts24 - carts7) / carts7) * 100 : 0;

      // Get checkouts in last 24 hours
      const checkoutLast24 = query(
        collection(db, 'analytics_checkouts'),
        where('timestamp', '>=', Timestamp.fromDate(last24Hours))
      );
      const checkoutLast7 = query(
        collection(db, 'analytics_checkouts'),
        where('timestamp', '>=', Timestamp.fromDate(last7Days))
      );

      const [checkout24Docs, checkout7Docs] = await Promise.all([
        getDocs(checkoutLast24),
        getDocs(checkoutLast7)
      ]);

      const checkouts24 = checkout24Docs.size;
      const checkouts7 = checkout7Docs.size;
      const checkoutsChange = checkouts7 > 0 ? ((checkouts24 - checkouts7) / checkouts7) * 100 : 0;

      return [
        {
          metric: 'Views (24h)',
          value: views24,
          change: views24 - views7,
          changePercent: viewsChange,
          trend: viewsChange > 0 ? 'up' : viewsChange < 0 ? 'down' : 'stable'
        },
        {
          metric: 'Cart Additions (24h)',
          value: carts24,
          change: carts24 - carts7,
          changePercent: cartsChange,
          trend: cartsChange > 0 ? 'up' : cartsChange < 0 ? 'down' : 'stable'
        },
        {
          metric: 'Checkouts (24h)',
          value: checkouts24,
          change: checkouts24 - checkouts7,
          changePercent: checkoutsChange,
          trend: checkoutsChange > 0 ? 'up' : checkoutsChange < 0 ? 'down' : 'stable'
        }
      ];
    } catch (error) {
      console.error('Failed to get realtime metrics:', error);
      return [];
    }
  },

  // Get visitor details for a product
  getProductVisitors: async (itemId: string, daysBack: number = 7): Promise<ViewEvent[]> => {
    if (!itemId) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const response = await backendFetch(`/analytics/listings/${itemId}/visitors?days=${daysBack}`, {}, token);
        return Array.isArray(response?.data) ? response.data : [];
      } catch (error) {
        console.warn('Backend visitors fetch failed:', error);
      }
    }

    try {
      const viewQuery = query(
        collection(db, 'analytics_views'),
        where('itemId', '==', itemId),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
        orderBy('timestamp', 'desc')
      );
      
      const docs = await getDocs(viewQuery);
      return docs.docs.map(d => ({ id: d.id, ...d.data() } as ViewEvent));
    } catch (error) {
      console.error('Failed to get product visitors:', error);
      return [];
    }
  },

  // Get who added to cart but didn't checkout
  getAbandonedCarts: async (sellerId: string, daysBack: number = 7): Promise<CartAddEvent[]> => {
    if (!sellerId) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const response = await backendFetch(`/analytics/sellers/${sellerId}/abandoned-carts?days=${daysBack}`, {}, token);
        return Array.isArray(response?.data) ? response.data : [];
      } catch (error) {
        console.warn('Backend abandoned carts fetch failed:', error);
      }
    }

    try {
      const cartQuery = query(
        collection(db, 'analytics_cart_adds'),
        where('completedCheckout', '==', false),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
        orderBy('timestamp', 'desc')
      );
      
      const docs = await getDocs(cartQuery);
      return docs.docs.map(d => ({ id: d.id, ...d.data() } as CartAddEvent));
    } catch (error) {
      console.error('Failed to get abandoned carts:', error);
      return [];
    }
  },

  getSellerIntelligence: async (sellerId: string, daysBack: number = 30): Promise<SellerIntelligenceSnapshot | null> => {
    if (!sellerId) return null;
    if (!isBackendConfigured()) return null;

    try {
      const token = await getBackendToken();
      const response = await backendFetch(`/analytics/intelligence/${sellerId}?days=${daysBack}`, {}, token);
      return response?.data || null;
    } catch (error) {
      console.warn('Backend intelligence fetch failed:', error);
      return null;
    }
  },

  getCohortAnalytics: async (sellerId: string, daysBack: number = 90): Promise<CohortSignal[]> => {
    if (!sellerId || !isBackendConfigured()) return [];
    try {
      const token = await getBackendToken();
      const response = await backendFetch(`/analytics/cohorts/${sellerId}?days=${daysBack}`, {}, token);
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      console.warn('Backend cohort fetch failed:', error);
      return [];
    }
  },

  submitRecommendationFeedback: async (
    sellerId: string,
    recommendationId: string,
    action: 'accepted' | 'dismissed' | 'ignored',
    type: string = 'general',
    context: Record<string, unknown> = {}
  ): Promise<boolean> => {
    if (!sellerId || !recommendationId || !isBackendConfigured()) return false;
    try {
      const token = await getBackendToken();
      await backendFetch(`/analytics/recommendations/${sellerId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          recommendationId,
          action,
          type,
          context
        })
      }, token);
      return true;
    } catch (error) {
      console.warn('Recommendation feedback failed:', error);
      return false;
    }
  },

  createExperiment: async (
    sellerPersonaId: string,
    name: string,
    variants: Array<{ id?: string; label: string; weight?: number; config?: Record<string, unknown> }>,
    target: string = 'listing',
    metric: string = 'conversion_rate'
  ): Promise<any | null> => {
    if (!sellerPersonaId || !name || !Array.isArray(variants) || variants.length < 2 || !isBackendConfigured()) return null;
    try {
      const token = await getBackendToken();
      const response = await backendFetch('/analytics/experiments', {
        method: 'POST',
        body: JSON.stringify({
          sellerPersonaId,
          name,
          variants,
          target,
          metric
        })
      }, token);
      return response?.data || null;
    } catch (error) {
      console.warn('Create experiment failed:', error);
      return null;
    }
  },

  getExperiments: async (sellerPersonaId: string): Promise<any[]> => {
    if (!sellerPersonaId || !isBackendConfigured()) return [];
    try {
      const token = await getBackendToken();
      const response = await backendFetch(`/analytics/experiments/${sellerPersonaId}`, {}, token);
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      console.warn('Fetch experiments failed:', error);
      return [];
    }
  },

  assignExperimentVariant: async (experimentId: string, visitorId: string): Promise<any | null> => {
    if (!experimentId || !visitorId || !isBackendConfigured()) return null;
    try {
      const response = await backendFetch(`/analytics/experiments/${experimentId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ visitorId })
      });
      return response?.data || null;
    } catch (error) {
      console.warn('Experiment assignment failed:', error);
      return null;
    }
  },

  recordExperimentEvent: async (
    experimentId: string,
    variantId: string,
    eventName: string,
    visitorId: string,
    amount: number = 0,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> => {
    if (!experimentId || !variantId || !visitorId || !isBackendConfigured()) return false;
    try {
      await backendFetch(`/analytics/experiments/${experimentId}/event`, {
        method: 'POST',
        body: JSON.stringify({
          variantId,
          eventName,
          visitorId,
          amount,
          metadata
        })
      });
      return true;
    } catch (error) {
      console.warn('Experiment event failed:', error);
      return false;
    }
  },

  getExperimentResults: async (experimentId: string): Promise<any | null> => {
    if (!experimentId || !isBackendConfigured()) return null;
    try {
      const token = await getBackendToken();
      const response = await backendFetch(`/analytics/experiments/${experimentId}/results`, {}, token);
      return response?.data || null;
    } catch (error) {
      console.warn('Experiment results failed:', error);
      return null;
    }
  },

  subscribeSellerStream: (
    sellerId: string,
    onMessage: (message: SellerAnalyticsStreamEvent) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    if (!sellerId || !isBackendConfigured()) {
      return () => {};
    }

    let closed = false;
    let reconnectTimer: number | undefined;
    let controller: AbortController | null = null;

    const connect = async () => {
      if (closed) return;

      try {
        const baseUrl = await resolveBackendBaseUrl();
        if (!baseUrl) throw new Error('Backend URL unavailable for realtime stream.');

        controller = new AbortController();
        const token = await getBackendToken();
        const headers: Record<string, string> = {
          Accept: 'text/event-stream'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${baseUrl}/analytics/stream/${encodeURIComponent(sellerId)}`, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        if (!response.ok || !response.body) {
          throw new Error(`Realtime stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';

          frames.forEach((frame) => {
            const parsed = parseSseFrame(frame);
            if (parsed) onMessage(parsed);
          });
        }

        if (!closed) {
          reconnectTimer = window.setTimeout(() => {
            void connect();
          }, 3000);
        }
      } catch (error) {
        if (closed) return;
        onError?.(error instanceof Error ? error : new Error('Realtime stream failed'));
        reconnectTimer = window.setTimeout(() => {
          void connect();
        }, 5000);
      }
    };

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (controller) controller.abort();
    };
  }
};

// Helper function to generate trend data
const generateTrendData = (daysBack: number): TrendData[] => {
  const data: TrendData[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: 0, // To be filled with real data
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  return data;
};

export default analyticsService;
