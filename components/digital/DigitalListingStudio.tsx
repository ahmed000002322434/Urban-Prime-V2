import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCategories } from '../../context/CategoryContext';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import digitalMarketplaceService, {
  type DigitalExperienceType,
  type DigitalListingSubmission
} from '../../services/digitalMarketplaceService';
import type { DigitalPackageScanReport, Item } from '../../types';
import Spinner from '../Spinner';
import BackButton from '../BackButton';

type Props = {
  defaultExperienceType: DigitalExperienceType;
};

type FormState = {
  experienceType: DigitalExperienceType;
  title: string;
  tagline: string;
  description: string;
  category: string;
  salePrice: string;
  version: string;
  licenseType: string;
  licenseDescription: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  trailerUrl: string;
  genres: string[];
  platforms: string[];
  modes: string[];
  tags: string[];
  existingImageUrls: string[];
  packageFile: File | null;
  packageAssetId: string | null;
  packageFileName: string;
};

const genreOptions = [
  'Action',
  'Adventure',
  'Arcade',
  'Horror',
  'Indie',
  'Multiplayer',
  'Narrative',
  'Open World',
  'Racing',
  'RPG',
  'Sandbox',
  'Simulation',
  'Sports',
  'Strategy'
];

const platformOptions = ['Windows', 'macOS', 'Linux', 'Web'];
const modeOptions = ['Single Player', 'Co-op', 'Online PvP', 'Offline'];
const licenseOptions = ['standard', 'extended', 'commercial'];

const createInitialState = (defaultExperienceType: DigitalExperienceType): FormState => ({
  experienceType: defaultExperienceType,
  title: '',
  tagline: '',
  description: '',
  category: defaultExperienceType === 'game' ? 'Games' : 'Software',
  salePrice: '',
  version: '1.0.0',
  licenseType: 'standard',
  licenseDescription: '',
  developer: '',
  publisher: '',
  releaseDate: '',
  trailerUrl: '',
  genres: defaultExperienceType === 'game' ? ['Indie'] : [],
  platforms: defaultExperienceType === 'game' ? ['Windows'] : [],
  modes: defaultExperienceType === 'game' ? ['Single Player'] : [],
  tags: [],
  existingImageUrls: [],
  packageFile: null,
  packageAssetId: null,
  packageFileName: ''
});

const fieldClass =
  'w-full rounded-[22px] border border-[#f1e5d1]/10 bg-[#0d1420]/92 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d8a36d] focus:ring-2 focus:ring-[#d8a36d]/15';
const textareaClass = `${fieldClass} min-h-[120px] resize-y`;
const studioPanelClass =
  'rounded-[30px] border border-[#ecdabf]/12 bg-[linear-gradient(180deg,#0b1220_0%,#09101a_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-6';
