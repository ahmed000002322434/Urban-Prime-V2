import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fs from 'fs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  process.env.DOTENV_PATH,
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../.env.local')
].filter(Boolean);

const loadedEnvPaths = [];
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    loadedEnvPaths.push(candidate);
  }
}

if (loadedEnvPaths.length === 0) {
  dotenv.config();
  console.warn('No .env file found. Looked in:', envCandidates.join(', '));
} else {
  console.log('Loaded env from', loadedEnvPaths.join(', '));
}

const toBool = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const {
  PORT: ENV_PORT = '5050',
  CORS_ORIGIN = '',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BACKEND_API_KEY,
  FIREBASE_ADMIN_CREDENTIALS,
  FIREBASE_ADMIN_CREDENTIALS_FILE,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  PROFILE_ONBOARDING_V2,
  UPLOADS_DIR,
  NODE_ENV = 'development'
} = process.env;

const parsePort = (value, fallback = 5050) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const START_PORT = parsePort(ENV_PORT, 5050);
const PORT_RETRY_LIMIT = parsePort(process.env.PORT_RETRY_LIMIT ?? '20', 20);

const PROFILE_ONBOARDING_V2_ENABLED = toBool(PROFILE_ONBOARDING_V2, true);
const FEATURE_FLAGS = {
  profileOnboardingV2: PROFILE_ONBOARDING_V2_ENABLED
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let firebaseApp = null;
try {
  if (FIREBASE_ADMIN_CREDENTIALS) {
    const creds = JSON.parse(FIREBASE_ADMIN_CREDENTIALS);
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else if (FIREBASE_ADMIN_CREDENTIALS_FILE && fs.existsSync(FIREBASE_ADMIN_CREDENTIALS_FILE)) {
    const raw = fs.readFileSync(FIREBASE_ADMIN_CREDENTIALS_FILE, 'utf8');
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  } else if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n')
      })
    });
  }
} catch (error) {
  console.warn('Firebase admin init failed:', error);
}

const ALLOWED_TABLES = new Set([
  'users', 'user_profiles', 'stores', 'store_settings', 'categories',
  'items', 'item_images', 'item_variants', 'item_collections', 'item_collection_items',
  'carts', 'cart_items', 'shipping_addresses', 'orders', 'order_items',
  'payments', 'refunds', 'shipping_methods', 'shipments',
  'reviews', 'wishlists', 'wishlist_items', 'user_follows', 'store_follows',
  'chat_threads', 'chat_messages', 'custom_offers', 'notifications',
  'payout_methods', 'payouts', 'suppliers', 'supplier_products', 'supplier_orders',
  'affiliate_profiles', 'affiliate_links', 'affiliate_attributions', 'affiliate_conversions', 'affiliate_payouts',
  'admin_users', 'site_settings', 'moderation_flags', 'audit_logs', 'mirror_documents',
  'personas', 'persona_members', 'persona_wallet_ledgers', 'persona_notifications', 'persona_capability_requests',
  'uploaded_assets', 'user_onboarding_state',
  'work_listings', 'work_requests', 'work_proposals', 'work_contracts', 'work_milestones',
  'work_engagements', 'work_escrow_ledger', 'work_disputes', 'work_reputation', 'work_autopilot_runs'
]);

const uploadsRoot = path.resolve(UPLOADS_DIR || path.resolve(__dirname, '../uploads'), NODE_ENV === 'production' ? 'prod' : 'dev');
fs.mkdirSync(uploadsRoot, { recursive: true });

const app = express();
const corsOptions = CORS_ORIGIN
  ? { origin: CORS_ORIGIN.split(',').map(v => v.trim()), credentials: true }
  : { origin: true, credentials: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsRoot));

if (!BACKEND_API_KEY && !firebaseApp && NODE_ENV === 'production') {
  console.warn('WARNING: Backend running without auth. Set BACKEND_API_KEY or Firebase admin credentials.');
}

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

const sanitizeBaseName = (fileName = 'asset') =>
  String(fileName)
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset';

const ensureDirectory = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const resolveUserIdFromFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
};

const userCanAccessPersona = async (personaId, firebaseUid) => {
  if (!personaId) return false;
  if (!firebaseUid) return true;

  const currentUserId = await resolveUserIdFromFirebaseUid(firebaseUid);
  if (!currentUserId) return false;

  const { data: persona, error: personaError } = await supabase
    .from('personas')
    .select('id,user_id')
    .eq('id', personaId)
    .maybeSingle();

  if (personaError || !persona) return false;
  if (persona.user_id === currentUserId) return true;

  const { data: member, error: memberError } = await supabase
    .from('persona_members')
    .select('id')
    .eq('persona_id', personaId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (memberError) return false;
  return Boolean(member);
};

const ONBOARDING_FLOW_VERSION = 1;
const ONBOARDING_INTENTS = new Set(['buy', 'rent', 'sell', 'provide', 'affiliate']);
const ROLE_INTENTS = new Set(['sell', 'provide', 'affiliate']);
const ONBOARDING_EVENTS = new Set([
  'resumed',
  'step_viewed',
  'step_saved',
  'step_error',
  'completed',
  'completion_failed'
]);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeHandle = (value) => {
  if (!hasText(value)) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40) || null;
};

const toNullableText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const normalizeJsonObject = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const normalizeJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry)).filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const normalizeCurrencyCode = (value, fallback = 'USD') => {
  const text = String(value || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(text)) return text;
  return fallback;
};

const normalizeWorkMode = (value, fallback = 'hybrid') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['instant', 'proposal', 'hybrid'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeFulfillmentKind = (value, fallback = 'hybrid') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['local', 'remote', 'onsite', 'hybrid'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkListingStatus = (value, fallback = 'draft') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'published', 'archived', 'paused'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkRequestStatus = (value, fallback = 'open') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['open', 'in_review', 'matched', 'cancelled', 'closed'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkProposalStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'accepted', 'declined', 'withdrawn', 'expired'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeWorkContractStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'pending', 'active', 'completed', 'cancelled', 'disputed'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeMilestoneStatus = (value, fallback = 'pending') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'submitted', 'approved', 'released', 'rejected'].includes(normalized)) return normalized;
  return fallback;
};

const normalizeEscrowAction = (value, fallback = 'hold') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['hold', 'release', 'refund', 'adjustment'].includes(normalized)) return normalized;
  return fallback;
};

const parsePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const resolveUserById = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id,name,avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const writeAuditLog = async ({ actorUserId, action, entityType, entityId, details = {} }) => {
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (error) {
    console.warn('Audit log write failed:', error?.message || error);
  }
};

const mapWorkListingToLegacyServiceRecord = (row) => {
  const providerSnapshot = normalizeJsonObject(row?.provider_snapshot);
  const packages = Array.isArray(row?.packages) ? row.packages : [];
  const pricingModels = packages.length > 0
    ? packages.map((pkg) => ({
        type: pkg?.type || 'fixed',
        price: Number(pkg?.price || row?.base_price || 0),
        description: pkg?.description || pkg?.name || 'Service package',
        currency: pkg?.currency || row?.currency || 'USD',
        deliveryDays: pkg?.deliveryDays || null,
        revisions: pkg?.revisions || null
      }))
    : [{
        type: 'fixed',
        price: Number(row?.base_price || 0),
        description: 'Standard package',
        currency: row?.currency || 'USD'
      }];

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'general',
    provider: {
      id: providerSnapshot?.id || row?.seller_id || '',
      name: providerSnapshot?.name || 'Provider',
      avatar: providerSnapshot?.avatar || '/icons/urbanprime.svg',
      rating: Number(providerSnapshot?.rating || 0),
      reviews: Array.isArray(providerSnapshot?.reviews) ? providerSnapshot.reviews : []
    },
    imageUrls: Array.isArray(row?.media) ? row.media : [],
    pricingModels,
    avgRating: Number(providerSnapshot?.rating || 0),
    reviews: Array.isArray(providerSnapshot?.reviews) ? providerSnapshot.reviews : [],
    mode: row?.mode || 'hybrid',
    fulfillmentKind: row?.fulfillment_kind || 'hybrid',
    riskScore: Number(row?.risk_score || 0),
    currency: row?.currency || 'USD',
    timezone: row?.timezone || null,
    providerPersonaId: row?.seller_persona_id || null,
    listingSource: 'omniwork'
  };
};

const mirrorWorkListingForLegacy = async (row) => {
  const legacyService = mapWorkListingToLegacyServiceRecord(row);
  try {
    await supabase.from('mirror_documents').upsert([
      {
        collection: 'work_listings',
        doc_id: row.id,
        data: row,
        updated_at: new Date().toISOString()
      },
      {
        collection: 'services',
        doc_id: row.id,
        data: legacyService,
        updated_at: new Date().toISOString()
      }
    ], {
      onConflict: 'collection,doc_id',
      ignoreDuplicates: false
    });
  } catch (error) {
    console.warn('Failed to mirror work listing:', error?.message || error);
  }
};

const deepMergeDraft = (base, patch) => {
  const baseObject = normalizeJsonObject(base);
  const patchObject = normalizeJsonObject(patch);
  const output = { ...baseObject };

  Object.entries(patchObject).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      output[key] = value.slice();
      return;
    }
    if (value && typeof value === 'object') {
      output[key] = deepMergeDraft(baseObject[key], value);
      return;
    }
    output[key] = value;
  });

  return output;
};

const normalizeIntent = (rawIntent) => {
  if (!rawIntent) return null;
  const normalized = String(rawIntent).trim().toLowerCase();
  if (normalized === 'list') return 'sell';
  if (normalized === 'provide_service') return 'provide';
  if (ONBOARDING_INTENTS.has(normalized)) return normalized;
  return null;
};

