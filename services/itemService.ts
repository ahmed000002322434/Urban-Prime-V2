
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
    confirmPasswordReset,
    EmailAuthProvider,
    deleteUser as deleteFirebaseUser,
    reauthenticateWithCredential
} from 'firebase/auth';
import { db, auth, googleProvider, isFirebaseDisabled } from '../firebase';
import { localDb } from './localDb';
import { backendFetch, getBackendBaseUrl, isBackendConfigured } from './backendClient';
import commerceService, { mapCommerceDetailToBooking } from './commerceService';
import supabaseMirror from './supabaseMirror';
import personaService from './personaService';
import analyticsService from './analyticsService';
import workService, { mapWorkListingToService, type ListWorkListingsParams } from './workService';
import proposalService from './proposalService';
import contractService from './contractService';
import {
    canUseDirectSupabaseTables,
    ensureSupabaseUserRecord,
    syncSupabaseUserProfile
} from './supabaseAppBridge';
import { affiliateCommissionService } from './affiliateCommissionService';
import { shouldUseFirestoreFallback, shouldUseLocalDb, shouldUseLocalMockFallback } from './dataMode';
import { resolveBackendUserId, resolveBackendUserLookupKeys } from './backendUserIdentity';
import { enforceAvatarIdentity } from '../utils/avatarEnforcement';
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
    CheckoutSubmissionOptions,
    CheckoutShippingInfo,
    Notification,
    ListingActivityPreferences,
    ChatThread,
    ChatMessage,
    CustomOffer,
    ChatCallSession,
    ChatPresenceState,
    ChatCallMode
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

let localDbReady = false;
const ensureLocalDb = async () => {
    if (!localDbReady) {
        await localDb.init();
        localDbReady = true;
    }
};
const supabaseUserIdCache = new Map<string, string>();
const supabaseUserMissCache = new Map<string, number>();
const supabaseUserRowCache = new Map<string, { row: any; cachedAt: number }>();
const SUPABASE_USER_CACHE_TTL_MS = 120_000;
const SUPABASE_USER_MISS_TTL_MS = 20_000;
const customOfferCache = new Map<string, { offer: CustomOffer; cachedAt: number }>();
const CUSTOM_OFFER_CACHE_TTL_MS = 120_000;
let activeUserSearchCache: { users: User[]; expiresAt: number } | null = null;
const ACTIVE_USER_SEARCH_CACHE_TTL_MS = 60_000;
const hasBackendApiKey = Boolean((import.meta.env.VITE_BACKEND_API_KEY as string | undefined)?.trim());

const getCachedSupabaseUserRow = (id: string) => {
    const cached = supabaseUserRowCache.get(id);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > SUPABASE_USER_CACHE_TTL_MS) {
        supabaseUserRowCache.delete(id);
        return null;
    }
    return cached.row;
};

const resolveSupabaseUserId = async (userIdOrFirebaseUid: string): Promise<string | null> => {
    if (!userIdOrFirebaseUid || !isBackendConfigured()) return null;
    const normalizedInput = String(userIdOrFirebaseUid).trim();
    if (!normalizedInput) return null;
    if (isUuidLike(normalizedInput)) {
        supabaseUserIdCache.set(normalizedInput, normalizedInput);
        supabaseUserMissCache.delete(normalizedInput);
        return normalizedInput;
    }

    const cached = supabaseUserIdCache.get(normalizedInput);
    if (cached) return cached;
    const missUntil = supabaseUserMissCache.get(normalizedInput) || 0;
    if (missUntil > Date.now()) return null;
    try {
        const token = await getBackendToken();
        if (!token && !hasBackendApiKey) {
            supabaseUserMissCache.set(normalizedInput, Date.now() + SUPABASE_USER_MISS_TTL_MS);
            return null;
        }
        const byFirebaseRes = await backendFetch(
            `/api/users?firebase_uid=${encodeURIComponent(normalizedInput)}&select=id,firebase_uid&limit=1`,
            {},
            token
        );
        const byFirebaseData = byFirebaseRes?.data;
        const byFirebaseRow = Array.isArray(byFirebaseData) ? byFirebaseData[0] : byFirebaseData;

        let supabaseId = byFirebaseRow?.id || null;
        let matchedFirebaseUid = byFirebaseRow?.firebase_uid ? String(byFirebaseRow.firebase_uid) : normalizedInput;

        if (!supabaseId) {
            const byIdRes = await backendFetch(
                `/api/users?id=${encodeURIComponent(normalizedInput)}&select=id,firebase_uid&limit=1`,
                {},
                token
            );
            const byIdData = byIdRes?.data;
            const byIdRow = Array.isArray(byIdData) ? byIdData[0] : byIdData;
            supabaseId = byIdRow?.id || null;
            if (byIdRow?.firebase_uid) {
                matchedFirebaseUid = String(byIdRow.firebase_uid);
            }
        }

        if (supabaseId) {
            supabaseUserIdCache.set(normalizedInput, supabaseId);
            supabaseUserMissCache.delete(normalizedInput);
            supabaseUserIdCache.set(supabaseId, supabaseId);
            supabaseUserMissCache.delete(supabaseId);
            if (matchedFirebaseUid) {
                supabaseUserIdCache.set(matchedFirebaseUid, supabaseId);
                supabaseUserMissCache.delete(matchedFirebaseUid);
            }
        }
        if (!supabaseId) supabaseUserMissCache.set(normalizedInput, Date.now() + SUPABASE_USER_MISS_TTL_MS);
        return supabaseId;
    } catch (error) {
        supabaseUserMissCache.set(normalizedInput, Date.now() + SUPABASE_USER_MISS_TTL_MS);
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

const mapBackendUserRow = (row: any): User => {
    const identity = enforceAvatarIdentity({
        name: row?.name || 'User',
        email: row?.email || '',
        gender: row?.gender,
        avatar: row?.avatar_url
    });

    const role = String(row?.role || '').toLowerCase();
    const isAdmin = Boolean(row?.is_admin || row?.isAdmin || role === 'admin' || role === 'super_admin');

    return {
        id: row?.firebase_uid || row?.id || '',
        name: identity.name,
        email: identity.email,
        avatar: identity.avatar,
        gender: identity.gender,
        phone: row?.phone || '',
        status: (row?.status || 'active') as User['status'],
        isAdmin,
        following: [],
        followers: [],
        wishlist: [],
        cart: [],
        badges: [],
        memberSince: row?.created_at || new Date().toISOString(),
        accountLifecycle: 'member',
        capabilities: personaService.getCapabilitiesForPersonaType('consumer')
    };
};

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

    const enrichedUser: User = {
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

    return enforceAvatarIdentity(enrichedUser);
};

const mapBackendAffiliateProfileRow = (row: any): Partial<User> => {
    if (!row || typeof row !== 'object') return {};

    const affiliateProfile = row.affiliate_profile && typeof row.affiliate_profile === 'object'
        ? (row.affiliate_profile as AffiliateProfile)
        : undefined;

    return {
        isAffiliate: Boolean(row.is_affiliate || row.onboarding_completed || affiliateProfile),
        affiliateOnboardingCompleted: Boolean(row.onboarding_completed),
        affiliateProfile,
        pendingAffiliateReferral: row.pending_referral || undefined,
        walletBalance: row.wallet_balance !== undefined ? Number(row.wallet_balance || 0) : undefined,
        processingBalance: row.processing_balance !== undefined ? Number(row.processing_balance || 0) : undefined,
        heldDeposits: row.held_deposits !== undefined ? Number(row.held_deposits || 0) : undefined,
        affiliateTier: row.affiliate_tier || undefined
    };
};

const buildAffiliateProfileBackendPayload = (uid: string, updates: Partial<User>) => {
    const payload: Record<string, unknown> = {
        user_id: uid,
        updated_at: new Date().toISOString()
    };

    let hasAffiliateFields = false;
    const setAffiliateField = (key: string, value: unknown) => {
        if (value === undefined) return;
        payload[key] = value;
        hasAffiliateFields = true;
    };

    setAffiliateField('is_affiliate', updates.isAffiliate);
    setAffiliateField('onboarding_completed', updates.affiliateOnboardingCompleted);
    setAffiliateField('affiliate_profile', updates.affiliateProfile);
    setAffiliateField('pending_referral', updates.pendingAffiliateReferral);
    setAffiliateField('wallet_balance', updates.walletBalance);
    setAffiliateField('processing_balance', updates.processingBalance);
    setAffiliateField('held_deposits', updates.heldDeposits);
    setAffiliateField('affiliate_tier', updates.affiliateTier);

    return hasAffiliateFields ? payload : null;
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
    'auction_end_at',
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

type GetItemsByOwnerOptions = {
    visibility?: 'owner' | 'public';
    statuses?: Array<Item['status']>;
    allowMockFallback?: boolean;
    strictOwnerMatch?: boolean;
};

const normalizeOwnerStatuses = (
    statuses: Array<Item['status'] | undefined> | undefined,
    visibility: 'owner' | 'public'
): Item['status'][] => {
    const source = Array.isArray(statuses) && statuses.length > 0
        ? statuses
        : visibility === 'public'
            ? ['published']
            : [];
    return source
        .filter((status): status is Item['status'] => status === 'draft' || status === 'published' || status === 'archived' || status === 'sold');
};

const pickDefined = (record: Record<string, unknown>) =>
    Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {});

const buildItemMetadataSnapshot = (
    itemData: Partial<Item>,
    options: {
        ownerName?: string;
        ownerAvatar?: string;
        preserveExistingReviews?: boolean;
    } = {}
) => {
    const sourceImages = itemData.imageUrls || itemData.images || [];
    const metadata = pickDefined({
        title: itemData.title,
        description: itemData.description,
        category: itemData.category || null,
        imageUrls: sourceImages,
        images: sourceImages,
        ownerName: options.ownerName,
        ownerAvatar: options.ownerAvatar,
        listingType: itemData.listingType,
        status: itemData.status,
        salePrice: itemData.salePrice,
        rentalPrice: itemData.rentalPrice,
        compareAtPrice: itemData.compareAtPrice,
        rentalPriceType: itemData.rentalPriceType,
        rentalRates: itemData.rentalRates,
        minRentalDuration: itemData.minRentalDuration,
        securityDeposit: itemData.securityDeposit,
        rentalFulfillment: itemData.rentalFulfillment,
        bookedDates: itemData.bookedDates,
        videoUrl: itemData.videoUrl,
        sku: itemData.sku,
        dueDate: itemData.dueDate,
        shippingOptions: itemData.shippingOptions,
        shippingDetails: itemData.shippingDetails,
        shippingWeightClass: itemData.shippingWeightClass,
        whoPaysShipping: itemData.whoPaysShipping,
        shippingEstimates: itemData.shippingEstimates,
        returnPolicy: itemData.returnPolicy,
        warranty: itemData.warranty,
        fulfillmentType: itemData.fulfillmentType,
        originCountry: itemData.originCountry,
        originCity: itemData.originCity,
        dimensionsIn: itemData.dimensionsIn,
        weightLbs: itemData.weightLbs,
        packageContents: itemData.packageContents,
        careInstructions: itemData.careInstructions,
        certifications: itemData.certifications,
        affiliateEligibility: itemData.affiliateEligibility,
        supplierInfo: itemData.supplierInfo,
        dropshipProfile: itemData.dropshipProfile,
        automation: itemData.automation,
        features: itemData.features,
        specifications: itemData.specifications,
        isInstantBook: itemData.isInstantBook,
        materials: itemData.materials,
        reservePrice: itemData.reservePrice,
        buyNowPrice: itemData.buyNowPrice,
        auctionDetails: itemData.auctionDetails,
        productType: itemData.productType,
        itemType: itemData.itemType,
        coverImageUrl: itemData.coverImageUrl,
        galleryImageUrls: itemData.galleryImageUrls,
        developer: itemData.developer,
        publisher: itemData.publisher,
        tagline: itemData.tagline,
        releaseDate: itemData.releaseDate,
        trailerUrl: itemData.trailerUrl,
        genres: itemData.genres,
        platforms: itemData.platforms,
        modes: itemData.modes,
        tags: itemData.tags,
        digitalFileUrl: itemData.digitalFileUrl,
        digitalDelivery: itemData.digitalDelivery,
        gameDetails: itemData.gameDetails,
        licenseType: itemData.licenseType,
        licenseDescription: itemData.licenseDescription,
        podProfile: itemData.podProfile,
        brand: itemData.brand,
        brandCatalogPath: (itemData as any).brandCatalogPath || null,
        brandId: (itemData as any).brandId || null,
        brandCatalogNodeId: (itemData as any).brandCatalogNodeId || null,
        brandMatchSource: (itemData as any).brandMatchSource || null,
        brandMatchConfidence: (itemData as any).brandMatchConfidence ?? null,
        brandCatalogMatchConfidence: (itemData as any).brandCatalogMatchConfidence ?? null,
        activityPreferences: (itemData as any).activityPreferences
            ? normalizeActivityPreferences((itemData as any).activityPreferences)
            : undefined,
        avgRating: itemData.avgRating,
        reviews: itemData.reviews
    });

    if (options.preserveExistingReviews && metadata.reviews === undefined) {
        delete metadata.reviews;
        delete metadata.avgRating;
    }

    return metadata;
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
    const listingType = normalizeListingType(row?.listing_type || metadata.listingType);
    const status = normalizeItemStatus(row?.status || metadata.status);
    const ownerIdentity = enforceAvatarIdentity({
        name: ownerRow?.name || metadata.ownerName || 'Seller',
        email: ownerRow?.email || metadata.ownerEmail || '',
        gender: ownerRow?.gender || metadata.ownerGender,
        avatar: ownerRow?.avatar_url || metadata.ownerAvatar
    });

    return {
        id: row?.id,
        title: row?.title || metadata.title || 'Untitled Item',
        description: row?.description || metadata.description || '',
        category: categoryName || metadata.category || 'General',
        price: salePrice || rentalPrice || auctionStartPrice || 0,
        salePrice,
        rentalPrice,
        compareAtPrice: toNumber(metadata.compareAtPrice, 0),
        listingType,
        rentalPriceType: metadata.rentalPriceType || 'daily',
        rentalRates: metadata.rentalRates || undefined,
        minRentalDuration: metadata.minRentalDuration ?? undefined,
        securityDeposit: metadata.securityDeposit ?? undefined,
        rentalFulfillment: metadata.rentalFulfillment || undefined,
        images: itemImages,
        imageUrls: itemImages,
        owner: {
            id: ownerRow?.firebase_uid || row?.seller_id || '',
            name: ownerIdentity.name,
            avatar: ownerIdentity.avatar
        },
        ownerPersonaId: row?.owner_persona_id || metadata.ownerPersonaId,
        activityPreferences: normalizeActivityPreferences(metadata.activityPreferences || {}),
        avgRating: toNumber(metadata.avgRating, 0),
        reviews: Array.isArray(metadata.reviews) ? metadata.reviews : [],
        isFeatured: Boolean(row?.is_featured),
        isVerified: Boolean(row?.is_verified),
        stock: toNumber(row?.stock, toNumber(metadata.stock, 0)),
        brand: row?.brand || metadata.brand,
        brandId: row?.brand_id || metadata.brandId || null,
        brandCatalogNodeId: row?.brand_catalog_node_id || metadata.brandCatalogNodeId || null,
        brandMatchConfidence: row?.brand_match_confidence ?? metadata.brandMatchConfidence ?? null,
        brandCatalogMatchConfidence: row?.brand_catalog_match_confidence ?? metadata.brandCatalogMatchConfidence ?? null,
        brandMatchSource: row?.brand_match_source || metadata.brandMatchSource || null,
        brandCatalogPath: metadata.brandCatalogPath || null,
        condition: row?.condition || metadata.condition,
        sku: metadata.sku || undefined,
        bookedDates: Array.isArray(metadata.bookedDates) ? metadata.bookedDates : [],
        videoUrl: metadata.videoUrl || undefined,
        dueDate: metadata.dueDate || undefined,
        shippingOptions: Array.isArray(metadata.shippingOptions) ? metadata.shippingOptions : [],
        shippingDetails: metadata.shippingDetails || undefined,
        shippingWeightClass: metadata.shippingWeightClass || undefined,
        whoPaysShipping: metadata.whoPaysShipping || undefined,
        shippingEstimates: Array.isArray(metadata.shippingEstimates) ? metadata.shippingEstimates : [],
        returnPolicy: metadata.returnPolicy || undefined,
        warranty: metadata.warranty || undefined,
        fulfillmentType: metadata.fulfillmentType || (metadata.podProfile ? 'pod' : undefined),
        originCountry: metadata.originCountry || undefined,
        originCity: metadata.originCity || undefined,
        dimensionsIn: metadata.dimensionsIn || undefined,
        weightLbs: metadata.weightLbs ?? undefined,
        packageContents: Array.isArray(metadata.packageContents) ? metadata.packageContents : [],
        careInstructions: Array.isArray(metadata.careInstructions) ? metadata.careInstructions : [],
        certifications: Array.isArray(metadata.certifications) ? metadata.certifications : [],
        affiliateEligibility: metadata.affiliateEligibility || undefined,
        automation: metadata.automation || undefined,
        features: Array.isArray(metadata.features) ? metadata.features : [],
        specifications: Array.isArray(metadata.specifications) ? metadata.specifications : [],
        isInstantBook: Boolean(metadata.isInstantBook),
        materials: Array.isArray(metadata.materials) ? metadata.materials : [],
        reservePrice: row?.auction_reserve_price ?? metadata.reservePrice ?? undefined,
        buyNowPrice: metadata.buyNowPrice ?? undefined,
        auctionDetails: metadata.auctionDetails
            ? {
                ...metadata.auctionDetails,
                endTime: metadata.auctionDetails.endTime || row?.auction_end_at || ''
            }
            : row?.auction_end_at || row?.auction_start_price
                ? {
                    startingBid: toNumber(row?.auction_start_price, 0),
                    currentBid: toNumber(metadata.currentBid ?? row?.auction_start_price, toNumber(row?.auction_start_price, 0)),
                    endTime: row?.auction_end_at || '',
                    bidCount: toNumber(metadata.bidCount, 0),
                    bids: Array.isArray(metadata.bids) ? metadata.bids : []
                }
                : undefined,
        productType: metadata.productType || (metadata.podProfile ? 'pod' : undefined),
        itemType: metadata.itemType || (metadata.podProfile ? 'physical' : undefined),
        coverImageUrl: metadata.coverImageUrl || itemImages[0] || undefined,
        galleryImageUrls: Array.isArray(metadata.galleryImageUrls) ? metadata.galleryImageUrls : itemImages,
        developer: metadata.developer || metadata.gameDetails?.developer || undefined,
        publisher: metadata.publisher || metadata.gameDetails?.publisher || undefined,
        tagline: metadata.tagline || metadata.gameDetails?.tagline || undefined,
        releaseDate: metadata.releaseDate || metadata.gameDetails?.releaseDate || undefined,
        trailerUrl: metadata.trailerUrl || metadata.gameDetails?.trailerUrl || undefined,
        genres: Array.isArray(metadata.genres) ? metadata.genres : Array.isArray(metadata.gameDetails?.genres) ? metadata.gameDetails.genres : [],
        platforms: Array.isArray(metadata.platforms)
            ? metadata.platforms
            : Array.isArray(metadata.gameDetails?.platforms)
                ? metadata.gameDetails.platforms
                : Array.isArray(metadata.digitalDelivery?.supportedPlatforms)
                    ? metadata.digitalDelivery.supportedPlatforms
                    : [],
        modes: Array.isArray(metadata.modes) ? metadata.modes : Array.isArray(metadata.gameDetails?.modes) ? metadata.gameDetails.modes : [],
        tags: Array.isArray(metadata.tags) ? metadata.tags : Array.isArray(metadata.gameDetails?.tags) ? metadata.gameDetails.tags : [],
        digitalFileUrl: metadata.digitalFileUrl || undefined,
        digitalDelivery: metadata.digitalDelivery || undefined,
        gameDetails: metadata.gameDetails || undefined,
        licenseType: metadata.licenseType || undefined,
        licenseDescription: metadata.licenseDescription || undefined,
        supplierInfo: metadata.supplierInfo || undefined,
        dropshipProfile: metadata.dropshipProfile || undefined,
        podProfile: metadata.podProfile || undefined,
        status,
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
    const rawName = String(payload.name || firebaseUser.displayName || '').trim();
    const rawEmail = String(payload.email || firebaseUser.email || '').trim();
    const rawAvatar = String(payload.avatar || firebaseUser.photoURL || '').trim();
    const normalizedIdentity = enforceAvatarIdentity({
        name: rawName || undefined,
        email: rawEmail || undefined,
        gender: payload.gender,
        avatar: rawAvatar || undefined
    });
    const body: Record<string, unknown> = {
        firebase_uid: firebaseUser.uid,
        phone: payload.phone || null
    };
    if (rawEmail) body.email = normalizedIdentity.email || rawEmail;
    if (rawName) body.name = normalizedIdentity.name || rawName;
    if (rawAvatar) body.avatar_url = normalizedIdentity.avatar || rawAvatar;

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
            return mirrored
                .filter((user) => (user.status || 'active') === 'active')
                .map((user) => enforceAvatarIdentity(user));
        }
    }

    if (shouldUseFirestoreFallback()) {
        try {
            const activeQuery = query(collection(db, 'users'), where('status', '==', 'active'));
            const activeSnapshot = await getDocs(activeQuery);
            if (!activeSnapshot.empty) {
                return activeSnapshot.docs.map((docSnap) => enforceAvatarIdentity(fromFirestore<User>(docSnap)));
            }
        } catch (error) {
            console.warn('Firestore active users fetch failed:', error);
        }

        try {
            const allSnapshot = await getDocs(query(collection(db, 'users')));
            if (!allSnapshot.empty) {
                const users = allSnapshot.docs.map((docSnap) => enforceAvatarIdentity(fromFirestore<User>(docSnap)));
                return users.filter((user) => (user.status || 'active') === 'active');
            }
        } catch (error) {
            console.warn('Firestore users fallback fetch failed:', error);
        }
    }

    if (shouldUseLocalMockFallback()) {
        await ensureLocalDb();
        const users = await localDb.list<User>('users');
        return users
            .filter((user) => (user.status || 'active') === 'active')
            .map((user) => enforceAvatarIdentity(user));
    }

    return [];
};

const CHAT_THREAD_SELECT = 'id,item_id,buyer_id,seller_id,buyer_persona_id,seller_persona_id,last_message_at,created_at,inbox_label';
const CHAT_MESSAGE_SELECT = 'id,thread_id,sender_id,message_type,body,image_url,offer_id,reply_to_message_id,reactions,edited_at,deleted_at,created_at';
const CHAT_OFFER_SELECT = 'id,thread_id,sender_id,title,description,price,duration_days,status,created_at';
const VOICE_NOTE_PREFIX = '__voice_note__:';
const ENCRYPTED_MESSAGE_PREFIX = '__enc_v1__:';
const CHAT_TYPING_COLLECTION_PREFIX = 'chat_typing:';
const CHAT_READ_COLLECTION_PREFIX = 'chat_read:';
const CHAT_PRESENCE_COLLECTION = 'chat_presence';
const VOICE_EXTENSION_BY_MIME: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav'
};

