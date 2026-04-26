const MUX_VIDEO_API_BASE = 'https://api.mux.com/video/v1';
const MUX_DATA_API_BASE = 'https://api.mux.com/data/v1';

const safeString = (value, fallback = '') => (value == null ? fallback : String(value));

const parseJsonObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const getMuxVideoCredentials = () => {
  const tokenId = safeString(process.env.MUX_TOKEN_ID || '').trim();
  const tokenSecret = safeString(process.env.MUX_TOKEN_SECRET || '').trim();
  return {
    tokenId,
    tokenSecret,
    configured: Boolean(tokenId && tokenSecret)
  };
};

const getMuxDataCredentials = () => {
  const tokenId = safeString(process.env.MUX_DATA_TOKEN_ID || process.env.MUX_TOKEN_ID || '').trim();
  const tokenSecret = safeString(process.env.MUX_DATA_TOKEN_SECRET || process.env.MUX_TOKEN_SECRET || '').trim();
  return {
    tokenId,
    tokenSecret,
    configured: Boolean(tokenId && tokenSecret)
  };
};

const buildBasicAuthHeader = (tokenId, tokenSecret) =>
  `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`, 'utf8').toString('base64')}`;

const appendSearchParams = (url, searchParams = {}) => {
  const nextUrl = new URL(url);

  Object.entries(searchParams).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return;
    if (Array.isArray(rawValue)) {
      rawValue.forEach((entry) => {
        if (entry === undefined || entry === null || entry === '') return;
        nextUrl.searchParams.append(key, String(entry));
      });
      return;
    }
    nextUrl.searchParams.append(key, String(rawValue));
  });

  return nextUrl.toString();
};

const muxRequest = async ({
  baseUrl,
  tokenId,
  tokenSecret,
  path,
  method = 'GET',
  body,
  searchParams,
  headers = {}
}) => {
  if (!tokenId || !tokenSecret) {
    throw new Error('Mux credentials are not configured.');
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Authorization', buildBasicAuthHeader(tokenId, tokenSecret));
  if (body !== undefined && body !== null && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(
    appendSearchParams(`${baseUrl}${path}`, searchParams),
    {
      method,
      headers: requestHeaders,
      body: body === undefined || body === null ? undefined : JSON.stringify(body)
    }
  );

  const text = await response.text();
  const payload = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })() : null;

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : safeString(payload?.error?.message || payload?.message || response.statusText || 'Mux request failed.');
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const hasMuxVideoConfig = () => getMuxVideoCredentials().configured;

export const hasMuxDataConfig = () => getMuxDataCredentials().configured;

export const createMuxDirectUpload = async ({
  corsOrigin,
  passthrough,
  title,
  creatorId,
  externalId,
  generatedSubtitles = false,
  staticRenditions = false
}) => {
  const credentials = getMuxVideoCredentials();
  const inputs = [];

  if (generatedSubtitles) {
    inputs.push({
      generated_subtitles: [
        {
          language_code: 'en',
          name: 'English'
        }
      ]
    });
  }

  const body = {
    cors_origin: corsOrigin || '*',
    new_asset_settings: {
      playback_policies: ['public'],
      video_quality: 'basic',
      max_resolution_tier: '1080p',
      normalize_audio: true,
      passthrough: safeString(passthrough).slice(0, 255),
      meta: {
        title: safeString(title).slice(0, 512),
        creator_id: safeString(creatorId).slice(0, 128),
        external_id: safeString(externalId).slice(0, 128)
      }
    }
  };

  if (inputs.length > 0) {
    body.new_asset_settings.inputs = inputs;
  }

  if (staticRenditions) {
    body.new_asset_settings.static_renditions = [{ resolution: 'highest' }];
  }

  const response = await muxRequest({
    baseUrl: MUX_VIDEO_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: '/uploads',
    method: 'POST',
    body
  });

  return response?.data || null;
};

export const getMuxDirectUpload = async (uploadId) => {
  const credentials = getMuxVideoCredentials();
  const response = await muxRequest({
    baseUrl: MUX_VIDEO_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: `/uploads/${encodeURIComponent(uploadId)}`
  });
  return response?.data || null;
};

export const createMuxAssetTrack = async (assetId, body) => {
  const credentials = getMuxVideoCredentials();
  const response = await muxRequest({
    baseUrl: MUX_VIDEO_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: `/assets/${encodeURIComponent(assetId)}/tracks`,
    method: 'POST',
    body
  });
  return response?.data || null;
};

export const generateMuxTrackSubtitles = async ({ assetId, trackId, generatedSubtitles }) => {
  const credentials = getMuxVideoCredentials();
  const response = await muxRequest({
    baseUrl: MUX_VIDEO_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: `/assets/${encodeURIComponent(assetId)}/tracks/${encodeURIComponent(trackId)}/generate-subtitles`,
    method: 'POST',
    body: {
      generated_subtitles: Array.isArray(generatedSubtitles) ? generatedSubtitles : []
    }
  });
  return response?.data || [];
};

export const getMuxAsset = async (assetId) => {
  const credentials = getMuxVideoCredentials();
  const response = await muxRequest({
    baseUrl: MUX_VIDEO_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: `/assets/${encodeURIComponent(assetId)}`
  });
  return response?.data || null;
};

export const buildMuxPlaybackLinks = (playbackId) => {
  const normalizedPlaybackId = safeString(playbackId).trim();
  if (!normalizedPlaybackId) {
    return {
      manifest_url: null,
      thumbnail_url: null,
      preview_url: null
    };
  }

  return {
    manifest_url: `https://stream.mux.com/${normalizedPlaybackId}.m3u8`,
    thumbnail_url: `https://image.mux.com/${normalizedPlaybackId}/thumbnail.webp?fit_mode=preserve&width=720`,
    preview_url: `https://image.mux.com/${normalizedPlaybackId}/animated.gif?width=360&end=2`
  };
};

