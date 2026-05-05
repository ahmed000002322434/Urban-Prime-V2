import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import proposalService from '../../../services/proposalService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import workService from '../../../services/workService';
import type { Proposal, WorkRequest } from '../../../types';
import { buildProposalMessagesLink, isProposalRequiredLead } from '../../../utils/proposalWorkflow';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatDateTime,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const ProviderLeadsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [leads, setLeads] = useState<WorkRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [leadRows, proposalRows] = await Promise.all([
        workService.getRequests({ targetProviderId: user.id, status: 'open', limit: 50 }),
        proposalService.getProviderProposals(user.id)
      ]);
      setLeads(leadRows);
      setProposals(proposalRows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const proposalByRequestId = useMemo(() => {
    const next = new Map<string, Proposal>();
    proposals.forEach((proposal) => {
      if (!proposal.requestId || next.has(proposal.requestId)) return;
      next.set(proposal.requestId, proposal);
    });
    return next;
  }, [proposals]);

  const acceptLead = async (leadId: string) => {
    setBusyId(leadId);
    try {
      await providerWorkspaceService.acceptLead(leadId);
      showNotification('Lead accepted and moved into jobs.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to accept lead.');
    } finally {
      setBusyId(null);
    }
  };

  const declineLead = async (leadId: string) => {
    setBusyId(leadId);
    try {
      await providerWorkspaceService.declineLead(leadId, 'Provider declined the request.');
      showNotification('Lead declined.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to decline lead.');
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

  if (!leads.length) {
    return (
      <ProviderEmptyState
        title="No open leads"
        body="Instant bookings and quote requests will land here for triage."
        ctaLabel="Open services"
        ctaTo="/profile/provider/services"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {leads.map((lead) => {
        const proposal = proposalByRequestId.get(lead.id);
        const requiresProposal = isProposalRequiredLead(lead);
        const messageTo = buildProposalMessagesLink(lead.requesterId, lead.listingId);
        const confidence = lead.details?.concierge?.scopeConfidence;

        return (
          <ProviderSurface key={lead.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">{lead.title}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(lead.requestType)}`}>
                    {formatStatus(lead.requestType || 'lead')}
                  </span>
                  {requiresProposal ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Proposal required
                    </span>
                  ) : null}
                </div>

                <p className="max-w-3xl text-sm text-text-secondary">{lead.brief}</p>

                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{formatMoney(lead.budgetMax || lead.budgetMin || 0, lead.currency)}</span>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{lead.category}</span>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{lead.fulfillmentKind}</span>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{lead.scheduledAt ? formatDateTime(lead.scheduledAt) : 'Flexible schedule'}</span>
                  {confidence ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
                      AI scope {Math.round(confidence * 100)}%
                    </span>
                  ) : null}
                </div>

                {lead.requirements?.length ? (
                  <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                    {lead.requirements.slice(0, 5).map((requirement) => (
                      <span key={`${lead.id}-${requirement}`} className="rounded-full border border-border bg-background px-3 py-1.5">
                        {requirement}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={`grid gap-2 ${requiresProposal ? 'sm:grid-cols-3 xl:w-[420px]' : 'sm:grid-cols-3 xl:w-[360px]'}`}>
                {requiresProposal ? (
                  <Link to={`/profile/provider/leads/${lead.id}/proposal`} className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                    {proposal ? 'Edit proposal' : 'Create proposal'}
                  </Link>
                ) : (
                  <button onClick={() => void acceptLead(lead.id)} disabled={busyId === lead.id} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {busyId === lead.id ? 'Working...' : 'Accept'}
                  </button>
                )}

                <button onClick={() => void declineLead(lead.id)} disabled={busyId === lead.id} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary disabled:opacity-60">
                  Decline
                </button>

                <Link to={messageTo} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Message
                </Link>
              </div>
            </div>
          </ProviderSurface>
        );
      })}
    </div>
  );
};

export default ProviderLeadsPage;
