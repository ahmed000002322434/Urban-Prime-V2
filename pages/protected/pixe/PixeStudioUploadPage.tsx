import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PixeInlineSkeleton } from '../../../components/pixe/PixeSkeleton';
import PixeStudioGlyph from '../../../components/pixe/PixeStudioGlyph';
import { itemService, serviceService } from '../../../services/itemService';
import {
  PIXE_MAX_DURATION_MS,
  PIXE_MAX_FILE_BYTES,
  pixeService,
  type PixeVideo
} from '../../../services/pixeService';
import type { Item, Service } from '../../../types';
import { loadPixeStudioPreferences } from '../../../utils/pixeStudioPreferences';

const PIXE_HARD_MIN_ASPECT_RATIO = 1 / 2;
const PIXE_HARD_MAX_ASPECT_RATIO = 1;
const PIXE_IDEAL_MIN_ASPECT_RATIO = 9 / 16;
const PIXE_IDEAL_MAX_ASPECT_RATIO = 4 / 5;
const PIXE_IDEAL_MAX_WIDTH = 1080;
const PIXE_IDEAL_MAX_HEIGHT = 1920;
const PIXE_HARD_MAX_WIDTH = 2160;
const PIXE_HARD_MAX_HEIGHT = 3840;

type UploadStep = 'upload' | 'details' | 'elements' | 'checks' | 'visibility';

type InspectedVideo = {
  durationMs: number;
  rawWidth: number;
  rawHeight: number;
  uploadWidth: number;
  uploadHeight: number;
  portraitAspectRatio: number;
  looksRotated: boolean;
  previewUrl: string;
};

type ThumbnailChoice = {
  id: string;
  timeMs: number;
  label: string;
  url: string;
};

type ProductDraft = {
  item_id: string | null;
  image_url: string | null;
  source: 'manual' | 'product' | 'service';
  title: string;
  href: string;
  cta_label: string;
  price_amount: string;
  currency: string;
};

type MarketplaceMode = 'all' | 'products' | 'services';

type MarketplaceEntry = {
  id: string;
  kind: 'product' | 'service';
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  priceAmount: string;
  priceLabel: string;
  currency: string;
  ctaLabel: string;
};

type RightsSignal = {
  level: 'low' | 'medium' | 'high';
  title: string;
  body: string;
};

const uploadSteps: Array<{ key: UploadStep; label: string; icon: 'upload' | 'edit' | 'content' | 'analytics' | 'settings' }> = [
  { key: 'upload', label: 'Upload video', icon: 'upload' },
  { key: 'details', label: 'Details', icon: 'edit' },
  { key: 'elements', label: 'Video Elements', icon: 'content' },
  { key: 'checks', label: 'Checks', icon: 'analytics' },
  { key: 'visibility', label: 'Visibility', icon: 'settings' }
];

const initialProduct = (): ProductDraft => ({
  item_id: null,
  image_url: null,
  source: 'manual',
  title: '',
  href: '',
  cta_label: 'Shop',
  price_amount: '',
  currency: 'USD'
});

const normalizeUploadGeometry = (width: number, height: number) => {
  const uploadWidth = Math.min(width, height);
  const uploadHeight = Math.max(width, height);
  return {
    uploadWidth,
    uploadHeight,
    portraitAspectRatio: uploadWidth / Math.max(uploadHeight, 1),
    looksRotated: width > height
  };
};

const inspectVideoFile = async (file: File) =>
  new Promise<InspectedVideo>((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = previewUrl;
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const rawWidth = Math.round(video.videoWidth || 0);
      const rawHeight = Math.round(video.videoHeight || 0);
      const normalized = normalizeUploadGeometry(rawWidth, rawHeight);
      resolve({
        durationMs: Math.round(video.duration * 1000),
        rawWidth,
        rawHeight,
        ...normalized,
        previewUrl
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error('Unable to inspect video metadata.'));
    };
  });

const validateInspectedVideo = (file: File, metadata: InspectedVideo) => {
  if (file.size > PIXE_MAX_FILE_BYTES) {
    return 'Video files must be 150MB or smaller.';
  }
  if (metadata.durationMs > PIXE_MAX_DURATION_MS) {
    return 'Videos must be 60 seconds or shorter.';
  }
  if (metadata.uploadWidth > PIXE_HARD_MAX_WIDTH || metadata.uploadHeight > PIXE_HARD_MAX_HEIGHT) {
    return 'Videos must stay within 2160x3840 for upload.';
  }
  if (metadata.portraitAspectRatio < PIXE_HARD_MIN_ASPECT_RATIO || metadata.portraitAspectRatio > PIXE_HARD_MAX_ASPECT_RATIO) {
    return `Detected aspect ratio is ${metadata.uploadWidth}:${metadata.uploadHeight}. Pixe accepts portrait or square uploads up to 1:1.`;
  }
  return null;
};

const getInspectedVideoWarning = (metadata: InspectedVideo | null) => {
  if (!metadata) return '';
  if (metadata.uploadWidth > PIXE_IDEAL_MAX_WIDTH || metadata.uploadHeight > PIXE_IDEAL_MAX_HEIGHT) {
    return 'Accepted, but 1080x1920 or lower will move through review faster.';
  }
  if (
    metadata.portraitAspectRatio < PIXE_IDEAL_MIN_ASPECT_RATIO
    || metadata.portraitAspectRatio > PIXE_IDEAL_MAX_ASPECT_RATIO
  ) {
    return 'Accepted, but clips between 9:16 and 4:5 usually fit fullscreen best.';
  }
  return '';
};

const formatValidationDimensions = (metadata: InspectedVideo | null) => {
  if (!metadata) return 'Waiting for file';
  const raw = `${metadata.rawWidth}x${metadata.rawHeight}`;
  const normalized = `${metadata.uploadWidth}x${metadata.uploadHeight}`;
  return `${Math.round(metadata.durationMs / 1000)}s . ${raw}${raw === normalized ? '' : ` -> ${normalized}`}`;
};

const getItemPrice = (item: Item) => item.salePrice || item.rentalPrice || item.price || 0;

const getServicePricing = (service: Service) => {
  const primary = service.pricingModels?.[0];
  const amount = Number(primary?.price || 0);
  const currency = String(primary?.currency || service.currency || 'USD').trim() || 'USD';
  return {
    amount,
    amountString: amount > 0 ? amount.toFixed(2) : '',
    currency,
    label: amount > 0 ? `${currency} ${amount.toFixed(2)}` : 'Custom pricing'
  };
};

