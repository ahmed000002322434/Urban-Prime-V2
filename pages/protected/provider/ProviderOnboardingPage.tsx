import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import { HIERARCHICAL_SERVICE_CATEGORIES } from '../../../constants';
import { providerApplicationService } from '../../../services/providerWorkspaceService';
import type { ProviderApplication, ProviderApplicationStatus, WorkPortfolioItem, WorkServiceAreaCoverage } from '../../../types';
import { ProviderPageHeader, ProviderSurface, formatStatus, statusPillClass } from './providerWorkspaceUi';

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatStatusBody = (status?: ProviderApplicationStatus) => {
  switch (status) {
    case 'approved':
      return 'Your provider application is approved. The provider workspace and public storefront are ready.';
    case 'rejected':
      return 'Your application needs revisions. Update the details below and resubmit with clearer trust signals.';
    case 'under_review':
      return 'Your application is in review. Publishing and provider access stay locked until approval.';
    case 'submitted':
      return 'Your application has been submitted and is queued for review.';
    case 'resubmission_requested':
      return 'Admin review requested revisions. Update the details and submit again.';
    default:
      return 'Complete the provider onboarding flow to unlock moderated service publishing and the provider workspace.';
  }
};

const categoryOptions = HIERARCHICAL_SERVICE_CATEGORIES.flatMap((category) => category.subcategories || []);