const normalizeIntents = (rawIntents) => {
  if (!rawIntents) return [];
  const source = Array.isArray(rawIntents) ? rawIntents : [rawIntents];
  const flattened = source.flatMap((entry) => {
    if (Array.isArray(entry)) return entry;
    if (typeof entry === 'string' && entry.includes(',')) {
      return entry.split(',').map((value) => value.trim());
    }
    return [entry];
  });

  const normalized = flattened
    .map((entry) => normalizeIntent(entry))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const parsePurposeToIntents = (purpose) => {
  if (!purpose) return [];
  const normalized = String(purpose).trim().toLowerCase();
  if (normalized === 'both') return ['buy', 'sell'];
  return normalizeIntents(normalized);
};

const intentsToPurpose = (intents) => normalizeIntents(intents).join(',');

const normalizeOnboardingStep = (step) => {
  const normalized = String(step || '').trim().toLowerCase();
  if (['intent', 'identity', 'preferences', 'role_setup', 'review', 'completed'].includes(normalized)) {
    return normalized;
  }
  return 'intent';
};

const normalizePhone = (value) => {
  if (!hasText(value)) return null;
  let compact = String(value).replace(/[^\d+]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (/^\d+$/.test(compact)) compact = `+${compact}`;
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) return null;
  return compact;
};

const buildPersonaCapabilities = (type, role = 'user') => {
  const capabilities = {
    buy: 'inactive',
    rent: 'inactive',
    sell: 'inactive',
    provide_service: 'inactive',
    affiliate: 'inactive',
    admin: role === 'admin' ? 'active' : 'inactive'
  };

  if (type === 'consumer') {
    capabilities.buy = 'active';
    capabilities.rent = 'active';
  }
  if (type === 'seller') capabilities.sell = 'active';
  if (type === 'provider') capabilities.provide_service = 'active';
  if (type === 'affiliate') capabilities.affiliate = 'active';
  return capabilities;
};

const mapOnboardingStateRow = (row) => {
  if (!row) return null;
  return {
    userId: row.user_id,
    currentStep: row.current_step,
    flowVersion: row.flow_version,
    selectedIntents: normalizeIntents(row.selected_intents),
    draft: normalizeJsonObject(row.draft),
    startedAt: row.started_at,
    updatedAt: row.updated_at
  };
};

const completionToResponse = (completion) => ({
  isComplete: completion.isComplete,
  missingRequiredFields: completion.missingRequiredFields,
  nextStep: completion.nextStep
});

const getRequestFirebaseUid = (req) => {
  if (hasText(req.user?.uid)) return req.user.uid;

  const headerUid = req.headers['x-firebase-uid'];
  if (Array.isArray(headerUid) && hasText(headerUid[0])) return headerUid[0];
  if (hasText(headerUid)) return headerUid;

  const bodyUid = req.body?.firebase_uid || req.body?.firebaseUid;
  if (hasText(bodyUid)) return bodyUid;

  const queryUid = req.query?.firebase_uid || req.query?.firebaseUid;
  if (Array.isArray(queryUid) && hasText(queryUid[0])) return queryUid[0];
  if (hasText(queryUid)) return queryUid;

  return null;
};

const isUniqueViolation = (error) => error?.code === '23505' || /duplicate key/i.test(error?.message || '');

const ensureUserRow = async (firebaseUid, hints = {}) => {
  const { data: existingUser, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (existingError) return { error: existingError };

  const basePayload = {
    firebase_uid: firebaseUid,
    email: toNullableText(hints.email),
    name: toNullableText(hints.name),
    avatar_url: toNullableText(hints.avatar_url),
    phone: normalizePhone(hints.phone) || undefined
  };

  const payload = Object.fromEntries(
    Object.entries(basePayload).filter(([, value]) => value !== undefined)
  );

  if (!existingUser) {
    let insertPayload = { ...payload };
    let insertResult = await supabase.from('users').insert(insertPayload).select('*').maybeSingle();

    if (insertResult.error && isUniqueViolation(insertResult.error) && insertPayload.email) {
      delete insertPayload.email;
      insertResult = await supabase.from('users').insert(insertPayload).select('*').maybeSingle();
    }

    return { user: insertResult.data || null, error: insertResult.error || null };
  }

  const updatePayload = {};
  if (payload.email && payload.email !== existingUser.email) updatePayload.email = payload.email;
  if (payload.name && payload.name !== existingUser.name) updatePayload.name = payload.name;
  if (payload.avatar_url && payload.avatar_url !== existingUser.avatar_url) updatePayload.avatar_url = payload.avatar_url;
  if (payload.phone && payload.phone !== existingUser.phone) updatePayload.phone = payload.phone;

  if (Object.keys(updatePayload).length === 0) {
    return { user: existingUser, error: null };
  }

  let updateResult = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', existingUser.id)
    .select('*')
    .maybeSingle();

  if (updateResult.error && isUniqueViolation(updateResult.error) && updatePayload.email) {
    delete updatePayload.email;
    if (Object.keys(updatePayload).length > 0) {
      updateResult = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select('*')
        .maybeSingle();
    } else {
      updateResult = { data: existingUser, error: null };
    }
  }

  return { user: updateResult.data || existingUser, error: updateResult.error || null };
};

const ensureUserProfileRow = async (userId) => {
  const existing = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing.error) return { profile: null, error: existing.error };
  if (existing.data) return { profile: existing.data, error: null };

  const insert = await supabase
    .from('user_profiles')
    .insert({ user_id: userId })
    .select('*')
    .maybeSingle();

  return { profile: insert.data || null, error: insert.error || null };
};

const loadOnboardingStateRow = async (userId) => {
  const { data, error } = await supabase
    .from('user_onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { row: data || null, error: error || null };
};

const buildDefaultOnboardingDraft = ({ user, profile, selectedIntents = [] }) => ({
  intent: {
    selectedIntents
  },
  identity: {
    name: user?.name || '',
    phone: user?.phone || '',
    country: profile?.country || '',
    city: profile?.city || '',
    currencyPreference: profile?.currency_preference || '',
    avatarUrl: user?.avatar_url || ''
  },
  preferences: {
    interests: normalizeJsonArray(profile?.interests)
  },
  roleSetup: {
    businessName: profile?.business_name || '',
    businessDescription: profile?.business_description || '',
    about: profile?.about || ''
  }
});

const computeProfileCompletion = ({ user, profile, onboardingState }) => {
  const intentsFromState = normalizeIntents(onboardingState?.selected_intents || onboardingState?.selectedIntents);
  const intents = intentsFromState.length > 0
    ? intentsFromState
    : parsePurposeToIntents(profile?.purpose);

  const onboardingMarkedComplete = profile
    && (profile.onboarding_required === false || hasText(profile.onboarding_completed_at));

  if (onboardingMarkedComplete) {
    return {
      isComplete: true,
      missingRequiredFields: [],
      nextStep: 'completed',
      selectedIntents: intents
    };
  }

  const interests = normalizeJsonArray(profile?.interests);
  const roleSetup = normalizeJsonObject(onboardingState?.draft?.roleSetup);
  const missingRequiredFields = [];

  if (!hasText(user?.name)) missingRequiredFields.push('name');
  if (!normalizePhone(user?.phone)) missingRequiredFields.push('phone');
  if (!hasText(profile?.country)) missingRequiredFields.push('country');
  if (!hasText(profile?.city)) missingRequiredFields.push('city');
  if (!hasText(profile?.currency_preference)) missingRequiredFields.push('currency_preference');
  if (!intents.length) missingRequiredFields.push('purpose');
  if (!interests.length) missingRequiredFields.push('interests');

  if (intents.includes('sell')) {
    if (!hasText(profile?.business_name) && !hasText(roleSetup.businessName)) {
      missingRequiredFields.push('business_name');
    }
    if (!hasText(roleSetup.industry)) missingRequiredFields.push('industry');
  }

  if (intents.includes('provide')) {
    if (!hasText(roleSetup.industry)) missingRequiredFields.push('industry');
    if (!hasText(profile?.city)) missingRequiredFields.push('city');
    if (!hasText(roleSetup.experienceYears)) missingRequiredFields.push('experienceYears');
  }

  if (intents.includes('affiliate')) {
    if (!hasText(roleSetup.channelType)) missingRequiredFields.push('channelType');
    if (!hasText(roleSetup.goals)) missingRequiredFields.push('goals');
  }

  const dedupedMissing = Array.from(new Set(missingRequiredFields));
  const identityFields = new Set(['name', 'phone', 'country', 'city', 'currency_preference']);
  const roleFields = new Set(['business_name', 'industry', 'experienceYears', 'channelType', 'goals']);

  let nextStep = 'completed';
  if (!intents.length || dedupedMissing.includes('purpose')) {
    nextStep = 'intent';
  } else if (dedupedMissing.some((field) => identityFields.has(field))) {
    nextStep = 'identity';
  } else if (dedupedMissing.includes('interests')) {
    nextStep = 'preferences';
  } else if (dedupedMissing.some((field) => roleFields.has(field))) {
    nextStep = 'role_setup';
  } else if (dedupedMissing.length > 0) {
    nextStep = 'review';
  }

  return {
    isComplete: dedupedMissing.length === 0,
    missingRequiredFields: dedupedMissing,
    nextStep,
    selectedIntents: intents
  };
};

const applyProfilePatch = async ({
  userRow,
  profileRow,
  userPatch = {},
  profilePatch = {},
  strictPhone = true
}) => {
  const normalizedUserPatch = {};
  const normalizedProfilePatch = {};

  Object.entries(userPatch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'phone') {
      const normalized = normalizePhone(value);
      if (!normalized && strictPhone) {
        throw new Error('Phone number must be in international format, e.g. +14155552671.');
      }
      if (normalized) normalizedUserPatch.phone = normalized;
      return;
    }
    normalizedUserPatch[key] = value;
  });

  Object.entries(profilePatch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'interests') {
      normalizedProfilePatch.interests = normalizeJsonArray(value);
      return;
    }
    if (key === 'preferences' || key === 'social_links') {
      normalizedProfilePatch[key] = normalizeJsonObject(value);
      return;
    }
    normalizedProfilePatch[key] = value;
  });

  let nextUser = userRow;
  let nextProfile = profileRow;

  if (Object.keys(normalizedUserPatch).length > 0) {
    const { data, error } = await supabase
      .from('users')
      .update(normalizedUserPatch)
      .eq('id', userRow.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    nextUser = data || userRow;
  }

  if (Object.keys(normalizedProfilePatch).length > 0) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(normalizedProfilePatch)
      .eq('user_id', userRow.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    nextProfile = data || profileRow;
  }

  return { user: nextUser, profile: nextProfile };
};

