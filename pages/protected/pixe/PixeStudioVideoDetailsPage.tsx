import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PixeEmptyState from '../../../components/pixe/PixeEmptyState';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeStudioGlyph from '../../../components/pixe/PixeStudioGlyph';
import { pixeService, type PixeSubtitleState, type PixeVideo, type PixeVideoReviewBundle } from '../../../services/pixeService';

type EditableProduct = {
  id?: string;
  item_id: string | null;
  image_url: string | null;
  title: string;
  href: string;
  cta_label: string;
  price_amount: string;
  currency: string;
};

type ThumbnailOption = {
  id: string;
  label: string;
  url: string;
};

const inputClassName = 'pixe-noir-input h-11 rounded-2xl px-4 text-sm outline-none focus:border-white/20';
const textareaClassName = 'pixe-noir-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-white/20';

const createEditableProduct = (): EditableProduct => ({
  item_id: null,
  image_url: null,
  title: '',
  href: '',
  cta_label: 'Shop',
  price_amount: '',
  currency: 'USD'
});

const buildThumbnailOptions = (video: PixeVideo | null) => {
  if (!video?.playback_id || !video.duration_ms) return [];
  const durationSeconds = Math.max(1, Math.round(video.duration_ms / 1000));
  const marks = [
    { label: 'Start', second: 0.5 },
    { label: '25%', second: Math.max(0.5, durationSeconds * 0.25) },
    { label: '50%', second: Math.max(0.5, durationSeconds * 0.5) },
    { label: '75%', second: Math.max(0.5, durationSeconds * 0.75) },
    { label: 'End', second: Math.max(0.5, durationSeconds - 0.6) }
  ];

  return marks.map((mark) => ({
    id: `${Math.round(mark.second * 1000)}`,
    label: mark.label,
    url: `https://image.mux.com/${video.playback_id}/thumbnail.webp?fit_mode=preserve&width=520&time=${mark.second.toFixed(2)}`
  }));
};

const reviewToneClassNames: Record<string, string> = {
  high: 'border-rose-500/25 bg-rose-500/10',
  medium: 'border-amber-500/25 bg-amber-500/10',
  low: 'border-emerald-500/25 bg-emerald-500/10'
};

const reviewStatusLabel = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Pending';
  return normalized.replace(/_/g, ' ');
};

