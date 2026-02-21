
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    setDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    signInWithPopup, 
    sendPasswordResetEmail,
    GoogleAuthProvider,
    User as FirebaseUser,
    confirmPasswordReset
} from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { db as mockDb } from '../data/database';
import { backendFetch, isBackendConfigured } from './backendClient';
import supabaseMirror from './supabaseMirror';
import personaService from './personaService';
import workService, { mapWorkListingToService } from './workService';
import proposalService from './proposalService';
import contractService from './contractService';
import { shouldUseFirestoreFallback, shouldUseLocalMockFallback } from './dataMode';
import type { 
    Item, 
    User, 
    Category, 
    Review, 
    WishlistItem, 
    Badge, 
    ItemCollection, 
    DiscountCode, 
    Booking, 
    RentalHistoryItem, 
    Offer, 
    Affiliate, 
    AffiliateEarning, 
    AffiliateLink, 
    AffiliateCoupon, 
    CreativeAsset, 
    AffiliateProfile, 
    GameUpload, 
    Reel, 
    Post, 
    Service, 
    ServiceProviderProfile, 
    Job, 
    LiveStream,
    WalletTransaction,
    PayoutMethod,
    SupplierProduct,
    Event,
    ProjectShowcase,
    SellerPerformanceStats,
    GrowthInsight,
    CartItem,
    Notification,
    ListingActivityPreferences
} from '../types';
import { CATEGORIES, HIERARCHICAL_CATEGORIES } from '../constants';

// Helper to convert Firestore doc to typed object
export const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as T;
};

const getBackendToken = async () => {
    if (!auth.currentUser) return undefined;
    try {
        return await auth.currentUser.getIdToken();
    } catch {
        return undefined;
    }
};

let mockDbReady = false;
const ensureMockDb = () => {
    if (!mockDbReady) {
        mockDb.init();
        mockDbReady = true;
    }
};
const supabaseUserIdCache = new Map<string, string>();