const ProviderOnboardingPage: React.FC = () => {
  const { user, hasCapability } = useAuth();
  const { showNotification } = useNotification();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    bio: '',
    serviceCategories: [] as string[],
    languages: '',
    yearsExperience: '0',
    serviceArea: '',
    responseSlaHours: '24',
    website: '',
    payoutReady: false,
    documents: '',
    portfolio: ''
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const existing = await providerApplicationService.getMyApplication(user?.id);
        if (cancelled) return;
        setApplication(existing || null);
        if (existing) {
          setForm({
            businessName: existing.businessName || '',
            businessType: existing.businessType || '',
            bio: existing.bio || '',
            serviceCategories: existing.serviceCategories || [],
            languages: (existing.languages || []).join(', '),
            yearsExperience: String(existing.yearsExperience || 0),
            serviceArea: (existing.serviceArea || []).map((entry) => entry.label).join(', '),
            responseSlaHours: String(existing.responseSlaHours || 24),
            website: existing.website || '',
            payoutReady: Boolean(existing.payoutReady),
            documents: (existing.documents || []).map((entry) => entry.url).join('\n'),
            portfolio: (existing.portfolio || []).map((entry) => entry.imageUrl || entry.link || '').filter(Boolean).join('\n')
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onboardingProgress = useMemo(() => {
    const checks = [
      form.businessName,
      form.bio,
      form.serviceCategories.length > 0 ? 'ok' : '',
      form.serviceArea,
      form.documents,
      form.payoutReady ? 'ok' : ''
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [form]);

  const handleToggleCategory = (value: string) => {
    setForm((current) => ({
      ...current,
      serviceCategories: current.serviceCategories.includes(value)
        ? current.serviceCategories.filter((entry) => entry !== value)
        : [...current.serviceCategories, value]
    }));
  };

  const save = async (submit: boolean) => {
    setIsSaving(true);
    try {
      const serviceArea: WorkServiceAreaCoverage[] = splitCsv(form.serviceArea).map((entry) => ({
        kind: 'custom',
        label: entry
      }));
      const documents = form.documents
        .split('\n')
        .map((entry, index) => entry.trim())
        .filter(Boolean)
        .map((url, index) => ({
          id: `doc-${index + 1}`,
          label: `Document ${index + 1}`,
          url,
          status: 'submitted' as const
        }));
      const portfolio: WorkPortfolioItem[] = form.portfolio
        .split('\n')
        .map((entry, index) => entry.trim())
        .filter(Boolean)
        .map((url, index) => ({
          id: `portfolio-${index + 1}`,
          title: `Portfolio ${index + 1}`,
          imageUrl: url
        }));

      const result = await providerApplicationService.submitApplication({
        businessName: form.businessName,
        businessType: form.businessType,
        bio: form.bio,
        serviceCategories: form.serviceCategories,
        languages: splitCsv(form.languages),
        yearsExperience: Number(form.yearsExperience || 0),
        serviceArea,
        responseSlaHours: Number(form.responseSlaHours || 24),
        website: form.website,
        payoutReady: form.payoutReady,
        documents,
        portfolio,
        onboardingProgress
      }, { submit });

      setApplication(result);
      showNotification(submit ? 'Provider application submitted for review.' : 'Provider draft saved.');
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to save provider application.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProviderSurface className="bg-gradient-to-br from-surface via-surface to-surface-soft">
        <ProviderPageHeader
          eyebrow="Provider Onboarding"
          title="Apply to offer services"
          description="This flow collects identity, categories, service area, proof documents, and payout readiness before provider access is activated."
          actions={
            hasCapability('provide_service') ? (
              <Link to="/profile/provider" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                Open provider workspace
              </Link>
            ) : null
          }
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-border bg-surface-soft p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Application status</p>
                <p className="mt-1 text-2xl font-black text-text-primary">{formatStatus(application?.status || 'draft')}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(application?.status)}`}>
                {formatStatus(application?.status || 'draft')}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{formatStatusBody(application?.status)}</p>
            {application?.reviewerNotes ? (
              <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Reviewer notes</p>
                <p className="mt-2 text-sm text-text-primary">{application.reviewerNotes}</p>
              </div>
            ) : null}
          </div>
          <div className="rounded-3xl border border-border bg-surface-soft p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Completion</p>
            <p className="mt-2 text-4xl font-black text-text-primary">{onboardingProgress}%</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary" style={{ width: `${onboardingProgress}%` }} />
            </div>
            <p className="mt-3 text-sm text-text-secondary">Finish all proof points before submitting for review to reduce moderation back-and-forth.</p>
          </div>
        </div>
      </ProviderSurface>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ProviderSurface>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Business or display name</span>
              <input value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Business type</span>
              <input value={form.businessType} onChange={(event) => setForm((current) => ({ ...current, businessType: event.target.value }))} placeholder="Solo operator, studio, agency..." className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-text-primary">Provider bio</span>
              <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={5} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Languages</span>
              <input value={form.languages} onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))} placeholder="English, Urdu, Arabic" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Years of experience</span>
              <input type="number" min={0} value={form.yearsExperience} onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Service area</span>
              <input value={form.serviceArea} onChange={(event) => setForm((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Karachi, Lahore, Remote worldwide" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Response SLA (hours)</span>
              <input type="number" min={1} value={form.responseSlaHours} onChange={(event) => setForm((current) => ({ ...current, responseSlaHours: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-text-primary">Website or portfolio</span>
              <input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://your-site.com" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-text-primary">Service categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryOptions.slice(0, 24).map((entry) => {
                const active = form.serviceCategories.includes(entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleToggleCategory(entry.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-soft text-text-secondary'}`}
                  >
                    {entry.name}
                  </button>
                );
              })}
            </div>
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Verification documents</span>
              <textarea value={form.documents} onChange={(event) => setForm((current) => ({ ...current, documents: event.target.value }))} rows={5} placeholder="One secure URL per line" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Portfolio items</span>
              <textarea value={form.portfolio} onChange={(event) => setForm((current) => ({ ...current, portfolio: event.target.value }))} rows={5} placeholder="One image or case-study URL per line" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3">
              <input type="checkbox" checked={form.payoutReady} onChange={(event) => setForm((current) => ({ ...current, payoutReady: event.target.checked }))} />
              <span className="text-sm font-medium text-text-primary">I have payout details ready for admin review and settlement setup.</span>
            </label>

            <div className="grid gap-3">
              <button onClick={() => void save(false)} disabled={isSaving} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary">
                {isSaving ? 'Saving...' : 'Save draft'}
              </button>
              <button onClick={() => void save(true)} disabled={isSaving} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white">
                {isSaving ? 'Submitting...' : application?.status === 'rejected' || application?.status === 'resubmission_requested' ? 'Resubmit application' : 'Submit for review'}
              </button>
            </div>
          </div>
        </ProviderSurface>
      </div>
    </div>
  );
};

export default ProviderOnboardingPage;
