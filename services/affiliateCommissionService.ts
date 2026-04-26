import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Affiliate,
  AffiliateCampaign,
  AffiliateCoupon,
  AffiliateEarning,
  AffiliateLink,
  AffiliateProfile,
  AffiliateSourceSurface,
  CartItem,
  ContentReviewSubmission,
  CreativeAsset,
  ExternalProductSubmission,
  User
} from '../types';
import { backendFetch, isBackendConfigured, shouldUseBackend } from './backendClient';
import { resolveBackendUserId, resolveBackendUserLookupKeys, resolveFrontendUserId } from './backendUserIdentity';
import { localDb, type LocalDbStore } from './localDb';
import { shouldUseFirestoreFallback } from './dataMode';
import { spotlightService } from './spotlightService';
import { storeBuildService, type AffiliateProgram } from './storeBuildService';
import { toCamelCaseDeep, toSnakeCaseDeep } from '../utils/caseTransform';

type AffiliateStatus = 'new' | 'active' | 'paused' | 'suspended';
type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed';

type AffiliatePartnerRecord = {
  id?: string;
  userId: string;
  storeId: string | null;
  programId?: string | null;
  name: string;
  email: string;
  platform: string;
  audience: string;
  status: AffiliateStatus;
  joinedAt: string;
  updatedAt: string;
  commissionRate: number;
  minPayout: number;
  approvalMode: 'manual' | 'automatic';
  supportedSurfaces: AffiliateSourceSurface[];
  lastClickAt?: string;
  lastConversionAt?: string;
  lastPayoutAt?: string;
};

type AffiliateLinkRecord = Omit<AffiliateLink, 'id'> & {
  id?: string;
  trackingCode: string;
  destinationUrl: string;
  sourceSurface: AffiliateSourceSurface;
  status: 'active' | 'paused';
  createdAt: string;
};

type AffiliateCouponRecord = Omit<AffiliateCoupon, 'id'> & {
  id?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
};

type AffiliateCommissionRecord = {
  id?: string;
  userId: string;
  affiliateId?: string;
  orderId: string;
  bookingId?: string | null;
  orderItemId?: string;
  itemId?: string | null;
  storeId?: string | null;
  programId?: string | null;
  sourceSurface?: AffiliateSourceSurface;
  eventType: 'sale_conversion' | 'rental_conversion' | 'seller_bonus';
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  description: string;
  linkId?: string;
  couponId?: string;
  trackingCode?: string;
  walletTransactionId?: string;
  createdAt: string;
  releasedAt?: string;
  reversalReason?: string;
};

type AffiliateClickRecord = {
  id?: string;
  userId: string;
  affiliateId?: string;
  linkId?: string;
  trackingCode?: string;
  storeId?: string | null;
  itemId?: string | null;
  sourceSurface: AffiliateSourceSurface;
  destinationUrl?: string;
  path?: string;
  createdAt: string;
  expiresAt?: string;
  referrer?: string;
};

type AffiliateSubmissionRecord = {
  id?: string;
  userId: string;
  url: string;
  type: 'product' | 'review';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type ReferralSession = {
  affiliateId?: string;
  affiliateUserId: string;
  linkId?: string;
  couponId?: string;
  trackingCode?: string;
  storeId?: string | null;
  itemId?: string | null;
  sourceSurface: AffiliateSourceSurface;
  destinationUrl?: string;
  createdAt: string;
  expiresAt?: string;
};

type DashboardData = {
  affiliate: Affiliate;
  earnings: AffiliateEarning[];
  links: AffiliateLink[];
  coupons: AffiliateCoupon[];
  assets: CreativeAsset[];
  leaderboard: Array<Affiliate & { name: string; avatar: string }>;
  campaigns: AffiliateCampaign[];
  submissions: {
    products: ExternalProductSubmission[];
    reviews: ContentReviewSubmission[];
  };
};

type AttributionCandidate = {
  affiliateUserId: string;
  affiliateId?: string;
  linkId?: string;
  couponId?: string;
  trackingCode?: string;
  sourceSurface: AffiliateSourceSurface;
  commissionRate: number;
  priority: number;
  createdAt: string;
};

const DEFAULT_MIN_PAYOUT = 50;
const DEFAULT_COOKIE_DAYS = 30;
const DEFAULT_SELLER_BONUS = 25;
const REFERRAL_STORAGE_KEY = 'urbanprime_affiliate_referral';
const CLICK_DEDUP_PREFIX = 'urbanprime_affiliate_click_';

const LINK_SURFACES: AffiliateSourceSurface[] = ['link', 'coupon', 'spotlight', 'pixe', 'seller_referral'];
const nowIso = () => new Date().toISOString();

const addDays = (value: string, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + Math.max(1, days));
  return date.toISOString();
};

const stripUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    ) as T;
  }
  return value;
};

const getOrigin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://urbanprime.com');

const normalizeRatePercent = (value: number | undefined | null) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric <= 1 ? numeric * 100 : numeric;
};

const toUnitRate = (value: number | undefined | null) => normalizeRatePercent(value) / 100;

const randomCode = (prefix: string) =>
  `${prefix}${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-4)}`.toUpperCase();

const safeDate = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapBackendAffiliateProfileUser = (userId: string, userRow: any, affiliateProfileRow: any): User | null => {
  if (!userRow && !affiliateProfileRow) return null;

  const identityName = String(userRow?.name || affiliateProfileRow?.display_name || 'Affiliate').trim() || 'Affiliate';
  const identityEmail = String(userRow?.email || '').trim();
  const affiliateProfile =
    affiliateProfileRow?.affiliate_profile && typeof affiliateProfileRow.affiliate_profile === 'object'
      ? (affiliateProfileRow.affiliate_profile as AffiliateProfile)
      : undefined;

  return {
    id: String(userRow?.firebase_uid || userId || userRow?.id || ''),
    name: identityName,
    email: identityEmail,
    avatar: String(userRow?.avatar_url || '/icons/urbanprime.svg'),
    phone: String(userRow?.phone || ''),
    status: (String(userRow?.status || 'active') as User['status']) || 'active',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: String(userRow?.created_at || affiliateProfileRow?.created_at || new Date().toISOString()),
    accountLifecycle: 'member',
    capabilities: {
      buy: 'active',
      rent: 'active',
      sell: 'inactive',
      provide_service: 'inactive',
      affiliate: Boolean(affiliateProfileRow?.is_affiliate || affiliateProfileRow?.onboarding_completed || affiliateProfile) ? 'active' : 'inactive',
      ship: 'inactive'
    },
    walletBalance: affiliateProfileRow?.wallet_balance !== undefined ? Number(affiliateProfileRow.wallet_balance || 0) : undefined,
    processingBalance: affiliateProfileRow?.processing_balance !== undefined ? Number(affiliateProfileRow.processing_balance || 0) : undefined,
    heldDeposits: affiliateProfileRow?.held_deposits !== undefined ? Number(affiliateProfileRow.held_deposits || 0) : undefined,
    isAffiliate: Boolean(affiliateProfileRow?.is_affiliate || affiliateProfileRow?.onboarding_completed || affiliateProfile),
    affiliateOnboardingCompleted: Boolean(affiliateProfileRow?.onboarding_completed),
    affiliateProfile,
    pendingAffiliateReferral: affiliateProfileRow?.pending_referral || undefined,
    affiliateTier: affiliateProfileRow?.affiliate_tier || undefined
  };
};

class AffiliateCommissionService {
  private readonly affiliateUsersStore: LocalDbStore = 'affiliateUsers';
  private readonly affiliateLinksStore: LocalDbStore = 'affiliateLinks';
  private readonly affiliateCouponsStore: LocalDbStore = 'affiliateCoupons';
  private readonly affiliateCommissionsStore: LocalDbStore = 'affiliateCommissions';
  private readonly affiliateClicksStore: LocalDbStore = 'affiliateClicks';
  private readonly affiliateSubmissionsStore: LocalDbStore = 'affiliateSubmissions';
  private readonly usersStore: LocalDbStore = 'users';
  private readonly itemsStore: LocalDbStore = 'items';
  private readonly bookingsStore: LocalDbStore = 'bookings';

