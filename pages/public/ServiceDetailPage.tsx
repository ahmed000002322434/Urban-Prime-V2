import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { serviceService } from '../../services/itemService';
import providerWorkspaceService from '../../services/providerWorkspaceService';
import type { Service, ServicePricingModel, WorkFaq, WorkPolicySet, WorkPortfolioItem } from '../../types';
import Spinner from '../../components/Spinner';
import ServiceBookingModal from '../../components/ServiceBookingModal';
import ServiceQuoteRequestModal from '../../components/ServiceQuoteRequestModal';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';
import ServiceWorkflowEmptyState from '../../components/service/ServiceWorkflowEmptyState';
import { useNotification } from '../../context/NotificationContext';

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500">
    <path d="m12 3.4 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9L12 3.4Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 21s7-3.8 7-9.5V5.8L12 3 5 5.8v5.7C5 17.2 12 21 12 21Z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5V12l2.8 1.8" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 20s5.8-5.1 5.8-10a5.8 5.8 0 1 0-11.6 0c0 4.9 5.8 10 5.8 10Z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

const packageLabel = (model: ServicePricingModel) => {
  if (model.type === 'hourly') return 'Hourly package';
  if (model.type === 'fixed') return 'Fixed package';
  return 'Custom package';
};

const getServiceMinPrice = (service: Service) => {
  const prices = (service.pricingModels || []).map((entry) => Number(entry.price || 0)).filter((entry) => entry > 0);
  if (prices.length === 0) return 0;
  return Math.min(...prices);
};

const getServiceCurrency = (service: Service) => service.currency || service.pricingModels?.[0]?.currency || 'USD';

const toTitleCase = (value: string) =>
  value
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ');

const getConfidenceScore = (service: Service) => {
  let score = 55;
  if (service.providerProfile?.verificationLevel === 'verified') score += 15;
  if (service.providerProfile?.status === 'approved') score += 8;
  if (service.providerProfile?.payoutReady) score += 6;
  if ((service.details?.portfolio || service.providerProfile?.portfolio || []).length > 0) score += 6;
  if ((service.details?.faqs || []).length > 0) score += 4;
  if ((service.reviews?.length || 0) > 0) score += 4;
  if ((service.providerProfile?.responseSlaHours || 48) <= 24) score += 6;
  return Math.max(0, Math.min(100, score));
};

const buildPolicyEntries = (policies?: WorkPolicySet) => {
  if (!policies) return [];
  const entries: Array<{ label: string; value: string }> = [];

  if (policies.cancellation) entries.push({ label: 'Cancellation', value: policies.cancellation });
  if (policies.reschedule) entries.push({ label: 'Reschedule', value: policies.reschedule });
  if (policies.revisions) entries.push({ label: 'Revisions', value: policies.revisions });
  if (policies.delivery) entries.push({ label: 'Delivery', value: policies.delivery });
  (policies.custom || []).forEach((entry, index) => {
    entries.push({ label: `Additional policy ${index + 1}`, value: entry });
  });

  return entries;
};

