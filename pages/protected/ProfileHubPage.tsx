import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';
import { CATEGORIES } from '../../constants';
import profileOnboardingService from '../../services/profileOnboardingService';
import type { OnboardingIntent, RoleSetupDraft } from '../../types';
import { createRoleSetupDefaults } from '../../utils/onboardingRoleSetup';

const intentOptions: Array<{ id: OnboardingIntent; label: string }> = [
  { id: 'buy', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'sell', label: 'Sell' },
  { id: 'provide', label: 'Provide services' },
  { id: 'affiliate', label: 'Affiliate' }
];

const ProfileHubPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedIntents, setSelectedIntents] = useState<OnboardingIntent[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [roleSetup, setRoleSetup] = useState<RoleSetupDraft>(createRoleSetupDefaults());

  const [identity, setIdentity] = useState({
    name: '',
    phone: '',
    city: '',
    country: '',
    currencyPreference: '',
    dob: '',
    gender: '',
    about: '',
    businessName: '',
    businessDescription: ''
  });

  useEffect(() => {
    if (!user) return;
    setIdentity((current) => ({
      ...current,
      name: user.name || '',
      phone: user.phone || '',
      city: user.city || '',
      country: user.country || '',
      currencyPreference: user.currencyPreference || '',
      dob: user.dob || '',
      gender: user.gender || '',
      about: user.about || '',
      businessName: user.businessName || '',
      businessDescription: user.businessDescription || ''
    }));
    setInterests(user.interests || []);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadOnboardingContext = async () => {
      try {
        const response = await profileOnboardingService.getOnboardingState();
        if (cancelled) return;
        if (response.state?.selectedIntents) {
          setSelectedIntents(response.state.selectedIntents);
        }
        if (response.state?.draft?.roleSetup) {
          setRoleSetup((current) => ({ ...current, ...response.state!.draft.roleSetup }));
        }
      } catch (error) {
        console.error('Failed to load profile hub context:', error);
      }
    };

    loadOnboardingContext();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRoleIntent = useMemo(
    () => selectedIntents.some((intent) => ['sell', 'provide', 'affiliate'].includes(intent)),
    [selectedIntents]
  );

  const toggleIntent = (intent: OnboardingIntent) => {
    setSelectedIntents((current) =>
      current.includes(intent)
        ? current.filter((value) => value !== intent)
        : [...current, intent]
    );
  };

  const toggleInterest = (interestId: string) => {
    setInterests((current) =>
      current.includes(interestId)
        ? current.filter((id) => id !== interestId)
        : [...current, interestId]
    );
  };

  const updateIdentity = (field: keyof typeof identity) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setIdentity((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateRoleSetup = (field: keyof RoleSetupDraft) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setRoleSetup((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    setStatus(null);
    setIsSaving(true);

    try {
      await profileOnboardingService.patchProfileMe({
        name: identity.name,
        phone: identity.phone,
        city: identity.city,
        country: identity.country,
        currencyPreference: identity.currencyPreference,
        dob: identity.dob || null,
        gender: identity.gender || null,
        about: identity.about || null,
        businessName: identity.businessName || null,
        businessDescription: identity.businessDescription || null,
        interests,
        purpose: selectedIntents.join(',')
      });

      await profileOnboardingService.saveOnboardingState({
        currentStep: 'review',
        selectedIntents,
        draft: {
          identity: {
            name: identity.name,
            phone: identity.phone,
            city: identity.city,
            country: identity.country,
            currencyPreference: identity.currencyPreference
          },
          preferences: {
            interests
          },
          roleSetup
        }
      });

      await refreshProfile();
      setStatus('Profile hub changes saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save profile hub changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Profile Hub</h1>
        <p className="mt-1 text-sm text-text-secondary">Edit all onboarding fields from one place.</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-text-primary">Intent</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {intentOptions.map((intent) => {
            const active = selectedIntents.includes(intent.id);
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => toggleIntent(intent.id)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'
                }`}
              >
                {intent.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-text-primary">Identity Basics</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={identity.name} onChange={updateIdentity('name')} placeholder="Name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <input value={identity.phone} onChange={updateIdentity('phone')} placeholder="Phone (+14155552671)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <input value={identity.city} onChange={updateIdentity('city')} placeholder="City" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <input value={identity.country} onChange={updateIdentity('country')} placeholder="Country" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <input value={identity.currencyPreference} onChange={updateIdentity('currencyPreference')} placeholder="Currency preference (e.g. USD)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <input type="date" value={identity.dob} onChange={updateIdentity('dob')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          <select value={identity.gender} onChange={updateIdentity('gender')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary">
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          <input value={identity.businessName} onChange={updateIdentity('businessName')} placeholder="Business name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
        </div>
        <textarea value={identity.about} onChange={updateIdentity('about')} rows={3} placeholder="About" className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
        <textarea value={identity.businessDescription} onChange={updateIdentity('businessDescription')} rows={3} placeholder="Business description" className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 20).map((category) => {
            const active = interests.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleInterest(category.id)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      {hasRoleIntent && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-text-primary">Role Setup</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={roleSetup.industry || ''} onChange={updateRoleSetup('industry')} placeholder="Industry" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
            <input value={roleSetup.experienceYears || ''} onChange={updateRoleSetup('experienceYears')} placeholder="Experience years" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
            <input value={roleSetup.channelType || ''} onChange={updateRoleSetup('channelType')} placeholder="Channel type (affiliate)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
            <input value={roleSetup.handle || ''} onChange={updateRoleSetup('handle')} placeholder="Public handle" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
          </div>
          <textarea value={roleSetup.goals || ''} onChange={updateRoleSetup('goals')} rows={3} placeholder="Goals" className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary" />
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? <Spinner size="sm" /> : 'Save profile hub'}
        </button>
        {status && <p className="text-sm text-text-secondary">{status}</p>}
      </div>
    </div>
  );
};

export default ProfileHubPage;
