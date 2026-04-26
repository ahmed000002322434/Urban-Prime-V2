import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { HIERARCHICAL_SERVICE_CATEGORIES } from '../../../constants';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import { userService } from '../../../services/itemService';
import { providerApplicationService } from '../../../services/providerWorkspaceService';
import type { ProviderApplication, WorkPortfolioItem, WorkServiceAreaCoverage } from '../../../types';
import {
  ProviderEmptyState,
  ProviderPageHeader,
  ProviderSurface,
  formatStatus,
  statusPillClass
} from './providerWorkspaceUi';

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const categoryOptions = HIERARCHICAL_SERVICE_CATEGORIES.flatMap((category) => category.subcategories || []);

const ProviderHubProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    businessName: '',
    businessType: '',
    tagline: '',
    about: '',
    city: '',
    country: '',
    website: '',
    serviceArea: '',
    languages: '',
    yearsExperience: '0',
    responseSlaHours: '24',
    notes: '',
    payoutReady: false,
    serviceCategories: [] as string[]
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const existing = await providerApplicationService.getMyApplication(user.id).catch(() => undefined);
        if (cancelled) return;
        setApplication(existing || null);
        setForm({
          displayName: user.name || '',
          businessName: existing?.businessName || user.businessName || '',
          businessType: existing?.businessType || user.providerProfile?.businessType || '',
          tagline: user.businessDescription || '',
          about: existing?.bio || user.about || '',
          city: user.city || '',
          country: user.country || '',
          website: existing?.website || user.providerProfile?.website || '',
          serviceArea: (existing?.serviceArea || user.providerProfile?.serviceAreaCoverage || []).map((entry) => entry.label).join(', '),
          languages: (existing?.languages || user.providerProfile?.languages || []).join(', '),
          yearsExperience: String(existing?.yearsExperience || user.yearsInBusiness || user.providerProfile?.yearsExperience || 0),
          responseSlaHours: String(existing?.responseSlaHours || user.providerProfile?.responseSlaHours || 24),
          notes: existing?.notes || user.providerProfile?.notes || '',
          payoutReady: Boolean(existing?.payoutReady ?? user.providerProfile?.payoutReady),
          serviceCategories: existing?.serviceCategories || user.providerProfile?.serviceCategories || []
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.about, user?.businessDescription, user?.businessName, user?.city, user?.country, user?.name, user?.providerProfile]);

  const profileStrength = useMemo(() => {
    const checks = [
      form.displayName,
      form.businessName,
      form.about,
      form.serviceArea,
      form.languages,
      form.website,
      form.serviceCategories.length > 0 ? 'ok' : '',
      form.payoutReady ? 'ok' : ''
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const readinessCards = useMemo(
    () => [
      {
        label: 'Public status',
        value: formatStatus(application?.status || 'draft'),
        note: application?.status === 'approved' ? 'Storefront is in an approval-ready state.' : 'Keep trust details polished before review.'
      },
      {
        label: 'Profile strength',
        value: `${profileStrength}%`,
        note: 'A stronger service hub profile improves trust and buyer confidence.'
      },
      {
        label: 'Response promise',
        value: `${form.responseSlaHours || '24'} hrs`,
        note: 'Set a realistic expectation so clients know how quickly you respond.'
      },
      {
        label: 'Coverage',
        value: splitCsv(form.serviceArea).length ? `${splitCsv(form.serviceArea).length} zones` : 'Not set',
        note: 'Clear service areas reduce confusion during inquiry and booking.'
      }
    ],
    [application?.status, form.responseSlaHours, form.serviceArea, profileStrength]
  );

  const saveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const serviceArea: WorkServiceAreaCoverage[] = splitCsv(form.serviceArea).map((entry) => ({
        kind: 'custom',
        label: entry
      }));
      const portfolio: WorkPortfolioItem[] = application?.portfolio || user.providerProfile?.portfolio || [];

      const updatedUser = await userService.updateUserProfile(user.id, {
        name: form.displayName,
        about: form.about,
        businessName: form.businessName,
        businessDescription: form.tagline,
        city: form.city,
        country: form.country
      });

      const applicationPayload = {
        businessName: form.businessName,
        businessType: form.businessType,
        bio: form.about,
        serviceCategories: form.serviceCategories,
        languages: splitCsv(form.languages),
        yearsExperience: Number(form.yearsExperience || 0),
        serviceArea,
        responseSlaHours: Number(form.responseSlaHours || 24),
        payoutReady: form.payoutReady,
        website: form.website,
        portfolio,
        onboardingProgress: Math.max(application?.onboardingProgress || 0, profileStrength),
        notes: form.notes
      };

      const savedApplication = application
        ? await providerApplicationService.updateApplication(application.id, applicationPayload)
        : await providerApplicationService.submitApplication(applicationPayload, { submit: false });

      setApplication(savedApplication);
      updateUser({
        ...updatedUser,
        providerProfile: {
          ...(user.providerProfile || {
            bio: '',
            skills: [],
            serviceArea: '',
            status: 'pending_approval',
            serviceCategories: []
          }),
          bio: form.about,
          businessName: form.businessName,
          businessType: form.businessType,
          website: form.website,
          yearsExperience: Number(form.yearsExperience || 0),
          responseSlaHours: Number(form.responseSlaHours || 24),
          payoutReady: form.payoutReady,
          languages: splitCsv(form.languages),
          serviceCategories: form.serviceCategories,
          serviceArea: serviceArea.map((entry) => entry.label).join(', '),
          serviceAreaCoverage: serviceArea,
          onboardingProgress: Math.max(application?.onboardingProgress || 0, profileStrength),
          notes: form.notes,
          applicationId: savedApplication.id,
          applicationStatus: savedApplication.status
        }
      });
      showNotification('Service hub profile updated.');
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to update service hub profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (value: string) => {
    setForm((current) => ({
      ...current,
      serviceCategories: current.serviceCategories.includes(value)
        ? current.serviceCategories.filter((entry) => entry !== value)
        : [...current.serviceCategories, value]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <ProviderEmptyState
        title="Service hub profile is not available"
        body="Sign in and complete provider onboarding to manage your public service identity."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ProviderPageHeader
        eyebrow="Service Hub Profile"
        title="Shape the public service identity buyers will trust"
        description="This page controls how your provider hub reads in the marketplace: who you are, what you cover, how fast you respond, and why clients should feel safe booking you."
        actions={
          <>
            <Link to={`/providers/${user.id}`} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-text-primary">
              View public page
            </Link>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={isSaving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <ProviderSurface className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-90px] top-[-110px] h-64 w-64 rounded-full bg-[#dcd4ff]/45 blur-[110px] dark:bg-[#30294a]/55" />
            <div className="absolute right-[-60px] bottom-[-120px] h-56 w-56 rounded-full bg-[#f3dfc9]/40 blur-[110px] dark:bg-[#453423]/45" />
          </div>

          <div className="relative">
            <div className="rounded-[30px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_40px_rgba(140,126,180,0.06)] backdrop-blur-[10px] dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(application?.status || 'draft')}`}>
                      {formatStatus(application?.status || 'draft')}
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      {form.serviceCategories.length || 0} focus areas
                    </span>
                  </div>
                  <h2 className="mt-3 text-[2rem] font-black tracking-[-0.03em] text-text-primary">
                    {form.businessName || form.displayName || 'Your service hub'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">
                    {form.tagline || form.about || 'Add a sharper positioning statement so buyers instantly understand your specialty, trust level, and service coverage.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {form.serviceCategories.slice(0, 6).map((categoryId) => {
                      const option = categoryOptions.find((entry) => entry.id === categoryId);
                      return (
                        <span key={categoryId} className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {option?.name || categoryId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-background/90 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Public readiness</p>
                  <p className="mt-2 text-3xl font-black text-text-primary">{profileStrength}%</p>
                  <p className="mt-2 max-w-[220px] text-sm leading-6 text-text-secondary">
                    Better trust detail here makes the marketplace, service detail page, and provider profile feel much more complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {readinessCards.map((entry) => (
                <div key={entry.label} className="rounded-[24px] border border-border bg-background/88 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{entry.label}</p>
                  <p className="mt-2 text-lg font-black tracking-tight text-text-primary">{entry.value}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        </ProviderSurface>

        <div className="grid gap-6">
          <ProviderSurface>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Buyer impression</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">What this profile should communicate immediately</h2>
            <div className="mt-5 grid gap-3">
              {[
                'What kind of provider you are',
                'Where and how you deliver services',
                'How quickly clients can expect a response',
                'Why your storefront is safe to trust'
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-[22px] border border-border bg-surface-soft px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium leading-6 text-text-primary">{item}</p>
                </div>
              ))}
            </div>
          </ProviderSurface>

          <ProviderSurface>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Fast actions</p>
            <div className="mt-4 grid gap-3">
              <Link to="/profile/provider/services" className="rounded-[22px] border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-primary">
                Manage services
              </Link>
              <Link to="/profile/provider/onboarding" className="rounded-[22px] border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-primary">
                Review application
              </Link>
              <Link to="/profile/provider/settings" className="rounded-[22px] border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-primary">
                Open settings
              </Link>
            </div>
          </ProviderSurface>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ProviderSurface>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Display name</span>
              <input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Business or brand name</span>
              <input value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Business type</span>
              <input value={form.businessType} onChange={(event) => setForm((current) => ({ ...current, businessType: event.target.value }))} placeholder="Studio, agency, independent specialist..." className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Website</span>
              <input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://your-site.com" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-text-primary">Short tagline</span>
              <input value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="A sharp one-line positioning statement for your service hub" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-text-primary">Public bio</span>
              <textarea value={form.about} onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))} rows={5} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">City</span>
              <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Country</span>
              <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Service area</span>
              <input value={form.serviceArea} onChange={(event) => setForm((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Karachi, Lahore, Remote worldwide" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Languages</span>
              <input value={form.languages} onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))} placeholder="English, Urdu, Arabic" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-text-primary">Years of experience</span>
                <input type="number" min={0} value={form.yearsExperience} onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-text-primary">Response SLA (hours)</span>
                <input type="number" min={1} value={form.responseSlaHours} onChange={(event) => setForm((current) => ({ ...current, responseSlaHours: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </label>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3">
              <input type="checkbox" checked={form.payoutReady} onChange={(event) => setForm((current) => ({ ...current, payoutReady: event.target.checked }))} />
              <span className="text-sm font-medium text-text-primary">Payout details are ready for admin review and settlement.</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Internal notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </ProviderSurface>
      </div>

      <ProviderSurface>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Category focus</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">Choose the service lanes you want your hub profile to emphasize</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            These categories help the storefront read clearly and make it easier for buyers to know what you actually specialize in.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categoryOptions.slice(0, 30).map((entry) => {
            const active = form.serviceCategories.includes(entry.id);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => toggleCategory(entry.id)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-soft text-text-secondary'
                }`}
              >
                {entry.name}
              </button>
            );
          })}
        </div>
      </ProviderSurface>
    </div>
  );
};

export default ProviderHubProfilePage;