const PixeStudioVideoDetailsPage: React.FC = () => {
  const { videoId = '' } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<PixeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [hashtags, setHashtags] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [products, setProducts] = useState<EditableProduct[]>([createEditableProduct()]);
  const [selectedThumbnailId, setSelectedThumbnailId] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [subtitleState, setSubtitleState] = useState<PixeSubtitleState | null>(null);
  const [subtitleTranscript, setSubtitleTranscript] = useState('');
  const [subtitleVtt, setSubtitleVtt] = useState('');
  const [subtitleSaving, setSubtitleSaving] = useState(false);
  const [subtitleRefreshing, setSubtitleRefreshing] = useState(false);
  const [subtitleError, setSubtitleError] = useState('');
  const [reviewBundle, setReviewBundle] = useState<PixeVideoReviewBundle | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getVideo(videoId);
        const [subtitlePayload, reviewPayload] = await Promise.all([
          pixeService.getVideoSubtitles(videoId).catch(() => null),
          pixeService.getVideoReviews(videoId).catch(() => null)
        ]);
        if (cancelled) return;
        setVideo(payload);
        setTitle(payload.title || '');
        setCaption(payload.caption || '');
        setVisibility(payload.visibility);
        setAllowComments(payload.allow_comments);
        setHashtags(payload.hashtags.join(', '));
        setScheduleAt(payload.scheduled_for ? new Date(payload.scheduled_for).toISOString().slice(0, 16) : '');
        setProducts(
          payload.product_tags.length > 0
            ? payload.product_tags.map((tag) => ({
              id: tag.id,
              item_id: tag.item_id || null,
              image_url: tag.image_url || null,
              title: tag.title,
              href: tag.href || '',
              cta_label: tag.cta_label,
              price_amount: tag.price_amount ? tag.price_amount.toFixed(2) : '',
              currency: tag.currency || 'USD'
            }))
            : [createEditableProduct()]
        );
        setSubtitleState(subtitlePayload);
        setSubtitleTranscript(subtitlePayload?.transcript_text || '');
        setSubtitleVtt(subtitlePayload?.vtt_text || '');
        setReviewBundle(reviewPayload);
      } catch (loadError: any) {
        console.error('Unable to load Pixe studio video details:', loadError);
        if (!cancelled) setError(loadError?.message || 'Unable to load video.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReviewLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const thumbnailOptions = useMemo(() => buildThumbnailOptions(video), [video]);
  const activeCopyrightSignals = reviewBundle?.copyright?.signals || [];
  const activeModerationSignals = reviewBundle?.moderation?.signals || [];

  const updateProduct = (index: number, patch: Partial<EditableProduct>) => {
    setProducts((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  const saveSubtitles = async () => {
    if (!video) return;
    try {
      setSubtitleSaving(true);
      setSubtitleError('');
      const next = await pixeService.saveVideoSubtitles(video.id, {
        language_code: subtitleState?.language_code || 'en',
        name: subtitleState?.name || 'English',
        transcript_text: subtitleTranscript,
        vtt_text: subtitleVtt
      });
      setSubtitleState(next);
      setSubtitleTranscript(next.transcript_text || '');
      setSubtitleVtt(next.vtt_text || '');
      const nextReviews = await pixeService.refreshVideoReviews(video.id).catch(() => null);
      if (nextReviews) setReviewBundle(nextReviews);
    } catch (saveError: any) {
      console.error('Unable to save Pixe subtitles:', saveError);
      setSubtitleError(saveError?.message || 'Unable to save subtitles.');
    } finally {
      setSubtitleSaving(false);
    }
  };

  const regenerateSubtitles = async () => {
    if (!video) return;
    try {
      setSubtitleRefreshing(true);
      setSubtitleError('');
      const next = await pixeService.regenerateVideoSubtitles(video.id, {
        language_code: subtitleState?.language_code || 'en',
        name: subtitleState?.name || 'English'
      });
      setSubtitleState((current) => ({ ...(current || next), ...next }));
    } catch (refreshError: any) {
      console.error('Unable to regenerate Pixe subtitles:', refreshError);
      setSubtitleError(refreshError?.message || 'Unable to regenerate subtitles.');
    } finally {
      setSubtitleRefreshing(false);
    }
  };

  const refreshReviews = async () => {
    if (!video) return;
    try {
      setReviewLoading(true);
      const next = await pixeService.refreshVideoReviews(video.id);
      setReviewBundle(next);
    } catch (refreshError) {
      console.error('Unable to refresh Pixe video reviews:', refreshError);
    } finally {
      setReviewLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!video) return;
    try {
      setSaving(true);
      setError('');
      const selectedThumbnail = thumbnailOptions.find((option) => option.id === selectedThumbnailId);
      const updated = await pixeService.updateVideo(video.id, {
        title,
        caption,
        visibility,
        allow_comments: allowComments,
        scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : null,
        hashtags: hashtags.split(/[,\s]+/g).map((entry) => entry.trim()).filter(Boolean),
        thumbnail_url: selectedThumbnail?.url || video.thumbnail_url || null,
        product_tags: products
          .filter((product) => product.title.trim() || product.href.trim())
          .map((product) => ({
            item_id: product.item_id || null,
            image_url: product.image_url || null,
            title: product.title.trim(),
            href: product.href.trim(),
            cta_label: product.cta_label.trim() || 'Shop',
            price_amount: Number(product.price_amount || 0),
            currency: product.currency.trim() || 'USD'
          }))
      });
      setVideo(updated);
    } catch (saveError: any) {
      console.error('Unable to save Pixe video details:', saveError);
      setError(saveError?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!video) return;
    try {
      setPublishing(true);
      setError('');
      const next = await pixeService.publishVideo(video.id, { scheduled_for: null });
      setVideo(next);
    } catch (publishError: any) {
      console.error('Unable to publish Pixe video:', publishError);
      setError(publishError?.message || 'Unable to publish clip.');
    } finally {
      setPublishing(false);
    }
  };

  const deleteVideo = async () => {
    if (!video || deleting) return;
    const confirmed = window.confirm(`Delete "${video.title || 'this video'}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError('');
      await pixeService.deleteVideo(video.id);
      navigate('/pixe-studio/content');
    } catch (deleteError: any) {
      console.error('Unable to delete Pixe video:', deleteError);
      setError(deleteError?.message || 'Unable to delete video.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <PixeChartPageSkeleton />;
  }

  if (!video) {
    return (
      <PixeEmptyState
        title="Video unavailable"
        message={error || 'This video could not be loaded from Pixe Studio.'}
        animation="noFileFound"
        primaryAction={{ label: 'Back to content', to: '/pixe-studio/content' }}
        secondaryAction={{ label: 'Open upload', to: '/pixe-studio/upload' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Video Details</p>
            <h2 className="mt-2 text-3xl font-semibold">{video.title || 'Untitled clip'}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/72">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 uppercase">{video.status}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{video.metrics.qualified_views} views</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{video.metrics.likes} likes</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{video.metrics.comments} comments</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/pixe/watch/${video.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82">
              Watch
            </Link>
            <Link to={`/pixe-studio/analytics/${video.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82">
              Analytics
            </Link>
            <button type="button" onClick={() => void saveChanges()} disabled={saving} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {(video.status === 'ready' || video.status === 'published') ? (
              <button type="button" onClick={() => void publishNow()} disabled={publishing} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            ) : null}
            <button type="button" onClick={() => void deleteVideo()} disabled={deleting} className="rounded-full border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_380px]">
        <div className="space-y-6">
          <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Metadata</p>
              <h3 className="mt-2 text-xl font-semibold">Title, caption, and release</h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName} />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Schedule</span>
                <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className={inputClassName} />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="block text-sm font-semibold text-white">Caption</span>
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={6} className={textareaClassName} />
            </label>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Visibility</span>
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'followers' | 'private')} className={inputClassName}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Hashtags</span>
                <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="fashion, launch, studio" className={inputClassName} />
              </label>
              <label className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <span className="block text-sm font-semibold text-white">Comments</span>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/74">{allowComments ? 'Enabled' : 'Disabled'}</span>
                  <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} />
                </div>
              </label>
            </div>
          </section>

          <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Commerce</p>
                <h3 className="mt-2 text-xl font-semibold">Linked products and services</h3>
              </div>
              <button type="button" onClick={() => setProducts((current) => [...current, createEditableProduct()])} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/82">
                Add link
              </button>
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={`${product.id || 'new'}-${index}`} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="grid gap-3 lg:grid-cols-4">
                    <input value={product.title} onChange={(event) => updateProduct(index, { title: event.target.value })} placeholder="Title" className={inputClassName} />
                    <input value={product.href} onChange={(event) => updateProduct(index, { href: event.target.value })} placeholder="/item/... or https://..." className={inputClassName} />
                    <input value={product.price_amount} onChange={(event) => updateProduct(index, { price_amount: event.target.value })} placeholder="29.99" className={inputClassName} />
                    <input value={product.cta_label} onChange={(event) => updateProduct(index, { cta_label: event.target.value })} placeholder="Shop" className={inputClassName} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Rights Review</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Copyright and moderation</h3>
                <button type="button" onClick={() => void refreshReviews()} disabled={reviewLoading} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/82 disabled:opacity-60">
                  {reviewLoading ? 'Refreshing…' : 'Refresh review'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Copyright</p>
                    <p className="mt-1 text-sm font-semibold text-white">{reviewStatusLabel(reviewBundle?.copyright?.status)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
                    {reviewBundle?.copyright?.severity || 'low'}
                  </span>
                </div>
                <div className="space-y-3">
                  {activeCopyrightSignals.map((signal) => (
                    <div key={signal.title} className={`rounded-[20px] border px-4 py-3 ${reviewToneClassNames[signal.level] || reviewToneClassNames.low}`}>
                      <p className="text-sm font-semibold text-white">{signal.title}</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">{signal.body}</p>
                    </div>
                  ))}
                  {reviewBundle?.copyright?.duplicate_candidates?.length ? (
                    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Potential duplicates</p>
                      <div className="mt-3 space-y-2">
                        {reviewBundle.copyright.duplicate_candidates.map((candidate) => (
                          <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72">
                            <span className="truncate">{candidate.title || 'Untitled clip'}</span>
                            <span className="shrink-0 text-xs text-white/48">{Math.round(candidate.score * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Moderation</p>
                    <p className="mt-1 text-sm font-semibold text-white">{reviewStatusLabel(reviewBundle?.moderation?.status)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
                    {reviewBundle?.moderation?.severity || 'low'}
                  </span>
                </div>
                <div className="space-y-3">
                  {activeModerationSignals.map((signal) => (
                    <div key={signal.title} className={`rounded-[20px] border px-4 py-3 ${reviewToneClassNames[signal.level] || reviewToneClassNames.low}`}>
                      <p className="text-sm font-semibold text-white">{signal.title}</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">{signal.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/74">
              <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
              <span>I own the rights to this clip, audio, and linked assets, or I have permission to use them.</span>
            </label>
          </section>

          <section className="pixe-noir-panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Subtitles</p>
                <h3 className="mt-2 text-xl font-semibold">Review and edit transcript</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void regenerateSubtitles()} disabled={subtitleRefreshing} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/82 disabled:opacity-60">
                  {subtitleRefreshing ? 'Queued…' : 'Regenerate'}
                </button>
                <button type="button" onClick={() => void saveSubtitles()} disabled={subtitleSaving} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60">
                  {subtitleSaving ? 'Saving…' : 'Save subtitles'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Transcript</span>
                <textarea
                  value={subtitleTranscript}
                  onChange={(event) => setSubtitleTranscript(event.target.value)}
                  rows={12}
                  placeholder="Generated transcript will appear here."
                  className={textareaClassName}
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">WebVTT</span>
                <textarea
                  value={subtitleVtt}
                  onChange={(event) => setSubtitleVtt(event.target.value)}
                  rows={12}
                  placeholder="WEBVTT"
                  className={textareaClassName}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/60">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{subtitleState?.source || 'generated'}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{subtitleState?.sync_status || 'local'}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{subtitleState?.status || 'missing'}</span>
            </div>

            {subtitleError ? (
              <div className="mt-4 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {subtitleError}
              </div>
            ) : null}

            {subtitleState?.subtitle_url ? (
              <div className="mt-4">
                <a href={subtitleState.subtitle_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82">
                  Open VTT file
                </a>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Thumbnail</p>
            <h3 className="mt-2 text-lg font-semibold">Choose a frame</h3>
            {thumbnailOptions.length === 0 ? (
              <p className="mt-3 text-sm text-white/56">Thumbnail presets will appear after the video is ready.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {thumbnailOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedThumbnailId(option.id)}
                    className={`overflow-hidden rounded-[20px] border text-left transition ${
                      selectedThumbnailId === option.id ? 'border-white bg-white/10' : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="aspect-[4/5] bg-black">
                      <img src={option.url} alt={option.label} className="h-full w-full object-cover" />
                    </div>
                    <div className="px-3 py-2 text-xs font-semibold text-white/76">{option.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pixe-noir-panel rounded-[30px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Shortcuts</p>
            <div className="mt-4 space-y-2">
              {[
                { to: `/pixe-studio/analytics/${video.id}`, label: 'Video analytics', icon: 'analytics' as const },
                { to: `/pixe-studio/comments?videoId=${video.id}`, label: 'Video comments', icon: 'comments' as const },
                { to: `/pixe/watch/${video.id}`, label: 'Public watch page', icon: 'watch' as const }
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

export default PixeStudioVideoDetailsPage;
