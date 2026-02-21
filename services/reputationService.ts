import { addDoc, collection, doc, getDoc, query, setDoc, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type { ReputationPassport } from '../types';

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

const mapPassport = (row: any): ReputationPassport => ({
  id: String(row?.id || ''),
  userId: String(row?.user_id || row?.userId || ''),
  personaId: row?.persona_id || row?.personaId || undefined,
  score: toNumber(row?.score, 0),
  jobsCompleted: toNumber(row?.jobs_completed ?? row?.jobsCompleted, 0),
  completionRate: toNumber(row?.completion_rate ?? row?.completionRate, 0),
  disputeRate: toNumber(row?.dispute_rate ?? row?.disputeRate, 0),
  onTimeRate: toNumber(row?.on_time_rate ?? row?.onTimeRate, 0),
  responseSlaMinutes: toNumber(row?.response_sla_minutes ?? row?.responseSlaMinutes, 0),
  repeatClientRate: toNumber(row?.repeat_client_rate ?? row?.repeatClientRate, 0),
  badges: Array.isArray(row?.badges) ? row.badges : [],
  snapshot: row?.snapshot || {},
  updatedAt: row?.updated_at || row?.updatedAt || new Date().toISOString(),
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const defaultPassport = (userId: string, personaId?: string): ReputationPassport => ({
  id: '',
  userId,
  personaId,
  score: 0,
  jobsCompleted: 0,
  completionRate: 0,
  disputeRate: 0,
  onTimeRate: 0,
  responseSlaMinutes: 0,
  repeatClientRate: 0,
  badges: [],
  snapshot: {},
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
});

const reputationService = {
  async getPassport(userId: string, personaId?: string): Promise<ReputationPassport> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const queryParams = new URLSearchParams();
      queryParams.set('eq.user_id', userId);
      if (personaId) queryParams.set('eq.persona_id', personaId);
      queryParams.set('limit', '1');

      const res = await backendFetch(`/api/work_reputation?${queryParams.toString()}`, {}, token);
      const row = Array.isArray(res?.data) ? res.data[0] : undefined;
      if (!row) return defaultPassport(userId, personaId);
      return mapPassport(row);
    }

    if (!shouldUseFirestoreFallback()) {
      return defaultPassport(userId, personaId);
    }

    if (personaId) {
      const snap = await getDoc(doc(db, 'work_reputation', `${userId}_${personaId}`));
      if (snap.exists()) return mapPassport({ id: snap.id, ...(snap.data() || {}) });
    }

    const q = query(collection(db, 'work_reputation'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const row = snapshot.docs[0];
    return row ? mapPassport({ id: row.id, ...(row.data() || {}) }) : defaultPassport(userId, personaId);
  },

  async upsertPassport(passport: Partial<ReputationPassport> & { userId: string }): Promise<ReputationPassport> {
    const now = new Date().toISOString();

    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const payload = {
        user_id: passport.userId,
        persona_id: passport.personaId || null,
        score: passport.score ?? 0,
        jobs_completed: passport.jobsCompleted ?? 0,
        completion_rate: passport.completionRate ?? 0,
        dispute_rate: passport.disputeRate ?? 0,
        on_time_rate: passport.onTimeRate ?? 0,
        response_sla_minutes: passport.responseSlaMinutes ?? 0,
        repeat_client_rate: passport.repeatClientRate ?? 0,
        badges: passport.badges || [],
        snapshot: passport.snapshot || {},
        updated_at: now
      };
      const res = await backendFetch('/api/work_reputation?upsert=1&onConflict=user_id,persona_id', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);
      const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
      return mapPassport(row);
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to upsert reputation passport: no backend or firestore fallback available.');
    }

    const id = passport.personaId ? `${passport.userId}_${passport.personaId}` : passport.userId;
    await setDoc(doc(db, 'work_reputation', id), {
      ...passport,
      updatedAt: now,
      createdAt: passport.createdAt || now
    }, { merge: true });

    const snap = await getDoc(doc(db, 'work_reputation', id));
    return mapPassport({ id, ...(snap.data() || {}) });
  },

  async logMetricEvent(userId: string, event: Record<string, any>) {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      await backendFetch('/api/work_autopilot_runs', {
        method: 'POST',
        body: JSON.stringify({
          run_type: 'health',
          actor_user_id: userId,
          status: 'succeeded',
          input_payload: event,
          output_payload: event
        })
      }, token);
      return;
    }

    if (shouldUseFirestoreFallback()) {
      await addDoc(collection(db, 'work_reputation_events'), {
        userId,
        event,
        createdAt: new Date().toISOString()
      });
    }
  }
};

export default reputationService;