const metricCardClass =
  'rounded-[22px] border border-[#ecdabf]/10 bg-white/[0.04] p-4';

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-2 text-xs font-semibold transition ${
    active
      ? 'border-[#d8a36d] bg-[#d8a36d] text-[#10131b]'
      : 'border-[#f1e5d1]/12 bg-white/[0.04] text-white/70 hover:border-[#f1e5d1]/24 hover:text-white'
  }`;

const artPreviewStyle =
  'aspect-[16/10] overflow-hidden rounded-[24px] border border-[#ecdabf]/10 bg-[#101522]';

const renderBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const inferExperienceType = (item: Item, fallback: DigitalExperienceType): DigitalExperienceType => {
  if (item.gameDetails?.experienceType === 'game') return 'game';
  if (item.digitalDelivery?.experienceType === 'game') return 'game';
  if ((item.category || '').toLowerCase().includes('game')) return 'game';
  return fallback;
};

const toggleValue = (values: string[], next: string) =>
  values.includes(next) ? values.filter((value) => value !== next) : [...values, next];

const splitTags = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[,\n]/g)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const DigitalListingStudio: React.FC<Props> = ({ defaultExperienceType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { categories } = useCategories();

  const [form, setForm] = useState<FormState>(() => createInitialState(defaultExperienceType));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'draft' | 'published' | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [scanReport, setScanReport] = useState<DigitalPackageScanReport | null>(null);
  const [formMode, setFormMode] = useState<'new' | 'edit' | 'duplicate'>('new');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urlsToRevoke: string[] = [];
    const nextCover = coverFile ? URL.createObjectURL(coverFile) : form.existingImageUrls[0] || '';
    if (nextCover.startsWith('blob:')) urlsToRevoke.push(nextCover);

    const uploadedGallery = galleryFiles.map((file) => {
      const url = URL.createObjectURL(file);
      urlsToRevoke.push(url);
      return url;
    });

    setCoverPreviewUrl(nextCover);
    setGalleryPreviewUrls([...form.existingImageUrls.slice(1), ...uploadedGallery]);

    return () => {
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [coverFile, form.existingImageUrls, galleryFiles]);

  const digitalCategories = useMemo(() => {
    const root = categories.find((category) => category.id === 'digital-products');
    return root?.subcategories?.map((entry) => entry.name) || ['Software', 'Games', 'Design Templates', 'E-Books'];
  }, [categories]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    const duplicateId = params.get('duplicate');
    const sourceId = (editId || duplicateId || '').trim();
    if (!sourceId) {
      setFormMode('new');
      setEditingItemId(null);
      setForm(createInitialState(defaultExperienceType));
      setCoverFile(null);
      setGalleryFiles([]);
      setScanReport(null);
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      setIsHydrating(true);
      try {
        const item = await itemService.getItemById(sourceId);
        if (!item || cancelled) return;

        const experienceType = inferExperienceType(item, defaultExperienceType);
        const nextImages =
          item.galleryImageUrls?.length
            ? item.galleryImageUrls
            : item.imageUrls?.length
              ? item.imageUrls
              : item.images || [];

        setForm({
          experienceType,
          title: item.title || '',
          tagline: item.tagline || item.gameDetails?.tagline || '',
          description: item.description || '',
          category: item.category || (experienceType === 'game' ? 'Games' : 'Software'),
          salePrice: String(item.salePrice || item.price || ''),
          version: item.version || item.digitalDelivery?.packageVersion || '1.0.0',
          licenseType: item.licenseType || 'standard',
          licenseDescription: item.licenseDescription || '',
          developer: item.developer || item.gameDetails?.developer || '',
          publisher: item.publisher || item.gameDetails?.publisher || '',
          releaseDate: item.releaseDate || item.gameDetails?.releaseDate || '',
          trailerUrl: item.trailerUrl || item.gameDetails?.trailerUrl || '',
          genres: item.genres?.length ? item.genres : item.gameDetails?.genres || [],
          platforms:
            item.platforms?.length
              ? item.platforms
              : item.gameDetails?.platforms || item.digitalDelivery?.supportedPlatforms || [],
          modes: item.modes?.length ? item.modes : item.gameDetails?.modes || [],
          tags: item.tags?.length ? item.tags : item.gameDetails?.tags || [],
          existingImageUrls: nextImages,
          packageFile: null,
          packageAssetId:
            duplicateId && item.digitalDelivery?.packageAssetId
              ? item.digitalDelivery.packageAssetId
              : null,
          packageFileName: item.digitalDelivery?.packageFileName || ''
        });
        setScanReport(item.digitalDelivery?.scan || null);
        setFormMode(editId ? 'edit' : 'duplicate');
        setEditingItemId(editId ? item.id : null);
      } catch (error) {
        console.error('Digital listing hydrate failed:', error);
        showNotification('Unable to load listing data. Starting fresh.');
        setForm(createInitialState(defaultExperienceType));
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [defaultExperienceType, location.search, showNotification]);

  const handleChange =
    (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const submit = async (status: 'draft' | 'published') => {
    if (!form.title.trim() || !form.description.trim()) {
      showNotification('Title and description are required.');
      return;
    }
    if (!form.category.trim()) {
      showNotification('Choose a category for the listing.');
      return;
    }
    if (!form.packageFile && !form.packageFileName && !editingItemId && !form.packageAssetId) {
      showNotification('Upload a ZIP package before saving.');
      return;
    }
    if (status === 'published' && !form.salePrice) {
      showNotification('Set a sale price before publishing.');
      return;
    }

    const submission: DigitalListingSubmission = {
      listingId: editingItemId || undefined,
      status,
      experienceType: form.experienceType,
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      salePrice: Number(form.salePrice || 0),
      version: form.version.trim() || '1.0.0',
      licenseType: form.licenseType,
      licenseDescription: form.licenseDescription.trim(),
      developer: form.developer.trim(),
      publisher: form.publisher.trim(),
      releaseDate: form.releaseDate,
      trailerUrl: form.trailerUrl.trim(),
      genres: form.genres,
      platforms: form.platforms,
      modes: form.modes,
      tags: form.tags,
      existingImageUrls: form.existingImageUrls,
      coverFile,
      galleryFiles,
      packageFile: form.packageFile,
      reusePackageAssetId: form.packageAssetId
    };

    setSubmitIntent(status);
    setIsSubmitting(true);
    try {
      const result =
        formMode === 'edit' && editingItemId
          ? await digitalMarketplaceService.updateListing(submission)
          : await digitalMarketplaceService.createListing(submission);
      setScanReport(result.scan || null);
      showNotification(
        result.status === 'draft'
          ? 'Listing saved to drafts. Remove scan warnings or finish details before publishing.'
          : 'Digital listing published to the marketplace.'
      );
      navigate(result.status === 'published' ? `/item/${result.item.id}` : '/profile/game-studio');
    } catch (error) {
      console.error('Digital listing submission failed:', error);
      const message = error instanceof Error ? error.message : 'Unable to save listing.';
      showNotification(message);
    } finally {
      setIsSubmitting(false);
      setSubmitIntent(null);
    }
  };

  const title =
    formMode === 'edit'
      ? form.experienceType === 'game'
        ? 'Edit Game Build'
        : 'Edit Digital Product'
      : formMode === 'duplicate'
        ? 'Duplicate Listing'
        : form.experienceType === 'game'
          ? 'Publish a Game Build'
          : 'Publish a Digital Product';

  const packageLabel = form.packageFile ? form.packageFile.name : form.packageFileName || 'No ZIP attached yet';
  const packageDetail = form.packageFile
    ? renderBytes(form.packageFile.size)
    : form.packageAssetId
      ? 'Reusing the existing secure package'
      : editingItemId
        ? 'Keeping the current stored package'
        : 'ZIP required before publish';
  const listingModeLabel =
    formMode === 'edit'
      ? 'Editing live listing'
      : formMode === 'duplicate'
        ? 'Duplicating secure package'
        : 'New release';
  const previewChips = (form.genres.length ? form.genres : form.platforms).slice(0, 4);
  const visualAssetCount = (coverPreviewUrl ? 1 : 0) + galleryPreviewUrls.length;

  if (isHydrating) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-5 py-4 text-sm text-white">
          <Spinner size="sm" />
          Loading listing studio...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[36px] border border-[#ecdabf]/12 bg-[linear-gradient(140deg,#070b12_0%,#101826_52%,#0b1018_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(216,163,109,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(143,84,46,0.22),_transparent_24%)]" />
        <div className="relative mb-5">
          <BackButton to={form.experienceType === 'game' ? '/games' : '/digital-products'} alwaysShowText />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#e4d1b5]/56">
              {form.experienceType === 'game' ? 'Game Publishing Studio' : 'Digital Product Studio'}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[#fffaf1] md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 md:text-[15px]">
              Upload one secure ZIP, shape the listing for discovery, and decide when the release is strong enough to leave draft.
              Package scanning, private buyer delivery, and marketplace publishing stay in one flow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, experienceType: 'game', category: 'Games' }))}
                className={chipClass(form.experienceType === 'game')}
              >
                Game build
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    experienceType: 'digital',
                    category: current.category === 'Games' ? 'Software' : current.category
                  }))
                }
                className={chipClass(form.experienceType === 'digital')}
              >
                Digital product
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['ZIP-only delivery', 'Private buyer downloads', 'Scan-aware publishing'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#ecdabf]/14 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f5e6cf]/72"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0c1320]/82 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e4d1b5]/42">Release mode</p>
              <p className="mt-2 text-xl font-black text-[#fff8ed]">{listingModeLabel}</p>
              <p className="mt-2 text-xs leading-6 text-white/54">
                Drafts stay private. Publish only exposes the listing after the package clears the server checks.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0c1320]/82 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e4d1b5]/42">Secure package</p>
              <p className="mt-2 text-xl font-black text-[#fff8ed]">{packageLabel}</p>
              <p className="mt-2 text-xs leading-6 text-white/54">{packageDetail}</p>
            </div>
            <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0c1320]/82 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e4d1b5]/42">Visual set</p>
              <p className="mt-2 text-xl font-black text-[#fff8ed]">
                {visualAssetCount} asset{visualAssetCount === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-xs leading-6 text-white/54">
                Cover art and gallery media drive the marketplace card, detail page, and discovery shelves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {scanReport ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
            scanReport.status === 'clean'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
              : scanReport.status === 'warning'
                ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                : 'border-rose-500/25 bg-rose-500/10 text-rose-100'
          }`}
        >
          <p className="font-bold uppercase tracking-[0.18em]">Package scan: {scanReport.status}</p>
          <p className="mt-2">{scanReport.summary}</p>
          {scanReport.antivirusStatus ? (
            <p className="mt-2 text-xs opacity-85">
              Antivirus: {scanReport.antivirusStatus}
              {scanReport.antivirusSummary ? ` • ${scanReport.antivirusSummary}` : ''}
            </p>
          ) : null}
          {scanReport.blocked?.length ? (
            <p className="mt-2 text-xs opacity-85">{scanReport.blocked.join(' ')}</p>
          ) : null}
          {scanReport.warnings?.length ? (
            <p className="mt-2 text-xs opacity-85">{scanReport.warnings.join(' ')}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
        <section className="space-y-6">
          <div className={studioPanelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Step 1</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Package upload</h2>
              </div>
              <span className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f3e3c8]/62">
                ZIP only
              </span>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
              <label className="group flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-[30px] border border-dashed border-[#ecdabf]/16 bg-[linear-gradient(180deg,#0e1623_0%,#0b121d_100%)] px-6 text-center transition hover:border-[#d8a36d]/70 hover:bg-[#111b2a]">
                <div className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] p-4 text-[#f2e3ca] transition group-hover:scale-[1.02]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 3v12" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 21h14" />
                  </svg>
                </div>
                <p className="mt-5 text-lg font-black tracking-[-0.02em] text-[#fff8ed]">
                  {form.packageFile ? 'Replace current ZIP' : 'Select your release ZIP'}
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/56">
                  Upload the compressed build once, keep it private, and keep iterating on the storefront listing without
                  sending buyers broken files.
                </p>
                <div className="mt-5 rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f3e3c8]/68">
                  {packageLabel}
                </div>
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.name.toLowerCase().endsWith('.zip')) {
                      showNotification('Only ZIP packages are accepted.');
                      return;
                    }
                    if (file.size > 80 * 1024 * 1024) {
                      showNotification('ZIP packages are limited to 80MB.');
                      return;
                    }
                    setForm((current) => ({
                      ...current,
                      packageFile: file,
                      packageAssetId: null,
                      packageFileName: file.name
                    }));
                  }}
                />
              </label>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-[#ecdabf]/12 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Upload rules</p>
                  <div className="mt-4 grid gap-3">
                    {[
                      'Only .zip is accepted so buyer delivery stays predictable.',
                      'Nested archives, risky launchers, and suspicious compression patterns are blocked.',
                      'Save draft is allowed, but scan warnings keep the listing out of discovery.'
                    ].map((rule) => (
                      <div key={rule} className="rounded-[20px] border border-[#ecdabf]/10 bg-[#101828]/72 px-4 py-3 text-sm leading-6 text-white/68">
                        {rule}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0d1521]/86 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Current package</p>
                      <p className="mt-2 text-lg font-black text-[#fff8ed]">{packageLabel}</p>
                    </div>
                    <span className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f3e3c8]/60">
                      {form.packageFile ? 'New upload' : form.packageAssetId ? 'Reuse' : editingItemId ? 'Stored' : 'Required'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/58">
                    {form.packageFile ? `${form.packageFile.name} • ${renderBytes(form.packageFile.size)}` : packageDetail}
                  </p>
                  {(form.packageFile || form.packageFileName || form.packageAssetId) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          packageFile: null,
                          packageAssetId: null,
                          packageFileName: ''
                        }))
                      }
                      className="mt-4 rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/74 transition hover:border-[#ecdabf]/24 hover:text-white"
                    >
                      Clear package selection
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className={studioPanelClass}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Step 2</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Listing content</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                className={fieldClass}
                placeholder={form.experienceType === 'game' ? 'Game title' : 'Digital product title'}
                value={form.title}
                onChange={handleChange('title')}
              />
              <select className={fieldClass} value={form.category} onChange={handleChange('category')}>
                {(form.experienceType === 'game' ? ['Games'] : digitalCategories.filter((entry) => entry !== 'Games')).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input className={fieldClass} placeholder="Price" type="number" min="1" value={form.salePrice} onChange={handleChange('salePrice')} />
              <input className={fieldClass} placeholder="Version" value={form.version} onChange={handleChange('version')} />
              <select className={fieldClass} value={form.licenseType} onChange={handleChange('licenseType')}>
                {licenseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <input className={`${fieldClass} mt-4`} placeholder="Tagline / shelf copy" value={form.tagline} onChange={handleChange('tagline')} />
            <textarea
              className={`${textareaClass} mt-4`}
              placeholder="Describe the gameplay loop, the package contents, technical compatibility, and why this belongs in the marketplace."
              value={form.description}
              onChange={handleChange('description')}
            />
            <textarea
              className={`${textareaClass} mt-4 min-h-[96px]`}
              placeholder="License summary for buyers"
              value={form.licenseDescription}
              onChange={handleChange('licenseDescription')}
            />
          </div>

          <div className={studioPanelClass}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Step 3</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">
              {form.experienceType === 'game' ? 'Game profile' : 'Compatibility profile'}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className={fieldClass} placeholder="Developer" value={form.developer} onChange={handleChange('developer')} />
              <input className={fieldClass} placeholder="Publisher / Brand" value={form.publisher} onChange={handleChange('publisher')} />
              <input className={fieldClass} type="date" value={form.releaseDate} onChange={handleChange('releaseDate')} />
              <input className={fieldClass} placeholder="Trailer URL (optional)" value={form.trailerUrl} onChange={handleChange('trailerUrl')} />
            </div>

            {form.experienceType === 'game' ? (
              <>
                <div className="mt-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {genreOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={chipClass(form.genres.includes(option))}
                        onClick={() => setForm((current) => ({ ...current, genres: toggleValue(current.genres, option) }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={chipClass(form.platforms.includes(option))}
                        onClick={() => setForm((current) => ({ ...current, platforms: toggleValue(current.platforms, option) }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Modes</p>
                  <div className="flex flex-wrap gap-2">
                    {modeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={chipClass(form.modes.includes(option))}
                        onClick={() => setForm((current) => ({ ...current, modes: toggleValue(current.modes, option) }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Compatible platforms</p>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={chipClass(form.platforms.includes(option))}
                      onClick={() => setForm((current) => ({ ...current, platforms: toggleValue(current.platforms, option) }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Tags</p>
              <input
                className={fieldClass}
                placeholder="Comma-separated keywords"
                value={form.tags.join(', ')}
                onChange={(event) => setForm((current) => ({ ...current, tags: splitTags(event.target.value) }))}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div className={studioPanelClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Step 4</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Visual assets</h2>
              </div>
              <span className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f3e3c8]/60">
                {visualAssetCount} ready
              </span>
            </div>
            <div className="mt-5 space-y-5">
              <div className="rounded-[26px] border border-[#ecdabf]/12 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Cover image</p>
                  {coverFile ? (
                    <button
                      type="button"
                      onClick={() => setCoverFile(null)}
                      className="text-[11px] font-black uppercase tracking-[0.18em] text-white/54 transition hover:text-white"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className={artPreviewStyle}>
                  {coverPreviewUrl ? (
                    <img src={coverPreviewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/40">Upload cover art</div>
                  )}
                </div>
                <label className="mt-3 inline-flex cursor-pointer rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/72 transition hover:border-[#ecdabf]/24 hover:text-white">
                  Select cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setCoverFile(file);
                    }}
                  />
                </label>
              </div>

              <div className="rounded-[26px] border border-[#ecdabf]/12 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Gallery</p>
                  {galleryFiles.length ? (
                    <button
                      type="button"
                      onClick={() => setGalleryFiles([])}
                      className="text-[11px] font-black uppercase tracking-[0.18em] text-white/54 transition hover:text-white"
                    >
                      Remove new files
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {galleryPreviewUrls.length > 0 ? (
                    galleryPreviewUrls.map((url) => (
                      <div key={url} className="aspect-[4/3] overflow-hidden rounded-[22px] border border-[#ecdabf]/10 bg-[#101522]">
                        <img src={url} alt="Gallery preview" className="h-full w-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 rounded-[22px] border border-dashed border-[#ecdabf]/12 px-4 py-8 text-center text-sm text-white/40">
                      Add marketplace art, screenshots, or package mockups.
                    </div>
                  )}
                </div>
                <label className="mt-3 inline-flex cursor-pointer rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/72 transition hover:border-[#ecdabf]/24 hover:text-white">
                  Add gallery
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      if (!files.length) return;
                      setGalleryFiles((current) => [...current, ...files]);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={studioPanelClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Live preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Marketplace card</h2>
              </div>
              <span className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f3e3c8]/60">
                {form.salePrice ? `$${Number(form.salePrice).toFixed(2)}` : 'Set price'}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]">
              <div className="aspect-[16/10] bg-[#121826]">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt={form.title || 'Preview'} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                    {form.category || (form.experienceType === 'game' ? 'Games' : 'Digital')}
                  </span>
                  <span className="text-lg font-black text-[#ffcf9e]">
                    {form.salePrice ? `$${Number(form.salePrice).toFixed(2)}` : 'Set price'}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.03em]">{form.title || 'Your listing title'}</h3>
                  <p className="mt-2 text-sm text-white/58">{form.tagline || 'Shelf-ready copy appears here.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewChips.map((entry) => (
                    <span key={entry} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/65">
                      {entry}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-6 text-white/66">
                  {form.description ||
                    'Your marketplace description will render here so you can judge pacing and density before publishing.'}
                </p>
              </div>
            </div>
          </div>

          <div className={studioPanelClass}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Step 5</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Draft or publish</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className={metricCardClass}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/40">Package</p>
                <p className="mt-2 text-sm font-bold text-white">{form.packageFile || form.packageFileName ? 'Attached' : 'Missing'}</p>
              </div>
              <div className={metricCardClass}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/40">Copy</p>
                <p className="mt-2 text-sm font-bold text-white">
                  {form.title.trim() && form.description.trim() ? 'Ready' : 'Needs work'}
                </p>
              </div>
              <div className={metricCardClass}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/40">Price</p>
                <p className="mt-2 text-sm font-bold text-white">{form.salePrice ? 'Set' : 'Required for publish'}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submit('draft')}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-[#ecdabf]/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitIntent === 'draft' && isSubmitting ? <Spinner size="sm" /> : null}
                {submitIntent === 'draft' && isSubmitting ? 'Saving draft...' : 'Save draft'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submit('published')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#d89a61,#ffb572)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitIntent === 'published' && isSubmitting ? <Spinner size="sm" /> : null}
                {submitIntent === 'published' && isSubmitting ? 'Publishing...' : 'Publish to marketplace'}
              </button>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/48">
              Drafts stay private while you fix packaging or copy. Buyers only see published entries, and scan warnings push
              the listing back out of discovery automatically.
            </p>
            {editingItemId ? (
              <p className="mt-2 text-xs leading-6 text-white/42">
                Existing secure package delivery is preserved unless you upload a replacement ZIP.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DigitalListingStudio;