const buildMarketplaceEntries = (items: Item[], services: Service[]) => {
  const products: MarketplaceEntry[] = items.map((item) => {
    const price = getItemPrice(item);
    return {
      id: item.id,
      kind: 'product',
      title: item.title,
      subtitle: item.brand || item.category || 'Marketplace product',
      href: `/item/${encodeURIComponent(item.id)}`,
      imageUrl: item.imageUrls?.[0] || item.images?.[0] || null,
      priceAmount: price > 0 ? price.toFixed(2) : '',
      priceLabel: price > 0 ? `${item.currency || 'USD'} ${price.toFixed(2)}` : 'View product',
      currency: item.currency || 'USD',
      ctaLabel: 'Shop'
    };
  });

  const serviceEntries: MarketplaceEntry[] = services.map((service) => {
    const pricing = getServicePricing(service);
    return {
      id: service.id,
      kind: 'service',
      title: service.title,
      subtitle: service.provider?.name || service.category || 'Marketplace service',
      href: `/service/${encodeURIComponent(service.id)}`,
      imageUrl: service.imageUrls?.[0] || null,
      priceAmount: pricing.amountString,
      priceLabel: pricing.label,
      currency: pricing.currency,
      ctaLabel: 'Book'
    };
  });

  return { products, services: serviceEntries };
};

const buildRightsSignals = (title: string, caption: string, hashtags: string, fileName: string) => {
  const source = `${title} ${caption} ${hashtags} ${fileName}`.toLowerCase();
  const signals: RightsSignal[] = [];

  if (/(official music video|lyrics|full movie|movie clip|episode|trailer|netflix|disney|warner|universal|sony)/.test(source)) {
    signals.push({
      level: 'high',
      title: 'Possible copyrighted source',
      body: 'The title, caption, tags, or filename mention label, studio, trailer, or music-video language that usually needs rights clearance.'
    });
  }

  if (/(cover|remix|reupload|screen record|screenrecord|fan edit|downloaded)/.test(source)) {
    signals.push({
      level: 'medium',
      title: 'Derivative-content wording',
      body: 'This clip reads like reused or re-edited media. Review the audio and source material before publishing.'
    });
  }

  if (signals.length === 0) {
    signals.push({
      level: 'low',
      title: 'No obvious match found',
      body: 'Pixe did not flag common risky wording. This is a first-pass review, not a fingerprint match.'
    });
  }

  return signals;
};

const buildMuxThumbnailUrl = (playbackId: string, timeMs: number) =>
  `https://image.mux.com/${playbackId}/thumbnail.webp?fit_mode=preserve&width=720&time=${Math.max(timeMs / 1000, 0.15).toFixed(2)}`;

const serializeProductTags = (products: ProductDraft[]) =>
  products
    .filter((product) => product.title.trim() || product.href.trim())
    .map((product) => ({
      item_id: product.item_id || null,
      image_url: product.image_url || null,
      title: product.title.trim(),
      href: product.href.trim(),
      cta_label: product.cta_label.trim() || 'Shop',
      price_amount: Number(product.price_amount || 0),
      currency: product.currency.trim() || 'USD'
    }));

const captureThumbnailChoices = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = objectUrl;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Unable to build thumbnail previews.'));
    });

    const duration = Math.max(Number(video.duration || 0), 0.5);
    const rawTimes = [0.08, 0.25, 0.45, 0.65, 0.85].map((ratio) =>
      Number(Math.min(Math.max(duration * ratio, 0.1), Math.max(duration - 0.1, 0.1)).toFixed(2))
    );
    const times = Array.from(new Set(rawTimes));
    const aspect = Math.max((video.videoWidth || 1080) / Math.max(video.videoHeight || 1920, 1), 0.4);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = Math.round(canvas.width / aspect);
    const context = canvas.getContext('2d');
    if (!context) return [];

    const captureAt = async (second: number) => {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.onseeked = null;
          video.onerror = null;
        };
        video.onseeked = () => {
          cleanup();
          resolve();
        };
        video.onerror = () => {
          cleanup();
          reject(new Error('Unable to seek video for thumbnails.'));
        };
        video.currentTime = second;
      });

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return {
        id: `${Math.round(second * 1000)}`,
        timeMs: Math.round(second * 1000),
        label: `${Math.floor(second)}s`,
        url: canvas.toDataURL('image/jpeg', 0.82)
      } as ThumbnailChoice;
    };

    const results: ThumbnailChoice[] = [];
    for (const time of times) {
      results.push(await captureAt(time));
    }
    return results;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const UploadProgressPill: React.FC<{
  stage: 'idle' | 'preparing' | 'uploading' | 'processing' | 'ready' | 'published' | 'failed';
  progress: number;
}> = ({ stage, progress }) => {
  if (stage === 'idle' && progress <= 0) return null;

  const tone = stage === 'failed'
    ? 'border-rose-500/25 bg-rose-500/10 text-rose-100'
    : stage === 'ready' || stage === 'published'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
      : 'border-amber-500/25 bg-amber-500/10 text-amber-100';
  const fillTone = stage === 'failed'
    ? 'bg-rose-300'
    : stage === 'ready' || stage === 'published'
      ? 'bg-emerald-300'
      : 'bg-amber-300';
  const label = stage === 'uploading'
    ? `Uploading ${progress}%`
    : stage === 'processing'
      ? 'Processing clip'
      : stage === 'preparing'
        ? 'Preparing upload'
        : stage === 'ready'
          ? 'Ready to publish'
          : stage === 'published'
            ? 'Published'
            : 'Upload needs review';
  const width = stage === 'ready' || stage === 'published'
    ? 100
    : stage === 'processing'
      ? 100
      : stage === 'preparing'
        ? Math.max(progress, 12)
        : stage === 'failed'
          ? Math.max(Math.min(progress, 100), 8)
          : progress;

  return (
    <div className={`inline-flex min-h-[3.1rem] items-center gap-3 rounded-full border px-4 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] ${tone}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {stage === 'preparing' || stage === 'uploading' || stage === 'processing' ? (
          <span className={`absolute inset-0 rounded-full ${fillTone} animate-ping opacity-45`} />
        ) : null}
        <span className={`relative h-2.5 w-2.5 rounded-full ${fillTone}`} />
      </span>
      <span className="whitespace-nowrap text-sm font-semibold">{label}</span>
      <span className="relative h-2 w-20 overflow-hidden rounded-full bg-white/10">
        <span className={`absolute inset-y-0 left-0 rounded-full ${fillTone}`} style={{ width: `${Math.max(0, Math.min(width, 100))}%` }} />
      </span>
    </div>
  );
};

const uploadModalCardClassName = 'overflow-hidden rounded-[24px] border border-white/10 bg-[#101010]/98 backdrop-blur-xl shadow-[0_44px_140px_rgba(0,0,0,0.58)]';
const uploadSectionCardClassName = 'rounded-[22px] border border-white/[0.08] bg-[#171717] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]';
const uploadFieldClassName = 'w-full rounded-[4px] border border-white/10 bg-[#0f0f0f] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#FF0000]/70 focus:ring-2 focus:ring-[#FF0000]/15';
const uploadTextAreaClassName = 'w-full rounded-[4px] border border-white/10 bg-[#0f0f0f] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#FF0000]/70 focus:ring-2 focus:ring-[#FF0000]/15';

const UploadStepIndicator: React.FC<{
  step: { key: UploadStep; label: string; icon: 'upload' | 'edit' | 'content' | 'analytics' | 'settings' };
  index: number;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}> = ({ step, index, active, complete, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex min-w-0 flex-col items-start gap-2 text-left transition"
  >
    <span className={`block truncate text-sm font-semibold ${
      active ? 'text-white' : complete ? 'text-white/78' : 'text-white/44'
    }`}>
      {step.label}
    </span>
    <span className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
      active
        ? 'border-[#FF0000] bg-[#101010] shadow-[0_0_0_4px_rgba(255,0,0,0.14)]'
        : complete
          ? 'border-white/80 bg-white'
          : 'border-white/30 bg-[#101010]'
    }`}>
      {complete && !active ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none text-black" stroke="currentColor" strokeWidth="2.4">
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      ) : (
        <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[#FF0000]' : complete ? 'bg-black' : 'bg-white/18'}`} />
      )}
    </span>
    <span className="sr-only">{`Step ${index + 1}`}</span>
  </button>
);

const UploadPreviewSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="rounded-[8px] border border-white/8 bg-white/[0.05] p-3">
      <div className="aspect-[9/16] rounded-[4px] bg-white/[0.06]" />
      <div className="mt-3 h-3.5 w-24 rounded bg-white/[0.07]" />
      <div className="mt-2 h-3 w-40 rounded bg-white/[0.05]" />
    </div>
  </div>
);

