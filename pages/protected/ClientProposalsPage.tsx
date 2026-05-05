import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import proposalService from '../../services/proposalService';
import workService from '../../services/workService';
import type { Proposal, ProposalTerms, WorkRequest } from '../../types';
import { buildProposalMessagesLink, getProposalQueueGroup } from '../../utils/proposalWorkflow';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatDateTime,
  formatMoney,
  formatStatus,
  statusPillClass
} from './provider/providerWorkspaceUi';

const queueOrder = ['pending', 'accepted', 'declined'] as const;

const queueHeadings: Record<(typeof queueOrder)[number], string> = {
  pending: 'Action required',
  accepted: 'Accepted',
  declined: 'Declined'
};

const renderList = (items?: string[] | null) => {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-border bg-background px-3 py-1.5">
          {item}
        </span>
      ))}
    </div>
  );
};

const ClientProposalsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [requestsById, setRequestsById] = useState<Record<string, WorkRequest>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineDraftId, setDeclineDraftId] = useState<string | null>(null);
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});
  const [acceptedProposalId, setAcceptedProposalId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [proposalRows, requestRows] = await Promise.all([
        proposalService.getClientProposals(user.id),
        workService.getRequests({ requesterId: user.id, limit: 200 })
      ]);
      setProposals(proposalRows);
      setRequestsById(Object.fromEntries(requestRows.map((request) => [request.id, request])));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const groupedProposals = useMemo(() => {
    const groups: Record<(typeof queueOrder)[number], Proposal[]> = {
      pending: [],
      accepted: [],
      declined: []
    };
    proposals.forEach((proposal) => {
      groups[getProposalQueueGroup(proposal.status)].push(proposal);
    });
    return groups;
  }, [proposals]);

  const handleAccept = async (proposalId: string) => {
    setBusyId(proposalId);
    try {
      await proposalService.acceptProposal(proposalId);
      setAcceptedProposalId(proposalId);
      showNotification('Proposal accepted and moved into active work.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to accept proposal.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (proposalId: string) => {
    setBusyId(proposalId);
    try {
      await proposalService.declineProposal(proposalId, declineReasons[proposalId]);
      setDeclineDraftId(null);
      showNotification('Proposal declined. The provider can now revise and resend.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to decline proposal.');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!proposals.length) {
    return (
      <ProviderEmptyState
        title="No proposals yet"
        body="Custom quotes and concierge responses will appear here once providers reply with scoped proposals."
        ctaLabel="Explore services"
        ctaTo="/services/marketplace"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Proposal inbox</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Review custom offers before they become active work</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
          This inbox stays separate from chat so scope, milestones, and acceptance decisions are readable in one place.
        </p>
      </div>

      {queueOrder.map((groupKey) => {
        const rows = groupedProposals[groupKey];
        if (!rows.length) return null;

        return (
          <section key={groupKey} className="space-y-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-primary">{queueHeadings[groupKey]}</h2>
              <p className="mt-1 text-sm text-text-secondary">{rows.length} proposal{rows.length === 1 ? '' : 's'}</p>
            </div>

            <div className="grid gap-4">
              {rows.map((proposal) => {
                const request = proposal.requestId ? requestsById[proposal.requestId] : undefined;
                const terms = (proposal.terms || {}) as ProposalTerms;
                const messageTo = buildProposalMessagesLink(proposal.providerId, proposal.listingId || request?.listingId);
                const isBusy = busyId === proposal.id;

                return (
                  <ProviderSurface key={proposal.id}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-text-primary">{proposal.title}</h2>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(proposal.status)}`}>
                            {formatStatus(proposal.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            Provider {proposal.providerSnapshot?.name || 'Provider'}
                          </span>
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            {formatMoney(proposal.priceTotal, proposal.currency)}
                          </span>
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            {proposal.deliveryDays || 0} delivery days
                          </span>
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            {proposal.milestones?.length || 0} milestones
                          </span>
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            Updated {formatDateTime(proposal.updatedAt || proposal.createdAt)}
                          </span>
                        </div>

                        {proposal.listingId ? (
                          <div className="flex flex-wrap gap-3 text-sm">
                            <Link to={`/providers/${proposal.providerId}`} className="font-semibold text-primary">
                              View provider storefront
                            </Link>
                            <Link to={`/service/${proposal.listingId}`} className="font-semibold text-primary">
                              Open linked service
                            </Link>
                          </div>
                        ) : (
                          <Link to={`/providers/${proposal.providerId}`} className="inline-flex text-sm font-semibold text-primary">
                            View provider storefront
                          </Link>
                        )}

                        <div className="rounded-[22px] border border-border bg-background/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Scoped summary</p>
                          <p className="mt-2 text-sm text-text-primary">{terms.scopeSummary || proposal.coverLetter || request?.brief || 'No scope summary provided.'}</p>
                        </div>

                        {proposal.milestones?.length ? (
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Milestones</p>
                            <div className="mt-3 grid gap-3">
                              {proposal.milestones.map((milestone, index) => (
                                <div key={`${proposal.id}-milestone-${index}`} className="rounded-[18px] border border-border bg-surface p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-text-primary">{milestone.title}</p>
                                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
                                      {formatMoney(milestone.amount, proposal.currency)}
                                    </span>
                                  </div>
                                  {milestone.description ? (
                                    <p className="mt-2 text-sm text-text-secondary">{milestone.description}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Included</p>
                            {renderList(terms.included)}
                          </div>
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Excluded</p>
                            {renderList(terms.excluded)}
                          </div>
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Client responsibilities</p>
                            {renderList(terms.clientResponsibilities)}
                          </div>
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Handoff items</p>
                            {renderList(terms.handoffItems)}
                          </div>
                        </div>

                        {acceptedProposalId === proposal.id && proposal.status === 'accepted' ? (
                          <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                            Proposal accepted. Continue in shared messages or check your active workspaces.
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:w-[320px]">
                        {proposal.status === 'pending' ? (
                          <>
                            <button onClick={() => void handleAccept(proposal.id)} disabled={isBusy} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                              {isBusy ? 'Working...' : 'Accept'}
                            </button>
                            <button onClick={() => setDeclineDraftId((current) => current === proposal.id ? null : proposal.id)} disabled={isBusy} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary disabled:opacity-60">
                              Decline
                            </button>
                          </>
                        ) : null}

                        <Link to={messageTo} className={`rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary ${proposal.status !== 'pending' ? 'sm:col-span-2' : ''}`}>
                          Message provider
                        </Link>

                        {acceptedProposalId === proposal.id && proposal.status === 'accepted' ? (
                          <Link to={messageTo} className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white sm:col-span-2">
                            Open shared messages
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {declineDraftId === proposal.id ? (
                      <div className="mt-4 rounded-[22px] border border-border bg-background/80 p-4">
                        <label className="mb-2 block text-sm font-semibold text-text-primary">Optional decline reason</label>
                        <textarea
                          value={declineReasons[proposal.id] || ''}
                          onChange={(event) => setDeclineReasons((current) => ({ ...current, [proposal.id]: event.target.value }))}
                          className="min-h-[120px] w-full rounded-[18px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                          placeholder="Tell the provider what should change before they resend."
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => void handleDecline(proposal.id)} disabled={isBusy} className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                            {isBusy ? 'Declining...' : 'Confirm decline'}
                          </button>
                          <button onClick={() => setDeclineDraftId(null)} type="button" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </ProviderSurface>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ClientProposalsPage;
