import React from 'react';
import StepCard from './StepCard';
import { CATEGORIES } from '../../constants';

interface PreferencesStepProps {
  value: string[];
  onToggle: (interestId: string) => void;
}

const extraInterests = [
  { id: 'local-deals', name: 'Local Deals' },
  { id: 'premium-rentals', name: 'Premium Rentals' },
  { id: 'new-arrivals', name: 'New Arrivals' },
  { id: 'creator-tools', name: 'Creator Tools' }
];

const PreferencesStep: React.FC<PreferencesStepProps> = ({ value, onToggle }) => {
  const selected = new Set(value);
  const baseOptions = CATEGORIES.slice(0, 12).map((entry) => ({
    id: entry.id,
    name: entry.name
  }));
  const options = [...baseOptions, ...extraInterests];

  return (
    <StepCard
      title="Personalize your feed"
      description="Pick interests to shape discovery, ranking, recommendations, and alerts."
      eyebrow="Step 3"
      icon={<span aria-hidden="true">P</span>}
      hint="Select at least one."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((option) => {
          const isActive = selected.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                isActive
                  ? 'border-primary bg-primary/15 text-primary shadow-[0_10px_20px_-16px_rgba(15,185,177,0.8)]'
                  : 'border-border bg-white/70 text-text-secondary hover:border-primary/35 hover:text-text-primary dark:bg-slate-900/60'
              }`}
            >
              <span className="block truncate">{option.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-text-secondary">
        <span>{selected.size} selected</span>
        <span>Used to tune homepage and notifications.</span>
      </div>
    </StepCard>
  );
};

export default PreferencesStep;
