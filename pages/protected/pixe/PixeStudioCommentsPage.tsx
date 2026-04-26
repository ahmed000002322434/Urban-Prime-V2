import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeStudioListSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeStudioGlyph from '../../../components/pixe/PixeStudioGlyph';
import { pixeService } from '../../../services/pixeService';

type StudioComment = Awaited<ReturnType<typeof pixeService.getStudioComments>>[number];

const PixeStudioCommentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'reported' | 'hidden'>('all');
  const videoId = String(searchParams.get('videoId') || '').trim();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getStudioComments();
        if (!cancelled) setComments(payload);
      } catch (error) {
        console.error('Unable to load Pixe comments:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateComment = async (commentId: string, payload: { status?: string; is_pinned?: boolean }) => {
    const next = await pixeService.updateComment(commentId, payload);
    setComments((current) => current.map((comment) => (
      comment.id === commentId
        ? {
          ...comment,
          status: next.status,
          is_pinned: next.is_pinned
        }
        : comment
    )));
  };

  const filteredComments = videoId
    ? comments.filter((comment) => comment.video?.id === videoId)
    : comments;
  const visibleComments = filteredComments.filter((comment) => {
    if (viewMode === 'reported') return Number(comment.reports?.report_count || 0) > 0;
    if (viewMode === 'hidden') return comment.status === 'hidden';
    return true;
  });
  const focusedVideo = videoId
    ? comments.find((comment) => comment.video?.id === videoId)?.video || null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Comments</p>
          <h2 className="mt-2 text-3xl font-semibold">{focusedVideo ? 'Video Comments' : 'Moderation Queue'}</h2>
          {focusedVideo ? <p className="mt-2 text-sm text-white/56">{focusedVideo.title || 'Selected video'}</p> : null}
        </div>
        {focusedVideo ? (
          <div className="flex flex-wrap gap-2">
            <Link to={`/pixe-studio/content/${focusedVideo.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
              Edit details
            </Link>
            <Link to={`/pixe-studio/analytics/${focusedVideo.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
              Analytics
            </Link>
            <Link to="/pixe-studio/comments" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              All comments
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All'],
          ['reported', 'Reported'],
          ['hidden', 'Hidden']
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setViewMode(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              viewMode === value
                ? 'bg-white text-black'
                : 'border border-white/10 bg-white/[0.04] text-white/78'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <PixeStudioListSkeleton rows={4} />
      ) : visibleComments.length === 0 ? (
        <PixeEmptyState
          title="No comment activity yet"
          message={focusedVideo ? 'This video has no comment activity for the current filter.' : 'Once viewers start commenting on published clips, the moderation queue will show them here with pin, hide, and report controls.'}
          animation="nothing"
          primaryAction={{ label: 'Open content', to: '/pixe-studio/content' }}
          secondaryAction={{ label: 'Upload clip', to: '/pixe-studio/upload' }}
        />
      ) : (
        <div className="grid gap-4">
          {visibleComments.map((comment) => (
            <div key={comment.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={comment.user?.avatar_url || '/icons/urbanprime.svg'}
                      alt={comment.user?.name || 'Viewer'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{comment.user?.name || 'Viewer'}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-white/45">
                        <span>{comment.video?.title || 'Video comment'}</span>
                        {comment.reports?.report_count ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                            {comment.reports.report_count} reports
                          </span>
                        ) : null}
                        {comment.status === 'hidden' ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                            Hidden
                          </span>
                        ) : null}
                        {comment.video?.id ? (
                          <div className="flex items-center gap-2">
                            <Link to={`/pixe-studio/content/${comment.video.id}`} title="Edit details" className="text-white/55 hover:text-white">
                              <PixeStudioGlyph name="edit" className="h-4 w-4" />
                            </Link>
                            <Link to={`/pixe-studio/analytics/${comment.video.id}`} title="Video analytics" className="text-white/55 hover:text-white">
                              <PixeStudioGlyph name="analytics" className="h-4 w-4" />
                            </Link>
                            <Link to={`/pixe/watch/${comment.video.id}`} title="Watch video" className="text-white/55 hover:text-white">
                              <PixeStudioGlyph name="watch" className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-white/78">{comment.body}</p>
                  {comment.reports?.report_count ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
                      {comment.reports.reasons.map((reason) => (
                        <span key={reason} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void updateComment(comment.id, { is_pinned: !comment.is_pinned })} className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold">
                    {comment.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button type="button" onClick={() => void updateComment(comment.id, { status: comment.status === 'hidden' ? 'active' : 'hidden' })} className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold">
                    {comment.status === 'hidden' ? 'Restore' : 'Hide'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PixeStudioCommentsPage;
