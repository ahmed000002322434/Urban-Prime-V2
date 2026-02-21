/**
 * Affiliate Commission Service - Real Affiliate Tracking
 * Tracks affiliate referrals, commissions, and payouts
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// TYPES
// ============================================================================

export type CommissionStatus = 'pending' | 'earned' | 'paid' | 'forfeited';
export type AffiliateStatus = 'new' | 'active' | 'paused' | 'suspended';

export interface AffiliateUser {
  id?: string;
  storeId: string;
  email: string;
  name: string;
  platform: string;
  audience: string;
  status: AffiliateStatus;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AffiliateLink {
  id?: string;
  storeId: string;
  affiliateId: string;
  link: string;
  customUrl: string;
  trackingCode: string;
  createdAt: Timestamp;
}

export interface AffiliateCommission {
  id?: string;
  storeId: string;
  affiliateId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  earnedAt: Timestamp;
  paidAt?: Timestamp;
  paymentMethod?: string;
}

export interface AffiliateStats {
  affiliateId: string;
  storeId: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalOrderAmount: number;
  totalCommissionsEarned: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  averageOrderValue: number;
  updatedAt: Timestamp;
}

// ============================================================================
// SERVICE
// ============================================================================

class AffiliateCommissionService {
  private readonly AFFILIATES_COLLECTION = 'affiliate_users';
  private readonly LINKS_COLLECTION = 'affiliate_links';
  private readonly COMMISSIONS_COLLECTION = 'affiliate_commissions';
  private readonly STATS_COLLECTION = 'affiliate_stats';
  private readonly CLICKS_COLLECTION = 'affiliate_clicks';

  /**
   * Register new affiliate
   */
  async registerAffiliate(affiliateData: Omit<AffiliateUser, 'id' | 'joinedAt' | 'updatedAt'>): Promise<AffiliateUser> {
    try {
      this.validateAffiliateData(affiliateData);

      const docRef = await addDoc(collection(db, this.AFFILIATES_COLLECTION), {
        ...affiliateData,
        status: 'new',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...affiliateData,
        id: docRef.id,
        status: 'new',
        joinedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to register affiliate', error);
    }
  }

  /**
   * Create affiliate link
   */
  async createAffiliateLink(affiliate: AffiliateUser): Promise<AffiliateLink> {
    try {
      if (!affiliate.id) throw new Error('Affiliate ID is required');

      const trackingCode = this.generateTrackingCode();
      const customUrl = `ref-${affiliate.name?.toLowerCase().replace(/\s+/g, '-')}-${trackingCode}`;

      const docRef = await addDoc(collection(db, this.LINKS_COLLECTION), {
        storeId: affiliate.storeId,
        affiliateId: affiliate.id,
        link: `${window.location.origin}?ref=${trackingCode}`,
        customUrl,
        trackingCode,
        createdAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        storeId: affiliate.storeId,
        affiliateId: affiliate.id,
        link: `${window.location.origin}?ref=${trackingCode}`,
        customUrl,
        trackingCode,
        createdAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to create affiliate link', error);
    }
  }

  /**
   * Track affiliate click
   */
  async trackAffiliateClick(trackingCode: string): Promise<void> {
    try {
      // Find affiliate by tracking code
      const linkQuery = query(
        collection(db, this.LINKS_COLLECTION),
        where('trackingCode', '==', trackingCode)
      );

      const linkSnapshot = await getDocs(linkQuery);
      if (linkSnapshot.empty) throw new Error('Invalid tracking code');

      const link = linkSnapshot.docs[0].data() as AffiliateLink;

      // Record click
      await addDoc(collection(db, this.CLICKS_COLLECTION), {
        storeId: link.storeId,
        affiliateId: link.affiliateId,
        trackingCode,
        ip: this.getClientIP(),
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
      });

      // Update stats
      await this.updateClickCount(link.affiliateId, link.storeId);
    } catch (error) {
      throw this.handleError('Failed to track affiliate click', error);
    }
  }

  /**
   * Record affiliate commission from order
   */
  async recordAffiliateCommission(trackingCode: string, orderId: string, orderAmount: number, commissionRate: number): Promise<AffiliateCommission | null> {
    try {
      // Find affiliate by tracking code
      const linkQuery = query(
        collection(db, this.LINKS_COLLECTION),
        where('trackingCode', '==', trackingCode)
      );

      const linkSnapshot = await getDocs(linkQuery);
      if (linkSnapshot.empty) return null;

      const link = linkSnapshot.docs[0].data() as AffiliateLink;

      const commissionAmount = (orderAmount * commissionRate) / 100;

      const docRef = await addDoc(collection(db, this.COMMISSIONS_COLLECTION), {
        storeId: link.storeId,
        affiliateId: link.affiliateId,
        orderId,
        orderAmount,
        commissionRate,
        commissionAmount,
        status: 'earned',
        earnedAt: serverTimestamp(),
      });

      // Update affiliate stats
      await this.updateAffiliateStats(link.affiliateId, link.storeId);

      return {
        id: docRef.id,
        storeId: link.storeId,
        affiliateId: link.affiliateId,
        orderId,
        orderAmount,
        commissionRate,
        commissionAmount,
        status: 'earned',
        earnedAt: Timestamp.now(),
      };
    } catch (error) {
      throw this.handleError('Failed to record affiliate commission', error);
    }
  }

  /**
   * Get affiliate stats
   */
  async getAffiliateStats(affiliateId: string, storeId: string): Promise<AffiliateStats | null> {
    try {
      const q = query(
        collection(db, this.STATS_COLLECTION),
        where('affiliateId', '==', affiliateId),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        affiliateId,
        storeId,
        ...doc.data(),
      } as AffiliateStats;
    } catch (error) {
      throw this.handleError('Failed to get affiliate stats', error);
    }
  }

  /**
   * Get all affiliates for store
   */
  async getStoreAffiliates(storeId: string): Promise<AffiliateUser[]> {
    try {
      const q = query(
        collection(db, this.AFFILIATES_COLLECTION),
        where('storeId', '==', storeId),
        orderBy('joinedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AffiliateUser));
    } catch (error) {
      throw this.handleError('Failed to get store affiliates', error);
    }
  }

  /**
   * Get affiliate commissions
   */
  async getAffiliateCommissions(affiliateId: string, status?: CommissionStatus): Promise<AffiliateCommission[]> {
    try {
      let q;

      if (status) {
        q = query(
          collection(db, this.COMMISSIONS_COLLECTION),
          where('affiliateId', '==', affiliateId),
          where('status', '==', status),
          orderBy('earnedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, this.COMMISSIONS_COLLECTION),
          where('affiliateId', '==', affiliateId),
          orderBy('earnedAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AffiliateCommission));
    } catch (error) {
      throw this.handleError('Failed to get affiliate commissions', error);
    }
  }

  /**
   * Mark commissions as paid
   */
  async markCommissionsAsPaid(commissionIds: string[], paymentMethod: string): Promise<void> {
    try {
      for (const commissionId of commissionIds) {
        await updateDoc(doc(db, this.COMMISSIONS_COLLECTION, commissionId), {
          status: 'paid',
          paidAt: serverTimestamp(),
          paymentMethod,
        });
      }
    } catch (error) {
      throw this.handleError('Failed to mark commissions as paid', error);
    }
  }

  /**
   * Get store affiliate performance
   */
  async getStoreAffiliatePerformance(storeId: string) {
    try {
      const affiliates = await this.getStoreAffiliates(storeId);

      const affiliateStats = await Promise.all(
        affiliates.map(async (affiliate) => {
          const commissions = await this.getAffiliateCommissions(affiliate.id!);
          const paidCommissions = commissions.filter((c) => c.status === 'paid');
          const pendingCommissions = commissions.filter((c) => c.status === 'pending' || c.status === 'earned');

          return {
            id: affiliate.id,
            name: affiliate.name,
            email: affiliate.email,
            platform: affiliate.platform,
            totalCommissionsEarned: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
            totalCommissionsPaid: paidCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
            pendingCommissions: pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
            conversions: commissions.length,
            status: affiliate.status,
          };
        })
      );

      const totalEarned = affiliateStats.reduce((sum, a) => sum + a.totalCommissionsEarned, 0);
      const totalPaid = affiliateStats.reduce((sum, a) => sum + a.totalCommissionsPaid, 0);
      const totalPending = affiliateStats.reduce((sum, a) => sum + a.pendingCommissions, 0);
      const totalConversions = affiliateStats.reduce((sum, a) => sum + a.conversions, 0);

      return {
        totalAffiliates: affiliates.length,
        totalConversions,
        totalEarned,
        totalPaid,
        totalPending,
        affiliates: affiliateStats,
      };
    } catch (error) {
      throw this.handleError('Failed to get store affiliate performance', error);
    }
  }

  /**
   * Update affiliate status
   */
  async updateAffiliateStatus(affiliateId: string, status: AffiliateStatus): Promise<void> {
    try {
      await updateDoc(doc(db, this.AFFILIATES_COLLECTION, affiliateId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw this.handleError('Failed to update affiliate status', error);
    }
  }

  /**
   * Private helper methods
   */

  private async updateClickCount(affiliateId: string, storeId: string): Promise<void> {
    try {
      const stats = await this.getAffiliateStats(affiliateId, storeId);

      if (stats?.id) {
        await updateDoc(doc(db, this.STATS_COLLECTION, stats.id), {
          totalClicks: (stats.totalClicks || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, this.STATS_COLLECTION), {
          affiliateId,
          storeId,
          totalClicks: 1,
          totalConversions: 0,
          conversionRate: 0,
          totalOrderAmount: 0,
          totalCommissionsEarned: 0,
          totalCommissionsPaid: 0,
          pendingCommissions: 0,
          averageOrderValue: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to update click count:', error);
    }
  }

  private async updateAffiliateStats(affiliateId: string, storeId: string): Promise<void> {
    try {
      const commissions = await this.getAffiliateCommissions(affiliateId);
      const paidCommissions = commissions.filter((c) => c.status === 'paid');
      const pendingCommissions = commissions.filter((c) => c.status === 'pending' || c.status === 'earned');

      const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const totalPaid = paidCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const totalOrderAmount = commissions.reduce((sum, c) => sum + c.orderAmount, 0);
      const avgOrderValue = commissions.length > 0 ? totalOrderAmount / commissions.length : 0;

      const stats = await this.getAffiliateStats(affiliateId, storeId);

      if (stats?.id) {
        await updateDoc(doc(db, this.STATS_COLLECTION, stats.id), {
          totalConversions: commissions.length,
          totalCommissionsEarned: totalEarned,
          totalCommissionsPaid: totalPaid,
          pendingCommissions: totalPending,
          totalOrderAmount,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          conversionRate: stats.totalClicks > 0 ? (commissions.length / stats.totalClicks) * 100 : 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to update affiliate stats:', error);
    }
  }

  private generateTrackingCode(): string {
    return `af_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // In production, use backend to get real IP
    return 'unknown';
  }

  private validateAffiliateData(data: any): void {
    if (!data.storeId || !data.email || !data.name || !data.platform) {
      throw new Error('Missing required fields: storeId, email, name, platform');
    }

    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.name.length < 2 || data.name.length > 100) {
      throw new Error('Name must be between 2 and 100 characters');
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private handleError(message: string, error: any): Error {
    console.error(`[AffiliateCommissionService] ${message}:`, error);

    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }

    return new Error(message);
  }
}

export const affiliateCommissionService = new AffiliateCommissionService();
