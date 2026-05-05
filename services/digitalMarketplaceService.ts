import { auth } from '../firebase';
import { backendFetch, buildBackendRequestUrl, resolveBackendBaseUrl } from './backendClient';
import type {
  DigitalLibraryEntry,
  DigitalMarketplaceDashboard,
  DigitalPackageScanReport,
  GameDiscoveryPayload,
  Item
} from '../types';

export type DigitalExperienceType = 'game' | 'digital';

export interface DigitalListingSubmission {
  listingId?: string;
  status: 'draft' | 'published';
  experienceType: DigitalExperienceType;
  title: string;
  description: string;
  category: string;
  salePrice: number;
  version: string;
  licenseType: string;
  licenseDescription: string;
  developer?: string;
  publisher?: string;
  tagline?: string;
  releaseDate?: string;
  trailerUrl?: string;
  genres?: string[];
  platforms?: string[];
  modes?: string[];
  tags?: string[];
  existingImageUrls?: string[];
  coverFile?: File | null;
  galleryFiles?: File[];
  packageFile?: File | null;
  reusePackageAssetId?: string | null;
}

type UploadedAssetResult = {
  id: string;
  public_url: string;
  file_name?: string;
};

const toBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const getBackendToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const authedFetch = async (path: string, init: RequestInit = {}) => {
  const token = await getBackendToken();
  if (!token) {
    throw new Error('Authentication required.');
  }
  return backendFetch(path, init, token);
};

const uploadPublicAsset = async (
  file: File,
  assetType: 'game_art' | 'digital_art'
): Promise<UploadedAssetResult> => {
  const token = await getBackendToken();
  if (!token) {
    throw new Error('Authentication required.');
  }
  const payload = {
    fileName: file.name,
    mimeType: file.type,
    base64Data: await toBase64(file),
    asset_type: assetType,
    is_public: true
  };
  const response = (await backendFetch(
    '/uploads',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    },
    token
  )) as { data?: UploadedAssetResult };
  if (!response?.data?.public_url) {
    throw new Error('Image upload did not return a public URL.');
  }
  return response.data;
};

const resolveImageUrls = async (submission: DigitalListingSubmission) => {
  const assetType = submission.experienceType === 'game' ? 'game_art' : 'digital_art';
  const existing = Array.isArray(submission.existingImageUrls)
    ? submission.existingImageUrls.filter(Boolean)
    : [];

  const coverUrl = submission.coverFile
    ? (await uploadPublicAsset(submission.coverFile, assetType)).public_url
    : existing[0] || '';

  const galleryUploads = submission.galleryFiles?.length
    ? await Promise.all(
        submission.galleryFiles.map((file) => uploadPublicAsset(file, assetType))
      )
    : [];

  const galleryUrls = Array.from(
    new Set([
      coverUrl,
      ...existing.slice(submission.coverFile ? 1 : 0),
      ...galleryUploads.map((asset) => asset.public_url)
    ].filter(Boolean))
  );

  return {
    coverImageUrl: coverUrl,
    galleryImageUrls: galleryUrls
  };
};

const parseBackendSubmission = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Marketplace backend returned an invalid response.');
  }

  return {
    item: payload.item as Item,
    status: String(payload.status || payload.item?.status || 'draft'),
    scan: (payload.scan || null) as DigitalPackageScanReport | null
  };
};

const buildPayload = async (submission: DigitalListingSubmission) => {
  const images = await resolveImageUrls(submission);
  const packageBase64 = submission.packageFile ? await toBase64(submission.packageFile) : '';

  return {
    status: submission.status,
    experienceType: submission.experienceType,
    title: submission.title,
    description: submission.description,
    category: submission.category,
    salePrice: submission.salePrice,
    version: submission.version,
    licenseType: submission.licenseType,
    licenseDescription: submission.licenseDescription,
    developer: submission.developer,
    publisher: submission.publisher,
    tagline: submission.tagline,
    releaseDate: submission.releaseDate,
    trailerUrl: submission.trailerUrl,
    genres: submission.genres || [],
    platforms: submission.platforms || [],
    modes: submission.modes || [],
    tags: submission.tags || [],
    coverImageUrl: images.coverImageUrl,
    galleryImageUrls: images.galleryImageUrls,
    packageFileName: submission.packageFile?.name || '',
    packageBase64,
    reusePackageAssetId: submission.reusePackageAssetId || null
  };
};

const getBackendApiKey = () => (import.meta.env.VITE_BACKEND_API_KEY as string | undefined)?.trim();

const parseFilenameFromDisposition = (value: string | null) => {
  if (!value) return '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }
  const plain = /filename="?([^"]+)"?/i.exec(value);
  return plain?.[1] || '';
};

export const digitalMarketplaceService = {
  async getGameDiscovery(): Promise<GameDiscoveryPayload> {
    return (await backendFetch('/marketplace/games/discovery')) as GameDiscoveryPayload;
  },

  async getSellerDashboard(): Promise<DigitalMarketplaceDashboard> {
    return (await authedFetch('/marketplace/digital/me/dashboard')) as DigitalMarketplaceDashboard;
  },

  async createListing(submission: DigitalListingSubmission) {
    const payload = await buildPayload(submission);
    return parseBackendSubmission(
      await authedFetch('/marketplace/digital/listings', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );
  },

  async updateListing(submission: DigitalListingSubmission) {
    if (!submission.listingId) {
      throw new Error('listingId is required to update a digital listing.');
    }
    const payload = await buildPayload(submission);
    return parseBackendSubmission(
      await authedFetch(`/marketplace/digital/listings/${encodeURIComponent(submission.listingId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    );
  },

  async getLibrary(): Promise<DigitalLibraryEntry[]> {
    const payload = (await authedFetch('/marketplace/digital/library')) as {
      entries?: DigitalLibraryEntry[];
    };
    return Array.isArray(payload?.entries) ? payload.entries : [];
  },

  async downloadLibraryItem(orderItemId: string, fallbackFileName = 'download.zip') {
    const baseUrl = await resolveBackendBaseUrl();
    if (!baseUrl) {
      throw new Error('Marketplace backend is unavailable.');
    }
    const token = await getBackendToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    const apiKey = getBackendApiKey();
    if (apiKey) {
      headers.set('x-backend-key', apiKey);
    }

    const response = await fetch(
      buildBackendRequestUrl(baseUrl, `/marketplace/digital/library/download/${encodeURIComponent(orderItemId)}`),
      {
        method: 'GET',
        headers,
        credentials: 'include'
      }
    );

    if (!response.ok) {
      let message = `Download failed with status ${response.status}`;
      try {
        const payload = await response.json();
        message = payload?.error || message;
      } catch {
        // ignore malformed json
      }
      throw new Error(message);
    }

    const fileName =
      parseFilenameFromDisposition(response.headers.get('content-disposition')) || fallbackFileName;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
};

export default digitalMarketplaceService;
