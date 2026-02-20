-- ============================================================
-- YouTube Intelligence Tool — Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- NICHES
-- ============================================================
create table if not exists niches (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  keywords     text[] not null default '{}',
  color        text not null default '#6366f1',   -- UI accent color per niche
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- TRENDING VIDEOS
-- Captured from YouTube Data API — high-velocity videos in a niche
-- ============================================================
create table if not exists trending_videos (
  id                   uuid primary key default gen_random_uuid(),
  youtube_id           text not null unique,
  title                text not null,
  description          text,
  thumbnail_url        text,
  channel_id           text not null,
  channel_name         text not null,
  channel_subscribers  bigint not null default 0,
  view_count           bigint not null default 0,
  like_count           bigint not null default 0,
  comment_count        bigint not null default 0,
  published_at         timestamptz not null,
  -- Computed fields
  days_since_published float generated always as (
    extract(epoch from (now() - published_at)) / 86400
  ) stored,
  velocity_score       float not null default 0,
  -- Raw velocity = views / (subscribers * days)
  -- normalized to 0-100 scale within niche
  -- AI-extracted topic and summary
  core_topic           text,
  transcript_summary   text,
  -- Comment-extracted requests ("can you do a video on X")
  comment_requests     text[] default '{}',
  niche_id             uuid not null references niches(id) on delete cascade,
  captured_at          timestamptz not null default now()
);

create index if not exists idx_trending_videos_niche_id on trending_videos(niche_id);
create index if not exists idx_trending_videos_velocity on trending_videos(velocity_score desc);
create index if not exists idx_trending_videos_captured_at on trending_videos(captured_at desc);

-- ============================================================
-- TRENDS
-- Cross-referenced signals from YouTube + Twitter/X
-- ============================================================
create table if not exists trends (
  id               uuid primary key default gen_random_uuid(),
  topic            text not null,
  source           text not null check (source in ('youtube', 'twitter', 'combined')),
  momentum_score   float not null default 0,   -- 0-100
  -- Boost applied when topic appears in both YT velocity AND Twitter
  opportunity_score float not null default 0,  -- 0-100 (momentum + cross-match bonus)
  tweet_count      int default 0,
  twitter_query    text,                        -- search query used
  related_video_ids uuid[] default '{}',        -- trending_videos.id references
  niche_id         uuid not null references niches(id) on delete cascade,
  detected_at      timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '48 hours')
);

create index if not exists idx_trends_niche_id on trends(niche_id);
create index if not exists idx_trends_opportunity on trends(opportunity_score desc);
create index if not exists idx_trends_detected_at on trends(detected_at desc);

-- ============================================================
-- VIDEO BRIEFS
-- AI-generated content plans tied to a trend/topic
-- ============================================================
create table if not exists video_briefs (
  id                  uuid primary key default gen_random_uuid(),
  topic               text not null,
  -- AI-generated content
  title_suggestions   text[] not null default '{}',
  hook                text not null,           -- opening line / pattern interrupt
  outline             jsonb not null default '[]',
  -- e.g. [{"point": 1, "heading": "...", "notes": "..."}, ...]
  thumbnail_concept   text not null,
  tags                text[] default '{}',
  -- Metadata
  niche_id            uuid not null references niches(id) on delete cascade,
  trend_id            uuid references trends(id) on delete set null,
  source_video_ids    uuid[] default '{}',     -- trending_videos that inspired this
  created_at          timestamptz not null default now()
);

create index if not exists idx_video_briefs_niche_id on video_briefs(niche_id);
create index if not exists idx_video_briefs_created_at on video_briefs(created_at desc);

-- ============================================================
-- REFRESH LOG
-- Tracks when data was last fetched per niche
-- ============================================================
create table if not exists refresh_log (
  id         uuid primary key default gen_random_uuid(),
  niche_id   uuid not null references niches(id) on delete cascade,
  source     text not null check (source in ('youtube', 'twitter', 'combined')),
  status     text not null check (status in ('running', 'success', 'error')),
  message    text,
  videos_found int default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_niches_updated_at
  before update on niches
  for each row execute function update_updated_at_column();

-- ============================================================
-- RLS POLICIES (enable for production)
-- ============================================================
-- Row Level Security is disabled here for MVP.
-- Enable and add auth policies before going to production.
-- alter table niches enable row level security;
-- alter table trending_videos enable row level security;
-- alter table trends enable row level security;
-- alter table video_briefs enable row level security;

-- ============================================================
-- SEED DATA — default niches
-- ============================================================
insert into niches (name, description, keywords, color) values
  ('AI & Machine Learning',   'Tutorials, tools, and news in AI/ML space',       array['ai','machine learning','chatgpt','llm','stable diffusion','copilot'], '#6366f1'),
  ('Personal Finance',        'Investing, budgeting, FIRE, wealth building',      array['investing','stocks','etf','budget','fire','passive income','crypto'], '#10b981'),
  ('Web Development',         'Frontend, backend, and full-stack tutorials',      array['react','nextjs','typescript','css','api','devops','web dev'],         '#f59e0b'),
  ('Productivity & Tools',    'Workflows, apps, and systems for getting things done', array['notion','obsidian','productivity','automation','zapier','pkm'],   '#8b5cf6'),
  ('Health & Fitness',        'Workouts, nutrition, biohacking, mental health',   array['workout','diet','nutrition','fitness','running','meditation'],        '#ef4444'),
  ('Gaming',                  'Game reviews, Let''s Plays, esports, indie games', array['gaming','review','playthrough','esports','indie','steam','fps'],     '#14b8a6')
on conflict (name) do nothing;