  private readonly AFFILIATE_USERS_COLLECTION = 'affiliate_users';
  private readonly AFFILIATE_LINKS_COLLECTION = 'affiliate_links';
  private readonly AFFILIATE_COUPONS_COLLECTION = 'affiliate_coupons';
  private readonly AFFILIATE_COMMISSIONS_COLLECTION = 'affiliate_commissions';
  private readonly AFFILIATE_CLICKS_COLLECTION = 'affiliate_clicks';
  private readonly AFFILIATE_SUBMISSIONS_COLLECTION = 'affiliate_submissions';

  private shouldUseBackendPersistence() {
    return shouldUseBackend() && isBackendConfigured();
  }

  private shouldUseLocalFallback() {
    return !this.shouldUseBackendPersistence() && !shouldUseFirestoreFallback();
  }

  private async normalizeBackendRecordUserId<T>(record: T): Promise<T> {
    if (!this.shouldUseBackendPersistence() || !record || typeof record !== 'object' || !('userId' in (record as any))) {
      return record;
    }

    const currentUserId = String((record as any).userId || '').trim();
    if (!currentUserId) return record;

    const backendUserId = await resolveBackendUserId(currentUserId);
    if (!backendUserId || backendUserId === currentUserId) return record;

    return { ...(record as any), userId: backendUserId } as T;
  }

  private async hydrateBackendRecordUserId<T>(record: T): Promise<T> {
    if (!this.shouldUseBackendPersistence() || !record || typeof record !== 'object' || !('userId' in (record as any))) {
      return record;
    }

    const currentUserId = String((record as any).userId || '').trim();
    if (!currentUserId) return record;

    const frontendUserId = await resolveFrontendUserId(currentUserId);
    if (!frontendUserId || frontendUserId === currentUserId) return record;

    return { ...(record as any), userId: frontendUserId } as T;
  }

  private async hydrateBackendRecordUserIds<T>(records: T[]): Promise<T[]> {
    if (!this.shouldUseBackendPersistence() || records.length === 0) return records;
    return Promise.all(records.map((record) => this.hydrateBackendRecordUserId(record)));
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return '';
  }

  private normalizeAffiliateLinkPersistenceError(error: unknown) {
    const message = this.getErrorMessage(error).toLowerCase();
    if (
      message.includes('affiliate_links') &&
      message.includes('affiliate_id') &&
      (message.includes('not-null') || message.includes('not null') || message.includes('foreign key constraint'))
    ) {
      return new Error(
        'Tracked links are blocked by an outdated affiliate database schema. Run the updated affiliate workflow SQL, then refresh.'
      );
    }
    return error instanceof Error ? error : new Error('Failed to generate affiliate link.');
  }

