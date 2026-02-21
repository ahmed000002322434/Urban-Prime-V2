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
import supabaseMirror from './supabaseMirror';
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
  clientId: String(row?.client_id || row?.clientId || ''),
  clientPersonaId: row?.client_persona_id || row?.clientPersonaId || undefined,
  providerId: String(row?.provider_id || row?.providerId || ''),
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
      const queryParams = new URLSearchParams();
      if (params.providerId) queryParams.set('eq.provider_id', params.providerId);
      if (params.clientId) queryParams.set('eq.client_id', params.clientId);
      if (params.status) queryParams.set('eq.status', params.status);
      queryParams.set('order', 'updated_at.desc');
      queryParams.set('limit', String(Math.min(params.limit || 100, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));
      const res = await backendFetch(`/api/work_contracts?${queryParams.toString()}`, {}, token);
      const rows = Array.isArray(res?.data) ? res.data : [];
      return rows.map((row: any) => mapContractRow(row));
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

    if (!shouldUseFirestoreFallback()) return undefined;

    const contractSnap = await getDoc(doc(db, 'work_contracts', contractId));
    if (!contractSnap.exists()) return undefined;
    const milestoneSnap = await getDocs(query(collection(db, 'work_milestones'), where('contractId', '==', contractId), orderBy('sortOrder', 'asc')));
    const milestones = milestoneSnap.docs.map((snap) => mapMilestoneRow({ id: snap.id, ...(snap.data() || {}) }));
    return mapContractRow({ id: contractSnap.id, ...(contractSnap.data() || {}) }, milestones);
  }
};

export default contractService;
