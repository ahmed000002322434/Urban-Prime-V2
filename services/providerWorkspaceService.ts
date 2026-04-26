import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import {
  attachFirebaseIdsToRows,
  canUseDirectSupabaseTables,
  ensureSupabaseUserRecord,
  getDirectSupabaseSetupMessage,
  resolveSupabaseUserId
} from './supabaseAppBridge';
import supabaseMirror from './supabaseMirror';
import supabase from '../utils/supabase';
import workService, { mapWorkListingToService } from './workService';
import proposalService from './proposalService';
import contractService from './contractService';
import { serviceService, userService } from './itemService';
import { ensureCriticalBackendReady } from './runtimeService';
import type {
  Contract,
  ProviderApplication,
  ProviderApplicationStatus,
  ProviderWorkspaceSummary,
  Service,
  ServiceProviderProfile,
  User,
  WorkLocation,
  WorkListing,
  WorkPortfolioItem,
  WorkRequest,
  WorkServiceAreaCoverage
} from '../types';

export interface ProviderApplicationInput {
  providerPersonaId?: string;
  businessName?: string;
  businessType?: string;
  bio?: string;
  serviceCategories: string[];
  languages?: string[];
  yearsExperience?: number;
  serviceArea?: WorkServiceAreaCoverage[];
  responseSlaHours?: number;
  payoutReady?: boolean;
  website?: string;
  documents?: ProviderApplication['documents'];
  portfolio?: WorkPortfolioItem[];
  onboardingProgress?: number;
  notes?: string;
}

export interface ServiceBookingInput {
  title?: string;
  brief?: string;
  packageId?: string;
  amount?: number;
  desiredDate?: string;
  desiredTime?: string;
  scheduledAt?: string;
  notes?: string;
  requirements?: string[];
  serviceAddress?: WorkLocation & {
    label?: string;
    postalCode?: string;
    addressLine2?: string;
  };
}

export interface QuoteRequestInput {
  title?: string;
  brief: string;
  budgetMin?: number;
  budgetMax?: number;
  desiredDate?: string;
  desiredTime?: string;
  requirements?: string[];
  location?: WorkLocation;
}

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toArray = <T = any>(value: unknown): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const toObject = <T extends Record<string, any> = Record<string, any>>(value: unknown): T => {
  if (!value) return {} as T;
  if (typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
};

const mapProviderApplicationRow = (row: any): ProviderApplication => ({
  id: String(row?.id || ''),
  userId: String(row?.user_firebase_uid || row?.user_id || row?.userId || ''),
  userSupabaseId: row?.user_id || row?.userSupabaseId || undefined,
  applicantName: row?.user_name || row?.applicantName || undefined,
  applicantEmail: row?.user_email || row?.applicantEmail || undefined,
  applicantAvatar: row?.user_avatar_url || row?.applicantAvatar || undefined,
  providerPersonaId: row?.provider_persona_id || row?.providerPersonaId || undefined,
  businessName: row?.business_name || row?.businessName || undefined,
  businessType: row?.business_type || row?.businessType || undefined,
  bio: row?.bio || undefined,
  serviceCategories: toArray<string>(row?.service_categories || row?.serviceCategories).map((entry) => String(entry)),
  languages: toArray<string>(row?.languages).map((entry) => String(entry)),
  yearsExperience: row?.years_experience !== undefined ? toNumber(row.years_experience) : row?.yearsExperience !== undefined ? toNumber(row.yearsExperience) : undefined,
  serviceArea: toArray<WorkServiceAreaCoverage>(row?.service_area || row?.serviceArea),
  responseSlaHours: row?.response_sla_hours !== undefined ? toNumber(row.response_sla_hours) : row?.responseSlaHours !== undefined ? toNumber(row.responseSlaHours) : undefined,
  payoutReady: Boolean(row?.payout_ready ?? row?.payoutReady),
  website: row?.website || undefined,
  documents: toArray(row?.documents),
  portfolio: toArray<WorkPortfolioItem>(row?.portfolio),
  onboardingProgress: row?.onboarding_progress !== undefined ? toNumber(row.onboarding_progress) : row?.onboardingProgress !== undefined ? toNumber(row.onboardingProgress) : undefined,
  status: (row?.status || 'draft') as ProviderApplicationStatus,
  notes: row?.notes || undefined,
  reviewerNotes: row?.reviewer_notes || row?.reviewerNotes || undefined,
  submittedAt: row?.submitted_at || row?.submittedAt || undefined,
  reviewedAt: row?.reviewed_at || row?.reviewedAt || undefined,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt || undefined
});

const canUseDirectSupabase = () => !isBackendConfigured() && canUseDirectSupabaseTables();

const toSupabaseError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const attachApplicationFirebaseIds = async (rows: any[]) =>
  attachFirebaseIdsToRows(rows, [{ sourceField: 'user_id', targetField: 'user_firebase_uid' }]);

const canUseDirectSupabaseFallback = () => canUseDirectSupabaseTables();

const getProviderAuthUserSeed = async (): Promise<User> => {
  const firebaseUid = auth.currentUser?.uid;
  if (!firebaseUid) {
    throw new Error('You must be signed in before submitting a provider application.');
  }

  const existingProfile = await userService.getUserById(firebaseUid).catch(() => null);
  if (existingProfile) return existingProfile;

  return {
    id: firebaseUid,
    name: auth.currentUser?.displayName || 'Member',
    email: auth.currentUser?.email || '',
    avatar: auth.currentUser?.photoURL || '/icons/urbanprime.svg',
    phone: '',
    status: 'active',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: new Date().toISOString()
  };
};

const persistMirroredProviderApplication = async (application: ProviderApplication) => {
  if (!application.id) return application;
  await supabaseMirror.upsert('work_provider_applications', application.id, application);
  if (shouldUseFirestoreFallback()) {
    await setDoc(doc(db, 'work_provider_applications', application.id), application, { merge: true });
  }
  return application;
};

const saveProviderApplicationDirect = async (
  input: ProviderApplicationInput,
  options: { submit?: boolean } = {},
  applicationId?: string
): Promise<ProviderApplication> => {
  const userSeed = await getProviderAuthUserSeed();
  const userRow = await ensureSupabaseUserRecord(userSeed);
  const submittedAt = options.submit === false ? null : new Date().toISOString();
  const rowPayload = {
    user_id: userRow.id,
    provider_persona_id: input.providerPersonaId || null,
    business_name: input.businessName || null,
    business_type: input.businessType || null,
    bio: input.bio || null,
    service_categories: input.serviceCategories || [],
    languages: input.languages || [],
    years_experience: input.yearsExperience ?? 0,
    service_area: input.serviceArea || [],
    response_sla_hours: input.responseSlaHours ?? 24,
    payout_ready: Boolean(input.payoutReady),
    website: input.website || null,
    documents: input.documents || [],
    portfolio: input.portfolio || [],
    onboarding_progress: input.onboardingProgress ?? 0,
    status: options.submit === false ? 'draft' : 'submitted',
    notes: input.notes || null,
    submitted_at: submittedAt
  };

  let existingRow: any = null;
  if (applicationId) {
    const lookup = await supabase
      .from('work_provider_applications')
      .select('*')
      .eq('id', applicationId)
      .limit(1);
    if (lookup.error) {
      throw toSupabaseError(getDirectSupabaseSetupMessage(), lookup.error);
    }
    existingRow = lookup.data?.[0] || null;
  }

  if (!existingRow) {
    const lookup = await supabase
      .from('work_provider_applications')
      .select('*')
      .eq('user_id', userRow.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (lookup.error) {
      throw toSupabaseError(getDirectSupabaseSetupMessage(), lookup.error);
    }
    existingRow = lookup.data?.[0] || null;
  }

  const res = existingRow
    ? await supabase
        .from('work_provider_applications')
        .update(rowPayload)
        .eq('id', existingRow.id)
        .select('*')
        .single()
    : await supabase
        .from('work_provider_applications')
        .insert(rowPayload)
        .select('*')
        .single();

  if (res.error || !res.data) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }

  const normalizedRows = await attachApplicationFirebaseIds([res.data]);
  return mapProviderApplicationRow(normalizedRows[0]);
};

const updateProviderApplicationDirect = async (
  applicationId: string,
  updates: Partial<ProviderApplication>
): Promise<ProviderApplication> => {
  const rowUpdates: Record<string, any> = {};
  if (updates.providerPersonaId !== undefined) rowUpdates.provider_persona_id = updates.providerPersonaId;
  if (updates.businessName !== undefined) rowUpdates.business_name = updates.businessName;
  if (updates.businessType !== undefined) rowUpdates.business_type = updates.businessType;
  if (updates.bio !== undefined) rowUpdates.bio = updates.bio;
  if (updates.serviceCategories !== undefined) rowUpdates.service_categories = updates.serviceCategories;
  if (updates.languages !== undefined) rowUpdates.languages = updates.languages;
  if (updates.yearsExperience !== undefined) rowUpdates.years_experience = updates.yearsExperience;
  if (updates.serviceArea !== undefined) rowUpdates.service_area = updates.serviceArea;
  if (updates.responseSlaHours !== undefined) rowUpdates.response_sla_hours = updates.responseSlaHours;
  if (updates.payoutReady !== undefined) rowUpdates.payout_ready = updates.payoutReady;
  if (updates.website !== undefined) rowUpdates.website = updates.website;
  if (updates.documents !== undefined) rowUpdates.documents = updates.documents;
  if (updates.portfolio !== undefined) rowUpdates.portfolio = updates.portfolio;
  if (updates.onboardingProgress !== undefined) rowUpdates.onboarding_progress = updates.onboardingProgress;
  if (updates.status !== undefined) rowUpdates.status = updates.status;
  if (updates.notes !== undefined) rowUpdates.notes = updates.notes;
  if (updates.reviewerNotes !== undefined) rowUpdates.reviewer_notes = updates.reviewerNotes;
  if (updates.submittedAt !== undefined) rowUpdates.submitted_at = updates.submittedAt;
  if (updates.reviewedAt !== undefined) rowUpdates.reviewed_at = updates.reviewedAt;
  if (updates.status && ['approved', 'rejected', 'under_review', 'resubmission_requested'].includes(updates.status)) {
    rowUpdates.reviewed_at = updates.reviewedAt || new Date().toISOString();
  }

  const res = await supabase
    .from('work_provider_applications')
    .update(rowUpdates)
    .eq('id', applicationId)
    .select('*')
    .single();
  if (res.error || !res.data) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }

  const normalizedRows = await attachApplicationFirebaseIds([res.data]);
  return mapProviderApplicationRow(normalizedRows[0]);
};

