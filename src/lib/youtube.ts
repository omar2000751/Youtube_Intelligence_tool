/**
 * YouTube Data API v3 integration
 * Fetches trending/high-performing videos for a given niche using keyword search.
 */

import { YouTubeVideoItem, YouTubeChannelStats } from '@/types';

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  return key;
}

interface SearchOptions {
  keywords: string[];
  maxResults?: number;
  publishedAfterDays?: number; // only fetch videos newer than N days
  order?: 'relevance' | 'viewCount' | 'date' | 'rating';
}

/**
 * Search for videos matching niche keywords.
 * Returns raw YouTube video IDs to be enriched with statistics.
 */
export async function searchVideos(opts: SearchOptions): Promise<string[]> {
  const {
    keywords,
    maxResults = 50,
    publishedAfterDays = 30,
    order = 'viewCount',
  } = opts;

  const publishedAfter = new Date(
    Date.now() - publishedAfterDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // Build a combined keyword query — take first 3 keywords to stay under char limit
  const query = keywords.slice(0, 3).join(' OR ');

  const params = new URLSearchParams({
    part: 'id',
    type: 'video',
    q: query,
    maxResults: String(Math.min(maxResults, 50)),
    publishedAfter,
    order,
    relevanceLanguage: 'en',
    key: apiKey(),
  });

  const res = await fetch(`${YT_BASE}/search?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`YouTube search failed: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return (data.items ?? []).map((item: { id: { videoId: string } }) => item.id.videoId);
}

/**
 * Fetch full video details (snippet + statistics) for given IDs.
 * YouTube allows up to 50 IDs per request.
 */
export async function getVideoDetails(videoIds: string[]): Promise<YouTubeVideoItem[]> {
  if (videoIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const results: YouTubeVideoItem[] = [];

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: chunk.join(','),
      key: apiKey(),
    });

    const res = await fetch(`${YT_BASE}/videos?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`YouTube videos fetch failed: ${err?.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    results.push(...(data.items ?? []));
  }

  return results;
}

/**
 * Fetch subscriber count for a list of channel IDs.
 * Returns a map of channelId -> subscriberCount.
 */
export async function getChannelStats(
  channelIds: string[]
): Promise<Record<string, number>> {
  if (channelIds.length === 0) return {};

  const unique = [...new Set(channelIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 50) {
    chunks.push(unique.slice(i, i + 50));
  }

  const result: Record<string, number> = {};

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: 'statistics',
      id: chunk.join(','),
      key: apiKey(),
    });

    const res = await fetch(`${YT_BASE}/channels?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`YouTube channels fetch failed: ${err?.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    for (const item of data.items ?? []) {
      const stats = item.statistics as YouTubeChannelStats;
      result[item.id] = parseInt(stats.subscriberCount ?? '0', 10);
    }
  }

  return result;
}

/**
 * Fetch top-level comments for a video and extract "can you make a video on X" patterns.
 */
export async function extractCommentRequests(
  videoId: string,
  maxComments = 100
): Promise<string[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    maxResults: String(Math.min(maxComments, 100)),
    order: 'relevance',
    key: apiKey(),
  });

  try {
    const res = await fetch(`${YT_BASE}/commentThreads?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    const comments: string[] = (data.items ?? []).map(
      (item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }) =>
        item.snippet.topLevelComment.snippet.textDisplay
    );

    // Pattern match for video requests
    const requestPatterns = [
      /can you (do|make|create|post) a video (on|about|covering) (.+?)[\.\?!]/i,
      /please (do|make|create|post) a video (on|about|covering) (.+?)[\.\?!]/i,
      /would love (a video|to see) (on|about|covering) (.+?)[\.\?!]/i,
      /next video (on|about|should be) (.+?)[\.\?!]/i,
    ];

    const requests: string[] = [];
    for (const comment of comments) {
      for (const pattern of requestPatterns) {
        const match = comment.match(pattern);
        if (match) {
          const topic = match[match.length - 1]?.trim();
          if (topic && topic.length > 3 && topic.length < 100) {
            requests.push(topic);
          }
          break;
        }
      }
    }

    return [...new Set(requests)].slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Full pipeline: search + enrich + channel stats for a niche.
 */
export async function fetchNicheVideos(opts: {
  keywords: string[];
  maxResults?: number;
  publishedAfterDays?: number;
}) {
  const videoIds = await searchVideos({
    ...opts,
    order: 'viewCount',
  });

  const [videos] = await Promise.all([getVideoDetails(videoIds)]);

  const channelIds = videos.map((v) => v.snippet.channelId);
  const channelStats = await getChannelStats(channelIds);

  return { videos, channelStats };
}
