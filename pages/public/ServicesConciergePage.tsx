import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import ServiceWorkflowEmptyState from '../../components/service/ServiceWorkflowEmptyState';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { serviceService } from '../../services/itemService';
import autopilotService, { type MatchAutopilotOutput } from '../../services/autopilotService';
import workService from '../../services/workService';
import type {
  ConciergeMilestoneSuggestion,
  ConciergeScopeDraft,
  WorkFulfillmentKind,
  WorkMode
} from '../../types';

type StepId = 1 | 2 | 3 | 4;

type BriefFormState = {
  title: string;
  brief: string;
  category: string;
  budgetMin: string;
  budgetMax: string;
  mode: WorkMode;
  fulfillmentKind: WorkFulfillmentKind;
  timezone: string;
  skillsText: string;
};

type ScopeMetaState = {
  suggestedMilestones: ConciergeMilestoneSuggestion[];
  suggestedTimelineDays: number;
  confidence: number;
};

type MatchResult = MatchAutopilotOutput['matches'][number];

type StoredConciergeState = {
  step: StepId;
  formState: BriefFormState;
  scopeDraft: ConciergeScopeDraft | null;
  scopeMeta: ScopeMetaState | null;
  matches: MatchResult[];
  selectedMatchId: string;
};

const STORAGE_KEY = 'urbanprime_ai_concierge_v1';
const PENDING_SUBMIT_KEY = 'urbanprime_ai_concierge_pending_submit_v1';

const stepLabels: Array<{ id: StepId; label: string; note: string }> = [
  { id: 1, label: 'Brief', note: 'Capture the project' },
  { id: 2, label: 'Scope', note: 'Review the normalized ask' },
  { id: 3, label: 'Matches', note: 'Compare ranked providers' },
  { id: 4, label: 'Send', note: 'Create the targeted request' }
];

const modeOptions: Array<{ value: WorkMode; label: string }> = [
  { value: 'proposal', label: 'Proposal-first' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'instant', label: 'Instant-capable' }
];

const fulfillmentOptions: Array<{ value: WorkFulfillmentKind; label: string }> = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'local', label: 'Local' },
  { value: 'onsite', label: 'On-site' }
];

const parseMoney = (value: string) => {
  const normalized = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
};

