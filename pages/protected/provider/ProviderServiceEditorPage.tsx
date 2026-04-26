import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import { HIERARCHICAL_SERVICE_CATEGORIES } from '../../../constants';
import { serviceService } from '../../../services/itemService';
import providerWorkspaceService from '../../../services/providerWorkspaceService';
import type { Service, ServicePricingModel, WorkFaq, WorkPortfolioItem, WorkServiceAreaCoverage } from '../../../types';
import { ProviderPageHeader, ProviderSurface } from './providerWorkspaceUi';

const blankPricingModel = (): ServicePricingModel => ({
  type: 'fixed',
  price: 0,
  description: 'Standard package'
});

const defaultService = (): Partial<Service> => ({
  title: '',
  description: '',
  category: '',
  imageUrls: [],
  pricingModels: [blankPricingModel()],
  mode: 'hybrid',
  fulfillmentKind: 'hybrid',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  availability: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weeklySchedule: {},
    blackoutDates: [],
    leadTimeHours: 24,
    serviceArea: [],
    notes: ''
  },
  details: {
    portfolio: [],
    faqs: [],
    policies: {
      cancellation: '',
      revisions: '',
      reschedule: '',
      delivery: ''
    },
    languages: [],
    responseSlaHours: 24,
    instantBookingEnabled: true,
    quoteEnabled: true
  }
});

const ProviderServiceEditorPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Service>>(defaultService());
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [mediaInput, setMediaInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [faqItems, setFaqItems] = useState<WorkFaq[]>([{ question: '', answer: '' }]);
  const [isLoading, setIsLoading] = useState(Boolean(serviceId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!serviceId) return;
      setIsLoading(true);
      try {
        const existing = await serviceService.getServiceById(serviceId);
        if (!existing || cancelled) return;
        setForm({
          ...existing,
          pricingModels: existing.pricingModels?.length ? existing.pricingModels : [blankPricingModel()],
          availability: {
            timezone: existing.availability?.timezone || existing.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            weeklySchedule: existing.availability?.weeklySchedule || {},
            blackoutDates: existing.availability?.blackoutDates || [],
            leadTimeHours: existing.availability?.leadTimeHours || 24,
            serviceArea: existing.availability?.serviceArea || [],
            notes: existing.availability?.notes || ''
          },
          details: {
            portfolio: existing.details?.portfolio || [],
            faqs: existing.details?.faqs || [],
            policies: existing.details?.policies || {
              cancellation: '',
              revisions: '',
              reschedule: '',
              delivery: ''
            },
            languages: existing.details?.languages || [],
            responseSlaHours: existing.details?.responseSlaHours || 24,
            instantBookingEnabled: existing.details?.instantBookingEnabled ?? true,
            quoteEnabled: existing.details?.quoteEnabled ?? true
          }
        });
        setServiceAreaInput((existing.availability?.serviceArea || []).map((entry) => entry.label).join(', '));
        setMediaInput((existing.imageUrls || []).join('\n'));
        setPortfolioInput((existing.details?.portfolio || []).map((entry) => entry.imageUrl || entry.link || '').filter(Boolean).join('\n'));
        setFaqItems(existing.details?.faqs?.length ? existing.details.faqs : [{ question: '', answer: '' }]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const categories = useMemo(
    () => HIERARCHICAL_SERVICE_CATEGORIES.flatMap((category) => category.subcategories || []),
    []
  );

  const updatePricingModel = (index: number, field: keyof ServicePricingModel, value: string | number) => {
    setForm((current) => {
      const next = [...(current.pricingModels || [])];
      next[index] = {
        ...next[index],
        [field]: field === 'price' || field === 'deliveryDays' || field === 'revisions' ? Number(value) : value
      };
      return { ...current, pricingModels: next };
    });
  };

  const syncStructuredFields = (base: Partial<Service>): Partial<Service> => {
    const serviceArea: WorkServiceAreaCoverage[] = serviceAreaInput
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => ({ kind: 'custom', label: entry }));
    const portfolio: WorkPortfolioItem[] = portfolioInput
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry, index) => ({
        id: `portfolio-${index + 1}`,
        title: `Portfolio ${index + 1}`,
        imageUrl: entry
      }));

    return {
      ...base,
      imageUrls: mediaInput.split('\n').map((entry) => entry.trim()).filter(Boolean),
      availability: {
        ...base.availability,
        timezone: base.availability?.timezone || base.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        serviceArea
      },
      details: {
        ...base.details,
        portfolio,
        faqs: faqItems.filter((entry) => entry.question.trim() && entry.answer.trim())
      }
    };
  };

  const save = async (submitForReview: boolean) => {
    if (!user) return;
    if (!form.title || !form.category) {
      showNotification('Title and category are required.');
      return;
    }

    setIsSaving(true);
    try {
      const normalized = syncStructuredFields(form);
      const status = submitForReview ? 'draft' : form.status || 'draft';
      const payload = {
        ...normalized,
        status
      };

      const saved = serviceId
        ? await serviceService.updateService(serviceId, payload, user)
        : await serviceService.addService(payload, user);

      const savedId = saved?.id || serviceId;
      if (!savedId) {
        throw new Error('Unable to resolve saved listing id.');
      }

      if (submitForReview) {
        await providerWorkspaceService.submitListingForReview(savedId);
        showNotification('Service submitted for review.');
      } else {
        showNotification('Service draft saved.');
      }

      navigate('/profile/provider/services');
    } catch (error) {
      console.error(error);
      showNotification(error instanceof Error ? error.message : 'Unable to save service.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProviderPageHeader
        eyebrow="Service Editor"
        title={serviceId ? 'Edit service' : 'Create service'}
        description="Build a moderated service listing with pricing, availability, portfolio proof, FAQs, and policies."
      />

      <ProviderSurface>
        <div className="grid gap-6 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Service title</span>
            <input value={form.title || ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Category</span>
            <select value={form.category || ''} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select category</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-semibold text-text-primary">Description</span>
            <textarea value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Mode</span>
            <select value={form.mode || 'hybrid'} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as Service['mode'] }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="instant">Instant packages</option>
              <option value="proposal">Proposal only</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Fulfillment</span>
            <select value={form.fulfillmentKind || 'hybrid'} onChange={(event) => setForm((current) => ({ ...current, fulfillmentKind: event.target.value as Service['fulfillmentKind'] }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="remote">Remote</option>
              <option value="local">Local</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
        </div>
      </ProviderSurface>

      <ProviderSurface>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Packages and pricing</h2>
            <p className="text-sm text-text-secondary">Add one or more packages. Hybrid services can mix instant booking and quote-based work.</p>
          </div>
          <button type="button" onClick={() => setForm((current) => ({ ...current, pricingModels: [...(current.pricingModels || []), blankPricingModel()] }))} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary">
            Add package
          </button>
        </div>
        <div className="mt-4 grid gap-4">
          {(form.pricingModels || []).map((model, index) => (
            <div key={`${index}-${model.description}`} className="grid gap-4 rounded-3xl border border-border bg-surface-soft p-4 md:grid-cols-4">
              <select value={model.type} onChange={(event) => updatePricingModel(index, 'type', event.target.value)} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
                <option value="custom_offer">Custom</option>
              </select>
              <input type="number" min={0} value={model.price} onChange={(event) => updatePricingModel(index, 'price', event.target.value)} placeholder="Price" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <input value={model.deliveryDays || ''} onChange={(event) => updatePricingModel(index, 'deliveryDays', event.target.value)} placeholder="Delivery days" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <input value={model.revisions || ''} onChange={(event) => updatePricingModel(index, 'revisions', event.target.value)} placeholder="Revisions" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <textarea value={model.description || ''} onChange={(event) => updatePricingModel(index, 'description', event.target.value)} rows={2} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary md:col-span-4" />
            </div>
          ))}
        </div>
      </ProviderSurface>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Availability and service area</h2>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Timezone</span>
              <input value={form.availability?.timezone || form.timezone || ''} onChange={(event) => setForm((current) => ({ ...current, availability: { ...current.availability, timezone: event.target.value }, timezone: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Lead time (hours)</span>
              <input type="number" min={1} value={form.availability?.leadTimeHours || 24} onChange={(event) => setForm((current) => ({ ...current, availability: { ...current.availability, leadTimeHours: Number(event.target.value || 24) } }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Service area</span>
              <input value={serviceAreaInput} onChange={(event) => setServiceAreaInput(event.target.value)} placeholder="City names, regions, or remote areas" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Availability notes</span>
              <textarea value={form.availability?.notes || ''} onChange={(event) => setForm((current) => ({ ...current, availability: { ...current.availability, notes: event.target.value } }))} rows={4} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Media and proof</h2>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Media URLs</span>
              <textarea value={mediaInput} onChange={(event) => setMediaInput(event.target.value)} rows={5} placeholder="One image URL per line" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Portfolio URLs</span>
              <textarea value={portfolioInput} onChange={(event) => setPortfolioInput(event.target.value)} rows={5} placeholder="One portfolio image or case study URL per line" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </ProviderSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProviderSurface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">FAQs</h2>
              <p className="text-sm text-text-secondary">Pre-answer common scope, timeline, or revision questions.</p>
            </div>
            <button type="button" onClick={() => setFaqItems((current) => [...current, { question: '', answer: '' }])} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary">
              Add FAQ
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            {faqItems.map((faq, index) => (
              <div key={`faq-${index}`} className="grid gap-3 rounded-3xl border border-border bg-surface-soft p-4">
                <input value={faq.question} onChange={(event) => setFaqItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, question: event.target.value } : entry))} placeholder="Question" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={faq.answer} onChange={(event) => setFaqItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, answer: event.target.value } : entry))} rows={3} placeholder="Answer" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
        </ProviderSurface>

        <ProviderSurface>
          <h2 className="text-lg font-bold text-text-primary">Policies</h2>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Cancellation policy</span>
              <textarea value={form.details?.policies?.cancellation || ''} onChange={(event) => setForm((current) => ({ ...current, details: { ...current.details, policies: { ...current.details?.policies, cancellation: event.target.value } } }))} rows={3} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Revision policy</span>
              <textarea value={form.details?.policies?.revisions || ''} onChange={(event) => setForm((current) => ({ ...current, details: { ...current.details, policies: { ...current.details?.policies, revisions: event.target.value } } }))} rows={3} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Reschedule policy</span>
              <textarea value={form.details?.policies?.reschedule || ''} onChange={(event) => setForm((current) => ({ ...current, details: { ...current.details, policies: { ...current.details?.policies, reschedule: event.target.value } } }))} rows={3} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Delivery or handoff</span>
              <textarea value={form.details?.policies?.delivery || ''} onChange={(event) => setForm((current) => ({ ...current, details: { ...current.details, policies: { ...current.details?.policies, delivery: event.target.value } } }))} rows={3} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </ProviderSurface>
      </div>

      <ProviderSurface>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Publish review</h2>
            <p className="text-sm text-text-secondary">Drafts stay private. Submission moves the listing into admin moderation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void save(false)} disabled={isSaving} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save draft'}
            </button>
            <button type="button" onClick={() => void save(true)} disabled={isSaving} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isSaving ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </div>
      </ProviderSurface>
    </div>
  );
};

export default ProviderServiceEditorPage;
