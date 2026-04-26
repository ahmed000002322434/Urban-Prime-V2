import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeStudioListSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeStudioGlyph from '../../../components/pixe/PixeStudioGlyph';
import { pixeService, type PixeVideo } from '../../../services/pixeService';

const filters = ['all', 'draft', 'uploading', 'processing', 'ready', 'published', 'failed', 'archived'] as const;

const VideoActionIcon: React.FC<{ to: string; icon: 'edit' | 'watch' | 'analytics' | 'comments'; label: string; disabled?: boolean }> = ({
  to,
  icon,
  label,
  disabled = false
}) => {
  if (disabled) {
    return (
      <span title={label} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/24">
        <PixeStudioGlyph name={icon} className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link
      to={to}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white/82 transition hover:bg-white hover:text-black"
    >
      <PixeStudioGlyph name={icon} className="h-4 w-4" />
    </Link>
  );
};

const VideoActionButton: React.FC<{ icon: 'delete'; label: string; onClick: () => void; disabled?: boolean }> = ({
  icon,
  label,
  onClick,
  disabled = false
}) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
      disabled
        ? 'border-white/10 bg-white/[0.03] text-white/24'
        : 'border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
    }`}
  >
    <PixeStudioGlyph name={icon} className="h-4 w-4" />
  </button>
);

const PixeStudioContentPage: React.FC = () => {
  const [videos, setVideos] = useState<PixeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await pixeService.getStudioContent(null, filter === 'all' ? undefined : filter);
        if (!cancelled) setVideos(payload.items);
      } catch (error) {
        console.error('Unable to load Pixe studio content:', error);
        if (!cancelled) setError('Unable to load Pixe content.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const publishVideo = async (videoId: string) => {
    try {
      setPublishingId(videoId);
      const next = await pixeService.publishVideo(videoId, { scheduled_for: null });
      setVideos((current) => current.map((entry) => (entry.id === videoId ? next : entry)));
    } catch (error) {
      console.error('Unable to publish Pixe video:', error);
      setError('Unable to publish this video right now.');
    } finally {
      setPublishingId(null);
    }
  };

  const deleteVideo = async (videoId: string, title: string) => {
    if (deletingId) return;
    const confirmed = window.confirm(`Delete "${title || 'this video'}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(videoId);
      setError('');
      await pixeService.deleteVideo(videoId);
      setVideos((current) => current.filter((entry) => entry.id !== videoId));
    } catch (error: any) {
      console.error('Unable to delete Pixe video:', error);
      setError(error?.message || 'Unable to delete this video right now.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Content</p>
            <h2 className="mt-2 text-3xl font-semibold">Library</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              Drafts, processing clips, and published videos all live here. Hover a row to open edit, watch, analytics, or comments for that video only.
            </p>
          </div>
          <Link to="/pixe-studio/upload" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            New upload
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setFilter(entry)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === entry ? 'bg-white text-black' : 'pixe-noir-pill text-white/70'
            }`}
          >
            {entry === 'all' ? 'All videos' : entry}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      {loading ? (
        <PixeStudioListSkeleton rows={5} />
      ) : videos.length === 0 ? (
        <PixeEmptyState
          title="No videos in this state"
          message="Drafts, processing uploads, scheduled clips, and published content will appear here once you start using Pixe Studio."
          animation="noFileFound"
          primaryAction={{ label: 'Upload clip', to: '/pixe-studio/upload' }}
          secondaryAction={{ label: 'View dashboard', to: '/pixe-studio/dashboard' }}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {videos.map((video) => (
              <div key={video.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex gap-4">
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[18px] bg-black">
                    {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover" /> : null}
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/55 px-1 py-1.5">
                      <VideoActionIcon to={`/pixe-studio/content/${video.id}`} icon="edit" label="Edit details" />
                      <VideoActionIcon to={`/pixe/watch/${video.id}`} icon="watch" label="Watch video" disabled={!video.playback_id && !video.manifest_url} />
                      <VideoActionIcon to={`/pixe-studio/analytics/${video.id}`} icon="analytics" label="Video analytics" />
                      <VideoActionIcon to={`/pixe-studio/comments?videoId=${video.id}`} icon="comments" label="Video comments" />
                      <VideoActionButton icon="delete" label="Delete video" disabled={deletingId === video.id} onClick={() => void deleteVideo(video.id, video.title)} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{video.title || 'Untitled clip'}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/46">{video.caption || 'No caption yet.'}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/72">
                        {video.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/60">
                      <span>{video.metrics.qualified_views} views</span>
                      <span>{video.metrics.likes} likes</span>
                      <span>{video.metrics.comments} comments</span>
                      <span>{video.metrics.completion_rate}% completion</span>
                    </div>

                    {video.status === 'ready' ? (
                      <button
                        type="button"
                        disabled={publishingId === video.id}
                        onClick={() => void publishVideo(video.id)}
                        className="mt-4 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white"
                      >
                        {publishingId === video.id ? 'Publishing...' : 'Publish'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden space-y-3 lg:block">
            {videos.map((video) => (
              <div key={video.id} className="group rounded-[30px] border border-white/10 bg-black/20 px-5 py-4 transition hover:border-white/18 hover:bg-white/[0.05]">
                <div className="grid grid-cols-[minmax(0,1.5fr)_140px_100px_100px_160px] items-center gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[20px] bg-black">
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title || 'Pixe clip'} className="h-full w-full object-cover" /> : null}
                      <div className="absolute inset-0 hidden items-end justify-center bg-black/45 p-2 group-hover:flex">
                        <div className="flex gap-1">
                          <VideoActionIcon to={`/pixe-studio/content/${video.id}`} icon="edit" label="Edit details" />
                          <VideoActionIcon to={`/pixe/watch/${video.id}`} icon="watch" label="Watch video" disabled={!video.playback_id && !video.manifest_url} />
                          <VideoActionIcon to={`/pixe-studio/analytics/${video.id}`} icon="analytics" label="Video analytics" />
                          <VideoActionIcon to={`/pixe-studio/comments?videoId=${video.id}`} icon="comments" label="Video comments" />
                          <VideoActionButton icon="delete" label="Delete video" disabled={deletingId === video.id} onClick={() => void deleteVideo(video.id, video.title)} />
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="truncate text-base font-semibold text-white">{video.title || 'Untitled clip'}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/72">
                          {video.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/48">{video.caption || 'No caption yet.'}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/56">
                        <span>{video.metrics.qualified_views} views</span>
                        <span>{video.metrics.likes} likes</span>
                        <span>{video.metrics.comments} comments</span>
                        <span>{video.metrics.completion_rate}% completion</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/38">Completion</p>
                    <p className="mt-2 text-sm font-semibold text-white">{video.metrics.completion_rate}%</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(video.metrics.completion_rate, 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/38">Watch</p>
                    <p className="mt-2 text-sm font-semibold text-white">{Math.round(video.metrics.watch_time_ms / 60000)}m</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/38">Likes</p>
                    <p className="mt-2 text-sm font-semibold text-white">{video.metrics.likes}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <VideoActionIcon to={`/pixe-studio/content/${video.id}`} icon="edit" label="Edit details" />
                    <VideoActionIcon to={`/pixe/watch/${video.id}`} icon="watch" label="Watch video" disabled={!video.playback_id && !video.manifest_url} />
                    <VideoActionIcon to={`/pixe-studio/analytics/${video.id}`} icon="analytics" label="Video analytics" />
                    <VideoActionIcon to={`/pixe-studio/comments?videoId=${video.id}`} icon="comments" label="Video comments" />
                    <VideoActionButton icon="delete" label="Delete video" disabled={deletingId === video.id} onClick={() => void deleteVideo(video.id, video.title)} />
                    {video.status === 'ready' ? (
                      <button
                        type="button"
                        disabled={publishingId === video.id}
                        onClick={() => void publishVideo(video.id)}
                        className="ml-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-black"
                      >
                        {publishingId === video.id ? 'Publishing...' : 'Publish'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PixeStudioContentPage;
