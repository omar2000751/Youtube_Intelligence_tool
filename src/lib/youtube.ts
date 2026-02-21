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

// ─────────────────────────────────────────────────────────────────────────────
// Quality filter constants
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum view count — weeds out brand-new or zero-traction content */
const MIN_VIEW_COUNT = 5_000;

/**
 * Title substrings that indicate non-English or off-topic content.
 * Matched case-insensitively; a single hit disqualifies the video.
 */
const NEGATIVE_TITLE_KEYWORDS = [
  // Music / entertainment
  'song', 'music', 'album', 'lyrics', ' mv',
  // Film / TV
  'movie', 'film', 'trailer', 'episode', 'season',
  // Gaming (generic — AI gameplay is kept because it doesn't contain just "gameplay")
  'gameplay', "let's play", 'walkthrough',
  // Non-English language markers commonly found in titles
  'hindi', 'urdu', 'tamil', 'telugu', 'marathi', 'kannada',
  'bengali', 'punjabi', 'gujarati', 'malayalam',
];

/**
 * Returns true if the video passes all quality gates:
 *  1. Language — if defaultAudioLanguage is explicitly set it must start with "en".
 *     Many English videos omit this field entirely, so blank is accepted.
 *  2. Minimum views — removes very-new or low-effort content.
 *  3. No negative title keywords — removes music, movies, non-English content.
 */
function passesQualityFilters(video: YouTubeVideoItem): boolean {
  // 1. Language: only reject if the tag is set and is NOT English
  const lang =
    video.snippet.defaultAudioLanguage ?? video.snippet.defaultLanguage ?? '';
  if (lang && !lang.startsWith('en')) return false;

  // 2. View count floor
  const views = parseInt(video.statistics.viewCount ?? '0', 10);
  if (views < MIN_VIEW_COUNT) return false;

  // 3. Negative keyword check (title)
  const titleLower = video.snippet.title.toLowerCase();
  if (NEGATIVE_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw))) return false;

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core API wrappers
// ─────────────────────────────────────────────────────────────────────────────

interface SearchOptions {
  keywords: string[];
  maxResults?: number;
  publishedAfterDays?: number;
  order?: 'relevance' | 'viewCount' | 'date' | 'rating';
}

/**
 * Search for videos matching niche keywords.
 * YouTube Search API caps each request at 50 results.
 * Returns raw video IDs.
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

  // Combine keywords with OR — take first 3 to stay under query-length limits
  const query = keywords.slice(0, 3).join(' OR ');

  const params = new URLSearchParams({
    part: 'id',
    type: 'video',
    q: query,
    maxResults: String(Math.min(maxResults, 50)), // YouTube API hard cap = 50
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
  return (data.items ?? []).map(
    (item: { id: { videoId: string } }) => item.id.videoId
  );
}

/**
 * Fetch full video details (snippet + statistics + contentDetails) for given IDs.
 * The snippet includes defaultAudioLanguage used by the language filter.
 * Automatically batches into groups of 50 (YouTube limit per request).
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
      throw new Error(
        `YouTube videos fetch failed: ${err?.error?.message ?? res.statusText}`
      );
    }

    const data = await res.json();
    results.push(...(data.items ?? []));
  }

  return results;
}

/**
 * Fetch subscriber counts for a list of channel IDs.
 * Returns a map of channelId → subscriberCount.
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
      throw new Error(
        `YouTube channels fetch failed: ${err?.error?.message ?? res.statusText}`
      );
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
      (
        item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }
      ) => item.snippet.topLevelComment.snippet.textDisplay
    );

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

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full pipeline: broad multi-search → deduplicate → enrich → quality filter.
 *
 * To get 100-200 quality candidates (up from the old 50-video hard cap):
 *  • Split the niche's keywords into chunks of 3 → one parallel search per chunk.
 *    A niche with 6 keywords produces 2 chunks × 50 = up to 100 raw candidates.
 *  • Always append a broad AI/LLM catch-all search for general coverage.
 *  • Deduplicate across all searches.
 *  • Fetch full video details (includes defaultAudioLanguage for language check).
 *  • Run passesQualityFilters:
 *      - English-only (reject if lang tag is set and non-English)
 *      - ≥ 5 000 views
 *      - No negative title keywords (music, movies, non-English language markers)
 *  • Fetch channel stats only for surviving videos (saves API quota).
 */
export async function fetchNicheVideos(opts: {
  keywords: string[];
  maxResults?: number;       // pre-filter candidate pool cap (default 150)
  publishedAfterDays?: number;
}) {
  const { keywords, maxResults = 150, publishedAfterDays = 30 } = opts;

  // ── Build query chunks: one search per group of 3 keywords ─────────────────
  const queryChunks: string[][] = [];
  for (let i = 0; i < keywords.length; i += 3) {
    queryChunks.push(keywords.slice(i, i + 3));
  }
  // Always add a broad AI/LLM catch-all so sparse-keyword niches get good coverage
  queryChunks.push([
    'AI automation workflow',
    'ChatGPT tutorial',
    'artificial intelligence tools',
  ]);

  // ── Parallel searches (50 results each — YouTube API hard cap per request) ──
  // allSettled ensures one failed search doesn't abort the whole batch
  const searchResults = await Promise.allSettled(
    queryChunks.map((chunk) =>
      searchVideos({
        keywords: chunk,
        maxResults: 50,
        publishedAfterDays,
        order: 'viewCount',
      })
    )
  );

  // ── Deduplicate IDs across all searches ────────────────────────────────────
  // Buffer at 2× target so quality filters have enough to work with
  const seen = new Set<string>();
  const allIds: string[] = [];
  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      for (const id of result.value) {
        if (!seen.has(id) && allIds.length < maxResults * 2) {
          seen.add(id);
          allIds.push(id);
        }
      }
    }
  }

  // ── Fetch full video details ───────────────────────────────────────────────
  const allVideos = await getVideoDetails(allIds);

  // ── Quality filters ────────────────────────────────────────────────────────
  // English-only · ≥5 k views · no negative title keywords
  const filtered = allVideos.filter(passesQualityFilters);

  // ── Channel stats — only for videos that passed filters (saves quota) ──────
  const channelIds = filtered.map((v) => v.snippet.channelId);
  const channelStats = await getChannelStats(channelIds);

  return { videos: filtered, channelStats };
}
