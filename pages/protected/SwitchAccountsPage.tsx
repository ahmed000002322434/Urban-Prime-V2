import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import type { OnboardingIntent, PersonaType, RoleSetupDraft, User } from '../../types';
import { createRoleSetupDefaults, getRoleFieldLabel, validateRoleSetupDraft } from '../../utils/onboardingRoleSetup';

type PersonaBlueprint = {
    type: PersonaType;
    title: string;
    subtitle: string;
    highlight: string;
    capabilities: string[];
    requirements: string[];
    helpTopic: string;
};

const personaBlueprints: PersonaBlueprint[] = [
    {
        type: 'seller',
        title: 'Seller Workspace',
        subtitle: 'Launch products, manage listings, and track conversion.',
        highlight: 'Best for physical or digital product businesses.',
        capabilities: ['Publish listings', 'Manage inventory', 'Track sales and cart intent', 'Receive order notifications'],
        requirements: ['Business/store name', 'Primary selling category', 'Country and phone', 'Estimated monthly order volume'],
        helpTopic: 'seller-onboarding'
    },
    {
        type: 'provider',
        title: 'Provider Workspace',
        subtitle: 'Offer services, handle bookings, and manage fulfillment.',
        highlight: 'Best for freelancers, studios, and service teams.',
        capabilities: ['List services', 'Receive booking requests', 'Manage service calendar', 'Collect fulfillment reviews'],
        requirements: ['Service business name', 'Service category', 'Service region', 'Experience details'],
        helpTopic: 'provider-onboarding'
    },
    {
        type: 'affiliate',
        title: 'Affiliate Workspace',
        subtitle: 'Promote marketplace items and track commissions.',
        highlight: 'Best for creators, communities, and media channels.',
        capabilities: ['Create referral links', 'Track conversion analytics', 'Request payouts', 'Run campaign links'],
        requirements: ['Public creator name', 'Traffic/source channel', 'Country', 'Promotion goals'],
        helpTopic: 'affiliate-onboarding'
    },
    {
        type: 'consumer',
        title: 'Consumer Workspace',
        subtitle: 'Buy and rent with a dedicated shopper profile.',
        highlight: 'Default workspace for checkout, wishlist, and order tracking.',
        capabilities: ['Checkout products', 'Rent available items', 'Track purchases and bookings', 'Save carts and wishlists'],
        requirements: ['Contact details', 'Location basics', 'Shopping preferences'],
        helpTopic: 'consumer-workspace'
    }
];

const initialForm: RoleSetupDraft = createRoleSetupDefaults();

const personaTypeToIntent = (type: PersonaType): OnboardingIntent => {
    if (type === 'seller') return 'sell';
    if (type === 'provider') return 'provide';
    if (type === 'affiliate') return 'affiliate';
    return 'buy';
};

const formatPersonaLabel = (type: PersonaType): string => {
    if (type === 'consumer') return 'Consumer';
    if (type === 'seller') return 'Seller';
    if (type === 'provider') return 'Provider';
    return 'Affiliate';
};

const normalizeHandle = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_\-]/g, '')
        .slice(0, 30);

const SwitchAccountsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, personas, activePersona, setActivePersona, createPersona, updateUser } = useAuth();

    const [selectedType, setSelectedType] = useState<PersonaType>('seller');
    const [form, setForm] = useState<RoleSetupDraft>(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const selectedBlueprint = useMemo(
        () => personaBlueprints.find((item) => item.type === selectedType) || personaBlueprints[0],
        [selectedType]
    );

    const existingPersona = useMemo(
        () => personas.find((persona) => persona.type === selectedType) || null,
        [personas, selectedType]
    );

    const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUsePersona = async (personaId: string) => {
        setError(null);
        setSuccess(null);
        try {
            await setActivePersona(personaId);
            setSuccess('Active workspace updated.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to switch workspace right now.');
        }
    };

    const pushProfileUpdates = async (currentUser: User, payload: RoleSetupDraft) => {
        const updates: Partial<User> = {
            phone: payload.phone || currentUser.phone,
            city: payload.city || currentUser.city,
            country: payload.country || currentUser.country,
            businessName: payload.businessName || currentUser.businessName,
            businessDescription: payload.about || currentUser.businessDescription
        };

        const hasUpdate = Object.values(updates).some((value) => value !== undefined && value !== null && String(value).trim() !== '');
        if (!hasUpdate) return;

        const updated = await userService.updateUserProfile(currentUser.id, updates);
        updateUser(updated);
    };

    const handleCreatePersona = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            setError('You must be signed in.');
            return;
        }

        setError(null);
        setSuccess(null);

        const sanitizedHandle = normalizeHandle(form.handle || form.displayName || form.businessName || `${selectedType}-${Date.now()}`);
        const displayName = form.displayName || form.businessName || `${user.name} ${formatPersonaLabel(selectedType)}`;

        if (!displayName.trim()) {
            setError('Display name is required.');
            return;
        }

        const requiredFields = validateRoleSetupDraft([personaTypeToIntent(selectedType)], form);
        if (requiredFields.length > 0) {
            setError(`Missing required fields: ${requiredFields.map(getRoleFieldLabel).join(', ')}`);
            return;
        }

        try {
            setIsSubmitting(true);

            if (existingPersona) {
                await setActivePersona(existingPersona.id);
                await pushProfileUpdates(user, form);
                setSuccess(`${formatPersonaLabel(selectedType)} workspace is now active.`);
                return;
            }

            const created = await createPersona(selectedType, {
                displayName,
                handle: sanitizedHandle,
                bio: form.about,
                settings: {
                    profile: {
                        businessName: form.businessName,
                        website: form.website,
                        phone: form.phone,
                        city: form.city,
                        country: form.country,
                        industry: form.industry,
                        teamSize: form.teamSize,
                        monthlyVolume: form.monthlyVolume
                    },
                    operations: {
                        experienceYears: form.experienceYears,
                        goals: form.goals
                    }
                },
                verification: {
                    submittedAt: new Date().toISOString(),
                    status: selectedType === 'consumer' ? 'approved' : 'pending_review'
                }
            });

            await pushProfileUpdates(user, form);
            await setActivePersona(created.id);
            setSuccess(`${formatPersonaLabel(selectedType)} workspace created and activated.`);
            setForm(initialForm);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create workspace.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-bold font-display text-text-primary">Account Workspaces</h1>
                    <p className="text-sm text-text-secondary mt-1">Create dedicated seller, provider, affiliate, or consumer workspaces under one login.</p>
                </div>
            </div>

            <section className="bg-surface border border-border rounded-2xl shadow-soft p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-text-primary">Choose your next workspace</h2>
                <p className="text-sm text-text-secondary mt-1">Each workspace has independent permissions, onboarding data, and dashboard controls.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    {personaBlueprints.map((blueprint) => {
                        const isActive = selectedType === blueprint.type;
                        const alreadyCreated = personas.some((persona) => persona.type === blueprint.type);

                        return (
                            <button
                                key={blueprint.type}
                                type="button"
                                onClick={() => setSelectedType(blueprint.type)}
                                className={`text-left rounded-2xl border p-4 transition-all ${
                                    isActive
                                        ? 'border-primary bg-primary/10 shadow-md'
                                        : 'border-border hover:border-primary/40 bg-surface-soft'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-text-primary">{blueprint.title}</p>
                                        <p className="text-sm text-text-secondary mt-1">{blueprint.subtitle}</p>
                                    </div>
                                    {alreadyCreated && (
                                        <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-1 bg-emerald-500/15 text-emerald-600 font-semibold">
                                            Created
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-text-secondary mt-3">{blueprint.highlight}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="bg-surface border border-border rounded-2xl shadow-soft p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-text-primary">{selectedBlueprint.title} setup</h2>
                        <p className="text-sm text-text-secondary mt-1">{selectedBlueprint.highlight}</p>
                    </div>
                    <Link
                        to={`/help?topic=${encodeURIComponent(selectedBlueprint.helpTopic)}`}
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Learn more about this setup
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="rounded-xl border border-border bg-surface-soft p-4">
                        <h3 className="font-semibold text-text-primary">What you get</h3>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                            {selectedBlueprint.capabilities.map((capability) => (
                                <li key={capability}>- {capability}</li>
                            ))}
                        </ul>

                        <h3 className="font-semibold text-text-primary mt-6">Information required</h3>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                            {selectedBlueprint.requirements.map((requirement) => (
                                <li key={requirement}>- {requirement}</li>
                            ))}
                        </ul>
                    </div>

                    <form onSubmit={handleCreatePersona} className="space-y-4 rounded-xl border border-border bg-surface-soft p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                name="displayName"
                                value={form.displayName}
                                onChange={handleFormChange}
                                placeholder="Workspace display name"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="handle"
                                value={form.handle}
                                onChange={handleFormChange}
                                placeholder="Public handle (optional)"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                name="businessName"
                                value={form.businessName}
                                onChange={handleFormChange}
                                placeholder="Business or brand name"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="industry"
                                value={form.industry}
                                onChange={handleFormChange}
                                placeholder="Primary category / industry"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                name="website"
                                value={form.website}
                                onChange={handleFormChange}
                                placeholder="Website or profile URL"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleFormChange}
                                placeholder="Phone number"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                name="city"
                                value={form.city}
                                onChange={handleFormChange}
                                placeholder="City"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="country"
                                value={form.country}
                                onChange={handleFormChange}
                                placeholder="Country"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                name="experienceYears"
                                value={form.experienceYears}
                                onChange={handleFormChange}
                                placeholder="Years of experience"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="teamSize"
                                value={form.teamSize}
                                onChange={handleFormChange}
                                placeholder="Team size"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                            <input
                                name="monthlyVolume"
                                value={form.monthlyVolume}
                                onChange={handleFormChange}
                                placeholder="Monthly volume target"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                            />
                        </div>

                        <textarea
                            name="about"
                            value={form.about}
                            onChange={handleFormChange}
                            placeholder="Describe your business, offerings, and operating model"
                            rows={4}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        />

                        <textarea
                            name="goals"
                            value={form.goals}
                            onChange={handleFormChange}
                            placeholder="What are your first 90-day goals?"
                            rows={3}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        />

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {success && <p className="text-sm text-emerald-600">{success}</p>}

                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {isSubmitting ? <Spinner size="sm" /> : existingPersona ? 'Activate workspace' : `Create ${formatPersonaLabel(selectedType)} workspace`}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
                            >
                                Back to dashboard
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <section className="bg-surface border border-border rounded-2xl shadow-soft p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-text-primary">Existing workspaces</h2>
                <p className="text-sm text-text-secondary mt-1">Switch instantly between active workspaces.</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {personas.map((persona) => {
                        const isCurrent = activePersona?.id === persona.id;
                        return (
                            <div key={persona.id} className={`rounded-xl border p-4 ${isCurrent ? 'border-primary bg-primary/10' : 'border-border bg-surface-soft'}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-text-primary">{persona.displayName}</p>
                                        <p className="text-xs text-text-secondary">{formatPersonaLabel(persona.type)} - {persona.status}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleUsePersona(persona.id)}
                                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
                                    >
                                        {isCurrent ? 'Active' : 'Use this'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default SwitchAccountsPage;
