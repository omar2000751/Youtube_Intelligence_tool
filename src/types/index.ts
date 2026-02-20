// ============================================================
// Shared TypeScript types for YouTube Intelligence Tool
// ============================================================

export interface Niche {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TrendingVideo {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  channel_id: string;
  channel_name: string;
  channel_subscribers: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  days_since_published: number;
  velocity_score: number;
  core_topic: string | null;
  transcript_summary: string | null;
  comment_requests: string[];
  niche_id: string;
  captured_at: string;
}

export interface Trend {
  id: string;
  topic: string;
  source: 'youtube' | 'twitter' | 'combined';
  momentum_score: number;
  opportunity_score: number;
  tweet_count: number;
  twitter_query: string | null;
  related_video_ids: string[];
  niche_id: string;
  detected_at: string;
  expires_at: string;
  // Joined fields
  related_videos?: TrendingVideo[];
}

export interface OutlinePoint {
  point: number;
  heading: string;
  notes: string;
}

export interface VideoBrief {
  id: string;
  topic: string;
  title_suggestions: string[];
  hook: string;
  outline: OutlinePoint[];
  thumbnail_concept: string;
  tags: string[];
  niche_id: string;
  trend_id: string | null;
  source_video_ids: string[];
  created_at: string;
}

export interface RefreshLog {
  id: string;
  niche_id: string;
  source: 'youtube' | 'twitter' | 'combined';
  status: 'running' | 'success' | 'error';
  message: string | null;
  videos_found: number;
  started_at: string;
  finished_at: string | null;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// YouTube API raw types
export interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string;
  };
}

export interface YouTubeChannelStats {
  subscriberCount: string;
}

// Velocity computation input
export interface VelocityInput {
  views: number;
  subscribers: number;
  daysSincePublished: number;
}
