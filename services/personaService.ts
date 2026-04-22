import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  orderBy,
  limit as fsLimit
} from 'firebase/firestore';
import { db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type {
  AccountPersona,
  Capability,
  CapabilityState,
  PersonaCapabilities,
  PersonaType,
  User
} from '../types';

const supabasePersonaUserIdCache = new Map<string, string>();

const PERSONAS_STORAGE_KEY = 'urbanprime_personas_v1';
const ACTIVE_PERSONA_STORAGE_PREFIX = 'urbanprime_active_persona_v1_';

const ALL_CAPABILITIES: Capability[] = ['buy', 'rent', 'sell', 'provide_service', 'affiliate', 'ship', 'admin'];

type PersonaCreatePayload = Partial<Pick<AccountPersona, 'displayName' | 'avatar' | 'handle' | 'bio' | 'settings' | 'verification'>>;

const baseCapabilities = (): PersonaCapabilities => ({
  buy: 'inactive',
  rent: 'inactive',
  sell: 'inactive',
  provide_service: 'inactive',
  affiliate: 'inactive',
  ship: 'inactive',
  admin: 'inactive'
});

const capabilitiesForPersonaType = (type: PersonaType, user?: Partial<User>): PersonaCapabilities => {
  const caps = baseCapabilities();
  if (type === 'consumer') {
    caps.buy = 'active';
    caps.rent = 'active';
  }
  if (type === 'seller') {
    caps.sell = 'active';
  }
  if (type === 'provider') {
    caps.provide_service = 'active';
  }
  if (type === 'affiliate') {
    caps.affiliate = 'active';
  }
  if (type === 'shipper') {
    caps.ship = 'active';
  }

  if (user?.isAdmin) caps.admin = 'active';
  if (user?.isServiceProvider && type === 'provider') caps.provide_service = 'active';
  if (user?.isAffiliate && type === 'affiliate') caps.affiliate = 'active';

  return caps;
};

const normalizeCapabilities = (raw: any, fallbackType: PersonaType, user?: Partial<User>): PersonaCapabilities => {
  const fallback = capabilitiesForPersonaType(fallbackType, user);
  if (!raw || typeof raw !== 'object') return fallback;

  const normalized: PersonaCapabilities = { ...fallback };
  ALL_CAPABILITIES.forEach((cap) => {
    const value = raw[cap] as CapabilityState | undefined;
    if (value) {
      normalized[cap] = value;
    }
  });
  return normalized;
};

const normalizePersonaRow = (row: any, user?: Partial<User>): AccountPersona => {
  const type = (row?.type || 'consumer') as PersonaType;
  return {
    id: row?.id || `persona-${type}-${Date.now()}`,
    userId: row?.userId || row?.firebase_uid || row?.user_id || '',
    type,
    status: (row?.status || 'active') as AccountPersona['status'],
    displayName: row?.displayName || row?.display_name || 'Persona',
    avatar: row?.avatar || row?.avatar_url,
    handle: row?.handle,
    bio: row?.bio,
    settings: row?.settings || {},
    verification: row?.verification || {},
    capabilities: normalizeCapabilities(row?.capabilities, type, user),
    createdAt: row?.createdAt || row?.created_at || new Date().toISOString(),
    updatedAt: row?.updatedAt || row?.updated_at || new Date().toISOString()
  };
};

const readLocalMap = (): Record<string, AccountPersona[]> => {
  try {
    const raw = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLocalMap = (map: Record<string, AccountPersona[]>) => {
  try {
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // no-op
  }
};

const upsertLocalPersona = (persona: AccountPersona) => {
  const map = readLocalMap();
  const list = map[persona.userId] || [];
  const existingIndex = list.findIndex((p) => p.id === persona.id);
  if (existingIndex >= 0) {
    list[existingIndex] = persona;
  } else {
    list.push(persona);
  }
  map[persona.userId] = list;
  writeLocalMap(map);
};

const saveManyLocal = (userId: string, personas: AccountPersona[]) => {
  const map = readLocalMap();
  map[userId] = personas;
  writeLocalMap(map);
};

const createPersonaId = (type: PersonaType) => `persona-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveSupabaseUserIdForPersona = async (firebaseUid: string): Promise<string | null> => {
  if (!firebaseUid || !isBackendConfigured()) return null;
  const cached = supabasePersonaUserIdCache.get(firebaseUid);
  if (cached) return cached;

  try {
    const res = await backendFetch(`/api/users?eq.firebase_uid=${encodeURIComponent(firebaseUid)}&select=id&limit=1`);
    const rows = Array.isArray(res?.data) ? res.data : [];
    const supabaseUserId = rows[0]?.id ? String(rows[0].id) : null;
    if (supabaseUserId) {
      supabasePersonaUserIdCache.set(firebaseUid, supabaseUserId);
    }
    return supabaseUserId;
  } catch {
    return null;
  }
};

const toBackendPayload = (persona: AccountPersona, supabaseUserId: string) => ({
  id: persona.id,
  user_id: supabaseUserId,
  firebase_uid: persona.userId,
  type: persona.type,
  status: persona.status,
  display_name: persona.displayName,
  avatar_url: persona.avatar,
  handle: persona.handle,
  bio: persona.bio,
  settings: persona.settings || {},
  verification: persona.verification || {},
  capabilities: persona.capabilities,
  created_at: persona.createdAt,
  updated_at: persona.updatedAt
});

const fromUserLegacyDefaultPersonaType = (user: Partial<User>): PersonaType => {
  if (user?.isServiceProvider) return 'provider';
  if (user?.isAffiliate) return 'affiliate';
  if (user?.purpose === 'list') return 'seller';
  return 'consumer';
};

const storageKeyForActivePersona = (userId: string) => `${ACTIVE_PERSONA_STORAGE_PREFIX}${userId}`;

const setActivePersonaStorage = (userId: string, personaId: string) => {
  try {
    localStorage.setItem(storageKeyForActivePersona(userId), personaId);
  } catch {
    // no-op
  }
};

const getActivePersonaStorage = (userId: string): string | null => {
  try {
    return localStorage.getItem(storageKeyForActivePersona(userId));
  } catch {
    return null;
  }
};

export const personaService = {
  hasCapability: (persona: AccountPersona | null | undefined, capability: Capability): boolean => {
    if (!persona) return false;
    return persona.capabilities?.[capability] === 'active';
  },

  getCapabilitiesForPersonaType: capabilitiesForPersonaType,

  setActivePersona: async (userId: string, personaId: string): Promise<void> => {
    setActivePersonaStorage(userId, personaId);
  },

  getActivePersona: (userId: string, personas: AccountPersona[]): AccountPersona | null => {
    if (!personas.length) return null;
    const storedId = getActivePersonaStorage(userId);
    const storedMatch = storedId ? personas.find((p) => p.id === storedId) : null;
    if (storedMatch) return storedMatch;

    const preferred = personas.find((p) => p.status === 'active') || personas[0];
    if (preferred) setActivePersonaStorage(userId, preferred.id);
    return preferred || null;
  },

  getPersonasForUser: async (user: Partial<User> & { id: string }): Promise<AccountPersona[]> => {
    if (!user?.id) return [];

    if (isBackendConfigured()) {
      try {
        const res = await backendFetch(`/api/personas?eq.firebase_uid=${encodeURIComponent(user.id)}&order=created_at.desc&limit=100`);
        const data = Array.isArray(res?.data) ? res.data : [];
        if (data.length > 0) {
          const personas = data.map((row: any) => normalizePersonaRow(row, user));
          saveManyLocal(user.id, personas);
          return personas;
        }
      } catch {
        // fallback chain
      }
    }

    if (shouldUseFirestoreFallback()) {
      try {
        const q = query(collection(db, 'personas'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), fsLimit(100));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const personas = snap.docs.map((docSnap) => normalizePersonaRow({ id: docSnap.id, ...docSnap.data() }, user));
          saveManyLocal(user.id, personas);
          return personas;
        }
      } catch {
        // fallback chain
      }
    }

    const localMap = readLocalMap();
    const local = (localMap[user.id] || []).map((row) => normalizePersonaRow(row, user));
    if (local.length > 0) return local;

    return [];
  },

  createPersona: async (
    user: Partial<User> & { id: string; name?: string; avatar?: string },
    type: PersonaType,
    payload: PersonaCreatePayload = {}
  ): Promise<AccountPersona> => {
    const now = new Date().toISOString();
    const persona: AccountPersona = {
      id: createPersonaId(type),
      userId: user.id,
      type,
      status: 'active',
      displayName: payload.displayName || `${user.name || 'User'} ${type}`,
      avatar: payload.avatar || user.avatar,
      handle: payload.handle,
      bio: payload.bio,
      settings: payload.settings || {},
      verification: payload.verification || {},
      capabilities: capabilitiesForPersonaType(type, user),
      createdAt: now,
      updatedAt: now
    };

    if (isBackendConfigured()) {
      try {
        const supabaseUserId = await resolveSupabaseUserIdForPersona(user.id);
        if (supabaseUserId) {
          await backendFetch('/api/personas?upsert=1&onConflict=id', {
            method: 'POST',
            body: JSON.stringify(toBackendPayload(persona, supabaseUserId))
          });
        }
      } catch {
        // fallback chain
      }
    }

    if (shouldUseFirestoreFallback()) {
      try {
        await setDoc(doc(db, 'personas', persona.id), persona, { merge: true });
      } catch {
        // local fallback handles offline
      }
    }

    upsertLocalPersona(persona);
    return persona;
  },

  ensureDefaultConsumerPersona: async (user: Partial<User> & { id: string; name?: string; avatar?: string }): Promise<AccountPersona[]> => {
    let personas = await personaService.getPersonasForUser(user);
    if (personas.length > 0) return personas;

    const defaultType = fromUserLegacyDefaultPersonaType(user);
    const created = await personaService.createPersona(user, defaultType, {
      displayName: user.name || 'Consumer Persona',
      avatar: user.avatar
    });

    // Always create a consumer persona as baseline when legacy suggests another role first.
    if (created.type !== 'consumer') {
      const consumer = await personaService.createPersona(user, 'consumer', {
        displayName: user.name || 'Consumer Persona',
        avatar: user.avatar
      });
      personas = [created, consumer];
    } else {
      personas = [created];
    }

    saveManyLocal(user.id, personas);
    return personas;
  },

  getUserIdsByPersonaType: async (type: PersonaType): Promise<string[]> => {
    const userIds = new Set<string>();

    if (isBackendConfigured()) {
      try {
        const res = await backendFetch(`/api/personas?eq.type=${encodeURIComponent(type)}&eq.status=active&select=firebase_uid&limit=1000`);
        const rows = Array.isArray(res?.data) ? res.data : [];
        rows.forEach((row: any) => {
          if (row?.firebase_uid) userIds.add(String(row.firebase_uid));
        });
      } catch {
        // fallback chain
      }
    }

    if (shouldUseFirestoreFallback()) {
      try {
        const q = query(collection(db, 'personas'), where('type', '==', type), fsLimit(1000));
        const snap = await getDocs(q);
        snap.docs.forEach((docSnap) => {
          const data: any = docSnap.data();
          if ((data?.status || 'active') === 'active' && data?.userId) {
            userIds.add(String(data.userId));
          }
        });
      } catch {
        // fallback chain
      }
    }

    const localMap = readLocalMap();
    Object.values(localMap).flat().forEach((persona) => {
      if (persona.type === type && (persona.status || 'active') === 'active' && persona.userId) {
        userIds.add(persona.userId);
      }
    });

    return Array.from(userIds);
  }
};

export default personaService;