const UploadStatusTicker: React.FC<{
  stage: 'idle' | 'preparing' | 'uploading' | 'processing' | 'ready' | 'published' | 'failed';
  progress: number;
  hasFile: boolean;
}> = ({ stage, progress, hasFile }) => {
  const message = stage === 'uploading'
    ? `Uploading ${progress}%`
    : stage === 'processing'
      ? 'Processing'
      : stage === 'preparing'
        ? 'Preparing'
        : stage === 'ready'
          ? 'Ready'
          : stage === 'published'
            ? 'Published'
            : stage === 'failed'
              ? 'Needs attention'
              : hasFile
                ? 'File selected'
                : 'Select a file';

  const tone = stage === 'failed'
    ? 'text-rose-100 bg-rose-500/10 border-rose-500/25'
    : stage === 'ready' || stage === 'published'
      ? 'text-emerald-100 bg-emerald-500/10 border-emerald-500/25'
      : 'text-white/82 bg-white/[0.04] border-white/10';

  return (
    <div className={`flex items-center gap-3 rounded-[4px] border px-3 py-2 text-sm ${tone}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${
        stage === 'failed'
          ? 'bg-rose-300'
          : stage === 'ready' || stage === 'published'
            ? 'bg-emerald-300'
            : 'bg-[#FF0000]'
      }`} />
      <span className="font-medium">{message}</span>
    </div>
  );
};

