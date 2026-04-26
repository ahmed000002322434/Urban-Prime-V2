import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import { pixeService, type PixeAudienceAnalyticsResponse, type PixeOverviewAnalyticsResponse, type PixeVideo } from '../../../services/pixeService';

const StatCard: React.FC<{ label: string; value: string; hint?: string; accentClassName?: string }> = ({ label, value, hint, accentClassName = 'from-white/10 to-transparent' }) => (
  <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${accentClassName} p-5`}>
    <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
    <p className="mt-3 text-2xl font-semibold">{value}</p>
    {hint ? <p className="mt-2 text-xs text-white/45">{hint}</p> : null}
  </div>
);

const PixeStudioAnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<PixeOverviewAnalyticsResponse | null>(null);
  const [content, setContent] = useState<PixeVideo[]>([]);
  const [audience, setAudience] = useState<PixeAudienceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const [overviewPayload, contentPayload, audiencePayload] = await Promise.all([
          pixeService.getOverviewAnalytics(),
          pixeService.getContentAnalytics(),
          pixeService.getAudienceAnalytics()
        ]);
        if (cancelled) return;
        setOverview(overviewPayload);
        setContent(contentPayload);
        setAudience(audiencePayload);
      } catch (error) {
        console.error('Unable to load Pixe analytics:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const topVideos = useMemo(
    () => [...content].sort((left, right) => right.metrics.qualified_views - left.metrics.qualified_views).slice(0, 6),
    [content]
  );

  const engagementMix = useMemo(() => (
    overview
      ? [
        { label: 'Likes', value: overview.summary.likes, fill: '#f472b6' },
        { label: 'Comments', value: overview.summary.comments, fill: '#34d399' },
        { label: 'Saves', value: overview.summary.saves, fill: '#f59e0b' },
        { label: 'Shares', value: overview.summary.shares, fill: '#a78bfa' }
      ]
      : []
  ), [overview]);

  const watchDepthData = useMemo(
    () => overview?.daily_stats.map((row) => ({
      bucket_date: row.bucket_date,
      watch_hours: Number((Number(row.watch_time_ms || 0) / 3_600_000).toFixed(2)),
      completions: Number(row.completions || 0)
    })) || [],
    [overview]
  );

  const trendData = useMemo(
    () => overview?.daily_stats.map((row) => ({
      bucket_date: row.bucket_date,
      impressions: Number(row.impressions || 0),
      qualified_views: Number(row.qualified_views || 0)
    })) || [],
    [overview]
  );

  const engagementTotal = useMemo(
    () => engagementMix.reduce((sum, entry) => sum + entry.value, 0),
    [engagementMix]
  );

  if (loading) {
    return <PixeChartPageSkeleton />;
  }

  if (!overview || !audience) {
    return (
      <PixeEmptyState
        title="Analytics are unavailable"
        message="Overview and audience analytics could not be loaded. The feed and studio can still run, but this panel needs backend analytics data."
        animation="noFileFound"
        primaryAction={{ label: 'Back to dashboard', to: '/pixe-studio/dashboard' }}
        secondaryAction={{ label: 'Open content', to: '/pixe-studio/content' }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Analytics</p>
        <h2 className="mt-2 text-3xl font-semibold">Performance</h2>
        </div>
        <Link to="/pixe-studio/content" className="pixe-studio-button-secondary rounded-full px-4 py-2 text-sm font-semibold">
          Open content library
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Impressions" value={String(overview.summary.impressions)} accentClassName="from-sky-500/16 to-cyan-500/8" />
        <StatCard label="Qualified Views" value={String(overview.summary.qualified_views)} accentClassName="from-violet-500/16 to-fuchsia-500/8" />
        <StatCard label="Watch Time" value={`${(overview.summary.watch_time_ms / 3600000).toFixed(1)}h`} accentClassName="from-emerald-500/16 to-teal-500/8" />
        <StatCard label="Completion Rate" value={`${overview.summary.completion_rate}%`} accentClassName="from-amber-500/16 to-orange-500/8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Daily Trend</h3>
            <p className="text-sm text-white/55">Impressions versus qualified views.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="bucket_date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16 }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                <Bar dataKey="impressions" fill="#60a5fa" radius={[10, 10, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="qualified_views" stroke="#34d399" strokeWidth={2.6} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Playback Quality</h3>
            <p className="text-sm text-white/55">Mux Data aggregate metrics.</p>
          </div>
          <div className="space-y-4">
            <StatCard label="Viewer Experience" value={overview.mux_qoe?.viewer_experience_score != null ? `${Number(overview.mux_qoe.viewer_experience_score).toFixed(2)}` : '--'} accentClassName="from-sky-500/14 to-transparent" />
            <StatCard label="Startup Time" value={overview.mux_qoe?.video_startup_time != null ? `${Math.round(Number(overview.mux_qoe.video_startup_time))} ms` : '--'} accentClassName="from-violet-500/14 to-transparent" />
            <StatCard label="Rebuffer %" value={overview.mux_qoe?.rebuffer_percentage != null ? `${Number(overview.mux_qoe.rebuffer_percentage).toFixed(2)}%` : '--'} accentClassName="from-amber-500/14 to-transparent" />
            <StatCard label="Failure %" value={overview.mux_qoe?.playback_failure_percentage != null ? `${Number(overview.mux_qoe.playback_failure_percentage).toFixed(2)}%` : '--'} accentClassName="from-rose-500/14 to-transparent" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Content</h3>
            <span className="text-xs text-white/45">Views, watch time, completion</span>
          </div>
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.16em] text-white/45">
                <tr>
                  <th className="px-4 py-4">Video</th>
                  <th className="px-4 py-4">Views</th>
                  <th className="px-4 py-4">Watch Time</th>
                  <th className="px-4 py-4">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/15">
                {topVideos.map((video) => (
                  <tr key={video.id}>
                    <td className="px-4 py-4 font-semibold">
                      <Link to={`/pixe-studio/analytics/${video.id}`} className="text-white hover:underline">
                        {video.title || 'Untitled clip'}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{video.metrics.qualified_views}</td>
                    <td className="px-4 py-4">{(video.metrics.watch_time_ms / 60000).toFixed(1)} min</td>
                    <td className="px-4 py-4">{video.metrics.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Audience Snapshot</h3>
            <p className="text-sm text-white/55">Subscriber movement and high-retention clips.</p>
          </div>
          <div className="space-y-4">
            <StatCard label="Subscribers" value={String(audience.subscriber_count)} accentClassName="from-indigo-500/16 to-sky-500/8" />
            <StatCard label="New 30d" value={String(audience.new_subscribers_last_30_days)} accentClassName="from-fuchsia-500/16 to-pink-500/8" />
            <StatCard label="Avg Completion" value={`${audience.average_completion_rate}%`} accentClassName="from-emerald-500/16 to-lime-500/8" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Engagement Mix</h3>
            <p className="text-sm text-white/55">How viewers are interacting across the channel.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="relative h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementMix}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={4}
                    stroke="rgba(10,10,12,0.55)"
                    strokeWidth={2}
                  >
                    {engagementMix.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Total</p>
                <p className="mt-2 text-3xl font-semibold text-white">{engagementTotal}</p>
              </div>
            </div>
            <div className="space-y-3">
              {engagementMix.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-sm font-semibold text-white">{entry.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white/76">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Watch Depth</h3>
            <p className="text-sm text-white/55">Daily watch hours against completions.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={watchDepthData}>
                <defs>
                  <linearGradient id="watchDepthBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.86} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="bucket_date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16 }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                <Bar dataKey="watch_hours" fill="url(#watchDepthBars)" radius={[10, 10, 0, 0]} barSize={18} />
                <Line yAxisId="right" type="monotone" dataKey="completions" stroke="#f59e0b" strokeWidth={2.4} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixeStudioAnalyticsPage;
