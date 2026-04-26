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
import type { Contract, Milestone, User } from '../types';

interface ListContractsParams {
  providerId?: string;
  clientId?: string;
  status?: Contract['status'];
  limit?: number;
  offset?: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const isUuidLike = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

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

const mapMilestoneRow = (row: any): Milestone => ({
  id: String(row?.id || ''),
  contractId: String(row?.contract_id || row?.contractId || ''),
  title: String(row?.title || 'Milestone'),
  description: row?.description || undefined,
  amount: toNumber(row?.amount, 0),
  currency: String(row?.currency || 'USD'),
  dueAt: row?.due_at || row?.dueAt || undefined,
  sortOrder: toNumber(row?.sort_order ?? row?.sortOrder, 0),
  deliverables: Array.isArray(row?.deliverables) ? row.deliverables : [],
  status: (row?.status || 'pending') as Milestone['status'],
  submittedAt: row?.submitted_at || row?.submittedAt || undefined,
  approvedAt: row?.approved_at || row?.approvedAt || undefined,
  releasedAt: row?.released_at || row?.releasedAt || undefined,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt || undefined
});

const mapContractRow = (row: any, milestones: Milestone[] = []): Contract => ({
  id: String(row?.id || ''),
  engagementId: row?.engagement_id || row?.engagementId || undefined,
  proposalId: row?.proposal_id || row?.proposalId || undefined,
  requestId: row?.request_id || row?.requestId || undefined,
  listingId: row?.listing_id || row?.listingId || undefined,
  clientId: String(row?.client_snapshot?.id || row?.client_firebase_uid || row?.client_id || row?.clientId || ''),
  clientPersonaId: row?.client_persona_id || row?.clientPersonaId || undefined,
  providerId: String(row?.provider_snapshot?.id || row?.provider_firebase_uid || row?.provider_id || row?.providerId || ''),
  providerPersonaId: row?.provider_persona_id || row?.providerPersonaId || undefined,
  scope: String(row?.scope || ''),
  mode: (row?.mode || 'hybrid') as Contract['mode'],
  fulfillmentKind: (row?.fulfillment_kind || row?.fulfillmentKind || 'hybrid') as Contract['fulfillmentKind'],
  currency: String(row?.currency || 'USD'),
  timezone: row?.timezone || undefined,
  totalAmount: toNumber(row?.total_amount ?? row?.totalAmount, 0),
  escrowHeld: row?.escrow_held !== undefined ? toNumber(row.escrow_held) : row?.escrowHeld !== undefined ? toNumber(row.escrowHeld) : undefined,
  riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
  status: (row?.status || 'draft') as Contract['status'],
  terms: row?.terms || {},
  startAt: row?.start_at || row?.startAt || undefined,
  dueAt: row?.due_at || row?.dueAt || undefined,
  completedAt: row?.completed_at || row?.completedAt || undefined,
  milestones,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt || undefined
});

const canUseDirectSupabase = () => !isBackendConfigured() && canUseDirectSupabaseTables();

const toSupabaseError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const attachContractFirebaseIds = async (rows: any[]) =>
  attachFirebaseIdsToRows(rows, [
    { sourceField: 'client_id', targetField: 'client_firebase_uid' },
    { sourceField: 'provider_id', targetField: 'provider_firebase_uid' }
  ]);

const contractService = {
  async createContract(input: Partial<Contract>, user: User): Promise<Contract> {
    const payload = {
      proposalId: input.proposalId || undefined,
      requestId: input.requestId || undefined,
      listingId: input.listingId || undefined,
      clientId: input.clientId,
      clientPersonaId: input.clientPersonaId || undefined,
      providerId: input.providerId || user.id,
      providerPersonaId: input.providerPersonaId || undefined,
      scope: input.scope || '',
      mode: input.mode || 'hybrid',
      fulfillmentKind: input.fulfillmentKind || 'hybrid',
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      totalAmount: input.totalAmount ?? 0,
      riskScore: input.riskScore ?? 0,
      status: input.status || 'pending',
      terms: input.terms || {},
      startAt: input.startAt || null,
      dueAt: input.dueAt || null
    };

    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/contracts', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);
      const contract = mapContractRow(res?.data, Array.isArray(res?.data?.milestones) ? res.data.milestones.map(mapMilestoneRow) : []);
      await supabaseMirror.upsert('work_contracts', contract.id, contract);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_contracts', contract.id), contract, { merge: true });
      }
      return contract;
    }

