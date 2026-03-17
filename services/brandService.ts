import { auth } from '../firebase';
import { backendFetch, isBackendConfigured } from './backendClient';
import type {
  Brand,
  BrandAlias,
  BrandCatalogFilters,
  BrandCatalogMatchQueueItem,
  BrandCatalogNode,
  BrandCatalogPath,
  BrandCatalogPriceSummary,
  BrandCatalogTrustSignals,
  BrandHubFilters,
  BrandMatchQueueItem,
  BrandTrustSignals,
  BrandPriceSummary,
  Item
} from '../types';

const requireBackend = () => isBackendConfigured();

const getAuthContext = async () => {
  if (!auth.currentUser) return {};
  try {
    const token = await auth.currentUser.getIdToken();
    return { token, firebaseUid: auth.currentUser.uid };
  } catch {
    return { firebaseUid: auth.currentUser.uid };
  }
};

const request = async (path: string, options: RequestInit = {}, requiresAuth = false) => {
  if (!requireBackend()) {
    return { data: null, count: 0 };
  }
  const authContext = await getAuthContext();
  if (requiresAuth && !authContext.token) {
    throw new Error('You must sign in to perform this action.');
  }
  const headers = new Headers(options.headers || {});
  if (authContext.firebaseUid && !headers.has('x-firebase-uid')) {
    headers.set('x-firebase-uid', authContext.firebaseUid);
  }
  return backendFetch(path, { ...options, headers }, authContext.token);
};

const mapBrandTrust = (row: any): BrandTrustSignals => ({
  brandId: row?.brand_id || row?.brandId || '',
  authenticityRiskScore: Number(row?.authenticity_risk_score || row?.authenticityRiskScore || 0),
  priceIntegrityScore: Number(row?.price_integrity_score || row?.priceIntegrityScore || 0),
  sellerQualityScore: Number(row?.seller_quality_score || row?.sellerQualityScore || 0),
  overallTrustScore: Number(row?.overall_trust_score || row?.overallTrustScore || 0),
  explainability: row?.explainability || {},
  updatedAt: row?.updated_at || row?.updatedAt || new Date().toISOString()
});

const mapBrandCatalogTrust = (row: any): BrandCatalogTrustSignals => ({
  nodeId: row?.node_id || row?.nodeId || '',
  authenticityRiskScore: Number(row?.authenticity_risk_score || row?.authenticityRiskScore || 0),
  priceIntegrityScore: Number(row?.price_integrity_score || row?.priceIntegrityScore || 0),
  sellerQualityScore: Number(row?.seller_quality_score || row?.sellerQualityScore || 0),
  overallTrustScore: Number(row?.overall_trust_score || row?.overallTrustScore || 0),
  explainability: row?.explainability || {},
  updatedAt: row?.updated_at || row?.updatedAt || new Date().toISOString()
});

const mapBrandPriceSummary = (row: any): BrandPriceSummary => ({
  min: Number(row?.min || 0),
  median: Number(row?.median || 0),
  max: Number(row?.max || 0),
  sampleSize: Number(row?.sampleSize || row?.sample_size || 0),
  currency: String(row?.currency || 'USD'),
  dealBandLow: Number(row?.dealBandLow || row?.deal_band_low || 0),
  dealBandHigh: Number(row?.dealBandHigh || row?.deal_band_high || 0)
});

const mapBrandCatalogPriceSummary = (row: any): BrandCatalogPriceSummary => ({
  ...mapBrandPriceSummary(row),
  nodeId: row?.nodeId || row?.node_id || null
});

const mapBrand = (row: any): Brand => ({
  id: row?.id || '',
  name: row?.name || 'Brand',
  slug: row?.slug || '',
  normalizedName: row?.normalized_name || row?.normalizedName || '',
  logoUrl: row?.logo_url || row?.logoUrl || undefined,
  coverUrl: row?.cover_url || row?.coverUrl || undefined,
  description: row?.description || undefined,
  story: row?.story || {},
  website: row?.website || undefined,
  country: row?.country || undefined,
  status: row?.status || 'active',
  verificationLevel: row?.verification_level || row?.verificationLevel || 'community',
  claimedByUserId: row?.claimed_by_user_id || row?.claimedByUserId || null,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt,
  trust: row?.trust ? mapBrandTrust(row.trust) : null,
  priceSummary: row?.priceSummary ? mapBrandPriceSummary(row.priceSummary) : row?.price_summary ? mapBrandPriceSummary(row.price_summary) : null,
  stats: row?.stats
    ? {
        itemCount: Number(row?.stats?.itemCount || row?.stats?.item_count || 0),
        storeCount: Number(row?.stats?.storeCount || row?.stats?.store_count || 0),
        followerCount: Number(row?.stats?.followerCount || row?.stats?.follower_count || 0)
      }
    : undefined
});

