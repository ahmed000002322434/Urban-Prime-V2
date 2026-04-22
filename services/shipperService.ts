import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type { ShipperDashboardSnapshot } from '../types';

const emptySnapshot = (): ShipperDashboardSnapshot => ({
  generatedAt: new Date().toISOString(),
  summary: {
    activeShipments: 0,
    pendingPickup: 0,
    deliveredToday: 0,
    delayedShipments: 0
  },
  upcoming: []
});

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export const shipperService = {
  async getDashboardSnapshot(): Promise<ShipperDashboardSnapshot> {
    if (!isBackendConfigured() || shouldUseFirestoreFallback()) {
      return emptySnapshot();
    }

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
            buyerName: String(row.buyerName || row.buyer_name || '').trim() || '—',
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
      const userNameById = new Map<string, string>(users.map((u: any) => [String(u.id), String(u.name || 'Buyer')]));
      const orderById = new Map<string, any>(orders.map((o: any) => [String(o.id), o]));

      const active = shipments.filter((s: any) => ['in_transit', 'out_for_delivery', 'picked_up'].includes(String(s.status || '').toLowerCase()));
      const pendingPickup = shipments.filter((s: any) => ['pending_pickup', 'label_created'].includes(String(s.status || '').toLowerCase())).length;
      const deliveredToday = shipments.filter((s: any) => String(s.status || '').toLowerCase() === 'delivered' && isToday(String(s.updated_at || ''))).length;
      const delayed = shipments.filter((s: any) => {
        const eta = s.estimated_delivery ? new Date(String(s.estimated_delivery)).getTime() : 0;
        return eta > 0 && eta < Date.now() && !['delivered', 'cancelled', 'returned'].includes(String(s.status || '').toLowerCase());
      }).length;

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
      return emptySnapshot();
    }
  }
};

export default shipperService;
