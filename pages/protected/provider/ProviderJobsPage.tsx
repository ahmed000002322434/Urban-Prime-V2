import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import contractService from '../../../services/contractService';
import type { Contract } from '../../../types';
import {
  ProviderEmptyState,
  ProviderSurface,
  formatDateTime,
  formatMoney,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const ProviderJobsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const rows = await contractService.getContracts({ providerId: user.id, limit: 100 });
      setContracts(rows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const grouped = useMemo(() => ({
    active: contracts.filter((entry) => ['pending', 'active', 'disputed'].includes(entry.status)),
    completed: contracts.filter((entry) => entry.status === 'completed'),
    cancelled: contracts.filter((entry) => entry.status === 'cancelled')
  }), [contracts]);

  const completeJob = async (contractId: string) => {
    setBusyId(contractId);
    try {
      await contractService.completeContract(contractId);
      showNotification('Contract marked complete.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to complete contract.');
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

  if (!contracts.length) {
    return (
      <ProviderEmptyState
        title="No contracts yet"
        body="Accepted instant bookings and approved proposals will create active jobs here."
        ctaLabel="Check leads"
        ctaTo="/profile/provider/leads"
      />
    );
  }

  return (
    <div className="space-y-6">
      {([
        { label: 'Active and pending', items: grouped.active },
        { label: 'Completed', items: grouped.completed },
        { label: 'Cancelled', items: grouped.cancelled }
      ]).map((section) => (
        <ProviderSurface key={section.label}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{section.label}</h2>
              <p className="text-sm text-text-secondary">{section.items.length} contracts in this stage.</p>
            </div>
          </div>
          {section.items.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">Nothing in this state right now.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {section.items.map((contract) => (
                <div key={contract.id} className="rounded-3xl border border-border bg-surface-soft p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">{contract.scope || 'Service engagement'}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(contract.status)}`}>
                          {formatStatus(contract.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                        <span className="rounded-full border border-border bg-background px-3 py-1.5">{formatMoney(contract.totalAmount, contract.currency)}</span>
                        <span className="rounded-full border border-border bg-background px-3 py-1.5">Due {formatDateTime(contract.dueAt)}</span>
                        <span className="rounded-full border border-border bg-background px-3 py-1.5">Escrow {formatMoney(contract.escrowHeld || 0, contract.currency)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:w-[260px]">
                      {section.label === 'Active and pending' ? (
                        <button onClick={() => void completeJob(contract.id)} disabled={busyId === contract.id} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                          {busyId === contract.id ? 'Working...' : 'Mark complete'}
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-secondary">
                          {formatStatus(contract.status)}
                        </div>
                      )}
                      <a href="/profile/disputes" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                        Disputes
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProviderSurface>
      ))}
    </div>
  );
};

export default ProviderJobsPage;
