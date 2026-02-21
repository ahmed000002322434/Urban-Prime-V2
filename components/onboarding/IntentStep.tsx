import React from 'react';
import StepCard from './StepCard';
import type { OnboardingIntent } from '../../types';

const intentOptions: Array<{
  id: OnboardingIntent;
  title: string;
  description: string;
  tags: string[];
}> = [
  { id: 'buy', title: 'Buy', description: 'Discover and purchase products.', tags: ['Checkout', 'Deals'] },
  { id: 'rent', title: 'Rent', description: 'Use items short-term with reminders.', tags: ['Flexible', 'Returns'] },
  { id: 'sell', title: 'Sell', description: 'Run listings and fulfill orders.', tags: ['Inventory', 'Analytics'] },
  { id: 'provide', title: 'Provide Services', description: 'Offer services and capture leads.', tags: ['Services', 'Leads'] },
  { id: 'affiliate', title: 'Affiliate', description: 'Promote products for commission.', tags: ['Links', 'Payouts'] }
];

interface IntentStepProps {
  value: OnboardingIntent[];
  onToggle: (intent: OnboardingIntent) => void;
}

const IntentStep: React.FC<IntentStepProps> = ({ value, onToggle }) => {
  const selected = new Set(value);

  return (
    <StepCard
      title="What do you want to do on Urban Prime?"
      description="Choose one or more intents. Setup and dashboard modules will adapt to this."
      eyebrow="Step 1"
      icon={<span aria-hidden="true">I</span>}
      hint="You can change intents later from Profile Hub."
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {intentOptions.map((option) => {
          const isActive = selected.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`group rounded-xl border p-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-primary bg-primary/15 shadow-[0_10px_25px_-12px_rgba(15,185,177,0.65)]'
                  : 'border-border bg-white/70 hover:border-primary/40 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-text-primary">{option.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isActive ? 'bg-primary text-white' : 'bg-surface-soft text-text-secondary'
                  }`}
                >
                  {isActive ? 'Selected' : 'Optional'}
                </span>
              </div>

              <p className="text-xs text-text-secondary">{option.description}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {option.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-surface-soft text-text-secondary group-hover:text-text-primary'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-text-secondary">Selected {value.length} of {intentOptions.length} intents.</p>
    </StepCard>
  );
};

export default IntentStep;
