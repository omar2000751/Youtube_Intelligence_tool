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
 * Title substrings that indicate off-topic or non-educational content.
 * Matched case-insensitively; a single hit disqualifies the video.
 *
 * IMPORTANT — use SPECIFIC PHRASES, not single words:
 *   ❌ 'film'    → also blocks "I Made a Short Film with AI Tools"
 *   ❌ 'movie'   → also blocks "I Generated a Movie Trailer with AI in 10 Minutes"
 *   ❌ 'trailer' → also blocks "AI Trailer Generator: Full Review"
 *   ❌ 'episode' → also blocks "My Podcast Workflow (Episode-by-Episode Breakdown)"
 *   ❌ 'season'  → also blocks "I Replaced My Content Season with AI Tools"
 *
 * Meme/short-form slop is caught by the Shorts duration check (< 60 s)
 * and the hashtag-density check (≥ 2 hashtags), not keyword matching.
 */
const NEGATIVE_TITLE_KEYWORDS = [
  // Pure entertainment — specific multi-word phrases only
  'official music video', 'official video', 'official audio', 'lyrics video',
  'music video',
  'full movie',    // "Batman Full Movie" = streaming, not AI tool tutorial
  'full episode',  // "Full Episode" = TV streaming, not AI tutorial
  // Gaming verbs — specific enough to not catch AI game-dev content
  'gameplay', "let's play", 'walkthrough',
  // Non-English language markers commonly found in English-title videos
  'hindi', 'urdu', 'tamil', 'telugu', 'marathi', 'kannada',
  'bengali', 'punjabi', 'gujarati', 'malayalam',
];

/**
 * Parse an ISO 8601 duration string (e.g. "PT1M30S", "PT45S") to seconds.
 */
function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0', 10) * 3600)
       + (parseInt(m[2] ?? '0', 10) * 60)
       + parseInt(m[3] ?? '0', 10);
}

/**
 * Matches non-Latin Unicode blocks used in non-English scripts.
 * A hit means the title (or description) contains Devanagari, Arabic/Urdu,
 * CJK (Chinese/Japanese), Korean, Cyrillic, Thai, or Hiragana/Katakana.
 * This is the reliable fallback when YouTube omits defaultAudioLanguage
 * (which happens frequently for non-English channels).
 */
const NON_LATIN_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u3040-\u30FF]/;

/**
 * Returns true if the video passes all quality gates:
 *  1. Language tag — if defaultAudioLanguage/defaultLanguage is set it must start with "en".
 *  2. Unicode script — reject titles containing non-Latin scripts.
 *  3. YouTube Shorts — reject videos shorter than 60 seconds (not educational content).
 *  4. Hashtag spam — reject titles with ≥ 2 hashtags (meme/slop pattern).
 *  5. Minimum views — removes brand-new or zero-traction content.
 *  6. Negative title keywords — removes music videos, movies, explicit language markers.
 */
function passesQualityFilters(video: YouTubeVideoItem): boolean {
  const title = video.snippet.title;
  const titleLower = title.toLowerCase();

  // 1. Language tag: if set, must be English
  const lang =
    video.snippet.defaultAudioLanguage ?? video.snippet.defaultLanguage ?? '';
  if (lang && !lang.startsWith('en')) return false;

  // 2. Unicode script detection — reliable even when language tag is absent
  if (NON_LATIN_SCRIPT_RE.test(title)) return false;

  // 3. YouTube Shorts filter — anything under 60 s is a Short, not creator-useful content
  const durationSecs = parseIsoDuration(video.contentDetails?.duration ?? '');
  if (durationSecs > 0 && durationSecs < 60) return false;

  // 4. Hashtag spam — meme/slop content stuffs multiple hashtags into titles
  //    e.g. "#memes #ai #grox #chatgpt" — one hashtag (a topic tag) is fine
  const hashtagCount = (title.match(/#\w+/g) ?? []).length;
  if (hashtagCount >= 2) return false;

  // 5. View count floor
  const views = parseInt(video.statistics.viewCount ?? '0', 10);
  if (views < MIN_VIEW_COUNT) return false;

  // 6. Negative keyword check (title)
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
 * Search strategy — each keyword gets its own search, run twice in parallel:
 *   • order=viewCount  → surfaces highest-raw-view videos (viral/broad content)
 *   • order=relevance  → surfaces niche-specialist creators
 *
 * WHY individual queries (not OR-grouped chunks):
 *   Searching "ChatGPT OR AI tools OR Claude AI" dilutes relevance signals —
 *   YouTube tries to match all three terms, so a focused video like
 *   "The Only AI Tools You Need" gets buried behind ChatGPT/Claude AI results.
 *   Searching "AI tools" alone gives YouTube a single focused signal, pushing
 *   niche-specific quality content into the top 50.
 *
 * A niche with 5 keywords → 5 × 2 orders × 50 results = 500 raw candidates
 * before dedup. After dedup (~60% unique) = ~300. Quality filters then cut
 * to the best 30-60 English long-form videos.
 */
export async function fetchNicheVideos(opts: {
  keywords: string[];
  maxResults?: number;
  publishedAfterDays?: number;
}) {
  const { keywords, maxResults = 300, publishedAfterDays = 180 } = opts;

  // ── One focused search per keyword, two orderings each ─────────────────────
  // Individual queries give YouTube a clean relevance signal per topic,
  // surfacing niche creators that OR-grouped queries bury.
  const searchJobs = [
    ...keywords.map((kw) =>
      searchVideos({ keywords: [kw], maxResults: 50, publishedAfterDays, order: 'viewCount' })
    ),
    ...keywords.map((kw) =>
      searchVideos({ keywords: [kw], maxResults: 50, publishedAfterDays, order: 'relevance' })
    ),
  ];
  const searchResults = await Promise.allSettled(searchJobs);

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

  // ── Quality filters — with per-rule breakdown for debugging ───────────────
  let rejLang = 0, rejScript = 0, rejShorts = 0, rejHashtag = 0,
      rejViews = 0, rejKeyword = 0;

  const filtered = allVideos.filter((v) => {
    const title = v.snippet.title;
    const lang = v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage ?? '';
    if (lang && !lang.startsWith('en'))                                  { rejLang++;    return false; }
    if (NON_LATIN_SCRIPT_RE.test(title))                                 { rejScript++;  return false; }
    const secs = parseIsoDuration(v.contentDetails?.duration ?? '');
    if (secs > 0 && secs < 60)                                           { rejShorts++;  return false; }
    if ((title.match(/#\w+/g) ?? []).length >= 2)                        { rejHashtag++; return false; }
    if (parseInt(v.statistics.viewCount ?? '0', 10) < MIN_VIEW_COUNT)    { rejViews++;   return false; }
    if (NEGATIVE_TITLE_KEYWORDS.some(kw => title.toLowerCase().includes(kw))) { rejKeyword++; return false; }
    return true;
  });

  const filterStats = {
    raw_search_ids: allIds.length,
    raw_videos_fetched: allVideos.length,
    passed: filtered.length,
    rejected: {
      lang_tag: rejLang,
      non_latin_script: rejScript,
      shorts: rejShorts,
      hashtag_spam: rejHashtag,
      low_views: rejViews,
      negative_keyword: rejKeyword,
    },
  };
  console.log('[YouTube filterStats]', JSON.stringify(filterStats));

  // ── Channel stats — only for videos that passed filters (saves quota) ──────
  const channelIds = filtered.map((v) => v.snippet.channelId);
  const channelStats = await getChannelStats(channelIds);

  return { videos: filtered, channelStats, filterStats };
}
