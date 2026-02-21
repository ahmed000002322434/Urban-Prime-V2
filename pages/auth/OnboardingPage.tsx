import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import IntentStep from '../../components/onboarding/IntentStep';
import IdentityStep from '../../components/onboarding/IdentityStep';
import PreferencesStep from '../../components/onboarding/PreferencesStep';
import RoleSetupStep from '../../components/onboarding/RoleSetupStep';
import ReviewStep from '../../components/onboarding/ReviewStep';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../hooks/useAuth';
import profileOnboardingService from '../../services/profileOnboardingService';
import type { OnboardingDraft, OnboardingIntent, OnboardingStepId } from '../../types';
import { createRoleSetupDefaults, getRoleFieldLabel, validateRoleSetupDraft } from '../../utils/onboardingRoleSetup';

const ONBOARDING_PRESET_KEY = 'urbanprime_onboarding_preset_v2';
const ONBOARDING_LOCAL_STATE_KEY = 'urbanprime_onboarding_local_state_v2';

interface LocalOnboardingState {
  currentStep: OnboardingStepId;
  selectedIntents: OnboardingIntent[];
  draft: OnboardingDraft;
  updatedAt: string;
}

const createDraftDefaults = (): OnboardingDraft => ({
  intent: {
    selectedIntents: []
  },
  identity: {
    name: '',
    phone: '',
    country: '',
    city: '',
    currencyPreference: '',
    avatarUrl: ''
  },
  preferences: {
    interests: []
  },
  roleSetup: createRoleSetupDefaults(),
  review: {
    acceptedTerms: true
  }
});

const mergeDraft = (base: OnboardingDraft, incoming?: OnboardingDraft): OnboardingDraft => ({
  ...base,
  ...(incoming || {}),
  intent: { ...(base.intent || {}), ...(incoming?.intent || {}) },
  identity: { ...(base.identity || {}), ...(incoming?.identity || {}) },
  preferences: { ...(base.preferences || {}), ...(incoming?.preferences || {}) },
  roleSetup: { ...(base.roleSetup || {}), ...(incoming?.roleSetup || {}) },
  review: { ...(base.review || {}), ...(incoming?.review || {}) }
});

const readLocalOnboardingState = (): LocalOnboardingState | null => {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_LOCAL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalOnboardingState;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      currentStep: parsed.currentStep || 'intent',
      selectedIntents: Array.isArray(parsed.selectedIntents) ? parsed.selectedIntents : [],
      draft: mergeDraft(createDraftDefaults(), parsed.draft || {}),
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
};

const writeLocalOnboardingState = (
  currentStep: OnboardingStepId,
  selectedIntents: OnboardingIntent[],
  draft: OnboardingDraft
) => {
  const payload: LocalOnboardingState = {
    currentStep,
    selectedIntents,
    draft,
    updatedAt: new Date().toISOString()
  };
  sessionStorage.setItem(ONBOARDING_LOCAL_STATE_KEY, JSON.stringify(payload));
};

const clearLocalOnboardingState = () => {
  sessionStorage.removeItem(ONBOARDING_LOCAL_STATE_KEY);
};