const resolveSupabaseUserId = async (firebaseUid: string): Promise<string | null> => {
    if (!firebaseUid || !isBackendConfigured()) return null;
    const cached = supabaseUserIdCache.get(firebaseUid);
    if (cached) return cached;
    try {
        const token = await getBackendToken();
        const res = await backendFetch(`/api/users?eq.firebase_uid=${firebaseUid}&select=id,firebase_uid&limit=1`, {}, token);
        const data = res?.data;
        const row = Array.isArray(data) ? data[0] : data;
        const supabaseId = row?.id || null;
        if (supabaseId) {
            supabaseUserIdCache.set(firebaseUid, supabaseId);
        }
        return supabaseId;
    } catch (error) {
        console.warn('Supabase user lookup failed:', error);
        return null;
    }
};
const mapSupabaseNotification = (row: any): Notification => ({
    id: row?.id || '',
    userId: row?.user_id || row?.userId || '',
    type: ((row?.type || 'INFO') as string).toUpperCase() as Notification['type'],
    message: row?.body || row?.message || row?.title || '',
    link: row?.link || '',
    isRead: Boolean(row?.read_at || row?.is_read || row?.isRead),
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const mapPersonaNotification = (row: any, fallbackUserId: string): Notification => ({
    id: row?.id ? `persona-${row.id}` : `persona-${Date.now()}`,
    userId: fallbackUserId,
    type: ((row?.type || 'INFO') as string).toUpperCase() as Notification['type'],
    message: row?.body || row?.message || row?.title || '',
    link: row?.link || '',
    isRead: Boolean(row?.read_at || row?.is_read || row?.isRead),
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const mapBackendUserRow = (row: any): User => ({
    id: row?.firebase_uid || row?.id || '',
    name: row?.name || 'User',
    email: row?.email || '',
    avatar: row?.avatar_url || '/icons/urbanprime.svg',
    phone: row?.phone || '',
    status: (row?.status || 'active') as User['status'],
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: row?.created_at || new Date().toISOString(),
    accountLifecycle: 'member',
    capabilities: personaService.getCapabilitiesForPersonaType('consumer')
});

const mapUnifiedProfilePayloadToUser = (payload: any, fallbackUid: string): User | null => {
    const userRow = payload?.user;
    const profileRow = payload?.profile || {};
    if (!userRow) return null;

    const mapped = mapBackendUserRow(userRow);
    const purposeRaw = String(profileRow?.purpose || '').toLowerCase();
    let purpose: User['purpose'] | undefined = mapped.purpose;
    if (purposeRaw.includes('sell') && (purposeRaw.includes('buy') || purposeRaw.includes('rent'))) purpose = 'both';
    else if (purposeRaw.includes('sell')) purpose = 'list';
    else if (purposeRaw.length > 0) purpose = 'rent';

    return {
        ...mapped,
        id: userRow?.firebase_uid || fallbackUid || mapped.id,
        phone: userRow?.phone || mapped.phone || '',
        city: profileRow?.city || '',
        country: profileRow?.country || '',
        currencyPreference: profileRow?.currency_preference || '',
        interests: Array.isArray(profileRow?.interests) ? profileRow.interests.map((entry: any) => String(entry)) : [],
        about: profileRow?.about || undefined,
        businessName: profileRow?.business_name || undefined,
        businessDescription: profileRow?.business_description || undefined,
        dob: profileRow?.dob || undefined,
        gender: profileRow?.gender || undefined,
        purpose
    };
};



const BACKEND_ITEM_SELECT = [
    'id',
    'seller_id',
    'owner_persona_id',
    'store_id',
    'category_id',
    'title',
    'description',
    'listing_type',
    'status',
    'condition',
    'brand',
    'currency',
    'sale_price',
    'rental_price',
    'auction_start_price',
    'auction_reserve_price',
    'stock',
    'is_featured',
    'is_verified',
    'metadata',
    'created_at',
    'updated_at'
].join(',');

const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeListingType = (value: unknown): Item['listingType'] => {
    if (value === 'rent') return 'rent';
    if (value === 'auction') return 'auction';
    if (value === 'both') return 'both';
    return 'sale';
};

const normalizeItemStatus = (value: unknown): Item['status'] => {
    if (value === 'draft' || value === 'archived' || value === 'sold' || value === 'published') {
        return value;
    }
    return 'published';
};

const mapBackendItemRow = (
    row: any,
    ownerRow?: any,
    categoryName?: string,
    imageUrls: string[] = []
): Item => {
    const metadata = row?.metadata || {};
    const itemImages = imageUrls.length > 0
        ? imageUrls
        : Array.isArray(metadata.imageUrls)
            ? metadata.imageUrls
            : Array.isArray(metadata.images)
                ? metadata.images
                : [];

    const salePrice = toNumber(row?.sale_price, toNumber(metadata.salePrice, 0));
    const rentalPrice = toNumber(row?.rental_price, toNumber(metadata.rentalPrice, 0));
    const auctionStartPrice = toNumber(row?.auction_start_price, toNumber(metadata.auctionStartPrice, 0));

    return {
        id: row?.id,
        title: row?.title || metadata.title || 'Untitled Item',
        description: row?.description || metadata.description || '',
        category: categoryName || metadata.category || 'General',
        price: salePrice || rentalPrice || auctionStartPrice || 0,
        salePrice,
        rentalPrice,
        listingType: normalizeListingType(row?.listing_type || metadata.listingType),
        images: itemImages,
        imageUrls: itemImages,
        owner: {
            id: ownerRow?.firebase_uid || row?.seller_id || '',
            name: ownerRow?.name || metadata.ownerName || 'Seller',
            avatar: ownerRow?.avatar_url || metadata.ownerAvatar || '/icons/urbanprime.svg'
        },
        ownerPersonaId: row?.owner_persona_id || metadata.ownerPersonaId,
        activityPreferences: normalizeActivityPreferences(metadata.activityPreferences || {}),
        avgRating: toNumber(metadata.avgRating, 0),
        reviews: Array.isArray(metadata.reviews) ? metadata.reviews : [],
        isFeatured: Boolean(row?.is_featured),
        isVerified: Boolean(row?.is_verified),
        stock: toNumber(row?.stock, toNumber(metadata.stock, 0)),
        brand: row?.brand || metadata.brand,
        condition: row?.condition || metadata.condition,
        status: normalizeItemStatus(row?.status || metadata.status),
        createdAt: row?.created_at || metadata.createdAt || new Date().toISOString()
    } as Item;
};

const fetchBackendItemSupport = async (rows: any[], token?: string) => {
    const usersById = new Map<string, any>();
    const categoriesById = new Map<string, string>();
    const imagesByItemId = new Map<string, string[]>();

    if (!isBackendConfigured() || rows.length === 0) {
        return { usersById, categoriesById, imagesByItemId };
    }

    const sellerIds = [...new Set(rows.map((row) => row?.seller_id).filter(Boolean))];
    if (sellerIds.length > 0) {
        try {
            const params = new URLSearchParams();
            params.set('select', 'id,firebase_uid,name,avatar_url');
            params.set('in.id', sellerIds.join(','));
            params.set('limit', String(Math.max(200, sellerIds.length + 10)));
            const usersRes = await backendFetch(`/api/users?${params.toString()}`, {}, token);
            const users = Array.isArray(usersRes?.data) ? usersRes.data : [];
            users.forEach((userRow: any) => usersById.set(userRow.id, userRow));
        } catch (error) {
            console.warn('Backend user support fetch failed:', error);
        }
    }

    const categoryIds = [...new Set(rows.map((row) => row?.category_id).filter(Boolean))];
    if (categoryIds.length > 0) {
        try {
            const params = new URLSearchParams();
            params.set('select', 'id,name');
            params.set('in.id', categoryIds.join(','));
            params.set('limit', String(Math.max(200, categoryIds.length + 10)));
            const categoriesRes = await backendFetch(`/api/categories?${params.toString()}`, {}, token);
            const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
            categories.forEach((categoryRow: any) => categoriesById.set(categoryRow.id, categoryRow.name || 'General'));
        } catch (error) {
            console.warn('Backend category support fetch failed:', error);
        }
    }

    const itemIds = [...new Set(rows.map((row) => row?.id).filter(Boolean))];
    if (itemIds.length > 0) {
        try {
            const params = new URLSearchParams();
            params.set('select', 'item_id,url,sort_order');
            params.set('in.item_id', itemIds.join(','));
            params.set('order', 'sort_order.asc');
            params.set('limit', String(Math.max(300, itemIds.length * 8)));
            const imagesRes = await backendFetch(`/api/item_images?${params.toString()}`, {}, token);
            const rows = Array.isArray(imagesRes?.data) ? imagesRes.data : [];
            rows.forEach((imageRow: any) => {
                const key = imageRow?.item_id;
                if (!key || !imageRow?.url) return;
                const existing = imagesByItemId.get(key) || [];
                existing.push(imageRow.url);
                imagesByItemId.set(key, existing);
            });
        } catch (error) {
            console.warn('Backend item image support fetch failed:', error);
        }
    }

    return { usersById, categoriesById, imagesByItemId };
};

const syncUserToBackend = async (firebaseUser: FirebaseUser, payload: Partial<User> = {}): Promise<User | null> => {
    if (!isBackendConfigured()) return null;
    const token = await getBackendToken();
    const body = {
        firebase_uid: firebaseUser.uid,
        email: payload.email || firebaseUser.email || null,
        name: payload.name || firebaseUser.displayName || 'User',
        avatar_url: payload.avatar || firebaseUser.photoURL || '/icons/urbanprime.svg',
        phone: payload.phone || null
    };

    try {
        const res = await backendFetch('/auth/sync-user', {
            method: 'POST',
            body: JSON.stringify(body)
        }, token);

        const row = res?.user;
        if (!row) return null;
        return mapBackendUserRow(row);
    } catch (error) {
        console.warn('Backend user sync failed:', error);
        return null;
    }
};

export type ItemEventAction = 'item_view' | 'cart_add' | 'purchase' | 'rent' | 'auction_win';

export type ItemEvent = {
    id?: string;
    action: ItemEventAction;
    ownerId: string;
    ownerPersonaId?: string | null;
    itemId: string;
    itemTitle: string;
    listingType?: string;
    actorId?: string | null;
    actorPersonaId?: string | null;
    actorName?: string;
    durationMs?: number;
    quantity?: number;
    createdAt?: string;
    metadata?: Record<string, unknown>;
};

export type ItemActivitySummary = {
    totalEvents: number;
    views: number;
    cartAdds: number;
    purchases: number;
    rentals: number;
    auctionWins: number;
    averageViewSeconds: number;
};

export type OwnerControlRow = {
    itemId: string;
    itemTitle: string;
    listingType?: string;
    status?: string;
    ownerPersonaId?: string | null;
    item: Item;
    preferences: ListingActivityPreferences;
    metrics: {
        views: number;
        cartAdds: number;
        purchases: number;
        rentals: number;
        auctionWins: number;
        averageViewSeconds: number;
        lastActivityAt?: string;
    };
};

const DEFAULT_ACTIVITY_PREFERENCES: ListingActivityPreferences = {
    itemView: true,
    cartAdd: true,
    purchase: true,
    rent: true,
    auctionWin: true,
    instantAlert: true,
    dailyDigest: true
};

const normalizeActivityPreferences = (raw: any): ListingActivityPreferences => ({
    itemView: raw?.itemView !== false,
    cartAdd: raw?.cartAdd !== false,
    purchase: raw?.purchase !== false,
    rent: raw?.rent !== false,
    auctionWin: raw?.auctionWin !== false,
    instantAlert: raw?.instantAlert !== false,
    dailyDigest: raw?.dailyDigest !== false
});

const getItemActivityPreferences = (item?: Partial<Item> | null): ListingActivityPreferences => {
    if (!item) return { ...DEFAULT_ACTIVITY_PREFERENCES };
    const raw = (item as any).activityPreferences || (item as any).metadata?.activityPreferences;
    return normalizeActivityPreferences(raw || DEFAULT_ACTIVITY_PREFERENCES);
};

const createEmptyItemActivitySummary = (): ItemActivitySummary => ({
    totalEvents: 0,
    views: 0,
    cartAdds: 0,
    purchases: 0,
    rentals: 0,
    auctionWins: 0,
    averageViewSeconds: 0
});

const buildActivitySummary = (events: ItemEvent[]): ItemActivitySummary => {
    const viewEvents = events.filter((event) => event.action === 'item_view');
    const totalViewMs = viewEvents.reduce((sum, event) => sum + (event.durationMs || 0), 0);

    return {
        totalEvents: events.length,
        views: viewEvents.length,
        cartAdds: events.filter((event) => event.action === 'cart_add').length,
        purchases: events.filter((event) => event.action === 'purchase').length,
        rentals: events.filter((event) => event.action === 'rent').length,
        auctionWins: events.filter((event) => event.action === 'auction_win').length,
        averageViewSeconds: viewEvents.length ? Math.round(totalViewMs / viewEvents.length / 1000) : 0
    };
};

const mapAuditLogEvent = (row: any): ItemEvent => {
    const details = row?.details || {};
    return {
        id: row?.id || '',
        action: (row?.action || 'item_view') as ItemEventAction,
        ownerId: row?.entity_id || details.ownerFirebaseUid || details.ownerId || '',
        ownerPersonaId: details.ownerPersonaId || null,
        itemId: details.itemId || '',
        itemTitle: details.itemTitle || 'Item',
        listingType: details.listingType,
        actorId: row?.actor_user_id || details.actorFirebaseUid || details.actorId || null,
        actorPersonaId: details.actorPersonaId || null,
        actorName: details.actorName,
        durationMs: details.durationMs,
        quantity: details.quantity,
        createdAt: row?.created_at || details.createdAt || new Date().toISOString(),
        metadata: details.metadata || {}
    };
};

const userHasCapability = (user: User, capability: 'buy' | 'rent' | 'sell' | 'provide_service' | 'affiliate' | 'admin'): boolean => {
    const state = user.capabilities?.[capability];
    if (state === 'active') return true;

    if (capability === 'admin') return Boolean(user.isAdmin);
    if (capability === 'provide_service') return Boolean(user.isServiceProvider || user.providerProfile);
    if (capability === 'affiliate') return Boolean(user.isAffiliate || user.affiliateOnboardingCompleted);
    if (capability === 'sell') return user.purpose === 'list' || user.purpose === 'both' || Boolean(user.businessName);
    if (capability === 'rent') return !user.purpose || user.purpose === 'rent' || user.purpose === 'both';
    if (capability === 'buy') return true;

    return false;
};

const filterUsersByPersonaType = async (
  users: User[],
  personaType: 'consumer' | 'seller' | 'provider' | 'affiliate',
  fallbackCapability: 'buy' | 'rent' | 'sell' | 'provide_service' | 'affiliate' | 'admin'
): Promise<User[]> => {
  try {
    const personaUserIds = await personaService.getUserIdsByPersonaType(personaType);
    if (personaUserIds.length > 0) {
      const allowed = new Set(personaUserIds);
      return users.filter((user) => allowed.has(user.id));
    }
  } catch (error) {
    console.warn('Persona directory filter failed:', error);
  }

  return users.filter((user) => userHasCapability(user, fallbackCapability));
};

const getAllActiveUsers = async (): Promise<User[]> => {
    if (isBackendConfigured()) {
        try {
            const token = await getBackendToken();
            const res = await backendFetch('/api/users?eq.status=active&select=id,firebase_uid,email,name,avatar_url,phone,status,created_at&limit=2000', {}, token);
            const rows = Array.isArray(res?.data) ? res.data : [];
            if (rows.length > 0) {
                return rows.map(mapBackendUserRow).filter((user) => (user.status || 'active') === 'active');
            }
        } catch (error) {
            console.warn('Backend active users fetch failed:', error);
        }
    }

    if (supabaseMirror.enabled) {
        const mirrored = await supabaseMirror.list<User>('users', { limit: 2000 });
        if (mirrored.length > 0) {
            return mirrored.filter((user) => (user.status || 'active') === 'active');
        }
    }

    if (shouldUseFirestoreFallback()) {
        try {
            const activeQuery = query(collection(db, 'users'), where('status', '==', 'active'));
            const activeSnapshot = await getDocs(activeQuery);
            if (!activeSnapshot.empty) {
                return activeSnapshot.docs.map((docSnap) => fromFirestore<User>(docSnap));
            }
        } catch (error) {
            console.warn('Firestore active users fetch failed:', error);
        }

        try {
            const allSnapshot = await getDocs(query(collection(db, 'users')));
            if (!allSnapshot.empty) {
                const users = allSnapshot.docs.map((docSnap) => fromFirestore<User>(docSnap));
                return users.filter((user) => (user.status || 'active') === 'active');
            }
        } catch (error) {
            console.warn('Firestore users fallback fetch failed:', error);
        }
    }

    if (shouldUseLocalMockFallback()) {
        ensureMockDb();
        const users = mockDb.get<User[]>('users') || [];
        return users.filter((user) => (user.status || 'active') === 'active');
    }

    return [];
};

const mapNotificationTypeForBackend = (type?: string) => {
    const normalized = (type || 'info').toLowerCase();
    if (normalized === 'order' || normalized === 'sale' || normalized === 'purchase' || normalized === 'rent' || normalized === 'auction') {
        return 'order';
    }
    if (normalized === 'message') return 'message';
    if (normalized === 'listing' || normalized === 'cart' || normalized === 'view') return 'listing';
    if (normalized === 'promo') return 'promo';
    return 'system';
};

const buildOwnerNotification = (event: ItemEvent) => {
    const actorName = event.actorName || 'Someone';
    const itemTitle = event.itemTitle || 'item';
    const quantityLabel = event.quantity ? ` x${event.quantity}` : '';
    if (event.action === 'cart_add') {
        return {
            type: 'INFO' as Notification['type'],
            message: `${actorName} added ${itemTitle} to cart${quantityLabel}.`,
            link: `/item/${event.itemId}`
        };
    }
    if (event.action === 'purchase') {
        return {
            type: 'ORDER' as Notification['type'],
            message: `${actorName} purchased ${itemTitle}${quantityLabel}.`,
            link: '/profile/orders'
        };
    }
    if (event.action === 'rent') {
        return {
            type: 'ORDER' as Notification['type'],
            message: `${actorName} rented ${itemTitle}${quantityLabel}.`,
            link: '/profile/orders'
        };
    }
    if (event.action === 'auction_win') {
        return {
            type: 'ORDER' as Notification['type'],
            message: `${actorName} won the auction for ${itemTitle}.`,
            link: '/profile/orders'
        };
    }
    return null;
};

const logItemEventInternal = async (event: ItemEvent) => {
    if (!event.ownerId || !event.itemId) return;

    const createdAt = event.createdAt || new Date().toISOString();
    let backendHandled = false;

    if (isBackendConfigured()) {
        try {
            const token = await getBackendToken();
            await backendFetch('/activity/events', {
                method: 'POST',
                body: JSON.stringify({
                    action: event.action,
                    owner_firebase_uid: event.ownerId,
                    owner_persona_id: event.ownerPersonaId || null,
                    actor_firebase_uid: event.actorId || null,
                    actor_persona_id: event.actorPersonaId || null,
                    actor_name: event.actorName || null,
                    item_id: event.itemId,
                    item_title: event.itemTitle,
                    listing_type: event.listingType || null,
                    quantity: event.quantity || null,
                    duration_ms: event.durationMs || null,
                    metadata: event.metadata || {}
                })
            }, token);
            backendHandled = true;
        } catch (error) {
            console.warn('Backend activity event endpoint failed, falling back:', error);
        }
    }

    if (!backendHandled) {
        const payload = {
            action: event.action,
            entity_type: 'item',
            entity_id: event.ownerId,
            actor_user_id: event.actorId || null,
            details: {
                ownerId: event.ownerId,
                ownerPersonaId: event.ownerPersonaId || null,
                itemId: event.itemId,
                itemTitle: event.itemTitle,
                listingType: event.listingType,
                actorId: event.actorId || null,
                actorPersonaId: event.actorPersonaId || null,
                actorName: event.actorName,
                durationMs: event.durationMs,
                quantity: event.quantity,
                createdAt,
                metadata: event.metadata || {}
            }
        };

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                await backendFetch('/api/audit_logs', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, token);
            } catch (error) {
                console.warn('Backend audit log failed:', error);
            }
        } else {
            try {
                await addDoc(collection(db, 'audit_logs'), {
                    ownerId: event.ownerId,
                    ownerPersonaId: event.ownerPersonaId || null,
                    action: event.action,
                    itemId: event.itemId,
                    itemTitle: event.itemTitle,
                    listingType: event.listingType,
                    actorId: event.actorId || null,
                    actorPersonaId: event.actorPersonaId || null,
                    actorName: event.actorName,
                    durationMs: event.durationMs,
                    quantity: event.quantity,
                    createdAt,
                    metadata: event.metadata || {}
                });
            } catch (error) {
                console.warn('Firestore audit log failed:', error);
            }
        }
    }

    if (backendHandled) return;

    const notification = buildOwnerNotification(event);
    if (!notification) return;

    if (isBackendConfigured()) {
        try {
            const token = await getBackendToken();
            const supabaseOwnerId = await resolveSupabaseUserId(event.ownerId);
            if (!supabaseOwnerId) throw new Error('Supabase owner id not found');
            await backendFetch('/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: supabaseOwnerId,
                    type: mapNotificationTypeForBackend(notification.type),
                    title: 'New activity',
                    body: notification.message,
                    link: notification.link
                })
            }, token);
            return;
        } catch (error) {
            console.warn('Backend notification failed:', error);
        }
    }

    try {
        await addDoc(collection(db, 'notifications'), {
            userId: event.ownerId,
            type: notification.type,
            message: notification.message,
            link: notification.link,
            isRead: false,
            createdAt
        });
    } catch (error) {
        console.warn('Firestore notification failed:', error);
    }
};

