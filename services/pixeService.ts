import { auth } from '../firebase';
import { backendFetch } from './backendClient';

export type PixeFeedMode = 'for_you' | 'following' | 'explore';

export interface PixeChannel {
  id: string;
  owner_firebase_uid?: string | null;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  onboarding_completed?: boolean;
  subscriber_count: number;
  video_count: number;
  published_video_count: number;
  tip_enabled: boolean;
  membership_enabled: boolean;
  is_subscribed?: boolean;
}

export interface PixeProductTag {
  id: string;
  item_id: string | null;
  title: string;
  image_url: string | null;
  href: string | null;
  cta_label: string;
  price_amount: number;
  currency: string;
}

export interface PixeVideoMetrics {
  impressions: number;
  qualified_views: number;
  watch_time_ms: number;
  completions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  product_clicks: number;
  product_revenue_amount: number;
  completion_rate: number;
  average_view_duration_ms: number;
}

export interface PixeVideo {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  visibility: 'public' | 'followers' | 'private';
  status: 'draft' | 'uploading' | 'processing' | 'ready' | 'published' | 'failed' | 'archived';
  moderation_state: string;
  mux_upload_status: string;
  duration_ms: number;
  width: number;
  height: number;
  fps: number;
  thumbnail_url: string | null;
  preview_url: string | null;
  manifest_url: string | null;
  playback_id: string | null;
  allow_comments: boolean;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  source_size_bytes: number;
  processing_error: string | null;
  metrics: PixeVideoMetrics;
  channel: PixeChannel | null;
  product_tags: PixeProductTag[];
  viewer_state: {
    liked: boolean;
    saved: boolean;
  };
}

export interface PixeComment {
  id: string;
  video_id: string;
  parent_comment_id: string | null;
  body: string;
  status: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string;
  } | null;
  metrics: {
    likes: number;
  };
  viewer_state: {
    liked: boolean;
    reported: boolean;
  };
}

export interface PixeSubtitleState {
  id: string | null;
  video_id: string;
  language_code: string;
  name: string;
  source: string;
  status: string;
  mux_track_id: string | null;
  transcript_text: string;
  vtt_text: string;
  sync_status: string;
  subtitle_url: string | null;
  updated_at: string | null;
}

export interface PixeVideoReviewRecord {
  id: string;
  video_id: string;
  review_type: string;
  status: string;
  severity: string;
  summary: string;
  signals: Array<{
    level: 'low' | 'medium' | 'high';
    title: string;
    body: string;
  }>;
  reviewer_note?: string | null;
  reviewed_at?: string | null;
  video?: PixeVideo | null;
}

export interface PixeVideoReviewBundle {
  copyright: (PixeVideoReviewRecord & {
    duplicate_candidates?: Array<{
      id: string;
      title: string;
      created_at: string;
      score: number;
    }>;
  }) | null;
  moderation: PixeVideoReviewRecord | null;
}

export interface PixePayoutRequest {
  id: string;
  channel_id: string;
  user_id: string;
  amount: number;
  currency: string;
  destination_label: string;
  note: string;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface PixeCommentReportQueueItem {
  comment_id: string;
  report_count: number;
  reasons: string[];
  review_status: string;
  latest_reported_at: string | null;
  reviewed_at?: string | null;
  admin_note?: string;
  comment: {
    id: string;
    body: string;
    status: string;
    is_pinned: boolean;
    created_at: string;
  } | null;
  author: {
    id: string;
    name: string;
    avatar_url: string;
  } | null;
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  } | null;
}

export interface PixeUploadSession {
  video_id: string;
  upload_id: string;
  upload_url: string;
  timeout: number;
  status: string;
  file_name: string;
  mime_type: string;
}

