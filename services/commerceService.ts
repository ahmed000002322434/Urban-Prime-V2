import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import type {
  AuctionSnapshot,
  Booking,
  CommerceAdminOverview,
  CommerceBidProfileRow,
  CommerceDispute,
  CommerceOrderDetail,
  CommerceProviderSnapshot,
  DropshipAdminOverview,
  DropshipCatalogFilters,
  DropshipOrder,
  DropshipWorkspaceSnapshot,
  PublicOrderTrackingResult,
  RentalBlockDraft,
  RentalBlockEntry,
  RentalDeliveryMode,
  RentalQuote,
  SellerDropshipProfile,
  Supplier,
  SupplierProduct,
  SupplierSettlement
} from '../types';

const requireBackend = () => {
  if (!isBackendConfigured()) {
    throw new Error('Commerce backend is not configured.');
  }
};

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const authedFetch = async (path: string, init: RequestInit = {}) => {
  requireBackend();
  const token = await getBackendToken();
  if (!token) throw new Error('Authentication required.');
  return backendFetch(path, init, token);
};

const publicFetch = async (path: string, init: RequestInit = {}) => {
  requireBackend();
  return backendFetch(path, init);
};

const toLegacyStatus = (status: string): Booking['status'] => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'pending_confirmation') return 'pending';
  if (normalized === 'ready_for_handoff') return 'confirmed';
  if (normalized === 'in_transit') return 'shipped';
  if (normalized === 'active') return 'delivered';
  if (normalized === 'return_in_transit') return 'returned';
  if (normalized === 'returned') return 'returned';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'confirmed') return 'confirmed';
  return 'pending';
};

export const mapCommerceDetailToBooking = (detail: CommerceOrderDetail): Booking => {
  if (detail.legacyBooking) {
    return {
      ...detail.legacyBooking,
      source: 'commerce',
      orderId: detail.orderId,
      orderItemId: detail.orderItemId,
      canonicalRentalBookingId: detail.bookingId || null,
      deliveryMode: (detail.deliveryMode as RentalDeliveryMode | undefined) || detail.legacyBooking.deliveryMode,
      pickupInstructions: detail.pickupInstructions || detail.legacyBooking.pickupInstructions || null,
      pickupCode: detail.pickupCode || detail.legacyBooking.pickupCode || null,
      pickupWindowStart: detail.pickupWindowStart || detail.legacyBooking.pickupWindowStart || null,
      pickupWindowEnd: detail.pickupWindowEnd || detail.legacyBooking.pickupWindowEnd || null,
      trackingNumber: detail.trackingNumber || detail.legacyBooking.trackingNumber,
      podJob: detail.podJob || detail.legacyBooking.podJob || null,
      securityDeposit: detail.securityDeposit ?? detail.legacyBooking.securityDeposit,
      depositStatus:
        detail.depositStatus === 'released'
          ? 'released'
          : detail.depositStatus === 'claimed'
            ? 'claimed'
            : detail.securityDeposit > 0
              ? 'held'
              : detail.legacyBooking.depositStatus
    };
  }

  const depositStatus =
    detail.depositStatus === 'released'
      ? 'released'
      : detail.depositStatus === 'claimed'
        ? 'claimed'
        : detail.securityDeposit > 0
          ? 'held'
          : undefined;

  return {
    id: detail.id,
    source: 'commerce',
    orderId: detail.orderId,
    orderItemId: detail.orderItemId,
    canonicalRentalBookingId: detail.bookingId || null,
    itemId: detail.itemId,
    itemTitle: detail.itemTitle,
    renterId: detail.buyer?.firebaseUid || detail.buyer?.id || '',
    renterSupabaseId: detail.buyer?.id || '',
    renterName: detail.buyer?.name || 'Buyer',
    provider: { id: detail.seller?.firebaseUid || detail.seller?.id || '' },
    providerSupabaseId: detail.seller?.id || '',
    startDate: detail.rentalStart || new Date().toISOString(),
    endDate: detail.rentalEnd || detail.rentalStart || new Date().toISOString(),
    totalPrice: detail.totalPrice,
    status: toLegacyStatus(detail.status),
    shippingAddress: detail.shippingAddress,
    trackingNumber: detail.trackingNumber || undefined,
    paymentStatus: depositStatus === 'released' ? 'released' : 'escrow',
    type: detail.type,
    currency: 'USD',
    securityDeposit: detail.securityDeposit,
    depositStatus,
    podJob: detail.podJob || null,
    claimDetails:
      detail.depositStatus === 'claimed'
        ? {
            amount: detail.claimAmount || 0,
            reason: detail.claimReason || '',
            proofImage: detail.claimEvidenceUrl || ''
          }
        : undefined,
    deliveryMode: (detail.deliveryMode as RentalDeliveryMode | undefined) || undefined,
    pickupInstructions: detail.pickupInstructions || null,
    pickupCode: detail.pickupCode || null,
    pickupWindowStart: detail.pickupWindowStart || null,
    pickupWindowEnd: detail.pickupWindowEnd || null
  };
};

