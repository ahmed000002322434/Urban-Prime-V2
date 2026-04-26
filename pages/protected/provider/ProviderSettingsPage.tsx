import React, { useEffect, useState } from 'react';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';
import { providerApplicationService } from '../../../services/providerWorkspaceService';
import type { ProviderApplication } from '../../../types';
import { ProviderEmptyState, ProviderSurface } from './providerWorkspaceUi';

const ProviderSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [form, setForm] = useState({
    website: '',
    responseSlaHours: '24',
    languages: '',
    payoutReady: false,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const existing = await providerApplicationService.getMyApplication(user.id);
        if (cancelled) return;
        setApplication(existing || null);
        if (existing) {
          setForm({
            website: existing.website || '',
            responseSlaHours: String(existing.responseSlaHours || 24),
            languages: (existing.languages || []).join(', '),
            payoutReady: Boolean(existing.payoutReady),
            notes: existing.notes || ''
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

  const save = async () => {
    if (!application) return;
    setIsSaving(true);
    try {
      const updated = await providerApplicationService.updateApplication(application.id, {
        website: form.website,
        responseSlaHours: Number(form.responseSlaHours || 24),
        languages: form.languages.split(',').map((entry) => entry.trim()).filter(Boolean),
        payoutReady: form.payoutReady,
        notes: form.notes
      });
      setApplication(updated);
      showNotification('Provider settings updated.');
    } catch (error) {
      console.error(error);
      showNotification('Unable to update provider settings.');
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

  if (!application) {
    return (
      <ProviderEmptyState
        title="No provider profile yet"
        body="Start with onboarding to create a provider application before editing workspace settings."
        ctaLabel="Complete onboarding"
        ctaTo="/profile/provider/onboarding"
      />
    );
  }

  return (
    <ProviderSurface>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-text-primary">Website</span>
          <input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-text-primary">Response SLA (hours)</span>
          <input type="number" min={1} value={form.responseSlaHours} onChange={(event) => setForm((current) => ({ ...current, responseSlaHours: event.target.value }))} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-text-primary">Languages</span>
          <input value={form.languages} onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))} placeholder="English, Urdu, Arabic" className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3 lg:col-span-2">
          <input type="checkbox" checked={form.payoutReady} onChange={(event) => setForm((current) => ({ ...current, payoutReady: event.target.checked }))} />
          <span className="text-sm font-medium text-text-primary">Payout details are ready for review and settlement setup.</span>
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-text-primary">Internal notes</span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </label>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={() => void save()} disabled={isSaving} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </ProviderSurface>
  );
};

export default ProviderSettingsPage;
