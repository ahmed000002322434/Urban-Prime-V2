import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type {
  AutopilotRun,
  ConciergeMilestoneSuggestion,
  ConciergeScopeDraft,
  WorkListing,
  WorkRequest
} from '../types';

export interface ScopeAutopilotInput {
  title?: string;
  brief: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  timezone?: string;
  category?: string;
  mode?: WorkRequest['mode'];
  fulfillmentKind?: WorkRequest['fulfillmentKind'];
}

export interface MatchAutopilotInput {
  requestId?: string;
  brief?: string;
  requirements?: string[];
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  skills?: string[];
  mode?: WorkRequest['mode'];
  fulfillmentKind?: WorkRequest['fulfillmentKind'];
  timezone?: string;
  limit?: number;
}

export interface ScopeAutopilotOutput {
  normalizedRequest: ConciergeScopeDraft;
  suggestedMilestones: ConciergeMilestoneSuggestion[];
  suggestedTimelineDays: number;
  confidence: number;
}

export interface MatchAutopilotOutput {
  matches: Array<{
    listing: WorkListing;
    providerId?: string;
    score: number;
    reasons: string[];
    recommendedPath: 'instant' | 'proposal';
    priceFit: number;
    trustScore: number;
    responseSlaHours?: number;
  }>;
}

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toArray = (value: unknown) => (Array.isArray(value) ? value : []);
const toObject = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {});

const normalizeWorkListing = (listing: any): WorkListing => {
  const providerSnapshotRaw = toObject(listing?.providerSnapshot || listing?.provider_snapshot);
  const availability = toObject(listing?.availability);
  const details = toObject(listing?.details);
  const packages = toArray(listing?.packages).map((pkg: any, index: number) => ({
    id: String(pkg?.id || `${listing?.id || 'listing'}-pkg-${index}`),
    name: String(pkg?.name || pkg?.description || `Package ${index + 1}`),
    description: pkg?.description || undefined,
    price: toNumber(pkg?.price, 0),
    currency: String(pkg?.currency || listing?.currency || 'USD'),
    deliveryDays: pkg?.deliveryDays != null ? toNumber(pkg.deliveryDays) : pkg?.delivery_days != null ? toNumber(pkg.delivery_days) : undefined,
    revisions: pkg?.revisions != null ? toNumber(pkg.revisions) : undefined,
    type: pkg?.type || 'fixed'
  }));

  const providerSnapshot = providerSnapshotRaw?.id
    ? {
        id: String(providerSnapshotRaw.id),
        name: String(providerSnapshotRaw.name || 'Provider'),
        avatar: String(providerSnapshotRaw.avatar || '/icons/urbanprime.svg'),
        rating: toNumber(providerSnapshotRaw.rating, 0),
        reviews: toArray(providerSnapshotRaw.reviews)
      }
    : undefined;

  return {
    id: String(listing?.id || ''),
    title: String(listing?.title || 'Untitled service'),
    description: String(listing?.description || ''),
    category: String(listing?.category || 'general'),
    mode: (listing?.mode || 'hybrid') as WorkListing['mode'],
    fulfillmentKind: (listing?.fulfillmentKind || listing?.fulfillment_kind || 'hybrid') as WorkListing['fulfillmentKind'],
    sellerId: String(listing?.sellerId || listing?.seller_id || providerSnapshot?.id || ''),
    sellerPersonaId: listing?.sellerPersonaId || listing?.seller_persona_id || undefined,
    providerSnapshot,
    currency: String(listing?.currency || 'USD'),
    timezone: listing?.timezone || undefined,
    basePrice: listing?.basePrice != null ? toNumber(listing.basePrice) : listing?.base_price != null ? toNumber(listing.base_price) : undefined,
    packages,
    skills: toArray(listing?.skills).map((entry) => String(entry)),
    media: toArray(listing?.media).map((entry) => String(entry)),
    availability: availability as WorkListing['availability'],
    details: details as WorkListing['details'],
    riskScore: listing?.riskScore != null ? toNumber(listing.riskScore) : listing?.risk_score != null ? toNumber(listing.risk_score) : undefined,
    status: (listing?.status || 'draft') as WorkListing['status'],
    visibility: (listing?.visibility || 'public') as WorkListing['visibility'],
    reviewNotes: listing?.reviewNotes || listing?.review_notes || undefined,
    submittedAt: listing?.submittedAt || listing?.submitted_at || undefined,
    reviewedAt: listing?.reviewedAt || listing?.reviewed_at || undefined,
    publishedAt: listing?.publishedAt || listing?.published_at || undefined,
    createdAt: listing?.createdAt || listing?.created_at || new Date().toISOString(),
    updatedAt: listing?.updatedAt || listing?.updated_at || undefined
  };
};

