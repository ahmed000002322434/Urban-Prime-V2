import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type {
  AnalyticsConnectionState,
  AnalyticsPageId,
  AnalyticsScopeType,
  AnalyticsTimeRange,
  AnalyticsWidgetPayload,
  PersonaAnalyticsHeroMetric,
  PersonaAnalyticsPagePayload
} from '../../types';
import useLowEndMode from '../../hooks/useLowEndMode';
import { useTheme } from '../../hooks/useTheme';
import {
  AnalyticsWidgetRenderer,
  WidgetCanvas,
  WidgetHeader,
  WidgetTag,
  getScopedTheme,
  timeRangeOptions,
  widgetHasData
} from './AnalyticsShell';

const DARK_THEME_NAMES = new Set(['obsidian', 'noir', 'hydra']);

const connectionTone: Record<AnalyticsConnectionState, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reconnecting: 'border-amber-200 bg-amber-50 text-amber-700',
  delayed: 'border-rose-200 bg-rose-50 text-rose-700'
};

const connectionLabel: Record<AnalyticsConnectionState, string> = {
  live: 'Live',
  reconnecting: 'Reconnecting',
  delayed: 'Delayed'
};

const formatMetricValue = (value: string | number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1000 ? value.toLocaleString() : value;
  }
  return value;
};

const getPanelSurface = (isDarkTheme: boolean) =>
  isDarkTheme
    ? 'linear-gradient(145deg, rgba(9,14,23,0.96), rgba(16,25,38,0.82))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.84), rgba(255,255,255,0.6))';

const getSubPanelSurface = (isDarkTheme: boolean) =>
  isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)';

const getTabSurface = (isDarkTheme: boolean) => (isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)');

type DetailSummaryCard = {
  id: string;
  label: string;
  value: string | number;
  detail: string;
};

type EvidenceTable = {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
};

