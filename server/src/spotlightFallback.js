import { createHash } from 'crypto';

const now = Date.now();
const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

const hashNumber = (seed, min, max) => {
  const digest = createHash('sha1').update(String(seed)).digest('hex').slice(0, 8);
  const value = Number.parseInt(digest, 16);
  const range = Math.max(1, max - min + 1);
  return min + (value % range);
};

const creators = [
  {
    id: 'mock-creator-maya',
    firebase_uid: 'mock-creator-maya-firebase',
    name: 'Maya Nova',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    is_verified: true,
    followers_count: hashNumber('maya-followers', 24000, 141000),
    following_count: hashNumber('maya-following', 90, 420),
    posts_count: 12,
    reels_count: 7
  },
  {
    id: 'mock-creator-ari',
    firebase_uid: 'mock-creator-ari-firebase',
    name: 'Ari Stone',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    is_verified: false,
    followers_count: hashNumber('ari-followers', 18000, 118000),
    following_count: hashNumber('ari-following', 70, 280),
    posts_count: 9,
    reels_count: 6
  },
  {
    id: 'mock-creator-zane',
    firebase_uid: 'mock-creator-zane-firebase',
    name: 'Zane Bloom',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    is_verified: false,
    followers_count: hashNumber('zane-followers', 12000, 96000),
    following_count: hashNumber('zane-following', 60, 260),
    posts_count: 8,
    reels_count: 5
  },
  {
    id: 'mock-creator-lina',
    firebase_uid: 'mock-creator-lina-firebase',
    name: 'Lina Vega',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    is_verified: true,
    followers_count: hashNumber('lina-followers', 31000, 153000),
    following_count: hashNumber('lina-following', 110, 380),
    posts_count: 11,
    reels_count: 8
  }
];

const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

const buildMetrics = (seed, likes, comments, saves, shares, views) => ({
  views,
  watch_time_ms: Math.floor(views * (seed.includes('video') ? 1600 : 900)),
  likes,
  comments,
  saves,
  shares,
  engagement_rate: Number(((likes + comments + saves + shares) / Math.max(views, 1)).toFixed(3))
});

const createItem = ({
  id,
  creator_user_id,
  media_type,
  media_url,
  thumbnail_url,
  caption,
  hashtags,
  interest_tags,
  createdDaysAgo,
  likes,
  comments,
  saves,
  shares,
  views,
  feed_score,
  trending_score
}) => ({
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
  feed_score,
  trending_score,
  created_at: daysAgo(createdDaysAgo),
  updated_at: daysAgo(createdDaysAgo),
  metrics: buildMetrics(id, likes, comments, saves, shares, views),
  creator: creatorById.get(creator_user_id) || null
});

const items = [
  createItem({
    id: 'mock-spotlight-1',
    creator_user_id: 'mock-creator-maya',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1400&q=80',
    thumbnail_url: null,
    caption: 'A chrome-soft launch frame for the new season. Clean textures, calm energy, premium finish.',
    hashtags: ['design', 'style', 'launch'],
    interest_tags: ['fashion', 'premium', 'creative'],
    createdDaysAgo: 0,
    likes: 1842,
    comments: 128,
    saves: 412,
    shares: 95,
    views: 22000,
    feed_score: 172.4,
    trending_score: 201.8
  }),
  createItem({
    id: 'mock-spotlight-2',
    creator_user_id: 'mock-creator-ari',
    media_type: 'video',
    media_url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1400&q=80',
    caption: 'Fast-cut product storyboards designed to feel cinematic from the first second.',
    hashtags: ['video', 'story', 'brand'],
    interest_tags: ['video', 'media', 'creator'],
    createdDaysAgo: 1,
    likes: 973,
    comments: 64,
    saves: 203,
    shares: 58,
    views: 14500,
    feed_score: 143.1,
    trending_score: 175.2
  }),
  createItem({
    id: 'mock-spotlight-3',
    creator_user_id: 'mock-creator-zane',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=80',
    thumbnail_url: null,
    caption: 'City light reflections, motion blur, and a little future-forward mood.',
    hashtags: ['city', 'night', 'aesthetic'],
    interest_tags: ['tech', 'travel', 'lifestyle'],
    createdDaysAgo: 2,
    likes: 1320,
    comments: 94,
    saves: 287,
    shares: 71,
    views: 18400,
    feed_score: 158.2,
    trending_score: 182.1
  }),
  createItem({
    id: 'mock-spotlight-4',
    creator_user_id: 'mock-creator-lina',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1400&q=80',
    thumbnail_url: null,
    caption: 'Minimal layers, warm whites, and high contrast details for a clean editorial grid.',
    hashtags: ['editorial', 'clean', 'premium'],
    interest_tags: ['fashion', 'editorial', 'lookbook'],
    createdDaysAgo: 3,
    likes: 644,
    comments: 37,
    saves: 111,
    shares: 29,
    views: 9600,
    feed_score: 121.8,
    trending_score: 129.4
  }),
  createItem({
    id: 'mock-spotlight-5',
    creator_user_id: 'mock-creator-maya',
    media_type: 'video',
    media_url: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80',
    caption: 'Swipe-worthy motion for the new drop reveal.',
    hashtags: ['reveal', 'motion', 'drop'],
    interest_tags: ['video', 'launch', 'drops'],
    createdDaysAgo: 5,
    likes: 1012,
    comments: 83,
    saves: 164,
    shares: 42,
    views: 12800,
    feed_score: 136.3,
    trending_score: 162.6
  }),
  createItem({
    id: 'mock-spotlight-6',
    creator_user_id: 'mock-creator-lina',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1400&q=80',
    thumbnail_url: null,
    caption: 'Warm shadows, polished typography, and a feed card that feels more like a magazine spread.',
    hashtags: ['type', 'magazine', 'ux'],
    interest_tags: ['design', 'ui', 'product'],
    createdDaysAgo: 7,
    likes: 534,
    comments: 25,
    saves: 102,
    shares: 18,
    views: 7100,
    feed_score: 114.8,
    trending_score: 115.3
  })
];

