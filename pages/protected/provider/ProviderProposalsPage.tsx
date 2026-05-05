import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import proposalService from '../../../services/proposalService';
import workService from '../../../services/workService';
import type { Proposal, WorkRequest } from '../../../types';
import { buildProposalMessagesLink, getProposalQueueGroup } from '../../../utils/proposalWorkflow';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatDateTime,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const queueOrder = ['pending', 'accepted', 'declined'] as const;

const queueCopy: Record<(typeof queueOrder)[number], { title: string; body: string }> = {
  pending: {
    title: 'Pending client review',
    body: 'These proposals are waiting on the buyer. Keep the scope clear and the next reply close.'
  },
  accepted: {
    title: 'Accepted proposals',
    body: 'These quotes converted into active work and should move straight into delivery.'
  },
  declined: {
    title: 'Declined or stale',
    body: 'Use these as revision candidates when the client needs a tighter scope, price, or handoff plan.'
  }
};

const ProviderProposalsPage: React.FC = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [requestsById, setRequestsById] = useState<Record<string, WorkRequest>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [proposalRows, requestRows] = await Promise.all([
          proposalService.getProviderProposals(user.id),
          workService.getRequests({ targetProviderId: user.id, limit: 200 })
        ]);
        if (cancelled) return;
        setProposals(proposalRows);
        setRequestsById(Object.fromEntries(requestRows.map((request) => [request.id, request])));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
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
        body="Proposal-based services and quote replies will appear here once clients request scoped work."
        ctaLabel="View leads"
        ctaTo="/profile/provider/leads"
      />
    );
  }

  return (
    <div className="space-y-5">
      {queueOrder.map((groupKey) => {
        const rows = groupedProposals[groupKey];
        if (!rows.length) return null;

        return (
          <section key={groupKey} className="space-y-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-primary">{queueCopy[groupKey].title}</h2>
              <p className="mt-1 text-sm text-text-secondary">{queueCopy[groupKey].body}</p>
            </div>

            <div className="grid gap-4">
              {rows.map((proposal) => {
                const request = proposal.requestId ? requestsById[proposal.requestId] : undefined;
                const messageTo = buildProposalMessagesLink(proposal.clientId, proposal.listingId || request?.listingId);
                const editTo = `/profile/provider/proposals/${proposal.id}/edit`;

                return (
                  <ProviderSurface key={proposal.id}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-text-primary">{proposal.title}</h2>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(proposal.status)}`}>
                            {formatStatus(proposal.status)}
                          </span>
                          {request ? (
                            <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                              Lead {formatStatus(request.status)}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">
                            Buyer {proposal.clientSnapshot?.name || 'Client'}
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

                        <p className="max-w-3xl text-sm text-text-secondary">{proposal.coverLetter || request?.brief || 'No proposal summary provided.'}</p>

                        {request ? (
                          <div className="rounded-[22px] border border-border bg-background/80 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Linked lead</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary">{request.title}</p>
                            <p className="mt-1 text-sm text-text-secondary">{request.brief}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:w-[320px]">
                        {proposal.status === 'accepted' ? (
                          <Link to="/profile/provider/jobs" className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                            Open jobs
                          </Link>
                        ) : (
                          <Link to={editTo} className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                            Edit proposal
                          </Link>
                        )}

                        <Link to={messageTo} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                          Message client
                        </Link>

                        {proposal.status === 'declined' ? (
                          <Link to={editTo} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary sm:col-span-2">
                            Resend proposal
                          </Link>
                        ) : null}
                      </div>
                    </div>
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

export default ProviderProposalsPage;
