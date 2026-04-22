import type { OnboardingIntent, RoleSetupDraft } from '../types';

export const createRoleSetupDefaults = (): RoleSetupDraft => ({
  displayName: '',
  handle: '',
  businessName: '',
  businessDescription: '',
  website: '',
  phone: '',
  city: '',
  country: '',
  industry: '',
  experienceYears: '',
  teamSize: '',
  monthlyVolume: '',
  about: '',
  goals: '',
  channelType: '',
  sellerHandle: '',
  providerHandle: '',
  affiliateHandle: ''
  ,
  shippingZone: '',
  fleetSize: '',
  vehicleType: '',
  dispatchMode: ''
});

export const getRequiredRoleSetupFields = (intents: OnboardingIntent[]): string[] => {
  const requirements = new Set<string>();
  const normalized = new Set(intents);

  if (normalized.has('sell')) {
    requirements.add('businessName');
    requirements.add('industry');
  }

  if (normalized.has('provide')) {
    requirements.add('industry');
    requirements.add('experienceYears');
  }

  if (normalized.has('affiliate')) {
    requirements.add('channelType');
    requirements.add('goals');
  }

  if (normalized.has('ship')) {
    requirements.add('shippingZone');
    requirements.add('fleetSize');
  }

  return Array.from(requirements);
};

export const getRoleFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    businessName: 'Business name',
    industry: 'Industry',
    experienceYears: 'Experience years',
    channelType: 'Channel type',
    goals: 'Goals',
    shippingZone: 'Shipping zone',
    fleetSize: 'Fleet size'
  };

  return labels[field] || field;
};

export const validateRoleSetupDraft = (
  intents: OnboardingIntent[],
  roleSetup: RoleSetupDraft
): string[] => {
  const requiredFields = getRequiredRoleSetupFields(intents);
  const missing: string[] = [];

  requiredFields.forEach((field) => {
    const value = roleSetup[field as keyof RoleSetupDraft];
    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(field);
    }
  });

  return missing;
};