// --- AUTH SERVICE ---
export const authService = {
    login: async (email: string, pass: string): Promise<User> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        await syncUserToBackend(userCredential.user);
        const user = await userService.getUserById(userCredential.user.uid);
        if (!user) throw new Error('User profile not found');
        return user;
    },
    register: async (name: string, email: string, pass: string, phone: string, city: string): Promise<void> => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await userService.createUserProfile(userCredential.user, { name, phone, city });
        await syncUserToBackend(userCredential.user, { name, email, phone, city });
    },
    logout: async () => {
        await signOut(auth);
    },
    signInWithGoogle: async (): Promise<void> => {
        const result = await signInWithPopup(auth, googleProvider);
        await syncUserToBackend(result.user);
    },
    getProfile: async (uid: string): Promise<User | null> => {
        return userService.getUserById(uid);
    },
    createUserProfile: async (firebaseUser: FirebaseUser, additionalData: Partial<User>): Promise<User> => {
        return userService.createUserProfile(firebaseUser, additionalData);
    },
    requestPasswordReset: async (email: string) => {
        await sendPasswordResetEmail(auth, email);
        return { token: 'mock-token' };
    },
    resetPassword: async (token: string, newPass: string) => {
        await confirmPasswordReset(auth, token, newPass);
    }
};

// --- USER SERVICE ---
export const userService = {
    getUserById: async (uid: string): Promise<User | null> => {
        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const res = await backendFetch(`/api/users?eq.firebase_uid=${uid}&select=id,firebase_uid,email,name,avatar_url,phone,status,created_at&limit=1`, {}, token);
                const rows = Array.isArray(res?.data) ? res.data : [];
                if (rows.length > 0) {
                    return mapBackendUserRow(rows[0]);
                }
            } catch (error) {
                console.warn('Backend user fetch failed:', error);
            }
        }

        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.get<User>('users', uid);
            if (mirrored) return mirrored;
        }

        if (shouldUseFirestoreFallback()) {
            try {
                const docRef = doc(db, 'users', uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return fromFirestore<User>(docSnap);
            } catch (error) {
                console.warn('Firestore user fetch failed:', error);
            }
        }

        if (shouldUseLocalMockFallback()) {
            ensureMockDb();
            const users = mockDb.get<User[]>('users') || [];
            return users.find((u) => u.id === uid) || null;
        }

        return null;
    },
    createUserProfile: async (firebaseUser: FirebaseUser, additionalData: Partial<User>): Promise<User> => {
        const capabilities = personaService.getCapabilitiesForPersonaType('consumer', {
            isAdmin: Boolean(additionalData.isAdmin),
            isServiceProvider: Boolean(additionalData.isServiceProvider || additionalData.providerProfile),
            isAffiliate: Boolean(additionalData.isAffiliate || additionalData.affiliateOnboardingCompleted)
        });

        if (additionalData.purpose === 'list' || additionalData.purpose === 'both' || Boolean(additionalData.businessName)) {
            capabilities.sell = 'active';
        }
        if (additionalData.isServiceProvider || additionalData.providerProfile) {
            capabilities.provide_service = 'active';
        }
        if (additionalData.isAffiliate || additionalData.affiliateOnboardingCompleted) {
            capabilities.affiliate = 'active';
        }

        const newUser: User = {
            id: firebaseUser.uid,
            name: additionalData.name || firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || '/icons/urbanprime.svg',
            following: [],
            followers: [],
            wishlist: [],
            cart: [],
            badges: [],
            memberSince: new Date().toISOString(),
            status: 'active',
            accountLifecycle: 'member',
            capabilities,
            ...additionalData
        };

        await syncUserToBackend(firebaseUser, newUser);

        if (shouldUseFirestoreFallback()) {
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser, { merge: true });
        }

        if (supabaseMirror.enabled) {
            await supabaseMirror.upsert('users', firebaseUser.uid, { ...newUser, id: firebaseUser.uid });
        }

        return newUser;
    },
    updateUserProfile: async (uid: string, updates: Partial<User>): Promise<User> => {
        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const payload: Record<string, any> = {};
                if (updates.name !== undefined) payload.name = updates.name;
                if (updates.email !== undefined) payload.email = updates.email;
                if (updates.avatar !== undefined) payload.avatar = updates.avatar;
                if (updates.phone !== undefined) payload.phone = updates.phone;
                if (updates.status !== undefined) payload.status = updates.status;
                if (updates.city !== undefined) payload.city = updates.city;
                if (updates.country !== undefined) payload.country = updates.country;
                if (updates.interests !== undefined) payload.interests = updates.interests;
                if (updates.currencyPreference !== undefined) payload.currencyPreference = updates.currencyPreference;
                if (updates.about !== undefined) payload.about = updates.about;
                if (updates.businessName !== undefined) payload.businessName = updates.businessName;
                if (updates.businessDescription !== undefined) payload.businessDescription = updates.businessDescription;
                if (updates.dob !== undefined) payload.dob = updates.dob;
                if (updates.gender !== undefined) payload.gender = updates.gender;
                if (updates.purpose !== undefined) payload.purpose = updates.purpose;

                if (Object.keys(payload).length > 0) {
                    const patched = await backendFetch('/profile/me', {
                        method: 'PATCH',
                        body: JSON.stringify(payload)
                    }, token);
                    const mapped = mapUnifiedProfilePayloadToUser(patched, uid);
                    if (mapped) {
                        const merged = { ...mapped, ...updates, id: uid };
                        if (supabaseMirror.enabled) {
                            await supabaseMirror.upsert('users', uid, merged);
                        }
                        return merged;
                    }
                }
            } catch (error) {
                console.warn('Backend user update failed:', error);
            }
        }

        if (shouldUseFirestoreFallback()) {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, updates);
            if (supabaseMirror.enabled) {
                await supabaseMirror.mergeUpdate<User>('users', uid, updates);
            }
            const updatedDoc = await getDoc(userRef);
            return fromFirestore<User>(updatedDoc);
        }

        if (supabaseMirror.enabled) {
            await supabaseMirror.mergeUpdate<User>('users', uid, updates);
            const mirrored = await supabaseMirror.get<User>('users', uid);
            if (mirrored) return mirrored;
        }

        throw new Error('Unable to update profile: no active data source available.');
    },
    getAllSellers: async (): Promise<User[]> => {
        return getAllActiveUsers();
    },
    getAllRenters: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'consumer', 'rent');
    },
    getAllBuyers: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'consumer', 'buy');
    },
    getWishlistForUser: async (userId: string): Promise<{ wishlist: WishlistItem[], items: Item[] }> => {
        if (!shouldUseFirestoreFallback()) {
            return { wishlist: [], items: [] };
        }

        try {
            const q = query(collection(db, 'wishlists'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const wishlist = snapshot.docs.map((docSnap) => fromFirestore<WishlistItem>(docSnap));

            const items = await Promise.all(
                wishlist.map(async (w) => {
                    const item = await itemService.getItemById(w.itemId);
                    return item;
                })
            );

            return { wishlist, items: items.filter(Boolean) as Item[] };
        } catch (error) {
            console.warn('Wishlist fetch failed:', error);
            return { wishlist: [], items: [] };
        }
    },
    getPublicWishlist: async (userId: string): Promise<WishlistItem[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }

        try {
            const q = query(collection(db, 'wishlists'), where('userId', '==', userId), where('isPublic', '==', true));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => fromFirestore<WishlistItem>(docSnap));
        } catch (error) {
            console.warn('Public wishlist fetch failed:', error);
            return [];
        }
    },
    toggleWishlist: async (_userId: string, _itemId: string) => {
        // TODO: implement dedicated wishlist writes.
    },
    toggleWishlistLike: async (_ownerId: string, _itemId: string, _likerId: string) => {
        // TODO: implement wishlist like writes.
    },
    addWishlistComment: async (_ownerId: string, _itemId: string, _user: User, _text: string) => {
        // TODO: implement wishlist comments.
    },
    getBadges: async (badgeIds: string[]): Promise<Badge[]> => {
        return badgeIds.map((id) => ({ id, name: id, icon: 'star', description: 'Badge' }));
    },
    getCollectionsForUser: async (userId: string): Promise<ItemCollection[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }

        try {
            const q = query(collection(db, 'collections'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const collections = snapshot.docs.map((docSnap) => fromFirestore<ItemCollection>(docSnap));

            for (const col of collections) {
                const items = await Promise.all(col.itemIds.slice(0, 5).map((id) => itemService.getItemById(id)));
                col.items = items.filter(Boolean) as Item[];
            }
            return collections;
        } catch (error) {
            console.warn('Collections fetch failed:', error);
            return [];
        }
    },
    getPublicCollectionsForUser: async (userId: string): Promise<ItemCollection[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }

        try {
            const q = query(collection(db, 'collections'), where('userId', '==', userId), where('isPublic', '==', true));
            const snapshot = await getDocs(q);
            const collections = snapshot.docs.map((docSnap) => fromFirestore<ItemCollection>(docSnap));

            for (const col of collections) {
                const items = await Promise.all(col.itemIds.slice(0, 5).map((id) => itemService.getItemById(id)));
                col.items = items.filter(Boolean) as Item[];
            }
            return collections;
        } catch (error) {
            console.warn('Public collections fetch failed:', error);
            return [];
        }
    },
    createCollection: async (userId: string, name: string, description: string, isPublic: boolean): Promise<ItemCollection> => {
        if (!shouldUseFirestoreFallback()) {
            const created: ItemCollection = {
                id: `collection-${Date.now()}`,
                userId,
                name,
                description,
                isPublic,
                itemIds: [],
                isShopTheLook: false,
                items: []
            };
            return created;
        }

        const newCol = {
            userId,
            name,
            description,
            isPublic,
            itemIds: [],
            isShopTheLook: false
        };
        const docRef = await addDoc(collection(db, 'collections'), newCol);
        return { id: docRef.id, ...newCol, items: [] } as ItemCollection;
    },
    updateCollection: async (collectionId: string, updates: Partial<ItemCollection>): Promise<Partial<ItemCollection>> => {
        if (!shouldUseFirestoreFallback()) {
            return updates;
        }
        await updateDoc(doc(db, 'collections', collectionId), updates);
        return updates;
    },
    addItemToCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
        if (!shouldUseFirestoreFallback()) {
            return {
                id: collectionId,
                userId: '',
                name: 'Collection',
                description: '',
                isPublic: false,
                itemIds: [itemId],
                isShopTheLook: false,
                items: []
            } as ItemCollection;
        }
        await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayUnion(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        return fromFirestore<ItemCollection>(snap);
    },
    removeItemFromCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
        if (!shouldUseFirestoreFallback()) {
            return {
                id: collectionId,
                userId: '',
                name: 'Collection',
                description: '',
                isPublic: false,
                itemIds: [],
                isShopTheLook: false,
                items: []
            } as ItemCollection;
        }
        await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayRemove(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        return fromFirestore<ItemCollection>(snap);
    },
    getPublicProfile: async (userId: string): Promise<{ user: User; items: Item[]; store: any } | null> => {
        const user = await userService.getUserById(userId);
        if (!user) return null;
        const items = await itemService.getItemsByOwner(userId);

        if (!shouldUseFirestoreFallback()) {
            return { user, items, store: null };
        }

        try {
            const q = query(collection(db, 'storefronts'), where('ownerId', '==', userId));
            const storeSnap = await getDocs(q);
            const store = storeSnap.empty ? null : fromFirestore(storeSnap.docs[0]);
            return { user, items, store };
        } catch (error) {
            console.warn('Public profile store fetch failed:', error);
            return { user, items, store: null };
        }
    },
    toggleFollow: async (followerId: string, followingId: string): Promise<{ currentUser: User, followedUser: User }> => {
        if (!shouldUseFirestoreFallback()) {
            const currentUser = await userService.getUserById(followerId);
            const followedUser = await userService.getUserById(followingId);
            if (!currentUser || !followedUser) {
                throw new Error('Unable to follow user: profile not found.');
            }
            return { currentUser, followedUser };
        }

        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        const followerSnap = await getDoc(followerRef);
        const followerData = followerSnap.data() as User;

        const newFollowing = Array.isArray(followerData.following) ? [...followerData.following] : [];
        if (newFollowing.includes(followingId)) {
            await updateDoc(followerRef, { following: arrayRemove(followingId) });
            await updateDoc(followingRef, { followers: arrayRemove(followerId) });
        } else {
            await updateDoc(followerRef, { following: arrayUnion(followingId) });
            await updateDoc(followingRef, { followers: arrayUnion(followerId) });
        }

        const updatedFollower = await getDoc(followerRef);
        const updatedFollowing = await getDoc(followingRef);

        return {
            currentUser: fromFirestore<User>(updatedFollower),
            followedUser: fromFirestore<User>(updatedFollowing)
        };
    },
    getNotificationsForUser: async (
        userId: string,
        options: { personaId?: string; includePersona?: boolean; limit?: number } = {}
    ): Promise<Notification[]> => {
        const { personaId, includePersona = true, limit: requestedLimit } = options;
        const effectiveLimit = Math.min(Math.max(Number(requestedLimit || 30), 1), 100);

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const supabaseId = await resolveSupabaseUserId(userId);
                if (!supabaseId) return [];

                const notifications: Notification[] = [];
                const userRes = await backendFetch(
                    `/api/notifications?eq.user_id=${supabaseId}&order=created_at.desc&limit=${effectiveLimit}`,
                    {},
                    token
                );
                const userRows = Array.isArray(userRes?.data) ? userRes.data : [];
                notifications.push(...userRows.map(mapSupabaseNotification));

                if (includePersona && personaId) {
                    const personaRes = await backendFetch(
                        `/personas/${personaId}/notifications?limit=${effectiveLimit}`,
                        {},
                        token
                    );
                    const personaRows = Array.isArray(personaRes?.data) ? personaRes.data : [];
                    notifications.push(...personaRows.map((row: any) => mapPersonaNotification(row, userId)));
                }

                return notifications
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, effectiveLimit);
            } catch (error) {
                console.warn('Backend notifications fetch failed:', error);
                return [];
            }
        }

        if (!shouldUseFirestoreFallback()) {
            return [];
        }

        try {
            const q = query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(effectiveLimit));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => fromFirestore<Notification>(docSnap));
        } catch (error) {
            console.warn('Firestore notifications fetch failed:', error);
            return [];
        }
    },
    markNotificationsAsRead: async (
        userId: string,
        options: { personaId?: string; includePersona?: boolean } = {}
    ): Promise<void> => {
        const { personaId, includePersona = true } = options;

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const supabaseId = await resolveSupabaseUserId(userId);
                if (!supabaseId) return;

                const readAt = new Date().toISOString();
                const userRes = await backendFetch(`/api/notifications?eq.user_id=${supabaseId}&order=created_at.desc&limit=100`, {}, token);
                const userRows = Array.isArray(userRes?.data) ? userRes.data : [];
                const unread = userRows.filter((n: any) => !n.read_at);
                await Promise.all(
                    unread.map((n: any) =>
                        backendFetch(
                            `/api/notifications/${n.id}`,
                            {
                                method: 'PATCH',
                                body: JSON.stringify({ read_at: readAt })
                            },
                            token
                        )
                    )
                );

                if (includePersona && personaId) {
                    await backendFetch(
                        `/personas/${personaId}/notifications/read`,
                        { method: 'POST', body: JSON.stringify({ read_at: readAt }) },
                        token
                    );
                }
                return;
            } catch (error) {
                console.warn('Backend notifications mark-read failed:', error);
                return;
            }
        }

        if (!shouldUseFirestoreFallback()) {
            return;
        }

        try {
            const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach((docSnap) => {
                batch.update(docSnap.ref, { isRead: true });
            });
            await batch.commit();
        } catch (error) {
            console.warn('Firestore notifications mark-read failed:', error);
        }
    },
    getWalletTransactions: async (userId: string): Promise<WalletTransaction[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }
        try {
            const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => fromFirestore<WalletTransaction>(docSnap));
        } catch (error) {
            console.warn('Wallet transactions fetch failed:', error);
            return [];
        }
    },
    getPayoutMethods: async (userId: string): Promise<PayoutMethod[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }
        try {
            const q = query(collection(db, 'users', userId, 'payoutMethods'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => fromFirestore<PayoutMethod>(docSnap));
        } catch (error) {
            console.warn('Payout methods fetch failed:', error);
            return [];
        }
    },
    addPayoutMethod: async (userId: string, method: Omit<PayoutMethod, 'id'>): Promise<PayoutMethod> => {
        if (!shouldUseFirestoreFallback()) {
            return { id: `payout-${Date.now()}`, ...method };
        }
        const docRef = await addDoc(collection(db, 'users', userId, 'payoutMethods'), method);
        return { id: docRef.id, ...method };
    },
    getPaymentMethods: async (userId: string): Promise<any[]> => {
        if (!shouldUseFirestoreFallback()) {
            return [];
        }
        try {
            const q = query(collection(db, 'users', userId, 'paymentMethods'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => fromFirestore(docSnap));
        } catch (error) {
            console.warn('Payment methods fetch failed:', error);
            return [];
        }
    },
    addPaymentMethod: async (userId: string, method: any): Promise<void> => {
        if (!shouldUseFirestoreFallback()) {
            return;
        }
        await addDoc(collection(db, 'users', userId, 'paymentMethods'), method);
    },
    completeAffiliateOnboarding: async (userId: string, profile: AffiliateProfile) => {
        if (!shouldUseFirestoreFallback()) {
            return;
        }
        await updateDoc(doc(db, 'users', userId), {
            affiliateProfile: profile,
            affiliateOnboardingCompleted: true,
            isAffiliate: true
        });
    }
};

