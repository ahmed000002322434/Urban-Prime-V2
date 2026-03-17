import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { localDb } from './localDb';
import type { Booking, BuyerDashboardSnapshot, Item, SellerDashboardSnapshot } from '../types';

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

const getLocalUserId = async () => {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  await localDb.init();
  const users = await localDb.list<any>('users');
  return users[0]?.id || '';
};

const buildBuyerSnapshot = async (limit: number): Promise<BuyerDashboardSnapshot> => {
  await localDb.init();
  const userId = await getLocalUserId();
  const bookings = await localDb.list<Booking>('bookings');
  const userBookings = userId ? bookings.filter((booking) => booking.renterId === userId) : [];
  const pendingOrders = userBookings.filter((booking) => booking.status === 'pending').length;
  const completedOrders = userBookings.filter((booking) => booking.status === 'completed').length;
  const activeRentals = userBookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'delivered').length;
  const upcomingReturns = userBookings.filter((booking) => booking.status === 'delivered' || booking.status === 'shipped');

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalOrders: userBookings.length,
      pendingOrders,
      completedOrders,
      activeRentals,
      upcomingReturns: upcomingReturns.length,
      totalPurchases: userBookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0),
      wishlistItems: 0,
      unreadNotifications: 0,
      conversations: 0
    },
    recentOrders: userBookings
      .slice()
      .sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
      .slice(0, limit)
      .map((booking) => ({
        id: booking.id || `booking-${booking.itemId}`,
        status: booking.status || 'pending',
        total: Number(booking.totalPrice || 0),
        currency: booking.currency || 'USD',
        createdAt: booking.startDate || new Date().toISOString(),
        itemCount: 1,
        quantityTotal: 1,
        rentalItems: booking.type === 'rent' ? 1 : 0,
        saleItems: booking.type === 'sale' ? 1 : 0
      })),
    upcomingReturns: upcomingReturns.slice(0, limit).map((booking) => ({
      orderId: booking.orderId || booking.id || '',
      orderItemId: booking.id || '',
      itemId: booking.itemId || null,
      itemTitle: booking.itemTitle || 'Item',
      rentalEnd: booking.endDate || new Date().toISOString(),
      quantity: 1
    }))
  };
};

const buildSellerSnapshot = async (limit: number): Promise<SellerDashboardSnapshot> => {
  await localDb.init();
  const userId = await getLocalUserId();
  const items = await localDb.list<Item>('items');
  const ownedItems = userId
    ? items.filter((item) => item.owner?.id === userId || (item as any).ownerId === userId)
    : [];
  const bookings = await localDb.list<Booking>('bookings');
  const sellerBookings = userId ? bookings.filter((booking) => booking.provider?.id === userId) : [];

  const pendingOrders = sellerBookings.filter((booking) => booking.status === 'pending').length;
  const completedOrders = sellerBookings.filter((booking) => booking.status === 'completed').length;
  const totalRevenue = sellerBookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
  const lowStockItems = ownedItems.filter((item) => Number(item.stock || 0) <= 1);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalSalesUnits: sellerBookings.length,
      totalViews: 0,
      conversionRate: 0,
      lowStockCount: lowStockItems.length,
      unreadMessages: 0
    },
    earningsByMonth: [],
    categorySales: [],
    recentOrders: sellerBookings
      .slice()
      .sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
      .slice(0, limit)
      .map((booking) => ({
        id: booking.id || `booking-${booking.itemId}`,
        status: booking.status || 'pending',
        total: Number(booking.totalPrice || 0),
        currency: booking.currency || 'USD',
        createdAt: booking.startDate || new Date().toISOString(),
        itemCount: 1,
        quantityTotal: 1
      })),
    lowStockItems: lowStockItems.slice(0, limit).map((item) => ({
      id: item.id,
      title: item.title,
      stock: Number(item.stock || 0),
      status: item.status || 'active'
    })),
    insights: [],
    setup: {
      hasStore: ownedItems.length > 0,
      hasProducts: ownedItems.length > 0,
      hasContent: false,
      hasApps: false
    }
  };
};

export const dashboardService = {
  getBuyerDashboardSnapshot: async (limit = 8): Promise<BuyerDashboardSnapshot> => {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    if (!isBackendConfigured()) {
      return buildBuyerSnapshot(safeLimit);
    }
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
    if (!isBackendConfigured()) {
      return buildSellerSnapshot(safeLimit);
    }
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
