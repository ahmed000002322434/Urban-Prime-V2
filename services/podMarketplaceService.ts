import { auth } from '../firebase';
import { backendFetch } from './backendClient';
import type {
  Item,
  PodCatalogTemplate,
  PodDesignAsset,
  PodDiscoveryPayload,
  PodJob,
  PodStudioDashboard,
  PodVariantOption
} from '../types';

export interface PodListingSubmission {
  listingId?: string;
  status: 'draft' | 'published';
  templateKey: string;
  title: string;
  description: string;
  category?: string;
  salePrice: number;
  baseCost: number;
  turnaroundDays: number;
  brandName: string;
  providerLabel?: string;
  tags?: string[];
  designAssetIds: string[];
  variantOptions: PodVariantOption[];
  existingImageUrls?: string[];
  coverFile?: File | null;
  galleryFiles?: File[];
}

type UploadedAssetResult = {
  id: string;
  public_url: string;
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

const uploadPublicMockup = async (file: File): Promise<UploadedAssetResult> => {
  const token = await getBackendToken();
  if (!token) {
    throw new Error('Authentication required.');
  }
  const payload = {
    fileName: file.name,
    mimeType: file.type,
    base64Data: await toBase64(file),
    asset_type: 'pod_mockup',
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
    throw new Error('Mockup upload did not return a public URL.');
  }
  return response.data;
};

const resolveMockupUrls = async (submission: PodListingSubmission) => {
  const existing = Array.isArray(submission.existingImageUrls)
    ? submission.existingImageUrls.filter(Boolean)
    : [];

  const coverUrl = submission.coverFile
    ? (await uploadPublicMockup(submission.coverFile)).public_url
    : existing[0] || '';

  const galleryUploads = submission.galleryFiles?.length
    ? await Promise.all(submission.galleryFiles.map((file) => uploadPublicMockup(file)))
    : [];

  const galleryUrls = Array.from(
    new Set(
      [coverUrl, ...existing.slice(submission.coverFile ? 1 : 0), ...galleryUploads.map((asset) => asset.public_url)].filter(Boolean)
    )
  );

  return {
    coverImageUrl: coverUrl,
    galleryImageUrls: galleryUrls
  };
};

const buildListingPayload = async (submission: PodListingSubmission) => {
  const images = await resolveMockupUrls(submission);
  return {
    status: submission.status,
    templateKey: submission.templateKey,
    title: submission.title,
    description: submission.description,
    category: submission.category,
    salePrice: submission.salePrice,
    baseCost: submission.baseCost,
    turnaroundDays: submission.turnaroundDays,
    brandName: submission.brandName,
    providerLabel: submission.providerLabel,
    tags: submission.tags || [],
    designAssetIds: submission.designAssetIds,
    variantOptions: submission.variantOptions,
    coverImageUrl: images.coverImageUrl,
    galleryImageUrls: images.galleryImageUrls
  };
};

const parseListingResponse = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('POD backend returned an invalid response.');
  }
  return {
    item: payload.item as Item,
    listing: payload.listing
  };
};

export const podMarketplaceService = {
  async getCatalog(): Promise<PodCatalogTemplate[]> {
    const payload = (await backendFetch('/marketplace/pod/catalog')) as {
      templates?: PodCatalogTemplate[];
    };
    return Array.isArray(payload?.templates) ? payload.templates : [];
  },

  async getDiscovery(): Promise<PodDiscoveryPayload> {
    return (await backendFetch('/marketplace/pod/discovery')) as PodDiscoveryPayload;
  },

  async getDashboard(): Promise<PodStudioDashboard> {
    return (await authedFetch('/marketplace/pod/me/dashboard')) as PodStudioDashboard;
  },

  async getDesigns(): Promise<PodDesignAsset[]> {
    const payload = (await authedFetch('/marketplace/pod/me/designs')) as {
      assets?: PodDesignAsset[];
    };
    return Array.isArray(payload?.assets) ? payload.assets : [];
  },

  async uploadDesign(file: File, options?: { title?: string; tags?: string[]; notes?: string }) {
    const payload = {
      fileName: file.name,
      mimeType: file.type,
      base64Data: await toBase64(file),
      title: options?.title || file.name.replace(/\.[^/.]+$/, ''),
      tags: options?.tags || [],
      notes: options?.notes || ''
    };
    const response = (await authedFetch('/marketplace/pod/designs', {
      method: 'POST',
      body: JSON.stringify(payload)
    })) as { asset?: PodDesignAsset };
    if (!response?.asset) {
      throw new Error('Design upload did not return an asset.');
    }
    return response.asset;
  },

  async deleteDesign(id: string) {
    return authedFetch(`/marketplace/pod/designs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }) as Promise<{ ok: boolean }>;
  },

  async createListing(submission: PodListingSubmission) {
    return parseListingResponse(
      await authedFetch('/marketplace/pod/listings', {
        method: 'POST',
        body: JSON.stringify(await buildListingPayload(submission))
      })
    );
  },

  async updateListing(submission: PodListingSubmission) {
    if (!submission.listingId) {
      throw new Error('listingId is required to update a POD listing.');
    }
    return parseListingResponse(
      await authedFetch(`/marketplace/pod/listings/${encodeURIComponent(submission.listingId)}`, {
        method: 'PATCH',
        body: JSON.stringify(await buildListingPayload(submission))
      })
    );
  },

  async getJobs(): Promise<PodJob[]> {
    const payload = (await authedFetch('/marketplace/pod/jobs')) as { jobs?: PodJob[] };
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  },

  async updateJob(
    id: string,
    patch: Partial<Pick<PodJob, 'status' | 'trackingNumber' | 'carrier' | 'notes'>>
  ) {
    const response = (await authedFetch(`/marketplace/pod/jobs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: patch.status,
        trackingNumber: patch.trackingNumber,
        carrier: patch.carrier,
        notes: patch.notes
      })
    })) as { ok?: boolean; job?: PodJob | null };
    if (!response?.job) {
      throw new Error('Job update did not return a POD job.');
    }
    return response.job;
  }
};

export default podMarketplaceService;
