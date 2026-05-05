import type { Proposal, WorkRequest } from '../types';

export const isProposalRequiredLead = (request?: Partial<WorkRequest> | null) => {
  if (!request) return false;
  if (request.requestType === 'quote') return true;
  return request.details?.concierge?.source === 'ai_concierge';
};

export const buildProposalMessagesLink = (targetUserId?: string, listingId?: string) => {
  const recipientId = String(targetUserId || '').trim();
  const serviceId = String(listingId || '').trim();
  if (!recipientId) return '/profile/messages';
  const params = new URLSearchParams();
  params.set('sellerId', recipientId);
  if (serviceId) params.set('serviceId', serviceId);
  return `/profile/messages?${params.toString()}`;
};

export const getProposalQueueGroup = (status?: Proposal['status']) => {
  if (status === 'accepted') return 'accepted';
  if (status === 'pending') return 'pending';
  return 'declined';
};
