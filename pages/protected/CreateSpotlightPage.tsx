import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotlightShell from '../../components/spotlight/SpotlightShell';
import { useSpotlightPreferences } from '../../components/spotlight/SpotlightPreferencesContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import { spotlightService, type SpotlightCreateResult, type SpotlightMediaType } from '../../services/spotlightService';
import type { Item } from '../../types';
import {
  buildSpotlightDraftStorageKey,
  captureSpotlightVideoThumbnail,
  extractSpotlightHashtags
} from '../../utils/spotlightComposer';

const CAPTION_LIMIT = 2200;
const MAX_TAGGED_PRODUCTS = 5;
const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');

const getItemPreviewImage = (item: Item) =>
  item.imageUrls?.[0] || item.images?.[0] || item.coverImageUrl || '/icons/urbanprime.svg';

const getListingPriceLabel = (item: Item) => {
  if (item.listingType === 'auction') return `Bid from $${Number(item.price || item.salePrice || 0).toFixed(0)}`;
  if (item.listingType === 'rent') return `Rent $${Number(item.rentalPrice || item.price || 0).toFixed(0)}`;
  if (item.listingType === 'both') {
    return `Buy $${Number(item.salePrice || item.price || 0).toFixed(0)} / Rent $${Number(item.rentalPrice || item.price || 0).toFixed(0)}`;
  }
  return `Buy $${Number(item.salePrice || item.price || 0).toFixed(0)}`;
};