const buildSummaryCards = (widget: AnalyticsWidgetPayload): DetailSummaryCard[] => {
  switch (widget.kind) {
    case 'timeseries': {
      const series = widget.series || [];
      const latest = series[series.length - 1]?.value ?? 0;
      const previous = series.length > 1 ? series[series.length - 2]?.value ?? 0 : 0;
      const peak = series.length ? Math.max(...series.map((entry) => entry.value)) : 0;
      return [
        {
          id: 'latest',
          label: 'Latest Point',
          value: latest,
          detail: previous ? `${latest - previous >= 0 ? '+' : ''}${(latest - previous).toLocaleString()} vs previous point` : 'First point in this range'
        },
        {
          id: 'peak',
          label: 'Peak Value',
          value: peak,
          detail: `${series.length.toLocaleString()} total points are shown in this trend`
        },
        {
          id: 'coverage',
          label: 'Series Coverage',
          value: series.length.toLocaleString(),
          detail: widget.comparisonSeries?.length ? 'Includes a comparison series for context' : 'Single live trend for this card'
        }
      ];
    }
    case 'donut':
    case 'bar-list':
    case 'stat-list': {
      const breakdown = (widget.breakdown || []).length
        ? widget.breakdown || []
        : (widget.series || []).map((entry, index) => ({
            id: entry.id || `entry-${index}`,
            label: entry.label,
            value: entry.value,
            meta: entry.date
          }));
      const total = breakdown.reduce((sum, entry) => sum + entry.value, 0);
      const top = breakdown.reduce<(typeof breakdown)[number] | null>((current, entry) => {
        if (!current || entry.value > current.value) return entry;
        return current;
      }, null);
      return [
        {
          id: 'total',
          label: 'Total Value',
          value: total,
          detail: `${breakdown.length.toLocaleString()} ranked items are included in this card`
        },
        {
          id: 'leader',
          label: 'Top Driver',
          value: top?.label || '--',
          detail: top ? `${top.value.toLocaleString()} from the current leader` : 'Waiting for the first ranked value'
        },
        {
          id: 'distribution',
          label: 'Distribution Size',
          value: breakdown.length.toLocaleString(),
          detail: 'Open the evidence table below to inspect each item line by line'
        }
      ];
    }
    case 'funnel': {
      const stages = widget.stages || [];
      const first = stages[0]?.value ?? 0;
      const last = stages[stages.length - 1]?.value ?? 0;
      const completionRate = first > 0 ? Math.round((last / first) * 100) : 0;
      return [
        {
          id: 'entry',
          label: 'Entry Volume',
          value: first,
          detail: `${stages.length.toLocaleString()} funnel stages are shown`
        },
        {
          id: 'completion',
          label: 'Completion Rate',
          value: `${completionRate}%`,
          detail: 'Derived from the first and final stages in this funnel'
        },
        {
          id: 'final-stage',
          label: 'Final Stage',
          value: last,
          detail: stages[stages.length - 1]?.label || 'Awaiting the final stage'
        }
      ];
    }
    case 'table': {
      const rowCount = widget.rows?.length || 0;
      const columnCount = widget.columns?.length || 0;
      return [
        {
          id: 'rows',
          label: 'Rows',
          value: rowCount,
          detail: `${columnCount.toLocaleString()} columns are included in this table`
        },
        {
          id: 'schema',
          label: 'Primary Column',
          value: widget.columns?.[0]?.label || '--',
          detail: 'The first column is used as the anchor for row review'
        },
        {
          id: 'records',
          label: 'Record Source',
          value: widget.aggregateMode === 'event' ? 'Verified' : 'Aggregate',
          detail: 'This table is built from the same live payload as the card on the main page'
        }
      ];
    }
    case 'leaderboard': {
      const entries = widget.leaderboard || [];
      return [
        {
          id: 'entries',
          label: 'Entries',
          value: entries.length,
          detail: 'Leaderboard positions are ranked from the live payload'
        },
        {
          id: 'leader',
          label: 'Current Leader',
          value: entries[0]?.label || '--',
          detail: entries[0]?.primary ? `${entries[0].primary}` : 'Waiting for ranked output'
        },
        {
          id: 'badges',
          label: 'Badges',
          value: entries.filter((entry) => Boolean(entry.badge)).length,
          detail: 'Badges highlight tiers, statuses, or tags returned by the backend'
        }
      ];
    }
    case 'timeline': {
      const timeline = widget.timeline || [];
      return [
        {
          id: 'events',
          label: 'Events',
          value: timeline.length,
          detail: 'Timeline entries are ordered exactly as returned by the backend'
        },
        {
          id: 'latest',
          label: 'Latest Status',
          value: timeline[0]?.status || timeline[timeline.length - 1]?.status || '--',
          detail: timeline[0]?.timestamp || timeline[timeline.length - 1]?.timestamp || 'No timestamp is available yet'
        },
        {
          id: 'coverage',
          label: 'Activity Window',
          value: timeline.length ? 'Active' : 'Waiting',
          detail: 'Use the evidence table below to review every timeline row in order'
        }
      ];
    }
    case 'heatmap': {
      const heatmap = widget.heatmap || [];
      const hottest = heatmap.reduce<(typeof heatmap)[number] | null>((current, entry) => {
        if (!current || entry.value > current.value) return entry;
        return current;
      }, null);
      return [
        {
          id: 'cells',
          label: 'Cells',
          value: heatmap.length,
          detail: 'Each cell represents a real x and y intersection from the payload'
        },
        {
          id: 'peak',
          label: 'Peak Cell',
          value: hottest ? `${hottest.x} / ${hottest.y}` : '--',
          detail: hottest ? `${hottest.value.toLocaleString()} recorded at the busiest intersection` : 'Awaiting heatmap activity'
        },
        {
          id: 'coverage',
          label: 'Grid State',
          value: heatmap.length ? 'Populated' : 'Waiting',
          detail: 'Higher values render as stronger intensity in the main visual'
        }
      ];
    }
    case 'ticker': {
      const ticker = widget.ticker || [];
      return [
        {
          id: 'events',
          label: 'Messages',
          value: ticker.length,
          detail: 'Ticker items stay in arrival order from the backend'
        },
        {
          id: 'latest',
          label: 'Latest Message',
          value: ticker[0] || '--',
          detail: 'Use the table below to scan the full live ticker list'
        },
        {
          id: 'stream',
          label: 'Feed Type',
          value: widget.aggregateMode === 'event' ? 'Verified' : 'Aggregate',
          detail: 'The card stays connected to the same live stream as the main page'
        }
      ];
    }
    default:
      return [
        {
          id: 'card',
          label: 'Card Status',
          value: widgetHasData(widget) ? 'Ready' : 'Waiting',
          detail: widgetHasData(widget) ? 'Real analytics rows are present for this card' : 'This card is ready but no records have been returned in the selected range'
        }
      ];
  }
};

