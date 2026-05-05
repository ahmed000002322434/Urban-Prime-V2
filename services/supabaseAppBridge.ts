import { auth } from '../firebase';
import type { User } from '../types';
import { prefersSupabase } from './dataMode';
import supabase from '../utils/supabase';
import { deriveDisplayNameFromEmail, resolveDisplayName } from '../utils/profileIdentity';

export type SupabaseAppUserRow = {
  id: string;
  firebase_uid: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const firebaseToUuidCache = new Map<string, string>();
const uuidToFirebaseCache = new Map<string, string>();

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  return Boolean(url && key);
};

export const canUseDirectSupabaseTables = () => prefersSupabase() && isSupabaseConfigured();

export const getDirectSupabaseSetupMessage = () =>
  'Direct Supabase provider mode is not ready. Run `supabase/provider_marketplace_full_bootstrap.sql` so the users bridge, provider tables, grants, and browser-mode policies exist.';

const toError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const rememberUserRow = (row?: Partial<SupabaseAppUserRow> | null) => {
  if (!row?.id || !row?.firebase_uid) return;
  firebaseToUuidCache.set(row.firebase_uid, row.id);
  uuidToFirebaseCache.set(row.id, row.firebase_uid);
};

const sanitizeText = (value: unknown) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const buildUserPayload = (user: Partial<User> & { id: string }) => {
  const firebaseUid = String(user.id || auth.currentUser?.uid || '').trim();
  if (!firebaseUid) {
    throw new Error('A Firebase user id is required before syncing the user into Supabase.');
  }

  return {
    firebase_uid: firebaseUid,
    email: sanitizeText(user.email || auth.currentUser?.email),
    name: sanitizeText(
      resolveDisplayName(
        user.name,
        auth.currentUser?.displayName,
        deriveDisplayNameFromEmail(user.email || auth.currentUser?.email),
        'Member'
      )
    ),
    avatar_url: sanitizeText(user.avatar || auth.currentUser?.photoURL),
    phone: sanitizeText(user.phone),
    status: sanitizeText(user.status) || 'active'
  };
};

const upsertUserProfile = async (userId: string, user: Partial<User>) => {
  const payload: Record<string, any> = {
    user_id: userId,
    city: sanitizeText(user.city),
    country: sanitizeText(user.country),
    about: sanitizeText(user.about),
    business_name: sanitizeText(user.businessName),
    business_description: sanitizeText(user.businessDescription),
    is_provider: Boolean(user.isServiceProvider || user.providerProfile || user.capabilities?.provide_service === 'active' || user.capabilities?.provide_service === 'pending')
  };

  const hasAnyValue = Object.values(payload).some((value, index) => index === 0 || value !== null);
  if (!hasAnyValue) return;

  await supabase.from('user_profiles').upsert(payload, { onConflict: 'user_id' });
};

export const syncSupabaseUserProfile = async (userId: string, user: Partial<User>) => {
  if (!canUseDirectSupabaseTables()) {
    throw new Error(getDirectSupabaseSetupMessage());
  }
  await upsertUserProfile(userId, user);
};

export const isUuidLike = (value?: string | null) => uuidPattern.test(String(value || '').trim());

