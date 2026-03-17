import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase';
import { shouldUseFirestoreFallback } from './dataMode';
import { localDb } from './localDb';

/**
 * Payment Status Types
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export type PaymentMethod = 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';

export type PaymentType = 'sale' | 'rental' | 'deposit' | 'security_deposit';

/**
 * Payment Request Interface
 */
export interface CreatePaymentRequest {
  amount: number;              // In cents/smallest denomination
  currency: string;            // ISO 4217 (USD, EUR, GBP, etc.)
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  
  // Related IDs
  buyerId: string;             // Customer
  sellerId: string;            // Seller
  listingId: string;           // Product/service
  orderId?: string;            // Order reference
  rentalOrderId?: string;      // For rental deposits

  // Optional details
  description?: string;
  receiptEmail?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment Record (Firestore document)
 */
export interface PaymentRecord {
  id: string;
  
  // Amount
  amount: number;
  amountRefunded?: number;
  currency: string;
  
  // Status & Type
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  
  // References
  buyerId: string;
  sellerId: string;
  listingId: string;
  orderId?: string;
  rentalOrderId?: string;
  stripePaymentId?: string;    // Stripe payment intent ID
  stripeChargeId?: string;     // Stripe charge ID
  paypalOrderId?: string;      // PayPal order ID
  
  // Details
  description?: string;
  receiptEmail?: string;
  receiptUrl?: string;
  
  // Fees & Commission
  stripeFee?: number;          // Stripe processing fee
  platformFee?: number;        // Urban Prime commission
  sellerReceives?: number;     // Amount seller gets (after fees)
  
  // Refund tracking
  refunds?: Array<{
    id: string;
    amount: number;
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'succeeded' | 'failed';
  }>;
  
  // Timeline
  createdAt: Timestamp;
  processedAt?: Timestamp;
  succeededAt?: Timestamp;
  refundedAt?: Timestamp;
  failureMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  version?: string;
}

/**
 * Payout Request (for seller withdrawals)
 */
export interface CreatePayoutRequest {
  sellerId: string;
  amount: number;              // Amount to withdraw
  currency: string;
  payoutMethod: 'stripe' | 'bank transfer' | 'paypal';
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    holderName: string;
  };
  paypalEmail?: string;
}

/**
 * Payout Record
 */
export interface PayoutRecord {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  payoutMethod: 'stripe' | 'bank transfer' | 'paypal';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  
  // External Reference
  stripePayoutId?: string;
  bankTransferId?: string;
  paypalTransactionId?: string;
  
  // Related Payments
  relatedPaymentIds: string[];
  
  // Fees
  fee?: number;               // Payout processing fee
  netAmount?: number;         // Amount after fees
  
  // Timeline
  createdAt: Timestamp;
  processedAt?: Timestamp;
  expectedDate?: Timestamp;
  paidAt?: Timestamp;
  failureReason?: string;
  
  metadata?: Record<string, any>;
}

class PaymentService {
  private collectionName = 'payments';
  private payoutsCollectionName = 'payouts';

  // Fee structure
  private stripeFeePercentage = 0.029;  // 2.9%
  private stripeFeeFixed = 0.30;        // $0.30
  private platformFeePercentage = 0.10; // 10% commission
  private payoutFeePercentage = 0.01;   // 1% withdrawal fee

  private shouldUseLocalFallback() {
    return !shouldUseFirestoreFallback();
  }

