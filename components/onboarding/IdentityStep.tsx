import React from 'react';
import StepCard from './StepCard';

interface IdentityData {
  name?: string;
  phone?: string;
  country?: string;
  city?: string;
  currencyPreference?: string;
  avatarUrl?: string;
}

interface IdentityStepProps {
  value: IdentityData;
  onChange: (patch: Partial<IdentityData>) => void;
}

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const countries = ['United States', 'United Kingdom', 'United Arab Emirates', 'Pakistan', 'India', 'Canada', 'Germany'];
const currencies = ['USD', 'EUR', 'GBP', 'AED', 'PKR', 'INR', 'CAD'];

const IdentityStep: React.FC<IdentityStepProps> = ({ value, onChange }) => {
  const updateField = (key: keyof IdentityData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ [key]: event.target.value });
  };

  return (
    <StepCard
      title="Identity Basics"
      description="Complete your core profile so account actions and recommendations are personalized."
      eyebrow="Step 2"
      icon={<span aria-hidden="true">ID</span>}
      hint="Required before marketplace access."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Full Name</span>
          <input
            value={value.name || ''}
            onChange={updateField('name')}
            placeholder="e.g., Ahmed Ali"
            className={FIELD_CLASS}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Phone</span>
          <input
            value={value.phone || ''}
            onChange={updateField('phone')}
            placeholder="+14155552671"
            className={FIELD_CLASS}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Country</span>
          <select value={value.country || ''} onChange={updateField('country')} className={FIELD_CLASS}>
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">City</span>
          <input
            value={value.city || ''}
            onChange={updateField('city')}
            placeholder="e.g., New York"
            className={FIELD_CLASS}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Currency Preference</span>
          <select value={value.currencyPreference || ''} onChange={updateField('currencyPreference')} className={FIELD_CLASS}>
            <option value="">Select currency</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Avatar URL (Optional)</span>
          <input
            value={value.avatarUrl || ''}
            onChange={updateField('avatarUrl')}
            placeholder="https://..."
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-text-secondary">
        Use international phone format so notifications and verification can work.
      </div>
    </StepCard>
  );
};

export default IdentityStep;
