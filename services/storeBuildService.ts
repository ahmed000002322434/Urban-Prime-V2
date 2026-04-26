/**
 * Store Builder Service - Real Database Integration
 * Handles all store creation, customization, and management with Firestore
 * No placeholders - all data is real and persisted
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { backendFetch, isBackendConfigured, shouldUseBackend } from './backendClient';
import { resolveBackendUserId, resolveFrontendUserId } from './backendUserIdentity';
import { shouldUseFirestoreFallback } from './dataMode';
import { localDb } from './localDb';
import { toCamelCaseDeep, toSnakeCaseDeep } from '../utils/caseTransform';

// ============================================================================
// TYPES
// ============================================================================

export interface StoreBuildData {
  id?: string;
  userId: string;
  storeName: string;
  tagline: string;
  city: string;
  category: string;
  description: string;
  idealCustomer: string;
  theme: 'modern' | 'luxury' | 'eco' | 'playful';
  primaryColor: string;
  logoEmoji: string;
  story: string;
  mission: string;
  createdAt: any;
  updatedAt: any;
  publishedAt?: any;
  isPublished: boolean;
}

export interface StoreLayout {
  id?: string;
  storeId: string;
  sections: StoreSection[];
  createdAt: any;
  updatedAt: any;
}

export interface StoreSection {
  id: string;
  type: 'hero' | 'featured' | 'categories' | 'testimonials' | 'story' | 'newsletter' | 'faq' | 'trust';
  title: string;
  enabled: boolean;
  order: number;
  config?: Record<string, any>;
}

export interface AffiliateProgram {
  id?: string;
  storeId: string;
  userId: string;
  commissionRate: number;
  maxReward: number;
  platforms: string[];
  enableCookies: boolean;
  cookieDuration: number;
  isActive: boolean;
  minPayout?: number;
  approvalMode?: 'manual' | 'automatic';
  supportedSurfaces?: ('link' | 'coupon' | 'spotlight' | 'pixe' | 'seller_referral')[];
  sellerBonusAmount?: number;
  createdAt: any;
  updatedAt: any;
}

export interface StoreAnalytics {
  id?: string;
  storeId: string;
  totalRentals: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  returnRate: number;
  topItems: Array<{ itemId: string; name: string; rentals: number; revenue: number }>;
  customerCount: number;
  averageRating: number;
  weeklyData: Array<{ day: string; orders: number; revenue: number }>;
  updatedAt: any;
}

// ============================================================================
// SERVICE
// ============================================================================

class StoreBuildService {
  private readonly STORES_COLLECTION = 'stores_v2';
  private readonly LAYOUTS_COLLECTION = 'store_layouts';
  private readonly AFFILIATES_COLLECTION = 'affiliate_programs';
  private readonly ANALYTICS_COLLECTION = 'store_analytics';

  private shouldUseBackendPersistence() {
    return shouldUseBackend() && isBackendConfigured();
  }

  private shouldUseLocalFallback() {
    return !this.shouldUseBackendPersistence() && !shouldUseFirestoreFallback();
  }

  private async hydrateBackendOwnedRecord<T extends { userId?: string }>(record: T | null): Promise<T | null> {
    if (!this.shouldUseBackendPersistence() || !record) return record;

    const currentUserId = String(record.userId || '').trim();
    if (!currentUserId) return record;

    const frontendUserId = await resolveFrontendUserId(currentUserId);
    if (!frontendUserId || frontendUserId === currentUserId) return record;

    return {
      ...record,
      userId: frontendUserId
    };
  }

  /**
   * Create or update store setup data
   */
  async saveStoreSetup(userId: string, storeData: Omit<StoreBuildData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoreBuildData> {
    try {
      if (this.shouldUseBackendPersistence()) {
        this.validateStoreSetup(storeData);
        const existingStore = await this.getUserStore(userId);
        const backendUserId = await resolveBackendUserId(userId);
        const payload = toSnakeCaseDeep({
          ...storeData,
          userId: backendUserId || userId,
          isPublished: existingStore?.isPublished || Boolean(storeData.isPublished),
          updatedAt: new Date().toISOString(),
          createdAt: existingStore?.createdAt || new Date().toISOString(),
          publishedAt: existingStore?.publishedAt
        });

        if (existingStore?.id) {
          const response = await backendFetch(`/api/${this.STORES_COLLECTION}/${encodeURIComponent(existingStore.id)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          return (await this.hydrateBackendOwnedRecord(
            toCamelCaseDeep(response?.data || { ...payload, id: existingStore.id }) as StoreBuildData
          )) as StoreBuildData;
        }

        const response = await backendFetch(`/api/${this.STORES_COLLECTION}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        return (await this.hydrateBackendOwnedRecord(toCamelCaseDeep(rows[0] || payload) as StoreBuildData)) as StoreBuildData;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        this.validateStoreSetup(storeData);
        const existingStore = await this.getUserStore(userId);
        const storeDoc: StoreBuildData = {
          ...storeData,
          userId,
          isPublished: false,
          updatedAt: new Date().toISOString(),
          createdAt: existingStore?.createdAt || new Date().toISOString(),
        };
        const saved = await localDb.upsert('stores', { ...storeDoc, id: existingStore?.id || storeDoc.id });
        return { ...storeDoc, id: saved.id };
      }

      // Validate required fields
      this.validateStoreSetup(storeData);

      // Check if store already exists for this user
      const existingStore = await this.getUserStore(userId);

      const storeDoc: StoreBuildData = {
        ...storeData,
        userId,
        isPublished: false,
        updatedAt: serverTimestamp(),
        createdAt: existingStore?.createdAt || serverTimestamp(),
      };

      if (existingStore?.id) {
        // Update existing store
        await updateDoc(doc(db, this.STORES_COLLECTION, existingStore.id), storeDoc);
        return { ...storeDoc, id: existingStore.id };
      } else {
        // Create new store
        const docRef = await addDoc(collection(db, this.STORES_COLLECTION), storeDoc);
        return { ...storeDoc, id: docRef.id };
      }
    } catch (error) {
      throw this.handleError('Failed to save store setup', error);
    }
  }

  /**
   * Get user's store
   */
  async getUserStore(userId: string): Promise<StoreBuildData | null> {
    try {
      if (this.shouldUseBackendPersistence()) {
        const backendUserId = await resolveBackendUserId(userId);
        const response = await backendFetch(
          `/api/${this.STORES_COLLECTION}?eq.user_id=${encodeURIComponent(backendUserId || userId)}&limit=1`
        );
        const rows = Array.isArray(response?.data) ? response.data : [];
        return rows[0]
          ? ((await this.hydrateBackendOwnedRecord(toCamelCaseDeep(rows[0]) as StoreBuildData)) as StoreBuildData)
          : null;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const stores = await localDb.list<StoreBuildData>('stores');
        return stores.find((store) => store.userId === userId) || null;
      }

      const q = query(
        collection(db, this.STORES_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as StoreBuildData;
    } catch (error) {
      throw this.handleError('Failed to get user store', error);
    }
  }

  /**
   * Get store by ID
   */
  async getStore(storeId: string): Promise<StoreBuildData | null> {
    try {
      if (this.shouldUseBackendPersistence()) {
        const response = await backendFetch(
          `/api/${this.STORES_COLLECTION}?eq.id=${encodeURIComponent(storeId)}&limit=1`
        );
        const rows = Array.isArray(response?.data) ? response.data : [];
        return rows[0]
          ? ((await this.hydrateBackendOwnedRecord(toCamelCaseDeep(rows[0]) as StoreBuildData)) as StoreBuildData)
          : null;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        return (await localDb.getById<StoreBuildData>('stores', storeId)) || null;
      }

      const docSnap = await getDoc(doc(db, this.STORES_COLLECTION, storeId));
      if (!docSnap.exists()) return null;

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as StoreBuildData;
    } catch (error) {
      throw this.handleError('Failed to get store', error);
    }
  }

  /**
   * Save store layout/sections
   */
  async saveStoreLayout(storeId: string, sections: StoreSection[]): Promise<StoreLayout> {
    try {
      // Validate sections
      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('At least one section must be enabled');
      }

      if (this.shouldUseBackendPersistence()) {
        const existingLayout = await this.getStoreLayout(storeId);
        const payload = toSnakeCaseDeep({
          storeId,
          sections: sections.sort((a, b) => a.order - b.order),
          updatedAt: new Date().toISOString(),
          createdAt: existingLayout?.createdAt || new Date().toISOString()
        });

        if (existingLayout?.id) {
          const response = await backendFetch(`/api/${this.LAYOUTS_COLLECTION}/${encodeURIComponent(existingLayout.id)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          return toCamelCaseDeep(response?.data || { ...payload, id: existingLayout.id }) as StoreLayout;
        }

        const response = await backendFetch(`/api/${this.LAYOUTS_COLLECTION}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        return toCamelCaseDeep(rows[0] || payload) as StoreLayout;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const existingLayout = await this.getStoreLayout(storeId);
        const layoutData: Omit<StoreLayout, 'id'> = {
          storeId,
          sections: sections.sort((a, b) => a.order - b.order),
          updatedAt: new Date().toISOString(),
          createdAt: existingLayout?.createdAt || new Date().toISOString(),
        };
        const saved = await localDb.upsert('storeLayouts', { ...layoutData, id: existingLayout?.id });
        return { ...layoutData, id: saved.id };
      }

      const existingLayout = await this.getStoreLayout(storeId);

      const layoutData: Omit<StoreLayout, 'id'> = {
        storeId,
        sections: sections.sort((a, b) => a.order - b.order),
        updatedAt: serverTimestamp(),
        createdAt: existingLayout?.createdAt || serverTimestamp(),
      };

      if (existingLayout?.id) {
        await updateDoc(doc(db, this.LAYOUTS_COLLECTION, existingLayout.id), layoutData);
        return { ...layoutData, id: existingLayout.id };
      } else {
        const docRef = await addDoc(collection(db, this.LAYOUTS_COLLECTION), layoutData);
        return { ...layoutData, id: docRef.id };
      }
    } catch (error) {
      throw this.handleError('Failed to save store layout', error);
    }
  }

  /**
   * Get store layout
   */
  async getStoreLayout(storeId: string): Promise<StoreLayout | null> {
    try {
      if (this.shouldUseBackendPersistence()) {
        const response = await backendFetch(
          `/api/${this.LAYOUTS_COLLECTION}?eq.store_id=${encodeURIComponent(storeId)}&limit=1`
        );
        const rows = Array.isArray(response?.data) ? response.data : [];
        return rows[0] ? (toCamelCaseDeep(rows[0]) as StoreLayout) : null;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const layouts = await localDb.list<StoreLayout>('storeLayouts');
        return layouts.find((layout) => layout.storeId === storeId) || null;
      }

      const q = query(
        collection(db, this.LAYOUTS_COLLECTION),
        where('storeId', '==', storeId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as StoreLayout;
    } catch (error) {
      throw this.handleError('Failed to get store layout', error);
    }
  }

  /**
   * Save affiliate program settings
   */
  async saveAffiliateProgram(storeId: string, userId: string, affiliateData: Omit<AffiliateProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<AffiliateProgram> {
    try {
      // Validate affiliate data
      if (affiliateData.commissionRate < 5 || affiliateData.commissionRate > 50) {
        throw new Error('Commission rate must be between 5% and 50%');
      }
      if (!Array.isArray(affiliateData.platforms) || affiliateData.platforms.length === 0) {
        throw new Error('At least one platform must be selected');
      }

      if (this.shouldUseBackendPersistence()) {
        const existingAffiliate = await this.getAffiliateProgram(storeId);
        const backendUserId = await resolveBackendUserId(userId);
        const payload = toSnakeCaseDeep({
          storeId,
          userId: backendUserId || userId,
          ...affiliateData,
          updatedAt: new Date().toISOString(),
          createdAt: existingAffiliate?.createdAt || new Date().toISOString()
        });

        if (existingAffiliate?.id) {
          const response = await backendFetch(`/api/${this.AFFILIATES_COLLECTION}/${encodeURIComponent(existingAffiliate.id)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          return (await this.hydrateBackendOwnedRecord(
            toCamelCaseDeep(response?.data || { ...payload, id: existingAffiliate.id }) as AffiliateProgram
          )) as AffiliateProgram;
        }

        const response = await backendFetch(`/api/${this.AFFILIATES_COLLECTION}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        return (await this.hydrateBackendOwnedRecord(toCamelCaseDeep(rows[0] || payload) as AffiliateProgram)) as AffiliateProgram;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const existingAffiliate = await this.getAffiliateProgram(storeId);
        const affiliateDoc: Omit<AffiliateProgram, 'id'> = {
          storeId,
          userId,
          ...affiliateData,
          updatedAt: new Date().toISOString(),
          createdAt: existingAffiliate?.createdAt || new Date().toISOString(),
        };
        const saved = await localDb.upsert('affiliatePrograms', { ...affiliateDoc, id: existingAffiliate?.id });
        return { ...affiliateDoc, id: saved.id };
      }

      const existingAffiliate = await this.getAffiliateProgram(storeId);

      const affiliateDoc: Omit<AffiliateProgram, 'id'> = {
        storeId,
        userId,
        ...affiliateData,
        updatedAt: serverTimestamp(),
        createdAt: existingAffiliate?.createdAt || serverTimestamp(),
      };

      if (existingAffiliate?.id) {
        await updateDoc(doc(db, this.AFFILIATES_COLLECTION, existingAffiliate.id), affiliateDoc);
        return { ...affiliateDoc, id: existingAffiliate.id };
      } else {
        const docRef = await addDoc(collection(db, this.AFFILIATES_COLLECTION), affiliateDoc);
        return { ...affiliateDoc, id: docRef.id };
      }
    } catch (error) {
      throw this.handleError('Failed to save affiliate program', error);
    }
  }

  /**
   * Get affiliate program
   */
  async getAffiliateProgram(storeId: string): Promise<AffiliateProgram | null> {
    try {
      if (this.shouldUseBackendPersistence()) {
        const response = await backendFetch(
          `/api/${this.AFFILIATES_COLLECTION}?eq.store_id=${encodeURIComponent(storeId)}&limit=1`
        );
        const rows = Array.isArray(response?.data) ? response.data : [];
        return rows[0]
          ? ((await this.hydrateBackendOwnedRecord(toCamelCaseDeep(rows[0]) as AffiliateProgram)) as AffiliateProgram)
          : null;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const programs = await localDb.list<AffiliateProgram>('affiliatePrograms');
        return programs.find((program) => program.storeId === storeId) || null;
      }

      const q = query(
        collection(db, this.AFFILIATES_COLLECTION),
        where('storeId', '==', storeId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as AffiliateProgram;
    } catch (error) {
      throw this.handleError('Failed to get affiliate program', error);
    }
  }

  /**
   * Publish store (make it live)
   */
  async publishStore(storeId: string): Promise<StoreBuildData> {
    try {
      const store = await this.getStore(storeId);
      if (!store) throw new Error('Store not found');

      // Validate store is complete
      this.validateStoreSetup(store);

      if (this.shouldUseBackendPersistence()) {
        const response = await backendFetch(`/api/${this.STORES_COLLECTION}/${encodeURIComponent(storeId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            is_published: true,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        return toCamelCaseDeep(response?.data || { ...store, isPublished: true, publishedAt: new Date().toISOString() }) as StoreBuildData;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const updated = await localDb.upsert('stores', {
          ...store,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return updated as StoreBuildData;
      }

      const docRef = doc(db, this.STORES_COLLECTION, storeId);
      await updateDoc(docRef, {
        isPublished: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { ...store, isPublished: true, publishedAt: serverTimestamp() };
    } catch (error) {
      throw this.handleError('Failed to publish store', error);
    }
  }

  /**
   * Unpublish store (take it offline)
   */
  async unpublishStore(storeId: string): Promise<void> {
    try {
      if (this.shouldUseBackendPersistence()) {
        await backendFetch(`/api/${this.STORES_COLLECTION}/${encodeURIComponent(storeId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            is_published: false,
            updated_at: new Date().toISOString()
          })
        });
        return;
      }

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const store = await this.getStore(storeId);
        if (!store) return;
        await localDb.upsert('stores', {
          ...store,
          isPublished: false,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const docRef = doc(db, this.STORES_COLLECTION, storeId);
      await updateDoc(docRef, {
        isPublished: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw this.handleError('Failed to unpublish store', error);
    }
  }

  /**
   * Get store analytics
   */
  async getStoreAnalytics(storeId: string): Promise<StoreAnalytics | null> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const analytics = await localDb.list<StoreAnalytics>('storeAnalytics');
        return analytics.find((entry) => entry.storeId === storeId) || null;
      }

      const q = query(
        collection(db, this.ANALYTICS_COLLECTION),
        where('storeId', '==', storeId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as StoreAnalytics;
    } catch (error) {
      throw this.handleError('Failed to get store analytics', error);
    }
  }

  /**
   * Update store analytics (called from backend)
   */
  async updateStoreAnalytics(storeId: string, analyticsData: Partial<Omit<StoreAnalytics, 'id' | 'storeId'>>): Promise<StoreAnalytics> {
    try {
      const existing = await this.getStoreAnalytics(storeId);

      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        const analyticsDoc: Omit<StoreAnalytics, 'id'> = {
          storeId,
          totalRentals: analyticsData.totalRentals || existing?.totalRentals || 0,
          totalRevenue: analyticsData.totalRevenue || existing?.totalRevenue || 0,
          averageOrderValue: analyticsData.averageOrderValue || existing?.averageOrderValue || 0,
          conversionRate: analyticsData.conversionRate || existing?.conversionRate || 0,
          returnRate: analyticsData.returnRate || existing?.returnRate || 0,
          topItems: analyticsData.topItems || existing?.topItems || [],
          customerCount: analyticsData.customerCount || existing?.customerCount || 0,
          averageRating: analyticsData.averageRating || existing?.averageRating || 0,
          weeklyData: analyticsData.weeklyData || existing?.weeklyData || [],
          updatedAt: new Date().toISOString(),
        };
        const saved = await localDb.upsert('storeAnalytics', { ...analyticsDoc, id: existing?.id });
        return saved as StoreAnalytics;
      }

      const analyticsDoc: Omit<StoreAnalytics, 'id'> = {
        storeId,
        totalRentals: analyticsData.totalRentals || existing?.totalRentals || 0,
        totalRevenue: analyticsData.totalRevenue || existing?.totalRevenue || 0,
        averageOrderValue: analyticsData.averageOrderValue || existing?.averageOrderValue || 0,
        conversionRate: analyticsData.conversionRate || existing?.conversionRate || 0,
        returnRate: analyticsData.returnRate || existing?.returnRate || 0,
        topItems: analyticsData.topItems || existing?.topItems || [],
        customerCount: analyticsData.customerCount || existing?.customerCount || 0,
        averageRating: analyticsData.averageRating || existing?.averageRating || 0,
        weeklyData: analyticsData.weeklyData || existing?.weeklyData || [],
        updatedAt: serverTimestamp(),
      };

      if (existing?.id) {
        await updateDoc(doc(db, this.ANALYTICS_COLLECTION, existing.id), analyticsDoc);
        return { ...analyticsDoc, id: existing.id };
      } else {
        const docRef = await addDoc(collection(db, this.ANALYTICS_COLLECTION), analyticsDoc);
        return { ...analyticsDoc, id: docRef.id };
      }
    } catch (error) {
      throw this.handleError('Failed to update store analytics', error);
    }
  }

  /**
   * Delete store and all related data
   */
  async deleteStore(storeId: string): Promise<void> {
    try {
      if (this.shouldUseLocalFallback()) {
        await localDb.init();
        await localDb.remove('stores', storeId);
        const layouts = await localDb.list<StoreLayout>('storeLayouts');
        const layout = layouts.find((entry) => entry.storeId === storeId);
        if (layout?.id) await localDb.remove('storeLayouts', layout.id);
        const affiliates = await localDb.list<AffiliateProgram>('affiliatePrograms');
        const affiliate = affiliates.find((entry) => entry.storeId === storeId);
        if (affiliate?.id) await localDb.remove('affiliatePrograms', affiliate.id);
        const analytics = await localDb.list<StoreAnalytics>('storeAnalytics');
        const analyticsRow = analytics.find((entry) => entry.storeId === storeId);
        if (analyticsRow?.id) await localDb.remove('storeAnalytics', analyticsRow.id);
        return;
      }

      const batch = writeBatch(db);

      // Delete store
      batch.delete(doc(db, this.STORES_COLLECTION, storeId));

      // Delete layout
      const layout = await this.getStoreLayout(storeId);
      if (layout?.id) {
        batch.delete(doc(db, this.LAYOUTS_COLLECTION, layout.id));
      }

      // Delete affiliate program
      const affiliate = await this.getAffiliateProgram(storeId);
      if (affiliate?.id) {
        batch.delete(doc(db, this.AFFILIATES_COLLECTION, affiliate.id));
      }

      // Delete analytics
      const analytics = await this.getStoreAnalytics(storeId);
      if (analytics?.id) {
        batch.delete(doc(db, this.ANALYTICS_COLLECTION, analytics.id));
      }

      await batch.commit();
    } catch (error) {
      throw this.handleError('Failed to delete store', error);
    }
  }

  /**
   * Validation Methods
   */

  private validateStoreSetup(data: any): void {
    const requiredFields = ['storeName', 'tagline', 'city', 'category', 'description', 'theme', 'primaryColor', 'logoEmoji', 'story', 'mission'];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate store name length
    if (data.storeName.length < 3 || data.storeName.length > 50) {
      throw new Error('Store name must be between 3 and 50 characters');
    }

    // Validate color format
    if (!/^#[0-9A-F]{6}$/i.test(data.primaryColor)) {
      throw new Error('Invalid color format');
    }

    // Validate theme
    if (!['modern', 'luxury', 'eco', 'playful'].includes(data.theme)) {
      throw new Error('Invalid theme selected');
    }

    // Validate category
    if (data.category.trim() === '') {
      throw new Error('Category must be selected');
    }

    // Validate description length
    if (data.description.length < 10 || data.description.length > 500) {
      throw new Error('Description must be between 10 and 500 characters');
    }

    // Validate story and mission
    if (data.story.length < 20 || data.story.length > 1000) {
      throw new Error('Story must be between 20 and 1000 characters');
    }

    if (data.mission.length < 20 || data.mission.length > 500) {
      throw new Error('Mission must be between 20 and 500 characters');
    }
  }

  private handleError(message: string, error: any): Error {
    console.error(`[StoreBuildService] ${message}:`, error);
    
    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }

    return new Error(message);
  }
}

export const storeBuildService = new StoreBuildService();