const parseList = (value: string) =>
  String(value || '')
    .split(/[\n,;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

const stringifyList = (entries?: string[]) => (Array.isArray(entries) ? entries.join('\n') : '');

const getInitialTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const buildDefaultFormState = (category: string): BriefFormState => ({
  title: '',
  brief: '',
  category: category || 'digital-services',
  budgetMin: '',
  budgetMax: '',
  mode: 'proposal',
  fulfillmentKind: 'remote',
  timezone: getInitialTimezone(),
  skillsText: ''
});

const isPublishedService = (status?: string) => String(status || '').trim().toLowerCase() === 'published';

const surfaceClass =
  'rounded-[32px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] shadow-soft dark:bg-[linear-gradient(180deg,rgba(23,27,37,0.98),rgba(17,20,30,0.96))]';

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 21s7-3.8 7-9.5V5.8L12 3 5 5.8v5.7C5 17.2 12 21 12 21Z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5V12l2.8 1.8" />
  </svg>
);

const ServicesConciergePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preferredCategory = searchParams.get('category') || '';
  const preferredListingId = searchParams.get('listingId') || '';
  const preferredProviderId = searchParams.get('providerId') || '';
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();

  const [step, setStep] = useState<StepId>(1);
  const [formState, setFormState] = useState<BriefFormState>(() => buildDefaultFormState(preferredCategory));
  const [scopeDraft, setScopeDraft] = useState<ConciergeScopeDraft | null>(null);
  const [scopeMeta, setScopeMeta] = useState<ScopeMetaState | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [isScoping, setIsScoping] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const [matchError, setMatchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [readyToPersist, setReadyToPersist] = useState(false);
  const [pendingSubmitAfterLogin, setPendingSubmitAfterLogin] = useState(false);

  const selectedMatch = matches.find((entry) => entry.listing.id === selectedMatchId) || null;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredConciergeState>;
        if (parsed.formState) setFormState({ ...buildDefaultFormState(preferredCategory), ...parsed.formState });
        if (parsed.scopeDraft) setScopeDraft(parsed.scopeDraft as ConciergeScopeDraft);
        if (parsed.scopeMeta) setScopeMeta(parsed.scopeMeta as ScopeMetaState);
        if (Array.isArray(parsed.matches)) setMatches(parsed.matches as MatchResult[]);
        if (typeof parsed.selectedMatchId === 'string') setSelectedMatchId(parsed.selectedMatchId);
        if ([1, 2, 3, 4].includes(Number(parsed.step))) setStep(Number(parsed.step) as StepId);
      }

      setPendingSubmitAfterLogin(window.sessionStorage.getItem(PENDING_SUBMIT_KEY) === '1');
    } catch (error) {
      console.warn('Unable to restore concierge draft:', error);
    } finally {
      setReadyToPersist(true);
    }
  }, [preferredCategory]);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined') return;

    const payload: StoredConciergeState = {
      step,
      formState,
      scopeDraft,
      scopeMeta,
      matches,
      selectedMatchId
    };

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (pendingSubmitAfterLogin) {
        window.sessionStorage.setItem(PENDING_SUBMIT_KEY, '1');
      } else {
        window.sessionStorage.removeItem(PENDING_SUBMIT_KEY);
      }
    } catch (error) {
      console.warn('Unable to persist concierge draft:', error);
    }
  }, [formState, matches, pendingSubmitAfterLogin, readyToPersist, scopeDraft, scopeMeta, selectedMatchId, step]);

  useEffect(() => {
    if (!matches.length) {
      if (selectedMatchId) setSelectedMatchId('');
      return;
    }

    const existing = matches.some((entry) => entry.listing.id === selectedMatchId);
    if (existing) return;

    const preferredMatch =
      matches.find((entry) => entry.listing.id === preferredListingId) ||
      matches.find((entry) => entry.providerId === preferredProviderId) ||
      matches.find((entry) => entry.listing.sellerId === preferredProviderId) ||
      matches[0];

    setSelectedMatchId(preferredMatch?.listing.id || '');
  }, [matches, preferredListingId, preferredProviderId, selectedMatchId]);

  useEffect(() => {
    if (!user || !pendingSubmitAfterLogin || !selectedMatch || !scopeDraft || !scopeMeta) return;

    setPendingSubmitAfterLogin(false);
    void (async () => {
      try {
        await submitTargetedRequest(selectedMatch, scopeDraft, scopeMeta);
      } catch {
        // error state is handled in submitTargetedRequest
      }
    })();
  }, [pendingSubmitAfterLogin, scopeDraft, scopeMeta, selectedMatch, user]);

  const scopeSummary = useMemo(() => {
    if (!scopeDraft || !scopeMeta) return null;
    return [
      { label: 'Confidence', value: `${Math.round(scopeMeta.confidence * 100)}%` },
      { label: 'Timeline', value: `${scopeMeta.suggestedTimelineDays} days` },
      { label: 'Requirements', value: `${scopeDraft.requirements.length}` }
    ];
  }, [scopeDraft, scopeMeta]);

  const resetErrors = () => {
    setScopeError('');
    setMatchError('');
    setSubmitError('');
  };

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(PENDING_SUBMIT_KEY);
    }
    setPendingSubmitAfterLogin(false);
  };

  const handleScopeRequest = async () => {
    if (!formState.brief.trim()) {
      setScopeError('Add a project brief before running concierge scope.');
      return;
    }

    resetErrors();
    setIsScoping(true);
    try {
      const output = await autopilotService.scope({
        title: formState.title.trim() || undefined,
        brief: formState.brief.trim(),
        category: formState.category.trim() || undefined,
        budgetMin: parseMoney(formState.budgetMin),
        budgetMax: parseMoney(formState.budgetMax),
        timezone: formState.timezone.trim() || undefined,
        mode: formState.mode,
        fulfillmentKind: formState.fulfillmentKind,
        currency: 'USD'
      });

      setScopeDraft(output.normalizedRequest);
      setScopeMeta({
        suggestedMilestones: output.suggestedMilestones,
        suggestedTimelineDays: output.suggestedTimelineDays,
        confidence: output.confidence
      });
      setMatches([]);
      setSelectedMatchId('');
      setStep(2);
    } catch (error) {
      setScopeError(error instanceof Error ? error.message : 'Autopilot scope is unavailable right now.');
    } finally {
      setIsScoping(false);
    }
  };

  const handleFindMatches = async () => {
    if (!scopeDraft) {
      setMatchError('Run and review the concierge scope before matching providers.');
      return;
    }

    resetErrors();
    setIsMatching(true);
    try {
      const output = await autopilotService.match({
        brief: scopeDraft.brief,
        requirements: scopeDraft.requirements,
        budgetMin: scopeDraft.budgetMin,
        budgetMax: scopeDraft.budgetMax,
        category: scopeDraft.category,
        mode: scopeDraft.mode,
        fulfillmentKind: scopeDraft.fulfillmentKind,
        timezone: scopeDraft.timezone,
        skills: parseList(formState.skillsText),
        limit: 6
      });

      setMatches(output.matches);
      setStep(3);
      if (!output.matches.length) {
        setMatchError('No provider matches were found for the current scope.');
      }
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : 'Unable to load concierge matches right now.');
    } finally {
      setIsMatching(false);
    }
  };

  const submitTargetedRequest = async (
    match: MatchResult,
    draft: ConciergeScopeDraft,
    meta: ScopeMetaState
  ) => {
    const providerId = String(
      match.providerId ||
      match.listing.providerSnapshot?.id ||
      match.listing.sellerId ||
      ''
    ).trim();

    if (!providerId) {
      throw new Error('The selected provider is missing a public messaging identity.');
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const latestService = await serviceService.getServiceById(match.listing.id).catch(() => undefined);
      if (latestService && !isPublishedService(latestService.status)) {
        throw new Error('The selected service was unpublished after matching. Choose another provider.');
      }

      if (!user) {
        setPendingSubmitAfterLogin(true);
        openAuthModal('login');
        return;
      }

      await workService.createRequest({
        title: draft.title || formState.title.trim() || 'AI concierge request',
        brief: draft.brief,
        listingId: match.listing.id,
        targetProviderId: providerId,
        category: draft.category,
        mode: draft.mode,
        fulfillmentKind: draft.fulfillmentKind,
        budgetMin: draft.budgetMin,
        budgetMax: draft.budgetMax,
        currency: draft.currency || 'USD',
        timezone: draft.timezone,
        requirements: draft.requirements,
        requestType: 'quote',
        details: {
          concierge: {
            source: 'ai_concierge',
            scopeConfidence: meta.confidence,
            suggestedMilestones: meta.suggestedMilestones,
            suggestedTimelineDays: meta.suggestedTimelineDays,
            selectedMatchScore: match.score,
            selectedMatchReasons: match.reasons,
            selectedListingId: match.listing.id
          }
        }
      }, user, { requireLiveBackend: true });

      clearDraft();
      showNotification('Concierge request sent. You are now in the shared thread with the selected provider.');
      navigate(`/profile/messages?sellerId=${encodeURIComponent(providerId)}&serviceId=${encodeURIComponent(match.listing.id)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create the targeted concierge request.';
      setSubmitError(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMatch || !scopeDraft || !scopeMeta) {
      setSubmitError('Select a match and keep the scoped request loaded before sending.');
      return;
    }
    await submitTargetedRequest(selectedMatch, scopeDraft, scopeMeta);
  };

  const updateScopeDraft = <K extends keyof ConciergeScopeDraft>(key: K, value: ConciergeScopeDraft[K]) => {
    setScopeDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-text-primary">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <BackButton className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary shadow-soft" />
          <Link to="/services/marketplace" className="text-sm font-semibold text-text-secondary transition hover:text-primary">
            Services marketplace
          </Link>
          <span className="text-text-secondary">/</span>
          <span className="text-sm font-semibold text-text-primary">AI concierge</span>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[40px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_30%),linear-gradient(135deg,#07162b,#0f2748_46%,#143a63)] px-6 py-7 text-white shadow-[0_28px_60px_rgba(8,15,34,0.26)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -left-12 top-0 h-52 w-52 rounded-full bg-cyan-300/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-amber-300/14 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82">
                <SparkIcon />
                AI concierge
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                Turn a rough brief into a scoped, targeted hiring request
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                Scope the project first, compare explainable provider matches, then send one cleaner quote request into the existing proposal workflow.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/services/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Browse catalog instead
                  <ArrowRightIcon />
                </Link>
                <Link
                  to="/profile/messages"
                  className="inline-flex items-center justify-center rounded-[24px] border border-white/16 bg-white/8 px-5 py-3 text-sm font-semibold text-white/88 transition hover:bg-white/12"
                >
                  Open hiring inbox
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {(scopeSummary || [
                { label: 'Output', value: 'Explainable scope' },
                { label: 'Ranking', value: 'Trust-aware matches' },
                { label: 'Final step', value: 'Targeted quote request' }
              ]).map((entry) => (
                <div key={entry.label} className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">{entry.label}</p>
                  <p className="mt-2 text-xl font-black text-white">{entry.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${surfaceClass} p-5 xl:sticky xl:top-24 xl:self-start`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Workflow</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Move from brief to provider thread</h2>
            <div className="mt-5 space-y-3">
              {stepLabels.map((entry) => {
                const isActive = entry.id === step;
                const isDone = entry.id < step;
                return (
                  <div
                    key={entry.id}
                    className={`rounded-[24px] border px-4 py-4 transition ${
                      isActive
                        ? 'border-primary/28 bg-primary/10'
                        : isDone
                          ? 'border-emerald-500/18 bg-emerald-500/8'
                          : 'border-border bg-background/88'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Step {entry.id}</p>
                        <p className="mt-1 text-sm font-black text-text-primary">{entry.label}</p>
                        <p className="mt-1 text-xs leading-6 text-text-secondary">{entry.note}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          isActive
                            ? 'bg-primary text-white'
                            : isDone
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-surface-soft text-text-secondary'
                        }`}
                      >
                        {isDone ? 'Done' : isActive ? 'Now' : 'Next'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-[24px] border border-border bg-surface-soft p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Anonymous support</p>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                Scope and matching stay open without sign-in. Authentication is only required when you send the final targeted request.
              </p>
            </div>
          </aside>

          <main className="space-y-6">
            <section className={`${surfaceClass} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Step {step}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
                    {step === 1 && 'Capture the project brief'}
                    {step === 2 && 'Review the normalized project scope'}
                    {step === 3 && 'Compare ranked provider matches'}
                    {step === 4 && 'Send the targeted quote request'}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    {step === 1 && 'Add the project signal once. The concierge will normalize it into a cleaner request object.'}
                    {step === 2 && 'Edit the scope before matching so providers see a tighter brief, budget, and requirement list.'}
                    {step === 3 && 'Each card shows match score, trust score, budget fit, and the recommended lane.'}
                    {step === 4 && 'This final action creates one work request tied to the selected service listing and provider.'}
                  </p>
                </div>

                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.max(1, current - 1) as StepId)}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                  >
                    Back one step
                  </button>
                ) : null}
              </div>

              {step === 1 ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Optional title</span>
                    <input
                      value={formState.title}
                      onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                      placeholder="AI landing page revamp for B2B launch"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Category</span>
                    <input
                      value={formState.category}
                      onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
                      placeholder="digital-services"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Project brief</span>
                    <textarea
                      value={formState.brief}
                      onChange={(event) => setFormState((current) => ({ ...current, brief: event.target.value }))}
                      placeholder="Describe deliverables, style, constraints, deadline, current gaps, and anything the provider should know before quoting."
                      rows={7}
                      className="mt-2 w-full rounded-[24px] border border-border bg-background px-4 py-3 text-sm leading-7 text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Budget min (USD)</span>
                    <input
                      value={formState.budgetMin}
                      onChange={(event) => setFormState((current) => ({ ...current, budgetMin: event.target.value }))}
                      placeholder="1200"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Budget max (USD)</span>
                    <input
                      value={formState.budgetMax}
                      onChange={(event) => setFormState((current) => ({ ...current, budgetMax: event.target.value }))}
                      placeholder="3000"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Workflow mode</span>
                    <select
                      value={formState.mode}
                      onChange={(event) => setFormState((current) => ({ ...current, mode: event.target.value as WorkMode }))}
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    >
                      {modeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Fulfillment</span>
                    <select
                      value={formState.fulfillmentKind}
                      onChange={(event) => setFormState((current) => ({ ...current, fulfillmentKind: event.target.value as WorkFulfillmentKind }))}
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    >
                      {fulfillmentOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Timezone</span>
                    <input
                      value={formState.timezone}
                      onChange={(event) => setFormState((current) => ({ ...current, timezone: event.target.value }))}
                      placeholder="Asia/Karachi"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Optional skills</span>
                    <input
                      value={formState.skillsText}
                      onChange={(event) => setFormState((current) => ({ ...current, skillsText: event.target.value }))}
                      placeholder="figma, ui systems, copy, react"
                      className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>

                  {scopeError ? (
                    <div className="lg:col-span-2 rounded-[22px] border border-rose-500/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                      {scopeError}
                    </div>
                  ) : null}

                  <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleScopeRequest()}
                      disabled={isScoping}
                      className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isScoping ? <Spinner size="sm" /> : <SparkIcon />}
                      Run AI scope
                    </button>
                    <p className="text-sm text-text-secondary">Anonymous visitors can run this step without signing in.</p>
                  </div>
                </div>
              ) : null}

              {step === 2 && scopeDraft && scopeMeta ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Confidence</p>
                      <p className="mt-2 text-2xl font-black text-text-primary">{Math.round(scopeMeta.confidence * 100)}%</p>
                      <p className="mt-2 text-sm text-text-secondary">How strong the current brief is after normalization.</p>
                    </div>
                    <div className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Suggested timeline</p>
                      <p className="mt-2 text-2xl font-black text-text-primary">{scopeMeta.suggestedTimelineDays} days</p>
                      <p className="mt-2 text-sm text-text-secondary">A simple planning anchor before a provider revises it.</p>
                    </div>
                    <div className="rounded-[24px] border border-border bg-background/88 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Workflow lane</p>
                      <p className="mt-2 text-2xl font-black text-text-primary">{scopeDraft.mode}</p>
                      <p className="mt-2 text-sm text-text-secondary">This scope stays quote-first even if a service is instant-capable.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Request title</span>
                      <input
                        value={scopeDraft.title}
                        onChange={(event) => updateScopeDraft('title', event.target.value)}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Category</span>
                      <input
                        value={scopeDraft.category}
                        onChange={(event) => updateScopeDraft('category', event.target.value)}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="block lg:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Normalized brief</span>
                      <textarea
                        value={scopeDraft.brief}
                        onChange={(event) => updateScopeDraft('brief', event.target.value)}
                        rows={6}
                        className="mt-2 w-full rounded-[24px] border border-border bg-background px-4 py-3 text-sm leading-7 text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Budget min</span>
                      <input
                        value={scopeDraft.budgetMin ?? ''}
                        onChange={(event) => updateScopeDraft('budgetMin', parseMoney(event.target.value))}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Budget max</span>
                      <input
                        value={scopeDraft.budgetMax ?? ''}
                        onChange={(event) => updateScopeDraft('budgetMax', parseMoney(event.target.value))}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Mode</span>
                      <select
                        value={scopeDraft.mode}
                        onChange={(event) => updateScopeDraft('mode', event.target.value as WorkMode)}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      >
                        {modeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Fulfillment</span>
                      <select
                        value={scopeDraft.fulfillmentKind}
                        onChange={(event) => updateScopeDraft('fulfillmentKind', event.target.value as WorkFulfillmentKind)}
                        className="mt-2 w-full rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
                      >
                        {fulfillmentOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block lg:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Requirements</span>
                      <textarea
                        value={stringifyList(scopeDraft.requirements)}
                        onChange={(event) => updateScopeDraft('requirements', parseList(event.target.value))}
                        rows={6}
                        className="mt-2 w-full rounded-[24px] border border-border bg-background px-4 py-3 text-sm leading-7 text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="rounded-[28px] border border-border bg-surface-soft p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Suggested milestones</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {scopeMeta.suggestedMilestones.map((entry) => (
                        <div key={entry.title} className="rounded-[22px] border border-border bg-background/88 p-4">
                          <p className="text-sm font-black text-text-primary">{entry.title}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">{entry.amountPct}% allocation</p>
                          <p className="mt-2 text-sm leading-7 text-text-secondary">{entry.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {matchError ? (
                    <div className="rounded-[22px] border border-rose-500/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                      {matchError}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleFindMatches()}
                      disabled={isMatching}
                      className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isMatching ? <Spinner size="sm" /> : <ShieldIcon />}
                      Find concierge matches
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-[24px] border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                    >
                      Edit original brief
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="mt-6">
                  {isMatching ? (
                    <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-border bg-surface-soft">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Spinner size="lg" />
                        <p className="text-sm font-semibold text-text-primary">Ranking providers against your reviewed scope</p>
                        <p className="max-w-md text-xs leading-6 text-text-secondary">The concierge is scoring category fit, workflow compatibility, requirement overlap, price fit, and trust signals.</p>
                      </div>
                    </div>
                  ) : matches.length === 0 ? (
                    <ServiceWorkflowEmptyState
                      eyebrow="No concierge matches"
                      title="No published providers fit this scoped brief yet"
                      body="Broaden the category, loosen one requirement, or widen the budget range and rerun matching."
                      animation="noResults"
                      highlights={['Adjust category', 'Relax one requirement', 'Widen budget range']}
                      primaryAction={{ label: 'Back to scope review', to: '/services/concierge' }}
                    />
                  ) : (
                    <>
                      {matchError ? (
                        <div className="mb-4 rounded-[22px] border border-rose-500/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                          {matchError}
                        </div>
                      ) : null}

                      <div className="grid gap-4 xl:grid-cols-2">
                        {matches.map((match) => {
                          const isSelected = match.listing.id === selectedMatchId;
                          const providerName = match.listing.providerSnapshot?.name || 'Provider';
                          const startingPrice = match.listing.basePrice || match.listing.packages?.[0]?.price || 0;
                          return (
                            <button
                              key={match.listing.id}
                              type="button"
                              onClick={() => setSelectedMatchId(match.listing.id)}
                              className={`text-left ${surfaceClass} p-5 transition ${
                                isSelected ? 'border-primary/35 shadow-[0_18px_36px_rgba(30,64,175,0.14)]' : 'hover:-translate-y-1 hover:border-primary/18'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <img
                                    src={match.listing.providerSnapshot?.avatar || '/icons/urbanprime.svg'}
                                    alt={providerName}
                                    className="h-14 w-14 rounded-[20px] object-cover"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-base font-black tracking-tight text-text-primary">{providerName}</p>
                                    <p className="truncate text-sm text-text-secondary">{match.listing.title}</p>
                                  </div>
                                </div>
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                  isSelected ? 'bg-primary text-white' : 'bg-surface-soft text-text-secondary'
                                }`}>
                                  {isSelected ? 'Selected' : 'Pick'}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Match score</p>
                                  <p className="mt-1 text-lg font-black text-text-primary">{Math.round(match.score)}</p>
                                </div>
                                <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Trust score</p>
                                  <p className="mt-1 text-lg font-black text-text-primary">{Math.round(match.trustScore)}</p>
                                </div>
                                <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Budget fit</p>
                                  <p className="mt-1 text-lg font-black text-text-primary">{Math.round(match.priceFit)}</p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                                  {match.recommendedPath === 'instant' ? 'Instant-capable lane' : 'Proposal-first lane'}
                                </span>
                                <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                                  {match.listing.fulfillmentKind}
                                </span>
                                {match.responseSlaHours ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                                    <ClockIcon />
                                    {match.responseSlaHours}h response
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Starting point</p>
                                  <p className="mt-1 text-sm font-black text-text-primary">
                                    {startingPrice > 0 ? `${match.listing.currency || 'USD'} ${startingPrice.toLocaleString()}` : 'Custom quote'}
                                  </p>
                                </div>
                                <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Public routes</p>
                                  <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold">
                                    <Link to={`/service/${match.listing.id}`} className="text-primary hover:underline">Service</Link>
                                    <Link to={`/providers/${encodeURIComponent(match.providerId || match.listing.sellerId)}`} className="text-primary hover:underline">Storefront</Link>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {match.reasons.map((reason) => (
                                  <span key={`${match.listing.id}-${reason}`} className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-text-secondary">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          disabled={!selectedMatch}
                          className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Continue with selected match
                          <ArrowRightIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="rounded-[24px] border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                        >
                          Refine scope and rerun
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {step === 4 ? (
                <div className="mt-6">
                  {!selectedMatch || !scopeDraft || !scopeMeta ? (
                    <div className="rounded-[24px] border border-amber-500/18 bg-amber-500/8 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                      Select a provider match first so the final request can be tied to one listing and one provider.
                    </div>
                  ) : (
                    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className={`${surfaceClass} p-5`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Request preview</p>
                        <h3 className="mt-2 text-xl font-black tracking-tight text-text-primary">{scopeDraft.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-text-secondary">{scopeDraft.brief}</p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Category</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{scopeDraft.category}</p>
                          </div>
                          <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Budget</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">
                              {scopeDraft.budgetMin || scopeDraft.budgetMax
                                ? `USD ${(scopeDraft.budgetMin || 0).toLocaleString()} - ${(scopeDraft.budgetMax || scopeDraft.budgetMin || 0).toLocaleString()}`
                                : 'Custom quote'}
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Timeline</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{scopeMeta.suggestedTimelineDays} days</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-border bg-surface-soft p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Requirements going into the request</p>
                          <ul className="mt-3 space-y-2 text-sm leading-7 text-text-secondary">
                            {scopeDraft.requirements.map((entry) => (
                              <li key={entry} className="rounded-[18px] border border-border bg-background/88 px-3 py-2">
                                {entry}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className={`${surfaceClass} p-5`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Selected provider</p>
                        <div className="mt-3 flex items-center gap-3 rounded-[24px] border border-border bg-background/88 p-4">
                          <img
                            src={selectedMatch.listing.providerSnapshot?.avatar || '/icons/urbanprime.svg'}
                            alt={selectedMatch.listing.providerSnapshot?.name || 'Provider'}
                            className="h-14 w-14 rounded-[20px] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-text-primary">{selectedMatch.listing.providerSnapshot?.name || 'Provider'}</p>
                            <p className="truncate text-sm text-text-secondary">{selectedMatch.listing.title}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Match score</p>
                            <p className="mt-1 text-xl font-black text-text-primary">{Math.round(selectedMatch.score)}</p>
                          </div>
                          <div className="rounded-[20px] border border-border bg-background/88 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Trust score</p>
                            <p className="mt-1 text-xl font-black text-text-primary">{Math.round(selectedMatch.trustScore)}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-border bg-surface-soft p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">What gets persisted into request details</p>
                          <div className="mt-3 space-y-2 text-sm text-text-secondary">
                            <p className="flex items-center gap-2"><ShieldIcon /> Source: `ai_concierge`</p>
                            <p>Scope confidence: {Math.round(scopeMeta.confidence * 100)}%</p>
                            <p>Suggested timeline: {scopeMeta.suggestedTimelineDays} days</p>
                            <p>Selected listing: {selectedMatch.listing.id}</p>
                          </div>
                        </div>

                        {submitError ? (
                          <div className="mt-4 rounded-[22px] border border-rose-500/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                            {submitError}
                          </div>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSubmitting ? <Spinner size="sm" /> : <ArrowRightIcon />}
                            Send targeted request
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="rounded-[24px] border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
                          >
                            Choose another match
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ServicesConciergePage;
