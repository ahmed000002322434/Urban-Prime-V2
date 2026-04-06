import { auth } from '../firebase';
import { backendFetch } from './backendClient';

export type SpotlightFeedMode = 'for_you' | 'following' | 'trending';
export type SpotlightMediaType = 'image' | 'video';

export interface SpotlightCreator {
  id: string;
  firebase_uid: string;
  name: string;
  avatar_url: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  reels_count: number;
  is_following?: boolean;
}

export interface SpotlightMetrics {
  impressions?: number;
  views: number;
  watch_time_ms: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  dislikes?: number;
  reposts?: number;
  reports?: number;
  product_clicks?: number;
  product_item_views?: number;
  product_cart_adds?: number;
  product_purchases?: number;
  product_revenue_amount?: number;
  product_ctr?: number;
  product_conversion_rate?: number;
  engagement_rate: number;
}

export interface SpotlightProductLink {
  id: string;
  item_id: string;
  title: string;
  image_url?: string;
  listing_type: string;
  sale_price?: number;
  rental_price?: number;
  currency?: string;
  status?: string;
  placement: 'inline_chip' | 'mini_card' | 'context_mode' | 'hero';
  cta_label: string;
  sort_order: number;
  is_primary: boolean;
  source: 'creator_tagged' | 'algorithmic' | 'campaign';
  campaign_key?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SpotlightConversionMetrics {
  impressions: number;
  clicks: number;
  item_views: number;
  cart_adds: number;
  purchases: number;
  revenue_amount: number;
  ctr: number;
  conversion_rate: number;
}

export interface SpotlightContextSummary {
  tag_count: number;
  product_count: number;
  has_conversion_signals: boolean;
}

export interface SpotlightItem {
  id: string;
  creator_user_id: string;
  media_type: SpotlightMediaType;
  media_url: string;
  thumbnail_url?: string | null;
  caption: string;
  hashtags: string[];
  interest_tags: string[];
  visibility: 'public' | 'followers' | 'private';
  allow_comments: boolean;
  status: 'draft' | 'published' | 'archived';
  published_at: string;
  feed_score: number;
  trending_score: number;
  final_score: number;
  created_at: string;
  updated_at: string;
  metrics: SpotlightMetrics;
  products?: SpotlightProductLink[];
  conversion_metrics?: SpotlightConversionMetrics;
  context_summary?: SpotlightContextSummary;
  creator: SpotlightCreator | null;
  reposted_from_content_id?: string | null;
}

export interface SpotlightCreateResult extends SpotlightItem {
  queued?: boolean;
  offline?: boolean;
}

export interface SpotlightContextResponse {
  content: SpotlightItem | null;
  same_creator: SpotlightItem[];
  related_posts: SpotlightItem[];
  similar_posts: SpotlightItem[];
  products: SpotlightProductLink[];
  similar_products: SpotlightProductLink[];
}

export interface SpotlightCreatorAnalyticsResponse {
  summary: {
    creator_user_id: string;
    content_count: number;
    total_clicks: number;
    total_cart_adds: number;
    total_purchases: number;
    total_revenue: number;
    conversion_rate: number;
    pending_commission: number;
    paid_commission: number;
  };
  top_posts: Array<{
    content_id: string;
    item_id: string;
    campaign_key?: string | null;
    clicks: number;
    cart_adds: number;
    purchases: number;
    revenue: number;
    ctr: number;
    purchase_rate: number;
    content: {
      id: string;
      caption: string;
      thumbnail_url?: string | null;
      media_url: string;
      published_at?: string | null;
    } | null;
  }>;
  commissions: Array<{
    id: string;
    status: string;
    commission_amount: number;
    currency: string;
    content_id: string;
    created_at: string;
  }>;
}

export interface SpotlightComment {
  id: string;
  content_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  status: string;
  like_count: number;
  reply_count: number;
  liked_by_viewer: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    firebase_uid: string;
    name: string;
    avatar_url: string;
    is_verified: boolean;
  } | null;
  replies: SpotlightComment[];
}

export interface SpotlightProfile {
  id: string;
  firebase_uid: string;
  name: string;
  avatar_url: string;
  bio: string;
  about?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  reels_count: number;
  is_verified: boolean;
  username: string;
}

export interface SpotlightProfileResponse {
  profile: SpotlightProfile;
  is_self: boolean;
  is_following: boolean;
  followers_preview?: SpotlightCreator[];
  following_preview?: SpotlightCreator[];
  tab: 'posts' | 'media' | 'likes' | 'saved';
  counts: {
    posts: number;
    media: number;
    likes: number;
    saved: number;
  };
  items: SpotlightItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface SpotlightProfilePeopleResponse {
  tab: 'followers' | 'following';
  items: SpotlightCreator[];
}

const getToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const getFirebaseUid = () => {
  const value = auth.currentUser?.uid;
  return value ? String(value).trim() : undefined;
};

const getAuthHeaders = () => {
  const firebaseUid = getFirebaseUid();
  return firebaseUid ? { 'x-firebase-uid': firebaseUid } : undefined;
};

const withFirebaseUid = <T extends Record<string, any>>(payload?: T) => {
  const firebaseUid = getFirebaseUid();
  if (!firebaseUid) return payload || ({} as T);
  if (payload && ('firebase_uid' in payload || 'firebaseUid' in payload || 'viewer_firebase_uid' in payload)) {
    return payload;
  }
  return {
    ...(payload || {}),
    firebase_uid: firebaseUid
  } as T & { firebase_uid: string };
};

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
};

