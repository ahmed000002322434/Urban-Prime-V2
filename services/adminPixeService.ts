import { auth } from '../firebase';
import { backendFetch } from './backendClient';
import type { PixeChannel, PixeCommentReportQueueItem, PixePayoutRequest, PixeVideo, PixeVideoReviewRecord } from './pixeService';

export interface AdminPixeOverview {
  config: {
    mux_video_configured: boolean;
    mux_data_configured: boolean;
    mux_webhook_secret_configured: boolean;
    local_upload_fallback_enabled: boolean;
  };
  counts: {
    channels: number;
    videos: number;
    published_videos: number;
    active_pipeline: number;
    failed_videos: number;
    qualified_views_today: number;
    watch_time_today_ms: number;
    impressions_today: number;
    pending_comment_reports: number;
    pending_reviews: number;
    pending_payout_requests: number;
  };
  recent_videos: PixeVideo[];
  top_channels: PixeChannel[];
}

const getToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const getAuthHeaders = () => {
  const firebaseUid = auth.currentUser?.uid ? String(auth.currentUser.uid).trim() : '';
  return firebaseUid ? { 'x-firebase-uid': firebaseUid } : undefined;
};

export const adminPixeService = {
  async getOverview() {
    const token = await getToken();
    const payload = await backendFetch('/admin/pixe/overview', { headers: getAuthHeaders() }, token);
    return payload?.data as AdminPixeOverview;
  },

  async syncVideo(videoId: string) {
    const token = await getToken();
    const payload = await backendFetch(
      `/admin/pixe/videos/${encodeURIComponent(videoId)}/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() || {})
        },
        body: '{}',
        backendNoQueue: true
      },
      token
    );
    return payload?.data as PixeVideo;
  },

  async getCommentReports(reviewStatus?: string) {
    const token = await getToken();
    const query = reviewStatus ? `?review_status=${encodeURIComponent(reviewStatus)}` : '';
    const payload = await backendFetch(`/admin/pixe/comment-reports${query}`, { headers: getAuthHeaders() }, token);
    return (payload?.data || []) as PixeCommentReportQueueItem[];
  },

  async reviewCommentReport(commentId: string, payload: { action: string; admin_note?: string }) {
    const token = await getToken();
    const response = await backendFetch(
      `/admin/pixe/comment-reports/${encodeURIComponent(commentId)}/review`,
      {
        method: 'POST',
        backendNoQueue: true,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() || {})
        },
        body: JSON.stringify(payload)
      },
      token
    );
    return response?.data as { comment_id: string; status: string; review_status: string };
  },

  async getVideoReviews(filters?: { review_type?: string; status?: string }) {
    const token = await getToken();
    const query = new URLSearchParams();
    if (filters?.review_type) query.set('review_type', filters.review_type);
    if (filters?.status) query.set('status', filters.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const payload = await backendFetch(`/admin/pixe/reviews${suffix}`, { headers: getAuthHeaders() }, token);
    return (payload?.data || []) as PixeVideoReviewRecord[];
  },

  async reviewVideoReview(reviewId: string, payload: { status: string; reviewer_note?: string }) {
    const token = await getToken();
    const response = await backendFetch(
      `/admin/pixe/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: 'POST',
        backendNoQueue: true,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() || {})
        },
        body: JSON.stringify(payload)
      },
      token
    );
    return response?.data as PixeVideoReviewRecord;
  },

  async getPayoutRequests(status?: string) {
    const token = await getToken();
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const payload = await backendFetch(`/admin/pixe/payout-requests${query}`, { headers: getAuthHeaders() }, token);
    return (payload?.data || []) as Array<PixePayoutRequest & { channel?: Pick<PixeChannel, 'id' | 'display_name' | 'handle' | 'avatar_url'> | null; reviewer?: { id: string; name: string } | null }>;
  },

  async reviewPayoutRequest(requestId: string, payload: { status: string; admin_note?: string }) {
    const token = await getToken();
    const response = await backendFetch(
      `/admin/pixe/payout-requests/${encodeURIComponent(requestId)}/review`,
      {
        method: 'POST',
        backendNoQueue: true,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() || {})
        },
        body: JSON.stringify(payload)
      },
      token
    );
    return response?.data as PixePayoutRequest;
  }
};

export default adminPixeService;
