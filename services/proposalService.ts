import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc
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
import type { Proposal, ProposalComposerDraft, User } from '../types';

interface ListProposalParams {
  id?: string;
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

const updateRequestStatusDirect = async (requestId: string, updates: Record<string, any>) => {
  const normalizedRequestId = String(requestId || '').trim();
  if (!normalizedRequestId || !canUseDirectSupabase()) return;
  const payload = { ...updates };
  if (!payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }
  const res = await supabase
    .from('work_requests')
    .update(payload)
    .eq('id', normalizedRequestId)
    .select('id,status,accepted_at,declined_at,updated_at,details')
    .maybeSingle();
  if (res.error) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
  }
};

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
      let requestRow: any = null;
      if (payload.requestId) {
        const requestLookup = await supabase
          .from('work_requests')
          .select('*')
          .eq('id', payload.requestId)
          .maybeSingle();
        if (requestLookup.error) {
          throw toSupabaseError(getDirectSupabaseSetupMessage(), requestLookup.error);
        }
        requestRow = requestLookup.data;
        if (!requestRow) {
          throw new Error('Work request not found.');
        }
        if (String(requestRow.target_provider_id || '') !== String(currentUserRow.id || '')) {
          throw new Error('You do not have access to propose on this request.');
        }
        if (['matched', 'cancelled', 'closed'].includes(String(requestRow.status || '').toLowerCase())) {
          throw new Error('This lead can no longer receive proposals.');
        }
        if (String(requestRow.request_type || '').toLowerCase() === 'booking') {
          throw new Error('Booking leads should be accepted directly.');
        }
        const resolvedListingId = payload.listingId || requestRow.listing_id || undefined;
        if (resolvedListingId) {
          const listingLookup = await supabase
            .from('work_listings')
            .select('id,status')
            .eq('id', resolvedListingId)
            .maybeSingle();
          if (listingLookup.error) {
            throw toSupabaseError(getDirectSupabaseSetupMessage(), listingLookup.error);
          }
          if (!listingLookup.data || String(listingLookup.data.status || '') !== 'published') {
            throw new Error('Linked listing is no longer available.');
          }
          payload.listingId = resolvedListingId;
        }
        clientId = clientId || String(requestRow.requester_id || '').trim() || clientId;
      }

      const proposalRow = {
        request_id: payload.requestId || null,
        listing_id: payload.listingId || requestRow?.listing_id || null,
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
        client_snapshot: payload.clientSnapshot || requestRow?.requester_snapshot || {
          id: input.clientId || requestRow?.requester_id || '',
          name: requestRow?.requester_snapshot?.name || 'Client'
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
      };

      let existingRow: any = null;
      if (payload.requestId) {
        const existingLookup = await supabase
          .from('work_proposals')
          .select('*')
          .eq('request_id', payload.requestId)
          .eq('provider_id', currentUserRow.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingLookup.error) {
          throw toSupabaseError(getDirectSupabaseSetupMessage(), existingLookup.error);
        }
        existingRow = existingLookup.data || null;
        if (existingRow?.status === 'accepted') {
          throw new Error('This proposal has already been accepted.');
        }
      }

      const res = existingRow?.id
        ? await supabase
            .from('work_proposals')
            .update({
              ...proposalRow,
              responded_at: null
            })
            .eq('id', existingRow.id)
            .select('*')
            .single()
        : await supabase
            .from('work_proposals')
            .insert(proposalRow)
            .select('*')
            .single();
      if (res.error || !res.data) {
        throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
      }
      if (payload.requestId && proposalRow.status === 'pending') {
        await updateRequestStatusDirect(payload.requestId, {
          status: 'in_review'
        });
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
      if (proposal.requestId && updates.status === 'pending') {
        await updateRequestStatusDirect(proposal.requestId, {
          status: 'in_review'
        });
      }
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
      if (params.id) queryParams.set('eq.id', params.id);
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
      if (params.id) queryBuilder = queryBuilder.eq('id', params.id);
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

    if (params.id) {
      const snap = await getDoc(doc(db, 'work_proposals', params.id));
      if (!snap.exists()) return [];
      const proposal = mapProposalRow({ id: snap.id, ...(snap.data() || {}) });
      const matchesProvider = !params.providerId || proposal.providerId === params.providerId;
      const matchesClient = !params.clientId || proposal.clientId === params.clientId;
      const matchesRequest = !params.requestId || proposal.requestId === params.requestId;
      const matchesListing = !params.listingId || proposal.listingId === params.listingId;
      const matchesStatus = !params.status || proposal.status === params.status;
      return matchesProvider && matchesClient && matchesRequest && matchesListing && matchesStatus ? [proposal] : [];
    }

    const snapshot = await getDocs(query(collection(db, 'work_proposals'), orderBy('updatedAt', 'desc')));
    const rows = snapshot.docs.map((snap) => mapProposalRow({ id: snap.id, ...(snap.data() || {}) }));
    return rows.filter((proposal) => {
      if (params.providerId && proposal.providerId !== params.providerId) return false;
      if (params.clientId && proposal.clientId !== params.clientId) return false;
      if (params.requestId && proposal.requestId !== params.requestId) return false;
      if (params.listingId && proposal.listingId !== params.listingId) return false;
      if (params.status && proposal.status !== params.status) return false;
      return true;
    });
  },

  async getProviderProposals(providerId: string): Promise<Proposal[]> {
    return proposalService.getProposals({ providerId });
  },

  async getClientProposals(clientId: string): Promise<Proposal[]> {
    return proposalService.getProposals({ clientId });
  },

  async getProposalById(proposalId: string): Promise<Proposal | undefined> {
    const normalizedId = String(proposalId || '').trim();
    if (!normalizedId) return undefined;
    const rows = await proposalService.getProposals({ id: normalizedId, limit: 1 });
    return rows[0];
  },

  async getProposalByRequest(requestId: string, providerId: string): Promise<Proposal | undefined> {
    const normalizedRequestId = String(requestId || '').trim();
    const normalizedProviderId = String(providerId || '').trim();
    if (!normalizedRequestId || !normalizedProviderId) return undefined;
    const rows = await proposalService.getProposals({
      requestId: normalizedRequestId,
      providerId: normalizedProviderId,
      limit: 1
    });
    return rows[0];
  },

  async sendProposalForRequest(input: ProposalComposerDraft, user: User): Promise<Proposal> {
    return proposalService.createProposal({
      requestId: input.requestId,
      listingId: input.listingId,
      clientId: input.clientId,
      title: input.title,
      coverLetter: input.coverLetter,
      priceTotal: input.priceTotal,
      currency: input.currency,
      deliveryDays: input.deliveryDays,
      revisionLimit: input.revisionLimit,
      milestones: input.milestones,
      terms: input.terms,
      status: 'pending'
    }, user);
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

    if (proposal.requestId) {
      await updateRequestStatusDirect(proposal.requestId, {
        status: 'matched',
        accepted_at: new Date().toISOString()
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

    const proposal = await proposalService.updateProposal(proposalId, {
      status: 'declined',
      respondedAt: new Date().toISOString(),
      terms: {
        declineReason: reason
      }
    });
    if (proposal.requestId) {
      await updateRequestStatusDirect(proposal.requestId, {
        status: 'open'
      }).catch(() => undefined);
    }
    return proposal;
  }
};

export default proposalService;
