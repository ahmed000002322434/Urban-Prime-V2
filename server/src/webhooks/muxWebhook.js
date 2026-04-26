import { createHmac, timingSafeEqual } from 'crypto';
import {
  buildMuxPlaybackLinks,
  getMuxAsset,
  getMuxAssetDimensions,
  getMuxAssetPlaybackId
} from '../muxClient.js';

const WEBHOOK_TOLERANCE_SECONDS = 300;
const MIN_ASPECT_RATIO = 1 / 2;
const MAX_ASPECT_RATIO = 1;
const MAX_VIDEO_DURATION_MS = 60_000;
const MAX_VIDEO_WIDTH = 2160;
const MAX_VIDEO_HEIGHT = 3840;

const safeString = (value, fallback = '') => (value == null ? fallback : String(value));

const parseMuxSignatureHeader = (headerValue) => {
  const entries = new Map();
  safeString(headerValue)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [key, rawValue] = entry.split('=');
      const normalizedKey = safeString(key).trim();
      const normalizedValue = safeString(rawValue).trim();
      if (normalizedKey && normalizedValue) {
        entries.set(normalizedKey, normalizedValue);
      }
    });
  return entries;
};

const secureHexCompare = (leftValue, rightValue) => {
  const left = safeString(leftValue).trim();
  const right = safeString(rightValue).trim();
  if (!left || !right || left.length !== right.length) return false;
  try {
    return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  } catch {
    return false;
  }
};

const validateProcessedAssetMetadata = ({ duration_ms: durationMs, width, height }) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_VIDEO_DURATION_MS) {
    return 'Processed clip exceeds the 60 second Pixe limit.';
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Processed clip dimensions are unavailable.';
  }
  if (width > MAX_VIDEO_WIDTH || height > MAX_VIDEO_HEIGHT) {
    return 'Processed clip exceeds the 2160x3840 Pixe upload limit.';
  }
  if (width > height) {
    return 'Processed clip is landscape. Pixe feed requires a portrait or square video.';
  }

  const aspectRatio = width / height;
  if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
    return 'Processed clip must stay in a portrait or square-safe range to publish in Pixe.';
  }

  return null;
};

