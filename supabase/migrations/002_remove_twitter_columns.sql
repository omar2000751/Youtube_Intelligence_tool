-- ============================================================
-- Remove unused Twitter/X columns from trends and refresh_log
-- ============================================================

-- Drop twitter columns from trends
alter table trends drop column if exists tweet_count;
alter table trends drop column if exists twitter_query;

-- Tighten source check constraints to youtube-only
alter table trends
  drop constraint if exists trends_source_check;
alter table trends
  add constraint trends_source_check check (source in ('youtube'));

alter table refresh_log
  drop constraint if exists refresh_log_source_check;
alter table refresh_log
  add constraint refresh_log_source_check check (source in ('youtube'));
