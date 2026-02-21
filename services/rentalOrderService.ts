/**
 * Rental Order Service - Real Rental Tracking
 * Tracks all rental orders, payments, and lifecycle
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// TYPES
// ============================================================================

export type RentalStatus = 'pending' | 'confirmed' | 'active' | 'returned' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface RentalOrder {
  id?: string;
  storeId: string;
  customerId: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  rentalStart: Timestamp;
  rentalEnd: Timestamp;
  rentalDays: number;
  dailyRate: number;
  totalPrice: number;
  status: RentalStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  refundAmount?: number;
}

export interface PaymentRecord {
  id?: string;
  orderId: string;
  storeId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cash';
  status: PaymentStatus;
  transactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RentalRequest {
  id?: string;
  storeId: string;
  customerId: string;
  itemId: string;
  itemName: string;
  rentalStart: Timestamp;
  rentalEnd: Timestamp;
  message: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: Timestamp;
}

// ============================================================================
// SERVICE
// ============================================================================

class RentalOrderService {
  private readonly ORDERS_COLLECTION = 'rental_orders';
  private readonly PAYMENTS_COLLECTION = 'payments';
  private readonly REQUESTS_COLLECTION = 'rental_requests';

  /**
   * Create a new rental order
   */
  async createRentalOrder(orderData: Omit<RentalOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalOrder> {
    try {
      this.validateRentalOrder(orderData);

      const docRef = await addDoc(collection(db, this.ORDERS_COLLECTION), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...orderData,
        id: docRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to create rental order', error);
    }
  }

  /**
   * Update rental order status
   */
  async updateRentalOrderStatus(orderId: string, status: RentalStatus): Promise<RentalOrder | null> {
    try {
      const order = await this.getRentalOrder(orderId);
      if (!order) throw new Error('Order not found');

      // Validate status transitions
      this.validateStatusTransition(order.status, status);

      await updateDoc(doc(db, this.ORDERS_COLLECTION, orderId), {
        status,
        updatedAt: serverTimestamp(),
      });

      return { ...order, status, updatedAt: Timestamp.now() };
    } catch (error) {
      throw this.handleError('Failed to update order status', error);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, refundAmount?: number): Promise<void> {
    try {
      const updateData: any = {
        paymentStatus,
        updatedAt: serverTimestamp(),
      };

      if (paymentStatus === 'refunded' && refundAmount) {
        updateData.refundAmount = refundAmount;
      }

      await updateDoc(doc(db, this.ORDERS_COLLECTION, orderId), updateData);
    } catch (error) {
      throw this.handleError('Failed to update payment status', error);
    }
  }

  /**
   * Get rental order
   */
  async getRentalOrder(orderId: string): Promise<RentalOrder | null> {
    try {
      const docSnap = await getDoc(doc(db, this.ORDERS_COLLECTION, orderId));
      if (!docSnap.exists()) return null;

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as RentalOrder;
    } catch (error) {
      throw this.handleError('Failed to get rental order', error);
    }
  }

  /**
   * Get store's rental orders
   */
  async getStoreOrders(storeId: string, limit = 50): Promise<RentalOrder[]> {
    try {
      const q = query(
        collection(db, this.ORDERS_COLLECTION),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as RentalOrder));
    } catch (error) {
      throw this.handleError('Failed to get store orders', error);
    }
  }

  /**
   * Get store's recent requests
   */
  async getStoreRequests(storeId: string, limit = 10): Promise<RentalRequest[]> {
    try {
      const q = query(
        collection(db, this.REQUESTS_COLLECTION),
        where('storeId', '==', storeId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as RentalRequest));
    } catch (error) {
      throw this.handleError('Failed to get store requests', error);
    }
  }

  /**
   * Get customer's rental orders
   */
  async getCustomerOrders(customerId: string): Promise<RentalOrder[]> {
    try {
      const q = query(
        collection(db, this.ORDERS_COLLECTION),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as RentalOrder));
    } catch (error) {
      throw this.handleError('Failed to get customer orders', error);
    }
  }

  /**
   * Get store revenue (from completed and paid orders)
   */
  async getStoreRevenue(storeId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.ORDERS_COLLECTION),
        where('storeId', '==', storeId),
        where('paymentStatus', '==', 'completed')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.reduce((total, doc) => {
        const order = doc.data() as RentalOrder;
        return total + order.totalPrice;
      }, 0);
    } catch (error) {
      throw this.handleError('Failed to calculate store revenue', error);
    }
  }

  /**
   * Get store rental metrics
   */
  async getStoreMetrics(storeId: string) {
    try {
      const [allOrders, completedOrders, revenue] = await Promise.all([
        this.getStoreOrders(storeId, 1000),
        this.getStoreOrders(storeId, 1000).then((orders) =>
          orders.filter((o) => o.status === 'completed')
        ),
        this.getStoreRevenue(storeId),
      ]);

      const completedCount = completedOrders.length;
      const averageOrderValue = completedCount > 0 ? revenue / completedCount : 0;

      // Calculate return rate (items returned early)
      const returnedCount = allOrders.filter((o) => o.status === 'returned').length;
      const returnRate = allOrders.length > 0 ? (returnedCount / allOrders.length) * 100 : 0;

      // Calculate average rating (would come from reviews)
      const averageRating = 4.8; // TODO: Calculate from actual reviews

      // Get top items
      const itemStats = new Map<string, { name: string; rentals: number; revenue: number }>();
      completedOrders.forEach((order) => {
        const stat = itemStats.get(order.itemId) || { name: order.itemName, rentals: 0, revenue: 0 };
        stat.rentals += 1;
        stat.revenue += order.totalPrice;
        itemStats.set(order.itemId, stat);
      });

      const topItems = Array.from(itemStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((item) => ({
          itemId: item.name,
          name: item.name,
          rentals: item.rentals,
          revenue: item.revenue,
        }));

      return {
        totalRentals: allOrders.length,
        totalRevenue: revenue,
        completedRentals: completedCount,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        returnRate: Math.round(returnRate * 100) / 100,
        averageRating,
        topItems,
        customerCount: new Set(allOrders.map((o) => o.customerId)).size,
      };
    } catch (error) {
      throw this.handleError('Failed to get store metrics', error);
    }
  }

  /**
   * Create rental request
   */
  async createRentalRequest(requestData: Omit<RentalRequest, 'id' | 'createdAt'>): Promise<RentalRequest> {
    try {
      const docRef = await addDoc(collection(db, this.REQUESTS_COLLECTION), {
        ...requestData,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      return {
        ...requestData,
        id: docRef.id,
        status: 'pending',
        createdAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to create rental request', error);
    }
  }

  /**
   * Update rental request status
   */
  async updateRentalRequestStatus(requestId: string, status: 'approved' | 'declined'): Promise<void> {
    try {
      await updateDoc(doc(db, this.REQUESTS_COLLECTION, requestId), { status });
    } catch (error) {
      throw this.handleError('Failed to update rental request', error);
    }
  }

  /**
   * Record payment
   */
  async recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentRecord> {
    try {
      const docRef = await addDoc(collection(db, this.PAYMENTS_COLLECTION), {
        ...paymentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update order payment status
      await this.updatePaymentStatus(paymentData.orderId, paymentData.status);

      return {
        ...paymentData,
        id: docRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to record payment', error);
    }
  }

  /**
   * Validation Methods
   */

  private validateRentalOrder(data: any): void {
    if (!data.storeId || !data.customerId || !data.itemId) {
      throw new Error('Missing required fields: storeId, customerId, itemId');
    }

    if (data.totalPrice <= 0) {
      throw new Error('Total price must be greater than 0');
    }

    if (data.rentalStart >= data.rentalEnd) {
      throw new Error('Rental start date must be before end date');
    }

    if (data.rentalDays <= 0) {
      throw new Error('Rental duration must be at least 1 day');
    }
  }

  private validateStatusTransition(currentStatus: RentalStatus, newStatus: RentalStatus): void {
    const validTransitions: Record<RentalStatus, RentalStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['active', 'cancelled'],
      active: ['returned', 'cancelled'],
      returned: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private handleError(message: string, error: any): Error {
    console.error(`[RentalOrderService] ${message}:`, error);

    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }

    return new Error(message);
  }
}

export const rentalOrderService = new RentalOrderService();
