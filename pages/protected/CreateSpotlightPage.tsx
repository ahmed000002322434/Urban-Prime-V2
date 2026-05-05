import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { auth } from '../../firebase';
import { itemService } from '../../services/itemService';
import { spotlightService, type SpotlightProductLink } from '../../services/spotlightService';
import type { Item } from '../../types';

type DraftStatus = 'draft' | 'published';
type SelectedProduct = {
  item: Item;
  placement: SpotlightProductLink['placement'];
  ctaLabel: string;
  isPrimary: boolean;
};

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';
const softClass =
  'rounded-[24px] border border-white/[0.06] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

const placementOptions: SpotlightProductLink['placement'][] = ['inline_chip', 'mini_card', 'context_mode', 'hero'];

const toTagArray = (value: string) => value
  .split(/[,\n]/g)
  .map((entry) => entry.trim().replace(/^#+/, '').toLowerCase())
  .filter(Boolean)
  .slice(0, 12);

const buildTextSpotlightDataUrl = (caption: string) => {
  const safeCaption = caption
    .trim()
    .slice(0, 240)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="52%" stop-color="#3f2a21" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" rx="72" fill="url(#bg)" />
      <text x="96" y="180" fill="rgba(255,255,255,0.55)" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="8">SPOTLIGHT</text>
      <foreignObject x="96" y="260" width="1008" height="820">
        <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;height:100%;align-items:flex-start;color:white;font-family:Inter,Arial,sans-serif;font-size:70px;line-height:1.18;font-weight:700;white-space:pre-wrap;">
          ${safeCaption || 'Urban Prime Spotlight'}
        </div>
      </foreignObject>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getItemImage = (item: Item) => item.imageUrls?.[0] || item.images?.[0] || item.thumbnailUrl || '';

const CreateSpotlightPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Item[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ownerFirebaseUid = useMemo(
    () => String(auth.currentUser?.uid || user?.id || '').trim(),
    [user?.id]
  );

  useEffect(() => {
    if (!productQuery.trim() || productQuery.trim().length < 2) {
      setProductResults([]);
      setIsSearchingProducts(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setIsSearchingProducts(true);
      void itemService.searchItems(productQuery.trim())
        .then((result) => {
          if (!active) return;
          setProductResults(result.items || []);
        })
        .catch(() => {
          if (active) setProductResults([]);
        })
        .finally(() => {
          if (active) setIsSearchingProducts(false);
        });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [productQuery]);

  const previewSrc = mediaPreview || (caption.trim() ? buildTextSpotlightDataUrl(caption) : '');

  const upsertSelectedProduct = (item: Item) => {
    setSelectedProducts((current) => {
      if (current.some((entry) => entry.item.id === item.id)) return current;
      if (current.length >= 4) {
        showNotification('You can tag up to 4 products on a Spotlight post.');
        return current;
      }
      return [
        ...current,
        {
          item,
          placement: current.length === 0 ? 'hero' : 'inline_chip',
          ctaLabel: 'Shop now',
          isPrimary: current.length === 0
        }
      ];
    });
  };

  const removeSelectedProduct = (itemId: string) => {
    setSelectedProducts((current) => {
      const next = current.filter((entry) => entry.item.id !== itemId);
      if (next.length > 0 && !next.some((entry) => entry.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };

  const updateSelectedProduct = (itemId: string, patch: Partial<SelectedProduct>) => {
    setSelectedProducts((current) => current.map((entry) => (
      entry.item.id === itemId ? { ...entry, ...patch } : entry
    )));
  };

  const markPrimary = (itemId: string) => {
    setSelectedProducts((current) => current.map((entry) => ({
      ...entry,
      isPrimary: entry.item.id === itemId
    })));
  };

  const handleMediaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setMediaFile(file);
    setMediaPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleThumbnailFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setThumbnailFile(file);
    setThumbnailPreview(file ? URL.createObjectURL(file) : '');
  };

  const submit = async (status: DraftStatus) => {
    if (!ownerFirebaseUid) {
      showNotification('You must be signed in to create Spotlight content.');
      return;
    }
    if (!caption.trim() && !mediaFile) {
      showNotification('Add media or at least one caption line before publishing.');
      return;
    }
    if (selectedProducts.length > 0 && selectedProducts.filter((entry) => entry.isPrimary).length !== 1) {
      showNotification('Choose exactly one primary product when products are attached.');
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaType = mediaFile?.type.startsWith('video/') ? 'video' : 'image';
      const uploadedMedia = mediaFile
        ? await spotlightService.uploadSpotlightAsset(mediaFile, ownerFirebaseUid, mediaType === 'video' ? 'spotlight' : 'spotlight')
        : null;
      const uploadedThumbnail = thumbnailFile
        ? await spotlightService.uploadSpotlightAsset(thumbnailFile, ownerFirebaseUid, 'spotlight-thumb')
        : null;

      const created = await spotlightService.createContent({
        media_type: mediaType,
        media_url: uploadedMedia?.public_url || buildTextSpotlightDataUrl(caption),
        thumbnail_url: uploadedThumbnail?.public_url || null,
        caption: caption.trim(),
        hashtags: toTagArray(hashtagsInput),
        interest_tags: toTagArray(interestInput),
        visibility,
        allow_comments: allowComments,
        status
      });

      if (selectedProducts.length > 0) {
        await spotlightService.replaceProductLinks(
          created.id,
          selectedProducts.map((entry, index) => ({
            item_id: entry.item.id,
            placement: entry.placement,
            cta_label: entry.ctaLabel.trim() || 'Shop now',
            sort_order: index,
            is_primary: entry.isPrimary,
            source: 'creator_tagged'
          }))
        );
      }

      showNotification(status === 'draft' ? 'Draft saved.' : 'Spotlight published.');
      navigate(status === 'draft' ? '/spotlight/profile' : `/spotlight/post/${created.id}`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to create Spotlight content.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SpotlightNoirBlankSurface>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className={`${panelClass} p-6 sm:p-7`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/36">Spotlight composer</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Draft, tag products, and publish directly into the X-style Spotlight feed.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/56 sm:text-[15px]">
                This flow uses the live Spotlight APIs, supports drafts, and carries tagged-product attribution into item detail, cart, and checkout.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void submit('draft')} disabled={isSubmitting} className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save draft'}
              </button>
              <button type="button" onClick={() => void submit('published')} disabled={isSubmitting} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50">
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <section className="space-y-5">
            <div className={`${panelClass} p-5`}>
              <label className="block text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Caption</label>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Write the post copy, drop note, or creator update..."
                className="mt-3 min-h-[180px] w-full rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/14"
              />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Hashtags</label>
                  <input
                    value={hashtagsInput}
                    onChange={(event) => setHashtagsInput(event.target.value)}
                    placeholder="luxury, drop, styling"
                    className="mt-2 h-12 w-full rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Interest tags</label>
                  <input
                    value={interestInput}
                    onChange={(event) => setInterestInput(event.target.value)}
                    placeholder="streetwear, audio, footwear"
                    className="mt-2 h-12 w-full rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>
              </div>
            </div>

            <div className={`${panelClass} p-5`}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Media</label>
                  <input type="file" accept="image/*,video/*" onChange={handleMediaFileChange} className="mt-3 block w-full text-sm text-white/72" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Video thumbnail</label>
                  <input type="file" accept="image/*" onChange={handleThumbnailFileChange} className="mt-3 block w-full text-sm text-white/72" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className={`${softClass} flex items-center justify-between px-4 py-3`}>
                  <span className="text-sm font-semibold text-white/78">Allow comments</span>
                  <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} className="h-4 w-4" />
                </label>
                <label className={`${softClass} flex items-center justify-between gap-3 px-4 py-3`}>
                  <span className="text-sm font-semibold text-white/78">Visibility</span>
                  <select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className="rounded-full bg-white/[0.08] px-3 py-2 text-sm text-white outline-none">
                    <option value="public">Public</option>
                    <option value="followers">Followers</option>
                    <option value="private">Private</option>
                  </select>
                </label>
              </div>
            </div>

            <div className={`${panelClass} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Tagged products</p>
                  <p className="mt-2 text-sm text-white/56">Add up to 4 products and choose one primary attachment.</p>
                </div>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/58">{selectedProducts.length}/4</span>
              </div>

              <input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Search products to tag..."
                className="mt-4 h-12 w-full rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/28"
              />

              <div className="mt-4 space-y-3">
                {selectedProducts.map((entry) => (
                  <div key={entry.item.id} className={`${softClass} p-4`}>
                    <div className="flex items-start gap-3">
                      {getItemImage(entry.item) ? (
                        <img src={getItemImage(entry.item)} alt={entry.item.title} className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-black uppercase text-white/42">Item</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{entry.item.title}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <input
                            value={entry.ctaLabel}
                            onChange={(event) => updateSelectedProduct(entry.item.id, { ctaLabel: event.target.value })}
                            placeholder="CTA label"
                            className="h-11 rounded-[16px] border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none"
                          />
                          <select
                            value={entry.placement}
                            onChange={(event) => updateSelectedProduct(entry.item.id, { placement: event.target.value as SpotlightProductLink['placement'] })}
                            className="h-11 rounded-[16px] border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none"
                          >
                            {placementOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <label className="flex items-center justify-between rounded-[16px] border border-white/[0.08] bg-black/20 px-3 text-sm text-white">
                            <span>Primary</span>
                            <input type="radio" checked={entry.isPrimary} onChange={() => markPrimary(entry.item.id)} />
                          </label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeSelectedProduct(entry.item.id)} className="rounded-full bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/68">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {isSearchingProducts ? (
                  <div className={`${softClass} px-4 py-4 text-sm text-white/54`}>Searching products...</div>
                ) : null}

                {!isSearchingProducts && productResults.length > 0 ? productResults.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => upsertSelectedProduct(item)} className={`${softClass} flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.06]`}>
                    {getItemImage(item) ? (
                      <img src={getItemImage(item)} alt={item.title} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-black uppercase text-white/42">Item</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-white/42">{item.listingType} • {item.salePrice || item.rentalPrice || item.price || 0}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-black">Tag</span>
                  </button>
                )) : null}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className={`${panelClass} p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Preview</p>
              <div className="mt-4 overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/35">
                {previewSrc ? (
                  mediaFile?.type.startsWith('video/') ? (
                    <video src={previewSrc} poster={thumbnailPreview || undefined} controls className="max-h-[420px] w-full object-cover" />
                  ) : (
                    <img src={previewSrc} alt="Spotlight preview" className="max-h-[420px] w-full object-cover" />
                  )
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-white/38">
                    Add media or start typing to generate a text Spotlight preview.
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm text-white/62">
                <p>Status button decides whether this lands as a draft or a published Spotlight.</p>
                <p>Tagged-product attribution remains attached through item detail, cart, and purchase events.</p>
              </div>
            </section>

            <section className={`${panelClass} p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/38">Workflow links</p>
              <div className="mt-4 grid gap-2">
                <Link to="/spotlight/profile" className={`${softClass} px-4 py-3 text-sm font-semibold text-white/76`}>Profile timeline</Link>
                <Link to="/spotlight/saved" className={`${softClass} px-4 py-3 text-sm font-semibold text-white/76`}>Saved posts</Link>
                <Link to="/spotlight/notifications" className={`${softClass} px-4 py-3 text-sm font-semibold text-white/76`}>Notifications</Link>
                <Link to="/spotlight/messages" className={`${softClass} px-4 py-3 text-sm font-semibold text-white/76`}>Messages</Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </SpotlightNoirBlankSurface>
  );
};

export default CreateSpotlightPage;