const PixeStudioUploadPage: React.FC = () => {
  const [studioDefaults] = useState(() => loadPixeStudioPreferences());
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(() => studioDefaults.defaultVisibility);
  const [allowComments, setAllowComments] = useState(() => studioDefaults.defaultAllowComments);
  const [hashtags, setHashtags] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [products, setProducts] = useState<ProductDraft[]>([initialProduct()]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inspected, setInspected] = useState<InspectedVideo | null>(null);
  const [thumbnailChoices, setThumbnailChoices] = useState<ThumbnailChoice[]>([]);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [selectedThumbnailId, setSelectedThumbnailId] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [stage, setStage] = useState<'idle' | 'preparing' | 'uploading' | 'processing' | 'ready' | 'published' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [video, setVideo] = useState<PixeVideo | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState<MarketplaceMode>('all');
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState('');
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceEntry[]>([]);
  const [marketplaceServices, setMarketplaceServices] = useState<MarketplaceEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadAutoAdvance, setUploadAutoAdvance] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const thumbnailPatchedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftLockRef = useRef(false);
  const submitLockRef = useRef(false);
  const uploadAdvanceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      if (uploadAdvanceTimeoutRef.current) window.clearTimeout(uploadAdvanceTimeoutRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const normalizedHashtags = useMemo(
    () => hashtags.split(/[,\s]+/g).map((entry) => entry.trim()).filter(Boolean),
    [hashtags]
  );

  const validationError = useMemo(
    () => (selectedFile && inspected ? validateInspectedVideo(selectedFile, inspected) : ''),
    [inspected, selectedFile]
  );
  const validationWarning = useMemo(() => getInspectedVideoWarning(inspected), [inspected]);
  const rightsSignals = useMemo(
    () => buildRightsSignals(title, caption, hashtags, selectedFile?.name || ''),
    [caption, hashtags, selectedFile?.name, title]
  );
  const selectedThumbnail = useMemo(
    () => thumbnailChoices.find((choice) => choice.id === selectedThumbnailId) || null,
    [selectedThumbnailId, thumbnailChoices]
  );
  const linkedCount = useMemo(
    () => products.filter((product) => product.title.trim() || product.href.trim()).length,
    [products]
  );

  const validationTone: 'default' | 'success' | 'warning' | 'danger' = !selectedFile || !inspected
    ? 'default'
    : validationError
      ? 'danger'
      : validationWarning || inspected.looksRotated
        ? 'warning'
        : 'success';

  const validationHint = !selectedFile || !inspected
    ? 'Max 60s, 150MB, portrait or square, with 9:16 to 4:5 recommended for the best fullscreen fit.'
    : validationError
      ? validationError
      : validationWarning
        ? validationWarning
        : inspected.looksRotated
          ? 'Rotation metadata detected. Upload will continue using portrait-safe dimensions.'
          : 'Ready to upload. Duration, size, resolution, and screen fit all pass.';

  const stageSummary = useMemo(() => {
    if (stage === 'uploading') return `Uploading ${progress}%`;
    if (stage === 'processing') return 'Preparing preview';
    if (stage === 'ready') return 'Ready to publish';
    if (stage === 'published') return 'Published';
    if (stage === 'failed') return 'Needs review';
    if (stage === 'preparing') return 'Preparing';
    if (video?.status === 'draft') return 'Draft saved';
    return 'Waiting for file';
  }, [progress, stage, video?.status]);

  const filteredMarketplaceEntries = useMemo(() => {
    const query = marketplaceQuery.trim().toLowerCase();
    const combined = [
      ...(marketplaceMode === 'all' || marketplaceMode === 'products' ? marketplaceProducts : []),
      ...(marketplaceMode === 'all' || marketplaceMode === 'services' ? marketplaceServices : [])
    ];

    if (!query) return combined.slice(0, 24);
    return combined
      .filter((entry) => entry.title.toLowerCase().includes(query) || entry.subtitle.toLowerCase().includes(query))
      .slice(0, 24);
  }, [marketplaceMode, marketplaceProducts, marketplaceQuery, marketplaceServices]);

  const stepIndex = uploadSteps.findIndex((step) => step.key === currentStep);
  const currentStepNumber = Math.max(stepIndex + 1, 1);
  const canGoBack = stepIndex > 0;
  const detailsReady = Boolean(title.trim());
  const canGoNext = currentStep === 'upload'
    ? Boolean(selectedFile) && !validationError
    : currentStep === 'details'
      ? detailsReady
    : currentStep === 'checks'
      ? Boolean(video && (video.status === 'ready' || video.status === 'published'))
      : currentStep !== 'visibility';
  const uploadInFlight = savingDraft || stage === 'preparing' || stage === 'uploading' || stage === 'processing';
  const hasUploadedMedia = Boolean(video?.playback_id || video?.manifest_url || ['uploading', 'processing', 'ready', 'published'].includes(video?.status || ''));
  const uploadReady = Boolean(selectedFile) && !validationError && rightsConfirmed;
  const canStartUpload = uploadReady && !uploadInFlight && (!hasUploadedMedia || video?.status === 'failed');
  const canPublishNow = Boolean(video?.id) && stage === 'ready' && !publishing;
  const displayTitle = title.trim() || selectedFile?.name || video?.title || 'Untitled clip';
  const displayCaption = caption.trim() || 'Add a description so viewers know what this clip is about.';
  const fileMetaLine = selectedFile
    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB . ${formatValidationDimensions(inspected)}`
    : 'Select a video to start the upload flow.';
  const rightsClear = rightsSignals.every((signal) => signal.level === 'low');
  const detailsStepError = !detailsReady ? 'Add a title to continue.' : '';

  const navigateToStep = (targetStep: UploadStep) => {
    const targetIndex = uploadSteps.findIndex((step) => step.key === targetStep);
    if (targetIndex <= stepIndex) {
      setError('');
      setCurrentStep(targetStep);
      return;
    }

    if (!selectedFile || validationError) {
      setError(validationError || 'Select a video first.');
      setCurrentStep('upload');
      return;
    }

    if ((targetStep === 'elements' || targetStep === 'checks' || targetStep === 'visibility') && !detailsReady) {
      setError('Add a title before moving to the next step.');
      setCurrentStep('details');
      return;
    }

    if (targetStep === 'visibility' && !(video && (video.status === 'ready' || video.status === 'published'))) {
      setError('Finish upload checks first.');
      setCurrentStep('checks');
      return;
    }

    setError('');
    setCurrentStep(targetStep);
  };

  const clearSelectedFile = () => {
    if (uploadAdvanceTimeoutRef.current) {
      window.clearTimeout(uploadAdvanceTimeoutRef.current);
      uploadAdvanceTimeoutRef.current = null;
    }
    setUploadAutoAdvance(false);
    setSelectedFile(null);
    setInspected(null);
    setStage('idle');
    setProgress(0);
    setThumbnailChoices([]);
    setSelectedThumbnailId('');
    setError('');
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectedFile = async (file: File | null) => {
    if (uploadAdvanceTimeoutRef.current) {
      window.clearTimeout(uploadAdvanceTimeoutRef.current);
      uploadAdvanceTimeoutRef.current = null;
    }
    setUploadAutoAdvance(false);
    setSelectedFile(file);
    setProgress(0);
    setInspected(null);
    setStage(file ? 'preparing' : 'idle');
    setError('');
    thumbnailPatchedRef.current = false;
    setThumbnailChoices([]);
    setSelectedThumbnailId('');
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (!file) return;

    try {
      const metadata = await inspectVideoFile(file);
      const nextValidationError = validateInspectedVideo(file, metadata);
      setInspected(metadata);
      setPreviewUrl(metadata.previewUrl);
      setThumbnailLoading(true);
      const choices = await captureThumbnailChoices(file);
      setThumbnailChoices(choices);
      setSelectedThumbnailId(choices[0]?.id || '');
      setStage('idle');
      if (!nextValidationError && currentStep === 'upload') {
        setUploadAutoAdvance(true);
        uploadAdvanceTimeoutRef.current = window.setTimeout(() => {
          setUploadAutoAdvance(false);
          setError('');
          setCurrentStep('details');
          uploadAdvanceTimeoutRef.current = null;
        }, 700);
      }
    } catch (metadataError: any) {
      setError(metadataError?.message || 'Unable to inspect video.');
      setUploadAutoAdvance(false);
      setStage('failed');
    } finally {
      setThumbnailLoading(false);
    }
  };

  const resetComposer = () => {
    if (uploadAdvanceTimeoutRef.current) {
      window.clearTimeout(uploadAdvanceTimeoutRef.current);
      uploadAdvanceTimeoutRef.current = null;
    }
    setUploadAutoAdvance(false);
    setCurrentStep('upload');
    setTitle('');
    setCaption('');
    setVisibility(studioDefaults.defaultVisibility);
    setAllowComments(studioDefaults.defaultAllowComments);
    setHashtags('');
    setScheduleAt('');
    setProducts([initialProduct()]);
    clearSelectedFile();
    setThumbnailLoading(false);
    setRightsConfirmed(false);
    setStage('idle');
    setProgress(0);
    setError('');
    setVideo(null);
    thumbnailPatchedRef.current = false;
  };

  const updateProduct = (index: number, patch: Partial<ProductDraft>) => {
    setProducts((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  const removeProduct = (index: number) => {
    setProducts((current) => {
      const next = current.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [initialProduct()];
    });
  };

  const appendManualProduct = () => {
    setProducts((current) => [...current, initialProduct()]);
  };

  const insertMarketplaceDraft = (draft: ProductDraft) => {
    setProducts((current) => {
      const firstEmptyIndex = current.findIndex((entry) => !entry.title.trim() && !entry.href.trim());
      if (firstEmptyIndex === -1) return [...current, draft];
      return current.map((entry, entryIndex) => (entryIndex === firstEmptyIndex ? draft : entry));
    });
    setMarketplaceOpen(false);
    setMarketplaceQuery('');
  };

  const loadMarketplaceCatalog = async () => {
    if (marketplaceLoading || marketplaceProducts.length > 0 || marketplaceServices.length > 0) {
      setMarketplaceOpen(true);
      return;
    }

    try {
      setMarketplaceLoading(true);
      setMarketplaceError('');
      setMarketplaceOpen(true);
      const [itemPayload, servicePayload] = await Promise.all([
        itemService.getItems({ status: 'published', includeArchived: false }, { page: 1, limit: 24 }),
        serviceService.getServices()
      ]);
      const items = Array.isArray((itemPayload as any)?.items)
        ? (itemPayload as any).items
        : Array.isArray(itemPayload)
          ? itemPayload
          : [];
      const services = Array.isArray(servicePayload) ? servicePayload : [];
      const catalog = buildMarketplaceEntries(items, services.slice(0, 24));
      setMarketplaceProducts(catalog.products);
      setMarketplaceServices(catalog.services);
    } catch (catalogError: any) {
      console.error('Unable to load marketplace catalog:', catalogError);
      setMarketplaceError(catalogError?.message || 'Unable to load marketplace right now.');
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const applySelectedThumbnailIfReady = async (nextVideo: PixeVideo) => {
    if (!selectedThumbnail || !nextVideo.playback_id || thumbnailPatchedRef.current) return nextVideo;
    thumbnailPatchedRef.current = true;
    try {
      const updated = await pixeService.updateVideo(nextVideo.id, {
        thumbnail_url: buildMuxThumbnailUrl(nextVideo.playback_id, selectedThumbnail.timeMs)
      });
      return updated;
    } catch (thumbnailError) {
      console.error('Unable to apply selected thumbnail:', thumbnailError);
      return nextVideo;
    }
  };

  const persistDraft = async () => {
    const basePayload = {
      title,
      caption,
      visibility,
      allow_comments: allowComments,
      scheduled_for: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      hashtags: normalizedHashtags,
      product_tags: serializeProductTags(products),
      thumbnail_url: selectedThumbnail?.url || video?.thumbnail_url || null
    };

    const nextVideo = video?.id
      ? await pixeService.updateVideo(video.id, basePayload)
      : await pixeService.createDraft(basePayload);

    setVideo(nextVideo);
    return nextVideo;
  };

  const saveDraft = async () => {
    if (draftLockRef.current) return;
    try {
      draftLockRef.current = true;
      setSavingDraft(true);
      setError('');
      const nextVideo = await persistDraft();
      setVideo(nextVideo);
      setStage(nextVideo.status === 'failed' ? 'failed' : 'idle');
    } catch (draftError: any) {
      console.error('Unable to save Pixe draft:', draftError);
      setError(draftError?.message || 'Unable to save draft.');
    } finally {
      draftLockRef.current = false;
      setSavingDraft(false);
    }
  };

  const startPolling = (videoId: string) => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    const poll = async () => {
      try {
        const next = await pixeService.getVideo(videoId);
        let hydrated = next;
        if (next.status === 'ready' || next.status === 'published') {
          hydrated = await applySelectedThumbnailIfReady(next);
          setVideo(hydrated);
          setStage(hydrated.status);
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          return;
        }
        if (next.status === 'failed') {
          setStage('failed');
          setError(next.processing_error || 'Video processing failed.');
          if (pollingRef.current) window.clearInterval(pollingRef.current);
        } else {
          setVideo(next);
          setStage('processing');
        }
      } catch (nextError) {
        console.error('Unable to poll Pixe upload:', nextError);
      }
    };
    void poll();
    pollingRef.current = window.setInterval(() => {
      void poll();
    }, 3500);
  };

  const submitUpload = async () => {
    if (submitLockRef.current || uploadInFlight) return;
    if (!selectedFile) {
      setError('Select a video file first.');
      return;
    }
    if (hasUploadedMedia && video?.status !== 'failed') {
      setError('This draft already has uploaded media attached.');
      return;
    }
    if (!rightsConfirmed) {
      setError('Confirm rights clearance before upload.');
      return;
    }

    try {
      submitLockRef.current = true;
      setError('');
      setStage('preparing');
      setProgress(0);
      thumbnailPatchedRef.current = false;

      const metadata = inspected || await inspectVideoFile(selectedFile);
      setInspected(metadata);

      const nextValidationError = validateInspectedVideo(selectedFile, metadata);
      if (nextValidationError) {
        throw new Error(nextValidationError);
      }

      const draft = await persistDraft();
      setVideo(draft);

      const session = await pixeService.createUploadSession({
        video_id: draft.id,
        file_name: selectedFile.name,
        mime_type: selectedFile.type || 'video/mp4',
        size_bytes: selectedFile.size,
        duration_ms: metadata.durationMs,
        width: metadata.uploadWidth,
        height: metadata.uploadHeight
      });

      setStage('uploading');
      await pixeService.uploadFileToMux(session.upload_url, selectedFile, (nextProgress) => setProgress(nextProgress));
      setStage('processing');
      startPolling(draft.id);
    } catch (submitError: any) {
      console.error('Unable to upload Pixe video:', submitError);
      setStage('failed');
      setError(submitError?.message || 'Upload failed.');
    } finally {
      submitLockRef.current = false;
    }
  };

  const deleteDraft = async () => {
    if (!video?.id || uploadInFlight) return;
    const confirmed = window.confirm(`Delete "${video.title || 'this draft'}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setError('');
      await pixeService.deleteVideo(video.id);
      resetComposer();
    } catch (deleteError: any) {
      console.error('Unable to delete Pixe draft:', deleteError);
      setError(deleteError?.message || 'Unable to delete this draft right now.');
    }
  };

  const publishNow = async () => {
    if (!video?.id || publishing) return;
    try {
      setPublishing(true);
      setError('');
      const next = await pixeService.publishVideo(video.id, { scheduled_for: null });
      setVideo(next);
      setStage(next.status);
    } catch (publishError: any) {
      setError(publishError?.message || 'Unable to publish video.');
    } finally {
      setPublishing(false);
    }
  };

  const renderPreviewSurface = () => {
    const poster = selectedThumbnail?.url || video?.thumbnail_url || null;
    if (thumbnailLoading && selectedFile && !previewUrl) {
      return <UploadPreviewSkeleton />;
    }

    if (previewUrl) {
      return (
        <video
          key={`${previewUrl}-${selectedThumbnailId}`}
          src={previewUrl}
          poster={poster || undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      );
    }

    if (poster) {
      return <img src={poster} alt="Selected thumbnail" className="h-full w-full object-cover" />;
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.12),transparent_55%)] text-center text-white/42">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <PixeStudioGlyph name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-white/80">Preview</p>
      </div>
    );
  };

  const renderStepCard = () => {
    if (currentStep === 'upload') {
      return (
        <section className="mx-auto flex min-h-[430px] w-full max-w-[680px] items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0] || null;
              await handleSelectedFile(file);
            }}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!dragActive) setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const file = event.dataTransfer.files?.[0] || null;
              void handleSelectedFile(file);
            }}
            className={`relative w-full overflow-hidden rounded-[24px] border border-dashed px-8 py-12 text-center transition-all duration-300 ${
              uploadAutoAdvance
                ? 'scale-[0.985] border-emerald-400/45 bg-emerald-500/[0.08] shadow-[0_24px_80px_rgba(16,185,129,0.16)]'
                : ''
            } ${
              dragActive
                ? 'border-[#FF0000]/70 bg-[#FF0000]/10 shadow-[0_0_0_1px_rgba(255,0,0,0.18)]'
                : 'border-white/12 bg-[#121212] hover:border-white/22'
            }`}
          >
            <div className={`pointer-events-none absolute inset-0 ${uploadAutoAdvance ? 'bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%)]' : 'bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.14),transparent_55%)]'}`} />
            <div className="relative mx-auto flex max-w-md flex-col items-center">
              <span className={`relative mb-5 inline-flex h-18 w-18 items-center justify-center rounded-full border ${uploadAutoAdvance ? 'border-emerald-300/25 bg-emerald-500/10' : 'border-white/10 bg-white/[0.05]'}`}>
                {uploadAutoAdvance ? (
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none text-emerald-200" stroke="currentColor" strokeWidth="2.2">
                    <path d="m5 12 4.5 4.5L19 7" />
                  </svg>
                ) : (
                  <>
                    <span className="absolute inset-0 rounded-full border border-[#FF0000]/30 animate-ping" />
                    <PixeStudioGlyph name="upload" className="h-7 w-7 text-white" />
                  </>
                )}
              </span>
              <h3 className="text-[1.9rem] font-semibold tracking-tight text-white">
                {uploadAutoAdvance ? 'Video ready' : 'Upload video'}
              </h3>
              <p className="mt-4 text-sm text-white/70">Up to 60 seconds and 150MB.</p>
              <p className="mt-1 text-sm text-white/52">Portrait or square only.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAutoAdvance || stage === 'preparing'}
                className="mt-6 inline-flex items-center justify-center rounded-[999px] bg-[#FF0000] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,0,0,0.22)] transition hover:bg-[#ff1a1a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {stage === 'preparing' ? 'Preparing...' : uploadAutoAdvance ? 'Opening details...' : 'Select file'}
              </button>
              {(selectedFile || validationError || uploadAutoAdvance) ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {selectedFile ? (
                    <span className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/82">
                      {selectedFile.name}
                    </span>
                  ) : null}
                  {selectedFile && !validationError && !uploadAutoAdvance ? (
                    <span className="rounded-[999px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                      Ready
                    </span>
                  ) : null}
                  {validationError ? (
                    <span className="rounded-[999px] border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100">
                      Needs another file
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/78"
                  >
                    Replace
                  </button>
                  {selectedFile ? (
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="rounded-[999px] border border-white/10 bg-transparent px-3 py-1.5 text-xs font-semibold text-white/70"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    if (currentStep === 'details') {
      return (
        <section className={`${uploadSectionCardClassName} space-y-6`}>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Details</p>
            <h3 className="text-[1.75rem] font-semibold tracking-tight text-white">Add title and description</h3>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-[#131313] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{selectedFile?.name || 'No file selected yet'}</p>
                <p className="mt-1 text-xs text-white/46">{fileMetaLine}</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/78"
              >
                Change file
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={`${uploadFieldClassName} ${!detailsReady ? 'border-rose-500/35 focus:border-rose-500/60 focus:ring-rose-500/15' : ''}`}
                maxLength={100}
                placeholder="Add a title that explains this clip"
              />
              {detailsStepError ? <p className="text-xs font-medium text-rose-200">{detailsStepError}</p> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={9}
                className={uploadTextAreaClassName}
                placeholder="Tell viewers what they are watching."
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white">Hashtags</span>
              <input
                value={hashtags}
                onChange={(event) => setHashtags(event.target.value)}
                placeholder="#launch #studio #behindthescenes"
                className={uploadFieldClassName}
              />
            </label>
          </div>
        </section>
      );
    }

    if (currentStep === 'elements') {
      return (
        <section className={`${uploadSectionCardClassName} space-y-6`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Video Elements</p>
              <h3 className="text-[1.75rem] font-semibold tracking-tight text-white">Thumbnail and links</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadMarketplaceCatalog()}
                className="rounded-[999px] border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Browse marketplace
              </button>
              <button
                type="button"
                onClick={appendManualProduct}
                className="rounded-[999px] border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/[0.08]"
              >
                Add custom link
              </button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(360px,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[16px] border border-white/10 bg-[#131313] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Preview frame</p>
                  </div>
                  {selectedThumbnail ? (
                    <span className="rounded-[999px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {selectedThumbnail.label}
                    </span>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-[8px] border border-white/10 bg-black">
                  <div className="aspect-[9/16]">{renderPreviewSurface()}</div>
                </div>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-[#131313] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Thumbnail timeline</p>
                </div>

                {thumbnailLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`thumb-skeleton-${index}`} className="animate-pulse rounded-[6px] border border-white/10 bg-white/[0.03] p-2">
                        <div className="aspect-[4/5] rounded-[4px] bg-white/[0.06]" />
                        <div className="mt-2 h-3 w-12 rounded bg-white/[0.06]" />
                      </div>
                    ))}
                  </div>
                ) : thumbnailChoices.length === 0 ? (
                  <div className="rounded-[8px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-6 text-sm text-white/54">
                    No thumbnails yet.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {thumbnailChoices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => setSelectedThumbnailId(choice.id)}
                        className={`overflow-hidden rounded-[6px] border text-left transition ${
                          selectedThumbnailId === choice.id
                            ? 'border-[#FF0000]/70 bg-[#FF0000]/10 shadow-[0_0_0_1px_rgba(255,0,0,0.15)]'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/18'
                        }`}
                      >
                        <div className="aspect-[4/5] bg-black">
                          <img src={choice.url} alt={choice.label} className="h-full w-full object-cover" />
                        </div>
                        <div className="px-3 py-2 text-xs font-semibold text-white/76">{choice.label}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[16px] border border-white/10 bg-[#131313] p-4">
                <p className="text-sm font-semibold text-white">Attached products and services</p>

                {linkedCount === 0 ? (
                  <div className="mt-4 rounded-[8px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-6 text-sm text-white/54">
                    No linked items.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {products.map((product, index) => (
                    <div key={`${product.href}-${index}`} className="rounded-[8px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[6px] border border-white/10 bg-white/[0.05]">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.title || 'Linked item'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/32">
                              {product.source}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-[999px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62">
                              {product.source === 'manual' ? 'Custom' : product.source}
                            </span>
                            {product.item_id ? (
                              <span className="rounded-[999px] border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                                Marketplace
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <input
                              value={product.title}
                              onChange={(event) => updateProduct(index, { title: event.target.value, source: product.source || 'manual' })}
                              placeholder="Title"
                              className={uploadFieldClassName}
                            />
                            <input
                              value={product.href}
                              onChange={(event) => updateProduct(index, { href: event.target.value, item_id: null })}
                              placeholder="/item/... or https://..."
                              className={uploadFieldClassName}
                            />
                            <input
                              value={product.price_amount}
                              onChange={(event) => updateProduct(index, { price_amount: event.target.value })}
                              placeholder="29.99"
                              className={uploadFieldClassName}
                            />
                            <input
                              value={product.cta_label}
                              onChange={(event) => updateProduct(index, { cta_label: event.target.value })}
                              placeholder="Shop"
                              className={uploadFieldClassName}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="rounded-[4px] border border-white/10 bg-transparent px-3 py-2 text-xs font-semibold text-white/66"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>
      );
    }

    if (currentStep === 'checks') {
      return (
        <section className={`${uploadSectionCardClassName} space-y-6`}>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Checks</p>
            <h3 className="text-[1.75rem] font-semibold tracking-tight text-white">Run checks before publishing</h3>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-[#131313] p-5">
            <div className="grid gap-4 lg:grid-cols-[116px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[6px] border border-white/10 bg-black">
                <div className="aspect-[4/5]">
                  {thumbnailLoading ? (
                    <UploadPreviewSkeleton />
                  ) : selectedThumbnail ? (
                    <img src={selectedThumbnail.url} alt={selectedThumbnail.label} className="h-full w-full object-cover" />
                  ) : previewUrl ? (
                    <video src={previewUrl} muted autoPlay loop playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">
                      Preview
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{displayTitle}</p>
                    <p className="mt-1 text-xs text-white/46">{fileMetaLine}</p>
                  </div>
                  <UploadProgressPill stage={stage} progress={progress} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#FF0000] transition-all"
                    style={{
                      width: `${Math.max(
                        6,
                        Math.min(
                          stage === 'ready' || stage === 'published'
                            ? 100
                            : stage === 'processing'
                              ? 88
                              : stage === 'preparing'
                                ? 12
                                : progress,
                          100
                        )
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`rounded-[8px] border p-5 ${
              validationError
                ? 'border-rose-500/25 bg-rose-500/10'
                : validationWarning || inspected?.looksRotated
                  ? 'border-amber-500/25 bg-amber-500/10'
                  : 'border-emerald-500/25 bg-emerald-500/10'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  validationError
                    ? 'bg-rose-500/20 text-rose-100'
                    : validationWarning || inspected?.looksRotated
                      ? 'bg-amber-500/18 text-amber-100'
                      : 'bg-emerald-500/18 text-emerald-100'
                }`}>
                  {validationError ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 8v5.5" />
                      <path d="M12 17h.01" />
                      <path d="M10.2 3.8 2.9 16.4a1.8 1.8 0 0 0 1.6 2.7h15a1.8 1.8 0 0 0 1.6-2.7L13.8 3.8a1.8 1.8 0 0 0-3.1 0Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m5 12 4.5 4.5L19 7" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Video checks</p>
                  <p className="mt-1 text-sm text-white/86">
                    {validationError
                      ? 'Review needed.'
                      : validationWarning || inspected?.looksRotated
                        ? 'Accepted with warning.'
                        : 'Clear.'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-[8px] border p-5 ${
              rightsClear
                ? 'border-emerald-500/25 bg-emerald-500/10'
                : rightsSignals.some((signal) => signal.level === 'high')
                  ? 'border-rose-500/25 bg-rose-500/10'
                  : 'border-amber-500/25 bg-amber-500/10'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  rightsClear
                    ? 'bg-emerald-500/18 text-emerald-100'
                    : rightsSignals.some((signal) => signal.level === 'high')
                      ? 'bg-rose-500/18 text-rose-100'
                      : 'bg-amber-500/18 text-amber-100'
                }`}>
                  {rightsClear ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m5 12 4.5 4.5L19 7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 8v5.5" />
                      <path d="M12 17h.01" />
                      <path d="M10.2 3.8 2.9 16.4a1.8 1.8 0 0 0 1.6 2.7h15a1.8 1.8 0 0 0 1.6-2.7L13.8 3.8a1.8 1.8 0 0 0-3.1 0Z" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{rightsClear ? 'No copyright issues found' : rightsSignals[0]?.title || 'Rights review required'}</p>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-[#121212] px-4 py-3 text-sm text-white/76">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-[#FF0000] focus:ring-[#FF0000]/20"
            />
            <span>I have rights to this clip.</span>
          </label>
        </section>
      );
    }

    return (
      <section className={`${uploadSectionCardClassName} space-y-6`}>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Visibility</p>
          <h3 className="text-[1.75rem] font-semibold tracking-tight text-white">Choose who sees this clip</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {([
              ['public', 'Public'],
              ['followers', 'Followers'],
              ['private', 'Private']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={`rounded-[12px] border p-4 text-left transition ${
                  visibility === value
                    ? 'border-[#FF0000]/70 bg-[#FF0000]/10 shadow-[0_0_0_1px_rgba(255,0,0,0.14)]'
                    : 'border-white/10 bg-[#131313] hover:border-white/18'
                }`}
              >
                <p className="text-sm font-semibold text-white">{label}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white">Schedule</span>
              <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className={uploadFieldClassName} />
            </label>
            <div className="rounded-[12px] border border-white/10 bg-[#131313] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Comments</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowComments((current) => !current)}
                  className={`relative inline-flex h-7 w-12 rounded-full transition ${
                    allowComments ? 'bg-[#FF0000]' : 'bg-white/12'
                  }`}
                  aria-pressed={allowComments}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${allowComments ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className={`rounded-[12px] border p-5 ${
            canPublishNow
              ? 'border-emerald-500/25 bg-emerald-500/10'
              : stage === 'processing' || stage === 'uploading' || stage === 'preparing'
                ? 'border-amber-500/25 bg-amber-500/10'
                : 'border-white/10 bg-[#131313]'
          }`}>
            <p className="text-sm font-semibold text-white">{canPublishNow ? 'Ready to publish' : 'Waiting for upload'}</p>
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_bottom,rgba(255,0,0,0.08),transparent_28%)]" />

        <div className={`relative z-10 flex h-[min(880px,calc(100svh-2rem))] w-full max-w-[1040px] flex-col ${uploadModalCardClassName}`}>
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.05] text-white">
                    <PixeStudioGlyph name="upload" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/34">Pixe Studio</p>
                    <h2 className="truncate text-lg font-semibold tracking-tight text-white">Upload video</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/74">
                    {`Step ${currentStepNumber} of ${uploadSteps.length}`}
                  </span>
                  <Link
                    to="/pixe-studio/content"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/78 transition hover:bg-white/[0.06]"
                    aria-label="Close upload"
                  >
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6 18 18" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-4">
                <div className="relative grid gap-3 sm:grid-cols-5 sm:gap-4">
                  <span className="pointer-events-none absolute left-2 right-2 top-[2.05rem] hidden h-px bg-white/10 sm:block" />
                  {uploadSteps.map((step, index) => (
                    <UploadStepIndicator
                      key={step.key}
                      step={step}
                      index={index}
                      active={step.key === currentStep}
                      complete={index < stepIndex}
                      onClick={() => navigateToStep(step.key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <div className="border-b border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-100 sm:px-6">
                {error}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className={`grid min-h-full items-start gap-5 px-5 py-5 sm:px-6 ${
                currentStep === 'upload'
                  ? 'mx-auto max-w-[760px]'
                  : 'lg:grid-cols-[minmax(0,1fr)_260px]'
              }`}>
                <div className={currentStep === 'upload' ? 'w-full' : 'min-w-0'}>
                  <div className="space-y-5 pb-4">
                    {renderStepCard()}
                  </div>
                </div>

                {currentStep !== 'upload' ? (
                <aside className="self-start lg:sticky lg:top-0">
                  <div className={`${uploadSectionCardClassName} p-4`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">Preview</p>
                        <p className="mt-1 text-sm font-semibold text-white">{displayTitle}</p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
                      <div className="aspect-[9/16]">{renderPreviewSurface()}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80">
                        {stageSummary}
                      </span>
                      {linkedCount > 0 ? (
                        <span className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80">
                          {linkedCount} linked
                        </span>
                      ) : null}
                    </div>
                  </div>
                </aside>
                ) : null}
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#101010]/96 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <UploadStatusTicker stage={stage} progress={progress} hasFile={Boolean(selectedFile)} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {video?.id && currentStep !== 'upload' ? (
                    <button
                      type="button"
                      onClick={() => void deleteDraft()}
                      disabled={uploadInFlight}
                      className="rounded-[999px] border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm font-semibold text-rose-100 disabled:opacity-45"
                    >
                      Delete draft
                    </button>
                  ) : null}

                  {currentStep !== 'upload' ? (
                    <button
                      type="button"
                      onClick={() => void saveDraft()}
                      disabled={savingDraft || stage === 'uploading' || stage === 'processing'}
                      className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-semibold text-white/82 disabled:opacity-45"
                    >
                      {savingDraft ? 'Saving...' : video?.id ? 'Update draft' : 'Save draft'}
                    </button>
                  ) : null}

                  {currentStep !== 'upload' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canGoBack) return;
                        setCurrentStep(uploadSteps[Math.max(stepIndex - 1, 0)].key);
                      }}
                      disabled={!canGoBack}
                      className="rounded-[999px] border border-white/10 bg-transparent px-3.5 py-2.5 text-sm font-semibold text-white/72 disabled:opacity-35"
                    >
                      Back
                    </button>
                  ) : null}

                  {currentStep !== 'upload' && currentStep !== 'visibility' && currentStep !== 'checks' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canGoNext) return;
                        navigateToStep(uploadSteps[Math.min(stepIndex + 1, uploadSteps.length - 1)].key);
                      }}
                      disabled={!canGoNext}
                      className="rounded-[999px] border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-45"
                    >
                      Next
                    </button>
                  ) : null}

                  {currentStep === 'checks' ? (
                    canGoNext ? (
                      <button
                        type="button"
                        onClick={() => navigateToStep('visibility')}
                        className="rounded-[999px] border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-black"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void submitUpload()}
                        disabled={!canStartUpload}
                        className="rounded-[999px] bg-[#FF0000] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(255,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {stage === 'uploading'
                          ? `Uploading ${progress}%`
                          : stage === 'processing'
                            ? 'Processing...'
                            : hasUploadedMedia && video?.status !== 'failed'
                              ? 'Uploaded'
                              : 'Start upload'}
                      </button>
                    )
                  ) : null}

                  {currentStep === 'visibility' ? (
                    <button
                      type="button"
                      onClick={() => void publishNow()}
                      disabled={!canPublishNow}
                      className="rounded-[999px] bg-[#FF0000] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(255,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {publishing ? 'Publishing...' : stage === 'published' ? 'Published' : 'Publish now'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
      </div>

      {marketplaceOpen ? (
        <div className="fixed inset-0 z-[70] p-4 sm:p-6">
          <button type="button" aria-label="Close marketplace" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMarketplaceOpen(false)} />
          <div className="relative mx-auto flex max-h-[calc(100svh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#080808]/95 text-white shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Marketplace</p>
                  <h3 className="mt-2 text-2xl font-semibold">Choose products or services</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">Select something already listed on Urban Prime and connect it to this clip.</p>
                </div>
                <button type="button" onClick={() => setMarketplaceOpen(false)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
                  Close
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input value={marketplaceQuery} onChange={(event) => setMarketplaceQuery(event.target.value)} placeholder="Search title, brand, provider, or category" className="pixe-noir-input h-11 w-full max-w-2xl rounded-full px-5 text-sm outline-none focus:border-white/20" />
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'All'],
                    ['products', 'Products'],
                    ['services', 'Services']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMarketplaceMode(value as MarketplaceMode)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        marketplaceMode === value ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/76'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {marketplaceLoading ? (
                <PixeInlineSkeleton className="min-h-[320px] rounded-[26px]" />
              ) : marketplaceError ? (
                <div className="rounded-[26px] border border-rose-500/25 bg-rose-500/10 px-5 py-6 text-sm text-rose-100">
                  {marketplaceError}
                </div>
              ) : filteredMarketplaceEntries.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/58">
                  No matching marketplace entries found. Try a broader search term.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredMarketplaceEntries.map((entry) => (
                    <button
                      key={`${entry.kind}-${entry.id}`}
                      type="button"
                      onClick={() => {
                        if (entry.kind === 'product') {
                          const item = marketplaceProducts.find((candidate) => candidate.id === entry.id);
                          if (item) {
                            insertMarketplaceDraft({
                              item_id: item.id,
                              image_url: item.imageUrl,
                              source: 'product',
                              title: item.title,
                              href: item.href,
                              cta_label: item.ctaLabel,
                              price_amount: item.priceAmount,
                              currency: item.currency
                            });
                          }
                          return;
                        }

                        const service = marketplaceServices.find((candidate) => candidate.id === entry.id);
                        if (service) {
                          insertMarketplaceDraft({
                            item_id: null,
                            image_url: service.imageUrl,
                            source: 'service',
                            title: service.title,
                            href: service.href,
                            cta_label: service.ctaLabel,
                            price_amount: service.priceAmount,
                            currency: service.currency
                          });
                        }
                      }}
                      className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-black">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt={entry.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] text-white/36">
                            {entry.kind}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">
                            {entry.kind}
                          </span>
                        </div>
                        <div>
                          <p className="line-clamp-2 text-sm font-semibold text-white">{entry.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/52">{entry.subtitle}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white">{entry.priceLabel}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">{entry.ctaLabel}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default PixeStudioUploadPage;
