import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import proposalService from '../../../services/proposalService';
import type { Proposal } from '../../../types';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const ProviderProposalsPage: React.FC = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const rows = await proposalService.getProviderProposals(user.id);
        if (!cancelled) setProposals(rows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    <div className="grid gap-4">
      {proposals.map((proposal) => (
        <ProviderSurface key={proposal.id}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">{proposal.title}</h2>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(proposal.status)}`}>
                  {formatStatus(proposal.status)}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-text-secondary">{proposal.coverLetter || 'No cover letter provided.'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{formatMoney(proposal.priceTotal, proposal.currency)}</span>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{proposal.deliveryDays || 0} delivery days</span>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5">{proposal.milestones?.length || 0} milestones</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:w-[240px]">
              <Link to="/profile/messages" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                Client chat
              </Link>
              <Link to="/profile/provider/jobs" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                Jobs
              </Link>
            </div>
          </div>
        </ProviderSurface>
      ))}
    </div>
  );
};

export default ProviderProposalsPage;
