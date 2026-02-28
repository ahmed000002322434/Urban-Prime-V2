import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { serviceService } from '../../services/itemService';
import type { Service, ServicePricingModel } from '../../types';
import Spinner from '../../components/Spinner';
import ServiceBookingModal from '../../components/ServiceBookingModal';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const packageLabel = (model: ServicePricingModel) => {
  if (model.type === 'hourly') return 'Hourly';
  if (model.type === 'fixed') return 'Fixed';
  return 'Custom offer';
};

const getServiceMinPrice = (service: Service) => {
  const prices = (service.pricingModels || []).map((entry) => Number(entry.price || 0)).filter((entry) => entry > 0);
  if (prices.length === 0) return 0;
  return Math.min(...prices);
};

const getServiceCurrency = (service: Service) => service.currency || service.pricingModels?.[0]?.currency || 'USD';

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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
        const resolved = serviceRow || null;
        setService(resolved);
        if (resolved) {
          const nextRelated = (allServices || [])
            .filter((entry) => entry.id !== resolved.id && entry.category === resolved.category)
            .slice(0, 3);
          setRelatedServices(nextRelated);
        } else {
          setRelatedServices([]);
        }
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
    return badges;
  }, [service]);

  const handleBookNow = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleMessageProvider = () => {
    if (!service) return;
    if (!user) {
      openAuthModal('login');
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
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Service not found</h1>
        <p className="mt-2 text-sm text-text-secondary">This service may have been removed or is unavailable right now.</p>
        <Link to="/browse/services" className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          Back to services
        </Link>
      </div>
    );
  }

  const minPrice = getServiceMinPrice(service);
  const currency = getServiceCurrency(service);
  const heroImage = service.imageUrls?.[0] || '/icons/urbanprime.svg';

  return (
    <>
      {isBookingModalOpen ? <ServiceBookingModal service={service} onClose={() => setIsBookingModalOpen(false)} /> : null}
      <div className="min-h-screen bg-background pb-24 text-text-primary">
        <section className="relative h-[48vh] min-h-[340px] w-full overflow-hidden">
          <img src={heroImage} alt={service.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
          <div className="absolute left-4 top-4 z-20">
            <BackButton className="rounded-full border border-white/35 bg-black/35 px-3 py-1.5 text-white backdrop-blur-sm" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <p className="inline-flex rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
              {service.category || 'Service'}
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">{service.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/85">
              <span className="inline-flex items-center gap-1">
                <StarIcon /> {Number(service.avgRating || 0).toFixed(1)}
              </span>
              <span>{service.reviews?.length || 0} reviews</span>
              <span>{service.provider?.name || 'Provider'}</span>
              <span>
                {currency} {minPrice > 0 ? `${minPrice.toLocaleString()}+` : 'Quote'}
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[1.75fr_1fr] lg:px-8">
          <main className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-xl font-bold">About this service</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{service.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {featureBadges.map((badge) => (
                  <span key={badge} className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                    {badge}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-xl font-bold">Packages and pricing</h2>
              <div className="mt-4 space-y-3">
                {(service.pricingModels || []).map((model, index) => (
                  <div key={`${model.type}-${index}`} className="rounded-xl border border-border bg-surface-soft p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">{packageLabel(model)}</p>
                      <p className="text-xl font-black text-text-primary">
                        {model.currency || currency} {Number(model.price || 0).toLocaleString()}
                      </p>
                    </div>
                    {model.description ? <p className="mt-2 text-sm text-text-secondary">{model.description}</p> : null}
                  </div>
                ))}
              </div>
            </section>

            {relatedServices.length > 0 ? (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <h2 className="text-xl font-bold">Related services</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {relatedServices.map((related) => (
                    <Link
                      key={related.id}
                      to={`/service/${related.id}`}
                      className="overflow-hidden rounded-xl border border-border bg-surface-soft transition hover:-translate-y-0.5 hover:border-primary/35"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden">
                        <img src={related.imageUrls?.[0] || '/icons/urbanprime.svg'} alt={related.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-text-primary">{related.title}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {getServiceCurrency(related)} {getServiceMinPrice(related).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="space-y-4">
            <div className="sticky top-24 space-y-4">
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Starting at</p>
                <p className="mt-2 text-3xl font-black text-text-primary">
                  {currency} {minPrice > 0 ? minPrice.toLocaleString() : 'Quote'}
                </p>
                <p className="mt-1 text-xs text-text-secondary">Final quote depends on package, timeline, and scope.</p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button onClick={handleBookNow} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:brightness-110">
                    Hire now
                  </button>
                  <button
                    onClick={handleMessageProvider}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface"
                  >
                    <MessageIcon /> Message provider
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">Provider</h3>
                <div className="mt-3 flex items-center gap-3">
                  <img src={service.provider?.avatar || '/icons/urbanprime.svg'} alt={service.provider?.name || 'Provider'} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-text-primary">{service.provider?.name || 'Provider'}</p>
                    <p className="text-xs text-text-secondary">Rating {Number(service.provider?.rating || service.avgRating || 0).toFixed(1)}</p>
                  </div>
                </div>
                <Link
                  to={`/user/${service.provider?.id || ''}`}
                  className="mt-4 inline-flex rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface"
                >
                  View provider profile
                </Link>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default ServiceDetailPage;
