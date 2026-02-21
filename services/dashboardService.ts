import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import type { BuyerDashboardSnapshot, SellerDashboardSnapshot } from '../types';

const getAuthContext = async (): Promise<{ token?: string; firebaseUid?: string }> => {
  if (!auth.currentUser) return {};
  const firebaseUid = auth.currentUser.uid;
  try {
    const token = await auth.currentUser.getIdToken();
    return { token, firebaseUid };
  } catch {
    return { firebaseUid };
  }
};

const request = async (path: string) => {
  if (!isBackendConfigured()) {
    throw new Error('Backend URL is not configured. Set VITE_BACKEND_URL.');
  }
  const authContext = await getAuthContext();
  const headers = new Headers();
  if (authContext.firebaseUid) {
    headers.set('x-firebase-uid', authContext.firebaseUid);
  }
  return backendFetch(path, { headers }, authContext.token);
};

export const dashboardService = {
  getBuyerDashboardSnapshot: async (limit = 8): Promise<BuyerDashboardSnapshot> => {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const response = await request(`/dashboard/buyer?limit=${safeLimit}`);
    const data = response?.data || {};

    return {
      generatedAt: data.generatedAt || new Date().toISOString(),
      summary: {
        totalOrders: Number(data?.summary?.totalOrders || 0),
        pendingOrders: Number(data?.summary?.pendingOrders || 0),
        completedOrders: Number(data?.summary?.completedOrders || 0),
        activeRentals: Number(data?.summary?.activeRentals || 0),
        upcomingReturns: Number(data?.summary?.upcomingReturns || 0),
        totalPurchases: Number(data?.summary?.totalPurchases || 0),
        wishlistItems: Number(data?.summary?.wishlistItems || 0),
        unreadNotifications: Number(data?.summary?.unreadNotifications || 0),
        conversations: Number(data?.summary?.conversations || 0)
      },
      recentOrders: Array.isArray(data?.recentOrders)
        ? data.recentOrders.map((order: any) => ({
            id: String(order?.id || ''),
            status: String(order?.status || 'pending'),
            total: Number(order?.total || 0),
            currency: String(order?.currency || 'USD'),
            createdAt: String(order?.createdAt || new Date().toISOString()),
            itemCount: Number(order?.itemCount || 0),
            quantityTotal: Number(order?.quantityTotal || 0),
            rentalItems: Number(order?.rentalItems || 0),
            saleItems: Number(order?.saleItems || 0)
          }))
        : [],
      upcomingReturns: Array.isArray(data?.upcomingReturns)
        ? data.upcomingReturns.map((entry: any) => ({
            orderId: String(entry?.orderId || ''),
            orderItemId: String(entry?.orderItemId || ''),
            itemId: entry?.itemId ? String(entry.itemId) : null,
            itemTitle: String(entry?.itemTitle || 'Item'),
            rentalEnd: String(entry?.rentalEnd || new Date().toISOString()),
            quantity: Number(entry?.quantity || 1)
          }))
        : []
    };
  },
  getSellerDashboardSnapshot: async (limit = 8): Promise<SellerDashboardSnapshot> => {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const response = await request(`/dashboard/seller?limit=${safeLimit}`);
    const data = response?.data || {};

    return {
      generatedAt: data.generatedAt || new Date().toISOString(),
      summary: {
        totalRevenue: Number(data?.summary?.totalRevenue || 0),
        pendingOrders: Number(data?.summary?.pendingOrders || 0),
        completedOrders: Number(data?.summary?.completedOrders || 0),
        totalSalesUnits: Number(data?.summary?.totalSalesUnits || 0),
        totalViews: Number(data?.summary?.totalViews || 0),
        conversionRate: Number(data?.summary?.conversionRate || 0),
        lowStockCount: Number(data?.summary?.lowStockCount || 0),
        unreadMessages: Number(data?.summary?.unreadMessages || 0)
      },
      earningsByMonth: Array.isArray(data?.earningsByMonth)
        ? data.earningsByMonth.map((entry: any) => ({
            month: String(entry?.month || ''),
            earnings: Number(entry?.earnings || 0)
          }))
        : [],
      categorySales: Array.isArray(data?.categorySales)
        ? data.categorySales.map((entry: any) => ({
            category: String(entry?.category || 'Uncategorized'),
            value: Number(entry?.value || 0)
          }))
        : [],
      recentOrders: Array.isArray(data?.recentOrders)
        ? data.recentOrders.map((entry: any) => ({
            id: String(entry?.id || ''),
            status: String(entry?.status || 'pending'),
            total: Number(entry?.total || 0),
            currency: String(entry?.currency || 'USD'),
            createdAt: String(entry?.createdAt || new Date().toISOString()),
            itemCount: Number(entry?.itemCount || 0),
            quantityTotal: Number(entry?.quantityTotal || 0)
          }))
        : [],
      lowStockItems: Array.isArray(data?.lowStockItems)
        ? data.lowStockItems.map((entry: any) => ({
            id: String(entry?.id || ''),
            title: String(entry?.title || 'Item'),
            stock: Number(entry?.stock || 0),
            status: String(entry?.status || 'active')
          }))
        : [],
      insights: Array.isArray(data?.insights)
        ? data.insights.map((entry: any) => ({
            id: String(entry?.id || ''),
            type: (entry?.type || 'marketing') as 'pricing' | 'inventory' | 'marketing',
            message: String(entry?.message || ''),
            actionLabel: entry?.actionLabel ? String(entry.actionLabel) : undefined,
            actionLink: entry?.actionLink ? String(entry.actionLink) : undefined
          }))
        : [],
      setup: {
        hasStore: Boolean(data?.setup?.hasStore),
        hasProducts: Boolean(data?.setup?.hasProducts),
        hasContent: Boolean(data?.setup?.hasContent),
        hasApps: Boolean(data?.setup?.hasApps)
      }
    };
  }
};

export default dashboardService;