const surfaceClass =
  'rounded-[32px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-6 shadow-soft dark:bg-[linear-gradient(180deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96))]';

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [serviceRow, allServices] = await Promise.all([
          serviceService.getServiceById(id),
          serviceService.getServices().catch(() => [])
        ]);

        if (cancelled) return;

        if (!serviceRow) {
          setService(null);
          setRelatedServices([]);
          return;
        }

        const providerId = String(serviceRow.provider?.id || '').trim();
        const storefront = providerId
          ? await providerWorkspaceService.getPublicProviderStorefront(providerId).catch(() => null)
          : null;

        const resolvedService = storefront?.providerProfile
          ? {
              ...serviceRow,
              providerProfile: storefront.providerProfile
            }
          : serviceRow;

        const companionRows = (allServices || [])
          .filter((entry) => entry.id !== resolvedService.id)
          .sort((left, right) => {
            const leftSameProvider = String(left.provider?.id || '') === String(resolvedService.provider?.id || '');
            const rightSameProvider = String(right.provider?.id || '') === String(resolvedService.provider?.id || '');
            const leftSameCategory = left.category === resolvedService.category;
            const rightSameCategory = right.category === resolvedService.category;

            const leftScore = Number(leftSameProvider) * 3 + Number(leftSameCategory) * 2 + Number(left.avgRating || 0);
            const rightScore = Number(rightSameProvider) * 3 + Number(rightSameCategory) * 2 + Number(right.avgRating || 0);
            return rightScore - leftScore;
          })
          .filter((entry, index, rows) => rows.findIndex((candidate) => candidate.id === entry.id) === index)
          .slice(0, 4);

        setService(resolvedService);
        setRelatedServices(companionRows);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const featureBadges = useMemo(() => {
    if (!service) return [];
    const badges: string[] = [];
    badges.push(`Mode: ${(service.mode || 'hybrid').toUpperCase()}`);
    badges.push(`Delivery: ${(service.fulfillmentKind || 'hybrid').toUpperCase()}`);
    badges.push(`${service.pricingModels?.length || 0} package options`);
    badges.push(`${service.reviews?.length || 0} reviews`);
    if (service.availability?.leadTimeHours) badges.push(`${service.availability.leadTimeHours}h lead time`);
    if (service.details?.serviceAreaLabel || service.providerProfile?.serviceArea) {
      badges.push(service.details?.serviceAreaLabel || service.providerProfile?.serviceArea || '');
    }
    return badges.filter(Boolean);
  }, [service]);

  const trustBadges = useMemo(() => {
    if (!service) return [];
    const badges = new Set<string>(service.details?.trustBadges || []);
    if (service.providerProfile?.verificationLevel === 'verified' || service.providerProfile?.status === 'approved') {
      badges.add('Verified provider');
    }
    if (service.providerProfile?.payoutReady) badges.add('Escrow and payout ready');
    if (service.providerProfile?.applicationStatus === 'approved') badges.add('Approved provider application');
    return Array.from(badges);
  }, [service]);

  const policyEntries = useMemo(() => buildPolicyEntries(service?.details?.policies), [service]);
  const faqs = useMemo<WorkFaq[]>(() => service?.details?.faqs || [], [service]);
  const portfolioItems = useMemo<WorkPortfolioItem[]>(
    () => (service?.details?.portfolio?.length ? service.details.portfolio : service?.providerProfile?.portfolio || []),
    [service]
  );

  const canBookInstantly = useMemo(() => {
    if (!service) return false;
    return service.details?.instantBookingEnabled ?? service.mode !== 'proposal';
  }, [service]);

  const canRequestQuote = useMemo(() => {
    if (!service) return false;
    return service.details?.quoteEnabled ?? service.mode !== 'instant';
  }, [service]);

  const confidenceScore = useMemo(() => (service ? getConfidenceScore(service) : 0), [service]);

  const fitCards = useMemo(() => {
    if (!service) return [];
    return [
      {
        label: 'Best use case',
        value: service.mode === 'instant' ? 'Urgent or repeatable work' : service.mode === 'proposal' ? 'Custom scoped projects' : 'Flexible hiring'
      },
      {
        label: 'Response pace',
        value: `${service.details?.responseSlaHours || service.providerProfile?.responseSlaHours || 24}h expected response`
      },
      {
        label: 'Coverage',
        value: service.details?.serviceAreaLabel || service.providerProfile?.serviceArea || 'Flexible coverage'
      },
      {
        label: 'Launch path',
        value: canBookInstantly && canRequestQuote ? 'Book now or request quote' : canBookInstantly ? 'Book now' : 'Request quote'
      }
    ];
  }, [canBookInstantly, canRequestQuote, service]);

  const workflowSteps = useMemo(() => {
    if (!service) return [];
    if (canBookInstantly && canRequestQuote) {
      return [
        'Choose whether you want an instant package or a scoped quote.',
        'The provider accepts the lead and the work moves into contract plus escrow.',
        'Completion, release, and payout readiness stay connected in one workflow.'
      ];
    }
    if (canBookInstantly) {
      return [
        'Pick the package, schedule, and service address that fits.',
        'The provider confirms the lead and escrow holds the payment safely.',
        'Once the work is complete, the platform releases payment securely.'
      ];
    }
    return [
      'Send a detailed brief with scope, timing, and budget.',
      'The provider responds with a tailored proposal and terms.',
      'Accept the proposal to create the contract and secure the work.'
    ];
  }, [canBookInstantly, canRequestQuote, service]);

  const decisionCards = useMemo(() => {
    if (!service) return [];
    return [
      {
        label: 'Book instantly when',
        value: canBookInstantly
          ? 'You already know the package, delivery target, and service timing.'
          : 'This listing needs scoping first, so start with a request.'
      },
      {
        label: 'Request a quote when',
        value: canRequestQuote
          ? 'You need custom deliverables, a different timeline, or provider guidance before booking.'
          : 'The listing is already packaged for direct checkout.'
      },
      {
        label: 'Platform protection',
        value: 'Lead creation, contract progress, escrow, and payout readiness all stay tied to the same work record.'
      }
    ];
  }, [canBookInstantly, canRequestQuote, service]);

  const buyerChecklist = useMemo(() => {
    if (!service) return [];
    return [
      { label: 'Verified storefront', passed: service.providerProfile?.verificationLevel === 'verified' || service.providerProfile?.status === 'approved' },
      { label: 'Escrow ready', passed: Boolean(service.providerProfile?.payoutReady) },
      { label: 'Portfolio available', passed: portfolioItems.length > 0 },
      { label: 'Policies documented', passed: policyEntries.length > 0 },
      { label: 'FAQ coverage', passed: faqs.length > 0 }
    ];
  }, [faqs.length, policyEntries.length, portfolioItems.length, service]);

  const isOwnService = Boolean(user?.id && service?.provider?.id && String(user.id) === String(service.provider.id));

  const handleBookNow = () => {
    if (!service) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (isOwnService) {
      showNotification('You cannot order your own service. Manage it from the provider workspace.');
      navigate('/profile/provider/services');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleRequestQuote = () => {
    if (!service) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (isOwnService) {
      showNotification('You cannot request a quote from your own service.');
      navigate('/profile/provider/services');
      return;
    }
    setIsQuoteModalOpen(true);
  };

  const handleMessageProvider = () => {
    if (!service) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!String(service.provider?.id || '').trim()) {
      showNotification('The public provider thread is not ready for this listing yet.');
      return;
    }
    if (isOwnService) {
      showNotification('This is your service. Open the provider hub to manage it.');
      navigate('/profile/provider');
      return;
    }
    navigate(`/profile/messages?sellerId=${encodeURIComponent(service.provider.id)}&serviceId=${encodeURIComponent(service.id)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <ServiceWorkflowEmptyState
          eyebrow="Service unavailable"
          title="This service is not available right now"
          body="It may have been removed, unpublished, or replaced with a new listing. Return to the marketplace to compare other providers and hiring lanes."
          animation="noFileFound"
          highlights={['Browse verified providers', 'Compare service lanes', 'Open storefronts instead']}
          primaryAction={{ label: 'Back to services', to: '/services/marketplace' }}
          secondaryAction={{ label: 'Browse providers', to: '/sellers' }}
        />
      </div>
    );
  }

  const minPrice = getServiceMinPrice(service);
  const currency = getServiceCurrency(service);
  const heroImage = service.imageUrls?.[0] || '/icons/urbanprime.svg';
  const responseSla = service.details?.responseSlaHours || service.providerProfile?.responseSlaHours || 24;
  const serviceArea = service.details?.serviceAreaLabel || service.providerProfile?.serviceArea || 'Flexible coverage';
  const availabilityTimezone = service.availability?.timezone || service.timezone;
  const providerId = String(service.provider?.id || '').trim();
  const providerName = service.providerProfile?.businessName || service.provider?.name || 'Provider';
  const rating = Number(service.avgRating || service.provider?.rating || 0).toFixed(1);

  return (
    <>
      {isBookingModalOpen ? <ServiceBookingModal service={service} onClose={() => setIsBookingModalOpen(false)} /> : null}
      {isQuoteModalOpen ? <ServiceQuoteRequestModal service={service} onClose={() => setIsQuoteModalOpen(false)} /> : null}

      <div className="min-h-screen bg-background pb-24 text-text-primary">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <BackButton className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary shadow-soft" />
            <Link to="/services/marketplace" className="text-sm font-semibold text-text-secondary transition hover:text-primary">
              Services marketplace
            </Link>
            <span className="text-text-secondary">/</span>
            <span className="text-sm font-semibold text-text-primary">{service.category || 'Service'}</span>
          </div>

          <section className="relative mt-5 overflow-hidden rounded-[40px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(139,123,232,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,190,112,0.12),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] shadow-[0_28px_60px_rgba(15,23,42,0.08)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,123,232,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,190,112,0.12),_transparent_28%),linear-gradient(180deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96))]">
            <div className="grid gap-0 xl:grid-cols-[1.02fr_0.98fr]">
              <div className="p-6 sm:p-7">
                <div className="overflow-hidden rounded-[34px] border border-border bg-surface-soft">
                  <div className="aspect-[16/11] overflow-hidden">
                    <img src={heroImage} alt={service.title} className="h-full w-full object-cover" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {service.category || 'Service'}
                  </span>
                  <span className="rounded-full border border-border bg-background/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    {canBookInstantly && canRequestQuote ? 'Instant + quote' : canBookInstantly ? 'Instant booking' : 'Quote workflow'}
                  </span>
                  <span className="rounded-full border border-border bg-background/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Confidence {confidenceScore}%
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {fitCards.map((card) => (
                    <div key={card.label} className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{card.label}</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-text-primary">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border p-6 sm:p-7 xl:border-l xl:border-t-0">
                <div className="flex flex-wrap gap-2">
                  {featureBadges.slice(0, 5).map((badge) => (
                    <span key={badge} className="rounded-full border border-border bg-background/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      {badge}
                    </span>
                  ))}
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight text-text-primary sm:text-5xl">{service.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">{service.description}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
                    <StarIcon />
                    {rating}
                  </span>
                  <span>{service.reviews?.length || 0} reviews</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon />
                    {serviceArea}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon />
                    Replies in about {responseSla}h
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {providerId ? (
                    <Link to={`/providers/${providerId}`} className="flex min-w-0 items-center gap-3 rounded-[24px] border border-border bg-background/88 px-4 py-3 transition hover:border-primary/25">
                      <img src={service.provider?.avatar || '/icons/urbanprime.svg'} alt={providerName} className="h-12 w-12 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-primary">{providerName}</p>
                        <p className="truncate text-xs text-text-secondary">Open provider storefront</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3 rounded-[24px] border border-border bg-background/88 px-4 py-3">
                      <img src={service.provider?.avatar || '/icons/urbanprime.svg'} alt={providerName} className="h-12 w-12 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-primary">{providerName}</p>
                        <p className="truncate text-xs text-text-secondary">Provider storefront pending</p>
                      </div>
                    </div>
                  )}
                  <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Confidence blueprint</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-200">{confidenceScore}%</p>
                  </div>
                </div>

                {trustBadges.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {trustBadges.map((badge) => (
                      <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        <ShieldIcon />
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[26px] border border-border bg-background/88 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Starting at</p>
                    <p className="mt-2 text-3xl font-black text-text-primary">
                      {currency} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">Final price depends on package, scope, and delivery timing.</p>
                  </div>
                  <div className="rounded-[26px] border border-border bg-background/88 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Workflow</p>
                    <p className="mt-2 text-xl font-black text-text-primary">
                      {canBookInstantly && canRequestQuote ? 'Book now or request a quote' : canBookInstantly ? 'Instant booking flow' : 'Quote-first flow'}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">The next step stays clear before you commit.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {isOwnService ? (
                    <>
                      <div className="rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4 text-sm font-semibold text-primary">
                        This is your own service listing.
                      </div>
                      <Link
                        to="/profile/provider"
                        className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-4 py-4 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Open provider hub
                        <ArrowRightIcon />
                      </Link>
                      <Link
                        to="/profile/provider/services"
                        className="inline-flex items-center justify-center rounded-[24px] border border-border bg-background px-4 py-4 text-sm font-semibold text-text-primary transition hover:bg-surface-soft sm:col-span-2"
                      >
                        Manage services
                      </Link>
                    </>
                  ) : (
                    <>
                      {canBookInstantly ? (
                        <button
                          onClick={handleBookNow}
                          className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-4 py-4 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Book instantly
                          <ArrowRightIcon />
                        </button>
                      ) : null}
                      {canRequestQuote ? (
                        <button
                          onClick={handleRequestQuote}
                          className="inline-flex items-center justify-center rounded-[24px] border border-border bg-background px-4 py-4 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                        >
                          Request quote
                        </button>
                      ) : null}
                      <button
                        onClick={handleMessageProvider}
                        className="inline-flex items-center justify-center gap-2 rounded-[24px] border border-border bg-background px-4 py-4 text-sm font-semibold text-text-primary transition hover:bg-surface-soft sm:col-span-2"
                      >
                        <MessageIcon />
                        Message provider
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <main className="space-y-6">
              <section className={surfaceClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Decision guide</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Choose the right hiring path before you commit</h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    clear next step
                  </span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {decisionCards.map((card) => (
                    <div key={card.label} className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{card.label}</p>
                      <p className="mt-2 text-sm leading-6 text-text-primary">{card.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className={surfaceClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Packages and pricing</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">See the commercial options before you start</h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    escrow protected
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {(service.pricingModels || []).map((model, index) => (
                    <div key={`${model.type}-${index}`} className="rounded-[24px] border border-border bg-background/88 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-2xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{packageLabel(model)}</p>
                          {model.description ? <p className="mt-2 text-sm leading-6 text-text-secondary">{model.description}</p> : null}
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-black text-text-primary">
                            {model.currency || currency} {Number(model.price || 0).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {model.deliveryDays ? `${model.deliveryDays} day delivery` : 'Custom schedule'}
                            {typeof model.revisions === 'number' ? ` · ${model.revisions} revisions` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={surfaceClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Workflow</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">What happens after you click</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {workflowSteps.map((entry, index) => (
                    <div key={entry} className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Step {index + 1}</p>
                      <p className="mt-2 text-sm leading-6 text-text-primary">{entry}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className={surfaceClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Portfolio</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Work samples and proof points</h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    {portfolioItems.length} samples
                  </span>
                </div>

                {portfolioItems.length > 0 ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {portfolioItems.map((item, index) => (
                      <div key={`${item.title || 'portfolio'}-${index}`} className="overflow-hidden rounded-[28px] border border-border bg-background/88">
                        {item.imageUrl ? (
                          <div className="aspect-[16/10] overflow-hidden">
                            <img src={item.imageUrl} alt={item.title || `Portfolio ${index + 1}`} className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="p-4">
                          <p className="text-base font-bold text-text-primary">{item.title || `Portfolio item ${index + 1}`}</p>
                          {item.description ? <p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <ServiceWorkflowEmptyState
                      compact
                      eyebrow="Portfolio pending"
                      title="The provider has not added showcase samples yet"
                      body="Use the storefront, policies, trust profile, and message thread to confirm fit while the portfolio is still growing."
                      animation="noFileFound"
                      highlights={['Message provider', 'Review policies', 'Check storefront trust']}
                      primaryAction={{ label: 'Open storefront', to: providerId ? `/providers/${providerId}` : '/services/marketplace' }}
                    />
                  </div>
                )}
              </section>

              <section className={surfaceClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">FAQs</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Questions buyers usually ask first</h2>
                {faqs.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {faqs.map((faq, index) => (
                      <div key={`${faq.question}-${index}`} className="rounded-[24px] border border-border bg-background/88 p-4">
                        <p className="text-base font-bold text-text-primary">{faq.question}</p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <ServiceWorkflowEmptyState
                      compact
                      eyebrow="FAQ pending"
                      title="This listing does not answer common questions yet"
                      body="If anything is unclear, request a quote or message the provider so the scope, revisions, and timeline are documented before work begins."
                      animation="nothing"
                      highlights={['Ask about scope', 'Confirm revisions', 'Clarify timeline']}
                      primaryAction={{
                        label: providerId ? 'Message provider' : 'Back to marketplace',
                        to: providerId
                          ? `/profile/messages?sellerId=${encodeURIComponent(providerId)}&serviceId=${encodeURIComponent(service.id)}`
                          : '/services/marketplace'
                      }}
                    />
                  </div>
                )}
              </section>

              <section className={surfaceClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Policies</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Terms worth checking before you hire</h2>
                {policyEntries.length > 0 ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {policyEntries.map((entry) => (
                      <div key={entry.label} className="rounded-[24px] border border-border bg-background/88 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{entry.label}</p>
                        <p className="mt-2 text-sm leading-6 text-text-primary">{entry.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <ServiceWorkflowEmptyState
                      compact
                      eyebrow="Policy pending"
                      title="Formal policies have not been added yet"
                      body="Before hiring, confirm cancellation terms, revisions, and delivery expectations in the thread or quote request."
                      animation="noResults"
                      highlights={['Confirm cancellation', 'Confirm revisions', 'Confirm delivery terms']}
                      primaryAction={{ label: 'Open storefront', to: providerId ? `/providers/${providerId}` : '/services/marketplace' }}
                    />
                  </div>
                )}
              </section>

              <section className={surfaceClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">More to compare</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">More from this storefront and category</h2>
                {relatedServices.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {relatedServices.map((related) => (
                      <Link
                        key={related.id}
                        to={`/service/${related.id}`}
                        className="group overflow-hidden rounded-[28px] border border-border bg-background/88 transition hover:-translate-y-1 hover:border-primary/30"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          <img
                            src={related.imageUrls?.[0] || '/icons/urbanprime.svg'}
                            alt={related.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="p-4">
                          <p className="line-clamp-2 text-sm font-bold text-text-primary">{related.title}</p>
                          <p className="mt-2 text-xs text-text-secondary">
                            {getServiceCurrency(related)} {getServiceMinPrice(related) > 0 ? getServiceMinPrice(related).toLocaleString() : 'Quote'}
                          </p>
                          <p className="mt-2 text-xs text-text-secondary">{related.providerProfile?.businessName || related.provider?.name || 'Provider'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <ServiceWorkflowEmptyState
                      compact
                      eyebrow="Keep exploring"
                      title="No companion services are linked to this listing yet"
                      body="Return to the marketplace to compare other providers, workflows, and confidence scores in this category."
                      animation="addToCartSingle"
                      highlights={['Compare providers', 'Review confidence scores', 'Switch workflow lane']}
                      primaryAction={{ label: 'Back to marketplace', to: '/services/marketplace' }}
                    />
                  </div>
                )}
              </section>
            </main>

            <aside className="space-y-6">
              <section className={`${surfaceClass} lg:sticky lg:top-24`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Provider storefront</p>
                <div className="mt-4 flex items-center gap-3">
                  <img src={service.provider?.avatar || '/icons/urbanprime.svg'} alt={providerName} className="h-14 w-14 rounded-[20px] object-cover" />
                  <div>
                    <p className="text-lg font-black tracking-tight text-text-primary">{providerName}</p>
                    <p className="mt-1 text-sm text-text-secondary">Rating {rating}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[24px] border border-border bg-background/88 p-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <ShieldIcon />
                      {service.providerProfile?.status === 'approved' ? 'Verified and approved' : toTitleCase(service.providerProfile?.status || 'pending_approval')}
                    </div>
                    <p className="mt-2 leading-6">Public provider storefront data is linked directly to this service.</p>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background/88 p-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <ClockIcon />
                      Responds in about {responseSla} hours
                    </div>
                    <p className="mt-2 leading-6">
                      {(service.providerProfile?.languages || []).length > 0
                        ? `Languages: ${(service.providerProfile?.languages || []).join(', ')}`
                        : 'Language preferences were not listed yet.'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background/88 p-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <MapPinIcon />
                      Service area
                    </div>
                    <p className="mt-2 leading-6">{serviceArea}</p>
                    {availabilityTimezone ? <p className="mt-2 text-xs text-text-secondary">Timezone: {availabilityTimezone}</p> : null}
                  </div>
                </div>

                <div className="mt-5 rounded-[26px] border border-border bg-surface-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Buyer-ready checklist</p>
                  <div className="mt-3 space-y-2">
                    {buyerChecklist.map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-text-primary">{entry.label}</span>
                        <span className={entry.passed ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'font-semibold text-text-secondary'}>
                          {entry.passed ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {providerId ? (
                    <Link
                      to={`/providers/${providerId}`}
                      className="inline-flex items-center justify-center rounded-[24px] bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      View provider storefront
                    </Link>
                  ) : null}
                  <button
                    onClick={handleMessageProvider}
                    className="inline-flex items-center justify-center gap-2 rounded-[24px] border border-border bg-background px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                  >
                    <MessageIcon />
                    Message provider
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceDetailPage;