  private async listRecords<T>(store: LocalDbStore, collectionName: string): Promise<T[]> {
    if (this.shouldUseBackendPersistence()) {
      const response = await backendFetch(`/api/${collectionName}?limit=200`);
      const rows = Array.isArray(response?.data) ? response.data : [];
      const records = rows.map((entry: any) => toCamelCaseDeep(entry) as T);
      return this.hydrateBackendRecordUserIds(records);
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return (await localDb.list<T & { id?: string }>(store)) as T[];
    }

    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as T);
  }

  private async getRecordById<T>(store: LocalDbStore, collectionName: string, id: string): Promise<T | null> {
    if (!id) return null;

    if (this.shouldUseBackendPersistence()) {
      const response = await backendFetch(`/api/${collectionName}?eq.id=${encodeURIComponent(id)}&limit=1`);
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (!rows[0]) return null;
      return this.hydrateBackendRecordUserId(toCamelCaseDeep(rows[0]) as T);
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return (await localDb.getById<T & { id?: string }>(store, id)) as T | null;
    }

    const snapshot = await getDoc(doc(db, collectionName, id));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
  }

  private async saveRecord<T extends { id?: string }>(store: LocalDbStore, collectionName: string, record: T): Promise<T> {
    const sanitized = stripUndefined(record);

    if (this.shouldUseBackendPersistence()) {
      const backendRecord = await this.normalizeBackendRecordUserId(sanitized);
      const payload = toSnakeCaseDeep(backendRecord);
      if (backendRecord.id) {
        const response = await backendFetch(`/api/${collectionName}/${encodeURIComponent(String(sanitized.id))}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        return this.hydrateBackendRecordUserId(toCamelCaseDeep(response?.data || payload) as T);
      }

      const response = await backendFetch(`/api/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const rows = Array.isArray(response?.data) ? response.data : [];
      return this.hydrateBackendRecordUserId(toCamelCaseDeep(rows[0] || payload) as T);
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return (await localDb.upsert(store, sanitized)) as T;
    }

    if (sanitized.id) {
      await setDoc(doc(db, collectionName, sanitized.id), stripUndefined({ ...sanitized }));
      return sanitized;
    }

    const docRef = await addDoc(collection(db, collectionName), stripUndefined({ ...sanitized }));
    return { ...sanitized, id: docRef.id };
  }

  private async updateRecord<T extends { id?: string }>(
    store: LocalDbStore,
    collectionName: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    const current = await this.getRecordById<T>(store, collectionName, id);
    if (!current) return null;

    const next = stripUndefined({
      ...current,
      ...updates,
      id
    } as T);

    if (this.shouldUseBackendPersistence()) {
      const normalizedUpdates = await this.normalizeBackendRecordUserId(stripUndefined(updates) as Partial<T>);
      const response = await backendFetch(`/api/${collectionName}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(toSnakeCaseDeep(normalizedUpdates))
      });
      return this.hydrateBackendRecordUserId(toCamelCaseDeep(response?.data || next) as T);
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return (await localDb.upsert(store, next)) as T;
    }

    await updateDoc(doc(db, collectionName, id), stripUndefined(updates));
    return next;
  }

  private async getUserRecord(userId: string): Promise<User | null> {
    if (!userId) return null;

    if (this.shouldUseBackendPersistence()) {
      const affiliateProfileLookupKeys = await resolveBackendUserLookupKeys(userId);
      const [userResponse, fallbackUserResponse, ...affiliateProfileResponses] = await Promise.all([
        backendFetch(
          `/api/users?firebase_uid=${encodeURIComponent(userId)}&select=id,firebase_uid,email,name,avatar_url,phone,status,created_at&limit=1`
        ).catch(() => null),
        backendFetch(
          `/api/users?id=${encodeURIComponent(userId)}&select=id,firebase_uid,email,name,avatar_url,phone,status,created_at&limit=1`
        ).catch(() => null),
        ...affiliateProfileLookupKeys.map((lookupUserId) =>
          backendFetch(`/api/affiliate_profiles?eq.user_id=${encodeURIComponent(lookupUserId)}&limit=1`).catch(() => null)
        )
      ]);

      const userRows = [
        ...(Array.isArray(userResponse?.data) ? userResponse.data : []),
        ...(Array.isArray(fallbackUserResponse?.data) ? fallbackUserResponse.data : [])
      ];
      const affiliateRows = affiliateProfileResponses.flatMap((response) =>
        Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : []
      );
      const composed = mapBackendAffiliateProfileUser(userId, userRows[0], affiliateRows[0]);
      if (composed) return composed;
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return (await localDb.getById<User & { id?: string }>(this.usersStore, userId)) as User | null;
    }

    const snapshot = await getDoc(doc(db, 'users', userId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as User) : null;
  }

  private async updateUserRecord(userId: string, updates: Partial<User>): Promise<User | null> {
    const current = await this.getUserRecord(userId);
    if (!current) return null;

    const next = stripUndefined({ ...current, ...updates, id: userId });

    if (this.shouldUseBackendPersistence()) {
      const affiliateBackendUserId = await resolveBackendUserId(userId);
      const affiliatePayload: Record<string, unknown> = {
        user_id: affiliateBackendUserId || userId,
        updated_at: nowIso()
      };
      let hasAffiliatePayload = false;
      const assign = (key: string, value: unknown) => {
        if (value === undefined) return;
        affiliatePayload[key] = value;
        hasAffiliatePayload = true;
      };

      assign('is_affiliate', updates.isAffiliate);
      assign('onboarding_completed', updates.affiliateOnboardingCompleted);
      assign('affiliate_profile', updates.affiliateProfile);
      assign('pending_referral', updates.pendingAffiliateReferral);
      assign('wallet_balance', updates.walletBalance);
      assign('processing_balance', updates.processingBalance);
      assign('held_deposits', updates.heldDeposits);
      assign('affiliate_tier', updates.affiliateTier);

      if (hasAffiliatePayload) {
        await backendFetch('/api/affiliate_profiles?upsert=1&onConflict=user_id', {
          method: 'POST',
          body: JSON.stringify(affiliatePayload)
        });
      }
      return next as User;
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      await localDb.upsert(this.usersStore, next);
      return next as User;
    }

    await updateDoc(doc(db, 'users', userId), stripUndefined(updates));
    return next as User;
  }

  private async getItemRecord(itemId: string): Promise<any | null> {
    if (!itemId) return null;

    if (this.shouldUseBackendPersistence()) {
      const response = await backendFetch(
        `/api/items?eq.id=${encodeURIComponent(itemId)}&select=id,seller_id,store_id,title,listing_type,sale_price,rental_price,metadata&limit=1`
      ).catch(() => null);
      const rows = Array.isArray(response?.data) ? response.data : [];
      const row = rows[0];
      if (!row) return null;
      const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return {
        id: row.id,
        title: row.title || metadata.title || 'Untitled Item',
        owner: {
          id: String(row.seller_id || metadata.ownerId || '')
        },
        storeId: row.store_id || metadata.storeId || null,
        listingType: row.listing_type || metadata.listingType || 'sale',
        salePrice: Number(row.sale_price ?? metadata.salePrice ?? 0),
        rentalPrice: Number(row.rental_price ?? metadata.rentalPrice ?? 0),
        price: Number(row.sale_price ?? row.rental_price ?? metadata.salePrice ?? metadata.rentalPrice ?? 0),
        rentalRates: metadata.rentalRates || undefined
      };
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return await localDb.getById<any>(this.itemsStore, itemId);
    }

    const snapshot = await getDoc(doc(db, 'items', itemId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  private async getBookingRecord(bookingId: string): Promise<any | null> {
    if (!bookingId) return null;

    if (this.shouldUseBackendPersistence()) {
      const response = await backendFetch(
        `/api/rental_bookings?eq.id=${encodeURIComponent(bookingId)}&limit=1`
      ).catch(() => null);
      const rows = Array.isArray(response?.data) ? response.data : [];
      return rows[0] ? toCamelCaseDeep(rows[0]) : null;
    }

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      return await localDb.getById<any>(this.bookingsStore, bookingId);
    }

    const snapshot = await getDoc(doc(db, 'bookings', bookingId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  private async listAffiliateUsers() {
    return this.listRecords<AffiliatePartnerRecord>(this.affiliateUsersStore, this.AFFILIATE_USERS_COLLECTION);
  }

  private async listAffiliateLinks() {
    return this.listRecords<AffiliateLinkRecord>(this.affiliateLinksStore, this.AFFILIATE_LINKS_COLLECTION);
  }

  private async listAffiliateCoupons() {
    return this.listRecords<AffiliateCouponRecord>(this.affiliateCouponsStore, this.AFFILIATE_COUPONS_COLLECTION);
  }

  private async listAffiliateCommissions() {
    return this.listRecords<AffiliateCommissionRecord>(this.affiliateCommissionsStore, this.AFFILIATE_COMMISSIONS_COLLECTION);
  }

  private async listAffiliateClicks() {
    return this.listRecords<AffiliateClickRecord>(this.affiliateClicksStore, this.AFFILIATE_CLICKS_COLLECTION);
  }

  private async listAffiliateSubmissions() {
    return this.listRecords<AffiliateSubmissionRecord>(this.affiliateSubmissionsStore, this.AFFILIATE_SUBMISSIONS_COLLECTION);
  }

  private async saveAffiliateUser(record: AffiliatePartnerRecord) {
    return this.saveRecord(this.affiliateUsersStore, this.AFFILIATE_USERS_COLLECTION, record);
  }

  private async saveAffiliateLink(record: AffiliateLinkRecord) {
    return this.saveRecord(this.affiliateLinksStore, this.AFFILIATE_LINKS_COLLECTION, record);
  }

  private async saveAffiliateCoupon(record: AffiliateCouponRecord) {
    return this.saveRecord(this.affiliateCouponsStore, this.AFFILIATE_COUPONS_COLLECTION, record);
  }

  private async saveAffiliateCommission(record: AffiliateCommissionRecord) {
    return this.saveRecord(this.affiliateCommissionsStore, this.AFFILIATE_COMMISSIONS_COLLECTION, record);
  }

  private async saveAffiliateClick(record: AffiliateClickRecord) {
    return this.saveRecord(this.affiliateClicksStore, this.AFFILIATE_CLICKS_COLLECTION, record);
  }

  private async saveAffiliateSubmission(record: AffiliateSubmissionRecord) {
    return this.saveRecord(this.affiliateSubmissionsStore, this.AFFILIATE_SUBMISSIONS_COLLECTION, record);
  }

  private getSupportedSurfaces(program?: AffiliateProgram | null): AffiliateSourceSurface[] {
    const supported = program?.supportedSurfaces?.filter((surface): surface is AffiliateSourceSurface => LINK_SURFACES.includes(surface));
    return supported && supported.length > 0 ? supported : ['link', 'coupon', 'spotlight', 'pixe', 'seller_referral'];
  }

  private parseDestination(url: string) {
    const parsed = new URL(url, getOrigin());
    const pathname = parsed.pathname || '/';
    const match = pathname.match(/\/item\/([^/?#]+)/i);
    const itemId = match ? decodeURIComponent(match[1]) : parsed.searchParams.get('itemId');
    const storeId = parsed.searchParams.get('storeId');
    const rawSurface = (parsed.searchParams.get('surface') || parsed.searchParams.get('src') || 'link').toLowerCase();
    const sourceSurface = LINK_SURFACES.includes(rawSurface as AffiliateSourceSurface)
      ? (rawSurface as AffiliateSourceSurface)
      : 'link';

    return {
      destinationUrl: parsed.toString(),
      itemId: itemId ? String(itemId) : null,
      storeId: storeId ? String(storeId) : null,
      sourceSurface
    };
  }

  private buildTrackedUrl(destinationUrl: string, code: string) {
    const parsed = new URL(destinationUrl, getOrigin());
    parsed.searchParams.set('ref', code);
    return parsed.toString();
  }

  private getStoredReferralSession(): ReferralSession | null {
    if (typeof window === 'undefined') return null;

    try {
      for (const storage of [window.sessionStorage, window.localStorage]) {
        const raw = storage.getItem(REFERRAL_STORAGE_KEY);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as ReferralSession;
        if (!parsed?.affiliateUserId) continue;
        if (parsed.expiresAt && safeDate(parsed.expiresAt) <= Date.now()) {
          storage.removeItem(REFERRAL_STORAGE_KEY);
          continue;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  private setStoredReferralSession(session: ReferralSession | null, storageMode: 'local' | 'session' = 'local') {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);

    if (!session) {
      return;
    }

    const storage = storageMode === 'session' ? window.sessionStorage : window.localStorage;
    storage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(session));
  }

  private calculateLineAmount(item: CartItem) {
    const isRentMode = item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent');
    if (isRentMode && item.rentalPeriod && item.rentalRates?.daily) {
      const start = new Date(item.rentalPeriod.startDate);
      const end = new Date(item.rentalPeriod.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return item.rentalRates.daily * Math.max(1, days) * item.quantity;
    }

    const basePrice = item.salePrice || item.rentalPrice || item.price || 0;
    return basePrice * item.quantity;
  }

  private inferTier(conversions: number): Affiliate['tier'] {
    if (conversions >= 100) return 'platinum';
    if (conversions >= 50) return 'gold';
    if (conversions >= 10) return 'silver';
    return 'bronze';
  }

  private async getStoreForUser(userId: string) {
    try {
      return await storeBuildService.getUserStore(userId);
    } catch {
      return null;
    }
  }

  private async findProgramForItemOwner(ownerId: string) {
    const store = await this.getStoreForUser(ownerId);
    if (!store?.id) {
      return { store: null, program: null };
    }

    const program = await storeBuildService.getAffiliateProgram(store.id);
    return { store, program };
  }

  private async ensureAffiliatePartner(affiliateUserId: string, storeId: string | null, program?: AffiliateProgram | null) {
    const partners = await this.listAffiliateUsers();
    const existing = partners.find((partner) => partner.userId === affiliateUserId && partner.storeId === storeId);
    if (existing) return existing;

    const user = await this.getUserRecord(affiliateUserId);
    const now = nowIso();
    const commissionRate = normalizeRatePercent(program?.commissionRate || 10);
    const record: AffiliatePartnerRecord = {
      userId: affiliateUserId,
      storeId,
      programId: program?.id || null,
      name: user?.name || user?.email || 'Affiliate',
      email: user?.email || '',
      platform: 'multi-channel',
      audience: 'Urban Prime audience',
      status: program?.approvalMode === 'automatic' || !storeId ? 'active' : 'new',
      joinedAt: now,
      updatedAt: now,
      commissionRate,
      minPayout: Number(program?.minPayout || DEFAULT_MIN_PAYOUT),
      approvalMode: program?.approvalMode === 'automatic' ? 'automatic' : 'manual',
      supportedSurfaces: this.getSupportedSurfaces(program)
    };

    return this.saveAffiliateUser(record);
  }

  private async getCouponEligiblePrograms(userId: string, preferredStoreId?: string | null) {
    const partners = (await this.listAffiliateUsers())
      .filter((partner) => partner.userId === userId && partner.status === 'active' && Boolean(partner.storeId));

    const eligible = await Promise.all(
      partners.map(async (partner) => {
        if (preferredStoreId && partner.storeId !== preferredStoreId) return null;
        const program = partner.storeId ? await storeBuildService.getAffiliateProgram(partner.storeId) : null;
        if (!partner.storeId || !program || !program.isActive || !this.getSupportedSurfaces(program).includes('coupon')) {
          return null;
        }
        const store = await storeBuildService.getStore(partner.storeId);
        return { partner, program, store };
      })
    );

    return eligible
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => safeDate(right.partner.updatedAt) - safeDate(left.partner.updatedAt));
  }

  private async buildCampaigns(userId: string): Promise<AffiliateCampaign[]> {
    const partners = (await this.listAffiliateUsers()).filter((partner) => partner.userId === userId);
    return Promise.all(
      partners.map(async (partner) => {
        const program = partner.storeId ? await storeBuildService.getAffiliateProgram(partner.storeId) : null;
        const storeName = partner.storeId ? (await storeBuildService.getStore(partner.storeId))?.storeName : 'Platform Referral';
        return {
          id: partner.id || `${partner.userId}-${partner.storeId || 'generic'}`,
          title: storeName || 'Affiliate Campaign',
          description:
            partner.status === 'active'
              ? 'Tracked links, coupons, and creator placements are live for this program.'
              : 'Pending seller approval before tracked sales become commission eligible.',
          commissionRate: toUnitRate(partner.commissionRate),
          storeId: partner.storeId || null,
          status: partner.status,
          supportedSurfaces: program ? this.getSupportedSurfaces(program) : ['link', 'seller_referral']
        } satisfies AffiliateCampaign;
      })
    );
  }

  private async buildLeaderboard(): Promise<Array<Affiliate & { name: string; avatar: string }>> {
    const [commissions, clicks, partners] = await Promise.all([
      this.listAffiliateCommissions(),
      this.listAffiliateClicks(),
      this.listAffiliateUsers()
    ]);

    const grouped = new Map<string, { conversions: number; clicks: number; earned: number; rate: number }>();
    partners.forEach((partner) => {
      const current = grouped.get(partner.userId) || { conversions: 0, clicks: 0, earned: 0, rate: partner.commissionRate };
      current.rate = Math.max(current.rate, partner.commissionRate);
      grouped.set(partner.userId, current);
    });

    clicks.forEach((click) => {
      const current = grouped.get(click.userId) || { conversions: 0, clicks: 0, earned: 0, rate: 10 };
      current.clicks += 1;
      grouped.set(click.userId, current);
    });

    commissions
      .filter((entry) => entry.status !== 'reversed')
      .forEach((entry) => {
        const current = grouped.get(entry.userId) || { conversions: 0, clicks: 0, earned: 0, rate: entry.commissionRate };
        current.conversions += 1;
        current.earned += entry.commissionAmount;
        current.rate = Math.max(current.rate, entry.commissionRate);
        grouped.set(entry.userId, current);
      });

    const rows = await Promise.all(
      Array.from(grouped.entries()).map(async ([userId, row]) => {
        const user = await this.getUserRecord(userId);
        return {
          userId,
          referralCode: '',
          clicks: row.clicks,
          signups: row.conversions,
          commissionRate: toUnitRate(row.rate),
          earnings: row.earned,
          balance: 0,
          tier: this.inferTier(row.conversions),
          name: user?.name || 'Affiliate',
          avatar: user?.avatar || '/icons/urbanprime-logo.png'
        } satisfies Affiliate & { name: string; avatar: string };
      })
    );

    return rows
      .sort((left, right) => right.earnings - left.earnings || right.signups - left.signups || right.clicks - left.clicks)
      .slice(0, 10);
  }

  private buildCreativeAssets(): CreativeAsset[] {
    return [
      {
        id: 'asset-primary-banner',
        title: 'Primary Referral Banner',
        imageUrl: '/icons/urbanprime-logo.png',
        type: 'banner',
        size: '1200x628',
        ctaText: 'Shop Urban Prime'
      },
      {
        id: 'asset-story-card',
        title: 'Story Card',
        imageUrl: '/icons/pixe.svg',
        type: 'social',
        size: '1080x1920',
        ctaText: 'Open Spotlight'
      },
      {
        id: 'asset-creator-card',
        title: 'Creator Card',
        imageUrl: '/icons/urbanprime-logo.png',
        type: 'social',
        size: '1080x1080',
        ctaText: 'Use My Link'
      }
    ];
  }

  private buildStarterAffiliateTargets(profile?: AffiliateProfile) {
    const targets: Array<{ url: string; surface: AffiliateSourceSurface }> = [
      { url: `${getOrigin()}/`, surface: 'link' }
    ];

    (profile?.interestedCategories || []).slice(0, 3).forEach((categoryId) => {
      targets.push({
        url: `${getOrigin()}/browse?category=${encodeURIComponent(categoryId)}`,
        surface: 'link'
      });
    });

    const methods = new Set(profile?.promotionMethods || []);
    if (methods.has('social') || methods.has('youtube')) {
      targets.push({ url: `${getOrigin()}/spotlight?surface=spotlight`, surface: 'spotlight' });
    }
    if (methods.has('social')) {
      targets.push({ url: `${getOrigin()}/pixe?surface=pixe`, surface: 'pixe' });
    }
    if (profile?.wantsSellerReferrals) {
      targets.push({ url: `${getOrigin()}/seller-resource-center?surface=seller_referral`, surface: 'seller_referral' });
    }

    return targets.filter(
      (target, index, list) =>
        list.findIndex((entry) => entry.url === target.url && entry.surface === target.surface) === index
    );
  }

  private async ensureStarterCoupon(userId: string, profile?: AffiliateProfile) {
    const methods = new Set(profile?.promotionMethods || []);
    const needsCoupon = methods.has('email') || methods.has('word_of_mouth') || methods.has('social');
    if (!needsCoupon) return;

    const existingCoupons = (await this.listAffiliateCoupons()).filter(
      (coupon) => coupon.userId === userId && coupon.status !== 'archived'
    );
    if (existingCoupons.length > 0) return;

    const user = await this.getUserRecord(userId);
    const nameStem = String(user?.name || 'urban')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 8)
      .toUpperCase();
    const userStem = String(userId || '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(-4)
      .toUpperCase();
    const couponCode = `${nameStem || 'URBAN'}${userStem || 'AF'}10`;

    try {
      await this.createAffiliateCoupon(userId, couponCode, 10);
    } catch {
      // Coupon creation is a best-effort starter convenience, not a hard requirement.
    }
  }

  async ensureAffiliateStarterExperience(userId: string, profile?: AffiliateProfile): Promise<void> {
    const existingLinks = (await this.listAffiliateLinks()).filter((link) => link.userId === userId);
    const targets = this.buildStarterAffiliateTargets(profile);

    for (const target of targets) {
      const alreadyExists = existingLinks.some((link) => {
        const original = String(link.originalUrl || '');
        const destination = String(link.destinationUrl || '');
        return (
          original === target.url ||
          destination === target.url ||
          (link.sourceSurface === target.surface &&
            ((target.surface === 'seller_referral' && destination.includes('/seller-resource-center')) ||
              (target.surface === 'spotlight' && destination.includes('/spotlight')) ||
              (target.surface === 'pixe' && destination.includes('/pixe'))))
        );
      });

      if (!alreadyExists) {
        try {
          await this.generateAffiliateLink(userId, target.url);
        } catch {
          // Starter links should never block onboarding.
        }
      }
    }

    await this.ensureStarterCoupon(userId, profile);
  }

  async getAffiliateDashboard(userId: string): Promise<DashboardData> {
    const user = await this.getUserRecord(userId);
    try {
      await this.ensureAffiliateStarterExperience(userId, user?.affiliateProfile);
    } catch (error) {
      console.warn('Affiliate starter experience provisioning failed:', this.getErrorMessage(error));
    }

    const [linksResult, couponsResult, commissionsResult, clicksResult, partnersResult, submissionsResult] = await Promise.allSettled([
      this.listAffiliateLinks(),
      this.listAffiliateCoupons(),
      this.listAffiliateCommissions(),
      this.listAffiliateClicks(),
      this.listAffiliateUsers(),
      this.listAffiliateSubmissions()
    ]);

    const links = linksResult.status === 'fulfilled' ? linksResult.value : [];
    const coupons = couponsResult.status === 'fulfilled' ? couponsResult.value : [];
    const commissions = commissionsResult.status === 'fulfilled' ? commissionsResult.value : [];
    const clicks = clicksResult.status === 'fulfilled' ? clicksResult.value : [];
    const partners = partnersResult.status === 'fulfilled' ? partnersResult.value : [];
    const submissions = submissionsResult.status === 'fulfilled' ? submissionsResult.value : [];

    if (linksResult.status === 'rejected') console.warn('Affiliate links load failed:', this.getErrorMessage(linksResult.reason));
    if (couponsResult.status === 'rejected') console.warn('Affiliate coupons load failed:', this.getErrorMessage(couponsResult.reason));
    if (commissionsResult.status === 'rejected') console.warn('Affiliate commissions load failed:', this.getErrorMessage(commissionsResult.reason));
    if (clicksResult.status === 'rejected') console.warn('Affiliate clicks load failed:', this.getErrorMessage(clicksResult.reason));
    if (partnersResult.status === 'rejected') console.warn('Affiliate partners load failed:', this.getErrorMessage(partnersResult.reason));
    if (submissionsResult.status === 'rejected') console.warn('Affiliate submissions load failed:', this.getErrorMessage(submissionsResult.reason));

    const userLinks = links.filter((link) => link.userId === userId).sort((left, right) => safeDate(right.createdAt) - safeDate(left.createdAt));
    const userCoupons = coupons.filter((coupon) => coupon.userId === userId).sort((left, right) => safeDate(right.createdAt) - safeDate(left.createdAt));
    const userCommissions = commissions
      .filter((entry) => entry.userId === userId)
      .sort((left, right) => safeDate(right.createdAt) - safeDate(left.createdAt));
    const userClicks = clicks.filter((entry) => entry.userId === userId);
    const userPartners = partners.filter((entry) => entry.userId === userId);
    const userSubmissions = submissions.filter((entry) => entry.userId === userId);

    let defaultLink = userLinks.find((link) => !link.storeId && !link.itemId);
    if (!defaultLink) {
      try {
        defaultLink = await this.generateAffiliateLink(userId, `${getOrigin()}/`);
      } catch (error) {
        console.warn('Affiliate default link generation failed:', this.getErrorMessage(error));
      }
    }
    const resolvedLinks = defaultLink
      ? (userLinks.some((link) => link.id === defaultLink?.id) ? userLinks : [defaultLink, ...userLinks])
      : userLinks;
    const totalClicks = userClicks.length;
    const conversions = userCommissions.filter((entry) => entry.status !== 'reversed').length;
    const totalEarned = userCommissions.filter((entry) => entry.status !== 'reversed').reduce((sum, entry) => sum + entry.commissionAmount, 0);
    const pendingEarnings = userCommissions.filter((entry) => entry.status === 'pending').reduce((sum, entry) => sum + entry.commissionAmount, 0);
    const availableBalance = userCommissions.filter((entry) => entry.status === 'approved').reduce((sum, entry) => sum + entry.commissionAmount, 0);
    const highestRate = userPartners.reduce((max, partner) => Math.max(max, partner.commissionRate), 10);
    const [leaderboardResult, campaignsResult] = await Promise.allSettled([
      this.buildLeaderboard(),
      this.buildCampaigns(userId)
    ]);
    const leaderboard = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
    const campaigns =
      campaignsResult.status === 'fulfilled'
        ? campaignsResult.value
        : [
            {
              id: `campaign-${userId}`,
              title: 'Platform Referral',
              description: 'Use your main referral surfaces to start collecting tracked visits and seller referrals.',
              commissionRate: 0.1
            }
          ];

    if (leaderboardResult.status === 'rejected') console.warn('Affiliate leaderboard load failed:', this.getErrorMessage(leaderboardResult.reason));
    if (campaignsResult.status === 'rejected') console.warn('Affiliate campaigns load failed:', this.getErrorMessage(campaignsResult.reason));

    const earnings: AffiliateEarning[] = userCommissions.map((entry) => ({
      id: entry.id || `${entry.orderId}-${entry.itemId || 'generic'}`,
      date: entry.createdAt,
      amount: entry.commissionAmount,
      type: entry.eventType.replace(/_/g, ' '),
      status: entry.status === 'reversed' ? 'pending' : entry.status,
      orderId: entry.orderId,
      itemId: entry.itemId || undefined
    }));

    return {
      affiliate: {
        userId,
        referralCode: defaultLink?.shortCode || resolvedLinks[0]?.shortCode || '',
        clicks: totalClicks,
        signups: conversions,
        commissionRate: toUnitRate(highestRate),
        earnings: totalEarned,
        balance: availableBalance,
        status: userPartners.some((partner) => partner.status === 'active') || Boolean(user?.affiliateOnboardingCompleted || resolvedLinks.length || userCoupons.length)
          ? 'active'
          : 'paused',
        tier: this.inferTier(conversions),
        lifetimeEarnings: totalEarned,
        pendingEarnings,
        minPayout: userPartners[0]?.minPayout || DEFAULT_MIN_PAYOUT,
        approvalMode: userPartners[0]?.approvalMode || 'manual',
        supportedSurfaces: userPartners[0]?.supportedSurfaces || LINK_SURFACES
      },
      earnings,
      links: resolvedLinks,
      coupons: userCoupons,
      assets: this.buildCreativeAssets(),
      leaderboard,
      campaigns,
      submissions: {
        products: userSubmissions
          .filter((entry) => entry.type === 'product')
          .map((entry) => ({ id: entry.id || '', userId: entry.userId, url: entry.url, status: entry.status })),
        reviews: userSubmissions
          .filter((entry) => entry.type === 'review')
          .map((entry) => ({ id: entry.id || '', userId: entry.userId, url: entry.url, status: entry.status }))
      }
    };
  }

  async getAffiliateData(userId: string) {
    const dashboard = await this.getAffiliateDashboard(userId);
    return {
      affiliate: dashboard.affiliate,
      earnings: dashboard.earnings,
      campaigns: dashboard.campaigns,
      submissions: dashboard.submissions
    };
  }

  async getAffiliateLinks(userId: string): Promise<AffiliateLink[]> {
    const dashboard = await this.getAffiliateDashboard(userId);
    return dashboard.links;
  }

  async getAffiliateCoupons(userId: string): Promise<AffiliateCoupon[]> {
    const dashboard = await this.getAffiliateDashboard(userId);
    return dashboard.coupons;
  }

  async getCreativeAssets(): Promise<CreativeAsset[]> {
    return this.buildCreativeAssets();
  }

  async getAffiliateLeaderboard(): Promise<Array<Affiliate & { name: string; avatar: string }>> {
    return this.buildLeaderboard();
  }

  async getStoreAffiliates(storeId: string): Promise<AffiliatePartnerRecord[]> {
    const rows = await this.listAffiliateUsers();
    return rows
      .filter((entry) => entry.storeId === storeId)
      .sort((left, right) => safeDate(right.updatedAt) - safeDate(left.updatedAt));
  }

  async getStoreAffiliatePerformance(storeId: string) {
    const [partners, commissions, clicks] = await Promise.all([
      this.getStoreAffiliates(storeId),
      this.listAffiliateCommissions(),
      this.listAffiliateClicks()
    ]);

    const affiliateRows = partners.map((partner) => {
      const partnerCommissions = commissions.filter(
        (entry) => entry.storeId === storeId && entry.userId === partner.userId && entry.status !== 'reversed'
      );
      const partnerClicks = clicks.filter((entry) => entry.storeId === storeId && entry.userId === partner.userId).length;

      return {
        id: partner.id,
        userId: partner.userId,
        name: partner.name,
        email: partner.email,
        platform: partner.platform,
        status: partner.status,
        clicks: partnerClicks,
        conversions: partnerCommissions.length,
        totalCommissionsEarned: partnerCommissions.reduce((sum, entry) => sum + entry.commissionAmount, 0),
        totalCommissionsPaid: partnerCommissions
          .filter((entry) => entry.status === 'paid')
          .reduce((sum, entry) => sum + entry.commissionAmount, 0),
        pendingCommissions: partnerCommissions
          .filter((entry) => entry.status === 'pending' || entry.status === 'approved')
          .reduce((sum, entry) => sum + entry.commissionAmount, 0)
      };
    });

    return {
      totalAffiliates: partners.length,
      totalConversions: affiliateRows.reduce((sum, entry) => sum + entry.conversions, 0),
      totalEarned: affiliateRows.reduce((sum, entry) => sum + entry.totalCommissionsEarned, 0),
      totalPaid: affiliateRows.reduce((sum, entry) => sum + entry.totalCommissionsPaid, 0),
      totalPending: affiliateRows.reduce((sum, entry) => sum + entry.pendingCommissions, 0),
      affiliates: affiliateRows
    };
  }

  async updateAffiliateStatus(affiliateId: string, status: AffiliateStatus): Promise<void> {
    await this.updateRecord<AffiliatePartnerRecord>(
      this.affiliateUsersStore,
      this.AFFILIATE_USERS_COLLECTION,
      affiliateId,
      {
        status,
        updatedAt: nowIso()
      }
    );
  }

  async generateAffiliateLink(userId: string, url: string): Promise<AffiliateLink> {
    const parsed = this.parseDestination(url);
    const item = parsed.itemId ? await this.getItemRecord(parsed.itemId) : null;
    const storeInfo =
      parsed.storeId
        ? { store: await storeBuildService.getStore(parsed.storeId), program: await storeBuildService.getAffiliateProgram(parsed.storeId) }
        : item?.owner?.id
          ? await this.findProgramForItemOwner(item.owner.id)
          : { store: null, program: null };

    const program = storeInfo.program;
    if (storeInfo.store?.id && program && !this.getSupportedSurfaces(program).includes('link')) {
      throw new Error('This seller has disabled tracked referral links.');
    }

    const partner = storeInfo.store?.id && program ? await this.ensureAffiliatePartner(userId, storeInfo.store.id, program) : null;

    const trackingCode = randomCode('AF');
    const createdAt = nowIso();
    const record: AffiliateLinkRecord = {
      userId,
      affiliateId: partner?.id,
      storeId: storeInfo.store?.id || parsed.storeId || null,
      itemId: parsed.itemId,
      originalUrl: url,
      destinationUrl: parsed.destinationUrl,
      shortCode: trackingCode,
      trackingCode,
      clicks: 0,
      sourceSurface: parsed.sourceSurface || 'link',
      status: 'active',
      createdAt
    };

    try {
      const saved = await this.saveAffiliateLink(record);
      return { ...saved, id: saved.id || '' };
    } catch (error) {
      throw this.normalizeAffiliateLinkPersistenceError(error);
    }
  }

  async createAffiliateCoupon(userId: string, code: string, percentage: number, storeId?: string | null): Promise<AffiliateCoupon> {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new Error('Coupon code is required.');
    }
    if (normalizedCode === 'WELCOME10') {
      throw new Error('That coupon code is reserved.');
    }

    const existingCoupons = await this.listAffiliateCoupons();
    const duplicate = existingCoupons.find((entry) => entry.code.toUpperCase() === normalizedCode && entry.status !== 'archived');
    if (duplicate) {
      throw new Error('That coupon code is already in use.');
    }

    const eligiblePrograms = await this.getCouponEligiblePrograms(userId, storeId);
    if (eligiblePrograms.length === 0) {
      throw new Error(
        storeId
          ? 'That store program is not active for coupon attribution yet.'
          : 'Coupons unlock after a seller approves you for at least one active store program that allows coupon attribution.'
      );
    }
    if (!storeId && eligiblePrograms.length > 1) {
      throw new Error('Select a store program before creating a coupon so the commission destination is explicit.');
    }

    const selectedProgram = eligiblePrograms[0];
    const primaryPartner = selectedProgram.partner;
    const record: AffiliateCouponRecord = {
      userId,
      affiliateId: primaryPartner?.id,
      storeId: primaryPartner?.storeId || null,
      code: normalizedCode,
      discountPercentage: Math.max(1, Math.min(90, Number(percentage || 0))),
      uses: 0,
      commissionRate: toUnitRate(primaryPartner?.commissionRate || selectedProgram.program.commissionRate || 10),
      status: 'active',
      createdAt: nowIso()
    };

    const saved = await this.saveAffiliateCoupon(record);
    return { ...saved, id: saved.id || '' };
  }

  async validateCoupon(code: string, items?: CartItem[]) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      return { valid: false, discountPercentage: 0 };
    }

    if (normalizedCode === 'WELCOME10') {
      return { valid: true, discountPercentage: 10, system: true };
    }

    const coupons = await this.listAffiliateCoupons();
    const coupon = coupons.find((entry) => entry.code.toUpperCase() === normalizedCode && entry.status === 'active');
    if (!coupon) {
      return { valid: false, discountPercentage: 0 };
    }

    if (items && items.length > 0) {
      if (!coupon.storeId) {
        return { valid: false, discountPercentage: 0 };
      }

      const matchesStore = await Promise.all(
        items.map(async (item) => {
          const storeInfo = await this.findProgramForItemOwner(String(item.owner?.id || ''));
          return storeInfo.store?.id === coupon.storeId;
        })
      );

      if (!matchesStore.some(Boolean)) {
        return { valid: false, discountPercentage: 0 };
      }
    }

    return {
      valid: true,
      discountPercentage: coupon.discountPercentage,
      coupon
    };
  }

  async submitExternalProduct(userId: string, url: string) {
    return this.saveAffiliateSubmission({
      userId,
      url,
      type: 'product',
      status: 'pending',
      createdAt: nowIso()
    });
  }

  async submitContentReview(userId: string, url: string) {
    return this.saveAffiliateSubmission({
      userId,
      url,
      type: 'review',
      status: 'pending',
      createdAt: nowIso()
    });
  }

  async transferApprovedCommissionsToWallet(userId: string): Promise<User> {
    const [user, commissions, partners] = await Promise.all([
      this.getUserRecord(userId),
      this.listAffiliateCommissions(),
      this.listAffiliateUsers()
    ]);

    if (!user) {
      throw new Error('User not found.');
    }

    const approvedCommissions = commissions.filter((entry) => entry.userId === userId && entry.status === 'approved');
    const transferableBalance = approvedCommissions.reduce((sum, entry) => sum + entry.commissionAmount, 0);

    if (transferableBalance <= 0) {
      throw new Error('No approved affiliate earnings are available to transfer.');
    }

    const createdAt = nowIso();
    let walletTransactionId = `affiliate-wallet-${Date.now()}`;

    if (this.shouldUseLocalFallback()) {
      await localDb.init();
      const saved = await localDb.upsert('payouts', {
        userId,
        amount: transferableBalance,
        type: 'wallet_credit',
        source: 'affiliate_commissions',
        description: 'Affiliate earnings transferred to wallet',
        createdAt
      });
      walletTransactionId = saved.id || walletTransactionId;
    } else {
      const txRef = await addDoc(collection(db, 'walletTransactions'), {
        userId,
        amount: transferableBalance,
        type: 'credit',
        description: 'Affiliate earnings transfer',
        date: createdAt,
        status: 'completed'
      });
      walletTransactionId = txRef.id;
    }

    await this.updateUserRecord(userId, {
      walletBalance: (user.walletBalance || 0) + transferableBalance
    });

    await Promise.all(
      approvedCommissions.map((entry) =>
        this.updateRecord<AffiliateCommissionRecord>(
          this.affiliateCommissionsStore,
          this.AFFILIATE_COMMISSIONS_COLLECTION,
          entry.id || '',
          {
            status: 'paid',
            walletTransactionId,
            releasedAt: createdAt
          }
        )
      )
    );

    await Promise.all(
      partners
        .filter((partner) => partner.userId === userId)
        .map((partner) =>
          this.updateRecord<AffiliatePartnerRecord>(
            this.affiliateUsersStore,
            this.AFFILIATE_USERS_COLLECTION,
            partner.id || '',
            {
              lastPayoutAt: createdAt,
              updatedAt: createdAt
            }
          )
        )
    );

    const updated = await this.getUserRecord(userId);
    if (!updated) {
      throw new Error('User not found after wallet transfer.');
    }
    return updated;
  }

  async captureReferralFromLocation(search: string, currentPath?: string) {
    const params = new URLSearchParams(search || '');
    const ref = String(params.get('ref') || '').trim();
    if (!ref) return null;

    const links = await this.listAffiliateLinks();
    const link = links.find((entry) => entry.shortCode === ref || entry.trackingCode === ref);
    if (!link) return null;

    const program = link.storeId ? await storeBuildService.getAffiliateProgram(link.storeId) : null;
    const createdAt = nowIso();
    const expiresAt = addDays(createdAt, Number(program?.cookieDuration || DEFAULT_COOKIE_DAYS));
    const session: ReferralSession = {
      affiliateId: link.affiliateId,
      affiliateUserId: link.userId,
      linkId: link.id,
      trackingCode: link.shortCode,
      storeId: link.storeId || null,
      itemId: link.itemId || null,
      sourceSurface: link.sourceSurface || 'link',
      destinationUrl: link.destinationUrl,
      createdAt,
      expiresAt
    };

    const storageMode = program?.enableCookies === false ? 'session' : 'local';
    this.setStoredReferralSession(session, storageMode);

    const dedupeKey = `${CLICK_DEDUP_PREFIX}${link.id || link.shortCode}:${currentPath || ''}`;
    if (typeof window === 'undefined' || !window.sessionStorage.getItem(dedupeKey)) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(dedupeKey, createdAt);
      }

      await this.saveAffiliateClick({
        userId: link.userId,
        affiliateId: link.affiliateId,
        linkId: link.id,
        trackingCode: link.shortCode,
        storeId: link.storeId || null,
        itemId: link.itemId || null,
        sourceSurface: link.sourceSurface || 'link',
        destinationUrl: link.destinationUrl,
        path: currentPath || undefined,
        createdAt,
        expiresAt,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined
      });

      await this.updateRecord<AffiliateLinkRecord>(
        this.affiliateLinksStore,
        this.AFFILIATE_LINKS_COLLECTION,
        link.id || '',
        {
          clicks: Number(link.clicks || 0) + 1
        }
      );

      if (link.affiliateId) {
        await this.updateRecord<AffiliatePartnerRecord>(
          this.affiliateUsersStore,
          this.AFFILIATE_USERS_COLLECTION,
          link.affiliateId,
          {
            lastClickAt: createdAt,
            updatedAt: createdAt
          }
        );
      }
    }

    return session;
  }

  async persistPendingReferralForUser(userId: string) {
    const session = this.getStoredReferralSession();
    if (!session || !userId) return null;
    if (session.sourceSurface !== 'seller_referral') return null;
    await this.updateUserRecord(userId, { pendingAffiliateReferral: session as any });
    return session;
  }

  private async resolveSpotlightAffiliate(item: CartItem) {
    const spotlightContentId = item.spotlightAttribution?.spotlightContentId;
    if (!spotlightContentId) return null;

    try {
      const content = await spotlightService.getContent(spotlightContentId);
      const affiliateUserId = String(content?.creator_user_id || '').trim();
      if (!affiliateUserId) return null;

      return {
        affiliateUserId,
        sourceSurface: 'spotlight' as const,
        priority: 3,
        createdAt: nowIso()
      };
    } catch {
      return null;
    }
  }

  private async resolveAttribution(item: CartItem, storeId: string | null, program: AffiliateProgram | null, couponCode?: string | null) {
    const candidates: AttributionCandidate[] = [];
    const session = this.getStoredReferralSession();
    const supportedSurfaces = this.getSupportedSurfaces(program);

    if (couponCode && supportedSurfaces.includes('coupon')) {
      const validation = await this.validateCoupon(couponCode, [item]);
      if (validation.valid && validation.coupon?.userId) {
        candidates.push({
          affiliateUserId: validation.coupon.userId,
          affiliateId: validation.coupon.affiliateId,
          couponId: validation.coupon.id,
          sourceSurface: 'coupon',
          commissionRate: normalizeRatePercent(validation.coupon.commissionRate || program?.commissionRate || 10),
          priority: 1,
          createdAt: validation.coupon.createdAt || nowIso()
        });
      }
    }

    if (session?.affiliateUserId && supportedSurfaces.includes('link') && session.sourceSurface === 'link') {
      const explicitItemMatch = Boolean(session.itemId && session.itemId === item.id);
      const explicitStoreMatch = Boolean(session.storeId && storeId && session.storeId === storeId);
      const priority = explicitItemMatch || explicitStoreMatch ? 2 : 4;
      candidates.push({
        affiliateUserId: session.affiliateUserId,
        affiliateId: session.affiliateId,
        linkId: session.linkId,
        trackingCode: session.trackingCode,
        sourceSurface: 'link',
        commissionRate: normalizeRatePercent(program?.commissionRate || 10),
        priority,
        createdAt: session.createdAt
      });
    }

    if (session?.affiliateUserId && supportedSurfaces.includes('pixe') && session.sourceSurface === 'pixe') {
      candidates.push({
        affiliateUserId: session.affiliateUserId,
        affiliateId: session.affiliateId,
        linkId: session.linkId,
        trackingCode: session.trackingCode,
        sourceSurface: 'pixe',
        commissionRate: normalizeRatePercent(program?.commissionRate || 10),
        priority: 3,
        createdAt: session.createdAt
      });
    }

    if (supportedSurfaces.includes('spotlight')) {
      const spotlightCandidate = await this.resolveSpotlightAffiliate(item);
      if (spotlightCandidate) {
        candidates.push({
          affiliateUserId: spotlightCandidate.affiliateUserId,
          sourceSurface: spotlightCandidate.sourceSurface,
          commissionRate: normalizeRatePercent(program?.commissionRate || 10),
          priority: spotlightCandidate.priority,
          createdAt: spotlightCandidate.createdAt
        });
      }
    }

    return candidates
      .sort((left, right) => left.priority - right.priority || safeDate(right.createdAt) - safeDate(left.createdAt))[0] || null;
  }

  async recordOrderAttribution(params: {
    orderId: string;
    buyerUserId: string;
    items: Array<{ item: CartItem; bookingId?: string | null }>;
    couponCode?: string | null;
  }) {
    const existingCommissions = await this.listAffiliateCommissions();

    for (const entry of params.items) {
      const item = entry.item;
      const ownerId = String(item.owner?.id || '').trim();
      if (!ownerId || ownerId === params.buyerUserId) continue;

      const { store, program } = await this.findProgramForItemOwner(ownerId);
      if (!store?.id || !program || !program.isActive) continue;

      const attribution = await this.resolveAttribution(item, store.id, program, params.couponCode);
      if (!attribution || attribution.affiliateUserId === params.buyerUserId || attribution.affiliateUserId === ownerId) continue;

      const partner = await this.ensureAffiliatePartner(attribution.affiliateUserId, store.id, program);
      if (partner.status !== 'active') continue;

      const eventType =
        item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent')
          ? 'rental_conversion'
          : 'sale_conversion';
      const duplicate = existingCommissions.find(
        (commission) =>
          commission.orderId === params.orderId &&
          commission.bookingId === (entry.bookingId || null) &&
          commission.itemId === item.id &&
          commission.userId === attribution.affiliateUserId &&
          commission.eventType === eventType
      );
      if (duplicate) continue;

      const amount = this.calculateLineAmount(item);
      const commissionRate = normalizeRatePercent(attribution.commissionRate || partner.commissionRate || program.commissionRate);
      let commissionAmount = (amount * commissionRate) / 100;
      if (Number(program.maxReward || 0) > 0) {
        commissionAmount = Math.min(commissionAmount, Number(program.maxReward));
      }

      const createdAt = nowIso();
      const commission = await this.saveAffiliateCommission({
        userId: attribution.affiliateUserId,
        affiliateId: partner.id,
        orderId: params.orderId,
        bookingId: entry.bookingId || null,
        orderItemId: `${params.orderId}:${item.id}`,
        itemId: item.id,
        storeId: store.id,
        programId: program.id || null,
        sourceSurface: attribution.sourceSurface,
        eventType,
        amount,
        commissionRate,
        commissionAmount,
        status: 'pending',
        description: `Affiliate commission for ${item.title}`,
        linkId: attribution.linkId,
        couponId: attribution.couponId,
        trackingCode: attribution.trackingCode,
        createdAt
      });

      existingCommissions.push(commission);

      await this.updateRecord<AffiliatePartnerRecord>(
        this.affiliateUsersStore,
        this.AFFILIATE_USERS_COLLECTION,
        partner.id || '',
        {
          lastConversionAt: createdAt,
          updatedAt: createdAt
        }
      );

      if (attribution.couponId) {
        const coupon = await this.getRecordById<AffiliateCouponRecord>(
          this.affiliateCouponsStore,
          this.AFFILIATE_COUPONS_COLLECTION,
          attribution.couponId
        );
        if (coupon) {
          await this.updateRecord<AffiliateCouponRecord>(
            this.affiliateCouponsStore,
            this.AFFILIATE_COUPONS_COLLECTION,
            attribution.couponId,
            {
              uses: Number(coupon.uses || 0) + 1
            }
          );
        }
      }
    }
  }

  async approveCommissionsForOrderCompletion(params: { orderId?: string | null; bookingId?: string | null; completedAt?: string }) {
    const commissions = await this.listAffiliateCommissions();
    const completedAt = params.completedAt || nowIso();
    const matches = commissions.filter((entry) => {
      if (entry.status !== 'pending') return false;
      if (params.bookingId && entry.bookingId === params.bookingId) return true;
      if (params.orderId && entry.orderId === params.orderId && !entry.bookingId) return true;
      return false;
    });

    await Promise.all(
      matches.map((entry) =>
        this.updateRecord<AffiliateCommissionRecord>(
          this.affiliateCommissionsStore,
          this.AFFILIATE_COMMISSIONS_COLLECTION,
          entry.id || '',
          {
            status: 'approved',
            releasedAt: completedAt
          }
        )
      )
    );
  }

  async processSellerReferralBonus(sellerUserId: string, publishedStoreId: string) {
    if (!sellerUserId || !publishedStoreId) return null;

    const [seller, commissions] = await Promise.all([this.getUserRecord(sellerUserId), this.listAffiliateCommissions()]);
    if (!seller) return null;

    const existingBonus = commissions.find(
      (entry) => entry.eventType === 'seller_bonus' && entry.orderId === `seller-bonus:${sellerUserId}`
    );
    if (existingBonus) return existingBonus;

    const session = (seller.pendingAffiliateReferral as ReferralSession | undefined) || this.getStoredReferralSession();
    if (!session?.affiliateUserId || session.affiliateUserId === sellerUserId) return null;
    if (session.sourceSurface !== 'seller_referral') return null;

    const sourceProgram = session.storeId ? await storeBuildService.getAffiliateProgram(session.storeId) : null;
    const partner = await this.ensureAffiliatePartner(session.affiliateUserId, session.storeId || null, sourceProgram);
    if (partner.status === 'suspended') return null;

    const amount = Number(sourceProgram?.sellerBonusAmount || DEFAULT_SELLER_BONUS);
    const createdAt = nowIso();

    return this.saveAffiliateCommission({
      userId: session.affiliateUserId,
      affiliateId: partner.id,
      orderId: `seller-bonus:${sellerUserId}`,
      bookingId: null,
      orderItemId: `seller-bonus:${publishedStoreId}`,
      itemId: null,
      storeId: session.storeId || null,
      programId: sourceProgram?.id || null,
      sourceSurface: 'seller_referral',
      eventType: 'seller_bonus',
      amount,
      commissionRate: 0,
      commissionAmount: amount,
      status: 'approved',
      description: `Seller referral bonus for published store ${publishedStoreId}`,
      trackingCode: session.trackingCode,
      createdAt,
      releasedAt: createdAt
    });
  }
}

export const affiliateCommissionService = new AffiliateCommissionService();
