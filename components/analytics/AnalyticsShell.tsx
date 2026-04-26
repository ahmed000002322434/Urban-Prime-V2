import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type {
  AnalyticsConnectionState,
  AnalyticsPageId,
  AnalyticsScopeType,
  AnalyticsTimeRange,
  AnalyticsWidgetPayload,
  PersonaAnalyticsPagePayload
} from '../../types';
import useLowEndMode from '../../hooks/useLowEndMode';
import { useTheme } from '../../hooks/useTheme';

export type AnalyticsTheme = {
  accent: string;
  accentRgb: string;
  accentAlt: string;
  accentAltRgb: string;
  isDark?: boolean;
  chip: string;
  chipText: string;
  panelGlow: string;
  heroGlow: string;
  textStrong: string;
  textMuted: string;
  border: string;
  axis: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
};

type WidgetProps = {
  widget: AnalyticsWidgetPayload;
  theme: AnalyticsTheme;
  reducedMotion?: boolean;
};

export const timeRangeOptions: AnalyticsTimeRange[] = ['24h', '7d', '30d', '90d', '180d'];

const SCOPE_THEMES: Record<AnalyticsScopeType, AnalyticsTheme> = {
  consumer: {
    accent: '#3b82f6',
    accentRgb: '59, 130, 246',
    accentAlt: '#14b8a6',
    accentAltRgb: '20, 184, 166',
    chip: 'rgba(59, 130, 246, 0.14)',
    chipText: '#1d4ed8',
    panelGlow: 'rgba(59, 130, 246, 0.12)',
    heroGlow: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.2), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  },
  seller: {
    accent: '#ea580c',
    accentRgb: '234, 88, 12',
    accentAlt: '#f59e0b',
    accentAltRgb: '245, 158, 11',
    chip: 'rgba(234, 88, 12, 0.14)',
    chipText: '#c2410c',
    panelGlow: 'rgba(234, 88, 12, 0.12)',
    heroGlow: 'radial-gradient(circle at top right, rgba(234, 88, 12, 0.18), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  },
  provider: {
    accent: '#0ea5e9',
    accentRgb: '14, 165, 233',
    accentAlt: '#38bdf8',
    accentAltRgb: '56, 189, 248',
    chip: 'rgba(14, 165, 233, 0.14)',
    chipText: '#0369a1',
    panelGlow: 'rgba(14, 165, 233, 0.12)',
    heroGlow: 'radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  },
  affiliate: {
    accent: '#db2777',
    accentRgb: '219, 39, 119',
    accentAlt: '#f59e0b',
    accentAltRgb: '245, 158, 11',
    chip: 'rgba(219, 39, 119, 0.12)',
    chipText: '#be185d',
    panelGlow: 'rgba(219, 39, 119, 0.1)',
    heroGlow: 'radial-gradient(circle at top right, rgba(219, 39, 119, 0.16), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  },
  shipper: {
    accent: '#059669',
    accentRgb: '5, 150, 105',
    accentAlt: '#14b8a6',
    accentAltRgb: '20, 184, 166',
    chip: 'rgba(5, 150, 105, 0.14)',
    chipText: '#047857',
    panelGlow: 'rgba(5, 150, 105, 0.12)',
    heroGlow: 'radial-gradient(circle at top right, rgba(5, 150, 105, 0.18), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  },
  admin: {
    accent: '#2563eb',
    accentRgb: '37, 99, 235',
    accentAlt: '#f43f5e',
    accentAltRgb: '244, 63, 94',
    chip: 'rgba(37, 99, 235, 0.14)',
    chipText: '#1d4ed8',
    panelGlow: 'rgba(37, 99, 235, 0.12)',
    heroGlow: 'radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 58%)',
    textStrong: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.68)',
    border: 'rgba(148, 163, 184, 0.2)',
    axis: 'rgba(15, 23, 42, 0.55)',
    grid: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255,255,255,0.98)',
    tooltipBorder: 'rgba(148,163,184,0.26)'
  }
};

const DARK_THEME_NAMES = new Set(['obsidian', 'noir', 'hydra']);

export const getScopedTheme = (scopeType: AnalyticsScopeType, isDarkTheme: boolean): AnalyticsTheme => {
  const base = SCOPE_THEMES[scopeType] || SCOPE_THEMES.consumer;
  if (!isDarkTheme) {
    return { ...base, isDark: false };
  }

  return {
    ...base,
    isDark: true,
    chip: `rgba(${base.accentRgb}, 0.18)`,
    chipText: '#eaf4ff',
    panelGlow: `rgba(${base.accentRgb}, 0.22)`,
    heroGlow: `radial-gradient(circle at top right, rgba(${base.accentRgb}, 0.24), transparent 58%)`,
    textStrong: '#f8fafc',
    textMuted: 'rgba(226, 232, 240, 0.74)',
    border: 'rgba(255, 255, 255, 0.1)',
    axis: 'rgba(226, 232, 240, 0.62)',
    grid: 'rgba(255, 255, 255, 0.08)',
    tooltipBackground: 'rgba(10, 16, 26, 0.96)',
    tooltipBorder: `rgba(${base.accentRgb}, 0.22)`
  };
};

const toneClasses: Record<string, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  default: 'border-slate-200 bg-white/80 text-slate-900'
};

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

