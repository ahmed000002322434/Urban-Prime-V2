import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import { canUseDirectSupabaseTables, getDirectSupabaseSetupMessage, resolveSupabaseUserId } from './supabaseAppBridge';
import supabaseMirror from './supabaseMirror';
import supabase from '../utils/supabase';
import type { EscrowTransaction } from '../types';

export interface EscrowMutationPayload {
  engagementId?: string;
  contractId?: string;
  milestoneId?: string;
  payerId?: string;
  payeeId?: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
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

const mapEscrowRow = (row: any): EscrowTransaction => ({
  id: String(row?.id || ''),
  engagementId: String(row?.engagement_id || row?.engagementId || ''),
  contractId: row?.contract_id || row?.contractId || undefined,
  milestoneId: row?.milestone_id || row?.milestoneId || undefined,
  payerId: row?.payer_id || row?.payerId || undefined,
  payeeId: row?.payee_id || row?.payeeId || undefined,
  action: (row?.action || 'hold') as EscrowTransaction['action'],
  amount: toNumber(row?.amount, 0),
  currency: String(row?.currency || 'USD'),
  status: (row?.status || 'succeeded') as EscrowTransaction['status'],
  providerRef: row?.provider_ref || row?.providerRef || undefined,
  metadata: row?.metadata || {},
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const canUseDirectSupabase = () => !isBackendConfigured() && canUseDirectSupabaseTables();

const toSupabaseError = (context: string, error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '').trim();
  return new Error(message ? `${context}: ${message}` : context);
};

const ensureDirectEngagementId = async (payload: EscrowMutationPayload) => {
  if (payload.engagementId) return payload.engagementId;

  if (payload.contractId) {
    const contractRes = await supabase
      .from('work_contracts')
      .select('id,engagement_id,request_id,client_id,provider_id,listing_id,mode,fulfillment_kind,currency,timezone,total_amount,risk_score,status')
      .eq('id', payload.contractId)
      .maybeSingle();

    if (contractRes.error) {
      throw toSupabaseError(getDirectSupabaseSetupMessage(), contractRes.error);
    }

    if (contractRes.data?.engagement_id) {
      return String(contractRes.data.engagement_id);
    }

    const buyerId = contractRes.data?.client_id || (await resolveSupabaseUserId(payload.payerId));
    const providerId = contractRes.data?.provider_id || (await resolveSupabaseUserId(payload.payeeId));
    if (!buyerId || !providerId) {
      throw new Error('Unable to create escrow engagement because buyer/provider records are missing in Supabase.');
    }

    const engagementRes = await supabase
      .from('work_engagements')
      .insert({
        source_type: contractRes.data?.request_id ? 'service_request' : 'contract',
        source_id: contractRes.data?.request_id || payload.contractId,
        mode: contractRes.data?.mode || 'hybrid',
        fulfillment_kind: contractRes.data?.fulfillment_kind || 'hybrid',
        buyer_id: buyerId,
        provider_id: providerId,
        currency: payload.currency || contractRes.data?.currency || 'USD',
        timezone: contractRes.data?.timezone || 'UTC',
        gross_amount: payload.amount || contractRes.data?.total_amount || 0,
        escrow_status: 'held',
        risk_score: contractRes.data?.risk_score || 0,
        status: contractRes.data?.status === 'completed' ? 'completed' : 'active',
        metadata: {
          listingId: contractRes.data?.listing_id || null
        }
      })
      .select('id')
      .single();

    if (engagementRes.error || !engagementRes.data?.id) {
      throw toSupabaseError(getDirectSupabaseSetupMessage(), engagementRes.error);
    }

    await supabase
      .from('work_contracts')
      .update({ engagement_id: engagementRes.data.id })
      .eq('id', payload.contractId);

    return String(engagementRes.data.id);
  }

  const buyerId = await resolveSupabaseUserId(payload.payerId);
  const providerId = await resolveSupabaseUserId(payload.payeeId);
  if (!buyerId || !providerId) {
    throw new Error('Unable to create escrow engagement because buyer/provider records are missing in Supabase.');
  }

  const engagementRes = await supabase
    .from('work_engagements')
    .insert({
      source_type: 'service_request',
      source_id: String(payload.metadata?.requestId || `escrow-${Date.now()}`),
      mode: 'hybrid',
      fulfillment_kind: 'hybrid',
      buyer_id: buyerId,
      provider_id: providerId,
      currency: payload.currency || 'USD',
      timezone: 'UTC',
      gross_amount: payload.amount,
      escrow_status: 'held',
      risk_score: 0,
      status: 'active',
      metadata: payload.metadata || {}
    })
    .select('id')
    .single();

  if (engagementRes.error || !engagementRes.data?.id) {
    throw toSupabaseError(getDirectSupabaseSetupMessage(), engagementRes.error);
  }

  return String(engagementRes.data.id);
};

const mutateEscrow = async (
  path: '/work/escrow/hold' | '/work/escrow/release' | '/work/escrow/refund',
  action: EscrowTransaction['action'],
  payload: EscrowMutationPayload
): Promise<EscrowTransaction> => {
  if (isBackendConfigured()) {
    const token = await getBackendToken();
    const res = await backendFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token);
    const transaction = mapEscrowRow(res?.data);
    await supabaseMirror.upsert('work_escrow_ledger', transaction.id, transaction);
    if (shouldUseFirestoreFallback()) {
      await setDoc(doc(db, 'work_escrow_ledger', transaction.id), transaction, { merge: true });
    }
    return transaction;
  }

  if (canUseDirectSupabase()) {
    const engagementId = await ensureDirectEngagementId(payload);
    const payerId = await resolveSupabaseUserId(payload.payerId);
    const payeeId = await resolveSupabaseUserId(payload.payeeId);
    const res = await supabase
      .from('work_escrow_ledger')
      .insert({
        engagement_id: engagementId,
        contract_id: payload.contractId || null,
        milestone_id: payload.milestoneId || null,
        payer_id: payerId || null,
        payee_id: payeeId || null,
        action,
        amount: payload.amount,
        currency: payload.currency || 'USD',
        status: 'succeeded',
        metadata: payload.metadata || {}
      })
      .select('*')
      .single();

    if (res.error || !res.data) {
      throw toSupabaseError(getDirectSupabaseSetupMessage(), res.error);
    }

    const transaction = mapEscrowRow({
      ...res.data,
      payer_id: payload.payerId || payerId || res.data.payer_id,
      payee_id: payload.payeeId || payeeId || res.data.payee_id
    });
    await supabaseMirror.upsert('work_escrow_ledger', transaction.id, transaction);

    if (payload.contractId) {
      const contractRes = await supabase.from('work_contracts').select('escrow_held').eq('id', payload.contractId).maybeSingle();
      if (!contractRes.error && contractRes.data) {
        const currentEscrow = toNumber(contractRes.data.escrow_held, 0);
        const delta = action === 'hold' ? payload.amount : -payload.amount;
        await supabase
          .from('work_contracts')
          .update({
            escrow_held: Math.max(0, currentEscrow + delta)
          })
          .eq('id', payload.contractId);
      }
    }

    await supabase
      .from('work_engagements')
      .update({
        escrow_status: action === 'hold' ? 'held' : action === 'refund' ? 'refunded' : 'released'
      })
      .eq('id', engagementId);

    return transaction;
  }

  if (!shouldUseFirestoreFallback()) {
    throw new Error('Unable to mutate escrow: no backend or firestore fallback available.');
  }

  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'work_escrow_ledger'), {
    engagementId: payload.engagementId || '',
    contractId: payload.contractId || null,
    milestoneId: payload.milestoneId || null,
    payerId: payload.payerId || null,
    payeeId: payload.payeeId || null,
    action,
    amount: payload.amount,
    currency: payload.currency || 'USD',
    status: 'succeeded',
    metadata: payload.metadata || {},
    createdAt: now
  });

  const entry = mapEscrowRow({
    id: docRef.id,
    engagementId: payload.engagementId || '',
    contractId: payload.contractId || null,
    milestoneId: payload.milestoneId || null,
    payerId: payload.payerId || null,
    payeeId: payload.payeeId || null,
    action,
    amount: payload.amount,
    currency: payload.currency || 'USD',
    status: 'succeeded',
    metadata: payload.metadata || {},
    createdAt: now
  });

  if (payload.contractId) {
    const contractRef = doc(db, 'work_contracts', payload.contractId);
    const contractSnap = await getDoc(contractRef);
    const current = contractSnap.exists() ? (contractSnap.data() || {}) : {};
    const currentEscrow = toNumber(current.escrowHeld ?? current.escrow_held, 0);
    const delta = action === 'hold' ? payload.amount : -payload.amount;
    const nextEscrow = Math.max(0, currentEscrow + delta);
    await setDoc(contractRef, {
      escrowHeld: nextEscrow,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  return entry;
};

const escrowService = {
  hold: (payload: EscrowMutationPayload) => mutateEscrow('/work/escrow/hold', 'hold', payload),
  release: (payload: EscrowMutationPayload) => mutateEscrow('/work/escrow/release', 'release', payload),
  refund: (payload: EscrowMutationPayload) => mutateEscrow('/work/escrow/refund', 'refund', payload)
};

export default escrowService;
