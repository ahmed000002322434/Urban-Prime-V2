import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type { ShipperDashboardSnapshot, ShipperDeliveryQueueEntry } from '../types';

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isDelayedShipment = (status: string, eta?: string | null) => {
  if (!eta) return false;
  const etaMs = new Date(eta).getTime();
  if (!Number.isFinite(etaMs)) return false;
  return etaMs < Date.now() && !['delivered', 'cancelled', 'returned'].includes(String(status || '').toLowerCase());
};

const ensureLiveShippingMode = () => {
  if (!isBackendConfigured()) {
    throw new Error('Live shipping data requires the commerce backend connection.');
  }
  if (shouldUseFirestoreFallback()) {
    throw new Error('Live shipping data is unavailable while Firestore fallback mode is active.');
  }
};

export const shipperService = {
  async getDashboardSnapshot(): Promise<ShipperDashboardSnapshot> {
    ensureLiveShippingMode();

    try {
      const commerceSnapshot = await backendFetch('/commerce/shipper/snapshot');
      if (commerceSnapshot?.summary) {
        return {
          generatedAt: String(commerceSnapshot.generatedAt || new Date().toISOString()),
          summary: {
            activeShipments: Number(commerceSnapshot.summary.activeShipments || 0),
            pendingPickup: Number(commerceSnapshot.summary.pendingPickup || 0),
            deliveredToday: Number(commerceSnapshot.summary.deliveredToday || 0),
            delayedShipments: Number(commerceSnapshot.summary.delayedShipments || 0)
          },
          upcoming: (Array.isArray(commerceSnapshot.upcoming) ? commerceSnapshot.upcoming : []).map((row: any) => ({
            shipmentId: String(row.shipmentId || row.id || ''),
            orderId: String(row.orderId || row.order_id || ''),
            buyerName: String(row.buyerName || row.buyer_name || '').trim() || '--',
            eta: String(row.eta || row.created_at || new Date().toISOString()),
            status: String(row.status || ''),
            city: row.city ? String(row.city) : undefined
          }))
        };
      }

      const [shipmentsRes, ordersRes, usersRes] = await Promise.all([
        backendFetch('/api/shipments?select=id,order_id,status,carrier,tracking_number,estimated_delivery,updated_at&order=updated_at.desc&limit=100'),
        backendFetch('/api/orders?select=id,buyer_id,status,updated_at&order=updated_at.desc&limit=100'),
        backendFetch('/api/users?select=id,name&limit=200')
      ]);
      const shipments = Array.isArray(shipmentsRes?.data) ? shipmentsRes.data : [];
      const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      const users = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const userNameById = new Map<string, string>(users.map((user: any) => [String(user.id), String(user.name || 'Buyer')]));
      const orderById = new Map<string, any>(orders.map((order: any) => [String(order.id), order]));

      const active = shipments.filter((shipment: any) =>
        ['in_transit', 'out_for_delivery', 'picked_up'].includes(String(shipment.status || '').toLowerCase())
      );
      const pendingPickup = shipments.filter((shipment: any) =>
        ['pending_pickup', 'label_created'].includes(String(shipment.status || '').toLowerCase())
      ).length;
      const deliveredToday = shipments.filter(
        (shipment: any) =>
          String(shipment.status || '').toLowerCase() === 'delivered' && isToday(String(shipment.updated_at || ''))
      ).length;
      const delayed = shipments.filter((shipment: any) =>
        isDelayedShipment(String(shipment.status || ''), String(shipment.estimated_delivery || ''))
      ).length;

      const upcoming = active.slice(0, 12).map((shipment: any) => {
        const order = orderById.get(String(shipment.order_id));
        return {
          shipmentId: String(shipment.id || ''),
          orderId: String(shipment.order_id || ''),
          buyerName: userNameById.get(String(order?.buyer_id || '')) || 'Buyer',
          eta: String(shipment.estimated_delivery || order?.updated_at || new Date().toISOString()),
          status: String(shipment.status || 'in_transit'),
          city: ''
        };
      });

      return {
        generatedAt: new Date().toISOString(),
        summary: {
          activeShipments: active.length,
          pendingPickup,
          deliveredToday,
          delayedShipments: delayed
        },
        upcoming
      };
    } catch (error) {
      console.warn('Unable to load shipper dashboard snapshot:', error);
      throw error instanceof Error ? error : new Error('Unable to load shipper dashboard snapshot.');
    }
  },

  async getDeliveryQueue(): Promise<ShipperDeliveryQueueEntry[]> {
    ensureLiveShippingMode();

    try {
      const [shipmentsRes, ordersRes, orderItemsRes, rentalsRes, usersRes] = await Promise.all([
        backendFetch(
          '/api/shipments?select=id,order_id,status,carrier,tracking_number,estimated_delivery,updated_at,created_at&order=updated_at.desc&limit=150'
        ),
        backendFetch('/api/orders?select=id,buyer_id,status,updated_at,created_at&order=updated_at.desc&limit=150'),
        backendFetch('/api/order_items?select=id,order_id,listing_type,created_at&order=created_at.asc&limit=400'),
        backendFetch('/api/rental_bookings?select=id,order_id,order_item_id,created_at&order=created_at.asc&limit=400'),
        backendFetch('/api/users?select=id,name,email&limit=250')
      ]);

      const shipments = Array.isArray(shipmentsRes?.data) ? shipmentsRes.data : [];
      const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      const orderItems = Array.isArray(orderItemsRes?.data) ? orderItemsRes.data : [];
      const rentals = Array.isArray(rentalsRes?.data) ? rentalsRes.data : [];
      const users = Array.isArray(usersRes?.data) ? usersRes.data : [];

      const userById = new Map<string, any>(users.map((user: any) => [String(user.id || ''), user]));
      const orderById = new Map<string, any>(orders.map((order: any) => [String(order.id || ''), order]));

      const primaryDetailIdByOrderId = new Map<string, string>();
      const itemCountByOrderId = new Map<string, number>();

      for (const orderItem of orderItems) {
        const orderId = String(orderItem.order_id || '').trim();
        if (!orderId) continue;
        itemCountByOrderId.set(orderId, (itemCountByOrderId.get(orderId) || 0) + 1);
        if (!primaryDetailIdByOrderId.has(orderId)) {
          primaryDetailIdByOrderId.set(orderId, String(orderItem.id || ''));
        }
      }

      for (const rental of rentals) {
        const orderId = String(rental.order_id || '').trim();
        if (!orderId) continue;
        if (!primaryDetailIdByOrderId.has(orderId)) {
          primaryDetailIdByOrderId.set(orderId, String(rental.id || rental.order_item_id || ''));
        }
      }

      return shipments.map((shipment: any) => {
        const orderId = String(shipment.order_id || '');
        const order = orderById.get(orderId);
        const buyer = userById.get(String(order?.buyer_id || ''));
        const status = String(shipment.status || order?.status || 'processing').toLowerCase();
        const eta = String(
          shipment.estimated_delivery || order?.updated_at || shipment.updated_at || shipment.created_at || new Date().toISOString()
        );

        return {
          shipmentId: String(shipment.id || ''),
          orderId,
          detailId: primaryDetailIdByOrderId.get(orderId) || orderId,
          buyerName: String(buyer?.name || 'Buyer'),
          buyerEmail: buyer?.email ? String(buyer.email) : undefined,
          status,
          carrier: shipment?.carrier ? String(shipment.carrier) : undefined,
          trackingNumber: shipment?.tracking_number ? String(shipment.tracking_number) : undefined,
          eta,
          updatedAt: String(
            shipment.updated_at || order?.updated_at || shipment.created_at || new Date().toISOString()
          ),
          itemCount: itemCountByOrderId.get(orderId) || 0,
          delayed: isDelayedShipment(status, eta)
        };
      });
    } catch (error) {
      console.warn('Unable to load shipper delivery queue:', error);
      throw error instanceof Error ? error : new Error('Unable to load shipper delivery queue.');
    }
  }
};

export default shipperService;