const buildEvidenceTable = (widget: AnalyticsWidgetPayload): EvidenceTable | null => {
  if (widget.rows?.length && widget.columns?.length) {
    return {
      columns: widget.columns.map((column) => ({ key: column.key, label: column.label })),
      rows: widget.rows
    };
  }

  if (widget.series?.length) {
    return {
      columns: [
        { key: 'label', label: 'Point' },
        { key: 'value', label: 'Value' },
        { key: 'secondaryValue', label: 'Comparison' },
        { key: 'date', label: 'Date' }
      ],
      rows: widget.series.map((entry) => ({
        label: entry.label,
        value: entry.value,
        secondaryValue: entry.secondaryValue ?? null,
        date: entry.date || null
      }))
    };
  }

  if (widget.breakdown?.length) {
    return {
      columns: [
        { key: 'label', label: 'Item' },
        { key: 'value', label: 'Value' },
        { key: 'secondaryValue', label: 'Secondary' },
        { key: 'meta', label: 'Context' }
      ],
      rows: widget.breakdown.map((entry) => ({
        label: entry.label,
        value: entry.value,
        secondaryValue: entry.secondaryValue ?? null,
        meta: entry.meta || null
      }))
    };
  }

  if (widget.leaderboard?.length) {
    return {
      columns: [
        { key: 'label', label: 'Item' },
        { key: 'primary', label: 'Primary' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'badge', label: 'Badge' }
      ],
      rows: widget.leaderboard.map((entry) => ({
        label: entry.label,
        primary: entry.primary,
        secondary: entry.secondary || null,
        badge: entry.badge || null
      }))
    };
  }

  if (widget.stages?.length) {
    return {
      columns: [
        { key: 'label', label: 'Stage' },
        { key: 'value', label: 'Value' },
        { key: 'percentage', label: 'Percent' },
        { key: 'description', label: 'Description' }
      ],
      rows: widget.stages.map((entry) => ({
        label: entry.label,
        value: entry.value,
        percentage: entry.percentage !== undefined ? `${entry.percentage.toFixed(1)}%` : null,
        description: entry.description || null
      }))
    };
  }

  if (widget.timeline?.length) {
    return {
      columns: [
        { key: 'label', label: 'Event' },
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'status', label: 'Status' },
        { key: 'description', label: 'Description' }
      ],
      rows: widget.timeline.map((entry) => ({
        label: entry.label,
        timestamp: entry.timestamp || null,
        status: entry.status || null,
        description: entry.description || null
      }))
    };
  }

  if (widget.heatmap?.length) {
    return {
      columns: [
        { key: 'x', label: 'Column' },
        { key: 'y', label: 'Row' },
        { key: 'value', label: 'Value' }
      ],
      rows: widget.heatmap.map((entry) => ({
        x: entry.x,
        y: entry.y,
        value: entry.value
      }))
    };
  }

  if (widget.ticker?.length) {
    return {
      columns: [
        { key: 'index', label: 'Order' },
        { key: 'message', label: 'Message' }
      ],
      rows: widget.ticker.map((entry, index) => ({
        index: index + 1,
        message: entry
      }))
    };
  }

  return null;
};

const renderTableCell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '--';
  return value;
};

type AnalyticsWidgetDetailPageProps = {
  payload: PersonaAnalyticsPagePayload;
  widget: AnalyticsWidgetPayload | null;
  scopeType: AnalyticsScopeType;
  currentPageId: AnalyticsPageId;
  scopePages: Array<{ id: AnalyticsPageId; label: string }>;
  buildPageHref: (pageId: AnalyticsPageId) => string;
  buildWidgetHref: (widgetId: string) => string;
  range: AnalyticsTimeRange;
  onRangeChange: (next: AnalyticsTimeRange) => void;
  connectionState: AnalyticsConnectionState;
  isRefreshing?: boolean;
  onExportJson: () => void;
  onExportCsv: () => void;
};

