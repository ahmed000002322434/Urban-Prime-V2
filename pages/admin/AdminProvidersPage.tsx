import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { auth } from '../../firebase';
import { useNotification } from '../../context/NotificationContext';
import { backendFetch, isBackendConfigured } from '../../services/backendClient';
import { providerApplicationService } from '../../services/providerWorkspaceService';
import workService from '../../services/workService';
import type { ProviderApplication, ProviderApplicationStatus, WorkListing } from '../../types';

const statusClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved' || normalized === 'published') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (normalized === 'submitted' || normalized === 'under_review' || normalized === 'pending_review') return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (normalized === 'rejected') return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return 'border-border bg-surface-soft text-text-secondary';
};

const toTitleCase = (value?: string) =>
  String(value || 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDateTime = (value?: string) => {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatMoney = (amount?: number, currency = 'USD') =>
  `${currency} ${Number(amount || 0).toLocaleString()}`;

const safeJoin = (values?: string[], fallback = 'Not specified') =>
  Array.isArray(values) && values.length > 0 ? values.join(', ') : fallback;

const getToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const getFirebaseUidHeader = () => {
  const firebaseUid = auth.currentUser?.uid;
  return firebaseUid ? { 'x-firebase-uid': firebaseUid } : {};
};

const toArray = <T,>(value?: T[] | null) => (Array.isArray(value) ? value : []);

const reviewRequiresLiveBackend = (payload: any) => {
  if (payload?.queued) {
    throw new Error('Admin moderation requires a live backend connection. The request was queued instead of being applied.');
  }
  return payload;
};

type ApplicationFilter = 'all' | ProviderApplicationStatus;
type ListingFilter = 'all' | 'pending_review' | 'published' | 'rejected';

const applicationFilters: ApplicationFilter[] = ['all', 'submitted', 'under_review', 'approved', 'rejected', 'draft', 'resubmission_requested'];
const listingFilters: ListingFilter[] = ['all', 'pending_review', 'published', 'rejected'];

const AdminProvidersPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [listings, setListings] = useState<WorkListing[]>([]);
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});
  const [listingNotes, setListingNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const [applicationRows, listingRows] = await Promise.all([
        providerApplicationService.listApplications({ limit: 200 }),
        workService.getListings({ limit: 200 })
      ]);
      setApplications(applicationRows);
      setListings(listingRows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => ({
    applications: applications.length,
    submitted: applications.filter((entry) => entry.status === 'submitted' || entry.status === 'under_review').length,
    approved: applications.filter((entry) => entry.status === 'approved').length,
    rejected: applications.filter((entry) => entry.status === 'rejected').length,
    pendingListings: listings.filter((entry) => entry.status === 'pending_review').length
  }), [applications, listings]);

  const visibleApplications = useMemo(() => {
    if (applicationFilter === 'all') return applications;
    return applications.filter((entry) => entry.status === applicationFilter);
  }, [applicationFilter, applications]);

  const visibleListings = useMemo(() => {
    if (listingFilter === 'all') return listings;
    return listings.filter((entry) => entry.status === listingFilter);
  }, [listingFilter, listings]);

  const reviewApplication = async (applicationId: string, status: 'approved' | 'rejected' | 'under_review') => {
    const note = String(applicationNotes[applicationId] || '').trim();
    const actionKey = `application:${applicationId}:${status}`;
    setProcessingKey(actionKey);
    try {
      if (isBackendConfigured()) {
        const token = await getToken();
        const payload = reviewRequiresLiveBackend(await backendFetch(`/work/provider-applications/${applicationId}`, {
          method: 'PATCH',
          headers: getFirebaseUidHeader(),
          body: JSON.stringify({
            status,
            reviewerNotes: note || null
          })
        }, token));
        if (!payload?.data?.id) {
          throw new Error('Provider application review did not return a saved record.');
        }
      } else {
        await providerApplicationService.reviewApplication(applicationId, status, note || undefined);
      }

      setApplicationNotes((current) => ({ ...current, [applicationId]: '' }));
      showNotification(`Application ${toTitleCase(status)}.`);
      await load();
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to update provider application.');
    } finally {
      setProcessingKey(null);
    }
  };

  const reviewListing = async (listingId: string, action: 'approve' | 'reject') => {
    const note = String(listingNotes[listingId] || '').trim();
    const actionKey = `listing:${listingId}:${action}`;
    setProcessingKey(actionKey);
    try {
      if (isBackendConfigured()) {
        const token = await getToken();
        const payload = reviewRequiresLiveBackend(await backendFetch(`/work/listings/${listingId}/${action}`, {
          method: 'POST',
          headers: getFirebaseUidHeader(),
          body: JSON.stringify({
            reviewNotes: note || (action === 'reject' ? 'Needs revision before publishing.' : null)
          })
        }, token));
        if (!payload?.data?.id) {
          throw new Error('Listing review did not return a saved record.');
        }
      } else if (action === 'approve') {
        await workService.approveListing(listingId, note || undefined);
      } else {
        await workService.rejectListing(listingId, note || 'Needs revision before publishing.');
      }

      setListingNotes((current) => ({ ...current, [listingId]: '' }));
      showNotification(`Listing ${action === 'approve' ? 'approved' : 'rejected'}.`);
      await load();
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to review listing.');
    } finally {
      setProcessingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_26%),linear-gradient(135deg,_rgba(11,20,38,0.98),_rgba(34,53,95,0.96)_50%,_rgba(10,16,29,0.98))] p-6 text-white shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">Admin moderation desk</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Review provider applications and service publishing with full context</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              This queue now shows the actual provider application payload, service proof, reviewer notes, and publishing metadata so approvals are fast and defensible.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Applications', value: stats.applications, note: 'All provider application records' },
              { label: 'Needs review', value: stats.submitted + stats.pendingListings, note: 'Applications and listings still waiting' },
              { label: 'Approved', value: stats.approved, note: 'Provider applications cleared' },
              { label: 'Rejected', value: stats.rejected, note: 'Applications needing revision' }
            ].map((entry) => (
              <div key={entry.label} className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{entry.label}</p>
                <p className="mt-2 text-3xl font-black">{entry.value}</p>
                <p className="mt-2 text-sm text-white/70">{entry.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Provider applications</h2>
            <p className="text-sm text-text-secondary">Every application now includes identity, scope, proof links, timeline, and moderation notes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {applicationFilters.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setApplicationFilter(entry)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${applicationFilter === entry ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-soft text-text-secondary'}`}
              >
                {toTitleCase(entry)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {visibleApplications.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-border bg-surface-soft p-6 text-sm text-text-secondary">
              No provider applications match the current filter.
            </div>
          ) : (
            visibleApplications.map((application) => (
              <div key={application.id} className="rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,246,255,0.88))] p-5 shadow-[0_16px_36px_rgba(140,126,180,0.05)] dark:bg-[linear-gradient(180deg,rgba(24,27,38,0.96),rgba(18,21,31,0.94))]">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={application.applicantAvatar || '/icons/urbanprime.svg'}
                          alt={application.applicantName || application.businessName || 'Provider'}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black tracking-tight text-text-primary">
                              {application.businessName || application.applicantName || 'Unnamed provider'}
                            </h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClass(application.status)}`}>
                              {toTitleCase(application.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {application.applicantName || 'Applicant not named'}{application.applicantEmail ? ` · ${application.applicantEmail}` : ''}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-text-secondary">
                            {application.bio || 'No bio supplied.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
                        <div className="rounded-2xl border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Submitted</p>
                          <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(application.submittedAt || application.createdAt)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Reviewed</p>
                          <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(application.reviewedAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: 'Business type', value: application.businessType || 'Not specified' },
                        { label: 'Experience', value: `${application.yearsExperience || 0} years` },
                        { label: 'Response SLA', value: `${application.responseSlaHours || 24} hrs` },
                        { label: 'Onboarding', value: `${application.onboardingProgress || 0}%` },
                        { label: 'Website', value: application.website || 'Not added' },
                        { label: 'Payout readiness', value: application.payoutReady ? 'Ready' : 'Pending' },
                        { label: 'Persona id', value: application.providerPersonaId || 'Not linked' },
                        { label: 'Applicant id', value: application.userId || 'Unknown user' }
                      ].map((entry) => (
                        <div key={entry.label} className="rounded-2xl border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{entry.label}</p>
                          <p className="mt-2 text-sm font-semibold text-text-primary break-words">{entry.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-border bg-background p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Service categories</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {toArray(application.serviceCategories).length > 0 ? toArray(application.serviceCategories).map((category) => (
                            <span key={category} className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                              {category}
                            </span>
                          )) : <span className="text-sm text-text-secondary">No categories submitted.</span>}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-border bg-background p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Coverage and languages</p>
                        <p className="mt-3 text-sm text-text-primary">
                          <span className="font-semibold">Languages:</span> {safeJoin(application.languages)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {toArray(application.serviceArea).length > 0 ? toArray(application.serviceArea).map((area, index) => (
                            <span key={`${area.label}-${index}`} className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-text-primary">
                              {area.label}
                            </span>
                          )) : <span className="text-sm text-text-secondary">No service area submitted.</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-border bg-background p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Documents</p>
                        <div className="mt-3 grid gap-2">
                          {toArray(application.documents).length > 0 ? toArray(application.documents).map((document) => (
                            <a
                              key={document.id}
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary transition hover:border-primary"
                            >
                              {document.label || 'Document'}{document.status ? ` · ${toTitleCase(document.status)}` : ''}
                            </a>
                          )) : <p className="text-sm text-text-secondary">No proof documents attached.</p>}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-border bg-background p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Portfolio proof</p>
                        <div className="mt-3 grid gap-2">
                          {toArray(application.portfolio).length > 0 ? toArray(application.portfolio).map((item) => (
                            <a
                              key={item.id}
                              href={item.link || item.imageUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary transition hover:border-primary"
                            >
                              {item.title || 'Portfolio item'}
                            </a>
                          )) : <p className="text-sm text-text-secondary">No portfolio items submitted.</p>}
                        </div>
                      </div>
                    </div>

                    {application.notes || application.reviewerNotes ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Applicant notes</p>
                          <p className="mt-3 text-sm leading-7 text-text-primary">{application.notes || 'No internal notes supplied.'}</p>
                        </div>
                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Reviewer notes</p>
                          <p className="mt-3 text-sm leading-7 text-text-primary">{application.reviewerNotes || 'No reviewer notes recorded.'}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[26px] border border-border bg-background p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review actions</p>
                    <h4 className="mt-2 text-lg font-black tracking-tight text-text-primary">Approve, hold, or reject with context</h4>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Add moderation guidance so the provider knows exactly what changed or what still blocks approval.
                    </p>

                    <textarea
                      value={applicationNotes[application.id] || ''}
                      onChange={(event) => setApplicationNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                      rows={5}
                      placeholder="Reviewer note for approval, hold, or rejection..."
                      className="mt-4 w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewApplication(application.id, 'under_review')}
                        disabled={processingKey === `application:${application.id}:under_review`}
                        className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary disabled:opacity-60"
                      >
                        {processingKey === `application:${application.id}:under_review` ? 'Saving...' : 'Mark under review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewApplication(application.id, 'approved')}
                        disabled={processingKey === `application:${application.id}:approved`}
                        className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {processingKey === `application:${application.id}:approved` ? 'Approving...' : 'Approve provider'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewApplication(application.id, 'rejected')}
                        disabled={processingKey === `application:${application.id}:rejected`}
                        className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                      >
                        {processingKey === `application:${application.id}:rejected` ? 'Rejecting...' : 'Reject application'}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {application.userId ? (
                        <Link to={`/providers/${application.userId}`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                          Public storefront
                        </Link>
                      ) : null}
                      {application.userId ? (
                        <Link to={`/user/${application.userId}`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                          User profile
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Service moderation queue</h2>
            <p className="text-sm text-text-secondary">Review every service listing with pricing, delivery mode, portfolio proof, policy summary, and action notes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {listingFilters.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setListingFilter(entry)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${listingFilter === entry ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-soft text-text-secondary'}`}
              >
                {toTitleCase(entry)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {visibleListings.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-border bg-surface-soft p-6 text-sm text-text-secondary">
              No service listings match the current filter.
            </div>
          ) : (
            visibleListings.map((listing) => {
              const details = listing.details || {};
              const availability = listing.availability || {};
              const packages = toArray(listing.packages);
              const policies = details.policies || {};
              const portfolio = toArray(details.portfolio);

              return (
                <div key={listing.id} className="rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,246,255,0.88))] p-5 shadow-[0_16px_36px_rgba(140,126,180,0.05)] dark:bg-[linear-gradient(180deg,rgba(24,27,38,0.96),rgba(18,21,31,0.94))]">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">
                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <img src={listing.media?.[0] || '/icons/urbanprime.svg'} alt={listing.title} className="h-16 w-16 rounded-2xl object-cover" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black tracking-tight text-text-primary">{listing.title}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClass(listing.status)}`}>
                                {toTitleCase(listing.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-text-secondary">
                              {listing.providerSnapshot?.name || 'Provider'} · {formatMoney(listing.basePrice || packages[0]?.price || 0, listing.currency)}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-text-secondary">{listing.description || 'No description supplied.'}</p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
                          <div className="rounded-2xl border border-border bg-background p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Submitted</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(listing.submittedAt || listing.createdAt)}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Last review</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(listing.reviewedAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: 'Category', value: listing.category || 'General' },
                          { label: 'Mode', value: toTitleCase(listing.mode || 'hybrid') },
                          { label: 'Fulfillment', value: toTitleCase(listing.fulfillmentKind || 'hybrid') },
                          { label: 'Timezone', value: listing.timezone || availability.timezone || 'Not set' },
                          { label: 'Lead time', value: `${availability.leadTimeHours || 24} hrs` },
                          { label: 'Languages', value: safeJoin(details.languages, 'Not specified') },
                          { label: 'Response SLA', value: `${details.responseSlaHours || 24} hrs` },
                          { label: 'Packages', value: String(packages.length || 0) }
                        ].map((entry) => (
                          <div key={entry.label} className="rounded-2xl border border-border bg-background p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{entry.label}</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary break-words">{entry.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Packages and pricing</p>
                          <div className="mt-3 grid gap-2">
                            {packages.length > 0 ? packages.map((pkg) => (
                              <div key={pkg.id} className="rounded-2xl border border-border bg-surface-soft p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-text-primary">{pkg.name}</p>
                                  <span className="text-sm font-black text-text-primary">{formatMoney(pkg.price, pkg.currency || listing.currency)}</span>
                                </div>
                                <p className="mt-2 text-sm text-text-secondary">{pkg.description || 'No package description.'}</p>
                                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-secondary">
                                  {toTitleCase(pkg.type)}{pkg.deliveryDays ? ` · ${pkg.deliveryDays} days` : ''}{pkg.revisions ? ` · ${pkg.revisions} revisions` : ''}
                                </p>
                              </div>
                            )) : <p className="text-sm text-text-secondary">No package rows were submitted.</p>}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Coverage and buyer trust</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {toArray(availability.serviceArea).length > 0 ? toArray(availability.serviceArea).map((area, index) => (
                              <span key={`${area.label}-${index}`} className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-text-primary">
                                {area.label}
                              </span>
                            )) : <span className="text-sm text-text-secondary">No service area submitted.</span>}
                          </div>
                          <div className="mt-4 grid gap-2">
                            <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-primary">
                              <span className="font-semibold">Instant booking:</span> {details.instantBookingEnabled ? 'Enabled' : 'Disabled'}
                            </div>
                            <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-primary">
                              <span className="font-semibold">Quote flow:</span> {details.quoteEnabled ? 'Enabled' : 'Disabled'}
                            </div>
                            <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-primary">
                              <span className="font-semibold">Availability notes:</span> {availability.notes || 'No scheduling note supplied.'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Portfolio and media</p>
                          <div className="mt-3 grid gap-2">
                            {[...toArray(listing.media).map((url, index) => ({ id: `media-${index}`, title: `Media ${index + 1}`, href: url })), ...portfolio.map((item) => ({ id: item.id, title: item.title || 'Portfolio item', href: item.link || item.imageUrl || '' }))].length > 0 ? (
                              [...toArray(listing.media).map((url, index) => ({ id: `media-${index}`, title: `Media ${index + 1}`, href: url })), ...portfolio.map((item) => ({ id: item.id, title: item.title || 'Portfolio item', href: item.link || item.imageUrl || '' }))].map((item) => (
                                <a
                                  key={item.id}
                                  href={item.href || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary transition hover:border-primary"
                                >
                                  {item.title}
                                </a>
                              ))
                            ) : (
                              <p className="text-sm text-text-secondary">No media or portfolio proof attached.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-border bg-background p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Policies and FAQs</p>
                          <div className="mt-3 grid gap-2">
                            {[
                              { label: 'Cancellation', value: policies.cancellation || 'Not specified' },
                              { label: 'Revisions', value: policies.revisions || 'Not specified' },
                              { label: 'Reschedule', value: policies.reschedule || 'Not specified' },
                              { label: 'Delivery', value: policies.delivery || 'Not specified' },
                              { label: 'FAQs', value: `${toArray(details.faqs).length} entries` }
                            ].map((entry) => (
                              <div key={entry.label} className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-primary">
                                <span className="font-semibold">{entry.label}:</span> {entry.value}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {listing.reviewNotes ? (
                        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                          Review notes: {listing.reviewNotes}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[26px] border border-border bg-background p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Publishing actions</p>
                      <h4 className="mt-2 text-lg font-black tracking-tight text-text-primary">Moderate the storefront version</h4>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        Use review notes for revision guidance, then approve or reject the listing from the canonical work queue.
                      </p>

                      <textarea
                        value={listingNotes[listing.id] || ''}
                        onChange={(event) => setListingNotes((current) => ({ ...current, [listing.id]: event.target.value }))}
                        rows={5}
                        placeholder="Review note for publishing or rejection..."
                        className="mt-4 w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />

                      <div className="mt-4 grid gap-2">
                        <button
                          type="button"
                          onClick={() => void reviewListing(listing.id, 'approve')}
                          disabled={processingKey === `listing:${listing.id}:approve`}
                          className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {processingKey === `listing:${listing.id}:approve` ? 'Approving...' : 'Approve listing'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void reviewListing(listing.id, 'reject')}
                          disabled={processingKey === `listing:${listing.id}:reject`}
                          className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                        >
                          {processingKey === `listing:${listing.id}:reject` ? 'Rejecting...' : 'Reject listing'}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Link to={`/service/${listing.id}`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                          Preview service
                        </Link>
                        {listing.sellerId ? (
                          <Link to={`/providers/${listing.sellerId}`} className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary">
                            Provider page
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminProvidersPage;