const tableAlignClass: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

const metricToneClass = (tone?: string) => {
  if (tone === 'positive') return 'text-emerald-600';
  if (tone === 'warning') return 'text-amber-600';
  if (tone === 'critical') return 'text-rose-600';
  return 'text-slate-500';
};

const formatMetricValue = (value: string | number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1000 ? value.toLocaleString() : value;
  }
  return value;
};

const formatAxisValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
};

const renderTableCell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '--';
  return value;
};

const getPalette = (theme: AnalyticsTheme) => [
  theme.accent,
  theme.accentAlt,
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#7c3aed',
  '#334155'
];

const getWidgetSpanClass = (kind: AnalyticsWidgetPayload['kind']) => {
  if (kind === 'timeseries' || kind === 'table' || kind === 'timeline' || kind === 'heatmap') {
    return 'xl:col-span-2';
  }
  return 'xl:col-span-1';
};

const getAggregateLabel = (aggregateMode?: AnalyticsWidgetPayload['aggregateMode']) =>
  aggregateMode === 'event' ? 'Verified Feed' : 'Rollup Feed';

export const widgetHasData = (widget: AnalyticsWidgetPayload) =>
  Boolean(
    widget.series?.length ||
      widget.comparisonSeries?.length ||
      widget.breakdown?.length ||
      widget.leaderboard?.length ||
      widget.rows?.length ||
      widget.stages?.length ||
      widget.timeline?.length ||
      widget.heatmap?.length ||
      widget.ticker?.length
  );

const formatFreshnessWindow = (staleAfterMs: number) => {
  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) return 'live';
  if (staleAfterMs < 1000) return `${Math.round(staleAfterMs)} ms`;
  if (staleAfterMs < 60000) return `${Math.round(staleAfterMs / 1000)} sec`;
  return `${Math.round(staleAfterMs / 60000)} min`;
};

const formatRelativeSyncTime = (generatedAt: string) => {
  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) return 'just now';
  const diffMs = Date.now() - timestamp;
  if (diffMs < 5000) return 'just now';
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s ago`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m ago`;
  return new Date(generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getStatChipSurface = (theme: AnalyticsTheme) =>
  theme.isDark
    ? 'linear-gradient(145deg, rgba(12,18,28,0.92), rgba(17,27,39,0.76))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))';

const getCanvasSurface = (theme: AnalyticsTheme) =>
  theme.isDark
    ? 'linear-gradient(145deg, rgba(8,14,24,0.95), rgba(15,24,36,0.82))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,255,255,0.62))';

const getCanvasShadow = (theme: AnalyticsTheme) =>
  theme.isDark
    ? `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(${theme.accentRgb}, 0.06)`
    : `inset 0 1px 0 rgba(255,255,255,0.55), 0 18px 40px rgba(${theme.accentRgb}, 0.06)`;

const getEmptySurface = (theme: AnalyticsTheme) =>
  theme.isDark
    ? `linear-gradient(135deg, rgba(${theme.accentRgb}, 0.12), rgba(10,16,26,0.86))`
    : `linear-gradient(135deg, rgba(${theme.accentRgb}, 0.06), rgba(255,255,255,0.62))`;

const getSubCardSurface = (theme: AnalyticsTheme) =>
  theme.isDark
    ? 'linear-gradient(145deg, rgba(13,19,30,0.9), rgba(18,28,42,0.74))'
    : 'rgba(255,255,255,0.72)';

const getSoftTrackSurface = (theme: AnalyticsTheme) =>
  theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';

const getTableHeadSurface = (theme: AnalyticsTheme) =>
  theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)';

