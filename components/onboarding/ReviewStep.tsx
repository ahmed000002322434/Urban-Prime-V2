import React from 'react';
import StepCard from './StepCard';
import type { OnboardingDraft, OnboardingIntent } from '../../types';

interface ReviewStepProps {
  intents: OnboardingIntent[];
  draft: OnboardingDraft;
  missingRequiredFields: string[];
}

const SummaryBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-border bg-background/60 p-3">
    <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">{title}</p>
    <div className="space-y-1 text-sm text-text-primary">{children}</div>
  </div>
);

const ReviewStep: React.FC<ReviewStepProps> = ({ intents, draft, missingRequiredFields }) => {
  const identity = draft.identity || {};
  const preferences = draft.preferences || {};
  const roleSetup = draft.roleSetup || {};

  return (
    <StepCard
      title="Review and Confirm"
      description="Check details before finishing setup. Everything remains editable later in Profile Hub."
      eyebrow="Step 5"
      icon={<span aria-hidden="true">OK</span>}
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <SummaryBlock title="Selected Intents">
          <p>{intents.length > 0 ? intents.join(', ') : 'None selected'}</p>
        </SummaryBlock>

        <SummaryBlock title="Identity">
          <p>{identity.name || 'No name'} - {identity.phone || 'No phone'}</p>
          <p>{identity.city || 'No city'}, {identity.country || 'No country'}</p>
          <p>Currency: {identity.currencyPreference || 'Not set'}</p>
        </SummaryBlock>

        <SummaryBlock title="Preferences">
          <p>{preferences.interests && preferences.interests.length > 0 ? preferences.interests.join(', ') : 'No interests selected'}</p>
        </SummaryBlock>

        <SummaryBlock title="Role Setup">
          <p>{roleSetup.businessName || 'No business name'}</p>
          <p>{roleSetup.industry || 'No industry selected'}</p>
          <p>{roleSetup.channelType || 'No channel selected'}</p>
        </SummaryBlock>
      </div>

      {missingRequiredFields.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Missing required fields: {missingRequiredFields.join(', ')}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Looks good. Submit to activate your profile.
        </div>
      )}
    </StepCard>
  );
};

export default ReviewStep;
