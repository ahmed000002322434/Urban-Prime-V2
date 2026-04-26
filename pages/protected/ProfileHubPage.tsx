import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';
import { CATEGORIES } from '../../constants';
import profileOnboardingService from '../../services/profileOnboardingService';
import type { OnboardingIntent, RoleSetupDraft } from '../../types';
import { createRoleSetupDefaults } from '../../utils/onboardingRoleSetup';
import { ClayButton, ClayInput } from '../../components/dashboard/clay';

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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-5 shadow-[0_24px_48px_rgba(224,196,196,0.1),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_24px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#9d6f8c] dark:text-[#e5bc9e]">Profile hub</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-[2rem]">
              Keep every workspace ready to go
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-text-secondary sm:text-[0.96rem]">
              Update identity, interests, and role setup in one place so the rest of the dashboard stays personalized and complete.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#ece2e7] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8c8293] dark:text-[#a8a0ac]">Intents</p>
              <p className="mt-1 text-xl font-black text-text-primary">{selectedIntents.length}</p>
            </div>
            <div className="rounded-[22px] border border-[#ece2e7] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8c8293] dark:text-[#a8a0ac]">Interests</p>
              <p className="mt-1 text-xl font-black text-text-primary">{interests.length}</p>
            </div>
            <div className="rounded-[22px] border border-[#ece2e7] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8c8293] dark:text-[#a8a0ac]">Role setup</p>
              <p className="mt-1 text-xl font-black text-text-primary">{hasRoleIntent ? 'Live' : 'Basic'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="clay-card clay-size-lg">
        <h2 className="text-lg font-semibold text-text-primary">Intent</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {intentOptions.map((intent) => {
            const active = selectedIntents.includes(intent.id);
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => toggleIntent(intent.id)}
                className={`clay-button clay-size-sm is-interactive ${active ? 'clay-button-primary' : 'clay-button-ghost'}`}
              >
                {intent.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="clay-card clay-size-lg">
        <h2 className="text-lg font-semibold text-text-primary">Identity Basics</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClayInput value={identity.name} onChange={updateIdentity('name')} placeholder="Name" />
          <ClayInput value={identity.phone} onChange={updateIdentity('phone')} placeholder="Phone (+14155552671)" />
          <ClayInput value={identity.city} onChange={updateIdentity('city')} placeholder="City" />
          <ClayInput value={identity.country} onChange={updateIdentity('country')} placeholder="Country" />
          <ClayInput value={identity.currencyPreference} onChange={updateIdentity('currencyPreference')} placeholder="Currency preference (e.g. USD)" />
          <ClayInput type="date" value={identity.dob} onChange={updateIdentity('dob')} />
          <ClayInput as="select" value={identity.gender} onChange={updateIdentity('gender')}>
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </ClayInput>
          <ClayInput value={identity.businessName} onChange={updateIdentity('businessName')} placeholder="Business name" />
        </div>
        <ClayInput as="textarea" value={identity.about} onChange={updateIdentity('about')} rows={3} placeholder="About" className="mt-3" />
        <ClayInput as="textarea" value={identity.businessDescription} onChange={updateIdentity('businessDescription')} rows={3} placeholder="Business description" className="mt-3" />
      </section>

      <section className="clay-card clay-size-lg">
        <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 20).map((category) => {
            const active = interests.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleInterest(category.id)}
                className={`clay-button clay-size-sm is-interactive ${active ? 'clay-button-primary' : 'clay-button-ghost'}`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      {hasRoleIntent && (
        <section className="clay-card clay-size-lg">
          <h2 className="text-lg font-semibold text-text-primary">Role Setup</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ClayInput value={roleSetup.industry || ''} onChange={updateRoleSetup('industry')} placeholder="Industry" />
            <ClayInput value={roleSetup.experienceYears || ''} onChange={updateRoleSetup('experienceYears')} placeholder="Experience years" />
            <ClayInput value={roleSetup.channelType || ''} onChange={updateRoleSetup('channelType')} placeholder="Channel type (affiliate)" />
            <ClayInput value={roleSetup.handle || ''} onChange={updateRoleSetup('handle')} placeholder="Public handle" />
          </div>
          <ClayInput as="textarea" value={roleSetup.goals || ''} onChange={updateRoleSetup('goals')} rows={3} placeholder="Goals" className="mt-3" />
        </section>
      )}

      <div className="flex items-center gap-3">
        <ClayButton type="button" onClick={handleSave} disabled={isSaving} variant="primary">
          {isSaving ? <Spinner size="sm" /> : 'Save profile hub'}
        </ClayButton>
        {status ? (
          <p className="rounded-full border border-[#ece2e7] bg-white/80 px-3 py-1.5 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.04]">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileHubPage;