export interface PixeFeedResponse {
  items: PixeVideo[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface PixeChannelResponse {
  channel: PixeChannel;
  videos: PixeVideo[];
}

export interface PixeHandleAvailabilityResponse {
  handle: string;
  available: boolean;
  is_current: boolean;
  reason: string | null;
}

export interface PixeProfileResponse {
  channel: PixeChannel | null;
  videos: PixeVideo[];
}

export interface PixeSearchProduct {
  id: string;
  title: string;
  description: string;
  brand: string;
  currency: string;
  price_amount: number;
  image_url: string;
  href: string;
  is_featured: boolean;
  is_verified: boolean;
}

export interface PixeSearchResponse {
  query: string;
  creators: PixeChannel[];
  videos: PixeVideo[];
  products: PixeSearchProduct[];
  topics: string[];
}

export interface PixeDashboardResponse {
  channel: PixeChannel;
  recent_videos: PixeVideo[];
  summary: {
    subscriber_count: number;
    video_count: number;
    published_video_count: number;
    total_impressions: number;
    total_qualified_views: number;
    total_watch_time_ms: number;
  };
}

export interface PixeOverviewAnalyticsResponse {
  summary: {
    total_videos: number;
    published_videos: number;
    impressions: number;
    qualified_views: number;
    watch_time_ms: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    completion_rate: number;
  };
  daily_stats: Array<{
    bucket_date: string;
    impressions: number;
    qualified_views: number;
    watch_time_ms: number;
    completions: number;
  }>;
  mux_qoe: Record<string, number | null> | null;
}

export interface PixeAudienceAnalyticsResponse {
  subscriber_count: number;
  new_subscribers_last_30_days: number;
  average_completion_rate: number;
  top_videos_by_watch_time: Array<{
    id: string;
    title: string;
    watch_time_ms: number;
    qualified_views: number;
  }>;
}

export interface PixeRevenueAnalyticsResponse {
  summary: {
    tip_revenue: number;
    active_memberships: number;
    membership_revenue: number;
    product_clicks: number;
    product_revenue_amount: number;
    available_balance: number;
    pending_payouts: number;
    paid_out: number;
  };
  tips: Array<Record<string, unknown>>;
  memberships: Array<Record<string, unknown>>;
  payout_ledger: Array<Record<string, unknown>>;
  payout_requests: PixePayoutRequest[];
}

export type PixeActivityRange = '7d' | '30d' | '90d' | 'all';

export interface PixeActivityDailyPoint {
  bucket_date: string;
  watched_count: number;
  watch_time_ms: number;
  liked_count: number;
  commented_count: number;
  saved_count: number;
}

export interface PixeActivityOverviewResponse {
  summary: {
    total_watched: number;
    unique_videos_watched: number;
    liked_videos: number;
    saved_videos: number;
    comments_made: number;
    watch_time_ms: number;
    completed_views: number;
    first_activity_at: string | null;
  };
  daily: PixeActivityDailyPoint[];
}

export interface PixeActivityWatchedEntry {
  video: PixeVideo | null;
  last_watched_at: string | null;
  first_watched_at: string | null;
  view_count: number;
  completed_count: number;
  watch_time_ms: number;
  resume_ratio: number;
}

export interface PixeActivityLikeEntry {
  video: PixeVideo | null;
  liked_at: string | null;
}

export interface PixeActivityCommentEntry {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  parent_comment_id: string | null;
  video: PixeVideo | null;
}

export const PIXE_MAX_DURATION_MS = 60_000;
export const PIXE_MAX_FILE_BYTES = 150 * 1024 * 1024;

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

const toQueryString = (params: Record<string, string | number | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
};

const get = async <T,>(path: string, authRequired = false, options?: { backendNoCache?: boolean }) => {
  const token = authRequired ? await getToken() : await getToken();
  const payload = await backendFetch(
    path,
    {
      headers: getAuthHeaders(),
      ...(options?.backendNoCache ? { backendNoCache: true } : {})
    },
    token
  );
  return payload?.data as T;
};

const mutate = async <T,>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  authRequired = true,
  backendNoQueue = false
) => {
  const token = authRequired ? await getToken() : await getToken();
  const payload = await backendFetch(
    path,
    {
      method,
      backendNoQueue,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(getAuthHeaders() || {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    token
  );
  return payload?.data as T;
};

export const uploadFileToMux = (uploadUrl: string, file: File, onProgress?: (progress: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(progress);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}.`));
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted.')));
    xhr.send(file);
  });

export const pixeService = {
  uploadFileToMux,

  getMuxEnvKey() {
    return (import.meta.env.VITE_MUX_ENV_KEY as string | undefined)?.trim() || '';
  },

  async getFeed(mode: PixeFeedMode, cursor?: string | null, limit = 8) {
    const token = await getToken();
    const query = toQueryString({ mode, cursor: cursor || undefined, limit });
    const payload = await backendFetch(`/pixe/feed?${query}`, { headers: getAuthHeaders() }, token);
    return {
      items: (payload?.data || []) as PixeVideo[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    } as PixeFeedResponse;
  },

  async getVideo(videoId: string) {
    return await get<PixeVideo & { comments: PixeComment[] }>(`/pixe/videos/${encodeURIComponent(videoId)}`, false, { backendNoCache: true });
  },

  async getChannel(handle: string) {
    return await get<PixeChannelResponse>(`/pixe/channels/${encodeURIComponent(handle)}`, false, { backendNoCache: true });
  },

  async getProfileVideos(firebaseUid: string) {
    return await get<PixeProfileResponse>(`/pixe/profile/${encodeURIComponent(firebaseUid)}`, false, { backendNoCache: true });
  },

  async search(query?: string, limit = 8) {
    const token = await getToken();
    const queryString = toQueryString({ q: query || undefined, limit });
    const payload = await backendFetch(`/pixe/search?${queryString}`, { headers: getAuthHeaders() }, token);
    return (payload?.data || {
      query: '',
      creators: [],
      videos: [],
      products: [],
      topics: []
    }) as PixeSearchResponse;
  },

  async createDraft(payload: {
    title?: string;
    caption?: string;
    visibility?: 'public' | 'followers' | 'private';
    allow_comments?: boolean;
    scheduled_for?: string | null;
    hashtags?: string[];
    product_tags?: Array<Record<string, unknown>>;
  }) {
    return await mutate<PixeVideo>('/pixe/videos', 'POST', payload, true, true);
  },

  async updateVideo(videoId: string, payload: Record<string, unknown>) {
    return await mutate<PixeVideo>(`/pixe/videos/${encodeURIComponent(videoId)}`, 'PATCH', payload, true, true);
  },

  async createUploadSession(payload: {
    video_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    duration_ms: number;
    width: number;
    height: number;
  }) {
    return await mutate<PixeUploadSession>('/pixe/uploads/video-session', 'POST', payload, true, true);
  },

  async publishVideo(videoId: string, payload?: { scheduled_for?: string | null }) {
    return await mutate<PixeVideo>(`/pixe/videos/${encodeURIComponent(videoId)}/publish`, 'POST', payload || {}, true, true);
  },

  async deleteVideo(videoId: string) {
    return await mutate<{ id: string; deleted: boolean }>(`/pixe/videos/${encodeURIComponent(videoId)}`, 'DELETE', undefined, true, true);
  },

  async getComments(videoId: string) {
    return await get<PixeComment[]>(`/pixe/videos/${encodeURIComponent(videoId)}/comments`);
  },

  async getSavedVideos(cursor?: string | null, limit = 18) {
    const token = await getToken();
    const query = toQueryString({ cursor: cursor || undefined, limit });
    const payload = await backendFetch(`/pixe/saved?${query}`, { headers: getAuthHeaders(), backendNoCache: true }, token);
    return {
      items: (payload?.data || []) as PixeVideo[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more),
      totalCount: Number(payload?.total_count || 0)
    } as PixeFeedResponse;
  },

  async addComment(videoId: string, body: string, parentCommentId?: string | null) {
    return await mutate<PixeComment>(
      `/pixe/videos/${encodeURIComponent(videoId)}/comments`,
      'POST',
      {
        body,
        parent_comment_id: parentCommentId || null
      },
      true,
      true
    );
  },

  async updateComment(commentId: string, payload: { status?: string; is_pinned?: boolean }) {
    return await mutate<PixeComment>(`/pixe/comments/${encodeURIComponent(commentId)}`, 'PATCH', payload, true);
  },

  async likeComment(commentId: string) {
    return await mutate<{ liked: boolean; like_count: number }>(`/pixe/comments/${encodeURIComponent(commentId)}/like`, 'POST', {}, true, true);
  },

  async reportComment(commentId: string, payload?: { reason?: string }) {
    return await mutate<{ reported: boolean }>(`/pixe/comments/${encodeURIComponent(commentId)}/report`, 'POST', payload || {}, true, true);
  },

  async likeVideo(videoId: string) {
    return await mutate<{ liked: boolean; like_count: number }>(`/pixe/videos/${encodeURIComponent(videoId)}/like`, 'POST', {}, true, true);
  },

  async saveVideo(videoId: string) {
    return await mutate<{ saved: boolean; save_count: number }>(`/pixe/videos/${encodeURIComponent(videoId)}/save`, 'POST', {}, true, true);
  },

  async shareVideo(videoId: string) {
    return await mutate<{ share_count: number }>(`/pixe/videos/${encodeURIComponent(videoId)}/share`, 'POST', {}, false);
  },

  async subscribe(channelId: string) {
    return await mutate<{ subscribed: boolean; subscriber_count: number }>(`/pixe/channels/${encodeURIComponent(channelId)}/subscribe`, 'POST', {}, true, true);
  },

  async sendEvents(events: Array<{
    event_id?: string;
    video_id: string;
    event_name: string;
    viewer_session_id?: string;
    occurred_at?: string;
    watch_time_ms?: number;
  }>) {
    return await mutate<{ accepted_count: number }>(
      '/pixe/events/batch',
      'POST',
      { events },
      false
    );
  },

  async recordWatchProgress(payload: {
    video_id: string;
    viewer_session_id?: string;
    watch_time_ms: number;
    progress_ratio?: number;
    completed?: boolean;
    occurred_at?: string;
  }) {
    return await mutate<{ ok: boolean }>(
      '/pixe/activity/watch-progress',
      'POST',
      payload,
      true,
      true
    );
  },

  async getStudioDashboard() {
    return await get<PixeDashboardResponse>('/pixe/studio/dashboard', true, { backendNoCache: true });
  },

  async getStudioContent(cursor?: string | null, status?: string) {
    const query = toQueryString({ cursor: cursor || undefined, status: status || undefined, limit: 24 });
    const token = await getToken();
    const payload = await backendFetch(`/pixe/studio/content?${query}`, { headers: getAuthHeaders(), backendNoCache: true }, token);
    return {
      items: (payload?.data || []) as PixeVideo[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    } as PixeFeedResponse;
  },

  async getStudioComments() {
    return await get<Array<{
      id: string;
      body: string;
      status: string;
      is_pinned: boolean;
      created_at: string;
      user: { id: string; name: string; avatar_url: string } | null;
      video: { id: string; title: string; thumbnail_url: string | null } | null;
      reports: {
        report_count: number;
        reasons: string[];
        review_status: string;
        latest_reported_at: string | null;
      };
    }>>('/pixe/studio/comments', true, { backendNoCache: true });
  },

  async getVideoSubtitles(videoId: string) {
    return await get<PixeSubtitleState>(`/pixe/studio/videos/${encodeURIComponent(videoId)}/subtitles`, true);
  },

  async saveVideoSubtitles(videoId: string, payload: {
    language_code?: string;
    name?: string;
    transcript_text?: string;
    vtt_text?: string;
  }) {
    const token = await getToken();
    const response = await backendFetch(
      `/pixe/studio/videos/${encodeURIComponent(videoId)}/subtitles`,
      {
        method: 'PUT',
        backendNoQueue: true,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() || {})
        },
        body: JSON.stringify(payload)
      },
      token
    );
    return response?.data as PixeSubtitleState;
  },

  async regenerateVideoSubtitles(videoId: string, payload?: { language_code?: string; name?: string }) {
    return await mutate<PixeSubtitleState>(
      `/pixe/studio/videos/${encodeURIComponent(videoId)}/subtitles/regenerate`,
      'POST',
      payload || {},
      true,
      true
    );
  },

  async getVideoReviews(videoId: string) {
    return await get<PixeVideoReviewBundle>(`/pixe/studio/videos/${encodeURIComponent(videoId)}/reviews`, true);
  },

  async refreshVideoReviews(videoId: string) {
    return await mutate<PixeVideoReviewBundle>(
      `/pixe/studio/videos/${encodeURIComponent(videoId)}/reviews/refresh`,
      'POST',
      {},
      true,
      true
    );
  },

  async getStudioChannel() {
    return await get<PixeChannel & { hidden_words?: string[] }>('/pixe/studio/channel', true, { backendNoCache: true });
  },

  async checkStudioHandleAvailability(handle: string) {
    return await get<PixeHandleAvailabilityResponse>(
      `/pixe/studio/handle-availability?handle=${encodeURIComponent(handle)}`,
      true,
      { backendNoCache: true }
    );
  },

  async updateStudioChannel(payload: Record<string, unknown>) {
    return await mutate<PixeChannel>('/pixe/studio/channel', 'PATCH', payload, true);
  },

  async deleteStudioAccount() {
    return await mutate<{ ok: boolean }>('/pixe/studio/account', 'DELETE', undefined, true, true);
  },

  async getOverviewAnalytics() {
    return await get<PixeOverviewAnalyticsResponse>('/pixe/studio/analytics/overview', true, { backendNoCache: true });
  },

  async getContentAnalytics() {
    return await get<PixeVideo[]>('/pixe/studio/analytics/content', true, { backendNoCache: true });
  },

  async getAudienceAnalytics() {
    return await get<PixeAudienceAnalyticsResponse>('/pixe/studio/analytics/audience', true, { backendNoCache: true });
  },

  async getRevenueAnalytics() {
    return await get<PixeRevenueAnalyticsResponse>('/pixe/studio/analytics/revenue', true, { backendNoCache: true });
  },

  async getActivityOverview(range: PixeActivityRange = '30d') {
    const query = toQueryString({ range });
    return await get<PixeActivityOverviewResponse>(`/pixe/activity/overview?${query}`, true, { backendNoCache: true });
  },

  async getActivityWatched(range: PixeActivityRange = '30d', cursor?: string | null, limit = 18) {
    const query = toQueryString({ range, cursor: cursor || undefined, limit });
    const token = await getToken();
    const payload = await backendFetch(`/pixe/activity/watched?${query}`, { headers: getAuthHeaders(), backendNoCache: true }, token);
    return {
      items: (payload?.data || []) as PixeActivityWatchedEntry[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    };
  },

  async getActivityLikes(range: PixeActivityRange = '30d', cursor?: string | null, limit = 18) {
    const query = toQueryString({ range, cursor: cursor || undefined, limit });
    const token = await getToken();
    const payload = await backendFetch(`/pixe/activity/likes?${query}`, { headers: getAuthHeaders(), backendNoCache: true }, token);
    return {
      items: (payload?.data || []) as PixeActivityLikeEntry[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    };
  },

  async getActivityComments(range: PixeActivityRange = '30d', cursor?: string | null, limit = 18) {
    const query = toQueryString({ range, cursor: cursor || undefined, limit });
    const token = await getToken();
    const payload = await backendFetch(`/pixe/activity/comments?${query}`, { headers: getAuthHeaders(), backendNoCache: true }, token);
    return {
      items: (payload?.data || []) as PixeActivityCommentEntry[],
      nextCursor: (payload?.next_cursor || null) as string | null,
      hasMore: Boolean(payload?.has_more)
    };
  },

  async sendTip(channelId: string, payload: { amount: number; currency?: string; message?: string; video_id?: string | null }) {
    return await mutate<{ ok: boolean; tip?: Record<string, unknown> | null; supporter_message?: string | null }>(
      `/pixe/channels/${encodeURIComponent(channelId)}/tip`,
      'POST',
      payload,
      true,
      true
    );
  },

  async joinMembership(channelId: string, payload?: { amount?: number; currency?: string; tier_name?: string }) {
    return await mutate<{ membership: Record<string, unknown> | null; already_active: boolean }>(
      `/pixe/channels/${encodeURIComponent(channelId)}/membership`,
      'POST',
      payload || {},
      true,
      true
    );
  },

  async requestPayout(payload: { amount: number; currency?: string; destination_label: string; note?: string }) {
    return await mutate<{ request: PixePayoutRequest | null; available_balance: number }>(
      '/pixe/studio/payout-requests',
      'POST',
      payload,
      true,
      true
    );
  }
};