const fileToBase64 = async (file: Blob) => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
  return dataUrl.split(',')[1] || '';
};

export const spotlightService = {
  async getFeed({
    mode,
    cursor,
    limit = 25,
    viewerFirebaseUid
  }: {
    mode: SpotlightFeedMode;
    cursor?: string | null;
    limit?: number;
    viewerFirebaseUid?: string;
  }) {
    const query = toQueryString({
      mode,
      cursor: cursor || undefined,
      limit,
      viewer_firebase_uid: viewerFirebaseUid
    });
    const payload = await backendFetch(`/spotlight/feed?${query}`);
    return {
      items: (payload?.data || []) as SpotlightItem[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    };
  },

  async getContent(contentId: string, viewerFirebaseUid?: string) {
    const query = toQueryString({ viewer_firebase_uid: viewerFirebaseUid });
    const payload = await backendFetch(`/spotlight/content/${contentId}${query ? `?${query}` : ''}`);
    return payload?.data as SpotlightItem;
  },

  async getContext(contentId: string, viewerFirebaseUid?: string) {
    const query = toQueryString({ viewer_firebase_uid: viewerFirebaseUid });
    const payload = await backendFetch(`/spotlight/context/${contentId}${query ? `?${query}` : ''}`);
    return payload?.data as SpotlightContextResponse;
  },

  async getComments(contentId: string, sort: 'top' | 'new', viewerFirebaseUid?: string) {
    const query = toQueryString({
      sort,
      viewer_firebase_uid: viewerFirebaseUid,
      limit: 150
    });
    const payload = await backendFetch(`/spotlight/content/${contentId}/comments?${query}`);
    return (payload?.data || []) as SpotlightComment[];
  },

  async createContent(payload: {
    media_type: SpotlightMediaType;
    media_url: string;
    thumbnail_url?: string | null;
    caption: string;
    hashtags?: string[];
    interest_tags?: string[];
    visibility?: 'public' | 'followers' | 'private';
    allow_comments?: boolean;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<SpotlightCreateResult> {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to create Spotlight content.');
    }
    const response = await backendFetch(
      '/spotlight/content',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid(payload))
      },
      token
    );
    const created = ((response?.data && typeof response.data === 'object' && !Array.isArray(response.data))
      ? response.data
      : {}) as SpotlightCreateResult;
    if (response && typeof response === 'object') {
      if ('queued' in response) {
        created.queued = Boolean((response as any).queued);
      }
      if ('offline' in response) {
        created.offline = Boolean((response as any).offline);
      }
    }
    return created;
  },

  async updateContent(
    contentId: string,
    payload: Partial<{
      media_url: string;
      thumbnail_url: string | null;
      caption: string;
      hashtags: string[];
      interest_tags: string[];
      visibility: 'public' | 'followers' | 'private';
      allow_comments: boolean;
      status: 'draft' | 'published' | 'archived';
    }>
  ) {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to edit Spotlight content.');
    }
    const response = await backendFetch(
      `/spotlight/content/${contentId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid(payload))
      },
      token
    );
    return response?.data as SpotlightItem;
  },

  async deleteContent(contentId: string) {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to delete Spotlight content.');
    }
    await backendFetch(`/spotlight/content/${contentId}`, { method: 'DELETE', headers: getAuthHeaders() }, token);
  },

  async replaceProductLinks(contentId: string, products: Array<Partial<SpotlightProductLink> & { item_id: string }>) {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to tag products on Spotlight content.');
    }
    const payload = await backendFetch(
      `/spotlight/content/${contentId}/products`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid({ products }))
      },
      token
    );
    return (payload?.data?.products || []) as SpotlightProductLink[];
  },

  async deleteProductLink(linkId: string) {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to delete Spotlight product links.');
    }
    await backendFetch(`/spotlight/product-links/${linkId}`, { method: 'DELETE', headers: getAuthHeaders() }, token);
  },

  async trackProductEvent(payload: {
    content_id: string;
    product_link_id?: string | null;
    item_id: string;
    event_name: 'impression' | 'click' | 'view_item' | 'add_to_cart' | 'purchase';
    order_id?: string | null;
    order_item_id?: string | null;
    amount?: number;
    currency?: string;
    campaign_key?: string | null;
    session_id?: string;
    viewer_firebase_uid?: string;
    metadata?: Record<string, unknown>;
  }) {
    return await backendFetch('/spotlight/product-events', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(withFirebaseUid(payload))
    });
  },

  async likeContent(contentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/content/${contentId}/like`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { liked: boolean; likes: number };
  },

  async saveContent(contentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/content/${contentId}/save`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { saved: boolean; saves: number };
  },

  async shareContent(contentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/content/${contentId}/share`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { shares: number };
  },

  async addComment(contentId: string, body: string, parentCommentId?: string | null) {
    const token = await getToken();
    const payload = await backendFetch(
      `/spotlight/content/${contentId}/comment`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid({
          body,
          parent_comment_id: parentCommentId || null
        }))
      },
      token
    );
    return payload?.data as SpotlightComment;
  },

  async deleteComment(commentId: string) {
    const token = await getToken();
    await backendFetch(`/spotlight/comments/${commentId}`, { method: 'DELETE', headers: getAuthHeaders() }, token);
  },

  async likeComment(commentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/comments/${commentId}/like`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { liked: boolean; like_count: number };
  },

  async trackView(payload: {
    content_id: string;
    media_type: SpotlightMediaType;
    watch_time_ms: number;
    visible_ratio: number;
    session_id?: string;
    viewer_firebase_uid?: string;
  }) {
    return await backendFetch('/spotlight/events/view', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(withFirebaseUid(payload))
    });
  },

  async followCreator(creatorFirebaseUid: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/follow/${creatorFirebaseUid}`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { following: boolean };
  },

  async blockUser({
    targetUserId,
    targetFirebaseUid
  }: {
    targetUserId?: string;
    targetFirebaseUid?: string;
  }) {
    const token = await getToken();
    const payload = await backendFetch(
      '/spotlight/block',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid({
          target_user_id: targetUserId,
          target_firebase_uid: targetFirebaseUid
        }))
      },
      token
    );
    return payload?.data as { blocked: boolean };
  },

  async restrictUser({
    targetUserId,
    targetFirebaseUid
  }: {
    targetUserId?: string;
    targetFirebaseUid?: string;
  }) {
    const token = await getToken();
    const payload = await backendFetch(
      '/spotlight/restrict',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid({
          target_user_id: targetUserId,
          target_firebase_uid: targetFirebaseUid
        }))
      },
      token
    );
    return payload?.data as { restricted: boolean };
  },

  async reportContent(payload: {
    reason: string;
    details?: string;
    content_id?: string;
    comment_id?: string;
  }) {
    const token = await getToken();
    await backendFetch(
      '/spotlight/report',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid(payload))
      },
      token
    );
  },

  async getSuggestedUsers(viewerFirebaseUid?: string) {
    const query = toQueryString({
      limit: 8,
      viewer_firebase_uid: viewerFirebaseUid
    });
    const payload = await backendFetch(`/spotlight/suggested-users?${query}`);
    return (payload?.data || []) as SpotlightCreator[];
  },

  async getProfile(
    username: string,
    {
      tab = 'posts',
      cursor,
      limit = 24,
      viewerFirebaseUid
    }: {
      tab?: 'posts' | 'media' | 'likes' | 'saved';
      cursor?: string | null;
      limit?: number;
      viewerFirebaseUid?: string;
    } = {}
  ) {
    const query = toQueryString({
      tab,
      cursor: cursor || undefined,
      limit,
      viewer_firebase_uid: viewerFirebaseUid
    });
    const payload = await backendFetch(`/spotlight/profile/${encodeURIComponent(username)}${query ? `?${query}` : ''}`);
    return payload?.data as SpotlightProfileResponse;
  },

  async getProfilePeople(
    username: string,
    {
      tab = 'followers',
      limit = 80,
      viewerFirebaseUid
    }: {
      tab?: 'followers' | 'following';
      limit?: number;
      viewerFirebaseUid?: string;
    } = {}
  ) {
    const query = toQueryString({
      tab,
      limit,
      viewer_firebase_uid: viewerFirebaseUid
    });
    const payload = await backendFetch(`/spotlight/profile/${encodeURIComponent(username)}/people${query ? `?${query}` : ''}`);
    return payload?.data as SpotlightProfilePeopleResponse;
  },

  async getCreatorAnalytics(userId: string = 'me') {
    const token = await getToken();
    if (!token) {
      throw new Error('You must be signed in to view Spotlight creator analytics.');
    }
    const payload = await backendFetch(`/spotlight/analytics/creator/${encodeURIComponent(userId)}`, {}, token);
    return payload?.data as SpotlightCreatorAnalyticsResponse;
  },

  async dislikeContent(contentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/content/${contentId}/dislike`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { disliked: boolean; dislikes: number };
  },

  async repostContent(contentId: string) {
    const token = await getToken();
    const payload = await backendFetch(`/spotlight/content/${contentId}/repost`, { method: 'POST', headers: getAuthHeaders() }, token);
    return payload?.data as { reposted: boolean; reposts: number; content?: SpotlightItem };
  },

  async uploadSpotlightAsset(file: File, ownerFirebaseUid: string, assetType: 'spotlight' | 'spotlight-thumb' = 'spotlight') {
    const token = await getToken();
    const base64Data = await fileToBase64(file);
    const payload = await backendFetch(
      '/uploads',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withFirebaseUid({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
          owner_firebase_uid: ownerFirebaseUid,
          asset_type: assetType,
          is_public: true
        }))
      },
      token
    );
    return payload?.data as { public_url: string; id: string; mime_type: string; file_name: string };
  }
};

