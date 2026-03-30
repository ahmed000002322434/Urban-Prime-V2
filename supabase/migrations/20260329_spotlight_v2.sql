-- Prime Spotlight V2 foundation schema
begin;

-- Spotlight enums
DO $$ BEGIN
  CREATE TYPE public.spotlight_media_type AS ENUM ('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.spotlight_visibility AS ENUM ('public', 'followers', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.spotlight_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Extend existing notification enum with social events.
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'social_like';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'social_comment';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'social_follow';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Canonical spotlight content
CREATE TABLE IF NOT EXISTS public.spotlight_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_type public.spotlight_media_type NOT NULL,
  media_url text NOT NULL,
  thumbnail_url text,
  caption text NOT NULL DEFAULT '',
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  interest_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility public.spotlight_visibility NOT NULL DEFAULT 'public',
  allow_comments boolean NOT NULL DEFAULT true,
  status public.spotlight_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  feed_score numeric(14, 4) NOT NULL DEFAULT 0,
  trending_score numeric(14, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spotlight_content_hashtags_array CHECK (jsonb_typeof(hashtags) = 'array'),
  CONSTRAINT spotlight_content_interest_tags_array CHECK (jsonb_typeof(interest_tags) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_spotlight_content_creator ON public.spotlight_content(creator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_content_status_visibility ON public.spotlight_content(status, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_content_feed_rank ON public.spotlight_content(feed_score DESC, published_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_content_trending_rank ON public.spotlight_content(trending_score DESC, published_at DESC, id DESC);

DROP TRIGGER IF EXISTS set_spotlight_content_updated_at ON public.spotlight_content;
CREATE TRIGGER set_spotlight_content_updated_at
BEFORE UPDATE ON public.spotlight_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aggregated metrics
CREATE TABLE IF NOT EXISTS public.spotlight_metrics (
  content_id uuid PRIMARY KEY REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  views bigint NOT NULL DEFAULT 0,
  watch_time_ms bigint NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  dislikes integer NOT NULL DEFAULT 0,
  reposts integer NOT NULL DEFAULT 0,
  engagement_rate numeric(10, 4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_spotlight_metrics_updated_at ON public.spotlight_metrics;
CREATE TRIGGER set_spotlight_metrics_updated_at
BEFORE UPDATE ON public.spotlight_metrics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- View event tracking with 30-minute dedupe key
CREATE TABLE IF NOT EXISTS public.spotlight_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  viewer_session_key text NOT NULL,
  view_type public.spotlight_media_type NOT NULL,
  watch_time_ms bigint NOT NULL DEFAULT 0,
  dedupe_key text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spotlight_views_dedupe ON public.spotlight_views(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_spotlight_views_content_time ON public.spotlight_views(content_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_views_viewer_time ON public.spotlight_views(viewer_session_key, viewed_at DESC);

-- Likes
CREATE TABLE IF NOT EXISTS public.spotlight_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spotlight_likes_unique ON public.spotlight_likes(content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_spotlight_likes_user ON public.spotlight_likes(user_id, created_at DESC);

-- Dislikes / not-interested signals
CREATE TABLE IF NOT EXISTS public.spotlight_dislikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spotlight_dislikes_unique ON public.spotlight_dislikes(content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_spotlight_dislikes_user ON public.spotlight_dislikes(user_id, created_at DESC);

-- Reposts / reshares
ALTER TABLE public.spotlight_content ADD COLUMN IF NOT EXISTS reposted_from_content_id uuid REFERENCES public.spotlight_content(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.spotlight_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  reposted_content_id uuid REFERENCES public.spotlight_content(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spotlight_reposts_unique ON public.spotlight_reposts(source_content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_spotlight_reposts_user ON public.spotlight_reposts(user_id, created_at DESC);

-- Unified saves
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  content_type text NOT NULL DEFAULT 'spotlight',
  saved_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_items_unique ON public.saved_items(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_time ON public.saved_items(user_id, saved_at DESC);

-- Threaded comments
CREATE TABLE IF NOT EXISTS public.spotlight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.spotlight_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spotlight_comments_content ON public.spotlight_comments(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_comments_parent ON public.spotlight_comments(parent_comment_id, created_at ASC);

DROP TRIGGER IF EXISTS set_spotlight_comments_updated_at ON public.spotlight_comments;
CREATE TRIGGER set_spotlight_comments_updated_at
BEFORE UPDATE ON public.spotlight_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.spotlight_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.spotlight_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spotlight_comment_likes_unique ON public.spotlight_comment_likes(comment_id, user_id);

-- Moderation safety net
CREATE TABLE IF NOT EXISTS public.spotlight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.spotlight_content(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.spotlight_comments(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spotlight_reports_status ON public.spotlight_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_user_id <> blocked_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_blocks_unique ON public.user_blocks(blocker_user_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restrictor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restricted_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_restrictions_no_self_restrict CHECK (restrictor_user_id <> restricted_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_restrictions_unique ON public.user_restrictions(restrictor_user_id, restricted_user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_target ON public.user_restrictions(restricted_user_id, created_at DESC);

-- Creator identity fields
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS posts_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS reels_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS interest_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Scoring functions
CREATE OR REPLACE FUNCTION public.spotlight_time_decay_multiplier(p_published_at timestamptz)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  age_hours numeric;
BEGIN
  IF p_published_at IS NULL THEN
    RETURN 0.25;
  END IF;

  age_hours := EXTRACT(EPOCH FROM (now() - p_published_at)) / 3600;

  IF age_hours <= 24 THEN
    RETURN 1.35;
  ELSIF age_hours <= 72 THEN
    RETURN 1.00;
  ELSIF age_hours <= 168 THEN
    RETURN 0.60;
  END IF;

  RETURN 0.25;
END;
$$;

CREATE OR REPLACE FUNCTION public.spotlight_engagement_points(
  p_likes integer,
  p_comments integer,
  p_saves integer,
  p_shares integer,
  p_views bigint,
  p_watch_time_ms bigint
)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT (
    COALESCE(p_likes, 0) * 4
    + COALESCE(p_comments, 0) * 6
    + COALESCE(p_saves, 0) * 5
    + COALESCE(p_shares, 0) * 7
    + LN(COALESCE(p_views, 0) + 1)
    + LEAST(COALESCE(p_watch_time_ms, 0)::numeric / 30000, 3)
  )::numeric;
$$;

CREATE OR REPLACE FUNCTION public.spotlight_recompute_metrics(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_published_at timestamptz;
  v_views bigint := 0;
  v_watch_time bigint := 0;
  v_likes integer := 0;
  v_comments integer := 0;
  v_saves integer := 0;
  v_shares integer := 0;
  v_dislikes integer := 0;
  v_reposts integer := 0;
  v_points numeric := 0;
  v_decay numeric := 0;
  v_feed numeric := 0;
  v_trending numeric := 0;
  v_engagement_rate numeric := 0;
BEGIN
  SELECT published_at
  INTO v_published_at
  FROM public.spotlight_content
  WHERE id = p_content_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(watch_time_ms), 0)
  INTO v_views, v_watch_time
  FROM public.spotlight_views
  WHERE content_id = p_content_id;

  SELECT COUNT(*)
  INTO v_likes
  FROM public.spotlight_likes
  WHERE content_id = p_content_id;

  SELECT COUNT(*)
  INTO v_comments
  FROM public.spotlight_comments
  WHERE content_id = p_content_id AND status = 'active';

  SELECT COUNT(*)
  INTO v_saves
  FROM public.saved_items
  WHERE content_id = p_content_id AND content_type = 'spotlight';

  SELECT COALESCE(shares, 0)
  INTO v_shares
  FROM public.spotlight_metrics
  WHERE content_id = p_content_id;

  SELECT COUNT(*)
  INTO v_dislikes
  FROM public.spotlight_dislikes
  WHERE content_id = p_content_id;

  SELECT COUNT(*)
  INTO v_reposts
  FROM public.spotlight_reposts
  WHERE source_content_id = p_content_id;

  v_points := public.spotlight_engagement_points(v_likes, v_comments, v_saves, v_shares, v_views, v_watch_time);
  v_decay := public.spotlight_time_decay_multiplier(v_published_at);
  v_feed := ROUND(v_points * v_decay, 4);
  v_trending := ROUND(v_points * CASE WHEN (EXTRACT(EPOCH FROM (now() - COALESCE(v_published_at, now()))) / 3600) <= 72 THEN 1.20 ELSE 0.70 END, 4);

  IF v_views > 0 THEN
    v_engagement_rate := ROUND((((v_likes + v_comments + v_saves + v_shares + v_reposts)::numeric) / GREATEST(v_views::numeric, 1)) * 100, 4);
  ELSE
    v_engagement_rate := 0;
  END IF;

  INSERT INTO public.spotlight_metrics (
    content_id,
    views,
    watch_time_ms,
    likes,
    comments,
    saves,
    shares,
    dislikes,
    reposts,
    engagement_rate,
    updated_at
  ) VALUES (
    p_content_id,
    v_views,
    v_watch_time,
    v_likes,
    v_comments,
    v_saves,
    COALESCE(v_shares, 0),
    v_dislikes,
    v_reposts,
    v_engagement_rate,
    now()
  )
  ON CONFLICT (content_id)
  DO UPDATE SET
    views = EXCLUDED.views,
    watch_time_ms = EXCLUDED.watch_time_ms,
    likes = EXCLUDED.likes,
    comments = EXCLUDED.comments,
    saves = EXCLUDED.saves,
    shares = COALESCE(public.spotlight_metrics.shares, EXCLUDED.shares),
    dislikes = EXCLUDED.dislikes,
    reposts = EXCLUDED.reposts,
    engagement_rate = EXCLUDED.engagement_rate,
    updated_at = now();

  UPDATE public.spotlight_content
  SET
    feed_score = v_feed,
    trending_score = v_trending,
    updated_at = now()
  WHERE id = p_content_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.spotlight_recompute_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_content_id uuid;
BEGIN
  v_content_id := COALESCE(NEW.content_id, OLD.content_id, NEW.id, OLD.id);
  PERFORM public.spotlight_recompute_metrics(v_content_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS spotlight_recompute_on_likes ON public.spotlight_likes;
CREATE TRIGGER spotlight_recompute_on_likes
AFTER INSERT OR DELETE ON public.spotlight_likes
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_dislikes ON public.spotlight_dislikes;
CREATE TRIGGER spotlight_recompute_on_dislikes
AFTER INSERT OR DELETE ON public.spotlight_dislikes
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_saves ON public.saved_items;
CREATE TRIGGER spotlight_recompute_on_saves
AFTER INSERT OR DELETE ON public.saved_items
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_comments ON public.spotlight_comments;
CREATE TRIGGER spotlight_recompute_on_comments
AFTER INSERT OR DELETE OR UPDATE OF status ON public.spotlight_comments
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_views ON public.spotlight_views;
CREATE TRIGGER spotlight_recompute_on_views
AFTER INSERT OR UPDATE OF watch_time_ms ON public.spotlight_views
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_content_publish ON public.spotlight_content;
CREATE TRIGGER spotlight_recompute_on_content_publish
AFTER INSERT OR UPDATE OF published_at, status ON public.spotlight_content
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

DROP TRIGGER IF EXISTS spotlight_recompute_on_reposts ON public.spotlight_reposts;
CREATE TRIGGER spotlight_recompute_on_reposts
AFTER INSERT OR DELETE ON public.spotlight_reposts
FOR EACH ROW EXECUTE FUNCTION public.spotlight_recompute_trigger();

-- Keep comment like_count in sync.
CREATE OR REPLACE FUNCTION public.spotlight_refresh_comment_like_count(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.spotlight_comment_likes
  WHERE comment_id = p_comment_id;

  UPDATE public.spotlight_comments
  SET like_count = v_count,
      updated_at = now()
  WHERE id = p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.spotlight_comment_like_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.spotlight_refresh_comment_like_count(COALESCE(NEW.comment_id, OLD.comment_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS spotlight_comment_like_count_trigger ON public.spotlight_comment_likes;
CREATE TRIGGER spotlight_comment_like_count_trigger
AFTER INSERT OR DELETE ON public.spotlight_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.spotlight_comment_like_trigger();

-- Compatibility backfill wrappers (execute only when legacy tables exist).
DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.spotlight_content (
        creator_user_id,
        media_type,
        media_url,
        thumbnail_url,
        caption,
        hashtags,
        visibility,
        allow_comments,
        status,
        published_at,
        created_at,
        updated_at
      )
      SELECT
        u.id,
        'image'::public.spotlight_media_type,
        COALESCE(p.image_url, ''),
        COALESCE(p.image_url, ''),
        COALESCE(p.caption, ''),
        '[]'::jsonb,
        'public'::public.spotlight_visibility,
        true,
        CASE
          WHEN COALESCE(p.status, 'published') = 'draft' THEN 'draft'::public.spotlight_status
          WHEN COALESCE(p.status, 'published') = 'archived' THEN 'archived'::public.spotlight_status
          ELSE 'published'::public.spotlight_status
        END,
        COALESCE(p.created_at, now()),
        COALESCE(p.created_at, now()),
        COALESCE(p.created_at, now())
      FROM public.posts p
      JOIN public.users u ON u.firebase_uid = p.creator_id
      WHERE COALESCE(p.image_url, '') <> ''
      ON CONFLICT DO NOTHING
    $sql$;
  END IF;

  IF to_regclass('public.reels') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.spotlight_content (
        creator_user_id,
        media_type,
        media_url,
        thumbnail_url,
        caption,
        hashtags,
        visibility,
        allow_comments,
        status,
        published_at,
        created_at,
        updated_at
      )
      SELECT
        u.id,
        'video'::public.spotlight_media_type,
        COALESCE(r.video_url, ''),
        COALESCE(r.cover_image_url, ''),
        COALESCE(r.caption, ''),
        COALESCE(r.hashtags, '[]'::jsonb),
        CASE
          WHEN COALESCE(r.visibility, 'public') = 'followers' THEN 'followers'::public.spotlight_visibility
          WHEN COALESCE(r.visibility, 'public') = 'private' THEN 'private'::public.spotlight_visibility
          ELSE 'public'::public.spotlight_visibility
        END,
        COALESCE(r.allow_comments, true),
        CASE
          WHEN COALESCE(r.status, 'published') = 'draft' THEN 'draft'::public.spotlight_status
          WHEN COALESCE(r.status, 'published') = 'archived' THEN 'archived'::public.spotlight_status
          ELSE 'published'::public.spotlight_status
        END,
        COALESCE(r.created_at, now()),
        COALESCE(r.created_at, now()),
        COALESCE(r.created_at, now())
      FROM public.reels r
      JOIN public.users u ON u.firebase_uid = r.creator_id
      WHERE COALESCE(r.video_url, '') <> ''
      ON CONFLICT DO NOTHING
    $sql$;
  END IF;
END
$$;

-- Best-effort saved state migration to unified saved_items.
DO $$
BEGIN
  IF to_regclass('public.saved_posts') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_posts' AND column_name = 'user_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_posts' AND column_name = 'content_id'
    ) THEN
      EXECUTE $sql$
        INSERT INTO public.saved_items (user_id, content_id, content_type, saved_at)
        SELECT
          sp.user_id,
          sp.content_id,
          'spotlight',
          now()
        FROM public.saved_posts sp
        JOIN public.spotlight_content sc ON sc.id = sp.content_id
        ON CONFLICT (user_id, content_id) DO NOTHING
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.saved_reels') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_reels' AND column_name = 'user_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_reels' AND column_name = 'content_id'
    ) THEN
      EXECUTE $sql$
        INSERT INTO public.saved_items (user_id, content_id, content_type, saved_at)
        SELECT
          sr.user_id,
          sr.content_id,
          'spotlight',
          now()
        FROM public.saved_reels sr
        JOIN public.spotlight_content sc ON sc.id = sr.content_id
        ON CONFLICT (user_id, content_id) DO NOTHING
      $sql$;
    END IF;
  END IF;
END
$$;

-- Initialize metrics rows for existing content.
INSERT INTO public.spotlight_metrics (content_id)
SELECT sc.id
FROM public.spotlight_content sc
LEFT JOIN public.spotlight_metrics sm ON sm.content_id = sc.id
WHERE sm.content_id IS NULL;

-- Recompute scores for all content once migration finishes.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.spotlight_content LOOP
    PERFORM public.spotlight_recompute_metrics(r.id);
  END LOOP;
END
$$;

commit;