const getProviderApplicationByIdDirect = async (applicationId: string): Promise<ProviderApplication | undefined> => {
  const res = await supabase
    .from('work_provider_applications')
    .select('*')
    .eq('id', applicationId)
    .limit(1);
  if (res.error) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  if (!res.data?.length) return undefined;
  const normalizedRows = await attachApplicationFirebaseIds([res.data[0]]);
  return mapProviderApplicationRow(normalizedRows[0]);
};

const listProviderApplicationsDirect = async (
  params: { userId?: string; status?: ProviderApplicationStatus; limit?: number; offset?: number } = {}
): Promise<ProviderApplication[]> => {
  const userId = await resolveSupabaseUserId(params.userId);
  let queryBuilder = supabase.from('work_provider_applications').select('*').order('updated_at', { ascending: false });
  if (userId) queryBuilder = queryBuilder.eq('user_id', userId);
  if (params.status) queryBuilder = queryBuilder.eq('status', params.status);
  const limit = Math.min(params.limit || 100, 200);
  const offset = Math.max(params.offset || 0, 0);
  const res = await queryBuilder.range(offset, offset + limit - 1);
  if (res.error) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
  const normalizedRows = await attachApplicationFirebaseIds(res.data || []);
  return normalizedRows.map(mapProviderApplicationRow);
};

