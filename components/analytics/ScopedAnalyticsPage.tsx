import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Spinner from '../Spinner';
import type {
  AnalyticsConnectionState,
  AnalyticsPageId,
  AnalyticsScopeType,
  AnalyticsTimeRange,
  AnalyticsWidgetPayload,
  PersonaAnalyticsPagePayload
} from '../../types';
import personaAnalyticsService from '../../services/personaAnalyticsService';
import AnalyticsShell from './AnalyticsShell';
import AnalyticsWidgetDetailPage from './AnalyticsWidgetDetailPage';
import {
  ANALYTICS_SCOPE_LABELS,
  buildAnalyticsPath,
  buildAnalyticsWidgetPath,
  getDefaultScopePage,
  getScopePageList,
  isScopePage
} from './catalog';

const DEFAULT_RANGE: AnalyticsTimeRange = '30d';
const VALID_RANGES = new Set<AnalyticsTimeRange>(['24h', '7d', '30d', '90d', '180d']);

const parseRange = (value?: string | null): AnalyticsTimeRange =>
  value && VALID_RANGES.has(value as AnalyticsTimeRange) ? (value as AnalyticsTimeRange) : DEFAULT_RANGE;

const detectTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'analytics';

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const widgetRowsToCsv = (widget: AnalyticsWidgetPayload) => {
  if (widget.rows?.length && widget.columns?.length) {
    const lines = [widget.columns.map((column) => escapeCsvCell(column.label)).join(',')];
    widget.rows.forEach((row) => {
      lines.push(widget.columns!.map((column) => escapeCsvCell(row[column.key])).join(','));
    });
    return lines;
  }

  if (widget.series?.length) {
    const lines = ['Label,Value'];
    widget.series.forEach((entry) => {
      lines.push([escapeCsvCell(entry.label), escapeCsvCell(entry.value)].join(','));
    });
    return lines;
  }

  if (widget.breakdown?.length) {
    const lines = ['Label,Value,Meta'];
    widget.breakdown.forEach((entry) => {
      lines.push([escapeCsvCell(entry.label), escapeCsvCell(entry.value), escapeCsvCell(entry.meta || '')].join(','));
    });
    return lines;
  }

  if (widget.leaderboard?.length) {
    const lines = ['Label,Primary,Secondary,Badge'];
    widget.leaderboard.forEach((entry) => {
      lines.push([
        escapeCsvCell(entry.label),
        escapeCsvCell(entry.primary),
        escapeCsvCell(entry.secondary || ''),
        escapeCsvCell(entry.badge || '')
      ].join(','));
    });
    return lines;
  }

  if (widget.timeline?.length) {
    const lines = ['Label,Timestamp,Status,Description'];
    widget.timeline.forEach((entry) => {
      lines.push([
        escapeCsvCell(entry.label),
        escapeCsvCell(entry.timestamp || ''),
        escapeCsvCell(entry.status || ''),
        escapeCsvCell(entry.description || '')
      ].join(','));
    });
    return lines;
  }

  if (widget.ticker?.length) {
    return ['Event', ...widget.ticker.map((entry) => escapeCsvCell(entry))];
  }

  return ['Label,Value', `${escapeCsvCell(widget.title)},${escapeCsvCell(widget.footer || widget.emptyMessage || '')}`];
};

const buildCsvPayload = (payload: PersonaAnalyticsPagePayload) => {
  const sections: string[] = [];
  sections.push('Hero Metrics');
  sections.push('Metric,Value,Change');
  payload.heroMetrics.forEach((metric) => {
    sections.push([
      escapeCsvCell(metric.label),
      escapeCsvCell(metric.value),
      escapeCsvCell(metric.changeText || '')
    ].join(','));
  });

  payload.widgets.forEach((widget) => {
    sections.push('');
    sections.push(widget.title);
    widgetRowsToCsv(widget).forEach((line) => sections.push(line));
  });

  return sections.join('\n');
};

const buildEmptyPayload = ({
  scopeType,
  scopeId,
  pageId,
  range,
  timezone
}: {
  scopeType: AnalyticsScopeType;
  scopeId: string;
  pageId: AnalyticsPageId;
  range: AnalyticsTimeRange;
  timezone: string;
}): PersonaAnalyticsPagePayload => {
  const scopeLabel = ANALYTICS_SCOPE_LABELS[scopeType] || 'Analytics';
  const pageLabel = getScopePageList(scopeType).find((page) => page.id === pageId)?.label || 'Overview';

  return {
    scopeType,
    scopeId,
    pageId,
    range,
    generatedAt: new Date().toISOString(),
    staleAfterMs: 5000,
    timezone,
    title: `${scopeLabel} ${pageLabel}`,
    subtitle: `Real analytics for ${scopeLabel.toLowerCase()} workspaces will appear here as soon as activity is recorded for the selected range.`,
    personaLabel: scopeLabel,
    aggregateFallback: false,
    exportFormats: ['json', 'csv'],
    alerts: [],
    heroMetrics: [],
    widgets: []
  };
};

