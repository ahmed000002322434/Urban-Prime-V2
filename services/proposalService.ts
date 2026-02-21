import {
  addDoc,
  collection,
  doc,
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
import type { Proposal, User } from '../types';

interface ListProposalParams {
  requestId?: string;
  listingId?: string;
  providerId?: string;
  clientId?: string;
  status?: Proposal['status'];
  limit?: number;
  offset?: number;
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

const mapProposalRow = (row: any): Proposal => ({
  id: String(row?.id || ''),
  requestId: row?.request_id || row?.requestId || undefined,
  listingId: row?.listing_id || row?.listingId || undefined,
  providerId: String(row?.provider_id || row?.providerId || ''),
  providerPersonaId: row?.provider_persona_id || row?.providerPersonaId || undefined,
  providerSnapshot: row?.provider_snapshot || row?.providerSnapshot || undefined,
  clientId: String(row?.client_id || row?.clientId || ''),
  clientPersonaId: row?.client_persona_id || row?.clientPersonaId || undefined,
  clientSnapshot: row?.client_snapshot || row?.clientSnapshot || undefined,
  title: String(row?.title || 'Proposal'),
  coverLetter: row?.cover_letter || row?.coverLetter || undefined,
  priceTotal: toNumber(row?.price_total ?? row?.priceTotal, 0),
  currency: String(row?.currency || 'USD'),
  deliveryDays: row?.delivery_days !== undefined ? toNumber(row.delivery_days) : row?.deliveryDays !== undefined ? toNumber(row.deliveryDays) : undefined,
  milestones: Array.isArray(row?.milestones) ? row.milestones : [],
  terms: row?.terms || {},
  revisionLimit: row?.revision_limit !== undefined ? toNumber(row.revision_limit) : row?.revisionLimit !== undefined ? toNumber(row.revisionLimit) : undefined,
  riskScore: row?.risk_score !== undefined ? toNumber(row.risk_score) : row?.riskScore !== undefined ? toNumber(row.riskScore) : undefined,
  status: (row?.status || 'pending') as Proposal['status'],
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  respondedAt: row?.responded_at || row?.respondedAt || undefined,
  updatedAt: row?.updated_at || row?.updatedAt || undefined
});

const proposalService = {
  async createProposal(input: Partial<Proposal>, user: User): Promise<Proposal> {
    const payload = {
      requestId: input.requestId || undefined,
      listingId: input.listingId || undefined,
      clientId: input.clientId,
      clientPersonaId: input.clientPersonaId || undefined,
      clientSnapshot: input.clientSnapshot || undefined,
      title: input.title || 'Proposal',
      coverLetter: input.coverLetter || '',
      priceTotal: input.priceTotal ?? 0,
      currency: input.currency || 'USD',
      deliveryDays: input.deliveryDays ?? null,
      milestones: input.milestones || [],
      terms: input.terms || {},
      revisionLimit: input.revisionLimit ?? null,
      riskScore: input.riskScore ?? 0,
      providerPersonaId: input.providerPersonaId || undefined,
      providerSnapshot: input.providerSnapshot || {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        rating: user.rating || 0
      }
    };

    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/proposals', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);
      const proposal = mapProposalRow(res?.data);
      await supabaseMirror.upsert('work_proposals', proposal.id, proposal);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_proposals', proposal.id), proposal, { merge: true });
      }
      return proposal;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to create proposal: no backend or firestore fallback available.');
    }

    const docRef = await addDoc(collection(db, 'work_proposals'), {
      ...payload,
      providerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: input.status || 'pending'
    });

    return mapProposalRow({
      id: docRef.id,
      ...payload,
      providerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: input.status || 'pending'
    });
  },

  async updateProposal(proposalId: string, updates: Partial<Proposal>): Promise<Proposal> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/proposals/${proposalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }, token);
      const proposal = mapProposalRow(res?.data);
      await supabaseMirror.mergeUpdate<Proposal>('work_proposals', proposal.id, proposal);
      if (shouldUseFirestoreFallback()) {
        await setDoc(doc(db, 'work_proposals', proposal.id), proposal, { merge: true });
      }
      return proposal;
    }

    if (!shouldUseFirestoreFallback()) {
      throw new Error('Unable to update proposal: no backend or firestore fallback available.');
    }

    await setDoc(doc(db, 'work_proposals', proposalId), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return mapProposalRow({
      id: proposalId,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async getProposals(params: ListProposalParams = {}): Promise<Proposal[]> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const queryParams = new URLSearchParams();
      if (params.requestId) queryParams.set('eq.request_id', params.requestId);
      if (params.listingId) queryParams.set('eq.listing_id', params.listingId);
      if (params.providerId) queryParams.set('eq.provider_id', params.providerId);
      if (params.clientId) queryParams.set('eq.client_id', params.clientId);
      if (params.status) queryParams.set('eq.status', params.status);
      queryParams.set('order', 'updated_at.desc');
      queryParams.set('limit', String(Math.min(params.limit || 100, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));
      const res = await backendFetch(`/api/work_proposals?${queryParams.toString()}`, {}, token);
      return (Array.isArray(res?.data) ? res.data : []).map(mapProposalRow);
    }

    if (!shouldUseFirestoreFallback()) return [];

    let proposalQuery = query(collection(db, 'work_proposals'), orderBy('updatedAt', 'desc'));
    if (params.providerId) {
      proposalQuery = query(collection(db, 'work_proposals'), where('providerId', '==', params.providerId), orderBy('updatedAt', 'desc'));
    } else if (params.clientId) {
      proposalQuery = query(collection(db, 'work_proposals'), where('clientId', '==', params.clientId), orderBy('updatedAt', 'desc'));
    } else if (params.status) {
      proposalQuery = query(collection(db, 'work_proposals'), where('status', '==', params.status), orderBy('updatedAt', 'desc'));
    }

    const snapshot = await getDocs(proposalQuery);
    return snapshot.docs.map((snap) => mapProposalRow({ id: snap.id, ...(snap.data() || {}) }));
  },

  async getProviderProposals(providerId: string): Promise<Proposal[]> {
    return proposalService.getProposals({ providerId });
  },

  async getClientProposals(clientId: string): Promise<Proposal[]> {
    return proposalService.getProposals({ clientId });
  }
};

export default proposalService;