const getTimelineRailColor = (theme: AnalyticsTheme) =>
  theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgb(226 232 240)';

const getInactiveTabSurface = (theme: AnalyticsTheme) =>
  theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)';

const getStatusCardSurface = (theme: AnalyticsTheme) =>
  theme.isDark
    ? 'linear-gradient(145deg, rgba(11,17,27,0.94), rgba(17,27,39,0.82))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.56))';

export const WidgetTag: React.FC<{ label: string; theme: AnalyticsTheme }> = ({ label, theme }) => (
  <span
    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
    style={{
      background: theme.chip,
      color: theme.chipText,
      borderColor: `rgba(${theme.accentRgb}, 0.16)`
    }}
  >
    {label}
  </span>
);

const StatChip: React.FC<{ label: string; value: string | number; theme: AnalyticsTheme }> = ({ label, value, theme }) => (
  <div
    className="rounded-[20px] border px-3 py-2.5"
    style={{
      borderColor: `rgba(${theme.accentRgb}, 0.12)`,
      background: getStatChipSurface(theme)
    }}
  >
    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
      {label}
    </p>
    <p className="mt-2 text-sm font-black" style={{ color: theme.textStrong }}>
      {typeof value === 'number' ? formatMetricValue(value) : value}
    </p>
  </div>
);

export const WidgetCanvas: React.FC<{ children: React.ReactNode; theme: AnalyticsTheme }> = ({ children, theme }) => (
  <div
    className="rounded-[28px] border p-4 sm:p-5"
    style={{
      borderColor: `rgba(${theme.accentRgb}, 0.12)`,
      background: getCanvasSurface(theme),
      boxShadow: getCanvasShadow(theme)
    }}
  >
    {children}
  </div>
);

const EmptyState: React.FC<{ message: string; theme: AnalyticsTheme }> = ({ message, theme }) => (
  <div
    className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed px-6 text-center"
    style={{
      borderColor: `rgba(${theme.accentRgb}, 0.18)`,
      background: getEmptySurface(theme)
    }}
  >
    <div className="max-w-md space-y-2">
      <p className="text-sm font-semibold" style={{ color: theme.textStrong }}>
        Waiting for live records.
      </p>
      <p className="text-sm" style={{ color: theme.textMuted }}>
        {message}
      </p>
    </div>
  </div>
);

const tooltipStyle = (theme: AnalyticsTheme) => ({
  background: theme.tooltipBackground,
  border: `1px solid ${theme.tooltipBorder}`,
  borderRadius: 18,
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
  color: theme.textStrong
});

export const WidgetHeader: React.FC<{
  title: string;
  description?: string;
  theme: AnalyticsTheme;
  aggregateMode?: AnalyticsWidgetPayload['aggregateMode'];
}> = ({ title, description, theme, aggregateMode }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <WidgetTag label={getAggregateLabel(aggregateMode)} theme={theme} />
    </div>
    <div>
      <h3 className="text-xl font-bold tracking-tight" style={{ color: theme.textStrong }}>
        {title}
      </h3>
      {description ? (
        <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
          {description}
        </p>
      ) : null}
    </div>
  </div>
);

