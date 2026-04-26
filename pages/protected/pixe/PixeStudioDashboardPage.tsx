import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import { pixeService, type PixeDashboardResponse } from '../../../services/pixeService';

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const PixeStudioDashboardPage: React.FC = () => {
  const [state, setState] = useState<PixeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getStudioDashboard();
        if (!cancelled) setState(payload);
      } catch (error) {
        console.error('Unable to load Pixe dashboard:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {
      published: 0,
      processing: 0,
      draft: 0,
      failed: 0
    };

    state?.recent_videos.forEach((video) => {
      if (video.status === 'published') counts.published += 1;
      if (video.status === 'processing' || video.status === 'uploading' || video.status === 'ready') counts.processing += 1;
      if (video.status === 'draft') counts.draft += 1;
      if (video.status === 'failed') counts.failed += 1;
    });

    return counts;
  }, [state]);

  if (loading) {
    return <PixeChartPageSkeleton />;
  }

  if (!state) {
    return (
      <PixeEmptyState
        title="Studio data is unavailable"
        message="The creator dashboard could not be loaded right now. Open channel settings or try again shortly."
        animation="noFileFound"
        primaryAction={{ label: 'Channel settings', to: '/pixe-studio/channel' }}
        secondaryAction={{ label: 'Upload clip', to: '/pixe-studio/upload' }}
      />
    );
  }

  const publishRatio = state.summary.video_count > 0
    ? Math.round((state.summary.published_video_count / state.summary.video_count) * 100)
    : 0;
  const watchHours = (state.summary.total_watch_time_ms / 3_600_000).toFixed(1);

  return (
    <div className="space-y-6">
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Overview</p>
            <div className="mt-4 flex items-start gap-4">
              <img
                src={state.channel.avatar_url || '/icons/urbanprime.svg'}
                alt={state.channel.display_name || 'Your channel'}
                className="h-16 w-16 rounded-full border border-white/10 object-cover"
              />
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold">{state.channel.display_name || 'Your channel'}</h2>
                <p className="mt-1 text-sm text-white/55">@{state.channel.handle}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                  Keep an eye on output, audience response, and what needs attention next from one place.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/pixe-studio/upload" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                New upload
              </Link>
              <Link to={`/pixe/channel/${state.channel.handle}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
                Public view
              </Link>
              <Link to="/pixe-studio/content" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
                Content manager
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ['Published ratio', `${publishRatio}%`, 'Published videos vs total library'],
              ['Watch time', `${watchHours}h`, 'Rollup total from published content'],
              ['Subscribers', formatCount(state.summary.subscriber_count), 'Current public subscriber count']
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-2 text-xs leading-5 text-white/48">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Subscribers', formatCount(state.summary.subscriber_count)],
          ['Total videos', formatCount(state.summary.video_count)],
          ['Published', formatCount(state.summary.published_video_count)],
          ['Impressions', formatCount(state.summary.total_impressions)],
          ['Qualified views', formatCount(state.summary.total_qualified_views)]
        ].map(([label, value]) => (
          <div key={label} className="pixe-noir-panel rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Recent Clips</p>
              <h3 className="mt-2 text-lg font-semibold">Latest output</h3>
            </div>
            <Link to="/pixe-studio/content" className="text-sm text-white/55">
              See all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.recent_videos.map((video) => (
              <div key={video.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-black/25">
                <div className="aspect-[9/16] bg-black">
                  {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="space-y-2 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-semibold">{video.title || 'Untitled clip'}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/65">
                      {video.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/55">
                    <span>{formatCount(video.metrics.qualified_views)} views</span>
                    <span>{video.metrics.completion_rate}% completion</span>
                    <span>{formatCount(video.metrics.likes)} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {state.recent_videos.length === 0 ? (
            <PixeEmptyState
              title="No clips yet"
              message="Start with a draft, upload your first short video, and the latest content block will populate automatically."
              animation="nothing"
              primaryAction={{ label: 'New upload', to: '/pixe-studio/upload' }}
              secondaryAction={{ label: 'Open content', to: '/pixe-studio/content' }}
              className="pt-6"
              contained={false}
            />
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="pixe-noir-panel rounded-[30px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Studio Queue</p>
            <div className="mt-4 space-y-3">
              {[
                ['Published', statusCounts.published, 'Clips already live in the feed'],
                ['In review', statusCounts.processing, 'Uploading, preparing, or ready to publish'],
                ['Drafts', statusCounts.draft, 'Saved but not sent live'],
                ['Needs attention', statusCounts.failed, 'Review and retry these clips']
              ].map(([label, value, hint]) => (
                <div key={label} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{label}</p>
                    <span className="text-sm font-semibold text-white/82">{value}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/50">{hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pixe-noir-panel rounded-[30px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Next Moves</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/58">
              <p>Publish consistently so the recent clips panel keeps moving.</p>
              <p>Use tagged products on stronger clips to turn attention into action.</p>
              <p>Check comments and completion trends after each upload cycle.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PixeStudioDashboardPage;