const buildProviderProfile = (user: User | null, application?: ProviderApplication | null): ServiceProviderProfile | undefined => {
  if (!user && !application) return undefined;
  const baseBio = application?.bio || user?.providerProfile?.bio || user?.about || '';
  return {
    bio: baseBio,
    skills: user?.providerProfile?.skills || [],
    portfolioImageUrls: application?.portfolio?.map((entry) => entry.imageUrl).filter(Boolean) as string[] || user?.providerProfile?.portfolioImageUrls || [],
    serviceArea: application?.serviceArea?.map((entry) => entry.label).join(', ') || user?.providerProfile?.serviceArea || user?.city || 'Flexible',
    availabilityNotes: user?.providerProfile?.availabilityNotes,
    status: application?.status === 'approved' ? 'approved' : application?.status === 'rejected' ? 'rejected' : user?.providerProfile?.status || 'pending_approval',
    serviceCategories: application?.serviceCategories || user?.providerProfile?.serviceCategories || [],
    applicationId: application?.id || user?.providerProfile?.applicationId,
    applicationStatus: application?.status || user?.providerProfile?.applicationStatus,
    businessName: application?.businessName || user?.businessName || user?.providerProfile?.businessName,
    businessType: application?.businessType || user?.providerProfile?.businessType,
    website: application?.website || user?.providerProfile?.website,
    yearsExperience: application?.yearsExperience || user?.yearsInBusiness || user?.providerProfile?.yearsExperience,
    responseSlaHours: application?.responseSlaHours || user?.providerProfile?.responseSlaHours,
    payoutReady: application?.payoutReady ?? user?.providerProfile?.payoutReady,
    verificationLevel: application?.status === 'approved' ? 'verified' : user?.providerProfile?.verificationLevel || 'basic',
    languages: application?.languages || user?.providerProfile?.languages,
    portfolio: application?.portfolio || user?.providerProfile?.portfolio,
    documents: application?.documents || user?.providerProfile?.documents,
    serviceAreaCoverage: application?.serviceArea || user?.providerProfile?.serviceAreaCoverage,
    weeklyAvailability: user?.providerProfile?.weeklyAvailability,
    trustBadges: user?.providerProfile?.trustBadges,
    onboardingProgress: application?.onboardingProgress || user?.providerProfile?.onboardingProgress,
    onboardingChecklist: user?.providerProfile?.onboardingChecklist,
    notes: application?.reviewerNotes || user?.providerProfile?.notes
  };
};

const ensureNotSelfServiceAction = (service: Service, user: User) => {
  if (String(service.provider?.id || '') === String(user.id || '')) {
    throw new Error('You cannot order or request a quote on your own service.');
  }
};

const mapSupabaseUserBridgeRow = (row: any, fallbackFirebaseUid: string): User => ({
  id: String(row?.firebase_uid || fallbackFirebaseUid || row?.id || ''),
  name: String(row?.name || 'Provider'),
  email: String(row?.email || ''),
  avatar: String(row?.avatar_url || '/icons/urbanprime.svg'),
  phone: String(row?.phone || ''),
  status: (row?.status || 'active') as User['status'],
  following: [],
  followers: [],
  wishlist: [],
  cart: [],
  badges: [],
  memberSince: row?.created_at || new Date().toISOString(),
  businessName: row?.business_name || undefined,
  businessDescription: row?.business_description || undefined,
  about: row?.about || undefined,
  city: row?.city || undefined,
  country: row?.country || undefined
});

const buildSyntheticStorefrontUser = (
  providerId: string,
  services: Service[],
  application?: ProviderApplication | null
): User | null => {
  const firstService = services.find((entry) => entry?.provider);
  const provider = firstService?.provider;
  const displayName =
    application?.businessName ||
    firstService?.providerProfile?.businessName ||
    provider?.name ||
    'Provider';

  if (!displayName && !providerId) return null;

  return {
    id: providerId || String(provider?.id || ''),
    name: displayName,
    email: '',
    avatar: String(provider?.avatar || '/icons/urbanprime.svg'),
    phone: '',
    status: 'active',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: new Date().toISOString(),
    about: application?.bio || firstService?.providerProfile?.bio || undefined,
    businessName: application?.businessName || firstService?.providerProfile?.businessName
  };
};