const verifyMuxWebhookSignature = (rawBody, signatureHeader, secret) => {
  if (!secret) return true;

  const signatureEntries = parseMuxSignatureHeader(signatureHeader);
  const timestamp = safeString(signatureEntries.get('t')).trim();
  const receivedSignature = safeString(signatureEntries.get('v1')).trim();
  if (!timestamp || !receivedSignature) {
    return false;
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return false;
  const driftSeconds = Math.abs(Date.now() - timestampMs) / 1000;
  if (driftSeconds > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
  return secureHexCompare(expectedSignature, receivedSignature);
};

const updateVideoByUploadId = async (supabase, muxUploadId, patch) => {
  if (!muxUploadId) return null;
  const { data, error } = await supabase
    .from('pixe_videos')
    .update(patch)
    .eq('mux_upload_id', muxUploadId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const resolveVideoByAsset = async (supabase, assetId, fallbackPassthrough) => {
  if (assetId) {
    const { data, error } = await supabase
      .from('pixe_videos')
      .select('*')
      .eq('mux_asset_id', assetId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const fallbackVideoId = safeString(fallbackPassthrough).trim();
  if (!fallbackVideoId) return null;

  const { data, error } = await supabase
    .from('pixe_videos')
    .select('*')
    .eq('id', fallbackVideoId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const upsertPrimaryVideoAssets = async (supabase, videoId, playbackId) => {
  if (!videoId || !playbackId) return;
  const links = buildMuxPlaybackLinks(playbackId);
  const rows = [
    {
      video_id: videoId,
      asset_kind: 'manifest',
      playback_id: playbackId,
      url: links.manifest_url,
      mime_type: 'application/x-mpegURL',
      is_primary: true
    },
    {
      video_id: videoId,
      asset_kind: 'thumbnail',
      playback_id: playbackId,
      url: links.thumbnail_url,
      mime_type: 'image/webp',
      is_primary: true
    },
    {
      video_id: videoId,
      asset_kind: 'preview',
      playback_id: playbackId,
      url: links.preview_url,
      mime_type: 'image/gif',
      is_primary: true
    }
  ];

  for (const row of rows) {
    const { error } = await supabase
      .from('pixe_video_assets')
      .upsert(row, { onConflict: 'video_id,asset_kind' });
    if (error) throw error;
  }
};

const refreshChannelCounters = async (supabase, channelId) => {
  if (!channelId) return;

  const [{ count: videoCount }, { count: publishedCount }, { count: subscriberCount }] = await Promise.all([
    supabase.from('pixe_videos').select('id', { count: 'exact', head: true }).eq('channel_id', channelId),
    supabase.from('pixe_videos').select('id', { count: 'exact', head: true }).eq('channel_id', channelId).eq('status', 'published'),
    supabase.from('pixe_subscriptions').select('id', { count: 'exact', head: true }).eq('channel_id', channelId)
  ]);

  const { error } = await supabase
    .from('pixe_channels')
    .update({
      video_count: Number(videoCount || 0),
      published_video_count: Number(publishedCount || 0),
      subscriber_count: Number(subscriberCount || 0)
    })
    .eq('id', channelId);

  if (error) throw error;
};

const handleUploadAssetCreated = async ({ supabase, eventPayload }) => {
  const uploadId = safeString(eventPayload?.data?.id).trim();
  const assetId = safeString(eventPayload?.data?.asset_id).trim();
  if (!uploadId) return;

  await updateVideoByUploadId(supabase, uploadId, {
    mux_asset_id: assetId || null,
    status: 'processing',
    processing_error: null,
    mux_upload_status: safeString(eventPayload?.data?.status || 'asset_created') || 'asset_created'
  });
};

const handleAssetReady = async ({ supabase, eventPayload }) => {
  const assetId = safeString(eventPayload?.data?.id).trim();
  if (!assetId) return;

  const asset = await getMuxAsset(assetId);
  const playbackId = getMuxAssetPlaybackId(asset);
  const dimensions = getMuxAssetDimensions(asset);
  const links = buildMuxPlaybackLinks(playbackId);
  const video = await resolveVideoByAsset(supabase, assetId, asset?.passthrough || eventPayload?.data?.passthrough);

  if (!video) {
    return;
  }

  const processedValidationError = validateProcessedAssetMetadata(dimensions);
  if (processedValidationError) {
    const { error } = await supabase
      .from('pixe_videos')
      .update({
        mux_asset_id: assetId,
        playback_id: playbackId,
        status: 'failed',
        mux_upload_status: 'ready',
        duration_ms: dimensions.duration_ms,
        width: dimensions.width,
        height: dimensions.height,
        fps: dimensions.fps,
        manifest_url: links.manifest_url,
        thumbnail_url: links.thumbnail_url,
        preview_url: links.preview_url,
        processing_error: processedValidationError
      })
      .eq('id', video.id);

    if (error) throw error;
    await refreshChannelCounters(supabase, video.channel_id);
    return;
  }

  const scheduledFor = video.scheduled_for ? new Date(video.scheduled_for) : null;
  const shouldPublishNow = scheduledFor ? scheduledFor.getTime() <= Date.now() : false;
  const nextStatus = video.status === 'published' || shouldPublishNow ? 'published' : 'ready';
  const publishedAt = nextStatus === 'published'
    ? (video.published_at || new Date().toISOString())
    : null;

  const { error } = await supabase
    .from('pixe_videos')
    .update({
      mux_asset_id: assetId,
      playback_id: playbackId,
      status: nextStatus,
      mux_upload_status: 'ready',
      duration_ms: dimensions.duration_ms,
      width: dimensions.width,
      height: dimensions.height,
      fps: dimensions.fps,
      manifest_url: links.manifest_url,
      thumbnail_url: links.thumbnail_url,
      preview_url: links.preview_url,
      processing_error: null,
      published_at: publishedAt
    })
    .eq('id', video.id);

  if (error) throw error;

  await upsertPrimaryVideoAssets(supabase, video.id, playbackId);
  await refreshChannelCounters(supabase, video.channel_id);
};

const handleAssetErrored = async ({ supabase, eventPayload }) => {
  const assetId = safeString(eventPayload?.data?.id).trim();
  const uploadId = safeString(eventPayload?.data?.upload_id).trim();
  const warningMessage = safeString(
    eventPayload?.data?.errors?.messages?.[0]
    || eventPayload?.data?.error?.message
    || eventPayload?.data?.warning?.message
    || 'Mux asset processing failed.'
  ).trim();

  if (assetId) {
    const { error } = await supabase
      .from('pixe_videos')
      .update({
        status: 'failed',
        processing_error: warningMessage,
        mux_asset_id: assetId,
        mux_upload_status: 'errored'
      })
      .eq('mux_asset_id', assetId);
    if (error) throw error;
    return;
  }

  if (uploadId) {
    await updateVideoByUploadId(supabase, uploadId, {
      status: 'failed',
      processing_error: warningMessage,
      mux_upload_status: 'errored'
    });
  }
};

export const createMuxWebhookHandler = (supabase) => async (req, res) => {
  const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  const rawBody = rawBodyBuffer.toString('utf8');
  const signatureHeader = req.headers['mux-signature'];
  const webhookSecret = safeString(process.env.MUX_WEBHOOK_SECRET || '').trim();

  if (!verifyMuxWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid Mux webhook signature.' });
  }

  let eventPayload = null;
  try {
    eventPayload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return res.status(400).json({ error: 'Invalid webhook payload.' });
  }

  try {
    const eventType = safeString(eventPayload?.type).trim();

    if (eventType === 'video.upload.asset_created') {
      await handleUploadAssetCreated({ supabase, eventPayload });
    } else if (eventType === 'video.asset.ready') {
      await handleAssetReady({ supabase, eventPayload });
    } else if (eventType === 'video.asset.errored') {
      await handleAssetErrored({ supabase, eventPayload });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Mux webhook handling failed:', error);
    return res.status(500).json({ error: 'Mux webhook processing failed.' });
  }
};
