import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import providerWorkspaceService from '../../services/providerWorkspaceService';
import type { ProviderApplication, Service, ServiceProviderProfile, User, WorkPortfolioItem } from '../../types';
import Spinner from '../../components/Spinner';
import ServiceWorkflowEmptyState from '../../components/service/ServiceWorkflowEmptyState';

const getMinPrice = (service: Service) => {
  const prices = (service.pricingModels || []).map((entry) => Number(entry.price || 0)).filter((entry) => entry > 0);
  return prices.length ? Math.min(...prices) : 0;
};

const toTitleCase = (value: string) => value
  .split('_')
  .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
  .join(' ');

const getProviderConfidence = (profile?: ServiceProviderProfile | null, application?: ProviderApplication | null, services: Service[] = []) => {
  let score = 54;
  if (profile?.verificationLevel === 'verified') score += 16;
  if (profile?.status === 'approved' || application?.status === 'approved') score += 10;
  if (profile?.payoutReady) score += 6;
  if ((profile?.portfolio || []).length > 0) score += 6;
  if ((profile?.languages || []).length > 0) score += 3;
  if ((profile?.responseSlaHours || 48) <= 24) score += 5;
  if (services.length >= 3) score += 5;
  return Math.max(0, Math.min(100, score));
};

const ProviderPublicProfilePage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [profile, setProfile] = useState<ServiceProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!providerId) return;
      setIsLoading(true);
      try {
        const data = await providerWorkspaceService.getPublicProviderStorefront(providerId);
        if (cancelled) return;
        setUser(data.user);
        setServices(data.services);
        setApplication(data.application || null);
        setProfile(data.providerProfile || null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const stats = useMemo(() => {
    const startingAt = services.length ? Math.min(...services.map((entry) => getMinPrice(entry)).filter((entry) => entry > 0 || !Number.isNaN(entry))) : 0;
    return {
      services: services.length,
      categories: Array.from(new Set(services.map((entry) => entry.category).filter(Boolean))).length,
      startingAt: Number.isFinite(startingAt) ? startingAt : 0,
      responseSla: profile?.responseSlaHours || 24
    };
  }, [profile?.responseSlaHours, services]);

  const trustBadges = useMemo(() => {
    const badges = new Set<string>(profile?.trustBadges || []);
    if (profile?.verificationLevel === 'verified') badges.add('Verified profile');
    if (profile?.status === 'approved' || application?.status === 'approved') badges.add('Approved provider');
    if (profile?.payoutReady) badges.add('Escrow and payout ready');
    return Array.from(badges);
  }, [application?.status, profile]);

  const portfolioItems = useMemo<WorkPortfolioItem[]>(() => {
    const items = profile?.portfolio || [];
    if (items.length > 0) return items;
    return services
      .flatMap((service) => service.details?.portfolio || [])
      .filter((entry) => Boolean(entry?.imageUrl))
      .slice(0, 6);
  }, [profile?.portfolio, services]);

  const confidence = useMemo(() => getProviderConfidence(profile, application, services), [application, profile, services]);
  const hiringSteps = useMemo(
    () => [
      'Review the provider storefront confidence, operating style, and service catalog first.',
      'Open a specific service to choose instant booking or request a scoped quote.',
      'Keep delivery, contract progress, and payment protection inside one connected workflow.'
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <ServiceWorkflowEmptyState
          eyebrow="Storefront unavailable"
          title="This provider storefront is not available right now"
          body="The profile may have been unpublished or replaced. Go back to the marketplace to compare other providers, trust signals, and service lanes."
          animation="noFileFound"
          highlights={['Browse live services', 'Compare storefronts', 'Use verified provider filter']}
          primaryAction={{ label: 'Back to services', to: '/services/marketplace' }}
          secondaryAction={{ label: 'Browse providers', to: '/sellers' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 text-text-primary">
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(135deg,_rgba(17,24,39,0.98),_rgba(33,48,88,0.96)_48%,_rgba(12,18,30,0.99))] text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[8%] top-[-10%] h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute right-[10%] top-[20%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.35fr_0.95fr] lg:px-8">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
              Provider storefront
            </p>
            <div className="mt-5 flex items-center gap-4">
              <img src={user.avatar || '/icons/urbanprime.svg'} alt={user.name} className="h-20 w-20 rounded-3xl border border-white/15 object-cover shadow-2xl" />
              <div>
                <h1 className="text-4xl font-black tracking-tight">{profile?.businessName || user.businessName || user.name}</h1>
                <p className="mt-1 text-sm text-white/70">{profile?.businessType || 'Independent provider'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">
                  {toTitleCase(profile?.status || application?.status || 'submitted')}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-white/80">
              {profile?.bio || user.about || 'Explore the provider storefront, service catalog, trust profile, and delivery style from one place.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(profile?.serviceCategories || []).slice(0, 8).map((entry) => (
                <span key={entry} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/78">
                  {entry}
                </span>
              ))}
            </div>

            {trustBadges.length > 0 ? (
              <div className="mt-6 grid gap-2 md:grid-cols-2">
                {trustBadges.map((badge) => (
                  <div key={badge} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-semibold text-white/88 backdrop-blur-sm">
                    {badge}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Storefront confidence</p>
              <p className="mt-2 text-4xl font-black">{confidence}%</p>
              <p className="mt-3 text-sm text-white/72">
                Based on verification, approval state, payout readiness, response speed, portfolio depth, and service coverage.
              </p>
              <div className="mt-5 grid gap-2">
                <Link
                  to={`/profile/messages?sellerId=${encodeURIComponent(user.id)}`}
                  className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950"
                >
                  Message provider
                </Link>
                <Link
                  to={`/services/concierge?providerId=${encodeURIComponent(user.id)}`}
                  className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-center text-sm font-semibold text-white/86"
                >
                  Start with AI concierge
                </Link>
                <Link to="/services/marketplace" className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-center text-sm font-semibold text-white/86">
                  Browse more services
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-black">{stats.services}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/62">Services</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-black">{stats.categories}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/62">Categories</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-black">{stats.responseSla}h</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/62">Response</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-black">{stats.startingAt > 0 ? `${services[0]?.currency || 'USD'} ${stats.startingAt.toLocaleString()}` : 'Quote'}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/62">Starting at</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <main className="space-y-6">
          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">How to hire from this storefront</p>
                <h2 className="mt-2 text-xl font-bold text-text-primary">The next step is visible before you commit</h2>
              </div>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Confidence {confidence}%
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {hiringSteps.map((step, index) => (
                <div key={step} className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-text-primary">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Service catalog</h2>
                <p className="text-sm text-text-secondary">Published services ready for instant booking, scoped proposals, or hybrid workflows.</p>
              </div>
            </div>

            {services.length === 0 ? (
              <div className="mt-4">
                <ServiceWorkflowEmptyState
                  compact
                  eyebrow="Catalog pending"
                  title="This provider has not published services yet"
                  body="Their storefront is visible, but the service catalog is still being prepared. Come back later or continue browsing the marketplace."
                  animation="nothing"
                  highlights={['Storefront ready', 'Catalog pending', 'Browse other providers']}
                  primaryAction={{ label: 'Browse marketplace', to: '/services/marketplace' }}
                />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {services.map((service) => {
                  const minPrice = getMinPrice(service);
                  const modeLabel = service.mode === 'instant' ? 'Instant booking' : service.mode === 'proposal' ? 'Proposal workflow' : 'Hybrid workflow';
                  return (
                    <Link key={service.id} to={`/service/${service.id}`} className="group overflow-hidden rounded-[28px] border border-border bg-surface-soft transition hover:-translate-y-1 hover:border-primary/35">
                      <div className="aspect-[16/10] overflow-hidden">
                        <img src={service.imageUrls?.[0] || '/icons/urbanprime.svg'} alt={service.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{service.category}</p>
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            {modeLabel}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-text-primary">{service.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{service.description}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-text-primary">
                            {service.currency || service.pricingModels?.[0]?.currency || 'USD'} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
                          </p>
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Open service</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <h2 className="text-xl font-bold text-text-primary">Portfolio highlights</h2>
            {portfolioItems.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {portfolioItems.map((item, index) => (
                  <div key={`${item.title || 'portfolio'}-${index}`} className="overflow-hidden rounded-3xl border border-border bg-surface-soft">
                    {item.imageUrl ? (
                      <div className="aspect-[16/11] overflow-hidden">
                        <img src={item.imageUrl} alt={item.title || `Portfolio ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <p className="text-base font-semibold text-text-primary">{item.title || `Portfolio item ${index + 1}`}</p>
                      {item.description ? <p className="mt-2 text-sm text-text-secondary">{item.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <ServiceWorkflowEmptyState
                  compact
                  eyebrow="Portfolio pending"
                  title="This storefront has not published portfolio highlights yet"
                  body="You can still review the provider confidence, operating style, and service catalog before opening a service page or message thread."
                  animation="noFileFound"
                  highlights={['Review catalog', 'Check trust signals', 'Message provider']}
                  primaryAction={{ label: 'Browse services', to: '/services/marketplace' }}
                />
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-bold text-text-primary">Operating style</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-secondary">
                Application status: <span className="font-semibold text-text-primary">{toTitleCase(application?.status || 'submitted')}</span>
              </div>
              <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-secondary">
                Languages: <span className="font-semibold text-text-primary">{(profile?.languages || []).join(', ') || 'Not listed'}</span>
              </div>
              <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-secondary">
                Service area: <span className="font-semibold text-text-primary">{profile?.serviceArea || 'Flexible'}</span>
              </div>
              <div className="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-text-secondary">
                Payout readiness: <span className="font-semibold text-text-primary">{profile?.payoutReady ? 'Ready' : 'In progress'}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-bold text-text-primary">Why clients hire this provider</h2>
            <div className="mt-4 space-y-3">
              {[
                `${stats.responseSla}h response discipline`,
                `${services.length} published services across ${stats.categories || 1} categories`,
                profile?.verificationLevel === 'verified' ? 'Verified storefront and moderation-backed trust' : 'Moderated storefront with linked provider profile'
              ].map((entry) => (
                <div key={entry} className="rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm text-text-primary">
                  {entry}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProviderPublicProfilePage;