const upsertOnboardingState = async ({ userId, existingRow, patch = {} }) => {
  const existingDraft = normalizeJsonObject(existingRow?.draft);
  const patchDraft = normalizeJsonObject(patch.draft);
  const selectedIntents = patch.selectedIntents !== undefined
    ? normalizeIntents(patch.selectedIntents)
    : normalizeIntents(existingRow?.selected_intents);

  const payload = {
    user_id: userId,
    current_step: normalizeOnboardingStep(patch.currentStep || existingRow?.current_step || 'intent'),
    flow_version: Number(patch.flowVersion || existingRow?.flow_version || ONBOARDING_FLOW_VERSION) || ONBOARDING_FLOW_VERSION,
    selected_intents: selectedIntents,
    draft: deepMergeDraft(existingDraft, patchDraft),
    started_at: existingRow?.started_at || new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_onboarding_state')
    .upsert(payload, { onConflict: 'user_id', ignoreDuplicates: false })
    .select('*')
    .maybeSingle();

  return { row: data || null, error: error || null };
};

const buildValidationErrors = (missingRequiredFields) => {
  const stepByField = {
    purpose: 'intent',
    name: 'identity',
    phone: 'identity',
    country: 'identity',
    city: 'identity',
    currency_preference: 'identity',
    interests: 'preferences',
    business_name: 'role_setup',
    industry: 'role_setup',
    experienceYears: 'role_setup',
    channelType: 'role_setup',
    goals: 'role_setup'
  };

  const messageByField = {
    purpose: 'Select at least one intent to continue.',
    name: 'Name is required.',
    phone: 'Valid phone number is required.',
    country: 'Country is required.',
    city: 'City is required.',
    currency_preference: 'Currency preference is required.',
    interests: 'Select at least one interest.',
    business_name: 'Business name is required for seller intent.',
    industry: 'Industry is required for seller/provider intents.',
    experienceYears: 'Experience years is required for provider intent.',
    channelType: 'Channel type is required for affiliate intent.',
    goals: 'Goals are required for affiliate intent.'
  };

  return missingRequiredFields.map((field) => ({
    field,
    step: stepByField[field] || 'review',
    message: messageByField[field] || 'This field is required.'
  }));
};

const derivePatchesFromOnboardingInput = ({ selectedIntents, draft }) => {
  const normalizedDraft = normalizeJsonObject(draft);
  const identity = normalizeJsonObject(normalizedDraft.identity);
  const preferences = normalizeJsonObject(normalizedDraft.preferences);
  const roleSetup = normalizeJsonObject(normalizedDraft.roleSetup);

  const userPatch = {};
  const profilePatch = {};

  if (identity.name !== undefined) userPatch.name = toNullableText(identity.name);
  if (identity.phone !== undefined) userPatch.phone = identity.phone;
  if (identity.avatarUrl !== undefined) userPatch.avatar_url = toNullableText(identity.avatarUrl);

  if (identity.country !== undefined) profilePatch.country = toNullableText(identity.country);
  if (identity.city !== undefined) profilePatch.city = toNullableText(identity.city);
  if (identity.currencyPreference !== undefined || identity.currency_preference !== undefined) {
    profilePatch.currency_preference = toNullableText(identity.currencyPreference ?? identity.currency_preference);
  }

  if (preferences.interests !== undefined) {
    profilePatch.interests = normalizeJsonArray(preferences.interests);
  }

  if (roleSetup.about !== undefined) profilePatch.about = toNullableText(roleSetup.about);
  if (roleSetup.businessName !== undefined) profilePatch.business_name = toNullableText(roleSetup.businessName);
  if (roleSetup.businessDescription !== undefined) {
    profilePatch.business_description = toNullableText(roleSetup.businessDescription);
  }

  const intents = normalizeIntents(selectedIntents);
  if (intents.length > 0) {
    profilePatch.purpose = intentsToPurpose(intents);
  }

  return { userPatch, profilePatch };
};

const buildUnifiedProfileResponse = async ({ user, profile, onboardingStateRow }) => {
  let onboardingState = onboardingStateRow;
  if (!onboardingState) {
    const stateLookup = await loadOnboardingStateRow(user.id);
    onboardingState = stateLookup.row;
  }

  const { data: personas, error: personasError } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (personasError) throw personasError;

  const completionSnapshot = computeProfileCompletion({ user, profile, onboardingState });
  const completion = PROFILE_ONBOARDING_V2_ENABLED
    ? completionSnapshot
    : {
        ...completionSnapshot,
        isComplete: true,
        missingRequiredFields: [],
        nextStep: 'completed'
      };
  const activePersona = (personas || []).find((persona) => persona.status === 'active') || (personas || [])[0] || null;

  return {
    user,
    profile,
    personas: personas || [],
    activePersona,
    completion: completionToResponse(completion),
    featureFlags: FEATURE_FLAGS,
    onboardingState: PROFILE_ONBOARDING_V2_ENABLED ? mapOnboardingStateRow(onboardingState) : null
  };
};

const getUserContext = async (req) => {
  const firebaseUid = getRequestFirebaseUid(req);
  if (!firebaseUid) {
    return { error: new Error('Authenticated firebase uid is required.') };
  }

  const hints = {
    email: req.user?.email || req.body?.email,
    name: req.user?.name || req.body?.name,
    avatar_url: req.user?.picture || req.body?.avatar_url,
    phone: req.user?.phone_number || req.body?.phone
  };

  const ensuredUser = await ensureUserRow(firebaseUid, hints);
  if (ensuredUser.error || !ensuredUser.user) {
    return { error: ensuredUser.error || new Error('Unable to resolve user record.') };
  }

  const ensuredProfile = await ensureUserProfileRow(ensuredUser.user.id);
  if (ensuredProfile.error || !ensuredProfile.profile) {
    return { error: ensuredProfile.error || new Error('Unable to resolve profile record.') };
  }

  return {
    firebaseUid,
    user: ensuredUser.user,
    profile: ensuredProfile.profile
  };
};

const ensurePersonaHandleAvailable = async (handle, ignorePersonaId = null) => {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return { handle: null, error: null };

  let query = supabase
    .from('personas')
    .select('id')
    .eq('handle', normalizedHandle)
    .limit(1);

  if (ignorePersonaId) query = query.neq('id', ignorePersonaId);
  const { data, error } = await query.maybeSingle();
  if (error) return { handle: normalizedHandle, error };
  if (data) {
    return { handle: normalizedHandle, error: new Error(`Handle "${normalizedHandle}" is already taken.`) };
  }
  return { handle: normalizedHandle, error: null };
};

const bootstrapPersonasFromIntents = async ({ user, firebaseUid, selectedIntents, roleSetup }) => {
  const intents = normalizeIntents(selectedIntents);
  const roleSetupDraft = normalizeJsonObject(roleSetup);

  const typesToEnsure = new Set(['consumer']);
  if (intents.includes('sell')) typesToEnsure.add('seller');
  if (intents.includes('provide')) typesToEnsure.add('provider');
  if (intents.includes('affiliate')) typesToEnsure.add('affiliate');

  const { data: existingRows, error: existingError } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (existingError) throw existingError;

  const existingByType = new Map((existingRows || []).map((row) => [row.type, row]));
  const ensuredRows = [];

  for (const type of typesToEnsure) {
    const existing = existingByType.get(type);

    const candidateHandle = normalizeHandle(
      roleSetupDraft?.handles?.[type]
      || roleSetupDraft?.[`${type}Handle`]
      || roleSetupDraft?.handle
    );

    const handleCheck = await ensurePersonaHandleAvailable(candidateHandle, existing?.id || null);
    if (handleCheck.error) throw handleCheck.error;

    const displayName = toNullableText(
      type === 'consumer'
        ? roleSetupDraft.displayName || user.name
        : roleSetupDraft.businessName || roleSetupDraft.displayName || `${user.name || 'User'} ${type}`
    ) || `${user.name || 'User'} ${type}`;

    const mergedSettings = {
      ...(normalizeJsonObject(existing?.settings)),
      onboarding: {
        intents,
        roleSetup: roleSetupDraft,
        flowVersion: ONBOARDING_FLOW_VERSION,
        updatedAt: new Date().toISOString()
      }
    };

    const commonPayload = {
      user_id: user.id,
      firebase_uid: firebaseUid,
      type,
      status: 'active',
      display_name: displayName,
      avatar_url: user.avatar_url || null,
      bio: toNullableText(roleSetupDraft.about) || existing?.bio || null,
      capabilities: buildPersonaCapabilities(type, user.role),
      settings: mergedSettings
    };

    if (handleCheck.handle) {
      commonPayload.handle = handleCheck.handle;
    }

    let savedRow = null;
    if (existing) {
      const { data, error } = await supabase
        .from('personas')
        .update(commonPayload)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      savedRow = data || existing;
    } else {
      const { data, error } = await supabase
        .from('personas')
        .insert({ id: randomUUID(), ...commonPayload })
        .select('*')
        .maybeSingle();
      if (error) throw error;
      savedRow = data;
    }

    if (savedRow) ensuredRows.push(savedRow);
  }

  return ensuredRows;
};

const normalizeRelativePath = (fullPath) => fullPath.replace(uploadsRoot, '').replace(/^[\\/]+/, '').replace(/\\/g, '/');

const requireAuth = async (req, res, next) => {
  if (!BACKEND_API_KEY && !firebaseApp) {
    return next();
  }

  if (BACKEND_API_KEY && req.headers['x-backend-key'] === BACKEND_API_KEY) {
    return next();
  }

  if (firebaseApp) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        return next();
      } catch (error) {
        console.warn('Firebase token verify failed:', error?.message || error);
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

const requireTable = (req, res, next) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'Table not allowed' });
  }
  return next();
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, firebaseAdmin: Boolean(firebaseApp), featureFlags: FEATURE_FLAGS });
});

app.post('/auth/sync-user', requireAuth, async (req, res) => {
  const { firebase_uid, email, name, avatar_url, phone } = req.body || {};
  if (!firebase_uid) {
    return res.status(400).json({ error: 'firebase_uid is required' });
  }

  const payload = { firebase_uid, email, name, avatar_url, phone };

  let user = null;
  let syncError = null;

  const upsertResult = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'firebase_uid', ignoreDuplicates: false })
    .select('*')
    .maybeSingle();

  user = upsertResult.data;
  syncError = upsertResult.error;

  if (!user) {
    const selectResult = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .maybeSingle();

    if (selectResult.error) {
      syncError = selectResult.error;
    } else {
      user = selectResult.data;
      if (user) {
        const updateResult = await supabase
          .from('users')
          .update({ email, name, avatar_url, phone })
          .eq('id', user.id)
          .select('*')
          .maybeSingle();

        if (updateResult.error) {
          syncError = updateResult.error;
        } else if (updateResult.data) {
          user = updateResult.data;
          syncError = null;
        }
      }
    }
  }

  if (!user) {
    return res.status(400).json({ error: syncError?.message || 'Unable to sync user' });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from('user_profiles').insert({ user_id: user.id });
  }

  return res.json({ user });
});

app.get('/profile/me', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const response = await buildUnifiedProfileResponse(context);
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch profile.' });
  }
});

app.patch('/profile/me', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const userSource = normalizeJsonObject(body.user);
    const profileSource = normalizeJsonObject(body.profile);

    const pick = (...values) => values.find((value) => value !== undefined);

    const userPatch = {};
    const profilePatch = {};

    const nameValue = pick(body.name, userSource.name);
    const emailValue = pick(body.email, userSource.email);
    const avatarValue = pick(body.avatar, body.avatar_url, userSource.avatar, userSource.avatar_url);
    const phoneValue = pick(body.phone, userSource.phone);

    if (nameValue !== undefined) userPatch.name = toNullableText(nameValue);
    if (emailValue !== undefined) userPatch.email = toNullableText(emailValue);
    if (avatarValue !== undefined) userPatch.avatar_url = toNullableText(avatarValue);
    if (phoneValue !== undefined) userPatch.phone = phoneValue;

    const purposeValue = pick(body.purpose, profileSource.purpose);
    const interestsValue = pick(body.interests, profileSource.interests);
    const cityValue = pick(body.city, profileSource.city);
    const countryValue = pick(body.country, profileSource.country);
    const currencyValue = pick(body.currencyPreference, body.currency_preference, profileSource.currencyPreference, profileSource.currency_preference);
    const dobValue = pick(body.dob, profileSource.dob);
    const genderValue = pick(body.gender, profileSource.gender);
    const aboutValue = pick(body.about, profileSource.about);
    const businessNameValue = pick(body.businessName, body.business_name, profileSource.businessName, profileSource.business_name);
    const businessDescriptionValue = pick(body.businessDescription, body.business_description, profileSource.businessDescription, profileSource.business_description);
    const preferencesValue = pick(body.preferences, profileSource.preferences);
    const socialLinksValue = pick(body.socialLinks, body.social_links, profileSource.socialLinks, profileSource.social_links);

    if (purposeValue !== undefined) {
      if (Array.isArray(purposeValue)) {
        profilePatch.purpose = intentsToPurpose(purposeValue);
      } else {
        profilePatch.purpose = toNullableText(purposeValue);
      }
    }
    if (interestsValue !== undefined) profilePatch.interests = normalizeJsonArray(interestsValue);
    if (cityValue !== undefined) profilePatch.city = toNullableText(cityValue);
    if (countryValue !== undefined) profilePatch.country = toNullableText(countryValue);
    if (currencyValue !== undefined) profilePatch.currency_preference = toNullableText(currencyValue);
    if (dobValue !== undefined) profilePatch.dob = toNullableText(dobValue);
    if (genderValue !== undefined) profilePatch.gender = toNullableText(genderValue);
    if (aboutValue !== undefined) profilePatch.about = toNullableText(aboutValue);
    if (businessNameValue !== undefined) profilePatch.business_name = toNullableText(businessNameValue);
    if (businessDescriptionValue !== undefined) profilePatch.business_description = toNullableText(businessDescriptionValue);
    if (preferencesValue !== undefined) profilePatch.preferences = normalizeJsonObject(preferencesValue);
    if (socialLinksValue !== undefined) profilePatch.social_links = normalizeJsonObject(socialLinksValue);

    const patchResult = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch,
      profilePatch,
      strictPhone: true
    });

    const selectedIntents = body.selectedIntents !== undefined
      ? normalizeIntents(body.selectedIntents)
      : undefined;

    const currentStep = body.currentStep || body.current_step;
    const draftPatch = normalizeJsonObject(body.draft);
    let onboardingStateRow = null;
    if (selectedIntents !== undefined || currentStep !== undefined || Object.keys(draftPatch).length > 0) {
      const onboardingStateLookup = await loadOnboardingStateRow(context.user.id);
      if (onboardingStateLookup.error) throw onboardingStateLookup.error;

      const stateUpsert = await upsertOnboardingState({
        userId: context.user.id,
        existingRow: onboardingStateLookup.row,
        patch: {
          currentStep,
          selectedIntents,
          draft: draftPatch
        }
      });
      if (stateUpsert.error) throw stateUpsert.error;
      onboardingStateRow = stateUpsert.row;
    }

    const response = await buildUnifiedProfileResponse({
      user: patchResult.user,
      profile: patchResult.profile,
      onboardingStateRow
    });
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update profile.' });
  }
});

