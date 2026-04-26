import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import contractService from '../../../services/contractService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import type { Contract, ProviderWorkspaceSummary } from '../../../types';
import { ProviderEmptyState, ProviderStatCard, ProviderSurface, formatDateTime, formatMoney } from './providerWorkspaceUi';

const ProviderEarningsPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProviderWorkspaceSummary | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [summaryRow, contractRows] = await Promise.all([
          providerWorkspaceService.getWorkspaceSummary().catch(() => null),
          contractService.getContracts({ providerId: user.id, limit: 100 }).catch(() => [])
        ]);
        if (cancelled) return;
        setSummary(summaryRow);
        setContracts(contractRows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const completed = useMemo(() => contracts.filter((entry) => entry.status === 'completed'), [contracts]);
  const averageTicket = completed.length ? completed.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0) / completed.length : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <ProviderEmptyState title="No earnings data yet" body="Completed contracts and escrow releases will populate this ledger." ctaLabel="Go to jobs" ctaTo="/profile/provider/jobs" />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProviderStatCard label="Total earnings" value={formatMoney(summary.stats.earnings)} />
        <ProviderStatCard label="Available" value={formatMoney(summary.payouts.available)} />
        <ProviderStatCard label="Released escrow" value={formatMoney(summary.escrow.released)} />
        <ProviderStatCard label="Average contract" value={formatMoney(averageTicket)} />
      </section>

      <ProviderSurface>
        <h2 className="text-lg font-bold text-text-primary">Completed contracts</h2>
        {completed.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">Completed work will appear here once contracts close out.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {completed.map((contract) => (
              <div key={contract.id} className="rounded-3xl border border-border bg-surface-soft p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{contract.scope || 'Completed service engagement'}</p>
                    <p className="mt-1 text-sm text-text-secondary">Completed {formatDateTime(contract.completedAt || contract.updatedAt || contract.createdAt)}</p>
                  </div>
                  <p className="text-lg font-black text-text-primary">{formatMoney(contract.totalAmount, contract.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProviderSurface>
    </div>
  );
};

export default ProviderEarningsPage;