const SeriesWidget: React.FC<WidgetProps> = ({ widget, theme, reducedMotion }) => {
  const data = widget.series || [];

  if (data.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No trend points have been recorded for this range yet.'} theme={theme} />;
  }

  const latestValue = data[data.length - 1]?.value ?? 0;
  const peakValue = Math.max(...data.map((entry) => entry.value), 0);
  const averageValue = Math.round(data.reduce((sum, entry) => sum + entry.value, 0) / Math.max(data.length, 1));

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <StatChip label="Latest" value={latestValue} theme={theme} />
        <StatChip label="Peak" value={peakValue} theme={theme} />
        <StatChip label="Average" value={averageValue} theme={theme} />
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`analytics-gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.accent} stopOpacity={0.4} />
                <stop offset="95%" stopColor={theme.accent} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} tickFormatter={formatAxisValue} />
            <Tooltip contentStyle={tooltipStyle(theme)} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={theme.accent}
              strokeWidth={3}
              fill={`url(#analytics-gradient-${widget.id})`}
              isAnimationActive={!reducedMotion}
              animationDuration={520}
            />
            {widget.comparisonSeries?.length ? (
              <Area
                type="monotone"
                data={widget.comparisonSeries}
                dataKey="value"
                stroke={theme.accentAlt}
                strokeWidth={2}
                fillOpacity={0}
                isAnimationActive={false}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DonutWidget: React.FC<WidgetProps> = ({ widget, theme, reducedMotion }) => {
  const breakdown = widget.breakdown || [];
  const palette = getPalette(theme);

  if (breakdown.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No segments have been recorded for this range yet.'} theme={theme} />;
  }

  const totalValue = breakdown.reduce((sum, entry) => sum + entry.value, 0);
  const leadingEntry = breakdown.reduce((current, entry) => (entry.value > current.value ? entry : current), breakdown[0]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <StatChip label="Total" value={totalValue} theme={theme} />
        <StatChip label="Leader" value={leadingEntry?.label || '--'} theme={theme} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                innerRadius={68}
                outerRadius={98}
                dataKey="value"
                paddingAngle={4}
                isAnimationActive={!reducedMotion}
                animationDuration={520}
              >
                {breakdown.map((entry, index) => (
                  <Cell key={entry.id} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle(theme)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {breakdown.map((entry, index) => (
          <div
            key={entry.id}
            className="rounded-[22px] border px-4 py-3"
            style={{ borderColor: theme.border, background: getSubCardSurface(theme) }}
          >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                  <p className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                    {entry.label}
                  </p>
                </div>
                <p className="text-sm font-black" style={{ color: theme.textStrong }}>
                  {entry.value.toLocaleString()}
                </p>
              </div>
              {entry.meta ? (
                <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
                  {entry.meta}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BarListWidget: React.FC<WidgetProps> = ({ widget, theme, reducedMotion }) => {
  const breakdown = (widget.breakdown || []).length
    ? widget.breakdown || []
    : (widget.series || []).map((entry, index) => ({
        id: entry.id || `series-${index}`,
        label: entry.label,
        value: entry.value
      }));

  if (breakdown.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No ranked values are available for this range yet.'} theme={theme} />;
  }

  const totalValue = breakdown.reduce((sum, entry) => sum + entry.value, 0);
  const topEntry = breakdown.reduce((current, entry) => (entry.value > current.value ? entry : current), breakdown[0]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <StatChip label="Top Item" value={topEntry?.label || '--'} theme={theme} />
        <StatChip label="Total" value={totalValue} theme={theme} />
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdown}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} tickFormatter={formatAxisValue} />
            <Tooltip contentStyle={tooltipStyle(theme)} />
            <Bar
              dataKey="value"
              radius={[10, 10, 0, 0]}
              fill={theme.accent}
              isAnimationActive={!reducedMotion}
              animationDuration={520}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const FunnelWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const stages = widget.stages || [];
  const palette = getPalette(theme);
  const topValue = Math.max(...stages.map((stage) => stage.value), 1);

  if (stages.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No funnel stages are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const width = `${Math.max((stage.value / topValue) * 100, 8)}%`;
        return (
          <div key={stage.id || stage.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold" style={{ color: theme.textStrong }}>
                {stage.label}
              </p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {stage.value.toLocaleString()}
                {stage.percentage !== undefined ? ` (${stage.percentage.toFixed(1)}%)` : ''}
              </p>
            </div>
            <div className="h-11 rounded-[20px] p-1" style={{ background: getSoftTrackSurface(theme) }}>
              <div
                className="flex h-full items-center justify-end rounded-[16px] px-3 text-xs font-black text-white transition-all"
                style={{
                  width,
                  background: `linear-gradient(90deg, ${palette[index % palette.length]}, ${theme.accentAlt})`
                }}
              >
                {stage.percentage !== undefined && stage.percentage > 10 ? `${stage.percentage.toFixed(1)}%` : ''}
              </div>
            </div>
            {stage.description ? (
              <p className="text-xs" style={{ color: theme.textMuted }}>
                {stage.description}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const TableWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const columns = widget.columns || [];
  const rows = widget.rows || [];

  if (columns.length === 0 || rows.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No rows are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: theme.border }}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead style={{ background: getTableHeadSurface(theme) }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 ${tableAlignClass[column.align || 'left']} text-[11px] font-black uppercase tracking-[0.18em]`}
                  style={{ color: theme.textMuted }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id ? String(row.id) : `row-${rowIndex}`} className="border-t" style={{ borderColor: theme.border }}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 ${tableAlignClass[column.align || 'left']}`}
                    style={{ color: theme.textStrong }}
                  >
                    {renderTableCell(row[column.key] as string | number | null | undefined)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeaderboardWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const leaderboard = widget.leaderboard || [];

  if (leaderboard.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No ranked entries are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((entry, index) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3"
          style={{ borderColor: theme.border, background: getSubCardSurface(theme) }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-sm font-black text-white"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})` }}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: theme.textStrong }}>
                {entry.label}
              </p>
              {entry.secondary ? (
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {entry.secondary}
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black" style={{ color: theme.textStrong }}>
              {entry.primary}
            </p>
            {entry.badge ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                {entry.badge}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

const TimelineWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const timeline = widget.timeline || [];

  if (timeline.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No timeline events are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="space-y-4">
      {timeline.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className="mt-1 h-3.5 w-3.5 rounded-full"
              style={{ background: index % 2 === 0 ? theme.accent : theme.accentAlt, boxShadow: `0 0 0 6px rgba(${theme.accentRgb}, 0.08)` }}
            />
            {index !== timeline.length - 1 ? <span className="mt-2 h-full w-px" style={{ background: getTimelineRailColor(theme) }} /> : null}
          </div>
          <div
            className="flex-1 rounded-[22px] border px-4 py-3"
            style={{ borderColor: theme.border, background: getSubCardSurface(theme) }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold" style={{ color: theme.textStrong }}>
                  {entry.label}
                </p>
                {entry.description ? (
                  <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                    {entry.description}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                {entry.status ? (
                  <span
                    className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{
                      background: theme.chip,
                      color: theme.chipText,
                      borderColor: `rgba(${theme.accentRgb}, 0.16)`
                    }}
                  >
                    {entry.status}
                  </span>
                ) : null}
                {entry.timestamp ? (
                  <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
                    {entry.timestamp}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const HeatmapWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const heatmap = widget.heatmap || [];

  if (heatmap.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No activity cells are available for this range yet.'} theme={theme} />;
  }

  const xLabels = Array.from(new Set(heatmap.map((entry) => entry.x)));
  const yLabels = Array.from(new Set(heatmap.map((entry) => entry.y)));
  const maxValue = Math.max(...heatmap.map((entry) => entry.value), 1);

  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="grid min-w-[540px] gap-2" style={{ gridTemplateColumns: `120px repeat(${xLabels.length}, minmax(0, 1fr))` }}>
        <div />
        {xLabels.map((label) => (
          <div key={label} className="px-2 text-center text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
            {label}
          </div>
        ))}
        {yLabels.map((rowLabel) => (
          <React.Fragment key={rowLabel}>
            <div className="flex items-center text-sm font-semibold" style={{ color: theme.textStrong }}>
              {rowLabel}
            </div>
            {xLabels.map((columnLabel) => {
              const cell = heatmap.find((entry) => entry.x === columnLabel && entry.y === rowLabel);
              const value = cell?.value || 0;
              const opacity = Math.max(value / maxValue, 0.1);
              return (
                <div
                  key={`${rowLabel}-${columnLabel}`}
                  className="rounded-[18px] px-3 py-4 text-center text-sm font-black"
                  style={{
                    background: `rgba(${theme.accentRgb}, ${Math.min(opacity * 0.34, 0.34)})`,
                    color: opacity > 0.28 ? '#ffffff' : theme.textStrong
                  }}
                >
                  {value.toLocaleString()}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const TickerWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const ticker = widget.ticker || [];

  if (ticker.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No live feed items are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="space-y-3">
      {ticker.map((entry, index) => (
        <div
          key={`${widget.id}-ticker-${index}`}
          className="flex items-start gap-3 rounded-[22px] border px-4 py-3"
          style={{ borderColor: theme.border, background: getSubCardSurface(theme) }}
        >
          <span
            className="mt-1 h-2.5 w-2.5 rounded-full"
            style={{ background: index % 2 === 0 ? theme.accent : theme.accentAlt }}
          />
          <p className="text-sm leading-6" style={{ color: theme.textStrong }}>
            {entry}
          </p>
        </div>
      ))}
    </div>
  );
};

const StatListWidget: React.FC<WidgetProps> = ({ widget, theme }) => {
  const breakdown = widget.breakdown || [];

  if (breakdown.length === 0) {
    return <EmptyState message={widget.emptyMessage || 'No summary values are available for this range yet.'} theme={theme} />;
  }

  return (
    <div className="grid gap-3">
      {breakdown.map((entry) => (
        <div
          key={entry.id}
          className="rounded-[22px] border px-4 py-3"
          style={{ borderColor: theme.border, background: getSubCardSurface(theme) }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold" style={{ color: theme.textStrong }}>
              {entry.label}
            </p>
            <p className="text-lg font-black" style={{ color: theme.textStrong }}>
              {entry.value.toLocaleString()}
            </p>
          </div>
          {entry.meta ? (
            <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
              {entry.meta}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export const AnalyticsWidgetRenderer: React.FC<WidgetProps> = ({ widget, theme, reducedMotion }) => {
  switch (widget.kind) {
    case 'timeseries':
      return <SeriesWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'donut':
      return <DonutWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'bar-list':
      return <BarListWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'funnel':
      return <FunnelWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'table':
      return <TableWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'leaderboard':
      return <LeaderboardWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'timeline':
      return <TimelineWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'heatmap':
      return <HeatmapWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'ticker':
      return <TickerWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    case 'stat-list':
      return <StatListWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
    default:
      return <StatListWidget widget={widget} theme={theme} reducedMotion={reducedMotion} />;
  }
};

type AnalyticsShellProps = {
  payload: PersonaAnalyticsPagePayload;
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

const AnalyticsShell: React.FC<AnalyticsShellProps> = ({
  payload,
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

  const widgetGrid = useMemo(
    () => (payload.widgets || []).map((widget) => ({ ...widget, spanClass: getWidgetSpanClass(widget.kind) })),
    [payload.widgets]
  );
  const populatedWidgetCount = useMemo(() => widgetGrid.filter(widgetHasData).length, [widgetGrid]);
  const eventWidgetCount = useMemo(
    () => widgetGrid.filter((widget) => widget.aggregateMode === 'event').length,
    [widgetGrid]
  );
  const rollupWidgetCount = Math.max(widgetGrid.length - eventWidgetCount, 0);
  const coveragePercent = widgetGrid.length ? Math.round((populatedWidgetCount / widgetGrid.length) * 100) : 0;
  const exportFormats = payload.exportFormats?.length ? payload.exportFormats : ['json', 'csv'];
  const lastSyncLabel = formatRelativeSyncTime(payload.generatedAt);
  const freshnessWindow = formatFreshnessWindow(payload.staleAfterMs);
  const summaryCards = useMemo(
    () => [
      {
        id: 'cards-ready',
        label: 'Cards Ready',
        value: widgetGrid.length ? `${populatedWidgetCount}/${widgetGrid.length}` : '0',
        detail: widgetGrid.length
          ? `${coveragePercent}% of this page already has live analytics records behind it`
          : 'Waiting for the first card payload from the analytics service'
      },
      {
        id: 'verified-feeds',
        label: 'Verified Feeds',
        value: eventWidgetCount.toLocaleString(),
        detail: eventWidgetCount
          ? `${eventWidgetCount} direct event feeds are live, with ${rollupWidgetCount} supporting aggregate cards`
          : `${rollupWidgetCount} aggregate cards are live while direct event feeds warm up`
      },
      {
        id: 'needs-review',
        label: 'Needs Review',
        value: payload.alerts.length.toLocaleString(),
        detail: payload.alerts.length
          ? 'Open the highlighted cards or alerts to review what needs action'
          : 'No blocking alerts are active on this page right now'
      }
    ],
    [coveragePercent, eventWidgetCount, payload.alerts.length, populatedWidgetCount, rollupWidgetCount, widgetGrid.length]
  );
  const spotlightCards = useMemo(() => widgetGrid.slice(0, 5), [widgetGrid]);

  const shellStyle = {
    '--dash-accent-rgb': theme.accentRgb,
    '--dash-accent-2-rgb': theme.accentAltRgb
  } as React.CSSProperties;

  return (
    <>
      <div className="dashboard-shell min-h-screen" style={shellStyle}>
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <motion.section
            initial={lowEndMode ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: lowEndMode ? 0.18 : 0.4, ease: 'easeOut' }}
            className="glass-panel sticky top-3 z-30 overflow-hidden rounded-[32px] px-5 py-5 sm:px-6"
            style={{
              boxShadow: `0 24px 70px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(${theme.accentRgb}, 0.06) inset`
            }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: theme.heroGlow }} />

            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <WidgetTag label={`${payload.personaLabel} Analytics`} theme={theme} />
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${connectionTone[connectionState]}`}>
                      <motion.span
                        className="h-2 w-2 rounded-full bg-current"
                        animate={
                          !lowEndMode && connectionState === 'live'
                            ? { scale: [1, 1.45, 1], opacity: [0.55, 1, 0.55] }
                            : { scale: 1, opacity: 1 }
                        }
                        transition={
                          !lowEndMode
                            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.1 }
                        }
                      />
                      {connectionLabel[connectionState]}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                      Live refresh every 5 seconds while visible - {freshnessWindow} data window - updated {lastSyncLabel}
                    </span>
                    {isRefreshing ? (
                      <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                        Refreshing cards...
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl xl:text-[3rem]" style={{ color: theme.textStrong }}>
                    {payload.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 sm:text-base" style={{ color: theme.textMuted }}>
                    {payload.subtitle}
                  </p>
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
                    disabled={!exportFormats.includes('json')}
                    className="glass-button rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
                    style={{ color: theme.textStrong, opacity: exportFormats.includes('json') ? 1 : 0.45 }}
                  >
                    Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={onExportCsv}
                    disabled={!exportFormats.includes('csv')}
                    className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
                      opacity: exportFormats.includes('csv') ? 1 : 0.45
                    }}
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
                            background: getInactiveTabSurface(theme)
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
                      background: getStatusCardSurface(theme)
                    }}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                      {card.label}
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-tight" style={{ color: theme.textStrong }}>
                      {card.value}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                      {card.detail}
                    </p>
                  </div>
                ))}
              </div>

              {spotlightCards.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {spotlightCards.map((widget) => (
                    <Link
                      key={widget.id}
                      to={buildWidgetHref(widget.id)}
                      className="dashboard-glass-card min-w-[240px] rounded-[24px] border px-4 py-4 transition-transform hover:-translate-y-0.5"
                      style={{
                        borderColor: `rgba(${theme.accentRgb}, 0.1)`,
                        background: getStatusCardSurface(theme)
                      }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                        {widgetHasData(widget) ? 'Ready To Explore' : 'Awaiting Records'}
                      </p>
                      <p className="mt-3 text-sm font-bold leading-6" style={{ color: theme.textStrong }}>
                        {widget.title}
                      </p>
                      <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
                        {widget.footer || 'Open the full detail page for the chart, evidence table, and related signals.'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.section>

          <motion.section
            initial={lowEndMode ? false : 'hidden'}
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: lowEndMode ? 0 : 0.05, delayChildren: lowEndMode ? 0 : 0.05 } }
            }}
            className={`relative grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-4 ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}
          >
            {payload.heroMetrics.length > 0 ? (
              payload.heroMetrics.map((metric) => (
                <motion.article
                  key={metric.id}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  whileHover={lowEndMode ? undefined : { y: -4 }}
                  className="glass-panel glass-panel-hover rounded-[30px] px-5 py-5"
                  style={{
                    boxShadow: `0 20px 50px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(${theme.accentRgb}, 0.04) inset`
                  }}
                >
                  <div className="pointer-events-none absolute inset-0" style={{ background: theme.heroGlow, opacity: 0.8 }} />
                  <div className="relative">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                      {metric.label}
                    </p>
                    <p className="mt-4 text-3xl font-bold tracking-tight" style={{ color: theme.textStrong }}>
                      {formatMetricValue(metric.value)}
                    </p>
                    {metric.changeText ? (
                      <p className={`mt-3 text-sm font-semibold ${metricToneClass(metric.tone)}`}>{metric.changeText}</p>
                    ) : (
                      <p className="mt-3 text-sm font-semibold" style={{ color: theme.textMuted }}>
                        Live metric from this workspace
                      </p>
                    )}
                    {metric.href ? (
                      <Link
                        to={metric.href}
                        className="mt-4 inline-flex text-[11px] font-black uppercase tracking-[0.18em]"
                        style={{ color: theme.accent }}
                      >
                        Open metric
                      </Link>
                    ) : null}
                  </div>
                </motion.article>
              ))
            ) : (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className="glass-panel rounded-[30px] px-6 py-8 md:col-span-2 xl:col-span-4"
              >
                <p className="text-base font-semibold" style={{ color: theme.textStrong }}>
                  Real hero metrics have not been returned for this page yet.
                </p>
                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                  The page stays connected and will render these cards as soon as the backend returns metric rows.
                </p>
              </motion.div>
            )}
          </motion.section>

          {payload.alerts.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
              className={`relative grid gap-3 transition-opacity xl:grid-cols-3 ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}
            >
              {payload.alerts.map((alert) => (
                <article key={alert.id} className={`glass-panel rounded-[28px] border px-5 py-5 ${toneClasses[alert.tone] || toneClasses.default}`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70">{alert.tone}</p>
                  <h2 className="mt-2 text-lg font-bold">{alert.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-90">{alert.description}</p>
                  {alert.actionLabel && alert.actionHref ? (
                    <Link to={alert.actionHref} className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.18em] underline-offset-4 hover:underline">
                      {alert.actionLabel}
                    </Link>
                  ) : null}
                </article>
              ))}
            </motion.section>
          ) : null}

          <section className={`relative grid gap-4 transition-opacity xl:grid-cols-2 ${isRefreshing ? 'pointer-events-none opacity-75' : 'opacity-100'}`}>
            {widgetGrid.length > 0 ? (
              widgetGrid.map((widget, index) => (
                <motion.article
                  key={widget.id}
                  initial={lowEndMode ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: lowEndMode ? 0.18 : 0.3, ease: 'easeOut', delay: lowEndMode ? 0 : 0.1 + index * 0.03 }}
                  whileHover={lowEndMode ? undefined : { y: -4 }}
                  className={`glass-panel glass-panel-hover relative overflow-hidden rounded-[32px] px-5 py-5 ${widget.spanClass}`}
                  style={{
                    boxShadow: `0 20px 55px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(${theme.accentRgb}, 0.03) inset`
                  }}
                >
                  <div className="pointer-events-none absolute inset-0" style={{ background: theme.heroGlow, opacity: 0.55 }} />

                  <div className="relative flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <WidgetHeader
                        title={widget.title}
                        description={widget.description}
                        theme={theme}
                        aggregateMode={widget.aggregateMode}
                      />
                      <Link
                        to={buildWidgetHref(widget.id)}
                        className="glass-button shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{ color: theme.textStrong }}
                      >
                        Open Detail
                      </Link>
                    </div>

                    <WidgetCanvas theme={theme}>
                      <AnalyticsWidgetRenderer widget={widget} theme={theme} reducedMotion={lowEndMode} />
                    </WidgetCanvas>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 pt-3">
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {widget.footer || 'Open the detail page for the full breakdown, evidence table, and related signals.'}
                      </p>
                      <div className="flex items-center gap-2">
                        {widget.accent ? <WidgetTag label={widget.accent} theme={theme} /> : null}
                        <Link
                          to={buildWidgetHref(widget.id)}
                          className="text-[10px] font-black uppercase tracking-[0.18em]"
                          style={{ color: theme.accent }}
                        >
                          Full Page
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[32px] px-6 py-8 xl:col-span-2"
              >
                <p className="text-base font-semibold" style={{ color: theme.textStrong }}>
                  This page is connected but the backend has not returned widgets for this scope yet.
                </p>
                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                  The layout stays clean until real records arrive. As soon as charts or tables are returned by the analytics service, the cards render here automatically.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </div>

    </>
  );
};

export default AnalyticsShell;