app.get('/onboarding/state', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    let onboardingStateRow = onboardingLookup.row;
    const completionSnapshot = computeProfileCompletion({
      user: context.user,
      profile: context.profile,
      onboardingState: onboardingStateRow
    });

    const defaultDraft = buildDefaultOnboardingDraft({
      user: context.user,
      profile: context.profile,
      selectedIntents: completionSnapshot.selectedIntents
    });

    if (!onboardingStateRow) {
      const created = await upsertOnboardingState({
        userId: context.user.id,
        existingRow: null,
        patch: {
          currentStep: completionSnapshot.nextStep,
          selectedIntents: completionSnapshot.selectedIntents,
          draft: defaultDraft
        }
      });
      if (created.error) throw created.error;
      onboardingStateRow = created.row;
    } else {
      const mergedDraft = deepMergeDraft(defaultDraft, onboardingStateRow.draft);
      const normalizedSelectedIntents = normalizeIntents(onboardingStateRow.selected_intents);
      const shouldBackfillState = normalizedSelectedIntents.length === 0 && completionSnapshot.selectedIntents.length > 0;

      if (shouldBackfillState || JSON.stringify(mergedDraft) !== JSON.stringify(onboardingStateRow.draft)) {
        const updated = await upsertOnboardingState({
          userId: context.user.id,
          existingRow: onboardingStateRow,
          patch: {
            selectedIntents: shouldBackfillState ? completionSnapshot.selectedIntents : undefined,
            draft: mergedDraft
          }
        });
        if (updated.error) throw updated.error;
        onboardingStateRow = updated.row;
      }
    }

    const completion = computeProfileCompletion({
      user: context.user,
      profile: context.profile,
      onboardingState: onboardingStateRow
    });

    return res.json({
      data: mapOnboardingStateRow(onboardingStateRow),
      completion: completionToResponse(completion),
      featureFlags: FEATURE_FLAGS
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch onboarding state.' });
  }
});

app.put('/onboarding/state', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const stateUpsert = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingLookup.row,
      patch: {
        currentStep: body.currentStep || body.current_step,
        flowVersion: body.flowVersion || body.flow_version,
        selectedIntents: body.selectedIntents ?? body.selected_intents,
        draft: body.draft
      }
    });
    if (stateUpsert.error) throw stateUpsert.error;

    const patchPayload = derivePatchesFromOnboardingInput({
      selectedIntents: stateUpsert.row?.selected_intents,
      draft: stateUpsert.row?.draft
    });

    const patched = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch: patchPayload.userPatch,
      profilePatch: patchPayload.profilePatch,
      strictPhone: false
    });

    const completion = computeProfileCompletion({
      user: patched.user,
      profile: patched.profile,
      onboardingState: stateUpsert.row
    });

    return res.json({
      data: mapOnboardingStateRow(stateUpsert.row),
      completion: completionToResponse(completion),
      featureFlags: FEATURE_FLAGS
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to save onboarding state.' });
  }
});

app.post('/onboarding/persona-bootstrap', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const onboardingStateRow = onboardingLookup.row;
    const selectedIntents = normalizeIntents(
      body.selectedIntents
      ?? body.selected_intents
      ?? onboardingStateRow?.selected_intents
      ?? parsePurposeToIntents(context.profile?.purpose)
    );

    if (selectedIntents.length === 0) {
      return res.status(400).json({ error: 'At least one intent is required to bootstrap personas.' });
    }

    const roleSetup = normalizeJsonObject(
      body.roleSetup
      || normalizeJsonObject(body.draft).roleSetup
      || onboardingStateRow?.draft?.roleSetup
    );

    const personas = await bootstrapPersonasFromIntents({
      user: context.user,
      firebaseUid: context.firebaseUid,
      selectedIntents,
      roleSetup
    });

    const stateSync = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingStateRow,
      patch: {
        currentStep: onboardingStateRow?.current_step || 'role_setup',
        selectedIntents,
        draft: { roleSetup }
      }
    });
    if (stateSync.error) throw stateSync.error;

    return res.status(201).json({ data: personas });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to bootstrap personas.' });
  }
});

app.post('/onboarding/complete', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const onboardingLookup = await loadOnboardingStateRow(context.user.id);
    if (onboardingLookup.error) throw onboardingLookup.error;

    const bodyDraft = normalizeJsonObject(body.draft);
    const roleSetupDraft = normalizeJsonObject(body.roleSetup);
    const draftPatch = Object.keys(roleSetupDraft).length > 0
      ? deepMergeDraft(bodyDraft, { roleSetup: roleSetupDraft })
      : bodyDraft;

    const selectedIntents = normalizeIntents(
      body.selectedIntents
      ?? body.selected_intents
      ?? onboardingLookup.row?.selected_intents
      ?? parsePurposeToIntents(context.profile?.purpose)
    );

    const stateUpsert = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: onboardingLookup.row,
      patch: {
        currentStep: 'review',
        selectedIntents,
        draft: draftPatch
      }
    });
    if (stateUpsert.error) throw stateUpsert.error;

    const derivedPatch = derivePatchesFromOnboardingInput({
      selectedIntents: stateUpsert.row?.selected_intents,
      draft: stateUpsert.row?.draft
    });

    const patched = await applyProfilePatch({
      userRow: context.user,
      profileRow: context.profile,
      userPatch: derivedPatch.userPatch,
      profilePatch: derivedPatch.profilePatch,
      strictPhone: true
    });

    const completionBeforeFinalize = computeProfileCompletion({
      user: patched.user,
      profile: patched.profile,
      onboardingState: stateUpsert.row
    });

    if (!completionBeforeFinalize.isComplete) {
      return res.status(422).json({
        error: 'Onboarding requirements are not complete.',
        completion: completionToResponse(completionBeforeFinalize),
        validationErrors: buildValidationErrors(completionBeforeFinalize.missingRequiredFields)
      });
    }

    await bootstrapPersonasFromIntents({
      user: patched.user,
      firebaseUid: context.firebaseUid,
      selectedIntents: completionBeforeFinalize.selectedIntents,
      roleSetup: stateUpsert.row?.draft?.roleSetup
    });

    const finalizedProfile = await applyProfilePatch({
      userRow: patched.user,
      profileRow: patched.profile,
      profilePatch: {
        onboarding_required: false,
        onboarding_completed_at: new Date().toISOString(),
        profile_version: Math.max(Number(patched.profile?.profile_version || 1), ONBOARDING_FLOW_VERSION)
      },
      strictPhone: true
    });

    const completedState = await upsertOnboardingState({
      userId: context.user.id,
      existingRow: stateUpsert.row,
      patch: {
        currentStep: 'completed',
        selectedIntents: completionBeforeFinalize.selectedIntents
      }
    });
    if (completedState.error) throw completedState.error;

    const response = await buildUnifiedProfileResponse({
      user: finalizedProfile.user,
      profile: finalizedProfile.profile,
      onboardingStateRow: completedState.row
    });

    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to complete onboarding.' });
  }
});

app.post('/onboarding/events', requireAuth, async (req, res) => {
  if (!PROFILE_ONBOARDING_V2_ENABLED) {
    return res.status(409).json({
      error: 'Onboarding flow v2 is disabled.',
      featureFlags: FEATURE_FLAGS
    });
  }

  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const event = String(body.event || '').trim().toLowerCase();
    if (!ONBOARDING_EVENTS.has(event)) {
      return res.status(400).json({ error: 'Unsupported onboarding event.' });
    }

    const step = normalizeOnboardingStep(body.step || body.stepId || 'intent');
    const details = normalizeJsonObject(body.details);

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: context.user.id,
        action: `onboarding_${event}`,
        entity_type: 'onboarding',
        entity_id: context.user.id,
        details: {
          step,
          flowVersion: ONBOARDING_FLOW_VERSION,
          ...details
        }
      })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to track onboarding event.' });
  }
});

