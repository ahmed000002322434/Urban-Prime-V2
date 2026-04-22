import React from 'react';
import StepCard from './StepCard';
import type { OnboardingIntent, RoleSetupDraft } from '../../types';

interface RoleSetupStepProps {
  intents: OnboardingIntent[];
  value: RoleSetupDraft;
  onChange: (patch: Partial<RoleSetupDraft>) => void;
}

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">{children}</p>
);

const RoleSetupStep: React.FC<RoleSetupStepProps> = ({ intents, value, onChange }) => {
  const hasSellerIntent = intents.includes('sell');
  const hasProviderIntent = intents.includes('provide');
  const hasAffiliateIntent = intents.includes('affiliate');
  const hasShipperIntent = intents.includes('ship');

  const updateField = (key: keyof RoleSetupDraft) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    onChange({ [key]: event.target.value });
  };

  return (
    <StepCard
      title="Role Setup"
      description="Fill only the fields required by your selected intents."
      eyebrow="Step 4"
      icon={<span aria-hidden="true">R</span>}
      hint="Short form to keep setup fast."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(hasSellerIntent || hasProviderIntent) && (
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <SectionTitle>Business</SectionTitle>
            <div className="space-y-2">
              <input
                value={value.businessName || ''}
                onChange={updateField('businessName')}
                placeholder="Business name"
                className={FIELD_CLASS}
              />
              <select value={value.industry || ''} onChange={updateField('industry')} className={FIELD_CLASS}>
                <option value="">Industry</option>
                <option value="fashion">Fashion</option>
                <option value="electronics">Electronics</option>
                <option value="home">Home & Living</option>
                <option value="sports">Sports & Outdoor</option>
                <option value="services">Professional Services</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {hasProviderIntent && (
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <SectionTitle>Provider</SectionTitle>
            <select value={value.experienceYears || ''} onChange={updateField('experienceYears')} className={FIELD_CLASS}>
              <option value="">Experience years</option>
              <option value="0-1">0-1</option>
              <option value="2-3">2-3</option>
              <option value="4-7">4-7</option>
              <option value="8-12">8-12</option>
              <option value="12+">12+</option>
            </select>
          </div>
        )}

        {hasAffiliateIntent && (
          <div className="rounded-xl border border-border bg-background/60 p-3 md:col-span-2">
            <SectionTitle>Affiliate</SectionTitle>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select value={value.channelType || ''} onChange={updateField('channelType')} className={FIELD_CLASS}>
                <option value="">Primary channel</option>
                <option value="social">Social media</option>
                <option value="video">Video</option>
                <option value="blog">Blog</option>
                <option value="email">Email</option>
                <option value="community">Community</option>
              </select>
              <input value={value.goals || ''} onChange={updateField('goals')} placeholder="Goals" className={FIELD_CLASS} />
            </div>
          </div>
        )}

        {hasShipperIntent && (
          <div className="rounded-xl border border-border bg-background/60 p-3 md:col-span-2">
            <SectionTitle>Shipper</SectionTitle>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input value={value.shippingZone || ''} onChange={updateField('shippingZone')} placeholder="Primary shipping zone" className={FIELD_CLASS} />
              <input value={value.fleetSize || ''} onChange={updateField('fleetSize')} placeholder="Fleet size (or partner capacity)" className={FIELD_CLASS} />
              <input value={value.vehicleType || ''} onChange={updateField('vehicleType')} placeholder="Vehicle type (bike/van/truck)" className={FIELD_CLASS} />
              <select value={value.dispatchMode || ''} onChange={updateField('dispatchMode')} className={FIELD_CLASS}>
                <option value="">Dispatch mode</option>
                <option value="in_house">In-house dispatch</option>
                <option value="third_party">Third-party courier</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-background/60 p-3 md:col-span-2">
          <SectionTitle>Public Profile (Optional)</SectionTitle>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input value={value.handle || ''} onChange={updateField('handle')} placeholder="Handle" className={FIELD_CLASS} />
            <input value={value.about || ''} onChange={updateField('about')} placeholder="Short bio" className={FIELD_CLASS} />
          </div>
        </div>
      </div>
    </StepCard>
  );
};

export default RoleSetupStep;