const isUuidLike = (value?: string | null) =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const shouldEnforceCanonicalCheckout = (items: CartItem[]) =>
    isBackendConfigured() &&
    items.length > 0 &&
    items.every((line) => isUuidLike(String(line.id || '').trim()));

const isCanonicalBookingRecord = (booking?: Partial<Booking> | null) =>
    Boolean(
        booking &&
        (
            booking.source === 'commerce' ||
            (typeof booking.canonicalRentalBookingId === 'string' && booking.canonicalRentalBookingId.trim()) ||
            isUuidLike(String(booking.orderId || '').trim()) ||
            isUuidLike(String(booking.orderItemId || '').trim())
        )
    );

const toIsoTimestamp = (value?: string | Date | null) => {
    if (!value) return new Date().toISOString();
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return new Date().toISOString();
    return dateValue.toISOString();
};

const normalizeChatMessageType = (value: unknown): ChatMessage['type'] => {
    const normalized = String(value || 'text').toLowerCase();
    if (normalized === 'offer') return 'offer';
    if (normalized === 'image') return 'image';
    if (normalized === 'video') return 'video';
    if (normalized === 'voice') return 'voice';
    return 'text';
};

const encodeVoiceNotePayload = (payload: { url: string; durationMs?: number; mimeType?: string }) =>
    `${VOICE_NOTE_PREFIX}${JSON.stringify(payload)}`;

const parseVoiceNotePayload = (value: unknown): { url: string; durationMs?: number; mimeType?: string } | null => {
    if (typeof value !== 'string' || !value.startsWith(VOICE_NOTE_PREFIX)) return null;
    try {
        const parsed = JSON.parse(value.slice(VOICE_NOTE_PREFIX.length));
        const url = String(parsed?.url || '');
        if (!url) return null;
        const durationMs = Number(parsed?.durationMs || 0);
        const mimeType = parsed?.mimeType ? String(parsed.mimeType) : undefined;
        return {
            url,
            durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined,
            mimeType
        };
    } catch {
        return null;
    }
};

const isEncryptedMessagePayload = (value: unknown) =>
    typeof value === 'string' && value.startsWith(ENCRYPTED_MESSAGE_PREFIX);

const normalizeChatInboxLabel = (value: unknown): 'primary' | 'general' | null => {
    if (value === 'primary' || value === 'general') return value;
    return null;
};

const encodeTypingCollection = (threadId: string) => `${CHAT_TYPING_COLLECTION_PREFIX}${threadId}`;
const encodeReadCollection = (threadId: string) => `${CHAT_READ_COLLECTION_PREFIX}${threadId}`;
const normalizeMimeType = (value?: string | null) => String(value || '').trim().toLowerCase().split(';')[0] || '';
const voiceFileExtensionForMime = (mimeType?: string | null) =>
    VOICE_EXTENSION_BY_MIME[normalizeMimeType(mimeType)] || 'webm';

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const [, payload = ''] = result.split(',');
            if (!payload) {
                reject(new Error('Failed to encode blob payload'));
                return;
            }
            resolve(payload);
        };
        reader.onerror = () => reject(new Error('Failed to read blob payload'));
        reader.readAsDataURL(blob);
    });

const mapBackendOfferRowToCustomOffer = (
    row: any
): CustomOffer => ({
    id: String(row?.id || ''),
    title: String(row?.title || 'Custom Offer'),
    description: String(row?.description || ''),
    price: Number(row?.price || 0),
    duration: Number(row?.duration_days || 1),
    status: (String(row?.status || 'pending') as CustomOffer['status']),
    createdAt: row?.created_at || new Date().toISOString(),
    engagementId: row?.thread_id || undefined
});

const mapBackendMessageRowToChatMessage = (
    row: any,
    firebaseUidBySupabaseUserId: Map<string, string>,
    offerById: Map<string, CustomOffer>
): ChatMessage => {
    const offerId = row?.offer_id ? String(row.offer_id) : '';
    const bodyText = String(row?.body || '');
    const voicePayload = parseVoiceNotePayload(bodyText);
    const messageType = normalizeChatMessageType(row?.message_type);
    const mappedType = offerId ? 'offer' : (voicePayload ? 'voice' : messageType);
    const encrypted = isEncryptedMessagePayload(bodyText);

    const resolvedText = (() => {
        if (voicePayload) return '';
        if (encrypted) return 'Encrypted message';
        return bodyText;
    })();

    const normalizedReactions = (() => {
        const raw = row?.reactions;
        if (!raw || typeof raw !== 'object') return {};
        return Object.entries(raw as Record<string, unknown>).reduce<Record<string, string[]>>((accumulator, [emoji, userIds]) => {
            if (!emoji) return accumulator;
            const normalizedIds = Array.isArray(userIds)
                ? userIds.map((entry) => firebaseUidBySupabaseUserId.get(String(entry || '')) || String(entry || '')).filter(Boolean)
                : [];
            if (normalizedIds.length > 0) accumulator[emoji] = normalizedIds;
            return accumulator;
        }, {});
    })();

    return {
        id: String(row?.id || ''),
        senderId: firebaseUidBySupabaseUserId.get(String(row?.sender_id || '')) || String(row?.sender_id || ''),
        text: resolvedText,
        type: mappedType,
        imageUrl: row?.image_url || undefined,
        audioUrl: voicePayload?.url,
        audioDurationMs: voicePayload?.durationMs,
        content: encrypted ? { encrypted: true, payload: bodyText } : undefined,
        timestamp: toIsoTimestamp(row?.created_at),
        offer: offerId ? offerById.get(offerId) : undefined,
        replyToMessageId: row?.reply_to_message_id ? String(row.reply_to_message_id) : undefined,
        reactions: normalizedReactions,
        editedAt: row?.edited_at ? toIsoTimestamp(row.edited_at) : undefined,
        deletedAt: row?.deleted_at ? toIsoTimestamp(row.deleted_at) : undefined
    };
};

const mapBackendCallSession = (
    row: any,
    firebaseUidBySupabaseUserId: Map<string, string>
): ChatCallSession | null => {
    if (!row) return null;
    const initiatorRaw = String(row?.initiatorId || row?.initiator_user_id || '');
    const receiverRaw = String(row?.receiverId || row?.receiver_user_id || '');
    const acceptedByRaw = String(row?.acceptedById || row?.accepted_by_user_id || '');
    const silentByRaw = Array.isArray(row?.silentByIds)
        ? row.silentByIds
        : Array.isArray(row?.silent_by_user_ids)
            ? row.silent_by_user_ids
            : [];

    const mapUserId = (value: string) => firebaseUidBySupabaseUserId.get(value) || value;

    const mode = String(row?.mode || 'voice').toLowerCase() === 'video' ? 'video' : 'voice';
    const statusRaw = String(row?.status || 'ringing').toLowerCase();
    const status: ChatCallSession['status'] = ['ringing', 'accepted', 'declined', 'ended', 'missed'].includes(statusRaw)
        ? (statusRaw as ChatCallSession['status'])
        : 'ringing';

    return {
        id: String(row?.id || row?.callId || ''),
        threadId: String(row?.threadId || row?.thread_id || ''),
        roomName: String(row?.roomName || row?.room_name || ''),
        mode,
        status,
        initiatorId: mapUserId(initiatorRaw),
        receiverId: mapUserId(receiverRaw),
        acceptedById: acceptedByRaw ? mapUserId(acceptedByRaw) : undefined,
        silentByIds: silentByRaw.map((entry: any) => mapUserId(String(entry || ''))).filter(Boolean),
        startedAt: toIsoTimestamp(row?.startedAt || row?.started_at || row?.created_at),
        updatedAt: toIsoTimestamp(row?.updatedAt || row?.updated_at || row?.created_at),
        endedAt: row?.endedAt || row?.ended_at ? toIsoTimestamp(row?.endedAt || row?.ended_at) : undefined,
        reason: row?.reason || row?.endReason || row?.end_reason || undefined
    };
};

const fetchUsersBySupabaseIds = async (
    ids: string[],
    token?: string
): Promise<{ rowsById: Map<string, any>; firebaseUidBySupabaseUserId: Map<string, string> }> => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0 || !isBackendConfigured()) {
        return { rowsById: new Map(), firebaseUidBySupabaseUserId: new Map() };
    }

    const rowsById = new Map<string, any>();
    const firebaseUidBySupabaseUserId = new Map<string, string>();
    const uncachedIds: string[] = [];

    uniqueIds.forEach((id) => {
        const cachedRow = getCachedSupabaseUserRow(id);
        if (!cachedRow) {
            uncachedIds.push(id);
            return;
        }
        rowsById.set(id, cachedRow);
        const cachedFirebaseUid = String(cachedRow?.firebase_uid || '');
        if (cachedFirebaseUid) {
            firebaseUidBySupabaseUserId.set(id, cachedFirebaseUid);
        }
    });

    if (uncachedIds.length > 0) {
        const params = new URLSearchParams();
        params.set('in.id', uncachedIds.join(','));
        params.set('select', 'id,firebase_uid,email,name,avatar_url,phone,status,created_at');
        params.set('limit', String(Math.max(100, uncachedIds.length + 10)));

        const res = await backendFetch(`/api/users?${params.toString()}`, {}, token);
        const rows = Array.isArray(res?.data) ? res.data : [];
        rows.forEach((row: any) => {
            const supabaseId = String(row?.id || '');
            if (!supabaseId) return;
            rowsById.set(supabaseId, row);
            supabaseUserRowCache.set(supabaseId, { row, cachedAt: Date.now() });
            const firebaseUid = String(row?.firebase_uid || '');
            if (firebaseUid) {
                firebaseUidBySupabaseUserId.set(supabaseId, firebaseUid);
            }
        });
    }

    Array.from(rowsById.entries()).forEach(([supabaseId, row]) => {
        const firebaseUid = String(row?.firebase_uid || '');
        if (firebaseUid && !firebaseUidBySupabaseUserId.has(supabaseId)) {
            firebaseUidBySupabaseUserId.set(supabaseId, firebaseUid);
        }
    });

    return { rowsById, firebaseUidBySupabaseUserId };
};

const fetchOffersByIds = async (
    offerIds: string[],
    _firebaseUidBySupabaseUserId: Map<string, string>,
    token?: string
): Promise<Map<string, CustomOffer>> => {
    const ids = Array.from(new Set(offerIds.filter(Boolean)));
    if (ids.length === 0 || !isBackendConfigured()) return new Map();

    const offerMap = new Map<string, CustomOffer>();
    const uncachedIds: string[] = [];

    ids.forEach((id) => {
        const cached = customOfferCache.get(id);
        if (cached && Date.now() - cached.cachedAt <= CUSTOM_OFFER_CACHE_TTL_MS) {
            offerMap.set(id, cached.offer);
            return;
        }
        customOfferCache.delete(id);
        uncachedIds.push(id);
    });

    if (uncachedIds.length === 0) return offerMap;

    const params = new URLSearchParams();
    params.set('in.id', uncachedIds.join(','));
    params.set('select', CHAT_OFFER_SELECT);
    params.set('limit', String(Math.max(100, uncachedIds.length + 10)));

    const res = await backendFetch(`/api/custom_offers?${params.toString()}`, {}, token);
    const rows = Array.isArray(res?.data) ? res.data : [];
    rows.forEach((row: any) => {
        const id = String(row?.id || '');
        if (!id) return;
        const mappedOffer = mapBackendOfferRowToCustomOffer(row);
        offerMap.set(id, mappedOffer);
        customOfferCache.set(id, { offer: mappedOffer, cachedAt: Date.now() });
    });
    return offerMap;
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

const normalizeLocalNotificationType = (type?: string): Notification['type'] => {
    const normalized = String(type || 'INFO').toUpperCase();
    if (normalized === 'SALE' || normalized === 'ORDER') return normalized as Notification['type'];
    return 'INFO';
};

const createUserNotification = async (
    userId: string,
    payload: {
        type?: Notification['type'] | string;
        title?: string;
        message: string;
        link?: string;
        createdAt?: string;
    }
) => {
    const targetUserId = String(userId || '').trim();
    const message = String(payload.message || '').trim();
    if (!targetUserId || !message) return;

    const createdAt = payload.createdAt || new Date().toISOString();

    if (isBackendConfigured()) {
        try {
            const token = await getBackendToken();
            const supabaseId = await resolveSupabaseUserId(targetUserId);
            if (supabaseId) {
                await backendFetch('/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: supabaseId,
                        type: mapNotificationTypeForBackend(payload.type),
                        title: payload.title || 'Update',
                        body: message,
                        link: payload.link || ''
                    })
                }, token);
                return;
            }
        } catch (error) {
            console.warn('Backend notification failed:', error);
        }
    }

    if (!shouldUseFirestoreFallback() && isBackendConfigured()) return;

    try {
        await addDoc(collection(db, 'notifications'), {
            userId: targetUserId,
            type: normalizeLocalNotificationType(payload.type),
            message,
            link: payload.link || '',
            isRead: false,
            createdAt
        });
    } catch (error) {
        console.warn('Firestore notification failed:', error);
    }
};

const formatMoney = (amount?: number | null) => `$${Number(amount || 0).toFixed(2)}`;

const formatBookingStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return 'updated';
    return normalized
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const mapCanonicalRentalStatusToLegacyStatus = (status: string): Booking['status'] => {
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

const mapCanonicalRentalToLegacyBooking = (row: any): Booking => {
    const rentalId = String(row?.id || row?.rental_booking_id || row?.rentalBookingId || '');
    const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const securityDepositAmount = Number(row?.security_deposit_amount || row?.securityDepositAmount || metadata?.quote?.securityDeposit || 0);
    const claimAmount = Number(row?.claim_amount || row?.claimAmount || 0);
    const claimReason = String(row?.claim_reason || row?.claimReason || '');
    const claimEvidence = String(row?.claim_evidence_url || row?.claimEvidenceUrl || '');
    const canonicalStatus = String(row?.status || 'pending_confirmation');
    const legacyStatus = mapCanonicalRentalStatusToLegacyStatus(canonicalStatus);
    const securityDepositStatusRaw = String(row?.security_deposit_status || row?.securityDepositStatus || '').toLowerCase();
    const depositStatus: Booking['depositStatus'] =
        securityDepositStatusRaw === 'claimed'
            ? 'claimed'
            : securityDepositStatusRaw === 'held'
                ? 'held'
                : 'released';
    return {
        id: rentalId,
        orderId: String(row?.order_id || row?.orderId || ''),
        itemId: String(row?.item_id || row?.itemId || ''),
        itemTitle: String(row?.item_title || row?.itemTitle || metadata?.itemTitle || 'Item'),
        renterId: String(row?.buyer_firebase_uid || row?.buyerFirebaseUid || row?.buyer_id || row?.buyerId || ''),
        renterName: String(metadata?.renterName || row?.renter_name || row?.renterName || 'Renter'),
        provider: { id: String(row?.seller_firebase_uid || row?.sellerFirebaseUid || row?.seller_id || row?.sellerId || '') },
        startDate: String(row?.rental_start || row?.rentalStart || row?.startDate || new Date().toISOString()),
        endDate: String(row?.rental_end || row?.rentalEnd || row?.endDate || new Date().toISOString()),
        totalPrice: Number(row?.total_price || row?.totalPrice || metadata?.quote?.subtotal || metadata?.server_priced_quote?.subtotal || 0),
        status: legacyStatus,
        trackingNumber: String(row?.tracking_number || row?.trackingNumber || ''),
        paymentStatus:
            depositStatus === 'held'
                ? 'escrow'
                : depositStatus === 'claimed'
                    ? 'released'
                    : 'released',
        type: 'rent',
        currency: String(row?.currency || metadata?.quote?.currency || 'PKR'),
        securityDeposit: securityDepositAmount,
        depositStatus,
        claimDetails:
            claimAmount > 0
                ? {
                    amount: claimAmount,
                    reason: claimReason,
                    proofImage: claimEvidence
                }
                : undefined
    };
};

const mapCommerceHistoryLineToRentalHistory = (line: any): RentalHistoryItem => {
    const normalizedType = String(line?.type || '').toLowerCase() === 'rent' ? 'rent' : 'sale';
    const podSelection = line?.podSelection || line?.pod_selection || line?.metadata?.podSelection || null;
    const podVariantLabel = [podSelection?.color, podSelection?.size].filter(Boolean).join(' / ');
    const itemType = String(
        line?.itemType ||
        line?.item_type ||
        (String(line?.deliveryMode || line?.delivery_mode || '').toLowerCase() === 'digital' ? 'digital' : '')
    ).trim().toLowerCase();
    return {
        id: String(line?.id || line?.orderItemId || line?.order_id || ''),
        itemId: String(line?.itemId || line?.item_id || ''),
        itemTitle: String(line?.itemTitle || line?.item_title || 'Item'),
        itemImageUrl: String(line?.itemImageUrl || line?.item_image_url || '/icons/urbanprime.svg'),
        startDate: String(line?.startDate || line?.start_date || line?.created_at || new Date().toISOString()),
        endDate: String(line?.endDate || line?.end_date || line?.startDate || line?.created_at || new Date().toISOString()),
        totalPrice: Number(line?.totalPrice || line?.total_price || 0),
        status: String(line?.legacyStatus || line?.legacy_status || line?.status || 'pending').toLowerCase(),
        type: normalizedType,
        itemType: itemType || undefined,
        source: 'commerce',
        orderId: String(line?.orderId || line?.order_id || ''),
        podJobStatus: line?.podJobStatus || line?.pod_job_status || undefined,
        podVariantLabel: podVariantLabel || undefined
    } as RentalHistoryItem;
};

const buildBookingStatusNotifications = (
    booking: Booking,
    status: string,
    trackingNumber?: string
): {
    buyer?: { title: string; message: string; link: string };
    seller?: { title: string; message: string; link: string };
} => {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const itemTitle = booking.itemTitle || 'your order item';
    const link = `/profile/orders/${booking.id}`;
    const statusLabel = formatBookingStatusLabel(normalizedStatus);

    switch (normalizedStatus) {
        case 'confirmed':
            return {
                buyer: {
                    title: 'Order confirmed',
                    message: `Your order for ${itemTitle} is confirmed and being prepared.`,
                    link
                },
                seller: {
                    title: 'Order confirmed',
                    message: `Order for ${itemTitle} has been confirmed.`,
                    link
                }
            };
        case 'shipped': {
            const trackingSuffix = trackingNumber ? ` Tracking: ${trackingNumber}.` : '';
            return {
                buyer: {
                    title: 'Order shipped',
                    message: `${itemTitle} has been shipped.${trackingSuffix}`.trim(),
                    link
                },
                seller: {
                    title: 'Shipment confirmed',
                    message: `You marked ${itemTitle} as shipped.`,
                    link
                }
            };
        }
        case 'delivered':
            return {
                buyer: {
                    title: 'Order delivered',
                    message: `${itemTitle} is marked as delivered.`,
                    link
                },
                seller: {
                    title: 'Order delivered',
                    message: `${itemTitle} is marked as delivered.`,
                    link
                }
            };
        case 'returned':
            return {
                buyer: {
                    title: 'Item returned',
                    message: `${itemTitle} is marked as returned.`,
                    link
                },
                seller: {
                    title: 'Item returned',
                    message: `${itemTitle} is marked as returned.`,
                    link
                }
            };
        case 'completed':
            return {
                buyer: {
                    title: 'Order completed',
                    message: `${itemTitle} is completed.`,
                    link
                },
                seller: {
                    title: 'Order completed',
                    message: `${itemTitle} is completed.`,
                    link
                }
            };
        case 'cancelled':
            return {
                buyer: {
                    title: 'Order cancelled',
                    message: `${itemTitle} was cancelled.`,
                    link
                },
                seller: {
                    title: 'Order cancelled',
                    message: `Order for ${itemTitle} was cancelled.`,
                    link
                }
            };
        default:
            return {
                buyer: {
                    title: 'Order updated',
                    message: `${itemTitle} status is now ${statusLabel}.`,
                    link
                },
                seller: {
                    title: 'Order updated',
                    message: `Order for ${itemTitle} status is now ${statusLabel}.`,
                    link
                }
            };
    }
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

        if (false && isBackendConfigured()) {
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
    await createUserNotification(event.ownerId, {
        type: notification.type,
        title: 'New activity',
        message: notification.message,
        link: notification.link,
        createdAt
    });
};

// --- AUTH SERVICE ---
export const authService = {
    login: async (email: string, pass: string): Promise<User> => {
        // --- Admin Portal Portal Bypass ---
        if (email.toLowerCase() === 'admin@urbanprime.com' && pass === 'AdminPassword123!') {
            return enforceAvatarIdentity({
                id: 'admin-bypass',
                name: 'Urban Prime Admin',
                email: 'admin@urbanprime.com',
                avatar: '/icons/urbanprime.svg',
                following: [],
                followers: [],
                wishlist: [],
                cart: [],
                badges: [],
                memberSince: new Date().toISOString(),
                phone: '',
                city: '',
                country: '',
                isAdmin: true,
                status: 'active',
                accountLifecycle: 'member',
                capabilities: personaService.getCapabilitiesForPersonaType('consumer', { isAdmin: true })
            } as User);
        }

        if (isFirebaseDisabled()) {
            await ensureLocalDb();
            const users = await localDb.list<User>('users');
            const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || users[0];
            if (found) return enforceAvatarIdentity(found);
            const fallback: User = enforceAvatarIdentity({
                id: `local-${Date.now()}`,
                name: email.split('@')[0] || 'Local User',
                email,
                avatar: '/icons/urbanprime.svg',
                phone: '',
                city: '',
                country: '',
                purpose: undefined,
                interests: [],
                currencyPreference: '',
                following: [],
                followers: [],
                wishlist: [],
                cart: [],
                badges: [],
                memberSince: new Date().toISOString(),
                status: 'active',
                accountLifecycle: 'member',
                capabilities: personaService.getCapabilitiesForPersonaType('consumer')
            });
            await localDb.upsert('users', fallback);
            return fallback;
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        await syncUserToBackend(userCredential.user);
        const user = await userService.getUserById(userCredential.user.uid);
        if (!user) throw new Error('User profile not found');
        return user;
    },
    register: async (
        name: string,
        email: string,
        pass: string,
        phone: string,
        city: string,
        profileOverrides?: Partial<User>
    ): Promise<void> => {
        if (isFirebaseDisabled()) {
            await ensureLocalDb();
            const newUser: User = enforceAvatarIdentity({
                id: `local-${Date.now()}`,
                name,
                email,
                avatar: profileOverrides?.avatar || '/icons/urbanprime.svg',
                phone,
                city,
                country: profileOverrides?.country || '',
                purpose: profileOverrides?.purpose,
                interests: profileOverrides?.interests || [],
                currencyPreference: profileOverrides?.currencyPreference || '',
                following: [],
                followers: [],
                wishlist: [],
                cart: [],
                badges: [],
                memberSince: new Date().toISOString(),
                status: 'active',
                accountLifecycle: 'member',
                capabilities: personaService.getCapabilitiesForPersonaType('consumer')
            });
            await localDb.upsert('users', newUser);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await userService.createUserProfile(userCredential.user, { name, phone, city, ...profileOverrides });
        await syncUserToBackend(userCredential.user, { name, email, phone, city, ...profileOverrides });
    },
    logout: async () => {
        if (isFirebaseDisabled()) return;
        await signOut(auth);
    },
    signInWithGoogle: async (): Promise<void> => {
        if (isFirebaseDisabled()) {
            await ensureLocalDb();
            return;
        }
        const result = await signInWithPopup(auth, googleProvider);
        await syncUserToBackend(result.user);
    },
    syncAuthenticatedUser: async (payload: Partial<User> = {}): Promise<User | null> => {
        if (isFirebaseDisabled()) {
            await ensureLocalDb();
            const users = await localDb.list<User>('users');
            return users[0] ? enforceAvatarIdentity(users[0]) : null;
        }
        if (!auth.currentUser) return null;
        return syncUserToBackend(auth.currentUser, payload);
    },
    getProfile: async (uid: string): Promise<User | null> => {
        return userService.getUserById(uid);
    },
    createUserProfile: async (firebaseUser: FirebaseUser, additionalData: Partial<User>): Promise<User> => {
        return userService.createUserProfile(firebaseUser, additionalData);
    },
    requestPasswordReset: async (email: string) => {
        if (isFirebaseDisabled()) {
            return { token: 'local-token' };
        }
        await sendPasswordResetEmail(auth, email);
        return { token: 'mock-token' };
    },
    resetPassword: async (token: string, newPass: string) => {
        if (isFirebaseDisabled()) {
            return;
        }
        await confirmPasswordReset(auth, token, newPass);
    },
    deleteCurrentAccount: async (password: string) => {
        if (isFirebaseDisabled()) {
            await ensureLocalDb();
            const currentUser = (await localDb.list<User>('users'))[0];
            if (currentUser?.id) {
                await localDb.delete('users', currentUser.id);
            }
            return;
        }
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) {
            throw new Error('Sign in again before deleting this account.');
        }

        const hasPasswordProvider = currentUser.providerData.some((entry) => entry.providerId === 'password') || currentUser.providerData.length === 0;
        if (!hasPasswordProvider) {
            throw new Error('This account does not use a password sign-in method.');
        }

        const normalizedPassword = String(password || '').trim();
        if (!normalizedPassword) {
            throw new Error('Enter your password to delete this account.');
        }

        const credential = EmailAuthProvider.credential(currentUser.email, normalizedPassword);
        await reauthenticateWithCredential(currentUser, credential);

        const token = await currentUser.getIdToken(true);
        await backendFetch(
            '/pixe/studio/account',
            {
                method: 'DELETE',
                backendNoQueue: true
            },
            token
        );

        await deleteFirebaseUser(currentUser);
    }
};

// --- USER SERVICE ---
export const userService = {
    getUserById: async (uid: string): Promise<User | null> => {
        const token = await getBackendToken();
        const canUseBackend = Boolean(token || hasBackendApiKey);

        const mergeSupplementalUserState = async (baseUser: User | null): Promise<User | null> => {
            let supplemental: Partial<User> = {};

            if (isBackendConfigured() && canUseBackend) {
                try {
                    const affiliateProfileLookupKeys = await resolveBackendUserLookupKeys(uid);
                    const affiliateProfileResponses = await Promise.all(
                        affiliateProfileLookupKeys.map((lookupUserId) =>
                            backendFetch(
                                `/api/affiliate_profiles?eq.user_id=${encodeURIComponent(lookupUserId)}&limit=1`,
                                {},
                                token
                            ).catch(() => null)
                        )
                    );
                    const affiliateProfileRow = affiliateProfileResponses
                        .flatMap((response) =>
                            Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : []
                        )[0];
                    if (affiliateProfileRow) {
                        supplemental = { ...supplemental, ...mapBackendAffiliateProfileRow(affiliateProfileRow) };
                    }
                } catch (error) {
                    console.warn('Backend affiliate profile merge failed:', error);
                }
            }

            if (supabaseMirror.enabled) {
                try {
                    const mirrored = await supabaseMirror.get<User>('users', uid);
                    if (mirrored) {
                        supplemental = { ...supplemental, ...mirrored };
                    }
                } catch (error) {
                    console.warn('Supabase mirrored user merge failed:', error);
                }
            }

            if (shouldUseFirestoreFallback()) {
                try {
                    const docSnap = await getDoc(doc(db, 'users', uid));
                    if (docSnap.exists()) {
                        supplemental = { ...supplemental, ...(docSnap.data() as Partial<User>) };
                    }
                } catch (error) {
                    console.warn('Firestore supplemental user fetch failed:', error);
                }
            }

            if (shouldUseLocalMockFallback()) {
                try {
                    await ensureLocalDb();
                    const localUser = await localDb.getById<User>('users', uid);
                    if (localUser) {
                        supplemental = { ...supplemental, ...localUser };
                    }
                } catch (error) {
                    console.warn('Local supplemental user fetch failed:', error);
                }
            }

            if (!baseUser && !Object.keys(supplemental).length) {
                return null;
            }

            return enforceAvatarIdentity({
                ...(baseUser || {}),
                ...supplemental,
                id: baseUser?.id || supplemental.id || uid
            } as User);
        };

        if (isBackendConfigured() && canUseBackend) {
            try {
                const queryByFirebaseUid = `/api/users?firebase_uid=${encodeURIComponent(uid)}&select=id,firebase_uid,email,name,avatar_url,phone,status,role,created_at&limit=1`;
                const queryBySupabaseId = `/api/users?id=${encodeURIComponent(uid)}&select=id,firebase_uid,email,name,avatar_url,phone,status,role,created_at&limit=1`;
                const responses = await Promise.all([
                    backendFetch(queryByFirebaseUid, {}, token).catch(() => null),
                    isUuidLike(uid) ? backendFetch(queryBySupabaseId, {}, token).catch(() => null) : Promise.resolve(null)
                ]);

                for (const response of responses) {
                    const rows = Array.isArray(response?.data) ? response?.data : [];
                    if (rows.length > 0) {
                        return mergeSupplementalUserState(mapBackendUserRow(rows[0]));
                    }
                }
            } catch (error) {
                console.warn('Backend user fetch failed:', error);
            }
        }

        if (canUseBackend && supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.get<User>('users', uid);
            if (mirrored) return enforceAvatarIdentity(mirrored);
        }

        if (shouldUseFirestoreFallback()) {
            try {
                const docRef = doc(db, 'users', uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return enforceAvatarIdentity(fromFirestore<User>(docSnap));
            } catch (error) {
                console.warn('Firestore user fetch failed:', error);
            }
        }

        if (shouldUseLocalMockFallback()) {
            await ensureLocalDb();
            const users = await localDb.list<User>('users');
            const found = users.find((u) => u.id === uid) || null;
            return found ? enforceAvatarIdentity(found) : null;
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

        const newUser: User = enforceAvatarIdentity({
            id: firebaseUser.uid,
            name: additionalData.name || firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: additionalData.avatar || firebaseUser.photoURL || '/icons/urbanprime.svg',
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
        });

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
        const shouldNormalizeIdentity =
            updates.name !== undefined ||
            updates.email !== undefined ||
            updates.gender !== undefined ||
            updates.avatar !== undefined;
        const normalizedUpdates: Partial<User> = { ...updates };
        let lastBackendError: unknown = null;
        if (shouldNormalizeIdentity) {
            const enforced = enforceAvatarIdentity({
                name: updates.name,
                email: updates.email,
                gender: updates.gender,
                avatar: updates.avatar
            });
            if (updates.avatar !== undefined) {
                normalizedUpdates.avatar = enforced.avatar;
            }
            if (
                updates.gender !== undefined ||
                updates.name !== undefined ||
                updates.email !== undefined
            ) {
                normalizedUpdates.gender = enforced.gender;
            }
        }

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const affiliateBackendUserId = await resolveBackendUserId(uid);
                const payload: Record<string, any> = {};
                const affiliatePayload = buildAffiliateProfileBackendPayload(affiliateBackendUserId || uid, normalizedUpdates);
                if (normalizedUpdates.name !== undefined) payload.name = normalizedUpdates.name;
                if (normalizedUpdates.email !== undefined) payload.email = normalizedUpdates.email;
                if (normalizedUpdates.avatar !== undefined) payload.avatar = normalizedUpdates.avatar;
                if (normalizedUpdates.phone !== undefined) payload.phone = normalizedUpdates.phone;
                if (normalizedUpdates.status !== undefined) payload.status = normalizedUpdates.status;
                if (normalizedUpdates.city !== undefined) payload.city = normalizedUpdates.city;
                if (normalizedUpdates.country !== undefined) payload.country = normalizedUpdates.country;
                if (normalizedUpdates.interests !== undefined) payload.interests = normalizedUpdates.interests;
                if (normalizedUpdates.currencyPreference !== undefined) payload.currencyPreference = normalizedUpdates.currencyPreference;
                if (normalizedUpdates.about !== undefined) payload.about = normalizedUpdates.about;
                if (normalizedUpdates.businessName !== undefined) payload.businessName = normalizedUpdates.businessName;
                if (normalizedUpdates.businessDescription !== undefined) payload.businessDescription = normalizedUpdates.businessDescription;
                if (normalizedUpdates.dob !== undefined) payload.dob = normalizedUpdates.dob;
                if (normalizedUpdates.gender !== undefined) payload.gender = normalizedUpdates.gender;
                if (normalizedUpdates.purpose !== undefined) payload.purpose = normalizedUpdates.purpose;

                let mapped: User | null = null;
                if (Object.keys(payload).length > 0) {
                    const patched = await backendFetch('/profile/me', {
                        method: 'PATCH',
                        body: JSON.stringify(payload)
                    }, token);
                    mapped = mapUnifiedProfilePayloadToUser(patched, uid);
                }

                if (affiliatePayload) {
                    await backendFetch('/api/affiliate_profiles?upsert=1&onConflict=user_id', {
                        method: 'POST',
                        body: JSON.stringify(affiliatePayload)
                    }, token);
                }

                if (mapped || affiliatePayload) {
                    const fallbackExisting = mapped ? null : await userService.getUserById(uid);
                    const merged = enforceAvatarIdentity({
                        ...(fallbackExisting || mapped || { id: uid, name: normalizedUpdates.name || 'User', email: normalizedUpdates.email || '' }),
                        ...normalizedUpdates,
                        id: uid
                    } as User);
                    if (supabaseMirror.enabled) {
                        await supabaseMirror.upsert('users', uid, merged);
                    }
                    if (shouldUseFirestoreFallback()) {
                        await setDoc(doc(db, 'users', uid), normalizedUpdates, { merge: true });
                    }
                    if (shouldUseLocalMockFallback()) {
                        await ensureLocalDb();
                        const existingLocalUser = await localDb.getById<User>('users', uid);
                        await localDb.upsert('users', enforceAvatarIdentity({ ...(existingLocalUser || merged), ...merged, ...normalizedUpdates, id: uid }));
                    }
                    return merged;
                }
            } catch (error) {
                lastBackendError = error;
                console.warn('Backend user update failed:', error);
            }
        }

        if (shouldUseFirestoreFallback()) {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, normalizedUpdates, { merge: true });
            if (supabaseMirror.enabled) {
                await supabaseMirror.mergeUpdate<User>('users', uid, normalizedUpdates);
            }
            const updatedDoc = await getDoc(userRef);
            return enforceAvatarIdentity(fromFirestore<User>(updatedDoc));
        }

        if (canUseDirectSupabaseTables()) {
            try {
                const existingDirectUser = await userService.getUserById(uid).catch(() => null);
                const mergedDirectUser = enforceAvatarIdentity({
                    ...(existingDirectUser || { id: uid, name: normalizedUpdates.name || 'User', email: normalizedUpdates.email || '' }),
                    ...normalizedUpdates,
                    id: uid
                } as User);
                const directUserRow = await ensureSupabaseUserRecord(mergedDirectUser);
                await syncSupabaseUserProfile(directUserRow.id, mergedDirectUser);
                if (supabaseMirror.enabled) {
                    await supabaseMirror.upsert('users', uid, mergedDirectUser);
                }
                return mergedDirectUser;
            } catch (error) {
                lastBackendError = lastBackendError || error;
                console.warn('Direct Supabase user update failed:', error);
            }
        }

        if (shouldUseLocalMockFallback()) {
            if (lastBackendError && !shouldUseFirestoreFallback()) {
                throw lastBackendError instanceof Error ? lastBackendError : new Error('Backend user update failed.');
            }
            await ensureLocalDb();
            const existingLocalUser = await localDb.getById<User>('users', uid);
            if (!existingLocalUser) {
                throw new Error('Unable to update profile: user not found in local data.');
            }
            const mergedLocalUser = enforceAvatarIdentity({ ...existingLocalUser, ...normalizedUpdates, id: uid });
            await localDb.upsert('users', mergedLocalUser);
            if (supabaseMirror.enabled) {
                await supabaseMirror.upsert('users', uid, mergedLocalUser);
            }
            return mergedLocalUser;
        }

        if (supabaseMirror.enabled) {
            await supabaseMirror.mergeUpdate<User>('users', uid, normalizedUpdates);
            const mirrored = await supabaseMirror.get<User>('users', uid);
            if (mirrored) return enforceAvatarIdentity(mirrored);
        }

        if (lastBackendError) {
            throw lastBackendError instanceof Error ? lastBackendError : new Error('Backend user update failed.');
        }

        throw new Error('Unable to update profile: no active data source available.');
    },
    getAllSellers: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'seller', 'sell');
    },
    getAllRenters: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'consumer', 'rent');
    },
    getAllBuyers: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'consumer', 'buy');
    },
    getAllProviders: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'provider', 'provide_service');
    },
    getAllAffiliates: async (): Promise<User[]> => {
        const users = await getAllActiveUsers();
        return filterUsersByPersonaType(users, 'affiliate', 'affiliate');
    },
    normalizeAllUserAvatars: async (): Promise<{ checked: number; updated: number }> => {
        if (isBackendConfigured() && String(import.meta.env.VITE_ENABLE_AVATAR_NORMALIZATION || '').toLowerCase() === 'true') {
            try {
                const token = await getBackendToken();
                const usersRes = await backendFetch('/api/users?select=id,name,email,avatar_url&limit=2000', {}, token);
                const profileRes = await backendFetch('/api/user_profiles?select=id,user_id,gender&limit=2000', {}, token);

                const userRows = Array.isArray(usersRes?.data) ? usersRes.data : [];
                const profileRows = Array.isArray(profileRes?.data) ? profileRes.data : [];
                const profilesByUserId = new Map<string, any>();
                profileRows.forEach((row: any) => {
                    if (row?.user_id) profilesByUserId.set(String(row.user_id), row);
                });

                let checked = 0;
                let updated = 0;

                for (const userRow of userRows) {
                    if (!userRow?.id) continue;
                    checked += 1;
                    const profileRow = profilesByUserId.get(String(userRow.id));
                    const enforced = enforceAvatarIdentity({
                        name: userRow?.name || 'User',
                        email: userRow?.email || '',
                        gender: profileRow?.gender,
                        avatar: userRow?.avatar_url
                    });

                    const currentAvatar = String(userRow?.avatar_url || '');
                    const currentGender = String(profileRow?.gender || '').toLowerCase();
                    let rowUpdated = false;

                    if (currentAvatar !== enforced.avatar) {
                        await backendFetch(`/api/users/${userRow.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ avatar_url: enforced.avatar })
                        }, token);
                        rowUpdated = true;
                    }

                    if (profileRow?.id && currentGender !== enforced.gender) {
                        await backendFetch(`/api/user_profiles/${profileRow.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ gender: enforced.gender })
                        }, token);
                        rowUpdated = true;
                    }

                    if (rowUpdated) updated += 1;
                }

                return { checked, updated };
            } catch (error) {
                console.warn('Backend avatar normalization failed:', error);
            }
        }

        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<User>('users', { limit: 2000 });
            let checked = 0;
            let updated = 0;
            for (const row of mirrored) {
                checked += 1;
                const enforced = enforceAvatarIdentity(row);
                const currentGender = String(row?.gender || '').toLowerCase();
                const needsUpdate = row.avatar !== enforced.avatar || currentGender !== enforced.gender;
                if (!needsUpdate) continue;
                await supabaseMirror.upsert('users', row.id, { ...row, avatar: enforced.avatar, gender: enforced.gender, id: row.id });
                updated += 1;
            }
            return { checked, updated };
        }

        if (shouldUseFirestoreFallback()) {
            try {
                const allSnapshot = await getDocs(query(collection(db, 'users')));
                let checked = 0;
                let updated = 0;

                for (const docSnap of allSnapshot.docs) {
                    const current = fromFirestore<User>(docSnap);
                    const enforced = enforceAvatarIdentity(current);
                    const currentGender = String(current?.gender || '').toLowerCase();
                    checked += 1;
                    if (current.avatar === enforced.avatar && currentGender === enforced.gender) continue;
                    await updateDoc(doc(db, 'users', current.id), {
                        avatar: enforced.avatar,
                        gender: enforced.gender
                    });
                    updated += 1;
                }

                return { checked, updated };
            } catch (error) {
                console.warn('Firestore avatar normalization failed:', error);
            }
        }

        if (shouldUseLocalMockFallback()) {
            await ensureLocalDb();
            const users = await localDb.list<User>('users');
            let checked = 0;
            let updated = 0;
            const nextUsers = users.map((row) => {
                checked += 1;
                const enforced = enforceAvatarIdentity(row);
                const currentGender = String(row?.gender || '').toLowerCase();
                const needsUpdate = row.avatar !== enforced.avatar || currentGender !== enforced.gender;
                if (needsUpdate) updated += 1;
                return needsUpdate ? { ...row, avatar: enforced.avatar, gender: enforced.gender } : row;
            });
            if (updated > 0) {
                await localDb.bulkUpsert('users', nextUsers);
            }
            return { checked, updated };
        }

        return { checked: 0, updated: 0 };
    },
    searchUsers: async (
        queryText: string,
        options?: { excludeUserId?: string; limit?: number }
    ): Promise<User[]> => {
        const trimmed = queryText.trim();
        if (!trimmed) return [];

        const requestedLimit = Math.min(Math.max(options?.limit || 12, 1), 30);
        const normalizedQuery = trimmed.toLowerCase();

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const byNameParams = new URLSearchParams();
                byNameParams.set('ilike.name', `%${trimmed}%`);
                byNameParams.set('select', 'id,firebase_uid,email,name,avatar_url,phone,status,created_at');
                byNameParams.set('limit', String(Math.max(50, requestedLimit * 3)));
                const byNameRes = await backendFetch(`/api/users?${byNameParams.toString()}`, {}, token);

                const byEmailParams = new URLSearchParams();
                byEmailParams.set('ilike.email', `%${trimmed}%`);
                byEmailParams.set('select', 'id,firebase_uid,email,name,avatar_url,phone,status,created_at');
                byEmailParams.set('limit', String(Math.max(50, requestedLimit * 3)));
                const byEmailRes = await backendFetch(`/api/users?${byEmailParams.toString()}`, {}, token);

                const allRows = [
                    ...(Array.isArray(byNameRes?.data) ? byNameRes.data : []),
                    ...(Array.isArray(byEmailRes?.data) ? byEmailRes.data : [])
                ];

                const uniqueByFirebaseUid = new Map<string, User>();
                allRows.forEach((row: any) => {
                    const mapped = mapBackendUserRow(row);
                    if (!mapped.id) return;
                    if ((mapped.status || 'active') !== 'active') return;
                    uniqueByFirebaseUid.set(mapped.id, mapped);
                });

                const ranked = Array.from(uniqueByFirebaseUid.values())
                    .filter((candidate) => candidate.id !== options?.excludeUserId)
                    .map((candidate) => {
                        const haystackName = String(candidate.name || '').toLowerCase();
                        const haystackEmail = String(candidate.email || '').toLowerCase();
                        let score = 0;
                        if (haystackName === normalizedQuery || haystackEmail === normalizedQuery) score += 10;
                        if (haystackName.startsWith(normalizedQuery) || haystackEmail.startsWith(normalizedQuery)) score += 6;
                        if (haystackName.includes(normalizedQuery) || haystackEmail.includes(normalizedQuery)) score += 3;
                        return { candidate, score };
                    })
                    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
                    .slice(0, requestedLimit)
                    .map((entry) => entry.candidate);

                if (ranked.length > 0) return ranked;

                // Fallback: load active users once and apply client-side match.
                const readCachedUsers = () =>
                    activeUserSearchCache && activeUserSearchCache.expiresAt > Date.now()
                        ? activeUserSearchCache.users
                        : null;
                const cachedUsers = readCachedUsers();
                let fallbackUsers = cachedUsers || [];

                if (fallbackUsers.length === 0) {
                    const fallbackParams = new URLSearchParams();
                    fallbackParams.set('eq.status', 'active');
                    fallbackParams.set('select', 'id,firebase_uid,email,name,avatar_url,phone,status,created_at');
                    fallbackParams.set('limit', '2000');
                    const fallbackRes = await backendFetch(`/api/users?${fallbackParams.toString()}`, {}, token);
                    const fallbackRows = Array.isArray(fallbackRes?.data) ? fallbackRes.data : [];
                    fallbackUsers = fallbackRows.map(mapBackendUserRow);
                    activeUserSearchCache = {
                        users: fallbackUsers,
                        expiresAt: Date.now() + ACTIVE_USER_SEARCH_CACHE_TTL_MS
                    };
                }
                const fallbackMatches = fallbackUsers
                    .filter((candidate) => candidate.id !== options?.excludeUserId)
                    .filter((candidate) => {
                        const haystack = `${candidate.name || ''} ${candidate.email || ''}`.toLowerCase();
                        return haystack.includes(normalizedQuery);
                    })
                    .slice(0, requestedLimit);
                if (fallbackMatches.length > 0) return fallbackMatches;
            } catch (error) {
                console.warn('Backend user search failed:', error);
            }
        }

        const users = await getAllActiveUsers();
        return users
            .filter((candidate) => candidate.id !== options?.excludeUserId)
            .filter((candidate) => {
                const haystack = `${candidate.name || ''} ${candidate.email || ''}`.toLowerCase();
                return haystack.includes(normalizedQuery);
            })
            .slice(0, requestedLimit);
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
    getBadges: async (badgeIds: string[] = []): Promise<Badge[]> => {
        const normalizedBadgeIds = Array.isArray(badgeIds) ? badgeIds : [];
        return normalizedBadgeIds.map((id) => ({ id, name: id, icon: 'star', description: 'Badge' }));
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
    getPublicProfile: async (
        userId: string,
        options: { publishedOnly?: boolean } = {}
    ): Promise<{ user: User; items: Item[]; store: any } | null> => {
        const user = await userService.getUserById(userId);
        if (!user) return null;
        const publishedOnly = options.publishedOnly !== false;
        const items = await itemService.getItemsByOwner(userId, {
            visibility: publishedOnly ? 'public' : 'owner',
            statuses: publishedOnly ? ['published'] : undefined,
            allowMockFallback: false,
            strictOwnerMatch: true
        });

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
    completeAffiliateOnboarding: async (userId: string, profile: AffiliateProfile): Promise<User> => {
        const updatedUser = await userService.updateUserProfile(userId, {
            affiliateProfile: profile,
            affiliateOnboardingCompleted: true,
            isAffiliate: true
        });

        await personaService.ensureRolePersonas(updatedUser);
        await affiliateCommissionService.ensureAffiliateStarterExperience(userId, profile);

        return updatedUser;
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
            await ensureLocalDb();
            items = await localDb.list<Item>('items');
        }

        if (filters.category) {
            const filterValue = String(filters.category).toLowerCase();
            items = items.filter((item) => String(item.category || '').toLowerCase().includes(filterValue));
        }
        if ((filters as any).brandId) {
            const brandId = String((filters as any).brandId);
            items = items.filter((item) => String((item as any).brandId || '') === brandId);
        }
        if ((filters as any).brandCatalogNodeId) {
            const nodeId = String((filters as any).brandCatalogNodeId);
            items = items.filter((item) => String((item as any).brandCatalogNodeId || '') === nodeId);
        }
        if (filters.search) items = items.filter((i) => i.title.toLowerCase().includes(String(filters.search).toLowerCase()));
        if (filters.isFeatured) items = items.filter((i) => i.isFeatured);
        if (filters.minPrice) items = items.filter((i) => (i.salePrice || i.rentalPrice || i.price || 0) >= filters.minPrice);
        if (filters.maxPrice) items = items.filter((i) => (i.salePrice || i.rentalPrice || i.price || 0) <= filters.maxPrice);
        if (filters.listingType) {
            const requestedType = String(filters.listingType).toLowerCase();
            items = items.filter((item) => {
                const currentType = normalizeListingType(item.listingType);
                if (requestedType === 'sale') return currentType === 'sale' || currentType === 'both';
                if (requestedType === 'rent') return currentType === 'rent' || currentType === 'both';
                if (requestedType === 'auction') return currentType === 'auction';
                if (requestedType === 'both') return currentType === 'both';
                return true;
            });
        }
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
            await ensureLocalDb();
            const items = await localDb.list<Item>('items');
            return items.find((item) => item.id === id);
        }

        return undefined;
    },
    getItemsByOwner: async (ownerId: string, options: GetItemsByOwnerOptions = {}): Promise<Item[]> => {
         const normalizedOwnerId = String(ownerId || '').trim();
         if (!normalizedOwnerId) return [];

         const token = await getBackendToken();
         const visibility = options.visibility || 'owner';
         const statuses = normalizeOwnerStatuses(options.statuses, visibility);
         const allowMockFallback = options.allowMockFallback === true;
         const strictOwnerMatch = options.strictOwnerMatch !== false;
         const ownerCandidates = new Set<string>([normalizedOwnerId]);
         let backendQuerySucceeded = false;
         let resolvedOwnerId: string | null = null;

         const hasAllowedStatus = (item: Partial<Item>) => statuses.length === 0 || statuses.includes(normalizeItemStatus(item.status));
         const ownerMatches = (item: Partial<Item> & { ownerId?: string; sellerId?: string }) => {
             const itemOwnerIds = [
                 item.owner?.id,
                 item.ownerId,
                 item.sellerId
             ]
                 .filter(Boolean)
                 .map((value) => String(value));
             return itemOwnerIds.some((id) => ownerCandidates.has(id));
         };

         if (isBackendConfigured()) {
             try {
                 resolvedOwnerId = await resolveSupabaseUserId(normalizedOwnerId);
                 if (resolvedOwnerId) ownerCandidates.add(resolvedOwnerId);

                 if (isUuidLike(normalizedOwnerId)) {
                     try {
                         const params = new URLSearchParams();
                         params.set('eq.id', normalizedOwnerId);
                         params.set('select', 'id,firebase_uid');
                         params.set('limit', '1');
                         const userRes = await backendFetch(`/api/users?${params.toString()}`, {}, token);
                         const userRow = Array.isArray(userRes?.data) ? userRes.data[0] : null;
                         const firebaseUid = userRow?.firebase_uid ? String(userRow.firebase_uid).trim() : '';
                         if (firebaseUid) ownerCandidates.add(firebaseUid);
                     } catch (error) {
                         console.warn('Owner firebase uid resolve failed:', error);
                     }
                 }

                 const sellerIds = [...ownerCandidates].filter((id) => isUuidLike(id));
                 if (sellerIds.length > 0) {
                     const params = new URLSearchParams();
                     params.set('select', BACKEND_ITEM_SELECT);
                     if (sellerIds.length === 1) {
                         params.set('eq.seller_id', sellerIds[0]);
                     } else {
                         params.set('in.seller_id', sellerIds.join(','));
                     }
                     if (statuses.length === 1) {
                         params.set('eq.status', statuses[0]);
                     } else if (statuses.length > 1) {
                         params.set('in.status', statuses.join(','));
                     }
                     params.set('order', 'created_at.desc');
                     params.set('limit', '500');

                     const res = await backendFetch(`/api/items?${params.toString()}`, {}, token);
                     backendQuerySucceeded = true;
                     const rows = Array.isArray(res?.data) ? res.data : [];

                     if (rows.length > 0) {
                         const { usersById, categoriesById, imagesByItemId } = await fetchBackendItemSupport(rows, token);
                         const mapped = rows
                             .map((row: any) => mapBackendItemRow(
                                 row,
                                 usersById.get(row?.seller_id),
                                 categoriesById.get(row?.category_id),
                                 imagesByItemId.get(row?.id) || []
                             ))
                             .filter((item) => ownerMatches(item) && hasAllowedStatus(item));
                         if (mapped.length > 0) {
                             if (supabaseMirror.enabled) {
                                 await Promise.all(mapped.map((item) => supabaseMirror.upsert('items', item.id, item).catch(() => undefined)));
                             }
                             return mapped;
                         }
                     }

                     if (strictOwnerMatch) return [];
                 }
             } catch (error) {
                 console.warn('Backend owner items fetch failed:', error);
             }
         }

         if (supabaseMirror.enabled) {
             const mirrored = await supabaseMirror.list<Item>('items', { limit: 2000 });
             const filtered = mirrored
                 .filter((item) => ownerMatches(item))
                 .filter((item) => hasAllowedStatus(item))
                 .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
             if (filtered.length > 0) return filtered;
         }

         if (shouldUseFirestoreFallback()) {
             const firestoreMatches = new Map<string, Item>();
             const queries = [
                 query(collection(db, 'items'), where('owner.id', '==', normalizedOwnerId)),
                 query(collection(db, 'items'), where('ownerId', '==', normalizedOwnerId)),
                 query(collection(db, 'items'), where('sellerId', '==', normalizedOwnerId))
             ];
             for (const q of queries) {
                 try {
                     const snapshot = await getDocs(q);
                     snapshot.docs.forEach((docSnap) => {
                         const mapped = fromFirestore<Item>(docSnap);
                         if (ownerMatches(mapped) && hasAllowedStatus(mapped)) {
                             firestoreMatches.set(mapped.id, mapped);
                         }
                     });
                 } catch (error) {
                     console.warn('Firestore owner items fetch failed:', error);
                 }
             }
             if (firestoreMatches.size > 0) {
                 const items = Array.from(firestoreMatches.values()).sort(
                     (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                 );
                 if (supabaseMirror.enabled) {
                     await Promise.all(items.map((item) => supabaseMirror.upsert('items', item.id, item).catch(() => undefined)));
                 }
                 return items;
             }
         }

         if (allowMockFallback && shouldUseLocalMockFallback()) {
             await ensureLocalDb();
             const items = await localDb.list<Item>('items');
             return items.filter((item) => ownerMatches(item) && hasAllowedStatus(item));
         }

         if (strictOwnerMatch && backendQuerySucceeded) return [];
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

        if (!isBackendConfigured() && shouldUseLocalMockFallback()) {
            await ensureLocalDb();
            const created = await localDb.upsert('items', {
                ...newItem,
                id: itemData.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            } as Item);
            return created as Item;
        }

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
                status:
                    itemData.status === 'draft' ||
                    itemData.status === 'archived' ||
                    itemData.status === 'sold'
                        ? itemData.status
                        : 'published',
                condition: itemData.condition || null,
                brand: itemData.brand || null,
                currency: 'USD',
                sale_price: itemData.salePrice ?? (itemData.listingType !== 'rent' ? itemData.price ?? null : null),
                rental_price: itemData.rentalPrice ?? (itemData.listingType !== 'sale' ? itemData.price ?? null : null),
                auction_start_price: itemData.listingType === 'auction' ? (itemData.auctionDetails?.startingBid ?? itemData.price ?? null) : null,
                auction_reserve_price: itemData.reservePrice ?? null,
                auction_end_at: itemData.listingType === 'auction' ? (itemData.auctionDetails?.endTime || null) : null,
                stock: itemData.stock ?? 0,
                is_featured: Boolean(itemData.isFeatured),
                is_verified: Boolean(itemData.isVerified),
                metadata: {
                    ...buildItemMetadataSnapshot(itemData, {
                        ownerName: user.name,
                        ownerAvatar: user.avatar
                    }),
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

        if (!isBackendConfigured() && shouldUseLocalMockFallback()) {
            await ensureLocalDb();
            const current = await localDb.getById<Item>('items', itemId);
            if (current) {
                await localDb.upsert('items', { ...current, ...updates, id: itemId });
            }
            return;
        }

        if (isBackendConfigured()) {
            const payload: any = {};
            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.listingType !== undefined) payload.listing_type = normalizeListingType(updates.listingType);
            if (updates.status !== undefined) {
                payload.status =
                    updates.status === 'draft' ||
                    updates.status === 'archived' ||
                    updates.status === 'sold'
                        ? updates.status
                        : 'published';
            }
            if (updates.condition !== undefined) payload.condition = updates.condition;
            if (updates.brand !== undefined) payload.brand = updates.brand;
            if (updates.salePrice !== undefined) payload.sale_price = updates.salePrice;
            if (updates.rentalPrice !== undefined) payload.rental_price = updates.rentalPrice;
            if (updates.reservePrice !== undefined) payload.auction_reserve_price = updates.reservePrice;
            if (updates.auctionDetails?.startingBid !== undefined) payload.auction_start_price = updates.auctionDetails.startingBid;
            if (updates.auctionDetails?.endTime !== undefined) payload.auction_end_at = updates.auctionDetails.endTime || null;
            if (updates.stock !== undefined) payload.stock = updates.stock;
            if (updates.isFeatured !== undefined) payload.is_featured = Boolean(updates.isFeatured);
            if (updates.isVerified !== undefined) payload.is_verified = Boolean(updates.isVerified);
            if (updates.ownerPersonaId !== undefined) payload.owner_persona_id = updates.ownerPersonaId || null;

            const metadataPatch: any = buildItemMetadataSnapshot(updates, { preserveExistingReviews: true });
            const customMetadata = (updates as any).metadata;
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
    publishItem: async (itemId: string): Promise<void> => {
        await itemService.updateItem(itemId, { status: 'published' });
    },
    unpublishItem: async (itemId: string): Promise<void> => {
        await itemService.updateItem(itemId, { status: 'draft' });
    },
    archiveItem: async (itemId: string): Promise<void> => {
        await itemService.updateItem(itemId, { status: 'archived' });
    },
    restoreItemToDraft: async (itemId: string): Promise<void> => {
        await itemService.updateItem(itemId, { status: 'draft' });
    },
    restoreAndPublishItem: async (itemId: string): Promise<void> => {
        await itemService.updateItem(itemId, { status: 'published' });
    },
    deleteItem: async (itemId: string): Promise<void> => {
        const token = await getBackendToken();

        if (!isBackendConfigured() && shouldUseLocalMockFallback()) {
            await ensureLocalDb();
            await localDb.remove('items', itemId);
            return;
        }

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
        if (commerceService.enabled()) {
            const imported = await commerceService.importDropshipProduct({
                supplierProductId: supplierProduct.id,
                salePrice,
                title: supplierProduct.title,
                description: supplierProduct.description,
                category: supplierProduct.category,
                imageUrls: supplierProduct.imageUrls,
                routingMode: 'seller_approve',
                blindDropship: true,
                autoFulfill: false,
                minMarginPercent: 20
            });
            const itemId = String((imported as any)?.item?.id || '');
            if (itemId) {
                const created = await itemService.getItemById(itemId);
                if (created) return created;
            }
        }

        const newItem: Partial<Item> = {
            title: supplierProduct.title,
            description: supplierProduct.description,
            category: supplierProduct.category,
            imageUrls: supplierProduct.imageUrls,
            productType: 'dropship',
            fulfillmentType: 'dropship',
            salePrice: salePrice,
            wholesalePrice: supplierProduct.wholesalePrice,
            supplierInfo: {
                id: supplierProduct.id,
                supplierId: supplierProduct.supplierId,
                supplierProductId: supplierProduct.id,
                name: supplierProduct.supplierName,
                shippingCost: supplierProduct.shippingInfo.cost,
                processingTimeDays: supplierProduct.processingTimeDays,
                blindDropship: true
            },
            dropshipProfile: {
                supplierId: supplierProduct.supplierId,
                supplierProductId: supplierProduct.id,
                supplierSku: supplierProduct.supplierSku,
                supplierName: supplierProduct.supplierName,
                routingMode: 'seller_approve',
                blindDropship: true,
                autoFulfill: false,
                minMarginPercent: 20,
                manualSupplierLinkRequired: false,
                processingTimeDays: supplierProduct.processingTimeDays
            },
            stock: supplierProduct.stock || 999,
            listingType: 'sale',
            condition: 'new',
            status: 'published'
        };
        return itemService.addItem(newItem, user);
    },
    checkAvailability: async (itemId: string, startDate: string, endDate: string): Promise<boolean> => {
        if (isBackendConfigured() && isUuidLike(String(itemId || '').trim())) {
            try {
                const quote = await commerceService.quoteRental({
                    itemId,
                    rentalStart: startDate,
                    rentalEnd: endDate
                });
                return Boolean(quote.available);
            } catch (error) {
                if (!shouldUseFirestoreFallback()) {
                    throw error;
                }
            }
        }

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
    placeBid: async (
        itemId: string,
        amount: number,
        bidder: { id: string; name: string }
    ): Promise<Item> => {
        const bidAmount = Number(amount);
        if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
            throw new Error('Bid amount must be greater than zero.');
        }

        const normalizedBidderId = String(bidder?.id || '').trim();
        const normalizedBidderName = String(bidder?.name || '').trim() || 'Bidder';
        if (!normalizedBidderId) {
            throw new Error('Missing bidder account.');
        }

        if (isBackendConfigured() && isUuidLike(String(itemId || '').trim())) {
            try {
                const response = await commerceService.placeBid(itemId, bidAmount);
                const refreshed = await itemService.getItemById(itemId);
                if (refreshed) {
                    return {
                        ...refreshed,
                        auctionDetails: {
                            startingBid: response.auction.startingBid,
                            currentBid: response.auction.currentBid,
                            endTime: response.auction.endTime,
                            bidCount: response.auction.bidCount,
                            bids: response.auction.history
                        },
                        buyNowPrice: response.auction.buyNowPrice || refreshed.buyNowPrice,
                        reservePrice: response.auction.reservePrice || refreshed.reservePrice
                    };
                }

                const currentItem = await itemService.getItemById(itemId);
                if (currentItem) {
                    return {
                        ...currentItem,
                        auctionDetails: {
                            startingBid: response.auction.startingBid,
                            currentBid: response.auction.currentBid,
                            endTime: response.auction.endTime,
                            bidCount: response.auction.bidCount,
                            bids: response.auction.history
                        },
                        buyNowPrice: response.auction.buyNowPrice || currentItem.buyNowPrice,
                        reservePrice: response.auction.reservePrice || currentItem.reservePrice
                    };
                }
            } catch (error) {
                throw error;
            }
        }

        const currentItem = await itemService.getItemById(itemId);
        if (!currentItem) {
            throw new Error('Auction listing not found.');
        }
        if (currentItem.listingType !== 'auction' || !currentItem.auctionDetails) {
            throw new Error('This listing is not available for bidding.');
        }
        if (currentItem.status && currentItem.status !== 'published') {
            throw new Error('This auction is not active.');
        }
        const ownerCandidateIds = new Set<string>(
            [currentItem.owner?.id, (currentItem as any).ownerId, (currentItem as any).sellerId]
                .filter(Boolean)
                .map((value) => String(value).trim())
        );
        let bidderSupabaseId: string | null = null;
        if (isBackendConfigured()) {
            try {
                bidderSupabaseId = await resolveSupabaseUserId(normalizedBidderId);
            } catch {
                bidderSupabaseId = null;
            }
        }
        if (ownerCandidateIds.has(normalizedBidderId) || (bidderSupabaseId && ownerCandidateIds.has(bidderSupabaseId))) {
            throw new Error('You cannot bid on your own listing.');
        }

        const auctionEndMs = Date.parse(String(currentItem.auctionDetails.endTime || ''));
        if (Number.isFinite(auctionEndMs) && Date.now() >= auctionEndMs) {
            throw new Error('This auction has ended.');
        }

        const currentBid = Number(
            currentItem.auctionDetails.currentBid ??
            currentItem.auctionDetails.startingBid ??
            0
        );
        if (!Number.isFinite(currentBid)) {
            throw new Error('Auction bid state is invalid.');
        }
        if (bidAmount <= currentBid) {
            throw new Error(`Bid must be higher than ${formatMoney(currentBid)}.`);
        }

        const placedAt = new Date().toISOString();
        const existingBids = Array.isArray(currentItem.auctionDetails.bids)
            ? [...currentItem.auctionDetails.bids]
            : [];
        const previousHighestBid = existingBids.reduce<any | null>((top, bid) => {
            const bidValue = Number(bid?.amount ?? 0);
            if (!Number.isFinite(bidValue)) return top;
            if (!top) return bid;
            const topValue = Number(top?.amount ?? 0);
            return bidValue > topValue ? bid : top;
        }, null);
        const nextBids = [
            {
                userId: normalizedBidderId,
                userName: normalizedBidderName,
                amount: bidAmount,
                placedAt
            },
            ...existingBids
        ];

        const nextAuctionDetails = {
            ...currentItem.auctionDetails,
            currentBid: bidAmount,
            bidCount: Number(currentItem.auctionDetails.bidCount || 0) + 1,
            bids: nextBids
        };

        await itemService.updateItem(itemId, {
            auctionDetails: nextAuctionDetails
        });

        const ownerNotificationTarget = String(currentItem.owner?.id || '').trim();
        const notificationTasks: Promise<void>[] = [];
        if (
            ownerNotificationTarget &&
            ownerNotificationTarget !== normalizedBidderId &&
            (!bidderSupabaseId || ownerNotificationTarget !== bidderSupabaseId)
        ) {
            notificationTasks.push(createUserNotification(ownerNotificationTarget, {
                type: 'ORDER',
                title: 'New auction bid',
                message: `${normalizedBidderName} placed a bid of ${formatMoney(bidAmount)} on ${currentItem.title}.`,
                link: `/item/${currentItem.id}`,
                createdAt: placedAt
            }));
        }
        const previousHighestBidderId = String(previousHighestBid?.userId || '').trim();
        if (previousHighestBidderId && previousHighestBidderId !== normalizedBidderId) {
            notificationTasks.push(createUserNotification(previousHighestBidderId, {
                type: 'ORDER',
                title: 'You were outbid',
                message: `${normalizedBidderName} placed a higher bid on ${currentItem.title}.`,
                link: `/item/${currentItem.id}`,
                createdAt: placedAt
            }));
        }
        if (notificationTasks.length > 0) {
            await Promise.all(notificationTasks);
        }

        const refreshed = await itemService.getItemById(itemId);
        if (refreshed) return refreshed;
        return {
            ...currentItem,
            auctionDetails: nextAuctionDetails
        };
    },
    createOrder: async (
        userId: string,
        items: CartItem[],
        shippingInfo: CheckoutShippingInfo,
        paymentMethod: string,
        options?: CheckoutSubmissionOptions
    ): Promise<string> => {
        const isRentMode = (item: CartItem) =>
            item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent');
        const enforceCanonicalCheckout = shouldEnforceCanonicalCheckout(items);

        const tryCanonicalCheckout = async (): Promise<string | null> => {
            if (!isBackendConfigured() || !items.length) return null;
            const allUuid = items.every((line) => isUuidLike(String(line.id || '').trim()));
            if (!allUuid) return null;
            try {
                const token = await getBackendToken();
                if (!token) {
                    if (enforceCanonicalCheckout) {
                        throw new Error('Authentication is required to complete this checkout.');
                    }
                    return null;
                }
                const legacyRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;
                const res = await backendFetch(
                    '/commerce/orders/checkout',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            legacy_display_ref: legacyRef,
                            items,
                            shipping_info: {
                                name: shippingInfo?.name,
                                addressLine1: shippingInfo?.addressLine1,
                                line1: shippingInfo?.line1,
                                city: shippingInfo?.city,
                                state: shippingInfo?.state,
                                zip: shippingInfo?.zip,
                                postal_code: shippingInfo?.postal_code,
                                country: shippingInfo?.country,
                                phone: shippingInfo?.phone
                            },
                            payment_method: paymentMethod,
                            payment_details: options?.paymentDetails || null,
                            actor_persona_id: options?.actorPersonaId ?? null,
                            actor_name: options?.actorName || shippingInfo?.name,
                            coupon_code: options?.couponCode || null
                        })
                    },
                    token
                );
                const ref = String(res?.legacy_order_ref || '').trim();
                if (!res?.ok || !ref) {
                    if (enforceCanonicalCheckout) {
                        throw new Error('Canonical checkout did not return a valid order reference.');
                    }
                    return null;
                }

                const buyerName = String(options?.actorName || shippingInfo?.name || 'Customer').trim() || 'Customer';
                await Promise.all(
                    items.map(async (item) => {
                        if (!item.owner?.id || item.owner.id === userId) return;
                        const action: ItemEventAction = isRentMode(item) ? 'rent' : 'purchase';
                        const lineAmount = (() => {
                            if (isRentMode(item) && item.rentalPeriod && item.rentalRates?.daily) {
                                const start = new Date(item.rentalPeriod.startDate);
                                const end = new Date(item.rentalPeriod.endDate);
                                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                return item.rentalRates.daily * Math.max(1, days) * item.quantity;
                            }
                            return ((item.salePrice || item.price || 0) * item.quantity);
                        })();
                        await itemService.logItemEvent({
                            action,
                            ownerId: item.owner.id,
                            ownerPersonaId: item.ownerPersonaId || null,
                            itemId: item.id,
                            itemTitle: item.title,
                            listingType: item.listingType,
                            actorId: userId,
                            actorPersonaId: options?.actorPersonaId || null,
                            actorName: buyerName,
                            quantity: item.quantity,
                            metadata: item.spotlightAttribution
                                ? {
                                      spotlightContentId: item.spotlightAttribution.spotlightContentId,
                                      spotlightProductLinkId: item.spotlightAttribution.spotlightProductLinkId || null,
                                      spotlightCampaignKey: item.spotlightAttribution.campaignKey || null,
                                      spotlightAttributionExpiresAt: item.spotlightAttribution.expiresAt || null
                                  }
                                : {}
                        });
                        try {
                            await analyticsService.recordCheckout(
                                item.id,
                                userId,
                                buyerName,
                                ref,
                                lineAmount,
                                'completed'
                            );
                        } catch {
                            /* non-fatal */
                        }
                        if (item.spotlightAttribution?.spotlightContentId && isBackendConfigured()) {
                            try {
                                const t = await getBackendToken();
                                await backendFetch(
                                    '/spotlight/product-events',
                                    {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            content_id: item.spotlightAttribution.spotlightContentId,
                                            product_link_id: item.spotlightAttribution.spotlightProductLinkId || null,
                                            item_id: item.id,
                                            event_name: 'purchase',
                                            order_id: ref,
                                            amount: lineAmount,
                                            campaign_key: item.spotlightAttribution.campaignKey || null,
                                            viewer_firebase_uid: userId,
                                            metadata: {
                                                quantity: item.quantity,
                                                listingType: item.listingType,
                                                transactionMode: isRentMode(item) ? 'rent' : 'sale'
                                            }
                                        })
                                    },
                                    t
                                );
                            } catch (error) {
                                console.warn('Spotlight purchase attribution tracking failed:', error);
                            }
                        }
                    })
                );
                await affiliateCommissionService.recordOrderAttribution({
                    orderId: ref,
                    buyerUserId: userId,
                    items: items.map((item) => ({ item })),
                    couponCode: options?.couponCode || null
                }).catch((error) => {
                    console.warn('Affiliate attribution recording failed:', error);
                });
                return ref;
            } catch (error) {
                if (enforceCanonicalCheckout) {
                    throw error;
                }
                console.warn('Canonical checkout unavailable, using Firestore path:', error);
                return null;
            }
        };

        const canonicalRef = await tryCanonicalCheckout();
        if (canonicalRef) return canonicalRef;
        if (enforceCanonicalCheckout) {
            throw new Error('Live marketplace checkout is required for this order. Reconnect to the backend and try again.');
        }

        const batch = writeBatch(db);
        const orderId = `UP-${Math.floor(100000 + Math.random() * 900000)}`; // Simple ID generation
        const orderRef = doc(db, 'orders', orderId);
        const sellerOrderSummary = new Map<string, { listingCount: number; saleCount: number; rentCount: number; bookingIds: string[] }>();
        const affiliateOrderItems: Array<{ item: CartItem; bookingId?: string | null }> = [];

        // 1. Create Main Order Document
        const totalAmount = items.reduce((sum, item) => {
            const rentMode = isRentMode(item);
            let price = rentMode
                ? (item.rentalPrice || item.rentalRates?.daily || item.price || 0)
                : (item.salePrice || item.price || 0);
             if (rentMode && item.rentalPeriod && item.rentalRates?.daily) {
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
            items: items.map(i => {
                const rentMode = isRentMode(i);
                return {
                    id: i.id,
                    title: i.title,
                    quantity: i.quantity,
                    price: rentMode
                        ? (i.rentalPrice || i.rentalRates?.daily || i.price || 0)
                        : (i.salePrice || i.price || 0),
                    transactionMode: rentMode ? 'rent' : 'sale',
                    spotlightAttribution: i.spotlightAttribution || null
                };
            }),
            shippingInfo,
            paymentMethod,
            totalAmount,
            status: 'processing',
            createdAt: new Date().toISOString()
        });

        // 2. Create Bookings/Sub-orders for sellers and Decrement Stock
        items.forEach(item => {
             const rentMode = isRentMode(item);
             let totalPrice = (rentMode
                 ? (item.rentalPrice || item.rentalRates?.daily || item.price || 0)
                 : (item.salePrice || item.price || 0)) * item.quantity;
             let depositAmount = 0;

             if (rentMode && item.rentalPeriod && item.rentalRates?.daily) {
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
            if (!rentMode) {
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
                type: rentMode ? 'rent' : 'sale',
                securityDeposit: depositAmount,
                depositStatus: depositAmount > 0 ? 'held' : undefined,
                spotlightAttribution: item.spotlightAttribution || null
            });
            affiliateOrderItems.push({ item, bookingId: bookingRef.id });

            const sellerId = String(item.owner?.id || '').trim();
            if (sellerId) {
                const summary = sellerOrderSummary.get(sellerId) || {
                    listingCount: 0,
                    saleCount: 0,
                    rentCount: 0,
                    bookingIds: []
                };
                summary.listingCount += 1;
                if (rentMode) {
                    summary.rentCount += 1;
                } else {
                    summary.saleCount += 1;
                }
                summary.bookingIds.push(bookingRef.id);
                sellerOrderSummary.set(sellerId, summary);
            }

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
            const action: ItemEventAction = isRentMode(item) ? 'rent' : 'purchase';
            const lineAmount = (() => {
                if (isRentMode(item) && item.rentalPeriod && item.rentalRates?.daily) {
                    const start = new Date(item.rentalPeriod.startDate);
                    const end = new Date(item.rentalPeriod.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return item.rentalRates.daily * Math.max(1, days) * item.quantity;
                }
                return ((item.salePrice || item.price || 0) * item.quantity);
            })();
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
                quantity: item.quantity,
                metadata: item.spotlightAttribution
                    ? {
                        spotlightContentId: item.spotlightAttribution.spotlightContentId,
                        spotlightProductLinkId: item.spotlightAttribution.spotlightProductLinkId || null,
                        spotlightCampaignKey: item.spotlightAttribution.campaignKey || null,
                        spotlightAttributionExpiresAt: item.spotlightAttribution.expiresAt || null
                    }
                    : {}
            });
            if (item.spotlightAttribution?.spotlightContentId && isBackendConfigured()) {
                try {
                    const token = await getBackendToken();
                    await backendFetch('/spotlight/product-events', {
                        method: 'POST',
                        body: JSON.stringify({
                            content_id: item.spotlightAttribution.spotlightContentId,
                            product_link_id: item.spotlightAttribution.spotlightProductLinkId || null,
                            item_id: item.id,
                            event_name: 'purchase',
                            order_id: orderId,
                            amount: lineAmount,
                            campaign_key: item.spotlightAttribution.campaignKey || null,
                            viewer_firebase_uid: userId,
                            metadata: {
                                quantity: item.quantity,
                                listingType: item.listingType,
                                transactionMode: isRentMode(item) ? 'rent' : 'sale'
                            }
                        })
                    }, token);
                } catch (error) {
                    console.warn('Spotlight purchase attribution tracking failed:', error);
                }
            }
        }));
        await affiliateCommissionService.recordOrderAttribution({
            orderId,
            buyerUserId: userId,
            items: affiliateOrderItems,
            couponCode: options?.couponCode || null
        }).catch((error) => {
            console.warn('Affiliate attribution recording failed:', error);
        });

        const buyerName = String(options?.actorName || shippingInfo?.name || 'Customer').trim() || 'Customer';
        const buyerItemCount = items.length;
        await createUserNotification(userId, {
            type: 'ORDER',
            title: 'Order placed',
            message: `Order ${orderId} placed successfully for ${buyerItemCount} item${buyerItemCount === 1 ? '' : 's'}.`,
            link: '/profile/orders'
        });

        await Promise.all(
            Array.from(sellerOrderSummary.entries()).map(async ([sellerId, summary]) => {
                if (!sellerId || sellerId === userId) return;
                const firstBookingId = summary.bookingIds[0];
                const listingCount = summary.listingCount;
                const modeLabel =
                    summary.saleCount > 0 && summary.rentCount > 0
                        ? 'sale/rent order'
                        : summary.rentCount > 0
                            ? 'rental order'
                            : 'order';
                await createUserNotification(sellerId, {
                    type: 'ORDER',
                    title: 'New order received',
                    message: `${buyerName} placed ${modeLabel} ${orderId} with ${listingCount} item${listingCount === 1 ? '' : 's'}.`,
                    link: firstBookingId ? `/profile/orders/${firstBookingId}` : '/profile/sales'
                });
            })
        );
        
        return orderId;
    },
    // Deprecated single item purchase logic - kept for backward compatibility if needed
    processPurchase: async (cartItems: CartItem[], user: User, shippingInfo: any): Promise<string> => {
         return itemService.createOrder(user.id, cartItems, shippingInfo, 'card');
    },
    completeOrder: async (bookingId: string) => {
        if (isBackendConfigured()) {
            const canonicalBooking = await listerService.getBookingById(bookingId).catch(() => undefined);
            const enforceCanonicalReceipt = isCanonicalBookingRecord(canonicalBooking) || isUuidLike(String(bookingId || '').trim());
            try {
                await commerceService.confirmReceipt(bookingId);
                await affiliateCommissionService.approveCommissionsForOrderCompletion({
                    bookingId,
                    completedAt: new Date().toISOString()
                }).catch((error) => {
                    console.warn('Affiliate commission approval failed:', error);
                });
                return;
            } catch (error) {
                if (enforceCanonicalReceipt || !shouldUseFirestoreFallback()) {
                    throw error;
                }
                console.warn('Canonical receipt confirmation failed, falling back to Firestore path:', error);
            }
        }

        const batch = writeBatch(db);
        
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) throw new Error("Booking not found");
        
        const booking = fromFirestore<Booking>(bookingSnap);
        const sellerId = booking.provider.id;
        const totalPrice = booking.totalPrice;
        const completedAt = new Date().toISOString();
        
        // 1. Update Booking Status
        batch.update(bookingRef, { 
            status: 'completed',
            paymentStatus: 'released',
            completedAt
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
            date: completedAt,
            status: 'completed'
        });
        
        // 4. If there was a held deposit and it wasn't claimed, release it (Auto-release logic)
        if (booking.securityDeposit && booking.depositStatus === 'held') {
             batch.update(bookingRef, { depositStatus: 'released' });
             const buyerRef = doc(db, 'users', booking.renterId);
             batch.update(buyerRef, { heldDeposits: increment(-booking.securityDeposit) });
        }

        await batch.commit();
        await affiliateCommissionService.approveCommissionsForOrderCompletion({
            orderId: booking.orderId || null,
            bookingId,
            completedAt
        }).catch((error) => {
            console.warn('Affiliate commission approval failed:', error);
        });

        const notifications: Promise<void>[] = [];
        if (sellerId) {
            notifications.push(
                createUserNotification(sellerId, {
                    type: 'ORDER',
                    title: 'Payout released',
                    message: `Order completed for ${booking.itemTitle}. ${formatMoney(netEarnings)} added to your wallet.`,
                    link: '/profile/wallet',
                    createdAt: completedAt
                })
            );
        }
        if (booking.renterId && booking.renterId !== sellerId) {
            notifications.push(
                createUserNotification(booking.renterId, {
                    type: 'ORDER',
                    title: 'Order completed',
                    message: `Your order for ${booking.itemTitle} is completed.`,
                    link: `/profile/orders/${bookingId}`,
                    createdAt: completedAt
                })
            );
        }
        if (notifications.length > 0) {
            await Promise.all(notifications);
        }
    },
    releaseSecurityDeposit: async (bookingId: string) => {
         if (isBackendConfigured()) {
             let enforceCanonicalDeposit = isUuidLike(String(bookingId || '').trim());
             try {
                 const booking = await listerService.getBookingById(bookingId);
                 enforceCanonicalDeposit = enforceCanonicalDeposit || isCanonicalBookingRecord(booking);
                 const canonicalRentalBookingId = String(booking?.canonicalRentalBookingId || '').trim();
                 if (booking?.source === 'commerce' && canonicalRentalBookingId) {
                     await commerceService.releaseRentalDeposit(canonicalRentalBookingId);
                     return;
                 }
                 if (enforceCanonicalDeposit) {
                     throw new Error('Canonical rental booking is required for deposit release.');
                 }
             } catch (error) {
                 if (enforceCanonicalDeposit || !shouldUseFirestoreFallback()) {
                     throw error;
                 }
                 console.warn('Canonical deposit release failed, falling back to Firestore path:', error);
             }
         }

         const batch = writeBatch(db);
         const bookingRef = doc(db, 'bookings', bookingId);
         const bookingSnap = await getDoc(bookingRef);
         
         if (!bookingSnap.exists()) throw new Error("Booking not found");
         const booking = fromFirestore<Booking>(bookingSnap);
         
         if (booking.depositStatus !== 'held') throw new Error("No deposit to release.");
         
         batch.update(bookingRef, { depositStatus: 'released' });
         
         const buyerRef = doc(db, 'users', booking.renterId);
         batch.update(buyerRef, { heldDeposits: increment(-(booking.securityDeposit || 0)) });

         await batch.commit();

         const releaseAt = new Date().toISOString();
         const releaseAmount = booking.securityDeposit || 0;
         const notifications: Promise<void>[] = [];
         if (booking.renterId) {
             notifications.push(
                 createUserNotification(booking.renterId, {
                     type: 'ORDER',
                     title: 'Deposit released',
                     message: `Your security deposit of ${formatMoney(releaseAmount)} for ${booking.itemTitle} has been released.`,
                     link: `/profile/orders/${bookingId}`,
                     createdAt: releaseAt
                 })
             );
         }
         if (booking.provider?.id && booking.provider.id !== booking.renterId) {
             notifications.push(
                 createUserNotification(booking.provider.id, {
                     type: 'INFO',
                     title: 'Deposit released',
                     message: `Security deposit for ${booking.itemTitle} was released back to the buyer.`,
                     link: `/profile/orders/${bookingId}`,
                     createdAt: releaseAt
                 })
             );
         }
         if (notifications.length > 0) {
             await Promise.all(notifications);
         }
    },
    claimSecurityDeposit: async (bookingId: string, amount: number, reason: string, proofImage: string) => {
         if (isBackendConfigured()) {
             let enforceCanonicalDeposit = isUuidLike(String(bookingId || '').trim());
             try {
                 const booking = await listerService.getBookingById(bookingId);
                 enforceCanonicalDeposit = enforceCanonicalDeposit || isCanonicalBookingRecord(booking);
                 const canonicalRentalBookingId = String(booking?.canonicalRentalBookingId || '').trim();
                 if (booking?.source === 'commerce' && canonicalRentalBookingId) {
                     await commerceService.claimRentalDeposit(canonicalRentalBookingId, {
                         amount,
                         reason,
                         evidenceUrl: proofImage
                     });
                     return;
                 }
                 if (enforceCanonicalDeposit) {
                     throw new Error('Canonical rental booking is required for deposit claims.');
                 }
             } catch (error) {
                 if (enforceCanonicalDeposit || !shouldUseFirestoreFallback()) {
                     throw error;
                 }
                 console.warn('Canonical deposit claim failed, falling back to Firestore path:', error);
             }
         }

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
        
         await batch.commit();

         const claimedAt = new Date().toISOString();
         const remainder = Math.max(0, maxClaim - amount);
         const notifications: Promise<void>[] = [];

         if (booking.renterId) {
             notifications.push(
                 createUserNotification(booking.renterId, {
                     type: 'ORDER',
                     title: 'Deposit claim submitted',
                     message:
                         remainder > 0
                             ? `A deposit claim of ${formatMoney(amount)} was made for ${booking.itemTitle}. Remaining hold ${formatMoney(remainder)} will be released.`
                             : `A deposit claim of ${formatMoney(amount)} was made for ${booking.itemTitle}.`,
                     link: `/profile/orders/${bookingId}`,
                     createdAt: claimedAt
                 })
             );
         }

         if (booking.provider?.id) {
             notifications.push(
                 createUserNotification(booking.provider.id, {
                     type: 'ORDER',
                     title: 'Deposit claim paid',
                     message: `${formatMoney(amount)} from the security deposit for ${booking.itemTitle} was credited to your wallet.`,
                     link: '/profile/wallet',
                     createdAt: claimedAt
                 })
             );
         }

         if (notifications.length > 0) {
             await Promise.all(notifications);
         }
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
        if (!buyerId || !sellerId) {
            throw new Error('Both participants are required to start a conversation.');
        }
        if (buyerId === sellerId) {
            throw new Error('You cannot start a conversation with yourself.');
        }

        const normalizedItemId = isUuidLike(itemId) ? itemId : null;

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const resolveConversationParticipant = async (candidateId: string): Promise<string | null> => {
                const direct = await resolveSupabaseUserId(candidateId);
                if (direct) return direct;

                const mappedUser = await userService.getUserById(candidateId).catch(() => null);
                if (mappedUser?.id) {
                    const mapped = await resolveSupabaseUserId(mappedUser.id);
                    if (mapped) return mapped;
                }

                return null;
            };

            const resolveParticipants = async () =>
                Promise.all([resolveConversationParticipant(buyerId), resolveConversationParticipant(sellerId)]);

            let [buyerSupabaseId, sellerSupabaseId] = await resolveParticipants();

            if ((!buyerSupabaseId || !sellerSupabaseId) && auth.currentUser) {
                try {
                    await authService.syncAuthenticatedUser();
                    [buyerSupabaseId, sellerSupabaseId] = await resolveParticipants();
                } catch (syncError) {
                    console.warn('Participant sync retry failed:', syncError);
                }
            }

            if (!buyerSupabaseId && isUuidLike(buyerId)) {
                buyerSupabaseId = buyerId;
            }
            if (!sellerSupabaseId && isUuidLike(sellerId)) {
                sellerSupabaseId = sellerId;
            }

            if (!buyerSupabaseId || !sellerSupabaseId) {
                throw new Error('Unable to resolve conversation participants.');
            }

            const queryForPair = (left: string, right: string) => {
                const params = new URLSearchParams();
                params.set('eq.buyer_id', left);
                params.set('eq.seller_id', right);
                params.set('select', CHAT_THREAD_SELECT);
                params.set('order', 'last_message_at.desc');
                params.set('limit', '50');
                return `/api/chat_threads?${params.toString()}`;
            };

            const [forwardRes, reverseRes] = await Promise.all([
                backendFetch(queryForPair(buyerSupabaseId, sellerSupabaseId), {}, token),
                backendFetch(queryForPair(sellerSupabaseId, buyerSupabaseId), {}, token)
            ]);

            const candidates = [
                ...(Array.isArray(forwardRes?.data) ? forwardRes.data : []),
                ...(Array.isArray(reverseRes?.data) ? reverseRes.data : [])
            ];

            const existing = candidates.find((row: any) => {
                if (normalizedItemId) return row?.item_id === normalizedItemId;
                return !row?.item_id;
            });

            if (existing?.id) return String(existing.id);

            const payload = {
                buyer_id: buyerSupabaseId,
                seller_id: sellerSupabaseId,
                item_id: normalizedItemId,
                inbox_label: null,
                last_message_at: new Date().toISOString()
            };

            const created = await backendFetch('/api/chat_threads', {
                method: 'POST',
                body: JSON.stringify(payload)
            }, token);

            const createdRows = Array.isArray(created?.data) ? created.data : [];
            if (createdRows[0]?.id) return String(createdRows[0].id);
            throw new Error('Unable to create conversation thread.');
        }

        if (shouldUseFirestoreFallback()) {
            const threadLookup = query(collection(db, 'chatThreads'), where('participants', 'array-contains', buyerId));
            const snapshot = await getDocs(threadLookup);
            const existing = snapshot.docs.find((docSnap) => {
                const row: any = docSnap.data();
                const participants: string[] = Array.isArray(row?.participants) ? row.participants : [];
                const sameParticipants = participants.includes(buyerId) && participants.includes(sellerId);
                const matchesItem = normalizedItemId ? row?.itemId === normalizedItemId : !row?.itemId;
                return sameParticipants && matchesItem;
            });

            if (existing) return existing.id;

            const createdRef = await addDoc(collection(db, 'chatThreads'), {
                itemId: normalizedItemId,
                buyerId,
                sellerId,
                inboxLabel: null,
                participants: [buyerId, sellerId],
                lastMessage: '',
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            return createdRef.id;
        }

        throw new Error('Messaging backend is unavailable.');
    },
    getChatThreadsForUser: async (userId: string): Promise<ChatThread[]> => {
        if (!userId) return [];

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                let supabaseUserId = await resolveSupabaseUserId(userId);
                if (!supabaseUserId && auth.currentUser) {
                    try {
                        await authService.syncAuthenticatedUser();
                        supabaseUserId = await resolveSupabaseUserId(userId);
                    } catch (syncError) {
                        console.warn('Chat thread sync retry failed:', syncError);
                    }
                }
                if (!supabaseUserId) return [];

                const buildThreadQuery = (field: 'buyer_id' | 'seller_id') => {
                    const params = new URLSearchParams();
                    params.set(`eq.${field}`, supabaseUserId);
                    params.set('select', CHAT_THREAD_SELECT);
                    params.set('order', 'last_message_at.desc');
                    params.set('limit', '120');
                    return `/api/chat_threads?${params.toString()}`;
                };

                const [buyerThreadsRes, sellerThreadsRes] = await Promise.all([
                    backendFetch(buildThreadQuery('buyer_id'), {}, token),
                    backendFetch(buildThreadQuery('seller_id'), {}, token)
                ]);

                const threadRowsRaw = [
                    ...(Array.isArray(buyerThreadsRes?.data) ? buyerThreadsRes.data : []),
                    ...(Array.isArray(sellerThreadsRes?.data) ? sellerThreadsRes.data : [])
                ];

                const threadRowById = new Map<string, any>();
                threadRowsRaw.forEach((row: any) => {
                    const id = String(row?.id || '');
                    if (!id) return;
                    threadRowById.set(id, row);
                });
                const threadRows = Array.from(threadRowById.values());
                if (threadRows.length === 0) return [];

                const threadIds = threadRows.map((row) => String(row.id)).filter(Boolean);
                const messageParams = new URLSearchParams();
                messageParams.set('in.thread_id', threadIds.join(','));
                messageParams.set('select', CHAT_MESSAGE_SELECT);
                messageParams.set('order', 'created_at.desc');
                messageParams.set('limit', String(Math.min(Math.max(threadIds.length * 6, 80), 600)));
                const messageRes = await backendFetch(`/api/chat_messages?${messageParams.toString()}`, {}, token);
                const messageRows = Array.isArray(messageRes?.data) ? messageRes.data : [];
                const latestMessageByThreadId = new Map<string, any>();
                messageRows.forEach((row: any) => {
                    const key = String(row?.thread_id || '');
                    if (!key || latestMessageByThreadId.has(key)) return;
                    latestMessageByThreadId.set(key, row);
                });
                const latestMessageRows = Array.from(latestMessageByThreadId.values());

                const offerIds = latestMessageRows
                    .map((row: any) => row?.offer_id ? String(row.offer_id) : '')
                    .filter(Boolean);

                const allSupabaseUserIds = [
                    ...threadRows.flatMap((row: any) => [String(row?.buyer_id || ''), String(row?.seller_id || '')]),
                    ...latestMessageRows.map((row: any) => String(row?.sender_id || ''))
                ].filter(Boolean);

                const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(allSupabaseUserIds, token);
                const offerMap = await fetchOffersByIds(offerIds, firebaseUidBySupabaseUserId, token);

                const lastMessageByThreadId = new Map<string, ChatMessage>();
                latestMessageRows.forEach((row: any) => {
                    const key = String(row?.thread_id || '');
                    if (!key) return;
                    lastMessageByThreadId.set(key, mapBackendMessageRowToChatMessage(row, firebaseUidBySupabaseUserId, offerMap));
                });

                const mappedThreads: ChatThread[] = threadRows.map((row: any) => {
                    const id = String(row?.id || '');
                    const lastMessage = lastMessageByThreadId.get(id);
                    return {
                        id,
                        itemId: row?.item_id ? String(row.item_id) : '',
                        buyerId: firebaseUidBySupabaseUserId.get(String(row?.buyer_id || '')) || String(row?.buyer_id || ''),
                        sellerId: firebaseUidBySupabaseUserId.get(String(row?.seller_id || '')) || String(row?.seller_id || ''),
                        buyerPersonaId: row?.buyer_persona_id || undefined,
                        sellerPersonaId: row?.seller_persona_id || undefined,
                        inboxLabel: normalizeChatInboxLabel(row?.inbox_label),
                        lastMessage: lastMessage?.type === 'offer' ? 'Sent an offer' : (lastMessage?.text || ''),
                        lastUpdated: toIsoTimestamp(row?.last_message_at || row?.created_at || lastMessage?.timestamp),
                        messages: lastMessage ? [lastMessage] : []
                    };
                });

                return mappedThreads.sort(
                    (left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime()
                );
            } catch (error) {
                console.warn('Backend chat thread fetch failed:', error);
            }
        }

        if (shouldUseFirestoreFallback()) {
            try {
                const threadQuery = query(collection(db, 'chatThreads'), where('participants', 'array-contains', userId));
                const snapshot = await getDocs(threadQuery);

                const mapped = await Promise.all(snapshot.docs.map(async (threadDoc) => {
                    const row: any = threadDoc.data();
                    const messagesQuery = query(collection(db, 'chatThreads', threadDoc.id, 'messages'), orderBy('timestamp', 'asc'));
                    const messagesSnap = await getDocs(messagesQuery);
                    const messages = messagesSnap.docs.map((messageDoc) => ({ id: messageDoc.id, ...(messageDoc.data() as any) } as ChatMessage));
                    const buyerId = String(row?.buyerId || row?.participants?.[0] || '');
                    const sellerId = String(row?.sellerId || row?.participants?.find((id: string) => id !== buyerId) || '');
                    const lastMessage = messages[messages.length - 1];

                    return {
                        id: threadDoc.id,
                        itemId: row?.itemId || '',
                        buyerId,
                        sellerId,
                        inboxLabel: normalizeChatInboxLabel(row?.inboxLabel),
                        lastMessage: row?.lastMessage || (lastMessage?.type === 'offer' ? 'Sent an offer' : (lastMessage?.text || '')),
                        lastUpdated: row?.lastUpdated || toIsoTimestamp(lastMessage?.timestamp),
                        messages
                    } as ChatThread;
                }));

                return mapped.sort((left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime());
            } catch (error) {
                console.warn('Firestore chat thread fetch failed:', error);
            }
        }

        return [];
    },
    getChatMessagesForThread: async (
        threadId: string,
        options?: { limit?: number; before?: string }
    ): Promise<ChatMessage[]> => {
        if (!threadId) return [];
        const limitCount = Math.max(40, Math.min(400, Number(options?.limit || 180)));
        const before = options?.before ? new Date(options.before).toISOString() : '';

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                const messageParams = new URLSearchParams();
                messageParams.set('eq.thread_id', threadId);
                messageParams.set('select', CHAT_MESSAGE_SELECT);
                messageParams.set('order', 'created_at.desc');
                messageParams.set('limit', String(limitCount));
                if (before) {
                    messageParams.set('lt.created_at', before);
                }
                const messageRes = await backendFetch(`/api/chat_messages?${messageParams.toString()}`, {}, token);
                const messageRows = Array.isArray(messageRes?.data) ? messageRes.data : [];
                if (messageRows.length === 0) return [];

                const offerIds = messageRows
                    .map((row: any) => row?.offer_id ? String(row.offer_id) : '')
                    .filter(Boolean);
                const allSupabaseUserIds = [
                    ...messageRows.map((row: any) => String(row?.sender_id || ''))
                ].filter(Boolean);

                const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(allSupabaseUserIds, token);
                const offerMap = await fetchOffersByIds(offerIds, firebaseUidBySupabaseUserId, token);
                return messageRows
                    .map((row: any) => mapBackendMessageRowToChatMessage(row, firebaseUidBySupabaseUserId, offerMap))
                    .reverse()
                    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
            } catch (error) {
                console.warn('Backend message fetch failed:', error);
            }
        }

        if (shouldUseFirestoreFallback()) {
            const constraints = [];
            if (before) {
                constraints.push(where('timestamp', '<', before));
            }
            constraints.push(orderBy('timestamp', 'desc'));
            constraints.push(limit(limitCount));
            const messagesQuery = query(collection(db, 'chatThreads', threadId, 'messages'), ...constraints as any);
            const messagesSnap = await getDocs(messagesQuery);
            return messagesSnap.docs
                .map((messageDoc) => ({ id: messageDoc.id, ...(messageDoc.data() as any) } as ChatMessage))
                .reverse();
        }

        return [];
    },
    sendMessageToThread: async (
        threadId: string,
        senderId: string,
        text: string,
        imageUrl?: string,
        options?: { replyToMessageId?: string }
    ) => {
        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const senderSupabaseId = await resolveSupabaseUserId(senderId);
            if (!senderSupabaseId) {
                throw new Error('Unable to resolve sender identity for message.');
            }

            const threadRes = await backendFetch(`/api/chat_threads/${threadId}`, {}, token);
            const threadRow = threadRes?.data;
            if (!threadRow) throw new Error('Conversation not found.');

            const participants = [String(threadRow?.buyer_id || ''), String(threadRow?.seller_id || '')];
            if (!participants.includes(senderSupabaseId)) {
                throw new Error('You are not a participant in this conversation.');
            }

            const now = new Date().toISOString();
            await backendFetch('/api/chat_messages', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: threadId,
                    sender_id: senderSupabaseId,
                    message_type: imageUrl ? 'image' : 'text',
                    body: text?.trim() || null,
                    image_url: imageUrl || null,
                    reply_to_message_id: options?.replyToMessageId || null,
                    created_at: now
                })
            }, token);

            await backendFetch(`/api/chat_threads/${threadId}`, {
                method: 'PATCH',
                body: JSON.stringify({ last_message_at: now })
            }, token);

            const recipientSupabaseId = participants.find((participantId) => participantId && participantId !== senderSupabaseId);
            if (recipientSupabaseId) {
                const trimmedText = text?.trim() || '';
                const preview = isEncryptedMessagePayload(trimmedText)
                    ? 'Encrypted message'
                    : (trimmedText || (imageUrl ? 'Sent an image' : 'New message'));
                await backendFetch('/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: recipientSupabaseId,
                        type: 'message',
                        title: 'New message',
                        body: preview.slice(0, 280),
                        link: `/profile/messages/${threadId}`
                    })
                }, token);
                await backendFetch('/push/notify-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: threadId,
                        recipient_supabase_id: recipientSupabaseId,
                        preview: preview.slice(0, 280),
                        link: `/profile/messages/${threadId}`
                    })
                }, token).catch(() => null);
            }
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
                senderId,
                text: text?.trim() || '',
                imageUrl: imageUrl || null,
                type: imageUrl ? 'image' : 'text',
                replyToMessageId: options?.replyToMessageId || null,
                reactions: {},
                editedAt: null,
                deletedAt: null,
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, 'chatThreads', threadId), {
                lastMessage: text?.trim() || (imageUrl ? 'Sent an image' : 'New message'),
                lastUpdated: new Date().toISOString()
            });
            return;
        }

        throw new Error('Messaging backend is unavailable.');
    },
    sendOfferToThread: async (threadId: string, senderId: string, offer: Omit<CustomOffer, 'id' | 'status'>) => {
        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const senderSupabaseId = await resolveSupabaseUserId(senderId);
            if (!senderSupabaseId) {
                throw new Error('Unable to resolve sender identity for offer.');
            }

            const threadRes = await backendFetch(`/api/chat_threads/${threadId}`, {}, token);
            const threadRow = threadRes?.data;
            if (!threadRow) throw new Error('Conversation not found.');

            const participants = [String(threadRow?.buyer_id || ''), String(threadRow?.seller_id || '')];
            if (!participants.includes(senderSupabaseId)) {
                throw new Error('You are not a participant in this conversation.');
            }

            const now = new Date().toISOString();
            const offerInsert = await backendFetch('/api/custom_offers', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: threadId,
                    sender_id: senderSupabaseId,
                    title: offer.title,
                    description: offer.description || null,
                    price: Number(offer.price || 0),
                    duration_days: Number(offer.duration || 1),
                    status: 'pending',
                    created_at: now
                })
            }, token);

            const offerRow = Array.isArray(offerInsert?.data) ? offerInsert.data[0] : null;
            const offerId = offerRow?.id ? String(offerRow.id) : null;

            await backendFetch('/api/chat_messages', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: threadId,
                    sender_id: senderSupabaseId,
                    message_type: 'offer',
                    body: offer.title || 'Sent an offer',
                    offer_id: offerId,
                    created_at: now
                })
            }, token);

            await backendFetch(`/api/chat_threads/${threadId}`, {
                method: 'PATCH',
                body: JSON.stringify({ last_message_at: now })
            }, token);

            const recipientSupabaseId = participants.find((participantId) => participantId && participantId !== senderSupabaseId);
            if (recipientSupabaseId) {
                await backendFetch('/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: recipientSupabaseId,
                        type: 'message',
                        title: 'New custom offer',
                        body: offer.title || 'You received a new offer.',
                        link: `/profile/messages/${threadId}`
                    })
                }, token);
                await backendFetch('/push/notify-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: threadId,
                        recipient_supabase_id: recipientSupabaseId,
                        preview: (offer.title || 'You received a new offer.').slice(0, 280),
                        link: `/profile/messages/${threadId}`
                    })
                }, token).catch(() => null);
            }
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
                senderId,
                type: 'offer',
                offer: {
                    ...offer,
                    id: `offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    status: 'pending'
                },
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, 'chatThreads', threadId), {
                lastMessage: offer.title || 'Sent an offer',
                lastUpdated: new Date().toISOString()
            });
            return;
        }

        throw new Error('Messaging backend is unavailable.');
    },
    sendSystemMessageToThread: async (threadId: string, senderId: string, text: string) => {
        if (!text.trim()) return;
        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const senderSupabaseId = await resolveSupabaseUserId(senderId);
            if (!senderSupabaseId) {
                throw new Error('Unable to resolve sender identity for system message.');
            }
            const now = new Date().toISOString();
            await backendFetch('/api/chat_messages', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: threadId,
                    sender_id: senderSupabaseId,
                    message_type: 'system',
                    body: text.slice(0, 400),
                    created_at: now
                })
            }, token);
            await backendFetch(`/api/chat_threads/${threadId}`, {
                method: 'PATCH',
                body: JSON.stringify({ last_message_at: now })
            }, token);

            const threadRes = await backendFetch(`/api/chat_threads/${threadId}`, {}, token);
            const threadRow = threadRes?.data;
            const participants = [String(threadRow?.buyer_id || ''), String(threadRow?.seller_id || '')];
            const recipientSupabaseId = participants.find((participantId) => participantId && participantId !== senderSupabaseId);
            if (recipientSupabaseId) {
                const preview = text.slice(0, 280) || 'New system message';
                await backendFetch('/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: recipientSupabaseId,
                        type: 'message',
                        title: 'New message',
                        body: preview,
                        link: `/profile/messages/${threadId}`
                    })
                }, token);
                await backendFetch('/push/notify-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: threadId,
                        recipient_supabase_id: recipientSupabaseId,
                        preview,
                        link: `/profile/messages/${threadId}`
                    })
                }, token).catch(() => null);
            }
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
                senderId,
                text: text.slice(0, 400),
                type: 'text',
                timestamp: new Date().toISOString()
            });
            return;
        }
    },
    sendVoiceNoteToThread: async (
        threadId: string,
        senderId: string,
        voiceBlob: Blob,
        durationMs: number,
        options?: { replyToMessageId?: string }
    ) => {
        if (!voiceBlob || voiceBlob.size <= 0) {
            throw new Error('Voice note is empty.');
        }

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const senderSupabaseId = await resolveSupabaseUserId(senderId);
            if (!senderSupabaseId) {
                throw new Error('Unable to resolve sender identity for voice note.');
            }

            const mimeType = normalizeMimeType(voiceBlob.type) || 'audio/webm';
            const extension = voiceFileExtensionForMime(mimeType);
            const base64Data = await blobToBase64(voiceBlob);
            const uploadResponse = await backendFetch('/uploads', {
                method: 'POST',
                body: JSON.stringify({
                    fileName: `voice-${Date.now()}.${extension}`,
                    mimeType,
                    base64Data,
                    owner_firebase_uid: senderId,
                    asset_type: 'voice-note',
                    resource_id: threadId,
                    is_public: true
                })
            }, token);

            const uploaded = uploadResponse?.data;
            const rawAudioUrl = uploaded?.public_url || uploaded?.storage_path;
            const audioUrl = typeof rawAudioUrl === 'string' && rawAudioUrl.startsWith('/')
                ? `${getBackendBaseUrl()}${rawAudioUrl}`
                : rawAudioUrl;
            if (!audioUrl) {
                throw new Error('Voice upload failed.');
            }

            const now = new Date().toISOString();
            await backendFetch('/api/chat_messages', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: threadId,
                    sender_id: senderSupabaseId,
                    message_type: 'text',
                    body: encodeVoiceNotePayload({
                        url: audioUrl,
                        durationMs: Math.max(0, Math.round(durationMs || 0)),
                        mimeType
                    }),
                    reply_to_message_id: options?.replyToMessageId || null,
                    created_at: now
                })
            }, token);

            await backendFetch(`/api/chat_threads/${threadId}`, {
                method: 'PATCH',
                body: JSON.stringify({ last_message_at: now })
            }, token);
            return;
        }

        if (shouldUseFirestoreFallback()) {
            const audioDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Failed to encode voice note'));
                reader.readAsDataURL(voiceBlob);
            });
            await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
                senderId,
                type: 'voice',
                audioUrl: audioDataUrl,
                audioDurationMs: Math.max(0, Math.round(durationMs || 0)),
                replyToMessageId: options?.replyToMessageId || null,
                reactions: {},
                editedAt: null,
                deletedAt: null,
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, 'chatThreads', threadId), {
                lastMessage: 'Voice note',
                lastUpdated: new Date().toISOString()
            });
            return;
        }

        throw new Error('Voice messaging is unavailable.');
    },
    editThreadMessage: async (
        threadId: string,
        messageId: string,
        nextText: string
    ) => {
        const trimmedText = String(nextText || '').trim();
        if (!threadId || !messageId || !trimmedText) {
            throw new Error('Message text is required.');
        }

        const editedAt = new Date().toISOString();

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            await backendFetch(`/api/chat_messages/${messageId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    body: trimmedText,
                    edited_at: editedAt,
                    deleted_at: null
                })
            }, token);
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await updateDoc(doc(db, 'chatThreads', threadId, 'messages', messageId), {
                text: trimmedText,
                editedAt,
                deletedAt: null
            });
            return;
        }

        throw new Error('Message editing is unavailable.');
    },
    deleteThreadMessage: async (
        threadId: string,
        messageId: string
    ) => {
        if (!threadId || !messageId) {
            throw new Error('Message not found.');
        }

        const deletedAt = new Date().toISOString();

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            await backendFetch(`/api/chat_messages/${messageId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    body: null,
                    image_url: null,
                    offer_id: null,
                    deleted_at: deletedAt,
                    edited_at: null,
                    reactions: {}
                })
            }, token);
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await updateDoc(doc(db, 'chatThreads', threadId, 'messages', messageId), {
                text: '',
                imageUrl: null,
                audioUrl: null,
                offer: null,
                reactions: {},
                deletedAt,
                editedAt: null
            });
            return;
        }

        throw new Error('Message deletion is unavailable.');
    },
    setThreadMessageReactions: async (
        threadId: string,
        messageId: string,
        reactions: Record<string, string[]>
    ) => {
        if (!threadId || !messageId) {
            throw new Error('Message not found.');
        }

        const normalizedReactions = Object.entries(reactions || {}).reduce<Record<string, string[]>>((accumulator, [emoji, userIds]) => {
            const normalizedIds = Array.isArray(userIds)
                ? userIds.map((entry) => String(entry || '').trim()).filter(Boolean)
                : [];
            if (emoji && normalizedIds.length > 0) accumulator[emoji] = normalizedIds;
            return accumulator;
        }, {});

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const firebaseIds = [...new Set(Object.values(normalizedReactions).flat())];
            const supabaseIdByFirebaseId = new Map<string, string>();
            await Promise.all(firebaseIds.map(async (firebaseId) => {
                const resolved = await resolveSupabaseUserId(firebaseId);
                if (resolved) supabaseIdByFirebaseId.set(firebaseId, resolved);
            }));

            const backendReactions = Object.entries(normalizedReactions).reduce<Record<string, string[]>>((accumulator, [emoji, userIds]) => {
                const mappedIds = userIds
                    .map((firebaseId) => supabaseIdByFirebaseId.get(firebaseId) || '')
                    .filter(Boolean);
                if (mappedIds.length > 0) accumulator[emoji] = mappedIds;
                return accumulator;
            }, {});

            await backendFetch(`/api/chat_messages/${messageId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    reactions: backendReactions
                })
            }, token);
            return;
        }

        if (shouldUseFirestoreFallback()) {
            await updateDoc(doc(db, 'chatThreads', threadId, 'messages', messageId), {
                reactions: normalizedReactions
            });
            return;
        }

        throw new Error('Message reactions are unavailable.');
    },
    setThreadTypingState: async (threadId: string, userId: string, isTyping: boolean) => {
        if (!threadId || !userId || !isBackendConfigured()) return;
        const token = await getBackendToken();
        const expiresAt = new Date(Date.now() + 8000).toISOString();
        await backendFetch('/api/mirror_documents?upsert=1&onConflict=collection,doc_id', {
            method: 'POST',
            body: JSON.stringify({
                collection: encodeTypingCollection(threadId),
                doc_id: userId,
                data: {
                    userId,
                    isTyping: Boolean(isTyping),
                    expiresAt,
                    updatedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            })
        }, token);
    },
    getThreadTypingUsers: async (threadId: string, excludeUserId?: string): Promise<string[]> => {
        if (!threadId || !isBackendConfigured()) return [];
        try {
            const token = await getBackendToken();
            const params = new URLSearchParams();
            params.set('eq.collection', encodeTypingCollection(threadId));
            params.set('select', 'doc_id,data,updated_at');
            params.set('order', 'updated_at.desc');
            params.set('limit', '20');
            const response = await backendFetch(`/api/mirror_documents?${params.toString()}`, {}, token);
            const rows = Array.isArray(response?.data) ? response.data : [];
            const now = Date.now();
            return rows
                .map((row: any) => row?.data || {})
                .filter((data: any) => {
                    if (!data?.isTyping) return false;
                    const expiry = Date.parse(String(data?.expiresAt || ''));
                    return Number.isFinite(expiry) && expiry > now;
                })
                .map((data: any) => String(data?.userId || ''))
                .filter((id: string) => Boolean(id) && id !== excludeUserId);
        } catch {
            return [];
        }
    },
    markThreadRead: async (threadId: string, userId: string, lastReadAt?: string) => {
        if (!threadId || !userId || !isBackendConfigured()) return;
        const token = await getBackendToken();
        const timestamp = toIsoTimestamp(lastReadAt || new Date().toISOString());
        await backendFetch('/api/mirror_documents?upsert=1&onConflict=collection,doc_id', {
            method: 'POST',
            body: JSON.stringify({
                collection: encodeReadCollection(threadId),
                doc_id: userId,
                data: {
                    userId,
                    lastReadAt: timestamp
                },
                updated_at: new Date().toISOString()
            })
        }, token);
    },
    getThreadReadReceipts: async (threadId: string): Promise<Record<string, string>> => {
        if (!threadId || !isBackendConfigured()) return {};
        try {
            const token = await getBackendToken();
            const params = new URLSearchParams();
            params.set('eq.collection', encodeReadCollection(threadId));
            params.set('select', 'doc_id,data,updated_at');
            params.set('order', 'updated_at.desc');
            params.set('limit', '20');
            const response = await backendFetch(`/api/mirror_documents?${params.toString()}`, {}, token);
            const rows = Array.isArray(response?.data) ? response.data : [];
            return rows.reduce((acc, row: any) => {
                const data = row?.data || {};
                const userId = String(data?.userId || row?.doc_id || '');
                const lastReadAt = String(data?.lastReadAt || '');
                if (!userId || !lastReadAt) return acc;
                acc[userId] = lastReadAt;
                return acc;
            }, {} as Record<string, string>);
        } catch {
            return {};
        }
    },
    getReadReceiptsForThreads: async (threadIds: string[]): Promise<Record<string, Record<string, string>>> => {
        const normalizedThreadIds = Array.from(new Set((threadIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
        if (normalizedThreadIds.length === 0 || !isBackendConfigured()) return {};
        try {
            const token = await getBackendToken();
            const encodedCollections = normalizedThreadIds.map((threadId) => encodeReadCollection(threadId));
            const params = new URLSearchParams();
            params.set('in.collection', encodedCollections.join(','));
            params.set('select', 'collection,doc_id,data,updated_at');
            params.set('order', 'updated_at.desc');
            params.set('limit', String(Math.min(Math.max(encodedCollections.length * 6, 80), 900)));
            const response = await backendFetch(`/api/mirror_documents?${params.toString()}`, {}, token);
            const rows = Array.isArray(response?.data) ? response.data : [];
            return rows.reduce((acc, row: any) => {
                const collectionName = String(row?.collection || '');
                const threadId = collectionName.startsWith(CHAT_READ_COLLECTION_PREFIX)
                    ? collectionName.slice(CHAT_READ_COLLECTION_PREFIX.length)
                    : '';
                if (!threadId) return acc;
                const data = row?.data || {};
                const userId = String(data?.userId || row?.doc_id || '');
                const lastReadAt = String(data?.lastReadAt || '');
                if (!userId || !lastReadAt) return acc;
                if (!acc[threadId]) acc[threadId] = {};
                acc[threadId][userId] = lastReadAt;
                return acc;
            }, {} as Record<string, Record<string, string>>);
        } catch {
            return {};
        }
    },
    setThreadInboxLabel: async (threadId: string, label: 'primary' | 'general' | null) => {
        if (!threadId) return null;
        const normalizedLabel = normalizeChatInboxLabel(label);

        if (isBackendConfigured()) {
            const token = await getBackendToken();
            const response = await backendFetch(`/api/chat_threads/${threadId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    inbox_label: normalizedLabel
                })
            }, token);
            return normalizeChatInboxLabel(response?.data?.inbox_label);
        }

        if (shouldUseFirestoreFallback()) {
            await updateDoc(doc(db, 'chatThreads', threadId), {
                inboxLabel: normalizedLabel
            });
            return normalizedLabel;
        }

        return normalizedLabel;
    },
    startThreadCall: async (
        threadId: string,
        mode: ChatCallMode = 'voice'
    ): Promise<ChatCallSession | null> => {
        if (!threadId || !isBackendConfigured()) return null;
        const token = await getBackendToken();
        const response = await backendFetch('/chat/calls/start', {
            method: 'POST',
            body: JSON.stringify({
                threadId,
                mode: mode === 'video' ? 'video' : 'voice'
            })
        }, token);
        const row = response?.data;
        if (!row) return null;
        const ids = [row?.initiator_user_id, row?.receiver_user_id, row?.accepted_by_user_id]
            .map((entry: any) => String(entry || ''))
            .filter(Boolean);
        const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(ids, token);
        return mapBackendCallSession(row, firebaseUidBySupabaseUserId);
    },
    respondToThreadCall: async (
        callId: string,
        action: 'accept' | 'decline' | 'silent'
    ): Promise<ChatCallSession | null> => {
        if (!callId || !isBackendConfigured()) return null;
        const token = await getBackendToken();
        const response = await backendFetch(`/chat/calls/${callId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ action })
        }, token);
        const row = response?.data;
        if (!row) return null;
        const ids = [row?.initiator_user_id, row?.receiver_user_id, row?.accepted_by_user_id]
            .map((entry: any) => String(entry || ''))
            .filter(Boolean);
        const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(ids, token);
        return mapBackendCallSession(row, firebaseUidBySupabaseUserId);
    },
    endThreadCall: async (callId: string, reason?: string): Promise<ChatCallSession | null> => {
        if (!callId || !isBackendConfigured()) return null;
        const token = await getBackendToken();
        const response = await backendFetch(`/chat/calls/${callId}/end`, {
            method: 'POST',
            body: JSON.stringify({
                reason: String(reason || '').trim() || undefined
            })
        }, token);
        const row = response?.data;
        if (!row) return null;
        const ids = [row?.initiator_user_id, row?.receiver_user_id, row?.accepted_by_user_id]
            .map((entry: any) => String(entry || ''))
            .filter(Boolean);
        const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(ids, token);
        return mapBackendCallSession(row, firebaseUidBySupabaseUserId);
    },
    getActiveThreadCall: async (threadId: string): Promise<ChatCallSession | null> => {
        if (!threadId || !isBackendConfigured()) return null;
        const token = await getBackendToken();
        const params = new URLSearchParams();
        params.set('threadId', threadId);
        const response = await backendFetch(`/chat/calls/active?${params.toString()}`, {}, token);
        const row = response?.data;
        if (!row) return null;
        const ids = [row?.initiator_user_id, row?.receiver_user_id, row?.accepted_by_user_id]
            .map((entry: any) => String(entry || ''))
            .filter(Boolean);
        const { firebaseUidBySupabaseUserId } = await fetchUsersBySupabaseIds(ids, token);
        return mapBackendCallSession(row, firebaseUidBySupabaseUserId);
    },
    updatePresenceStatus: async (payload: {
        isOnline?: boolean;
        lastSeenAt?: string;
        visibility?: boolean;
    }): Promise<ChatPresenceState | null> => {
        if (!isBackendConfigured()) return null;
        const token = await getBackendToken();
        const response = await backendFetch('/chat/presence', {
            method: 'PUT',
            body: JSON.stringify(payload || {})
        }, token);
        const row = response?.data;
        if (!row) return null;
        return {
            userId: String(row?.firebaseUid || row?.userId || row?.user_id || ''),
            isOnline: Boolean(row?.isOnline),
            lastSeenAt: row?.lastSeenAt ? String(row.lastSeenAt) : undefined,
            visibility: row?.visibility !== false,
            updatedAt: toIsoTimestamp(row?.updatedAt || row?.updated_at)
        };
    },
    getPresenceForUsers: async (userIds: string[]): Promise<Record<string, ChatPresenceState>> => {
        if (!isBackendConfigured()) return {};
        const uniqueInputUserIds = Array.from(new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
        if (uniqueInputUserIds.length === 0) return {};

        const supabaseIdToRequestedUserId = new Map<string, string>();
        const supabaseUserIds = (
            await Promise.all(
                uniqueInputUserIds.map(async (userId) => {
                    if (isUuidLike(userId)) {
                        supabaseIdToRequestedUserId.set(userId, userId);
                        return userId;
                    }
                    const supabaseId = await resolveSupabaseUserId(userId);
                    if (supabaseId) {
                        supabaseIdToRequestedUserId.set(supabaseId, userId);
                        return supabaseId;
                    }
                    return '';
                })
            )
        ).filter(Boolean);

        if (supabaseUserIds.length === 0) return {};
        const token = await getBackendToken();
        const params = new URLSearchParams();
        params.set('userIds', supabaseUserIds.join(','));
        const response = await backendFetch(`/chat/presence?${params.toString()}`, {}, token);
        const rows = Array.isArray(response?.data) ? response.data : [];

        return rows.reduce((acc, row: any) => {
            const supabaseId = String(row?.userId || row?.user_id || '');
            const firebaseUid = String(row?.firebaseUid || '');
            const resolvedUserId = firebaseUid || supabaseIdToRequestedUserId.get(supabaseId) || supabaseId;
            if (!resolvedUserId) return acc;
            acc[resolvedUserId] = {
                userId: resolvedUserId,
                isOnline: Boolean(row?.isOnline),
                lastSeenAt: row?.lastSeenAt ? String(row.lastSeenAt) : undefined,
                visibility: row?.visibility !== false,
                updatedAt: toIsoTimestamp(row?.updatedAt || row?.updated_at)
            };
            return acc;
        }, {} as Record<string, ChatPresenceState>);
    },
    registerPushToken: async (pushToken: string, options: { permission?: string } = {}) => {
        const tokenValue = String(pushToken || '').trim();
        if (!tokenValue || !isBackendConfigured()) return false;
        try {
            const token = await getBackendToken();
            await backendFetch('/push/token', {
                method: 'POST',
                body: JSON.stringify({
                    token: tokenValue,
                    platform: 'web',
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                    permission: String(options.permission || '')
                })
            }, token);
            return true;
        } catch (error) {
            console.warn('Unable to register push token:', error);
            return false;
        }
    },
    unregisterPushToken: async (pushToken: string) => {
        const tokenValue = String(pushToken || '').trim();
        if (!tokenValue || !isBackendConfigured()) return false;
        try {
            const token = await getBackendToken();
            await backendFetch('/push/token', {
                method: 'DELETE',
                body: JSON.stringify({
                    token: tokenValue
                })
            }, token);
            return true;
        } catch (error) {
            console.warn('Unable to unregister push token:', error);
            return false;
        }
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
         const merged: Booking[] = [];
         const seen = new Set<string>();
         let canonicalLoaded = false;

         if (isBackendConfigured()) {
             try {
                 const canonical = await commerceService.getSellerBookings();
                 canonicalLoaded = true;
                 canonical.forEach((booking) => {
                     if (!seen.has(booking.id)) {
                         seen.add(booking.id);
                         merged.push(booking);
                     }
                 });
             } catch (error) {
                 throw error;
             }
         }

         if (!shouldUseFirestoreFallback()) {
             return merged;
         }
         const q = query(collection(db, 'bookings'), where('provider.id', '==', userId));
         const snapshot = await getDocs(q);
         snapshot.docs
             .map(doc => fromFirestore<Booking>(doc))
             .filter((booking) => !(canonicalLoaded && booking.source === 'commerce'))
             .forEach((booking) => {
             if (!seen.has(booking.id)) {
                 seen.add(booking.id);
                 merged.push(booking);
             }
         });
         return merged;
    },
    getBookingById: async (bookingId: string): Promise<Booking | undefined> => {
        if (isBackendConfigured()) {
            let lastCanonicalError: unknown = null;
            const loaders = [
                () => commerceService.getOrderDetail(bookingId),
                () => commerceService.getSellerBookingDetail(bookingId)
            ];

            for (const load of loaders) {
                try {
                    const detail = await load();
                    if (detail) return mapCommerceDetailToBooking(detail);
                } catch (error) {
                    lastCanonicalError = error;
                }
            }

            if (!shouldUseFirestoreFallback() && lastCanonicalError) {
                throw lastCanonicalError;
            }
        }

        const docRef = doc(db, 'bookings', bookingId);
        const snap = await getDoc(docRef);
        return snap.exists() ? fromFirestore<Booking>(snap) : undefined;
    },
    updateBooking: async (bookingId: string, updates: Partial<Booking>) => {
        if (isBackendConfigured()) {
            let enforceCanonicalUpdate = isUuidLike(String(bookingId || '').trim());
            try {
                const booking = await listerService.getBookingById(bookingId);
                enforceCanonicalUpdate = enforceCanonicalUpdate || isCanonicalBookingRecord(booking);
                if (booking?.source === 'commerce') {
                    const nextStatus = typeof updates.status === 'string' ? updates.status : booking.status;
                    const trackingNumber =
                        typeof updates.trackingNumber === 'string'
                            ? updates.trackingNumber.trim()
                            : String(booking.trackingNumber || '').trim();

                    if (booking.canonicalRentalBookingId) {
                        if (
                            nextStatus === 'confirmed' ||
                            nextStatus === 'cancelled' ||
                            updates.pickupInstructions !== undefined ||
                            updates.pickupCode !== undefined ||
                            updates.pickupWindowStart !== undefined ||
                            updates.pickupWindowEnd !== undefined
                        ) {
                            await commerceService.confirmRental(booking.canonicalRentalBookingId, {
                                cancel: nextStatus === 'cancelled',
                                pickupInstructions: updates.pickupInstructions,
                                pickupCode: updates.pickupCode,
                                pickupWindowStart: updates.pickupWindowStart,
                                pickupWindowEnd: updates.pickupWindowEnd
                            });
                            return;
                        }

                        if (nextStatus === 'shipped' || nextStatus === 'delivered' || trackingNumber) {
                            await commerceService.handoffRental(booking.canonicalRentalBookingId, {
                                action: nextStatus === 'delivered' ? 'activate' : 'ship',
                                trackingNumber: trackingNumber || undefined
                            });
                            return;
                        }

                        if (nextStatus === 'returned' || nextStatus === 'completed') {
                            await commerceService.returnRental(booking.canonicalRentalBookingId, {
                                action: nextStatus === 'completed' ? 'complete' : 'received',
                                returnTrackingNumber: trackingNumber || undefined
                            });
                            return;
                        }
                    } else {
                        const carrier = trackingNumber.includes(':')
                            ? trackingNumber.split(':')[0].trim()
                            : '';
                        const cleanTrackingNumber = trackingNumber.includes(':')
                            ? trackingNumber.split(':').slice(1).join(':').trim()
                            : trackingNumber;

                        if (nextStatus === 'shipped' || trackingNumber) {
                            await commerceService.updateFulfillment(bookingId, {
                                action: 'ship',
                                carrier: carrier || undefined,
                                trackingNumber: cleanTrackingNumber || undefined
                            });
                            return;
                        }

                        if (nextStatus === 'delivered') {
                            await commerceService.updateFulfillment(bookingId, {
                                action: 'deliver',
                                trackingNumber: cleanTrackingNumber || undefined
                            });
                            return;
                        }

                        if (nextStatus === 'completed') {
                            await commerceService.updateFulfillment(bookingId, {
                                action: 'complete'
                            });
                            return;
                        }
                    }
                }
            } catch (error) {
                if (enforceCanonicalUpdate || !shouldUseFirestoreFallback()) {
                    throw error;
                }
                console.warn('Canonical booking update failed, falling back to Firestore:', error);
            }
        }

        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (!bookingSnap.exists()) {
            throw new Error('Booking not found');
        }

        const previous = fromFirestore<Booking>(bookingSnap);
        await updateDoc(bookingRef, updates);

        const actorId = String(auth.currentUser?.uid || '').trim();
        const sellerId = String(previous.provider?.id || '').trim();
        const buyerId = String(previous.renterId || '').trim();
        const resolvedTracking = typeof updates.trackingNumber === 'string'
            ? updates.trackingNumber.trim()
            : String(previous.trackingNumber || '').trim();
        const nextStatus = typeof updates.status === 'string' ? updates.status : previous.status;

        const notifications: Promise<void>[] = [];

        if (
            typeof updates.trackingNumber === 'string' &&
            resolvedTracking &&
            resolvedTracking !== String(previous.trackingNumber || '').trim() &&
            buyerId &&
            buyerId !== actorId
        ) {
            notifications.push(
                createUserNotification(buyerId, {
                    type: 'ORDER',
                    title: 'Tracking updated',
                    message: `Tracking for ${previous.itemTitle} is now available: ${resolvedTracking}.`,
                    link: `/profile/orders/${bookingId}`
                })
            );
        }

        if (nextStatus !== previous.status) {
            const statusNotifications = buildBookingStatusNotifications(
                { ...previous, id: bookingId, status: nextStatus as Booking['status'] },
                nextStatus,
                resolvedTracking
            );

            if (statusNotifications.buyer && buyerId && buyerId !== actorId) {
                notifications.push(
                    createUserNotification(buyerId, {
                        type: 'ORDER',
                        title: statusNotifications.buyer.title,
                        message: statusNotifications.buyer.message,
                        link: statusNotifications.buyer.link
                    })
                );
            }

            if (statusNotifications.seller && sellerId && sellerId !== actorId) {
                notifications.push(
                    createUserNotification(sellerId, {
                        type: 'ORDER',
                        title: statusNotifications.seller.title,
                        message: statusNotifications.seller.message,
                        link: statusNotifications.seller.link
                    })
                );
            }
        }

        if (notifications.length > 0) {
            await Promise.all(notifications);
        }
    },
    updateBookingStatus: async (bookingId: string, status: string) => {
        await listerService.updateBooking(bookingId, { status: status as Booking['status'] });
    },
    getRentalHistory: async (userId: string): Promise<RentalHistoryItem[]> => {
        const rows: RentalHistoryItem[] = [];
        const seen = new Set<string>();
        let canonicalLoaded = false;

        if (isBackendConfigured()) {
            try {
                const token = await getBackendToken();
                if (token) {
                    canonicalLoaded = true;
                    const res = await backendFetch('/commerce/orders/history?limit=80', {}, token);
                    const lines = Array.isArray(res?.lines) ? res.lines : [];
                    lines.forEach((line: Record<string, unknown>) => {
                        const row = mapCommerceHistoryLineToRentalHistory(line);
                        const key = `${row.source}|${row.id}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            rows.push(row);
                        }
                    });
                }
            } catch (error) {
                throw error;
            }
        }

        if (!shouldUseFirestoreFallback()) {
            return rows;
        }
        const q = query(collection(db, 'bookings'));
        const snapshot = await getDocs(q);
        const allBookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
        allBookings
            .filter(b => (b.renterId === userId || b.provider.id === userId) && !(canonicalLoaded && b.source === 'commerce'))
            .forEach((b) => {
                const row: RentalHistoryItem = {
                    id: b.id,
                    itemId: b.itemId,
                    itemTitle: b.itemTitle,
                    itemImageUrl: 'https://picsum.photos/200',
                    startDate: b.startDate,
                    endDate: b.endDate,
                    totalPrice: b.totalPrice,
                    status: b.status,
                    type: b.type || 'rent',
                    source: 'firestore',
                    orderId: b.orderId
                };
                const key = `${row.source}|${row.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    rows.push(row);
                }
            });

        return rows;
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
        const bookingRef = await addDoc(collection(db, 'bookings'), newBooking);
        await createUserNotification(renter.id, {
            type: 'ORDER',
            title: 'Booking confirmed',
            message: `Your booking for ${item.title} is confirmed.`,
            link: `/profile/orders/${bookingRef.id}`
        });
        if (item.owner?.id && item.owner.id !== renter.id) {
            await createUserNotification(item.owner.id, {
                type: 'ORDER',
                title: 'New booking received',
                message: `${renter.name || 'A customer'} booked ${item.title}.`,
                link: `/profile/orders/${bookingRef.id}`
            });
        }
    },
    getTransactionsForUser: async (userId: string): Promise<any[]> => {
        const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore(doc));
    },
    getAffiliateData: async (userId: string) => affiliateCommissionService.getAffiliateData(userId),
    getAffiliateDashboard: async (userId: string) => affiliateCommissionService.getAffiliateDashboard(userId),
    getAffiliateLinks: async (userId: string): Promise<AffiliateLink[]> => affiliateCommissionService.getAffiliateLinks(userId),
    getAffiliateCoupons: async (userId: string): Promise<AffiliateCoupon[]> => affiliateCommissionService.getAffiliateCoupons(userId),
    getCreativeAssets: async (): Promise<CreativeAsset[]> => affiliateCommissionService.getCreativeAssets(),
    getAffiliateLeaderboard: async (): Promise<any[]> => affiliateCommissionService.getAffiliateLeaderboard(),
    joinAffiliateProgram: async (userId: string): Promise<User> => {
        const updatedUser = await userService.updateUserProfile(userId, {
            isAffiliate: true,
            affiliateOnboardingCompleted: false
        });
        await personaService.ensureRolePersonas(updatedUser);
        return updatedUser;
    },
    generateAffiliateLink: async (userId: string, url: string): Promise<AffiliateLink> => affiliateCommissionService.generateAffiliateLink(userId, url),
    createAffiliateCoupon: async (userId: string, code: string, percentage: number, storeId?: string | null): Promise<AffiliateCoupon> =>
        affiliateCommissionService.createAffiliateCoupon(userId, code, percentage, storeId),
    transferEarningsToWallet: async (userId: string): Promise<User> => affiliateCommissionService.transferApprovedCommissionsToWallet(userId),
    submitExternalProduct: async (userId: string, url: string) => affiliateCommissionService.submitExternalProduct(userId, url),
    submitContentReview: async (userId: string, url: string) => affiliateCommissionService.submitContentReview(userId, url),
    requestPayout: async (userId: string, amount: number, method: any) => {
        const user = await userService.getUserById(userId);
        if (!user) {
            throw new Error('User not found.');
        }
        if (amount <= 0) {
            throw new Error('Amount must be greater than zero.');
        }
        if (amount > (user.walletBalance || 0)) {
            throw new Error('Insufficient wallet balance.');
        }

        const createdAt = new Date().toISOString();

        if (!shouldUseFirestoreFallback()) {
            await ensureLocalDb();
            await localDb.upsert('users', {
                ...user,
                id: user.id,
                walletBalance: Math.max(0, (user.walletBalance || 0) - amount),
                processingBalance: (user.processingBalance || 0) + amount
            });
            await localDb.upsert('payouts', {
                userId,
                amount,
                method,
                status: 'pending',
                createdAt,
                type: 'withdrawal_request'
            });
            return;
        }

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        const payoutRef = doc(collection(db, 'payout_requests'));
        const transactionRef = doc(collection(db, 'walletTransactions'));
        const payoutRecord = {
            id: payoutRef.id,
            userId,
            amount,
            method,
            status: 'pending',
            createdAt,
            walletTransactionId: transactionRef.id
        };
        const transactionRecord = {
            id: transactionRef.id,
            userId,
            amount,
            type: 'debit',
            description: `Withdrawal request via ${String(method?.type || 'payout').replace('_', ' ')}`,
            date: createdAt,
            status: 'pending'
        };

        batch.update(userRef, {
            walletBalance: increment(-amount),
            processingBalance: increment(amount)
        });
        batch.set(transactionRef, transactionRecord);
        batch.set(payoutRef, payoutRecord);
        await batch.commit();

        if (supabaseMirror.enabled) {
            await Promise.all([
                supabaseMirror.upsert('walletTransactions', transactionRef.id, transactionRecord),
                supabaseMirror.upsert('payout_requests', payoutRef.id, payoutRecord)
            ]);
            const mirroredUser = await supabaseMirror.get<User>('users', userId).catch(() => null);
            if (mirroredUser) {
                await supabaseMirror.upsert('users', userId, {
                    ...mirroredUser,
                    walletBalance: Math.max(0, (user.walletBalance || 0) - amount),
                    processingBalance: (user.processingBalance || 0) + amount
                });
            }
        }
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
const isPublishedService = (service?: Partial<Service> | null) => {
    if (!service?.id) return false;
    const status = String(service.status || 'published').toLowerCase();
    return !status || status === 'published';
};

const dedupePublicServices = (services: Service[]) => {
    const map = new Map<string, Service>();
    services.forEach((service) => {
        if (!isPublishedService(service)) return;
        if (!map.has(service.id)) {
            map.set(service.id, service);
        }
    });
    return Array.from(map.values());
};

const loadCanonicalServiceCatalog = async (params: ListWorkListingsParams = {}): Promise<Service[]> => {
    const pageSize = 200;
    const maxPages = 10;
    const collected: Service[] = [];

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const offset = pageIndex * pageSize;
        const listings = await workService.getListings({ ...params, limit: pageSize, offset });
        if (!listings.length) break;
        collected.push(...listings.map(mapWorkListingToService));
        if (listings.length < pageSize) break;
    }

    return dedupePublicServices(collected);
};

export const serviceService = {
    getServices: async (): Promise<Service[]> => {
        const [canonicalServices, legacySnapshot] = await Promise.all([
            loadCanonicalServiceCatalog({ status: 'published' }).catch((error) => {
                console.warn('Canonical work service fetch failed, falling back to legacy services:', error);
                return [] as Service[];
            }),
            getDocs(collection(db, 'services')).catch((error) => {
                console.warn('Legacy service collection fetch failed:', error);
                return null;
            })
        ]);

        const legacyServices = legacySnapshot
            ? legacySnapshot.docs
                .map((docSnap) => fromFirestore<Service>(docSnap))
                .filter((service) => isPublishedService(service))
            : [];

        return dedupePublicServices([...canonicalServices, ...legacyServices]);
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
        let createError: unknown = null;
        try {
            const listing = await workService.createListing({
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
                availability: serviceData.availability || {},
                details: serviceData.details || {},
                riskScore: serviceData.riskScore || 0,
                providerSnapshot: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    rating: user.rating || 0,
                    reviews: []
                },
                status: serviceData.status || 'draft',
                visibility: 'public'
            }, user);
            return mapWorkListingToService(listing);
        } catch (error) {
            createError = error;
            console.warn('workService.createListing failed, writing legacy service fallback:', error);
        }

        if (!shouldUseFirestoreFallback()) {
            throw createError instanceof Error ? createError : new Error('Unable to create service listing.');
        }

        const docRef = await addDoc(collection(db, 'services'), {
            ...serviceData,
            provider: { id: user.id, name: user.name, avatar: user.avatar, rating: 0, reviews: [] },
            avgRating: 0,
            reviews: []
        });
        return {
            id: docRef.id,
            ...serviceData,
            provider: { id: user.id, name: user.name, avatar: user.avatar, rating: 0, reviews: [] },
            avgRating: 0,
            reviews: []
        } as Service;
    },
    updateService: async (serviceId: string, serviceData: Partial<Service>, user: User) => {
        if (!serviceId) throw new Error('Service ID is required for update.');
        try {
            const listing = await workService.updateListing(serviceId, {
                title: serviceData.title,
                description: serviceData.description,
                category: serviceData.category,
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
                availability: serviceData.availability,
                details: serviceData.details,
                providerSnapshot: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    rating: user.rating || 0,
                    reviews: []
                },
                status: serviceData.status,
                visibility: serviceData.status === 'published' ? 'public' : undefined,
                updatedAt: new Date().toISOString()
            });
            return mapWorkListingToService(listing);
        } catch (error) {
            console.warn('workService.updateListing failed, falling back to legacy service update:', error);
        }

        if (!shouldUseFirestoreFallback()) {
            throw new Error('Unable to update service: no backend or firestore fallback available.');
        }

        await setDoc(doc(db, 'services', serviceId), {
            ...serviceData,
            provider: {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                rating: user.rating || 0,
                reviews: []
            },
            updatedAt: new Date().toISOString()
        }, { merge: true });
    },
    getServicesByProvider: async (userId: string): Promise<Service[]> => {
        const [canonicalServices, legacySnapshot] = await Promise.all([
            loadCanonicalServiceCatalog({ sellerId: userId, status: 'published' }).catch((error) => {
                console.warn('Canonical provider service query failed, falling back to legacy services:', error);
                return [] as Service[];
            }),
            getDocs(query(collection(db, 'services'), where('provider.id', '==', userId))).catch((error) => {
                console.warn('Legacy provider service query failed:', error);
                return null;
            })
        ]);

        const legacyServices = legacySnapshot
            ? legacySnapshot.docs
                .map((docSnap) => fromFirestore<Service>(docSnap))
                .filter((service) => isPublishedService(service))
            : [];

        return dedupePublicServices([...canonicalServices, ...legacyServices]);
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
            if (status === 'confirmed') {
                await workService.acceptRequest(jobId);
                return;
            }
            if (status === 'cancelled') {
                await workService.declineRequest(jobId);
                return;
            }
            if (status === 'completed') {
                await contractService.completeContract(jobId);
                return;
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






























