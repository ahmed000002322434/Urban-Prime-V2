import type {
  SpotlightComment,
  SpotlightCreator,
  SpotlightFeedMode,
  SpotlightItem,
  SpotlightProfile,
  SpotlightProfileResponse
} from './spotlightService';

type MockState = {
  creators: SpotlightCreator[];
  items: SpotlightItem[];
  commentsByContentId: Map<string, SpotlightComment[]>;
};

const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
const hashSeed = (value: string) => Array.from(String(value || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0);
const seededNumber = (seed: string, min: number, max: number) => {
  const span = Math.max(1, max - min + 1);
  return min + (hashSeed(seed) % span);
};

const createCreator = (id: string, name: string, avatar_url: string, is_verified = false): SpotlightCreator => ({
  id,
  firebase_uid: `${id}-firebase`,
  name,
  avatar_url,
  is_verified,
  followers_count: seededNumber(`${id}:followers`, 18_000, 142_000),
  following_count: seededNumber(`${id}:following`, 120, 920),
  posts_count: 8,
  reels_count: 4
});

const creators = [
  createCreator('creator-maya', 'Maya Nova', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', true),
  createCreator('creator-ari', 'Ari Stone', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80'),
  createCreator('creator-zane', 'Zane Bloom', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80'),
  createCreator('creator-lina', 'Lina Vega', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', true)
];

const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

const buildMetrics = (likes: number, comments: number, saves: number, shares: number, views: number) => ({
  views,
  watch_time_ms: Math.floor(views * 1400),
  likes,
  comments,
  saves,
  shares,
  engagement_rate: Number(((likes + comments + saves + shares) / Math.max(views, 1)).toFixed(3))
});

const createItem = (
  id: string,
  creator_user_id: string,
  media_type: 'image' | 'video',
  media_url: string,
  thumbnail_url: string | null,
  caption: string,
  hashtags: string[],
  interest_tags: string[],
  createdDaysAgo: number,
  likes: number,
  comments: number,
  saves: number,
  shares: number,
  views: number
): SpotlightItem => ({
  id,
  creator_user_id,
  media_type,
  media_url,
  thumbnail_url,
  caption,
  hashtags,
  interest_tags,
  visibility: 'public',
  allow_comments: true,
  status: 'published',
  published_at: daysAgo(createdDaysAgo),
  feed_score: 75 + likes * 4 + comments * 6 + saves * 5 + shares * 7,
  trending_score: 50 + likes * 6 + comments * 4 + shares * 8,
  final_score: 0,
  created_at: daysAgo(createdDaysAgo),
  updated_at: daysAgo(createdDaysAgo),
  metrics: buildMetrics(likes, comments, saves, shares, views),
  creator: creatorById.get(creator_user_id) || null
});

const items = [
  createItem(
    'sp-1',
    'creator-maya',
    'image',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1400&q=80',
    null,
    'A soft chrome palette for the new season. Clean textures, calm energy, premium finish.',
    ['design', 'style', 'launch'],
    ['fashion', 'premium', 'creative'],
    0,
    1842,
    128,
    412,
    95,
    22_000
  ),
  createItem(
    'sp-2',
    'creator-ari',
    'video',
    'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1400&q=80',
    'Fast-cut product storyboards for a sharper Spotlight feed.',
    ['video', 'story', 'brand'],
    ['video', 'media', 'creator'],
    1,
    973,
    64,
    203,
    58,
    14_500
  ),
  createItem(
    'sp-3',
    'creator-zane',
    'image',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=80',
    null,
    'City light reflections, motion blur, and a little future-forward mood.',
    ['city', 'night', 'aesthetic'],
    ['tech', 'travel', 'lifestyle'],
    2,
    1320,
    94,
    287,
    71,
    18_400
  ),
  createItem(
    'sp-4',
    'creator-lina',
    'image',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1400&q=80',
    null,
    'Minimal layers, warm whites, and high contrast details for a clean editorial grid.',
    ['editorial', 'clean', 'premium'],
    ['fashion', 'editorial', 'lookbook'],
    3,
    644,
    37,
    111,
    29,
    9_600
  ),
  createItem(
    'sp-5',
    'creator-maya',
    'video',
    'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80',
    'Swipe-worthy motion for the new drop reveal.',
    ['reveal', 'motion', 'drop'],
    ['video', 'launch', 'drops'],
    5,
    1012,
    83,
    164,
    42,
    12_800
  ),
  createItem(
    'sp-6',
    'creator-lina',
    'image',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1400&q=80',
    null,
    'Warm shadows, polished typography, and a feed card that feels more like a magazine spread.',
    ['type', 'magazine', 'ux'],
    ['design', 'ui', 'product'],
    7,
    534,
    25,
    102,
    18,
    7_100
  ),
  createItem(
    'sp-7',
    'creator-ari',
    'video',
    'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80',
    'A behind-the-scenes cut with layered transitions and a sharper tempo.',
    ['behindthescenes', 'motion', 'edit'],
    ['video', 'editing', 'creator'],
    4,
    781,
    52,
    145,
    33,
    11_200
  ),
  createItem(
    'sp-8',
    'creator-maya',
    'image',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1400&q=80',
    null,
    'Moodboard fragments, neon air, and a polished composition that still feels human.',
    ['moodboard', 'neon', 'creative'],
    ['design', 'art', 'launch'],
    6,
    908,
    71,
    188,
    44,
    10_400
  )
];

const comment = (
  id: string,
  content_id: string,
  user: { id: string; name: string; avatar_url: string; is_verified?: boolean },
  body: string,
  createdAt: string,
  parent_comment_id: string | null = null
): SpotlightComment => ({
  id,
  content_id,
  user_id: user.id,
  parent_comment_id,
  body,
  status: 'active',
  like_count: seededNumber(`${id}:${body}`, 2, 24),
  reply_count: 0,
  liked_by_viewer: false,
  can_delete: true,
  created_at: createdAt,
  updated_at: createdAt,
  user: {
    id: user.id,
    firebase_uid: `${user.id}-firebase`,
    name: user.name,
    avatar_url: user.avatar_url,
    is_verified: Boolean(user.is_verified)
  },
  replies: []
});

const commentsByContentId = new Map<string, SpotlightComment[]>([
  ['sp-1', [
    comment('c-1', 'sp-1', { id: 'viewer-1', name: 'Nadia', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' }, 'The gradient on this one feels expensive.', daysAgo(0.15)),
    comment('c-2', 'sp-1', { id: 'viewer-2', name: 'Owen', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' }, 'This is exactly the direction the feed needed.', daysAgo(0.1))
  ]],
  ['sp-2', [
    comment('c-3', 'sp-2', { id: 'viewer-3', name: 'Mina', avatar_url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&q=80' }, 'The pacing on this clip is so smooth.', daysAgo(0.4))
  ]],
  ['sp-3', [
    comment('c-4', 'sp-3', { id: 'viewer-4', name: 'Tariq', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' }, 'This should be on a billboard.', daysAgo(1.1))
  ]]
]);

const state: MockState = {
  creators,
  items,
  commentsByContentId
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const normalize = (value: string) => String(value || '').trim().toLowerCase();

const ensureCommentList = (contentId: string) => {
  if (!state.commentsByContentId.has(contentId)) {
    state.commentsByContentId.set(contentId, []);
  }
  return state.commentsByContentId.get(contentId) || [];
};

const buildProfile = (creator: SpotlightCreator, tab: SpotlightProfileResponse['tab'], itemsForProfile: SpotlightItem[], savedCount = 0): SpotlightProfileResponse => ({
  profile: {
    id: creator.id,
    firebase_uid: creator.firebase_uid,
    name: creator.name,
    avatar_url: creator.avatar_url,
    bio: `A premium Spotlight creator profile for ${creator.name}.`,
    about: `A premium Spotlight creator profile for ${creator.name}.`,
    followers_count: creator.followers_count,
    following_count: creator.following_count,
    posts_count: creator.posts_count,
    reels_count: creator.reels_count,
    is_verified: creator.is_verified,
    username: creator.name
  },
  is_self: false,
  is_following: false,
  followers_preview: clone(state.creators.filter((entry) => entry.id !== creator.id).slice(0, 4)),
  following_preview: clone(state.creators.filter((entry) => entry.id !== creator.id).slice(1, 5)),
  tab,
  counts: {
    posts: itemsForProfile.filter((item) => item.media_type === 'image').length,
    media: itemsForProfile.filter((item) => item.media_type === 'video').length,
    likes: itemsForProfile.reduce((acc, item) => acc + Number(item.metrics.likes || 0), 0),
    saved: savedCount
  },
  items: clone(itemsForProfile),
  next_cursor: null,
  has_more: false
});

const applyRank = (rows: SpotlightItem[]) => clone(rows).sort((left, right) => {
  const scoreDiff = Number(right.metrics.likes || 0) + Number(right.metrics.comments || 0) + Number(right.metrics.saves || 0)
    - (Number(left.metrics.likes || 0) + Number(left.metrics.comments || 0) + Number(left.metrics.saves || 0));
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
});

export const getMockSpotlightFeed = (mode: SpotlightFeedMode, cursor?: string | null, limit = 18) => {
  const rows = mode === 'trending' ? applyRank(state.items) : clone(state.items);
  const sliced = rows.slice(0, limit);
  return { items: sliced, nextCursor: null, hasMore: rows.length > limit };
};

export const getMockSpotlightContent = (contentId: string) => clone(state.items.find((item) => item.id === contentId) || null);

export const getMockSpotlightComments = (contentId: string) => clone(ensureCommentList(contentId));

export const getMockSuggestedUsers = () => clone(state.creators.slice(0, 4));

export const getMockSpotlightProfile = (username: string, tab: SpotlightProfileResponse['tab'] = 'posts') => {
  const needle = normalize(username);
  const creator = state.creators.find((entry) => normalize(entry.name) === needle || normalize(entry.firebase_uid) === needle) || state.creators[0];
  const creatorItems = state.items.filter((item) => item.creator_user_id === creator.id);
  return buildProfile(creator, tab, creatorItems);
};

export const mockSpotlightLike = (contentId: string) => {
  const item = state.items.find((entry) => entry.id === contentId);
  if (!item) return { liked: true, likes: 0 };
  item.metrics.likes = Number(item.metrics.likes || 0) + 1;
  return { liked: true, likes: Number(item.metrics.likes || 0) };
};

export const mockSpotlightSave = (contentId: string) => {
  const item = state.items.find((entry) => entry.id === contentId);
  if (!item) return { saved: true, saves: 0 };
  item.metrics.saves = Number(item.metrics.saves || 0) + 1;
  return { saved: true, saves: Number(item.metrics.saves || 0) };
};

export const mockSpotlightShare = (contentId: string) => {
  const item = state.items.find((entry) => entry.id === contentId);
  if (!item) return { shares: 0 };
  item.metrics.shares = Number(item.metrics.shares || 0) + 1;
  return { shares: Number(item.metrics.shares || 0) };
};

export const mockSpotlightComment = (contentId: string, body: string, parentCommentId: string | null = null) => {
  const list = ensureCommentList(contentId);
  const nextComment: SpotlightComment = comment(
    `mock-${Date.now()}`,
    contentId,
    { id: 'viewer-local', name: 'You', avatar_url: '/icons/urbanprime.svg', is_verified: false },
    body,
    new Date().toISOString(),
    parentCommentId
  );
  if (parentCommentId) {
    const parent = list.find((entry) => entry.id === parentCommentId);
    if (parent) {
      parent.replies = [...(parent.replies || []), nextComment];
      parent.reply_count = Number(parent.reply_count || 0) + 1;
    } else {
      list.unshift(nextComment);
    }
  } else {
    list.unshift(nextComment);
  }
  const item = state.items.find((entry) => entry.id === contentId);
  if (item) item.metrics.comments = Number(item.metrics.comments || 0) + 1;
  return clone(nextComment);
};

export const mockSpotlightLikeComment = (commentId: string) => {
  for (const list of state.commentsByContentId.values()) {
    const target = list.find((entry) => entry.id === commentId) || list.flatMap((entry) => entry.replies || []).find((entry) => entry.id === commentId);
    if (target) {
      target.like_count = Number(target.like_count || 0) + 1;
      return { liked: true, like_count: Number(target.like_count || 0) };
    }
  }
  return { liked: true, like_count: 0 };
};

export const mockSpotlightFollow = () => ({ following: true });
export const mockSpotlightBlock = () => ({ blocked: true });
export const mockSpotlightReport = () => ({ reported: true });
export const mockSpotlightTrackView = () => ({ ok: true });
