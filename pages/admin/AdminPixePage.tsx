import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import adminPixeService, { type AdminPixeOverview } from '../../services/adminPixeService';
import type { PixeCommentReportQueueItem, PixePayoutRequest, PixeVideo, PixeVideoReviewRecord } from '../../services/pixeService';

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const formatWatchTime = (valueMs: number) => {
  const totalMinutes = Math.max(0, Math.round(valueMs / 60000));
  if (totalMinutes >= 60) {
    return `${(totalMinutes / 60).toFixed(1)}h`;
  }
  return `${totalMinutes}m`;
};

const statusTone = (value: boolean) => (
  value
    ? 'border-emerald-200/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
    : 'border-rose-200/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
);

const videoFilterMatches = (video: PixeVideo, filter: 'all' | 'active' | 'failed' | 'published') => {
  if (filter === 'active') return ['uploading', 'processing', 'ready'].includes(video.status);
  if (filter === 'failed') return video.status === 'failed';
  if (filter === 'published') return video.status === 'published';
  return true;
};

const AdminPixePage: React.FC = () => {
  const [overview, setOverview] = useState<AdminPixeOverview | null>(null);
  const [commentReports, setCommentReports] = useState<PixeCommentReportQueueItem[]>([]);
  const [videoReviews, setVideoReviews] = useState<PixeVideoReviewRecord[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<Array<PixePayoutRequest & { channel?: { id: string; display_name: string; handle: string; avatar_url: string | null } | null; reviewer?: { id: string; name: string } | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'failed' | 'published'>('all');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [queueActionKey, setQueueActionKey] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const [payload, reportPayload, reviewPayload, payoutPayload] = await Promise.all([
        adminPixeService.getOverview(),
        adminPixeService.getCommentReports('pending'),
        adminPixeService.getVideoReviews(),
        adminPixeService.getPayoutRequests()
      ]);
      setOverview(payload);
      setCommentReports(reportPayload);
      setVideoReviews(reviewPayload);
      setPayoutRequests(payoutPayload);
    } catch (loadError: any) {
      console.error('Unable to load admin Pixe overview:', loadError);
      setError(loadError?.message || 'Unable to load Pixe operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const filteredVideos = useMemo(
    () => (overview?.recent_videos || []).filter((video) => videoFilterMatches(video, filter)),
    [filter, overview?.recent_videos]
  );

  const syncVideo = async (videoId: string) => {
    try {
      setSyncingId(videoId);
      const updated = await adminPixeService.syncVideo(videoId);
      setOverview((current) => {
        if (!current) return current;
        return {
          ...current,
          recent_videos: current.recent_videos.map((video) => (video.id === videoId ? updated : video))
        };
      });
    } catch (syncError) {
      console.error('Unable to sync Pixe video:', syncError);
    } finally {
      setSyncingId(null);
    }
  };

  const reviewCommentReport = async (commentId: string, action: string) => {
    try {
      setQueueActionKey(`comment:${commentId}:${action}`);
      await adminPixeService.reviewCommentReport(commentId, { action });
      await loadOverview();
    } catch (queueError) {
      console.error('Unable to review comment report:', queueError);
    } finally {
      setQueueActionKey(null);
    }
  };

  const reviewVideo = async (reviewId: string, status: string) => {
    try {
      setQueueActionKey(`review:${reviewId}:${status}`);
      await adminPixeService.reviewVideoReview(reviewId, { status });
      await loadOverview();
    } catch (queueError) {
      console.error('Unable to review video queue item:', queueError);
    } finally {
      setQueueActionKey(null);
    }
  };

  const reviewPayout = async (requestId: string, status: string) => {
    try {
      setQueueActionKey(`payout:${requestId}:${status}`);
      await adminPixeService.reviewPayoutRequest(requestId, { status });
      await loadOverview();
    } catch (queueError) {
      console.error('Unable to review payout request:', queueError);
    } finally {
      setQueueActionKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-gray-200 bg-[linear-gradient(135deg,_#ffffff,_#f7f7f8)] p-6 shadow-sm dark:border-gray-800 dark:bg-[linear-gradient(135deg,_rgba(15,15,15,0.96),_rgba(8,8,8,0.98))]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Admin Pixe</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 dark:text-white">Video pipeline, creators, and feed health</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              Monitor upload status, recent clips, channel growth, and Mux readiness from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400 dark:border-gray-700 dark:bg-white/5 dark:text-white"
            >
              Refresh
            </button>
            <Link
              to="/pixe-studio/dashboard"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              Open Studio
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading && !overview ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : null}

      {overview ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Channels', formatCompactNumber(overview.counts.channels)],
              ['Videos', formatCompactNumber(overview.counts.videos)],
              ['Active Pipeline', formatCompactNumber(overview.counts.active_pipeline)],
              ['Failed', formatCompactNumber(overview.counts.failed_videos)],
              ['Views Today', formatCompactNumber(overview.counts.qualified_views_today)],
              ['Impressions Today', formatCompactNumber(overview.counts.impressions_today)],
              ['Watch Time Today', formatWatchTime(overview.counts.watch_time_today_ms)],
              ['Published', formatCompactNumber(overview.counts.published_videos)],
              ['Comment Reports', formatCompactNumber(overview.counts.pending_comment_reports)],
              ['Review Queue', formatCompactNumber(overview.counts.pending_reviews)],
              ['Payout Requests', formatCompactNumber(overview.counts.pending_payout_requests)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500">{label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-gray-950 dark:text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Recent videos</p>
                  <h2 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Uploads and feed-ready clips</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'failed', 'published'] as const).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setFilter(entry)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        filter === entry
                          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                          : 'border border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-white/80'
                      }`}
                    >
                      {entry === 'all' ? 'All' : entry}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredVideos.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No videos match this filter.
                  </div>
                ) : filteredVideos.map((video) => (
                  <div key={video.id} className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-[18px] bg-black">
                          {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-bold text-gray-950 dark:text-white">{video.title || 'Untitled clip'}</p>
                            <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-white/70">
                              {video.status}
                            </span>
                            <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-white/70">
                              {video.mux_upload_status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{video.channel?.display_name || 'Creator'} • @{video.channel?.handle || 'pixe'}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-gray-500 dark:text-gray-500">
                            <span>{formatCompactNumber(video.metrics.qualified_views)} views</span>
                            <span>{formatCompactNumber(video.metrics.likes)} likes</span>
                            <span>{formatWatchTime(video.metrics.watch_time_ms)} watch</span>
                            <span>{new Date(video.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void syncVideo(video.id)}
                          disabled={syncingId === video.id}
                          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400 disabled:opacity-60 dark:border-gray-700 dark:bg-white/5 dark:text-white"
                        >
                          {syncingId === video.id ? 'Syncing...' : 'Sync'}
                        </button>
                        <Link
                          to={`/pixe/watch/${video.id}`}
                          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400 dark:border-gray-700 dark:bg-white/5 dark:text-white"
                        >
                          Watch
                        </Link>
                        {video.channel ? (
                          <Link
                            to={`/pixe/channel/${video.channel.handle}`}
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                          >
                            Channel
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Mux configuration</p>
                <div className="mt-4 space-y-3">
                  {[
                    ['Video API', overview.config.mux_video_configured],
                    ['Data API', overview.config.mux_data_configured],
                    ['Webhook Secret', overview.config.mux_webhook_secret_configured],
                    ['Local Upload Fallback', overview.config.local_upload_fallback_enabled]
                  ].map(([label, value]) => (
                    <div key={label} className={`flex items-center justify-between rounded-[20px] border px-4 py-3 text-sm font-semibold ${statusTone(Boolean(value))}`}>
                      <span>{label}</span>
                      <span>{value ? 'Ready' : 'Missing'}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Top creators</p>
                <div className="mt-4 space-y-3">
                  {overview.top_channels.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No creator data yet.</p>
                  ) : overview.top_channels.map((channel) => (
                    <Link
                      key={channel.id}
                      to={`/pixe/channel/${channel.handle}`}
                      className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/70 px-4 py-3 transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03]"
                    >
                      <img src={channel.avatar_url || '/icons/urbanprime.svg'} alt={channel.display_name} className="h-10 w-10 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{channel.display_name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">@{channel.handle} • {formatCompactNumber(channel.subscriber_count)} subs</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Comment reports</p>
                  <h2 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Moderation queue</h2>
                </div>
                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 dark:border-gray-700 dark:text-white/70">{commentReports.length}</span>
              </div>
              <div className="space-y-3">
                {commentReports.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No pending comment reports.</p>
                ) : commentReports.slice(0, 8).map((entry) => (
                  <div key={entry.comment_id} className="rounded-[22px] border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{entry.video?.title || 'Comment report'}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{entry.comment?.body || 'Comment unavailable.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-500 dark:text-white/55">
                          <span>{entry.report_count} reports</span>
                          {entry.reasons.map((reason) => (
                            <span key={reason} className="rounded-full border border-gray-300 px-2 py-0.5 dark:border-gray-700">{reason}</span>
                          ))}
                        </div>
                      </div>
                      {entry.video?.id ? (
                        <Link to={`/pixe/watch/${entry.video.id}`} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold dark:border-gray-700 dark:text-white/80">
                          Watch
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ['dismiss', 'Dismiss'],
                        ['hide', 'Hide'],
                        ['delete', 'Delete']
                      ].map(([action, label]) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => void reviewCommentReport(entry.comment_id, action)}
                          disabled={queueActionKey === `comment:${entry.comment_id}:${action}`}
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-white/5 dark:text-white disabled:opacity-60"
                        >
                          {queueActionKey === `comment:${entry.comment_id}:${action}` ? 'Working…' : label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Video reviews</p>
                  <h2 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Copyright and safety</h2>
                </div>
                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 dark:border-gray-700 dark:text-white/70">{videoReviews.length}</span>
              </div>
              <div className="space-y-3">
                {videoReviews.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No review items yet.</p>
                ) : videoReviews.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{entry.video?.title || 'Review item'}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-white/45">{entry.review_type} · {entry.severity}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{entry.summary}</p>
                      </div>
                      {entry.video?.id ? (
                        <Link to={`/pixe-studio/content/${entry.video.id}`} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold dark:border-gray-700 dark:text-white/80">
                          Open
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ['clean', 'Mark clean'],
                        ['needs_review', 'Keep queued'],
                        ['blocked', 'Block']
                      ].map(([status, label]) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void reviewVideo(entry.id, status)}
                          disabled={queueActionKey === `review:${entry.id}:${status}`}
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-white/5 dark:text-white disabled:opacity-60"
                        >
                          {queueActionKey === `review:${entry.id}:${status}` ? 'Working…' : label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0b0b0b]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-500">Payout requests</p>
                  <h2 className="mt-2 text-xl font-black text-gray-950 dark:text-white">Creator cash-out</h2>
                </div>
                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 dark:border-gray-700 dark:text-white/70">{payoutRequests.length}</span>
              </div>
              <div className="space-y-3">
                {payoutRequests.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No payout requests yet.</p>
                ) : payoutRequests.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{entry.channel?.display_name || 'Creator'}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-white/45">@{entry.channel?.handle || 'pixe'}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{entry.destination_label}</p>
                      </div>
                      <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 dark:border-gray-700 dark:text-white/80">
                        ${Number(entry.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ['approved', 'Approve'],
                        ['paid', 'Mark paid'],
                        ['rejected', 'Reject']
                      ].map(([status, label]) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void reviewPayout(entry.id, status)}
                          disabled={queueActionKey === `payout:${entry.id}:${status}`}
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-white/5 dark:text-white disabled:opacity-60"
                        >
                          {queueActionKey === `payout:${entry.id}:${status}` ? 'Working…' : label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default AdminPixePage;
