import React, { useEffect, useMemo, useState } from 'react';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import podMarketplaceService from '../../../services/podMarketplaceService';
import type { PodJob, PodJobStatus } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const statuses: PodJobStatus[] = [
  'queued',
  'reviewing',
  'in_production',
  'printed',
  'packed',
  'shipped',
  'completed',
  'cancelled'
];

const PODOrdersPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [jobs, setJobs] = useState<PodJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await podMarketplaceService.getJobs();
        if (!cancelled) setJobs(response);
      } catch (error) {
        console.error('POD jobs load failed:', error);
        if (!cancelled) showNotification('Unable to load the POD job queue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const queueGroups = useMemo(
    () =>
      ['queued', 'reviewing', 'in_production', 'printed', 'packed', 'shipped', 'completed', 'cancelled'].map((status) => ({
        status,
        jobs: jobs.filter((job) => job.status === status)
      })),
    [jobs]
  );

  const updateJob = async (job: PodJob, patch: Partial<Pick<PodJob, 'status' | 'trackingNumber' | 'carrier' | 'notes'>>) => {
    setBusyJobId(job.id);
    try {
      const updated = await podMarketplaceService.updateJob(job.id, patch);
      setJobs((prev) => prev.map((entry) => (entry.id === job.id ? updated : entry)));
      showNotification('POD job updated.');
    } catch (error) {
      console.error('POD job update failed:', error);
      showNotification(error instanceof Error ? error.message : 'Unable to update POD job.');
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <PODStudioLayout
      eyebrow="Orders Queue"
      title="Move POD jobs from review to packed, shipped, and complete."
      description="This queue is manual POD v1. Seller actions here sync back to buyer and seller order detail pages."
      stats={[
        { label: 'Queue', value: String(jobs.filter((job) => !['completed', 'cancelled'].includes(job.status)).length), detail: 'Open jobs' },
        { label: 'Shipped', value: String(jobs.filter((job) => job.status === 'shipped').length), detail: 'Tracking attached' },
        { label: 'Completed', value: String(jobs.filter((job) => job.status === 'completed').length), detail: 'Buyer-ready orders' }
      ]}
    >
      <section className="pod-panel">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-4">
              {queueGroups.slice(0, 4).map((group) => (
                <div key={group.status} className="pod-kanban-column">
                  <div className="flex items-center justify-between gap-3">
                    <p className="pod-step-label">{group.status}</p>
                    <span className="pod-badge">{group.jobs.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.jobs.map((job) => (
                      <div key={job.id} className="pod-kanban-card">
                        <p className="text-sm font-black text-white">{job.itemTitle}</p>
                        <p className="mt-1 text-xs text-white/56">
                          {job.buyerName || 'Buyer'} {job.variantSnapshot?.color ? `- ${job.variantSnapshot.color}` : ''}
                          {job.variantSnapshot?.size ? ` / ${job.variantSnapshot.size}` : ''}
                        </p>
                        <button
                          type="button"
                          className="pod-button secondary mt-3"
                          onClick={() =>
                            void updateJob(job, {
                              status:
                                statuses[Math.min(statuses.indexOf(group.status as PodJobStatus) + 1, statuses.length - 1)] ||
                                job.status
                            })
                          }
                          disabled={busyJobId === job.id || ['completed', 'cancelled'].includes(job.status)}
                        >
                          Advance
                        </button>
                      </div>
                    ))}
                    {!group.jobs.length ? <div className="pod-kanban-empty">No jobs</div> : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              {queueGroups.slice(4).map((group) => (
                <div key={group.status} className="pod-kanban-column">
                  <div className="flex items-center justify-between gap-3">
                    <p className="pod-step-label">{group.status}</p>
                    <span className="pod-badge">{group.jobs.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.jobs.map((job) => (
                      <div key={job.id} className="pod-kanban-card">
                        <p className="text-sm font-black text-white">{job.itemTitle}</p>
                        <p className="mt-1 text-xs text-white/56">{job.buyerName || 'Buyer'}</p>
                        {!group.jobs.length ? null : <span className="pod-badge mt-3 inline-flex">{job.status}</span>}
                      </div>
                    ))}
                    {!group.jobs.length ? <div className="pod-kanban-empty">No jobs</div> : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="pod-orders-table">
              {(jobs || []).map((job) => (
                <div key={job.id} className="pod-order-row">
                  <div>
                    <p className="text-sm font-black text-white">{job.itemTitle}</p>
                    <p className="text-xs text-white/56">
                      {job.buyerName || 'Buyer'} {job.buyerCity ? `- ${job.buyerCity}` : ''}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <select
                      className="pod-select"
                      value={job.status}
                      onChange={(event) => void updateJob(job, { status: event.target.value as PodJobStatus })}
                      disabled={busyJobId === job.id}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      className="pod-input"
                      placeholder="Carrier"
                      defaultValue={job.carrier || ''}
                      onBlur={(event) => void updateJob(job, { carrier: event.target.value })}
                      disabled={busyJobId === job.id}
                    />
                    <input
                      className="pod-input"
                      placeholder="Tracking"
                      defaultValue={job.trackingNumber || ''}
                      onBlur={(event) => void updateJob(job, { trackingNumber: event.target.value })}
                      disabled={busyJobId === job.id}
                    />
                    <input
                      className="pod-input"
                      placeholder="Notes"
                      defaultValue={job.notes || ''}
                      onBlur={(event) => void updateJob(job, { notes: event.target.value })}
                      disabled={busyJobId === job.id}
                    />
                  </div>
                </div>
              ))}
              {!jobs.length ? (
                <p className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-5 py-10 text-sm text-white/64">
                  No POD jobs yet. Paid POD checkouts create one production job per order item automatically.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </PODStudioLayout>
  );
};

export default PODOrdersPage;