export const providerApplicationService = {
  async submitApplication(input: ProviderApplicationInput, options: { submit?: boolean } = {}): Promise<ProviderApplication> {
    const payload = {
      ...input,
      submit: options.submit ?? true,
      status: options.submit === false ? 'draft' : 'submitted'
    };

    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch('/work/provider-applications', {
          method: 'POST',
          body: JSON.stringify(payload)
        }, token);
        const application = mapProviderApplicationRow(res?.data);
        if (application.id) {
          return persistMirroredProviderApplication(application);
        }
      } catch (error) {
        console.warn('Provider application backend submit failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      const application = await saveProviderApplicationDirect(input, options);
      return persistMirroredProviderApplication(application);
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to save provider application: no backend or firestore fallback available.');
    }

    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'work_provider_applications'), {
      ...input,
      status: options.submit === false ? 'draft' : 'submitted',
      createdAt: now,
      updatedAt: now
    });
    return mapProviderApplicationRow({ id: docRef.id, ...input, status: options.submit === false ? 'draft' : 'submitted', createdAt: now, updatedAt: now });
  },

  async updateApplication(applicationId: string, updates: Partial<ProviderApplication>): Promise<ProviderApplication> {
    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch(`/work/provider-applications/${applicationId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        }, token);
        const application = mapProviderApplicationRow(res?.data);
        if (application.id) {
          return persistMirroredProviderApplication(application);
        }
      } catch (error) {
        console.warn('Provider application backend update failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      const application = await updateProviderApplicationDirect(applicationId, updates);
      return persistMirroredProviderApplication(application);
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to update provider application: no backend or firestore fallback available.');
    }

    await setDoc(doc(db, 'work_provider_applications', applicationId), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    const snap = await getDoc(doc(db, 'work_provider_applications', applicationId));
    return mapProviderApplicationRow({ id: applicationId, ...(snap.data() || {}) });
  },

  async getApplicationById(applicationId: string): Promise<ProviderApplication | undefined> {
    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const res = await backendFetch(`/work/provider-applications/${applicationId}`, {}, token);
        if (res?.data) return mapProviderApplicationRow(res.data);
      } catch (error) {
        console.warn('Provider application backend fetch failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      return getProviderApplicationByIdDirect(applicationId);
    }

    if (!shouldUseFirestoreFallback()) return undefined;
    const snap = await getDoc(doc(db, 'work_provider_applications', applicationId));
    if (!snap.exists()) return undefined;
    return mapProviderApplicationRow({ id: snap.id, ...(snap.data() || {}) });
  },

  async listApplications(params: { userId?: string; status?: ProviderApplicationStatus; limit?: number; offset?: number } = {}): Promise<ProviderApplication[]> {
    if (isBackendConfigured()) {
      try {
        const token = await getBackendToken();
        const backendUserId = params.userId
          ? (await resolveSupabaseUserId(params.userId).catch(() => undefined)) || params.userId
          : undefined;
        const queryParams = new URLSearchParams();
        if (backendUserId) queryParams.set('userId', backendUserId);
        if (params.status) queryParams.set('status', params.status);
        queryParams.set('limit', String(Math.min(params.limit || 100, 200)));
        queryParams.set('offset', String(Math.max(params.offset || 0, 0)));
        const res = await backendFetch(`/work/provider-applications?${queryParams.toString()}`, {}, token);
        return (Array.isArray(res?.data) ? res.data : []).map(mapProviderApplicationRow);
      } catch (error) {
        console.warn('Provider application backend list failed, attempting direct fallback:', error);
      }
    }

    if (canUseDirectSupabaseFallback()) {
      return listProviderApplicationsDirect(params);
    }

    if (!shouldUseFirestoreFallback()) return [];
    let q = query(collection(db, 'work_provider_applications'), orderBy('updatedAt', 'desc'));
    if (params.userId) {
      q = query(collection(db, 'work_provider_applications'), where('userId', '==', params.userId), orderBy('updatedAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((snap) => mapProviderApplicationRow({ id: snap.id, ...(snap.data() || {}) }));
  },

  async getMyApplication(userId?: string): Promise<ProviderApplication | undefined> {
    const rows = await providerApplicationService.listApplications(userId ? { userId, limit: 5 } : { limit: 5 });
    return rows[0];
  },

  async reviewApplication(applicationId: string, status: Extract<ProviderApplicationStatus, 'approved' | 'rejected' | 'under_review' | 'resubmission_requested'>, reviewerNotes?: string): Promise<ProviderApplication> {
    return providerApplicationService.updateApplication(applicationId, {
      status,
      reviewerNotes
    });
  }
};

export const providerWorkspaceService = {
  async getWorkspaceSummary(providerId?: string): Promise<ProviderWorkspaceSummary> {
    try {
      return await workService.getProviderSummary(providerId);
    } catch {
      const targetProviderId = providerId || auth.currentUser?.uid || '';
      const [contracts, requests, proposals] = await Promise.all([
        contractService.getContracts({ providerId: targetProviderId, limit: 300 }),
        workService.getRequests({ targetProviderId, limit: 300 }),
        proposalService.getProviderProposals(targetProviderId)
      ]);
      const completed = contracts.filter((entry) => entry.status === 'completed');
      const active = contracts.filter((entry) => ['pending', 'active', 'disputed'].includes(entry.status));
      return {
        stats: {
          earnings: completed.reduce((sum, entry) => sum + toNumber(entry.totalAmount, 0), 0),
          activeJobs: active.length,
          jobsCompleted: completed.length,
          averageRating: 4.7,
          responseRate: requests.length ? Number(((requests.filter((entry) => entry.status !== 'open').length / requests.length) * 100).toFixed(1)) : 100
        },
        queues: {
          leads: requests.filter((entry) => entry.status === 'open').length,
          proposals: proposals.filter((entry) => entry.status === 'pending').length,
          activeContracts: active.length,
          pendingListings: 0,
          pendingApplication: 0
        },
        calendar: {
          upcomingBookings: active.length,
          nextBookingAt: active[0]?.startAt,
          timezone: active[0]?.timezone || 'UTC'
        },
        escrow: {
          held: active.reduce((sum, entry) => sum + toNumber(entry.escrowHeld, 0), 0),
          released: 0,
          refunded: 0
        },
        payouts: {
          available: completed.reduce((sum, entry) => sum + toNumber(entry.totalAmount, 0), 0),
          processing: 0,
          pendingRequests: 0,
          totalPaidOut: 0
        }
      };
    }
  },

  async getProviderListings(providerId: string): Promise<WorkListing[]> {
    return workService.getListings({ sellerId: providerId, limit: 200 });
  },

  async submitListingForReview(listingId: string): Promise<WorkListing> {
    return workService.submitListingForReview(listingId);
  },

  async createServiceBooking(service: Service, input: ServiceBookingInput, user: User): Promise<{ request: WorkRequest; contract: Contract; escrow?: any }> {
    ensureNotSelfServiceAction(service, user);
    await ensureCriticalBackendReady('Service booking');

    const token = await getBackendToken();
    const res = await backendFetch('/work/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listingId: service.id,
        title: input.title || `${service.title} booking`,
        brief: input.brief || input.notes || `Booking for ${service.title}`,
        packageId: input.packageId || service.pricingModels?.[0]?.description,
        amount: input.amount ?? service.pricingModels?.[0]?.price ?? 0,
        desiredDate: input.desiredDate,
        desiredTime: input.desiredTime,
        scheduledAt: input.scheduledAt,
        notes: input.notes,
        requirements: input.requirements || [],
        serviceAddress: input.serviceAddress,
        location: input.serviceAddress,
        requesterPersonaId: user.activePersonaId
      })
    }, token);

    const request = toObject<any>(res?.data?.request);
    const contract = toObject<any>(res?.data?.contract);
    return {
      request: {
        ...request,
        id: String(request.id || '')
      } as WorkRequest,
      contract: {
        ...contract,
        id: String(contract.id || '')
      } as Contract,
      escrow: res?.data?.escrow
    };
  },

  async createQuoteRequest(service: Service, input: QuoteRequestInput, user: User): Promise<WorkRequest> {
    ensureNotSelfServiceAction(service, user);
    return workService.createRequest({
      title: input.title || `${service.title} quote request`,
      brief: input.brief,
      listingId: service.id,
      targetProviderId: service.provider.id,
      category: service.category,
      mode: service.mode || 'hybrid',
      fulfillmentKind: service.fulfillmentKind || 'hybrid',
      budgetMin: input.budgetMin ?? service.pricingModels?.[0]?.price ?? 0,
      budgetMax: input.budgetMax ?? input.budgetMin ?? service.pricingModels?.[0]?.price ?? 0,
      currency: service.currency || service.pricingModels?.[0]?.currency || 'USD',
      timezone: service.timezone,
      location: input.location || {},
      requirements: input.requirements || [],
      requestType: 'quote',
      details: {
        requestType: 'quote',
        desiredDate: input.desiredDate,
        desiredTime: input.desiredTime
      },
      requesterPersonaId: user.activePersonaId
    }, user);
  },

  async acceptLead(requestId: string): Promise<{ request: WorkRequest; contract?: any }> {
    return workService.acceptRequest(requestId);
  },

  async declineLead(requestId: string, reason?: string): Promise<{ request: WorkRequest; contract?: any }> {
    return workService.declineRequest(requestId, reason);
  },

  async getPublicProviderStorefront(providerId: string): Promise<{ user: User | null; services: Service[]; application?: ProviderApplication; providerProfile?: ServiceProviderProfile }> {
    const [resolvedUser, services, applications] = await Promise.all([
      userService.getUserById(providerId).catch(() => null),
      serviceService.getServicesByProvider(providerId).catch(() => []),
      providerApplicationService.listApplications({ userId: providerId, limit: 5 }).catch(() => [])
    ]);
    let user = resolvedUser;
    if (!user && canUseDirectSupabase()) {
      const [firebaseLookup, idLookup] = await Promise.all([
        supabase
          .from('users')
          .select('id,firebase_uid,email,name,avatar_url,phone,status,created_at')
          .eq('firebase_uid', providerId)
          .maybeSingle()
          .catch(() => ({ data: null, error: null } as any)),
        supabase
          .from('users')
          .select('id,firebase_uid,email,name,avatar_url,phone,status,created_at')
          .eq('id', providerId)
          .maybeSingle()
          .catch(() => ({ data: null, error: null } as any))
      ]);
      const directUser = firebaseLookup?.data || idLookup?.data || null;
      if (directUser) {
        user = mapSupabaseUserBridgeRow(directUser, String(directUser.firebase_uid || providerId));
      }
    }
    const approvedApplication = applications.find((entry) => entry.status === 'approved') || applications[0];
    if (!user) {
      user = buildSyntheticStorefrontUser(providerId, services, approvedApplication);
    }
    const providerProfile = buildProviderProfile(user, approvedApplication);
    const servicesWithProfile = services.map((service) => ({
      ...service,
      providerProfile
    }));
    return {
      user,
      services: servicesWithProfile,
      application: approvedApplication,
      providerProfile
    };
  },

  enrichServiceWithProviderProfile(service: Service, user: User | null, application?: ProviderApplication): Service {
    const providerProfile = buildProviderProfile(user, application);
    return {
      ...service,
      providerProfile
    };
  },

  mapListingToServiceWithProfile(listing: WorkListing, user: User | null, application?: ProviderApplication): Service {
    return providerWorkspaceService.enrichServiceWithProviderProfile(mapWorkListingToService(listing), user, application);
  }
};

export default providerWorkspaceService;
