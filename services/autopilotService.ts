import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import { shouldUseFirestoreFallback } from './dataMode';
import type { AutopilotRun, WorkListing, WorkRequest } from '../types';

export interface ScopeAutopilotInput {
  title?: string;
  brief: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  timezone?: string;
  category?: string;
  mode?: WorkRequest['mode'];
  fulfillmentKind?: WorkRequest['fulfillmentKind'];
}

export interface MatchAutopilotInput {
  requestId?: string;
  category?: string;
  skills?: string[];
  mode?: WorkRequest['mode'];
  fulfillmentKind?: WorkRequest['fulfillmentKind'];
  timezone?: string;
  limit?: number;
}

export interface ScopeAutopilotOutput {
  normalizedRequest: Partial<WorkRequest>;
  suggestedMilestones: Array<{ title: string; amountPct: number; description: string }>;
  suggestedTimelineDays: number;
  confidence: number;
}

export interface MatchAutopilotOutput {
  matches: Array<{
    listing: WorkListing;
    score: number;
    reasons: string[];
  }>;
}

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scopeLocally = (input: ScopeAutopilotInput): ScopeAutopilotOutput => {
  const brief = input.brief?.trim() || '';
  const wordCount = brief.length > 0 ? brief.split(/\s+/).length : 0;
  const complexity = clamp(Math.round(wordCount / 60), 1, 5);
  const timeline = clamp(complexity * 5, 5, 30);
  const confidence = clamp(0.5 + complexity * 0.08, 0.55, 0.92);

  const suggestedMilestones = [
    { title: 'Discovery & Scope Finalization', amountPct: 20, description: 'Confirm requirements and final deliverables.' },
    { title: 'Execution', amountPct: 50, description: 'Primary work delivery based on approved scope.' },
    { title: 'QA / Revisions / Handoff', amountPct: 30, description: 'Final fixes, acceptance, and structured handover.' }
  ];

  return {
    normalizedRequest: {
      title: input.title || brief.slice(0, 80) || 'Autopilot-generated request',
      brief,
      category: input.category || 'general',
      mode: input.mode || 'hybrid',
      fulfillmentKind: input.fulfillmentKind || 'hybrid',
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency || 'USD',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      requirements: brief
        .split(/[.;\n]/)
        .map((segment) => segment.trim())
        .filter(Boolean)
        .slice(0, 8)
    },
    suggestedMilestones,
    suggestedTimelineDays: timeline,
    confidence: Number(confidence.toFixed(2))
  };
};

const autopilotService = {
  async scope(input: ScopeAutopilotInput): Promise<ScopeAutopilotOutput> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/scope', {
        method: 'POST',
        body: JSON.stringify(input)
      }, token);
      return res?.data as ScopeAutopilotOutput;
    }

    const output = scopeLocally(input);
    if (shouldUseFirestoreFallback()) {
      const run: Omit<AutopilotRun, 'id'> = {
        runType: 'scope',
        inputPayload: input as Record<string, any>,
        outputPayload: output as Record<string, any>,
        status: 'succeeded',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'work_autopilot_runs'), run);
    }
    return output;
  },

  async match(input: MatchAutopilotInput): Promise<MatchAutopilotOutput> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/match', {
        method: 'POST',
        body: JSON.stringify(input)
      }, token);
      return res?.data as MatchAutopilotOutput;
    }

    if (shouldUseFirestoreFallback()) {
      const run: Omit<AutopilotRun, 'id'> = {
        runType: 'match',
        inputPayload: input as Record<string, any>,
        outputPayload: { matches: [] },
        status: 'succeeded',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'work_autopilot_runs'), run);
    }

    return { matches: [] };
  },

  async health(): Promise<Record<string, any>> {
    if (isBackendConfigured()) {
      const token = await getBackendToken();
      const res = await backendFetch('/work/autopilot/health', {
        method: 'POST'
      }, token);
      return res?.data || {};
    }

    return {
      ok: true,
      engine: 'local-fallback',
      generatedAt: new Date().toISOString()
    };
  }
};

export default autopilotService;