app.get('/dashboard/buyer', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const recentLimit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 30);
    const summaryWindowLimit = Math.max(recentLimit, 120);

    const totalOrdersQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', context.user.id);

    const summaryOrdersQuery = supabase
      .from('orders')
      .select('id,status,total,currency,created_at')
      .eq('buyer_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(summaryWindowLimit);

    const notificationsQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', context.user.id)
      .is('read_at', null);

    const conversationsQuery = supabase
      .from('chat_threads')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${context.user.id},seller_id.eq.${context.user.id}`);

    const wishlistsQuery = supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', context.user.id);

    const [
      totalOrdersResult,
      summaryOrdersResult,
      notificationsResult,
      conversationsResult,
      wishlistsResult
    ] = await Promise.all([
      totalOrdersQuery,
      summaryOrdersQuery,
      notificationsQuery,
      conversationsQuery,
      wishlistsQuery
    ]);

    if (totalOrdersResult.error) throw totalOrdersResult.error;
    if (summaryOrdersResult.error) throw summaryOrdersResult.error;
    if (notificationsResult.error) throw notificationsResult.error;
    if (conversationsResult.error) throw conversationsResult.error;
    if (wishlistsResult.error) throw wishlistsResult.error;

    const summaryOrders = summaryOrdersResult.data || [];
    const recentOrders = summaryOrders.slice(0, recentLimit);
    const summaryOrderIds = summaryOrders.map((order) => order.id).filter(Boolean);

    let orderItems = [];
    if (summaryOrderIds.length > 0) {
      const orderItemsResult = await supabase
        .from('order_items')
        .select('id,order_id,item_id,listing_type,quantity,rental_end,metadata')
        .in('order_id', summaryOrderIds);
      if (orderItemsResult.error) throw orderItemsResult.error;
      orderItems = orderItemsResult.data || [];
    }

    const wishlistIds = (wishlistsResult.data || []).map((row) => row.id).filter(Boolean);
    let wishlistItemsCount = 0;
    if (wishlistIds.length > 0) {
      const wishlistItemsResult = await supabase
        .from('wishlist_items')
        .select('id', { count: 'exact', head: true })
        .in('wishlist_id', wishlistIds);
      if (wishlistItemsResult.error) throw wishlistItemsResult.error;
      wishlistItemsCount = wishlistItemsResult.count || 0;
    }

    const orderStatusMap = new Map(summaryOrders.map((order) => [order.id, order.status]));
    const orderItemCountMap = new Map();
    const rentalItemCountMap = new Map();
    const saleItemCountMap = new Map();
    const orderQuantityMap = new Map();

    orderItems.forEach((row) => {
      const orderId = row.order_id;
      const listingType = String(row.listing_type || '').toLowerCase();
      const quantity = Number(row.quantity || 1);

      orderItemCountMap.set(orderId, (orderItemCountMap.get(orderId) || 0) + 1);
      orderQuantityMap.set(orderId, (orderQuantityMap.get(orderId) || 0) + quantity);

      if (listingType === 'rent') {
        rentalItemCountMap.set(orderId, (rentalItemCountMap.get(orderId) || 0) + 1);
      } else {
        saleItemCountMap.set(orderId, (saleItemCountMap.get(orderId) || 0) + 1);
      }
    });

    const activeStatuses = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered']);
    const pendingStatuses = new Set(['pending', 'confirmed', 'processing']);
    const completedStatuses = new Set(['delivered', 'completed']);

    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemIdsForUpcoming = [];
    const upcomingRentalsRaw = [];
    let activeRentals = 0;
    let totalPurchases = 0;

    orderItems.forEach((row) => {
      const orderStatus = String(orderStatusMap.get(row.order_id) || '').toLowerCase();
      const listingType = String(row.listing_type || '').toLowerCase();
      if (listingType === 'rent' && activeStatuses.has(orderStatus)) {
        activeRentals += Number(row.quantity || 1);

        if (row.rental_end) {
          const rentalEnd = new Date(row.rental_end);
          if (rentalEnd >= now && rentalEnd <= inSevenDays) {
            upcomingRentalsRaw.push({
              orderId: row.order_id,
              orderItemId: row.id,
              itemId: row.item_id || null,
              rentalEnd: row.rental_end,
              quantity: Number(row.quantity || 1),
              metadata: normalizeJsonObject(row.metadata)
            });
            if (row.item_id) itemIdsForUpcoming.push(row.item_id);
          }
        }
      } else if (listingType !== 'rent') {
        totalPurchases += Number(row.quantity || 1);
      }
    });

    const uniqueItemIds = Array.from(new Set(itemIdsForUpcoming.filter(Boolean)));
    const itemTitleMap = new Map();
    if (uniqueItemIds.length > 0) {
      const itemsResult = await supabase
        .from('items')
        .select('id,title')
        .in('id', uniqueItemIds);
      if (itemsResult.error) throw itemsResult.error;
      (itemsResult.data || []).forEach((item) => itemTitleMap.set(item.id, item.title || 'Item'));
    }

    const upcomingReturns = upcomingRentalsRaw
      .sort((a, b) => new Date(a.rentalEnd).getTime() - new Date(b.rentalEnd).getTime())
      .slice(0, 10)
      .map((entry) => ({
        orderId: entry.orderId,
        orderItemId: entry.orderItemId,
        itemId: entry.itemId,
        itemTitle: itemTitleMap.get(entry.itemId) || entry.metadata?.itemTitle || 'Item',
        rentalEnd: entry.rentalEnd,
        quantity: entry.quantity
      }));

    const pendingOrders = summaryOrders.filter((order) => pendingStatuses.has(String(order.status || '').toLowerCase())).length;
    const completedOrders = summaryOrders.filter((order) => completedStatuses.has(String(order.status || '').toLowerCase())).length;

    const recentOrdersPayload = recentOrders.map((order) => ({
      id: order.id,
      status: order.status,
      total: Number(order.total || 0),
      currency: order.currency || 'USD',
      createdAt: order.created_at,
      itemCount: orderItemCountMap.get(order.id) || 0,
      quantityTotal: orderQuantityMap.get(order.id) || 0,
      rentalItems: rentalItemCountMap.get(order.id) || 0,
      saleItems: saleItemCountMap.get(order.id) || 0
    }));

    return res.json({
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalOrders: totalOrdersResult.count || 0,
          pendingOrders,
          completedOrders,
          activeRentals,
          upcomingReturns: upcomingReturns.length,
          totalPurchases,
          wishlistItems: wishlistItemsCount,
          unreadNotifications: notificationsResult.count || 0,
          conversations: conversationsResult.count || 0
        },
        recentOrders: recentOrdersPayload,
        upcomingReturns
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load buyer dashboard.' });
  }
});

app.get('/dashboard/seller', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const recentLimit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 30);

    const contentAssetTypes = ['creator_post', 'creator_video', 'reel', 'story', 'short', 'marketing_asset'];
    const [storesResult, itemsResult, orderItemsResult, unreadMessagesResult, contentAssetsResult] = await Promise.all([
      supabase
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', context.user.id),
      supabase
        .from('items')
        .select('id,title,stock,views,status,category_id,store_id,created_at')
        .eq('seller_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('order_items')
        .select('id,order_id,item_id,quantity,unit_price,created_at,listing_type')
        .eq('seller_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', context.user.id)
        .eq('type', 'message')
        .is('read_at', null),
      supabase
        .from('uploaded_assets')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', context.user.id)
        .eq('status', 'active')
        .in('asset_type', contentAssetTypes)
    ]);

    if (storesResult.error) throw storesResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (orderItemsResult.error) throw orderItemsResult.error;
    if (unreadMessagesResult.error) throw unreadMessagesResult.error;
    if (contentAssetsResult.error) throw contentAssetsResult.error;

    const items = itemsResult.data || [];
    const orderItems = orderItemsResult.data || [];

    const orderIds = Array.from(new Set(orderItems.map((row) => row.order_id).filter(Boolean)));
    let orders = [];
    if (orderIds.length > 0) {
      const ordersResult = await supabase
        .from('orders')
        .select('id,status,currency,created_at,total')
        .in('id', orderIds)
        .order('created_at', { ascending: false });
      if (ordersResult.error) throw ordersResult.error;
      orders = ordersResult.data || [];
    }

    const categoryIds = Array.from(new Set(items.map((item) => item.category_id).filter(Boolean)));
    const categoryNameById = new Map();
    if (categoryIds.length > 0) {
      const categoriesResult = await supabase
        .from('categories')
        .select('id,name')
        .in('id', categoryIds);
      if (categoriesResult.error) throw categoriesResult.error;
      (categoriesResult.data || []).forEach((row) => categoryNameById.set(row.id, row.name || 'Uncategorized'));
    }

    const itemById = new Map(items.map((item) => [item.id, item]));
    const orderById = new Map(orders.map((order) => [order.id, order]));

    const orderItemCountByOrderId = new Map();
    const orderQuantityByOrderId = new Map();

    orderItems.forEach((row) => {
      const orderId = row.order_id;
      const quantity = Number(row.quantity || 1);
      orderItemCountByOrderId.set(orderId, (orderItemCountByOrderId.get(orderId) || 0) + 1);
      orderQuantityByOrderId.set(orderId, (orderQuantityByOrderId.get(orderId) || 0) + quantity);
    });

    const pendingStatuses = new Set(['pending', 'confirmed', 'processing']);
    const completedStatuses = new Set(['delivered', 'completed']);
    const excludedStatuses = new Set(['cancelled', 'refunded']);

    const months = [];
    const monthTotals = new Map();
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label: monthLabel });
      monthTotals.set(key, 0);
    }

    const categoryTotals = new Map();
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let totalSalesUnits = 0;

    orderItems.forEach((row) => {
      const order = orderById.get(row.order_id);
      const orderStatus = String(order?.status || '').toLowerCase();
      const quantity = Number(row.quantity || 1);
      const unitPrice = Number(row.unit_price || 0);
      const amount = quantity * unitPrice;

      if (pendingStatuses.has(orderStatus)) {
        pendingOrders += quantity;
      }

      if (completedStatuses.has(orderStatus)) {
        completedOrders += quantity;
      }

      if (excludedStatuses.has(orderStatus)) return;

      totalRevenue += amount;
      totalSalesUnits += quantity;

      const monthDate = new Date(order?.created_at || row.created_at || now.toISOString());
      const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
      if (monthTotals.has(monthKey)) {
        monthTotals.set(monthKey, monthTotals.get(monthKey) + amount);
      }

      const linkedItem = itemById.get(row.item_id);
      const categoryName = categoryNameById.get(linkedItem?.category_id) || 'Uncategorized';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + quantity);
    });

    const totalViews = items.reduce((sum, item) => sum + Number(item.views || 0), 0);
    const conversionRate = totalViews > 0
      ? Number(((completedOrders / totalViews) * 100).toFixed(2))
      : 0;

    const lowStockItems = items
      .filter((item) => Number(item.stock || 0) <= 5 && String(item.status || 'active').toLowerCase() !== 'archived')
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        title: item.title || 'Untitled item',
        stock: Number(item.stock || 0),
        status: item.status || 'active'
      }));

    const recentOrders = orders
      .slice(0, recentLimit)
      .map((order) => ({
        id: order.id,
        status: order.status || 'pending',
        total: Number(order.total || 0),
        currency: order.currency || 'USD',
        createdAt: order.created_at || new Date().toISOString(),
        itemCount: orderItemCountByOrderId.get(order.id) || 0,
        quantityTotal: orderQuantityByOrderId.get(order.id) || 0
      }));

    const earningsByMonth = months.map((month) => ({
      month: month.label,
      earnings: Number((monthTotals.get(month.key) || 0).toFixed(2))
    }));

    const categorySales = Array.from(categoryTotals.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const hasStore = (storesResult.count || 0) > 0;
    const hasProducts = items.length > 0;
    const hasContent = (contentAssetsResult.count || 0) > 0;
    const hasApps = false;

    const insights = [];
    if (!hasStore) {
      insights.push({
        id: 'setup-store',
        type: 'marketing',
        message: 'Create your store to unlock storefront analytics and branded checkout.',
        actionLabel: 'Set up store',
        actionLink: '/profile/store'
      });
    }
    if (!hasProducts) {
      insights.push({
        id: 'setup-products',
        type: 'marketing',
        message: 'Add your first product so customers can discover and order from your profile.',
        actionLabel: 'Add product',
        actionLink: '/profile/products/new'
      });
    }
    if (lowStockItems.length > 0) {
      insights.push({
        id: 'inventory-low',
        type: 'inventory',
        message: `${lowStockItems.length} items are low in stock and may stop converting soon.`,
        actionLabel: 'Manage inventory',
        actionLink: '/profile/products'
      });
    }
    if (conversionRate > 0 && conversionRate < 2) {
      insights.push({
        id: 'conversion-low',
        type: 'pricing',
        message: 'Conversion is below 2%. Review pricing and product media to improve performance.',
        actionLabel: 'Open analytics',
        actionLink: '/profile/analytics/advanced'
      });
    }
    if (pendingOrders > 0) {
      insights.push({
        id: 'orders-pending',
        type: 'marketing',
        message: `${pendingOrders} order units need fulfillment attention.`,
        actionLabel: 'Review orders',
        actionLink: '/profile/sales'
      });
    }

    return res.json({
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          pendingOrders,
          completedOrders,
          totalSalesUnits,
          totalViews,
          conversionRate,
          lowStockCount: lowStockItems.length,
          unreadMessages: unreadMessagesResult.count || 0
        },
        earningsByMonth,
        categorySales,
        recentOrders,
        lowStockItems,
        insights,
        setup: {
          hasStore,
          hasProducts,
          hasContent,
          hasApps
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load seller dashboard.' });
  }
});

app.get('/personas', requireAuth, async (req, res) => {
  const { firebase_uid, type, status, limit = '100' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
  const requesterFirebaseUid = getRequestFirebaseUid(req);

  let query = supabase
    .from('personas')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (requesterFirebaseUid) {
    query = query.eq('firebase_uid', requesterFirebaseUid);
  } else if (firebase_uid) {
    query = query.eq('firebase_uid', firebase_uid);
  }
  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data, count });
});

app.post('/personas', requireAuth, async (req, res) => {
  const payload = normalizeJsonObject(req.body);
  const upsert = req.query.upsert === '1' || req.query.upsert === 'true';
  const requesterFirebaseUid = getRequestFirebaseUid(req);

  if (requesterFirebaseUid) {
    const requesterUserId = await resolveUserIdFromFirebaseUid(requesterFirebaseUid);
    if (!requesterUserId) {
      return res.status(400).json({ error: 'Requester user not found.' });
    }
    if (payload.firebase_uid && payload.firebase_uid !== requesterFirebaseUid) {
      return res.status(403).json({ error: 'Cannot create persona for another user.' });
    }
    if (payload.user_id && payload.user_id !== requesterUserId) {
      return res.status(403).json({ error: 'Cannot create persona for another user.' });
    }
    payload.firebase_uid = requesterFirebaseUid;
    payload.user_id = requesterUserId;
  }

  let query = supabase.from('personas');
  query = upsert
    ? query.upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
    : query.insert(payload);

  const { data, error } = await query.select('*');
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ data });
});

app.patch('/personas/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const payload = normalizeJsonObject(req.body);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    delete payload.user_id;
    delete payload.firebase_uid;
  }

  const { data, error } = await supabase.from('personas').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post('/personas/:id/switch', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const { data, error } = await supabase.from('personas').select('*').eq('id', id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Persona not found' });
  return res.json({ data, switched_at: new Date().toISOString() });
});

app.post('/personas/:id/capability-requests', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { capability, notes } = req.body || {};

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  if (!capability) {
    return res.status(400).json({ error: 'capability is required' });
  }

  const payload = {
    persona_id: id,
    capability,
    notes: notes || null,
    status: 'pending'
  };

  const { data, error } = await supabase.from('persona_capability_requests').insert(payload).select('*').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ data });
});

app.get('/personas/:id/notifications', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { limit = '50' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('persona_notifications')
    .select('*')
    .eq('persona_id', id)
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post('/personas/:id/notifications/read', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(id, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('persona_notifications')
    .update({ read_at: readAt })
    .eq('persona_id', id)
    .is('read_at', null)
    .select('*');

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data, read_at: readAt });
});

const DEFAULT_ACTIVITY_PREFERENCES = {
  itemView: true,
  cartAdd: true,
  purchase: true,
  rent: true,
  auctionWin: true,
  instantAlert: true,
  dailyDigest: true
};

const ACTION_TO_PREFERENCE_KEY = {
  item_view: 'itemView',
  cart_add: 'cartAdd',
  purchase: 'purchase',
  rent: 'rent',
  auction_win: 'auctionWin'
};

const normalizeActivityPreferences = (raw = {}) => ({
  ...DEFAULT_ACTIVITY_PREFERENCES,
  ...(raw && typeof raw === 'object' ? raw : {})
});

const buildActivityNotificationBody = ({ action, actorName, itemTitle, quantity }) => {
  const safeActor = actorName || 'Someone';
  const safeItem = itemTitle || 'your listing';
  const qty = quantity ? ` x${quantity}` : '';

  if (action === 'cart_add') return `${safeActor} added ${safeItem} to cart${qty}.`;
  if (action === 'purchase') return `${safeActor} purchased ${safeItem}${qty}.`;
  if (action === 'rent') return `${safeActor} rented ${safeItem}${qty}.`;
  if (action === 'auction_win') return `${safeActor} won the auction for ${safeItem}.`;
  return `${safeActor} viewed ${safeItem}.`;
};

app.post('/activity/events', requireAuth, async (req, res) => {
  const {
    action,
    owner_firebase_uid,
    owner_persona_id,
    actor_firebase_uid,
    actor_persona_id,
    actor_name,
    item_id,
    item_title,
    listing_type,
    quantity,
    duration_ms,
    metadata = {}
  } = req.body || {};

  if (!action || !owner_firebase_uid || !item_id) {
    return res.status(400).json({ error: 'action, owner_firebase_uid, and item_id are required' });
  }

  const ownerUserId = await resolveUserIdFromFirebaseUid(owner_firebase_uid);
  if (!ownerUserId) {
    return res.status(400).json({ error: 'Owner user not found' });
  }

  const actorUserId = actor_firebase_uid ? await resolveUserIdFromFirebaseUid(actor_firebase_uid) : null;

  const { data: itemRow } = await supabase
    .from('items')
    .select('id,title,owner_persona_id,metadata')
    .eq('id', item_id)
    .maybeSingle();

  const ownerPersonaId = owner_persona_id || itemRow?.owner_persona_id || null;
  const itemTitle = item_title || itemRow?.title || 'Item';
  const activityPreferences = normalizeActivityPreferences(itemRow?.metadata?.activityPreferences || {});
  const actionPreferenceKey = ACTION_TO_PREFERENCE_KEY[action] || null;
  const allowsActionNotification = actionPreferenceKey ? activityPreferences[actionPreferenceKey] !== false : true;
  const shouldSendInstantAlert = allowsActionNotification && activityPreferences.instantAlert !== false;

  const details = {
    ownerFirebaseUid: owner_firebase_uid,
    ownerPersonaId,
    actorFirebaseUid: actor_firebase_uid || null,
    actorPersonaId: actor_persona_id || null,
    actorName: actor_name || null,
    itemId: item_id,
    itemTitle,
    listingType: listing_type || null,
    quantity: quantity || null,
    durationMs: duration_ms || null,
    metadata: metadata || {}
  };

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_user_id: actorUserId,
      action,
      entity_type: 'item',
      entity_id: owner_firebase_uid,
      details
    })
    .select('*')
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });

  if (shouldSendInstantAlert) {
    const notificationBody = buildActivityNotificationBody({
      action,
      actorName: actor_name,
      itemTitle,
      quantity
    });

    if (ownerPersonaId) {
      await supabase.from('persona_notifications').insert({
        persona_id: ownerPersonaId,
        type: 'listing',
        title: 'Listing activity',
        body: notificationBody,
        link: `/item/${item_id}`
      });
    }

    await supabase.from('notifications').insert({
      user_id: ownerUserId,
      type: 'listing',
      title: 'Listing activity',
      body: notificationBody,
      link: `/item/${item_id}`
    });
  }

  return res.status(201).json({ data });
});

app.get('/activity/owner/:personaId', requireAuth, async (req, res) => {
  const { personaId } = req.params;
  const { limit = '100' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 1000);

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(personaId, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .contains('details', { ownerPersonaId: personaId })
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data: data || [] });
});

app.get('/activity/summary/:personaId', requireAuth, async (req, res) => {
  const { personaId } = req.params;

  if (req.user?.uid) {
    const canAccess = await userCanAccessPersona(personaId, req.user.uid);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, details, created_at')
    .contains('details', { ownerPersonaId: personaId })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return res.status(400).json({ error: error.message });

  const rows = data || [];
  const viewRows = rows.filter((row) => row.action === 'item_view');
  const totalViewMs = viewRows.reduce((sum, row) => sum + Number(row?.details?.durationMs || 0), 0);

  const summary = {
    totalEvents: rows.length,
    views: viewRows.length,
    cartAdds: rows.filter((row) => row.action === 'cart_add').length,
    purchases: rows.filter((row) => row.action === 'purchase').length,
    rentals: rows.filter((row) => row.action === 'rent').length,
    auctionWins: rows.filter((row) => row.action === 'auction_win').length,
    averageViewSeconds: viewRows.length ? Math.round(totalViewMs / viewRows.length / 1000) : 0
  };

  return res.json({ data: summary });
});

// OmniWork V1 endpoints
app.post('/work/listings', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const title = toNullableText(body.title);
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const providerSnapshotInput = normalizeJsonObject(body.providerSnapshot || body.provider_snapshot);
    const providerSnapshot = {
      id: context.user.id,
      name: providerSnapshotInput.name || context.user.name || 'Provider',
      avatar: providerSnapshotInput.avatar || context.user.avatar_url || '/icons/urbanprime.svg',
      rating: parsePositiveNumber(providerSnapshotInput.rating, 0),
      reviews: Array.isArray(providerSnapshotInput.reviews) ? providerSnapshotInput.reviews : []
    };

    const payload = {
      seller_id: context.user.id,
      seller_persona_id: body.sellerPersonaId || body.seller_persona_id || null,
      title,
      description: toNullableText(body.description) || '',
      category: toNullableText(body.category) || 'general',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      pricing_type: toNullableText(body.pricingType || body.pricing_type) || 'fixed',
      base_price: parsePositiveNumber(body.basePrice ?? body.base_price, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      packages: Array.isArray(body.packages) ? body.packages : [],
      skills: Array.isArray(body.skills) ? body.skills : [],
      media: Array.isArray(body.media) ? body.media : (Array.isArray(body.imageUrls) ? body.imageUrls : []),
      availability: normalizeJsonObject(body.availability),
      provider_snapshot: providerSnapshot,
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkListingStatus(body.status, 'draft'),
      visibility: toNullableText(body.visibility) || 'public',
      published_at: normalizeWorkListingStatus(body.status, 'draft') === 'published'
        ? new Date().toISOString()
        : null
    };

    const { data, error } = await supabase
      .from('work_listings')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await mirrorWorkListingForLegacy(data);
    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_listing_created',
      entityType: 'work_listing',
      entityId: data.id,
      details: {
        mode: data.mode,
        fulfillmentKind: data.fulfillment_kind,
        status: data.status
      }
    });

    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create work listing.' });
  }
});

app.get('/work/listings', async (req, res) => {
  try {
    const {
      status,
      sellerId,
      mode,
      category,
      q,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = supabase
      .from('work_listings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', normalizeWorkListingStatus(status, 'published'));
    if (sellerId) query = query.eq('seller_id', sellerId);
    if (mode) query = query.eq('mode', normalizeWorkMode(mode, 'hybrid'));
    if (category) query = query.eq('category', category);
    if (q && typeof q === 'string') query = query.ilike('title', `%${q}%`);

    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ data: data || [], count: count || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to list work listings.' });
  }
});

app.get('/work/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('work_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Work listing not found' });
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to load work listing.' });
  }
});

app.post('/work/requests', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    const title = toNullableText(body.title);
    const brief = toNullableText(body.brief);
    if (!title || !brief) {
      return res.status(400).json({ error: 'title and brief are required' });
    }

    let targetProviderId = body.targetProviderId || body.target_provider_id || null;
    if (!targetProviderId && body.listingId) {
      const listingLookup = await supabase
        .from('work_listings')
        .select('seller_id')
        .eq('id', body.listingId)
        .maybeSingle();
      if (listingLookup.error) throw listingLookup.error;
      targetProviderId = listingLookup.data?.seller_id || null;
    }

    const payload = {
      requester_id: context.user.id,
      requester_persona_id: body.requesterPersonaId || body.requester_persona_id || null,
      requester_snapshot: {
        id: context.user.id,
        name: context.user.name || 'Client',
        avatar: context.user.avatar_url || '/icons/urbanprime.svg'
      },
      title,
      brief,
      listing_id: body.listingId || body.listing_id || null,
      target_provider_id: targetProviderId,
      category: toNullableText(body.category) || 'general',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      budget_min: parsePositiveNumber(body.budgetMin ?? body.budget_min, 0),
      budget_max: parsePositiveNumber(body.budgetMax ?? body.budget_max, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      location: normalizeJsonObject(body.location),
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkRequestStatus(body.status, 'open')
    };

    const { data, error } = await supabase
      .from('work_requests')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await supabase.from('mirror_documents').upsert({
      collection: 'work_requests',
      doc_id: data.id,
      data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'collection,doc_id',
      ignoreDuplicates: false
    });

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_request_created',
      entityType: 'work_request',
      entityId: data.id,
      details: {
        mode: data.mode,
        fulfillmentKind: data.fulfillment_kind,
        targetProviderId: data.target_provider_id || null
      }
    });

    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create work request.' });
  }
});

app.get('/work/requests', requireAuth, async (req, res) => {
  try {
    const {
      status,
      requesterId,
      targetProviderId,
      mode,
      category,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = supabase
      .from('work_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', normalizeWorkRequestStatus(status, 'open'));
    if (requesterId) query = query.eq('requester_id', requesterId);
    if (targetProviderId) query = query.eq('target_provider_id', targetProviderId);
    if (mode) query = query.eq('mode', normalizeWorkMode(mode, 'hybrid'));
    if (category) query = query.eq('category', category);

    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({ data: data || [], count: count || 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to list work requests.' });
  }
});

app.post('/work/proposals', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    if (!body.clientId && !body.client_id) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const payload = {
      request_id: body.requestId || body.request_id || null,
      listing_id: body.listingId || body.listing_id || null,
      provider_id: context.user.id,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      provider_snapshot: normalizeJsonObject(body.providerSnapshot) || {
        id: context.user.id,
        name: context.user.name || 'Provider',
        avatar: context.user.avatar_url || '/icons/urbanprime.svg',
        rating: 0
      },
      client_id: body.clientId || body.client_id,
      client_persona_id: body.clientPersonaId || body.client_persona_id || null,
      client_snapshot: normalizeJsonObject(body.clientSnapshot || body.client_snapshot),
      title: toNullableText(body.title) || 'Proposal',
      cover_letter: toNullableText(body.coverLetter || body.cover_letter) || '',
      price_total: parsePositiveNumber(body.priceTotal ?? body.price_total, 0),
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      delivery_days: parsePositiveNumber(body.deliveryDays ?? body.delivery_days, 0),
      milestones: Array.isArray(body.milestones) ? body.milestones : [],
      terms: normalizeJsonObject(body.terms),
      revision_limit: parsePositiveNumber(body.revisionLimit ?? body.revision_limit, 0),
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkProposalStatus(body.status, 'pending')
    };

    const { data, error } = await supabase
      .from('work_proposals')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_proposal_created',
      entityType: 'work_proposal',
      entityId: data.id,
      details: {
        requestId: data.request_id,
        listingId: data.listing_id,
        status: data.status,
        priceTotal: data.price_total
      }
    });

    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create proposal.' });
  }
});

app.patch('/work/proposals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = normalizeJsonObject(req.body);

    const updates = {};
    if (body.status !== undefined) updates.status = normalizeWorkProposalStatus(body.status, 'pending');
    if (body.coverLetter !== undefined || body.cover_letter !== undefined) {
      updates.cover_letter = toNullableText(body.coverLetter || body.cover_letter) || '';
    }
    if (body.priceTotal !== undefined || body.price_total !== undefined) {
      updates.price_total = parsePositiveNumber(body.priceTotal ?? body.price_total, 0);
    }
    if (body.deliveryDays !== undefined || body.delivery_days !== undefined) {
      updates.delivery_days = parsePositiveNumber(body.deliveryDays ?? body.delivery_days, 0);
    }
    if (body.milestones !== undefined) updates.milestones = Array.isArray(body.milestones) ? body.milestones : [];
    if (body.terms !== undefined) updates.terms = normalizeJsonObject(body.terms);
    if (updates.status && ['accepted', 'declined'].includes(updates.status)) {
      updates.responded_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_proposals')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Proposal not found' });

    await writeAuditLog({
      actorUserId: req.user?.uid ? (await resolveSupabaseUserId(req.user.uid)) : null,
      action: 'work_proposal_updated',
      entityType: 'work_proposal',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update proposal.' });
  }
});

app.post('/work/contracts', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const body = normalizeJsonObject(req.body);
    let providerId = body.providerId || body.provider_id || null;
    let clientId = body.clientId || body.client_id || null;

    if (body.proposalId || body.proposal_id) {
      const proposalLookup = await supabase
        .from('work_proposals')
        .select('*')
        .eq('id', body.proposalId || body.proposal_id)
        .maybeSingle();
      if (proposalLookup.error) throw proposalLookup.error;
      if (proposalLookup.data) {
        providerId = providerId || proposalLookup.data.provider_id;
        clientId = clientId || proposalLookup.data.client_id;
      }
    }

    if (!providerId || !clientId) {
      return res.status(400).json({ error: 'providerId and clientId are required for contract creation.' });
    }

    const provider = await resolveUserById(providerId);
    const client = await resolveUserById(clientId);

    const engagementPayload = {
      source_type: 'contract',
      source_id: 'pending',
      mode: normalizeWorkMode(body.mode, 'hybrid'),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
      buyer_id: clientId,
      buyer_persona_id: body.clientPersonaId || body.client_persona_id || null,
      provider_id: providerId,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      currency: normalizeCurrencyCode(body.currency, 'USD'),
      timezone: toNullableText(body.timezone) || 'UTC',
      gross_amount: parsePositiveNumber(body.totalAmount ?? body.total_amount, 0),
      escrow_status: 'none',
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: 'created',
      metadata: normalizeJsonObject(body.metadata)
    };

    const engagementInsert = await supabase
      .from('work_engagements')
      .insert(engagementPayload)
      .select('*')
      .maybeSingle();
    if (engagementInsert.error) throw engagementInsert.error;

    const contractPayload = {
      proposal_id: body.proposalId || body.proposal_id || null,
      request_id: body.requestId || body.request_id || null,
      listing_id: body.listingId || body.listing_id || null,
      engagement_id: engagementInsert.data.id,
      client_id: clientId,
      client_persona_id: body.clientPersonaId || body.client_persona_id || null,
      client_snapshot: client ? {
        id: client.id,
        name: client.name || 'Client',
        avatar: client.avatar_url || '/icons/urbanprime.svg'
      } : {},
      provider_id: providerId,
      provider_persona_id: body.providerPersonaId || body.provider_persona_id || null,
      provider_snapshot: provider ? {
        id: provider.id,
        name: provider.name || 'Provider',
        avatar: provider.avatar_url || '/icons/urbanprime.svg'
      } : {},
      scope: toNullableText(body.scope) || '',
      mode: normalizeWorkMode(body.mode, engagementPayload.mode),
      fulfillment_kind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, engagementPayload.fulfillment_kind),
      currency: normalizeCurrencyCode(body.currency, engagementPayload.currency),
      timezone: toNullableText(body.timezone) || engagementPayload.timezone,
      total_amount: parsePositiveNumber(body.totalAmount ?? body.total_amount, 0),
      escrow_held: parsePositiveNumber(body.escrowHeld ?? body.escrow_held, 0),
      risk_score: parsePositiveNumber(body.riskScore ?? body.risk_score, 0),
      status: normalizeWorkContractStatus(body.status, 'pending'),
      terms: normalizeJsonObject(body.terms),
      start_at: body.startAt || body.start_at || null,
      due_at: body.dueAt || body.due_at || null
    };

    const contractInsert = await supabase
      .from('work_contracts')
      .insert(contractPayload)
      .select('*')
      .maybeSingle();
    if (contractInsert.error) throw contractInsert.error;

    await supabase
      .from('work_engagements')
      .update({
        source_id: contractInsert.data.id,
        status: contractInsert.data.status === 'active' ? 'active' : 'created',
        updated_at: new Date().toISOString()
      })
      .eq('id', engagementInsert.data.id);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_contract_created',
      entityType: 'work_contract',
      entityId: contractInsert.data.id,
      details: {
        engagementId: engagementInsert.data.id,
        providerId,
        clientId,
        totalAmount: contractInsert.data.total_amount
      }
    });

    return res.status(201).json({ data: contractInsert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create contract.' });
  }
});

app.patch('/work/contracts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const updates = {};

    if (body.scope !== undefined) updates.scope = toNullableText(body.scope) || '';
    if (body.mode !== undefined) updates.mode = normalizeWorkMode(body.mode, 'hybrid');
    if (body.fulfillmentKind !== undefined || body.fulfillment_kind !== undefined) {
      updates.fulfillment_kind = normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid');
    }
    if (body.currency !== undefined) updates.currency = normalizeCurrencyCode(body.currency, 'USD');
    if (body.timezone !== undefined) updates.timezone = toNullableText(body.timezone) || 'UTC';
    if (body.totalAmount !== undefined || body.total_amount !== undefined) {
      updates.total_amount = parsePositiveNumber(body.totalAmount ?? body.total_amount, 0);
    }
    if (body.escrowHeld !== undefined || body.escrow_held !== undefined) {
      updates.escrow_held = parsePositiveNumber(body.escrowHeld ?? body.escrow_held, 0);
    }
    if (body.terms !== undefined) updates.terms = normalizeJsonObject(body.terms);
    if (body.startAt !== undefined || body.start_at !== undefined) {
      updates.start_at = body.startAt || body.start_at || null;
    }
    if (body.dueAt !== undefined || body.due_at !== undefined) {
      updates.due_at = body.dueAt || body.due_at || null;
    }
    if (body.status !== undefined) {
      updates.status = normalizeWorkContractStatus(body.status, 'pending');
      if (updates.status === 'completed') updates.completed_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_contracts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contract not found' });

    if (data.engagement_id) {
      const nextEngagementStatus = data.status === 'completed'
        ? 'completed'
        : data.status === 'cancelled'
          ? 'cancelled'
          : data.status === 'disputed'
            ? 'disputed'
            : data.status === 'active'
              ? 'active'
              : 'created';
      await supabase
        .from('work_engagements')
        .update({
          status: nextEngagementStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.engagement_id);
    }

    await writeAuditLog({
      actorUserId: req.user?.uid ? (await resolveSupabaseUserId(req.user.uid)) : null,
      action: 'work_contract_updated',
      entityType: 'work_contract',
      entityId: id,
      details: updates
    });

    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update contract.' });
  }
});

app.post('/work/contracts/:id/milestones', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const { id } = req.params;
    const body = normalizeJsonObject(req.body);
    const milestonesInput = Array.isArray(body.milestones)
      ? body.milestones
      : [body];

    const contractLookup = await supabase
      .from('work_contracts')
      .select('id,currency')
      .eq('id', id)
      .maybeSingle();
    if (contractLookup.error) throw contractLookup.error;
    if (!contractLookup.data) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const normalizedRows = milestonesInput
      .map((entry, index) => {
        const item = normalizeJsonObject(entry);
        const title = toNullableText(item.title);
        if (!title) return null;
        return {
          contract_id: id,
          title,
          description: toNullableText(item.description) || '',
          amount: parsePositiveNumber(item.amount, 0),
          currency: normalizeCurrencyCode(item.currency, contractLookup.data.currency || 'USD'),
          due_at: item.dueAt || item.due_at || null,
          sort_order: parsePositiveNumber(item.sortOrder ?? item.sort_order, index),
          status: normalizeMilestoneStatus(item.status, 'pending'),
          deliverables: Array.isArray(item.deliverables) ? item.deliverables : []
        };
      })
      .filter(Boolean);

    if (normalizedRows.length === 0) {
      return res.status(400).json({ error: 'At least one milestone with title is required.' });
    }

    const { data, error } = await supabase
      .from('work_milestones')
      .insert(normalizedRows)
      .select('*');
    if (error) throw error;

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_milestones_created',
      entityType: 'work_contract',
      entityId: id,
      details: { count: data?.length || 0 }
    });

    return res.status(201).json({ data: data || [] });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to add milestones.' });
  }
});

app.post('/work/escrow/hold', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'hold';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementIdInput = body.engagementId || body.engagement_id || null;
    let engagementId = engagementIdInput;
    let contract = null;

    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      engagementId = engagementId || contract?.engagement_id || null;
    }
    if (!engagementId) return res.status(400).json({ error: 'engagementId or contractId is required' });

    const payload = {
      engagement_id: engagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.provider_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: parsePositiveNumber(contract.escrow_held, 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'held',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', engagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_hold',
      entityType: 'work_engagement',
      entityId: engagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to hold escrow.' });
  }
});

app.post('/work/escrow/release', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'release';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementId = body.engagementId || body.engagement_id || null;
    if (!engagementId && !contractId) {
      return res.status(400).json({ error: 'engagementId or contractId is required' });
    }

    let contract = null;
    let resolvedEngagementId = engagementId;
    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      resolvedEngagementId = resolvedEngagementId || contract?.engagement_id || null;
    }
    if (!resolvedEngagementId) {
      return res.status(400).json({ error: 'Unable to resolve engagement for release.' });
    }

    const payload = {
      engagement_id: resolvedEngagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.provider_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      const nextEscrow = Math.max(0, parsePositiveNumber(contract.escrow_held, 0) - amount);
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: nextEscrow,
          status: nextEscrow === 0 && contract.status === 'active' ? 'completed' : contract.status,
          completed_at: nextEscrow === 0 ? new Date().toISOString() : contract.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'released',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedEngagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_release',
      entityType: 'work_engagement',
      entityId: resolvedEngagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to release escrow.' });
  }
});

app.post('/work/escrow/refund', requireAuth, async (req, res) => {
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const action = 'refund';
    const amount = parsePositiveNumber(body.amount, 0);
    if (amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const contractId = body.contractId || body.contract_id || null;
    const engagementId = body.engagementId || body.engagement_id || null;
    if (!engagementId && !contractId) {
      return res.status(400).json({ error: 'engagementId or contractId is required' });
    }

    let contract = null;
    let resolvedEngagementId = engagementId;
    if (contractId) {
      const contractLookup = await supabase
        .from('work_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();
      if (contractLookup.error) throw contractLookup.error;
      contract = contractLookup.data || null;
      resolvedEngagementId = resolvedEngagementId || contract?.engagement_id || null;
    }
    if (!resolvedEngagementId) {
      return res.status(400).json({ error: 'Unable to resolve engagement for refund.' });
    }

    const payload = {
      engagement_id: resolvedEngagementId,
      contract_id: contractId,
      milestone_id: body.milestoneId || body.milestone_id || null,
      payer_id: body.payerId || body.payer_id || contract?.provider_id || context.user.id,
      payee_id: body.payeeId || body.payee_id || contract?.client_id || null,
      action,
      amount,
      currency: normalizeCurrencyCode(body.currency, contract?.currency || 'USD'),
      status: 'succeeded',
      provider_ref: toNullableText(body.providerRef || body.provider_ref),
      metadata: normalizeJsonObject(body.metadata)
    };

    const insert = await supabase
      .from('work_escrow_ledger')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (insert.error) throw insert.error;

    if (contract) {
      const nextEscrow = Math.max(0, parsePositiveNumber(contract.escrow_held, 0) - amount);
      await supabase
        .from('work_contracts')
        .update({
          escrow_held: nextEscrow,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: 'refunded',
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedEngagementId);

    await writeAuditLog({
      actorUserId: context.user.id,
      action: 'work_escrow_refund',
      entityType: 'work_engagement',
      entityId: resolvedEngagementId,
      details: { amount, contractId }
    });

    return res.status(201).json({ data: insert.data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to refund escrow.' });
  }
});

app.post('/work/autopilot/scope', requireAuth, async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const brief = toNullableText(body.brief) || '';
    if (!brief) {
      return res.status(400).json({ error: 'brief is required' });
    }

    const wordCount = brief.split(/\s+/).filter(Boolean).length;
    const complexity = Math.min(5, Math.max(1, Math.round(wordCount / 60)));
    const suggestedTimelineDays = Math.min(45, Math.max(5, complexity * 5));
    const confidence = Number(Math.min(0.95, 0.55 + complexity * 0.08).toFixed(2));

    const output = {
      normalizedRequest: {
        title: toNullableText(body.title) || brief.slice(0, 80) || 'Autopilot generated request',
        brief,
        category: toNullableText(body.category) || 'general',
        mode: normalizeWorkMode(body.mode, 'hybrid'),
        fulfillmentKind: normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid'),
        budgetMin: parsePositiveNumber(body.budgetMin ?? body.budget_min, 0),
        budgetMax: parsePositiveNumber(body.budgetMax ?? body.budget_max, 0),
        currency: normalizeCurrencyCode(body.currency, 'USD'),
        timezone: toNullableText(body.timezone) || 'UTC',
        requirements: brief
          .split(/[.;\n]/)
          .map((segment) => segment.trim())
          .filter(Boolean)
          .slice(0, 8)
      },
      suggestedMilestones: [
        { title: 'Scope Alignment', amountPct: 20, description: 'Confirm deliverables and project boundaries.' },
        { title: 'Main Delivery', amountPct: 50, description: 'Deliver core output for review.' },
        { title: 'Revision & Handoff', amountPct: 30, description: 'Finalize revisions and transfer all assets.' }
      ],
      suggestedTimelineDays,
      confidence
    };

    const latencyMs = Date.now() - startedAt;
    await supabase.from('work_autopilot_runs').insert({
      run_type: 'scope',
      actor_user_id: context.user.id,
      actor_persona_id: body.actorPersonaId || body.actor_persona_id || null,
      request_id: body.requestId || body.request_id || null,
      listing_id: body.listingId || body.listing_id || null,
      contract_id: body.contractId || body.contract_id || null,
      input_payload: body,
      output_payload: output,
      model: 'heuristic-v1',
      status: 'succeeded',
      latency_ms: latencyMs
    });

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to run autopilot scope.' });
  }
});

app.post('/work/autopilot/match', requireAuth, async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }
    const body = normalizeJsonObject(req.body);
    const category = toNullableText(body.category);
    const mode = normalizeWorkMode(body.mode, 'hybrid');
    const fulfillmentKind = normalizeFulfillmentKind(body.fulfillmentKind || body.fulfillment_kind, 'hybrid');
    const limit = Math.min(Math.max(parseInt(String(body.limit || 20), 10) || 20, 1), 50);
    const requestedSkills = Array.isArray(body.skills)
      ? body.skills.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
      : [];

    let listingQuery = supabase
      .from('work_listings')
      .select('*')
      .eq('status', 'published')
      .order('risk_score', { ascending: true })
      .limit(limit * 4);

    if (category) listingQuery = listingQuery.eq('category', category);

    const { data: listings, error } = await listingQuery;
    if (error) throw error;

    const matches = (listings || []).map((listing) => {
      let score = 50;
      const reasons = [];

      if (listing.mode === mode) {
        score += 20;
        reasons.push('Mode alignment');
      } else if (listing.mode === 'hybrid' || mode === 'hybrid') {
        score += 10;
        reasons.push('Flexible mode compatibility');
      }

      if ((listing.fulfillment_kind || 'hybrid') === fulfillmentKind) {
        score += 15;
        reasons.push('Fulfillment kind match');
      } else if ((listing.fulfillment_kind || 'hybrid') === 'hybrid' || fulfillmentKind === 'hybrid') {
        score += 8;
        reasons.push('Hybrid fulfillment compatibility');
      }

      const listingSkills = Array.isArray(listing.skills)
        ? listing.skills.map((entry) => String(entry).toLowerCase())
        : [];
      const overlap = requestedSkills.filter((skill) => listingSkills.includes(skill)).length;
      if (overlap > 0) {
        score += Math.min(15, overlap * 5);
        reasons.push(`${overlap} skill match${overlap > 1 ? 'es' : ''}`);
      }

      const riskScore = parsePositiveNumber(listing.risk_score, 0);
      score -= Math.min(10, riskScore / 10);
      if (riskScore <= 25) reasons.push('Low risk profile');

      return {
        listing,
        score: Number(Math.max(0, Math.min(100, score)).toFixed(2)),
        reasons
      };
    })
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    const output = { matches };
    const latencyMs = Date.now() - startedAt;
    await supabase.from('work_autopilot_runs').insert({
      run_type: 'match',
      actor_user_id: context.user.id,
      actor_persona_id: body.actorPersonaId || body.actor_persona_id || null,
      request_id: body.requestId || body.request_id || null,
      input_payload: body,
      output_payload: output,
      model: 'heuristic-match-v1',
      status: 'succeeded',
      latency_ms: latencyMs
    });

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to run autopilot match.' });
  }
});

app.post('/work/autopilot/health', requireAuth, async (req, res) => {
  const startedAt = Date.now();
  try {
    const context = await getUserContext(req);
    if (context.error) {
      return res.status(400).json({ error: context.error.message || 'Unable to resolve user context.' });
    }

    const [listingsCount, requestsCount, proposalsCount, contractsCount, disputesCount] = await Promise.all([
      supabase.from('work_listings').select('id', { count: 'exact', head: true }),
      supabase.from('work_requests').select('id', { count: 'exact', head: true }),
      supabase.from('work_proposals').select('id', { count: 'exact', head: true }),
      supabase.from('work_contracts').select('id', { count: 'exact', head: true }),
      supabase.from('work_disputes').select('id', { count: 'exact', head: true })
    ]);

    if (listingsCount.error) throw listingsCount.error;
    if (requestsCount.error) throw requestsCount.error;
    if (proposalsCount.error) throw proposalsCount.error;
    if (contractsCount.error) throw contractsCount.error;
    if (disputesCount.error) throw disputesCount.error;

    const output = {
      ok: true,
      engine: 'omniwork-autopilot-v1',
      generatedAt: new Date().toISOString(),
      counters: {
        listings: listingsCount.count || 0,
        requests: requestsCount.count || 0,
        proposals: proposalsCount.count || 0,
        contracts: contractsCount.count || 0,
        disputes: disputesCount.count || 0
      }
    };

    const latencyMs = Date.now() - startedAt;
    await supabase.from('work_autopilot_runs').insert({
      run_type: 'health',
      actor_user_id: context.user.id,
      input_payload: {},
      output_payload: output,
      model: 'omniwork-health-v1',
      status: 'succeeded',
      latency_ms: latencyMs
    });

    return res.status(201).json({ data: output });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to get autopilot health.' });
  }
});

app.get('/api/:table', requireAuth, requireTable, async (req, res) => {
  const { table } = req.params;
  const { select = '*', limit = '50', offset = '0', order } = req.query;

  let query = supabase.from(table).select(select, { count: 'exact' });

  if (order && typeof order === 'string') {
    const [col, dir] = order.split('.');
    query = query.order(col, { ascending: dir !== 'desc' });
  }

  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
  const offsetNum = Math.max(parseInt(String(offset), 10) || 0, 0);
  query = query.range(offsetNum, offsetNum + limitNum - 1);

  Object.entries(req.query).forEach(([key, value]) => {
    if (['select', 'limit', 'offset', 'order'].includes(key)) return;
    if (value === undefined) return;
    const val = Array.isArray(value) ? value[0] : value;

    if (key.includes('.')) {
      const [op, field] = key.split('.', 2);
      switch (op) {
        case 'eq':
          query = query.eq(field, val);
          break;
        case 'ilike':
          query = query.ilike(field, String(val));
          break;
        case 'gt':
          query = query.gt(field, val);
          break;
        case 'gte':
          query = query.gte(field, val);
          break;
        case 'lt':
          query = query.lt(field, val);
          break;
        case 'lte':
          query = query.lte(field, val);
          break;
        case 'in':
          query = query.in(field, String(val).split(','));
          break;
        default:
          break;
      }
      return;
    }

    query = query.eq(key, val);
  });

  const { data, error, count } = await query;
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.json({ data, count });
});

app.get('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json({ data });
});

app.post('/api/:table', requireAuth, requireTable, async (req, res) => {
  const { table } = req.params;
  const { upsert, onConflict } = req.query;
  const payload = req.body;

  let query = supabase.from(table);
  if (upsert) {
    query = query.upsert(payload, {
      onConflict: typeof onConflict === 'string' ? onConflict : undefined,
      ignoreDuplicates: false
    });
  } else {
    query = query.insert(payload);
  }

  const { data, error } = await query.select('*');
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(201).json({ data });
});

app.patch('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const payload = req.body;
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.json({ data });
});

app.delete('/api/:table/:id', requireAuth, requireTable, async (req, res) => {
  const { table, id } = req.params;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(204).send();
});


app.post('/uploads', requireAuth, async (req, res) => {
  const {
    fileName,
    mimeType,
    base64Data,
    owner_firebase_uid,
    owner_persona_id,
    asset_type = 'generic',
    resource_id,
    is_public = false
  } = req.body || {};

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'base64Data and mimeType are required' });
  }

  const extension = MIME_EXTENSION_MAP[mimeType];
  if (!extension) {
    return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
  }

  let binary;
  try {
    binary = Buffer.from(base64Data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 payload' });
  }

  const sizeBytes = binary.length;
  const maxBytes = 15 * 1024 * 1024;
  if (sizeBytes <= 0 || sizeBytes > maxBytes) {
    return res.status(400).json({ error: 'File size must be between 1 byte and 15MB' });
  }

  const firebaseUid = owner_firebase_uid || req.user?.uid;
  const userId = await resolveUserIdFromFirebaseUid(firebaseUid);
  if (!userId) {
    return res.status(400).json({ error: 'Unable to resolve owner user id from firebase uid' });
  }

  const safeType = sanitizeBaseName(asset_type || 'generic');
  const safeBase = sanitizeBaseName(fileName || 'asset');
  const id = randomUUID();
  const relativeDir = `${safeType}/${userId}`;
  const fullDir = ensureDirectory(path.join(uploadsRoot, relativeDir));
  const relativePath = `${relativeDir}/${safeBase}-${id}.${extension}`;
  const fullPath = path.join(uploadsRoot, relativePath);

  try {
    fs.writeFileSync(fullPath, binary);
  } catch (error) {
    return res.status(500).json({ error: `Failed to write upload: ${error.message}` });
  }

  const payload = {
    id,
    owner_user_id: userId,
    owner_persona_id: owner_persona_id || null,
    asset_type: safeType,
    file_name: fileName || `${safeBase}.${extension}`,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    storage_driver: 'local_disk',
    storage_path: normalizeRelativePath(fullPath),
    resource_id: resource_id || null,
    is_public: Boolean(is_public),
    status: 'active'
  };

  const { data, error } = await supabase.from('uploaded_assets').insert(payload).select('*').maybeSingle();
  if (error) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // ignore cleanup error
    }
    return res.status(400).json({ error: error.message });
  }

  const publicPath = `/uploads/${payload.storage_path}`;
  return res.status(201).json({ data: { ...data, public_url: publicPath } });
});

app.get('/uploads', requireAuth, async (req, res) => {
  const { owner_firebase_uid, asset_type, resource_id, limit = '100' } = req.query;
  const ownerFirebaseUid = owner_firebase_uid || req.user?.uid;
  const ownerUserId = await resolveUserIdFromFirebaseUid(ownerFirebaseUid);
  if (!ownerUserId) {
    return res.status(400).json({ error: 'Unable to resolve owner user id' });
  }

  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 1000);

  let query = supabase
    .from('uploaded_assets')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limitNum);

  if (asset_type) query = query.eq('asset_type', asset_type);
  if (resource_id) query = query.eq('resource_id', resource_id);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  return res.json({
    data: (data || []).map((row) => ({
      ...row,
      public_url: `/uploads/${row.storage_path}`
    }))
  });
});

app.get('/uploads/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('uploaded_assets').select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  return res.json({ data: { ...data, public_url: `/uploads/${data.storage_path}` } });
});

app.delete('/uploads/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('uploaded_assets').select('*').eq('id', id).maybeSingle();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  const fullPath = path.join(uploadsRoot, data.storage_path || '');
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // ignore unlink errors; metadata still removed
    }
  }

  const { error: deleteError } = await supabase.from('uploaded_assets').delete().eq('id', id);
  if (deleteError) {
    return res.status(400).json({ error: deleteError.message });
  }

  return res.status(204).send();
});

const startServer = (port, retriesRemaining) => {
  const server = app.listen(port, () => {
    console.log(`Urban Prime backend listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesRemaining > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      setTimeout(() => startServer(nextPort, retriesRemaining - 1), 120);
      return;
    }

    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
};

startServer(START_PORT, PORT_RETRY_LIMIT);