const getListingCtaLabel = (item: Item) => {
  if (item.listingType === 'auction') return 'Bid now';
  if (item.listingType === 'rent') return 'Rent now';
  return 'Buy now';
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
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const draftStorageKey = useMemo(() => buildSpotlightDraftStorageKey('draft', user?.id), [user?.id]);
  const suggestedHashtags = useMemo(() => extractSpotlightHashtags(caption).slice(0, 6), [caption]);
  const profileLink = useMemo(() => `/profile/${encodeURIComponent(user?.id || 'me')}`, [user?.id]);
  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearch.trim()) return catalogItems;
    const needle = catalogSearch.trim().toLowerCase();
    return catalogItems.filter((item) =>
      [item.title, item.category, item.brand || '', item.description]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [catalogItems, catalogSearch]);
  const selectedTaggedProducts = useMemo(
    () => selectedProductIds.map((id) => catalogItems.find((item) => item.id === id)).filter(Boolean) as Item[],
    [catalogItems, selectedProductIds]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setCaption(String(parsed?.caption || ''));
      setVisibility(parsed?.visibility || preferences.defaultVisibility);
      setAllowComments(parsed?.allowComments !== false);
      setSelectedProductIds(
        Array.isArray(parsed?.selectedProductIds)
          ? parsed.selectedProductIds.map((entry: unknown) => String(entry)).slice(0, MAX_TAGGED_PRODUCTS)
          : []
      );
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
            selectedProductIds,
            updatedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore draft persistence failures
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [allowComments, caption, draftStorageKey, selectedProductIds, visibility]);

  useEffect(() => {
    if (!user?.id) {
      setCatalogItems([]);
      setSelectedProductIds([]);
      return;
    }

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError('');

    itemService
      .getItemsByOwner(user.id, {
        visibility: 'owner',
        statuses: ['published'],
        allowMockFallback: false,
        strictOwnerMatch: true
      })
      .then((items) => {
        if (cancelled) return;
        const liveItems = items.filter((item) => (item.status || 'published') === 'published');
        setCatalogItems(liveItems);
        setSelectedProductIds((current) => current.filter((id) => liveItems.some((item) => item.id === id)));
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.warn('Unable to load Spotlight tag catalog:', error);
        setCatalogItems([]);
        setCatalogError(error?.message || 'Unable to load your live catalog right now.');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleTaggedProduct = (itemId: string) => {
    setSelectedProductIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((entry) => entry !== itemId);
      }
      if (current.length >= MAX_TAGGED_PRODUCTS) {
        showNotification(`You can tag up to ${MAX_TAGGED_PRODUCTS} products per Spotlight post.`);
        return current;
      }
      return [...current, itemId];
    });
  };

  const setPrimaryTaggedProduct = (itemId: string) => {
    setSelectedProductIds((current) => {
      if (!current.includes(itemId)) return current;
      return [itemId, ...current.filter((entry) => entry !== itemId)];
    });
  };

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
        const thumbFile = await captureSpotlightVideoThumbnail(mediaFile);
        if (thumbFile) {
          const thumbAsset = await spotlightService.uploadSpotlightAsset(thumbFile, user.id, 'spotlight-thumb');
          thumbnailUrl = thumbAsset.public_url;
        }
      }

      const created = (await spotlightService.createContent({
        media_type: mediaType,
        media_url: mainAsset.public_url,
        thumbnail_url: thumbnailUrl,
        caption: caption.slice(0, CAPTION_LIMIT),
        visibility,
        allow_comments: allowComments,
        hashtags: suggestedHashtags,
        interest_tags: suggestedHashtags,
        status
      })) as SpotlightCreateResult;

      const createdId = String(created?.id || '').trim();
      if (!createdId) {
        showNotification(
          created?.offline || created?.queued
            ? 'Saved locally and will sync when the backend is available.'
            : 'The backend did not confirm this post yet.'
        );
        return;
      }

      let taggingWarning = '';
      if (selectedTaggedProducts.length > 0) {
        try {
          await spotlightService.replaceProductLinks(
            createdId,
            selectedTaggedProducts.map((item, index) => ({
              item_id: item.id,
              placement: index === 0 ? 'hero' : 'mini_card',
              cta_label: getListingCtaLabel(item),
              sort_order: index,
              is_primary: index === 0,
              source: 'creator_tagged',
              metadata: {
                taggedFrom: 'create_spotlight_page',
                listingType: item.listingType,
                ownerId: item.owner?.id || user.id
              }
            }))
          );
        } catch (tagError: any) {
          console.warn('Failed to attach Spotlight product links:', tagError);
          taggingWarning = tagError?.message || 'Post published, but tagged products could not be attached.';
        }
      }

      localStorage.removeItem(draftStorageKey);
      showNotification(
        status === 'published'
          ? taggingWarning || 'Spotlight posted successfully.'
          : taggingWarning || 'Draft saved.'
      );
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
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Keep the asset sharp, add a concise caption, and connect a few live listings so the post can convert immediately.</p>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Use Cloudinary-ready media for fast delivery.</div>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Thumbnails load first, video streams after.</div>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">Drafts autosave every 5 seconds.</div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Suggested hashtags</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedHashtags.length > 0 ? (
            suggestedHashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                #{tag}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Add a few tags in your caption to get quick suggestions.</p>
          )}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Tagged products</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {selectedTaggedProducts.length > 0
                ? `${selectedTaggedProducts.length} linked product${selectedTaggedProducts.length === 1 ? '' : 's'} ready for attribution.`
                : 'Attach up to 5 live products so Spotlight can open them directly.'}
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
            {selectedTaggedProducts.length}/{MAX_TAGGED_PRODUCTS}
          </span>
        </div>
        {selectedTaggedProducts.length > 0 ? (
          <div className="mt-4 space-y-2">
            {selectedTaggedProducts.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/5">
                <img src={getItemPreviewImage(item)} alt={item.title} className="h-12 w-12 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{getListingPriceLabel(item)}</p>
                </div>
                {index === 0 ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-900">Primary</span>
                ) : (
                  <button type="button" onClick={() => setPrimaryTaggedProduct(item.id)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
                    Make primary
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : null}
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
            <p className="mt-2 max-w-2xl text-sm text-white/80">Publish a photo or video with live product tags, thumbnail-first delivery, and immediate buyer handoff into the marketplace.</p>
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

              {mediaFile ? (
                <div className="overflow-hidden rounded-[1.7rem] border border-white/70 bg-black shadow-lg dark:border-white/10">
                  {mediaFile.type.startsWith('video/') ? (
                    <video src={previewUrl} className="max-h-[460px] w-full object-cover" controls />
                  ) : (
                    <img src={previewUrl} alt="preview" className="max-h-[460px] w-full object-cover" />
                  )}
                </div>
              ) : null}

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
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'followers' | 'private')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
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

              <div className="rounded-[1.7rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Tag marketplace products</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The first selected item becomes the primary Spotlight commerce card.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
                    {selectedTaggedProducts.length}/{MAX_TAGGED_PRODUCTS} selected
                  </span>
                </div>

                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Search your live catalog..."
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />

                <div className="mt-4 space-y-3">
                  {catalogLoading ? (
                    <div className="grid gap-3">
                      {[0, 1, 2].map((row) => (
                        <div key={row} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                      ))}
                    </div>
                  ) : catalogError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {catalogError}
                    </div>
                  ) : filteredCatalogItems.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      {catalogItems.length === 0
                        ? 'Publish a listing first to tag it in Spotlight.'
                        : 'No matching products found for this search.'}
                    </div>
                  ) : (
                    filteredCatalogItems.slice(0, 8).map((item) => {
                      const isSelected = selectedProductIds.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleTaggedProduct(item.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${isSelected ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white'}`}
                        >
                          <img src={getItemPreviewImage(item)} alt={item.title} className="h-14 w-14 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.title}</p>
                            <p className={`truncate text-xs ${isSelected ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                              {item.category} / {getListingPriceLabel(item)}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${isSelected ? 'bg-white/20 text-white dark:bg-slate-950/10 dark:text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                            {isSelected ? 'Linked' : 'Add'}
                          </span>
                        </button>
                      );
                    })
                  )}
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
