/**
 * POST /api/trends/fetch
 * Triggers a full data refresh for a niche:
 * 1. Fetches YouTube high-velocity videos
 * 2. Scores velocity
 * 3. Extracts per-video metadata via AI (core topic, comment requests)
 * 4. Classifies videos into content pillars (Tutorials / Reactions / Experiments / Other)
 *    using keyword matching — no AI needed for categorisation
 * 5. Replaces all existing trend records for this niche with fresh pillar records
 */

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MOCK_TRENDING_VIDEOS, MOCK_TRENDS } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { fetchNicheVideos, extractCommentRequests } from '@/lib/youtube';
import { scoreVideos, computeOpportunityScore } from '@/lib/velocity';
import { extractCoreTopic } from '@/lib/anthropic';
import { classifyVideoToPillar, ALL_PILLARS } from '@/lib/pillars';
import { Niche } from '@/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { niche_id } = body;

  if (!niche_id) {
    return NextResponse.json(
      { data: null, error: 'niche_id is required' },
      { status: 400 }
    );
  }

  // Mock mode
  if (isMockMode()) {
    return NextResponse.json({
      data: {
        videos_found: MOCK_TRENDING_VIDEOS.filter((v) => v.niche_id === niche_id).length,
        trends_identified: MOCK_TRENDS.filter((t) => t.niche_id === niche_id).length,
        message: 'Mock refresh complete',
      },
      error: null,
    });
  }

  const supabase = createAdminSupabaseClient();

  const { data: logEntry } = await supabase
    .from('refresh_log')
    .insert({ niche_id, source: 'youtube', status: 'running' })
    .select()
    .single();
  const logId = logEntry?.id;

  try {
    // 1. Fetch niche config
    const { data: niche, error: nicheError } = await supabase
      .from('niches')
      .select('*')
      .eq('id', niche_id)
      .single();
    if (nicheError || !niche) throw new Error('Niche not found');
    const nicheData = niche as Niche;

    // 2. Fetch YouTube videos
    const { videos, channelStats } = await fetchNicheVideos({
      keywords: nicheData.keywords,
      maxResults: 150,    // pre-filter candidate pool; quality filters reduce this further
      publishedAfterDays: 30,
    });

    // 3. Build raw records
    const rawVideos = videos.map((v) => ({
      youtube_id: v.id,
      title: v.snippet.title,
      description: v.snippet.description?.slice(0, 1000) ?? null,
      thumbnail_url:
        v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url ?? null,
      channel_id: v.snippet.channelId,
      channel_name: v.snippet.channelTitle,
      channel_subscribers: channelStats[v.snippet.channelId] ?? 1000,
      view_count: parseInt(v.statistics.viewCount ?? '0', 10),
      like_count: parseInt(v.statistics.likeCount ?? '0', 10),
      comment_count: parseInt(v.statistics.commentCount ?? '0', 10),
      published_at: v.snippet.publishedAt,
      niche_id,
      velocity_score: 0,
      core_topic: null,
      transcript_summary: null,
      comment_requests: [],
    }));

    // 4. Velocity scoring
    const rawVideosForScoring = rawVideos.map((v) => ({
      ...v,
      days_since_published: Math.max(
        (Date.now() - new Date(v.published_at).getTime()) / 86_400_000,
        0.5
      ),
      captured_at: new Date().toISOString(),
    }));
    const scored = scoreVideos(rawVideosForScoring);

    // 5. Extract core topics for top 10 via AI
    const top10 = [...scored].sort((a, b) => b.velocity_score - a.velocity_score).slice(0, 10);
    const topicsResults = await Promise.all(
      top10.map(async (v) => {
        try {
          const topic = await extractCoreTopic({ title: v.title, description: v.description ?? '' });
          return { youtube_id: v.youtube_id, core_topic: topic };
        } catch {
          return { youtube_id: v.youtube_id, core_topic: null };
        }
      })
    );
    const topicMap = Object.fromEntries(topicsResults.map((r) => [r.youtube_id, r.core_topic]));

    // 6. Comment requests for top 5
    const commentResults = await Promise.all(
      top10.slice(0, 5).map(async (v) => {
        const requests = await extractCommentRequests(v.youtube_id);
        return { youtube_id: v.youtube_id, comment_requests: requests };
      })
    );
    const commentMap = Object.fromEntries(
      commentResults.map((r) => [r.youtube_id, r.comment_requests])
    );

    // 7. Merge and upsert videos to DB
    const finalVideos = scored.map((v) => ({
      ...v,
      core_topic: topicMap[v.youtube_id] ?? null,
      comment_requests: commentMap[v.youtube_id] ?? [],
    }));
    const { error: upsertError } = await supabase
      .from('trending_videos')
      .upsert(finalVideos, { onConflict: 'youtube_id' });
    if (upsertError) throw new Error(upsertError.message);

    // 8. Re-fetch stored videos with titles for pillar classification
    interface StoredVideo {
      id: string;
      youtube_id: string;
      title: string;
      core_topic: string | null;
      velocity_score: number;
    }
    const { data: storedVideos } = await supabase
      .from('trending_videos')
      .select('id, youtube_id, title, core_topic, velocity_score')
      .eq('niche_id', niche_id)
      .order('velocity_score', { ascending: false })
      .limit(50);
    const stored: StoredVideo[] = (storedVideos ?? []) as StoredVideo[];

    // 9. Classify each video into a content pillar by title keywords
    const pillarBuckets = new Map<string, StoredVideo[]>(ALL_PILLARS.map((p) => [p, []]));
    for (const v of stored) {
      const pillar = classifyVideoToPillar(v.title ?? '');
      pillarBuckets.get(pillar)!.push(v);
    }

    // 10. Build pillar trend records — delete stale trends first so we don't accumulate rows
    await supabase.from('trends').delete().eq('niche_id', niche_id);

    const trendsToInsert = ALL_PILLARS
      .filter((p) => (pillarBuckets.get(p)?.length ?? 0) > 0)
      .map((pillar) => {
        // Top 8 videos per pillar, sorted by velocity
        const pillarVideos = (pillarBuckets.get(pillar) ?? [])
          .sort((a, b) => b.velocity_score - a.velocity_score)
          .slice(0, 8);
        const relatedVideoIds = pillarVideos.map((v) => v.id);
        const avgVelocity =
          pillarVideos.reduce((s, v) => s + v.velocity_score, 0) / pillarVideos.length;
        return {
          topic: pillar,
          source: 'youtube',
          momentum_score: Math.round(avgVelocity),
          opportunity_score: computeOpportunityScore({ youtubeMomentum: avgVelocity }),
          related_video_ids: relatedVideoIds,
          niche_id,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        };
      });

    if (trendsToInsert.length > 0) {
      await supabase.from('trends').insert(trendsToInsert);
    }

    // 11. Log success
    if (logId) {
      await supabase
        .from('refresh_log')
        .update({
          status: 'success',
          videos_found: finalVideos.length,
          finished_at: new Date().toISOString(),
          message: `Found ${finalVideos.length} videos across ${trendsToInsert.length} pillars`,
        })
        .eq('id', logId);
    }

    return NextResponse.json({
      data: {
        videos_found: finalVideos.length,
        trends_identified: trendsToInsert.length,
        message: `Refresh complete: ${finalVideos.length} videos classified into ${trendsToInsert.length} content pillars`,
      },
      error: null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err);
    console.error('Trend fetch error:', message);
    if (logId) {
      await supabase
        .from('refresh_log')
        .update({ status: 'error', message, finished_at: new Date().toISOString() })
        .eq('id', logId);
    }
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
