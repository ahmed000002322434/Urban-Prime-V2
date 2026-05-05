import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import contractService from './contractService';
import escrowService from './escrowService';
import {
  attachFirebaseIdsToRows,
  canUseDirectSupabaseTables,
  ensureSupabaseUserRecord,
  getDirectSupabaseSetupMessage,
  resolveSupabaseUserId
} from './supabaseAppBridge';
import supabaseMirror from './supabaseMirror';
import supabase from '../utils/supabase';
import type {
  Job,
  ProviderWorkspaceSummary,
  Service,
  ServicePricingModel,
  User,
  WorkAvailability,
  WorkContractStatus,
  WorkFulfillmentKind,
  WorkListingDetails,
  WorkListing,
  WorkMode,
  WorkRequestDetails,
  WorkRequestType,
  WorkRequest
} from '../types';

export interface ListWorkListingsParams {
  status?: string;
  sellerId?: string;
  mode?: WorkMode;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListWorkRequestsParams {
  status?: string;
  requesterId?: string;
  targetProviderId?: string;
  mode?: WorkMode;
  category?: string;
  limit?: number;
  offset?: number;
}

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry)).filter(Boolean);
    } catch {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
  }
  return [];
};

const toObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, any>;
    } catch {
      return {};
    }
  }
  return {};
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensurePricingModels = (
  packages: any[],
  basePrice?: number,
  currency = 'USD'
): ServicePricingModel[] => {
  if (packages.length > 0) {
    return packages.map((pkg, idx) => ({
      type: (pkg?.type || 'fixed') as ServicePricingModel['type'],
      price: toNumber(pkg?.price, basePrice ?? 0),
      description: pkg?.description || pkg?.name || `Package ${idx + 1}`,
      currency: pkg?.currency || currency,
      deliveryDays: pkg?.deliveryDays ? toNumber(pkg.deliveryDays) : undefined,
      revisions: pkg?.revisions ? toNumber(pkg.revisions) : undefined
    }));
  }

  return [
    {
      type: 'fixed',
      price: toNumber(basePrice, 0),
      description: 'Standard package',
      currency
    }
  ];
};

const mapWorkListingRow = (row: any): WorkListing => {
  const packagesRaw = Array.isArray(row?.packages)
    ? row.packages
    : Array.isArray(row?.pricingModels)
      ? row.pricingModels
      : [];
  const mode = (row?.mode || 'hybrid') as WorkMode;
  const fulfillmentKind = (row?.fulfillment_kind || row?.fulfillmentKind || 'hybrid') as WorkFulfillmentKind;
  const media = toArray(row?.media || row?.imageUrls);
  const providerSnapshot = toObject(row?.provider_snapshot || row?.providerSnapshot);

  return {
    id: String(row?.id || ''),
    title: String(row?.title || 'Untitled Service'),
    description: String(row?.description || ''),
    category: String(row?.category || 'general'),
    mode,
    fulfillmentKind,
    sellerId: String(row?.seller_firebase_uid || providerSnapshot?.id || row?.seller_id || row?.sellerId || ''),
    sellerPersonaId: row?.seller_persona_id || row?.sellerPersonaId || undefined,
    providerSnapshot: providerSnapshot?.id
      ? {
          id: String(row?.seller_firebase_uid || providerSnapshot.id),
          name: String(providerSnapshot.name || 'Provider'),
          avatar: providerSnapshot.avatar || '/icons/urbanprime.svg',
          rating: toNumber(providerSnapshot.rating, 0),
          reviews: Array.isArray(providerSnapshot.reviews) ? providerSnapshot.reviews : []
        }
      : undefined,
    currency: String(row?.currency || 'USD'),
    timezone: row?.timezone || undefined,
    basePrice: row?.base_price !== undefined ? toNumber(row.base_price) : row?.basePrice !== undefined ? toNumber(row.basePrice) : undefined,
    packages: packagesRaw.map((pkg: any, index: number) => ({
      id: String(pkg?.id || `${row?.id || 'listing'}-pkg-${index}`),
      name: String(pkg?.name || pkg?.description || `Package ${index + 1}`),
      description: pkg?.description || undefined,
      price: toNumber(pkg?.price, 0),
      currency: pkg?.currency || row?.currency || 'USD',
      deliveryDays: pkg?.deliveryDays ? toNumber(pkg.deliveryDays) : undefined,
      revisions: pkg?.revisions ? toNumber(pkg.revisions) : undefined,
      type: pkg?.type || 'fixed'
    })),
    skills: toArray(row?.skills),
    media,
    availability: toObject(row?.availability) as WorkAvailability,
    details: toObject(row?.details) as WorkListingDetails,
    riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
    status: (row?.status || 'draft') as WorkListing['status'],
    visibility: (row?.visibility || 'public') as WorkListing['visibility'],
    reviewNotes: row?.review_notes || row?.reviewNotes || undefined,
    submittedAt: row?.submitted_at || row?.submittedAt || undefined,
    reviewedAt: row?.reviewed_at || row?.reviewedAt || undefined,
    publishedAt: row?.published_at || row?.publishedAt || undefined,
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || row?.updatedAt || undefined
  };
};

const mapWorkRequestRow = (row: any): WorkRequest => {
  const details = toObject(row?.details) as WorkRequestDetails & { targetProviderFirebaseUid?: string };
  const requesterSnapshot = row?.requester_snapshot || row?.requesterSnapshot || undefined;
  return {
    id: String(row?.id || ''),
    requesterId: String(row?.requester_firebase_uid || requesterSnapshot?.id || row?.requester_id || row?.requesterId || ''),
    requesterPersonaId: row?.requester_persona_id || row?.requesterPersonaId || undefined,
    requesterSnapshot,
    title: String(row?.title || 'Service request'),
    brief: String(row?.brief || ''),
    listingId: row?.listing_id || row?.listingId || undefined,
    targetProviderId: row?.target_provider_firebase_uid || details?.targetProviderFirebaseUid || row?.target_provider_id || row?.targetProviderId || undefined,
    category: String(row?.category || 'general'),
    mode: (row?.mode || 'hybrid') as WorkMode,
    fulfillmentKind: (row?.fulfillment_kind || row?.fulfillmentKind || 'hybrid') as WorkFulfillmentKind,
    budgetMin: row?.budget_min !== undefined ? toNumber(row.budget_min) : row?.budgetMin !== undefined ? toNumber(row.budgetMin) : undefined,
    budgetMax: row?.budget_max !== undefined ? toNumber(row.budget_max) : row?.budgetMax !== undefined ? toNumber(row.budgetMax) : undefined,
    currency: String(row?.currency || 'USD'),
    timezone: row?.timezone || undefined,
    location: toObject(row?.location),
    requirements: toArray(row?.requirements),
    attachments: toArray(row?.attachments),
    requestType: ((row?.request_type || row?.requestType || 'quote') as WorkRequestType),
    details,
    riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
    status: (row?.status || 'open') as WorkRequest['status'],
    scheduledAt: row?.scheduled_at || row?.scheduledAt || undefined,
    acceptedAt: row?.accepted_at || row?.acceptedAt || undefined,
    declinedAt: row?.declined_at || row?.declinedAt || undefined,
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || row?.updatedAt || undefined
  };
};

