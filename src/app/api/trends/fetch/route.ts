/**
 * POST /api/trends/fetch
 * Triggers a full data refresh for a niche:
 * 1. Fetches YouTube high-velocity videos
 * 2. Scores velocity
 * 3. Identifies trends via AI and stores them
 */

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MOCK_TRENDING_VIDEOS, MOCK_TRENDS } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { fetchNicheVideos, extractCommentRequests } from '@/lib/youtube';
import { scoreVideos } from '@/lib/velocity';
import { computeOpportunityScore } from '@/lib/velocity';
import { extractCoreTopic, identifyTrendTopics } from '@/lib/anthropic';
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

  // Mock mode: return pre-baked data immediately
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

  // Log the refresh start
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
      maxResults: 50,
      publishedAfterDays: 30,
    });

    // 3. Build raw video records (without velocity score yet)
    const rawVideos = videos.map((v) => ({
      youtube_id: v.id,
      title: v.snippet.title,
      description: v.snippet.description?.slice(0, 1000) ?? null,
      thumbnail_url:
        v.snippet.thumbnails?.high?.url ??
        v.snippet.thumbnails?.medium?.url ??
        null,
      channel_id: v.snippet.channelId,
      channel_name: v.snippet.channelTitle,
      channel_subscribers: channelStats[v.snippet.channelId] ?? 1000,
      view_count: parseInt(v.statistics.viewCount ?? '0', 10),
      like_count: parseInt(v.statistics.likeCount ?? '0', 10),
      comment_count: parseInt(v.statistics.commentCount ?? '0', 10),
      published_at: v.snippet.publishedAt,
      niche_id,
      velocity_score: 0, // computed below
      core_topic: null,
      transcript_summary: null,
      comment_requests: [],
    }));

    // 4. Compute velocity scores — add stub fields required by the type
    const rawVideosForScoring = rawVideos.map((v) => ({
      ...v,
      days_since_published: Math.max(
        (Date.now() - new Date(v.published_at).getTime()) / 86_400_000,
        0.5
      ),
      captured_at: new Date().toISOString(),
    }));
    const scored = scoreVideos(rawVideosForScoring);

    // 5. Extract core topics for top 10 videos via AI
    const top10 = scored
      .sort((a, b) => b.velocity_score - a.velocity_score)
      .slice(0, 10);

    const topicsPromises = top10.map(async (v) => {
      try {
        const topic = await extractCoreTopic({
          title: v.title,
          description: v.description ?? '',
        });
        return { youtube_id: v.youtube_id, core_topic: topic };
      } catch {
        return { youtube_id: v.youtube_id, core_topic: null };
      }
    });
    const topicsResults = await Promise.all(topicsPromises);
    const topicMap = Object.fromEntries(
      topicsResults.map((r) => [r.youtube_id, r.core_topic])
    );

    // 6. Fetch comment requests for top 5
    const commentPromises = top10.slice(0, 5).map(async (v) => {
      const requests = await extractCommentRequests(v.youtube_id);
      return { youtube_id: v.youtube_id, comment_requests: requests };
    });
    const commentResults = await Promise.all(commentPromises);
    const commentMap = Object.fromEntries(
      commentResults.map((r) => [r.youtube_id, r.comment_requests])
    );

    // 7. Merge all data and upsert to DB
    const finalVideos = scored.map((v) => ({
      ...v,
      core_topic: topicMap[v.youtube_id] ?? null,
      comment_requests: commentMap[v.youtube_id] ?? [],
    }));

    const { error: upsertError } = await supabase
      .from('trending_videos')
      .upsert(finalVideos, { onConflict: 'youtube_id' });

    if (upsertError) throw new Error(upsertError.message);

    // 8. AI trend identification
    const trendTopics = await identifyTrendTopics({
      videos: finalVideos.map((v) => ({
        title: v.title,
        coreTopicHint: v.core_topic,
      })),
      nicheName: nicheData.name,
    });

    interface StoredVideo { id: string; youtube_id: string; core_topic: string | null; velocity_score: number; }

    // 10. Get IDs of stored videos for linking
    const { data: storedVideos } = await supabase
      .from('trending_videos')
      .select('id, youtube_id, core_topic, velocity_score')
      .eq('niche_id', niche_id)
      .order('velocity_score', { ascending: false })
      .limit(50);

    const stored: StoredVideo[] = (storedVideos ?? []) as StoredVideo[];

    // 11. Build and upsert trends
    const trendsToInsert = trendTopics.map((tt) => {
      const relatedVideoIds = stored
        .filter(
          (v: StoredVideo) =>
            v.core_topic?.toLowerCase().includes(tt.topic.toLowerCase().split(' ')[0]) ||
            tt.topic.toLowerCase().includes((v.core_topic ?? '').toLowerCase().split(' ')[0])
        )
        .slice(0, 5)
        .map((v: StoredVideo) => v.id);

      const avgYoutubeVelocity =
        relatedVideoIds.length > 0
          ? stored
              .filter((v: StoredVideo) => relatedVideoIds.includes(v.id))
              .reduce((s, v) => s + v.velocity_score, 0) / relatedVideoIds.length
          : 50;

      const opportunityScore = computeOpportunityScore({
        youtubeMomentum: avgYoutubeVelocity,
      });

      return {
        topic: tt.topic,
        source: 'youtube',
        momentum_score: Math.round(avgYoutubeVelocity),
        opportunity_score: opportunityScore,
        related_video_ids: relatedVideoIds,
        niche_id,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };
    });

    if (trendsToInsert.length > 0) {
      await supabase.from('trends').insert(trendsToInsert);
    }

    // 12. Update refresh log
    if (logId) {
      await supabase
        .from('refresh_log')
        .update({
          status: 'success',
          videos_found: finalVideos.length,
          finished_at: new Date().toISOString(),
          message: `Found ${finalVideos.length} videos, ${trendsToInsert.length} trends`,
        })
        .eq('id', logId);
    }

    return NextResponse.json({
      data: {
        videos_found: finalVideos.length,
        trends_identified: trendsToInsert.length,
        message: `Refresh complete: ${finalVideos.length} videos, ${trendsToInsert.length} trends`,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
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