const mapBrandCatalogNode = (row: any): BrandCatalogNode => ({
  id: row?.id || '',
  brandId: row?.brand_id || row?.brandId || '',
  parentNodeId: row?.parent_node_id || row?.parentNodeId || null,
  name: row?.name || 'Node',
  slug: row?.slug || '',
  normalizedName: row?.normalized_name || row?.normalizedName || '',
  nodeType: row?.node_type || row?.nodeType || 'line',
  depth: Number(row?.depth || 0),
  path: row?.path || '',
  sortOrder: Number(row?.sort_order || row?.sortOrder || 0),
  status: row?.status || 'active',
  source: row?.source || 'template',
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
  updatedAt: row?.updated_at || row?.updatedAt,
  children: Array.isArray(row?.children) ? row.children.map(mapBrandCatalogNode) : undefined
});

const mapBrandAlias = (row: any): BrandAlias => ({
  id: row?.id || '',
  brandId: row?.brand_id || row?.brandId || '',
  alias: row?.alias || '',
  normalizedAlias: row?.normalized_alias || row?.normalizedAlias || '',
  source: row?.source || 'system',
  confidence: Number(row?.confidence || 0),
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const mapBrandQueueItem = (row: any): BrandMatchQueueItem => ({
  id: row?.id || '',
  itemId: row?.item_id || row?.itemId || '',
  rawBrand: row?.raw_brand || row?.rawBrand || undefined,
  normalizedBrand: row?.normalized_brand || row?.normalizedBrand || undefined,
  proposedBrandId: row?.proposed_brand_id || row?.proposedBrandId || null,
  confidence: Number(row?.confidence || 0),
  status: row?.status || 'pending',
  reason: row?.reason || undefined,
  reviewedBy: row?.reviewed_by || row?.reviewedBy || null,
  reviewedAt: row?.reviewed_at || row?.reviewedAt || null,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const mapBrandCatalogQueueItem = (row: any): BrandCatalogMatchQueueItem => ({
  id: row?.id || '',
  itemId: row?.item_id || row?.itemId || '',
  brandId: row?.brand_id || row?.brandId || null,
  rawPath: row?.raw_path || row?.rawPath || undefined,
  normalizedPath: row?.normalized_path || row?.normalizedPath || undefined,
  proposedNodeId: row?.proposed_node_id || row?.proposedNodeId || null,
  confidence: Number(row?.confidence || 0),
  status: row?.status || 'pending',
  reason: row?.reason || undefined,
  reviewedBy: row?.reviewed_by || row?.reviewedBy || null,
  reviewedAt: row?.reviewed_at || row?.reviewedAt || null,
  createdAt: row?.created_at || row?.createdAt || new Date().toISOString()
});

const toQueryString = (filters: Record<string, any>) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
};

const mapBrandItem = (row: any): Item => {
  const metadata = row?.metadata || {};
  const imageUrls = Array.isArray(metadata?.imageUrls)
    ? metadata.imageUrls
    : Array.isArray(metadata?.images)
      ? metadata.images
      : [];

  return {
    id: row?.id || '',
    title: row?.title || metadata?.title || 'Untitled item',
    description: row?.description || metadata?.description || '',
    category: metadata?.category || 'General',
    price: Number(row?.sale_price || row?.rental_price || row?.auction_start_price || 0),
    salePrice: row?.sale_price != null ? Number(row.sale_price) : undefined,
    rentalPrice: row?.rental_price != null ? Number(row.rental_price) : undefined,
    listingType: row?.listing_type || metadata?.listingType || 'sale',
    images: imageUrls,
    imageUrls,
    owner: {
      id: row?.seller_id || '',
      name: metadata?.ownerName || 'Seller',
      avatar: metadata?.ownerAvatar || '/icons/urbanprime.svg'
    },
    avgRating: Number(metadata?.avgRating || 0),
    reviews: Array.isArray(metadata?.reviews) ? metadata.reviews : [],
    stock: Number(row?.stock || metadata?.stock || 0),
    brand: row?.brand || metadata?.brand || undefined,
    brandId: row?.brand_id || metadata?.brandId || null,
    brandCatalogNodeId: row?.brand_catalog_node_id || metadata?.brandCatalogNodeId || null,
    brandMatchConfidence: row?.brand_match_confidence ?? metadata?.brandMatchConfidence ?? null,
    brandCatalogMatchConfidence: row?.brand_catalog_match_confidence ?? metadata?.brandCatalogMatchConfidence ?? null,
    brandMatchSource: row?.brand_match_source || metadata?.brandMatchSource || null,
    status: row?.status || metadata?.status || 'published',
    createdAt: row?.created_at || metadata?.createdAt || new Date().toISOString()
  } as Item;
};

const brandService = {
  getBrands: async (filters: BrandHubFilters = {}) => {
    const query = toQueryString(filters);
    const payload = await request(`/brands${query ? `?${query}` : ''}`);
    return {
      data: Array.isArray(payload?.data) ? payload.data.map(mapBrand) : [],
      count: Number(payload?.count || 0)
    };
  },

  getBrandBySlug: async (brandSlug: string) => {
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}`);
    const raw = payload?.data || {};
    return {
      brand: mapBrand(raw),
      topNodes: Array.isArray(raw?.topNodes) ? raw.topNodes.map(mapBrandCatalogNode) : [],
      trust: raw?.trust ? mapBrandTrust(raw.trust) : null,
      stats: raw?.stats || { itemCount: 0, storeCount: 0, followerCount: 0 },
      priceSummary: raw?.priceSummary ? mapBrandPriceSummary(raw.priceSummary) : null
    };
  },

  getBrandTree: async (brandSlug: string) => {
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/tree`);
    const data = payload?.data || {};
    return {
      brand: data?.brand ? mapBrand(data.brand) : null,
      tree: Array.isArray(data?.tree) ? data.tree.map(mapBrandCatalogNode) : [],
      flatCount: Number(data?.flatCount || 0)
    };
  },

  getBrandCatalogNode: async (brandSlug: string, path?: string) => {
    const query = toQueryString({ path });
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/catalog${query ? `?${query}` : ''}`);
    const data = payload?.data || {};
    return {
      brand: data?.brand ? mapBrand(data.brand) : null,
      node: data?.node ? mapBrandCatalogNode(data.node) : null,
      trust: data?.trust ? mapBrandCatalogTrust(data.trust) : null,
      priceSummary: data?.priceSummary ? mapBrandCatalogPriceSummary(data.priceSummary) : null,
      breadcrumbs: Array.isArray(data?.breadcrumbs) ? data.breadcrumbs as BrandCatalogPath[] : [],
      children: Array.isArray(data?.children) ? data.children.map(mapBrandCatalogNode) : []
    };
  },

  getBrandCatalogPath: async (brandSlug: string, path: string) => {
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/catalog/${path.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`);
    const data = payload?.data || {};
    return {
      brand: data?.brand ? mapBrand(data.brand) : null,
      node: data?.node ? mapBrandCatalogNode(data.node) : null,
      trust: data?.trust ? mapBrandCatalogTrust(data.trust) : null,
      priceSummary: data?.priceSummary ? mapBrandCatalogPriceSummary(data.priceSummary) : null,
      breadcrumbs: Array.isArray(data?.breadcrumbs) ? data.breadcrumbs as BrandCatalogPath[] : [],
      children: Array.isArray(data?.children) ? data.children.map(mapBrandCatalogNode) : []
    };
  },

  getBrandItems: async (brandSlug: string, filters: BrandCatalogFilters = {}) => {
    const query = toQueryString(filters as Record<string, unknown>);
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/items${query ? `?${query}` : ''}`);
    return {
      data: Array.isArray(payload?.data) ? payload.data.map(mapBrandItem) : [],
      count: Number(payload?.count || 0)
    };
  },

  getBrandCatalogItems: async (brandSlug: string, path: string, filters: Omit<BrandCatalogFilters, 'path'> = {}) => {
    const query = toQueryString(filters as Record<string, unknown>);
    const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/catalog/${encodedPath}/items${query ? `?${query}` : ''}`);
    return {
      data: Array.isArray(payload?.data) ? payload.data.map(mapBrandItem) : [],
      count: Number(payload?.count || 0)
    };
  },

  getBrandStores: async (brandSlug: string, filters: BrandCatalogFilters = {}) => {
    const query = toQueryString(filters as Record<string, unknown>);
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/stores${query ? `?${query}` : ''}`);
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  getBrandCatalogStores: async (brandSlug: string, path: string) => {
    const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const payload = await request(`/brands/${encodeURIComponent(brandSlug)}/catalog/${encodedPath}/stores`);
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  suggestBrand: async (payload: { brand?: string; line?: string; notes?: string; itemId?: string }) => {
    const response = await request('/brands/suggest', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data || null;
  },

  followBrand: async (brandId: string) => {
    const response = await request(`/brands/${encodeURIComponent(brandId)}/follow`, {
      method: 'POST'
    }, true);
    return response?.data || null;
  },

  getBrandFollowState: async (brandId: string) => {
    const response = await request(`/brands/${encodeURIComponent(brandId)}/follow-state`, {}, true);
    return Boolean(response?.data?.following);
  },

  unfollowBrand: async (brandId: string) => {
    await request(`/brands/${encodeURIComponent(brandId)}/follow`, {
      method: 'DELETE'
    }, true);
  },

  claimBrand: async (brandId: string, payload: Record<string, unknown>) => {
    const response = await request(`/brands/${encodeURIComponent(brandId)}/claim`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data || null;
  },

  classifyItemBrand: async (payload: { itemId?: string; brand?: string }) => {
    const response = await request('/brands/classify-item', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data || null;
  },

  classifyItemCatalog: async (payload: { itemId?: string; brandId?: string; path?: string }) => {
    const response = await request('/brands/classify-item-catalog', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data || null;
  },

  importBrands: async (payload: { brands: Array<Record<string, unknown>> }) => {
    const response = await request('/admin/brands/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return {
      data: Array.isArray(response?.data) ? response.data.map(mapBrand) : [],
      imported: Number(response?.imported || 0)
    };
  },

  importBrandCatalog: async (payload: { brandId?: string; brandSlug?: string; nodes: Array<Record<string, unknown>> }) => {
    const response = await request('/admin/brands/catalog/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return {
      data: Array.isArray(response?.data) ? response.data.map(mapBrandCatalogNode) : [],
      imported: Number(response?.imported || 0)
    };
  },

  getBrandMatchQueue: async () => {
    const response = await request('/admin/brands/match-queue', {}, true);
    return Array.isArray(response?.data) ? response.data.map(mapBrandQueueItem) : [];
  },

  getBrandCatalogMatchQueue: async () => {
    const response = await request('/admin/brands/catalog-match-queue', {}, true);
    return Array.isArray(response?.data) ? response.data.map(mapBrandCatalogQueueItem) : [];
  },

  reviewBrandMatch: async (payload: { queueId: string; status: 'approved' | 'rejected'; brandId?: string }) => {
    const response = await request('/admin/brands/match-review', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data ? mapBrandQueueItem(response.data) : null;
  },

  reviewBrandCatalogMatch: async (payload: { queueId: string; status: 'approved' | 'rejected'; nodeId?: string }) => {
    const response = await request('/admin/brands/catalog-match-review', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data ? mapBrandCatalogQueueItem(response.data) : null;
  },

  mergeBrands: async (payload: { sourceBrandId: string; targetBrandId: string }) => {
    const response = await request('/admin/brands/merge', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data ? mapBrand(response.data) : null;
  },

  mergeBrandCatalogNodes: async (payload: { sourceNodeId: string; targetNodeId: string }) => {
    const response = await request('/admin/brands/catalog/merge-nodes', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return response?.data ? mapBrandCatalogNode(response.data) : null;
  },

  getDuplicateBrandCandidates: async () => {
    const response = await request('/admin/brands/duplicates', {}, true);
    return Array.isArray(response?.data)
      ? response.data.map((entry: any) => ({
          normalizedName: entry?.normalizedName || '',
          rows: Array.isArray(entry?.rows) ? entry.rows.map(mapBrand) : []
        }))
      : [];
  },

  mapBrand,
  mapBrandAlias,
  mapBrandCatalogNode,
  mapBrandTrust,
  mapBrandCatalogTrust,
  mapBrandPriceSummary,
  mapBrandCatalogPriceSummary
};

export default brandService;