// --- ITEM SERVICE ---
export const itemService = {
    logItemEvent: async (event: ItemEvent): Promise<void> => {
        await logItemEventInternal(event);
    },
    getOwnerActivity: async (ownerId: string, maxResults: number = 100, ownerPersonaId?: string): Promise<ItemEvent[]> => {
        if (!ownerId) return [];

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                if (ownerPersonaId) {
                    const res = await backendFetch(`/activity/owner/${ownerPersonaId}?limit=${maxResults}`, {}, token);
                    const data = Array.isArray(res?.data) ? res.data : [];
                    return data.map(mapAuditLogEvent);
                }

                const res = await backendFetch(`/api/audit_logs?eq.entity_id=${ownerId}&order=created_at.desc&limit=${maxResults}`, {}, token);
                const data = res?.data || [];
                return Array.isArray(data) ? data.map(mapAuditLogEvent) : [];
            } catch (error) {
                console.warn('Backend activity fetch failed:', error);
                return [];
            }
        }

        if (!shouldUseFirestoreFallback()) {
            return [];
        }

        try {
            const q = query(collection(db, 'audit_logs'), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'), limit(maxResults));
            const snapshot = await getDocs(q);
            const mapped = snapshot.docs.map(docSnap => {
                const row = docSnap.data();
                return {
                    id: docSnap.id,
                    action: (row.action || 'item_view') as ItemEventAction,
                    ownerId: row.ownerId || ownerId,
                    ownerPersonaId: row.ownerPersonaId || null,
                    itemId: row.itemId || '',
                    itemTitle: row.itemTitle || 'Item',
                    listingType: row.listingType,
                    actorId: row.actorId || null,
                    actorPersonaId: row.actorPersonaId || null,
                    actorName: row.actorName,
                    durationMs: row.durationMs,
                    quantity: row.quantity,
                    createdAt: row.createdAt || new Date().toISOString(),
                    metadata: row.metadata || {}
                } as ItemEvent;
            });
            return ownerPersonaId ? mapped.filter((event) => event.ownerPersonaId === ownerPersonaId) : mapped;
        } catch (error) {
            console.warn('Firestore activity fetch failed:', error);
            return [];
        }
    },
    getOwnerActivitySummary: async (ownerId: string, ownerPersonaId?: string): Promise<ItemActivitySummary> => {
        if (!ownerId) return createEmptyItemActivitySummary();

        if (isBackendConfigured() && ownerPersonaId) {
            try {
                const token = await getBackendToken();
                const res = await backendFetch(`/activity/summary/${ownerPersonaId}`, {}, token);
                const data = res?.data || {};
                return {
                    totalEvents: Number(data.totalEvents || 0),
                    views: Number(data.views || 0),
                    cartAdds: Number(data.cartAdds || 0),
                    purchases: Number(data.purchases || 0),
                    rentals: Number(data.rentals || 0),
                    auctionWins: Number(data.auctionWins || 0),
                    averageViewSeconds: Number(data.averageViewSeconds || 0)
                };
            } catch (error) {
                console.warn('Backend activity summary fetch failed:', error);
            }
        }

        const events = await itemService.getOwnerActivity(ownerId, 500, ownerPersonaId);
        return buildActivitySummary(events);
    },
    getOwnerControlRows: async (ownerId: string, ownerPersonaId?: string): Promise<OwnerControlRow[]> => {
        if (!ownerId) return [];

        const [rawItems, events] = await Promise.all([
            itemService.getItemsByOwner(ownerId),
            itemService.getOwnerActivity(ownerId, 500, ownerPersonaId)
        ]);

        const items = ownerPersonaId
            ? rawItems.filter((item) => item.ownerPersonaId === ownerPersonaId)
            : rawItems;

        const eventsByItemId = new Map<string, ItemEvent[]>();
        events.forEach((event) => {
            if (!event.itemId) return;
            const list = eventsByItemId.get(event.itemId) || [];
            list.push(event);
            eventsByItemId.set(event.itemId, list);
        });

        return items.map((item) => {
            const itemEvents = eventsByItemId.get(item.id) || [];
            const summary = buildActivitySummary(itemEvents);
            return {
                itemId: item.id,
                itemTitle: item.title,
                listingType: item.listingType,
                status: item.status,
                ownerPersonaId: item.ownerPersonaId || null,
                item,
                preferences: getItemActivityPreferences(item),
                metrics: {
                    views: summary.views,
                    cartAdds: summary.cartAdds,
                    purchases: summary.purchases,
                    rentals: summary.rentals,
                    auctionWins: summary.auctionWins,
                    averageViewSeconds: summary.averageViewSeconds,
                    lastActivityAt: itemEvents[0]?.createdAt
                }
            };
        });
    },
    getItemActivityPreferences: (item: Partial<Item>): ListingActivityPreferences => {
        return getItemActivityPreferences(item);
    },
    updateListingActivityPreferences: async (itemId: string, preferences: ListingActivityPreferences): Promise<void> => {
        await itemService.updateItem(itemId, { activityPreferences: normalizeActivityPreferences(preferences) } as Partial<Item>);
    },
    getItems: async (filters: any = {}, pagination: { page: number, limit: number } = { page: 1, limit: 20 }) => {
        let items: Item[] = [];
        const token = await getBackendToken();

        if (isBackendConfigured()) {
            try {
                const params = new URLSearchParams();
                params.set('select', BACKEND_ITEM_SELECT);
                params.set('order', 'created_at.desc');
                params.set('limit', '2000');
                if (filters.status) {
                    params.set('eq.status', String(filters.status));
                }
                const res = await backendFetch(`/api/items?${params.toString()}`, {}, token);
                const rows = Array.isArray(res?.data) ? res.data : [];
                if (rows.length > 0) {
                    const { usersById, categoriesById, imagesByItemId } = await fetchBackendItemSupport(rows, token);
                    items = rows.map((row: any) => mapBackendItemRow(
                        row,
                        usersById.get(row?.seller_id),
                        categoriesById.get(row?.category_id),
                        imagesByItemId.get(row?.id) || []
                    ));
                    if (supabaseMirror.enabled) {
                        await Promise.all(items.map((item) => supabaseMirror.upsert('items', item.id, item).catch(() => undefined)));
                    }
                }
            } catch (error) {
                console.warn('Backend items fetch failed:', error);
            }
        }

        if (items.length === 0 && supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Item>('items', { limit: 2000 });
            if (mirrored.length > 0) {
                items = mirrored;
            }
        }

        if (items.length === 0 && shouldUseFirestoreFallback()) {
            try {
                const q = query(collection(db, 'items'));
                const snapshot = await getDocs(q);
                items = snapshot.docs.map((docSnap) => fromFirestore<Item>(docSnap));
                if (supabaseMirror.enabled && items.length > 0) {
                    await Promise.all(items.map((item) => supabaseMirror.upsert('items', item.id, item)));
                }
            } catch (error) {
                console.warn('Firestore items fetch failed:', error);
            }
        }

        if (items.length === 0 && shouldUseLocalMockFallback()) {
            ensureMockDb();
            items = mockDb.get<Item[]>('items') || [];
        }

        if (filters.category) {
            const filterValue = String(filters.category).toLowerCase();
            items = items.filter((item) => String(item.category || '').toLowerCase().includes(filterValue));
        }
        if (filters.search) items = items.filter((i) => i.title.toLowerCase().includes(String(filters.search).toLowerCase()));
        if (filters.isFeatured) items = items.filter((i) => i.isFeatured);
        if (filters.minPrice) items = items.filter((i) => (i.salePrice || i.rentalPrice || i.price || 0) >= filters.minPrice);
        if (filters.maxPrice) items = items.filter((i) => (i.salePrice || i.rentalPrice || i.price || 0) <= filters.maxPrice);
        if (!filters.includeArchived) {
            const hiddenStatuses = new Set(['archived', 'draft', 'inactive', 'disabled']);
            items = items.filter((i) => !i.status || !hiddenStatuses.has(String(i.status)));
        }

        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const startIndex = (pagination.page - 1) * pagination.limit;
        const sliced = items.slice(startIndex, startIndex + pagination.limit);

        return { items: sliced, total: items.length };
    },
    getItemById: async (id: string): Promise<Item | undefined> => {
        const token = await getBackendToken();

        if (isBackendConfigured()) {
            try {
                const res = await backendFetch(`/api/items/${id}`, {}, token);
                const row = res?.data;
                if (row) {
                    const { usersById, categoriesById, imagesByItemId } = await fetchBackendItemSupport([row], token);
                    const item = mapBackendItemRow(
                        row,
                        usersById.get(row?.seller_id),
                        categoriesById.get(row?.category_id),
                        imagesByItemId.get(row?.id) || []
                    );
                    if (supabaseMirror.enabled) {
                        await supabaseMirror.upsert('items', item.id, item);
                    }
                    return item;
                }
            } catch (error) {
                console.warn('Backend item fetch failed:', error);
            }
        }

        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.get<Item>('items', id);
            if (mirrored) return mirrored;
        }

        if (shouldUseFirestoreFallback()) {
            try {
                const docRef = doc(db, 'items', id);
                const docSnap = await getDoc(docRef);
                const item = docSnap.exists() ? fromFirestore<Item>(docSnap) : undefined;
                if (item && supabaseMirror.enabled) {
                    await supabaseMirror.upsert('items', item.id, item);
                }
                if (item) return item;
            } catch (error) {
                console.warn('Firestore item fetch failed:', error);
            }
        }

        if (shouldUseLocalMockFallback()) {
            ensureMockDb();
            const items = mockDb.get<Item[]>('items') || [];
            return items.find((item) => item.id === id);
        }

        return undefined;
    },
    getItemsByOwner: async (ownerId: string): Promise<Item[]> => {
         if (!ownerId) return [];
         const token = await getBackendToken();

         if (isBackendConfigured()) {
             try {
                 const resolvedOwnerId = await resolveSupabaseUserId(ownerId);
                 const sellerId = resolvedOwnerId || ownerId;
                 const params = new URLSearchParams();
                 params.set('select', BACKEND_ITEM_SELECT);
                 params.set('eq.seller_id', sellerId);
                 params.set('order', 'created_at.desc');
                 params.set('limit', '500');
                 const res = await backendFetch(`/api/items?${params.toString()}`, {}, token);
                 const rows = Array.isArray(res?.data) ? res.data : [];
                 if (rows.length > 0) {
                     const { usersById, categoriesById, imagesByItemId } = await fetchBackendItemSupport(rows, token);
                     const mapped = rows.map((row: any) => mapBackendItemRow(
                         row,
                         usersById.get(row?.seller_id),
                         categoriesById.get(row?.category_id),
                         imagesByItemId.get(row?.id) || []
                     ));
                     if (supabaseMirror.enabled) {
                         await Promise.all(mapped.map((item) => supabaseMirror.upsert('items', item.id, item).catch(() => undefined)));
                     }
                     return mapped;
                 }
             } catch (error) {
                 console.warn('Backend owner items fetch failed:', error);
             }
         }

         if (supabaseMirror.enabled) {
             const mirroredByOwner = await supabaseMirror.list<Item>('items', { filters: { 'owner.id': ownerId }, limit: 500 });
             if (mirroredByOwner.length > 0) return mirroredByOwner;
             const mirroredByLegacy = await supabaseMirror.list<Item>('items', { filters: { ownerId }, limit: 500 });
             if (mirroredByLegacy.length > 0) return mirroredByLegacy;
         }

         if (shouldUseFirestoreFallback()) {
             try {
                 const q = query(collection(db, 'items'), where('owner.id', '==', ownerId));
                 const snapshot = await getDocs(q);
                 const items = snapshot.docs.map((docSnap) => fromFirestore<Item>(docSnap));
                 if (supabaseMirror.enabled && items.length > 0) {
                     await Promise.all(items.map((item) => supabaseMirror.upsert('items', item.id, item)));
                 }
                 if (items.length > 0) return items;
             } catch (error) {
                 console.warn('Firestore owner items fetch failed:', error);
             }
             try {
                 const qLegacy = query(collection(db, 'items'), where('ownerId', '==', ownerId));
                 const snapshotLegacy = await getDocs(qLegacy);
                 const legacyItems = snapshotLegacy.docs.map((docSnap) => fromFirestore<Item>(docSnap));
                 if (legacyItems.length > 0) return legacyItems;
             } catch (error) {
                 console.warn('Firestore legacy owner items fetch failed:', error);
             }
             try {
                 const qSeller = query(collection(db, 'items'), where('sellerId', '==', ownerId));
                 const snapshotSeller = await getDocs(qSeller);
                 const sellerItems = snapshotSeller.docs.map((docSnap) => fromFirestore<Item>(docSnap));
                 if (sellerItems.length > 0) return sellerItems;
             } catch (error) {
                 console.warn('Firestore seller items fetch failed:', error);
             }
         }

         if (shouldUseLocalMockFallback()) {
             ensureMockDb();
             const items = mockDb.get<Item[]>('items') || [];
             const owned = items.filter((item) => item.owner?.id === ownerId || item.ownerId === ownerId || item.sellerId === ownerId);
             return owned.length > 0 ? owned : items;
         }

         return [];
    },
    getReviewsForOwner: async (ownerId: string): Promise<Review[]> => {
         const items = await itemService.getItemsByOwner(ownerId);
         return items.flatMap(item => item.reviews || []);
    },
    addItem: async (itemData: Partial<Item>, user: User): Promise<Item> => {
        const token = await getBackendToken();
        const newItem = {
            ...itemData,
            owner: { id: user.id, name: user.name, avatar: user.avatar },
            createdAt: new Date().toISOString(),
            reviews: [],
            avgRating: 0
        };

        if (isBackendConfigured()) {
            const sellerSupabaseId = await resolveSupabaseUserId(user.id);
            if (!sellerSupabaseId) {
                throw new Error('Unable to resolve account for listing creation. Please sign out and sign in again.');
            }

            let categoryId: string | null = null;
            const rawCategory = itemData.category ? String(itemData.category).trim() : '';
            if (rawCategory) {
                try {
                    const params = new URLSearchParams();
                    params.set('select', 'id,name');
                    params.set('ilike.name', rawCategory);
                    params.set('limit', '1');
                    const categoryRes = await backendFetch(`/api/categories?${params.toString()}`, {}, token);
                    const categoryRow = Array.isArray(categoryRes?.data) ? categoryRes.data[0] : undefined;
                    categoryId = categoryRow?.id || null;
                } catch (error) {
                    console.warn('Category resolve failed, storing in metadata only:', error);
                }
            }

            const payload = {
                seller_id: sellerSupabaseId,
                owner_persona_id: itemData.ownerPersonaId || null,
                category_id: categoryId,
                title: itemData.title || 'Untitled Item',
                description: itemData.description || '',
                listing_type: normalizeListingType(itemData.listingType),
                status: itemData.status === 'draft' || itemData.status === 'archived' ? itemData.status : 'published',
                condition: itemData.condition || null,
                brand: itemData.brand || null,
                currency: 'USD',
                sale_price: itemData.salePrice ?? (itemData.listingType !== 'rent' ? itemData.price ?? null : null),
                rental_price: itemData.rentalPrice ?? (itemData.listingType === 'rent' ? itemData.price ?? null : null),
                auction_start_price: itemData.listingType === 'auction' ? (itemData.auctionDetails?.startingBid ?? itemData.price ?? null) : null,
                auction_reserve_price: itemData.reservePrice ?? null,
                stock: itemData.stock ?? 0,
                is_featured: Boolean(itemData.isFeatured),
                is_verified: Boolean(itemData.isVerified),
                metadata: {
                    category: itemData.category || null,
                    imageUrls: itemData.imageUrls || itemData.images || [],
                    ownerName: user.name,
                    ownerAvatar: user.avatar,
                    listingType: itemData.listingType || 'sale',
                    status: itemData.status || 'published',
                    activityPreferences: normalizeActivityPreferences((itemData as any).activityPreferences || {}),
                    avgRating: 0,
                    reviews: []
                }
            };

            const createdRes = await backendFetch('/api/items', {
                method: 'POST',
                body: JSON.stringify(payload)
            }, token);
            const createdRow = Array.isArray(createdRes?.data) ? createdRes.data[0] : createdRes?.data;
            if (!createdRow?.id) {
                throw new Error('Listing creation did not return a record id.');
            }

            const imageUrls = (itemData.imageUrls || itemData.images || []).filter(Boolean);
            if (imageUrls.length > 0) {
                await Promise.all(imageUrls.map((url, index) => backendFetch('/api/item_images', {
                    method: 'POST',
                    body: JSON.stringify({
                        item_id: createdRow.id,
                        url,
                        sort_order: index
                    })
                }, token).catch((error) => {
                    console.warn('Item image insert failed:', error);
                })));
            }

            const { usersById, categoriesById, imagesByItemId } = await fetchBackendItemSupport([createdRow], token);
            const createdItem = mapBackendItemRow(
                createdRow,
                usersById.get(createdRow?.seller_id),
                categoriesById.get(createdRow?.category_id),
                imagesByItemId.get(createdRow?.id) || imageUrls
            );

            if (supabaseMirror.enabled) {
                await supabaseMirror.upsert('items', createdItem.id, createdItem);
            }
            return createdItem;
        }

        if (shouldUseFirestoreFallback()) {
            const docRef = await addDoc(collection(db, 'items'), newItem);
            const created = { id: docRef.id, ...newItem } as Item;
            if (supabaseMirror.enabled) {
                await supabaseMirror.upsert('items', created.id, created);
            }
            return created;
        }

        const created = { id: `item-${Date.now()}`, ...newItem } as Item;
        if (supabaseMirror.enabled) {
            await supabaseMirror.upsert('items', created.id, created);
            return created;
        }

        throw new Error('Unable to add item: no active data source available.');
    },
    updateItem: async (itemId: string, updates: Partial<Item>): Promise<void> => {
        const token = await getBackendToken();

        if (isBackendConfigured()) {
            const payload: any = {};
            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.listingType !== undefined) payload.listing_type = normalizeListingType(updates.listingType);
            if (updates.status !== undefined) {
                payload.status = updates.status === 'draft' || updates.status === 'archived' ? updates.status : 'published';
            }
            if (updates.condition !== undefined) payload.condition = updates.condition;
            if (updates.brand !== undefined) payload.brand = updates.brand;
            if (updates.salePrice !== undefined) payload.sale_price = updates.salePrice;
            if (updates.rentalPrice !== undefined) payload.rental_price = updates.rentalPrice;
            if (updates.stock !== undefined) payload.stock = updates.stock;
            if (updates.isFeatured !== undefined) payload.is_featured = Boolean(updates.isFeatured);
            if (updates.isVerified !== undefined) payload.is_verified = Boolean(updates.isVerified);
            if (updates.ownerPersonaId !== undefined) payload.owner_persona_id = updates.ownerPersonaId || null;

            const metadataPatch: any = {};
            const customMetadata = (updates as any).metadata;
            const activityPreferences = (updates as any).activityPreferences;
            if (updates.category !== undefined) metadataPatch.category = updates.category;
            if (updates.imageUrls !== undefined) metadataPatch.imageUrls = updates.imageUrls;
            if (updates.images !== undefined) metadataPatch.images = updates.images;
            if (updates.avgRating !== undefined) metadataPatch.avgRating = updates.avgRating;
            if (updates.reviews !== undefined) metadataPatch.reviews = updates.reviews;
            if (activityPreferences !== undefined) {
                metadataPatch.activityPreferences = normalizeActivityPreferences(activityPreferences);
            }
            if (customMetadata && typeof customMetadata === 'object') {
                Object.assign(metadataPatch, customMetadata);
            }
            if (Object.keys(metadataPatch).length > 0) {
                try {
                    const existingRes = await backendFetch(`/api/items/${itemId}`, {}, token);
                    const currentMeta = existingRes?.data?.metadata || {};
                    payload.metadata = { ...currentMeta, ...metadataPatch };
                } catch {
                    payload.metadata = metadataPatch;
                }
            }

            await backendFetch(`/api/items/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            }, token);

            if (updates.imageUrls || updates.images) {
                const imageList = (updates.imageUrls || updates.images || []).filter(Boolean);
                try {
                    const params = new URLSearchParams();
                    params.set('eq.item_id', itemId);
                    params.set('select', 'id');
                    params.set('limit', '200');
                    const existing = await backendFetch(`/api/item_images?${params.toString()}`, {}, token);
                    const rows = Array.isArray(existing?.data) ? existing.data : [];
                    await Promise.all(rows.map((row: any) => backendFetch(`/api/item_images/${row.id}`, { method: 'DELETE' }, token).catch(() => undefined)));
                    await Promise.all(imageList.map((url, index) => backendFetch('/api/item_images', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId, url, sort_order: index })
                    }, token).catch(() => undefined)));
                } catch (error) {
                    console.warn('Item image refresh failed:', error);
                }
            }

            if (supabaseMirror.enabled) {
                await supabaseMirror.mergeUpdate<Item>('items', itemId, updates);
            }
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await updateDoc(doc(db, 'items', itemId), updates);
            if (supabaseMirror.enabled) {
                await supabaseMirror.mergeUpdate<Item>('items', itemId, updates);
            }
            return;
        }

        if (supabaseMirror.enabled) {
            await supabaseMirror.mergeUpdate<Item>('items', itemId, updates);
            return;
        }

        throw new Error('Unable to update item: no active data source available.');
    },
    deleteItem: async (itemId: string): Promise<void> => {
        const token = await getBackendToken();

        if (isBackendConfigured()) {
            try {
                const params = new URLSearchParams();
                params.set('eq.item_id', itemId);
                params.set('select', 'id');
                params.set('limit', '200');
                const imagesRes = await backendFetch(`/api/item_images?${params.toString()}`, {}, token);
                const imageRows = Array.isArray(imagesRes?.data) ? imagesRes.data : [];
                await Promise.all(imageRows.map((row: any) => backendFetch(`/api/item_images/${row.id}`, { method: 'DELETE' }, token).catch(() => undefined)));
            } catch (error) {
                console.warn('Item image cleanup failed:', error);
            }

            await backendFetch(`/api/items/${itemId}`, { method: 'DELETE' }, token);
            if (supabaseMirror.enabled) {
                await supabaseMirror.remove('items', itemId);
            }
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await deleteDoc(doc(db, 'items', itemId));
            if (supabaseMirror.enabled) {
                await supabaseMirror.remove('items', itemId);
            }
            return;
        }

        if (supabaseMirror.enabled) {
            await supabaseMirror.remove('items', itemId);
            return;
        }

        throw new Error('Unable to delete item: no active data source available.');
    },
    searchItems: async (queryText: string): Promise<{ items: Item[], categories: Category[] }> => {
        const { items } = await itemService.getItems({ search: queryText }, { page: 1, limit: 5 });
        const categories = CATEGORIES.filter(c => c.name.toLowerCase().includes(queryText.toLowerCase()));
        return { items, categories };
    },
    addReview: async (itemId: string, review: { rating: number, comment: string }, author: { id: string, name: string, avatar: string }): Promise<Item> => {
        let item: Item | undefined;

        if (shouldUseFirestoreFallback()) {
            const itemRef = doc(db, 'items', itemId);
            const itemSnap = await getDoc(itemRef);
            if (!itemSnap.exists()) throw new Error('Item not found');
            item = fromFirestore<Item>(itemSnap);

            const newReview: Review = {
                id: `rev-${Date.now()}`,
                itemId,
                author,
                ...review,
                date: new Date().toISOString()
            };

            const updatedReviews = [...(item.reviews || []), newReview];
            const newAvg = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;

            await updateDoc(itemRef, { reviews: updatedReviews, avgRating: newAvg });
            if (supabaseMirror.enabled) {
                await supabaseMirror.mergeUpdate<Item>('items', itemId, { reviews: updatedReviews, avgRating: newAvg });
            }
            return { ...item, reviews: updatedReviews, avgRating: newAvg };
        }

        if (supabaseMirror.enabled) {
            const current = await supabaseMirror.get<Item>('items', itemId);
            if (!current) throw new Error('Item not found');
            const newReview: Review = {
                id: `rev-${Date.now()}`,
                itemId,
                author,
                ...review,
                date: new Date().toISOString()
            };
            const updatedReviews = [...(current.reviews || []), newReview];
            const newAvg = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
            const updatedItem = { ...current, reviews: updatedReviews, avgRating: newAvg };
            await supabaseMirror.upsert('items', itemId, updatedItem);
            return updatedItem;
        }

        throw new Error('Unable to add review: no active data source available.');
    },
    addHelpfulVote: async (itemId: string, questionId: string) => {
        // Implementation would update nested question in Firestore
    },
    importDropshipItem: async (supplierProduct: SupplierProduct, salePrice: number, user: User): Promise<Item> => {
         const newItem: Partial<Item> = {
             title: supplierProduct.title,
             description: supplierProduct.description,
             category: supplierProduct.category,
             imageUrls: supplierProduct.imageUrls,
             productType: 'dropship',
             salePrice: salePrice,
             wholesalePrice: supplierProduct.wholesalePrice,
             supplierInfo: {
                 id: supplierProduct.id,
                 name: supplierProduct.supplierName,
                 shippingCost: supplierProduct.shippingInfo.cost
             },
             stock: 999, // Assumed dropship stock
             listingType: 'sale',
             condition: 'new',
             status: 'published'
         };
         return itemService.addItem(newItem, user);
    },
    checkAvailability: async (itemId: string, startDate: string, endDate: string): Promise<boolean> => {
        // 1. Check item's manual blackout dates
        const item = await itemService.getItemById(itemId);
        if (item && item.bookedDates) {
            // Simple string comparison for 'YYYY-MM-DD'
            const requestedRange = getDatesInRange(new Date(startDate), new Date(endDate));
            const hasConflict = requestedRange.some(date => item.bookedDates!.includes(date));
            if (hasConflict) return false;
        }

        // 2. Check overlapping bookings in 'bookings' collection
        // In a real Firestore app, range queries are complex. 
        // We will fetch active bookings for this item and check overlaps in memory for this demo.
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('itemId', '==', itemId), where('status', 'in', ['confirmed', 'pending', 'shipped', 'delivered', 'returned']));
        
        const snapshot = await getDocs(q);
        const existingBookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
        
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        const hasOverlap = existingBookings.some(booking => {
            const bStart = new Date(booking.startDate).getTime();
            const bEnd = new Date(booking.endDate).getTime();
            return (start <= bEnd) && (end >= bStart);
        });

        return !hasOverlap;
    },
    createOrder: async (userId: string, items: CartItem[], shippingInfo: any, paymentMethod: string, options?: { actorPersonaId?: string | null; actorName?: string }): Promise<string> => {
        const batch = writeBatch(db);
        const orderId = `UP-${Math.floor(100000 + Math.random() * 900000)}`; // Simple ID generation
        const orderRef = doc(db, 'orders', orderId);
        
        // 1. Create Main Order Document
        const totalAmount = items.reduce((sum, item) => {
            let price = item.salePrice || item.rentalPrice || 0;
             if (item.listingType === 'rent' && item.rentalPeriod && item.rentalRates?.daily) {
                 const start = new Date(item.rentalPeriod.startDate);
                 const end = new Date(item.rentalPeriod.endDate);
                 const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                 price = item.rentalRates.daily * Math.max(1, days);
            }
            return sum + (price * item.quantity);
        }, 0);
        
        batch.set(orderRef, {
            id: orderId,
            userId,
            items: items.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.salePrice || i.rentalPrice })),
            shippingInfo,
            paymentMethod,
            totalAmount,
            status: 'processing',
            createdAt: new Date().toISOString()
        });

        // 2. Create Bookings/Sub-orders for sellers and Decrement Stock
        items.forEach(item => {
             let totalPrice = (item.salePrice || item.rentalPrice || 0) * item.quantity;
             let depositAmount = 0;

             if (item.listingType === 'rent' && item.rentalPeriod && item.rentalRates?.daily) {
                 const start = new Date(item.rentalPeriod.startDate);
                 const end = new Date(item.rentalPeriod.endDate);
                 const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                 totalPrice = item.rentalRates.daily * Math.max(1, days) * item.quantity;
                 
                 // Handle Security Deposit
                 if (item.securityDeposit) {
                     depositAmount = item.securityDeposit * item.quantity;
                 }
             }
            
            // Decrement Stock & Update Status if 0
            const itemRef = doc(db, 'items', item.id);
            const isSoldOut = item.stock - item.quantity <= 0;
            
            // If rental, we don't decrement stock permanently, but in this simplified model we might tracking concurrent rentals.
            // For now, let's assume stock = quantity available for simultaneous rent.
            if (item.listingType !== 'rent') {
                 batch.update(itemRef, { 
                    stock: increment(-item.quantity),
                    ...(isSoldOut ? { status: 'sold' } : {}) 
                });
            }

            // Create Booking Record for Seller
            const bookingRef = doc(collection(db, 'bookings'));
            
            // Use rental dates if available, otherwise default to "now" for sales
            const startDate = item.rentalPeriod?.startDate || new Date().toISOString();
            const endDate = item.rentalPeriod?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            batch.set(bookingRef, {
                orderId,
                itemId: item.id,
                itemTitle: item.title,
                renterId: userId,
                renterName: shippingInfo.name,
                provider: { id: item.owner.id },
                startDate: startDate,
                endDate: endDate,
                totalPrice: totalPrice,
                status: 'confirmed', // Confirmed implies paid and ready for shipment
                shippingAddress: shippingInfo,
                paymentStatus: 'escrow',
                type: item.listingType === 'rent' ? 'rent' : 'sale',
                securityDeposit: depositAmount,
                depositStatus: depositAmount > 0 ? 'held' : undefined
            });

            // Update Buyer's Held Deposits (Mock) - In real app, this would be a hold on card or separate wallet bucket
            if (depositAmount > 0) {
                 const buyerRef = doc(db, 'users', userId);
                 batch.update(buyerRef, { heldDeposits: increment(depositAmount) });
            }
        });

        // 3. Commit Transaction
        await batch.commit();
        await Promise.all(items.map(async (item) => {
            if (!item.owner?.id || item.owner.id === userId) return;
            const action: ItemEventAction = item.listingType === 'rent' ? 'rent' : 'purchase';
            await itemService.logItemEvent({
                action,
                ownerId: item.owner.id,
                ownerPersonaId: item.ownerPersonaId || null,
                itemId: item.id,
                itemTitle: item.title,
                listingType: item.listingType,
                actorId: userId,
                actorPersonaId: options?.actorPersonaId || null,
                actorName: options?.actorName || shippingInfo?.name || 'Customer',
                quantity: item.quantity
            });
        }));
        
        return orderId;
    },
    // Deprecated single item purchase logic - kept for backward compatibility if needed
    processPurchase: async (cartItems: CartItem[], user: User, shippingInfo: any): Promise<string> => {
         return itemService.createOrder(user.id, cartItems, shippingInfo, 'card');
    },
    completeOrder: async (bookingId: string) => {
        const batch = writeBatch(db);
        
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) throw new Error("Booking not found");
        
        const booking = fromFirestore<Booking>(bookingSnap);
        const sellerId = booking.provider.id;
        const totalPrice = booking.totalPrice;
        
        // 1. Update Booking Status
        batch.update(bookingRef, { 
            status: 'completed',
            paymentStatus: 'released',
            completedAt: new Date().toISOString()
        });

        // 2. Transfer Funds to Seller
        const sellerRef = doc(db, 'users', sellerId);
        // Assuming a standard 10% platform fee
        const platformFee = totalPrice * 0.10;
        const netEarnings = totalPrice - platformFee;

        batch.update(sellerRef, {
            walletBalance: increment(netEarnings),
            // Optionally update total earnings stats here too
        });

        // 3. Create Transaction Record for Seller
        const transactionRef = doc(collection(db, 'walletTransactions'));
        batch.set(transactionRef, {
            userId: sellerId,
            amount: netEarnings,
            type: 'credit',
            description: `Sale of ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        // 4. If there was a held deposit and it wasn't claimed, release it (Auto-release logic)
        if (booking.securityDeposit && booking.depositStatus === 'held') {
             batch.update(bookingRef, { depositStatus: 'released' });
             const buyerRef = doc(db, 'users', booking.renterId);
             batch.update(buyerRef, { heldDeposits: increment(-booking.securityDeposit) });
        }

        // 5. Notify Seller
        const notificationRef = doc(collection(db, 'notifications'));
        const notification: Omit<Notification, 'id'> = {
            userId: sellerId,
            type: 'INFO',
            message: `Order completed! $${netEarnings.toFixed(2)} added to your wallet for ${booking.itemTitle}.`,
            link: '/profile/wallet',
            isRead: false,
            createdAt: new Date().toISOString()
        };
        batch.set(notificationRef, notification);

        await batch.commit();
    },
    releaseSecurityDeposit: async (bookingId: string) => {
         const batch = writeBatch(db);
         const bookingRef = doc(db, 'bookings', bookingId);
         const bookingSnap = await getDoc(bookingRef);
         
         if (!bookingSnap.exists()) throw new Error("Booking not found");
         const booking = fromFirestore<Booking>(bookingSnap);
         
         if (booking.depositStatus !== 'held') throw new Error("No deposit to release.");
         
         batch.update(bookingRef, { depositStatus: 'released' });
         
         const buyerRef = doc(db, 'users', booking.renterId);
         batch.update(buyerRef, { heldDeposits: increment(-(booking.securityDeposit || 0)) });
         
         // Notify Buyer
        const notificationRef = doc(collection(db, 'notifications'));
        const notification: Omit<Notification, 'id'> = {
            userId: booking.renterId,
            type: 'INFO',
            message: `Your security deposit of $${booking.securityDeposit} for ${booking.itemTitle} has been released.`,
            link: '/profile/wallet',
            isRead: false,
            createdAt: new Date().toISOString()
        };
        batch.set(notificationRef, notification);
         
         await batch.commit();
    },
    claimSecurityDeposit: async (bookingId: string, amount: number, reason: string, proofImage: string) => {
         const batch = writeBatch(db);
         const bookingRef = doc(db, 'bookings', bookingId);
         const bookingSnap = await getDoc(bookingRef);
         
         if (!bookingSnap.exists()) throw new Error("Booking not found");
         const booking = fromFirestore<Booking>(bookingSnap);
         
         if (booking.depositStatus !== 'held') throw new Error("No deposit to claim.");
         const maxClaim = booking.securityDeposit || 0;
         if (amount > maxClaim) throw new Error("Cannot claim more than the security deposit amount.");
         
         // Update Booking with claim details
         batch.update(bookingRef, { 
             depositStatus: 'claimed',
             claimDetails: { amount, reason, proofImage }
         });
         
         // Update Buyer: Release remainder (if any), remove full hold amount
         const buyerRef = doc(db, 'users', booking.renterId);
         batch.update(buyerRef, { heldDeposits: increment(-maxClaim) });
         
         // Transfer claimed amount to Seller
         const sellerRef = doc(db, 'users', booking.provider.id);
         batch.update(sellerRef, { walletBalance: increment(amount) });
         
         // Create Transaction for Seller
         const transactionRef = doc(collection(db, 'walletTransactions'));
         batch.set(transactionRef, {
            userId: booking.provider.id,
            amount: amount,
            type: 'credit',
            description: `Security Deposit Claim for ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
         
         // Notifications
         // To Buyer
         const notifBuyer = doc(collection(db, 'notifications'));
         batch.set(notifBuyer, {
            userId: booking.renterId,
            type: 'INFO',
            message: `A security deposit claim of $${amount} was made for ${booking.itemTitle}.`,
            link: `/profile/orders/${bookingId}`,
            isRead: false,
            createdAt: new Date().toISOString()
        });
        
         await batch.commit();
    },
    // Mock Auto-Release Logic (Would be a cloud function in reality)
    checkAutoRelease: async () => {
         // Logic to find returned bookings older than 48h and release deposit
         console.log("Checking auto-release candidates...");
    },
    getTrendingItems: async (categories: string[]): Promise<Item[]> => {
        // Mock logic
        const { items } = await itemService.getItems({}, { page: 1, limit: 20 });
        return items.filter(i => categories.includes(i.category) || i.avgRating > 4.5).slice(0, 4);
    },
    recordBattleVote: async (winnerId: string, loserId: string) => {
         await updateDoc(doc(db, 'items', winnerId), { battleWins: increment(1), battleAppearances: increment(1) });
         await updateDoc(doc(db, 'items', loserId), { battleAppearances: increment(1) });
    },
    getProjectShowcases: async (): Promise<ProjectShowcase[]> => {
        const snapshot = await getDocs(collection(db, 'projectShowcases'));
        return snapshot.docs.map(doc => fromFirestore<ProjectShowcase>(doc));
    },
    getGameUploads: async (): Promise<GameUpload[]> => {
        const snapshot = await getDocs(collection(db, 'games'));
        return snapshot.docs.map(doc => fromFirestore<GameUpload>(doc));
    },
    recordGameDownload: async (gameId: string) => {
        await updateDoc(doc(db, 'games', gameId), { downloads: increment(1) });
    },
    uploadGame: async (gameData: Omit<GameUpload, 'id' | 'createdAt' | 'downloads' | 'uploader' | 'fileUrl'>, user: User) => {
         const newGame = {
             ...gameData,
             uploader: { id: user.id, name: user.name, avatar: user.avatar },
             downloads: 0,
             createdAt: new Date().toISOString()
         };
         await addDoc(collection(db, 'games'), newGame);
    },
    boostItem: async (itemId: string, plan: string, durationDays: number) => {
        await updateDoc(doc(db, 'items', itemId), { 
            boostLevel: plan, 
            boostExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() 
        });
    },
    getOffersForUser: async (userId: string): Promise<Offer[]> => {
         const q = query(collection(db, 'offers'), where('receiverId', '==', userId)); // or senderId
         // Simplified
         const snapshot = await getDocs(collection(db, 'offers'));
         return snapshot.docs.map(doc => fromFirestore<Offer>(doc)).filter(o => o.buyer.id === userId || o.seller.id === userId);
    },
    updateOfferStatus: async (offerId: string, status: 'accepted' | 'declined') => {
         await updateDoc(doc(db, 'offers', offerId), { status });
    },
    getPersonalizedFeed: async (user: User): Promise<Item[]> => {
         // Logic based on interests
         const { items } = await itemService.getItems({}, { page: 1, limit: 10 });
         return items;
    },
    getHierarchicalCategories: async (): Promise<Category[]> => {
        return HIERARCHICAL_CATEGORIES;
    },
    addCategory: async (name: string, parentId: string): Promise<Category> => {
        // Mock adding category to local constant list or DB
        return { id: `cat-${Date.now()}`, name };
    },
    getEvents: async (): Promise<Event[]> => {
        const snapshot = await getDocs(collection(db, 'events'));
        return snapshot.docs.map(doc => fromFirestore<Event>(doc));
    },
    
    // --- Chat Methods ---
    findOrCreateChatThread: async (itemId: string, buyerId: string, sellerId: string) => {
        // Logic to find thread or create
        return `thread-${Date.now()}`;
    },
    getChatThreadsForUser: async (userId: string) => {
         const q = query(collection(db, 'chatThreads'), where('participants', 'array-contains', userId));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore(doc));
    },
    sendMessageToThread: async (threadId: string, senderId: string, text: string, imageUrl?: string) => {
         await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
             senderId, text, imageUrl, timestamp: new Date().toISOString()
         });
    },
    sendOfferToThread: async (threadId: string, senderId: string, offer: any) => {
          await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
             senderId, type: 'offer', offer, timestamp: new Date().toISOString()
         });
    },

    seedDatabase: async (user?: User) => {
        // Implementation to create dummy items
        if(!user) return;
        for (let i = 0; i < 5; i++) {
            await itemService.addItem({
                title: `Dummy Item ${i}`,
                description: 'This is a test item.',
                category: 'electronics',
                salePrice: 100 + i * 10,
                listingType: 'sale',
                imageUrls: ['https://picsum.photos/400/400']
            }, user);
        }
    }
};

// --- LISTER SERVICE ---
export const listerService = {
    getDashboardAnalytics: async (userId: string): Promise<any> => {
        // Mock data
        return {
            totalEarnings: 1250,
            rentalCount: 45,
            topItem: "Sony Alpha Camera",
            earningsByMonth: [{ month: 'Jan', earnings: 200 }, { month: 'Feb', earnings: 450 }],
            repeatRenters: 12,
            avgRentalDuration: 4
        };
    },
    getBookings: async (userId: string): Promise<Booking[]> => {
         const q = query(collection(db, 'bookings'), where('provider.id', '==', userId));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore<Booking>(doc));
    },
    getBookingById: async (bookingId: string): Promise<Booking | undefined> => {
        const docRef = doc(db, 'bookings', bookingId);
        const snap = await getDoc(docRef);
        return snap.exists() ? fromFirestore<Booking>(snap) : undefined;
    },
    updateBooking: async (bookingId: string, updates: Partial<Booking>) => {
        await updateDoc(doc(db, 'bookings', bookingId), updates);
    },
    updateBookingStatus: async (bookingId: string, status: string) => {
        await updateDoc(doc(db, 'bookings', bookingId), { status });
    },
    getRentalHistory: async (userId: string): Promise<RentalHistoryItem[]> => {
        // Combine bookings where user is renter or provider
        const q = query(collection(db, 'bookings')); // Simplified
        const snapshot = await getDocs(q);
        const allBookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
        // Filter and map to RentalHistoryItem
        return allBookings
            .filter(b => b.renterId === userId || b.provider.id === userId)
            .map(b => ({
                id: b.id,
                itemId: b.itemId,
                itemTitle: b.itemTitle,
                itemImageUrl: 'https://picsum.photos/200', // Mock
                startDate: b.startDate,
                endDate: b.endDate,
                totalPrice: b.totalPrice,
                status: b.status,
                type: 'rent' // or derived from booking
            }));
    },
    getDiscountCodes: async (userId: string): Promise<DiscountCode[]> => {
        const q = query(collection(db, 'discountCodes'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<DiscountCode>(doc));
    },
    createDiscountCode: async (userId: string, code: string, percentage: number) => {
        await addDoc(collection(db, 'discountCodes'), { userId, code, percentage, isActive: true, uses: 0 });
    },
    updateDiscountCode: async (id: string, updates: Partial<DiscountCode>) => {
        await updateDoc(doc(db, 'discountCodes', id), updates);
    },
    getBundles: async (userId: string): Promise<any[]> => {
         return [];
    },
    addBooking: async (item: Item, renter: User, startDate: string, endDate: string, totalPrice: number, shippingAddress: any) => {
        const newBooking = {
            itemId: item.id,
            itemTitle: item.title,
            renterId: renter.id,
            renterName: renter.name,
            provider: { id: item.owner.id },
            startDate,
            endDate,
            totalPrice,
            status: 'confirmed', // Updated to match createOrder logic
            shippingAddress,
            paymentStatus: 'escrow'
        };
        await addDoc(collection(db, 'bookings'), newBooking);
    },
    getTransactionsForUser: async (userId: string): Promise<any[]> => {
        const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore(doc));
    },
    getAffiliateData: async (userId: string) => {
        const affiliate = { userId, referralCode: 'USER123', clicks: 150, signups: 5, commissionRate: 0.05, earnings: 250, balance: 50 };
        return { affiliate, earnings: [] };
    },
    getAffiliateLinks: async (userId: string): Promise<AffiliateLink[]> => [],
    getAffiliateCoupons: async (userId: string): Promise<AffiliateCoupon[]> => [],
    getCreativeAssets: async (): Promise<CreativeAsset[]> => [],
    getAffiliateLeaderboard: async (): Promise<any[]> => [],
    joinAffiliateProgram: async (userId: string): Promise<User> => {
        const updates = { isAffiliate: true, affiliateOnboardingCompleted: false };
        await updateDoc(doc(db, 'users', userId), updates);
        const u = await userService.getUserById(userId);
        return u!;
    },
    generateAffiliateLink: async (userId: string, url: string): Promise<AffiliateLink> => {
        return { id: 'link-1', userId, originalUrl: url, shortCode: 'xyz', clicks: 0 };
    },
    createAffiliateCoupon: async (userId: string, code: string, percentage: number): Promise<AffiliateCoupon> => {
        return { id: 'coup-1', userId, code, discountPercentage: percentage, uses: 0, commissionRate: 0.05 };
    },
    transferEarningsToWallet: async (userId: string): Promise<User> => {
        // Mock transfer
        return (await userService.getUserById(userId))!;
    },
    submitExternalProduct: async (userId: string, url: string) => {},
    submitContentReview: async (userId: string, url: string) => {},
    requestPayout: async (userId: string, amount: number, method: any) => {
        await addDoc(collection(db, 'payout_requests'), {
            userId, amount, method, status: 'pending', createdAt: new Date().toISOString()
        });
    },
    getSellerPerformanceStats: async (userId: string): Promise<SellerPerformanceStats> => {
         return {
             earnings: [],
             categorySales: [],
             pendingShipments: 2,
             lowStockItems: [],
             unreadMessages: 1,
             totalViews: 1200,
             conversionRate: 3.5
         };
    },
    getGrowthInsights: async (stats: SellerPerformanceStats): Promise<GrowthInsight[]> => {
        return [
            { id: '1', type: 'pricing', message: 'Lowering price on X might increase sales', actionLabel: 'Adjust Price', actionLink: '#' }
        ];
    }
};

// --- REEL SERVICE ---
export const reelService = {
    getReelsForFeed: async (userId: string): Promise<Reel[]> => {
        const snapshot = await getDocs(collection(db, 'reels'));
        return snapshot.docs.map(doc => fromFirestore<Reel>(doc));
    },
    getReelsByCreator: async (userId: string): Promise<Reel[]> => {
        const q = query(collection(db, 'reels'), where('creatorId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Reel>(doc));
    },
    toggleLikeReel: async (userId: string, reelId: string): Promise<User> => {
        const reelRef = doc(db, 'reels', reelId);
        const userRef = doc(db, 'users', userId);
        
        // Mock toggle
        await updateDoc(reelRef, { likes: increment(1) });
        // Update user liked list locally or in DB
        return (await userService.getUserById(userId))!;
    },
    addCommentToReel: async (reelId: string, user: User, text: string): Promise<Reel> => {
        const reelRef = doc(db, 'reels', reelId);
        const newComment = { id: `c-${Date.now()}`, author: { id: user.id, name: user.name, avatar: user.avatar }, text, timestamp: new Date().toISOString() };
        await updateDoc(reelRef, { comments: arrayUnion(newComment) });
        return fromFirestore<Reel>(await getDoc(reelRef));
    },
    addReel: async (reelData: Partial<Reel>): Promise<Reel> => {
        const docRef = await addDoc(collection(db, 'reels'), { ...reelData, createdAt: new Date().toISOString() });
        return { id: docRef.id, ...reelData } as Reel;
    },
    updateReel: async (reelId: string, updates: Partial<Reel>): Promise<Reel> => {
        await updateDoc(doc(db, 'reels', reelId), updates);
        return { id: reelId, ...updates } as Reel;
    },
    deleteReel: async (reelId: string) => {
        await deleteDoc(doc(db, 'reels', reelId));
    },
    startLiveStream: async (streamData: Partial<LiveStream>, user: User) => {
        await addDoc(collection(db, 'livestreams'), {
            ...streamData,
            hostName: user.name,
            hostAvatar: user.avatar,
            viewers: 0,
            status: 'live'
        });
    }
};

// --- POST SERVICE ---
export const postService = {
    addPost: async (postData: any) => {
        await addDoc(collection(db, 'posts'), { ...postData, createdAt: new Date().toISOString() });
    }
};

// --- SERVICE SERVICE ---
export const serviceService = {
    getServices: async (): Promise<Service[]> => {
        try {
            const services = await workService.getLegacyServices({ status: 'published', limit: 200 });
            if (services.length > 0) return services;
        } catch (error) {
            console.warn('workService.getLegacyServices failed, falling back to legacy services:', error);
        }

        const snapshot = await getDocs(collection(db, 'services'));
        return snapshot.docs.map((docSnap) => fromFirestore<Service>(docSnap));
    },
    getServiceById: async (id: string): Promise<Service | undefined> => {
        try {
            const listing = await workService.getListingById(id);
            if (listing) return mapWorkListingToService(listing);
        } catch (error) {
            console.warn('workService.getListingById failed, falling back to legacy services:', error);
        }

        const docSnap = await getDoc(doc(db, 'services', id));
        return docSnap.exists() ? fromFirestore<Service>(docSnap) : undefined;
    },
    addService: async (serviceData: Partial<Service>, user: User) => {
        try {
            await workService.createListing({
                title: serviceData.title || 'Untitled Service',
                description: serviceData.description || '',
                category: serviceData.category || 'general',
                mode: serviceData.mode || 'hybrid',
                fulfillmentKind: serviceData.fulfillmentKind || 'hybrid',
                currency: serviceData.currency || serviceData.pricingModels?.[0]?.currency || 'USD',
                timezone: serviceData.timezone,
                basePrice: serviceData.pricingModels?.[0]?.price || 0,
                packages: (serviceData.pricingModels || []).map((model, index) => ({
                    id: `${user.id}-${Date.now()}-${index}`,
                    name: model.description || `Package ${index + 1}`,
                    description: model.description || '',
                    price: model.price,
                    currency: model.currency || serviceData.currency || 'USD',
                    deliveryDays: model.deliveryDays,
                    revisions: model.revisions,
                    type: model.type
                })),
                media: serviceData.imageUrls || [],
                riskScore: serviceData.riskScore || 0,
                providerSnapshot: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    rating: user.rating || 0,
                    reviews: []
                },
                status: 'published',
                visibility: 'public'
            }, user);
            return;
        } catch (error) {
            console.warn('workService.createListing failed, writing legacy service fallback:', error);
        }

        await addDoc(collection(db, 'services'), {
            ...serviceData,
            provider: { id: user.id, name: user.name, avatar: user.avatar, rating: 0, reviews: [] },
            avgRating: 0,
            reviews: []
        });
    },
    getServicesByProvider: async (userId: string): Promise<Service[]> => {
        try {
            const services = await workService.getLegacyServices({ sellerId: userId, limit: 200 });
            if (services.length > 0) return services;
        } catch (error) {
            console.warn('workService provider query failed, falling back to legacy services:', error);
        }

        const q = query(collection(db, 'services'), where('provider.id', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => fromFirestore<Service>(docSnap));
    }
};

// --- PROVIDER SERVICE ---
export const providerService = {
    getProviderStats: async (userId: string) => {
        try {
            const [contracts, proposals] = await Promise.all([
                contractService.getContracts({ providerId: userId, limit: 500 }),
                proposalService.getProviderProposals(userId)
            ]);

            const activeJobs = contracts.filter(c => c.status === 'active' || c.status === 'pending' || c.status === 'disputed').length;
            const jobsCompleted = contracts.filter(c => c.status === 'completed').length;
            const earnings = contracts
                .filter(c => c.status === 'completed')
                .reduce((sum, c) => sum + (c.totalAmount || 0), 0);
            const avgRisk = contracts.length > 0
                ? contracts.reduce((sum, c) => sum + (c.riskScore || 0), 0) / contracts.length
                : 0;
            const rating = Number(Math.max(3.5, 5 - Math.min(avgRisk / 20, 1.2)).toFixed(2));

            return {
                earnings,
                activeJobs,
                jobsCompleted,
                rating,
                proposalsPending: proposals.filter(p => p.status === 'pending').length,
                proposalsAccepted: proposals.filter(p => p.status === 'accepted').length
            };
        } catch (error) {
            console.warn('providerService.getProviderStats fallback:', error);
            return { earnings: 500, activeJobs: 2, jobsCompleted: 10, rating: 4.8 };
        }
    },
    getIncomingRequests: async (userId: string): Promise<Job[]> => {
        try {
            const jobs = await workService.getProviderIncomingJobs(userId);
            if (jobs.length > 0) return jobs;
        } catch (error) {
            console.warn('providerService.getIncomingRequests fallback to legacy jobs:', error);
        }

        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => fromFirestore<Job>(docSnap));
    },
    getActiveJobs: async (userId: string): Promise<Job[]> => {
        try {
            const jobs = await workService.getProviderActiveJobs(userId);
            if (jobs.length > 0) return jobs;
        } catch (error) {
            console.warn('providerService.getActiveJobs fallback to legacy jobs:', error);
        }

        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', 'in', ['confirmed', 'in_progress']));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => fromFirestore<Job>(docSnap));
    },
    updateJobStatus: async (jobId: string, status: string) => {
        try {
            if (status === 'confirmed' && isBackendConfigured()) {
                const token = await getBackendToken();
                const requestLookup = await backendFetch(`/api/work_requests/${jobId}`, {}, token).catch(() => null);
                const requestRow = requestLookup?.data || null;
                if (requestRow?.id) {
                    await backendFetch(`/api/work_requests/${jobId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            status: 'matched',
                            updated_at: new Date().toISOString()
                        })
                    }, token).catch(() => undefined);

                    if (requestRow.target_provider_id && requestRow.requester_id) {
                        await contractService.createContract({
                            requestId: requestRow.id,
                            clientId: requestRow.requester_id,
                            providerId: requestRow.target_provider_id,
                            scope: requestRow.brief || requestRow.title || 'Service request',
                            mode: requestRow.mode || 'hybrid',
                            fulfillmentKind: requestRow.fulfillment_kind || 'hybrid',
                            currency: requestRow.currency || 'USD',
                            timezone: requestRow.timezone || 'UTC',
                            totalAmount: Number(requestRow.budget_max || requestRow.budget_min || 0),
                            status: 'active'
                        }, {
                            id: requestRow.target_provider_id,
                            name: requestRow.provider_snapshot?.name || 'Provider',
                            email: '',
                            avatar: requestRow.provider_snapshot?.avatar || '/icons/urbanprime.svg',
                            following: [],
                            followers: [],
                            wishlist: [],
                            cart: [],
                            badges: [],
                            memberSince: new Date().toISOString()
                        } as User);
                    }
                    return;
                }
            }

            await contractService.updateContract(jobId, {
                status: status === 'confirmed'
                    ? 'active'
                    : status === 'completed'
                        ? 'completed'
                        : status === 'cancelled'
                            ? 'cancelled'
                            : 'pending'
            });
            return;
        } catch (error) {
            console.warn('providerService.updateJobStatus fallback to legacy jobs:', error);
        }

        await updateDoc(doc(db, 'jobs', jobId), { status });
    }
};

// --- LIVESTREAM SERVICE ---
export const livestreamService = {
    getLiveStreams: async (): Promise<LiveStream[]> => {
        const snapshot = await getDocs(collection(db, 'livestreams'));
        return snapshot.docs.map(doc => fromFirestore<LiveStream>(doc));
    }
};

// Helper for date range array generation
function getDatesInRange(startDate: Date, endDate: Date) {
    const date = new Date(startDate.getTime());
    const dates = [];
    while (date <= endDate) {
        dates.push(new Date(date).toISOString().split('T')[0]);
        date.setDate(date.getDate() + 1);
    }
    return dates;
}





































