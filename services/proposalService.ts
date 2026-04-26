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
import contractService from './contractService';
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

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapProposalRow = (row: any): Proposal => ({
  id: String(row?.id || ''),
  requestId: row?.request_id || row?.requestId || undefined,
  listingId: row?.listing_id || row?.listingId || undefined,
  providerId: String(row?.provider_snapshot?.id || row?.provider_firebase_uid || row?.provider_id || row?.providerId || ''),
  providerPersonaId: row?.provider_persona_id || row?.providerPersonaId || undefined,
  providerSnapshot: row?.provider_snapshot || row?.providerSnapshot || undefined,
  clientId: String(row?.client_snapshot?.id || row?.client_firebase_uid || row?.client_id || row?.clientId || ''),
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

const canUseDirectSupabase = () => !isBackendConfigured() && canUseDirectSupabaseTables();

const toSupabaseError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const attachProposalFirebaseIds = async (rows: any[]) =>
  attachFirebaseIdsToRows(rows, [
    { sourceField: 'provider_id', targetField: 'provider_firebase_uid' },
    { sourceField: 'client_id', targetField: 'client_firebase_uid' }
  ]);

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

    if (canUseDirectSupabase()) {
      const currentUserRow = await ensureSupabaseUserRecord(user);
      let clientId = input.clientId === user.id ? currentUserRow.id : await resolveSupabaseUserId(input.clientId);
      if (!clientId && input.clientId) {
        clientId = (await ensureSupabaseUserRecord({
          id: input.clientId,
          name: input.clientId === user.id ? user.name : 'Client',
          email: input.clientId === user.id ? user.email : '',
          avatar: input.clientId === user.id ? user.avatar : ''
        })).id;
      }
      const res = await supabase
        .from('work_proposals')
        .insert({
          request_id: payload.requestId || null,
          listing_id: payload.listingId || null,
          provider_id: currentUserRow.id,
          provider_persona_id: payload.providerPersonaId || null,
          provider_snapshot: payload.providerSnapshot || {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            rating: user.rating || 0
          },
          client_id: clientId || null,
          client_persona_id: payload.clientPersonaId || null,
          client_snapshot: payload.clientSnapshot || {
            id: input.clientId || '',
            name: 'Client'
          },
          title: payload.title,
          cover_letter: payload.coverLetter,
          price_total: payload.priceTotal,
          currency: payload.currency,
          delivery_days: payload.deliveryDays ?? 0,
          milestones: payload.milestones || [],
          terms: payload.terms || {},
          revision_limit: payload.revisionLimit ?? 0,
          risk_score: payload.riskScore ?? 0,
          status: input.status || 'pending'
        })
        .select('*')
        .single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachProposalFirebaseIds([res.data]);
      const proposal = mapProposalRow(normalizedRow);
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

    if (canUseDirectSupabase()) {
      const rowUpdates: Record<string, any> = {};
      if (updates.requestId !== undefined) rowUpdates.request_id = updates.requestId;
      if (updates.listingId !== undefined) rowUpdates.listing_id = updates.listingId;
      if (updates.providerPersonaId !== undefined) rowUpdates.provider_persona_id = updates.providerPersonaId;
      if (updates.providerSnapshot !== undefined) rowUpdates.provider_snapshot = updates.providerSnapshot;
      if (updates.clientPersonaId !== undefined) rowUpdates.client_persona_id = updates.clientPersonaId;
      if (updates.clientSnapshot !== undefined) rowUpdates.client_snapshot = updates.clientSnapshot;
      if (updates.title !== undefined) rowUpdates.title = updates.title;
      if (updates.coverLetter !== undefined) rowUpdates.cover_letter = updates.coverLetter;
      if (updates.priceTotal !== undefined) rowUpdates.price_total = updates.priceTotal;
      if (updates.currency !== undefined) rowUpdates.currency = updates.currency;
      if (updates.deliveryDays !== undefined) rowUpdates.delivery_days = updates.deliveryDays;
      if (updates.milestones !== undefined) rowUpdates.milestones = updates.milestones;
      if (updates.terms !== undefined) rowUpdates.terms = updates.terms;
      if (updates.revisionLimit !== undefined) rowUpdates.revision_limit = updates.revisionLimit;
      if (updates.riskScore !== undefined) rowUpdates.risk_score = updates.riskScore;
      if (updates.status !== undefined) rowUpdates.status = updates.status;
      if (updates.respondedAt !== undefined) rowUpdates.responded_at = updates.respondedAt;

      const res = await supabase.from('work_proposals').update(rowUpdates).eq('id', proposalId).select('*').single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const [normalizedRow] = await attachProposalFirebaseIds([res.data]);
      const proposal = mapProposalRow(normalizedRow);
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
      const providerId = await resolveBackendUserId(params.providerId);
      const clientId = await resolveBackendUserId(params.clientId);
      const queryParams = new URLSearchParams();
      if (params.requestId) queryParams.set('eq.request_id', params.requestId);
      if (params.listingId) queryParams.set('eq.listing_id', params.listingId);
      if (providerId) queryParams.set('eq.provider_id', providerId);
      if (clientId) queryParams.set('eq.client_id', clientId);
      if (params.status) queryParams.set('eq.status', params.status);
      queryParams.set('order', 'updated_at.desc');
      queryParams.set('limit', String(Math.min(params.limit || 100, 200)));
      queryParams.set('offset', String(Math.max(params.offset || 0, 0)));
      const res = await backendFetch(`/api/work_proposals?${queryParams.toString()}`, {}, token);
      return (Array.isArray(res?.data) ? res.data : []).map(mapProposalRow);
    }

    if (canUseDirectSupabase()) {
      const providerId = await resolveSupabaseUserId(params.providerId);
      const clientId = await resolveSupabaseUserId(params.clientId);
      let queryBuilder = supabase.from('work_proposals').select('*').order('updated_at', { ascending: false });
      if (params.requestId) queryBuilder = queryBuilder.eq('request_id', params.requestId);
      if (params.listingId) queryBuilder = queryBuilder.eq('listing_id', params.listingId);
      if (providerId) queryBuilder = queryBuilder.eq('provider_id', providerId);
      if (clientId) queryBuilder = queryBuilder.eq('client_id', clientId);
      if (params.status) queryBuilder = queryBuilder.eq('status', params.status);
      const limit = Math.min(params.limit || 100, 200);
      const offset = Math.max(params.offset || 0, 0);
      const res = await queryBuilder.range(offset, offset + limit - 1);
      if (res.error) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      const normalizedRows = await attachProposalFirebaseIds(res.data || []);
      return normalizedRows.map(mapProposalRow);
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
  },

  async acceptProposal(proposalId: string): Promise<{ proposal: Proposal; contract?: any }> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/proposals/${proposalId}/accept`, {
        method: 'POST'
      }, token);
      const proposal = mapProposalRow(res?.data?.proposal || res?.data);
      await supabaseMirror.upsert('work_proposals', proposal.id, proposal);
      if (res?.data?.contract?.id) {
        await supabaseMirror.upsert('work_contracts', res.data.contract.id, res.data.contract);
      }
      return {
        proposal,
        contract: res?.data?.contract || undefined
      };
    }

    const proposal = await proposalService.updateProposal(proposalId, {
      status: 'accepted',
      respondedAt: new Date().toISOString()
    });
    const contract = await contractService.createContract({
      proposalId: proposal.id,
      requestId: proposal.requestId,
      listingId: proposal.listingId,
      clientId: proposal.clientId,
      providerId: proposal.providerId,
      scope: proposal.coverLetter || proposal.title,
      mode: 'proposal',
      fulfillmentKind: 'hybrid',
      currency: proposal.currency,
      totalAmount: proposal.priceTotal,
      status: 'pending',
      terms: proposal.terms || {}
    }, {
      id: proposal.clientId,
      name: proposal.clientSnapshot?.name || 'Client',
      email: '',
      avatar: proposal.clientSnapshot?.avatar || '',
      following: [],
      followers: [],
      wishlist: [],
      cart: [],
      badges: [],
      memberSince: proposal.createdAt
    }).catch(() => undefined);

    if (contract && proposal.priceTotal > 0) {
      await escrowService.hold({
        contractId: contract.id,
        amount: proposal.priceTotal,
        payerId: proposal.clientId,
        payeeId: proposal.providerId,
        currency: proposal.currency,
        metadata: {
          proposalId: proposal.id,
          source: 'direct_supabase_accept_proposal'
        }
      }).catch(() => undefined);
    }

    return { proposal, contract };
  },

  async declineProposal(proposalId: string, reason?: string): Promise<Proposal> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch(`/work/proposals/${proposalId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }, token);
      const proposal = mapProposalRow(res?.data);
      await supabaseMirror.upsert('work_proposals', proposal.id, proposal);
      return proposal;
    }

    return proposalService.updateProposal(proposalId, {
      status: 'declined',
      respondedAt: new Date().toISOString(),
      terms: {
        declineReason: reason
      }
    });
  }
};

export default proposalService;