export const ensureSupabaseUserRecord = async (user: Partial<User> & { id: string }): Promise<SupabaseAppUserRow> => {
  if (!canUseDirectSupabaseTables()) {
    throw new Error(getDirectSupabaseSetupMessage());
  }

  const payload = buildUserPayload(user);
  const firebaseUid = payload.firebase_uid;

  if (firebaseToUuidCache.has(firebaseUid)) {
    const cachedId = firebaseToUuidCache.get(firebaseUid) || '';
    const { data, error } = await supabase
      .from('users')
      .select('id,firebase_uid,email,name,avatar_url,phone,role,status,created_at,updated_at')
      .eq('id', cachedId)
      .maybeSingle();
    if (!error && data) {
      rememberUserRow(data);
      void upsertUserProfile(data.id, user).catch(() => undefined);
      return data;
    }
  }

  const existing = await supabase
    .from('users')
    .select('id,firebase_uid,email,name,avatar_url,phone,role,status,created_at,updated_at')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (existing.error) {
    throw toError(getDirectSupabaseSetupMessage(), existing.error);
  }

  if (existing.data) {
    rememberUserRow(existing.data);

    const updates: Record<string, any> = {};
    if (payload.email && payload.email !== existing.data.email) updates.email = payload.email;
    if (payload.name && payload.name !== existing.data.name) updates.name = payload.name;
    if (payload.avatar_url && payload.avatar_url !== existing.data.avatar_url) updates.avatar_url = payload.avatar_url;
    if (payload.phone && payload.phone !== existing.data.phone) updates.phone = payload.phone;
    if (Object.keys(updates).length > 0) {
      const updated = await supabase
        .from('users')
        .update(updates)
        .eq('id', existing.data.id)
        .select('id,firebase_uid,email,name,avatar_url,phone,role,status,created_at,updated_at')
        .single();
      if (updated.error) throw toError('Unable to refresh Supabase user bridge record', updated.error);
      rememberUserRow(updated.data);
      void upsertUserProfile(updated.data.id, user).catch(() => undefined);
      return updated.data;
    }

    void upsertUserProfile(existing.data.id, user).catch(() => undefined);
    return existing.data;
  }

  const inserted = await supabase
    .from('users')
    .insert(payload)
    .select('id,firebase_uid,email,name,avatar_url,phone,role,status,created_at,updated_at')
    .single();

  if (inserted.error) {
    throw toError(getDirectSupabaseSetupMessage(), inserted.error);
  }

  rememberUserRow(inserted.data);
  void upsertUserProfile(inserted.data.id, user).catch(() => undefined);
  return inserted.data;
};

export const resolveSupabaseUserId = async (value?: string | null): Promise<string | undefined> => {
  const candidate = String(value || '').trim();
  if (!candidate) return undefined;
  if (isUuidLike(candidate)) return candidate;
  if (firebaseToUuidCache.has(candidate)) return firebaseToUuidCache.get(candidate);
  if (!canUseDirectSupabaseTables()) return undefined;

  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid')
    .eq('firebase_uid', candidate)
    .maybeSingle();

  if (error) throw toError(getDirectSupabaseSetupMessage(), error);
  rememberUserRow(data);
  return data?.id || undefined;
};

export const resolveFirebaseUserId = async (value?: string | null): Promise<string | undefined> => {
  const candidate = String(value || '').trim();
  if (!candidate) return undefined;
  if (!isUuidLike(candidate)) return candidate;
  if (uuidToFirebaseCache.has(candidate)) return uuidToFirebaseCache.get(candidate);
  if (!canUseDirectSupabaseTables()) return undefined;

  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid')
    .eq('id', candidate)
    .maybeSingle();

  if (error) throw toError(getDirectSupabaseSetupMessage(), error);
  rememberUserRow(data);
  return data?.firebase_uid || undefined;
};

export const attachFirebaseIdsToRows = async <TRow extends Record<string, any>>(
  rows: TRow[],
  mappings: Array<{ sourceField: string; targetField: string }>
): Promise<TRow[]> => {
  if (!rows.length || !mappings.length || !canUseDirectSupabaseTables()) return rows;

  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => mappings.map((mapping) => String(row?.[mapping.sourceField] || '').trim()))
        .filter((value) => isUuidLike(value))
    )
  );

  if (!ids.length) return rows;

  const missingIds = ids.filter((id) => !uuidToFirebaseCache.has(id));
  if (missingIds.length > 0) {
    const { data, error } = await supabase.from('users').select('id,firebase_uid').in('id', missingIds);
    if (error) throw toError(getDirectSupabaseSetupMessage(), error);
    (data || []).forEach(rememberUserRow);
  }

  return rows.map((row) => {
    const nextRow = { ...row };
    mappings.forEach(({ sourceField, targetField }) => {
      const sourceValue = String(row?.[sourceField] || '').trim();
      if (!sourceValue || !isUuidLike(sourceValue) || row?.[targetField]) return;
      const firebaseUid = uuidToFirebaseCache.get(sourceValue);
      if (firebaseUid) {
        nextRow[targetField] = firebaseUid;
      }
    });
    return nextRow;
  });
};