export const commerceService = {
  enabled: () => isBackendConfigured(),

  async quoteRental(payload: {
    itemId: string;
    rentalStart: string;
    rentalEnd: string;
    quantity?: number;
    deliveryMode?: RentalDeliveryMode;
  }): Promise<RentalQuote> {
    return publicFetch('/commerce/rentals/quote', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<RentalQuote>;
  },

  async bookRental(payload: Record<string, unknown>) {
    return authedFetch('/commerce/rentals/book', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async confirmRental(id: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/rentals/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async handoffRental(id: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/rentals/${encodeURIComponent(id)}/handoff`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async returnRental(id: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/rentals/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async releaseRentalDeposit(id: string) {
    return authedFetch(`/commerce/rentals/${encodeURIComponent(id)}/deposit/release`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  async claimRentalDeposit(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/rentals/${encodeURIComponent(id)}/deposit/claim`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getRentalBlocks(itemId: string): Promise<{ itemId: string; blocks: RentalBlockEntry[] }> {
    return authedFetch(`/commerce/items/${encodeURIComponent(itemId)}/rental-blocks`) as Promise<{
      itemId: string;
      blocks: RentalBlockEntry[];
    }>;
  },

  async replaceRentalBlocks(itemId: string, blocks: RentalBlockDraft[]) {
    return authedFetch(`/commerce/items/${encodeURIComponent(itemId)}/rental-blocks`, {
      method: 'PUT',
      body: JSON.stringify({ blocks })
    }) as Promise<{ ok: boolean; itemId: string; blocks: RentalBlockEntry[] }>;
  },

  async getAuctionSnapshot(itemId: string): Promise<AuctionSnapshot> {
    return publicFetch(`/commerce/auctions/${encodeURIComponent(itemId)}`) as Promise<AuctionSnapshot>;
  },

  async placeBid(itemId: string, amount: number, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/auctions/${encodeURIComponent(itemId)}/bids`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        ...payload
      })
    }) as Promise<{ bid: Record<string, unknown>; auction: AuctionSnapshot }>;
  },

  async respondToAuction(itemId: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/auctions/${encodeURIComponent(itemId)}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ ok: boolean; auction: AuctionSnapshot }>;
  },

  async closeAuction(itemId: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/auctions/${encodeURIComponent(itemId)}/close`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ ok: boolean; auction: AuctionSnapshot }>;
  },

  async getOrderDetail(id: string, options: { sellerView?: boolean } = {}): Promise<CommerceOrderDetail> {
    const path = options.sellerView
      ? `/commerce/seller/bookings/${encodeURIComponent(id)}`
      : `/commerce/orders/details/${encodeURIComponent(id)}`;
    return authedFetch(path) as Promise<CommerceOrderDetail>;
  },

  async getPublicOrderTracking(orderId: string, email: string): Promise<PublicOrderTrackingResult> {
    return publicFetch('/commerce/orders/track', {
      method: 'POST',
      body: JSON.stringify({ orderId, email })
    }) as Promise<PublicOrderTrackingResult>;
  },

  async confirmReceipt(id: string) {
    return authedFetch(`/commerce/orders/${encodeURIComponent(id)}/confirm-receipt`, {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<{ ok: boolean; detail: CommerceOrderDetail }>;
  },

  async updateFulfillment(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/orders/${encodeURIComponent(id)}/fulfillment`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ ok: boolean; detail: CommerceOrderDetail }>;
  },

  async getProfileBids(): Promise<CommerceBidProfileRow[]> {
    const res = (await authedFetch('/commerce/profile/bids')) as { bids?: CommerceBidProfileRow[] };
    return Array.isArray(res?.bids) ? res.bids : [];
  },

  async getDisputes(): Promise<CommerceDispute[]> {
    const res = (await authedFetch('/commerce/disputes')) as { disputes?: CommerceDispute[] };
    return Array.isArray(res?.disputes) ? res.disputes : [];
  },

  async createDispute(payload: Record<string, unknown>) {
    return authedFetch('/commerce/disputes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDispute(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/disputes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async getSellerBookings(): Promise<Booking[]> {
    const res = (await authedFetch('/commerce/seller/bookings')) as { bookings?: Booking[] };
    return Array.isArray(res?.bookings)
      ? res.bookings.map((booking) => ({ ...booking, source: 'commerce' as const }))
      : [];
  },

  async getSellerBookingDetail(id: string): Promise<CommerceOrderDetail> {
    return authedFetch(`/commerce/seller/bookings/${encodeURIComponent(id)}`) as Promise<CommerceOrderDetail>;
  },

  async getAdminOverview(): Promise<CommerceAdminOverview> {
    return authedFetch('/commerce/admin/overview') as Promise<CommerceAdminOverview>;
  },

  async getProviders(): Promise<CommerceProviderSnapshot> {
    return authedFetch('/commerce/providers') as Promise<CommerceProviderSnapshot>;
  },

  async getDropshipProfile(): Promise<DropshipWorkspaceSnapshot> {
    return authedFetch('/commerce/dropship/profile') as Promise<DropshipWorkspaceSnapshot>;
  },

  async submitDropshipProfile(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/profile', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ profile: SellerDropshipProfile }>;
  },

  async updateDropshipProfile(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }) as Promise<{ profile: SellerDropshipProfile }>;
  },

  async getDropshipCatalog(filters: DropshipCatalogFilters = {}): Promise<SupplierProduct[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const path = params.toString() ? `/commerce/dropship/catalog?${params.toString()}` : '/commerce/dropship/catalog';
    const res = (await authedFetch(path)) as { products?: SupplierProduct[] };
    return Array.isArray(res?.products) ? res.products : [];
  },

  async getDropshipCatalogProduct(productId: string): Promise<SupplierProduct> {
    const res = (await authedFetch(`/commerce/dropship/catalog/${encodeURIComponent(productId)}`)) as {
      product: SupplierProduct;
    };
    return res.product;
  },

  async importDropshipProduct(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ ok: boolean; item: Record<string, unknown> }>;
  },

  async getDropshipOrders(limit?: number, status?: string): Promise<DropshipOrder[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    const path = params.toString() ? `/commerce/dropship/orders?${params.toString()}` : '/commerce/dropship/orders';
    const res = (await authedFetch(path)) as { orders?: DropshipOrder[] };
    return Array.isArray(res?.orders) ? res.orders : [];
  },

  async getDropshipOrder(id: string): Promise<DropshipOrder> {
    const res = (await authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}`)) as {
      order: DropshipOrder;
    };
    return res.order;
  },

  async approveDropshipOrder(id: string) {
    return authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<{ order: DropshipOrder }>;
  },

  async submitDropshipOrder(id: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ order: DropshipOrder }>;
  },

  async cancelDropshipOrder(id: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ order: DropshipOrder }>;
  },

  async updateDropshipTracking(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}/tracking`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ order: DropshipOrder }>;
  },

  async retryDropshipOrder(id: string) {
    return authedFetch(`/commerce/dropship/orders/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<{ order: DropshipOrder }>;
  },

  async getDropshipAdminOverview(): Promise<DropshipAdminOverview> {
    return authedFetch('/commerce/dropship/admin/overview') as Promise<DropshipAdminOverview>;
  },

  async updateDropshipAdminSettings(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }) as Promise<{ settings: DropshipAdminOverview['settings'] }>;
  },

  async getDropshipSuppliers(): Promise<Supplier[]> {
    const res = (await authedFetch('/commerce/dropship/admin/suppliers')) as { suppliers?: Supplier[] };
    return Array.isArray(res?.suppliers) ? res.suppliers : [];
  },

  async createDropshipSupplier(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ supplier: Supplier }>;
  },

  async updateDropshipSupplier(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/dropship/admin/suppliers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }) as Promise<{ supplier: Supplier }>;
  },

  async getDropshipAdminProducts(filters: DropshipCatalogFilters = {}): Promise<SupplierProduct[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const path = params.toString()
      ? `/commerce/dropship/admin/products?${params.toString()}`
      : '/commerce/dropship/admin/products';
    const res = (await authedFetch(path)) as { products?: SupplierProduct[] };
    return Array.isArray(res?.products) ? res.products : [];
  },

  async createDropshipProduct(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ product: SupplierProduct }>;
  },

  async updateDropshipProduct(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/dropship/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }) as Promise<{ product: SupplierProduct }>;
  },

  async importLegacyDropshipCatalog(payload: Record<string, unknown> = {}) {
    return authedFetch('/commerce/dropship/admin/products/import-legacy', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ ok: boolean; imported: number }>;
  },

  async getDropshipSellers(): Promise<SellerDropshipProfile[]> {
    const res = (await authedFetch('/commerce/dropship/admin/sellers')) as {
      sellers?: SellerDropshipProfile[];
    };
    return Array.isArray(res?.sellers) ? res.sellers : [];
  },

  async approveDropshipSeller(sellerId: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/dropship/admin/sellers/${encodeURIComponent(sellerId)}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ profile: SellerDropshipProfile }>;
  },

  async suspendDropshipSeller(sellerId: string, payload: Record<string, unknown> = {}) {
    return authedFetch(`/commerce/dropship/admin/sellers/${encodeURIComponent(sellerId)}/suspend`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ profile: SellerDropshipProfile }>;
  },

  async overrideDropshipOrder(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/dropship/admin/orders/${encodeURIComponent(id)}/override`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ order: DropshipOrder }>;
  },

  async getDropshipSettlements(): Promise<SupplierSettlement[]> {
    const res = (await authedFetch('/commerce/dropship/admin/settlements')) as {
      settlements?: SupplierSettlement[];
    };
    return Array.isArray(res?.settlements) ? res.settlements : [];
  },

  async createDropshipSettlement(payload: Record<string, unknown>) {
    return authedFetch('/commerce/dropship/admin/settlements', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ settlement: SupplierSettlement }>;
  },

  async updateDropshipSettlement(id: string, payload: Record<string, unknown>) {
    return authedFetch(`/commerce/dropship/admin/settlements/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }) as Promise<{ settlement: SupplierSettlement }>;
  }
};

export default commerceService;
