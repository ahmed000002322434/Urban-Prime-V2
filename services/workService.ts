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
import supabaseMirror from './supabaseMirror';
import type {
  Job,
  Service,
  ServicePricingModel,
  User,
  WorkContractStatus,
  WorkFulfillmentKind,
  WorkListing,
  WorkMode,
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
    sellerId: String(row?.seller_id || row?.sellerId || providerSnapshot?.id || ''),
    sellerPersonaId: row?.seller_persona_id || row?.sellerPersonaId || undefined,
    providerSnapshot: providerSnapshot?.id
      ? {
          id: String(providerSnapshot.id),
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
    availability: toObject(row?.availability),
    riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
    status: (row?.status || 'draft') as WorkListing['status'],
    visibility: (row?.visibility || 'public') as WorkListing['visibility'],
    publishedAt: row?.published_at || row?.publishedAt || undefined,
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || row?.updatedAt || undefined
  };
};

const mapWorkRequestRow = (row: any): WorkRequest => ({
  id: String(row?.id || ''),
  requesterId: String(row?.requester_id || row?.requesterId || ''),
  requesterPersonaId: row?.requester_persona_id || row?.requesterPersonaId || undefined,
  requesterSnapshot: row?.requester_snapshot || row?.requesterSnapshot || undefined,
  title: String(row?.title || 'Service request'),
  brief: String(row?.brief || ''),
  listingId: row?.listing_id || row?.listingId || undefined,
  targetProviderId: row?.target_provider_id || row?.targetProviderId || undefined,
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
  riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
  status: (row?.status || 'open') as WorkRequest['status'],
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt || undefined
});

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
  availability: {},
  riskScore: service.riskScore || 0,
  status: 'published',
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
      id: String(row?.client_id || row?.clientId || ''),
      name: String(row?.client_snapshot?.name || 'Client'),
      avatar: String(row?.client_snapshot?.avatar || '/icons/urbanprime.svg')
    },
    providerId: String(row?.provider_id || row?.providerId || ''),
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
  status: request.status === 'closed' ? 'cancelled' : 'pending',
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
      const token = await getBackendToken();
      const res = await backendFetch('/work/listings', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);

      const listing = mapWorkListingRow(res?.data);
      await supabaseMirror.upsert('work_listings', listing.id, listing);
      await supabaseMirror.upsert('services', listing.id, mapWorkListingToService(listing));
      await mirrorLegacyService(listing);
      return listing;
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
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/api/work_listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }, token);
      const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
      const listing = mapWorkListingRow({ id: listingId, ...row });
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
      const token = await getBackendToken();
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (params.sellerId) queryParams.set('sellerId', params.sellerId);
      if (params.mode) queryParams.set('mode', params.mode);
      if (params.category) queryParams.set('category', params.category);
      if (params.search) queryParams.set('q', params.search);
      queryParams.set('limit', String(Math.min(params.limit || 50, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));

      const res = await backendFetch(`/work/listings?${queryParams.toString()}`, {}, token);
      const listings = (Array.isArray(res?.data) ? res.data : []).map(mapWorkListingRow);
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
      const token = await getBackendToken();
      const res = await backendFetch(`/work/listings/${id}`, {}, token);
      if (!res?.data) return undefined;
      const listing = mapWorkListingRow(res.data);
      await supabaseMirror.upsert('work_listings', listing.id, listing);
      return listing;
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

  async createRequest(input: Partial<WorkRequest>, user: User): Promise<WorkRequest> {
    const payload = {
      title: input.title || 'New request',
      brief: input.brief || '',
      listingId: input.listingId || undefined,
      targetProviderId: input.targetProviderId || undefined,
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
      riskScore: input.riskScore ?? 0,
      status: input.status || 'open',
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
        body: JSON.stringify(payload)
      }, token);
      const request = mapWorkRequestRow(res?.data);
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
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (params.requesterId) queryParams.set('requesterId', params.requesterId);
      if (params.targetProviderId) queryParams.set('targetProviderId', params.targetProviderId);
      if (params.mode) queryParams.set('mode', params.mode);
      if (params.category) queryParams.set('category', params.category);
      queryParams.set('limit', String(Math.min(params.limit || 50, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));

      const res = await backendFetch(`/work/requests?${queryParams.toString()}`, {}, token);
      return (Array.isArray(res?.data) ? res.data : []).map(mapWorkRequestRow);
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
      const res = await backendFetch(
        `/api/work_contracts?eq.provider_id=${encodeURIComponent(providerId)}&in.status=active,pending,disputed&order=updated_at.desc&limit=50`,
        {},
        token
      );
      return (Array.isArray(res?.data) ? res.data : []).map(mapContractRowToJob);
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
  }
};

export default workService;
