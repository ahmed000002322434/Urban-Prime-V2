import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeStudioGlyph from '../../../components/pixe/PixeStudioGlyph';
import { pixeService, type PixeComment, type PixeVideo } from '../../../services/pixeService';

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const formatDuration = (valueMs: number) => {
  if (!valueMs) return '0s';
  if (valueMs >= 3_600_000) return `${(valueMs / 3_600_000).toFixed(1)}h`;
  if (valueMs >= 60_000) return `${(valueMs / 60_000).toFixed(1)}m`;
  return `${Math.round(valueMs / 1000)}s`;
};

const StatCard: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
    <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    {hint ? <p className="mt-2 text-xs leading-5 text-white/48">{hint}</p> : null}
  </div>
);

const PixeStudioVideoAnalyticsPage: React.FC = () => {
  const { videoId = '' } = useParams();
  const [video, setVideo] = useState<PixeVideo | null>(null);
  const [comments, setComments] = useState<PixeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const load = async () => {
      try {
        if (!cancelled && !video) setLoading(true);
        const payload = await pixeService.getVideo(videoId);
        if (cancelled) return;
        setVideo(payload);
        setComments(payload.comments || []);
        setLastUpdatedAt(new Date().toISOString());
      } catch (loadError: any) {
        console.error('Unable to load Pixe video analytics:', loadError);
        if (!cancelled) setError(loadError?.message || 'Unable to load analytics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    intervalId = window.setInterval(() => {
      void load();
    }, 20_000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [video, videoId]);

  const metricBars = useMemo(() => {
    if (!video) return [];
    const rows = [
      { label: 'Views', value: video.metrics.qualified_views, accent: 'bg-sky-400' },
      { label: 'Likes', value: video.metrics.likes, accent: 'bg-fuchsia-400' },
      { label: 'Comments', value: video.metrics.comments, accent: 'bg-emerald-400' },
      { label: 'Saves', value: video.metrics.saves, accent: 'bg-amber-300' },
      { label: 'Shares', value: video.metrics.shares, accent: 'bg-violet-300' }
    ];
    const maxValue = Math.max(...rows.map((row) => row.value), 1);
    return rows.map((row) => ({
      ...row,
      width: `${Math.max((row.value / maxValue) * 100, row.value > 0 ? 8 : 0)}%`
    }));
  }, [video]);

  if (loading) {
    return <PixeChartPageSkeleton />;
  }

  if (!video) {
    return (
      <PixeEmptyState
        title="Analytics unavailable"
        message={error || 'This video could not be loaded.'}
        animation="noFileFound"
        primaryAction={{ label: 'Back to content', to: '/pixe-studio/content' }}
        secondaryAction={{ label: 'Open dashboard', to: '/pixe-studio/dashboard' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Video Analytics</p>
            <h2 className="mt-2 text-3xl font-semibold">{video.title || 'Untitled clip'}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/72">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 uppercase">{video.status}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{video.metrics.completion_rate}% completion</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{formatDuration(video.metrics.watch_time_ms)} watch time</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{lastUpdatedAt ? `Live ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Waiting'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/pixe-studio/content/${video.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82">
              Edit details
            </Link>
            <Link to={`/pixe-studio/comments?videoId=${video.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82">
              Comments
            </Link>
            <Link to={`/pixe/watch/${video.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Watch
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Views" value={formatCount(video.metrics.qualified_views)} />
        <StatCard label="Likes" value={formatCount(video.metrics.likes)} />
        <StatCard label="Comments" value={formatCount(video.metrics.comments)} />
        <StatCard label="Watch Time" value={formatDuration(video.metrics.watch_time_ms)} />
        <StatCard label="Completion" value={`${video.metrics.completion_rate}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_380px]">
        <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Live Snapshot</p>
            <h3 className="mt-2 text-xl font-semibold">Engagement bars</h3>
          </div>

          <div className="space-y-4">
            {metricBars.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-white">{row.label}</span>
                  <span className="text-white/62">{formatCount(row.value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${row.accent}`} style={{ width: row.width }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Average View" value={formatDuration(video.metrics.average_view_duration_ms)} />
            <StatCard label="Saves" value={formatCount(video.metrics.saves)} />
            <StatCard label="Shares" value={formatCount(video.metrics.shares)} />
            <StatCard label="Impressions" value={formatCount(video.metrics.impressions)} />
            <StatCard label="Product Clicks" value={formatCount(video.metrics.product_clicks)} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="pixe-noir-panel-strong overflow-hidden rounded-[32px] p-4">
            <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-black shadow-2xl">
              <div className="aspect-[9/16] bg-black">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title || 'Pixe preview'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/35">Preview</div>
                )}
              </div>
            </div>
          </div>

          <div className="pixe-noir-panel rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Recent Comments</p>
                <h3 className="mt-2 text-lg font-semibold">Latest responses</h3>
              </div>
              <Link to={`/pixe-studio/comments?videoId=${video.id}`} className="text-xs font-semibold text-white/55">
                Open all
              </Link>
            </div>

            <div className="space-y-3">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.id} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="mb-2 flex items-center gap-3">
                    <img src={comment.user?.avatar_url || '/icons/urbanprime.svg'} alt={comment.user?.name || 'Viewer'} className="h-9 w-9 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{comment.user?.name || 'Viewer'}</p>
                      <p className="text-xs text-white/45">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-white/72">{comment.body}</p>
                </div>
              ))}
              {comments.length === 0 ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/55">
                  No comments yet for this video.
                </div>
              ) : null}
            </div>
          </div>

          <div className="pixe-noir-panel rounded-[30px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Actions</p>
            <div className="mt-4 space-y-2">
              {[
                { to: `/pixe-studio/content/${video.id}`, label: 'Edit details', icon: 'edit' as const },
                { to: `/pixe/watch/${video.id}`, label: 'Watch video', icon: 'watch' as const },
                { to: `/pixe-studio/comments?videoId=${video.id}`, label: 'Comment view', icon: 'comments' as const }
              ].map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <PixeStudioGlyph name={item.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PixeStudioVideoAnalyticsPage;