const AnalyticsWidgetDetailPage: React.FC<AnalyticsWidgetDetailPageProps> = ({
  payload,
  widget,
  scopeType,
  currentPageId,
  scopePages,
  buildPageHref,
  buildWidgetHref,
  range,
  onRangeChange,
  connectionState,
  isRefreshing = false,
  onExportJson,
  onExportCsv
}) => {
  const { resolvedTheme } = useTheme();
  const lowEndMode = useLowEndMode();
  const isDarkTheme = DARK_THEME_NAMES.has(resolvedTheme);
  const theme = useMemo(() => getScopedTheme(scopeType, isDarkTheme), [scopeType, isDarkTheme]);

  const summaryCards = useMemo(() => (widget ? buildSummaryCards(widget) : []), [widget]);
  const evidenceTable = useMemo(() => (widget ? buildEvidenceTable(widget) : null), [widget]);
  const relatedCards = useMemo(
    () => payload.widgets.filter((entry) => entry.id !== widget?.id).slice(0, 6),
    [payload.widgets, widget]
  );
  const contextMetrics = useMemo(() => payload.heroMetrics.slice(0, 4), [payload.heroMetrics]);

  if (!widget) {
    return (
      <div className="dashboard-shell min-h-screen">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <section className="glass-panel rounded-[32px] px-5 py-6 sm:px-6" style={{ boxShadow: `0 24px 70px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(${theme.accentRgb}, 0.06) inset` }}>
            <div className="flex flex-col gap-4">
              <Link to={buildPageHref(currentPageId)} className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                Back To {payload.title}
              </Link>
              <div className="space-y-3">
                <WidgetTag label={`${payload.personaLabel} Analytics`} theme={theme} />
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.textStrong }}>
                  This card is unavailable.
                </h1>
                <p className="max-w-2xl text-sm leading-6" style={{ color: theme.textMuted }}>
                  The requested card was not returned for this page and range. Open one of the available cards below to continue exploring real analytics.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payload.widgets.map((entry) => (
              <Link
                key={entry.id}
                to={buildWidgetHref(entry.id)}
                className="dashboard-glass-card rounded-[28px] border px-5 py-5 transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: `rgba(${theme.accentRgb}, 0.12)`,
                  background: getPanelSurface(isDarkTheme)
                }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                  {widgetHasData(entry) ? 'Ready To Explore' : 'Awaiting Records'}
                </p>
                <p className="mt-3 text-lg font-bold" style={{ color: theme.textStrong }}>
                  {entry.title}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                  {entry.description || entry.footer || 'Open this card detail page to review the full breakdown and evidence table.'}
                </p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <motion.section
          initial={lowEndMode ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: lowEndMode ? 0.18 : 0.4, ease: 'easeOut' }}
          className="glass-panel sticky top-3 z-30 overflow-hidden rounded-[32px] px-5 py-5 sm:px-6"
          style={{ boxShadow: `0 24px 70px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(${theme.accentRgb}, 0.06) inset` }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: theme.heroGlow }} />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link to={buildPageHref(currentPageId)} className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                    Back To {payload.title}
                  </Link>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${connectionTone[connectionState]}`}>
                    <motion.span
                      className="h-2 w-2 rounded-full bg-current"
                      animate={
                        !lowEndMode && connectionState === 'live'
                          ? { scale: [1, 1.45, 1], opacity: [0.55, 1, 0.55] }
                          : { scale: 1, opacity: 1 }
                      }
                      transition={!lowEndMode ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.1 }}
                    />
                    {connectionLabel[connectionState]}
                  </span>
                  {isRefreshing ? (
                    <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                      Refreshing this card...
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <WidgetTag label={payload.personaLabel} theme={theme} />
                  {widget.accent ? <WidgetTag label={widget.accent} theme={theme} /> : null}
                </div>

                <div className="mt-4">
                  <WidgetHeader
                    title={widget.title}
                    description={widget.description || widget.footer || 'This detail page expands the selected analytics card using the same live payload returned for the page.'}
                    theme={theme}
                    aggregateMode={widget.aggregateMode}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <label className="glass-button rounded-full px-3 py-2 text-xs font-semibold" style={{ color: theme.textStrong }}>
                  <span className="mr-2 uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    Range
                  </span>
                  <select
                    value={range}
                    onChange={(event) => onRangeChange(event.target.value as AnalyticsTimeRange)}
                    className="bg-transparent font-semibold outline-none"
                    style={{ color: theme.textStrong }}
                  >
                    {timeRangeOptions.map((option) => (
                      <option key={option} value={option} className="bg-white text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <span className="glass-button inline-flex rounded-full px-3 py-2 text-xs font-semibold" style={{ color: theme.textStrong }}>
                  <span className="mr-2 uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    Timezone
                  </span>
                  {payload.timezone}
                </span>

                <button
                  type="button"
                  onClick={onExportJson}
                  className="glass-button rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
                  style={{ color: theme.textStrong }}
                >
                  Export JSON
                </button>

                <button
                  type="button"
                  onClick={onExportCsv}
                  className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})` }}
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {scopePages.map((page) => (
                <Link
                  key={page.id}
                  to={buildPageHref(page.id)}
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all"
                  style={
                    currentPageId === page.id
                      ? {
                          color: '#ffffff',
                          borderColor: 'transparent',
                          background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
                          boxShadow: `0 12px 26px rgba(${theme.accentRgb}, 0.24)`
                        }
                      : {
                          color: theme.textStrong,
                          borderColor: theme.border,
                          background: getTabSurface(isDarkTheme)
                        }
                  }
                >
                  {page.label}
                </Link>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.id}
                  className="dashboard-glass-card rounded-[26px] border px-4 py-4"
                  style={{
                    borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                    background: getPanelSurface(isDarkTheme)
                  }}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight" style={{ color: theme.textStrong }}>
                    {formatMetricValue(card.value)}
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    {card.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {payload.widgets.map((entry) => (
                <Link
                  key={entry.id}
                  to={buildWidgetHref(entry.id)}
                  className="dashboard-glass-card min-w-[220px] rounded-[24px] border px-4 py-4 transition-transform hover:-translate-y-0.5"
                  style={{
                    borderColor: entry.id === widget.id ? `rgba(${theme.accentRgb}, 0.28)` : `rgba(${theme.accentRgb}, 0.1)`,
                    background: entry.id === widget.id ? `linear-gradient(145deg, rgba(${theme.accentRgb}, 0.18), ${getSubPanelSurface(isDarkTheme)})` : getSubPanelSurface(isDarkTheme)
                  }}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                    {entry.id === widget.id ? 'Current Card' : widgetHasData(entry) ? 'Open Detail' : 'Awaiting Records'}
                  </p>
                  <p className="mt-3 text-sm font-bold leading-6" style={{ color: theme.textStrong }}>
                    {entry.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>

        <section className={`grid gap-4 transition-opacity xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}>
          <motion.article
            initial={lowEndMode ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut' }}
            className="glass-panel rounded-[32px] px-5 py-5"
            style={{ boxShadow: `0 20px 55px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(${theme.accentRgb}, 0.03) inset` }}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                    Expanded View
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    This is the same live card rendered full-width with no sidebar compression.
                  </p>
                </div>
                <Link to={buildPageHref(currentPageId)} className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                  Return To Page
                </Link>
              </div>

              <WidgetCanvas theme={theme}>
                <AnalyticsWidgetRenderer widget={widget} theme={theme} reducedMotion={lowEndMode} />
              </WidgetCanvas>
            </div>
          </motion.article>

          <div className="grid gap-4">
            <motion.article
              initial={lowEndMode ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut', delay: lowEndMode ? 0 : 0.04 }}
              className="glass-panel rounded-[32px] px-5 py-5"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Page Context
              </p>
              <div className="mt-4 grid gap-3">
                {contextMetrics.length > 0 ? (
                  contextMetrics.map((metric: PersonaAnalyticsHeroMetric) => (
                    <div
                      key={metric.id}
                      className="rounded-[22px] border px-4 py-4"
                      style={{
                        borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                        background: getSubPanelSurface(isDarkTheme)
                      }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                        {metric.label}
                      </p>
                      <p className="mt-3 text-2xl font-black tracking-tight" style={{ color: theme.textStrong }}>
                        {formatMetricValue(metric.value)}
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                        {metric.changeText || 'Context metric from the same analytics page.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div
                    className="rounded-[22px] border px-4 py-4"
                    style={{
                      borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                      background: getSubPanelSurface(isDarkTheme)
                    }}
                  >
                    <p className="text-sm leading-6" style={{ color: theme.textMuted }}>
                      Hero metrics are not available for this page yet, but the card remains connected to the live analytics payload.
                    </p>
                  </div>
                )}
              </div>
            </motion.article>

            {payload.alerts.length > 0 ? (
              <motion.article
                initial={lowEndMode ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut', delay: lowEndMode ? 0 : 0.08 }}
                className="glass-panel rounded-[32px] px-5 py-5"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                  Alerts On This Page
                </p>
                <div className="mt-4 grid gap-3">
                  {payload.alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-[22px] border px-4 py-4"
                      style={{
                        borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                        background: getSubPanelSurface(isDarkTheme)
                      }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                        {alert.tone}
                      </p>
                      <p className="mt-2 text-base font-bold" style={{ color: theme.textStrong }}>
                        {alert.title}
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                        {alert.description}
                      </p>
                      {alert.actionLabel && alert.actionHref ? (
                        <Link to={alert.actionHref} className="mt-3 inline-flex text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                          {alert.actionLabel}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </motion.article>
            ) : null}

            {relatedCards.length > 0 ? (
              <motion.article
                initial={lowEndMode ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut', delay: lowEndMode ? 0 : 0.12 }}
                className="glass-panel rounded-[32px] px-5 py-5"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                  Related Cards
                </p>
                <div className="mt-4 grid gap-3">
                  {relatedCards.map((entry) => (
                    <Link
                      key={entry.id}
                      to={buildWidgetHref(entry.id)}
                      className="rounded-[22px] border px-4 py-4 transition-transform hover:-translate-y-0.5"
                      style={{
                        borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                        background: getSubPanelSurface(isDarkTheme)
                      }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                        {widgetHasData(entry) ? 'Open Detail' : 'Awaiting Records'}
                      </p>
                      <p className="mt-2 text-base font-bold" style={{ color: theme.textStrong }}>
                        {entry.title}
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                        {entry.description || entry.footer || 'Open this card to inspect the full breakdown.'}
                      </p>
                    </Link>
                  ))}
                </div>
              </motion.article>
            ) : null}
          </div>
        </section>

        <motion.section
          initial={lowEndMode ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut', delay: lowEndMode ? 0 : 0.12 }}
          className="glass-panel rounded-[32px] px-5 py-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Evidence Table
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                Review the underlying rows for this card directly from the same real payload used by the visual.
              </p>
            </div>
            <p className="text-xs font-semibold" style={{ color: theme.textMuted }}>
              {widgetHasData(widget) ? 'Live rows available for inspection' : 'No rows have been returned for the selected range yet'}
            </p>
          </div>

          {evidenceTable ? (
            <div className="mt-5 overflow-hidden rounded-[26px] border" style={{ borderColor: theme.border }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead style={{ background: getSubPanelSurface(isDarkTheme) }}>
                    <tr>
                      {evidenceTable.columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em]"
                          style={{ color: theme.textMuted }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceTable.rows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="border-t" style={{ borderColor: theme.border }}>
                        {evidenceTable.columns.map((column) => (
                          <td key={column.key} className="px-4 py-3 align-top" style={{ color: theme.textStrong }}>
                            {renderTableCell(row[column.key] as string | number | null | undefined)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div
              className="mt-5 rounded-[26px] border border-dashed px-5 py-8 text-center"
              style={{
                borderColor: `rgba(${theme.accentRgb}, 0.18)`,
                background: getSubPanelSurface(isDarkTheme)
              }}
            >
              <p className="text-base font-semibold" style={{ color: theme.textStrong }}>
                This card does not have tabular evidence rows yet.
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                The main visual is still using real payload data. When the backend returns row-based detail for this card, it will appear here automatically.
              </p>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default AnalyticsWidgetDetailPage;
