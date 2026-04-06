import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotlightShell from '../../components/spotlight/SpotlightShell';
import { useSpotlightPreferences } from '../../components/spotlight/SpotlightPreferencesContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightService, type SpotlightCreateResult, type SpotlightMediaType } from '../../services/spotlightService';

const CAPTION_LIMIT = 2200;
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');

const draftKeyFor = (uid?: string) => `urbanprime:spotlight:draft:${uid || 'guest'}`;

const extractSuggestedHashtags = (caption: string) => {
  const words = caption
    .toLowerCase()
    .replace(/[^a-z0-9#\s]/g, ' ')
    .split(/\s+/g)
    .filter(Boolean);
  const unique = new Set<string>();
  words.forEach((word) => {
    if (word.startsWith('#') && word.length > 2) unique.add(word.replace('#', ''));
  });
  return Array.from(unique).slice(0, 6);
};

const captureVideoThumbnail = async (file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    await video.play().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    return new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
};

const CreateSpotlightPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { preferences } = useSpotlightPreferences();
  const navigate = useNavigate();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(preferences.defaultVisibility);
  const [allowComments, setAllowComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const draftStorageKey = useMemo(() => draftKeyFor(user?.id), [user?.id]);
  const suggestedHashtags = useMemo(() => extractSuggestedHashtags(caption), [caption]);
  const profileLink = useMemo(() => `/profile/${encodeURIComponent(user?.id || 'me')}`, [user?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setCaption(String(parsed?.caption || ''));
      setVisibility(parsed?.visibility || preferences.defaultVisibility);
      setAllowComments(parsed?.allowComments !== false);
    } catch {
      // ignore invalid draft
    }
  }, [draftStorageKey, preferences.defaultVisibility]);

  useEffect(() => {
    if (!mediaFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            caption,
            visibility,
            allowComments,
            updatedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore draft persistence failures
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [draftStorageKey, caption, visibility, allowComments]);

  const publish = async (status: 'draft' | 'published') => {
    if (!user) {
      showNotification('Please login first.');
      return;
    }
    if (!mediaFile) {
      showNotification('Please select an image or video.');
      return;
    }

    const mediaType: SpotlightMediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
    setIsSubmitting(true);
    try {
      const mainAsset = await spotlightService.uploadSpotlightAsset(mediaFile, user.id, 'spotlight');
      let thumbnailUrl: string | null = mediaType === 'image' ? mainAsset.public_url : null;

      if (mediaType === 'video') {
        const thumbFile = await captureVideoThumbnail(mediaFile);
        if (thumbFile) {
          const thumbAsset = await spotlightService.uploadSpotlightAsset(thumbFile, user.id, 'spotlight-thumb');
          thumbnailUrl = thumbAsset.public_url;
        }
      }

      const created = await spotlightService.createContent({
        media_type: mediaType,
        media_url: mainAsset.public_url,
        thumbnail_url: thumbnailUrl,
        caption: caption.slice(0, CAPTION_LIMIT),
        visibility,
        allow_comments: allowComments,
        hashtags: suggestedHashtags,
        status
      }) as SpotlightCreateResult;

      const createdId = String(created?.id || '').trim();
      if (!createdId) {
        showNotification(
          created?.offline || created?.queued
            ? 'Saved locally and will sync when the backend is available.'
            : 'The backend did not confirm this post yet.'
        );
        return;
      }

      localStorage.removeItem(draftStorageKey);
      showNotification(status === 'published' ? 'Spotlight posted successfully.' : 'Draft saved.');
      navigate(status === 'published' ? `/spotlight/post/${createdId}` : '/spotlight');
    } catch (error: any) {
      showNotification(error?.message || 'Failed to create Spotlight post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rightRail = (
    <div className="space-y-4">
      <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Publishing guide</p>
        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">Prime Spotlight Studio</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Keep the asset sharp, add a concise caption, and let the feed do the rest.</p>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Use Cloudinary-ready media for fast delivery.</div>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Thumbnails load first, video streams after.</div>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Drafts autosave every 5 seconds.</div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Suggested hashtags</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedHashtags.length > 0 ? suggestedHashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
              #{tag}
            </span>
          )) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Add a few tags in your caption to get quick suggestions.</p>
          )}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Your profile</p>
        <div className="mt-3 flex items-center gap-3">
          <img src={safeAvatar((user as any)?.avatar || (user as any)?.photoURL || null)} alt={user?.name || 'You'} className="h-12 w-12 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user?.name || 'Guest creator'}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user ? 'Ready to publish to Spotlight' : 'Login required to publish'}</p>
          </div>
        </div>
        <button onClick={() => navigate(profileLink)} className="mt-4 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
          Open profile
        </button>
      </section>
    </div>
  );

  return (
    <SpotlightShell profileLink={profileLink} rightRail={rightRail}>
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <div className="bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(14,165,233,0.95),rgba(96,165,250,0.7))] px-5 py-6 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/60">Spotlight studio</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Create a premium Spotlight post</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">Publish a photo or video with glassy, fast-loading presentation and optional comments.</p>
          </div>

          <div className="grid gap-5 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                />
                <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">Choose media</div>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{mediaFile ? mediaFile.name : 'Drop an image or video here'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cloudinary-ready uploads, optimized for thumbnail-first rendering.</p>
              </label>

              {mediaFile && (
                <div className="overflow-hidden rounded-[1.7rem] border border-white/70 bg-black shadow-lg dark:border-white/10">
                  {mediaFile.type.startsWith('video/') ? (
                    <video src={previewUrl} className="max-h-[460px] w-full object-cover" controls />
                  ) : (
                    <img src={previewUrl} alt="preview" className="max-h-[460px] w-full object-cover" />
                  )}
                </div>
              )}

              <div className="rounded-[1.7rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value.slice(0, CAPTION_LIMIT))}
                  placeholder="Write your caption..."
                  rows={6}
                  className="w-full resize-none rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-500/50"
                />
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{caption.length}/{CAPTION_LIMIT}</span>
                  <span>{suggestedHashtags.length ? suggestedHashtags.map((tag) => `#${tag}`).join(' ') : 'add #tags in caption'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.7rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Post settings</p>
                <div className="mt-3 grid gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Visibility</span>
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
                      <option value="public">Public</option>
                      <option value="followers">Followers</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <span>Allow comments</span>
                    <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Publishing quality</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Use a strong thumbnail so the feed feels immediate.</div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Keep captions clean and short for better scanability.</div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">The viewer will open in full-screen with autoplay for video.</div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button disabled={isSubmitting} onClick={() => publish('draft')} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Save draft
                </button>
                <button disabled={isSubmitting} onClick={() => publish('published')} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
                  {isSubmitting ? 'Publishing...' : 'Publish now'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SpotlightShell>
  );
};

export default CreateSpotlightPage;
