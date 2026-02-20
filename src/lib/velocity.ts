import { TrendingVideo, VelocityInput } from '@/types';

/**
 * Compute raw velocity score for a single video.
 * Formula: views / (channel_subscribers * days_since_published)
 * Clamps days to minimum 0.5 to avoid divide-by-zero on brand-new videos.
 */
export function computeRawVelocity(input: VelocityInput): number {
  const { views, subscribers, daysSincePublished } = input;
  const safeDays = Math.max(daysSincePublished, 0.5);
  const safeSubs = Math.max(subscribers, 1000); // floor at 1k to protect micro-channels
  return views / (safeSubs * safeDays);
}

/**
 * Normalize an array of raw velocity scores to 0–100 range using
 * min-max normalization with percentile capping to reduce outlier distortion.
 */
export function normalizeVelocityScores(rawScores: number[]): number[] {
  if (rawScores.length === 0) return [];
  if (rawScores.length === 1) return [50];

  // Sort and cap at 95th percentile to dampen extreme outliers
  const sorted = [...rawScores].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const capValue = sorted[p95Index] ?? sorted[sorted.length - 1];
  const cappedScores = rawScores.map((s) => Math.min(s, capValue));

  const min = Math.min(...cappedScores);
  const max = Math.max(...cappedScores);
  const range = max - min;

  if (range === 0) return cappedScores.map(() => 50);

  return cappedScores.map((s) => Math.round(((s - min) / range) * 100));
}

/**
 * Given a list of videos, compute and attach normalized velocity scores.
 */
export function scoreVideos(
  videos: Omit<TrendingVideo, 'velocity_score'>[]
): (Omit<TrendingVideo, 'velocity_score'> & { velocity_score: number })[] {
  const rawScores = videos.map((v) =>
    computeRawVelocity({
      views: v.view_count,
      subscribers: v.channel_subscribers,
      daysSincePublished: v.days_since_published ?? 1,
    })
  );

  const normalized = normalizeVelocityScores(rawScores);

  return videos.map((v, i) => ({
    ...v,
    velocity_score: normalized[i],
  }));
}

/**
 * Label a velocity score for display.
 */
export function velocityLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) return { label: 'Viral', color: 'text-red-500' };
  if (score >= 65) return { label: 'Hot', color: 'text-orange-500' };
  if (score >= 45) return { label: 'Rising', color: 'text-yellow-500' };
  if (score >= 25) return { label: 'Steady', color: 'text-green-500' };
  return { label: 'Low', color: 'text-slate-400' };
}

/**
 * Compute cross-match opportunity score.
 * Boosts when a topic appears in both YouTube velocity spikes AND Twitter momentum.
 */
export function computeOpportunityScore(params: {
  youtubeMomentum: number; // 0-100
  twitterMomentum: number; // 0-100, 0 if no twitter data
  crossMatchBonus: boolean; // true if same topic detected on both
}): number {
  const { youtubeMomentum, twitterMomentum, crossMatchBonus } = params;
  const base = youtubeMomentum * 0.6 + twitterMomentum * 0.4;
  const bonus = crossMatchBonus ? 15 : 0;
  return Math.min(100, Math.round(base + bonus));
}