const scopeLocally = (input: ScopeAutopilotInput): ScopeAutopilotOutput => {
  const brief = input.brief?.trim() || '';
  const wordCount = brief.length > 0 ? brief.split(/\s+/).length : 0;
  const complexity = clamp(Math.round(wordCount / 60), 1, 5);
  const timeline = clamp(complexity * 5, 5, 30);
  const confidence = clamp(0.5 + complexity * 0.08, 0.55, 0.92);

  const suggestedMilestones = [
    { title: 'Discovery & Scope Finalization', amountPct: 20, description: 'Confirm requirements and final deliverables.' },
    { title: 'Execution', amountPct: 50, description: 'Primary work delivery based on approved scope.' },
    { title: 'QA / Revisions / Handoff', amountPct: 30, description: 'Final fixes, acceptance, and structured handover.' }
  ];

  return {
    normalizedRequest: {
      title: input.title || brief.slice(0, 80) || 'Autopilot-generated request',
      brief,
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillmentKind: input.fulfillmentKind || 'hybrid',
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      requirements: brief
        .split(/[.;\n]/)
        .map((segment) => segment.trim())
        .filter(Boolean)
        .slice(0, 8)
    },
    suggestedMilestones,
    suggestedTimelineDays: timeline,
    confidence: Number(confidence.toFixed(2))
  };
};

const autopilotService = {
  async scope(input: ScopeAutopilotInput): Promise<ScopeAutopilotOutput> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/scope', {
        method: 'POST',
        body: JSON.stringify(input)
      }, token);
      return res?.data as ScopeAutopilotOutput;
    }

    const output = scopeLocally(input);
    if (shouldUseFirestoreFallback()) {
      const run: Omit<AutopilotRun, 'id'> = {
        runType: 'scope',
        inputPayload: input as Record<string, any>,
        outputPayload: output as Record<string, any>,
        status: 'succeeded',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'work_autopilot_runs'), run);
    }
    return output;
  },

  async match(input: MatchAutopilotInput): Promise<MatchAutopilotOutput> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/match', {
        method: 'POST',
        body: JSON.stringify(input)
      }, token);
      const matches = Array.isArray(res?.data?.matches)
        ? res.data.matches.map((entry: any) => ({
            listing: normalizeWorkListing(entry?.listing),
            providerId: String(
              entry?.providerId ||
              entry?.provider_id ||
              entry?.listing?.providerSnapshot?.id ||
              entry?.listing?.provider_snapshot?.id ||
              entry?.listing?.sellerId ||
              entry?.listing?.seller_id ||
              ''
            ) || undefined,
            score: clamp(toNumber(entry?.score, 0), 0, 100),
            reasons: toArray(entry?.reasons).map((reason) => String(reason)).filter(Boolean),
            recommendedPath: entry?.recommendedPath === 'instant' || entry?.recommended_path === 'instant' ? 'instant' : 'proposal',
            priceFit: clamp(toNumber(entry?.priceFit ?? entry?.price_fit, 0), 0, 100),
            trustScore: clamp(toNumber(entry?.trustScore ?? entry?.trust_score, 0), 0, 100),
            responseSlaHours: (() => {
              const value = toNumber(
                entry?.responseSlaHours ??
                entry?.response_sla_hours ??
                entry?.listing?.details?.responseSlaHours ??
                entry?.listing?.details?.response_sla_hours,
                0
              );
              return value > 0 ? value : undefined;
            })()
          }))
        : [];
      return { matches };
    }

    if (shouldUseFirestoreFallback()) {
      const run: Omit<AutopilotRun, 'id'> = {
        runType: 'match',
        inputPayload: input as Record<string, any>,
        outputPayload: { matches: [] },
        status: 'succeeded',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'work_autopilot_runs'), run);
    }

    return { matches: [] };
  },

  async health(): Promise<Record<string, any>> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/health', {
        method: 'POST'
      }, token);
      return res?.data || {};
    }

    return {
      ok: true,
      engine: 'local-fallback',
      generatedAt: new Date().toISOString()
    };
  }
};

export default autopilotService;