  /**
   * Create a payment intent
   * In real implementation, this would call Stripe/PayPal API
   */
  async createPaymentIntent(
    request: CreatePaymentRequest
  ): Promise<{ 
    paymentId: string; 
    paymentIntentId: string;
    clientSecret?: string;
    approval_url?: string; // For PayPal
  }> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const paymentId = `local-pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const paymentIntentId = `pi_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await localDb.upsert('orders', {
          id: paymentId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          paymentMethod: request.paymentMethod,
          paymentType: request.paymentType,
          buyerId: request.buyerId,
          sellerId: request.sellerId,
          listingId: request.listingId,
          orderId: request.orderId,
          rentalOrderId: request.rentalOrderId,
          description: request.description,
          createdAt: new Date().toISOString()
        });
        return {
          paymentId,
          paymentIntentId,
          clientSecret: `${paymentIntentId}_secret_local`
        };
      }

      // Validate input
      if (request.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!request.buyerId || !request.sellerId) {
        throw new Error('Buyer and seller IDs are required');
      }

      if (!request.listingId) {
        throw new Error('Listing ID is required');
      }

      // Calculate fees
      const fees = this.calculateFees(request.amount);

      // Create payment record in Firestore
      const paymentData: Omit<PaymentRecord, 'id'> = {
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        paymentMethod: request.paymentMethod,
        paymentType: request.paymentType,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        listingId: request.listingId,
        orderId: request.orderId,
        rentalOrderId: request.rentalOrderId,
        description: request.description,
        receiptEmail: request.receiptEmail,
        stripeFee: fees.stripeFee,
        platformFee: fees.platformFee,
        sellerReceives: fees.sellerReceives,
        refunds: [],
        createdAt: Timestamp.now(),
        metadata: request.metadata || {}
      };

      const paymentsRef = collection(db, this.collectionName);
      const docRef = await addDoc(paymentsRef, paymentData);

      // Generate payment intent ID (would use Stripe ID in production)
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update with payment intent ID
      await updateDoc(docRef, { stripePaymentId: paymentIntentId });

      return {
        paymentId: docRef.id,
        paymentIntentId,
        clientSecret: `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error('[paymentService] Error creating payment intent:', error);
      throw new Error(
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process a payment (mark as succeeded)
   */
  async processPayment(
    paymentId: string,
    stripeChargeId: string,
    receiptUrl?: string
  ): Promise<PaymentRecord> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payment = await localDb.getById<PaymentRecord>('orders', paymentId);
        const updated = {
          ...(payment || { id: paymentId, amount: 0, currency: 'USD' }),
          status: 'succeeded' as PaymentStatus,
          stripeChargeId,
          receiptUrl,
          processedAt: Timestamp.now(),
          succeededAt: Timestamp.now()
        } as PaymentRecord;
        await localDb.upsert('orders', updated);
        return updated;
      }

      const paymentRef = doc(db, this.collectionName, paymentId);
      const payment = await getDoc(paymentRef);

      if (!payment.exists()) {
        throw new Error('Payment not found');
      }

      const now = Timestamp.now();

      await updateDoc(paymentRef, {
        status: 'succeeded' as PaymentStatus,
        stripeChargeId,
        receiptUrl,
        processedAt: now,
        succeededAt: now
      });

      // Create corresponding order if this is an order payment
      // This would trigger order creation in rentalOrderService

      const updated = await getDoc(paymentRef);
      return {
        id: updated.id,
        ...updated.data()
      } as PaymentRecord;
    } catch (error) {
      console.error('[paymentService] Error processing payment:', error);
      throw new Error(
        `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle payment failure
   */
  async failPayment(
    paymentId: string,
    failureMessage: string
  ): Promise<void> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payment = await localDb.getById<PaymentRecord>('orders', paymentId);
        if (payment) {
          await localDb.upsert('orders', {
            ...payment,
            status: 'failed',
            failureMessage,
            processedAt: Timestamp.now()
          });
        }
        return;
      }

      const paymentRef = doc(db, this.collectionName, paymentId);

      await updateDoc(paymentRef, {
        status: 'failed' as PaymentStatus,
        failureMessage,
        processedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[paymentService] Error failing payment:', error);
      throw new Error(
        `Failed to mark payment as failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(
    paymentId: string,
    refundAmount: number,
    reason: string
  ): Promise<PaymentRecord> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payment = await localDb.getById<PaymentRecord>('orders', paymentId);
        if (!payment) {
          return {
            id: paymentId,
            amount: 0,
            currency: 'USD',
            status: 'refunded',
            paymentMethod: 'stripe',
            paymentType: 'sale',
            buyerId: '',
            sellerId: '',
            listingId: '',
            createdAt: Timestamp.now()
          } as PaymentRecord;
        }
        const refundRecord = {
          id: `ref_${Date.now()}`,
          amount: refundAmount,
          reason,
          createdAt: Timestamp.now(),
          status: 'pending' as const
        };
        const updated = {
          ...payment,
          amountRefunded: (payment.amountRefunded || 0) + refundAmount,
          status: 'refunded' as PaymentStatus,
          refunds: [...(payment.refunds || []), refundRecord],
          refundedAt: Timestamp.now()
        } as PaymentRecord;
        await localDb.upsert('orders', updated);
        return updated;
      }

      const paymentRef = doc(db, this.collectionName, paymentId);
      const payment = await getDoc(paymentRef);

      if (!payment.exists()) {
        throw new Error('Payment not found');
      }

      const paymentData = payment.data() as PaymentRecord;

      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > paymentData.amount) {
        throw new Error('Invalid refund amount');
      }

      const totalRefunded = (paymentData.amountRefunded || 0) + refundAmount;
      if (totalRefunded > paymentData.amount) {
        throw new Error('Refund exceeds original payment amount');
      }

      const refundRecord = {
        id: `ref_${Date.now()}`,
        amount: refundAmount,
        reason,
        createdAt: Timestamp.now(),
        status: 'pending' as const
      };

      const newStatus: PaymentStatus = 
        totalRefunded === paymentData.amount ? 'refunded' : 'partially_refunded';

      await updateDoc(paymentRef, {
        amountRefunded: totalRefunded,
        status: newStatus,
        refunds: [...(paymentData.refunds || []), refundRecord],
        refundedAt: Timestamp.now()
      });

      const updated = await getDoc(paymentRef);
      return {
        id: updated.id,
        ...updated.data()
      } as PaymentRecord;
    } catch (error) {
      console.error('[paymentService] Error refunding payment:', error);
      throw new Error(
        `Failed to refund payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payment record
   */
  async getPayment(paymentId: string): Promise<PaymentRecord | null> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        return (await localDb.getById<PaymentRecord>('orders', paymentId)) || null;
      }

      const paymentRef = doc(db, this.collectionName, paymentId);
      const payment = await getDoc(paymentRef);

      if (!payment.exists()) {
        return null;
      }

      return {
        id: payment.id,
        ...payment.data()
      } as PaymentRecord;
    } catch (error) {
      console.error('[paymentService] Error fetching payment:', error);
      throw new Error(
        `Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get buyer payment history
   */
  async getBuyerPayments(buyerId: string): Promise<PaymentRecord[]> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payments = await localDb.list<PaymentRecord>('orders');
        return payments.filter((payment) => payment.buyerId === buyerId);
      }

      const paymentsRef = collection(db, this.collectionName);
      const q = query(
        paymentsRef,
        where('buyerId', '==', buyerId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
    } catch (error) {
      console.error('[paymentService] Error fetching buyer payments:', error);
      throw new Error(
        `Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get seller payment history
   */
  async getSellerPayments(sellerId: string): Promise<PaymentRecord[]> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payments = await localDb.list<PaymentRecord>('orders');
        return payments.filter((payment) => payment.sellerId === sellerId);
      }

      const paymentsRef = collection(db, this.collectionName);
      const q = query(
        paymentsRef,
        where('sellerId', '==', sellerId),
        where('status', 'in', ['succeeded', 'partially_refunded']),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
    } catch (error) {
      console.error('[paymentService] Error fetching seller payments:', error);
      throw new Error(
        `Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate seller balance available for payout
   */
  async getSellerBalance(sellerId: string): Promise<{
    totalReceived: number;
    totalPaidOut: number;
    availableBalance: number;
    currency: string;
  }> {
    try {
      if (this.shouldUseLocalFallback()) {
        return {
          totalReceived: 0,
          totalPaidOut: 0,
          availableBalance: 0,
          currency: 'USD'
        };
      }

      // Get all successful payments for seller
      const payments = await this.getSellerPayments(sellerId);

      let totalReceived = 0;
      payments.forEach((payment) => {
        if (payment.sellerReceives) {
          totalReceived += payment.sellerReceives;
        }
      });

      // Get all completed payouts
      const payoutsRef = collection(db, this.payoutsCollectionName);
      const q = query(
        payoutsRef,
        where('sellerId', '==', sellerId),
        where('status', 'in', ['paid', 'processing'])
      );

      const payoutsSnapshot = await getDocs(q);
      let totalPaidOut = 0;
      payoutsSnapshot.docs.forEach((doc) => {
        const payout = doc.data() as PayoutRecord;
        totalPaidOut += payout.amount;
      });

      return {
        totalReceived,
        totalPaidOut,
        availableBalance: totalReceived - totalPaidOut,
        currency: 'USD'
      };
    } catch (error) {
      console.error('[paymentService] Error calculating balance:', error);
      throw new Error(
        `Failed to calculate balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a payout request
   */
  async createPayout(request: CreatePayoutRequest): Promise<PayoutRecord> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payoutId = `local-payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const payoutData: PayoutRecord = {
          id: payoutId,
          sellerId: request.sellerId,
          amount: request.amount,
          currency: request.currency,
          payoutMethod: request.payoutMethod,
          status: 'pending',
          relatedPaymentIds: [],
          createdAt: Timestamp.now()
        };
        await localDb.upsert('payouts', payoutData);
        return payoutData;
      }

      // Get seller balance
      const balance = await this.getSellerBalance(request.sellerId);

      if (request.amount <= 0) {
        throw new Error('Payout amount must be greater than 0');
      }

      if (request.amount > balance.availableBalance) {
        throw new Error('Insufficient balance for payout');
      }

      // Calculate payout fee
      const fee = Math.ceil(request.amount * this.payoutFeePercentage);
      const netAmount = request.amount - fee;

      // Get related payments (for tracking)
      const payments = await this.getSellerPayments(request.sellerId);
      const relatedPaymentIds = payments.map((p) => p.id);

      const payoutData: Omit<PayoutRecord, 'id'> = {
        sellerId: request.sellerId,
        amount: request.amount,
        currency: request.currency,
        payoutMethod: request.payoutMethod,
        status: 'pending',
        fee,
        netAmount,
        relatedPaymentIds,
        createdAt: Timestamp.now()
      };

      const payoutsRef = collection(db, this.payoutsCollectionName);
      const docRef = await addDoc(payoutsRef, payoutData);

      return {
        id: docRef.id,
        ...payoutData
      } as PayoutRecord;
    } catch (error) {
      console.error('[paymentService] Error creating payout:', error);
      throw new Error(
        `Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payout by ID
   */
  async getPayout(payoutId: string): Promise<PayoutRecord | null> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        return (await localDb.getById<PayoutRecord>('payouts', payoutId)) || null;
      }

      const payoutRef = doc(db, this.payoutsCollectionName, payoutId);
      const payout = await getDoc(payoutRef);

      if (!payout.exists()) {
        return null;
      }

      return {
        id: payout.id,
        ...payout.data()
      } as PayoutRecord;
    } catch (error) {
      console.error('[paymentService] Error fetching payout:', error);
      throw new Error(
        `Failed to fetch payout: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get seller payout history
   */
  async getSellerPayouts(sellerId: string): Promise<PayoutRecord[]> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payouts = await localDb.list<PayoutRecord>('payouts');
        return payouts.filter((payout) => payout.sellerId === sellerId);
      }

      const payoutsRef = collection(db, this.payoutsCollectionName);
      const q = query(
        payoutsRef,
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutRecord[];
    } catch (error) {
      console.error('[paymentService] Error fetching payouts:', error);
      throw new Error(
        `Failed to fetch payouts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update payout status
   */
  async updatePayoutStatus(
    payoutId: string,
    status: PayoutRecord['status'],
    externalId?: string,
    failureReason?: string
  ): Promise<PayoutRecord> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const payout = await localDb.getById<PayoutRecord>('payouts', payoutId);
        if (!payout) {
          return {
            id: payoutId,
            sellerId: '',
            amount: 0,
            currency: 'USD',
            payoutMethod: 'stripe',
            status,
            relatedPaymentIds: [],
            createdAt: Timestamp.now()
          } as PayoutRecord;
        }
        const updated = {
          ...payout,
          status,
          processedAt: Timestamp.now(),
          ...(externalId ? { stripePayoutId: externalId } : {}),
          ...(status === 'failed' && failureReason ? { failureReason } : {})
        } as PayoutRecord;
        await localDb.upsert('payouts', updated);
        return updated;
      }

      const payoutRef = doc(db, this.payoutsCollectionName, payoutId);
      const payout = await getDoc(payoutRef);

      if (!payout.exists()) {
        throw new Error('Payout not found');
      }

      const updateData: any = {
        status,
        processedAt: Timestamp.now()
      };

      if (externalId) {
        updateData.stripePayoutId = externalId;
      }

      if (status === 'paid') {
        updateData.paidAt = Timestamp.now();
      }

      if (status === 'failed' && failureReason) {
        updateData.failureReason = failureReason;
      }

      await updateDoc(payoutRef, updateData);

      const updated = await getDoc(payoutRef);
      return {
        id: updated.id,
        ...updated.data()
      } as PayoutRecord;
    } catch (error) {
      console.error('[paymentService] Error updating payout:', error);
      throw new Error(
        `Failed to update payout: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payment statistics for dashboard
   */
  async getPaymentStats(sellerId: string): Promise<{
    totalRevenue: number;
    thisMonth: number;
    thisWeek: number;
    averageOrderValue: number;
    totalOrders: number;
    successRate: number;
  }> {
    try {
      if (this.shouldUseLocalFallback()) {
        return {
          totalRevenue: 0,
          thisMonth: 0,
          thisWeek: 0,
          averageOrderValue: 0,
          totalOrders: 0,
          successRate: 0
        };
      }

      const payments = await this.getSellerPayments(sellerId);

      let totalRevenue = 0;
      let thisMonth = 0;
      let thisWeek = 0;
      let totalOrders = payments.length;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      payments.forEach((payment) => {
        const paymentDate = payment.succeededAt?.toDate?.() || new Date();

        if (payment.sellerReceives) {
          totalRevenue += payment.sellerReceives;

          if (paymentDate > monthAgo) {
            thisMonth += payment.sellerReceives;
          }

          if (paymentDate > weekAgo) {
            thisWeek += payment.sellerReceives;
          }
        }
      });

      const successRate = totalOrders > 0 ? (payments.filter(p => p.status === 'succeeded').length / totalOrders) * 100 : 0;

      return {
        totalRevenue,
        thisMonth,
        thisWeek,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalOrders,
        successRate: Math.round(successRate)
      };
    } catch (error) {
      console.error('[paymentService] Error calculating stats:', error);
      throw new Error(
        `Failed to calculate stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate fees for a payment
   */
  private calculateFees(amount: number): {
    stripeFee: number;
    platformFee: number;
    sellerReceives: number;
  } {
    const stripeFee = Math.ceil(amount * this.stripeFeePercentage + this.stripeFeeFixed);
    const platformFee = Math.ceil(amount * this.platformFeePercentage);
    const sellerReceives = amount - stripeFee - platformFee;

    return {
      stripeFee,
      platformFee,
      sellerReceives
    };
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount / 100);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

export default paymentService;