export const getMuxAssetPlaybackId = (asset) => {
  const playbackIds = Array.isArray(asset?.playback_ids) ? asset.playback_ids : [];
  const primary = playbackIds.find((entry) => safeString(entry?.policy).trim().toLowerCase() === 'public')
    || playbackIds[0]
    || null;
  return safeString(primary?.id || '').trim() || null;
};

export const getMuxAssetDimensions = (asset) => {
  const tracks = Array.isArray(asset?.tracks) ? asset.tracks : [];
  const videoTrack = tracks.find((track) => safeString(track?.type).trim().toLowerCase() === 'video') || null;
  const durationSeconds = Number(asset?.duration);
  const width = Number(videoTrack?.max_width || 0);
  const height = Number(videoTrack?.max_height || 0);
  const fps = Number(videoTrack?.max_frame_rate || 0);

  return {
    duration_ms: Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 1000) : 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
    fps: Number.isFinite(fps) ? fps : 0
  };
};

export const getMuxAssetTracks = (asset, type) => {
  const tracks = Array.isArray(asset?.tracks) ? asset.tracks : [];
  if (!type) return tracks;
  const normalizedType = safeString(type).trim().toLowerCase();
  return tracks.filter((track) => safeString(track?.type).trim().toLowerCase() === normalizedType);
};

export const getMuxTextTracks = (asset) =>
  getMuxAssetTracks(asset, 'text')
    .map((track) => ({
      id: safeString(track?.id).trim(),
      name: safeString(track?.name).trim(),
      language_code: safeString(track?.language_code).trim() || 'en',
      text_source: safeString(track?.text_source).trim(),
      text_type: safeString(track?.text_type).trim() || 'subtitles',
      status: safeString(track?.status).trim(),
      closed_captions: Boolean(track?.closed_captions)
    }))
    .filter((track) => track.id);

export const getMuxPrimaryAudioTrack = (asset) => {
  const audioTracks = getMuxAssetTracks(asset, 'audio');
  return audioTracks.find((track) => Boolean(track?.primary))
    || audioTracks[0]
    || null;
};

export const buildMuxTextTrackUrls = ({ playbackId, trackId }) => {
  const normalizedPlaybackId = safeString(playbackId).trim();
  const normalizedTrackId = safeString(trackId).trim();
  if (!normalizedPlaybackId || !normalizedTrackId) {
    return {
      transcript_url: null,
      vtt_url: null
    };
  }

  const base = `https://stream.mux.com/${normalizedPlaybackId}/text/${normalizedTrackId}`;
  return {
    transcript_url: `${base}.txt`,
    vtt_url: `${base}.vtt`
  };
};

export const fetchMuxOverallMetric = async ({
  metricId,
  filters = [],
  measurement,
  timeframe = ['30:days']
}) => {
  const credentials = getMuxDataCredentials();
  if (!credentials.configured) return null;

  const response = await muxRequest({
    baseUrl: MUX_DATA_API_BASE,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    path: `/metrics/${encodeURIComponent(metricId)}/overall`,
    searchParams: {
      'timeframe[]': timeframe,
      'filters[]': filters,
      ...(measurement ? { measurement } : {})
    }
  });

  return parseJsonObject(response?.data);
};
