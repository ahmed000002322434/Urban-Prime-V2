import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import proposalService from '../../../services/proposalService';
import workService from '../../../services/workService';
import type {
  Proposal,
  ProposalComposerDraft,
  ProposalMilestone,
  ProposalTerms,
  WorkListing,
  WorkRequest
} from '../../../types';
import { buildProposalMessagesLink, isProposalRequiredLead } from '../../../utils/proposalWorkflow';
import {
  ProviderEmptyState,
  ProviderPageHeader,
  ProviderSurface,
  formatMoney
} from './providerWorkspaceUi';

const fieldClassName = 'w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10';
const listFieldKeys: Array<keyof ProposalTerms> = ['included', 'excluded', 'clientResponsibilities', 'handoffItems', 'assumptions'];

const toList = (value?: string[] | null) => (Array.isArray(value) ? value.join('\n') : '');
const parseList = (value: string) => value.split('\n').map((entry) => entry.trim()).filter(Boolean);

const buildDraftFromLead = (
  request: WorkRequest,
  proposal: Proposal | null,
  listing?: WorkListing
): ProposalComposerDraft => {
  const baselineAmount = proposal?.priceTotal || request.budgetMax || request.budgetMin || listing?.basePrice || 0;
  const conciergeMilestones = request.details?.concierge?.suggestedMilestones || [];
  const milestoneDrafts: ProposalMilestone[] = proposal?.milestones?.length
    ? proposal.milestones
    : conciergeMilestones.length
      ? conciergeMilestones.map((milestone, index) => ({
          title: milestone.title,
          amount: index === conciergeMilestones.length - 1
            ? Math.max(0, baselineAmount - conciergeMilestones
                .slice(0, index)
                .reduce((total, entry) => total + Math.round((baselineAmount * entry.amountPct) / 100), 0))
            : Math.round((baselineAmount * milestone.amountPct) / 100),
          description: milestone.description
        }))
      : [{
          title: 'Final delivery',
          amount: baselineAmount,
          description: request.brief
        }];

  return {
    requestId: request.id,
    listingId: proposal?.listingId || request.listingId,
    clientId: proposal?.clientId || request.requesterId,
    title: proposal?.title || `Proposal for ${request.title}`,
    coverLetter: proposal?.coverLetter || request.brief || '',
    priceTotal: proposal?.priceTotal || baselineAmount,
    currency: proposal?.currency || request.currency || listing?.currency || 'USD',
    deliveryDays: proposal?.deliveryDays ?? request.details?.concierge?.suggestedTimelineDays ?? listing?.packages?.[0]?.deliveryDays ?? 7,
    revisionLimit: proposal?.revisionLimit ?? listing?.packages?.[0]?.revisions ?? 1,
    milestones: milestoneDrafts,
    terms: {
      scopeSummary: proposal?.terms?.scopeSummary || request.brief || '',
      included: proposal?.terms?.included || request.requirements || [],
      excluded: proposal?.terms?.excluded || [],
      clientResponsibilities: proposal?.terms?.clientResponsibilities || [],
      handoffItems: proposal?.terms?.handoffItems || [],
      assumptions: proposal?.terms?.assumptions || []
    }
  };
};

const ProviderProposalComposerPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { leadId, proposalId } = useParams<{ leadId?: string; proposalId?: string }>();
  const [request, setRequest] = useState<WorkRequest | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [listing, setListing] = useState<WorkListing | null>(null);
  const [draft, setDraft] = useState<ProposalComposerDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      setError(null);

      try {
        let requestRow: WorkRequest | undefined;
        let proposalRow: Proposal | undefined;

        if (proposalId) {
          proposalRow = await proposalService.getProposalById(proposalId);
          if (!proposalRow) {
            throw new Error('Proposal not found.');
          }
          if (proposalRow.providerId !== user.id) {
            throw new Error('You do not have access to edit this proposal.');
          }
          requestRow = proposalRow.requestId ? await workService.getRequestById(proposalRow.requestId) : undefined;
        } else if (leadId) {
          requestRow = await workService.getRequestById(leadId);
          proposalRow = requestRow ? await proposalService.getProposalByRequest(requestRow.id, user.id) : undefined;
        }

        if (!requestRow) {
          throw new Error('Lead not found.');
        }
        if (requestRow.targetProviderId && requestRow.targetProviderId !== user.id) {
          throw new Error('You do not have access to this lead.');
        }

        const linkedListing = requestRow.listingId ? await workService.getListingById(requestRow.listingId) : undefined;

        if (cancelled) return;
        setRequest(requestRow);
        setProposal(proposalRow || null);
        setListing(linkedListing || null);
        setDraft(buildDraftFromLead(requestRow, proposalRow || null, linkedListing));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load proposal composer.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [leadId, proposalId, user?.id]);

  const messageTo = useMemo(() => (
    request ? buildProposalMessagesLink(request.requesterId, request.listingId) : '/profile/messages'
  ), [request]);

  const staleState = useMemo(() => {
    if (!request) return null;
    if (!isProposalRequiredLead(request)) {
      return {
        title: 'This lead uses direct booking',
        body: 'Only quote-first and concierge leads use the proposal composer. Booking leads should stay on the direct accept path.'
      };
    }
    if (proposal?.status === 'accepted') {
      return {
        title: 'Proposal already accepted',
        body: 'This proposal has already converted into active work. Continue from the jobs queue instead of resending it.'
      };
    }
    if (['matched', 'cancelled', 'closed'].includes(request.status)) {
      return {
        title: 'Lead is no longer editable',
        body: 'The request has already moved out of the open proposal loop, so this composer is now read only by design.'
      };
    }
    if (request.listingId && (!listing || listing.status !== 'published')) {
      return {
        title: 'Linked service is unavailable',
        body: 'This lead points to a service that is no longer published, so resend is blocked until the listing is restored.'
      };
    }
    return null;
  }, [listing, proposal?.status, request]);

  const updateDraft = <K extends keyof ProposalComposerDraft>(key: K, value: ProposalComposerDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const updateMilestone = (index: number, patch: Partial<ProposalMilestone>) => {
    setDraft((current) => {
      if (!current) return current;
      const nextMilestones = current.milestones.map((milestone, milestoneIndex) => (
        milestoneIndex === index ? { ...milestone, ...patch } : milestone
      ));
      return { ...current, milestones: nextMilestones };
    });
  };

  const addMilestone = () => {
    setDraft((current) => current ? {
      ...current,
      milestones: [...current.milestones, { title: 'New milestone', amount: 0, description: '' }]
    } : current);
  };

  const removeMilestone = (index: number) => {
    setDraft((current) => {
      if (!current || current.milestones.length === 1) return current;
      return {
        ...current,
        milestones: current.milestones.filter((_, milestoneIndex) => milestoneIndex !== index)
      };
    });
  };

  const updateTermsList = (key: keyof ProposalTerms, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        terms: {
          ...current.terms,
          [key]: parseList(value)
        }
      };
    });
  };

  const handleSendProposal = async () => {
    if (!user || !request || !draft) return;

    if (!draft.title.trim()) {
      setError('A proposal title is required.');
      return;
    }
    if (!draft.coverLetter.trim()) {
      setError('A scope summary is required before sending.');
      return;
    }
    if (draft.priceTotal <= 0) {
      setError('Set a positive total price before sending.');
      return;
    }
    if (!draft.milestones.length || draft.milestones.some((milestone) => !milestone.title.trim() || milestone.amount <= 0)) {
      setError('Each milestone needs a title and a positive amount.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await proposalService.sendProposalForRequest({
        ...draft,
        requestId: request.id,
        listingId: request.listingId,
        clientId: request.requesterId
      }, user);
      showNotification(proposal ? 'Proposal resent for client review.' : 'Proposal sent for client review.');
      navigate('/profile/provider/proposals');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Unable to send proposal.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <ProviderEmptyState
        title="Proposal composer unavailable"
        body={error}
        ctaLabel="Back to leads"
        ctaTo="/profile/provider/leads"
      />
    );
  }

  if (!request || !draft) {
    return (
      <ProviderEmptyState
        title="Lead unavailable"
        body="The requested lead could not be loaded."
        ctaLabel="Back to leads"
        ctaTo="/profile/provider/leads"
      />
    );
  }

  if (staleState) {
    return (
      <ProviderEmptyState
        title={staleState.title}
        body={staleState.body}
        ctaLabel={proposal?.status === 'accepted' ? 'Open jobs' : 'Back to leads'}
        ctaTo={proposal?.status === 'accepted' ? '/profile/provider/jobs' : '/profile/provider/leads'}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ProviderPageHeader
        eyebrow="Proposal composer"
        title={proposal ? 'Edit proposal' : 'Create proposal'}
        description="Turn this scoped lead into a structured proposal with pricing, milestones, and clear delivery terms."
        actions={(
          <>
            <Link to={messageTo} className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary">
              Message client
            </Link>
            <Link to="/profile/provider/proposals" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary">
              Back to proposals
            </Link>
          </>
        )}
      />

      {error ? (
        <div className="rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <ProviderSurface>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Proposal essentials</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Scope, price, and revisions</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Proposal title</label>
                  <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className={fieldClassName} placeholder="Custom project proposal" />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Scope / cover letter</label>
                  <textarea value={draft.coverLetter} onChange={(event) => updateDraft('coverLetter', event.target.value)} className={`${fieldClassName} min-h-[160px]`} placeholder="Explain what you will deliver, how you will work, and what the client should expect." />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Total price</label>
                  <input type="number" min="0" value={draft.priceTotal} onChange={(event) => updateDraft('priceTotal', Number(event.target.value) || 0)} className={fieldClassName} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Currency</label>
                  <input value={draft.currency} onChange={(event) => updateDraft('currency', event.target.value.toUpperCase())} className={fieldClassName} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Delivery days</label>
                  <input type="number" min="1" value={draft.deliveryDays || 0} onChange={(event) => updateDraft('deliveryDays', Number(event.target.value) || undefined)} className={fieldClassName} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Revision limit</label>
                  <input type="number" min="0" value={draft.revisionLimit || 0} onChange={(event) => updateDraft('revisionLimit', Number(event.target.value) || 0)} className={fieldClassName} />
                </div>
              </div>
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Milestones</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Break the work into release points</h2>
                </div>
                <button type="button" onClick={addMilestone} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary">
                  Add milestone
                </button>
              </div>

              <div className="space-y-4">
                {draft.milestones.map((milestone, index) => (
                  <div key={`${milestone.title}-${index}`} className="rounded-[24px] border border-border bg-background/80 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-text-primary">Title</label>
                        <input value={milestone.title} onChange={(event) => updateMilestone(index, { title: event.target.value })} className={fieldClassName} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-text-primary">Amount</label>
                        <input type="number" min="0" value={milestone.amount} onChange={(event) => updateMilestone(index, { amount: Number(event.target.value) || 0 })} className={fieldClassName} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-text-primary">Description</label>
                        <textarea value={milestone.description || ''} onChange={(event) => updateMilestone(index, { description: event.target.value })} className={`${fieldClassName} min-h-[110px]`} />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button type="button" onClick={() => removeMilestone(index)} disabled={draft.milestones.length === 1} className="text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300">
                        Remove milestone
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Terms</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Clarify what is in and out</h2>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Scope summary</label>
                <textarea value={draft.terms.scopeSummary || ''} onChange={(event) => setDraft((current) => current ? { ...current, terms: { ...current.terms, scopeSummary: event.target.value } } : current)} className={`${fieldClassName} min-h-[120px]`} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {listFieldKeys.map((fieldKey) => (
                  <div key={fieldKey}>
                    <label className="mb-2 block text-sm font-semibold capitalize text-text-primary">
                      {String(fieldKey).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <textarea
                      value={toList(draft.terms[fieldKey] as string[])}
                      onChange={(event) => updateTermsList(fieldKey, event.target.value)}
                      className={`${fieldClassName} min-h-[130px]`}
                      placeholder="One line per item"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ProviderSurface>
        </div>

        <div className="space-y-5">
          <ProviderSurface>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Lead context</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">{request.title}</h2>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{request.brief}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                  Budget {formatMoney(request.budgetMax || request.budgetMin || 0, request.currency)}
                </span>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                  {request.category}
                </span>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                  {request.mode}
                </span>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                  {request.fulfillmentKind}
                </span>
              </div>

              {request.requirements?.length ? (
                <div>
                  <p className="text-sm font-semibold text-text-primary">Requirements</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                    {request.requirements.map((requirement) => (
                      <span key={requirement} className="rounded-full border border-border bg-background px-3 py-1.5">
                        {requirement}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Concierge guidance</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Use the scoped draft, then tighten it manually</h2>
              </div>

              <div className="grid gap-3 text-sm text-text-secondary">
                <div className="rounded-[20px] border border-border bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">AI confidence</p>
                  <p className="mt-2 text-lg font-black text-text-primary">
                    {request.details?.concierge?.scopeConfidence ? `${Math.round(request.details.concierge.scopeConfidence * 100)}%` : 'Manual lead'}
                  </p>
                </div>
                <div className="rounded-[20px] border border-border bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Suggested timeline</p>
                  <p className="mt-2 text-lg font-black text-text-primary">
                    {request.details?.concierge?.suggestedTimelineDays ? `${request.details.concierge.suggestedTimelineDays} days` : 'Not provided'}
                  </p>
                </div>
              </div>

              {request.details?.concierge?.suggestedMilestones?.length ? (
                <div className="rounded-[20px] border border-border bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Suggested milestones</p>
                  <div className="mt-3 space-y-3">
                    {request.details.concierge.suggestedMilestones.map((milestone) => (
                      <div key={milestone.title}>
                        <p className="text-sm font-semibold text-text-primary">{milestone.title}</p>
                        <p className="text-xs text-text-secondary">{milestone.amountPct}% of budget</p>
                        <p className="mt-1 text-sm text-text-secondary">{milestone.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Ready to send</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">One canonical proposal per lead</h2>
                </div>
              </div>

              <p className="text-sm leading-7 text-text-secondary">
                Sending from this screen creates the first proposal or updates the current one, then returns the lead to client review.
              </p>

              <button onClick={() => void handleSendProposal()} disabled={isSaving} className="w-full rounded-[22px] bg-primary px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Sending...' : proposal ? 'Resend proposal' : 'Send proposal'}
              </button>
            </div>
          </ProviderSurface>
        </div>
      </div>
    </div>
  );
};

export default ProviderProposalComposerPage;