const stepLabelMap: Record<OnboardingStepId, string> = {
  intent: 'Intent',
  identity: 'Identity Basics',
  preferences: 'Preferences',
  role_setup: 'Role Setup',
  review: 'Review',
  completed: 'Completed'
};

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    isProfileOnboardingEnabled,
    profileCompletion,
    saveOnboardingStep,
    completeOnboarding,
    refreshProfile
  } = useAuth();

  const [initialized, setInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'local' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState<OnboardingStepId>('intent');
  const [selectedIntents, setSelectedIntents] = useState<OnboardingIntent[]>([]);
  const [draft, setDraft] = useState<OnboardingDraft>(createDraftDefaults());
  const [stepError, setStepError] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [stepScale, setStepScale] = useState(1);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fitViewportRef = useRef<HTMLDivElement | null>(null);
  const fitContentRef = useRef<HTMLDivElement | null>(null);

  const requiresRoleStep = useMemo(
    () => selectedIntents.some((intent) => ['sell', 'provide', 'affiliate'].includes(intent)),
    [selectedIntents]
  );

  const steps = useMemo<OnboardingStepId[]>(
    () => ['intent', 'identity', 'preferences', ...(requiresRoleStep ? (['role_setup'] as const) : []), 'review'],
    [requiresRoleStep]
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isProfileOnboardingEnabled) {
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, isLoading, isProfileOnboardingEnabled, navigate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { replace: true, state: { from: location } });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isProfileOnboardingEnabled) return;

    let cancelled = false;
    const initialize = async () => {
      try {
        const response = await profileOnboardingService.getOnboardingState();
        if (cancelled) return;

        if (response.completion.isComplete) {
          clearLocalOnboardingState();
          navigate('/profile', { replace: true });
          return;
        }

        void profileOnboardingService.trackOnboardingEvent('resumed', {
          step: response.state?.currentStep || response.completion.nextStep || 'intent',
          details: {
            hasSavedState: Boolean(response.state),
            missingRequiredFields: response.completion.missingRequiredFields?.length || 0
          }
        }).catch(() => undefined);

        const presetRaw = sessionStorage.getItem(ONBOARDING_PRESET_KEY);
        const presetIntents = presetRaw ? (JSON.parse(presetRaw) as OnboardingIntent[]) : [];
        if (presetRaw) {
          sessionStorage.removeItem(ONBOARDING_PRESET_KEY);
        }

        const resolvedIntents = response.state?.selectedIntents && response.state.selectedIntents.length > 0
          ? response.state.selectedIntents
          : presetIntents;

        const mergedDraft = mergeDraft(createDraftDefaults(), response.state?.draft || {});
        if (resolvedIntents.length > 0) {
          mergedDraft.intent = { selectedIntents: resolvedIntents };
        }

        setSelectedIntents(resolvedIntents);
        setDraft(mergedDraft);

        const preferredStep = response.state?.currentStep || response.completion.nextStep || 'intent';
        setCurrentStep(preferredStep === 'completed' ? 'review' : preferredStep);

        if (presetIntents.length > 0 && (!response.state?.selectedIntents || response.state.selectedIntents.length === 0)) {
          await saveOnboardingStep('intent', {
            selectedIntents: presetIntents,
            draft: mergedDraft
          });
        }

        clearLocalOnboardingState();
      } catch (error) {
        console.error('Onboarding init failed:', error);
        const localState = readLocalOnboardingState();
        if (localState) {
          setCurrentStep(localState.currentStep);
          setSelectedIntents(localState.selectedIntents);
          setDraft(localState.draft);
          setAutosaveStatus('local');
          setSystemNotice('Live autosave unavailable. Edits are being saved locally on this device.');
        } else {
          setSystemNotice('Unable to reach onboarding API. Start backend and refresh to enable sync.');
          setAutosaveStatus('error');
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, isProfileOnboardingEnabled, navigate, saveOnboardingStep]);

  useEffect(() => {
    if (!steps.includes(currentStep)) {
      setCurrentStep(steps[steps.length - 1]);
    }
  }, [steps, currentStep]);

  const persistCurrentStep = async () => {
    if (!initialized || !isAuthenticated) return;
    try {
      setAutosaveStatus('saving');
      await saveOnboardingStep(currentStep, {
        selectedIntents,
        draft
      });
      void profileOnboardingService.trackOnboardingEvent('step_saved', {
        step: currentStep,
        details: { selectedIntentsCount: selectedIntents.length }
      }).catch(() => undefined);
      clearLocalOnboardingState();
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 1000);
      setSystemNotice(null);
    } catch (error) {
      console.error('Autosave failed:', error);
      writeLocalOnboardingState(currentStep, selectedIntents, draft);
      void profileOnboardingService.trackOnboardingEvent('step_error', {
        step: currentStep,
        details: { reason: 'autosave_failed' }
      }).catch(() => undefined);
      setAutosaveStatus('local');
      setSystemNotice('Live autosave failed. Changes are still saved locally on this device.');
    }
  };

  useEffect(() => {
    if (!initialized || !isProfileOnboardingEnabled) return;
    void profileOnboardingService.trackOnboardingEvent('step_viewed', {
      step: currentStep,
      details: { selectedIntentsCount: selectedIntents.length }
    }).catch(() => undefined);
  }, [currentStep, initialized, isProfileOnboardingEnabled, selectedIntents.length]);

  useEffect(() => {
    if (!initialized) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistCurrentStep();
    }, 650);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [selectedIntents, draft, currentStep, initialized]);

  useEffect(() => {
    if (!initialized || autosaveStatus !== 'local') return;
    const retryTimer = setInterval(() => {
      void persistCurrentStep();
    }, 6000);
    return () => clearInterval(retryTimer);
  }, [initialized, autosaveStatus, currentStep, selectedIntents, draft]);

  const recomputeStepScale = useCallback(() => {
    const viewport = fitViewportRef.current;
    const content = fitContentRef.current;
    if (!viewport || !content) return;

    const availableHeight = Math.max(0, viewport.clientHeight - 2);
    const requiredHeight = content.scrollHeight;
    if (availableHeight === 0 || requiredHeight === 0) return;

    const rawScale = requiredHeight > availableHeight ? availableHeight / requiredHeight : 1;
    const boundedScale = Math.max(0.62, Math.min(1, rawScale));

    setStepScale((current) => (Math.abs(current - boundedScale) > 0.01 ? boundedScale : current));
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(recomputeStepScale);
    return () => cancelAnimationFrame(raf);
  }, [recomputeStepScale, currentStep, draft, selectedIntents, stepError, systemNotice]);

  useEffect(() => {
    const onResize = () => recomputeStepScale();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeStepScale]);

  const validateStep = (step: OnboardingStepId): string[] => {
    const identity = draft.identity || {};
    const preferences = draft.preferences || {};
    const roleSetup = draft.roleSetup || {};

    if (step === 'intent' && selectedIntents.length === 0) {
      return ['Select at least one intent'];
    }

    if (step === 'identity') {
      const missing: string[] = [];
      if (!identity.name?.trim()) missing.push('Name');
      if (!identity.phone?.trim()) missing.push('Phone');
      if (!identity.country?.trim()) missing.push('Country');
      if (!identity.city?.trim()) missing.push('City');
      if (!identity.currencyPreference?.trim()) missing.push('Currency preference');
      return missing;
    }

    if (step === 'preferences') {
      if (!preferences.interests || preferences.interests.length === 0) {
        return ['Select at least one interest'];
      }
      return [];
    }

    if (step === 'role_setup') {
      const missingFields = validateRoleSetupDraft(selectedIntents, roleSetup);
      return missingFields.map((field) => getRoleFieldLabel(field));
    }

    return [];
  };

  const moveStep = (direction: 'next' | 'back') => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < 0) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    setStepDirection(direction === 'next' ? 1 : -1);
    setCurrentStep(steps[nextIndex]);
  };

  const handleNext = async () => {
    setStepError(null);
    const missing = validateStep(currentStep);
    if (missing.length > 0) {
      setStepError(`Missing: ${missing.join(', ')}`);
      return;
    }

    await persistCurrentStep();

    if (currentStep === 'review') {
      await handleComplete();
      return;
    }

    moveStep('next');
  };

  const handleComplete = async () => {
    setStepError(null);
    const allMissing = [
      ...validateStep('intent'),
      ...validateStep('identity'),
      ...validateStep('preferences'),
      ...(requiresRoleStep ? validateStep('role_setup') : [])
    ];

    if (allMissing.length > 0) {
      setStepError(`Missing: ${Array.from(new Set(allMissing)).join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await persistCurrentStep();
      await completeOnboarding({
        selectedIntents,
        draft,
        roleSetup: draft.roleSetup
      });
      clearLocalOnboardingState();
      void profileOnboardingService.trackOnboardingEvent('completed', {
        step: 'completed',
        details: { selectedIntentsCount: selectedIntents.length }
      }).catch(() => undefined);
    } catch (error) {
      console.error('Onboarding completion failed:', error);
      void profileOnboardingService.trackOnboardingEvent('completion_failed', {
        step: 'review',
        details: {
          reason: error instanceof Error ? error.message : 'unknown'
        }
      }).catch(() => undefined);
      await refreshProfile();
      setStepError(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIntentToggle = (intent: OnboardingIntent) => {
    setStepError(null);
    setSelectedIntents((current) => {
      const nextIntents = current.includes(intent)
        ? current.filter((value) => value !== intent)
        : [...current, intent];

      setDraft((draftState) =>
        mergeDraft(draftState, {
          intent: {
            selectedIntents: nextIntents
          }
        })
      );

      return nextIntents;
    });
  };

  const handleInterestToggle = (interestId: string) => {
    setStepError(null);
    setDraft((current) => {
      const currentInterests = current.preferences?.interests || [];
      const nextInterests = currentInterests.includes(interestId)
        ? currentInterests.filter((id) => id !== interestId)
        : [...currentInterests, interestId];
      return mergeDraft(current, {
        preferences: {
          interests: nextInterests
        }
      });
    });
  };

  const renderCurrentStep = () => {
    if (currentStep === 'intent') {
      return <IntentStep value={selectedIntents} onToggle={handleIntentToggle} />;
    }
    if (currentStep === 'identity') {
      return (
        <IdentityStep
          value={draft.identity || {}}
          onChange={(patch) => {
            setStepError(null);
            setDraft((current) => mergeDraft(current, { identity: patch }));
          }}
        />
      );
    }
    if (currentStep === 'preferences') {
      return <PreferencesStep value={draft.preferences?.interests || []} onToggle={handleInterestToggle} />;
    }
    if (currentStep === 'role_setup') {
      return (
        <RoleSetupStep
          intents={selectedIntents}
          value={draft.roleSetup || createRoleSetupDefaults()}
          onChange={(patch) => {
            setStepError(null);
            setDraft((current) => mergeDraft(current, { roleSetup: patch }));
          }}
        />
      );
    }
    return <ReviewStep intents={selectedIntents} draft={draft} missingRequiredFields={profileCompletion?.missingRequiredFields || []} />;
  };

  if (isLoading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const stepIndex = Math.max(1, steps.indexOf(currentStep) + 1);

  return (
    <OnboardingLayout
      title="Complete your profile"
      subtitle="Guided setup with autosave, resume, and role-based configuration."
      stepLabel={stepLabelMap[currentStep]}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      autosaveStatus={isSubmitting ? 'saving' : autosaveStatus}
      onBack={stepIndex > 1 ? () => moveStep('back') : undefined}
      onNext={handleNext}
      onSubmit={handleComplete}
      nextDisabled={isSubmitting}
      showSubmit={currentStep === 'review'}
      submitLabel={isSubmitting ? 'Completing...' : 'Complete setup'}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-0 flex-1" style={{ perspective: 1600 }}>
          <AnimatePresence mode="wait" custom={stepDirection}>
            <motion.div
              key={currentStep}
              custom={stepDirection}
              className="h-full"
              initial={(direction: 1 | -1) => ({
                opacity: 0,
                x: direction > 0 ? 42 : -42,
                rotateY: direction > 0 ? 95 : -95,
                scale: 0.94
              })}
              animate={{
                opacity: 1,
                x: 0,
                rotateY: 0,
                scale: 1
              }}
              exit={(direction: 1 | -1) => ({
                opacity: 0,
                x: direction > 0 ? -42 : 42,
                rotateY: direction > 0 ? -95 : 95,
                scale: 0.94
              })}
              transition={{ duration: 0.58, ease: [0.2, 0.7, 0.25, 1] }}
              style={{
                transformStyle: 'preserve-3d',
                transformOrigin: 'center center',
                backfaceVisibility: 'hidden'
              }}
            >
              <div ref={fitViewportRef} className="relative h-full overflow-hidden">
                <div
                  ref={fitContentRef}
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `scale(${stepScale})`,
                    transformOrigin: 'top center',
                    transition: 'transform 180ms ease'
                  }}
                >
                  {renderCurrentStep()}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {systemNotice ? (
          <div className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            {systemNotice}
          </div>
        ) : null}
      </div>

      {stepError && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {stepError}
        </div>
      )}
    </OnboardingLayout>
  );
};

export default OnboardingPage;
