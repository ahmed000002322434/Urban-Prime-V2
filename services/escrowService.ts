import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import supabaseMirror from './supabaseMirror';
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
