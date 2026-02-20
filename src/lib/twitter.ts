/**
 * Twitter/X API v2 integration
 * Searches recent tweets for niche keywords to measure social momentum.
 */

const TWITTER_BASE = 'https://api.twitter.com/2';

function bearerToken(): string {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) throw new Error('TWITTER_BEARER_TOKEN is not set');
  return token;
}

interface TwitterSearchResult {
  topic: string;
  query: string;
  tweetCount: number;
  momentumScore: number; // 0-100, relative engagement signal
  sampleTweets: string[];
}

interface TwitterMeta {
  newest_id: string;
  oldest_id: string;
  result_count: number;
  next_token?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

/**
 * Search recent tweets (last 7 days) for a topic/keyword.
 */
export async function searchTweets(params: {
  query: string;
  maxResults?: number;
}): Promise<{
  tweets: TwitterTweet[];
  meta: TwitterMeta | null;
}> {
  const { query, maxResults = 100 } = params;

  // Twitter API requires at least 10 results per request, max 100
  const count = Math.min(Math.max(maxResults, 10), 100);

  const searchParams = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(count),
    'tweet.fields': 'public_metrics,created_at',
    expansions: 'author_id',
  });

  const res = await fetch(
    `${TWITTER_BASE}/tweets/search/recent?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Twitter search failed (${res.status}): ${err?.detail ?? res.statusText}`
    );
  }

  const data = await res.json();
  return {
    tweets: data.data ?? [],
    meta: data.meta ?? null,
  };
}

/**
 * Get tweet count for a query in the last 7 days using the counts endpoint.
 * More quota-efficient than fetching full tweets.
 */
export async function getTweetCount(query: string): Promise<number> {
  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    granularity: 'day',
  });

  const res = await fetch(
    `${TWITTER_BASE}/tweets/counts/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${bearerToken()}` },
    }
  );

  if (!res.ok) return 0;

  const data = await res.json();
  const total: number = (data.data ?? []).reduce(
    (sum: number, day: { tweet_count: number }) => sum + day.tweet_count,
    0
  );
  return total;
}

/**
 * Compute momentum score for a set of tweets.
 * Score = log-scaled engagement (likes + RTs + replies) per tweet.
 */
function computeMomentumScore(tweets: TwitterTweet[]): number {
  if (tweets.length === 0) return 0;

  const totalEngagement = tweets.reduce((sum, t) => {
    const m = t.public_metrics;
    if (!m) return sum;
    return sum + m.like_count + m.retweet_count * 2 + m.reply_count + m.quote_count * 1.5;
  }, 0);

  const avgEngagement = totalEngagement / tweets.length;
  // Log scale: 1 engagement = ~1, 100 = ~23, 1000 = ~35, 10000 = ~46
  const logScore = Math.log10(Math.max(avgEngagement, 1)) * 20;
  return Math.min(100, Math.round(logScore));
}

/**
 * Analyze Twitter momentum for multiple niche keywords.
 * Returns scored results per keyword/topic.
 */
export async function analyzeNicheMomentum(
  keywords: string[]
): Promise<TwitterSearchResult[]> {
  const results: TwitterSearchResult[] = [];

  // Process keywords in series to respect rate limits
  for (const keyword of keywords.slice(0, 5)) {
    try {
      const { tweets } = await searchTweets({ query: keyword, maxResults: 50 });

      const momentumScore = computeMomentumScore(tweets);
      const sampleTweets = tweets
        .sort((a, b) => {
          const engA =
            (a.public_metrics?.like_count ?? 0) +
            (a.public_metrics?.retweet_count ?? 0) * 2;
          const engB =
            (b.public_metrics?.like_count ?? 0) +
            (b.public_metrics?.retweet_count ?? 0) * 2;
          return engB - engA;
        })
        .slice(0, 3)
        .map((t) => t.text);

      results.push({
        topic: keyword,
        query: keyword,
        tweetCount: tweets.length,
        momentumScore,
        sampleTweets,
      });

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`Twitter search failed for "${keyword}":`, err);
      results.push({
        topic: keyword,
        query: keyword,
        tweetCount: 0,
        momentumScore: 0,
        sampleTweets: [],
      });
    }
  }

  return results;
}