    if (canUseDirectSupabase()) {
      const currentUserRow = await ensureSupabaseUserRecord(user);
      let clientId = input.clientId === user.id ? currentUserRow.id : await resolveSupabaseUserId(input.clientId);
      let providerId = (input.providerId || user.id) === user.id ? currentUserRow.id : await resolveSupabaseUserId(input.providerId || user.id);
      if (!clientId && input.clientId) {
        clientId = (await ensureSupabaseUserRecord({
          id: input.clientId,
          name: input.clientId === user.id ? user.name : 'Client',
          email: input.clientId === user.id ? user.email : '',
          avatar: input.clientId === user.id ? user.avatar : ''
        })).id;
      }
      if (!providerId && (input.providerId || user.id)) {
        providerId = (await ensureSupabaseUserRecord({
          id: input.providerId || user.id,
          name: (input.providerId || user.id) === user.id ? user.name : 'Provider',
          email: (input.providerId || user.id) === user.id ? user.email : '',
          avatar: (input.providerId || user.id) === user.id ? user.avatar : ''
        })).id;
      }
      const res = await supabase
        .from('work_contracts')
        .insert({
          proposal_id: payload.proposalId || null,
          request_id: payload.requestId || null,
          listing_id: payload.listingId || null,
          engagement_id: input.engagementId || null,
          client_id: clientId || null,
          client_persona_id: payload.clientPersonaId || null,
          client_snapshot: {
            id: input.clientId || user.id,
            name: input.clientId === user.id ? user.name : 'Client',
            avatar: input.clientId === user.id ? user.avatar : undefined
          },
          provider_id: providerId || null,
          provider_persona_id: payload.providerPersonaId || null,
          provider_snapshot: {
            id: input.providerId || user.id,
            name: input.providerId === user.id ? user.name : 'Provider',
            avatar: input.providerId === user.id ? user.avatar : undefined
          },
          scope: payload.scope,
          mode: payload.mode,
          fulfillment_kind: payload.fulfillmentKind,
          currency: payload.currency,
          timezone: payload.timezone,
          total_amount: payload.totalAmount,
          risk_score: payload.riskScore,
          status: payload.status,
          terms: payload.terms,
          start_at: payload.startAt,
          due_at: payload.dueAt
        })
        .select('*')
        .single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachContractFirebaseIds([res.data]);
      const contract = mapContractRow(normalizedRow);
      await supabaseMirror.upsert('work_contracts', contract.id, contract);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_contracts', contract.id), contract, { merge: true });
      }
      return contract;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to create contract: no backend or firestore fallback available.');
    }

    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'work_contracts'), {
      ...payload,
      createdAt: now,
      updatedAt: now
    });
    return mapContractRow({
      id: docRef.id,
      ...payload,
      createdAt: now,
      updatedAt: now
    });
  },

  async updateContract(contractId: string, updates: Partial<Contract>): Promise<Contract> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/contracts/${contractId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }, token);
      const contract = mapContractRow(res?.data, Array.isArray(res?.data?.milestones) ? res.data.milestones.map(mapMilestoneRow) : []);
      await supabaseMirror.mergeUpdate<Contract>('work_contracts', contract.id, contract);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_contracts', contract.id), contract, { merge: true });
      }
      return contract;
    }

    if (canUseDirectSupabase()) {
      const rowUpdates: Record<string, any> = {};
      if (updates.engagementId !== undefined) rowUpdates.engagement_id = updates.engagementId;
      if (updates.proposalId !== undefined) rowUpdates.proposal_id = updates.proposalId;
      if (updates.requestId !== undefined) rowUpdates.request_id = updates.requestId;
      if (updates.listingId !== undefined) rowUpdates.listing_id = updates.listingId;
      if (updates.clientPersonaId !== undefined) rowUpdates.client_persona_id = updates.clientPersonaId;
      if (updates.providerPersonaId !== undefined) rowUpdates.provider_persona_id = updates.providerPersonaId;
      if (updates.scope !== undefined) rowUpdates.scope = updates.scope;
      if (updates.mode !== undefined) rowUpdates.mode = updates.mode;
      if (updates.fulfillmentKind !== undefined) rowUpdates.fulfillment_kind = updates.fulfillmentKind;
      if (updates.currency !== undefined) rowUpdates.currency = updates.currency;
      if (updates.timezone !== undefined) rowUpdates.timezone = updates.timezone;
      if (updates.totalAmount !== undefined) rowUpdates.total_amount = updates.totalAmount;
      if (updates.escrowHeld !== undefined) rowUpdates.escrow_held = updates.escrowHeld;
      if (updates.riskScore !== undefined) rowUpdates.risk_score = updates.riskScore;
      if (updates.status !== undefined) rowUpdates.status = updates.status;
      if (updates.terms !== undefined) rowUpdates.terms = updates.terms;
      if (updates.startAt !== undefined) rowUpdates.start_at = updates.startAt;
      if (updates.dueAt !== undefined) rowUpdates.due_at = updates.dueAt;
      if (updates.completedAt !== undefined) rowUpdates.completed_at = updates.completedAt;

      const res = await supabase.from('work_contracts').update(rowUpdates).eq('id', contractId).select('*').single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachContractFirebaseIds([res.data]);
      const contract = mapContractRow(normalizedRow);
      await supabaseMirror.mergeUpdate<Contract>('work_contracts', contract.id, contract);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_contracts', contract.id), contract, { merge: true });
      }
      return contract;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to update contract: no backend or firestore fallback available.');
    }

    await setDoc(doc(db, 'work_contracts', contractId), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    const snap = await getDoc(doc(db, 'work_contracts', contractId));
    return mapContractRow({ id: contractId, ...(snap.data() || {}) });
  },

  async addMilestones(contractId: string, milestones: Array<Partial<Milestone>>): Promise<Milestone[]> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/contracts/${contractId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ milestones })
      }, token);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const normalized = rows.map(mapMilestoneRow);
      await Promise.all(normalized.map((entry) => supabaseMirror.upsert('work_milestones', entry.id, entry)));
      if (shouldUseFirestoreFallback()) {
        await Promise.all(normalized.map((entry) => setDoc(doc(db, 'work_milestones', entry.id), entry, { merge: true })));
      }
      return normalized;
    }

    if (canUseDirectSupabase()) {
      const now = new Date().toISOString();
      const rows = milestones.map((milestone, index) => ({
        contract_id: contractId,
        title: milestone.title || `Milestone ${index + 1}`,
        description: milestone.description || '',
        amount: milestone.amount ?? 0,
        currency: milestone.currency || 'USD',
        due_at: milestone.dueAt || null,
        sort_order: milestone.sortOrder ?? index,
        status: milestone.status || 'pending',
        deliverables: milestone.deliverables || [],
        created_at: now,
        updated_at: now
      }));
      const res = await supabase.from('work_milestones').insert(rows).select('*');
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const normalized = (res.data || []).map(mapMilestoneRow);
      await Promise.all(normalized.map((entry) => supabaseMirror.upsert('work_milestones', entry.id, entry)));
      if (shouldUseFirestoreFallback()) {
        await Promise.all(normalized.map((entry) => setDoc(doc(db, 'work_milestones', entry.id), entry, { merge: true })));
      }
      return normalized;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to add milestones: no backend or firestore fallback available.');
    }

    const now = new Date().toISOString();
    const created = await Promise.all(
      milestones.map(async (milestone, index) => {
        const row = {
          contractId,
          title: milestone.title || `Milestone ${index + 1}`,
          description: milestone.description || '',
          amount: milestone.amount ?? 0,
          currency: milestone.currency || 'USD',
          dueAt: milestone.dueAt || null,
          sortOrder: milestone.sortOrder ?? index,
          status: milestone.status || 'pending',
          deliverables: milestone.deliverables || [],
          createdAt: now,
          updatedAt: now
        };
        const docRef = await addDoc(collection(db, 'work_milestones'), row);
        return mapMilestoneRow({ id: docRef.id, ...row });
      })
    );
    return created;
  },

  async getContracts(params: ListContractsParams = {}): Promise<Contract[]> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const providerId = await resolveBackendUserId(params.providerId);
      const clientId = await resolveBackendUserId(params.clientId);
      const queryParams = new URLSearchParams();
      if (providerId) queryParams.set('eq.provider_id', providerId);
      if (clientId) queryParams.set('eq.client_id', clientId);
      if (params.status) queryParams.set('eq.status', params.status);
      queryParams.set('order', 'updated_at.desc');
      queryParams.set('limit', String(Math.min(params.limit || 100, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));
      const res = await backendFetch(`/api/work_contracts?${queryParams.toString()}`, {}, token);
      const rows = Array.isArray(res?.data) ? res.data : [];
      return rows.map((row: any) => mapContractRow(row));
    }

    if (canUseDirectSupabase()) {
      const providerId = await resolveSupabaseUserId(params.providerId);
      const clientId = await resolveSupabaseUserId(params.clientId);
      let queryBuilder = supabase.from('work_contracts').select('*').order('updated_at', { ascending: false });
      if (providerId) queryBuilder = queryBuilder.eq('provider_id', providerId);
      if (clientId) queryBuilder = queryBuilder.eq('client_id', clientId);
      if (params.status) queryBuilder = queryBuilder.eq('status', params.status);
      const limit = Math.min(params.limit || 100, 200);
      const offset = Math.max(params.offset || 0, 0);
      const res = await queryBuilder.range(offset, offset + limit - 1);
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const normalizedRows = await attachContractFirebaseIds(res.data || []);
      return normalizedRows.map((row: any) => mapContractRow(row));
    }

    if (!shouldUseFirestoreFallback()) return [];

    let contractsQuery = query(collection(db, 'work_contracts'), orderBy('updatedAt', 'desc'));
    if (params.providerId) {
      contractsQuery = query(collection(db, 'work_contracts'), where('providerId', '==', params.providerId), orderBy('updatedAt', 'desc'));
    } else if (params.clientId) {
      contractsQuery = query(collection(db, 'work_contracts'), where('clientId', '==', params.clientId), orderBy('updatedAt', 'desc'));
    } else if (params.status) {
      contractsQuery = query(collection(db, 'work_contracts'), where('status', '==', params.status), orderBy('updatedAt', 'desc'));
    }

    const snapshot = await getDocs(contractsQuery);
    return snapshot.docs.map((snap) => mapContractRow({ id: snap.id, ...(snap.data() || {}) }));
  },

  async getContractById(contractId: string): Promise<Contract | undefined> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const [contractRes, milestoneRes] = await Promise.all([
        backendFetch(`/api/work_contracts/${contractId}`, {}, token),
        backendFetch(`/api/work_milestones?eq.contract_id=${contractId}&order=sort_order.asc&limit=200`, {}, token).catch(() => ({ data: [] }))
      ]);
      if (!contractRes?.data) return undefined;
      const milestones = (Array.isArray(milestoneRes?.data) ? milestoneRes.data : []).map(mapMilestoneRow);
      return mapContractRow(contractRes.data, milestones);
    }

    if (canUseDirectSupabase()) {
      const [contractRes, milestoneRes] = await Promise.all([
        supabase.from('work_contracts').select('*').eq('id', contractId).maybeSingle(),
        supabase.from('work_milestones').select('*').eq('contract_id', contractId).order('sort_order', { ascending: true })
      ]);
      if (contractRes.error) throw toSupabaseError(getDirectSupabaseSetupMessage(), contractRes.error);
      if (milestoneRes.error) throw toSupabaseError(getDirectSupabaseSetupMessage(), milestoneRes.error);
      if (!contractRes.data) return undefined;
      const [normalizedRow] = await attachContractFirebaseIds([contractRes.data]);
      const milestones = (milestoneRes.data || []).map(mapMilestoneRow);
      return mapContractRow(normalizedRow, milestones);
    }

    if (!shouldUseFirestoreFallback()) return undefined;

    const contractSnap = await getDoc(doc(db, 'work_contracts', contractId));
    if (!contractSnap.exists()) return undefined;
    const milestoneSnap = await getDocs(query(collection(db, 'work_milestones'), where('contractId', '==', contractId), orderBy('sortOrder', 'asc')));
    const milestones = milestoneSnap.docs.map((snap) => mapMilestoneRow({ id: snap.id, ...(snap.data() || {}) }));
    return mapContractRow({ id: contractSnap.id, ...(contractSnap.data() || {}) }, milestones);
  },

  async completeContract(contractId: string, options: { releaseEscrow?: boolean; amount?: number; metadata?: Record<string, any> } = {}): Promise<Contract> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/contracts/${contractId}/complete`, {
        method: 'POST',
        body: JSON.stringify(options)
      }, token);
      const contract = mapContractRow(res?.data, Array.isArray(res?.data?.milestones) ? res.data.milestones.map(mapMilestoneRow) : []);
      await supabaseMirror.upsert('work_contracts', contract.id, contract);
      return contract;
    }

    const contract = await contractService.updateContract(contractId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    if ((options.releaseEscrow ?? true) && (contract.escrowHeld || 0) > 0) {
      await escrowService.release({
        engagementId: contract.engagementId,
        contractId: contract.id,
        amount: options.amount ?? contract.escrowHeld ?? 0,
        payerId: contract.clientId,
        payeeId: contract.providerId,
        currency: contract.currency,
        metadata: options.metadata || {}
      }).catch(() => undefined);
      return contractService.updateContract(contractId, {
        escrowHeld: Math.max(0, (contract.escrowHeld || 0) - (options.amount ?? contract.escrowHeld ?? 0))
      });
    }

    return contract;
  },

  async disputeContract(contractId: string, input: { reason: string; summary?: string; evidence?: any[] }): Promise<any> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      return backendFetch(`/work/contracts/${contractId}/dispute`, {
        method: 'POST',
        body: JSON.stringify(input)
      }, token);
    }

    const contract = await contractService.getContractById(contractId);
    await contractService.updateContract(contractId, {
      status: 'disputed'
    });

    if (canUseDirectSupabase() && contract) {
      let engagementId = contract.engagementId;
      if (!engagementId) {
        const clientId = await resolveSupabaseUserId(contract.clientId);
        const providerId = await resolveSupabaseUserId(contract.providerId);
        const engagementRes = await supabase
          .from('work_engagements')
          .insert({
            source_type: 'contract',
            source_id: contract.id,
            mode: contract.mode,
            fulfillment_kind: contract.fulfillmentKind,
            buyer_id: clientId || null,
            provider_id: providerId || null,
            currency: contract.currency,
            timezone: contract.timezone || 'UTC',
            gross_amount: contract.totalAmount,
            escrow_status: (contract.escrowHeld || 0) > 0 ? 'held' : 'none',
            risk_score: contract.riskScore ?? 0,
            status: 'disputed',
            metadata: {}
          })
          .select('id')
          .single();
        if (engagementRes.error) {
          throw toSupabaseError(getDirectSupabaseSetupMessage(), engagementRes.error);
        }
        engagementId = engagementRes.data?.id;
        if (engagementId) {
          await contractService.updateContract(contract.id, { engagementId });
        }
      }

      if (engagementId) {
        const disputeRes = await supabase
          .from('work_disputes')
          .insert({
            engagement_id: engagementId,
            contract_id: contract.id,
            opened_by: await resolveSupabaseUserId(auth.currentUser?.uid || contract.clientId),
            against_user_id: await resolveSupabaseUserId(contract.providerId),
            reason: input.reason,
            summary: input.summary || null,
            evidence: input.evidence || [],
            status: 'open',
            resolution: {}
          })
          .select('*')
          .single();
        if (disputeRes.error) {
          throw toSupabaseError(getDirectSupabaseSetupMessage(), disputeRes.error);
        }
        return { data: disputeRes.data };
      }
    }

    return { data: { reason: input.reason } };
  }
};

export default contractService;