const normalize = (value) => String(value || '').trim().toLowerCase();
const clone = (value) => JSON.parse(JSON.stringify(value));

const sortItems = (mode) => clone(items).sort((left, right) => {
  if (mode === 'latest') {
    return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
  }
  if (mode === 'trending') {
    const rightScore = Number(right.trending_score || 0) + Number(right.metrics.likes || 0) * 0.02;
    const leftScore = Number(left.trending_score || 0) + Number(left.metrics.likes || 0) * 0.02;
    if (rightScore !== leftScore) return rightScore - leftScore;
  }
  const scoreDiff = Number(right.feed_score || 0) - Number(left.feed_score || 0);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
});

const mapItemForProfile = (item) => clone(item);

const buildProfile = (creator, tab, itemsForProfile, isSelf = false) => ({
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
  is_self: isSelf,
  is_following: false,
  tab,
  counts: {
    posts: itemsForProfile.filter((item) => item.media_type === 'image').length,
    media: itemsForProfile.filter((item) => item.media_type === 'video').length,
    likes: itemsForProfile.reduce((acc, item) => acc + Number(item.metrics.likes || 0), 0),
    saved: 0
  },
  items: clone(itemsForProfile),
  next_cursor: null,
  has_more: false
});

export const isSpotlightBackendUnavailableError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('backend unavailable') ||
    message.includes('enotfound') ||
    message.includes('networkerror') ||
    message.includes('getaddrinfo') ||
    message.includes('ecconnrefused') ||
    message.includes('socket hang up') ||
    message.includes('timed out')
  );
};

export const buildMockSpotlightFeedResponse = ({ mode = 'for_you', limit = 25 } = {}) => {
  const normalizedMode = mode === 'trending' ? 'trending' : mode === 'following' ? 'following' : 'for_you';
  const rows = normalizedMode === 'following'
    ? sortItems('latest').filter((item) => item.creator_user_id === 'mock-creator-maya' || item.creator_user_id === 'mock-creator-lina')
    : sortItems(normalizedMode === 'trending' ? 'trending' : 'for_you');
  const pageRows = rows.slice(0, Math.max(1, limit));
  return {
    data: clone(pageRows),
    next_cursor: null,
    has_more: rows.length > pageRows.length,
    mode: normalizedMode
  };
};

export const buildMockSpotlightContentResponse = (contentId) => clone(items.find((item) => item.id === contentId) || items[0] || null);

export const buildMockSuggestedUsersResponse = ({ limit = 8 } = {}) =>
  clone(creators.slice(0, Math.max(1, limit)));

export const buildMockSpotlightProfileResponse = ({ username, tab = 'posts' } = {}) => {
  const needle = normalize(username);
  const creator = creators.find((entry) => normalize(entry.name) === needle || normalize(entry.firebase_uid) === needle) || creators[0];
  const creatorItems = items.filter((item) => item.creator_user_id === creator.id).map(mapItemForProfile);
  let filteredItems = creatorItems;
  if (tab === 'media') filteredItems = creatorItems.filter((item) => item.media_type === 'video');
  if (tab === 'likes' || tab === 'saved') filteredItems = creatorItems.slice(0, 3);
  return buildProfile(creator, tab, filteredItems, false);
};