const mapLegacyServiceToWorkListing = (service: Service): WorkListing => ({
  id: service.id,
  title: service.title,
  description: service.description,
  category: service.category,
  mode: service.mode || 'instant',
  fulfillmentKind: service.fulfillmentKind || 'hybrid',
  sellerId: service.provider.id,
  sellerPersonaId: service.providerPersonaId,
  providerSnapshot: {
    id: service.provider.id,
    name: service.provider.name,
    avatar: service.provider.avatar,
    rating: service.provider.rating,
    reviews: service.provider.reviews || []
  },
  currency: service.currency || service.pricingModels?.[0]?.currency || 'USD',
  timezone: service.timezone,
  basePrice: service.pricingModels?.[0]?.price || 0,
  packages: (service.pricingModels || []).map((model, index) => ({
    id: `${service.id}-pkg-${index}`,
    name: model.description || `Package ${index + 1}`,
    description: model.description,
    price: toNumber(model.price),
    currency: model.currency || service.currency || 'USD',
    deliveryDays: model.deliveryDays,
    revisions: model.revisions,
    type: model.type
  })),
  media: service.imageUrls || [],
  skills: [],
  availability: service.availability || {},
  details: service.details || {},
  riskScore: service.riskScore || 0,
  status: service.status || 'published',
  visibility: 'public',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const canUseDirectSupabase = () => !isBackendConfigured() && canUseDirectSupabaseTables();

const toSupabaseError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const attachListingFirebaseIds = async (rows: any[]) =>
  attachFirebaseIdsToRows(rows, [{ sourceField: 'seller_id', targetField: 'seller_firebase_uid' }]);

const attachRequestFirebaseIds = async (rows: any[]) =>
  attachFirebaseIdsToRows(rows, [
    { sourceField: 'requester_id', targetField: 'requester_firebase_uid' },
    { sourceField: 'target_provider_id', targetField: 'target_provider_firebase_uid' }
  ]);

const buildDirectListingPayload = async (input: Partial<WorkListing>, user: User) => {
  const seller = await ensureSupabaseUserRecord(user);
  return {
    row: {
      seller_id: seller.id,
      seller_persona_id: input.sellerPersonaId || null,
      title: input.title || 'Untitled service',
      description: input.description || '',
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillment_kind: input.fulfillmentKind || 'hybrid',
      pricing_type: input.packages?.some((entry) => entry.type === 'hourly') ? 'hourly' : 'fixed',
      base_price: input.basePrice ?? input.packages?.[0]?.price ?? 0,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      packages: input.packages || [],
      skills: input.skills || [],
      media: input.media || [],
      availability: input.availability || {},
      details: input.details || {},
      provider_snapshot: input.providerSnapshot || {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        rating: user.rating || 0,
        reviews: []
      },
      risk_score: input.riskScore ?? 0,
      status: input.status || 'draft',
      visibility: input.visibility || 'public',
      review_notes: input.reviewNotes || null,
      submitted_at: input.submittedAt || null,
      reviewed_at: input.reviewedAt || null,
      published_at: input.publishedAt || null
    },
    seller
  };
};

const canUseDirectSupabaseFallback = () => canUseDirectSupabaseTables();

const persistMirroredListing = async (listing: WorkListing) => {
  if (!listing.id) return listing;
  await supabaseMirror.upsert('work_listings', listing.id, listing);
  await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
  await mirrorLegacyService(listing);
  return listing;
};

const createListingDirect = async (input: Partial<WorkListing>, user: User): Promise<WorkListing> => {
  const { row } = await buildDirectListingPayload(input, user);
  const res = await supabase.from('work_listings').insert(row).select('*').single();
  if (res.error || !res.data) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  const [normalizedRow] = await attachListingFirebaseIds([res.data]);
  return mapWorkListingRow(normalizedRow);
};

const updateListingDirect = async (listingId: string, updates: Partial<WorkListing>): Promise<WorkListing> => {
  const rowUpdates: Record<string, any> = {};
  if (updates.title !== undefined) rowUpdates.title = updates.title;
  if (updates.description !== undefined) rowUpdates.description = updates.description;
  if (updates.category !== undefined) rowUpdates.category = updates.category;
  if (updates.mode !== undefined) rowUpdates.mode = updates.mode;
  if (updates.fulfillmentKind !== undefined) rowUpdates.fulfillment_kind = updates.fulfillmentKind;
  if (updates.sellerPersonaId !== undefined) rowUpdates.seller_persona_id = updates.sellerPersonaId;
  if (updates.currency !== undefined) rowUpdates.currency = updates.currency;
  if (updates.timezone !== undefined) rowUpdates.timezone = updates.timezone;
  if (updates.basePrice !== undefined) rowUpdates.base_price = updates.basePrice;
  if (updates.packages !== undefined) {
    rowUpdates.packages = updates.packages;
    rowUpdates.pricing_type = updates.packages.some((entry) => entry.type === 'hourly') ? 'hourly' : 'fixed';
  }
  if (updates.skills !== undefined) rowUpdates.skills = updates.skills;
  if (updates.media !== undefined) rowUpdates.media = updates.media;
  if (updates.availability !== undefined) rowUpdates.availability = updates.availability;
  if (updates.details !== undefined) rowUpdates.details = updates.details;
  if (updates.providerSnapshot !== undefined) rowUpdates.provider_snapshot = updates.providerSnapshot;
  if (updates.riskScore !== undefined) rowUpdates.risk_score = updates.riskScore;
  if (updates.status !== undefined) rowUpdates.status = updates.status;
  if (updates.visibility !== undefined) rowUpdates.visibility = updates.visibility;
  if (updates.reviewNotes !== undefined) rowUpdates.review_notes = updates.reviewNotes;
  if (updates.submittedAt !== undefined) rowUpdates.submitted_at = updates.submittedAt;
  if (updates.reviewedAt !== undefined) rowUpdates.reviewed_at = updates.reviewedAt;
  if (updates.publishedAt !== undefined) rowUpdates.published_at = updates.publishedAt;

  const res = await supabase.from('work_listings').update(rowUpdates).eq('id', listingId).select('*').single();
  if (res.error || !res.data) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  const [normalizedRow] = await attachListingFirebaseIds([res.data]);
  return mapWorkListingRow(normalizedRow);
};

const getListingsDirect = async (params: ListWorkListingsParams = {}): Promise<WorkListing[]> => {
  const sellerId = await resolveSupabaseUserId(params.sellerId);
  let queryBuilder = supabase.from('work_listings').select('*').order('created_at', { ascending: false });
  if (params.status) queryBuilder = queryBuilder.eq('status', params.status);
  if (sellerId) queryBuilder = queryBuilder.eq('seller_id', sellerId);
  if (params.mode) queryBuilder = queryBuilder.eq('mode', params.mode);
  if (params.category) queryBuilder = queryBuilder.eq('category', params.category);
  if (params.search) {
    const escaped = params.search.replace(/[%]/g, '').trim();
    if (escaped) {
      queryBuilder = queryBuilder.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,category.ilike.%${escaped}%`);
    }
  }
  const limit = Math.min(params.limit || 50, 200);
  const offset = Math.max(params.offset || 0, 0);
  const res = await queryBuilder.range(offset, offset + limit - 1);
  if (res.error) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  const normalizedRows = await attachListingFirebaseIds(res.data || []);
  return normalizedRows.map(mapWorkListingRow);
};

const getListingByIdDirect = async (id: string): Promise<WorkListing | undefined> => {
  const res = await supabase.from('work_listings').select('*').eq('id', id).limit(1);
  if (res.error) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  if (!res.data?.length) return undefined;
  const [normalizedRow] = await attachListingFirebaseIds([res.data[0]]);
  return mapWorkListingRow(normalizedRow);
};

const buildDirectRequestPayload = async (input: Partial<WorkRequest>, user: User) => {
  const requester = await ensureSupabaseUserRecord(user);
  let targetProviderId = await resolveSupabaseUserId(input.targetProviderId);
  if (!targetProviderId && input.listingId && canUseDirectSupabase()) {
    const listingLookup = await supabase.from('work_listings').select('seller_id').eq('id', input.listingId).maybeSingle();
    if (!listingLookup.error && listingLookup.data?.seller_id) {
      targetProviderId = String(listingLookup.data.seller_id);
    }
  }
  if (!targetProviderId && input.targetProviderId) {
    targetProviderId = (await ensureSupabaseUserRecord({
      id: input.targetProviderId,
      name: 'Provider',
      email: '',
      avatar: ''
    })).id;
  }
  return {
    row: {
      requester_id: requester.id,
      requester_persona_id: input.requesterPersonaId || null,
      requester_snapshot: input.requesterSnapshot || {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      },
      title: input.title || 'New request',
      brief: input.brief || '',
      listing_id: input.listingId || null,
      target_provider_id: targetProviderId || null,
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillment_kind: input.fulfillmentKind || 'hybrid',
      budget_min: input.budgetMin ?? 0,
      budget_max: input.budgetMax ?? input.budgetMin ?? 0,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: input.location || {},
      requirements: input.requirements || [],
      attachments: input.attachments || [],
      request_type: input.requestType || 'quote',
      details: {
        ...(input.details || {}),
        ...(input.targetProviderId ? { targetProviderFirebaseUid: input.targetProviderId } : {})
      },
      risk_score: input.riskScore ?? 0,
      status: input.status || 'open',
      scheduled_at: input.scheduledAt || null
    },
    requester
  };
};

const findOrCreateContractForRequest = async (request: WorkRequest) => {
  const existingContracts = await contractService.getContracts({ providerId: request.targetProviderId, limit: 200 });
  const existing = existingContracts.find((entry) => entry.requestId === request.id);
  if (existing) return existing;

  const scope = request.brief || request.title;
  const totalAmount = request.budgetMax ?? request.budgetMin ?? 0;
  const contract = await contractService.createContract({
    requestId: request.id,
    listingId: request.listingId,
    clientId: request.requesterId,
    providerId: request.targetProviderId || '',
    scope,
    mode: request.mode,
    fulfillmentKind: request.fulfillmentKind,
    currency: request.currency,
    timezone: request.timezone,
    totalAmount,
    status: request.requestType === 'booking' ? 'active' : 'pending',
    startAt: request.scheduledAt
  }, {
    id: request.requesterId,
    name: request.requesterSnapshot?.name || 'Client',
    email: '',
    avatar: request.requesterSnapshot?.avatar || '',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: request.createdAt
  });

  if (request.requestType === 'booking' && totalAmount > 0) {
    await escrowService.hold({
      contractId: contract.id,
      amount: totalAmount,
      payerId: request.requesterId,
      payeeId: request.targetProviderId,
      currency: request.currency,
      metadata: {
        requestId: request.id,
        source: 'direct_supabase_accept_request'
      }
    }).catch(() => undefined);
  }

  return contract;
};

const isUuidLike = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

const promoteLegacyListingToCanonical = async (listingId: string): Promise<WorkListing | undefined> => {
  if (isUuidLike(listingId) || !auth.currentUser || !canUseDirectSupabaseFallback()) {
    return undefined;
  }

  let legacyListing: WorkListing | undefined;
  const workListingSnap = await getDoc(doc(db, 'work_listings', listingId)).catch(() => null);
  if (workListingSnap?.exists()) {
    legacyListing = mapWorkListingRow({ id: workListingSnap.id, ...(workListingSnap.data() || {}) });
  }

  if (!legacyListing) {
    const serviceSnap = await getDoc(doc(db, 'services', listingId)).catch(() => null);
    if (serviceSnap?.exists()) {
      legacyListing = mapLegacyServiceToWorkListing({ id: serviceSnap.id, ...(serviceSnap.data() || {}) } as Service);
    }
  }

  if (!legacyListing) return undefined;

  const existingUser = auth.currentUser?.uid
    ? await import('./itemService')
        .then(({ userService }) => userService.getUserById(auth.currentUser!.uid))
        .catch(() => null)
    : null;

  const userSeed =
    existingUser ||
    {
      id: auth.currentUser.uid,
      name: auth.currentUser.displayName || legacyListing.providerSnapshot?.name || 'Provider',
      email: auth.currentUser.email || '',
      avatar: auth.currentUser.photoURL || legacyListing.providerSnapshot?.avatar || '/icons/urbanprime.svg',
      phone: '',
      status: 'active' as const,
      following: [],
      followers: [],
      wishlist: [],
      cart: [],
      badges: [],
      memberSince: new Date().toISOString()
    };

  const listing = await createListingDirect({
    ...legacyListing,
    title: legacyListing.title,
    description: legacyListing.description,
    category: legacyListing.category,
    mode: legacyListing.mode,
    fulfillmentKind: legacyListing.fulfillmentKind,
    currency: legacyListing.currency,
    timezone: legacyListing.timezone,
    basePrice: legacyListing.basePrice,
    packages: legacyListing.packages,
    media: legacyListing.media,
    availability: legacyListing.availability,
    details: legacyListing.details,
    skills: legacyListing.skills,
    riskScore: legacyListing.riskScore,
    status: legacyListing.status || 'draft',
    visibility: legacyListing.visibility || 'public',
    providerSnapshot: legacyListing.providerSnapshot || {
      id: userSeed.id,
      name: userSeed.name,
      avatar: userSeed.avatar,
      rating: userSeed.rating || 0,
      reviews: []
    }
  }, userSeed as User);

  await setDoc(doc(db, 'services', listingId), {
    canonicalListingId: listing.id,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch(() => undefined);
  await setDoc(doc(db, 'work_listings', listingId), {
    canonicalListingId: listing.id,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch(() => undefined);

  return listing;
};

const resolveBackendUserId = async (value?: string): Promise<string | undefined> => {
  const candidate = String(value || '').trim();
  if (!candidate || isUuidLike(candidate) || !isBackendConfigured()) return candidate || undefined;
  try {
    const token = await getBackendToken();
    const res = await backendFetch(`/api/users?firebase_uid=${encodeURIComponent(candidate)}&select=id&limit=1`, {}, token);
    const rows = Array.isArray(res?.data) ? res.data : [];
    if (rows[0]?.id) return String(rows[0].id);
  } catch {
    return candidate;
  }
  return candidate;
};

const mirrorLegacyService = async (listing: WorkListing) => {
  if (!shouldUseFirestoreFallback()) return;

  const legacyService = mapWorkListingToService(listing);
  await setDoc(doc(db, 'services', listing.id), legacyService, { merge: true });
  await setDoc(doc(db, 'work_listings', listing.id), listing, { merge: true });
};

const mapContractRowToJob = (row: any): Job => {
  const status = String(row?.status || 'pending').toLowerCase() as WorkContractStatus;
  const statusMap: Record<WorkContractStatus, Job['status']> = {
    draft: 'pending',
    pending: 'pending',
    active: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    disputed: 'in_progress'
  };

  return {
    id: String(row?.id || ''),
    customer: {
      id: String(row?.client_snapshot?.id || row?.client_firebase_uid || row?.client_id || row?.clientId || ''),
      name: String(row?.client_snapshot?.name || 'Client'),
      avatar: String(row?.client_snapshot?.avatar || '/icons/urbanprime.svg')
    },
    providerId: String(row?.provider_snapshot?.id || row?.provider_firebase_uid || row?.provider_id || row?.providerId || ''),
    price: toNumber(row?.total_amount || row?.totalAmount, 0),
    scheduledTime: String(row?.due_at || row?.dueAt || row?.created_at || new Date().toISOString()),
    status: statusMap[status] || 'pending',
    engagementId: row?.engagement_id || row?.engagementId || undefined,
    mode: (row?.mode || 'hybrid') as Job['mode'],
    fulfillmentKind: (row?.fulfillment_kind || row?.fulfillmentKind || 'hybrid') as Job['fulfillmentKind'],
    riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : undefined,
    currency: row?.currency || 'USD',
    timezone: row?.timezone || undefined,
    providerPersonaId: row?.provider_persona_id || row?.providerPersonaId || undefined,
    buyerPersonaId: row?.client_persona_id || row?.clientPersonaId || undefined
  };
};

export const mapWorkListingToService = (listing: WorkListing): Service => {
  const provider = listing.providerSnapshot || {
    id: listing.sellerId,
    name: 'Provider',
    avatar: '/icons/urbanprime.svg',
    rating: 0,
    reviews: []
  };
  const pricingModels = ensurePricingModels(
    listing.packages || [],
    listing.basePrice,
    listing.currency || 'USD'
  );

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    provider: {
      id: provider.id,
      name: provider.name,
      avatar: provider.avatar || '/icons/urbanprime.svg',
      rating: toNumber(provider.rating, 0),
      reviews: Array.isArray(provider.reviews) ? provider.reviews : []
    },
    imageUrls: Array.isArray(listing.media) && listing.media.length > 0 ? listing.media : ['/icons/urbanprime.svg'],
    pricingModels,
    avgRating: toNumber(provider.rating, 0),
    reviews: Array.isArray(provider.reviews) ? provider.reviews : [],
    engagementId: undefined,
    mode: listing.mode,
    fulfillmentKind: listing.fulfillmentKind,
    riskScore: listing.riskScore,
    currency: listing.currency,
    timezone: listing.timezone,
    availability: listing.availability,
    details: listing.details,
    status: listing.status,
    providerPersonaId: listing.sellerPersonaId,
    listingSource: 'omniwork'
  };
};

export const mapWorkRequestToJob = (request: WorkRequest): Job => ({
  id: request.id,
  service: {
    id: request.listingId || request.id,
    title: request.title,
    description: request.brief,
    category: request.category,
    provider: {
      id: request.targetProviderId || '',
      name: 'Provider',
      avatar: '/icons/urbanprime.svg',
      rating: 0,
      reviews: []
    },
    imageUrls: ['/icons/urbanprime.svg'],
    pricingModels: [
      {
        type: 'custom_offer',
        price: toNumber(request.budgetMax ?? request.budgetMin, 0),
        description: 'Custom request',
        currency: request.currency
      }
    ],
    avgRating: 0,
    reviews: [],
    mode: request.mode,
    fulfillmentKind: request.fulfillmentKind,
    riskScore: request.riskScore,
    currency: request.currency,
    timezone: request.timezone,
    buyerPersonaId: request.requesterPersonaId,
    listingSource: 'omniwork'
  },
  customer: {
    id: request.requesterId,
    name: request.requesterSnapshot?.name || 'Client',
    avatar: request.requesterSnapshot?.avatar || '/icons/urbanprime.svg'
  },
  providerId: request.targetProviderId || '',
  price: toNumber(request.budgetMax ?? request.budgetMin, 0),
  scheduledTime: request.createdAt,
  status: request.status === 'matched' ? 'confirmed' : request.status === 'closed' || request.status === 'cancelled' ? 'cancelled' : 'pending',
  mode: request.mode,
  fulfillmentKind: request.fulfillmentKind,
  riskScore: request.riskScore,
  currency: request.currency,
  timezone: request.timezone,
  providerPersonaId: undefined,
  buyerPersonaId: request.requesterPersonaId
});

const workService = {
  async createListing(input: Partial<WorkListing>, user: User): Promise<WorkListing> {
    const payload = {
      title: input.title || 'Untitled service',
      description: input.description || '',
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillmentKind: input.fulfillmentKind || 'hybrid',
      sellerPersonaId: input.sellerPersonaId || undefined,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      basePrice: input.basePrice ?? input.packages?.[0]?.price ?? 0,
      packages: input.packages || [],
      skills: input.skills || [],
      media: input.media || [],
      availability: input.availability || {},
      details: input.details || {},
      status: input.status || 'draft',
      visibility: input.visibility || 'public',
      riskScore: input.riskScore ?? 0,
      providerSnapshot: input.providerSnapshot || {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        rating: user.rating || 0,
        reviews: []
      }
    };

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch('/work/listings', {
          method: 'POST',
          body: JSON.stringify(payload)
        }, token);

        const listing = mapWorkListingRow(res?.data);
        if (listing.id) {
          return persistMirroredListing(listing);
        }
      } catch (error) {
        console.warn('Work listing backend create failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      const listing = await createListingDirect(payload, user);
      return persistMirroredListing(listing);
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to create work listing: no backend or firestore fallback available.');
    }

    const docRef = await addDoc(collection(db, 'work_listings'), {
      ...payload,
      sellerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const listing: WorkListing = mapWorkListingRow({
      id: docRef.id,
      ...payload,
      sellerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await mirrorLegacyService(listing);
    return listing;
  },

  async updateListing(listingId: string, updates: Partial<WorkListing>): Promise<WorkListing> {
    let targetListingId = listingId;
    if (canUseDirectSupabaseFallback() && !isUuidLike(targetListingId)) {
      const promoted = await promoteLegacyListingToCanonical(targetListingId).catch((error) => {
        console.warn('Legacy listing promotion failed before update:', error);
        return undefined;
      });
      if (promoted?.id) {
        targetListingId = promoted.id;
      }
    }

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch(`/work/listings/${targetListingId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        }, token);
        const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
        const listing = mapWorkListingRow({ id: targetListingId, ...row });
        if (listing.id) {
          await supabaseMirror.mergeUpdate<WorkListing>('work_listings', listing.id, listing);
          await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
          await mirrorLegacyService(listing);
          return listing;
        }
      } catch (error) {
        console.warn('Work listing backend update failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback() && isUuidLike(targetListingId)) {
      const listing = await updateListingDirect(targetListingId, updates);
      await supabaseMirror.mergeUpdate<WorkListing>('work_listings', listing.id, listing);
      await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
      await mirrorLegacyService(listing);
      return listing;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to update work listing: no backend or firestore fallback available.');
    }

    await setDoc(doc(db, 'work_listings', listingId), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const snap = await getDoc(doc(db, 'work_listings', listingId));
    const listing = mapWorkListingRow({ id: listingId, ...(snap.data() || {}) });
    await mirrorLegacyService(listing);
    return listing;
  },

  async getListings(params: ListWorkListingsParams = {}): Promise<WorkListing[]> {
    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const sellerId = await resolveBackendUserId(params.sellerId);
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.set('status', params.status);
        if (sellerId) queryParams.set('sellerId', sellerId);
        if (params.mode) queryParams.set('mode', params.mode);
        if (params.category) queryParams.set('category', params.category);
        if (params.search) queryParams.set('q', params.search);
        queryParams.set('limit', String(Math.min(params.limit || 50, 200)));
        queryParams.set('offset', String(Math.max(params.offset || 0, 0)));

        const res = await backendFetch(`/work/listings?${queryParams.toString()}`, {}, token);
        const listings = (Array.isArray(res?.data) ? res.data : []).map(mapWorkListingRow);
        await Promise.all(listings.map((listing) => supabaseMirror.upsert('work_listings', listing.id, listing)));
        return listings;
      } catch (error) {
        console.warn('Work listing backend list failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      const listings = await getListingsDirect(params);
      await Promise.all(listings.map((listing) => supabaseMirror.upsert('work_listings', listing.id, listing)));
      return listings;
    }

    if (shouldUseFirestoreFallback()) {
      let workQuery = query(collection(db, 'work_listings'), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
      if (params.sellerId) {
        workQuery = query(collection(db, 'work_listings'), where('sellerId', '==', params.sellerId), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
      } else if (params.status) {
        workQuery = query(collection(db, 'work_listings'), where('status', '==', params.status), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
      }

      const snapshot = await getDocs(workQuery);
      const listings = snapshot.docs.map((snap) => mapWorkListingRow({ id: snap.id, ...(snap.data() || {}) }));
      if (listings.length > 0) return listings;

      const legacyServices = await getDocs(collection(db, 'services'));
      return legacyServices.docs.map((snap) => mapLegacyServiceToWorkListing({
        id: snap.id,
        ...(snap.data() || {})
      } as Service));
    }

    return [];
  },

  async getListingById(id: string): Promise<WorkListing | undefined> {
    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch(`/work/listings/${id}`, {}, token);
        if (res?.data) {
          const listing = mapWorkListingRow(res.data);
          if (listing.id) {
            await supabaseMirror.upsert('work_listings', listing.id, listing);
            return listing;
          }
        }
      } catch (error) {
        console.warn('Work listing backend fetch failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback() && isUuidLike(id)) {
      const listing = await getListingByIdDirect(id);
      if (listing) {
        await supabaseMirror.upsert('work_listings', listing.id, listing);
        return listing;
      }
    }

    if (shouldUseFirestoreFallback()) {
      const snap = await getDoc(doc(db, 'work_listings', id));
      if (snap.exists()) return mapWorkListingRow({ id: snap.id, ...(snap.data() || {}) });

      const legacy = await getDoc(doc(db, 'services', id));
      if (legacy.exists()) {
        return mapLegacyServiceToWorkListing({ id: legacy.id, ...(legacy.data() || {}) } as Service);
      }
    }

    return undefined;
  },

  async createRequest(
    input: Partial<WorkRequest>,
    user: User,
    options: { requireLiveBackend?: boolean } = {}
  ): Promise<WorkRequest> {
    const resolvedTargetProviderId = input.targetProviderId
      ? await resolveBackendUserId(input.targetProviderId).catch(() => input.targetProviderId)
      : undefined;
    const payload = {
      title: input.title || 'New request',
      brief: input.brief || '',
      listingId: input.listingId || undefined,
      targetProviderId: resolvedTargetProviderId || input.targetProviderId || undefined,
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillmentKind: input.fulfillmentKind || 'hybrid',
      budgetMin: input.budgetMin ?? 0,
      budgetMax: input.budgetMax ?? input.budgetMin ?? 0,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: input.location || {},
      requirements: input.requirements || [],
      attachments: input.attachments || [],
      requestType: input.requestType || 'quote',
      details: input.details || {},
      riskScore: input.riskScore ?? 0,
      status: input.status || 'open',
      scheduledAt: input.scheduledAt || undefined,
      requesterPersonaId: input.requesterPersonaId || undefined,
      requesterSnapshot: input.requesterSnapshot || {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      }
    };

    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
        backendNoQueue: Boolean(options.requireLiveBackend)
      }, token);
      const request = mapWorkRequestRow(res?.data);
      await supabaseMirror.upsert('work_requests', request.id, request);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_requests', request.id), request, { merge: true });
      }
      return request;
    }

    if (options.requireLiveBackend) {
      throw new Error('Live backend is required to create this work request.');
    }

    if (canUseDirectSupabase()) {
      const { row } = await buildDirectRequestPayload(payload, user);
      const res = await supabase.from('work_requests').insert(row).select('*').single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachRequestFirebaseIds([res.data]);
      const request = mapWorkRequestRow(normalizedRow);
      await supabaseMirror.upsert('work_requests', request.id, request);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_requests', request.id), request, { merge: true });
      }
      return request;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to create work request: no backend or firestore fallback available.');
    }

    const docRef = await addDoc(collection(db, 'work_requests'), {
      ...payload,
      requesterId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return mapWorkRequestRow({
      id: docRef.id,
      ...payload,
      requesterId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async getRequests(params: ListWorkRequestsParams = {}): Promise<WorkRequest[]> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const requesterId = await resolveBackendUserId(params.requesterId);
      const targetProviderId = await resolveBackendUserId(params.targetProviderId);
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (requesterId) queryParams.set('requesterId', requesterId);
      if (targetProviderId) queryParams.set('targetProviderId', targetProviderId);
      if (params.mode) queryParams.set('mode', params.mode);
      if (params.category) queryParams.set('category', params.category);
      queryParams.set('limit', String(Math.min(params.limit || 50, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));

      const res = await backendFetch(`/work/requests?${queryParams.toString()}`, {}, token);
      const normalizedRows = await attachRequestFirebaseIds(Array.isArray(res?.data) ? res.data : []);
      return normalizedRows.map(mapWorkRequestRow);
    }

    if (canUseDirectSupabase()) {
      const requesterId = await resolveSupabaseUserId(params.requesterId);
      const targetProviderId = await resolveSupabaseUserId(params.targetProviderId);
      let queryBuilder = supabase.from('work_requests').select('*').order('created_at', { ascending: false });
      if (params.status) queryBuilder = queryBuilder.eq('status', params.status);
      if (requesterId) queryBuilder = queryBuilder.eq('requester_id', requesterId);
      if (targetProviderId) queryBuilder = queryBuilder.eq('target_provider_id', targetProviderId);
      if (params.mode) queryBuilder = queryBuilder.eq('mode', params.mode);
      if (params.category) queryBuilder = queryBuilder.eq('category', params.category);
      const limit = Math.min(params.limit || 50, 200);
      const offset = Math.max(params.offset || 0, 0);
      const res = await queryBuilder.range(offset, offset + limit - 1);
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const normalizedRows = await attachRequestFirebaseIds(res.data || []);
      return normalizedRows.map(mapWorkRequestRow);
    }

    if (!shouldUseFirestoreFallback()) return [];

    let workQuery = query(collection(db, 'work_requests'), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
    if (params.targetProviderId) {
      workQuery = query(collection(db, 'work_requests'), where('targetProviderId', '==', params.targetProviderId), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
    } else if (params.requesterId) {
      workQuery = query(collection(db, 'work_requests'), where('requesterId', '==', params.requesterId), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
    } else if (params.status) {
      workQuery = query(collection(db, 'work_requests'), where('status', '==', params.status), orderBy('createdAt', 'desc'), fsLimit(Math.min(params.limit || 50, 200)));
    }

    const snapshot = await getDocs(workQuery);
    return snapshot.docs.map((snap) => mapWorkRequestRow({ id: snap.id, ...(snap.data() || {}) }));
  },

  async getRequestById(id: string): Promise<WorkRequest | undefined> {
    const requestId = String(id || '').trim();
    if (!requestId) return undefined;

    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/api/work_requests?eq.id=${encodeURIComponent(requestId)}&limit=1`, {}, token);
      const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
      if (row) {
        const [normalizedRow] = await attachRequestFirebaseIds([row]);
        const request = mapWorkRequestRow(normalizedRow);
        await supabaseMirror.upsert('work_requests', request.id, request);
        return request;
      }
      return undefined;
    }

    if (canUseDirectSupabase()) {
      const res = await supabase.from('work_requests').select('*').eq('id', requestId).limit(1);
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      if (!res.data?.length) return undefined;
      const [normalizedRow] = await attachRequestFirebaseIds([res.data[0]]);
      const request = mapWorkRequestRow(normalizedRow);
      await supabaseMirror.upsert('work_requests', request.id, request);
      return request;
    }

    if (!shouldUseFirestoreFallback()) return undefined;

    const snap = await getDoc(doc(db, 'work_requests', requestId));
    if (!snap.exists()) return undefined;
    return mapWorkRequestRow({ id: snap.id, ...(snap.data() || {}) });
  },

  async getProviderIncomingJobs(providerId: string): Promise<Job[]> {
    const requests = await workService.getRequests({
      targetProviderId: providerId,
      status: 'open',
      limit: 50
    });
    return requests.map(mapWorkRequestToJob);
  },

  async getProviderActiveJobs(providerId: string): Promise<Job[]> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const resolvedProviderId = await resolveBackendUserId(providerId);
      const res = await backendFetch(
        `/api/work_contracts?eq.provider_id=${encodeURIComponent(resolvedProviderId || providerId)}&in.status=active,pending,disputed&order=updated_at.desc&limit=50`,
        {},
        token
      );
      return (Array.isArray(res?.data) ? res.data : []).map(mapContractRowToJob);
    }

    if (canUseDirectSupabase()) {
      const resolvedProviderId = await resolveSupabaseUserId(providerId);
      const res = await supabase
        .from('work_contracts')
        .select('*')
        .eq('provider_id', resolvedProviderId || providerId)
        .in('status', ['active', 'pending', 'disputed'])
        .order('updated_at', { ascending: false })
        .limit(50);
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const normalizedRows = await attachFirebaseIdsToRows(res.data || [], [
        { sourceField: 'provider_id', targetField: 'provider_firebase_uid' },
        { sourceField: 'client_id', targetField: 'client_firebase_uid' }
      ]);
      return normalizedRows.map(mapContractRowToJob);
    }

    if (!shouldUseFirestoreFallback()) return [];

    const snapshot = await getDocs(
      query(
        collection(db, 'work_contracts'),
        where('providerId', '==', providerId),
        where('status', 'in', ['active', 'pending', 'disputed']),
        orderBy('updatedAt', 'desc'),
        fsLimit(50)
      )
    );

    return snapshot.docs.map((snap) => mapContractRowToJob({ id: snap.id, ...(snap.data() || {}) }));
  },

  async getLegacyServices(params: ListWorkListingsParams = {}): Promise<Service[]> {
    const listings = await workService.getListings(params);
    return listings.map(mapWorkListingToService);
  },

  async submitListingForReview(listingId: string): Promise<WorkListing> {
    let targetListingId = listingId;
    if (!isUuidLike(targetListingId)) {
      const promoted = await promoteLegacyListingToCanonical(targetListingId).catch((error) => {
        console.warn('Legacy listing promotion failed before submit:', error);
        return undefined;
      });
      if (promoted?.id) {
        targetListingId = promoted.id;
      }
    }

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch(`/work/listings/${targetListingId}/submit`, {
          method: 'POST'
        }, token);
        const listing = mapWorkListingRow(res?.data);
        if (listing.id) {
          return persistMirroredListing(listing);
        }
      } catch (error) {
        console.warn('Work listing backend submit failed, attempting direct fallback:', error);
      }
    }

    return workService.updateListing(targetListingId, {
      status: 'pending_review',
      reviewNotes: undefined,
      submittedAt: new Date().toISOString()
    });
  },

  async approveListing(listingId: string, reviewNotes?: string): Promise<WorkListing> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/listings/${listingId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes })
      }, token);
      const listing = mapWorkListingRow(res?.data);
      await supabaseMirror.upsert('work_listings', listing.id, listing);
      await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
      await mirrorLegacyService(listing);
      return listing;
    }

    return workService.updateListing(listingId, {
      status: 'published',
      visibility: 'public',
      reviewNotes,
      reviewedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    });
  },

  async rejectListing(listingId: string, reviewNotes?: string): Promise<WorkListing> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/listings/${listingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes })
      }, token);
      const listing = mapWorkListingRow(res?.data);
      await supabaseMirror.upsert('work_listings', listing.id, listing);
      await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
      await mirrorLegacyService(listing);
      return listing;
    }

    return workService.updateListing(listingId, {
      status: 'rejected',
      reviewNotes,
      reviewedAt: new Date().toISOString()
    });
  },

  async acceptRequest(requestId: string): Promise<{ request: WorkRequest; contract?: any }> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/requests/${requestId}/accept`, {
        method: 'POST'
      }, token);
      const request = mapWorkRequestRow(res?.data?.request || res?.data);
      await supabaseMirror.upsert('work_requests', request.id, request);
      if (res?.data?.contract?.id) {
        await supabaseMirror.upsert('work_contracts', res.data.contract.id, res.data.contract);
      }
      return {
        request,
        contract: res?.data?.contract || undefined
      };
    }

    if (canUseDirectSupabase()) {
      const res = await supabase
        .from('work_requests')
        .update({
          status: 'matched',
          accepted_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select('*')
        .single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachRequestFirebaseIds([res.data]);
      const request = mapWorkRequestRow(normalizedRow);
      const contract = await findOrCreateContractForRequest(request).catch(() => undefined);
      await supabaseMirror.upsert('work_requests', request.id, request);
      if (contract?.id) {
        await supabaseMirror.upsert('work_contracts', contract.id, contract);
      }
      return { request, contract };
    }

    throw new Error('Unable to accept work request: no backend or direct Supabase access available.');
  },

  async declineRequest(requestId: string, reason?: string): Promise<{ request: WorkRequest; contract?: any }> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/requests/${requestId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }, token);
      const request = mapWorkRequestRow(res?.data?.request || res?.data);
      await supabaseMirror.upsert('work_requests', request.id, request);
      if (res?.data?.contract?.id) {
        await supabaseMirror.upsert('work_contracts', res.data.contract.id, res.data.contract);
      }
      return {
        request,
        contract: res?.data?.contract || undefined
      };
    }

    if (canUseDirectSupabase()) {
      const res = await supabase
        .from('work_requests')
        .update({
          status: 'cancelled',
          declined_at: new Date().toISOString(),
          details: { declineReason: reason }
        })
        .eq('id', requestId)
        .select('*')
        .single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachRequestFirebaseIds([res.data]);
      const request = mapWorkRequestRow(normalizedRow);
      const contracts = await contractService.getContracts({ providerId: request.targetProviderId, limit: 200 }).catch(() => []);
      const contract = contracts.find((entry) => entry.requestId === request.id);
      if (contract) {
        await contractService.updateContract(contract.id, {
          status: 'cancelled',
          terms: {
            ...(contract.terms || {}),
            declineReason: reason
          }
        }).catch(() => undefined);
        if ((contract.escrowHeld || 0) > 0) {
          await escrowService.refund({
            contractId: contract.id,
            amount: contract.escrowHeld || 0,
            payerId: request.requesterId,
            payeeId: request.targetProviderId,
            currency: contract.currency,
            metadata: {
              requestId: request.id,
              reason
            }
          }).catch(() => undefined);
        }
      }
      await supabaseMirror.upsert('work_requests', request.id, request);
      return { request, contract };
    }

    throw new Error('Unable to decline work request: no backend or direct Supabase access available.');
  },

  async getProviderSummary(providerId?: string): Promise<ProviderWorkspaceSummary> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const query = new URLSearchParams();
      if (providerId) query.set('providerId', providerId);
      const res = await backendFetch(`/work/provider/summary${query.toString() ? `?${query.toString()}` : ''}`, {}, token);
      return res?.data as ProviderWorkspaceSummary;
    }

    if (canUseDirectSupabase()) {
      const resolvedProviderId = await resolveSupabaseUserId(providerId || auth.currentUser?.uid);
      if (!resolvedProviderId) {
        return {
          stats: { earnings: 0, activeJobs: 0, jobsCompleted: 0, averageRating: 0, responseRate: 0 },
          queues: { leads: 0, proposals: 0, activeContracts: 0, pendingListings: 0, pendingApplication: 0 },
          calendar: { upcomingBookings: 0 },
          escrow: { held: 0, released: 0, refunded: 0 },
          payouts: { available: 0, processing: 0, pendingRequests: 0, totalPaidOut: 0 }
        };
      }

      const [requestsRes, proposalsRes, contractsRes, listingsRes, applicationsRes, payoutRequestsRes, escrowRes] = await Promise.all([
        supabase.from('work_requests').select('status').eq('target_provider_id', resolvedProviderId).limit(500),
        supabase.from('work_proposals').select('status').eq('provider_id', resolvedProviderId).limit(500),
        supabase.from('work_contracts').select('status,total_amount,escrow_held,start_at,timezone').eq('provider_id', resolvedProviderId).limit(500),
        supabase.from('work_listings').select('status').eq('seller_id', resolvedProviderId).limit(200),
        supabase.from('work_provider_applications').select('status').eq('user_id', resolvedProviderId).limit(5),
        supabase.from('work_payout_requests').select('status,amount').eq('provider_id', resolvedProviderId).limit(200),
        supabase.from('work_escrow_ledger').select('action,amount,status').eq('payee_id', resolvedProviderId).limit(500)
      ]);

      const errors = [requestsRes.error, proposalsRes.error, contractsRes.error, listingsRes.error, applicationsRes.error, payoutRequestsRes.error, escrowRes.error].filter(Boolean);
      if (errors.length > 0) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), errors[0]);
      }

      const requests = requestsRes.data || [];
      const proposals = proposalsRes.data || [];
      const contracts = contractsRes.data || [];
      const listings = listingsRes.data || [];
      const applications = applicationsRes.data || [];
      const payoutRequests = payoutRequestsRes.data || [];
      const escrowRows = escrowRes.data || [];
      const completedContracts = contracts.filter((entry) => entry.status === 'completed');
      const activeContracts = contracts.filter((entry) => ['pending', 'active', 'disputed'].includes(String(entry.status || '')));
      const releasedTotal = escrowRows.filter((entry) => entry.action === 'release' && entry.status === 'succeeded').reduce((sum, entry) => sum + toNumber(entry.amount, 0), 0);
      const refundedTotal = escrowRows.filter((entry) => entry.action === 'refund' && entry.status === 'succeeded').reduce((sum, entry) => sum + toNumber(entry.amount, 0), 0);
      const totalPaidOut = payoutRequests.filter((entry) => entry.status === 'paid').reduce((sum, entry) => sum + toNumber(entry.amount, 0), 0);

      return {
        stats: {
          earnings: completedContracts.reduce((sum, entry) => sum + toNumber(entry.total_amount, 0), 0),
          activeJobs: activeContracts.length,
          jobsCompleted: completedContracts.length,
          averageRating: 4.8,
          responseRate: requests.length ? Number(((requests.filter((entry) => entry.status !== 'open').length / requests.length) * 100).toFixed(1)) : 100
        },
        queues: {
          leads: requests.filter((entry) => entry.status === 'open').length,
          proposals: proposals.filter((entry) => entry.status === 'pending').length,
          activeContracts: activeContracts.length,
          pendingListings: listings.filter((entry) => entry.status === 'pending_review').length,
          pendingApplication: applications.filter((entry) => ['submitted', 'under_review', 'resubmission_requested'].includes(String(entry.status || ''))).length
        },
        calendar: {
          upcomingBookings: activeContracts.length,
          nextBookingAt: activeContracts[0]?.start_at || undefined,
          timezone: activeContracts[0]?.timezone || 'UTC'
        },
        escrow: {
          held: activeContracts.reduce((sum, entry) => sum + toNumber(entry.escrow_held, 0), 0),
          released: releasedTotal,
          refunded: refundedTotal
        },
        payouts: {
          available: Math.max(0, releasedTotal - totalPaidOut),
          processing: payoutRequests.filter((entry) => entry.status === 'processing').reduce((sum, entry) => sum + toNumber(entry.amount, 0), 0),
          pendingRequests: payoutRequests.filter((entry) => entry.status === 'pending').length,
          totalPaidOut
        }
      };
    }

    throw new Error('Unable to load provider summary: no backend or direct Supabase access available.');
  }
};

export default workService;