const normalizePayload = (
  payload: Partial<PersonaAnalyticsPagePayload> | null | undefined,
  fallback: {
    scopeType: AnalyticsScopeType;
    scopeId: string;
    pageId: AnalyticsPageId;
    range: AnalyticsTimeRange;
    timezone: string;
  }
): PersonaAnalyticsPagePayload => {
  const base = buildEmptyPayload(fallback);
  const source = payload && typeof payload === 'object' ? payload : {};

  return {
  ...base,
  ...source,
  aggregateFallback: false,
  alerts: Array.isArray(source.alerts) ? source.alerts : [],
  heroMetrics: Array.isArray(source.heroMetrics) ? source.heroMetrics : [],
  widgets: Array.isArray(source.widgets) ? source.widgets : [],
  exportFormats:
    Array.isArray(source.exportFormats) && source.exportFormats.length > 0
      ? source.exportFormats
      : ['json', 'csv']
  };
};

type ScopedAnalyticsPageProps = {
  scopeType: AnalyticsScopeType;
  scopeId: string;
  pageId?: string;
  widgetId?: string;
  switchHref?: string;
};

const ScopedAnalyticsPage: React.FC<ScopedAnalyticsPageProps> = ({
  scopeType,
  scopeId,
  pageId,
  widgetId,
  switchHref = '/profile/switch-accounts'
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedPageId = useMemo(
    () => (isScopePage(scopeType, pageId) ? pageId : null),
    [pageId, scopeType]
  );
  const scopePages = useMemo(() => getScopePageList(scopeType), [scopeType]);
  const timezone = searchParams.get('timezone') || detectTimezone();
  const range = parseRange(searchParams.get('range'));

  const [payload, setPayload] = useState<PersonaAnalyticsPagePayload | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<AnalyticsConnectionState>('reconnecting');

  const activeRequestRef = useRef(0);
  const inFlightRequestRef = useRef(false);
  const queuedRefreshRef = useRef(false);
  const lastSyncedAtRef = useRef(0);
  const isVisibleRef = useRef(typeof document === 'undefined' ? true : document.visibilityState !== 'hidden');
  const payloadRef = useRef<PersonaAnalyticsPagePayload | null>(null);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(key, value);
      if (!next.get('timezone')) next.set('timezone', timezone);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, timezone]
  );

  const loadPayload = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!resolvedPageId || !scopeId) return;
      if (inFlightRequestRef.current) {
        queuedRefreshRef.current = true;
        if (!silent && !payloadRef.current) setIsLoading(true);
        return;
      }

      const requestId = Date.now();
      activeRequestRef.current = requestId;
      inFlightRequestRef.current = true;
      if (!silent) setIsLoading(true);

      try {
        const nextPayload = await personaAnalyticsService.getScopedPagePayload(
          scopeType,
          scopeId,
          resolvedPageId,
          range,
          timezone
        );

        if (activeRequestRef.current !== requestId) return;
        setPayload(
          normalizePayload(nextPayload, {
            scopeType,
            scopeId,
            pageId: resolvedPageId,
            range,
            timezone
          })
        );
        setError('');
        setConnectionState('live');
        lastSyncedAtRef.current = Date.now();
      } catch (loadError) {
        if (activeRequestRef.current !== requestId) return;
        const message = loadError instanceof Error ? loadError.message : 'Unable to load analytics.';

        setError(message);
        setConnectionState((current) => {
          if (payloadRef.current) return 'delayed';
          return current === 'live' ? 'delayed' : 'reconnecting';
        });
      } finally {
        if (activeRequestRef.current === requestId) {
          inFlightRequestRef.current = false;
          if (!silent) setIsLoading(false);
        }

        if (queuedRefreshRef.current && isVisibleRef.current) {
          queuedRefreshRef.current = false;
          window.setTimeout(() => {
            void loadPayload({ silent: true });
          }, 0);
        }
      }
    },
    [range, resolvedPageId, scopeId, scopeType, timezone]
  );

  useEffect(() => {
    if (!searchParams.get('timezone')) {
      const next = new URLSearchParams(searchParams);
      next.set('timezone', timezone);
      if (!next.get('range')) next.set('range', range);
      setSearchParams(next, { replace: true });
    }
  }, [range, searchParams, setSearchParams, timezone]);

  useEffect(() => {
    void loadPayload();
  }, [loadPayload]);

  useEffect(() => {
    if (!scopeId || !resolvedPageId) return undefined;

    const unsubscribe = personaAnalyticsService.subscribeScopedStream(
      scopeType,
      scopeId,
      (message) => {
        if (!isVisibleRef.current) return;
        if (message.connectionState) setConnectionState(message.connectionState);
        if (message.type === 'analytics.connected') {
          lastSyncedAtRef.current = Date.now();
          setConnectionState('live');
          return;
        }
        if (message.type === 'analytics.delay') {
          setConnectionState('delayed');
          return;
        }
        if (message.pageId && message.pageId !== resolvedPageId) return;
        void loadPayload({ silent: true });
      },
      () => {
        setConnectionState('reconnecting');
      }
    );

    return unsubscribe;
  }, [loadPayload, resolvedPageId, scopeId, scopeType]);

  useEffect(() => {
    if (!scopeId || !resolvedPageId) return undefined;

    const interval = window.setInterval(() => {
      if (!isVisibleRef.current) return;
      void loadPayload({ silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadPayload, resolvedPageId, scopeId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState !== 'hidden';
      if (isVisibleRef.current) {
        setConnectionState('reconnecting');
        void loadPayload({ silent: Boolean(payloadRef.current) });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadPayload]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!lastSyncedAtRef.current) return;
      if (Date.now() - lastSyncedAtRef.current > 12000) {
        setConnectionState('delayed');
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  const handleExportJson = useCallback(() => {
    if (!payload) return;
    downloadFile(
      `${slugify(`${payload.personaLabel}-${payload.pageId}-${payload.range}`)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  }, [payload]);

  const handleExportCsv = useCallback(() => {
    if (!payload) return;
    downloadFile(
      `${slugify(`${payload.personaLabel}-${payload.pageId}-${payload.range}`)}.csv`,
      buildCsvPayload(payload),
      'text/csv;charset=utf-8'
    );
  }, [payload]);

  const buildScopedPageHref = useCallback(
    (nextPageId: AnalyticsPageId) => {
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('timezone', timezone);
      return `${buildAnalyticsPath(scopeType, nextPageId)}?${params.toString()}`;
    },
    [range, scopeType, timezone]
  );

  const buildScopedWidgetHref = useCallback(
    (nextWidgetId: string) => {
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('timezone', timezone);
      return `${buildAnalyticsWidgetPath(scopeType, resolvedPageId || getDefaultScopePage(scopeType), nextWidgetId)}?${params.toString()}`;
    },
    [range, resolvedPageId, scopeType, timezone]
  );

  const activeWidget = useMemo(() => {
    if (!widgetId || !payload) return null;
    return payload.widgets.find((entry) => entry.id === widgetId) || null;
  }, [payload, widgetId]);

  if (!resolvedPageId) {
    return <Navigate to={buildAnalyticsPath(scopeType, getDefaultScopePage(scopeType))} replace />;
  }

  if (!scopeId) {
    return (
      <div className="dashboard-shell flex min-h-[70vh] items-center justify-center p-6">
        <div className="glass-panel max-w-xl rounded-[32px] p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary/70">Analytics Unavailable</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">Switch into the matching workspace.</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            This analytics section needs an active persona before it can load batched page data.
          </p>
          <Link
            to={switchHref}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-primary-text shadow-lg"
          >
            Open Workspace Switcher
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && !payload) {
    return (
      <div className="dashboard-shell min-h-screen">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-[32px] px-6 py-6">
            <div className="flex items-center gap-4">
              <Spinner size="lg" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Loading Analytics</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Fetching real page payloads, live status, and widget data for this workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-metric-${index}`} className="glass-panel animate-pulse rounded-[30px] px-5 py-5">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-5 h-8 w-28 rounded-full bg-slate-200" />
                <div className="mt-4 h-3 w-36 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-widget-${index}`} className="glass-panel animate-pulse rounded-[32px] px-5 py-5">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-4 h-6 w-48 rounded-full bg-slate-200" />
                <div className="mt-3 h-3 w-72 rounded-full bg-slate-100" />
                <div className="mt-6 h-[220px] rounded-[24px] bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="dashboard-shell flex min-h-[70vh] items-center justify-center p-6">
        <div className="glass-panel max-w-xl rounded-[32px] p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500/70">Load Failed</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">Analytics could not load.</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {error || 'The analytics backend did not return a page payload.'}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            No mock or preview data is shown here. This screen only renders real backend analytics.
          </p>
          <button
            type="button"
            onClick={() => void loadPayload()}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-primary-text shadow-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {widgetId ? (
        <AnalyticsWidgetDetailPage
          payload={payload}
          widget={activeWidget}
          scopeType={scopeType}
          currentPageId={resolvedPageId}
          scopePages={scopePages}
          buildPageHref={buildScopedPageHref}
          buildWidgetHref={buildScopedWidgetHref}
          range={range}
          onRangeChange={(nextRange) => updateSearchParam('range', nextRange)}
          connectionState={connectionState}
          isRefreshing={Boolean(payload) && isLoading}
          onExportJson={handleExportJson}
          onExportCsv={handleExportCsv}
        />
      ) : (
        <AnalyticsShell
          payload={payload}
          scopeType={scopeType}
          currentPageId={resolvedPageId}
          scopePages={scopePages}
          buildPageHref={buildScopedPageHref}
          buildWidgetHref={buildScopedWidgetHref}
          range={range}
          onRangeChange={(nextRange) => updateSearchParam('range', nextRange)}
          connectionState={connectionState}
          isRefreshing={Boolean(payload) && isLoading}
          onExportJson={handleExportJson}
          onExportCsv={handleExportCsv}
        />
      )}

      {error ? (
        <div className="glass-panel fixed bottom-4 right-4 z-50 max-w-sm rounded-[22px] px-4 py-3 text-sm text-text-primary shadow-2xl">
          {error}
        </div>
      ) : null}
    </div>
  );
};

export default ScopedAnalyticsPage;
